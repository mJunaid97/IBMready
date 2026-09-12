// organs/index.js — page script for organs/index.html (kept external so the site runs under a strict CSP).
import { renderHeader, renderFooter, loadData, link, esc } from '../site/site.js';
renderHeader('organs'); renderFooter();
const { atlas, content } = await loadData();
const bySys = new Map();
for (const o of content.organs) { if (!bySys.has(o.system)) bySys.set(o.system, []); bySys.get(o.system).push(o); }
document.getElementById('organs').innerHTML = atlas.systems.filter(s => bySys.has(s.id)).map(s => `<h2><span class="card dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${s.color};padding:0;box-shadow:none;margin-right:6px"></span>${esc(s.name)}</h2><div class="grid grid-3">${bySys.get(s.id).map(o => `<a class="card" href="${link.organPage(o.id)}"><h3>${esc(o.name)}</h3><p>${esc(o.summary)}</p><div class="meta">${o.structures.length} structures${o.region ? ' · ' + esc(content.regions.find(r => r.id === o.region)?.name || '') : ''}</div></a>`).join('')}</div>`).join('');
