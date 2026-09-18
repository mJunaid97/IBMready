// study/index.js — page script for study/index.html (kept external so the site runs under a strict CSP).
import { renderHeader, renderFooter, loadData, loadType, loadClinical, link, entityLink, TYPES, esc } from '../site/site.js?v=1.8.1';
import { applyStaticMeta } from '../site/seo.js?v=1.8.1';
renderHeader('study'); renderFooter(); applyStaticMeta();
const { atlas, content, terms } = await loadData();
const bigSystems = atlas.systems.filter(s => s.id !== 'skin' && s.count >= 8);
document.getElementById('identify').innerHTML = `<a class="card" href="${link.quiz()}"><h3>Whole body</h3><p>Any of the ${atlas.totals.structures.toLocaleString('en-US')} structures: the full challenge.</p></a>` + bigSystems.map(s => `<a class="card" href="${link.quiz(s.id)}"><h3><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</h3><p>${esc(s.summary)}</p><div class="meta">${s.count} pieces</div></a>`).join('');
document.getElementById('locate').innerHTML = `<a class="chip" href="${link.locate()}">Whole body</a>` + bigSystems.map(s => `<a class="chip" href="${link.locate(s.id)}">${esc(s.name)}</a>`).join('');
document.getElementById('regions').innerHTML = content.regions.map(r => `<a class="chip" href="${link.quiz()}#r=${r.id}">${esc(r.name)} · ${r.structures.length}</a>`).join('');
document.getElementById('cards').innerHTML = `<a class="chip" href="${link.cards()}">All systems</a>` + bigSystems.map(s => `<a class="chip" href="${link.cards(s.id)}">${esc(s.name)}</a>`).join('');

// ---- definition → name quizzes over several banks
const BANKS = [
  { id: 'terms', name: 'Terminology', load: async () => terms.terms.filter(t => t.definition).map(t => ({ id: t.id, name: t.term, prompt: t.definition, group: t.category, note: t.example, href: link.term(t.id) })) },
  { id: 'conditions', name: 'Conditions', load: () => bank('conditions', e => e.definition) },
  { id: 'symptoms', name: 'Symptoms: which condition?', load: () => bank('symptoms', e => e.what) },
  { id: 'tests', name: 'Medical tests', load: () => bank('tests', e => e.what) },
  { id: 'medications', name: 'Medications: how it works', load: () => bank('medications', e => e.howItWorks) },
  { id: 'procedures', name: 'Procedures', load: () => bank('procedures', e => e.what) },
  { id: 'first-aid', name: 'First aid: what is this?', load: () => bank('first-aid', e => e.summary) },
];
async function bank(type, promptOf) {
  const { items } = await loadType(type);
  return Object.values(items).map(e => ({ id: e.id, name: e.name, prompt: promptOf(e), group: e.category, note: '', href: entityLink(type, e.id) })).filter(x => x.prompt);
}
const box = document.getElementById('termquiz'); const banks = document.getElementById('banks');
let pool = [], asked = 0, score = 0, current = null, bankId = location.hash === '#terms' ? 'terms' : (new URLSearchParams(location.search).get('bank') || 'terms');
banks.innerHTML = BANKS.map(b => `<button class="chip ${b.id === bankId ? 'is-active' : ''}" data-bank="${b.id}">${esc(b.name)}</button>`).join('');
banks.addEventListener('click', async (e) => { const b = e.target.closest('[data-bank]'); if (!b) return; bankId = b.dataset.bank; for (const x of banks.children) x.classList.toggle('is-active', x === b); await startBank(); });
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
async function startBank() { pool = await BANKS.find(b => b.id === bankId).load(); asked = 0; score = 0; next(); }
function next() {
  if (asked >= 10) { box.innerHTML = `<div class="q">Round complete: ${score} / 10</div><button class="btn btn-primary" id="again">Play again</button>`; box.querySelector('#again').addEventListener('click', () => { asked = 0; score = 0; next(); }); return; }
  if (pool.length < 4) { box.innerHTML = '<p class="muted">Not enough entries in this bank.</p>'; return; }
  const answer = pick(pool); const same = pool.filter(t => t.group === answer.group && t.id !== answer.id);
  const opts = new Set([answer]); while (opts.size < 4) opts.add(pick(same.length >= 3 ? same : pool.filter(t => t.id !== answer.id)));
  current = { answer, options: [...opts].sort(() => Math.random() - 0.5), done: false };
  const hidden = current.answer.prompt.replace(new RegExp(current.answer.name.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '____');
  box.innerHTML = `<div class="eyebrow">Question ${asked + 1} of 10 · ${esc(BANKS.find(b => b.id === bankId).name)}</div><div class="q">${esc(hidden)}</div><div class="opts">${current.options.map(t => `<button class="btn" data-id="${t.id}">${esc(t.name)}</button>`).join('')}</div><p class="muted small" id="fb" style="margin-top:10px"></p>`;
  for (const b of box.querySelectorAll('[data-id]')) b.addEventListener('click', () => answerQ(b.dataset.id));
}
function answerQ(id) {
  if (current.done) return; current.done = true; asked++;
  const right = id === current.answer.id; if (right) score++;
  for (const b of box.querySelectorAll('[data-id]')) { if (b.dataset.id === current.answer.id) b.classList.add('is-right'); else if (b.dataset.id === id) b.classList.add('is-wrong'); }
  box.querySelector('#fb').innerHTML = `${right ? 'Correct.' : `Not quite: it is <b>${esc(current.answer.name)}</b>.`} ${current.answer.note ? esc(current.answer.note) : ''} <a href="${current.answer.href}" class="small">Read more ↗</a> <button class="btn btn-sm btn-primary" id="nx" style="margin-left:8px">Next</button>`;
  box.querySelector('#nx').addEventListener('click', next);
}
document.addEventListener('keydown', (e) => { if (/^[1-4]$/.test(e.key) && current && !current.done && document.activeElement.tagName !== 'INPUT') { const b = box.querySelectorAll('[data-id]')[+e.key - 1]; if (b) b.click(); } });
await startBank();

// ---- viva: short-answer questions generated from the knowledge graph
const [phys, conds, fa] = await Promise.all([loadType('physiology'), loadType('conditions'), loadType('first-aid')]);
const viva = [];
for (const e of Object.values(phys.items)) for (const k of e.keyFacts || []) viva.push({ scope: 'physiology', q: `${e.name}: ${k.label}?`, a: k.value, href: entityLink('physiology', e.id), src: e.name });
for (const e of Object.values(conds.items)) {
  if (e.definition) viva.push({ scope: 'conditions', q: `Define ${e.name.toLowerCase()}.`, a: e.definition, href: entityLink('conditions', e.id), src: e.name });
  if (e.causes?.length) viva.push({ scope: 'conditions', q: `Name the main causes of ${e.name.toLowerCase()}.`, a: e.causes.join('; '), href: entityLink('conditions', e.id), src: e.name });
  if (e.complications?.length) viva.push({ scope: 'conditions', q: `List the complications of ${e.name.toLowerCase()}.`, a: e.complications.join('; '), href: entityLink('conditions', e.id), src: e.name });
  if (e.diagnosis) viva.push({ scope: 'conditions', q: `How is ${e.name.toLowerCase()} diagnosed?`, a: e.diagnosis, href: entityLink('conditions', e.id), src: e.name });
}
for (const e of Object.values(fa.items)) { if (e.steps?.length) viva.push({ scope: 'first-aid', q: `${e.name}: what are the steps?`, a: e.steps.map((s, i) => `${i + 1}. ${s.title}`).join(' '), href: entityLink('first-aid', e.id), src: e.name }); if (e.why) viva.push({ scope: 'first-aid', q: `${e.name}: explain the anatomy or physiology behind the first aid.`, a: e.why, href: entityLink('first-aid', e.id), src: e.name }); }
const scopes = [['all', 'All'], ['physiology', 'Physiology'], ['conditions', 'Conditions'], ['first-aid', 'First aid']];
let vscope = 'all'; const vs = document.getElementById('viva-scope'), vl = document.getElementById('viva-list');
vs.innerHTML = scopes.map(([id, n]) => `<button class="chip ${id === 'all' ? 'is-active' : ''}" data-s="${id}">${n} · ${id === 'all' ? viva.length : viva.filter(v => v.scope === id).length}</button>`).join('') + `<button class="chip" id="viva-shuffle">Shuffle ↻</button>`;
vs.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) { vscope = b.dataset.s; for (const x of vs.querySelectorAll('[data-s]')) x.classList.toggle('is-active', x === b); } if (b || e.target.closest('#viva-shuffle')) renderViva(); });
function renderViva() {
  const list = viva.filter(v => vscope === 'all' || v.scope === vscope).sort(() => Math.random() - 0.5).slice(0, 8);
  vl.innerHTML = list.map(v => `<div class="viva"><button type="button">${esc(v.q)} <span class="muted small" style="font-weight:400">· reveal</span></button><div class="a"><p style="margin:0 0 6px">${esc(v.a)}</p><a class="small" href="${v.href}">${esc(v.src)} ↗</a></div></div>`).join('');
  for (const el of vl.querySelectorAll('.viva')) el.querySelector('button').addEventListener('click', () => el.classList.toggle('is-open'));
}
renderViva();
