# Editorial QA: sixteen no-web reviewers read every content section

On 1 November 2026 sixteen reviewers (language-model agents with **no web access**, working from the page text and from what
they know) each read one slice of the site's content in full and reported only what they would bet on: statements they were
confident were wrong or misleading, contradictions between fields or pages, wording that could harm, numbers that look wrong or
unsupported, citations that could not support the claim. 15 files here hold their findings (a `status` field was added afterwards:
`fixed` = the wording was changed, `mitigated` = a site-wide change covers it, `open` = not changed).

**This is not a clinical review.** Reviewers worked from memory, so every finding marked `needsSource` was either fixed by
softening or removal (never by adding a number nobody had checked) or left open. A clinician and a source check are still needed
before the pages can claim clinical review (CLINICAL.md section 5).

| Slice | Entities read | Findings | High (fixed / open) | Medium (fixed / open) | Low (fixed / open) |
| --- | ---: | ---: | --- | --- | --- |
| anatomy-a | 15 | 20 | 0 / 0 | 6 / 0 | 2 / 12 |
| anatomy-b | 15 | 20 | 0 / 0 | 7 / 0 | 3 / 10 |
| biomarkers | 37 | 20 | 0 / 0 | 4 / 0 | 2 / 14 |
| conditions-a | 25 | 20 | 0 / 0 | 11 / 0 | 0 / 9 |
| conditions-b | 25 | 20 | 0 / 0 | 6 / 0 | 1 / 13 |
| drug-classes | 29 | 20 | 0 / 0 | 8 / 0 | 2 / 10 |
| imaging-health-targets | 41 | 20 | 0 / 0 | 3 / 0 | 2 / 15 |
| interactions-comparisons | 79 | 13 | 0 / 0 | 2 / 1 | 1 / 9 |
| medications-a | 14 | 20 | 0 / 0 | 8 / 0 | 1 / 11 |
| medications-b | 14 | 20 | 0 / 0 | 7 / 0 | 1 / 12 |
| medications-c | 13 | 16 | 0 / 0 | 5 / 0 | 0 / 11 |
| physiology | 35 | 20 | 0 / 0 | 5 / 0 | 3 / 12 |
| procedures | 19 | 20 | 0 / 0 | 8 / 0 | 1 / 11 |
| symptoms-firstaid | 38 | 18 | 1 / 0 | 7 / 0 | 1 / 9 |
| tests-a | 20 | 20 | 1 / 0 | 10 / 0 | 1 / 8 |
| tests-b | 19 | 18 | 0 / 0 | 6 / 0 | 0 / 12 |
| **Total** | 438 | 305 | 2 / 0 | 103 / 1 | 21 / 178 |

Slices: anatomy (30 articles, two reviewers), biomarkers (37), conditions (50, two), drug classes (29), imaging + health + targets
(41), interactions + comparisons (79), medications (41, three), physiology (35), procedures (19), symptoms + first aid (38), tests
(39, two). Each reviewer was capped at 20 findings, so the files list the 20 that mattered most per slice, and their `notes` hold
more candidates that were not counted.

## What changed because of the findings
Red-flag signposting (every symptom page now routes to 999, NHS 111 or the GP; burns, seizures, heart attack, poisoning and
wound care name who to call; the self-harm red flag names Samaritans), instructions rewritten as descriptions (stopping steroids
before a hormone test, pausing apixaban, treating subclinical hypothyroidism), overstatements softened (cirrhosis, CT screening,
a normal echo, amoxicillin and cetirizine summaries, smoking in Parkinson's), facts corrected (see the commit messages for the
full list), the US 10-year tetanus rule replaced by UK wording, the medicine sidebar no longer labels a risk or monitoring link
"Used for".

## Still open at medium or high severity
* **interactions-comparisons** · interactions/azithromycin-citalopram · severitySource (medium, safety): The MONITOR_OR_ADJUST tier is taken from a generic US MedlinePlus sentence about azithromycin, not from UK wording for this pair. UK citalopram labelling and MHRA advice (2011 Drug Safety Update) say citalopram/escitalop Suggested: Re-derive the tier from the BNF interaction text and the citalopram SmPC (likely AVOID_COMBINATION, at minimum SPECIALIST_OR_CLOSE_MONITORING); add the BNF citalopram interactions page or the MHRA cit

The many open low-severity findings are mostly numbers that sit in prose without a threshold record, tags that link a page to a
neighbouring organ, and wording nuances. None is known to be unsafe; they are queued in the JSON files for the clinical review.
