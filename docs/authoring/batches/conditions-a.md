# Batch `conditions-a`: New conditions A: common illnesses with high search demand and low competition

Read `docs/authoring/README.md` and `docs/authoring/conditions.md` first. Branch to push to: `content/conditions-a`. Batch directory: `content/drafts/batches/conditions-a/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `influenza` | Flu (influenza) | alias `flu`; link the existing medication `influenza-vaccine`, conditions `pneumonia`, `asthma`, `copd`; symptoms `fever`, `cough`, `fatigue`, `headache`; sources: NHS, UKHSA (gov.uk), NICE CKS, CDC |
| `angina` | Angina | the id `angina` is a urlAlias of `coronary-artery-disease`: add a patch that removes that alias from it. Link `coronary-artery-disease`, `myocardial-infarction`, medications `glyceryl-trinitrate`, `aspirin`, `atorvastatin`, `bisoprolol`, tests `ecg`, `stress-test`; symptoms `chest-pain`; sources NHS, NICE CG126/CKS, BHF |
| `irritable-bowel-syndrome` | Irritable bowel syndrome (IBS) | alias `ibs`; link `inflammatory-bowel-disease`, symptoms `abdominal-pain`, `nausea`; sources NHS, NICE CG61/CKS, IBS Network if retrievable |
| `fatty-liver-disease` | Fatty liver disease (MASLD) | also called non-alcoholic fatty liver disease (NAFLD) and metabolic-dysfunction associated steatotic liver disease; link `cirrhosis`, `type-2-diabetes`, tests `liver-function-tests`; sources NHS, British Liver Trust, NICE, NIDDK |
| `multiple-sclerosis` | Multiple sclerosis (MS) | link `parkinsons-disease` only if the sources relate them; symptoms `fatigue`, `numbness`, `weakness`; imaging `mri`; sources NHS, MS Society (msociety.org.uk), NICE, NINDS |
| `shingles` | Shingles | link `pneumonia` no; use symptoms `rash`, `tingling`, `fever`; sources NHS, UKHSA (gov.uk), NICE CKS, CDC |
| `norovirus` | Norovirus (winter vomiting bug) | symptoms `vomiting`, `nausea`, `abdominal-pain`; health topic `hydration`; sources NHS, UKHSA, CDC |
| `diverticulitis` | Diverticular disease and diverticulitis | link `appendicitis`, `inflammatory-bowel-disease` only if sources relate them; symptoms `abdominal-pain`, `fever`; tests `complete-blood-count`, `crp`; imaging `ct-scan`; sources NHS, NICE CKS, NIDDK |

Every item: a complete new condition entity **with the `article` block (800 to 1,200 words)**, its ledger and its second-pass report.
Run `python3 tools/verification/check_batch.py` on the first finished item early to learn the id and alias rules, then continue.
