import json, sys, os, importlib.util, datetime
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
def load(n):
    s = importlib.util.spec_from_file_location(n, os.path.join(here, n + '.py')); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m.B
B = {}
for n in sys.argv[2:]: B.update(load(n))
mode = sys.argv[1]  # verify-input | build
def sents(b):
    out = [('summary', b['summary'])]
    out += [(f'keyPoints[{i}]', k) for i, k in enumerate(b['keyPoints'])]
    for si, (h, ss) in enumerate(b['sections']):
        out += [(f'body[{si}].s{j}', t if isinstance(t, str) else t[0]) for j, t in enumerate(ss)]
    return out
if mode == 'verify-input':
    res = {}
    for slug, b in B.items():
        res[slug] = dict(source=dict(publisher=b['source'][0], title=b['source'][1], url=b['source'][2]), published=b['published'],
                         sentences=[dict(id=w, sentence=s) for w, s in sents(b)])
    json.dump(res, open(os.path.join(root, 'src', 'verify_input.json'), 'w'), indent=1)
    print(len(res), 'briefs')
if mode == 'build':
    PUB = {'FDA': 'US Food and Drug Administration', 'NIH': 'US National Institutes of Health', 'CDC': 'US Centers for Disease Control and Prevention'}
    TODAY = '2026-11-03'
    frag = {'blog': {}}
    os.makedirs(os.path.join(root, 'ledgers'), exist_ok=True)
    for slug, b in B.items():
        pub, title, url = b['source']
        post = dict(name=b['name'], kind='news', published=b['published'], updated=TODAY, summary=b['summary'], keyPoints=b['keyPoints'],
                    body=[dict(heading=h, body='\n\n'.join(t if isinstance(t, str) else t[0] for t in ss)) for h, ss in b['sections']],
                    source=dict(publisher=PUB[pub], title=title, url=url, published=b['published']),
                    references=[dict(title=title, url=url)] + [dict(title=t, url=u) for t, u in b['refs']])
        post.update(b['links']); post['aliases'] = []; post['urlAliases'] = []
        frag['blog'][slug] = post
        led = []
        for si, (h, ss) in enumerate(b['sections']):
            for j, t in enumerate(ss):
                text, note = (t, '') if isinstance(t, str) else t
                basis = 'textbook' if note.startswith('TEXTBOOK') or 'textbook' in note.lower() and 'Gloss' in note else 'excerpt'
                if note.startswith('EDITORIAL'): basis = 'editorial'
                urls = [url] + [u for _, u in b['refs'] if 'Actions to Address' in note and 'unapproved-thyroid' in u]
                led.append(dict(where=f'body[{si}].s{j}', sentence=text, basis=basis, urls=urls, note=note))
        for w, sent in [('summary', b['summary'])] + [(f'keyPoints[{i}]', k) for i, k in enumerate(b['keyPoints'])]:
            led.append(dict(where=w, sentence=sent, basis='excerpt', urls=[url], note='restates body sentences; see body ledger'))
        json.dump(led, open(os.path.join(root, 'ledgers', slug + '.ledger.json'), 'w'), indent=1, ensure_ascii=False)
    json.dump(frag, open(os.path.join(root, 'fragment.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(frag['blog']), 'posts')
