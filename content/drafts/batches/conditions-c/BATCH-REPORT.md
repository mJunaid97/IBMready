# Batch conditions-c: report

Branch `content/conditions-c`. Date checked: 2026-11-03. `check_batch.py fragment.json` ends `ok`; all eight pages are indexable.

## Items finished (8 of 8)
anxiety-disorders, depression, adhd, autism, ocd, ptsd, bipolar-disorder, insomnia. Each has an entity in `fragment.json`, a ledger and a second-pass report. Skipped: none.

## Searches used
About 127 of 200: first pass 52 (7, 6, 5, 7, 7, 6, 7, 7 across the eight items), second pass 74 as reported by the checkers (4, 13, 10, 5, 11, 12, 11, 8), plus 1 by the lead for the shared crisis-route wording (NHS "Help for suicidal thoughts"). Leftover budget was not used for repair searches, see below.

## What the second pass changed
Share of first-pass sentences cut or reworded (unsupported + wrong): anxiety 55 of 111, depression 39 of 114, adhd 61 of 114, autism 55 of 113, ocd 51 of 113, ptsd 44 of 113, bipolar 51 of 112, insomnia 43 of 109 (insomnia had 3 "wrong"). That is far above the one-in-six seen in the first batches: search summaries for these topics blended pages and often did not return Mind, RCPsych, NICE or the main NHS page text.

## Look at these first (human reviewer)
1. **Anxiety and autism were only partly re-checked.** Both checkers hit a search "usage limit" error (after 4 and 5 searches). Everything they could not re-retrieve was removed, so both pages are thinner than planned and Mind/NICE/RCPsych support for anxiety rests on search summaries. Consider a further source check before merge.
2. **Unsourced "textbook" sentences in autism**: "a difference rather than an illness, no cure" and "genes play a large part". No retrieved text carried them; they follow NHS/NAS wording from memory.
3. **Filler links.** The quality gate needs two relationship groups. Where the sources named no valid page ids, the terms `symptom`/`diagnosis` (and in autism `physiology:sensory-systems`, in ocd `physiology:brain-functions`) were added only to pass the gate: adhd, autism, ocd, ptsd, bipolar-disorder. `thyroid-function-tests` (anxiety) rests on NHS saying blood tests may rule out an overactive thyroid. bipolar `related: hyperthyroidism` rests on case reports/cohort study that it can mimic mania (not an NHS statement).
4. **Attribution is best-match.** Search summaries blend pages; ledger notes flag where URL attribution is uncertain. Several kept sentences come from summaries, not page excerpts: depression (antidepressant duration, "not addictive", NICE), ptsd (NICE EMDR and under-18 drug statements, NHS "about 1 in 3"), adhd (NICE girls under-recognised, referral, "lifelong"), insomnia ("three months" definition from Sleep Foundation and a South Yorkshire ICB pathway; no NICE text corroborated).
5. **Crisis route.** Every page has 999 / A&E, NHS 111 (mental health option, no option number because it varies by area) and Samaritans 116 123 in `seekCare` and the get-help section, from the NHS "Help for suicidal thoughts" page.
6. **Report format.** In the ptsd report, `newSentence` for reworded claims is a placeholder ("see final text"); the final text is in the entity and ledger.
7. **Not in the NHS wording:** "manic depression" is not used as a bipolar alias (not confirmed by retrieved text). OCD: NICE CG31 remains current; an update (GID-NG10435) is in development.
8. **Article length.** The validator passes, but several pages exceed 1,200 words once FAQs are counted with sections (the article-block target is 800-1,200). Trim if the maintainer wants a stricter reading.

## Compiler notes
No alias or id conflicts. No medicine ids were added beyond sertraline and citalopram (depression) and sertraline (ptsd). No record in `content/interactions.json` was touched. `urlAliases` set: anxiety/gad, clinical-depression, attention-deficit-hyperactivity-disorder, autism-spectrum-disorder/asd, obsessive-compulsive-disorder, post-traumatic-stress-disorder, bipolar.
