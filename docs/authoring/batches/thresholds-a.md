# Batch `thresholds-a`: source the numeric cut-offs of six test pages

Read `docs/authoring/README.md` (the evidence protocol, search budget and tips) and `content/drafts/thresholds/README.md` (the work plan for these
tests, with the reviewer flags) first. Branch to push to: `claude/content-thresholds-a`. Batch directory: `content/drafts/batches/thresholds-a/`.

## What is wrong now

The review queue `test_reference_range_risk` lists test pages that quote numeric cut-offs in prose without a sourced `thresholds[]` record (CLINICAL.md section 3).
An earlier attempt failed for lack of search budget and nothing was changed. Your six tests, with the sentence the queue flagged:

| Test id | Flagged sentence (start) | Figures to settle |
| --- | --- | --- |
| `blood-glucose` | "Fasting 5.6-6.9 mmol/L Impaired fasting glucose: prediabetes..." | fasting and random diabetes thresholds with repeat-to-confirm; the impaired-fasting band; hypoglycaemia; fasting duration. The 5.6 lower bound is the US (ADA) value: the source decides the number on a UK page (NICE, NHS, Diabetes UK, WHO) |
| `kidney-function-tests` | "Estimated glomerular filtration rate in mL/min/1.73 m²; over 90 normal, under 60..." | eGFR categories and the persistence rule. `creatinine-egfr` already has records citing NICE NG203 and KDIGO: reuse their sources after re-checking |
| `urine-protein` | "The amount of albumin in a single urine sample divided by the creatinine..." | ACR grades and the repeat rule; the nephrotic-range figure (note the 300 mg/mmol figure is on the protein:creatinine scale, not ACR); the "two out of three samples" wording reads as a US rule |
| `hormone-tests` | "The waste product that crystallises in gout; above 360 micromol/L raises risk..." | uric acid (urate) risk level and the gout treatment target; the page lists no gout or urate source, so add one; "300-360" may blend two different targets |
| `pregnancy-test` | "Positive from around the first missed period; modern tests detect 20-25 IU/L..." | detection level, hCG timing and doubling, "wait three weeks", scan timing. The page says both "about a week after implantation" and "within days of implantation": make it consistent with what a retrieved page says |
| `crp` | "Mildly raised CRP (roughly 5-20 mg/L) Minor inflammation, viral illness, obesity..." | "levels in the hundreds", 100 mg/L, 5-20 mg/L, time course. NICE publishes point-of-care CRP thresholds for lower respiratory tract infection (a guideline threshold, with its own context): use that for a record; keep a convention figure in prose only if a retrieved page states it |

`esr` and `crp` have the same shape; `esr` is in batch `thresholds-b`, so do not touch it.

## What to deliver

For every figure that stays in the prose of these pages: a `thresholds[]` record (`name`, `value`, `unit`, `context`, `jurisdiction`, `source` = `{"title", "url", "section"}`), in the
format of the existing records (see `hba1c`, `creatinine-egfr`, `blood-pressure-measurement` in `content/tests.json`).

* `jurisdiction` is one of `GLOBAL`, `UK`, `US`, `EU`, `CANADA`, `AUSTRALIA`, `OTHER` (WHO or "International" fail the build: use `GLOBAL`).
* **The queue check only runs while a test has no `thresholds[]` at all, so a single record silences it for the whole page. Every number you keep in prose needs its own record. Do not rely on the queue to find the rest: list every number in each of the page's text fields (`what`, `measures`, `whyOrdered`, `interpretation`, `limitations`, `components`, `quick`, `factors`, `cannotTell`, ...) and decide each one.**
* A figure stays only if a retrieved page states it (UK guideline or NHS page first, then a second body; two independent sources where you can find them). Where two sources disagree, record both with their `jurisdiction` or rewrite the sentence qualitatively. Where nothing is retrieved, rewrite the sentence qualitatively ("a result well above the laboratory's interval") and say so. **Never add a number nobody retrieved; never delete a standard guideline value you simply could not find without saying so in the report.**
* A figure that is an everyday convention (for example "markedly raised") may stay as words; a number stays only with a record.
* Reference intervals are never thresholds. A test with `rangePolicy: laboratory` keeps the laboratory-interval wording; guideline decision thresholds are the records.
* New sources go in `references` (appended only when their URL is new). Unknown reference hosts build with a note and are filed as tier 3 unless you set `jurisdiction` and `type` on the source object.
* Other pages repeat some of these figures (`comparisons.json` HbA1c vs blood glucose; `conditions/myocardial-infarction`; `physiology/heart-rate`): do not edit them; list every repeated figure and the place in `BATCH-REPORT.md`, with what the sources say, so the maintainer can align them.

Fragment format (one `patch` object for the whole batch; **every field you name is replaced by the value you give**, so give the complete new value of any prose field you change, copied from the current file and edited; `references` are appended):

    {"patch": {"tests": {"blood-glucose": {"thresholds": [...], "interpretation": ..., "references": [{"title": "...", "url": "..."}]}}}}

Write the first-pass ledger for every sentence you add or change (README format), run the **second pass** with separate subagents (re-retrieve with differently worded searches, classify each added or changed sentence and each record's value), publish only supported or textbook content, and write the report per test. Plan the budget: six tests, about 25 searches each for both passes.
Validate with `python3 tools/verification/check_batch.py content/drafts/batches/thresholds-a/fragment.json` (must end with `ok`), commit only your batch directory, push to `claude/content-thresholds-a`, and finish with a short message listing, per test, which figures got a record, which were rewritten and which were left (and why).
