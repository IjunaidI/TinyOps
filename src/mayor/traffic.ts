/** Continuous mayor traffic. Distances and tangent headings share the same path,
 * so a vehicle cannot drift sideways while its body catches up to a new heading. */
export type Point = { x: number; z: number };
type Line = {
  kind: "line";
  start: Point;
  end: Point;
  length: number;
  offset: number;
};
type Arc = {
  kind: "arc";
  center: Point;
  radius: number;
  startAngle: number;
  sweep: number;
  length: number;
  offset: number;
};
type Curve = {
  kind: "curve";
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
  samples: number[];
  length: number;
  offset: number;
};
export type TrafficRoute = {
  segments: (Line | Arc | Curve)[];
  length: number;
  stop: number;
  speed: number;
  central?: boolean;
};
export type TrafficVehicle = {
  route: number;
  distance: number;
  speed: number;
  waiting: number;
  nextStop: number;
  wheels: number;
  /** A connected alternative shares the current lane before a closure detour. */
  path?: TrafficRoute;
};
export type TrafficConditions = {
  speedAt?: (point: Point) => number;
  southBridgeClosed?: boolean;
  stopDuration?: (vehicle: TrafficVehicle, index: number) => number;
};
export const vehicleTrafficRoute = (vehicle: TrafficVehicle) =>
  vehicle.path ?? trafficRoutes[vehicle.route];
const mod = (n: number, m: number) => ((n % m) + m) % m;
const unit = (a: Point, b: Point) => {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
};

/** Axis-aligned closed road loop -> right-hand lane with circular fillets.
 * The tangent is continuous at every line/arc join and the loop seam. */
export function createTrafficRoute(
  corners: Point[],
  speed = 4.6,
): TrafficRoute {
  const lane = 1.1;
  const bends = corners.map((point, i) => {
    const incoming = unit(corners[mod(i - 1, corners.length)], point);
    const outgoing = unit(point, corners[(i + 1) % corners.length]);
    const turn = Math.sign(incoming.x * outgoing.z - incoming.z * outgoing.x);
    if (
      !turn ||
      Math.abs(incoming.x * outgoing.x + incoming.z * outgoing.z) > 1e-8
    )
      throw new Error("Traffic loops must have distinct orthogonal corners");
    // Intersection of the two offset lanes, with a radius that stays on asphalt.
    const vertex = {
      x: point.x + (incoming.z + outgoing.z) * lane,
      z: point.z - (incoming.x + outgoing.x) * lane,
    };
    const radius = turn > 0 ? 3.4 : 2.4;
    const start = {
      x: vertex.x - incoming.x * radius,
      z: vertex.z - incoming.z * radius,
    };
    const end = {
      x: vertex.x + outgoing.x * radius,
      z: vertex.z + outgoing.z * radius,
    };
    const center = {
      x: start.x + outgoing.x * radius,
      z: start.z + outgoing.z * radius,
    };
    return {
      start,
      end,
      center,
      radius,
      sweep: (turn * Math.PI) / 2,
      startAngle: Math.atan2(start.z - center.z, start.x - center.x),
    };
  });
  const segments: TrafficRoute["segments"] = [];
  let length = 0;
  for (let i = 0; i < bends.length; i++) {
    const bend = bends[i];
    const start = bends[mod(i - 1, bends.length)].end;
    const lineLength = Math.hypot(
      bend.start.x - start.x,
      bend.start.z - start.z,
    );
    segments.push({
      kind: "line",
      start,
      end: bend.start,
      length: lineLength,
      offset: length,
    });
    length += lineLength;
    const arcLength = bend.radius * Math.abs(bend.sweep);
    segments.push({ kind: "arc", ...bend, length: arcLength, offset: length });
    length += arcLength;
  }
  return {
    segments,
    length,
    stop: Math.max(0, segments[0].length - 3.8),
    speed,
  };
}
const rectangle = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  reverse = false,
) => {
  const points = [
    { x: left, z: top },
    { x: right, z: top },
    { x: right, z: bottom },
    { x: left, z: bottom },
  ];
  return reverse ? points.reverse() : points;
};
const curvePoint = (
  curve: Pick<Curve, "start" | "control1" | "control2" | "end">,
  t: number,
) => {
  const u = 1 - t;
  return {
    x:
      u ** 3 * curve.start.x +
      3 * u ** 2 * t * curve.control1.x +
      3 * u * t ** 2 * curve.control2.x +
      t ** 3 * curve.end.x,
    z:
      u ** 3 * curve.start.z +
      3 * u ** 2 * t * curve.control1.z +
      3 * u * t ** 2 * curve.control2.z +
      t ** 3 * curve.end.z,
  };
};
export const ROUNDABOUT = {
  x: 0,
  z: 0,
  laneRadius: 6,
  islandRadius: 3.6,
  roadRadius: 8,
  deckRadius: 8.65,
};

/** Both loops connect a river crossing, bank streets and the new central bridge.
 * Entry/exit curves join the circulating lane tangentially. Distances on curves
 * use an arc-length table, so vans never accelerate sideways through a bend. */
export function createCentralRoute(south = false, crossing = 24): TrafficRoute {
  const segments: TrafficRoute["segments"] = [];
  let length = 0;
  const point = (x: number, z: number) => (south ? { x: -x, z: -z } : { x, z });
  const line = (start: Point, end: Point) => {
    const distance = Math.hypot(end.x - start.x, end.z - start.z);
    segments.push({
      kind: "line",
      start,
      end,
      length: distance,
      offset: length,
    });
    length += distance;
  };
  const arc = (
    center: Point,
    radius: number,
    startAngle: number,
    sweep: number,
  ) => {
    const distance = radius * Math.abs(sweep);
    segments.push({
      kind: "arc",
      center,
      radius,
      startAngle: startAngle + (south ? Math.PI : 0),
      sweep,
      length: distance,
      offset: length,
    });
    length += distance;
  };
  const curve = (
    start: Point,
    control1: Point,
    control2: Point,
    end: Point,
  ) => {
    const points = { start, control1, control2, end };
    const samples = [0];
    let previous = start;
    for (let i = 1; i <= 64; i++) {
      const next = curvePoint(points, i / 64);
      samples.push(
        samples[i - 1] + Math.hypot(next.x - previous.x, next.z - previous.z),
      );
      previous = next;
    }
    const distance = samples[samples.length - 1];
    segments.push({
      kind: "curve",
      ...points,
      samples,
      length: distance,
      offset: length,
    });
    length += distance;
  };
  const entryAngle = Math.PI + 0.48;
  const exitAngle = Math.PI * 2 - 0.48;
  const entry = { x: Math.cos(entryAngle) * 6, z: Math.sin(entryAngle) * 6 };
  const exit = { x: Math.cos(exitAngle) * 6, z: Math.sin(exitAngle) * 6 };
  const outerTurn = crossing - 3.5;
  const crossingLane = crossing - 1.1;
  line(point(-10.9, -outerTurn), point(-10.9, -3.5));
  arc(point(-8.5, -3.5), 2.4, Math.PI, -Math.PI / 2);
  curve(
    point(-8.5, -1.1),
    point(-7.15, -1.1),
    point(
      entry.x + Math.sin(entryAngle) * 1.5,
      entry.z - Math.cos(entryAngle) * 1.5,
    ),
    point(entry.x, entry.z),
  );
  arc(point(0, 0), 6, entryAngle, exitAngle - entryAngle);
  curve(
    point(exit.x, exit.z),
    point(
      exit.x - Math.sin(exitAngle) * 1.5,
      exit.z + Math.cos(exitAngle) * 1.5,
    ),
    point(7.15, -1.1),
    point(8.5, -1.1),
  );
  arc(point(8.5, -3.5), 2.4, Math.PI / 2, -Math.PI / 2);
  line(point(10.9, -3.5), point(10.9, -outerTurn));
  arc(point(8.5, -outerTurn), 2.4, 0, -Math.PI / 2);
  line(point(8.5, -crossingLane), point(-8.5, -crossingLane));
  arc(point(-8.5, -outerTurn), 2.4, -Math.PI / 2, -Math.PI / 2);
  return { segments, length, stop: crossing - 8.6, speed: 3.8, central: true };
}
export const trafficRoutes = [
  createTrafficRoute(rectangle(-64, -52, 64, 52), 5.2),
  createTrafficRoute(rectangle(-64, -52, 64, 52, true), 5.2),
  createTrafficRoute(rectangle(-48, -40, -30, 40), 4.1),
  createTrafficRoute(rectangle(30, -40, 48, 40, true), 4.1),
  createTrafficRoute(rectangle(-48, -24, 48, 24), 4.5),
  createTrafficRoute(rectangle(-30, -24, 30, 24, true), 4.5),
  createTrafficRoute(rectangle(-64, -40, -48, 40, true), 3.9),
  createTrafficRoute(rectangle(48, -40, 64, 40), 3.9),
  createCentralRoute(),
  createCentralRoute(true),
];
const southBridgeDetours: Record<number, TrafficRoute> = {
  4: createTrafficRoute(rectangle(-48, -24, 48, 52), 4.5),
  5: createTrafficRoute(rectangle(-30, -24, 30, 52, true), 4.5),
  9: createCentralRoute(true, 52),
};

/** Switch only on an exactly shared straight lane. Both position and heading
 * stay continuous; a vehicle already committed to the bridge first clears it. */
function joinConnectedRoute(vehicle: TrafficVehicle, target: TrafficRoute) {
  const current = vehicleTrafficRoute(vehicle);
  if (current === target) return;
  const pose = sampleTrafficRoute(current, vehicle.distance);
  if (pose.turning) return;
  for (const segment of target.segments) {
    if (segment.kind !== "line") continue;
    const dx = segment.end.x - segment.start.x;
    const dz = segment.end.z - segment.start.z;
    const heading = Math.atan2(dx, dz);
    if (Math.cos(heading - pose.heading) < 0.999999) continue;
    const t =
      ((pose.x - segment.start.x) * dx + (pose.z - segment.start.z) * dz) /
      segment.length ** 2;
    if (t < 0 || t > 1) continue;
    if (
      Math.hypot(
        segment.start.x + dx * t - pose.x,
        segment.start.z + dz * t - pose.z,
      ) > 0.00001
    )
      continue;
    vehicle.path = target === trafficRoutes[vehicle.route] ? undefined : target;
    vehicle.distance = segment.offset + t * segment.length;
    vehicle.nextStop =
      target.stop +
      (target.stop <= vehicle.distance + 0.05 ? target.length : 0);
    return;
  }
}
export function sampleTrafficRoute(route: TrafficRoute, distance: number) {
  const d = mod(distance, route.length);
  const segment =
    route.segments.find((part) => d < part.offset + part.length) ??
    route.segments[route.segments.length - 1];
  const t = Math.max(0, Math.min(1, (d - segment.offset) / segment.length));
  if (segment.kind === "line") {
    return {
      x: segment.start.x + (segment.end.x - segment.start.x) * t,
      z: segment.start.z + (segment.end.z - segment.start.z) * t,
      heading: Math.atan2(
        segment.end.x - segment.start.x,
        segment.end.z - segment.start.z,
      ),
      turning: false,
    };
  }
  if (segment.kind === "curve") {
    const distance = t * segment.length;
    let upper = segment.samples.findIndex((value) => value >= distance);
    if (upper < 1) upper = 1;
    const lower = upper - 1;
    const fraction =
      (distance - segment.samples[lower]) /
      (segment.samples[upper] - segment.samples[lower]);
    const u = (lower + fraction) / (segment.samples.length - 1);
    const inverse = 1 - u;
    const dx =
      3 * inverse ** 2 * (segment.control1.x - segment.start.x) +
      6 * inverse * u * (segment.control2.x - segment.control1.x) +
      3 * u ** 2 * (segment.end.x - segment.control2.x);
    const dz =
      3 * inverse ** 2 * (segment.control1.z - segment.start.z) +
      6 * inverse * u * (segment.control2.z - segment.control1.z) +
      3 * u ** 2 * (segment.end.z - segment.control2.z);
    return {
      ...curvePoint(segment, u),
      heading: Math.atan2(dx, dz),
      turning: true,
    };
  }
  const angle = segment.startAngle + segment.sweep * t;
  const sign = Math.sign(segment.sweep);
  return {
    x: segment.center.x + Math.cos(angle) * segment.radius,
    z: segment.center.z + Math.sin(angle) * segment.radius,
    heading: Math.atan2(-Math.sin(angle) * sign, Math.cos(angle) * sign),
    turning: true,
  };
}
export function createTraffic(): TrafficVehicle[] {
  const fleet: TrafficVehicle[] = [];
  trafficRoutes.forEach((route, i) => {
    const fractions = route.central ? [0.04, 0.29, 0.54, 0.79] : [0.16, 0.66];
    for (const fraction of fractions) {
      let distance = route.length * fraction;
      // Different routes share bridge lanes. Place the initial fleet with clear
      // gaps too, rather than spawning two vans on top of the same road point.
      for (let attempts = 0; attempts < 60; attempts++) {
        const point = sampleTrafficRoute(route, distance);
        if (
          fleet.every((other) => {
            const position = sampleTrafficRoute(
              trafficRoutes[other.route],
              other.distance,
            );
            return (
              Math.hypot(position.x - point.x, position.z - point.z) >= 6.5
            );
          })
        )
          break;
        distance = mod(distance + 7, route.length);
      }
      const nextStop = route.stop + (route.stop < distance ? route.length : 0);
      fleet.push({
        route: i,
        distance,
        speed: 0,
        waiting: 0,
        nextStop,
        wheels: 0,
      });
    }
  });
  return fleet;
}
export function tickTraffic(
  vehicle: TrafficVehicle,
  elapsed: number,
  followingLimit = Infinity,
  speedScale = 1,
  stopDuration = 1.4,
) {
  const route = vehicleTrafficRoute(vehicle);
  // Bounded substeps make braking deterministic even on lower frame-rate devices.
  let remaining = Math.min(elapsed, 0.1);
  while (remaining > 1e-8) {
    const dt = Math.min(remaining, 1 / 60);
    remaining -= dt;
    if (vehicle.waiting > 0) {
      vehicle.waiting = Math.max(0, vehicle.waiting - dt);
      vehicle.speed = 0;
      continue;
    }
    const toStop = Math.max(0, vehicle.nextStop - vehicle.distance);
    if (toStop < 0.04 && vehicle.speed < 0.45) {
      vehicle.distance = vehicle.nextStop;
      vehicle.nextStop += route.length;
      vehicle.waiting = stopDuration;
      vehicle.speed = 0;
      continue;
    }
    const ahead = sampleTrafficRoute(route, vehicle.distance + 3.2);
    const current = sampleTrafficRoute(route, vehicle.distance);
    const limit =
      (ahead.turning || current.turning ? 2.7 : route.speed) *
      Math.max(0.12, Math.min(1, speedScale));
    const target = Math.min(limit, followingLimit, Math.sqrt(2 * 2.4 * toStop));
    vehicle.speed += Math.max(
      -2.4 * dt,
      Math.min(1.5 * dt, target - vehicle.speed),
    );
    const travel = Math.min(toStop, Math.max(0, vehicle.speed * dt));
    vehicle.distance += travel;
    vehicle.wheels += travel / 0.38;
    // Rebase accumulated distances without moving the rendered vehicle.
    if (vehicle.distance > route.length * 1000) {
      vehicle.distance -= route.length * 1000;
      vehicle.nextStop -= route.length * 1000;
    }
  }
}

const mergeReservations = new WeakMap<TrafficVehicle[], Map<string, number>>();
/** Keep a real gap when central traffic merges onto the existing bridge lanes. */
export function tickTrafficFleet(
  fleet: TrafficVehicle[],
  elapsed: number,
  conditions: TrafficConditions = {},
) {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return;
  for (const vehicle of fleet) {
    const target =
      conditions.southBridgeClosed && southBridgeDetours[vehicle.route]
        ? southBridgeDetours[vehicle.route]
        : trafficRoutes[vehicle.route];
    joinConnectedRoute(vehicle, target);
  }
  let reservations = mergeReservations.get(fleet);
  if (!reservations) {
    reservations = new Map();
    mergeReservations.set(fleet, reservations);
  }
  const positions = fleet.map((vehicle) =>
    sampleTrafficRoute(vehicleTrafficRoute(vehicle), vehicle.distance),
  );
  const limits = positions.map((point, i) => {
    let limit = Infinity;
    const forwardX = Math.sin(point.heading),
      forwardZ = Math.cos(point.heading);
    positions.forEach((other, j) => {
      if (i === j || Math.cos(other.heading - point.heading) < 0.7) return;
      const dx = other.x - point.x,
        dz = other.z - point.z;
      const along = dx * forwardX + dz * forwardZ;
      const across = Math.abs(dx * forwardZ - dz * forwardX);
      if (along <= 0 || along > 15 || across > 1.45) return;
      const gap = Math.max(0, along - 5.2);
      limit = Math.min(limit, Math.sqrt(2 * 2.4 * gap), gap * 0.85);
    });
    return limit;
  });
  // Reserve imminent merges/crossings before vehicles become side-by-side.
  // The nearer vehicle clears first; stable index order resolves equal arrivals.
  const ahead = fleet.map((vehicle) =>
    [0, 2, 4, 6, 8, 10, 12].map((distance) => {
      const pose = sampleTrafficRoute(
        vehicleTrafficRoute(vehicle),
        vehicle.distance + distance,
      );
      return {
        ...pose,
        distance,
        forwardX: Math.sin(pose.heading),
        forwardZ: Math.cos(pose.heading),
      };
    }),
  );
  for (let i = 0; i < fleet.length; i++) {
    for (let j = i + 1; j < fleet.length; j++) {
      const pair = `${i}:${j}`;
      if (
        Math.hypot(
          positions[i].x - positions[j].x,
          positions[i].z - positions[j].z,
        ) > 23
      ) {
        reservations.delete(pair);
        continue;
      }
      // Straight followers are already handled above. Looking ahead along both
      // curved paths also catches a turning vehicle before it joins their lane.
      let crossing: { a: number; b: number; score: number } | undefined;
      for (const a of ahead[i])
        for (const b of ahead[j]) {
          const dx = b.x - a.x,
            dz = b.z - a.z;
          if (dx * dx + dz * dz > 20) continue;
          // Oriented vehicle footprints also protect an oncoming lane from
          // the front corner of a long van during a tight junction turn.
          const dot = Math.abs(
            a.forwardX * b.forwardX + a.forwardZ * b.forwardZ,
          );
          const cross = Math.abs(
            a.forwardX * b.forwardZ - a.forwardZ * b.forwardX,
          );
          const alongExtent = 1.92 * (1 + dot) + 1.08 * cross;
          const sideExtent = 1.08 * (1 + dot) + 1.92 * cross;
          if (
            Math.abs(dx * a.forwardX + dz * a.forwardZ) >= alongExtent ||
            Math.abs(dx * a.forwardZ - dz * a.forwardX) >= sideExtent ||
            Math.abs(dx * b.forwardX + dz * b.forwardZ) >= alongExtent ||
            Math.abs(dx * b.forwardZ - dz * b.forwardX) >= sideExtent
          )
            continue;
          const score = a.distance + b.distance;
          if (!crossing || score < crossing.score)
            crossing = { a: a.distance, b: b.distance, score };
        }
      if (!crossing) {
        reservations.delete(pair);
        continue;
      }
      // Hold the same priority until the crossing has cleared. Changing it
      // halfway through a turn would strand a van across the oncoming lane.
      const yieldIndex =
        reservations.get(pair) ?? (crossing.a > crossing.b + 0.5 ? i : j);
      reservations.set(pair, yieldIndex);
      const distance = yieldIndex === i ? crossing.a : crossing.b;
      const gap = Math.max(0, distance - 4.5);
      limits[yieldIndex] = Math.min(
        limits[yieldIndex],
        Math.sqrt(2 * 2.4 * gap),
        gap * 0.9,
      );
    }
  }
  fleet.forEach((vehicle, index) => {
    const pace = conditions.speedAt?.(positions[index]) ?? 1;
    tickTraffic(
      vehicle,
      elapsed,
      limits[index],
      pace,
      conditions.stopDuration?.(vehicle, index) ?? 1.4,
    );
  });
}
