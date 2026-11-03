# Batch report: deepen-conditions-b

All 8 items finished and pushed (patch fragment, `check_batch.py` ends with `ok`). Each article passed an independent second pass by a separate subagent that re-retrieved with differently worded searches and classified every first-pass sentence. The published text is the second-pass `drafts/<id>.final.json`; first-pass drafts are not pushed.

**Searches used: about 141 of 200** (first pass 51, second pass 90).

| Item | Searches (1st / 2nd) | First-pass sentences | Supported | Textbook | Unsupported | Wrong |
| --- | --- | --- | --- | --- | --- | --- |
| breast-cancer | 11 / 12 | 65 | 37 | 5 | 23 | 0 |
| lung-cancer | 7 / 12 | 64 | 26 | 4 | 33 | 1 |
| colorectal-cancer | 8 / 12 | 75 | 42 | 3 | 29 | 1 |
| osteoarthritis | 4 / 10 | 67 | 34 | 0 | 33 | 0 |
| rheumatoid-arthritis | 5 / 11 | 68 | 34 | 4 | 30 | 0 |
| osteoporosis | 6 / 12 | 56 | 23 | 0 | 33 | 0 |
| gerd | 5 / 9 | 63 | 41 | 2 | 20 | 0 |
| urinary-tract-infection | 5 / 12 | 66 | 33 | 2 | 31 | 0 |

Roughly half of first-pass sentences were cut or reworded, more than the one-in-six seen earlier. Cause: the search tool returns blended summaries (and, for lung-cancer types, patent text), so many first-pass attributions could not be confirmed. Ledgers are in `ledgers/`, reports in `reports/`.

## For the human reviewer

* **Second-pass additions are not independently re-checked.** The second-pass subagent added some sentences from its own retrieved text (notably gerd, colorectal-cancer, osteoporosis, rheumatoid-arthritis). They came from retrieved text but had no third look.
* **Per-sentence URL attribution is approximate** throughout (summaries blend pages). Ledger and report notes say where.
* **Existing statements the sources do not fully support (not changed):**
  * osteoarthritis: definition calls it "progressive"; NHS says it does not necessarily get worse. The article states the NHS position only. The existing list of paracetamol as an option has no caveat; NHS says many find it works poorly, and an NHS England decision aid says there is no good evidence it helps.
  * rheumatoid-arthritis: overview says DMARDs "now prevent most damage"; retrieved text says only that treatment eases symptoms and slows or prevents damage.
  * colorectal-cancer: "Early cancers are cured by surgery" is stronger than the NHS "best chance of cure".
  * urinary-tract-infection: "E. coli in 80%" was not re-checked.
* **colorectal-cancer:** sources disagree on the screening start age (50, 56, 60 England; 51 Wales), so none is stated. A 2026 source says the England FIT threshold is changing; none is written.
* **osteoporosis:** atypical femoral fracture and reassessment statements rest on PMC search summaries (probable, unconfirmed page). NIAMS and Versus Arthritis differ on high-impact exercise; the article gives both. NHS Wales stands in for nhs.uk pages that did not return.
* **urinary-tract-infection:** the dipstick and NICE QS260 sentences rest on PMC summaries only. Durations ("48 hours", "up to six months") are from NHS 111 Wales, not doses.
* **breast-cancer:** an imaging-by-age statement is local NHS trust practice and is attributed as such. FAQs: 4 (the minimum). No survival statistics in any cancer article.
* **rheumatoid-arthritis:** NICE biologic criteria were seen only via a regional pathway.
* **Textbook sentences** (kept, under 1 in 20 overall) are listed in each report.
* No medicine in `content/interactions.json` was introduced; no existing alias conflicts; no files outside this directory were edited.
