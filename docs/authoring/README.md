# Authoring brief: new health content for Anatomy Nexus

You are writing pages for a UK-first health-education site (conditions, medicines, guides, news briefs). Pages are read by the
public, so a wrong sentence can mislead someone about their health. The site's promise (editorial policy, CLINICAL.md section
5.5) is that every sentence was **checked against the sources it cites**. This file is how you keep that promise. Read it fully,
then the file for your content type (`conditions.md`, `medications.md`, `blog.md`) and your assignment in `batches/`.

## What you deliver (and what you must not touch)

Work only in `content/drafts/batches/<batch-id>/` (create it). Deliver:

* `fragment.json`: the new or changed entities, in the format of `tools/verification/check_batch.py` (see its docstring).
* `ledgers/<id>.ledger.json`: the first-pass ledger of every item (format below).
* `reports/<id>.report.json`: the second-pass report of every item (format below).
* `BATCH-REPORT.md`: items finished, items skipped and why, searches used, anything a human reviewer should look at.

Do **not** edit `content/*.json`, `data/`, `site/`, `tools/` or anything else, do not open pull requests, do not merge. Commit only
your batch directory and push it to the branch named in your assignment (`git push -u origin <branch>`). The maintainer
merges batches after validating them. Validate before you push: `python3 tools/verification/check_batch.py content/drafts/batches/<batch-id>/fragment.json`
must end with `ok`. Fix every ERROR it prints; a batch that does not compile is not merged.

## The evidence protocol (non-negotiable)

1. **First pass: write only from retrieved text.** Use WebSearch (domain-restricted) to retrieve what the publishers say; write
   each sentence from what the returned text says. Do not write from memory. A few plain, undisputed textbook facts may be marked
   `textbook` (at most 1 in 20 sentences); everything else must be `excerpt`. If you cannot retrieve support for something, leave it out.
2. **Ledger.** For every sentence you keep, record `{"where": "overview|article.sections[2]|...", "sentence": "...", "basis": "excerpt|textbook", "urls": ["the page(s) it came from"], "note": "what the returned text said"}`.
   Cite the exact URL the search returned (drop tracking suffixes such as `?report=reader`).
3. **Second pass: independent re-check.** After the first pass, re-retrieve with differently worded searches (spawn a separate
   subagent for it, so it does not just agree with the author) and classify **every** sentence: `supported`, `textbook`, `unsupported`,
   `wrong` or `unsafe`. Cut or reword anything that is not supported to what the source says. The published text contains only
   supported or textbook sentences. In the first seven anatomy articles the second pass found 62 of 351 first-pass sentences
   unsupported or wrong (about one in six), so expect it to change your text.
4. **Report** `reports/<id>.report.json`: `{"id": "...", "searchesUsed": n, "counts": {"supported": n, "textbook": n, "unsupported": n, "wrong": n, "unsafe": n, "unchecked": n}, "claims": [{"id": "c01", "classification": "...", "evidence": "what the retrieved text said", "url": "...", "action": "kept|edited|removed", "newSentence": "..."}], "notes": "anything doubtful"}`.
   `unchecked` must be 0 at the end: remove what you could not check.

## Search budget and tips

* WebSearch allows **200 calls for your whole session** (every subagent shares it). Plan before you search: group several aspects
  of one topic in one query, and stop searching the moment a call is refused; finish with what you have and say so in the report.
* The search tool is US-focused. **Always pass `allowed_domains` with several UK and official hosts at once**, for example
  `["nhs.uk", "nice.org.uk", "cks.nice.org.uk", "bhf.org.uk", "cancerresearchuk.org", "medlineplus.gov", "ncbi.nlm.nih.gov", "cancer.gov"]`
  (use `nhs.uk`, not `www.nhs.uk`, which returns nothing). `mode: "extended"` returns a fuller multi-aspect summary and costs
  one call, so use it for broad first-pass queries ("X symptoms causes diagnosis treatment self-care when to seek help") and
  `mode: "standard"` for narrow re-checks. An exact page-title query ("Angina - NHS") returns the cleanest single-source summary.
* The summaries blend several pages and often do not say which page a statement came from. Attribute a sentence to a URL only when
  that page's own title or excerpt carries it; when unsure, say so in the ledger note and prefer the claim that two publishers agree on.
* Direct page fetching (WebFetch) is blocked for the publishers; do not spend time on it.
* Other useful hosts: `cks.nice.org.uk` (NICE clinical knowledge summaries), `bnf.nice.org.uk` (medicines), `medicines.org.uk`,
  `gov.uk` (UKHSA), `who.int`, `cdc.gov`, `niddk.nih.gov`, `nhlbi.nih.gov`, `ninds.nih.gov`, `diabetes.org.uk`, `mind.org.uk`,
  `alzheimers.org.uk`, `msociety.org.uk`, `asthmaandlung.org.uk`, `stroke.org.uk`, `epilepsy.org.uk`, `breastcancernow.org`, `macmillan.org.uk`.
  Reference hosts the compiler does not know give a build note, not an error.

## Writing rules

* UK English (oesophagus, paediatric, anaemia, tumour). Plain words, reading age about 12 to 14, sentences mostly under 25 words,
  define a medical term the first time. Neutral, calm, respectful; no hype, no fear, no second-person commands.
* **Describe; do not instruct an individual.** Write "the clinician decides whether to ...", "treatment usually includes ...", not "stop
  taking", "you should take". Never write that a medicine is "safe", a condition "cured", or a symptom "nothing to worry about".
* **Name the route to care wherever you mention urgency**: "call 999" for emergencies, "NHS 111 or the GP the same day" for urgent,
  "a GP appointment" for routine. Every red-flag list says who to contact (the site's signposting rule). For mental-health pages
  include the crisis route: 999 if in immediate danger, NHS 111 (mental health option), Samaritans on 116 123 (free, any time).
* **No doses, dosing schedules, test cut-offs or reference ranges in prose** (those are separate sourced records on this site). Other
  numbers (how common, how long, how many people) only if the retrieved text states them, attributed ("the NHS says ...") and
  plainly worded; when in doubt use words ("common", "rare") only if the source uses them.
* UK first: prefer NHS, NICE, UKHSA, BNF and UK charities; mark US-only practice as US; do not present US figures as general.
* Sensitive topics (mental health, suicide, sexual health, HIV, gender, cancer prognosis): supportive language, person-first or
  community-preferred terms as the NHS uses them, no blame, no survival statistics unless the source gives them with a year.
* Do not copy sentences from a source; paraphrase closely enough to keep the meaning, and keep the claim count honest.
* Do not invent links: only use ids that exist (see the lists in your type file). If a page you want to link does not exist, omit the link.
* `updated` is the date you checked the sources (today's date in the session). Do not set `review`; the compiler defaults new
  pages to `source-verified`, which is exactly what the two passes establish, never "clinically reviewed".

## Time and order of work

Plan the searches first (a table: item, queries, domains). Do the first pass for all items, then run the second pass for all items,
then assemble `fragment.json`, validate, write `BATCH-REPORT.md`, commit and push. If the budget runs short, finish fewer items
properly instead of many badly: a smaller verified batch is worth more than a larger unverified one. Push early (after the first
items validate) and again at the end.
