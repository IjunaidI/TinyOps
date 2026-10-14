import { projectById, requestById } from './catalog';
import type { CitizenEmotion } from './citizenIdentity';
import type { CitizenMemory, LivingCitizen, LivingEvent } from './livingTypes';
import type { Category, CityRequest, CityState, DistrictId, Effects, Metric } from './types';

export const MAX_CITIZEN_REACTIONS = 14;

export interface RequestVoice {
  citizenId?: string;
  name: string;
  role: string;
  identity: string;
  emotion: CitizenEmotion;
  /** A neighbor is commentary alongside the letter, never its attributed sender. */
  relationship: 'sender' | 'neighbor';
}

export interface CitizenReaction {
  id: string;
  citizenId: string;
  name: string;
  role: string;
  districtId: DistrictId;
  emotion: CitizenEmotion;
  title: string;
  text: string;
  day: number;
  sourceLabel: string;
  target: { section: 'residents'; id: string; districtId: DistrictId };
  requestId?: string;
}

const needs: Partial<Record<Category, LivingCitizen['need']>> = {
  health: 'care', emergency: 'care', education: 'learning', housing: 'housing',
  environment: 'sanitation', transport: 'access', economy: 'access', safety: 'access',
};
const relevantMetrics: Record<LivingCitizen['need'], Metric[]> = {
  care: ['health'], learning: ['education'], sanitation: ['environment', 'health'],
  access: ['mobility', 'economy'], housing: ['happiness'],
};
const emotionPriority: Record<CitizenEmotion, number> = { angry: 4, grateful: 3, concerned: 2, happy: 1, neutral: 0 };
const hash = (value: string) => Array.from(value).reduce((n, char) => Math.imul(n ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
const time = (state: CityState) => state.day + state.dayProgress;
const requestDistrict = (request: CityRequest) => (request.projectId && projectById[request.projectId]?.district) || requestById[request.templateId]?.district;

function pickVoice(people: readonly LivingCitizen[], key: string, districtId?: DistrictId, need?: LivingCitizen['need']): LivingCitizen | undefined {
  const local = people.filter(person => !districtId || person.districtId === districtId);
  const relevant = local.filter(person => person.need === need);
  const choices = [...(relevant.length ? relevant : local)].sort((a, b) => a.id.localeCompare(b.id));
  if (!choices.length) return undefined;
  return choices[hash(key) % choices.length];
}

function effectsMood(effects: Effects | undefined, person: LivingCitizen): CitizenEmotion {
  if (!effects) return 'neutral';
  const metrics = effects.metrics ?? {};
  const personal = relevantMetrics[person.need].reduce((sum, metric) => sum + (metrics[metric] ?? 0), 0);
  // A treasury gain alone is not a benefit to the resident. Their own need takes
  // precedence when a decision has mixed citywide effects.
  const impact = personal || ((effects.districtHappiness ?? 0) + Object.values(metrics).reduce((sum, amount) => sum + (amount ?? 0), 0));
  return impact > 0 ? 'grateful' : impact < 0 ? 'angry' : 'neutral';
}

function requestMood(state: CityState, request: CityRequest, person: LivingCitizen): CitizenEmotion {
  const definition = requestById[request.templateId];
  if (request.status === 'open') return 'concerned';
  if (request.status === 'expired') return 'angry';
  const record = state.decisions.filter(item => item.requestId === request.id).sort((a, b) => b.day - a.day || b.id - a.id)[0];
  // Saved ledgers contain applied effects. For older saves without a ledger, the
  // recorded choice still supplies its published immediate effects, never its
  // delayed benefit or the meaning of words such as "approve".
  return effectsMood(record?.effects ?? definition?.options.find(option => option.id === request.decision)?.effects, person);
}

/** No institutional letter is silently attributed to a resident. */
export function getRequestVoice(state: CityState, request: CityRequest): RequestVoice | null {
  const definition = requestById[request.templateId];
  if (!definition) return null;
  const sender = state.living.citizens.find(person => normalized(person.name) === normalized(definition.sender));
  if (!sender && definition.source !== 'citizen' && definition.source !== 'business') return null;
  const person = sender ?? pickVoice(state.living.citizens, request.id, requestDistrict(request), needs[definition.category]);
  if (!person) return null;
  return {
    citizenId: person.id, name: person.name, role: person.role, identity: person.id,
    emotion: requestMood(state, request, person), relationship: sender ? 'sender' : 'neighbor',
  };
}

function reaction(person: LivingCitizen, entry: Omit<CitizenReaction, 'citizenId' | 'name' | 'role' | 'districtId' | 'target'>): CitizenReaction {
  return {
    ...entry, citizenId: person.id, name: person.name, role: person.role, districtId: person.districtId,
    target: { section: 'residents', id: person.id, districtId: person.districtId },
  };
}

function memoryMood(memory: CitizenMemory): CitizenEmotion {
  return memory.outcome === 'helped' ? 'grateful' : memory.outcome === 'hurt' ? 'angry' : memory.outcome === 'promise' ? 'concerned' : 'neutral';
}

function eventMood(event: LivingEvent): CitizenEmotion {
  if (/service interrupted|renters displaced|missed its deadline/.test(event.title)) return 'angry';
  if (/repair complete|promise kept|: open$/.test(event.title)) return 'grateful';
  if (/temporary recovery/.test(event.title)) return 'happy';
  if (event.kind === 'resident' || /needs review|: rejected$/.test(event.title) || /Repair advised/.test(event.text)) return 'concerned';
  return 'neutral';
}

/**
 * A pure presentation of recorded city history, not another simulation clock.
 * IDs survive reloads; callers can remember them to avoid replaying old popups.
 * Repeated district/citywide memories yield one voice for that occurrence.
 */
export function getCitizenReactions(state: CityState): CitizenReaction[] {
  if (state.phase === 'lobby') return [];
  const result: CitizenReaction[] = [];
  const handledRequests = new Set<string>();
  const handledCauses = new Set<string>();
  const validDay = (day: number) => Number.isFinite(day) && day <= time(state) + 1e-6;
  const causeKey = (sourceId: string | undefined, day: number, fallback: string) => `${sourceId ?? fallback}:${day}`;

  for (const request of state.requests) {
    const voice = getRequestVoice(state, request);
    const person = state.living.citizens.find(item => item.id === voice?.citizenId);
    const definition = requestById[request.templateId];
    const day = request.status === 'open' ? request.arrivedDay : request.resolvedDay ?? request.dueDay;
    if (!voice || !person || !definition || !validDay(day)) continue;
    const option = definition.options.find(item => item.id === request.decision);
    let title: string, text: string;
    if (request.status === 'open') {
      title = voice.relationship === 'sender' ? 'Could you take a look?' : 'A concern in the neighborhood';
      text = `“${definition.title}” is waiting for a decision. ${request.clarified ? 'The requested clarification is available.' : `Its deadline is day ${Math.max(1, Math.floor(request.dueDay + 1e-6))}.`}`;
    } else if (request.status === 'expired') {
      title = 'We needed an answer';
      text = `“${definition.title}” passed its deadline without a decision. I wanted our neighborhood to be heard.`;
    } else {
      title = voice.emotion === 'grateful' ? 'Thanks for listening' : voice.emotion === 'angry' ? 'I’m worried about that decision' : 'I’m following the decision';
      text = `The decision on “${definition.title}” was “${option?.label ?? 'Recorded response'}”. ${voice.emotion === 'grateful' ? 'I’m encouraged by this choice for our neighborhood.' : voice.emotion === 'angry' ? 'That choice has consequences for people here.' : 'I’ll be watching what happens next.'}`;
    }
    result.push(reaction(person, {
      id: `request:${request.id}:${request.status}`, emotion: voice.emotion, title, text, day,
      sourceLabel: voice.relationship === 'sender' ? 'From the sender' : 'Neighborhood perspective', requestId: request.id,
    }));
    handledRequests.add(request.id);
  }

  const groups = new Map<string, { memory: CitizenMemory; people: LivingCitizen[] }>();
  for (const person of state.living.citizens) for (const memory of person.memories) {
    if (!validDay(memory.day) || (memory.sourceId && handledRequests.has(memory.sourceId))) continue;
    const key = `${causeKey(memory.sourceId, memory.day, memory.text)}:${memory.outcome}:${memory.text}`;
    const group = groups.get(key);
    if (group) group.people.push(person); else groups.set(key, { memory, people: [person] });
  }
  for (const [key, { memory, people }] of groups) {
    const subject = people.find(person => person.id === memory.sourceId);
    const person = subject ?? pickVoice(people, key);
    if (!person) continue;
    const emotion = memoryMood(memory);
    result.push(reaction(person, {
      id: `memory:${key}`, emotion,
      title: emotion === 'grateful' ? 'Something worth appreciating' : emotion === 'angry' ? 'This matters to us' : memory.outcome === 'promise' ? 'We’ll remember that promise' : 'A word from the neighborhood',
      text: memory.text, day: memory.day,
      sourceLabel: memory.outcome === 'promise' ? 'A remembered commitment' : 'Resident memory',
      ...(memory.sourceId && state.requests.some(request => request.id === memory.sourceId) ? { requestId: memory.sourceId } : {}),
    }));
    handledCauses.add(causeKey(memory.sourceId, memory.day, memory.text));
  }

  for (const event of state.living.events) {
    if (!validDay(event.day) || (event.sourceId && handledRequests.has(event.sourceId)) || handledCauses.has(causeKey(event.sourceId, event.day, event.text))) continue;
    const person = state.living.citizens.find(item => item.id === event.sourceId)
      ?? pickVoice(state.living.citizens, `event:${event.id}`, event.districtId, event.kind === 'housing' ? 'housing' : event.kind === 'traffic' ? 'access' : undefined);
    if (!person) continue;
    result.push(reaction(person, {
      id: `event:${event.id}`, emotion: eventMood(event), title: event.title, text: event.text,
      day: event.day, sourceLabel: event.kind === 'resident' ? 'Resident story' : 'Neighborhood update',
    }));
  }

  return result.sort((a, b) => b.day - a.day || emotionPriority[b.emotion] - emotionPriority[a.emotion] || a.id.localeCompare(b.id)).slice(0, MAX_CITIZEN_REACTIONS);
}
