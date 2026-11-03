# Guides: evergreen explainers, one batch per theme

Read `docs/authoring/README.md` and `docs/authoring/blog.md` first. Your batch id is one of `guides-blood-tests`, `guides-scans`, `guides-symptoms-a`,
`guides-symptoms-b`, `guides-medicines`, `guides-conditions`, `guides-lifestyle`, `guides-mind-and-life`; use your section below. Branch to push to:
`content/<batch id>`. Batch directory: `content/drafts/batches/<batch id>/`.

A guide answers one question people type into a search box ("What does a high CRP mean?"). It is `"kind": "guide"`, dated with today's date for `published` and `updated`,
**700 to 1,000 words** in five to seven `body` sections whose headings are the questions a reader asks next ("What does it measure?", "Why is it high?", "What happens next?"),
with 4 to 6 `keyPoints`, `summary` of 70 to 160 characters that **answers the question** (it is the search snippet), and `name` of 15 to 49 characters (the page title; write it as
the search phrase: "High CRP: what it means and what happens next" is 44).

Rules specific to guides:

* A guide is built from the retrieved text of **at least two publishers**, one of them an official UK body (NHS, NICE, NHS inform, UKHSA, GOV.UK) wherever one exists; cite 3 to 6 in `references`.
* Do not restate a single existing page: combine what the reader needs across the site's pages and the sources. Read the site's page for the topic first (`content/tests.json`,
  `content/biomarkers.json`, `content/conditions.json`, `content/symptoms.json`, `content/medications.json`) and do not contradict it; report any statement you find the sources contradict.
* Link the post to every existing page it is about, with the link fields at the top level of the post (`tests`, `biomarkers`, `conditions`, `symptoms`, `medications`, `drugClasses`,
  `physiology`, `health`, `procedures`, `imaging`), and add `anatomy` when a part of the body is the subject. Three or more links is the norm.
* No reference ranges, cut-offs, doses or timings the retrieved text does not state; where a result has a range, say "the laboratory report shows the reference range used" instead.
* Pick questions whose answers the NHS/NICE sources give directly. If your searches cannot support a topic, drop it and take the next on your list or a similar question of your own choosing
  (check it is not already a page and not on another guide batch's list).
* Use your search budget: expect about 12 to 18 searches per guide including the independent second pass; plan 10 to 12 guides per session and stop only when about 190 searches are spent.
* Plain, calm, UK English; no scare language; every urgency statement names its route (999 / NHS 111 / GP).

## `guides-blood-tests`: blood and urine test results, explained

Seed questions (use ids from the site where they fit): what a high CRP means (`crp`); what a low ferritin level means (`ferritin`, `iron-studies`); how to read a cholesterol test (`lipid-profile`);
what an HbA1c test shows (`hba1c`); what liver function tests show (`liver-function-tests`); what eGFR and creatinine mean (`creatinine-egfr`, `kidney-function-tests`); what a high white blood cell count
means (`complete-blood-count`); thyroid blood tests TSH and T4 explained (`tsh`, `thyroid-function-tests`); vitamin D tests (`vitamin-d`); vitamin B12 and folate tests (`vitamin-b12-folate`); what a troponin test is
for (`troponin`); what a raised ESR means (`esr`); what INR measures (`prothrombin-time-inr`, `warfarin`); what a urine dipstick test looks for (`urinalysis`); what an electrolyte (sodium and potassium) result
means (`electrolytes`); blood glucose testing (`blood-glucose`); what a full blood count measures (`complete-blood-count`).

## `guides-scans`: scans, procedures and screening: what to expect

Seed questions: what to expect from an MRI scan (`mri`); a CT scan (`ct-scan`); an X-ray (`x-ray`); an ultrasound scan (`ultrasound`); what an ECG records (`ecg`); what an echocardiogram shows (`echocardiogram`);
colonoscopy preparation and what happens (`colonoscopy`); a gastroscopy / upper endoscopy (`upper-endoscopy`, `endoscopy`); what a biopsy is (`biopsy`); spirometry and breathing tests (`spirometry`, `pulmonary-function-tests`);
a DXA bone density scan (`dxa-scan`); mammography and breast screening (`mammography`); cervical screening (`cervical-screening`); a stress test (`stress-test`); a Holter monitor (`holter-monitor`); cataract surgery (`cataract-surgery`);
knee replacement: what to expect (`knee-replacement`); having an angioplasty (`angioplasty`); dialysis (`dialysis`).

## `guides-symptoms-a`: pain and the big symptoms: causes, red flags, what happens at the GP

Seed questions: chest pain: causes and when it is an emergency (`chest-pain`); headache types and warning signs (`headache`); shortness of breath (`shortness-of-breath`); abdominal pain by area (`abdominal-pain`); back pain: what helps and
when to seek care (`back-pain`); knee pain (`knee-pain`); joint pain (`joint-pain`); nausea and vomiting (`nausea`, `vomiting`); a cough that will not go (`cough`); sore throat; ear pain; neck pain; shoulder pain; hip pain. Each names
the 999 / NHS 111 / GP routes exactly as the NHS does.

## `guides-symptoms-b`: everyday symptoms: tiredness, dizziness, fever, skin, bleeding

Seed questions: causes of fatigue and tiredness (`fatigue`); dizziness and lightheadedness (`dizziness`); fever in adults (`fever`); rashes: common types (`rash`); swollen ankles and legs (`swelling`); numbness and tingling (`numbness`, `tingling`);
muscle weakness (`weakness`); heavy periods (`heavy-periods`); pelvic pain in women (`pelvic-pain`); a breast lump: what happens next (`breast-lump`); vaginal bleeding after menopause or between periods (`vaginal-bleeding`); blood in urine;
unexplained weight loss; night sweats; a lump or swelling.

## `guides-medicines`: questions about taking medicines (the NHS Medicines pages answer most of them)

Seed questions: can you take ibuprofen and paracetamol together? (`ibuprofen`, `paracetamol`); can you drink alcohol with antibiotics? (`amoxicillin`, `azithromycin`); how long do antidepressants take to work? (`sertraline`, `citalopram`, `ssris`);
statins: common questions (`atorvastatin`, `rosuvastatin`, `statins`); taking warfarin or apixaban: why other medicines and food matter (`warfarin`, `apixaban`); ACE inhibitors, ARBs and calcium-channel blockers: how they differ
(`ramipril`, `lisinopril`, `losartan`, `amlodipine`); metformin: what to expect (`metformin`); inhalers: reliever and preventer (`salbutamol`, `beclometasone`); opioid painkillers (`morphine`, `oxycodone`, `tramadol`, `opioids`);
antibiotics and why they do not work for viruses; antihistamines: sedating and non-sedating (`cetirizine`, `chlorphenamine`); levothyroxine: why timing and other medicines matter (`levothyroxine`); steroid tablets (`prednisolone`); what proton pump
inhibitors do (`omeprazole`); medicines and driving. Say "the NHS says"; never give a dose or an instruction for an individual; name the route to advice (pharmacist, GP, NHS 111) for any "what if I miss a dose / have a side effect" question.

## `guides-conditions`: comparisons and "what next" for common conditions

Seed questions: flu or cold: how they differ (`influenza` if present, else NHS flu/cold pages); type 1 and type 2 diabetes compared (`type-1-diabetes`, `type-2-diabetes`); heart attack, cardiac arrest and angina compared
(`myocardial-infarction`, `coronary-artery-disease`); stroke and TIA: spotting the signs (`stroke`); asthma and COPD compared (`asthma`, `copd`); osteoarthritis and rheumatoid arthritis compared (`osteoarthritis`, `rheumatoid-arthritis`);
heartburn, acid reflux and GERD (`gerd`); urinary tract infection and cystitis (`urinary-tract-infection`); migraine and tension headache (`migraine`); anaemia types and causes (`anaemia`); kidney stones: symptoms and treatment (`kidney-stones`);
gallstones (`gallstones`); high blood pressure: what the numbers mean and what happens next (`hypertension`, `blood-pressure-measurement`); an underactive and an overactive thyroid compared (`hypothyroidism`, `hyperthyroidism`); sepsis: warning signs (`sepsis`).

## `guides-lifestyle`: everyday health, from the NHS Live Well pages and NICE public-health guidance

Seed questions (check the ids in `content/health.json`): sleep: how much and what helps; healthy weight and how it is assessed; alcohol and health: the UK low-risk drinking guidance as the NHS states it; stopping smoking: what support the NHS offers;
physical activity guidelines for adults as the NHS/UK Chief Medical Officers state them; healthy eating: the Eatwell Guide; stress and how the body responds; hydration; vitamins and supplements: who the NHS says may need them; sun safety and skin checks;
blood pressure at home; cholesterol and diet; bone health. State numbers (weekly units, minutes of activity) **only** where the retrieved NHS/CMO text states them and attribute them ("the UK Chief Medical Officers advise ...").

## `guides-mind-and-life`: mental health and life stages (sensitive: supportive language, crisis route on every page that touches mental health)

Seed questions: how to recognise anxiety and what treatment involves; depression: signs and getting help; panic attacks: what they are; how NHS talking therapies work (self-referral); how to support someone with a mental health problem;
loneliness and health; grief; menopause symptoms and the help available; pregnancy: the antenatal care the NHS offers; common newborn and baby health questions the NHS answers (fever, rashes); children's fevers and when to seek help; falls in older people and how
to reduce risk; hearing loss and hearing tests; dementia: early signs and how it is assessed. For every page touching mental health include: if you or someone else is in immediate danger call 999; NHS 111 (mental health option) for urgent help; Samaritans 116 123 (free, any time). Do not give survival statistics, methods or
anything that could be read as a how-to; follow the NHS wording; no stigmatising terms.
