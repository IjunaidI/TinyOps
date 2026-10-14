import { projectById, requestById } from './catalog';
import {
  CITY_ASSET_POSITIONS as assetPositions,
  CITY_DISTRICT_POSITIONS as districtPositions,
  CITY_PROJECT_POSITIONS as projectPositions,
} from './cityLocations';
import type { CityState, DistrictId } from './types';

export interface CityAlert {
  id: string;
  kind: 'request' | 'petition' | 'asset' | 'service' | 'promise' | 'construction' | 'council' | 'budget';
  title: string;
  detail: string;
  severity: 'urgent' | 'warning' | 'info';
  districtId?: DistrictId;
  /** World coordinates [x, z]. */
  position?: [number, number];
  target: {
    kind: 'request' | 'petition' | 'life' | 'budget';
    id?: string;
    section?: 'services' | 'residents' | 'promises' | 'infrastructure' | 'projects' | 'council';
    districtId?: DistrictId;
  };
  /** Higher values appear first. Ties use source day, then stable ID. */
  priority: number;
  day: number;
}

export const MAX_CITY_ALERTS = 40;
const clipped = (text: string, length = 200) => {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > length ? `${compact.slice(0, length - 1)}…` : compact;
};
const dayLabel = (day: number) => Number(day.toFixed(1));
const byId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Read-only projection. Calling this never advances time, discovers hidden
 * condition, allocates crews, or marks an alert seen/resolved. */
export function getCityAlerts(state: CityState): CityAlert[] {
  if (state.phase === 'lobby') return [];
  const alerts: CityAlert[] = [];
  const time = state.day + state.dayProgress;
  const living = state.living;
  const add = (alert: Omit<CityAlert, 'position'> & { position?: readonly [number, number] }) => {
    const position = alert.position ?? (alert.districtId ? districtPositions[alert.districtId] : undefined);
    // Return independent tuples so callers cannot modify our coordinates.
    alerts.push({ ...alert, position: position ? [position[0], position[1]] : undefined });
  };

  for (const request of state.requests) {
    if (request.status !== 'open') continue;
    const template = requestById[request.templateId];
    if (!template) continue;
    const project = request.projectId ? projectById[request.projectId] : undefined;
    const districtId = project?.district ?? template.district;
    const dueSoon = request.dueDay - time <= 1;
    const urgent = template.priority === 'urgent' || dueSoon;
    add({
      id: `request:${request.id}`, kind: project ? 'construction' : 'request',
      title: template.title,
      detail: `${project ? `${project.name} · ` : ''}${template.sender} · Due day ${dayLabel(request.dueDay)}. ${clipped(template.text, 140)}`,
      severity: urgent ? 'urgent' : template.priority === 'important' ? 'warning' : 'info',
      districtId, position: project ? projectPositions[project.id] : undefined,
      target: { kind: 'request', id: request.id, districtId },
      priority: urgent ? 100 + Number(dueSoon) * 5 : template.priority === 'important' ? 65 : 35,
      day: request.arrivedDay,
    });
  }

  for (const petition of state.petitions) {
    if (petition.status !== 'pending') continue;
    const districtId = petition.district === 'city' ? undefined : petition.district;
    add({
      id: `petition:${petition.id}`, kind: 'petition', title: 'Citizen message needs a reply',
      detail: clipped(petition.text), severity: 'info', districtId,
      target: { kind: 'petition', id: petition.id, districtId }, priority: 40, day: petition.createdDay,
    });
  }

  for (const asset of living.assets) {
    const outage = asset.outageUntil > time;
    const repair = living.works.find(work => work.kind === 'repair' && work.targetId === asset.id);
    const forecast = living.weather.forecast.find(weather =>
      weather.day > time && weather.day <= time + 1 &&
      (asset.kind === 'power' ? weather.kind === 'heat' : weather.kind === 'storm'));
    const exposed = !repair && asset.maintenanceUntil <= time;
    const warning = exposed && (asset.risk === 'high' || asset.risk === 'watch' && !!forecast);
    if (!outage && !warning) continue;
    const inspection = asset.inspectionDue === null ? '' : ` Inspection report due day ${dayLabel(asset.inspectionDue)}.`;
    const evidence = asset.observedCondition === null
      ? 'Reported engineering warning; condition has not been inspected.'
      : `Last inspection: ${Math.round(asset.observedCondition)}% condition on day ${dayLabel(asset.lastInspectedDay!)}.`;
    add({
      id: `asset:${asset.id}`, kind: 'asset',
      title: `${asset.name}: ${outage ? 'outage' : 'attention needed'}`,
      detail: outage
        ? `Service is interrupted through day ${dayLabel(asset.outageUntil)}.${repair ? ` Repair ${Math.round(repair.progress * 100)}% complete.` : 'A repair can restore service sooner.'}`
        : `${evidence}${forecast ? ` ${forecast.kind === 'heat' ? 'Heat' : 'Storm'} forecast for day ${forecast.day}.` : ''}${inspection}`,
      severity: outage ? 'urgent' : 'warning', districtId: asset.districtId, position: assetPositions[asset.id],
      target: { kind: 'life', section: 'infrastructure', id: asset.id, districtId: asset.districtId },
      priority: outage ? 115 : asset.risk === 'high' ? 75 : 60, day: state.day,
    });
  }

  for (const district of living.districts) {
    for (const service of district.services) {
      const shortfall = Math.max(0, service.demand - service.served);
      const queued = service.backlog >= Math.max(20, service.demand * .5);
      if (!(service.coverage < .85 && shortfall >= 5) && !queued) continue;
      const urgent = service.coverage < .6 || service.backlog >= Math.max(40, service.demand);
      add({
        id: `service:${district.id}:${service.kind}`, kind: 'service',
        title: `${district.name}: ${service.name.toLowerCase()} shortage`,
        detail: `${Math.round(service.served)} of ${Math.round(service.demand)} served today (${Math.round(service.coverage * 100)}% coverage); ${Math.round(service.backlog)} waiting.`,
        severity: urgent ? 'urgent' : 'warning', districtId: district.id,
        target: { kind: 'life', section: 'services', id: district.id, districtId: district.id },
        priority: urgent ? 95 : 55, day: state.day,
      });
    }
  }

  for (const promise of living.promises) {
    if (promise.status !== 'active' && promise.status !== 'renegotiated') continue;
    const deadlineSoon = promise.dueDay - time <= 1;
    const reviewDue = promise.nextReviewDay <= time;
    if (!deadlineSoon && !reviewDue) continue;
    add({
      id: `promise:${promise.id}`, kind: 'promise', title: promise.title,
      detail: `${deadlineSoon ? 'Commitment' : 'Review'} due day ${dayLabel(deadlineSoon ? promise.dueDay : promise.nextReviewDay)}. ${clipped(promise.progress, 150)}`,
      severity: deadlineSoon ? 'urgent' : 'warning', districtId: promise.districtId,
      position: promise.kind === 'project' ? projectPositions[promise.targetId] : promise.kind === 'asset' ? assetPositions[promise.targetId] : undefined,
      target: { kind: 'life', section: 'promises', id: promise.id, districtId: promise.districtId },
      priority: deadlineSoon ? 98 : 70, day: promise.createdDay,
    });
  }

  for (const assignment of living.construction.assignments) {
    const project = state.projects.find(item => item.definitionId === assignment.projectId && item.status === 'building');
    const definition = projectById[assignment.projectId];
    if (!project || !definition || assignment.crew) continue;
    // A live site letter already provides the more useful action for this site.
    if (state.requests.some(request => request.status === 'open' && request.projectId === assignment.projectId)) continue;
    add({
      id: `construction:${assignment.projectId}`, kind: 'construction', title: `${assignment.name}: crew needed`,
      detail: `${Math.round((project.progress ?? 0) * 100)}% built. Waiting for one of ${living.construction.crews} shared crews; other funded work has priority.`,
      severity: 'warning', districtId: definition.district, position: projectPositions[assignment.projectId],
      target: { kind: 'life', section: 'projects', id: assignment.projectId, districtId: definition.district },
      priority: 58, day: project.startedDay,
    });
  }
  living.works.forEach((work, index) => {
    if (index < living.construction.crews || work.progress >= 1) return;
    const asset = work.kind === 'repair' ? living.assets.find(item => item.id === work.targetId) : undefined;
    const motion = work.kind !== 'repair' ? living.council.motions.find(item => item.id === work.targetId && item.status === 'passed') : undefined;
    if (!asset && !motion) return;
    // An outage pin already links the funded repair; avoid a duplicate pin.
    if (asset && asset.outageUntil > time) return;
    add({
      id: `construction:${work.id}`, kind: 'construction', title: `${asset?.name ?? motion!.title}: crew needed`,
      detail: `${Math.round(work.progress * 100)}% complete. This funded ${work.kind === 'repair' ? 'repair' : 'development'} is waiting for a shared crew.`,
      severity: 'warning', districtId: work.districtId, position: asset ? assetPositions[asset.id] : undefined,
      target: { kind: 'life', section: 'projects', id: work.id, districtId: work.districtId },
      priority: work.kind === 'repair' ? 68 : 52, day: work.startedDay,
    });
  });

  for (const motion of living.council.motions) {
    if (motion.status !== 'draft') continue;
    add({
      id: `council:${motion.id}`, kind: 'council', title: motion.title,
      detail: `${motion.votes.filter(vote => vote.supports).length}/${living.council.members.length} councillors support the draft. Approval would cost $${Math.round(motion.cost).toLocaleString('en-US')}; no vote has been called.`,
      severity: 'info', districtId: motion.districtId,
      target: { kind: 'life', section: 'council', id: motion.id, districtId: motion.districtId },
      priority: 30, day: motion.createdDay,
    });
  }

  if (state.treasury < 1500) add({
    id: 'budget:reserve', kind: 'budget', title: 'Cash reserve is low',
    detail: `$${Math.round(state.treasury).toLocaleString('en-US')} in the treasury, below the $1,500 reserve used for conditional project commitments.`,
    severity: state.treasury < 500 ? 'urgent' : 'warning', target: { kind: 'budget' },
    priority: state.treasury < 500 ? 110 : 72, day: state.day,
  });

  return alerts.sort((a, b) => b.priority - a.priority || a.day - b.day || byId(a.id, b.id)).slice(0, MAX_CITY_ALERTS);
}
