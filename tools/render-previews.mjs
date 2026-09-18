#!/usr/bin/env node
/**
 * render-previews.mjs — static preview images of the 3D atlas for every organ, system and entity view.
 *
 *   node tools/render-previews.mjs [--base http://127.0.0.1:8123/] [--out site/previews] [--only o-heart,sys-heart]
 *
 * Opens the explorer in headless Chromium for each explorer hash the site embeds (o=<organ>, sys=<system>,
 * s=<structures> from the knowledge graph) and screenshots the canvas at 1200×630 (the Open Graph size), with the
 * brand plate (the reversed logo and the name of the view) in the corner, so the same image serves the page's
 * 3D facade and its social preview. The file names come from site/preview-name.js, the same function the pages
 * use, so a page and its image can never disagree. Run once after content changes; the images are committed.
 * --extras also renders site/hero.jpg (the explorer itself, heart selected, 1400×900) and site/og-cover.png
 * (the site-wide social cover: logo, positioning line and the body on brand navy).
 * Needs the site served (any static server at --base) and Playwright (tools/qa: npm ci; PW_CHROME=<chromium> to
 * use an installed browser).
 */
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { previewName } from '../site/preview-name.js';
import { pathToFileURL } from 'node:url';

// Playwright lives in tools/qa (npm ci there); resolve it from there when this script is run from the repository root.
const { chromium } = await import('playwright').catch(() => import(pathToFileURL(new URL('../tools/qa/node_modules/playwright/index.mjs', import.meta.url).pathname).href));

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : '1'] : []).filter(Boolean));
const base = (args.base || 'http://127.0.0.1:8123/').replace(/\/?$/, '/');
const out = args.out || 'site/previews';
const only = args.only ? new Set(args.only.split(',')) : null;
const root = new URL('../', import.meta.url).pathname;
const content = JSON.parse(readFileSync(root + 'data/content/atlas-content.json', 'utf8'));
const atlas = JSON.parse(readFileSync(root + 'data/hd/atlas.json', 'utf8'));

// ---- every hash a page can embed (mirrors embedHash in site/entity.js)
const hashes = new Map();                      // name -> hash
const labels = new Map();                      // name -> what the view shows (the brand plate's caption)
hashes.set('body', ''); labels.set('body', 'The human body in 3D');
// an organ the atlas does not model (no pieces) embeds the modelled structures around it, as site/site.js organHash does
const organHash = (o) => !o ? null : o.structures.length ? 'o=' + o.id : o.nearby?.length ? 's=' + o.nearby.map(i => atlas.structures[i].id).join(',') : null;
const organById = new Map(content.organs.map(o => [o.id, o]));
for (const o of content.organs) { const h = organHash(o); if (h) { hashes.set(previewName(h), h); labels.set(previewName(h), o.structures.length ? o.name : `${o.name}: surrounding structures`); } }
for (const s of atlas.systems) { hashes.set(previewName('sys=' + s.id), 'sys=' + s.id); labels.set(previewName('sys=' + s.id), s.name); }
for (const key of ['physiology', 'symptoms', 'conditions', 'tests', 'biomarkers', 'imaging', 'procedures', 'medications', 'drug-classes', 'targets', 'first-aid', 'health']) {
  const T = JSON.parse(readFileSync(`${root}data/content/types/${key}.json`, 'utf8'));
  for (const e of Object.values(T.items)) {
    const a = e.anatomy || {}; let h = null;
    for (const oid of a.organs || []) { h = organHash(organById.get(oid)); if (h) break; }
    if (!h && a.structures?.length) h = 's=' + a.structures.slice(0, 12).join(','); else if (!h && a.systems?.length) h = 'sys=' + a.systems[0];
    if (h) hashes.set(previewName(h), h);
  }
}
mkdirSync(out, { recursive: true });
const todo = [...hashes].filter(([name]) => (!only || only.has(name)) && (args.force || !existsSync(`${out}/${name}.jpg`)));
console.log(`${hashes.size} preview views, ${todo.length} to render → ${out}/`);

const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, bypassCSP: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message.slice(0, 200)));
let n = 0;
for (const [name, hash] of todo) {
  const url = `${base}explorer/index.html?embed=1&quality=hd${hash ? '#' + hash : ''}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.addStyleTag({ content: '.panel-right, .embed-open, #toast, .labels, .hint, .topbar, .panel-left, .toolbar, .panel-tab { display: none !important; }' });
  try { await page.waitForFunction(() => window.atlas && window.atlas.viewer.systems.every(s => s.loaded) && document.getElementById('app').dataset.ready === 'true', null, { timeout: 240000 }); }
  catch { console.error(`  ${name}: atlas did not finish loading`); continue; }
  await page.waitForTimeout(hash ? 1400 : 600);          // let the camera fly and the highlight settle
  // Render through the viewer's own animation loop and wait for that frame to be presented: a render() called
  // from outside the loop can be composited and then dropped before the screenshot, which left blank previews.
  await page.evaluate(() => new Promise((resolve) => { const v = window.atlas.viewer; v.addEventListener('frame', () => requestAnimationFrame(() => requestAnimationFrame(resolve)), { once: true }); v.requestRender(); }));
  await addBrandPlate(page, labels.get(name) || 'Anatomy in 3D');
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 80 });   // the canvas fills the viewport
  n++; if (n % 10 === 0 || n === todo.length) console.log(`  ${n}/${todo.length} ${name}`);
}
if (args.extras) await renderExtras(browser);
await browser.close();
const manifest = Object.fromEntries([...hashes].map(([name, hash]) => [name, hash]));
writeFileSync(`${out}/index.json`, JSON.stringify(manifest, null, 1) + '\n');
console.log(`done: ${n} rendered, manifest ${out}/index.json`);

/** The brand plate: the reversed logo on navy with the name of the view, bottom-left, as on every social preview. */
async function addBrandPlate(page, label) {
  await page.evaluate(({ label, logo }) => {
    document.getElementById('brand-plate')?.remove();       // hash-only navigations keep the document, so replace the last plate
    const el = document.createElement('div'); el.id = 'brand-plate';
    el.style.cssText = 'position:absolute;left:20px;bottom:20px;z-index:60;display:flex;align-items:center;gap:14px;padding:10px 16px 10px 14px;border-radius:12px;background:#0B2D45;color:#F7F9FB;font:600 16px/1 Inter,system-ui,sans-serif;letter-spacing:-0.01em;box-shadow:0 8px 24px rgba(11,45,69,.28)';
    el.innerHTML = `<img src="${logo}" alt="" style="display:block;height:26px;width:auto">` + (label ? `<span style="padding-left:14px;border-left:1px solid rgba(247,249,251,.35);white-space:nowrap">${label.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>` : '');
    document.getElementById('app').appendChild(el);
    return el.querySelector('img').decode();
  }, { label, logo: `${base}site/logo/anatomy-nexus-white.svg` });
  await page.evaluate(() => document.fonts.ready);
}

/** site/hero.jpg (the product with the heart selected) and site/og-cover.png (logo, positioning line, the body on navy). */
async function renderExtras(browser) {
  const settle = (p) => p.waitForFunction(() => window.atlas && window.atlas.viewer.systems.every(s => s.loaded) && document.getElementById('app').dataset.ready === 'true', null, { timeout: 240000 });
  // ---- hero: the explorer as a person sees it, light theme, heart selected, structure card open
  const hero = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1, bypassCSP: true, colorScheme: 'light' })).newPage();
  await hero.goto(`${base}explorer/index.html?quality=hd#o=heart`, { waitUntil: 'load' });
  await settle(hero); await hero.waitForTimeout(1800);
  await hero.addStyleTag({ content: '#toast, .hint { display: none !important; }' });
  await hero.evaluate(() => { const v = window.atlas.viewer; v.requestRender(); v.render && v.render(); });
  await hero.waitForTimeout(150);
  await hero.screenshot({ path: `${root}site/hero.jpg`, type: 'jpeg', quality: 84 });
  console.log('  site/hero.jpg');
  // ---- cover: the whole body rendered on brand navy, then composed with the logo and the positioning line
  const body = await (await browser.newContext({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 1, bypassCSP: true, colorScheme: 'dark' })).newPage();
  await body.goto(`${base}explorer/index.html?embed=1&quality=hd`, { waitUntil: 'load' });
  await settle(body); await body.waitForTimeout(800);
  await body.addStyleTag({ content: '.app { background: #0B2D45 !important; background-image: none !important; } .panel-right, .embed-open, #toast, .labels, .hint, .topbar, .panel-left, .toolbar, .panel-tab { display: none !important; }' });
  await body.evaluate(() => { const v = window.atlas.viewer; v.requestRender(); v.render && v.render(); });
  await body.waitForTimeout(150);
  const bodyPng = (await body.screenshot({ type: 'png' })).toString('base64');
  // composed in a same-origin document (opened on the site's 404 page) so the self-hosted font loads without CORS
  const cover = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, bypassCSP: true })).newPage();
  await cover.goto(`${base}404.html`, { waitUntil: 'load' });
  await cover.evaluate((html) => { document.open(); document.write(html); document.close(); }, `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; font-weight: 400 700; src: url(${base}site/fonts/inter-latin.woff2) format("woff2"); }
    html, body { margin: 0; } body { width: 1200px; height: 630px; overflow: hidden; background: #0B2D45; font-family: Inter, system-ui, sans-serif; font-optical-sizing: auto; color: #F7F9FB; position: relative; }
    .figure { position: absolute; right: 30px; top: -30px; height: 720px; width: auto; }
    .glow { position: absolute; right: -120px; top: -160px; width: 760px; height: 760px; border-radius: 50%; background: radial-gradient(closest-side, rgba(78,156,171,.28), transparent 70%); }
    .text { position: absolute; left: 72px; top: 50%; transform: translateY(-50%); width: 680px; }
    .logo { height: 58px; width: auto; display: block; }
    h1 { font-size: 54px; line-height: 1.08; font-weight: 600; letter-spacing: -0.025em; margin: 40px 0 18px; }
    p { font-size: 20px; line-height: 1.45; color: #A7B3BD; margin: 0; max-width: 600px; }
    .rule { display: flex; align-items: center; gap: 14px; margin-top: 30px; font-size: 15px; color: #A7B3BD; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; }
    .rule::before { content: ""; width: 36px; height: 2px; background: #4E9CAB; }
  </style></head><body>
    <div class="glow"></div>
    <img class="figure" src="data:image/png;base64,${bodyPng}" alt="">
    <div class="text"><img class="logo" src="${base}site/logo/anatomy-nexus-white.svg" alt="Anatomy Nexus">
      <h1>Explore the Human Body.<br>Understand Medicine.</h1>
      <p>Interactive 3D anatomy connected to physiology, symptoms, conditions, tests, imaging, procedures and medications.</p>
      <div class="rule">anatomynexus.com</div></div>
  </body></html>`);
  await cover.evaluate(() => document.fonts.ready); await cover.waitForTimeout(300);
  await cover.screenshot({ path: `${root}site/og-cover.png`, type: 'png' });
  console.log('  site/og-cover.png');
}
