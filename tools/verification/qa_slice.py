#!/usr/bin/env python3
"""Print a slice of the content files as plain text for an editorial QA read.

usage: python3 tools/verification/qa_slice.py <file> [<first>:<last>] [--ids]
  <file>   a content file name without .json (conditions, tests, medications, drug-classes, physiology, procedures,
           biomarkers, symptoms, first-aid, imaging, health, targets, anatomy, interactions, comparisons)
  a:b      entity positions to print (default: all); --ids lists the ids with their positions and sizes instead

Every entity is printed with its fields in readable form (no JSON punctuation) followed by its references, so a reviewer can
compare each statement with the sources named for it. Nothing is written."""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def entities(name):
    d = json.load(open(os.path.join(ROOT, 'content', name + '.json'), encoding='utf-8'))
    for key in ('conditions', 'tests', 'medications', 'classes', 'procedures', 'biomarkers', 'topics', 'imaging', 'targets', 'comparisons', 'interactions', 'symptoms'):
        if isinstance(d.get(key), dict): return list(d[key].items())
        if isinstance(d.get(key), list): return [(x.get('id', str(i)), x) for i, x in enumerate(d[key])]
    items = [(k, v) for k, v in d.items() if not k.startswith('_') and isinstance(v, dict)]
    return items

def show(v, indent=0, out=None):
    pad = '  ' * indent
    if isinstance(v, dict):
        for k, x in v.items():
            if isinstance(x, (dict, list)) and x:
                out.append(f'{pad}{k}:'); show(x, indent + 1, out)
            elif x not in (None, '', [], {}): out.append(f'{pad}{k}: {x}')
    elif isinstance(v, list):
        for x in v:
            if isinstance(x, (dict, list)): out.append(f'{pad}-'); show(x, indent + 1, out)
            else: out.append(f'{pad}- {x}')
    return out

def main():
    if len(sys.argv) < 2: print(__doc__); return
    name = sys.argv[1]; ents = entities(name)
    if '--ids' in sys.argv:
        for i, (k, v) in enumerate(ents): print(f'{i:3d}  {k:40s} {len(json.dumps(v, ensure_ascii=False)):7d} chars')
        return
    a, b = 0, len(ents)
    for arg in sys.argv[2:]:
        if ':' in arg: s, e = arg.split(':'); a = int(s or 0); b = int(e or len(ents))
    for k, v in ents[a:b]:
        print('=' * 100); print(f'ENTITY {name}/{k}')
        print('\n'.join(show(v, 1, [])))
if __name__ == '__main__': main()
