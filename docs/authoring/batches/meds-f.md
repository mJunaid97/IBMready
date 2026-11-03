# Batch `meds-f`: New medicines F: reproductive health, antivirals, antifungals and immune medicines (new classes needed)

Read `docs/authoring/README.md` and `docs/authoring/medications.md` first. Branch to push to: `content/meds-f`. Batch directory: `content/drafts/batches/meds-f/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `sildenafil` | Sildenafil | new class `pde5-inhibitors`; erectile dysfunction and pulmonary hypertension uses as the NHS states; nitrate interaction caution must be explicit; brands `Viagra`, `Revatio` |
| `tadalafil` | Tadalafil | class `pde5-inhibitors` (create once in this batch); brands `Cialis` |
| `combined-pill` | Combined oral contraceptive pill | new class `combined-hormonal-contraceptives`; blood-clot warning must name the emergency route; use the NHS contraception pages |
| `aciclovir` | Aciclovir | new class `nucleoside-antivirals`; cold sores, genital herpes, shingles, chickenpox uses as the NHS states |
| `fluconazole` | Fluconazole | new class `azole-antifungals`; thrush and other uses as the NHS states; pregnancy caution as the NHS states |
| `hydroxychloroquine` | Hydroxychloroquine | new class `antimalarial-dmards` ("hydroxychloroquine and related disease-modifying drugs"); the eye-monitoring warning as the NHS/MHRA/RCOphth state |
| `methotrexate` | Methotrexate | new class `antimetabolite-dmards`; weekly-dosing error warning must be named (without giving a dose) as the NHS/MHRA state; monitoring blood tests |
| `montelukast` | Montelukast | new class `leukotriene-receptor-antagonists`; the MHRA neuropsychiatric warning as the sources state |

Every item: a complete new medicine entity (the gate fields; an `article` block of 600 to 900 words is wanted; an article under 600 words is acceptable if
the rest could not be sourced), its ledger and its second-pass report; any new drug class in the same fragment.
Do not touch `content/interactions.json`: if your medicine's name appears there as a plain substance (`grep -n 'name' content/interactions.json`), say so in
`BATCH-REPORT.md`. Run `python3 tools/verification/check_batch.py` on the first finished item early. Use your search budget: the first medicines batch
finished 8 pages in about 135 of 200 searches. Skip an id that already exists in `content/medications.json` or in another `meds-*` batch.
