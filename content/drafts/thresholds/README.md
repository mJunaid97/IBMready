# Test thresholds: done (3 November 2026, v1.10.4)

The twelve test pages that quoted numeric cut-offs in prose without a sourced `thresholds[]` record (the `test_reference_range_risk` review queue,
CLINICAL.md section 3) were settled in two author batches, each with its own web search allowance and the two-pass protocol of CLINICAL.md 5.5:

| Batch | Tests | Sourced records now | Ledgers, second-pass reports, per-figure notes |
| --- | --- | --- | --- |
| `thresholds-a` | blood-glucose (8), kidney-function-tests (4), urine-protein (7), hormone-tests (4), pregnancy-test (2), crp (3) | 28 | `content/drafts/batches/thresholds-a/` (`BATCH-REPORT.md`) |
| `thresholds-b` | ecg (4), echocardiogram (3), holter-monitor (2), pulse-oximetry (4), spirometry (6), esr (0) | 19 | `content/drafts/batches/thresholds-b/` (`BATCH-REPORT.md`) |

What changed on the pages: every figure that stays in prose has its own record (name, value, unit, context, jurisdiction, source); a figure that no retrieved page
gave was rewritten in words ("far above the laboratory's upper limit"), and a figure that was another country's value on a UK page (the 5.6 mmol/L impaired fasting
glucose bound is the American one; WHO gives 6.1 and NICE 5.5) now says which body gives which number. `esr` keeps no number. The COPD condition page now says "post-bronchodilator
FEV1/FVC ratio below 0.7" like the spirometry page (NICE does not require routine reversibility testing).

The batch reports list what a clinician should still look at (weak sources: a regional NHS guideline for the 10-minute ECG, a hospital teaching document for the PaO2 figure,
US National Kidney Foundation pages for the G1 and G3a eGFR records, NHS trust documents for the nephrotic-range figure).

The rules that made this work, for the next time a test page needs a figure: `jurisdiction` is one of GLOBAL, UK, US, EU, CANADA, AUSTRALIA, OTHER; the queue check only runs while a test
has no `thresholds[]` at all, so every number kept in prose needs its own record; where two sources disagree, record both with their jurisdiction or say in words that sources differ.
