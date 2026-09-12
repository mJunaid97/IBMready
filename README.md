# Human Body Platform

An open, interconnected human-body knowledge platform: an interactive 3D anatomy atlas of the
whole body, and around it a connected body of clinical and learning content in which every
page names the organs and structures it concerns. Phases 1–5 of the roadmap are live
(anatomy, physiology and terminology, symptoms and conditions, tests and imaging, procedures
and medications, first aid and health), with the knowledge graph and search of Phase 6.

**Live sections**

| Section | Path | What it is |
| --- | --- | --- |
| 3D explorer | `explorer/` | 2,234 individually selectable pieces (1,671 named structures) in 16 systems, streamed as compressed glTF; search, organs, regions, isolate, x-ray, slicing on three planes, exploded and inventory views, pinned labels, deep links, clinical topics on every structure card, study modes (identify, locate, flashcards), embeddable. |
| Body systems | `systems/` | 16 system pages: overview, functions, clinical notes, organs, every structure, live 3D, related clinical topics. |
| Organs | `organs/` | 38 organs and skeletal groups assembled from their pieces, each with a live 3D view and the conditions, tests, procedures and topics that mention it. |
| Physiology | `physiology/` | 30 topics on how the body works, with key facts, linked to systems, organs, conditions and tests. |
| Symptoms | `symptoms/` | 18 symptom pages: what it is, anatomy involved, common and less common causes, associated symptoms, red flags, related conditions and tests. Educational, not diagnostic. |
| Conditions | `conditions/` | 40 conditions: definition, affected anatomy, causes, risk factors, symptoms, signs, complications, diagnosis, treatment, prevention, when to seek care, sources. |
| Medical tests | `tests/` | 26 tests: what they measure, why ordered, how done, reading the result, limitations. |
| Imaging | `imaging/` | 7 modalities: how they work, what they show, best for / not for, dose, preparation, common uses. |
| Procedures | `procedures/` | 14 procedures step by step: indications, before, steps, after, recovery, risks, alternatives. |
| Medications | `medications/` | 24 medicines: class, uses, mechanism in the body, forms, side effects, cautions, monitoring. Education, not prescribing. |
| First aid | `first-aid/` | 16 topics (CPR and AED, heart attack, stroke, choking, bleeding, burns, fractures, sprains, fainting, seizures, heat, cold, poisoning, anaphylaxis, electric shock, wounds) following Resuscitation Council UK / ERC guidance, each with the anatomy behind it. |
| Health | `health/` | Exercise, sleep, nutrition, weight, smoking, alcohol, hydration explained through the systems they act on. |
| Terminology | `learn/terminology.html` | 149 terms in 8 categories (directions, planes, movements, regions, structures, word parts, disease processes, clinical terms) with pronunciation, atlas links and the pages that use them. |
| Study | `study/` | Identify and locate structures in 3D, flashcards, quizzes over terms, conditions, symptoms, tests, medications, procedures and first aid, and generated viva questions. |
| Search | `search/` | One index over 2,063 structures, organs, systems, regions, terms and topics; also the header search box on every page. |
| Roadmap | `roadmap/` | Phases, sections and the entity model. |

The site is plain HTML, CSS and ES modules. There is no build step for the site itself: serve
the repository root with any static server (GitHub Pages, Vercel, Netlify, `python3 -m
http.server`) and open `/`.

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

- `content/systems.json` — system overviews
- `content/organs.json` — organ groupings (match rules + aliases)
- `content/regions.json` — spatial regions
- `content/structures.json` — descriptions keyed by side-stripped structure name
- `content/terms.json` — terminology dictionary (8 categories, pronunciation, atlas links)
- `content/physiology.json`, `symptoms.json`, `conditions.json`, `tests.json`, `imaging.json`,
  `procedures.json`, `medications.json`, `first-aid.json`, `health.json` — one entity per key,
  written to the page structures in the roadmap, cross-linked by id
- `content/roadmap.json` — phases, sections, entity model

The compiler validates every cross-reference (entity ids, organ and system ids, structure
names, term ids) and **fails the build on a dangling link**, resolves structure names to atlas
ids, and precomputes reverse links so any page can show what points at it. Outputs:

| File | Contents |
| --- | --- |
| `data/content/atlas-content.json` | systems, organs (resolved to structures), regions, structure descriptions |
| `data/content/terms.json` | terminology |
| `data/content/types/<type>.json` | one file per entity type: metadata, categories, items with `anatomy` (organ / system / structure ids), `links` (typed forward links) and `backlinks` |
| `data/content/clinical.json` | compact name index plus organ / system / structure / term → entity backlinks (used by the explorer, organ, system and terminology pages) |
| `data/content/search-index.json` | flat search index over everything |
| `data/content/knowledge.json` | the whole graph in one file (182 topics, 3,247 typed links) |

To add a condition, test, medication or any other entity: add a key to the matching
`content/*.json`, reference other entities by id and structures by their atlas name, run
`python3 tools/build-content.py`, and the page, its links, the reverse links on every page it
mentions, the explorer's structure cards and the search index all update.

## Quality checks

`.github/workflows/qa.yml` runs on every push and pull request:

1. **Content graph** — `python3 tools/build-content.py` must succeed (any dangling link fails
   it) and the compiled `data/content/` must match what is committed.
2. **Smoke test** — `tools/qa/smoke.mjs` drives headless Chromium through every page type, all
   182 entity pages, every internal link, the header search, the explorer (geometry load,
   structure card, multi-structure links, locate mode) and a phone-width layout check, then
   re-visits every page type with the Content-Security-Policy enforced. It fails on any console
   error, failed request, CSP violation or horizontal overflow.

Run the same checks locally:

```sh
python3 tools/build-content.py && git diff --exit-code -- data/content
python3 -m http.server 8123 &            # serve the repository root
cd tools/qa && npm install && npx playwright install chromium && node smoke.mjs
```

## Security

There is no server-side code and no third-party script. Every page loads external ES modules
only and ships a `Content-Security-Policy` meta tag (`script-src 'self'`, `object-src 'none'`,
`base-uri 'self'`); all content is escaped before rendering, reference links must be `https://`
(checked by the compiler and at render time), and URL parameters are looked up against known
ids rather than echoed. `_headers` and `vercel.json` add `frame-ancestors`, `nosniff` and
`Referrer-Policy` on hosts that support response headers. See `SECURITY.md`.

## Deploying

The repository root is the site. Options:

- **GitHub Pages**: in the repository settings choose Pages → Source → *GitHub Actions*; the
  `Deploy to GitHub Pages` workflow publishes on every push to `main` and can be run manually
  from any branch. The site works under a project sub-path.
- **Hostinger or any Apache / LiteSpeed host**: `python3 tools/package-site.py --site-url
  https://your-domain --pretty --zip` builds a production package with clean URLs, sitemap,
  security and caching headers (`.htaccess`) and a 404 page. The `Deploy to Hostinger` workflow
  publishes that package to the `deploy` branch and a cron job on the server pulls it, which is
  how https://medical.mjunaid.net is deployed. Step by step in `DEPLOY.md`.
- **Netlify / Cloudflare Pages / Vercel**: deploy the root with no build command; `_headers`
  and `vercel.json` supply the security and caching headers.
- **Any static server**: `python3 -m http.server`, nginx, S3 + CloudFront, and so on.

## Rebuilding the atlas from source

Requires Node 18+ and Python 3.

```sh
cd tools && npm install
# 1. classify pieces into systems (needs the BodyParts3D 4.0 OBJ bundle and the 3.0 tables)
python3 classify.py --bp3d /path/to/bodyparts3d-4.0 --bp3d30 /path/to/bodyparts3d-3.0/BodyParts3D_data
# 2. build geometry (HD and lite)
node build-atlas.mjs --src /path/to/isa_BP3D_4.0_obj_99 --manifest manifest/atlas-source.json --out ../data/hd   --error 0.2 --ratio 0.45 --min-tris 400 --max-tris 120000 --jobs 4
node build-atlas.mjs --src /path/to/isa_BP3D_4.0_obj_99 --manifest manifest/atlas-source.json --out ../data/lite --error 0.6 --ratio 0.15 --min-tris 150 --max-tris 40000 --jobs 4
# 3. compile content
python3 build-content.py
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
| `?embed=1` | | bare viewport for iframes |

## Repository layout

```
index.html            home
explorer/             3D atlas (app.js, viewer.js, ui.js, search.js, styles.css)
systems/ organs/      client-rendered entity pages
learn/ study/ roadmap/
site/                 shared shell (site.css, site.js, hero.jpg)
data/                 built atlas (hd, lite), compiled content, ATTRIBUTION.md
content/              editable content sources
tools/                pipeline (classify.py, build-atlas.mjs, build-content.py, inspect-glb.mjs)
vendor/three/         three.js r186 (minified core + the addons used)
ARCHITECTURE.md       entity model and how sections connect
```

## Licence

Code: MIT (see `LICENSE`). Anatomy geometry and derived data: CC BY 4.0, BodyParts3D © The
Database Center for Life Science. Written descriptions in `content/`: CC BY 4.0. This is an
educational resource, not medical advice.
