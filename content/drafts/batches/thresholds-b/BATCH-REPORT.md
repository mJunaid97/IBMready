# Batch thresholds-b: report

Branch `claude/content-thresholds-b`. Fragment: `fragment.json` (one patch, six tests). `check_batch.py` ends with `ok`.
Method: first pass by the author from retrieved search text (ledgers), second pass by two separate subagents with differently worded searches (reports). Searches: roughly 38 for the first pass and about 37 for the second (the reports' own `searchesUsed` figures are approximate because the budget was shared), so about 75 of 200. Budget was not the limit; several UK pages (NG115 text, NHS pages, BSR, CKS) were simply not returned by the search tool.
The second pass changed the first-pass text: the QS68 attribution of the 10-minute ECG figure was wrong (QS68 has no ECG-timing statement), the BSE "above 55%" figure was really "55% or more", the HFrEF record needed a different source, and one spirometry context sentence was unsupported. All were corrected before publishing.

## Per test

| Test | Sourced records | Rewritten qualitatively | Left, and why |
| --- | --- | --- | --- |
| `ecg` | resting rate 60 to 100 (BHF, UK); ECG within 10 minutes (NHS England North NSTEMI guideline quoting ESC, UK; AHA/ACC 2021, US); STEMI = ST elevation in two contiguous leads (Fourth Universal Definition, GLOBAL) | "a third of heart attacks have a normal first ECG" (no source found; one NSTEMI study gave 16.3%) became "a normal first ECG does not rule out a heart attack" (NICE CG95), in `limitations` and `cannotTell[0]` | Descriptive counts (ten electrodes, twelve angles, ten seconds) are not cut-offs and were not re-sourced. "Needs emergency angioplasty" and "tall peaked T waves ... high potassium" were not touched or re-checked |
| `echocardiogram` | normal LVEF 55% or more (BSE 2020 categories, UK); 50% or more (NHS England, UK); reduced EF 40% or less (NICE TA773, UK) | "Ejection fraction 30% ... start heart-failure treatment" became "well below normal ... treatment is considered" | "20-40 minutes" scan duration (quick.sample) is not a cut-off and was not re-sourced. Sources differ (ASE/EACVI 52% men, 54% women; BHF echo guide "over 50 to 55"); the page now says sources differ |
| `holter-monitor` | symptomatic pause over 3 s in people over 40 with recurrent reflex syncope (2021 ESC, EU); pause over 3 s alone does not diagnose sinus node dysfunction (2018 ACC/AHA/HRS, US) | "Pause of more than 3 seconds ... likely pacemaker" reworded to "pacing may be considered, depending on the cause" | No NHS or BHF figure found. Durations in `what` (24 hours to two weeks, up to three years) and `limitations` are not cut-offs and were not re-sourced. A local NHS referral guideline (Cornwall) uses 2.8 s daytime and 4 s night; not used |
| `pulse-oximetry` | normal SpO2 95 to 100 (NHS England diary, UK; MedlinePlus, US); 88 to 92 if at risk of carbon dioxide retention (BTS, UK); PaO2 below 8 kPa = type 1 respiratory failure (University Hospitals Dorset teaching document, UK; weak source, BTS or NICE preferable) | "SpO2 below 92% on air" became "Low SpO2 on air" (only COVID home leaflets and a US source gave 92%); signposting added (999 / NHS 111 / GP same day) | Section labels "Pulse oximeter readings" and "Respiratory failure" not verified word for word |
| `spirometry` | FEV1/FVC below 0.7 (NICE NG115, UK; GOLD, GLOBAL); lower limit of normal, z below -1.645 (ERS/ATS 2022, GLOBAL); bronchodilator response 12% and 200 mL (NICE NG245, UK) and more than 10% of predicted (ERS/ATS 2022, GLOBAL); age over 35 (NICE NG115, UK) | "helps separate asthma from COPD" became "supports asthma but does not settle it" (reversibility also seen in COPD); "poor reversibility" dropped from the COPD finding (NICE: routine reversibility testing not necessary); "smokers over 35 (COPD screening)" now "case-finding in people with symptoms" | "Severity graded by FEV1 % predicted" and the 'restriction' wording are unchanged and were not re-checked. The NG115 recommendation text itself was not returned verbatim (confirmed through NICE QS10, indicator and summaries) |
| `esr` | none | "Markedly raised ESR (over 100 mm/h)" became "far above the laboratory's upper limit". The figure appears only in StatPearls and a review; no NICE, NHS or British Society for Rheumatology page gave one | Cause list (giant cell arteritis, myeloma, serious infection, widespread cancer) kept: supported by StatPearls and secondary studies; myeloma support is secondary (NICE NG12 lists ESR in myeloma assessment but was not retrieved verbatim). "In one hour" method wording untouched |

`esr` ends with no `thresholds[]` because no number is left in its prose. `crp` was not touched (batch thresholds-a).

## Figures repeated on other pages (not edited; maintainer to align)

* `physiology.json` heart-rate page: "typical 60 to 100 beats per minute": BHF agrees (resting adult, some people outside it).
* `conditions/myocardial-infarction` (ECG within 10 minutes) was not located by text search in `content/conditions.json`; check it. NHS England North/ESC and AHA both give 10 minutes of first medical contact or arrival; QS68 does not state it.
* `physiology.json` lung-function page: "FEV1/FVC drops below about 0.7" and the stat "Obstruction threshold FEV1/FVC < 0.7": NICE and GOLD use 0.7, ERS/ATS 2022 uses the lower limit of normal.
* `conditions.json` (COPD/asthma): "FEV1/FVC ratio below 0.7 that does not fully reverse with a bronchodilator": NICE says routine reversibility testing is not necessary for diagnosis.
* `physiology.json` and other oxygen pages, if any, with "88-92%" or "95-100%": values agree with BTS and MedlinePlus.

## For the human reviewer

* The 10-minute ECG record cites an NHS England regional guideline, not NICE; consider a better UK source (e.g. NICE NG185 if it carries a time).
* The PaO2 record cites a hospital teaching document; replace with BTS or NICE if one is found.
* Jurisdiction "EU" is used for ESC guidance; adjust if the schema prefers another value.
* ECG: a Fifth Universal Definition of Myocardial Infarction (2026) exists with the same STEMI lead rule; the record cites the Fourth (2018).
