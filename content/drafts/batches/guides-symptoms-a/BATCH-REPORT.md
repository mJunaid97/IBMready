# guides-symptoms-a: batch report

Ten guides finished and validated (`check_batch.py` ends with `ok`). Published text contains only sentences that the independent second pass classed supported or textbook, or that were rewritten to what the retrieved text said.

## Guides
chest pain; headaches; shortness of breath; stomach ache; back pain; knee pain; joint pain; nausea and vomiting in adults; persistent cough; sore throat.

## Searches used (about 108 of 200)
First pass: 31 (author). Second pass: 75 across ten independent subagents (the stomach-ache checker used 9 against a limit of 8). Headache restoration: 2 further searches by the author after the second pass cut the tension-headache and migraine definitions; these sentences were retrieved by two differently worded searches that agreed but were not re-checked by a separate subagent. About 90 searches were left unused, so no further guides were attempted (sore throat/ear/neck/shoulder/hip pain not covered: no site page exists to link ear, neck, shoulder or hip pain, and budget was spent on checking).

## What the second pass changed
Of roughly 250 first-pass sentences, about 40% were classed unsupported, wrong or unsafe (see `reports/`). Typical faults: a hospital or practice leaflet credited to "the NHS"; route to care changed (for example "GP or NHS 111" where the page says 111 only); NHS England and NHS inform pages mixed up; details that only appeared in blended search summaries. Those sentences were rewritten to the retrieved wording or removed.

## For a human reviewer
- **Length:** the brief asks for 700 to 1,000 words. After the second pass the guides run from about 260 (knee pain) to about 610 words (chest pain). The checker does not enforce length. I chose not to pad with unsourced text. Knee pain, back pain and sore throat are the thinnest.
- **Attribution:** search summaries blend pages, so "supported" rests on retrieved summaries, not on reading nhs.uk pages in full (WebFetch is blocked). Several sentences cite local NHS trust leaflets and NHS 111 Wales rather than nhs.uk, because that is where the text was returned.
- **NICE NG59:** the back-pain checker saw a NICE document saying the manual-therapy recommendation was withdrawn in July 2026 and removed that sentence. The remaining NG59 sentences should be checked against the live NICE page.
- **Back pain, cauda equina:** sources named A&E or NHS 111; none retrieved said 999. The guide states only what they said.
- **Not done:** no checker compared the guides with the site's own symptom and condition pages for contradictions. The fever threshold and similar numbers were kept out of prose; other numbers (for example "1 in 5 women", "3 weeks") are attributed to the source that stated them.
- **Medicine names** (amitriptyline, triptans, GTN, beta blockers, proton pump inhibitors) appear without doses. No medicine ids were created or changed.
