import { getLivingActions } from "./livingCity";
import {
  PROJECTS,
  departmentLabels,
  districtDefinitions,
  projectById,
  requestById,
} from "./catalog";
import type { BudgetEstimate, BudgetOverrides } from "./engine";
import type {
  CityState,
  Department,
  PetitionAction,
  PetitionReason,
} from "./types";

export const MAX_PENDING_PETITIONS = 6;
export const MAX_PETITION_LENGTH = 800;
export const MAX_PETITION_HISTORY = 100;
export const PETITION_REASONS: readonly PetitionReason[] = [
  "benefit",
  "conditional",
  "budget",
  "priority",
  "in_progress",
  "completed",
  "impossible",
  "unsupported",
  "unclear",
];
const levels = ["Reduced", "Standard", "Enhanced"];
const departments: Department[] = [
  "health",
  "safety",
  "transport",
  "education",
  "environment",
];
const money = (value: number) =>
  `$${Math.round(value).toLocaleString("en-US")}`;
const districtName = (id: string) =>
  districtDefinitions.find((item) => item.id === id)?.name || "the city";
const sustainable = (treasury: number, net: number) =>
  net >= 0 || treasury + net * 3 >= 0;

/** Free text describes intent. Only this catalog of concrete simulation actions can execute. */
export function petitionActionsFor(
  city: CityState,
  estimateBudget: (overrides?: BudgetOverrides) => BudgetEstimate,
): PetitionAction[] {
  const actions: PetitionAction[] = [];
  const currentBudget = estimateBudget();
  // Construction already contracted will also need to be maintained when it opens.
  const committedUpkeep = city.projects
    .filter((item) => item.status === "building")
    .reduce((sum, item) => sum + projectById[item.definitionId].upkeep, 0);
  const budgetRefusal = (
    target: PetitionAction,
    available: boolean,
    description: string,
  ) =>
    actions.push({
      id: `defer:budget:${target.kind === "project" ? target.projectId : target.id}`,
      label: `Defer: ${target.label} is over budget`,
      description,
      facts: target.facts,
      kind: "defer",
      status: "deferred",
      reason: "budget",
      available,
      cost: target.cost,
      dayCost: target.dayCost,
      projectId: target.projectId,
      department: target.department,
      level: target.level,
      tax: target.tax,
    });
  for (const definition of PROJECTS) {
    const existing = city.projects.find(
      (item) => item.definitionId === definition.id,
    );
    const futureNet = currentBudget.net - committedUpkeep - definition.upkeep;
    const canAfford =
      city.treasury >= definition.cost &&
      sustainable(city.treasury - definition.cost, futureNet);
    const location = districtName(definition.district);
    const scopeRule = `Choose this outcome only if the citizen requested this exact project in ${location}, at the catalog's scope. A request for this name in another neighborhood, a relocated project, or a different scale does not match. Use the outside-city-plan response instead; do not substitute this location.`;
    const facts = `${definition.name} in ${location}. ${definition.description} Costs ${money(definition.cost)} now; needs ${definition.duration} staffed working days, with opening affected by crew availability and weather; then ${money(definition.upkeep)}/day upkeep. Current treasury: ${money(city.treasury)}. Future daily balance including committed construction: ${money(futureNet)}.`;
    const description = `${facts} ${scopeRule}`;
    const action: PetitionAction = {
      id: `project:${definition.id}`,
      label: `Build ${definition.name} in ${location}`,
      description,
      facts,
      kind: "project",
      status: "approved",
      reason: "benefit",
      available: !existing && canAfford,
      cost: definition.cost,
      dayCost: definition.upkeep,
      projectId: definition.id,
      unavailableReason: existing
        ? existing.status === "building"
          ? "Already under construction."
          : "Already completed."
        : !canAfford
          ? "The construction price or three-day operating reserve cannot be covered."
          : undefined,
    };
    actions.push(action);
    budgetRefusal(action, !existing && !canAfford, description);
    const progressFacts =
      existing?.status === "building"
        ? `${definition.name} is already under construction in ${location} and opens on city day ${Math.floor(existing.completesDay)}. A duplicate contract is unnecessary.`
        : `${definition.name} is not currently under construction in ${location}.`;
    actions.push({
      id: `defer:in_progress:${definition.id}`,
      label: `Already underway: ${definition.name} in ${location}`,
      description: `${progressFacts} ${scopeRule}`,
      facts: progressFacts,
      kind: "defer",
      status: "deferred",
      reason: "in_progress",
      available: existing?.status === "building",
      cost: 0,
      dayCost: 0,
      projectId: definition.id,
    });
    const completedFacts = `${definition.name} ${existing?.status === "complete" ? "already serves" : "has not opened in"} ${location}.`;
    actions.push({
      id: `decline:completed:${definition.id}`,
      label: `Already completed: ${definition.name} in ${location}`,
      description: `${completedFacts} ${scopeRule}`,
      facts: completedFacts,
      kind: "decline",
      status: "declined",
      reason: "completed",
      available: existing?.status === "complete",
      cost: 0,
      dayCost: 0,
      projectId: definition.id,
    });
  }
  for (const department of departments)
    for (const level of [0, 1, 2] as const) {
      const forecast = estimateBudget({ departments: { [department]: level } });
      const futureNet = forecast.net - committedUpkeep;
      const changed = city.departments[department] !== level;
      const canAfford =
        forecast.expenses <= currentBudget.expenses ||
        sustainable(city.treasury, futureNet);
      const description = `${levels[level]} funding for ${departmentLabels[department]} across all four neighborhoods. Daily spending changes by ${money(forecast.expenses - currentBudget.expenses)}. Future daily balance including committed construction: ${money(futureNet)}. Current treasury: ${money(city.treasury)}.`;
      const action: PetitionAction = {
        id: `funding:${department}:${level}`,
        label: `${levels[level]} ${departmentLabels[department]} funding`,
        description,
        kind: "department",
        status: "approved",
        reason: "benefit",
        available: changed && canAfford,
        unavailableReason: !changed
          ? "This funding is already in place."
          : !canAfford
            ? "This funding would exhaust the reserve within three city days."
            : undefined,
        cost: 0,
        dayCost: forecast.expenses - currentBudget.expenses,
        department,
        level,
      };
      actions.push(action);
      budgetRefusal(action, changed && !canAfford, description);
      actions.push({
        ...action,
        id: `decline:completed:${action.id}`,
        label: `Already in place: ${action.label}`,
        description: !changed
          ? `The ${departmentLabels[department]} department already has ${levels[level].toLowerCase()} funding.`
          : `The ${departmentLabels[department]} department currently has ${levels[city.departments[department]].toLowerCase()} funding, not ${levels[level].toLowerCase()} funding.`,
        kind: "decline",
        status: "declined",
        reason: "completed",
        available: !changed,
        unavailableReason: undefined,
        cost: 0,
        dayCost: 0,
      });
    }
  for (const tax of ["low", "balanced", "high"] as const) {
    const forecast = estimateBudget({ tax });
    const futureNet = forecast.net - committedUpkeep;
    const changed = city.tax !== tax;
    const canAfford =
      forecast.revenue >= currentBudget.revenue ||
      sustainable(city.treasury, futureNet);
    const action: PetitionAction = {
      id: `tax:${tax}`,
      label: `Set ${tax} city taxes`,
      description: `${tax[0].toUpperCase()}${tax.slice(1)} taxes citywide. Projected revenue: ${money(forecast.revenue)}/day. Future daily balance including committed construction: ${money(futureNet)}. Current treasury: ${money(city.treasury)}. Lower taxes ease daily pressure on happiness and the economy; higher taxes increase it.`,
      kind: "tax",
      status: "approved",
      reason: "benefit",
      available: changed && canAfford,
      unavailableReason: !changed
        ? "This tax rate is already in place."
        : !canAfford
          ? "This tax cut would exhaust the reserve within three city days."
          : undefined,
      cost: 0,
      dayCost: currentBudget.net - forecast.net,
      tax,
    };
    actions.push(action);
    budgetRefusal(action, changed && !canAfford, action.description);
    actions.push({
      ...action,
      id: `decline:completed:${action.id}`,
      label: `Already in place: ${action.label}`,
      description: !changed
        ? `The city already uses ${tax} taxes.`
        : `The city currently uses ${city.tax} taxes, not ${tax} taxes.`,
      kind: "decline",
      status: "declined",
      reason: "completed",
      available: !changed,
      unavailableReason: undefined,
      cost: 0,
      dayCost: 0,
    });
  }
  // Living-city requests use the exact same legal actions as City life and Jev's agenda.
  for (const civic of getLivingActions(city)) {
    const conditionalProject = civic.id.startsWith('commit_project:');
    const conditional = conditionalProject || civic.id.startsWith('motion:');
    const projectId = conditionalProject ? civic.id.slice('commit_project:'.length) : undefined;
    const scope = civic.districtId ? districtName(civic.districtId) : 'the whole city';
    const facts = `${civic.title}. Location: ${scope}. ${civic.description} Upfront cost: ${money(civic.cost)}. ${civic.effectsHint}`;
    actions.push({
      id: `civic:${civic.id}`, label: civic.title,
      description: `${facts} Only choose this if the action, location, scale and conditions satisfy the citizen's actual request. Do not create a conditional authorization unless the citizen is asking for a future plan or explicitly accepts those conditions.`,
      facts, kind: 'civic', civicActionId: civic.id, districtId: civic.districtId,
      ...(projectId ? {projectId} : {}),
      status: 'approved', reason: conditional ? 'conditional' : 'benefit',
      available: civic.available, unavailableReason: civic.unavailableReason,
      cost: civic.cost, dayCost: civic.dayCost ?? 0,
    });
    if (!civic.available && civic.cost > city.treasury) actions.push({
      id: `defer:budget:civic:${civic.id}`, label: `Defer: ${civic.title} is over budget`,
      description: `${facts} ${civic.unavailableReason ?? ''}`, facts,
      kind: 'defer', civicActionId: civic.id, districtId: civic.districtId,
      ...(projectId ? {projectId} : {}),
      status: 'deferred', reason: 'budget', available: true,
      cost: civic.cost, dayCost: civic.dayCost ?? 0,
    });
  }
  const work = city.projects.filter((item) => item.status === "building");
  const operationalWork = city.living.works.map(item => item.kind === 'repair'
    ? `Repair ${city.living.assets.find(asset => asset.id === item.targetId)?.name ?? 'local infrastructure'}`
    : city.living.council.motions.find(motion => motion.id === item.targetId)?.title ?? `${districtName(item.districtId)} ${item.kind} works`);
  const urgent = city.requests.filter(
    (item) =>
      item.status === "open" &&
      (requestById[item.templateId].priority === "urgent" ||
        item.dueDay - city.day - city.dayProgress <= 0.5),
  );
  const priorityFacts = [
    ...(urgent.length
      ? [
          `${urgent.length} urgent or soon-due citizen ${urgent.length === 1 ? "case needs" : "cases need"} attention: ${urgent
            .slice(0, 2)
            .map((item) => requestById[item.templateId].title)
            .join("; ")}`,
        ]
      : []),
    ...(work.length
      ? [
          `Construction already in progress: ${work
            .slice(0, 3)
            .map((item) => projectById[item.definitionId].name)
            .join(", ")}`,
        ]
      : []),
    ...(operationalWork.length ? [`Funded repair and development work: ${operationalWork.slice(0, 3).join('; ')}`] : []),
  ];
  actions.push({
    id: "defer:priority",
    label: "Defer while urgent work is in progress",
    description: priorityFacts.length
      ? `${priorityFacts.join(". ")}.`
      : "There are no urgent cases or construction works to justify this reason.",
    kind: "defer",
    status: "deferred",
    reason: "priority",
    available: priorityFacts.length > 0,
    cost: 0,
    dayCost: 0,
  });
  for (const [reason, label, description] of [
    [
      "impossible",
      "Decline: not practically possible",
      "Use only if the request cannot be carried out in a plausible town: it requires physically impossible, unsafe, contradictory, or clearly unachievable results. This is a judgment about the request, not the budget.",
    ],
    [
      "unsupported",
      "Decline: outside the city plan",
      "Use when a plausible request cannot be fulfilled by any supplied project, living-city action, department funding change, or tax policy. Do not substitute a different location, scale, or project and pretend the request was fulfilled.",
    ],
    [
      "unclear",
      "Decline: more detail needed",
      "Use when the request does not identify a clear change the mayor can assess. Ask the resident to send a specific service, improvement, or tax request.",
    ],
  ] as const)
    actions.push({
      id: `decline:${reason}`,
      label,
      description,
      kind: "decline",
      status: "declined",
      reason,
      available: true,
      cost: 0,
      dayCost: 0,
    });
  return actions;
}

export function petitionResponseText(
  city: CityState,
  action: PetitionAction,
): string {
  if (action.kind === 'civic') {
    if (action.civicActionId?.startsWith('motion:')) return `Accepted for council review. ${action.facts ?? action.description} The proposal still needs a majority vote and available funding before any work is commissioned. No construction has been approved yet.`;
    if (action.civicActionId?.startsWith('vote:')) return `I've called the requested council vote. ${action.facts ?? action.description} The recorded votes and resulting work are available in City life; a rejected proposal does not spend the construction budget.`;
    if (action.reason === 'conditional') return `Conditionally approved. I've recorded this as an accountable commitment, not a completed project. ${action.facts ?? action.description} The agenda will track its conditions and deadline; work starts only when the stated checks pass.`;
    return `Approved. ${action.facts ?? action.description} This decision has been recorded in City life. Any work, vote, or inspection follows its stated schedule; approval does not mean it has already finished.`;
  }
  if (action.kind === "project" && action.projectId) {
    const project = projectById[action.projectId];
    return `Approved. The city can cover this investment. I've commissioned ${project.name} in ${districtName(project.district)} for ${money(project.cost)}. It needs ${project.duration} staffed working days; crew availability, weather, and site issues can change the opening date. It will cost ${money(project.upkeep)} per day to operate. ${project.description} The contract is now in the city plan.`;
  }
  if (
    action.kind === "department" &&
    action.department &&
    action.level !== undefined
  )
    return `Approved. I've set ${departmentLabels[action.department]} funding to ${levels[action.level].toLowerCase()} across the city. ${action.dayCost === 0 ? "Daily spending is unchanged." : `This ${action.dayCost > 0 ? "adds" : "saves"} ${money(Math.abs(action.dayCost))} per city day.`} The change starts with the next daily budget.`;
  if (action.kind === "tax" && action.tax)
    return `Approved. I've set city taxes to ${action.tax}. ${action.dayCost === 0 ? "The projected daily balance is unchanged." : `The projected daily balance ${action.dayCost > 0 ? "falls" : "improves"} by ${money(Math.abs(action.dayCost))}.`} This applies from the next daily budget and affects happiness and the economy over time.`;
  if (action.reason === "budget")
    return `Not approved for now: the city cannot cover this commitment’s upfront cost and a safe operating reserve. Our reserve rule covers three city days of any projected operating losses. ${action.facts ?? action.description} The agenda will retain a review reminder where this is a supported project; a review does not authorize spending. You may also clarify or revise the request.`;
  if (action.reason === "priority")
    return `Not approved for now: I'm prioritizing work already on the city's desk. ${action.description} I will retain a non-spending review reminder. You can also send a revised proposal.`;
  if (action.reason === "in_progress")
    return `Already underway. ${action.facts ?? action.description} Your request does not need another approval or a second payment.`;
  if (action.reason === "completed")
    return `No new approval is needed. ${action.facts ?? action.description} There is nothing additional to commission for this request.`;
  if (action.reason === "impossible")
    return "Not approved: I don't consider this practically achievable as requested. Please suggest a realistic city improvement, service change, or tax policy that can be delivered with the city's resources.";
  if (action.reason === "unsupported")
    return "Not approved: this request is outside the projects and powers available to this city. I can commission listed civic projects, change services and taxes, inspect or repair infrastructure, manage staffing and transport, propose council programs, and make supported conditional commitments. I won't promise work the city cannot carry out.";
  return "I need a clearer request before I can approve it. Please name the improvement or service you want changed, and the neighborhood if it matters. Send a new message with those details and I'll review it.";
}
