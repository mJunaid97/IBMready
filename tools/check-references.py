#!/usr/bin/env python3
"""check-references.py — verify that every reference URL in the content resolves.

    python3 tools/check-references.py [--strict] [--timeout 20] [--workers 8]

Fetches every distinct https:// reference URL in content/*.json (HEAD, then GET on 405/403), following
redirects, and reports the ones that fail: 404/410 (dead), other 4xx/5xx, or network errors. Redirects to a
different page are listed so the reference can be updated to the final address. Needs internet access:
run it locally or in the "Reference links" workflow (.github/workflows/references.yml). With --strict a dead
link (404/410) is a failure (exit 1); other problems are warnings because they are often transient.
"""
import argparse, concurrent.futures, glob, json, os, re, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "Mozilla/5.0 (compatible; AnatomyNexusLinkCheck/1.0; +https://anatomynexus.com/references-policy/)"

def collect():
    refs = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "content", "*.json"))):
        s = open(f, encoding="utf-8").read()
        for m in re.finditer(r'"url":\s*"(https://[^"]+)"', s):
            refs.setdefault(m.group(1), set()).add(os.path.basename(f))
    return refs

def fetch(url, timeout):
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.geturl()
        except urllib.error.HTTPError as e:
            if method == "HEAD" and e.code in (403, 405, 400): continue
            return e.code, e.geturl() if hasattr(e, "geturl") else url
        except Exception as e:
            if method == "HEAD": continue
            return None, str(e)[:80]
    return None, "no response"

def norm(u):
    """Ignore differences that are not worth a reference update: a www. prefix, a trailing slash, the scheme."""
    return re.sub(r"^https?://(www\.)?", "", u).rstrip("/")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--strict", action="store_true"); ap.add_argument("--timeout", type=int, default=20); ap.add_argument("--workers", type=int, default=8)
    a = ap.parse_args()
    refs = collect(); urls = sorted(u for u in refs if not u.startswith("https://anatomynexus.com"))
    print(f"checking {len(urls)} distinct reference URLs")
    dead, other, moved = [], [], []
    with concurrent.futures.ThreadPoolExecutor(a.workers) as ex:
        for url, (status, final) in zip(urls, ex.map(lambda u: fetch(u, a.timeout), urls)):
            where = ", ".join(sorted(refs[url]))
            if status is None: other.append(f"  ERR  {url}  ({final})  [{where}]")
            elif status in (404, 410): dead.append(f"  {status}  {url}  [{where}]")
            elif status >= 400: other.append(f"  {status}  {url}  [{where}]")
            elif norm(final) != norm(url) and not norm(final).startswith(norm(url)): moved.append(f"  {url}\n      -> {final}  [{where}]")
    if dead: print(f"\nDEAD ({len(dead)}):"); print("\n".join(dead))
    if other: print(f"\nOTHER PROBLEMS ({len(other)}), check by hand:"); print("\n".join(other))
    if moved: print(f"\nREDIRECTED ({len(moved)}), update the reference to the final address:"); print("\n".join(moved))
    print(f"\n{len(urls) - len(dead) - len(other)} ok, {len(dead)} dead, {len(other)} other, {len(moved)} redirected")
    sys.exit(1 if (a.strict and dead) else 0)

if __name__ == "__main__":
    main()
