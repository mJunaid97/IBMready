/**
 * viewer.js — AtlasViewer: the 3D engine behind the Human Atlas explorer.
 *
 * Design
 *  - One three.js BatchedMesh per anatomical system: 2,234 pieces render in
 *    ~16 draw calls, with per-piece visibility, colour and transform.
 *  - Per-piece alpha lives in the batched colour texture. Two render passes
 *    (opaque, then depth-read-only "ghost") give correct x-ray / focus views
 *    without per-instance sorting artefacts.
 *  - Picking is a GPU id buffer: what you see is what you click, including
 *    exploded, sliced and x-rayed states.
 *  - Rendering is on demand; a light rAF loop only draws when something moved.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const LOAD_ORDER = ['skeleton', 'muscles', 'heart', 'arteries', 'veins', 'nervous', 'respiratory', 'digestive', 'teeth', 'sensory', 'joints', 'urinary', 'reproductive', 'endocrine', 'lymphatic', 'skin'];
const GHOST_ALPHA = 0.16;
const SELECTED_ALPHA = 2.0;            // alpha > 1.5 marks a selected piece for the see-through highlight pass
const SYSTEM_ALPHA = { skin: 0.42 };    // translucent overlays
const HIDDEN_BY_DEFAULT = ['skin'];
const VIEW_DIRS = {
  front: [0, 0, 1], back: [0, 0, -1], left: [1, 0, 0], right: [-1, 0, 0], top: [0, 1, 0.0001], bottom: [0, -1, 0.0001],
  frontLeft: [0.7, 0.25, 0.7],
};

const easeInOut = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
const easeOut = t => 1 - Math.pow(1 - t, 3);

function hash01(i) { // deterministic per-piece jitter
  let x = (i + 1) * 2654435761; x = (x ^ (x >>> 13)) * 1274126177; x = x ^ (x >>> 16);
  return (x >>> 0) / 4294967296;
}

export class AtlasViewer extends EventTarget {
  constructor(canvas, atlas, options = {}) {
    super();
    this.canvas = canvas;
    this.atlas = atlas;
    this.dataBase = options.dataBase || '../data/hd/';
    this.theme = options.theme || 'dark';
    this.pieces = atlas.pieces;
    this.n = atlas.pieces.length;

    // --- per-piece state ------------------------------------------------
    this.center = new Float32Array(this.n * 3);
    this.size = new Float32Array(this.n);
    this.loaded = new Uint8Array(this.n);
    this.sysOf = new Int16Array(this.n);
    this.instOf = new Int32Array(this.n).fill(-1);
    this.hidden = new Uint8Array(this.n);      // hidden by the user
    this.isolated = null;                      // Set of piece idx or null
    this.selected = new Set();
    this.hovered = -1;
    this.alpha = new Float32Array(this.n).fill(1);
    this.baseColor = new Float32Array(this.n * 3);
    this.explodeT = 0;
    this.explodeMode = 'radial';
    this.gridOffset = null;
    this.xray = false;
    this.autoXray = true;                     // turn x-ray on when a focused structure is hidden inside the body
    this.xrayAuto = false;                    // x-ray was switched on automatically (cleared with the selection)
    this.slice = { axis: null, t: 0.5, flip: false };

    // --- systems ---------------------------------------------------------
    this.systems = atlas.systems.map((def, k) => ({ def, k, mesh: null, start: -1, count: 0, visible: !HIDDEN_BY_DEFAULT.includes(def.id), loaded: false, loading: false, bytes: def.bytes || 0, alpha: SYSTEM_ALPHA[def.id] ?? 1 }));
    this.sysIndex = new Map(this.systems.map(s => [s.def.id, s]));
    let cursor = 0;
    for (const s of this.systems) {
      s.start = cursor;
      while (cursor < this.n && this.pieces[cursor].system === s.def.id) { this.sysOf[cursor] = s.k; cursor++; }
      s.count = cursor - s.start;
    }
    if (cursor !== this.n) throw new Error('atlas pieces must be grouped by system in system order');

    // --- geometry stats --------------------------------------------------
    const bmin = [Infinity, Infinity, Infinity], bmax = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.n; i++) {
      const b = this.pieces[i].bbox || [0, 0, 0, 0, 0, 0];
      this.center[i * 3] = (b[0] + b[3]) / 2; this.center[i * 3 + 1] = (b[1] + b[4]) / 2; this.center[i * 3 + 2] = (b[2] + b[5]) / 2;
      this.size[i] = Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]);
      for (let k = 0; k < 3; k++) { bmin[k] = Math.min(bmin[k], b[k]); bmax[k] = Math.max(bmax[k], b[k + 3]); }
    }
    this.bounds = new THREE.Box3(new THREE.Vector3(...bmin), new THREE.Vector3(...bmax));
    this.bodyCenter = this.bounds.getCenter(new THREE.Vector3());
    this.bodyHeight = bmax[1] - bmin[1];

    this._initScene();
    this._initMaterials();
    this._initColors();
    this.setTheme(this.theme);
    this._tweens = [];
    this._dirty = true;
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ======================================================================
  // Scene
  // ======================================================================
  _initScene() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.autoClear = false;
    renderer.localClippingEnabled = false;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.root = new THREE.Group();
    this.scene.add(this.root);

    const camera = new THREE.PerspectiveCamera(32, 1, 5, 30000);
    this.camera = camera;
    this.scene.add(camera);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-0.6, 0.8, 1.2).multiplyScalar(1000);
    camera.add(key);                       // key light follows the camera
    const fill = new THREE.DirectionalLight(0xdde6ff, 0.5);
    fill.position.set(0.8, -0.2, -0.6).multiplyScalar(1000);
    camera.add(fill);
    this.lights = { hemi, key, fill };

    const controls = new OrbitControls(camera, this.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.8;
    controls.screenSpacePanning = true;
    controls.zoomToCursor = true;
    controls.minDistance = 40;
    controls.maxDistance = 12000;
    controls.target.copy(this.bodyCenter);
    controls.addEventListener('change', () => { this._dirty = true; });
    this.controls = controls;

    // picking
    this.pickTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: true });
    this.pickBuffer = new Uint8Array(4);
    this.clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

    this.resize();
    this.setView('frontLeft', false);
  }

  _initMaterials() {
    const inject = (material, pass) => {
      material.defines = { ...(material.defines || {}), ['ATLAS_PASS_' + pass.toUpperCase()]: '' };
      material.onBeforeCompile = (shader) => {
        if (pass === 'highlight') {
          shader.uniforms.uAccent = this._hl.accent; shader.uniforms.uAccentAlpha = this._hl.alpha;
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <color_pars_fragment>', '#include <color_pars_fragment>\n uniform vec3 uAccent; uniform float uAccentAlpha;')
            .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor = vec4( uAccent, uAccentAlpha );');
        }
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          #ifdef USE_BATCHING_COLOR
            #ifdef ATLAS_PASS_OPAQUE
              if ( vColor.a < 0.999 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
            #endif
            #ifdef ATLAS_PASS_GHOST
              if ( vColor.a >= 0.999 || vColor.a <= 0.002 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
            #endif
            #ifdef ATLAS_PASS_HIGHLIGHT
              if ( vColor.a < 1.5 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
            #endif
          #endif`);
        // three r186 defines USE_COLOR for batched colours in the fragment stage, so vColor (rgba) is
        // already declared and multiplied into diffuseColor there; only the vertex-side culling is ours.
      };
      material.customProgramCacheKey = () => 'atlas-' + pass;
      return material;
    };
    this._hl = { accent: { value: new THREE.Color('#ffb340') }, alpha: { value: 0.32 } };
    this.matOpaque = inject(new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.0, side: THREE.FrontSide }), 'opaque');
    this.matGhost = inject(new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.0, transparent: true, depthWrite: false, side: THREE.FrontSide }), 'ghost');
    // selection silhouette drawn through occluders (depth test off) so a focused organ is never lost inside the body
    this.matHighlight = inject(new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }), 'highlight');

    this.matPick = new THREE.ShaderMaterial({
      uniforms: { uIdOffset: { value: 0 } },
      vertexShader: `
        #include <common>
        #include <batching_pars_vertex>
        #include <clipping_planes_pars_vertex>
        uniform float uIdOffset;
        varying vec3 vId;
        void main() {
          #include <batching_vertex>
          #include <begin_vertex>
          #include <project_vertex>
          #include <clipping_planes_vertex>
          float inst = 0.0;
          #ifdef USE_BATCHING
            inst = getIndirectIndex( gl_DrawID );
          #endif
          float id = inst + uIdOffset + 1.0;
          vId = vec3( mod( id, 256.0 ), mod( floor( id / 256.0 ), 256.0 ), floor( id / 65536.0 ) ) / 255.0;
          #ifdef USE_BATCHING_COLOR
            if ( getBatchingColor( inst ).a <= 0.002 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
          #endif
        }`,
      fragmentShader: `
        #include <clipping_planes_pars_fragment>
        varying vec3 vId;
        void main() {
          #include <clipping_planes_fragment>
          gl_FragColor = vec4( vId, 1.0 );
        }`,
      side: THREE.FrontSide,
    });
    this.matPick.clipping = true;
  }

  _initColors() {
    const c = new THREE.Color();
    for (const s of this.systems) {
      const base = new THREE.Color(s.def.color);
      const hsl = {}; base.getHSL(hsl);
      for (let i = s.start; i < s.start + s.count; i++) {
        const j = hash01(i);
        c.setHSL(hsl.h + (j - 0.5) * 0.02, THREE.MathUtils.clamp(hsl.s + (hash01(i + 7) - 0.5) * 0.08, 0, 1), THREE.MathUtils.clamp(hsl.l + (j - 0.5) * 0.12, 0.05, 0.95));
        this.baseColor[i * 3] = c.r; this.baseColor[i * 3 + 1] = c.g; this.baseColor[i * 3 + 2] = c.b;
      }
    }
    this.selectColor = new THREE.Color('#ffb340');
    this.hoverBoost = 0.28;
  }

  setTheme(theme) {
    this.theme = theme;
    const dark = theme === 'dark';
    this.lights.hemi.color.set(dark ? 0xffffff : 0xffffff);
    this.lights.hemi.groundColor.set(dark ? 0x334455 : 0x99a0aa);
    this.lights.hemi.intensity = dark ? 1.0 : 1.25;
    this.lights.key.intensity = dark ? 1.7 : 1.5;
    this.selectColor.set(dark ? '#ffb340' : '#ff8f1f');
    this._hl.accent.value.copy(this.selectColor);
    this._dirty = true;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._dirty = true;
  }

  // ======================================================================
  // Loading
  // ======================================================================
  async load(onProgress) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const order = [...this.systems].sort((a, b) => LOAD_ORDER.indexOf(a.def.id) - LOAD_ORDER.indexOf(b.def.id));
    const totalBytes = order.reduce((a, s) => a + (s.bytes || 1), 0);
    const got = new Map();
    const report = (sys, loadedBytes) => {
      got.set(sys.k, Math.min(loadedBytes, sys.bytes || loadedBytes));
      let sum = 0; for (const v of got.values()) sum += v;
      if (onProgress) onProgress({ fraction: Math.min(1, sum / totalBytes), system: sys.def, loadedSystems: this.systems.filter(s => s.loaded).length, total: this.systems.length });
    };
    // Geometry is fetched by hand so that hosts which cannot serve .glb files can fall back to a
    // base64 twin (<file>.glb.json, produced by tools/encode-assets.py); ?assets=json forces it.
    const forceJson = new URLSearchParams(location.search).get('assets') === 'json';
    const fetchBytes = async (sys) => {
      const url = this.dataBase + sys.def.file;
      if (!forceJson) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            if (!res.body) return res.arrayBuffer();
            const reader = res.body.getReader(); const chunks = []; let got = 0;
            for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.byteLength; report(sys, got); }
            const buf = new Uint8Array(got); let off = 0; for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
            // 'glTF' magic: anything else (an HTML error page served with 200) means fall back to the JSON twin
            if (got > 12 && buf[0] === 0x67 && buf[1] === 0x6c && buf[2] === 0x54 && buf[3] === 0x46) return buf.buffer;
          }
        } catch (e) { /* fall through to the JSON twin */ }
      }
      const res = await fetch(url + '.json');
      if (!res.ok) throw new Error(`Cannot load ${sys.def.file} (${res.status})`);
      const text = await res.text(); report(sys, sys.bytes * 0.9);
      const b64 = JSON.parse(text).b64; const bin = atob(b64); const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return buf.buffer;
    };
    // Skeleton first so something meaningful appears quickly, then the rest in parallel (browser limits concurrency).
    const loadOne = async (sys) => {
      sys.loading = true;
      const buffer = await fetchBytes(sys);
      const gltf = await new Promise((resolve, reject) => loader.parse(buffer, this.dataBase, resolve, reject));
      this._addSystem(sys, gltf); report(sys, sys.bytes);
    };
    await loadOne(order[0]);
    await Promise.all(order.slice(1).map(loadOne));
    this.dispatchEvent(new CustomEvent('loaded'));
  }

  _addSystem(sys, gltf) {
    gltf.scene.updateMatrixWorld(true);
    const byName = new Map();
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.name.startsWith('mesh_') && o.parent ? o.parent.name : o.name;
      byName.set(name, o);
    });
    let verts = 0, idx = 0;
    const order = [];
    for (let i = sys.start; i < sys.start + sys.count; i++) {
      const m = byName.get(this.pieces[i].id);
      if (!m) continue;
      verts += m.geometry.getAttribute('position').count;
      idx += m.geometry.index ? m.geometry.index.count : m.geometry.getAttribute('position').count;
      order.push([i, m]);
    }
    const mesh = new THREE.BatchedMesh(order.length, verts, idx, this.matOpaque);
    mesh.perObjectFrustumCulled = true;
    mesh.sortObjects = true;
    mesh.name = sys.def.id;
    const color = new THREE.Color();
    for (const [i, m] of order) {
      const g = m.geometry;
      const gid = mesh.addGeometry(g);
      const inst = mesh.addInstance(gid);
      mesh.setMatrixAt(inst, m.matrixWorld);
      color.setRGB(this.baseColor[i * 3], this.baseColor[i * 3 + 1], this.baseColor[i * 3 + 2]);
      mesh.setColorAt(inst, color);
      this.instOf[i] = inst;
      this.loaded[i] = 1;
      g.dispose();
    }
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    // per-system id offset for GPU picking
    const originalOnBeforeRender = mesh.onBeforeRender;
    const start = sys.start, pick = this.matPick;
    mesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
      if (material === pick) { pick.uniforms.uIdOffset.value = start; pick.uniformsNeedUpdate = true; }
      originalOnBeforeRender.call(this, renderer, scene, camera, geometry, material, group);
    };
    sys.mesh = mesh; sys.loaded = true; sys.loading = false;
    sys.baseMatrices = new Float32Array(order.length * 16);
    const tmp = new THREE.Matrix4();
    for (const [i, m] of order) { tmp.copy(m.matrixWorld); tmp.toArray(sys.baseMatrices, this.instOf[i] * 16); }
    this.root.add(mesh);
    this._applyVisibility(sys);
    this._applyAlphaColors(sys);
    if (this.explodeT > 0) this._applyExplode(sys);
    this._dirty = true;
    this.dispatchEvent(new CustomEvent('system', { detail: sys.def }));
  }

  // ======================================================================
  // Visibility, colour, alpha
  // ======================================================================
  isPieceVisible(i) {
    const s = this.systems[this.sysOf[i]];
    if (!s.visible || this.hidden[i]) return false;
    if (this.isolated && !this.isolated.has(i)) return false;
    return true;
  }

  _applyVisibility(sys) {
    if (!sys.mesh) return;
    for (let i = sys.start; i < sys.start + sys.count; i++) {
      if (this.instOf[i] < 0) continue;
      sys.mesh.setVisibleAt(this.instOf[i], this.isPieceVisible(i));
    }
    this._dirty = true;
  }

  _applyAlphaColors(sys) {
    if (!sys.mesh) return;
    const tex = sys.mesh._colorsTexture;
    const data = tex.image.data;
    for (let i = sys.start; i < sys.start + sys.count; i++) {
      const inst = this.instOf[i];
      if (inst < 0) continue;
      let r = this.baseColor[i * 3], g = this.baseColor[i * 3 + 1], b = this.baseColor[i * 3 + 2];
      if (this.selected.has(i)) { r = this.selectColor.r; g = this.selectColor.g; b = this.selectColor.b; }
      else if (i === this.hovered) { r = r + (1 - r) * this.hoverBoost; g = g + (1 - g) * this.hoverBoost; b = b + (1 - b) * this.hoverBoost; }
      // alpha encodes the render pass: >1.5 selected (opaque + see-through highlight), 1 opaque, (0,1) ghost
      let a = sys.alpha;
      if (this.xray && !this.selected.has(i)) a = Math.min(a, GHOST_ALPHA);
      if (this.selected.has(i)) a = SELECTED_ALPHA;
      this.alpha[i] = a;
      data[inst * 4] = r; data[inst * 4 + 1] = g; data[inst * 4 + 2] = b; data[inst * 4 + 3] = a;
    }
    tex.needsUpdate = true;
    this._dirty = true;
  }

  _refreshAll() { for (const s of this.systems) { this._applyVisibility(s); this._applyAlphaColors(s); } }

  setSystemVisible(id, on) {
    const s = this.sysIndex.get(id); if (!s) return;
    s.visible = on;
    this._applyVisibility(s);
    if (this.explodeMode === 'grid') this._layoutGrid();
    this.dispatchEvent(new CustomEvent('visibility'));
  }

  setSystemsVisible(ids) {
    const set = new Set(ids);
    for (const s of this.systems) { s.visible = set.has(s.def.id); this._applyVisibility(s); }
    if (this.explodeMode === 'grid') this._layoutGrid();
    this.dispatchEvent(new CustomEvent('visibility'));
  }

  hidePieces(idxs, hidden = true) {
    const touched = new Set();
    for (const i of idxs) { this.hidden[i] = hidden ? 1 : 0; touched.add(this.sysOf[i]); }
    for (const k of touched) this._applyVisibility(this.systems[k]);
    if (this.explodeMode === 'grid') this._layoutGrid();
    this.dispatchEvent(new CustomEvent('visibility'));
  }

  unhideAll() {
    this.hidden.fill(0); this.isolated = null;
    for (const s of this.systems) { s.visible = true; this._applyVisibility(s); }
    if (this.explodeMode === 'grid') this._layoutGrid();
    this.dispatchEvent(new CustomEvent('visibility'));
  }

  isolate(idxs) {
    this.isolated = idxs && idxs.length ? new Set(idxs) : null;
    for (const s of this.systems) this._applyVisibility(s);
    if (this.explodeMode === 'grid') this._layoutGrid();
    this.dispatchEvent(new CustomEvent('visibility'));
  }

  visibleCount() { let n = 0; for (let i = 0; i < this.n; i++) if (this.isPieceVisible(i)) n++; return n; }

  select(idxs, { additive = false, silent = false } = {}) {
    const before = new Set(this.selected);
    if (!additive) this.selected.clear();
    for (const i of idxs || []) this.selected.add(i);
    if (this.selected.size === 0 && this.xrayAuto) { this.xray = false; this.xrayAuto = false; this.dispatchEvent(new CustomEvent('xray', { detail: false })); }
    const touched = new Set();
    for (const i of before) touched.add(this.sysOf[i]);
    for (const i of this.selected) touched.add(this.sysOf[i]);
    if (this.xray) this._refreshAll(); else for (const k of touched) this._applyAlphaColors(this.systems[k]);
    if (!silent) this.dispatchEvent(new CustomEvent('select', { detail: { pieces: [...this.selected] } }));
  }

  toggleSelect(i) {
    if (this.selected.has(i)) { this.selected.delete(i); this._applyAlphaColors(this.systems[this.sysOf[i]]); this.dispatchEvent(new CustomEvent('select', { detail: { pieces: [...this.selected] } })); }
    else this.select([i], { additive: true });
  }

  hover(i) {
    if (i === this.hovered) return;
    const prev = this.hovered; this.hovered = i;
    if (prev >= 0) this._applyAlphaColors(this.systems[this.sysOf[prev]]);
    if (i >= 0) this._applyAlphaColors(this.systems[this.sysOf[i]]);
  }

  setXray(on) { this.xray = on; if (!on) this.xrayAuto = false; this._refreshAll(); this.dispatchEvent(new CustomEvent('xray', { detail: on })); }

  // ======================================================================
  // Explode
  // ======================================================================
  _radialOffset(i, out) {
    const cx = this.center[i * 3] - this.bodyCenter.x, cy = this.center[i * 3 + 1] - this.bodyCenter.y, cz = this.center[i * 3 + 2] - this.bodyCenter.z;
    const h = this.bodyHeight;
    // amplify distance from the body axis, add a lateral/anteroposterior split so paired and layered pieces separate
    out[0] = cx * 2.6 + Math.sign(cx) * h * 0.10;
    out[1] = cy * 0.55;
    out[2] = cz * 2.6 + Math.sign(cz) * h * 0.06;
    return out;
  }

  _layoutGrid() {
    // Inventory layout: shelves per system, sized by each piece's extent, arranged in the frontal plane.
    const visible = [];
    for (let i = 0; i < this.n; i++) if (this.loaded[i] && this.isPieceVisible(i)) visible.push(i);
    const bySys = new Map();
    for (const i of visible) { const k = this.sysOf[i]; if (!bySys.has(k)) bySys.set(k, []); bySys.get(k).push(i); }
    const offsets = new Float32Array(this.n * 3);
    const pad = 1.25, gap = 40, shelfW = 2600;
    let y = this.bounds.max.y + 200;
    const x0 = this.bodyCenter.x - shelfW / 2;
    for (const [k, list] of bySys) {
      list.sort((a, b) => this.size[b] - this.size[a]);
      let x = x0, shelfH = 0;
      for (const i of list) {
        const cell = Math.max(this.size[i] * pad, 25) + gap;
        if (x + cell > x0 + shelfW && x > x0) { x = x0; y -= shelfH; shelfH = 0; }
        const tx = x + cell / 2, ty = y - cell / 2, tz = this.bodyCenter.z + 0;
        offsets[i * 3] = tx - this.center[i * 3]; offsets[i * 3 + 1] = ty - this.center[i * 3 + 1]; offsets[i * 3 + 2] = tz - this.center[i * 3 + 2];
        x += cell; shelfH = Math.max(shelfH, cell);
      }
      y -= shelfH + 120;
    }
    this.gridOffset = offsets;
    if (this.explodeMode === 'grid' && this.explodeT > 0) for (const s of this.systems) this._applyExplode(s);
  }

  offsetOf(i, out = [0, 0, 0]) {
    if (this.explodeT <= 0) { out[0] = out[1] = out[2] = 0; return out; }
    if (this.explodeMode === 'grid') {
      if (!this.gridOffset) this._layoutGrid();
      out[0] = this.gridOffset[i * 3] * this.explodeT; out[1] = this.gridOffset[i * 3 + 1] * this.explodeT; out[2] = this.gridOffset[i * 3 + 2] * this.explodeT;
    } else {
      this._radialOffset(i, out);
      out[0] *= this.explodeT; out[1] *= this.explodeT; out[2] *= this.explodeT;
    }
    return out;
  }

  _applyExplode(sys) {
    if (!sys.mesh) return;
    const m = new THREE.Matrix4(); const off = [0, 0, 0];
    for (let i = sys.start; i < sys.start + sys.count; i++) {
      const inst = this.instOf[i]; if (inst < 0) continue;
      m.fromArray(sys.baseMatrices, inst * 16);
      this.offsetOf(i, off);
      m.elements[12] += off[0]; m.elements[13] += off[1]; m.elements[14] += off[2];
      sys.mesh.setMatrixAt(inst, m);
    }
    sys.mesh.computeBoundingSphere();
    this._dirty = true;
  }

  setExplode(t, { animate = false } = {}) {
    t = THREE.MathUtils.clamp(t, 0, 1);
    if (animate) {
      const from = this.explodeT;
      this._tween(420, easeInOut, (k) => { this.explodeT = from + (t - from) * k; for (const s of this.systems) this._applyExplode(s); });
    } else {
      this.explodeT = t; for (const s of this.systems) this._applyExplode(s);
    }
    this.dispatchEvent(new CustomEvent('explode', { detail: t }));
  }

  setExplodeMode(mode) {
    this.explodeMode = mode;
    if (mode === 'grid') this._layoutGrid();
    for (const s of this.systems) this._applyExplode(s);
  }

  // ======================================================================
  // Slice (clipping plane)
  // ======================================================================
  setSlice({ axis = this.slice.axis, t = this.slice.t, flip = this.slice.flip } = {}) {
    this.slice = { axis, t, flip };
    if (!axis) {
      this.renderer.clippingPlanes = [];
      this.matOpaque.side = this.matGhost.side = THREE.FrontSide;
    } else {
      const n = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
      const min = this.bounds.min[axis] - 20, max = this.bounds.max[axis] + 20;
      const pos = min + (max - min) * t;
      // keep the half-space away from the camera so the cut surface faces the viewer; flip inverts
      if (axis !== this._sliceAxis) { const camDir = this.camera.position.clone().sub(this.controls.target); this._sliceSign = axis === 'y' ? -1 : -Math.sign(camDir[axis] || 1); this._sliceAxis = axis; }
      n.multiplyScalar(this._sliceSign * (flip ? -1 : 1));
      // plane: n·p + c >= 0 kept  → c = -n·(pos along axis)
      this.clipPlane.set(n, -(n[axis]) * pos);
      this.renderer.clippingPlanes = [this.clipPlane];
      this.matOpaque.side = this.matGhost.side = THREE.DoubleSide;
    }
    this.matOpaque.needsUpdate = this.matGhost.needsUpdate = true;
    this._dirty = true;
    this.dispatchEvent(new CustomEvent('slice', { detail: this.slice }));
  }

  // ======================================================================
  // Camera
  // ======================================================================
  _distanceToFit(box) {
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.62;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitH = radius / Math.tan(fov / 2);
    const fitW = radius / Math.tan(fov / 2) / this.camera.aspect;
    return Math.max(fitH, fitW) * 1.05;
  }

  flyTo(target, position, duration = 700) {
    const c0 = this.camera.position.clone(), t0 = this.controls.target.clone();
    if (duration <= 0) { this.camera.position.copy(position); this.controls.target.copy(target); this.controls.update(); this._dirty = true; return Promise.resolve(); }
    return this._tween(duration, easeInOut, (k) => {
      this.camera.position.lerpVectors(c0, position, k);
      this.controls.target.lerpVectors(t0, target, k);
      this.controls.update();
    });
  }

  setView(name, animate = true) {
    const dir = new THREE.Vector3(...(VIEW_DIRS[name] || VIEW_DIRS.front)).normalize();
    const box = this._visibleBounds();
    const target = box.getCenter(new THREE.Vector3());
    const dist = this._distanceToFit(box);
    this.flyTo(target, target.clone().add(dir.multiplyScalar(dist)), animate ? 650 : 0);
  }

  _visibleBounds() {
    const box = new THREE.Box3(); const off = [0, 0, 0]; const p = new THREE.Vector3();
    let any = false;
    for (let i = 0; i < this.n; i++) {
      if (!this.isPieceVisible(i) || !this.pieces[i].bbox) continue;
      const b = this.pieces[i].bbox; this.offsetOf(i, off);
      box.expandByPoint(p.set(b[0] + off[0], b[1] + off[1], b[2] + off[2]));
      box.expandByPoint(p.set(b[3] + off[0], b[4] + off[1], b[5] + off[2]));
      any = true;
    }
    return any ? box : this.bounds.clone();
  }

  boundsOf(idxs) {
    const box = new THREE.Box3(); const off = [0, 0, 0]; const p = new THREE.Vector3();
    for (const i of idxs) {
      const b = this.pieces[i].bbox; if (!b) continue; this.offsetOf(i, off);
      box.expandByPoint(p.set(b[0] + off[0], b[1] + off[1], b[2] + off[2]));
      box.expandByPoint(p.set(b[3] + off[0], b[4] + off[1], b[5] + off[2]));
    }
    return box;
  }

  async focus(idxs, duration = 700) {
    if (!idxs || !idxs.length) return;
    const box = this.boundsOf(idxs);
    if (box.isEmpty()) return;
    const target = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dist = Math.max(this._distanceToFit(box), Math.max(size.x, size.y, size.z) * 0.5 + 60);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    await this.flyTo(target, target.clone().add(dir.multiplyScalar(dist)), duration);
    // If the focused structure is buried inside other tissue, switch x-ray on so it can actually be seen.
    if (this.autoXray && !this.xray && this.selected.size) {
      const rect = this.canvas.getBoundingClientRect();
      const set = new Set(idxs); let seen = false;
      for (const [dx, dy] of [[0, 0], [-0.08, 0], [0.08, 0], [0, -0.08], [0, 0.08]]) {
        const hit = this.pick(rect.left + rect.width * (0.5 + dx), rect.top + rect.height * (0.5 + dy));
        if (hit >= 0 && set.has(hit)) { seen = true; break; }
      }
      if (!seen) { this.setXray(true); this.xrayAuto = true; this.dispatchEvent(new CustomEvent('autoxray')); }
    }
  }

  resetView(animate = true) { this.setView('frontLeft', animate); }

  centerOf(i, out = new THREE.Vector3()) {
    const off = this.offsetOf(i, [0, 0, 0]);
    return out.set(this.center[i * 3] + off[0], this.center[i * 3 + 1] + off[1], this.center[i * 3 + 2] + off[2]);
  }

  /** World point → CSS pixel coordinates in the canvas, plus a depth-based visibility flag. */
  project(point, out = { x: 0, y: 0, visible: false }) {
    const v = point.clone().project(this.camera);
    out.x = (v.x + 1) / 2 * this.canvas.clientWidth; out.y = (1 - v.y) / 2 * this.canvas.clientHeight;
    out.visible = v.z < 1 && v.x > -1.2 && v.x < 1.2 && v.y > -1.2 && v.y < 1.2;
    return out;
  }

  // ======================================================================
  // Picking
  // ======================================================================
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return -1;
    const pr = this.renderer.getPixelRatio();
    const w = Math.round(rect.width * pr), h = Math.round(rect.height * pr);
    this.camera.setViewOffset(w, h, Math.floor(x * pr), Math.floor(y * pr), 1, 1);
    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.pickTarget);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear(true, true, true);
    this.scene.overrideMaterial = this.matPick;
    this.renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = null;
    this.renderer.readRenderTargetPixels(this.pickTarget, 0, 0, 1, 1, this.pickBuffer);
    this.renderer.setRenderTarget(prevTarget);
    this.camera.clearViewOffset();
    const id = this.pickBuffer[0] + this.pickBuffer[1] * 256 + this.pickBuffer[2] * 65536 - 1;
    return id >= 0 && id < this.n ? id : -1;
  }

  // ======================================================================
  // Render loop
  // ======================================================================
  _tween(duration, ease, apply) {
    return new Promise((resolve) => { this._tweens.push({ start: performance.now(), duration, ease, apply, resolve }); this._dirty = true; });
  }

  _loop(now) {
    requestAnimationFrame(this._loop);
    if (this._tweens.length) {
      for (const tw of this._tweens) {
        const k = Math.min(1, (now - tw.start) / tw.duration);
        tw.apply(tw.ease(k));
        if (k >= 1) { tw.done = true; tw.resolve(); }
      }
      this._tweens = this._tweens.filter(t => !t.done);
      this._dirty = true;
    }
    if (this.controls.update()) this._dirty = true;
    if (this._dirty) { this.render(); this._dirty = false; this.dispatchEvent(new CustomEvent('frame')); }
  }

  render() {
    const r = this.renderer;
    r.setRenderTarget(null);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    this.scene.overrideMaterial = this.matOpaque;
    r.render(this.scene, this.camera);
    if (this._hasGhosts()) {
      this.scene.overrideMaterial = this.matGhost;
      r.render(this.scene, this.camera);
    }
    if (this.selected.size) {
      this.scene.overrideMaterial = this.matHighlight;
      r.render(this.scene, this.camera);
    }
    this.scene.overrideMaterial = null;
  }

  _hasGhosts() { return this.xray || this.systems.some(s => s.visible && s.loaded && s.alpha < 1); }

  screenshot() {
    this.render();
    return this.canvas.toDataURL('image/png');
  }

  requestRender() { this._dirty = true; }
}
