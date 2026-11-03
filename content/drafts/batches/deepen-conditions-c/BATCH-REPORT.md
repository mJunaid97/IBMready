# Batch deepen-conditions-c: report

Date: 2026-11-03. Branch: content/deepen-conditions-c. `check_batch.py` on fragment.json ends with `ok`; all 8 pages stay indexable.

## Items finished (8 of 8)
epilepsy, parkinsons-disease, alzheimers-disease, chronic-kidney-disease, anaemia, hypothyroidism, hyperthyroidism, gout. None skipped. Each is a `patch` with an `article` block and appended `references`. No existing field was changed.
Files per item: `items/<id>.draft.json` (first pass), `items/<id>.final.json` (text used in fragment.json), `ledgers/<id>.ledger.json` (first-pass sentence ledger), `reports/<id>.report.json` (second pass).

## Searches used (agents' own counts)
First pass 39 (authors, 3 to 7 each), second pass 104 (8 independent checkers, 13 each): 143 of 200. Authors and checkers were separate subagents; checkers did not read the ledgers before searching and used differently worded queries.

## Second-pass results (sentences classified; the checkers' counts include replacement sentences they added from retrieved text)
| Item | supported | textbook | unsupported | wrong | unsafe | words (sections, FAQs, key facts) |
| --- | --- | --- | --- | --- | --- | --- |
| epilepsy | 42 | 0 | 27 | 0 | 2 | 1256 |
| parkinsons-disease | 51 | 1 | 28 | 0 | 0 | 1119 |
| alzheimers-disease | 29 | 3 | 36 | 1 | 2 | 1352 |
| chronic-kidney-disease | 42 | 0 | 24 | 1 | 4 | 1210 |
| anaemia | 43 | 2 | 19 | 1 | 4 | 1075 |
| hypothyroidism | 56 | 2 | 23 | 0 | 0 | 1066 |
| hyperthyroidism | 60 | 4 | 21 | 0 | 2 | 1264 |
| gout | 37 | 0 | 25 | 6 | 5 | 1141 |

Unsupported, wrong and unsafe sentences were cut or reworded to what the sources say in the `.final.json` files. Alzheimer's lost the most (36 of 64 first-pass sentences). Gout's section prose alone is 776 words, below the 800 target for the article block, but all fields pass the compiler.

## For a human reviewer
1. URL attribution is approximate: search summaries blend pages, so some ledger/report URLs are best-fit pages (flagged in notes). Several sentences rest on NHS 111 Wales, NHS inform, NHS trust leaflets or PMC reviews rather than nhs.uk. NICE CKS and BNF were not returned.
2. Route to care: anaemia's final text has no 999/111 line, because no search returned one (the page's `seekCare` still carries it, unverified). Gout's article routes a hot, feverish joint to an urgent GP appointment or NHS 111 and names no 999 route. Thyroid storm and myxoedema coma use "call 999" as the site's signposting convention (textbook, not retrieved). Alzheimer's names both A&E/999 (an NHS trust page) and urgent GP/NHS 111 (Alzheimer's Society) for sudden confusion; check the wording.
3. Alzheimer's: the NICE position on lecanemab and donanemab was in flux in the retrieved sources; the sentence is neutral and points to NICE. Recheck before publishing.
4. Existing page text the sources do not support or contradict (not changed):
   - epilepsy: overview "Most people become seizure-free on medication" (sources say about 7 in 10 / two-thirds); `symptoms` ids (dizziness, weakness, headache, fatigue) are not what the NHS lists.
   - parkinsons-disease: "a DaT scan can confirm dopamine loss" (sources: helps in uncertain cases; NICE NG71 recommends it only selectively and advises against structural MRI to diagnose).
   - alzheimers-disease: `symptoms` list (fatigue, dizziness, weakness) not supported; "up to 40%" and the anti-amyloid "modest slowing" wording not checked.
   - chronic-kidney-disease: "NHS guidance recommends testing" for family history (the NHS page listed high blood pressure, diabetes and heart disease); SGLT2/ARB/loop diuretic treatment text not covered.
   - anaemia: `treatment` says iron for three months after correction (NHS about six months, NHLBI three to six); "taking them with meals ... reduced absorption" not found.
   - hypothyroidism: overview symptom list and "restores normal life", the six-to-eight-week testing schedule (a schedule in prose), US screening positions, and "commonest cause where iodine is adequate" (NHS: main UK cause) not confirmed.
   - hyperthyroidism: "Graves' disease (autoimmune, 75%)" (NHS says about 4 in 5); weight loss despite appetite, palpitations, sweating not retrieved.
   - gout: "NIAMS ... most controllable", "several times commoner in men", "90%" kidney excretion not retrieved; `seekCare` calls a hot feverish joint an emergency while the article uses an urgent GP/NHS 111 route.
5. No medicine in this batch appears as a new page, so no `interactions.json` re-pointing is needed.
