import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TYPES, compatible, scoreTypes, parseCSV, fitSameType, fitEmergency } from '../model.js';

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

test('same-type share: average stays exactly 1 for any θ', () => {
  for (const p of Object.values(DATA)) {
    const total = p.reduce((a, b) => a + b, 0);
    for (const theta of [0, 0.3, 0.7, 1]) {
      for (const component of ['red', 'plasma']) {
        const { value } = scoreTypes(p, component, theta);
        close(value.reduce((s, v, i) => s + v * p[i], 0) / total, 1, 1e-9);
      }
    }
  }
});

test('same-type share: θ = 1 gives every type exactly 1', () => {
  for (const v of scoreTypes(DATA.Portugal, 'red', 1).value) close(v, 1, 1e-12);
});

test('same-type share shrinks scores toward 1 without changing the order', () => {
  const base = scoreTypes(DATA.Portugal, 'red', 0);
  for (const theta of [0.2, 0.5, 0.7, 0.9]) {
    const r = scoreTypes(DATA.Portugal, 'red', theta);
    assert.deepEqual(r.order, base.order);
    r.value.forEach((v, i) => close(v, theta + (1 - theta) * base.value[i], 1e-12));
  }
});

test('Portugal, red cells at 70% same-type: O− about 1.65×, near England\'s 13% ÷ 7.8%', () => {
  const r = scoreTypes(DATA.Portugal, 'red', 0.7);
  close(r.value[idx['O−']], 1.65);
  close(r.value[idx['B−']], 0.80);
  assert.ok(Math.abs(r.value[idx['O−']] - 13 / 7.8) < 0.05);
});

test('same-type share outside 0..1 is rejected', () => {
  assert.throws(() => scoreTypes(DATA.Portugal, 'red', 1.5), RangeError);
});

test('universal donors: O− for red cells, AB− and AB+ for plasma', () => {
  assert.deepEqual(scoreTypes(DATA.Portugal, 'red').universal.map(i => TYPES[i].l), ['O−']);
  assert.deepEqual(scoreTypes(DATA.Portugal, 'plasma').universal.map(i => TYPES[i].l), ['AB−', 'AB+']);
});

test('emergency use: average stays exactly 1 for any θ and share, in every country', () => {
  for (const p of Object.values(DATA)) {
    const total = p.reduce((a, b) => a + b, 0);
    for (const theta of [0, 0.8, 1]) for (const f of [0, 0.16, 0.7, 0.9]) {
      for (const component of ['red', 'plasma']) {
        const { value } = scoreTypes(p, component, theta, f);
        close(value.reduce((s, v, i) => s + v * p[i], 0) / total, 1, 1e-9);
      }
    }
  }
});

test('emergency use takes exactly the set share of universal donors\' load', () => {
  for (const f of [0.16, 0.7]) {
    const r = scoreTypes(DATA.Portugal, 'red', 0.8, f);
    close(r.emergencyLoad / r.value[idx['O−']], f, 1e-12);
  }
});

test('emergency use: 0 changes nothing, more raises universal donors and lowers everyone else', () => {
  const base = scoreTypes(DATA.Portugal, 'plasma', 0.8);
  assert.deepEqual(scoreTypes(DATA.Portugal, 'plasma', 0.8, 0).value, base.value);
  const r = scoreTypes(DATA.Portugal, 'plasma', 0.8, 0.7);
  r.value.forEach((v, i) => (TYPES[i].abo === 'AB' ? assert.ok(v > base.value[i]) : assert.ok(v < base.value[i])));
});

test('calibration: θ 80% and 16% emergency use reproduce England\'s O− (13% of stock, 7.8% of patients)', () => {
  const r = scoreTypes(DATA['United Kingdom'], 'red', 0.8, 0.16);
  assert.ok(Math.abs(r.value[idx['O−']] - 13 / 7.8) < 0.05);
});

test('calibration: 72% emergency use comes close to Canada\'s AB plasma (14.1% of issues, about 3% of people)', () => {
  const r = scoreTypes(DATA.Canada, 'plasma', 0.8, 0.72);
  assert.ok(Math.abs(r.value[idx['AB+']] - 14.1 / 3) < 0.15);
});

test('emergency use stays bounded where universal donors are rare', () => {
  for (const p of Object.values(DATA)) {
    assert.ok(scoreTypes(p, 'red', 0.8, 0.16).value[idx['O−']] < 2.5);
    assert.ok(scoreTypes(p, 'plasma', 0.8, 0.7).value[idx['AB+']] < 6);
  }
});

test('emergency share of 1 or more is rejected', () => {
  assert.throws(() => scoreTypes(DATA.Portugal, 'red', 0.8, 1), RangeError);
  assert.throws(() => scoreTypes(DATA.Portugal, 'red', 0.8, -0.1), RangeError);
});

test("fitSameType: England's O− figures give about 69% with no emergencies and 80% with 16%", () => {
  const uk = DATA['United Kingdom'], r = 13 / 7.8;
  close(fitSameType(uk, 'red', 0, r), 0.687);
  close(fitSameType(uk, 'red', 0.16, r), 0.797);
  const th = fitSameType(uk, 'red', 0.16, r);
  close(scoreTypes(uk, 'red', th, 0.16).value[idx['O−']], r, 1e-9);
});

test("fitEmergency: Canada's AB plasma gives about 73% at θ 80%", () => {
  const f = fitEmergency(DATA.Canada, 'plasma', 0.8, 14.1 / 3);
  close(f, 0.727);
  close(scoreTypes(DATA.Canada, 'plasma', 0.8, f).value[idx['AB+']], 14.1 / 3, 1e-9);
});

test('fits return null when nothing in range matches', () => {
  assert.equal(fitSameType(DATA['United Kingdom'], 'red', 0.5, 13 / 7.8), null);
  assert.equal(fitEmergency(DATA.Canada, 'plasma', 0.8, 50, 0.9), null);
});
