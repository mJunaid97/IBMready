# Batch meds-b: interim report (push 1)

Finished and second-pass checked so far: dapagliflozin, empagliflozin, gliclazide, ezetimibe, and the classes sglt2-inhibitors, sulfonylureas, cholesterol-absorption-inhibitors.
Still in progress at this push: semaglutide + glp-1-receptor-agonists, spironolactone + mineralocorticoid-receptor-antagonists, tirzepatide (second pass done, waits for the GLP-1 class). Their files are not part of this fragment yet.

## Blocker for the maintainer
`python3 tools/verification/check_batch.py` crashes (TypeError in tools/taxonomy.py line 373: `c["id"]` on a string) whenever a new drug class is not listed in `content/medication-taxonomy.json`. All new classes here are unlisted. Validated instead in a scratch copy with the classes added to the taxonomy: merge clean, compiler exit 0.
Add the classes to `content/medication-taxonomy.json` (groups[].classes[].page) or fix `build_medication_taxonomy`.
