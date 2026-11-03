# Batch report: guides-scans

Date of source checks: 2026-11-03. Branch: `content/guides-scans`. `check_batch.py` ends with `ok`.

## Finished (12 guides, kind "guide")
MRI, CT, X-ray, ultrasound, ECG, echocardiogram, colonoscopy, gastroscopy, spirometry, DXA bone density, breast screening, cervical screening.
Slugs are the keys in `fragment.json`. Ledgers are in `ledgers/`, second-pass reports in `reports/` (`additions.*.json` hold the separate check of sentences added after the first second pass).

## Dropped
None dropped. Not attempted: biopsy, stress test, Holter monitor, cataract surgery, knee replacement, angioplasty, dialysis (retrieval for biopsy was thin; the rest were not reached).

## Length: below the 700-word target
Body text runs about 410 to 610 words per guide, not 700 to 1,000. The search tool returns blended summaries, not page text, and the second pass removed or reworded about half of the first-pass sentences, so each guide says only what retrieval supported. I did not pad. A reviewer may want to widen the thinnest (breast screening, ultrasound, ECG, DXA).

## Search budget
About 108 of 200 used (first pass and gap-filling 33, independent checkers about 75). Stopped there because further queries returned the same summaries.

## Second-pass results (first-pass sentences, before additions)
Across the 12 guides: 197 supported, 11 textbook, 208 unsupported (most reworded to what the source says, some removed), 7 wrong, 7 unsafe. Roughly half of first-pass sentences changed. Wrong items corrected include: spirometry "measures how much air the lungs can hold", "no direct risks" from lung tests, the biopsy wait after colonoscopy, gastroscopy duration and aftercare timings.

## For a human reviewer
* The checker could read search summaries only, never full nhs.uk pages. "Unsupported" means not found in what was retrieved. Please spot-check against the live pages, especially:
  * Cervical: the 1 July 2025 move from three- to five-yearly screening for ages 25 to 49 after a negative HPV test (check nhs.uk and gov.uk); result timings.
  * Breast: the recall figure ("about 4 in 100") comes from a Royal Marsden page, not NHS England; the trans and non-binary eligibility wording (sources differ between 2 and 5 years of hormones, so the guide avoids a number); the 43 deaths prevented / 129 overdiagnosed per 10,000 figures (2012 review, checker found other sources scaling differently).
  * Spirometry: whether nhs.uk says results arrive "within a few weeks".
  * DXA: T-score and Z-score definitions rest on MedlinePlus (US); the ten-year fracture-risk point rests on FRAX guidance rather than the Royal Osteoporosis Society page.
  * Colonoscopy and gastroscopy: perforation figures differ between trust leaflets; the guides quote them as trust figures.
* Several sources are NHS trust leaflets rather than national NHS pages, because the search tool seldom returned nhs.uk pages. References are labelled accordingly.
* 999 / NHS 111 signposting appears where urgency is mentioned, using wording the sources gave (BHF for heart attack signs, NHS for gastroscopy and colonoscopy). Textbook sentences are at most 2 per guide.
* No existing site page contradicts these guides that I could find; I did not read every linked page in full. `content/interactions.json` was not touched.
