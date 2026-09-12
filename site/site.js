/**
 * site.js — shared shell for the Human Body Platform pages (everything outside the 3D explorer).
 * Renders the navigation and header search, loads the anatomy and knowledge data, and offers
 * small helpers for page scripts: deep links into the explorer and links between entities.
 */
import { normalize, search as rankSearch } from '../explorer/search.js';
import { CONFIG } from './config.js';
export { CONFIG };

export const ROOT = new URL('../', import.meta.url).href;   // absolute site root, works from any depth

/** Entity types of the knowledge graph (mirrors tools/build-content.py TYPES). `field` is the link-field name other entities use. */
export const TYPES = {
  physiology:  { name: 'Physiology',    singular: 'Physiology topic', dir: 'physiology',  page: 'topic.html',      field: 'physiology',  icon: '⚙️', blurb: 'What the body does: cardiac, respiratory, nervous, digestive, renal and endocrine function explained through the anatomy.' },
  symptoms:    { name: 'Symptoms',      singular: 'Symptom',          dir: 'symptoms',    page: 'symptom.html',    field: 'symptoms',    icon: '🩺', blurb: 'Start from what a person feels: the anatomy involved, common and less common causes, and when to seek urgent care.' },
  conditions:  { name: 'Conditions',    singular: 'Condition',        dir: 'conditions',  page: 'condition.html',  field: 'conditions',  icon: '📋', blurb: 'Diseases and conditions: definition, affected anatomy, causes, symptoms, diagnosis, treatment and prevention.' },
  tests:       { name: 'Medical tests', singular: 'Medical test',     dir: 'tests',       page: 'test.html',       field: 'tests',       icon: '🧪', blurb: 'Blood, urine, heart and lung tests: what they measure, how they are done and how results are read.' },
  imaging:     { name: 'Imaging',       singular: 'Imaging study',    dir: 'imaging',     page: 'study.html',      field: 'imaging',     icon: '🩻', blurb: 'X-ray, CT, MRI, ultrasound, PET, mammography and fluoroscopy: how each works and what it shows.' },
  procedures:  { name: 'Procedures',    singular: 'Procedure',        dir: 'procedures',  page: 'procedure.html',  field: 'procedures',  icon: '🔧', blurb: 'Operations and procedures step by step, with the anatomy involved, recovery and risks.' },
  medications: { name: 'Medications',   singular: 'Medication',       dir: 'medications', page: 'medication.html', field: 'medications', icon: '💊', blurb: 'How common medicines work in the body, what they are for and what to watch for. Education, not prescribing.' },
  'first-aid': { name: 'First aid',     singular: 'First aid topic',  dir: 'first-aid',   page: 'topic.html',      field: 'firstAid',    icon: '🚑', blurb: 'CPR, choking, bleeding, burns, fractures, fainting, seizures and more, aligned with resuscitation guidelines.' },
  health:      { name: 'Health',        singular: 'Health topic',     dir: 'health',      page: 'topic.html',      field: 'health',      icon: '🌿', blurb: 'Exercise, sleep, nutrition, weight, smoking, alcohol and hydration, explained through the organs they act on.' },
};
export const TYPE_ORDER = ['conditions', 'symptoms', 'physiology', 'tests', 'imaging', 'procedures', 'medications', 'first-aid', 'health'];

export const SECTIONS = [
  { id: 'body', name: 'Human Body', live: true, href: 'systems/index.html', items: [
    { name: '3D anatomy explorer', href: 'explorer/index.html', live: true }, { name: 'Body systems', href: 'systems/index.html', live: true }, { name: 'Organs', href: 'organs/index.html', live: true },
    { name: 'Regions', href: 'explorer/index.html#r=thorax', live: true }, { name: 'Anatomical terms', href: 'learn/terminology.html', live: true } ] },
  { id: 'learn', name: 'Learn', live: true, href: 'learn/terminology.html', items: [
    { name: 'Medical terminology', href: 'learn/terminology.html', live: true }, { name: 'Physiology', href: 'physiology/index.html', live: true }, { name: 'Disease processes', href: 'learn/terminology.html#inflammation', live: true }, { name: 'Clinical terms', href: 'learn/terminology.html#acute', live: true }, { name: 'Histology & embryology', href: 'roadmap/index.html#learn', live: false } ] },
  { id: 'symptoms', name: 'Symptoms', live: true, href: 'symptoms/index.html' },
  { id: 'conditions', name: 'Conditions', live: true, href: 'conditions/index.html' },
  { id: 'tests', name: 'Medical tests', live: true, href: 'tests/index.html' },
  { id: 'imaging', name: 'Imaging', live: true, href: 'imaging/index.html' },
  { id: 'procedures', name: 'Procedures', live: true, href: 'procedures/index.html' },
  { id: 'medications', name: 'Medications', live: true, href: 'medications/index.html' },
  { id: 'first-aid', name: 'First aid', live: true, href: 'first-aid/index.html' },
  { id: 'health', name: 'Health', live: true, href: 'health/index.html' },
  { id: 'study', name: 'Study', live: true, href: 'study/index.html', items: [
    { name: 'Identify the structure', href: 'study/index.html', live: true }, { name: 'Locate the structure', href: 'explorer/index.html?study=locate', live: true }, { name: 'Flashcards', href: 'explorer/index.html?study=cards', live: true }, { name: 'Terminology & clinical quizzes', href: 'study/index.html#terms', live: true }, { name: 'Viva practice', href: 'study/index.html#viva', live: true } ] },
  { id: 'search', name: 'Search', live: true, href: 'search/index.html' },
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
  const primary = [['explorer/index.html', 'Explorer', 'explorer'], ['systems/index.html', 'Systems', 'systems'], ['organs/index.html', 'Organs', 'organs'], ['conditions/index.html', 'Conditions', 'conditions'], ['symptoms/index.html', 'Symptoms', 'symptoms'], ['first-aid/index.html', 'First aid', 'first-aid'], ['study/index.html', 'Study', 'study']];
  const more = [['physiology/index.html', 'Physiology'], ['tests/index.html', 'Medical tests'], ['imaging/index.html', 'Imaging'], ['procedures/index.html', 'Procedures'], ['medications/index.html', 'Medications'], ['health/index.html', 'Health'], ['learn/terminology.html', 'Terminology'], ['search/index.html', 'Search everything'], ['roadmap/index.html', 'Roadmap']];
  const html = `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap">
    <a class="brand" href="${ROOT}index.html"><span class="brand-mark" aria-hidden="true"></span> Human Body</a>
    <form class="hsearch" id="hsearch" action="${ROOT}search/index.html" role="search" autocomplete="off">
      <input name="q" id="hsearch-q" type="search" placeholder="Search structures, conditions, tests…" aria-label="Search the site" autocomplete="off">
      <ul class="hsearch-results" id="hsearch-results" hidden></ul>
    </form>
    <button class="menu-toggle" id="menu-toggle" aria-label="Menu" aria-expanded="false" aria-controls="site-nav">☰</button>
    <nav class="nav" id="site-nav" aria-label="Site">
      ${primary.map(([h, n, key]) => `<a href="${ROOT}${h}" class="${active === key ? 'is-active' : ''}"${active === key ? ' aria-current="page"' : ''}>${n}</a>`).join('')}
      <details><summary>More ▾</summary><div class="menu">
        ${more.map(([h, n]) => `<a href="${ROOT}${h}">${n}</a>`).join('')}
      </div></details>
      <button class="theme-btn" id="theme-btn" title="Toggle light / dark" aria-label="Toggle theme"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.4A6 6 0 0 1 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>
    </nav></div></header>`;
  document.body.insertAdjacentHTML('afterbegin', html);
  const main = document.querySelector('main'); if (main && !main.id) main.id = 'main';
  document.getElementById('menu-toggle').addEventListener('click', (e) => { const open = document.getElementById('site-nav').classList.toggle('is-open'); e.currentTarget.setAttribute('aria-expanded', String(open)); });
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
  bindHeaderSearch();
}

export function renderFooter() {
  document.body.insertAdjacentHTML('beforeend', `<footer class="site-footer"><div class="wrap">
    <p>3D anatomy: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noopener noreferrer">BodyParts3D</a>, © The Database Center for Life Science, licensed under CC BY 4.0. Structure names follow the Foundational Model of Anatomy. Clinical, first-aid and health content is written for education and follows public guidance from the NHS, WHO and Resuscitation Council UK; it is not medical advice, diagnosis or treatment. In an emergency call your local emergency number.</p>
    <p><a href="${ROOT}roadmap/index.html">Roadmap</a> · <a href="${ROOT}search/index.html">Search</a> · <a href="${ROOT}data/ATTRIBUTION.md">Attribution &amp; licences</a> · <a href="${ROOT}ARCHITECTURE.md">Architecture</a></p>
  </div></footer>`);
}

// ------------------------------------------------------------------ data
const _cache = new Map();
export function getJSON(rel) {
  if (!_cache.has(rel)) _cache.set(rel, fetch(ROOT + rel).then(r => { if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`); return r.json(); }));
  return _cache.get(rel);
}
let _data = null;
export async function loadData() {
  if (_data) return _data;
  const [atlas, content, terms] = await Promise.all([
    getJSON('data/hd/atlas.json'), getJSON('data/content/atlas-content.json'),
    getJSON('data/content/terms.json').catch(() => ({ terms: [], categories: [] })),
  ]);
  const byName = new Map(atlas.structures.map((s, i) => [s.name, i]));
  const byId = new Map(atlas.structures.map((s, i) => [s.id, i]));
  _data = { atlas, content, terms, byName, byId };
  return _data;
}
/** Small name index + organ/system/structure → entity backlinks (data/content/clinical.json). */
export const loadClinical = () => getJSON('data/content/clinical.json');
/** One entity type: { meta, items } (data/content/types/<key>.json). */
export const loadType = (key) => getJSON(`data/content/types/${key}.json`);
export const loadSearchIndex = () => getJSON('data/content/search-index.json');

// ----------------------------------------------------------------- links
export const link = {
  structure: (id) => `${ROOT}explorer/index.html#s=${encodeURIComponent(id)}`,
  structures: (ids) => `${ROOT}explorer/index.html#s=${ids.map(encodeURIComponent).join(',')}`,
  organ: (id) => `${ROOT}explorer/index.html#o=${encodeURIComponent(id)}`,
  region: (id) => `${ROOT}explorer/index.html#r=${encodeURIComponent(id)}`,
  system: (id) => `${ROOT}explorer/index.html#sys=${encodeURIComponent(id)}`,
  slice: (axis) => `${ROOT}explorer/index.html#slice=${axis}`,
  quiz: (sys) => `${ROOT}explorer/index.html?study=quiz${sys ? '&sys=' + encodeURIComponent(sys) : ''}`,
  locate: (sys) => `${ROOT}explorer/index.html?study=locate${sys ? '&sys=' + encodeURIComponent(sys) : ''}`,
  cards: (sys) => `${ROOT}explorer/index.html?study=cards${sys ? '&sys=' + encodeURIComponent(sys) : ''}`,
  embed: (hash) => `${ROOT}explorer/index.html?embed=1${hash ? '#' + hash : ''}`,
  organPage: (id) => CONFIG.prettyUrls ? `${ROOT}organs/${encodeURIComponent(id)}` : `${ROOT}organs/organ.html?id=${encodeURIComponent(id)}`,
  systemPage: (id) => CONFIG.prettyUrls ? `${ROOT}systems/${encodeURIComponent(id)}` : `${ROOT}systems/system.html?id=${encodeURIComponent(id)}`,
  term: (id) => `${ROOT}learn/terminology.html#${encodeURIComponent(id)}`,
};
export function entityLink(type, id) { const t = TYPES[type]; if (!t) return '#'; return CONFIG.prettyUrls ? `${ROOT}${t.dir}/${encodeURIComponent(id)}` : `${ROOT}${t.dir}/${t.page}?id=${encodeURIComponent(id)}`; }
export function typeLink(type) { const t = TYPES[type]; if (!t) return '#'; return CONFIG.prettyUrls ? `${ROOT}${t.dir}/` : `${ROOT}${t.dir}/index.html`; }
/** The entity id for a detail page: `?id=` on plain hosts, the last path segment under pretty URLs (/conditions/gout). */
export function pageId() {
  const q = param('id'); if (q) return q;
  const seg = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop() || '');
  return /\.html?$/i.test(seg) || !seg ? null : seg;
}
/** Absolute canonical URL for the current page, written into <link rel="canonical"> and used by the sitemap. */
export function canonical(path) {
  const base = CONFIG.siteUrl ? CONFIG.siteUrl.replace(/\/$/, '') + '/' : ROOT;
  return base + path.replace(/^\//, '');
}
export function setCanonical(path) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = canonical(path);
}
export function entityPath(type, id) { const t = TYPES[type]; return CONFIG.prettyUrls ? `${t.dir}/${encodeURIComponent(id)}` : `${t.dir}/${t.page}?id=${encodeURIComponent(id)}`; }
/** Link for any search-index entry type. */
export function anyLink(type, id) {
  switch (type) {
    case 'structure': return link.structure(id);
    case 'organ': return link.organPage(id);
    case 'system': return link.systemPage(id);
    case 'region': return link.region(id);
    case 'term': return link.term(id);
    default: return entityLink(type, id);
  }
}
export const TYPE_LABEL = { structure: 'Structure', organ: 'Organ', system: 'Body system', region: 'Region', term: 'Term', physiology: 'Physiology', symptoms: 'Symptom', conditions: 'Condition', tests: 'Test', imaging: 'Imaging', procedures: 'Procedure', medications: 'Medication', 'first-aid': 'First aid', health: 'Health' };

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

// ---------------------------------------------------------------- search
let _entries = null;
/** Build ranked-search entries from the flat search index (shared by the header box and the search page). */
export async function searchEntries() {
  if (_entries) return _entries;
  const idx = await loadSearchIndex();
  const rank = { system: 3, organ: 2.8, conditions: 2.7, symptoms: 2.7, 'first-aid': 2.6, region: 2.4, tests: 2.5, imaging: 2.5, procedures: 2.5, medications: 2.5, physiology: 2.4, health: 2.4, term: 2.2, structure: 2 };
  _entries = idx.entries.map(([type, id, name, aliases, sub]) => {
    const al = aliases ? aliases.split('|').map(normalize) : [];
    return { type, id, name, norm: normalize(name), aliases: al, words: [name, ...al].join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean), sub, rank: rank[type] ?? 2 };
  });
  return _entries;
}
export function runSearch(entries, q, limit = 12) { return rankSearch(entries, q, limit); }

function bindHeaderSearch() {
  const input = document.getElementById('hsearch-q'), list = document.getElementById('hsearch-results'); if (!input) return;
  let results = [], active = -1, entries = null, t = null;
  const close = () => { list.hidden = true; active = -1; };
  const render = () => {
    list.innerHTML = results.length ? results.map((r, i) => `<li role="option" aria-selected="${i === active}"><a href="${anyLink(r.type, r.id)}"><span class="r-name">${esc(r.name)}</span><span class="r-sub">${esc(r.sub)}</span><span class="r-type">${esc(TYPE_LABEL[r.type] || r.type)}</span></a></li>`).join('') : '<li class="r-empty">No matches</li>';
    list.hidden = false;
  };
  input.addEventListener('input', () => {
    clearTimeout(t);
    const q = input.value.trim(); if (!q) { close(); return; }
    t = setTimeout(async () => { entries = entries || await searchEntries(); results = runSearch(entries, q, 8); active = -1; render(); }, 80);
  });
  input.addEventListener('blur', () => setTimeout(close, 150));
  input.addEventListener('focus', () => { if (input.value.trim() && results.length) render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); active = (active + 1) % results.length; render(); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); active = (active - 1 + results.length) % results.length; render(); }
    else if (e.key === 'Enter' && active >= 0 && results[active]) { e.preventDefault(); location.href = anyLink(results[active].type, results[active].id); }
    else if (e.key === 'Escape') { close(); input.blur(); }
  });
}
