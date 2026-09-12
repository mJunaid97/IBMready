#!/usr/bin/env node
/**
 * engine-test.mjs — unit tests of the interaction checker's engine (site/interaction-engine.js) against the compiled
 * data in data/content/interactions.json. Run by the QA workflow after the content compiles:
 *
 *   node tools/qa/engine-test.mjs
 *
 * Covers the specification's input cases (1, 2, 3 and 10 medications, brand + generic, combination product, misspelling,
 * unsupported entry), the clinical states (every source state maps to a tier, contraindicated sorts first, class-level
 * records apply to members only, therapeutic duplication, no-interaction wording) and the API contract's shape.
 */
import { readFileSync } from 'node:fs';
import { createEngine, TIERS, TIER_ORDER, STATE_TIER, NONE_WORDING, LIMITS } from '../../site/interaction-engine.js';

const ix = JSON.parse(readFileSync(new URL('../../data/content/interactions.json', import.meta.url), 'utf8'));
const E = createEngine(ix);
let failed = 0, passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } };
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };
const eq = (a, b, msg) => assert(JSON.stringify(a) === JSON.stringify(b), `${msg || 'equal'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
const entry = (token) => { const h = E.resolve(token); assert(h, `resolve(${token})`); return { kind: h.kind, id: h.id, label: h.label }; };
const check = (...tokens) => E.check(tokens.map(entry));

test('every severity state of the data maps to a display tier', () => {
  for (const r of ix.records) assert(STATE_TIER[r.severity] && TIERS[STATE_TIER[r.severity]], `${r.id}: state ${r.severity} has no tier`);
  eq(TIER_ORDER, ['contraindicated', 'major', 'moderate', 'minor', 'unknown'], 'tier order');
  assert(!Object.values(STATE_TIER).includes('minor'), 'no state maps to minor by inference');
});
test('resolve: generic name, brand, alias, product and named substance', () => {
  eq(E.resolve('amlodipine').id, 'amlodipine'); eq(E.resolve('Norvasc').id, 'amlodipine'); eq(E.resolve('norvasc').kind, 'medication');
  eq(E.resolve('acetaminophen').id, 'paracetamol'); eq(E.resolve('co-codamol').kind, 'product'); eq(E.resolve('Solpadeine Max').id, 'co-codamol');
  eq(E.resolve('simvastatin').kind, 'substance'); eq(E.resolve('cyclosporine').id, 'ciclosporin'); eq(E.resolve('lithium').kind, 'substance');
  assert(E.resolve('no-such-medicine-xyz') === null, 'unknown token resolves to null');
  assert(E.resolve('codeine').kind === 'substance', 'codeine is a named substance (opioid), not the morphine page');
  assert(E.resolve('citalopram').kind === 'substance', 'citalopram is a named substance (SSRI), not the sertraline page');
});
test('suggest: exact matches first, tolerant of partial words, one row per entry, class hint', () => {
  const s = E.suggest('amlo'); assert(s.results[0].id === 'amlodipine' && s.results[0].kind === 'medication', 'amlo -> amlodipine first');
  const b = E.suggest('norv'); assert(b.results[0].label === 'Norvasc' && b.results[0].alias === 'brand', 'norv -> the Norvasc brand row');
  const ids = E.suggest('aspirin', 20).results.map(r => `${r.kind}:${r.id}`); assert(new Set(ids).size === ids.length, 'no duplicate rows');
  const c = E.suggest('statins'); assert(c.hint && c.hint.kind === 'class' && c.hint.id === 'statins', 'a drug class is a hint, not a result'); assert(!c.results.some(r => r.kind === 'class'), 'classes are not selectable');
  const w = E.suggest('salt substitutes'); assert(w.results.some(r => r.id === 'potassium-containing-salt-substitutes'), 'word-prefix match on a multi-word substance');
  assert(E.suggest('').results.length === 0, 'empty query');
  const f = E.suggest('amlodapine'); assert(f.results[0]?.id === 'amlodipine' && f.results[0].fuzzy, 'a misspelling within two edits still finds amlodipine');
  const g = E.suggest('warfarn'); assert(g.results[0]?.id === 'warfarin', 'one missing letter');
  assert(E.suggest('zzzzzzzz').results.length === 0, 'nonsense finds nothing');
});
test('one medication: insufficient, no pairs, the too-few warning', () => {
  const r = check('amlodipine'); eq(r.status, 'insufficient'); eq(r.pairsChecked, 0); assert(r.warnings.some(w => w.code === 'too-few'));
});
test('two medications with a direct record: moderate, sources, related links, monitoring links', () => {
  const r = check('losartan', 'ibuprofen');
  eq(r.status, 'complete'); eq(r.pairsChecked, 1); eq(r.pairs[0].tier, 'moderate');
  const ix1 = r.interactions.find(i => i.id === 'losartan-ibuprofen'); assert(ix1, 'the losartan-ibuprofen record is matched'); eq(ix1.via, 'pair');
  assert(ix1.evidence.length >= 2 && ix1.evidence.every(e => /^https:\/\//.test(e.url)), 'sources');
  assert(ix1.related.some(x => x.type === 'organ' && x.id === 'kidneys'), 'kidneys in related');
  assert(ix1.monitoringLinks.some(m => m.links.some(l => l.type === 'biomarkers' && l.id === 'potassium')), 'potassium monitoring link');
  assert(r.interactions.some(i => i.via === 'class' && i.viaClassId === 'nsaids' && i.viaMember === 'Ibuprofen'), 'the class-level NSAID record applies to ibuprofen as a member');
  eq(r.noKnownInteractionPairs.length, 0);
});
test('three medications: every unique pair, severe first, none listed with the cautious wording', () => {
  const r = check('amlodipine', 'losartan', 'ibuprofen');
  eq(r.pairsChecked, 3);
  eq(r.noKnownInteractionPairs, [{ a: 'Amlodipine', b: 'Losartan' }, { a: 'Amlodipine', b: 'Ibuprofen' }]);
  assert(r.pairs[0].aName === 'Losartan' && r.pairs[0].bName === 'Ibuprofen', 'the pair with a record sorts first');
  assert(!/safe/i.test(NONE_WORDING.title) && /No known interaction identified/.test(NONE_WORDING.title), 'no-interaction wording never says safe');
  eq(r.summary.byTier.moderate, 1); eq(r.summary.none, 2); eq(r.summary.topTier, 'moderate');
});
test('contraindicated sorts before major before moderate before not graded', () => {
  const r = check('lisinopril', 'aliskiren', 'metformin', 'ibuprofen', 'methotrexate');
  const tiers = r.pairs.map(p => p.tier).filter(t => t !== 'none' && t !== 'duplication');
  const orders = tiers.map(t => TIERS[t].order);
  eq(orders, [...orders].sort((a, b) => a - b), 'pairs sorted by tier order');
  eq(r.pairs[0].tier, 'contraindicated'); assert(r.pairs[0].interactions[0].id === 'lisinopril-aliskiren');
  assert(r.interactions.some(i => i.tier === 'major' && i.id === 'ibuprofen-methotrexate'), 'major present');
  assert(r.interactions.some(i => i.tier === 'unknown' && i.id === 'lisinopril-metformin'), 'documented-but-ungraded present as not graded');
  assert(r.interactions.every(i => i.tier !== 'minor'), 'nothing is labelled minor');
});
test('brand + generic of the same ingredient is a duplicate active ingredient, not an interaction', () => {
  const r = E.check([{ kind: 'medication', id: 'paracetamol', label: 'Paracetamol' }, { kind: 'medication', id: 'paracetamol', label: 'Panadol' }]);
  eq(r.pairsChecked, 1); eq(r.pairs[0].tier, 'duplication'); eq(r.duplications[0].kind, 'same-ingredient'); eq(r.duplications[0].name, 'Paracetamol');
  assert(r.duplications[0].records.some(x => x.id === 'paracetamol-duplication'), 'the sourced paracetamol duplication record is attached');
  eq(r.interactions.length, 0);
});
test('combination product is split into ingredients and each is checked', () => {
  const r = check('co-codamol', 'paracetamol');
  const m = r.medications.find(x => x.kind === 'product'); eq(m.ingredients.map(i => i.name), ['Paracetamol', 'Codeine']);
  assert(r.duplications.some(d => d.kind === 'same-ingredient' && d.name === 'Paracetamol'), 'paracetamol appears twice');
  const r2 = check('cozaar-comp', 'lithium');
  assert(r2.interactions.some(i => i.id === 'losartan-lithium' && i.aIngredient === 'Losartan'), 'losartan inside Cozaar Comp is checked against lithium');
  assert(r2.warnings.some(w => w.code === 'limited-coverage' && w.names.includes('Hydrochlorothiazide')), 'ingredients without a page are declared as limited coverage');
  eq(r2.status, 'partial');
});
test('therapeutic duplication within a class uses the sourced rule and any duplication record', () => {
  const r = check('atorvastatin', 'rosuvastatin');
  assert(r.duplications.length >= 1, 'duplication found');
  assert(r.duplications.some(d => d.records.some(x => x.id === 'atorvastatin-rosuvastatin-duplication')), 'the sourced statin duplication record is attached');
  assert(r.duplications.every(d => d.classId === 'statins'), 'class is statins');
  const s = check('atorvastatin', 'simvastatin'); assert(s.duplications.some(d => d.kind === 'class' && d.classId === 'statins' && d.source?.url), 'a named substance shares the class rule');
  const n = check('azithromycin', 'clarithromycin'); assert(n.duplications.some(d => d.classId === 'macrolides'), 'two macrolides');
});
test('a class-level record never applies to the medicine it is written for', () => {
  const r = check('ibuprofen', 'naproxen');
  assert(r.interactions.every(i => i.id !== 'ibuprofen-anticoagulants-class'), 'unrelated class record not matched');
  assert(r.duplications.some(d => d.classId === 'nsaids'), 'two NSAIDs flagged');
  const a = check('amoxicillin', 'cetirizine'); eq(a.interactions.length, 0); eq(a.duplications.length, 0); eq(a.noKnownInteractionPairs.length, 1); eq(a.status, 'complete');
});
test('unsupported entries become warnings and are left out; a class token cannot be checked', () => {
  const r = E.check([{ kind: 'medication', id: 'amlodipine', label: 'Amlodipine' }, { kind: 'medication', id: 'no-such', label: 'Nonsense' }, { kind: 'class', id: 'statins', label: 'Statins' }]);
  eq(r.medications.length, 1); eq(r.warnings.filter(w => w.code === 'unknown-entry').length, 2); eq(r.status, 'insufficient');
  assert(r.warnings.some(w => /drug class/.test(w.message)), 'class hint in the warning');
});
test('ten medications: every pair checked, soft limit only above ten', () => {
  const ten = ['amlodipine', 'losartan', 'ibuprofen', 'warfarin', 'metformin', 'omeprazole', 'atorvastatin', 'paracetamol', 'aspirin', 'sertraline'];
  const r = check(...ten); eq(r.pairsChecked, 45); assert(!r.warnings.some(w => w.code === 'soft-limit'), 'no soft-limit warning at ten');
  const r11 = check(...ten, 'lithium'); eq(r11.pairsChecked, 55); assert(r11.warnings.some(w => w.code === 'soft-limit'), 'soft-limit warning at eleven');
  eq(LIMITS.soft, 10);
});
test('the API contract shape', () => {
  const r = check('warfarin', 'ibuprofen');
  for (const k of ['status', 'medications', 'pairsChecked', 'pairs', 'interactions', 'duplications', 'noKnownInteractionPairs', 'summary', 'related', 'sources', 'warnings', 'sourceMetadata']) assert(k in r, `field ${k}`);
  for (const k of ['provider', 'dataVersion', 'lastUpdated', 'recordCount', 'publishers']) assert(k in r.sourceMetadata, `sourceMetadata.${k}`);
  eq(r.pairs[0].tier, 'contraindicated'); assert(r.interactions[0].id === 'ibuprofen-warfarin');
  const i = r.interactions[0]; for (const k of ['id', 'severity', 'tier', 'effect', 'mechanism', 'sourceWording', 'action', 'monitoring', 'evidence', 'review', 'updated', 'related', 'pair']) assert(k in i, `interaction.${k}`);
  assert(i.evidence.length >= 1 && i.severitySource, 'traceability: evidence and the document supporting the state');
});
test('every record can be reached by the checker through at least one selectable pair', () => {
  const sel = (id, kind) => ({ kind, id, label: id });
  const unreachable = [];
  for (const r of ix.records) {
    let hit = false;
    const a = sel(r.a, 'medication');
    if (r.b) hit = E.check([a, sel(r.b, 'medication')]).interactions.concat(E.check([a, sel(r.b, 'medication')]).duplications.flatMap(d => d.records)).some(x => x.id === r.id);
    else if (r.bClass) { const member = Object.values(ix.substances).find(s => s.drugClass === r.bClass) || null; const medMember = Object.keys(ix.drugClassOf).find(m => ix.drugClassOf[m] === r.bClass && m !== r.a);
      for (const cand of [member && sel(member.id, 'substance'), medMember && sel(medMember, 'medication')].filter(Boolean)) { const res = E.check([a, cand]); if (res.interactions.concat(res.duplications.flatMap(d => d.records)).some(x => x.id === r.id)) hit = true; } }
    else if (r.agentIds?.length) hit = E.check([a, sel(r.agentIds[0], 'substance')]).interactions.some(x => x.id === r.id);
    else if (r.type === 'therapeutic-duplication') hit = E.check([a, { ...a, label: 'again' }]).duplications.some(d => d.records.some(x => x.id === r.id));
    if (!hit) unreachable.push(r.id);
  }
  eq(unreachable, [], 'unreachable records');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
