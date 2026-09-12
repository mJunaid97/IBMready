// systems/index.js — body systems hub.
import { renderHeader, renderFooter, loadData, link, esc, fmt, paths, PRERENDERED, SITE, breadcrumbHtml, canonical } from '../site/site.js?v=1.1.2';
import { applyMeta, metaDescription, webPageNode } from '../site/seo.js?v=1.1.2';
renderHeader('systems'); renderFooter();
if (!PRERENDERED) {
  const { atlas, content } = await loadData();
  const path = paths.dir('systems'); const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Anatomy', href: link.page('anatomy') }, { name: 'Body systems' }];
  const title = `Body Systems: Structures, Functions & Clinical Notes | ${SITE.name}`; const description = document.querySelector('meta[name="description"]').content;
  applyMeta({ title, description, path, breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'CollectionPage', updated: content.systems[atlas.systems[0].id]?.updated }),
    { '@type': 'ItemList', name: `Body systems on ${SITE.name}`, numberOfItems: atlas.systems.length, itemListElement: atlas.systems.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: canonical(paths.entity('systems', 'system.html', s.id)) })) }] });
  document.getElementById('main').innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="section-hero"><div class="eyebrow">Anatomy · ${atlas.systems.length} systems · ${fmt(atlas.totals.pieces)} pieces</div><h1>Body systems</h1>
    <p class="lead">The atlas is organised into sixteen systems, the way anatomy is taught: the skeleton and its joints, the muscles, the heart and vessels, the nervous system and senses, and the organ systems of the trunk. Each page gives an overview, functions, clinical notes, the organs it contains and every modelled structure, with the system ready to open in 3D.</p></div>
    <div class="grid grid-3">${atlas.systems.map(s => { const c = content.systems[s.id] || {}; const organs = content.organs.filter(o => o.system === s.id).length;
      return `<a class="card" href="${link.systemPage(s.id)}"><h3><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</h3><p>${esc(c.summary || s.summary)}</p><div class="meta">${fmt(s.count)} pieces · ${fmt(s.triangles)} triangles${organs ? ` · ${organs} organ${organs > 1 ? 's' : ''}` : ''}</div></a>`; }).join('')}</div>
    <h2>Keep exploring</h2>
    <div class="chips"><a class="chip" href="${link.page('anatomy')}">Anatomy A–Z</a><a class="chip" href="${link.page('organs')}">Organs by system</a><a class="chip" href="${link.explorer()}">3D explorer</a><a class="chip" href="${link.page('study')}">Study tools</a></div>`;
}
