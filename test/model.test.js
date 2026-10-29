import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TYPES, compatible, scoreTypes, parseCSV } from '../model.js';

const idx = Object.fromEntries(TYPES.map((t, i) => [t.l, i]));
const T = label => TYPES[idx[label]];
const DATA = parseCSV(readFileSync(new URL('../data.csv', import.meta.url), 'utf8'));
const close = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) < eps, `${a} is not within ${eps} of ${b}`);

test('red cells: O− gives to everyone, AB+ receives from everyone', () => {
  for (const t of TYPES) {
    assert.equal(compatible('red', T('O−'), t), true, `O− → ${t.l}`);
    assert.equal(compatible('red', t, T('AB+')), true, `${t.l} → AB+`);
  }
});

test('red cells: B− patients can only take O− and B−', () => {
  const donors = TYPES.filter(d => compatible('red', d, T('B−'))).map(d => d.l);
  assert.deepEqual(donors, ['O−', 'B−']);
});

test('red cells: RhD-positive cells never go to RhD-negative patients', () => {
  for (const d of TYPES) for (const r of TYPES) {
    if (d.D && !r.D) assert.equal(compatible('red', d, r), false, `${d.l} → ${r.l}`);
  }
});

test('plasma runs the other way: AB gives to everyone, O gives only to O', () => {
  for (const t of TYPES) {
    assert.equal(compatible('plasma', T('AB−'), t), true);
    assert.equal(compatible('plasma', T('O+'), t), t.abo === 'O', `O+ plasma → ${t.l}`);
  }
});

test('plasma ignores RhD', () => {
  for (const d of TYPES) for (const r of TYPES) {
    const flip = TYPES.find(u => u.abo === d.abo && u.D !== d.D);
    assert.equal(compatible('plasma', d, r), compatible('plasma', flip, r));
  }
});

test('data.csv: 123 countries plus World, every row sums to 100', () => {
  assert.equal(Object.keys(DATA).length, 124);
  assert.ok(DATA.World && DATA.Portugal);
  for (const [name, row] of Object.entries(DATA)) close(row.reduce((a, b) => a + b, 0), 100, 0.1);
});

test('donor value averages exactly 1 across the population, for every country', () => {
  for (const [name, p] of Object.entries(DATA)) {
    const total = p.reduce((a, b) => a + b, 0);
    for (const component of ['red', 'plasma']) {
      const { value } = scoreTypes(p, component);
      const avg = value.reduce((s, v, i) => s + v * p[i], 0) / total;
      close(avg, 1, 1e-9);
    }
  }
});

test('pressure is at most 1, and exactly 1 for O− red cells', () => {
  for (const p of Object.values(DATA)) {
    for (const component of ['red', 'plasma']) {
      for (const x of scoreTypes(p, component).pressure) assert.ok(x <= 1 + 1e-12);
    }
    close(scoreTypes(p, 'red').pressure[idx['O−']], 1, 1e-12);
  }
});

test('Portugal, red cells: O− first at 3.18×, B− fifth at 0.35×', () => {
  const r = scoreTypes(DATA.Portugal, 'red');
  assert.equal(TYPES[r.order[0]].l, 'O−');
  close(r.value[idx['O−']], 3.18);
  close(r.value[idx['B−']], 0.35);
  assert.equal(r.rank[idx['B−']], 5);
});

test('Portugal, plasma: AB types tie for first at 3.05×', () => {
  const r = scoreTypes(DATA.Portugal, 'plasma');
  assert.equal(r.rank[idx['AB−']], 1);
  assert.equal(r.rank[idx['AB+']], 1);
  close(r.value[idx['AB+']], 3.05);
  close(r.value[idx['B−']], 1.12);
});
