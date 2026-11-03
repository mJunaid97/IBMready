# Batch report: guides-everyday-2 (prevention and self-care guides)

## Finished (10 guides, all through the independent second pass; `check_batch.py` ends with `ok`)

| Guide | Sentences | Supported | Textbook | Unsupported (edited or removed) | Wrong |
| --- | --- | --- | --- | --- | --- |
| lower-blood-pressure-with-lifestyle-changes | 30 | 22 | 1 | 7 | 0 |
| being-active-with-a-long-term-health-condition | 23 | 14 | 1 | 8 | 0 |
| eating-well-with-type-2-diabetes | 28 | 19 | 0 | 8 | 1 |
| diabetes-foot-care-daily-checks-and-annual-review | 28 | 15 | 0 | 13 | 0 |
| sun-safety-and-checking-your-skin | 29 | 22 | 0 | 7 | 0 |
| preventing-food-poisoning-at-home-the-four-cs | 25 | 14 | 0 | 11 | 0 |
| looking-after-your-teeth-and-gums | 27 | 20 | 0 | 7 | 0 |
| protecting-your-hearing-from-loud-noise | 28 | 20 | 0 | 8 | 0 |
| eye-tests-who-gets-a-free-nhs-sight-test | 27 | 20 | 0 | 7 | 0 |
| how-to-read-food-labels-traffic-lights-and-salt | 22 | 20 | 0 | 2 | 0 |

Across 267 first-pass sentences the second pass found 80 unsupported and 1 wrong (about 30%). Every one was edited to what the re-retrieved text supports or removed; the published text is the corrected text. Per-sentence classifications and replacements are in `reports/`; first-pass ledgers are in `ledgers/`.

## Dropped

* Healthy ageing (muscles and bones): already covered by the activity, falls and bone-health guides.
* Cutting down on alcohol: the alcohol-units guide already has a section on this.
* Heart-healthy eating: overlaps the cholesterol, Eatwell and new blood pressure guides.

## Things a reviewer should look at

* **Length.** The guides are 280 to 480 words of body text, below the 700 to 1,000 target in `guides.md` (the compiler accepts them). Searches return summaries, so each topic supported only 22 to 30 sentences. I preferred short and verified over padded.
* **Searches.** About 105 of 200 were used (36 first pass, about 68 second pass, counts self-reported by the checkers). The remaining budget was not spent, so fewer guides were produced than the 10 to 12 aimed for in a tight session; this was the main shortfall.
* **Evidence quality.** The search tool returns blended summaries, not page text. Several claims rest on NHS trust leaflets, which are named as such in the text. The checkers flagged: NHS glaucoma and diagnosis page claims (eye guide) confirmed through the diagnosis page and trust pages; salt label thresholds (labels guide) confirmed through the NHS food-labels page; the ABCDE checklist (sun guide) comes from Cancer Research UK and a hospital page, not nhs.uk; free-test eligibility details (eye guide) are softened to "the NHS page gives the details".
* **Textbook sentences.** Three, each signposting only (call 999 in an emergency).
* **England/Scotland.** NHS inform is Scottish; sentences drawing on it say so where it matters (eye tests, dental recall). Free sight test and dental eligibility are England only.
* **Existing site pages.** No contradictions found with existing pages. The blood pressure guide overlaps `high-blood-pressure-what-happens-next` by design (lifestyle only).
* No interactions-record or alias issues. No files outside this directory were changed.
