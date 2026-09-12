/**
 * entity.js — generic renderer for the knowledge-graph sections (physiology, symptoms, conditions,
 * tests, imaging, procedures, medications, first aid, health). Each section is a directory with an
 * index page (renderIndex) and a detail page (renderDetail); the entity data comes from
 * data/content/types/<type>.json, names of linked entities from data/content/clinical.json.
 */
import { renderHeader, renderFooter, loadData, loadClinical, loadType, link, entityLink, typeLink, TYPES, TYPE_ORDER, esc, param, pageId, setCanonical, entityPath, ROOT } from './site.js';

const SYMPTOM_REGION = { head: 'head', chest: 'thorax', abdomen: 'abdomen', back: 'thorax', arms: 'upper-limb', legs: 'lower-limb' };
const DISCLAIMER = {
  symptoms: 'This page explains what a symptom can mean so that the anatomy and the medical reasoning make sense. It cannot tell you what is causing yours: only a clinician who can examine you and order tests can do that.',
  conditions: 'Educational overview of a condition, not personal medical advice. Diagnosis and treatment decisions belong to the person\'s own clinical team.',
  medications: 'For understanding how a medicine works and what to watch for. Doses, choices and monitoring are decided by a prescriber for an individual; never start, stop or change a medicine on the basis of this page.',
  'first-aid': 'Written to follow current resuscitation and first-aid guidance, but no page replaces a certified first-aid course. When in doubt, call emergency services.',
  tests: 'Reference ranges differ between laboratories and results are always read against the person, the question asked and other findings. Educational only.',
  procedures: 'A general description of how a procedure is usually done. Details vary between hospitals, surgeons and patients; the treating team explains the specifics and the consent.',
};

// ---------------------------------------------------------------- helpers
const para = (s) => s ? `<p>${esc(s)}</p>` : '';
const paras = (arr) => (arr || []).map(para).join('');
const list = (arr, cls = 'plain') => arr && arr.length ? `<ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
const section = (title, html, id) => html ? `<h2${id ? ` id="${id}"` : ''}>${esc(title)}</h2>${html}` : '';
const kv = (rows, [h1, h2]) => rows && rows.length ? `<div class="table-wrap"><table class="kv"><thead><tr><th>${esc(h1)}</th><th>${esc(h2)}</th></tr></thead><tbody>${rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</tbody></table></div>` : '';
const causes = (arr) => arr && arr.length ? arr.map(c => `<div class="cause"><b>${esc(c.name)}</b><span class="muted">${esc(c.note)}</span></div>`).join('') : '';
const trim = (s, n = 150) => { s = String(s || ''); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; };
const lead = (e) => e.summary || e.what || e.definition || '';

function nameOf(clinical, type, id) { return clinical.names[type]?.[id] || id; }
function chips(clinical, type, ids, { max = 40 } = {}) {
  if (!ids || !ids.length) return '';
  const shown = ids.slice(0, max);
  return `<div class="chips">${shown.map(id => `<a class="chip" href="${entityLink(type, id)}">${esc(nameOf(clinical, type, id))}</a>`).join('')}${ids.length > max ? `<span class="chip">+${ids.length - max} more</span>` : ''}</div>`;
}
function inlineChips(clinical, type, ids) { return ids && ids.length ? `<div class="chips" style="margin:6px 0 12px">${ids.map(id => `<a class="chip" href="${entityLink(type, id)}">${esc(nameOf(clinical, type, id))}</a>`).join('')}</div>` : ''; }

/** links[field] ∪ backlinks[type], minus self, for every type in order. */
export function relatedGroups(e, clinical) {
  const groups = [];
  for (const t of TYPE_ORDER) {
    const field = t === e.type ? 'related' : TYPES[t].field;
    const ids = [...new Set([...(e.links?.[field] || []), ...(e.backlinks?.[t] || [])])].filter(id => !(t === e.type && id === e.id));
    if (ids.length) groups.push({ type: t, ids });
  }
  return groups;
}
function relatedHtml(groups, clinical, title = 'Related topics') {
  if (!groups.length) return '';
  return `<h3>${esc(title)}</h3>${groups.map(g => `<div class="rel-group"><div class="eyebrow"><a href="${typeLink(g.type)}" style="text-decoration:none">${esc(TYPES[g.type].name)}</a></div>${chips(clinical, g.type, g.ids)}</div>`).join('')}`;
}
/** Related-topic groups for an organ, system or structure (used by the organ and system pages and the explorer). */
export function relatedForAnatomy(kind, id, clinical, title) {
  const m = clinical[kind]?.[id]; if (!m) return '';
  const groups = TYPE_ORDER.filter(t => m[t]?.length).map(t => ({ type: t, ids: m[t] }));
  return relatedHtml(groups, clinical, title);
}
export function relatedCountForAnatomy(kind, id, clinical) { const m = clinical[kind]?.[id]; return m ? Object.values(m).reduce((n, a) => n + a.length, 0) : 0; }

function anatomyHtml(e, data, clinical) {
  const { atlas, content, byId } = data; const a = e.anatomy || {};
  const organs = (a.organs || []).map(id => content.organs.find(o => o.id === id)).filter(Boolean);
  const systems = (a.systems || []).map(id => atlas.systems.find(s => s.id === id)).filter(Boolean);
  const structs = (a.structures || []).map(id => atlas.structures[byId.get(id)]).filter(Boolean);
  if (!organs.length && !systems.length && !structs.length) return '';
  const region = e.type === 'symptoms' && SYMPTOM_REGION[e.region] ? content.regions.find(r => r.id === SYMPTOM_REGION[e.region]) : null;
  return `<h3>In the body</h3>
    ${organs.length ? `<div class="rel-group"><div class="eyebrow">Organs</div><div class="chips">${organs.map(o => `<a class="chip" href="${link.organPage(o.id)}">${esc(o.name)}</a>`).join('')}</div></div>` : ''}
    ${systems.length ? `<div class="rel-group"><div class="eyebrow">Systems</div><div class="chips">${systems.map(s => `<a class="chip" href="${link.systemPage(s.id)}" style="border-color:${s.color}">${esc(s.name)}</a>`).join('')}</div></div>` : ''}
    ${structs.length ? `<div class="rel-group"><div class="eyebrow">Structures in the atlas</div><div class="chips">${structs.map(s => `<a class="chip" href="${link.structure(s.id)}" title="Open in the 3D explorer">${esc(s.name)}</a>`).join('')}</div></div>` : ''}
    ${region ? `<div class="rel-group"><div class="eyebrow">Region</div><div class="chips"><a class="chip" href="${link.region(region.id)}">Show the ${esc(region.name.toLowerCase())} in 3D</a></div></div>` : ''}`;
}
function embedHash(e) {
  const a = e.anatomy || {};
  if (a.organs?.length) return 'o=' + a.organs[0];
  if (a.structures?.length) return 's=' + a.structures.slice(0, 12).join(',');
  if (a.systems?.length) return 'sys=' + a.systems[0];
  return null;
}
function termsHtml(e, data) {
  const ids = e.links?.terms || []; if (!ids.length) return '';
  const byId = new Map(data.terms.terms.map(t => [t.id, t]));
  return `<h3>Terms to know</h3><div class="chips">${ids.map(id => byId.get(id)).filter(Boolean).map(t => `<a class="chip" href="${link.term(t.id)}" title="${esc(t.definition)}">${esc(t.term)}</a>`).join('')}</div>`;
}
/** Only plain http(s) URLs may become links; anything else (javascript:, data:, relative) is dropped. */
const safeUrl = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '';
function referencesHtml(e) {
  const refs = (e.references || []).filter(r => r && safeUrl(r.url)); if (!refs.length) return '';
  return `<h3>Sources</h3><ul class="plain small">${refs.map(r => `<li><a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a></li>`).join('')}</ul>`;
}

// ------------------------------------------------------------ templates
const T = {
  physiology(e, ctx) {
    return `${paras(e.body)}${section('Key facts', kv((e.keyFacts || []).map(k => [esc(k.label), esc(k.value)]), ['Fact', 'Value']))}`;
  },
  symptoms(e, { clinical }) {
    return `${section('What it is', para(e.what))}
      ${section('Common causes', causes(e.commonCauses))}
      ${section('Less common causes', causes(e.lessCommon))}
      ${e.links?.associated?.length ? section('Often occurs with', inlineChips(clinical, 'symptoms', e.links.associated)) : ''}
      ${e.urgent?.length ? `<div class="callout urgent"><h3>Seek urgent care if</h3>${list(e.urgent)}</div>` : ''}
      ${e.links?.conditions?.length ? section('Conditions to read about', inlineChips(clinical, 'conditions', e.links.conditions)) : ''}
      ${(e.links?.tests?.length || e.links?.imaging?.length) ? section('How it is investigated', inlineChips(clinical, 'tests', e.links.tests) + inlineChips(clinical, 'imaging', e.links.imaging)) : ''}`;
  },
  conditions(e, { clinical }) {
    return `${section('Overview', para(e.overview))}
      <div class="pair">${e.causes?.length ? `<div><h3>Causes</h3>${list(e.causes)}</div>` : ''}${e.riskFactors?.length ? `<div><h3>Risk factors</h3>${list(e.riskFactors)}</div>` : ''}</div>
      ${section('Symptoms', inlineChips(clinical, 'symptoms', e.links?.symptoms) + (e.signs?.length ? `<h3>What a clinician may find</h3>${list(e.signs)}` : ''))}
      ${section('Complications', list(e.complications))}
      ${section('Diagnosis', para(e.diagnosis) + inlineChips(clinical, 'tests', e.links?.tests) + inlineChips(clinical, 'imaging', e.links?.imaging))}
      ${section('Treatment', para(e.treatment) + inlineChips(clinical, 'procedures', e.links?.procedures) + inlineChips(clinical, 'medications', e.links?.medications))}
      ${section('Prevention', para(e.prevention))}
      ${e.seekCare ? `<div class="callout urgent"><h3>When to seek care</h3><p style="margin:0">${esc(e.seekCare)}</p></div>` : ''}`;
  },
  tests(e) {
    return `${section('What it measures', kv((e.measures || []).map(m => [esc(m.item), esc(m.meaning)]), ['Measure', 'What it tells you']))}
      ${section('Why it is ordered', list(e.whyOrdered))}
      ${section('How it is done', para(e.how) + (e.preparation ? `<p><b>Preparation.</b> ${esc(e.preparation)}</p>` : ''))}
      ${section('Reading the result', kv((e.interpretation || []).map(i => [esc(i.finding), esc(i.meaning)]), ['Finding', 'Usual meaning']))}
      ${section('Limitations', para(e.limitations))}`;
  },
  imaging(e) {
    const facts = [['Preparation', e.preparation], ['Duration', e.duration], ['Radiation', e.dose], ['Contrast', e.contrast], ['Risks', e.risks]].filter(([, v]) => v);
    return `${section('How it works', para(e.how))}
      ${section('What it shows', list(e.shows))}
      <div class="pair">${e.bestFor?.length ? `<div><h3>Best for</h3>${list(e.bestFor)}</div>` : ''}${e.notFor?.length ? `<div><h3>Not the right tool for</h3>${list(e.notFor)}</div>` : ''}</div>
      ${section('What to expect', `<dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`)}
      ${section('Common uses', kv((e.commonUses || []).map(u => [esc(u.region), esc(u.use)]), ['Region', 'Typical question']))}`;
  },
  procedures(e) {
    return `${section('What it is', para(e.what))}
      ${section('Why it is done', list(e.why))}
      ${section('Before the procedure', list(e.before))}
      ${section('Step by step', e.steps?.length ? `<ol class="steps">${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '')}
      ${section('Afterwards', list(e.after))}
      ${section('Recovery', para(e.recovery))}
      <div class="pair">${e.risks?.length ? `<div><h3>Risks</h3>${list(e.risks)}</div>` : ''}${e.alternatives?.length ? `<div><h3>Alternatives</h3>${list(e.alternatives)}</div>` : ''}</div>`;
  },
  medications(e) {
    const facts = [['Class', e.class], ['Forms', (e.forms || []).join('; ')], ['Onset and duration', e.onset], ['Monitoring', e.monitoring]].filter(([, v]) => v);
    return `<dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${section('What it is used for', list(e.usedFor))}
      ${section('How it works in the body', para(e.howItWorks))}
      <div class="pair">${e.sideEffects?.common?.length ? `<div><h3>Common side effects</h3>${list(e.sideEffects.common)}</div>` : ''}${e.sideEffects?.serious?.length ? `<div><h3>Serious: seek help</h3>${list(e.sideEffects.serious)}</div>` : ''}</div>
      ${section('Cautions and interactions', list(e.cautions))}`;
  },
  'first-aid'(e) {
    return `${e.emergency ? `<div class="callout urgent"><h3>Emergency</h3><p style="margin:0">Call emergency services (999 UK · 112 Europe · 911 North America) as soon as you recognise this, or have someone call while you act.</p></div>` : ''}
      ${section('Recognise it', list(e.recognise))}
      ${section('What to do', e.steps?.length ? `<ol class="steps">${e.steps.map(s => `<li><b>${esc(s.title)}</b>${esc(s.detail)}</li>`).join('')}</ol>` : '')}
      ${e.children ? `<div class="callout info"><h3>Children and infants</h3><p style="margin:0">${esc(e.children)}</p></div>` : ''}
      <div class="pair">${e.dont?.length ? `<div><h3>Do not</h3>${list(e.dont)}</div>` : ''}${e.callFor?.length ? `<div><h3>Get medical help when</h3>${list(e.callFor)}</div>` : ''}</div>
      ${section('Why it works: the anatomy', para(e.why))}`;
  },
  health(e, { data }) {
    const sysName = (id) => data.atlas.systems.find(s => s.id === id)?.name || id;
    return `${paras(e.body)}
      ${section('Effects on the body', kv((e.effects || []).map(x => [`<a href="${link.systemPage(x.system)}">${esc(sysName(x.system))}</a>`, esc(x.effect)]), ['System', 'Effect']))}
      ${section('Guidance', list(e.guidance))}`;
  },
};

// -------------------------------------------------------------- pages
export async function renderDetail(type) {
  const TT = TYPES[type]; renderHeader(type); renderFooter();
  const main = document.getElementById('main');
  const [typeData, data, clinical] = await Promise.all([loadType(type), loadData(), loadClinical()]);
  const id = pageId(); const e = id ? typeData.items[id] : null;
  if (!e) { main.innerHTML = `<h1>Not found</h1><p><a href="index.html">All ${esc(TT.name.toLowerCase())}</a></p>`; document.title = `Not found · ${TT.name}`; return; }
  document.title = `${e.name} · ${TT.name} · Human Body`;
  setCanonical(entityPath(type, e.id));
  const md = document.querySelector('meta[name="description"]'); if (md) md.content = `${e.name}: ${lead(e)}`.slice(0, 300);
  const cat = (typeData.meta.categories || []).find(c => c.id === e.category);
  const hash = embedHash(e); const ctx = { data, clinical };
  const groups = relatedGroups(e, clinical);
  const primaryOrgan = e.anatomy?.organs?.[0];
  main.innerHTML = `
    <div class="breadcrumb"><a href="${ROOT}index.html">Home</a> › <a href="index.html">${esc(TT.name)}</a> › ${esc(e.name)}</div>
    <div class="eyebrow">${esc(TT.singular)}${cat ? ` · ${esc(cat.name)}` : ''}${e.emergency ? ' · <span class="badge emergency">emergency</span>' : ''}</div>
    <h1>${esc(e.name)}</h1>
    ${e.aliases?.length ? `<p class="aliases">Also: ${esc(e.aliases.join(', '))}</p>` : ''}
    <p class="lead">${esc(lead(e))}</p>
    ${hash ? `<div class="actions"><a class="btn btn-primary" href="${ROOT}explorer/index.html#${hash}">Open in 3D</a>${primaryOrgan ? `<a class="btn" href="${link.organPage(primaryOrgan)}">${esc(nameOfOrgan(data, primaryOrgan))} page</a>` : ''}</div>
    <div class="embed"><iframe src="${link.embed(hash)}" title="3D view: ${esc(e.name)}" loading="lazy" allow="fullscreen"></iframe></div>` : ''}
    <div class="two">
      <div>
        ${T[type](e, ctx)}
        ${DISCLAIMER[type] ? `<div class="callout"><b>Educational content.</b> ${esc(DISCLAIMER[type])}</div>` : ''}
      </div>
      <aside class="aside">
        ${anatomyHtml(e, data, clinical)}
        ${relatedHtml(groups, clinical)}
        ${termsHtml(e, data)}
        ${referencesHtml(e)}
      </aside>
    </div>`;
}
function nameOfOrgan(data, id) { return data.content.organs.find(o => o.id === id)?.name || id; }

export async function renderIndex(type) {
  const TT = TYPES[type]; renderHeader(type); renderFooter();
  const main = document.getElementById('main');
  const [typeData, data, clinical] = await Promise.all([loadType(type), loadData(), loadClinical()]);
  document.title = `${TT.name} · Human Body`;
  setCanonical(`${TT.dir}/`);
  const items = Object.values(typeData.items).sort((a, b) => a.name.localeCompare(b.name));
  const cats = (typeData.meta.categories || []).map(c => ({ ...c, n: items.filter(i => i.category === c.id).length })).filter(c => c.n);
  const sysName = (id) => data.atlas.systems.find(s => s.id === id)?.name; const organName = (id) => data.content.organs.find(o => o.id === id)?.name;
  main.innerHTML = `
    <div class="breadcrumb"><a href="${ROOT}index.html">Home</a> › ${esc(TT.name)}</div>
    <div class="section-hero"><div class="eyebrow">${esc(TT.icon)} Section</div><h1>${esc(TT.name)}</h1><p class="lead">${esc(typeData.meta.about || TT.blurb)}</p></div>
    <div class="search-row"><input id="q" type="search" placeholder="Filter ${esc(TT.name.toLowerCase())}…" aria-label="Filter"></div>
    <div class="filters" id="filters"><button class="chip is-active" data-cat="all">All ${items.length}</button>${cats.map(c => `<button class="chip" data-cat="${c.id}">${esc(c.name)} ${c.n}</button>`).join('')}</div>
    <div class="grid grid-3" id="cards"></div>
    <h2>Other sections</h2>
    <div class="chips">${TYPE_ORDER.filter(t => t !== type).map(t => `<a class="chip" href="${typeLink(t)}">${esc(TYPES[t].icon)} ${esc(TYPES[t].name)}</a>`).join('')}<a class="chip" href="${ROOT}search/index.html">Search everything</a></div>`;
  let cat = 'all'; const q = document.getElementById('q'); const filters = document.getElementById('filters'); const cards = document.getElementById('cards');
  const catName = (id) => cats.find(c => c.id === id)?.name || '';
  function render() {
    const s = q.value.trim().toLowerCase();
    const list = items.filter(e => (cat === 'all' || e.category === cat) && (!s || [e.name, ...(e.aliases || []), lead(e)].join(' ').toLowerCase().includes(s)));
    cards.innerHTML = list.length ? list.map(e => {
      const tags = [catName(e.category), ...(e.anatomy?.organs || []).slice(0, 2).map(organName), ...(!e.anatomy?.organs?.length ? (e.anatomy?.systems || []).slice(0, 2).map(sysName) : [])].filter(Boolean);
      return `<a class="card" href="${entityLink(type, e.id)}"><h3>${esc(e.name)}${e.emergency ? ' <span class="badge emergency">emergency</span>' : ''}</h3><p>${esc(trim(lead(e), 160))}</p>${tags.length ? `<div class="tags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</a>`;
    }).join('') : '<p class="muted">Nothing matches.</p>';
  }
  filters.addEventListener('click', (ev) => { const b = ev.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; for (const x of filters.children) x.classList.toggle('is-active', x === b); render(); });
  q.addEventListener('input', render);
  const want = param('cat'); if (want && cats.some(c => c.id === want)) { cat = want; for (const x of filters.children) x.classList.toggle('is-active', x.dataset.cat === want); }
  render();
}
