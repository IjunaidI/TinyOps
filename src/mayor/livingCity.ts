import { projectById, PROJECTS } from './catalog';
import type { CityState, DecisionMeta, DistrictId, Effects, Metric } from './types';
import type { CivicActionOption, CivicAsset, CivicPromise, CouncilMotion, CouncilVote, LivingActionResult, LivingAdvanceResult, LivingCityState, LivingEvent, LivingObservation, ServiceKind, WeatherKind } from './livingTypes';

const DISTRICTS: DistrictId[] = ['riverside', 'oldtown', 'market', 'hillview'];
const SERVICES: ServiceKind[] = ['care', 'learning', 'sanitation'];
const SERVICE_NAMES = { care: 'Community care', learning: 'Learning places', sanitation: 'Waste collection' };
const DEPARTMENTS = { care: 'health', learning: 'education', sanitation: 'environment' } as const;
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const now = (city: CityState) => city.day + city.dayProgress;
const rounded = (n: number) => Math.round(n * 1000) / 1000;
const activePromise = (promise: CivicPromise) => promise.status === 'active' || promise.status === 'renegotiated';
const dayWeather = (seed: number, day: number): WeatherKind => {
  const slot = ((Math.imul(seed ^ Math.floor(day / 3), 2654435761) >>> 0) + day * 7) % 19;
  return slot < 2 ? 'storm' : slot < 7 ? 'rain' : slot === 12 || slot === 13 ? 'heat' : 'clear';
};
const weatherWarning = (kind: WeatherKind) => kind === 'storm' ? 'Storm: drainage and bridge wear; outdoor crews work at 65%.' : kind === 'heat' ? 'Heat: power demand and care demand rise.' : kind === 'rain' ? 'Rain: outdoor work is 10% slower; drainage demand rises.' : 'Clear conditions for crews and services.';
const ASSETS: Pick<CivicAsset, 'id' | 'name' | 'kind' | 'districtId'>[] = [
  { id: 'riverside_bridge', name: 'Riverside crossing', kind: 'bridge', districtId: 'riverside' },
  { id: 'riverside_drainage', name: 'Riverbank drains', kind: 'drainage', districtId: 'riverside' },
  { id: 'oldtown_power', name: 'Old Town substation', kind: 'power', districtId: 'oldtown' },
  { id: 'market_drainage', name: 'Market storm drains', kind: 'drainage', districtId: 'market' },
  { id: 'hillview_power', name: 'Hillview substation', kind: 'power', districtId: 'hillview' },
];
const RESIDENTS = [
  ['mira', 'Mira Shah', 'Care worker', 'riverside', 'care', 'Mira needs reliable care appointments for her father.'],
  ['ben', 'Ben Ortiz', 'Renter', 'riverside', 'housing', 'Ben wants to stay near the river without losing his affordable home.'],
  ['amina', 'Amina Yusuf', 'Retired teacher', 'oldtown', 'care', 'Amina depends on nearby accessible appointments.'],
  ['leo', 'Leo Chen', 'Shop apprentice', 'oldtown', 'access', 'Leo crosses town daily for work and evening classes.'],
  ['rosa', 'Rosa Silva', 'Market trader', 'market', 'sanitation', 'Rosa needs dependable collections to keep her food stall open.'],
  ['elliot', 'Elliot Reed', 'Delivery rider', 'market', 'access', 'Elliot earns less when deliveries get stuck in traffic.'],
  ['sana', 'Sana Iqbal', 'Parent', 'hillview', 'learning', 'Sana needs a school place within a manageable commute.'],
  ['oscar', 'Oscar Bell', 'Bus driver', 'hillview', 'housing', 'Oscar wants growth without existing renters being pushed out.'],
] as const;

export function createLivingCity(city: Pick<CityState, 'day' | 'seed' | 'districts'>): LivingCityState {
  return {
    version: 1, lastDay: city.day - 1, sequence: 0,
    districts: city.districts.map(d => ({ id: d.id, name: d.name, population: d.population, services: SERVICES.map(kind => ({ kind, name: SERVICE_NAMES[kind], demand: 0, capacity: 0, served: 0, backlog: 0, coverage: 1, staff: 0 })), access: 1, congestion: .2, commuteMinutes: 16, homes: Math.ceil(d.population / 2.8), jobs: Math.round(d.population * (d.id === 'market' ? .64 : .38)), rent: 660 + (d.id === 'market' ? 110 : 0), rentBurden: .3, displaced: 0, protectionsUntil: 0, shuttle: false, landUsed: 0 })),
    citizens: RESIDENTS.map(([id, name, role, districtId, need, story]) => ({ id, name, role, districtId, need, story, satisfaction: 64, unmetDays: 0, displaced: false, memories: [] })),
    assets: ASSETS.map((a, i) => ({ ...a, condition: [58, 49, 66, 55, 71][i], lastInspectedDay: null, observedCondition: null, risk: i === 1 ? 'high' : 'watch', outageUntil: 0, maintenanceUntil: 0, inspectionDue: null, repairDue: null })),
    promises: [], works: [], events: [], briefing: [],
    weather: { today: dayWeather(city.seed, city.day), forecast: [] },
    traffic: { policy: 'balanced', congestion: .2, commuteMinutes: 16, closures: [] },
    construction: { crews: 2, extraCrewUntil: 0, assignments: [], contractor: 'standard', projectQuality: {}, priorityProjectId: null },
    council: { members: [
      { id: 'council-vale', name: 'Nadia Vale', districtId: 'riverside', priority: 'residents' },
      { id: 'council-cooper', name: 'Tom Cooper', districtId: 'market', priority: 'business' },
      { id: 'council-green', name: 'Mei Green', districtId: 'riverside', priority: 'green' },
      { id: 'council-patel', name: 'Arun Patel', districtId: 'hillview', priority: 'services' },
      { id: 'council-brooks', name: 'Eva Brooks', districtId: 'oldtown', priority: 'budget' },
    ], motions: [] },
    staffPool: 4, recurringCost: 0, electionEffect: 0,
  };
}

function event(city: CityState, kind: LivingEvent['kind'], title: string, text: string, districtId?: DistrictId, sourceId?: string) {
  const item = { id: ++city.living.sequence, day: now(city), kind, title, text, ...(districtId ? { districtId } : {}), ...(sourceId ? { sourceId } : {}) };
  city.living.events.unshift(item); city.living.events.length = Math.min(80, city.living.events.length);
  return item;
}
function remember(city: CityState, districtId: DistrictId | undefined, text: string, outcome: 'helped' | 'hurt' | 'promise' | 'observed', sourceId?: string) {
  for (const citizen of city.living.citizens) {
    if (districtId && citizen.districtId !== districtId) continue;
    if (citizen.memories[0]?.text === text) continue;
    citizen.memories.unshift({ day: now(city), text, outcome, ...(sourceId ? { sourceId } : {}) });
    citizen.memories.length = Math.min(8, citizen.memories.length);
    if (outcome === 'helped' || outcome === 'hurt') citizen.satisfaction = clamp(citizen.satisfaction + (outcome === 'helped' ? 2 : -3));
  }
}
export function observeLivingDecision(city: CityState, observation: LivingObservation) {
  const total = Object.values(observation.effects?.metrics ?? {}).reduce((a, b) => a + b, 0) + (observation.effects?.districtHappiness ?? 0);
  remember(city, observation.districtId, observation.title, total > 0 ? 'helped' : total < 0 ? 'hurt' : 'observed', observation.sourceId);
}

function projectCapacity(city: CityState, districtId: DistrictId, kind: ServiceKind) {
  return city.projects.filter(p => p.status === 'complete' && projectById[p.definitionId]?.district === districtId).reduce((sum, p) => {
    const definition = projectById[p.definitionId];
    const amount = kind === 'care' ? (definition.effects.metrics?.health ?? 0) * 3 : kind === 'learning' ? (definition.effects.metrics?.education ?? 0) * 5 : (definition.effects.metrics?.environment ?? 0) * 6;
    const quality = city.living.construction.projectQuality[p.definitionId] ?? 'standard';
    return sum + amount * (quality === 'economy' ? .8 : quality === 'quality' ? 1.12 : 1);
  }, 0);
}

export function getCouncilVotes(city: CityState, motion: CouncilMotion): CouncilVote[] {
  const district = city.living.districts.find(d => d.id === motion.districtId)!;
  const health = district.services.find(s => s.kind === 'care')!.coverage;
  const education = district.services.find(s => s.kind === 'learning')!.coverage;
  const safeReserve = city.treasury - motion.cost >= 1500;
  return city.living.council.members.map(member => {
    let supports = false, reason = '';
    if (member.priority === 'residents') {
      supports = motion.kind === 'protection' || motion.amendment === 'affordable' || (motion.kind === 'housing' && district.rentBurden > .4 && district.protectionsUntil > now(city));
      reason = supports ? 'Protects existing residents or supplies affordable homes.' : 'Needs an affordable-homes or tenant safeguard amendment.';
    } else if (member.priority === 'business') {
      supports = motion.kind === 'jobs' || motion.amendment === 'local_jobs' || (motion.kind === 'housing' && district.jobs > district.population * .35);
      reason = supports ? 'Adds workers, customers, or local jobs.' : 'Needs a clear local employment benefit.';
    } else if (member.priority === 'green') {
      supports = motion.kind === 'protection' || motion.amendment === 'green';
      reason = supports ? 'Uses existing homes or includes drainage and green-building conditions.' : 'New development needs the green-building amendment.';
    } else if (member.priority === 'services') {
      supports = motion.kind !== 'housing' || (health >= .78 && education >= .78) || motion.amendment === 'affordable';
      reason = supports ? 'Existing services or the phased affordable plan can support this proposal.' : 'Care or school capacity is too constrained for unphased growth.';
    } else {
      supports = safeReserve;
      reason = supports ? 'Retains at least $1,500 after the commitment.' : 'The proposal would leave less than $1,500 for essential work.';
    }
    return { memberId: member.id, name: member.name, supports, reason };
  });
}

/** Derived operational state. Calling this never advances timers, spends money, or adds history. */
export function refreshLivingCity(city: CityState) {
  const living = city.living, time = now(city);
  living.works.sort((a, b) => Number(b.kind === 'repair') - Number(a.kind === 'repair') || a.startedDay - b.startedDay || a.id.localeCompare(b.id));
  living.weather.today = dayWeather(city.seed, city.day);
  living.weather.forecast = [1, 2, 3].map(ahead => { const day = city.day + ahead, kind = dayWeather(city.seed, day); return { day, kind, warning: weatherWarning(kind) }; });
  living.traffic.closures = living.assets.filter(a => a.kind === 'bridge' && a.outageUntil > time).map(a => a.id);
  for (const district of living.districts) {
    district.population = city.districts.find(d => d.id === district.id)!.population;
    const works = city.projects.filter(p => p.status === 'building' && projectById[p.definitionId]?.district === district.id).length + living.works.filter(w => w.districtId === district.id).length;
    const outages = living.assets.filter(a => a.districtId === district.id && a.outageUntil > time);
    const bridge = living.traffic.closures.length ? .18 : 0;
    const pressure = Math.max(0, district.population / Math.max(1, district.homes * 2.7) - 1);
    district.congestion = clamp(.16 + pressure * .75 + works * .085 + outages.length * .15 + bridge + (district.id === 'market' ? .13 : 0) + (living.traffic.policy === 'freight' && district.id !== 'market' ? .1 : 0) - (living.traffic.policy === 'transit' ? .1 : 0) - (district.shuttle ? .08 : 0), .05, .95);
    district.access = rounded(clamp(1 - district.congestion * .48 - (outages.some(a => a.kind === 'power') ? .18 : 0) - (outages.some(a => a.kind === 'drainage') ? .12 : 0) + (district.shuttle ? .14 : 0), .25, 1));
    district.commuteMinutes = rounded(12 + district.congestion * 37 - (district.shuttle ? 4 : 0));
    district.rentBurden = rounded(district.rent / (2300 + (district.jobs / Math.max(1, district.population)) * 1100));
    for (const service of district.services) {
      const scale = service.kind === 'care' ? .08 : service.kind === 'learning' ? .14 : .33;
      const originalPopulation = [640, 580, 620, 560][DISTRICTS.indexOf(district.id)];
      const base = originalPopulation * scale * (district.id === 'hillview' && service.kind === 'learning' ? .68 : district.id === 'oldtown' && service.kind === 'care' ? .82 : 1.05);
      service.demand = Math.round(district.population * scale * (service.kind === 'care' && living.weather.today === 'heat' ? 1.18 : 1));
      const funding = [.7, 1, 1.2][city.departments[DEPARTMENTS[service.kind]]];
      service.capacity = Math.round((base + projectCapacity(city, district.id, service.kind) + service.staff * (service.kind === 'sanitation' ? 65 : 24)) * funding * district.access);
      service.served = Math.min(service.demand, service.capacity);
      service.coverage = rounded(clamp(service.capacity / Math.max(1, service.demand), 0, 1));
    }
  }
  living.traffic.congestion = rounded(living.districts.reduce((sum, d) => sum + d.congestion, 0) / 4);
  living.traffic.commuteMinutes = rounded(living.districts.reduce((sum, d) => sum + d.commuteMinutes, 0) / 4);
  living.construction.crews = 2 + Number(living.construction.extraCrewUntil > time);
  const workCrews = Math.min(living.works.length, living.construction.crews);
  const projects = city.projects.filter(p => p.status === 'building').sort((a, b) => Number(b.definitionId === living.construction.priorityProjectId) - Number(a.definitionId === living.construction.priorityProjectId) || a.startedDay - b.startedDay || a.definitionId.localeCompare(b.definitionId));
  living.construction.assignments = projects.map((project, index) => {
    const quality = living.construction.projectQuality[project.definitionId] ?? living.construction.contractor;
    const crew = index < living.construction.crews - workCrews;
    return { projectId: project.definitionId, name: projectById[project.definitionId].name, crew, quality, workRate: crew ? (quality === 'economy' ? .82 : 1) * (living.weather.today === 'storm' ? .65 : living.weather.today === 'rain' ? .9 : 1) : 0, delayDays: project.operationalDelayDays ?? 0 };
  });
  const staff = living.districts.reduce((sum, d) => sum + d.services.reduce((n, s) => n + s.staff, 0), 0);
  living.recurringCost = staff * 45 + living.districts.filter(d => d.shuttle).length * 65 + living.districts.filter(d => d.protectionsUntil > time).length * 45 + Number(living.construction.extraCrewUntil > time) * 160 + projects.reduce((sum, project) => { const quality = living.construction.projectQuality[project.definitionId] ?? 'standard'; return sum + (quality === 'quality' ? 35 : quality === 'economy' ? -15 : 0); }, 0);
  const publicMood = living.citizens.reduce((sum, c) => sum + c.satisfaction, 0) / living.citizens.length;
  const broken = living.promises.filter(p => p.status === 'broken').length, kept = living.promises.filter(p => p.status === 'kept').length;
  living.electionEffect = rounded(clamp((publicMood - 60) * .12 + Math.min(3, kept * .35) - Math.min(8, broken * 1.5), -12, 8));
  for (const motion of living.council.motions) if (motion.status === 'draft') motion.votes = getCouncilVotes(city, motion);
  const worst = living.districts.flatMap(d => d.services.map(s => ({ d, s }))).sort((a, b) => a.s.coverage - b.s.coverage)[0];
  const unmet = living.promises.filter(p => activePromise(p) && p.nextReviewDay <= time);
  living.briefing = [
    `${worst.d.name}: ${worst.s.name.toLowerCase()} serves ${worst.s.served}/${worst.s.demand}; ${Math.round(worst.s.backlog)} waiting.`,
    `${projects.length + living.works.length} jobs share ${living.construction.crews} crews. ${living.construction.assignments.filter(p => !p.crew).length} construction sites are waiting.`,
    `${living.traffic.commuteMinutes} minute average commute. ${living.traffic.closures.length} crossing restrictions.`,
    `${unmet.length} commitments need review. ${weatherWarning(living.weather.today)}`,
  ];
}

export function getLivingWorkRate(city: CityState, projectId: string) { return city.living.construction.assignments.find(a => a.projectId === projectId)?.workRate ?? 1; }

function addPromise(city: CityState, promise: Omit<CivicPromise, 'id' | 'createdDay' | 'nextReviewDay' | 'status' | 'renegotiations'>) {
  const existing = city.living.promises.find(p => activePromise(p) && p.kind === promise.kind && p.targetId === promise.targetId);
  if (existing) return existing;
  // Operations report at daily boundaries; promises explicitly use those same
  // boundaries so a partial day cannot hide a missed deadline.
  const item: CivicPromise = { ...promise, dueDay: Math.ceil(promise.dueDay), id: `promise-${++city.living.sequence}`, createdDay: now(city), nextReviewDay: Math.ceil(now(city) + 2), status: 'active', renegotiations: 0 };
  if (item.sourceId === undefined) delete item.sourceId;
  if (item.districtId === undefined) delete item.districtId;
  city.living.promises.push(item);
  while (city.living.promises.length > 60) { const index = city.living.promises.findIndex(p => !activePromise(p)); if (index < 0) break; city.living.promises.splice(index, 1); }
  event(city, 'promise', item.title, item.condition, item.districtId, item.id); remember(city, item.districtId, item.title, 'promise', item.id);
  return item;
}

export function trackProjectPromise(city: CityState, projectId: string, meta: DecisionMeta, sourceId?: string, automatic = false) {
  const definition = projectById[projectId]; if (!definition) return undefined;
  const existing = city.projects.find(p => p.definitionId === projectId);
  if (existing?.status === 'complete') return undefined;
  const dueDay = existing?.completesDay ?? now(city) + definition.duration + 7;
  return addPromise(city, { title: `${definition.name}: ${existing ? 'opening commitment' : automatic ? 'conditional commission' : 'funding review'}`, kind: 'project', targetId: projectId, districtId: definition.district, dueDay, condition: existing ? 'Open the commissioned site by the promised date. Crew and inspection delays require a public update.' : automatic ? `Commission only when $${definition.cost} plus a $1,500 reserve and three days of added upkeep are available. Recheck operating commitments first.` : 'Review affordability without automatically authorizing expenditure.', progress: existing ? 'Construction underway.' : 'Waiting for affordable funding.', actor: meta.actor, automatic, sourceId });
}

export function reviewDeferredPetition(city: CityState, projectId: string, meta: DecisionMeta, sourceId: string) { return trackProjectPromise(city, projectId, meta, sourceId, false); }

export function trackReviewReminder(city: CityState, title: string, sourceId: string, meta: DecisionMeta, districtId?: DistrictId) {
  return addPromise(city, { title: `Revisit: ${title.slice(0, 100)}`, kind: 'review', targetId: sourceId, districtId, dueDay: now(city) + 5, condition: 'Publish an affordability or priority review. This is not authorization to spend.', progress: 'Waiting for review; no money is reserved or automatically spent.', actor: meta.actor, automatic: false, sourceId });
}

function motionCost(kind: CouncilMotion['kind'], amendment: CouncilMotion['amendment']) { return (kind === 'housing' ? 3700 : kind === 'jobs' ? 2900 : 900) + (amendment === 'none' ? 0 : amendment === 'affordable' ? 900 : amendment === 'green' ? 650 : 500); }
function affordable(city: CityState, cost: number) { return city.treasury >= cost; }

/** Public finite action catalog. Both manual and AI callers execute exactly these same actions. */
export function getLivingActions(city: CityState): CivicActionOption[] {
  refreshLivingCity(city);
  const l = city.living, time = now(city), actions: CivicActionOption[] = [];
  const add = (a: Omit<CivicActionOption, 'available'> & { available?: boolean }) => {
    const legal = a.available !== false;
    const dayCost = a.id.startsWith('staff:') ? a.id.endsWith(':add') ? 45 : -45 : a.id.startsWith('shuttle:') ? a.id.endsWith(':start') ? 65 : -65 : a.id === 'crew:hire' ? 160 : 0;
    actions.push({ dayCost, ...a, available: legal && affordable(city, a.cost), unavailableReason: !legal ? a.unavailableReason ?? 'This action is not currently available.' : !affordable(city, a.cost) ? 'The treasury cannot cover the published cost.' : undefined });
  };
  const usedStaff = l.districts.reduce((sum, d) => sum + d.services.reduce((n, s) => n + s.staff, 0), 0);
  for (const d of l.districts) {
    for (const s of d.services) {
      add({ id: `staff:${d.id}:${s.kind}:add`, title: `Send a ${s.kind} team to ${d.name}`, description: `Allocate one of ${l.staffPool} mobile teams. ${usedStaff} are assigned. Adds practical service capacity; $45/day wages.`, category: 'services', districtId: d.id, cost: 180, available: usedStaff < l.staffPool && s.staff < 2, priority: Math.round((1 - s.coverage) * 100 + Math.min(20, s.backlog / 10)), effectsHint: 'Capacity rises immediately; wages recur until recalled.' });
      add({ id: `staff:${d.id}:${s.kind}:remove`, title: `Recall a ${s.kind} team from ${d.name}`, description: 'Free one mobile team for another district and stop its $45/day wages; local capacity falls.', category: 'services', districtId: d.id, cost: 0, available: s.staff > 0, priority: s.coverage >= 1 ? 15 : 0, effectsHint: 'Redistributes scarce staff rather than creating new employees.' });
      add({ id: `pledge_service:${d.id}:${s.kind}`, title: `Commit to restoring ${d.name} ${s.kind}`, description: 'Promise at least 90% daily service coverage within six days. The promise is checked against actual service access and staffing.', category: 'promises', districtId: d.id, cost: 0, available: s.coverage < .9 && !l.promises.some(p => activePromise(p) && p.targetId === `${d.id}:${s.kind}`), priority: 2, effectsHint: 'A public deadline creates accountability; no service improves merely by making the promise.' });
    }
    add({ id: `shuttle:${d.id}:${d.shuttle ? 'stop' : 'start'}`, title: `${d.shuttle ? 'Withdraw' : 'Run'} the ${d.name} shuttle`, description: d.shuttle ? 'End the shuttle and its $65/day operating cost; access worsens.' : 'Start a district shuttle for $300, then $65/day. Improves access and reduces car congestion.', category: 'transport', districtId: d.id, cost: d.shuttle ? 0 : 300, priority: d.shuttle ? 0 : Math.round(d.congestion * 55), effectsHint: 'Commute time and usable service capacity change together.' });
    for (const kind of ['housing', 'jobs', 'protection'] as const) add({ id: `motion:${d.id}:${kind}`, title: `Propose ${kind === 'housing' ? 'new homes' : kind === 'jobs' ? 'a local workshop' : 'tenant protection'} in ${d.name}`, description: `Put a binding proposal before five councillors. ${kind === 'protection' ? 'Protects renters for 12 days, with $45/day administration.' : 'A passed motion reserves one of two neighborhood development sites and needs a construction crew.'} Base approval cost $${motionCost(kind, 'none')}; amendments alter the price.`, category: 'council', districtId: d.id, cost: 0, available: l.council.motions.length < 30 && !l.council.motions.some(m => m.status === 'draft' && m.districtId === d.id && m.kind === kind) && (kind === 'protection' ? d.protectionsUntil <= time + 3 : d.landUsed < 2) && !l.council.motions.some(m => m.status === 'rejected' && m.districtId === d.id && m.kind === kind && time - (m.resolvedDay ?? time) < 3), priority: kind === 'housing' ? Math.round(d.rentBurden * 40) : kind === 'protection' && d.displaced ? 40 : 8, effectsHint: 'Proposal alone spends nothing; at least three yes votes are required to authorize work.' });
  }
  for (const asset of l.assets) {
    const inspected = asset.lastInspectedDay !== null && time - asset.lastInspectedDay < 3;
    add({ id: `inspect:${asset.id}`, title: `Inspect ${asset.name}`, description: 'Spend $120 for an engineering inspection. Results arrive in the first daily report after one full city day. The result reveals actual condition; it does not repair the asset.', category: 'infrastructure', districtId: asset.districtId, cost: 120, available: asset.inspectionDue === null && !inspected, priority: asset.risk === 'high' ? 70 : 24, effectsHint: 'The published due day is the daily report that will contain the evidence; the city keeps moving while you wait.' });
    add({ id: `repair:${asset.id}`, title: `Repair ${asset.name}`, description: 'Spend $1,600 and reserve a shared crew for three working days. Completion restores condition and ends any outage. Other construction may wait.', category: 'infrastructure', districtId: asset.districtId, cost: 1600, available: !l.works.some(w => w.kind === 'repair' && w.targetId === asset.id), priority: asset.outageUntil > time ? 100 : asset.risk === 'high' ? 65 : 12, effectsHint: 'A funded repair still needs an available crew; progress never runs backward.' });
    add({ id: `maintain:${asset.id}`, title: `Protect ${asset.name} for the forecast`, description: 'Preventive maintenance costs $450 and reduces wear by 70% for six days. It cannot reopen an active outage.', category: 'infrastructure', districtId: asset.districtId, cost: 450, available: asset.maintenanceUntil <= time && asset.outageUntil <= time, priority: asset.risk !== 'low' && l.weather.forecast.some(f => f.kind === 'storm' || f.kind === 'heat') ? 55 : 10, effectsHint: 'Acts on the forecast before an outage; inspection can tell whether full repair is wiser.' });
  }
  for (const policy of ['balanced', 'transit', 'freight'] as const) add({ id: `traffic:${policy}`, title: `Set ${policy} street priority`, description: policy === 'transit' ? 'Give buses priority: better access, slightly reduced market freight throughput.' : policy === 'freight' ? 'Give freight priority: stronger market throughput, longer neighborhood commutes.' : 'Share streets between residents and freight without a preferred flow.', category: 'transport', cost: 100, available: policy !== l.traffic.policy, priority: policy === 'transit' && l.traffic.congestion > .35 ? 35 : 4, effectsHint: 'Changes modeled access, commute duration, and economic throughput.' });
  add({ id: 'crew:hire', title: 'Hire a relief construction crew', description: 'Eight days of one extra crew. $350 mobilization and $160/day. Available crews must still be shared with repair jobs.', category: 'construction', cost: 350, available: l.construction.extraCrewUntil <= time, priority: l.construction.assignments.some(a => !a.crew) ? 60 : 5, effectsHint: 'Projects finish sooner at a recurring budget cost.' });
  for (const quality of ['economy', 'standard', 'quality'] as const) add({ id: `contractor:${quality}`, title: `Use ${quality} delivery standards`, description: quality === 'economy' ? 'Future contracts use 82% work speed and deliver 80% of standard service capacity. Save $15 per active economy site/day.' : quality === 'quality' ? 'Future contracts include quality oversight for $35 per active site/day. Their completed services provide 112% of standard capacity.' : 'Standard progress, operating quality, and no additional contractor daily charge.', category: 'construction', cost: 0, available: quality !== l.construction.contractor, priority: 3, effectsHint: 'Quality is locked when a contract is commissioned; existing contracts retain their price and standards.' });
  for (const a of l.construction.assignments) add({ id: `crew:prioritize:${a.projectId}`, title: `Prioritize ${a.name}`, description: 'Move this site to the front of the shared construction queue. Repair works remain first because they restore existing services.', category: 'construction', districtId: projectById[a.projectId].district, cost: 0, available: l.construction.priorityProjectId !== a.projectId, priority: a.crew ? 2 : 25, effectsHint: 'One site gains attention; another may wait.' });
  for (const promise of l.promises.filter(activePromise)) {
    add({ id: `promise:review:${promise.id}`, title: `Review: ${promise.title}`, description: promise.progress, category: 'promises', districtId: promise.districtId, cost: 0, available: promise.nextReviewDay <= time, priority: promise.dueDay - time <= 2 ? 80 : 30, effectsHint: 'Publish the actual current status and next review date without changing the deadline.' });
    add({ id: `promise:renegotiate:${promise.id}`, title: `Renegotiate: ${promise.title}`, description: 'Publish a four-day extension before the deadline. Residents lose some trust, but the changed obligation remains binding. Only one extension is allowed.', category: 'promises', districtId: promise.districtId, cost: 0, available: promise.renegotiations === 0 && promise.dueDay > time, priority: promise.dueDay - time < 2 ? 50 : 0, effectsHint: 'Trades public trust for time; it does not erase history.' });
  }
  for (const project of PROJECTS) add({ id: `commit_project:${project.id}`, title: `Conditionally commit to ${project.name}`, description: `Authorize a future commission only after the treasury can cover $${project.cost}, $1,500 reserve, and three days of added upkeep. The engine rechecks existing construction and recurring costs daily. No money is spent now.`, category: 'promises', districtId: project.district, cost: 0, available: !city.projects.some(p => p.definitionId === project.id) && !l.promises.some(p => activePromise(p) && p.targetId === project.id), priority: 1, effectsHint: 'Creates explicit standing spending authority with an opening deadline and daily affordability review.' });
  for (const motion of l.council.motions.filter(m => m.status === 'draft')) {
    add({ id: `withdraw:${motion.id}`, title: `Withdraw: ${motion.title}`, description: 'Close this unapproved proposal without spending funds or using land.', category: 'council', districtId: motion.districtId, cost: 0, priority: 0, effectsHint: 'A revised proposal can be introduced after three days.' });
    for (const amendment of ['none', 'affordable', 'green', 'local_jobs'] as const) add({ id: `amend:${motion.id}:${amendment}`, title: `${amendment === 'none' ? 'Remove amendments' : `Add ${amendment.replace('_', ' ')} conditions`}: ${motion.title}`, description: `Recalculate councillor votes. Approval cost becomes $${motionCost(motion.kind, amendment)}. ${amendment === 'affordable' ? 'Housing is phased at 40 protected homes rather than 60 market homes.' : amendment === 'green' ? 'Adds drainage protection, but construction takes one extra working day.' : amendment === 'local_jobs' ? 'Reserves work for local hires, adding 20 jobs when complete.' : 'The unamended proposal has no additional conditions.'}`, category: 'council', districtId: motion.districtId, cost: 0, available: motion.amendment !== amendment && (motion.kind !== 'protection' || amendment === 'none'), priority: 15, effectsHint: 'Amendments change the delivered project and binding vote, not just council popularity.' });
    add({ id: `vote:${motion.id}`, title: `Call a binding vote: ${motion.title}`, description: `${motion.votes.filter(v => v.supports).length}/5 councillors currently support it. A majority starts the specified work and charges $${motion.cost}; a rejection spends nothing and cannot be reintroduced for three days.`, category: 'council', districtId: motion.districtId, cost: motion.votes.filter(v => v.supports).length >= 3 ? motion.cost : 0, available: motion.kind === 'protection' || l.districts.find(d => d.id === motion.districtId)!.landUsed < 2, unavailableReason: 'Both neighborhood development sites are already committed. Withdraw this motion.', priority: motion.votes.filter(v => v.supports).length >= 3 ? 45 : 1, effectsHint: 'Recorded individual votes determine whether the proposal can proceed.' });
  }
  return actions.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

/** Called only behind the authoritative engine action guard. Rechecks the complete legal catalog. */
export function executeLivingAction(city: CityState, id: string, meta: DecisionMeta): LivingActionResult {
  const action = getLivingActions(city).find(a => a.id === id);
  if (!action?.available) return { ok: false, error: action?.unavailableReason ?? 'This civic action is no longer available.' };
  const l = city.living, time = now(city), parts = id.split(':');
  let trustChange = 0;
  // Validate all referenced objects via the generated legal action before applying any mutation.
  city.treasury -= action.cost;
  if (parts[0] === 'staff') {
    const service = l.districts.find(d => d.id === parts[1])!.services.find(s => s.kind === parts[2])!;
    service.staff += parts[3] === 'add' ? 1 : -1;
  } else if (parts[0] === 'shuttle') l.districts.find(d => d.id === parts[1])!.shuttle = parts[2] === 'start';
  else if (parts[0] === 'traffic') l.traffic.policy = parts[1] as LivingCityState['traffic']['policy'];
  else if (parts[0] === 'inspect') l.assets.find(a => a.id === parts[1])!.inspectionDue = Math.ceil(time + 1);
  else if (parts[0] === 'maintain') l.assets.find(a => a.id === parts[1])!.maintenanceUntil = time + 6;
  else if (parts[0] === 'repair') {
    const asset = l.assets.find(a => a.id === parts[1])!;
    asset.repairDue = Math.ceil(time + 3);
    l.works.push({ id: `work-${++l.sequence}`, kind: 'repair', targetId: asset.id, districtId: asset.districtId, startedDay: time, dueDay: asset.repairDue, progress: 0, duration: 3, affordable: false, actor: meta.actor });
    addPromise(city, { title: `Restore ${asset.name}`, kind: 'asset', targetId: asset.id, districtId: asset.districtId, dueDay: time + 5, condition: 'Finish the repair and reopen the asset.', progress: 'Crew assignment pending.', actor: meta.actor, automatic: false });
  } else if (parts[0] === 'pledge_service') addPromise(city, { title: `Restore ${parts[1]} ${parts[2]}`, kind: 'service', targetId: `${parts[1]}:${parts[2]}`, districtId: parts[1] as DistrictId, dueDay: time + 6, condition: 'Reach at least 90% daily service coverage.', progress: 'Allocation and access changes are needed.', actor: meta.actor, automatic: false });
  else if (parts[0] === 'commit_project') trackProjectPromise(city, parts[1], meta, undefined, true);
  else if (parts[0] === 'crew' && parts[1] === 'hire') l.construction.extraCrewUntil = time + 8;
  else if (parts[0] === 'crew' && parts[1] === 'prioritize') l.construction.priorityProjectId = parts[2];
  else if (parts[0] === 'contractor') {
    l.construction.contractor = parts[1] as LivingCityState['construction']['contractor'];
  } else if (parts[0] === 'promise') {
    const promise = l.promises.find(p => p.id === parts[2])!;
    promise.nextReviewDay = Math.ceil(time + 2);
    if (parts[1] === 'review' && promise.kind === 'review') { promise.status = 'kept'; promise.progress = 'Published review completed; the original request remains a separate decision.'; }
    if (parts[1] === 'renegotiate') { promise.dueDay += 4; promise.renegotiations++; promise.status = 'renegotiated'; trustChange = -1; remember(city, promise.districtId, `${promise.title}: deadline extended to day ${Math.ceil(promise.dueDay)}.`, 'hurt', promise.id); }
  } else if (parts[0] === 'motion') {
    const kind = parts[2] as CouncilMotion['kind'];
    l.council.motions.push({ id: `motion-${++l.sequence}`, title: `${kind === 'housing' ? 'Neighborhood homes' : kind === 'jobs' ? 'Local workshop' : 'Tenant protection'} · ${l.districts.find(d => d.id === parts[1])!.name}`, districtId: parts[1] as DistrictId, kind, amendment: 'none', status: 'draft', createdDay: time, cost: motionCost(kind, 'none'), votes: [], actor: meta.actor });
    // Preserve passed motions: completed works and promises reference their binding terms.
  } else if (parts[0] === 'withdraw') {
    const motion = l.council.motions.find(m => m.id === parts[1])!; motion.status = 'rejected'; motion.resolvedDay = time;
  } else if (parts[0] === 'amend') {
    const motion = l.council.motions.find(m => m.id === parts[1])!;
    motion.amendment = parts[2] as CouncilMotion['amendment']; motion.cost = motionCost(motion.kind, motion.amendment);
  } else if (parts[0] === 'vote') {
    const motion = l.council.motions.find(m => m.id === parts[1])!, district = l.districts.find(d => d.id === motion.districtId)!;
    // Keep the public pre-vote tally generated before any funds were charged.
    // Recomputing an unsuccessful vote with a zero cost would change its result.
    const passed = motion.votes.filter(v => v.supports).length >= 3;
    motion.status = passed ? 'passed' : 'rejected'; motion.resolvedDay = time;
    if (passed) {
      if (motion.kind === 'protection') district.protectionsUntil = time + 12;
      else {
        district.landUsed++;
        const duration = (motion.kind === 'housing' ? 4 : 3) + Number(motion.amendment === 'green');
        l.works.push({ id: `work-${++l.sequence}`, kind: motion.kind, targetId: motion.id, districtId: motion.districtId, startedDay: time, dueDay: Math.ceil(time + duration), progress: 0, duration, affordable: motion.amendment === 'affordable', actor: meta.actor });
        addPromise(city, { title: `Deliver ${motion.title}`, kind: 'housing', targetId: motion.id, districtId: motion.districtId, dueDay: time + duration + 3, condition: 'Complete the council-approved project and its binding amendment.', progress: 'Council approved; waiting for a crew.', actor: meta.actor, automatic: false });
      }
    }
    event(city, 'council', `${motion.title}: ${motion.status}`, motion.votes.map(v => `${v.name}: ${v.supports ? 'yes' : 'no'} (${v.reason})`).join(' '), motion.districtId, motion.id);
  }
  if (trustChange) city.metrics.trust = clamp(city.metrics.trust + trustChange);
  event(city, action.category === 'infrastructure' ? 'asset' : action.category === 'services' ? 'service' : action.category === 'transport' ? 'traffic' : action.category === 'promises' ? 'promise' : action.category === 'construction' ? 'construction' : 'council', action.title, action.description, action.districtId, id);
  remember(city, action.districtId, action.title, 'observed', id);
  refreshLivingCity(city);
  return { ok: true, title: action.title, effects: { ...(action.cost ? { treasury: -action.cost } : {}), ...(trustChange ? { metrics: { trust: trustChange } } : {}) } };
}

function completion(city: CityState, promise: CivicPromise) {
  if (promise.kind === 'review') return false;
  if (promise.kind === 'project') {
    const project = city.projects.find(p => p.definitionId === promise.targetId);
    promise.progress = project ? project.status === 'complete' ? 'Open and providing services.' : `${Math.round((project.progress ?? 0) * 100)}% built; expected day ${Math.ceil(project.completesDay)}.` : promise.automatic ? 'Waiting for the published funding condition.' : 'Funding review due; no automatic spending authority.';
    // The daily ledger runs before the engine opens sites at this boundary so
    // newly opened buildings never charge upkeep for the preceding day.
    return project?.status === 'complete' || !!project && (project.progress ?? 0) >= 1 - 1e-8 && project.completesDay <= now(city) + 1e-8;
  }
  if (promise.kind === 'asset') {
    const asset = city.living.assets.find(a => a.id === promise.targetId)!;
    const work = city.living.works.find(w => w.targetId === asset.id);
    promise.progress = work ? `Repair ${Math.round(work.progress * 100)}% complete.` : asset.condition >= 85 ? 'Repair completed; asset restored.' : 'Asset still needs repair.';
    return !work && asset.condition >= 85 && asset.outageUntil <= now(city);
  }
  if (promise.kind === 'service') {
    const [district, kind] = promise.targetId.split(':');
    const service = city.living.districts.find(d => d.id === district)!.services.find(s => s.kind === kind)!;
    promise.progress = `${Math.round(service.coverage * 100)}% coverage; ${Math.round(service.backlog)} waiting.`;
    return service.coverage >= .9;
  }
  const work = city.living.works.find(w => w.targetId === promise.targetId);
  promise.progress = work ? `${Math.round(work.progress * 100)}% of approved work complete.` : 'Approved development delivered.';
  return !work && city.living.council.motions.some(m => m.id === promise.targetId && m.status === 'passed');
}

/** Exactly one call per completed city day, from the engine's daily budget boundary. */
export function advanceLivingCity(city: CityState): LivingAdvanceResult {
  const l = city.living, time = now(city);
  if (l.lastDay >= city.day) return { effects: {}, commissions: [] };
  l.lastDay = city.day;
  const metrics: Partial<Record<Metric, number>> = {}, commissions: LivingAdvanceResult['commissions'] = [];
  const addMetric = (metric: Metric, value: number) => { metrics[metric] = (metrics[metric] ?? 0) + value; };
  refreshLivingCity(city);
  for (const asset of l.assets) {
    if (asset.outageUntil > 0 && asset.outageUntil <= time) {
      asset.outageUntil = 0; asset.condition = Math.max(asset.condition, 28);
      event(city, 'asset', `${asset.name}: temporary recovery`, 'Emergency recovery restored service, but the underlying asset still needs maintenance.', asset.districtId, asset.id);
    }
    const pressure = l.weather.today === 'storm' && asset.kind !== 'power' ? 5.2 : l.weather.today === 'heat' && asset.kind === 'power' ? 4.5 : l.weather.today === 'rain' && asset.kind === 'drainage' ? 2.7 : .65;
    asset.condition = clamp(asset.condition - pressure * (asset.maintenanceUntil > time ? .3 : 1));
    if (asset.inspectionDue !== null && asset.inspectionDue <= time) {
      asset.lastInspectedDay = time; asset.observedCondition = rounded(asset.condition); asset.inspectionDue = null;
      event(city, 'asset', `${asset.name}: inspection returned`, `Condition ${Math.round(asset.condition)}/100. ${asset.condition < 35 ? 'Repair advised before the next severe forecast.' : 'Preventive maintenance can reduce weather-related wear.'}`, asset.districtId, asset.id);
    }
    asset.risk = asset.outageUntil > time || (asset.observedCondition ?? asset.condition + 10) < 40 ? 'high' : (asset.observedCondition ?? asset.condition + 10) < 75 ? 'watch' : 'low';
    if (asset.condition < 18 && asset.outageUntil <= time) {
      asset.outageUntil = time + 3; addMetric('trust', -.5);
      event(city, 'asset', `${asset.name}: service interrupted`, 'Deterioration caused an outage. Access and service capacity are reduced until emergency recovery or funded repair.', asset.districtId, asset.id);
      remember(city, asset.districtId, `${asset.name} failed after deteriorating.`, 'hurt', asset.id);
    }
  }
  const workRate = l.weather.today === 'storm' ? .65 : l.weather.today === 'rain' ? .9 : 1;
  l.works.forEach((work, index) => {
    if (index < l.construction.crews) work.progress = clamp(work.progress + Math.min(1, time - work.startedDay) * workRate / work.duration, work.progress, 1);
    work.dueDay = Math.ceil(time + (1 - work.progress) * work.duration / (index < l.construction.crews ? workRate : .5));
    if (work.kind === 'repair') l.assets.find(a => a.id === work.targetId)!.repairDue = work.dueDay;
  });
  for (const work of l.works.filter(w => w.progress >= 1 - 1e-8)) {
    const district = l.districts.find(d => d.id === work.districtId)!;
    if (work.kind === 'repair') {
      const asset = l.assets.find(a => a.id === work.targetId)!;
      asset.condition = 96; asset.observedCondition = 96; asset.lastInspectedDay = time; asset.outageUntil = 0; asset.repairDue = null; asset.risk = 'low';
      event(city, 'asset', `${asset.name}: repair complete`, 'Full service restored. The crew is available for another project.', asset.districtId, asset.id);
    } else {
      const motion = l.council.motions.find(m => m.id === work.targetId)!;
      if (work.kind === 'housing') { district.homes += work.affordable ? 40 : 60; district.rent *= work.affordable ? .93 : .97; if (work.affordable) district.protectionsUntil = Math.max(district.protectionsUntil, time + 12); }
      else { district.jobs += 90; district.rent *= 1.045; }
      if (motion.amendment === 'local_jobs') district.jobs += 20;
      if (motion.amendment === 'green') { const asset = l.assets.find(a => a.districtId === district.id && a.kind === 'drainage'); if (asset) asset.maintenanceUntil = time + 12; addMetric('environment', 1); }
      event(city, 'housing', `${motion.title}: open`, `${work.kind === 'housing' ? `${work.affordable ? 40 : 60} homes delivered` : '90 jobs added'}; ${motion.amendment.replace('_', ' ')} amendment implemented.`, district.id, motion.id);
      remember(city, district.id, `${motion.title} opened with the agreed conditions.`, 'helped', motion.id);
    }
  }
  l.works = l.works.filter(w => w.progress < 1 - 1e-8);
  refreshLivingCity(city);
  for (const d of l.districts) {
    for (const s of d.services) {
      s.backlog = Math.round(clamp(s.backlog + s.demand - s.capacity, 0, s.demand * 12));
      const penalty = Math.max(0, .92 - s.coverage) * .8;
      addMetric(s.kind === 'care' ? 'health' : s.kind === 'learning' ? 'education' : 'environment', -penalty / 4);
    }
    const housingPressure = Math.max(0, d.population / Math.max(1, d.homes * 2.7) - 1);
    const protectedRent = d.protectionsUntil > time;
    d.rent = Math.round(clamp(d.rent * (1 + (protectedRent ? .001 : .002 + housingPressure * .02) + Math.max(0, d.jobs / d.population - .55) * .003), 300, 6000));
    if (!protectedRent && (d.rentBurden > .38 || housingPressure > .14)) {
      const displaced = Math.max(1, Math.round(housingPressure * 6 + Math.max(0, d.rentBurden - .38) * 15));
      d.displaced += displaced;
      city.districts.find(x => x.id === d.id)!.happiness = clamp(city.districts.find(x => x.id === d.id)!.happiness - .4);
      if (city.day % 3 === 0) event(city, 'housing', `${d.name}: renters displaced`, `${displaced} households lost local access to affordable housing. Housing supply and tenant protections can prevent further displacement.`, d.id);
    }
    addMetric('economy', ((Math.min(1, d.jobs / Math.max(1, d.population * .45)) - .8) * .13 - d.congestion * .025) / 4);
  }
  addMetric('mobility', -(l.traffic.congestion - .2) * .22);
  addMetric('economy', l.traffic.policy === 'freight' ? .055 : l.traffic.policy === 'transit' ? -.025 : 0);
  for (const citizen of l.citizens) {
    const district = l.districts.find(d => d.id === citizen.districtId)!;
    const met = citizen.need === 'housing' ? district.protectionsUntil > time || district.rentBurden <= .38 : citizen.need === 'access' ? district.commuteMinutes <= 25 : district.services.find(s => s.kind === citizen.need)!.coverage >= .9;
    citizen.unmetDays = met ? 0 : citizen.unmetDays + 1;
    citizen.satisfaction = clamp(citizen.satisfaction + (met ? .4 : -.8));
    if (citizen.need === 'housing' && citizen.unmetDays >= 4 && !citizen.displaced) { citizen.displaced = true; remember(city, citizen.districtId, `${citizen.name} had to leave an unaffordable home.`, 'hurt', citizen.id); }
    if (citizen.displaced && met && district.protectionsUntil > time) { citizen.displaced = false; citizen.memories.unshift({ day: time, text: 'Tenant assistance helped me return to a secure home.', outcome: 'helped' }); citizen.memories.length = Math.min(citizen.memories.length, 8); }
    if (citizen.unmetDays === 3) event(city, 'resident', `${citizen.name} is still waiting`, citizen.story, citizen.districtId, citizen.id);
  }
  refreshLivingCity(city);
  let authorizedReserve = city.treasury;
  for (const promise of l.promises.filter(activePromise)) {
    const fulfilled = completion(city, promise);
    if (fulfilled) {
      promise.status = 'kept'; addMetric('trust', .4); remember(city, promise.districtId, `${promise.title}: promise kept.`, 'helped', promise.id);
      event(city, 'promise', 'A promise kept', promise.title, promise.districtId, promise.id);
    } else if (promise.dueDay <= time) {
      promise.status = 'broken'; addMetric('trust', -1.5); remember(city, promise.districtId, `${promise.title}: deadline missed.`, 'hurt', promise.id);
      event(city, 'promise', 'A promise missed its deadline', `${promise.title}. The unfinished obligation remains visible in the journal.`, promise.districtId, promise.id);
    } else {
      if (promise.kind === 'project' && promise.automatic && !city.projects.some(p => p.definitionId === promise.targetId)) {
        const project = projectById[promise.targetId];
        const futureUpkeep = city.projects.filter(p => p.status === 'building').reduce((sum, p) => sum + projectById[p.definitionId].upkeep, 0);
        const reserve = 1500 + Math.max(0, city.expenses + futureUpkeep + project.upkeep - city.revenue) * 3 + project.upkeep * 3;
        if (authorizedReserve - project.cost >= reserve) { commissions.push({ promiseId: promise.id, projectId: promise.targetId, actor: promise.actor }); authorizedReserve -= project.cost; }
      }
      if (promise.nextReviewDay <= time && !l.events.some(e => e.sourceId === promise.id && e.title === 'Commitment needs review' && Math.floor(e.day) === Math.floor(time))) event(city, 'promise', 'Commitment needs review', `${promise.title}: ${promise.progress}`, promise.districtId, promise.id);
    }
  }
  refreshLivingCity(city);
  return { effects: { metrics }, commissions };
}

export function getLivingPublicSnapshot(city: CityState) {
  refreshLivingCity(city);
  return { ...structuredClone(city.living), assets: city.living.assets.map(({ condition: _condition, ...asset }) => ({ ...asset, observationAge: asset.lastInspectedDay === null ? null : rounded(now(city) - asset.lastInspectedDay), conditionKnowledge: asset.observedCondition === null ? 'Not inspected. Risk is an engineering warning, not an exact measurement.' : 'Last inspection reading; current condition may have changed.' })) };
}

/** Historical action identifiers remain data, even after their live button disappears. */
export function isKnownCivicActionId(id: string, city: CityState): boolean {
  const p = id.split(':');
  if (p[0] === 'staff') return p.length === 4 && DISTRICTS.includes(p[1] as DistrictId) && SERVICES.includes(p[2] as ServiceKind) && ['add', 'remove'].includes(p[3]);
  if (p[0] === 'shuttle') return p.length === 3 && DISTRICTS.includes(p[1] as DistrictId) && ['start', 'stop'].includes(p[2]);
  if (p[0] === 'pledge_service') return p.length === 3 && DISTRICTS.includes(p[1] as DistrictId) && SERVICES.includes(p[2] as ServiceKind);
  if (['inspect', 'maintain', 'repair'].includes(p[0])) return p.length === 2 && ASSETS.some(a => a.id === p[1]);
  if (p[0] === 'traffic') return p.length === 2 && ['balanced', 'transit', 'freight'].includes(p[1]);
  if (p[0] === 'contractor') return p.length === 2 && ['economy', 'standard', 'quality'].includes(p[1]);
  if (p[0] === 'commit_project') return p.length === 2 && Object.hasOwn(projectById, p[1]);
  if (p[0] === 'crew') return id === 'crew:hire' || (p.length === 3 && p[1] === 'prioritize' && Object.hasOwn(projectById, p[2]));
  if (p[0] === 'motion') return p.length === 3 && DISTRICTS.includes(p[1] as DistrictId) && ['housing', 'jobs', 'protection'].includes(p[2]);
  if (p[0] === 'promise') return p.length === 3 && ['review', 'renegotiate'].includes(p[1]) && /^promise-\d+$/.test(p[2]) && Number(p[2].split('-')[1]) <= city.living.sequence;
  if (['vote', 'withdraw', 'amend'].includes(p[0])) return (p[0] === 'amend' ? p.length === 3 && ['none', 'affordable', 'green', 'local_jobs'].includes(p[2]) : p.length === 2) && city.living.council.motions.some(m => m.id === p[1]);
  return false;
}

/** Reconstruct fixed historical charges after the short decision journal rotates. */
export function historicalCivicEffects(id: string, city: CityState): Effects | undefined {
  if (!isKnownCivicActionId(id, city)) return undefined;
  const p = id.split(':');
  const cost = p[0] === 'inspect' ? 120 : p[0] === 'repair' ? 1600 : p[0] === 'maintain' ? 450
    : p[0] === 'staff' && p[3] === 'add' ? 180 : p[0] === 'shuttle' && p[2] === 'start' ? 300
    : p[0] === 'traffic' ? 100 : id === 'crew:hire' ? 350
    : p[0] === 'vote' ? (() => { const m = city.living.council.motions.find(m => m.id === p[1])!; return m.status === 'passed' ? m.cost : 0; })() : 0;
  return { ...(cost ? { treasury: -cost } : {}), ...(p[0] === 'promise' && p[1] === 'renegotiate' ? { metrics: { trust: -1 } } : {}) };
}

// Project untrusted saves into fixed authored identities. Derived routes, costs,
// capacity, forecasts, votes, and arbitrary object properties are never imported.
export function restoreLivingCity(value: unknown, city: CityState): LivingCityState {
  const baseline = createLivingCity(city);
  if (value === undefined) {
    for (const project of city.projects) baseline.construction.projectQuality[project.definitionId] = 'standard';
    baseline.lastDay = city.day - 1;
    return baseline;
  }
  const bad = (): never => { throw new Error('The saved living city contains an invalid value or reference.'); };
  const obj = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v)) ? v as Record<string, unknown> : bad();
  const num = (v: unknown, min: number, max: number, integer = false) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v)) ? v : bad();
  const str = (v: unknown, max = 1600) => typeof v === 'string' && v.length <= max ? v.replace(/sk-(?:or-v1-)?[a-zA-Z0-9_-]{16,}/g, '[redacted API key]') : bad();
  const bool = (v: unknown) => typeof v === 'boolean' ? v : bad();
  const en = <T extends string>(v: unknown, options: readonly T[]): T => typeof v === 'string' && options.includes(v as T) ? v as T : bad();
  const array = (v: unknown, max: number) => Array.isArray(v) && v.length <= max ? v : bad();
  const unique = (v: { id: string }[]) => { if (new Set(v.map(x => x.id)).size !== v.length) bad(); };
  const nullableDay = (v: unknown) => v === null ? null : Math.ceil(num(v, 0, now(city) + 90));
  const root = obj(value), time = now(city), l = baseline;
  if (root.version !== 1) bad();
  const weather = obj(root.weather);
  en(weather.today, ['clear', 'rain', 'storm', 'heat']);
  const forecasts = array(weather.forecast, 3).map(obj);
  if (forecasts.length !== 3) bad();
  for (const forecast of forecasts) { num(forecast.day, Math.max(1, city.day - 1), city.day + 3, true); en(forecast.kind, ['clear', 'rain', 'storm', 'heat']); str(forecast.warning, 300); }
  l.sequence = num(root.sequence, 0, 10000000, true);
  l.lastDay = num(root.lastDay, 0, city.day, true);
  const identity = (v: unknown, prefix: string) => { const id = str(v, 80); if (!new RegExp(`^${prefix}-[1-9]\\d*$`).test(id) || Number(id.split('-')[1]) > l.sequence) bad(); return id; };
  const districtValues = array(root.districts, 4).map(obj);
  if (districtValues.length !== 4 || new Set(districtValues.map(d => d.id)).size !== 4) bad();
  for (const d of l.districts) {
    const input = districtValues.find(v => v.id === d.id); if (!input) bad();
    const saved = input!;
    d.homes = num(saved.homes, 1, 100000, true); d.jobs = num(saved.jobs, 0, 100000, true);
    d.rent = num(saved.rent, 0, 6000); d.displaced = num(saved.displaced, 0, 1000000, true);
    d.protectionsUntil = num(saved.protectionsUntil, 0, time + 30); d.shuttle = bool(saved.shuttle); d.landUsed = num(saved.landUsed, 0, 2, true);
    const services = array(saved.services, 3).map(obj);
    if (services.length !== 3 || new Set(services.map(s => s.kind)).size !== 3) bad();
    for (const service of d.services) {
      const inputService = services.find(s => s.kind === service.kind); if (!inputService) bad();
      service.staff = num(inputService!.staff, 0, 2, true); service.backlog = num(inputService!.backlog, 0, 1000000);
    }
  }
  if (l.districts.reduce((sum, d) => sum + d.services.reduce((n, s) => n + s.staff, 0), 0) > l.staffPool) bad();
  const citizenValues = array(root.citizens, RESIDENTS.length).map(obj);
  if (citizenValues.length !== RESIDENTS.length || new Set(citizenValues.map(c => c.id)).size !== RESIDENTS.length) bad();
  for (const citizen of l.citizens) {
    const saved = citizenValues.find(c => c.id === citizen.id); if (!saved || saved.districtId !== citizen.districtId || saved.need !== citizen.need) bad();
    citizen.satisfaction = num(saved!.satisfaction, 0, 100); citizen.unmetDays = num(saved!.unmetDays, 0, 100000, true); citizen.displaced = bool(saved!.displaced);
    citizen.memories = array(saved!.memories, 8).map(v => { const m = obj(v); return { day: num(m.day, 1, time), text: str(m.text), outcome: en(m.outcome, ['helped', 'hurt', 'promise', 'observed']), ...(m.sourceId === undefined ? {} : { sourceId: str(m.sourceId, 150) }) }; });
  }
  const assets = array(root.assets, ASSETS.length).map(obj);
  if (assets.length !== ASSETS.length || new Set(assets.map(a => a.id)).size !== ASSETS.length) bad();
  for (const asset of l.assets) {
    const saved = assets.find(a => a.id === asset.id); if (!saved || saved.kind !== asset.kind || saved.districtId !== asset.districtId) bad();
    asset.condition = num(saved!.condition, 0, 100); asset.lastInspectedDay = saved!.lastInspectedDay === null ? null : num(saved!.lastInspectedDay, 1, time);
    asset.observedCondition = saved!.observedCondition === null ? null : num(saved!.observedCondition, 0, 100);
    if ((asset.lastInspectedDay === null) !== (asset.observedCondition === null)) bad();
    asset.outageUntil = num(saved!.outageUntil, 0, time + 4); asset.maintenanceUntil = num(saved!.maintenanceUntil, 0, time + 15);
    asset.inspectionDue = nullableDay(saved!.inspectionDue); asset.repairDue = nullableDay(saved!.repairDue);
    asset.risk = en(saved!.risk, ['low', 'watch', 'high']);
  }
  const construction = obj(root.construction);
  l.construction.extraCrewUntil = num(construction.extraCrewUntil, 0, time + 8);
  l.construction.contractor = en(construction.contractor, ['economy', 'standard', 'quality']);
  l.construction.priorityProjectId = construction.priorityProjectId === null ? null : str(construction.priorityProjectId, 100);
  if (l.construction.priorityProjectId && !city.projects.some(p => p.definitionId === l.construction.priorityProjectId)) bad();
  const quality = obj(construction.projectQuality ?? {});
  for (const [key, value] of Object.entries(quality)) { if (!city.projects.some(p => p.definitionId === key)) bad(); l.construction.projectQuality[key] = en(value, ['economy', 'standard', 'quality']); }
  for (const project of city.projects) l.construction.projectQuality[project.definitionId] ??= 'standard';
  l.traffic.policy = en(obj(root.traffic).policy, ['balanced', 'transit', 'freight']);
  const council = obj(root.council);
  l.council.motions = array(council.motions, 30).map(v => {
    const m = obj(v), kind = en(m.kind, ['housing', 'jobs', 'protection']), amendment = en(m.amendment, ['none', 'affordable', 'green', 'local_jobs']);
    const motion: CouncilMotion = { id: identity(m.id, 'motion'), title: str(m.title, 200), districtId: en(m.districtId, DISTRICTS), kind, amendment, status: en(m.status, ['draft', 'passed', 'rejected']), createdDay: num(m.createdDay, 1, time), cost: motionCost(kind, amendment), actor: en(m.actor, ['you', 'local', 'jev']), votes: [] };
    if (num(m.cost, 0, 10000) !== motion.cost || (kind === 'protection' && amendment !== 'none')) bad();
    if (m.resolvedDay !== undefined) motion.resolvedDay = num(m.resolvedDay, motion.createdDay, time);
    if ((motion.status === 'draft') !== (motion.resolvedDay === undefined)) bad();
    const votes = array(m.votes, 5).map(obj);
    if (votes.length !== 5 || new Set(votes.map(x => x.memberId)).size !== 5) bad();
    motion.votes = l.council.members.map(member => { const vote = votes.find(x => x.memberId === member.id); if (!vote) bad(); return { memberId: member.id, name: member.name, supports: bool(vote!.supports), reason: str(vote!.reason, 300) }; });
    if (motion.status === 'passed' && motion.votes.filter(v => v.supports).length < 3) bad();
    return motion;
  });
  unique(l.council.motions);
  for (const d of l.districts) if (d.landUsed !== l.council.motions.filter(m => m.status === 'passed' && m.kind !== 'protection' && m.districtId === d.id).length) bad();
  l.works = array(root.works, 20).map(v => {
    const w = obj(v), kind = en(w.kind, ['repair', 'housing', 'jobs']);
    const work = { id: identity(w.id, 'work'), kind, targetId: str(w.targetId, 100), districtId: en(w.districtId, DISTRICTS), startedDay: num(w.startedDay, 1, time), dueDay: Math.ceil(num(w.dueDay, 1, time + 90)), progress: num(w.progress, 0, 1), duration: num(w.duration, 1, 8), affordable: bool(w.affordable), actor: en(w.actor, ['you', 'local', 'jev']) };
    if (work.progress >= 1) bad();
    if (kind === 'repair') { if (!l.assets.some(a => a.id === work.targetId && a.districtId === work.districtId && a.repairDue !== null) || work.duration !== 3 || work.affordable) bad(); }
    else { const motion = l.council.motions.find(m => m.id === work.targetId && m.status === 'passed'); if (!motion || motion.kind !== kind || motion.districtId !== work.districtId || work.affordable !== (motion.amendment === 'affordable') || work.duration !== (kind === 'housing' ? 4 : 3) + Number(motion.amendment === 'green')) bad(); }
    return work;
  });
  unique(l.works); if (new Set(l.works.map(w => w.targetId)).size !== l.works.length) bad();
  for (const asset of l.assets) if ((asset.repairDue !== null) !== l.works.some(w => w.kind === 'repair' && w.targetId === asset.id)) bad();
  l.promises = array(root.promises, 100).map(v => {
    const p = obj(v);
    const promise: CivicPromise = { id: identity(p.id, 'promise'), title: str(p.title, 200), kind: en(p.kind, ['project', 'service', 'asset', 'housing', 'review']), targetId: str(p.targetId, 150), createdDay: num(p.createdDay, 1, time), dueDay: num(p.dueDay, 1, time + 90), nextReviewDay: num(p.nextReviewDay, 1, time + 90), status: en(p.status, ['active', 'kept', 'broken', 'renegotiated']), condition: str(p.condition), progress: str(p.progress), actor: en(p.actor, ['you', 'local', 'jev']), automatic: bool(p.automatic), renegotiations: num(p.renegotiations, 0, 1, true) };
    if (p.districtId !== undefined) promise.districtId = en(p.districtId, DISTRICTS);
    if (p.sourceId !== undefined) promise.sourceId = str(p.sourceId, 150);
    if (promise.automatic && promise.kind !== 'project') bad();
    if (promise.kind === 'project' && (!Object.hasOwn(projectById, promise.targetId) || promise.districtId !== projectById[promise.targetId].district)) bad();
    if (promise.kind === 'asset' && !l.assets.some(a => a.id === promise.targetId && a.districtId === promise.districtId)) bad();
    if (promise.kind === 'service' && !l.districts.some(d => d.id === promise.districtId && SERVICES.some(s => promise.targetId === `${d.id}:${s}`))) bad();
    if (promise.kind === 'housing' && !l.council.motions.some(m => m.id === promise.targetId && m.status === 'passed' && m.districtId === promise.districtId)) bad();
    if (promise.kind === 'review' && (!/^petition-\d+-\d+$/.test(promise.targetId) || promise.sourceId !== promise.targetId)) bad();
    return promise;
  });
  unique(l.promises);
  const active = l.promises.filter(activePromise); if (new Set(active.map(p => `${p.kind}:${p.targetId}`)).size !== active.length) bad();
  l.events = array(root.events, 80).map(v => { const e = obj(v); return { id: num(e.id, 1, l.sequence, true), day: num(e.day, 1, time), title: str(e.title, 300), text: str(e.text, 3000), kind: en(e.kind, ['service', 'resident', 'promise', 'asset', 'construction', 'traffic', 'housing', 'council']), ...(e.districtId === undefined ? {} : { districtId: en(e.districtId, DISTRICTS) }), ...(e.sourceId === undefined ? {} : { sourceId: str(e.sourceId, 150) }) }; });
  if (new Set(l.events.map(e => e.id)).size !== l.events.length) bad();
  return l;
}
