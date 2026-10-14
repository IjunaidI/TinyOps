import test from 'node:test';
import assert from 'node:assert/strict';
import { citizenEmotion, getCitizenAppearance } from '../src/mayor/citizenIdentity';
import type { LivingCitizen } from '../src/mayor/livingTypes';

const resident: LivingCitizen = {
  id: 'mira', name: 'Mira Shah', role: 'Care worker', districtId: 'riverside', need: 'care',
  satisfaction: 78, unmetDays: 0, displaced: false, story: '', memories: [
    { day: 5, outcome: 'helped', text: 'An appointment became available.' },
  ],
};

test('resident faces retain their identity across request names and map IDs', () => {
  const names = [
    ['mira', 'Mira Shah'], ['ben', 'Ben Ortiz'], ['amina', 'Amina Yusuf'], ['leo', 'Leo Chen'],
    ['rosa', 'Rosa Silva'], ['elliot', 'Elliot Reed'], ['sana', 'Sana Iqbal'], ['oscar', 'Oscar Bell'],
  ];
  for (const [id, name] of names) assert.deepEqual(getCitizenAppearance(id), getCitizenAppearance(`  ${name.toUpperCase()}  `));
  assert.equal(new Set(names.map(([id]) => JSON.stringify(getCitizenAppearance(id)))).size, 8);
  const changed = getCitizenAppearance('mira');
  changed.shirt = '#000000';
  assert.notEqual(getCitizenAppearance('Mira Shah').shirt, changed.shirt, 'Callers cannot change another view’s resident appearance.');
});

test('unrecognized request senders have stable, safely resolved independent appearances', () => {
  for (const name of ['', 'constructor', 'José Park', '<unrecognized>']) {
    const first = getCitizenAppearance(name);
    assert.deepEqual(first, getCitizenAppearance(name));
    assert.match(first.skin, /^#[0-9a-f]{6}$/);
    assert.match(first.shirt, /^#[0-9a-f]{6}$/);
  }
  assert.deepEqual(getCitizenAppearance('José Park'), getCitizenAppearance('JOSE PARK'));
});

test('expressions reflect current hardship before a happy memory and let old memories expire', () => {
  const before = structuredClone(resident);
  assert.equal(citizenEmotion(resident, 5), 'grateful');
  assert.equal(citizenEmotion(resident, 8), 'happy');
  assert.equal(citizenEmotion({ ...resident, displaced: true }, 5), 'angry');
  assert.equal(citizenEmotion({ ...resident, unmetDays: 3 }, 5), 'angry');
  assert.equal(citizenEmotion({ ...resident, unmetDays: 1 }, 5), 'concerned');
  assert.equal(citizenEmotion({ ...resident, satisfaction: 31 }, 5), 'angry');
  assert.equal(citizenEmotion({ ...resident, satisfaction: 45 }, 5), 'concerned');
  const hurt = { ...resident, memories: [{ day: 5, outcome: 'hurt' as const, text: 'The wait got longer.' }] };
  assert.equal(citizenEmotion(hurt, 6), 'concerned');
  assert.equal(citizenEmotion(hurt, 8), 'happy');
  assert.deepEqual(resident, before);
});
