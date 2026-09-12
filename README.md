# Anatomy Nexus

**Explore the human body. Understand medicine.** An open, interconnected human-body knowledge
platform live at https://anatomynexus.com: an interactive 3D anatomy atlas of the whole body and,
around it, a connected body of clinical and learning content in which every page names the organs
and structures it concerns. Anatomy → physiology → symptoms → conditions → tests → imaging →
procedures → medications → drug classes → learning, stored as one validated knowledge graph and
published as static, server-rendered pages with the metadata, structured data and URL rules an
authoritative medical reference needs (see `SEO.md`).

**Sections**

| Section | URL | What it is |
| --- | --- | --- |
| 3D explorer | `/explorer/` | 2,234 individually selectable pieces (1,671 named structures) in 16 systems, streamed as compressed glTF; search, organs, regions, isolate, x-ray, slicing on three planes, exploded and inventory views, pinned labels, deep links, clinical topics on every structure card, study modes, embeddable. |
| Anatomy | `/anatomy/<organ>/` | The canonical page of each of 39 organs and skeletal groups; 12 carry full articles (heart, brain, lungs, liver, kidneys, stomach, pancreas, aorta, coronary arteries, knee, spine, large intestine): key facts, location, structure, supply, function, clinical relevance, references, a click-to-load 3D model and every topic that concerns the organ. `/anatomy/` and `/organs/` are the browse hubs. |
| Body systems | `/systems/<system>/` | 16 system pages: overview, functions, clinical notes, organs, every structure, 3D model, related topics. |
| Physiology | `/physiology/<topic>/` | 30 topics on how the body works, sourced to OpenStax *Anatomy & Physiology* and NIH. |
| Symptoms | `/symptoms/<symptom>/` | 18 symptom pages: anatomy involved, common and less common causes, red flags, related conditions and tests. Educational, never diagnostic. |
| Conditions | `/conditions/<condition>/` | 40 conditions: definition, affected anatomy, causes, risk factors, symptoms, signs, complications, diagnosis, treatment, prevention, when to seek care. |
| Medical tests | `/tests/<test>/` | 38 tests (23 at full clinical depth): kind, category, specimen, method, LOINC codes, what they measure, why ordered, how done, reading the result, limitations. `/tests/categories/` is the master taxonomy: 36 categories over 837 catalogued test concepts. |
| Imaging | `/imaging/<modality>/` | 8 modalities: how they work, what they show, best for / not for, dose, preparation, common uses. |
| Procedures | `/procedures/<procedure>/` | 14 procedures step by step: indications, before, steps, after, recovery, risks, alternatives. |
| Medications | `/medications/<generic-name>/` | 39 medicines by generic name (brand names redirect), including a vaccine, a contrast agent and a radiopharmaceutical: product type, class, uses, mechanism, routes and dosage forms, availability by country, RxNorm / ATC / FDA class codes, side effects, cautions, interactions, monitoring, and a *Check interactions* entry into the checker. `/medications/classes/` is the taxonomy: 31 therapeutic areas, 536 classes with ATC codes. |
| Drug classes | `/drug-classes/<class>/` | 27 classes: mechanism, biological target, body system, conditions treated, members, class effects, cautions. |
| First aid | `/first-aid/<topic>/` | 16 topics following Resuscitation Council UK / ERC guidance, each with the anatomy behind it. |
| Health | `/health/<topic>/` | Exercise, sleep, nutrition, weight, smoking, alcohol, hydration through the systems they act on. |
| Medical terms | `/medical-terms/` | 149 terms in 8 categories with pronunciation, plain meaning, examples, atlas links and the pages that use them. |
| Study | `/study/` | Identify and locate structures in 3D, flashcards, quizzes over every section, generated viva questions. |
| Clinical tools | `/tools/` | The tools hub. Its flagship is the **Drug Interaction Checker** (`/tools/drug-interaction-checker/`): add two or more medicines by generic name, brand, active ingredient or combination product and every pair is checked against the sourced interaction records, results ordered by severity with the state the cited source supports, duplicate ingredients, the cautious no-interaction wording, related anatomy and tests, sources and disclaimers. Its methodology is at `/editorial/drug-interaction-methodology/`. |
| Search | `/search/` | One index over 2,100 structures, organs, systems, regions, terms and topics; also the header search box on every page. |
| About | `/about/` … `/contact/` | About, editorial policy, medical review policy, references policy, corrections policy, disclaimer, contact. |

## Brand

The Anatomy Nexus identity is the production logo package in `brand/` (SVG, PNG, PDF and EPS lock-ups,
print-CMYK exports, the favicon set and the vector masters; `brand/README.txt` gives the colours, the
typography and the usage rules). The site serves only what it needs: the logo SVGs in `site/logo/` (the
primary horizontal lock-up, the reversed white version for dark surfaces, the AN monogram for small spaces,
the stacked and wordmark variants), the favicon set (`favicon.svg`, `favicon.ico`, `site/apple-touch-icon.png`,
`site/icon-192.png`, `site/icon-512.png`, `manifest.webmanifest`) and Inter, self-hosted in `site/fonts/`.

The design tokens at the top of `site/site.css` (and their mirror in `explorer/styles.css`) carry the
palette, Deep Navy `#0B2D45`, Soft Teal `#4E9CAB`, Cool Gray `#A7B3BD` and Light `#F7F9FB`, and derive
every surface, border, text and interactive tint from it with `color-mix`, in a light and a dark theme.
Components never name a raw colour: navy is the anchor (text, primary actions, headings), teal the accent
(links on hover, active and selected states, focus rings, knowledge connections), gray the support (borders,
metadata). Amber and red exist only for warnings and serious safety information. One inline SVG icon set
(`iconSvg` in `site/site.js`, the same stroke style as the explorer's controls) replaces emoji everywhere.
`brand/` is documentation and source material: `tools/package-site.py` leaves it out of the deployed package.

The site is plain HTML, CSS and ES modules over compiled JSON. For development, serve the
repository root with any static server and open `/`; detail pages then use query URLs
(`/conditions/condition.html?id=gout`) and render in the browser. Production is a packaged,
prerendered copy with clean URLs (`/conditions/gout/`), built by `tools/package-site.py`.

```sh
python3 -m http.server 8080      # then open http://localhost:8080/
```

## Data

Geometry comes from **BodyParts3D 4.0** (is-a tree release, `isa_BP3D_4.0_obj_99`) by the
Database Center for Life Science, licensed CC BY 4.0. See `data/ATTRIBUTION.md`.

| Build | Triangles | Download | Use |
| --- | --- | --- | --- |
| `data/hd/` | 3.26 M | 12.8 MB | desktops and laptops (default) |
| `data/lite/` | 1.14 M | 5.4 MB | phones and low-memory devices (automatic, switchable in Help) |

Both builds carry the same `atlas.json` (pieces, structures, systems, concepts) and one
`glb/<system>.glb` per system: KHR_mesh_quantization + EXT_meshopt_compression, one named
node per piece.

Editable content lives in `content/` and is compiled into `data/content/` by
`tools/build-content.py`:

- `content/site.json` — site identity: name, URL, editorial fields, verification codes
- `content/systems.json` — system overviews
- `content/organs.json` — organ groupings (match rules, aliases, URL aliases)
- `content/anatomy.json` — the written anatomy articles (title, descriptor, intro, key facts, sections, structures, references)
- `content/regions.json` — spatial regions
- `content/structures.json` — descriptions keyed by side-stripped structure name
- `content/terms.json` — terminology dictionary (8 categories, pronunciation, atlas links)
- `content/physiology.json`, `symptoms.json`, `conditions.json`, `tests.json`, `biomarkers.json`,
  `imaging.json`, `procedures.json`, `medications.json`, `drug-classes.json`, `targets.json`,
  `first-aid.json`, `health.json` — one entity per key, cross-linked by id, each with `aliases`,
  `urlAliases`, `references` and a `review` status
- `content/vocabularies.json`, `test-taxonomy.json`, `medication-taxonomy.json` — the controlled vocabularies (specimens, methods,
  modalities, routes, dosage forms, regulatory statuses, product types…), the master test taxonomy with its catalogue of 837
  concepts, and the medication taxonomy (therapeutic areas → classes with ATC codes); `terminology-verification.json` is
  written by the terminology pipelines (see `CLINICAL.md` §8)
- `content/interactions.json`, `products.json`, `comparisons.json` — sourced interaction records,
  brand and combination products mapped to ingredients, and structured comparisons (see `CLINICAL.md`)
- `content/roadmap.json` — phases, sections, entity model

Every file carries `_updated` (the date its visible content last changed) and `_priority` (the
"start here" entities of its hub). The compiler validates every cross-reference (entity ids, organ
and system ids, structure names, term ids, URL aliases, reference URLs and dates) and **fails the
build on any problem**, resolves structure names to atlas ids, classifies every reference by
publisher and evidence tier, precomputes reverse links, and decides indexability with a quality
gate. Outputs:

| File | Contents |
| --- | --- |
| `data/content/atlas-content.json` | systems, organs (resolved structures, anatomy articles), regions, structure descriptions |
| `data/content/terms.json` | terminology |
| `data/content/types/<type>.json` | one file per entity type: metadata, categories, priority list, items with `anatomy`, `links`, `backlinks`, `references`, `updated`, `seo` |
| `data/content/clinical.json` | compact name index plus organ / system / structure / term → entity backlinks (explorer, anatomy and system pages) |
| `data/content/aliases.json` | URL alias → canonical slug per section (the 301 table) |
| `data/content/search-index.json` | flat search index over everything |
| `data/content/knowledge.json` | the whole graph in one file (267 topics, 4,700 typed links, 540 references) |
| `data/content/interactions.json` | interaction records with their knowledge-graph links, class membership, products, named substances, the name index and the source metadata the Drug Interaction Checker uses |
| `data/content/comparisons.json` | the comparisons |
| `data/content/test-categories.json` | the 36 test categories: pages in each, catalogued concepts, counts, indexability |
| `data/content/medication-taxonomy.json` | therapeutic areas → classes → medicines, plus route / dosage-form / product-type facets |
| `data/content/review-queues.json` | the editorial review queues computed by the validation rules |
| `data/content/vocabularies.json` | the controlled vocabularies with display names |
| `site/site-meta.js` | the site identity as an ES module for the page shell |

To add a condition, test, medication or any other entity: add a key to the matching
`content/*.json`, reference other entities by id and structures by their atlas name, add a
couple of references and URL aliases, bump `_updated`, run `python3 tools/build-content.py`, and
the page, its links, the reverse links on every page it mentions, the explorer's structure cards,
the search index, the redirects and the sitemaps all update.

## Production build

```sh
python3 tools/build-content.py
cd tools/qa && npm ci && npx playwright install chromium && cd ../..
python3 tools/package-site.py --site-url https://anatomynexus.com --pretty --prerender --zip
python3 tools/qa/serve.py --dir dist --port 8124        # emulates the production URL rules
```

`dist/` is the site as deployed: every page prerendered to static HTML at its clean URL
(`conditions/gout/index.html`), a sitemap index with one file per section, `robots.txt`, the
`.htaccess` with HTTPS, one canonical host, the alias/query/trailing-slash 301 rules, media
types, compression, caching and security headers, and a real 404 page. `SEO.md` documents the
whole layer; `DEPLOY.md` the hosting.

## Quality checks

`.github/workflows/qa.yml` runs on every push and pull request:

1. **Content graph** — `python3 tools/build-content.py` must succeed, the compiled
   `data/content/` and `site/site-meta.js` must match what is committed, and the interaction
   checker's engine tests (`node tools/qa/engine-test.mjs`: every pair checked, severity mapping,
   duplication, the no-interaction wording, the API contract) must pass.
2. **Production build and smoke test** — the package is built with prerendering and served with
   the URL rules emulated; `tools/qa/smoke.mjs` drives headless Chromium through every page
   type and all entity pages (one H1, unique title and description, canonical, robots, Open
   Graph, breadcrumbs and valid JSON-LD, related links, sources, editorial block), every
   internal link (no 404s, no redirects), the header search, hub filters after hydration, the
   3D facade, the explorer (geometry, structure card, multi-structure links, locate mode), the
   sitemap index and every URL in it, the 301 rules, the raw prerendered HTML, a real 404, a
   phone-width layout check, and every page type again with the Content-Security-Policy
   enforced.

The content job also runs the unit tests of the terminology pipelines (`tools/terminology/`: LOINC and RxNorm
ingestion on synthetic fixtures). `.github/workflows/references.yml` fetches every reference URL weekly and on content changes
and fails on a dead link. `live-check.yml` runs the smoke test against the deployed site.

## Security

There is no server-side code and no third-party script. Every page loads external ES modules
only and ships a `Content-Security-Policy` meta tag (`script-src 'self'`, `object-src 'none'`,
`base-uri 'self'`); all content is escaped before rendering, reference links must be `https://`
(checked by the compiler and at render time), and URL parameters are looked up against known
ids rather than echoed. `.htaccess`, `_headers` and `vercel.json` add `frame-ancestors`,
`nosniff`, HSTS and `Referrer-Policy`. See `SECURITY.md`.

## Deploying

- **Hostinger (anatomynexus.com)**: every release is built by the Release workflow, kept as a
  GitHub Release and pulled by the server from the `deploy` branch; the Rollback workflow
  restores any earlier version. Step by step in `DEPLOY.md`.
- **GitHub Pages**: the `Deploy to GitHub Pages` workflow builds and publishes the package.
- **Netlify / Cloudflare Pages / Vercel / any static server**: deploy `dist/`.

## Rebuilding the atlas from source

Requires Node 18+ and Python 3.

```sh
cd tools && npm install
# 1. classify pieces into systems (needs the BodyParts3D 4.0 OBJ bundle and the 3.0 tables)
python3 classify.py --bp3d /path/to/bodyparts3d-4.0 --bp3d30 /path/to/bodyparts3d-3.0/BodyParts3D_data
# 2. build geometry (HD and lite)
node build-atlas.mjs --src /path/to/isa_BP3D_4.0_obj_99 --manifest manifest/atlas-source.json --out ../data/hd   --error 0.2 --ratio 0.45 --min-tris 400 --max-tris 120000 --jobs 4
node build-atlas.mjs --src /path/to/isa_BP3D_4.0_obj_99 --manifest manifest/atlas-source.json --out ../data/lite --error 0.6 --ratio 0.15 --min-tris 150 --max-tris 40000 --jobs 4
# 3. compile content, 4. render the 3D preview images (needs a local server on :8123)
python3 build-content.py
node render-previews.mjs --force --extras      # every preview with the brand plate, plus site/hero.jpg and site/og-cover.png
```

`tools/inspect-glb.mjs file.glb` prints what a browser will decode from a GLB.

## Explorer URL parameters

| Parameter | Example | Meaning |
| --- | --- | --- |
| `#s=<piece id>` | `explorer/#s=FJ3365` | select a structure (right femur) |
| `#o=<organ id>` | `explorer/#o=liver` | select an organ group |
| `#c=<FMA id>` | `explorer/#c=FMA49893` | select every piece under a concept (coronary arteries) |
| `#r=<region id>` | `explorer/#r=thorax` | show only a region |
| `#sys=a,b` | `explorer/#sys=skeleton,heart` | visible systems |
| `#x=1` · `#e=0.6` · `#slice=x` | | x-ray, explode amount, slice axis |
| `#s=a,b,c` | `explorer/#s=FJ3365,FJ3310` | select several structures (used by condition and symptom pages) |
| `?study=quiz\|locate\|cards&sys=` | `explorer/?study=locate&sys=skeleton` | open study mode: identify the highlighted structure, click the named structure, or flashcards |
| `?quality=hd\|lite` | | force a geometry build |
| `?embed=1` | | bare viewport for iframes (noindex) |

## Repository layout

```
index.html            home
explorer/             3D atlas (app.js, viewer.js, ui.js, search.js, styles.css)
anatomy/ systems/     anatomy and system pages (templates + page scripts)
organs/ medical-terms/ study/ search/ roadmap/
conditions/ … health/ knowledge sections: a hub page and a detail template each, rendered by site/section.js
biomarkers/ targets/  the clinical layer's own sections; compare/ (site/compare.js)
tools/                the clinical tools hub (index.html) and the Drug Interaction Checker (drug-interaction-checker/, site/checker.js
                      over site/interaction-engine.js); the rest of tools/ is the build pipeline and is never deployed
editorial/            the drug interaction methodology page (site/methodology.js)
about/ … contact/     policy pages
site/                 shared shell: site.js (URLs, header, footer, icons, facade), seo.js (metadata, JSON-LD), entity.js
                      (templates, hubs), site.css (design tokens and components), logo/ (the logo SVGs the pages use),
                      fonts/ (Inter), previews/ (3D preview images with the brand plate), site-meta.js (generated)
brand/                the Anatomy Nexus logo package: masters, print files, favicon sources, README.txt (colours, type, usage)
data/                 built atlas (hd, lite), compiled content, ATTRIBUTION.md
content/              editable content sources
tools/                pipeline: build-content.py (+ taxonomy.py), package-site.py, prerender.mjs, render-previews.mjs,
                      check-references.py, release.py, terminology/ (LOINC and RxNorm ingestion), qa/ (smoke test, engine-test.mjs, serve.py)
vendor/three/         three.js r186 (minified core + the addons used)
ARCHITECTURE.md       entity model and how sections connect · SEO.md the search architecture · CLINICAL.md the clinical layer
```

## Licence

Code: MIT (see `LICENSE`). Anatomy geometry and derived data: CC BY 4.0, BodyParts3D © The
Database Center for Life Science. Written descriptions in `content/`: CC BY 4.0. This is an
educational resource, not medical advice.
