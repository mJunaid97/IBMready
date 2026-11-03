# UK availability notes for ten medicines (3 November 2026)

The review queue `regulatory_status_conflict` listed ten medicines whose UK record gives two supply classes (pharmacy or over the counter, and prescription)
without a note on what the difference is. Each record now carries a note written from the text the search tool returned for NHS, MHRA and emc pages
(first pass: one domain-restricted search per medicine, plus one for the Nexium Control reclassification), then re-checked by a separate subagent that
used differently worded searches (second pass, `second-pass.json`: 20 notes, 16 supported, 4 unsupported).

What the second pass changed: the sildenafil and tadalafil notes had said that one brand is the only pharmacy product and that "other brands" need a prescription;
no retrieved page says that, only that the 50 mg sildenafil tablet and Cialis Together (10 mg tadalafil) were reclassified. The notes now say exactly that
("Other strengths and larger packs need a prescription", "Other strengths need a prescription").

What the first pass found beyond the notes: MHRA moved Nexium Control 20 mg tablets from pharmacy to general sale on 27 January 2015
(GOV.UK news item and public assessment report), so esomeprazole gained an `otc` record next to its `pharmacy` and `prescription` records
(the emc also lists a pharmacy-only Nexium Control product). Nothing else in the data changed.

Limits, as in CLINICAL.md 5.6: the search tool returns summaries that blend pages, and the nhs.uk pages themselves could not be fetched, so the NHS statements
rest on the summaries (page-level attribution). Age limits (naproxen 15, fexofenadine 12, loperamide 12, lactulose 14) were retrieved twice. A pharmacist or the
current product label decides what can be sold to a particular person.
