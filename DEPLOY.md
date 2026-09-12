# Deploying to Hostinger (or any Apache / LiteSpeed host)

The platform is a static site. Production deployment is: build the package, put its files in the
web root, switch on HTTPS. Nothing runs on the server.

## 1. Build the package

```sh
python3 tools/build-content.py                       # validates the content graph
python3 tools/package-site.py --site-url https://YOUR-DOMAIN --pretty --zip
```

This writes `dist/` (about 24 MB, 250 files) and `dist/human-body-site.zip`. The package
contains only what the site serves, plus:

- `site/config.js` with your public URL and clean URLs switched on
  (`/conditions/gout` instead of `/conditions/condition.html?id=gout`; `.htaccess` does the rewrite)
- `sitemap.xml` with every page and entity, `robots.txt`, canonical links, social preview image
- `.htaccess`: HTTPS redirect, clean-URL rewrites, correct media types, gzip/brotli, caching,
  security headers, custom 404 page

If the site will live in a sub-folder of a domain (for example `https://example.com/atlas/`),
add `--base-path /atlas/`.

## 2. Put the files on Hostinger

Pick one:

**A. Continuous deployment through git (what anatomynexus.com uses).** The GitHub workflow
"Deploy to Hostinger" builds the package on every push and publishes `dist/` to the `deploy`
branch. On the hosting account a cron job (hPanel → Advanced → Cron jobs, every five minutes)
keeps the web root equal to that branch:

```sh
cd /home/USER/domains/example.com/public_html && { command -v git >/dev/null && { [ -d .git ] || { git init -q && git remote add origin https://github.com/mJunaid97/IBMready.git; }; } && git fetch -q --depth 1 origin deploy && git checkout -q -f -B deploy origin/deploy && git clean -q -fd -e .well-known && echo "git deploy $(git rev-parse --short HEAD) ok"; } || { mkdir -p "$HOME/tmp/hb" && curl -sL https://codeload.github.com/mJunaid97/IBMready/zip/refs/heads/deploy -o "$HOME/tmp/hb.zip" && rm -rf "$HOME/tmp/hb"/* && unzip -oq "$HOME/tmp/hb.zip" -d "$HOME/tmp/hb" && cp -a "$HOME/tmp/hb"/IBMready-deploy/. . && rm -rf "$HOME/tmp/hb" "$HOME/tmp/hb.zip" && echo "zip deploy ok"; }
```

No credentials are stored anywhere: the repository is public and the server only pulls. The
`.git` folder inside the web root is not served (`.htaccess` answers 404 for it). A change is
live within five minutes of the workflow finishing. To deploy a different branch or URL, run the
workflow manually from the Actions tab with the URL in the form.

**B. hPanel file manager (one-off).** Build with `--zip`, then hPanel → Websites → the domain →
File manager → open `public_html` → Upload `dist/human-body-site.zip` → right-click → Extract →
delete the zip. Turn on "Show hidden files" and confirm `.htaccess` is present.

**C. FTP.** Any FTP client, or the `SamKirkland/FTP-Deploy-Action` in a workflow with the FTP
account from hPanel → Files → FTP accounts, uploading `dist/` to `public_html`.

If the site ever moves to another host name, `--redirect-host old.example.com` on the package
script writes a permanent redirect for the old name into `.htaccess`.

## 3. Switch on HTTPS and check

- hPanel → Security → SSL: make sure a certificate is installed for the domain (Hostinger issues a
  free one; subdomains get their own). Then hPanel → Security → Force HTTPS: on.
- Open `https://YOUR-DOMAIN/` and `https://YOUR-DOMAIN/explorer/`. The explorer's top bar should
  reach "2,234 pieces · 1,671 structures".
- Open `https://YOUR-DOMAIN/conditions/gout` (clean URL) and a non-existent address to see the
  404 page.
- From a terminal:

```sh
curl -sI https://YOUR-DOMAIN/ | grep -iE "^(HTTP|content-security-policy|strict-transport|x-content-type)"
curl -sI -H "Accept-Encoding: gzip, br" https://YOUR-DOMAIN/data/content/clinical.json | grep -i content-encoding
curl -sI https://YOUR-DOMAIN/data/hd/glb/heart.glb | grep -iE "^(HTTP|content-type|cache-control)"
```

Expect `200`, the security headers, `content-encoding: gzip` (or `br`) on JSON, and
`model/gltf-binary` with a 30-day cache on geometry.

## 4. Versions, backups and rollback

Every deployment is a numbered release, and every release is kept so the site can go back.

```sh
python3 tools/release.py --bump patch -m "What changed"     # 1.0.0 -> 1.0.1, or --bump minor / major
```

or, without a local checkout, Actions → **Release** → Run workflow → enter the version (and a
one-line summary). Either way the content is validated, `VERSION`, `site/version.js` and
`CHANGELOG.md` are updated and committed, the commit is tagged `vX.Y.Z`, and the **Release**
workflow builds the package, publishes a GitHub Release with the zip attached (a complete backup
of that version), updates the `deploy` branch and tags it `deploy-vX.Y.Z`. The server pulls it
within five minutes, and the footer of every page shows the version and build id that are live.

To roll back: Actions → **Rollback** → Run workflow → enter the version (for example `1.0.0`).
The server is back on that version within five minutes; nothing in the source changes. Ordinary
pushes to the branch only run the QA workflow; they never deploy.

## 5. Updating the site

Edit `content/*.json`, run `python3 tools/build-content.py`, commit and push (QA runs), then
cut a release with `tools/release.py` as above. The old address `medical.mjunaid.net` has been
retired. HTML is cached for ten minutes and data for a day; if a
change does not appear, hPanel → Advanced → Cache manager → Purge, and hard-refresh the browser.

## Other hosts

- **Netlify / Cloudflare Pages / Vercel**: deploy `dist/` (built with `--pretty` and the
  matching `_redirects`/rewrites if you want clean URLs), `_headers` and `vercel.json` in the
  repository carry the same security and caching headers.
- **GitHub Pages**: the `Deploy to GitHub Pages` workflow publishes the repository as-is (query
  URLs, no custom headers).
- **Any static server**: serve the repository root or `dist/`; without rewrites leave `--pretty`
  off so links use the `?id=` form, which works everywhere.
