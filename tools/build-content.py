#!/usr/bin/env python3
"""build-content.py — compile the editable content sources in content/ against the atlas.

Reads   content/systems.json, organs.json (an organ without a `match` rule has no atlas geometry and needs an article;
                `nearby` names the modelled structures around it), anatomy.json, regions.json, structures.json, terms.json, site.json
        content/physiology.json, symptoms.json, conditions.json, tests.json, imaging.json,
                procedures.json, medications.json, drug-classes.json, first-aid.json, health.json
        content/vocabularies.json, test-taxonomy.json, medication-taxonomy.json, terminology-verification.json
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
        data/content/test-categories.json (the 36 test categories with their pages and catalogued concepts)
        data/content/medication-taxonomy.json (therapeutic areas, classes, facets)
        data/content/review-queues.json  (editorial review queues computed from the validation rules)
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
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import taxonomy as TX   # vocabularies, taxonomies, terminology, drug-name rules, edges, review queues (tools/taxonomy.py)

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
    ("biomarkers",   "biomarkers.json",   "biomarkers",  "Biomarkers",    "Biomarker",        "biomarkers",   "biomarker.html"),
    ("targets",      "targets.json",      "targets",     "Drug targets",  "Biological target", "targets",     "target.html"),
    ("first-aid",    "first-aid.json",    "topics",      "First aid",     "First aid topic",  "first-aid",    "topic.html"),
    ("health",       "health.json",       "topics",      "Health",        "Health topic",     "health",       "topic.html"),
]
# link field on an entity -> the type it points at. `drugClass` is a single id on a medication; everything else is a list.
LINK_FIELDS = {"conditions": "conditions", "symptoms": "symptoms", "associated": "symptoms", "tests": "tests", "imaging": "imaging",
               "procedures": "procedures", "medications": "medications", "drugClass": "drug-classes", "drugClasses": "drug-classes", "physiology": "physiology", "terms": "terms",
               "firstAid": "first-aid", "health": "health", "biomarkers": "biomarkers", "targets": "targets", "related": SAME}
# ---- clinical layer vocabularies (spec: Clinical Content Depth). Values outside these lists fail the build.
REVIEW_STATUSES = ["draft", "source-ingested", "source-verified", "editorial-review", "clinical-review", "approved", "published", "needs-review", "archived"]
INDEXABLE_STATUSES = ["source-verified", "editorial-review", "clinical-review", "approved", "published"]
JURISDICTIONS = ["GLOBAL", "UK", "US", "EU", "CANADA", "AUSTRALIA", "OTHER"]
SOURCE_TYPES = ["regulatory", "guidance", "reference", "literature", "other"]
INDICATION_STATUSES = ["licensed", "guideline-supported", "off-label", "historical", "unverified"]
WARNING_TYPES = ["boxed", "contraindication", "special", "precaution", "monitoring", "pregnancy", "lactation", "renal", "hepatic", "driving", "other"]
CAUTION_TYPES = ["contraindication", "warning", "precaution", "dose-or-monitoring", "other"]
INTERACTION_TYPES = ["drug-drug", "drug-class", "therapeutic-duplication"]
MECHANISMS = ["CYP inhibition", "CYP induction", "transporter inhibition", "transporter induction", "reduced absorption", "chelation", "altered gastric pH", "protein binding",
              "renal clearance", "QT prolongation", "additive hypotension", "additive bleeding risk", "additive CNS depression", "serotonergic effect", "hyperkalaemia risk",
              "nephrotoxicity", "hepatotoxicity", "pharmacodynamic antagonism", "additive myopathy risk", "additive hypoglycaemia risk", "other", "unknown"]
SEVERITIES = ["CONTRAINDICATED", "AVOID_COMBINATION", "SPECIALIST_OR_CLOSE_MONITORING", "MONITOR_OR_ADJUST", "INTERACTION_DOCUMENTED", "NO_SEVERITY_ASSIGNED"]
TARGET_KINDS = ["receptor", "enzyme", "ion channel", "transporter", "protein", "cell", "pathway", "other"]
RANGE_POLICIES = ["laboratory", "threshold", "descriptive", "none"]
# host -> (jurisdiction, source type) for references that do not declare them
HOST_META = {"nhs.uk": ("UK", "regulatory"), "nice.org.uk": ("UK", "guidance"), "bnf.nice.org.uk": ("UK", "guidance"), "gov.uk": ("UK", "regulatory"), "nhsinform.scot": ("UK", "regulatory"),
             "medlineplus.gov": ("US", "regulatory"), "nih.gov": ("US", "regulatory"), "fda.gov": ("US", "regulatory"), "cdc.gov": ("US", "regulatory"), "dailymed.nlm.nih.gov": ("US", "regulatory"),
             "who.int": ("GLOBAL", "regulatory"), "ema.europa.eu": ("EU", "regulatory"), "openstax.org": ("GLOBAL", "reference"), "resus.org.uk": ("UK", "guidance"),
             "heart.org": ("US", "guidance"), "escardio.org": ("EU", "guidance"), "ginasthma.org": ("GLOBAL", "guidance"), "diabetes.org": ("US", "guidance"),
             "medicines.org.uk": ("UK", "regulatory"), "cks.nice.org.uk": ("UK", "guidance"), "kdigo.org": ("GLOBAL", "guidance"), "acc.org": ("US", "guidance"), "b-s-h.org.uk": ("UK", "guidance"),
             "btf-thyroid.org": ("UK", "other"), "kidney.org": ("US", "other"), "labtestsonline.org.uk": ("UK", "other"), "bhf.org.uk": ("UK", "other"), "who.int": ("GLOBAL", "regulatory"),
             "wpath.org": ("GLOBAL", "guidance"), "endocrine.org": ("US", "guidance"), "ucsf.edu": ("US", "guidance"), "rcog.org.uk": ("UK", "guidance"), "womenshealth.gov": ("US", "regulatory"),
             "cancerresearchuk.org": ("UK", "other"), "endometriosis-uk.org": ("UK", "other"), "breastcancernow.org": ("UK", "other")}
CONDITION_CATEGORIES = [("cardiovascular", "Heart & circulation"), ("respiratory", "Lungs & breathing"), ("neurological", "Brain & nerves"),
                        ("digestive", "Digestive system"), ("musculoskeletal", "Bones, joints & muscles"), ("endocrine", "Hormones & metabolism"),
                        ("urinary", "Kidneys & urinary tract"), ("reproductive", "Reproductive & sexual health"), ("other", "Blood, infection & other")]
SYMPTOM_REGIONS = [("head", "Head"), ("chest", "Chest"), ("abdomen", "Abdomen"), ("pelvis", "Pelvis & genitals"), ("back", "Back & spine"), ("arms", "Arms & hands"), ("legs", "Legs & feet"), ("general", "Whole body")]
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
    "bnf.nice.org.uk": ("BNF (NICE)", 1), "cks.nice.org.uk": ("NICE Clinical Knowledge Summaries", 1), "medicines.org.uk": ("emc (electronic medicines compendium)", 1),
    "ema.europa.eu": ("European Medicines Agency", 1), "kdigo.org": ("KDIGO", 1), "acc.org": ("American College of Cardiology", 1), "b-s-h.org.uk": ("British Society for Haematology", 1),
    "btf-thyroid.org": ("British Thyroid Foundation", 3), "kidney.org": ("National Kidney Foundation", 3), "labtestsonline.org.uk": ("Lab Tests Online UK", 3),
    "bhf.org.uk": ("British Heart Foundation", 3), "sja.org.uk": ("St John Ambulance", 3), "asthmaandlung.org.uk": ("Asthma + Lung UK", 3),
    "britishlivertrust.org.uk": ("British Liver Trust", 3), "lung.org": ("American Lung Association", 3), "stroke.org.uk": ("Stroke Association", 3), "epilepsy.org.uk": ("Epilepsy Action", 3),
    "cancer.gov": ("National Cancer Institute (NIH)", 1), "wpath.org": ("World Professional Association for Transgender Health", 1), "endocrine.org": ("Endocrine Society", 1), "ucsf.edu": ("UCSF Gender Affirming Health Program", 2),
    "rcog.org.uk": ("Royal College of Obstetricians and Gynaecologists", 1), "nichd.nih.gov": ("NICHD (NIH)", 1), "womenshealth.gov": ("Office on Women's Health (US)", 1),
    "cancerresearchuk.org": ("Cancer Research UK", 3), "endometriosis-uk.org": ("Endometriosis UK", 3), "breastcancernow.org": ("Breast Cancer Now", 3),
}
TIER_LABEL = {1: "Official health body, guideline or professional society", 2: "Textbook, journal or academic medical centre", 3: "Charity or other secondary resource"}
_unknown_hosts = set()
REQUIRE_CLINICAL_REVIEW = bool((load("site.json", {}).get("editorial") or {}).get("indexRequiresClinicalReview"))

def source_of(url):
    host = urlsplit(url).hostname or ""
    host = host[4:] if host.startswith("www.") else host
    parts = host.split(".")
    for i in range(len(parts)):
        cand = ".".join(parts[i:])
        if cand in SOURCES: return SOURCES[cand]
    _unknown_hosts.add(host)
    return (host, 3)

def host_meta(url):
    host = urlsplit(url).hostname or ""; host = host[4:] if host.startswith("www.") else host
    parts = host.split(".")
    for i in range(len(parts)):
        cand = ".".join(parts[i:])
        if cand in HOST_META: return HOST_META[cand]
    if host.endswith(".org.uk") or host.endswith(".co.uk") or host.endswith(".ac.uk"): return ("UK", "other")
    if host.endswith(".gov"): return ("US", "regulatory")
    return ("GLOBAL", "other")

def enrich_references(refs, accessed, where, errors):
    """Reference records: title, url, publisher (source), evidence tier, jurisdiction, source type, document section, dates."""
    out = []
    for r in refs or []:
        if not isinstance(r, dict) or not re.match(r"^https://[^\s\"'<>]+$", str(r.get("url", ""))) or not r.get("title"):
            errors.append(f"{where}: reference must have a title and an https:// url: {r!r}"); continue
        name, tier = source_of(r["url"]); jur, stype = host_meta(r["url"])
        rec = {"title": r["title"], "url": r["url"], "source": r.get("source") or name, "tier": r.get("tier") or tier, "jurisdiction": r.get("jurisdiction") or jur,
               "type": r.get("type") or stype, "accessed": r.get("accessed") or accessed}
        for k in ("section", "published", "revised", "note"):
            if r.get(k): rec[k] = r[k]
        if rec["jurisdiction"] not in JURISDICTIONS: errors.append(f"{where}: reference jurisdiction '{rec['jurisdiction']}' not in {JURISDICTIONS}")
        if rec["type"] not in SOURCE_TYPES: errors.append(f"{where}: reference type '{rec['type']}' not in {SOURCE_TYPES}")
        out.append(rec)
    return out

def one_source(obj, where, errors, accessed):
    """A structured clinical fact (warning, contraindication, indication, monitoring, interaction evidence) must cite a source; returns the enriched reference or None."""
    src = obj.get("source") if isinstance(obj, dict) else None
    if not src: errors.append(f"{where}: needs a source (title, url, optional section/jurisdiction)"); return None
    refs = enrich_references([src], accessed, where, errors)
    return refs[0] if refs else None

def check_enum(value, allowed, where, errors, field):
    if value is not None and value not in allowed: errors.append(f"{where}: {field} '{value}' not in {allowed}")

def lead_of(e):
    for f in LEAD_FIELDS:
        if e.get(f): return e[f]
    return ""

def text_size(e):
    """Rough amount of visible prose (characters) in an entity, ignoring link and metadata fields."""
    skip = set(LINK_FIELDS) | {"id", "type", "name", "aliases", "urlAliases", "anatomy", "links", "backlinks", "references", "category", "region", "seo", "updated", "members", "class",
                               "categories", "kind", "specimens", "methods", "modality", "terminology", "provenance", "routeIds", "dosageFormIds", "productType", "abbreviations", "canonicalName", "covers", "panelOf", "monitors", "concepts", "monitoredMedications", "review", "depth", "interactionIds"}
    def walk(v):
        if isinstance(v, str): return len(v)
        if isinstance(v, list): return sum(walk(x) for x in v)
        if isinstance(v, dict): return sum(walk(x) for k, x in v.items())
        return 0
    return sum(walk(v) for k, v in e.items() if k not in skip)

def quality_gate(e, require_clinical=False):
    """Indexability: a page must have a lead, real body text, at least one source, be connected to the graph, and carry an
    indexable review status (optionally: clinical review or later, for sites that require it before publishing)."""
    reasons = []
    st = (e.get("review") or {}).get("status", "source-verified")
    if st not in INDEXABLE_STATUSES: reasons.append(f"review status '{st}' is not publishable")
    if require_clinical and st not in ("clinical-review", "approved", "published"): reasons.append("clinical review required before indexing")
    if not lead_of(e): reasons.append("no lead paragraph")
    if text_size(e) < 600: reasons.append("body text under 600 characters")
    if len(e.get("references") or []) < 1: reasons.append("no references")
    groups = sum(1 for v in (e.get("links") or {}).values() if v) + sum(1 for v in (e.get("backlinks") or {}).values() if v)
    if groups < 2: reasons.append("fewer than two relationship groups")
    t = e.get("type")
    if t == "tests":   # §89: identity, purpose, what it measures, interpretation, limitations
        if not e.get("kind"): reasons.append("no test kind")
        if not e.get("whyOrdered"): reasons.append("no purpose (whyOrdered)")
        if not (e.get("measures") or e.get("components")): reasons.append("nothing under what it measures")
        if not (e.get("interpretation") or e.get("thresholds")): reasons.append("no interpretation guidance")
        if not (e.get("limitations") or e.get("cannotTell")): reasons.append("no limitations")
    if t == "medications":   # §90: identity, brands, class, uses, mechanism, side effects, warnings, interactions, monitoring, regulatory metadata
        se = e.get("sideEffects") or {}
        if not e.get("productType"): reasons.append("no product type")
        if "brands" not in e: reasons.append("no brand mapping")
        if not (e.get("links") or {}).get("drugClass"): reasons.append("no drug class")
        if not (e.get("usedFor") or e.get("indications")): reasons.append("no uses")
        if not (e.get("howItWorks") or e.get("mechanismDetail")): reasons.append("no mechanism")
        if not (se.get("common") or se.get("serious")): reasons.append("no side effects")
        if not (e.get("cautions") or e.get("warnings")): reasons.append("no warnings")
        if not (e.get("interactionIds") or e.get("cautions") or e.get("foodInteractions") or e.get("alcohol")): reasons.append("no interaction information")
        if not (e.get("monitoring") or e.get("monitoringPlan")): reasons.append("no monitoring section")
        if not e.get("regulatory"): reasons.append("no jurisdiction-aware regulatory status")
    return reasons

def validate_clinical(key, eid, e, ids, errors):
    """Structured clinical fields (tests, biomarkers, targets, medications, drug classes): vocabularies, ids and the
    publish-blocking rules of the clinical specification (a warning, contraindication, indication, monitoring item,
    special-population note, caution or lab effect without a source fails the build)."""
    where = f"{key}/{eid}"; acc = e["updated"]
    if key == "tests":
        TX.validate_test(e, where, errors)
        for c in e.get("components") or []:
            if c.get("test") and c["test"] not in ids.get("tests", set()): errors.append(f"{where}: component test '{c['test']}' unknown")
        for p in e.get("panelOf") or []:
            if p not in ids.get("tests", set()): errors.append(f"{where}: panelOf '{p}' is not a test id")
        for c in e.get("monitors") or []:
            if c not in ids.get("conditions", set()): errors.append(f"{where}: monitors '{c}' is not a condition id")
        check_enum(e.get("rangePolicy"), RANGE_POLICIES, where, errors, "rangePolicy")
        for c in e.get("components") or []:
            if not c.get("name"): errors.append(f"{where}: component without a name")
            if c.get("biomarker") and c["biomarker"] not in ids.get("biomarkers", set()): errors.append(f"{where}: component biomarker '{c['biomarker']}' unknown")
        for t in e.get("thresholds") or []:
            for f in ("name", "value", "unit", "context"):
                if not t.get(f): errors.append(f"{where}: threshold needs '{f}'")
            if not t.get("jurisdiction"): errors.append(f"{where}: threshold '{t.get('name')}' has no jurisdiction")
            else: check_enum(t["jurisdiction"], JURISDICTIONS, where, errors, "threshold.jurisdiction")
            t["source"] = one_source(t, f"{where} threshold '{t.get('name')}'", errors, acc)
    if key == "targets":
        check_enum(e.get("kind"), TARGET_KINDS, where, errors, "kind")
    if key == "imaging": TX.validate_imaging(e, where, errors)
    if key == "procedures": TX.validate_procedure(e, where, errors)
    if key == "biomarkers": TX.validate_biomarker(e, where, errors)
    if key == "medications":
        TX.validate_medication(e, where, errors, JURISDICTIONS, one_source, acc, ids)
        for i in e.get("indications") or []:
            check_enum(i.get("status"), INDICATION_STATUSES, where, errors, "indication.status")
            if i.get("status") == "unverified": errors.append(f"{where}: an 'unverified' indication may not be published; remove it or verify it")
            if i.get("condition") and i["condition"] not in ids.get("conditions", set()): errors.append(f"{where}: indication condition '{i['condition']}' unknown")
            if not i.get("condition") and not i.get("text"): errors.append(f"{where}: indication needs a condition id or text")
            check_enum(i.get("jurisdiction", "GLOBAL"), JURISDICTIONS, where, errors, "indication.jurisdiction")
            i["source"] = one_source(i, f"{where} indication '{i.get('condition') or i.get('text')}'", errors, acc)
        for w in e.get("warnings") or []:
            check_enum(w.get("type"), WARNING_TYPES, where, errors, "warning.type")
            check_enum(w.get("jurisdiction", "GLOBAL"), JURISDICTIONS, where, errors, "warning.jurisdiction")
            if not w.get("text"): errors.append(f"{where}: warning without text")
            w["source"] = one_source(w, f"{where} warning '{w.get('text', '')[:40]}'", errors, acc)
        for c in e.get("contraindications") or []:
            if not c.get("factor"): errors.append(f"{where}: contraindication without a factor")
            check_enum(c.get("strength"), [None, "absolute", "relative"], where, errors, "contraindication.strength")
            c["source"] = one_source(c, f"{where} contraindication '{c.get('factor')}'", errors, acc)
        for m in e.get("monitoringPlan") or []:
            if not m.get("what"): errors.append(f"{where}: monitoring item without 'what'")
            for t in m.get("tests") or []:
                if t not in ids.get("tests", set()): errors.append(f"{where}: monitoring test '{t}' unknown")
            for b in m.get("biomarkers") or []:
                if b not in ids.get("biomarkers", set()): errors.append(f"{where}: monitoring biomarker '{b}' unknown")
            m["source"] = one_source(m, f"{where} monitoring '{m.get('what')}'", errors, acc)
        for pop, v in (e.get("populations") or {}).items():
            if pop not in ("pregnancy", "lactation", "children", "older", "renal", "hepatic"): errors.append(f"{where}: unknown population '{pop}'")
            if not isinstance(v, dict) or not v.get("text"): errors.append(f"{where}: population '{pop}' needs text and a source"); continue
            v["source"] = one_source(v, f"{where} population '{pop}'", errors, acc)
        for f in e.get("foodInteractions") or []:
            if not f.get("with") or not f.get("effect"): errors.append(f"{where}: food interaction needs 'with' and 'effect'")
            f["source"] = one_source(f, f"{where} food interaction '{f.get('with')}'", errors, acc)
        if e.get("alcohol"):
            a = e["alcohol"]
            if not a.get("effect"): errors.append(f"{where}: alcohol interaction needs 'effect'")
            a["source"] = one_source(a, f"{where} alcohol", errors, acc)
        for su in e.get("supplementInteractions") or []:
            if not su.get("with") or not su.get("effect"): errors.append(f"{where}: supplement interaction needs 'with' and 'effect'")
            su["source"] = one_source(su, f"{where} supplement '{su.get('with')}'", errors, acc)
        for c in e.get("conditionCautions") or []:
            check_enum(c.get("type"), CAUTION_TYPES, where, errors, "conditionCaution.type")
            if c.get("condition") and c["condition"] not in ids.get("conditions", set()): errors.append(f"{where}: caution condition '{c['condition']}' unknown")
            if not c.get("condition") and not c.get("text"): errors.append(f"{where}: caution needs a condition id or text")
            c["source"] = one_source(c, f"{where} caution '{c.get('condition') or c.get('text')}'", errors, acc)
        for l in e.get("labEffects") or []:
            if l.get("biomarker") and l["biomarker"] not in ids.get("biomarkers", set()): errors.append(f"{where}: lab effect biomarker '{l['biomarker']}' unknown")
            if l.get("test") and l["test"] not in ids.get("tests", set()): errors.append(f"{where}: lab effect test '{l['test']}' unknown")
            if not l.get("effect"): errors.append(f"{where}: lab effect needs 'effect'")
            l["source"] = one_source(l, f"{where} lab effect", errors, acc)
        for step in e.get("pathway") or []:
            if isinstance(step, dict) and step.get("link"):
                lt, li = step["link"].get("type"), step["link"].get("id")
                pool = {"organs": None, "systems": None}.get(lt, ids.get(lt))
                if lt not in ("organs", "systems") and (pool is None or li not in pool): errors.append(f"{where}: pathway link {lt}/{li} unknown")
        for jur, v in (e.get("otc") or {}).items():
            check_enum(jur, JURISDICTIONS, where, errors, "otc jurisdiction")
        for jur in (e.get("brands") or {}):
            check_enum(jur, JURISDICTIONS, where, errors, "brands jurisdiction")
    if key == "medications" and e.get("depth") == "full":
        se = e.get("sideEffects") or {}
        se["source"] = one_source(se, f"{where} sideEffects", errors, acc)
        pk = e.get("pharmacokinetics") or {}
        pk["source"] = one_source(pk, f"{where} pharmacokinetics", errors, acc)
        missing = [f for f in ("brands", "otc", "routes", "targets", "pathway", "indications", "warnings", "contraindications", "monitoringPlan", "populations", "conditionCautions", "labEffects", "understand", "mechanismDetail", "alcohol") if not e.get(f)]
        if missing: errors.append(f"{where}: full-depth medication is missing {missing}")
        pops = set((e.get("populations") or {}).keys())
        if pops != {"pregnancy", "lactation", "children", "older", "renal", "hepatic"}: errors.append(f"{where}: populations must cover pregnancy, lactation, children, older, renal, hepatic (has {sorted(pops)})")
        if not any(i.get("status") == "licensed" for i in e.get("indications") or []): errors.append(f"{where}: needs at least one licensed indication")
        if len(e.get("pathway") or []) < 3: errors.append(f"{where}: pathway needs at least three steps")
    if key == "tests" and e.get("depth") == "full":
        missing = [f for f in ("quick", "specimen", "testType", "rangePolicy", "factors", "cannotTell", "limitations", "conditions", "related", "whyOrdered") if not e.get(f)]
        if not (e.get("components") or e.get("measures")): missing.append("components")
        if missing: errors.append(f"{where}: full-depth test is missing {missing}")
        q = e.get("quick") or {}
        if not all(q.get(k) for k in ("type", "sample", "usedFor", "measures")): errors.append(f"{where}: quick summary needs type, sample, usedFor and measures")
    if key == "drug-classes":
        if e.get("duplicationRule"):
            if not e["duplicationRule"].get("text"): errors.append(f"{where}: duplicationRule needs text")
            e["duplicationRule"]["source"] = one_source(e["duplicationRule"], f"{where} duplicationRule", errors, acc)
        for w in e.get("classWarnings") or []:
            if not w.get("text"): errors.append(f"{where}: class warning without text")
            w["source"] = one_source(w, f"{where} class warning", errors, acc)
        for w in e.get("classInteractions") or []:
            if not w.get("with") or not w.get("effect"): errors.append(f"{where}: class interaction needs 'with' and 'effect'")
            w["source"] = one_source(w, f"{where} class interaction '{w.get('with')}'", errors, acc)

def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower().replace("'", "")).strip("-")

# ---- checker knowledge-graph links. A monitoring phrase (lower-case) resolves to the test, biomarker or physiology page a
# reader can open; phrases not listed are matched against the exact name or alias of a test or biomarker, and anything else
# stays as plain text. Never a clinical claim: the links only say where on this site the item is explained.
MONITORING_LINKS = {
    "potassium": [("biomarkers", "potassium")], "potassium and magnesium": [("biomarkers", "potassium"), ("tests", "electrolytes")],
    "creatinine and egfr": [("tests", "creatinine-egfr")], "creatinine and egfr after the procedure": [("tests", "creatinine-egfr")],
    "kidney function": [("tests", "kidney-function-tests")], "kidney and liver function": [("tests", "kidney-function-tests"), ("tests", "liver-function-tests")],
    "liver function": [("tests", "liver-function-tests")], "blood pressure": [("physiology", "blood-pressure")], "heart rate": [("physiology", "heart-rate")],
    "blood glucose": [("tests", "blood-glucose"), ("biomarkers", "glucose")], "hba1c after prolonged courses": [("tests", "hba1c")],
    "full blood count": [("tests", "complete-blood-count")], "haemoglobin": [("biomarkers", "haemoglobin")], "tsh": [("tests", "tsh")],
    "ecg (qt interval)": [("tests", "ecg")], "fluid balance and weight": [("physiology", "fluid-balance")],
}
# The sourced mechanism of a record -> the anatomy and physiology pages that explain it (navigation into the knowledge graph,
# validated against the atlas and the entity files at build time). Mechanisms without a natural anatomical home link nothing.
MECHANISM_LINKS = {
    "CYP inhibition": [("organ", "liver"), ("physiology", "liver-functions")], "CYP induction": [("organ", "liver"), ("physiology", "liver-functions")],
    "hepatotoxicity": [("organ", "liver"), ("physiology", "liver-functions"), ("tests", "liver-function-tests")],
    "renal clearance": [("organ", "kidneys"), ("physiology", "filtration")], "nephrotoxicity": [("organ", "kidneys"), ("physiology", "filtration"), ("tests", "creatinine-egfr")],
    "hyperkalaemia risk": [("organ", "kidneys"), ("biomarkers", "potassium"), ("physiology", "electrolytes")],
    "QT prolongation": [("organ", "heart"), ("physiology", "cardiac-conduction"), ("tests", "ecg")],
    "altered gastric pH": [("organ", "stomach"), ("physiology", "absorption")], "reduced absorption": [("organ", "small-intestine"), ("physiology", "absorption")],
    "chelation": [("organ", "small-intestine"), ("physiology", "absorption")], "additive hypotension": [("physiology", "blood-pressure")],
    "additive hypoglycaemia risk": [("tests", "blood-glucose"), ("biomarkers", "glucose")], "additive CNS depression": [("organ", "brain")],
    "serotonergic effect": [("organ", "brain"), ("physiology", "nerve-signals")], "additive myopathy risk": [("system", "muscles")],
}
RELATED_ORDER = ["drug-classes", "organ", "system", "physiology", "tests", "biomarkers", "conditions"]
# Search aliases that are true synonyms of the medication for the interaction checker (other aliases name a class or another
# member of a grouped page and must not resolve to this medication in a check).
CHECKER_SYNONYMS = {"aspirin": ["acetylsalicylic acid", "ASA", "low-dose aspirin", "75 mg aspirin"], "paracetamol": ["acetaminophen", "APAP"], "furosemide": ["frusemide"],
                    "salbutamol": ["albuterol"], "glyceryl-trinitrate": ["GTN", "nitroglycerin", "GTN spray"], "levothyroxine": ["thyroxine", "T4"], "alendronate": ["alendronic acid"],
                    "amlodipine": ["amlodipine besilate", "amlodipine besylate"], "metformin": ["metformin hydrochloride"], "losartan": ["losartan potassium"],
                    "atorvastatin": ["atorvastatin calcium"], "rosuvastatin": ["rosuvastatin calcium"]}

def compile_interactions(types, errors, organ_names=None, system_names=None):
    """content/interactions.json -> validated pair records, an index by medication and by class, the named substances the
    records apply to, and the knowledge-graph links of every record, for the medication pages and the interaction checker.
    Every record needs at least one source; severity states must be sourced; every link is validated."""
    organ_names = organ_names or {}; system_names = system_names or {}
    raw = load("interactions.json", {"interactions": []})
    recs = raw.get("interactions", [])
    updated = raw.get("_updated", "")
    meds = types["medications"]["items"]; classes = types["drug-classes"]["items"]
    # names that mean this medication in the checker: the generic name, its brands and the synonyms below. A medication's
    # search `aliases` are wider (class names, other members of a grouped page such as codeine on the opioids page) and are
    # deliberately not treated as synonyms here: in an interaction check, codeine is not morphine and citalopram is not sertraline.
    med_name_keys = {}   # lower-case name, brand or synonym -> medication id
    for mid, m in meds.items():
        for n in [m["name"]] + CHECKER_SYNONYMS.get(mid, []) + [b for v in (m.get("brands") or {}).values() for b in v]: med_name_keys.setdefault(n.lower(), mid)
    med_words = {re.findall(r"[a-z]+", m["name"].lower())[0] for m in meds.values()}   # the first word of every medication name
    members = {cid: sorted(set((c.get("links") or {}).get("medications", []) + [m for m, me in meds.items() if (me.get("links") or {}).get("drugClass") == [cid]])) for cid, c in classes.items()}
    class_of_member = {}   # member name (lower) -> class id, from the class pages' member lists
    for cid, c in classes.items():
        for n in c.get("members") or []: class_of_member.setdefault(n.lower(), cid)
    substances = {}        # id -> {name, aliases, drugClass, records: [ids]}
    def add_substance(name, aliases=(), where=""):
        key = name.lower()
        if key in med_name_keys: errors.append(f"{where}: '{name}' is the medication '{med_name_keys[key]}': use 'b' instead of a named substance"); return None
        sid = slugify(name)
        if not sid: errors.append(f"{where}: cannot make an id from '{name}'"); return None
        s = substances.setdefault(sid, {"id": sid, "name": name[0].upper() + name[1:], "aliases": [], "drugClass": class_of_member.get(key), "records": []})
        for al in aliases:
            if al.lower() != key and al not in s["aliases"]: s["aliases"].append(al)
        return sid
    out = []; seen = set()
    for r in recs:
        rid = r.get("id") or ""
        where = f"interactions/{rid or '?'}"
        if not rid: errors.append("interactions: record without id"); continue
        if rid in seen: errors.append(f"{where}: duplicate id"); continue
        seen.add(rid)
        check_enum(r.get("type"), INTERACTION_TYPES, where, errors, "type")
        a = r.get("a"); b = r.get("b"); bc = r.get("bClass"); bn = r.get("bName")
        if a not in meds: errors.append(f"{where}: 'a' must be a medication id (got {a!r})")
        if r.get("type") == "drug-class" or (r.get("type") == "therapeutic-duplication" and bc):
            if bc not in classes: errors.append(f"{where}: bClass '{bc}' unknown")
        else:
            if not (b in meds or bn): errors.append(f"{where}: 'b' must be a medication id or 'bName' a named medicine")
        if b and b not in meds and not bn: errors.append(f"{where}: 'b' '{b}' unknown")
        check_enum(r.get("mechanism", "unknown"), MECHANISMS, where, errors, "mechanism")
        sev = r.get("severity", "NO_SEVERITY_ASSIGNED"); check_enum(sev, SEVERITIES, where, errors, "severity")
        if sev != "NO_SEVERITY_ASSIGNED" and not r.get("severitySource"): errors.append(f"{where}: severity '{sev}' needs severitySource (the document whose wording supports it)")
        if not r.get("effect"): errors.append(f"{where}: needs 'effect' (clinical effect)")
        ev = enrich_references(r.get("evidence") or [], r.get("updated") or updated, where, errors)
        if not ev: errors.append(f"{where}: needs at least one evidence source")
        for j in r.get("jurisdictions") or []: check_enum(j, JURISDICTIONS, where, errors, "jurisdictions")
        rv = r.get("review") or "source-verified"; check_enum(rv, REVIEW_STATUSES, where, errors, "review")
        # named substances the record applies to (checker search entries): bAgents, or the bName itself when it names one agent
        agent_ids = []
        if bn and not b and not bc:
            agents = r["bAgents"] if "bAgents" in r else [bn]
            if not isinstance(agents, list): errors.append(f"{where}: bAgents must be a list of names or {{name, aliases}}"); agents = []
            for ag in agents:
                name, aliases = (ag, []) if isinstance(ag, str) else (ag.get("name", ""), ag.get("aliases") or [])
                if not name: errors.append(f"{where}: bAgents entry without a name"); continue
                sid = add_substance(name, aliases, where)
                if sid: agent_ids.append(sid); substances[sid]["records"].append(rid)
        elif "bAgents" in r: errors.append(f"{where}: bAgents only applies to a record with bName")
        out.append({"id": rid, "type": r.get("type"), "a": a, "b": b, "bClass": bc, "bName": bn or (meds.get(b, {}).get("name") if b else classes.get(bc, {}).get("name")),
                    "agentIds": agent_ids, "perpetrator": r.get("perpetrator"), "victim": r.get("victim"), "mechanism": r.get("mechanism", "unknown"), "mechanismNote": r.get("mechanismNote", ""),
                    "effect": r["effect"] if r.get("effect") else "", "sourceWording": r.get("sourceWording", ""), "severity": sev, "severitySource": r.get("severitySource", ""),
                    "action": r.get("action", ""), "monitoring": r.get("monitoring") or [], "onset": r.get("onset", ""), "jurisdictions": r.get("jurisdictions") or sorted({x["jurisdiction"] for x in ev}),
                    "population": r.get("population", ""), "evidence": ev, "review": rv, "updated": r.get("updated") or updated})
    by_drug = collections.defaultdict(list); by_class = collections.defaultdict(list)
    for r in out:
        by_drug[r["a"]].append(r["id"])
        if r["b"]: by_drug[r["b"]].append(r["id"])
        if r["bClass"]: by_class[r["bClass"]].append(r["id"])
    dup_rules = {cid: {"text": c["duplicationRule"]["text"], "source": c["duplicationRule"]["source"]} for cid, c in classes.items() if c.get("duplicationRule")}
    # ---- brand and combination products -> ingredients (content/products.json)
    praw = load("products.json", {"products": {}}); products = []
    product_name_keys = set()
    for pid, p in (praw.get("products") or {}).items():
        product_name_keys.add((p.get("name") or pid).lower()); product_name_keys.update(x.lower() for x in p.get("aliases") or [])
    for pid, p in (praw.get("products") or {}).items():
        where = f"products/{pid}"
        if not SLUG.match(pid): errors.append(f"{where}: id is not a slug")
        ings = []
        for ing in p.get("ingredients") or []:
            if isinstance(ing, str):
                if ing not in meds: errors.append(f"{where}: ingredient '{ing}' is not a medication id"); continue
                ings.append({"id": ing, "name": meds[ing]["name"]})
            elif isinstance(ing, dict) and ing.get("name"):
                rec_ = {"name": ing["name"]}
                if ing.get("drugClass"):
                    if ing["drugClass"] not in classes: errors.append(f"{where}: ingredient class '{ing['drugClass']}' unknown")
                    else: rec_["drugClass"] = ing["drugClass"]
                sid = add_substance(ing["name"], (), where)         # an ingredient without a page is a named substance, so the same ingredient in two entries is detected
                if sid:
                    rec_["agentId"] = sid
                    if rec_.get("drugClass") and not substances[sid]["drugClass"]: substances[sid]["drugClass"] = rec_["drugClass"]
                    if not rec_.get("drugClass") and substances[sid]["drugClass"]: rec_["drugClass"] = substances[sid]["drugClass"]
                ings.append(rec_)
            else: errors.append(f"{where}: ingredient must be a medication id or {{name}}")
        if len(ings) < 1: errors.append(f"{where}: needs ingredients")
        if not any("id" in i or "drugClass" in i for i in ings): errors.append(f"{where}: at least one ingredient must be a medication or a drug class on this site")
        for j in p.get("jurisdictions") or []: check_enum(j, JURISDICTIONS, where, errors, "jurisdictions")
        src = one_source(p, where, errors, praw.get("_updated", updated))
        products.append({"id": pid, "name": p.get("name") or pid, "aliases": p.get("aliases") or [], "ingredients": ings, "jurisdictions": p.get("jurisdictions") or [], "note": p.get("note", ""), "source": src})
    # ---- members of a class without a page become named substances too, so a class-level record (sourced for the whole
    # class) and a duplication rule can be applied to them; a member that is a medication, a product or contains a
    # medication's name is skipped (the medication or product entry already covers it)
    for cid, c in classes.items():
        for n in c.get("members") or []:
            key = n.lower()
            if key in med_name_keys or key in product_name_keys or any(w in re.findall(r"[a-z]+", key) for w in med_words): continue
            sid = slugify(n)
            if sid in substances:
                if not substances[sid]["drugClass"]: substances[sid]["drugClass"] = cid
                continue
            substances[sid] = {"id": sid, "name": n[0].upper() + n[1:], "aliases": [], "drugClass": cid, "records": []}
    # a substance is offered in the checker only when at least one record can apply to it: its own records, a record written
    # for its class, or its class's duplication rule; otherwise every result would be "no known interaction" for lack of data
    for s in substances.values():
        cid = s["drugClass"]
        s["classRecords"] = list(by_class.get(cid, [])) if cid else []
        s["searchable"] = bool(s["records"] or s["classRecords"] or (cid and cid in dup_rules))
    # ---- knowledge-graph links of every record: classes, shared anatomy, the mechanism's anatomy and physiology, monitoring pages
    tb_names = {}   # lower-case test / biomarker name or alias -> (type, id)
    for t in ("biomarkers", "tests"):
        for eid, e in types[t]["items"].items():
            for n in [e["name"]] + list(e.get("aliases") or []): tb_names.setdefault(n.lower(), (t, eid))
    def link_name(kind, eid, where):
        if kind == "organ":
            if eid not in organ_names: errors.append(f"{where}: related organ '{eid}' unknown"); return None
            return organ_names[eid]
        if kind == "system":
            if eid not in system_names: errors.append(f"{where}: related system '{eid}' unknown"); return None
            return system_names[eid]
        if kind not in types or eid not in types[kind]["items"]: errors.append(f"{where}: related {kind} '{eid}' unknown"); return None
        return types[kind]["items"][eid]["name"]
    unresolved_monitoring = collections.Counter()
    for r in out:
        where = f"interactions/{r['id']}"
        links = []
        def add(kind, eid):
            if any(l["type"] == kind and l["id"] == eid for l in links): return
            n = link_name(kind, eid, where)
            if n: links.append({"type": kind, "id": eid, "name": n})
        cls_a = (meds.get(r["a"], {}).get("links") or {}).get("drugClass", [None])[0]
        cls_b = r["bClass"] or ((meds.get(r["b"], {}).get("links") or {}).get("drugClass", [None])[0] if r["b"] else None)
        for cid in (cls_a, cls_b):
            if cid: add("drug-classes", cid)
        if r["b"]:
            shared = [o for o in (meds[r["a"]].get("anatomy") or {}).get("organs", []) if o in (meds[r["b"]].get("anatomy") or {}).get("organs", [])]
            for o in shared[:3]: add("organ", o)
        for kind, eid in MECHANISM_LINKS.get(r["mechanism"], []): add(kind, eid)
        mon_links = []
        for item in r["monitoring"]:
            key = item.lower().strip()
            hits = MONITORING_LINKS.get(key) or ([tb_names[key]] if key in tb_names else [])
            if not hits: unresolved_monitoring[item] += 1
            for kind, eid in hits: add(kind, eid)
            mon_links.append({"text": item, "links": [{"type": k, "id": i, "name": link_name(k, i, where)} for k, i in hits]})
        links.sort(key=lambda l: RELATED_ORDER.index(l["type"]) if l["type"] in RELATED_ORDER else 99)
        r["related"] = links[:10]; r["monitoringLinks"] = mon_links
    if unresolved_monitoring: print(f"  interactions: monitoring items left as plain text (no page to link): {sorted(unresolved_monitoring)}", file=sys.stderr)
    # ---- autocomplete index for the checker: every generic, brand, alias, product, named substance and class -> canonical entry
    index = []
    cname = lambda cid: classes[cid]["name"] if cid and cid in classes else None
    for mid, m in meds.items():
        cid = (m.get("links") or {}).get("drugClass", [None])[0]
        index.append({"label": m["name"], "kind": "medication", "id": mid, "cls": cname(cid)})
        seen_ = {m["name"].lower()}
        brands = {b.lower() for v in (m.get("brands") or {}).values() for b in v}
        first = re.findall(r"[a-z]+", m["name"].lower())[0]
        synonyms = {x.lower() for x in CHECKER_SYNONYMS.get(mid, [])}
        for al in list(m.get("aliases") or []) + [b for v in (m.get("brands") or {}).values() for b in v]:
            key = al.lower()
            if key in seen_ or key in {x["name"].lower() for x in meds.values()}: continue
            if not (key in brands or key in synonyms or first in re.findall(r"[a-z0-9]+", key)): continue   # a class name or another medicine, not a synonym
            seen_.add(key); index.append({"label": al, "kind": "medication", "id": mid, "alias": "brand" if key in brands else "alias", "of": m["name"], "cls": cname(cid)})
    for p in products:
        ings = " + ".join(i["name"] for i in p["ingredients"])
        index.append({"label": p["name"], "kind": "product", "id": p["id"], "ings": ings})
        for al in p["aliases"]: index.append({"label": al, "kind": "product", "id": p["id"], "alias": "alias", "of": p["name"], "ings": ings})
    for sid, s in sorted(substances.items()):
        if not s["searchable"]: continue
        index.append({"label": s["name"], "kind": "substance", "id": sid, "cls": cname(s["drugClass"])})
        for al in s["aliases"]: index.append({"label": al, "kind": "substance", "id": sid, "alias": "alias", "of": s["name"], "cls": cname(s["drugClass"])})
    for cid, c in classes.items():
        index.append({"label": c["name"], "kind": "class", "id": cid, "members": [n[0].upper() + n[1:] for n in (c.get("members") or [])][:6]})
        for al in c.get("aliases") or []: index.append({"label": al, "kind": "class", "id": cid, "alias": "alias", "of": c["name"]})
    member_names = {cid: sorted({n for n in (c.get("members") or [])} | {meds[m]["name"] for m in members.get(cid, [])}) for cid, c in classes.items()}
    publishers = collections.Counter(e["source"] for r in out for e in r["evidence"])
    reviews = collections.Counter(r["review"] for r in out)
    source_meta = {"provider": "Anatomy Nexus interaction records (paraphrased from the cited official documents)", "dataVersion": updated,
                   "lastUpdated": max([r["updated"] for r in out] + [updated]) if out else updated, "recordCount": len(out), "productCount": len(products),
                   "substanceCount": sum(1 for s in substances.values() if s["searchable"]), "medicationCount": len(meds), "classCount": len(classes),
                   "publishers": dict(publishers.most_common()), "reviewStatuses": dict(reviews), "scope": ["drug-drug"]}
    return {"updated": updated, "records": out, "byDrug": dict(by_drug), "byClass": dict(by_class), "classMembers": members, "classMemberNames": member_names, "classNames": {cid: c["name"] for cid, c in classes.items()},
            "duplicationClasses": dup_rules, "products": products, "substances": {sid: {k: v for k, v in s.items() if k != "searchable"} for sid, s in substances.items() if s["searchable"]},
            "index": index, "drugClassOf": {mid: (m.get("links") or {}).get("drugClass", [None])[0] for mid, m in meds.items()},
            "organNames": organ_names, "sourceMetadata": source_meta}


def compile_comparisons(types, errors):
    """content/comparisons.json -> structured comparisons of two entities (tests or imaging), rendered at /compare/<id>/."""
    raw = load("comparisons.json", {"comparisons": []})
    out = []
    for c in raw.get("comparisons", []):
        cid = c.get("id"); where = f"compare/{cid}"
        for side in ("a", "b"):
            ref = c.get(side) or {}
            if ref.get("type") not in types or ref.get("id") not in types.get(ref.get("type"), {}).get("items", {}): errors.append(f"{where}: {side} must name an existing entity (type, id)")
        if not c.get("title") or not c.get("intro") or len(c.get("rows") or []) < 3: errors.append(f"{where}: needs title, intro and at least three rows")
        refs = enrich_references(c.get("references"), raw.get("_updated", ""), where, errors)
        out.append({**c, "references": refs, "updated": c.get("updated") or raw.get("_updated", "")})
    return {"updated": raw.get("_updated", ""), "comparisons": out}

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
    queues = collections.defaultdict(list)   # review queues (§94), filled by the validation rules below and by taxonomy.build_queues
    # the test categories are the 36 categories of the master test taxonomy; the medication categories are its therapeutic areas
    types["tests"]["meta"]["categories"] = [{"id": c["id"], "name": c["name"], "group": c["group"]} for c in TX.TEST_TAX["categories"]]
    types["tests"]["meta"]["groups"] = TX.TEST_TAX["groups"]
    types["medications"]["meta"]["categories"] = [{"id": a["id"], "name": a["name"]} for a in TX.MED_TAX["areas"]]

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
    types["biomarkers"]["meta"]["categories"] = [{"id": c, "name": n} for c, n in (("blood", "Blood cells"), ("liver", "Liver"), ("kidney", "Kidney"), ("cardiac", "Heart"), ("lipids", "Lipids"), ("glucose", "Glucose"),
                                                                                  ("thyroid", "Thyroid"), ("hormone", "Other hormones"), ("inflammation", "Inflammation"), ("iron", "Iron & vitamins"), ("electrolytes", "Electrolytes"), ("other", "Other"))]
    types["targets"]["meta"]["categories"] = [{"id": k, "name": k.capitalize()} for k in TARGET_KINDS]

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
            elif key == "biomarkers": e["category"] = e.get("category", "other")
            elif key == "targets": e["category"] = e.get("kind", "other")
            if "category" in e and e["category"] and e["category"] not in {c["id"] for c in T["meta"]["categories"]}:
                errors.append(f"{key}/{eid}: unknown category '{e['category']}'")
            # ---- links implied by structured clinical fields (a test's components, a medicine's monitoring plan and lab
            # effects) become typed links, so the graph and the backlinks include them without duplicating the ids by hand
            def imply(field, value):
                if not value: return
                lst = e.get(field) or []
                if isinstance(lst, str): lst = [lst]
                if value not in lst: lst.append(value)
                e[field] = lst
            if key == "tests":
                for c in e.get("components") or []: imply("biomarkers", c.get("biomarker")); imply("related", c.get("test"))
                for p in e.get("panelOf") or []: imply("related", p)
                for c in e.get("monitors") or []: imply("conditions", c)
            if key == "medications":
                for m_ in e.get("monitoringPlan") or []:
                    for t_ in m_.get("tests") or []: imply("tests", t_)
                    for b_ in m_.get("biomarkers") or []: imply("biomarkers", b_)
                for l_ in e.get("labEffects") or []: imply("biomarkers", l_.get("biomarker")); imply("tests", l_.get("test"))
                for i_ in e.get("indications") or []: imply("conditions", i_.get("condition"))
                for c_ in e.get("conditionCautions") or []: imply("conditions", c_.get("condition"))
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
            # ---- references: plain https links (rendered as outbound anchors), with publisher, tier, jurisdiction and type
            e["references"] = enrich_references(e.get("references"), e["updated"], f"{key}/{eid}", errors)
            # ---- review status (clinical content status model); only some statuses may be indexed
            rv = e.get("review") or {}
            if isinstance(rv, str): rv = {"status": rv}
            rv.setdefault("status", "source-verified"); rv.setdefault("jurisdictions", sorted({r["jurisdiction"] for r in e["references"] if r["jurisdiction"] != "GLOBAL"}) or ["GLOBAL"])
            check_enum(rv["status"], REVIEW_STATUSES, f"{key}/{eid}", errors, "review.status")
            for j in rv["jurisdictions"]: check_enum(j, JURISDICTIONS, f"{key}/{eid}", errors, "review.jurisdictions")
            e["review"] = rv
            validate_clinical(key, eid, e, ids, errors)
    # ---- attach backlinks (reverse edges) and the indexability verdict to every entity
    for key, T in types.items():
        for eid, e in T["items"].items():
            bl = back[key].get(eid, {})
            e["backlinks"] = {t: sorted(v) for t, v in sorted(bl.items())}
    # tests monitored medicines: the medicines whose sourced monitoring plan names the test or biomarker (TEST_MONITORS_MEDICATION)
    for mid, m in types["medications"]["items"].items():
        for mp in m.get("monitoringPlan") or []:
            for t in mp.get("tests") or []:
                if t in types["tests"]["items"]: types["tests"]["items"][t].setdefault("monitoredMedications", []).append(mid)
            for b in mp.get("biomarkers") or []:
                if b in types["biomarkers"]["items"]: types["biomarkers"]["items"][b].setdefault("monitoredMedications", []).append(mid)
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
    interactions = compile_interactions(types, errors, organ_names={o["id"]: o["name"] for o in out_organs}, system_names={s_["id"]: s_["name"] for s_ in atlas["systems"]})
    comparisons = compile_comparisons(types, errors)
    # ---- drug-name rules and cross-entity checks (§79, §95), catalogue → page mapping (§86–§88)
    products_raw = {k: v for k, v in (load("products.json", {"products": {}}).get("products") or {}).items() if not k.startswith("_")}
    TX.validate_cross(types, products_raw, errors, queues)
    concept_page = TX.map_catalogue(types, errors, queues)
    if errors:
        print("CLINICAL DATA ERRORS:", file=sys.stderr)
        for e in errors: print("  " + e, file=sys.stderr)
        sys.exit(1)
    # attach interaction ids to medications and classes so a page can render its own interactions
    for mid, m in types["medications"]["items"].items(): m["interactionIds"] = interactions["byDrug"].get(mid, [])
    for cid, c in types["drug-classes"]["items"].items(): c["interactionIds"] = interactions["byClass"].get(cid, [])
    # the catalogued concepts each page covers, and the alias set search uses for it
    for cid, pg in concept_page.items(): types[pg["type"]]["items"][pg["id"]].setdefault("concepts", []).append({"id": cid, "name": TX.CONCEPTS[cid]["name"], "category": TX.CONCEPTS[cid]["categories"][0]})
    # ---- indexability (quality gate, §89–§90) and provenance (§91)
    noindex = []
    for key, T in types.items():
        for eid, e in T["items"].items():
            reasons = quality_gate(e, REQUIRE_CLINICAL_REVIEW)
            e["seo"] = {"index": not reasons, "reasons": reasons}
            e["provenance"] = TX.provenance(e)
            if reasons: noindex.append(f"{key}/{eid}: " + "; ".join(reasons))
    if noindex:
        print(f"  {len(noindex)} entity page(s) fail the quality gate and are published noindex:", file=sys.stderr)
        for n in noindex: print("    " + n, file=sys.stderr)
    updated_all = max(T["meta"].get("updated") or "" for T in types.values())
    test_categories = TX.build_test_categories(types, concept_page, lead_of, max(updated_all, TX.TEST_TAX.get("_updated", "")))
    med_taxonomy = TX.build_medication_taxonomy(types, max(updated_all, TX.MED_TAX.get("_updated", "")))
    graph = TX.build_edges(types, interactions, interactions["products"])
    review = TX.build_queues(types, interactions, concept_page, queues, text_size)
    n_cat_index = sum(1 for c in test_categories["categories"] if c["seo"]["index"])
    print(f"taxonomy: {len(test_categories['categories'])} test categories ({n_cat_index} indexable), {len(TX.CONCEPTS)} catalogued concepts ({len(concept_page)} covered by a page), {len(med_taxonomy['areas'])} therapeutic areas, {sum(len(g['classes']) for a in med_taxonomy['areas'] for g in a['groups'])} class concepts")
    print(f"graph: {len(graph['edges'])} typed edges of {len(graph['edgeTypes'])} relationship types · review queues: " + ", ".join(f"{k} {v}" for k, v in review["counts"].items() if v))
    counts = {k: len(v["items"]) for k, v in types.items()}
    edges = sum(len(v) for T in types.values() for e in T["items"].values() for v in e["links"].values())
    refs = sum(len(e["references"]) for T in types.values() for e in T["items"].values())
    n_alias = sum(len(v) for v in aliases.values())
    print("knowledge:", ", ".join(f"{k} {n}" for k, n in counts.items()), f"· {edges} typed links · {refs} references · {n_alias} URL aliases · anatomy backlinks: {len(anatomy['organs'])} organs, {len(anatomy['systems'])} systems, {len(anatomy['structures'])} structures")
    print(f"clinical: {len(interactions['records'])} interaction records, {len(interactions['products'])} products, {len(comparisons['comparisons'])} comparisons, {sum(1 for T in types.values() for e in T['items'].values() if e.get('depth') == 'full')} full-depth pages")
    aliases["tests/categories"] = {a: c["id"] for c in TX.TEST_TAX["categories"] for a in c.get("urlAliases") or []}
    return {"types": types, "anatomy": anatomy, "terms": termlinks, "aliases": aliases, "interactions": interactions, "comparisons": comparisons,
            "testCategories": test_categories, "medicationTaxonomy": med_taxonomy, "edges": graph["edges"], "edgeTypes": graph["edgeTypes"], "review": review, "conceptPage": concept_page}

def build_search_index(atlas, out_organs, out_regions, terms, know):
    entries = []
    sysname = {s["id"]: s["name"] for s in atlas["systems"]}
    unslug = lambda al: [a.replace("-", " ") for a in al or []]
    for s in atlas["systems"]: entries.append(["system", s["id"], s["name"], "", f"{s['count']} pieces"])
    for o in out_organs: entries.append(["organ", o["id"], o["name"], "|".join(o.get("aliases", []) + unslug(o.get("urlAliases"))), (f"{len(o['structures'])} structures" if o["structures"] else "anatomy article") + f" · {sysname.get(o['system'], '')}"])
    for r in out_regions: entries.append(["region", r["id"], r["name"], "", f"{len(r['structures'])} structures"])
    for s in atlas["structures"]: entries.append(["structure", s["id"], s["name"], "", sysname.get(s["system"], s["system"])])
    catname = {c["id"]: c["name"] for c in terms.get("categories", [])}
    for t in terms["terms"]: entries.append(["term", t["id"], t["term"], "", catname.get(t["category"], "Term")])
    extra = TX.page_aliases_from_catalogue(know["conceptPage"])
    for key, T in know["types"].items():
        for eid, e in T["items"].items():
            brands = [b for v in (e.get("brands") or {}).values() for b in v]
            names = e.get("aliases", []) + list(e.get("abbreviations") or []) + ([e["canonicalName"]] if e.get("canonicalName") else []) + list(e.get("ingredientVariants") or []) + brands + unslug(e.get("urlAliases")) + extra.get((key, eid), [])
            entries.append([key, eid, e["name"], "|".join(x for x in dict.fromkeys(names) if x.lower() != e["name"].lower()), (lead_of(e) or "")[:110]])
    entries.extend(TX.search_entries(know["testCategories"], know["medicationTaxonomy"], know["conceptPage"]))
    for p in know["interactions"]["products"]:
        entries.append(["product", p["id"], p["name"], "|".join(p["aliases"]), "Product: " + " + ".join(i["name"] for i in p["ingredients"])])
    return {"entries": entries}

def build_clinical(atlas, know):
    """Compact index for the explorer: names of every entity plus organ/system/structure -> entity ids."""
    names = {key: {eid: e["name"] for eid, e in T["items"].items()} for key, T in know["types"].items()}
    types = {key: {"name": T["meta"]["name"], "singular": T["meta"]["singular"], "dir": T["meta"]["dir"], "page": T["meta"]["page"]} for key, T in know["types"].items()}
    # every name a medicine is known by (generic, aliases, ingredient variants, brands) -> id, so class and taxonomy pages can link member names
    med_index = {}
    for mid, m in know["types"]["medications"]["items"].items():
        for n in [m["name"]] + list(m.get("aliases") or []) + list(m.get("ingredientVariants") or []) + [b for v in (m.get("brands") or {}).values() for b in v]:
            med_index.setdefault(TX.norm(n), mid)
    return {"types": types, "names": names, "medicationIndex": med_index, "terms": know["terms"], **know["anatomy"]}

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
    def match_structures(rule):
        """Structure indices selected by a match rule: exact `names`, a `regex` over names (optionally limited to `systems`,
        a systems-only rule takes the whole system), minus an `exclude` regex. Returns (indices, names that do not exist)."""
        hit = set()
        if not rule: return hit, []
        missing = [nm for nm in rule.get("names", []) if nm not in by_name]
        for nm in rule.get("names", []):
            if nm in by_name: hit.add(by_name[nm])
        rx = re.compile(rule["regex"], re.I) if rule.get("regex") else None
        for i, s in enumerate(structs):
            if rule.get("systems") and s["system"] not in rule["systems"]: continue
            if rx is None and not rule.get("names"): hit.add(i)            # systems-only rule: whole system
            elif rx and rx.search(s["name"]): hit.add(i)
        if rule.get("exclude"):
            ex = re.compile(rule["exclude"], re.I); hit = {i for i in hit if not ex.search(structs[i]["name"])}
        return hit, missing
    # An organ without a `match` rule has no geometry in the atlas (BodyParts3D is one adult male body, so the female
    # reproductive organs and surgically constructed anatomy are not among its pieces). Such an organ must carry a full
    # anatomy article, and may name the modelled structures around it (`nearby`), which its page and the pages that
    # concern it show in 3D instead.
    out_organs = []; unmodelled = []
    for o in organs:
        m = o.get("match") or {}
        hit, missing = match_structures(m)
        for nm in missing: print(f"  organ {o['id']}: name not found: {nm}", file=sys.stderr)
        if m and not hit: print(f"  organ {o['id']}: NO MATCHES", file=sys.stderr)
        rec = {"id": o["id"], "name": o["name"], "system": o["system"], "region": o.get("region"), "summary": o["summary"], "aliases": o.get("aliases", []),
               "urlAliases": o.get("urlAliases", []), "updated": o.get("updated") or organs_updated, "structures": sorted(hit, key=lambda i: structs[i]["name"])}
        if not m:
            unmodelled.append(o["id"])
            if o["id"] not in articles: errors.append(f"organs/{o['id']}: an organ without atlas geometry (no match rule) needs a full article in anatomy.json")
        if o.get("nearby"):
            near, missing_near = match_structures(o["nearby"])
            for nm in missing_near: errors.append(f"organs/{o['id']}: nearby: unknown structure name '{nm}'")
            near = sorted(near - hit, key=lambda i: structs[i]["name"])
            if len(near) > 12: errors.append(f"organs/{o['id']}: nearby resolves to {len(near)} structures; keep it to 12 or fewer (the explorer link and preview name carry every id)")
            rec["nearby"] = near
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
    if unmodelled: print(f"  organs without atlas geometry (anatomy article, surrounding structures in 3D): {', '.join(unmodelled)}", file=sys.stderr)
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
    know_out = {k: v for k, v in know.items() if k not in ("testCategories", "medicationTaxonomy", "review", "conceptPage")}
    for fname, obj in (("knowledge.json", know_out), ("clinical.json", clinical), ("search-index.json", search_index), ("aliases.json", know["aliases"]), ("interactions.json", know["interactions"]), ("comparisons.json", know["comparisons"]),
                       ("test-categories.json", know["testCategories"]), ("medication-taxonomy.json", know["medicationTaxonomy"]), ("review-queues.json", know["review"]),
                       ("vocabularies.json", {k: v for k, v in TX.VOCAB.items() if not k.startswith("_")})):
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
              "testCategories": len(know["testCategories"]["categories"]), "testConcepts": len(TX.CONCEPTS), "classConcepts": sum(len(g["classes"]) for a in know["medicationTaxonomy"]["areas"] for g in a["groups"]), "edges": len(know["edges"]),
              **{k: len(T["items"]) for k, T in know["types"].items()}}
    write_site_meta(site, counts, atlas)
    for o in out_organs: print(f"  organ {o['id']:16s} {len(o['structures']):4d} structures{'  · article' if o.get('article') else ''}")
    for r in out_regions: print(f"  region {r['id']:14s} {len(r['structures']):4d} structures")
    print("wrote", os.path.join(OUT, "atlas-content.json"), os.path.getsize(os.path.join(OUT, "atlas-content.json")), "bytes")

if __name__ == "__main__":
    main()
