/**
 * checker.js — the Drug Interaction Checker page (/tools/drug-interaction-checker/).
 *
 * The user adds two or more medicines by generic name, brand, active ingredient or combination product through an
 * accessible combobox; every entry is resolved to canonical ingredients and every unique pair is checked by the engine
 * (site/interaction-engine.js) against the sourced records in data/content/interactions.json. The page shows a summary,
 * the pairs grouped by display severity (highest first), duplicate ingredients and therapeutic duplication, the pairs
 * with no known interaction in the cautious wording of the specification, the related anatomy, tests and classes of the
 * knowledge graph, the provenance of the data and the disclaimers. It never says "safe", never invents a result, and if
 * the data cannot be loaded it says so rather than showing anything.
 *
 * Privacy: the selected medicines live in the page URL (?drugs=) so a check can be shared, and nowhere else; analytics
 * events carry counts and severity tiers only, never medicine names.
 */
import { renderHeader, renderFooter, loadInteractions, link, entityLink, typeLink, esc, param, paths, PRERENDERED, SITE, dateText, canonical } from './site.js?v=1.3.0';
import { applyMeta, webPageNode, metaDescription } from './seo.js?v=1.3.0';
import { interactionBody, tierBadge, sevBadge, graphLink, referencesHtml, src, REVIEW_LABEL } from './entity.js?v=1.3.0';
import { createEngine, TIERS, TIER_ORDER, NONE_WORDING, LIMITS } from './interaction-engine.js?v=1.3.0';

const COPY = {
  trust: 'Interaction information is educational and does not replace advice from a doctor, pharmacist, or other qualified healthcare professional.',
  before: 'This checker cannot account for your doses, medical history, kidney or liver function, pregnancy, allergies or every product on the market. It shows what the cited official sources say about a pair of medicines; it does not decide whether a combination is right for you.',
  none: 'A result showing no known interaction does not guarantee that a combination is safe for every person.',
  disclaimer: 'This checker is for education and general information only. It may not include every possible interaction and cannot account for your full medical history, doses, laboratory results, allergies, pregnancy status, kidney or liver function, or other individual factors. Do not start, stop, or change a medicine based only on this tool. Ask a doctor or pharmacist for personal medication advice.',
  severe: 'Do not make medication changes on your own. Contact a qualified healthcare professional or pharmacist for advice about this combination.',
  unavailable: 'Interaction data is temporarily unavailable. Please try again later.',
};
const EXAMPLES = [['Warfarin + Ibuprofen', ['warfarin', 'ibuprofen']], ['Losartan + Ibuprofen', ['losartan', 'ibuprofen']], ['Amlodipine + Simvastatin', ['amlodipine', 'simvastatin']], ['Lisinopril + Losartan', ['lisinopril', 'losartan']]];
const QUICK = ['amlodipine', 'losartan', 'metformin', 'warfarin', 'ibuprofen'];
const KIND_LABEL = { medication: 'Medication', product: 'Product', substance: 'Substance' };
const RELATED_GROUPS = [['medications', 'Medications'], ['drug-classes', 'Drug classes'], ['organ', 'Anatomy'], ['system', 'Body systems'], ['physiology', 'Physiology'], ['tests', 'Tests'], ['biomarkers', 'Biomarkers']];
const track = (name, params = {}) => { try { if (typeof window.gtag === 'function') window.gtag('event', name, params); } catch {} };

renderHeader('checker'); renderFooter();
const path = paths.dir('tools/drug-interaction-checker');
const title = `Drug Interaction Checker | ${SITE.name}`;
const description = 'Check medicines for known drug interactions and understand severity, mechanisms, monitoring considerations, and related clinical information.';
if (!PRERENDERED) {
  const app = { '@type': 'WebApplication', '@id': canonical(path) + '#app', name: 'Drug Interaction Checker', url: canonical(path), applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' }, description: metaDescription(description), publisher: { '@id': canonical('') + '#organization' } };
  applyMeta({ title, description, path, robots: 'index,follow', type: 'website', breadcrumbs: [{ name: 'Home', href: link.home() }, { name: 'Clinical tools', href: link.tools() }, { name: 'Drug Interaction Checker' }],
    jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'MedicalWebPage', updated: SITE.updated }), app] });
}

const root = document.getElementById('checker');
const state = { selected: [], checked: false, engine: null, ix: null, results: [], active: -1 };
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ shell
function shell() {
  root.innerHTML = `
  <div class="callout urgent"><b>Before you use this tool.</b> ${esc(COPY.before)}</div>
  <section class="chk-card" aria-labelledby="chk-add-h">
    <h2 id="chk-add-h">Add your medications</h2>
    <p class="muted" id="chk-help">Search by generic name, brand name, or active ingredient. Add at least two medications to begin.</p>
    <div class="chk-input">
      <label for="chk-q">Search a medication or active ingredient</label>
      <input id="chk-q" type="text" role="combobox" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search a medication or active ingredient" aria-autocomplete="list" aria-expanded="false" aria-controls="chk-sugg" aria-describedby="chk-help chk-msg" enterkeyhint="done">
      <ul class="hsearch-results chk-sugg" id="chk-sugg" role="listbox" aria-label="Matching medicines" hidden></ul>
    </div>
    <p class="chk-msg" id="chk-msg" role="status" aria-live="polite"></p>
    <div class="chk-quick" id="chk-quick"><span>Examples:</span>${QUICK.map(id => `<button type="button" class="chip" data-add="${esc(id)}">${esc(cap(id))}</button>`).join('')}</div>
    <div class="chk-chips" id="chk-chips" aria-label="Selected medications"></div>
    <div class="chk-actions">
      <button type="button" class="btn btn-primary" id="chk-check">Check interactions</button>
      <button type="button" class="btn" id="chk-clear">Clear all</button>
      <span class="small muted" id="chk-count"></span>
    </div>
  </section>
  <div class="sr-only" id="chk-status" aria-live="polite" aria-atomic="true"></div>
  <div id="chk-results"></div>`;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ------------------------------------------------------------- selection
function entryFor(hit) { return { kind: hit.kind, id: hit.id, label: hit.label }; }
function add(hit, { announce = true } = {}) {
  if (!hit) return false;
  const d = state.engine.describe(entryFor(hit));
  if (!d) { message(`We could not match “${hit.label || hit.id}” to our drug database.`, true); return false; }
  const dup = state.selected.find(s => s.kind === hit.kind && s.id === hit.id);
  if (dup) { message(`${d.label} is already in your list${dup.label !== d.label ? ` as ${dup.label}` : ''}: these entries contain the same active ingredient.`, true); return false; }
  state.selected.push({ kind: hit.kind, id: hit.id, label: hit.label, name: d.name });
  track('drug_added', { kind: hit.kind, count: state.selected.length });
  message('');
  renderSelected();
  if (announce) status(`Added ${d.label}${d.name !== d.label ? ` (${d.name})` : ''}. ${state.selected.length} selected.`);
  if (state.checked) runCheck({ focus: false });
  return true;
}
function remove(i) {
  const [gone] = state.selected.splice(i, 1);
  track('drug_removed', { count: state.selected.length });
  renderSelected(); status(`Removed ${gone.label}. ${state.selected.length} selected.`);
  if (state.checked) { if (state.selected.length >= LIMITS.min) runCheck({ focus: false }); else { state.checked = false; $('chk-results').innerHTML = ''; renderEmpty(); } }
  const chips = document.querySelectorAll('#chk-chips .chk-x'); (chips[Math.min(i, chips.length - 1)] || $('chk-q')).focus();
}
function renderSelected() {
  const el = $('chk-chips');
  el.innerHTML = state.selected.map((s, i) => `<span class="chk-chip"><span>${esc(s.label)}${s.name !== s.label ? ` <span class="of">${esc(s.name)}</span>` : ''}${s.kind !== 'medication' ? ` <span class="of">${esc(KIND_LABEL[s.kind].toLowerCase())}</span>` : ''}</span><button type="button" class="chk-x" data-i="${i}" aria-label="Remove ${esc(s.label)}">×</button></span>`).join('');
  $('chk-count').textContent = state.selected.length ? `${state.selected.length} selected${state.selected.length < LIMITS.min ? ` · add ${LIMITS.min - state.selected.length} more` : ''}` : '';
  // shareable state, ids only (slugs), literal commas as in /tools/drug-interaction-checker/?drugs=amlodipine,losartan
  const u = new URL(location.href); u.searchParams.delete('drug'); u.searchParams.delete('drugs');
  u.search = state.selected.length ? `?${state.selected.length === 1 ? 'drug' : 'drugs'}=${state.selected.map(s => encodeURIComponent(s.id)).join(',')}` : '';
  history.replaceState(null, '', u);
  if (!state.checked) renderEmpty();
}
function message(text, error = false) { const m = $('chk-msg'); m.textContent = text; m.classList.toggle('is-error', !!(text && error)); $('chk-q').setAttribute('aria-invalid', text && error ? 'true' : 'false'); }
function status(text) { const s = $('chk-status'); s.textContent = ''; setTimeout(() => { s.textContent = text; }, 30); }

// ------------------------------------------------------------- combobox
function bindCombobox() {
  const q = $('chk-q'), list = $('chk-sugg');
  const close = () => { list.hidden = true; state.active = -1; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); };
  const render = () => {
    list.innerHTML = state.results.length ? state.results.map((r, i) => `<li role="option" id="chk-opt-${i}" aria-selected="${i === state.active}" data-i="${i}"><span class="r-name">${esc(r.label)}${r.fuzzy ? ' <span class="muted small">(did you mean?)</span>' : ''}</span><span class="r-sub">${esc(sub(r))}</span><span class="r-type">${esc(KIND_LABEL[r.kind] || r.kind)}</span></li>`).join('')
      : `<li class="r-empty" role="presentation">${esc(state.hint ? `${state.hint.label} is a drug class. Add a specific medicine${state.hint.members?.length ? `, for example ${state.hint.members.slice(0, 4).join(', ').toLowerCase()}` : ''}.` : 'No matches among the medicines, brands and products on this site. Try a generic name or another spelling.')}</li>`;
    list.hidden = false; q.setAttribute('aria-expanded', 'true');
    if (state.active >= 0) q.setAttribute('aria-activedescendant', `chk-opt-${state.active}`); else q.removeAttribute('aria-activedescendant');
  };
  const sub = (r) => r.kind === 'product' ? `Combination: ${r.ings || ''}` : r.alias === 'brand' ? `Brand of ${r.of.toLowerCase()}${r.cls ? ` · ${r.cls}` : ''}` : r.alias ? `${r.of}${r.cls ? ` · ${r.cls}` : ''}` : r.kind === 'substance' ? (r.cls ? `${r.cls} · named in interaction records; no page on this site yet` : 'Named in interaction records; no page on this site yet') : r.cls || 'Medication';
  q.addEventListener('input', () => {
    message('');
    const t = q.value.trim(); if (!t) { close(); return; }
    const { results, hint } = state.engine.suggest(t, 8); state.results = results; state.hint = hint; state.active = -1; render();
  });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && state.results.length) { e.preventDefault(); if (list.hidden) render(); state.active = (state.active + 1) % state.results.length; render(); }
    else if (e.key === 'ArrowUp' && state.results.length) { e.preventDefault(); state.active = (state.active - 1 + state.results.length) % state.results.length; render(); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { close(); }
    else if (e.key === 'Tab') close();
  });
  const submit = () => {
    const t = q.value.trim(); if (!t) return;
    const hit = state.active >= 0 ? state.results[state.active] : state.results[0] || state.engine.resolve(t);
    if (!hit || !['medication', 'product', 'substance'].includes(hit.kind)) {
      message(`We could not match “${t}” to our drug database. Try a generic name, a brand name or another spelling.`, true); track('checker_error', { code: 'unmatched' }); close(); return;
    }
    if (add(hit)) { q.value = ''; close(); }
  };
  list.addEventListener('mousedown', (e) => { const li = e.target.closest('li[data-i]'); if (!li) return; e.preventDefault(); if (add(state.results[+li.dataset.i])) { q.value = ''; close(); } q.focus(); });
  q.addEventListener('blur', () => setTimeout(close, 150));
  $('chk-quick').addEventListener('click', (e) => { const b = e.target.closest('[data-add]'); if (!b) return; add(state.engine.resolve(b.dataset.add)); q.focus(); });
  $('chk-chips').addEventListener('click', (e) => { const b = e.target.closest('.chk-x'); if (b) remove(+b.dataset.i); });
  $('chk-check').addEventListener('click', () => { if (state.selected.length < LIMITS.min) { message('Add at least two medications to check for interactions.', true); track('checker_error', { code: 'too-few' }); q.focus(); return; } runCheck({ focus: true }); });
  $('chk-clear').addEventListener('click', () => { state.selected = []; state.checked = false; $('chk-results').innerHTML = ''; message(''); renderSelected(); status('Cleared the list.'); q.focus(); });
  $('chk-results').addEventListener('click', (e) => {
    const ex = e.target.closest('[data-example]'); if (ex) { e.preventDefault(); state.selected = []; for (const id of ex.dataset.example.split(',')) add(state.engine.resolve(id), { announce: false }); runCheck({ focus: true }); return; }
    const a = e.target.closest('a[data-source]'); if (a) track('interaction_source_opened');
    const rel = e.target.closest('a[data-related]'); if (rel) track('related_entity_opened', { type: rel.dataset.related });
  });
  $('chk-results').addEventListener('toggle', (e) => { if (e.target.matches('details') && e.target.open) track('interaction_result_expanded'); }, true);
}

// --------------------------------------------------------------- results
function renderEmpty() {
  if (state.checked) return;
  $('chk-results').innerHTML = `<section class="chk-empty" aria-labelledby="chk-empty-h">
    <h2 id="chk-empty-h">Check two or more medications</h2>
    <p class="muted">Add the medicines you want to compare. We’ll review each medication pair for known interactions in our available clinical data.</p>
    <p class="small"><b>Try an example</b></p>
    <div class="chk-examples">${EXAMPLES.map(([label, ids]) => `<a class="chip chip-lg" href="${link.checker(ids)}" data-example="${esc(ids.join(','))}">${esc(label)}</a>`).join('')}</div>
    <p class="small muted">Examples are pairs with a sourced record in the current dataset.</p>
  </section>`;
}
function runCheck({ focus }) {
  track('interaction_check_started', { medications: state.selected.length });
  const res = state.engine.check(state.selected);
  state.checked = true;
  $('chk-results').innerHTML = resultsHtml(res);
  document.body.dataset.checked = '1';
  const s = res.summary; const parts = TIER_ORDER.filter(t => s.byTier[t]).map(t => `${s.byTier[t]} ${TIERS[t].label.toLowerCase()}`);
  if (s.duplications) parts.push(`${s.duplications} duplication warning${s.duplications === 1 ? '' : 's'}`);
  if (s.none) parts.push(`${s.none} with no known interaction identified`);
  status(`Checked ${s.medications} medications and ${s.pairsChecked} pair${s.pairsChecked === 1 ? '' : 's'}: ${parts.join(', ') || 'no results'}.`);
  track('interaction_check_completed', { medications: s.medications, pairs: s.pairsChecked, top_tier: s.topTier, status: res.status });
  if (focus) { const h = $('chk-results-h'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: false }); } }
}
function resultsHtml(res) {
  const s = res.summary; const t = (k) => TIERS[k];
  const pairs = (n) => `<span><b>${n}</b> pair${n === 1 ? '' : 's'}</span>`;
  const tierRows = TIER_ORDER.filter(k => s.byTier[k] || t(k).order <= 3).map(k => `<li class="${s.byTier[k] ? '' : 'is-zero'}">${tierBadge(k, { title: false })}${pairs(s.byTier[k])}</li>`).join('')
    + (s.duplications ? `<li>${tierBadge('duplication')}${pairs(s.duplications)}</li>` : '')
    + `<li class="${s.none ? '' : 'is-zero'}">${tierBadge('none')}${pairs(s.none)}</li>`;
  const warn = res.warnings.filter(w => w.code !== 'too-few').map(w => `<div class="callout ${w.code === 'unknown-entry' ? 'urgent' : 'info'}"><b>${esc(w.code === 'limited-coverage' ? 'Coverage limited.' : w.code === 'soft-limit' ? 'Long list.' : 'Not matched.')}</b> ${esc(w.message)}${w.code === 'unknown-entry' ? ' Search again above.' : ''}</div>`).join('');
  const severe = s.topTier === 'contraindicated' || s.topTier === 'major' ? `<div class="callout urgent" role="note"><b>${esc(s.topTier === 'contraindicated' ? 'A combination that official information says to avoid.' : 'A combination official information restricts to specialist supervision or close monitoring.')}</b> ${esc(COPY.severe)}</div>` : '';
  const groups = TIER_ORDER.filter(k => s.byTier[k]).map(k => `<section class="chk-group" aria-labelledby="g-${k}"><h2 id="g-${k}">${tierBadge(k)}<span class="badge">${s.byTier[k]} pair${s.byTier[k] === 1 ? '' : 's'}</span></h2><p class="small muted">${esc(t(k).meaning)}</p><div class="ix-list">${res.pairs.filter(p => p.tier === k).map(p => pairCard(p, res)).join('')}</div></section>`).join('');
  const dups = res.pairs.filter(p => p.duplications.length);
  const dupSection = dups.length ? `<section class="chk-group" aria-labelledby="g-dup"><h2 id="g-dup">${tierBadge('duplication')}<span class="badge">${dups.length} pair${dups.length === 1 ? '' : 's'}</span></h2><p class="small muted">The same active ingredient from two entries, or two members of a class whose official information advises against combining them.</p><div class="ix-list">${dups.map(p => dupCard(p, res)).join('')}</div></section>` : '';
  const none = res.noKnownInteractionPairs.length ? `<section class="chk-group chk-none" aria-labelledby="g-none"><h2 id="g-none">${tierBadge('none')}<span class="badge">${res.noKnownInteractionPairs.length} pair${res.noKnownInteractionPairs.length === 1 ? '' : 's'}</span></h2>
    <p><b>${esc(NONE_WORDING.title)}.</b> No interaction was identified for ${res.noKnownInteractionPairs.length === 1 ? 'this pair' : 'these pairs'} in the available data. ${esc(NONE_WORDING.text)}</p>
    <ul>${res.noKnownInteractionPairs.map(p => `<li>${esc(p.a)} + ${esc(p.b)}</li>`).join('')}</ul></section>` : '';
  const related = relatedHtml(res);
  const meta = res.sourceMetadata;
  const about = `<section class="chk-about" aria-labelledby="chk-about-h"><h2 id="chk-about-h">Data used for this check</h2>
    <dl class="facts"><dt>Source</dt><dd>${esc(meta.provider)}: ${esc(Object.keys(meta.publishers).join(', '))}. Each result links to the document and section it was taken from.</dd>
    <dt>Records</dt><dd>${meta.recordCount} sourced interaction records, data version ${esc(meta.dataVersion)}, last updated <time datetime="${esc(meta.lastUpdated)}">${esc(dateText(meta.lastUpdated))}</time></dd>
    <dt>Review status</dt><dd>${esc(Object.keys(meta.reviewStatuses).map(k => REVIEW_LABEL[k] || k).join('; '))} · <a href="${link.page('medical-review-policy')}">medical review policy</a></dd>
    <dt>Scope</dt><dd>Medicine-to-medicine interactions only. Food, alcohol and supplement interactions are listed on each <a href="${typeLink('medications')}">medication page</a>; disease, pregnancy, allergy and laboratory interactions are not checked.</dd></dl>
    <p class="small muted">Interaction databases differ from one another, and individual risk depends on dose, route, age, kidney and liver function, other conditions and other medicines. <a href="#data">About our interaction data</a> · <a href="${link.methodology()}">Learn how Anatomy Nexus reviews medication information</a>.</p></section>`;
  return `<section class="chk-summary" aria-labelledby="chk-results-h">
    <h2 id="chk-results-h">Interaction results</h2>
    <p class="muted">We checked every medication pair in your list using the available interaction data.</p>
    <div class="chk-stats"><div class="stat"><b>${s.medications}</b><span>medication${s.medications === 1 ? '' : 's'} checked</span></div><div class="stat"><b>${s.pairsChecked}</b><span>medication pair${s.pairsChecked === 1 ? '' : 's'} reviewed</span></div>${res.status === 'partial' ? '<div class="stat"><b>Partial</b><span>coverage limited, see below</span></div>' : ''}</div>
    <ul class="chk-tiers" aria-label="Results by severity">${tierRows}</ul>
    <p class="small muted">${esc(COPY.none)} Severity is the display tier of the state supported by the cited source; <a href="${link.methodology()}#severity">how the states are mapped</a>.</p>${warn}</section>
    ${severe}${dupSection}${groups}${none}${related}${about}
    ${res.sources.length ? referencesHtml(res.sources, 'References') : ''}
    <div class="callout"><b>Medical information notice:</b> ${esc(COPY.disclaimer)}</div>`;
}
function pairTitle(p) { return `${esc(p.aName)} + ${esc(p.bName)}`; }
/** What each entry of the pair stands for: a combination product's ingredients, or the generic behind a brand or alias. */
function ingredientNote(p, res) {
  const notes = [res.medications[p.a], res.medications[p.b]].map(m => m.kind === 'product' ? `Interaction analysis includes the active ingredients of ${esc(m.label)}: ${esc(m.ingredients.map(i => i.name.toLowerCase()).join(' and '))}.`
    : m.alias ? `${esc(m.label)} is ${esc(m.name)}.` : '').filter(Boolean);
  return notes.length ? `<p class="ingredients small muted">${notes.join(' ')}</p>` : '';
}
function pairCard(p, res) {
  const [first, ...rest] = p.interactions;
  const rec = (r, open) => `<details class="ix-more"${open ? ' open' : ''}><summary>${tierBadge(r.tier, { short: true })} ${sevBadge(r.severity)} <span class="ix-more-title">${esc(recordTitle(r))}</span></summary>${interactionBody(r, { via: r })}</details>`;
  return `<article class="ix-card pair-card" id="pair-${p.a}-${p.b}"><header><h3>${pairTitle(p)}</h3>${tierBadge(p.tier)}${sevBadge(first.severity)}</header>
    ${ingredientNote(p, res)}
    ${first.via === 'class' ? `<p class="small muted">${esc(recordTitle(first))}</p>` : ''}
    ${interactionBody(first, { via: first })}
    ${rest.length ? `<div class="ix-rest"><p class="small"><b>${rest.length} more record${rest.length === 1 ? '' : 's'} for this pair</b></p>${rest.map(r => rec(r, false)).join('')}</div>` : ''}
  </article>`;
}
function recordTitle(r) {
  const a = state.engine.medName(r.a);
  const other = r.b ? state.engine.medName(r.b) : r.bClass ? `${state.engine.className(r.bClass)} (class)` : r.bName || '';
  return `${a} + ${other}`;
}
function dupCard(p, res) {
  return `<article class="ix-card pair-card dup-card" id="dup-${p.a}-${p.b}"><header><h3>${pairTitle(p)}</h3>${tierBadge('duplication')}</header>
    ${ingredientNote(p, res)}
    ${p.duplications.map(d => {
      const head = d.kind === 'same-ingredient' ? `<p><b>Duplicate active ingredient.</b> These products contain the same active ingredient, ${esc(d.name)}: it appears in both ${esc(d.a)} and ${esc(d.b)}, and the two amounts add up towards the daily maximum.</p>`
        : `<p><b>Possible therapeutic duplication.</b> ${esc(d.aIngredient)} and ${esc(d.bIngredient)} are both <a href="${entityLink('drug-classes', d.classId)}">${esc((d.className || '').toLowerCase())}</a>. ${esc(d.text || '')}${d.source ? src(d.source) : ''}</p>`;
      const recs = d.records.map(r => `<details class="ix-more" open><summary>${tierBadge(r.tier, { short: true })} ${sevBadge(r.severity)} <span class="ix-more-title">${esc(recordTitle(r))}</span></summary>${interactionBody(r, { via: r })}</details>`).join('');
      return head + recs + (d.kind === 'same-ingredient' && d.id ? `<p class="small"><a href="${entityLink('medications', d.id)}">${esc(d.name)} page</a></p>` : '');
    }).join('')}
  </article>`;
}
function relatedHtml(res) {
  const groups = new Map();
  const push = (type, id, name) => { if (!groups.has(type)) groups.set(type, new Map()); groups.get(type).set(id, name); };
  for (const m of res.medications) { if (m.kind === 'medication') push('medications', m.id, m.name); for (const i of m.ingredients) { if (i.id) push('medications', i.id, i.name); if (i.drugClass) push('drug-classes', i.drugClass, state.engine.className(i.drugClass)); } }
  for (const r of res.related) push(r.type, r.id, r.name);
  const html = RELATED_GROUPS.filter(([t]) => groups.get(t)?.size).map(([t, label]) => `<div class="rel-group"><div class="eyebrow">${esc(label)}</div><div class="chips">${[...groups.get(t)].map(([id, name]) => `<a class="chip" href="${graphLink({ type: t, id })}" data-related="${esc(t)}">${esc(name)}</a>`).join('')}</div></div>`).join('');
  return html ? `<section class="related" aria-labelledby="chk-rel-h"><h2 id="chk-rel-h">Explore related topics</h2><p class="small muted">The medicines, classes, anatomy, physiology, tests and biomarkers the results above connect to. Only relationships recorded in the knowledge graph are shown.</p>${html}</section>` : '';
}
function renderDataFacts(ix) {
  const el = $('chk-data'); if (!el) return;
  const m = ix.sourceMetadata || {};
  el.innerHTML = `<dt>Source</dt><dd>${esc(Object.keys(m.publishers || {}).join(', ') || 'official medication information')}, paraphrased into records that each cite the document and section they came from</dd>
    <dt>Coverage</dt><dd>${esc(String(m.recordCount || ix.records.length))} interaction records · ${esc(String(m.medicationCount || ''))} medicines with pages · ${esc(String(m.productCount || ''))} brand and combination products · ${esc(String(m.substanceCount || ''))} named substances · ${esc(String(m.classCount || ''))} drug classes</dd>
    <dt>Last updated</dt><dd><time datetime="${esc(m.lastUpdated || ix.updated || '')}">${esc(dateText(m.lastUpdated || ix.updated))}</time></dd>
    <dt>Review status</dt><dd>${esc(Object.keys(m.reviewStatuses || {}).map(k => REVIEW_LABEL[k] || k).join('; ') || 'not yet independently reviewed')}</dd>`;
}

// ------------------------------------------------------------------ boot
shell();
try {
  state.ix = await loadInteractions();
  state.engine = createEngine(state.ix);
} catch (e) {
  root.innerHTML = `<div class="callout urgent" role="alert"><b>${esc(COPY.unavailable)}</b> The checker never estimates an interaction without its source data. <a href="${esc(location.pathname)}">Retry</a> · <a href="${typeLink('medications')}">browse medication pages</a></div>`;
  track('checker_error', { code: 'data-unavailable' });
  document.body.dataset.rendered = '1';
  throw e;
}
renderDataFacts(state.ix);
bindCombobox();
track('drug_checker_opened');
const tokens = [...(param('drugs') || '').split(','), ...(param('drug') || '').split(',')].map(s => s.trim()).filter(Boolean);
const unknown = [];
for (const tok of tokens) { const hit = state.engine.resolve(tok); if (hit && ['medication', 'product', 'substance'].includes(hit.kind)) add(hit, { announce: false }); else unknown.push(tok); }
renderSelected();
if (unknown.length) message(`We could not match ${unknown.map(u => `“${u}”`).join(', ')} to our drug database${unknown.some(u => state.engine.resolve(u)?.kind === 'class') ? ' (a drug class cannot be checked as a whole: add a specific medicine)' : ''}. Search again.`, true);
if (state.selected.length >= LIMITS.min) runCheck({ focus: false });
document.body.dataset.rendered = '1';
