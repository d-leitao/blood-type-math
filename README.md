# Blood Type Math

An interactive map of who can give blood to whom, with how common each type is in 123 countries and a simple model of which donor types matter most.

**Live page:** https://d-leitao.github.io/blood-type-math/

## What it shows

- **Compatibility grid.** Donors run down, recipients run across, for all eight ABO/RhD types. Switch between red cells and plasma; plasma rules run the other way, so AB plasma suits everyone.
- **Prevalence.** Every type is labelled with its share of the population, for the world or any of 123 countries. The edges of the grid add up how many people each donor can reach and how large each recipient's donor pool is.
- **Explanations.** Hover or tap a square to see why a pairing works or fails, or a type to see its profile.
- **Donor value model.** A ranking of which donor types carry the most patient need, explained below.

## The donor value model

A donor is worth more when the patients they can treat have few other donors to rely on. Counting how many people a type can give to overrates common pairings: A+ patients can already take red cells from most of the population, so one more donor for them adds little. The model weighs each patient group by how hard it is to supply.

With `p[j]` the share of people with type `j`:

```
pool[j]     = Σ p[i]       over donor types i that can give to j     (who can donate to you)
pressure[j] = p[j] / pool[j]                                         (need per compatible donor)
value[i]    = Σ pressure[j] over recipient types j that i can give to
```

This is the same as splitting each patient group's need evenly across everyone who can donate to it, and measuring what lands on one donor. The population-weighted average of `value` is exactly 1, so 2.0 means a donor of that type carries twice the load of the average donor.

Results for Portugal:

| | Most valuable | Then | Least valuable |
|---|---|---|---|
| Red cells | O− 3.18× | O+ 1.46×, A− 1.04× | AB+ 0.03× |
| Plasma | AB− and AB+ 3.05× | A 1.36×, B 1.12× | O 0.42× |

Rare isn't the same as valuable. B− is about 1% of people in Portugal, but B− patients are just as rare and can also take O−, so a B− red-cell donor scores 0.35×.

**Assumptions and limits**

- Patients and donors are spread like the general population, and everyone donates at the same rate.
- Need is shared evenly across compatible donors. Hospitals give same-type blood first, which pulls every score toward 1.0. They also use O− in emergencies before a patient is typed, which pushes O− up.
- With perfectly optimal matching and supply that mirrors the population, every type scores 1.0, because each group can supply itself. The differences in this model come from how flexible each type is.
- Only ABO and RhD count, and every unit is worth the same.

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
