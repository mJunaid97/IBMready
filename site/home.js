// site/home.js — page script for index.html (kept external so the site runs under a strict CSP).
import { renderHeader, renderFooter, TYPES, typeLink, loadData, loadClinical, esc } from './site.js';
renderHeader('home'); renderFooter();
const clinical = await loadClinical().catch(() => null);
const count = (t) => clinical ? Object.keys(clinical.names[t] || {}).length : '';
const card = (t, extra = '') => `<a class="card" href="${typeLink(t)}"><div class="icon">${TYPES[t].icon}</div><h3>${esc(TYPES[t].name)} ${count(t) ? `<span class="badge">${count(t)}</span>` : ''}</h3><p>${esc(TYPES[t].blurb)}</p>${extra}</a>`;
document.getElementById('types').innerHTML = ['symptoms', 'conditions', 'tests', 'imaging', 'procedures', 'medications'].map(t => card(t)).join('');
document.getElementById('everyday').innerHTML = card('first-aid') + card('health') + `<a class="card" href="search/index.html"><div class="icon">🔍</div><h3>Search everything</h3><p>One search across structures, organs, systems, terms and every clinical topic, with results that link straight into the 3D atlas.</p></a>`;
loadData().then(({ atlas, content }) => {
  const set = (i, v) => { document.querySelectorAll('.stat b')[i].textContent = v.toLocaleString('en-US'); };
  set(0, atlas.totals.pieces); set(1, atlas.totals.structures);
  if (clinical) set(2, Object.values(clinical.names).reduce((n, m) => n + Object.keys(m).length, 0));
}).catch(() => {});
