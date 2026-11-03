# guides-blood-tests: BATCH REPORT

Twelve evergreen guides on blood and urine tests. `check_batch.py` ends with `ok`.

## Finished guides (12)

Columns: first-pass sentences, how many the independent second pass found unsupported, wrong or unsafe (all reworded or removed), additions proposed by the checkers, additions kept after a third check, words of body prose.

| guide | first-pass sentences | not supported | additions | kept | words |
| --- | --- | --- | --- | --- | --- |
| cholesterol-blood-test-results-explained | 41 | 15 | 8 | 7 | 696 |
| egfr-and-creatinine-kidney-blood-tests | 38 | 9 | 8 | 6 | 613 |
| hba1c-test-what-it-shows | 37 | 15 | 6 | 5 | 608 |
| high-crp-what-it-means | 43 | 21 | 6 | 5 | 571 |
| high-white-blood-cell-count-causes | 31 | 8 | 6 | 4 | 468 |
| inr-blood-test-warfarin-explained | 30 | 7 | 7 | 6 | 537 |
| liver-function-tests-what-results-mean | 38 | 15 | 7 | 5 | 636 |
| low-ferritin-what-it-means | 44 | 13 | 7 | 4 | 674 |
| thyroid-blood-tests-tsh-and-t4-explained | 36 | 21 | 6 | 4 | 540 |
| troponin-blood-test-what-it-shows | 31 | 9 | 8 | 1 | 446 |
| vitamin-b12-and-folate-tests-explained | 28 | 7 | 8 | 4 | 419 |
| vitamin-d-blood-test-who-needs-one | 34 | 15 | 6 | 4 | 545 |

Totals over all first-pass sentences: {'supported': 268, 'textbook': 8, 'unsupported': 147, 'wrong': 2, 'unsafe': 6, 'unchecked': 0}.

## Topics dropped
None dropped. Not attempted from the seed list for lack of budget: ESR, urinalysis (one search returned only non-patient pages), electrolytes, blood glucose, plus a standalone full blood count guide (the white cell guide covers it).

## Method
1. First pass written from retrieved search text, 29 first-pass searches before drafting plus 12 gap searches. Ledgers in `ledgers/<slug>.ledger.json` (first draft) and `ledgers/<slug>.final-ledger.json` (every published sentence after edits).
2. Second pass by six separate subagents (16 searches each at most), classifying every sentence: `reports/<slug>.report.json`.
3. The checkers also proposed extra sentences. A third pass by four further subagents re-verified every addition: `reports/<slug>.additions-check.json`. Only kept or edited additions are published.
4. Searches used: about 167 of 200 (41 first pass, about 94 second pass, 32 for the additions check).

## For the human reviewer
* **Length.** The brief asks for 700 to 1,000 words. Only the cholesterol guide is near 700; the others are 420 to 680 words. The second pass removed or reworded 20 to 50 per cent of first-pass sentences, and the retrievable material did not allow more without unsupported text. Short guides were kept rather than padded.
* **Search summaries blend pages.** Many ledger URLs are the best match among returned links, not a confirmed single page (checkers flagged this repeatedly). Treat attribution as "one of the cited publishers", not page-exact.
* **Thin guides.** The thyroid guide lost its overactive-thyroid pattern sentence (low TSH with high free T4) because no returned text stated it; the British Thyroid Foundation page text never came back in full. The B12 and troponin guides are the thinnest (about 420 and 450 words). Consider fuller review or dropping them.
* **Textbook sentences.** A few signposting sentences and plain definitions are marked textbook, within the 1-in-20 limit per guide where possible; the report files list them.
* **Source disagreements noted by checkers.** Vitamin C and iron absorption (NHS 111 Wales says orange juice may help; another formulary says it is not needed); supplement age (NHS inform versus Scottish Government). The guides follow the sentence they cite.
* **Interval wording.** The HbA1c guide keeps NICE-stated testing intervals ("every three to six months"); remove if house style prefers no numbers.
* No medicine named in `content/interactions.json` was newly added as a page; no patches were needed.
