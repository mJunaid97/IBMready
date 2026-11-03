# Batch `meds-b`: New medicines B: diabetes and cardiovascular medicines (new classes needed)

Read `docs/authoring/README.md` and `docs/authoring/medications.md` first. Branch to push to: `content/meds-b`. Batch directory: `content/drafts/batches/meds-b/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `dapagliflozin` | Dapagliflozin | new class `sglt2-inhibitors` ("SGLT2 inhibitors"); uses: type 2 diabetes, heart failure, chronic kidney disease as the NHS/BNF state |
| `empagliflozin` | Empagliflozin | class `sglt2-inhibitors` (create once in this batch) |
| `semaglutide` | Semaglutide (Ozempic, Wegovy) | new class `glp-1-receptor-agonists`; diabetes and weight-management uses as the NHS and NICE state; brands `Ozempic`, `Wegovy`, `Rybelsus` |
| `tirzepatide` | Tirzepatide (Mounjaro) | class `glp-1-receptor-agonists` (it is a GIP/GLP-1 agonist: say so in the class summary) |
| `gliclazide` | Gliclazide | new class `sulfonylureas`; hypoglycaemia warning must name the emergency route |
| `spironolactone` | Spironolactone | new class `mineralocorticoid-receptor-antagonists`; heart failure, resistant hypertension, other uses as the NHS state |
| `ezetimibe` | Ezetimibe | new class `cholesterol-absorption-inhibitors`; often with a statin |

Every item: a complete new medicine entity (the gate fields; an `article` block of 600 to 900 words is wanted), its ledger and its second-pass report; any new drug class in the same fragment.
Do not touch `content/interactions.json`. Run `python3 tools/verification/check_batch.py` on the first finished item early.
