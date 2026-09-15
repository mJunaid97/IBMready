/**
 * compare.js — the comparisons section: a hub of structured two-entity comparisons (tests, biomarkers,
 * imaging, medicines) and a detail page per comparison (compare/<id>/). Rows are authored from the two
 * entity pages' own properties (data/content/comparisons.json); the page never says which a person should have.
 */
import { renderHeader, renderFooter, loadClinical, loadComparisons, link, entityLink, typeLink, esc, pageId, paths, PRERENDERED, SITE, TYPES, breadcrumbHtml, canonical, iconSvg } from './site.js?v=1.6.0';
import { applyMeta, seoTitle, metaDescription, webPageNode } from './seo.js?v=1.6.0';
import { referencesHtml, editorialHtml } from './entity.js?v=1.6.0';

const DISCLAIMER = 'A comparison explains what each test, marker or medicine is for and how they differ. It is educational and does not say which one a person should have; that decision belongs to the clinician who knows the person and the question.';
const nameOf = (clinical, ref) => clinical.names[ref.type]?.[ref.id] || ref.id;
const { page } = document.body.dataset;
renderHeader('compare'); renderFooter();

async function renderIndex() {
  if (PRERENDERED) return;
  const [cmp, clinical] = await Promise.all([loadComparisons(), loadClinical()]);
  const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Comparisons' }];
  const path = paths.dir('compare'); const title = `Comparisons: Tests, Markers & Medicines Side by Side | ${SITE.name}`;
  applyMeta({ title, description: cmp.about || 'Structured comparisons of tests, biomarkers, imaging and medicines that are often confused or ordered together: what each is for and how they differ.', path, breadcrumbs: crumbs,
    jsonld: [webPageNode({ path, title, description: metaDescription(cmp.about || ''), type: 'CollectionPage', updated: cmp.updated }), { '@type': 'ItemList', name: 'Comparisons', numberOfItems: cmp.comparisons.length, itemListElement: cmp.comparisons.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: canonical(paths.entity('compare', 'compare.html', c.id)) })) }] });
  document.getElementById('main').innerHTML = `${breadcrumbHtml(crumbs)}
    <div class="section-hero"><div class="eyebrow">${iconSvg('compare')} Section · ${cmp.comparisons.length} comparisons</div><h1>Comparisons</h1><p class="lead">${esc(cmp.about || '')}</p></div>
    <div class="grid grid-3">${cmp.comparisons.map(c => `<a class="card" href="${link.compare(c.id)}"><div class="eyebrow">${esc(TYPES[c.a.type]?.singular || c.a.type)} · ${esc(TYPES[c.b.type]?.singular || c.b.type)}</div><h3>${esc(c.title)}</h3><p>${esc(c.intro.length > 160 ? c.intro.slice(0, 160).replace(/\s+\S*$/, '') + '…' : c.intro)}</p></a>`).join('')}</div>
    <h2>Other sections</h2><div class="chips">${['tests', 'biomarkers', 'imaging', 'medications', 'drug-classes'].map(t => `<a class="chip" href="${typeLink(t)}">${iconSvg(TYPES[t].icon)}${esc(TYPES[t].name)}</a>`).join('')}<a class="chip" href="${link.checker()}">${iconSvg('interactions')}Drug Interaction Checker</a><a class="chip" href="${link.tools()}">${iconSvg('tools')}Clinical tools</a></div>`;
}
async function renderDetail() {
  if (PRERENDERED) return;
  const main = document.getElementById('main');
  const [cmp, clinical] = await Promise.all([loadComparisons(), loadClinical()]);
  const id = pageId(); const c = cmp.comparisons.find(x => x.id === id);
  if (!c) { main.innerHTML = `<h1>Not found</h1><p><a href="${link.compare()}">All comparisons</a></p>`; applyMeta({ title: `Not found | Comparisons`, description: '', path: paths.dir('compare'), robots: 'noindex' }); document.body.dataset.status = '404'; return; }
  const an = nameOf(clinical, c.a), bn = nameOf(clinical, c.b);
  const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Comparisons', href: link.compare() }, { name: c.title }];
  const path = paths.entity('compare', 'compare.html', c.id); const title = seoTitle(c.title, 'What Each Is For & How They Differ');
  applyMeta({ title, description: c.intro, path, breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(c.intro), updated: c.updated, references: c.references }),
    { '@type': 'ItemList', name: c.title, itemListElement: [c.a, c.b].map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: nameOf(clinical, r), url: canonical(paths.entity(TYPES[r.type].dir, TYPES[r.type].page, r.id)) })) }] });
  main.innerHTML = `${breadcrumbHtml(crumbs)}
    <div class="eyebrow">Comparison · ${esc(TYPES[c.a.type]?.singular || c.a.type)} vs ${esc(TYPES[c.b.type]?.singular || c.b.type)}</div>
    <h1>${esc(c.title)}</h1>
    <p class="lead">${esc(c.intro)}</p>
    <div class="two"><div>
      <div class="table-wrap"><table class="kv compare"><thead><tr><th scope="col">Aspect</th><th scope="col"><a href="${entityLink(c.a.type, c.a.id)}">${esc(an)}</a></th><th scope="col"><a href="${entityLink(c.b.type, c.b.id)}">${esc(bn)}</a></th></tr></thead><tbody>${c.rows.map(r => `<tr><th scope="row">${esc(r.aspect)}</th><td>${esc(r.a)}</td><td>${esc(r.b)}</td></tr>`).join('')}</tbody></table></div>
      <div class="pair"><div><h2>Where ${esc(an)} fits</h2><p>${esc(c.whenA)}</p></div><div><h2>Where ${esc(bn)} fits</h2><p>${esc(c.whenB)}</p></div></div>
      <div class="callout"><b>Educational content.</b> ${esc(DISCLAIMER)}</div>
    </div><aside class="aside">
      <section><h2>The two pages</h2><div class="chips"><a class="chip chip-lg" href="${entityLink(c.a.type, c.a.id)}">${esc(an)}</a><a class="chip chip-lg" href="${entityLink(c.b.type, c.b.id)}">${esc(bn)}</a></div></section>
      <section><h2>More comparisons</h2><div class="chips">${cmp.comparisons.filter(x => x.id !== c.id).map(x => `<a class="chip" href="${link.compare(x.id)}">${esc(x.title)}</a>`).join('')}</div></section>
      ${referencesHtml(c.references)}
      ${editorialHtml({ updated: c.updated, references: c.references, kind: 'comparison' })}
    </aside></div>`;
}
(page === 'detail' ? renderDetail : renderIndex)();
