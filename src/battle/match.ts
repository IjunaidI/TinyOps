import {
  createSimulation,
  playerSimulation,
  type Simulation,
} from "../sim/engine";
import { resetAssistance } from "../ai/controller";
import { jev, type Decision, type DecisionInput } from "../ai/jev";
import { placeById } from "../data/map";
import { createChaos, type ChaosSession, type MatchVariant } from "./chaos";

export type Opponent = "jev" | "local";
export const rival = createSimulation();
export const baseline = createSimulation();
export const chaos = {
  you: null as ChaosSession | null,
  rival: null as ChaosSession | null,
  baseline: null as ChaosSession | null,
};
export const match = {
  active: false,
  opponent: "jev" as Opponent,
  variant: "classic" as MatchVariant,
  briefCount: 0,
  generation: -1,
  pending: false,
  issue: null as string | null,
  liveDecisions: 0,
  lastAction: "Waiting for the first orders.",
  lastModel: null as string | null,
  lastLatency: null as number | null,
  history: [] as {
    time: number;
    you: number;
    rival: number;
    baseline: number;
  }[],
};
let epoch = 0;
let sequence = 0;
let nextThink = 0;
let lastSample = -1;
let ready: { decision: Decision; input: DecisionInput } | null = null;

function brief(sim: Simulation) {
  for (const order of sim.game.orders)
    if (order.status === "queued" && order.interpretation === "pending")
      sim.resolveOrder(
        order.id,
        order.chilled ? "chilled" : "standard",
        0,
        "local",
      );
}
export function startMatch(
  opponent: Opponent,
  variant: MatchVariant = "classic",
) {
  if (opponent === "jev" && (!jev.connected || jev.error)) return false;
  stopMatch();
  playerSimulation.startGame("battle");
  resetAssistance();
  rival.startGame("battle");
  const g = playerSimulation.game;
  g.auto = false;
  g.speed = 1;
  rival.game.auto = opponent === "local";
  rival.game.incidentCameras = false;
  rival.game.policy = "deadline";
  if (variant === "chaos") {
    baseline.startGame("battle");
    baseline.game.auto = true;
    baseline.game.policy = "deadline";
    baseline.game.incidentCameras = false;
    chaos.you = createChaos(playerSimulation);
    chaos.rival = createChaos(rival);
    chaos.baseline = createChaos(baseline);
    brief(baseline);
  }
  brief(playerSimulation);
  brief(rival);
  Object.assign(match, {
    active: true,
    opponent,
    variant,
    briefCount: 0,
    generation: g.generation,
    pending: false,
    issue: null,
    liveDecisions: 0,
    lastAction:
      opponent === "jev"
        ? "Jev is considering the opening orders."
        : "Local practice dispatcher ready.",
    lastModel: null,
    lastLatency: null,
    history: [{ time: 0, you: 0, rival: 0, baseline: 0 }],
  });
  nextThink = 0;
  sequence = 0;
  lastSample = 0;
  playerSimulation.log(
    opponent === "jev"
      ? "Match started: you vs live Jev. Identical city, separate fleets."
      : "Practice match started: you vs Local Autopilot.",
  );
  return true;
}
export function stopMatch() {
  epoch++;
  match.active = false;
  match.pending = false;
  match.issue = null;
  ready = null;
  chaos.you = null;
  chaos.rival = null;
  chaos.baseline = null;
}
function suspend(message: string) {
  match.issue = message;
  match.pending = false;
  playerSimulation.game.paused = true;
  rival.game.paused = true;
  if (match.variant === "chaos") baseline.game.paused = true;
  match.lastAction = "Both cities paused. No fallback actions were applied.";
}
export function retryMatch() {
  if (
    !match.active ||
    match.opponent !== "jev" ||
    !jev.connected ||
    jev.attempts >= jev.requestCap
  )
    return false;
  epoch++;
  ready = null;
  match.pending = false;
  match.issue = null;
  nextThink = rival.game.time;
  // Keep both clocks paused while the retry resolves. The player resumes them.
  submitDecision(true);
  return true;
}
function decisionInput(): DecisionInput | null {
  const inbox = chaos.rival?.decisionInput(match.generation);
  if (inbox) return inbox;
  const g = rival.game;
  const queued = g.orders.filter((o) => o.status === "queued");
  const candidates: Record<string, string> = {
    wait: "Wait two simulation seconds before considering another assignment. No order is assigned.",
  };
  for (const order of queued)
    for (const option of rival.getAssignmentOptions(order.id)) {
      candidates[`${order.id}|${option.van.id}`] =
        `${order.id} with ${option.van.name}: pickup ${option.pickupSeconds.toFixed(1)}s; depot wait ${option.outageSeconds.toFixed(1)}s; delivery completion ${option.totalSeconds.toFixed(1)}s from now; due in ${(order.due - g.time).toFixed(1)}s; ${order.chilled ? "chilled" : "standard"}; ${option.van.chilled ? "refrigerated van" : "standard van"}.`;
    }
  if (Object.keys(candidates).length === 1) return null;
  const rushCandidates: Record<string, string> = {
    none: "Save the boost; each unused boost is worth 25 points.",
  };
  if (g.boosts > 0)
    for (const van of g.vans)
      if (van.rushUntil <= g.time)
        rushCandidates[van.id] =
          `${van.name}: ${van.state}, ${van.orderId ?? "no current order"}. Give 25% extra road speed for 15 seconds, including if assigned by this decision.`;
  return {
    kind: "dispatch",
    text: `Jev match dispatch at ${g.time.toFixed(1)}s`,
    entityId: `match-${match.generation}-${++sequence}`,
    generation: match.generation,
    revision: chaos.rival?.state.revision,
    candidates,
    rushCandidates,
    snapshot: {
      elapsedSeconds: g.time,
      shiftEndsAt: 360,
      score: g.score,
      boostsRemaining: g.boosts,
      ...(chaos.rival ? { customerContext: chaos.rival.publicState() } : {}),
      orders: queued.map((o) => ({
        id: o.id,
        note: o.note,
        source: placeById[o.source].name,
        destination: placeById[o.destination].name,
        chilled: o.chilled,
        dueIn: Math.round(o.due - g.time),
        expiresIn: Math.round(o.expiry - g.time),
      })),
      incidents: g.incidents.map((i) => ({
        report: i.report,
        endsIn: Math.round(i.until - g.time),
      })),
      fleet: g.vans.map((v) => ({
        id: v.id,
        state: v.state,
        chilled: v.chilled,
        job: v.orderId ?? null,
        rushRemaining: Math.max(0, v.rushUntil - g.time),
      })),
    },
  };
}
function submitDecision(whilePaused = false) {
  const g = playerSimulation.game;
  if (
    !match.active ||
    match.opponent !== "jev" ||
    match.pending ||
    ready ||
    match.issue ||
    g.phase !== "playing" ||
    (g.paused && !whilePaused)
  )
    return;
  const input = decisionInput();
  if (!input) return;
  if (!jev.connected || jev.attempts >= jev.requestCap) {
    suspend(
      jev.attempts >= jev.requestCap
        ? "The 100-request limit was reached. This match cannot be scored as complete."
        : "Jev disconnected. Reconnect to continue this same match.",
    );
    return;
  }
  const requestedEpoch = epoch;
  match.pending = true;
  void jev
    .enqueue(input)
    .then((decision) => {
      if (
        requestedEpoch !== epoch ||
        !match.active ||
        match.generation !== g.generation ||
        g.phase !== "playing"
      )
        return;
      match.pending = false;
      if (decision.source !== "jev" || decision.status === "rejected") {
        // Never silently substitute a local bot in a live competition.
        suspend(
          (decision.error ?? "Jev could not choose an action.")
            .replace(/Local (?:Autopilot|assistance)[^.]*\.?/g, "")
            .replace(/Local Autopilot handled (?:this|the) input\./g, ""),
        );
        return;
      }
      ready = { decision, input };
    })
    .catch(() => {
      if (requestedEpoch === epoch && match.active)
        suspend(
          "The Jev request failed. Reconnect or retry to continue the match.",
        );
    });
}
function applyReady() {
  if (!ready || playerSimulation.game.paused) return;
  const { decision, input } = ready;
  ready = null;
  const g = rival.game;
  if (
    input.revision !== undefined &&
    input.revision !== chaos.rival?.state.revision
  ) {
    decision.status = "rejected";
    nextThink = g.time;
    match.lastAction = "New information arrived; Jev is updating its plan.";
    return;
  }
  if (
    decision.generation !== match.generation ||
    !(decision.choice in (input.candidates ?? {}))
  ) {
    decision.status = "rejected";
    return;
  }
  let assigned = false;
  if (decision.kind === "inbox") {
    if (!chaos.rival?.applyDecision(decision)) {
      decision.status = "rejected";
      nextThink = g.time + 0.5;
      match.lastAction =
        "That inbox action is no longer available; Jev will reconsider.";
      return;
    }
    match.lastAction =
      chaos.rival.state.inbox.find((m) => m.id === decision.entityId)
        ?.outcome ?? "Message processed";
    nextThink = g.time + 0.25;
  } else if (decision.choice === "wait") {
    match.lastAction = "Jev chose to wait for two seconds.";
    nextThink = g.time + 2;
  } else {
    const [orderId, vanId] = decision.choice.split("|");
    // Revalidate against the current city, not the request's potentially stale snapshot.
    assigned = rival.assignOrder(orderId, vanId);
    if (!assigned) {
      decision.status = "rejected";
      nextThink = g.time;
      match.lastAction = "An old choice expired; Jev is choosing again.";
      return;
    }
    const order = g.orders.find((o) => o.id === orderId)!;
    if (order.assignment) order.assignment.reason = "Chosen by live Jev";
    match.lastAction = `${g.vans.find((v) => v.id === vanId)!.name} → ${placeById[order.destination].name}`;
    nextThink = g.time + 0.25;
  }
  if (
    decision.rushVan &&
    decision.rushVan !== "none" &&
    decision.rushVan in (input.rushCandidates ?? {}) &&
    rival.rushVan(decision.rushVan)
  )
    match.lastAction += ` · Rush ${decision.rushVan.replace("van-", "")}`;
  decision.status = "applied";
  chaos.rival?.remember(decision);
  match.liveDecisions++;
  match.lastModel = decision.model;
  match.lastLatency = decision.durationMs;
}
export function updateMatch() {
  if (!match.active || playerSimulation.game.mode !== "battle") return;
  if (playerSimulation.game.phase !== "playing") {
    if (match.pending || ready) {
      epoch++;
      ready = null;
      match.pending = false;
      jev.reset(playerSimulation.game.generation);
    }
    return;
  }
  if (match.issue) {
    playerSimulation.game.paused = true;
    rival.game.paused = true;
    if (match.variant === "chaos") baseline.game.paused = true;
    return;
  }
  rival.game.paused = playerSimulation.game.paused;
  if (match.variant === "chaos")
    baseline.game.paused = playerSimulation.game.paused;
  if (playerSimulation.game.paused) return;
  applyReady();
  if (match.opponent === "jev" && rival.game.time >= nextThink)
    submitDecision();
}
export function tickMatch(dt: number) {
  if (!match.active) return;
  const g = playerSimulation.game;
  if (match.issue) {
    g.paused = true;
    rival.game.paused = true;
    if (match.variant === "chaos") baseline.game.paused = true;
    return;
  }
  if (g.paused || g.phase !== "playing") {
    rival.game.paused = g.paused;
    if (match.variant === "chaos") baseline.game.paused = g.paused;
    return;
  }
  g.auto = false;
  g.speed = 1;
  rival.game.speed = 1;
  rival.game.paused = false;
  brief(playerSimulation);
  brief(rival);
  playerSimulation.tick(dt);
  rival.tick(dt);
  if (match.variant === "chaos") {
    baseline.game.paused = false;
    baseline.game.speed = 1;
    brief(baseline);
    baseline.tick(dt);
    brief(baseline);
  }
  brief(playerSimulation);
  brief(rival);
  const sample = Math.floor(g.time / 5);
  if (sample !== lastSample || g.time >= 360) {
    lastSample = sample;
    match.history.push({
      time: g.time,
      you: g.score,
      rival: rival.game.score,
      baseline: baseline.game.score,
    });
  }
}

export function sendSharedBrief(text: string) {
  const clean = text.trim().slice(0, 240);
  if (
    !clean ||
    !chaos.you ||
    !chaos.rival ||
    !chaos.baseline ||
    match.briefCount >= 3 ||
    playerSimulation.game.phase !== "playing" ||
    playerSimulation.game.paused
  )
    return false;
  const id = `shared-${++match.briefCount}`;
  for (const session of [chaos.you, chaos.rival, chaos.baseline])
    session.addBrief(clean, id);
  nextThink = rival.game.time;
  return true;
}
export function matchResult() {
  if (
    !match.active ||
    playerSimulation.game.phase !== "ended" ||
    rival.game.phase !== "ended" ||
    match.issue
  )
    return null;
  if (match.opponent === "jev" && match.liveDecisions === 0)
    return "unverified" as const;
  const delta = playerSimulation.game.score - rival.game.score;
  return delta > 0
    ? ("win" as const)
    : delta < 0
      ? ("loss" as const)
      : ("tie" as const);
}
