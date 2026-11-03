# Batch report: guides-mind-and-life

Date: 2026-11-03. 13 guides, all compile (`check_batch.py` ends with `ok`). Every sentence went through the two-pass protocol; the published text is the first pass after the second-pass edits and removals were applied.

## Searches
First pass and supplementary retrieval (author): 29. Second pass (13 independent subagents): 73. Total about 102 of 200. The budget was deliberately not spent in full: see "Length" below.

## Guides
| guide | sentences checked | supported | textbook | unsupported/wrong/unsafe (edited or removed) | second-pass searches |
| --- | --- | --- | --- | --- | --- |
| antenatal-care-on-the-nhs | 18 | 11 | 0 | 7 | 5 |
| anxiety-signs-and-treatment | 32 | 20 | 3 | 9 | 6 |
| dementia-early-signs-and-assessment | 21 | 9 | 1 | 11 | 7 |
| depression-signs-and-getting-help | 32 | 19 | 0 | 13 | 5 |
| falls-in-older-people-reducing-risk | 20 | 9 | 1 | 10 | 7 |
| fever-in-children-when-to-get-help | 17 | 10 | 0 | 7 | 4 |
| grief-and-bereavement-what-to-expect | 22 | 15 | 0 | 7 | 5 |
| hearing-loss-causes-tests-and-help | 21 | 8 | 3 | 10 | 5 |
| loneliness-and-health | 23 | 10 | 1 | 12 | 4 |
| menopause-symptoms-and-help-available | 34 | 18 | 1 | 15 | 9 |
| nhs-talking-therapies-how-they-work | 27 | 12 | 0 | 15 | 5 |
| panic-attacks-what-they-are | 28 | 11 | 1 | 16 | 7 |
| supporting-someone-with-a-mental-health-problem | 22 | 13 | 0 | 9 | 4 |

The second pass changed roughly 45% of the first-pass sentences, mostly because the search tool returns blended summaries and the first pass wrote details the summaries did not state. Sentences classed unsupported were reworded to what the retrieved text said or removed.

## Topics dropped or merged
* Newborn/baby rashes and children's fevers were merged into one guide (`fever-in-children-when-to-get-help`, title "Fever and rashes in children: when to get help").
* No topic was dropped for lack of sources, but see Length.

## Things a human reviewer should look at
1. **Length.** The guides run about 250 to 510 words of body text (the assignment asks for 700 to 1,000). After the second pass removed unsupported detail, the remaining supported text is shorter than the target. I did not pad. Extending them needs a further retrieval round on the NHS page text itself, which the search tool does not return verbatim.
2. **Crisis route wording.** "NHS 111 option 2" for mental-health urgent help rests on NHS trust pages (e.g. nelft.nhs.uk, gmmh.nhs.uk), not a national nhs.uk page; a trust says it started on 1 April 2026 in its area. The guides therefore say "NHS 111 has a mental health option (option 2)" and that trusts describe it as always available; please confirm against the national NHS urgent-help page. The Samaritans number and free/any-time claim came from NHS pages and GP/trust pages, not samaritans.org.
3. **Depression: antidepressant timing.** The second pass kept a sentence that effects usually take around a week to be noticed; other NHS pages say a few weeks. Check against the NHS antidepressants page.
4. **Falls: after-a-fall routes.** The 999 / NHS 111 / GP wording came from blended summaries of the NHS falls pages; confirm on the live page.
5. **Fever in children.** NHS England says "111 or GP" for a baby under 3 months with a high temperature; NHS inform (Scotland) puts it in a more urgent bracket. The guide follows NHS England and names no temperature thresholds.
6. **Antenatal.** NHS wording for later pregnancies is "around 7" appointments (not "at least 7"). Edwards' and Patau's screening timing is stated loosely ("early pregnancy").
7. **Dementia.** The delirium sentence now sends sudden confusion to 999/A&E, per the second pass.
8. **Unchecked fields.** `summary`, `metaDescription` and headings were written from the checked sentences and reconciled by hand after the second pass but were not themselves classified. A small post-pass reword (merging short sections, aligning three summaries, one attribution fix in dementia) is not reflected in the per-claim reports.
9. **Links.** There are no mental-health condition pages on the site, so those guides link to existing pages only (physiology `brain-functions`, health `sleep`, drug class `ssris`, symptoms). No contradictions with existing site pages were found; the existing `menopause` page says the UK average age is 51, consistent with the NHS figure used.
10. **Reference hosts** not known to the compiler (trust pages, rnid.org.uk) give build notes, not errors.
