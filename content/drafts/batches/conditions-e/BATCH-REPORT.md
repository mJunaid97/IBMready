# Batch conditions-e: report

Eight new condition pages (lupus, fibromyalgia, vertigo, lactose-intolerance, vitamin-d-deficiency, vitamin-b12-deficiency, hernia, sciatica), each with an article block, a first-pass ledger and a second-pass report. `check_batch.py fragment.json` ends `ok`; all eight are publishable. No items were skipped.

**Searches used: about 108 of 200** (first pass about 42, second pass about 66). The first-pass authors each had a cap of 7; the verifiers a cap of 13.

## Process
First pass: one author agent per item, writing only from retrieved text. Second pass: a separate verifier agent per item re-searched with different wording, classified every sentence and edited the page. Second-pass removals were heavy (roughly 15 to 50 percent of first-pass sentences per page), as the README predicted. Ledgers and pages were rewritten to the final text.

## For a human reviewer
* **Search summaries blend pages.** Most NHS attributions rest on summaries of nhs.uk or on NHS trust mirror pages, not on the nhs.uk text. Please spot-check the NHS wording, especially red-flag lists and routes to care.
* **NICE CKS and BSH were almost never returned.** No BSH text was seen, so the B12 page does not cite BSH; NICE NG239 stands in for CKS there. Lupus has no NICE reference. Fibromyalgia rests on thin NICE text (NG193 definition only).
* **Report counts are approximate** for lactose-intolerance (keyword-based counts; 51 "unsupported" is inflated), fibromyalgia (37, approximate) and lupus (claims grouped by source block, not one entry per sentence). Claim ids in the fibromyalgia report follow the original ledger order.
* **Hernia routes to care:** the sources split between 999 and NHS 111 for red flags. The page names 999 for severe pain, vomiting or inability to pass wind or stools, and NHS 111 (or 999 if severe) for a bulge that cannot be pushed back, redness or fever. Check against live NHS pages. A "70 percent within 5 years" figure from NIDDK was removed because only a summary carried it.
* **Vitamin D:** a CKS sentence describing a higher-dose then maintenance schedule was removed after the second pass (dosing schedules are not allowed in prose). No levels or doses appear.
* **Local NHS trust pages** (Coventry and Warwickshire, Torbay and South Devon, King's Lynn, Lanarkshire, Leeds pathology) are cited for some self-care and Menieres/BPPV points. The Menieres "no single test, pattern of attacks" wording is tentatively cited to PMC8686442.
* **Weak links:** lactose-intolerance `related: inflammatory-bowel-disease` is thin (sources say "bowel conditions") and was added so the page has enough link groups. The alias "fibro" (fibromyalgia) and "lactose malabsorption" are only loosely sourced.
* **Sciatica alias:** `sciatica` is listed in the `aliases` of `disc-herniation`. The compiler raised no error, but search will match both pages; the maintainer may want to remove that alias from `disc-herniation` (not changed here).
* **Sciatica** article is about 800 words, at the low end of the target. Corrections made in the second pass: a claim that MRI is the only way to confirm cauda equina syndrome (wrong) and a "within 24 hours" surgery claim (unsafe) were both removed or reworded.
* No medicine name in this batch is new, so no `interactions.json` re-pointing is needed. `review` was not set.
* The health topic `nutrition` for vitamin D is not a field of the condition entity, so it is not linked.
