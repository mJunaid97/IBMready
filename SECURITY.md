# Security

## Threat model

The platform is a static site: HTML, CSS, ES modules and JSON, with no server-side code, no
accounts, no cookies and no third-party scripts. Everything the browser loads comes from the
same origin. The remaining risks are cross-site scripting through content, unsafe outbound links,
clickjacking of the embedded explorer, and supply-chain issues in the build tooling.

## Controls

- **No inline scripts.** Every page loads external ES modules only, so each page ships a
  `Content-Security-Policy` meta tag with `script-src 'self'` (the explorer additionally allows
  the SHA-256 of its import map and `'wasm-unsafe-eval'` for the meshopt decoder), `object-src
  'none'`, `base-uri 'self'`, `form-action 'self'` and `frame-src 'self'`.
- **Escaped rendering.** All content is rendered through `esc()` before entering `innerHTML`;
  ids used in URLs go through `encodeURIComponent`; reference links are accepted only when they
  are plain `https://` URLs (enforced by the compiler and again at render time) and open with
  `rel="noopener noreferrer"`.
- **Validated data.** `tools/build-content.py` rejects unknown ids, organs, systems, structure
  names, terms, categories and non-https references, so the compiled JSON the site loads can
  contain only what the schema allows.
- **URL parameters are looked up, never echoed.** `?id=`, `#s=`, `#sys=`, `#slice=`, `#e=` are
  matched against known ids or clamped; unknown values are ignored.
- **Storage.** Only `localStorage` for theme and geometry-quality preferences, always in
  `try/catch`.
- **Dependencies.** The runtime dependency is a vendored, pinned three.js (`vendor/three`);
  build tooling under `tools/` is dev-only and audited by Dependabot and `npm audit`.
- **Host headers.** Meta CSP cannot set `frame-ancestors`; `_headers` (Netlify, Cloudflare
  Pages) and `vercel.json` add `frame-ancestors 'self'`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy` and a `Permissions-Policy` on hosts that support headers. GitHub Pages does
  not support custom headers; the meta CSP still applies there.

## Reporting

Open a private security advisory on the GitHub repository, or an issue if the report is not
sensitive. Please include the page URL and steps to reproduce.

## Third-party scripts

None by default. If a Google Analytics 4 measurement id is set in `content/site.json`, the packaged site loads
`https://www.googletagmanager.com/gtag/js` from its own loader (`site/site.js`, no inline script) and the
Content-Security-Policy is widened only for Google's tag and collection hosts. Leaving the id empty keeps the strict
policy with no external script.
