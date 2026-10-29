"""Build data.csv (what the page loads) from data/source.csv.

data/source.csv holds blood type shares by country as compiled on Wikipedia's
"Blood type distribution by country", plus each country's population.

Steps:
  1. Drop countries missing any of the eight ABO/RhD types.
  2. Rescale each country's row so it sums to exactly 100.
  3. Add a "World" row: the population-weighted average of those countries.
  4. Round to 2 decimals and write data.csv, World first, then countries A-Z.

Standard library only. Run from the repo root:  python3 scripts/build_data.py
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source.csv"
OUT = ROOT / "data.csv"

# Column order used by the page: O-, O+, A-, A+, B-, B+, AB-, AB+
COLS = ["Oneg", "Opos", "Aneg", "Apos", "Bneg", "Bpos", "ABneg", "ABpos"]
HEADER = ["population", "O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]


def round2(x):
    # Round half to even at 2 decimals, matching numpy/pandas rounding.
    return round(x * 100) / 100


def main():
    rows = []
    with SRC.open(newline="") as f:
        for r in csv.DictReader(f):
            if any(r[c].strip() == "" for c in COLS):
                continue  # incomplete: some types missing
            vals = [float(r[c]) for c in COLS]
            total = sum(vals)
            rows.append((r["country"], float(r["pop"]), [v / total * 100 for v in vals]))

    pop_total = sum(p for _, p, _ in rows)
    world = [sum(v[i] * p for _, p, v in rows) / pop_total for i in range(len(COLS))]

    def fmt(x):
        return f"{round2(x):g}"

    with OUT.open("w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(HEADER)
        w.writerow(["World"] + [fmt(x) for x in world])
        for name, _, vals in sorted(rows, key=lambda r: r[0]):
            w.writerow([name] + [fmt(x) for x in vals])

    print(f"{len(rows)} countries, {pop_total / 1e9:.1f} billion people -> {OUT.name}")


if __name__ == "__main__":
    main()
