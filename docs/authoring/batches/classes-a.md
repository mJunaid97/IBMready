# Batch `classes-a`: deepen five thin drug-class pages

Read `docs/authoring/README.md` (the evidence protocol, search budget and tips) and `docs/authoring/medications.md` first. Branch to push to: `claude/content-classes-a`. Batch directory: `content/drafts/batches/classes-a/`.

## Why

The review queue `sparse_public_page` lists drug-class pages that carry little authored text (under 1,200 characters) or fewer than two references. They were created in the v1.10.0 batches with the medicines they group and are
thin by design. Your five classes: `triptans`, `5-ht3-receptor-antagonists`, `dopamine-antagonist-antiemetics`, `antimotility-agents`, `osmotic-laxatives`. Compare a class that was deepened in October (for example `beta-blockers` in `content/drug-classes.json`: a full `summary`, a `mechanism` of several sentences, `classEffects`, `cautions`, five references from four publishers) and bring each of yours to that standard of depth for what the sources say, in the same style (plain words, UK English, no hype).

## What to deliver

A `fragment.json` with one `patch` object (**every field you name is replaced by the value you give**, so give the complete new value of a field, starting from the current text in `content/drug-classes.json`, which you keep and extend; `references` are appended when their URL is new):

    {"patch": {"drug-classes": {"<id>": {"summary": "...", "mechanism": "...", "classEffects": ["..."], "cautions": ["..."], "references": [{"title": "...", "url": "..."}]}}}}

* You may extend `summary` (what the class is, what its members treat, how they are supplied: three to five sentences), `mechanism` (how the class works in the body, in words: four to seven sentences), `classEffects` (the commonest effects the sources name, as short list items) and `cautions` (who needs extra care and what the sources say to watch for, as list items).
* **Protected, do not change:** `members`, `medications`, `conditions`, `classInteractions`, `classWarnings`, `duplicationRule`, `anatomy`, `aliases`, `urlAliases`, `review`, `terminology` and every link field. Do not name a medicine that has no page on this site as if it had one; members that are in `members` may be named.
* Target: each class at about 1,500 to 2,200 characters of authored text across those four fields and at least three references from at least two publishers, one of them an official health body (NHS, NHS inform, NHS 111 Wales, MedlinePlus, NIH institutes, CDC, GOV.UK, NICE). The class `alpha-blockers` currently has one reference.
* Rules from the brief apply: write only from retrieved text; **no doses, strengths, schedules or numeric cut-offs in prose**; describe, do not instruct an individual ("the NHS advises that ... is not stopped suddenly"); name the route to care wherever urgency is mentioned (999 for an emergency, NHS 111 or the GP the same day for urgent, a GP appointment for routine); US-only practice is marked as US. Dependence and withdrawal wording must follow the NHS pages closely; the crisis route (NHS 111, 999, Samaritans 116 123) appears wherever overdose, self-harm or severe withdrawal is mentioned.
* Do the first pass for all five (ledger per class, README format), then the second pass with separate subagents (re-retrieve with differently worded searches; classify every added sentence and list item; keep only supported or textbook), then `fragment.json`, `reports/<class>.report.json` and `BATCH-REPORT.md`.

Validate with `python3 tools/verification/check_batch.py content/drafts/batches/classes-a/fragment.json` (must end with `ok`) and read `python3 tools/verification/lint_new_content.py content/drafts/batches/classes-a/fragment.json`. Work only in your batch directory; commit it and push to `claude/content-classes-a`.
Budget: five classes, about 25 searches each for both passes, 150 in all; stop at 190. Finish with a short message listing, per class, the new character count and reference count and anything a clinician should look at.
