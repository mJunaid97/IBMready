/**
 * entity.js — generic renderer for the knowledge-graph sections (physiology, symptoms, conditions,
 * tests, imaging, procedures, medications, drug classes, first aid, health). Each section is a directory
 * with a hub page (renderIndex) and a detail page (renderDetail); the entity data comes from
 * data/content/types/<type>.json, names of linked entities from data/content/clinical.json.
 *
 * Under a prerendered page (body[data-prerendered]) neither function redraws the content: the hub
 * only binds its filters and the detail page only binds the 3D facade and the header.
 */
import { renderHeader, renderFooter, loadData, loadClinical, loadType, link, entityLink, typeLink, entityPath, TYPES, TYPE_ORDER, esc, param, pageId, paths, url, ROOT, PRERENDERED, SITE, breadcrumbHtml, facadeHtml, dateText, canonical } from './site.js?v=1.1.2';
import { applyMeta, seoTitle, metaDescription, webPageNode } from './seo.js?v=1.1.2';

const SYMPTOM_REGION = { head: 'head', chest: 'thorax', abdomen: 'abdomen', back: 'thorax', arms: 'upper-limb', legs: 'lower-limb' };
const DISCLAIMER = {
  symptoms: 'This page explains what a symptom can mean so that the anatomy and the medical reasoning make sense. It cannot tell you what is causing yours: only a clinician who can examine you and order tests can do that.',
  conditions: 'Educational overview of a condition, not personal medical advice. Diagnosis and treatment decisions belong to the person\'s own clinical team.',
  medications: 'For understanding how a medicine works and what to watch for. Doses, choices and monitoring are decided by a prescriber for an individual; never start, stop or change a medicine on the basis of this page.',
  'drug-classes': 'A drug class page describes what a family of medicines has in common. Individual medicines differ in dose, licensing and interactions; treatment choices belong to a prescriber.',
  'first-aid': 'Written to follow current resuscitation and first-aid guidance, but no page replaces a certified first-aid course. When in doubt, call emergency services.',
  tests: 'Reference ranges differ between laboratories, methods, ages and sexes, and results are always read against the person, the question asked and other findings. Educational only.',
  procedures: 'A general description of how a procedure is usually done. Details vary between hospitals, surgeons and patients; the treating team explains the specifics and the consent.',
};
/** What each section's H2 sections are called, for the intro sentence of the meta description. */
const TIER_LABEL = { 1: 'official health body or guideline', 2: 'textbook, journal or academic centre', 3: 'charity or secondary resource' };

// ---------------------------------------------------------------- helpers
const para = (s) => s ? `<p>${esc(s)}</p>` : '';
const paras = (arr) => (arr || []).map(para).join('');
const list = (arr, cls = 'plain') => arr && arr.length ? `<ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
const section = (title, html, id) => html ? `<h2${id ? ` id="${id}"` : ''}>${esc(title)}</h2>${html}` : '';
const kv = (rows, [h1, h2]) => rows && rows.length ? `<div class="table-wrap"><table class="kv"><thead><tr><th scope="col">${esc(h1)}</th><th scope="col">${esc(h2)}</th></tr></thead><tbody>${rows.map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`).join('')}</tbody></table></div>` : '';
const causes = (arr) => arr && arr.length ? arr.map(c => `<div class="cause"><b>${esc(c.name)}</b><span class="muted">${esc(c.note)}</span></div>`).join('') : '';
const trim = (s, n = 150) => { s = String(s || ''); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; };
export const lead = (e) => e.summary || e.what || e.definition || e.overview || '';

function nameOf(clinical, type, id) { return clinical.names[type]?.[id] || id; }
function chips(clinical, type, ids, { max = 40 } = {}) {
  if (!ids || !ids.length) return '';
  const shown = ids.slice(0, max);
  return `<div class="chips">${shown.map(id => `<a class="chip" href="${entityLink(type, id)}">${esc(nameOf(clinical, type, id))}</a>`).join('')}${ids.length > max ? `<span class="chip">+${ids.length - max} more</span>` : ''}</div>`;
}
function inlineChips(clinical, type, ids) { return ids && ids.length ? `<div class="chips chips-inline">${ids.map(id => `<a class="chip" href="${entityLink(type, id)}">${esc(nameOf(clinical, type, id))}</a>`).join('')}</div>` : ''; }

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
export function embedHash(e) {
  const a = e.anatomy || {};
  if (a.organs?.length) return 'o=' + a.organs[0];
  if (a.structures?.length) return 's=' + a.structures.slice(0, 12).join(',');
  if (a.systems?.length) return 'sys=' + a.systems[0];
  return null;
}
export function termsHtml(ids, data) {
  if (!ids || !ids.length) return '';
  const byId = new Map(data.terms.terms.map(t => [t.id, t]));
  return `<section><h2>Terms to know</h2><div class="chips">${ids.map(id => byId.get(id)).filter(Boolean).map(t => `<a class="chip" href="${link.term(t.id)}" title="${esc(t.definition)}">${esc(t.term)}</a>`).join('')}</div></section>`;
}
/** Only plain http(s) URLs may become links; anything else (javascript:, data:, relative) is dropped. */
const safeUrl = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '';
export function referencesHtml(refs, title = 'Sources') {
  refs = (refs || []).filter(r => r && safeUrl(r.url)); if (!refs.length) return '';
  return `<section class="refs"><h2>${esc(title)}</h2><ol class="ref-list">${refs.map(r => `<li><a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a><span class="ref-meta">${esc(r.source || '')}${r.tier ? ` · <abbr title="${esc(TIER_LABEL[r.tier] || '')}">tier ${r.tier}</abbr>` : ''}${r.accessed ? ` · accessed ${esc(dateText(r.accessed))}` : ''}</span></li>`).join('')}</ol></section>`;
}
/** Credibility block: who wrote it, review status, dates and source count. Never invents a reviewer. */
export function editorialHtml({ updated, references = [], reviewed, kind = 'page' }) {
  const ed = SITE.editorial || {}; const t1 = references.filter(r => r.tier === 1).length;
  return `<section class="editorial" aria-label="About this ${esc(kind)}"><h2>About this ${esc(kind)}</h2><dl>
    <dt>Written by</dt><dd><a href="${link.page('about')}">${esc(ed.author || SITE.name)}</a></dd>
    <dt>Medical review</dt><dd>${reviewed ? `Reviewed ${esc(dateText(reviewed))}` : `Not yet independently reviewed`} · <a href="${link.page('medical-review-policy')}">policy</a></dd>
    ${updated ? `<dt>Last updated</dt><dd><time datetime="${esc(updated)}">${esc(dateText(updated))}</time></dd>` : ''}
    <dt>Sources</dt><dd>${references.length ? `${references.length} cited${t1 ? `, ${t1} from official health bodies` : ''}` : 'Atlas data (BodyParts3D, FMA)'} · <a href="${link.page('references-policy')}">how we source</a></dd>
  </dl><p class="small muted">Educational content, not medical advice. <a href="${link.page('disclaimer')}">Disclaimer</a> · <a href="${link.page('corrections-policy')}">Report an error</a></p></section>`;
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
  tests(e) {
    return `${section('What it measures', kv((e.measures || []).map(m => [esc(m.item), esc(m.meaning)]), ['Measure', 'What it tells you']))}
      ${section('Why it is ordered', list(e.whyOrdered))}
      ${section('How it is done', para(e.how) + (e.preparation ? `<p><b>Preparation.</b> ${esc(e.preparation)}</p>` : ''))}
      ${section('Reading the result', kv((e.interpretation || []).map(i => [esc(i.finding), esc(i.meaning)]), ['Finding', 'Usual meaning']) + '<p class="small muted">Reference ranges vary by laboratory, method, age, sex and clinical context; a result is read against the person, not a table.</p>')}
      ${section('Limitations', para(e.limitations))}`;
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
  medications(e, { clinical }) {
    const cls = e.links?.drugClass?.[0];
    const facts = [['Generic name', e.name], ['Drug class', cls ? `<a href="${entityLink('drug-classes', cls)}">${esc(nameOf(clinical, 'drug-classes', cls))}</a>` : esc(e.class || '')], ['Also known as', esc((e.aliases || []).join(', '))], ['Forms', esc((e.forms || []).join('; '))], ['Onset and duration', esc(e.onset || '')], ['Monitoring', esc(e.monitoring || '')]].filter(([, v]) => v);
    return `<dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
      ${section('What it is used for', list(e.usedFor))}
      ${section('How it works in the body', para(e.howItWorks))}
      <div class="pair">${e.sideEffects?.common?.length ? `<div><h2>Common side effects</h2>${list(e.sideEffects.common)}</div>` : ''}${e.sideEffects?.serious?.length ? `<div><h2>Serious: seek help</h2>${list(e.sideEffects.serious)}</div>` : ''}</div>
      ${section('Cautions and interactions', list(e.cautions))}`;
  },
  'drug-classes'(e, { clinical }) {
    const withPage = (e.members || []).map(n => { const id = Object.entries(clinical.names.medications).find(([, nm]) => nm.toLowerCase() === n.toLowerCase())?.[0]; return id ? `<a class="chip" href="${entityLink('medications', id)}">${esc(n)}</a>` : `<span class="chip chip-plain">${esc(n)}</span>`; });
    return `<dl class="facts">${[['Biological target', e.target], ['Also called', (e.aliases || []).join(', ')]].filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${section('Mechanism of action', para(e.mechanism))}
      ${section('Members of the class', withPage.length ? `<div class="chips">${withPage.join('')}</div><p class="small muted">Members with a page on this site are linked.</p>` : '')}
      ${section('Conditions treated', inlineChips(clinical, 'conditions', e.links?.conditions))}
      <div class="pair">${e.classEffects?.length ? `<div><h2>Class effects</h2>${list(e.classEffects)}</div>` : ''}${e.cautions?.length ? `<div><h2>Cautions</h2>${list(e.cautions)}</div>` : ''}</div>`;
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
  const { clinical, data } = ctx; const id = canonical(entityPath(type, e.id)) + '#entity';
  const base = { '@id': id, name: e.name, url: canonical(entityPath(type, e.id)), description: metaDescription(lead(e), 300), ...(e.aliases?.length ? { alternateName: e.aliases } : {}) };
  const organs = (e.anatomy?.organs || []).map(oid => data.content.organs.find(o => o.id === oid)).filter(Boolean).map(o => ({ '@type': 'AnatomicalStructure', name: o.name, url: canonical(paths.entity('anatomy', 'organ.html', o.id)) }));
  switch (type) {
    case 'conditions': return { '@type': 'MedicalCondition', ...base, ...(e.links?.symptoms?.length ? { signOrSymptom: names(clinical, 'symptoms', e.links.symptoms).map(n => ({ '@type': 'MedicalSignOrSymptom', name: n })) } : {}),
      ...(e.riskFactors?.length ? { riskFactor: e.riskFactors.slice(0, 12).map(r => ({ '@type': 'MedicalRiskFactor', name: r })) } : {}),
      ...(e.links?.tests?.length ? { typicalTest: names(clinical, 'tests', e.links.tests).map(n => ({ '@type': 'MedicalTest', name: n })) } : {}),
      ...(organs.length ? { associatedAnatomy: organs[0] } : {}), ...(e.links?.medications?.length ? { possibleTreatment: names(clinical, 'medications', e.links.medications).map(n => ({ '@type': 'Drug', name: n })) } : {}) };
    case 'symptoms': return { '@type': 'MedicalSignOrSymptom', ...base, ...(e.commonCauses?.length ? { cause: e.commonCauses.slice(0, 10).map(c => ({ '@type': 'MedicalCause', name: c.name })) } : {}) };
    case 'tests': return { '@type': 'MedicalTest', ...base, ...(e.links?.conditions?.length ? { usedToDiagnose: names(clinical, 'conditions', e.links.conditions).map(n => ({ '@type': 'MedicalCondition', name: n })) } : {}) };
    case 'imaging': return { '@type': 'ImagingTest', ...base, imagingTechnique: e.name };
    case 'procedures': return { '@type': 'MedicalProcedure', ...base, ...(e.steps?.length ? { howPerformed: e.steps.join(' ') } : {}), ...(e.before?.length ? { preparation: e.before.join(' ') } : {}), ...(e.recovery ? { followup: e.recovery } : {}) };
    case 'medications': { const cls = e.links?.drugClass?.[0]; return { '@type': 'Drug', ...base, nonProprietaryName: e.name, ...(cls ? { drugClass: { '@type': 'DrugClass', name: nameOf(clinical, 'drug-classes', cls), url: canonical(entityPath('drug-classes', cls)) } } : {}), ...(e.howItWorks ? { mechanismOfAction: e.howItWorks } : {}), ...(e.forms?.length ? { dosageForm: e.forms } : {}), ...(e.cautions?.length ? { warning: e.cautions.join(' ') } : {}) }; }
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
export async function renderDetail(type) {
  const TT = TYPES[type]; renderHeader(type); renderFooter();
  if (PRERENDERED) return;                     // content and metadata are already in the HTML
  const main = document.getElementById('main');
  const [typeData, data, clinical] = await Promise.all([loadType(type), loadData(), loadClinical()]);
  const id = pageId(); const e = id ? typeData.items[id] : null;
  if (!e) { main.innerHTML = `<h1>Not found</h1><p><a href="${typeLink(type)}">All ${esc(TT.name.toLowerCase())}</a></p>`; applyMeta({ title: `Not found | ${TT.name}`, description: '', path: paths.dir(TT.dir), robots: 'noindex' }); document.body.dataset.status = '404'; return; }
  const cat = (typeData.meta.categories || []).find(c => c.id === e.category);
  const hash = embedHash(e); const ctx = { data, clinical };
  const groups = relatedGroups(e, clinical);
  const primaryOrgan = e.anatomy?.organs?.[0];
  const crumbs = breadcrumbsFor(type, e, typeData, clinical);
  const title = seoTitle(e.name, e.seoTitle || TT.descriptor);
  const path = entityPath(type, e.id);
  applyMeta({ title, description: e.metaDescription || lead(e), path, robots: e.seo?.index === false ? 'noindex,follow' : 'index,follow', image: hash ? link.preview(hash) : undefined, breadcrumbs: crumbs,
    jsonld: [webPageNode({ path, title, description: metaDescription(lead(e)), entityId: canonical(path) + '#entity', updated: e.updated, references: e.references }), entityNode(type, e, ctx)] });
  main.innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="eyebrow">${esc(TT.singular)}${cat ? ` · ${esc(cat.name)}` : ''}${e.emergency ? ' · <span class="badge emergency">emergency</span>' : ''}</div>
    <h1>${esc(e.name)}</h1>
    ${e.aliases?.length ? `<p class="aliases">Also known as: ${esc(e.aliases.join(', '))}</p>` : ''}
    <p class="lead">${esc(lead(e))}</p>
    ${hash ? `<div class="actions"><a class="btn btn-primary" href="${link.explorer(hash)}">Open in the 3D explorer</a>${primaryOrgan ? `<a class="btn" href="${link.organPage(primaryOrgan)}">${esc(nameOfOrgan(data, primaryOrgan))} anatomy</a>` : ''}</div>${facadeHtml(hash, primaryOrgan ? nameOfOrgan(data, primaryOrgan) : e.name)}` : ''}
    <div class="two">
      <div>
        ${T[type](e, ctx)}
        ${DISCLAIMER[type] ? `<div class="callout"><b>Educational content.</b> ${esc(DISCLAIMER[type])}</div>` : ''}
      </div>
      <aside class="aside">
        ${anatomyHtml(e, data, clinical)}
        ${relatedHtml(groups, clinical)}
        ${termsHtml(e.links?.terms, data)}
        ${referencesHtml(e.references)}
        ${editorialHtml({ updated: e.updated, references: e.references })}
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
    return `<a class="card" href="${entityLink(type, e.id)}"><h3>${esc(e.name)}${e.emergency ? ' <span class="badge emergency">emergency</span>' : ''}</h3><p>${esc(trim(lead(e), 160))}</p>${tags.length ? `<div class="tags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</a>`;
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
    main.innerHTML = `
      ${breadcrumbHtml(crumbs)}
      <div class="section-hero"><div class="eyebrow">${esc(TT.icon)} Section · ${items.length} ${esc(TT.name.toLowerCase())}</div><h1>${esc(TT.name)}</h1><p class="lead">${esc(typeData.meta.about || TT.blurb)}</p></div>
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
