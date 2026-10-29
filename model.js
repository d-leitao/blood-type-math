// Blood type compatibility rules and the donor value model.
// Pure functions with no DOM access, so the page and the tests share them.

/** The eight ABO/RhD types, with the antigens their red cells carry. */
export const TYPES = [
  { l: 'O−',  abo: 'O',  A: 0, B: 0, D: 0 }, { l: 'O+',  abo: 'O',  A: 0, B: 0, D: 1 },
  { l: 'A−',  abo: 'A',  A: 1, B: 0, D: 0 }, { l: 'A+',  abo: 'A',  A: 1, B: 0, D: 1 },
  { l: 'B−',  abo: 'B',  A: 0, B: 1, D: 0 }, { l: 'B+',  abo: 'B',  A: 0, B: 1, D: 1 },
  { l: 'AB−', abo: 'AB', A: 1, B: 1, D: 0 }, { l: 'AB+', abo: 'AB', A: 1, B: 1, D: 1 },
];

/**
 * Can `donor` give `component` to `recipient`?
 *  - Red cells: the donor's cells may carry no antigen (A, B, D) the recipient lacks.
 *  - Plasma: the donor's anti-A / anti-B may not meet the matching antigen on the
 *    recipient's cells. RhD is not matched for plasma.
 */
export function compatible(component, donor, recipient) {
  if (component === 'plasma') {
    return !((!donor.A && recipient.A) || (!donor.B && recipient.B));
  }
  return Boolean((!donor.A || recipient.A) && (!donor.B || recipient.B) && (!donor.D || recipient.D));
}

/**
 * Which donations go furthest.
 *
 * p[i] is the share of people with type i, standing in for both donors and patients.
 * sameType (θ, 0..1) is the share of each patient group's need met with same-type blood.
 *
 *   pool[j]     = sum of p[i] over donors i that can give to j    ("who can donate to you")
 *   pressure[j] = p[j] / pool[j]                                  (need per compatible donor)
 *   shared[i]   = sum of pressure[j] over recipients j that i can give to
 *   value[i]    = θ + (1 − θ) · shared[i]
 *
 * The part of each group's need not met with same-type blood (1 − θ) is split evenly
 * across everyone who can give to that group; value is the load that lands on one donor.
 * Its population-weighted mean is exactly 1 for any θ, so 2 means twice the load of the
 * average donor. θ = 0 is fully flexible matching; θ = 1 gives every type exactly 1.
 */
export function scoreTypes(p, component = 'red', sameType = 0) {
  if (!(sameType >= 0 && sameType <= 1)) throw new RangeError('sameType must be between 0 and 1');
  const ok = (d, r) => compatible(component, TYPES[d], TYPES[r]);
  const idx = TYPES.map((_, i) => i);
  const pool = idx.map(r => idx.reduce((s, d) => s + (ok(d, r) ? p[d] : 0), 0));
  const pressure = p.map((v, j) => (pool[j] > 0 ? v / pool[j] : 0));
  const shared = idx.map(d => idx.reduce((s, r) => s + (ok(d, r) ? pressure[r] : 0), 0));
  const value = shared.map(x => sameType + (1 - sameType) * x);
  const rank = value.map(v => 1 + value.filter(w => w > v + 1e-9).length);
  const order = [...idx].sort((a, b) => (value[b] - value[a]) || (a - b));
  return { pool, pressure, shared, value, rank, order };
}

/** Parse data.csv: a header row, then `population,O-,O+,A-,A+,B-,B+,AB-,AB+` rows of percentages. */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift().split(',').map(s => s.trim());
  const want = ['population', 'O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  if (header.join() !== want.join()) throw new Error(`Unexpected CSV header: ${header.join()}`);
  const rows = {};
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split(',');
    const name = cells[0].trim();
    const vals = cells.slice(1).map(Number);
    if (vals.length !== 8 || vals.some(v => !Number.isFinite(v))) throw new Error(`Bad row: ${line}`);
    rows[name] = vals;
  }
  return rows;
}
