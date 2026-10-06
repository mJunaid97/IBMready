// site/page.js — page script for hand-written pages (about, policies, contact): draws the shared header and
// footer and applies the page's metadata and schema from its static head and <body data-canonical>.
import { renderHeader, renderFooter, PRERENDERED, SITE, fmt } from './site.js';
import { applyStaticMeta } from './seo.js';
renderHeader(document.body.dataset.nav || 'none'); renderFooter();
if (!PRERENDERED) applyStaticMeta();

// catalogue counts in hand-written pages come from the same compiled data the directories use (site/site-meta.js)
for (const el of document.querySelectorAll('[data-count]')) { const v = (SITE.counts || {})[el.dataset.count]; if (v) el.textContent = fmt(v); }
