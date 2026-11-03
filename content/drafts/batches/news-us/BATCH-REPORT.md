# Batch report: news-us (US agencies: FDA, CDC, NIH)

Window 1 July to 3 November 2026. 18 briefs in `fragment.json`; each has a ledger (`ledgers/`) and a second-pass report (`reports/`).

## Briefs (all say it is a US decision or US research news; UK availability decided separately by the MHRA and NICE)

FDA approvals: gedatolisib breast cancer (14 Jul), Trutakna IgA nephropathy (7 Jul), Casgevy ages 2+ (1 Jul), zidesamtinib lung cancer (22 Jul), Ezplaz freeze-dried plasma (29 Jul), Stelara paediatric ulcerative colitis (28 Aug), imlunestrant + abemaciclib (18 Sep), Camzyos children (30 Sep), tucatinib maintenance (7 Oct), atezolizumab colon cancer (8 Oct), dostarlimab rectal cancer (19 Oct), Hibsago hepatitis B (20 Oct), generic Climara Pro patch (20 Oct).
FDA safety: Injectafer boxed warning (1 Sep), Vitruvias thyroid tablet lot recall (company 21 Aug, FDA 24 Aug).
CDC: 2026-27 respiratory season outlook (23 Sep). NIH: losartan and brown fat in mice (14 Oct), extra year of school and dementia (23 Oct).

## Second pass
Separate subagents re-retrieved each brief with differently worded, domain-restricted searches and classified every sentence (summary, key points, body). Across the 18 reports: 156 supported, 39 textbook (most are the editorial UK-availability line), 14 unsupported, 1 wrong. Every unsupported or wrong sentence was cut or reworded to what the retrieved text says before the fragment was built (for example: "phase 2" and "alone" for AZUR-1, taxane wording for tucatinib, Real-Time Oncology Review for zidesamtinib, "heart rhythm problems" and "safety, purity and potency" in the thyroid recall, the Ezplaz safety sentence). The "This is a US decision" sentence is editorial; its ledger basis is `editorial`.

## Dropped items
- Lipfendra (oral PCSK9 inhibitor): FDA sources disagree on the date (15, 16 or 17 July) and none gave 17 July in retrieved text; dropped rather than guess.
- Awiqli weekly insulin for children: day of announcement (22 or 23 Oct) not confirmable; dropped.
- Leqembi at-home starting dose: retrieved label still shows an intravenous starting dose; dropped.
- Tavapadon (Juvmo): only a listing row, no FDA announcement or label retrieved; dropped.
- NIH circular-RNA Alzheimer's blood test: release date not retrievable; dropped.
- CDC flu vaccination coverage, MMWR pertussis (Alaska), measles MMWR items, NIH Long COVID antiviral trial, COVID-19 2026-27 vaccine formula: the site has no matching page to link, so they would not be published; not written.
- Many FDA approvals (pancreatic cancer, melanoma, myeloma, bladder cancer, rare diseases) have no matching site page.

## For a reviewer
- Dates of Casgevy (1 Jul) and Ezplaz (29 Jul) rest on approval letters and FDA press listings, not on a date printed in retrieved press-release text. Stelara (28 Aug) rests on the FDA news item and orphan-drug database.
- Casgevy is linked to the `anaemia` page only because no sickle cell page exists; Camzyos to `heart-failure` (boxed warning) because no cardiomyopathy page exists.
- Search summaries blend pages; evidence strings in reports are search extracts (WebFetch is blocked).
- Short briefs: a few are under 150 words (tucatinib about 110); nothing was padded.

## Searches
About 135 of 200 used (about 66 discovery and first pass, about 69 across six verification subagents). Discovery stopped returning new dated items that the site can link to.
