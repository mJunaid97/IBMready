/**
 * smoke.mjs — end-to-end smoke test for the site. Serves nothing itself: point BASE_URL at a running
 * server (default http://127.0.0.1:8123/). Exits non-zero on any failure.
 *
 *   node smoke.mjs                       # uses Playwright's bundled Chromium
 *   PW_CHROME=/path/to/chrome node …     # use a specific Chromium build
 *   PRETTY_URLS=1                        # the server has clean URLs (a packaged dist behind tools/qa/serve.py or .htaccess)
 *   PRERENDERED=1                        # the pages are static HTML (tools/package-site.py --prerender): checks the raw HTML
 *
 * Checks: every page type renders (title, one H1, canonical, robots, description, breadcrumbs, JSON-LD), every entity
 * page has related links and sources, every internal link resolves, the header typeahead, the explorer (geometry,
 * clinical card, multi-select, locate mode), the 3D facade loads the embed, the sitemap index and every URL in it,
 * the 301 rules (aliases, query URLs, index.html, trailing slash, retired paths), noindex on search, a real 404,
 * the phone layout, and CSP compliance with the policy enforced.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = (process.env.BASE_URL || 'http://127.0.0.1:8123/').replace(/\/?$/, '/');
const PRETTY = process.env.PRETTY_URLS === '1';
const STATIC = process.env.PRERENDERED === '1';
const detailUrl = (dir, page, id) => PRETTY ? `${base}${dir}/${id}/` : `${base}${dir}/${page}?id=${id}`;
const dirUrl = (dir) => PRETTY ? `${base}${dir}/` : `${base}${dir}/index.html`;
const out = new URL('./shots/', import.meta.url).pathname; mkdirSync(out, { recursive: true });
const failures = [];
const fail = (msg) => { failures.push(msg); console.log('FAIL', msg); };
const ok = (msg) => console.log('ok  ', msg);

const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
// The functional pass bypasses CSP because Playwright's own in-page evaluation is what a strict
// script-src blocks; CSP compliance is checked separately below with navigation only.
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, bypassCSP: true });
const page = await ctx.newPage();
const consoleErrors = [], failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${page.url().replace(base, '/')}: ${m.text().slice(0, 200)}`); });
page.on('pageerror', (e) => consoleErrors.push(`${page.url().replace(base, '/')}: ${e.message.slice(0, 200)}`));
page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url().replace(base, '/')}`); });

const rendered = () => page.waitForFunction(() => { const m = document.querySelector('main'); return m && !/Loading…/.test(m.textContent) && m.querySelectorAll('a').length > 0 && document.querySelector('.site-footer'); }, null, { timeout: 45000 });
const inspect = () => page.evaluate(() => {
  let ld = null, ldErr = '';
  try { ld = JSON.parse(document.getElementById('jsonld')?.textContent || 'null'); } catch (e) { ldErr = e.message; }
  const types = ld ? (ld['@graph'] || []).map(n => n['@type']) : [];
  return { title: document.title, h1s: document.querySelectorAll('h1').length, h1: document.querySelector('h1')?.textContent.trim(), canonical: document.querySelector('link[rel="canonical"]')?.href || '', robots: document.querySelector('meta[name="robots"]')?.content || '',
    desc: document.querySelector('meta[name="description"]')?.content || '', og: document.querySelector('meta[property="og:title"]')?.content || '', crumbs: document.querySelectorAll('.breadcrumb li').length, ld: types, ldErr,
    undef: (document.body.innerText.match(/\bundefined\b|\[object Object\]|\bNaN\b/g) || []).length, hrefs: [...document.querySelectorAll('a[href]')].map(a => a.href), overflow: document.documentElement.scrollWidth > innerWidth + 1,
    rel: document.querySelectorAll('.aside .chip').length, refs: document.querySelectorAll('.ref-list li').length, editorial: !!document.querySelector('.editorial'), facade: !!document.querySelector('.facade') };
});

// 1. every page type renders with complete metadata
const pages = ['', 'anatomy/', 'organs/', 'systems/', 'medical-terms/', 'study/', 'about/', 'editorial-policy/', 'medical-review-policy/', 'references-policy/', 'corrections-policy/', 'disclaimer/', 'contact/', 'roadmap/', 'search/?q=knee',
  ...['physiology', 'symptoms', 'conditions', 'tests', 'imaging', 'procedures', 'medications', 'drug-classes', 'first-aid', 'health'].map(t => `${t}/`)].map(p => PRETTY || !p.endsWith('/') ? p : p + 'index.html');
const hrefs = new Set(); const titles = new Map();
for (const p of pages) {
  await page.goto(base + p, { waitUntil: 'load' });
  try { await rendered(); } catch { fail(`${p || '/'} did not render`); continue; }
  const r = await inspect();
  r.hrefs.forEach(h => hrefs.add(h));
  const probs = [];
  if (r.h1s !== 1) probs.push(`h1 count ${r.h1s}`);
  if (!r.title.includes('Anatomy Nexus')) probs.push(`title "${r.title}"`);
  if (!r.canonical) probs.push('no canonical'); if (!r.robots) probs.push('no robots meta'); if (!r.desc) probs.push('no description');
  if (r.ldErr || !r.ld.includes('BreadcrumbList') && p !== '' && !p.startsWith('search')) probs.push(`json-ld ${r.ldErr || r.ld.join(',')}`);
  if (p !== '' && r.crumbs < 2) probs.push(`breadcrumbs ${r.crumbs}`);
  if (r.undef) probs.push(`undefined text ×${r.undef}`); if (r.overflow) probs.push('overflow');
  if (p.startsWith('search') && !/noindex/.test(r.robots)) probs.push('search page is indexable');
  if (titles.has(r.title)) probs.push(`duplicate title of ${titles.get(r.title)}`); titles.set(r.title, p || '/');
  if (probs.length) fail(`${p || '/'}: ${probs.join('; ')}`); else ok(`${p || '/'} · ${r.h1}`);
}

// 2. every entity page renders with metadata, schema, related links and sources
const clinical = await (await page.request.get(base + 'data/content/clinical.json')).json();
const content = await (await page.request.get(base + 'data/content/atlas-content.json')).json();
const atlas = await (await page.request.get(base + 'data/hd/atlas.json')).json();
const entityPages = [];
for (const [kind, names] of Object.entries(clinical.names)) { const t = clinical.types[kind]; for (const id of Object.keys(names)) entityPages.push([kind, id, detailUrl(t.dir, t.page, id), true]); }
for (const o of content.organs) entityPages.push(['anatomy', o.id, detailUrl('anatomy', 'organ.html', o.id), !!o.article]);
for (const s of atlas.systems) entityPages.push(['systems', s.id, detailUrl('systems', 'system.html', s.id), false]);
let n = 0; const descs = new Map();
for (const [kind, id, u, needsRefs] of entityPages) {
  n++;
  await page.goto(u, { waitUntil: 'load' });
  try { await rendered(); } catch { fail(`${kind}/${id} did not render`); continue; }
  const r = await inspect();
  r.hrefs.forEach(h => hrefs.add(h));
  const probs = [];
  if (r.h1s !== 1 || !r.h1 || r.h1 === 'Not found') probs.push(`h1 "${r.h1}" ×${r.h1s}`);
  if (!r.canonical.endsWith(PRETTY ? `/${id}/` : `?id=${id}`)) probs.push(`canonical ${r.canonical}`);
  if (!r.robots || !r.desc || !r.og) probs.push('metadata incomplete');
  if (r.ldErr || !r.ld.includes('BreadcrumbList') || !r.ld.includes('MedicalWebPage')) probs.push(`json-ld ${r.ldErr || r.ld.join(',')}`);
  if (r.crumbs < 3) probs.push(`breadcrumbs ${r.crumbs}`);
  if (!r.rel) probs.push('no related links'); if (needsRefs && !r.refs) probs.push('no sources'); if (!r.editorial) probs.push('no editorial block');
  if (r.undef) probs.push(`undefined text ×${r.undef}`);
  if (titles.has(r.title)) probs.push(`duplicate title of ${titles.get(r.title)}`); titles.set(r.title, `${kind}/${id}`);
  if (descs.has(r.desc)) probs.push(`duplicate description of ${descs.get(r.desc)}`); descs.set(r.desc, `${kind}/${id}`);
  if (probs.length) fail(`${kind}/${id}: ${probs.join('; ')}`);
}
ok(`${n} entity pages rendered with metadata, schema, related links and sources`);

// 3. every internal link resolves (and, under clean URLs, without a redirect)
const internal = [...new Set([...hrefs].filter(h => h.startsWith(base)).map(h => h.split('#')[0]))];
let broken = 0, redirected = 0;
for (const u of internal) {
  const r = await page.request.get(u, { maxRedirects: 0 }).catch(() => null);
  if (!r || r.status() >= 400) { broken++; fail(`broken link ${r ? r.status() : 'ERR'} ${u.replace(base, '/')}`); }
  else if (r.status() >= 300 && PRETTY) { redirected++; fail(`internal link redirects (${r.status()}) ${u.replace(base, '/')} → ${r.headers().location}`); }
}
ok(`${internal.length} internal links checked, ${broken} broken, ${redirected} redirecting`);

// 4. header search typeahead
await page.goto(base, { waitUntil: 'load' }); await page.fill('#hsearch-q', 'knee'); await page.waitForTimeout(800);
const ta = await page.evaluate(() => document.querySelectorAll('#hsearch-results li a').length);
if (ta < 2) fail(`typeahead returned ${ta} results for "knee"`); else ok(`typeahead: ${ta} results`);

// 4b. hub filters work after hydration
await page.goto(dirUrl('conditions'), { waitUntil: 'load' }); await rendered();
const before = await page.evaluate(() => document.querySelectorAll('#cards .card').length);
await page.fill('#q', 'gout'); await page.waitForTimeout(600);
const after = await page.evaluate(() => document.querySelectorAll('#cards .card').length);
if (!(before > 10 && after >= 1 && after < before)) fail(`hub filter: ${before} cards → ${after} after filtering`); else ok(`hub filter: ${before} cards → ${after} for "gout"`);

// 4c. the 3D facade swaps in the explorer embed on click
await page.goto(detailUrl('anatomy', 'organ.html', 'heart'), { waitUntil: 'load' }); await rendered();
const hadFacade = await page.evaluate(() => !!document.querySelector('.facade img') && !document.querySelector('iframe'));
await page.click('.facade-load'); await page.waitForTimeout(300);
const iframe = await page.evaluate(() => document.querySelector('.embed iframe')?.getAttribute('src') || '');
if (!hadFacade || !/embed=1/.test(iframe) || !/o=heart/.test(iframe)) fail(`facade: before=${hadFacade} iframe=${iframe}`); else ok('facade loads the explorer embed on click');

// 5. explorer: geometry loads, structure card shows clinical topics, multi-select links, locate mode
await page.goto(base + 'explorer/index.html?quality=lite#s=FJ3365', { waitUntil: 'load' });
let loaded = true;
try { await page.waitForFunction(() => window.atlas && window.atlas.viewer.systems.every(s => s.loaded), null, { timeout: 240000 }); } catch { loaded = false; fail('explorer geometry did not finish loading'); }
if (loaded) {
  await page.waitForTimeout(800);
  const ex = await page.evaluate(() => ({ name: document.getElementById('info-name').textContent, groups: document.querySelectorAll('#info-clinical .clin-group').length, chips: document.querySelectorAll('#info-clinical a.chip').length, pieces: window.atlas.data.totals.pieces, href: document.querySelector('#info-clinical a.chip')?.getAttribute('href') }));
  if (ex.name !== 'Right femur' || ex.groups < 3) fail(`explorer card: ${JSON.stringify(ex)}`); else ok(`explorer card: ${ex.name} with ${ex.groups} clinical groups`);
  if (PRETTY && ex.href && !/\/[a-z0-9-]+\/$/.test(ex.href)) fail(`explorer topic link is not a clean URL: ${ex.href}`);
  await page.screenshot({ path: out + 'explorer.png' });
  await page.evaluate(() => { location.hash = '#s=FJ3365,FJ3310'; }); await page.waitForTimeout(800);
  const multi = await page.evaluate(() => window.atlas.viewer.selected.size);
  if (multi < 2) fail(`multi-structure link selected ${multi} pieces`); else ok(`multi-structure link: ${multi} pieces selected`);
  const loc = await page.evaluate(() => { const ui = window.atlas.ui; ui.toggleStudy(true); ui.startStudy('locate'); const t = ui.study.current.answer; ui.study.locateAnswer(t); return document.querySelector('.quiz-q')?.textContent; });
  if (loc !== 'Correct!') fail(`locate mode feedback: ${loc}`); else ok('locate mode answers');
}

// 6. sitemap index, robots, and the initial HTML of prerendered pages
const sm = await page.request.get(base + 'sitemap.xml');
if (sm.status() !== 200) fail(`sitemap.xml returned ${sm.status()}`);
else {
  const xml = await sm.text(); const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  if (/<sitemapindex/.test(xml)) {
    let total = 0, bad = 0, sampled = 0;
    for (const child of locs) {
      const r = await page.request.get(child.replace(/^https?:\/\/[^/]+\//, base)); if (r.status() !== 200) { bad++; fail(`sitemap ${child} returned ${r.status()}`); continue; }
      const urls = [...(await r.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]); total += urls.length;
      for (const u of urls) { const rr = await page.request.get(u.replace(/^https?:\/\/[^/]+\//, base), { maxRedirects: 0 }); sampled++; if (rr.status() !== 200) { bad++; fail(`sitemap URL ${rr.status()} ${u}`); } }
    }
    ok(`sitemap index: ${locs.length} sitemaps, ${total} URLs, ${sampled} fetched, ${bad} bad`);
  } else ok(`sitemap: ${locs.length} URLs (single file)`);
}
const robots = await (await page.request.get(base + 'robots.txt')).text();
if (!/Disallow: \/search\//.test(robots) || !/Sitemap:/.test(robots)) fail(`robots.txt: ${robots.slice(0, 120)}`); else ok('robots.txt disallows search and names the sitemap');
if (STATIC) {
  for (const u of ['', detailUrl('conditions', 'condition.html', 'gout'), detailUrl('anatomy', 'organ.html', 'heart'), detailUrl('medications', 'medication.html', 'amlodipine'), dirUrl('tests')]) {
    const html = await (await page.request.get(base + u.replace(base, ''))).text();
    const probs = [];
    if (/Loading…/.test(html)) probs.push('Loading placeholder'); if (!/<h1[^>]*>[^<]+<\/h1>/.test(html)) probs.push('no h1'); if (!/<link rel="canonical" href="https?:\/\//.test(html)) probs.push('no absolute canonical');
    if (!/application\/ld\+json/.test(html)) probs.push('no json-ld'); if (!/class="breadcrumb"/.test(html) && u !== '') probs.push('no breadcrumbs'); if (!/data-prerendered/.test(html)) probs.push('not marked prerendered');
    if (!/<meta name="robots"/.test(html) || !/<meta property="og:title"/.test(html)) probs.push('metadata missing'); if (/href="\.\.\//.test(html) || /src="\.\.\//.test(html)) probs.push('relative ../ links');
    if (probs.length) fail(`initial HTML ${u || '/'}: ${probs.join('; ')}`);
  }
  ok('initial HTML of prerendered pages carries content, metadata, schema and breadcrumbs');
}

// 7. URL rules: aliases, query URLs, index.html, trailing slash, retired paths, 404
const status = async (p) => { const r = await page.request.get(base + p, { maxRedirects: 0 }); return [r.status(), (r.headers().location || '').replace(/^https?:\/\/[^/]+/, '')]; };
const nf = await status('no-such-page-xyz');
if (nf[0] !== 404) fail(`missing page returned ${nf[0]} instead of 404`); else ok('404 status for a missing page');
if (PRETTY) {
  const nf2 = await status('conditions/no-such-condition/');
  if (nf2[0] !== 404) fail(`unknown entity slug returned ${nf2[0]} instead of 404`);
  const expect = [['tests/cbc/', '/tests/complete-blood-count/'], ['medications/norvasc', '/medications/amlodipine/'], ['conditions/heart-attack/', '/conditions/myocardial-infarction/'], ['conditions/gout', '/conditions/gout/'], ['conditions/condition.html?id=gout', '/conditions/gout/'],
    ['organs/heart/', '/anatomy/heart/'], ['organs/organ.html?id=liver', '/anatomy/liver/'], ['anatomy/cardiac/', '/anatomy/heart/'], ['learn/terminology.html', '/medical-terms/'], ['conditions/index.html', '/conditions/'], ['index.html', '/']];
  let bad = 0;
  for (const [from, to] of expect) { const [s, loc] = await status(from); if (s !== 301 || !loc.endsWith(to)) { bad++; fail(`redirect ${from}: ${s} ${loc} (expected 301 ${to})`); } }
  ok(`${expect.length} redirect rules checked, ${bad} wrong`);
}

// 8. phone layout has no horizontal overflow
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, bypassCSP: true })).newPage();
for (const p of ['', detailUrl('conditions', 'condition.html', 'gout').replace(base, ''), detailUrl('first-aid', 'topic.html', 'cpr').replace(base, ''), detailUrl('anatomy', 'organ.html', 'heart').replace(base, ''), dirUrl('tests').replace(base, ''), 'search/?q=heart']) {
  await m.goto(base + p, { waitUntil: 'load' }); await m.waitForTimeout(1200);
  const w = await m.evaluate(() => ({ s: document.documentElement.scrollWidth, v: innerWidth }));
  if (w.s > w.v + 1) fail(`phone overflow on ${p || '/'}: ${w.s} > ${w.v}`);
}
ok('phone layout: no horizontal overflow');

// 9. CSP compliance: navigate only (no in-page evaluation), with the policy enforced
const strict = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
const cspMsgs = [];
strict.on('console', (msg) => { if (msg.type() === 'error' || /Content Security Policy|Refused to/.test(msg.text())) cspMsgs.push(`${strict.url().replace(base, '/')}: ${msg.text().slice(0, 200)}`); });
strict.on('pageerror', (e) => cspMsgs.push(`${strict.url().replace(base, '/')}: ${e.message.slice(0, 200)}`));
for (const p of ['', detailUrl('systems', 'system.html', 'heart'), detailUrl('anatomy', 'organ.html', 'liver'), detailUrl('conditions', 'condition.html', 'gout'), detailUrl('first-aid', 'topic.html', 'cpr'), dirUrl('study'), 'search/?q=liver', dirUrl('medical-terms'), dirUrl('about')].map(u => u.replace(base, ''))) {
  await strict.goto(base + p, { waitUntil: 'load' }); await strict.waitForTimeout(2000);
  const html = await strict.content();
  if (!/<h1/.test(html) || /Loading…/.test(html)) fail(`CSP pass: ${p || '/'} did not render`);
}
await strict.goto(base + 'explorer/index.html?quality=lite#s=FJ3365', { waitUntil: 'load' });
let ready = false;
for (let i = 0; i < 36 && !ready; i++) { await strict.waitForTimeout(5000); ready = /data-ready="true"/.test(await strict.content()); }
if (!ready) fail('CSP pass: explorer did not become ready'); else ok('CSP pass: explorer ready under the enforced policy');
if (cspMsgs.length) fail(`CSP pass: ${cspMsgs.length} console errors: ${cspMsgs.slice(0, 5).join(' | ')}`); else ok('CSP pass: no policy violations on any page');

if (consoleErrors.length) fail(`${consoleErrors.length} console errors: ${[...new Set(consoleErrors)].slice(0, 5).join(' | ')}`);
if (failedRequests.length) fail(`${failedRequests.length} failed requests: ${[...new Set(failedRequests)].slice(0, 5).join(' | ')}`);
await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nAll smoke checks passed');
process.exit(failures.length ? 1 : 0);
