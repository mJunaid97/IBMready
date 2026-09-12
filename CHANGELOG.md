# Changelog

## Unreleased

Drug Interaction Checker: the medication interaction checker becomes the flagship clinical tool of
the platform, at `/tools/drug-interaction-checker/` (the old `/interactions/` URL redirects, query
string included), with a clinical tools hub at `/tools/` and a methodology page at
`/editorial/drug-interaction-methodology/`.

- A pure engine (`site/interaction-engine.js`, unit-tested in Node by the QA workflow) implements
  the checker's API contract: every unique pair of entries is checked across every pair of their
  active ingredients, records written for a drug class apply only to its members as the source
  states, duplicate ingredients and therapeutic duplication are reported separately, pairs with no
  record are listed with the cautious wording, and every result keeps its sources, the document
  that supports its state and its review status
- The six source states are mapped onto the specification's display tiers (contraindicated or
  avoid, major, moderate, minor, not graded) without inference; nothing is labelled minor, and a
  documented-but-ungraded interaction is shown as not graded
- Named substances: a record whose other party has no page names its agents (`bAgents`), and class
  members without a page become selectable too, so "amlodipine + simvastatin", "losartan + naproxen"
  or "azithromycin + clarithromycin" resolve to their records; brand names, salt forms and true
  synonyms resolve to the medicine while a grouped page's other members no longer do
- Every record carries validated knowledge-graph links (classes, shared organs, the anatomy and
  physiology of its mechanism, the test or biomarker page of each monitoring item), shown on the
  checker and on the medication and class pages
- The page: an accessible combobox with spelling tolerance and live announcements, removable chips,
  a summary panel (medicines checked, pairs reviewed, results by tier), severity-first sections with
  pair cards, the stronger notice for contraindicated or major results, related topics, the
  provenance block, references and the medical information notice; indexable with a fixed canonical
  and `WebApplication` schema, shareable `?drugs=` state, `?drug=` from every medication page's new
  *Check interactions* section
- Privacy: analytics receive counts and tiers only, and every page URL is now reported to analytics
  without its query string
- Packaging: the two web pages under `tools/` are served, `/tools/` is no longer disallowed in
  `robots.txt`, `/interactions/` is a one-hop 301, the dev server emulates it, the smoke test covers
  the checker end to end

## v1.2.0 — 2026-09-12

Clinical content layer: the tests, medications and interactions of the Clinical Content Depth
specification become structured, source-backed, region-aware entities (see CLINICAL.md).

- Two new sections: biomarkers (30 pages: what each analyte is, units, why higher or lower,
  factors, the tests that measure it) and drug targets (22 pages: receptors, enzymes, channels,
  transporters and pathways, with the medicines and classes that act on them)
- Tests: 16 pages at full depth in the specification's question order, with a quick summary,
  specimen, components linked to biomarkers, a reference-range policy, guideline thresholds with
  jurisdiction and source, factors that affect the result and what the test cannot tell; troponin,
  BNP, CRP, ESR, TSH, ferritin and creatinine/eGFR get canonical pages (301s from the old panel
  ids and aliases)
- Medications: 12 pages at full depth (amlodipine, losartan, lisinopril, metformin, atorvastatin,
  rosuvastatin, aspirin, ibuprofen, paracetamol, omeprazole, amoxicillin, azithromycin) with
  brands and prescription status by region, uses by licence status and country, plain and
  technical mechanism, a linked pathway, targets, sourced side effects, serious safety information,
  typed warnings, contraindications, interactions, monitoring, special populations, condition
  cautions, effects on tests and pharmacokinetics; every structured fact carries a source marker
  with its country; the macrolides class and 14 brand or combination products are added
- Drug classes: targets, class warnings, class interactions and therapeutic-duplication rules
- Interactions: 69 sourced records (drug–drug, drug–class, therapeutic duplication) with mechanism,
  effect, official wording, management, monitoring, evidence and a severity state assigned only
  where the cited wording supports it; shown on every medication and class page and in the new
  interaction checker at /interactions/ (noindex), which resolves brands, products and classes to
  ingredients, checks every pair, flags duplication and never says "safe"
- Comparisons at /compare/: CRP vs ESR, creatinine vs eGFR, ECG vs echocardiogram, CT vs MRI,
  TSH vs free T4, HbA1c vs blood glucose, atorvastatin vs rosuvastatin
- Every page shows its review status honestly and a universal "at a glance" sidebar; Drug schema
  carries active ingredient, class, mechanism, routes, prescription status, contraindications,
  interacting drugs and food, alcohol, pregnancy and breastfeeding warnings
- Compiler: jurisdiction-aware references, vocabularies, sources required on every clinical fact,
  completeness rules for full-depth pages, review-status indexability, products and the checker
  index; packaging, prerendering, sitemaps, redirects and the smoke test cover the new sections

## v1.1.2 — 2026-09-12

Search Console verification meta tag and Google Analytics 4

- Search Console verification token and Google Analytics 4 measurement id for anatomynexus.com
- Google Analytics 4 behind a config value; clean URLs require prerendering
- Live check: every curl has a connect and total timeout so a stalled request cannot hang the job

## v1.1.1 — 2026-09-12

Cache-safe deploys. The first v1.1.0 deploy served pages of the new release with the previous
release's cached scripts (no fingerprinted file names, one-day cache lifetime), which broke the page
scripts until the cache expired.

- Every internal module import, script tag, stylesheet link and data fetch in the package carries
  `?v=<version>`, so cached modules of one release are never used by another
- Deploy guide: purge the hosting cache once after each release

## v1.1.0 — 2026-09-12

Search architecture release: the site becomes Anatomy Nexus, every page is prerendered static HTML
with complete metadata and structured data, and the URL, sitemap, redirect and credibility rules of
the SEO architecture specification are implemented (see SEO.md).

- Brand: Anatomy Nexus everywhere (pages, explorer, manifest, social cards); home page rewritten
  ("Explore the Human Body. Understand Medicine.") with hub links and featured entities
- URLs: clean trailing-slash URLs for every entity (`/conditions/gout/`), canonical anatomy pages at
  `/anatomy/<organ>/` with `/organs/` as a browse hub, `/medical-terms/`, `/drug-classes/`; ids
  renamed to canonical slugs (complete-blood-count, x-ray, ct-scan, pet-scan); 205 URL aliases
  (synonyms, abbreviations, brand names, old ids) as one-hop 301 redirects; query URLs,
  `index.html`, missing trailing slashes and retired paths redirect; unknown slugs are real 404s
- Prerendering: `tools/prerender.mjs` writes every page as static HTML; scripts hydrate only
- Metadata: title pattern, unique descriptions, canonical, robots, Open Graph and Twitter tags on
  every page; JSON-LD graph (Organization, WebSite + SearchAction, BreadcrumbList, MedicalWebPage
  with citations, MedicalCondition, Drug + DrugClass, MedicalTest, ImagingTest, MedicalProcedure,
  AnatomicalStructure, AnatomicalSystem, MedicalSignOrSymptom, HowTo, DefinedTermSet, ItemList)
- Content: 12 full anatomy articles (heart, brain, lungs, liver, kidneys, stomach, pancreas, aorta,
  coronary arteries, knee joint, spine, large intestine); 23 drug-class pages; losartan; summaries
  for every imaging modality and medicine; references for every physiology and symptom page
  (298 references, each with publisher, evidence tier and date checked); "start here" priority
  pages per hub; content dates
- Credibility: About, editorial policy, medical review policy, references policy, corrections
  policy, disclaimer and contact pages; an "About this page" block with author, review status,
  last-updated date and source count on every entity page; structured sources with tiers
- Hubs: intro, start-here pages, category filters, A–Z groups, body-system links, other sections;
  breadcrumb lists with schema on every page; related topics from the knowledge graph
- Performance: click-to-load 3D model with a static preview image on article pages (the model no
  longer loads with the page); previews rendered from the atlas (also used as social images)
- Build and QA: sitemap index with one file per section and meaningful lastmod; robots rules;
  generated `.htaccess` URL rules; `tools/qa/serve.py` emulates them; the smoke test checks
  metadata, schema, breadcrumbs, sources, redirects, sitemaps, prerendered HTML and hydration;
  a weekly reference-link check; the Release, Deploy and Pages workflows build the prerendered
  package; indexability quality gate in the compiler

## v1.0.0 — 2026-09-12

First production release, live at https://anatomynexus.com.

- 3D anatomy explorer: 2,234 selectable pieces (1,671 named structures) in 16 systems from
  BodyParts3D 4.0, streamed as meshopt-compressed glTF; search, organs, regions, isolate, x-ray,
  three-plane slicing, exploded and inventory views, labels, deep links, embeds
- Body system and organ pages with live 3D and related clinical topics
- Physiology (30), symptoms (18), conditions (40), medical tests (26), imaging (7),
  procedures (14), medications (24), first aid (16), health (7); 149-term medical dictionary
- Knowledge graph with 3,247 validated typed links and computed reverse links; universal search
- Study tools: identify and locate structures in 3D, flashcards, quiz banks, viva questions
- Accessibility and phone layout pass; strict Content-Security-Policy with no inline scripts
- Production packaging (clean URLs, sitemap, headers, 404), CI smoke tests, Hostinger deployment
