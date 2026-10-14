import test from 'node:test';
import assert from 'node:assert/strict';
import { createCitySimulation } from '../src/mayor/engine';
import { getCityAlerts, MAX_CITY_ALERTS } from '../src/mayor/cityAlerts';
import { projectById, requestById } from '../src/mayor/catalog';
import type { CityState } from '../src/mayor/types';

const actor = { actor: 'you' as const };
function fresh() {
  const simulation = createCitySimulation();
  simulation.startCity('manual', 'balanced', 2026);
  return simulation;
}
function freeze(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}
function quietSnapshot(): CityState {
  const state = structuredClone(fresh().city);
  state.requests = [];
  state.petitions = [];
  state.projects = [];
  state.living.promises = [];
  state.living.works = [];
  state.living.construction.assignments = [];
  state.living.council.motions = [];
  for (const asset of state.living.assets) {
    asset.risk = 'low'; asset.outageUntil = 0;
  }
  for (const district of state.living.districts) for (const service of district.services) {
    service.coverage = 1; service.capacity = service.demand;
    service.served = service.demand; service.backlog = 0;
  }
  return state;
}

test('alerts are a pure projection with stable IDs while paused and across caller mutation', () => {
  const simulation = fresh();
  const before = structuredClone(simulation.city);
  const running = getCityAlerts(simulation.city);
  assert.ok(running.length > 0);
  assert.deepEqual(simulation.city, before);
  simulation.pauseCity(true);
  const paused = structuredClone(simulation.city);
  freeze(paused);
  assert.deepEqual(getCityAlerts(paused), running);
  assert.deepEqual(getCityAlerts(paused), getCityAlerts(paused));
  assert.equal(new Set(running.map(alert => alert.id)).size, running.length);
  const located = running.find(alert => alert.position)!;
  const expected = [...located.position!];
  located.position![0] = 999;
  assert.deepEqual(getCityAlerts(paused).find(alert => alert.id === located.id)!.position, expected);
});

test('authored and site alerts link actual requests and disappear after resolution or expiry', () => {
  const simulation = fresh();
  const initial = getCityAlerts(simulation.city);
  const open = simulation.city.requests.filter(request => request.status === 'open');
  assert.ok(open.some(request => request.projectId));
  for (const request of open) {
    const alert = initial.find(alert => alert.id === `request:${request.id}`)!;
    assert.ok(alert);
    assert.equal(alert.target.kind, 'request');
    assert.equal(alert.target.id, request.id);
    assert.equal(alert.title, requestById[request.templateId].title);
    if (request.projectId) {
      assert.equal(alert.kind, 'construction');
      assert.equal(alert.districtId, projectById[request.projectId].district);
      const expected = request.projectId === 'oldtown_housing' ? [-25, -64] : [78, -32];
      assert.deepEqual(alert.position, expected, 'Site issues use their actual funded parcel.');
    }
  }
  const request = open[0];
  const option = simulation.getAvailableOptions(request.id)[0];
  assert.equal(simulation.resolveRequest(request.id, option.id, actor).ok, true);
  assert.equal(getCityAlerts(simulation.city).some(alert => alert.id === `request:${request.id}`), false);
  const expired = simulation.city.requests.find(item => item.status === 'open')!;
  expired.status = 'expired';
  assert.equal(getCityAlerts(simulation.city).some(alert => alert.id === `request:${expired.id}`), false);
});

test('pending citizen messages disappear when an actual reply settles them', () => {
  const simulation = fresh();
  const submission = simulation.submitPetition('Please consider our district later.', 'market');
  assert.equal(submission.ok, true);
  const alert = getCityAlerts(simulation.city).find(item => item.id === `petition:${submission.petitionId}`)!;
  assert.equal(alert.target.kind, 'petition');
  assert.equal(alert.target.id, submission.petitionId);
  assert.equal(alert.districtId, 'market');
  const defer = simulation.getPetitionActions(submission.petitionId!).find(action => action.id === 'defer:priority')!;
  assert.equal(simulation.resolvePetition(submission.petitionId!, defer.id, actor).ok, true);
  assert.equal(getCityAlerts(simulation.city).some(item => item.id === alert.id), false);
});

test('service alerts require meaningful unmet demand or queues, then clear on recovery', () => {
  const state = quietSnapshot();
  assert.deepEqual(getCityAlerts(state), []);
  const district = state.living.districts[0];
  const service = district.services[0];
  service.coverage = .84;
  service.served = service.demand - 10;
  const id = `service:${district.id}:${service.kind}`;
  const alert = getCityAlerts(state).find(item => item.id === id)!;
  assert.equal(alert.severity, 'warning');
  assert.deepEqual(alert.target, { kind: 'life', section: 'services', id: district.id, districtId: district.id });
  service.coverage = .5;
  assert.equal(getCityAlerts(state).find(item => item.id === id)!.severity, 'urgent');
  service.coverage = 1; service.served = service.demand;
  service.backlog = service.demand;
  assert.ok(getCityAlerts(state).some(item => item.id === id), 'A queue remains real even once today’s capacity recovers.');
  service.backlog = 0;
  assert.equal(getCityAlerts(state).some(item => item.id === id), false);
});

test('asset alerts expose public evidence, actual outages, and relevant forecast warnings only', () => {
  const state = quietSnapshot();
  const asset = state.living.assets.find(item => item.id === 'riverside_bridge')!;
  asset.risk = 'high'; asset.observedCondition = null;
  asset.condition = 3.14159;
  const first = getCityAlerts(state);
  assert.equal(first.length, 1);
  assert.match(first[0].detail, /has not been inspected/);
  asset.condition = 99;
  assert.deepEqual(getCityAlerts(state), first, 'Hidden true condition cannot change the public alert.');
  asset.outageUntil = state.day + 3;
  assert.equal(getCityAlerts(state)[0].severity, 'urgent');
  asset.outageUntil = state.day; asset.risk = 'low';
  assert.deepEqual(getCityAlerts(state), []);
  asset.risk = 'watch';
  state.living.weather.forecast = [{ day: state.day + 1, kind: 'storm', warning: 'Storm forecast.' }];
  assert.equal(getCityAlerts(state)[0].id, `asset:${asset.id}`);
  assert.match(getCityAlerts(state)[0].detail, /Storm forecast/);
  asset.maintenanceUntil = state.day + 6;
  assert.deepEqual(getCityAlerts(state), [], 'Already protected watch warnings do not ask for the same prevention again.');
});

test('due promises and draft council alerts target real cards and leave after settlement', () => {
  const simulation = fresh();
  simulation.city.treasury = 50000;
  assert.equal(simulation.performCivicAction('motion:market:jobs', actor).ok, true);
  const motion = simulation.city.living.council.motions.at(-1)!;
  const draft = getCityAlerts(simulation.city).find(alert => alert.id === `council:${motion.id}`)!;
  assert.deepEqual(draft.target, { kind: 'life', section: 'council', id: motion.id, districtId: motion.districtId });
  assert.equal(simulation.performCivicAction(`vote:${motion.id}`, actor).ok, true);
  assert.equal(getCityAlerts(simulation.city).some(alert => alert.id === draft.id), false);
  const promise = simulation.city.living.promises.find(item => item.targetId === motion.id)!;
  assert.ok(promise);
  promise.nextReviewDay = simulation.city.day;
  const alert = getCityAlerts(simulation.city).find(item => item.id === `promise:${promise.id}`)!;
  assert.equal(alert.target.id, promise.id);
  assert.equal(alert.target.section, 'promises');
  for (const status of ['kept', 'broken'] as const) {
    promise.status = status;
    assert.equal(getCityAlerts(simulation.city).some(item => item.id === alert.id), false);
  }
});

test('crew alerts only refer to active blocked work and yield to a site decision', () => {
  const state = quietSnapshot();
  const original = fresh().city;
  const project = structuredClone(original.projects[0]);
  state.projects = [project];
  const assignment = structuredClone(original.living.construction.assignments.find(item => item.projectId === project.definitionId)!);
  assignment.crew = false; assignment.workRate = 0;
  state.living.construction.assignments = [assignment];
  const id = `construction:${project.definitionId}`;
  const alert = getCityAlerts(state).find(item => item.id === id)!;
  assert.equal(alert.target.id, project.definitionId);
  assert.equal(alert.target.section, 'projects');
  state.requests = [structuredClone(original.requests.find(item => item.projectId === project.definitionId)!)];
  assert.equal(getCityAlerts(state).some(item => item.id === id), false);
  state.requests = [];
  assignment.crew = true;
  assert.deepEqual(getCityAlerts(state), []);
  assignment.crew = false; project.status = 'complete';
  assert.deepEqual(getCityAlerts(state), [], 'Stale derived assignments cannot resurrect completed work.');
});

test('alerts have a deterministic bounded order and reserve warnings clear when funded', () => {
  const state = quietSnapshot();
  state.petitions = Array.from({ length: 65 }, (_, index) => ({
    id: `petition-sample-${index}`, text: `Resident message ${index}`, district: 'city',
    createdDay: 1 + index / 100, status: 'pending',
  }));
  state.treasury = 200;
  const alerts = getCityAlerts(state);
  assert.equal(alerts.length, MAX_CITY_ALERTS);
  assert.equal(alerts[0].id, 'budget:reserve');
  assert.equal(alerts[0].severity, 'urgent');
  assert.equal(alerts[0].target.kind, 'budget');
  for (let i = 1; i < alerts.length; i++) assert.ok(alerts[i - 1].priority >= alerts[i].priority);
  state.petitions.reverse();
  assert.deepEqual(getCityAlerts(state), alerts);
  state.treasury = 1500;
  assert.equal(getCityAlerts(state).some(item => item.id === 'budget:reserve'), false);
});
