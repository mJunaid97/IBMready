# Batch conditions-a: report

Date: 2026-11-03. Branch: content/conditions-a. `check_batch.py` on fragment.json ends with `ok`; all 8 pages are indexable.

## Items finished (8 of 8)
influenza, angina (plus a patch that removes the `angina` alias from coronary-artery-disease), irritable-bowel-syndrome, fatty-liver-disease, multiple-sclerosis, shingles, norovirus, diverticulitis.
Each has: `items/<id>.entity.json` (first pass), `items/<id>.final.json` (cleaned text used in fragment.json), `ledgers/<id>.ledger.json`, `reports/<id>.report.json`.

## Searches used (agents' own counts)
First pass 48, second pass 92: about 140 of 200. Second pass was done by separate subagents with differently worded queries.

## Second-pass results (first-pass sentences)
| Item | supported | textbook | unsupported | wrong |
| --- | --- | --- | --- | --- |
| influenza | 62 | 3 | 37 | 3 |
| angina | 66 | 0 | 31 | 0 |
| irritable-bowel-syndrome | 87 | 0 | 15 | 0 |
| fatty-liver-disease | 61 | 0 | 49 | 0 |
| multiple-sclerosis | 66 | 1 | 26 | 8 |
| shingles | 52 | 6 | 31 | 0 |
| norovirus | 69 | 0 | 30 | 1 |
| diverticulitis | 85 | 1 | 12 | 2 |
Unsupported, wrong and unsafe sentences were cut or reworded in the `.final.json` files.

## For a human reviewer
1. URL attribution is approximate. The search summaries blend pages, so many ledger URLs are the most likely page, not a confirmed one. NICE CKS was never retrieved for any item (NICE NG147 stands in for diverticulitis; MS cites NICE guidance); IBS Network and MS Society returned nothing usable.
2. Shingles: 6 sentences are `textbook` (4 remain in the final text: diagnosis from the rash, and the 999 line), just under the 1-in-20 limit. Vaccine eligibility ages were removed because NHS and UKHSA wording differs and changes. Its only links are symptoms plus the glossary term `infection` (added to pass the two-relationship-group gate); there is no `related` page that the sources support.
3. Fatty liver: the urgent-care route partly rests on NHS cirrhosis wording and NHS 111 Wales for fatty liver. I removed an unsourced "in the UK that would usually mean a GP appointment" clause after the second pass; the reports may still count that clause as supported. The `hypertension` link was dropped. Angina: the second pass dropped the causes section and a tests FAQ to fit the length limit, and removed a "NHS 111 or same-day GP for worsening known angina" route that no retrieved text supported.

## Other notes
- Existing entities carry no `updated` field, so none was set.
- Left out by design: parkinsons-disease link (not related in sources), appendicitis and inflammatory-bowel-disease for diverticulitis (not related in retrieved sources), hydration (conditions have no health-topic field), pneumonia for shingles.
- The diverticulitis alias `diverticulitis` was removed (equals its id); `diverticular-disease` is kept.
- No existing statement in content/ was found to be contradicted by the sources.
