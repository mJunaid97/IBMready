# Batch `meds-d`: New medicines D: antibiotics and urology medicines (new classes needed)

Read `docs/authoring/README.md` and `docs/authoring/medications.md` first. Branch to push to: `content/meds-d`. Batch directory: `content/drafts/batches/meds-d/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `doxycycline` | Doxycycline | new class `tetracyclines` |
| `flucloxacillin` | Flucloxacillin | class `penicillins` exists; penicillin-allergy warning must name the emergency route |
| `co-amoxiclav` | Co-amoxiclav (Augmentin) | class `penicillins` |
| `metronidazole` | Metronidazole | new class `nitroimidazoles`; alcohol warning as the NHS states |
| `nitrofurantoin` | Nitrofurantoin | new class `urinary-antibacterials`; kidney-function caution as the NHS states |
| `trimethoprim` | Trimethoprim | class `urinary-antibacterials` or `dihydrofolate-reductase-inhibitors`: choose one, create once |
| `tamsulosin` | Tamsulosin | new class `alpha-blockers`; uses (enlarged prostate) as the NHS states |
| `finasteride` | Finasteride | new class `5-alpha-reductase-inhibitors`; the hair-loss and prostate uses and the mood and sexual side-effect warnings as the NHS/MHRA state |

Every item: a complete new medicine entity (the gate fields; an `article` block of 600 to 900 words is wanted), its ledger and its second-pass report; any new drug class in the same fragment.
Do not touch `content/interactions.json`. Run `python3 tools/verification/check_batch.py` on the first finished item early.
