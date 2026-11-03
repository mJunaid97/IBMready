# Batch meds-b: diabetes and cardiovascular medicines

All 7 items finished: dapagliflozin, empagliflozin, semaglutide, tirzepatide, gliclazide, spironolactone, ezetimibe. New classes: sglt2-inhibitors, glp-1-receptor-agonists, sulfonylureas, mineralocorticoid-receptor-antagonists, cholesterol-absorption-inhibitors. No item skipped. Each has a ledger (final published sentences), a second-pass report (counts over all first-pass sentences) and an article block.

Searches: about 165 of 200 (first pass 68, second pass 89, lead 5, plus a few retried after a usage-limit error). The second pass cut or reworded 20 to 40 percent of first-pass sentences (for example empagliflozin 37 of 81, tirzepatide 29 of 77, gliclazide 29 of 72, semaglutide 28 of 89).

## Needs the maintainer (cannot be fixed inside this directory)
1. **check_batch.py crashes on new drug classes.** `tools/taxonomy.py` line 373 does `c["id"]` on a string when a class is missing from `content/medication-taxonomy.json`; all five new classes are unlisted. Validated instead in a scratch copy with the five classes added to the taxonomy: the merge is clean and the only compiler errors are item 2. Add the classes to the taxonomy (or fix the bug) before merging.
2. **content/interactions.json re-pointing.** `losartan-spironolactone` and `lisinopril-spironolactone` name "Spironolactone" as a plain substance (compiler error once the page exists: use the medication id). "ezetimibe" also appears as a plain substance in that file (no compiler error seen, but re-point it).
3. Publishing gate (noindex check) could not be run because of items 1 and 2; run check_batch again after they are fixed.

## Things a human reviewer should look at
- **Spironolactone:** high blood pressure and resistant hypertension were removed as uses and the `hypertension` link dropped, because no retrieved NHS text stated them (they are NHS-listed uses in practice; re-add after one NHS retrieval). Interaction themes are attributed to US prescribing information plus a UK SmPC contraindication. The second pass used 14 searches (cap 13) and rebuilt the first-pass ledger from printed text, so its report ids follow first-pass order.
- **Hypoglycaemia 999 wording (gliclazide):** taken from NHS Scotland and NHS trust leaflets, not the nhs.uk hypoglycaemia page; check the live page.
- **Route-to-care lines** (999 / NHS 111 / GP same day) for ketoacidosis, Fournier's gangrene and pancreatitis follow the site signposting rule where the retrieved text only said "urgent". They are logged as textbook where so.
- **Regulatory "prescription"** status is inferred from NHS and emc wording ("prescribed"), not a verbatim "prescription only" statement, for several items.
- **NICE TA924 (tirzepatide)** was updated in August 2026; only generic wording is used. NICE TA775 (dapagliflozin CKD) is flagged by NICE as under review.
- **productType** is `small-molecule` for the two peptide medicines (semaglutide, tirzepatide); no vocabulary id fits a peptide well.
- Source mixing: many NHS attributions rest on search summaries that blend pages. Ledger notes say where.
- Some references use hospital-trust or local formulary pages (UK) where nhs.uk text was not returned; US sources (FDA, MedlinePlus) are marked US in prose.
- Reference hosts not in the source table (tier 3 note): bad.org.uk, diabetes.org.uk, heartuk.org.uk.
- `tirzepatide` alias "tirzepatide" removed (it equals a class member name); class `medications` lists both semaglutide and tirzepatide. Class `members` for sulfonylureas and the MRA class name drugs without pages (glimepiride, glipizide, tolbutamide, eplerenone).
