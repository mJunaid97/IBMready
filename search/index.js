// search/index.js — page script for search/index.html (kept external so the site runs under a strict CSP).
import { renderHeader, renderFooter, searchEntries, runSearch, anyLink, TYPE_LABEL, TYPES, esc, param, emptyHtml, typeTag } from '../site/site.js';
import { applyStaticMeta } from '../site/seo.js';
renderHeader('search'); renderFooter(); applyStaticMeta();
const q = document.getElementById('q'), out = document.getElementById('results'), filters = document.getElementById('filters');
// the index (about 400 KB) loads asynchronously: say so, keep whatever the reader types meanwhile, and never show
// "no matches" before the search has actually run
q.value = q.value || param('q') || '';
out.innerHTML = '<p class="muted" role="status" aria-busy="true">Loading the search index…</p>';
let entries = [];
try { entries = await searchEntries(); }
catch (e) { console.error(e); out.innerHTML = emptyHtml('Search is unavailable', 'The search index could not be loaded. <a href="">Try again</a> or browse from the <a href="../anatomy/">anatomy</a> and <a href="../conditions/">clinical</a> hubs.', '', 'search'); throw e; }
document.getElementById('count').textContent = entries.length.toLocaleString('en-US');
const types = ['all', 'structure', 'organ', 'system', 'term', 'conditions', 'symptoms', 'physiology', 'tests', 'biomarkers', 'imaging', 'procedures', 'medications', 'drug-classes', 'targets', 'product', 'first-aid', 'health'];
let type = 'all';
filters.innerHTML = types.map(t => `<button type="button" class="chip ${t === 'all' ? 'is-active' : ''}" data-t="${t}">${t === 'all' ? 'All' : esc(TYPE_LABEL[t] || t)}</button>`).join('');
filters.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; type = b.dataset.t; for (const x of filters.children) x.classList.toggle('is-active', x === b); render(); });
function render() {
  const s = q.value.trim();
  const pool = type === 'all' ? entries : entries.filter(e => e.type === type);
  if (!s) { out.innerHTML = `<p class="muted">Type to search${type !== 'all' ? ` within ${esc(TYPE_LABEL[type] || type)}` : ''}. Results link straight to the page or into the 3D atlas.</p>`; return; }
  const res = runSearch(pool, s, 60);
  if (!res.length) { out.innerHTML = emptyHtml('No matches', 'Try a shorter word, an alias (heart attack, blood thinner) or a Latin name.'); return; }
  const groups = new Map(); for (const r of res) { if (!groups.has(r.type)) groups.set(r.type, []); groups.get(r.type).push(r); }
  out.innerHTML = [...groups].map(([t, list]) => `<div class="result-group"><h2>${typeTag(t)} <span class="badge">${list.length}</span></h2><ul class="list">${list.map(r => `<li><a href="${anyLink(r.type, r.id)}">${esc(r.name)}</a> <span class="muted small">· ${esc(r.sub)}</span></li>`).join('')}</ul></div>`).join('');
  const u = new URL(location.href); u.searchParams.set('q', s); history.replaceState(null, '', u);
}
if (!q.value) q.value = param('q') || ''; q.addEventListener('input', render); render();
