# Batch guides-urgent-care-travel: report (session of 2026-11-03)

## Guides finished (15), each through the two-pass protocol
Each was written by a first-pass author from retrieved text, then re-checked sentence by sentence by a separate verifier using differently worded searches. Only supported or textbook sentences remain. `check_batch.py` on `fragment.json` ends `ok`.

| Slug | Words (checker) | Sentences removed by pass 2 |
| --- | --- | --- |
| choose-the-right-nhs-service-999-111-gp-pharmacy | ~758 | 7 |
| choking-what-the-nhs-and-resus-council-describe | ~840 | 9 passages |
| burns-and-scalds-first-aid-and-when-to-get-help | ~814 | 9 |
| nosebleeds-what-helps-and-when-to-get-help | ~520 | 12 |
| sprains-and-strains-treatment-and-recovery | ~715 | 8 |
| head-injury-and-concussion-when-to-get-help | ~863 | many (see report) |
| anaphylaxis-and-adrenaline-auto-injectors | ~698 | several |
| travel-vaccinations-what-the-nhs-says | ~558 | 14 |
| malaria-prevention-for-travellers | ~516 | 16 |
| travellers-diarrhoea-avoiding-and-managing | ~617 | 5 |
| blood-clots-on-long-flights-dvt-risk | ~625 | 8 |
| heat-exhaustion-and-heatstroke-what-to-know | ~667 | 7 |
| altitude-sickness-symptoms-and-prevention | ~657 | several |
| jet-lag-what-it-is-and-what-helps | ~629 | 8 |
| travelling-with-medicines-what-the-nhs-says | ~470 | 7 |

Second-pass cuts were large (up to one third of first-pass sentences for malaria and travel vaccinations). Several guides ended under the 700-word guideline (nosebleeds, malaria, travelling with medicines, travel vaccinations are the shortest). They were not padded; the compiler accepts them. A maintainer may prefer to hold the four shortest back or expand them from sources that carry more.

## Dropped
- **Poisoning: where to get advice** (drafted and verified, not pushed). The crisis route (999, NHS 111 mental health option, Samaritans 116 123) could not be confirmed word for word on nhs.uk, the deliberate-overdose routing rested on local trust pages, the verifier's report was only loosely reconciled, and it had seven references. About 15 sentences were already cut. Not enough budget remained to redo it properly. Drafts are not in the repository.
- Not attempted for budget or overlap: heart attack in women (the site already has "heart-attack-cardiac-arrest-and-angina"), CPR on adults (the site's `cpr` first-aid page covers it and the guide would restate it).

## Searches
About 180 of 200: first pass about 70 (12 guides plus 4 extras), second pass about 100, plus 1 of mine.

## For the human reviewer
1. All evidence came from search-tool summaries, not page text (WebFetch is blocked). Verified sentences were matched to returned excerpts, but several nhs.uk pages were never returned verbatim (travellers' diarrhoea, DVT, burns, altitude sickness). Spot-check the live pages for: DVT routes ("urgent GP appointment or NHS 111" for suspected DVT; 999/A&E for suspected pulmonary embolism); malaria urgent route; nosebleed A&E thresholds; anaphylaxis second-injection timing.
2. **Altitude sickness** has no named service for severe illness: the NHS page says only "get medical help immediately" and the guide mirrors that. The site rule asks for an exact route; add one if the maintainer is satisfied it matches the NHS.
3. **Differences from `content/first-aid.json`** (the guides follow the retrieved NHS / Resus Council text; none were edited):
   - burns: the site page says A&E for all chemical and electrical burns and a 3-hour cooling window; the NHS says 999 or A&E for chemical burns and does not give the 3-hour figure. Child cooling time differs (20 to 30 minutes in the NHS child page).
   - sprains: the site page uses older RICE wording (rest 24 to 72 h, ice 15 to 20 min, "four steps" fracture test); the NHS gives PRICE and different urgent signs. Recovery time on the site page (6 to 12 weeks) is not in the retrieved NHS text.
   - heatstroke: the site page gives temperature thresholds, "often dry, but may be sweaty" skin and cold packs at groin; the NHS says no sweating, armpits and neck, and 999 if no improvement after 30 minutes. Guide omits temperatures.
   - allergic reactions: the site page lists latex, a 6 to 12 hour observation period and a 3 to 10 second hold; the guide gives none (Resus Council UK says the best observation length is unknown).
   - choking: babies, NHS says thigh or forearm (site page: forearm only); chest-thrust position wording differs.
   The site's first-aid page `sprains`, `heatstroke`, `burns`, `allergic-reactions` may deserve a review.
4. Sources disagree and the guides say so (compression stockings on flights; ice and "HARM" timings for sprains; adult-nearby period after head injury; melatonin for jet lag; ibuprofen after a sprain; 999-timing wording for choking).
5. Links are sometimes a judgement call: `meningitis` on travel vaccinations; `type-1-diabetes` on travelling with medicines (the insulin section).
6. The ledgers are first-pass ledgers; the reports hold the second-pass classifications and the removed passages. Some reports log removed passages as "unsupported", so their counts include removed items, and a few attribute kept sentences to the main NHS page when the support came from a trust or NHS 111 Wales page (noted in each report's evidence field).
