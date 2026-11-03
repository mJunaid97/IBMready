# News briefs, second wave: one batch per publisher group

Read `docs/authoring/README.md` and `docs/authoring/blog.md` first. Your batch id is one of `news-nice`, `news-mhra`, `news-ukhsa-nhs`,
`news-who`, `news-us`; use your section below. Branch to push to: `content/<batch id>`. Batch directory: `content/drafts/batches/<batch id>/`.

What the first news batch (`news-uk`) taught us, so you do not repeat it:

* It stopped after 51 of its 200 searches with 7 briefs because "discovery returned few clearly dated October items". Use the whole budget: widen the
  window, vary the query wording (topic words such as "approves", "recommends", "warns", "recall", "guidance", "vaccine", "screening", "trial results"),
  search month by month, and search by topic area of the site (heart, cancer, diabetes, infections, mental health, medicines safety, women's and men's
  health, children, older people) as well as by publisher. Stop only when about 190 searches are spent or discovery stops returning new items.
* Window for this wave: **1 July to 3 November 2026**, newest first. An older item is fine if it is a clear, dated announcement the site can connect to.
* Verification: a second search for the exact title, restricted to the publisher's domain, must confirm the date and each fact. Drop what it does not
  confirm. Do not rely on a single summary.
* Do not write briefs the first batch already covers: NICE Enhertu (HER2-low breast cancer), MHRA lurbinectedin, MHRA antidepressant safeguards, MHRA
  clopidogrel liquid recall, UKHSA flu levels (8 October), UKHSA Diwali vaccination message, DHSC under-18 vape sales ban. The maintainer de-duplicates by
  `source.url` when merging.
* Every brief links to at least one existing page (a condition, medicine, class, test, symptom, physiology or health topic id) so that it is published; choose
  announcements the site can connect to. When the existing pages are few, prefer announcements about the common conditions and medicines the site covers.
* Aim for 150 to 300 words, 2 to 3 sections, 3 to 5 key points, a `summary` that is a self-contained opening statement of 70 to 160 characters, a `name` of 15 to 49
  characters. Include `metaDescription` only if the summary is long.
* Wording: "NICE says", "the MHRA says"; never "you should", never "safe"; no numbers the retrieved text does not state; give the date a figure refers to.

## `news-nice`: NICE (nice.org.uk)

NICE news, final and draft guidance, technology appraisals (TA), quality standards, NICE guidelines (NG) and clinical guidelines published or updated in the window;
newest first. Topics: cancer drugs, diabetes and obesity medicines, heart and stroke, mental health, antimicrobial prescribing, medical devices, screening, children.
Aim for as many verified briefs as the budget allows (up to 40). Link to the condition or medicine the guidance is about. Say plainly whether NICE has "recommended"
(final) or "does not yet recommend / is consulting" (draft); never present draft guidance as final.

## `news-mhra`: MHRA and medicines safety (gov.uk/government/news, gov.uk/drug-safety-update)

Marketing authorisations ("MHRA approves"), Drug Safety Updates, safety warnings, recalls and alerts, new safeguards, Yellow Card items, medicines-shortage notices that affect
a named medicine, and regulatory decisions, in the window; newest first. Up to 40. Link to the medicine, its class or the condition. Safety items: report what the MHRA says and
name the route ("speak to the prescriber or pharmacist", "report side effects on a Yellow Card"), without telling any individual to stop a medicine unless the MHRA says exactly that.

## `news-ukhsa-nhs`: UKHSA, DHSC, NHS England, NHS Scotland / Wales / Northern Ireland (gov.uk, england.nhs.uk, nhs.uk, publichealthscotland.scot, phw.nhs.wales)

Vaccination programmes and campaigns, outbreaks and surveillance reports (give the date the figures refer to), screening programmes, NHS England service announcements (new tests, treatments, pharmacy services,
NHS App features that affect patients), public-health campaigns, health guidance for the winter. Up to 40. Link to the vaccine, infection, test or condition page.

## `news-who`: World Health Organization and global public health (who.int, afro.who.int, paho.org, searo.who.int, emro.who.int)

WHO news releases, new guidelines and recommendations, Disease Outbreak News, fact-sheet updates the WHO marks as new, World Health Day-type campaigns, prequalification of vaccines and medicines.
Up to 40. Outbreak counts change: give the date they refer to or leave them out. Mark it clearly when an item concerns another country ("in the Democratic Republic of the Congo") and link the site page
that explains the disease.

## `news-us`: US agencies (cdc.gov, fda.gov, nih.gov, nhlbi.nih.gov, cancer.gov, niddk.nih.gov, ninds.nih.gov)

FDA approvals and safety communications, CDC reports and recommendations (MMWR items that concern the public), NIH and NCI research news releases about the conditions and medicines the site covers. Up to 40.
These are **US** decisions: say "the US FDA" or "the CDC", never imply UK availability or UK policy, and add one sentence to the "What it means" section: "This is a US decision; availability in the UK is
decided separately by the MHRA and NICE." Research news: only releases that state the study design and finding in plain terms; do not summarise press-release hype as established.
