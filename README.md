# Blood Type Math

An interactive map of who can give blood to whom, with how common each type is in 123 countries and a simple model of which donor types matter most.

**Live page:** https://d-leitao.github.io/blood-type-math/

## What it shows

- **Compatibility grid.** Donors run down, recipients run across, for all eight ABO/RhD types. Switch between red cells and plasma; plasma rules run the other way, so AB plasma suits everyone.
- **Prevalence.** Every type is labelled with its share of the population, for the world or any of 123 countries. The edges of the grid add up how many people each donor can reach and how large each recipient's donor pool is.
- **Explanations.** Hover or tap a square to see why a pairing works or fails, or a type to see its profile.
- **Which donations go furthest.** A model of how much patient need each donor type carries, with a slider for how strictly hospitals match same-type blood. Explained below.

## Which donations go furthest

A donation goes further when it can reach patients who have few other donors to rely on. Counting how many people a type can give to overrates common pairings: A+ patients can already take red cells from most of the population, so one more donor for them adds little. The model weighs each patient group by how hard it is to supply.

With `p[j]` the share of people with type `j`, and `θ` the share of each group's need met with same-type blood:

```
pool[j]     = Σ p[i]        over donor types i that can give to j     (who can donate to you)
pressure[j] = p[j] / pool[j]                                          (need per compatible donor)
shared[i]   = Σ pressure[j] over recipient types j that i can give to
score[i]    = θ + (1 − θ) · shared[i]
```

The part of each group's need not met with same-type blood, `1 − θ`, is split evenly across everyone who can donate to that group, and the score is the load that lands on one donor. Its population-weighted average is exactly 1 for any `θ`, so 2.0 means twice the load of the average donor.

`θ` is a slider on the page:

- **0%:** any compatible unit can go to any patient. This is the most flexible case and an upper bound on how much universal donors stand out.
- **100%:** every patient gets their own type, and every score is exactly 1.
- **70% (the default):** roughly reproduces England's figures for O−. O− is 7.8% of hospital patients but 13% of red-cell stock, and 41% of O− units go to patients who aren't O− ([NHSBT 2018 audit](https://nhsbtdbe.blob.core.windows.net/umbraco-assets-corp/17159/o-neg-survey-2018-final2.pdf)). There's no comparable data for other countries or for plasma, so treat 70% as a rough setting, not a measurement.

Hospitals give most patients their own type and substitute mainly in emergencies before a patient is typed, for units about to expire, and for patients with special requirements. That's why the default is closer to 100% than to 0%.

Red-cell scores for Portugal:

| Same-type share | O− | O+ | A− | A+ | B− | B+ | AB− | AB+ |
|---|---|---|---|---|---|---|---|---|
| 0% (fully flexible) | 3.18 | 1.46 | 1.04 | 0.48 | 0.35 | 0.16 | 0.06 | 0.03 |
| 70% (about England) | 1.65 | 1.14 | 1.01 | 0.84 | 0.80 | 0.75 | 0.72 | 0.71 |

The same-type share changes how far apart the scores are, not their order.

**Limits**

- One same-type share applies to every group, and the rest is spread evenly across compatible donors. Real substitution is lopsided, mostly O− (and some O+ in trauma). O−'s score at about 70% is anchored to data; the other types' scores are rougher.
- Patients and donors are assumed to be spread like the general population, with everyone donating at the same rate. In reality patients skew older, and donor pools differ by age and ethnicity.
- Only ABO and RhD count, and every unit is worth the same. Plasma ignores RhD.
- Much donated plasma is made into medicines, where blood type doesn't matter. The plasma view only applies to plasma used directly in transfusions.

## Data

`data/source.csv` holds blood type shares by country as compiled in Wikipedia's [Blood type distribution by country](https://en.wikipedia.org/wiki/Blood_type_distribution_by_country), mostly from national blood services, plus each country's population. Many figures come from donor populations rather than whole countries.

`scripts/build_data.py` turns it into `data.csv`, which the page loads:

1. Drops countries missing any of the eight types (Egypt, New Zealand and Oman), leaving 123.
2. Rescales each row to sum to 100. The UK's source row sums to 96, for example.
3. Adds a population-weighted **World** row covering about 7.4 billion people. Wikipedia's own world row is flagged as unreliable, and the often-quoted global split (O+ 42%, B+ 15%) under-weights South and East Asia, where B is far more common.

CI rebuilds `data.csv` on every push and fails if it doesn't match the committed file.

## Run it locally

The page loads `data.csv` and `model.js`, so it needs a local web server rather than opening the file from disk:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # model and data tests (Node 18+)
python3 scripts/build_data.py # rebuild data.csv from data/source.csv
```

## Files

| File | What it is |
|---|---|
| `index.html` | The page: layout, styles and interface code |
| `model.js` | Compatibility rules and the donor value model, with no page code, so the tests can import it |
| `data.csv` | Prevalence by country, generated |
| `data/source.csv` | Raw figures and populations |
| `scripts/build_data.py` | Builds `data.csv` from the source |
| `test/model.test.js` | Tests for the rules, the data and the model |

## Not medical advice

This page covers ABO and RhD only. Hospitals type and crossmatch every unit before a transfusion, and other blood group systems (Kell, Duffy, Kidd and more) matter for some patients.

## Licence

Code: MIT, see [LICENSE](LICENSE). Data: the figures in `data/` and `data.csv` come from Wikipedia and are available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), so reuse needs attribution to Wikipedia and the same licence.

Built with [Claude](https://claude.ai).
