#!/usr/bin/env python3
"""Validate (and optionally merge) a batch of new or changed content without touching the repository's own content files.

usage: python3 tools/verification/check_batch.py <fragment.json> [<fragment.json> ...] [--apply]

A fragment is a JSON file shaped like
  {"conditions": {"<id>": {entity}}, "medications": {"<id>": {entity}}, "blog": {"<slug>": {post}}}
for NEW entities (an id that already exists is an error), and, for additions to an existing entity,
  {"patch": {"conditions": {"<id>": {"article": {...}, "references": [{...}], "overview": "..."}}}}
(every field is replaced by the patch value, except `references`, which are appended when their URL is new).

The collections are the content types: physiology, symptoms, conditions, tests, imaging, procedures, medications, drug-classes,
biomarkers, targets, first-aid, health and blog (posts; one file each under content/blog/ on --apply).

The batch is merged into a scratch copy of content/ and the content compiler (tools/build-content.py) runs there with ANX_ROOT
pointing at it, so every rule of the real build applies: ids, slugs, links to other pages, anatomy names, reference hosts,
vocabularies, the article block, the blog schema. Errors name the entity. Exit status 0 means the batch compiles; with --apply the
fragments are then written into content/ in the files' own formatting (and nothing else changes).
"""
import json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FILES = {  # collection -> (file, root key or None)
    'physiology': ('physiology.json', None), 'symptoms': ('symptoms.json', None), 'conditions': ('conditions.json', None),
    'tests': ('tests.json', 'tests'), 'imaging': ('imaging.json', 'imaging'), 'procedures': ('procedures.json', 'procedures'),
    'medications': ('medications.json', 'medications'), 'drug-classes': ('drug-classes.json', 'classes'),
    'biomarkers': ('biomarkers.json', 'biomarkers'), 'targets': ('targets.json', 'targets'),
    'first-aid': ('first-aid.json', 'topics'), 'health': ('health.json', 'topics'),
}
STYLES = [dict(indent=None, separators=(',', ': ')), dict(indent=1, separators=None)]


def load_styled(path):
    raw = open(path, encoding='utf-8').read(); d = json.loads(raw)
    for st in STYLES:
        for ea in (False, True):
            if json.dumps(d, ensure_ascii=ea, **st) + '\n' == raw: return d, (ea, st)
    return d, (False, STYLES[0])


def save_styled(path, d, style):
    ea, st = style
    with open(path, 'w', encoding='utf-8') as fh: fh.write(json.dumps(d, ensure_ascii=ea, **st) + '\n')


def merge(content_dir, fragments, errors):
    """Merge the fragments into the content directory; returns the list of (collection, id, 'new'|'patch')."""
    done = []; docs = {}
    def doc(coll):
        f, rk = FILES[coll]; p = os.path.join(content_dir, f)
        if p not in docs: docs[p] = load_styled(p)
        return docs[p][0], rk, p
    for fr_name, fr in fragments:
        if not isinstance(fr, dict): errors.append(f'{fr_name}: a fragment must be a JSON object'); continue
        for coll, items in fr.items():
            if coll == 'patch':
                for pc, pitems in items.items():
                    if pc == 'blog':
                        for eid, fields in pitems.items():
                            p = os.path.join(content_dir, 'blog', eid + '.json')
                            if not os.path.exists(p): errors.append(f'{fr_name}: patch of unknown blog post {eid}'); continue
                            post = json.load(open(p, encoding='utf-8')); apply_patch(post, fields); json.dump(post, open(p, 'w', encoding='utf-8'), ensure_ascii=False); done.append(('blog', eid, 'patch'))
                        continue
                    if pc not in FILES: errors.append(f'{fr_name}: unknown collection {pc!r} in patch'); continue
                    d, rk, p = doc(pc); coll_items = d if rk is None else d[rk]
                    for eid, fields in pitems.items():
                        if eid not in coll_items: errors.append(f'{fr_name}: patch of unknown {pc}/{eid}'); continue
                        apply_patch(coll_items[eid], fields); done.append((pc, eid, 'patch'))
            elif coll == 'blog':
                os.makedirs(os.path.join(content_dir, 'blog'), exist_ok=True)
                for eid, post in items.items():
                    p = os.path.join(content_dir, 'blog', eid + '.json')
                    if os.path.exists(p): errors.append(f'{fr_name}: blog post {eid} already exists'); continue
                    json.dump(post, open(p, 'w', encoding='utf-8'), ensure_ascii=False); done.append(('blog', eid, 'new'))
            elif coll in FILES:
                d, rk, p = doc(coll); coll_items = d if rk is None else d[rk]
                for eid, ent in items.items():
                    if eid in coll_items: errors.append(f'{fr_name}: {coll}/{eid} already exists (use "patch" to extend it)'); continue
                    coll_items[eid] = ent; done.append((coll, eid, 'new'))
            else: errors.append(f'{fr_name}: unknown collection {coll!r}')
    return done, docs


def apply_patch(entity, fields):
    for k, v in fields.items():
        if k == 'references':
            have = {r.get('url') for r in entity.get('references', []) if isinstance(r, dict)}
            entity.setdefault('references', []).extend(r for r in v if isinstance(r, dict) and r.get('url') not in have)
        else: entity[k] = v


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; apply = '--apply' in sys.argv
    if not args: print(__doc__); return 2
    fragments = []
    for a in args:
        try: fragments.append((os.path.basename(a), json.load(open(a, encoding='utf-8'))))
        except Exception as ex: print(f'ERROR {a}: not valid JSON ({ex})'); return 1
    errors = []
    tmp = tempfile.mkdtemp(prefix='anx-batch-')
    try:
        shutil.copytree(os.path.join(ROOT, 'content'), os.path.join(tmp, 'content'), ignore=shutil.ignore_patterns('drafts'))
        os.makedirs(os.path.join(tmp, 'data')); os.symlink(os.path.join(ROOT, 'data', 'hd'), os.path.join(tmp, 'data', 'hd'))
        os.makedirs(os.path.join(tmp, 'tools')); os.symlink(os.path.join(ROOT, 'tools', 'derived'), os.path.join(tmp, 'tools', 'derived'))
        os.makedirs(os.path.join(tmp, 'site')); shutil.copy(os.path.join(ROOT, 'site', 'site-meta.js'), os.path.join(tmp, 'site', 'site-meta.js'))
        done, docs = merge(os.path.join(tmp, 'content'), fragments, errors)
        for p, (d, st) in docs.items(): save_styled(p, d, st)
        if errors:
            for e in errors: print('ERROR', e)
            return 1
        ids = {f'{c}/{i}' for c, i, _ in done}
        env = dict(os.environ, ANX_ROOT=tmp)
        r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build-content.py')], env=env, capture_output=True, text=True)
        out = (r.stdout + '\n' + r.stderr).splitlines()
        bad, in_err = [], False       # the compiler prints "... ERRORS:" and then one line per error
        for l in out:
            if re.search(r'ERRORS?\b.*:\s*$', l): in_err = True; continue
            if in_err and not l.strip(): in_err = False
            if in_err or re.search(r'Traceback|Error:|error:', l): bad.append(l)
        warn = [l for l in out if re.search(r'warning|WARN|unclassified|unknown host', l, re.I)]
        mine = [l for l in bad if any(i in l for i in ids)]
        print(f'merged {len(done)} entities: ' + ', '.join(sorted(ids)))
        if r.returncode != 0 or bad:
            print(f'the compiler reported {len(bad)} problem line(s); {len(mine)} name an entity of this batch')
            for l in (mine or bad)[:60]: print('  ', l[:300])
            if r.returncode != 0 and (not bad or any('Traceback' in l for l in bad)): print('the compiler crashed; its last lines:'); print('\n'.join(out[-14:]))
            return 1
        for l in warn[:15]: print('  note:', l[:200])
        # a compiled page that fails the publishing gate (no lead, too little text, no source, too few links) is published noindex
        problems = 0
        for coll, eid, how in done:
            tp = os.path.join(tmp, 'data', 'content', 'types', coll + '.json')
            try: e = json.load(open(tp, encoding='utf-8'))['items'][eid]
            except Exception: continue
            words = len(re.findall(r"[A-Za-z][A-Za-z'’-]*", json.dumps({k: v for k, v in e.items() if k in ('summary', 'overview', 'definition', 'causes', 'treatment', 'diagnosis', 'body', 'article', 'howItWorks', 'usedFor', 'sideEffects', 'cautions', 'what')}, ensure_ascii=False)))
            seo = e.get('seo') or {}
            print(f"  {coll}/{eid}: ~{words} words of prose, {len(e.get('references') or [])} references, links: {', '.join(sorted(e.get('links') or {})) or 'none'}, indexable: {seo.get('index')}")
            if seo.get('index') is False: problems += 1; print('    NOT PUBLISHABLE:', '; '.join(seo.get('reasons') or []))
        if problems: print(f'{problems} page(s) would be published noindex; fix them before the batch is accepted'); return 1
        print('ok: the batch compiles and every page passes the publishing gate')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if apply:
        fr_errors = []
        done, docs = merge(os.path.join(ROOT, 'content'), fragments, fr_errors)
        if fr_errors:
            for e in fr_errors: print('ERROR', e)
            return 1
        for p, (d, st) in docs.items(): save_styled(p, d, st)
        print(f'applied to content/ ({len(done)} entities); now run python3 tools/build-content.py')
    return 0


if __name__ == '__main__': sys.exit(main())
