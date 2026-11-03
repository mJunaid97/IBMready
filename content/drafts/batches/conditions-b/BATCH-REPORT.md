# Batch conditions-b: cancers people search for

Date checked: 2026-11-03. `fragment.json` validates (`check_batch.py` ends `ok`, all 8 pages publishable, 8 to 15 references each).

## Items finished (all 8)
pancreatic-cancer, prostate-cancer, lymphoma, skin-cancer, thyroid-cancer, bladder-cancer, testicular-cancer, brain-tumour. None skipped.

## Searches used: about 141 of 200
First pass 33 (pancreatic 5, prostate 4, lymphoma 3, skin 4, thyroid 4, bladder 3, testicular 4, brain 6). Second pass 108 (14 each, except bladder 11 and prostate 13), run by separate subagents with differently worded queries.

## Second-pass results (first-pass sentences)
| Item | supported | textbook | unsupported | wrong | unsafe |
| --- | --- | --- | --- | --- | --- |
| pancreatic-cancer | 61 | 1 | 27 | 2 | 0 |
| prostate-cancer | 51 | 2 | 35 | 0 | 0 |
| lymphoma | 52 | 1 | 26 | 0 | 2 |
| skin-cancer | 74 | 5 | 19 | 9 | 0 |
| thyroid-cancer | 54 | 3 | 37 | 0 | 0 |
| bladder-cancer | 46 | 1 | 46 | 0 | 0 |
| testicular-cancer | 74 | 1 | 22 | 2 | 0 |
| brain-tumour | 51 | 2 | 38 | 3 | 0 |

Unsupported/wrong sentences were reworded to what retrieved text says or removed; published text holds only supported or textbook sentences. `ledgers/` match the final text; `reports/` cover every first-pass sentence. `work/` holds first-pass and final entity files for traceability (the merged `fragment.json` uses the `*.final.entity.json` versions).

## For a human reviewer
* **Search summaries blend pages.** NHS and CRUK pages were never opened (WebFetch is blocked), so many single-page attributions are best-effort; ledger notes flag the weakest. Please spot-check against the live pages before publication.
* **Prostate screening (sensitive).** The page states the NHS position (no national programme; PSA not routinely offered except with a BRCA2 change) and that the UK National Screening Committee has recommended targeted screening only for some men with a BRCA2 variant and family history; the second-pass searches reported this as a 2026 recommendation agreed by ministers, with no start date found. Verify this wording against the current UK NSC and NHS pages. A dated 2016 PHE blog sentence was cut at assembly.
* **Routes to care.** 999 is named only where retrieved NHS text supports it (brain tumour seizure/severe headache; thyroid goitre breathing difficulty). Other pages name an urgent or routine GP, NHS 111 or the two-week referral only.
* **Lymphoma:** the word "cured" was removed everywhere (no official retrieved text used it for the whole group). `related` is empty for lymphoma, skin and testicular cancer because no suitable existing page was connected by sources.
* **Thyroid:** hyperthyroidism was dropped from `related` because Macmillan says an overactive or underactive thyroid does not raise the risk (the brief had suggested it). `hypothyroidism` stays as a topical link.
* **Testicular:** age ranges differ by source and are attributed as such; "non-binary people" was removed because it was not retrieved.
* **Aliases/ids:** no alias clashes and no patches needed. Skin-cancer urlAliases: melanoma, basal-cell-carcinoma, non-melanoma-skin-cancer. No medicine names added to `content/interactions.json`.
* Source coverage gaps: NICE pages (CKS/BNF) and some charities (Lymphoma Action, Orchid, BTF) were rarely returned; where absent they are not cited.
