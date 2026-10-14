import {
  PROJECTS,
  REQUEST_CATALOG,
  districtDefinitions,
  projectById,
  requestById,
} from "./catalog";
import {
  MAX_PENDING_PETITIONS,
  MAX_PETITION_HISTORY,
  MAX_PETITION_LENGTH,
  PETITION_REASONS,
  petitionActionsFor,
  petitionResponseText,
} from "./petitions";
import {
  createLivingCity, refreshLivingCity, advanceLivingCity, getLivingActions,
  executeLivingAction, getLivingWorkRate, trackProjectPromise, trackReviewReminder,
  observeLivingDecision, getLivingPublicSnapshot, restoreLivingCity,
  isKnownCivicActionId, historicalCivicEffects,
} from './livingCity';
import type { CivicActionOption } from './livingTypes';
import type {
  ActionResult,
  CityProject,
  CityRequest,
  CityState,
  CitizenPetition,
  DecisionMeta,
  Department,
  DistrictId,
  Effects,
  Mandate,
  MayorMode,
  Metric,
  RequestOption,
  RequestTemplate,
} from "./types";

export const DAY_SECONDS = 20;
export const TERM_DAYS = 30;
export const SERVICE_DEMAND_RATE = 0.012;
const CONSTRUCTION_MILESTONES = [0.18, 0.65] as const;
const INHERITED_PROGRESS: Record<string, number> = {
  oldtown_housing: 0.28,
  hillview_school: 0.52,
};
const INHERITED_PROJECTS = Object.keys(INHERITED_PROGRESS);

const metricKeys: Metric[] = [
  "happiness",
  "trust",
  "health",
  "safety",
  "environment",
  "mobility",
  "economy",
  "education",
];
const departments: Department[] = [
  "health",
  "safety",
  "transport",
  "education",
  "environment",
];
const departmentCost: Record<Department, number> = {
  health: 130,
  safety: 115,
  transport: 120,
  education: 110,
  environment: 105,
};
const departmentMetric: Record<Department, Metric> = {
  health: "health",
  safety: "safety",
  transport: "mobility",
  education: "education",
  environment: "environment",
};
const taxRate = { low: 0.45, balanced: 0.575, high: 0.71 };
const priority = { urgent: 0, important: 1, routine: 2 };
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const ok = (): ActionResult => ({ ok: true });
const fail = (error: string): ActionResult => ({ ok: false, error });
const redactSaveText = (value: string) =>
  value
    .replace(/sk-or-v1-[a-zA-Z0-9_-]+/g, "[redacted API key]")
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[redacted API key]");

// Imports are data, never executable simulation contracts. Every field is projected
// into a fresh object; scheduled effects are reconstructed from the trusted catalog.
function saveObject(value: unknown): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    throw new Error("Invalid save object.");
  return value as Record<string, unknown>;
}
function saveNumber(
  value: unknown,
  min: number,
  max: number,
  integer = false,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error("A saved number is outside the allowed range.");
  return value;
}
function saveString(value: unknown, max = 1000): string {
  if (typeof value !== "string" || value.length > max)
    throw new Error("Invalid saved text.");
  return redactSaveText(value);
}
function saveEnum<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T))
    throw new Error("Unknown saved option.");
  return value as T;
}
function saveBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Invalid saved flag.");
  return value;
}
function saveArray(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error("A saved list is too large or invalid.");
  return value;
}
function saveMetrics(value: unknown): Record<Metric, number> {
  const input = saveObject(value);
  return Object.fromEntries(
    metricKeys.map((key) => [key, saveNumber(input[key], 0, 100)]),
  ) as Record<Metric, number>;
}
function saveEffects(value: unknown): Effects {
  const input = saveObject(value);
  const output: Effects = {};
  if (input.treasury !== undefined)
    output.treasury = saveNumber(input.treasury, -1000000, 1000000);
  if (input.population !== undefined)
    output.population = saveNumber(input.population, -100000, 100000);
  if (input.districtHappiness !== undefined)
    output.districtHappiness = saveNumber(input.districtHappiness, -100, 100);
  if (input.metrics !== undefined) {
    const metrics = saveObject(input.metrics);
    output.metrics = {};
    for (const key of metricKeys)
      if (metrics[key] !== undefined)
        output.metrics[key] = saveNumber(metrics[key], -100, 100);
  }
  return output;
}

export interface BudgetEstimate {
  livingExpenses: number;
  revenue: number;
  expenses: number;
  net: number;
  projectUpkeep: number;
  departmentExpenses: number;
}

export interface BudgetOverrides {
  tax?: CityState["tax"];
  departments?: Partial<Record<Department, 0 | 1 | 2>>;
}

function initialState(generation: number): CityState {
  const state = {
    living: undefined as unknown as CityState['living'],
    generation,
    revision: 0,
    phase: "lobby",
    mode: "manual",
    mandate: "balanced",
    seed: 2026,
    day: 1,
    dayProgress: 0,
    termDays: TERM_DAYS,
    paused: false,
    speed: 1,
    treasury: 18000,
    population: 2400,
    metrics: {
      happiness: 68,
      trust: 66,
      health: 71,
      safety: 70,
      environment: 63,
      mobility: 66,
      economy: 68,
      education: 67,
    },
    districts: districtDefinitions.map((district) => ({ ...district })),
    requests: [],
    petitions: [],
    projects: [],
    news: [],
    decisions: [],
    scheduled: [],
    history: [],
    briefings: [],
    departments: {
      health: 1,
      safety: 1,
      transport: 1,
      education: 1,
      environment: 1,
    },
    tax: "balanced",
    revenue: 1560,
    expenses: 760,
    resolved: 0,
    expired: 0,
    answered: 0,
    term: 1,
    result: null,
    issue: null,
  } satisfies CityState;
  state.living = createLivingCity(state);
  return state;
}

/** Independent world and seeded event stream. The singleton below uses this same factory. */
export function createCitySimulation() {
  const city = initialState(0);
  let randomState = 2026;
  let requestSequence = 0;
  let petitionSequence = 0;
  let newsSequence = 0;
  let decisionSequence = 0;
  let scheduledSequence = 0;
  const seen = new Set<string>();
  const sourceCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const scheduledOrigins = new Map<
    string,
    { templateId: string; optionId: string }
  >();

  function random() {
    randomState = (randomState + 0x6d2b79f5) >>> 0;
    let n = Math.imul(randomState ^ (randomState >>> 15), randomState | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  }

  const now = () => city.day + city.dayProgress;
  const termDay = () => city.day - (city.term - 1) * TERM_DAYS;
  const touch = () => {
    city.revision += 1;
  };
  const canAct = () => city.phase === "playing" && !city.paused && !city.issue;
  const actionGuard = () =>
    city.phase !== "playing"
      ? "Start a mayoral term first."
      : city.issue
        ? "Retry Jev or choose another mayoral control mode before continuing."
        : city.paused
          ? "Resume the city before making a decision."
          : null;

  function news(
    title: string,
    text: string,
    kind: CityState["news"][number]["kind"],
  ) {
    city.news.unshift({ id: ++newsSequence, day: now(), title, text, kind });
    city.news.length = Math.min(city.news.length, 100);
  }

  function syncPopulation() {
    const before =
      city.districts.reduce((sum, district) => sum + district.population, 0) ||
      1;
    let assigned = 0;
    city.districts.forEach((district, index) => {
      const count =
        index === city.districts.length - 1
          ? city.population - assigned
          : Math.round((city.population * district.population) / before);
      district.population = Math.max(0, count);
      assigned += district.population;
    });
  }

  function applyEffects(effects: Effects, districtId?: DistrictId) {
    const applied: Effects = {};
    if (Number.isFinite(effects.treasury)) {
      const before = city.treasury;
      city.treasury = Math.round(city.treasury + effects.treasury!);
      applied.treasury = city.treasury - before;
    }
    if (Number.isFinite(effects.population)) {
      const before = city.population;
      city.population = Math.round(
        clamp(city.population + effects.population!, 100, 100000),
      );
      applied.population = city.population - before;
      syncPopulation();
    }
    for (const key of metricKeys) {
      const value = effects.metrics?.[key];
      if (Number.isFinite(value)) {
        const before = city.metrics[key];
        city.metrics[key] = clamp(city.metrics[key] + value!, 0, 100);
        (applied.metrics ??= {})[key] =
          Math.round((city.metrics[key] - before) * 100) / 100;
      }
    }
    if (Number.isFinite(effects.districtHappiness)) {
      let total = 0;
      let affected = 0;
      for (const district of city.districts) {
        if (!districtId || district.id === districtId) {
          const before = district.happiness;
          district.happiness = clamp(
            district.happiness + effects.districtHappiness!,
            0,
            100,
          );
          total += district.happiness - before;
          affected++;
        }
      }
      applied.districtHappiness = affected
        ? Math.round((total / affected) * 100) / 100
        : 0;
    }
    return applied;
  }

  function estimateBudget(overrides: BudgetOverrides = {}): BudgetEstimate {
    const departmentExpenses = Math.round(
      departments.reduce(
        (sum, department) =>
          sum +
          departmentCost[department] *
            [0.3, 1, 1.7][
              overrides.departments?.[department] ??
                city.departments[department]
            ],
        0,
      ),
    );
    const projectUpkeep = city.projects.reduce(
      (sum, project) =>
        sum +
        (project.status === "complete"
          ? (projectById[project.definitionId]?.upkeep ?? 0)
          : 0),
      0,
    );
    const economyFactor = 0.82 + city.metrics.economy * (0.18 / 68);
    const revenue = Math.round(
      city.population * taxRate[overrides.tax ?? city.tax] * economyFactor +
        180,
    );
    const livingExpenses = city.living.recurringCost;
    const expenses = 180 + departmentExpenses + projectUpkeep + livingExpenses;
    return {
      revenue,
      expenses,
      net: revenue - expenses,
      departmentExpenses,
      projectUpkeep,
      livingExpenses,
    };
  }

  function refreshBudget() {
    refreshLivingCity(city);
    const budget = estimateBudget();
    city.revenue = budget.revenue;
    city.expenses = budget.expenses;
  }

  function snapshot() {
    refreshBudget();
    city.history.push({
      day: now(),
      treasury: city.treasury,
      population: city.population,
      metrics: { ...city.metrics },
      revenue: city.revenue,
      expenses: city.expenses,
    });
    if (city.history.length > 180)
      city.history.splice(0, city.history.length - 180);
  }

  function record(
    title: string,
    choice: string,
    effects: Effects,
    meta: DecisionMeta,
    requestId?: string,
  ) {
    city.decisions.unshift({
      id: ++decisionSequence,
      day: now(),
      requestId,
      title,
      choice,
      effects: structuredClone(effects),
      actor: meta.actor,
      rationale:
        meta.rationale?.trim().slice(0, 700) ||
        "Decision recorded by City Hall.",
      model: meta.model,
      confidence: meta.confidence,
      durationMs: meta.durationMs,
    });
    city.decisions.length = Math.min(city.decisions.length, 100);
  }

  function openRequest(template: RequestTemplate, projectId?: string) {
    if (template.constructionOnly) {
      const project = city.projects.find(
        (item) => item.definitionId === projectId,
      );
      if (
        !project ||
        project.status !== "building" ||
        city.requests.some(
          (item) =>
            item.projectId === projectId && item.templateId === template.id,
        )
      )
        return false;
    } else if (projectId || seen.has(template.id)) return false;
    seen.add(template.id);
    sourceCounts.set(
      template.source,
      (sourceCounts.get(template.source) || 0) + 1,
    );
    categoryCounts.set(
      template.category,
      (categoryCounts.get(template.category) || 0) + 1,
    );
    city.requests.push({
      id: `city-${city.generation}-${++requestSequence}`,
      templateId: template.id,
      projectId,
      arrivedDay: now(),
      // A contractor must answer before the final inspection. Keeping that
      // deadline just before opening lets a missed response delay unfinished work.
      dueDay: Math.min(
        now() + template.deadlineDays,
        projectId
          ? city.projects.find((item) => item.definitionId === projectId)!
              .completesDay - 0.05
          : Infinity,
      ),
      status: "open",
      clarified: false,
    });
    news(
      template.title,
      `${template.sender} · ${template.priority === "urgent" ? "Urgent request" : "New request"} · ${template.role}`,
      "arrival",
    );
    touch();
    return true;
  }

  function eligible(template: RequestTemplate) {
    if (
      seen.has(template.id) ||
      template.followUpOnly ||
      template.constructionOnly
    )
      return false;
    if (template.minDay !== undefined && termDay() < template.minDay)
      return false;
    if (template.maxDay !== undefined && termDay() > template.maxDay)
      return false;
    if (template.trigger) {
      const value = city.metrics[template.trigger.metric];
      if (
        template.trigger.below !== undefined &&
        value >= template.trigger.below
      )
        return false;
      if (
        template.trigger.above !== undefined &&
        value <= template.trigger.above
      )
        return false;
    }
    return true;
  }

  function releaseRequests(count = 2) {
    let lastCategory = "";
    let urgentToday = false;
    for (let n = 0; n < count; n++) {
      const pool = REQUEST_CATALOG.filter(eligible);
      if (!pool.length) break;
      const weights = pool.map((template) => {
        const sourceBalance =
          1 / Math.sqrt(1 + (sourceCounts.get(template.source) || 0));
        const categoryBalance =
          1 / Math.sqrt(1 + (categoryCounts.get(template.category) || 0));
        const repeatedCategory = template.category === lastCategory ? 0.12 : 1;
        const urgentBalance =
          template.priority === "urgent" && urgentToday ? 0.06 : 1;
        return (
          sourceBalance *
          categoryBalance *
          repeatedCategory *
          urgentBalance *
          (template.trigger ? 1.4 : 1)
        );
      });
      let ticket = random() * weights.reduce((sum, weight) => sum + weight, 0);
      let index = 0;
      while (index < pool.length - 1 && (ticket -= weights[index]) > 0) index++;
      const chosen = pool[index];
      openRequest(chosen);
      lastCategory = chosen.category;
      urgentToday ||= chosen.priority === "urgent";
    }
  }

  function getOpenRequests() {
    return city.requests
      .filter((request) => request.status === "open")
      .sort((a, b) => {
        const aTemplate = requestById[a.templateId];
        const bTemplate = requestById[b.templateId];
        const aUrgent = a.dueDay - now() <= 0.5;
        const bUrgent = b.dueDay - now() <= 0.5;
        return (
          Number(bUrgent) - Number(aUrgent) ||
          priority[aTemplate.priority] - priority[bTemplate.priority] ||
          a.dueDay - b.dueDay ||
          a.arrivedDay - b.arrivedDay
        );
      });
  }

  function getConstructionIssues(projectId?: string) {
    return getOpenRequests().filter(
      (request) =>
        request.projectId && (!projectId || request.projectId === projectId),
    );
  }

  function getConstructionProgress(projectOrId: CityProject | string) {
    const project =
      typeof projectOrId === "string"
        ? city.projects.find((item) => item.definitionId === projectOrId)
        : projectOrId;
    if (!project) return 0;
    if (project.status === "complete") return 1;
    return clamp(
      project.progress ??
        (now() - project.startedDay) /
          Math.max(0.001, project.completesDay - project.startedDay),
      0,
      1,
    );
  }

  function requestDistrict(request: CityRequest) {
    return request.projectId
      ? projectById[request.projectId].district
      : requestById[request.templateId].district;
  }

  function constructionMilestoneDay(project: CityProject) {
    const milestone = CONSTRUCTION_MILESTONES[project.constructionStage ?? 0];
    if (milestone === undefined) return Infinity;
    const progress = getConstructionProgress(project);
    if (progress >= milestone - 1e-8) return now();
    return (
      now() +
      ((project.completesDay - now()) * (milestone - progress)) /
        Math.max(1e-8, 1 - progress)
    );
  }

  function releaseConstructionIssues() {
    for (const project of city.projects) {
      if (project.status !== "building" || project.completesDay <= now() + 1e-8)
        continue;
      const stage = project.constructionStage ?? 0;
      if (
        stage >= CONSTRUCTION_MILESTONES.length ||
        constructionMilestoneDay(project) > now() + 1e-8
      )
        continue;
      const definition = projectById[project.definitionId];
      const pool = REQUEST_CATALOG.filter(
        (template) =>
          template.constructionOnly &&
          template.district === definition.district &&
          (!template.constructionProjectIds ||
            template.constructionProjectIds.includes(definition.id)) &&
          !city.requests.some(
            (request) =>
              request.projectId === definition.id &&
              request.templateId === template.id,
          ),
      );
      project.constructionStage = stage + 1;
      if (pool.length)
        openRequest(pool[Math.floor(random() * pool.length)], definition.id);
      touch();
    }
  }

  function delayConstruction(request: CityRequest, days = 0) {
    if (!request.projectId || days <= 0) return "";
    const project = city.projects.find(
      (item) => item.definitionId === request.projectId,
    );
    if (!project || project.status !== "building") return "";
    project.completesDay += days;
    project.delayDays = (project.delayDays ?? 0) + days;
    return ` ${projectById[request.projectId].name} needs ${days} extra city day${days === 1 ? "" : "s"}; opening is now day ${Number(project.completesDay.toFixed(1))}.`;
  }

  function getPendingPetitions() {
    return city.petitions
      .filter((petition) => petition.status === "pending")
      .sort(
        (a, b) =>
          a.createdDay - b.createdDay ||
          Number(a.id.split("-").at(-1)) - Number(b.id.split("-").at(-1)),
      );
  }

  function submitPetition(
    text: string,
    district: DistrictId | "city" = "city",
  ): ActionResult & { petitionId?: string } {
    if (city.phase !== "playing")
      return fail("Start or continue a mayoral term before sending a request.");
    if (typeof text !== "string" || text.trim().length > MAX_PETITION_LENGTH)
      return fail(`Keep your request to ${MAX_PETITION_LENGTH} characters.`);
    const clean = redactSaveText(text.trim());
    if (clean.length < 3) return fail("Write a request for the mayor first.");
    if (
      district !== "city" &&
      !districtDefinitions.some((item) => item.id === district)
    )
      return fail("Choose one of the city's neighborhoods.");
    if (getPendingPetitions().length >= MAX_PENDING_PETITIONS)
      return fail(
        `The mayor already has ${MAX_PENDING_PETITIONS} of your requests waiting. Let those receive a reply first.`,
      );
    if (
      getPendingPetitions().some(
        (petition) => petition.text === clean && petition.district === district,
      )
    )
      return fail("That request is already waiting in the mayor's inbox.");
    const petitionId = `petition-${city.generation}-${++petitionSequence}`;
    city.petitions.push({
      id: petitionId,
      text: clean,
      district,
      createdDay: now(),
      status: "pending",
    });
    // Preserve every unanswered request, plus recent replies, without unbounded saves.
    while (city.petitions.length > MAX_PETITION_HISTORY) {
      const oldestReply = city.petitions.findIndex(
        (petition) => petition.status !== "pending",
      );
      if (oldestReply < 0) break;
      city.petitions.splice(oldestReply, 1);
    }
    news("Your request reached City Hall", clean, "arrival");
    touch();
    return { ok: true, petitionId };
  }

  function getPetitionActions(petitionId: string) {
    const petition = city.petitions.find((item) => item.id === petitionId);
    return petition?.status === "pending"
      ? petitionActionsFor(city, estimateBudget)
      : [];
  }

  function resolvePetition(
    petitionId: string,
    actionId: string,
    meta: DecisionMeta,
  ): ActionResult {
    const guard = actionGuard();
    if (guard) return fail(guard);
    const petition = city.petitions.find((item) => item.id === petitionId);
    if (!petition || petition.status !== "pending")
      return fail("This citizen request is no longer waiting for a reply.");
    const action = getPetitionActions(petitionId).find(
      (item) => item.id === actionId,
    );
    if (!action || !action.available)
      return fail(
        action?.unavailableReason ||
          "That response is not supported by the current city facts.",
      );
    const text = petitionResponseText(city, action);
    const decisionMeta = { ...meta, rationale: text };
    let result = ok();
    let effects: Effects = {};
    if (action.kind === "project" && action.projectId) {
      result = buildProject(action.projectId, decisionMeta);
      effects = { treasury: -action.cost };
    } else if (
      action.kind === "department" &&
      action.department &&
      action.level !== undefined
    )
      result = setDepartment(action.department, action.level, decisionMeta);
    else if (action.kind === "tax" && action.tax)
      result = setTax(action.tax, decisionMeta);
    else if (action.kind === 'civic' && action.civicActionId) {
      const before = city.treasury;
      result = performCivicAction(action.civicActionId, decisionMeta);
      effects = city.decisions[0]?.effects ?? (city.treasury !== before ? { treasury: city.treasury - before } : {});
    }
    if (!result.ok) return result;
    petition.status = action.status;
    petition.response = {
      text,
      reason: action.reason,
      actionId: action.id,
      day: now(),
      actor: meta.actor,
      effects,
      model: meta.model,
      confidence: meta.confidence,
      durationMs: meta.durationMs,
    };
    observeLivingDecision(city, { title: text, districtId: petition.district === 'city' ? action.districtId : petition.district, sourceId: petition.id, actor: meta.actor, effects });
    if (action.status === 'deferred' && (action.reason === 'budget' || action.reason === 'priority')) trackReviewReminder(city, petition.text, petition.id, meta, petition.district === 'city' ? action.districtId : petition.district);
    if (action.status === "approved") {
      // The concrete action already wrote one ledger entry. Link it to the citizen
      // case instead of counting the same expenditure twice in the decision log.
      city.decisions[0].requestId = petition.id;
      city.decisions[0].rationale = text;
    } else
      record(
        "Your request to the mayor",
        action.label,
        effects,
        decisionMeta,
        petition.id,
      );
    news(
      action.reason === "in_progress"
        ? "Your request: already underway"
        : `Your request: ${action.status}`,
      text,
      "decision",
    );
    touch();
    return ok();
  }

  function getCivicActions(): CivicActionOption[] {
    return getLivingActions(city);
  }

  function performCivicAction(id: string, meta: DecisionMeta): ActionResult {
    const guard = actionGuard();
    if (guard) return fail(guard);
    const result = executeLivingAction(city, id, meta);
    if (!result.ok) return fail(result.error ?? 'This civic action could not be performed.');
    record(result.title ?? 'City operations', id, result.effects ?? {}, meta);
    news(result.title ?? 'City operations', meta.rationale || getLivingActions(city).find(a => a.id === id)?.effectsHint || 'The city action took effect. Its consequences are tracked in City life.', 'decision');
    refreshBudget();
    touch();
    return ok();
  }

  function createProjectCommitment(projectId: string, meta: DecisionMeta, sourceId?: string): ActionResult {
    const result = performCivicAction(`commit_project:${projectId}`, meta);
    if (result.ok && sourceId) {
      const promise = city.living.promises.find(p => p.targetId === projectId && p.automatic && (p.status === 'active' || p.status === 'renegotiated'));
      if (promise) promise.sourceId = sourceId;
    }
    return result;
  }

  function getLivingBriefing() { refreshLivingCity(city); return [...city.living.briefing]; }

  function getAvailableOptions(
    requestOrId: CityRequest | string,
  ): RequestOption[] {
    const request =
      typeof requestOrId === "string"
        ? city.requests.find((item) => item.id === requestOrId)
        : city.requests.find((item) => item.id === requestOrId.id);
    if (!request || request.status !== "open" || request.dueDay <= now())
      return [];
    if (
      request.projectId &&
      !city.projects.some(
        (project) =>
          project.definitionId === request.projectId &&
          project.status === "building",
      )
    )
      return [];
    return (requestById[request.templateId]?.options || []).filter(
      (option) =>
        (option.effects.treasury ?? 0) >= 0 ||
        city.treasury + (option.effects.treasury ?? 0) >= 0,
    );
  }

  function processDueEvents() {
    const time = now();
    const previousRevision = city.revision;
    for (const request of city.requests) {
      if (request.status !== "open") continue;
      const template = requestById[request.templateId];
      if (request.dueDay <= time + 1e-8) {
        request.status = "expired";
        request.resolvedDay = time;
        delete request.clarificationDue;
        city.expired += 1;
        applyEffects(template.expiry, requestDistrict(request));
        const delayNote = delayConstruction(
          request,
          template.constructionExpiryDelayDays,
        );
        news(
          `Deadline missed: ${template.title}`,
          `${template.sender} received no decision. The published expiry consequences have taken effect.${delayNote}`,
          "warning",
        );
        touch();
      } else if (
        request.clarificationDue !== undefined &&
        request.clarificationDue <= time + 1e-8
      ) {
        request.clarified = true;
        delete request.clarificationDue;
        news(
          `${template.sender} replied`,
          template.clarification?.answer ||
            "No additional information is available.",
          "city",
        );
        touch();
      }
    }
    for (const project of city.projects) {
      if (project.status !== "building" || project.completesDay > time + 1e-8)
        continue;
      const definition = projectById[project.definitionId];
      project.status = "complete";
      project.progress = 1;
      project.constructionStage = CONSTRUCTION_MILESTONES.length;
      applyEffects(definition.effects, definition.district);
      news(
        `${definition.name} is open`,
        `${definition.description} Daily upkeep of $${definition.upkeep.toLocaleString()} starts now.`,
        "project",
      );
      touch();
    }
    releaseConstructionIssues();
    const due = city.scheduled.filter((event) => event.dueDay <= time + 1e-8);
    city.scheduled = city.scheduled.filter(
      (event) => event.dueDay > time + 1e-8,
    );
    for (const event of due) {
      scheduledOrigins.delete(event.id);
      applyEffects(event.effects, event.district);
      news(event.title, event.text, "city");
      if (event.followUp && requestById[event.followUp])
        openRequest(requestById[event.followUp]);
      touch();
    }
    if (city.revision !== previousRevision) refreshBudget();
  }

  function resolveRequest(
    requestId: string,
    optionId: string,
    meta: DecisionMeta,
  ): ActionResult {
    const guard = actionGuard();
    if (guard) return fail(guard);
    const request = city.requests.find((item) => item.id === requestId);
    if (!request || request.status !== "open")
      return fail("This request is no longer open.");
    if (request.dueDay <= now())
      return fail("This request's deadline has passed.");
    const template = requestById[request.templateId];
    const option = template.options.find((item) => item.id === optionId);
    if (!option)
      return fail("Choose one of the published options for this request.");
    if (!getAvailableOptions(request).some((item) => item.id === optionId))
      return fail("The treasury cannot cover this decision.");
    request.status = "resolved";
    request.decision = option.id;
    request.resolvedDay = now();
    request.actor = meta.actor;
    request.rationale = meta.rationale?.trim().slice(0, 700);
    delete request.clarificationDue;
    city.resolved += 1;
    const applied = applyEffects(option.effects, requestDistrict(request));
    observeLivingDecision(city, { title: `${template.sender}: ${option.label}`, districtId: requestDistrict(request), sourceId: request.id, category: template.category, effects: applied, actor: meta.actor });
    const delayNote = delayConstruction(request, option.constructionDelayDays);
    if (option.delayed || option.followUp) {
      const delayed = option.delayed;
      city.scheduled.push({
        id: `consequence-${++scheduledSequence}`,
        dueDay: now() + (delayed?.days ?? 2),
        title: delayed?.title || `Follow-up: ${template.title}`,
        text:
          delayed?.text ||
          "The city is ready for the next part of this decision.",
        effects: structuredClone(delayed?.effects || {}),
        district: template.district,
        followUp: option.followUp,
      });
      scheduledOrigins.set(`consequence-${scheduledSequence}`, {
        templateId: template.id,
        optionId: option.id,
      });
    }
    record(template.title, option.label, applied, meta, request.id);
    news(
      template.title,
      `${option.label}. ${meta.rationale?.trim().slice(0, 280) || option.description}${delayNote}`,
      "decision",
    );
    refreshBudget();
    touch();
    return ok();
  }

  function clarifyRequest(id: string): ActionResult {
    const guard = actionGuard();
    if (guard) return fail(guard);
    const request = city.requests.find((item) => item.id === id);
    if (!request || request.status !== "open" || request.dueDay <= now())
      return fail("This request is no longer open.");
    const template = requestById[request.templateId];
    if (!template.clarification)
      return fail("This sender has supplied all available information.");
    if (request.clarified || request.clarificationDue !== undefined)
      return fail("Additional information has already been requested.");
    request.clarificationDue = now() + 0.2;
    city.answered += 1;
    news(
      `Question sent to ${template.sender}`,
      `${template.clarification.question} A reply takes four city seconds; the original deadline still applies.`,
      "city",
    );
    touch();
    return ok();
  }

  function buildProject(projectId: string, meta: DecisionMeta): ActionResult {
    const guard = actionGuard();
    if (guard) return fail(guard);
    const project = Object.hasOwn(projectById, projectId)
      ? projectById[projectId]
      : undefined;
    if (!project) return fail("Choose a project from the city plan.");
    if (city.projects.some((item) => item.definitionId === projectId))
      return fail("This project has already been commissioned.");
    if (city.treasury < project.cost)
      return fail("The treasury cannot cover this construction contract.");
    city.treasury -= project.cost;
    city.projects.push({
      definitionId: projectId,
      startedDay: now(),
      completesDay: now() + project.duration,
      status: "building",
      progress: 0,
      delayDays: 0,
      constructionStage: 0,
      inherited: false,
      operationalDelayDays: 0,
    });
    city.living.construction.projectQuality[projectId] = city.living.construction.contractor;
    trackProjectPromise(city, projectId, meta);
    refreshBudget();
    const effects = { treasury: -project.cost };
    record(project.name, "Construction commissioned", effects, meta);
    news(
      `Work begins: ${project.name}`,
      `Completion in ${project.duration} city days. Benefits and $${project.upkeep}/day upkeep begin when it opens.`,
      "project",
    );
    touch();
    return ok();
  }

  function setDepartment(
    department: Department,
    level: 0 | 1 | 2,
    meta: DecisionMeta = { actor: "you" },
  ): ActionResult {
    const guard = actionGuard();
    if (guard) return fail(guard);
    if (!departments.includes(department) || ![0, 1, 2].includes(level))
      return fail("Choose a valid department funding level.");
    if (city.departments[department] === level)
      return fail("This department already has that funding level.");
    city.departments[department] = level;
    const label = ["Reduced", "Standard", "Enhanced"][level];
    record(
      `${department[0].toUpperCase()}${department.slice(1)} department`,
      `${label} funding`,
      {},
      meta,
    );
    news(
      `${department[0].toUpperCase()}${department.slice(1)} funding changed`,
      `${label} funding now affects the daily budget and ${departmentMetric[department]}.`,
      "decision",
    );
    refreshBudget();
    touch();
    return ok();
  }

  function setTax(
    tax: CityState["tax"],
    meta: DecisionMeta = { actor: "you" },
  ): ActionResult {
    const guard = actionGuard();
    if (guard) return fail(guard);
    if (!Object.hasOwn(taxRate, tax))
      return fail("Choose low, balanced, or high taxes.");
    if (city.tax === tax) return fail("The city already uses that tax rate.");
    city.tax = tax;
    record(
      "City tax policy",
      `${tax[0].toUpperCase()}${tax.slice(1)} taxes`,
      {},
      meta,
    );
    news(
      "Tax policy updated",
      `${tax[0].toUpperCase()}${tax.slice(1)} taxes apply to the next daily budget. Tax pressure also affects happiness and the economy each day.`,
      "decision",
    );
    refreshBudget();
    touch();
    return ok();
  }

  function addBriefing(text: string): ActionResult {
    const guard = actionGuard();
    if (guard) return fail(guard);
    const clean = text.trim().slice(0, 500);
    if (!clean) return fail("Write a priority for City Hall first.");
    if (city.briefings.at(-1)?.text === clean)
      return fail("That briefing is already on the desk.");
    city.briefings.push({ day: now(), text: clean });
    if (city.briefings.length > 8) city.briefings.shift();
    news("A new mayoral briefing", clean, "brief");
    touch();
    return ok();
  }

  function setMode(mode: MayorMode): ActionResult {
    if (!["manual", "local", "jev"].includes(mode))
      return fail("Choose a valid mayoral control mode.");
    if (mode === "jev") city.speed = 1;
    if (city.mode === mode) return ok();
    city.mode = mode;
    touch();
    return ok();
  }

  function pauseCity(paused: boolean): ActionResult {
    if (city.phase !== "playing")
      return fail("There is no active term to pause.");
    if (!paused && city.issue)
      return fail(
        "Retry Jev or choose another mayoral control mode before resuming.",
      );
    if (city.paused === paused) return ok();
    city.paused = paused;
    return ok();
  }

  function setSpeed(speed: 1 | 2 | 4): ActionResult {
    if (![1, 2, 4].includes(speed))
      return fail("Choose 1×, 2×, or 4× city time.");
    if (city.mode === "jev" && speed !== 1)
      return fail("Live Jev governs at 1× so it has time to read and respond.");
    if (city.speed === speed) return ok();
    city.speed = speed;
    return ok();
  }

  function approval() {
    const weights: Record<Mandate, Partial<Record<Metric, number>>> = {
      balanced: {
        happiness: 0.28,
        trust: 0.17,
        health: 0.11,
        safety: 0.1,
        environment: 0.08,
        mobility: 0.09,
        economy: 0.09,
        education: 0.08,
      },
      people: {
        happiness: 0.34,
        trust: 0.18,
        health: 0.17,
        safety: 0.08,
        education: 0.12,
        economy: 0.05,
        mobility: 0.04,
        environment: 0.02,
      },
      green: {
        happiness: 0.24,
        trust: 0.15,
        environment: 0.28,
        mobility: 0.15,
        health: 0.08,
        economy: 0.04,
        safety: 0.03,
        education: 0.03,
      },
      growth: {
        happiness: 0.23,
        trust: 0.14,
        economy: 0.29,
        education: 0.12,
        mobility: 0.11,
        safety: 0.04,
        health: 0.04,
        environment: 0.03,
      },
    };
    const weighted = metricKeys.reduce(
      (sum, metric) =>
        sum + city.metrics[metric] * (weights[city.mandate][metric] || 0),
      0,
    );
    const weakestDistrict = Math.min(
      ...city.districts.map((district) => district.happiness),
    );
    const inequalityPenalty =
      Math.max(0, city.metrics.happiness - weakestDistrict - 8) * 0.12;
    const deficitPenalty = Math.min(18, Math.max(0, -city.treasury) / 700);
    const needDevelopmentPenalty = city.projects.some(
      (project) => project.status === "complete",
    )
      ? 0
      : 2;
    return Math.round(
      clamp(
        weighted - inequalityPenalty - deficitPenalty - needDevelopmentPenalty + city.living.electionEffect,
        0,
        100,
      ),
    );
  }

  function getCityScore() {
    return Math.max(
      0,
      Math.round(
        approval() * 10 +
          city.population / 12 +
          clamp(city.treasury / 100, -250, 250) +
          city.projects.filter((project) => project.status === "complete")
            .length *
            25,
      ),
    );
  }

  function finishTerm() {
    const publicApproval = approval();
    const criticalServices = [
      city.metrics.health,
      city.metrics.safety,
      city.metrics.environment,
      city.metrics.mobility,
      city.metrics.education,
    ];
    const insolvent = city.treasury < -5000;
    const serviceCrisis = Math.min(...criticalServices) < 25;
    const won = publicApproval >= 55 && !insolvent && !serviceCrisis;
    const grade =
      publicApproval >= 85
        ? "A"
        : publicApproval >= 72
          ? "B"
          : publicApproval >= 60
            ? "C"
            : publicApproval >= 45
              ? "D"
              : "F";
    const development = city.projects.filter(
      (project) => project.status === "complete",
    ).length;
    const weakest = city.districts.reduce((a, b) =>
      a.happiness < b.happiness ? a : b,
    );
    const notes = [
      won
        ? "Voters renewed your mandate."
        : "Voters asked for a change in leadership.",
    ];
    if (insolvent)
      notes.push("A treasury deficit above $5,000 prevented reelection.");
    else if (city.treasury < 0)
      notes.push("The deficit reduced public confidence.");
    if (serviceCrisis)
      notes.push(
        "A core city service fell below the minimum election standard of 25.",
      );
    if (!development)
      notes.push(
        "Residents still want a completed civic project; this cost two approval points.",
      );
    else
      notes.push(
        `${development} completed civic project${development === 1 ? " now serves" : "s now serve"} the city.`,
      );
    if (weakest.happiness < 50)
      notes.push(`${weakest.name} needs attention next term.`);
    city.phase = "ended";
    city.paused = false;
    city.result = {
      won,
      approval: publicApproval,
      grade: insolvent || serviceCrisis ? "F" : grade,
      summary: notes.join(" "),
    };
    news(
      won
        ? "Election night: mandate renewed"
        : "Election night: a new direction",
      `${publicApproval}% approval. ${city.result.summary}`,
      "city",
    );
    touch();
  }

  function runDailyBudget() {
    refreshLivingCity(city);
    const budget = estimateBudget();
    city.treasury += budget.net;
    const changes: Partial<Record<Metric, number>> = {
      trust: city.treasury < 0 ? -0.35 : 0.025,
      economy: 0.025,
    };
    for (const department of departments)
      changes[departmentMetric[department]] = [-0.65, -0.045, 0.3][
        city.departments[department]
      ];
    changes.environment = (changes.environment || 0) - 0.025;
    // Higher service standards bring gradually rising maintenance and demand.
    for (const metric of [
      "health",
      "safety",
      "environment",
      "mobility",
      "education",
      "economy",
    ] as Metric[])
      changes[metric] =
        (changes[metric] || 0) -
        Math.max(0, city.metrics[metric] - 70) * SERVICE_DEMAND_RATE;
    const services =
      (city.metrics.health +
        city.metrics.safety +
        city.metrics.environment +
        city.metrics.mobility +
        city.metrics.economy +
        city.metrics.education) /
      6;
    const districtMood =
      city.districts.reduce((sum, district) => sum + district.happiness, 0) /
      city.districts.length;
    changes.happiness =
      ((services + districtMood) / 2 - city.metrics.happiness) * 0.025;
    if (city.tax === "low") {
      changes.happiness += 0.09;
      changes.economy! += 0.12;
    }
    if (city.tax === "high") {
      changes.happiness -= 0.14;
      changes.economy! -= 0.07;
    }
    if (city.treasury < 0) {
      changes.happiness -= 0.12;
      changes.economy! -= 0.15;
    }
    applyEffects({ metrics: changes });
    for (const district of city.districts)
      district.happiness = clamp(
        district.happiness +
          (city.metrics.happiness - district.happiness) * 0.008,
        0,
        100,
      );
    const populationChange = Math.round(
      (city.metrics.economy +
        city.metrics.health +
        city.metrics.happiness -
        180) /
        12,
    );
    if (populationChange) applyEffects({ population: populationChange });
    const livingResult = advanceLivingCity(city);
    applyEffects(livingResult.effects);
    // Explicit standing authorizations retain their original actor. Each contract
    // is revalidated against the current reserve after preceding commissions.
    for (const commission of livingResult.commissions) {
      const definition = projectById[commission.projectId];
      const futureUpkeep = city.projects.filter(p => p.status === 'building').reduce((sum, p) => sum + projectById[p.definitionId].upkeep, 0);
      const budgetNow = estimateBudget();
      const reserve = 1500 + Math.max(0, budgetNow.expenses + futureUpkeep + definition.upkeep - budgetNow.revenue) * 3 + definition.upkeep * 3;
      if (city.treasury - definition.cost < reserve || city.projects.some(p => p.definitionId === commission.projectId)) continue;
      buildProject(commission.projectId, { actor: commission.actor, rationale: `The published funding condition for ${commission.promiseId} is now met; the standing authorization commissioned this contract.` });
    }
    if (
      city.treasury < 0 &&
      (termDay() % 3 === 0 || city.treasury - budget.net >= 0)
    )
      news(
        "Treasury in deficit",
        "Operating costs continue. Reduce spending, adjust taxes, or approve revenue measures to restore the reserve.",
        "warning",
      );
    refreshBudget();
    touch();
  }

  function tickCity(dt: number) {
    if (!canAct() || !Number.isFinite(dt) || dt <= 0) return;
    let remaining =
      (Math.min(dt, DAY_SECONDS * TERM_DAYS) * city.speed) / DAY_SECONDS;
    // Visit event boundaries as well as midnight so large ticks cannot skip replies or deadlines.
    while (remaining > 1e-9 && city.phase === "playing") {
      refreshLivingCity(city);
      // Release a newly reached site stage before choosing the next clock boundary.
      processDueEvents();
      let step = Math.min(remaining, 1 - city.dayProgress);
      const time = now();
      const pendingTimes = [
        ...city.requests
          .filter((request) => request.status === "open")
          .flatMap((request) =>
            request.clarificationDue === undefined
              ? [request.dueDay]
              : [request.dueDay, request.clarificationDue],
          ),
        ...city.projects
          .filter((project) => project.status === "building")
          .flatMap((project) => [
            project.completesDay,
            constructionMilestoneDay(project),
          ]),
        ...city.scheduled.map((event) => event.dueDay),
      ];
      for (const due of pendingTimes)
        if (due > time + 1e-8) step = Math.min(step, due - time);
      for (const project of city.projects) {
        if (project.status !== "building") continue;
        const progress = getConstructionProgress(project);
        const workRate = getLivingWorkRate(city, project.definitionId);
        project.progress = clamp(
          progress +
            ((1 - progress) * step * workRate) /
              Math.max(1e-8, project.completesDay - time),
          progress,
          1,
        );
        const operationDelay = step * (1 - workRate);
        project.operationalDelayDays = (project.operationalDelayDays ?? 0) + operationDelay;
        project.completesDay += operationDelay;
      }
      city.dayProgress = Math.min(1, city.dayProgress + step);
      remaining -= step;
      if (city.dayProgress >= 1 - 1e-8) {
        city.dayProgress = 1;
        // A project opening at midnight cannot charge upkeep for the day before it opened.
        runDailyBudget();
        processDueEvents();
        snapshot();
        if (termDay() >= TERM_DAYS) {
          finishTerm();
          break;
        }
        city.day += 1;
        city.dayProgress = 0;
        releaseRequests();
        touch();
      } else processDueEvents();
      if (step <= 1e-9) break;
    }
    refreshBudget();
  }

  function startCity(
    mode: MayorMode = "manual",
    mandate: Mandate = "balanced",
    seed = 2026,
  ): ActionResult {
    if (
      !["manual", "local", "jev"].includes(mode) ||
      !["balanced", "people", "green", "growth"].includes(mandate)
    )
      return fail("Choose a valid mayoral mode and mandate.");
    const generation = city.generation + 1;
    Object.assign(city, initialState(generation));
    city.phase = "playing";
    city.mode = mode;
    city.mandate = mandate;
    city.seed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 2026;
    randomState = city.seed;
    requestSequence =
      petitionSequence =
      newsSequence =
      decisionSequence =
      scheduledSequence =
        0;
    seen.clear();
    sourceCounts.clear();
    categoryCounts.clear();
    scheduledOrigins.clear();
    syncPopulation();
    news(
      "Welcome to your first term",
      "Thirty city days, four neighborhoods, and one public trust. Balance citizen requests with services, construction, and a sustainable budget.",
      "city",
    );
    city.projects = INHERITED_PROJECTS.map((definitionId) => ({
      definitionId,
      startedDay: now(),
      completesDay:
        now() +
        projectById[definitionId].duration *
          (1 - INHERITED_PROGRESS[definitionId]),
      status: "building",
      progress: INHERITED_PROGRESS[definitionId],
      delayDays: 0,
      constructionStage: 0,
      inherited: true,
      operationalDelayDays: 0,
    }));
    city.living = createLivingCity(city);
    for (const project of city.projects) city.living.construction.projectQuality[project.definitionId] = 'standard';
    refreshLivingCity(city);
    news(
      "Two funded construction sites are in your care",
      "The previous council already paid the $5,400 Warm homes workshop and $6,200 Hillview learning wing contracts. Your $18,000 reserve remains available. You must handle site problems; upkeep begins only when the buildings open.",
      "project",
    );
    releaseConstructionIssues();
    releaseRequests();
    snapshot();
    touch();
    return ok();
  }

  function continueTerm(): ActionResult {
    if (city.phase !== "ended")
      return fail("Finish the current term before continuing.");
    city.term += 1;
    city.day += 1;
    city.dayProgress = 0;
    city.phase = "playing";
    city.result = null;
    city.paused = false;
    city.issue = null;
    city.generation += 1;
    seen.clear();
    sourceCounts.clear();
    categoryCounts.clear();
    // Unfinished petitions carry forward; do not issue a duplicate of an open story.
    for (const request of city.requests)
      if (request.status === "open") seen.add(request.templateId);
    // Retain recent completed records and every open case without growing forever.
    city.requests = [
      ...city.requests.filter(
        (request) => request.projectId && request.status !== "open",
      ),
      ...city.requests
        .filter((request) => !request.projectId && request.status !== "open")
        .slice(-120),
      ...city.requests.filter((request) => request.status === "open"),
    ];
    news(
      `Term ${city.term} begins`,
      "The city, construction works, outstanding cases, and promised consequences carry into the new term.",
      "city",
    );
    processDueEvents();
    releaseRequests();
    snapshot();
    touch();
    return ok();
  }

  function resetCity() {
    const generation = city.generation + 1;
    Object.assign(city, initialState(generation));
    seen.clear();
    sourceCounts.clear();
    categoryCounts.clear();
    scheduledOrigins.clear();
    requestSequence =
      petitionSequence =
      newsSequence =
      decisionSequence =
      scheduledSequence =
        0;
    touch();
  }

  function exportCityState() {
    return {
      version: 1 as const,
      city: {
        living: structuredClone(city.living),
        generation: city.generation,
        revision: city.revision,
        phase: city.phase,
        mode: city.mode,
        mandate: city.mandate,
        seed: city.seed,
        day: city.day,
        dayProgress: city.dayProgress,
        term: city.term,
        speed: city.speed,
        treasury: city.treasury,
        population: city.population,
        metrics: Object.fromEntries(
          metricKeys.map((key) => [key, city.metrics[key]]),
        ),
        districts: city.districts.map((d) => ({
          id: d.id,
          population: d.population,
          happiness: d.happiness,
        })),
        requests: city.requests.map((r) => ({
          id: r.id,
          templateId: r.templateId,
          projectId: r.projectId,
          arrivedDay: r.arrivedDay,
          dueDay: r.dueDay,
          status: r.status,
          clarified: r.clarified,
          clarificationDue: r.clarificationDue,
          decision: r.decision,
          resolvedDay: r.resolvedDay,
          actor: r.actor,
          rationale:
            r.rationale === undefined ? undefined : redactSaveText(r.rationale),
        })),
        petitions: city.petitions.map((petition) => ({
          id: petition.id,
          text: redactSaveText(petition.text),
          district: petition.district,
          createdDay: petition.createdDay,
          status: petition.status,
          response: petition.response
            ? {
                text: redactSaveText(petition.response.text),
                reason: petition.response.reason,
                actionId: petition.response.actionId,
                day: petition.response.day,
                actor: petition.response.actor,
                effects: saveEffects(petition.response.effects),
                model: petition.response.model
                  ? redactSaveText(petition.response.model)
                  : petition.response.model,
                confidence: petition.response.confidence,
                durationMs: petition.response.durationMs,
              }
            : undefined,
        })),
        projects: city.projects.map((p) => ({
          definitionId: p.definitionId,
          startedDay: p.startedDay,
          completesDay: p.completesDay,
          status: p.status,
          progress: getConstructionProgress(p),
          delayDays: p.delayDays ?? 0,
          constructionStage: p.constructionStage ?? 0,
          inherited: p.inherited ?? false,
          operationalDelayDays: p.operationalDelayDays ?? 0,
        })),
        news: city.news.map((n) => ({
          id: n.id,
          day: n.day,
          title: redactSaveText(n.title),
          text: redactSaveText(n.text),
          kind: n.kind,
        })),
        decisions: city.decisions.map((d) => ({
          id: d.id,
          day: d.day,
          requestId: d.requestId,
          title: redactSaveText(d.title),
          choice: redactSaveText(d.choice),
          actor: d.actor,
          rationale: redactSaveText(d.rationale),
          effects: saveEffects(d.effects),
          model: d.model ? redactSaveText(d.model) : d.model,
          confidence: d.confidence,
          durationMs: d.durationMs,
        })),
        history: city.history.map((h) => ({
          day: h.day,
          treasury: h.treasury,
          population: h.population,
          metrics: Object.fromEntries(
            metricKeys.map((key) => [key, h.metrics[key]]),
          ),
          revenue: h.revenue,
          expenses: h.expenses,
        })),
        briefings: city.briefings.map((b) => ({
          day: b.day,
          text: redactSaveText(b.text),
        })),
        departments: Object.fromEntries(
          departments.map((d) => [d, city.departments[d]]),
        ),
        tax: city.tax,
        resolved: city.resolved,
        expired: city.expired,
        answered: city.answered,
        result: city.result
          ? {
              won: city.result.won,
              approval: city.result.approval,
              grade: city.result.grade,
              summary: redactSaveText(city.result.summary),
            }
          : null,
      },
      internal: {
        randomState,
        requestSequence,
        petitionSequence,
        newsSequence,
        decisionSequence,
        scheduledSequence,
        seen: [...seen],
        sourceCounts: [...sourceCounts],
        categoryCounts: [...categoryCounts],
        scheduled: city.scheduled.map((event) => ({
          id: event.id,
          dueDay: event.dueDay,
          ...scheduledOrigins.get(event.id),
        })),
      },
    };
  }

  function restoreCityState(data: unknown): ActionResult {
    try {
      const envelope = saveObject(data);
      if (envelope.version !== 1)
        throw new Error("This city save uses an unsupported version.");
      const input = saveObject(envelope.city);
      const internal = saveObject(envelope.internal);
      const restored = initialState(
        Math.max(
          city.generation,
          saveNumber(input.generation, 0, 1000000000, true),
        ) + 1,
      );
      restored.revision =
        saveNumber(input.revision, 0, Number.MAX_SAFE_INTEGER - 1, true) + 1;
      restored.phase = saveEnum(input.phase, ["playing", "ended"]);
      restored.mode = saveEnum(input.mode, ["manual", "local", "jev"]);
      restored.mandate = saveEnum(input.mandate, [
        "balanced",
        "people",
        "green",
        "growth",
      ]);
      restored.seed = saveNumber(input.seed, 0, 0xffffffff, true);
      restored.term = saveNumber(input.term, 1, 1000, true);
      restored.day = saveNumber(
        input.day,
        (restored.term - 1) * TERM_DAYS + 1,
        restored.term * TERM_DAYS,
        true,
      );
      restored.dayProgress = saveNumber(input.dayProgress, 0, 1);
      if (
        (restored.phase === "playing" && restored.dayProgress >= 1) ||
        (restored.phase === "ended" &&
          (restored.day !== restored.term * TERM_DAYS ||
            restored.dayProgress !== 1))
      )
        throw new Error("The saved city clock is inconsistent.");
      const time = restored.day + restored.dayProgress;
      restored.speed = saveNumber(input.speed, 1, 4, true) as 1 | 2 | 4;
      if (![1, 2, 4].includes(restored.speed))
        throw new Error("Invalid city speed.");
      if (restored.mode === "jev") restored.speed = 1;
      restored.treasury = saveNumber(
        input.treasury,
        -1000000000,
        1000000000,
        true,
      );
      restored.population = saveNumber(input.population, 100, 100000, true);
      restored.metrics = saveMetrics(input.metrics);
      const districts = saveArray(
        input.districts,
        districtDefinitions.length,
      ).map(saveObject);
      if (
        districts.length !== districtDefinitions.length ||
        new Set(districts.map((d) => d.id)).size !== districts.length
      )
        throw new Error("The saved districts are incomplete.");
      restored.districts = districtDefinitions.map((definition) => {
        const district = districts.find((d) => d.id === definition.id);
        if (!district) throw new Error("Unknown saved district.");
        return {
          ...definition,
          population: saveNumber(district.population, 0, 100000, true),
          happiness: saveNumber(district.happiness, 0, 100),
        };
      });
      if (
        restored.districts.reduce((sum, d) => sum + d.population, 0) !==
        restored.population
      )
        throw new Error("Saved district populations do not add up.");
      restored.requests = saveArray(input.requests, 250).map((value) => {
        const item = saveObject(value);
        const templateId = saveString(item.templateId, 100);
        if (!Object.hasOwn(requestById, templateId))
          throw new Error("Unknown saved request.");
        const template = requestById[templateId];
        const id = saveString(item.id, 80);
        if (!/^city-\d+-\d+$/.test(id))
          throw new Error("Invalid saved request identity.");
        const request: CityRequest = {
          id,
          templateId,
          arrivedDay: saveNumber(item.arrivedDay, 1, time),
          dueDay: saveNumber(item.dueDay, 1, time + 30),
          status: saveEnum(item.status, ["open", "resolved", "expired"]),
          clarified: saveBoolean(item.clarified),
        };
        if (item.projectId !== undefined) {
          request.projectId = saveString(item.projectId, 100);
          if (
            !template.constructionOnly ||
            !Object.hasOwn(projectById, request.projectId) ||
            projectById[request.projectId].district !== template.district ||
            (template.constructionProjectIds &&
              !template.constructionProjectIds.includes(request.projectId))
          )
            throw new Error("A saved construction issue has an invalid site.");
        } else if (template.constructionOnly)
          throw new Error("A saved construction issue is missing its site.");
        if (
          template.constructionOnly
            ? request.dueDay <= request.arrivedDay ||
              request.dueDay - request.arrivedDay > template.deadlineDays + 1e-6
            : Math.abs(
                request.dueDay - request.arrivedDay - template.deadlineDays,
              ) > 1e-6
        )
          throw new Error("A saved request deadline is inconsistent.");
        if (request.clarified && !template.clarification)
          throw new Error("Unknown saved clarification.");
        if (item.clarificationDue !== undefined) {
          request.clarificationDue = saveNumber(
            item.clarificationDue,
            time,
            time + 0.200001,
          );
          if (
            !template.clarification ||
            request.clarified ||
            request.status !== "open"
          )
            throw new Error("Invalid pending clarification.");
        }
        if (item.decision !== undefined) {
          request.decision = saveString(item.decision, 100);
          if (
            request.status !== "resolved" ||
            !template.options.some((option) => option.id === request.decision)
          )
            throw new Error("Unknown saved request decision.");
        }
        if (item.resolvedDay !== undefined)
          request.resolvedDay = saveNumber(
            item.resolvedDay,
            request.arrivedDay,
            time,
          );
        if (item.actor !== undefined)
          request.actor = saveEnum(item.actor, [
            "you",
            "local",
            "jev",
          ] as const);
        if (item.rationale !== undefined)
          request.rationale = saveString(item.rationale, 700);
        if (
          (request.status === "open" &&
            (request.dueDay <= time ||
              request.resolvedDay !== undefined ||
              request.actor !== undefined)) ||
          (request.status === "resolved" &&
            (!request.decision || request.resolvedDay === undefined)) ||
          (request.status === "expired" &&
            (request.resolvedDay === undefined || request.dueDay > time))
        )
          throw new Error("A saved request status is inconsistent.");
        return request;
      });
      if (
        new Set(restored.requests.map((r) => r.id)).size !==
          restored.requests.length ||
        new Set(
          restored.requests
            .filter((r) => r.status === "open")
            .map((r) => `${r.templateId}:${r.projectId ?? ""}`),
        ).size !== restored.requests.filter((r) => r.status === "open").length
      )
        throw new Error("Duplicate saved request.");
      restored.projects = saveArray(input.projects, PROJECTS.length).map(
        (value) => {
          const item = saveObject(value);
          const definitionId = saveString(item.definitionId, 100);
          if (!Object.hasOwn(projectById, definitionId))
            throw new Error("Unknown saved project.");
          const inherited =
            item.inherited === undefined ? false : saveBoolean(item.inherited);
          if (inherited && !Object.hasOwn(INHERITED_PROGRESS, definitionId))
            throw new Error("Unknown inherited construction contract.");
          const initialProgress = inherited
            ? INHERITED_PROGRESS[definitionId]
            : 0;
          const project: CityProject = {
            definitionId,
            startedDay: saveNumber(item.startedDay, 1, time),
            completesDay: saveNumber(item.completesDay, 1, time + 30),
            status: saveEnum(item.status, ["building", "complete"]),
            inherited,
            delayDays:
              item.delayDays === undefined
                ? 0
                : saveNumber(item.delayDays, 0, 4),
            operationalDelayDays: item.operationalDelayDays === undefined ? 0 : saveNumber(item.operationalDelayDays, 0, time),
          };
          if (inherited && project.startedDay !== 1)
            throw new Error(
              "An inherited construction contract starts in the first term.",
            );
          const expectedDuration =
            projectById[definitionId].duration * (1 - initialProgress) +
            project.delayDays! + project.operationalDelayDays!;
          if (
            Math.abs(
              project.completesDay - project.startedDay - expectedDuration,
            ) > 1e-6 ||
            (project.status === "complete" && project.completesDay > time) ||
            (project.status === "building" && project.completesDay <= time)
          )
            throw new Error("A saved project timeline is inconsistent.");
          const elapsedProgress = clamp(
            initialProgress +
              ((1 - initialProgress) * (time - project.startedDay)) /
                expectedDuration,
            initialProgress,
            1,
          );
          project.progress =
            item.progress === undefined
              ? elapsedProgress
              : saveNumber(item.progress, initialProgress, 1);
          if (
            (project.status === "complete" && project.progress !== 1) ||
            (project.status === "building" && project.progress >= 1)
          )
            throw new Error("A saved project's work progress is inconsistent.");
          // Older version-one saves have no site events. Only future work stages
          // gain complications; previously completed work is not rewritten.
          project.constructionStage =
            item.constructionStage === undefined
              ? CONSTRUCTION_MILESTONES.filter(
                  (milestone) => milestone <= project.progress!,
                ).length
              : saveNumber(
                  item.constructionStage,
                  0,
                  CONSTRUCTION_MILESTONES.length,
                  true,
                );
          return project;
        },
      );
      if (
        new Set(restored.projects.map((p) => p.definitionId)).size !==
        restored.projects.length
      )
        throw new Error("Duplicate saved project.");
      for (const request of restored.requests.filter(
        (item) => item.projectId,
      )) {
        const project = restored.projects.find(
          (item) => item.definitionId === request.projectId,
        );
        if (
          !project ||
          request.arrivedDay < project.startedDay ||
          (request.status === "open" &&
            (project.status !== "building" ||
              request.dueDay > project.completesDay + 1e-6))
        )
          throw new Error(
            "A saved construction issue has no matching active site.",
          );
      }
      for (const project of restored.projects) {
        const issues = restored.requests.filter(
          (request) => request.projectId === project.definitionId,
        );
        if (
          issues.length > (project.constructionStage ?? 0) ||
          new Set(issues.map((issue) => issue.templateId)).size !==
            issues.length
        )
          throw new Error("Saved construction stages are inconsistent.");
        const delay = issues.reduce((sum, request) => {
          const template = requestById[request.templateId];
          return (
            sum +
            (request.status === "expired"
              ? (template.constructionExpiryDelayDays ?? 0)
              : request.status === "resolved"
                ? (template.options.find(
                    (option) => option.id === request.decision,
                  )?.constructionDelayDays ?? 0)
                : 0)
          );
        }, 0);
        if (Math.abs(delay - (project.delayDays ?? 0)) > 1e-6)
          throw new Error(
            "A saved construction delay has no matching site decision.",
          );
      }
      restored.living = restoreLivingCity(input.living, restored);
      refreshLivingCity(restored);
      const knownPetitionActions = petitionActionsFor(restored, estimateBudget);
      // Petitions were added within save version 1. Earlier city saves have none.
      restored.petitions = saveArray(
        input.petitions ?? [],
        MAX_PETITION_HISTORY,
      ).map((value): CitizenPetition => {
        const item = saveObject(value);
        const id = saveString(item.id, 80);
        if (!/^petition-\d+-\d+$/.test(id))
          throw new Error("Invalid saved citizen request identity.");
        const text = saveString(item.text, MAX_PETITION_LENGTH).trim();
        if (text.length < 3)
          throw new Error("The saved citizen request is empty.");
        const petition: CitizenPetition = {
          id,
          text,
          district: saveEnum(item.district, [
            "city",
            "riverside",
            "oldtown",
            "market",
            "hillview",
          ]),
          createdDay: saveNumber(item.createdDay, 1, time),
          status: saveEnum(item.status, [
            "pending",
            "approved",
            "declined",
            "deferred",
          ]),
        };
        if (item.response !== undefined) {
          const response = saveObject(item.response);
          const actionId = saveString(response.actionId, 150);
          let action = knownPetitionActions.find(
            (candidate) => candidate.id === actionId,
          );
          const reason = saveEnum(response.reason, PETITION_REASONS);
          const historicCivicId = actionId.startsWith('civic:') ? actionId.slice(6) : actionId.startsWith('defer:budget:civic:') ? actionId.slice(19) : undefined;
          if (!action && historicCivicId && isKnownCivicActionId(historicCivicId, restored)) {
            const deferred = actionId.startsWith('defer:');
            action = { id: actionId, civicActionId: historicCivicId, kind: deferred ? 'defer' : 'civic', label: 'Recorded civic action', description: '', status: deferred ? 'deferred' : 'approved', reason: deferred ? 'budget' : reason, cost: 0, dayCost: 0, available: false };
          }
          if (
            !action ||
            action.status !== petition.status ||
            action.reason !== reason
          )
            throw new Error("A saved citizen reply has an unknown decision.");
          const day = saveNumber(response.day, petition.createdDay, time);
          const effects = saveEffects(response.effects);
          let expectedEffects: Effects =
            action.status === "approved" && action.kind === "project"
              ? { treasury: -action.cost }
              : {};
          if (action.kind === 'civic' && action.status === 'approved') {
            // Historical operational controls may no longer be offered. Their
            // exact applied effects must agree with the linked bounded ledger.
            const ledger = saveArray(input.decisions, 100).map(saveObject).find(d => d.requestId === petition.id && d.choice === action!.civicActionId);
            expectedEffects = historicalCivicEffects(action.civicActionId!, restored) ?? {};
            if (ledger && JSON.stringify(saveEffects(ledger.effects)) !== JSON.stringify(expectedEffects)) throw new Error('A saved civic reply disagrees with its decision ledger.');
          }
          if (JSON.stringify(effects) !== JSON.stringify(expectedEffects))
            throw new Error(
              "A saved citizen reply has inconsistent consequences.",
            );
          if (
            action.status === "approved" && action.kind === 'project' &&
            action.projectId &&
            !restored.projects.some(
              (project) =>
                project.definitionId === action.projectId &&
                Math.abs(project.startedDay - day) < 1e-6,
            )
          )
            throw new Error(
              "A saved citizen approval has no matching construction contract.",
            );
          petition.response = {
            text: saveString(response.text, 1600),
            reason,
            actionId,
            day,
            actor: saveEnum(response.actor, ["you", "local", "jev"]),
            effects,
            model:
              response.model == null
                ? (response.model as null | undefined)
                : saveString(response.model, 200),
            confidence:
              response.confidence == null
                ? (response.confidence as null | undefined)
                : saveNumber(response.confidence, 0, 1),
            durationMs:
              response.durationMs === undefined
                ? undefined
                : saveNumber(response.durationMs, 0, 3600000),
          };
        }
        if ((petition.status === "pending") === Boolean(petition.response))
          throw new Error("A saved citizen request status is inconsistent.");
        return petition;
      });
      if (
        new Set(restored.petitions.map((petition) => petition.id)).size !==
          restored.petitions.length ||
        restored.petitions.filter((petition) => petition.status === "pending")
          .length > MAX_PENDING_PETITIONS
      )
        throw new Error("Duplicate or excessive saved citizen requests.");
      restored.news = saveArray(input.news, 100).map((value) => {
        const item = saveObject(value);
        return {
          id: saveNumber(item.id, 1, 10000000, true),
          day: saveNumber(item.day, 1, time),
          title: saveString(item.title, 300),
          text: saveString(item.text, 1600),
          kind: saveEnum(item.kind, [
            "decision",
            "arrival",
            "city",
            "project",
            "warning",
            "brief",
          ]),
        };
      });
      restored.decisions = saveArray(input.decisions, 100).map((value) => {
        const item = saveObject(value);
        const requestId =
          item.requestId === undefined
            ? undefined
            : saveString(item.requestId, 80);
        if (
          requestId !== undefined &&
          !/^(city|petition)-\d+-\d+$/.test(requestId)
        )
          throw new Error("Invalid decision reference.");
        return {
          id: saveNumber(item.id, 1, 10000000, true),
          day: saveNumber(item.day, 1, time),
          requestId,
          title: saveString(item.title, 300),
          choice: saveString(item.choice, 300),
          actor: saveEnum(item.actor, ["you", "local", "jev"]),
          rationale: saveString(item.rationale, 700),
          effects: saveEffects(item.effects),
          model:
            item.model == null
              ? (item.model as null | undefined)
              : saveString(item.model, 200),
          confidence:
            item.confidence == null
              ? (item.confidence as null | undefined)
              : saveNumber(item.confidence, 0, 1),
          durationMs:
            item.durationMs === undefined
              ? undefined
              : saveNumber(item.durationMs, 0, 3600000),
        };
      });
      restored.history = saveArray(input.history, 180).map((value) => {
        const item = saveObject(value);
        return {
          day: saveNumber(item.day, 1, time),
          treasury: saveNumber(item.treasury, -1000000000, 1000000000, true),
          population: saveNumber(item.population, 100, 100000, true),
          metrics: saveMetrics(item.metrics),
          revenue: saveNumber(item.revenue, 0, 10000000, true),
          expenses: saveNumber(item.expenses, 0, 10000000, true),
        };
      });
      restored.briefings = saveArray(input.briefings, 8).map((value) => {
        const item = saveObject(value);
        return {
          day: saveNumber(item.day, 1, time),
          text: saveString(item.text, 500),
        };
      });
      const funding = saveObject(input.departments);
      for (const department of departments)
        restored.departments[department] = saveNumber(
          funding[department],
          0,
          2,
          true,
        );
      restored.tax = saveEnum(input.tax, ["low", "balanced", "high"]);
      restored.resolved = saveNumber(input.resolved, 0, 10000000, true);
      restored.expired = saveNumber(input.expired, 0, 10000000, true);
      restored.answered = saveNumber(input.answered, 0, 10000000, true);
      if (
        restored.resolved <
          restored.requests.filter((r) => r.status === "resolved").length ||
        restored.expired <
          restored.requests.filter((r) => r.status === "expired").length
      )
        throw new Error("Saved outcome counts are inconsistent.");
      if (input.result !== null) {
        const result = saveObject(input.result);
        restored.result = {
          won: saveBoolean(result.won),
          approval: saveNumber(result.approval, 0, 100, true),
          grade: saveEnum(result.grade, ["A", "B", "C", "D", "F"]),
          summary: saveString(result.summary, 1600),
        };
      }
      if ((restored.phase === "ended") !== (restored.result !== null))
        throw new Error("Saved election state is inconsistent.");
      const nextRandom = saveNumber(internal.randomState, 0, 0xffffffff, true);
      const nextRequestSequence = saveNumber(
        internal.requestSequence,
        0,
        10000000,
        true,
      );
      const nextPetitionSequence = saveNumber(
        internal.petitionSequence ?? 0,
        0,
        10000000,
        true,
      );
      const nextNewsSequence = saveNumber(
        internal.newsSequence,
        0,
        10000000,
        true,
      );
      const nextDecisionSequence = saveNumber(
        internal.decisionSequence,
        0,
        10000000,
        true,
      );
      const nextScheduledSequence = saveNumber(
        internal.scheduledSequence,
        0,
        10000000,
        true,
      );
      if (
        restored.requests.some(
          (r) => Number(r.id.split("-").at(-1)) > nextRequestSequence,
        ) ||
        restored.petitions.some(
          (petition) =>
            Number(petition.id.split("-").at(-1)) > nextPetitionSequence,
        ) ||
        restored.news.some((n) => n.id > nextNewsSequence) ||
        restored.decisions.some((d) => d.id > nextDecisionSequence)
      )
        throw new Error("Saved event counters are inconsistent.");
      const nextSeen = saveArray(internal.seen, REQUEST_CATALOG.length).map(
        (id) => {
          const value = saveString(id, 100);
          if (!Object.hasOwn(requestById, value))
            throw new Error("Unknown saved story history.");
          return value;
        },
      );
      if (
        new Set(nextSeen).size !== nextSeen.length ||
        restored.requests.some(
          (r) =>
            (r.status === "open" ||
              r.arrivedDay >= (restored.term - 1) * TERM_DAYS + 1) &&
            !nextSeen.includes(r.templateId),
        )
      )
        throw new Error("Saved story history is inconsistent.");
      function counts(value: unknown, allowed: string[]) {
        const values = saveArray(value, allowed.length).map(
          (entry): [string, number] => {
            const pair = saveArray(entry, 2);
            if (pair.length !== 2)
              throw new Error("Invalid saved distribution.");
            return [
              saveEnum(pair[0], allowed),
              saveNumber(pair[1], 0, REQUEST_CATALOG.length, true),
            ];
          },
        );
        if (new Set(values.map(([key]) => key)).size !== values.length)
          throw new Error("Duplicate saved distribution.");
        return values;
      }
      const nextSources = counts(internal.sourceCounts, [
        ...new Set(REQUEST_CATALOG.map((r) => r.source)),
      ]);
      const nextCategories = counts(internal.categoryCounts, [
        ...new Set(REQUEST_CATALOG.map((r) => r.category)),
      ]);
      const nextOrigins = new Map<
        string,
        { templateId: string; optionId: string }
      >();
      restored.scheduled = saveArray(
        internal.scheduled,
        REQUEST_CATALOG.length,
      ).map((value) => {
        const item = saveObject(value);
        const id = saveString(item.id, 80);
        if (
          !/^consequence-\d+$/.test(id) ||
          Number(id.split("-").at(-1)) > nextScheduledSequence ||
          nextOrigins.has(id)
        )
          throw new Error("Invalid saved consequence identity.");
        const templateId = saveString(item.templateId, 100);
        const optionId = saveString(item.optionId, 100);
        if (!Object.hasOwn(requestById, templateId))
          throw new Error("Unknown saved consequence.");
        const template = requestById[templateId];
        const option = template.options.find((o) => o.id === optionId);
        if (!option || (!option.delayed && !option.followUp))
          throw new Error("Unknown saved consequence choice.");
        const dueDay = saveNumber(item.dueDay, time, time + 30);
        const origin = restored.requests.find(
          (r) =>
            r.templateId === templateId &&
            r.status === "resolved" &&
            r.decision === optionId &&
            Math.abs(
              (r.resolvedDay ?? -100) + (option.delayed?.days ?? 2) - dueDay,
            ) < 1e-6,
        );
        if (!origin)
          throw new Error("A saved consequence has no matching decision.");
        if (
          nextOrigins.size &&
          [...restored.scheduled].some((e) => e.id === id)
        )
          throw new Error("Duplicate saved consequence.");
        nextOrigins.set(id, { templateId, optionId });
        return {
          id,
          dueDay,
          title: option.delayed?.title || `Follow-up: ${template.title}`,
          text:
            option.delayed?.text ||
            "The city is ready for the next part of this decision.",
          effects: structuredClone(option.delayed?.effects || {}),
          district: template.district,
          followUp: option.followUp,
        };
      });
      restored.paused = true;
      restored.issue =
        restored.mode === "jev" && restored.phase === "playing"
          ? "Reconnect Jev or choose another control mode to resume this saved city."
          : null;
      // Commit only after the entire candidate, including private state, passed validation.
      Object.assign(city, restored);
      randomState = nextRandom;
      requestSequence = nextRequestSequence;
      petitionSequence = nextPetitionSequence;
      newsSequence = nextNewsSequence;
      decisionSequence = nextDecisionSequence;
      scheduledSequence = nextScheduledSequence;
      seen.clear();
      nextSeen.forEach((id) => seen.add(id));
      sourceCounts.clear();
      nextSources.forEach(([key, count]) => sourceCounts.set(key, count));
      categoryCounts.clear();
      nextCategories.forEach(([key, count]) => categoryCounts.set(key, count));
      scheduledOrigins.clear();
      nextOrigins.forEach((origin, id) => scheduledOrigins.set(id, origin));
      refreshBudget();
      return ok();
    } catch (error) {
      return fail(
        error instanceof Error
          ? error.message
          : "The city save could not be read.",
      );
    }
  }

  return {
    city,
    state: city,
    startCity,
    tickCity,
    resolveRequest,
    clarifyRequest,
    buildProject,
    setDepartment,
    setTax,
    addBriefing,
    setMode,
    pauseCity,
    setSpeed,
    continueTerm,
    resetCity,
    getOpenRequests,
    getConstructionIssues,
    getConstructionProgress,
    getPendingPetitions,
    submitPetition,
    getPetitionActions,
    resolvePetition,
    getAvailableOptions,
    getCivicActions,
    performCivicAction,
    getLivingBriefing,
    createProjectCommitment,
    estimateBudget,
    getCityScore,
    exportCityState,
    restoreCityState,
  };
}

const simulation = createCitySimulation();
export const {
  city,
  startCity,
  tickCity,
  resolveRequest,
  clarifyRequest,
  buildProject,
  setDepartment,
  setTax,
  addBriefing,
  setMode,
  pauseCity,
  setSpeed,
  continueTerm,
  resetCity,
  getOpenRequests,
  getConstructionIssues,
  getConstructionProgress,
  getPendingPetitions,
  submitPetition,
  getPetitionActions,
  resolvePetition,
  getAvailableOptions,
  getCivicActions,
  performCivicAction,
  getLivingBriefing,
  createProjectCommitment,
  estimateBudget,
  getCityScore,
  exportCityState,
  restoreCityState,
} = simulation;

// Available civic investments are defined in the shared catalog; the engine only executes contracts.
export { PROJECTS };
