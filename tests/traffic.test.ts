import test from "node:test";
import assert from "node:assert/strict";
import {
  createTraffic,
  tickTraffic,
  tickTrafficFleet,
  trafficRoutes,
  sampleTrafficRoute,
  vehicleTrafficRoute,
  createCentralRoute,
  type TrafficRoute,
  type TrafficVehicle,
} from "../src/mayor/traffic";

const distance = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const angleDistance = (a: number, b: number) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const poses = (fleet: TrafficVehicle[]) =>
  fleet.map((v) => sampleTrafficRoute(vehicleTrafficRoute(v), v.distance));

function assertJoins(route: TrafficRoute) {
  for (const edge of [...route.segments.map((s) => s.offset), route.length]) {
    const a = sampleTrafficRoute(route, edge - 0.00001),
      b = sampleTrafficRoute(route, edge + 0.00001);
    assert(distance(a, b) < 0.00005, `discontinuous position at ${edge}`);
    assert(
      angleDistance(a.heading, b.heading) < 0.00005,
      `discontinuous tangent at ${edge}`,
    );
  }
}

test("all base routes and the alternative central crossing have continuous positions and tangent headings", () => {
  [...trafficRoutes, createCentralRoute(true, 52)].forEach(assertJoins);
  for (const route of trafficRoutes) {
    assert.deepEqual(
      sampleTrafficRoute(route, -1),
      sampleTrafficRoute(route, route.length - 1),
    );
    assert(
      distance(
        sampleTrafficRoute(route, 0),
        sampleTrafficRoute(route, route.length),
      ) < 1e-8,
    );
  }
});

test("congestion lowers actual travel and speed without changing the lane", () => {
  const fast = createTraffic()[0],
    slow = { ...fast };
  const start = fast.distance;
  for (let i = 0; i < 180; i++) {
    tickTraffic(fast, 1 / 60, Infinity, 1);
    tickTraffic(slow, 1 / 60, Infinity, 0.3);
  }
  assert(slow.distance - start < (fast.distance - start) * 0.7);
  assert(slow.speed < fast.speed);
  assert.equal(slow.route, fast.route);
  assert.equal(slow.path, undefined);
});

test("paused zero-time updates do not reroute, move wheels, or consume a bus stop", () => {
  const fleet = createTraffic();
  fleet[4].waiting = 3.5;
  const before = structuredClone(fleet);
  tickTrafficFleet(fleet, 0, { southBridgeClosed: true, speedAt: () => 0.2 });
  assert.deepEqual(fleet, before);
  tickTraffic(fleet[4], 0, Infinity, 0.2, 5);
  assert.deepEqual(fleet, before);
});

test("bus dwell time comes from the supplied service condition", () => {
  const vehicle = createTraffic()[4];
  vehicle.distance = vehicle.nextStop;
  vehicle.speed = 0;
  tickTraffic(vehicle, 1 / 60, Infinity, 1, 4.8);
  assert.equal(vehicle.waiting, 4.8);
  const held = vehicle.distance;
  for (let i = 0; i < 120; i++) tickTraffic(vehicle, 1 / 60, Infinity, 1, 4.8);
  assert.equal(vehicle.distance, held);
  assert(vehicle.waiting > 2.7 && vehicle.waiting < 2.9);
});

// Asphalt extents from the rendered road grid: two banks, their outer avenues,
// five crossings, and the supported circular central plaza. This checks the
// model's footprint against physical surfaces, independently of path formulas.
function onAsphalt(x: number, z: number) {
  const h = 5.55 / 2 + 0.005;
  if (Math.hypot(x, z) <= 8 && Math.hypot(x, z) >= 4) return true;
  if (Math.abs(z) <= h && Math.abs(x) >= 6.1 && Math.abs(x) <= 14) return true;
  if (
    [-52, -24, 24, 52].some((row) => Math.abs(z - row) <= h) &&
    Math.abs(x) <= 66.8
  )
    return true;
  if (
    [-40, -8, 8, 40].some((row) => Math.abs(z - row) <= h) &&
    Math.abs(x) >= 8.4 &&
    Math.abs(x) <= 66.8
  )
    return true;
  return (
    [-64, -48, -30, -12, 12, 30, 48, 64].some(
      (col) => Math.abs(x - col) <= h,
    ) && Math.abs(z) <= 54.8
  );
}
function footprintFits(route: TrafficRoute, at: number) {
  const p = sampleTrafficRoute(route, at),
    sx = Math.sin(p.heading),
    cz = Math.cos(p.heading);
  for (const side of [-1.02, 1.02])
    for (const fore of [-1.86, 1.86]) {
      assert(
        onAsphalt(p.x + sx * fore + cz * side, p.z + cz * fore - sx * side),
        `off asphalt at ${p.x.toFixed(2)},${p.z.toFixed(2)}`,
      );
    }
}

test("closure routes stay connected, remain on asphalt, and restore after reopening at 60 and 10 FPS", () => {
  const inspected = new Set<TrafficRoute>();
  for (const fps of [60, 10]) {
    const fleet = createTraffic();
    let previous = poses(fleet),
      transfers = 0,
      detours = 0;
    const previousPaths = fleet.map(vehicleTrafficRoute);
    for (let frame = 0; frame < 270 * fps; frame++) {
      const t = frame / fps;
      tickTrafficFleet(fleet, 1 / fps, {
        southBridgeClosed: t >= 10 && t < 135,
        speedAt: (p) => (p.x < 0 && p.z > 0 ? 0.35 : 0.85),
      });
      const next = poses(fleet);
      fleet.forEach((v, i) => {
        const path = vehicleTrafficRoute(v);
        assert(
          distance(previous[i], next[i]) <= 5.21 / fps + 1e-5,
          `jump at ${fps} FPS, vehicle ${i}`,
        );
        assert(
          Number.isFinite(next[i].x) &&
            Number.isFinite(next[i].z) &&
            Number.isFinite(next[i].heading),
        );
        assert(v.speed >= 0 && v.speed <= 5.21);
        if (path !== previousPaths[i]) {
          assert(
            angleDistance(previous[i].heading, next[i].heading) < 0.1,
            `heading snap while rerouting ${i}`,
          );
          transfers++;
          previousPaths[i] = path;
          if (v.path) detours++;
        }
        if (!inspected.has(path)) {
          assertJoins(path);
          for (let s = 0; s < path.length; s += 0.15) footprintFits(path, s);
          inspected.add(path);
        }
      });
      previous = next;
    }
    assert.equal(
      detours,
      8,
      "all vehicles using the closed crossing take connected alternatives",
    );
    assert.equal(
      transfers,
      16,
      "every diverted vehicle eventually restores its original route",
    );
    assert(fleet.every((v) => v.path === undefined));
  }
});
