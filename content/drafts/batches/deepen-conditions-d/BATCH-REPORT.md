# Batch report: deepen-conditions-d

Eight in-depth `article` blocks added by patch to existing condition pages. All eight passed the two-pass protocol (first pass from retrieved text with a sentence ledger; independent second pass by separate subagents that re-retrieved and classified every sentence). Only supported or textbook sentences remain. `check_batch.py` ends with `ok`.

**Finished:** pneumonia, myocardial-infarction, deep-vein-thrombosis, pulmonary-embolism, type-1-diabetes, ovarian-cancer, cervical-cancer, polycystic-ovary-syndrome. **Skipped:** none.

**Searches used:** about 127 of 200 (28 in the first pass, 99 in the second pass). I stopped there because every item had been checked.

| Item | First-pass sentences | Kept (supported/textbook) | Cut or reworded (unsupported/wrong/unsafe) | Second-pass searches |
| --- | --- | --- | --- | --- |
| cervical-cancer | 60 | 31 | 29 | 14 |
| deep-vein-thrombosis | 61 | 27 | 34 | 14 |
| myocardial-infarction | 62 | 35 | 27 | 11 |
| ovarian-cancer | 58 | 27 | 31 | 14 |
| pneumonia | 58 | 44 | 14 | 11 |
| polycystic-ovary-syndrome | 55 | 18 | 37 | 10 |
| pulmonary-embolism | 55 | 24 | 31 | 8 |
| type-1-diabetes | 60 | 34 | 26 | 17 |

The second pass changed 14 to 37 of every 55 to 62 sentences, a higher cut rate than earlier batches. Mostly the search summaries had blended pages, so attributions to named hospital leaflets, Royal Marsden, NHS inform or Target Ovarian Cancer could not be confirmed and were removed or generalised.

## For the reviewer

* **Length:** because unsupported text was removed rather than padded, sections and FAQs are shorter than the brief's targets (110 to 220 words per section, 40 to 90 per FAQ). Articles are about 480 to 810 words of section prose; the compiler accepts them. DVT has 3 FAQs (brief: 4 to 6). Fuller pages need another retrieval round, which this budget did not cover.
* **Reports hold the evidence:** `reports/<id>.report.json` lists each claim's classification, evidence and replacement. `ledgers/<id>.ledger.json` is the first pass; the published text is the ledger after the report's edits. `src/` holds the scripts that applied them.
* **Possible contradictions with existing fields (not changed):**
  * deep-vein-thrombosis: existing text says "Same-day assessment"; NICE wording of the scan timing differs from NHS "within 24 hours" (the checker reworded the article to match NICE). Worth a look.
  * polycystic-ovary-syndrome: the existing text says clomifene or letrozole for ovulation induction; the checker found no NHS source making clomifene "usually first" and ESHRE 2018 lists letrozole first. NHS inform now titles the condition "polyendocrine metabolic ovarian syndrome (PMOS)"; what nhs.uk itself calls it was not retrieved, and the existing references point at an nhs.uk "pmos" URL.
  * type-1-diabetes: the existing prevention text mentions immunotherapy delaying onset (teplizumab); NICE and Diabetes UK have news items on this which I did not use.
  * myocardial-infarction: the existing treatment text says angioplasty "within about two hours" for thrombolysis and "an ACE inhibitor"; the article does not repeat these and they were not checked.
* **Emergency routes:** 999 wording was checked by the second pass for heart attack, pulmonary embolism, DKA and DVT with breathlessness or chest pain.
* No medicine in this batch is a plain substance in `content/interactions.json` that I added; no new ids or aliases were created.
