// organs/index.js — organs browse hub: the organs and skeletal groups grouped by body system, each linking to its
// canonical anatomy page (/anatomy/<organ>/).
import { renderHeader, renderFooter, loadData, loadClinical, link, esc, paths, PRERENDERED, SITE, breadcrumbHtml, structuresLabel } from '../site/site.js?v=1.7.0';
import { relatedCountForAnatomy } from '../site/entity.js?v=1.7.0';
import { applyMeta, metaDescription, webPageNode } from '../site/seo.js?v=1.7.0';
renderHeader('organs'); renderFooter();
if (!PRERENDERED) {
  const [{ atlas, content }, clinical] = await Promise.all([loadData(), loadClinical()]);
  const path = paths.dir('organs'); const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Anatomy', href: link.page('anatomy') }, { name: 'Organs by system' }];
  const title = `Organs by Body System | ${SITE.name}`; const description = document.querySelector('meta[name="description"]').content;
  applyMeta({ title, description, path, breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'CollectionPage', updated: content.anatomyUpdated })] });
  const bySys = new Map();
  for (const o of content.organs) { if (!bySys.has(o.system)) bySys.set(o.system, []); bySys.get(o.system).push(o); }
  document.getElementById('main').innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="section-hero"><div class="eyebrow">Browse</div><h1>Organs by body system</h1><p class="lead">${content.organs.length} organs and skeletal groups assembled from the pieces of the 3D atlas, grouped by the system they belong to. Each opens its anatomy page: structure, function, a live 3D model wherever the atlas holds the organ, and every clinical topic that concerns it.</p></div>
    ${atlas.systems.filter(s => bySys.has(s.id)).map(s => `<h2><span class="dot" style="background:${s.color}"></span><a href="${link.systemPage(s.id)}">${esc(s.name)}</a></h2><div class="grid grid-3">${bySys.get(s.id).map(o => `<a class="card" href="${link.organPage(o.id)}"><h3>${esc(o.name)}</h3><p>${esc(o.summary)}</p><div class="meta">${structuresLabel(o)} · ${relatedCountForAnatomy('organs', o.id, clinical)} topics${o.region ? ' · ' + esc(content.regions.find(r => r.id === o.region)?.name || '') : ''}</div></a>`).join('')}</div>`).join('')}
    <h2>Keep exploring</h2>
    <div class="chips"><a class="chip" href="${link.page('anatomy')}">Anatomy A–Z</a><a class="chip" href="${link.page('systems')}">Body systems</a><a class="chip" href="${link.explorer()}">3D explorer</a></div>`;
}
