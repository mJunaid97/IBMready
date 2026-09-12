#!/usr/bin/env python3
"""taxonomy.py — the terminology, taxonomy and validation layer of the content compiler (imported by build-content.py).

Implements the Comprehensive Clinical Tests & Medications specification on top of the entity graph:

  * controlled vocabularies (content/vocabularies.json): test kinds, specimens, methods, imaging modalities, routes,
    dosage forms, regulatory statuses, product types, vaccine platforms, advanced-therapy kinds, molecular scopes;
    a value outside a vocabulary fails the build (§75–§77, §95)
  * the master test taxonomy and catalogue (content/test-taxonomy.json): 36 categories, catalogued concepts, and the
    mapping of concepts onto public pages (explicit `covers` on a page, then exact name/synonym matches) (§4–§40, §86–§87)
  * the master medication taxonomy (content/medication-taxonomy.json): therapeutic areas → class concepts → pages (§42–§74)
  * canonical terminology identifiers on entities: LOINC for tests and biomarkers, RxCUI / ATC / FDA EPC for medicines
    (§2), each mapping "asserted" until content/terminology-verification.json (written by tools/terminology/*.py from
    a licensed release) confirms it
  * the drug-name rules (§79): an alias of one ingredient may never be the name, alias, brand or variant of another,
    nor a class name; brands map to exactly one ingredient; combination products list every ingredient
  * the automated validation rules (§95) and the review queues (§94) → data/content/review-queues.json
  * the named knowledge-graph relationships (§80, §81) emitted as typed edges in knowledge.json
  * provenance / freshness metadata on every entity (§91)
"""
import collections, json, os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, "content")

def load(name, default=None):
    p = os.path.join(C, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default

VOCAB = load("vocabularies.json", {})
TEST_TAX = load("test-taxonomy.json", {"groups": [], "categories": [], "concepts": []})
MED_TAX = load("medication-taxonomy.json", {"areas": []})
VERIFIED = load("terminology-verification.json", {}) or {}
def vocab(key): return VOCAB.get(key) or []
def vocab_ids(key): return [v["id"] for v in vocab(key)]
def vocab_name(key, vid): return next((v["name"] for v in vocab(key) if v["id"] == vid), vid)
TEST_CATEGORY_IDS = [c["id"] for c in TEST_TAX["categories"]]
MED_AREA_IDS = [a["id"] for a in MED_TAX["areas"]]
CONCEPTS = {c["id"]: c for c in TEST_TAX["concepts"]}
LAB_KINDS = {"laboratory", "panel", "microbiology", "genetic", "pathology"}
ABBREVIATION_NAME = re.compile(r"^[A-Za-z0-9-]{2,7}$")
LOINC_CODE = re.compile(r"^\d{1,7}-\d$")
ATC_CODE = re.compile(r"^[A-Z](\d{2}([A-Z]([A-Z](\d{2})?)?)?)?$")
RXCUI = re.compile(r"^\d{1,9}$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

def looks_like_abbreviation(name):
    """ECG, HbA1c, CRP, TSH, BNP…: short, no spaces, at least two capitals or a digit."""
    return bool(ABBREVIATION_NAME.match(name)) and (sum(1 for ch in name if ch.isupper()) >= 2 or any(ch.isdigit() for ch in name))

def check_enum(value, allowed, where, errors, field):
    if value is not None and value not in allowed: errors.append(f"{where}: {field} '{value}' not in {list(allowed)}")

def check_list(values, allowed, where, errors, field):
    if values is None: return []
    if isinstance(values, str): values = [values]
    if not isinstance(values, list): errors.append(f"{where}: {field} must be a list"); return []
    for v in values: check_enum(v, allowed, where, errors, field)
    return values

# ----------------------------------------------------------------------------- terminology identifiers (§2)
def normalise_terminology(e, key, where, errors):
    """entity.terminology → {loinc: [{code, name?, verified, verifiedAt?, release?}], rxcui, atc: [...], fdaEpc: [...]} with format checks."""
    t = e.get("terminology")
    if not t: return None
    if not isinstance(t, dict): errors.append(f"{where}: terminology must be an object"); return None
    out = {}
    vl = (VERIFIED.get("loinc") or {}); vr = (VERIFIED.get("rxnorm") or {}); va = (VERIFIED.get("atc") or {})
    loinc = t.get("loinc")
    if loinc:
        if isinstance(loinc, (str, dict)): loinc = [loinc]
        recs = []
        for x in loinc:
            rec = {"code": x} if isinstance(x, str) else dict(x)
            code = str(rec.get("code", ""))
            if not LOINC_CODE.match(code): errors.append(f"{where}: LOINC code '{code}' is not of the form NNNNN-N"); continue
            v = vl.get(code)
            rec["verified"] = bool(v); rec.setdefault("system", "LOINC")
            if v: rec.update({k: v[k] for k in ("name", "release", "verifiedAt", "status") if k in v})
            recs.append(rec)
        if recs: out["loinc"] = recs
    if t.get("rxcui") is not None:
        rx = str(t["rxcui"])
        if not RXCUI.match(rx): errors.append(f"{where}: rxcui '{rx}' must be numeric")
        else:
            v = vr.get(rx); out["rxcui"] = {"code": rx, "system": "RxNorm", "verified": bool(v), **({k: v[k] for k in ("name", "release", "verifiedAt", "tty") if k in v} if v else {})}
    if t.get("atc"):
        codes = t["atc"] if isinstance(t["atc"], list) else [t["atc"]]
        recs = []
        for code in codes:
            code = str(code)
            if not ATC_CODE.match(code): errors.append(f"{where}: ATC code '{code}' is not a WHO ATC code"); continue
            v = va.get(code); recs.append({"code": code, "system": "ATC", "verified": bool(v), **({k: v[k] for k in ("name", "release", "verifiedAt") if k in v} if v else {})})
        if recs: out["atc"] = recs
    if t.get("fdaEpc"):
        epc = t["fdaEpc"] if isinstance(t["fdaEpc"], list) else [t["fdaEpc"]]
        out["fdaEpc"] = [{"name": str(x), "system": "FDA EPC", "verified": bool((VERIFIED.get("fdaEpc") or {}).get(str(x)))} for x in epc]
    for k in ("snomed", "icd10"):
        if t.get(k): out[k] = t[k]
    return out or None

# ----------------------------------------------------------------------------- per-entity vocabulary rules
def validate_test(e, where, errors):
    kinds = vocab_ids("testKinds")
    kind = e.get("kind")
    if not kind: errors.append(f"{where}: needs a kind ({', '.join(kinds)})")
    else: check_enum(kind, kinds, where, errors, "kind")
    cats = e.get("categories") or []
    if isinstance(cats, str): cats = [cats]
    if e.get("category") and e["category"] not in cats: cats = [e["category"]] + cats
    if not cats: errors.append(f"{where}: needs a category from the test taxonomy")
    for c in cats: check_enum(c, TEST_CATEGORY_IDS, where, errors, "categories")
    e["categories"] = cats
    if cats and not e.get("category"): e["category"] = cats[0]
    e["specimens"] = check_list(e.get("specimens"), vocab_ids("specimens"), where, errors, "specimens")
    e["methods"] = check_list(e.get("methods"), vocab_ids("methods"), where, errors, "methods")
    if kind in ("laboratory", "panel", "microbiology") and not e["specimens"]: errors.append(f"{where}: a {kind} test must name its specimen(s) from the specimen vocabulary")
    if kind == "imaging":
        if not e.get("modality"): errors.append(f"{where}: an imaging study must specify its modality")
        else: check_enum(e["modality"], vocab_ids("imagingModalities"), where, errors, "modality")
    if kind == "panel" and not (e.get("components") or []): errors.append(f"{where}: a panel must reference its components")
    if kind == "genetic":
        m = e.get("molecular") or {}
        if not m.get("scope"): errors.append(f"{where}: a genetic or molecular test must say whether it concerns a gene, a variant, a panel or the field in general (molecular.scope)")
        else: check_enum(m["scope"], vocab_ids("molecularScopes"), where, errors, "molecular.scope")
        if not (m.get("methods") or e["methods"]): errors.append(f"{where}: a genetic or molecular test must name its method(s)")
        for mm in m.get("methods") or []: check_enum(mm, vocab_ids("methods"), where, errors, "molecular.methods")
    if looks_like_abbreviation(e.get("name", "")) and not e.get("canonicalName"):
        errors.append(f"{where}: the name '{e.get('name')}' is an abbreviation; give the canonical name in canonicalName (abbreviations never replace canonical identity)")
    e["abbreviations"] = [str(a) for a in (e.get("abbreviations") or [])]
    for c in e.get("components") or []:
        if c.get("test") and c["test"] == e.get("id"): errors.append(f"{where}: a panel cannot be its own component")
    for cid in e.get("covers") or []:
        if cid not in CONCEPTS: errors.append(f"{where}: covers unknown catalogue concept '{cid}'")
    for m in e.get("monitors") or []:
        pass  # validated as a condition link by the compiler (LINK_FIELDS)
    e["terminology"] = normalise_terminology(e, "tests", where, errors)

def validate_imaging(e, where, errors):
    if not e.get("modality"): errors.append(f"{where}: an imaging study must specify its modality")
    else: check_enum(e["modality"], vocab_ids("imagingModalities"), where, errors, "modality")
    for cid in e.get("covers") or []:
        if cid not in CONCEPTS: errors.append(f"{where}: covers unknown catalogue concept '{cid}'")
    e["terminology"] = normalise_terminology(e, "imaging", where, errors)

def validate_procedure(e, where, errors):
    for cid in e.get("covers") or []:
        if cid not in CONCEPTS: errors.append(f"{where}: covers unknown catalogue concept '{cid}'")

def validate_biomarker(e, where, errors):
    e["terminology"] = normalise_terminology(e, "biomarkers", where, errors)

def validate_medication(e, where, errors, jurisdictions, one_source, accessed, ids):
    pt = e.get("productType")
    if not pt: errors.append(f"{where}: needs a productType ({', '.join(vocab_ids('productTypes'))})")
    else: check_enum(pt, vocab_ids("productTypes"), where, errors, "productType")
    cats = e.get("categories") or []
    if isinstance(cats, str): cats = [cats]
    if e.get("category") and e["category"] not in cats: cats = [e["category"]] + cats
    if not cats: errors.append(f"{where}: needs a therapeutic area (category) from the medication taxonomy")
    for c in cats: check_enum(c, MED_AREA_IDS, where, errors, "categories")
    e["categories"] = cats
    if cats and not e.get("category"): e["category"] = cats[0]
    e["routeIds"] = check_list(e.get("routeIds"), vocab_ids("routes"), where, errors, "routeIds")
    e["dosageFormIds"] = check_list(e.get("dosageFormIds"), vocab_ids("dosageForms"), where, errors, "dosageFormIds")
    if not e["routeIds"]: errors.append(f"{where}: needs routeIds from the route vocabulary")
    if not e["dosageFormIds"]: errors.append(f"{where}: needs dosageFormIds from the dosage-form vocabulary")
    e["ingredientVariants"] = [str(v) for v in (e.get("ingredientVariants") or [])]
    e["members"] = [str(v) for v in (e.get("members") or [])]
    regs = e.get("regulatory") or []
    if not isinstance(regs, list): errors.append(f"{where}: regulatory must be a list"); regs = []
    for r in regs:
        if not isinstance(r, dict): errors.append(f"{where}: regulatory entry must be an object"); continue
        check_enum(r.get("jurisdiction"), jurisdictions, where, errors, "regulatory.jurisdiction")
        if not r.get("jurisdiction"): errors.append(f"{where}: regulatory entry needs a jurisdiction (status is never universal)")
        check_enum(r.get("status"), vocab_ids("regulatoryStatuses"), where, errors, "regulatory.status")
        if not r.get("status"): errors.append(f"{where}: regulatory entry needs a status")
        r["source"] = one_source(r, f"{where} regulatory {r.get('jurisdiction')}", errors, accessed)
        if r.get("verifiedAt") and not DATE.match(str(r["verifiedAt"])): errors.append(f"{where}: regulatory.verifiedAt must be YYYY-MM-DD")
    e["regulatory"] = regs
    if pt == "vaccine":
        v = e.get("vaccine") or {}
        for f in ("diseaseTargets", "platform", "antigen", "ageIndication"):
            if not v.get(f): errors.append(f"{where}: a vaccine needs vaccine.{f}")
        check_enum(v.get("platform"), vocab_ids("vaccinePlatforms"), where, errors, "vaccine.platform")
        for d in v.get("diseaseTargets") or []:
            if isinstance(d, dict) and d.get("condition") and d["condition"] not in ids.get("conditions", set()): errors.append(f"{where}: vaccine disease target condition '{d['condition']}' unknown")
        if v.get("schedule"): v["schedule"]["source"] = one_source(v["schedule"], f"{where} vaccine schedule", errors, accessed)
        else: errors.append(f"{where}: a vaccine needs vaccine.schedule with a note and a current authoritative source (schedules change)")
    if pt == "radiopharmaceutical":
        r = e.get("radiopharmaceutical") or {}
        for f in ("isotope", "targeting", "use", "precautions"):
            if not r.get(f): errors.append(f"{where}: a radiopharmaceutical needs radiopharmaceutical.{f}")
        check_enum(r.get("use"), ["diagnostic", "therapeutic", "both"], where, errors, "radiopharmaceutical.use")
        for im in r.get("relatedImaging") or []:
            if im not in ids.get("imaging", set()): errors.append(f"{where}: radiopharmaceutical.relatedImaging '{im}' unknown")
    if pt in ("contrast-agent", "diagnostic-agent"):
        c = e.get("contrast") or {}
        if not c.get("agentClass"): errors.append(f"{where}: a contrast or diagnostic agent needs contrast.agentClass")
        for im in c.get("relatedImaging") or []:
            if im not in ids.get("imaging", set()): errors.append(f"{where}: contrast.relatedImaging '{im}' unknown")
    if pt in ("gene-therapy", "cell-therapy"):
        a = e.get("advancedTherapy") or {}
        if not a.get("kind"): errors.append(f"{where}: an advanced therapy needs advancedTherapy.kind")
        else: check_enum(a["kind"], vocab_ids("advancedTherapyKinds"), where, errors, "advancedTherapy.kind")
        if not regs or not all(r.get("verifiedAt") for r in regs): errors.append(f"{where}: gene and cell therapies need regulatory entries each with a verifiedAt date (strict current regulatory verification)")
    e["terminology"] = normalise_terminology(e, "medications", where, errors)

# ----------------------------------------------------------------------------- cross-entity rules (§79, §95)
def validate_cross(types, products, errors, queues):
    meds = types["medications"]["items"]; classes = types["drug-classes"]["items"]
    med_names = {norm(m["name"]): mid for mid, m in meds.items()}
    class_terms = {}
    for cid, c in classes.items():
        class_terms[norm(c["name"])] = cid
        for al in c.get("aliases") or []: class_terms[norm(al)] = cid
    member_of = collections.defaultdict(set)
    for cid, c in classes.items():
        for n in c.get("members") or []: member_of[norm(re.sub(r"\s*\(.*?\)", "", n))].add(cid)
    product_names = {}
    for pid, p in products.items():
        product_names[norm(p.get("name", pid))] = pid
        for al in p.get("aliases") or []: product_names[norm(al)] = pid
    brand_owner = collections.defaultdict(set)
    for mid, m in meds.items():
        where = f"medications/{mid}"; own = {norm(m["name"])} | {norm(v) for v in m.get("ingredientVariants") or []} | {norm(x) for x in m.get("members") or []}
        for al in m.get("aliases") or []:
            n = norm(al)
            if n in med_names and med_names[n] != mid: errors.append(f"{where}: alias '{al}' is the name of another medicine ({med_names[n]}); a same-class medicine is not a synonym (§79)")
            elif n in class_terms: errors.append(f"{where}: alias '{al}' is a drug class ({class_terms[n]}), not a synonym of {m['name']} (§79)")
            elif n in member_of and n not in own: errors.append(f"{where}: alias '{al}' is a member of {sorted(member_of[n])}, a different ingredient; move it to related or the class members (§79)")
            elif n in product_names and product_names[n] not in (m.get("productAliases") or []): errors.append(f"{where}: alias '{al}' is the product {product_names[n]}; a combination or brand product is not a synonym of its ingredient (§79)")
        for jur, bs in (m.get("brands") or {}).items():
            for b in bs or []:
                brand_owner[norm(b)].add(mid)
                if norm(b) in med_names and med_names[norm(b)] != mid: errors.append(f"{where}: brand '{b}' is the name of another medicine ({med_names[norm(b)]})")
        for v in m.get("ingredientVariants") or []:
            if norm(m["name"]).split(" ")[0][:5] not in norm(v): queues["possible_active_ingredient_error"].append({"entity": where, "detail": f"ingredient variant '{v}' does not contain the ingredient name '{m['name']}'"})
        cls = (m.get("links") or {}).get("drugClass", [None])[0]
        listed_in = member_of.get(norm(m["name"]), set())
        if cls and listed_in and cls not in listed_in: queues["class_mapping_conflict"].append({"entity": where, "detail": f"drugClass is {cls} but listed as a member of {sorted(listed_in)}"})
        if not cls: queues["class_mapping_conflict"].append({"entity": where, "detail": "no drugClass link"})
        if m.get("class") and cls:
            stop = {"the", "of", "and", "a", "an", "for", "in", "to", "type", "drugs", "drug", "medicines", "agents", "agent"}
            toks = lambda t: {w[:-1] if w.endswith("s") and len(w) > 3 else w for w in norm(t).split() if w not in stop}
            text = toks(m["class"]); names = [classes[cls]["name"]] + list(classes[cls].get("aliases") or [])
            if not any(toks(n) and toks(n) <= text for n in names):
                queues["class_mapping_conflict"].append({"entity": where, "detail": f"class text '{m['class']}' does not name the linked class '{classes[cls]['name']}'"})
        # regulatory conflicts: two entries for one jurisdiction with different statuses and no note
        by_j = collections.defaultdict(list)
        for r in m.get("regulatory") or []: by_j[r.get("jurisdiction")].append(r)
        for j, rs in by_j.items():
            st = {r.get("status") for r in rs} - {"controlled"}
            if len(st) > 1 and not all(r.get("note") for r in rs): queues["regulatory_status_conflict"].append({"entity": where, "detail": f"{j}: statuses {sorted(st)} without a note explaining the difference"})
    for b, owners in brand_owner.items():
        if len(owners) > 1: errors.append(f"brand '{b}' is mapped to more than one ingredient ({sorted(owners)}); a brand of a combination belongs in products.json (§79, §95)")
    for pid, p in products.items():
        where = f"products/{pid}"
        n = norm(p.get("name", pid))
        if n in med_names: errors.append(f"{where}: product name '{p.get('name')}' is the name of a medicine; a product is not an ingredient")
        ings = p.get("ingredients") or []
        if p.get("kind") == "combination" and len(ings) < 2: errors.append(f"{where}: a combination product must map to at least two ingredients (§95)")
        if p.get("kind") == "brand" and len(ings) != 1: errors.append(f"{where}: a brand product maps to exactly one ingredient")
        for ing in ings:
            if isinstance(ing, dict) and ing.get("name") and norm(ing["name"]) in med_names:
                errors.append(f"{where}: ingredient '{ing['name']}' has a page ({med_names[norm(ing['name'])]}); reference it by id (§95 active-ingredient rule)")
    # tests, imaging, procedures: an alias that is another page's name is a possible synonym error; shared abbreviations are flagged
    page_names = {}
    for key in ("tests", "imaging", "procedures"):
        for eid, e in types[key]["items"].items():
            page_names.setdefault(norm(e["name"]), []).append(f"{key}/{eid}")
            if e.get("canonicalName"): page_names.setdefault(norm(e["canonicalName"]), []).append(f"{key}/{eid}")
    abbr_owner = collections.defaultdict(list)
    for key in ("tests", "imaging", "procedures"):
        for eid, e in types[key]["items"].items():
            for al in e.get("aliases") or []:
                for other in page_names.get(norm(al), []):
                    if other != f"{key}/{eid}": queues["possible_synonym_error"].append({"entity": f"{key}/{eid}", "detail": f"alias '{al}' is the name of {other}"})
            for ab in e.get("abbreviations") or []:
                if f"{key}/{eid}" not in abbr_owner[norm(ab)]: abbr_owner[norm(ab)].append(f"{key}/{eid}")
    for ab, owners in abbr_owner.items():
        if len(owners) > 1: queues["possible_synonym_error"].append({"entity": owners[0], "detail": f"abbreviation '{ab}' is also used by {owners[1:]}"})
    for n, owners in page_names.items():
        if len(set(owners)) > 1: queues["potential_duplicate"].append({"entity": owners[0], "detail": f"same name as {owners[1:]}"})

# ----------------------------------------------------------------------------- catalogue → pages, category data (§86–§88)
def map_catalogue(types, errors, queues):
    """concept id -> {type, id}: explicit `covers` first, then exact name/synonym matches; a concept claimed by two pages is an error."""
    concept_page = {}
    for key in ("tests", "imaging", "procedures"):
        for eid, e in types[key]["items"].items():
            for cid in e.get("covers") or []:
                if cid in concept_page and concept_page[cid] != {"type": key, "id": eid}: errors.append(f"{key}/{eid}: catalogue concept '{cid}' is already covered by {concept_page[cid]}")
                concept_page[cid] = {"type": key, "id": eid}
    index = collections.defaultdict(set)
    for key in ("tests", "imaging", "procedures"):
        for eid, e in types[key]["items"].items():
            for n in [e["name"], e.get("canonicalName") or ""] + list(e.get("aliases") or []):
                if n: index[norm(n)].add((key, eid))
    for cid, c in CONCEPTS.items():
        if cid in concept_page: continue
        hits = set()
        for n in [c["name"]] + list(c.get("synonyms") or []): hits |= index.get(norm(n), set())
        if len(hits) == 1: k, i = next(iter(hits)); concept_page[cid] = {"type": k, "id": i}
        elif len(hits) > 1: queues["potential_duplicate"].append({"entity": f"catalogue/{cid}", "detail": f"'{c['name']}' matches several pages: {sorted('/'.join(h) for h in hits)}"})
    return concept_page

def build_test_categories(types, concept_page, lead_of, updated):
    """One record per category: the pages in it (tests, imaging, procedures), the catalogued concepts without a page, counts, indexability."""
    groups = TEST_TAX["groups"]; cats = []
    pages_of = collections.defaultdict(lambda: {"tests": [], "imaging": [], "procedures": []})
    for cid, pg in concept_page.items():
        for cat in CONCEPTS[cid]["categories"]:
            if pg["id"] not in pages_of[cat][pg["type"]]: pages_of[cat][pg["type"]].append(pg["id"])
    for eid, e in types["tests"]["items"].items():
        for cat in e.get("categories") or []:
            if eid not in pages_of[cat]["tests"]: pages_of[cat]["tests"].append(eid)
    for cat in TEST_TAX["categories"]:
        pg = pages_of[cat["id"]]
        for k in pg: pg[k].sort(key=lambda i: types[k]["items"][i]["name"].lower())
        concepts = []
        for c in TEST_TAX["concepts"]:
            if cat["id"] not in c["categories"]: continue
            rec = {"id": c["id"], "name": c["name"], "abbreviations": c["abbreviations"], "synonyms": c["synonyms"], "kind": c["kind"]}
            if c["id"] in concept_page: rec["page"] = concept_page[c["id"]]
            concepts.append(rec)
        n_pages = sum(len(v) for v in pg.values())
        systems = []
        for k, ids in pg.items():
            for i in ids:
                for s in (types[k]["items"][i].get("anatomy") or {}).get("systems") or []:
                    if s not in systems: systems.append(s)
        reasons = []
        if n_pages < 2: reasons.append("fewer than two pages in the category")
        cats.append({**cat, "pages": pg, "concepts": concepts, "counts": {"pages": n_pages, "concepts": len(concepts), "withoutPage": sum(1 for c in concepts if "page" not in c)},
                     "systems": systems, "seo": {"index": not reasons, "reasons": reasons}})
    return {"updated": updated, "groups": groups, "categories": cats}

def build_medication_taxonomy(types, updated):
    """Therapeutic areas → groups → classes with resolved pages and member medicines; plus facets (route, dosage form, product type, area → medicine ids)."""
    meds = types["medications"]["items"]; classes = types["drug-classes"]["items"]
    class_members = collections.defaultdict(list)
    for mid, m in meds.items():
        cls = (m.get("links") or {}).get("drugClass", [None])[0]
        if cls: class_members[cls].append(mid)
    areas = []
    for a in MED_TAX["areas"]:
        groups = []
        for g in a["groups"]:
            cs = []
            for c in g["classes"]:
                rec = dict(c)
                if c.get("page"):
                    if c["page"] not in classes: raise ValueError(f"medication-taxonomy: class '{c['id']}' names unknown drug-class page '{c['page']}'")
                    rec["medications"] = sorted(class_members.get(c["page"], []), key=lambda i: meds[i]["name"].lower())
                cs.append(rec)
            groups.append({"id": g["id"], "name": g["name"], "classes": cs})
        area_meds = sorted([mid for mid, m in meds.items() if a["id"] in (m.get("categories") or [])], key=lambda i: meds[i]["name"].lower())
        areas.append({**a, "groups": groups, "medications": area_meds})
    facets = {"routes": collections.defaultdict(list), "dosageForms": collections.defaultdict(list), "productTypes": collections.defaultdict(list), "areas": collections.defaultdict(list)}
    for mid, m in meds.items():
        for r in m.get("routeIds") or []: facets["routes"][r].append(mid)
        for d in m.get("dosageFormIds") or []: facets["dosageForms"][d].append(mid)
        if m.get("productType"): facets["productTypes"][m["productType"]].append(mid)
        for c in m.get("categories") or []: facets["areas"][c].append(mid)
    unmapped_classes = [c["id"] for c in classes if not any(cc.get("page") == c for a in MED_TAX["areas"] for g in a["groups"] for cc in g["classes"])]
    return {"updated": updated, "atcGroups": vocab("atcGroups"), "areas": areas, "facets": {k: dict(v) for k, v in facets.items()},
            "vocabularies": {k: vocab(k) for k in ("routes", "dosageForms", "productTypes", "regulatoryStatuses")}, "classesOutsideTaxonomy": unmapped_classes}

# ----------------------------------------------------------------------------- knowledge-graph edges (§80, §81)
def build_edges(types, interactions, products):
    edges = []
    def add(t, frm, to, **extra): edges.append({"type": t, "from": frm, "to": to, **{k: v for k, v in extra.items() if v}})
    src_of = lambda s: (s or {}).get("url")
    for eid, e in types["tests"]["items"].items():
        me = f"tests/{eid}"; L = e.get("links") or {}; a = e.get("anatomy") or {}
        for b in L.get("biomarkers") or []: add("TEST_MEASURES", me, f"biomarkers/{b}")
        for s in e.get("specimens") or []: add("TEST_USES_SPECIMEN", me, f"vocab:specimens/{s}")
        for o in a.get("organs") or []: add("TEST_EVALUATES_STRUCTURE", me, f"anatomy/{o}")
        for s in a.get("structures") or []: add("TEST_EVALUATES_STRUCTURE", me, f"structures/{s}")
        for s in a.get("systems") or []: add("TEST_EVALUATES_SYSTEM", me, f"systems/{s}")
        for c in L.get("conditions") or []: add("TEST_HELPS_EVALUATE_CONDITION", me, f"conditions/{c}")
        for c in e.get("monitors") or []: add("TEST_MONITORS_CONDITION", me, f"conditions/{c}")
        for s in L.get("symptoms") or []: add("TEST_RELATED_TO_SYMPTOM", me, f"symptoms/{s}")
        for c in e.get("components") or []:
            if c.get("test"): add("TEST_HAS_COMPONENT", me, f"tests/{c['test']}")
        for p in e.get("panelOf") or []: add("TEST_PART_OF_PANEL", me, f"tests/{p}")
        prep = (e.get("preparation") or "").strip()
        if prep and not re.match(r"^(none|no |nothing|not needed|not required)", prep, re.I): add("TEST_REQUIRES_PREPARATION", me, "literal:preparation", value=prep)
        for m in e.get("methods") or []: add("TEST_HAS_METHOD", me, f"vocab:methods/{m}")
        for r in e.get("references") or []: add("TEST_HAS_REFERENCE", me, f"reference:{r['url']}", title=r.get("title"))
    for mid, m in types["medications"]["items"].items():
        me = f"medications/{mid}"; L = m.get("links") or {}; a = m.get("anatomy") or {}
        for t in (m.get("monitorsMedications") or []): pass
        for jur, bs in (m.get("brands") or {}).items():
            for b in bs or []: add("MEDICATION_HAS_BRAND", me, f"literal:brand/{b}", jurisdiction=jur)
        for c in L.get("drugClass") or []: add("MEDICATION_BELONGS_TO_CLASS", me, f"drug-classes/{c}")
        for r in m.get("routeIds") or []: add("MEDICATION_HAS_ROUTE", me, f"vocab:routes/{r}")
        for d in m.get("dosageFormIds") or []: add("MEDICATION_HAS_DOSAGE_FORM", me, f"vocab:dosageForms/{d}")
        for i in m.get("indications") or []:
            if i.get("condition") and i.get("status") in ("licensed", "guideline-supported"): add("MEDICATION_TREATS_CONDITION", me, f"conditions/{i['condition']}", status=i["status"], jurisdiction=i.get("jurisdiction"), source=src_of(i.get("source")))
        se = m.get("sideEffects") or {}
        for kind in ("common", "serious"):
            for s in se.get(kind) or []: add("MEDICATION_MAY_CAUSE_EFFECT", me, "literal:effect", value=s, frequency=kind, source=src_of(se.get("source")))
        for mp in m.get("monitoringPlan") or []:
            for t in mp.get("tests") or []: add("MEDICATION_REQUIRES_MONITORING_TEST", me, f"tests/{t}", source=src_of(mp.get("source")))
            for b in mp.get("biomarkers") or []: add("MEDICATION_REQUIRES_MONITORING_TEST", me, f"biomarkers/{b}", source=src_of(mp.get("source")))
        for o in a.get("organs") or []: add("MEDICATION_AFFECTS_STRUCTURE", me, f"anatomy/{o}")
        for s in a.get("structures") or []: add("MEDICATION_AFFECTS_STRUCTURE", me, f"structures/{s}")
        for s in a.get("systems") or []: add("MEDICATION_AFFECTS_SYSTEM", me, f"systems/{s}")
        for p in L.get("physiology") or []: add("MEDICATION_MODIFIES_PHYSIOLOGY", me, f"physiology/{p}")
        for c in m.get("contraindications") or []: add("MEDICATION_HAS_CONTRAINDICATION", me, "literal:contraindication", value=c.get("factor"), source=src_of(c.get("source")))
        pk = m.get("pharmacokinetics") or {}
        met = (pk.get("metabolism") or "").lower(); el = (pk.get("elimination") or "").lower()
        if re.search(r"\b(liver|hepatic)\b", met): add("MEDICATION_METABOLIZED_BY", me, "anatomy/liver", source=src_of(pk.get("source")))
        for cyp in sorted(set(re.findall(r"cyp\s?\d[a-z]\d*", met, re.I))): add("MEDICATION_METABOLIZED_BY", me, f"literal:enzyme/{cyp.upper().replace(' ', '')}", source=src_of(pk.get("source")))
        if re.search(r"\b(kidney|kidneys|renal|urine)\b", el): add("MEDICATION_EXCRETED_BY", me, "anatomy/kidneys", source=src_of(pk.get("source")))
        if re.search(r"\b(faeces|feces|bile|biliary|faecal|fecal)\b", el): add("MEDICATION_EXCRETED_BY", me, "anatomy/liver", source=src_of(pk.get("source")))
        for r in L.get("related") or []: add("MEDICATION_RELATED_TO_MEDICATION", me, f"medications/{r}")
    for r in interactions.get("records") or []:
        me = f"medications/{r['a']}"
        to = f"medications/{r['b']}" if r.get("b") else f"drug-classes/{r['bClass']}" if r.get("bClass") else f"literal:medicine/{r.get('bName')}"
        add("MEDICATION_INTERACTS_WITH_MEDICATION", me, to, record=r["id"], severity=r.get("severity"))
    for p in products:
        for ing in p.get("ingredients") or []:
            add("MEDICATION_HAS_INGREDIENT", f"products/{p['id']}", f"medications/{ing['id']}" if ing.get("id") else f"literal:ingredient/{ing.get('name')}")
    counts = collections.Counter(e["type"] for e in edges)
    described = {r["id"]: r for r in vocab("testRelationships") + vocab("medicationRelationships")}
    return {"edges": edges, "edgeTypes": [{"id": t, "count": counts.get(t, 0), **{k: described[t][k] for k in ("from", "to", "summary")}} for t in described]}

# ----------------------------------------------------------------------------- review queues (§94), provenance (§91)
def build_queues(types, interactions, concept_page, queues, text_size):
    for key, T in types.items():
        for eid, e in T["items"].items():
            where = f"{key}/{eid}"
            if len(e.get("references") or []) < 2: queues["needs_source"].append({"entity": where, "detail": f"{len(e.get('references') or [])} reference(s)"})
            st = (e.get("review") or {}).get("status")
            if st not in ("clinical-review", "approved", "published"): queues["needs_medical_review"].append({"entity": where, "detail": st})
            if e.get("seo", {}).get("index") and key in ("tests", "medications", "imaging", "biomarkers", "drug-classes") and (text_size(e) < 1200 or len(e.get("references") or []) < 2):
                queues["sparse_public_page"].append({"entity": where, "detail": f"{text_size(e)} characters, {len(e.get('references') or [])} reference(s)"})
            for t in (e.get("terminology") or {}).get("loinc") or []:
                if t.get("status") in ("DEPRECATED", "DISCOURAGED"): queues["deprecated_terminology"].append({"entity": where, "detail": f"LOINC {t['code']} is {t['status']}"})
            if key == "tests" and not e.get("thresholds"):
                texts = [m.get("meaning", "") for m in e.get("measures") or []] + [i.get("finding", "") + " " + i.get("meaning", "") for i in e.get("interpretation") or []]
                hit = next((t for t in texts if re.search(r"\b\d+(?:\.\d+)?\s*(?:-|–|to)\s*\d+(?:\.\d+)?\b|\b(?:below|above|over|under|less than|more than)\s+\d", t, re.I)), None)
                if hit: queues["test_reference_range_risk"].append({"entity": where, "detail": f"numeric cut-off in prose without a sourced threshold record: '{hit[:80]}'"})
    for r in interactions.get("records") or []:
        if r.get("review") == "needs-review": queues["interaction_data_conflict"].append({"entity": f"interactions/{r['id']}", "detail": "left at needs-review"})
    gaps = collections.defaultdict(list)
    for cid, c in CONCEPTS.items():
        if cid not in concept_page: gaps[c["categories"][0]].append(c["name"])
    for cat, names in sorted(gaps.items()): queues["coverage_gap"].append({"entity": f"tests/categories/{cat}", "detail": f"{len(names)} catalogued concepts without a page", "concepts": names})
    for a in MED_TAX["areas"]:
        missing = [c["name"] for g in a["groups"] for c in g["classes"] if not c.get("page")]
        if missing: queues["coverage_gap"].append({"entity": f"medications/classes/{a['id']}", "detail": f"{len(missing)} classes without a page", "concepts": missing})
    order = [q["id"] for q in vocab("reviewQueues")]
    return {"queues": {q: queues.get(q, []) for q in order}, "counts": {q: len(queues.get(q, [])) for q in order}, "descriptions": {q["id"]: q["summary"] for q in vocab("reviewQueues")}}

def provenance(e):
    rv = e.get("review") or {}
    p = dict(e.get("provenance") or {})
    p.setdefault("source_name", "Anatomy Nexus editorial content written from the references cited on the page")
    p.setdefault("last_verified_at", e.get("updated"))
    p.setdefault("imported_at", e.get("updated"))
    if rv.get("reviewedAt"): p.setdefault("medical_reviewed_at", rv["reviewedAt"])
    if rv.get("reviewer"): p.setdefault("medical_reviewer_id", rv["reviewer"].get("id") or rv["reviewer"].get("name"))
    for k in ("source_version", "source_release_date", "medical_reviewed_at", "medical_reviewer_id"): p.setdefault(k, None)
    return p

# ----------------------------------------------------------------------------- search entries for the taxonomy layer (§83)
def search_entries(test_categories, med_tax, concept_page):
    entries = []
    for c in test_categories["categories"]:
        entries.append(["test-category", c["id"], c["name"], "|".join(a.replace("-", " ") for a in c.get("urlAliases") or []), f"Test category · {c['counts']['pages']} pages, {c['counts']['concepts']} concepts"])
        for cc in c["concepts"]:
            if "page" in cc or cc["id"] in {x["id"] for x in c["concepts"] if False}: continue
            entries.append(["test-concept", f"{c['id']}:{cc['id']}", cc["name"], "|".join(cc["abbreviations"] + cc["synonyms"]), f"Catalogued test concept · {c['name']}"])
    seen = set()
    for a in med_tax["areas"]:
        entries.append(["medication-area", a["id"], a["name"], "", "Therapeutic area of the medication taxonomy"])
        for g in a["groups"]:
            for c in g["classes"]:
                if c.get("page") or c["id"] in seen: continue
                seen.add(c["id"]); entries.append(["class-concept", c["id"], c["name"], "|".join(c.get("examples") or []), f"Drug class (catalogued) · {a['name']}"])
    return entries

def page_aliases_from_catalogue(concept_page):
    """Synonyms and abbreviations of every catalogued concept a page covers, so search resolves them to the page."""
    extra = collections.defaultdict(list)
    for cid, pg in concept_page.items():
        c = CONCEPTS[cid]
        for n in [c["name"]] + c["abbreviations"] + c["synonyms"]: extra[(pg["type"], pg["id"])].append(n)
    return extra
