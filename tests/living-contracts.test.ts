import test from 'node:test';
import assert from 'node:assert/strict';
import { createCitySimulation, DAY_SECONDS } from '../src/mayor/engine';

const actor = { actor: 'you' as const };
function fresh() {
  const simulation = createCitySimulation();
  simulation.startCity('manual', 'balanced', 2026);
  simulation.city.treasury = 50000;
  return simulation;
}

test('a fractional-day inspection publishes the same daily deadline that resolves it', () => {
  const simulation = fresh();
  simulation.tickCity(DAY_SECONDS * 1.25);
  assert.equal(simulation.city.day + simulation.city.dayProgress, 2.25);
  assert.equal(simulation.performCivicAction('inspect:riverside_bridge', actor).ok, true);
  const asset = simulation.city.living.assets.find(asset => asset.id === 'riverside_bridge')!;
  assert.equal(asset.inspectionDue, 4);
  simulation.tickCity(DAY_SECONDS * .75);
  assert.equal(asset.observedCondition, null, 'The day-three report is less than a full day after commissioning.');
  simulation.tickCity(DAY_SECONDS * .5);
  assert.equal(asset.observedCondition, null);
  simulation.tickCity(DAY_SECONDS * .5);
  assert.equal(asset.inspectionDue, null);
  assert.equal(asset.lastInspectedDay, 4);
  assert.equal(asset.observedCondition === null, false);
});

test('fractional-day repair and development estimates use daily completion boundaries', () => {
  const simulation = fresh();
  simulation.tickCity(DAY_SECONDS * .25);
  simulation.performCivicAction('repair:riverside_bridge', actor);
  simulation.performCivicAction('motion:market:jobs', actor);
  const motion = simulation.city.living.council.motions.at(-1)!;
  simulation.performCivicAction(`vote:${motion.id}`, actor);
  for (const work of simulation.city.living.works) assert.equal(work.dueDay, 5);
  assert.equal(simulation.city.living.assets.find(asset => asset.id === 'riverside_bridge')!.repairDue, 5);
  simulation.tickCity(DAY_SECONDS * .75);
  for (const work of simulation.city.living.works) assert.equal(Number.isInteger(work.dueDay), true);
});

test('an emergency repair gets a shared crew before previously approved development', () => {
  const simulation = fresh();
  for (const district of ['oldtown', 'market']) {
    assert.equal(simulation.performCivicAction(`motion:${district}:jobs`, actor).ok, true);
    const motion = simulation.city.living.council.motions.at(-1)!;
    assert.equal(motion.votes.filter(vote => vote.supports).length >= 3, true);
    assert.equal(simulation.performCivicAction(`vote:${motion.id}`, actor).ok, true);
  }
  const developmentIds = simulation.city.living.works.map(work => work.id);
  assert.equal(simulation.performCivicAction('repair:riverside_bridge', actor).ok, true);
  assert.equal(simulation.city.living.works[0].kind, 'repair');
  simulation.tickCity(DAY_SECONDS);
  const repair = simulation.city.living.works.find(work => work.kind === 'repair')!;
  assert.ok(repair.progress > 0, 'The newly urgent repair receives actual work.');
  assert.ok(simulation.city.living.works.find(work => work.id === developmentIds[0])!.progress > 0);
  assert.equal(simulation.city.living.works.find(work => work.id === developmentIds[1])!.progress, 0,
    'The third job waits rather than borrowing a nonexistent crew.');
});

test('contract quality and its recurring price lock at commissioning', () => {
  const simulation = fresh();
  simulation.performCivicAction('contractor:economy', actor);
  assert.equal(simulation.buildProject('riverside_health_stop', actor).ok, true);
  const costBefore = simulation.estimateBudget().livingExpenses;
  assert.equal(simulation.city.living.construction.projectQuality.riverside_health_stop, 'economy');
  simulation.performCivicAction('contractor:quality', actor);
  assert.equal(simulation.city.living.construction.projectQuality.riverside_health_stop, 'economy',
    'A last-minute standards change cannot award a free permanent capacity upgrade.');
  assert.equal(simulation.estimateBudget().livingExpenses, costBefore,
    'Existing contracts retain their published running cost.');
  assert.equal(simulation.buildProject('market_reuse', actor).ok, true);
  assert.equal(simulation.city.living.construction.projectQuality.market_reuse, 'quality');
  assert.equal(simulation.estimateBudget().livingExpenses, costBefore + 35);
  simulation.performCivicAction('contractor:standard', actor);
  assert.equal(simulation.city.living.construction.projectQuality.market_reuse, 'quality');
  assert.equal(simulation.estimateBudget().livingExpenses, costBefore + 35);
});

test('older saves without contract quality migrate to standard with unchanged cash and projects', () => {
  const simulation = fresh();
  for (const removeLiving of [false, true]) {
    const save = structuredClone(simulation.exportCityState());
    if (removeLiving) delete (save.city as { living?: unknown }).living;
    else delete (save.city.living.construction as { projectQuality?: unknown }).projectQuality;
    const restored = createCitySimulation();
    const result = restored.restoreCityState(save);
    assert.equal(result.ok, true, result.error);
    assert.equal(restored.city.treasury, simulation.city.treasury);
    assert.deepEqual(restored.city.projects, simulation.city.projects);
    for (const project of restored.city.projects)
      assert.equal(restored.city.living.construction.projectQuality[project.definitionId], 'standard');
  }
});
