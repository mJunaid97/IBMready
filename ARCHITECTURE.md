# Architecture

The platform is built around **reusable entities with explicit relationships** rather than
isolated pages. Phase 1 implements the anatomy entities; later phases add clinical entities that
reference them by id.

## Entities implemented in Phase 1

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

### Relationships available today

```
Piece ──belongs_to──▶ AnatomicalStructure ──belongs_to──▶ BodySystem
AnatomicalStructure ──is_a (parents)──▶ Concept ──is_a──▶ Concept
AnatomicalStructure ──part_of──▶ Organ ──belongs_to──▶ BodySystem
AnatomicalStructure ──located_in──▶ Region (bounding-box intersection)
AnatomicalStructure ──paired_with──▶ AnatomicalStructure (left/right)
MedicalTerm ──illustrated_by──▶ Structure | Organ | Region | System | Slice
```

Every entity has a canonical URL in the explorer (`explorer/#s=`, `#o=`, `#c=`, `#r=`, `#sys=`)
and an embeddable view (`explorer/?embed=1#…`), so any future page can show live 3D for the
anatomy it discusses with one iframe.

## How later phases plug in

Add one JSON file per entity type under `content/`, keyed by slug, with typed link fields that
hold the ids above. Proposed shapes (see `content/roadmap.json → entities` for the list):

```jsonc
// content/conditions.json
{
  "appendicitis": {
    "name": "Appendicitis",
    "definition": "…",
    "affects":      { "organs": ["large-intestine"], "structures": ["FJ3396"], "systems": ["digestive"] },
    "causes":       { "symptoms": ["abdominal-pain", "nausea", "fever"] },
    "diagnosedBy":  { "tests": ["cbc"], "imaging": ["ultrasound", "ct"] },
    "treatedBy":    { "procedures": ["appendectomy"], "medications": ["antibiotics"] },
    "references": ["…"]
  }
}
```

Rules that keep the graph consistent:

1. **Ids are stable slugs or dataset ids**; never store display names as links.
2. **Links are typed** (`affects.organs`, `diagnosedBy.tests`), so a page can render "Related"
   sections generically and a knowledge graph can be derived by walking every link field.
3. **Reverse links are computed, not authored**: the compiler (`tools/build-content.py`) can
   emit, for each organ, the conditions that affect it, the tests that image it, and so on.
4. **Anatomy stays the backbone**: any clinical entity must link to at least one organ, structure
   or system so it appears in the explorer's card and in the organ and system pages.
5. **Content is data**: pages are templates over JSON; adding a section means adding a JSON
   file, a compiler step and a page template, never hand-written pages.

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

`site/site.js` renders the shared header (sections from the roadmap; planned ones link to
`roadmap/#section`) and loads the data once per page. Pages under `systems/`, `organs/`,
`learn/`, `study/` and `roadmap/` are client-rendered templates over the compiled JSON, so they
work from any static host and can be moved to a framework (Astro, Next) later without changing
the data.
