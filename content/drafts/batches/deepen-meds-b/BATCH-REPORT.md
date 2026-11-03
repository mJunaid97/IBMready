# BATCH-REPORT: deepen-meds-b

All 10 items finished: levothyroxine, prednisolone, salbutamol, warfarin, apixaban, citalopram, losartan, lisinopril, bisoprolol, tramadol. Each has an `article` block (patch to `content/medications.json`) that went through a first pass written from retrieved text, then an independent second pass by a separate agent that re-retrieved with different queries and edited the article in place. `check_batch.py` on `fragment.json` ends with `ok`; all 10 pages pass the publishing gate. No other file was touched.

## Searches
About 36 in the first pass and 74 in the second, about 110 of the 200 budget. Per-item counts are in `reports/*.report.json`. The budget was not exhausted because each agent was capped at 8 calls per item.

## Second-pass changes (first-pass sentences: supported / textbook / unsupported / wrong)
levothyroxine 32/3/9/2, prednisolone 26/0/22/2, salbutamol 28/5/15/0, warfarin 32/3/11/0, apixaban 31/4/16/0, citalopram 35/2/14/2, losartan 28/3/13/0, lisinopril 28/1/10/3, bisoprolol 32/0/17/1, tramadol 34/0/13/1. Unsupported and wrong sentences were cut or reworded to what the source says.

## For a human reviewer
* Search returned blended summaries, not page text, so per-sentence URL attribution is approximate in every ledger. Checking the urgency wording against the live NHS pages is the most valuable review step.
* **Warfarin:** NHS 111 for bleeding and head injury is supported. The 999 route for brain-bleed signs comes from the NHS apixaban and related anticoagulant pages, not the warfarin page. Some NHS trusts say A&E/999 for head injury; the article follows the NHS warfarin page.
* **Apixaban:** the NHS main page (NHS 111 for bleeding) and side-effects page (999/A&E for severe headache, fits, sudden vision loss) differ; the article states both and says they are worded differently.
* **Tramadol:** dependence route is the NHS wording (speak to a doctor before stopping). No NHS drug-service pointer was retrieved, and overdose and serotonin syndrome have no named 999 route ("seek help immediately" / "urgent medical help"). The MAOI line rests on an older NHS trust guide plus MedlinePlus. Breastfeeding advice differs between NHS sources and the article says so.
* **Prednisolone:** steroid card and adrenal warnings and the infection route (doctor, pharmacist or NHS 111) are included. Self-harm thoughts route is NHS 111 only; Samaritans 116 123 and 999 were not retrievable from the prednisolone text. One 999 line for vomiting is from a trust page (NNUH) and is attributed to it.
* **Citalopram:** crisis routes come from the NHS "Help for suicidal thoughts" page, Samaritans and Mind via search summaries. The self-harm route on the citalopram side-effects page itself was not resolved (summaries disagreed).
* **Levothyroxine:** no route is named for thyroid crisis (not retrievable). Allergic reaction 999 is from the NHS anaphylaxis page.
* **Salbutamol / losartan / lisinopril / bisoprolol:** some warning signs have no named route because the NHS route was not retrieved. Lisinopril and losartan breastfeeding wording differs between NHS and emc and is attributed to each.
* Textbook sentences exceed the 1-in-20 guide in a few items (salbutamol 5 of 48, levothyroxine 3 of 46, warfarin and losartan fewer in the final text).
* Length: sections plus FAQs run 700 to 1,090 words; citalopram, bisoprolol and lisinopril are over 900 once FAQs and key facts are counted (sections alone are within range).

## Contradictions with existing page text (not edited)
* **bisoprolol:** the record says "avoided in asthma"; the NHS lists "lung disease or severe asthma" as a reason to check first.
* **losartan:** the record says moderate alcohol is "usually acceptable"; the NHS advises limiting alcohol. Heart-failure use is NHS-supported but unconfirmed in the record.
* **warfarin / levothyroxine:** existing records contain INR target ranges, strengths and dose-separation timings; the articles repeat none of it. A reviewer may want to check the records against the no-numbers rule.
* **salbutamol:** the record uses the word "safe".
* **tramadol:** the record calls it a controlled drug; no retrieved NHS text stated this, so the article says "prescription only".
* **interactions.json:** nothing in this batch adds a new medicine id, so no re-pointing is needed.
