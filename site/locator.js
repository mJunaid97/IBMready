// site/locator.js — the "where in the body" figure: a neutral, schematic front view of the body with the organs of a page
// drawn on it. The organ shapes are the real silhouettes of the pieces of the 3D atlas seen from the front
// (data/content/locator.json, made by tools/build-content.py from tools/derived/piece-hulls.json, which tools/build-silhouettes.mjs
// reads out of the 3D models), so the figure and the 3D model cannot disagree. The body itself is a pictogram without sex, skin
// tone or surface detail, built on the atlas's own landmarks (skull, shoulder girdle, rib cage, pelvis, knees, hands, feet): it
// shows position, not anatomy. Pure string functions, so a page can prerender them and a test can run them.
import { esc } from './site.js';

// Atlas frame: millimetres, x towards the patient's left (the right of the picture, as the viewer faces the patient), y up.
const VIEW = { w: 690, h: 1760, cx: 345, top: 1664 };       // viewBox 0 0 690 1760 around skin [-334,-78]..[333,1641]
const ORGAN_MIN = 70;                                         // an organ smaller than this (mm) is also marked with a ring

/** One half of the body drawn as filled shapes; `g` grows every shape by g mm (the outline pass is drawn first, larger). */
function bodyShapes(g) {
  const out = [];
  const sw = g ? ` stroke-width="${2 * g}"` : ' stroke-width="0"';
  const half = [[0, 1340], [150, 1332], [160, 1270], [150, 1160], [128, 1055], [122, 1010], [132, 930], [158, 850], [165, 790], [160, 745], [0, 738]];
  const torso = half.concat(half.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
  out.push(`<ellipse cx="0" cy="1529" rx="${80 + g}" ry="${110 + g}"${sw}/>`);
  out.push(`<rect x="${-40 - g}" y="${1320 - g}" width="${80 + 2 * g}" height="${120 + 2 * g}"${sw}/>`);
  out.push(`<polygon points="${torso.map(p => p.join(',')).join(' ')}"${sw} stroke-linejoin="round"/>`);
  for (const s of [1, -1]) {
    const limb = (x1, y1, x2, y2, w) => `<line x1="${s * x1}" y1="${y1}" x2="${s * x2}" y2="${y2}" stroke-width="${w + 2 * g}" stroke-linecap="round"/>`;
    out.push(limb(152, 1290, 228, 1050, 88));          // upper arm
    out.push(limb(228, 1050, 246, 818, 70));           // forearm
    out.push(`<ellipse cx="${s * 270}" cy="735" rx="${46 + g}" ry="${88 + g}"${sw}/>`);   // hand
    out.push(limb(86, 790, 86, 350, 158));             // thigh
    out.push(limb(86, 350, 70, 40, 104));              // lower leg
    out.push(`<rect x="${s > 0 ? 34 - g : -172 - g}" y="${-76 - g}" width="${138 + 2 * g}" height="${90 + 2 * g}" rx="${38 + g}"${sw}/>`);   // foot
  }
  return out.join('');
}
const BODY = `<g class="loc-edge">${bodyShapes(7)}</g><g class="loc-fill">${bodyShapes(0)}</g>`;

const area = (c) => Math.max(c.b[2] - c.b[0], 1) * Math.max(c.b[3] - c.b[1], 1);
const pathOf = (poly) => 'M' + poly.map(p => p.join(',')).join('L') + 'Z';
const hex = (c) => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : '';

/** Words for where an organ's outlines lie, from the outlines themselves (patient's left = the right of the picture). */
export function placeWords(clusters) {
  if (!clusters || !clusters.length) return '';
  if (clusters.length === 2) {
    const [a, b] = clusters; const mirrored = Math.abs((a.b[0] + a.b[2]) + (b.b[0] + b.b[2])) < 90;
    if (mirrored) return 'on both sides of the body';
  }
  if (clusters.length > 1) return 'in more than one place';
  const [x0, , x1] = clusters[0].b, cx = (x0 + x1) / 2;
  if (x0 >= -12) return cx > 15 ? "on the patient's left" : 'in the midline';
  if (x1 <= 12) return cx < -15 ? "on the patient's right" : 'in the midline';
  const left = x1 / (x1 - x0);                         // share of its width that lies to the patient's left of the midline
  if (left >= 0.6) return "mostly on the patient's left, crossing the midline";
  if (left <= 0.4) return "mostly on the patient's right, crossing the midline";
  return 'on both sides of the midline';
}

let _n = 0;
/**
 * @param loc    the compiled locator ({ organs: { id: [{ b: [x0,y0,x1,y1], p: [[x,y],…] }] } })
 * @param items  [{ id, name, color, href? }] — the organs to draw; an organ with no outline in `loc` is skipped
 * @param opts   { title, intro, scale: 'small' | 'normal', caption: false to leave the caption out }
 * @returns an HTML string ('' when nothing can be drawn)
 */
export function locatorFigure(loc, items, opts = {}) {
  if (!loc || !loc.organs) return '';
  const shown = items.map(it => ({ ...it, clusters: loc.organs[it.id] })).filter(it => it.clusters && it.clusters.length);
  if (!shown.length) return '';
  const id = `loc${++_n}`;
  const linked = shown.some(it => it.href);
  const names = shown.map(it => it.name);
  const list = names.length === 1 ? names[0] : names.length === 2 ? names.join(' and ') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  const title = opts.title || `Front view of the body with the ${list.toLowerCase()} marked`;
  const places = shown.length === 1 ? `${shown[0].name}: ${placeWords(shown[0].clusters)}` : '';
  const desc = `A schematic front view of the body, patient's right on the left of the picture. ${places ? places + '.' : `Marked: ${list}.`}`;
  // larger outlines first so small organs stay on top (and clickable)
  const drawn = shown.flatMap(it => it.clusters.map(c => ({ it, c }))).sort((a, b) => area(b.c) - area(a.c));
  const mark = ({ it, c }) => {
    const col = hex(it.color); const st = col ? ` style="--c:${col}"` : '';
    const [x0, y0, x1, y1] = c.b; const small = Math.max(x1 - x0, y1 - y0) < ORGAN_MIN;
    let svg = c.p.length >= 3 ? `<path class="loc-organ" d="${pathOf(c.p)}"${st}/>` : `<rect class="loc-organ" x="${x0}" y="${y0}" width="${Math.max(x1 - x0, 1)}" height="${Math.max(y1 - y0, 1)}"${st}/>`;
    if (small) svg += `<circle class="loc-ring" cx="${Math.round((x0 + x1) / 2)}" cy="${Math.round((y0 + y1) / 2)}" r="${ORGAN_MIN * 0.62}"${st}/>`;
    return svg;
  };
  const body = linked
    ? drawn.map(d => d.it.href ? `<a href="${esc(d.it.href)}" aria-label="${esc(d.it.name)}"><title>${esc(d.it.name)}</title>${mark(d)}</a>` : mark(d)).join('')
    : drawn.map(mark).join('');
  const svg = `<svg class="loc-svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" ${linked ? `role="group" aria-label="${esc(title)}"` : `role="img" aria-labelledby="${id}-t ${id}-d"`} focusable="false">`
    + (linked ? '' : `<title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>`)
    + `<g transform="translate(${VIEW.cx} ${VIEW.top}) scale(1 -1)">${BODY}${body}</g>`
    + `<text class="loc-side" x="42" y="62" text-anchor="middle">R</text><text class="loc-side" x="${VIEW.w - 42}" y="62" text-anchor="middle">L</text></svg>`;
  const caption = opts.caption === false ? '' : `<figcaption><b>${esc(opts.heading || 'Where in the body')}</b>${places ? `<span>${esc(places)}.</span>` : opts.intro ? `<span>${esc(opts.intro)}</span>` : ''}<small>Front view; the patient's right is on the left of the picture. A schematic outline for orientation, not a drawing of the anatomy.</small></figcaption>`;
  return `<figure class="locator${opts.scale === 'small' ? ' locator-small' : ''}">${svg}${caption}</figure>`;
}
