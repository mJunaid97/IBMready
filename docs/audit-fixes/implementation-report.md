# Audit fixes: implementation report

Branch `claude/women-trans-anatomy-l596bc`, work dated 2026-10-05/06, on top of release v1.8.1 (commit 02cc324).
Production was **not** changed: nothing was released, tagged or deployed; the `deploy` branch still points at
deploy-v1.8.1. The changes below are committed to the development branch and verified against a local
production-style package (`tools/package-site.py --pretty --prerender`, served by `tools/qa/serve.py`).

Baseline evidence was captured against the v1.8.1 package in `dist/` (built from the same commit that is live)
before any edit: the greps and Playwright probes referenced in the "Reproduced" column are in
`scratchpad/audit/` for the session and summarised here. External network access from the build sandbox is
limited to GitHub, so the live site was not re-fetched and no guideline body's website could be read; anything
that depended on reading an external document is marked as such.

## Issue register

| # | Audit issue | Reproduced? | Status |
|---|---|---|---|
| 3A | /first-aid/cpr/ cites RCUK 2021 guidance; sequence may not match the 2025 edition | **Confirmed** (the entry's only guideline reference is the 2021 adult BLS page; no edition, access-date or review fields existed) | **Interim state implemented**; the revised sequence is **blocked on qualified clinical approval** and on reading the current RCUK edition (not reachable from the sandbox) |
| 3A | Quizzes/flashcards derived from the CPR steps | **Confirmed** (viva item "CPR…: what are the steps?" and the first-aid quiz bank are built at runtime from `steps`/`summary`) | **Fixed**: withheld via `derived.status`; fingerprint mechanism added |
| 3B | Amlodipine: coronary artery disease both a use and a contraindication | **Confirmed** (licensed indication `coronary-artery-disease` and `conditionCautions[0]` type `contraindication` on the same id; both rendered) | **Quarantined** with a proposed correction awaiting clinical approval; build-time regression rule added |
| 3C | Brain/cerebrum, chest pain/angina, cirrhosis/ESLD, CPR/cardiac arrest/defibrillator, apixaban/DOAC, metoprolol/beta-blocker presented as synonyms | **Confirmed** for brain, chest pain, cirrhosis, CPR and metoprolol (via the `/medications/beta-blocker/` URL alias feeding search); apixaban's page name "Apixaban and DOACs" and the class page are unchanged (the class is `anticoagulants`; no separate DOAC entity exists) | **Fixed**: `searchTerms` field separates retrieval terms from synonyms; outputs corrected |
| 3D | "Oral (Oral (tablets, oral solution))"; dosage-form field carrying regimen text; dosing contradiction | **Confirmed** (23 medicines had both `routes` free text and `routeIds`; 41 had regimen text in `forms`; full pages said "dosing is intentionally not described" under a dose line) | **Fixed** in data and renderer |
| 3E | Reference labelled NHS linking elsewhere | **Confirmed** (CPR "NHS: How to do CPR" → sja.org.uk; also fainting "NHS: Recovery position" → sja.org.uk; choking cited the adult BLS page under a "Choking" title) | **Fixed**; `edition`/`published` and access-date semantics added |
| 4 | Checker: "No known interaction identified" ambiguity; missing states; hardcoded counts | **Confirmed** wording; counts were already computed (not hardcoded); `runCheck` had no error handling | **Fixed**; 12 engine tests added |
| 5 | Mobile overflow on /medications/amlodipine/ and /tests/complete-blood-count/ | **Confirmed**: 48–238 px of horizontal overflow at 320–414 px on both pages (and all test/medication pages); header overflow of ~42 px at 1024 px on every page | **Fixed** in shared CSS; smoke test now checks 12 templates × 8 widths |
| 6 | Urgent information below the 3D preview on symptom/first-aid pages | **Confirmed** (chest pain: "Seek urgent care if" rendered after the facade and two cause lists) | **Fixed** for symptoms, conditions and first aid |
| 7 | Editorial accountability | **Confirmed**: every entity is `source-verified`; no reviewer anywhere; JSON-LD never emitted `lastReviewed` (correct) | **Fixed**: four reader-facing states, separate dates, reviewer only from records |
| 8 | Privacy disclosure and sensitive data | **Confirmed**: no privacy page; GA4 sanitised `page_location` only; `page_referrer` and history-change page views could carry `?q=`/`?drugs=`; SECURITY.md said "no third-party scripts" | **Fixed** in code and documentation; one business field missing (see blockers) |
| 9 | Meta descriptions ending in "…" | **Confirmed**: 346 of 473 prerendered descriptions | **Fixed** centrally |
| 9 | FBC/CBC naming | Partly: one canonical URL already existed (`/tests/complete-blood-count/`, aliases cbc/fbc/full-blood-count redirect); "complete blood count" was not an alias and the alias line repeated the H1 | **Fixed** |
| 9 | Homepage "the heart" link → anatomy hub | **Confirmed** | **Fixed** |
| 9 | Contact page schema type | **Confirmed** (`AboutPage`) | **Fixed** (`ContactPage`) |
| 9 | Catalogue counts | Partly: directory and home counts already came from compiled data; `tools/index.html` and `home.js` fallbacks were hardcoded/stale | **Fixed** |
| 10 | Homepage hierarchy, search loading state, result types, mobile menu, system vs layer labels, related-content volume | **Confirmed** (search page wiped typed text while loading and showed "no matches" synchronously; menu had no Escape/outside-click/focus handling; organs and systems both tinted "Anatomy"; up to 106 related chips rendered flat) | **Fixed** |
| 11 | Raw renderer errors; no context-loss handling; geometry failure hidden behind "Atlas ready" | **Confirmed** by code reading and reproduced with `--disable-webgl` and blocked `.glb` downloads | **Fixed** |

## What changed, by area

### 3A. CPR and first-aid guidance (`content/first-aid.json`, `tools/build-content.py`, `tools/taxonomy.py`, `site/entity.js`, `study/index.js`, `content/vocabularies.json`)

- The CPR and choking entries now carry a `guidance` record: `basedOn` "Resuscitation Council UK, Adult basic life support guidelines, 2021 edition", `population` adult, `jurisdiction` UK, `accessed` 2026-09-12 (the date the content was written against the source; previously only implied), `status: pending-recheck`, a `note`, and `currentResource` pointing at the Resuscitation Council UK guidelines library. `instructionsStatus: pending-recheck` is set on both. Paediatric guidance is unchanged and still labelled as the "Children and infants" note; it is covered by the same interim notice because it was written from the same source edition.
- The page renders an interim notice above the steps ("These step-by-step instructions are being updated", the basis edition, access date, "Clinical approval of the revised sequence: pending") with a button to the current official resource; the steps heading reads "What to do (sequence under review)". The emergency-call block now appears directly after the lead, before the 3D preview. Unaffected content (recognition, do-nots, anatomy rationale) is untouched.
- The compiler validates `guidance`/`instructionsStatus` (a non-current status requires a current resource) and lists such topics in a new `guidance_recheck` review queue.
- Derived content: the compiler writes `derived = {fingerprint, approvedFingerprint, status}` on every entity (status `withheld` while instructions are under review or the entity is a draft; `approved` only when the fingerprint equals a recorded `derivedApproved`; otherwise `unapproved`). `study/index.js` drops withheld entities from the quiz banks and the viva, and states on the page that questions come from source-checked, not clinically reviewed, articles.
- Replacement procedural text was **not** written: the current edition could not be read from the sandbox and no qualified reviewer is available in this session. The data model is ready to receive it (`steps`, `guidance.status: current`, `review.reviewedAt`, `review.reviewer`).

### 3B. Amlodipine relationship (`content/medications.json`, compiler, renderer, `tools/qa/engine-test.mjs` unaffected)

- `conditionCautions[0]` (type `contraindication`, condition `coronary-artery-disease`) is marked `status: quarantined` with a `reviewNote` and a `proposed` record: relationship contraindication, factors unstable angina / cardiogenic shock / significant aortic stenosis, condition subtype "unstable angina (acute coronary syndrome), not chronic stable angina", formulation all oral forms, route oral, jurisdiction UK, the same BNF source, `requiresClinicalApproval: true`. No new classification was published.
- Quarantined records are excluded from the page table, from the implied `conditions` links (so the CAD page no longer receives a "caution" backlink from amlodipine) and from the graph; the page says how many statements are withheld and why. The record appears in the new `quarantined_relationship` review queue with its proposal.
- Schema: active cautions may carry `qualifier`/`conditionSubtype`, `formulation`, `route`, `jurisdiction`, `source`, `status`; the first three render.
- Regression rule: the build fails when an active contraindication is keyed to a condition that is also a licensed or guideline-supported indication and has no qualifier or subtype. Verified by compiling with the quarantine removed (build error naming `medications/amlodipine`) and with it (build passes).

### 3C. Synonyms (`content/*.json`, compiler, renderer)

- New `searchTerms` field (retrieval only): never shown as "Also known as", never emitted as `alternateName`, always indexed for search. Applied: chest pain (angina, angina pectoris, chest pressure), coronary artery disease (angina, stable angina, angina pectoris; `aliases` keep the true synonyms coronary heart disease and ischaemic heart disease; `/conditions/angina/` still redirects there), cirrhosis (end-stage liver disease, decompensated cirrhosis), brain organ (cerebrum, cerebral hemispheres; the `/anatomy/cerebrum/` redirect is kept), CPR (cardiac arrest, chest compressions, AED, defibrillator; `aliases` reduced to cardiopulmonary resuscitation and basic life support, `abbreviations` CPR, BLS), beta-blockers class (beta blocker, beta-blocker), anticoagulants class (DOAC, direct oral anticoagulant, NOAC).
- The search index no longer turns a medicine's class-named URL alias into a search word for the medicine (metoprolol / "beta blocker" now resolves to the class page); alias words are de-duplicated case-insensitively; JSON-LD `alternateName` is de-duplicated (apixaban no longer lists Eliquis three times).
- Search result labels distinguish "Anatomy article", "Body system", "3D structure · opens the explorer", and the system entries say "body system", "atlas layer" (female body) or "surgical anatomy layer".

### 3D. Medication fields (`content/medications.json`, `site/entity.js`, compiler)

- Data migration: `routes` → `routeNote` (23 records) and `forms` → `regimenNote` (41 records). No text was altered or invented.
- Renderer: "Routes" and the quick-box "Route" come from `routeIds` (vocabulary names) only; "Dosage forms" from `dosageFormIds`; the former "Forms" row is "Usual preparations" with the suffix "(summary of the cited reference, not a prescription)". The full-page dosing paragraph now says individual doses are not given and explains what the preparations line is, so the two no longer contradict each other. The "How it works" section no longer repeats the plain-language `understand` text that the quick box already shows (the detailed `howItWorks` is shown instead; `mechanismDetail` remains its own section).

### 3E. Sources (`content/first-aid.json`, compiler, renderer)

- Titles corrected to the actual publisher: "St John Ambulance: How to do CPR", "St John Ambulance: Recovery position"; the choking reference is titled for the document it links ("Resuscitation Council UK: Adult basic life support guidelines 2021 (choking section)"). The CPR RCUK reference carries `published: 2021`, `edition`, an explicit `accessed` and a note.
- Reference records now pass through `edition`; the Sources list shows the edition or publication year and carries the sentence "An access date records when the editorial team last checked a source; it does not mean the guidance is the current edition or that the page has been clinically approved."

### 4. Interaction checker (`site/interaction-engine.js`, `site/checker.js`, `site/entity.js`, `tools/qa/engine-test.mjs`, `tools/qa/smoke.mjs`, `tools/drug-interaction-checker/index.html`, `CLINICAL.md`)

- Headline for a dataset miss: "No matching record in this dataset" with the text "This does not establish that the combination is safe…". The result badge reads "No record".
- Explicit states (`STATES`): insufficient, documented, duplication, no-record, outside-coverage, unknown-entry, dataset-unavailable, error. Every pair carries a `state`; `check()` returns `state` and per-state counts. Pairs involving a medicine without a page (named substance or combination ingredient) are listed separately as "Outside this dataset's coverage" and are never counted as "no record".
- `runCheck` is wrapped: a processing error renders "The check could not be completed" with a retry and a route to the medication pages, and nothing is shown as a result. Data-load failure already rendered an "unavailable" callout and never a result; retained.
- A coverage line (records searched, medicines with pages, named substances, review status "checked against cited sources and not yet independently clinically reviewed") sits inside the result summary; the record counts come from the engine's metadata (`records.length` and the compiled `sourceMetadata`), not from the audit's figure. No coverage percentage is shown.
- Tests added (all pass; severity expectations are read from the record's own `severity` and `STATE_TIER`, not asserted by hand): warfarin + ibuprofen; amlodipine + metformin as a coverage-state case; reversed order; duplicate ingredient; brand/generic normalisation; combination product; class-rule membership and non-membership; multiple records per pair (ordering rule exercised; the dataset holds one record per pair today); unknown input; insufficient input; failed/missing data (`createEngine` throws for null, `{}`, `{records: []}`, malformed index); state distinguishability and computed counts.

### 5. Mobile overflow (`site/site.css`, `tools/qa/smoke.mjs`)

- Cause: grid tracks declared as `1fr` (minimum `auto`) in `dl.facts`, `.editorial dl`, `.side-clinical dl`, `dl.ix` and the single-column `.two` article grid under 1000 px let a long unbreakable value (LOINC codes, identifiers) widen the whole article column past the viewport. Fix: `minmax(0, 1fr)` tracks, `min-width: 0` on grid children, `overflow-wrap: anywhere` on `dd`, `td`, `th`, reference items and the aliases line; `.code` no longer `nowrap`; `dl.facts` stacks under 420 px; `.grid-3`/`.grid` use `minmax(min(300px, 100%), 1fr)`; the header search field's fixed `min-width` removed; the compact header starts at 1080 px (the desktop nav needed more than 1000 px). No `overflow-x: hidden` anywhere; tables keep the existing `.table-wrap` scroller.
- Smoke test: the phone pass now checks 12 representative pages (home, medication, test, symptom, condition, first aid, organ, tests hub, search, checker, tools, terms) at 320, 360, 375, 390, 414, 768, 1024 and 1440 px.

### 6. Emergency hierarchy (`site/entity.js`, `site/site.css`)

- `urgentHtml()` renders, directly after the lead and before the actions/3D facade: the symptom's `urgent` list ("Seek urgent care if"), a condition's `seekCare`, a first-aid topic's emergency-call block (or its `callFor` list for non-emergency topics). The blocks are static HTML with `role="note"`, not in a disclosure, not script-dependent. The duplicates lower in the templates were removed; the symptom template no longer repeats the lead under "What it is".

### 7. Editorial accountability (`site/entity.js`, `site/seo.js` use, `CLINICAL.md`)

- Editorial block rows: "Editorial status" (Draft / Source checked · pending clinical review / In clinical review / Clinically reviewed), "Clinical review" (reviewer name, credentials and date only when `review.reviewedAt` and `review.reviewer.name` exist; otherwise "Pending: not yet independently reviewed by a qualified clinician"), "Sources checked" (the editorial check date, labelled as not a clinical approval). JSON-LD `lastReviewed` is passed only under the same condition; no reviewer identity is ever emitted without a record. Today no entity has a record, so no page shows a reviewer.
- Derived-content fingerprint and statuses as described under 3A.

### 8. Privacy (`site/site.js`, `privacy/index.html`, `contact/index.html`, `tools/package-site.py`, `SECURITY.md`)

- Verified behaviour before writing: GA4 `G-W35QT71BH2` is loaded by `site/site.js` on every page except the explorer; the page view used origin+path; custom events (checker only) carry counts and tiers; storage is limited to `atlas-theme` and `atlas-quality`; no cookies are set by site code; no error reporting; no forms. Gaps: `page_referrer` was not sanitised and history-change page views could expose `?q=`/`?drugs=`.
- Code: the tag now receives `page_location` and `page_referrer` reduced to origin+path via `gtag('set', …)` and the `config` call; the same values are re-set after every `pushState`/`replaceState`/`popstate`; `allow_google_signals` and `allow_ad_personalization_signals` are false. Enhanced-measurement options live in the GA property and cannot be verified or changed from the code; the privacy page says so.
- New `/privacy/` page (linked from the footer, the contact page and the policies chips; in the core sitemap group) describing only verified behaviour, the share-URL exposure (browser history, server logs), the two local-storage keys, and the absence of accounts and forms. No retention period, legal entity or address is stated as fact; the hosting log retention is marked as unconfirmed.
- Contact page: `ContactPage` schema; a warning that issues are public and must not contain personal medical details; a private route limited to the repository's private advisory form because `contact.email` is empty (the field is reported as missing, not invented).

### 9. SEO (`site/seo.js`, `site/entity.js`, static pages, `content/site.json`, `content/tests.json`, `index.html`, `site/home.js`, `site/page.js`, `tools/index.html`)

- `metaDescription()` returns whole sentences that fit 155 characters, else the lead's first clause at a `;`/`:` boundary, else a per-entity fallback ("Name: Descriptor (also alias). Sourced educational summary on Anatomy Nexus."), never an ellipsis. Static pages whose descriptions exceeded 155 characters were rewritten by hand (16 pages). Canonicals, robots rules, sitemap structure, the search noindex and the quality-gate noindex are untouched.
- Full blood count: `aliases` = complete blood count, blood count; `abbreviations` FBC, CBC; one canonical URL as before.
- Homepage: "the heart" → `/anatomy/heart/`; the other examples are now links too.
- Counts: `tools/index.html` numbers are filled from `SITE.counts` by `site/page.js`; stale `home.js` fallbacks updated.

### 10. Navigation and search (`index.html`, `site/home.js`, `site/site.js`, `search/index.js`, `site/entity.js`)

- Homepage: shorter hero lead; three start paths (Explore in 3D / Learn a topic / Test yourself); the two repetitive section leads removed or shortened.
- Header search shows "Loading the search index…" until the index arrives and ignores stale results; the search page shows a loading state, keeps typed text, never shows "no matches" before the search runs, and shows an error state if the index fails.
- Mobile menu: Escape closes and returns focus to the button; clicks outside and link activation close it; `aria-expanded` tracks state. It is a disclosure, not a modal, so no focus trap was added.
- Related topics: the first 12 links of each group are shown, the rest inside a `<details>` ("Show N more …") so every link remains in the HTML.

### 11. 3D fallbacks (`explorer/app.js`, `explorer/styles.css`)

- WebGL capability check before the viewer starts; renderer construction wrapped; `webglcontextlost` handled; data and geometry download failures keep the loading card, explain the problem in plain words, offer "Try again", "Try the lighter model" (geometry case) and "Read the anatomy articles", and never set the atlas as ready or toast "Atlas ready". Raw error text goes to the console only. Click-to-load facades on article pages are unchanged.

## Tests performed

See the "Results" section below; it is filled from the actual runs.

## Remaining dependencies

1. **Qualified clinical approval** of a revised CPR and choking sequence against the current Resuscitation Council UK edition (the current edition itself could not be read from the build sandbox). Until then both pages carry the interim notice and their derived questions are withheld.
2. **Qualified clinical approval** of the proposed amlodipine correction (factor-level contraindications for unstable angina, cardiogenic shock and significant aortic stenosis; no condition-level contraindication for coronary artery disease). The quarantined record and the proposal are in `content/medications.json` and in the `quarantined_relationship` queue.
3. **Business information**: `contact.email` is empty; no private non-clinical mailbox exists to publish. The hosting provider's server-log retention period is not confirmed and is marked as such on the privacy page.
4. **Analytics property settings** (enhanced measurement, data retention) are outside the code and were not verified.
