#!/usr/bin/env node
/**
 * build-female-atlas.mjs — appends two layers to the atlas without touching the BodyParts3D male systems:
 *
 *  - reproductive-female: the female pelvic organs and breasts of the NIH Human Reference Atlas (HRA, united
 *    female v1.5, built from the Visible Human Female; CC BY 4.0), fitted into the male reference frame;
 *  - vaginoplasty and phalloplasty: schematic layers (neovaginal canal, neoclitoris, labia; neophallus, neourethra,
 *    scrotum with testicular implants) generated procedurally to typical dimensions in that frame, each checked
 *    for a path that bends tighter than its tube and for triangles that cross each other.
 *
 * The mapping (which HRA node becomes which structure, names, concepts, sides, the schematic shapes and the fit
 * parameters) lives in tools/manifest/female-source.json. This tool:
 *   1. decodes the HRA GLBs (Draco) and the male skeleton/skin/muscle GLBs (meshopt) it needs as landmarks;
 *   2. fits the pelvis (one uniform scale, x centred on the hip bones, y/z pinned at the top of the pubic
 *      symphysis; the sacral promontory is the check) and the thorax (nipples on the midline at fit.nippleY, the
 *      breast base shrink-wrapped onto the male chest wall with a depth-weighted warp);
 *   3. fixes each mesh's winding (per connected component, oriented by a ray-cast facing test, meaningful for open
 *      shells where the signed volume is not), flags sheets and open shells as two-sided (build-atlas appends the
 *      reversed copy of their faces after simplification; mirror partners share the decision) and writes OBJ files
 *      in the BodyParts3D input frame plus a build-atlas manifest;
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
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';

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
/** Deterministic unit directions spread over the sphere (Fibonacci lattice). */
function sphereDirs(n) { const out = []; const g = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - (2 * i + 1) / n; const r = Math.sqrt(Math.max(0, 1 - y * y)); const a = g * i; out.push([r * Math.cos(a), y, r * Math.sin(a)]); } return out; }
/**
 * How the mesh faces a viewer: cast rays from outside the bounding sphere towards points spread through the mesh and
 * count whether the FIRST triangle each ray meets faces the ray (front) or not (back). This is what the renderer sees
 * with back-face culling, and unlike the signed volume it is meaningful for open shells and surface patches.
 * Returns { front, back } hit counts.
 */
function facing(positions, indices, rays = 160) {
  const b = bbox(positions); const c = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2];
  const R = Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) * 0.75 + 1;
  const dirs = sphereDirs(rays), targets = sphereDirs(rays * 7 + 3);
  let front = 0, back = 0; const tri = indices.length / 3;
  for (let k = 0; k < rays; k++) {
    const d0 = dirs[k]; const o = [c[0] + d0[0] * R * 2, c[1] + d0[1] * R * 2, c[2] + d0[2] * R * 2];
    const tg = targets[(k * 7 + 3) % targets.length];                     // a point inside the box, off-centre so the rays sample the surface
    const t = [c[0] + tg[0] * (b[3] - b[0]) * 0.35, c[1] + tg[1] * (b[4] - b[1]) * 0.35, c[2] + tg[2] * (b[5] - b[2]) * 0.35];
    const d = norm(sub(t, o));
    let best = Infinity, bestFront = 0;
    for (let f = 0; f < tri; f++) {
      const a = indices[f * 3] * 3, bb = indices[f * 3 + 1] * 3, cc = indices[f * 3 + 2] * 3;
      const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
      const e1x = positions[bb] - ax, e1y = positions[bb + 1] - ay, e1z = positions[bb + 2] - az;
      const e2x = positions[cc] - ax, e2y = positions[cc + 1] - ay, e2z = positions[cc + 2] - az;
      // Moller-Trumbore
      const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
      const det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det; const tx = o[0] - ax, ty = o[1] - ay, tz = o[2] - az;
      const u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
      const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
      const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv; if (v < 0 || u + v > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv; if (tt <= 1e-6 || tt >= best) continue;
      best = tt; bestFront = det > 0 ? 1 : 0;                              // det = e1 . (d x e2) = -(d . n): positive means the face normal points back at the ray, i.e. a front face
    }
    if (best < Infinity) { if (bestFront) front++; else back++; }
  }
  return { front, back };
}
/**
 * Make every triangle face outward. HRA meshes are not always consistently wound within one mesh, so first the winding
 * is unified across each connected component (a neighbour that shares an edge in the same direction is flipped), then
 * each component is oriented by the ray-cast facing test above (the renderer's view, meaningful for open shells and
 * surface patches where the signed volume is not). Every piece is marked `winding: keep` so build-atlas does not
 * second-guess the result. Returns the facing after the fix for the build-time check.
 */
function orient(mesh) {
  const { positions, indices } = mesh; const s = meshStats(positions, indices);
  // weld by position so shared edges are found even where the source duplicates vertices
  const map = new Map(); const remap = new Uint32Array(positions.length / 3);
  for (let i = 0; i < remap.length; i++) { const k = positions[i * 3].toFixed(6) + ',' + positions[i * 3 + 1].toFixed(6) + ',' + positions[i * 3 + 2].toFixed(6); let j = map.get(k); if (j === undefined) { j = map.size; map.set(k, j); } remap[i] = j; }
  const nf = indices.length / 3; const edgeFaces = new Map();
  const ekey = (u, v) => (u < v ? u * 4294967296 + v : v * 4294967296 + u);
  for (let f = 0; f < nf; f++) { const a = remap[indices[f * 3]], b = remap[indices[f * 3 + 1]], c = remap[indices[f * 3 + 2]]; for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = ekey(u, v); let l = edgeFaces.get(k); if (!l) { l = []; edgeFaces.set(k, l); } l.push(f); } }
  const dirEdge = (f, u, v) => { const a = remap[indices[f * 3]], b = remap[indices[f * 3 + 1]], c = remap[indices[f * 3 + 2]]; return (a === u && b === v) || (b === u && c === v) || (c === u && a === v); };
  const comp = new Int32Array(nf).fill(-1); let ncomp = 0, unified = 0;
  for (let seed = 0; seed < nf; seed++) {
    if (comp[seed] !== -1) continue; const stack = [seed]; comp[seed] = ncomp;
    while (stack.length) {
      const f = stack.pop(); const a = remap[indices[f * 3]], b = remap[indices[f * 3 + 1]], c = remap[indices[f * 3 + 2]];
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const l = edgeFaces.get(ekey(u, v)); if (l.length !== 2) continue;              // do not propagate across boundary or non-manifold edges
        const g = l[0] === f ? l[1] : l[0]; if (comp[g] !== -1) continue;
        if (dirEdge(g, u, v)) { const t = indices[g * 3 + 1]; indices[g * 3 + 1] = indices[g * 3 + 2]; indices[g * 3 + 2] = t; unified++; }   // same direction on the shared edge: the neighbour is wound the other way
        comp[g] = ncomp; stack.push(g);
      }
    }
    ncomp++;
  }
  // orient each component by what a viewer sees of it
  const byComp = Array.from({ length: ncomp }, () => []);
  for (let f = 0; f < nf; f++) byComp[comp[f]].push(f);
  let flippedFaces = 0, compsFlipped = 0;
  for (const faces of byComp) {
    if (faces.length < 8) continue;
    const sub = new Uint32Array(faces.length * 3); faces.forEach((f, i) => { sub[i * 3] = indices[f * 3]; sub[i * 3 + 1] = indices[f * 3 + 1]; sub[i * 3 + 2] = indices[f * 3 + 2]; });
    const fc = facing(positions, sub, faces.length > 2000 ? 160 : 96);
    if (fc.back > fc.front) { for (const f of faces) { const t = indices[f * 3 + 1]; indices[f * 3 + 1] = indices[f * 3 + 2]; indices[f * 3 + 2] = t; } flippedFaces += faces.length; compsFlipped++; }
  }
  const after = facing(positions, indices, 200);
  const frontRatio = after.front / ((after.front + after.back) || 1);
  return { ...s, method: 'raycast', flipped: flippedFaces > 0, unified, components: ncomp, compsFlipped, keep: true, frontRatio, hits: after.front + after.back };
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
  // the resampler is a uniform Catmull-Rom spline (it overshoots where control points are unevenly spaced): a path that
  // bends tighter than the tube's own radius folds the tube through itself, so refuse it here rather than ship it
  for (let i = 1; i + 1 < along; i++) {
    const a = sub(pts[i], pts[i - 1]), b = sub(pts[i + 1], pts[i]); const la = Math.hypot(...a), lb = Math.hypot(...b);
    const th = Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / ((la * lb) || 1))));
    if (th < 1e-6) continue;
    const turnRadius = Math.min(la, lb) / (2 * Math.sin(th / 2)), r = Math.max(...rad[i]);
    if (turnRadius < r) throw new Error(`tube path bends with a turn radius of ${turnRadius.toFixed(1)} mm at [${pts[i].map(v => v.toFixed(1)).join(', ')}], tighter than its own radius ${r} mm: space the control points evenly`);
  }
  // Rotation-minimising frames: the first S comes from a fixed reference, every later one is the previous S carried along
  // the path (projected off the new tangent), so the cross-section never flips between rings.
  const frames = []; let prevS = null;
  for (let i = 0; i < along; i++) {
    const T = norm(sub(pts[Math.min(along - 1, i + 1)], pts[Math.max(0, i - 1)]));
    let S;
    if (!prevS) { const ref = Math.abs(T[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]; S = norm(cross(T, ref)); }
    else { const dp = prevS[0] * T[0] + prevS[1] * T[1] + prevS[2] * T[2]; S = norm(sub(prevS, scale(T, dp))); }
    prevS = S; frames.push({ T, S, N: norm(cross(S, T)) });
  }
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
/** Pairs of triangles that cross each other (an edge of one passing through the other, no shared vertex): a schematic
 *  solid must have none. Bounding boxes and a sweep along y prune the pairs. */
function selfIntersections(mesh) {
  const { positions: P, indices: I } = mesh; const nt = I.length / 3;
  const bb = new Float64Array(nt * 6);
  for (let t = 0; t < nt; t++) { for (let k = 0; k < 3; k++) { bb[t * 6 + k] = Infinity; bb[t * 6 + 3 + k] = -Infinity; }
    for (let j = 0; j < 3; j++) { const v = I[t * 3 + j] * 3; for (let k = 0; k < 3; k++) { const x = P[v + k]; if (x < bb[t * 6 + k]) bb[t * 6 + k] = x; if (x > bb[t * 6 + 3 + k]) bb[t * 6 + 3 + k] = x; } } }
  const vtx = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], key = (i) => `${P[i * 3].toFixed(5)},${P[i * 3 + 1].toFixed(5)},${P[i * 3 + 2].toFixed(5)}`;
  const orient = (a, b, c, p) => { const n = cross(sub(b, a), sub(c, a)), d = sub(p, a); return n[0] * d[0] + n[1] * d[1] + n[2] * d[2]; };
  const segTri = (p, q, A, B, C) => { const s1 = orient(A, B, C, p), s2 = orient(A, B, C, q); if (s1 * s2 >= 0) return false; const o1 = orient(p, q, A, B), o2 = orient(p, q, B, C), o3 = orient(p, q, C, A); return (o1 > 0 && o2 > 0 && o3 > 0) || (o1 < 0 && o2 < 0 && o3 < 0); };
  const order = Array.from({ length: nt }, (_, t) => t).sort((a, b) => bb[a * 6 + 1] - bb[b * 6 + 1]);
  let count = 0;
  for (let ia = 0; ia < nt; ia++) {
    const a = order[ia], aMaxY = bb[a * 6 + 4];
    for (let ib = ia + 1; ib < nt; ib++) {
      const b = order[ib]; if (bb[b * 6 + 1] > aMaxY) break;
      if (bb[a * 6] > bb[b * 6 + 3] || bb[b * 6] > bb[a * 6 + 3] || bb[a * 6 + 2] > bb[b * 6 + 5] || bb[b * 6 + 2] > bb[a * 6 + 5]) continue;
      const ai = [I[a * 3], I[a * 3 + 1], I[a * 3 + 2]], bi = [I[b * 3], I[b * 3 + 1], I[b * 3 + 2]];
      const ka = ai.map(key), kb = bi.map(key); if (ka.some(k => kb.includes(k))) continue;
      const A = ai.map(vtx), B = bi.map(vtx); let hit = false;
      for (let e = 0; e < 3 && !hit; e++) if (segTri(A[e], A[(e + 1) % 3], B[0], B[1], B[2])) hit = true;
      for (let e = 0; e < 3 && !hit; e++) if (segTri(B[e], B[(e + 1) % 3], A[0], A[1], A[2])) hit = true;
      if (hit) count++;
    }
  }
  return count;
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

function merge(atlasPath, localPath, glbFrom, glbTo, layerInfo) {   // layerInfo: one record per layer
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
  atlas.layers = layerInfo.map(l => { const sys = local.systems.filter(s => l.systems.includes(s.id)); const ids = new Set(sys.map(s => s.id));
    return { ...l, generated: local.generated, settings: local.settings, pieces: local.pieces.filter(p => ids.has(p.system)).length, structures: local.structures.filter(s => ids.has(s.system)).length,
      triangles: sys.reduce((a, s) => a + s.triangles, 0), bytes: sys.reduce((a, s) => a + s.bytes, 0) }; });
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
  await MeshoptSimplifier.ready;
  const structures = [], pieces = []; const sysCount = new Map(M.systems.map(s => [s.id, 0]));
  const cIndex = new Map(M.concepts.map((c, i) => [c.id, i])); const sIndex = new Map(M.structures.map((s, i) => [s.id, i]));
  let srcTris = 0;
  for (const rec of M.structures) {
    let mesh, concept = rec.concept;
    const nodeNames = rec.nodes || (rec.node ? [rec.node] : null);
    if (nodeNames) {
      const parts = nodeNames.map(n => { const src = hra.get(n); if (!src) throw new Error(`HRA node not found: ${n} (${rec.id})`); return src; });
      const pos = concat(...parts.map(p => rec.fit === 'thorax' ? warps[sideOf(rec)](TT(p.positions, sideOf(rec))) : TP(p.positions)));
      const idx = []; let off = 0; for (const p of parts) { for (let i = 0; i < p.indices.length; i++) idx.push(p.indices[i] + off); off += p.positions.length / 3; }
      mesh = { positions: pos, indices: Uint32Array.from(idx) };
    } else if (rec.schematic) {
      try { mesh = schematic(rec.schematic); } catch (e) { throw new Error(`${rec.id} ${rec.name}: ${e.message}`); }
      const crossings = selfIntersections(mesh);
      if (crossings) throw new Error(`${rec.id} ${rec.name}: ${crossings} pairs of triangles cross each other, the schematic solid passes through itself`);
    }
    else throw new Error(`${rec.id}: needs node(s) or schematic`);
    if (rec.presimplify && mesh.indices.length / 3 > rec.presimplify) {
      // a source mesh far denser than its mirror (the right breast is 5x the left) is brought to the same order first,
      // so build-atlas's ratio lands both sides on comparable triangle counts
      const [idx, err] = MeshoptSimplifier.simplify(mesh.indices, Float32Array.from(mesh.positions), 3, rec.presimplify * 3, 0.3, ['ErrorAbsolute']);
      log(`  ${rec.id}: pre-simplified ${mesh.indices.length / 3} -> ${idx.length / 3} triangles (error ${err.toFixed(3)} mm)`);
      mesh.indices = Uint32Array.from(idx);
    }
    const o = orient(mesh);
    // a sheet or an open shell (boundary edges, or an inner wall the view rays reach) needs both faces drawn: flag it,
    // and build-atlas appends the reversed copy of its faces after simplification (twoSidedCopy there), so the copy is
    // never simplified against its original
    o.twoSided = o.frontRatio < 0.9 || o.openRatio >= 0.005;
    srcTris += mesh.indices.length / 3;
    const b = bbox(mesh.positions);
    log(`  ${rec.id} ${rec.name.padEnd(36)} ${String(mesh.indices.length / 3).padStart(7)} tris  ${o.components} comp${o.compsFlipped ? ` (${o.compsFlipped} flipped)` : ''}${o.unified ? `, ${o.unified} faces re-wound` : ''}  front ${(o.frontRatio * 100).toFixed(0).padStart(3)}% of ${o.hits} rays  open ${(o.openRatio * 100).toFixed(1).padStart(4)}%  bbox [${fmt(b, 0)}]`);
    if (o.twoSided) log(`    two-sided: ${(100 - o.frontRatio * 100).toFixed(0)}% of view rays met the inner face, ${(o.openRatio * 100).toFixed(1)}% boundary edges`);
    if (rec.side && Math.sign((b[0] + b[3]) / 2) !== (rec.side === 'left' ? 1 : -1)) throw new Error(`${rec.id} ${rec.name}: bbox centre x ${fmt((b[0] + b[3]) / 2)} contradicts side ${rec.side}`);
    writeOBJ(path.join(workObj, `${rec.id}.obj`), mesh);
    const parents = rec.parents.map(id => { if (!cIndex.has(id)) throw new Error(`unknown concept ${id}`); return cIndex.get(id); });
    const st = { id: rec.id, name: rec.name, concept: concept.replace(/^FMA:/, 'FMA'), system: rec.system, pieces: [pieces.length], parents };
    if (rec.side) st.side = rec.side; if (rec.pair) { if (!sIndex.has(rec.pair)) throw new Error(`unknown pair ${rec.pair}`); st.pair = sIndex.get(rec.pair); }
    const piece = { id: rec.id, file: `${rec.id}.obj`, name: rec.name, system: rec.system, concept: st.concept, parents, structure: structures.length };
    if (rec.side) piece.side = rec.side; if (rec.pair) piece.pair = rec.pair; if (o.keep) piece.winding = 'keep'; if (o.twoSided) piece.twoSided = true;
    structures.push(st); pieces.push(piece); sysCount.set(rec.system, sysCount.get(rec.system) + 1);
  }
  // mirror partners take one decision, so paired structures never render differently from mirror-equivalent views
  const byId = new Map(pieces.map(p => [p.id, p]));
  for (const p of pieces) if (p.twoSided && p.pair && byId.has(p.pair) && !byId.get(p.pair).twoSided) { byId.get(p.pair).twoSided = true; log(`  ${p.pair}: two-sided to match its pair ${p.id}`); }
  const systems = M.systems.map(s => ({ ...s, count: sysCount.get(s.id) }));
  // every concept id a piece carries resolves to a concepts entry (the male atlas keeps that invariant)
  const concepts = M.concepts.slice(); const known = new Set(concepts.map(c => c.id)); const uses = new Map();
  for (const st of structures) { if (!uses.has(st.concept)) uses.set(st.concept, []); uses.get(st.concept).push(st.name); }
  for (const [id, names] of uses) { if (known.has(id)) continue; const nm = names.length > 1 ? names[0].replace(/^(Left|Right) /, '').replace(/ (left|right) /, ' ') : names[0]; concepts.push({ id, name: nm.toLowerCase() }); known.add(id); }
  const manifest = { source: M.source, systems, concepts, structures, pieces };
  fs.writeFileSync(path.join(opts.work, 'manifest.json'), JSON.stringify(manifest));
  log(`wrote ${pieces.length} OBJs (${srcTris.toLocaleString()} source triangles) and ${path.join(opts.work, 'manifest.json')}`);
  if (opts.fitOnly) return;

  // ---- build with the male settings, then merge
  const layerInfo = (M.layers || [{ id: 'female', name: 'Female body', source: M.source, systems: M.systems.map(s => s.id) }]).map(l => ({ ...l, tool: 'tools/build-female-atlas.mjs', manifest: 'tools/manifest/female-source.json' }));
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
