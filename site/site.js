/**
 * site.js — shared shell for the Human Body Platform pages (everything outside the 3D explorer).
 * Renders the navigation, loads the anatomy data, and offers small helpers for page scripts.
 */
export const ROOT = new URL('../', import.meta.url).href;   // absolute site root, works from any depth

export const SECTIONS = [
  { id: 'body', name: 'Human Body', live: true, href: 'systems/index.html', items: [
    { name: '3D anatomy explorer', href: 'explorer/index.html', live: true }, { name: 'Body systems', href: 'systems/index.html', live: true }, { name: 'Organs', href: 'organs/index.html', live: true },
    { name: 'Regions', href: 'explorer/#r=thorax', live: true }, { name: 'Anatomical terms', href: 'learn/terminology.html', live: true } ] },
  { id: 'learn', name: 'Learn', live: true, href: 'learn/terminology.html', items: [
    { name: 'Medical terminology', href: 'learn/terminology.html', live: true }, { name: 'Physiology', href: 'roadmap/index.html#physiology', live: false }, { name: 'Histology', href: 'roadmap/index.html#learn', live: false }, { name: 'Pathology', href: 'roadmap/index.html#learn', live: false }, { name: 'Embryology', href: 'roadmap/index.html#learn', live: false } ] },
  { id: 'symptoms', name: 'Symptoms', live: false, href: 'roadmap/index.html#symptoms' },
  { id: 'conditions', name: 'Conditions', live: false, href: 'roadmap/index.html#conditions' },
  { id: 'tests', name: 'Medical tests', live: false, href: 'roadmap/index.html#tests' },
  { id: 'imaging', name: 'Imaging', live: false, href: 'roadmap/index.html#imaging' },
  { id: 'procedures', name: 'Procedures', live: false, href: 'roadmap/index.html#procedures' },
  { id: 'medications', name: 'Medications', live: false, href: 'roadmap/index.html#medications' },
  { id: 'first-aid', name: 'First aid', live: false, href: 'roadmap/index.html#first-aid' },
  { id: 'health', name: 'Health', live: false, href: 'roadmap/index.html#health' },
  { id: 'study', name: 'Study', live: true, href: 'study/index.html', items: [
    { name: 'Identify the structure', href: 'study/index.html', live: true }, { name: 'Flashcards', href: 'explorer/?study=cards', live: true }, { name: 'Terminology quiz', href: 'study/index.html#terms', live: true }, { name: 'Labeling & viva practice', href: 'roadmap/index.html#study', live: false } ] },
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export { esc };

export function initTheme() {
  let t = null; try { t = localStorage.getItem('atlas-theme'); } catch {}
  if (t) document.documentElement.dataset.theme = t;
}
export function toggleTheme() {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; try { localStorage.setItem('atlas-theme', next); } catch {}
}

export function renderHeader(active) {
  initTheme();
  const primary = [['explorer/index.html', 'Explorer'], ['systems/index.html', 'Systems'], ['organs/index.html', 'Organs'], ['learn/terminology.html', 'Terminology'], ['study/index.html', 'Study'], ['roadmap/index.html', 'Roadmap']];
  const planned = SECTIONS.filter(s => !s.live);
  const html = `<header class="site-header"><div class="wrap">
    <a class="brand" href="${ROOT}index.html"><span class="brand-mark" aria-hidden="true"></span> Human Body</a>
    <button class="menu-toggle" id="menu-toggle" aria-label="Menu">☰</button>
    <nav class="nav" id="site-nav" aria-label="Site">
      ${primary.map(([h, n]) => `<a href="${ROOT}${h}" class="${active === n.toLowerCase() ? 'is-active' : ''}">${n}</a>`).join('')}
      <details><summary>More sections ▾</summary><div class="menu">
        ${planned.map(s => `<a href="${ROOT}${s.href}">${s.name} <span class="badge planned">planned</span></a>`).join('')}
      </div></details>
      <button class="theme-btn" id="theme-btn" title="Toggle light / dark" aria-label="Toggle theme">◐</button>
    </nav></div></header>`;
  document.body.insertAdjacentHTML('afterbegin', html);
  document.getElementById('menu-toggle').addEventListener('click', () => document.getElementById('site-nav').classList.toggle('is-open'));
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
}

export function renderFooter() {
  document.body.insertAdjacentHTML('beforeend', `<footer class="site-footer"><div class="wrap">
    <p>3D anatomy: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noopener">BodyParts3D</a>, © The Database Center for Life Science, licensed under CC BY 4.0. Structure names follow the Foundational Model of Anatomy. Educational content only: not medical advice, diagnosis or treatment.</p>
    <p><a href="${ROOT}roadmap/index.html">Roadmap</a> · <a href="${ROOT}data/ATTRIBUTION.md">Attribution &amp; licences</a> · <a href="${ROOT}ARCHITECTURE.md">Architecture</a></p>
  </div></footer>`);
}

let _data = null;
export async function loadData() {
  if (_data) return _data;
  const [atlas, content, terms] = await Promise.all([
    fetch(ROOT + 'data/hd/atlas.json').then(r => r.json()),
    fetch(ROOT + 'data/content/atlas-content.json').then(r => r.json()),
    fetch(ROOT + 'data/content/terms.json').then(r => r.json()).catch(() => ({ terms: [], categories: [] })),
  ]);
  const byName = new Map(atlas.structures.map((s, i) => [s.name, i]));
  _data = { atlas, content, terms, byName };
  return _data;
}

/** explorer deep links */
export const link = {
  structure: (id) => `${ROOT}explorer/index.html#s=${encodeURIComponent(id)}`,
  organ: (id) => `${ROOT}explorer/index.html#o=${encodeURIComponent(id)}`,
  region: (id) => `${ROOT}explorer/index.html#r=${encodeURIComponent(id)}`,
  system: (id) => `${ROOT}explorer/index.html#sys=${encodeURIComponent(id)}`,
  slice: (axis) => `${ROOT}explorer/index.html#slice=${axis}`,
  quiz: (sys) => `${ROOT}explorer/index.html?study=quiz${sys ? '&sys=' + encodeURIComponent(sys) : ''}`,
  cards: (sys) => `${ROOT}explorer/index.html?study=cards${sys ? '&sys=' + encodeURIComponent(sys) : ''}`,
  embed: (hash) => `${ROOT}explorer/index.html?embed=1${hash ? '#' + hash : ''}`,
};

export function termLink(term, data) {
  const a = term.atlas; if (!a) return null;
  if (a.structure) { const si = data.byName.get(a.structure); return si === undefined ? null : link.structure(data.atlas.structures[si].id); }
  if (a.organ) return link.organ(a.organ);
  if (a.region) return link.region(a.region);
  if (a.system) return link.system(a.system);
  if (a.slice) return link.slice(a.slice);
  return null;
}

export function param(name) { return new URLSearchParams(location.search).get(name); }
export function fmt(n) { return Number(n).toLocaleString('en-US'); }
