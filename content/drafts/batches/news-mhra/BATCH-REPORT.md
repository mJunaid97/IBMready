# BATCH-REPORT: news-mhra

Window 1 July to 3 November 2026. 20 briefs, all `kind: news`, source = MHRA / gov.uk. `check_batch.py` ends with `ok`.

## Finished briefs (20)

| Slug | Date | Note |
| --- | --- | --- |
| mhra-approves-zynyz-merkel-cell-cancer | 2026-07-06 | date read in retrieved text |
| mhra-approves-semaglutide-wegovy-mash | 2026-07-03 | grant date from release text |
| mhra-approves-lower-carbon-clenil-inhalers | 2026-07-21 | thin after pass 2 |
| mhra-bladder-anticholinergics-dementia-review | 2026-07-27 | publication page, not a news page; date second-hand |
| mhra-domperidone-phaeochromocytoma-contraindication | 2026-07-21 | Drug Safety Update |
| mhra-authorises-orforglipron-foundayo | 2026-08-10 | |
| mhra-approves-remibrutinib-chronic-urticaria | 2026-08-06 | very thin after pass 2 |
| mhra-recall-zentiva-fingolimod-capsules | 2026-08-20 | patient-advice sentences removed (conflicting retrievals) |
| mhra-reaffirms-safety-of-childhood-vaccination | 2026-08-12 | date NOT confirmed in pass 2 (see below) |
| mhra-sotorasib-liver-tests-after-immunotherapy | 2026-08-25 | source = August Safety Roundup |
| mhra-fluenz-nasal-flu-vaccine-fainting | 2026-09-29 | source = September Safety Roundup |
| mhra-authorises-onswik-weekly-insulin | 2026-10-13 | thin after pass 2 |
| mhra-ketone-test-strips-supply-disruption | 2026-10-09 | Device Safety Information notice |
| mhra-seizes-counterfeit-weight-loss-pens | 2026-10-15 | date NOT confirmed (raid 14 Oct; release date unread) |
| mhra-consults-schools-spare-adrenaline-nasal-sprays | 2026-10-19 | closing date 14 Dec not stated in the brief |
| mhra-approves-icotrokinra-plaque-psoriasis | 2026-10-23 | date not printed in retrieved text; 23 Oct is the authorisation date |
| mhra-osimertinib-muscle-toxicity-reminder | 2026-10-27 | source = October Safety Roundup (page says 27 Oct; organisation page lists 30 Oct) |
| mhra-venlafaxine-dat-scan-interaction | 2026-10-27 | same roundup |
| mhra-pneumococcal-vaccine-factsheet | 2026-10-27 | same roundup |
| mhra-casgevy-children-aged-five-and-over | 2026-10-30 | 27 vs 30 Oct in two listings; 30 Oct used |

## Dropped, and why

* Inqlexzo (gemcitabine bladder system): publication date could not be confirmed (grant date 24 June; page described only as "about 124 days old"). Report kept in `reports/`.
* Aficamten (MHRA/NICE co-ordinated decision): date unreadable ("about 96 days old"). Report kept in `reports/`.
* Intra-articular steroid anaphylaxis reminder (September roundup): not retrievable in a direct search.
* No site page to link, so not publishable: IXCHIQ withdrawal, #MedSafetyWeek, catumaxomab, vimseltinib, plozasiran, triheptanoin, avacopan suspension, elranatamab, tecovirimat, parenteral nutrition filters, mirdametinib, nipocalimab.
* Overlapping or out of window: "No summer shortcut" (overlaps the pens brief), finasteride/dutasteride (May), EURneffy younger children (12 June).

## For the human reviewer

1. **Search tool returns summaries, not page text.** Every date and sentence was checked against summaries only. Dates settled only second-hand or by relative age: childhood vaccination (12 Aug), counterfeit pens (15 Oct), icotrokinra (23 Oct), Casgevy (30 Oct), bladder anticholinergics (27 Jul), Wegovy (3 Jul) and Clenil (21 Jul) (both the grant dates quoted in the release). Please open the pages and correct `published` where needed.
2. **Thin briefs.** Pass 2 cut unconfirmed sentences, so several briefs are well under the 150-word target (remibrutinib, Onswik, Clenil, Wegovy, Casgevy, childhood vaccination, pneumococcal factsheet). They are accurate but short; the maintainer may prefer to hold them.
3. **Links that rest on general knowledge, not on retrieved text:** osimertinib and sotorasib to `lung-cancer` (sotorasib confirmed in the roundup PDF; osimertinib not), fingolimod to `multiple-sclerosis`, Casgevy to `anaemia` (loose), domperidone to the antiemetic class, pneumococcal to pneumonia/meningitis, childhood vaccination to `autism`. No brief states these uses as fact except where noted in its ledger.
4. **Textbook sentences** (each marked `textbook` in its ledger): MASH definition, beclometasone is a corticosteroid, rhabdomyolysis/DKA/phaeochromocytoma/DAT scan glosses, prescriber/pharmacist signposting (domperidone, bladder anticholinergics), NICE decides NHS access in England (Casgevy), pneumonia/meningitis cause statement, site-page pointers. This is above one in 20 in a few short briefs.
5. Two briefs (domperidone, bladder anticholinergics) report MHRA advice addressed to clinicians (stopping or limiting a medicine). They describe it and name the prescriber/pharmacist as the route for individuals.
6. No new medicine or class pages; none of the medicine names needs an `interactions.json` re-point.
7. The two similarly titled childhood-vaccination pages: the brief uses `.../mhra-reaffirms-the-safety-of-childhood-vaccination` (the 2026 one); `.../mhra-reaffirms-safety-of-childhood-vaccination` is older.

## Searches

About 115 of 200: 65 by the author (discovery and first pass), 50 by six separate verification subagents (A to F, 2 to 3 searches per brief, gov.uk only, differently worded). The remaining budget was not spent because discovery had stopped returning new items the site can link to: the last eight discovery queries (by month and by topic) returned only items already listed or without a linkable page.

Pass-2 totals are in `reports/*.report.json`; wrong or unsafe sentences found: none. Unsupported sentences found and cut or reworded: roughly one in three across the first batch of briefs.

## Addendum (follow-up session, 3 November 2026)

A second author session restarted on this batch, found this branch already complete and did not overwrite it. It spent 44 further searches (about 159 in total across both sessions) and made no change to `fragment.json`.

* **Aficamten** (still dropped): NICE's own page says final guidance TA1181 was published on **30 July 2026** (https://www.nice.org.uk/guidance/TA1181), and the GOV.UK release describes the MHRA authorisation as co-ordinated with it. The release's own date is still not printed in any retrieved text. If a reviewer confirms the GOV.UK page date, the brief can be restored from `reports/mhra-nice-aficamten-hypertrophic-cardiomyopathy.report.json` with `published: 2026-07-30`.
* **Inqlexzo** (still dropped): the release is only dated by relative age ("about 125 days"), roughly late June to early July. Open https://www.gov.uk/government/news/mhra-authorises-gemcitabine-delivery-system-for-adults-with-bcg-unresponsive-high-risk-non-muscle-invasive-bladder-cancer to read the date. No site page for bladder cancer exists, so it also has no link target.
* **Casgevy date** re-checked: one search says the extension was granted 29 October and announced 30 October, matching the 30 October used here (another MHRA listing shows 27 October).
* Further discovery by month and topic returned only items already covered or without a linkable page.
