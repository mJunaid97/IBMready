#!/usr/bin/env python3
"""Shape check for an Anatomy Nexus anatomy-article draft (does not touch the repo).
usage: python3 -I tools/verification/validate_article.py <article.json>

Checks the shape an article needs before it is added to content/anatomy.json (the content compiler enforces the hard rules
again): title, descriptor, intro, key facts, sections, atlas structure names, references from two publishers with one official
health body, no markdown, and numbers in prose to justify. Prints ERROR (exit 1) and WARN lines."""
import json, os, re, sys
from urllib.parse import urlsplit

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
art = json.load(open(sys.argv[1], encoding='utf-8'))
errs, warns = [], []
words = lambda s: len(re.findall(r"[A-Za-z][A-Za-z'’\-]*|\d+", s))

for k in ('title', 'descriptor', 'intro', 'keyFacts', 'sections', 'structures', 'references'):
    if k not in art: errs.append(f'missing key {k}')
if errs: print('\n'.join('ERROR ' + e for e in errs)); sys.exit(1)

if not art['title'].endswith(' Anatomy'): warns.append(f"title should end with ' Anatomy': {art['title']!r}")
if not 40 <= words(art['intro']) <= 95: warns.append(f"intro is {words(art['intro'])} words (aim 45-90)")
if not 5 <= len(art['keyFacts']) <= 8: warns.append(f"{len(art['keyFacts'])} keyFacts (aim 5-8)")
for kf in art['keyFacts']:
    if set(kf) != {'label', 'value'}: errs.append(f'keyFact needs exactly label+value: {kf}')
secs = art['sections']
if not 5 <= len(secs) <= 9: warns.append(f'{len(secs)} sections (aim 5-8)')
total = words(art['intro'])
for s in secs:
    if set(s) != {'heading', 'body'}: errs.append(f"section keys must be heading+body: {list(s)}")
    w = words(s['body']); total += w
    if not 70 <= w <= 190: warns.append(f"section {s['heading']!r} is {w} words (aim 90-160)")
    if re.search(r'\*\*|^#|\n- |\[.*\]\(.*\)', s['body']): errs.append(f"markdown in section {s['heading']!r}")
if not 600 <= total <= 1150: warns.append(f'total {total} words (aim 700-1000)')

# numeric thresholds / doses / ranges in prose
forbidden = [r'\b\d+(\.\d+)?\s?(mg|mcg|µg|g/dl|g/l|mmol|mmhg|iu|units?|ml|mL|ng|pg|%|per cent|percent)\b', r'[<>≥≤]\s?\d', r'\b\d+\s?(?:-|–|to)\s?\d+\s?(?:mm|cm|ml|years?|weeks?|days?|hours?)\b']
alltext = art['intro'] + ' ' + ' '.join(s['body'] for s in secs) + ' ' + ' '.join(kf['value'] for kf in art['keyFacts'])
for pat in forbidden:
    for m in re.finditer(pat, alltext, re.I):
        warns.append(f'numeric pattern to justify or remove: {alltext[max(0, m.start()-40):m.end()+25]!r}')

# structures must be atlas names
atlas = json.load(open(f'{REPO}/data/hd/atlas.json', encoding='utf-8'))
names = {s['name'] for s in atlas['structures']}
for nm in art['structures']:
    if nm not in names: errs.append(f'structures: unknown atlas name {nm!r}')
if len(art['structures']) > 14: warns.append(f"{len(art['structures'])} structures (aim <= 12)")

# references
refs = art['references']
OFFICIAL = ('nhs.uk', 'nih.gov', 'cdc.gov', 'nhsinform.scot', 'nice.org.uk', 'gov.uk', 'medlineplus.gov', 'cancer.gov', 'hse.ie', 'nhs.scot')
hosts = set(); official = False
for r in refs:
    if not r.get('title') or not re.match(r'^https://[^\s"\'<>]+$', r.get('url', '')): errs.append(f'bad reference {r}'); continue
    h = urlsplit(r['url']).netloc.lower().removeprefix('www.')
    hosts.add(h)
    if any(h == o or h.endswith('.' + o) for o in OFFICIAL): official = True
    extra = set(r) - {'title', 'url', 'section', 'published', 'revised', 'edition', 'note'}
    if extra: errs.append(f'reference has unsupported keys {extra}')
if len(refs) < 3: warns.append(f'{len(refs)} references (aim 3-6; compiler minimum is 2)')
if len(hosts) < 2: errs.append('references must come from at least two different publishers')
if not official: errs.append('at least one reference must be an official health body (NHS, NIH institute, CDC, MedlinePlus, NCI, GOV.UK, NICE, NHS inform)')
urls = [r['url'] for r in refs]
if len(urls) != len(set(urls)): errs.append('duplicate reference URL')

print(f"words≈{total} sections={len(secs)} keyFacts={len(art['keyFacts'])} structures={len(art['structures'])} refs={len(refs)} hosts={sorted(hosts)}")
for w in warns: print('WARN ', w)
for e in errs: print('ERROR', e)
sys.exit(1 if errs else 0)
