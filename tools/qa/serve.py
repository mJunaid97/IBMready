#!/usr/bin/env python3
"""serve.py — static server that emulates the .htaccess rules for local testing.

    python3 tools/qa/serve.py --dir dist --port 8124

Clean URLs (/conditions/gout -> conditions/condition.html), the custom 404 page, and correct
media types. Not for production: it is a test double for Apache / LiteSpeed.
"""
import argparse, http.server, mimetypes, os, re, socketserver, urllib.parse

SECTIONS = {"physiology": "topic.html", "symptoms": "symptom.html", "conditions": "condition.html", "tests": "test.html", "imaging": "study.html",
            "procedures": "procedure.html", "medications": "medication.html", "first-aid": "topic.html", "health": "topic.html", "organs": "organ.html", "systems": "system.html"}
PRETTY = re.compile(r"^/(" + "|".join(re.escape(k) for k in SECTIONS) + r")/([A-Za-z0-9-]+)/?$")
mimetypes.add_type("model/gltf-binary", ".glb"); mimetypes.add_type("application/javascript", ".js"); mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("application/manifest+json", ".webmanifest"); mimetypes.add_type("image/svg+xml", ".svg"); mimetypes.add_type("text/markdown", ".md")

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        m = PRETTY.match(path)
        if m and not os.path.exists(os.path.join(self.directory, path.strip("/"))):
            self.path = f"/{m.group(1)}/{SECTIONS[m.group(1)]}" + ("?" + urllib.parse.urlsplit(self.path).query if urllib.parse.urlsplit(self.path).query else "")
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
    class H(Handler):
        def __init__(self, *args, **kw): super().__init__(*args, directory=d, **kw)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", a.port), H) as srv:
        print(f"serving {d} at http://127.0.0.1:{a.port}/ (clean URLs + 404 emulation)"); srv.serve_forever()
