// site/home.js — page script for index.html: hub cards, featured entities, live counts, home metadata and schema.
import { renderHeader, renderFooter, TYPES, typeLink, entityLink, link, loadClinical, loadType, esc, fmt, SITE, PRERENDERED, iconSvg } from './site.js?v=1.10.5';
import { applyMeta, webPageNode } from './seo.js?v=1.10.5';
renderHeader('home'); renderFooter();
if (!PRERENDERED) {
  const clinical = await loadClinical().catch(() => null);
  const count = (t) => clinical ? Object.keys(clinical.names[t] || {}).length : '';
  const c = SITE.counts || {};
  applyMeta({ title: SITE.homeTitle, description: SITE.homeDescription, path: '', type: 'website', jsonld: [webPageNode({ path: '', title: SITE.homeTitle, description: SITE.homeDescription, type: 'WebPage', updated: SITE.updated })] });
  const hub = (href, eyebrow, title, text, meta, icon) => `<a class="card" href="${href}">${icon ? `<div class="icon">${iconSvg(icon)}</div>` : ''}<div class="eyebrow">${eyebrow}</div><h3>${title}</h3><p>${text}</p>${meta ? `<div class="meta">${meta}</div>` : ''}</a>`;
  document.getElementById('hubs').innerHTML = [
    hub(link.explorer(), 'Explore', '3D anatomy explorer', `Orbit, click and search every one of ${fmt(c.pieces || 2299)} pieces. Toggle systems, isolate organs, slice the body on three planes, explode it into parts.`, 'Streams in seconds · works on phones', 'explorer'),
    hub(link.page('anatomy'), 'Anatomy', 'Organs &amp; structures', `${c.organs || 48} anatomy pages: location, structure, blood supply, function and clinical relevance, with a 3D model wherever the atlas holds the organ.`, `${c.anatomyArticles || 20} full articles`, 'anatomy'),
    hub(link.page('systems'), 'Anatomy', 'Body systems', `${c.systems || 19} system pages with overviews, functions, clinical notes, every modelled structure and the topics that concern them.`, '', 'systems'),
    hub(typeLink('physiology'), 'Learn', 'Physiology', `${count('physiology')} topics on how the body works: the cardiac cycle, gas exchange, nerve signals, digestion, kidney filtration and hormone control.`, '', 'physiology'),
    hub(link.page('medical-terms'), 'Learn', 'Medical terminology', `${c.terms || 156} terms: directions, planes, movements, regions, word parts, disease processes and clinical terms, each linked into the atlas.`, '', 'terms'),
    hub(link.page('study'), 'Study', 'Quizzes, flashcards &amp; viva', 'Identify or locate highlighted structures in 3D, flip through flashcards, and test terminology, conditions, tests and medications.', '', 'study'),
  ].join('');
  // the newest articles and news briefs (hidden until the blog has indexable posts)
  const blog = await loadType('blog').catch(() => null);
  const posts = blog ? Object.values(blog.items).filter(p => p.seo?.index !== false).sort((a, b) => String(b.published).localeCompare(String(a.published)) || a.name.localeCompare(b.name)).slice(0, 3) : [];
  if (posts.length) {
    const day = (d) => { const t = new Date(String(d) + 'T12:00:00Z'); return isNaN(t) ? '' : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
    document.getElementById('latest').innerHTML = posts.map(p => `<a class="card" href="${entityLink('blog', p.id)}"><div class="meta"><span class="badge${p.kind === 'news' ? ' live' : ''}">${p.kind === 'news' ? 'Health news' : 'Guide'}</span> <time datetime="${esc(p.published)}">${esc(day(p.published))}</time></div><h3>${esc(p.name)}</h3><p>${esc(p.summary || '')}</p></a>`).join('');
    document.getElementById('latest-wrap').hidden = false;
    const more = document.querySelector('#latest-wrap .actions a'); if (more) more.href = typeLink('blog');
  }
  const featured = [['organ', 'heart', 'Heart'], ['organ', 'brain', 'Brain'], ['organ', 'liver', 'Liver'], ['organ', 'lungs', 'Lungs'], ['organ', 'kidneys', 'Kidneys'], ['organ', 'knee', 'Knee joint'], ['tests', 'complete-blood-count', 'Complete blood count'], ['tests', 'ecg', 'ECG'], ['imaging', 'mri', 'MRI'], ['symptoms', 'chest-pain', 'Chest pain'], ['conditions', 'hypertension', 'Hypertension'], ['medications', 'amlodipine', 'Amlodipine'], ['drug-classes', 'statins', 'Statins'], ['physiology', 'cardiac-cycle', 'Cardiac cycle'], ['first-aid', 'cpr', 'CPR']];
  document.getElementById('featured').innerHTML = featured.map(([t, id, n]) => `<a class="chip chip-lg" href="${t === 'organ' ? link.organPage(id) : entityLink(t, id)}">${esc(n)}</a>`).join('');
  // the conditions and medicines people look up most: the hubs' "Start here" lists (content `_priority`, chosen from UK search demand), linked from the home page
  for (const [type, id] of [['conditions', 'popular-conditions'], ['medications', 'popular-medicines']]) {
    const td = await loadType(type).catch(() => null); const box = document.getElementById(id); if (!td || !box) continue;
    box.innerHTML = (td.meta.priority || []).slice(0, 12).map(x => td.items[x]).filter(Boolean).map(e => `<a class="chip chip-lg" href="${entityLink(type, e.id)}">${esc(e.name)}</a>`).join('');
  }
  const card = (t) => `<a class="card" href="${typeLink(t)}"><div class="icon">${iconSvg(TYPES[t].icon)}</div><h3>${esc(TYPES[t].name)} ${count(t) ? `<span class="badge">${count(t)}</span>` : ''}</h3><p>${esc(TYPES[t].blurb)}</p></a>`;
  document.getElementById('types').innerHTML = ['symptoms', 'conditions', 'tests', 'biomarkers', 'imaging', 'procedures', 'medications', 'drug-classes', 'targets'].map(card).join('');
  document.getElementById('everyday').innerHTML = card('first-aid') + card('health') + `<a class="card" href="${link.checker()}"><div class="icon">${iconSvg('interactions')}</div><h3>Drug Interaction Checker</h3><p>Add two or more medicines, brands or combination products and see what the official sources say about each pair: severity, mechanism, management and monitoring, never a bare "safe".</p></a><a class="card" href="${link.compare()}"><div class="icon">${iconSvg('compare')}</div><h3>Comparisons</h3><p>CRP vs ESR, creatinine vs eGFR, ECG vs echocardiogram, CT vs MRI, TSH vs free T4, HbA1c vs glucose, atorvastatin vs rosuvastatin: what each is for and how they differ.</p></a><a class="card" href="${link.search()}"><div class="icon">${iconSvg('search')}</div><h3>Search everything</h3><p>One search across structures, organs, systems, terms and every clinical topic, with results that link straight into the 3D atlas.</p></a>`;
  const stats = document.querySelectorAll('.stat b');
  if (c.pieces) { stats[0].textContent = fmt(c.pieces); stats[1].textContent = fmt(c.structures); stats[2].textContent = fmt(c.topics); stats[3].textContent = fmt(c.links); }
  for (const a of document.querySelectorAll('.hero .actions a, .hero-art, .callout a, .hero-note a')) { const h = a.getAttribute('href') || ''; if (h === 'explorer/') a.href = link.explorer(); else if (h === 'anatomy/heart/') a.href = link.organPage('heart'); else if (/^(symptoms|tests|imaging|drug-classes|first-aid)\/([a-z0-9-]+)\/$/.test(h)) { const [, t, id] = h.match(/^([a-z-]+)\/([a-z0-9-]+)\/$/); a.href = entityLink(t, id); } else if (h.endsWith('/') && !h.includes('.')) a.href = link.page(h.replace(/\/$/, '')); }
  const hs = document.querySelector('.hero-search'); if (hs) hs.action = link.search();
}
