# Batch conditions-h: report

Date checked: 2026-11-03. `check_batch.py` on `fragment.json` ends `ok`; all 8 pages are indexable.

## Items finished (8 of 8)
high-cholesterol, coeliac-disease, hepatitis-c, sinusitis, bronchitis, sleep-apnoea, aortic-aneurysm, peripheral-arterial-disease.
None skipped. No alias or id clashes were reported by the compiler.

## Searches used
By the agents' own counts: first pass 45 (3 to 8 per item), second pass 88 (8 to 14 per item), about 133 in total.
The first sinusitis second-pass run was cut off by a usage limit and its search count was lost, so the true total is slightly higher; it is well under 200.

## Second-pass results (first-pass sentences as found)
| Item | supported | textbook | unsupported | wrong |
| --- | --- | --- | --- | --- |
| high-cholesterol | 54 | 5 | 26 | 0 |
| coeliac-disease | 61 | 4 | 23 | 1 |
| hepatitis-c | 81 | 1 | 23 | 0 |
| sinusitis | 87 | 1 | 9 | 2 |
| bronchitis | 70 | 0 | 25 | 2 |
| sleep-apnoea | 77 | 4 | 12 | 0 |
| aortic-aneurysm | 83 | 2 | 14 | 0 |
| peripheral-arterial-disease | 75 | 3 | 15 | 0 |

Unsupported and wrong sentences were cut or reworded in the published text. Sentences added in the second pass are logged as `added` rows in the reports. The ledgers in `ledgers/` are the first-pass ledgers; the reports describe what changed.

## For a human reviewer
* The search tool mostly returned blended summaries, not page text, and rarely the nhs.uk pages themselves. Many NHS attributions rest on page titles or NHS 111 Wales, NHS inform or hospital-trust pages. Spot-check against the live pages.
* Several pages could not get an urgent-care route (NHS 111 / same-day GP / 999) from retrieved text; the route wording is marked `textbook` (high-cholesterol, aortic-aneurysm, peripheral-arterial-disease, sleep-apnoea). Coeliac disease and hepatitis C name a GP appointment only.
* NICE CKS and BNF pages were not returned. Bronchitis uses NICE NG120 in place of CKS; the NG156, NG202, NG79 and CG147 references point to NICE pages that searches returned.
* Weakest points: hepatitis C (British Liver Trust only as a summary; the NHS "9 out of 10" and "more than 95%" cure figures differ and are both attributed); sleep apnoea (mild-OSA CPAP wording and an NHS England easy-read source for "CPAP is not a cure"); aortic aneurysm ("does not screen women" from provider pages; screening stated only as an ultrasound offered to men at 65, per the NHS); high cholesterol (familial hypercholesterolaemia diagnosis sentences from CG71 snippets; `rosuvastatin` is linked but the page says nothing specific about it); sinusitis (NHS risk-factor list via a leaflet summary; the "rhinosinusitis" alias rests on a PMC title only).
* A few attributed numbers are kept because the sources state them: chronic bronchitis definition (NHLBI), cough duration (MedlinePlus, NICE), sinusitis 10 to 14 days and 3 months (MedlinePlus), 1 in 100 coeliac (NHS inform). Remove if the site wants no numbers.
* Link choices: peripheral-arterial-disease uses organ `foot` (no leg id) and `mri`; the class `statins` is not linked because conditions have no drug-class field. `hep-c` and `hcv` are url aliases on hepatitis-c.
* No existing page statements were found contradicted. No medicine ids were added, so nothing needs re-pointing in `content/interactions.json`.
