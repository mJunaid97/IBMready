# Batch `shoulder`: the shoulder joint and rotator cuff, added to the shoulder-girdle article

Read `docs/authoring/README.md` (the evidence protocol, search budget and tips), CLINICAL.md section 5.5 and `content/drafts/anatomy/README.md` (how anatomy drafts are made) first.
Branch to push to: `claude/content-shoulder`. Batch directory: `content/drafts/batches/shoulder/`.

## Why

"Shoulder anatomy" is searched about 39,000 times a month (difficulty 12), "shoulder bones" 6,400. The page `/anatomy/shoulder-girdle/` covers the clavicle, the scapula and their two joints,
and not what most people searching mean: the shoulder (glenohumeral) joint, the rotator cuff, the deltoid and the proximal humerus. This batch writes that material so the page can be
retitled **Shoulder Anatomy** and honestly answer the search. The 3D atlas already holds the humeri, the four rotator cuff muscles and the deltoid, so the page can show them.

## What to deliver

`content/drafts/batches/shoulder/article.json`: the **complete replacement article** for the organ `shoulder-girdle` (the `content/anatomy.json` entry format; see the current entry and `content/drafts/anatomy/thymus.json`).

* `title`: `Shoulder Anatomy`. `descriptor`: `Rotator Cuff, Joints, Deltoid, Bones & Blood Supply` (the site builds the title "Shoulder Anatomy: 3D Model, Rotator Cuff, Joints | Anatomy Nexus" from it).
* **Keep the current article's sentences** (they were source-checked in the October pass, with a second pass) unless a retrieved source contradicts one; extend and reorganise. Suggested sections (8 or 9, 90 to 170 words each; headings phrased the way people search where natural):
  location and relations (add the shoulder joint); bones and their features (add the proximal humerus: head, anatomical and surgical neck, greater and lesser tubercles, intertubercular groove);
  **the shoulder (glenohumeral) joint** (a ball-and-socket synovial joint; why it is mobile and why that costs stability: shallow glenoid socket, labrum, joint capsule and its ligaments, long head of biceps; subacromial and subdeltoid bursa and the space under the acromion); **the rotator cuff and deltoid** (the four muscles, what each does, the nerves that supply them, the tendons that blend with the capsule; deltoid parts and action);
  the sternoclavicular and acromioclavicular joints (existing); movements of the shoulder and shoulder blade; blood supply and nerves (add the axillary nerve, suprascapular nerve, the brachial plexus, the circumflex humeral and suprascapular arteries; keep what is there);
  function; clinical relevance (add shoulder dislocation and the axillary nerve, rotator cuff tears and tendon problems, shoulder impingement, frozen shoulder, proximal humerus fracture; keep the clavicle fracture and AC joint text; each with the route to care in the site's wording, e.g. A&E for a suspected dislocation or fracture, a GP appointment for persistent pain).
  Total about 1,200 to 1,500 words (the validator's 1,150-word note is a warning, not an error).
* `keyFacts`: 6 to 8 `{label, value}` pairs (update the existing ones; add the joint type, rotator cuff, the nerve most at risk in dislocation, the most mobile joint).
* `structures`: at most 14 atlas names (`data/hd/atlas.json`): the clavicles, scapulae and humeri (6) plus the four rotator cuff muscles on each side, named exactly as the atlas names them (for example "Left supraspinatus", "Left infraspinatus muscle", "Left teres minor", "Left subscapularis" and the right-hand equivalents).
* `references`: keep the current six; add what you used (aim 8 to 12 in all, at least two publishers and one official health body). StatPearls (ncbi.nlm.nih.gov), OpenStax, NHS pages, NHS trust leaflets, Versus Arthritis and NICE CKS are the likeliest sources.

Rules from the brief apply: write only from retrieved text; **no measurements, angles, doses or numeric ranges in prose** (the validator flags them); UK English; describe, do not instruct an individual; name the route to care where urgency is mentioned.
Sentences inherited from the current article need no new retrieval; every new or changed sentence needs the ledger and the second pass.

Also deliver `ledger.json` (first pass, one entry per new or changed sentence), `report.json` (second pass, one entry per such sentence, with the verdict and any edit; the published text must contain only supported or textbook sentences), and `BATCH-REPORT.md` (searches used, anything doubtful, sources a clinician should look at).
Check the shape with `python3 -I tools/verification/validate_article.py content/drafts/batches/shoulder/article.json` (no ERROR lines). Do not edit `content/anatomy.json` or any other repository file; the maintainer merges the article after validating it.
Plan the budget: about 45 searches for the first pass and about 55 for the second pass; stop at 150 whatever happens. Commit only your batch directory, push to `claude/content-shoulder`, and finish with a short message.
