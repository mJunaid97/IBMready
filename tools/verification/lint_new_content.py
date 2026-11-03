#!/usr/bin/env python3
"""Advisory lint for new or changed content: the writing rules of docs/authoring/README.md that a program can check.

usage: python3 tools/verification/lint_new_content.py <fragment.json> [<fragment.json> ...] [--strict] [--quiet]

Reads the same fragments as check_batch.py ({"conditions": {...}, "medications": {...}, "blog": {...}, "patch": {...}}) and flags
sentences that break a rule the second-pass reviewers can miss:

  dose       a dose, strength or schedule in prose (no doses, dosing schedules or cut-offs in prose)
  command    an instruction to an individual ("you should", "do not stop taking", "take two tablets")
  absolute   "safe", "cured", "nothing to worry about", "100%": claims the sources never make
  us-spell   a US spelling in a UK-English site
  markdown   markdown or HTML in plain text fields
  no-route   urgency is mentioned ("emergency", "urgent", "immediately") but no route to care is named in the same paragraph
  crisis     a mental-health page without the crisis route (999, NHS 111, Samaritans 116 123)

Findings are advice for the human reviewer, not compiler errors; the exit status is 0 unless --strict is given and a "dose",
"command" or "absolute" finding exists. A flagged sentence is often fine ("do not drive" quoted from the NHS); read it in context.
"""
import json, re, sys

SKIP_KEYS = {"references", "brands", "name", "aliases", "urlAliases", "ingredientVariants", "dosageFormIds", "routeIds", "terminology", "regulatory", "source", "published",
             "updated", "kind", "category", "categories", "id", "type", "links", "anatomy", "productType", "abbreviations", "searchTerms", "class", "drugClass", "metaDescription",
             "conditions", "medications", "tests", "symptoms", "physiology", "health", "procedures", "imaging", "biomarkers", "drugClasses", "related", "terms", "members", "headline"}
DOSE = re.compile(r"\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|microgram|micrograms|µg|g|ml|mL|IU|units?|tablets?|capsules?|puffs?|drops?)\b(?!\s?(?:of\s)?(?:alcohol|sugar|salt|fat|fibre))", re.I)
SCHEDULE = re.compile(r"\b(?:once|twice|three times|four times)\s+(?:a|per|each|every)\s+(?:day|week|night|morning)|\bevery\s+\d+\s+hours\b|\b\d+\s+times\s+(?:a|per)\s+day\b", re.I)
COMMAND = re.compile(r"\b(?:you should|you must|you need to|you have to|you can take|make sure you|be sure to)\b|\b(?:do not|don't|never)\s+(?:take|stop(?!\s+(?:within|after|with|despite|even|when|for|on their own))|use|drive|drink|skip|miss)\b|\bstop taking\b|\btake (?:one|two|three|\d+)\s+(?:tablets?|capsules?|puffs?|drops?|doses?|pills?)\b", re.I)
ABSOLUTE = re.compile(r"\b(?:completely safe|totally safe|is safe|are safe|perfectly safe|safe to|cured|cures|curable|nothing to worry about|100\s?%|(?<!not )guaranteed|no risk)\b", re.I)
US_STEMS = {"anemi": "anaemi", "esophag": "oesophag", "pediatric": "paediatric", "tumor": "tumour", "diarrhea": "diarrhoea", "edema": "oedema", "estrogen": "oestrogen", "hemoglobin": "haemoglobin",
            "hemorrhag": "haemorrhag", "hemorrhoid": "haemorrhoid", "leukemi": "leukaemi", "orthopedic": "orthopaedic", "gynecolog": "gynaecolog", "gonorrhea": "gonorrhoea", "hematolog": "haematolog",
            "ischemi": "ischaemi", "anesthe": "anaesthe", "cesarean": "caesarean", "acetaminophen": "paracetamol", "epinephrine": "adrenaline", "albuterol": "salbutamol",
            "dyspnea": "breathlessness", "hyperlipidemia": "hyperlipidaemia", "hypoglycemi": "hypoglycaemi", "hyperglycemi": "hyperglycaemi", "glycemi": "glycaemi", "septicemia": "septicaemia", "bacteremia": "bacteraemia"}
US_WORDS = {"color": "colour", "behavior": "behaviour", "center": "centre (not in a proper name such as Centers for Disease Control)", "fiber": "fibre", "liter": "litre", "aluminum": "aluminium", "labor": "labour (childbirth)", "favor": "favour", "ostomy": "stoma", "pajamas": "pyjamas"}
MARKDOWN = re.compile(r"\*\*|__|^#{1,6}\s|\n[-*]\s|\[[^\]]+\]\([^)]+\)|`|<[a-z/][^>]*>", re.I)
URGENT = re.compile(r"\b(?:emergency|emergencies|urgent|urgently|immediately|straight away|as soon as possible)\b", re.I)
ROUTE = re.compile(r"\b(?:999|112|111|a&e|accident and emergency|emergency department|gp\b|doctor|pharmacist|midwife|nhs 111|samaritans|ambulance|healthcare professional|clinician|prescriber|emergency services|poison|get medical help|medical advice|seek (?:medical )?help|contact)\b", re.I)
MENTAL = re.compile(r"\b(?:depression|anxiety|suicid|self-harm|bipolar|ptsd|ocd|panic attack|antidepressant|mental health|psychosis)\b", re.I)
MENTAL_IDS = {"anxiety-disorders", "depression", "bipolar-disorder", "ptsd", "ocd", "adhd", "autism", "insomnia"}
CRISIS = re.compile(r"999.*(?:111|samaritans)|samaritans.*116\s?123|116\s?123", re.I | re.S)


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z(\"'])|\n\n+", text) if s.strip()]


def strings(node, path=""):
    """Yield (path, text) for every prose string of an entity."""
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, list):
        for i, v in enumerate(node): yield from strings(v, f"{path}[{i}]")
    elif isinstance(node, dict):
        for k, v in node.items():
            if k in SKIP_KEYS: continue
            yield from strings(v, f"{path}.{k}" if path else k)


def lint_entity(coll, eid, ent):
    out = []
    whole = []
    for path, text in strings(ent):
        whole.append(text)
        if len(text) < 25: continue
        if MARKDOWN.search(text): out.append(("markdown", path, text[:140]))
        paragraphs = re.split(r"\n\n+", text)
        leaf = path.rsplit(".", 1)[-1]
        for para in paragraphs:
            if leaf in ("heading", "q") or len(para) < 80: continue
            if URGENT.search(re.sub(r"emergency contracepti\w*", "", para, flags=re.I)) and not ROUTE.search(para): out.append(("no-route", path, para.strip()[:140]))
        for s in sentences(text):
            m = DOSE.search(s) or SCHEDULE.search(s)
            if m: out.append(("dose", path, f"[{m.group(0)}] {s[:150]}"))
            m = COMMAND.search(s)
            if m: out.append(("command", path, f"[{m.group(0)}] {s[:150]}"))
            m = ABSOLUTE.search(s)
            if m: out.append(("absolute", path, f"[{m.group(0)}] {s[:150]}"))
            low = s.lower()
            low_np = re.sub(r"centers? for disease control|national centers? for|centers? for medicare", "", low)       # proper names keep their spelling
            hit = next(((us, uk) for us, uk in US_STEMS.items() if re.search(r"\b" + re.escape(us), low_np)), None) or next(((us, uk) for us, uk in US_WORDS.items() if re.search(r"\b" + re.escape(us) + r"s?\b", low_np)), None)
            if hit: out.append(("us-spell", path, f"{hit[0]} -> {hit[1]}: {s[:100]}"))
    joined = "\n".join(whole)
    if (re.search(r"suicid|self-harm", joined, re.I) or eid in MENTAL_IDS or (coll in ("blog", "medications") and len(MENTAL.findall(joined)) >= 6)) and not CRISIS.search(joined):
        out.append(("crisis", "(page)", "mental-health content without the crisis route (999, NHS 111, Samaritans 116 123)"))
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]; strict = "--strict" in sys.argv; quiet = "--quiet" in sys.argv
    if not args: print(__doc__); return 2
    findings = []
    for a in args:
        fr = json.load(open(a, encoding="utf-8"))
        items = []
        for coll, ents in fr.items():
            if coll == "patch":
                for pc, pe in ents.items():
                    for eid, ent in pe.items(): items.append((pc, eid + " (patch)", ent))
            else:
                for eid, ent in ents.items(): items.append((coll, eid, ent))
        for coll, eid, ent in items:
            for rule, path, text in lint_entity(coll, eid, ent): findings.append((a, coll, eid, rule, path, text))
    by_rule = {}
    for f in findings: by_rule[f[3]] = by_rule.get(f[3], 0) + 1
    if not quiet:
        for a, coll, eid, rule, path, text in findings: print(f"{rule:9} {coll}/{eid} {path}: {text}")
    print(f"{len(findings)} finding(s): " + (", ".join(f"{k} {v}" for k, v in sorted(by_rule.items())) or "none"))
    if strict and any(r in by_rule for r in ("dose", "command", "absolute")): return 1
    return 0


if __name__ == "__main__": sys.exit(main())
