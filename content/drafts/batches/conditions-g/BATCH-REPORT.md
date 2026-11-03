# Batch conditions-g: report

Eight new condition pages with article blocks, all compiled and "publishable" under `check_batch.py` (ends `ok`). Two-pass evidence protocol followed: first pass written from retrieved text with a sentence ledger (`ledgers/`), then an independent second pass by separate subagents that re-retrieved with different queries and classified every first-pass sentence (`reports/`). Only supported or textbook sentences remain in `fragment.json`.

## Items finished (8 of 8)

| Page | First-pass sentences | Supported | Textbook | Unsupported | Wrong | Unsafe |
| --- | --- | --- | --- | --- | --- | --- |
| menopause | 118 | 74 | 1 | 43 | 0 | 0 |
| erectile-dysfunction | 104 | 78 | 0 | 26 | 0 | 0 |
| enlarged-prostate | 92 | 51 | 0 | 37 | 0 | 4 |
| gonorrhoea | 119 | 100 | 1 | 17 | 1 | 0 |
| genital-herpes | 111 | 71 | 3 | 31 | 4 | 2 |
| pre-eclampsia | 108 | 61 | 3 | 39 | 3 | 2 |
| gestational-diabetes | 102 | 76 | 2 | 22 | 0 | 2 |
| miscarriage | 101 | 67 | 1 | 30 | 3 | 0 |

Items skipped: none.

## Searches used

About 150 of 200: 56 in the first pass (including 1 pilot), about 92 in the second pass, 2 spot checks. Some second-pass agents reported one call refused with a usage-limit error; those calls returned nothing and each agent finished with what it had.

## For a human reviewer

* **enlarged-prostate, emergency route.** The page names A&E (MyHealth Devon) and says NHS inform calls sudden inability to pass urine a medical emergency. A spot check suggests NHS inform advises 999, an older NHS page says A&E, and the current nhs.uk page lists it under urgent GP / NHS 111 advice. Confirm the wording against the live NHS pages. NICE CG97, NIDDK and Prostate Cancer UK were dropped as references because no search returned them.
* **pre-eclampsia.** The 999 wording rests on the NHS pregnancy-symptoms page ("life-threatening emergency"). NICE NG133 was not retrieved and is not cited. Older age, twins, tablets or drip, magnesium sulfate and aspirin eligibility rest on trust or research documents and are attributed that way. Please confirm against the NHS and NICE pages.
* **genital-herpes.** Weakest retained points: first-episode duration, "recurrences are milder", the "dry sore" sentence and the antivirals-in-pregnancy timing line. They rest on NHS sexual-health leaflets or a summary, so attribution is approximate. The NHS 111 / same-day GP mapping was removed.
* **gestational-diabetes.** Stillbirth is described as rare; a spot check shows the NHS overview lists it as rare, with a small added risk when blood sugar is poorly controlled. The 999 line is textbook; NHS 111 was dropped. NICE NG3 text was not retrieved.
* **miscarriage.** The recurrent-miscarriage sentence rests on a blended summary; confirm on the NHS inform page. NICE NG126 expectant and medical management sentences were confirmed against NICE text.
* **menopause.** The `medications` field is empty (no retrieved source named estradiol). Age ranges are attributed to the sources.
* **erectile-dysfunction.** NICE CKS was never returned; the NICE evidence summary (ESNM45) is cited. The sickle cell / priapism attribution cites hospital trust leaflets. Physiology links (blood pressure, sex hormones) were added to meet the publishing gate; the tests link was dropped. `medications` is empty (no PDE-5 inhibitor ids exist).
* **gonorrhoea.** `urlAliases` is `gonorrhea`; `related` is `sepsis`. National age claims and the CDC reference were removed because they could not be retrieved. Travel-linked ceftriaxone resistance is cited to the GRASP report.

## Compiler and id notes

* No id or alias clashes with `content/conditions.json` (52 entries). Other batches (`conditions-a` to `conditions-h`) were not visible; new aliases used here: bph, impotence, erection problems, ED, gonorrhea.
* No medicine ids were added, so no `content/interactions.json` re-pointing is needed.
* No existing statements in other pages were found to be contradicted.
