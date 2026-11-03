# Batch `conditions-g`: New conditions G: women's, men's and sexual health, pregnancy

Read `docs/authoring/README.md` and `docs/authoring/conditions.md` first. Branch to push to: `content/conditions-g`. Batch directory: `content/drafts/batches/conditions-g/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `menopause` | Menopause and perimenopause | medicine `estradiol` exists (link only as the sources state); sources NHS, NICE NG23, British Menopause Society, Women's Health Concern |
| `erectile-dysfunction` | Erectile dysfunction | neutral, non-judgemental; link `type-2-diabetes`, `hypertension` as related only if sources connect them; sources NHS, NICE CKS, Sexual Advice Association |
| `enlarged-prostate` | Enlarged prostate (benign prostatic hyperplasia) | alias `bph`; organ `prostate`; sources NHS, NICE CG97, NIDDK |
| `gonorrhoea` | Gonorrhoea | sexual-health tone; sources NHS, BASHH, UKHSA, CDC |
| `genital-herpes` | Genital herpes | neutral, stigma-free; sources NHS, BASHH, CDC |
| `pre-eclampsia` | Pre-eclampsia | pregnancy emergency signs name 999 / the maternity unit as the NHS does; sources NHS, NICE NG133, Action on Pre-eclampsia |
| `gestational-diabetes` | Gestational diabetes | link `type-2-diabetes` as related; sources NHS, NICE NG3, Diabetes UK |
| `miscarriage` | Miscarriage | sensitive: supportive, non-blaming language; sources NHS, NICE NG126, Miscarriage Association, Tommy's |

Every item: a complete new condition entity **with the `article` block (800 to 1,200 words)**, its ledger and its second-pass report.
Run `python3 tools/verification/check_batch.py` on the first finished item early to learn the id and alias rules, then continue.
Use your search budget: the first batches finished 8 pages in about 140 of 200 searches, so plan for all 8 and stop only when the budget is
nearly spent. Do not duplicate an id that already exists in `content/conditions.json` (52 entries) or is built by another batch
(`conditions-a` to `conditions-h`): if an id or alias clashes, report it in `BATCH-REPORT.md` and use a distinct alias.
