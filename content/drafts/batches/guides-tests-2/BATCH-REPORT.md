# Batch report: guides-tests-2 (round 1 of the session)

Status: 10 guides finished, second pass done by five independent subagents, `check_batch.py` ends with `ok`.

| Guide | First-pass sentences | Supported | Textbook | Unsupported | Wrong | Unsafe | Searches (2nd pass) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| blood-test-preparation-and-fasting | 26 | 21 | 1 | 4 | 0 | 0 | 4 |
| psa-test-what-it-shows-and-what-the-nhs-says | 31 | 24 | 1 | 6 | 0 | 0 | 4 |
| lumbar-puncture-what-happens-and-what-to-expect | 30 | 22 | 2 | 4 | 0 | 2 | 3 |
| cystoscopy-what-happens-and-what-to-expect | 33 | 25 | 2 | 6 | 0 | 0 | 3 |
| nhs-screening-who-is-invited-and-how-often | 24 | 19 | 2 | 0 | 3 | 0 | 8 |
| pregnancy-scans-and-tests-on-the-nhs | 26 | 18 | 1 | 7 | 0 | 0 | 7 |
| pet-and-bone-scans-what-to-expect | 33 | 20 | 0 | 11 | 1 | 1 | 8 |
| coronary-angiogram-what-happens-and-risks | 32 | 23 | 1 | 6 | 0 | 2 | 6 |
| blood-transfusion-why-and-how-it-is-done | 25 | 21 | 2 | 2 | 0 | 0 | 5 |
| general-anaesthetic-before-during-and-after | 26 | 17 | 0 | 8 | 0 | 1 | 7 |

First pass used 12 searches (extended mode, one per topic plus one for screening and pregnancy); second pass used 55. Total so far: 67.

## What a reviewer should know

* **The guides are short (about 290 to 440 words of prose), well under the 700 to 1,000 words the brief asks for.** I chose this deliberately: the retrieved text supported about that much, and the second pass removed 15 to 35 per cent of first-pass sentences. I did not pad them.
* The search tool returns blended summaries, so many per-claim URLs in the reports are best guesses (the checkers say so in their notes). Weakest attributions: PET/bone-scan guide (bone-scan statements), coronary angiogram (BHF and Guy's pages), pregnancy booking bloods (trust pages), lumbar puncture duration (leaflets disagree, so both figures are given).
* The PSA guide cites a GOV.UK PCRMP page that is marked withdrawn; it is used only for a trial-evidence sentence and says "now withdrawn". The checker noted the UK National Screening Committee recommended targeted BRCA2 screening in May 2026; NHS pages may lag, so the "not offered routinely" wording follows the NHS page. Worth a human look.
* Bowel screening starting age is deliberately not stated: sources conflict (50 to 74 with the first kit at 50, 52 or 54 on the NHS page; 54 in an older NHS England guide). Cervical screening is described as every five years for 25 to 64 (since July 2025), corrected by the second pass.
* No doses, cut-offs or fasting hours appear in prose. The anaesthetic fasting figures and the 10-minute bleeding timing were removed.
* Link groups use only existing ids. No medicine names are used as new ids; nothing for `content/interactions.json`.
