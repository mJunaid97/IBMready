# Batch `thresholds-b`: source the numeric cut-offs of six test pages

Read `docs/authoring/README.md` (the evidence protocol, search budget and tips) and `content/drafts/thresholds/README.md` (the work plan for these
tests, with the reviewer flags) first. Branch to push to: `claude/content-thresholds-b`. Batch directory: `content/drafts/batches/thresholds-b/`.

## What is wrong now

The review queue `test_reference_range_risk` lists test pages that quote numeric cut-offs in prose without a sourced `thresholds[]` record (CLINICAL.md section 3).
An earlier attempt failed for lack of search budget and nothing was changed. Your six tests, with the sentence the queue flagged:

| Test id | Flagged sentence (start) | Figures to settle |
| --- | --- | --- |
| `ecg` | "Normal sinus rhythm 60-100 per minute; irregular with no P waves in atrial fibri..." | normal sinus rate range; time to first ECG in suspected acute coronary syndrome; ST elevation in contiguous leads; the share of heart attacks with a normal first ECG. The same rate and 10-minute figures appear on `conditions/myocardial-infarction` and `physiology/heart-rate` (report, do not edit) |
| `echocardiogram` | "The fraction of blood the left ventricle ejects each beat; 55% or more is normal..." | normal ejection fraction; sources differ on the lower limit of normal (British Society of Echocardiography, ESC, NHS, BHF): record what each says with its jurisdiction or rewrite qualitatively |
| `holter-monitor` | "Pause of more than 3 seconds with dizziness Symptomatic bradycardia; likely pace..." | the pause length that matters (ESC/EHRA, NHS, BHF) |
| `pulse-oximetry` | "95-100% normal in healthy adults; 88-92% is the target in people with COPD who r..." | normal saturation; the target range in COPD (British Thoracic Society oxygen guideline, NICE, NHS) |
| `spirometry` | "In UK COPD guidance a post-bronchodilator FEV1/FVC below 0.7, with typical sympt..." | FEV1/FVC 0.7; bronchodilator response; "smokers over 35". The page elsewhere says "below the lower limit of normal", so say which framework applies (NICE COPD NG115, asthma diagnosis NG245/BTS-SIGN, GOLD, ERS/ATS); "positive reversibility suggests asthma rather than COPD" may overstate; "COPD screening" of symptomatic people is case-finding |
| `esr` | "Markedly raised ESR (over 100 mm/h) Giant cell arteritis, myeloma, serious infec..." | the "markedly raised" figure is convention: keep a number only if a retrieved page (NICE, NHS, British Society for Rheumatology, giant cell arteritis guidance) states it |

`crp` is in batch `thresholds-a`, so do not touch it.

## What to deliver

For every figure that stays in the prose of these pages: a `thresholds[]` record (`name`, `value`, `unit`, `context`, `jurisdiction`, `source` = `{"title", "url", "section"}`), in the
format of the existing records (see `hba1c`, `creatinine-egfr`, `blood-pressure-measurement` in `content/tests.json`).

* `jurisdiction` is one of `GLOBAL`, `UK`, `US`, `EU`, `CANADA`, `AUSTRALIA`, `OTHER` (WHO or "International" fail the build: use `GLOBAL`).
* **The queue check only runs while a test has no `thresholds[]` at all, so a single record silences it for the whole page. Every number you keep in prose needs its own record. Do not rely on the queue to find the rest: list every number in each of the page's text fields (`what`, `measures`, `whyOrdered`, `interpretation`, `limitations`, `components`, `quick`, `factors`, `cannotTell`, ...) and decide each one.**
* A figure stays only if a retrieved page states it (UK guideline or NHS page first, then a second body; two independent sources where you can find them). Where two sources disagree, record both with their `jurisdiction` or rewrite the sentence qualitatively. Where nothing is retrieved, rewrite the sentence qualitatively and say so. **Never add a number nobody retrieved; never delete a standard guideline value you simply could not find without saying so in the report.**
* A figure that is an everyday convention (for example "markedly raised") may stay as words; a number stays only with a record.
* Reference intervals are never thresholds. A test with `rangePolicy: laboratory` keeps the laboratory-interval wording; guideline decision thresholds are the records.
* New sources go in `references` (appended only when their URL is new). Unknown reference hosts build with a note and are filed as tier 3 unless you set `jurisdiction` and `type` on the source object.
* Other pages repeat some of these figures: do not edit them; list every repeated figure and the place in `BATCH-REPORT.md`, with what the sources say, so the maintainer can align them.

Fragment format (one `patch` object for the whole batch; **every field you name is replaced by the value you give**, so give the complete new value of any prose field you change, copied from the current file and edited; `references` are appended):

    {"patch": {"tests": {"spirometry": {"thresholds": [...], "interpretation": ..., "references": [{"title": "...", "url": "..."}]}}}}

Write the first-pass ledger for every sentence you add or change (README format), run the **second pass** with separate subagents (re-retrieve with differently worded searches, classify each added or changed sentence and each record's value), publish only supported or textbook content, and write the report per test. Plan the budget: six tests, about 25 searches each for both passes.
Validate with `python3 tools/verification/check_batch.py content/drafts/batches/thresholds-b/fragment.json` (must end with `ok`), commit only your batch directory, push to `claude/content-thresholds-b`, and finish with a short message listing, per test, which figures got a record, which were rewritten and which were left (and why).
