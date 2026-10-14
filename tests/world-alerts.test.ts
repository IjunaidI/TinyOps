import test from "node:test";
import assert from "node:assert/strict";
import { visibleAlertPins } from "../src/mayor/WorldAlertMarkers";
import type { CityAlert } from "../src/mayor/cityAlerts";
import type { DistrictId } from "../src/mayor/types";

function alert(id: string, overrides: Partial<CityAlert> = {}): CityAlert {
  return {
    id,
    title: `Issue ${id}`,
    detail: "A real issue awaiting the mayor's attention.",
    severity: "warning",
    kind: "asset",
    districtId: "oldtown",
    priority: 50,
    day: 1,
    target: { kind: "life", section: "infrastructure", id },
    ...overrides,
  };
}
const districts: DistrictId[] = ["oldtown", "riverside", "hillview", "market"];

test("whole-city markers summarize each district and citywide issues without losing their counts", () => {
  const alerts = districts.flatMap((districtId) =>
    Array.from({ length: 8 }, (_, n) =>
      alert(`${districtId}-${n}`, { districtId, priority: n }),
    ),
  );
  alerts.push(
    alert("budget", { districtId: undefined, kind: "budget", priority: 80 }),
    alert("petition", {
      districtId: undefined,
      kind: "petition",
      priority: 30,
    }),
  );
  const pins = visibleAlertPins(alerts);
  assert.equal(pins.length, 5);
  assert.equal(new Set(pins.map((pin) => pin.alert.districtId)).size, 5);
  assert.equal(
    pins.reduce((sum, pin) => sum + pin.count, 0),
    alerts.length,
  );
  for (const district of districts) {
    const pin = pins.find((item) => item.alert.districtId === district)!;
    assert.equal(pin.count, 8);
    assert.equal(pin.alert.id, `${district}-7`);
  }
  const citywide = pins.find((pin) => !pin.alert.districtId)!;
  assert.equal(citywide.count, 2);
  assert.equal(citywide.alert.id, "budget");
  assert.deepEqual(citywide.position, [0, 0]);
  assert.deepEqual(visibleAlertPins([]), []);
});

test("district focus limits density to six actual alerts and excludes other districts", () => {
  const alerts = Array.from({ length: 10 }, (_, n) =>
    alert(`oldtown-${n}`, { priority: n }),
  );
  alerts.push(
    alert("elsewhere", { districtId: "market", priority: 1_000 }),
    alert("citywide", { districtId: undefined, priority: 1_000 }),
  );
  const pins = visibleAlertPins(alerts, "oldtown");
  assert.equal(pins.length, 6);
  assert.deepEqual(
    pins.map((pin) => pin.alert.id),
    [
      "oldtown-9",
      "oldtown-8",
      "oldtown-7",
      "oldtown-6",
      "oldtown-5",
      "oldtown-4",
    ],
  );
  assert.ok(pins.every((pin) => pin.count === 1));
  assert.deepEqual(visibleAlertPins(alerts, "hillview"), []);
});

test("a selected lower-priority issue stays visible in both its cluster and focused district", () => {
  const alerts = Array.from({ length: 10 }, (_, n) =>
    alert(`issue-${n}`, { priority: n }),
  );
  const focused = visibleAlertPins(alerts, "oldtown", "issue-0");
  assert.equal(focused.length, 6);
  assert.equal(focused[0].alert.id, "issue-0");
  assert.deepEqual(
    focused.slice(1).map((pin) => pin.alert.id),
    ["issue-9", "issue-8", "issue-7", "issue-6", "issue-5"],
  );
  const cluster = visibleAlertPins(alerts, null, "issue-0");
  assert.equal(cluster.length, 1);
  assert.equal(cluster[0].alert.id, "issue-0");
  assert.equal(cluster[0].count, 10);
  assert.equal(
    visibleAlertPins(alerts, "oldtown", "resolved-issue")[0].alert.id,
    "issue-9",
  );
});

test("focused infrastructure and project pins retain exact world coordinates with a district fallback", () => {
  const alerts = [
    alert("power", { position: [-59.5, -30] }),
    alert("project", { position: [-78, -32], kind: "construction" }),
    alert("local-request", { kind: "request" }),
  ];
  const positions = new Map(
    visibleAlertPins(alerts, "oldtown").map((pin) => [
      pin.alert.id,
      pin.position,
    ]),
  );
  assert.deepEqual(positions.get("power"), [-59.5, -30]);
  assert.deepEqual(positions.get("project"), [-78, -32]);
  assert.deepEqual(positions.get("local-request"), [-40, -29]);
  const bridge = visibleAlertPins(
    [alert("bridge", { districtId: "riverside", position: [0, 24] })],
    "riverside",
  );
  assert.deepEqual(
    bridge[0].position,
    [0, 24],
    "A bridge on the river must not be moved to the district center.",
  );
});

test("pin selection does not mutate alerts and ties remain deterministic across source reordering", () => {
  const alerts = [
    alert("later", { day: 3, position: [-25, -64] }),
    alert("same-day-b", { day: 2 }),
    alert("same-day-a", { day: 2 }),
    alert("lower", { day: 1, priority: 20 }),
  ];
  const before = structuredClone(alerts);
  for (const item of alerts) {
    if (item.position) Object.freeze(item.position);
    Object.freeze(item.target);
    Object.freeze(item);
  }
  Object.freeze(alerts);
  const pins = visibleAlertPins(alerts, "oldtown");
  assert.deepEqual(alerts, before);
  assert.deepEqual(
    pins.map((pin) => pin.alert.id),
    ["same-day-a", "same-day-b", "later", "lower"],
  );
  assert.deepEqual(visibleAlertPins([...alerts].reverse(), "oldtown"), pins);
  assert.deepEqual(visibleAlertPins(alerts)[0].alert.id, "same-day-a");
});
