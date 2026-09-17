# Clinical content layer

How the Clinical Content Depth specification (tests, medications, interactions) is implemented,
where each rule lives, and what an editor must do to add or change clinical content. Companion to
`ARCHITECTURE.md` (the entity graph) and `SEO.md` (the search architecture).

## 1. Entities

| Entity | File | Root key | Page | What it holds |
| --- | --- | --- | --- | --- |
| MedicalTest | `content/tests.json` | `tests` | `/tests/<slug>/` | quick summary, specimen, components (each linked to a biomarker), reference-range policy, guideline thresholds, factors, what the test cannot tell, interpretation, limitations |
| Biomarker | `content/biomarkers.json` | `biomarkers` | `/biomarkers/<slug>/` | what it is, biological role, units, why higher / lower, factors, range note, organs, tests that measure it |
| BiologicalTarget | `content/targets.json` | `targets` | `/targets/<slug>/` | kind (receptor, enzyme, ion channel, transporter, protein, cell, pathway), what it does, role, location, medicines and classes that act on it |
| Medication | `content/medications.json` | `medications` | `/medications/<slug>/` | brands by region, prescription status by region, routes, targets, pathway, indications by status and jurisdiction, typed warnings, contraindications, monitoring plan, special populations, food / alcohol / supplement interactions, condition cautions, lab effects, pharmacokinetics, sourced side effects |
| DrugClass | `content/drug-classes.json` | `classes` | `/drug-classes/<slug>/` | mechanism, targets, members, class effects, class warnings, class interactions, therapeutic-duplication rule |
| DrugInteraction | `content/interactions.json` | `interactions` (list) | medication pages, class pages, `/tools/drug-interaction-checker/` | pair records: drug–drug, drug–class, therapeutic duplication (see §4) |
| MedicationProduct | `content/products.json` | `products` | search, `/tools/drug-interaction-checker/` | brand or combination product → active ingredients (site medications, or named ingredients with an optional class) |
| Comparison | `content/comparisons.json` | `comparisons` (list) | `/compare/<slug>/` | two entities, rows drawn from their properties, where each fits, references |

The canonical medication entity is the active ingredient; brands are `brands` on the ingredient
(search and the checker resolve them) and combination products are `products.json` entries that
list their ingredients, so `Norvasc → amlodipine` and `co-codamol → paracetamol + codeine` never
create a second medical page.

## 2. Sources and jurisdictions

Every reference and every structured fact's `source` is `{title, url, section?, jurisdiction?,
type?}`. The compiler adds publisher, evidence tier, jurisdiction and source type from the host
tables (`SOURCES`, `HOST_META` in `tools/build-content.py`); an explicit `jurisdiction` or `type`
on the record wins. Jurisdictions: `GLOBAL UK US EU CANADA AUSTRALIA OTHER`. Source types:
`regulatory guidance reference literature other`.

Rules enforced at build time (the build fails otherwise):

- a warning, contraindication, indication, monitoring item, special-population note, food, alcohol
  or supplement interaction, condition caution, lab effect, clinical threshold, class warning,
  class interaction, duplication rule, product, interaction record and comparison **must cite a
  source** (`one_source`);
- a clinical threshold must carry a **jurisdiction**;
- an indication with status `unverified` **cannot be published**;
- an interaction record needs at least one evidence source, and a **severity state other than
  `NO_SEVERITY_ASSIGNED` needs `severitySource`**, the document whose wording supports it;
- a full-depth medication (`depth: "full"`) must have brands, prescription status, routes,
  targets, a pathway of at least three steps, at least one licensed indication, warnings,
  contraindications, a monitoring plan, all six special populations, condition cautions, lab
  effects, an "understand" paragraph, a technical mechanism, an alcohol entry and sourced side
  effects and pharmacokinetics (the specification's "definition of complete");
- a full-depth test must have a quick summary (type, sample, used for, measures), specimen, test
  type, components or measures, a range policy, factors, what it cannot tell, limitations,
  conditions, related tests and reasons for ordering.

Pages show the country of every structured fact as a small source marker next to it, list every
source with its section, and say in the editorial block when the sources span more than one
country ("guidance and licensed information may differ by country").

## 3. Reference ranges and thresholds

`rangePolicy` on a test is one of `laboratory` (read against the laboratory's own interval),
`threshold` (read against guideline thresholds), `descriptive` (interpreted by a clinician) or
`none`. No page stores a "normal range": the range note repeats the specification's wording
(interpret a result against the interval supplied by the laboratory that performed the test).
Clinical decision thresholds are separate records (`thresholds[]`: name, value, unit, context,
jurisdiction, source) and are never derived from a reference interval.

## 4. Interactions

`content/interactions.json` records: `id`, `type` (`drug-drug`, `drug-class`,
`therapeutic-duplication`), `a` (a medication on this site), `b` (another medication on this
site) or `bClass` (a class) or `bName` (a named medicine without a page), `perpetrator` /
`victim` where the direction matters, `mechanism` (from the specification's list, or `unknown`),
`mechanismNote`, `effect`, `sourceWording` (a paraphrase of what the official document says, never
a quotation), `severity`, `severitySource`, `action` (general management information in the
source's terms, "official information advises…", never "you should…"), `monitoring`, `onset`,
`population`, `evidence[]`, `review`, `updated`.

Severity states and how they are assigned from the cited wording:

| State | Assigned when the cited document says |
| --- | --- |
| `CONTRAINDICATED` | contraindicated / must not be used together / do not take |
| `AVOID_COMBINATION` | avoid / not recommended / do not take without advice |
| `SPECIALIST_OR_CLOSE_MONITORING` | only under specialist supervision or for specific indications with close monitoring |
| `MONITOR_OR_ADJUST` | monitor (a level, the INR, kidney function…) or adjust a dose |
| `INTERACTION_DOCUMENTED` | listed as an interaction to tell a doctor or pharmacist about, without a specific management instruction |
| `NO_SEVERITY_ASSIGNED` | the sources describe an effect but no management wording (no `severitySource` needed) |

No state is inferred from the pharmacology; where the sources disagree, both are kept as evidence
and the record is left at the weaker state with `review: needs-review` until a person resolves it.

A record with `bName` may also carry `bAgents`: the individual medicines the name stands for
(strings, or `{name, aliases}`), which become **named substances** the checker offers by name
(`"Clarithromycin or erythromycin"` → Clarithromycin, Erythromycin); a record with `bAgents: []`
is matched only through the duplicate-ingredient check. Members listed on a class page that have
no medication page become named substances too, so a class-level record and a duplication rule can
be applied to them, but only when at least one record can apply (otherwise every result would be
"no known interaction" for lack of data). The compiler also attaches to every record the
knowledge-graph links the checker shows: the two drug classes, the organs both medicines share,
the anatomy and physiology of the sourced mechanism (`MECHANISM_LINKS`) and the test, biomarker or
physiology page of each monitoring item (`MONITORING_LINKS`, then exact name or alias); every id
is validated and an item without a page stays plain text.

### The Drug Interaction Checker

`/tools/drug-interaction-checker/` (`site/checker.js` over the pure engine
`site/interaction-engine.js`, which also runs in Node for `tools/qa/engine-test.mjs`). The engine
implements the checker's API contract: `check(entries)` for `[{kind: medication | product |
substance, id}]` returns `{status, medications, pairsChecked, pairs, interactions, duplications,
noKnownInteractionPairs, summary, related, sources, warnings, sourceMetadata}`. It resolves every
entry to canonical ingredients (brand → medicine; product → ingredients; named substance), checks
**every unique pair** of entries across every pair of their ingredients (a medicine–medicine record;
a class record applied only to a member of that class, as the source states; a record that names
the substance), reports the same ingredient from two entries and therapeutic duplication within a
class whose `duplicationRule` is set, lists the pairs with no record under "No known interaction
identified in the available data" followed by "This does not prove that the combination is safe
for every person…", and never says "safe". Entries that cannot be resolved (including a drug
class, which cannot be checked as a whole) become warnings; an entry without a page marks the
result `partial` ("coverage limited"); more than ten entries is allowed with a warning.

**Display tiers.** The checker shows each record's source state as one of the specification's five
severity tiers, mapped in `STATE_TIER` without adding information:

| Source state | Display tier |
| --- | --- |
| `CONTRAINDICATED`, `AVOID_COMBINATION` | Contraindicated or avoid |
| `SPECIALIST_OR_CLOSE_MONITORING` | Major |
| `MONITOR_OR_ADJUST` | Moderate |
| *(no state)* | Minor: nothing is labelled minor by inference; the sources describe management, not grades of harm |
| `INTERACTION_DOCUMENTED`, `NO_SEVERITY_ASSIGNED` | Severity not graded (never "minor") |

Results are ordered contraindicated → major → moderate → minor → not graded, then duplication, then
no known interaction; every card carries the tier, the source state, its `severitySource`, the
sources and the review status. The tool page is indexable with a fixed canonical; `?drugs=` (or
`?drug=` from a medication page's *Check interactions* section) pre-selects medicines and is the only
place a selection lives. Analytics events carry counts and tiers only, and the page URL is reported
without its query string. The methodology page `/editorial/drug-interaction-methodology/` documents
the sources, the mapping above (rendered from the same tables), what the checker can and cannot
detect, the update schedule and the review status.

## 5. Review status

Every entity, interaction record and comparison carries `review.status`, one of `draft`,
`source-ingested`, `source-verified`, `editorial-review`, `clinical-review`, `approved`,
`published`, `needs-review`, `archived`. Only `source-verified` and later are indexable; setting
`editorial.indexRequiresClinicalReview: true` in `content/site.json` raises the bar to
`clinical-review`. The status is displayed honestly: `source-verified` renders as "Facts checked
against the cited sources; not yet clinically reviewed", and no page implies clinician review
where none occurred. Reviewer metadata (name, credentials, role, jurisdiction, scope, date) is
added under `review` when a review happens and is shown in the editorial block.

## 6. Adding content

1. **A biomarker**: add a key to `content/biomarkers.json` (name, aliases, category, summary,
   what, unit, higher, lower, factors, anatomy, tests, conditions, references). Tests whose
   `components[].biomarker` name it link to it automatically.
2. **A test at full depth**: fill `quick`, `testType`, `specimen`, `resultType`, `components`,
   `rangePolicy`, `rangeNote`, `thresholds` (with jurisdiction and source), `factors`,
   `cannotTell`, `medicinesNote`, then set `depth: "full"`; the compiler enforces the checklist.
3. **A medication at full depth**: add the structured fields listed in §1 with a source on each
   fact, `targets`, `pathway`, `brands`, `otc`, and set `depth: "full"`.
4. **An interaction**: add a record to `content/interactions.json` citing the official document
   and section; assign a severity only per the table in §4.
5. Run `python3 tools/build-content.py`; fix every error; the reference workflow verifies each URL
   after the push.

## 7. Not built on purpose

Dosing (the specification allows it to be limited in a first release; the medication page says why
it is absent), a result-explanation tool (§19 of the specification; the biomarker pages carry the
educational context it would use), indexable pair pages for interactions (§88: the checker is one
indexable tool page and no pair pages are generated), drug–food, drug–disease, drug–pregnancy,
drug–allergy and drug–lab interactions in the checker (v1 is drug–drug; the medication pages carry
food, alcohol and supplement interactions and the special-population notes), a server-side API (the
site is static; the contract is the engine module, callable from any runtime), and reviewer workflow
tooling beyond the status field. The clinician-approved validation set the specification requires
before a clinical release is not yet in place: every record remains `source-verified`.

## 8. Comprehensive tests and medications (v1.4): taxonomy, terminology, quality gates

How the *Comprehensive Clinical Tests & Medications Master Specification* is implemented. The specification asks
for an architecture that can represent any clinically meaningful test or medicine that maps to an authoritative
source, without turning the site into a programmatic-content farm; the answer is a **catalogue layer between raw
terminology and public pages**, controlled vocabularies, canonical identifiers, drug-name rules enforced at build
time, and editorial queues.

### 8.1 Files

| File | What it holds |
| --- | --- |
| `content/vocabularies.json` | Controlled vocabularies: test kinds, specimens, methods, imaging modalities, routes (§75), dosage forms (§76), regulatory statuses (§77), product types, vaccine platforms, advanced-therapy kinds, molecular scopes, the named relationship types (§80–§81), the review queues (§94) and the provenance fields (§91). Any value outside a vocabulary fails the build. |
| `content/test-taxonomy.json` | The master test taxonomy (§4): 36 public categories in four groups, and the catalogue of 837 test concepts from §5–§40, each with abbreviations, synonyms, a kind and its categories. |
| `content/medication-taxonomy.json` | The master medication taxonomy (§42–§74): 31 therapeutic areas → class groups → 536 pharmacologic class concepts with WHO ATC codes where exact, example ingredients (never synonyms) and the drug-class page each maps to. |
| `content/terminology-verification.json` | Written by `tools/terminology/*.py` after a release import: the asserted LOINC, RxNorm, ATC and EPC codes a release confirmed. Absent until a release has been run. |
| `tools/taxonomy.py` | The compiler's taxonomy layer: vocabulary validation, terminology normalisation, the drug-name rules, catalogue → page mapping, category and taxonomy data, graph edges, review queues, provenance. |
| `tools/terminology/` | The LOINC and RxNorm ingestion pipelines (§84–§85) with fixtures, unit tests and a README on sources, licensing and cadence (§102). |
| `data/content/test-categories.json`, `medication-taxonomy.json`, `review-queues.json`, `vocabularies.json` | Compiled outputs used by the category pages, the class hub, the hub facets and the editorial team. |

### 8.2 Entity model additions

**Tests** carry `kind` (laboratory, panel, measurement, physiological, imaging, diagnostic-procedure, examination,
screening-tool, pathology, genetic, microbiology — the specification's core entity types, §3), `categories[]` (any
number of the 36; the first is the breadcrumb), `specimens[]`, `methods[]`, `modality` (imaging), `canonicalName`
(required when the display name is an abbreviation such as ECG or CRP: an abbreviation never replaces canonical
identity), `abbreviations[]`, `covers[]` (catalogue concepts the page resolves), `components[].test` and `panelOf[]`
(panel ↔ component links), `monitors[]` (conditions the test tracks over time), `molecular` (scope and methods, required
for genetic tests) and `terminology.loinc[]`. A laboratory test or panel must name a specimen; a panel must list
components; an imaging study must state its modality; a genetic test must say whether it concerns a gene, a variant,
a panel or the field.

**Medications** carry `productType` (small molecule, biologic, biosimilar, monoclonal antibody, recombinant protein,
vaccine, blood product, gene therapy, cell therapy, radiopharmaceutical, contrast agent, diagnostic agent, IV fluid,
electrolyte, nutrition product…), `categories[]` (therapeutic areas), `routeIds[]` and `dosageFormIds[]` from the
vocabularies (the free-text `routes` and `forms` remain for display), `ingredientVariants[]` (salts and esters, kept
apart from synonyms), `members[]` (for umbrella entities such as insulin), `regulatory[]` (jurisdiction, status, note,
source — never presented as universal), `terminology` (`rxcui`, `atc[]`, `fdaEpc[]`) and, by product type, a
`vaccine` profile (disease targets, platform, antigen, combination, age indication, formulation, a dated schedule note
with its source), a `radiopharmaceutical` profile (isotope, targeting, diagnostic or therapeutic use, related imaging,
radiation precautions), a `contrast` profile (agent class, related imaging) or an `advancedTherapy` profile (kind,
vector, target; gene and cell therapies must carry regulatory entries with a verification date).

**Products** (`content/products.json`) declare `kind: brand | combination`; a combination must list at least two
ingredients and a free-text ingredient may not be a medicine that has a page.

### 8.3 Drug-name rules (§79) and automated validation (§95)

The build fails when an alias of one medicine is the name, alias, brand or ingredient variant of another, a drug-class
name, a class member that is a different ingredient, or a product; when a brand is mapped to more than one ingredient;
when a product is named like an ingredient; when a route, dosage form, status, product type or category is outside its
vocabulary; when a LOINC, RxCUI or ATC code is malformed; and when a test is missing its kind, specimen, modality,
components, molecular scope or canonical name as described above. Numeric thresholds still require a unit, context,
jurisdiction and source (§3 of this document). The migration of v1.2 content to these rules removed 60 "also known as"
entries that were in fact same-class medicines, class names, brands of combination products or sub-tests.

### 8.4 Catalogue → pages, category pages, quality gates (§86–§90)

A catalogued concept resolves to a page either because the page lists it in `covers` or because its name or a synonym
equals the page's name, canonical name or an alias (abbreviations alone never map). Two pages claiming one concept
fail the build; a concept matching several pages by name goes to the `potential_duplicate` queue. Concepts without a
page are listed on their category page as plain text and in the `coverage_gap` queue, and are searchable (they resolve
to the category page); they never become pages of their own.

Category pages (`/tests/categories/<category>/`) are indexable only when the category has at least two pages;
otherwise they are `noindex,follow`. The entity quality gate now also requires, for a test, its kind, purpose, what it
measures, interpretation guidance and limitations, and for a medicine its product type, brand mapping, class, uses,
mechanism, side effects, warnings, interaction information, monitoring and jurisdiction-aware regulatory status (§89–§90).

### 8.5 Terminology identifiers and provenance (§2, §91)

Codes are shown on the page as *asserted* (a plain code) or *verified* (a tick, with the release and date) — the
distinction is honest about the fact that codes entered by the editorial team have not been checked against a licensed
release until the pipeline has run. Every entity carries a `provenance` block with `source_name`, `source_version`,
`source_release_date`, `imported_at`, `last_verified_at`, `medical_reviewed_at` and `medical_reviewer_id` (the last two
filled from the review record when a review happens).

### 8.6 Knowledge-graph relationships (§80–§81)

`data/content/knowledge.json` now carries `edges[]` typed with the specification's relationship names
(`TEST_MEASURES`, `TEST_USES_SPECIMEN`, `TEST_EVALUATES_STRUCTURE`, `TEST_HELPS_EVALUATE_CONDITION`,
`TEST_MONITORS_MEDICATION`, `TEST_HAS_COMPONENT`, `TEST_PART_OF_PANEL`, `TEST_HAS_METHOD`, `TEST_HAS_REFERENCE`…,
`MEDICATION_HAS_INGREDIENT`, `MEDICATION_HAS_BRAND`, `MEDICATION_BELONGS_TO_CLASS`, `MEDICATION_HAS_ROUTE`,
`MEDICATION_TREATS_CONDITION`, `MEDICATION_MAY_CAUSE_EFFECT`, `MEDICATION_INTERACTS_WITH_MEDICATION`,
`MEDICATION_REQUIRES_MONITORING_TEST`, `MEDICATION_HAS_CONTRAINDICATION`, `MEDICATION_METABOLIZED_BY`,
`MEDICATION_EXCRETED_BY`…) and `edgeTypes[]` with counts and definitions. Clinical edges (treats, may cause, monitoring,
contraindication, metabolism, elimination) are emitted only from sourced records and carry the source URL. Test →
medicine monitoring edges are computed from the medicines' sourced monitoring plans, never authored on the test.

### 8.7 Review queues (§94)

`data/content/review-queues.json` lists, per queue, the entities to look at: `needs_source`, `needs_medical_review`,
`potential_duplicate`, `possible_synonym_error`, `possible_brand_mapping_error`, `possible_active_ingredient_error`,
`class_mapping_conflict`, `interaction_data_conflict`, `test_reference_range_risk` (numeric cut-offs in prose without a
sourced threshold record), `regulatory_status_conflict`, `deprecated_terminology`, `sparse_public_page` and
`coverage_gap`. The counts are printed by every build.

### 8.8 Hubs, URLs and search (§83, §96–§98)

The tests hub filters by any of the 36 categories and by specimen and method; the medications hub by therapeutic area,
route, dosage form and product type. New pages: `/tests/categories/` (the taxonomy), `/tests/categories/<category>/`,
`/medications/classes/` (areas → classes → medicines, with ATC codes). The specification's recommended addresses
`/medications/classes/<class>/` and `/tools/drug-interaction-checker/?drug=<ingredient>` redirect in one hop to the
canonical `/drug-classes/<class>/` and `/interactions/` (which preloads the medicine). Search resolves abbreviations,
canonical names, ingredient variants, brands and every catalogued synonym of a concept a page covers (FBC → Full blood
count, Norvasc → Amlodipine, lithium level → its category page).

### 8.9 Ingestion pipelines (§84–§85, §102)

`tools/terminology/loinc.py` and `rxnorm.py` read a licensed release from a path you supply, collapse method-, unit-
and property-specific records into canonical concepts, map specimens, methods, categories, dose forms, routes, ATC and
EPC onto the vocabularies, match candidates to the catalogue and pages, flag deprecated and obsolete records, write review
queues, and verify every code the content asserts (a wrong or deprecated code is an error). See `tools/terminology/README.md`.
Nothing is imported into pages automatically: correctness, canonical identity and provenance come before entity count.

### 8.10 Not built on purpose

Reference ranges are still never stored (§41); emergency dosing is never given (§71); no page is generated for a
catalogued concept, a class concept, a strength or a package (§86); condition, monitoring, indication and anatomy links
are not inferred from terminology (§82); and the interaction checker still derives nothing from a language model (§100).
