# Batch `meds-a`: New medicines A: common medicines whose class page already exists

Read `docs/authoring/README.md` and `docs/authoring/medications.md` first. Branch to push to: `content/meds-a`. Batch directory: `content/drafts/batches/meds-a/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `naproxen` | Naproxen | class `nsaids`; UK brands; sources NHS, BNF, MedlinePlus |
| `diclofenac` | Diclofenac | class `nsaids`; include the topical gels the NHS covers |
| `lansoprazole` | Lansoprazole | class `proton-pump-inhibitors` |
| `esomeprazole` | Esomeprazole | class `proton-pump-inhibitors` |
| `propranolol` | Propranolol | class `beta-blockers`; uses include anxiety symptoms and migraine prevention as the NHS states |
| `simvastatin` | Simvastatin | class `statins`; the known interaction themes (clarithromycin, grapefruit as the NHS states) go in cautions |
| `loratadine` | Loratadine | class `antihistamines`; the `cetirizine` page covers antihistamines in general: keep this page specific |
| `fexofenadine` | Fexofenadine | class `antihistamines` |
| `codeine` | Codeine and co-codamol | class `opioids`; alias `co-codamol`; dependence and constipation per the NHS; no doses |

Every item: a complete new medicine entity (the gate fields; an `article` block of 600 to 900 words is wanted), its ledger and its second-pass report; any new drug class in the same fragment.
Do not touch `content/interactions.json`. Run `python3 tools/verification/check_batch.py` on the first finished item early.
