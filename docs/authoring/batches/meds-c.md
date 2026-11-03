# Batch `meds-c`: New medicines C: pain, nerve pain and antidepressants (new classes needed)

Read `docs/authoring/README.md` and `docs/authoring/medications.md` first. Branch to push to: `content/meds-c`. Batch directory: `content/drafts/batches/meds-c/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `pregabalin` | Pregabalin | new class `gabapentinoids`; controlled-drug status in the UK per BNF; dependence and misuse warnings as the NHS state |
| `gabapentin` | Gabapentin | class `gabapentinoids` (create once in this batch) |
| `amitriptyline` | Amitriptyline | new class `tricyclic-antidepressants`; overdose danger as the NHS state, named without alarm |
| `duloxetine` | Duloxetine | new class `snris` ("serotonin and noradrenaline reuptake inhibitors") |
| `venlafaxine` | Venlafaxine | class `snris` (create once) |
| `mirtazapine` | Mirtazapine | new class `noradrenergic-and-specific-serotonergic-antidepressants` ("NaSSA") |
| `fluoxetine` | Fluoxetine | class `ssris` already exists; sertraline and citalopram pages exist: keep this page specific |

Every item: a complete new medicine entity (the gate fields; an `article` block of 600 to 900 words is wanted), its ledger and its second-pass report; any new drug class in the same fragment.
Do not touch `content/interactions.json`. Run `python3 tools/verification/check_batch.py` on the first finished item early.
