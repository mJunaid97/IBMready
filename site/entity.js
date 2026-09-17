/**
 * entity.js — generic renderer for the knowledge-graph sections (physiology, symptoms, conditions,
 * tests, biomarkers, imaging, procedures, medications, drug classes, drug targets, first aid, health).
 * Each section is a directory with a hub page (renderIndex) and a detail page (renderDetail); the entity
 * data comes from data/content/types/<type>.json, names of linked entities from data/content/clinical.json,
 * and the medication and drug-class pages also load data/content/interactions.json for their interaction sections.
 *
 * Under a prerendered page (body[data-prerendered]) neither function redraws the content: the hub
 * only binds its filters and the detail page only binds the 3D facade and the header.
 */
import { renderHeader, renderFooter, loadData, loadClinical, loadType, loadInteractions, link, entityLink, typeLink, entityPath, organHash, TYPES, TYPE_ORDER, esc, param, pageId, paths, url, ROOT, PRERENDERED, SITE, SEVERITY, breadcrumbHtml, facadeHtml, dateText, canonical } from './site.js';
import { applyMeta, seoTitle, metaDescription, webPageNode } from './seo.js';

const SYMPTOM_REGION = { head: 'head', chest: 'thorax', abdomen: 'abdomen', pelvis: 'pelvis', back: 'thorax', arms: 'upper-limb', legs: 'lower-limb' };
const DISCLAIMER = {
  symptoms: 'This page explains what a symptom can mean so that the anatomy and the medical reasoning make sense. It cannot tell you what is causing yours: only a clinician who can examine you and order tests can do that.',
  conditions: 'Educational overview of a condition, not personal medical advice. Diagnosis and treatment decisions belong to the person\'s own clinical team.',
  medications: 'Anatomy Nexus provides medical education and does not replace professional medical advice, diagnosis, treatment, prescribing or pharmacist review. Doses, choices and monitoring are decided by a prescriber for an individual; never start, stop or change a medicine on the basis of this page.',
  'drug-classes': 'A drug class page describes what a family of medicines has in common. Individual medicines differ in dose, licensing and interactions; treatment choices belong to a prescriber.',
  'first-aid': 'Written to follow current resuscitation and first-aid guidance, but no page replaces a certified first-aid course. When in doubt, call emergency services.',
  tests: 'Reference ranges differ between laboratories, methods, ages and sexes, and results are always read against the person, the question asked and other findings. This page cannot interpret an individual result.',
  biomarkers: 'A biomarker page explains what a substance is and why its level can change. It cannot determine the cause of your result: interpret a result using the range supplied by the laboratory that performed the test, with the clinician who ordered it.',
  targets: 'Describes what a receptor, enzyme, channel or pathway does and which medicines act on it. Educational, not prescribing advice.',
  procedures: 'A general description of how a procedure is usually done. Details vary between hospitals, surgeons and patients; the treating team explains the specifics and the consent.',
};
const TIER_LABEL = { 1: 'official health body or guideline', 2: 'textbook, journal or academic centre', 3: 'charity or secondary resource' };
const RANGE_POLICY = { laboratory: 'Read against the laboratory\'s own reference interval', threshold: 'Read against guideline thresholds, not a laboratory range', descriptive: 'Interpreted descriptively by a clinician, not against a numeric range', none: 'No numeric range applies' };
const INDICATION_STATUS = { licensed: 'Licensed', 'guideline-supported': 'Guideline-supported', 'off-label': 'Off-label (unlicensed)', historical: 'Historical / no longer recommended' };
const WARNING_TYPE = { boxed: 'Boxed warning (US)', contraindication: 'Contraindication', special: 'Special warning', precaution: 'Precaution', monitoring: 'Monitoring', pregnancy: 'Pregnancy', lactation: 'Breastfeeding', renal: 'Kidney', hepatic: 'Liver', driving: 'Driving', other: 'Other' };
const CAUTION_TYPE = { contraindication: 'Contraindication', warning: 'Warning', precaution: 'Precaution', 'dose-or-monitoring': 'Dose or monitoring dependent', other: 'Other' };
const POP_LABEL = { pregnancy: 'Pregnancy', lactation: 'Breastfeeding', children: 'Children', older: 'Older adults', renal: 'Kidney impairment', hepatic: 'Liver impairment' };
export const REVIEW_LABEL = { draft: 'Draft', 'source-ingested': 'Structured from sources, not yet checked', 'source-verified': 'Facts checked against the cited sources; not yet clinically reviewed', 'editorial-review': 'In editorial review', 'clinical-review': 'In clinical review', approved: 'Clinically reviewed and approved', published: 'Published after clinical review', 'needs-review': 'Flagged for re-review', archived: 'Archived' };

// ---------------------------------------------------------------- helpers
const para = (s) => s ? `<p>${esc(s)}</p>` : '';
const paras = (arr) => (arr || []).map(para).join('');
const list = (arr, cls = 'plain') => arr && arr.length ? `<ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
const section = (title, html, id) => html ? `<h2${id ? ` id="${id}"` : ''}>${esc(title)}</h2>${html}` : '';
const kv = (rows, [h1, h2]) => rows && rows.length ? `<div class="table-wrap"><table class="kv"><thead><tr><th scope="col">${esc(h1)}</th><th scope="col">${esc(h2)}</th></tr></thead><tbody>${rows.map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`).join('')}</tbody></table></div>` : '';
const table = (heads, rows, cls = 'kv grid-table') => rows && rows.length ? `<div class="table-wrap"><table class="${cls}"><thead><tr>${heads.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
const causes = (arr) => arr && arr.length ? arr.map(c => `<div class="cause"><b>${esc(c.name)}</b><span class="muted">${esc(c.note)}</span></div>`).join('') : '';
const trim = (s, n = 150) => { s = String(s || ''); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; };
export const lead = (e) => e.summary || e.what || e.definition || e.overview || '';
/** Only plain http(s) URLs may become links; anything else (javascript:, data:, relative) is dropped. */
const safeUrl = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '';
/** Inline source marker for a structured clinical fact: a small link labelled with the source's country, the document and section in the tooltip. */
export const src = (r) => r && safeUrl(r.url) ? ` <a class="src" href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer" title="${esc(r.title)}${r.section ? ' · ' + esc(r.section) : ''}">${esc(r.jurisdiction || 'source')}</a>` : '';

function nameOf(clinical, type, id) { return clinical.names[type]?.[id] || id; }
function chips(clinical, type, ids, { max = 40 } = {}) {
  if (!ids || !ids.length) return '';
  const shown = ids.slice(0, max);
  return `<div class="chips">${shown.map(id => `<a class="chip" href="${entityLink(type, id)}">${esc(nameOf(clinical, type, id))}</a>`).join('')}${ids.length > max ? `<span class="chip">+${ids.length - max} more</span>` : ''}</div>`;
}
function inlineChips(clinical, type, ids) { return ids && ids.length ? `<div class="chips chips-inline">${ids.map(id => `<a class="chip" href="${entityLink(type, id)}">${esc(nameOf(clinical, type, id))}</a>`).join('')}</div>` : ''; }
const entityA = (clinical, type, id) => `<a href="${entityLink(type, id)}">${esc(nameOf(clinical, type, id))}</a>`;

/** links[field] ∪ backlinks[type], minus self, for every type in order. */
export function relatedGroups(e, clinical) {
  const groups = [];
  for (const t of TYPE_ORDER) {
    const field = t === e.type ? 'related' : TYPES[t].field;
    const own = [...(e.links?.[field] || []), ...(t === 'drug-classes' ? (e.links?.drugClasses || []) : [])];
    const ids = [...new Set([...own, ...(e.backlinks?.[t] || [])])].filter(id => !(t === e.type && id === e.id));
    if (ids.length) groups.push({ type: t, ids });
  }
  return groups;
}
export function relatedHtml(groups, clinical, title = 'Related topics') {
  if (!groups.length) return '';
  return `<section class="related"><h2>${esc(title)}</h2>${groups.map(g => `<div class="rel-group"><div class="eyebrow"><a href="${typeLink(g.type)}">${esc(TYPES[g.type].name)}</a></div>${chips(clinical, g.type, g.ids)}</div>`).join('')}</section>`;
}
/** Related-topic groups for an organ, system or structure (used by the anatomy and system pages and the explorer). */
export function relatedForAnatomy(kind, id, clinical, title) {
  const m = clinical[kind]?.[id]; if (!m) return '';
  const groups = TYPE_ORDER.filter(t => m[t]?.length).map(t => ({ type: t, ids: m[t] }));
  return relatedHtml(groups, clinical, title);
}
export function relatedCountForAnatomy(kind, id, clinical) { const m = clinical[kind]?.[id]; return m ? Object.values(m).reduce((n, a) => n + a.length, 0) : 0; }

export function anatomyHtml(e, data, clinical) {
  const { atlas, content, byId } = data; const a = e.anatomy || {};
  const organs = (a.organs || []).map(id => content.organs.find(o => o.id === id)).filter(Boolean);
  const systems = (a.systems || []).map(id => atlas.systems.find(s => s.id === id)).filter(Boolean);
  const structs = (a.structures || []).map(id => atlas.structures[byId.get(id)]).filter(Boolean);
  if (!organs.length && !systems.length && !structs.length) return '';
  const region = e.type === 'symptoms' && SYMPTOM_REGION[e.region] ? content.regions.find(r => r.id === SYMPTOM_REGION[e.region]) : null;
  return `<section class="in-body"><h2>In the body</h2>
    ${organs.length ? `<div class="rel-group"><div class="eyebrow">Anatomy</div><div class="chips">${organs.map(o => `<a class="chip" href="${link.organPage(o.id)}">${esc(o.name)}</a>`).join('')}</div></div>` : ''}
    ${systems.length ? `<div class="rel-group"><div class="eyebrow">Body systems</div><div class="chips">${systems.map(s => `<a class="chip" href="${link.systemPage(s.id)}" style="border-color:${s.color}">${esc(s.name)}</a>`).join('')}</div></div>` : ''}
    ${structs.length ? `<div class="rel-group"><div class="eyebrow">Structures in the atlas</div><div class="chips">${structs.map(s => `<a class="chip" href="${link.structure(s.id)}" title="Open in the 3D explorer">${esc(s.name)}</a>`).join('')}</div></div>` : ''}
    ${region ? `<div class="rel-group"><div class="eyebrow">Region</div><div class="chips"><a class="chip" href="${link.region(region.id)}">Show the ${esc(region.name.toLowerCase())} in 3D</a></div></div>` : ''}</section>`;
}
/** The explorer view a page embeds: the first organ it concerns that the atlas can show (its pieces, or the modelled
 *  structures around an organ the atlas does not contain), else its structures, else its first system. Mirrored by
 *  tools/render-previews.mjs, which renders the preview image of every hash a page can embed. */
export function embedHash(e, data) {
  const a = e.anatomy || {};
  for (const oid of a.organs || []) { const h = organHash((data?.content?.organs || []).find(o => o.id === oid), data?.atlas); if (h) return h; }
  if (a.structures?.length) return 's=' + a.structures.slice(0, 12).join(',');
  if (a.systems?.length) return 'sys=' + a.systems[0];
  return null;
}
export function termsHtml(ids, data) {
  if (!ids || !ids.length) return '';
  const byId = new Map(data.terms.terms.map(t => [t.id, t]));
  return `<section><h2>Terms to know</h2><div class="chips">${ids.map(id => byId.get(id)).filter(Boolean).map(t => `<a class="chip" href="${link.term(t.id)}" title="${esc(t.definition)}">${esc(t.term)}</a>`).join('')}</div></section>`;
}
export function referencesHtml(refs, title = 'Sources') {
  refs = (refs || []).filter(r => r && safeUrl(r.url)); if (!refs.length) return '';
  return `<section class="refs"><h2>${esc(title)}</h2><ol class="ref-list">${refs.map(r => `<li><a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a>${r.section ? `<span class="ref-section"> · ${esc(r.section)}</span>` : ''}<span class="ref-meta">${esc(r.source || '')}${r.jurisdiction ? ` · ${esc(r.jurisdiction)}` : ''}${r.tier ? ` · <abbr title="${esc(TIER_LABEL[r.tier] || '')}">tier ${r.tier}</abbr>` : ''}${r.accessed ? ` · accessed ${esc(dateText(r.accessed))}` : ''}</span></li>`).join('')}</ol></section>`;
}
/** Credibility block: who wrote it, review status, dates and source count. Never invents a reviewer. */
export function editorialHtml({ updated, references = [], reviewed, kind = 'page', review }) {
  const ed = SITE.editorial || {}; const t1 = references.filter(r => r.tier === 1).length;
  const jur = [...new Set(references.map(r => r.jurisdiction).filter(j => j && j !== 'GLOBAL'))];
  const st = review?.status;
  return `<section class="editorial" aria-label="About this ${esc(kind)}"><h2>About this ${esc(kind)}</h2><dl>
    <dt>Written by</dt><dd><a href="${link.page('about')}">${esc(ed.author || SITE.name)}</a></dd>
    <dt>Review status</dt><dd>${st ? esc(REVIEW_LABEL[st] || st) : reviewed ? `Reviewed ${esc(dateText(reviewed))}` : 'Not yet independently reviewed'} · <a href="${link.page('medical-review-policy')}">policy</a></dd>
    ${updated ? `<dt>Last updated</dt><dd><time datetime="${esc(updated)}">${esc(dateText(updated))}</time></dd>` : ''}
    <dt>Sources</dt><dd>${references.length ? `${references.length} cited${t1 ? `, ${t1} from official health bodies` : ''}${jur.length ? ` · ${esc(jur.join(', '))}` : ''}` : 'Atlas data (BodyParts3D, FMA)'} · <a href="${link.page('references-policy')}">how we source</a></dd>
  </dl>${jur.length > 1 ? '<p class="small muted">Guidance and licensed information may differ by country; each fact on this page is marked with the country of its source.</p>' : ''}<p class="small muted">Educational content, not medical advice. <a href="${link.page('disclaimer')}">Disclaimer</a> · <a href="${link.page('corrections-policy')}">Report an error</a></p></section>`;
}

// ------------------------------------------------------------ clinical blocks (spec: Clinical Content Depth)
const quickBox = (rows) => `<dl class="quick">${rows.filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
function pathwayHtml(steps) {
  if (!steps || !steps.length) return '';
  const node = (s) => { const l = s.link; if (!l) return `<span>${esc(s.label)}</span>`; const href = l.type === 'organs' ? link.organPage(l.id) : l.type === 'systems' ? link.systemPage(l.id) : l.type === 'terms' ? link.term(l.id) : entityLink(l.type, l.id); return `<a href="${href}">${esc(s.label)}</a>`; };
  return `<ol class="pathway">${steps.map(s => `<li>${node(s)}</li>`).join('')}</ol>`;
}
export const sevBadge = (sev) => { const s = SEVERITY[sev] || SEVERITY.NO_SEVERITY_ASSIGNED; return `<span class="sev ${s.cls}">${esc(s.label)}</span>`; };
/** One interaction record as a compact card (spec §50): status, mechanism, why it matters, official wording, management, monitoring, sources, review. */
export function interactionCard(r, ix, clinical, { self } = {}) {
  const other = r.type === 'drug-class' || (r.type === 'therapeutic-duplication' && r.bClass && !r.b) ? `<a href="${entityLink('drug-classes', r.bClass)}">${esc(ix.classNames?.[r.bClass] || r.bClass)}</a> (class)` : r.b ? entityA(clinical, 'medications', r.b) : esc(r.bName || '');
  const a = entityA(clinical, 'medications', r.a);
  const title = self && self === r.a ? `${esc(nameOf(clinical, 'medications', r.a))} + ${other}` : self && self === r.b ? `${esc(nameOf(clinical, 'medications', r.b))} + ${a}` : `${a} + ${other}`;
  const who = (x) => x === r.a || x === r.b ? nameOf(clinical, 'medications', x) : x;
  const dir = r.perpetrator && r.victim ? `<p class="small muted">Direction: ${esc(who(r.perpetrator))} affects ${esc(who(r.victim))}.</p>` : '';
  return `<article class="ix-card"><header><h3>${title}</h3>${sevBadge(r.severity)}${r.type === 'therapeutic-duplication' ? '<span class="badge">therapeutic duplication</span>' : ''}</header>
    <dl class="ix">
      <dt>Why it matters</dt><dd>${esc(r.effect)}</dd>
      <dt>Mechanism</dt><dd>${esc(r.mechanism)}${r.mechanismNote ? ` · <span class="muted">${esc(r.mechanismNote)}</span>` : ''}</dd>
      ${r.sourceWording ? `<dt>What official information says</dt><dd>${esc(r.sourceWording)}</dd>` : ''}
      ${r.action ? `<dt>General management information</dt><dd>${esc(r.action)}</dd>` : ''}
      ${r.monitoring?.length ? `<dt>What may be monitored</dt><dd>${esc(r.monitoring.join(' · '))}</dd>` : ''}
      ${r.onset || r.population ? `<dt>Context</dt><dd>${esc([r.onset && 'Onset: ' + r.onset, r.population].filter(Boolean).join(' · '))}</dd>` : ''}
      ${r.severity !== 'NO_SEVERITY_ASSIGNED' && r.severitySource ? `<dt>Basis of the status</dt><dd class="small">${esc(r.severitySource)}</dd>` : ''}
      <dt>Sources</dt><dd>${(r.evidence || []).filter(x => safeUrl(x.url)).map(x => `<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a>${x.section ? ` <span class="muted small">(${esc(x.section)})</span>` : ''} <span class="src">${esc(x.jurisdiction || '')}</span>`).join('<br>')}</dd>
      <dt>Review</dt><dd class="small">${esc(REVIEW_LABEL[r.review] || r.review)}${r.updated ? ` · last reviewed ${esc(dateText(r.updated))}` : ''}</dd>
    </dl>${dir}</article>`;
}
/** The interactions section of a medication page (spec §73): own pair records, class records that apply to it, food, alcohol, supplements, and the checker link. */
function interactionsSection(e, ix, clinical) {
  if (!ix) return '';
  const own = (ix.byDrug?.[e.id] || []).map(id => ix.records.find(r => r.id === id)).filter(Boolean);
  const cls = ix.drugClassOf?.[e.id];
  const viaClass = cls ? ix.records.filter(r => r.bClass === cls && r.a !== e.id && !(ix.byDrug?.[e.id] || []).includes(r.id)) : [];
  const order = (r) => (SEVERITY[r.severity] || SEVERITY.NO_SEVERITY_ASSIGNED).order;
  own.sort((x, y) => order(x) - order(y)); viaClass.sort((x, y) => order(x) - order(y));
  const dup = cls && ix.duplicationClasses?.[cls];
  const food = (e.foodInteractions || []).map(f => `<tr><th scope="row">${esc(f.with)}</th><td>${esc(f.effect)}${f.mechanism ? ` <span class="muted small">(${esc(f.mechanism)})</span>` : ''}</td><td>${esc(f.management)}${src(f.source)}</td></tr>`).join('');
  const sup = (e.supplementInteractions || []).map(f => `<tr><th scope="row">${esc(f.with)}</th><td>${esc(f.effect)}</td><td>${esc(f.management || '')}${src(f.source)}</td></tr>`).join('');
  const al = e.alcohol;
  return `<h2 id="interactions">Interactions</h2>
    <p>Interactions documented in the official sources cited on each card. The list covers the medicines represented on this site and is not exhaustive. <a class="btn btn-sm" href="${link.interactions([e.id])}">Check ${esc(e.name)} against other medicines</a></p>
    ${own.length ? `<h3>Other medicines</h3><div class="ix-list">${own.map(r => interactionCard(r, ix, clinical, { self: e.id })).join('')}</div>` : '<p class="muted">No pair records for this medicine are in the sources currently represented by Anatomy Nexus. Absence from this list does not mean no interaction exists.</p>'}
    ${viaClass.length ? `<h3>As a member of ${esc(ix.classNames?.[cls] || cls)}</h3><p class="small muted">Records written for the whole ${esc((ix.classNames?.[cls] || cls).toLowerCase())} class apply to ${esc(e.name)}.</p><div class="ix-list">${viaClass.map(r => interactionCard(r, ix, clinical)).join('')}</div>` : ''}
    ${dup ? `<div class="callout info"><b>Therapeutic duplication.</b> ${esc(dup.text)}${src(dup.source)}</div>` : ''}
    ${food ? `<h3>Food and drink</h3><div class="table-wrap"><table class="kv grid-table"><thead><tr><th scope="col">With</th><th scope="col">Effect</th><th scope="col">Official advice</th></tr></thead><tbody>${food}</tbody></table></div>` : ''}
    ${al ? `<h3>Alcohol</h3><p>${esc(al.effect)}${al.reason ? ` <span class="muted">(${esc(al.reason)})</span>` : ''}</p><p>${esc(al.management)}${src(al.source)}</p>` : ''}
    ${sup ? `<h3>Herbal remedies and supplements</h3><div class="table-wrap"><table class="kv grid-table"><thead><tr><th scope="col">With</th><th scope="col">Effect</th><th scope="col">Official advice</th></tr></thead><tbody>${sup}</tbody></table></div>` : ''}`;
}
/** Universal clinical sidebar (spec §70): the facts a reader needs first, with links, plus the checker. */
function clinicalSidebar(type, e, clinical, data, ix) {
  const sysName = (id) => data.atlas.systems.find(s => s.id === id)?.name || id;
  const organName = (id) => data.content.organs.find(o => o.id === id)?.name || id;
  const row = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${v}</dd>` : '';
  const systems = (e.anatomy?.systems || []).slice(0, 3).map(id => `<a href="${link.systemPage(id)}">${esc(sysName(id))}</a>`).join(', ');
  const organs = (e.anatomy?.organs || []).slice(0, 3).map(id => `<a href="${link.organPage(id)}">${esc(organName(id))}</a>`).join(', ');
  let rows = '';
  if (type === 'medications') {
    const cls = e.links?.drugClass?.[0];
    const uses = (e.indications || []).filter(i => i.status === 'licensed' && i.condition).map(i => i.condition).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).map(id => entityA(clinical, 'conditions', id)).join(', ') || (e.links?.conditions || []).slice(0, 3).map(id => entityA(clinical, 'conditions', id)).join(', ');
    rows = row('Drug class', cls ? entityA(clinical, 'drug-classes', cls) : esc(e.class || '')) + row('Used for', uses) + row('Acts on', (e.links?.targets || []).map(id => entityA(clinical, 'targets', id)).join(', ')) + row('Body system', systems)
      + row('Related tests', (e.links?.tests || []).slice(0, 4).map(id => entityA(clinical, 'tests', id)).join(', ')) + row('Prescription status', e.otc ? esc(e.otc.UK || Object.values(e.otc)[0]) : '')
      + row('Interactions', `<a href="#interactions">${ix ? (ix.byDrug?.[e.id] || []).length + ' records on this page' : 'See below'}</a> · <a href="${link.interactions([e.id])}">Check interactions</a>`);
  } else if (type === 'tests') {
    rows = row('Type', esc(e.quick?.type || e.testType || '')) + row('Sample', esc(e.quick?.sample || e.specimen || '')) + row('Measures', (e.links?.biomarkers || []).slice(0, 6).map(id => entityA(clinical, 'biomarkers', id)).join(', ') || esc(e.quick?.measures || ''))
      + row('Used for', (e.links?.conditions || []).slice(0, 4).map(id => entityA(clinical, 'conditions', id)).join(', ')) + row('Range policy', e.rangePolicy ? esc(RANGE_POLICY[e.rangePolicy] || e.rangePolicy) : '') + row('Anatomy', organs || systems);
  } else if (type === 'biomarkers') {
    rows = row('Measured by', (e.links?.tests || []).map(id => entityA(clinical, 'tests', id)).join(', ')) + row('Units', esc(e.unit || '')) + row('Organ', organs) + row('Body system', systems)
      + row('Conditions', (e.links?.conditions || []).slice(0, 4).map(id => entityA(clinical, 'conditions', id)).join(', ')) + row('Changed by medicines', (e.backlinks?.medications || []).slice(0, 5).map(id => entityA(clinical, 'medications', id)).join(', '));
  } else if (type === 'targets') {
    rows = row('Kind', esc(e.kind || '')) + row('Acted on by', (e.links?.medications || []).map(id => entityA(clinical, 'medications', id)).join(', ')) + row('Drug classes', (e.links?.drugClasses || []).map(id => entityA(clinical, 'drug-classes', id)).join(', '))
      + row('Organ', organs) + row('Body system', systems) + row('Physiology', (e.links?.physiology || []).slice(0, 3).map(id => entityA(clinical, 'physiology', id)).join(', '));
  } else if (type === 'drug-classes') {
    rows = row('Acts on', (e.links?.targets || []).map(id => entityA(clinical, 'targets', id)).join(', ')) + row('Members here', (e.links?.medications || []).map(id => entityA(clinical, 'medications', id)).join(', ')) + row('Used for', (e.links?.conditions || []).slice(0, 4).map(id => entityA(clinical, 'conditions', id)).join(', '))
      + row('Body system', systems) + row('Interactions', `<a href="${link.interactions()}">Check interactions</a>`);
  }
  return rows ? `<section class="side-clinical" aria-label="At a glance"><h2>At a glance</h2><dl>${rows}</dl></section>` : '';
}

// ------------------------------------------------------------ templates
const T = {
  physiology(e) {
    return `${paras(e.body)}${section('Key facts', kv((e.keyFacts || []).map(k => [esc(k.label), esc(k.value)]), ['Fact', 'Value']))}`;
  },
  symptoms(e, { clinical }) {
    return `${section('What it is', para(e.what))}
      ${section('Common causes', causes(e.commonCauses))}
      ${section('Less common causes', causes(e.lessCommon))}
      ${e.links?.associated?.length ? section('Often occurs with', inlineChips(clinical, 'symptoms', e.links.associated)) : ''}
      ${e.urgent?.length ? `<div class="callout urgent"><h2>Seek urgent care if</h2>${list(e.urgent)}</div>` : ''}
      ${e.links?.conditions?.length ? section('Conditions to read about', inlineChips(clinical, 'conditions', e.links.conditions)) : ''}
      ${(e.links?.tests?.length || e.links?.imaging?.length) ? section('How it is investigated', inlineChips(clinical, 'tests', e.links.tests) + inlineChips(clinical, 'imaging', e.links.imaging)) : ''}`;
  },
  conditions(e, { clinical }) {
    return `${section('Overview', para(e.overview))}
      <div class="pair">${e.causes?.length ? `<div><h2>Causes</h2>${list(e.causes)}</div>` : ''}${e.riskFactors?.length ? `<div><h2>Risk factors</h2>${list(e.riskFactors)}</div>` : ''}</div>
      ${section('Symptoms', inlineChips(clinical, 'symptoms', e.links?.symptoms) + (e.signs?.length ? `<h3>What a clinician may find</h3>${list(e.signs)}` : ''))}
      ${section('Complications', list(e.complications))}
      ${section('Diagnosis', para(e.diagnosis) + inlineChips(clinical, 'tests', e.links?.tests) + inlineChips(clinical, 'imaging', e.links?.imaging))}
      ${section('Treatment', para(e.treatment) + inlineChips(clinical, 'procedures', e.links?.procedures) + inlineChips(clinical, 'medications', e.links?.medications))}
      ${section('Prevention', para(e.prevention))}
      ${e.seekCare ? `<div class="callout urgent"><h2>When to seek care</h2><p style="margin:0">${esc(e.seekCare)}</p></div>` : ''}`;
  },
  tests(e, { clinical }) {
    if (e.depth !== 'full') {
      return `${section('What it measures', kv((e.measures || []).map(m => [esc(m.item), esc(m.meaning)]), ['Measure', 'What it tells you']))}
        ${section('Why it is ordered', list(e.whyOrdered))}
        ${section('How it is done', para(e.how) + (e.preparation ? `<p><b>Preparation.</b> ${esc(e.preparation)}</p>` : ''))}
        ${section('Reading the result', kv((e.interpretation || []).map(i => [esc(i.finding), esc(i.meaning)]), ['Finding', 'Usual meaning']) + '<p class="small muted">Reference ranges vary by laboratory, method, age, sex and clinical context; a result is read against the person, not a table.</p>')}
        ${section('Limitations', para(e.limitations))}`;
    }
    // Full-depth test page, in the order of the specification (§16): what, why, measures, how, preparation, results, factors, cannot tell, other tests, anatomy, sources
    const q = e.quick || {};
    const compRows = (e.components || []).map(c => [`${c.biomarker ? entityA(clinical, 'biomarkers', c.biomarker) : esc(c.name)}${c.abbreviation ? ` <span class="muted small">${esc(c.abbreviation)}</span>` : ''}${c.biomarker && c.name !== nameOf(clinical, 'biomarkers', c.biomarker) ? `<div class="small muted">${esc(c.name)}</div>` : ''}`, esc(c.measures), esc(c.high || ''), esc(c.low || '')]);
    const thr = (e.thresholds || []).map(t => [esc(t.name), esc(String(t.value)), esc(t.unit), esc(t.context), `${esc(t.jurisdiction)}${src(t.source)}`]);
    return `${quickBox([['Type', esc(q.type)], ['Sample', esc(q.sample)], ['Used for', esc(q.usedFor)], ['Measures', esc(q.measures)], ['Result', esc(e.resultType || '')]])}
      ${section('Why is it used?', list(e.whyOrdered), 'why')}
      ${section('What does it measure?', (compRows.length ? table(['Component', 'What it measures', 'A higher value may be seen in', 'A lower value may be seen in'], compRows) : kv((e.measures || []).map(m => [esc(m.item), esc(m.meaning)]), ['Measure', 'What it tells you'])) + '<p class="small muted">A high or low value can be associated with several different situations; the result is interpreted with other results, symptoms, history and clinical findings.</p>', 'measures')}
      ${section('How is it performed?', para(e.how) + (e.specimen ? `<p><b>Specimen.</b> ${esc(e.specimen)}</p>` : ''), 'how')}
      ${section('Do I need to prepare?', para(e.preparation), 'preparation')}
      ${section('What do the results generally mean?', kv((e.interpretation || []).map(i => [esc(i.finding), esc(i.meaning)]), ['Finding', 'What it may indicate'])
        + `<div class="callout info"><b>${esc(RANGE_POLICY[e.rangePolicy] || 'Reference range policy')}.</b> ${esc(e.rangeNote || 'Reference ranges vary by laboratory and testing method. Interpret your result using the range supplied by the laboratory that performed the test.')}</div>`
        + (thr.length ? `<h3>Guideline thresholds</h3>${table(['Threshold', 'Value', 'Unit', 'Applies to', 'Country · source'], thr)}<p class="small muted">Clinical decision thresholds come from the named guideline and country; they are not laboratory reference intervals, and they change when guidance changes.</p>` : ''), 'results')}
      ${section('What can affect the result?', list(e.factors) + (e.medicinesNote ? `<p><b>Medicines.</b> ${esc(e.medicinesNote)}</p>` : ''), 'factors')}
      ${section('What can the test not tell you?', list(e.cannotTell) + para(e.limitations), 'limits')}
      ${(e.links?.related?.length || e.links?.imaging?.length) ? section('Other tests commonly used with it', inlineChips(clinical, 'tests', e.links?.related) + inlineChips(clinical, 'imaging', e.links?.imaging), 'with') : ''}`;
  },
  biomarkers(e, { clinical }) {
    return `<dl class="facts">${[['Also known as', esc((e.aliases || []).join(', '))], ['Units', esc(e.unit || '')], ['Measured by', (e.links?.tests || []).map(id => entityA(clinical, 'tests', id)).join(', ')]].filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
      ${section('What it is and what it does', para(e.what))}
      <div class="pair">${e.higher?.length ? `<div><h2>Why it may be higher</h2>${list(e.higher)}</div>` : ''}${e.lower?.length ? `<div><h2>Why it may be lower</h2>${list(e.lower)}</div>` : ''}</div>
      <p class="small muted">A high or low value can be associated with several different situations. The result is interpreted with other results, symptoms, history and clinical findings.</p>
      ${section('What can affect the result', list(e.factors))}
      ${e.rangeNote ? `<div class="callout info"><b>Reference ranges.</b> ${esc(e.rangeNote)}</div>` : ''}
      ${e.backlinks?.medications?.length ? section('Medicines that can change it', inlineChips(clinical, 'medications', e.backlinks.medications) + '<p class="small muted">Each medicine page lists its effect on this marker under "Effects on tests and results", with the source.</p>') : ''}`;
  },
  targets(e, { clinical }) {
    return `<dl class="facts">${[['Kind', esc(e.kind || '')], ['Also called', esc((e.aliases || []).join(', '))], ['Where it is found', esc(e.location || '')]].filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
      ${section('What it does', para(e.what))}
      ${section('Role in the body', para(e.role))}
      ${section('Medicines that act on it', inlineChips(clinical, 'medications', e.links?.medications) + (e.links?.drugClasses?.length ? `<h3>Drug classes</h3>${inlineChips(clinical, 'drug-classes', e.links.drugClasses)}` : ''))}
      ${e.links?.conditions?.length ? section('Conditions it is involved in', inlineChips(clinical, 'conditions', e.links.conditions)) : ''}`;
  },
  imaging(e) {
    const facts = [['Preparation', e.preparation], ['Duration', e.duration], ['Radiation', e.dose], ['Contrast', e.contrast], ['Risks', e.risks]].filter(([, v]) => v);
    return `${section('How it works', para(e.how))}
      ${section('What it shows', list(e.shows))}
      <div class="pair">${e.bestFor?.length ? `<div><h2>Best for</h2>${list(e.bestFor)}</div>` : ''}${e.notFor?.length ? `<div><h2>Not the right tool for</h2>${list(e.notFor)}</div>` : ''}</div>
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
      <div class="pair">${e.risks?.length ? `<div><h2>Risks</h2>${list(e.risks)}</div>` : ''}${e.alternatives?.length ? `<div><h2>Alternatives</h2>${list(e.alternatives)}</div>` : ''}</div>`;
  },
  medications(e, { clinical, data, ix }) {
    const cls = e.links?.drugClass?.[0];
    const brands = e.brands ? Object.entries(e.brands).map(([j, b]) => `<b>${esc(j)}</b> ${esc(b.join(', '))}`).join(' · ') : '';
    const otc = e.otc ? Object.entries(e.otc).map(([j, v]) => `<b>${esc(j)}</b> ${esc(v)}`).join(' · ') : '';
    const facts = [['Generic name', esc(e.name)], ['Drug class', cls ? entityA(clinical, 'drug-classes', cls) : esc(e.class || '')], ['Brand names', brands], ['Prescription status', otc], ['Routes', esc((e.routes || []).join('; '))], ['Also known as', esc((e.aliases || []).join(', '))], ['Forms', esc((e.forms || []).join('; '))], ['Onset and duration', esc(e.onset || '')], ...(e.depth === 'full' ? [] : [['Monitoring', esc(e.monitoring || '')]])].filter(([, v]) => v);
    const head = `<dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
    if (e.depth !== 'full') {
      return `${head}
        ${section('What it is used for', list(e.usedFor))}
        ${section('How it works in the body', para(e.howItWorks))}
        <div class="pair">${e.sideEffects?.common?.length ? `<div><h2>Common side effects</h2>${list(e.sideEffects.common)}</div>` : ''}${e.sideEffects?.serious?.length ? `<div><h2>Serious: seek help</h2>${list(e.sideEffects.serious)}</div>` : ''}</div>
        ${section('Cautions and interactions', list(e.cautions))}
        ${ix ? interactionsSection(e, ix, clinical) : ''}`;
    }
    // Full-depth medication page: the information architecture of the specification (§30, §96)
    const sysName = (id) => data.atlas.systems.find(s => s.id === id)?.name || id;
    const licensed = (e.indications || []).filter(i => i.status === 'licensed'); const other = (e.indications || []).filter(i => i.status !== 'licensed');
    const indRow = (i) => [`${i.condition ? entityA(clinical, 'conditions', i.condition) : esc(i.text || '')}${i.condition && i.text ? `<div class="small">${esc(i.text)}</div>` : ''}`, `${esc(INDICATION_STATUS[i.status] || i.status)}`, `${esc(i.jurisdiction || 'GLOBAL')}${src(i.source)}`, esc(i.note || '')];
    const firstUse = licensed.filter(i => i.condition).slice(0, 2).map(i => nameOf(clinical, 'conditions', i.condition)).join(', ') || licensed[0]?.text || '';
    const boxed = (e.warnings || []).filter(w => w.type === 'boxed' || w.type === 'special'); const others = (e.warnings || []).filter(w => !(w.type === 'boxed' || w.type === 'special'));
    const se = e.sideEffects || {};
    const contra = (e.contraindications || []).map(c => [esc(c.factor), esc(c.text || ''), esc(c.strength || ''), `${esc(c.jurisdiction || '')}${src(c.source)}`]);
    const mon = (e.monitoringPlan || []).map(m => [esc(m.what), esc(m.why || ''), [...(m.tests || []).map(id => entityA(clinical, 'tests', id)), ...(m.biomarkers || []).map(id => entityA(clinical, 'biomarkers', id))].join(', '), src(m.source)]);
    const pops = Object.entries(e.populations || {}).map(([k, v]) => `<dt>${esc(POP_LABEL[k] || k)}</dt><dd>${esc(v.text)}${src(v.source)}</dd>`).join('');
    const cautions = (e.conditionCautions || []).map(c => [c.condition ? entityA(clinical, 'conditions', c.condition) : esc(c.factor || ''), esc(CAUTION_TYPE[c.type] || c.type), esc(c.text), src(c.source)]);
    const labs = (e.labEffects || []).map(l => `<li>${l.biomarker ? entityA(clinical, 'biomarkers', l.biomarker) + ': ' : l.test ? entityA(clinical, 'tests', l.test) + ': ' : ''}${esc(l.effect)}${src(l.source)}</li>`).join('');
    const pk = e.pharmacokinetics || {};
    return `${head}
      ${quickBox([['Common use', esc(firstUse)], ['Drug class', cls ? entityA(clinical, 'drug-classes', cls) : esc(e.class || '')], ['Target system', (e.anatomy?.systems || []).slice(0, 3).map(id => `<a href="${link.systemPage(id)}">${esc(sysName(id))}</a>`).join(', ')], ['How it works', esc(e.understand || '')], ['Route', esc((e.routes || [])[0] || '')]])}
      ${section('Uses', (licensed.length ? `<h3>Licensed indications</h3>${table(['Use', 'Status', 'Country · source', 'Note'], licensed.map(indRow))}` : '') + (other.length ? `<h3>Other clinically supported uses</h3>${table(['Use', 'Status', 'Country · source', 'Note'], other.map(indRow))}` : '') + '<p class="small muted">Licensed indications come from the product licence in the named country; guideline-supported and off-label uses are cited to the guideline that supports them. Licensing differs between countries.</p>', 'uses')}
      ${section('How it works', para(e.understand) + para(e.howItWorks), 'how')}
      ${section('Mechanism of action', para(e.mechanismDetail) + (e.pathway?.length ? `<h3>Pathway</h3>${pathwayHtml(e.pathway)}` : ''), 'mechanism')}
      ${section('What it acts on', inlineChips(clinical, 'targets', e.links?.targets), 'targets')}
      ${section('Body systems affected', `<div class="chips chips-inline">${(e.anatomy?.systems || []).map(id => `<a class="chip" href="${link.systemPage(id)}">${esc(sysName(id))}</a>`).join('')}${(e.anatomy?.organs || []).map(id => `<a class="chip" href="${link.organPage(id)}">${esc(data.content.organs.find(o => o.id === id)?.name || id)}</a>`).join('')}</div>`, 'systems')}
      <h2 id="side-effects">Side effects</h2><div class="pair">${se.common?.length ? `<div><h3>Common</h3>${list(se.common)}</div>` : ''}${se.serious?.length ? `<div><h3>Serious: seek help</h3>${list(se.serious)}</div>` : ''}</div>${se.source ? `<p class="small muted">Source: <a href="${esc(safeUrl(se.source.url))}" target="_blank" rel="noopener noreferrer">${esc(se.source.title)}</a>. Frequencies follow the source's categories; no percentages are invented.</p>` : ''}
      ${boxed.length ? `<div class="callout urgent"><h2 id="safety">Serious safety information</h2><ul>${boxed.map(w => `<li><b>${esc(WARNING_TYPE[w.type] || w.type)}.</b> ${esc(w.text)}${src(w.source)}</li>`).join('')}</ul></div>` : ''}
      ${section('Warnings and precautions', others.length ? `<ul class="plain">${others.map(w => `<li><b>${esc(WARNING_TYPE[w.type] || w.type)}.</b> ${esc(w.text)}${src(w.source)}</li>`).join('')}</ul>` : '', 'warnings')}
      ${section('Contraindications', table(['Factor', 'Detail', 'Strength', 'Country · source'], contra) + '<p class="small muted">"Absolute" and "relative" follow the wording of the cited source; where the source does not classify, the cell is blank.</p>', 'contraindications')}
      ${interactionsSection(e, ix, clinical)}
      ${section('Monitoring', table(['What', 'Why', 'Tests and markers', 'Source'], mon), 'monitoring')}
      ${section('Special populations', pops ? `<dl class="facts pops">${pops}</dl>` : '', 'populations')}
      ${section('Condition-specific cautions', table(['Condition or factor', 'Type', 'Note', 'Source'], cautions) + '<p class="small muted">Educational summary of drug–condition cautions in the cited sources; not a personal screening.</p>', 'cautions')}
      ${section('Effects on tests and results', labs ? `<ul class="plain">${labs}</ul>` : '', 'labs')}
      ${section('Pharmacokinetics', `<dl class="facts">${[['Absorption', pk.absorption], ['Peak', pk.peak], ['Half-life', pk.halfLife], ['Metabolism', pk.metabolism], ['Elimination', pk.elimination]].filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${pk.source ? `<p class="small muted">Source: <a href="${esc(safeUrl(pk.source.url))}" target="_blank" rel="noopener noreferrer">${esc(pk.source.title)}</a>${pk.source.section ? ` (${esc(pk.source.section)})` : ''}.</p>` : ''}`, 'pharmacokinetics')}
      <p class="small muted">Dosing is intentionally not described: doses depend on the indication, the country's licence, kidney and liver function, age, weight and other medicines, and are set by a prescriber.</p>`;
  },
  'drug-classes'(e, { clinical, ix }) {
    const withPage = (e.members || []).map(n => { const id = Object.entries(clinical.names.medications).find(([, nm]) => nm.toLowerCase() === n.toLowerCase())?.[0]; return id ? `<a class="chip" href="${entityLink('medications', id)}">${esc(n)}</a>` : `<span class="chip chip-plain">${esc(n)}</span>`; });
    const classRecs = ix ? (ix.byClass?.[e.id] || []).map(id => ix.records.find(r => r.id === id)).filter(Boolean) : [];
    return `<dl class="facts">${[['Biological target', e.links?.targets?.length ? (e.links.targets.map(id => entityA(clinical, 'targets', id)).join(', ')) : esc(e.target || '')], ['Also called', esc((e.aliases || []).join(', '))]].filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
      ${section('Mechanism of action', para(e.mechanism))}
      ${section('Members of the class', withPage.length ? `<div class="chips">${withPage.join('')}</div><p class="small muted">Members with a page on this site are linked.</p>` : '')}
      ${section('Conditions treated', inlineChips(clinical, 'conditions', e.links?.conditions))}
      <div class="pair">${e.classEffects?.length ? `<div><h2>Class effects</h2>${list(e.classEffects)}</div>` : ''}${e.cautions?.length ? `<div><h2>Cautions</h2>${list(e.cautions)}</div>` : ''}</div>
      ${section('Class warnings', e.classWarnings?.length ? `<ul class="plain">${e.classWarnings.map(w => `<li>${esc(w.text)}${src(w.source)}</li>`).join('')}</ul>` : '', 'warnings')}
      ${section('Class interactions', table(['With', 'Effect', 'Source'], (e.classInteractions || []).map(i => [esc(i.with), esc(i.effect), src(i.source)])) + (classRecs.length ? `<h3>Interaction records that name this class</h3><div class="ix-list">${classRecs.map(r => interactionCard(r, ix, clinical)).join('')}</div>` : '') + (e.duplicationRule ? `<div class="callout info"><b>Therapeutic duplication.</b> ${esc(e.duplicationRule.text)}${src(e.duplicationRule.source)}</div>` : '') + `<p><a class="btn btn-sm" href="${link.interactions()}">Open the interaction checker</a></p>`, 'interactions')}`;
  },
  'first-aid'(e) {
    return `${e.emergency ? `<div class="callout urgent"><h2>Emergency</h2><p style="margin:0">Call emergency services (999 UK · 112 Europe · 911 North America) as soon as you recognise this, or have someone call while you act.</p></div>` : ''}
      ${section('Recognise it', list(e.recognise))}
      ${section('What to do', e.steps?.length ? `<ol class="steps">${e.steps.map(s => `<li><b>${esc(s.title)}</b>${esc(s.detail)}</li>`).join('')}</ol>` : '')}
      ${e.children ? `<div class="callout info"><h2>Children and infants</h2><p style="margin:0">${esc(e.children)}</p></div>` : ''}
      <div class="pair">${e.dont?.length ? `<div><h2>Do not</h2>${list(e.dont)}</div>` : ''}${e.callFor?.length ? `<div><h2>Get medical help when</h2>${list(e.callFor)}</div>` : ''}</div>
      ${section('Why it works: the anatomy', para(e.why))}`;
  },
  health(e, { data }) {
    const sysName = (id) => data.atlas.systems.find(s => s.id === id)?.name || id;
    return `${paras(e.body)}
      ${section('Effects on the body', kv((e.effects || []).map(x => [`<a href="${link.systemPage(x.system)}">${esc(sysName(x.system))}</a>`, esc(x.effect)]), ['System', 'Effect']))}
      ${section('Guidance', list(e.guidance))}`;
  },
};

// ------------------------------------------------------------- schema
const names = (clinical, type, ids, max = 12) => (ids || []).slice(0, max).map(id => nameOf(clinical, type, id));
/** The schema.org node for an entity, matched to what the page shows. */
export function entityNode(type, e, ctx) {
  const { clinical, data, ix } = ctx; const id = canonical(entityPath(type, e.id)) + '#entity';
  const base = { '@id': id, name: e.name, url: canonical(entityPath(type, e.id)), description: metaDescription(lead(e), 300), ...(e.aliases?.length ? { alternateName: e.aliases } : {}) };
  const organs = (e.anatomy?.organs || []).map(oid => data.content.organs.find(o => o.id === oid)).filter(Boolean).map(o => ({ '@type': 'AnatomicalStructure', name: o.name, url: canonical(paths.entity('anatomy', 'organ.html', o.id)) }));
  switch (type) {
    case 'conditions': return { '@type': 'MedicalCondition', ...base, ...(e.links?.symptoms?.length ? { signOrSymptom: names(clinical, 'symptoms', e.links.symptoms).map(n => ({ '@type': 'MedicalSignOrSymptom', name: n })) } : {}),
      ...(e.riskFactors?.length ? { riskFactor: e.riskFactors.slice(0, 12).map(r => ({ '@type': 'MedicalRiskFactor', name: r })) } : {}),
      ...(e.links?.tests?.length ? { typicalTest: names(clinical, 'tests', e.links.tests).map(n => ({ '@type': 'MedicalTest', name: n })) } : {}),
      ...(organs.length ? { associatedAnatomy: organs[0] } : {}), ...(e.links?.medications?.length ? { possibleTreatment: names(clinical, 'medications', e.links.medications).map(n => ({ '@type': 'Drug', name: n })) } : {}) };
    case 'symptoms': return { '@type': 'MedicalSignOrSymptom', ...base, ...(e.commonCauses?.length ? { cause: e.commonCauses.slice(0, 10).map(c => ({ '@type': 'MedicalCause', name: c.name })) } : {}) };
    case 'tests': return { '@type': 'MedicalTest', ...base, ...(e.links?.conditions?.length ? { usedToDiagnose: names(clinical, 'conditions', e.links.conditions).map(n => ({ '@type': 'MedicalCondition', name: n })) } : {}), ...(e.rangeNote ? { normalRange: e.rangeNote } : {}), ...(e.links?.biomarkers?.length ? { about: names(clinical, 'biomarkers', e.links.biomarkers).map(n => ({ '@type': 'MedicalEntity', name: n })) } : {}) };
    case 'biomarkers': return { '@type': 'MedicalEntity', ...base, ...(e.links?.tests?.length ? { subjectOf: names(clinical, 'tests', e.links.tests).map(n => ({ '@type': 'MedicalTest', name: n })) } : {}), ...(organs.length ? { associatedAnatomy: organs[0] } : {}) };
    case 'targets': return { '@type': 'MedicalEntity', ...base, ...(organs.length ? { associatedAnatomy: organs[0] } : {}) };
    case 'imaging': return { '@type': 'ImagingTest', ...base, imagingTechnique: e.name };
    case 'procedures': return { '@type': 'MedicalProcedure', ...base, ...(e.steps?.length ? { howPerformed: e.steps.join(' ') } : {}), ...(e.before?.length ? { preparation: e.before.join(' ') } : {}), ...(e.recovery ? { followup: e.recovery } : {}) };
    case 'medications': {
      const cls = e.links?.drugClass?.[0];
      const uk = e.otc?.UK || ''; const status = uk ? (/prescription only/i.test(uk) ? 'PrescriptionOnly' : 'OTC') : undefined;
      const interacting = ix ? [...new Set((ix.byDrug?.[e.id] || []).map(rid => ix.records.find(r => r.id === rid)).filter(Boolean).map(r => r.b ? nameOf(clinical, 'medications', r.b === e.id ? r.a : r.b) : r.bName || ix.classNames?.[r.bClass]).filter(Boolean))].slice(0, 20) : [];
      const info = (e.references || []).find(r => /bnf\.nice\.org\.uk\/drugs/.test(r.url) || /medlineplus\.gov\/druginfo/.test(r.url));
      return { '@type': 'Drug', ...base, nonProprietaryName: e.name, activeIngredient: e.name, ...(cls ? { drugClass: { '@type': 'DrugClass', name: nameOf(clinical, 'drug-classes', cls), url: canonical(entityPath('drug-classes', cls)) } } : {}),
        ...(e.understand || e.howItWorks ? { mechanismOfAction: e.understand || e.howItWorks } : {}), ...(e.mechanismDetail ? { clinicalPharmacology: e.mechanismDetail } : {}), ...(e.routes?.length ? { administrationRoute: e.routes } : {}), ...(e.forms?.length ? { dosageForm: e.forms } : {}),
        ...(status ? { prescriptionStatus: status } : {}), ...(info ? { prescribingInfo: info.url } : {}), ...(e.brands ? { alternateName: [...(e.aliases || []), ...Object.values(e.brands).flat()] } : {}),
        ...(e.contraindications?.length ? { contraindication: e.contraindications.map(c => ({ '@type': 'MedicalContraindication', name: c.factor })) } : {}), ...(interacting.length ? { interactingDrug: interacting.map(n => ({ '@type': 'Drug', name: n })) } : {}),
        ...(e.foodInteractions?.length ? { foodWarning: e.foodInteractions.map(f => `${f.with}: ${f.effect}`).join(' ') } : {}), ...(e.alcohol ? { alcoholWarning: e.alcohol.effect } : {}),
        ...(e.populations?.pregnancy ? { pregnancyWarning: e.populations.pregnancy.text } : {}), ...(e.populations?.lactation ? { breastfeedingWarning: e.populations.lactation.text } : {}),
        ...(e.warnings?.length ? { warning: e.warnings.filter(w => w.type === 'boxed' || w.type === 'special').map(w => w.text).join(' ') || e.warnings[0].text } : e.cautions?.length ? { warning: e.cautions.join(' ') } : {}) };
    }
    case 'drug-classes': return { '@type': 'DrugClass', ...base, ...(e.mechanism ? { mechanismOfAction: e.mechanism } : {}), ...(e.members?.length ? { drug: e.members.map(n => ({ '@type': 'Drug', name: n })) } : {}) };
    case 'first-aid': return { '@type': 'HowTo', ...base, ...(e.steps?.length ? { step: e.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.detail })) } : {}) };
    case 'physiology': return { '@type': 'MedicalEntity', ...base, ...(organs.length ? { relevantSpecialty: undefined, associatedAnatomy: organs[0] } : {}) };
    default: return { '@type': 'MedicalEntity', ...base };
  }
}

function breadcrumbsFor(type, e, typeData, clinical) {
  const TT = TYPES[type]; const crumbs = [{ name: 'Home', href: link.home() }, { name: TT.name, href: typeLink(type) }];
  const cls = type === 'medications' ? e.links?.drugClass?.[0] : null;
  if (cls) crumbs.push({ name: nameOf(clinical, 'drug-classes', cls), href: entityLink('drug-classes', cls) });
  else { const cat = (typeData.meta.categories || []).find(c => c.id === e.category); if (cat) crumbs.push({ name: cat.name, href: `${typeLink(type)}?cat=${encodeURIComponent(cat.id)}` }); }
  crumbs.push({ name: e.name });
  return crumbs;
}

// -------------------------------------------------------------- pages
const NEEDS_IX = new Set(['medications', 'drug-classes']);
export async function renderDetail(type) {
  const TT = TYPES[type]; renderHeader(type); renderFooter();
  if (PRERENDERED) return;                     // content and metadata are already in the HTML
  const main = document.getElementById('main');
  const [typeData, data, clinical, ix] = await Promise.all([loadType(type), loadData(), loadClinical(), NEEDS_IX.has(type) ? loadInteractions().catch(() => null) : null]);
  const id = pageId(); const e = id ? typeData.items[id] : null;
  if (!e) { main.innerHTML = `<h1>Not found</h1><p><a href="${typeLink(type)}">All ${esc(TT.name.toLowerCase())}</a></p>`; applyMeta({ title: `Not found | ${TT.name}`, description: '', path: paths.dir(TT.dir), robots: 'noindex' }); document.body.dataset.status = '404'; return; }
  const cat = (typeData.meta.categories || []).find(c => c.id === e.category);
  const hash = embedHash(e, data); const ctx = { data, clinical, ix };
  const groups = relatedGroups(e, clinical);
  const primaryOrgan = e.anatomy?.organs?.[0];
  const crumbs = breadcrumbsFor(type, e, typeData, clinical);
  const title = seoTitle(e.name, e.seoTitle || TT.descriptor);
  const path = entityPath(type, e.id);
  applyMeta({ title, description: e.metaDescription || lead(e), path, robots: e.seo?.index === false ? 'noindex,follow' : 'index,follow', image: hash ? link.preview(hash) : undefined, breadcrumbs: crumbs,
    jsonld: [webPageNode({ path, title, description: metaDescription(lead(e)), entityId: canonical(path) + '#entity', updated: e.updated, references: e.references }), entityNode(type, e, ctx)] });
  main.innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="eyebrow">${esc(TT.singular)}${cat ? ` · ${esc(cat.name)}` : ''}${e.emergency ? ' · <span class="badge emergency">emergency</span>' : ''}${e.depth === 'full' ? ' · <span class="badge live">full clinical detail</span>' : ''}</div>
    <h1>${esc(e.name)}</h1>
    ${e.aliases?.length ? `<p class="aliases">Also known as: ${esc(e.aliases.join(', '))}</p>` : ''}
    <p class="lead">${esc(lead(e))}</p>
    ${hash ? `<div class="actions"><a class="btn btn-primary" href="${link.explorer(hash)}">Open in the 3D explorer</a>${primaryOrgan ? `<a class="btn" href="${link.organPage(primaryOrgan)}">${esc(nameOfOrgan(data, primaryOrgan))} anatomy</a>` : ''}${type === 'medications' ? `<a class="btn" href="${link.interactions([e.id])}">Check interactions</a>` : ''}</div>${facadeHtml(hash, primaryOrgan ? nameOfOrgan(data, primaryOrgan) : e.name)}` : ''}
    <div class="two">
      <div>
        ${T[type](e, ctx)}
        ${DISCLAIMER[type] ? `<div class="callout"><b>Educational content.</b> ${esc(DISCLAIMER[type])}</div>` : ''}
      </div>
      <aside class="aside">
        ${clinicalSidebar(type, e, clinical, data, ix)}
        ${anatomyHtml(e, data, clinical)}
        ${relatedHtml(groups, clinical)}
        ${termsHtml(e.links?.terms, data)}
        ${referencesHtml(e.references)}
        ${editorialHtml({ updated: e.updated, references: e.references, review: e.review })}
      </aside>
    </div>`;
}
function nameOfOrgan(data, id) { return data.content.organs.find(o => o.id === id)?.name || id; }

function letterOf(name) { const c = name.replace(/^the /i, '').charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; }
export async function renderIndex(type) {
  const TT = TYPES[type]; renderHeader(type); renderFooter();
  const main = document.getElementById('main');
  let items = null, typeData = null, data = null, clinical = null;
  const load = async () => { if (!typeData) { [typeData, data, clinical] = await Promise.all([loadType(type), loadData(), loadClinical()]); items = Object.values(typeData.items).sort((a, b) => a.name.localeCompare(b.name)); } };
  const sysName = (id) => data.atlas.systems.find(s => s.id === id)?.name; const organName = (id) => data.content.organs.find(o => o.id === id)?.name;
  const cardHtml = (e, cats) => {
    const catName = (id) => cats.find(c => c.id === id)?.name || '';
    const tags = [catName(e.category), ...(e.anatomy?.organs || []).slice(0, 2).map(organName), ...(!e.anatomy?.organs?.length ? (e.anatomy?.systems || []).slice(0, 2).map(sysName) : [])].filter(Boolean);
    return `<a class="card" href="${entityLink(type, e.id)}"><h3>${esc(e.name)}${e.emergency ? ' <span class="badge emergency">emergency</span>' : ''}${e.depth === 'full' ? ' <span class="badge live" title="Full clinical detail">full</span>' : ''}</h3><p>${esc(trim(lead(e), 160))}</p>${tags.length ? `<div class="tags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</a>`;
  };
  const grouped = (list, cats) => {
    const by = new Map(); for (const e of list) { const L = letterOf(e.name); if (!by.has(L)) by.set(L, []); by.get(L).push(e); }
    return [...by].map(([L, es]) => `<h2 class="az-h" id="az-${L === '#' ? 'other' : L}">${L}</h2><div class="grid grid-3">${es.map(e => cardHtml(e, cats)).join('')}</div>`).join('');
  };
  if (!PRERENDERED) {
    await load();
    const cats = (typeData.meta.categories || []).map(c => ({ ...c, n: items.filter(i => i.category === c.id).length })).filter(c => c.n);
    const letters = [...new Set(items.map(e => letterOf(e.name)))];
    const priority = (typeData.meta.priority || []).map(id => typeData.items[id]).filter(Boolean);
    const systemsHere = data.atlas.systems.filter(s => items.some(e => e.anatomy?.systems?.includes(s.id) || (e.anatomy?.organs || []).some(oid => data.content.organs.find(o => o.id === oid)?.system === s.id)));
    const crumbs = [{ name: 'Home', href: link.home() }, { name: TT.name }];
    const path = paths.dir(TT.dir); const title = `${TT.name}: ${type === 'first-aid' ? 'Step-by-Step Guides' : type === 'health' ? 'Lifestyle & the Body' : 'A–Z Guide'} | ${SITE.name}`;
    applyMeta({ title, description: typeData.meta.about || TT.blurb, path, breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(typeData.meta.about || TT.blurb), type: 'CollectionPage', updated: typeData.meta.updated }),
      { '@type': 'ItemList', name: `${TT.name} on ${SITE.name}`, numberOfItems: items.length, itemListElement: items.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.name, url: canonical(entityPath(type, e.id)) })) }] });
    const tools = type === 'medications' || type === 'drug-classes' ? `<p class="actions"><a class="btn btn-primary" href="${link.interactions()}">Medication interaction checker</a><a class="btn" href="${link.compare()}">Comparisons</a></p>` : type === 'tests' || type === 'biomarkers' ? `<p class="actions"><a class="btn" href="${link.compare()}">Compare tests and markers</a></p>` : '';
    main.innerHTML = `
      ${breadcrumbHtml(crumbs)}
      <div class="section-hero"><div class="eyebrow">${esc(TT.icon)} Section · ${items.length} ${esc(TT.name.toLowerCase())}</div><h1>${esc(TT.name)}</h1><p class="lead">${esc(typeData.meta.about || TT.blurb)}</p>${tools}</div>
      ${priority.length ? `<section class="start-here"><h2>Start here</h2><div class="chips">${priority.map(e => `<a class="chip chip-lg" href="${entityLink(type, e.id)}">${esc(e.name)}</a>`).join('')}</div></section>` : ''}
      <div class="search-row"><label class="sr-only" for="q">Filter ${esc(TT.name.toLowerCase())}</label><input id="q" type="search" placeholder="Filter ${esc(TT.name.toLowerCase())}…"></div>
      <div class="filters" id="filters" role="group" aria-label="Browse by category"><button class="chip is-active" data-cat="all" type="button">All ${items.length}</button>${cats.map(c => `<button class="chip" data-cat="${esc(c.id)}" type="button">${esc(c.name)} ${c.n}</button>`).join('')}</div>
      <nav class="az" aria-label="A to Z">${letters.map(L => `<a href="#az-${L === '#' ? 'other' : L}">${L}</a>`).join('')}</nav>
      <div id="cards">${grouped(items, cats)}</div>
      ${systemsHere.length ? `<h2>Browse by body system</h2><div class="chips">${systemsHere.map(s => `<a class="chip" href="${link.systemPage(s.id)}" style="border-color:${s.color}">${esc(s.name)}</a>`).join('')}</div>` : ''}
      <h2>Other sections</h2>
      <div class="chips">${TYPE_ORDER.filter(t => t !== type).map(t => `<a class="chip" href="${typeLink(t)}">${esc(TYPES[t].icon)} ${esc(TYPES[t].name)}</a>`).join('')}<a class="chip" href="${link.page('anatomy')}">🫀 Anatomy</a><a class="chip" href="${link.search()}">Search everything</a></div>`;
  }
  // ---- interactivity (both modes): category filter and text filter re-render only the card grid
  let cat = 'all'; const q = document.getElementById('q'); const filters = document.getElementById('filters'); const cards = document.getElementById('cards'); const az = document.querySelector('.az');
  async function render() {
    await load();
    const cats = (typeData.meta.categories || []);
    const s = q.value.trim().toLowerCase();
    const list = items.filter(e => (cat === 'all' || e.category === cat) && (!s || [e.name, ...(e.aliases || []), lead(e)].join(' ').toLowerCase().includes(s)));
    const all = cat === 'all' && !s;
    if (az) az.hidden = !all;
    cards.innerHTML = list.length ? (all ? grouped(list, cats) : `<div class="grid grid-3">${list.map(e => cardHtml(e, cats)).join('')}</div>`) : '<p class="muted">Nothing matches.</p>';
  }
  filters.addEventListener('click', (ev) => { const b = ev.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; for (const x of filters.children) x.classList.toggle('is-active', x === b); render(); });
  q.addEventListener('input', render);
  const want = param('cat');
  if (want) { await load(); if ((typeData.meta.categories || []).some(c => c.id === want)) { cat = want; for (const x of filters.children) x.classList.toggle('is-active', x.dataset.cat === want); render(); } }
}
