# Batch `conditions-h`: New conditions H: digestive, respiratory and circulation

Read `docs/authoring/README.md` and `docs/authoring/conditions.md` first. Branch to push to: `content/conditions-h`. Batch directory: `content/drafts/batches/conditions-h/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `high-cholesterol` | High cholesterol (hypercholesterolaemia) | link tests `lipid-profile`, medicines `atorvastatin`, `rosuvastatin`, class `statins` as the sources state; no numbers; sources NHS, NICE CG181/NG238, Heart UK, BHF |
| `coeliac-disease` | Coeliac disease | sources NHS, NICE NG20, Coeliac UK |
| `hepatitis-c` | Hepatitis C | neutral wording; sources NHS, British Liver Trust, UKHSA, WHO |
| `sinusitis` | Sinusitis | sources NHS, NICE CKS/NG79 |
| `bronchitis` | Bronchitis | sources NHS, NICE CKS, Asthma + Lung UK |
| `sleep-apnoea` | Obstructive sleep apnoea | sources NHS, NICE NG202, Asthma + Lung UK |
| `aortic-aneurysm` | Abdominal aortic aneurysm | organ `aorta`; the NHS screening programme only as the NHS states it; rupture signs name 999; sources NHS, NICE NG156 |
| `peripheral-arterial-disease` | Peripheral arterial disease | sources NHS, NICE CG147, British Heart Foundation |

Every item: a complete new condition entity **with the `article` block (800 to 1,200 words)**, its ledger and its second-pass report.
Run `python3 tools/verification/check_batch.py` on the first finished item early to learn the id and alias rules, then continue.
Use your search budget: the first batches finished 8 pages in about 140 of 200 searches, so plan for all 8 and stop only when the budget is
nearly spent. Do not duplicate an id that already exists in `content/conditions.json` (52 entries) or is built by another batch
(`conditions-a` to `conditions-h`): if an id or alias clashes, report it in `BATCH-REPORT.md` and use a distinct alias.
