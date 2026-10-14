import { jev, type Decision, type DecisionInput } from "./jev";
import {
  game,
  resolveOrder,
  setPolicy,
  select,
  focusPlace,
  log,
  triggerIncident,
  homeCamera,
  assignOrder,
  getEligibleVans,
} from "../sim/engine";
import { placeById } from "../data/map";
import type { Policy } from "../types";

interface RequestContext {
  policyRevision: number;
  commandSequence?: number;
}
let generation = -1;
let commandSequence = 0;
const sent = new Set<string>();
const contexts = new WeakMap<Decision, RequestContext>();
// Revisions from earlier queued commands may precede a newer queued command.
// Other revisions represent a new player choice and invalidate pending proposals.
const commandRevisions = new Map<number, number>();
let ready: Decision[] = [];
let showcaseColdCommand: string | undefined;
let showcaseColdFollowPending = false;

export function resetAssistance() {
  generation = game.generation;
  sent.clear();
  ready = [];
  commandRevisions.clear();
  commandSequence = 0;
  showcaseColdCommand = undefined;
  showcaseColdFollowPending = false;
  jev.reset(generation);
  if (game.phase === "playing" && game.mode === "showcase" && game.time === 0)
    game.cinematic = true;
}

function queue(input: DecisionInput, sequence?: number) {
  const context: RequestContext = {
    policyRevision: game.policyRevision,
    commandSequence: sequence,
  };
  void jev.enqueue(input).then((decision) => {
    if (decision.generation !== game.generation) return;
    contexts.set(decision, context);
    ready.push(decision);
  });
}

export function command(text: string) {
  if (!text.trim() || game.phase !== "playing" || game.mode === "battle")
    return;
  if (generation !== game.generation) resetAssistance();
  const sequence = ++commandSequence;
  const entityId = `command-${generation}-${sequence}`;
  queue({ kind: "command", text: text.trim(), entityId, generation }, sequence);
  log(`Dispatch: “${text.trim()}”`, "info");
  return entityId;
}

function policyIsCurrent(decision: Decision) {
  const context = contexts.get(decision);
  if (!context || context.policyRevision === game.policyRevision) return true;
  if (decision.kind !== "command" || context.commandSequence === undefined)
    return false;
  for (
    let revision = context.policyRevision + 1;
    revision <= game.policyRevision;
    revision++
  ) {
    const appliedSequence = commandRevisions.get(revision);
    if (
      appliedSequence === undefined ||
      appliedSequence >= context.commandSequence
    )
      return false;
  }
  return true;
}

function needsReview(decision: Decision) {
  return (
    decision.status === "review" ||
    decision.needsSelection === true ||
    decision.choice === "ambiguous" ||
    decision.choice === "unclear" ||
    (decision.source === "jev" &&
      ((decision.confidence ?? 0) < 0.75 ||
        (decision.clarification ?? 1) >= 0.35))
  );
}

function apply(decision: Decision, approved = false, override?: string) {
  // Cancelled requests can contain a valid local choice; their terminal status
  // always wins, including when connection changes without a shift restart.
  if (decision.status === "rejected" || decision.status === "applied") {
    if (
      !approved &&
      decision.status === "rejected" &&
      decision.choice === "unsupported" &&
      !decision.error?.startsWith("Cancelled")
    ) {
      log(
        "Try “Prioritize chilled deliveries”, “Switch to deadline first”, or “Show van three”.",
        "info",
      );
    }
    return;
  }
  if (decision.generation !== game.generation || game.phase !== "playing") {
    decision.status = "rejected";
    return;
  }

  let choice = override ?? decision.choice;
  let target = decision.target;
  if (approved && override && /^van-[1-8]$/.test(override)) {
    choice = "show_van";
    target = override;
  }

  if (decision.kind === "order") {
    const order = game.orders.find((order) => order.id === decision.entityId);
    if (
      !order ||
      order.status !== "queued" ||
      order.interpretation === "manual"
    ) {
      decision.status = "rejected";
      return;
    }
    if (!approved && needsReview(decision)) {
      order.interpretation = "review";
      decision.status = "review";
      return;
    }
    if (
      !placeById[order.destination] ||
      !["standard", "chilled"].includes(choice)
    ) {
      order.interpretation = "review";
      decision.status = "review";
      return;
    }
    resolveOrder(
      order.id,
      choice,
      decision.urgency ?? 0,
      approved ? "manual" : decision.source,
    );
    decision.status = order.interpretation === "review" ? "review" : "applied";
    return;
  }

  if (
    decision.kind === "incident" &&
    !game.incidents.some(
      (incident) =>
        incident.id === decision.entityId && incident.until > game.time,
    )
  ) {
    decision.status = "rejected";
    return;
  }
  if (
    ["cold", "deadline", "balanced"].includes(choice) &&
    !policyIsCurrent(decision)
  ) {
    decision.status = "rejected";
    log(
      "A pending dispatch proposal was skipped because you chose a newer policy.",
      "ai",
    );
    return;
  }
  if (!approved && needsReview(decision)) {
    decision.status = "review";
    log("A dispatch interpretation needs your review.", "ai");
    return;
  }
  if (
    approved &&
    decision.needsSelection &&
    !(
      override &&
      (/^van-[1-8]$/.test(override) ||
        override === "focus_west" ||
        override === "focus_east")
    )
  ) {
    decision.status = "review";
    log(
      "Choose a specific depot or van before applying this interpretation.",
      "info",
    );
    return;
  }

  if (["cold", "deadline", "balanced"].includes(choice)) {
    if (
      decision.kind === "incident" &&
      !approved &&
      (game.policyLocked || !game.auto)
    ) {
      decision.status = "review";
      return;
    }
    if (!setPolicy(choice as Policy, decision.kind === "command" || approved)) {
      decision.status = "rejected";
      return;
    }
    const sequence = contexts.get(decision)?.commandSequence;
    if (!approved && decision.kind === "command" && sequence !== undefined)
      commandRevisions.set(game.policyRevision, sequence);
    decision.status = "applied";
    log(
      `${choice === "cold" ? "Cold first" : choice === "deadline" ? "Deadline first" : "Balanced"} selected · ${decision.source === "jev" ? "Jev" : "local interpretation"}.`,
      "ai",
    );
    if (
      game.mode === "showcase" &&
      decision.entityId === showcaseColdCommand &&
      choice === "cold"
    ) {
      // Only a genuinely applied interpretation releases the waiting cold job.
      game.auto = true;
      showcaseColdFollowPending = true;
    }
  } else if (choice === "focus_west" || choice === "focus_east") {
    focusPlace(choice === "focus_west" ? "west-depot" : "east-depot");
    decision.status = "applied";
  } else if (
    choice === "show_van" &&
    target &&
    game.vans.some((van) => van.id === target)
  ) {
    select({ type: "van", id: target });
    game.follow = true;
    decision.status = "applied";
  } else if (choice === "none") {
    decision.status = "applied";
  } else {
    decision.status = "rejected";
    log(
      "Try “Prioritize chilled deliveries”, “Switch to deadline first”, or “Show van three”.",
      "info",
    );
  }
}

export function approveDecision(decision: Decision, choice?: string) {
  if (game.paused) {
    log("Resume the shift before applying a review.", "info");
    return;
  }
  apply(decision, true, choice);
}

export function updateAssistance() {
  if (generation !== game.generation) resetAssistance();
  if (game.phase !== "playing" || game.mode === "battle") return;
  if (!game.paused) {
    for (const decision of ready.splice(0)) apply(decision);
    for (const decision of jev.decisions) {
      if (decision.status !== "review") continue;
      if (
        decision.generation !== game.generation ||
        (decision.kind === "order" &&
          !game.orders.some(
            (order) =>
              order.id === decision.entityId &&
              order.status === "queued" &&
              order.interpretation !== "manual",
          )) ||
        (decision.kind === "incident" &&
          !game.incidents.some(
            (incident) =>
              incident.id === decision.entityId && incident.until > game.time,
          )) ||
        (["cold", "deadline", "balanced"].includes(decision.choice) &&
          !policyIsCurrent(decision))
      )
        decision.status = "rejected";
    }
  }
  for (const order of game.orders) {
    if (
      order.status !== "queued" ||
      order.interpretation === "manual" ||
      sent.has(order.id)
    )
      continue;
    sent.add(order.id);
    queue({
      kind: "order",
      text: order.note,
      destination: placeById[order.destination]?.name,
      entityId: order.id,
      generation,
    });
  }
  for (const incident of game.incidents) {
    if (sent.has(incident.id)) continue;
    sent.add(incident.id);
    queue({
      kind: "incident",
      text: incident.report,
      entityId: incident.id,
      generation,
    });
  }

  if (game.mode !== "showcase" || game.paused) return;
  const time = game.time;
  if (time >= 8 && game.showcaseBeat < 1) {
    game.showcaseBeat = 1;
    game.cinematic = false;
    select({ type: "van", id: "van-5" });
    game.follow = true;
  }
  if (time >= 14 && game.showcaseBeat < 2) {
    const van = getEligibleVans("TO-005").find((van) => !van.chilled);
    if (van && assignOrder("TO-005", van.id)) game.showcaseBeat = 2;
  }
  if (time >= 18 && game.showcaseBeat < 3) {
    game.showcaseBeat = 3;
    game.follow = false;
    triggerIncident("bridge");
    game.cameraFocus = { x: 0, z: -24, serial: -game.generation - 1 };
  }
  if (time >= 30 && game.showcaseBeat < 4) {
    game.showcaseBeat = 4;
    select({ type: "order", id: "TO-002" });
    showcaseColdCommand = command("Prioritize chilled deliveries.");
  }
  if (showcaseColdFollowPending) {
    const coldOrder = game.orders.find((order) => order.id === "TO-002");
    if (coldOrder?.vanId) {
      if (time < 43) {
        select({ type: "van", id: coldOrder.vanId });
        game.follow = true;
      }
      showcaseColdFollowPending = false;
    }
  }
  if (time >= 43 && game.showcaseBeat < 5) {
    game.showcaseBeat = 5;
    triggerIncident("power");
    focusPlace("west-depot");
  }
  if (time >= 46 && game.showcaseBeat < 6) {
    game.showcaseBeat = 6;
    command("Something is wrong at the depot.");
  }
  if (time >= 58 && game.showcaseBeat < 7) {
    game.showcaseBeat = 7;
    homeCamera();
    game.daylight = 0.95;
  }
}
