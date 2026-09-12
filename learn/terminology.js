// learn/terminology.js — page script for learn/terminology.html (kept external so the site runs under a strict CSP).
import { renderHeader, renderFooter, loadData, loadClinical, termLink, entityLink, TYPES, TYPE_ORDER, esc } from '../site/site.js';
renderHeader('terminology'); renderFooter();
const [data, clinical] = await Promise.all([loadData(), loadClinical().catch(() => null)]); const { terms } = data;
const byId = new Map(terms.terms.map(t => [t.id, t]));
let cat = 'all'; const q = document.getElementById('q');
const cats = document.getElementById('cats');
cats.innerHTML = `<button class="chip is-active" data-cat="all">All ${terms.terms.length}</button>` + terms.categories.map(c => `<button class="chip" data-cat="${c.id}">${esc(c.name)} ${terms.terms.filter(t => t.category === c.id).length}</button>`).join('');
cats.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; for (const x of cats.children) x.classList.toggle('is-active', x === b); render(); });
q.addEventListener('input', render);
function render() {
  const s = q.value.trim().toLowerCase();
  const list = terms.terms.filter(t => (cat === 'all' || t.category === cat) && (!s || [t.term, t.definition, t.plain, t.example].join(' ').toLowerCase().includes(s)));
  const catName = (id) => terms.categories.find(c => c.id === id)?.name || '';
  document.getElementById('terms').innerHTML = list.length ? list.map(t => {
    const see = termLink(t, data);
    const rel = [...(t.opposite ? [['Opposite', t.opposite]] : []), ...(t.related || []).map(r => ['Related', r])].filter(([, id]) => byId.has(id));
    const used = clinical && clinical.terms && clinical.terms[t.id] ? TYPE_ORDER.filter(ty => clinical.terms[t.id][ty]).map(ty => clinical.terms[t.id][ty].slice(0, 6).map(id => `<a class="chip" href="${entityLink(ty, id)}">${esc(clinical.names[ty][id] || id)}</a>`).join('')).join('') : '';
    return `<article class="term" id="${t.id}"><div class="eyebrow">${esc(catName(t.category))}</div><h3>${esc(t.term)}${t.say ? ` <span class="muted small" style="font-weight:400">· say “${esc(t.say)}”</span>` : ''}</h3><p>${esc(t.definition)}</p>${t.plain ? `<p class="plain">${esc(t.plain)}</p>` : ''}<dl>${t.example ? `<dt>Example</dt><dd>${esc(t.example)}</dd>` : ''}${rel.map(([k, id]) => `<dt>${k}</dt><dd><a href="#${id}">${esc(byId.get(id).term)}</a></dd>`).join('')}${see ? `<dt>Atlas</dt><dd><a href="${see}">See it in 3D ↗</a></dd>` : ''}${used ? `<dt>Used in</dt><dd><div class="chips">${used}</div></dd>` : ''}</dl></article>`;
  }).join('') : '<p class="muted">No terms match.</p>';
}
render();
if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' }), 50);
