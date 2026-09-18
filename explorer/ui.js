/**
 * ui.js — navigator (systems / organs / regions), search, picking interactions,
 * structure card, toolbar, labels, study mode, keyboard shortcuts and URL state.
 */
import { CONFIG } from '../site/config.js';
import { buildIndex, search } from './search.js';

const PRESETS = {
  all: null,
  skeleton: ['skeleton', 'joints', 'teeth'],
  organs: ['heart', 'respiratory', 'digestive', 'urinary', 'reproductive', 'endocrine', 'lymphatic', 'sensory', 'nervous'],
  vessels: ['heart', 'arteries', 'veins'],
  nerves: ['nervous', 'sensory', 'skeleton'],
  // the female body: every default system except the male reproductive organs, plus the female layer
  female: ['skeleton', 'joints', 'teeth', 'muscles', 'heart', 'arteries', 'veins', 'nervous', 'sensory', 'respiratory', 'digestive', 'urinary', 'reproductive-female', 'endocrine', 'lymphatic'],
};

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('en-US');
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class AtlasUI {
  constructor(viewer, atlas, content, clinical) {
    this.v = viewer; this.atlas = atlas;
    this.content = content || { systems: {}, organs: [], regions: [], structures: {} };
    this.clinical = clinical || null;           // data/content/clinical.json: entity names + organ/system/structure backlinks
    this.embedded = window.self !== window.top;
    this.pretty = !!CONFIG.prettyUrls;
    this.sysById = new Map(atlas.systems.map(s => [s.id, s]));
    this.structOfPiece = atlas.pieces.map(p => p.structure);
    this.pinned = new Set();
    this.labelsOn = true;
    this.selectionLabel = null;        // { kind: 'organ'|'concept'|'region', name, summary, id }
    this.activeRegion = null;
    this.conceptPieces = this._buildConceptMap();
    this.organPieces = (this.content.organs || []).map(o => o.structures.flatMap(si => atlas.structures[si].pieces));
    this.regionPieces = (this.content.regions || []).map(r => r.structures.flatMap(si => atlas.structures[si].pieces));
    this.index = buildIndex(atlas, this.conceptCounts);
    for (const [i, o] of (this.content.organs || []).entries()) {
      const aliases = (o.aliases || []).map(a => a.toLowerCase()), words = [o.name, ...(o.aliases || [])].join(' ').toLowerCase().split(/[^a-z]+/).filter(Boolean);
      if (o.structures.length) this.index.push({ type: 'organ', id: o.id, idx: i, name: o.name, norm: o.name.toLowerCase(), aliases, words, sub: `${o.structures.length} structures · ${this.sysById.get(o.system)?.name || ''}`, system: o.system, rank: 2.6 });
      else this.index.push({ type: 'topic', kind: 'anatomy', id: o.id, name: o.name, norm: o.name.toLowerCase(), aliases, words, sub: 'anatomy article · not modelled in 3D, opens the page', href: this.organHref(o.id), rank: 2.2 });   // the vulva: no layer models it
    }
    for (const [i, r] of (this.content.regions || []).entries()) this.index.push({ type: 'region', id: r.id, idx: i, name: r.name, norm: r.name.toLowerCase(), words: r.name.toLowerCase().split(/[^a-z]+/).filter(Boolean), sub: `${r.structures.length} structures`, rank: 2.4 });
    if (this.clinical) for (const [kind, names] of Object.entries(this.clinical.names)) for (const [id, name] of Object.entries(names))
      this.index.push({ type: 'topic', kind, id, name, norm: name.toLowerCase(), words: name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean), sub: `${this.clinical.types[kind].singular} · opens the page`, href: this.topicHref(kind, id), rank: 1.6 });
    this._buildNavigator();
    this._bindSearch();
    this._bindPointer();
    this._bindToolbar();
    this._bindInfo();
    this._bindStudy();
    this._bindKeys();
    this._bindMisc();
    this.v.addEventListener('select', () => this._onSelect());
    this.v.addEventListener('visibility', () => this._onVisibility());
    this.v.addEventListener('frame', () => this._updateLabels());
    this.v.addEventListener('system', (e) => this._onSystemLoaded(e.detail));
    this.v.addEventListener('xray', (e) => { $('btn-xray').setAttribute('aria-pressed', String(e.detail)); this._updateShareState(); });
    this.v.addEventListener('autoxray', () => this.toast('X-ray on: this structure sits inside the body · X toggles'));
    this._onVisibility();
    if (window.matchMedia('(max-width: 900px)').matches) { $('panel-systems').hidden = true; $('tab-systems').hidden = false; }
  }

  // ---------------------------------------------------------------- data
  _buildConceptMap() {
    const map = new Map(); const counts = new Array(this.atlas.concepts.length).fill(0);
    this.atlas.pieces.forEach((p, i) => { for (const c of p.parents || []) { if (!map.has(c)) map.set(c, []); map.get(c).push(i); counts[c]++; } });
    this.conceptCounts = counts;
    return map;
  }
  structure(i) { return this.atlas.structures[i]; }
  piecesOfStructure(si) { return this.atlas.structures[si].pieces; }
  primaryStructure() { const f = [...this.v.selected][0]; return f === undefined ? -1 : this.structOfPiece[f]; }
  contentOf(si) { return this.content.structures[this.structure(si).id] || null; }
  topicHref(kind, id) { const t = this.clinical && this.clinical.types[kind]; if (!t) return '#'; return this.pretty ? `../${t.dir}/${encodeURIComponent(id)}/` : `../${t.dir}/${t.page}?id=${encodeURIComponent(id)}`; }
  organHref(id) { return this.pretty ? `../anatomy/${encodeURIComponent(id)}/` : `../anatomy/organ.html?id=${encodeURIComponent(id)}`; }
  /** Clinical topics that reference a structure directly or through its organ. Returns [{kind, name, ids}] in a fixed order. */
  clinicalFor(si, organId) {
    if (!this.clinical) return [];
    const st = si >= 0 ? this.structure(si) : null;
    const sources = [st ? this.clinical.structures[st.id] : null, organId ? this.clinical.organs[organId] : null].filter(Boolean);
    if (!sources.length) return [];
    const order = ['conditions', 'symptoms', 'physiology', 'tests', 'biomarkers', 'imaging', 'procedures', 'medications', 'drug-classes', 'targets', 'first-aid', 'health'].filter(k => this.clinical.types[k]);
    return order.map(kind => ({ kind, name: this.clinical.types[kind].name, ids: [...new Set(sources.flatMap(m => m[kind] || []))] })).filter(g => g.ids.length);
  }
  _renderClinical(groups, organId) {
    const wrap = $('info-clinical-wrap'); const box = $('info-clinical');
    if (!groups.length) { wrap.hidden = true; box.innerHTML = ''; return; }
    const target = this.embedded ? ' target="_top"' : '';
    box.innerHTML = groups.map(g => `<div class="clin-group"><span class="eyebrow">${esc(g.name)}</span><div class="chips">${g.ids.slice(0, 5).map(id => `<a class="chip" href="${this.topicHref(g.kind, id)}"${target}>${esc(this.clinical.names[g.kind][id] || id)}</a>`).join('')}${g.ids.length > 5 ? `<span class="chip chip-sm">+${g.ids.length - 5}</span>` : ''}</div></div>`).join('')
      + (organId ? `<a class="clin-more" href="${this.organHref(organId)}"${target}>All topics for the ${esc((this.organ(organId) || {}).name || organId).toLowerCase()} ↗</a>` : '');
    wrap.hidden = false;
  }
  organ(id) { return (this.content.organs || []).find(o => o.id === id); }
  organIndex(id) { return (this.content.organs || []).findIndex(o => o.id === id); }
  region(id) { return (this.content.regions || []).find(r => r.id === id); }

  // ------------------------------------------------------------ navigator
  _buildNavigator() {
    const ul = $('systems'); ul.innerHTML = '';
    for (const s of this.atlas.systems) {
      const li = document.createElement('li'); li.dataset.id = s.id; li.className = 'is-loading';
      li.innerHTML = `<span class="sys-dot" style="background:${s.color}"></span><span class="sys-name">${esc(s.name)}${s.id === 'skin' ? '<small>translucent overlay</small>' : s.note ? `<small>${esc(s.note)}</small>` : ''}</span><span class="sys-count">${fmt(s.count)}</span><button class="switch" role="switch" aria-checked="true" aria-label="Toggle ${esc(s.name)}"></button>`;
      li.querySelector('.switch').addEventListener('click', (e) => { e.stopPropagation(); this.toggleSystem(s.id); });
      li.addEventListener('click', () => this.soloSystem(s.id));
      li.title = `${s.summary}\nClick: show only this system · Switch: toggle`;
      ul.appendChild(li);
    }
    const ol = $('organs'); ol.innerHTML = '';
    (this.content.organs || []).forEach((o, i) => {
      if (!o.structures.length) return;          // an organ the atlas does not model (its anatomy page shows the surrounding structures instead)
      const sys = this.sysById.get(o.system);
      const li = document.createElement('li'); li.dataset.id = o.id;
      li.innerHTML = `<span class="sys-dot" style="background:${sys ? sys.color : '#999'}"></span><span class="sys-name">${esc(o.name)}<small>${esc(sys ? sys.name : '')}</small></span><span class="sys-count">${o.structures.length}</span><span></span>`;
      li.title = o.summary; li.addEventListener('click', () => this.selectOrgan(i, { focus: true }));
      ol.appendChild(li);
    });
    const rl = $('regions'); rl.innerHTML = '';
    (this.content.regions || []).forEach((r, i) => {
      const li = document.createElement('li'); li.dataset.id = r.id;
      li.innerHTML = `<span class="sys-dot" style="background:var(--accent)"></span><span class="sys-name">${esc(r.name)}<small>${esc(r.summary || '')}</small></span><span class="sys-count">${r.structures.length}</span><span></span>`;
      li.addEventListener('click', () => this.isolateRegion(i));
      rl.appendChild(li);
    });
    $('nav-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tab]'); if (!b) return;
      for (const x of $('nav-tabs').children) x.classList.toggle('is-active', x === b);
      for (const t of ['systems', 'organs', 'regions']) $('nav-' + t).hidden = t !== b.dataset.tab;
    });
    $('btn-region-clear').addEventListener('click', () => this.clearRegion());
    $('presets').addEventListener('click', (e) => { const b = e.target.closest('button[data-preset]'); if (b) this.applyPreset(b.dataset.preset); });
    $('btn-show-all').addEventListener('click', () => { const layersOn = this.atlas.systems.filter(s => s.hidden && this.v.sysIndex.get(s.id).visible).map(s => s.id); this.v.unhideAll(); this.v.setSystemsVisible([...this.atlas.systems.filter(s => s.id !== 'skin' && !s.hidden).map(s => s.id), ...layersOn]); this._setPresetActive(layersOn.length ? null : 'all'); this.toast(layersOn.length ? 'Default systems visible, with the layers you had on' : 'Default systems visible'); });
    $('btn-hide-all').addEventListener('click', () => { this.v.setSystemsVisible([]); this._setPresetActive(null); });
    $('btn-collapse-left').addEventListener('click', () => { $('panel-systems').hidden = true; $('tab-systems').hidden = false; });
    $('tab-systems').addEventListener('click', () => { $('panel-systems').hidden = false; $('tab-systems').hidden = true; });
  }
  toggleSystem(id) { const s = this.v.sysIndex.get(id); if (s.visible) this.v.setSystemVisible(id, false); else this._switchOn(id); this._setPresetActive(null); }
  /** Show a system. A layer that stands in for parts of the reference body (the female body for the male reproductive
   *  organs, bladder and urethra) hides those pieces while it is on (the viewer's `hides` mask); say so once. */
  _switchOn(id) {
    const s = this.v.sysIndex.get(id); this.v.setSystemVisible(id, true);
    if (s.hidePieces && s.hidePieces.length && !this._hidesToasted?.has(id)) { (this._hidesToasted ||= new Set()).add(id); this.toast(`${s.def.hidesLabel || 'Overlapping structures of the reference body'} hidden while ${s.def.name} is shown · switch the layer off to bring them back`); }
  }
  soloSystem(id) { this.v.setSystemsVisible([id]); this._setPresetActive(null); }
  applyPreset(name) {
    const ids = PRESETS[name];
    this.v.setSystemsVisible(ids || this.atlas.systems.filter(s => s.id !== 'skin' && !s.hidden).map(s => s.id));
    this._setPresetActive(name);
  }
  _setPresetActive(name) { for (const b of $('presets').querySelectorAll('button')) b.classList.toggle('is-active', b.dataset.preset === name); }
  _onVisibility() {
    for (const li of $('systems').children) {
      const s = this.v.sysIndex.get(li.dataset.id);
      li.classList.toggle('is-off', !s.visible);
      li.querySelector('.switch').setAttribute('aria-checked', String(s.visible));
    }
    $('visible-count').textContent = `${fmt(this.v.visibleCount())} of ${fmt(this.v.n)} pieces visible`;
    this._updateShareState();
  }
  _onSystemLoaded(def) {
    const li = $('systems').querySelector(`li[data-id="${def.id}"]`); if (li) li.classList.remove('is-loading');
    // a study deep link can arrive before its system's geometry: start once the pieces are in
    if (this.studyOpen && !this.study.current && !(this.study.mode === 'cards' && this.study.deck.length)) this.startStudy();
  }

  isolateRegion(ri) {
    const r = this.content.regions[ri]; if (!r) return;
    this.activeRegion = r.id;
    this.v.select([]);
    this.v.isolate(this.regionPieces[ri]);
    for (const li of $('regions').children) li.classList.toggle('is-active', li.dataset.id === r.id);
    $('region-active').textContent = `${r.name}: ${fmt(this.regionPieces[ri].length)} pieces`;
    this.v.focus(this.regionPieces[ri]);
    this._updateShareState();
  }
  clearRegion() {
    this.activeRegion = null; this.v.isolate(null);
    for (const li of $('regions').children) li.classList.remove('is-active');
    $('region-active').textContent = 'Whole body';
    this.v.resetView(); this._updateShareState();
  }

  // -------------------------------------------------------------- search
  _bindSearch() {
    const input = $('search-input'), list = $('search-results'), box = $('search');
    let results = [], active = -1;
    const close = () => { list.hidden = true; box.setAttribute('aria-expanded', 'false'); active = -1; };
    const render = () => {
      list.innerHTML = '';
      if (!results.length) list.innerHTML = '<li class="r-empty">No matches. Try a bone, muscle, vessel, nerve or organ name.</li>';
      results.forEach((r, i) => {
        const li = document.createElement('li'); li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === active));
        li.innerHTML = `<div><div class="r-name">${esc(r.name)}</div><div class="r-sub">${esc(r.sub)}</div></div><span class="r-type">${r.type}</span>`;
        li.addEventListener('mousedown', (e) => { e.preventDefault(); this.openResult(r); close(); input.blur(); });
        list.appendChild(li);
      });
      list.hidden = false; box.setAttribute('aria-expanded', 'true');
    };
    input.addEventListener('input', () => { const q = input.value.trim(); if (!q) { close(); return; } results = search(this.index, q); active = results.length ? 0 : -1; render(); });
    input.addEventListener('focus', () => { if (input.value.trim() && results.length) render(); });
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (results.length) { active = (active + 1) % results.length; render(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (results.length) { active = (active - 1 + results.length) % results.length; render(); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && results[active]) { this.openResult(results[active]); close(); input.blur(); } }
      else if (e.key === 'Escape') { input.value = ''; close(); input.blur(); }
    });
  }
  openResult(r) {
    if (r.type === 'structure') this.selectStructure(r.idx, { focus: true });
    else if (r.type === 'concept') this.selectConcept(r.idx, { focus: true });
    else if (r.type === 'organ') this.selectOrgan(r.idx, { focus: true });
    else if (r.type === 'region') this.isolateRegion(r.idx);
    else if (r.type === 'system') { this.soloSystem(r.id); this.v.select([]); this.v.setView('frontLeft'); this.toast(`Showing ${r.name} only`); }
    else if (r.type === 'topic') { if (this.embedded) window.open(r.href, '_top'); else location.href = r.href; }
  }

  // ------------------------------------------------------- selection API
  _ensureVisible(pieces) {
    const systems = new Set(pieces.map(i => this.atlas.pieces[i].system));
    for (const s of systems) if (!this.v.sysIndex.get(s).visible) { this._switchOn(s); this._setPresetActive(null); }
    if (pieces.some(i => this.v.hidden[i])) this.v.hidePieces(pieces, false);
    if (this.v.isolated && pieces.some(i => !this.v.isolated.has(i))) { this.v.isolate(null); this.activeRegion = null; for (const li of $('regions').children) li.classList.remove('is-active'); $('region-active').textContent = 'Whole body'; }
  }
  selectStructure(si, { focus = false, additive = false } = {}) {
    const pieces = this.piecesOfStructure(si);
    this._ensureVisible(pieces);
    this.selectionLabel = null;
    this.v.select(pieces, { additive });
    if (focus) this.v.focus([...this.v.selected]);
  }
  selectConcept(ci, { focus = false } = {}) {
    const pieces = this.conceptPieces.get(ci) || []; if (!pieces.length) return;
    this._ensureVisible(pieces);
    const c = this.atlas.concepts[ci];
    this.selectionLabel = { kind: 'concept', id: c.id, name: cap(c.name), summary: `All ${pieces.length} modelled pieces grouped under “${c.name}” in the atlas hierarchy.` };
    this.v.select(pieces);
    if (focus) this.v.focus(pieces);
  }
  selectOrgan(oi, { focus = false } = {}) {
    const o = this.content.organs[oi]; const pieces = this.organPieces[oi]; if (!o || !pieces.length) return;
    this._ensureVisible(pieces);
    this.selectionLabel = { kind: 'organ', id: o.id, name: o.name, summary: o.summary, system: o.system };
    this.v.select(pieces);
    for (const li of $('organs').children) li.classList.toggle('is-active', li.dataset.id === o.id);
    if (focus) this.v.focus(pieces);
  }

  // ------------------------------------------------------------- pointer
  _bindPointer() {
    const canvas = this.v.canvas; const tip = $('hover-tip');
    let down = null, moved = false, lastTap = 0;
    canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button, shift: e.shiftKey || e.ctrlKey || e.metaKey }; moved = false; });
    canvas.addEventListener('pointermove', (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) moved = true;
      if (e.pointerType === 'mouse' && !down) this._queueHover(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointerleave', () => this._queueHover(-1, -1));
    canvas.addEventListener('pointerup', (e) => {
      if (!down || moved || down.button !== 0 || performance.now() - down.t > 600) { down = null; return; }
      const now = performance.now(); const dbl = now - lastTap < 350; lastTap = now;
      const i = this.v.pick(e.clientX, e.clientY);
      if (i < 0) { if (!down.shift) this.v.select([]); down = null; return; }
      if (dbl) { this.v.focus(this.piecesOfStructure(this.structOfPiece[i])); down = null; return; }
      const si = this.structOfPiece[i];
      if (this.studyOpen && this.study.mode === 'locate' && this.study.current && !this.study.current.done) { this.study.locateAnswer(si); down = null; return; }
      const already = this.piecesOfStructure(si).every(p => this.v.selected.has(p));
      if (down.shift) { if (already) { const keep = [...this.v.selected].filter(p => this.structOfPiece[p] !== si); this.selectionLabel = null; this.v.select(keep); } else this.selectStructure(si, { additive: true }); }
      else this.selectStructure(si);
      down = null;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this._tip = tip;
  }
  _queueHover(x, y) {
    this._pendingHover = { x, y };
    if (this._hoverRaf) return;
    this._hoverRaf = requestAnimationFrame(() => {
      this._hoverRaf = 0; const p = this._pendingHover; if (!p) return;
      const i = p.x < 0 ? -1 : this.v.pick(p.x, p.y);
      this.v.hover(i);
      this.v.canvas.classList.toggle('is-hovering', i >= 0);
      const tip = this._tip;
      if (i >= 0 && this.labelsOn && !this.studyHideNames) {
        const st = this.structure(this.structOfPiece[i]);
        tip.innerHTML = `${esc(st.name)}<small>${esc(this.sysById.get(st.system).name)}${st.pieces.length > 1 ? ` · ${st.pieces.length} pieces` : ''}</small>`;
        tip.style.left = p.x + 'px'; tip.style.top = p.y + 'px'; tip.hidden = false;
      } else tip.hidden = true;
    });
  }

  // -------------------------------------------------------------- toolbar
  _bindToolbar() {
    const explode = $('explode');
    explode.addEventListener('input', () => this.v.setExplode(explode.value / 100));
    this.v.addEventListener('explode', (e) => { explode.value = Math.round(e.detail * 100); this._updateShareState(); });
    $('explode-mode').addEventListener('click', () => {
      const grid = this.v.explodeMode !== 'grid';
      this.v.setExplodeMode(grid ? 'grid' : 'radial');
      $('explode-mode').textContent = grid ? 'Inventory' : 'Radial';
      if (this.v.explodeT === 0) this.v.setExplode(1, { animate: true });
      this.v.setView('front');
    });
    const slice = $('slice'), flip = $('slice-flip');
    $('slice-axis').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-axis]'); if (!b) return;
      for (const x of $('slice-axis').children) x.classList.toggle('is-active', x === b);
      const axis = b.dataset.axis === 'off' ? null : b.dataset.axis;
      slice.disabled = flip.disabled = !axis;
      this.v.setSlice({ axis, t: slice.value / 100 });
    });
    slice.addEventListener('input', () => this.v.setSlice({ t: slice.value / 100 }));
    flip.addEventListener('click', () => { this.v.setSlice({ flip: !this.v.slice.flip }); flip.classList.toggle('is-active', this.v.slice.flip); });
    $('btn-xray').addEventListener('click', () => this.setXray(!this.v.xray));
    $('btn-labels').addEventListener('click', () => { this.labelsOn = !this.labelsOn; $('btn-labels').setAttribute('aria-pressed', String(this.labelsOn)); this._updateLabels(); });
    $('views').addEventListener('click', (e) => { const b = e.target.closest('button[data-view]'); if (b) this.v.setView(b.dataset.view); });
    $('btn-reset').addEventListener('click', () => this.resetAll());
  }
  setXray(on) { this.v.setXray(on); }
  setSliceAxis(axis) {
    for (const x of $('slice-axis').children) x.classList.toggle('is-active', x.dataset.axis === (axis || 'off'));
    $('slice').disabled = $('slice-flip').disabled = !axis;
    this.v.setSlice({ axis, t: $('slice').value / 100 });
  }
  resetAll() {
    this.selectionLabel = null; this.v.select([]); this.v.unhideAll(); this.applyPreset('all');
    this.clearRegion();
    this.v.setExplode(0, { animate: true }); this.v.setExplodeMode('radial'); $('explode-mode').textContent = 'Radial';
    this.v.setSlice({ axis: null, t: 0.5, flip: false }); $('slice').value = 50; $('slice').disabled = $('slice-flip').disabled = true; $('slice-flip').classList.remove('is-active');
    for (const x of $('slice-axis').children) x.classList.toggle('is-active', x.dataset.axis === 'off');
    this.setXray(false); this.pinned.clear(); this._updateLabels();
    for (const li of $('organs').children) li.classList.remove('is-active');
    this.v.resetView();
  }

  // ------------------------------------------------------------ info card
  _bindInfo() {
    $('btn-close-info').addEventListener('click', () => this.v.select([]));
    $('btn-clear').addEventListener('click', () => this.v.select([]));
    $('btn-isolate').addEventListener('click', () => this.isolateSelection());
    $('btn-focus').addEventListener('click', () => this.v.focus([...this.v.selected]));
    $('btn-hide').addEventListener('click', () => this.hideSelection());
    $('btn-pair').addEventListener('click', () => { const si = this.primaryStructure(); const st = this.structure(si); if (st && st.pair !== undefined) this.selectStructure(st.pair, { focus: true }); });
    $('btn-pin').addEventListener('click', () => { const si = this.primaryStructure(); if (si < 0) return; if (this.pinned.has(si)) this.pinned.delete(si); else this.pinned.add(si); this._renderInfo(); this._updateLabels(); });
    $('info-parents').addEventListener('click', (e) => { const b = e.target.closest('[data-concept]'); if (b) this.selectConcept(+b.dataset.concept, { focus: true }); });
    $('info-related').addEventListener('click', (e) => { const b = e.target.closest('[data-structure]'); if (b) this.selectStructure(+b.dataset.structure, { focus: true }); });
    $('info-tags').addEventListener('click', (e) => {
      const o = e.target.closest('[data-organ]'); if (o) { this.selectOrgan(this.organIndex(o.dataset.organ), { focus: true }); return; }
      const r = e.target.closest('[data-region]'); if (r) { const ri = this.content.regions.findIndex(x => x.id === r.dataset.region); if (ri >= 0) this.isolateRegion(ri); }
    });
  }
  isolateSelection() {
    const sel = [...this.v.selected]; if (!sel.length) return;
    const on = !this.v.isolated;
    this.v.isolate(on ? sel : null);
    $('btn-isolate').setAttribute('aria-pressed', String(on)); $('btn-isolate').textContent = on ? 'Show all' : 'Isolate';
    if (on) this.v.focus(sel);
  }
  hideSelection() { const sel = [...this.v.selected]; if (!sel.length) return; this.v.hidePieces(sel, true); this.v.select([]); this.toast('Hidden · press R or "Show all" to restore'); }
  _onSelect() { this._renderInfo(); this._updateLabels(); this._updateShareState(); }
  _renderInfo() {
    const panel = $('panel-info'); const sel = [...this.v.selected];
    if (!sel.length) {
      panel.hidden = true; this.selectionLabel = null;
      for (const li of $('organs').children) li.classList.remove('is-active');
      if (this.v.isolated && !this.activeRegion) { this.v.isolate(null); $('btn-isolate').setAttribute('aria-pressed', 'false'); $('btn-isolate').textContent = 'Isolate'; }
      return;
    }
    const structs = [...new Set(sel.map(i => this.structOfPiece[i]))];
    const si = structs[0]; const st = this.structure(si); const sys = this.sysById.get(st.system);
    $('panel-study').hidden = true; this.studyOpen = false; $('btn-study').setAttribute('aria-pressed', 'false'); panel.hidden = false;
    if (structs.length > 1) {
      const lab = this.selectionLabel;
      const lsys = lab && lab.system ? this.sysById.get(lab.system) : null;
      $('info-system').textContent = lab ? (lab.kind === 'organ' ? `Organ · ${lsys ? lsys.name : ''}` : lab.kind === 'concept' ? 'Anatomical group' : 'Selection') : 'Selection';
      $('info-name').innerHTML = `${esc(lab ? lab.name : `${structs.length} structures`)}<small>${structs.length} structures · ${sel.length} pieces</small>`;
      $('info-meta').innerHTML = '';
      $('info-desc').textContent = lab ? lab.summary : 'Shift-click adds or removes structures. Isolate to study the group on its own.';
      $('info-facts').hidden = true; $('info-tags-wrap').hidden = true; $('info-parents').innerHTML = `<span class="muted small">${structs.length} structures selected</span>`;
      $('info-related-wrap').hidden = false;
      $('info-related').innerHTML = structs.slice(0, 60).map(s => `<button class="chip" data-structure="${s}">${esc(this.structure(s).name)}</button>`).join('') + (structs.length > 60 ? `<span class="chip">+${structs.length - 60} more</span>` : '');
      $('btn-pair').hidden = true; $('info-fma').textContent = lab && lab.kind === 'concept' ? lab.id : lab ? `organ:${lab.id}` : '';
      this._renderClinical(lab && lab.kind === 'organ' ? this.clinicalFor(-1, lab.id) : [], lab && lab.kind === 'organ' ? lab.id : null);
    } else {
      const c = this.contentOf(si) || {};
      $('info-system').textContent = sys.name;
      $('info-name').textContent = st.name;
      const meta = [];
      if (st.side) meta.push(`<span class="chip">${cap(st.side)} side</span>`);
      if (st.pieces.length > 1) meta.push(`<span class="chip">${st.pieces.length} pieces</span>`);
      meta.push(`<span class="chip" style="border-color:${sys.color}">${esc(sys.name)}</span>`);
      $('info-meta').innerHTML = meta.join('');
      $('info-desc').textContent = c.summary || this._fallbackDescription(st, sys);
      const facts = [];
      for (const [k, label] of [['function', 'Function'], ['clinical', 'Clinical note'], ['location', 'Location']]) if (c[k]) facts.push(`<dt>${label}</dt><dd>${esc(c[k])}</dd>`);
      $('info-facts').hidden = !facts.length; $('info-facts').innerHTML = facts.length ? `<dl class="facts">${facts.join('')}</dl>` : '';
      const tags = [];
      if (c.organ) { const o = this.organ(c.organ); if (o) tags.push(`<button class="chip" data-organ="${o.id}" title="Select the whole ${esc(o.name).toLowerCase()}">${esc(o.name)}</button>`); }
      for (const rid of c.regions || []) { const r = this.region(rid); if (r) tags.push(`<button class="chip" data-region="${r.id}" title="Show only the ${esc(r.name).toLowerCase()}">${esc(r.name)}</button>`); }
      $('info-tags-wrap').hidden = !tags.length; $('info-tags').innerHTML = tags.join('');
      const parents = (st.parents || []).map(ci => `<button class="chip" data-concept="${ci}" title="Select every piece in this group">${esc(cap(this.atlas.concepts[ci].name))}${this.conceptCounts[ci] > 1 ? ` · ${this.conceptCounts[ci]}` : ''}</button>`);
      $('info-parents').innerHTML = parents.length ? parents.join('') : `<span class="muted small">${esc(sys.name)}</span>`;
      const related = this._relatedStructures(si).slice(0, 12);
      $('info-related-wrap').hidden = !related.length;
      $('info-related').innerHTML = related.map(s => `<button class="chip" data-structure="${s}">${esc(this.structure(s).name)}</button>`).join('');
      $('btn-pair').hidden = st.pair === undefined;
      $('info-fma').textContent = `${st.concept} · ${st.pieces.map(p => this.atlas.pieces[p].id).join(', ')}`;
      this._renderClinical(this.clinicalFor(si, c.organ), c.organ || null);
    }
    $('btn-isolate').setAttribute('aria-pressed', String(!!this.v.isolated)); $('btn-isolate').textContent = this.v.isolated ? 'Show all' : 'Isolate';
    $('btn-pin').setAttribute('aria-pressed', String(this.pinned.has(si))); $('btn-pin').textContent = this.pinned.has(si) ? 'Unpin label' : 'Pin label';
  }
  _relatedStructures(si) {
    const st = this.structure(si); const parents = st.parents || []; if (!parents.length) return [];
    const nearest = parents[parents.length - 1];
    const pieces = this.conceptPieces.get(nearest) || [];
    const out = []; const seen = new Set([si]);
    for (const p of pieces) { const s = this.structOfPiece[p]; if (!seen.has(s)) { seen.add(s); out.push(s); } }
    return out;
  }
  _fallbackDescription(st, sys) {
    const parents = (st.parents || []).map(c => this.atlas.concepts[c].name);
    const kind = parents.length ? parents[parents.length - 1] : sys.name.toLowerCase();
    const sysText = this.content.systems[sys.id]?.summary || sys.summary;
    let s = `${st.name} is a ${kind}${st.side ? ` on the ${st.side} side of the body` : ''}, modelled as ${st.pieces.length === 1 ? 'one piece' : st.pieces.length + ' pieces'} of the ${sys.name.toLowerCase()} layer. ${sysText}`;
    if (parents.length > 1) s += ` In the anatomical hierarchy it sits under ${parents.slice(0, -1).map(cap).join(' › ')}.`;
    return s;
  }

  // --------------------------------------------------------------- labels
  _updateLabels() {
    const root = $('labels'); const want = new Map();
    if (this.labelsOn) {
      for (const si of this.pinned) want.set(si, false);
      const psi = this.primaryStructure();
      const structs = new Set([...this.v.selected].map(i => this.structOfPiece[i]));
      if (psi >= 0 && !this.studyHideNames && structs.size === 1) want.set(psi, true);
    }
    for (const el of [...root.children]) if (!want.has(+el.dataset.structure)) el.remove();
    for (const [si, selected] of want) {
      let el = root.querySelector(`[data-structure="${si}"]`);
      if (!el) {
        el = document.createElement('div'); el.className = 'label'; el.dataset.structure = si;
        const st = this.structure(si);
        el.innerHTML = `<span class="label-sys">${esc(this.sysById.get(st.system).name)}</span>${esc(st.name)}`;
        if (this.pinned.has(si)) { const b = document.createElement('button'); b.textContent = '×'; b.title = 'Unpin'; b.addEventListener('click', () => { this.pinned.delete(si); this._updateLabels(); this._renderInfo(); }); el.appendChild(b); }
        root.appendChild(el);
      }
      el.classList.toggle('is-selected', selected);
      const st = this.structure(si);
      const p = this.v.centerOf(st.pieces[0]);
      const b = this.atlas.pieces[st.pieces[0]].bbox; if (b) p.y = b[4] + this.v.offsetOf(st.pieces[0])[1];
      const s = this.v.project(p);
      el.style.transform = `translate(${s.x.toFixed(0)}px, ${(s.y - 10).toFixed(0)}px) translate(-50%, -100%)`;
      el.style.opacity = s.visible ? 1 : 0;
    }
  }

  // ---------------------------------------------------------------- study
  _bindStudy() {
    const panel = $('panel-study'); const body = $('study-body'); const self = this;
    this.study = {
      mode: 'quiz', score: 0, asked: 0, current: null, cardIdx: 0, deck: [], revealed: false,
      pool() { const seen = new Set(); const out = []; for (let i = 0; i < self.v.n; i++) { if (!self.v.isPieceVisible(i) || !self.v.loaded[i]) continue; const s = self.structOfPiece[i]; if (!seen.has(s)) { seen.add(s); out.push(s); } } return out; },
      next() {
        const pool = this.pool(); if (pool.length < 4) { body.innerHTML = '<p class="muted">Show at least four structures to start a quiz.</p>'; return; }
        const answer = pool[Math.floor(Math.random() * pool.length)];
        const sameSys = pool.filter(s => s !== answer && self.structure(s).system === self.structure(answer).system);
        const distractPool = sameSys.length >= 3 ? sameSys : pool.filter(s => s !== answer);
        const opts = new Set([answer]); while (opts.size < 4) opts.add(distractPool[Math.floor(Math.random() * distractPool.length)]);
        const options = [...opts].sort(() => Math.random() - 0.5);
        this.current = { answer, options, done: false };
        self.studyHideNames = true; self.selectionLabel = null;
        self.v.select(self.piecesOfStructure(answer), { silent: true }); self._updateLabels();
        self.v.focus(self.piecesOfStructure(answer));
        body.innerHTML = `<div class="quiz-q">Which structure is highlighted?</div><div class="quiz-options">${options.map((s, i) => `<button class="btn" data-opt="${s}"><kbd>${i + 1}</kbd> ${esc(self.structure(s).name)}</button>`).join('')}</div><div class="study-nav"><button class="btn" id="quiz-skip">Skip</button></div>`;
        body.querySelector('#quiz-skip').addEventListener('click', () => this.next());
        for (const b of body.querySelectorAll('[data-opt]')) b.addEventListener('click', () => this.answer(+b.dataset.opt));
      },
      answer(s) {
        if (!this.current || this.current.done) return; this.current.done = true; this.asked++;
        const right = s === this.current.answer; if (right) this.score++;
        for (const b of body.querySelectorAll('[data-opt]')) { const v = +b.dataset.opt; if (v === this.current.answer) b.classList.add('is-right'); else if (v === s) b.classList.add('is-wrong'); }
        self.studyHideNames = false; self._updateLabels();
        $('study-score').textContent = `Score ${this.score} / ${this.asked}`;
        const c = self.contentOf(this.current.answer);
        const nav = body.querySelector('.study-nav'); nav.innerHTML = `${c && c.summary ? `<p class="small" style="margin:0 0 8px">${esc(c.summary)}</p>` : ''}<button class="btn btn-primary" id="quiz-next">${right ? 'Correct! Next' : 'Next'}</button>`;
        nav.querySelector('#quiz-next').addEventListener('click', () => this.next());
      },
      locate() {
        const pool = this.pool(); if (pool.length < 2) { body.innerHTML = '<p class="muted">Show at least two structures to start.</p>'; return; }
        const target = pool[Math.floor(Math.random() * pool.length)];
        this.current = { answer: target, done: false };
        self.studyHideNames = true; self.selectionLabel = null; self.v.select([], { silent: true }); self._updateLabels();
        const st = self.structure(target);
        body.innerHTML = `<div class="quiz-q">Click this structure on the body</div><div class="locate-target">${esc(st.name)}</div><p class="muted small">${esc(self.sysById.get(st.system).name)}${st.side ? ` · ${st.side} side` : ''}. Rotate, zoom or use X-ray if it is hidden; names stay hidden until you answer.</p><div class="study-nav"><button class="btn" id="locate-reveal">Show me</button><button class="btn" id="locate-skip">Skip</button></div>`;
        body.querySelector('#locate-reveal').addEventListener('click', () => this.locateAnswer(-1));
        body.querySelector('#locate-skip').addEventListener('click', () => this.locate());
      },
      locateAnswer(si) {
        if (!this.current || this.current.done) return; this.current.done = true;
        const target = this.current.answer; const right = si === target; const revealed = si < 0;
        if (!revealed) { this.asked++; if (right) this.score++; }
        self.studyHideNames = false;
        self.v.select(self.piecesOfStructure(target), { silent: true }); self._updateLabels(); self.v.focus(self.piecesOfStructure(target));
        $('study-score').textContent = this.asked ? `Score ${this.score} / ${this.asked}` : '';
        const c = self.contentOf(target); const clicked = si >= 0 && !right ? self.structure(si).name : null;
        body.innerHTML = `<div class="quiz-q">${revealed ? 'Here it is' : right ? 'Correct!' : 'Not quite'}</div><div class="locate-target">${esc(self.structure(target).name)}</div>${clicked ? `<p class="study-feedback">You clicked the <b>${esc(clicked)}</b>. The target is highlighted now.</p>` : ''}${c && c.summary ? `<p class="small" style="margin:0 0 8px">${esc(c.summary)}</p>` : ''}<div class="study-nav"><button class="btn btn-primary" id="locate-next">Next</button></div>`;
        body.querySelector('#locate-next').addEventListener('click', () => this.locate());
      },
      cards() {
        if (!this.deck.length) { this.deck = this.pool().sort(() => Math.random() - 0.5); this.cardIdx = 0; }
        if (!this.deck.length) { body.innerHTML = '<p class="muted">Nothing visible to study.</p>'; return; }
        const s = this.deck[this.cardIdx % this.deck.length]; const st = self.structure(s);
        self.studyHideNames = !this.revealed; self.selectionLabel = null;
        self.v.select(self.piecesOfStructure(s), { silent: true }); self._updateLabels(); self.v.focus(self.piecesOfStructure(s));
        const c = self.contentOf(s);
        body.innerHTML = `<div class="card-face">${this.revealed ? `<div><div class="card-name">${esc(st.name)}</div><div class="muted small">${esc(self.sysById.get(st.system).name)}${c && c.summary ? ' · ' + esc(c.summary) : ''}</div></div>` : '<div class="muted">Tap to reveal the name</div>'}</div><div class="study-nav"><button class="btn" id="card-prev">‹ Prev</button><button class="btn btn-primary" id="card-flip">${this.revealed ? 'Hide' : 'Reveal'}</button><button class="btn" id="card-next">Next ›</button></div><p class="muted small" style="margin:8px 0 0">Card ${this.cardIdx % this.deck.length + 1} of ${this.deck.length}</p>`;
        body.querySelector('.card-face').addEventListener('click', () => { this.revealed = !this.revealed; this.cards(); });
        body.querySelector('#card-flip').addEventListener('click', () => { this.revealed = !this.revealed; this.cards(); });
        body.querySelector('#card-next').addEventListener('click', () => { this.cardIdx++; this.revealed = false; this.cards(); });
        body.querySelector('#card-prev').addEventListener('click', () => { this.cardIdx = (this.cardIdx - 1 + this.deck.length) % this.deck.length; this.revealed = false; this.cards(); });
      },
    };
    $('btn-study').addEventListener('click', () => this.toggleStudy());
    $('btn-close-study').addEventListener('click', () => this.toggleStudy(false));
    panel.querySelector('.segmented').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mode]'); if (!b) return;
      for (const x of panel.querySelectorAll('.segmented button')) x.classList.toggle('is-active', x === b);
      this.study.mode = b.dataset.mode; this.study.deck = []; this.study.revealed = false; this.startStudy();
    });
  }
  toggleStudy(force) {
    const on = force === undefined ? !this.studyOpen : force;
    this.studyOpen = on; $('panel-study').hidden = !on; $('btn-study').setAttribute('aria-pressed', String(on));
    if (on) { $('panel-info').hidden = true; this.startStudy(); }
    else { this.studyHideNames = false; this.v.select([]); this._updateLabels(); }
  }
  startStudy(mode) {
    if (mode) { this.study.mode = mode; for (const x of $('panel-study').querySelectorAll('.segmented button')) x.classList.toggle('is-active', x.dataset.mode === mode); }
    const vis = this.atlas.systems.filter(s => this.v.sysIndex.get(s.id).visible).map(s => s.name);
    const dflt = this.atlas.systems.filter(s => s.id !== 'skin' && !s.hidden);
    const allDefault = vis.length === dflt.length && dflt.every(s => this.v.sysIndex.get(s.id).visible);
    const scope = this.activeRegion ? `the ${this.region(this.activeRegion).name.toLowerCase()} region` : allDefault ? 'all systems' : vis.join(', ');
    $('study-scope').textContent = `Questions come from what is visible: ${scope}. Toggle systems or pick a region to narrow the scope.`;
    $('study-score').textContent = this.study.asked ? `Score ${this.study.score} / ${this.study.asked}` : '';
    if (this.study.mode === 'quiz') this.study.next(); else if (this.study.mode === 'locate') this.study.locate(); else this.study.cards();
  }

  // ----------------------------------------------------------- shortcuts
  _bindKeys() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === '/') { e.preventDefault(); $('search-input').focus(); $('search-input').select(); return; }
      if (k === 'Escape') { if (this.studyOpen) this.toggleStudy(false); else if (this.v.selected.size) this.v.select([]); else if (this.activeRegion) this.clearRegion(); else if (this.v.isolated) this.v.isolate(null); return; }
      if (k === '?') { $('dlg-help').showModal(); return; }
      if (this.studyOpen && this.study.mode === 'quiz' && /^[1-4]$/.test(k)) { if (this.study.current && !this.study.current.done) this.study.answer(this.study.current.options[+k - 1]); return; }
      const views = { '1': 'front', '2': 'back', '3': 'left', '4': 'right', '5': 'top' };
      if (views[k]) { this.v.setView(views[k]); return; }
      switch (k.toLowerCase()) {
        case 'r': this.resetAll(); break;
        case 'x': this.setXray(!this.v.xray); break;
        case 'h': this.hideSelection(); break;
        case 'i': this.isolateSelection(); break;
        case 'f': if (this.v.selected.size) this.v.focus([...this.v.selected]); break;
        case 'e': this.v.setExplode(this.v.explodeT + (e.shiftKey ? -0.25 : 0.25), { animate: true }); break;
        case 'q': this.toggleStudy(); break;
        case 'p': this.screenshot(); break;
        case 't': this.toggleTheme(); break;
        case 'l': this.labelsOn = !this.labelsOn; $('btn-labels').setAttribute('aria-pressed', String(this.labelsOn)); this._updateLabels(); break;
        case 'c': this.share(); break;
        default: return;
      }
    });
  }

  // ---------------------------------------------------------------- misc
  _bindMisc() {
    $('btn-help').addEventListener('click', () => $('dlg-help').showModal());
    const q = $('quality');
    if (q) {
      q.value = this.v.dataBase.includes('lite') ? 'lite' : 'hd';
      q.addEventListener('change', () => { try { localStorage.setItem('atlas-quality', q.value); } catch {} const u = new URL(location.href); u.searchParams.set('quality', q.value); location.href = u.toString(); });
    }
    $('btn-theme').addEventListener('click', () => this.toggleTheme());
    $('btn-share').addEventListener('click', () => this.share());
    $('btn-shot').addEventListener('click', () => this.screenshot());
    window.addEventListener('resize', () => this.v.resize());
    window.addEventListener('hashchange', () => this.applyHash());
  }
  toggleTheme() {
    const root = document.documentElement; const dark = root.dataset.theme !== 'dark';
    root.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem('atlas-theme', root.dataset.theme); } catch {}
    this.v.setTheme(root.dataset.theme);
  }
  screenshot() {
    const url = this.v.screenshot(); const a = document.createElement('a'); a.href = url; a.download = `human-atlas-${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove(); this.toast('Screenshot saved');
  }
  toast(msg, ms = 2200) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(this._toastT); this._toastT = setTimeout(() => { t.hidden = true; }, ms); }

  // URL state: #s=<structure id> | c=<concept id> | o=<organ id> | r=<region id> ; sys=a,b ; x=1 ; e=0.5 ; slice=x
  _updateShareState() {
    if (!this._ready) return;              // never overwrite the URL before the initial deep link has been applied
    const p = new URLSearchParams();
    const si = this.primaryStructure();
    const structs = new Set([...this.v.selected].map(i => this.structOfPiece[i]));
    const lab = this.selectionLabel;
    if (this.studyOpen) { /* never put the quiz answer in the URL */ }
    else if (structs.size > 1 && lab && lab.kind === 'organ') p.set('o', lab.id);
    else if (structs.size > 1 && lab && lab.kind === 'concept') p.set('c', lab.id);
    else if (structs.size > 1 && structs.size <= 20 && !lab) p.set('s', [...structs].map(x => this.structure(x).id).join(','));
    else if (si >= 0) p.set('s', this.structure(si).id);
    if (this.activeRegion) p.set('r', this.activeRegion);
    const vis = this.atlas.systems.filter(s => this.v.sysIndex.get(s.id).visible).map(s => s.id);
    const defaultVis = this.atlas.systems.filter(s => s.id !== 'skin' && !s.hidden).map(s => s.id);
    if (vis.join(',') !== defaultVis.join(',')) p.set('sys', vis.join(','));
    if (this.v.xray && !this.v.xrayAuto) p.set('x', '1');
    if (this.v.explodeT > 0) p.set('e', this.v.explodeT.toFixed(2));
    if (this.v.slice.axis) p.set('slice', this.v.slice.axis);
    const str = p.toString();
    this._suppressHash = true;
    try { history.replaceState(null, '', str ? '#' + str : location.pathname + location.search); } catch {}
    setTimeout(() => { this._suppressHash = false; }, 0);
  }
  /** Apply the initial deep link once the first system is in, then start mirroring state into the URL. */
  ready() { this.applyHash(); this._ready = true; this._updateShareState(); }
  applyHash() {
    if (this._suppressHash) return;
    const p = new URLSearchParams(location.hash.slice(1));
    const q = new URLSearchParams(location.search);
    if (![...p.keys()].length && ![...q.keys()].length) return;
    // A new deep link that names no selection (a system, a region, a slice) replaces the old selection instead of keeping it.
    if (this._ready && this.v.selected.size && !p.get('s') && !p.get('c') && !p.get('o')) { this.selectionLabel = null; this.v.select([]); }
    if (p.get('sys')) { const ids = p.get('sys').split(',').filter(id => this.sysById.has(id)); if (ids.length) { this.v.setSystemsVisible(ids); this._setPresetActive(null); if (!p.get('s') && !p.get('c') && !p.get('o') && !p.get('r')) this.v.setView('frontLeft', false); } }
    if (p.get('x') === '1') this.setXray(true);
    if (p.get('e')) { const e = parseFloat(p.get('e')); if (Number.isFinite(e)) this.v.setExplode(Math.min(1, Math.max(0, e))); }
    if (['x', 'y', 'z'].includes(p.get('slice'))) this.setSliceAxis(p.get('slice'));
    if (p.get('r')) { const ri = (this.content.regions || []).findIndex(r => r.id === p.get('r')); if (ri >= 0) this.isolateRegion(ri); }
    if (p.get('s')) {
      const ids = p.get('s').split(','); const byId = new Map(this.atlas.structures.map((s, i) => [s.id, i]));
      const sis = ids.map(id => byId.get(id)).filter(si => si !== undefined);
      sis.forEach((si, k) => this.selectStructure(si, { additive: k > 0 }));
      if (sis.length) this.v.focus([...this.v.selected]);
    }
    if (p.get('c')) { const ci = this.atlas.concepts.findIndex(c => c.id === p.get('c')); if (ci >= 0) this.selectConcept(ci, { focus: true }); }
    if (p.get('o')) { const oi = this.organIndex(p.get('o')); if (oi >= 0) this.selectOrgan(oi, { focus: true }); }
    if (q.get('study')) { const sys = (q.get('sys') || '').split(',').filter(id => this.sysById.has(id)); if (sys.length) { this.v.setSystemsVisible(sys); this._setPresetActive(null); } this.toggleStudy(true); this.startStudy(['cards', 'locate'].includes(q.get('study')) ? q.get('study') : 'quiz'); }
  }
  share() {
    this._updateShareState();
    const url = location.href;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => this.toast('Link copied'), () => { prompt('Copy this link', url); });
  }
}
