# Conditions: new pages and in-depth articles

Model entity: `docs/authoring/templates/condition.example.json` (the real `asthma` entity plus the `article` block). Look at two more
in `content/conditions.json` (`gerd`, `type-2-diabetes`) before you start. Collection name in a fragment: `conditions`.

## A new condition (`{"conditions": {"<id>": {...}}}`)

`<id>` is a lowercase hyphenated slug (`irritable-bowel-syndrome`). Fields, in the order the page shows them:

| Field | Rules |
| --- | --- |
| `name` | The name people search for ("Irritable bowel syndrome"), sentence case. |
| `aliases` | Other names and abbreviations people type ("IBS", "spastic colon"). Used by search. |
| `category` | one of `cardiovascular`, `respiratory`, `neurological`, `mental-health`, `digestive`, `musculoskeletal`, `endocrine`, `urinary`, `reproductive`, `skin` (skin, allergy and eyes), `infection` (infections that are not tied to one organ system), `other` (blood, immune system, cancers of other organs and anything else); the filter chips on `/conditions/` come from it |
| `definition` | One sentence, plain words. |
| `overview` | A paragraph (250 to 700 characters): what it is, who it affects, the main picture. |
| `affects` | `{"organs": [...], "systems": [...], "structures": [...]}`. Organ ids and system ids only from the lists below; `structures` must be exact atlas names (`data/hd/atlas.json`, `structures[].name`): use them sparingly and only after checking the name exists. |
| `causes`, `riskFactors`, `signs`, `complications` | Lists of short sentences. `signs` = what a clinician may find. |
| `symptoms` | Symptom page ids (list below), only those that genuinely fit. |
| `diagnosis` | A paragraph: how it is diagnosed, in words (no cut-offs). |
| `tests`, `imaging`, `procedures`, `medications` | Ids of existing pages (lists below). Link only what the sources connect to this condition. |
| `treatment` | A paragraph: usual approaches by type. No doses. |
| `prevention` | A short paragraph, or what is known about prevention. |
| `seekCare` | Who to contact and how fast (999 / A&E, NHS 111 or same-day GP, routine GP). Required wording discipline: the route is named. |
| `related` | Ids of related conditions (existing pages only). |
| `terms` | optional ids from `content/terms.json` |
| `references` | At least 3, from at least 2 publishers, at least one official health body (NHS, NICE, NHS inform, GOV.UK, NIH institute, MedlinePlus, CDC, WHO, NCI). `{"title": "NHS: Angina", "url": "https://www.nhs.uk/conditions/angina/"}`; add `"section"` where a specific part is cited. |
| `urlAliases` | optional extra slugs that redirect to the page ("ibs"). A slug that is already a page id or another page's alias is an error; if your new id equals an alias of an existing page (for example `angina` is an alias of `coronary-artery-disease`), add a `patch` for that page that sets its `urlAliases` without it. |
| `article` | **Required for new pages**: the in-depth block, below. |

## The `article` block (new pages, and on its own for deepening an existing page)

```json
"article": {
  "sections": [{"heading": "...", "body": "paragraph\n\nparagraph"}],     // 4 to 7 sections, 110 to 220 words each
  "faqs": [{"q": "Can X be cured?", "a": "40 to 90 words that stand alone."}],   // 4 to 6 questions people actually ask
  "keyFacts": [{"label": "Also called", "value": "..."}]                  // 5 to 7 rows, no numbers you cannot source
}
```

Aim for **800 to 1,200 words in the article block** on top of the structured fields. Do not repeat the structured fields; add what a
reader needs next: how it feels and progresses, the types or stages, what an appointment and the tests involve, the treatment options and
what they are for (by type, no doses), living with it and self-care the sources describe, complications and outlook in words, and
the questions people ask. Section headings are phrased the way people search ("What are the symptoms of ...?", "How is ... diagnosed?",
"What is the outlook?", "Living with ..."). Body text is plain paragraphs separated by a blank line: no markdown, bullets or bold.

## Deepening an existing condition (`{"patch": {"conditions": {"<id>": {"article": {...}, "references": [...]}}}}`)

Add only the `article` block and the extra `references` it needs. Read the page's current fields first and do not contradict them; if you
find an existing statement the sources contradict, list it in `BATCH-REPORT.md` (do not silently change it). References you add are appended.

## Valid ids

* Organs: brain, cerebellum, brainstem, eye, ear, nose, tongue, larynx, trachea-bronchi, lungs, heart, coronary, aorta, diaphragm, pelvic-floor, oesophagus, stomach, small-intestine, large-intestine, liver, gallbladder, pancreas, spleen, kidneys, adrenals, bladder, ureters, prostate, testes, penis, uterus, ovaries, vagina, uterine-ligaments, vulva, breasts, neovagina, neophallus, pituitary, thymus, skull, spine, rib-cage, pelvic-girdle, shoulder-girdle, hand, foot, knee.
* Systems: skeleton, joints, teeth, muscles, heart, arteries, veins, nervous, sensory, respiratory, digestive, urinary, reproductive, endocrine, lymphatic, skin, reproductive-female.
* Symptoms: headache, chest-pain, abdominal-pain, back-pain, knee-pain, shortness-of-breath, dizziness, fatigue, nausea, vomiting, fever, cough, swelling, rash, numbness, tingling, weakness, joint-pain, breast-lump, heavy-periods, pelvic-pain, vaginal-bleeding.
* Tests: complete-blood-count, blood-glucose, hba1c, liver-function-tests, kidney-function-tests, lipid-profile, electrolytes, thyroid-function-tests, hormone-tests, urinalysis, urine-culture, urine-protein, pregnancy-test, ecg, echocardiogram, stress-test, holter-monitor, spirometry, pulmonary-function-tests, pulse-oximetry, endoscopy, biopsy, genetic-testing, microbiology-tests, troponin, bnp, crp, esr, tsh, ferritin, creatinine-egfr, prothrombin-time-inr, iron-studies, vitamin-b12-folate, vitamin-d, hepatitis-b-serology, hiv-test, blood-pressure-measurement, cervical-screening.
* Imaging: x-ray, ct-scan, mri, ultrasound, pet-scan, mammography, fluoroscopy, dxa-scan. Procedures: appendectomy, cholecystectomy, knee-replacement, cataract-surgery, angioplasty, coronary-bypass, cardiac-catheterization, upper-endoscopy, colonoscopy, bronchoscopy, dialysis, blood-transfusion, urinary-catheterization, joint-aspiration, caesarean-section, chest-masculinisation, hysterectomy, phalloplasty, vaginoplasty.
* Medications: aspirin, ibuprofen, paracetamol, morphine, atorvastatin, ramipril, metoprolol, amlodipine, furosemide, glyceryl-trinitrate, apixaban, warfarin, metformin, insulin, levothyroxine, salbutamol, inhaled-corticosteroids, omeprazole, amoxicillin, cetirizine, sertraline, prednisolone, allopurinol, alendronate, losartan, lisinopril, rosuvastatin, azithromycin, clopidogrel, bisoprolol, citalopram, clarithromycin, tramadol, oxycodone, chlorphenamine, beclometasone, influenza-vaccine, iodinated-contrast, fluorodeoxyglucose-f18, estradiol, testosterone (more are added by other batches; the compiler rejects an unknown id).
* Conditions (for `related`): the ids in `content/conditions.json`. Physiology and health pages: `content/physiology.json`, `content/health.json`.

Run `python3 tools/verification/check_batch.py <fragment.json>`: it lists unknown ids, bad structure names, missing fields, and prints the
word count and whether the page would be published. A page that is "NOT PUBLISHABLE" is not accepted.
