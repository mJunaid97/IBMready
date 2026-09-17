"""common.py — shared helpers of the terminology ingestion pipelines (tools/terminology/loinc.py, rxnorm.py).

The pipelines turn an authoritative terminology release into candidates for the Anatomy Nexus catalogue and
verify the identifiers the content asserts. They never write pages: a public page is written by a person and
must pass the compiler's quality gate (Comprehensive Clinical Tests & Medications specification §84–§86).

Both pipelines read the site's own content (content/*.json, the taxonomies) through this module, normalise
names the same way the compiler does, and write:

  data/terminology/<source>-candidates.json   canonical candidate concepts with their codes, deduplicated variants,
                                              deprecation flags and the catalogue/page they match (git-ignored:
                                              derived from a licensed release)
  data/terminology/<source>-queues.json       review queues for the editorial team (§94)
  content/terminology-verification.json       (with --write-verification) the codes asserted in content that the
                                              release confirms; the compiler marks them "verified"

Licensing (§102): LOINC is distributed under the LOINC licence (free, registration and attribution required);
RxNorm under the UMLS Metathesaurus licence terms for RxNorm (the RxNorm files themselves are free of charge;
some source vocabularies inside the full release are restricted, and only SAB=RXNORM, ATC and MED-RT rows are
read here); ATC/DDD is © WHO Collaborating Centre for Drug Statistics Methodology. Check redistribution rights
before committing anything derived from a release; the candidate files stay out of the repository by default.
"""
import collections, csv, datetime, json, os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT = os.path.join(ROOT, "content")
OUT_DIR = os.path.join(ROOT, "data", "terminology")

def today(): return datetime.date.today().isoformat()

def load_content(name, default=None):
    p = os.path.join(CONTENT, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default

def norm(s):
    """The compiler's name normalisation: ASCII, lower case, runs of non-alphanumerics collapsed to one space."""
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

def slug(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower().replace("&", " and ").replace("/", " ")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(obj, open(path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    open(path, "a", encoding="utf-8").write("\n")
    return path

def read_delimited(path, delimiter=",", encoding="utf-8-sig", max_rows=None):
    """Rows of a CSV (LOINC) or pipe-delimited RRF file (RxNorm) as dicts; RRF files have no header, so callers pass `fields`."""
    with open(path, encoding=encoding, newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        for i, row in enumerate(reader):
            if max_rows and i >= max_rows: break
            yield row

def read_rrf(path, fields, max_rows=None):
    """RxNorm RRF: pipe-delimited, no header, a trailing pipe on every line."""
    with open(path, encoding="utf-8", newline="") as f:
        for i, line in enumerate(f):
            if max_rows and i >= max_rows: break
            parts = line.rstrip("\n").split("|")
            yield dict(zip(fields, parts))

class NameIndex:
    """name/synonym/abbreviation → the catalogue concept or page that owns it, for matching release records (§84 steps 3–6)."""
    def __init__(self):
        self.exact = collections.defaultdict(set)     # normalised full name -> {(kind, id)}
        self.abbr = collections.defaultdict(set)      # normalised abbreviation -> {(kind, id)}
        self.names = {}                                # (kind, id) -> display name
    def add(self, kind, ident, name, synonyms=(), abbreviations=()):
        self.names[(kind, ident)] = name
        for n in [name, *synonyms]:
            if n: self.exact[norm(n)].add((kind, ident))
        for a in abbreviations:
            if a: self.abbr[norm(a)].add((kind, ident))
    PRIORITY = ["tests", "imaging", "procedures", "biomarkers", "medications", "products", "drug-classes", "concept"]
    def match(self, candidates):
        """The owner of any of the candidate names: a page wins over a catalogue concept (the compiler already ties the two together);
        among pages a test wins over the biomarker it measures; two owners of the same rank are ambiguous → None."""
        hits = set()
        for c in candidates:
            hits |= self.exact.get(norm(c), set())
        if not hits: return None
        best = min(self.PRIORITY.index(k) if k in self.PRIORITY else 99 for k, _ in hits)
        top = [h for h in hits if (self.PRIORITY.index(h[0]) if h[0] in self.PRIORITY else 99) == best]
        return top[0] if len(top) == 1 else None
    def match_abbreviation(self, abbr):
        hits = self.abbr.get(norm(abbr), set())
        return next(iter(hits)) if len(hits) == 1 else None

def site_index():
    """Index of the site's catalogued test concepts (kind 'concept'), test pages, imaging pages, medicines, classes and products."""
    idx = NameIndex()
    tax = load_content("test-taxonomy.json", {"concepts": []})
    for c in tax["concepts"]: idx.add("concept", c["id"], c["name"], c.get("synonyms") or [], c.get("abbreviations") or [])
    tests = load_content("tests.json", {"tests": {}})["tests"]
    for tid, t in tests.items():
        if tid.startswith("_"): continue
        idx.add("tests", tid, t["name"], [t.get("canonicalName") or "", *(t.get("aliases") or [])], t.get("abbreviations") or [])
    bio = load_content("biomarkers.json", {"biomarkers": {}})["biomarkers"]
    for bid, b in bio.items():
        if not bid.startswith("_"): idx.add("biomarkers", bid, b["name"], b.get("aliases") or [])
    meds = load_content("medications.json", {"medications": {}})["medications"]
    for mid, m in meds.items():
        if mid.startswith("_"): continue
        idx.add("medications", mid, m["name"], [*(m.get("aliases") or []), *(m.get("ingredientVariants") or [])])
    classes = load_content("drug-classes.json", {"classes": {}})["classes"]
    for cid, c in classes.items():
        if not cid.startswith("_"): idx.add("drug-classes", cid, c["name"], c.get("aliases") or [])
    products = load_content("products.json", {"products": {}})["products"]
    for pid, p in products.items():
        if not pid.startswith("_"): idx.add("products", pid, p.get("name") or pid, p.get("aliases") or [])
    return idx

def asserted_codes():
    """Every terminology identifier the content asserts: {system: {code: [entity...]}} for LOINC, RxNorm, ATC, FDA EPC."""
    out = {"loinc": collections.defaultdict(list), "rxnorm": collections.defaultdict(list), "atc": collections.defaultdict(list), "fdaEpc": collections.defaultdict(list)}
    for fname, root in (("tests.json", "tests"), ("biomarkers.json", "biomarkers"), ("imaging.json", "imaging"), ("medications.json", "medications"), ("drug-classes.json", "classes")):
        items = (load_content(fname, {}) or {}).get(root) or {}
        for eid, e in items.items():
            if eid.startswith("_"): continue
            t = e.get("terminology") or {}
            where = f"{root}/{eid}"
            for x in (t.get("loinc") or []) if isinstance(t.get("loinc"), list) else ([t["loinc"]] if t.get("loinc") else []):
                out["loinc"][str(x["code"] if isinstance(x, dict) else x)].append(where)
            if t.get("rxcui"): out["rxnorm"][str(t["rxcui"])].append(where)
            for a in (t.get("atc") or []) if isinstance(t.get("atc"), list) else ([t["atc"]] if t.get("atc") else []): out["atc"][str(a)].append(where)
            for x in (t.get("fdaEpc") or []) if isinstance(t.get("fdaEpc"), list) else ([t["fdaEpc"]] if t.get("fdaEpc") else []): out["fdaEpc"][str(x)].append(where)
    return {k: dict(v) for k, v in out.items()}

def merge_verification(section, records, write=False):
    """Merge verified codes into content/terminology-verification.json ({loinc: {code: {...}}, rxnorm: {...}, atc: {...}, fdaEpc: {...}})."""
    p = os.path.join(CONTENT, "terminology-verification.json")
    cur = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {"_about": "Terminology identifiers asserted in content/ that tools/terminology/*.py confirmed against a licensed release. Generated: run the pipeline with --write-verification after each release import; the compiler marks confirmed codes as verified."}
    cur.setdefault(section, {}).update(records)
    cur["_updated"] = today()
    if write: write_json(p, cur)
    return cur

def report(title, lines):
    print(title)
    for l in lines: print("  " + l)
