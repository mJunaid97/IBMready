# Deepening existing pages: an in-depth `article` block for pages that have none

Read `docs/authoring/README.md` first, then `docs/authoring/conditions.md` (the `article` block and the patch format) and, for medicines, `docs/authoring/medications.md`. Your batch id is one of
`deepen-conditions-a`, `deepen-conditions-b`, `deepen-conditions-c`, `deepen-conditions-d`, `deepen-meds-a`, `deepen-meds-b`. Branch to push to: `content/<batch id>`. Batch directory: `content/drafts/batches/<batch id>/`.

These pages already exist and are published; most are short (a median of about 600 words for a condition). Your job is to add the in-depth `article` block of what readers search, written from retrieved text with the full two-pass evidence protocol,
without changing any existing field. Read the page's current entry in `content/conditions.json` or `content/medications.json` first and do not contradict it; where the sources contradict an existing statement, list it in `BATCH-REPORT.md` (do not silently change it).

Fragment format (one `patch` object for the whole batch):

    {"patch": {"conditions": {"<id>": {"article": {"sections": [...], "faqs": [...], "keyFacts": [...]}, "references": [{"title": "...", "url": "..."}]}}}}
    {"patch": {"medications": {"<id>": {"article": {...}, "references": [...]}}}}

`references` are appended (only the new sources the article cites). Validate with `python3 tools/verification/check_batch.py content/drafts/batches/<batch id>/fragment.json`.

What the article adds (do not repeat the structured fields): how it feels and progresses, the types or stages, what an appointment and the tests involve, the treatment options and what they are for (by type; no doses), living with it and self-care the sources describe, complications and outlook in
words, the questions people ask. Section headings are phrased the way people search ("What are the symptoms of ...?", "How is ... diagnosed?", "Living with ..."). Conditions: 4 to 7 sections of 110 to 220 words, 4 to 6 FAQs, 5 to 7 key facts (800 to 1,200 words in all). Medicines: 4 to 6 sections
("What is X used for?", "How does X work?", "Side effects", "Taking X with other medicines or alcohol", "Who needs extra care?"), FAQs, key facts (600 to 900 words); no doses, schedules or strengths. Name the route to care wherever urgency is mentioned; UK sources first.

## Items (finish them in this order; if the budget runs short, finish the first ones properly)

* `deepen-conditions-a`: `hypertension`, `type-2-diabetes`, `asthma`, `migraine`, `copd`, `stroke`, `heart-failure`, `atrial-fibrillation`
* `deepen-conditions-b`: `breast-cancer`, `lung-cancer`, `colorectal-cancer`, `osteoarthritis`, `rheumatoid-arthritis`, `osteoporosis`, `gerd`, `urinary-tract-infection`
* `deepen-conditions-c`: `epilepsy`, `parkinsons-disease`, `alzheimers-disease`, `chronic-kidney-disease`, `anaemia`, `hypothyroidism`, `hyperthyroidism`, `gout`
* `deepen-conditions-d`: `pneumonia`, `myocardial-infarction`, `deep-vein-thrombosis`, `pulmonary-embolism`, `type-1-diabetes`, `ovarian-cancer`, `cervical-cancer`, `polycystic-ovary-syndrome`
* `deepen-meds-a` (medicines): `ibuprofen`, `paracetamol`, `aspirin`, `omeprazole`, `amoxicillin`, `sertraline`, `metformin`, `atorvastatin`, `amlodipine`, `ramipril`
* `deepen-meds-b` (medicines): `levothyroxine`, `prednisolone`, `salbutamol`, `warfarin`, `apixaban`, `citalopram`, `losartan`, `lisinopril`, `bisoprolol`, `tramadol`

Medicine pages that carry an emergency or dependence warning (tramadol, warfarin and apixaban bleeding signs, prednisolone) must name the route to care in the article as the NHS does.
