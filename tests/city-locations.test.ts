import test from 'node:test';
import assert from 'node:assert/strict';
import { createCitySimulation } from '../src/mayor/engine';
import {
  locateCitySelection, CITY_ASSET_POSITIONS, CITY_DISTRICT_POSITIONS, CITY_PROJECT_POSITIONS,
} from '../src/mayor/cityLocations';

const actor = { actor: 'you' as const };
function fresh() {
  const simulation = createCitySimulation();
  simulation.startCity('manual', 'balanced', 2026);
  simulation.city.treasury = 50000;
  return simulation;
}
function freeze(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}

test('healthy assets and completed or planned projects locate their actual parcels', () => {
  const { city } = fresh();
  const asset = city.living.assets.find(item => item.id === 'riverside_bridge')!;
  asset.risk = 'low'; asset.condition = 100; asset.outageUntil = 0;
  assert.deepEqual(locateCitySelection(city, { section: 'infrastructure', id: asset.id }), {
    districtId: 'riverside', position: [0, 24],
  });
  assert.deepEqual(locateCitySelection(city, { section: 'infrastructure', id: 'hillview_power', districtId: 'riverside' }), {
    districtId: 'hillview', position: [59.5, -30],
  }, 'The real asset district overrides a stale selection hint.');
  const completed = city.projects.find(item => item.definitionId === 'oldtown_housing')!;
  completed.status = 'complete'; completed.progress = 1;
  assert.deepEqual(locateCitySelection(city, { section: 'projects', id: completed.definitionId }), {
    districtId: 'oldtown', position: [-25, -64],
  });
  assert.deepEqual(locateCitySelection(city, { section: 'construction', id: 'market_incubator' }), {
    districtId: 'market', position: [78, 16],
  }, 'A catalog project has a real planned parcel before commissioning.');
});

test('residents, service cards, and council motions route through their authoritative districts', () => {
  const simulation = fresh();
  const citizen = simulation.city.living.citizens[0];
  assert.deepEqual(locateCitySelection(simulation.city, { section: 'residents', id: citizen.id }), {
    districtId: citizen.districtId, position: [...CITY_DISTRICT_POSITIONS[citizen.districtId]],
  });
  for (const id of ['oldtown', 'oldtown:care']) {
    assert.deepEqual(locateCitySelection(simulation.city, { section: 'services', id }), {
      districtId: 'oldtown', position: [-40, -29],
    });
  }
  assert.equal(simulation.performCivicAction('motion:market:jobs', actor).ok, true);
  const motion = simulation.city.living.council.motions.at(-1)!;
  for (const section of ['council', 'economy', 'housing'] as const) {
    assert.deepEqual(locateCitySelection(simulation.city, { section, id: motion.id, districtId: 'hillview' }), {
      districtId: 'market', position: [40, 29],
    });
  }
});

test('promises and construction work resolve their underlying asset, project, and district targets', () => {
  const simulation = fresh();
  assert.equal(simulation.performCivicAction('repair:riverside_bridge', actor).ok, true);
  const repair = simulation.city.living.works.find(item => item.targetId === 'riverside_bridge')!;
  const repairPromise = simulation.city.living.promises.find(item => item.targetId === 'riverside_bridge')!;
  for (const selection of [
    { section: 'projects' as const, id: repair.id },
    { section: 'promises' as const, id: repairPromise.id },
  ]) assert.deepEqual(locateCitySelection(simulation.city, selection), {
    districtId: 'riverside', position: [0, 24],
  });
  assert.equal(simulation.performCivicAction('commit_project:oldtown_clinic', actor).ok, true);
  const projectPromise = simulation.city.living.promises.find(item => item.targetId === 'oldtown_clinic')!;
  assert.deepEqual(locateCitySelection(simulation.city, { section: 'promises', id: projectPromise.id }), {
    districtId: 'oldtown', position: [-78, -32],
  });
  const district = simulation.city.living.districts.find(item => item.services.some(service => service.coverage < .9))!;
  const service = district.services.find(item => item.coverage < .9)!;
  assert.equal(simulation.performCivicAction(`pledge_service:${district.id}:${service.kind}`, actor).ok, true);
  const servicePromise = simulation.city.living.promises.find(item => item.targetId === `${district.id}:${service.kind}`)!;
  assert.deepEqual(locateCitySelection(simulation.city, { section: 'promises', id: servicePromise.id }), {
    districtId: district.id, position: [...CITY_DISTRICT_POSITIONS[district.id]],
  });
});

test('location lookup is pure, coordinate tables are frozen, and unknown IDs have explicit fallbacks only', () => {
  const state = structuredClone(fresh().city);
  const before = JSON.stringify(state);
  freeze(state);
  const selection = { section: 'infrastructure' as const, id: 'riverside_drainage' };
  const result = locateCitySelection(state, selection);
  result.position![0] = 900;
  assert.deepEqual(locateCitySelection(state, selection).position, [-51.6, 18]);
  assert.equal(JSON.stringify(state), before);
  for (const table of [CITY_DISTRICT_POSITIONS, CITY_ASSET_POSITIONS, CITY_PROJECT_POSITIONS]) {
    assert.equal(Object.isFrozen(table), true);
    for (const point of Object.values(table)) {
      assert.equal(Object.isFrozen(point), true);
      assert.equal(point.every(Number.isFinite), true);
    }
  }
  assert.deepEqual(locateCitySelection(state, { section: 'projects', id: 'not-a-project' }), {});
  assert.deepEqual(locateCitySelection(state, { section: 'projects', id: 'constructor' }), {});
  assert.deepEqual(locateCitySelection(state, { section: 'infrastructure', id: 'missing', districtId: 'market' }), {
    districtId: 'market', position: [40, 29],
  });
  assert.deepEqual(locateCitySelection(state, { section: 'services' }), {});
  assert.deepEqual(locateCitySelection(state, { section: 'services', id: 'oldtown:unknown-service' }), {});
});
