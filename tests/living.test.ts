import test from 'node:test';
import assert from 'node:assert/strict';
import { createCitySimulation, DAY_SECONDS, PROJECTS } from '../src/mayor/engine';
import { advanceLivingCity, getLivingPublicSnapshot } from '../src/mayor/livingCity';

const actor = { actor: 'you' as const };
function fresh(seed = 2026) {
  const sim = createCitySimulation();
  assert.equal(sim.startCity('manual', 'balanced', seed).ok, true);
  return sim;
}
type Simulation = ReturnType<typeof fresh>;
function finishLetters(sim: Simulation) {
  for (const request of sim.getOpenRequests()) {
    const choices = sim.getAvailableOptions(request.id);
    const option = choices.find(o => (o.effects.treasury ?? 0) >= 0) ?? choices[0];
    if (option) assert.equal(sim.resolveRequest(request.id, option.id, actor).ok, true);
  }
}
function days(sim: Simulation, count: number) {
  for (let i = 0; i < count * 4 && sim.city.phase === 'playing'; i++) {
    finishLetters(sim);
    sim.tickCity(DAY_SECONDS / 4);
  }
}
function stableSave(sim: Simulation) {
  const save = structuredClone(sim.exportCityState());
  delete (save.city as any).generation;
  delete (save.city as any).revision;
  return save;
}

test('new cities have operational services, distinct residents, assets, and a public forecast', () => {
  const sim = fresh();
  assert.equal(sim.city.living.districts.length, 4);
  assert.ok(sim.city.living.citizens.length >= 8);
  assert.equal(new Set(sim.city.living.citizens.map(c => c.id)).size, sim.city.living.citizens.length);
  assert.ok(sim.city.living.assets.length >= 4);
  assert.equal(sim.city.living.weather.forecast.length, 3);
  for (const district of sim.city.living.districts) {
    assert.ok(district.services.some(s => s.kind === 'care'));
    assert.ok(district.services.some(s => s.kind === 'learning'));
    for (const service of district.services) {
      assert.ok(service.demand > 0);
      assert.ok(service.served <= service.demand);
      assert.ok(service.coverage >= 0 && service.coverage <= 100);
      assert.ok(service.backlog >= 0);
    }
  }
});

test('unavailable, unknown, and paused civic actions cannot mutate a city', () => {
  const sim = fresh();
  const original = JSON.stringify(sim.exportCityState());
  assert.equal(sim.performCivicAction('invent-a-free-hospital', actor).ok, false);
  assert.equal(JSON.stringify(sim.exportCityState()), original);
  const available = sim.getCivicActions().find(a => a.available && a.cost > 0)!;
  assert.ok(available);
  sim.pauseCity(true);
  const paused = JSON.stringify(sim.exportCityState());
  assert.equal(sim.performCivicAction(available.id, actor).ok, false);
  assert.equal(JSON.stringify(sim.exportCityState()), paused);
  sim.pauseCity(false);
  sim.city.treasury = 0;
  const broke = JSON.stringify(sim.exportCityState());
  assert.equal(sim.performCivicAction(available.id, actor).ok, false);
  assert.equal(JSON.stringify(sim.exportCityState()), broke);
});

test('public evidence excludes uninspected true condition', () => {
  const sim = fresh();
  const publicState = getLivingPublicSnapshot(sim.city);
  const walk = (value: any) => {
    if (!value || typeof value !== 'object') return;
    assert.equal(Object.hasOwn(value, 'condition') && Object.hasOwn(value, 'observedCondition'), false,
      'An asset must not expose actual and observed condition to the mayor together');
    for (const child of Object.values(value)) walk(child);
  };
  walk(publicState);
});

test('citizen replies can cite funded repairs even when civic construction and urgent letters are clear', () => {
  const sim = fresh();
  finishLetters(sim);
  for (const project of sim.city.projects) { project.status = 'complete'; project.progress = 1; }
  assert.equal(sim.performCivicAction('repair:riverside_bridge', actor).ok, true);
  const petition = sim.submitPetition('Please prioritize another project later.', 'city');
  assert.equal(petition.ok, true);
  const deferred = sim.getPetitionActions(petition.petitionId!).find(action => action.id === 'defer:priority');
  assert.ok(deferred?.available);
  assert.match(deferred.description, /Repair Riverside crossing/);
});

test('seeded city consequences and decisions replay deterministically', () => {
  const a = fresh(9182), b = fresh(9182);
  for (let day = 0; day < 12; day++) {
    const chosen = a.getCivicActions().filter(x => x.available && x.cost > 0 && x.cost < 900)
      .sort((x, y) => y.priority - x.priority)[0];
    if (chosen) {
      assert.equal(a.performCivicAction(chosen.id, actor).ok, true);
      assert.equal(b.performCivicAction(chosen.id, actor).ok, true);
    }
    days(a, 1); days(b, 1);
  }
  assert.deepEqual(stableSave(a), stableSave(b));
  assert.ok(a.city.living.events.length > 0);
  assert.ok(a.city.living.citizens.some(c => c.memories.length > 0));
});

test('living state round-trips and old saves migrate without changing the treasury or projects', () => {
  const sim = fresh();
  days(sim, 3);
  const saved = sim.exportCityState();
  const restored = createCitySimulation();
  const result = restored.restoreCityState(saved);
  assert.equal(result.ok, true, result.error);
  assert.equal(restored.city.paused, true);
  assert.deepEqual(restored.city.living, sim.city.living);
  assert.equal(restored.city.treasury, sim.city.treasury);
  const legacy = structuredClone(saved);
  delete (legacy.city as any).living;
  const migrated = createCitySimulation();
  const migration = migrated.restoreCityState(legacy);
  assert.equal(migration.ok, true, migration.error);
  assert.equal(migrated.city.treasury, sim.city.treasury);
  assert.deepEqual(migrated.city.projects, sim.city.projects);
  assert.equal(migrated.city.living.districts.length, 4);
});

test('invalid living saves are rejected atomically', () => {
  const sim = fresh();
  for (const mutate of [
    (living: any) => { living.assets[0].condition = Number.NaN; },
    (living: any) => { living.assets[0].districtId = 'imaginary'; },
    (living: any) => { living.citizens[0].satisfaction = -1; },
    (living: any) => { living.districts[0].services[0].staff = -20; },
    (living: any) => { living.weather.today = 'alien-invasion'; },
  ]) {
    const bad = structuredClone(sim.exportCityState());
    mutate(bad.city.living);
    const before = JSON.stringify(sim.exportCityState());
    assert.equal(sim.restoreCityState(bad).ok, false);
    assert.equal(JSON.stringify(sim.exportCityState()), before);
  }
});

test('construction keeps completed work while finite crews affect its schedule', () => {
  const sim = fresh();
  sim.city.treasury = 100000;
  for (const project of PROJECTS.filter(p => !sim.city.projects.some(x => x.definitionId === p.id)).slice(0, 3)) {
    assert.equal(sim.buildProject(project.id, actor).ok, true);
  }
  const oldProgress = new Map(sim.city.projects.map(p => [p.definitionId, sim.getConstructionProgress(p)]));
  days(sim, 1);
  const assignments = sim.city.living.construction.assignments;
  assert.ok(assignments.filter(a => a.crew).length <= sim.city.living.construction.crews + 1);
  assert.ok(assignments.some(a => !a.crew || a.workRate < 1));
  for (const project of sim.city.projects) assert.ok(sim.getConstructionProgress(project) >= oldProgress.get(project.definitionId)!);
});

test('staff and shuttle decisions change effective capacity, access, and recurring costs', () => {
  const sim = fresh();
  const district = sim.city.living.districts.find(d => d.id === 'hillview')!;
  const school = district.services.find(s => s.kind === 'learning')!;
  const before = {capacity:school.capacity, expenses:sim.estimateBudget().expenses, treasury:sim.city.treasury};
  assert.equal(sim.performCivicAction('staff:hillview:learning:add', actor).ok, true);
  assert.ok(school.capacity > before.capacity);
  assert.equal(sim.city.treasury, before.treasury - 180);
  assert.equal(sim.estimateBudget().expenses, before.expenses + 45);
  const beforeShuttle = {capacity:school.capacity, commute:district.commuteMinutes, access:district.access};
  assert.equal(sim.performCivicAction('shuttle:hillview:start', actor).ok, true);
  assert.ok(district.access >= beforeShuttle.access);
  assert.ok(school.capacity >= beforeShuttle.capacity);
  assert.ok(district.commuteMinutes < beforeShuttle.commute);
  assert.equal(sim.estimateBudget().expenses, before.expenses + 110);
  assert.equal(sim.performCivicAction('staff:hillview:learning:remove', actor).ok, true);
  assert.equal(sim.estimateBudget().expenses, before.expenses + 65);
});

test('staff allocation respects the shared pool', () => {
  const sim = fresh();
  for (let i = 0; i < sim.city.living.staffPool; i++) {
    const action = sim.getCivicActions().find(a => a.id.startsWith('staff:') && a.id.endsWith(':add') && a.available)!;
    assert.ok(action);
    assert.equal(sim.performCivicAction(action.id, actor).ok, true);
  }
  assert.equal(sim.getCivicActions().some(a => a.id.startsWith('staff:') && a.id.endsWith(':add') && a.available), false);
});

test('inspection reveals evidence after time passes; preventive maintenance reduces wear', () => {
  const protectedCity = fresh(829), unprotectedCity = fresh(829);
  const asset = protectedCity.city.living.assets[0];
  assert.equal(asset.observedCondition, null);
  assert.equal(protectedCity.performCivicAction(`inspect:${asset.id}`, actor).ok, true);
  assert.equal(asset.observedCondition, null, 'Paying does not reveal evidence before inspection returns');
  assert.equal(protectedCity.performCivicAction(`inspect:${asset.id}`, actor).ok, false, 'No duplicate inspection charge');
  assert.equal(protectedCity.performCivicAction(`maintain:${asset.id}`, actor).ok, true);
  days(protectedCity, 2); days(unprotectedCity, 2);
  assert.notEqual(asset.observedCondition, null);
  assert.ok(asset.condition > unprotectedCity.city.living.assets[0].condition);
  assert.ok(protectedCity.city.living.events.some(e => e.sourceId === asset.id && e.title.includes('inspection')));
});

test('a bridge outage reduces access and a completed repair restores it', () => {
  const sim = fresh();
  const asset = sim.city.living.assets.find(a => a.kind === 'bridge')!;
  const district = sim.city.living.districts.find(d => d.id === asset.districtId)!;
  const initialAccess = district.access;
  asset.condition = 5;
  days(sim, 1);
  assert.ok(sim.city.living.traffic.closures.includes(asset.id));
  assert.ok(district.access < initialAccess);
  assert.equal(sim.performCivicAction(`repair:${asset.id}`, actor).ok, true);
  days(sim, 6);
  assert.ok(asset.condition > 70);
  assert.ok(!sim.city.living.traffic.closures.includes(asset.id));
  assert.ok(!sim.city.living.works.some(w => w.targetId === asset.id));
  assert.ok(sim.city.living.promises.some(p => p.targetId === asset.id && p.status === 'kept'));
});

test('conditional project authority waits for reserves and commissions exactly once', () => {
  const sim = fresh();
  const project = PROJECTS.find(p => !sim.city.projects.some(x => x.definitionId === p.id))!;
  sim.city.treasury = 0;
  assert.equal(sim.performCivicAction(`commit_project:${project.id}`, actor).ok, true);
  assert.equal(sim.city.treasury, 0);
  days(sim, 1);
  assert.equal(sim.city.projects.some(p => p.definitionId === project.id), false);
  sim.city.treasury = 30000;
  days(sim, 1);
  assert.equal(sim.city.projects.filter(p => p.definitionId === project.id).length, 1);
  days(sim, 3);
  assert.equal(sim.city.projects.filter(p => p.definitionId === project.id).length, 1);
  assert.equal(sim.getCivicActions().find(a => a.id === `commit_project:${project.id}`)?.available, false);
});

test('promise renegotiation is accountable and cannot repeatedly extend the same deadline', () => {
  const sim = fresh();
  assert.equal(sim.performCivicAction('pledge_service:hillview:learning', actor).ok, true);
  const promise = sim.city.living.promises.find(p => p.targetId === 'hillview:learning')!;
  const before = {due:promise.dueDay, trust:sim.city.metrics.trust};
  assert.equal(sim.performCivicAction(`promise:renegotiate:${promise.id}`, actor).ok, true);
  assert.equal(promise.dueDay, before.due + 4);
  assert.equal(sim.city.metrics.trust, before.trust - 1);
  assert.equal(sim.performCivicAction(`promise:renegotiate:${promise.id}`, actor).ok, false);
  assert.ok(sim.city.living.citizens.some(c => c.memories.some(m => m.sourceId === promise.id)));
});

test('council amendments change votes and a passing vote spends exactly once', () => {
  const sim = fresh();
  assert.equal(sim.performCivicAction('motion:hillview:housing', actor).ok, true);
  const motion = sim.city.living.council.motions.at(-1)!;
  const initialVotes = motion.votes.map(v => v.supports);
  assert.equal(sim.performCivicAction(`amend:${motion.id}:affordable`, actor).ok, true);
  assert.notDeepEqual(motion.votes.map(v => v.supports), initialVotes);
  assert.ok(motion.votes.filter(v => v.supports).length >= 3);
  const before = sim.city.treasury;
  assert.equal(sim.performCivicAction(`vote:${motion.id}`, actor).ok, true);
  assert.equal(motion.status, 'passed');
  assert.equal(sim.city.treasury, before - motion.cost);
  const after = sim.city.treasury;
  assert.equal(sim.performCivicAction(`vote:${motion.id}`, actor).ok, false);
  assert.equal(sim.city.treasury, after);
  assert.ok(sim.city.living.works.some(w => w.targetId === motion.id && w.affordable));
});

test('a rejected council vote keeps its published tally and spends no money', () => {
  const sim = fresh();
  sim.city.treasury = 3800;
  assert.equal(sim.performCivicAction('motion:market:jobs', actor).ok, true);
  const motion = sim.city.living.council.motions.at(-1)!;
  const published = structuredClone(motion.votes);
  assert.equal(published.filter(v => v.supports).length, 2);
  assert.equal(sim.performCivicAction(`vote:${motion.id}`, actor).ok, true);
  assert.equal(motion.status, 'rejected');
  assert.deepEqual(motion.votes, published);
  assert.equal(sim.city.treasury, 3800);
  assert.ok(!sim.city.living.works.some(w => w.targetId === motion.id));
});

test('work complete at its midnight deadline satisfies the opening promise', () => {
  const sim = fresh();
  const definition = PROJECTS.find(p => !sim.city.projects.some(x => x.definitionId === p.id))!;
  assert.equal(sim.buildProject(definition.id, actor).ok, true);
  const project = sim.city.projects.find(p => p.definitionId === definition.id)!;
  const promise = sim.city.living.promises.find(p => p.targetId === definition.id)!;
  project.progress = 1;
  project.completesDay = 2;
  promise.dueDay = 2;
  sim.city.dayProgress = 1;
  advanceLivingCity(sim.city);
  assert.equal(promise.status, 'kept');
});

test('multi-term continuation preserves residents, commitments, and finite histories', () => {
  const sim = fresh();
  const residentIds = sim.city.living.citizens.map(c => c.id);
  days(sim, 30);
  assert.equal(sim.city.phase, 'ended');
  assert.ok(Number.isFinite(sim.city.result!.approval));
  assert.equal(sim.continueTerm().ok, true);
  assert.equal(sim.city.term, 2);
  assert.deepEqual(sim.city.living.citizens.map(c => c.id), residentIds);
  days(sim, 8);
  assert.ok(sim.city.living.events.length <= 80);
  assert.ok(sim.city.living.citizens.every(c => c.memories.length <= 8));
  assert.ok(JSON.stringify(sim.exportCityState()).length < 1_000_000);
  const restored = createCitySimulation();
  const result = restored.restoreCityState(sim.exportCityState());
  assert.equal(result.ok, true, result.error);
});
