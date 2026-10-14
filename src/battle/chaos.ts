import { places, placeById } from "../data/map";
import type { Simulation } from "../sim/engine";
import type { Decision, DecisionInput } from "../ai/jev";

export type MatchVariant = "classic" | "chaos";
export type InboxAction =
  | "apply_update"
  | "ask_destination"
  | "ask_order"
  | "ask_deadline"
  | "acknowledge"
  | "hold";
export interface Message {
  id: string;
  at: number;
  sender: string;
  text: string;
  orderId?: string;
  status: "new" | "waiting" | "handled";
  replies: { at: number; text: string }[];
  questions: string[];
  responseAt?: number;
  pendingQuestion?: string;
  heldOrder?: string;
  outcome?: string;
}
interface DispatchNote {
  at: number;
  sender: string;
  text: string;
  reference?: string;
  // Authoritative customer requirements are never part of a model snapshot.
  contract?: { orderId: string; destination?: string; due?: number };
  answers?: Partial<Record<InboxAction, string>>;
}
const notes: DispatchNote[] = [
  {
    at: 0,
    sender: "Mara · Corner Cafe",
    reference: "TO-001",
    text: "Opening-day change: our pop-up is inside Clay Studio today. Please bring the opening box there, not to our usual cafe.",
    contract: { orderId: "TO-001", destination: "studio" },
  },
  {
    at: 0,
    sender: "Nurse Imani · Hillview Clinic",
    reference: "TO-002",
    text: "The nurse can receive the chilled medicine only before the shift clock reaches 00:45. Please protect this deadline ahead of ordinary shop stock.",
    contract: { orderId: "TO-002", due: 45 },
  },
  {
    at: 0,
    sender: "Leon · Riverside Market",
    reference: "TO-003",
    text: "We're moving this stock to the other shop. Could you send it there instead?",
    contract: { orderId: "TO-003", destination: "grocer" },
    answers: {
      ask_destination:
        "By the other shop I mean Green Basket. Keep the existing delivery deadline.",
    },
  },
  {
    at: 12,
    sender: "Alex · Maple House",
    reference: "TO-005",
    text: "The reading lamp should go to Willow House instead of Maple House. The caretaker will receive it.",
    contract: { orderId: "TO-005", destination: "willow" },
  },
  {
    at: 16,
    sender: "Alex · Maple House",
    reference: "TO-005",
    text: "Correction to my last message: the caretaker has left Willow House. Take that same lamp to Sunset Terrace instead. This replaces my previous address.",
    contract: { orderId: "TO-005", destination: "terrace" },
  },
  {
    at: 24,
    sender: "Nia · Green Basket",
    reference: "TO-006",
    text: "Please have these chilled groceries here by 01:00 on the shift clock. Our refrigerator service team leaves then.",
    contract: { orderId: "TO-006", due: 60 },
  },
  {
    at: 60,
    sender: "Operations desk",
    text: "Clinic work comes first when deadlines conflict. On-time clinic consignments earn an extra 75 points. Keep a refrigerated van available when practical; do not strand a medical job to save a few road seconds.",
  },
  {
    at: 72,
    sender: "Nurse Imani · Hillview Clinic",
    reference: "TO-010",
    text: "For the new clinic supplies, the appointment moved earlier: 02:00 on your shift clock. They still go to Hillview Clinic, still refrigerated.",
    contract: { orderId: "TO-010", due: 120 },
  },
  {
    at: 96,
    sender: "Sam · customer",
    text: "The parcel for my evening gathering needs to go to Clay Studio now. I forgot to include the order number, sorry!",
    contract: { orderId: "TO-012", destination: "studio" },
    answers: {
      ask_order:
        "It's TO-012, the regular parcel originally addressed to Sunset Terrace. Same deadline, new address: Clay Studio.",
    },
  },
  {
    at: 120,
    sender: "Bea · Morning Bakery",
    reference: "TO-014",
    text: "Service begins at 02:45 on the shift clock. That is the new deadline for the chilled cream. Keep the bakery address.",
    contract: { orderId: "TO-014", due: 165 },
  },
  {
    at: 144,
    sender: "Nia · Green Basket",
    reference: "TO-016",
    text: "Those shelving labels are for Paper & Pine. Please reroute this standard parcel there; do not send it to our grocery store.",
    contract: { orderId: "TO-016", destination: "books" },
  },
  {
    at: 168,
    sender: "Mara · Corner Cafe",
    reference: "TO-018",
    text: "This cold milk is for the pop-up too: use the same venue I gave you for the opening box at the start of the shift. Not our usual cafe address.",
    contract: { orderId: "TO-018", destination: "studio" },
  },
  {
    at: 192,
    sender: "Alex · Willow House",
    reference: "TO-020",
    text: "Keep this household-supplies box going to Willow House. The earlier lamp correction does NOT apply to this order. No deadline change.",
  },
  {
    at: 216,
    sender: "Nia · Green Basket",
    reference: "TO-022",
    text: "Our closing time changed. Please deliver these chilled groceries to Green Basket before 04:30 on the shift clock.",
    contract: { orderId: "TO-022", due: 270 },
  },
  {
    at: 228,
    sender: "Clinic reception",
    reference: "TO-023",
    text: "Reception is closed. Please leave our carton with my colleague instead, by 04:45 on the shift clock.",
    contract: { orderId: "TO-023", destination: "maple", due: 285 },
    answers: {
      ask_destination:
        "My colleague is at Maple House. This is still clinic consignment TO-023; it needs to arrive by 04:45.",
    },
  },
  {
    at: 240,
    sender: "Sunset Terrace",
    reference: "TO-024",
    text: "The final parcel still comes to Sunset Terrace. The original 05:15 deadline is right. Please ignore the earlier gathering's address change; that was a different parcel.",
  },
];

export const strategyChoices = {
  efficient:
    "Minimize completion time while honoring the latest customer instructions.",
  medical:
    "Protect clinic consignments and their deadlines before ordinary shop stock when there is a conflict.",
  cold: "Preserve refrigerated capacity for chilled orders; prefer standard vans for ordinary parcels.",
  deadline:
    "Prioritize the earliest customer deadline, accepting longer trips when necessary.",
};
export const strategyNames: Record<string, string> = {
  efficient: "Efficient routes",
  medical: "Clinic first",
  cold: "Protect cold capacity",
  deadline: "Earliest deadline",
};
export const reasonChoices = {
  customer_update: "The customer's latest message changes the delivery plan.",
  clarify:
    "A required order, destination, or deadline is missing; ask before guessing.",
  deadline: "Protect a delivery deadline or avoid a late/failed job.",
  cold_capacity: "Preserve scarce refrigerated capacity.",
  efficient_route:
    "This choice makes efficient use of the current fleet and travel estimates.",
  shared_brief:
    "Follow the operations brief or a shared dispatcher instruction.",
  no_change:
    "The message confirms the existing plan or the job is already complete.",
};
export const inboxActions: Record<InboxAction, string> = {
  apply_update:
    "Update the selected active order with the destination/deadline supported by the latest message and its thread. Release any hold. Select keep for unchanged fields.",
  ask_destination:
    "Ask which named destination the customer means. Reply takes four simulation seconds. Hold the referenced order while waiting.",
  ask_order:
    "Ask which order this message refers to. Reply takes four simulation seconds; do not guess an order number.",
  ask_deadline:
    "Ask for the exact delivery deadline. Reply takes four simulation seconds.",
  acknowledge:
    "The current plan already matches the message, or this is an operations briefing. Record it without changing a route. Release a hold.",
  hold: "Hold the selected order for manual planning. No movement or dispatch until a later update or acknowledgement releases it.",
};
export const timeLabel = (time: number) =>
  `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(time % 60)
    .toString()
    .padStart(2, "0")}`;
export const destinationChoices = {
  keep: "Keep the current destination",
  ...Object.fromEntries(
    places
      .filter((p) => !["depot", "warehouse"].includes(p.kind))
      .map((p) => [p.id, p.name]),
  ),
};
export const deadlineChoices = {
  keep: "Keep the current deadline",
  ...Object.fromEntries(
    Array.from({ length: 21 }, (_, i) => {
      const t = (i + 2) * 15;
      return [String(t), timeLabel(t)];
    }),
  ),
};

export function createChaos(sim: Simulation) {
  const state = {
    inbox: [] as Message[],
    revision: 0,
    strategy: "efficient",
    reportedReason: "",
    memory: [] as string[],
    updates: 0,
    questions: 0,
    serviceFailures: 0,
    bonus: 0,
  };
  const contracts = new Map<
    string,
    {
      destination: string;
      due: number;
      expiry: number;
      changed: boolean;
      medical: boolean;
    }
  >();
  const deliveredNotes = new Set<number>();
  const definitions = new Map<string, DispatchNote>();

  function beforeStep() {
    const g = sim.game;
    for (const o of g.orders)
      if (!contracts.has(o.id))
        contracts.set(o.id, {
          destination: o.destination,
          due: o.due,
          expiry: o.expiry,
          changed: false,
          medical: o.destination === "clinic",
        });
    notes.forEach((note, index) => {
      if (deliveredNotes.has(index) || g.time + 1e-7 < note.at) return;
      if (note.contract && !contracts.has(note.contract.orderId)) return;
      deliveredNotes.add(index);
      const order = note.contract
        ? g.orders.find((o) => o.id === note.contract!.orderId)
        : undefined;
      if (
        note.contract &&
        order &&
        !["delivered", "failed"].includes(order.status)
      ) {
        const c = contracts.get(order.id)!;
        if (note.contract.destination)
          c.destination = note.contract.destination;
        if (note.contract.due !== undefined) {
          c.due = note.contract.due;
          c.expiry = c.due + 40;
        }
        c.changed = true;
      }
      const message: Message = {
        id: `inbox-${index + 1}`,
        at: note.at,
        sender: note.sender,
        text: note.text,
        orderId: note.reference,
        status: "new",
        replies: [],
        questions: [],
      };
      state.inbox.push(message);
      definitions.set(message.id, note);
      state.revision++;
      sim.log(`Inbox · ${note.sender}: ${note.text}`, "info");
    });
    for (const message of state.inbox)
      if (
        message.status === "waiting" &&
        g.time >= (message.responseAt ?? Infinity)
      ) {
        const note = definitions.get(message.id);
        const q = message.pendingQuestion as InboxAction;
        const o = sim.game.orders.find(
          (o) => o.id === (note?.contract?.orderId ?? message.orderId),
        );
        let reply = note?.answers?.[q];
        if (!reply && q === "ask_order")
          reply = message.orderId
            ? `This refers to ${message.orderId}.`
            : "This is a shift-wide instruction, not a single parcel.";
        if (!reply && q === "ask_destination")
          reply = note?.contract?.destination
            ? `Please use ${placeById[note.contract.destination].name}.`
            : "The address in the original manifest remains correct.";
        if (!reply && q === "ask_deadline")
          reply = `The deadline is ${timeLabel(note?.contract?.due ?? (o ? contracts.get(o.id)!.due : 0))} on the shift clock${o ? ` for ${o.id}` : "; no individual parcel deadline is being changed"}.`;
        message.replies.push({
          at: g.time,
          text: reply ?? "Please use the instructions in my latest message.",
        });
        message.status = "new";
        message.responseAt = undefined;
        message.pendingQuestion = undefined;
        message.outcome = "Reply received · review and update the plan";
        state.revision++;
        sim.log(`Reply · ${message.sender}`, "info");
      }
  }
  sim.setRules({
    beforeStep,
    judgeDelivery: (o, van, time) => {
      const c = contracts.get(o.id)!;
      const accepted =
        o.destination === c.destination &&
        (!o.chilled || van.chilled) &&
        time < c.expiry;
      if (!accepted) {
        state.serviceFailures++;
        return {
          accepted: false,
          onTime: false,
          bonus: 0,
          reason:
            o.destination !== c.destination
              ? "reached the wrong address after a customer update"
              : "missed the customer's acceptance window",
        };
      }
      const onTime = time <= c.due;
      const bonus = (c.changed ? 25 : 0) + (c.medical && onTime ? 75 : 0);
      state.bonus += bonus;
      return { accepted: true, onTime, bonus };
    },
  });
  beforeStep();

  function availableActions(message: Message) {
    return Object.fromEntries(
      Object.entries(inboxActions).filter(
        ([key]) =>
          !message.questions.includes(key) &&
          !(key === "hold" && message.heldOrder),
      ),
    ) as Record<InboxAction, string>;
  }
  function apply(
    id: string,
    action: string,
    orderId: string,
    destination = "keep",
    deadline = "keep",
  ) {
    const g = sim.game,
      message = state.inbox.find((m) => m.id === id);
    if (
      !message ||
      g.phase !== "playing" ||
      g.paused ||
      message.status !== "new" ||
      !(action in availableActions(message))
    )
      return false;
    const order = g.orders.find((o) => o.id === orderId);
    if (action.startsWith("ask_")) {
      message.questions.push(action);
      message.status = "waiting";
      message.responseAt = g.time + 4;
      message.pendingQuestion = action;
      const holdId =
        message.orderId ?? (action !== "ask_order" ? order?.id : undefined);
      if (holdId && sim.reviseOrder(holdId, { held: true }))
        message.heldOrder = holdId;
      state.questions++;
      message.outcome = "Question sent · reply in 4 seconds";
    } else if (action === "apply_update" || action === "hold") {
      if (
        !order ||
        !(destination in destinationChoices) ||
        !(deadline in deadlineChoices)
      )
        return false;
      if (
        !sim.reviseOrder(orderId, {
          destination: destination === "keep" ? undefined : destination,
          due: deadline === "keep" ? undefined : Number(deadline),
          held: action === "hold",
        })
      )
        return false;
      if (action === "hold") {
        message.heldOrder = orderId;
        message.outcome = `${orderId} held · apply or acknowledge to release`;
      } else {
        message.status = "handled";
        state.updates++;
        message.outcome = `${orderId} → ${placeById[order.destination].name} · due ${timeLabel(order.due)}`;
      }
    } else {
      message.status = "handled";
      message.outcome = "Acknowledged · current plan retained";
    }
    if (message.status === "handled" && message.heldOrder) {
      sim.reviseOrder(message.heldOrder, { held: false });
      message.heldOrder = undefined;
    }
    state.revision++;
    state.memory.push(
      `${message.sender}: ${message.text} → ${message.outcome}`,
    );
    state.memory = state.memory.slice(-12);
    sim.log(`Inbox · ${message.outcome}`, "ai");
    return true;
  }
  function publicState() {
    return {
      strategy: strategyChoices[state.strategy as keyof typeof strategyChoices],
      instructions:
        "The manifest is YOUR current plan and may be outdated. Read the customer messages. The latest correction wins. Ask for missing information. Clinic consignments earn +75 if on time; satisfying an updated request earns +25 on delivery. Wrong address or missed acceptance window fails the delivery (-50). Acknowledging a message earns no points.",
      messages: state.inbox.map((m) => ({
        id: m.id,
        at: m.at,
        sender: m.sender,
        text: m.text,
        orderReference: m.orderId ?? null,
        status: m.status,
        replies: m.replies,
        actionTaken: m.outcome ?? null,
      })),
      recentActions: state.memory,
    };
  }
  function decisionInput(generation: number): DecisionInput | null {
    const message = state.inbox.find((m) => m.status === "new");
    if (!message) return null;
    const context = publicState();
    return {
      kind: "inbox",
      text: `${message.sender}: ${message.text}`,
      entityId: message.id,
      generation,
      revision: state.revision,
      candidates: availableActions(message),
      inboxChoices: {
        orders: {
          none: "No order identified; ask or acknowledge a shift-wide briefing",
          ...Object.fromEntries(
            sim.game.orders
              .filter((o) => !["failed", "delivered"].includes(o.status))
              .map((o) => [
                o.id,
                `${o.id}: ${o.note}; current plan ${placeById[o.destination].name}, due ${timeLabel(o.due)}, ${o.status}${o.held ? ", HELD" : ""}`,
              ]),
          ),
        },
        destinations: destinationChoices,
        deadlines: deadlineChoices,
      },
      snapshot: {
        elapsedSeconds: sim.game.time,
        currentMessage: context.messages.find((m) => m.id === message.id),
        relatedHistory: context.messages.filter(
          (m) =>
            m.id !== message.id &&
            m.sender.split(" · ")[0] === message.sender.split(" · ")[0],
        ),
        sharedBriefings: context.messages.filter((m) =>
          ["Operations desk", "Shared dispatcher briefing"].includes(m.sender),
        ),
        standingStrategy: context.strategy,
        rules: context.instructions,
        activeOrders: sim.game.orders
          .filter((o) => !["failed", "delivered"].includes(o.status))
          .map((o) => ({
            id: o.id,
            note: o.note,
            plannedDestination: placeById[o.destination].name,
            plannedDeadline: timeLabel(o.due),
            chilled: o.chilled,
            status: o.status,
            held: !!o.held,
          })),
      },
    };
  }
  function applyDecision(d: Decision) {
    const ok = apply(
      d.entityId,
      d.choice,
      d.target ?? "none",
      d.destination ?? "keep",
      d.deadline ?? "keep",
    );
    if (ok) remember(d);
    return ok;
  }
  function remember(d: Decision) {
    if (d.strategy && d.strategy in strategyChoices)
      state.strategy = d.strategy;
    state.reportedReason =
      reasonChoices[d.reason as keyof typeof reasonChoices] ?? "";
  }
  function addBrief(text: string, id: string) {
    state.inbox.push({
      id,
      at: sim.game.time,
      sender: "Shared dispatcher briefing",
      text,
      status: "new",
      replies: [],
      questions: [],
    });
    state.revision++;
  }
  return {
    state,
    apply,
    publicState,
    decisionInput,
    applyDecision,
    remember,
    addBrief,
    availableActions,
  };
}
export type ChaosSession = ReturnType<typeof createChaos>;
