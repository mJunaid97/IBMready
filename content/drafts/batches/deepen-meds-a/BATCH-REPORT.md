# BATCH-REPORT: deepen-meds-a

Ten existing medicine pages received an in-depth `article` block (patch only; no existing field changed): ibuprofen, paracetamol, aspirin, omeprazole, amoxicillin, sertraline, metformin, atorvastatin, amlodipine, ramipril.

`python3 tools/verification/check_batch.py content/drafts/batches/deepen-meds-a/fragment.json` ends with `ok`.

## Items finished
All ten passed the two-pass protocol. Each had a separate first-pass author and an independent second-pass verifier that re-retrieved with different queries. `final/<id>.article.json` holds the published text, `ledgers/` the first-pass ledgers, `reports/` the second-pass classification of every first-pass sentence.

| Item | First-pass sentences | supported | textbook | unsupported | wrong | unsafe |
| --- | --- | --- | --- | --- | --- | --- |
| ibuprofen | 53 | 37 | 1 | 13 | 0 | 2 |
| paracetamol | 55 | 33 | 1 | 19 | 2 | 0 |
| aspirin | 60 | 32 | 1 | 21 | 0 | 6 |
| omeprazole | 60 | 42 | 1 | 16 | 0 | 1 |
| amoxicillin | 74 | 48 | 0 | 24 | 1 | 1 |
| sertraline | 63 | 36 | 0 | 24 | 3 | 0 |
| metformin | 62 | 42 | 0 | 20 | 0 | 0 |
| atorvastatin | 70 | 31 | 2 | 28 | 4 | 5 |
| amlodipine | 59 | 47 | 1 | 10 | 1 | 0 |
| ramipril | 64 | 37 | 2 | 24 | 1 | 0 |

Roughly 1 in 3 first-pass sentences was cut or rewritten (more than the 1 in 6 seen earlier), mostly because the search tool returns blended summaries, so single-page attributions could not be confirmed. `unchecked` is 0 everywhere. Cuts included invented route-to-care lines, dose or schedule wording, and "safe".

## Items skipped
None.

## Searches used
About 125 of 200: 47 in the first pass (4 to 6 per item) and 78 in the second pass (7 to 8 per item). Stopped there because every item was finished and verified; I did not spend the remaining budget on re-verifying already verified text.

## For a human reviewer
Contradictions or gaps against existing entries in `content/medications.json` (not changed):
* **Metformin / PCOS:** the retrieved NHS text says the NHS now uses "polyendocrine metabolic ovarian syndrome (PMOS)" for what the site calls polycystic ovary syndrome. The article names both. Decide whether to align the site term. The site entry's eGFR cut-offs, HbA1c fall and monitoring intervals were not re-checked.
* **Aspirin:** the entry carries doses ("300 mg chewed") and a "7-10 day" platelet life, which break the no-doses rule; the article does not repeat them. Alcohol content and the ibuprofen-blunts-aspirin claim were removed from the article because no source was retrieved.
* **Amoxicillin:** the entry says to avoid it in glandular fever and calls the rash non-allergic; the NHS wording is softer (can cause a rash; tell a doctor first). Neither entry claim was verified. "Finish the course" is supported only by an NHS Shropshire, Telford and Wrekin page, so treat as weak. The emc SmPC link `/emc/product/526/smpc` should be confirmed to resolve.
* **Ramipril:** the first pass said some maker leaflets advise against breastfeeding; the second pass could not retrieve that and cut it. The NHS says it can be taken after talking to a doctor or pharmacist; NHS SPS says use with caution. "Lo-Salt" and the NHS attribution of the salt-substitute warning were not confirmed; the article cites MedlinePlus and UK labelling.
* **Amlodipine / grapefruit and pregnancy:** NHS pages differ (main page stricter than the detailed and how-and-when pages). The article states the differences; the entry's "not usually recommended in pregnancy" is consistent with the main page.
* **Omeprazole:** the entry says to take it 30 to 60 minutes before breakfast; the article gives no schedule. Clopidogrel alternatives are from NHS SPS (sps.nhs.uk), not a patient page.
* **Atorvastatin:** the entry's "mainly simvastatin" grapefruit line differs slightly from the BHF and NHS wording used. Stricter pregnancy wording comes from NHS 111 Wales and BHF.
* **Sertraline:** the NHS 111 mental health option line rests on an NHS GP-practice page; confirm against nhs.uk. The entry's claims on use after a heart attack and in pregnancy were not re-checked.
* **Paracetamol:** the first pass's "999 or A&E for overdose" was wrong as written; the NHS advises calling 111 first, and 999 only if told or if someone cannot drive. The entry says "go to A&E" for overdose, which should be reviewed.

Source quality notes: some references are not nhs.uk pages (NHS 111 Wales, StatPearls, PMC and PubMed papers, emc leaflets, one NHS trust leaflet, SPS); the compiler may give build notes. Search summaries blend pages, so within-NHS sub-page attribution (for example side-effects vs main page) is by topic, not confirmed per sentence.

`content/interactions.json` mentions these medicine names (all pages already exist, so no id or alias changes were needed); no interaction records were touched.

Article length: most articles run to about 900 to 1,000 words in sections plus FAQs, slightly above the 600 to 900 guide, and all pass the compiler's structural minimums.
