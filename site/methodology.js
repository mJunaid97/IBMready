// site/methodology.js — page script for editorial/drug-interaction-methodology/: header, footer and metadata as on every
// hand-written page, plus the live facts of the interaction dataset and the severity mapping, read from the same tables the
// checker uses (site/interaction-engine.js) so the documentation cannot drift from the code.
import { renderHeader, renderFooter, loadInteractions, esc, dateText, PRERENDERED, SEVERITY } from './site.js?v=1.4.0';
import { applyStaticMeta } from './seo.js?v=1.4.0';
import { tierBadge, REVIEW_LABEL } from './entity.js?v=1.4.0';
import { STATE_TIER } from './interaction-engine.js?v=1.4.0';

const WHEN = {
  CONTRAINDICATED: 'contraindicated / must not be used together / do not take',
  AVOID_COMBINATION: 'avoid / not recommended / do not take without advice',
  SPECIALIST_OR_CLOSE_MONITORING: 'only under specialist supervision, or for specific indications with close monitoring',
  MONITOR_OR_ADJUST: 'monitor (a level, the INR, kidney function…) or adjust a dose',
  INTERACTION_DOCUMENTED: 'listed as an interaction to tell a doctor or pharmacist about, without a specific management instruction',
  NO_SEVERITY_ASSIGNED: 'describes an effect but gives no management wording (no severity document needed)',
};
renderHeader('about'); renderFooter();
if (!PRERENDERED) applyStaticMeta();
document.querySelector('#ix-tiers tbody').innerHTML = Object.keys(SEVERITY).map(k => `<tr><th scope="row">${esc(SEVERITY[k].label)} <span class="mono muted">${esc(k)}</span></th><td>${esc(WHEN[k] || '')}</td><td>${tierBadge(STATE_TIER[k])}</td></tr>`).join('')
  + `<tr><th scope="row">Minor <span class="mono muted">—</span></th><td>a source grades the interaction as of limited clinical significance (no current source state)</td><td>${tierBadge('minor')}</td></tr>`;
try {
  const ix = await loadInteractions(); const m = ix.sourceMetadata || {};
  document.getElementById('ix-facts').innerHTML = `<dt>Publishers cited</dt><dd>${esc(Object.entries(m.publishers || {}).map(([k, n]) => `${k} (${n})`).join(', '))}</dd>
    <dt>Records</dt><dd>${esc(String(m.recordCount || ix.records.length))} interaction records for ${esc(String(m.medicationCount || ''))} medicines with pages, ${esc(String(m.productCount || ''))} brand and combination products, ${esc(String(m.substanceCount || ''))} named substances and ${esc(String(m.classCount || ''))} drug classes</dd>
    <dt>Scope</dt><dd>${esc((m.scope || ['drug-drug']).join(', '))} (medicine-to-medicine); food, alcohol and supplement interactions live on each medication page</dd>
    <dt>Data version</dt><dd>${esc(m.dataVersion || ix.updated || '')} · last updated <time datetime="${esc(m.lastUpdated || '')}">${esc(dateText(m.lastUpdated || ix.updated))}</time></dd>
    <dt>Review status</dt><dd>${esc(Object.entries(m.reviewStatuses || {}).map(([k, n]) => `${REVIEW_LABEL[k] || k} (${n})`).join('; '))}</dd>
    <dt>Licence of the records</dt><dd>The written records are CC BY 4.0 like the rest of the site's content; the cited documents remain their publishers' and are linked, not reproduced.</dd>`;
} catch {
  document.getElementById('ix-facts').innerHTML = '<dt>Data</dt><dd>The interaction dataset could not be loaded; the counts are shown on the checker when it is available.</dd>';
}
document.body.dataset.rendered = '1';
