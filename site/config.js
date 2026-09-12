/**
 * config.js — deployment settings. The defaults work on any static host (GitHub Pages, a local
 * `python3 -m http.server`, S3). `tools/package-site.py` rewrites this file for a production
 * build: `siteUrl` for canonical links and the sitemap, `prettyUrls: true` when the host applies
 * the rewrite rules in `.htaccess` (Hostinger, any Apache or LiteSpeed server) so that
 * /conditions/gout serves conditions/condition.html?id=gout.
 */
export const CONFIG = {
  siteUrl: '',          // e.g. 'https://example.com' (no trailing slash); empty = derive from the page URL
  prettyUrls: false,    // true only when the server rewrites /<section>/<slug> to the section page
};
