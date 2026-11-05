# Batch `conditions-b`: New conditions B: cancers people search for

Read `docs/authoring/README.md` and `docs/authoring/conditions.md` first. Branch to push to: `content/conditions-b`. Batch directory: `content/drafts/batches/conditions-b/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `pancreatic-cancer` | Pancreatic cancer | link organ `pancreas`; sources NHS, Pancreatic Cancer UK if retrievable, Cancer Research UK, NCI, NICE |
| `prostate-cancer` | Prostate cancer | organ `prostate`; screening is a sensitive policy area: describe what the NHS says (no routine screening programme) only as the sources state; sources NHS, Prostate Cancer UK, CRUK, NICE |
| `lymphoma` | Lymphoma (Hodgkin and non-Hodgkin) | sources NHS, Lymphoma Action, CRUK, NCI |
| `skin-cancer` | Skin cancer (melanoma and non-melanoma) | also covers melanoma, basal cell and squamous cell carcinoma; add aliases `melanoma`; sources NHS, CRUK, British Association of Dermatologists, NCI |
| `thyroid-cancer` | Thyroid cancer | conditions `hypothyroidism`, `hyperthyroidism` as related; tests `thyroid-function-tests`; sources NHS, CRUK, British Thyroid Foundation, NCI |
| `bladder-cancer` | Bladder cancer | organ `bladder`; symptom note: blood in urine is the sign the sources stress; link `urinary-tract-infection` as related; sources NHS, CRUK, NCI, NICE |
| `testicular-cancer` | Testicular cancer | organ `testes`; the testes article exists at /anatomy/testes/; sources NHS, Orchid, CRUK, NCI |
| `brain-tumour` | Brain tumours | organ `brain`; sources NHS, Brain Tumour Research, CRUK, NCI |

Every item: a complete new condition entity **with the `article` block (800 to 1,200 words)**, its ledger and its second-pass report.
Run `python3 tools/verification/check_batch.py` on the first finished item early to learn the id and alias rules, then continue.
