import pandas as pd, json
df = pd.read_csv("blood_by_country.csv")
order = ["Oneg","Opos","Aneg","Apos","Bneg","Bpos","ABneg","ABpos"]
full = df.dropna(subset=order).copy()
full[order] = full[order].div(full[order].sum(axis=1), axis=0)*100
w = (full[order].mul(full["pop"], axis=0)).sum()/full["pop"].sum()
r = {"World": [round(x,2) for x in w.tolist()]}
for _, row in full.iterrows():
    r[row.country] = [round(row[c],2) for c in order]
meta = {"n": len(full), "popbn": round(full["pop"].sum()/1e9,1)}
s = json.dumps({"r": r, "meta": meta}, ensure_ascii=False, separators=(",",":"))
open("data.json","w").write(s)
print(len(s), r["World"], r["Portugal"], r["United Kingdom"])
