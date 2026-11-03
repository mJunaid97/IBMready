# Batch report: guides-lifestyle

## Finished (11 guides, `kind: guide`, dated 2026-11-03)
sleep-problems-what-helps, alcohol-units-and-low-risk-drinking, physical-activity-guidelines-adults, stop-smoking-nhs-support, eatwell-guide-healthy-eating, healthy-weight-bmi-explained, stress-symptoms-and-getting-help, vitamin-d-and-supplements-who-needs-them, cholesterol-and-diet-what-the-nhs-says, bone-health-keeping-bones-strong, blood-pressure-at-home-how-it-works.

`check_batch.py` ends with `ok`. Each guide has a first-pass ledger and a second-pass report (separate subagents, re-retrieved with different wording). The published text is the second-pass text: sentences marked edited use the checker's wording, removed ones are gone. Ledgers list the final sentences.

## Length: below the 700-word target
Guides run from about 290 to 615 words of prose (bone health and home blood pressure are the shortest, alcohol the longest). The second pass removed or narrowed many sentences (about one in three in several guides), and I kept only what retrieved text supports instead of padding. A reviewer may want to extend bone health, home blood pressure and cholesterol with a further sourced search round.

## Topics dropped
- Sun safety and skin checks: the NHS sunscreen page was not returned; the melanoma material is covered by no existing site page to link to.
- Hydration (stand-alone): the retrieved NHS text was too thin for a guide (about 350 words), and no budget was left to enrich and re-check it.

## For the human reviewer
- Several sentences rest on local trust or ICB pages because nhs.uk pages did not return: home blood pressure (Oxford, Sussex, Essex leaflets), the sleep/CBT-I guidance (BOB and South Yorkshire pathways), the tier 3 weight management team description. Wording is attributed to "local NHS guides".
- healthy-weight-bmi-explained: the tirzepatide wording is deliberately general. The checker found local ICB pages saying GP practices have prescribed tirzepatide in phases since June 2025; the england.nhs.uk page did not return, so please check it against the current NHS England page.
- physical-activity-guidelines-adults: one search result suggested the UK CMOs reissued the guidelines in 2026 with the levels unchanged. The text still says "2019 revision"; check against the current gov.uk page. The "no minimum amount" line was seen on NHS England Digital, not the NHS adult page.
- stop-smoking-nhs-support: the 12 sentences that failed the check were edited or removed (including cytisine/varenicline rollout, nicotine replacement forms, quit timeline wording). The NHS Quit Smoking app and quit-plan lines were removed unverified.
- alcohol-units: the low-risk guidance facts come from Drinkaware's reproduction of the CMO guidance and the GOV.UK summary; the withdrawal sentence now names 999 for severe symptoms.
- stress-symptoms-and-getting-help: the crisis route (999, NHS 111 mental health option, Samaritans 116 123) is sourced to https://www.nhs.uk/every-mind-matters/urgent-support/. The "mental health option" is England wording; Scotland and Wales may need a note. A sentence about stress and chest pain was removed because no sourced care route was available.
- vitamin-d: numeric doses were removed from prose per the site rule; ages for seasonal advice differ between nations and are not stated.
- Links use existing ids only. No content/*.json, data/ or other files were touched. No medicine in `interactions.json` is affected.

## Searches
First pass about 29; second pass 100 (sleep 8, alcohol 10, activity 8, smoking 10, eatwell and weight 20, stress 9, supplements 8, cholesterol/bone/blood pressure 27). Total about 129 of 200; the remaining budget was not spent because the further guides would have needed a full new two-pass cycle.
