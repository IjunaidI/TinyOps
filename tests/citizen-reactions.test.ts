import test from 'node:test';
import assert from 'node:assert/strict';
import { requestById } from '../src/mayor/catalog';
import { createCitySimulation, DAY_SECONDS } from '../src/mayor/engine';
import { getCitizenReactions, getRequestVoice, MAX_CITIZEN_REACTIONS } from '../src/mayor/citizenReactions';
import type { CityRequest, CityState } from '../src/mayor/types';

const actor = { actor: 'you' as const };
function fresh() {
  const simulation = createCitySimulation();
  simulation.startCity('manual', 'balanced', 2026);
  simulation.city.treasury = 50000;
  return simulation;
}
function quiet(): CityState {
  const state = structuredClone(fresh().city);
  state.requests = [];
  state.living.events = [];
  for (const person of state.living.citizens) person.memories = [];
  return state;
}
function letter(templateId = 'housing_roof', id = 'voice-letter'): CityRequest {
  return { id, templateId, arrivedDay: 1, dueDay: 4, status: 'open', clarified: false };
}
function freeze(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}

test('resident reactions are pure, stable across save restore, and cannot mutate residents through their target', () => {
  const simulation = fresh();
  const open = simulation.city.requests.find(request => getRequestVoice(simulation.city, request))!;
  assert.ok(open, 'A new city has real citizen correspondence to introduce its neighbors.');
  const option = simulation.getAvailableOptions(open.id)[0];
  assert.equal(simulation.resolveRequest(open.id, option.id, actor).ok, true);
  const before = structuredClone(simulation.city);
  const reactions = getCitizenReactions(simulation.city);
  assert.deepEqual(simulation.city, before);
  assert.ok(reactions.some(item => item.requestId === open.id));
  const restored = createCitySimulation();
  const result = restored.restoreCityState(simulation.exportCityState());
  assert.equal(result.ok, true, result.error);
  freeze(restored.city);
  assert.deepEqual(getCitizenReactions(restored.city), reactions);
  assert.deepEqual(getCitizenReactions(restored.city), getCitizenReactions(restored.city));
  const savedId = reactions[0].target.id;
  reactions[0].target.id = 'caller-edit';
  assert.equal(getCitizenReactions(restored.city)[0].target.id, savedId);
});

test('collective letters retain a local perspective, while institutions are never relabeled as residents', () => {
  const state = quiet();
  const request = letter();
  const voice = getRequestVoice(state, request)!;
  assert.equal(voice.relationship, 'neighbor');
  assert.notEqual(voice.name, requestById[request.templateId].sender);
  assert.equal(state.living.citizens.find(person => person.id === voice.citizenId)!.districtId, 'oldtown');
  assert.equal(voice.identity, voice.citizenId);
  assert.equal(voice.emotion, 'concerned');
  assert.equal(getRequestVoice(state, letter('housing_vacancies')), null);
  assert.equal(getRequestVoice(state, letter('nonexistent_template')), null);
  const reversed = structuredClone(state);
  reversed.living.citizens.reverse();
  assert.deepEqual(getRequestVoice(reversed, request), voice, 'Storage order does not change a familiar face.');
  state.requests = [request];
  assert.equal(getCitizenReactions(state)[0].sourceLabel, 'Neighborhood perspective');
});

test('a genuinely named resident is recognized as the sender instead of inventing a different author', () => {
  const state = quiet();
  const templateId = '__test_named_citizen';
  requestById[templateId] = { ...requestById.housing_roof, id: templateId, sender: '  MÍRA   SHAH ', district: 'riverside', category: 'health' };
  try {
    const voice = getRequestVoice(state, letter(templateId))!;
    assert.equal(voice.relationship, 'sender');
    assert.equal(voice.citizenId, 'mira');
    assert.equal(voice.name, 'Mira Shah');
  } finally {
    delete requestById[templateId];
  }
});

test('request emotions follow applied benefits and harm without claiming commissioned work is finished', () => {
  for (const [optionId, emotion] of [['repair', 'grateful'], ['owner', 'angry']] as const) {
    const simulation = fresh();
    const request = letter();
    simulation.city.requests = [request];
    const arrival = getCitizenReactions(simulation.city).find(item => item.requestId === request.id)!;
    assert.equal(arrival.emotion, 'concerned');
    assert.equal(simulation.resolveRequest(request.id, optionId, actor).ok, true);
    const reactions = getCitizenReactions(simulation.city).filter(item => item.requestId === request.id);
    assert.equal(reactions.length, 1, 'District memory copies must not replay the same decision.');
    assert.equal(reactions[0].emotion, emotion);
    assert.notEqual(reactions[0].id, arrival.id);
    assert.match(reactions[0].text, /The decision on/);
    assert.doesNotMatch(reactions[0].text, /repair (?:is )?(?:complete|finished)|dries out/i);
    const decision = simulation.city.decisions.find(item => item.requestId === request.id)!;
    decision.effects = { treasury: 5000 };
    assert.equal(getRequestVoice(simulation.city, request)!.emotion, 'neutral', 'Money alone cannot manufacture appreciation.');
  }
});

test('a missed real deadline gets a new angry reaction with the actual request link', () => {
  const simulation = fresh();
  const request = letter();
  request.dueDay = 1.25;
  simulation.city.requests = [request];
  const initial = getCitizenReactions(simulation.city).find(item => item.requestId === request.id)!;
  simulation.tickCity(DAY_SECONDS / 4);
  assert.equal(request.status, 'expired');
  const expired = getCitizenReactions(simulation.city).find(item => item.requestId === request.id)!;
  assert.equal(expired.emotion, 'angry');
  assert.match(expired.text, /passed its deadline without a decision/);
  assert.notEqual(expired.id, initial.id);
  assert.equal(expired.day, request.resolvedDay);
});

test('district and citywide memories produce one voice, with a named subject speaking for themselves', () => {
  const state = quiet();
  for (const person of state.living.citizens) person.memories.push({ day: 1, text: 'A promise kept for the city.', outcome: 'helped', sourceId: 'promise-city' });
  let reactions = getCitizenReactions(state);
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0].emotion, 'grateful');
  for (const person of state.living.citizens.filter(person => person.districtId === 'riverside')) {
    person.memories.push({ day: 1, text: 'Ben Ortiz had to leave an unaffordable home.', outcome: 'hurt', sourceId: 'ben' });
  }
  reactions = getCitizenReactions(state);
  assert.equal(reactions.length, 2);
  assert.equal(reactions.find(item => item.emotion === 'angry')!.citizenId, 'ben');
  assert.deepEqual(reactions.find(item => item.emotion === 'angry')!.target, { section: 'residents', id: 'ben', districtId: 'riverside' });
});

test('actual waiting, completion, and displacement events use the correct neighborhood and deduplicate memory echoes', () => {
  const state = quiet();
  state.living.events = [
    { id: 1, day: 1, title: 'Sana Iqbal is still waiting', text: 'Sana needs a school place within a manageable commute.', kind: 'resident', districtId: 'hillview', sourceId: 'sana' },
    { id: 2, day: 1, title: 'Riverside crossing: repair complete', text: 'Full service restored. The crew is available for another project.', kind: 'asset', districtId: 'riverside', sourceId: 'riverside_bridge' },
    { id: 3, day: 1, title: 'Market: renters displaced', text: 'Two households lost local access to affordable housing.', kind: 'housing', districtId: 'market' },
  ];
  const reactions = getCitizenReactions(state);
  assert.equal(reactions.find(item => item.id === 'event:1')!.citizenId, 'sana');
  assert.equal(reactions.find(item => item.id === 'event:1')!.emotion, 'concerned');
  assert.equal(reactions.find(item => item.id === 'event:2')!.districtId, 'riverside');
  assert.equal(reactions.find(item => item.id === 'event:2')!.emotion, 'grateful');
  assert.equal(reactions.find(item => item.id === 'event:3')!.districtId, 'market');
  assert.equal(reactions.find(item => item.id === 'event:3')!.emotion, 'angry');
  state.living.citizens.find(person => person.id === 'mira')!.memories.push({ day: 1, text: 'The crossing is repaired.', outcome: 'helped', sourceId: 'riverside_bridge' });
  const deduplicated = getCitizenReactions(state);
  assert.equal(deduplicated.length, 3);
  assert.equal(deduplicated.some(item => item.id === 'event:2'), false);
});

test('reaction history stays bounded and public; hidden infrastructure condition cannot create gossip', () => {
  const state = quiet();
  state.day = 20;
  state.living.events = Array.from({ length: 80 }, (_, id) => ({ id: id + 1, day: 1 + id / 10, title: `Recorded neighborhood update ${id}`, text: 'A public update.', kind: 'service', districtId: 'oldtown' }));
  const reactions = getCitizenReactions(state);
  assert.equal(reactions.length, MAX_CITIZEN_REACTIONS);
  assert.equal(new Set(reactions.map(item => item.id)).size, reactions.length);
  assert.equal(reactions[0].id, 'event:80');
  assert.ok(reactions.every((item, index) => index === 0 || item.day <= reactions[index - 1].day));
  for (const asset of state.living.assets) asset.condition = Math.PI;
  assert.deepEqual(getCitizenReactions(state), reactions);
  state.living.events.push({ id: 900, day: 21, title: 'Future occurrence', text: 'Not happened yet.', kind: 'resident', sourceId: 'mira' });
  assert.deepEqual(getCitizenReactions(state), reactions);
  state.phase = 'lobby';
  assert.deepEqual(getCitizenReactions(state), []);
});
