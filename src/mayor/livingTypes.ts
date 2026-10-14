import type { Category, DecisionMeta, DistrictId, Effects } from './types';

export type ServiceKind = 'care' | 'learning' | 'sanitation';
export type WeatherKind = 'clear' | 'rain' | 'storm' | 'heat';
export type CivicActionCategory = 'services' | 'residents' | 'promises' | 'infrastructure' | 'construction' | 'transport' | 'housing' | 'council';
export interface CivicActionOption {
  id: string; title: string; description: string; category: CivicActionCategory;
  districtId?: DistrictId; cost: number; available: boolean; unavailableReason?: string;
  priority: number; effectsHint: string; dayCost?: number;
}
export interface ServiceState {
  kind: ServiceKind; name: string; demand: number; capacity: number; served: number;
  backlog: number; coverage: number; staff: number;
}
export interface LivingDistrict {
  id: DistrictId; name: string; population: number;
  services: ServiceState[]; access: number; congestion: number; commuteMinutes: number;
  homes: number; jobs: number; rent: number; rentBurden: number;
  displaced: number; protectionsUntil: number; shuttle: boolean; landUsed: number;
}
export interface CitizenMemory { day: number; text: string; outcome: 'helped' | 'hurt' | 'promise' | 'observed'; sourceId?: string }
export interface LivingCitizen {
  id: string; name: string; role: string; districtId: DistrictId; need: ServiceKind | 'housing' | 'access';
  satisfaction: number; unmetDays: number; displaced: boolean; story: string; memories: CitizenMemory[];
}
export interface CivicAsset {
  id: string; name: string; kind: 'bridge' | 'drainage' | 'power'; districtId: DistrictId;
  condition: number; lastInspectedDay: number | null; observedCondition: number | null;
  risk: 'low' | 'watch' | 'high'; outageUntil: number; maintenanceUntil: number;
  inspectionDue: number | null; repairDue: number | null;
}
export interface CivicPromise {
  id: string; title: string; districtId?: DistrictId; targetId: string;
  kind: 'project' | 'service' | 'asset' | 'housing' | 'review';
  createdDay: number; dueDay: number; nextReviewDay: number;
  status: 'active' | 'kept' | 'broken' | 'renegotiated';
  condition: string; progress: string; actor: DecisionMeta['actor'];
  automatic: boolean; renegotiations: number; sourceId?: string;
}
export interface ConstructionAssignment { projectId: string; name: string; crew: boolean; quality: 'economy' | 'standard' | 'quality'; workRate: number; delayDays: number }
export interface CivicWork { id: string; kind: 'repair' | 'housing' | 'jobs'; targetId: string; districtId: DistrictId; startedDay: number; dueDay: number; progress: number; duration: number; affordable: boolean; actor: DecisionMeta['actor'] }
export interface CouncilMember { id: string; name: string; districtId: DistrictId; priority: 'residents' | 'business' | 'green' | 'services' | 'budget' }
export interface CouncilVote { memberId: string; name: string; supports: boolean; reason: string }
export interface CouncilMotion {
  id: string; title: string; districtId: DistrictId; kind: 'housing' | 'jobs' | 'protection';
  amendment: 'none' | 'affordable' | 'green' | 'local_jobs';
  status: 'draft' | 'passed' | 'rejected'; createdDay: number; resolvedDay?: number;
  cost: number; votes: CouncilVote[]; actor: DecisionMeta['actor'];
}
export interface LivingEvent { id: number; day: number; title: string; text: string; districtId?: DistrictId; kind: 'service' | 'resident' | 'promise' | 'asset' | 'construction' | 'traffic' | 'housing' | 'council'; sourceId?: string }
export interface LivingCityState {
  version: 1; lastDay: number; sequence: number;
  districts: LivingDistrict[]; citizens: LivingCitizen[]; assets: CivicAsset[];
  promises: CivicPromise[]; works: CivicWork[]; events: LivingEvent[]; briefing: string[];
  weather: { today: WeatherKind; forecast: { day: number; kind: WeatherKind; warning: string }[] };
  traffic: { policy: 'balanced' | 'transit' | 'freight'; congestion: number; commuteMinutes: number; closures: string[] };
  construction: { crews: number; extraCrewUntil: number; assignments: ConstructionAssignment[]; contractor: 'economy' | 'standard' | 'quality'; projectQuality: Record<string, 'economy' | 'standard' | 'quality'>; priorityProjectId: string | null };
  council: { members: CouncilMember[]; motions: CouncilMotion[] };
  staffPool: number; recurringCost: number; electionEffect: number;
}
export interface LivingAdvanceResult { effects: Effects; commissions: { promiseId: string; projectId: string; actor: DecisionMeta['actor'] }[] }
export interface LivingActionResult { ok: boolean; error?: string; effects?: Effects; title?: string }
export interface LivingObservation { title: string; districtId?: DistrictId; sourceId?: string; category?: Category; effects?: Effects; actor: DecisionMeta['actor'] }
