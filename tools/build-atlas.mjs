#!/usr/bin/env node
/**
 * build-atlas.mjs — Anatomy Nexus atlas geometry pipeline.
 *
 * Reads BodyParts3D meshes (Wavefront OBJ or binary STL), welds vertices,
 * simplifies every piece with meshoptimizer under an absolute error bound,
 * computes smooth normals, writes one GLB per anatomical system (one named
 * node per piece) and compresses it with gltfpack
 * (KHR_mesh_quantization + EXT_meshopt_compression).
 *
 * Usage:
 *   node build-atlas.mjs --src DIR --manifest atlas-source.json --out DIR [options]
 *
 * Options:
 *   --error MM      absolute simplification error bound in millimetres (default 0.6)
 *   --ratio R       target triangle ratio per piece before the error bound applies (default 0.12)
 *   --min-tris N    never simplify a piece below this many triangles (default 200)
 *   --max-tris N    hard cap of output triangles per piece (default 90000)
 *   --systems a,b   only build these system ids
 *   --jobs N        build systems in N parallel worker processes (default 1)
 *   --dry           parse + simplify and report statistics, write nothing
 *   --no-pack       skip gltfpack (write plain uncompressed GLB)
 *   --quiet         less logging
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- CLI ------
function parseArgs(argv) {
  const o = { error: 0.6, ratio: 0.12, minTris: 200, maxTris: 90000, jobs: 1, dry: false, pack: true, quiet: false, systems: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--src': o.src = next(); break;
      case '--manifest': o.manifest = next(); break;
      case '--out': o.out = next(); break;
      case '--error': o.error = parseFloat(next()); break;
      case '--ratio': o.ratio = parseFloat(next()); break;
      case '--min-tris': o.minTris = parseInt(next(), 10); break;
      case '--max-tris': o.maxTris = parseInt(next(), 10); break;
      case '--systems': o.systems = next().split(',').map(s => s.trim()).filter(Boolean); break;
      case '--jobs': o.jobs = parseInt(next(), 10); break;
      case '--dry': o.dry = true; break;
      case '--no-pack': o.pack = false; break;
      case '--quiet': o.quiet = true; break;
      case '--worker': o.worker = true; break;
      default: throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!o.src || !o.manifest || !o.out) {
    console.error('Required: --src DIR --manifest FILE --out DIR');
    process.exit(2);
  }
  return o;
}

// -------------------------------------------------------------- parsing ----
/** Parse a Wavefront OBJ file into { positions: Float32Array, indices: Uint32Array }. */
function parseOBJ(filePath) {
  const text = fs.readFileSync(filePath, 'latin1');
  const positions = [];
  const indices = [];
  let lineStart = 0;
  const len = text.length;
  while (lineStart < len) {
    let lineEnd = text.indexOf('\n', lineStart);
    if (lineEnd === -1) lineEnd = len;
    const c0 = text.charCodeAt(lineStart);
    if (c0 === 118 /* v */ && text.charCodeAt(lineStart + 1) === 32) {
      const parts = text.slice(lineStart + 2, lineEnd).trim().split(/\s+/);
      // BodyParts3D: x = subject's left, y = posterior, z = superior (mm). glTF: y up, +z toward viewer.
      positions.push(+parts[0], +parts[2], -(+parts[1]));
    } else if (c0 === 102 /* f */ && text.charCodeAt(lineStart + 1) === 32) {
      const parts = text.slice(lineStart + 2, lineEnd).trim().split(/\s+/);
      const n = parts.length;
      if (n >= 3) {
        const idx = new Array(n);
        for (let k = 0; k < n; k++) {
          const p = parts[k];
          const slash = p.indexOf('/');
          let v = parseInt(slash === -1 ? p : p.slice(0, slash), 10);
          if (v < 0) v = positions.length / 3 + v; else v = v - 1;
          idx[k] = v;
        }
        for (let k = 1; k + 1 < n; k++) indices.push(idx[0], idx[k], idx[k + 1]);
      }
    }
    lineStart = lineEnd + 1;
  }
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) };
}

/** Parse a binary STL file into an unindexed triangle soup. */
function parseSTL(filePath) {
  const buf = fs.readFileSync(filePath);
  const triCount = buf.readUInt32LE(80);
  const positions = new Float32Array(triCount * 9);
  const indices = new Uint32Array(triCount * 3);
  let off = 84;
  for (let t = 0; t < triCount; t++) {
    off += 12; // skip facet normal
    for (let k = 0; k < 3; k++) {
      const x = buf.readFloatLE(off), y = buf.readFloatLE(off + 4), z = buf.readFloatLE(off + 8); off += 12;
      positions[t * 9 + k * 3] = x; positions[t * 9 + k * 3 + 1] = z; positions[t * 9 + k * 3 + 2] = -y;
    }
    off += 2; // attribute byte count
    indices[t * 3] = t * 3; indices[t * 3 + 1] = t * 3 + 1; indices[t * 3 + 2] = t * 3 + 2;
  }
  return { positions, indices };
}

/** Merge vertices with identical coordinates and drop degenerate triangles. */
function weld({ positions, indices }) {
  const count = positions.length / 3;
  const remap = new Uint32Array(count);
  const map = new Map();
  const outPos = [];
  let unique = 0;
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    const key = x + ',' + y + ',' + z;
    let j = map.get(key);
    if (j === undefined) { j = unique++; map.set(key, j); outPos.push(x, y, z); }
    remap[i] = j;
  }
  const outIdx = [];
  for (let t = 0; t < indices.length; t += 3) {
    const a = remap[indices[t]], b = remap[indices[t + 1]], c = remap[indices[t + 2]];
    if (a === b || b === c || a === c) continue;
    outIdx.push(a, b, c);
  }
  return { positions: Float32Array.from(outPos), indices: Uint32Array.from(outIdx) };
}

/** Re-index so that only referenced vertices remain. */
function compact(positions, indices) {
  const count = positions.length / 3;
  const remap = new Int32Array(count).fill(-1);
  let unique = 0;
  for (let i = 0; i < indices.length; i++) if (remap[indices[i]] === -1) remap[indices[i]] = unique++;
  const outPos = new Float32Array(unique * 3);
  for (let i = 0; i < count; i++) {
    const j = remap[i];
    if (j !== -1) { outPos[j * 3] = positions[i * 3]; outPos[j * 3 + 1] = positions[i * 3 + 1]; outPos[j * 3 + 2] = positions[i * 3 + 2]; }
  }
  const outIdx = unique < 65536 ? new Uint16Array(indices.length) : new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) outIdx[i] = remap[indices[i]];
  return { positions: outPos, indices: outIdx };
}


/** Signed volume of an (approximately closed) triangle mesh; negative means inward-facing winding. */
function signedVolume(positions, indices) {
  let v = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
    const bx = positions[b], by = positions[b + 1], bz = positions[b + 2];
    const cx = positions[c], cy = positions[c + 1], cz = positions[c + 2];
    v += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return v / 6;
}

function flipWinding(indices) {
  for (let t = 0; t < indices.length; t += 3) { const tmp = indices[t + 1]; indices[t + 1] = indices[t + 2]; indices[t + 2] = tmp; }
}

/** Area-weighted smooth vertex normals. */
function computeNormals(positions, indices) {
  const n = new Float32Array(positions.length);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
    const abx = positions[b] - positions[a], aby = positions[b + 1] - positions[a + 1], abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a], acy = positions[c + 1] - positions[a + 1], acz = positions[c + 2] - positions[a + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    n[a] += nx; n[a + 1] += ny; n[a + 2] += nz;
    n[b] += nx; n[b + 1] += ny; n[b + 2] += nz;
    n[c] += nx; n[c + 1] += ny; n[c + 2] += nz;
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
  }
  return n;
}

function bounds(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) { const v = positions[i + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
  }
  return { min, max };
}

// --------------------------------------------------------- simplification --
function simplifyPiece(positions, indices, opts) {
  const tris = indices.length / 3;
  const targetTris = Math.min(tris, Math.max(opts.minTris, Math.round(tris * opts.ratio)), opts.maxTris);
  if (targetTris >= tris && tris <= opts.maxTris) return { positions, indices, error: 0 };
  const idx32 = indices instanceof Uint32Array ? indices : Uint32Array.from(indices);
  let [outIdx, error] = MeshoptSimplifier.simplify(idx32, positions, 3, targetTris * 3, opts.error, ['ErrorAbsolute']);
  // If the error bound stopped simplification above the hard cap, force the cap with a relaxed bound.
  if (outIdx.length / 3 > opts.maxTris) {
    [outIdx, error] = MeshoptSimplifier.simplify(idx32, positions, 3, opts.maxTris * 3, opts.error * 8, ['ErrorAbsolute']);
  }
  if (outIdx.length < 3) return { positions, indices, error: 0 };
  return { positions, indices: outIdx, error };
}

// -------------------------------------------------------------- GLB out ---
function pad4(n) { return (n + 3) & ~3; }

/** Build a GLB with one mesh + one named node per piece. */
function buildGLB(pieces) {
  const bufferViews = [], accessors = [], meshes = [], nodes = [];
  const chunks = [];
  let byteLength = 0;
  const pushView = (typedArray, target) => {
    const bytes = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const offset = byteLength;
    chunks.push(bytes);
    const padded = pad4(bytes.byteLength);
    if (padded !== bytes.byteLength) chunks.push(new Uint8Array(padded - bytes.byteLength));
    byteLength += padded;
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength, target });
    return bufferViews.length - 1;
  };
  for (const p of pieces) {
    const vCount = p.positions.length / 3;
    const b = bounds(p.positions);
    const posView = pushView(p.positions, 34962);
    accessors.push({ bufferView: posView, componentType: 5126, count: vCount, type: 'VEC3', min: b.min, max: b.max });
    const posAcc = accessors.length - 1;
    const nrmView = pushView(p.normals, 34962);
    accessors.push({ bufferView: nrmView, componentType: 5126, count: vCount, type: 'VEC3' });
    const nrmAcc = accessors.length - 1;
    const idxView = pushView(p.indices, 34963);
    accessors.push({ bufferView: idxView, componentType: p.indices instanceof Uint16Array ? 5123 : 5125, count: p.indices.length, type: 'SCALAR' });
    const idxAcc = accessors.length - 1;
    meshes.push({ name: p.id, primitives: [{ attributes: { POSITION: posAcc, NORMAL: nrmAcc }, indices: idxAcc, mode: 4 }] });
    nodes.push({ name: p.id, mesh: meshes.length - 1 });
  }
  const json = {
    asset: { version: '2.0', generator: 'human-atlas build-atlas.mjs', copyright: 'BodyParts3D, (c) The Database Center for Life Science, CC BY 4.0' },
    buffers: [{ byteLength }],
    bufferViews, accessors, meshes, nodes,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    scene: 0,
  };
  let jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPadded = pad4(jsonBytes.length);
  if (jsonPadded !== jsonBytes.length) jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadded - jsonBytes.length, 0x20)]);
  const total = 12 + 8 + jsonBytes.length + 8 + byteLength;
  const header = Buffer.alloc(12); header.write('glTF', 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(jsonBytes.length, 0); jsonHeader.writeUInt32LE(0x4E4F534A, 4);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(byteLength, 0); binHeader.writeUInt32LE(0x004E4942, 4);
  return Buffer.concat([header, jsonHeader, jsonBytes, binHeader, ...chunks.map(c => Buffer.from(c.buffer, c.byteOffset, c.byteLength))]);
}

function gltfpack(input, output) {
  const bin = path.join(__dirname, 'node_modules', '.bin', 'gltfpack');
  return new Promise((resolve, reject) => {
    // 14-bit positions (0.1 mm over the whole body), 8-bit octahedral normals, maximum meshopt compression.
    // -kn keeps one named node per piece; gltfpack parents the quantised mesh under it with a dequantising transform.
    const args = ['-i', input, '-o', output, '-cc', '-kn', '-ke', '-vp', '14', '-vn', '8'];
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', d => { err += d; });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`gltfpack failed (${code}): ${err}`)));
  });
}

// ------------------------------------------------------------- workers ----
async function buildSystem(system, pieces, opts, log) {
  const built = [];
  let srcTris = 0, outTris = 0, outVerts = 0, maxErr = 0, flippedCount = 0;
  const t0 = Date.now();
  for (const piece of pieces) {
    const file = path.join(opts.src, piece.file);
    if (!fs.existsSync(file)) { log(`  ! missing ${piece.file} (${piece.id})`); continue; }
    const raw = file.toLowerCase().endsWith('.stl') ? parseSTL(file) : parseOBJ(file);
    const welded = weld(raw);
    const flipped = signedVolume(welded.positions, welded.indices) < 0;
    if (flipped) { flipWinding(welded.indices); flippedCount++; }
    const s = simplifyPiece(welded.positions, welded.indices, opts);
    const c = compact(s.positions, s.indices);
    const normals = computeNormals(c.positions, c.indices);
    const b = bounds(c.positions);
    srcTris += welded.indices.length / 3;
    outTris += c.indices.length / 3;
    outVerts += c.positions.length / 3;
    if (s.error > maxErr) maxErr = s.error;
    built.push({ id: piece.id, positions: c.positions, normals, indices: c.indices,
      stats: { id: piece.id, srcTris: welded.indices.length / 3, tris: c.indices.length / 3, verts: c.positions.length / 3,
        err: +s.error.toFixed(3), bbox: [...b.min, ...b.max].map(v => Math.round(v * 10) / 10) } });
  }
  const result = { system, pieces: built.map(b => b.stats), srcTris, tris: outTris, verts: outVerts, maxErr: +maxErr.toFixed(3), flipped: flippedCount, seconds: (Date.now() - t0) / 1000 };
  if (!opts.dry) {
    fs.mkdirSync(path.join(opts.out, 'glb'), { recursive: true });
    const rawPath = path.join(opts.out, 'glb', `${system}.raw.glb`);
    const outPath = path.join(opts.out, 'glb', `${system}.glb`);
    fs.writeFileSync(rawPath, buildGLB(built));
    if (opts.pack) { await gltfpack(rawPath, outPath); fs.unlinkSync(rawPath); }
    else fs.renameSync(rawPath, outPath);
    result.bytes = fs.statSync(outPath).size;
    result.file = `glb/${system}.glb`;
  }
  log(`  ${system}: ${built.length} pieces, ${srcTris.toLocaleString()} → ${outTris.toLocaleString()} tris, ${outVerts.toLocaleString()} verts, maxErr ${result.maxErr}mm, ${flippedCount} flipped${result.bytes ? ', ' + (result.bytes / 1048576).toFixed(2) + ' MB' : ''} (${result.seconds.toFixed(1)}s)`);
  return result;
}

function runWorker(systems, opts) {
  return new Promise((resolve, reject) => {
    const args = [fileURLToPath(import.meta.url), '--worker', '--src', opts.src, '--manifest', opts.manifest, '--out', opts.out,
      '--error', String(opts.error), '--ratio', String(opts.ratio), '--min-tris', String(opts.minTris), '--max-tris', String(opts.maxTris),
      '--systems', systems.join(',')];
    if (opts.dry) args.push('--dry');
    if (!opts.pack) args.push('--no-pack');
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '', pending = '';
    const flush = (final) => {
      const lines = pending.split('\n');
      pending = final ? '' : lines.pop();
      for (const l of lines) if (l && !l.startsWith('@@')) process.stdout.write(l + '\n');
    };
    child.stdout.on('data', d => { const s = String(d); out += s; pending += s; flush(false); });
    child.on('close', code => {
      flush(true);
      if (code !== 0) return reject(new Error(`worker for ${systems.join(',')} exited with ${code}`));
      const results = out.split('\n').filter(l => l.startsWith('@@')).map(l => JSON.parse(l.slice(2)));
      resolve(results);
    });
  });
}

// ----------------------------------------------------------------- main ---
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await MeshoptSimplifier.ready;
  const manifest = JSON.parse(fs.readFileSync(opts.manifest, 'utf8'));
  const systems = manifest.systems.filter(s => !opts.systems || opts.systems.includes(s.id));
  const bySystem = new Map(systems.map(s => [s.id, []]));
  for (const p of manifest.pieces) if (bySystem.has(p.system)) bySystem.get(p.system).push(p);
  const log = opts.quiet ? () => {} : (m) => console.log(m);

  if (opts.worker) {
    for (const s of systems) {
      const r = await buildSystem(s.id, bySystem.get(s.id), opts, log);
      console.log('@@' + JSON.stringify(r));
    }
    return;
  }

  log(`Building ${systems.length} systems, ${[...bySystem.values()].reduce((a, b) => a + b.length, 0)} pieces (error ${opts.error}mm, ratio ${opts.ratio}, jobs ${opts.jobs})`);
  let results = [];
  if (opts.jobs > 1) {
    // Largest systems first, round-robin across workers.
    const ordered = [...systems].sort((a, b) => bySystem.get(b.id).length - bySystem.get(a.id).length);
    const buckets = Array.from({ length: Math.min(opts.jobs, ordered.length) }, () => []);
    ordered.forEach((s, i) => buckets[i % buckets.length].push(s.id));
    const all = await Promise.all(buckets.map(b => runWorker(b, opts)));
    results = all.flat();
  } else {
    for (const s of systems) results.push(await buildSystem(s.id, bySystem.get(s.id), opts, log));
  }
  results.sort((a, b) => systems.findIndex(s => s.id === a.system) - systems.findIndex(s => s.id === b.system));

  const totalTris = results.reduce((a, r) => a + r.tris, 0);
  const totalSrc = results.reduce((a, r) => a + r.srcTris, 0);
  const totalBytes = results.reduce((a, r) => a + (r.bytes || 0), 0);
  log(`TOTAL: ${totalSrc.toLocaleString()} → ${totalTris.toLocaleString()} triangles` + (opts.dry ? '' : `, ${(totalBytes / 1048576).toFixed(2)} MB`));

  if (opts.dry) return;
  const pieceStats = new Map();
  for (const r of results) for (const p of r.pieces) pieceStats.set(p.id, p);
  const atlas = {
    generated: new Date().toISOString(),
    source: manifest.source,
    units: 'mm',
    settings: { error: opts.error, ratio: opts.ratio, minTris: opts.minTris, maxTris: opts.maxTris },
    totals: { pieces: pieceStats.size, triangles: totalTris, sourceTriangles: totalSrc, bytes: totalBytes },
    systems: systems.map(s => {
      const r = results.find(r => r.system === s.id);
      return { ...s, file: r.file, bytes: r.bytes, pieces: r.pieces.length, triangles: r.tris };
    }),
    concepts: manifest.concepts || [],
    structures: manifest.structures || [],
    pieces: manifest.pieces.map(p => {
      const st = pieceStats.get(p.id);
      const { file, ...rest } = p;
      // Pieces are emitted in manifest order so structure→piece indices stay valid; a missing mesh keeps tris 0.
      return st ? { ...rest, tris: st.tris, bbox: st.bbox } : { ...rest, tris: 0, bbox: null };
    }),
  };
  atlas.totals.structures = atlas.structures.length;
  atlas.totals.concepts = atlas.concepts.length;
  fs.writeFileSync(path.join(opts.out, 'atlas.json'), JSON.stringify(atlas));
  log(`Wrote ${path.join(opts.out, 'atlas.json')} (${atlas.pieces.length} pieces)`);
}

main().catch(err => { console.error(err); process.exit(1); });
