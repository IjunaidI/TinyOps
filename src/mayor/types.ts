import type { LivingCityState } from './livingTypes';

export type Metric =
  | "happiness"
  | "trust"
  | "health"
  | "safety"
  | "environment"
  | "mobility"
  | "economy"
  | "education";
export type DistrictId = "riverside" | "oldtown" | "market" | "hillview";
export type Category =
  | "housing"
  | "health"
  | "transport"
  | "environment"
  | "education"
  | "safety"
  | "economy"
  | "community"
  | "authority"
  | "emergency";
export type Source = "citizen" | "business" | "department" | "authority";
export type Priority = "routine" | "important" | "urgent";
export type Department =
  "health" | "safety" | "transport" | "education" | "environment";
export type MayorMode = "manual" | "local" | "jev";
export type Mandate = "balanced" | "people" | "green" | "growth";
export interface Effects {
  treasury?: number;
  population?: number;
  metrics?: Partial<Record<Metric, number>>;
  districtHappiness?: number;
}
export interface DelayedEffect {
  days: number;
  title: string;
  text: string;
  effects: Effects;
}
export interface RequestOption {
  id: string;
  label: string;
  description: string;
  effects: Effects;
  /** Extra working days needed for this project-specific construction choice. */
  constructionDelayDays?: number;
  delayed?: DelayedEffect;
  followUp?: string;
  tags?: string[];
}
export interface RequestTemplate {
  id: string;
  title: string;
  sender: string;
  role: string;
  source: Source;
  category: Category;
  district: DistrictId;
  text: string;
  priority: Priority;
  deadlineDays: number;
  options: RequestOption[];
  expiry: Effects;
  minDay?: number;
  maxDay?: number;
  trigger?: { metric: Metric; below?: number; above?: number };
  followUpOnly?: boolean;
  /** Only released by an active construction site, never the general story pool. */
  constructionOnly?: boolean;
  constructionProjectIds?: string[];
  constructionExpiryDelayDays?: number;
  clarification?: { question: string; answer: string; effectsNote: string };
}
export interface CityRequest {
  id: string;
  templateId: string;
  /** The actual site affected by a construction case. */
  projectId?: string;
  arrivedDay: number;
  dueDay: number;
  status: "open" | "resolved" | "expired";
  clarified: boolean;
  clarificationDue?: number;
  decision?: string;
  resolvedDay?: number;
  actor?: "you" | "local" | "jev";
  rationale?: string;
}
export type PetitionReason =
  | "conditional"
  | "benefit"
  | "budget"
  | "priority"
  | "in_progress"
  | "completed"
  | "impossible"
  | "unsupported"
  | "unclear";
export interface PetitionAction {
  id: string;
  label: string;
  description: string;
  /** Public facts, kept separate from the model's scope-matching instructions. */
  facts?: string;
  kind: "project" | "department" | "tax" | "decline" | "defer" | "civic";
  civicActionId?: string;
  districtId?: DistrictId;
  status: "approved" | "declined" | "deferred";
  reason: PetitionReason;
  available: boolean;
  unavailableReason?: string;
  cost: number;
  dayCost: number;
  projectId?: string;
  department?: Department;
  level?: 0 | 1 | 2;
  tax?: "low" | "balanced" | "high";
}
export interface CitizenPetition {
  id: string;
  text: string;
  district: DistrictId | "city";
  createdDay: number;
  status: "pending" | "approved" | "declined" | "deferred";
  response?: {
    text: string;
    reason: PetitionReason;
    actionId: string;
    day: number;
    actor: "you" | "local" | "jev";
    effects: Effects;
    model?: string | null;
    confidence?: number | null;
    durationMs?: number;
  };
}
export interface District {
  id: DistrictId;
  name: string;
  description: string;
  population: number;
  happiness: number;
  color: string;
}
export interface ProjectDefinition {
  id: string;
  name: string;
  description: string;
  district: DistrictId;
  category: Category;
  cost: number;
  duration: number;
  upkeep: number;
  effects: Effects;
}
export interface CityProject {
  /** Extra elapsed time from crew scarcity and weather; never reverses completed work. */
  operationalDelayDays?: number;
  definitionId: string;
  startedDay: number;
  completesDay: number;
  status: "building" | "complete";
  /** Monotonic completed work; delays slow the remaining work without undoing it. */
  progress?: number;
  delayDays?: number;
  constructionStage?: number;
  /** The capital contract was funded before this mayoral term. */
  inherited?: boolean;
}
export interface NewsItem {
  id: number;
  day: number;
  title: string;
  text: string;
  kind: "decision" | "arrival" | "city" | "project" | "warning" | "brief";
}
export interface DecisionRecord {
  id: number;
  day: number;
  requestId?: string;
  title: string;
  choice: string;
  actor: "you" | "local" | "jev";
  rationale: string;
  effects: Effects;
  model?: string | null;
  confidence?: number | null;
  durationMs?: number;
}
export interface CitySnapshot {
  day: number;
  treasury: number;
  population: number;
  metrics: Record<Metric, number>;
  revenue: number;
  expenses: number;
}
export interface ScheduledEffect {
  id: string;
  dueDay: number;
  title: string;
  text: string;
  effects: Effects;
  district?: DistrictId;
  followUp?: string;
}
export interface CityState {
  living: LivingCityState;
  generation: number;
  revision: number;
  phase: "lobby" | "playing" | "ended";
  mode: MayorMode;
  mandate: Mandate;
  seed: number;
  day: number;
  dayProgress: number;
  termDays: number;
  paused: boolean;
  speed: 1 | 2 | 4;
  treasury: number;
  population: number;
  metrics: Record<Metric, number>;
  districts: District[];
  requests: CityRequest[];
  petitions: CitizenPetition[];
  projects: CityProject[];
  news: NewsItem[];
  decisions: DecisionRecord[];
  scheduled: ScheduledEffect[];
  history: CitySnapshot[];
  briefings: { day: number; text: string }[];
  departments: Record<Department, number>;
  tax: "low" | "balanced" | "high";
  revenue: number;
  expenses: number;
  resolved: number;
  expired: number;
  answered: number;
  term: number;
  result: null | {
    won: boolean;
    approval: number;
    grade: string;
    summary: string;
  };
  issue: string | null;
}
export interface ActionResult {
  ok: boolean;
  error?: string;
}
export interface DecisionMeta {
  actor: "you" | "local" | "jev";
  rationale?: string;
  model?: string | null;
  confidence?: number | null;
  durationMs?: number;
}
