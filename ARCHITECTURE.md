# Architecture

The platform is built around **reusable entities with explicit relationships** rather than
isolated pages. Phase 1 implements the anatomy entities; Phases 2–5 add the clinical and
learning entities, which reference the anatomy by id; Phase 6's knowledge graph and search are
derived from those links by the compiler rather than authored.

## Anatomy entities (Phase 1)

| Entity | Id | Source of truth | Compiled to | Key fields |
| --- | --- | --- | --- | --- |
| **AnatomicalStructure** | piece file id of its first mesh, e.g. `FJ3365` | `tools/manifest/atlas-source.json` (from BodyParts3D tables via `tools/classify.py`) | `data/{hd,lite}/atlas.json → structures[]` | `name`, `concept` (FMA id), `system`, `side`, `pair` (index of the other side), `pieces[]`, `parents[]` (concept indices) |
| **Piece** (mesh) | BodyParts3D file id, e.g. `FJ3365` | same | `atlas.json → pieces[]`; geometry in `glb/<system>.glb` (node name = id) | `structure`, `bbox` (mm, glTF y-up), `tris` |
| **Concept** | FMA id | BodyParts3D `isa_element_parts.txt` | `atlas.json → concepts[]` | `name`; pieces reference concepts through `parents` |
| **BodySystem** | slug, e.g. `skeleton` | `content/systems.json` | `atlas.json → systems[]` (counts, colour, file) and `atlas-content.json → systems` | `overview`, `functions[]`, `clinical[]`, `related[]`, `keyStructures[]` |
| **Organ** | slug, e.g. `liver` | `content/organs.json` (match rules) | `atlas-content.json → organs[]` with resolved `structures[]` | `system`, `region`, `summary`, `aliases[]` |
| **Region** | slug, e.g. `thorax` | `content/regions.json` (mm bands) | `atlas-content.json → regions[]` with resolved `structures[]` | `summary` |
| **StructureContent** | structure id | `content/structures.json` (keyed by side-stripped name) + templates in `tools/build-content.py` | `atlas-content.json → structures{}` | `summary`, `function`, `clinical`, `organ`, `regions[]` |
| **MedicalTerm** | slug | `content/terms.json` | `data/content/terms.json` | `category`, `definition`, `plain`, `example`, `opposite`, `related[]`, `atlas` link |
| **Quiz / Flashcard** | runtime | generated from structures, regions and terms | — | scope = visible systems or a region |

## Clinical and learning entities (Phases 2–5)

One JSON file per type under `content/`, keyed by slug. Every entry carries an `anatomy` block
(organ ids, system ids, structure *names*, which the compiler resolves to atlas ids), typed link
fields holding ids of other entities, `terms` (term ids), `related` (same type, or any type: the
compiler routes cross-type ids into the matching typed field) and `references`.

| Entity | File | Page structure | Typed links |
| --- | --- | --- | --- |
| **PhysiologyTopic** (30) | `content/physiology.json` | summary, body, key facts | `conditions`, `tests`, `imaging`, `procedures`, `medications`, `symptoms` |
| **Symptom** (18) | `content/symptoms.json` | what, anatomy, common / less common causes, associated, urgent, investigations | `associated` (symptoms), `conditions`, `tests`, `imaging`, `procedures`, `medications` |
| **Condition** (40) | `content/conditions.json` | definition, overview, anatomy, causes, risk factors, symptoms, signs, complications, diagnosis, treatment, prevention, seek care | `symptoms`, `tests`, `imaging`, `procedures`, `medications`, `physiology` |
| **MedicalTest** (31) | `content/tests.json` | quick summary, why ordered, components → biomarkers, how done, preparation, results (range policy, guideline thresholds), factors, cannot tell, limitations | `conditions`, `symptoms`, `physiology`, `biomarkers` (implied by components) |
| **Biomarker** (30) | `content/biomarkers.json` | what it is, units, why higher / lower, factors, range note | `tests`, `conditions`, `physiology`, `medications` |
| **BiologicalTarget** (22) | `content/targets.json` | kind, what it does, role, location | `medications`, `drugClasses`, `physiology`, `conditions`, `biomarkers` |
| **ImagingStudy** (7) | `content/imaging.json` | how it works, shows, best for / not for, dose, preparation, common uses | `conditions`, `symptoms`, `physiology` |
| **Procedure** (14) | `content/procedures.json` | what, why, before, steps, after, recovery, risks, alternatives | `conditions`, `symptoms`, `tests`, `imaging`, `medications`, `physiology` |
| **Medication** (28) | `content/medications.json` | class, brands and prescription status by region, uses by status and jurisdiction, mechanism (plain and technical), pathway, targets, side effects, warnings, contraindications, interactions, monitoring, special populations, condition cautions, lab effects, pharmacokinetics | `conditions`, `symptoms`, `tests`, `biomarkers`, `targets`, `procedures`, `physiology`, `drugClass` |
| **DrugClass** (24) | `content/drug-classes.json` | mechanism, targets, members, class effects, class warnings, class interactions, duplication rule | `medications`, `targets`, `conditions`, `physiology` |
| **DrugInteraction** (69), **MedicationProduct** (14), **Comparison** (7) | `content/interactions.json`, `products.json`, `comparisons.json` | see `CLINICAL.md` | medication ↔ medication / class / named substance (`bAgents`); product → ingredients; comparison → two entities; every interaction record carries compiled links to the classes, organs, physiology, tests and biomarkers it concerns |
| **FirstAidTopic** (16) | `content/first-aid.json` | recognise, steps, children, don't, call for, why (anatomy) | `conditions`, `symptoms`, `physiology`, `medications`, `tests` |
| **HealthTopic** (7) | `content/health.json` | body, effects per system, guidance | `conditions`, `symptoms`, `physiology`, `tests` |
| **MedicalTerm** (149) | `content/terms.json` | definition, plain, example, pronunciation, opposite, related, atlas link | `atlas` → structure / organ / region / system / slice |

### Relationships

```
Piece ──belongs_to──▶ AnatomicalStructure ──belongs_to──▶ BodySystem
AnatomicalStructure ──is_a (parents)──▶ Concept ──is_a──▶ Concept
AnatomicalStructure ──part_of──▶ Organ ──belongs_to──▶ BodySystem
AnatomicalStructure ──located_in──▶ Region (bounding-box intersection)
AnatomicalStructure ──paired_with──▶ AnatomicalStructure (left/right)
MedicalTerm ──illustrated_by──▶ Structure | Organ | Region | System | Slice

<any clinical entity> ──concerns (anatomy)──▶ Organ | BodySystem | AnatomicalStructure
Symptom ──suggests──▶ Condition        Condition ──causes──▶ Symptom
Condition ──diagnosed_by──▶ MedicalTest | ImagingStudy
Condition ──treated_by──▶ Procedure | Medication
Procedure ──uses──▶ MedicalTest | ImagingStudy | Medication
MedicalTest ──has_component──▶ Biomarker ──measured_by──▶ MedicalTest ; Biomarker ──associated_with──▶ Organ
Medication ──belongs_to──▶ DrugClass ──acts_on──▶ BiologicalTarget ◀──acts_on── Medication
BiologicalTarget ──located_in──▶ Organ | BodySystem ; ──participates_in──▶ PhysiologyTopic
Medication ──indicated_for (status, jurisdiction)──▶ Condition ; ──has_caution_with──▶ Condition
Medication ──monitored_by──▶ MedicalTest | Biomarker ; ──affects──▶ Biomarker | MedicalTest (lab effects)
Medication ──interacts_with──▶ Medication | DrugClass | Substance ; MedicationProduct ──contains──▶ Medication
PhysiologyTopic ──explains──▶ BodySystem | Organ ; ──goes_wrong_as──▶ Condition
FirstAidTopic / HealthTopic ──concerns──▶ Condition | Symptom | PhysiologyTopic
<any entity> ──uses_term──▶ MedicalTerm
```

Reverse edges are never authored. `tools/build-content.py` walks every link field and emits
`backlinks` on each entity plus `organs / systems / structures / terms → {type: [ids]}` maps,
so an organ page lists every condition, test, procedure or first-aid topic that mentions it, the
explorer's structure card shows the topics for the selected structure (directly or through its
organ), and the terminology page shows where each term is used. Any unknown id, organ, system,
structure name or category fails the build: the graph never has a dangling edge.

Every entity has a canonical URL (`<type-dir>/<page>.html?id=<slug>`, registry in
`site/site.js → TYPES`) and every anatomy entity has one in the explorer (`explorer/#s=`, `#o=`,
`#c=`, `#r=`, `#sys=`, multi-structure `#s=a,b,c`) plus an embeddable view (`?embed=1#…`), so
each clinical page opens with live 3D of the anatomy it discusses.

### Rules that keep the graph consistent

1. **Ids are stable slugs or dataset ids**; display names are never used as links (structure
   names are accepted in source files only because the compiler resolves and validates them).
2. **Links are typed**, so pages render "Related topics" generically (`site/entity.js →
   relatedGroups`) and the search index and knowledge graph are derived by walking link fields.
3. **Reverse links are computed, not authored.**
4. **Anatomy stays the backbone**: every clinical entity names at least one organ, structure or
   system, which is what makes it appear in the explorer and on the organ and system pages.
5. **Content is data**: adding an entry means adding a key to a JSON file and running the
   compiler; adding a type means one JSON file, one row in the compiler's `TYPES` table, one
   template function in `site/entity.js` and two one-line HTML shells.
6. **Educate, never diagnose**: symptom pages explain reasoning and red flags, medication pages
   explain mechanism and cautions, first-aid pages follow published guidelines and say when to
   call for help; every such page carries the disclaimer for its type.

### Clinical layer

The structured clinical fields (components, thresholds, indications, warnings, contraindications,
monitoring, populations, interactions, lab effects) are data with a source on every fact, validated
by the compiler and rendered by `site/entity.js` in the order the specification prescribes; the
Drug Interaction Checker (`tools/drug-interaction-checker/`, `site/checker.js` over the pure engine
`site/interaction-engine.js`) and the comparisons (`site/compare.js`) read the compiled
`data/content/interactions.json` and `comparisons.json`. `CLINICAL.md` documents the model, the
source rules, the severity states and their display tiers, the checker's API contract and the
review-status model.

## Rendering pipeline (explorer)

- `tools/classify.py` → systems, structures, concepts, pairs (from BodyParts3D 4.0 is-a tables
  and 3.0 part-of tree, with the FMA ontology for typing).
- `tools/build-atlas.mjs` → parse OBJ, weld, fix winding, simplify per piece with meshoptimizer
  under an absolute error bound (0.2 mm HD / 0.6 mm lite), compute normals, write one GLB per
  system, compress with gltfpack (14-bit positions, 8-bit normals, EXT_meshopt_compression).
- `explorer/viewer.js` → one `THREE.BatchedMesh` per system (16 draw calls for the whole body),
  per-piece colour and alpha in the batching colour texture, two-pass opaque/ghost rendering for
  x-ray, a see-through highlight pass for selections, GPU id-buffer picking, global clipping
  plane for slices, radial and inventory explode layouts, on-demand rendering.
- `explorer/ui.js` → navigator (systems, organs, regions), search (`search.js`), structure card,
  toolbar, labels, study mode, keyboard shortcuts, URL state.

## Site shell

`site/site.js` renders the shared header (primary sections, a "More" menu and the header search
box with typeahead over `data/content/search-index.json`) and footer (policy links, attribution,
version), holds the entity type registry (`TYPES`, with the SEO descriptor of each type), the URL
helpers (`paths`, `link`, `entityLink`, `anyLink`, `canonical`; clean trailing-slash URLs when
`site/config.js` says `prettyUrls`, query URLs otherwise), the click-to-load 3D facade, and the
cached data loaders (`loadData`, `loadClinical`, `loadType`, `loadSearchIndex`). `site/seo.js`
writes the page metadata: title pattern, description, canonical, robots, Open Graph and Twitter
tags, and the JSON-LD graph (Organization, WebSite with SearchAction, BreadcrumbList, MedicalWebPage
with citations, and the entity node). `site/entity.js` is the generic renderer for every knowledge
section: `renderIndex(type)` (hub: intro, start-here pages, category filters, A–Z card groups,
body systems, other sections; `CollectionPage` + `ItemList` schema) and `renderDetail(type)`
(breadcrumbs, type-specific template, facade, anatomy, related topics, terms, structured sources,
editorial block; per-type schema). Section directories contain only two shells that call those
functions through `site/section.js`. `anatomy/`, `systems/`, `organs/`, `medical-terms/`,
`study/`, `search/` and `roadmap/` have their own page scripts over the same data; the policy
pages are hand-written HTML with `site/page.js`.

**Two rendering modes.** In development every page renders in the browser from the compiled
JSON. In production `tools/package-site.py --pretty --prerender` runs `tools/prerender.mjs`,
which opens each page in headless Chromium and writes the finished document to
`dist/<path>/index.html` with `data-prerendered` on `<body>`. The same scripts then run in
hydration mode (`PRERENDERED` in `site/site.js`): they bind interactivity (menu, search, theme,
hub filters, facade) and never redraw content, so crawlers and users get the same HTML, and the
model, JSON and rendering work stay off the critical path.

The explorer receives `data/content/clinical.json` and uses it for the "Clinical topics" block on
the structure card, for topic results in its search box (which navigate to the page, in the
parent window when embedded) and nothing else, so it stays a fast, self-contained viewer. In
embed mode it declares itself noindex; its canonical is always `/explorer/`.

## SEO and credibility layer

Summarised here; `SEO.md` has the full map against the specification.

- **Identity**: `content/site.json` → `site/site-meta.js` (brand, URL, editorial fields,
  verification codes, counts).
- **URLs**: one canonical trailing-slash URL per entity; `urlAliases` on every entity are
  validated for uniqueness and compiled into `data/content/aliases.json`, which becomes the
  one-hop 301 table in `.htaccess` (with query-URL, `index.html`, trailing-slash and retired-path
  rules). `tools/qa/serve.py` emulates the rules for local testing.
- **Anatomy articles**: `content/anatomy.json` enriches an organ with title, descriptor, intro, key
  facts, sections, structures and references; only organs with an article are indexable.
- **Drug classes**: `drugClass` on a medication is a typed link that yields breadcrumbs
  (Medications › Class › Medicine), backlinks and `Drug.drugClass` schema.
- **Biomarkers and drug targets**: two further entity types (`/biomarkers/`, `/targets/`) that tie
  tests to the substances they measure and medicines to what they act on; comparisons live at
  `/compare/<slug>/`; the Drug Interaction Checker at `/tools/drug-interaction-checker/` is one
  indexable page (its `?drugs=` states canonicalise to it) and generates no pair pages; the
  clinical tools hub is `/tools/` and the checker's methodology `/editorial/drug-interaction-methodology/`.
- **Schema for medicines**: `Drug` nodes carry active ingredient, class, mechanism, routes,
  prescription status, contraindications, interacting drugs, food / alcohol / pregnancy /
  breastfeeding warnings and a link to the prescribing information; tests carry their range note
  as `normalRange` and their biomarkers.
- **References**: title, URL, publisher, evidence tier (host table in the compiler) and date
  checked; rendered as structured sources and as `citation` in the page schema;
  `tools/check-references.py` verifies availability in CI.
- **Dates**: `_updated` per content file (and optional `updated` per entity) feeds the visible
  "Last updated", `dateModified` and the sitemap `lastmod`.
- **Quality gate**: `seo.index` per entity (lead, body length, references, relationships);
  failing pages ship `noindex,follow` and stay out of the sitemaps.
- **Sitemaps**: `sitemap.xml` index → `sitemaps/<section>.xml`, canonical indexable URLs only.
- **Previews**: `site/previews/<view>.jpg` rendered by `tools/render-previews.mjs` from the
  explorer for every organ, system and structure view (`site/preview-name.js` names them); used
  by the facade and as `og:image`.
