import { edges, nodeById, placeById } from "../data/map";
import type {
  GameState,
  IncidentKind,
  Mode,
  Order,
  Policy,
  Selection,
  Van,
} from "../types";

export interface AssignmentOption {
  van: Van;
  pickupSeconds: number;
  outageSeconds: number;
  deliverySeconds: number;
  totalSeconds: number;
  onTime: boolean;
  pickupRoute: string[];
  deliveryRoute: string[];
}

export interface SimulationRules {
  beforeStep?: () => void;
  judgeDelivery?: (
    order: Order,
    van: Van,
    time: number,
  ) => {
    accepted: boolean;
    onTime: boolean;
    bonus: number;
    reason?: string;
  };
}

/** Every district owns its clock, traffic, routes and scenario cursor. */
export function createSimulation() {
  const VAN_SPEED = 5.8;
  const SHIFT_SECONDS = 360;
  const lane = 1.05;
  let feedSerial = 0;
  let focusSerial = 0;
  let routeSerial = 0;
  let nextOrder = 0;
  let freeBoostAt = 90;
  const scheduled = new Set<IncidentKind>();
  const waitingStates = new Map<string, Van["state"]>();
  const stopTimers = new Map<string, number>();
  const junctionOwner = new Map<string, { vanId: string; until: number }>();
  let rules: SimulationRules = {};

  const game: GameState = {
    generation: 0,
    phase: "welcome",
    mode: "shift",
    time: 0,
    speed: 1,
    paused: false,
    score: 0,
    delivered: 0,
    onTime: 0,
    failed: 0,
    boosts: 3,
    policy: "balanced",
    policyLocked: false,
    policyRevision: 0,
    auto: true,
    orders: [],
    vans: [],
    incidents: [],
    feed: [],
    pulses: [],
    routeVisuals: [],
    previewVan: null,
    incidentCameras: true,
    cameraInteraction: 0,
    sceneMoment: null,
    selection: null,
    cinematic: false,
    follow: false,
    daylight: null,
    reduced: false,
    cameraFocus: null,
    cameraHome: 0,
    showcaseBeat: 0,
    medal: "",
  };

  const adjacency = new Map<
    string,
    { node: string; edge: (typeof edges)[number]; length: number }[]
  >();
  for (const edge of edges) {
    const a = nodeById[edge.a],
      b = nodeById[edge.b];
    const length = Math.hypot(a.x - b.x, a.z - b.z);
    for (const [from, to] of [
      [edge.a, edge.b],
      [edge.b, edge.a],
    ]) {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from)!.push({ node: to, edge, length });
    }
  }

  function incidentActive(kind: IncidentKind) {
    return game.incidents.some(
      (incident) => incident.kind === kind && incident.until > game.time,
    );
  }
  function edgeBetween(a: string, b: string) {
    return adjacency.get(a)?.find((link) => link.node === b);
  }
  function isClosed(a: string, b: string) {
    return (
      edgeBetween(a, b)?.edge.kind === "bridge" && incidentActive("bridge")
    );
  }
  function edgeFactor(a: string, b: string) {
    return edgeBetween(a, b)?.edge.kind === "market" &&
      incidentActive("congestion")
      ? 0.32
      : 1;
  }

  // The first item is the next node, not the starting node. An empty route can mean
  // that the target has already been reached; Infinity explicitly means blocked.
  function shortestPath(
    from: string,
    to: string,
  ): { route: string[]; cost: number } {
    if (from === to) return { route: [], cost: 0 };
    const costs = new Map<string, number>([[from, 0]]);
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    while (true) {
      let current: string | undefined;
      let best = Infinity;
      for (const [id, cost] of costs)
        if (
          !visited.has(id) &&
          (cost < best || (cost === best && id < (current ?? "z")))
        ) {
          best = cost;
          current = id;
        }
      if (!current || current === to) break;
      visited.add(current);
      for (const link of adjacency.get(current) ?? []) {
        if (isClosed(current, link.node)) continue;
        const cost = best + link.length / edgeFactor(current, link.node);
        if (cost < (costs.get(link.node) ?? Infinity)) {
          costs.set(link.node, cost);
          previous.set(link.node, current);
        }
      }
    }
    if (!costs.has(to)) return { route: [], cost: Infinity };
    const route: string[] = [];
    for (let at = to; at !== from; at = previous.get(at)!) route.unshift(at);
    return { route, cost: costs.get(to)! };
  }

  function log(
    text: string,
    kind: "info" | "delivery" | "incident" | "ai" = "info",
  ) {
    game.feed.unshift({ id: ++feedSerial, time: game.time, text, kind });
    game.feed.splice(40);
  }

  const scenario: {
    source: string;
    destination: string;
    chilled?: boolean;
    note: string;
  }[] = [
    {
      source: "west-depot",
      destination: "cafe",
      note: "The cafe opens shortly and this is the last box we are waiting for.",
    },
    {
      source: "east-depot",
      destination: "clinic",
      chilled: true,
      note: "Chilled medicine for Hillview Clinic. Please keep it refrigerated; the nurse needs it soon.",
    },
    {
      source: "west-depot",
      destination: "market",
      note: "Regular stock top-up for the market. Any time this afternoon is fine.",
    },
    {
      source: "east-depot",
      destination: "bakery",
      note: "A carton of paper bags for Morning Bakery. A normal delivery is fine.",
    },
    {
      source: "west-depot",
      destination: "maple",
      note: "A new reading lamp for Maple House. No rush.",
    },
    {
      source: "east-depot",
      destination: "grocer",
      chilled: true,
      note: "Please use a chilled van; these groceries need to stay cold.",
    },
    {
      source: "west-depot",
      destination: "books",
      note: "The book club starts soon. Could these books arrive quickly?",
    },
    {
      source: "west-depot",
      destination: "willow",
      note: "Ordinary parcel for Willow House. Ring the doorbell.",
    },
    {
      source: "east-depot",
      destination: "cafe",
      note: "The cafe needs these takeaway cups urgently, please.",
    },
    {
      source: "west-depot",
      destination: "clinic",
      chilled: true,
      note: "Temperature-sensitive clinic supplies. Refrigeration is essential, and the appointment starts soon.",
    },
    {
      source: "east-depot",
      destination: "studio",
      note: "Clay tools for the studio. Standard delivery whenever convenient.",
    },
    {
      source: "west-depot",
      destination: "terrace",
      note: "A regular parcel for Sunset Terrace. No special handling needed.",
    },
    {
      source: "east-depot",
      destination: "market",
      note: "Market display cards. The stall is opening shortly, so please hurry.",
    },
    {
      source: "west-depot",
      destination: "bakery",
      chilled: true,
      note: "Fresh cream for Morning Bakery. Keep chilled and deliver before service.",
    },
    {
      source: "east-depot",
      destination: "maple",
      note: "Another carton for Maple House. Nothing time-sensitive.",
    },
    {
      source: "west-depot",
      destination: "grocer",
      note: "Shop shelving labels. Normal parcel, no rush.",
    },
    {
      source: "east-depot",
      destination: "books",
      note: "A box of notebooks for Paper & Pine. We need it quickly.",
    },
    {
      source: "east-depot",
      destination: "cafe",
      chilled: true,
      note: "Cold milk for the cafe. It must travel in a refrigerated van.",
    },
    {
      source: "west-depot",
      destination: "studio",
      note: "Glazing brushes for Clay Studio. Regular delivery is fine.",
    },
    {
      source: "east-depot",
      destination: "willow",
      note: "Household supplies for Willow House. No rush.",
    },
    {
      source: "west-depot",
      destination: "market",
      note: "The market is running out of bags. Please send this carton urgently.",
    },
    {
      source: "west-depot",
      destination: "grocer",
      chilled: true,
      note: "Fresh chilled groceries for Green Basket. A cold van is required.",
    },
    {
      source: "east-depot",
      destination: "clinic",
      note: "Another carton for the clinic reception desk, nothing time-sensitive.",
    },
    {
      source: "west-depot",
      destination: "terrace",
      note: "The last parcel for Sunset Terrace. Standard handling, thank you.",
    },
  ];

  function createOrder(index: number, created: number) {
    const item = scenario[index % scenario.length];
    const due = created + (item.chilled ? 55 : 75);
    const order: Order = {
      id: `TO-${String(index + 1).padStart(3, "0")}`,
      source: item.source,
      destination: item.destination,
      created,
      due,
      expiry: due + 40,
      note: item.note,
      chilled: !!item.chilled,
      urgency: 0,
      status: "queued",
      pinned: false,
      interpretation: "pending",
    };
    game.orders.push(order);
    if (index >= 4)
      log(
        `${placeById[item.destination].name}: new ${item.chilled ? "chilled " : ""}delivery request.`,
      );
    return order;
  }

  function makeFleet(): Van[] {
    return Array.from({ length: 8 }, (_, index) => {
      const home = index < 4 ? "west-depot" : "east-depot";
      const node = placeById[home].node;
      const point = nodeById[node];
      // The loading apron starts beside its road node. Movement eases onto lanes.
      const x = point.x + ((index % 4) - 1.5) * 1.5;
      const z = point.z + 3.4;
      return {
        id: `van-${index + 1}`,
        name: `Van ${String(index + 1).padStart(2, "0")}`,
        chilled: index % 4 === 3,
        home,
        node,
        x,
        z,
        prevX: x,
        prevZ: z,
        angle: Math.PI,
        state: "idle",
        route: [],
        edgeProgress: 0,
        timer: 0,
        rushUntil: 0,
        carrying: false,
      };
    });
  }

  function startGame(mode: Mode = "shift") {
    rules = {};
    const reduced = game.reduced;
    Object.assign(game, {
      generation: game.generation + 1,
      phase: "playing",
      mode,
      time: 0,
      speed: 1,
      paused: false,
      score: 0,
      delivered: 0,
      onTime: 0,
      failed: 0,
      boosts: 3,
      policy: "balanced",
      policyLocked: false,
      policyRevision: 0,
      auto: mode !== "battle",
      orders: [],
      vans: makeFleet(),
      incidents: [],
      feed: [],
      pulses: [],
      routeVisuals: [],
      previewVan: null,
      incidentCameras: game.incidentCameras,
      cameraInteraction: game.cameraInteraction + 1,
      sceneMoment: null,
      selection: null,
      cinematic: false,
      follow: false,
      daylight: null,
      reduced,
      cameraFocus: null,
      cameraHome: game.cameraHome + 1,
      showcaseBeat: 0,
      medal: "",
    } satisfies GameState);
    nextOrder = 0;
    freeBoostAt = 90;
    scheduled.clear();
    waitingStates.clear();
    stopTimers.clear();
    junctionOwner.clear();
    for (; nextOrder < 4; nextOrder++) createOrder(nextOrder, 0);
    log(
      mode === "showcase"
        ? "Showcase scenario ready. Every van and delivery uses the running simulation."
        : "Shift started. Eight vans, two depots, one tiny city.",
    );
    if (mode === "showcase") {
      // Authored starting state, advanced through the same load/route transitions.
      for (const order of game.orders)
        resolveOrder(
          order.id,
          order.chilled ? "chilled" : "standard",
          order.id === "TO-001" ? 2 : 1,
          "local",
        );
      assignOrder("TO-001", "van-1");
      assignOrder("TO-003", "van-2");
      assignOrder("TO-004", "van-5");
      for (const van of game.vans.filter((van) => van.orderId)) {
        const order = game.orders.find((order) => order.id === van.orderId)!;
        van.carrying = true;
        order.status = "loaded";
        van.state = "delivering";
        setRoute(van, placeById[order.destination].node);
      }
      // A selected, pinned chilled order remains available for the priority beat.
      game.orders[1].pinned = true;
      game.auto = false;
    }
  }

  function resolveOrder(
    id: string,
    service: string,
    urgency: number,
    source: "local" | "jev" | "manual",
  ) {
    const order = game.orders.find((order) => order.id === id);
    if (!order || order.status !== "queued" || game.phase !== "playing")
      return false;
    if (order.interpretation === "manual" && source !== "manual") return false;
    order.interpretedService = service;
    order.urgency = Math.max(
      0,
      Math.min(3, Number.isFinite(urgency) ? urgency : 0),
    );
    order.classifiedAt = game.time;
    if (
      service === "unclear" ||
      (source !== "manual" && (service === "chilled") !== order.chilled)
    ) {
      order.interpretation = "review";
      log(`${order.id}: transport interpretation needs review.`, "ai");
      return false;
    }
    order.interpretation = source;
    return true;
  }

  function localInterpret(order: Order) {
    const chilled = /chilled|cold|refrigerat|temperature-sensitive/i.test(
      order.note,
    );
    const urgent = /urgent|quickly|hurry|soon|shortly|before service/i.test(
      order.note,
    );
    resolveOrder(
      order.id,
      chilled ? "chilled" : "standard",
      urgent ? 2 : 0,
      "local",
    );
  }

  function available(van: Van) {
    return (
      !van.orderId &&
      !van.carrying &&
      (van.state === "idle" || van.state === "returning")
    );
  }
  // Per-topology cache: repeated fleet comparisons share graph searches. Travel
  // times remain live because Rush duration and outage recovery are time-dependent.
  let estimateTopology = "";
  const estimatePaths = new Map<string, ReturnType<typeof shortestPath>>();
  function estimatePath(from: string, to: string) {
    const topology = `${game.generation}:${game.incidents.map((i) => i.id).join(",")}`;
    if (topology !== estimateTopology) {
      estimateTopology = topology;
      estimatePaths.clear();
    }
    const key = `${from}:${to}`;
    if (!estimatePaths.has(key)) estimatePaths.set(key, shortestPath(from, to));
    return estimatePaths.get(key)!;
  }
  function travelSeconds(cost: number, rushRemaining: number) {
    const boosted = Math.min(
      cost,
      Math.max(0, rushRemaining) * VAN_SPEED * 1.25,
    );
    return boosted / (VAN_SPEED * 1.25) + (cost - boosted) / VAN_SPEED;
  }
  function estimateAssignment(van: Van, order: Order): AssignmentOption {
    const pickup = estimatePath(
      van.edgeTo ?? van.node,
      placeById[order.source].node,
    );
    const delivery = estimatePath(
      placeById[order.source].node,
      placeById[order.destination].node,
    );
    const edge =
      van.edgeFrom && van.edgeTo
        ? edgeBetween(van.edgeFrom, van.edgeTo)
        : undefined;
    const remaining = edge
      ? (edge.length * (1 - van.edgeProgress)) /
        edgeFactor(van.edgeFrom!, van.edgeTo!)
      : 0;
    const rush = Math.max(0, van.rushUntil - game.time);
    const pickupSeconds =
      travelSeconds(pickup.cost + remaining, rush) + pickup.route.length * 0.12;
    const outage =
      order.source === "west-depot"
        ? game.incidents.find((i) => i.kind === "power")
        : undefined;
    const outageSeconds = Math.max(
      0,
      (outage?.until ?? game.time) - game.time - pickupSeconds,
    );
    const loading = 2;
    const deliverySeconds =
      travelSeconds(
        delivery.cost,
        rush - pickupSeconds - outageSeconds - loading,
      ) +
      delivery.route.length * 0.12;
    const totalSeconds =
      pickupSeconds + outageSeconds + loading + deliverySeconds + 2;
    return {
      van,
      pickupSeconds,
      outageSeconds,
      deliverySeconds,
      totalSeconds,
      onTime: game.time + totalSeconds <= order.due,
      pickupRoute: [
        ...(van.edgeTo ? [van.edgeTo] : []),
        ...pickup.route,
        ...(pickup.route.length || van.edgeTo === placeById[order.source].node
          ? []
          : [placeById[order.source].node]),
      ],
      deliveryRoute: delivery.route,
    };
  }
  function getAssignmentOptions(orderId: string): AssignmentOption[] {
    const order = game.orders.find((o) => o.id === orderId);
    if (!order || order.status !== "queued" || order.held) return [];
    return game.vans
      .filter((v) => available(v) && (!order.chilled || v.chilled))
      .map((v) => estimateAssignment(v, order))
      .filter((option) => Number.isFinite(option.totalSeconds))
      .sort(
        (a, b) =>
          a.totalSeconds - b.totalSeconds ||
          Number(a.van.chilled) - Number(b.van.chilled) ||
          a.van.id.localeCompare(b.van.id),
      );
  }
  function getEligibleVans(orderId: string): Van[] {
    return getAssignmentOptions(orderId).map((option) => option.van);
  }
  function vanRoutePoints(van: Van): [number, number][] {
    return [
      [van.x, van.z],
      ...(van.edgeTo ? [van.edgeTo, ...van.route] : van.route).map(
        (id) => [nodeById[id].x, nodeById[id].z] as [number, number],
      ),
    ];
  }
  function assignmentPoints(option: AssignmentOption): [number, number][] {
    return [
      [option.van.x, option.van.z],
      ...[...option.pickupRoute, ...option.deliveryRoute].map(
        (id) => [nodeById[id].x, nodeById[id].z] as [number, number],
      ),
    ];
  }

  function setRoute(van: Van, target: string) {
    van.target = target;
    const path = shortestPath(van.edgeTo ?? van.node, target);
    van.route = path.route;
    if (!Number.isFinite(path.cost)) {
      if (van.state !== "waiting") waitingStates.set(van.id, van.state);
      van.state = "waiting";
    } else if (van.state === "waiting") {
      van.state =
        waitingStates.get(van.id) ?? (van.carrying ? "delivering" : "pickup");
      waitingStates.delete(van.id);
    }
  }

  function assignOrder(orderId: string, vanId?: string, fleetMatch = false) {
    if (game.phase !== "playing" || game.paused) return false;
    const order = game.orders.find((order) => order.id === orderId);
    if (
      !order ||
      order.status !== "queued" ||
      order.held ||
      order.interpretation === "pending" ||
      order.interpretation === "review"
    )
      return false;
    const eligible = getEligibleVans(orderId);
    const van = vanId ? eligible.find((van) => van.id === vanId) : eligible[0];
    if (!van) return false;
    const estimate = estimateAssignment(van, order);
    order.assignment = {
      at: game.time,
      eta: estimate.totalSeconds,
      pickup: estimate.pickupSeconds,
      reason: fleetMatch
        ? "Best fleet fit across the waiting queue"
        : vanId
          ? "Chosen by you"
          : "Fastest compatible delivery estimate",
    };
    game.routeVisuals.push({
      id: ++routeSerial,
      vanId: van.id,
      started: game.time,
      kind: "dispatch",
      points: assignmentPoints(estimate),
      pickupCount: estimate.pickupRoute.length + 1,
    });
    game.routeVisuals = game.routeVisuals.slice(-10);
    order.status = "assigned";
    order.vanId = van.id;
    order.pinned = false;
    van.orderId = order.id;
    van.state = "pickup";
    van.timer = 0;
    setRoute(van, placeById[order.source].node);
    if (!van.edgeTo && van.node === van.target) {
      van.state = "loading";
      van.timer = 2;
    }
    log(`${van.name} assigned to ${placeById[order.destination].name}.`);
    return true;
  }

  function dispatch() {
    if (!game.auto) return;
    const queue = game.orders
      .filter(
        (order) =>
          order.status === "queued" &&
          !order.held &&
          order.interpretation !== "pending" &&
          order.interpretation !== "review",
      )
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          (game.policy === "cold"
            ? Number(b.chilled) - Number(a.chilled)
            : 0) ||
          (game.policy !== "deadline" ? b.urgency - a.urgency : 0) ||
          a.due - b.due ||
          a.id.localeCompare(b.id),
      );
    if (!queue.length) return;
    // Exact matching over the eight-van bitmask. Ranked jobs are preserved first;
    // among equivalent job sets, minimize fleet ETA and deadline lateness together.
    type Plan = { priority: bigint; cost: number; pairs: [string, string][] };
    let states = new Map<number, Plan>([
      [0, { priority: 0n, cost: 0, pairs: [] }],
    ]);
    const better = (a: Plan, b?: Plan) =>
      !b ||
      a.priority > b.priority ||
      (a.priority === b.priority && a.cost < b.cost);
    queue.forEach((order, rank) => {
      const reserveCold =
        game.policy === "cold" &&
        !order.chilled &&
        !order.pinned &&
        game.orders.some(
          (o) =>
            o.chilled &&
            o.status === "queued" &&
            (o.interpretation === "pending" || o.interpretation === "review"),
        );
      const options = getAssignmentOptions(order.id).filter(
        (option) => !reserveCold || !option.van.chilled,
      );
      const next = new Map(states);
      const priority = 1n << BigInt(queue.length - rank - 1);
      for (const [mask, plan] of states)
        for (const option of options) {
          const index = game.vans.indexOf(option.van),
            bit = 1 << index;
          if (mask & bit) continue;
          const late = Math.max(0, game.time + option.totalSeconds - order.due);
          const reserve = !order.chilled && option.van.chilled ? 2 : 0;
          const candidate = {
            priority: plan.priority + priority,
            cost: plan.cost + option.totalSeconds + late * 12 + reserve,
            pairs: [
              ...plan.pairs,
              [order.id, option.van.id] as [string, string],
            ],
          };
          if (better(candidate, next.get(mask | bit)))
            next.set(mask | bit, candidate);
        }
      states = next;
    });
    let best: Plan | undefined;
    for (const plan of states.values()) if (better(plan, best)) best = plan;
    for (const [orderId, vanId] of best?.pairs ?? [])
      assignOrder(orderId, vanId, true);
  }

  function setPolicy(policy: Policy, manual = true) {
    if (!["balanced", "deadline", "cold"].includes(policy)) return false;
    if (!manual && game.policyLocked) return false;
    game.policy = policy;
    if (manual) {
      game.policyLocked = true;
      game.policyRevision++;
    }
    log(
      `${policy === "cold" ? "Cold first" : policy === "deadline" ? "Deadline first" : "Balanced"} dispatch selected${manual ? " · player locked" : ""}.`,
      manual ? "info" : "ai",
    );
    return true;
  }

  /** Edit the dispatch plan, including a parcel already on the road. */
  function reviseOrder(
    id: string,
    change: { destination?: string; due?: number; held?: boolean },
  ) {
    const order = game.orders.find((o) => o.id === id);
    if (
      !order ||
      game.phase !== "playing" ||
      game.paused ||
      ["delivered", "failed"].includes(order.status)
    )
      return false;
    if (change.destination && !placeById[change.destination]) return false;
    if (
      change.due !== undefined &&
      (!Number.isFinite(change.due) || change.due < 0 || change.due > 360)
    )
      return false;
    const van = game.vans.find((v) => v.orderId === id);
    const previous = van ? vanRoutePoints(van) : [];
    const reroute =
      change.destination && change.destination !== order.destination;
    if (change.destination) order.destination = change.destination;
    if (change.due !== undefined) {
      order.due = change.due;
      order.expiry = change.due + 40;
    }
    if (change.held !== undefined) order.held = change.held;
    if (reroute && van?.carrying) {
      van.state = "delivering";
      van.timer = 0;
      setRoute(van, placeById[order.destination].node);
      if (!van.edgeTo && van.node === van.target) arrived(van);
      game.routeVisuals.push({
        id: ++routeSerial,
        vanId: van.id,
        started: game.time,
        kind: "reroute",
        previous,
        points: vanRoutePoints(van),
        pickupCount: 1,
      });
    }
    game.previewVan = null;
    log(
      `${id}: dispatch plan updated${reroute ? ` → ${placeById[order.destination].name}` : ""}${order.held ? " · driver holding" : ""}.`,
    );
    return true;
  }

  function setRules(next: SimulationRules) {
    rules = next;
  }

  function pinOrder(id: string) {
    const order = game.orders.find((order) => order.id === id);
    if (!order || order.status !== "queued") return;
    const pinned = !order.pinned;
    game.orders.forEach((order) => {
      order.pinned = false;
    });
    order.pinned = pinned;
    if (pinned) log(`${order.id} pinned as the next compatible job.`);
  }

  function rushVan(id: string) {
    const van = game.vans.find((van) => van.id === id);
    if (
      !van ||
      game.phase !== "playing" ||
      game.paused ||
      game.boosts < 1 ||
      van.rushUntil > game.time
    )
      return false;
    game.boosts--;
    van.rushUntil = game.time + 15;
    log(`${van.name} has Rush for 15 seconds.`);
    return true;
  }

  function rerouteFleet() {
    for (const van of game.vans)
      if (
        van.target &&
        ["pickup", "delivering", "returning", "waiting"].includes(van.state)
      ) {
        const previous = vanRoutePoints(van);
        setRoute(van, van.target);
        const points = vanRoutePoints(van);
        if (van.orderId && JSON.stringify(previous) !== JSON.stringify(points))
          game.routeVisuals.push({
            id: ++routeSerial,
            vanId: van.id,
            started: game.time,
            kind: "reroute",
            points,
            previous,
            pickupCount: van.carrying ? 1 : points.length,
          });
      }
    game.routeVisuals = game.routeVisuals.slice(-10);
  }

  function triggerIncident(kind: IncidentKind) {
    if (game.phase !== "playing") return null;
    const existing = game.incidents.find(
      (incident) => incident.kind === kind && incident.until > game.time,
    );
    if (existing) return existing;
    const reports = {
      bridge:
        "North Bridge is closed for inspection. Route deliveries through South Crossing.",
      power:
        "Power has gone out at West Depot. The loading bay cannot start new loads.",
      congestion:
        "Riverside Market is backed up. Delivery traffic is moving slowly by the stalls.",
    };
    const incident = {
      id: `incident-${kind}-${Math.round(game.time * 10)}`,
      kind,
      started: game.time,
      until: game.time + { bridge: 35, power: 25, congestion: 30 }[kind],
      report: reports[kind],
    };
    game.incidents.push(incident);
    const point =
      kind === "bridge"
        ? { x: 0, z: -24 }
        : kind === "power"
          ? placeById["west-depot"]
          : placeById.market;
    game.pulses.push({
      x: point.x,
      z: point.z,
      started: game.time,
      kind: "incident",
    });
    log(reports[kind], "incident");
    rerouteFleet();
    return incident;
  }

  function clearIncidents() {
    if (game.incidents.length)
      log(
        "All incident restrictions cleared. Normal routes restored.",
        "incident",
      );
    game.incidents = [];
    rerouteFleet();
  }

  function select(selection: Selection) {
    game.selection = selection;
    game.previewVan = null;
    game.cameraInteraction++;
    game.follow = false;
  }
  function focusPlace(id: string) {
    const place = placeById[id];
    if (!place) return false;
    game.cameraInteraction++;
    game.cameraFocus = { x: place.x, z: place.z, serial: ++focusSerial };
    game.follow = false;
    return true;
  }
  function homeCamera() {
    game.cameraInteraction++;
    game.cameraHome++;
    game.cameraFocus = null;
    game.follow = false;
  }

  function returnHome(van: Van, home = van.home) {
    van.state = "returning";
    van.timer = 0;
    setRoute(van, placeById[home].node);
    if (!van.edgeTo && van.node === van.target) park(van);
  }

  function park(van: Van) {
    van.state = "idle";
    van.carrying = false;
    van.target = undefined;
    van.orderId = undefined;
    van.route = [];
    van.timer = 0;
    waitingStates.delete(van.id);
  }

  function failOrder(order: Order, reason?: string) {
    if (order.status === "failed" || order.status === "delivered") return;
    order.status = "failed";
    order.pinned = false;
    game.failed++;
    game.score -= 50;
    const van = game.vans.find((van) => van.orderId === order.id);
    if (van) {
      van.orderId = undefined;
      returnHome(van, van.carrying ? order.source : van.home);
    }
    log(
      `${order.id} ${reason ?? "expired"}${van?.carrying ? " · parcel returning to its depot" : ""}.`,
      "incident",
    );
  }

  function completeDelivery(van: Van) {
    const order = game.orders.find((order) => order.id === van.orderId);
    if (
      !order ||
      order.status === "failed" ||
      order.status === "delivered" ||
      game.phase !== "playing"
    )
      return;
    if (game.time >= order.expiry) {
      failOrder(order);
      return;
    }
    const judgment = rules.judgeDelivery?.(order, van, game.time);
    if (judgment && !judgment.accepted) {
      failOrder(
        order,
        judgment.reason ?? "did not meet the customer's request",
      );
      return;
    }
    order.status = "delivered";
    order.onTime = judgment?.onTime ?? game.time <= order.due;
    game.delivered++;
    if (order.onTime) game.onTime++;
    const points = (order.onTime ? 100 : 50) + (judgment?.bonus ?? 0);
    game.score += points;
    const destination = placeById[order.destination];
    game.pulses.push({
      x: destination.x,
      z: destination.z,
      started: game.time,
      kind: "delivery",
      onTime: order.onTime,
    });
    log(
      `${destination.name} delivered · +${points}${order.onTime ? " on time" : " late"}.`,
      "delivery",
    );
    van.carrying = false;
    van.orderId = undefined;
    park(van);
  }

  function arrived(van: Van) {
    if (van.state === "pickup") {
      van.state = "loading";
      van.timer = 2;
    } else if (van.state === "delivering") {
      van.state = "unloading";
      van.timer = 2;
    } else if (van.state === "returning") park(van);
  }

  function moveVan(van: Van, dt: number) {
    van.prevX = van.x;
    van.prevZ = van.z;
    if (van.orderId && game.orders.find((o) => o.id === van.orderId)?.held)
      return;
    if (van.state === "loading") {
      const order = game.orders.find((order) => order.id === van.orderId);
      if (!order || order.status === "failed") {
        returnHome(van);
        return;
      }
      if (order.source === "west-depot" && incidentActive("power")) return;
      van.timer -= dt;
      if (van.timer <= 0) {
        order.status = "loaded";
        van.carrying = true;
        van.state = "delivering";
        setRoute(van, placeById[order.destination].node);
      }
      return;
    }
    if (van.state === "unloading") {
      van.timer -= dt;
      if (van.timer <= 0) completeDelivery(van);
      return;
    }
    if (van.state === "idle") {
      if (van.node === placeById[van.home].node) {
        const point = nodeById[van.node];
        const bay = (Number(van.id.slice(4)) - 1) % 4;
        van.x += (point.x + (bay - 1.5) * 1.5 - van.x) * Math.min(1, dt * 3);
        van.z += (point.z + 3.4 - van.z) * Math.min(1, dt * 3);
      }
      return;
    }
    if (van.state === "waiting" && !van.edgeTo) {
      van.timer -= dt;
      if (van.timer <= 0 && van.target) {
        setRoute(van, van.target);
        van.timer = 1;
      }
      return;
    }
    if (!van.edgeTo) {
      if (!van.route.length) {
        arrived(van);
        return;
      }
      if (isClosed(van.node, van.route[0])) {
        if (van.target) setRoute(van, van.target);
        return;
      }
      const stop = stopTimers.get(van.id) ?? 0;
      if (stop > 0) {
        stopTimers.set(van.id, Math.max(0, stop - dt));
        return;
      }
      const next = van.route[0];
      const owner = junctionOwner.get(van.node);
      if (owner && owner.vanId !== van.id && owner.until > game.time) return;
      // Reserve the junction briefly and maintain a minimum entry headway.
      if (
        game.vans.some(
          (other) =>
            other.id !== van.id &&
            other.edgeFrom === van.node &&
            other.edgeTo === next &&
            other.edgeProgress * edgeBetween(van.node, next)!.length < 4,
        )
      )
        return;
      junctionOwner.set(van.node, { vanId: van.id, until: game.time + 0.42 });
      van.edgeFrom = van.node;
      van.edgeTo = van.route.shift();
      van.edgeProgress = 0;
    }
    const from = nodeById[van.edgeFrom!],
      to = nodeById[van.edgeTo!];
    const dx = to.x - from.x,
      dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    const speed =
      VAN_SPEED *
      (van.rushUntil > game.time ? 1.25 : 1) *
      edgeFactor(van.edgeFrom!, van.edgeTo!);
    let progress = Math.min(1, van.edgeProgress + (speed * dt) / length);
    for (const other of game.vans)
      if (
        other.id !== van.id &&
        other.edgeFrom === van.edgeFrom &&
        other.edgeTo === van.edgeTo &&
        other.edgeProgress > van.edgeProgress
      ) {
        progress = Math.min(
          progress,
          Math.max(van.edgeProgress, other.edgeProgress - 3.5 / length),
        );
      }
    van.edgeProgress = progress;
    // Taper lane offsets at intersections; retain graph-exact longitudinal motion.
    const side =
      Math.min(1, (progress * length) / 3, ((1 - progress) * length) / 3) *
      lane;
    const targetX = from.x + dx * progress + (dz / length) * side;
    const targetZ = from.z + dz * progress - (dx / length) * side;
    // A tiny ease removes snapping from loading aprons and gives gentle turns.
    const ease = Math.min(1, dt * 16);
    van.x += (targetX - van.x) * ease;
    van.z += (targetZ - van.z) * ease;
    const desired = Math.atan2(dx, dz);
    const difference = Math.atan2(
      Math.sin(desired - van.angle),
      Math.cos(desired - van.angle),
    );
    van.angle += difference * Math.min(1, dt * 9);
    if (progress >= 1) {
      van.node = van.edgeTo!;
      van.edgeFrom = undefined;
      van.edgeTo = undefined;
      van.edgeProgress = 0;
      stopTimers.set(van.id, 0.12);
      if (!van.route.length && van.node === van.target) arrived(van);
    }
  }

  function finishShift() {
    for (const order of game.orders)
      if (order.status !== "failed" && order.status !== "delivered")
        failOrder(order);
    game.score += game.boosts * 25;
    game.medal =
      game.delivered >= 22 && game.onTime >= 20
        ? "Gold"
        : game.delivered >= 18 && game.onTime >= 15
          ? "Silver"
          : game.delivered >= 14
            ? "Bronze"
            : "Shift complete";
    game.phase = "ended";
    game.paused = true;
    log(
      `Shift complete · ${game.delivered} delivered, ${game.onTime} on time, ${game.failed} failed.`,
    );
  }

  function tick(dt: number) {
    if (game.phase !== "playing" || game.paused || dt <= 0) return;
    // Caller advances at 20 Hz. This guard also protects ad-hoc integrations from
    // a hidden tab's accumulated wall-clock delta.
    dt = Math.min(dt, 0.1);
    game.time = Math.min(
      game.mode === "shift" || game.mode === "battle"
        ? SHIFT_SECONDS
        : Infinity,
      game.time + dt,
    );
    if (
      (game.mode === "shift" || game.mode === "battle") &&
      game.time >= SHIFT_SECONDS
    ) {
      finishShift();
      return;
    }

    while (
      (game.mode === "free" || nextOrder < 24) &&
      game.time + 1e-7 >= (nextOrder - 3) * 12
    ) {
      createOrder(nextOrder, (nextOrder - 3) * 12);
      nextOrder++;
    }
    if (game.mode === "shift" || game.mode === "battle")
      for (const [kind, time] of [
        ["bridge", 60],
        ["power", 135],
        ["congestion", 210],
      ] as const) {
        if (game.time >= time && !scheduled.has(kind)) {
          scheduled.add(kind);
          triggerIncident(kind);
        }
      }
    const endedIncidents = game.incidents.filter(
      (incident) => incident.until <= game.time,
    );
    if (endedIncidents.length) {
      game.incidents = game.incidents.filter(
        (incident) => incident.until > game.time,
      );
      for (const incident of endedIncidents)
        log(
          `${incident.kind === "bridge" ? "North Bridge reopened" : incident.kind === "power" ? "West Depot power restored" : "Market traffic moving normally"}.`,
          "incident",
        );
      rerouteFleet();
    }
    rules.beforeStep?.();
    for (const order of game.orders) {
      if (
        order.status !== "delivered" &&
        order.status !== "failed" &&
        game.time >= order.expiry
      )
        failOrder(order);
      else if (
        order.status === "queued" &&
        order.interpretation === "pending" &&
        game.time - order.created >= 2
      )
        localInterpret(order);
    }
    dispatch();
    for (const van of game.vans) moveVan(van, dt);
    // Reuse a van at the customer's road node before starting its return trip.
    dispatch();
    for (const van of game.vans)
      if (van.state === "idle" && van.node !== placeById[van.home].node)
        returnHome(van);
    game.routeVisuals = game.routeVisuals.filter(
      (v) => game.time - v.started < 8,
    );
    game.pulses = game.pulses.filter((pulse) => game.time - pulse.started < 3);
    if (game.mode === "free" && game.time >= freeBoostAt) {
      game.boosts = Math.min(3, game.boosts + 1);
      freeBoostAt += 90;
    }
  }

  // A living fleet is already present behind the opening card.
  game.vans = makeFleet();

  return {
    game,
    shortestPath,
    log,
    startGame,
    resolveOrder,
    estimateAssignment,
    getAssignmentOptions,
    getEligibleVans,
    vanRoutePoints,
    assignmentPoints,
    assignOrder,
    reviseOrder,
    setRules,
    setPolicy,
    pinOrder,
    rushVan,
    triggerIncident,
    clearIncidents,
    select,
    focusPlace,
    homeCamera,
    tick,
  };
}

export const playerSimulation = createSimulation();
export const {
  game,
  shortestPath,
  log,
  startGame,
  resolveOrder,
  estimateAssignment,
  getAssignmentOptions,
  getEligibleVans,
  vanRoutePoints,
  assignmentPoints,
  assignOrder,
  setPolicy,
  pinOrder,
  rushVan,
  triggerIncident,
  clearIncidents,
  select,
  focusPlace,
  homeCamera,
  tick,
} = playerSimulation;
export type Simulation = ReturnType<typeof createSimulation>;
