/**
 * search.js — tiny in-memory fuzzy search over atlas entities.
 *
 * Indexes structures (selectable things), concepts (FMA groupings such as
 * "coronary artery" that expand to many structures) and systems. Scoring is
 * deliberately simple and deterministic: whole-word > word-prefix > substring
 * > subsequence, with a bonus when the query matches the start of the name.
 */

const STOP = new Set(['of', 'the', 'and']);

export function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(s) {
  return normalize(s).split(' ').filter(t => t && !STOP.has(t));
}

function subsequence(needle, hay) {
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) if (hay[j] === needle[i]) i++;
  return i === needle.length;
}

export function buildIndex(atlas, conceptCounts) {
  const entries = [];
  for (const s of atlas.systems) {
    entries.push({ type: 'system', id: s.id, name: s.name, norm: normalize(s.name), words: tokens(s.name), sub: `${s.count} structures`, system: s.id, rank: 3 });
  }
  atlas.structures.forEach((st, i) => {
    const sys = atlas.systems.find(s => s.id === st.system);
    entries.push({ type: 'structure', id: st.id, idx: i, name: st.name, norm: normalize(st.name), words: tokens(st.name),
      sub: sys ? sys.name : st.system, system: st.system, rank: 2, pieces: st.pieces.length });
  });
  atlas.concepts.forEach((c, i) => {
    const n = conceptCounts[i] || 0;
    if (n < 2) return; // single-piece concepts duplicate their structure
    entries.push({ type: 'concept', id: c.id, idx: i, name: c.name[0].toUpperCase() + c.name.slice(1), norm: normalize(c.name), words: tokens(c.name),
      sub: `${n} pieces`, rank: 1, pieces: n });
  });
  return entries;
}

export function search(entries, query, limit = 14) {
  const q = normalize(query);
  if (!q) return [];
  const qt = q.split(' ').filter(Boolean);
  const results = [];
  for (const e of entries) {
    let score = 0;
    if (e.norm === q || (e.aliases && e.aliases.includes(q))) score += 20;
    else if (e.norm.startsWith(q) || (e.aliases && e.aliases.some(a => a.startsWith(q)))) score += 10;
    else if (e.norm.includes(q)) score += 6;
    let matchedTokens = 0;
    for (const t of qt) {
      let best = 0;
      for (const w of e.words) {
        if (w === t) { best = Math.max(best, 4); break; }
        if (w.startsWith(t)) best = Math.max(best, 3);
        else if (w.includes(t)) best = Math.max(best, 1.5);
        else if (t.length >= 5 && w[0] === t[0] && subsequence(t, w)) best = Math.max(best, 0.4);
      }
      if (best > 0) matchedTokens++;
      score += best;
    }
    if (matchedTokens < qt.length && score < 6) continue; // every token must contribute unless the whole string matched
    if (score <= 0) continue;
    // Prefer shorter names and structures over concepts for equal scores.
    score += e.rank * 0.15 - Math.min(e.norm.length, 60) / 120;
    if (e.id.toLowerCase() === q || (e.idx !== undefined && ('fma' + e.id.replace(/\D/g, '')) === q.replace(/\s/g, ''))) score += 30;
    results.push({ entry: e, score });
  }
  results.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
  return results.slice(0, limit).map(r => r.entry);
}
