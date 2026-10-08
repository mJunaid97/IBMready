// anatomy/index.js — the anatomy hub (/anatomy/): what is covered, the fully written organ articles first, then every
// organ and skeletal group grouped by body system, regions and the atlas entry points.
import { renderHeader, renderFooter, loadData, loadClinical, link, esc, paths, PRERENDERED, SITE, breadcrumbHtml, canonical, fmt, iconSvg, structuresLabel, emptyHtml } from '../site/site.js';
import { relatedCountForAnatomy } from '../site/entity.js';
import { applyMeta, metaDescription, webPageNode } from '../site/seo.js';
renderHeader('anatomy'); renderFooter();
if (!PRERENDERED) {
  const [{ atlas, content }, clinical] = await Promise.all([loadData(), loadClinical()]);
  const path = paths.dir('anatomy'); const crumbs = [{ name: 'Home', href: link.home() }, { name: 'Anatomy' }];
  const written = content.organs.filter(o => o.article); const rest = content.organs.filter(o => !o.article);
  const title = `Human Anatomy: Organs & Structures A–Z | ${SITE.name}`;
  const description = `Explore human anatomy organ by organ: location, structure, blood supply, function and clinical relevance, each with an interactive 3D model and links to the conditions, tests and procedures that concern it.`;
  applyMeta({ title, description, path, breadcrumbs: crumbs, jsonld: [webPageNode({ path, title, description: metaDescription(description), type: 'CollectionPage', updated: content.anatomyUpdated }),
    { '@type': 'ItemList', name: `Anatomy pages on ${SITE.name}`, numberOfItems: content.organs.length, itemListElement: content.organs.map((o, i) => ({ '@type': 'ListItem', position: i + 1, name: o.name, url: canonical(paths.entity('anatomy', 'organ.html', o.id)) })) }] });
  const card = (o) => `<a class="card" data-system="${esc(o.system)}" data-name="${esc([o.name, ...(o.aliases || [])].join(' ').toLowerCase())}" data-article="${o.article ? 1 : 0}" href="${link.organPage(o.id)}"><h3>${esc(o.name)}</h3><p>${esc(o.article ? o.article.intro.slice(0, 150).replace(/\s+\S*$/, '') + '…' : o.summary)}</p><div class="meta">${structuresLabel(o)} · ${relatedCountForAnatomy('organs', o.id, clinical)} topics${o.article ? ' · full article' : ''}</div></a>`;
  const bySys = new Map(); for (const o of content.organs) { if (!bySys.has(o.system)) bySys.set(o.system, []); bySys.get(o.system).push(o); }
  const az = [...content.organs].sort((a, b) => a.name.localeCompare(b.name));
  document.getElementById('main').innerHTML = `
    ${breadcrumbHtml(crumbs)}
    <div class="section-hero"><div class="eyebrow">${iconSvg('anatomy')} Section · ${content.organs.length} anatomy pages · ${fmt(atlas.totals.structures)} structures in 3D</div><h1>Human anatomy</h1>
    <p class="lead">Every organ page answers the same questions: where it is, what it is made of, what supplies it, what it does, what goes wrong and how that is investigated and treated. Most are built on the ${fmt(atlas.totals.pieces)}-piece 3D atlas, so you can open the real shapes; the female reproductive organs, the breasts and the anatomy of gender-affirming surgery, which the atlas's adult male reference body does not model, show the modelled structures around them instead. Each links into physiology, symptoms, conditions, tests, imaging, procedures and medications.</p></div>
    <section class="hub-filters" aria-label="Filter anatomy pages">
      <div class="search-row"><label class="sr-only" for="q">Filter anatomy pages by name</label><input id="q" type="search" placeholder="Filter anatomy pages, e.g. liver, femur, uterus…" autocomplete="off"></div>
      <div class="filters" id="filters" role="group" aria-label="Filter by body system"><button class="chip is-active" data-system="all" type="button" aria-pressed="true">All ${content.organs.length}</button>${atlas.systems.filter(s => bySys.has(s.id)).map(s => `<button class="chip" data-system="${esc(s.id)}" type="button" aria-pressed="false" style="border-color:${s.color}">${esc(s.name)} ${bySys.get(s.id).length}</button>`).join('')}<button class="chip" data-system="articles" type="button" aria-pressed="false">Full articles ${written.length}</button></div>
      <div class="hub-count"><p id="hub-count" role="status" aria-live="polite">Showing all ${content.organs.length} anatomy pages</p><button type="button" class="btn btn-sm btn-text" id="clear-filters" hidden>Clear filters</button></div>
    </section>
    <div id="no-organs" hidden></div>
    <section class="organ-block" data-block="written"><h2>Start here: full anatomy articles</h2>
    <div class="grid grid-3">${written.map(card).join('')}</div></section>
    <h2>Explore by body system</h2>
    <p class="muted">Each system page lists every modelled structure with an overview, functions and clinical notes.</p>
    <div class="chips">${atlas.systems.map(s => `<a class="chip" href="${link.systemPage(s.id)}" style="border-color:${s.color}">${esc(s.name)} · ${fmt(s.count)}</a>`).join('')}</div>
    <h2>Explore by region</h2>
    <div class="chips">${content.regions.map(r => `<a class="chip" href="${link.region(r.id)}">${esc(r.name)} · ${r.structures.length} structures in 3D</a>`).join('')}</div>
    ${atlas.systems.filter(s => bySys.has(s.id)).map(s => `<section class="organ-block" data-block="${esc(s.id)}"><h2><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</h2><div class="grid grid-3">${bySys.get(s.id).map(card).join('')}</div></section>`).join('')}
    <h2>A–Z</h2>
    <div class="chips">${az.map(o => `<a class="chip" href="${link.organPage(o.id)}">${esc(o.name)}</a>`).join('')}</div>
    <h2>Keep exploring</h2>
    <div class="chips"><a class="chip" href="${link.explorer()}">${iconSvg('explorer')}3D explorer</a><a class="chip" href="${link.page('systems')}">Body systems</a><a class="chip" href="${link.page('organs')}">Organs by system</a><a class="chip" href="${link.page('medical-terms')}">Medical terms</a><a class="chip" href="${link.page('study')}">Study tools</a></div>`;
}
// ---- interactivity (both modes): the text filter and system chips hide cards and empty blocks in place; the state is
// mirrored into the URL (?system=&q=) so a filtered view can be linked. "Full articles" is a pseudo-system.
{
  const q = document.getElementById('q'), filters = document.getElementById('filters'), countEl = document.getElementById('hub-count'), clear = document.getElementById('clear-filters'), none = document.getElementById('no-organs');
  if (q && filters) {
    let system = 'all'; const total = document.querySelectorAll('.organ-block[data-block]:not([data-block="written"]) .card').length;
    const setSystem = (id) => { system = id; for (const x of filters.children) { const on = x.dataset.system === id; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); } };
    const render = () => {
      const s = q.value.trim().toLowerCase(); const all = system === 'all' && !s; let shown = 0;
      for (const block of document.querySelectorAll('.organ-block')) {
        let any = false;
        for (const c of block.querySelectorAll('.card')) { const show = (system === 'all' || (system === 'articles' ? c.dataset.article === '1' : c.dataset.system === system)) && (!s || c.dataset.name.includes(s)); c.hidden = !show; if (show) { any = true; if ((block.dataset.block === 'written') === (system === 'articles')) shown++; } }
        // 'Full articles' shows only the Start-here block (each article also sits in its system block, so hide those to avoid duplicates)
        block.hidden = !any || (system === 'articles' ? block.dataset.block !== 'written' : !all && block.dataset.block === 'written');
      }
      if (countEl) countEl.textContent = all ? `Showing all ${total} anatomy pages` : shown ? `Showing ${shown} of ${total} anatomy pages` : 'No anatomy pages match the current filters';
      if (clear) clear.hidden = all;
      if (none) { none.hidden = shown > 0; none.innerHTML = shown ? '' : emptyHtml('No anatomy pages match', 'Try another name or body system. Every modelled structure is also searchable in the 3D explorer.', `<button type="button" class="btn btn-sm" data-clear>Clear filters</button><a class="btn btn-sm btn-text" href="${link.explorer()}">Open the 3D explorer</a>`); }
      const u = new URL(location.href); system !== 'all' ? u.searchParams.set('system', system) : u.searchParams.delete('system'); s ? u.searchParams.set('q', q.value.trim()) : u.searchParams.delete('q'); if (u.href !== location.href) history.replaceState(null, '', u);
    };
    const reset = () => { setSystem('all'); q.value = ''; render(); q.focus(); };
    filters.addEventListener('click', (e) => { const b = e.target.closest('[data-system]'); if (!b) return; setSystem(b.dataset.system); render(); });
    q.addEventListener('input', render); clear?.addEventListener('click', reset); none?.addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) reset(); });
    const sp = new URLSearchParams(location.search); let restored = false;
    if (sp.get('system') && [...filters.children].some(x => x.dataset.system === sp.get('system'))) { setSystem(sp.get('system')); restored = true; }
    if (sp.get('q')) { q.value = sp.get('q'); restored = true; }
    if (restored) render();
  }
}
