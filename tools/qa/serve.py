#!/usr/bin/env python3
"""serve.py — static server that emulates the production .htaccess for local testing.

    python3 tools/qa/serve.py --dir dist --port 8124

Emulates: clean URLs with a trailing slash (a prerendered dist serves <section>/<slug>/index.html), the 301 rules (query URLs,
index.html, retired paths, the alias table in data/content/aliases.json, missing trailing slashes), the
custom 404 page with a real 404 status, and correct media types. Not for production: it is a test double
for Apache / LiteSpeed.
"""
import argparse, http.server, json, mimetypes, os, re, socketserver, urllib.parse

SECTIONS = {"anatomy": "organ.html", "systems": "system.html", "physiology": "topic.html", "symptoms": "symptom.html", "conditions": "condition.html", "tests": "test.html", "biomarkers": "biomarker.html", "imaging": "study.html",
            "procedures": "procedure.html", "medications": "medication.html", "drug-classes": "class.html", "targets": "target.html", "first-aid": "topic.html", "health": "topic.html", "compare": "compare.html"}
SLUG = r"([A-Za-z0-9-]+)"
mimetypes.add_type("model/gltf-binary", ".glb"); mimetypes.add_type("application/javascript", ".js"); mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("application/manifest+json", ".webmanifest"); mimetypes.add_type("image/svg+xml", ".svg"); mimetypes.add_type("text/markdown", ".md"); mimetypes.add_type("application/xml", ".xml"); mimetypes.add_type("font/woff2", ".woff2"); mimetypes.add_type("image/x-icon", ".ico")

class Handler(http.server.SimpleHTTPRequestHandler):
    aliases = {}
    def redirect_for(self, path, query):
        """The 301 target for a request, or None (mirrors the generated rules in .htaccess)."""
        q = urllib.parse.parse_qs(query)
        m = re.match(r"^/(anatomy|organs|systems|" + "|".join(map(re.escape, SECTIONS)) + r")/([a-z]+\.html)$", path)
        if m and q.get("id") and re.fullmatch(SLUG, q["id"][0]):
            d = "anatomy" if m.group(1) == "organs" else m.group(1)
            return f"/{d}/{q['id'][0]}/"
        if path in ("/learn/terminology.html", "/learn", "/learn/"): return "/medical-terms/"
        if path in ("/interactions", "/interactions/", "/interactions/index.html"): return "/tools/drug-interaction-checker/" + ("?" + query if query else "")
        m = re.match(r"^(/(?:.*/)?)index\.html$", path)
        if m: return m.group(1)
        m = re.match(r"^/(anatomy|organs)/" + SLUG + r"/?$", path)
        if m:
            slug = m.group(2); target = self.aliases.get("anatomy", {}).get(slug, slug)
            if m.group(1) == "organs" or target != slug or not path.endswith("/"): return f"/anatomy/{target}/"
            return None
        m = re.match(r"^/(" + "|".join(map(re.escape, SECTIONS)) + r")/" + SLUG + r"/?$", path)
        if m:
            section, slug = m.group(1), m.group(2); target = self.aliases.get(section, {}).get(slug)
            if target: return f"/{section}/{target}/"
            if not path.endswith("/"): return path + "/"
        return None
    def do_GET(self):
        parts = urllib.parse.urlsplit(self.path); path = parts.path
        to = self.redirect_for(path, parts.query)
        if to:
            self.send_response(301); self.send_header("Location", to); self.send_header("Content-Length", "0"); self.end_headers(); return
        return super().do_GET()
    def send_error(self, code, message=None, explain=None):
        page = os.path.join(self.directory, "404.html")
        if code == 404 and os.path.exists(page):
            body = open(page, "rb").read()
            self.send_response(404); self.send_header("Content-Type", "text/html; charset=utf-8"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
        return super().send_error(code, message, explain)
    def log_message(self, *a): pass

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--dir", default="."); ap.add_argument("--port", type=int, default=8124); a = ap.parse_args()
    d = os.path.abspath(a.dir)
    ap_path = os.path.join(d, "data", "content", "aliases.json")
    Handler.aliases = json.load(open(ap_path, encoding="utf-8")) if os.path.exists(ap_path) else {}
    class H(Handler):
        def __init__(self, *args, **kw): super().__init__(*args, directory=d, **kw)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", a.port), H) as srv:
        print(f"serving {d} at http://127.0.0.1:{a.port}/ (clean URLs, 301 rules, 404 emulation)"); srv.serve_forever()
