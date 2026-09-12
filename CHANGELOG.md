# Changelog

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
