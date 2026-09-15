// systems/system.js — one body system: overview, functions, clinical notes, organs, every structure, 3D model, related topics.
import { renderHeader, renderFooter, loadData, loadClinical, link, esc, fmt, pageId, paths, PRERENDERED, SITE, breadcrumbHtml, facadeHtml, canonical } from '../site/site.js?v=1.6.0';
import { relatedForAnatomy, relatedCountForAnatomy, editorialHtml } from '../site/entity.js?v=1.6.0';
import { applyMeta, seoTitle, metaDescription, webPageNode } from '../site/seo.js?v=1.6.0';
renderHeader('systems'); renderFooter();
if (!PRERENDERED) {
  const [{ atlas, content }, clinical] = await Promise.all([loadData(), loadClinical()]);
  const id = pageId(); const sys = atlas.systems.find(s => s.id === id);
  const main = document.getElementById('main');
  if (!sys) { main.innerHTML = `<h1>Not found</h1><p><a href="${link.page('systems')}">All body systems</a></p>`; applyMeta({ title: `Not found | ${SITE.name}`, description: '', path: paths.dir('systems'), robots: 'noindex' }); document.body.dataset.status = '404'; throw new Error('no system'); }
  const c = content.systems[id] || {}; const path = paths.entity('systems', 'system.html', id);
  const structs = atlas.structures.map((s, i) => ({ ...s, idx: i })).filter(s => s.system === id).sort((a, b) => a.name.localeCompare(b.name));
  const organs = content.organs.filter(o => o.system === id);
  const key = (c.keyStructures || []).map(n => { const s = structs.find(x => x.name === n); return s ? `<a class="chip" href="${link.structure(s.id)}">${esc(n)}</a>` : ''; }).join('');
  const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Anatomy', href: link.page('anatomy') }, { name: 'Body systems', href: link.page('systems') }, { name: sys.name }];
  const title = seoTitle(`${sys.name} system`.replace(/ system system$/i, ' system'), 'Structures, Functions & Clinical Notes');
  const description = `${c.summary || sys.summary} ${structs.length} structures in 3D, with functions, clinical notes and related conditions, tests and procedures.`;
  const topics = clinical.systems?.[id] || {};
  const node = { '@type': 'AnatomicalSystem', '@id': canonical(path) + '#entity', name: sys.name, url: canonical(path), description: metaDescription(c.overview || sys.summary, 300),
    ...(organs.length ? { comprisedOf: organs.map(o => ({ '@type': 'AnatomicalStructure', name: o.name, url: canonical(paths.entity('anatomy', 'organ.html', o.id)) })) } : {}),
    ...(topics.conditions?.length ? { relatedCondition: topics.conditions.slice(0, 12).map(cid => ({ '@type': 'MedicalCondition', name: clinical.names.conditions[cid] || cid })) } : {}) };
  applyMeta({ title, description, path, image: link.preview('sys=' + id), breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(description), entityId: canonical(path) + '#entity', updated: c.updated }), node] });
  main.innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="eyebrow">Body system · ${fmt(sys.count)} pieces</div>
    <h1><span class="dot" style="background:${sys.color}"></span>${esc(sys.name)}</h1>
    <p class="lead">${esc(c.summary || sys.summary)}</p>
    <div class="actions">
      <a class="btn btn-primary" href="${link.system(id)}">Open in the 3D explorer</a>
      <a class="btn" href="${link.quiz(id)}">Quiz me on this system</a>
      <a class="btn" href="${link.locate(id)}">Locate structures</a>
      <a class="btn" href="${link.cards(id)}">Flashcards</a>
    </div>
    ${facadeHtml('sys=' + id, sys.name)}
    <div class="two">
      <div>
        <h2>Overview</h2>
        <p>${esc(c.overview || '')}</p>
        ${c.functions ? `<h2>Functions</h2><ul class="plain">${c.functions.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        ${c.clinical ? `<h2>Clinical notes</h2><ul class="plain">${c.clinical.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        ${organs.length ? `<h2>Organs &amp; groups in this system</h2><div class="grid">${organs.map(o => `<a class="card" href="${link.organPage(o.id)}"><h3>${esc(o.name)}</h3><p>${esc(o.summary)}</p><div class="meta">${o.structures.length} structures${o.article ? ' · full anatomy article' : ''}</div></a>`).join('')}</div>` : ''}
        <h2>All structures <span class="badge">${structs.length}</span></h2>
        <p class="muted small">${fmt(sys.count)} modelled pieces. Click a structure to open it in the atlas.</p>
        <ul class="list">${structs.map(s => `<li><a href="${link.structure(s.id)}">${esc(s.name)}</a>${s.pieces.length > 1 ? ` <span class="muted small">· ${s.pieces.length} pieces</span>` : ''}</li>`).join('')}</ul>
      </div>
      <aside class="aside">
        ${key ? `<section><h2>Key structures</h2><div class="chips">${key}</div></section>` : ''}
        ${c.related ? `<section><h2>Related systems</h2><div class="chips">${c.related.map(r => { const rs = atlas.systems.find(s => s.id === r); return rs ? `<a class="chip" href="${link.systemPage(r)}">${esc(rs.name)}</a>` : ''; }).join('')}</div></section>` : ''}
        <section><h2>Facts</h2><dl class="facts"><dt>Pieces</dt><dd>${fmt(sys.count)}</dd><dt>Structures</dt><dd>${structs.length}</dd><dt>Triangles</dt><dd>${fmt(sys.triangles)}</dd><dt>Download</dt><dd>${(sys.bytes / 1048576).toFixed(2)} MB</dd></dl></section>
        ${relatedForAnatomy('systems', id, clinical, `Related topics · ${relatedCountForAnatomy('systems', id, clinical)}`) || `<section><h2>Related topics</h2><p class="muted small">No clinical pages reference this system yet. <a href="${link.search(sys.name)}">Search the site.</a></p></section>`}
        ${editorialHtml({ updated: c.updated, references: [] })}
      </aside>
    </div>`;
}
