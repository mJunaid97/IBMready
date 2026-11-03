# Worker brief (conditions-b)
Repo /home/user/IBMready. Read docs/authoring/README.md and docs/authoring/conditions.md fully, and look at docs/authoring/templates/condition.example.json and content/conditions.json entries `lung-cancer` and `gerd`. Work only inside content/drafts/batches/conditions-b/ (work/ for your files). Do not git commit/push.
Tool: WebSearch (deferred; load with ToolSearch "select:WebSearch"). Budget is shared by the whole session: be frugal, count every call.
Always pass allowed_domains with several hosts, e.g. ["nhs.uk","nice.org.uk","cancerresearchuk.org","cancer.gov","medlineplus.gov","macmillan.org.uk","ncbi.nlm.nih.gov", + the item's charity hosts]. mode "extended" for broad queries, "standard" for narrow.
Do not use WebFetch.
Rules recap: UK English; describe don't instruct; no doses/cut-offs/test thresholds; numbers only if retrieved text states them, attributed; name the route to care (999, NHS 111/same-day GP, routine GP); no survival statistics unless source gives them with a year (prefer words); no "safe/cured/nothing to worry about"; paraphrase.
Check the screening wording carefully if relevant. Only use ids from the lists in docs/authoring/conditions.md and existing ids in content/conditions.json (related must exist: e.g. hypothyroidism, hyperthyroidism, urinary-tract-infection, lung-cancer, colorectal-cancer, breast-cancer, pancreatitis, cirrhosis...).
Article: 4-7 sections each 110-220 words, 4-6 faqs (40-90 words each), 5-7 keyFacts; 800-1200 words in article; overview 250-700 chars; references >=3 from >=2 publishers incl. an official one; plain paragraphs separated by \n\n.

## Lessons from pancreatic-cancer (first item, validated ok)
- category `digestive` accepted; `affects` = {organs, systems} (omit `structures`). Aliases of the plain kind are fine.
- Build entity and ledger together with a small generator script in the scratchpad so ledger sentences equal the entity text exactly (split paragraphs into sentences; `where` like "causes[0]", "article.sections[2]", "article.faqs[1].a", "article.keyFacts[3]").
- Write conservatively: summaries blend pages, so keep only claims the retrieved text states; skip statistics and inherited-risk percentages unless the text gives them with a source. Prefer claims two publishers agree on.
- Route-to-care: name 999 only where retrieved text supports it (e.g. NHS says call 999/A&E for heavy bleeding or severe symptoms); otherwise name urgent GP / NHS 111 / routine GP.
- Test file: write work/<id>.fragment.json = {"conditions": {"<id>": entity}} and run python3 /home/user/IBMready/tools/verification/check_batch.py on it (cwd /home/user/IBMready) until it ends ok.
