# Batch meds-e: report

Seven medicines and their seven new drug classes, written in the order of the brief. None skipped.

| Medicine | Class page | Article words | Sentences checked (medicine + class) | Changed by second pass |
| --- | --- | --- | --- | --- |
| sumatriptan | triptans | 438 | 56 + 5 | 23 + 2 |
| ondansetron | 5-ht3-receptor-antagonists | 349 | 41 + 7 | 16 + 2 |
| metoclopramide | dopamine-antagonist-antiemetics | 347 | 39 + 7 | 6 + 0 |
| loperamide | antimotility-agents | 343 | 45 + 7 | 13 + 2 |
| lactulose | osmotic-laxatives | 319 | 42 + 7 | 14 + 4 |
| diazepam | benzodiazepines | 361 | 44 + 8 | 4 + 1 |
| zopiclone | z-drugs | 353 | 42 + 8 | 8 + 1 |

**Searches used: 117 of 200** (31 first pass and regulatory/brand lookups, 86 second pass across seven independent subagents). The rest was left unspent: the retrieval returned summaries rather than full pages, so more searches would not have added much detail.

Second-pass result over 358 sentences: 263 supported, 14 textbook (3.9%), 60 unsupported, 12 wrong, 9 unsafe, 0 unchecked. About one sentence in four was changed or cut. Loperamide, lactulose and sumatriptan needed the most work. Replacement sentences came from the second-pass retrieval and were not checked a third time. After the second pass I removed three duplicate sentences and softened one wording (a herbal-remedies sentence that used the word "safe"); these are marked in the reports.

## Things the maintainer must act on

1. **The batch does not compile with the repository tools as they stand, for two reasons that are not in the content.**
   * `tools/taxonomy.py` line 373 (`unmapped_classes = [c["id"] for c in classes ...]`) iterates class ids, so `c["id"]` raises `TypeError` for any drug-class page that `content/medication-taxonomy.json` does not link by `page`. Fix: `[c for c in classes ...]`, and add `"page": "<class id>"` to the taxonomy entries for `triptans`, `5-ht3-receptor-antagonists`, `dopamine-antagonist-antiemetics`, `antimotility-agents`, `osmotic-laxatives`, `benzodiazepines` and `z-drugs` (the taxonomy already lists these classes without a `page`).
   * `content/interactions.json`, record `azithromycin-qt-prolonging-drugs`, lists `"Ondansetron"` as a plain substance in `bAgents`. The new `ondansetron` page makes that a compiler error ("use 'b' instead of a named substance"). It needs re-pointing to the medication. No other batch medicine appears in that file.
   * With both fixed in a scratch copy only (nothing in the repository was edited), `check_batch.py` ends with `ok: the batch compiles and every page passes the publishing gate` for all 14 entities. Run against the real repository it stops at the two problems above.
2. **Articles are short** (319 to 438 words, under the 600 asked for) because the searches returned summaries, not full pages, and I left out what I could not source.
3. **Brands**: lactulose has only the placeholder `Lactulose oral solution` (no UK brand was retrieved). `Valium` and `Zimovane`, `Imodium`, `Imigran`, `Maxolon`, `Zofran` came from listing/title hits. No US brand names were added.
4. **Regulatory**: loperamide is recorded as `otc` plus `prescription` (NHS: buyable from pharmacies and shops for age 12 and over; prescription for younger children and long-lasting diarrhoea). Diazepam and zopiclone carry `prescription` and `controlled` (Class C, Schedule 4 Part 1 per ACMD, Home Office Circular 008/2014 and legislation.gov.uk; the Class C statement for zopiclone rests on 2014 sources). Ondansetron `prescription` rests on the emc oral solution entry.
5. Macrogol: the NHS Laxatives page describes lactulose and macrogol together, but no macrogol-specific page was retrieved, so the lactulose page does not cover macrogol and the class page lists only lactulose. Class `members` for z-drugs (zolpidem) and benzodiazepines (lorazepam, clonazepam) rest on an NHS zolpidem page title and the ACMD report wording.
6. Metoclopramide: duration limits are described as "short-term use only" with no day count, per the no-cut-offs rule.

## Source conflicts for a human reviewer

* Sumatriptan and children: NHS pages differ (specialist may prescribe from age 6 or over versus nasal spray sometimes from age 12); the page says so. Pregnancy and breastfeeding advice also differs between NHS pages; the page says so and does not pick one. NHS inform Scotland uses the word "safe", which was not copied.
* Ondansetron breastfeeding: NHS Specialist Pharmacy Service says it can be used with caution; UK manufacturer leaflets advise against it. Both are stated. The "age limits" wording for chemotherapy versus radiotherapy comes from the tablet leaflet and was flagged as inconsistent; check the leaflet.
* Loperamide breastfeeding: the NHS pregnancy page calls it acceptable; the NHS who-can page and some SmPCs say to check first or advise against. The page quotes only the pregnancy page.
* Lactulose: sources conflict on time to work ("at least 2 days" versus "2 to 3 days"); the page says at least 2 days and carries no day count for when to see a doctor. The hepatic encephalopathy symptom wording is from the leaflet, not the NHS, and was reworded.
* Zopiclone: the 12-hour driving wording appears on the NHS main and how-to-take pages, not on common questions; the NHS zolpidem page says 8 hours (zolpidem is not described in the zopiclone page). The reviewer used the 7.5 mg SmPC for the indication wording.
* Diazepam: "up to 4 weeks" is NHS wording and is carried as "short term" only. Withdrawal-in-baby wording is from the manufacturer's leaflet, not the NHS page. The route-to-care line in the dependence section follows the site signposting rule and is not NHS wording.
* All NHS pages were seen through search summaries only; wording of lists (serious side effects, who can and cannot take) should be checked against the live pages.

## Interactions file

`ondansetron` appears as a plain substance in `content/interactions.json` (see above). `sumatriptan`, `metoclopramide`, `loperamide`, `lactulose`, `diazepam`, `zopiclone` and `macrogol` do not appear.

## Files

`fragment.json` (7 medicines, 7 drug classes), `ledgers/<id>.ledger.json` (first-pass sentences, including class pages) and `reports/<id>.report.json` (second-pass classification and action per sentence) for every medicine and every class.
