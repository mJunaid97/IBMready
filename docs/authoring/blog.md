# Blog: guides and health news briefs

Templates: `docs/authoring/templates/guide.example.json` and `news.example.json`. Collection name in a fragment: `blog`, key = the slug
(`who-child-obesity-guidelines`); one post per key. Read `docs/authoring/README.md` first.

## Two kinds

**News brief** (`"kind": "news"`): a short, dated summary of one announcement by an official body (WHO, NICE, UKHSA, NHS England, MHRA,
GOV.UK, CDC, FDA, NIH, EMA, a Royal College). It reports what the publisher says, attributed, in your own words. 150 to 350 words. It
is never advice, never a prediction, never a verdict on the announcement.

**Guide** (`"kind": "guide"`): an evidence-based explainer that answers one question people search ("What does a high CRP mean?",
"How long does flu last?", "Is ibuprofen or paracetamol better for ...?" only when the sources compare them). 800 to 1,200 words, five to seven
sections, built from the retrieved text of at least two publishers and tied to the site's pages through `links`.

## Fields

| Field | Rules |
| --- | --- |
| slug (the key) | lowercase hyphenated; for news start with the subject, not the date; unique. |
| `name` | **15 to 49 characters**: it is the page title (`<name> | Anatomy Nexus` must fit 65). Specific and plain ("WHO issues first child obesity guidelines"). |
| `headline` | optional longer on-page headline (15 to 120 characters). |
| `kind` | `news` or `guide`. |
| `published` | news: the date of the announcement (`YYYY-MM-DD`); guide: today. `updated`: the date you checked the sources (today). |
| `summary` | 60 to 400 characters: the whole story in one or two sentences. It becomes the lead paragraph and the meta description, so make it answer the question or state the news. |
| `keyPoints` | 2 to 6 sentences (15 to 260 characters each): the takeaways. |
| `body` | list of `{"heading", "body"}`; body is plain paragraphs separated by a blank line; no markdown. News: 2 to 3 sections ("What was announced", "Why it matters" or "What it means", optionally "What happens next" only if the announcement says). |
| `source` | **news only, required**: `{"publisher": "NICE", "title": "exact title of the announcement page", "url": "https://...", "published": "YYYY-MM-DD"}`. It is shown as the "Source" box and added as the first reference. |
| `references` | news: the source plus up to 3 more (a second publisher that reports the same, the NHS page the site's readers should read); guide: at least 2 (one official). |
| `links` fields | put the link fields at the top level of the post, not inside `links`: `conditions`, `medications`, `tests`, `symptoms`, `physiology`, `health`, `procedures`, `imaging`, `biomarkers`, `drugClasses` (ids of existing pages; at least one group is required so the post is published). Link the pages the post is about; do not pad. |
| `anatomy` | optional `{"organs": [...], "systems": [...]}`: shows the "where in the body" figure. |

## News: how to find and verify items

1. Discovery: search by publisher and topic with a date in the query ("WHO news release October 2026", "NICE draft guidance recommends 2026 news",
   "UKHSA press release 2026 vaccine", "MHRA drug safety update 2026", "NHS England announces 2026"), restricted to that publisher's domain
   (`who.int`, `nice.org.uk`, `gov.uk`, `england.nhs.uk`, `nhs.uk`, `cdc.gov`, `fda.gov`, `nih.gov`, `ema.europa.eu`, `afro.who.int`). One discovery call returns
   several items with titles, URLs and a dated summary; take only items whose date you can read in the result or the page URL.
2. Choose items that matter to the public and connect to pages this site has (a condition, a medicine, a test, a vaccine, a health topic). Skip
   statistics releases, appointments, funding and policy politics, and anything you cannot summarise accurately from the retrieved text.
3. Verify each chosen item with a second search for its exact title (restricted to the publisher) and confirm the date and each fact you state.
   Drop any fact the second search does not confirm. A news brief states only what the announcement says; no numbers unless the retrieved
   text states them; outbreak and case counts change, so give the date they refer to or leave them out.
4. Prefer announcements from the last eight weeks, newest first, and spread across publishers and topics (do not write ten items about one announcement).

## Guides: finding topics

Prefer questions where the site already has the underlying pages (so the guide links to them) and where retrieved UK sources answer the question
directly. Do not write a guide that merely restates one existing page; combine what a reader needs across pages and sources (for example,
"What does a high CRP mean, and what happens next?" draws on the CRP page, the conditions it is raised in, and NHS/NICE sources).

## Check

`python3 tools/verification/check_batch.py <fragment.json>` validates the schema, the ids and that each post would be published.
