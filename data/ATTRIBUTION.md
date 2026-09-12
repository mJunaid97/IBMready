# Attribution and data licences

## BodyParts3D (geometry, structure names, anatomical hierarchy)

The 3D geometry in `data/hd/glb`, `data/lite/glb`, the piece and structure lists in
`atlas.json`, and the concept hierarchy are derived from **BodyParts3D** release 4.0
(is-a tree, `isa_BP3D_4.0_obj_99`).

> BodyParts3D, © The Database Center for Life Science, licensed under
> [CC Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
> https://dbarchive.biosciencedbc.jp/en/bodyparts3d/ · DOI 10.18908/lsdba.nbdc00837-000

Please cite: Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K.
*BodyParts3D: 3D structure database for anatomical concepts.* Nucleic Acids Res.
2009;37(Database issue):D782–5. https://doi.org/10.1093/nar/gkn613

Changes made: meshes were welded, re-oriented to glTF conventions (y up), simplified with
meshoptimizer under a 0.2 mm (HD) or 0.6 mm (lite) error bound, and packed into per-system
glTF files with quantised, meshopt-compressed attributes. Pieces were grouped into systems,
organs and regions by rules described in `tools/classify.py` and `content/`.

Release 3.0 tables (`conventional_part_of.txt`, FMA.csv) were used during classification to
derive organ-system membership.

## Foundational Model of Anatomy (names, concept ids)

Structure names and FMA identifiers come from the Foundational Model of Anatomy ontology
(University of Washington), distributed with BodyParts3D.

## three.js

`vendor/three/` contains three.js r186 (MIT), see `vendor/three/LICENSE`. gltfpack /
meshoptimizer (MIT) are used at build time.

## Written content

System overviews, organ summaries, structure descriptions and the terminology dictionary in
`content/` were written for this project and are released under CC BY 4.0. They are
educational summaries and not medical advice.
