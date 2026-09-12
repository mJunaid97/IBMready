/**
 * seo.js — page metadata and structured data for every page: <title>, description, canonical, robots,
 * Open Graph / Twitter cards and JSON-LD (WebSite, Organization, BreadcrumbList, MedicalWebPage and the
 * entity node). Called by the page scripts; the prerenderer bakes the result into the static HTML, so
 * crawlers see it in the initial response.
 *
 * Title pattern: "[Entity]: [Descriptor] | Anatomy Nexus" (45–65 characters preferred; the descriptor is
 * dropped when the title would run long). Descriptions are cut at a word boundary under 155 characters.
 */
import { SITE, BRAND, canonical, paths, url, esc } from './site.js?v=1.4.0';

export const MAX_TITLE = 70;
export function seoTitle(name, descriptor) {
  const full = descriptor ? `${name}: ${descriptor} | ${BRAND}` : `${name} | ${BRAND}`;
  return full.length <= MAX_TITLE || !descriptor ? full : `${name} | ${BRAND}`;
}
export function metaDescription(text, max = 155) {
  let s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  s = s.slice(0, max - 1); s = s.replace(/\s+\S*$/, ''); return s.replace(/[,;:\s]+$/, '') + '…';
}
const ORG_ID = () => canonical('') + '#organization';
const SITE_ID = () => canonical('') + '#website';
export function organizationNode() {
  return { '@type': 'Organization', '@id': ORG_ID(), name: SITE.organization?.name || BRAND, url: canonical(''), logo: { '@type': 'ImageObject', url: canonical(SITE.organization?.logo || 'site/icon-512.png') }, ...(SITE.organization?.sameAs?.length ? { sameAs: SITE.organization.sameAs } : {}), ...(SITE.contact?.email ? { email: SITE.contact.email } : {}) };
}
export function websiteNode() {
  return { '@type': 'WebSite', '@id': SITE_ID(), url: canonical(''), name: BRAND, description: SITE.description, inLanguage: 'en', publisher: { '@id': ORG_ID() },
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: canonical(paths.dir('search')) + '?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } };
}
function breadcrumbNode(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, ...(c.href && i < items.length - 1 ? { item: absolute(c.href) } : {}) })) };
}
/** Site-relative or ROOT-based hrefs become public absolute URLs (the served origin is replaced by the configured one). */
export function absolute(href) {
  const root = url(''); const s = String(href || '');
  if (s.startsWith(root)) return canonical(s.slice(root.length));
  if (/^https?:\/\//i.test(s)) return s;
  return canonical(s.replace(/^\.\//, ''));
}
/** The page-level node every content page carries: author, publisher, dates, review status and structured citations. */
export function webPageNode({ path, title, description, type = 'MedicalWebPage', entityId, updated, references, reviewed }) {
  const pageUrl = canonical(path);
  const node = { '@type': type, '@id': pageUrl, url: pageUrl, name: title, description, inLanguage: 'en', isPartOf: { '@id': SITE_ID() },
    author: { '@type': 'Organization', name: SITE.editorial?.author || BRAND, url: canonical(paths.dir('about')) }, publisher: { '@id': ORG_ID() } };
  if (entityId) { node.about = { '@id': entityId }; node.mainEntity = { '@id': entityId }; }
  if (updated) node.dateModified = updated;
  if (reviewed) node.lastReviewed = reviewed;
  if (references?.length) node.citation = references.map(r => ({ '@type': 'CreativeWork', name: r.title, url: r.url, ...(r.source ? { publisher: { '@type': 'Organization', name: r.source } } : {}) }));
  return node;
}

function setMeta(sel, attrs) {
  let el = document.head.querySelector(sel);
  if (!el) { el = document.createElement('meta'); for (const [k, v] of Object.entries(attrs)) if (k !== 'content') el.setAttribute(k, v); document.head.appendChild(el); }
  el.setAttribute('content', attrs.content);
}
/**
 * Apply everything for the current page. `path` is site-relative (canonical), `breadcrumbs` [{name, href}],
 * `jsonld` extra nodes (the entity node and page node), `image` a site-relative or absolute preview image.
 */
export function applyMeta({ title, description, path, robots = 'index,follow', type = 'article', image, breadcrumbs, jsonld = [] }) {
  document.title = title;
  const desc = metaDescription(description || SITE.description);
  setMeta('meta[name="description"]', { name: 'description', content: desc });
  setMeta('meta[name="robots"]', { name: 'robots', content: robots });
  let c = document.head.querySelector('link[rel="canonical"]');
  if (!c) { c = document.createElement('link'); c.rel = 'canonical'; document.head.appendChild(c); }
  c.href = canonical(path);
  const img = absolute(image || 'site/og-cover.png');
  setMeta('meta[property="og:type"]', { property: 'og:type', content: type });
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: BRAND });
  setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  setMeta('meta[property="og:description"]', { property: 'og:description', content: desc });
  setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical(path) });
  setMeta('meta[property="og:image"]', { property: 'og:image', content: img });
  setMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' });
  setMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '630' });
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: desc });
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: img });
  if (SITE.verification?.google) setMeta('meta[name="google-site-verification"]', { name: 'google-site-verification', content: SITE.verification.google });
  if (SITE.verification?.bing) setMeta('meta[name="msvalidate.01"]', { name: 'msvalidate.01', content: SITE.verification.bing });
  const graph = [organizationNode(), websiteNode(), ...(breadcrumbs?.length ? [breadcrumbNode(breadcrumbs)] : []), ...jsonld.filter(Boolean)];
  let s = document.getElementById('jsonld');
  if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'jsonld'; document.head.appendChild(s); }
  s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}
/** Convenience for hand-written pages: title/description from the static head, canonical from <body data-canonical>. */
export function applyStaticMeta(extra = {}) {
  const b = document.body.dataset;
  const path = b.canonical ?? '';
  const crumbs = [...document.querySelectorAll('.breadcrumb li')].map(li => ({ name: li.textContent.trim(), href: li.querySelector('a')?.getAttribute('href') }));
  applyMeta({ title: document.title, description: document.querySelector('meta[name="description"]')?.content || '', path, robots: b.robots || 'index,follow', type: path === '' ? 'website' : 'article',
    breadcrumbs: crumbs.length > 1 ? crumbs : undefined, jsonld: [webPageNode({ path, title: document.title, description: document.querySelector('meta[name="description"]')?.content || '', type: b.schema || 'WebPage', updated: SITE.updated })], ...extra });
}
