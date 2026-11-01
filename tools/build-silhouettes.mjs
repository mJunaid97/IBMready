#!/usr/bin/env node
// build-silhouettes.mjs — the outline of every piece of the 3D atlas as seen from the front, for the 2D "where in the body" figure.
//
// Reads data/hd/atlas.json and every data/hd/glb/*.glb, decodes the meshopt-compressed positions with the decoder vendored for
// the explorer, projects each piece onto the front plane (x towards the patient's left, y up, millimetres, the frame the pieces'
// `bbox` is in) and keeps the convex hull of its vertices, simplified to at most MAX_POINTS corners. The result is written to
// tools/derived/piece-hulls.json ({ "<piece id>": [[x, y], ...] }), which tools/build-content.py merges into one outline per
// organ (data/content/locator.json). Run it again only when the atlas geometry changes; it needs nothing but Node 18+.
//
//   node tools/build-silhouettes.mjs            write tools/derived/piece-hulls.json
//   node tools/build-silhouettes.mjs --check    also compare each hull's extent with the piece's bbox in atlas.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptDecoder } from '../vendor/three/addons/libs/meshopt_decoder.module.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_POINTS = 12;
const CHECK = process.argv.includes('--check');

const atlas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/hd/atlas.json'), 'utf8'));
const bboxOf = new Map(atlas.pieces.map(p => [p.id, p.bbox]));

/** Andrew's monotone chain; points are [x, y]; returns the hull counter-clockwise without repeating the first point. */
function hull(points) {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}
/** Drop the corner that adds the least area until `max` corners remain (Visvalingam), so the outline keeps its extremes. */
function simplify(poly, max) {
  const p = poly.slice();
  const area = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  while (p.length > max) {
    let best = 0, bestA = Infinity;
    for (let i = 0; i < p.length; i++) { const a = area(p[(i + p.length - 1) % p.length], p[i], p[(i + 1) % p.length]); if (a < bestA) { bestA = a; best = i; } }
    p.splice(best, 1);
  }
  return p;
}

await MeshoptDecoder.ready;
const out = {}; let worst = 0, checked = 0, bad = [];
const dir = path.join(ROOT, 'data/hd/glb');
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.glb')).sort()) {
  const buf = fs.readFileSync(path.join(dir, f));
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4); off += 8;
    if (type === 0x4E4F534A) json = JSON.parse(buf.subarray(off, off + len).toString('utf8'));
    else if (type === 0x004E4942) bin = buf.subarray(off, off + len);
    off += len;
  }
  // decode every compressed buffer view once
  const views = json.bufferViews.map(v => {
    const ext = v.extensions && v.extensions.EXT_meshopt_compression;
    if (!ext) return Buffer.from(bin.buffer, bin.byteOffset + (v.byteOffset || 0), v.byteLength);
    const target = new Uint8Array(ext.count * ext.byteStride);
    MeshoptDecoder.decodeGltfBuffer(target, ext.count, ext.byteStride, new Uint8Array(bin.buffer, bin.byteOffset + (ext.byteOffset || 0), ext.byteLength), ext.mode, ext.filter || 'NONE');
    return Buffer.from(target.buffer);
  });
  const scale3 = (n) => n.scale || [1, 1, 1], tr3 = (n) => n.translation || [0, 0, 0];
  for (const root of json.nodes.filter(n => n.name)) {
    const pts = [];
    for (const ci of root.children || []) {
      const node = json.nodes[ci]; if (node.mesh === undefined) continue;
      const acc = json.accessors[json.meshes[node.mesh].primitives[0].attributes.POSITION];
      const view = json.bufferViews[acc.bufferView], data = views[acc.bufferView];
      const stride = view.byteStride || 6, base = acc.byteOffset || 0;
      const norm = acc.normalized, comp = acc.componentType;      // 5123 = unsigned short, 5122 = short, 5126 = float
      const rd = (o) => comp === 5126 ? data.readFloatLE(o) : comp === 5123 ? (norm ? data.readUInt16LE(o) / 65535 : data.readUInt16LE(o)) : comp === 5122 ? (norm ? Math.max(data.readInt16LE(o) / 32767, -1) : data.readInt16LE(o)) : NaN;
      const w = comp === 5126 ? 4 : 2, s = scale3(node), t = tr3(node);
      // thin the vertex cloud: the hull of every 3rd vertex of a dense mesh is the same to well under a millimetre
      const step = acc.count > 40000 ? 3 : 1;
      for (let i = 0; i < acc.count; i += step) {
        const o = base + i * stride;
        pts.push([+(t[0] + s[0] * rd(o)).toFixed(1), +(t[1] + s[1] * rd(o + w)).toFixed(1)]);
      }
    }
    if (pts.length < 3) continue;
    const h = hull(pts);
    out[root.name] = simplify(h, MAX_POINTS).map(p => [Math.round(p[0]), Math.round(p[1])]);
    if (CHECK && bboxOf.get(root.name)) {
      const b = bboxOf.get(root.name);
      const x0 = Math.min(...h.map(p => p[0])), x1 = Math.max(...h.map(p => p[0])), y0 = Math.min(...h.map(p => p[1])), y1 = Math.max(...h.map(p => p[1]));
      const d = Math.max(Math.abs(x0 - b[0]), Math.abs(x1 - b[3]), Math.abs(y0 - b[1]), Math.abs(y1 - b[4]));
      checked++; if (d > worst) worst = d; if (d > 2) bad.push(`${root.name} off by ${d.toFixed(1)} mm`);
    }
  }
}
const missing = atlas.pieces.filter(p => !out[p.id]).length;
fs.mkdirSync(path.join(ROOT, 'tools/derived'), { recursive: true });
const keys = Object.keys(out).sort();
fs.writeFileSync(path.join(ROOT, 'tools/derived/piece-hulls.json'), '{\n' + keys.map(k => `${JSON.stringify(k)}:${JSON.stringify(out[k])}`).join(',\n') + '\n}\n');
console.log(`${keys.length} piece outlines written (${missing} of ${atlas.pieces.length} atlas pieces without one)`);
if (CHECK) console.log(`checked ${checked} against atlas.json bbox: worst difference ${worst.toFixed(2)} mm${bad.length ? '\n' + bad.slice(0, 10).join('\n') : ''}`);
