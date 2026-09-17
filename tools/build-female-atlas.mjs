#!/usr/bin/env node
/**
 * build-female-atlas.mjs — appends two layers to the atlas without touching the BodyParts3D male systems:
 *
 *  - reproductive-female: the female pelvic organs and breasts of the NIH Human Reference Atlas (HRA, united
 *    female v1.5, built from the Visible Human Female; CC BY 4.0), fitted into the male reference frame;
 *  - gender-affirming: a schematic layer (neovagina, neoclitoris, labia; neophallus, neourethra, scrotum with
 *    testicular implants) generated procedurally to typical dimensions in that frame.
 *
 * The mapping (which HRA node becomes which structure, names, concepts, sides, the schematic shapes and the fit
 * parameters) lives in tools/manifest/female-source.json. This tool:
 *   1. decodes the HRA GLBs (Draco) and the male skeleton/skin/muscle GLBs (meshopt) it needs as landmarks;
 *   2. fits the pelvis (one uniform scale, x centred on the hip bones, y/z pinned at the top of the pubic
 *      symphysis; the sacral promontory is the check) and the thorax (nipples on the midline at fit.nippleY, the
 *      breast base shrink-wrapped onto the male chest wall with a depth-weighted warp);
 *   3. fixes each mesh's winding (signed volume for closed shells, a centroid test for open patches) and writes
 *      OBJ files in the BodyParts3D input frame plus a build-atlas manifest;
 *   4. runs build-atlas.mjs with the HD and lite settings read from the existing atlas.json files;
 *   5. merges the result into data/hd/atlas.json and data/lite/atlas.json (systems, concepts, structures and
 *      pieces appended after the male ones; indices offset; `base` records the male counts so a rebuild
 *      replaces the layers instead of stacking them) and copies the two GLBs next to the male ones.
 *
 * Usage:
 *   node build-female-atlas.mjs --src DIR [--manifest FILE] [--work DIR] [--only hd|lite] [--fit-only] [--no-pack]
 *   --src DIR    the HRA female GLBs (reproductive_female.glb, integumentary_female.glb, skeletal_female.glb,
 *                renal_female.glb), e.g. public/anatomy/ of the Anatria-3D redistribution
 *   --manifest   default tools/manifest/female-source.json
 *   --work DIR   scratch directory for OBJs and the per-layer builds (default <tmp>/female-atlas)
 *   --fit-only   print the fit diagnostics and write the OBJs, do not build or merge
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const o = { manifest: path.join(__dirname, 'manifest', 'female-source.json'), work: path.join(os.tmpdir(), 'female-atlas'), only: null, fitOnly: false, pack: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const next = () => argv[++i];
    switch (a) {
      case '--src': o.src = next(); break;
      case '--manifest': o.manifest = next(); break;
      case '--work': o.work = next(); break;
      case '--only': o.only = next(); break;
      case '--fit-only': o.fitOnly = true; break;
      case '--no-pack': o.pack = false; break;
      default: console.error(`unknown option ${a}`); process.exit(2);
    }
  }
  if (!o.src) { console.error('Required: --src DIR (the HRA female GLBs)'); process.exit(2); }
  return o;
}

// ------------------------------------------------------------------ mesh IO --
/** World-space meshes of every named node in an HRA GLB (Draco): Map name -> { positions (m), indices }. */
async function loadHRA(file) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
  const doc = await io.read(file); const out = new Map();
  for (const n of doc.getRoot().listNodes()) {
    const m = n.getMesh(); if (!m) continue; const wm = n.getWorldMatrix();
    const pos = [], idx = [];
    for (const p of m.listPrimitives()) {
      const a = p.getAttribute('POSITION').getArray(); const base = pos.length / 3;
      for (let i = 0; i < a.length; i += 3) { const x = a[i], y = a[i + 1], z = a[i + 2]; pos.push(wm[0] * x + wm[4] * y + wm[8] * z + wm[12], wm[1] * x + wm[5] * y + wm[9] * z + wm[13], wm[2] * x + wm[6] * y + wm[10] * z + wm[14]); }
      const ind = p.getIndices(); if (ind) { const ia = ind.getArray(); for (let i = 0; i < ia.length; i++) idx.push(ia[i] + base); } else for (let i = 0; i < a.length / 3; i++) idx.push(base + i);
    }
    out.set(n.getName(), { positions: Float64Array.from(pos), indices: Uint32Array.from(idx) });
  }
  return out;
}
/** World-space vertex clouds of a male atlas GLB (meshopt, gltfpack -kn): Map pieceId -> Float64Array xyz (mm). */
async function loadMale(file) {
  const buf = fs.readFileSync(file); const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((res, rej) => loader.parse(ab, '', res, rej));
  gltf.scene.updateMatrixWorld(true); const out = new Map(); const v = new THREE.Vector3();
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return; const name = o.name.startsWith('mesh_') && o.parent ? o.parent.name : o.name;
    const pos = o.geometry.getAttribute('position'); const pts = new Float64Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); pts[i * 3] = v.x; pts[i * 3 + 1] = v.y; pts[i * 3 + 2] = v.z; }
    out.set(name, pts);
  });
  return out;
}

// ------------------------------------------------------------------ geometry --
const bbox = (p) => { const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { if (p[i + k] < b[k]) b[k] = p[i + k]; if (p[i + k] > b[k + 3]) b[k + 3] = p[i + k]; } return b; };
const mean = (p) => { const m = [0, 0, 0]; const n = p.length / 3; for (let i = 0; i < p.length; i += 3) { m[0] += p[i]; m[1] += p[i + 1]; m[2] += p[i + 2]; } return m.map(v => v / n); };
const filter = (p, pred) => { const out = []; for (let i = 0; i < p.length; i += 3) if (pred(p[i], p[i + 1], p[i + 2])) out.push(p[i], p[i + 1], p[i + 2]); return Float64Array.from(out); };
const concat = (...arrs) => { const n = arrs.reduce((a, b) => a + b.length, 0); const out = new Float64Array(n); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };
const fmt = (v, d = 1) => (Array.isArray(v) ? v.map(x => (+x).toFixed(d)).join(', ') : (+v).toFixed(d));

/** Highest point of the anterior pubic symphysis: points within `half` of the midline x and `depth` of the most anterior z. */
function symphysisTop(points, midX, half, depth, topBand) {
  const zmax = Math.max(...Array.from({ length: points.length / 3 }, (_, i) => points[i * 3 + 2]));
  const near = filter(points, (x, y, z) => Math.abs(x - midX) < half && z > zmax - depth);
  const ymax = bbox(near)[4];
  return mean(filter(near, (x, y) => y > ymax - topBand));
}
/** Sacral promontory: the mean of the highest band of the sacrum. */
function promontory(points, band) { const ymax = bbox(points)[4]; return mean(filter(points, (x, y) => y > ymax - band)); }

/** Boundary-edge count and signed volume of an indexed mesh (positions welded by value for the edge test). */
function meshStats(positions, indices) {
  const map = new Map(); const remap = new Uint32Array(positions.length / 3);
  for (let i = 0; i < remap.length; i++) { const k = positions[i * 3].toFixed(7) + ',' + positions[i * 3 + 1].toFixed(7) + ',' + positions[i * 3 + 2].toFixed(7); let j = map.get(k); if (j === undefined) { j = map.size; map.set(k, j); } remap[i] = j; }
  const edges = new Map(); let vol = 0; let area = 0; let dotSum = 0; const c = mean(positions);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3, b = indices[t + 1] * 3, d = indices[t + 2] * 3;
    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2], bx = positions[b], by = positions[b + 1], bz = positions[b + 2], cx = positions[d], cy = positions[d + 1], cz = positions[d + 2];
    vol += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const fx = (ax + bx + cx) / 3 - c[0], fy = (ay + by + cy) / 3 - c[1], fz = (az + bz + cz) / 3 - c[2];
    const l = Math.hypot(nx, ny, nz) || 1; area += l; dotSum += (nx * fx + ny * fy + nz * fz) / (Math.hypot(fx, fy, fz) || 1);   // area-weighted outwardness
    for (const [u, v] of [[remap[indices[t]], remap[indices[t + 1]]], [remap[indices[t + 1]], remap[indices[t + 2]]], [remap[indices[t + 2]], remap[indices[t]]]]) { const k = u < v ? u * 4294967296 + v : v * 4294967296 + u; edges.set(k, (edges.get(k) || 0) + 1); }
  }
  let open = 0; for (const n of edges.values()) if (n === 1) open++;
  return { volume: vol / 6, openRatio: open / (edges.size || 1), outwardness: dotSum / (area || 1) };
}
function flipWinding(indices) { for (let t = 0; t < indices.length; t += 3) { const tmp = indices[t + 1]; indices[t + 1] = indices[t + 2]; indices[t + 2] = tmp; } }
/**
 * Make the winding outward. Closed or nearly closed shells (open-edge ratio < 6 %) with a meaningful enclosed
 * volume use its sign, which is what build-atlas checks too; open patches (nipple, areola, peritoneal folds) use
 * an area-weighted centroid test and are marked `winding: keep` so build-atlas does not second-guess them.
 */
function orient(mesh, minVolume) {
  const s = meshStats(mesh.positions, mesh.indices);
  let method, flipped = false;
  if (Math.abs(s.volume) >= minVolume && s.openRatio < 0.06) { method = 'volume'; if (s.volume < 0) flipped = true; }
  else { method = 'centroid'; if (s.outwardness < 0) flipped = true; }
  if (flipped) flipWinding(mesh.indices);
  return { ...s, method, flipped, keep: method === 'centroid' };
}

/** Affine per-axis map v' = s*v + b applied in place (positions in metres in → millimetres out when s carries the 1000). */
function transform(positions, s, b) { const out = new Float64Array(positions.length); for (let i = 0; i < positions.length; i += 3) { out[i] = s * positions[i] + b[0]; out[i + 1] = s * positions[i + 1] + b[1]; out[i + 2] = s * positions[i + 2] + b[2]; } return out; }

// ----------------------------------------------------------- height fields --
/** A 2-D grid over (x, y) storing a scalar per cell with nearest-cell fill and box smoothing; bilinear sampling. */
class Field {
  constructor(x0, x1, y0, y1, cell) { this.x0 = x0; this.y0 = y0; this.cell = cell; this.nx = Math.ceil((x1 - x0) / cell) + 1; this.ny = Math.ceil((y1 - y0) / cell) + 1; this.v = new Float64Array(this.nx * this.ny).fill(NaN); }
  idx(x, y) { const i = Math.round((x - this.x0) / this.cell), j = Math.round((y - this.y0) / this.cell); if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) return -1; return j * this.nx + i; }
  accumulate(points, op) { for (let k = 0; k < points.length; k += 3) { const q = this.idx(points[k], points[k + 1]); if (q < 0) continue; const cur = this.v[q]; this.v[q] = Number.isNaN(cur) ? points[k + 2] : op(cur, points[k + 2]); } }
  fill() { // nearest defined cell
    const src = this.v.slice(); const def = []; for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) if (!Number.isNaN(src[j * this.nx + i])) def.push([i, j]);
    if (!def.length) return; for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) { if (!Number.isNaN(src[j * this.nx + i])) continue; let best = Infinity, bv = 0; for (const [a, b] of def) { const d = (a - i) * (a - i) + (b - j) * (b - j); if (d < best) { best = d; bv = src[b * this.nx + a]; } } this.v[j * this.nx + i] = bv; }
  }
  smooth(radiusCells) { const r = Math.max(0, Math.round(radiusCells)); if (!r) return; const src = this.v.slice(); for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) { let s = 0, w = 0; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= this.nx || b >= this.ny) continue; const g = Math.exp(-(di * di + dj * dj) / (2 * (r / 2) * (r / 2) || 1)); s += g * src[b * this.nx + a]; w += g; } this.v[j * this.nx + i] = s / w; } }
  sample(x, y) { const fx = (x - this.x0) / this.cell, fy = (y - this.y0) / this.cell; const i = Math.min(this.nx - 2, Math.max(0, Math.floor(fx))), j = Math.min(this.ny - 2, Math.max(0, Math.floor(fy))); const tx = Math.min(1, Math.max(0, fx - i)), ty = Math.min(1, Math.max(0, fy - j)); const v = this.v; const a = v[j * this.nx + i], b = v[j * this.nx + i + 1], c = v[(j + 1) * this.nx + i], d = v[(j + 1) * this.nx + i + 1]; return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty; }
  defined(x, y) { const q = this.idx(x, y); return q >= 0 && !Number.isNaN(this.v[q]); }
}

// ------------------------------------------------------------- schematics --
/** Catmull-Rom resampling of a polyline into n points (endpoints kept). */
function resample(path, n) {
  if (path.length === 2) return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return path[0].map((v, k) => v + (path[1][k] - v) * t); });
  const P = [path[0], ...path, path[path.length - 1]]; const out = [];
  for (let i = 0; i < n; i++) { const u = (i / (n - 1)) * (path.length - 1); const seg = Math.min(path.length - 2, Math.floor(u)); const t = u - seg; const p0 = P[seg], p1 = P[seg + 1], p2 = P[seg + 2], p3 = P[seg + 3];
    out.push([0, 1, 2].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t))); }
  return out;
}
const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), scale = (a, s) => a.map(v => v * s), norm = (a) => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** A closed tube with elliptical cross-section (radius [rx, rz] per path point, interpolated) and rounded ends. */
function tube(def) {
  const along = 28, around = 40, capRings = 8;
  const pts = resample(def.path, along); const rad = Array.from({ length: along }, (_, i) => { const u = (i / (along - 1)) * (def.radius.length - 1); const a = Math.min(def.radius.length - 2, Math.floor(u)), t = u - a; return [0, 1].map(k => def.radius[a][k] + (def.radius[a + 1][k] - def.radius[a][k]) * t); });
  const frames = pts.map((p, i) => { const T = norm(sub(pts[Math.min(along - 1, i + 1)], pts[Math.max(0, i - 1)])); const ref = Math.abs(T[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]; const S = norm(cross(T, ref)); const N = norm(cross(S, T)); return { T, S, N }; });
  const V = [], F = [];
  const ring = (centre, S, N, rx, rz) => { const base = V.length / 3; for (let k = 0; k < around; k++) { const a = (k / around) * Math.PI * 2; const q = add(add(centre, scale(S, rx * Math.cos(a))), scale(N, rz * Math.sin(a))); V.push(...q); } return base; };
  const rings = [];
  const cap = (i, dir) => { const { T, S, N } = frames[i]; const [rx, rz] = rad[i]; const r = (rx + rz) / 2; for (let k = capRings - 1; k >= 1; k--) { const phi = (k / capRings) * Math.PI / 2; rings.push(ring(add(pts[i], scale(T, dir * r * Math.sin(phi))), S, N, rx * Math.cos(phi), rz * Math.cos(phi))); } };
  // start pole, start cap (rings from pole outward), body, end cap, end pole
  const pole0 = V.length / 3; V.push(...add(pts[0], scale(frames[0].T, -(rad[0][0] + rad[0][1]) / 2)));
  const capStart = []; { const { T, S, N } = frames[0]; const [rx, rz] = rad[0]; const r = (rx + rz) / 2; for (let k = capRings - 1; k >= 1; k--) { const phi = (k / capRings) * Math.PI / 2; capStart.push(ring(add(pts[0], scale(T, -r * Math.sin(phi))), S, N, rx * Math.cos(phi), rz * Math.cos(phi))); } }
  rings.push(...capStart);
  for (let i = 0; i < along; i++) rings.push(ring(pts[i], frames[i].S, frames[i].N, rad[i][0], rad[i][1]));
  { const { T, S, N } = frames[along - 1]; const [rx, rz] = rad[along - 1]; const r = (rx + rz) / 2; for (let k = 1; k < capRings; k++) { const phi = (k / capRings) * Math.PI / 2; rings.push(ring(add(pts[along - 1], scale(T, r * Math.sin(phi))), S, N, rx * Math.cos(phi), rz * Math.cos(phi))); } }
  const pole1 = V.length / 3; V.push(...add(pts[along - 1], scale(frames[along - 1].T, (rad[along - 1][0] + rad[along - 1][1]) / 2)));
  for (let k = 0; k < around; k++) F.push(pole0, rings[0] + (k + 1) % around, rings[0] + k);
  for (let r = 0; r + 1 < rings.length; r++) for (let k = 0; k < around; k++) { const a = rings[r] + k, b = rings[r] + (k + 1) % around, c = rings[r + 1] + k, d = rings[r + 1] + (k + 1) % around; F.push(a, b, d, a, d, c); }
  const last = rings[rings.length - 1]; for (let k = 0; k < around; k++) F.push(pole1, last + k, last + (k + 1) % around);
  return { positions: Float64Array.from(V), indices: Uint32Array.from(F) };
}
/** An axis-aligned ellipsoid (UV sphere). */
function ellipsoid(def) {
  const seg = 36, ringsN = 24; const [cx, cy, cz] = def.center, [rx, ry, rz] = def.radii; const V = [], F = [];
  for (let j = 0; j <= ringsN; j++) { const phi = (j / ringsN) * Math.PI; for (let i = 0; i < seg; i++) { const th = (i / seg) * Math.PI * 2; V.push(cx + rx * Math.sin(phi) * Math.cos(th), cy + ry * Math.cos(phi), cz + rz * Math.sin(phi) * Math.sin(th)); } }
  for (let j = 0; j < ringsN; j++) for (let i = 0; i < seg; i++) { const a = j * seg + i, b = j * seg + (i + 1) % seg, c = (j + 1) * seg + i, d = (j + 1) * seg + (i + 1) % seg; F.push(a, c, d, a, d, b); }
  return { positions: Float64Array.from(V), indices: Uint32Array.from(F) };
}
function schematic(def) { if (def.kind === 'tube') return tube(def); if (def.kind === 'ellipsoid') return ellipsoid(def); throw new Error(`unknown schematic kind ${def.kind}`); }

// ------------------------------------------------------------------- OBJ ---
/** BodyParts3D input frame: x = subject's left, y = posterior, z = superior; build-atlas maps (x, y, z) -> (x, z, -y). */
function writeOBJ(file, mesh) {
  const lines = [`# generated by tools/build-female-atlas.mjs`]; const p = mesh.positions;
  for (let i = 0; i < p.length; i += 3) lines.push(`v ${p[i].toFixed(3)} ${(-p[i + 2]).toFixed(3)} ${p[i + 1].toFixed(3)}`);
  const ix = mesh.indices; for (let t = 0; t < ix.length; t += 3) lines.push(`f ${ix[t] + 1} ${ix[t + 1] + 1} ${ix[t + 2] + 1}`);
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

// ----------------------------------------------------------------- build ----
function run(cmd, args) { return new Promise((res, rej) => { const c = spawn(cmd, args, { stdio: 'inherit' }); c.on('close', code => code === 0 ? res() : rej(new Error(`${path.basename(args[0])} exited with ${code}`))); }); }

function merge(atlasPath, localPath, glbFrom, glbTo, layerInfo) {
  const atlas = JSON.parse(fs.readFileSync(atlasPath, 'utf8'));
  const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
  if (!atlas.base) atlas.base = { systems: atlas.systems.length, concepts: atlas.concepts.length, structures: atlas.structures.length, pieces: atlas.pieces.length, totals: { ...atlas.totals } };
  const base = atlas.base;
  atlas.systems = atlas.systems.slice(0, base.systems); atlas.concepts = atlas.concepts.slice(0, base.concepts);
  atlas.structures = atlas.structures.slice(0, base.structures); atlas.pieces = atlas.pieces.slice(0, base.pieces);
  const cOff = atlas.concepts.length, sOff = atlas.structures.length, pOff = atlas.pieces.length;
  for (const s of local.systems) atlas.systems.push(s);
  atlas.concepts.push(...local.concepts);
  for (const st of local.structures) atlas.structures.push({ ...st, pieces: st.pieces.map(i => i + pOff), parents: (st.parents || []).map(i => i + cOff), ...(st.pair !== undefined ? { pair: st.pair + sOff } : {}) });
  for (const p of local.pieces) atlas.pieces.push({ ...p, structure: p.structure + sOff, parents: (p.parents || []).map(i => i + cOff) });
  atlas.layers = [{ ...layerInfo, systems: local.systems.map(s => s.id), generated: local.generated, settings: local.settings, pieces: local.pieces.length, structures: local.structures.length, triangles: local.totals.triangles, sourceTriangles: local.totals.sourceTriangles, bytes: local.totals.bytes }];
  atlas.totals = { pieces: atlas.pieces.length, triangles: base.totals.triangles + local.totals.triangles, sourceTriangles: base.totals.sourceTriangles + local.totals.sourceTriangles, bytes: base.totals.bytes + local.totals.bytes, structures: atlas.structures.length, concepts: atlas.concepts.length };
  // sanity: pieces grouped by system in system order (the viewer relies on it)
  let k = 0; for (const s of atlas.systems) { const n = atlas.pieces.filter(p => p.system === s.id).length; for (let i = 0; i < n; i++, k++) if (atlas.pieces[k].system !== s.id) throw new Error(`pieces not grouped by system at ${k} (${s.id})`); }
  for (const s of local.systems) fs.copyFileSync(path.join(glbFrom, `${s.id}.glb`), path.join(glbTo, `${s.id}.glb`));
  fs.writeFileSync(atlasPath, JSON.stringify(atlas));
  console.log(`merged ${atlasPath}: ${atlas.systems.length} systems, ${atlas.pieces.length} pieces, ${atlas.structures.length} structures, ${atlas.concepts.length} concepts`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const M = JSON.parse(fs.readFileSync(opts.manifest, 'utf8'));
  const workObj = path.join(opts.work, 'obj'); fs.mkdirSync(workObj, { recursive: true });
  const log = (m) => console.log(m);

  // ---- sources
  const hra = new Map(); for (const f of Object.values(M.files)) { const file = path.join(opts.src, f); if (!fs.existsSync(file)) throw new Error(`missing ${file}`); for (const [k, v] of await loadHRA(file)) hra.set(k, v); }
  log(`HRA: ${hra.size} nodes from ${Object.keys(M.files).length} files`);
  const maleAtlas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'hd', 'atlas.json'), 'utf8'));
  const maleId = (name) => { const p = maleAtlas.pieces.find(p => p.name === name); if (!p) throw new Error(`male piece not found: ${name}`); return p.id; };
  const sysFile = (sid) => path.join(ROOT, 'data', 'hd', 'glb', `${sid}.glb`);
  const skeleton = await loadMale(sysFile('skeleton')); const skin = await loadMale(sysFile('skin'));
  const skinPts = [...skin.values()].sort((a, b) => b.length - a.length)[0];   // the skin shell (hair pieces are the small ones)

  // ---- pelvic fit
  const F = M.fit.pelvis;
  const hipL = hra.get(F.hipLeft).positions, hipR = hra.get(F.hipRight).positions;
  const hraHip = [bbox(hipR)[0], bbox(hipL)[3]];                 // right edge .. left edge (m)
  const maleHipL = skeleton.get(maleId(F.male.hipLeft)), maleHipR = skeleton.get(maleId(F.male.hipRight));
  const maleHip = [bbox(maleHipR)[0], bbox(maleHipL)[3]];        // mm
  const pub = concat(...F.pubis.map(n => hra.get(n).positions));
  const pubMidX = (bbox(hra.get(F.pubis[0]).positions)[0] + bbox(hra.get(F.pubis[1]).positions)[3]) / 2;
  const hraSym = symphysisTop(pub, pubMidX, 0.012, 0.025, 0.006);
  const maleSym = symphysisTop(concat(maleHipL, maleHipR), 0, 12, 25, 6);
  const hraProm = promontory(hra.get(F.sacrum).positions, 0.010), maleProm = promontory(skeleton.get(maleId(F.male.sacrum)), 10);
  const hipRatio = (maleHip[1] - maleHip[0]) / ((hraHip[1] - hraHip[0]) * 1000);
  const conj = (a, b) => Math.hypot(a[1] - b[1], a[2] - b[2]);
  const conjRatio = conj(maleSym, maleProm) / (conj(hraSym, hraProm) * 1000);
  const sP = 1000 * (hipRatio + conjRatio) / 2;                  // metres -> mm, one uniform scale
  const bP = [(maleHip[0] + maleHip[1]) / 2 - sP * (hraHip[0] + hraHip[1]) / 2, maleSym[1] - sP * hraSym[1], maleSym[2] - sP * hraSym[2]];
  const promPred = [sP * hraProm[0] + bP[0], sP * hraProm[1] + bP[1], sP * hraProm[2] + bP[2]];
  log(`pelvis: hip-width ratio ${hipRatio.toFixed(3)}, symphysis-promontory ratio ${conjRatio.toFixed(3)} -> scale ${(sP / 1000).toFixed(3)}; offset [${fmt(bP)}] mm`);
  log(`  symphysis top HRA [${fmt(hraSym.map(v => v * 1000))}] -> male [${fmt(maleSym)}]; promontory predicted [${fmt(promPred)}] vs male [${fmt(maleProm)}] (error ${fmt(promPred.map((v, i) => v - maleProm[i]))} mm)`);
  const TP = (pos) => transform(pos, sP, bP);

  // ---- thoracic fit: same scale; nipples centred at nippleY; base embedded under the chest skin, then shrink-wrapped
  const T = M.fit.thorax; const sT = sP;
  const nip = T.nipple.map(n => mean(hra.get(n).positions)); const nipMid = [(nip[0][0] + nip[1][0]) / 2, (nip[0][1] + nip[1][1]) / 2];
  const bT = [0 - sT * nipMid[0], T.nippleY - sT * nipMid[1], 0];
  // chest field from the male skin: the most anterior skin point per cell over the front of the torso
  const chest = new Field(-220, 220, 1060, 1380, T.warpCell); chest.accumulate(filter(skinPts, (x, y, z) => Math.abs(x) <= 200 && y >= 1060 && y <= 1380 && z > 60), Math.max); chest.fill(); chest.smooth(1);
  // base depth (before z offset) at the nipple column, per side, in male-frame mm without bz
  let zbSum = 0, targetSum = 0; const anchors = [];
  for (let k = 0; k < 2; k++) { const fat = transform(hra.get(T.fat[k]).positions, sT, bT); const nx = sT * nip[k][0] + bT[0], ny = sT * nip[k][1] + bT[1];
    const col = filter(fat, (x, y) => Math.abs(x - nx) < 15 && Math.abs(y - ny) < 15); zbSum += bbox(col)[2]; targetSum += chest.sample(nx, ny) - T.breastEmbed; anchors.push([nx, ny]); }
  bT[2] = targetSum / 2 - zbSum / 2;
  log(`thorax: nipples at x ${fmt([sT * nip[0][0] + bT[0], sT * nip[1][0] + bT[0]])}, y ${T.nippleY}; base target z ${fmt(targetSum / 2)} (chest skin - ${T.breastEmbed}); offset [${fmt(bT)}]; breast scale ${T.breastScale ?? 1}`);
  // affine placement, then each breast scaled about the point where its nipple column meets the chest wall
  const bs = T.breastScale ?? 1;
  const TT = (pos, k) => { const out = transform(pos, sT, bT); if (bs === 1) return out; const [ax, ay] = anchors[k], az = targetSum / 2; for (let i = 0; i < out.length; i += 3) { out[i] = ax + (out[i] - ax) * bs; out[i + 1] = ay + (out[i + 1] - ay) * bs; out[i + 2] = az + (out[i + 2] - az) * bs; } return out; };
  // warp fields per side from the breast body: base (min z) and front (max z) per cell; displacement d = target - base
  const warps = T.fat.map((fatName, k) => {
    const fat = TT(hra.get(fatName).positions, k); const b = bbox(fat);
    const baseF = new Field(b[0] - 20, b[3] + 20, b[1] - 20, b[4] + 20, T.warpCell), frontF = new Field(b[0] - 20, b[3] + 20, b[1] - 20, b[4] + 20, T.warpCell), dF = new Field(b[0] - 20, b[3] + 20, b[1] - 20, b[4] + 20, T.warpCell);
    baseF.accumulate(fat, Math.min); frontF.accumulate(fat, Math.max);
    let n = 0, sum = 0, worst = 0;
    for (let j = 0; j < dF.ny; j++) for (let i = 0; i < dF.nx; i++) { const q = j * dF.nx + i; if (Number.isNaN(baseF.v[q])) continue; const x = dF.x0 + i * dF.cell, y = dF.y0 + j * dF.cell; const d = (chest.sample(x, y) - T.breastEmbed) - baseF.v[q]; dF.v[q] = d; n++; sum += Math.abs(d); if (Math.abs(d) > Math.abs(worst)) worst = d; }
    log(`  ${fatName}: footprint x ${fmt([b[0], b[3]], 0)} y ${fmt([b[1], b[4]], 0)} z ${fmt([b[2], b[5]], 0)}; base-to-chest gap before warp: mean |d| ${fmt(sum / n)} mm, worst ${fmt(worst)} mm over ${n} cells`);
    baseF.fill(); frontF.fill(); dF.fill(); dF.smooth(T.warpSmooth / T.warpCell);
    return (pos) => { const out = new Float64Array(pos.length); for (let i = 0; i < pos.length; i += 3) { const x = pos[i], y = pos[i + 1], z = pos[i + 2]; const base = baseF.sample(x, y), front = frontF.sample(x, y); const depth = front - base; const w = depth < 5 ? 1 : Math.min(1, Math.max(0, (front - z) / depth)); out[i] = x; out[i + 1] = y; out[i + 2] = z + w * dF.sample(x, y); } return out; };
  });
  const sideOf = (rec) => (rec.side === 'right' ? 1 : 0);

  // ---- pieces
  const minVolume = 5e-8 * sP * sP * sP;                        // 0.05 cm3 in the scaled frame
  const structures = [], pieces = []; const sysCount = new Map(M.systems.map(s => [s.id, 0]));
  const cIndex = new Map(M.concepts.map((c, i) => [c.id, i])); const sIndex = new Map(M.structures.map((s, i) => [s.id, i]));
  let srcTris = 0;
  for (const rec of M.structures) {
    let mesh, concept = rec.concept;
    if (rec.node) {
      const src = hra.get(rec.node); if (!src) throw new Error(`HRA node not found: ${rec.node} (${rec.id})`);
      let pos = rec.fit === 'thorax' ? warps[sideOf(rec)](TT(src.positions, sideOf(rec))) : TP(src.positions);
      mesh = { positions: pos, indices: Uint32Array.from(src.indices) };
    } else if (rec.schematic) { mesh = schematic(rec.schematic); }
    else throw new Error(`${rec.id}: needs node or schematic`);
    const o = orient(mesh, minVolume); srcTris += mesh.indices.length / 3;
    const b = bbox(mesh.positions);
    log(`  ${rec.id} ${rec.name.padEnd(36)} ${String(mesh.indices.length / 3).padStart(7)} tris  ${o.method.padEnd(8)}${o.flipped ? ' flipped' : '        '}  open ${(o.openRatio * 100).toFixed(1).padStart(4)}%  bbox [${fmt(b, 0)}]`);
    writeOBJ(path.join(workObj, `${rec.id}.obj`), mesh);
    const parents = rec.parents.map(id => { if (!cIndex.has(id)) throw new Error(`unknown concept ${id}`); return cIndex.get(id); });
    const st = { id: rec.id, name: rec.name, concept: concept.replace(/^FMA:/, 'FMA'), system: rec.system, pieces: [pieces.length], parents };
    if (rec.side) st.side = rec.side; if (rec.pair) { if (!sIndex.has(rec.pair)) throw new Error(`unknown pair ${rec.pair}`); st.pair = sIndex.get(rec.pair); }
    const piece = { id: rec.id, file: `${rec.id}.obj`, name: rec.name, system: rec.system, concept: st.concept, parents, structure: structures.length };
    if (rec.side) piece.side = rec.side; if (rec.pair) piece.pair = rec.pair; if (o.keep) piece.winding = 'keep';
    structures.push(st); pieces.push(piece); sysCount.set(rec.system, sysCount.get(rec.system) + 1);
  }
  const systems = M.systems.map(s => ({ ...s, count: sysCount.get(s.id) }));
  const manifest = { source: M.source, systems, concepts: M.concepts, structures, pieces };
  fs.writeFileSync(path.join(opts.work, 'manifest.json'), JSON.stringify(manifest));
  log(`wrote ${pieces.length} OBJs (${srcTris.toLocaleString()} source triangles) and ${path.join(opts.work, 'manifest.json')}`);
  if (opts.fitOnly) return;

  // ---- build with the male settings, then merge
  const layerInfo = { id: 'female', name: 'Female body and gender-affirming surgery', source: M.source, tool: 'tools/build-female-atlas.mjs', manifest: 'tools/manifest/female-source.json' };
  for (const q of ['hd', 'lite']) {
    if (opts.only && opts.only !== q) continue;
    const atlasPath = path.join(ROOT, 'data', q, 'atlas.json'); const settings = JSON.parse(fs.readFileSync(atlasPath, 'utf8')).settings;
    const out = path.join(opts.work, q); fs.mkdirSync(out, { recursive: true });
    const args = [path.join(__dirname, 'build-atlas.mjs'), '--src', workObj, '--manifest', path.join(opts.work, 'manifest.json'), '--out', out, '--error', String(settings.error), '--ratio', String(settings.ratio), '--min-tris', String(settings.minTris), '--max-tris', String(settings.maxTris), '--jobs', '1'];
    if (!opts.pack) args.push('--no-pack');
    log(`\nbuilding ${q} (error ${settings.error} mm, ratio ${settings.ratio}, ${settings.minTris}..${settings.maxTris} tris)`);
    await run(process.execPath, args);
    merge(atlasPath, path.join(out, 'atlas.json'), path.join(out, 'glb'), path.join(ROOT, 'data', q, 'glb'), layerInfo);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
