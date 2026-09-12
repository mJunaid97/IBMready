/**
 * taxonomy.js — the taxonomy pages of the clinical layer (Comprehensive Clinical Tests & Medications specification):
 *   /tests/categories/            hub of the 36 test categories in four groups (renderTestCategories)
 *   /tests/categories/<category>/ one category: the pages in it and the catalogued concepts that have no page yet (renderTestCategory)
 *   /medications/classes/         the medication taxonomy: therapeutic areas → class groups → classes → medicines (renderMedicationClasses)
 * Data: data/content/test-categories.json and data/content/medication-taxonomy.json, compiled by tools/build-content.py.
 * Under a prerendered page nothing is redrawn; only the header, footer and the filter of the class hub are bound.
 */
import { renderHeader, renderFooter, loadTestCategories, loadMedicationTaxonomy, loadClinical, loadData, link, entityLink, typeLink, TYPES, iconSvg, esc, pageId, paths, PRERENDERED, SITE, breadcrumbHtml, canonical, dateText } from './site.js?v=1.5.0';
import { applyMeta, seoTitle, metaDescription, webPageNode } from './seo.js?v=1.5.0';
import { editorialHtml } from './entity.js?v=1.5.0';

const KIND_LABEL = { laboratory: 'Laboratory test', panel: 'Panel', measurement: 'Measurement', physiological: 'Functional test', imaging: 'Imaging', 'diagnostic-procedure': 'Diagnostic procedure', examination: 'Examination', 'screening-tool': 'Screening tool', pathology: 'Pathology', genetic: 'Genetic / molecular', microbiology: 'Microbiology' };
const nameOf = (clinical, type, id) => clinical.names[type]?.[id] || id;
const pageCard = (clinical, type, id) => `<a class="chip" href="${entityLink(type, id)}">${esc(nameOf(clinical, type, id))}</a>`;
const catPath = (id) => PRETTY_PATH(`tests/categories/${id}/`, `tests/category.html?id=${id}`);
function PRETTY_PATH(pretty, query) { return paths.dir('x') === 'x/' ? pretty : query; }

export async function renderTestCategories() {
  renderHeader('tests'); renderFooter();
  if (PRERENDERED) return;
  const main = document.getElementById('main');
  const [tc, clinical] = await Promise.all([loadTestCategories(), loadClinical()]);
  const crumbs = [{ name: 'Home', href: link.home() }, { name: TYPES.tests.name, href: typeLink('tests') }, { name: 'Categories' }];
  const path = PRETTY_PATH('tests/categories/', 'tests/categories/index.html');
  const title = `Medical Test Categories: The Master Taxonomy | ${SITE.name}`;
  const description = `Every kind of medical test in ${tc.categories.length} categories: laboratory, imaging, specialty diagnostics, measurements, screening tools and procedures, with the tests that have a page and the catalogued concepts still to be written.`;
  const nPages = tc.categories.reduce((n, c) => n + c.counts.pages, 0), nConcepts = tc.categories.reduce((n, c) => n + c.counts.concepts, 0);
  applyMeta({ title, description, path, breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'CollectionPage', updated: tc.updated }),
    { '@type': 'ItemList', name: `Medical test categories on ${SITE.name}`, numberOfItems: tc.categories.length, itemListElement: tc.categories.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: canonical(catPath(c.id)) })) }] });
  main.innerHTML = `${breadcrumbHtml(crumbs)}
    <div class="section-hero"><div class="eyebrow">${iconSvg(TYPES.tests.icon)} Medical tests · taxonomy</div><h1>Medical test categories</h1>
    <p class="lead">${esc(description)}</p>
    <p class="small muted">A test can belong to several categories but has one canonical page. A catalogued concept is a clinical idea the site knows (with its abbreviations and synonyms) and maps terminology onto; it becomes a page only when it can be written to the site's quality standard, never as a thin placeholder.</p></div>
    ${tc.groups.map(g => { const cats = tc.categories.filter(c => c.group === g.id); return `<h2 id="${esc(g.id)}">${esc(g.name)} <span class="badge">${cats.length}</span></h2><p class="muted">${esc(g.summary)}</p>
      <div class="grid grid-3">${cats.map(c => `<a class="card" href="${link.testCategory(c.id)}"><h3>${esc(c.name)}</h3><p>${esc(c.summary)}</p><div class="meta">${c.counts.pages} page${c.counts.pages === 1 ? '' : 's'} · ${c.counts.concepts} catalogued concept${c.counts.concepts === 1 ? '' : 's'}</div></a>`).join('')}</div>`; }).join('')}
    <p class="muted small">${nPages} page links across ${nConcepts} catalogued concepts. <a href="${typeLink('tests')}">All tests A–Z</a> · <a href="${typeLink('imaging')}">Imaging</a> · <a href="${typeLink('biomarkers')}">Biomarkers</a> · <a href="${typeLink('procedures')}">Procedures</a></p>
    ${editorialHtml({ updated: tc.updated, references: [], kind: 'taxonomy' })}`;
  document.body.dataset.rendered = '1';
}

export async function renderTestCategory() {
  renderHeader('tests'); renderFooter();
  if (PRERENDERED) return;
  const main = document.getElementById('main');
  const [tc, clinical, data] = await Promise.all([loadTestCategories(), loadClinical(), loadData()]);
  const id = pageId(); const c = id ? tc.categories.find(x => x.id === id) : null;
  if (!c) { main.innerHTML = `<h1>Not found</h1><p><a href="${link.testCategories()}">All test categories</a></p>`; applyMeta({ title: `Not found | Test categories`, description: '', path: 'tests/categories/', robots: 'noindex' }); document.body.dataset.status = '404'; return; }
  const group = tc.groups.find(g => g.id === c.group);
  const crumbs = [{ name: 'Home', href: link.home() }, { name: TYPES.tests.name, href: typeLink('tests') }, { name: 'Categories', href: link.testCategories() }, { name: c.name }];
  const path = catPath(c.id);
  const title = seoTitle(`${c.name} tests`, 'Tests, Panels & Studies');
  const pages = [...c.pages.tests.map(i => ['tests', i]), ...c.pages.imaging.map(i => ['imaging', i]), ...c.pages.procedures.map(i => ['procedures', i])];
  const description = `${c.summary} ${c.counts.pages} test${c.counts.pages === 1 ? '' : 's'} with a full page and ${c.counts.withoutPage} further catalogued concepts.`;
  applyMeta({ title, description, path, robots: c.seo.index ? 'index,follow' : 'noindex,follow', breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'CollectionPage', updated: tc.updated }),
    { '@type': 'ItemList', name: `${c.name} tests on ${SITE.name}`, numberOfItems: pages.length, itemListElement: pages.map(([t, i], n) => ({ '@type': 'ListItem', position: n + 1, name: nameOf(clinical, t, i), url: canonical(paths.entity(TYPES[t].dir, TYPES[t].page, i)) })) }] });
  const sysName = (sid) => data.atlas.systems.find(s => s.id === sid);
  const lead = (t, i) => { const T = TYPES[t]; return `<a class="card" href="${entityLink(t, i)}"><div class="eyebrow">${esc(T.singular)}</div><h3>${esc(nameOf(clinical, t, i))}</h3></a>`; };
  const concepts = c.concepts.filter(x => !x.page);
  const covered = c.concepts.filter(x => x.page);
  main.innerHTML = `${breadcrumbHtml(crumbs)}
    <div class="eyebrow">Test category · ${esc(group?.name || '')}</div>
    <h1>${esc(c.name)}</h1>
    <p class="lead">${esc(c.summary)}</p>
    <div class="two"><div>
      ${pages.length ? `<h2 id="pages">Tests with a page</h2><div class="grid grid-3">${pages.map(([t, i]) => lead(t, i)).join('')}</div>` : '<h2 id="pages">Tests with a page</h2><p class="muted">No test in this category has a full page yet. The concepts below are catalogued and waiting to be written to the site\'s quality standard.</p>'}
      ${covered.length ? `<h3>Concepts covered by those pages</h3><div class="chips">${covered.map(x => `<a class="chip" href="${entityLink(x.page.type, x.page.id)}" title="${esc(nameOf(clinical, x.page.type, x.page.id))}">${esc(x.name)}${x.abbreviations.length ? ` <span class="muted small">${esc(x.abbreviations.join(', '))}</span>` : ''}</a>`).join('')}</div>` : ''}
      ${concepts.length ? `<h2 id="catalogue">Also in this category: catalogued concepts</h2><p class="small muted">Canonical test concepts of this category that do not yet have their own page. They are listed so that the taxonomy is complete and searchable; a page is written only when it can meet the <a href="${link.page('editorial-policy')}">quality standard</a>.</p>
        <ul class="plain catalogue">${concepts.map(x => `<li id="${esc(x.id)}"><b>${esc(x.name)}</b>${x.abbreviations.length ? ` <span class="muted">(${esc(x.abbreviations.join(', '))})</span>` : ''}${x.synonyms.length ? `<span class="small muted"> · also: ${esc(x.synonyms.join(', '))}</span>` : ''} <span class="badge">${esc(KIND_LABEL[x.kind] || x.kind)}</span></li>`).join('')}</ul>` : ''}
      <div class="callout"><b>Educational content.</b> A test category groups what tests exist and what they are for. It cannot say which test a person needs: that depends on the question a clinician is asking.</div>
    </div><aside class="aside">
      <section class="side-clinical" aria-label="At a glance"><h2>At a glance</h2><dl>
        <dt>Group</dt><dd><a href="${link.testCategories()}#${esc(c.group)}">${esc(group?.name || c.group)}</a></dd>
        <dt>Pages</dt><dd>${c.counts.pages}</dd><dt>Catalogued concepts</dt><dd>${c.counts.concepts} (${c.counts.withoutPage} without a page)</dd>
        ${c.systems.length ? `<dt>Body systems</dt><dd>${c.systems.map(sysName).filter(Boolean).map(s => `<a href="${link.systemPage(s.id)}">${esc(s.name)}</a>`).join(', ')}</dd>` : ''}
      </dl></section>
      <section class="related"><h2>Other categories</h2><div class="chips">${tc.categories.filter(x => x.id !== c.id && x.group === c.group).map(x => `<a class="chip" href="${link.testCategory(x.id)}">${esc(x.name)}</a>`).join('')}<a class="chip" href="${link.testCategories()}">All categories</a></div></section>
      <section class="related"><h2>Sections</h2><div class="chips"><a class="chip" href="${typeLink('tests')}">${iconSvg(TYPES['tests'].icon)}Medical tests</a><a class="chip" href="${typeLink('biomarkers')}">${iconSvg(TYPES['biomarkers'].icon)}Biomarkers</a><a class="chip" href="${typeLink('imaging')}">${iconSvg(TYPES['imaging'].icon)}Imaging</a><a class="chip" href="${typeLink('procedures')}">${iconSvg(TYPES['procedures'].icon)}Procedures</a><a class="chip" href="${link.compare()}">${iconSvg('compare')}Comparisons</a></div></section>
      ${editorialHtml({ updated: tc.updated, references: [], kind: 'category' })}
    </aside></div>`;
  document.body.dataset.rendered = '1';
}

export async function renderMedicationClasses() {
  renderHeader('medications'); renderFooter();
  const main = document.getElementById('main');
  let mt = null, clinical = null;
  const load = async () => { if (!mt) [mt, clinical] = await Promise.all([loadMedicationTaxonomy(), loadClinical()]); };
  if (!PRERENDERED) {
    await load();
    const crumbs = [{ name: 'Home', href: link.home() }, { name: TYPES.medications.name, href: typeLink('medications') }, { name: 'Classes' }];
    const path = PRETTY_PATH('medications/classes/', 'medications/classes/index.html');
    const title = `Medication Classes by Therapeutic Area | ${SITE.name}`;
    const nClasses = mt.areas.reduce((n, a) => n + a.groups.reduce((m, g) => m + g.classes.length, 0), 0);
    const description = `The medication taxonomy: ${mt.areas.length} therapeutic areas and ${nClasses} pharmacologic classes mapped to WHO ATC codes, with the drug-class pages and medicines this site covers in each.`;
    applyMeta({ title, description, path, breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'CollectionPage', updated: mt.updated }),
      { '@type': 'ItemList', name: `Therapeutic areas on ${SITE.name}`, numberOfItems: mt.areas.length, itemListElement: mt.areas.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: canonical(path) + '#area-' + a.id })) }] });
    const medLink = (id) => `<a class="chip" href="${entityLink('medications', id)}">${esc(nameOf(clinical, 'medications', id))}</a>`;
    const example = (n) => { const id = clinical.medicationIndex?.[String(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()]; return id ? `<a href="${entityLink('medications', id)}">${esc(n)}</a>` : esc(n); };
    const classRow = (c) => `<li id="${esc(c.id)}"><b>${c.page ? `<a href="${entityLink('drug-classes', c.page)}">${esc(c.name)}</a>` : esc(c.name)}</b>${c.atc?.length ? ` <span class="mono muted small" title="WHO ATC code">${esc(c.atc.join(', '))}</span>` : ''}${c.medications?.length ? `<div class="chips chips-inline">${c.medications.map(medLink).join('')}</div>` : ''}${c.examples?.length && !c.medications?.length ? `<div class="small muted">e.g. ${c.examples.map(example).join(', ')}</div>` : ''}${c.note ? `<div class="small muted">${esc(c.note)}</div>` : ''}</li>`;
    main.innerHTML = `${breadcrumbHtml(crumbs)}
      <div class="section-hero"><div class="eyebrow">${iconSvg(TYPES.medications.icon)} Medications · taxonomy</div><h1>Medication classes by therapeutic area</h1>
      <p class="lead">${esc(description)}</p>
      <p class="small muted">Classification works across several dimensions at once: therapeutic area, pharmacologic class, mechanism, body system, active ingredient, brand, product type, dosage form, route and regulatory status. This page is the therapeutic and pharmacologic dimension. Example medicines show what a class contains; they are separate medicines, never synonyms of one another. Classes with a page are linked; the rest are catalogued until a page can be written to the <a href="${link.page('editorial-policy')}">quality standard</a>.</p>
      <p class="actions"><a class="btn btn-primary" href="${link.checker()}">Drug Interaction Checker</a><a class="btn" href="${typeLink('drug-classes')}">Drug class pages A–Z</a><a class="btn" href="${typeLink('medications')}">Medicines A–Z</a></p></div>
      <div class="search-row"><label class="sr-only" for="q">Filter classes</label><input id="q" type="search" placeholder="Filter classes and medicines… (e.g. statin, insulin, J01)"></div>
      <nav class="az" aria-label="Therapeutic areas">${mt.areas.map(a => `<a href="#area-${esc(a.id)}">${esc(a.name)}</a>`).join('')}</nav>
      <div id="areas">${mt.areas.map(a => `<section class="tax-area" id="area-${esc(a.id)}"><h2>${esc(a.name)}${a.atc?.length ? ` <span class="badge mono" title="WHO ATC group">${esc(a.atc.join(', '))}</span>` : ''}</h2><p class="muted">${esc(a.summary)}</p>
        ${a.medications?.length ? `<div class="chips">${a.medications.map(medLink).join('')}</div>` : ''}
        ${a.groups.map(g => `<h3>${esc(g.name)}</h3><ul class="plain classes">${g.classes.map(classRow).join('')}</ul>`).join('')}</section>`).join('')}</div>
      <h2 id="atc">WHO ATC first-level groups</h2><div class="table-wrap"><table class="kv"><thead><tr><th scope="col">Code</th><th scope="col">Anatomical / therapeutic group</th></tr></thead><tbody>${mt.atcGroups.map(g => `<tr><th scope="row" class="mono">${esc(g.id)}</th><td>${esc(g.name)}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">ATC codes are shown where the class corresponds exactly to a WHO ATC code at that level; medicines carry their own ATC, RxNorm and FDA pharmacologic-class identifiers on their pages. Codes are asserted by the editorial team and verified by the terminology pipeline against each release import.</p>
      ${editorialHtml({ updated: mt.updated, references: [], kind: 'taxonomy' })}`;
  }
  // filter (both modes): hide classes and areas that do not match
  const q = document.getElementById('q'); if (!q) return;
  q.addEventListener('input', () => {
    const s = q.value.trim().toLowerCase();
    for (const li of document.querySelectorAll('#areas li')) li.hidden = !!s && !li.textContent.toLowerCase().includes(s);
    for (const sec of document.querySelectorAll('#areas .tax-area')) { const any = [...sec.querySelectorAll('li')].some(li => !li.hidden) || (!!s && sec.querySelector('h2').textContent.toLowerCase().includes(s)); sec.hidden = !!s && !any; for (const h3 of sec.querySelectorAll('h3')) { const ul = h3.nextElementSibling; h3.hidden = !!s && ul && ![...ul.querySelectorAll('li')].some(li => !li.hidden); } }
  });
  document.body.dataset.rendered = '1';
}
