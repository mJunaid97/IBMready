#!/usr/bin/env node
// inspect-glb.mjs — load a GLB with three.js (GLTFLoader + MeshoptDecoder) in Node and print what a browser would get.
import fs from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const file = process.argv[2];
if (!file) { console.error('usage: node inspect-glb.mjs file.glb'); process.exit(2); }
const buf = fs.readFileSync(file);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.parse(ab, '', (gltf) => {
  let meshes = 0, tris = 0, verts = 0;
  const types = new Map();
  const names = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    verts += p.count;
    tris += (g.index ? g.index.count : p.count) / 3;
    const key = `pos:${p.array.constructor.name}${p.normalized ? '(norm)' : ''} nrm:${n ? n.array.constructor.name + (n.normalized ? '(norm)' : '') : '-'} idx:${g.index ? g.index.array.constructor.name : '-'}`;
    types.set(key, (types.get(key) || 0) + 1);
    if (names.length < 5) names.push(`${o.name} [parent=${o.parent && o.parent.name}] scale=${o.scale.toArray().map(v => +v.toFixed(3))} pos=${o.position.toArray().map(v => +v.toFixed(1))} tris=${(g.index ? g.index.count : p.count) / 3}`);
  });
  console.log(`${file}: ${(buf.length / 1048576).toFixed(2)} MB, ${meshes} meshes, ${tris.toLocaleString()} tris, ${verts.toLocaleString()} verts`);
  console.log('extensions:', JSON.stringify(gltf.parser.json.extensionsUsed || []));
  for (const [k, v] of types) console.log(`  ${v}x ${k}`);
  for (const n of names) console.log('  ', n);
}, (err) => { console.error('parse failed:', err); process.exit(1); });
