# Batch thresholds-a: report

Searches used: about 53 of 200 (author 21, second-pass subagents 18 + 14). The search tool returns blended summaries, so URL attribution is a judgement; each ledger note says where this applies. WebFetch was not available for publishers. Two-pass protocol followed: ledgers in `ledgers/`, second-pass reports in `reports/` (classes: 52 supported, 1 textbook, 1 unsupported, 0 wrong, 0 unsafe; the unsupported item was cut).

## Per test

**blood-glucose.** Records: diabetes fasting 7.0, random 11.1, 2-hour OGTT 11.1 (Diabetes UK), impaired fasting glucose 6.1-6.9 (WHO via NICE glossary, GLOBAL), NICE high-risk band 5.5-6.9 (UK), 5.6-6.9 (MedlinePlus, US), hypoglycaemia below 4 (UK), fasting at least 8 h. Prose changed: the 5.6 lower bound is no longer presented as the page's IFG limit; the page now says 6.1 (WHO) and states that NICE uses 5.5 and US sources 5.6. "8-12 hours" fasting became "at least 8 hours" (12 was not retrieved). A UCLH figure of 3.6 mmol/L was retrieved in pass 1 but could not be re-retrieved in pass 2, so it is not published. Left untouched, no number issue: "75 g" (now has a record), "sulfonylurea" and "call 999" in the hypoglycaemia row (not re-retrievable; kept deliberately as the safe emergency route).

**kidney-function-tests.** Records: CKD eGFR below 60 for over 90 days (NG203, copied from `creatinine-egfr`), G1 90 or above only with damage markers and G3a 45-59 (US National Kidney Foundation, KDIGO-based), G5 below 15 (NG203). "Over 90 normal" reworded to say 90 or above is normal only without other kidney damage. "Staged 3-5" became "G3a to G5". "Half of kidney function" is now "a substantial share" (reviews and an NHS teaching document support roughly half, none is a UK guideline). Not added as records (retrieved in pass 2 only): G3b 30-44 and G4 15-29 (KDIGO 2012/2024); the existing `creatinine-egfr` records already carry them.

**urine-protein.** Records: ACR A1 below 3, A2 3-30, A3 above 30 (NG203); confirmed ACR of 3 or more; repeat an initial ACR of 3-70 on an early-morning sample (UK Kidney Association); nephrotic range above 300 mg/mmol, labelled as a protein:creatinine ratio (North Bristol NHS Trust; Oxford uses 350, another trust gives an ACR equivalent of 250); CKD persistence over 3 months. "Two out of three samples" was a US rule and was replaced by the UK repeat rule. "Formerly microalbuminuria" was removed (not retrieved). The ACE inhibitor/SGLT2 inhibitor wording was generalised (the ACR cut-off for those medicines was not confirmed).

**hormone-tests.** Records: hyperuricaemia 360 micromol/L or more, NICE general target below 360, NICE lower target below 300 for tophi, chronic gouty arthritis or ongoing frequent flares, BSR initial target below 300 for everyone starting treatment (NICE NG219; BSR via a comparison article, the BSR guideline itself was not retrieved). "300-360" was indeed a blend of two targets and is now stated per body. Retest timing: at least two weeks after the attack (NICE). Left in prose without records, as procedure descriptors, not cut-offs: "9 am" cortisol, "24-hour" urine collections. Reviewer flag: "highest at 9 am" was not checked (outside the assignment).

**pregnancy-test.** Records: test at least 21 days after unprotected sex if the period date is unknown (NHS); early pregnancy scan usually about 6 to 7 weeks (University Hospitals Birmingham; RCOG says 6-8 weeks). Rewritten qualitatively: "20-25 IU/L" (only an unnamed source gave about 20 mIU/mL), "double every two days" (sources give 24-53 hours), "about a week after implantation" (the `what` sentence now says hCG begins to be made in the days after fertilisation as the embryo implants, consistent with the later "within days of implanting"). Not used: NICE NG126 63% rise over 48 hours (not on the page).

**crp.** Records: NICE NG237 point-of-care CRP in adults with suspected lower respiratory tract infection when unsure about antibiotics: below 20, 20 to 100, above 100 mg/L. "Levels in the hundreds" and "many hundred-fold" were rewritten ("very high", "steeply"); "roughly 5-20 mg/L" became "a small rise above the laboratory's reference limit" (no UK source gives a mild band; one international review gives about 10-40). Time course "6 hours / 48 hours" became "within hours / within a day or two". Reviewer flag: the causes "obesity, smoking or recent exertion" in the mildly raised row are older text I could not support from retrieved pages.

## Repeated figures on other pages (not edited)
* `content/comparisons.json` (HbA1c vs blood glucose): "Fasting 7.0 mmol/L or above, or 11.1 mmol/L two hours after a 75 g glucose load". Consistent with Diabetes UK and WHO.
* `conditions/myocardial-infarction` and `physiology/heart-rate` repeat ECG figures, not figures from these six tests; nothing to align. No other content file repeats the old 5.6-6.9, 360 micromol/L, 300 mg/mmol or 20-25 IU/L figures.

## Things for a human reviewer
* G1/G3a records are labelled US (National Kidney Foundation page); a NICE or KDIGO source could replace them.
* Several UK sources are NHS trust documents, not national guidance; labelled as such in context.
* The UHB early-pregnancy URL has no `.htm`; one checker reported a `.htm` form.
* Unknown hosts were given jurisdiction and type on their reference objects.
