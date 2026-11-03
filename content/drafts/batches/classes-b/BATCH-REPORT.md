# Batch classes-b: report

Branch `claude/content-classes-b`. Five drug-class pages deepened (summary, mechanism, classEffects, cautions, references). Only `drug-classes` patches; protected fields untouched.

`check_batch.py` ends `ok`. `lint_new_content.py` reports one finding (below).

| Class | Authored chars (4 fields) | References | New sentences: supported / textbook / edited or cut in second pass |
| --- | --- | --- | --- |
| benzodiazepines | 2616 | 4 | 10 / 1 / 4 edited |
| z-drugs | 2357 | 6 | 9 / 1 / 4 edited |
| nitroimidazoles | 2480 | 10 | 10 / 0 / 3 edited |
| alpha-blockers | 3299 | 12 | 12 / 0 / 5 edited (1 wrong) |
| 5-alpha-reductase-inhibitors | 2705 | 11 | 10 / 1 / 4 edited |

No sentence was removed outright; unsupported ones were reworded to what the sources say. Searches: first pass 18, second pass 42 (60 of 200).

## For a clinician or reviewer

* **Pre-existing text not changed (protected by "keep and extend"):** several existing sentences carry durations or numbers (benzodiazepines/z-drugs: "12 hours", "2 to 4 weeks"; metronidazole "2 days"). Existing `z-drugs` cautions[3] (complex sleep behaviours, SmPC) has no route to care, flagged by the linter. Not edited here.
* **Signposting sentences** (999 / NHS 111 / Samaritans 116 123) in benzodiazepines, z-drugs and 5-ARIs are marked `textbook` (site rule), not retrieved claims. For 5-ARIs the NHS finasteride pages give 999/A&E only; 111 and Samaritans are the generic route.
* **Evidence level:** NHS and NHS inform pages could not be fetched; both passes relied on search summaries. NICE TA77 is a 2004 appraisal; the 2022 NICE insomnia guidance (NG215) was not retrieved. Zolpidem receptor-subtype sentence rests on a partly garbled StatPearls text.
* **Nitroimidazoles:** the metronidazole jaundice sentence has no care route because none was retrieved for metronidazole; the tinidazole alcohol-review sentence sits beside MedlinePlus advice to avoid alcohol and must not read as permission to drink. I reworded the jaundice sentence to drop the "warning signs" framing.
* **Alpha blockers:** the page is longest (about 3,300 chars) because the existing text was already fuller; the tamsulosin overdose line cites both tamsulosin and doxazosin NHS pages.
* **5-ARI mechanism:** first-pass "all three forms" for dutasteride was wrong per the second pass; now type 1 and type 2 (finasteride mainly type 2). PMC1550785 title is a placeholder description: check the exact title. MedlinePlus statements are marked US. A May 2026 MHRA update on finasteride/dutasteride was seen but not used.
* Nothing added to `interactions.json`; nothing outside this directory changed.
