# Batch meds-f: report

Branch `content/meds-f`, session date 2026-11-03.

## Finished (8 medicines, 7 new classes)

sildenafil, tadalafil (class `pde5-inhibitors`), combined-pill (`combined-hormonal-contraceptives`), aciclovir (`nucleoside-antivirals`),
fluconazole (`azole-antifungals`), hydroxychloroquine (`antimalarial-dmards`), methotrexate (`antimetabolite-dmards`),
montelukast (`leukotriene-receptor-antagonists`). Nothing was skipped. Each has a first-pass ledger (`ledgers/`), an independent
second-pass report by a separate subagent (`reports/`), and the published text in `fragment.json` (the `parts/*.final.json` files are the same text).

Searches used: about 179 of 200 (2 by the lead, 73 in the first pass, 104 in the second pass).
Share of first-pass claims the second pass removed as unsupported or wrong: roughly 10 to 30 per cent per item (see each report's counts).

## Validation: the maintainer must read this

1. `check_batch.py` does not end with `ok` on the stock tools, for two reasons that are outside this batch directory:
   * **Tool bug.** `tools/taxonomy.py` line 373 (`unmapped_classes = [c["id"] for c in classes if ...]`) iterates the dict of drug classes, so any drug class not listed in `content/medication-taxonomy.json` raises `TypeError: string indices must be integers`. It should read `[c for c in classes if ...]`. Every new class in this batch (7) triggers it. With only that change, in a scratch copy of the tools, the fragment compiles and every page passes the publishing gate.
   * **Taxonomy.** The 7 new classes are not mapped in `content/medication-taxonomy.json` (`areas[].groups[].classes[]` with a `page`), so they will list under `classesOutsideTaxonomy` until mapped. I did not edit that file.
2. **interactions.json** uses "Methotrexate" as a plain substance in four records: `aspirin-methotrexate`, `ibuprofen-methotrexate`, `omeprazole-methotrexate`, `amoxicillin-methotrexate`. The compiler reports these as errors now that the `methotrexate` page exists; the maintainer re-points them (use `b: "methotrexate"`). No other batch medicine appears there.
3. Class `classWarnings` and `classInteractions` are not used: the compiler requires a source record per item, so those points sit in each class's `cautions` as plain sentences.

## Things a human reviewer should look at

* Search summaries blended pages, so many "supported" sentences rest on a summary attributed to the best-matching URL, not a page-verified excerpt. Spot-check the NHS pages for: combined pill blood-clot routes (999 for breathlessness and chest pain; the NHS lists coughing up blood separately), sildenafil/tadalafil prolonged erection route, fluconazole pregnancy wording, methotrexate weekly-dosing warning, hydroxychloroquine eye-monitoring wording.
* Regulatory status: sildenafil and tadalafil carry a second UK `pharmacy` entry (Viagra Connect, Cialis Together); combined-pill is `prescription` (pharmacy supply under the NHS pharmacy contraception service is described in prose); fluconazole has `prescription` and `pharmacy`; aciclovir has `otc` (cold sore cream) and `prescription`.
* Hydroxychloroquine: the mood-change and self-harm line routes to NHS 111 only (as the NHS side-effects page does). Add 999 and Samaritans (116 123) if the site's mental-health rule should apply to this page.
* Methotrexate: breastfeeding is reported as the sources differ; NSAID wording follows the Specialist Pharmacy Service. The brand list follows the NHS page; Methofill, Nordimet and Zlatal are added as aliases.
* Hydroxychloroquine retinopathy: "rarely" was removed; RCOphth gives a prevalence in long-term users higher than older figures. Described in words only.
* Class members without pages (vardenafil, avanafil, valaciclovir, chloroquine, zafirlukast) are named in class text only.
* Articles are 550 to 735 words (below the 600 to 900 aim for tadalafil, combined pill, aciclovir and fluconazole) because unsupported material was cut; nothing was padded.
* No `terminology`, `review` or `updated` fields were set. US brands and US regulatory entries were omitted where no US source was retrieved.
* Reference hosts not in the compiler's table (rcophth.ac.uk, nras.org.uk, versusarthritis.org) give a build note only.
