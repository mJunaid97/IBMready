/**
 * smoke.mjs — end-to-end smoke test for the static site. Serves nothing itself: point BASE_URL at
 * a running static server (default http://127.0.0.1:8123/). Exits non-zero on any failure.
 *
 *   node smoke.mjs                       # uses Playwright's bundled Chromium
 *   PW_CHROME=/path/to/chrome node …     # use a specific Chromium build
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = (process.env.BASE_URL || 'http://127.0.0.1:8123/').replace(/\/?$/, '/');
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

const rendered = () => page.waitForFunction(() => { const m = document.querySelector('main'); return m && !/Loading…/.test(m.textContent) && m.querySelectorAll('a').length > 0; }, null, { timeout: 45000 });

// 1. every page type renders
const pages = ['', 'systems/', 'systems/system.html?id=heart', 'organs/', 'organs/organ.html?id=liver', 'learn/terminology.html', 'study/', 'roadmap/', 'search/?q=knee',
  ...['physiology', 'symptoms', 'conditions', 'tests', 'imaging', 'procedures', 'medications', 'first-aid', 'health'].map(t => `${t}/`)];
const hrefs = new Set();
for (const p of pages) {
  await page.goto(base + p, { waitUntil: 'load' });
  try { await rendered(); } catch { fail(`${p || '/'} did not render`); continue; }
  const r = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent.trim(), undef: (document.body.innerText.match(/\bundefined\b|\[object Object\]|\bNaN\b/g) || []).length, hrefs: [...document.querySelectorAll('a[href]')].map(a => a.href), overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
  r.hrefs.forEach(h => hrefs.add(h));
  if (!r.h1 || r.undef || r.overflow) fail(`${p || '/'}: h1=${r.h1} undefined-text=${r.undef} overflow=${r.overflow}`); else ok(`${p || '/'} · ${r.h1}`);
}

// 2. every entity page renders with related links
const clinical = await (await page.request.get(base + 'data/content/clinical.json')).json();
let n = 0;
for (const [kind, names] of Object.entries(clinical.names)) {
  const t = clinical.types[kind];
  for (const id of Object.keys(names)) {
    n++;
    await page.goto(`${base}${t.dir}/${t.page}?id=${id}`, { waitUntil: 'load' });
    try { await rendered(); } catch { fail(`${kind}/${id} did not render`); continue; }
    const r = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent.trim(), undef: (document.body.innerText.match(/\bundefined\b|\[object Object\]/g) || []).length, rel: document.querySelectorAll('.aside .chip').length, hrefs: [...document.querySelectorAll('a[href]')].map(a => a.href) }));
    r.hrefs.forEach(h => hrefs.add(h));
    if (!r.h1 || r.h1 === 'Not found' || r.undef || !r.rel) fail(`${kind}/${id}: ${JSON.stringify({ h1: r.h1, undef: r.undef, rel: r.rel })}`);
  }
}
ok(`${n} entity pages rendered`);

// 3. every internal link resolves
const internal = [...new Set([...hrefs].filter(h => h.startsWith(base)).map(h => h.split('#')[0]))];
let broken = 0;
for (const u of internal) { const r = await page.request.get(u); if (r.status() >= 400) { broken++; fail(`broken link ${r.status()} ${u.replace(base, '/')}`); } }
ok(`${internal.length} internal links checked, ${broken} broken`);

// 4. header search typeahead
await page.goto(base, { waitUntil: 'load' }); await page.fill('#hsearch-q', 'knee'); await page.waitForTimeout(800);
const ta = await page.evaluate(() => document.querySelectorAll('#hsearch-results li a').length);
if (ta < 2) fail(`typeahead returned ${ta} results for "knee"`); else ok(`typeahead: ${ta} results`);

// 5. explorer: geometry loads, structure card shows clinical topics, multi-select links, locate mode
await page.goto(base + 'explorer/index.html?quality=lite#s=FJ3365', { waitUntil: 'load' });
let loaded = true;
try { await page.waitForFunction(() => window.atlas && window.atlas.viewer.systems.every(s => s.loaded), null, { timeout: 240000 }); } catch { loaded = false; fail('explorer geometry did not finish loading'); }
if (loaded) {
  await page.waitForTimeout(800);
  const ex = await page.evaluate(() => ({ name: document.getElementById('info-name').textContent, groups: document.querySelectorAll('#info-clinical .clin-group').length, chips: document.querySelectorAll('#info-clinical a.chip').length, pieces: window.atlas.data.totals.pieces }));
  if (ex.name !== 'Right femur' || ex.groups < 3) fail(`explorer card: ${JSON.stringify(ex)}`); else ok(`explorer card: ${ex.name} with ${ex.groups} clinical groups`);
  await page.screenshot({ path: out + 'explorer.png' });
  await page.evaluate(() => { location.hash = '#s=FJ3365,FJ3310'; }); await page.waitForTimeout(800);
  const multi = await page.evaluate(() => window.atlas.viewer.selected.size);
  if (multi < 2) fail(`multi-structure link selected ${multi} pieces`); else ok(`multi-structure link: ${multi} pieces selected`);
  const loc = await page.evaluate(() => { const ui = window.atlas.ui; ui.toggleStudy(true); ui.startStudy('locate'); const t = ui.study.current.answer; ui.study.locateAnswer(t); return document.querySelector('.quiz-q')?.textContent; });
  if (loc !== 'Correct!') fail(`locate mode feedback: ${loc}`); else ok('locate mode answers');
}

// 6. phone layout has no horizontal overflow
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, bypassCSP: true })).newPage();
for (const p of ['', 'conditions/condition.html?id=gout', 'first-aid/topic.html?id=cpr', 'search/?q=heart']) {
  await m.goto(base + p, { waitUntil: 'load' }); await m.waitForTimeout(1200);
  const w = await m.evaluate(() => ({ s: document.documentElement.scrollWidth, v: innerWidth }));
  if (w.s > w.v + 1) fail(`phone overflow on ${p || '/'}: ${w.s} > ${w.v}`);
}
ok('phone layout: no horizontal overflow');

// 7. CSP compliance: navigate only (no in-page evaluation), with the policy enforced
const strict = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
const cspMsgs = [];
strict.on('console', (msg) => { if (msg.type() === 'error' || /Content Security Policy|Refused to/.test(msg.text())) cspMsgs.push(`${strict.url().replace(base, '/')}: ${msg.text().slice(0, 200)}`); });
strict.on('pageerror', (e) => cspMsgs.push(`${strict.url().replace(base, '/')}: ${e.message.slice(0, 200)}`));
for (const p of ['', 'systems/system.html?id=heart', 'organs/organ.html?id=liver', 'conditions/condition.html?id=gout', 'first-aid/topic.html?id=cpr', 'study/', 'search/?q=liver', 'learn/terminology.html']) {
  await strict.goto(base + p, { waitUntil: 'load' }); await strict.waitForTimeout(2000);
  const html = await strict.content();
  if (!/<h1/.test(html) || /Loading…/.test(html)) fail(`CSP pass: ${p || '/'} did not render`);
}
await strict.goto(base + 'explorer/index.html?quality=lite#s=FJ3365', { waitUntil: 'load' });
let ready = false;
for (let i = 0; i < 36 && !ready; i++) { await strict.waitForTimeout(5000); ready = /data-ready="true"/.test(await strict.content()); }
if (!ready) fail('CSP pass: explorer did not become ready'); else ok('CSP pass: explorer ready under the enforced policy');
if (cspMsgs.length) fail(`CSP pass: ${cspMsgs.length} console errors: ${cspMsgs.slice(0, 5).join(' | ')}`); else ok('CSP pass: no policy violations on any page');

if (consoleErrors.length) fail(`${consoleErrors.length} console errors: ${consoleErrors.slice(0, 5).join(' | ')}`);
if (failedRequests.length) fail(`${failedRequests.length} failed requests: ${[...new Set(failedRequests)].slice(0, 5).join(' | ')}`);
await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nAll smoke checks passed');
process.exit(failures.length ? 1 : 0);
