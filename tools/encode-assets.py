#!/usr/bin/env python3
"""encode-assets.py — write a base64 JSON twin next to every .glb (for hosts that cannot serve binary files).
Usage: python3 tools/encode-assets.py data/hd data/lite
"""
import base64, json, os, sys
for root in sys.argv[1:]:
    for dp, _, fn in os.walk(root):
        for f in fn:
            if f.endswith('.glb'):
                p = os.path.join(dp, f)
                json.dump({"file": f, "b64": base64.b64encode(open(p, 'rb').read()).decode('ascii')}, open(p + '.json', 'w'), separators=(',', ':'))
                print(p + '.json', os.path.getsize(p + '.json'))
