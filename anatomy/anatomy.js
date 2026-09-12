// anatomy/anatomy.js — the canonical anatomy page of an organ (/anatomy/<organ>/): the written article when there is
// one (key facts, sections, references), the modelled structures, a click-to-load 3D model and every clinical topic
// that concerns the organ. Organs without an article are published noindex until one is written.
import { renderHeader, renderFooter, loadData, loadClinical, link, esc, pageId, paths, PRERENDERED, SITE, breadcrumbHtml, facadeHtml, canonical, entityLink, TYPE_ORDER } from '../site/site.js?v=1.4.0';
import { relatedForAnatomy, relatedCountForAnatomy, referencesHtml, editorialHtml } from '../site/entity.js?v=1.4.0';
import { applyMeta, seoTitle, metaDescription, webPageNode } from '../site/seo.js?v=1.4.0';
renderHeader('anatomy'); renderFooter();
if (!PRERENDERED) {
  const [data, clinical] = await Promise.all([loadData(), loadClinical()]); const { atlas, content, terms } = data;
  const id = pageId(); const o = content.organs.find(x => x.id === id);
  const main = document.getElementById('main');
  if (!o) { main.innerHTML = `<h1>Not found</h1><p><a href="${link.page('anatomy')}">All anatomy pages</a></p>`; applyMeta({ title: `Not found | ${SITE.name}`, description: '', path: paths.dir('anatomy'), robots: 'noindex' }); document.body.dataset.status = '404'; throw new Error('no organ'); }
  const sys = atlas.systems.find(s => s.id === o.system); const region = content.regions.find(r => r.id === o.region);
  const art = o.article; const path = paths.entity('anatomy', 'organ.html', o.id);
  const structs = o.structures.map(i => atlas.structures[i]);
  const others = content.organs.filter(x => x.system === o.system && x.id !== o.id);
  const relTerms = terms.terms.filter(t => t.atlas && (t.atlas.organ === o.id || (t.atlas.structure && structs.some(s => s.name === t.atlas.structure))));
  const systemText = content.systems[o.system] || {};
  const h1 = art ? art.title : `${o.name} anatomy`;
  const title = seoTitle(art ? art.title : `${o.name} Anatomy`, art ? art.descriptor : 'Structure, Location & Function');
  const description = art ? `Explore the anatomy of the ${o.name.toLowerCase()}: ${art.descriptor.toLowerCase()}, clinical relevance and an interactive 3D model.` : `${o.name}: ${o.summary}`;
  const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Anatomy', href: link.page('anatomy') }, { name: sys ? sys.name : o.system, href: link.systemPage(o.system) }, { name: o.name }];
  const topics = clinical.organs?.[o.id] || {};
  const node = { '@type': 'AnatomicalStructure', '@id': canonical(path) + '#entity', name: o.name, url: canonical(path), description: metaDescription(art ? art.intro : o.summary, 300), ...(o.aliases?.length ? { alternateName: o.aliases } : {}),
    ...(sys ? { partOfSystem: { '@type': 'AnatomicalSystem', name: sys.name, url: canonical(paths.entity('systems', 'system.html', sys.id)) } } : {}),
    ...(structs.length ? { subStructure: structs.slice(0, 40).map(s => ({ '@type': 'AnatomicalStructure', name: s.name })) } : {}),
    ...(topics.conditions?.length ? { relatedCondition: topics.conditions.slice(0, 12).map(cid => ({ '@type': 'MedicalCondition', name: clinical.names.conditions[cid] || cid, url: canonical(paths.entity('conditions', 'condition.html', cid)) })) } : {}) };
  applyMeta({ title, description, path, robots: o.index ? 'index,follow' : 'noindex,follow', image: link.preview('o=' + o.id), breadcrumbs: crumbs,
    jsonld: [webPageNode({ path, title, description: metaDescription(description), entityId: canonical(path) + '#entity', updated: o.updated, references: art?.references }), node] });
  const single = structs.length === 1 ? content.structures[structs[0].id] : null;
  main.innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="eyebrow">Anatomy · <a href="${link.systemPage(o.system)}">${esc(sys ? sys.name : o.system)}</a>${region ? ` · <a href="${link.region(region.id)}">${esc(region.name)}</a>` : ''}</div>
    <h1>${esc(h1)}</h1>
    ${o.aliases?.length ? `<p class="aliases">Also known as: ${esc(o.aliases.join(', '))}</p>` : ''}
    <p class="lead">${esc(art ? art.intro : o.summary)}</p>
    <div class="actions">
      <a class="btn btn-primary" href="${link.organ(o.id)}">Open in the 3D explorer</a>
      <a class="btn" href="${link.locate(o.system)}">Locate structures</a>
      <a class="btn" href="${link.quiz(o.system)}">Quiz: ${esc((sys ? sys.name : o.system).toLowerCase())}</a>
    </div>
    ${facadeHtml('o=' + o.id, o.name)}
    <div class="two">
      <div>
        ${art ? `${art.keyFacts?.length ? `<h2>Key facts</h2><div class="table-wrap"><table class="kv"><tbody>${art.keyFacts.map(k => `<tr><th scope="row">${esc(k.label)}</th><td>${esc(k.value)}</td></tr>`).join('')}</tbody></table></div>` : ''}
          ${art.sections.map(s => `<h2>${esc(s.heading)}</h2>${String(s.body).split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join('')}`).join('')}` : `<div class="callout"><b>Overview page.</b> A full anatomy article for the ${esc(o.name.toLowerCase())} has not been written yet; below are the modelled structures, the system it belongs to and every clinical topic that mentions it.</div>`}
        ${single ? `<h2>About</h2><p>${esc(single.summary || '')}</p>${single.function ? `<p><b>Function.</b> ${esc(single.function)}</p>` : ''}${single.clinical ? `<p><b>Clinical note.</b> ${esc(single.clinical)}</p>` : ''}` : ''}
        <h2>Structures in the atlas <span class="badge">${structs.length}</span></h2>
        <p class="muted small">The modelled pieces that make up the ${esc(o.name.toLowerCase())} in the 3D atlas. Each opens in the explorer.</p>
        <ul class="list">${structs.map(s => `<li><a href="${link.structure(s.id)}">${esc(s.name)}</a>${s.pieces.length > 1 ? ` <span class="muted small">· ${s.pieces.length} pieces</span>` : ''}</li>`).join('')}</ul>
        <h2>The ${esc(sys ? sys.name.toLowerCase() : '')} in brief</h2>
        <p>${esc(systemText.overview || sys?.summary || '')}</p>
        <p><a href="${link.systemPage(o.system)}">All structures of the ${esc(sys ? sys.name.toLowerCase() : 'system')}</a></p>
      </div>
      <aside class="aside">
        ${relatedForAnatomy('organs', o.id, clinical, `Related topics · ${relatedCountForAnatomy('organs', o.id, clinical)}`) || `<section><h2>Related topics</h2><p class="muted small">No physiology, condition, test or procedure pages mention the ${esc(o.name.toLowerCase())} yet. <a href="${link.search(o.name)}">Search the site.</a></p></section>`}
        ${relTerms.length ? `<section><h2>Terms to know</h2><div class="chips">${relTerms.map(t => `<a class="chip" href="${link.term(t.id)}" title="${esc(t.definition)}">${esc(t.term)}</a>`).join('')}</div></section>` : ''}
        ${others.length ? `<section><h2>Also in this system</h2><div class="chips">${others.map(x => `<a class="chip" href="${link.organPage(x.id)}">${esc(x.name)}</a>`).join('')}</div></section>` : ''}
        ${referencesHtml(art?.references)}
        ${editorialHtml({ updated: o.updated, references: art?.references || [] })}
      </aside>
    </div>`;
}
