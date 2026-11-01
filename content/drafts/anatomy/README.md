# Anatomy article drafts (first pass only)

These are **drafts, not published content**. Nothing in this folder is read by `tools/build-content.py`, copied by
`tools/package-site.py` (it excludes `content/`) or served. They exist so the research already done is not lost.

Each organ below has a draft article (`<id>.json`, the `anatomy.json` entry format) and a sentence ledger
(`<id>.ledger.json`: every sentence, the URL it was taken from, what the returned text said, and whether it is `excerpt` or
`textbook`). Check the shape of a draft with `python3 -I tools/verification/validate_article.py <draft>.json`.

| Organ id | Words | Ledger entries | `textbook` sentences | References | Notes |
| --- | --- | --- | --- | --- | --- |
| `ureters` | 697 | 39 | 0 | 10 | no NHS page returned; "roughly 25 to 30 cm" is the one length figure; 700 searches a month |
| `pituitary` | 726 | 39 | 1 | 16 | 800 searches a month |
| `thymus` | 659 | 42 | 2 | 16 | thinnest: the OpenStax structure search was refused; 450 searches a month |

**Merged after the second pass** (1 November 2026; their ledgers and second-pass reports are in `docs/verification/anatomy/<id>/`):
skull, hand, adrenals, small-intestine, pelvic-girdle, bladder, testes.

**Not drafted at all**, in the order people search for them (US monthly searches, `docs/seo/keyword-research.md`): foot
(90,000), shoulder-girdle (45,000), penis (21,000), prostate (5,000), gallbladder (4,400), rib-cage (3,500), spleen (2,600),
uterine-ligaments (900). Their organ pages stay `noindex` until an article is merged. Foot and shoulder girdle are the two
largest gaps on the whole site.

## What "first pass" means, and why these are not merged

Each draft was written only from text returned by domain-restricted web searches (CLINICAL.md section 5.5, step one). The
**second, adversarial pass has not been run** for the three drafts above: nobody has yet re-retrieved the cited pages
independently and classified each sentence as supported, textbook knowledge, unsupported, wrong or unsafe. Until that is done
the articles must not be added to `anatomy.json`, because the "facts checked against the cited sources" label on an organ page
would not be true. The summaries the search tool returns blend several result pages and rarely say which page a statement
came from, so the writers attributed some sentences by inference; the second pass found 62 of 351 sentences of the first seven
articles unsupported or wrong, so expect about one in six of these to change too.

## To finish a draft

1. For each ledger entry, search the cited publisher's domain for that statement (one narrow topic per query) and classify the
   sentence. Remove or rewrite anything unsupported, wrong or unsafe, and confirm that the cited URL is the page that carries
   the statement. Exact page-title queries ("Anatomy, Abdomen and Pelvis: Duodenum") give the cleanest single-source
   summaries; use the domain `nhs.uk` (not `www.nhs.uk`, which returns nothing).
2. Clean the reference list: drop `?report=reader`, `?redirect=true` and `?dopt=Abstract` suffixes, keep at least two
   publishers with one official health body, and keep numbers out of the prose unless they are descriptive anatomy.
3. Copy the article into `content/anatomy.json` under the organ id with `"updated": "<date of the check>"`, then run
   `python3 tools/build-content.py` and the smoke test. The organ page becomes indexable as soon as it has an article.
   Write the title as people search (hand bones, testicle anatomy) and a descriptor whose leading comma-separated topics
   stand alone, because only those survive in a 65-character `<title>`.
4. Move the ledger and the second-pass report to `docs/verification/anatomy/<id>/`.

## Check hardest in the second pass (writers' notes)

* **ureters**: weakest page-level attribution in the colon and uterine-artery relations, the length, the pelvic-brim nuance and
  the ultrasound sentence. The atlas regex for `ureters` also matches two renal-artery segments; they are deliberately not in
  `structures`.
* **pituitary**: the hypophyseal artery sentence comes from a PMC review of pituitary apoplexy, not StatPearls; the
  peripheral-vision and headache sentences cite two trust leaflets without saying which; "pea-sized" is attributed to the NHS
  acromegaly page; the TSH and growth hormone actions cite OpenStax 17.3 but may come from an OpenStax Biology page. One
  `textbook` sentence: ADH and oxytocin actions.
* **thymus**: "replaced by fat at puberty" cites two MedlinePlus pages; the androgen explanation of involution cites both
  StatPearls entries; one `textbook` fact (each lobe divided into lobules with cortex and medulla) twice; the 22q11.2
  sentences cite a PMC guideline.

## Budget

`WebSearch` allows 200 calls per turn, shared by every agent in the turn. A second pass costs 25 to 30 searches per article
and a first pass 25 to 45, so plan on three or four articles per turn, or raise `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`.
Direct reads of the publisher pages (nhs.uk, openstax.org, ncbi.nlm.nih.gov, fda.gov, medlineplus.gov, cancer.gov and others)
fail from the cloud sandbox unless the host is allowed under the environment's network access settings, which would make the
second pass faster and more reliable than search summaries.
