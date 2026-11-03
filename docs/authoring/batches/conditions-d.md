# Batch `conditions-d`: New conditions D: infections

Read `docs/authoring/README.md` and `docs/authoring/conditions.md` first. Branch to push to: `content/conditions-d`. Batch directory: `content/drafts/batches/conditions-d/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `covid-19` | COVID-19 | sources NHS, UKHSA (gov.uk), WHO, CDC; keep to what is stable (symptoms, who is at higher risk, vaccination programme as the UKHSA page states it); no case numbers |
| `chlamydia` | Chlamydia | sexual-health tone: neutral, non-judgemental; sources NHS, BASHH, UKHSA, CDC |
| `kidney-infection` | Kidney infection (pyelonephritis) | link `urinary-tract-infection`, `kidney-stones`, organ `kidneys`; sources NHS, NICE CKS, NIDDK |
| `tonsillitis` | Tonsillitis | sources NHS, NICE CKS, NICE NG84 (sore throat antimicrobial prescribing) |
| `ear-infection` | Ear infection (otitis media) | organ `ear`; sources NHS, NICE NG91, NICE CKS |
| `thrush` | Thrush (candidiasis) | oral, genital and skin forms as the NHS pages cover them; sources NHS, NICE CKS, BASHH |
| `meningitis` | Meningitis | emergency conditions: seekCare names 999; sources NHS, Meningitis Research Foundation, UKHSA, NICE NG240 |
| `hiv` | HIV | neutral, stigma-free wording; U=U only as the sources state; sources NHS, Terrence Higgins Trust, UKHSA, WHO; tests `hiv-test` exists |

Every item: a complete new condition entity **with the `article` block (800 to 1,200 words)**, its ledger and its second-pass report.
Run `python3 tools/verification/check_batch.py` on the first finished item early to learn the id and alias rules, then continue.
