#!/usr/bin/env python3
"""build-content.py — compile the editable content sources in content/ against the atlas.

Reads   content/systems.json, organs.json, regions.json, structures.json, terms.json
        content/physiology.json, symptoms.json, conditions.json, tests.json, imaging.json,
                procedures.json, medications.json, first-aid.json, health.json
        data/hd/atlas.json (structure names, systems, bounding boxes)
Writes  data/content/atlas-content.json  (systems, organs with resolved pieces, regions with
                                          resolved pieces, structure descriptions keyed by
                                          structure id)
        data/content/terms.json          (medical terminology dictionary)
        data/content/knowledge.json      (every clinical/learning entity with validated links,
                                          resolved anatomy and computed backlinks: the graph)
        data/content/clinical.json       (compact organ/system/structure -> entity index for
                                          the 3D explorer)
        data/content/search-index.json   (one flat index over every entity for site search)

Every cross-reference is validated: an unknown id or structure name fails the build, so the
knowledge graph never has a dangling edge.

Organ 'match' rules: {"names": [...exact structure names...], "regex": "...", "systems": [...]}
Descriptions in structures.json are keyed by a side-stripped, lower-case base name so one
entry serves both the left and the right structure; pattern generators fill in families such
as vertebrae, ribs, phalanges, teeth and segmental vessels.
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, "content")
OUT = os.path.join(ROOT, "data", "content")

def load(name, default=None):
    p = os.path.join(C, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default

def base_name(name):
    n = name.lower()
    n = re.sub(r"\((right|left)\)", "", n)
    n = re.sub(r"\b(right|left)\b", "", n)
    n = re.sub(r"\s+", " ", n).strip()
    n = re.sub(r"^of ", "", n)
    return n

ORD = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10, "eleventh": 11, "twelfth": 12}
ORDS = {v: k for k, v in ORD.items()}

def generated(st):
    """Template descriptions for large regular families. Returns dict or None."""
    n = st["name"]; low = n.lower(); side = st.get("side")
    sidetxt = f" on the {side} side" if side else ""
    m = re.match(r"(\w+) (cervical|thoracic|lumbar) vertebra$", low)
    if m and m.group(1) in ORD:
        k, lvl = ORD[m.group(1)], m.group(2)
        code = {"cervical": "C", "thoracic": "T", "lumbar": "L"}[lvl] + str(k)
        extra = {"cervical": "Cervical vertebrae are small with a foramen in each transverse process for the vertebral artery.",
                 "thoracic": "Thoracic vertebrae carry facets for the ribs and have long, downward-sloping spinous processes.",
                 "lumbar": "Lumbar vertebrae are the largest, built to carry the weight of the upper body."}[lvl]
        return {"summary": f"{code}, the {m.group(1)} of the {'seven' if lvl == 'cervical' else 'twelve' if lvl == 'thoracic' else 'five'} {lvl} vertebrae. {extra}",
                "function": "Bears load, protects the spinal cord and provides attachment for muscles and ligaments; an intervertebral disc separates it from its neighbours."}
    m = re.match(r"intervertebral disk of (.+)$", low)
    if m:
        return {"summary": f"The fibrocartilage cushion below the {m.group(1)}: a tough outer annulus fibrosus around a gel-like nucleus pulposus.",
                "function": "Absorbs shock and allows small movements between vertebral bodies.", "clinical": "Disc herniation can press on a nerve root, causing pain that radiates along the limb."}
    m = re.match(r"(?:left |right )?(\w+) rib$", low)
    if m and m.group(1) in ORD:
        k = ORD[m.group(1)]
        kind = "a true rib, joined to the sternum by its own costal cartilage" if k <= 7 else "a false rib whose cartilage joins the cartilage above" if k <= 10 else "a floating rib with no anterior attachment"
        return {"summary": f"The {m.group(1)} rib{sidetxt}, {kind}. Ribs articulate with the thoracic vertebrae behind and curve round to protect the chest organs.",
                "function": "Protects the heart and lungs and moves with the intercostal muscles during breathing."}
    m = re.match(r"(?:left |right )?(\w+) costal cartilage$", low)
    if m:
        return {"summary": f"Hyaline cartilage joining the {m.group(1)} rib to the sternum{sidetxt}, giving the rib cage elasticity.", "function": "Lets the chest wall expand and recoil with each breath."}
    m = re.match(r"(distal|middle|proximal) phalanx of (?:left |right )?(.+?)( finger| toe|thumb)?$", low)
    if m:
        what = n.split(" of ")[-1]
        return {"summary": f"The {m.group(1)} phalanx of the {what}: one of the small long bones that form the digit.", "function": "Forms the digit's segment and receives the tendons that flex and extend it."}
    m = re.match(r"(?:left |right )?(\w+) (metacarpal|metatarsal) bone$", low)
    if m:
        where = "palm" if m.group(2) == "metacarpal" else "sole"
        return {"summary": f"The {m.group(1)} {m.group(2)}{sidetxt}: a long bone of the {where} between the {'carpal' if m.group(2)=='metacarpal' else 'tarsal'} bones and the phalanges.", "function": "Forms the framework of the " + ("hand" if m.group(2) == "metacarpal" else "foot") + " and transmits force to the digits."}
    m = re.match(r"(?:left |right )?(upper|lower) (.+?) secondary (.+?) tooth$", low)
    if m:
        kind = m.group(3)
        role = {"incisor": "cutting", "canine": "tearing", "premolar": "crushing", "molar": "grinding"}.get(kind, "chewing")
        return {"summary": f"A permanent {kind} of the {m.group(1)} jaw{sidetxt}, shaped for {role}.", "function": "Cuts and grinds food; the root is anchored in the jaw by the periodontal ligament."}
    if re.search(r"segmental bronchial tree$", low):
        return {"summary": f"{n}: the airway branch serving one bronchopulmonary segment, a self-contained wedge of lung with its own artery.", "function": "Conducts air to the alveoli of its segment; surgeons can remove a single segment along this boundary."}
    if re.search(r"hepatovenous segment", low):
        return {"summary": f"{n}: one of the eight functional segments of the liver (Couinaud classification), each with its own portal supply and biliary drainage.", "function": "Processes nutrient-rich portal blood, makes bile and detoxifies; segments can be resected independently."}
    if re.search(r"segmental (artery|vein)|lingular (artery|vein)", low) and st["system"] in ("arteries", "veins"):
        organ = "lung" if re.search(r"apical|basal|lingular|anterior segmental|posterior segmental|superior segmental|medial segmental|lateral segmental", low) else "organ"
        return {"summary": f"{n}: a {'branch' if st['system']=='arteries' else 'tributary'} serving one segment of the {organ}.", "function": ("Carries blood to" if st['system']=='arteries' else "Drains blood from") + " its segment."}
    if re.search(r"(proper|common) (palmar|plantar) digital (artery|vein)|dorsal digital|metacarpal (artery|vein)|metatarsal (artery|vein)", low):
        return {"summary": f"{n}: one of the small vessels running along the digits.", "function": ("Supplies" if st['system']=='arteries' else "Drains") + " the skin and tissues of the fingers or toes."}
    if re.search(r"part of (jejunum|ileum)$", low):
        which = "jejunum" if "jejunum" in low else "ileum"
        return {"summary": f"{n}: a length of the {which}, the {'second' if which=='jejunum' else 'last'} part of the small intestine, modelled as several coils.", "function": "Absorbs nutrients across a vast folded surface; the ileum also absorbs vitamin B12 and bile salts."}
    if re.search(r"gyrus$", low):
        return {"summary": f"{n}: a fold of the cerebral cortex bounded by sulci, part of the surface of the cerebral hemisphere.", "function": "Cortical grey matter processing sensation, movement, language or memory depending on its location."}
    if re.search(r"(branch|tributary) of .*(artery|vein)$", low):
        return {"summary": f"{n}: a {'branch' if st['system']=='arteries' else 'tributary'} of its parent vessel.", "function": ("Distributes blood to" if st['system']=='arteries' else "Collects blood from") + " the tissues along its course."}
    return None

# ----------------------------------------------------------------------------- knowledge graph
SAME = object()
TYPES = [
    # key, file, root key (None = whole file), section name, singular, dir, detail page
    ("physiology",  "physiology.json",  None,          "Physiology",    "Physiology topic", "physiology",  "topic.html"),
    ("symptoms",    "symptoms.json",    None,          "Symptoms",      "Symptom",          "symptoms",    "symptom.html"),
    ("conditions",  "conditions.json",  None,          "Conditions",    "Condition",        "conditions",  "condition.html"),
    ("tests",       "tests.json",       "tests",       "Medical tests", "Medical test",     "tests",       "test.html"),
    ("imaging",     "imaging.json",     "imaging",     "Imaging",       "Imaging study",    "imaging",     "study.html"),
    ("procedures",  "procedures.json",  "procedures",  "Procedures",    "Procedure",        "procedures",  "procedure.html"),
    ("medications", "medications.json", "medications", "Medications",   "Medication",       "medications", "medication.html"),
    ("first-aid",   "first-aid.json",   "topics",      "First aid",     "First aid topic",  "first-aid",   "topic.html"),
    ("health",      "health.json",      "topics",      "Health",        "Health topic",     "health",      "topic.html"),
]
LINK_FIELDS = {"conditions": "conditions", "symptoms": "symptoms", "associated": "symptoms", "tests": "tests", "imaging": "imaging",
               "procedures": "procedures", "medications": "medications", "physiology": "physiology", "terms": "terms",
               "firstAid": "first-aid", "health": "health", "related": SAME}
CONDITION_CATEGORIES = [("cardiovascular", "Heart & circulation"), ("respiratory", "Lungs & breathing"), ("neurological", "Brain & nerves"),
                        ("digestive", "Digestive system"), ("musculoskeletal", "Bones, joints & muscles"), ("endocrine", "Hormones & metabolism"),
                        ("urinary", "Kidneys & urinary tract"), ("other", "Blood, infection & other")]
SYMPTOM_REGIONS = [("head", "Head"), ("chest", "Chest"), ("abdomen", "Abdomen"), ("back", "Back & spine"), ("arms", "Arms & hands"), ("legs", "Legs & feet"), ("general", "Whole body")]

def compile_knowledge(atlas, out_organs, systems, terms):
    structs = atlas["structures"]; by_name = {s["name"]: s["id"] for s in structs}
    organ_ids = {o["id"] for o in out_organs}; system_ids = set(systems.keys()) | {s["id"] for s in atlas["systems"]}
    term_ids = {t["id"] for t in terms["terms"]}
    errors = []
    types = {}
    for key, fname, rootkey, name, singular, d, page in TYPES:
        raw = load(fname, None)
        if raw is None: errors.append(f"{fname} missing"); continue
        items = raw if rootkey is None else raw.get(rootkey, {})
        meta = {"name": name, "singular": singular, "dir": d, "page": page, "about": (raw.get("_about") if rootkey else None) or "", "categories": []}
        if rootkey and raw.get("categories"): meta["categories"] = raw["categories"]
        types[key] = {"meta": meta, "items": {k: dict(v) for k, v in items.items() if not k.startswith("_")}}
    ids = {k: set(v["items"].keys()) for k, v in types.items()}
    ids["terms"] = term_ids

    # per-type categories that are derived rather than declared
    for cid, cname in CONDITION_CATEGORIES: types["conditions"]["meta"]["categories"].append({"id": cid, "name": cname})
    for rid, rname in SYMPTOM_REGIONS: types["symptoms"]["meta"]["categories"].append({"id": rid, "name": rname})
    types["first-aid"]["meta"]["categories"] = [{"id": "emergency", "name": "Call emergency services"}, {"id": "care", "name": "Injuries & everyday care"}]
    types["imaging"]["meta"]["categories"] = [{"id": "none", "name": "No radiation"}, {"id": "low", "name": "Low dose"}, {"id": "moderate", "name": "Moderate dose"}]
    sys_order = [s["id"] for s in atlas["systems"]]
    types["physiology"]["meta"]["categories"] = [{"id": sid, "name": systems.get(sid, {}).get("name") or next(s["name"] for s in atlas["systems"] if s["id"] == sid)} for sid in sys_order]
    types["health"]["meta"]["categories"] = [{"id": "lifestyle", "name": "Lifestyle"}]

    back = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(set)))   # back[type][id][srcType]
    def note(target_type, target_id, src_type, src_id):
        back[target_type][target_id][src_type].add(src_id)

    for key, T in types.items():
        for eid, e in T["items"].items():
            e["id"] = eid; e["type"] = key
            # ---- anatomy normalisation
            a = e.pop("anatomy", None) or e.pop("affects", None) or {}
            if key == "physiology": a = {"organs": e.pop("organs", []), "systems": e.pop("systems", []), "structures": e.pop("structures", [])}
            organs = list(dict.fromkeys(a.get("organs", []))); syss = list(dict.fromkeys(a.get("systems", []))); snames = a.get("structures", [])
            sids = []
            for n in snames:
                if n in by_name: sids.append(by_name[n])
                else: errors.append(f"{key}/{eid}: unknown structure name '{n}'")
            for o in organs:
                if o not in organ_ids: errors.append(f"{key}/{eid}: unknown organ '{o}'")
            for sy in syss:
                if sy not in system_ids: errors.append(f"{key}/{eid}: unknown system '{sy}'")
            e["anatomy"] = {"organs": organs, "systems": syss, "structures": sids}
            for o in organs: note("organs", o, key, eid)
            for sy in syss: note("systems", sy, key, eid)
            for sid in sids: note("structures", sid, key, eid)
            # ---- categories
            if key == "conditions": e["category"] = e.get("category", "other")
            elif key == "symptoms": e["category"] = e.get("region", "general")
            elif key == "first-aid": e["category"] = "emergency" if e.get("emergency") else "care"
            elif key == "imaging": e["category"] = e.get("radiation", "none")
            elif key == "physiology": e["category"] = (syss[0] if syss else "")
            elif key == "health": e["category"] = "lifestyle"
            if "category" in e and e["category"] and e["category"] not in {c["id"] for c in T["meta"]["categories"]}:
                errors.append(f"{key}/{eid}: unknown category '{e['category']}'")
            # ---- typed links
            links = collections.defaultdict(list)
            field_of = {v: k for k, v in LINK_FIELDS.items() if v is not SAME and k != "associated"}   # target type -> link field
            for field, target in LINK_FIELDS.items():
                vals = e.get(field)
                if not vals: continue
                for v in vals:
                    tt = key if target is SAME else target
                    if v not in ids.get(tt, set()) and target is SAME:
                        # 'related' may point across types; route it into the matching typed field
                        hits = [t for t, s in ids.items() if v in s]
                        if len(hits) == 1: tt = hits[0]; field2 = field_of[tt]
                        else: errors.append(f"{key}/{eid}.related: unknown id '{v}'"); continue
                    else: field2 = field
                    if v in ids.get(tt, set()):
                        if v not in links[field2]: links[field2].append(v)
                        if tt != key or field2 == "related": note(tt, v, key, eid)
                    else: errors.append(f"{key}/{eid}.{field}: unknown {tt} id '{v}'")
            e["links"] = dict(links)
            # ---- references must be plain https links (they are rendered as outbound anchors)
            for r in e.get("references", []) or []:
                if not isinstance(r, dict) or not re.match(r"^https://[^\s\"'<>]+$", str(r.get("url", ""))) or not r.get("title"):
                    errors.append(f"{key}/{eid}: reference must have a title and an https:// url: {r!r}")
    # ---- attach backlinks (reverse edges) to every entity
    for key, T in types.items():
        for eid, e in T["items"].items():
            bl = back[key].get(eid, {})
            e["backlinks"] = {t: sorted(v) for t, v in sorted(bl.items())}
    anatomy = {kind: {tid: {t: sorted(v) for t, v in sorted(m.items())} for tid, m in sorted(back[kind].items())} for kind in ("organs", "systems", "structures")}
    termlinks = {tid: {t: sorted(v) for t, v in sorted(m.items())} for tid, m in sorted(back["terms"].items())}
    # ---- term atlas links must resolve
    for t in terms["terms"]:
        a = t.get("atlas") or {}
        if a.get("structure") and a["structure"] not in by_name: errors.append(f"terms/{t['id']}: unknown structure '{a['structure']}'")
        if a.get("organ") and a["organ"] not in organ_ids: errors.append(f"terms/{t['id']}: unknown organ '{a['organ']}'")
        for r in t.get("related", []) + ([t["opposite"]] if t.get("opposite") else []):
            if r not in term_ids: errors.append(f"terms/{t['id']}: unknown related term '{r}'")
    if errors:
        print("KNOWLEDGE LINK ERRORS:", file=sys.stderr)
        for e in errors: print("  " + e, file=sys.stderr)
        sys.exit(1)
    counts = {k: len(v["items"]) for k, v in types.items()}
    edges = sum(len(v) for T in types.values() for e in T["items"].values() for v in e["links"].values())
    print("knowledge:", ", ".join(f"{k} {n}" for k, n in counts.items()), f"· {edges} typed links · anatomy backlinks: {len(anatomy['organs'])} organs, {len(anatomy['systems'])} systems, {len(anatomy['structures'])} structures")
    return {"types": types, "anatomy": anatomy, "terms": termlinks}

def build_search_index(atlas, out_organs, out_regions, terms, know):
    entries = []
    sysname = {s["id"]: s["name"] for s in atlas["systems"]}
    for s in atlas["systems"]: entries.append(["system", s["id"], s["name"], "", f"{s['count']} pieces"])
    for o in out_organs: entries.append(["organ", o["id"], o["name"], "|".join(o.get("aliases", [])), f"{len(o['structures'])} structures · {sysname.get(o['system'], '')}"])
    for r in out_regions: entries.append(["region", r["id"], r["name"], "", f"{len(r['structures'])} structures"])
    for s in atlas["structures"]: entries.append(["structure", s["id"], s["name"], "", sysname.get(s["system"], s["system"])])
    catname = {c["id"]: c["name"] for c in terms.get("categories", [])}
    for t in terms["terms"]: entries.append(["term", t["id"], t["term"], "", catname.get(t["category"], "Term")])
    for key, T in know["types"].items():
        for eid, e in T["items"].items():
            entries.append([key, eid, e["name"], "|".join(e.get("aliases", [])), (e.get("summary") or e.get("what") or e.get("definition") or "")[:110]])
    return {"entries": entries}

def build_clinical(atlas, know):
    """Compact index for the explorer: names of every entity plus organ/system/structure -> entity ids."""
    names = {key: {eid: e["name"] for eid, e in T["items"].items()} for key, T in know["types"].items()}
    types = {key: {"name": T["meta"]["name"], "singular": T["meta"]["singular"], "dir": T["meta"]["dir"], "page": T["meta"]["page"]} for key, T in know["types"].items()}
    return {"types": types, "names": names, "terms": know["terms"], **know["anatomy"]}

def main():
    atlas = json.load(open(os.path.join(ROOT, "data", "hd", "atlas.json"), encoding="utf-8"))
    systems = load("systems.json", {})
    organs = load("organs.json", [])
    regions = load("regions.json", {"regions": []})["regions"]
    descs = load("structures.json", {})
    terms = load("terms.json", {"terms": []})

    structs = atlas["structures"]; pieces = atlas["pieces"]
    by_name = {s["name"]: i for i, s in enumerate(structs)}

    # ---- organs → structure indices
    out_organs = []
    for o in organs:
        m = o["match"]; hit = set()
        for nm in m.get("names", []):
            if nm in by_name: hit.add(by_name[nm])
            else: print(f"  organ {o['id']}: name not found: {nm}", file=sys.stderr)
        rx = re.compile(m["regex"], re.I) if m.get("regex") else None
        for i, s in enumerate(structs):
            if m.get("systems") and s["system"] not in m["systems"]: continue
            if rx is None and not m.get("names"): hit.add(i)            # systems-only rule: whole system
            elif rx and rx.search(s["name"]): hit.add(i)
        if m.get("exclude"):
            ex = re.compile(m["exclude"], re.I); hit = {i for i in hit if not ex.search(structs[i]["name"])}
        if not hit: print(f"  organ {o['id']}: NO MATCHES", file=sys.stderr)
        out_organs.append({"id": o["id"], "name": o["name"], "system": o["system"], "region": o.get("region"), "summary": o["summary"], "aliases": o.get("aliases", []),
                           "structures": sorted(hit, key=lambda i: structs[i]["name"])})

    # ---- regions → structure indices by bbox intersection
    def intersects(b, r):
        y0, y1 = r["y"]; x0, x1 = r["x"]
        if b[4] < y0 or b[1] > y1: return False
        if r.get("mirror"):
            return (b[3] >= x0 and b[0] <= x1) or (b[3] >= -x1 and b[0] <= -x0)
        return b[3] >= x0 and b[0] <= x1
    out_regions = []
    struct_regions = collections.defaultdict(list)
    for r in regions:
        hit = []
        for i, s in enumerate(structs):
            bs = [pieces[p]["bbox"] for p in s["pieces"] if pieces[p].get("bbox")]
            if not bs: continue
            b = [min(x[0] for x in bs), min(x[1] for x in bs), min(x[2] for x in bs), max(x[3] for x in bs), max(x[4] for x in bs), max(x[5] for x in bs)]
            if intersects(b, r): hit.append(i); struct_regions[i].append(r["id"])
        out_regions.append({"id": r["id"], "name": r["name"], "summary": r.get("summary", ""), "structures": hit})

    # ---- structure descriptions
    organ_of = {}
    for o in out_organs:
        for i in o["structures"]: organ_of.setdefault(i, o["id"])
    out_structs = {}
    n_hand = n_gen = 0
    for i, s in enumerate(structs):
        key = base_name(s["name"])
        entry = descs.get(key) or descs.get(s["name"].lower()) or descs.get(s["concept"])
        if not entry:
            # muscle heads/parts and tendons inherit the parent muscle's entry
            stripped = re.sub(r"^(?:[a-z\-]+(?: [a-z\-]+)? (?:head|part) of |tendon of |trunk of |wall of |cavity of )", "", key)
            if stripped != key and descs.get(stripped):
                entry = dict(descs[stripped]); entry["summary"] = f"{s['name']} is part of the {stripped}. " + entry["summary"]
        if entry: n_hand += 1
        else:
            entry = generated(s)
            if entry: n_gen += 1
        rec = {}
        if entry: rec.update(entry)
        if i in organ_of: rec["organ"] = organ_of[i]
        if struct_regions.get(i): rec["regions"] = struct_regions[i]
        if rec: out_structs[s["id"]] = rec
    print(f"structures: {len(structs)}  hand-written: {n_hand}  generated: {n_gen}  with organ: {len(organ_of)}")
    used_keys = set()
    for s in structs:
        k = base_name(s['name']); used_keys.add(k)
        used_keys.add(re.sub(r"^(?:[a-z\-]+(?: [a-z\-]+)? (?:head|part) of |tendon of |trunk of |wall of |cavity of )", "", k))
        used_keys.add(s['name'].lower()); used_keys.add(s['concept'])
    unused = [k for k in descs if k not in used_keys]
    if unused: print(f"  unused description keys ({len(unused)}): {unused[:20]}", file=sys.stderr)

    know = compile_knowledge(atlas, out_organs, systems, terms)
    search_index = build_search_index(atlas, out_organs, out_regions, terms, know)
    clinical = build_clinical(atlas, know)

    os.makedirs(OUT, exist_ok=True)
    compiled = {"systems": systems, "organs": out_organs, "regions": out_regions, "structures": out_structs}
    json.dump(compiled, open(os.path.join(OUT, "atlas-content.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    json.dump(terms, open(os.path.join(OUT, "terms.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    for fname, obj in (("knowledge.json", know), ("clinical.json", clinical), ("search-index.json", search_index)):
        json.dump(obj, open(os.path.join(OUT, fname), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
        print("wrote", os.path.join(OUT, fname), os.path.getsize(os.path.join(OUT, fname)), "bytes")
    # one file per entity type so a page loads only the section it needs (plus the small clinical.json name index)
    os.makedirs(os.path.join(OUT, "types"), exist_ok=True)
    for key, T in know["types"].items():
        json.dump(T, open(os.path.join(OUT, "types", key + ".json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    print("wrote", len(know["types"]), "type files to", os.path.join(OUT, "types"))
    for o in out_organs: print(f"  organ {o['id']:16s} {len(o['structures']):4d} structures")
    for r in out_regions: print(f"  region {r['id']:14s} {len(r['structures']):4d} structures")
    print("wrote", os.path.join(OUT, "atlas-content.json"), os.path.getsize(os.path.join(OUT, "atlas-content.json")), "bytes")

if __name__ == "__main__":
    main()
