# Test thresholds still to be sourced (work plan, nothing applied)

The review queue `test_reference_range_risk` lists twelve test pages that state numeric cut-offs in prose without a sourced
`thresholds[]` record (CLINICAL.md section 3). An attempt to source them was made in one turn and **failed for lack of
search budget** (the `WebSearch` tool allows 200 calls per turn, shared by all agents, and the article drafting had used it
up), so **no content was changed**: the figures stay as written and stay in the queue for medical review. Agents proposed
removing the unconfirmed figures instead; that was deliberately not applied, because it would delete standard guideline
values (for example the COPD FEV1/FVC ratio) without verifying anything.

How to finish, per test: retrieve each figure from two independent sources (UK guideline or NHS page first, then a second
body), add a `thresholds[]` record (name, value, unit, context, `jurisdiction`, `source{title,url,section}`) and keep the
prose figure; where two sources disagree or none is found, rewrite the sentence qualitatively. Notes for whoever does it:

* `jurisdiction` must be one of GLOBAL, UK, US, EU, CANADA, AUSTRALIA, OTHER (WHO or "International" fail the build; use GLOBAL).
* The queue check only runs while a test has no `thresholds[]` at all, so adding a single record silences it for the whole
  page. Each number kept in prose therefore needs its own record; do not rely on the queue to find the rest.
* Unknown hosts build with a warning and are filed as tier 3 / "other" unless the source object sets `jurisdiction` and `type`.

| Test | Figures to source | Retrieve from (UK first) | Reviewer flags (recollection of the agents, **not retrieved**) |
| --- | --- | --- | --- |
| `blood-glucose` | fasting 7.0 and random 11.1 mmol/L with repeat-to-confirm; the impaired-fasting band; hypoglycaemia below 4.0; fasting duration | nhs.uk, cks.nice.org.uk, nice.org.uk, diabetes.org.uk, who.int | the page's 5.6 mmol/L lower bound matches the US (ADA) value; WHO and NICE may use different values, so the source decides the number on a UK page. `comparisons.json` (HbA1c vs blood glucose) repeats the same figures |
| `kidney-function-tests` | eGFR categories and the persistence rule ("half of kidney function") | nhs.uk CKD diagnosis, NICE NG203, kdigo.org | the same eGFR figures already have records on `creatinine-egfr` citing NICE NG203 and KDIGO 2024; matching records here are an option after re-checking |
| `urine-protein` | ACR grades and repeat rule; nephrotic-range figure; "two out of three samples" | NICE NG203 and CKS, nhs.uk, kdigo.org, ukkidney.org, niddk.nih.gov | "two of three samples" reads as a US rule; the ACE inhibitor/ARB advice may over-generalise across ACR levels; the 300 mg/mmol figure is on the protein:creatinine scale, not ACR |
| `hormone-tests` | uric acid (urate) risk level and gout targets | NICE gout guidance, cks.nice.org.uk, nhs.uk, rheumatology.org.uk | the page lists no gout or urate source, so one has to be added; "300-360" may blend two different targets |
| `ecg` | normal sinus rate range; time to first ECG in suspected ACS; ST elevation in contiguous leads; share of heart attacks with a normal first ECG | nhs.uk, bhf.org.uk, NICE (acute coronary syndromes), escardio.org, resus.org.uk | the same rate and 10-minute figures appear on `conditions/myocardial-infarction` and `physiology/heart-rate` |
| `echocardiogram` | normal ejection fraction | British Society of Echocardiography, ESC | sources differ on the lower limit of normal |
| `holter-monitor` | pause length that matters | ESC / EHRA, nhs.uk | |
| `pulse-oximetry` | normal saturation; the target range in COPD | BTS oxygen guideline, NICE, nhs.uk | |
| `spirometry` | FEV1/FVC 0.7; bronchodilator response; "smokers over 35" | NICE COPD and asthma diagnosis pages, goldcopd.org, ersnet.org, thoracic.org, nhs.uk | "positive reversibility suggests asthma rather than COPD" may overstate; the page elsewhere says "below the lower limit of normal", so a record should say which framework applies; "COPD screening" of symptomatic people is case-finding |
| `pregnancy-test` | detection level; hCG timing and doubling; "wait three weeks"; scan timing | nhs.uk, NICE early-pregnancy guidance | "about a week after implantation" contradicts "within days of implantation" on the same page; UK guidance may express the hCG rise as a minimum percentage over 48 hours |
| `crp` | "levels in the hundreds"; 100 mg/L; 5-20 mg/L; time course | NICE (point-of-care CRP in lower respiratory tract infection), BSR | the "markedly raised" figures are convention; keep a number only if a retrieved page states it |
| `esr` | "markedly raised" over 100 mm/h | NICE, British Society for Rheumatology | as for CRP |
