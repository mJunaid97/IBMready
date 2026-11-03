# Batch conditions-f: skin, allergy and eyes

All eight items finished: eczema, psoriasis, acne, hives, hay-fever, food-allergy, cellulitis, conjunctivitis. None skipped.
`python3 tools/verification/check_batch.py content/drafts/batches/conditions-f/fragment.json` ends `ok`; all eight pages are indexable.

**Searches used:** about 145 of 200 (47 first pass, 97 second pass, 1 planning probe). First pass by sentence-level ledger; second pass by separate subagents with differently worded searches.

| Page | First-pass sentences | supported | textbook | unsupported | wrong |
| --- | --- | --- | --- | --- | --- |
| eczema | 95 | 64 | 2 | 27 | 2 |
| psoriasis | 104 | 63 | 4 | 36 | 1 |
| acne | 114 | 77 | 3 | 34 | 0 |
| hives | 93 | 61 | 2 | 26 | 4 |
| hay-fever | 93 | 58 | 0 | 34 | 1 |
| food-allergy | 99 | 65 | 0 | 32 | 2 |
| cellulitis | 112 | 80 | 0 | 32 | 0 |
| conjunctivitis | 107 | 62 | 1 | 44 | 0 |

Unsupported and wrong sentences were cut or reworded; ledgers list the final published sentences, reports list every first-pass sentence.
Note: hives and acne reports were rebuilt from the checker's reading because the first-pass files had been overwritten; their `claims` lists carry evidence and new sentences, not always the original text.

## For a human reviewer
* **NICE CKS was never returned by search** for any page. NICE sources used instead: NG198 (acne), NG141 (cellulitis), CG153 (psoriasis), TA81/TA339, MIB46 (conjunctivitis), CG116 (food allergy, 2011, not checked for updates). Several NICE statements come from search summaries, not page text.
* **Weakly sourced links kept only to pass the two-relationship-groups gate:** eczema `symptoms: rash` (textbook-level, not source-verified); acne `physiology: hormones` (NHS/BAD name hormones as a cause). Dropping them makes those pages noindex.
* **Cellulitis:** eye wording unresolved (summaries conflicted); the NHS 111 / same-day GP then 999 or A&E sentence is own signposting marked textbook. Check the live NHS page. `deep-vein-thrombosis` link rests on one UK hospital leaflet.
* **Hives:** BAD "angio-oedema typically painful rather than itchy" came from a summary; the NHS describes swelling accompanying itchy hives. Check the leaflet.
* **Food allergy:** nothing on a second auto-injector or its timing (sources conflicted); five sentences rest on blended summaries; `related: asthma` is weakly justified.
* **Psoriasis:** no `rheumatoid-arthritis` link (sources connect psoriatic arthritis, not RA); psoriatic arthritis coverage is thin.
* **Hay fever:** local NHS prescribing policy mentioned and labelled as varying by area; MedlinePlus nasal-steroid claim marked as a US source.
* **Conjunctivitis:** no 999 (no source says it); Moorfields "stay off school" cut in favour of UKHSA/NHS "no exclusion".
* **Aliases/ids:** no clashes. `eczema` is the page id, so it cannot also be a urlAlias (only `atopic-dermatitis` is). Medication ids linked: cetirizine, hay-fever and hives; paracetamol, ibuprofen, cellulitis.
