# Batch `meds-e`: New medicines E: migraine, nausea, bowels and sleep (new classes needed)

Read `docs/authoring/README.md` and `docs/authoring/medications.md` first. Branch to push to: `content/meds-e`. Batch directory: `content/drafts/batches/meds-e/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `sumatriptan` | Sumatriptan | new class `triptans`; uses as the NHS states; cardiovascular cautions as the NHS states |
| `ondansetron` | Ondansetron | new class `5-ht3-receptor-antagonists`; uses (nausea and vomiting with chemotherapy, after surgery) as the NHS states |
| `metoclopramide` | Metoclopramide | new class `dopamine-antagonist-antiemetics`; the MHRA restriction on short-term use only as the sources state |
| `loperamide` | Loperamide | new class `antimotility-agents`; uses and when not to use it as the NHS states |
| `lactulose` | Lactulose | new class `osmotic-laxatives`; also covers macrogol only if one source page covers both |
| `diazepam` | Diazepam | new class `benzodiazepines`; controlled-drug status in the UK per the NHS/BNF; dependence and driving warnings as the NHS states |
| `zopiclone` | Zopiclone | new class `z-drugs` ("Z-drugs"); controlled-drug status as sourced; short-term use and driving warnings as the NHS states |

Every item: a complete new medicine entity (the gate fields; an `article` block of 600 to 900 words is wanted; an article under 600 words is acceptable if
the rest could not be sourced), its ledger and its second-pass report; any new drug class in the same fragment.
Do not touch `content/interactions.json`: if your medicine's name appears there as a plain substance (`grep -n 'name' content/interactions.json`), say so in
`BATCH-REPORT.md`. Run `python3 tools/verification/check_batch.py` on the first finished item early. Use your search budget: the first medicines batch
finished 8 pages in about 135 of 200 searches. Skip an id that already exists in `content/medications.json` or in another `meds-*` batch.
