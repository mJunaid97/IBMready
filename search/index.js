// search/index.js — page script for search/index.html (kept external so the site runs under a strict CSP).
// Filters: a type chip row and a body-system select, both mirrored into the URL (?q=&type=&system=) so a search can be
// linked and restored; a live result count announces what changed for screen readers.
import { renderHeader, renderFooter, searchEntries, runSearch, anyLink, TYPE_LABEL, TYPE_KIND, esc, param, emptyHtml, typeTag } from '../site/site.js';
import { applyStaticMeta } from '../site/seo.js';
renderHeader('search'); renderFooter(); applyStaticMeta();
const q = document.getElementById('q'), out = document.getElementById('results'), filters = document.getElementById('filters'), facets = document.getElementById('facets'), countEl = document.getElementById('result-count');
// the index (about 400 KB) loads asynchronously: say so, keep whatever the reader types meanwhile, and never show
// "no matches" before the search has actually run
q.value = q.value || param('q') || '';
out.innerHTML = '<p class="muted" role="status" aria-busy="true">Loading the search index…</p>';
let entries = [];
try { entries = await searchEntries(); }
catch (e) { console.error(e); out.innerHTML = emptyHtml('Search is unavailable', 'The search index could not be loaded. <a href="">Try again</a> or browse from the <a href="../anatomy/">anatomy</a> and <a href="../conditions/">clinical</a> hubs.', '', 'search'); throw e; }
document.getElementById('count').textContent = entries.length.toLocaleString('en-US');
const types = ['all', 'structure', 'organ', 'system', 'term', 'conditions', 'symptoms', 'physiology', 'tests', 'biomarkers', 'imaging', 'procedures', 'medications', 'drug-classes', 'targets', 'product', 'first-aid', 'health'];
const CHIP_LABEL = { structure: '3D structures', organ: 'Anatomy articles' };
let type = types.includes(param('type')) ? param('type') : 'all';
let system = '';
// body systems come from the index itself (type "system" entries), so the page needs no second data file
const systems = entries.filter(e => e.type === 'system').map(e => ({ id: e.id, name: e.name }));
const usable = new Set(entries.flatMap(e => e.systems)); const sysOptions = systems.filter(s => usable.has(s.id));
filters.innerHTML = types.map(t => `<button type="button" class="chip${t === type ? ' is-active' : ''}" data-t="${t}" data-kind="${esc(TYPE_KIND[t] || '')}" aria-pressed="${t === type}">${t === 'all' ? 'All' : esc(CHIP_LABEL[t] || TYPE_LABEL[t] || t)}</button>`).join('');
if (facets && sysOptions.length) {
  facets.innerHTML = `<label class="facet">Body system <select id="system-facet"><option value="">Any</option>${sysOptions.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><button type="button" class="btn btn-sm btn-text" id="clear-filters" hidden>Clear filters</button>`;
  const sel = document.getElementById('system-facet'); const want = param('system'); if (want && sysOptions.some(s => s.id === want)) { sel.value = want; system = want; }
  sel.addEventListener('change', () => { system = sel.value; render(); });
  document.getElementById('clear-filters').addEventListener('click', () => { setType('all'); sel.value = ''; system = ''; render(); q.focus(); });
}
const setType = (t) => { type = t; for (const x of filters.children) { const on = x.dataset.t === t; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); } };
filters.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; setType(b.dataset.t); render(); });
const scopeText = () => [type !== 'all' ? (CHIP_LABEL[type] || TYPE_LABEL[type] || type) : '', system ? systems.find(s => s.id === system)?.name : ''].filter(Boolean).join(' · ');
function syncUrl(s) {
  const u = new URL(location.href); const sp = u.searchParams;
  s ? sp.set('q', s) : sp.delete('q'); type !== 'all' ? sp.set('type', type) : sp.delete('type'); system ? sp.set('system', system) : sp.delete('system');
  if (u.href !== location.href) history.replaceState(null, '', u);
}
function render() {
  const s = q.value.trim();
  const clear = document.getElementById('clear-filters'); if (clear) clear.hidden = type === 'all' && !system;
  let pool = type === 'all' ? entries : entries.filter(e => e.type === type);
  if (system) pool = pool.filter(e => e.systems.includes(system) || (e.type === 'system' && e.id === system));
  syncUrl(s);
  if (!s) { if (countEl) countEl.textContent = ''; out.innerHTML = `<p class="muted">Type to search${scopeText() ? ` within ${esc(scopeText())}` : ''}. Results link straight to the page or into the 3D atlas.</p>`; return; }
  const res = runSearch(pool, s, 60);
  if (countEl) countEl.textContent = res.length ? `${res.length}${res.length === 60 ? '+' : ''} result${res.length === 1 ? '' : 's'} for “${s}”${scopeText() ? ` in ${scopeText()}` : ''}` : `No results for “${s}”${scopeText() ? ` in ${scopeText()}` : ''}`;
  if (!res.length) { out.innerHTML = emptyHtml('No matches', `Try a shorter word, an alias (heart attack, blood thinner) or a Latin name${type !== 'all' || system ? ', or widen the filters' : ''}.`, type !== 'all' || system ? '<button type="button" class="btn btn-sm" data-clear>Search everything</button>' : ''); return; }
  const groups = new Map(); for (const r of res) { if (!groups.has(r.type)) groups.set(r.type, []); groups.get(r.type).push(r); }
  out.innerHTML = [...groups].map(([t, list]) => `<div class="result-group"><h2>${typeTag(t)} <span class="badge">${list.length}</span></h2><ul class="list">${list.map(r => `<li><a href="${anyLink(r.type, r.id)}">${esc(r.name)}</a> <span class="muted small">· ${esc(r.sub)}</span></li>`).join('')}</ul></div>`).join('');
}
out.addEventListener('click', (e) => { if (!e.target.closest('[data-clear]')) return; setType('all'); system = ''; const sel = document.getElementById('system-facet'); if (sel) sel.value = ''; render(); });
if (!q.value) q.value = param('q') || ''; q.addEventListener('input', render); render();
