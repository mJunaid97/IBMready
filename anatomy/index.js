// anatomy/index.js — the anatomy hub (/anatomy/): what is covered, the fully written organ articles first, then every
// organ and skeletal group grouped by body system, regions and the atlas entry points.
import { renderHeader, renderFooter, loadData, loadClinical, link, esc, paths, PRERENDERED, SITE, breadcrumbHtml, canonical, fmt } from '../site/site.js?v=1.1.2';
import { relatedCountForAnatomy } from '../site/entity.js?v=1.1.2';
import { applyMeta, metaDescription, webPageNode } from '../site/seo.js?v=1.1.2';
renderHeader('anatomy'); renderFooter();
if (!PRERENDERED) {
  const [{ atlas, content }, clinical] = await Promise.all([loadData(), loadClinical()]);
  const path = paths.dir('anatomy'); const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Anatomy' }];
  const written = content.organs.filter(o => o.article); const rest = content.organs.filter(o => !o.article);
  const title = `Human Anatomy: Organs & Structures A–Z | ${SITE.name}`;
  const description = `Explore human anatomy organ by organ: location, structure, blood supply, function and clinical relevance, each with an interactive 3D model and links to the conditions, tests and procedures that concern it.`;
  applyMeta({ title, description, path, breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'CollectionPage', updated: content.anatomyUpdated }),
    { '@type': 'ItemList', name: `Anatomy pages on ${SITE.name}`, numberOfItems: content.organs.length, itemListElement: content.organs.map((o, i) => ({ '@type': 'ListItem', position: i + 1, name: o.name, url: canonical(paths.entity('anatomy', 'organ.html', o.id)) })) }] });
  const card = (o) => `<a class="card" href="${link.organPage(o.id)}"><h3>${esc(o.name)}</h3><p>${esc(o.article ? o.article.intro.slice(0, 150).replace(/\s+\S*$/, '') + '…' : o.summary)}</p><div class="meta">${o.structures.length} structures · ${relatedCountForAnatomy('organs', o.id, clinical)} topics${o.article ? ' · full article' : ''}</div></a>`;
  const bySys = new Map(); for (const o of content.organs) { if (!bySys.has(o.system)) bySys.set(o.system, []); bySys.get(o.system).push(o); }
  const az = [...content.organs].sort((a, b) => a.name.localeCompare(b.name));
  document.getElementById('main').innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="section-hero"><div class="eyebrow">🫀 Section · ${content.organs.length} anatomy pages · ${fmt(atlas.totals.structures)} structures in 3D</div><h1>Human anatomy</h1>
    <p class="lead">Every organ page answers the same questions: where it is, what it is made of, what supplies it, what it does, what goes wrong and how that is investigated and treated. Each is built on the ${fmt(atlas.totals.pieces)}-piece 3D atlas, so you can open the real shapes, and each links into physiology, symptoms, conditions, tests, imaging, procedures and medications.</p></div>
    <h2>Start here: full anatomy articles</h2>
    <div class="grid grid-3">${written.map(card).join('')}</div>
    <h2>Explore by body system</h2>
    <p class="muted">Each system page lists every modelled structure with an overview, functions and clinical notes.</p>
    <div class="chips">${atlas.systems.map(s => `<a class="chip" href="${link.systemPage(s.id)}" style="border-color:${s.color}">${esc(s.name)} · ${fmt(s.count)}</a>`).join('')}</div>
    <h2>Explore by region</h2>
    <div class="chips">${content.regions.map(r => `<a class="chip" href="${link.region(r.id)}">${esc(r.name)} · ${r.structures.length} structures in 3D</a>`).join('')}</div>
    ${atlas.systems.filter(s => bySys.has(s.id)).map(s => `<h2><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</h2><div class="grid grid-3">${bySys.get(s.id).map(card).join('')}</div>`).join('')}
    <h2>A–Z</h2>
    <div class="chips">${az.map(o => `<a class="chip" href="${link.organPage(o.id)}">${esc(o.name)}</a>`).join('')}</div>
    <h2>Keep exploring</h2>
    <div class="chips"><a class="chip" href="${link.explorer()}">🧊 3D explorer</a><a class="chip" href="${link.page('systems')}">Body systems</a><a class="chip" href="${link.page('organs')}">Organs by system</a><a class="chip" href="${link.page('medical-terms')}">Medical terms</a><a class="chip" href="${link.page('study')}">Study tools</a></div>`;
}
