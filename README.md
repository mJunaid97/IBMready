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
| Medical tests | `/tests/<test>/` | 26 tests: what they measure, why ordered, how done, reading the result, limitations. |
| Imaging | `/imaging/<modality>/` | 7 modalities: how they work, what they show, best for / not for, dose, preparation, common uses. |
| Procedures | `/procedures/<procedure>/` | 14 procedures step by step: indications, before, steps, after, recovery, risks, alternatives. |
| Medications | `/medications/<generic-name>/` | 25 medicines by generic name (brand names redirect): class, uses, mechanism, forms, side effects, cautions, monitoring. |
| Drug classes | `/drug-classes/<class>/` | 23 classes: mechanism, biological target, body system, conditions treated, members, class effects, cautions. |
| First aid | `/first-aid/<topic>/` | 16 topics following Resuscitation Council UK / ERC guidance, each with the anatomy behind it. |
| Health | `/health/<topic>/` | Exercise, sleep, nutrition, weight, smoking, alcohol, hydration through the systems they act on. |
| Medical terms | `/medical-terms/` | 149 terms in 8 categories with pronunciation, plain meaning, examples, atlas links and the pages that use them. |
| Study | `/study/` | Identify and locate structures in 3D, flashcards, quizzes over every section, generated viva questions. |
| Search | `/search/` | One index over 2,100 structures, organs, systems, regions, terms and topics; also the header search box on every page. |
| About | `/about/` … `/contact/` | About, editorial policy, medical review policy, references policy, corrections policy, disclaimer, contact. |

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
- `content/physiology.json`, `symptoms.json`, `conditions.json`, `tests.json`, `imaging.json`,
  `procedures.json`, `medications.json`, `drug-classes.json`, `first-aid.json`, `health.json` —
  one entity per key, cross-linked by id, each with `aliases`, `urlAliases` and `references`
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
| `data/content/knowledge.json` | the whole graph in one file (206 topics, 3,511 typed links, 298 references) |
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

1. **Content graph** — `python3 tools/build-content.py` must succeed and the compiled
   `data/content/` and `site/site-meta.js` must match what is committed.
2. **Production build and smoke test** — the package is built with prerendering and served with
   the URL rules emulated; `tools/qa/smoke.mjs` drives headless Chromium through every page
   type and all entity pages (one H1, unique title and description, canonical, robots, Open
   Graph, breadcrumbs and valid JSON-LD, related links, sources, editorial block), every
   internal link (no 404s, no redirects), the header search, hub filters after hydration, the
   3D facade, the explorer (geometry, structure card, multi-structure links, locate mode), the
   sitemap index and every URL in it, the 301 rules, the raw prerendered HTML, a real 404, a
   phone-width layout check, and every page type again with the Content-Security-Policy
   enforced.

`.github/workflows/references.yml` fetches every reference URL weekly and on content changes
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
node render-previews.mjs
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
about/ … contact/     policy pages
site/                 shared shell: site.js (URLs, header, footer, facade), seo.js (metadata, JSON-LD), entity.js
                      (templates, hubs), site.css, previews/ (3D preview images), site-meta.js (generated)
data/                 built atlas (hd, lite), compiled content, ATTRIBUTION.md
content/              editable content sources
tools/                pipeline: build-content.py, package-site.py, prerender.mjs, render-previews.mjs,
                      check-references.py, release.py, qa/ (smoke test, serve.py)
vendor/three/         three.js r186 (minified core + the addons used)
ARCHITECTURE.md       entity model and how sections connect · SEO.md the search architecture
```

## Licence

Code: MIT (see `LICENSE`). Anatomy geometry and derived data: CC BY 4.0, BodyParts3D © The
Database Center for Life Science. Written descriptions in `content/`: CC BY 4.0. This is an
educational resource, not medical advice.
