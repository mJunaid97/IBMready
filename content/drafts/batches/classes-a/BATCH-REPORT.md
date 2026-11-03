# Batch classes-a: report

Five thin drug-class pages deepened by a `patch` of `summary`, `mechanism`, `classEffects` and `cautions` plus appended references. Protected fields untouched. `check_batch.py` ends `ok`; `lint_new_content.py` reports 0 findings.

| Class | Authored characters (4 fields) | References after merge | Second-pass counts (new items) |
| --- | --- | --- | --- |
| triptans | 2,233 | 7 | 9 supported, 1 textbook, 5 unsupported (reworded) |
| 5-ht3-receptor-antagonists | 1,801 | 6 | 10 supported, 1 unsupported (reworded) |
| dopamine-antagonist-antiemetics | 1,996 | 8 | 9 supported, 2 textbook, 2 unsupported (reworded) |
| antimotility-agents | 2,238 | 5 | 8 supported, 2 unsupported (reworded) |
| osmotic-laxatives | 2,043 | 7 | 3 supported, 1 textbook, 5 unsupported, 1 wrong (reworded) |

Searches: about 47 of 200 (13 first pass, 34 second pass by five independent subagents). Searches were not refused. The budget was deliberately not spent in full: the search tool returned blended summaries, and further queries would not have added page-level evidence.

## For a clinician to look at

* **Triptans**: the 5-HT1 subtype was not in retrieved text, so only "serotonin (5-HT) receptors" is stated. The medication-overuse sentence cites NHS Scotland guidance, worded generally (no limits). Sumatriptan's "tablets, nasal spray and injection" and the pregnancy sentence come from NHS page summaries; recheck wording against the live NHS pages.
* **Dopamine antagonists**: two mechanism sentences (basal ganglia dopamine/acetylcholine imbalance, list of movement effects) could not be tied to a page and were dropped. The StatPearls statement on neuroleptic malignant syndrome is paired with the NHS "call 999" advice. MedlinePlus statements are labelled US. The restated MHRA short-term restriction is existing text.
* **5-HT3 antagonists**: the 999/NHS 111 route in the heart-symptom item is site signposting; MedlinePlus text for ondansetron confirmed vision changes and irregular heartbeat only, so chest pain and fainting were removed.
* **Antimotility agents**: overdose wording carries 999/A&E, NHS 111 and Samaritans 116 123. The "child younger than 2" item is a MedlinePlus (US) statement.
* **Osmotic laxatives**: macrogol has no page on this site and is described only as the NHS does. The lactulose serious-side-effect item says to contact a doctor or NHS 111; the 999 route for allergic reaction is site signposting. Potassium and a macrogol mechanism claim were removed (unsupported).
* Several NHS pages come back from the search tool with dates about two years old; the live pages may have changed.
* Retained existing sentences (not re-checked here) cite the MHRA, an emc leaflet and an NHS prescribing sheet; some of those sources are not in `references` for the classes where they were already cited.
