#!/usr/bin/env node
/**
 * render-previews.mjs — static preview images of the 3D atlas for every organ, system and entity view.
 *
 *   node tools/render-previews.mjs [--base http://127.0.0.1:8123/] [--out site/previews] [--only o-heart,sys-heart]
 *
 * Opens the explorer in headless Chromium for each explorer hash the site embeds (o=<organ>, sys=<system>,
 * s=<structures> from the knowledge graph) and screenshots the canvas at 1200×630 (the Open Graph size).
 * The file names come from site/preview-name.js, the same function the pages use, so a page and its
 * image can never disagree. Run once after content changes; the images are committed.
 * Needs the site served (any static server at --base) and Playwright (tools/qa: npm ci).
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
hashes.set('body', '');
for (const o of content.organs) hashes.set(previewName('o=' + o.id), 'o=' + o.id);
for (const s of atlas.systems) hashes.set(previewName('sys=' + s.id), 'sys=' + s.id);
for (const key of ['physiology', 'symptoms', 'conditions', 'tests', 'imaging', 'procedures', 'medications', 'drug-classes', 'first-aid', 'health']) {
  const T = JSON.parse(readFileSync(`${root}data/content/types/${key}.json`, 'utf8'));
  for (const e of Object.values(T.items)) {
    const a = e.anatomy || {}; let h = null;
    if (a.organs?.length) h = 'o=' + a.organs[0]; else if (a.structures?.length) h = 's=' + a.structures.slice(0, 12).join(','); else if (a.systems?.length) h = 'sys=' + a.systems[0];
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
  await page.evaluate(() => { const v = window.atlas.viewer; v.requestRender(); v.render && v.render(); });
  await page.waitForTimeout(100);
  const canvas = await page.$('#view');
  await canvas.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 78 });
  n++; if (n % 10 === 0 || n === todo.length) console.log(`  ${n}/${todo.length} ${name}`);
}
await browser.close();
const manifest = Object.fromEntries([...hashes].map(([name, hash]) => [name, hash]));
writeFileSync(`${out}/index.json`, JSON.stringify(manifest, null, 1) + '\n');
console.log(`done: ${n} rendered, manifest ${out}/index.json`);
