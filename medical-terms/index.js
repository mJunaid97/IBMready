// medical-terms/index.js — the medical terminology dictionary (/medical-terms/): every term with its definition, plain
// meaning, example, related and opposite terms, atlas link and the pages that use it. Anchors (#term-id) address a term.
import { renderHeader, renderFooter, loadData, loadClinical, termLink, entityLink, TYPES, TYPE_ORDER, esc, link, paths, PRERENDERED, SITE, breadcrumbHtml, canonical, emptyHtml } from '../site/site.js';
import { applyMeta, metaDescription, webPageNode } from '../site/seo.js';
renderHeader('medical-terms'); renderFooter();
const [data, clinical] = await Promise.all([loadData(), loadClinical().catch(() => null)]); const { terms } = data;
const byId = new Map(terms.terms.map(t => [t.id, t]));
const catName = (id) => terms.categories.find(c => c.id === id)?.name || '';
const termHtml = (t) => {
  const see = termLink(t, data);
  const rel = [...(t.opposite ? [['Opposite', t.opposite]] : []), ...(t.related || []).map(r => ['Related', r])].filter(([, id]) => byId.has(id));
  const used = clinical && clinical.terms && clinical.terms[t.id] ? TYPE_ORDER.filter(ty => clinical.terms[t.id][ty]).map(ty => clinical.terms[t.id][ty].slice(0, 6).map(id => `<a class="chip" href="${entityLink(ty, id)}">${esc(clinical.names[ty][id] || id)}</a>`).join('')).join('') : '';
  return `<article class="term" id="${esc(t.id)}"><div class="eyebrow">${esc(catName(t.category))}</div><h3>${esc(t.term)}${t.say ? ` <span class="muted small" style="font-weight:400">· say “${esc(t.say)}”</span>` : ''}</h3><p>${esc(t.definition)}</p>${t.plain ? `<p class="plain">${esc(t.plain)}</p>` : ''}<dl>${t.example ? `<dt>Example</dt><dd>${esc(t.example)}</dd>` : ''}${rel.map(([k, id]) => `<dt>${k}</dt><dd><a href="#${esc(id)}">${esc(byId.get(id).term)}</a></dd>`).join('')}${see ? `<dt>Atlas</dt><dd><a href="${see}">See it in 3D ↗</a></dd>` : ''}${used ? `<dt>Used in</dt><dd><div class="chips">${used}</div></dd>` : ''}</dl></article>`;
};
if (!PRERENDERED) {
  const path = paths.dir('medical-terms'); const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Medical terms' }];
  const title = `Medical Terminology: ${terms.terms.length} Anatomical & Clinical Terms | ${SITE.name}`;
  const description = document.querySelector('meta[name="description"]').content;
  applyMeta({ title, description, path, breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'CollectionPage', updated: terms.updated }),
    { '@type': 'DefinedTermSet', '@id': canonical(path) + '#terms', name: `${SITE.name} medical terminology`, hasDefinedTerm: terms.terms.map(t => ({ '@type': 'DefinedTerm', name: t.term, description: t.definition, url: canonical(path) + '#' + t.id })) }] });
  document.getElementById('main').innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="section-hero"><div class="eyebrow">Learn · ${terms.terms.length} terms in ${terms.categories.length} categories</div><h1>Medical terminology</h1>
    <p class="lead">The vocabulary that anatomy, physiology and clinical medicine are written in: directions, planes, movements, regions, structural words, word parts, the handful of disease processes behind most diagnoses, and the clinical terms that describe how illness behaves. Most terms link straight into the 3D atlas so you can see what the word points at, and to the pages that use them.</p></div>
    <div class="search-row"><label class="sr-only" for="q">Search terms</label><input id="q" type="search" placeholder="Search terms, e.g. proximal, -itis, ischaemia, prognosis"></div>
    <div class="filters" id="cats" role="group" aria-label="Browse by category"><button class="chip is-active" data-cat="all" type="button" aria-pressed="true">All ${terms.terms.length}</button>${terms.categories.map(c => `<button class="chip" data-cat="${esc(c.id)}" type="button" aria-pressed="false">${esc(c.name)} ${terms.terms.filter(t => t.category === c.id).length}</button>`).join('')}</div>
    <div class="hub-count"><p id="hub-count" role="status" aria-live="polite">Showing all ${terms.terms.length} terms</p><button type="button" class="btn btn-sm btn-text" id="clear-filters" hidden>Clear filters</button></div>
    <div id="no-terms" hidden></div>
    ${terms.categories.map(c => `<h2 id="cat-${esc(c.id)}">${esc(c.name)}</h2><p class="muted">${esc(c.summary || '')}</p><div class="term-group" data-cat="${esc(c.id)}">${terms.terms.filter(t => t.category === c.id).map(termHtml).join('')}</div>`).join('')}
    <h2>Keep learning</h2>
    <div class="chips"><a class="chip" href="${link.page('study')}#terms">Terminology quiz</a><a class="chip" href="${typeLinkSafe('physiology')}">Physiology</a><a class="chip" href="${link.page('anatomy')}">Anatomy</a></div>`;
}
function typeLinkSafe(t) { return TYPES[t] ? link.page(TYPES[t].dir) : '#'; }
// ---- interactivity: text search and category filter over the rendered terms; state mirrored into the URL (?cat=&q=)
let cat = 'all'; const q = document.getElementById('q'); const cats = document.getElementById('cats'); const countEl = document.getElementById('hub-count'); const clear = document.getElementById('clear-filters'); const none = document.getElementById('no-terms');
const setCat = (id) => { cat = id; for (const x of cats.children) { const on = x.dataset.cat === id; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); } };
function render() {
  const s = q.value.trim().toLowerCase(); let shown = 0;
  for (const g of document.querySelectorAll('.term-group')) {
    let any = false;
    for (const art of g.children) { const t = byId.get(art.id); const show = t && (cat === 'all' || t.category === cat) && (!s || [t.term, t.definition, t.plain, t.example].join(' ').toLowerCase().includes(s)); art.hidden = !show; any = any || show; if (show) shown++; }
    g.hidden = !any; const h = g.previousElementSibling; const p = h && h.previousElementSibling; if (h) h.hidden = !any; if (p && p.tagName === 'H2') p.hidden = !any;
  }
  const all = cat === 'all' && !s;
  if (countEl) countEl.textContent = all ? `Showing all ${terms.terms.length} terms` : shown ? `Showing ${shown} of ${terms.terms.length} terms` : 'No terms match the current filters';
  if (clear) clear.hidden = all;
  if (none) { none.hidden = shown > 0; none.innerHTML = shown ? '' : emptyHtml('No terms match', 'Try a shorter word, a word part (-itis, hyper-) or another category.', '<button type="button" class="btn btn-sm" data-clear>Clear filters</button>'); }
  const u = new URL(location.href); cat !== 'all' ? u.searchParams.set('cat', cat) : u.searchParams.delete('cat'); s ? u.searchParams.set('q', q.value.trim()) : u.searchParams.delete('q'); if (u.href !== location.href) history.replaceState(null, '', u);
}
const reset = () => { setCat('all'); q.value = ''; render(); q.focus(); };
cats.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; setCat(b.dataset.cat); render(); });
q.addEventListener('input', render);
clear?.addEventListener('click', reset); none?.addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) reset(); });
const sp = new URLSearchParams(location.search); let restored = false;
if (sp.get('cat') && terms.categories.some(c => c.id === sp.get('cat'))) { setCat(sp.get('cat')); restored = true; }
if (sp.get('q')) { q.value = sp.get('q'); restored = true; }
if (restored) render();
if (location.hash) setTimeout(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'center' }), 50);
