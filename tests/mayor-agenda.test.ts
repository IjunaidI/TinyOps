import test from 'node:test';
import assert from 'node:assert/strict';
import { jev, type Decision, type DecisionInput } from '../src/ai/jev';
import { city, startCity, resolveRequest, getOpenRequests, getAvailableOptions,
  getCivicActions, performCivicAction, submitPetition, getPetitionActions,
  setTax, setDepartment, estimateBudget } from '../src/mayor/engine';
import { updateMayorAI, resetMayorAI, exportMayorSession, normalizeMayorSession, restoreMayorSession } from '../src/mayor/controller';

function prepare() {
  assert.equal(startCity('jev', 'balanced', 6291).ok, true);
  for (const request of getOpenRequests()) {
    const choices = getAvailableOptions(request.id);
    const choice = choices.find(x => (x.effects.treasury ?? 0) >= 0) ?? choices[0];
    if (choice) assert.equal(resolveRequest(request.id, choice.id, {actor:'you'}).ok, true);
  }
  resetMayorAI();
}
function answer(input: DecisionInput, choice: string, petitionScope?: string): Decision {
  return {id:'mock-decision', kind:'mayor', entityId:input.entityId, generation:input.generation,
    input:input.text, choice, confidence:0.8, probabilities:null, clarification:null,
    reason:'prevention', priority:'balanced', model:'test-model', durationMs:20,
    source:'jev', status:'pending', petitionScope};
}
async function mockDecision(select: (input: DecisionInput) => Decision, between?: () => void) {
  const oldEnqueue = jev.enqueue;
  let captured: DecisionInput | undefined;
  Object.defineProperty(jev, 'connected', {configurable:true, get:() => true});
  jev.enqueue = async input => {
    captured = input;
    between?.();
    return select(input);
  };
  try {
    updateMayorAI();
    await Promise.resolve();
    updateMayorAI();
    assert.ok(captured, 'The ready city should produce a proposal');
    return captured;
  } finally {
    jev.enqueue = oldEnqueue;
    delete (jev as any).connected;
  }
}

test('Jev sees a living agenda, public evidence, and executes the same priced action as manual play', async () => {
  prepare();
  const before = city.treasury;
  let cost = 0;
  const input = await mockDecision(input => {
    const keys = Object.keys(input.candidates!);
    const selected = keys.find(id => id.startsWith('living:') && getCivicActions().some(a => `living:${a.id}` === id && a.cost > 0));
    assert.ok(selected);
    cost = getCivicActions().find(a => `living:${a.id}` === selected)!.cost;
    const publicCity = input.snapshot!.livingCity as any;
    assert.equal(publicCity.districts.length, 4);
    assert.ok(publicCity.residents.length >= 8);
    assert.ok(publicCity.assets.every((a: any) => !Object.hasOwn(a, 'condition')));
    return answer(input, selected);
  });
  assert.ok(input.text.includes('agenda'));
  assert.equal(city.treasury, before - cost);
  assert.equal(city.decisions[0].actor, 'jev');
  assert.equal(city.decisions[0].model, 'test-model');
  assert.equal(exportMayorSession().civicActionsToday, 1);
});

test('a stale Jev response cannot spend after a manual civic decision', async () => {
  prepare();
  let afterManual = 0;
  await mockDecision(input => {
    const candidate = Object.keys(input.candidates!).find(id => id.startsWith('living:'))!;
    return answer(input, candidate);
  }, () => {
    const action = getCivicActions().find(a => a.available && a.cost > 0)!;
    assert.equal(performCivicAction(action.id, {actor:'you'}).ok, true);
    afterManual = city.treasury;
  });
  assert.equal(city.treasury, afterManual);
  assert.equal(city.decisions[0].actor, 'you');
  assert.equal(exportMayorSession().liveDecisions, 0);
});

test('chat rejects a living action in the wrong requested neighborhood', async () => {
  prepare();
  const submitted = submitPetition('Please inspect the bridge in Riverside.', 'riverside');
  assert.equal(submitted.ok, true);
  const candidate = getPetitionActions(submitted.petitionId!).find(a =>
    a.kind === 'civic' && a.available && a.districtId === 'oldtown' && a.cost > 0);
  assert.ok(candidate);
  const before = city.treasury;
  await mockDecision(input => answer(input, candidate.id, 'riverside'));
  const petition = city.petitions.find(p => p.id === submitted.petitionId)!;
  assert.equal(petition.status, 'declined');
  assert.equal(petition.response?.reason, 'unsupported');
  assert.equal(city.treasury, before);
});

test('older advisor sessions migrate civic limits and invalid new counters are rejected', () => {
  const old = {version:1, attempts:0, lastReviewDay:null, liveDecisions:0, localDecisions:2, priority:'balanced'};
  const normalized = normalizeMayorSession(old);
  assert.ok(normalized);
  assert.equal(normalized.civicActionsToday, 0);
  assert.equal(normalizeMayorSession({...old,civicActionsToday:3}), null);
  assert.equal(normalizeMayorSession({...old,civicActionDay:NaN}), null);
  assert.equal(normalizeMayorSession({...old,lastCabinetDay:Infinity}), null);
});

test('daily living reviews do not postpone the three-day capital and funding agenda', async () => {
  prepare();
  city.day = 4;
  assert.equal(restoreMayorSession({version:1, attempts:0, lastReviewDay:3, lastCabinetDay:1,
    liveDecisions:0, localDecisions:0, priority:'balanced'}), true);
  await mockDecision(input => {
    assert.ok(Object.keys(input.candidates!).some(id => id.startsWith('project_')));
    assert.ok(Object.keys(input.candidates!).some(id => id.startsWith('service_')));
    assert.ok(Object.keys(input.candidates!).some(id => id.startsWith('tax_')));
    return answer(input, 'keep_plan');
  });
  assert.equal(exportMayorSession().lastCabinetDay, 4);
});

function prepareFiscalInbox(day = 4, lastCabinetDay = 1) {
  prepare();
  city.day = day;
  city.dayProgress = 0;
  city.requests.push(
    {id: 'fiscal-test-access', templateId: 'housing_steps', arrivedDay: day,
      dueDay: day + 3, status: 'open', clarified: false},
    {id: 'fiscal-test-bench', templateId: 'community_bench', arrivedDay: day,
      dueDay: day + 4, status: 'open', clarified: false},
  );
  assert.equal(restoreMayorSession({version: 1, attempts: 0,
    lastReviewDay: day - 1, lastCabinetDay, liveDecisions: 0,
    localDecisions: 0, priority: 'balanced'}), true);
}

test('Jev can replace a manual tax setting while ordinary requests remain open', async () => {
  prepareFiscalInbox();
  assert.equal(setTax('high', {actor: 'you'}).ok, true);
  const forecast = estimateBudget({tax: 'balanced'});
  const waitingIds = getOpenRequests().map(request => request.id);
  await mockDecision(input => {
    const candidates = input.candidates!;
    assert.ok(Object.keys(candidates).some(id => id.startsWith('case:')));
    assert.ok(Object.keys(candidates).some(id => id.startsWith('service_')));
    assert.ok(candidates.keep_plan, 'Retaining current policy is an explicit choice');
    assert.ok(!Object.keys(candidates).some(id => id.startsWith('project_')),
      'A busy inbox does not open a capital-project review');
    assert.ok(candidates.tax_balanced.includes(`revenue ${forecast.revenue}`));
    assert.ok(candidates.tax_balanced.includes('Current rate: high'));
    return answer(input, 'tax_balanced');
  });
  assert.equal(city.tax, 'balanced');
  assert.equal(city.decisions[0].actor, 'jev');
  assert.equal(city.decisions[0].title, 'City tax policy');
  assert.deepEqual(getOpenRequests().map(request => request.id), waitingIds);
  assert.equal(exportMayorSession().lastCabinetDay, 4);
  assert.equal(exportMayorSession().liveDecisions, 1);
});

test('Jev can restore manually reduced service funding without waiting for an empty inbox', async () => {
  prepareFiscalInbox();
  assert.equal(setDepartment('health', 0, {actor: 'you'}).ok, true);
  const forecast = estimateBudget({departments: {health: 1}});
  await mockDecision(input => {
    const funding = input.candidates!.service_health_1;
    assert.ok(funding.includes(`expenses ${forecast.expenses}`));
    assert.ok(funding.includes('Current: Reduced'));
    assert.ok(funding.includes('next-day health funding and demand effect'));
    return answer(input, 'service_health_1');
  });
  assert.equal(city.departments.health, 1);
  assert.equal(city.decisions[0].actor, 'jev');
  assert.equal(city.decisions[0].choice, 'Standard funding');
  assert.equal(getOpenRequests().length, 2);
  assert.equal(exportMayorSession().lastCabinetDay, 4);
});

test('choosing a citizen case from the mixed agenda also completes the fiscal review', async () => {
  prepareFiscalInbox();
  const request = getOpenRequests()[0];
  await mockDecision(input => {
    assert.ok(input.candidates!.tax_low);
    const choice = Object.keys(input.candidates!).find(id => id.startsWith(`case:${request.id}:`));
    assert.ok(choice);
    return answer(input, choice);
  });
  assert.equal(request.status, 'resolved');
  assert.equal(city.tax, 'balanced');
  assert.equal(getOpenRequests().length, 1);
  assert.equal(exportMayorSession().lastCabinetDay, 4);
});

test('Jev can explicitly retain fiscal settings without dismissing waiting requests', async () => {
  prepareFiscalInbox();
  const before = {tax: city.tax, departments: {...city.departments}, treasury: city.treasury};
  await mockDecision(input => {
    assert.ok(input.candidates!.keep_plan);
    return answer(input, 'keep_plan');
  });
  assert.deepEqual({tax: city.tax, departments: city.departments, treasury: city.treasury}, before);
  assert.equal(getOpenRequests().length, 2);
  assert.equal(exportMayorSession().lastCabinetDay, 4);

  // The next agenda returns to the waiting letters rather than offering a
  // repeat fiscal decision in the same day.
  resetMayorAI();
  await mockDecision(input => {
    assert.ok(!Object.keys(input.candidates!).some(id => id.startsWith('tax_') || id.startsWith('service_')));
    assert.equal(input.candidates!.keep_plan, undefined);
    const choice = Object.keys(input.candidates!).find(id => id.startsWith('case:'));
    assert.ok(choice);
    return answer(input, choice);
  });
  assert.equal(getOpenRequests().length, 1);
});

test('mixed fiscal agendas retain their three-day cadence', async () => {
  for (const day of [5, 6, 7]) {
    prepareFiscalInbox(day, 4);
    await mockDecision(input => {
      const candidates = input.candidates!;
      assert.equal(Object.keys(candidates).some(id => id.startsWith('tax_')), day === 7);
      assert.equal(Object.keys(candidates).some(id => id.startsWith('service_')), day === 7);
      assert.equal(Boolean(candidates.keep_plan), day === 7);
      const choice = Object.keys(candidates).find(id => id.startsWith('case:'));
      assert.ok(choice);
      return answer(input, choice);
    });
    assert.equal(exportMayorSession().lastCabinetDay, day === 7 ? 7 : 4);
  }
});

for (const scenario of ['urgent priority', 'imminent deadline'] as const) {
  test(`${scenario} postpones fiscal review and protects the citizen decision`, async () => {
    prepareFiscalInbox();
    const request = city.requests.find(item => item.id === 'fiscal-test-access')!;
    if (scenario === 'urgent priority') request.templateId = 'health_water';
    else request.dueDay = city.day + 0.25;
    await mockDecision(input => {
      const choices = Object.keys(input.candidates!);
      assert.ok(choices.length > 0);
      assert.ok(choices.every(id => id.startsWith(`case:${request.id}:`) || id === `clarify:${request.id}`));
      assert.equal(input.candidates!.keep_plan, undefined);
      const choice = choices.find(id => id.startsWith('case:'));
      assert.ok(choice);
      return answer(input, choice);
    });
    assert.equal(request.status, 'resolved');
    assert.equal(getOpenRequests().length, 1);
    assert.equal(exportMayorSession().lastCabinetDay, 1,
      'Urgent work must not reset the postponed fiscal-review clock');
  });
}
