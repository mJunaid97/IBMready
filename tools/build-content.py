#!/usr/bin/env python3
"""build-content.py — compile the editable content sources in content/ against the atlas.

Reads   content/systems.json, organs.json, anatomy.json, regions.json, structures.json, terms.json, site.json
        content/physiology.json, symptoms.json, conditions.json, tests.json, imaging.json,
                procedures.json, medications.json, drug-classes.json, first-aid.json, health.json
        data/hd/atlas.json (structure names, systems, bounding boxes)
Writes  data/content/atlas-content.json  (systems, organs with resolved pieces and anatomy articles,
                                          regions with resolved pieces, structure descriptions)
        data/content/terms.json          (medical terminology dictionary)
        data/content/knowledge.json      (every clinical/learning entity with validated links,
                                          resolved anatomy and computed backlinks: the graph)
        data/content/clinical.json       (compact organ/system/structure -> entity index for
                                          the 3D explorer)
        data/content/search-index.json   (one flat index over every entity for site search)
        data/content/aliases.json        (URL alias -> canonical slug, per section: the 301 table)
        data/content/types/<type>.json   (one file per entity type)
        site/site-meta.js                (site identity for the page shell, from content/site.json)

Every cross-reference is validated: an unknown id, structure name or URL alias fails the build,
so the knowledge graph never has a dangling edge and no two pages can claim the same URL.

Each content file carries `_updated` (the date its visible content last changed substantially;
edit it by hand when you change content) and `_priority` (the "start here" entities of its hub).
References are enriched with their source name and evidence tier from a host table, and every
entity gets an indexability verdict (`seo.index`) from a quality gate: a page without a lead
paragraph, references or relationships is published noindex until it is complete.

Organ 'match' rules: {"names": [...exact structure names...], "regex": "...", "systems": [...]}
Descriptions in structures.json are keyed by a side-stripped, lower-case base name so one
entry serves both the left and the right structure; pattern generators fill in families such
as vertebrae, ribs, phalanges, teeth and segmental vessels.
"""
import json, os, re, sys, collections
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, "content")
OUT = os.path.join(ROOT, "data", "content")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

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
    ("physiology",   "physiology.json",   None,          "Physiology",    "Physiology topic", "physiology",   "topic.html"),
    ("symptoms",     "symptoms.json",     None,          "Symptoms",      "Symptom",          "symptoms",     "symptom.html"),
    ("conditions",   "conditions.json",   None,          "Conditions",    "Condition",        "conditions",   "condition.html"),
    ("tests",        "tests.json",        "tests",       "Medical tests", "Medical test",     "tests",        "test.html"),
    ("imaging",      "imaging.json",      "imaging",     "Imaging",       "Imaging study",    "imaging",      "study.html"),
    ("procedures",   "procedures.json",   "procedures",  "Procedures",    "Procedure",        "procedures",   "procedure.html"),
    ("medications",  "medications.json",  "medications", "Medications",   "Medication",       "medications",  "medication.html"),
    ("drug-classes", "drug-classes.json", "classes",     "Drug classes",  "Drug class",       "drug-classes", "class.html"),
    ("first-aid",    "first-aid.json",    "topics",      "First aid",     "First aid topic",  "first-aid",    "topic.html"),
    ("health",       "health.json",       "topics",      "Health",        "Health topic",     "health",       "topic.html"),
]
# link field on an entity -> the type it points at. `drugClass` is a single id on a medication; everything else is a list.
LINK_FIELDS = {"conditions": "conditions", "symptoms": "symptoms", "associated": "symptoms", "tests": "tests", "imaging": "imaging",
               "procedures": "procedures", "medications": "medications", "drugClass": "drug-classes", "physiology": "physiology", "terms": "terms",
               "firstAid": "first-aid", "health": "health", "related": SAME}
CONDITION_CATEGORIES = [("cardiovascular", "Heart & circulation"), ("respiratory", "Lungs & breathing"), ("neurological", "Brain & nerves"),
                        ("digestive", "Digestive system"), ("musculoskeletal", "Bones, joints & muscles"), ("endocrine", "Hormones & metabolism"),
                        ("urinary", "Kidneys & urinary tract"), ("other", "Blood, infection & other")]
SYMPTOM_REGIONS = [("head", "Head"), ("chest", "Chest"), ("abdomen", "Abdomen"), ("back", "Back & spine"), ("arms", "Arms & hands"), ("legs", "Legs & feet"), ("general", "Whole body")]
LEAD_FIELDS = ("summary", "what", "definition", "overview", "intro")

# ---- reference sources: host (exact, then suffix) -> (publisher, evidence tier). Tier 1 official health bodies, guideline
# groups and professional societies; tier 2 textbooks, journals and academic medical centres; tier 3 charities and other
# high-quality secondary resources. An unknown host is a build warning so new sources are classified deliberately.
SOURCES = {
    "nhs.uk": ("NHS", 1), "england.nhs.uk": ("NHS England", 1), "nhsinform.scot": ("NHS inform", 1), "gov.uk": ("UK Government", 1),
    "who.int": ("World Health Organization", 1), "nice.org.uk": ("NICE", 1), "cdc.gov": ("CDC", 1), "fda.gov": ("FDA", 1),
    "nih.gov": ("NIH", 1), "niddk.nih.gov": ("NIDDK (NIH)", 1), "nhlbi.nih.gov": ("NHLBI (NIH)", 1), "niams.nih.gov": ("NIAMS (NIH)", 1),
    "ninds.nih.gov": ("NINDS (NIH)", 1), "niaid.nih.gov": ("NIAID (NIH)", 1), "nlm.nih.gov": ("National Library of Medicine", 1),
    "medlineplus.gov": ("MedlinePlus (NIH)", 1), "dailymed.nlm.nih.gov": ("DailyMed (NLM)", 1),
    "resus.org.uk": ("Resuscitation Council UK", 1), "heart.org": ("American Heart Association", 1), "world-stroke.org": ("World Stroke Organization", 1),
    "ginasthma.org": ("Global Initiative for Asthma", 1), "britishburnassociation.org": ("British Burn Association", 1),
    "yourhormones.info": ("Society for Endocrinology", 1), "escardio.org": ("European Society of Cardiology", 1), "diabetes.org": ("American Diabetes Association", 1),
    "openstax.org": ("OpenStax, Rice University", 2), "mayoclinic.org": ("Mayo Clinic", 2), "clevelandclinic.org": ("Cleveland Clinic", 2),
    "hopkinsmedicine.org": ("Johns Hopkins Medicine", 2), "bmj.com": ("BMJ", 2), "thelancet.com": ("The Lancet", 2), "nejm.org": ("NEJM", 2), "ncbi.nlm.nih.gov": ("NCBI Bookshelf / PubMed", 2),
    "bhf.org.uk": ("British Heart Foundation", 3), "sja.org.uk": ("St John Ambulance", 3), "asthmaandlung.org.uk": ("Asthma + Lung UK", 3),
    "britishlivertrust.org.uk": ("British Liver Trust", 3), "stroke.org.uk": ("Stroke Association", 3), "epilepsy.org.uk": ("Epilepsy Action", 3),
}
TIER_LABEL = {1: "Official health body, guideline or professional society", 2: "Textbook, journal or academic medical centre", 3: "Charity or other secondary resource"}
_unknown_hosts = set()

def source_of(url):
    host = urlsplit(url).hostname or ""
    host = host[4:] if host.startswith("www.") else host
    parts = host.split(".")
    for i in range(len(parts)):
        cand = ".".join(parts[i:])
        if cand in SOURCES: return SOURCES[cand]
    _unknown_hosts.add(host)
    return (host, 3)

def enrich_references(refs, accessed, where, errors):
    out = []
    for r in refs or []:
        if not isinstance(r, dict) or not re.match(r"^https://[^\s\"'<>]+$", str(r.get("url", ""))) or not r.get("title"):
            errors.append(f"{where}: reference must have a title and an https:// url: {r!r}"); continue
        name, tier = source_of(r["url"])
        out.append({"title": r["title"], "url": r["url"], "source": r.get("source") or name, "tier": r.get("tier") or tier, "accessed": r.get("accessed") or accessed})
    return out

def lead_of(e):
    for f in LEAD_FIELDS:
        if e.get(f): return e[f]
    return ""

def text_size(e):
    """Rough amount of visible prose (characters) in an entity, ignoring link and metadata fields."""
    skip = set(LINK_FIELDS) | {"id", "type", "name", "aliases", "urlAliases", "anatomy", "links", "backlinks", "references", "category", "region", "seo", "updated", "members", "class"}
    def walk(v):
        if isinstance(v, str): return len(v)
        if isinstance(v, list): return sum(walk(x) for x in v)
        if isinstance(v, dict): return sum(walk(x) for k, x in v.items())
        return 0
    return sum(walk(v) for k, v in e.items() if k not in skip)

def quality_gate(e):
    """Indexability: a page must have a lead, real body text, at least one source and be connected to the graph."""
    reasons = []
    if not lead_of(e): reasons.append("no lead paragraph")
    if text_size(e) < 600: reasons.append("body text under 600 characters")
    if len(e.get("references") or []) < 1: reasons.append("no references")
    groups = sum(1 for v in (e.get("links") or {}).values() if v) + sum(1 for v in (e.get("backlinks") or {}).values() if v)
    if groups < 2: reasons.append("fewer than two relationship groups")
    return reasons

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
        meta = {"name": name, "singular": singular, "dir": d, "page": page, "about": raw.get("_about") or "", "updated": raw.get("_updated") or "",
                "priority": raw.get("_priority") or [], "categories": []}
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", meta["updated"]): errors.append(f"{fname}: _updated must be a YYYY-MM-DD date")
        if rootkey and raw.get("categories"): meta["categories"] = raw["categories"]
        types[key] = {"meta": meta, "items": {k: dict(v) for k, v in items.items() if not k.startswith("_")}}
        for pid in meta["priority"]:
            if pid not in types[key]["items"]: errors.append(f"{fname}: _priority names unknown id '{pid}'")
    ids = {k: set(v["items"].keys()) for k, v in types.items()}
    ids["terms"] = term_ids

    # per-type categories that are derived rather than declared
    for cid, cname in CONDITION_CATEGORIES: types["conditions"]["meta"]["categories"].append({"id": cid, "name": cname})
    for rid, rname in SYMPTOM_REGIONS: types["symptoms"]["meta"]["categories"].append({"id": rid, "name": rname})
    types["first-aid"]["meta"]["categories"] = [{"id": "emergency", "name": "Call emergency services"}, {"id": "care", "name": "Injuries & everyday care"}]
    types["imaging"]["meta"]["categories"] = [{"id": "none", "name": "No radiation"}, {"id": "low", "name": "Low dose"}, {"id": "moderate", "name": "Moderate dose"}]
    sys_order = [s["id"] for s in atlas["systems"]]
    sys_cats = [{"id": sid, "name": systems.get(sid, {}).get("name") or next(s["name"] for s in atlas["systems"] if s["id"] == sid)} for sid in sys_order]
    types["physiology"]["meta"]["categories"] = list(sys_cats)
    types["drug-classes"]["meta"]["categories"] = list(sys_cats)
    types["health"]["meta"]["categories"] = [{"id": "lifestyle", "name": "Lifestyle"}]

    back = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(set)))   # back[type][id][srcType]
    def note(target_type, target_id, src_type, src_id):
        back[target_type][target_id][src_type].add(src_id)

    # ---- URL aliases: unique within a section, slug-shaped, never equal to a real id
    aliases = {}
    def register_aliases(section, eid, alist, real_ids):
        table = aliases.setdefault(section, {})
        for a in alist or []:
            if not SLUG.match(a): errors.append(f"{section}/{eid}: urlAlias '{a}' is not a lowercase hyphenated slug"); continue
            if a in real_ids: errors.append(f"{section}/{eid}: urlAlias '{a}' is already a page id in this section"); continue
            if a in table and table[a] != eid: errors.append(f"{section}/{eid}: urlAlias '{a}' already points to '{table[a]}'"); continue
            table[a] = eid
    for o in out_organs: register_aliases("anatomy", o["id"], o.get("urlAliases"), organ_ids)

    for key, T in types.items():
        for eid, e in T["items"].items():
            if not SLUG.match(eid): errors.append(f"{key}/{eid}: id is not a lowercase hyphenated slug")
            e["id"] = eid; e["type"] = key
            e["updated"] = e.get("updated") or T["meta"]["updated"]
            register_aliases(key, eid, e.get("urlAliases"), ids[key])
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
            elif key in ("physiology", "drug-classes"): e["category"] = (syss[0] if syss else "")
            elif key == "health": e["category"] = "lifestyle"
            if "category" in e and e["category"] and e["category"] not in {c["id"] for c in T["meta"]["categories"]}:
                errors.append(f"{key}/{eid}: unknown category '{e['category']}'")
            # ---- typed links
            links = collections.defaultdict(list)
            field_of = {v: k for k, v in LINK_FIELDS.items() if v is not SAME and k != "associated"}   # target type -> link field
            for field, target in LINK_FIELDS.items():
                vals = e.get(field)
                if not vals: continue
                if isinstance(vals, str): vals = [vals]
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
            # ---- references: plain https links (rendered as outbound anchors), with publisher and evidence tier
            e["references"] = enrich_references(e.get("references"), e["updated"], f"{key}/{eid}", errors)
    # ---- attach backlinks (reverse edges) and the indexability verdict to every entity
    noindex = []
    for key, T in types.items():
        for eid, e in T["items"].items():
            bl = back[key].get(eid, {})
            e["backlinks"] = {t: sorted(v) for t, v in sorted(bl.items())}
            reasons = quality_gate(e)
            e["seo"] = {"index": not reasons, "reasons": reasons}
            if reasons: noindex.append(f"{key}/{eid}: " + "; ".join(reasons))
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
    if _unknown_hosts: print(f"  note: reference hosts not in the source table (filed as tier 3): {sorted(_unknown_hosts)}", file=sys.stderr)
    if noindex:
        print(f"  {len(noindex)} entity page(s) fail the quality gate and are published noindex:", file=sys.stderr)
        for n in noindex: print("    " + n, file=sys.stderr)
    counts = {k: len(v["items"]) for k, v in types.items()}
    edges = sum(len(v) for T in types.values() for e in T["items"].values() for v in e["links"].values())
    refs = sum(len(e["references"]) for T in types.values() for e in T["items"].values())
    n_alias = sum(len(v) for v in aliases.values())
    print("knowledge:", ", ".join(f"{k} {n}" for k, n in counts.items()), f"· {edges} typed links · {refs} references · {n_alias} URL aliases · anatomy backlinks: {len(anatomy['organs'])} organs, {len(anatomy['systems'])} systems, {len(anatomy['structures'])} structures")
    return {"types": types, "anatomy": anatomy, "terms": termlinks, "aliases": aliases}

def build_search_index(atlas, out_organs, out_regions, terms, know):
    entries = []
    sysname = {s["id"]: s["name"] for s in atlas["systems"]}
    unslug = lambda al: [a.replace("-", " ") for a in al or []]
    for s in atlas["systems"]: entries.append(["system", s["id"], s["name"], "", f"{s['count']} pieces"])
    for o in out_organs: entries.append(["organ", o["id"], o["name"], "|".join(o.get("aliases", []) + unslug(o.get("urlAliases"))), f"{len(o['structures'])} structures · {sysname.get(o['system'], '')}"])
    for r in out_regions: entries.append(["region", r["id"], r["name"], "", f"{len(r['structures'])} structures"])
    for s in atlas["structures"]: entries.append(["structure", s["id"], s["name"], "", sysname.get(s["system"], s["system"])])
    catname = {c["id"]: c["name"] for c in terms.get("categories", [])}
    for t in terms["terms"]: entries.append(["term", t["id"], t["term"], "", catname.get(t["category"], "Term")])
    for key, T in know["types"].items():
        for eid, e in T["items"].items():
            entries.append([key, eid, e["name"], "|".join(list(dict.fromkeys(e.get("aliases", []) + unslug(e.get("urlAliases"))))), (lead_of(e) or "")[:110]])
    return {"entries": entries}

def build_clinical(atlas, know):
    """Compact index for the explorer: names of every entity plus organ/system/structure -> entity ids."""
    names = {key: {eid: e["name"] for eid, e in T["items"].items()} for key, T in know["types"].items()}
    types = {key: {"name": T["meta"]["name"], "singular": T["meta"]["singular"], "dir": T["meta"]["dir"], "page": T["meta"]["page"]} for key, T in know["types"].items()}
    return {"types": types, "names": names, "terms": know["terms"], **know["anatomy"]}

def write_site_meta(site, counts, atlas):
    """site/site-meta.js: the site identity the page shell needs synchronously (brand, URL, editorial fields)."""
    meta = {k: v for k, v in site.items() if not k.startswith("_")}
    meta["updated"] = site.get("_updated", "")
    meta["counts"] = counts
    p = os.path.join(ROOT, "site", "site-meta.js")
    body = json.dumps(meta, indent=2, ensure_ascii=False)
    open(p, "w", encoding="utf-8").write("// generated by tools/build-content.py from content/site.json — do not edit by hand\nexport const SITE = " + body + ";\n")
    print("wrote", p)

def main():
    atlas = json.load(open(os.path.join(ROOT, "data", "hd", "atlas.json"), encoding="utf-8"))
    systems_raw = load("systems.json", {})
    systems = {k: v for k, v in systems_raw.items() if not k.startswith("_")}
    for sid, s in systems.items(): s["updated"] = s.get("updated") or systems_raw.get("_updated", "")
    organs_raw = load("organs.json", [])
    organs = organs_raw["organs"] if isinstance(organs_raw, dict) else organs_raw
    organs_updated = organs_raw.get("_updated", "") if isinstance(organs_raw, dict) else ""
    articles_raw = load("anatomy.json", {})
    articles = {k: v for k, v in articles_raw.items() if not k.startswith("_")}
    articles_updated = articles_raw.get("_updated", organs_updated)
    regions = load("regions.json", {"regions": []})["regions"]
    descs = load("structures.json", {})
    terms_raw = load("terms.json", {"terms": []})
    terms = {k: v for k, v in terms_raw.items() if not k.startswith("_")}; terms["updated"] = terms_raw.get("_updated", "")
    site = load("site.json", {"name": "Anatomy Nexus"})

    structs = atlas["structures"]; pieces = atlas["pieces"]
    by_name = {s["name"]: i for i, s in enumerate(structs)}
    errors = []

    # ---- organs → structure indices, plus the anatomy article when one is written
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
        rec = {"id": o["id"], "name": o["name"], "system": o["system"], "region": o.get("region"), "summary": o["summary"], "aliases": o.get("aliases", []),
               "urlAliases": o.get("urlAliases", []), "updated": o.get("updated") or organs_updated, "structures": sorted(hit, key=lambda i: structs[i]["name"])}
        art = articles.get(o["id"])
        if art:
            sids = []
            for nm in art.get("structures", []):
                if nm in by_name: sids.append(structs[by_name[nm]]["id"])
                else: errors.append(f"anatomy/{o['id']}: unknown structure name '{nm}'")
            for k in ("title", "descriptor", "intro"):
                if not art.get(k): errors.append(f"anatomy/{o['id']}: article needs '{k}'")
            if len(art.get("sections") or []) < 3: errors.append(f"anatomy/{o['id']}: article needs at least three sections")
            rec["article"] = {"title": art["title"], "descriptor": art.get("descriptor", ""), "intro": art.get("intro", ""), "keyFacts": art.get("keyFacts", []),
                              "sections": art.get("sections", []), "structures": sids,
                              "references": enrich_references(art.get("references"), art.get("updated") or articles_updated, f"anatomy/{o['id']}", errors)}
            rec["updated"] = art.get("updated") or articles_updated
            if len(rec["article"]["references"]) < 2: errors.append(f"anatomy/{o['id']}: an anatomy article needs at least two references")
        rec["index"] = bool(art)
        out_organs.append(rec)
    for oid in articles:
        if oid not in {o["id"] for o in out_organs}: errors.append(f"anatomy/{oid}: no such organ in organs.json")
    if errors:
        print("ANATOMY ERRORS:", file=sys.stderr)
        for e in errors: print("  " + e, file=sys.stderr)
        sys.exit(1)

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
    compiled = {"systems": systems, "organs": out_organs, "regions": out_regions, "structures": out_structs, "anatomyUpdated": articles_updated}
    json.dump(compiled, open(os.path.join(OUT, "atlas-content.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    json.dump(terms, open(os.path.join(OUT, "terms.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    for fname, obj in (("knowledge.json", know), ("clinical.json", clinical), ("search-index.json", search_index), ("aliases.json", know["aliases"])):
        json.dump(obj, open(os.path.join(OUT, fname), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
        print("wrote", os.path.join(OUT, fname), os.path.getsize(os.path.join(OUT, fname)), "bytes")
    # one file per entity type so a page loads only the section it needs (plus the small clinical.json name index)
    os.makedirs(os.path.join(OUT, "types"), exist_ok=True)
    for key, T in know["types"].items():
        json.dump(T, open(os.path.join(OUT, "types", key + ".json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    print("wrote", len(know["types"]), "type files to", os.path.join(OUT, "types"))
    counts = {"pieces": atlas["totals"]["pieces"], "structures": atlas["totals"]["structures"], "systems": len(atlas["systems"]), "organs": len(out_organs),
              "anatomyArticles": sum(1 for o in out_organs if o.get("article")), "terms": len(terms["terms"]),
              "topics": sum(len(T["items"]) for T in know["types"].values()), "links": sum(len(v) for T in know["types"].values() for e in T["items"].values() for v in e["links"].values()),
              **{k: len(T["items"]) for k, T in know["types"].items()}}
    write_site_meta(site, counts, atlas)
    for o in out_organs: print(f"  organ {o['id']:16s} {len(o['structures']):4d} structures{'  · article' if o.get('article') else ''}")
    for r in out_regions: print(f"  region {r['id']:14s} {len(r['structures']):4d} structures")
    print("wrote", os.path.join(OUT, "atlas-content.json"), os.path.getsize(os.path.join(OUT, "atlas-content.json")), "bytes")

if __name__ == "__main__":
    main()
