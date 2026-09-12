/**
 * site.js — shared shell for the Anatomy Nexus pages (everything outside the 3D explorer).
 * Renders the navigation and header search, loads the anatomy and knowledge data, and offers
 * the URL helpers every page uses: canonical links between entities, deep links into the
 * explorer, and the clean-URL / query-URL switch (site/config.js).
 *
 * Pages can be served two ways:
 *   - development: the repository root on any static server; detail pages are
 *     <section>/<page>.html?id=<slug> and everything renders in the browser.
 *   - production (tools/package-site.py --pretty): every page is prerendered to
 *     <section>/<slug>/index.html with `data-prerendered` on <body>; the scripts then only bind
 *     interactivity (menu, search, theme, filters, the 3D facade) and never redraw the content.
 */
import { normalize, search as rankSearch } from '../explorer/search.js';
import { CONFIG } from './config.js';
import { VERSION, BUILD } from './version.js';
import { SITE } from './site-meta.js';
import { previewName } from './preview-name.js';
export { CONFIG, VERSION, BUILD, SITE };

export const ROOT = new URL('../', import.meta.url).href;   // absolute site root, works from any depth
export const PRETTY = !!CONFIG.prettyUrls;
export const BRAND = SITE.name;
/** True when the page arrived as prerendered HTML: bind interactivity, do not re-render content. */
export const PRERENDERED = typeof document !== 'undefined' && document.body && document.body.hasAttribute('data-prerendered');

/** Entity types of the knowledge graph (mirrors tools/build-content.py TYPES). `field` is the link-field name other
 *  entities use; `descriptor` completes the SEO title "[Name]: [Descriptor] | Anatomy Nexus". */
export const TYPES = {
  physiology:     { name: 'Physiology',    singular: 'Physiology topic', dir: 'physiology',   page: 'topic.html',      field: 'physiology',  icon: '⚙️', descriptor: 'How It Works',                   blurb: 'What the body does: cardiac, respiratory, nervous, digestive, renal and endocrine function explained through the anatomy.' },
  symptoms:       { name: 'Symptoms',      singular: 'Symptom',          dir: 'symptoms',     page: 'symptom.html',    field: 'symptoms',    icon: '🩺', descriptor: 'Causes & When to Seek Help',      blurb: 'Start from what a person feels: the anatomy involved, common and less common causes, and when to seek urgent care.' },
  conditions:     { name: 'Conditions',    singular: 'Condition',        dir: 'conditions',   page: 'condition.html',  field: 'conditions',  icon: '📋', descriptor: 'Causes, Symptoms & Treatment',   blurb: 'Diseases and conditions: definition, affected anatomy, causes, symptoms, diagnosis, treatment and prevention.' },
  tests:          { name: 'Medical tests', singular: 'Medical test',     dir: 'tests',        page: 'test.html',       field: 'tests',       icon: '🧪', descriptor: 'Purpose, Procedure & Results',   blurb: 'Blood, urine, heart and lung tests: what they measure, how they are done and how results are read.' },
  imaging:        { name: 'Imaging',       singular: 'Imaging study',    dir: 'imaging',      page: 'study.html',      field: 'imaging',     icon: '🩻', descriptor: 'How It Works, Uses & Risks',     blurb: 'X-ray, CT, MRI, ultrasound, PET, mammography and fluoroscopy: how each works and what it shows.' },
  procedures:     { name: 'Procedures',    singular: 'Procedure',        dir: 'procedures',   page: 'procedure.html',  field: 'procedures',  icon: '🔧', descriptor: 'Steps, Recovery & Risks',        blurb: 'Operations and procedures step by step, with the anatomy involved, recovery and risks.' },
  medications:    { name: 'Medications',   singular: 'Medication',       dir: 'medications',  page: 'medication.html', field: 'medications', icon: '💊', descriptor: 'Uses, Mechanism & Side Effects', blurb: 'How common medicines work in the body, what they are for and what to watch for. Education, not prescribing.' },
  'drug-classes': { name: 'Drug classes',  singular: 'Drug class',       dir: 'drug-classes', page: 'class.html',      field: 'drugClass',   icon: '🧬', descriptor: 'Mechanism, Uses & Examples',     blurb: 'Families of medicines that share a mechanism: what they target in the body, which conditions they treat and their members.' },
  biomarkers:     { name: 'Biomarkers',    singular: 'Biomarker',        dir: 'biomarkers',   page: 'biomarker.html',  field: 'biomarkers',  icon: '🧫', descriptor: 'What It Measures & Why It Changes', blurb: 'The substances tests measure: what each is, which organ makes or clears it, why a result may be higher or lower and what distorts it.' },
  targets:        { name: 'Drug targets',  singular: 'Biological target', dir: 'targets',     page: 'target.html',     field: 'targets',     icon: '🎯', descriptor: 'Receptors, Enzymes & Pathways',  blurb: 'The receptors, enzymes, channels and pathways medicines act on: what each does in the body, where it is found and which medicines change it.' },
  'first-aid':    { name: 'First aid',     singular: 'First aid topic',  dir: 'first-aid',    page: 'topic.html',      field: 'firstAid',    icon: '🚑', descriptor: 'What to Do Step by Step',        blurb: 'CPR, choking, bleeding, burns, fractures, fainting, seizures and more, aligned with resuscitation guidelines.' },
  health:         { name: 'Health',        singular: 'Health topic',     dir: 'health',       page: 'topic.html',      field: 'health',      icon: '🌿', descriptor: 'Effects on the Body & Guidance', blurb: 'Exercise, sleep, nutrition, weight, smoking, alcohol and hydration, explained through the organs they act on.' },
};
export const TYPE_ORDER = ['conditions', 'symptoms', 'physiology', 'tests', 'biomarkers', 'imaging', 'procedures', 'medications', 'drug-classes', 'targets', 'first-aid', 'health'];
export const TYPE_LABEL = { structure: 'Structure', organ: 'Anatomy', system: 'Body system', region: 'Region', term: 'Term', physiology: 'Physiology', symptoms: 'Symptom', conditions: 'Condition', tests: 'Test', biomarkers: 'Biomarker', imaging: 'Imaging', procedures: 'Procedure', medications: 'Medication', 'drug-classes': 'Drug class', targets: 'Drug target', 'first-aid': 'First aid', health: 'Health', product: 'Product' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export { esc };

// ----------------------------------------------------------------- URLs
/** Canonical paths (relative to the site root, no leading slash). Clean URLs end with a slash; query URLs name the template page. */
export const paths = {
  home: () => PRETTY ? '' : 'index.html',
  dir: (d) => PRETTY ? `${d}/` : `${d}/index.html`,
  entity: (dir, page, id) => PRETTY ? `${dir}/${encodeURIComponent(id)}/` : `${dir}/${page}?id=${encodeURIComponent(id)}`,
  explorer: (query = '', hash = '') => `explorer/${PRETTY ? '' : 'index.html'}${query ? '?' + query : ''}${hash ? '#' + hash : ''}`,
};
export const url = (path) => ROOT + path;
export const link = {
  home: () => url(paths.home()),
  page: (name) => url(paths.dir(name)),
  structure: (id) => url(paths.explorer('', `s=${encodeURIComponent(id)}`)),
  structures: (ids) => url(paths.explorer('', `s=${ids.map(encodeURIComponent).join(',')}`)),
  organ: (id) => url(paths.explorer('', `o=${encodeURIComponent(id)}`)),
  region: (id) => url(paths.explorer('', `r=${encodeURIComponent(id)}`)),
  system: (id) => url(paths.explorer('', `sys=${encodeURIComponent(id)}`)),
  slice: (axis) => url(paths.explorer('', `slice=${axis}`)),
  quiz: (sys) => url(paths.explorer(`study=quiz${sys ? '&sys=' + encodeURIComponent(sys) : ''}`)),
  locate: (sys) => url(paths.explorer(`study=locate${sys ? '&sys=' + encodeURIComponent(sys) : ''}`)),
  cards: (sys) => url(paths.explorer(`study=cards${sys ? '&sys=' + encodeURIComponent(sys) : ''}`)),
  explorer: (hash) => url(paths.explorer('', hash || '')),
  embed: (hash) => url(paths.explorer('embed=1', hash || '')),
  organPage: (id) => url(paths.entity('anatomy', 'organ.html', id)),
  systemPage: (id) => url(paths.entity('systems', 'system.html', id)),
  term: (id) => url(paths.dir('medical-terms')) + '#' + encodeURIComponent(id),
  search: (q) => url(paths.dir('search')) + (q ? '?q=' + encodeURIComponent(q) : ''),
  preview: (hash) => url(`site/previews/${previewName(hash)}.jpg`),
  compare: (id) => url(id ? paths.entity('compare', 'compare.html', id) : paths.dir('compare')),
  interactions: (ids) => url(paths.dir('interactions')) + (ids && ids.length ? '?drugs=' + ids.map(encodeURIComponent).join(',') : ''),
};
export function entityPath(type, id) { const t = TYPES[type]; return paths.entity(t.dir, t.page, id); }
export function entityLink(type, id) { return TYPES[type] ? url(entityPath(type, id)) : '#'; }
export function typeLink(type) { return TYPES[type] ? url(paths.dir(TYPES[type].dir)) : '#'; }
/** The entity id for a detail page: `?id=` on plain hosts, the last path segment under clean URLs (/conditions/gout/). */
export function pageId() {
  const q = param('id'); if (q) return q;
  const seg = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop() || '');
  return /\.html?$/i.test(seg) || !seg ? null : seg;
}
/** Absolute canonical URL for a site path: the public origin when configured, else the served origin. */
export function canonical(path = '') {
  const base = CONFIG.siteUrl ? CONFIG.siteUrl.replace(/\/$/, '') + '/' : ROOT;
  return base + String(path).replace(/^\//, '');
}
export function setCanonical(path) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = canonical(path);
}
/** Link for any search-index entry type. */
export function anyLink(type, id) {
  switch (type) {
    case 'structure': return link.structure(id);
    case 'organ': return link.organPage(id);
    case 'system': return link.systemPage(id);
    case 'region': return link.region(id);
    case 'term': return link.term(id);
    case 'product': return link.interactions([id]);
    default: return entityLink(type, id);
  }
}
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
export function dateText(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z'); if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// ---------------------------------------------------------------- shell
export function initTheme() {
  let t = null; try { t = localStorage.getItem('atlas-theme'); } catch {}
  if (t) document.documentElement.dataset.theme = t;
}
export function toggleTheme() {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; try { localStorage.setItem('atlas-theme', next); } catch {}
}
export const NAV_PRIMARY = [['anatomy', 'Anatomy', () => link.page('anatomy')], ['systems', 'Systems', () => link.page('systems')], ['conditions', 'Conditions', () => typeLink('conditions')], ['symptoms', 'Symptoms', () => typeLink('symptoms')], ['tests', 'Tests', () => typeLink('tests')], ['medications', 'Medications', () => typeLink('medications')], ['explorer', '3D explorer', () => link.explorer()], ['study', 'Study', () => link.page('study')]];
export const NAV_MORE = [['organs', 'Organs', () => link.page('organs')], ['physiology', 'Physiology', () => typeLink('physiology')], ['biomarkers', 'Biomarkers', () => typeLink('biomarkers')], ['imaging', 'Imaging', () => typeLink('imaging')], ['procedures', 'Procedures', () => typeLink('procedures')], ['drug-classes', 'Drug classes', () => typeLink('drug-classes')], ['targets', 'Drug targets', () => typeLink('targets')], ['interactions', 'Interaction checker', () => link.interactions()], ['compare', 'Comparisons', () => link.compare()], ['first-aid', 'First aid', () => typeLink('first-aid')], ['health', 'Health', () => typeLink('health')], ['medical-terms', 'Medical terms', () => link.page('medical-terms')], ['search', 'Search everything', () => link.page('search')], ['about', 'About', () => link.page('about')]];

export function renderHeader(active) {
  initTheme();
  if (!document.querySelector('.site-header')) {
    const html = `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap">
    <a class="brand" href="${link.home()}"><span class="brand-mark" aria-hidden="true"></span> ${esc(BRAND)}</a>
    <form class="hsearch" id="hsearch" action="${link.search()}" role="search" autocomplete="off">
      <input name="q" id="hsearch-q" type="search" placeholder="Search anatomy, conditions, tests, medicines…" aria-label="Search the site" autocomplete="off">
      <ul class="hsearch-results" id="hsearch-results" hidden></ul>
    </form>
    <button class="menu-toggle" id="menu-toggle" aria-label="Menu" aria-expanded="false" aria-controls="site-nav">☰</button>
    <nav class="nav" id="site-nav" aria-label="Site">
      ${NAV_PRIMARY.map(([key, n, h]) => `<a href="${h()}" class="${active === key ? 'is-active' : ''}"${active === key ? ' aria-current="page"' : ''}>${n}</a>`).join('')}
      <details><summary>More ▾</summary><div class="menu">
        ${NAV_MORE.map(([key, n, h]) => `<a href="${h()}"${active === key ? ' aria-current="page"' : ''}>${n}</a>`).join('')}
      </div></details>
      <button class="theme-btn" id="theme-btn" title="Toggle light / dark" aria-label="Toggle theme"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.4A6 6 0 0 1 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>
    </nav></div></header>`;
    document.body.insertAdjacentHTML('afterbegin', html);
  }
  const main = document.querySelector('main'); if (main && !main.id) main.id = 'main';
  document.getElementById('menu-toggle').addEventListener('click', (e) => { const open = document.getElementById('site-nav').classList.toggle('is-open'); e.currentTarget.setAttribute('aria-expanded', String(open)); });
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
  bindHeaderSearch();
  bindFacades();
  loadAnalytics();
}

/** Google Analytics 4, only when content/site.json names a measurement id. Loaded from our own code (no inline
 *  script), IP anonymised by GA4 default; tools/package-site.py widens the CSP for the tag's hosts in that case. */
function loadAnalytics() {
  const id = SITE.analytics && SITE.analytics.ga4; if (!id || !/^G-[A-Z0-9]+$/.test(id) || window.__ga4) return;
  window.__ga4 = id; window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date()); window.gtag('config', id, { send_page_view: true });
  if (!document.querySelector('script[src^="https://www.googletagmanager.com/gtag/js"]')) {
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id); document.head.appendChild(s);
  }
}

export function renderFooter() {
  if (document.querySelector('.site-footer')) return;
  const policy = [['about', 'About'], ['editorial-policy', 'Editorial policy'], ['medical-review-policy', 'Medical review'], ['references-policy', 'References'], ['corrections-policy', 'Corrections'], ['disclaimer', 'Disclaimer'], ['contact', 'Contact']];
  document.body.insertAdjacentHTML('beforeend', `<footer class="site-footer"><div class="wrap">
    <nav class="footer-nav" aria-label="About this site">${policy.map(([p, n]) => `<a href="${link.page(p)}">${n}</a>`).join('')}<a href="${link.page('roadmap')}">Roadmap</a><a href="${url('data/ATTRIBUTION.md')}">Attribution &amp; licences</a></nav>
    <p>${esc(BRAND)} is an educational resource. It does not give medical advice, diagnosis or treatment; in an emergency call your local emergency number. Content is written from the public guidance cited on each page and is <a href="${link.page('medical-review-policy')}">awaiting independent medical review</a>.</p>
    <p>3D anatomy: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noopener noreferrer">BodyParts3D</a>, © The Database Center for Life Science, licensed under CC BY 4.0. Structure names follow the Foundational Model of Anatomy. <span class="site-version" title="${esc(BUILD ? 'build ' + BUILD : 'development copy')}">v${esc(VERSION)}${BUILD ? ' · ' + esc(BUILD.slice(0, 7)) : ''}</span></p>
  </div></footer>`);
}

/** Breadcrumb trail: [{name, href}] ending with the current page (no href). Rendered as a list for accessibility; seo.js emits the schema. */
export function breadcrumbHtml(items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${items.map((c, i) => c.href && i < items.length - 1 ? `<li><a href="${esc(c.href)}">${esc(c.name)}</a></li>` : `<li aria-current="page">${esc(c.name)}</li>`).join('')}</ol></nav>`;
}

/** Click-to-load 3D view: a static preview image with a button that swaps in the explorer iframe (progressive enhancement:
 *  without scripts the button is a link to the explorer). Keeps the 13 MB model off article pages until it is wanted. */
export function facadeHtml(hash, name) {
  if (!hash) return '';
  return `<figure class="facade" data-embed="${esc(link.embed(hash))}">
    <img src="${esc(link.preview(hash))}" width="1200" height="630" alt="3D model of the ${esc(name)} in the ${esc(BRAND)} anatomy atlas" loading="lazy" decoding="async">
    <figcaption><span>Interactive 3D model: ${esc(name)}. Orbit, zoom and click the structures.</span><a class="btn btn-primary facade-load" href="${esc(link.explorer(hash))}">Load the 3D model</a></figcaption>
  </figure>`;
}
function bindFacades() {
  if (document.body.dataset.facadesBound) return; document.body.dataset.facadesBound = '1';
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.facade-load'); if (!a) return;
    const fig = a.closest('.facade'); const src = fig && fig.dataset.embed; if (!src) return;
    e.preventDefault();
    const div = document.createElement('div'); div.className = 'embed';
    const f = document.createElement('iframe'); f.src = src; f.title = a.closest('figure').querySelector('img')?.alt || '3D view'; f.setAttribute('allow', 'fullscreen'); f.loading = 'eager';
    div.appendChild(f); fig.replaceWith(div);
  });
}

// ------------------------------------------------------------------ data
/** Cache-busting query for data files: the packaged site stamps the same version into every script URL. */
export const stamp = () => VERSION ? `?v=${encodeURIComponent(VERSION)}` : '';
const _cache = new Map();
export function getJSON(rel) {
  if (!_cache.has(rel)) _cache.set(rel, fetch(ROOT + rel + stamp()).then(r => { if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`); return r.json(); }));
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
/** Interaction records, class membership, products and the checker's name index (data/content/interactions.json). */
export const loadInteractions = () => getJSON('data/content/interactions.json');
/** Structured comparisons (data/content/comparisons.json). */
export const loadComparisons = () => getJSON('data/content/comparisons.json');
/** Severity states of the interaction records (spec: Clinical Content Depth §43) with their public labels. */
export const SEVERITY = {
  CONTRAINDICATED: { label: 'Contraindicated in official information', cls: 'sev-1', order: 1 },
  AVOID_COMBINATION: { label: 'Official guidance: avoid the combination', cls: 'sev-2', order: 2 },
  SPECIALIST_OR_CLOSE_MONITORING: { label: 'Specialist supervision or close monitoring', cls: 'sev-3', order: 3 },
  MONITOR_OR_ADJUST: { label: 'Monitoring or dose adjustment advised', cls: 'sev-4', order: 4 },
  INTERACTION_DOCUMENTED: { label: 'Interaction documented', cls: 'sev-5', order: 5 },
  NO_SEVERITY_ASSIGNED: { label: 'No severity assigned by the sources', cls: 'sev-6', order: 6 },
};

// ---------------------------------------------------------------- search
let _entries = null;
/** Build ranked-search entries from the flat search index (shared by the header box and the search page). */
export async function searchEntries() {
  if (_entries) return _entries;
  const idx = await loadSearchIndex();
  const rank = { system: 3, organ: 2.9, conditions: 2.7, symptoms: 2.7, 'first-aid': 2.6, region: 2.4, tests: 2.5, imaging: 2.5, procedures: 2.5, medications: 2.5, 'drug-classes': 2.4, biomarkers: 2.4, targets: 2.3, product: 2.3, physiology: 2.4, health: 2.4, term: 2.2, structure: 2 };
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
