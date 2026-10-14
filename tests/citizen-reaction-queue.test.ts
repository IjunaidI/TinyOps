import test from "node:test";
import assert from "node:assert/strict";
import { updateReactionQueue } from "../src/mayor/citizenReactionQueue";
import type { CitizenReaction } from "../src/mayor/citizenReactions";

function reaction(
  id: string,
  emotion: CitizenReaction["emotion"] = "concerned",
): CitizenReaction {
  return {
    id,
    citizenId: "rosa",
    name: "Rosa Silva",
    role: "Market trader",
    districtId: "market",
    emotion,
    title: id,
    text: id,
    day: 1,
    sourceLabel: "Neighborhood perspective",
    target: { section: "residents", id: "rosa", districtId: "market" },
  };
}

test("a resident can thank the mayor after an unrelated complaint without interrupting the visible story", () => {
  const complaint = reaction("complaint", "angry");
  const thanks = reaction("fountain-approved", "grateful");
  assert.deepEqual(
    updateReactionQueue([complaint], [thanks], [thanks, complaint], true),
    [complaint, thanks],
  );
});

test("a resolved request replaces its obsolete concern even while the reaction is visible", () => {
  const concern = reaction("fountain-open");
  const thanks = reaction("fountain-approved", "grateful");
  assert.deepEqual(updateReactionQueue([concern], [thanks], [thanks], true), [
    thanks,
  ]);
});

test("latest outcomes take priority during the cooldown, without duplicate or unbounded waiting stories", () => {
  const old = [reaction("old-1"), reaction("old-2"), reaction("old-3")];
  const recent = reaction("new-decision", "grateful");
  assert.deepEqual(
    updateReactionQueue(old, [recent, recent], [recent, ...old], false),
    [recent, old[0], old[1]],
  );
  assert.deepEqual(
    old.map((item) => item.id),
    ["old-1", "old-2", "old-3"],
  );
});
