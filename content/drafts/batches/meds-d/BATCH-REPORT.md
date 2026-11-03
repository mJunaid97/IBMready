# Batch meds-d: antibiotics and urology medicines

Branch `content/meds-d`. Fragment: `fragment.json` (8 medicines, 5 new drug classes). Ledgers in `ledgers/`, second-pass reports in `reports/`, first-pass entities in `work/<id>.entity.json`, corrected finals in `work/<id>.final.json` (the fragment is built from the finals).

## Finished (all 8 items, no skips)
doxycycline (class `tetracyclines`), flucloxacillin and co-amoxiclav (existing `penicillins`), metronidazole (`nitroimidazoles`), nitrofurantoin and trimethoprim (`urinary-antibacterials`, chosen over a separate dihydrofolate-reductase class; created once), tamsulosin (`alpha-blockers`), finasteride (`5-alpha-reductase-inhibitors`). Each has a 600 to 900 word article (sections plus FAQs and key facts).

## Second-pass result (first-pass sentences as found)
Supported 544, textbook 5, unsupported 121, wrong 10, unsafe 21, unchecked 0. Unsupported, wrong and unsafe sentences were cut or reworded to what the retrieved text said. The most cut: tamsulosin (34 of 89), co-amoxiclav (27 of 87), metronidazole (23 of 81), trimethoprim (19 of 85).

## IMPORTANT for the maintainer: validator does not end in "ok" on a stock checkout
`python3 tools/verification/check_batch.py content/drafts/batches/meds-d/fragment.json` crashes with `TypeError: string indices must be integers` in `tools/taxonomy.py` (`build_medication_taxonomy`, line 373): `unmapped_classes = [c["id"] for c in classes ...]` iterates a dict keyed by class id, so `c` is a string. It fires for any drug-class page that no group in `content/medication-taxonomy.json` points to. The same crash happens with a renamed copy of `macrolides`, so it is not caused by these pages. With the one-word fix (`c["id"]` to `c`) in a scratch copy of the tools, the full fragment compiles with no errors and every page passes the publishing gate. I did not edit `tools/`.
Taxonomy follow-up for the maintainer: set `page` on the existing groups `tetracyclines`, `nitroimidazoles`, `alpha-blockers-for-bph` (to `alpha-blockers`), `5-alpha-reductase-inhibitors`; `urinary-antibacterials` has no matching group (nearest: `nitrofurans`, `trimethoprim-combinations`). Until then these classes appear under `classesOutsideTaxonomy`.
The medicine pages alone, with an existing class, pass stock `check_batch.py` (checked by the second-pass agents).

## Things for a human reviewer
* Cross-links: no other batch medicines are linked in `related`/`medications` fields (they did not exist yet); `urinary-antibacterials` lists nitrofurantoin and trimethoprim.
* `content/interactions.json`: none of the eight names occurs there, nothing to re-point.
* Numbers kept because the NHS states them: metronidazole alcohol "2 days" (NHS common-questions page; the NHS trichomoniasis page says 24 hours and MedlinePlus 3 days, both mentioned); tamsulosin prolonged erection "3 to 4 hours" to 999/A&E; flucloxacillin liver effects "up to two months" after finishing; contraceptive-pill 24 hours of sickness/diarrhoea; adverse-effect frequencies as the NHS words them.
* Finasteride: the "1 in 100" figure was removed (found only in a local NHS leaflet). Crushed-tablet advice rests on MedlinePlus (US) and is labelled so. Mood and sexual side-effect warnings carry the 999/NHS 111/Samaritans (116 123) route.
* Doxycycline breastfeeding: the NHS pages differ; the page says so rather than choosing one.
* Nitrofurantoin: a March 2026 Devon formulary notice says it is not recommended in the third trimester; the page follows the NHS wording, which may lag.
* Weaker sourcing (search summaries only, flagged in reports): trimethoprim NICE NG109, emc and NHS England spinal-cord statements; nitrofurantoin urine-alkalinising/antacid point (NHS England PGD); doxycycline retinoid/warfarin statements (emc); co-amoxiclav 999 wording comes from the NHS amoxicillin side-effects page (the co-amoxiclav excerpt gave NHS 111 only); finasteride "Proscar" brand; metronidazole brands (emc/MedlinePlus, not NHS/BNF); US brands for doxycycline unverified.
* Trimethoprim still says "low folate levels" in a few places where the NHS list says folate deficiency anaemia.
* Brands are empty for flucloxacillin, nitrofurantoin, tamsulosin (no source returned brand names). `terminology` omitted throughout (codes not retrieved).
* One first-pass author overwrote another agent's scratch file; no repository file was affected. Two verifiers used one search over their cap.

## Searches used
About 168 of 200: first pass 59, second pass 109 (doxycycline 14, flucloxacillin 14, nitrofurantoin 13, trimethoprim 13, tamsulosin 12, co-amoxiclav 11, class pages 10, finasteride 9, metronidazole 9).
