# Batch guides-symptoms-b: everyday symptoms 

Status: 11 guides, first pass written from retrieved text, then an independent second pass by separate subagents that re-searched with different wording and classified every sentence. Cut or reworded text is applied; `fragment.json` compiles (`check_batch.py` ends with "ok"). Ledgers hold the first-pass sentences; reports hold the second-pass classification and the edits.

## Finished guides
tiredness-and-fatigue-causes-and-gp-checks, dizziness-and-vertigo-causes-and-warning-signs, fever-in-adults-causes-and-when-to-get-help, swollen-ankles-and-legs-causes-and-red-flags, numbness-and-tingling-causes-and-when-to-act, heavy-periods-causes-tests-and-treatment, breast-lump-what-happens-after-you-find-one, pelvic-pain-in-women-causes-and-when-to-get-help, bleeding-after-menopause-and-between-periods, blood-in-urine-causes-and-what-happens-next, unexplained-weight-loss-causes-and-next-steps.

## Second-pass result (259 sentences checked: 237 first pass, 22 added later and checked separately)
Supported or textbook as written: about 210. Unsupported: 49, all edited down to what the source says or removed. Wrong: 0. Unsafe: 0. The fever guide lost the most (8 of 21: a five-day rule that belongs to the NHS COVID-19 page, a 999 list that belongs to the meningitis page, and several unsourced details).

## For a human reviewer
* **Length.** Every guide is under the 700-word target (roughly 210 to 550 words of prose; the fever, weight-loss and bleeding-after-menopause guides are the shortest), because only retrieved, checked sentences were kept. They are short, not padded.
* **Source mix.** Several sentences rest on NHS 111 Wales or NHS inform pages or on search summaries that blend pages, not on the nhs.uk page itself. Spot-check: heavy periods (tests paragraph rests on NHS trust leaflets), blood in urine (specialist clinic checks rest on trust leaflets), weight loss ("promptly" wording is NHS 111 Wales), breast lump (referral wording is England-specific and from Cancer Research UK).
* **No numbers.** Test cut-offs, age thresholds, doses and temperature thresholds were left out on purpose.
* Nothing in `content/*.json`, `data/`, `site/` or `tools/` was touched. No medicine id is newly introduced; `paracetamol` and `ibuprofen` are linked as existing pages.

## Not written
Rash, muscle weakness, night sweats and "a lump or swelling": not reached. Retrieved text for rash and weakness was mostly child- or US-focused.

Searches used: 106 of 200 (28 author, 78 second-pass checkers). About 94 were left unspent; the fixed number of guides and the thin NHS retrieval, not the budget, set the length.

Two caveats from the second pass: BPPV recovery and postural-hypotension tests in the dizziness guide rest on NHS trust pages, and one alcohol-and-sleep sentence in the fatigue guide was trimmed to the part both passes retrieved.
