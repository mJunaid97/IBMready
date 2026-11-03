# BATCH-REPORT: deepen-conditions-a

Branch: `content/deepen-conditions-a`. Fragment: `fragment.json` (one `patch` object). `check_batch.py` ends with `ok`; all 8 pages remain indexable.

## Items finished (all 8, each through both passes)

| Page | Sections / FAQs / key facts | Article words | New refs | First-pass sentences: supported / textbook / unsupported / wrong / unsafe | Second-pass searches |
| --- | --- | --- | --- | --- | --- |
| hypertension | 6 / 5 / 5 | 1,145 | 18 | 34 / 2 / 33 / 0 / 0 | 16 |
| type-2-diabetes | 6 / 5 / 7 | 1,144 | 17 | 32 / 0 / 31 / 0 / 2 | 16 |
| asthma | 5 / 5 / 6 | 1,127 | 11 | 34 / 2 / 49 / 0 / 0 | 16 |
| migraine | 6 / 5 / 6 | 1,174 | 14 | 48 / 0 / 23 / 0 / 0 | 15 |
| copd | 6 / 5 / 7 | 1,179 | 12 | 41 / 1 / 29 / 0 / 0 | 13 |
| stroke | 6 / 5 / 6 | 1,131 | 16 | 36 / 0 / 37 / 0 / 0 | 16 |
| heart-failure | 6 / 5 / 7 | 1,166 | 11 | 40 / 1 / 30 / 1 / 0 | 16 |
| atrial-fibrillation | 6 / 6 / 7 | 1,186 | 6 | 50 / 0 / 27 / 0 / 0 | 10 |

Items skipped: none. Overall about 44% of first-pass sentences were unsupported, wrong or unsafe and were cut or reworded, so the independent pass changed the text a lot. Two "unsafe" sentences (type 2 diabetes: a routine route for worsening vision and for cracked or blistered feet) were replaced by the NHS inform route (urgent podiatrist or GP, NHS 111 if the practice is closed). One "wrong" sentence (heart failure: "very little alcohol") was replaced by what the NHS says.

## Searches used: about 172 of 200
3 by the coordinator, 51 in the first pass (hypertension 9, type 2 diabetes 8, asthma 5, migraine 4, COPD 7, stroke 7, heart failure 7, AF 4), 118 in the second pass. Each second-pass checker worked from the draft article only and did not open the ledger.

## Files
`fragment.json`; `ledgers/<id>.ledger.json` (first-pass ledgers, written before the second pass); `reports/<id>.report.json` (second-pass classification of every first-pass sentence plus replacements); `final/<id>.json` (the verified article and references that `fragment.json` is built from); `drafts/<id>.draft.json` (first-pass text, superseded, kept only as the record the reports refer to; not part of the fragment).

## For a human reviewer
* Wording that remains in the published text because the retrieved text states it and the sentence attributes it: "over 35" and "around 9 in 10" (COPD); "15 days a month" for chronic migraine, "72 hours" and "an hour" for aura, "1 in 3" with aura (migraine); "1 in 7 strokes in the United States" (CDC, marked US, AF); the Stroke Helpline number 0303 3033 100 (taken from a retrieved Stroke Association page title; worth a quick look). No doses, strengths, test cut-offs or reference ranges are in the new prose.
* Sources outside the usual host list that were kept as references: NHS 111 Wales, NHS Scotland Right Decisions, several NHS trust or formulary leaflets, and (asthma) an NHS Nottinghamshire Area Prescribing Committee PDF. Replace them if the site prefers national pages only.
* Medicine names inside the new text (for example metformin, SGLT2 inhibitors, GLP-1 agonist, candesartan, triptans) are in prose only; no medicine ids were added or linked.

## Existing-page statements the sources contradicted or could not support (existing fields NOT edited)
Items marked (C) were contradicted by retrieved text; the rest were simply not found in retrieved UK/official text.

**hypertension**
* `seekCare`: "180/120 or higher ... call 999" was not found as a UK rule; the NHS routes by symptoms. NHS England text elsewhere gave a different early-assessment figure (C or unclear).
* `overview`: "one adult in three", "half do not know", "biggest contributor worldwide" not found. `causes`: "over 90% primary", adrenal tumours, narrowed renal arteries not found.
* `symptoms` lists dizziness, which no NHS page retrieved names; headache is described as a rare symptom of very high pressure.
* `treatment`: "most people need two or more" and "thiazide-like" not found (the NHS says more than one may be needed). `riskFactors`: Black African or Caribbean ancestry as such not found (NHS says ethnicity affects first-choice medicine).
* `definition` carries 140/90 and 135/85 in prose (matches NHS/NICE; MedlinePlus, US, uses a lower figure). The site rule says cut-offs belong in separate records.

**type-2-diabetes**
* `treatment`: "metformin first, then SGLT2 inhibitors" (C in part): the current NHS page describes metformin with an SGLT2 inhibitor as the usual start for people without other serious conditions.
* `diagnosis` puts HbA1c and glucose cut-offs in prose; supported only by NHS Scotland guidance.
* `overview`: "over 90% of diabetes" (MedlinePlus gives 90 to 95%, US), "early" weight loss for remission not found. `prevention`: "programmes halve the risk" not found.
* `seekCare`: "chest pain" and "sudden vision change" routes not found; the NHS 999/A&E list retrieved is passing urine a lot, very thirsty, feeling sick, confused or very sleepy, short of breath.
* `riskFactors`/`signs`: age over 40 and the South Asian/Black/Hispanic wording, acanthosis nigricans not found.

**asthma**
* `causes` (C): the page says genetic susceptibility plus early viral infections and more; the NHS says the cause is not fully understood and lists specific risk factors (family history of asthma or atopic conditions, childhood bronchiolitis, childhood tobacco smoke, mother smoking in pregnancy, prematurity or low birth weight).
* Not found: `overview` "one child in ten and one adult in twelve"; `seekCare` "peak flow below a third of best" (also a test cut-off in prose); `riskFactors` obesity, eczema and hay fever; `signs` silent chest, accessory muscles; `complications` airway remodelling; `tests`/`imaging` pulse oximetry, full blood count, X-ray (NHS lists FeNO, spirometry, peak flow); `related` pneumonia; the Global Initiative for Asthma reference.
* `treatment`: reliever-only use is no longer recommended per Asthma + Lung UK/NICE; the page's wording ("a reliever inhaler for symptoms", "long-acting bronchodilator as needed") is incomplete.

**migraine**
* `treatment`: "gepants ... used alongside triptans" (C: the Migraine Trust describes them as an option when triptans cannot be taken or do not work); "a triptan taken early" not supported (NHS advises painkillers as soon as the headache starts).
* `prevention`: painkillers "fewer than 10 days a month" (C: the Trust gives 15 or more days for simple painkillers and 10 or more for triptans and opioids; NICE 15 or more).
* `seekCare`: aura "peaks within a minute" (C: NICE says within 5 minutes); "first-ever aura after 50", "worst ever", "fever, stiff neck" not in the retrieved NHS 999 list; the urgent NHS 111/GP route is missing.
* `overview` not found: "one person in seven", "leading cause of disability in young women", "cortical spreading depression", "aura begins within the hour before the headache", "triggers precede an attack by less than two days". "Brain excitability rather than blood vessels alone" differs from the NHS ("changes to nerves and blood vessels"). Also not found: "Age 20 to 50", stroke-risk complication line, "scans only for red-flag features". Supported: "a third have aura", "4 to 72 hours", "15 or more headache days" for chronic migraine.

**copd**
* `definition` "almost always from smoking" (C in part): CDC, NHS and WHO say people who have never smoked can get COPD (article says so). `causes` "85 to 90%" vs NHS "around 9 in 10".
* `treatment` "the only measure that slows decline" (not supported; NHS: most effective way to prevent worsening); "steroids and often antibiotics" ("often" not supported).
* `diagnosis` carries the 0.7 FEV1/FVC cut-off in prose (NICE NG115 uses it; some UK guidance prefers lower limit of normal).
* Not found: "third leading cause of death worldwide", barrel chest, cyanosis, osteoporosis/muscle wasting, lung cancer, pack-years, childhood infections, asthma as a risk factor; the carbon dioxide retention gloss in `seekCare`.

**stroke**
* `definition` "ischaemic, 85%" not supported (NHLBI about 87%; one study 88%).
* `treatment` carries timing numbers (4.5 h, 6 h, 24 h) in prose, supported by NICE/NHS summaries but against the site rule. Not found: anticoagulation if AF is found, anticoagulant reversal and surgery for bleeds. NICE advises against starting statins immediately in acute stroke but continuing them in people already taking them.
* `diagnosis` lists immediate CT, CT/MR angiography, glucose to exclude hypoglycaemia, echocardiography and carotid ultrasound; the NHS lists blood tests, CT, MRI, ultrasound and an ECG.
* `overview` "dies within minutes", "works only in the first hours" not retrieved (NHS: treatment is most effective as soon as possible). `causes`/`riskFactors`: dissection, malformations, age, excess alcohol not retrieved (NHS does list reducing alcohol under prevention). `complications` "Seizures" unconfirmed.
* Aliases "TIA" and "CVA": the NHS and Stroke Association treat a TIA as a separate warning-sign condition, so the alias may mislead.

**heart-failure**
* `seekCare`: "more than 2 kg in three days" is not in retrieved NHS/NHLBI text (they say "sudden weight gain"); it says "seek urgent help" without naming 999 versus NHS 111 or a same-day GP.
* `overview` "There is no cure" (C in part): the NHS says no cure for most people; one NHS-affiliated summary says a cure may be possible with a treatable cause such as damaged valves.
* `diagnosis` "BNP is raised": NICE/NHS England speak of NT-proBNP, with levels deciding how fast the referral is.
* Not found: "raised filling pressures", "coronary artery disease is the commonest cause", cocaine and heart tumours, "ACE inhibitors or ARNI ... mineralocorticoid antagonists ... prolong life", transplantation "rarely", the signs list (jugular venous pressure, third heart sound, enlarged liver, pitting oedema).

**atrial-fibrillation**
* `overview` "causes one in five strokes" (C: CDC says about 1 in 7, US); "hundreds of impulses swirl" mechanism, "no P waves", "pulse deficit" not found.
* `riskFactors` "Age over 65" (C: retrieved NHS-family text says 55 or older); family history, overweight, alcohol binges, lung disease not found (NHS lists age, sex, smoking, some medicines, high blood pressure, heart attack, kidney disease, overactive thyroid, diabetes, sleep apnoea).
* `treatment`: digoxin, the stroke-risk score components and surgical approaches not found; the NHS lists beta blockers and calcium-channel blockers.
* `seekCare` says "urgent care" for palpitations with chest pain; the NHS says 999 for that.

## Cross-cutting
* Nothing in the new article text contradicts an existing field; where the article states a source's figure that differs from the page (for example AF stroke share, COPD smoking share) it is attributed to the source and marked US where relevant.
* The same pattern appears across pages: cut-offs and timings in `definition`/`diagnosis`/`treatment`/`seekCare` prose, and urgent advice without a named route. A separate edit pass on the structured fields would remove most of the items above.
