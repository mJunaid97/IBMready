# What has been verified, how, and what has not

Pages carry the review status `source-verified`: the facts were checked against the sources the page cites. **No page has been
reviewed by a clinician.** This file records the evidence behind the label as of 1 November 2026 and what remains.

## Levels of checking

| Level | What it establishes | Covers |
| --- | --- | --- |
| **Second-pass source check** (CLINICAL.md 5.5) | Every sentence re-retrieved independently from the cited publisher and classified supported, textbook, unsupported, wrong or unsafe; the unsupported, wrong and unsafe ones removed or cut back to what was confirmed | 7 anatomy articles with a sentence-level audit trail in `docs/verification/anatomy/<organ>/`: skull, hand, adrenal glands, small intestine, bony pelvis, bladder and urethra, testicle. 351 sentences: 62 unsupported or wrong, none unsafe |
| **Editorial QA without web access** | An independent read of the text for errors, contradictions, risky wording, doubtful numbers and citations a page cannot support (a reviewer works from the text and general knowledge, so it finds what looks wrong, not what a source says) | All 438 entities: 30 anatomy articles, 37 biomarkers, 50 conditions, 29 drug classes, 8 imaging, 9 health topics, 72 interactions, 7 comparisons, 41 medicines, 35 physiology pages, 19 procedures, 22 symptoms, 16 first-aid topics, 39 tests, 24 targets. 305 findings, 126 fixed (all high, all but one medium); see `editorial-qa/README.md` |
| **Reference links** | Every cited address still resolves to a page with the title the page gives it | All 1,191 references, on every push to the content and weekly (workflow "Reference links") |
| **Automated site checks** | Metadata, schema, links, accessibility, layout, CSP and 301 rules of every page type | The QA workflow (smoke test, SEO audit) on every push |

The anatomy articles that existed before this round (30 of them) were enriched under the same protocol, but no sentence ledger
was kept for them, so only the seven above can show their checking sentence by sentence.

## Not verified

* **Clinical review.** Nobody with a clinical registration has read the site. The site has a medical review policy
  (`/medical-review-policy/`) but no review under it has happened, so `lastReviewed` is never set in the schema and no page says
  "reviewed by".
* **The first-pass drafts that have no second pass:** pituitary gland, thymus and ureters stay in `content/drafts/anatomy/`.
  Eight organ pages (foot, shoulder girdle, rib cage, prostate, penis, gallbladder, spleen, uterine ligaments) have no
  article yet and stay `noindex`.
* **Twelve test cut-offs** that the pages state in prose without a sourced threshold record (`content/drafts/thresholds/README.md`).
  The reviewers found more candidates (CRP and ESR bands, BNP, vitamin D, blood glucose) listed in their notes.
* **Interaction severity tiers** are the ones the records cite; none was re-derived from the BNF this round. One needs it:
  azithromycin with citalopram sits at "monitor or adjust" on a US MedlinePlus sentence, while UK citalopram labelling
  advises against QT-prolonging combinations. The reviewers also asked for a BNF check of two dose caps (atorvastatin with
  ciclosporin, rosuvastatin with gemfibrozil).
* **178 low-severity editorial findings** (numbers in prose, tags that point at a neighbouring organ, wording nuances) are
  queued in `editorial-qa/*.json` with `status: open`.

## Why the second pass stopped at seven articles, and how to continue

Web search allows 200 calls per turn, shared by every agent, and a second pass costs 25 to 30 searches per article; this round
used the allowance on the seven articles whose search volume is highest. The page fetch tool cannot reach the publishers from the
cloud sandbox (`openstax.org`, `nhs.uk`, `ncbi.nlm.nih.gov` and similar fail to resolve), and fetching is not limited per turn.
**Allowing those hosts in the environment's network settings is the single change that would let the rest be checked page by
page instead of through search summaries.**

Order of work, by what people search (docs/seo/keyword-research.md): foot, shoulder girdle, penis, prostate, gallbladder, rib cage,
spleen; then pituitary, thymus, ureters, uterine ligaments (the last three have a first-pass draft, the rest none).

## Tools

* `tools/verification/qa_slice.py <file> [a:b]` prints any content file as plain text for a reviewer.
* `tools/verification/validate_article.py <article.json>` checks the shape an article needs (sections, atlas structure names,
  references from two publishers with one official health body, numbers in prose).
* To merge a verified article: copy it into `content/anatomy.json` with `"updated": "<date>"`, move the draft's ledger and the
  second-pass report to `docs/verification/anatomy/<organ>/`, run `python3 tools/build-content.py`; the organ page becomes
  indexable as soon as it has an article.
