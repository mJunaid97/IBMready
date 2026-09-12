#!/usr/bin/env python3
"""release.py — cut a versioned release.

    python3 tools/release.py --bump patch            # 1.0.0 -> 1.0.1
    python3 tools/release.py --version 1.2.0 -m "Adds the endocrine primer"
    python3 tools/release.py --bump minor --no-push  # prepare locally, push later

Steps: validate the content graph, bump VERSION and site/version.js, add a CHANGELOG entry,
commit, create the annotated tag vX.Y.Z and push branch + tag. Pushing the tag starts the
Release workflow, which builds the package, publishes a GitHub Release with the zip, updates
the `deploy` branch (what the server pulls) and tags it deploy-vX.Y.Z so it can be restored.
"""
import argparse, datetime, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sh(*cmd, capture=False):
    r = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=capture)
    if r.returncode: sys.exit(f"command failed: {' '.join(cmd)}\n{r.stderr if capture else ''}")
    return r.stdout.strip() if capture else None

def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--bump", choices=["major", "minor", "patch"])
    g.add_argument("--version")
    ap.add_argument("-m", "--message", default="", help="one-line summary for the changelog")
    ap.add_argument("--no-push", action="store_true")
    a = ap.parse_args()

    if sh("git", "status", "--porcelain", capture=True): sys.exit("working tree is not clean: commit or stash first")
    cur = open(os.path.join(ROOT, "VERSION")).read().strip()
    if a.version:
        new = a.version.lstrip("v")
        if not re.fullmatch(r"\d+\.\d+\.\d+", new): sys.exit("version must look like 1.2.3")
    else:
        M, m, p = map(int, cur.split("."))
        new = {"major": f"{M + 1}.0.0", "minor": f"{M}.{m + 1}.0", "patch": f"{M}.{m}.{p + 1}"}[a.bump]
    if sh("git", "tag", "-l", f"v{new}", capture=True): sys.exit(f"tag v{new} already exists")

    print(f"validating content graph…"); sh(sys.executable, os.path.join(ROOT, "tools", "build-content.py"))
    if sh("git", "status", "--porcelain", "--", "data/content", capture=True): sys.exit("data/content changed when compiling: commit the compiled data first")

    open(os.path.join(ROOT, "VERSION"), "w").write(new + "\n")
    vjs = os.path.join(ROOT, "site", "version.js"); s = open(vjs).read()
    open(vjs, "w").write(re.sub(r"export const VERSION = '[^']*';", f"export const VERSION = '{new}';", s))
    log = os.path.join(ROOT, "CHANGELOG.md"); text = open(log).read() if os.path.exists(log) else "# Changelog\n\n"
    since = sh("git", "log", f"v{cur}..HEAD", "--pretty=format:- %s", capture=True) if sh("git", "tag", "-l", f"v{cur}", capture=True) else ""
    entry = f"## v{new} — {datetime.date.today().isoformat()}\n\n" + (f"{a.message}\n\n" if a.message else "") + (since + "\n\n" if since else "")
    text = text.replace("# Changelog\n\n", "# Changelog\n\n" + entry, 1)
    open(log, "w").write(text)

    sh("git", "add", "VERSION", "site/version.js", "CHANGELOG.md")
    sh("git", "commit", "-q", "-m", f"Release v{new}" + (f": {a.message}" if a.message else ""))
    sh("git", "tag", "-a", f"v{new}", "-m", f"Release v{new}" + (f": {a.message}" if a.message else ""))
    print(f"created v{new}")
    if not a.no_push:
        branch = sh("git", "rev-parse", "--abbrev-ref", "HEAD", capture=True)
        sh("git", "push", "origin", branch); sh("git", "push", "origin", f"v{new}")
        print(f"pushed {branch} and tag v{new}; the Release workflow now builds, publishes and deploys it")

if __name__ == "__main__":
    main()
