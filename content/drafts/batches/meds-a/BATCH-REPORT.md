# Batch meds-a: report

Nine medicine pages written (first pass from retrieved text, ledger per item, independent second pass by separate subagents, cleaned `*.final.json`). Searches: about 62 first pass + 73 second pass = roughly 135 of the 200 allowed (first-pass figures are from the agents' own reports).

## Files
- `fragment.json`: 8 medicines (naproxen, diclofenac, lansoprazole, esomeprazole, propranolol, loratadine, fexofenadine, codeine). `check_batch.py` ends `ok`.
- `fragment-simvastatin.json`: simvastatin, held back on purpose. With it the checker exits 1 because the existing record `content/interactions.json#amlodipine-simvastatin` names Simvastatin as a plain substance, and the compiler now wants the medication id. The maintainer needs to point that record at `simvastatin` (I was told not to touch interactions.json), then merge this fragment. The page itself has no problem.
- `ledgers/`, `reports/`, `drafts/` (`<id>.json` first pass, `<id>.final.json` published text).

## Second-pass results (unsupported / wrong of ~60-100 sentences each)
naproxen 22/2, diclofenac 18/3, simvastatin 20/0, propranolol 17/0, codeine 7/0, esomeprazole 4/0, loratadine 4/0, fexofenadine 4/0, lansoprazole 0/2. All removed or reworded; unchecked is 0 everywhere. Real errors caught: diclofenac and lansoprazole breastfeeding wording was wrong; propranolol NICE claim had no NICE source.

## Reviewer should look at
1. **Regulatory status** is weakly sourced for several pages. Codeine: Schedule 5 "controlled" status was dropped; status rests on the NHS co-codamol page (pharmacy for the lowest strength, prescription otherwise). Esomeprazole and lansoprazole "prescription" rest on emc leaflets or the NHS About page with no explicit status text; diclofenac gels are pharmacy-sold per the NHS but the entity carries only `prescription`.
2. **Article length** is under 600 words on lansoprazole (496), fexofenadine (~574), diclofenac (586), simvastatin (591); unsupported text was cut rather than padded. Textbook share slightly exceeds 1 in 20 on loratadine and propranolol.
3. **Attribution from blended search summaries** (flagged in the reports' notes): fexofenadine apalutamide/antacid/driving wording (leaflet number unpinned), codeine paracetamol-overdose 111/999 line (North Tees NHS leaflet, no national page), esomeprazole tapering line (ICB guidance), naproxen asthma/hay-fever leaflet URL.
4. No BNF page was ever returned by the search tool, so no BNF reference or claim appears anywhere. `co-codamol` could not be an alias (already a product id in content/products.json). No terminology codes were included. Propranolol lost its angina, AF, thyroid and stroke uses because they could not be retrieved; the page covers only what was supported.
5. Reference titles had product strengths removed; fexofenadine prose no longer mentions tablet strengths. Check the emc reference titles still read sensibly.
