// roadmap/index.js — page script for roadmap/index.html (kept external so the site runs under a strict CSP).
import { renderHeader, renderFooter, ROOT, esc, stamp } from '../site/site.js?v=1.8.0';
import { applyStaticMeta } from '../site/seo.js?v=1.8.0';
renderHeader('roadmap'); renderFooter(); applyStaticMeta();
const rm = await fetch(ROOT + 'content/roadmap.json' + stamp()).then(r => r.json());
document.getElementById('vision').textContent = rm.vision;
const badge = (s) => { const k = ['live', 'started', 'planned'].includes(s) ? s : 'planned'; return `<span class="badge ${k === 'live' ? 'live' : k === 'started' ? '' : 'planned'}">${esc(k)}</span>`; };
document.getElementById('phases').innerHTML = rm.phases.map(p => `<section class="phase" id="${p.id}"><h3>${esc(p.name)} ${badge(p.status)}</h3><p class="muted small">${esc(p.summary)}</p><ul>${p.items.map(i => `<li>${i.href ? `<a href="${ROOT}${i.href}">${esc(i.name)}</a>` : i.anchor ? `<a href="#${i.anchor}">${esc(i.name)}</a>` : esc(i.name)} ${badge(i.status)}</li>`).join('')}</ul></section>`).join('');
document.getElementById('sections').innerHTML = rm.sections.map(s => `<section class="term" id="${s.id}"><h3>${s.href ? `<a href="${ROOT}${s.href}" style="text-decoration:none">${esc(s.name)}</a>` : esc(s.name)} ${badge(s.status || 'planned')}</h3><p>${esc(s.summary)}</p></section>`).join('');
document.getElementById('entities').innerHTML = rm.entities.map(e => `<div class="term" style="padding:10px 0"><b>${esc(e.name)}</b> ${badge(e.status)}<div class="muted small">${esc(e.note)}</div><div class="mono muted">${esc(e.where)}</div></div>`).join('');
if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' }), 50);
