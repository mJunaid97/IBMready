# Terminology ingestion pipelines

The clinical layer of Anatomy Nexus is designed around canonical terminology identifiers (specification §2, §84, §85, §102):
**LOINC** for laboratory and clinical observations, **RxNorm** (RxCUI) for medicines, with **WHO ATC** and the **FDA
Established Pharmacologic Class** as classification mappings. Terminology releases are large (LOINC alone is more than
100,000 concepts) and licensed, so they are never hard-coded into content or committed to the repository. Instead:

1. every test, biomarker, medicine and drug class in `content/` may carry a `terminology` block with the codes the editorial
   team asserts (`loinc`, `rxcui`, `atc`, `fdaEpc`);
2. the compiler (`tools/build-content.py` → `tools/taxonomy.py`) validates the format of every code and shows each one on
   the page as **asserted** until it is confirmed;
3. the pipelines here read a release you have downloaded under its licence, verify every asserted code against it, turn the
   release into canonical *candidate* concepts matched to the site's catalogue (`content/test-taxonomy.json`) and medicines,
   and write review queues; with `--write-verification` they record the confirmed codes in
   `content/terminology-verification.json`, which the compiler uses to mark codes **verified** (with the release and date).

Nothing becomes a public page automatically. A candidate concept is written up by a person and must pass the compiler's
quality gate (§86–§90); package-level, unit-specific and method-specific duplicates stay database-only by construction
(they are collapsed into one canonical concept with several variant codes).

## Running

```sh
# LOINC (LoincTable/Loinc.csv and, optionally, AccessoryFiles/PanelsAndForms/PanelsAndForms.csv from the release zip)
python3 tools/terminology/loinc.py --loinc-csv /path/to/Loinc.csv --panels /path/to/PanelsAndForms.csv --release 2.80 --write-verification

# RxNorm (the rrf/ directory of a full monthly release: RXNCONSO.RRF, RXNREL.RRF)
python3 tools/terminology/rxnorm.py --rrf-dir /path/to/rrf --release 2026-09 --write-verification

# then recompile so the pages show the verified codes
python3 tools/build-content.py
```

Outputs (git-ignored, derived from licensed releases): `data/terminology/loinc-candidates.json`, `loinc-queues.json`,
`rxnorm-candidates.json`, `rxnorm-queues.json`. Committed: `content/terminology-verification.json`.

Exit status 1 means a verification problem (an asserted code missing from the release, deprecated, discouraged, suppressed, or
naming a different concept than the page it is on); the message names the entity so it can be corrected.

## What each pipeline does

| Step (§84 / §85) | LOINC (`loinc.py`) | RxNorm (`rxnorm.py`) |
| --- | --- | --- |
| ingest | `Loinc.csv` rows (official column names) | `RXNCONSO.RRF`, `RXNREL.RRF` (SAB = RXNORM, ATC, MED-RT only) |
| canonical id | LOINC_NUM | RxCUI of the ingredient (TTY = IN) |
| synonyms / abbreviations | long common name, short name, display name, related names | precise ingredients (salts, esters) as variants; brand names (BN) via `tradename_of` |
| panels / components | SCALE `-` + PANEL class, `PanelsAndForms.csv` links | combinations (MIN) with `has_part` ingredients |
| specimen / method | SYSTEM → specimen vocabulary, METHOD_TYP → method vocabulary | dose forms (DF via clinical drugs) → dosage-form and route vocabularies |
| classification | LOINC CLASS → the 36 test categories | ATC atoms sharing the ingredient RxCUI; MED-RT `has_epc` / `has_moa` / `has_pe` where present |
| dedupe variants | one concept per COMPONENT + SYSTEM; property/method/unit variants listed under it | one ingredient per RxCUI; branded and packaged concepts resolve to it |
| obsolete | STATUS DEPRECATED / DISCOURAGED | SUPPRESS = O / E |
| queues | unmatched, deprecated_terminology, sparse; verification problems | unmatched_ingredient, possible_brand_mapping_error; verification problems |

Conditions, medications-to-monitor, anatomy, indications, interaction providers and label references are deliberately **not**
mapped by the pipelines: they are clinical claims and are added by the editorial team with a source (§82).

## Licensing and cadence (§102)

- **LOINC** — © Regenstrief Institute, Inc. and the LOINC Committee; free under the LOINC licence with registration and
  attribution; the table itself may not be redistributed in modified form. Two releases a year (February, August).
- **RxNorm** — U.S. National Library of Medicine; the RxNorm files are free of charge under the UMLS Metathesaurus licence
  terms for RxNorm; some source vocabularies inside the full release are restricted, which is why only SAB = RXNORM, ATC and
  MED-RT rows are read. Monthly full releases, weekly updates.
- **WHO ATC/DDD** — © WHO Collaborating Centre for Drug Statistics Methodology; the index is free to consult and cite,
  bulk redistribution needs permission. Annual release.
- **FDA EPC** — public domain (FDA pharmacologic class resources, distributed with MED-RT).
- **DailyMed / official labelling** — public; cited per fact on medication pages, never bulk-imported.

Review licensing, redistribution rights, attribution, API limits and update cadence before adding a new source, and keep
the candidate files out of the repository (they are in `.gitignore`).

## Tests

```sh
python3 -m unittest tools.terminology.test_terminology
```

The unit tests run on small synthetic fixtures in `fixtures/` that follow the official file formats; they are not release data.
