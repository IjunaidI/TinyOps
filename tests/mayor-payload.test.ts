import test from "node:test";
import assert from "node:assert/strict";
import { jev, type Decision, type DecisionInput } from "../src/ai/jev";
import {
  city,
  startCity,
  submitPetition,
  getPetitionActions,
  exportCityState,
} from "../src/mayor/engine";
import { projectById } from "../src/mayor/catalog";
import { resetMayorAI, updateMayorAI } from "../src/mayor/controller";

async function petitionBriefing(treasury: number) {
  assert.equal(startCity("jev", "balanced", 6291).ok, true);
  city.treasury = treasury;
  city.requests = []; // Isolate the petition from unrelated urgent letters.
  const result = submitPetition(
    "Build a learning center in Old Town.",
    "oldtown",
  );
  assert.equal(result.ok, true);
  resetMayorAI();
  const actions = getPetitionActions(result.petitionId!);
  const before = exportCityState();
  const original = jev.enqueue;
  let captured: DecisionInput | undefined;
  Object.defineProperty(jev, "connected", {
    configurable: true,
    get: () => true,
  });
  jev.enqueue = async (input) => {
    captured = input;
    return {
      id: "payload-check",
      kind: "mayor",
      entityId: input.entityId,
      generation: input.generation,
      input: input.text,
      choice: "decline:unclear",
      confidence: 1,
      probabilities: null,
      clarification: 0,
      model: "test-only",
      durationMs: 0,
      source: "jev",
      status: "pending",
    } satisfies Decision;
  };
  try {
    updateMayorAI();
    await Promise.resolve();
    assert.ok(captured);
    assert.deepEqual(
      exportCityState(),
      before,
      "Building a briefing cannot spend or change the city.",
    );
    return { input: captured, actions };
  } finally {
    jev.enqueue = original;
    Reflect.deleteProperty(jev, "connected");
    resetMayorAI();
  }
}

test("petition briefings retain every legal outcome and its facts without repeating scope rules", async () => {
  for (const treasury of [189, 4200, 50000]) {
    const { input, actions } = await petitionBriefing(treasury);
    const available = actions.filter((action) => action.available);
    assert.deepEqual(
      Object.keys(input.candidates!),
      available.map((action) => action.id),
    );
    assert.ok(
      available.length > 70,
      "Exercise the complete living-city action catalog.",
    );
    for (const action of available) {
      const criterion = input.candidates![action.id];
      assert.ok(criterion.includes(action.facts ?? action.description));
      assert.ok(criterion.includes(action.status.toUpperCase()));
      assert.ok(criterion.includes(`reason: ${action.reason}`));
    }
    // The original repeated catalog exceeded the model window. This includes
    // all state and choices, leaving room for the shared transport instructions.
    const bytes = new TextEncoder().encode(JSON.stringify(input)).byteLength;
    assert.ok(bytes < 80000, `Petition briefing grew to ${bytes} bytes.`);
    assert.doesNotMatch(
      JSON.stringify(input.candidates),
      /Choose this outcome only if|Only choose this if the action, location/,
    );
  }
});

test("unavailable petition targets retain exact scope, cost, and blocking evidence", async () => {
  const { input, actions } = await petitionBriefing(189);
  const petition = input.snapshot!.currentPetition as {
    unavailableActions: Array<Record<string, unknown>>;
  };
  const unavailable = actions.filter(
    (action) =>
      !action.available &&
      ["project", "department", "tax", "civic"].includes(action.kind),
  );
  assert.deepEqual(
    petition.unavailableActions.map((action) => action.id),
    unavailable.map((action) => action.id),
  );
  for (const action of unavailable) {
    const evidence = petition.unavailableActions.find(
      (item) => item.id === action.id,
    )!;
    assert.equal(evidence.label, action.label);
    assert.equal(
      evidence.scope,
      action.districtId ??
        (action.projectId ? projectById[action.projectId]?.district : "city"),
    );
    assert.equal(evidence.unavailableReason, action.unavailableReason);
    assert.equal(evidence.oneOffCost, action.cost);
    assert.equal(evidence.dailyCostChange, action.dayCost);
    assert.equal(evidence.projectId, action.projectId);
    assert.equal(evidence.civicActionId, action.civicActionId);
    assert.equal(evidence.department, action.department);
    assert.equal(evidence.level, action.level);
    assert.equal(evidence.tax, action.tax);
    assert.equal(Object.hasOwn(evidence, "description"), false);
  }
});
