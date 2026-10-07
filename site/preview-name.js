/**
 * preview-name.js — the file name of the static 3D preview image for an explorer hash.
 * Shared by the pages (to reference the image) and tools/render-previews.mjs (to create it),
 * so the two can never disagree. `o=heart` -> o-heart, `sys=heart` -> sys-heart,
 * `s=FJ1,FJ2` -> s-<short hash>, anything else -> body.
 */
export function previewName(hash) {
  if (!hash) return 'body';
  const m = /^(o|sys|r)=([a-z0-9-]+)$/i.exec(hash);
  if (m) return `${m[1].toLowerCase()}-${m[2].toLowerCase()}`;
  const s = /^s=([A-Za-z0-9,]+)$/.exec(hash);
  if (s) {
    let h = 0x811c9dc5;                                   // FNV-1a over the id list
    for (const ch of s[1]) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return 's-' + h.toString(36);
  }
  return 'body';
}
