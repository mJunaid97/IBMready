# Batch report: guides-family-health

Branch: `content/guides-family-health`. `python3 tools/verification/check_batch.py content/drafts/batches/guides-family-health/fragment.json` ends with `ok` (15 posts, all indexable).

## Finished (15 guides, each checked by an independent second-pass subagent)

| Slug | Body words | First-pass sentences | Cut or reworded by second pass |
| --- | --- | --- | --- |
| periods-whats-normal-and-when-to-see-a-gp | 804 | 45 | 26 |
| contraception-methods-the-nhs-lists-compared | 824 | 55 | 10 |
| early-pregnancy-symptoms-and-contacting-a-midwife | 833 | 52 | 25 |
| uk-childhood-vaccinations-nhs-schedule | 828 | 42 | 18 |
| colic-in-babies-what-it-is-and-what-helps | 810 | 47 | 21 |
| teething-in-babies-signs-and-what-helps | 835 | 50 | 15 |
| asthma-in-children-signs-and-nhs-advice | 965 | 54 | 30 |
| childhood-rashes-chickenpox-measles-hand-foot-and-mouth | 970 | 50 | 31 |
| head-lice-and-nits-what-the-nhs-says | 789 | 46 | 11 |
| puberty-what-happens-and-when-to-get-advice | 904 | 50 | 25 |
| erectile-dysfunction-causes-and-when-to-see-a-gp | 894 | 47 | 23 |
| prostate-problems-symptoms-and-when-to-see-a-gp | 876 | 53 | 24 |
| testicle-lumps-and-swelling-what-to-check | 757 | 52 | 15 |
| bladder-control-problems-types-and-help | 802 | 47 | 23 |
| caring-for-someone-with-dementia-nhs-advice | 966 | 56 | 36 |

"Cut or reworded" counts first-pass sentences the second pass classed unsupported, wrong or unsafe (roughly one in two on average, higher than the one-in-six seen in the first anatomy batch, because the search tool returned blended summaries and many first-pass sentences came from local NHS trust pages). The published text contains only supported or textbook sentences. Per-sentence ledgers are in `ledgers/`, second-pass reports in `reports/`, the final texts in `final/` (the first-pass drafts are in `work/`, kept for audit; they are not published).

## Topics from the seed list not written
Menopause and HRT (already a guide), a baby with a high temperature (already `fever-in-children-when-to-get-help`), falls prevention (already published), heavy periods (already published). Not reached, no evidence problem: none dropped for lack of sources.

## Searches
About 160 of 200 (69 first pass, 91 second pass; figures are the subagents' own counts). Stopped before 190 because 15 guides exceeded the 10 to 12 target.

## For a human reviewer
* The search tool returned summaries that blend pages, so per-claim URLs in the ledgers and reports are best-fit, and many second-pass claim URLs are generic. The sentence classifications and the cuts are specific; the URL attribution is not.
* Many kept sentences rest on NHS England trust pages, NHS 111 Wales or NHS inform rather than nhs.uk itself. Worth a spot check of nhs.uk for: the urgent-help routes in the testicle, prostate (unable to pass urine), childhood rash, bladder (cauda equina, wording is "NHS Scotland leaflet says go to A&E immediately", 999 was not confirmed), teething and dementia (sudden confusion: 999 or A&E) guides.
* Vaccination guide: schedule timings (MMRV from January 2026, chickenpox catch-up dates) were reconciled from GOV.UK/UKHSA; the second pass dropped dates the sources disagreed on. Re-check against the current NHS schedule before relying on it.
* Contraception: it gives typical-use percentages and weeks/years as the retrieved NHS text states them, plus NICE's older figure beside the NHS figure for the implant; check the wording against the live NHS pages.
* Periods and puberty: the NHS and NHS inform give different ages for a delayed first period; the posts state each, attributed.
* Childline (puberty guide) is given as 0800 1111 from an NHS trust page; Samaritans 116 123 appears in the dementia and puberty guides; no other helpline numbers are published (two numbers taken from local pages were removed from the dementia guide).
* Head lice has no matching site page; the link is `symptoms: rash` only because the post says NHS inform lists a rash on the back of the neck as a sign. A better link could be added later.
* The erectile dysfunction guide contains no urgency statements (priapism and chest-pain routes could not be retrieved and were left out).
* Lead-author edits after the second pass: removed from bladder control the "at least three months" pelvic-floor duration and the bladder-training "stretch" sentence; from childhood rashes the "new spots after seven days" item; from dementia two helpline numbers; from head lice the plant-oil list and a doubtful permethrin sentence. These cuts only remove sentences.
* No medicine in `content/interactions.json` was newly named as a page id, and no aliases were added. No patches were made to existing pages.
