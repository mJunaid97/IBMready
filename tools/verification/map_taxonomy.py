#!/usr/bin/env python3
"""Point medication-taxonomy classes at the drug-class pages that cover them.

usage: python3 tools/verification/map_taxonomy.py page=taxonomy-class[,taxonomy-class...] [page=...] [--new area/group:id:Name:ATC:ex1,ex2:page]

A drug-class page (content/drug-classes.json) that no therapeutic-area class points at is listed in
data/content/medication-taxonomy.json as "classesOutsideTaxonomy". This sets `page` on the named taxonomy classes (several
taxonomy classes may share one page, for example sglt2-inhibitors and sglt2-inhibitors-heart-failure), or with --new adds a
taxonomy class to a group. Run python3 tools/build-content.py afterwards.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_batch as cb

ROOT = cb.ROOT
p = os.path.join(ROOT, 'content', 'medication-taxonomy.json')
d, style = cb.load_styled(p)
by_id = {}
for a in d['areas']:
    for g in a['groups']:
        for c in g['classes']: by_id.setdefault(c['id'], []).append(c)
args = sys.argv[1:]
new = [args[i + 1] for i, a in enumerate(args) if a == '--new' and i + 1 < len(args)]
pairs = [a for a in args if '=' in a and not a.startswith('--')]
for pr in pairs:
    page, tids = pr.split('=', 1)
    for tid in tids.split(','):
        if tid not in by_id: print('unknown taxonomy class', tid); sys.exit(1)
        for c in by_id[tid]:
            if c.get('page') and c['page'] != page: print(f'warning: {tid} already points at {c["page"]}; left alone'); continue
            c['page'] = page
for spec in new:
    path, cid, name, atc, examples, page = spec.split(':')
    area_id, group_id = path.split('/')
    grp = next(g for a in d['areas'] if a['id'] == area_id for g in a['groups'] if g['id'] == group_id)
    if not any(c['id'] == cid for c in grp['classes']):
        grp['classes'].append({'id': cid, 'name': name, 'atc': [x for x in atc.split(',') if x], 'page': page, 'examples': [x for x in examples.split(',') if x]})
cb.save_styled(p, d, style)
print('taxonomy updated')
