# Changelog

## v1.4.0 — 2026-09-12

Comprehensive tests and medications: the Tests and Medications sections become a terminology-driven, extensible
clinical knowledge graph (Comprehensive Clinical Tests & Medications Master Specification; see CLINICAL.md §8).
Built on top of v1.3.0: everything in the Drug Interaction Checker release below is included.

- Master test taxonomy: 36 public categories in four groups over a catalogue of 837 test concepts with abbreviations
  and synonyms (§4–§40); a category hub at /tests/categories/ and one page per category listing the tests with a page
  and the catalogued concepts still to be written (indexable only with two or more pages, so the catalogue never
  produces thin pages)
- Master medication taxonomy: 31 therapeutic areas → 536 pharmacologic class concepts mapped to WHO ATC codes and to the
  drug-class pages, browsable at /medications/classes/; the 14 ATC first-level groups (§42–§74)
- Controlled vocabularies enforced at build time: test kinds, specimens, methods, imaging modalities, 28 routes, 47 dosage
  forms, 10 jurisdiction-aware regulatory statuses, product types (biologic, vaccine, contrast agent, radiopharmaceutical,
  gene and cell therapy…), vaccine platforms, advanced-therapy kinds (§3, §75–§77)
- Canonical terminology identifiers on entities: LOINC on tests and biomarkers, RxNorm RxCUI, ATC and FDA Established
  Pharmacologic Class on medicines and classes, shown as asserted until a licensed release verifies them; MedicalCode
  entries in the MedicalTest and Drug schema (§2)
- Drug-name rules: an alias may never be another ingredient, a class, a class member or a product; brands map to one
  ingredient; combination products list every ingredient; 60 confusing "also known as" entries removed from existing
  pages (nifedipine is not a synonym of amlodipine) (§79, §95)
- Every test now declares its kind, categories, specimen(s) and method(s); panels link their component tests; genetic
  tests state their scope; tests that are abbreviations carry a canonical name; each page lists the medicines whose
  sourced monitoring plans name it and the catalogued concepts it covers
- Every medicine now declares its product type, therapeutic area, vocabulary routes and dosage forms, ingredient
  variants, availability by country with a source per row, and terminology codes; same-class medicines are shown apart
  from related medicines; umbrella entities list their members
- Knowledge graph: 2,336 typed edges with the specification's relationship names (TEST_MEASURES … MEDICATION_EXCRETED_BY),
  clinical edges emitted only from sourced records (§80–§81)
- Editorial review queues computed by the build (§94): needs_source, needs_medical_review, potential_duplicate,
  possible_synonym_error, possible_brand_mapping_error, class_mapping_conflict, test_reference_range_risk,
  regulatory_status_conflict, deprecated_terminology, sparse_public_page, coverage_gap…; provenance and freshness
  metadata on every entity (§91)
- Terminology ingestion pipelines (tools/terminology/): LOINC and RxNorm releases → canonical candidates (variants
  collapsed, deprecated records flagged, specimens/methods/categories/dose forms/routes/ATC/EPC mapped), matched to the
  catalogue and pages, review queues, and verification of every asserted code; unit tests on synthetic fixtures run in
  CI; licensing and cadence documented (§84–§85, §102)
- New content (Phase 2–3 seed): prothrombin time and INR, iron studies, vitamin B12 and folate, vitamin D, hepatitis B
  tests, HIV test, blood pressure measurement (with NICE thresholds), DXA scan; clopidogrel, bisoprolol, citalopram,
  clarithromycin, tramadol, oxycodone, chlorphenamine, inhaled beclometasone; the influenza vaccine, iodinated
  contrast agents and FDG-18 as first entities of the vaccine, contrast-agent and radiopharmaceutical product types,
  with their classes; biomarkers INR, vitamin B12, folate, 25-hydroxyvitamin D; interaction records that named
  clopidogrel and clarithromycin now link their pages
- Hubs: tests filter by category, specimen and method; medications by therapeutic area, route, dosage form and
  product type (§96); search resolves canonical names, abbreviations, ingredient variants, brands and every catalogued
  synonym (§83); the Drug Interaction Checker preloads ?drug=<ingredient> from every medication page, and the
  recommended address /medications/classes/<class>/ redirects to the class page in one hop (§97, §100)
- Compiler: quality gates require a test's purpose, measures, interpretation and limitations and a medicine's product
  type, brands, class, uses, mechanism, side effects, warnings, interactions, monitoring and regulatory status before
  indexing (§89–§90); the electrolytes panel lost its prose reference ranges (§41)

## v1.3.0 — 2026-09-12

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
