# Batch `conditions-e`: New conditions E: long-term and everyday conditions

Read `docs/authoring/README.md` and `docs/authoring/conditions.md` first. Branch to push to: `content/conditions-e`. Batch directory: `content/drafts/batches/conditions-e/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `lupus` | Lupus (systemic lupus erythematosus) | sources NHS, Lupus UK, NICE CKS, NIAMS |
| `fibromyalgia` | Fibromyalgia | sources NHS, NICE (chronic pain NG193 mentions it), Versus Arthritis, NIAMS |
| `vertigo` | Vertigo and balance problems (including BPPV and Meniere's disease) | symptom `dizziness`; organ `ear`; sources NHS, NICE CKS, NIDCD |
| `lactose-intolerance` | Lactose intolerance | sources NHS, NIDDK, British Dietetic Association |
| `vitamin-d-deficiency` | Vitamin D deficiency | tests `vitamin-d`; health topic `nutrition`; sources NHS, NICE CKS, NIH Office of Dietary Supplements; no dose or level numbers |
| `vitamin-b12-deficiency` | Vitamin B12 and folate deficiency anaemia | tests `vitamin-b12-folate`; related `anaemia`; sources NHS, NICE CKS, BSH |
| `hernia` | Hernia | sources NHS, NICE CKS, NIDDK |
| `sciatica` | Sciatica | symptoms `back-pain`, `numbness`, `tingling`; related `disc-herniation`; imaging `mri`; sources NHS, NICE NG59/CKS, Versus Arthritis |

Every item: a complete new condition entity **with the `article` block (800 to 1,200 words)**, its ledger and its second-pass report.
Run `python3 tools/verification/check_batch.py` on the first finished item early to learn the id and alias rules, then continue.
