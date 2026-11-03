# guides-medicines: batch report

Twelve guides, all through the two-pass protocol (separate author and checker subagents). `check_batch.py` on `fragment.json` ends "ok".
Searches used: about 180 of 200 (authors about 87, checkers about 92; a few calls were refused by a usage limit and are included).
Topics from the seed list not written: steroid tablets (prednisolone), proton pump inhibitors (omeprazole), medicines and driving (budget).

Every guide is shorter than the author's first draft because the second pass removed unsupported sentences. Several bodies are below the 700-word
guideline (antidepressants 616, alcohol and antibiotics 575, antibiotics and viruses 593, statins 632); they were not padded.

## Guides (first-pass counts from the second-pass report)
- how-long-antidepressants-take-to-work (28 supported, 2 textbook, 14 unsupported, 1 wrong; body 616 words, below target; crisis route present; 7 searches)
- warfarin-apixaban-medicines-and-food (27 supported, 15 unsupported; body 797 words; review: missed-dose rules, vitamin K/DOAC statements and the paracetamol INR caveat rest on NHS inform, SPS and trust pages rather than nhs.uk; apixaban alcohol sources conflict and the text says so; 6 searches)
- ibuprofen-and-paracetamol-together (25 supported, 2 textbook, 22 unsupported; body 755 words; review: NHS adult ibuprofen page itself never read, NHS pages differ on ibuprofen overdose 111 vs 999 so it is left out; 7 searches)
- metformin-what-to-expect (26 supported, 1 textbook, 10 unsupported, 1 wrong; body 742 words; review: Diabetes UK and NHS pregnancy-page claims rest on search summaries; 7 searches)
- alcohol-and-antibiotics (29 supported, 2 textbook, 18 unsupported; body 575 words, below target; review: its report was classified partly by keyword rules so per-claim url/newSentence fields are incomplete; NHS 111 Wales page seen via summaries only; one reference is an ouh.nhs.uk leaflet; 8 searches)
- ace-inhibitors-arbs-and-amlodipine-compared (28 supported, 1 textbook, 22 unsupported; body 783 words; review: NICE NG136 points kept from nice.org.uk search results only; missed-dose advice verified for amlodipine only; no explicit pharmacist/GP route for non-urgent questions, only 999, NHS 111 and 'a doctor'; 8 searches)
- opioid-painkillers-explained (18 supported, 25 unsupported, 1 wrong; body 717 words; weak/strong section, FRANK number and fpm.ac.uk reference removed; tolerance attributed to the NHS tramadol page; 8 searches)
- reliever-and-preventer-inhalers (22 supported, 2 textbook, 22 unsupported, 1 wrong; body 692 words; 'never a reliever alone' reattributed to NHS inform; 8 searches)
- why-antibiotics-do-not-work-for-viruses (24 supported, 1 textbook, 22 unsupported; body 593 words, below target; review: nhs.uk Antibiotics/Antibiotic resistance pages never returned so NHS inform and NHS England carry those claims; 'finish the course' reported as attributed statements, not an instruction; UKHSA-type sentence sourced to the DHSC campaign page; 8 searches)
- statins-common-questions-answered (first-pass 45 sentences: 33 supported, 2 textbook, 10 unsupported; body 632 words, below the 700 target; searches: author 7, checker 9)
- sedating-and-non-sedating-antihistamines (33 supported, 1 textbook, 11 unsupported, 2 wrong; body 759 words; chlorphenamine driving line and 999 allergy list reworded to retrieved text; MedlinePlus (US) added as second publisher; 8 searches)
- levothyroxine-timing-and-other-medicines (30 supported, 10 unsupported, 1 unsafe (a 999 sentence, removed); body about 705 words; nhs.uk attributions rest on search summaries quoting the page; calcium/iron spacing labelled US and cites NHS trust leaflets; thyroid-crisis signs carry the NHS 111 route only; 7 searches)

## For a human reviewer
- Search summaries blended pages throughout; nhs.uk sub-pages often did not return as their own text. Several attributions rest on summaries that named the page.
- ace-inhibitors guide has no explicit pharmacist/GP route for non-urgent questions (only 999, NHS 111, "a doctor").
- alcohol-and-antibiotics report was classified partly by keyword rules, so per-claim url/newSentence fields are incomplete.
- Site contradiction: the site's salbutamol page calls it "safe" and gives a "more than twice a week" threshold; the inhalers guide does neither.
- fpm.ac.uk is absent from HOST_META in tools/build-content.py and OFFICIAL in tools/validate_article.py; the opioid guide no longer cites it.
- No medicine names in these guides were found to clash with content/interactions.json by the author sessions (not checked exhaustively).
