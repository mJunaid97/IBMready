# What has been verified, how, and what has not

Pages carry the review status `source-verified`: the facts were checked against the sources the page cites. **No page has been
reviewed by a clinician.** This file records the evidence behind the label as of 1 November 2026 and what remains.

## Levels of checking

| Level | What it establishes | Covers |
| --- | --- | --- |
| **Second-pass source check** (CLINICAL.md 5.5) | Every sentence re-retrieved independently from the cited publisher and classified supported, textbook, unsupported, wrong or unsafe; the unsupported, wrong and unsafe ones removed or cut back to what was confirmed | 7 anatomy articles with a sentence-level audit trail in `docs/verification/anatomy/<organ>/`: skull, hand, adrenal glands, small intestine, bony pelvis, bladder and urethra, testicle. 351 sentences: 62 unsupported or wrong, none unsafe |
| **Editorial QA without web access** | An independent read of the text for errors, contradictions, risky wording, doubtful numbers and citations a page cannot support (a reviewer works from the text and general knowledge, so it finds what looks wrong, not what a source says) | All 438 entities: 30 anatomy articles, 37 biomarkers, 50 conditions, 29 drug classes, 8 imaging, 9 health topics, 72 interactions, 7 comparisons, 41 medicines, 35 physiology pages, 19 procedures, 22 symptoms, 16 first-aid topics, 39 tests, 24 targets. 305 findings, 126 fixed (all high, all but one medium); see `editorial-qa/README.md` |
| **Reference links** | Every cited address still resolves to a page with the title the page gives it | All 1,191 references, on every push to the content and weekly (workflow "Reference links") |
| **Automated site checks** | Metadata, schema, links, accessibility, layout, CSP and 301 rules of every page type | The QA workflow (smoke test, SEO audit) on every push |

The anatomy articles that existed before this round (30 of them) were enriched under the same protocol, but no sentence ledger
was kept for them, so only the seven above can show their checking sentence by sentence.

## New pages written by author sessions (3 November 2026)

37 batches wrote 406 items (conditions, medicines with their drug classes, guides and news briefs) under the protocol of CLINICAL.md 5.6 and the brief in
`docs/authoring/`. Their sentence ledgers and second-pass reports are in `content/drafts/batches/<batch>/` (not served). The second pass classified 19,255 first-pass
sentences and removed 6,097 (31 per cent) as unsupported, wrong or unsafe before anything was merged:

| Batch | Items | Supported | Textbook | Unsupported | Wrong | Unsafe |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `conditions-a` | 8 | 548 | 11 | 231 | 14 | 0 |
| `conditions-b` | 8 | 463 | 16 | 250 | 16 | 2 |
| `conditions-c` | 8 | 479 | 21 | 396 | 3 | 0 |
| `conditions-d` | 8 | 655 | 15 | 208 | 10 | 6 |
| `conditions-e` | 8 | 466 | 45 | 267 | 2 | 1 |
| `conditions-f` | 8 | 530 | 12 | 265 | 10 | 0 |
| `conditions-g` | 8 | 578 | 11 | 245 | 11 | 10 |
| `conditions-h` | 8 | 588 | 20 | 147 | 5 | 0 |
| `deepen-conditions-a` | 8 | 315 | 6 | 259 | 1 | 2 |
| `deepen-conditions-b` | 8 | 270 | 20 | 232 | 2 | 0 |
| `deepen-conditions-c` | 8 | 360 | 12 | 203 | 9 | 19 |
| `deepen-conditions-d` | 8 | 228 | 12 | 226 | 1 | 2 |
| `deepen-meds-a` | 10 | 385 | 9 | 199 | 12 | 15 |
| `deepen-meds-b` | 10 | 306 | 21 | 140 | 11 | 0 |
| `guides-blood-tests` | 12 | 268 | 8 | 147 | 2 | 6 |
| `guides-conditions` | 13 | 194 | 14 | 166 | 3 | 10 |
| `guides-everyday-2` | 10 | 186 | 2 | 78 | 1 | 0 |
| `guides-family-health` | 15 | 399 | 14 | 322 | 5 | 6 |
| `guides-lifestyle` | 11 | 183 | 1 | 93 | 5 | 2 |
| `guides-medicines` | 12 | 323 | 14 | 201 | 6 | 1 |
| `guides-mind-and-life` | 13 | 165 | 11 | 137 | 0 | 4 |
| `guides-scans` | 12 | 197 | 11 | 208 | 7 | 7 |
| `guides-symptoms-a` | 10 | 94 | 4 | 96 | 40 | 3 |
| `guides-symptoms-b` | 11 | 196 | 3 | 51 | 0 | 0 |
| `guides-tests-2` | 12 | 260 | 14 | 57 | 4 | 6 |
| `guides-urgent-care-travel` | 15 | 547 | 16 | 100 | 1 | 0 |
| `meds-a` | 9 | 638 | 21 | 96 | 7 | 0 |
| `meds-b` | 12 | 391 | 18 | 169 | 23 | 20 |
| `meds-c` | 11 | 560 | 29 | 103 | 11 | 2 |
| `meds-d` | 13 | 544 | 5 | 121 | 10 | 21 |
| `meds-e` | 14 | 263 | 14 | 60 | 12 | 9 |
| `meds-f` | 15 | 487 | 5 | 99 | 4 | 0 |
| `news-mhra` | 22 | 171 | 15 | 65 | 0 | 0 |
| `news-uk` | 7 | 68 | 13 | 9 | 0 | 0 |
| `news-ukhsa-nhs` | 4 | 32 | 0 | 2 | 0 | 0 |
| `news-us` | 18 | 156 | 39 | 14 | 1 | 0 |
| `news-who` | 19 | 161 | 2 | 31 | 1 | 0 |
| **Total** | 406 | 12654 | 504 | 5693 | 250 | 154 |

Counts are the sessions' own, per item report; a few reports are approximate (the batch reports say which). All of it is `source-verified`; none of it is clinically reviewed.

### What a clinician should confirm first

* **Routes to care that the sources split on or did not give.** Hernia (999 or NHS 111 for the red flags), enlarged prostate (A&E, NHS 111 or 999 for being unable to pass urine), pre-eclampsia (the 999 wording rests on one NHS
  pregnancy page), cellulitis (the eye wording), back pain with cauda equina signs (sources named A&E or NHS 111, none retrieved said 999), and the pages whose urgent route is marked
  `textbook` because no retrieved text gave one: high cholesterol, abdominal aortic aneurysm, peripheral arterial disease, sleep apnoea; coeliac disease and hepatitis C name a GP appointment only.
* **Sensitive wording.** Prostate screening (the UK National Screening Committee position on BRCA2 carriers is described as a 2026 recommendation without a start date), chlamydia and testicular cancer
  ("curable", attributed to WHO and MedlinePlus), HIV, depression and anxiety (the crisis route is on every mental-health page, but NHS pages disagree on whether the route for thoughts of self-harm is NHS 111 or 999: each page states
  both with their sources).
* **Regulatory status** is weakly sourced on several medicine pages: codeine (the Schedule 5 status was dropped and the page rests on the NHS co-codamol page), esomeprazole and lansoprazole (prescription, from an emc leaflet or the NHS
  About page), diclofenac gel (pharmacy). No BNF page was ever returned, so no new page cites the BNF; the older interaction records still do.
* **Attributions from summaries.** The search tool returned summaries that blend pages, rarely the nhs.uk page itself, so many NHS statements rest on NHS trust, NHS inform or NHS 111 Wales pages.
  NICE clinical knowledge summaries were almost never returned; where a NICE guideline number stands in for one, the page cites that guideline.
* **Dates.** Several news briefs are older than the eight-week window (stroke, nicotine, cataract and postpartum briefs from WHO; three FDA approvals dated from approval letters). The NICE Enhertu brief leaves its date out because NICE's
  news date (17 September) and the technology appraisal (7 October) differ.
* **Length.** The guides run from about 160 to 800 words of body text (median about 470), the news briefs from about 80 to 180, and the new medicine pages from about 700 to 2,000 words, because only retrieved and checked sentences were kept; nothing was padded. The briefs for the guides asked for 700 to 1,000 words.
* **Sources repaired after the Reference links check (3 November 2026).** The check found dead links twice and the sandbox cannot reach publisher hosts, so a replacement found by search could not be read, and two (a Met Office blog post, a WHO question-and-answer page) turned out to be dead as well. Where a page moved, the reference now points at the address the check confirmed (hydroxychloroquine and gout at Arthritis UK, the Liver UK blood tests page, the FDA loperamide notice, NHS pre-eclampsia). Where a page is gone the reference is dropped, and so are the sentences that named it: the Met Office hay fever season dates, the WHO nuance on finishing an antibiotic course (the guide now says only what the NHS page says), a South West London tirzepatide dehydration warning and an NHS 111 Wales contact warning for prednisolone (the NHS pages still say the same). Hospital leaflets from Chelsea and Westminster, a Food Standards Agency study and label page and a Right Decisions PDF are no longer cited, so a few pages rest on fewer sources than their authors checked; the review queue "needs_source" lists them.
* **Site contradictions found while writing:** the older salbutamol page calls it "safe" and gives a "more than twice a week" threshold that the new inhalers guide does not; fpm.ac.uk is missing from the host list of
  `tools/build-content.py`, so a reference to the Faculty of Pain Medicine is a build note.

## Not verified

*This list was written on 1 November. Its second and third items are out of date: the last eleven organ pages are articles with a second pass (v1.10.1), and the twelve test cut-offs are sourced or reworded (v1.10.4, shown on every test page in v1.10.5). The sections below this one say what changed. The first, fourth and fifth items still stand.*

* **Clinical review.** Nobody with a clinical registration has read the site. The site has a medical review policy
  (`/medical-review-policy/`) but no review under it has happened, so `lastReviewed` is never set in the schema and no page says
  "reviewed by".
* **The first-pass drafts that have no second pass:** pituitary gland, thymus and ureters stay in `content/drafts/anatomy/`.
  Eight organ pages (foot, shoulder girdle, rib cage, prostate, penis, gallbladder, spleen, uterine ligaments) have no
  article yet and stay `noindex`.
* **Twelve test cut-offs** that the pages state in prose without a sourced threshold record (`content/drafts/thresholds/README.md`).
  The reviewers found more candidates (CRP and ESR bands, BNP, vitamin D, blood glucose) listed in their notes.
* **Interaction severity tiers** are the ones the records cite; none was re-derived from the BNF this round. One needs it:
  azithromycin with citalopram sits at "monitor or adjust" on a US MedlinePlus sentence, while UK citalopram labelling
  advises against QT-prolonging combinations. The reviewers also asked for a BNF check of two dose caps (atorvastatin with
  ciclosporin, rosuvastatin with gemfibrozil).
* **178 low-severity editorial findings** (numbers in prose, tags that point at a neighbouring organ, wording nuances) are
  queued in `editorial-qa/*.json` with `status: open`.

## Anatomy articles, test thresholds, availability notes (3 November 2026)

Since this file was first written, v1.10.1 wrote and source-checked the last eleven anatomy articles (every one of the 48 organ pages is now an article) and v1.10.4 added:

* **The shoulder joint and rotator cuff** (batch `shoulder`, `content/drafts/batches/shoulder/`): the shoulder-girdle article now covers the glenohumeral joint, the rotator cuff, the deltoid
  and the upper humerus, and the page is titled *Shoulder Anatomy*. First pass 45 ledger entries; second pass by a separate subagent (supported 29, textbook 5, unsupported 11, wrong 0, unsafe 0; the
  eleven were reworded to what the retrieved text says); a third adversarial check of the 50 new or changed sentences was run before merging (see `docs/verification/shoulder-2026-11/`).
* **Twelve test cut-offs** (batches `thresholds-a` and `thresholds-b`): see `content/drafts/thresholds/README.md`. Second pass: supported 98, textbook 3, unsupported 5 (removed or reworded), wrong 2 (corrected), unsafe 0.
* **UK availability notes** for ten medicines (naproxen, esomeprazole, fexofenadine, sumatriptan, loperamide, lactulose, sildenafil, tadalafil, aciclovir, fluconazole): each UK regulatory record
  now says what is sold without a prescription and what is not, written from NHS and MHRA text and re-checked by a separate subagent (`docs/verification/regulatory-notes-2026-11/`). One finding changed the
  data: MHRA moved Nexium Control tablets to general sale in 2015, so esomeprazole gained an `otc` record.
* **Ten thin drug-class pages** (batches `classes-a` and `classes-b`, `content/drafts/batches/classes-a|b/`): triptans, 5-HT3 receptor antagonists, dopamine-antagonist antiemetics, antimotility agents, osmotic laxatives, benzodiazepines, Z-drugs,
  nitroimidazoles, alpha blockers and 5-alpha reductase inhibitors now carry a full summary, mechanism, class effects and cautions (about 1,800 to 3,300 characters each) and four to twelve references; the protected clinical fields
  (`classInteractions`, `classWarnings`, `duplicationRule`, members, links) were not touched. Second pass, by separate subagents: supported 71, textbook 7, unsupported 33 (reworded to what the retrieved text says), wrong 2, unsafe 0.
  The batch reports list what a clinician should look at (for example that no NHS page could be fetched, a 2004 NICE appraisal where newer guidance exists, and US-only MedlinePlus statements, which the pages label as US).
* **First aid**: the CPR and choking pages still follow the 2021 Resuscitation Council UK edition and show the interim notice; the notice now names what the 2025 edition changes (call 999 for any
  unresponsive person without first confirming abnormal breathing; updated choking advice). The sequences themselves were not touched: that needs the full 2025 text and a clinician's approval.

The page fetch tool still cannot reach the publishers from the cloud sandbox (`openstax.org`, `nhs.uk`, `ncbi.nlm.nih.gov`, `resus.org.uk` fail to resolve), so every check runs through search summaries.
**Allowing those hosts in the environment's network settings is the single change that would let pages be checked page by page.**

## Audit of the author sessions (5 November 2026)

All 44 author sessions started from the maintainer session (43 content batches; news-mhra ran twice) were checked against the repository, the released data and the live site.

* **Finished.** All 44 are idle. The session list still shows three as unfinished (meds-b and meds-c "blocked", conditions-a "review ready"); what they were waiting for is in the released
  data: each of the 87 medicines has a drug class in the taxonomy, no class sits outside it, and conditions-a's eight conditions are published.
* **Merged.** The last push to every content branch is dated 3 November, before integration, and none has pushed since. The ledgers, second-pass reports and `BATCH-REPORT.md` of every batch are in
  `content/drafts/batches/<batch>/`; the working drafts (fragments, per-item final JSON, build scripts) stay on the batch branches, because their text is in `content/*.json`. Two fragments differ from the
  branch copy on purpose: a placeholder reference title in `classes-b` was replaced by the real one, and a pulse-oximetry note in `thresholds-b` gained "call 999". No author session opened a pull request;
  the eight open pull requests are Dependabot updates.
* **Deployed.** Of the 435 items in the ledgers, 428 are in the released data under their own id, 5 under a prefixed drug-class id, and 2 news briefs were dropped on purpose; the planned conditions, medicines,
  deepened pages, the ten drug-class pages and the shoulder article are all in the `deploy` branch's compiled data. Items the author sessions held back because the retrieved text did not support them
  (for example poisoning, sun safety and hydration guides; HPV, sepsis and pharmacy news briefs) are listed in each `BATCH-REPORT.md` and were not added.
* **Tested.** Per batch: `check_batch.py` (the real compiler on a scratch copy), `lint_new_content.py`, and a second pass by a separate subagent. Per release: the QA workflow (content job and smoke job) and the
  Reference links workflow on the release commit, then the Live site check.
* **One gap, found and fixed.** Looking at the deployed v1.10.4 pages showed that seven of the twelve test pages with sourced thresholds (blood glucose, urine protein, hormone tests, pregnancy test, Holter monitor,
  pulse oximetry, spirometry) use the older page layout, which had no section for thresholds: the records were in the data and had cleared the review queue, but a reader saw none of them, and the urine ACR bands
  never appeared. v1.10.5 shows them on both layouts, with smoke checks for spirometry, urine protein and blood glucose.

## Tools

* `tools/verification/qa_slice.py <file> [a:b]` prints any content file as plain text for a reviewer.
* `tools/verification/validate_article.py <article.json>` checks the shape an article needs (sections, atlas structure names,
  references from two publishers with one official health body, numbers in prose).
* To merge a verified article: copy it into `content/anatomy.json` with `"updated": "<date>"`, move the draft's ledger and the
  second-pass report to `docs/verification/anatomy/<organ>/`, run `python3 tools/build-content.py`; the organ page becomes
  indexable as soon as it has an article.
