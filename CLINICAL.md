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
| DrugInteraction | `content/interactions.json` | `interactions` (list) | medication pages, class pages, `/interactions/` | pair records: drug–drug, drug–class, therapeutic duplication (see §4) |
| MedicationProduct | `content/products.json` | `products` | search, `/interactions/` | brand or combination product → active ingredients (site medications, or named ingredients with an optional class) |
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

The checker (`/interactions/`, `site/interactions.js`, `noindex`) resolves every entry to canonical
ingredients (brand → product → ingredients; a class is matched through each medicine's class),
checks every pair, expands combination products, and flags therapeutic duplication (the same
ingredient from two entries, or two members of a class whose `duplicationRule` is set). It never
shows "safe": the no-result state reads "No documented interaction found in the sources currently
indexed by Anatomy Nexus" followed by "Absence from this database does not prove that no
interaction exists". Its records show their review status on every card.

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
educational context it would use), indexable pair pages for interactions (§88: the checker is
`noindex` and no pair pages are generated), and reviewer workflow tooling beyond the status field.
