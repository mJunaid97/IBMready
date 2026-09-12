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
import { normalize, search as rankSearch } from '../explorer/search.js?v=1.4.0';
import { CONFIG } from './config.js?v=1.4.0';
import { VERSION, BUILD } from './version.js?v=1.4.0';
import { SITE } from './site-meta.js?v=1.4.0';
import { previewName } from './preview-name.js?v=1.4.0';
export { CONFIG, VERSION, BUILD, SITE };

export const ROOT = new URL('../', import.meta.url).href;   // absolute site root, works from any depth
export const PRETTY = !!CONFIG.prettyUrls;
export const BRAND = SITE.name;
/** True when the page arrived as prerendered HTML: bind interactivity, do not re-render content. */
export const PRERENDERED = typeof document !== 'undefined' && document.body && document.body.hasAttribute('data-prerendered');

/** Entity types of the knowledge graph (mirrors tools/build-content.py TYPES). `field` is the link-field name other
 *  entities use; `icon` names an entry of ICONS; `descriptor` completes the SEO title "[Name]: [Descriptor] | Anatomy Nexus". */
export const TYPES = {
  physiology:     { name: 'Physiology',    singular: 'Physiology topic', dir: 'physiology',   page: 'topic.html',      field: 'physiology',  icon: 'physiology',  descriptor: 'How It Works',                   blurb: 'What the body does: cardiac, respiratory, nervous, digestive, renal and endocrine function explained through the anatomy.' },
  symptoms:       { name: 'Symptoms',      singular: 'Symptom',          dir: 'symptoms',     page: 'symptom.html',    field: 'symptoms',    icon: 'symptoms',    descriptor: 'Causes & When to Seek Help',      blurb: 'Start from what a person feels: the anatomy involved, common and less common causes, and when to seek urgent care.' },
  conditions:     { name: 'Conditions',    singular: 'Condition',        dir: 'conditions',   page: 'condition.html',  field: 'conditions',  icon: 'conditions',  descriptor: 'Causes, Symptoms & Treatment',   blurb: 'Diseases and conditions: definition, affected anatomy, causes, symptoms, diagnosis, treatment and prevention.' },
  tests:          { name: 'Medical tests', singular: 'Medical test',     dir: 'tests',        page: 'test.html',       field: 'tests',       icon: 'tests',       descriptor: 'Purpose, Procedure & Results',   blurb: 'Blood, urine, heart and lung tests: what they measure, how they are done and how results are read.' },
  imaging:        { name: 'Imaging',       singular: 'Imaging study',    dir: 'imaging',      page: 'study.html',      field: 'imaging',     icon: 'imaging',     descriptor: 'How It Works, Uses & Risks',     blurb: 'X-ray, CT, MRI, ultrasound, PET, mammography and fluoroscopy: how each works and what it shows.' },
  procedures:     { name: 'Procedures',    singular: 'Procedure',        dir: 'procedures',   page: 'procedure.html',  field: 'procedures',  icon: 'procedures',  descriptor: 'Steps, Recovery & Risks',        blurb: 'Operations and procedures step by step, with the anatomy involved, recovery and risks.' },
  medications:    { name: 'Medications',   singular: 'Medication',       dir: 'medications',  page: 'medication.html', field: 'medications', icon: 'medications', descriptor: 'Uses, Mechanism & Side Effects', blurb: 'How common medicines work in the body, what they are for and what to watch for. Education, not prescribing.' },
  'drug-classes': { name: 'Drug classes',  singular: 'Drug class',       dir: 'drug-classes', page: 'class.html',      field: 'drugClass',   icon: 'drug-classes', descriptor: 'Mechanism, Uses & Examples',    blurb: 'Families of medicines that share a mechanism: what they target in the body, which conditions they treat and their members.' },
  biomarkers:     { name: 'Biomarkers',    singular: 'Biomarker',        dir: 'biomarkers',   page: 'biomarker.html',  field: 'biomarkers',  icon: 'biomarkers',  descriptor: 'What It Measures & Why It Changes', blurb: 'The substances tests measure: what each is, which organ makes or clears it, why a result may be higher or lower and what distorts it.' },
  targets:        { name: 'Drug targets',  singular: 'Biological target', dir: 'targets',     page: 'target.html',     field: 'targets',     icon: 'targets',     descriptor: 'Receptors, Enzymes & Pathways',  blurb: 'The receptors, enzymes, channels and pathways medicines act on: what each does in the body, where it is found and which medicines change it.' },
  'first-aid':    { name: 'First aid',     singular: 'First aid topic',  dir: 'first-aid',    page: 'topic.html',      field: 'firstAid',    icon: 'first-aid',   descriptor: 'What to Do Step by Step',        blurb: 'CPR, choking, bleeding, burns, fractures, fainting, seizures and more, aligned with resuscitation guidelines.' },
  health:         { name: 'Health',        singular: 'Health topic',     dir: 'health',       page: 'topic.html',      field: 'health',      icon: 'health',      descriptor: 'Effects on the Body & Guidance', blurb: 'Exercise, sleep, nutrition, weight, smoking, alcohol and hydration, explained through the organs they act on.' },
};
export const TYPE_ORDER = ['conditions', 'symptoms', 'physiology', 'tests', 'biomarkers', 'imaging', 'procedures', 'medications', 'drug-classes', 'targets', 'first-aid', 'health'];
export const TYPE_LABEL = { structure: 'Structure', organ: 'Anatomy', system: 'Body system', region: 'Region', term: 'Term', physiology: 'Physiology', symptoms: 'Symptom', conditions: 'Condition', tests: 'Test', biomarkers: 'Biomarker', imaging: 'Imaging', procedures: 'Procedure', medications: 'Medication', 'drug-classes': 'Drug class', targets: 'Drug target', 'first-aid': 'First aid', health: 'Health', product: 'Product', substance: 'Named substance' };
/** Search-result families, used to tint the type tag: what it is in the body, what medicine does with it, how to learn it. */
export const TYPE_KIND = { structure: 'anatomy', organ: 'anatomy', system: 'anatomy', region: 'anatomy', conditions: 'clinical', symptoms: 'clinical', tests: 'clinical', biomarkers: 'clinical', imaging: 'clinical', procedures: 'clinical', medications: 'clinical', 'drug-classes': 'clinical', targets: 'clinical', product: 'clinical', substance: 'clinical', term: 'learn', physiology: 'learn', 'first-aid': 'learn', health: 'learn' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export { esc };

// ---------------------------------------------------------------- icons
/** One icon system for the whole site: 24-unit grid, 1.75 stroke, round joins, currentColor (the same style as the
 *  explorer's own controls). Decorative by default; pass a label to make one meaningful. */
const ICON_PATHS = {
  anatomy: '<circle cx="12" cy="5" r="2.5"/><path d="M6.5 10.5 12 9l5.5 1.5M12 9v6l-3 6M12 15l3 6"/>',
  systems: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  explorer: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
  physiology: '<path d="M3 12h4l2.5-6 3 12 2.5-6h6"/>',
  symptoms: '<path d="M10 4a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0V4Z"/><path d="M12 8v6"/>',
  conditions: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  tests: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>',
  biomarkers: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  imaging: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M12 7v10M8.5 10h7M9.5 14h5"/>',
  procedures: '<path d="M4 20 14 10M14 10l3.5-6 2.5 2.5-6 3.5"/><path d="M8 16l-2 4-2-2 4-2Z"/>',
  medications: '<rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-45 12 12.5)"/><path d="m9 9.5 5 5"/>',
  'drug-classes': '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  targets: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  'first-aid': '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M12 9v7M8.5 12.5h7M9 5V3.5h6V5"/>',
  health: '<path d="M20 4c-8 0-15 4-15 12 0 1.5.3 2.7.8 3.7C8.5 15 12 11 16 9c-3 2.5-5.8 6-7.6 10.6C9.3 20 10.6 20.5 12 20.5 20 20.5 20 10 20 4Z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
  compare: '<rect x="3.5" y="4" width="7" height="16" rx="1.5"/><rect x="13.5" y="4" width="7" height="16" rx="1.5"/>',
  interactions: '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
  tools: '<path d="M14.7 5.3a3.6 3.6 0 0 0-4.6 4.7L4 16.1V20h3.9l6.1-6.1a3.6 3.6 0 0 0 4.7-4.6l-2.4 2.4-2.1-2.1 2.5-2.3Z"/>',
  terms: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z"/><path d="M4 18a2.5 2.5 0 0 1 2.5-2.5H20M8 7h8M8 10.5h5"/>',
  study: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M21.5 9v5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  moon: '<path d="M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.4A6 6 0 0 1 12 3Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};
export function iconSvg(name, label) {
  const d = ICON_PATHS[name] || ICON_PATHS.info;
  return `<svg class="ico ico-${esc(name)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"${label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}>${d}</svg>`;
}

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
  tools: () => url(paths.dir('tools')),
  /** The Drug Interaction Checker, optionally with medicines pre-selected: ?drug=<id> for one, ?drugs=<id>,<id> for several. */
  checker: (ids) => url(paths.dir('tools/drug-interaction-checker')) + (ids && ids.length ? (ids.length === 1 ? '?drug=' : '?drugs=') + ids.map(encodeURIComponent).join(',') : ''),
  methodology: () => url(paths.dir('editorial/drug-interaction-methodology')),
  logo: (variant = 'anatomy-nexus') => url(`site/logo/${variant}.svg`),
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
    case 'product': return link.checker([id]);
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
/** The logo: the primary horizontal lock-up on light surfaces, the reversed (white) version on dark ones, and the AN
 *  monogram alone where the full logo does not fit (narrow screens). The stylesheet shows one of the four. */
export function logoHtml(height = 30) {
  const w = Math.round(height * 900 / 190), mw = Math.round(height * 224 / 200);
  return `<img class="logo logo-light" src="${link.logo('anatomy-nexus')}" alt="${esc(BRAND)}" width="${w}" height="${height}" decoding="async">` +
    `<img class="logo logo-dark" src="${link.logo('anatomy-nexus-white')}" alt="" width="${w}" height="${height}" decoding="async" aria-hidden="true">` +
    `<img class="logo mark-light" src="${link.logo('mark')}" alt="" width="${mw}" height="${height}" decoding="async" aria-hidden="true">` +
    `<img class="logo mark-dark" src="${link.logo('mark-white')}" alt="" width="${mw}" height="${height}" decoding="async" aria-hidden="true">`;
}
export const NAV_PRIMARY = [['anatomy', 'Anatomy', () => link.page('anatomy')], ['conditions', 'Conditions', () => typeLink('conditions')], ['symptoms', 'Symptoms', () => typeLink('symptoms')], ['tests', 'Tests', () => typeLink('tests')], ['medications', 'Medications', () => typeLink('medications')], ['explorer', '3D explorer', () => link.explorer()], ['study', 'Study', () => link.page('study')]];
/** The "More" menu, grouped the way the platform is organised: the body, the clinical layer, medicines, learning. */
export const NAV_GROUPS = [
  ['Anatomy', [['anatomy', 'Anatomy A–Z', () => link.page('anatomy')], ['organs', 'Organs by system', () => link.page('organs')], ['systems', 'Body systems', () => link.page('systems')], ['explorer', '3D explorer', () => link.explorer()], ['physiology', 'Physiology', () => typeLink('physiology')]]],
  ['Clinical', [['symptoms', 'Symptoms', () => typeLink('symptoms')], ['conditions', 'Conditions', () => typeLink('conditions')], ['tests', 'Medical tests', () => typeLink('tests')], ['biomarkers', 'Biomarkers', () => typeLink('biomarkers')], ['imaging', 'Imaging', () => typeLink('imaging')], ['procedures', 'Procedures', () => typeLink('procedures')]]],
  ['Medicines', [['medications', 'Medications', () => typeLink('medications')], ['drug-classes', 'Drug classes', () => typeLink('drug-classes')], ['targets', 'Drug targets', () => typeLink('targets')], ['checker', 'Drug Interaction Checker', () => link.checker()], ['tools', 'Clinical tools', () => link.tools()], ['compare', 'Comparisons', () => link.compare()]]],
  ['Learn', [['first-aid', 'First aid', () => typeLink('first-aid')], ['health', 'Health', () => typeLink('health')], ['medical-terms', 'Medical terms', () => link.page('medical-terms')], ['study', 'Study tools', () => link.page('study')], ['search', 'Search everything', () => link.page('search')], ['about', 'About Anatomy Nexus', () => link.page('about')]]],
];
export const NAV_MORE = NAV_GROUPS.flatMap(([, items]) => items);

export function renderHeader(active) {
  initTheme();
  if (!document.querySelector('.site-header')) {
    const html = `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap">
    <a class="brand" href="${link.home()}" aria-label="${esc(BRAND)} home">${logoHtml(30)}</a>
    <form class="hsearch" id="hsearch" action="${link.search()}" role="search" autocomplete="off">
      <span class="hsearch-icon">${iconSvg('search')}</span>
      <input name="q" id="hsearch-q" type="search" placeholder="Search anatomy, symptoms, conditions, tests, medications…" aria-label="Search Anatomy Nexus" autocomplete="off">
      <ul class="hsearch-results" id="hsearch-results" hidden></ul>
    </form>
    <button class="menu-toggle" id="menu-toggle" aria-label="Menu" aria-expanded="false" aria-controls="site-nav">${iconSvg('menu')}</button>
    <nav class="nav" id="site-nav" aria-label="Site">
      ${NAV_PRIMARY.map(([key, n, h]) => `<a href="${h()}" class="${active === key ? 'is-active' : ''}"${active === key ? ' aria-current="page"' : ''}>${n}</a>`).join('')}
      <details class="nav-more"><summary>More</summary><div class="menu">
        ${NAV_GROUPS.map(([g, items]) => `<div class="menu-group"><div class="eyebrow">${esc(g)}</div>${items.map(([key, n, h]) => `<a href="${h()}"${active === key ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</div>`).join('')}
      </div></details>
      <button class="theme-btn" id="theme-btn" title="Toggle light / dark" aria-label="Toggle light or dark theme">${iconSvg('moon')}</button>
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
  // The page URL is reported without its query string: a search term (/search/?q=) or a medicine list on the interaction
  // checker (?drugs=) can be health-related data and is never sent to a third party.
  window.gtag('js', new Date()); window.gtag('config', id, { send_page_view: true, page_location: location.origin + location.pathname });
  if (!document.querySelector('script[src^="https://www.googletagmanager.com/gtag/js"]')) {
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id); document.head.appendChild(s);
  }
}

export function renderFooter() {
  if (document.querySelector('.site-footer')) return;
  const col = (title, items) => `<nav class="footer-col" aria-label="${esc(title)}"><h2>${esc(title)}</h2>${items.map(([n, h]) => `<a href="${h}">${n}</a>`).join('')}</nav>`;
  const year = (SITE.updated || '').slice(0, 4) || String(new Date().getUTCFullYear());
  document.body.insertAdjacentHTML('beforeend', `<footer class="site-footer"><div class="wrap">
    <div class="footer-top">
      <div class="footer-brand">
        <a href="${link.home()}" aria-label="${esc(BRAND)} home">${logoHtml(32)}</a>
        <p>${esc(SITE.description || '')}</p>
        <p>${esc(BRAND)} is an educational resource. It does not give medical advice, diagnosis or treatment; in an emergency call your local emergency number. Content is written from the public guidance cited on each page and is <a href="${link.page('medical-review-policy')}">awaiting independent medical review</a>.</p>
      </div>
      ${col('Anatomy', [['Anatomy A–Z', link.page('anatomy')], ['Body systems', link.page('systems')], ['Organs by system', link.page('organs')], ['3D explorer', link.explorer()], ['Physiology', typeLink('physiology')], ['Medical terms', link.page('medical-terms')]])}
      ${col('Clinical', [['Symptoms', typeLink('symptoms')], ['Conditions', typeLink('conditions')], ['Medical tests', typeLink('tests')], ['Biomarkers', typeLink('biomarkers')], ['Imaging', typeLink('imaging')], ['Procedures', typeLink('procedures')], ['First aid', typeLink('first-aid')], ['Health', typeLink('health')]])}
      ${col('Medicines', [['Medications', typeLink('medications')], ['Drug classes', typeLink('drug-classes')], ['Drug targets', typeLink('targets')], ['Drug Interaction Checker', link.checker()], ['Clinical tools', link.tools()], ['Comparisons', link.compare()], ['Study tools', link.page('study')]])}
      ${col('About', [['About', link.page('about')], ['Editorial policy', link.page('editorial-policy')], ['Medical review policy', link.page('medical-review-policy')], ['References policy', link.page('references-policy')], ['Corrections policy', link.page('corrections-policy')], ['Disclaimer', link.page('disclaimer')], ['Contact', link.page('contact')], ['Roadmap', link.page('roadmap')]])}
    </div>
    <div class="footer-bottom">
      <p>© ${esc(year)} ${esc(BRAND)} · <span class="site-version" title="${esc(BUILD ? 'build ' + BUILD : 'development copy')}">v${esc(VERSION)}${BUILD ? ' · ' + esc(BUILD.slice(0, 7)) : ''}</span></p>
      <p>3D anatomy: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noopener noreferrer">BodyParts3D</a>, © The Database Center for Life Science, CC BY 4.0. Structure names follow the Foundational Model of Anatomy. <a href="${url('data/ATTRIBUTION.md')}">Attribution &amp; licences</a></p>
    </div>
  </div></footer>`);
}

/** Breadcrumb trail: [{name, href}] ending with the current page (no href). Rendered as a list for accessibility; seo.js emits the schema. */
export function breadcrumbHtml(items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${items.map((c, i) => c.href && i < items.length - 1 ? `<li><a href="${esc(c.href)}">${esc(c.name)}</a></li>` : `<li aria-current="page">${esc(c.name)}</li>`).join('')}</ol></nav>`;
}
/** Branded empty state: an icon, a short statement and, optionally, a way forward. */
export function emptyHtml(title, text, actionsHtml = '', icon = 'search') {
  return `<div class="empty" role="status">${iconSvg(icon)}<b>${esc(title)}</b>${text ? `<p>${text}</p>` : ''}${actionsHtml ? `<div class="actions">${actionsHtml}</div>` : ''}</div>`;
}

/** Click-to-load 3D view: a static preview image with a button that swaps in the explorer iframe (progressive enhancement:
 *  without scripts the button is a link to the explorer). Keeps the 13 MB model off article pages until it is wanted. */
export function facadeHtml(hash, name) {
  if (!hash) return '';
  return `<figure class="facade" data-embed="${esc(link.embed(hash))}">
    <img src="${esc(link.preview(hash))}" width="1200" height="630" alt="3D model of the ${esc(name)} in the ${esc(BRAND)} anatomy atlas" loading="lazy" decoding="async">
    <figcaption><span>Interactive 3D model: ${esc(name)}. Orbit, zoom and click the structures.</span><a class="btn btn-primary facade-load" href="${esc(link.explorer(hash))}">${iconSvg('explorer')}Load the 3D model</a></figcaption>
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
/** The type tag of a search result, tinted by family (anatomy · clinical · learn). */
export function typeTag(type) { return `<span class="r-type" data-kind="${esc(TYPE_KIND[type] || '')}">${esc(TYPE_LABEL[type] || type)}</span>`; }

function bindHeaderSearch() {
  const input = document.getElementById('hsearch-q'), list = document.getElementById('hsearch-results'); if (!input) return;
  let results = [], active = -1, entries = null, t = null;
  const close = () => { list.hidden = true; active = -1; };
  const render = () => {
    list.innerHTML = results.length ? results.map((r, i) => `<li role="option" aria-selected="${i === active}"><a href="${anyLink(r.type, r.id)}"><span class="r-name">${esc(r.name)}</span><span class="r-sub">${esc(r.sub)}</span>${typeTag(r.type)}</a></li>`).join('') : '<li class="r-empty">No matches. Try a shorter word, an alias or a Latin name.</li>';
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
