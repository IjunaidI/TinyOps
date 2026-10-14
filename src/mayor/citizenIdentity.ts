import type { LivingCitizen } from './livingTypes';

export type CitizenEmotion = 'happy' | 'grateful' | 'concerned' | 'angry' | 'neutral';
export type CitizenHairStyle = 'bun' | 'curls' | 'short' | 'bob' | 'headscarf' | 'cap' | 'sidepart';
export interface CitizenAppearance {
  id: string;
  skin: string;
  shadow: string;
  hair: string;
  shirt: string;
  accent: string;
  background: string;
  hairStyle: CitizenHairStyle;
  accessory: 'badge' | 'strap' | 'glasses' | 'apron' | 'vest' | 'none';
  beard?: boolean;
}

const profiles: Record<string, CitizenAppearance> = {
  mira: { id: 'mira', skin: '#b98060', shadow: '#99644d', hair: '#413d3d', shirt: '#69968d', accent: '#d7b793', background: '#e1eee7', hairStyle: 'bun', accessory: 'badge' },
  ben: { id: 'ben', skin: '#cf9d78', shadow: '#b57e5c', hair: '#554238', shirt: '#bd9c65', accent: '#687b8b', background: '#f0e9d8', hairStyle: 'curls', accessory: 'strap' },
  amina: { id: 'amina', skin: '#855b46', shadow: '#6f483a', hair: '#c9c9c0', shirt: '#90849c', accent: '#d8c58f', background: '#ece6ee', hairStyle: 'bun', accessory: 'glasses' },
  leo: { id: 'leo', skin: '#d4ac88', shadow: '#b68a6c', hair: '#383f47', shirt: '#6e8baf', accent: '#dbc393', background: '#e0eaf3', hairStyle: 'short', accessory: 'strap' },
  rosa: { id: 'rosa', skin: '#c58d6e', shadow: '#a77056', hair: '#7b5143', shirt: '#b88271', accent: '#849573', background: '#f0e5de', hairStyle: 'bob', accessory: 'apron' },
  elliot: { id: 'elliot', skin: '#dfb799', shadow: '#c7987b', hair: '#9c7252', shirt: '#809b8d', accent: '#5a738b', background: '#e3ebe8', hairStyle: 'cap', accessory: 'strap' },
  sana: { id: 'sana', skin: '#b9805e', shadow: '#986749', hair: '#49413f', shirt: '#ccb997', accent: '#8b879d', background: '#e9e7f0', hairStyle: 'headscarf', accessory: 'none' },
  oscar: { id: 'oscar', skin: '#d4a084', shadow: '#b58268', hair: '#868782', shirt: '#758a9a', accent: '#c6aa6e', background: '#eae9dd', hairStyle: 'cap', accessory: 'vest', beard: true },
};
const aliases: Record<string, string> = {
  mirashah: 'mira', benortiz: 'ben', aminayusuf: 'amina', leochen: 'leo',
  rosasilva: 'rosa', elliotreed: 'elliot', sanaiqbal: 'sana', oscarbell: 'oscar',
};
const normalize = (identity: string) => identity.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** IDs and display names resolve to one design across the world, requests, and portraits. */
export function getCitizenAppearance(identity: string): CitizenAppearance {
  const normalized = normalize(identity);
  const profileId = Object.hasOwn(aliases, normalized) ? aliases[normalized] : normalized;
  const known = Object.hasOwn(profiles, profileId) ? profiles[profileId] : undefined;
  if (known) return { ...known };
  // Unknown senders get a stable face without borrowing a named resident's identity.
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) hash = Math.imul(hash ^ normalized.charCodeAt(i), 16777619) >>> 0;
  const bases = Object.values(profiles);
  const base = bases[hash % bases.length];
  const outfit = bases[Math.floor(hash / 17) % bases.length];
  return { ...base, id: normalized || 'citizen', shirt: outfit.shirt, accent: outfit.accent, background: outfit.background };
}

export const citizenEmotionLabels: Record<CitizenEmotion, string> = {
  happy: 'Content', grateful: 'Grateful', concerned: 'Concerned', angry: 'Frustrated', neutral: 'Steady',
};

/** Current hardship takes precedence over an older positive memory. No simulation state changes. */
export function citizenEmotion(citizen: LivingCitizen, currentDay?: number): CitizenEmotion {
  if (citizen.displaced || citizen.unmetDays >= 3 || citizen.satisfaction < 32) return 'angry';
  if (citizen.unmetDays > 0 || citizen.satisfaction < 50) return 'concerned';
  const latest = citizen.memories[0];
  const recent = latest && (currentDay === undefined || Math.floor(currentDay) - latest.day <= 2);
  if (recent && latest.outcome === 'helped' && citizen.satisfaction >= 55) return 'grateful';
  if (recent && latest.outcome === 'hurt') return 'concerned';
  if (citizen.satisfaction >= 72) return 'happy';
  return 'neutral';
}
