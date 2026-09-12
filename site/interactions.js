/**
 * interactions.js — the medication interaction checker (/interactions/, noindex). The user adds medicines by
 * generic name, brand, drug class or combination product; every entry is resolved to canonical ingredient ids
 * (brand → product → ingredients), classes are expanded, and every pair is matched against the sourced
 * records in data/content/interactions.json. It shows what the cited sources say; it never says "safe".
 */
import { renderHeader, renderFooter, loadInteractions, loadClinical, link, entityLink, esc, param, paths, PRERENDERED, SITE, SEVERITY, breadcrumbHtml } from './site.js';
import { applyMeta, webPageNode, metaDescription } from './seo.js';
import { interactionCard, sevBadge, src } from './entity.js';

const NOTICE = 'This tool provides educational information from referenced medical sources. It does not account for all factors that can affect medicine safety, including diagnoses, doses, kidney or liver function, pregnancy, allergies, or every possible product.';
const DISCLAIMER = 'Medication interactions can depend on dose, route, timing, medical conditions, organ function, age, pregnancy, and other medicines or supplements. This tool cannot determine whether a combination is appropriate for an individual.';
const NONE = 'No documented interaction found in the sources currently indexed by Anatomy Nexus.';
const ABSENCE = 'Absence from this database does not prove that no interaction exists. Check with a pharmacist or prescriber before combining medicines.';
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

renderHeader('interactions'); renderFooter();
const path = paths.dir('interactions'); const title = `Medication Interaction Checker | ${SITE.name}`;
const description = 'Check two or more medicines, brands, drug classes or combination products against sourced interaction records: what official information says, the mechanism, general management and monitoring.';
if (!PRERENDERED) applyMeta({ title, description, path, robots: 'noindex,follow', breadcrumbs: [{ name: 'Home', href: link.home() }, { name: 'Interaction checker' }], jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'WebPage', updated: SITE.updated })] });

const [ix, clinical] = await Promise.all([loadInteractions(), loadClinical()]);
const app = document.getElementById('checker');
const index = ix.index.map(x => ({ ...x, n: norm(x.label), a: norm(x.alias || '') }));
const byKey = new Map(index.map(x => [`${x.kind}:${x.id}`, x]));
const product = (id) => ix.products.find(p => p.id === id);
const medName = (id) => clinical.names.medications[id] || id;
const className = (id) => ix.classNames[id] || id;
let selected = [];   // [{kind, id, label}]

function resolve(token) {
  const t = norm(token); if (!t) return null;
  for (const kind of ['medication', 'product', 'class']) { const hit = byKey.get(`${kind}:${token}`); if (hit && !hit.alias) return hit; }
  return index.find(x => x.n === t || x.a === t) || index.find(x => x.a && x.a.startsWith(t)) || index.find(x => x.n.startsWith(t)) || null;
}
/** Every selection becomes one or more agents: a site medication (with its class), a class, or a named ingredient without a page. */
function agents() {
  const out = [];
  for (const s of selected) {
    if (s.kind === 'medication') out.push({ medId: s.id, classId: ix.drugClassOf[s.id] || null, name: medName(s.id), from: s });
    else if (s.kind === 'class') out.push({ classId: s.id, name: className(s.id), from: s });
    else if (s.kind === 'product') { const p = product(s.id); for (const ing of p?.ingredients || []) out.push(ing.id ? { medId: ing.id, classId: ix.drugClassOf[ing.id] || null, name: ing.name, from: s } : { name: ing.name, classId: ing.drugClass || null, from: s }); }
  }
  return out;
}
const rec = (id) => ix.records.find(r => r.id === id);
function pairRecords(A, B) {
  const hits = [];
  const nameHit = (r, name) => name && r.bName && (norm(r.bName).includes(norm(name)) || norm(name).includes(norm(r.bName)));
  for (const r of ix.records) {
    if (A.medId && B.medId) {
      if (r.b && ((r.a === A.medId && r.b === B.medId) || (r.a === B.medId && r.b === A.medId))) hits.push(r);
      else if (r.bClass && ((r.a === A.medId && r.bClass === B.classId && A.medId !== B.medId) || (r.a === B.medId && r.bClass === A.classId && A.medId !== B.medId))) hits.push(r);
    } else if (A.medId && !B.medId) {
      if (r.bClass && B.classId && r.a === A.medId && r.bClass === B.classId) hits.push(r);
      else if (r.a === A.medId && (nameHit(r, B.name) || (B.from.kind === 'class' && (ix.classMemberNames[B.classId] || []).some(n => nameHit(r, n))))) hits.push(r);
    } else if (B.medId && !A.medId) {
      if (r.bClass && A.classId && r.a === B.medId && r.bClass === A.classId) hits.push(r);
      else if (r.a === B.medId && (nameHit(r, A.name) || (A.from.kind === 'class' && (ix.classMemberNames[A.classId] || []).some(n => nameHit(r, n))))) hits.push(r);
    }
  }
  return hits;
}
function check() {
  const ag = agents(); const cards = new Map(); const notes = [];
  for (let i = 0; i < ag.length; i++) for (let j = i + 1; j < ag.length; j++) {
    const A = ag[i], B = ag[j];
    if (A.medId && B.medId && A.medId === B.medId && A.from !== B.from) notes.push({ kind: 'dup-same', text: `${esc(A.name)} appears twice (${esc(A.from.label)} and ${esc(B.from.label)}): the same active ingredient from two entries is a therapeutic duplication and adds up towards the daily maximum.` });
    else if (A.classId && B.classId && A.classId === B.classId && A.medId !== B.medId && ix.duplicationClasses[A.classId]) { const d = ix.duplicationClasses[A.classId]; notes.push({ kind: 'dup-class', text: `${esc(A.name)} and ${esc(B.name)} are both ${esc(className(A.classId).toLowerCase())}. ${esc(d.text)}`, source: d.source, cls: A.classId }); }
    for (const r of pairRecords(A, B)) cards.set(r.id, r);
  }
  const list = [...cards.values()].sort((x, y) => (SEVERITY[x.severity] || SEVERITY.NO_SEVERITY_ASSIGNED).order - (SEVERITY[y.severity] || SEVERITY.NO_SEVERITY_ASSIGNED).order);
  return { list, notes, agents: ag };
}
function renderResults() {
  const res = document.getElementById('chk-results');
  if (selected.length < 2) { res.innerHTML = `<p class="muted">Add at least two entries to check them against each other.${selected.length === 1 && selected[0].kind === 'medication' ? ` The <a href="${entityLink('medications', selected[0].id)}#interactions">${esc(selected[0].label)} page</a> lists every documented interaction for that medicine.` : ''}</p>`; return; }
  const { list, notes, agents: ag } = check();
  const products = selected.filter(s => s.kind === 'product').map(s => product(s.id)).filter(Boolean);
  const expanded = products.length ? `<div class="callout info"><b>Combination products expanded.</b> ${products.map(p => `${esc(p.name)} = ${p.ingredients.map(i => i.id ? `<a href="${entityLink('medications', i.id)}">${esc(i.name)}</a>` : esc(i.name)).join(' + ')}${p.note ? ` <span class="muted small">(${esc(p.note)})</span>` : ''}${src(p.source)}`).join('<br>')}</div>` : '';
  const noPage = ag.filter(a => !a.medId && !a.from.kind.startsWith('class')).map(a => a.name);
  const counts = list.length ? `<p class="small muted">${list.length} record${list.length === 1 ? '' : 's'} found for ${ag.length} ingredients${notes.length ? ` · ${notes.length} duplication note${notes.length === 1 ? '' : 's'}` : ''}.</p>` : '';
  res.innerHTML = `<h2>Medication interaction check</h2><div class="callout"><b>Important context.</b> ${esc(NOTICE)}</div>${expanded}${counts}
    ${notes.map(n => `<div class="callout urgent"><b>Therapeutic duplication.</b> ${n.text}${n.source ? src(n.source) : ''}${n.cls ? ` <a href="${entityLink('drug-classes', n.cls)}">Class page</a>` : ''}</div>`).join('')}
    ${list.length ? `<div class="ix-list">${list.map(r => interactionCard(r, ix, clinical)).join('')}</div>` : `<div class="callout info"><b>${esc(NONE)}</b> ${esc(ABSENCE)}</div>`}
    ${noPage.length ? `<p class="small muted">${esc([...new Set(noPage)].join(', '))}: no page on this site yet, so only records that name ${noPage.length === 1 ? 'it' : 'them'} directly could be matched.</p>` : ''}
    <p class="small muted">${esc(ABSENCE)} Records are matched between every pair of ingredients, including the ingredients of combination products and the drug class each medicine belongs to.</p>`;
}
function renderSelected() {
  document.getElementById('chk-chips').innerHTML = selected.map((s, i) => `<span class="chip chip-lg chk-chip">${esc(s.label)}${s.kind !== 'medication' ? ` <span class="muted small">${s.kind}</span>` : ''} <button type="button" class="chk-x" data-i="${i}" aria-label="Remove ${esc(s.label)}">×</button></span>`).join('') || '<span class="muted small">Nothing added yet.</span>';
  const u = new URL(location.href); if (selected.length) u.searchParams.set('drugs', selected.map(s => s.id).join(',')); else u.searchParams.delete('drugs'); history.replaceState(null, '', u);
  renderResults();
}
function add(hit) { if (!hit) return; if (selected.some(s => s.kind === hit.kind && s.id === hit.id)) return; selected.push({ kind: hit.kind, id: hit.id, label: hit.alias ? `${hit.alias} (${hit.label.replace(/ \(.*\)$/, '')})` : hit.label }); renderSelected(); }

app.innerHTML = `
  <div class="callout urgent"><b>Before you use this tool.</b> ${esc(DISCLAIMER)}</div>
  <div class="chk-input"><label for="chk-q"><b>Add a medicine, brand, drug class or combination product</b></label>
    <input id="chk-q" type="search" autocomplete="off" placeholder="e.g. amlodipine, Norvasc, ibuprofen, co-codamol, statins…" aria-controls="chk-sugg" aria-autocomplete="list">
    <ul class="hsearch-results chk-sugg" id="chk-sugg" hidden></ul></div>
  <div class="chips" id="chk-chips"></div>
  <div id="chk-results"></div>
  <p class="small muted">Names are resolved to canonical ingredients: brands map to their generic medicine, combination products are split into ingredients, and drug classes are matched through each medicine's class. ${ix.records.length} sourced records, ${ix.products.length} products and ${Object.keys(ix.classNames).length} classes are currently indexed.</p>`;
const q = document.getElementById('chk-q'), sugg = document.getElementById('chk-sugg'); let results = [], active = -1;
const close = () => { sugg.hidden = true; active = -1; };
const renderSugg = () => { sugg.innerHTML = results.length ? results.map((r, i) => `<li role="option" aria-selected="${i === active}"><a href="#" data-i="${i}"><span class="r-name">${esc(r.label)}</span><span class="r-type">${esc(r.kind)}</span></a></li>`).join('') : '<li class="r-empty">No matches among the medicines, classes and products on this site</li>'; sugg.hidden = false; };
q.addEventListener('input', () => { const t = norm(q.value); if (!t) { close(); return; } const starts = index.filter(x => x.n.startsWith(t) || (x.a && x.a.startsWith(t))); const within = index.filter(x => !starts.includes(x) && x.n.includes(t)); results = [...starts, ...within].slice(0, 8); active = -1; renderSugg(); });
q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); active = (active + 1) % results.length; renderSugg(); }
  else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); active = (active - 1 + results.length) % results.length; renderSugg(); }
  else if (e.key === 'Enter') { e.preventDefault(); add(active >= 0 ? results[active] : results[0] || resolve(q.value)); q.value = ''; close(); }
  else if (e.key === 'Escape') close();
});
sugg.addEventListener('mousedown', (e) => { const a = e.target.closest('a[data-i]'); if (!a) return; e.preventDefault(); add(results[+a.dataset.i]); q.value = ''; close(); });
q.addEventListener('blur', () => setTimeout(close, 150));
document.getElementById('chk-chips').addEventListener('click', (e) => { const b = e.target.closest('.chk-x'); if (!b) return; selected.splice(+b.dataset.i, 1); renderSelected(); });
for (const tok of (param('drugs') || '').split(',').map(s => s.trim()).filter(Boolean)) add(resolve(tok));
renderSelected();
document.body.dataset.rendered = '1';
