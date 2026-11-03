# Batch `conditions-c`: New conditions C: mental health and neurodevelopmental conditions (sensitive; crisis signposting required)

Read `docs/authoring/README.md` and `docs/authoring/conditions.md` first. Branch to push to: `content/conditions-c`. Batch directory: `content/drafts/batches/conditions-c/`.

Items (write them in this order; if the search budget runs short, finish the first ones properly and say which were not done):

| Page id | Page name | Notes |
| --- | --- | --- |
| `anxiety-disorders` | Anxiety and generalised anxiety disorder | alias `anxiety`, `gad`; sources NHS, NICE CG113/CKS, Mind, Royal College of Psychiatrists |
| `depression` | Depression | sources NHS, NICE NG222/CKS, Mind; medications `sertraline`, `citalopram` exist (link only if the sources name them); include the crisis route (999, NHS 111 mental health option, Samaritans 116 123) |
| `adhd` | ADHD (attention deficit hyperactivity disorder) | a neurodevelopmental condition, not an illness to be cured: follow the NHS/NICE wording; sources NHS, NICE NG87, ADHD UK |
| `autism` | Autism | use respectful wording as the NHS and National Autistic Society do ("autistic people"); not a disease; sources NHS, National Autistic Society (autism.org.uk), NICE CG142 |
| `ocd` | Obsessive compulsive disorder (OCD) | sources NHS, NICE CG31, OCD UK, Mind |
| `ptsd` | Post-traumatic stress disorder (PTSD) | sources NHS, NICE NG116, Mind |
| `bipolar-disorder` | Bipolar disorder | sources NHS, NICE CG185, Bipolar UK, Mind |
| `insomnia` | Insomnia | link health topic `sleep`; sources NHS, NICE CKS, Sleep Foundation only if nothing else |

Every item: a complete new condition entity **with the `article` block (800 to 1,200 words)**, its ledger and its second-pass report.
Run `python3 tools/verification/check_batch.py` on the first finished item early to learn the id and alias rules, then continue.
