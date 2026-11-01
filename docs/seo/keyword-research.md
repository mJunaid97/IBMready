# Keyword research: what people search for, and which pages answer it

Measured with Ahrefs (Keywords Explorer, United States, 1 November 2026). Volume is average monthly searches; difficulty (KD, 0 to
100) is how hard it is to rank in the top ten. The site is new: Ahrefs shows one organic keyword, no organic traffic and a domain
rating of 0, so the aim is queries where KD is low enough for a new domain to rank on content quality alone. The United States is
the largest English-speaking market for these terms; UK volumes are lower but follow the same order.

## Anatomy queries, with the page that should answer each

| Search | Volume | KD | Page | Status |
| --- | ---: | ---: | --- | --- |
| knee anatomy | 54,000 | 3 | `/anatomy/knee/` | article, title now "Knee Anatomy" |
| foot anatomy | 50,000 | 0 | `/anatomy/foot/` | **no article** (page is noindex) |
| foot bones | 40,000 | 4 | `/anatomy/foot/` | **no article** |
| hand bones | 41,000 | 14 | `/anatomy/hand/` | source-verified article, title "Hand Bones Anatomy" |
| bones of the hand | 13,000 | 10 | `/anatomy/hand/` | same page, H2 "Bones of the hand" |
| heart anatomy | 41,000 | 10 | `/anatomy/heart/` | article |
| shoulder anatomy | 39,000 | 12 | `/anatomy/shoulder-girdle/` | **no article** |
| shoulder bones | 6,400 | 4 | `/anatomy/shoulder-girdle/` | **no article** |
| spine anatomy | 28,000 | 15 | `/anatomy/spine/` | article |
| penis anatomy | 21,000 | 39 | `/anatomy/penis/` | **no article** (needs careful sourcing) |
| pelvic floor muscles | 20,000 | 47 | `/anatomy/pelvic-floor/` | article |
| brain anatomy | 20,000 | 52 | `/anatomy/brain/` | article |
| skull anatomy | 14,000 | 8 | `/anatomy/skull/` | source-verified article |
| bones of the skull | 9,500 | 16 | `/anatomy/skull/` | same page (intro and H2 "Brain case and facial bones") |
| kidney anatomy | 12,000 | 22 | `/anatomy/kidneys/` | article |
| pelvis anatomy | 11,000 | 3 | `/anatomy/pelvic-girdle/` | source-verified article, title "Pelvis Anatomy" |
| pelvic bones | 7,300 | 3 | `/anatomy/pelvic-girdle/` | same page |
| lung anatomy | 9,900 | 36 | `/anatomy/lungs/` | article |
| liver anatomy | 8,300 | 40 | `/anatomy/liver/` | article |
| testicle anatomy | 7,200 | 22 | `/anatomy/testes/` | draft, second pass under way |
| hip bone anatomy | 5,300 | 8 | `/anatomy/pelvic-girdle/` | same page |
| prostate anatomy | 5,000 | 12 | `/anatomy/prostate/` | **no article** |
| gallbladder anatomy | 4,400 | 23 | `/anatomy/gallbladder/` | **no article** |
| rib cage anatomy | 3,500 | 18 | `/anatomy/rib-cage/` | **no article** |
| small intestine anatomy | 3,300 | 14 | `/anatomy/small-intestine/` | source-verified article |
| bladder anatomy | 3,000 | 5 | `/anatomy/bladder/` | source-verified article |
| spleen anatomy | 2,600 | 11 | `/anatomy/spleen/` | **no article** |
| adrenal gland anatomy | 1,000 | 5 | `/anatomy/adrenals/` | source-verified article |
| uterine ligaments | 900 | 3 | `/anatomy/uterine-ligaments/` | **no article** |
| pituitary gland anatomy | 800 | 0 | `/anatomy/pituitary/` | draft only |
| ureter anatomy | 700 | 5 | `/anatomy/ureters/` | draft only |
| thymus anatomy | 450 | 5 | `/anatomy/thymus/` | draft only |

## What follows from it

1. **The largest unanswered demand is the skeleton of the limbs.** Foot (90,000 searches a month across two phrasings, KD 0 to
   4) and shoulder (45,000, KD 4 to 12) have no article, so their pages are `noindex` and cannot rank. Write and verify these two
   before anything else, then rib cage, prostate, gallbladder and spleen. Each article must pass the two-pass protocol in
   CLINICAL.md 5.5 before it is merged: a first pass written only from retrieved text, then an independent second pass that
   re-retrieves every sentence.
2. **Pages that exist now carry the searched phrase.** Titles read "Hand Bones Anatomy: 3D Model, Carpals | Anatomy Nexus",
   "Pelvis Anatomy: 3D Model, Hip Bones, Sacrum | Anatomy Nexus" and so on: the phrase people type first, then the feature that
   sets the page apart from the flat diagrams and slide-deck results that fill the first page (an interactive 3D model, shown
   only where the model really holds the organ). Descriptions are the article's own opening sentence plus "Explore it in 3D", not
   a template, so each is different and answers the question in the result itself.
3. **Every organ page now shows a "where in the body" figure beside the 3D preview**, built from the real shapes of the 3D
   model, with a text equivalent. It helps a reader orient before loading 13 MB of model, and the figure and its caption add
   unique, relevant text to the page.
4. **Ranking needs links as well as content.** Ahrefs reports 405 referring domains, every one nofollow and every one a spam
   "SEO service" site first seen on 15 to 18 September 2026. They carry no value; do not buy links (it risks a manual action) and
   do not disavow unless Search Console reports one. Earn real links: university and school anatomy reading lists, the open
   educational resource directories, a partnership with a clinical or nursing school, and the Drug Interaction Checker, which is
   the most linkable single page on the site.
5. **Check that the site is indexed before judging results.** Submit the sitemap index (`/sitemap.xml`) in Google Search Console
   and Bing Webmaster Tools, confirm the verification tags (`content/site.json`), and use the URL Inspection tool on the new
   pages. Reading Search Console after four to eight weeks shows which queries actually bring impressions and what the
   click-through rate is; adjust titles from that data, not from this table.

## Queries not pursued

Head terms such as "human anatomy", "anatomy quiz" and "muscle anatomy" were not measured in this pass; large reference sites
serve them, and the site's study mode and 3D explorer are its answer, which should rank for long-tail and brand searches first.
Medicine and condition pages were not part of this pass either: those queries are dominated by the NHS, Mayo Clinic and
WebMD, and a new, unreviewed domain should not expect to out-rank them without clinician review and authority links (E-E-A-T).
