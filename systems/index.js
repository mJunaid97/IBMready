// systems/index.js — page script for systems/index.html (kept external so the site runs under a strict CSP).
import { renderHeader, renderFooter, loadData, esc, fmt } from '../site/site.js';
renderHeader('systems'); renderFooter();
const { atlas, content } = await loadData();
document.getElementById('systems').innerHTML = atlas.systems.map(s => {
  const c = content.systems[s.id] || {};
  const organs = content.organs.filter(o => o.system === s.id).length;
  return `<a class="card" href="system.html?id=${s.id}"><h3><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</h3><p>${esc(c.summary || s.summary)}</p><div class="meta">${fmt(s.count)} pieces · ${fmt(s.triangles)} triangles${organs ? ` · ${organs} organ${organs > 1 ? 's' : ''}` : ''}</div></a>`;
}).join('');
