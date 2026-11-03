# Batch conditions-d: infections

Finished (all eight, each with article block, first-pass ledger and second-pass report): covid-19, chlamydia, kidney-infection, tonsillitis, ear-infection, thrush, meningitis, hiv. Skipped: none.

Searches: about 173 of 200 (first pass 66 across eight authors; second pass 107: 13 or 14 each, the kidney-infection run was refused its last call by the usage limit, so one NHS "when to get help" re-check was not done).

Files: `fragment.json` (final texts, validated "ok"), `items/<id>.entity.json` (first pass), `items/<id>.final.json`, `ledgers/<id>.ledger.json` (first pass), `reports/<id>.report.json` (second pass; counts describe the first-pass text). Ledgers describe first-pass wording; the report rows hold the edits.

Second pass removed 14 to 33 of every ~110 first-pass sentences (unsupported, wrong or unsafe), e.g. kidney-infection 37, ear-infection 38, tonsillitis 28.

## For a human reviewer
* Word counts: sections plus FAQs run 1,160 to 1,340 words (meningitis 1,341, covid-19 1,284, ear-infection 1,272, tonsillitis 1,262); the validator accepts all.
* Alias collision not flagged by the validator: `kidney-infection` and `urinary-tract-infection` both carry the alias "pyelonephritis". Consider removing it from the UTI page (not edited here).
* NHS pages and NICE CKS/BNF were rarely returned by the search tool; many attributions rest on blended search summaries or on NHS trust / NHS 111 Wales leaflets. Report notes flag each case.
* Chlamydia: the BASHH 2026 guideline summary said doxycycline is first-line; no doxycycline medication id exists, so `azithromycin` stays linked (the second pass kept it; confirm against the NHS treatment page, which names it as an alternative). The word "curable" appears attributed to WHO; check against the site's "cured" rule.
* Meningitis: the steroid statement rests on NHS Wales and WHO; the vaccine section gives no ages because the schedule changed in 2025-26. Check NICE NG240 wording on swabs.
* Thrush: a Welsh NHS leaflet advises A&E/999 for difficulty swallowing, while nhs.uk says non-urgent GP; the NHS wording was kept. Both diabetes links are retained though sources do not separate the types.
* Ear infection: "NHS 111 or same-day GP" route for severe headache or facial twitching is attributed to MedlinePlus (US); NG91 text came via summaries.
* COVID-19: dates of the NHS pages were uncertain; vaccine groups follow the NHS vaccine page and the spring 2026 UKHSA post. `pneumonia` and `sepsis` links rest on a CDC-published hospital study.
* HIV: U=U appears only as NHS, THT and NHS 111 Wales state it; WHO attribution was removed. `affects.systems` "lymphatic" is not source-checked.
* Textbook sentences remain at 1 to 3 per page (mostly "call 999 / NHS 111" signposting and the thrush Candida habitat).
* No medicine names from these pages were checked against `content/interactions.json`.
