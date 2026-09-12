// site/page.js — page script for hand-written pages (about, policies, contact): draws the shared header and
// footer and applies the page's metadata and schema from its static head and <body data-canonical>.
import { renderHeader, renderFooter, PRERENDERED } from './site.js?v=1.5.0';
import { applyStaticMeta } from './seo.js?v=1.5.0';
renderHeader(document.body.dataset.nav || 'none'); renderFooter();
if (!PRERENDERED) applyStaticMeta();
