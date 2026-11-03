# Batch `conditions-f`: New conditions F: skin, allergy and eyes

Read `docs/authoring/README.md` and `docs/authoring/conditions.md` first. Branch to push to: `content/conditions-f`. Batch directory: `content/drafts/batches/conditions-f/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `eczema` | Atopic eczema | alias `eczema`, `atopic-dermatitis`; sources NHS, NICE CKS, British Association of Dermatologists (bad.org.uk), National Eczema Society; no steroid potency or dose detail |
| `psoriasis` | Psoriasis | sources NHS, NICE CKS/CG153, Psoriasis Association, BAD; link `rheumatoid-arthritis` only if the sources connect psoriatic arthritis |
| `acne` | Acne | sources NHS, NICE CKS, BAD; isotretinoin only as the NHS states (specialist-prescribed), no doses |
| `hives` | Hives (urticaria) | alias `urticaria`, `nettle-rash`; sources NHS, BAD, NICE CKS; swelling of the face or breathing difficulty must name 999 |
| `hay-fever` | Hay fever (allergic rhinitis) | link medicines `cetirizine`, `chlorphenamine` only as the sources name them; sources NHS, NICE CKS, Allergy UK |
| `food-allergy` | Food allergy and anaphylaxis | emergency page: seekCare names 999 and adrenaline auto-injector only as the NHS describes; sources NHS, NICE CG116, Allergy UK, Anaphylaxis UK |
| `cellulitis` | Cellulitis | sources NHS, NICE CKS/NG141; urgent signs name NHS 111 or 999 as the NHS does |
| `conjunctivitis` | Conjunctivitis | organ `eye`; sources NHS, NICE CKS, Moorfields Eye Hospital |

Every item: a complete new condition entity **with the `article` block (800 to 1,200 words)**, its ledger and its second-pass report.
Run `python3 tools/verification/check_batch.py` on the first finished item early to learn the id and alias rules, then continue.
Use your search budget: the first batches finished 8 pages in about 140 of 200 searches, so plan for all 8 and stop only when the budget is
nearly spent. Do not duplicate an id that already exists in `content/conditions.json` (52 entries) or is built by another batch
(`conditions-a` to `conditions-h`): if an id or alias clashes, report it in `BATCH-REPORT.md` and use a distinct alias.
