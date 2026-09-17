# SEO architecture as implemented

How the *Anatomy Nexus SEO Architecture Specification* is realised in this codebase, what each part of the
build guarantees, and the short list of things only the site owner can do (search-engine consoles, a
contact mailbox, medical reviewers).

## 1. Server-rendered pages (static site generation)

Every page that should rank is delivered as complete HTML in the initial response. `tools/package-site.py
--pretty --prerender` runs `tools/prerender.mjs`, which opens each page in headless Chromium, waits for the
page script to finish, and writes the result to `dist/<path>/index.html` with `data-prerendered` on `<body>`.
The initial HTML therefore carries the title, meta description, canonical link, robots directive, Open Graph
and Twitter tags, JSON-LD, breadcrumbs, H1, body copy, related-topic links, references and the editorial
block. In the browser the same scripts then only *hydrate*: they bind the menu, header search, theme toggle,
hub filters and the click-to-load 3D model, and never redraw content.

`tools/qa/smoke.mjs` (run by the QA workflow on every push and by the live check against production)
verifies the raw HTML of sample pages contains all of that and no `Loading…` placeholder.

## 2. URL architecture

One canonical, lowercase, hyphenated, trailing-slash URL per entity, flat under its section:

| Section | Canonical URL | Notes |
| --- | --- | --- |
| Anatomy (organs) | `/anatomy/heart/` | canonical entity page; `/organs/` is a browse hub, `/organs/<id>/` 301s here |
| Body systems | `/systems/heart/` | the atlas systems (ids are stable deep-link keys of the explorer) |
| Physiology … Health | `/physiology/cardiac-cycle/`, `/symptoms/chest-pain/`, `/conditions/hypertension/`, `/tests/complete-blood-count/`, `/imaging/x-ray/`, `/procedures/angioplasty/`, `/medications/amlodipine/`, `/drug-classes/statins/`, `/first-aid/cpr/`, `/health/sleep/` | |
| Medical terms | `/medical-terms/#distal` | one substantial glossary page; per-term pages are deliberately not published while entries are short |
| Hubs | `/anatomy/`, `/organs/`, `/systems/`, `/conditions/` … `/medical-terms/`, `/study/`, `/explorer/` | |
| Policies | `/about/`, `/editorial-policy/`, `/medical-review-policy/`, `/references-policy/`, `/corrections-policy/`, `/disclaimer/`, `/contact/` | linked from every footer |
| Noindex | `/search/`, `/roadmap/`, `/explorer/?embed=1`, `?cat=` hub filters (canonical → hub), organ pages without an article, any entity failing the quality gate | |

Ids were renamed to their canonical form (`cbc → complete-blood-count`, `xray → x-ray`, `ct → ct-scan`,
`pet → pet-scan`); the old ids live on as aliases.

The clinical layer (v1.2) adds `/biomarkers/<slug>/`, `/targets/<slug>/` and `/compare/<slug>/`
as indexable sections with their own sitemaps, and `/interactions/` (the checker) as a `noindex`
tool page that is linked but never in a sitemap; no interaction pair pages are generated
(specification §88). Single-analyte tests that were folded into panel pages now have canonical
pages of their own (`/tests/troponin/`, `/tests/bnp/`, `/tests/crp/`, `/tests/esr/`,
`/tests/tsh/`, `/tests/ferritin/`, `/tests/creatinine-egfr/`); the old ids
(`cardiac-biomarkers`, `inflammatory-markers`) and the analyte aliases that pointed at panels
(`egfr`, `creatinine`, `tsh`) are 301 aliases of the new pages, so nothing indexed breaks.

## 3. Synonyms, aliases and 301 redirects

Every entity carries `aliases` (display synonyms, used in search, headings and schema `alternateName`) and
`urlAliases` (slugs that must resolve to the page). The compiler validates that no alias collides with a
page id or another alias and writes `data/content/aliases.json`; `tools/package-site.py` turns it into
one-hop 301 rules in `.htaccess` (205 aliases: `/tests/cbc/`, `/medications/norvasc/`, `/conditions/heart-attack/`,
`/anatomy/cardiac/`, `/organs/kidney/` …). The same file generates: query URLs → clean URLs
(`/conditions/condition.html?id=gout` → `/conditions/gout/`), `index.html` → directory, missing trailing
slash → with slash, `/organs/<id>/` → `/anatomy/<id>/`, `/learn/terminology.html` → `/medical-terms/`,
`http://` and `www.` → `https://` apex in a single hop. Unknown slugs return a real 404 (`404.html`).
`tools/qa/serve.py` emulates all of these rules locally and the smoke test asserts them.

## 4. Metadata and structured data (`site/seo.js`)

* Title pattern `[Entity]: [Descriptor] | Anatomy Nexus`, descriptor per type (conditions: *Causes, Symptoms &
  Treatment*; tests: *Purpose, Procedure & Results*; medications: *Uses, Mechanism & Side Effects*; anatomy
  articles carry their own, e.g. *Heart Anatomy: Chambers, Valves, Blood Supply & Function*). The descriptor is
  dropped when the title would exceed 70 characters. Every title and description is unique (asserted).
* Meta description from the entity's lead paragraph, cut at a word boundary under 155 characters. Per-entity
  overrides: `seoTitle`, `metaDescription`.
* Canonical, robots, `og:type/site_name/title/description/url/image` (a per-page 3D preview image) and
  Twitter card on every page; `google-site-verification` / `msvalidate.01` when set in `content/site.json`.
* JSON-LD `@graph`: `Organization`, `WebSite` (with `SearchAction` → `/search/?q=`), `BreadcrumbList`,
  `MedicalWebPage` (author organisation, `dateModified`, structured `citation` list; `lastReviewed` only once a
  review has happened) and the entity node: `AnatomicalStructure`, `AnatomicalSystem`, `MedicalCondition`,
  `MedicalSignOrSymptom`, `MedicalTest`, `ImagingTest`, `MedicalProcedure`, `Drug` (with `DrugClass`),
  `DrugClass`, `HowTo` (first aid), `DefinedTermSet` (terminology), `CollectionPage` + `ItemList` (hubs).
  Schema is generated from the same data the page shows; nothing is added that is not visible.

## 5. Breadcrumbs, internal linking, related topics

Visible breadcrumb lists (`<nav aria-label="Breadcrumb"><ol>`) plus `BreadcrumbList` schema:
*Home › Medical tests › Heart tests › ECG*, *Home › Medications › Calcium channel blockers › Amlodipine*,
*Home › Anatomy › Heart (system) › Heart*. All links are generated from the knowledge graph (forward links ∪
computed backlinks): the *Related topics* block groups them by type in a fixed order; *In the body* links the
organs, systems and atlas structures; hubs link every entity (A–Z groups, categories, "start here"
priority pages, body systems, other sections). Every page is reachable within three clicks of the home page
and the smoke test fails on any broken or redirecting internal link.

## 6. Credibility (YMYL)

* `content/site.json` holds the site identity and editorial fields (author, review status, verification codes).
* Every entity page ends with an *About this page* block: author, medical-review status (honestly "not yet
  independently reviewed" until a reviewer exists), last-updated date and source count, linking the policies.
* References are first-class objects: title, URL, publisher, evidence tier (1 official bodies / guidelines /
  societies, 2 textbooks / journals / academic centres, 3 charities and secondary resources) and the date
  checked. The compiler classifies the publisher from a host table and warns on unknown hosts. 298 references
  across 206 topics; physiology is sourced to the open OpenStax *Anatomy & Physiology* textbook and NIH.
* `tools/check-references.py` fetches every reference URL; the *Reference links* workflow runs it weekly and on
  every content change and fails on a dead link.
* Policy pages: about, editorial, medical review, references, corrections, disclaimer, contact.

## 7. Quality gate and content dates

`tools/build-content.py` gives every entity `seo.index`: false (published `noindex,follow`, left out of the
sitemaps) unless it has a lead paragraph, at least 600 characters of body text, at least one reference and at
least two relationship groups. Organ pages are indexable only when `content/anatomy.json` has a full article
(12 today: heart, brain, lungs, liver, kidneys, stomach, pancreas, aorta, coronary arteries, knee, spine, large
intestine). Each content file carries `_updated`, changed by hand when visible content changes; it feeds the
"Last updated" line, `dateModified` and the sitemap `lastmod` (never today's date automatically).

## 8. Sitemaps and robots

`/sitemap.xml` is an index of `/sitemaps/pages.xml`, `anatomy.xml`, `systems.xml`, `physiology.xml`,
`symptoms.xml`, `conditions.xml`, `tests.xml`, `imaging.xml`, `procedures.xml`, `medications.xml`,
`drug-classes.xml`, `first-aid.xml`, `health.xml`, containing only canonical, indexable, 200-status URLs with
meaningful `lastmod`. `robots.txt` allows everything except `/tools/`, `/search/` and `?embed=` views and names
the sitemap. Rendering assets are never blocked.

Sections of the sitemap index in v1.2: pages, anatomy, systems, physiology, symptoms, conditions,
tests, biomarkers, imaging, procedures, medications, drug-classes, targets, first-aid, health,
compare.

## 9. Performance

Article pages no longer load the 13 MB model: the 3D view is a static preview image (`site/previews/`, rendered
by `tools/render-previews.mjs`, also used as `og:image`; an organ the male reference body does not model, such as the
uterus or the breasts, shows the modelled structures around it) with a *Load the 3D model* button that swaps in the
explorer iframe; without scripts the button is a link to the explorer. Pages ship as static HTML with no
client-side rendering on the critical path, one small stylesheet and no web fonts; images carry width and
height; the model, JSON and vendor code have long cache lifetimes (`.htaccess`).

## 10. Owner checklist (needs the site owner's Google account)

Search Console and Analytics can only be set up from a browser signed in to the owner's Google account. The
site is prepared so that each takes one value pasted into `content/site.json` and a release.

1. **Google Search Console** (https://search.google.com/search-console): *Add property* → **Domain** →
   `anatomynexus.com`. Google shows a DNS record `google-site-verification=…`. Either add it as a TXT record on
   the domain (hPanel → Domains → anatomynexus.com → DNS / Name servers → Manage DNS records: type TXT, name `@`,
   value the token; or hand the token to the deployment assistant, which adds it through the Hostinger API), then
   press *Verify*. As a second method, the *HTML tag* token goes into `verification.google` in
   `content/site.json`: every page then carries the `google-site-verification` meta tag after the next release.
   Once verified: *Sitemaps* → submit `https://anatomynexus.com/sitemap.xml`. Watch *Pages* (indexing),
   *Enhancements* (breadcrumbs, rich results) and *Core Web Vitals*.
2. **Google Analytics 4** (https://analytics.google.com): *Admin* → *Create property* → web data stream for
   `https://anatomynexus.com` → copy the **Measurement ID** (`G-XXXXXXXXXX`) into `analytics.ga4` in
   `content/site.json` and release. The pages then load Google's tag from our own loader (`site/site.js`, no
   inline script), and the packager widens the Content-Security-Policy for the tag's hosts. With the field empty
   the site ships no third-party script at all. Search Console can also be verified through the Analytics tag
   once it is live and the same Google account has *edit* rights on the GA property.
3. **Bing Webmaster Tools**: import the Search Console property or verify with `verification.bing`; submit the
   sitemap; optionally enable IndexNow.
4. **Contact mailbox**: set `contact.email` in `content/site.json` (it is published in the Organization schema
   and the contact page) once a mailbox such as `hello@anatomynexus.com` exists; until then the contact page
   points at the public issue tracker.
5. **Medical reviewers**: when a qualified clinician reviews pages, record them (name, credential, date) so the
   editorial block, `lastReviewed` and a reviewer page can show real information. Never invent credentials.
6. **404 monitoring** comes from Search Console's crawl reports; recurring 404s become aliases in the content.

## Release checklist for a content change

1. Edit `content/*.json`; bump the file's `_updated`; add `urlAliases` for any synonym people search for.
2. `python3 tools/build-content.py` (fails on any dangling link, alias clash, malformed reference or missing
   date; prints pages that fail the quality gate).
3. `node tools/render-previews.mjs` if new organs, systems or structure views were added (needs a local
   server and Playwright).
4. `python3 tools/package-site.py --site-url https://anatomynexus.com --pretty --prerender` then
   `python3 tools/qa/serve.py --dir dist` and `cd tools/qa && BASE_URL=http://127.0.0.1:8124/ PRETTY_URLS=1 PRERENDERED=1 node smoke.mjs`.
5. Commit, push (QA and Reference-links workflows run), cut a release (Actions → Release → version), run the
   Live site check.
