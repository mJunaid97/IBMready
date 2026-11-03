# BATCH-REPORT: guides-conditions

Date: 2026-11-03. Branch: `content/guides-conditions`. `check_batch.py` ends with `ok`.

## Guides finished (13)

| Guide | Words | Second-pass counts (supported / textbook / unsupported / wrong / unsafe) | Searches (2nd pass) |
| --- | --- | --- | --- |
| asthma-and-copd-how-they-differ | 702 | 14 / 1 / 19 / 0 / 1 | 5 |
| flu-or-cold-how-they-differ | 564 | 18 / 1 / 13 / 0 / 1 | 5 |
| heart-attack-cardiac-arrest-and-angina | 566 | 13 / 1 / 18 / 0 / 2 | 4 |
| heartburn-acid-reflux-and-gord | 457 | 17 / 0 / 8 / 0 / 3 | 4 |
| high-blood-pressure-what-happens-next | 541 | 19 / 2 / 7 / 2 / 0 | 6 |
| kidney-stones-symptoms-and-treatment | 399 | 15 / 1 / 11 / 0 / 2 | 2 |
| migraine-and-tension-headache-compared | 497 | 7 / 2 / 14 / 0 / 0 | 4 |
| osteoarthritis-and-rheumatoid-arthritis-compared | 583 | 23 / 1 / 12 / 0 / 0 | 5 |
| sepsis-warning-signs-and-what-to-do | 418 | 11 / 0 / 15 / 0 / 1 | 4 |
| stroke-and-tia-spotting-the-signs | 606 | 16 / 1 / 13 / 0 / 0 | 4 |
| type-1-and-type-2-diabetes-compared | 425 | 13 / 2 / 14 / 0 / 0 | 5 |
| underactive-and-overactive-thyroid-compared | 499 | 15 / 1 / 10 / 0 / 0 | 4 |
| uti-and-cystitis-what-they-are | 505 | 13 / 1 / 12 / 1 / 0 | 4 |

Totals over the 13 first-pass drafts: supported 194, textbook 14, unsupported 166, wrong 3, unsafe 10, unchecked 0. About 46 in 100 first-pass sentences were cut or rewritten.

## Searches

First pass: 20 WebSearch calls (15 extended, 5 standard). Second pass: 56 calls across 13 independent subagents. Total about 76 of 200. About 124 were left unused on purpose (see below).

## Things a human reviewer should look at

* **Length.** Published text is 410 to 700 words per guide, below the 700 to 1,000 asked for. Sentences the second pass could not support were removed rather than kept to reach a word count. Nine of the thirteen guides are under 600 words.
* **Additions.** Each guide also received 3 to 8 extra sentences proposed by its second-pass checker from its own retrieval (listed in `reports/<id>.additions-used.json`, each with URL and evidence). They had only that one retrieval; no third pass checked them. Filtered: no sentence with a number other than 999, 111, 116 123 or a phone number, none flagged low-confidence.
* **Sourcing quality.** The search tool returned blended summaries, often without a page's own excerpt. Several sentences rest on NHS 111 Wales, NHS trust or ICB leaflets rather than nhs.uk (for example sepsis, kidney stones urgent-care, thyroid storm 999 wording, blood pressure urgent-reading wording from an NHS pharmacy-service document). Please spot-check against nhs.uk before indexing.
* **Specific doubts flagged by checkers:** TIA 24-hour definition (found in an NHS trust leaflet, not the Stroke Association page); cranberry wording in the UTI guide (reconfirm on nhs.uk); morning-stiffness comparison in OA/RA; the figure for Graves' disease share differs between NHS pages, so no figure is quoted; thyroid storm 'call 999' route not found verbatim.
* **References.** Some references added from additions are page URLs the checkers retrieved; titles beginning 'Source:' are generic and could be tidied. Several draft references (NHS 111 Wales, MyHealth Devon, Cambridge University Hospitals) are regional pages.
* **Ledgers** (`ledgers/`) record the first-pass sentences; the second-pass `reports/` hold the per-sentence classification and the actions taken. The published text is the first pass after those actions plus the additions, then a wording pass to remove second-person phrasing.
* No clash with `content/interactions.json` or aliases was found by the compiler. No existing page contradiction was noticed; not every site page was read in full.

## Topics dropped / not written

Anaemia types and causes, and gallstones were researched in the first pass (one search each) but not written or second-passed: the session spent its effort on checking the 13 guides, and the thin retrieved text would not have supported 700 words. They remain good candidates for another batch. No topic was dropped for lack of sources.
Flu or cold uses symptoms/health links only because no influenza or common-cold condition page exists on the site.
