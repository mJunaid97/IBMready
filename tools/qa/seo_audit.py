#!/usr/bin/env python3
"""Page-by-page SEO audit of the production package (dist/). Read-only; needs no network and no packages beyond the standard library.

usage: python3 tools/qa/seo_audit.py [dist] [--json report.json]

Per page: <title> and meta description (length, uniqueness), canonical, robots, lang, h1 and heading order, Open Graph and Twitter tags, JSON-LD
(parses, absolute URLs, Article headline, BreadcrumbList), images (alt, size), links (anchor text), then the whole site: sitemaps against
pages (noindex pages listed, indexable pages missing), internal links in per page, click depth from the home page, links to noindex pages, thin pages.
The result is a list of issues with counts; it exits 0 (it reports, the smoke test enforces).
"""
import json, os, re, sys, collections, html, hashlib
from html.parser import HTMLParser
from urllib.parse import urlparse, urljoin
import xml.etree.ElementTree as ET

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DIST = ARGS[0] if ARGS else os.path.join(ROOT, 'dist')
SITE = 'https://anatomynexus.com'
OUT = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None
SKIP_DIRS = ('vendor', 'data', 'docs', 'site', 'content', 'sitemaps')


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ''; self.in_title = False
        self.meta = {}; self.links = []; self.lang = None
        self.h = []; self._h = None
        self.ld = []; self._ld = None
        self.imgs = []; self.a = []; self._a = None
        self.main_depth = 0; self.main_words = []; self.skip = 0
        self.body_words = []; self.in_body = False
        self.tag_stack = []
        self.in_head = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html': self.lang = a.get('lang')
        elif tag == 'head': self.in_head = True
        elif tag == 'title' and self.in_head: self.in_title = True
        elif tag == 'meta':
            k = a.get('name') or a.get('property') or a.get('http-equiv')
            if k: self.meta.setdefault(k.lower(), []).append(a.get('content', ''))
            if a.get('charset'): self.meta.setdefault('charset', []).append(a['charset'])
        elif tag == 'link': self.links.append(a)
        elif tag == 'script':
            if (a.get('type') or '').lower() == 'application/ld+json': self._ld = []
            self.skip += 1
        elif tag in ('style', 'noscript'): self.skip += 1
        elif tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'): self._h = [tag, '']
        elif tag == 'img': self.imgs.append(a)
        elif tag == 'a': self._a = [a, '']
        elif tag == 'main': self.main_depth += 1
        elif tag == 'body': self.in_body = True

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'head': self.in_head = False
        elif tag == 'script':
            if self._ld is not None: self.ld.append(''.join(self._ld)); self._ld = None
            self.skip = max(0, self.skip - 1)
        elif tag in ('style', 'noscript'): self.skip = max(0, self.skip - 1)
        elif tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            if self._h: self.h.append((self._h[0], self._h[1].strip())); self._h = None
        elif tag == 'a':
            if self._a: self.a.append((self._a[0], self._a[1].strip())); self._a = None
        elif tag == 'main': self.main_depth = max(0, self.main_depth - 1)

    def handle_data(self, d):
        if self.in_title: self.title += d
        if self._ld is not None: self._ld.append(d); return
        if self.skip: return
        if self._h is not None: self._h[1] += d
        if self._a is not None: self._a[1] += d
        w = d.split()
        if w:
            self.body_words.extend(w)
            if self.main_depth: self.main_words.extend(w)


def canon_of(path):
    rel = os.path.relpath(path, DIST).replace(os.sep, '/')
    if rel == 'index.html': return SITE + '/'
    if rel.endswith('/index.html'): return SITE + '/' + rel[:-len('index.html')]
    return SITE + '/' + rel


pages = {}
for dp, dn, fn in os.walk(DIST):
    rel = os.path.relpath(dp, DIST)
    top = rel.split(os.sep)[0]
    if top in SKIP_DIRS and rel != '.': dn[:] = []; continue
    for f in fn:
        if not f.endswith('.html'): continue
        full = os.path.join(dp, f)
        p = P(); s = open(full, encoding='utf-8').read()
        try: p.feed(s)
        except Exception as e: print('PARSE', full, e)
        pages[canon_of(full)] = (p, full, len(s))

# ---- sitemaps
sm_urls = {}; sm_lastmod = {}
def read_sm(path):
    t = ET.parse(path).getroot()
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    return t, ns
idx, ns = read_sm(os.path.join(DIST, 'sitemap.xml'))
children = [e.find('s:loc', ns).text for e in idx.findall('s:sitemap', ns)]
for c in children:
    path = os.path.join(DIST, urlparse(c).path.lstrip('/'))
    t, ns = read_sm(path)
    for u in t.findall('s:url', ns):
        loc = u.find('s:loc', ns).text; lm = u.find('s:lastmod', ns)
        sm_urls.setdefault(loc, []).append(os.path.basename(path)); sm_lastmod[loc] = lm.text if lm is not None else None

R = collections.defaultdict(list)    # issue -> [urls]
def flag(issue, url, extra=''): R[issue].append(url + (' | ' + extra if extra else ''))

titles = collections.defaultdict(list); descs = collections.defaultdict(list)
rows = {}
for url, (p, full, size) in sorted(pages.items()):
    robots = ' '.join(p.meta.get('robots', [])).lower()
    noindex = 'noindex' in robots
    in_sm = url in sm_urls
    title = html.unescape(p.title.strip()); desc = (p.meta.get('description') or [''])[0].strip()
    canon = [l.get('href') for l in p.links if (l.get('rel') or '') == 'canonical']
    h1 = [t for tag, t in p.h if tag == 'h1']
    words = len(p.main_words) if p.main_words else len(p.body_words)
    og = {k: v[0] for k, v in p.meta.items() if k.startswith('og:')}
    tw = {k: v[0] for k, v in p.meta.items() if k.startswith('twitter:')}
    rows[url] = dict(title=title, desc=desc, noindex=noindex, in_sitemap=in_sm, words=words, h1=h1, canon=canon)
    if not noindex: titles[title].append(url); descs[desc].append(url)
    # robots vs sitemap
    if noindex and in_sm: flag('noindex page listed in sitemap', url)
    if not noindex and not in_sm and not url.endswith('/404.html'): flag('indexable page missing from sitemap', url)
    # basics
    if not title: flag('missing <title>', url)
    elif not noindex and not (15 <= len(title) <= 65): flag('title length outside 15-65', url, f'{len(title)}: {title}')
    if not desc: flag('missing meta description', url)
    elif not noindex and not (70 <= len(desc) <= 160): flag('description length outside 70-160', url, f'{len(desc)}')
    if len(canon) != 1: flag('canonical count != 1', url, str(canon))
    elif canon[0] != url and not noindex: flag('canonical differs from own URL', url, canon[0])
    if len(h1) != 1: flag('h1 count != 1', url, str(len(h1)))
    if p.lang != 'en-GB': flag('html lang is not en-GB', url, str(p.lang))
    if not p.meta.get('viewport'): flag('missing viewport', url)
    # social
    for k in ('og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:site_name'):
        if k not in og and not noindex: flag(f'missing {k}', url)
    if og.get('og:url') and og['og:url'] != url and not noindex: flag('og:url differs from canonical', url, og['og:url'])
    if og.get('og:image') and not og['og:image'].startswith('https://'): flag('og:image not absolute https', url, og['og:image'])
    if 'twitter:card' not in tw and not noindex: flag('missing twitter:card', url)
    # headings order
    seq = [int(t[1]) for t, _ in p.h]
    for a, b in zip(seq, seq[1:]):
        if b > a + 1: flag('heading level skipped', url, f'h{a} -> h{b}'); break
    # images
    for im in p.imgs:
        if 'alt' not in im: flag('img without alt attribute', url, im.get('src', '')[:80]); break
    for im in p.imgs:
        if im.get('src') and not (im.get('width') and im.get('height')): flag('img without width/height (CLS)', url, im.get('src', '')[:80]); break
    # structured data
    types = []
    for raw in p.ld:
        try: d = json.loads(raw)
        except Exception as e: flag('JSON-LD does not parse', url, str(e)[:80]); continue
        nodes = d.get('@graph', [d]) if isinstance(d, dict) else d
        for n in nodes:
            t = n.get('@type'); types.append(t if isinstance(t, str) else ','.join(t or []))
            for key in ('url', 'mainEntityOfPage', '@id'):
                v = n.get(key)
                if isinstance(v, str) and v.startswith('/'): flag('JSON-LD relative URL', url, f'{key}={v}')
            if t in ('Article', 'NewsArticle', 'BlogPosting'):
                for req in ('headline', 'datePublished', 'dateModified', 'author', 'publisher', 'image'):
                    if not n.get(req): flag(f'{t} JSON-LD missing {req}', url)
                if n.get('headline') and len(n['headline']) > 110: flag(f'{t} headline > 110 chars', url, str(len(n['headline'])))
            if t == 'BreadcrumbList':
                items = n.get('itemListElement', [])
                if not items: flag('BreadcrumbList empty', url)
                for i, it in enumerate(items):
                    if it.get('position') != i + 1: flag('BreadcrumbList position order', url); break
    rows[url]['ld_types'] = types
    if not types and not noindex: flag('no structured data', url)
    # links
    internal = []
    for a, text in p.a:
        href = a.get('href')
        if not href or href.startswith(('#', 'mailto:', 'tel:', 'javascript:')): continue
        absu = urljoin(url, href)
        if urlparse(absu).netloc.endswith('anatomynexus.com') or href.startswith('/'):
            internal.append((absu.split('#')[0], text, a.get('rel') or ''))
        if not text and not a.get('aria-label') and not a.get('title') and not any(x in (a.get('class') or '') for x in ('skip',)):
            flag('anchor without text or aria-label', url, href[:80]);
    rows[url]['internal'] = [(u, t) for u, t, r in internal]
    # generic anchor text
    for u, t, r in internal:
        if t.strip().lower() in ('click here', 'here', 'read more', 'learn more', 'more') : flag('generic anchor text', url, f'{t} -> {u}'); break

for t, us in titles.items():
    if len(us) > 1 and t: flag('duplicate title (indexable)', ', '.join(us[:4]), t)
for d, us in descs.items():
    if len(us) > 1 and d: flag('duplicate description (indexable)', ', '.join(us[:4]), d[:80])

# sitemap vs pages
for u in sm_urls:
    if u not in pages: flag('sitemap URL has no page file', u)
    if len(sm_urls[u]) > 1: flag('URL in more than one sitemap', u)
# lastmod distribution
lm = collections.Counter((v or 'none')[:10] for v in sm_lastmod.values())

# link graph and click depth
indexable = {u for u, r in rows.items() if not r['noindex'] and u in sm_urls}
inbound = collections.Counter(); out_noindex = collections.Counter()
graph = {u: set(x for x, _ in rows[u]['internal']) for u in rows}
for u in rows:
    for v in graph[u]:
        if v in rows and v != u: inbound[v] += 1
        if v in rows and rows[v]['noindex'] and not rows[u]['noindex']: out_noindex[v] += 1
depth = {SITE + '/': 0}; q = collections.deque([SITE + '/'])
while q:
    u = q.popleft()
    for v in graph.get(u, ()):
        if v in rows and v not in depth: depth[v] = depth[u] + 1; q.append(v)
for u in indexable:
    if u not in depth: flag('indexable page not reachable by links from home', u)
    elif depth[u] > 4: flag('click depth > 4', u, str(depth[u]))
    if inbound[u] < 3 and u != SITE + '/': flag('fewer than 3 internal links in', u, str(inbound[u]))
for v, n in out_noindex.most_common(): flag('link target is noindex (linked from indexable pages)', v, f'{n} pages link to it')

# thin pages
thin = sorted(((rows[u]['words'], u) for u in indexable), key=lambda x: x[0])
summary = dict(pages=len(pages), indexable=len(indexable), noindex=sum(1 for r in rows.values() if r['noindex']), sitemap_urls=len(sm_urls),
               sitemaps=children, lastmod=dict(lm.most_common(8)), depth_hist=dict(collections.Counter(depth.get(u, -1) for u in indexable)),
               words_lt_150=sum(1 for w, u in thin if w < 150), words_lt_300=sum(1 for w, u in thin if w < 300), words_lt_500=sum(1 for w, u in thin if w < 500))
if OUT: json.dump(dict(summary=summary, issues=R, rows={u: {k: v for k, v in r.items() if k != 'internal'} for u, r in rows.items()}, thinnest=thin[:60]), open(OUT, 'w'), indent=1)
print(json.dumps(summary, indent=1))
print()
for issue, items in sorted(R.items(), key=lambda kv: -len(kv[1])):
    print(f'{len(items):5d}  {issue}')
    for x in items[:3]: print('         ', x[:210])
