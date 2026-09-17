#!/usr/bin/env python3
"""package-site.py — build the production copy of the site in dist/ (and optionally a zip of it).

    python3 tools/package-site.py --site-url https://anatomynexus.com --pretty --prerender --zip

What it does
  * copies only the files the site serves (no build tools, .github/, content sources or tests; the web pages under
    tools/ — the clinical tools hub and the Drug Interaction Checker — are the exception and are served)
  * writes site/config.js with the public URL and clean-URL mode, and stamps site/version.js
  * writes the sitemap index (sitemap.xml -> the five child sitemaps core, anatomy, clinical, medications
    and learning, canonical indexable URLs only, lastmod from the content dates, no changefreq/priority)
    and robots.txt with the absolute sitemap link
  * fills the generated URL rules into .htaccess: query URLs -> clean URLs, index.html -> directory,
    retired paths, the 301 alias table from data/content/aliases.json, trailing slashes
  * --prerender: renders every page to static HTML with tools/prerender.mjs (needs Playwright, see
    tools/qa) so crawlers get titles, content, breadcrumbs, links and schema in the initial response;
    required with --pretty (a trailing-slash URL can only be served by a real page directory)
  * makes the explorer's canonical and social image absolute; rewrites root-relative paths when the
    site lives under a sub-path (--base-path /atlas/)
  * optionally zips dist/ so the archive can be uploaded and extracted in one step

The output is plain files: upload dist/ (or extract the zip) into the web root of any static host.
"""
import argparse, datetime, json, os, re, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE_DIRS = ("tools/", ".github/", "content/", "brand/")     # brand/: the logo kit (print files, sources); the site serves site/logo/
# served files inside the excluded directories: the roadmap data, and the web pages of the clinical tools (tools/ is the URL
# namespace of the tools hub and the Drug Interaction Checker as well as the build pipeline's directory)
KEEP_IN_CONTENT = ("content/roadmap.json", "tools/index.html", "tools/drug-interaction-checker/index.html")
EXCLUDE_FILES = (".gitignore", "vercel.json", "_headers", "tools/qa/shots")
SECTIONS = {"physiology": "topic.html", "symptoms": "symptom.html", "conditions": "condition.html", "tests": "test.html", "biomarkers": "biomarker.html", "imaging": "study.html",
            "procedures": "procedure.html", "medications": "medication.html", "drug-classes": "class.html", "targets": "target.html", "first-aid": "topic.html", "health": "topic.html"}
ANATOMY = {"anatomy": "organ.html", "systems": "system.html"}
EXTRA = {"compare": "compare.html"}                # non-entity sections with their own detail pages (data/content/comparisons.json)
# The five child sitemaps of the specification (section 6). Every indexable URL belongs to exactly one.
GROUPS = ("core", "anatomy", "clinical", "medications", "learning")
# Which group each entity section lands in: anatomy and systems are the atlas; the clinical layer, the test
# taxonomy and the comparisons sit together; medicines, their classes and their targets sit together.
SECTION_GROUP = {"anatomy": "anatomy", "systems": "anatomy",
                 "physiology": "clinical", "symptoms": "clinical", "conditions": "clinical", "tests": "clinical",
                 "biomarkers": "clinical", "imaging": "clinical", "procedures": "clinical", "first-aid": "clinical",
                 "health": "clinical", "compare": "clinical",
                 "medications": "medications", "drug-classes": "medications", "targets": "medications"}
# static pages: path -> sitemap group. No changefreq/priority: the specification (section 8) forbids both.
# The tools hub and the Drug Interaction Checker are "high-value tools" in the core sitemap (section 6.1); the
# methodology page is an editorial/trust page and belongs there too.
PAGES = {"": "core", "explorer/": "core", "tools/": "core", "tools/drug-interaction-checker/": "core",
         "editorial/drug-interaction-methodology/": "core", "about/": "core", "editorial-policy/": "core",
         "medical-review-policy/": "core", "references-policy/": "core", "corrections-policy/": "core",
         "disclaimer/": "core", "contact/": "core",
         "anatomy/": "anatomy", "systems/": "anatomy", "organs/": "anatomy",
         "medical-terms/": "learning", "study/": "learning"}
NOINDEX_PAGES = ["search/", "roadmap/"]          # prerendered, linked, but kept out of the sitemaps

def sitemap_eligible(u):
    """The one rule that decides whether a URL belongs in a sitemap (specification section 7).

    A URL qualifies only when it is a published, canonical, indexable, HTTP-200 page: not a noindex page, not a
    redirect or alias, not parameterised state, and past the content-quality gate. The gate itself lives in
    tools/build-content.py, which writes each entity's seo.index flag (publishable review status, a lead
    paragraph, >=600 characters of body prose, >=1 reference, >=2 relationship groups); this function is the
    single place that reads it, so indexability is decided once rather than in each section's loop."""
    if not u.get("index"): return False                          # noindex,follow, or failed the quality gate
    if u.get("alias") or u.get("redirect"): return False         # aliases 301 elsewhere; never their own canonical
    if "?" in u["path"] or "#" in u["path"]: return False        # parameterised or fragment state is never canonical
    if u.get("group") not in GROUPS: return False                # must belong to exactly one child sitemap
    return True
# retired paths -> their canonical page (one hop); the interaction checker moved from /interactions/ to the clinical tools
RETIRED = [("learn/terminology\\.html", "medical-terms/"), ("learn", "medical-terms/"), ("interactions(?:/index\\.html)?", "tools/drug-interaction-checker/")]

def served_files():
    out = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=ROOT, text=True)
    files = []
    for rel in out.splitlines():
        if not rel or not os.path.isfile(os.path.join(ROOT, rel)): continue
        if rel in EXCLUDE_FILES or rel.endswith(".glb.json"): continue
        if rel.startswith(EXCLUDE_DIRS) and rel not in KEEP_IN_CONTENT: continue
        files.append(rel)
    return files

def esc(s): return s.replace("&", "&amp;")

def stamp_assets(out, version):
    """Cache-busting. There is no bundler, so file names are not fingerprinted; instead every internal module import,
    script tag and stylesheet link in the package carries ?v=<version>. A browser or CDN that cached one release's
    modules can then never serve them to another release's pages (the failure seen when v1.1.0 first went live)."""
    q = f"?v={version}"
    n = 0
    js_re = re.compile(r"""((?:from|import)\s*['"])(\.{1,2}/[^'"?]+?\.m?js)(['"])""")
    html_re = re.compile(r"""((?:src|href)=")([^"?#]+?\.(?:m?js|css))(")""")
    for root, _, files in os.walk(out):
        rel_root = os.path.relpath(root, out).replace(os.sep, "/")
        if rel_root.startswith(("vendor", "data")): continue
        for f in files:
            path = os.path.join(root, f)
            if f.endswith((".js", ".mjs")):
                s = open(path, encoding="utf-8").read()
                s2 = js_re.sub(lambda m: m.group(1) + m.group(2) + q + m.group(3), s)
            elif f.endswith(".html"):
                s = open(path, encoding="utf-8").read()
                s2 = html_re.sub(lambda m: m.group(0) if m.group(2).startswith(("http:", "https:", "//")) or "/vendor/" in m.group(2) else m.group(1) + m.group(2) + q + m.group(3), s)
            else: continue
            if s2 != s: open(path, "w", encoding="utf-8").write(s2); n += 1
    return n

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-url", default="", help="public origin, e.g. https://example.com (used for canonical links, sitemap, social image)")
    ap.add_argument("--base-path", default="/", help="path under the origin where the site lives, e.g. /atlas/ (default /)")
    ap.add_argument("--pretty", action="store_true", help="clean URLs with a trailing slash (/conditions/gout/); requires .htaccess or a prerendered site")
    ap.add_argument("--prerender", action="store_true", help="render every page to static HTML (requires --pretty and Playwright in tools/qa)")
    ap.add_argument("--out", default=os.path.join(ROOT, "dist"))
    ap.add_argument("--zip", action="store_true", help="also write <out>/anatomy-nexus-site.zip")
    ap.add_argument("--redirect-host", action="append", default=[], help="old host name to redirect permanently to --site-url (repeatable)")
    a = ap.parse_args()
    if a.prerender and not a.pretty: sys.exit("--prerender needs --pretty (static pages live at clean URLs)")
    if a.pretty and not a.prerender: sys.exit("--pretty needs --prerender: clean URLs end with a slash, so only prerendered pages (with root-relative asset paths) can serve them")
    site = a.site_url.rstrip("/")
    base = "/" + a.base_path.strip("/") + "/" if a.base_path.strip("/") else "/"
    origin = site + base if site else base

    out = os.path.abspath(a.out)
    if os.path.exists(out): shutil.rmtree(out)
    files = served_files()
    for rel in files:
        dst = os.path.join(out, rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, rel), dst)

    # ---- server-side pull script (used by the Hostinger cron job; lives in the deploy branch so the server can fetch it)
    shutil.copy2(os.path.join(ROOT, "tools", "hostinger-pull.sh"), os.path.join(out, "hostinger-pull.sh"))

    # ---- version stamp: release from VERSION, build id from git
    version = open(os.path.join(ROOT, "VERSION"), encoding="utf-8").read().strip()
    try: build = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    except Exception: build = ""
    with open(os.path.join(out, "site", "version.js"), "w", encoding="utf-8") as f:
        f.write(f"// generated by tools/package-site.py\nexport const VERSION = {json.dumps(version)};\nexport const BUILD = {json.dumps(build)};\n")

    # ---- runtime configuration
    with open(os.path.join(out, "site", "config.js"), "w", encoding="utf-8") as f:
        f.write("// generated by tools/package-site.py\nexport const CONFIG = " + json.dumps({"siteUrl": site + base.rstrip("/") if site else "", "prettyUrls": bool(a.pretty)}, indent=2) + ";\n")

    # ---- cache-busting: stamp the release version into every internal script, stylesheet and module import
    stamped = stamp_assets(out, version)

    # ---- analytics: with a GA4 id in content/site.json the Content-Security-Policy (page meta tags and the server
    # header) admits Google's tag hosts; without one the policy stays strict and no third-party script exists
    site_meta_pre = json.load(open(os.path.join(ROOT, "content", "site.json"), encoding="utf-8"))
    ga4 = (site_meta_pre.get("analytics") or {}).get("ga4") or ""
    if ga4:
        add = {"script-src": " https://www.googletagmanager.com", "connect-src": " https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
               "img-src": " https://*.google-analytics.com https://*.googletagmanager.com"}
        def widen(policy):
            for k, v in add.items(): policy = re.sub(r"(%s [^;\"]*)" % k, lambda m: m.group(1) + v, policy, count=1)
            return policy
        n = 0
        for root_, _, files in os.walk(out):
            for f in files:
                if not f.endswith(".html") or "/vendor/" in root_: continue
                pth = os.path.join(root_, f); s_ = open(pth, encoding="utf-8").read()
                s2 = re.sub(r'(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")', lambda m: m.group(1) + widen(m.group(2)) + m.group(3), s_)
                if s2 != s_: open(pth, "w", encoding="utf-8").write(s2); n += 1
        pth = os.path.join(out, ".htaccess"); s_ = open(pth, encoding="utf-8").read()
        s2 = re.sub(r'(Header always set Content-Security-Policy ")([^"]*)(")', lambda m: m.group(1) + widen(m.group(2)) + m.group(3), s_)
        open(pth, "w", encoding="utf-8").write(s2)
        print(f"analytics: GA4 {ga4} enabled; CSP widened in {n} pages and .htaccess")

    # ---- the URL inventory: every page with its canonical path, lastmod, indexability and sitemap section
    content = json.load(open(os.path.join(ROOT, "data", "content", "atlas-content.json"), encoding="utf-8"))
    atlas = json.load(open(os.path.join(ROOT, "data", "hd", "atlas.json"), encoding="utf-8"))
    aliases = json.load(open(os.path.join(ROOT, "data", "content", "aliases.json"), encoding="utf-8"))
    site_meta = json.load(open(os.path.join(ROOT, "content", "site.json"), encoding="utf-8"))
    site_date = site_meta.get("_updated") or datetime.date.today().isoformat()
    types = {k: json.load(open(os.path.join(ROOT, "data", "content", "types", k + ".json"), encoding="utf-8")) for k in SECTIONS}
    def detail(d, page, i): return f"{d}/{i}/" if a.pretty else f"{d}/{page}?id={i}"
    urls = []   # dicts: path, lastmod, index, group, template (query-URL page that renders it, for the prerenderer)
    for p, grp in PAGES.items(): urls.append({"path": p, "lastmod": site_date, "index": True, "group": grp})
    for p in NOINDEX_PAGES: urls.append({"path": p, "lastmod": site_date, "index": False, "group": "core"})
    sys_dates = [s.get("updated") for s in content["systems"].values() if s.get("updated")]
    for s in atlas["systems"]:
        c = content["systems"].get(s["id"], {})
        urls.append({"path": detail("systems", "system.html", s["id"]), "lastmod": c.get("updated") or site_date, "index": True, "group": SECTION_GROUP["systems"], "template": f"systems/system.html?id={s['id']}"})
    for o in content["organs"]:
        urls.append({"path": detail("anatomy", "organ.html", o["id"]), "lastmod": o.get("updated") or site_date, "index": bool(o.get("index")), "group": SECTION_GROUP["anatomy"], "template": f"anatomy/organ.html?id={o['id']}"})
    for key, page in SECTIONS.items():
        T = types[key]; items = T["items"]
        hub_date = max([e.get("updated") or "" for e in items.values()] + [T["meta"].get("updated") or ""]) or site_date
        urls.append({"path": f"{key}/" if a.pretty else f"{key}/index.html", "lastmod": hub_date, "index": True, "group": SECTION_GROUP[key]})
        for i, e in items.items():
            urls.append({"path": detail(key, page, i), "lastmod": e.get("updated") or hub_date, "index": bool(e.get("seo", {}).get("index", False)), "group": SECTION_GROUP[key], "template": f"{key}/{page}?id={i}"})
    comparisons = json.load(open(os.path.join(ROOT, "data", "content", "comparisons.json"), encoding="utf-8"))
    cmp_date = max([c.get("updated") or "" for c in comparisons["comparisons"]] + [comparisons.get("updated") or ""]) or site_date
    urls.append({"path": "compare/" if a.pretty else "compare/index.html", "lastmod": cmp_date, "index": True, "group": SECTION_GROUP["compare"]})
    # ---- taxonomy pages: the test-category hub and one page per category (indexable when it has at least two pages), the medication class hub
    tcats = json.load(open(os.path.join(ROOT, "data", "content", "test-categories.json"), encoding="utf-8"))
    urls.append({"path": "tests/categories/" if a.pretty else "tests/categories/index.html", "lastmod": tcats.get("updated") or site_date, "index": True, "group": SECTION_GROUP["tests"]})
    for c in tcats["categories"]:
        urls.append({"path": f"tests/categories/{c['id']}/" if a.pretty else f"tests/category.html?id={c['id']}", "lastmod": tcats.get("updated") or site_date, "index": bool(c.get("seo", {}).get("index")), "group": SECTION_GROUP["tests"], "template": f"tests/category.html?id={c['id']}"})
    mtax = json.load(open(os.path.join(ROOT, "data", "content", "medication-taxonomy.json"), encoding="utf-8"))
    urls.append({"path": "medications/classes/" if a.pretty else "medications/classes/index.html", "lastmod": mtax.get("updated") or site_date, "index": True, "group": SECTION_GROUP["medications"]})
    for c in comparisons["comparisons"]:
        urls.append({"path": detail("compare", "compare.html", c["id"]), "lastmod": c.get("updated") or cmp_date, "index": True, "group": SECTION_GROUP["compare"], "template": f"compare/compare.html?id={c['id']}"})
    # hub lastmod for anatomy pages
    for u in urls:
        if u["path"] in ("anatomy/", "organs/"): u["lastmod"] = max([o.get("updated") or "" for o in content["organs"]] + [site_date])
        if u["path"] == "systems/": u["lastmod"] = max(sys_dates + [site_date])

    # ---- sitemaps: the index points at the five child sitemaps of the specification (section 6); only
    # canonical, indexable URLs, absolute HTTPS non-www, <lastmod> only, never <changefreq>/<priority>.
    # A sitemap is only valid with absolute HTTPS URLs and no query strings, so it is written only for a
    # production-shaped build. A local build (no --site-url, or no --pretty) gets no sitemap and a robots.txt
    # with no Sitemap line, rather than one full of relative or ?id= URLs that would be wrong if it shipped.
    if site.startswith("https://www."): sys.exit(f"--site-url must use the canonical non-www host (got {site!r})")
    if site and not site.startswith("https://"): sys.exit(f"--site-url must be an absolute https origin (got {site!r})")
    sitemapped = bool(site) and bool(a.pretty)
    if sitemapped: os.makedirs(os.path.join(out, "sitemaps"), exist_ok=True)
    sections = []
    for name in (GROUPS if sitemapped else ()):
        rows = [u for u in urls if u["group"] == name and sitemap_eligible(u)]
        if not rows: continue
        seen = set()
        for u in rows:
            if u["path"] in seen: sys.exit(f"duplicate URL in sitemap {name}: {u['path']}")
            seen.add(u["path"])
        xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for u in rows: xml.append(f"  <url><loc>{esc(origin + u['path'])}</loc><lastmod>{u['lastmod']}</lastmod></url>")
        xml.append("</urlset>")
        open(os.path.join(out, "sitemaps", f"{name}.xml"), "w", encoding="utf-8").write("\n".join(xml) + "\n")
        sections.append((name, max(u["lastmod"] for u in rows), len(rows)))
    if sitemapped:
        idx = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for name, lastmod, _ in sections: idx.append(f"  <sitemap><loc>{esc(origin + 'sitemaps/' + name + '.xml')}</loc><lastmod>{lastmod}</lastmod></sitemap>")
        idx.append("</sitemapindex>")
        open(os.path.join(out, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(idx) + "\n")
    else:
        print("note: no --site-url/--pretty, so no sitemap was written (a sitemap needs absolute clean URLs)")
    # robots.txt (specification section 5): allow everything, keep the API surface out, name the sitemap
    # absolutely. Pages that must not be indexed carry <meta name="robots" content="noindex,follow"> and stay
    # crawlable, because a blocked page can never be read for its noindex.
    open(os.path.join(out, "robots.txt"), "w", encoding="utf-8").write(
        f"# Anatomy Nexus robots.txt\n# Production SEO crawl policy\n# {origin}\n\n"
        f"User-agent: *\nAllow: {base}\n\n"
        f"# Non-page application endpoints should not be crawled.\n"
        f"# Keep CSS, JavaScript, images, fonts and static rendering assets crawlable.\n"
        f"Disallow: {base}api/\n"
        + (f"\nSitemap: {origin}sitemap.xml\n" if sitemapped else ""))

    # ---- .htaccess: generated URL rules at the marker
    p = os.path.join(out, ".htaccess"); s = open(p, encoding="utf-8").read()
    rules = ["  # ---- one canonical URL per page (generated by tools/package-site.py)"]
    if a.redirect_host and site:
        rules.append("  # retired host names redirect to the canonical site")
        for h in a.redirect_host: rules += [f"  RewriteCond %{{HTTP_HOST}} ^{re.escape(h)}$ [NC]", f"  RewriteRule ^ {site}%{{REQUEST_URI}} [L,R=301]"]
    if a.pretty:
        rules.append("  # query-style detail URLs -> clean URLs")
        for d, page in {**ANATOMY, **SECTIONS, **EXTRA, "organs": "organ.html"}.items():
            target = "anatomy" if d == "organs" else d
            rules += [f"  RewriteCond %{{QUERY_STRING}} ^id=([A-Za-z0-9-]+)$", f"  RewriteRule ^{re.escape(d)}/{re.escape(page)}$ {base}{target}/%1/? [R=301,L]"]
        rules += [f"  RewriteCond %{{QUERY_STRING}} ^id=([A-Za-z0-9-]+)$", f"  RewriteRule ^tests/category\\.html$ {base}tests/categories/%1/? [R=301,L]"]
        rules += ["  # retired paths, before the index.html rule so each is one hop (the query string, e.g. ?drugs=, is carried over)"] + [f"  RewriteRule ^{pat}/?$ {base}{target} [R=301,L]" for pat, target in RETIRED]
        rules += ["  # /section/index.html -> /section/ and /index.html -> /", "  RewriteCond %{THE_REQUEST} \\s/+(?:[^?\\s]*/)?index\\.html[\\s?]", f"  RewriteRule ^(.*/)?index\\.html$ {base}$1 [R=301,L]"]
        rules.append("  # URL aliases (synonyms, abbreviations, brand names, old ids) -> the canonical page, in one hop")
        for section, table in aliases.items():
            by_target = {}
            for alias, target in sorted(table.items()): by_target.setdefault(target, []).append(alias)
            dirs = ["anatomy", "organs"] if section == "anatomy" else ["drug-classes", "medications/classes"] if section == "drug-classes" else [section]
            for target, als in sorted(by_target.items()):
                pat = "|".join(re.escape(x) for x in als)
                for d in dirs: rules.append(f"  RewriteRule ^{d}/({pat})/?$ {base}{section}/{target}/ [R=301,L]")
        rules += ["  # /medications/classes/<class>/ is the recommended address of a class page; /drug-classes/<class>/ is canonical",
                  f"  RewriteRule ^medications/classes/([A-Za-z0-9-]+)/?$ {base}drug-classes/$1/ [R=301,L]",
                  f"  RewriteRule ^tests/categories/([A-Za-z0-9-]+)$ {base}tests/categories/$1/ [R=301,L]"]
        rules += ["  # organ pages moved to /anatomy/", f"  RewriteRule ^organs/([A-Za-z0-9-]+)/?$ {base}anatomy/$1/ [R=301,L]"]
        dirs = "|".join(list(ANATOMY) + list(SECTIONS) + list(EXTRA))
        rules += ["  # trailing slash on every section page", "  RewriteCond %{REQUEST_FILENAME} !-f", f"  RewriteRule ^({dirs})/([A-Za-z0-9-]+)$ {base}$1/$2/ [R=301,L]"]
    s = s.replace("  # @@GENERATED-URL-RULES@@", "\n".join(rules), 1)
    open(p, "w", encoding="utf-8").write(s)

    # ---- explorer: absolute canonical and social image (the explorer is an app, not prerendered)
    p = os.path.join(out, "explorer", "index.html"); s = open(p, encoding="utf-8").read()
    s = s.replace('<link rel="canonical" href="./">', f'<link rel="canonical" href="{origin}explorer/">').replace('<meta property="og:url" content="./">', f'<meta property="og:url" content="{origin}explorer/">').replace('content="../site/og-cover.png"', f'content="{origin}site/og-cover.png"')
    open(p, "w", encoding="utf-8").write(s)

    # ---- sub-path installs: root-relative references in the files that use them
    if base != "/":
        for rel in ("404.html", "manifest.webmanifest", "robots.txt"):
            p = os.path.join(out, rel)
            if not os.path.exists(p): continue
            s = open(p, encoding="utf-8").read()
            s = re.sub(r'(href|src|content|action)="/(?!/)', lambda m: f'{m.group(1)}="{base}', s)
            s = s.replace('"src": "/', f'"src": "{base}').replace('"start_url": "/', f'"start_url": "{base}')
            open(p, "w", encoding="utf-8").write(s)
        p = os.path.join(out, ".htaccess"); s = open(p, encoding="utf-8").read().replace("ErrorDocument 404 /404.html", f"ErrorDocument 404 {base}404.html"); open(p, "w", encoding="utf-8").write(s)

    # ---- prerender: static HTML for every page (home, hubs, entities, policies, search, roadmap, 404)
    if a.prerender:
        todo = [{"path": u["path"], **({"template": u["template"]} if u.get("template") else {})} for u in urls if u["path"] != "explorer/"] + [{"path": "404.html"}]
        listfile = os.path.join(out, ".prerender-urls.json")
        json.dump(todo, open(listfile, "w", encoding="utf-8"))
        r = subprocess.run(["node", os.path.join(ROOT, "tools", "prerender.mjs"), "--dist", out, "--urls", listfile, "--base", base], cwd=ROOT)
        os.remove(listfile)
        if r.returncode: sys.exit("prerender failed")

    n = sum(len(fs) for _, _, fs in os.walk(out)); size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(out) for f in fs)
    print(f"dist: {n} files, {size / 1048576:.1f} MB, {sum(1 for u in urls if sitemap_eligible(u))} indexable URLs in {len(sections)} sitemaps, {sum(len(t) for t in aliases.values())} alias redirects, {stamped} files version-stamped, version {version} build {build[:7]}, siteUrl={site or '(relative)'} base={base} prettyUrls={bool(a.pretty)} prerender={bool(a.prerender)}")
    if a.zip:
        zp = os.path.join(out, "anatomy-nexus-site.zip")
        with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for r, _, fs in os.walk(out):
                for f in fs:
                    full = os.path.join(r, f)
                    if full == zp: continue
                    z.write(full, os.path.relpath(full, out))
        print(f"zip: {zp} ({os.path.getsize(zp) / 1048576:.1f} MB)")

if __name__ == "__main__":
    main()
