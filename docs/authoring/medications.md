# Medicines: new pages

Model entity: `docs/authoring/templates/medication.example.json` (the real `cetirizine` entity). Also read `tramadol`, `lisinopril`
and `amlodipine` in `content/medications.json`. Collection name in a fragment: `medications`; new drug classes go in `drug-classes`
(model: `content/drug-classes.json`, for example `statins` and `ssris`). Read `docs/authoring/README.md` first: the evidence protocol,
the "describe, do not instruct" rule and the **no doses, dosing schedules or cut-offs in prose** rule apply with full force to medicines.

## What a medicine page needs (the publishing gate)

The compiler refuses to publish a medicine page without: `productType`, `brands`, a `drugClass` (an existing class id, or a class you
add in the same fragment), `usedFor` or `indications`, `howItWorks`, `sideEffects` (`common` and/or `serious`), `cautions`, something on
interactions (`cautions`, `alcohol` or `foodInteractions`), `monitoring`, and `regulatory` (jurisdiction-aware status with a source). Use the
simple string-list style of `cetirizine` (strings in `usedFor`, `cautions`, `sideEffects`). Do **not** use the structured sourced
`indications`, `warnings`, `conditionCautions`, `labEffects` or `monitoringPlan` records unless you can give every item a full source
(`{"title", "url", "section"}` plus jurisdiction); the compiler fails a structured item without one.

| Field | Rules |
| --- | --- |
| `name` | The name people search ("Naproxen"), or "Naproxen and other X" when the page covers a group like `cetirizine` does. |
| `summary` | 1 to 3 sentences: what it is, what it is for, the main caution. Never "safe". Name the emergency/urgent route if the medicine has an emergency warning sign. |
| `aliases`, `urlAliases` | Search names (brand names go here and in `brands`). A slug already used as an id or alias elsewhere is an error. |
| `category` / `categories` | a therapeutic-area id from `content/medication-taxonomy.json` (`areas[].id`): cardiovascular, anticoagulants-antiplatelets-haematology, diabetes, thyroid-adrenal-hormonal, gastrointestinal, respiratory, allergy, pain-analgesia, neurology, psychiatry, antibiotics, antivirals, antifungals, rheumatology-immunology, oncology, dermatology, ophthalmic, ent, reproductive-gynaecology-obstetric, urology-mens-health, bone-osteoporosis, vaccines, biologics and others in that file. |
| `class` | the class in words; `drugClass` (the class page id). |
| `usedFor` | short sentences, each a use the sources state (UK licensed or guideline use first). |
| `howItWorks` | 2 to 4 sentences in plain words. |
| `anatomy` | `{"organs": [...], "systems": [...]}` from the valid id lists in `docs/authoring/conditions.md`. |
| `onset` | a sentence on how quickly it works, if the sources say. |
| `sideEffects` | `{"common": [...], "serious": [...]}`; each a sentence; `serious` items say who to contact (999 / A&E for emergencies, NHS 111 or the GP promptly otherwise). |
| `cautions` | who needs care or advice (kidney, liver, pregnancy, breastfeeding, older people, other medicines), described not instructed. |
| `monitoring` | what the prescriber checks, or that nothing routine is needed. |
| `conditions`, `symptoms`, `tests`, `procedures`, `physiology`, `related` | ids of existing pages that fit (lists in `conditions.md`). `related` may name other medicines. |
| `productType` | `small-molecule` for a typical tablet or capsule (see `data/content/vocabularies.json`, `productTypes`). |
| `routeIds`, `dosageFormIds` | ids from `data/content/vocabularies.json` (`routes`, `dosageForms`), for example `oral`, `tablet`, `capsule`, `solution`. |
| `brands` | `{"UK": ["Brand"], "US": ["Brand"]}` as the sources name them (generic UK names first). |
| `ingredientVariants` | salt or ester names ("diclofenac sodium"). |
| `regulatory` | `[{"jurisdiction": "UK", "status": "prescription", "source": {"title": "NHS: ...", "url": "https://..."}}]`; `status` is one of `prescription`, `otc`, `pharmacy`, `controlled` (vocabularies `regulatoryStatuses`); give a UK entry, and a US entry only if you retrieved the FDA/MedlinePlus status. Status is never universal. |
| `terminology` | optional `{"rxcui": "...", "atc": ["..."]}`; leave it out unless you retrieved the codes (ATC from the WHO index, RxCUI from RxNav). Never guess a code. |
| `regimenNote` | optional one line naming the forms; **no doses**. |
| `references` | at least 4, from at least 2 publishers, one official: NHS medicines page, BNF, MedlinePlus, NICE, MHRA/emc patient leaflet. |
| `article` | optional in-depth block (format in `conditions.md`): 4 to 6 sections of what a patient reads in the leaflet, explained: "What is X used for?", "How does X work?", "Side effects", "Taking X with other medicines or alcohol", "Who needs extra care?"; FAQs. Aim for 600 to 900 words. |

## A new drug class

Fields as in `content/drug-classes.json#statins`: `name`, `summary`, `mechanism`, `members` (names), `cautions`, `classInteractions`,
`classWarnings`, `anatomy`, `references`, `urlAliases`. Keep it to what the same sources support; a class page is shorter than a medicine page.

## Interactions and the Drug Interaction Checker

Do **not** add interaction records (`content/interactions.json`). In the medicine page describe interaction themes in `cautions` ("other
medicines that raise bleeding risk", "alcohol adds to drowsiness"), citing the source. The maintainer wires interaction records separately.

## Checks

`python3 tools/verification/check_batch.py <fragment.json>`. Typical errors: an unknown vocabulary id (read the message, it lists the valid ids),
a missing field from the gate above, a class id that does not exist, a URL alias clash.
