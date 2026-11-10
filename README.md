<img width="1448" height="822" alt="image" src="https://github.com/user-attachments/assets/f45ff297-0564-4b0a-a87a-952bb5757955" />

**Live page:** https://d-leitao.github.io/blood-type-math/

An interactive map of who can give blood to whom, with how common each type is in 123 countries and a simple model of which donor types matter most.

## What it shows

- **Compatibility grid.** Donors run down, recipients run across, for all eight ABO/RhD types. Switch between red cells and plasma; plasma rules run the other way, so AB plasma suits everyone.
- **Prevalence.** Every type is labelled with its share of the population, for the world or any of 123 countries. The edges of the grid add up how many people each donor can reach and how large each recipient's donor pool is.
- **Explanations.** Hover or tap a square to see why a pairing works or fails, or a type to see its profile.
- **Which donations are most needed.** How often each type's donors would need to give to meet demand, with editable assumptions for how strictly hospitals match same-type blood and how much goes to emergencies. Explained below.

## Which donations are most needed

A donation goes further when it can reach patients who have few other donors to rely on. Counting how many people a type can give to overrates common pairings: A+ patients can already take red cells from most of the population, so one more donor for them adds little. The model weighs each patient group by how hard it is to supply.

With `p[j]` the share of people with type `j`, `θ` the share of patients deliberately given their own type (an estimate, not a count of patients: see below), and `f` the share of universal donors' blood used in emergencies:

```
pool[j]     = Σ p[i]        over donor types i that can give to j     (who can donate to you)
pressure[j] = p[j] / pool[j]                                          (need per compatible donor)
shared[i]   = Σ pressure[j] over recipient types j that i can give to
matched[i]  = θ + (1 − θ) · shared[i]
score[i]    = (1 − e) · matched[i] + e / u     for universal donors
score[i]    = (1 − e) · matched[i]             for everyone else
```

The rest of each group's need, `1 − θ`, is drawn from everyone who can donate to that group in proportion to how many there are, own type included. So more patients end up with their own type than `θ`: at 84%, about 94% of patients in Portugal do, from 84% of AB+ patients (few people are AB+) to all O− patients (only O− can give to them). Universal donors (O− for red cells, AB− and AB+ for plasma) can give to anyone, so they also take emergency use, when blood is needed before the patient's type is known. `u` is their share of the population, and `e = f·u·M / (1 − f + f·u·M)` is the share of all blood used in emergencies, where `M` is their `matched` load. That makes emergencies exactly `f` of the universal donors' load. The score is the share of the blood patients receive that has to come from a type, divided by that type's share of people. Put another way, it's how often that type's donors would need to give, compared with the average donor, for supply to match what patients need. Total need equals total donations, so the population-weighted average is exactly 1 for any `θ` and `f`. In Portugal at the best estimates, 6.1% of people are O−, but 9.6% of red cells would have to be O−, so O− donors would need to give 1.58× as often as the average donor. At 0.83 (AB+), AB+ donors would only need to give 83% as often; if they gave as often as everyone else, about a sixth of AB+ red cells would have no patient. Blood services work with exactly this: they call short types more often and ask AB donors to give plasma, where AB is the most needed type.

Emergency use is set as a share of the universal donors' blood rather than of all blood. A fixed share of all blood would explode where they're rare: 2% of all red cells going to O− in Japan, where O− is 0.15% of people, would score O− donors at about 15×.

Both are numbers you can change on the page, under the score breakdown. Each estimate matches a type's share of the blood used ÷ its share of donors. The two depend on each other: 84% own type assumes 16% emergencies (with none, England's figures point to about 74%), and 65% plasma emergencies assumes 84% own type. `fitSameType` and `fitEmergency` in `src/model.js` compute them.

| Setting | Estimate | Source |
|---|---|---|
| Own type, `θ` | 84% | England: O− is 13% of the median hospital's red-cell stock and 8.33% of UK donors, and 16% of O− units go to emergencies ([NHSBT 2018 audit](https://nhsbtdbe.blob.core.windows.net/umbraco-assets-corp/17159/o-neg-survey-2018-final2.pdf)). Stock isn't the same as use, so this is a rough guide. With the same emergency share, Australia ([Lifeblood](https://www.lifeblood.com.au/news-and-stories/trending-research/better-management-o-negative-blood-supply)) and the US ([AABB](https://www.aabb.org/docs/default-source/default-document-library/resources/association-bulletins/ab19-02.pdf)) imply 76–81%, and a 2024 audit in Victoria, Australia about 50% ([Blood Matters](https://www.health.vic.gov.au/sites/default/files/2025-07/o-rhd-negative-rbc-audit-report-june-25.pdf)). |
| Emergencies, red cells | 16% | The NHSBT audit above. |
| Emergencies, plasma | 65% | No audit found. 65% reproduces Canada, where AB is 14% of plasma issued but about 4% of donors ([Canadian Blood Services](https://www.blood.ca/sites/default/files/2018-AB%20Plasma-Overview.pdf)). |

None of these are measured for Portugal. At `θ` = 0% and no emergencies, any compatible unit can go to any patient: the most flexible case. At 100% and no emergencies every score would be exactly 1; the page's own-type field stops at 99%.

Scores for Portugal:

| | O− | O+ | A− | A+ | B− | B+ | AB− | AB+ |
|---|---|---|---|---|---|---|---|---|
| Red cells, fully flexible | 3.18 | 1.46 | 1.04 | 0.48 | 0.35 | 0.16 | 0.06 | 0.03 |
| Red cells, estimates (84%, 16%) | 1.58 | 1.06 | 0.99 | 0.90 | 0.88 | 0.85 | 0.84 | 0.83 |
| Plasma, fully flexible | 0.42 | 0.42 | 1.35 | 1.35 | 1.12 | 1.12 | 3.05 | 3.05 |
| Plasma, estimates (84%, 65%) | 0.84 | 0.84 | 0.98 | 0.98 | 0.94 | 0.94 | 3.50 | 3.50 |

The universal donors come first in every country, because they reach every patient group. What changes by country is how far ahead they are.

**Limits**

- One own-type share applies to every group, and apart from emergencies the rest is spread evenly across compatible donors. Real substitution is lopsided (units about to expire, special requirements), so the universal donors' scores are the best anchored and the others are rougher.
- Patients' blood needs are assumed to follow the same type mix as the figures, many of which come from donors: if 1.1% of people are B−, B− patients need 1.1% of all units. The model counts units of blood, not patients, so it doesn't matter that one patient may need many units. In reality patients skew older, and donor pools differ by age and ethnicity.
- Only ABO and RhD count, and every unit is worth the same. Plasma ignores RhD.
- Much donated plasma is made into medicines, where blood type doesn't matter. The plasma view only applies to plasma used directly in transfusions.

## Data

`data/source.csv` holds blood type shares by country as compiled in Wikipedia's [Blood type distribution by country](https://en.wikipedia.org/wiki/Blood_type_distribution_by_country), mostly from national blood services, plus each country's population. Many figures come from donor populations rather than whole countries.

`data/build.py` turns it into `data/prevalence.csv`, which the page loads:

1. Drops countries missing any of the eight types (Egypt, New Zealand and Oman), leaving 123.
2. Rescales each row to sum to 100. The UK's source row sums to 96, for example.
3. Adds a population-weighted **World** row covering about 7.4 billion people. Wikipedia's own world row is flagged as unreliable, and the often-quoted global split (O+ 42%, B+ 15%) under-weights South and East Asia, where B is far more common.

CI rebuilds `data/prevalence.csv` on every push and fails if it doesn't match the committed file.

## Run it locally

The page loads `data/prevalence.csv` and `src/model.js`, so it needs a local web server rather than opening the file from disk:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # model and data tests (Node 18+)
python3 data/build.py         # rebuild data/prevalence.csv from data/source.csv
```

## Files

| File | What it is |
|---|---|
| `index.html` | The page: layout, styles and interface code |
| `src/model.js` | Compatibility rules and the donor score model, with no page code, so the tests can import it |
| `data/prevalence.csv` | Prevalence by country, generated |
| `data/source.csv` | Raw figures and populations |
| `data/build.py` | Builds `data/prevalence.csv` from the source |
| `test/model.test.js` | Tests for the rules, the data and the model |

## Not medical advice

This page covers ABO and RhD only. Hospitals type and crossmatch every unit before a transfusion, and other blood group systems (Kell, Duffy, Kidd and more) matter for some patients.

## Licence

Code: MIT, see [LICENSE](LICENSE). Data: the figures in `data/` come from Wikipedia and are available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), so reuse needs attribution to Wikipedia and the same licence.

Built with [Claude](https://claude.ai).
