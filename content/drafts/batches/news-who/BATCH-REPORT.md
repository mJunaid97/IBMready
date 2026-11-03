# news-who batch report

Batch id `news-who`; 19 verified WHO news briefs in `fragment.json` (check_batch.py ends with `ok`). Window searched: 1 July to 3 November 2026, plus a few clearly dated earlier items (Feb, May, June) where the site has a matching page.

## Finished briefs (19)
Child obesity guidelines (7 Oct); contraception options (23 Sep); dementia risk guidelines (15 Jul); Global status report on cancer (8 Jul); 2027 southern-hemisphere flu vaccine strains (25 Sep); hypertension-in-pregnancy roadmap (8 Oct); Global Health Estimates to 2023 (2 Oct); heat illness at mass gatherings (30 Sep); heat indicators for pregnancy and children (21 Oct); youth nicotine statement (29 May); forthcoming asthma guidelines article (17 Sep); HIV, hepatitis and STI strategy progress (27 Jul); SAGE single-dose HPV advice (29 Oct); Barbados eliminates mother-to-child HIV transmission (30 Oct, Barbados); WHO/Europe World Hepatitis Day (28 Jul, European Region); World Health Assembly stroke resolution (22 May); WHO/Europe extreme-heat statement (7 Jul, European Region); postpartum haemorrhage Lancet Series (12 Jun); cataract surgery access (11 Feb).
(Count in fragment.json is authoritative.)

## Process
First pass from retrieved search text only (ledgers/). Second pass by separate subagents with differently worded, who.int-restricted searches (reports/). Across all briefs the second pass classed roughly 31 of about 195 sentences unsupported and 1 wrong; those were reworded to what the source says or removed. Sentences marked `textbook` (2): organisation/definition glosses.

## Dropped or not written, and why
- Ebola (Bundibugyo), hantavirus, Nipah, Marburg, yellow fever DONs; TB diagnostics guidance; malaria guidelines; polio/measles prequalification; road deaths; drowning; mental-health community-care shift; doxycycline PEP; gonorrhoea antibiotics: the site has no matching page (a brief needs at least one link) or the dates in results conflicted.
- WHO/Europe cancer screening fact sheet: a standing fact sheet, not a dated announcement, and it contains a mammography age statement that could differ from UK policy.
- Sepsis guideline: planned for late 2026, not published.
- WHO GLP-1 obesity guideline (1 Dec 2025), alcohol taxes report (Jan 2026), nicotine-pouch report (15 May 2026), SHAKE salt package (12 May 2026), World Cervical Cancer Elimination (12 Jun): outside the window or overlapping a brief already written; not verified.
- Early menopause interview (16 Oct): a feature interview, not an announcement.

## For the human reviewer
- Verification used search summaries, not full pages (WebFetch is blocked). Items worth a glance at the live page: hepatitis "off track" wording; "26 countries" on the Barbados WHO page; HPV "up to age 30" (director's message only); asthma article (forthcoming guidelines, not yet published).
- Dates: the pregnancy roadmap news item is dated 8 Oct (the DG remarks and the publication page say 7 Oct). The stroke brief keeps only claims found in the 22 May daily update, not the draft Executive Board text.
- Stroke, nicotine, cataract, postpartum and Feb to June items are older than the preferred eight weeks.
- No interactions.json plain-substance conflicts: no new medicine ids were created.

## Searches used
About 130 of 200: roughly 73 by the author (discovery, retrieval) and about 57 by verification subagents. Discovery stopped returning new site-linkable dated items, so the rest of the budget was not spent.
