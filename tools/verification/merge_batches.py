#!/usr/bin/env python3
"""Collect the fragments that author sessions pushed to their content/<batch> branches, validate each against the current content and
(optionally) merge the ones that pass, one at a time, so a failure is attributed to its own batch.

usage: python3 tools/verification/merge_batches.py [--batches id1,id2,...] [--apply] [--evidence] [--extra]

  (no flags)   fetch every origin branch content/*, validate each batch's fragment.json against the content as it is now, print a table
  --batches    only these batch ids (comma separated), in this order; default: every content/* branch, alphabetical
  --apply      merge each passing fragment into content/ (check_batch.py --apply), in order; the next batch is validated on top of it
  --evidence   with --apply: also copy BATCH-REPORT.md, ledgers/ and reports/ of a merged batch into content/drafts/batches/<id>/ (the audit trail)
  --extra      also try the other fragment*.json files of a batch (for example a held-back item); they are reported separately
  --allow-partial  also merge a batch whose BATCH-REPORT.md is missing (the session has not finished: its fragment may hold first-pass text)
  --update-batches id1,id2  with --apply: replace entities of these batches whose fragment text changed after they were merged (a session's later, second-pass version)

Entities that already exist in content/ are dropped from a fragment first ("already merged"), so the tool can be re-run as sessions push more.
After --apply run: python3 tools/build-content.py
"""
import json, os, re, subprocess, sys, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'verification'))
import check_batch as cb  # noqa: E402


def sh(*cmd, **kw):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, **kw)


def existing():
    """collection -> {id: entity} for everything in content/ (blog posts read from their own files)."""
    have = {}
    for coll, (f, rk) in cb.FILES.items():
        d, _ = cb.load_styled(os.path.join(ROOT, 'content', f))
        have[coll] = dict(d if rk is None else d[rk])
    blog = os.path.join(ROOT, 'content', 'blog')
    have['blog'] = {x[:-5]: json.load(open(os.path.join(blog, x), encoding='utf-8')) for x in os.listdir(blog) if x.endswith('.json')} if os.path.isdir(blog) else {}
    return have


def drop_existing(frag, have):
    """Remove entities already in content/ from a fragment's new-entity collections; returns (fragment, dropped ids, ids whose
    fragment text differs from what is merged: the session changed them after they were merged, a human decides)."""
    out, dropped, changed = {}, [], []
    for coll, items in frag.items():
        if coll == 'patch': out[coll] = items; continue
        keep = {}
        for eid, ent in items.items():
            if eid in have.get(coll, {}):
                dropped.append(f'{coll}/{eid}')
                if json.dumps(have[coll][eid], sort_keys=True, ensure_ascii=False) != json.dumps(ent, sort_keys=True, ensure_ascii=False): changed.append(f'{coll}/{eid}')
            else: keep[eid] = ent
        if keep: out[coll] = keep
    return out, dropped, changed


def count(frag):
    n = {}
    for coll, items in frag.items():
        if coll == 'patch':
            for pc, pi in items.items(): n[f'patch:{pc}'] = len(pi)
        else: n[coll] = len(items)
    return ', '.join(f'{v} {k}' for k, v in n.items()) or 'nothing new'


def main():
    argv = sys.argv[1:]
    apply = '--apply' in argv; evidence = '--evidence' in argv; extra = '--extra' in argv; partial = '--allow-partial' in argv
    update_batches = set()
    for i, a in enumerate(argv):
        if a == '--update-batches' and i + 1 < len(argv): update_batches = {x for x in argv[i + 1].split(',') if x}
    wanted = None
    for i, a in enumerate(argv):
        if a == '--batches' and i + 1 < len(argv): wanted = [x for x in argv[i + 1].split(',') if x]
    if wanted is None:
        r = sh('git', 'ls-remote', '--heads', 'origin', 'refs/heads/content/*')
        wanted = sorted(l.split('refs/heads/content/')[1] for l in r.stdout.splitlines() if 'refs/heads/content/' in l)
    if not wanted: print('no content/* branches on origin'); return 0
    r = sh('git', 'fetch', '-q', 'origin', *[f'content/{b}' for b in wanted])
    if r.returncode: print('git fetch failed:', r.stderr[:300]); return 1
    tmp = tempfile.mkdtemp(prefix='anx-merge-')
    rows, merged = [], 0
    for b in wanted:
        ref = f'origin/content/{b}'; base = f'content/drafts/batches/{b}'
        files = sh('git', 'ls-tree', '-r', '--name-only', ref, base + '/').stdout.split()
        frags = [f for f in files if re.fullmatch(re.escape(base) + r'/fragment[^/]*\.json', f)]
        main_frag = f'{base}/fragment.json'
        todo = [main_frag] if main_frag in frags else []
        if extra: todo += [f for f in frags if f != main_frag]
        has_report = f'{base}/BATCH-REPORT.md' in files
        if not todo:
            rows.append((b, 'no fragment yet', '', '', 'report' if has_report else 'no report')); continue
        for fpath in todo:
            raw = sh('git', 'show', f'{ref}:{fpath}').stdout
            try: frag = json.loads(raw)
            except Exception as ex: rows.append((b, 'INVALID JSON', str(ex)[:80], '', '')); continue
            have_now = existing()
            frag, dropped, changed = drop_existing(frag, have_now)
            if apply and b in update_batches and changed and (has_report or partial):
                raw_frag = json.loads(raw)
                for cid in changed:
                    coll, eid = cid.split('/', 1); ent = raw_frag[coll][eid]
                    if coll == 'blog': json.dump(ent, open(os.path.join(ROOT, 'content', 'blog', eid + '.json'), 'w', encoding='utf-8'), ensure_ascii=False)
                    else:
                        f_, rk_ = cb.FILES[coll]; path_ = os.path.join(ROOT, 'content', f_); dd, st_ = cb.load_styled(path_); (dd if rk_ is None else dd[rk_])[eid] = ent; cb.save_styled(path_, dd, st_)
                changed_done = list(changed); changed = []
            else: changed_done = []
            label = (b if fpath == main_frag else f'{b}:{os.path.basename(fpath)}') + ('' if has_report else ' [NO REPORT YET]')
            if not any(frag.values()):
                rows.append((label, 'already merged' if dropped else 'empty', f'{len(dropped)} present', '', ('CHANGED since merged: ' + ', '.join(changed[:6])) if changed else (f'UPDATED {len(changed_done)} changed entities from the final fragment' if changed_done else ''))); continue
            tmpf = os.path.join(tmp, label.replace(':', '_') + '.json'); json.dump(frag, open(tmpf, 'w', encoding='utf-8'), ensure_ascii=False)
            r = sh(sys.executable, os.path.join(ROOT, 'tools', 'verification', 'check_batch.py'), tmpf)
            ok = r.returncode == 0
            lint = sh(sys.executable, os.path.join(ROOT, 'tools', 'verification', 'lint_new_content.py'), tmpf, '--quiet').stdout.strip().splitlines()[-1:]
            note = '' if ok else ' | '.join(l.strip()[:150] for l in r.stdout.splitlines() if l.strip().startswith(('ERROR', 'NOT', 'the compiler', 'merged')) or re.match(r'\s+\S.*', l) and 'NOT PUBLISHABLE' in l)[:420] or r.stdout.strip()[-300:]
            if ok and apply and not has_report and not partial:
                ok = False; note = 'not merged: the session has not written BATCH-REPORT.md yet (use --allow-partial to merge its early fragment)'
            elif ok and apply:
                a = sh(sys.executable, os.path.join(ROOT, 'tools', 'verification', 'check_batch.py'), tmpf, '--apply')
                ok = a.returncode == 0
                if ok:
                    merged += 1
                    if evidence:
                        os.makedirs(os.path.join(ROOT, base), exist_ok=True)
                        paths = [p for p in files if p == f'{base}/BATCH-REPORT.md' or p.startswith(f'{base}/ledgers/') or p.startswith(f'{base}/reports/')]
                        if paths:
                            tar = subprocess.run(['git', 'archive', ref] + paths, cwd=ROOT, capture_output=True)
                            subprocess.run(['tar', '-x', '-C', ROOT], input=tar.stdout, check=False)
                else: note = 'apply failed: ' + a.stdout[-200:]
            if changed: note = (note + ' ' if note else '') + 'CHANGED since merged: ' + ', '.join(changed[:6])
            rows.append((label, ('MERGED' if apply else 'ok') if ok else 'FAILS', count(frag) + (f' (+{len(dropped)} already present)' if dropped else ''), lint[0] if lint else '', note))
    w = max(len(r[0]) for r in rows)
    for r in rows: print(f'{r[0]:{w}}  {r[1]:14} {r[2]}' + (f'  | lint: {r[3]}' if r[3] else '') + (f'\n{"":{w}}    {r[4]}' if r[4] else ''))
    if apply: print(f'\nmerged {merged} fragment(s); now run python3 tools/build-content.py')
    return 0


if __name__ == '__main__': sys.exit(main())
