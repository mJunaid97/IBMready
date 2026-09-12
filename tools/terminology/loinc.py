#!/usr/bin/env python3
"""loinc.py — ingest a LOINC release into canonical test candidates and verify the LOINC codes the content asserts.

    python3 tools/terminology/loinc.py --loinc-csv /path/to/LoincTable/Loinc.csv [--panels /path/to/PanelsAndForms.csv]
                                       [--out data/terminology] [--write-verification] [--max-rows N]

Implements the programmatic test ingestion of the specification (§84):
  1. ingests the LOINC table (Loinc.csv of the official release; columns LOINC_NUM, COMPONENT, PROPERTY, TIME_ASPCT, SYSTEM,
     SCALE_TYP, METHOD_TYP, CLASS, CLASSTYPE, LONG_COMMON_NAME, SHORTNAME, DisplayName, RELATEDNAMES2, STATUS, VersionLastChanged…)
  2. keeps the LOINC code as the canonical identifier of every record
  3. normalises names: long common name, short name, display name and related names become synonyms
  4. maps abbreviations from the short name and the related names
  5. identifies panels (SCALE_TYP "-" with CLASSTYPE 1 panels, or the PanelsAndForms file) and 6. their components
  7. maps the LOINC SYSTEM to the site's specimen vocabulary, 8. METHOD_TYP to the method vocabulary,
  9./10. the LOINC CLASS to the site's test categories (and through them to body systems), 11./12. leaves condition and
     medication mapping to the editorial team (they are clinical claims and must be sourced),
 13. deduplicates method-, unit- and property-specific variants into one canonical concept (COMPONENT + SYSTEM),
 14. marks DEPRECATED / DISCOURAGED records, 15. flags sparse concepts (no match, no long name), and
 16. writes review queues.

Nothing here becomes a page automatically: candidates are matched against the catalogue (content/test-taxonomy.json) and the
existing pages by name; unmatched, clinically recognisable concepts are listed for the editorial team (§86: package-level and
unit-specific duplicates stay database-only).

LOINC is © Regenstrief Institute, Inc. and the LOINC Committee, distributed under the LOINC licence (free with registration;
attribution required; redistribution of the table itself restricted). The release is read from a path you supply and is never
committed; only the verification of codes already asserted in content/ is written back (--write-verification).
"""
import argparse, collections, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import OUT_DIR, asserted_codes, load_content, merge_verification, norm, read_delimited, report, site_index, slug, today, write_json

# LOINC CLASS (or its prefix) -> test categories of the master taxonomy (content/test-taxonomy.json)
CLASS_TO_CATEGORIES = {
    "HEM/BC": ["blood-haematology"], "COAG": ["coagulation-haemostasis"], "CHEM": ["chemistry-metabolic"], "UA": ["kidney-urinary"], "DRUG/TOX": ["toxicology-drug-monitoring"],
    "MICRO": ["infectious-disease-microbiology"], "ABXBACT": ["infectious-disease-microbiology"], "SERO": ["immunology-inflammation", "infectious-disease-microbiology"], "ALLERGY": ["allergy"],
    "MOLPATH": ["genetic-molecular"], "MOLPATH.MUT": ["genetic-molecular"], "MOLPATH.PHARMG": ["genetic-molecular"], "CYTO": ["pathology-cytology"], "PATH": ["pathology-cytology"], "PATH.HISTO": ["pathology-cytology"],
    "BLDBK": ["blood-bank-transfusion"], "FERT": ["reproductive-fertility"], "OB.US": ["pregnancy-prenatal", "imaging"], "CARD.US": ["cardiovascular", "imaging"], "RAD": ["imaging"], "NR.RAD": ["imaging"],
    "EKG.MEAS": ["cardiovascular"], "EKG.IMP": ["cardiovascular"], "PULM": ["respiratory"], "BDYWGT.ATOM": ["vital-signs-physiological-measurements"], "BDYHGT.ATOM": ["vital-signs-physiological-measurements"],
    "BP.ATOM": ["vital-signs-physiological-measurements"], "BDYTMP.ATOM": ["vital-signs-physiological-measurements"], "HRTRATE.ATOM": ["vital-signs-physiological-measurements"], "RESP.ATOM": ["vital-signs-physiological-measurements"],
    "VITALS": ["vital-signs-physiological-measurements"], "OPHTH": ["eye-ophthalmic"], "EYE": ["eye-ophthalmic"], "AUDIO": ["hearing-balance"], "NEURO": ["neurology"], "SKNTST": ["allergy", "dermatology"],
    "SURVEY": ["screening-clinical-assessment"], "PANEL.CHEM": ["chemistry-metabolic"], "PANEL.HEM/BC": ["blood-haematology"], "PANEL.COAG": ["coagulation-haemostasis"], "PANEL.UA": ["kidney-urinary"],
    "PANEL.MICRO": ["infectious-disease-microbiology"], "PANEL.SERO": ["immunology-inflammation"], "PANEL.DRUG/TOX": ["toxicology-drug-monitoring"], "PANEL.ALLERGY": ["allergy"], "H&P": ["screening-clinical-assessment"],
}
# LOINC SYSTEM -> specimen vocabulary id
SYSTEM_TO_SPECIMEN = {
    "Bld": "venous-blood", "Ser": "serum", "Plas": "plasma", "Ser/Plas": "serum-or-plasma", "Ser/Plas/Bld": "serum-or-plasma", "BldC": "capillary-blood", "BldA": "arterial-blood", "BldV": "venous-blood",
    "Urine": "urine", "Urine sed": "urine", "Stool": "stool", "CSF": "csf", "Sputum": "sputum", "Throat": "throat-swab", "Nose": "nasopharyngeal-swab", "Nph": "nasopharyngeal-swab", "Wound": "wound-swab",
    "Genital": "genital-swab", "Vag": "genital-swab", "Cvx": "genital-swab", "Urethra": "genital-swab", "Tiss": "tissue", "Bone mar": "bone-marrow", "Plr fld": "pleural-fluid", "Periton fld": "peritoneal-fluid",
    "Synv fld": "synovial-fluid", "Pericard fld": "pericardial-fluid", "Amnio fld": "amniotic-fluid", "BAL": "bronchoalveolar-lavage", "Semen": "semen", "Saliva": "saliva", "Exhl gas": "breath", "Hair": "hair-or-nail", "Nail": "hair-or-nail",
    "Body fld": None, "XXX": None, "^Patient": "none", "Heart": "none", "Chest": "none", "Lung": "none",
}
# LOINC METHOD_TYP -> method vocabulary id (prefix match, longest first)
METHOD_TO_METHOD = {
    "Automated count": "automated-cell-count", "Manual count": "microscopy", "Microscopy": "microscopy", "Flow cytometry": "flow-cytometry", "Coagulation assay": "coagulation-assay", "Immunoassay": "immunoassay",
    "IA": "immunoassay", "EIA": "immunoassay", "Electrophoresis": "electrophoresis", "HPLC": "chromatography-mass-spectrometry", "LC/MS/MS": "chromatography-mass-spectrometry", "GC/MS": "chromatography-mass-spectrometry",
    "Culture": "culture", "Immune stain": "immunohistochemistry", "Probe.amp.tar": "pcr", "NAA+probe": "naat", "Probe": "naat", "Sequencing": "sequencing", "Molgen": "sequencing", "Karyotyping": "karyotype", "FISH": "fish",
    "Microarray": "microarray", "Test strip": "dipstick", "Test strip.automated": "dipstick", "Calculated": "calculation", "Estimated": "calculation", "Pulse oximetry": "oximetry", "Spirometry": "spirometry",
    "US": "ultrasound", "XR": "radiography", "CT": "ct", "MR": "mri", "NM": "nuclear-medicine", "PET": "nuclear-medicine",
}
STATUS_FLAG = {"DEPRECATED", "DISCOURAGED"}

def categories_for(cls):
    cls = cls or ""
    for key in sorted(CLASS_TO_CATEGORIES, key=len, reverse=True):
        if cls == key or cls.startswith(key + "."): return CLASS_TO_CATEGORIES[key]
    return []

def specimen_for(system):
    if not system: return None
    if system in SYSTEM_TO_SPECIMEN: return SYSTEM_TO_SPECIMEN[system]
    head = system.split("^")[0].split("/")[0]
    return SYSTEM_TO_SPECIMEN.get(head)

def method_for(method):
    if not method: return None
    for key in sorted(METHOD_TO_METHOD, key=len, reverse=True):
        if method == key or method.startswith(key): return METHOD_TO_METHOD[key]
    return None

def abbreviations_of(short, related):
    """Abbreviations from the related names (';'-separated) and the first token of the short name: 2–7 characters, letters and
    digits only, and either all capitals, capitals with a digit (HbA1c, A1c), or a two/three-letter capitalised token (Hb, Hgb)."""
    out = []
    def ok(tok):
        if not (2 <= len(tok) <= 7) or not re.fullmatch(r"[A-Za-z0-9]+", tok) or not any(ch.isupper() for ch in tok) or tok.isdigit(): return False
        return tok.isupper() or any(ch.isdigit() for ch in tok) or (len(tok) <= 3 and tok[0].isupper())
    cands = [t.strip() for t in (related or "").split(";")] + [(short or "").split(" ")[0]]
    for tok in cands:
        if ok(tok) and tok not in out: out.append(tok)
    return out[:8]

def ingest(rows, panels=None):
    """rows: iterable of LOINC table dicts -> (concepts, records, stats). Variants are grouped by COMPONENT + SYSTEM (§84 step 13)."""
    concepts, records = {}, {}
    stats = collections.Counter()
    for r in rows:
        code = r.get("LOINC_NUM", "").strip()
        if not code: continue
        stats["rows"] += 1
        status = (r.get("STATUS") or "ACTIVE").upper()
        comp, system = (r.get("COMPONENT") or "").strip(), (r.get("SYSTEM") or "").strip()
        key = norm(comp) + "|" + norm(system)
        rec = {"code": code, "component": comp, "property": r.get("PROPERTY", ""), "system": system, "scale": r.get("SCALE_TYP", ""), "method": r.get("METHOD_TYP", ""), "class": r.get("CLASS", ""),
               "longName": r.get("LONG_COMMON_NAME", ""), "shortName": r.get("SHORTNAME", ""), "displayName": r.get("DisplayName", ""), "status": status, "version": r.get("VersionLastChanged", "")}
        records[code] = rec
        if status in STATUS_FLAG: stats["deprecated"] += 1
        c = concepts.get(key)
        if not c:
            c = concepts[key] = {"id": slug((rec["displayName"] or comp) + (" " + system if system and system not in ("^Patient", "XXX") else "")), "component": comp, "system": system,
                                 "name": rec["displayName"] or rec["longName"] or comp, "synonyms": [], "abbreviations": [], "codes": [], "variants": [], "categories": categories_for(rec["class"]),
                                 "specimen": specimen_for(system), "methods": [], "isPanel": rec["scale"] == "-" and (rec["class"] or "").startswith("PANEL"), "deprecated": True, "class": rec["class"]}
        c["codes"].append(code)
        c["variants"].append({"code": code, "property": rec["property"], "method": rec["method"], "scale": rec["scale"], "status": status})
        if status not in STATUS_FLAG: c["deprecated"] = False
        for n in (rec["longName"], rec["shortName"], rec["displayName"]):
            if n and norm(n) != norm(c["name"]) and n not in c["synonyms"]: c["synonyms"].append(n)
        for n in (r.get("RELATEDNAMES2") or "").split(";"):
            n = n.strip()
            if n and len(c["synonyms"]) < 20 and norm(n) != norm(c["name"]) and n not in c["synonyms"]: c["synonyms"].append(n)
        for a in abbreviations_of(rec["shortName"], r.get("RELATEDNAMES2")):
            if a not in c["abbreviations"]: c["abbreviations"].append(a)
        m = method_for(rec["method"])
        if m and m not in c["methods"]: c["methods"].append(m)
    stats["concepts"] = len(concepts)
    if panels:
        for p in panels:
            parent, child = (p.get("ParentLoinc") or p.get("PARENT_LOINC") or "").strip(), (p.get("Loinc") or p.get("LOINC") or "").strip()
            if parent in records and child in records:
                records[parent].setdefault("components", []).append(child); records[parent]["isPanel"] = True
                stats["panelLinks"] += 1
    return list(concepts.values()), records, stats

def match_concepts(concepts, idx):
    """Attach the catalogue concept or page each candidate resolves to (name and synonym matches only; abbreviations alone never map)."""
    queues = collections.defaultdict(list)
    for c in concepts:
        hit = idx.match([c["name"], c["component"], *c["synonyms"][:12]])
        if hit: c["matches"] = {"kind": hit[0], "id": hit[1], "name": idx.names[hit]}
        elif c["deprecated"]: queues["deprecated_terminology"].append({"concept": c["id"], "detail": f"{', '.join(c['codes'][:5])} deprecated or discouraged"})
        elif not c["categories"]: queues["sparse"].append({"concept": c["id"], "detail": f"LOINC class '{c['class']}' has no category mapping"})
        else: queues["unmatched"].append({"concept": c["id"], "name": c["name"], "categories": c["categories"], "codes": c["codes"][:5]})
    return queues

def verify(records, asserted):
    """Codes asserted in content that the release confirms (with the release name), and the ones it does not know or has deprecated."""
    verified, problems = {}, []
    for code, owners in asserted.get("loinc", {}).items():
        rec = records.get(code)
        if not rec: problems.append(f"{code} (asserted by {', '.join(owners)}) is not in the release"); continue
        verified[code] = {"name": rec["longName"] or rec["displayName"], "status": rec["status"], "release": rec.get("release", ""), "verifiedAt": today()}
        if rec["status"] in STATUS_FLAG: problems.append(f"{code} ({rec['longName']}) is {rec['status']}; used by {', '.join(owners)}")
    return verified, problems

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--loinc-csv", required=True, help="Loinc.csv from the LOINC release (LoincTable/Loinc.csv)")
    ap.add_argument("--panels", help="PanelsAndForms.csv from the release accessory files (panel → component links)")
    ap.add_argument("--release", default="", help="release label written into the verification file, e.g. 2.80")
    ap.add_argument("--out", default=OUT_DIR); ap.add_argument("--max-rows", type=int); ap.add_argument("--write-verification", action="store_true")
    a = ap.parse_args(argv)
    rows = read_delimited(a.loinc_csv, max_rows=a.max_rows)
    panels = list(read_delimited(a.panels)) if a.panels else None
    concepts, records, stats = ingest(rows, panels)
    for r in records.values(): r["release"] = a.release
    idx = site_index()
    queues = match_concepts(concepts, idx)
    verified, problems = verify(records, asserted_codes())
    matched = sum(1 for c in concepts if c.get("matches"))
    write_json(os.path.join(a.out, "loinc-candidates.json"), {"source": "LOINC", "release": a.release, "importedAt": today(), "stats": dict(stats), "concepts": concepts})
    write_json(os.path.join(a.out, "loinc-queues.json"), {"source": "LOINC", "release": a.release, "importedAt": today(), "queues": dict(queues), "verificationProblems": problems})
    merge_verification("loinc", {c: {**v, "release": a.release} for c, v in verified.items()}, write=a.write_verification)
    report(f"LOINC {a.release or ''}: {stats['rows']} records → {stats['concepts']} canonical concepts ({stats['deprecated']} deprecated records, {stats.get('panelLinks', 0)} panel links)",
           [f"{matched} concepts match a catalogue concept or page; {len(queues.get('unmatched', []))} unmatched, {len(queues.get('deprecated_terminology', []))} deprecated-only, {len(queues.get('sparse', []))} without a category",
            f"{len(verified)} asserted codes verified" + (f"; {len(problems)} problems: " + "; ".join(problems[:5]) if problems else ""),
            f"wrote {a.out}/loinc-candidates.json and loinc-queues.json" + (" and content/terminology-verification.json" if a.write_verification else " (add --write-verification to record the verified codes)")])
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main())
