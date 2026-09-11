# Human Body Platform

An open, interconnected human-body knowledge platform. **Phase 1** (this repository) is the
foundation: an interactive 3D anatomy atlas of the whole body plus the entity data model that
later sections (physiology, symptoms, conditions, tests, imaging, procedures, medications,
first aid, health, study tools) plug into.

**Live pieces**

| Section | Path | What it is |
| --- | --- | --- |
| 3D explorer | `explorer/` | 2,234 individually selectable pieces (1,671 named structures) in 16 systems, streamed as compressed glTF; search, organs, regions, isolate, x-ray, slicing on three planes, exploded and inventory views, pinned labels, deep links, study mode, embeddable. |
| Body systems | `systems/` | 16 system pages: overview, functions, clinical notes, organs, every structure, live 3D. |
| Organs | `organs/` | 39 organs and skeletal groups assembled from their pieces, each with a live 3D view. |
| Terminology | `learn/terminology.html` | 118 anatomical and medical terms in 6 categories, linked into the atlas. |
| Study | `study/` | Identify-the-structure quiz in 3D, flashcards, terminology quiz. |
| Roadmap | `roadmap/` | Phases, planned sections and the entity model. |

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
- `content/terms.json` — terminology dictionary
- `content/roadmap.json` — phases, sections, entity model

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
| `?study=quiz\|cards&sys=` | `explorer/?study=quiz&sys=muscles` | open study mode |
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
