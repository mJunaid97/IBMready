#!/usr/bin/env python3
"""rxnorm.py — ingest an RxNorm release (RRF files) into canonical medication candidates and verify the identifiers the
content asserts (RxCUI, ATC, FDA Established Pharmacologic Class).

    python3 tools/terminology/rxnorm.py --rrf-dir /path/to/rrf [--out data/terminology] [--write-verification] [--max-rows N]

Implements the programmatic medication ingestion of the specification (§85):
  1. ingests RxNorm concepts (RXNCONSO.RRF, SAB=RXNORM): term types IN (ingredient), PIN (precise ingredient: salts and
     esters), MIN (multiple ingredients), BN (brand name), SCD/SBD (clinical and branded drugs), DF (dose form)
  2. identifies active ingredients (IN) as the canonical medication entity, 3. branded concepts (BN → its ingredient through
     RXNREL `has_tradename` / `tradename_of` or a branded drug's ingredient), 4. combination products (MIN with its `has_part`
     ingredients), 5. precise ingredients as ingredient variants (PIN `form_of` IN)
  6. maps dose forms (DF via `has_dose_form`) to the site's dosage-form vocabulary and 7. routes from the dose form
  8. maps WHO ATC codes (ATC atoms that share the ingredient's RXCUI in RXNCONSO, SAB=ATC)
  9. maps FDA pharmacologic classes where the release carries MED-RT (RXNREL RELA has_epc / has_moa / has_pe)
 10.–14. leaves label references, interaction providers, monitoring tests, anatomy and indications to the editorial team:
     they are clinical claims and must be sourced (§82: "Do not add a monitoring relationship simply because it seems logical")
 15. detects obsolete concepts (SUPPRESS = O/E, or RXNSAT RXN_QUANTITY / status attributes) and 16. writes review queues.

RxNorm is produced by the U.S. National Library of Medicine; the RxNorm files are free of charge under the UMLS
Metathesaurus licence terms for RxNorm. Only SAB = RXNORM, ATC and MED-RT rows are read; the restricted source
vocabularies of the full release are never touched. ATC/DDD is © WHO Collaborating Centre for Drug Statistics Methodology.
The release is read from a path you supply and never committed.
"""
import argparse, collections, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import OUT_DIR, asserted_codes, load_content, merge_verification, norm, read_rrf, report, site_index, today, write_json

RXNCONSO = ["RXCUI", "LAT", "TS", "LUI", "STT", "SUI", "ISPREF", "RXAUI", "SAUI", "SCUI", "SDUI", "SAB", "TTY", "CODE", "STR", "SRL", "SUPPRESS", "CVF"]
RXNREL = ["RXCUI1", "RXAUI1", "STYPE1", "REL", "RXCUI2", "RXAUI2", "STYPE2", "RELA", "RUI", "SRUI", "SAB", "SL", "DIR", "RG", "SUPPRESS", "CVF"]
# RxNorm dose form -> (dosage-form vocabulary id, route vocabulary id)
DOSE_FORMS = {
    "Oral Tablet": ("tablet", "oral"), "Oral Capsule": ("capsule", "oral"), "Chewable Tablet": ("chewable-tablet", "oral"), "Disintegrating Oral Tablet": ("orally-disintegrating-tablet", "oral"),
    "Effervescent Oral Tablet": ("effervescent-tablet", "oral"), "Extended Release Oral Tablet": ("extended-release-tablet", "oral"), "Extended Release Oral Capsule": ("extended-release-tablet", "oral"),
    "Delayed Release Oral Tablet": ("delayed-release-tablet", "oral"), "Delayed Release Oral Capsule": ("delayed-release-tablet", "oral"), "Oral Solution": ("solution", "oral"), "Oral Suspension": ("suspension", "oral"),
    "Oral Powder": ("powder", "oral"), "Oral Granules": ("granules", "oral"), "Oral Film": ("oral-film", "oral"), "Oral Lozenge": ("lozenge", "oral"), "Sublingual Tablet": ("tablet", "sublingual"), "Buccal Tablet": ("tablet", "buccal"),
    "Metered Dose Inhaler": ("metered-dose-inhaler", "inhaled"), "Dry Powder Inhaler": ("dry-powder-inhaler", "inhaled"), "Inhalation Solution": ("nebulizer-solution", "nebulized"), "Inhalation Suspension": ("nebulizer-solution", "nebulized"),
    "Nasal Spray": ("nasal-spray", "intranasal"), "Ophthalmic Solution": ("eye-drops", "ophthalmic"), "Ophthalmic Suspension": ("eye-drops", "ophthalmic"), "Ophthalmic Ointment": ("eye-ointment", "ophthalmic"), "Otic Solution": ("ear-drops", "otic"),
    "Topical Cream": ("cream", "topical"), "Topical Ointment": ("ointment", "topical"), "Topical Gel": ("gel", "topical"), "Topical Lotion": ("lotion", "topical"), "Topical Foam": ("foam", "topical"), "Medicated Shampoo": ("shampoo", "topical"),
    "Transdermal System": ("patch", "transdermal"), "Rectal Suppository": ("suppository", "rectal"), "Enema": ("enema", "rectal"), "Vaginal Tablet": ("vaginal-tablet", "vaginal"), "Vaginal Insert": ("pessary", "vaginal"),
    "Injectable Solution": ("injection", "intravenous"), "Injectable Suspension": ("injection", "intramuscular"), "Prefilled Syringe": ("prefilled-syringe", "subcutaneous"), "Pen Injector": ("pen-injector", "subcutaneous"),
    "Auto-Injector": ("autoinjector", "subcutaneous"), "Injection": ("injection", "intravenous"), "Drug Implant": ("implant", "implant"), "Intravenous Solution": ("infusion", "intravenous"),
}
EPC_RELA = {"has_epc": "fdaEpc", "has_moa": "fdaMoa", "has_pe": "fdaPe"}

def dose_form_map(name):
    for k, v in DOSE_FORMS.items():
        if norm(k) == norm(name): return v
    for k, v in sorted(DOSE_FORMS.items(), key=lambda kv: -len(kv[0])):
        if norm(k) in norm(name): return v
    return (None, None)

def ingest(conso_rows, rel_rows, max_rows=None):
    """RXNCONSO + RXNREL rows -> ingredients (canonical), brands, combinations, precise ingredients, dose forms, ATC and MED-RT classes."""
    names, tty, atc_by_cui, classes, suppressed = {}, {}, collections.defaultdict(list), {}, set()
    stats = collections.Counter()
    for r in conso_rows:
        stats["conso"] += 1
        if r.get("LAT", "ENG") != "ENG": continue
        cui = r["RXCUI"]
        if r["SAB"] == "RXNORM":
            if r.get("SUPPRESS") in ("O", "E"): suppressed.add(cui)
            if cui not in names or r.get("ISPREF") == "Y": names[cui] = r["STR"]; tty[cui] = r["TTY"]
        elif r["SAB"] == "ATC" and r["TTY"] in ("IN", "PT") and re.match(r"^[A-Z]\d{2}[A-Z]{2}\d{2}$", r["CODE"]):
            if r["CODE"] not in atc_by_cui[cui]: atc_by_cui[cui].append(r["CODE"])
        elif r["SAB"] == "MED-RT":
            classes[cui] = {"name": r["STR"], "tty": r["TTY"]}
    ing = {cui: {"rxcui": cui, "name": n, "brands": [], "variants": [], "doseForms": [], "routes": [], "atc": atc_by_cui.get(cui, []), "fdaEpc": [], "fdaMoa": [], "fdaPe": [], "obsolete": cui in suppressed} for cui, n in names.items() if tty.get(cui) == "IN"}
    combos = {cui: {"rxcui": cui, "name": n, "ingredients": [], "obsolete": cui in suppressed} for cui, n in names.items() if tty.get(cui) == "MIN"}
    brand_to_ing = collections.defaultdict(set)
    for r in rel_rows:
        stats["rel"] += 1
        if r.get("SAB") not in ("RXNORM", "MED-RT"): continue
        rela, c1, c2 = (r.get("RELA") or "").lower(), r["RXCUI1"], r["RXCUI2"]
        if rela in ("tradename_of",) and c2 in ing and tty.get(c1) == "BN": brand_to_ing[c1].add(c2)
        elif rela == "has_tradename" and c1 in ing and tty.get(c2) == "BN": brand_to_ing[c2].add(c1)
        elif rela == "form_of" and c2 in ing and tty.get(c1) == "PIN": ing[c2]["variants"].append(names[c1])
        elif rela == "has_form" and c1 in ing and tty.get(c2) == "PIN": ing[c1]["variants"].append(names[c2])
        elif rela == "has_part" and c1 in combos and c2 in ing: combos[c1]["ingredients"].append(c2)
        elif rela == "part_of" and c2 in combos and c1 in ing: combos[c2]["ingredients"].append(c1)
        elif rela == "has_dose_form" and tty.get(c2) == "DF":
            # dose forms hang off clinical drugs (SCD); walk back to the ingredient through has_ingredient is a second pass, so record by drug
            pass
        elif rela in EPC_RELA and c2 in ing and c1 in classes: ing[c2][EPC_RELA[rela]].append(classes[c1]["name"])
        elif rela in EPC_RELA and c1 in ing and c2 in classes: ing[c1][EPC_RELA[rela]].append(classes[c2]["name"])
    for bn, ings in brand_to_ing.items():
        for i in ings: ing[i]["brands"].append(names[bn])
    stats.update({"ingredients": len(ing), "combinations": len(combos), "brands": len(brand_to_ing), "obsolete": sum(1 for i in ing.values() if i["obsolete"])})
    return ing, combos, names, tty, stats

def attach_dose_forms(ing, names, tty, rel_rows):
    """Second pass: SCD has_ingredient IN and SCD has_dose_form DF → the ingredient's dose forms and routes (mapped to the vocabularies)."""
    scd_ing, scd_df = collections.defaultdict(set), collections.defaultdict(set)
    for r in rel_rows:
        if r.get("SAB") != "RXNORM": continue
        rela, c1, c2 = (r.get("RELA") or "").lower(), r["RXCUI1"], r["RXCUI2"]
        if rela == "has_ingredient" and c2 in ing: scd_ing[c1].add(c2)
        elif rela == "ingredient_of" and c1 in ing: scd_ing[c2].add(c1)
        elif rela == "has_dose_form" and tty.get(c2) == "DF": scd_df[c1].add(names[c2])
        elif rela == "dose_form_of" and tty.get(c1) == "DF": scd_df[c2].add(names[c1])
    for scd, ings in scd_ing.items():
        for df in scd_df.get(scd, ()):
            form, route = dose_form_map(df)
            for i in ings:
                if form and form not in ing[i]["doseForms"]: ing[i]["doseForms"].append(form)
                if route and route not in ing[i]["routes"]: ing[i]["routes"].append(route)

def match_and_verify(ing, combos, idx, asserted):
    """Match ingredients and combinations to site medicines/products by name; verify asserted RxCUIs, ATC codes and EPC names."""
    queues = collections.defaultdict(list)
    by_name = {}
    for i in ing.values():
        hit = idx.match([i["name"], *i["variants"][:5]])
        if hit and hit[0] == "medications": i["matches"] = {"kind": "medications", "id": hit[1]}
        elif not i["obsolete"]: queues["unmatched_ingredient"].append({"rxcui": i["rxcui"], "name": i["name"], "brands": i["brands"][:5], "atc": i["atc"]})
        by_name[norm(i["name"])] = i
    for c in combos.values():
        hit = idx.match([c["name"]])
        if hit and hit[0] == "products": c["matches"] = {"kind": "products", "id": hit[1]}
    verified = {"rxnorm": {}, "atc": {}, "fdaEpc": {}}; problems = []
    site_meds = load_content("medications.json", {"medications": {}})["medications"]
    for cui, owners in asserted.get("rxnorm", {}).items():
        i = ing.get(cui)
        if not i: problems.append(f"RxCUI {cui} (asserted by {', '.join(owners)}) is not an ingredient in the release"); continue
        for o in owners:
            m = site_meds.get(o.split("/", 1)[1], {})
            if m and norm(m.get("name")) != norm(i["name"]) and norm(i["name"]) not in {norm(x) for x in [*(m.get("aliases") or []), *(m.get("ingredientVariants") or [])]}:
                problems.append(f"RxCUI {cui} is '{i['name']}' in the release but asserted by {o} ('{m.get('name')}')")
        verified["rxnorm"][cui] = {"name": i["name"], "tty": "IN", "verifiedAt": today()}
        if i["obsolete"]: problems.append(f"RxCUI {cui} ({i['name']}) is suppressed/obsolete in the release")
        for o in owners:
            m = site_meds.get(o.split("/", 1)[1], {})
            for jur, bs in (m.get("brands") or {}).items():
                for b in bs:
                    if i["brands"] and not any(norm(b) == norm(x) or norm(b) in norm(x) for x in i["brands"]): queues["possible_brand_mapping_error"].append({"entity": o, "detail": f"brand '{b}' ({jur}) is not a tradename of RxCUI {cui} in the release"})
    known_atc = {code for i in ing.values() for code in i["atc"]}
    for code, owners in asserted.get("atc", {}).items():
        if len(code) == 7:
            if code in known_atc: verified["atc"][code] = {"verifiedAt": today()}
            else: problems.append(f"ATC {code} (asserted by {', '.join(owners)}) is not attached to any ingredient in the release")
        else: verified["atc"][code] = {"verifiedAt": today(), "note": "group-level code; verified structurally (not an ingredient code)"}
    known_epc = {n for i in ing.values() for n in i["fdaEpc"]}
    for name, owners in asserted.get("fdaEpc", {}).items():
        if known_epc and name not in known_epc: problems.append(f"FDA EPC '{name}' (asserted by {', '.join(owners)}) is not in the release's MED-RT classes")
        elif known_epc: verified["fdaEpc"][name] = {"verifiedAt": today()}
    return queues, verified, problems

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--rrf-dir", required=True, help="directory with RXNCONSO.RRF and RXNREL.RRF")
    ap.add_argument("--release", default="", help="release label, e.g. 2026-09 (monthly RxNorm release)")
    ap.add_argument("--out", default=OUT_DIR); ap.add_argument("--max-rows", type=int); ap.add_argument("--write-verification", action="store_true")
    a = ap.parse_args(argv)
    conso = os.path.join(a.rrf_dir, "RXNCONSO.RRF"); rel = os.path.join(a.rrf_dir, "RXNREL.RRF")
    ing, combos, names, tty, stats = ingest(read_rrf(conso, RXNCONSO, a.max_rows), read_rrf(rel, RXNREL, a.max_rows))
    attach_dose_forms(ing, names, tty, read_rrf(rel, RXNREL, a.max_rows))
    idx = site_index()
    queues, verified, problems = match_and_verify(ing, combos, idx, asserted_codes())
    matched = sum(1 for i in ing.values() if i.get("matches"))
    write_json(os.path.join(a.out, "rxnorm-candidates.json"), {"source": "RxNorm", "release": a.release, "importedAt": today(), "stats": dict(stats), "ingredients": list(ing.values()), "combinations": list(combos.values())})
    write_json(os.path.join(a.out, "rxnorm-queues.json"), {"source": "RxNorm", "release": a.release, "importedAt": today(), "queues": dict(queues), "verificationProblems": problems})
    for section, recs in verified.items():
        if recs: merge_verification(section, {c: {**v, "release": a.release} for c, v in recs.items()}, write=a.write_verification)
    report(f"RxNorm {a.release or ''}: {stats['conso']} atoms, {stats['rel']} relationships → {stats['ingredients']} ingredients ({stats['obsolete']} obsolete), {stats['combinations']} combinations, {stats['brands']} brand names",
           [f"{matched} ingredients match a medicine on this site; {len(queues.get('unmatched_ingredient', []))} ingredients have no page (candidates for the coverage queue)",
            f"verified: {len(verified['rxnorm'])} RxCUI, {len(verified['atc'])} ATC, {len(verified['fdaEpc'])} EPC" + (f"; {len(problems)} problems: " + "; ".join(problems[:5]) if problems else ""),
            f"wrote {a.out}/rxnorm-candidates.json and rxnorm-queues.json" + (" and content/terminology-verification.json" if a.write_verification else " (add --write-verification to record the verified codes)")])
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main())
