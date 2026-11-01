// anatomy/anatomy.js — the canonical anatomy page of an organ (/anatomy/<organ>/): the written article when there is
// one (key facts, sections, references), the modelled structures, a click-to-load 3D model and every clinical topic
// that concerns the organ. Organs without an article are published noindex until one is written. An organ no layer of
// the atlas models (the male BodyParts3D body, the female layer from the Human Reference Atlas or the schematic
// gender-affirming layer; today only the vulva) shows the modelled structures around it in 3D instead.
import { renderHeader, renderFooter, loadData, loadClinical, link, esc, pageId, paths, PRERENDERED, SITE, breadcrumbHtml, facadeHtml, canonical, entityLink, TYPE_ORDER, organHash } from '../site/site.js';
import { relatedForAnatomy, relatedCountForAnatomy, referencesHtml, editorialHtml } from '../site/entity.js';
import { locatorFigure } from '../site/locator.js';
import { applyMeta, seoTitle, metaDescription, webPageNode } from '../site/seo.js';
renderHeader('anatomy'); renderFooter();
if (!PRERENDERED) {
  const [data, clinical] = await Promise.all([loadData(), loadClinical()]); const { atlas, content, terms, locator } = data;
  const id = pageId(); const o = content.organs.find(x => x.id === id);
  const main = document.getElementById('main');
  if (!o) { main.innerHTML = `<h1>Not found</h1><p><a href="${link.page('anatomy')}">All anatomy pages</a></p>`; applyMeta({ title: `Not found | ${SITE.name}`, description: '', path: paths.dir('anatomy'), robots: 'noindex' }); document.body.dataset.status = '404'; throw new Error('no organ'); }
  const sys = atlas.systems.find(s => s.id === o.system); const region = content.regions.find(r => r.id === o.region);
  const art = o.article; const path = paths.entity('anatomy', 'organ.html', o.id);
  const structs = o.structures.map(i => atlas.structures[i]);
  const modelled = structs.length > 0; const nearby = (o.nearby || []).map(i => atlas.structures[i]);
  const hash = organHash(o, atlas);           // o=<organ>, or s=<the structures around an unmodelled organ>, or null
  const others = content.organs.filter(x => x.system === o.system && x.id !== o.id);
  const relTerms = terms.terms.filter(t => t.atlas && (t.atlas.organ === o.id || (t.atlas.structure && structs.some(s => s.name === t.atlas.structure))));
  const systemText = content.systems[o.system] || {};
  const h1 = art ? art.title : `${o.name} anatomy`;
  // "[Organ] Anatomy: 3D Model, [parts] | Anatomy Nexus": the searched phrase first, the feature that sets the page apart second
  const title = seoTitle(art ? art.title : `${o.name} Anatomy`, art ? (modelled ? '3D Model, ' : '') + art.descriptor : 'Structure, Location & Function');
  // the description is the article's own opening (what a searcher wants answered), then the invitation to explore it in 3D
  const template = art ? `Explore the anatomy of the ${o.name.toLowerCase()}: ${art.descriptor.toLowerCase()}, clinical relevance and ${modelled ? 'an interactive 3D model' : 'the surrounding structures in 3D'}.` : '';
  const sentences = (t) => !!t && art.intro.replace(/\s+/g, ' ').startsWith(t);        // whole sentences of the intro, not a clause cut out of a long one
  const lead = art ? metaDescription(art.intro, 138) : '';
  const whole = art ? metaDescription(art.intro, 160, template) : '';
  const description = art ? (modelled && sentences(lead) && lead.length >= 60 && lead.length <= 140 ? `${lead} Explore it in 3D.` : sentences(whole) && whole.length >= 70 ? whole : template) : `${o.name}: ${o.summary}`;
  const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Anatomy', href: link.page('anatomy') }, { name: sys ? sys.name : o.system, href: link.systemPage(o.system) }, { name: o.name }];
  const topics = clinical.organs?.[o.id] || {};
  const node = { '@type': 'AnatomicalStructure', '@id': canonical(path) + '#entity', name: o.name, url: canonical(path), description: metaDescription(art ? art.intro : o.summary, 300), ...(o.aliases?.length ? { alternateName: o.aliases } : {}),
    ...(sys ? { partOfSystem: { '@type': 'AnatomicalSystem', name: sys.name, url: canonical(paths.entity('systems', 'system.html', sys.id)) } } : {}),
    ...(structs.length ? { subStructure: structs.slice(0, 40).map(s => ({ '@type': 'AnatomicalStructure', name: s.name })) } : {}),
    ...(topics.conditions?.length ? { relatedCondition: topics.conditions.slice(0, 12).map(cid => ({ '@type': 'MedicalCondition', name: clinical.names.conditions[cid] || cid, url: canonical(paths.entity('conditions', 'condition.html', cid)) })) } : {}) };
  applyMeta({ title, description, path, robots: o.index ? 'index,follow' : 'noindex,follow', image: link.preview(hash || ''), imageAlt: hash ? `3D model of the ${o.name.toLowerCase()}${modelled ? '' : ' and the structures around it'} in the ${SITE.name} anatomy atlas` : undefined, breadcrumbs: crumbs,
    jsonld: [webPageNode({ path, title, description: metaDescription(description), entityId: canonical(path) + '#entity', updated: o.updated, references: art?.references }), node] });
  const single = structs.length === 1 ? content.structures[structs[0].id] : null;
  const locFig = locatorFigure(locator, [{ id: o.id, name: o.name, color: sys?.color }], { heading: `Where the ${o.name.toLowerCase()} lies` });
  main.innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="eyebrow">Anatomy · <a href="${link.systemPage(o.system)}">${esc(sys ? sys.name : o.system)}</a>${region ? ` · <a href="${link.region(region.id)}">${esc(region.name)}</a>` : ''}</div>
    <h1>${esc(h1)}</h1>
    ${o.aliases?.length ? `<p class="aliases">Also known as: ${esc(o.aliases.join(', '))}</p>` : ''}
    <p class="lead">${esc(art ? art.intro : o.summary)}</p>
    <div class="actions">
      ${modelled ? `<a class="btn btn-primary" href="${link.organ(o.id)}">Open in the 3D explorer</a>
      <a class="btn" href="${link.locate(o.system)}">Locate structures</a>
      <a class="btn" href="${link.quiz(o.system)}">Quiz: ${esc((sys ? sys.name : o.system).toLowerCase())}</a>`
      : `${hash ? `<a class="btn btn-primary" href="${link.explorer(hash)}">Surrounding structures in 3D</a>` : ''}${region ? `<a class="btn" href="${link.region(region.id)}">Show the ${esc(region.name.toLowerCase())} in 3D</a>` : ''}`}
    </div>
    ${hash || locFig ? `<div class="visuals${hash && locFig ? ' has-both' : ''}">${locFig}${hash ? facadeHtml(hash, modelled ? o.name : `${o.name}: surrounding structures`) : ''}</div>` : ''}
    ${hash ? `<p class="viewmodes"><span>See it as</span><a class="chip" href="${link.explorer(hash + '&x=1')}" title="Fade the surrounding tissue to see the ${esc(o.name.toLowerCase())} in place">X-ray view</a><a class="chip" href="${link.explorer(hash + '&e=0.6')}" title="Pull the structures apart">Exploded view</a><a class="chip" href="${link.explorer(hash + '&slice=y')}" title="Cut across the body at any height">Cross-section</a></p>` : ''}
    ${hash && !modelled ? `<p class="muted small">The 3D atlas does not model the ${esc(o.name.toLowerCase())}, so this view shows the structures around it. The atlas's base body is an adult male body (BodyParts3D); structures of the female reproductive system come from the NIH Human Reference Atlas female layer, which the view switches on in place of the male reproductive organs.</p>` : ''}
    <div class="two">
      <div>
        ${art ? `${art.keyFacts?.length ? `<h2>Key facts</h2><div class="table-wrap"><table class="kv"><tbody>${art.keyFacts.map(k => `<tr><th scope="row">${esc(k.label)}</th><td>${esc(k.value)}</td></tr>`).join('')}</tbody></table></div>` : ''}
          ${art.sections.map(s => `<h2>${esc(s.heading)}</h2>${String(s.body).split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join('')}`).join('')}` : `<div class="callout"><b>Overview page.</b> A full anatomy article for the ${esc(o.name.toLowerCase())} has not been written yet; below are the modelled structures, the system it belongs to and every clinical topic that mentions it.</div>`}
        ${single ? `<h2>About</h2><p>${esc(single.summary || '')}</p>${single.function ? `<p><b>Function.</b> ${esc(single.function)}</p>` : ''}${single.clinical ? `<p><b>Clinical note.</b> ${esc(single.clinical)}</p>` : ''}` : ''}
        ${modelled ? `<h2>Structures in the atlas <span class="badge">${structs.length}</span></h2>
        <p class="muted small">The modelled pieces that make up the ${esc(o.name.toLowerCase())} in the 3D atlas. Each opens in the explorer.</p>
        <ul class="list">${structs.map(s => `<li><a href="${link.structure(s.id)}">${esc(s.name)}</a>${s.pieces.length > 1 ? ` <span class="muted small">· ${s.pieces.length} pieces</span>` : ''}</li>`).join('')}</ul>`
        : `<h2>In the 3D atlas</h2>
        <div class="callout info"><b>Not modelled yet.</b> Neither the BodyParts3D male body nor the Human Reference Atlas female layer includes the ${esc(o.name.toLowerCase())}; this page is the written anatomy.${nearby.length ? ' The structures around it are modelled, and each opens in the explorer:' : ''}</div>
        ${nearby.length ? `<ul class="list">${nearby.map(s => `<li><a href="${link.structure(s.id)}">${esc(s.name)}</a>${s.pieces.length > 1 ? ` <span class="muted small">· ${s.pieces.length} pieces</span>` : ''}</li>`).join('')}</ul>` : ''}`}
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
