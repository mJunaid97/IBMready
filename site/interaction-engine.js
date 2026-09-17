/**
 * interaction-engine.js — the engine of the Drug Interaction Checker (/tools/drug-interaction-checker/).
 *
 * Pure functions over the compiled records in data/content/interactions.json: no DOM, no network, no site imports, so the
 * same code runs in the browser (site/checker.js) and in Node (tools/qa/engine-test.mjs). It implements the checker's API
 * contract: `check(entries)` returns the medications as resolved, the number of pairs checked, every interaction found with
 * its source-derived state and UI severity tier, the pairs with no known interaction, warnings and the metadata of the
 * data it used. Nothing here decides whether an interaction exists: a result is only ever a sourced record from the
 * dataset, matched to the pair; when no record matches, the engine says so in the cautious wording of the specification.
 *
 * Severity: the records carry the state their cited source's wording supports (CLINICAL.md §4). STATE_TIER maps those
 * states onto the checker's five-tier display taxonomy without adding information: "avoid / not recommended" and
 * "contraindicated" share the top tier; a record the sources document without management wording is "not graded", never
 * "minor". No state maps to "minor": nothing is labelled minor by inference.
 */
export const TIERS = {
  contraindicated: { order: 1, label: 'Contraindicated or avoid', short: 'Avoid', cls: 'tier-1', icon: 'stop', meaning: 'The cited source says the combination is contraindicated, must not be used together, or should be avoided or is not recommended.' },
  major: { order: 2, label: 'Major', short: 'Major', cls: 'tier-2', icon: 'warning', meaning: 'The cited source restricts the combination to specialist supervision or to specific situations with close monitoring: a potential for serious harm.' },
  moderate: { order: 3, label: 'Moderate', short: 'Moderate', cls: 'tier-3', icon: 'diamond', meaning: 'The cited source advises monitoring (a blood level, the INR, kidney function…) or a dose adjustment.' },
  minor: { order: 4, label: 'Minor', short: 'Minor', cls: 'tier-4', icon: 'dot', meaning: 'The cited source grades the interaction as of limited clinical significance. No current source state maps here: the sources describe management rather than grading harm, and nothing is labelled minor by inference.' },
  unknown: { order: 5, label: 'Severity not graded', short: 'Not graded', cls: 'tier-5', icon: 'question', meaning: 'The cited source documents the interaction, or an effect, without wording that supports a severity category. This is not evidence that the interaction is minor.' },
};
export const TIER_ORDER = ['contraindicated', 'major', 'moderate', 'minor', 'unknown'];
/** Source-derived state (the record's `severity`) -> display tier. Documented in CLINICAL.md and on the methodology page. */
export const STATE_TIER = { CONTRAINDICATED: 'contraindicated', AVOID_COMBINATION: 'contraindicated', SPECIALIST_OR_CLOSE_MONITORING: 'major', MONITOR_OR_ADJUST: 'moderate', INTERACTION_DOCUMENTED: 'unknown', NO_SEVERITY_ASSIGNED: 'unknown' };
export const STATE_ORDER = { CONTRAINDICATED: 1, AVOID_COMBINATION: 2, SPECIALIST_OR_CLOSE_MONITORING: 3, MONITOR_OR_ADJUST: 4, INTERACTION_DOCUMENTED: 5, NO_SEVERITY_ASSIGNED: 6 };
export const LIMITS = { min: 2, soft: 10 };
export const NONE_WORDING = {
  title: 'No known interaction identified in the available data',
  text: 'This does not prove that the combination is safe for every person. Some interactions may be uncommon, newly reported, dose-dependent, or not represented in the available dataset.',
};
const SELECTABLE = new Set(['medication', 'product', 'substance']);

export const tierOf = (severity) => STATE_TIER[severity] || 'unknown';
export function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
const words = (s) => normalize(s).split(' ').filter(Boolean);

/**
 * Build an engine over the compiled interaction data. `ix` is data/content/interactions.json.
 * Returns { index, resolve, suggest, describe, check, meta }.
 */
export function createEngine(ix) {
  if (!ix || !Array.isArray(ix.records) || !Array.isArray(ix.index)) throw new Error('interaction data is missing or malformed');
  const index = ix.index.map(x => ({ ...x, n: normalize(x.label), w: words(x.label) }));
  const canonical = new Map();   // kind:id -> canonical (non-alias) entry
  for (const x of index) if (!x.alias && !canonical.has(`${x.kind}:${x.id}`)) canonical.set(`${x.kind}:${x.id}`, x);
  const products = new Map((ix.products || []).map(p => [p.id, p]));
  const substances = ix.substances || {};
  const classNames = ix.classNames || {};
  const dupRules = ix.duplicationClasses || {};
  const records = ix.records;
  const byId = new Map(records.map(r => [r.id, r]));
  const medName = (id) => canonical.get(`medication:${id}`)?.label || id;
  const className = (id) => classNames[id] || id;

  /** The canonical entry for a token: an id ("amlodipine", "co-codamol"), or a name, brand, alias or substance ("norvasc"). */
  function resolve(token) {
    const raw = String(token || '').trim(); if (!raw) return null;
    for (const kind of ['medication', 'product', 'substance']) { const hit = canonical.get(`${kind}:${raw.toLowerCase()}`); if (hit) return hit; }
    const t = normalize(raw);
    return index.find(x => x.n === t && SELECTABLE.has(x.kind)) || index.find(x => x.n === t) || null;
  }
  /** Ranked autocomplete: exact > starts with > a word starts with > contains; one row per kind:id, best match wins.
   *  Drug classes are not selectable (a check needs a specific medicine) and are returned separately as a hint. */
  function suggest(query, limit = 8) {
    const t = normalize(query); if (!t) return { results: [], hint: null };
    const qw = t.split(' ');
    const score = (x) => {
      if (x.n === t) return 100;
      if (x.n.startsWith(t)) return 80 - Math.min(20, x.n.length - t.length) / 2;
      if (qw.every(q => x.w.some(w => w.startsWith(q)))) return 60;
      if (x.n.includes(t)) return 40;
      return 0;
    };
    const best = new Map();
    let hint = null;
    for (const x of index) {
      const s = score(x); if (!s) continue;
      if (!SELECTABLE.has(x.kind)) { if (s >= 80 && (!hint || s > hint.s)) hint = { ...x, s }; continue; }
      const key = `${x.kind}:${x.id}`; const cur = best.get(key);
      if (!cur || s > cur.s || (s === cur.s && !x.alias && cur.alias)) best.set(key, { ...x, s });
    }
    if (!best.size && t.length >= 5 && !t.includes(' ')) {   // spelling tolerance: a close misspelling of a single word ("amlodapine")
      const tol = t.length < 8 ? 1 : 2;
      for (const x of index) {
        if (!SELECTABLE.has(x.kind)) continue;
        const d = Math.min(...x.w.filter(w => Math.abs(w.length - t.length) <= tol).map(w => levenshtein(t, w, tol)), Infinity);
        if (d > tol) continue;
        const key = `${x.kind}:${x.id}`; const s = 30 - d; const cur = best.get(key);
        if (!cur || s > cur.s || (s === cur.s && !x.alias && cur.alias)) best.set(key, { ...x, s, fuzzy: true });
      }
    }
    const results = [...best.values()].sort((a, b) => b.s - a.s || a.n.length - b.n.length || a.label.localeCompare(b.label)).slice(0, limit);
    return { results, hint: hint && !results.length ? hint : hint && hint.s === 100 ? hint : null };
  }
  /** What a selected entry is: label, canonical name, and the active ingredients (agents) it stands for. */
  function describe(entry) {
    const c = canonical.get(`${entry.kind}:${entry.id}`);
    if (!c) return null;
    const base = { kind: entry.kind, id: entry.id, name: c.label, label: entry.label || c.label, alias: entry.label && entry.label !== c.label ? entry.label : null };
    if (entry.kind === 'medication') return { ...base, pageAvailable: true, drugClass: ix.drugClassOf?.[entry.id] || null, ingredients: [{ id: entry.id, name: c.label, drugClass: ix.drugClassOf?.[entry.id] || null }] };
    if (entry.kind === 'product') {
      const p = products.get(entry.id); if (!p) return null;
      return { ...base, pageAvailable: false, note: p.note || '', source: p.source, ingredients: p.ingredients.map(i => i.id ? { id: i.id, name: i.name, drugClass: ix.drugClassOf?.[i.id] || null } : { agentId: i.agentId || normalize(i.name).replace(/ /g, '-'), name: i.name, drugClass: i.drugClass || null }) };
    }
    const s = substances[entry.id];
    return { ...base, pageAvailable: false, drugClass: s?.drugClass || null, ingredients: [{ agentId: entry.id, name: s?.name || c.label, drugClass: s?.drugClass || null }] };
  }
  const agentKey = (g) => g.id ? `m:${g.id}` : `s:${g.agentId}`;
  /** Does record r document the pair (X as r.a, Y as the other side)? Returns how it matched, or null. */
  function match(r, X, Y) {
    if (X.id !== r.a) return null;
    if (r.b) return Y.id === r.b ? { via: 'pair' } : null;
    if (r.bClass) return Y.drugClass === r.bClass && agentKey(Y) !== agentKey(X) ? { via: 'class', classId: r.bClass, className: className(r.bClass), member: Y.name } : null;
    if (r.agentIds?.length && Y.agentId && r.agentIds.includes(Y.agentId)) return { via: 'named' };
    return null;
  }
  /**
   * Check a list of entries [{kind, id, label?}]. Every unique pair of entries is checked across every pair of their
   * active ingredients; matched records are attached to the pair; duplicate ingredients and therapeutic duplication are
   * reported separately; pairs with no record are listed with the cautious wording. Never throws on bad entries: an
   * unresolvable entry becomes a warning and is left out of the check.
   */
  function check(entries, { softLimit = LIMITS.soft } = {}) {
    const warnings = [];
    const medications = [];
    for (const e of entries || []) {
      const d = e && SELECTABLE.has(e.kind) ? describe(e) : null;
      if (d) medications.push(d);
      else warnings.push({ code: 'unknown-entry', entry: e, message: `We could not match “${e?.label || e?.id || ''}” to our drug database.${e?.kind === 'class' ? ' A drug class cannot be checked as a whole: add a specific medicine.' : ''}` });
    }
    if (medications.length < LIMITS.min) warnings.push({ code: 'too-few', message: 'Add at least two medications to check for interactions.' });
    if (medications.length > softLimit) warnings.push({ code: 'soft-limit', message: `${medications.length} medications is more than the ${softLimit} this checker is designed for; results are complete but long. Consider checking smaller groups.` });
    const noPage = [...new Set(medications.flatMap(m => m.ingredients.filter(i => !i.id).map(i => i.name)))];
    if (noPage.length) warnings.push({ code: 'limited-coverage', names: noPage, message: `${noPage.join(', ')}: no medication page on this site yet, so only interaction records that name ${noPage.length === 1 ? 'it' : 'them'} (or ${noPage.length === 1 ? 'its' : 'their'} drug class) directly could be matched.` });
    const pairs = [];
    for (let i = 0; i < medications.length; i++) for (let j = i + 1; j < medications.length; j++) {
      const A = medications[i], B = medications[j];
      const pair = { a: i, b: j, aName: A.label, bName: B.label, interactions: [], duplications: [], tier: 'none', order: 99 };
      const seenRec = new Set(), seenDup = new Set();
      for (const X of A.ingredients) for (const Y of B.ingredients) {
        const kx = agentKey(X), ky = agentKey(Y);
        if (kx === ky) {
          const dupRecs = records.filter(r => r.type === 'therapeutic-duplication' && r.a === X.id && !r.b && !r.bClass);
          const key = `same:${kx}`; if (!seenDup.has(key)) { seenDup.add(key); pair.duplications.push({ kind: 'same-ingredient', name: X.name, id: X.id || null, agentId: X.agentId || null, a: A.label, b: B.label, records: dupRecs.map(r => decorate(r, X, Y, { via: 'pair' })) }); }
          continue;
        }
        if (X.drugClass && X.drugClass === Y.drugClass && dupRules[X.drugClass]) {
          const key = `class:${X.drugClass}:${kx}:${ky}`;
          if (!seenDup.has(key)) { seenDup.add(key); pair.duplications.push({ kind: 'class', classId: X.drugClass, className: className(X.drugClass), text: dupRules[X.drugClass].text, source: dupRules[X.drugClass].source, aIngredient: X.name, bIngredient: Y.name, a: A.label, b: B.label, records: [] }); }
        }
        for (const r of records) {
          const m = match(r, X, Y) || match(r, Y, X); if (!m) continue;
          if (seenRec.has(r.id)) continue; seenRec.add(r.id);
          const item = decorate(r, X, Y, m);
          if (r.type === 'therapeutic-duplication') {
            const key = `rec:${r.id}`; if (seenDup.has(key)) continue; seenDup.add(key);
            const cls = r.bClass || X.drugClass;
            const existing = pair.duplications.find(d => d.kind === 'class' && d.classId === cls && !d.records.length);
            if (existing) existing.records.push(item);
            else pair.duplications.push({ kind: r.b || r.agentIds?.length ? 'pair' : 'class', classId: cls || null, className: cls ? className(cls) : null, text: r.effect, source: null, aIngredient: X.name, bIngredient: Y.name, a: A.label, b: B.label, records: [item] });
          } else pair.interactions.push(item);
        }
      }
      pair.interactions.sort((x, y) => TIERS[x.tier].order - TIERS[y.tier].order || STATE_ORDER[x.severity] - STATE_ORDER[y.severity] || VIA_ORDER[x.via] - VIA_ORDER[y.via]);
      if (pair.interactions.length) { pair.tier = pair.interactions[0].tier; pair.order = TIERS[pair.tier].order; }
      else if (pair.duplications.length) { pair.tier = 'duplication'; pair.order = 50; }
      pairs.push(pair);
    }
    const sorted = [...pairs].sort((x, y) => x.order - y.order || (x.interactions[0] ? STATE_ORDER[x.interactions[0].severity] : 9) - (y.interactions[0] ? STATE_ORDER[y.interactions[0].severity] : 9) || x.a - y.a || x.b - y.b);
    const interactions = sorted.flatMap(p => p.interactions.map(i => ({ ...i, pair: [p.aName, p.bName] })));
    const duplications = sorted.flatMap(p => p.duplications.map(d => ({ ...d, pairTier: p.tier })));
    const noKnownInteractionPairs = sorted.filter(p => !p.interactions.length && !p.duplications.length).map(p => ({ a: p.aName, b: p.bName }));
    const byTier = Object.fromEntries(TIER_ORDER.map(t => [t, sorted.filter(p => p.tier === t).length]));
    const topTier = TIER_ORDER.find(t => byTier[t]) || (duplications.length ? 'duplication' : 'none');
    const shown = [...interactions, ...duplications.flatMap(d => d.records)];
    const related = dedupe(shown.flatMap(i => i.related || []), r => `${r.type}:${r.id}`);
    const sources = dedupe(shown.flatMap(i => i.evidence || []), r => r.url);
    return {
      status: medications.length < LIMITS.min ? 'insufficient' : warnings.some(w => w.code === 'limited-coverage') ? 'partial' : 'complete',
      medications, pairsChecked: pairs.length, pairs: sorted, interactions, duplications, noKnownInteractionPairs,
      summary: { medications: medications.length, pairsChecked: pairs.length, byTier, duplications: sorted.filter(p => p.duplications.length).length, none: noKnownInteractionPairs.length, topTier },
      related, sources, warnings,
      sourceMetadata: { provider: ix.sourceMetadata?.provider || 'Anatomy Nexus interaction records', dataVersion: ix.sourceMetadata?.dataVersion || ix.updated || '', lastUpdated: ix.sourceMetadata?.lastUpdated || ix.updated || '', recordCount: records.length, publishers: ix.sourceMetadata?.publishers || {}, reviewStatuses: ix.sourceMetadata?.reviewStatuses || {}, scope: ix.sourceMetadata?.scope || ['drug-drug'] },
    };
  }
  /** A matched record with its display tier and how it applied to the two ingredients. */
  function decorate(r, X, Y, m) {
    return { ...r, tier: tierOf(r.severity), via: m.via, viaClassId: m.classId || null, viaClassName: m.className || null, viaMember: m.member || null, aIngredient: X.name, bIngredient: Y.name, aIngredientId: X.id || null, bIngredientId: Y.id || null };
  }
  return { index, resolve, suggest, describe, check, medName, className, record: (id) => byId.get(id), meta: ix.sourceMetadata || {} };
}
const VIA_ORDER = { pair: 0, named: 1, class: 2 };
/** Edit distance with an early exit above `max` (used only for single-word queries against single words). */
export function levenshtein(a, b, max = 2) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
function dedupe(list, key) { const seen = new Set(); return list.filter(x => { const k = key(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); }
