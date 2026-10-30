# Anatomy article drafts (first pass only)

These are **drafts, not published content**. Nothing in this folder is read by `tools/build-content.py`, copied by
`tools/package-site.py` (it excludes `content/`) or served. They exist so the research already done is not lost.

Each organ below has a draft article (`<id>.json`, the `anatomy.json` entry format) and a sentence ledger
(`<id>.ledger.json`: every sentence, the URL it was taken from, what the returned text said, and whether it is `excerpt` or
`textbook`). The shape was checked with a validator (title, descriptor, intro, key facts, 5 to 8 sections, atlas structure
names, at least two publishers with one official health body, no clinical numbers in the prose).

| Organ id | Words | Ledger entries | `textbook` sentences | References | Notes |
| --- | --- | --- | --- | --- | --- |
| `skull` | 988 | 52 | 0 | 10 | |
| `small-intestine` | 957 | 50 | 2 | 14 | |
| `bladder` | 1011 | 59 | 0 | 18 | urethra covered with the bladder, as the 3D page groups them |
| `ureters` | 697 | 39 | 0 | 10 | no NHS page returned; "roughly 25 to 30 cm" is the one length figure |
| `testes` | 1021 | 53 | 1 | 16 | |
| `pelvic-girdle` | 1065 | 52 | 0 | 21 | clinical section is long |
| `hand` | 676 | 37 | 0 | 12 | thin: blood supply, nerves and joints not researched |
| `adrenals` | 830 | 48 | 0 | 14 | |
| `pituitary` | 726 | 39 | 1 | 16 | |
| `thymus` | 659 | 42 | 2 | 16 | thinnest: the OpenStax structure search was refused |

Not drafted at all (no search budget left): gallbladder, spleen, prostate, penis, uterine-ligaments, rib-cage,
shoulder-girdle, foot. The 18 organ pages without an article stay `noindex` until an article is merged.

## What "first pass" means, and why these are not merged

Each draft was written only from text returned by domain-restricted web searches (CLINICAL.md section 5.5, step one). The
**second, adversarial pass has not been run**: nobody has yet re-retrieved the cited pages independently and classified each
sentence as supported, textbook knowledge, unsupported, wrong or unsafe. Until that is done the articles must not be added to
`anatomy.json`, because the "facts checked against the cited sources" label on an organ page would not be true. The summaries
the search tool returns blend several result pages and rarely say which page a statement came from, so the writers
attributed some sentences by inference; the lists below name the weakest ones.

## To finish a draft

1. For each ledger entry, search the cited publisher's domain for that statement (one narrow topic per query) and classify the
   sentence. Remove or rewrite anything unsupported, wrong or unsafe, and confirm that the cited URL is the page that carries
   the statement. Exact page-title queries ("Anatomy, Abdomen and Pelvis: Duodenum") give the cleanest single-source
   summaries; the domain `www.nhs.uk` returns condition pages, plain `nhs.uk` mostly trust leaflets.
2. Clean the reference list: drop `?report=reader`, `?redirect=true` and `?dopt=Abstract` suffixes, keep at least two
   publishers with one official health body, and keep numbers out of the prose unless they are descriptive anatomy.
3. Copy the article into `content/anatomy.json` under the organ id with `"updated": "<date of the check>"`, then run
   `python3 tools/build-content.py` and the smoke test. The organ page becomes indexable as soon as it has an article.
4. Reconcile `organs.json` where a draft disagrees with the organ summary (see the small intestine below).

## Check hardest in the second pass (writers' notes)

* **skull**: the foramen magnum and optic canal facts came from one StatPearls summary that did not say which page held which
  fact. The lambdoid suture is written as meeting "the parietal bones" (the source also said temporal). Fontanelle closure is
  "early childhood" (the source gave an age). Dropped for lack of a source: craniosynostosis, nerve supply of the skull and
  scalp, the pituitary in the sella turcica, carotid canal and jugular foramen contents, facial fractures, concussion.
* **small-intestine**: the duodenum's C shape around the pancreatic head (cited to StatPearls Pancreas), coeliac villous
  flattening (NHS Borders leaflet), capillaries versus lacteals (OpenStax Pharmacology 29.3), the "deep circular folds"
  wording (OpenStax 23.5), the duodenal ulcer sentence (NHS Stomach ulcer). `organs.json` calls it "about six metres"; the
  OpenStax text retrieved gives about three metres in a living person and about twice that in a cadaver, and the draft
  follows OpenStax.
* **bladder / ureters**: weakest page-level attribution in the four-parts and rectum/vagina relations, the vesical veins and
  nerve details, the hypogastric supply (bladder), and the colon and uterine-artery relations, the length, the pelvic-brim
  nuance and the ultrasound sentence (ureters). The atlas regex for `ureters` also matches two renal-artery segments; they are
  deliberately not in `structures`.
* **testes**: tubuli recti, rete testis and efferent ductules (StatPearls Testes / Endotext), pampiniform plexus in front of
  the deferent duct, Leydig cells (OpenStax key terms), undescended-testis risks, torsion advice (cited to an NHS Essex ICB
  page because no nhs.uk torsion page came back). One `textbook` sentence: the deferent duct is also called the vas deferens.
* **pelvic-girdle**: the hip-bone "basin" sentence, sacroiliac arteries, the pubic rami sentences and the pelvic girdle pain
  sentences (an NHS Wales page whose owner the result did not name).
* **hand**: scaphoid and wrist-fracture sentences co-cite two or three trust leaflets; the carpal tunnel sentences cite a PMC
  review and a leaflet whose text the search did not show.
* **adrenals**: the pyramid-versus-crescent wording (StatPearls NBK482264), "close to the liver" paraphrasing "below the
  liver", the phaeochromocytoma "paroxysmal attacks" sentence (one NCI page).
* **pituitary**: the hypophyseal artery sentence comes from a PMC review of pituitary apoplexy, not StatPearls; the
  peripheral-vision and headache sentences cite two trust leaflets without saying which; "pea-sized" is attributed to the NHS
  acromegaly page; the TSH and growth hormone actions cite OpenStax 17.3 but may come from an OpenStax Biology page. One
  `textbook` sentence: ADH and oxytocin actions.
* **thymus**: "replaced by fat at puberty" cites two MedlinePlus pages; the androgen explanation of involution cites both
  StatPearls entries; one `textbook` fact (each lobe divided into lobules with cortex and medulla) twice; the 22q11.2
  sentences cite a PMC guideline.

## Budget

`WebSearch` allows 200 calls per turn, shared by every agent in the turn. A first pass cost 25 to 45 searches per article and
the second pass costs about as much, so plan on three or four articles per turn, or raise
`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`. Direct reads of the publisher pages (nhs.uk, fda.gov, medlineplus.gov,
cancer.gov and others) fail from the cloud sandbox unless the host is allowed under the environment's network access settings,
which would make the second pass faster and more reliable than search summaries.
