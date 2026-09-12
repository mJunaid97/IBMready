#!/usr/bin/env node
/**
 * prerender.mjs — turn the client-rendered site into static HTML (static site generation).
 *
 *   node tools/prerender.mjs --dist dist --urls dist/.prerender-urls.json [--base /]
 *
 * Serves the packaged site from --dist on a local port, opens every page listed in --urls in headless
 * Chromium, waits for the page script to finish (header, content, metadata, JSON-LD), then writes the
 * rendered document to <dist>/<path>/index.html with `data-prerendered` on <body>. Every href/src is
 * rewritten to a root-relative URL so a page works at its clean address (/conditions/gout/). Afterwards
 * the query-URL template pages (conditions/condition.html …) are removed: each entity has exactly one
 * URL, and .htaccess redirects the old query form to it.
 *
 * Playwright is resolved from tools/qa/node_modules (npm ci there).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, unlinkSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import('playwright').catch(() => import(pathToFileURL(new URL('../tools/qa/node_modules/playwright/index.mjs', import.meta.url).pathname).href));

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : '1'] : []).filter(Boolean));
const dist = args.dist || 'dist';
const base = args.base || '/';                                     // public base path of the site
const list = JSON.parse(readFileSync(args.urls, 'utf8'));          // [{path, template?}] paths relative to the site root, '' = home
const TEMPLATES = { anatomy: 'organ.html', systems: 'system.html', physiology: 'topic.html', symptoms: 'symptom.html', conditions: 'condition.html', tests: 'test.html', imaging: 'study.html', procedures: 'procedure.html', medications: 'medication.html', 'drug-classes': 'class.html', 'first-aid': 'topic.html', health: 'topic.html' };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

// ---- a tiny static server that emulates the clean-URL rewrite for pages that are not prerendered yet
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(dist, p);
  if (p.endsWith('/')) file = join(file, 'index.html');
  if (!existsSync(file)) {
    const m = /^\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/.exec(p);
    if (m && TEMPLATES[m[1]] && existsSync(join(dist, m[1], TEMPLATES[m[1]]))) file = join(dist, m[1], TEMPLATES[m[1]]);
  }
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'max-age=3600' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, bypassCSP: true, javaScriptEnabled: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${page.url().replace(origin, '/')}: ${e.message.slice(0, 200)}`));
// console errors count as failures, except a third-party resource that could not load (an analytics tag in a
// sandbox without internet access): only our own origin's problems fail the build
page.on('console', (m) => { if (m.type() !== 'error') return; const src = (m.location() && m.location().url) || ''; if (src && !src.startsWith(origin)) return; errors.push(`${page.url().replace(origin, '/')}: ${m.text().slice(0, 200)}`); });

const ready = () => page.waitForFunction(() => {
  const m = document.querySelector('main'); const footer = document.querySelector('.site-footer');
  return m && footer && !/Loading…/.test(m.textContent) && (document.body.dataset.rendered === '1' || (document.getElementById('jsonld') && document.querySelector('link[rel="canonical"]')));
}, null, { timeout: 60000 });

let n = 0, failed = 0; const missingPreviews = new Set();
for (const { path, template } of list) {
  const src = template ? `${origin}${template}` : `${origin}${path}`;       // template: the query-URL page that renders this path
  await page.goto(src, { waitUntil: 'networkidle' });
  try { await ready(); } catch { failed++; console.error(`  ${path || '/'}: did not render`); continue; }
  if (await page.evaluate(() => document.body.dataset.status === '404')) { failed++; console.error(`  ${path || '/'}: rendered as not found`); continue; }
  const html = await page.evaluate(({ origin, base }) => {
    // every URL root-relative, so the document works at its clean address and from any depth
    const fix = (el, attr) => { const v = el.getAttribute(attr); if (!v || /^(#|mailto:|tel:|data:|javascript:)/i.test(v)) return; const abs = new URL(v, location.href).href; if (abs.startsWith(origin)) el.setAttribute(attr, base + abs.slice(origin.length).replace(/^((?:[^?#]*\/)?)index\.html(?=$|[?#])/, '$1')); };
    for (const el of document.querySelectorAll('[href]')) fix(el, 'href');
    for (const el of document.querySelectorAll('[src]')) fix(el, 'src');
    for (const el of document.querySelectorAll('[action]')) fix(el, 'action');
    // any other attribute that carries the local origin (data-embed on the facade, meta content in development builds)
    for (const el of document.querySelectorAll('*')) for (const at of el.attributes) if (at.value.startsWith(origin)) el.setAttribute(at.name, base + at.value.slice(origin.length));
    document.body.setAttribute('data-prerendered', '1');
    delete document.body.dataset.facadesBound; delete document.body.dataset.rendered;
    document.documentElement.removeAttribute('data-theme');
    for (const el of document.querySelectorAll('.hsearch-results')) { el.innerHTML = ''; el.hidden = true; }
    return '<!doctype html>\n' + document.documentElement.outerHTML + '\n';
  }, { origin, base });
  let out = html;
  for (const m of html.matchAll(/site\/previews\/([a-z0-9-]+)\.jpg/g)) { if (!existsSync(join(dist, 'site', 'previews', m[1] + '.jpg'))) { out = out.split(m[0]).join('site/previews/body.jpg'); missingPreviews.add(m[1]); } }
  const outFile = path.endsWith('.html') ? join(dist, path) : join(dist, path, 'index.html');
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, out);
  n++; if (n % 50 === 0) console.log(`  ${n}/${list.length}`);
}
await browser.close(); server.close();

// ---- one URL per page: drop the query-URL templates now that every entity page exists as a directory
let removed = 0;
for (const [dir, tpl] of Object.entries(TEMPLATES)) { const f = join(dist, dir, tpl); if (existsSync(f)) { unlinkSync(f); removed++; } }
const previews = join(dist, 'site', 'previews');
console.log(`prerendered ${n} pages (${failed} failed), removed ${removed} template pages, ${existsSync(previews) ? readdirSync(previews).length : 0} preview images`);
if (missingPreviews.size) console.error(`missing preview images (body.jpg used instead): ${[...missingPreviews].join(', ')}`);
if (errors.length) { console.error(`${errors.length} console errors while rendering:`); for (const e of [...new Set(errors)].slice(0, 20)) console.error('  ' + e); }
process.exit(failed || errors.length ? 1 : 0);
