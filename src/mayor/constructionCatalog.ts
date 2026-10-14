import type { Effects, RequestOption, RequestTemplate } from "./types";

const effect = (
  treasury = 0,
  metrics: Effects["metrics"] = {},
  districtHappiness = 0,
): Effects => ({ treasury, metrics, districtHappiness });

const option = (
  id: string,
  label: string,
  description: string,
  effects: Effects,
  constructionDelayDays = 0,
): RequestOption => ({
  id,
  label,
  description,
  effects,
  constructionDelayDays,
});

type ConstructionStory = Omit<
  RequestTemplate,
  "constructionOnly" | "expiry" | "constructionExpiryDelayDays"
> & { expiry?: Effects };

const story = (value: ConstructionStory): RequestTemplate => ({
  constructionOnly: true,
  constructionExpiryDelayDays: 1,
  expiry: effect(0, { trust: -1, happiness: -1 }, -2),
  ...value,
});

const enclosedProjects = [
  "riverside_health_stop",
  "oldtown_clinic",
  "oldtown_learning",
  "oldtown_housing",
  "market_incubator",
  "market_reuse",
  "hillview_school",
  "hillview_bus",
  "hillview_center",
];

// These letters are selected only by the construction scheduler. Every choice
// changes the linked project schedule and/or the same public city ledger.
export const CONSTRUCTION_REQUESTS: RequestTemplate[] = [
  story({
    id: "construction_noise",
    district: "oldtown",
    title: "The site wakes up before the neighborhood",
    sender: "Neighbors beside the works",
    role: "Residents' construction liaison",
    source: "citizen",
    category: "community",
    priority: "important",
    deadlineDays: 2,
    text: "The crew starts its loudest work just as nearby residents are finishing night shifts. Work is within the permitted hours, but sleep is suffering. The site manager can change the work sequence if City Hall settles the cost and timetable today.",
    clarification: {
      question: "Which part of the work is disturbing people most?",
      answer:
        "It is the cutting and compaction, not the delivery vehicles. Two mornings of that work remain. A hired quiet kit can keep the opening date; a shorter noisy-work window adds a day.",
      effectsNote:
        "Both mitigations reduce disturbance. The quiet kit costs more; shorter working hours delay this project by one day.",
    },
    options: [
      option(
        "quiet_kit",
        "Hire quieter equipment for the noisy phase",
        "Keep the opening date and reduce the disturbance with specialist equipment.",
        effect(-550, { happiness: 2, trust: 1 }, 3),
      ),
      option(
        "quiet_hours",
        "Shorten the noisy-work window",
        "Move cutting away from early mornings; the site needs one extra day.",
        effect(0, { happiness: 1, trust: 1 }, 2),
        1,
      ),
      option(
        "publish_hours",
        "Keep permitted hours and publish the schedule",
        "Give neighbors notice, but the remaining noisy mornings go ahead.",
        effect(0, { happiness: -2, trust: -1 }, -3),
      ),
    ],
  }),
  story({
    id: "construction_dust",
    district: "market",
    title: "Dust drifts beyond the hoarding",
    sender: "Clean air desk",
    role: "Environmental health officer",
    source: "department",
    category: "health",
    priority: "important",
    deadlineDays: 2,
    text: "Dry weather has carried dust from the worksite onto nearby windows and a busy walking route. The dusty tasks can be covered, slowed, or postponed. Residents want a response before another school-run crowd passes the site.",
    clarification: {
      question: "Is there a contamination incident?",
      answer:
        "The survey identifies ordinary construction dust, with no hazardous material flagged. The problem is nuisance and exposure along the public route. Covering stockpiles and wet-cutting will control the source.",
      effectsNote:
        "This is a dust-control decision. All choices control the dusty tasks; their costs and delays differ.",
    },
    options: [
      option(
        "dust_control",
        "Hire covers and wet-cutting equipment",
        "Control dust at the source without moving the completion date.",
        effect(-500, { health: 2, environment: 2 }, 2),
      ),
      option(
        "crew_cleanup",
        "Use the crew for dust control and cleanup",
        "Cover materials and clean the public route with existing staff; allow one extra day.",
        effect(-150, { health: 1, environment: 1 }, 1),
        1,
      ),
      option(
        "pause_dusty_tasks",
        "Pause dusty work until conditions improve",
        "Stop the source now and reschedule the affected tasks two days later.",
        effect(0, { health: 1, economy: -1 }, -1),
        2,
      ),
    ],
  }),
  story({
    id: "construction_rain_pour",
    district: "hillview",
    title: "Rain arrives before the concrete",
    sender: "Site supervisor",
    role: "Works delivery team",
    source: "department",
    category: "authority",
    priority: "important",
    deadlineDays: 1,
    text: "A forecast downpour clashes with the booked concrete work. The engineer will not sign off an exposed pour in these conditions. We can protect the work, book the next dry slot, or use the waiting time to prepare a later stage.",
    options: [
      option(
        "covered_pour",
        "Hire temporary weather protection",
        "Protect the pour and inspection area so the approved sequence stays on time.",
        effect(-700, { safety: 1, trust: 1 }, 0),
      ),
      option(
        "dry_slot",
        "Rebook the pour for the next dry slot",
        "Pay the supplier's rebooking fee and move completion back one day.",
        effect(-200, { safety: 1 }, 0),
        1,
      ),
      option(
        "resequence",
        "Reorder tasks around the weather",
        "Use the crew elsewhere on this site; the longer sequence adds two days without a hire charge.",
        effect(0, { trust: -1 }, -1),
        2,
      ),
    ],
  }),
  story({
    id: "construction_late_beams",
    district: "hillview",
    title: "The beams are still at the depot",
    sender: "Main contractor",
    role: "Materials coordinator",
    source: "business",
    category: "economy",
    priority: "important",
    deadlineDays: 2,
    constructionProjectIds: enclosedProjects,
    text: "The fabricated supports for this building have missed their delivery slot. The supplier offers a dedicated replacement truck, a shared load tomorrow, or the next normal run. The supports are already approved; this is a transport and scheduling problem.",
    options: [
      option(
        "dedicated_load",
        "Pay for a dedicated replacement delivery",
        "Bring the approved supports directly to site and protect the opening date.",
        effect(-850, { economy: 1 }, 1),
      ),
      option(
        "shared_load",
        "Share tomorrow's delivery truck",
        "Split the transport charge with another customer and accept a one-day delay.",
        effect(-250, { environment: 1 }, 0),
        1,
      ),
      option(
        "normal_run",
        "Wait for the supplier's next normal run",
        "Avoid extra spending; this site's crew returns to the affected stage in two days.",
        effect(0, { economy: -1, trust: -1 }, -1),
        2,
      ),
    ],
  }),
  story({
    id: "construction_walkway",
    district: "oldtown",
    title: "A familiar shortcut meets a site fence",
    sender: "Walking group and nearby shops",
    role: "Street access representatives",
    source: "citizen",
    category: "transport",
    priority: "urgent",
    deadlineDays: 1,
    text: "The construction fence has closed a popular walking route. The signed alternative is safe but long, and smaller shops have lost passing customers. The contractor can provide a protected temporary passage or move its storage further inside the site.",
    options: [
      option(
        "protected_passage",
        "Hire a protected temporary passage",
        "Provide a separated public route while the site keeps its existing work sequence.",
        effect(-650, { mobility: 2, economy: 1, safety: 1 }, 3),
      ),
      option(
        "move_storage",
        "Move site storage to restore the route",
        "Rearrange the compound and fencing; the tighter work area adds one day.",
        effect(-180, { mobility: 2, safety: 1 }, 2),
        1,
      ),
      option(
        "improve_detour",
        "Keep the detour and improve its signs",
        "Use existing street staff to make the longer route clearer; lost footfall continues.",
        effect(0, { mobility: -1, economy: -1 }, -2),
      ),
    ],
  }),
  story({
    id: "construction_fatigue",
    district: "hillview",
    title: "The crew asks for a safer pace",
    sender: "Site workers' representative",
    role: "Workforce liaison",
    source: "citizen",
    category: "safety",
    priority: "urgent",
    deadlineDays: 1,
    text: "A run of long shifts has left the site crew exhausted. No one has been injured, but the supervisor has stopped overtime before fatigue becomes an accident. City Hall needs to choose whether to fund relief staff or change the project schedule.",
    options: [
      option(
        "relief_crew",
        "Bring in qualified relief staff",
        "Restore normal shifts with an additional crew and retain the completion date.",
        effect(-950, { safety: 2, health: 1, trust: 1 }, 1),
      ),
      option(
        "shorter_shifts",
        "Return to normal shifts and extend the schedule",
        "Let the existing crew work at a sustainable pace; completion moves back one day.",
        effect(0, { safety: 2, health: 1 }, 0),
        1,
      ),
      option(
        "recovery_break",
        "Give the crew a recovery break",
        "Pause active work and restart after a rest period, adding two days to the project.",
        effect(0, { safety: 2, health: 2, economy: -1 }, -1),
        2,
      ),
    ],
  }),
  story({
    id: "construction_utility",
    district: "market",
    title: "An unmarked service beneath the site",
    sender: "Utilities coordination desk",
    role: "Street works engineer",
    source: "authority",
    category: "safety",
    priority: "urgent",
    deadlineDays: 1,
    text: "The crew has uncovered a service line that does not appear on the site plan. Work beside it is stopped. The utility team can identify and protect it quickly for a call-out fee, or handle it through the normal inspection queue while the contractor replans.",
    clarification: {
      question: "Has the line been damaged or any service cut off?",
      answer:
        "No damage or outage has been reported. The exposed area is cordoned off. Its ownership must be confirmed before digging resumes; other tasks can continue away from it.",
      effectsNote:
        "Every option keeps the line protected. Paying for faster identification limits the schedule impact.",
    },
    options: [
      option(
        "specialist_callout",
        "Book the specialist identification team",
        "Identify and protect the line promptly so the contractor can recover the day's work.",
        effect(-900, { safety: 2, trust: 1 }, 1),
      ),
      option(
        "routine_inspection",
        "Use the next routine utility inspection",
        "Keep the cordon in place and move completion back one day.",
        effect(-200, { safety: 2 }, 0),
        1,
      ),
      option(
        "replan_around_line",
        "Pause digging and replan around the line",
        "Use the normal utility queue and existing engineers; the slower sequence adds two days.",
        effect(0, { safety: 1, trust: -1 }, -1),
        2,
      ),
    ],
  }),
  story({
    id: "construction_inspection",
    district: "oldtown",
    title: "The inspector's last slot is tomorrow",
    sender: "Building control office",
    role: "Independent site inspector",
    source: "authority",
    category: "authority",
    priority: "important",
    deadlineDays: 1,
    constructionProjectIds: enclosedProjects,
    text: "A required inspection must happen before the contractor closes up this stage of the building. The normal appointment has moved. A qualified substitute is available for a fee, or the crew can rearrange its work while waiting for the municipal inspector.",
    clarification: {
      question: "Can the contractor certify this stage without an inspector?",
      answer:
        "No. Independent inspection is required for this stage. The substitute has the same accreditation; paying the fee buys an earlier appointment, not a lower standard.",
      effectsNote:
        "All choices retain independent inspection. The difference is the inspection fee and one or two days of delay.",
    },
    options: [
      option(
        "substitute_inspector",
        "Book the accredited substitute inspector",
        "Pay for the available appointment and keep the approved construction sequence.",
        effect(-600, { safety: 2, trust: 1 }, 0),
      ),
      option(
        "resequence_inspection",
        "Reorder tasks until the municipal visit",
        "Use a little extra site setup to limit the delay to one day.",
        effect(-150, { safety: 1 }, 0),
        1,
      ),
      option(
        "hold_stage",
        "Hold the affected stage for the normal visit",
        "Keep the work exposed and await the inspector; completion moves back two days.",
        effect(0, { safety: 1, trust: -1 }, -1),
        2,
      ),
    ],
  }),
  story({
    id: "construction_deliveries",
    district: "market",
    title: "Site deliveries meet the morning rush",
    sender: "Streets and transport desk",
    role: "Traffic coordinator",
    source: "department",
    category: "transport",
    priority: "important",
    deadlineDays: 2,
    text: "Delivery trucks for this project are queuing at the same time as school and shop traffic. The trucks are sticking to the approved route, but their arrival times are bunching together. The site needs a booking plan for its remaining deliveries.",
    options: [
      option(
        "booked_slots",
        "Fund timed deliveries and an unloading marshal",
        "Separate arrival slots and clear trucks into the site promptly without delaying the work.",
        effect(-450, { mobility: 2, safety: 1, economy: 1 }, 2),
      ),
      option(
        "off_peak",
        "Move deliveries outside the morning rush",
        "Use existing staff for fewer daily delivery windows; allow an extra construction day.",
        effect(0, { mobility: 2, safety: 1 }, 1),
        1,
      ),
      option(
        "existing_booking",
        "Keep the current deliveries and notify road users",
        "Publish the arrival windows so people can plan around them; queues still affect the street.",
        effect(0, { mobility: -2, economy: -1 }, -2),
      ),
    ],
  }),
  story({
    id: "construction_runoff",
    district: "riverside",
    title: "Muddy water reaches the storm drain",
    sender: "Water and parks team",
    role: "Environmental protection officer",
    source: "department",
    category: "environment",
    priority: "urgent",
    deadlineDays: 1,
    text: "Rain has washed loose soil from the construction entrance toward a public storm drain. The crew has stopped earth-moving and blocked the immediate flow. A lasting control is needed before that work resumes.",
    options: [
      option(
        "silt_controls",
        "Hire silt barriers and a wheel-cleaning unit",
        "Contain the runoff and clean vehicles before they leave, keeping the project on schedule.",
        effect(-650, { environment: 3, health: 1 }, 2),
      ),
      option(
        "crew_bunds",
        "Have the crew form barriers and clean the drain",
        "Use site labor with modest supplies; add one day for the extra work.",
        effect(-180, { environment: 2, health: 1 }, 1),
        1,
      ),
      option(
        "hold_earthworks",
        "Keep earth-moving paused through the rain",
        "Maintain the temporary barrier with existing supplies and restart the affected stage two days later.",
        effect(0, { environment: 1, economy: -1 }, -1),
        2,
      ),
    ],
  }),
  story({
    id: "construction_access_review",
    district: "riverside",
    title: "A ramp that works on paper needs another look",
    sender: "Access panel",
    role: "Residents' accessibility review",
    source: "citizen",
    category: "community",
    priority: "important",
    deadlineDays: 2,
    constructionProjectIds: enclosedProjects,
    text: "During the site's access review, residents find that the planned approach leaves too little turning space beside the entrance. The layout can still be corrected before the finishing work. The panel asks the city to choose how to fund and schedule that correction.",
    clarification: {
      question: "Does this require a larger building or a different project?",
      answer:
        "No. The building footprint stays the same. Moving a small part of the unfinished approach provides the turning space in the existing design brief. The contractor can make the correction now or wait for its normal crew.",
      effectsNote:
        "Every option corrects the approach before opening. An extra crew preserves the date; the other options delay completion.",
    },
    options: [
      option(
        "access_crew",
        "Fund an extra crew for the access correction",
        "Make the agreed layout correction before finishes go down and keep the planned opening.",
        effect(-800, { mobility: 2, trust: 2 }, 3),
      ),
      option(
        "existing_crew",
        "Add the correction to the existing crew's work",
        "Buy the required materials and give the contractor one extra day.",
        effect(-250, { mobility: 2, trust: 1 }, 2),
        1,
      ),
      option(
        "reallocate_materials",
        "Rework the approach using materials already on site",
        "Spend more crew time adapting the layout, adding two days without extra purchasing.",
        effect(0, { mobility: 1, trust: 1 }, 1),
        2,
      ),
    ],
  }),
  story({
    id: "construction_supplier_cost",
    district: "riverside",
    title: "The last materials quote has changed",
    sender: "Procurement office",
    role: "City contracts officer",
    source: "authority",
    category: "economy",
    priority: "important",
    deadlineDays: 2,
    text: "A supplier's short-lived quote expired before the final materials order. The original specification is still available at a higher price. Procurement also has an equivalent certified supply and a later delivery at the old price; neither changes what the finished project provides.",
    clarification: {
      question:
        "Would the cheaper option reduce the project's promised benefits?",
      answer:
        "No. The alternate supply meets the same specification and the old-price shipment is the original product. The tradeoff is delivery time and the work needed to update the purchase order.",
      effectsNote:
        "Project completion benefits stay unchanged. The decision changes spending and the completion date.",
    },
    options: [
      option(
        "price_increase",
        "Cover the increase and retain the delivery slot",
        "Keep the original order and its arrival date by paying the revised price.",
        effect(-1000, { economy: 1 }, 0),
      ),
      option(
        "equivalent_supply",
        "Switch to the certified equivalent supply",
        "Pay a smaller order adjustment and allow one extra day for delivery.",
        effect(-300, { trust: 1 }, 0),
        1,
      ),
      option(
        "later_shipment",
        "Wait for the shipment at the original price",
        "Keep the existing project budget and move completion back two days.",
        effect(0, { trust: -1 }, -1),
        2,
      ),
    ],
  }),
];
