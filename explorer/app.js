/**
 * app.js — bootstrap for the Anatomy Nexus 3D explorer.
 */
import { AtlasViewer } from './viewer.js?v=1.3.0';
import { AtlasUI } from './ui.js?v=1.3.0';
import { VERSION } from '../site/version.js?v=1.3.0';
const stamp = VERSION ? `?v=${encodeURIComponent(VERSION)}` : '';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

function pickQuality() {
  const forced = params.get('quality');
  if (forced === 'lite' || forced === 'hd') return forced;
  try { const saved = localStorage.getItem('atlas-quality'); if (saved === 'lite' || saved === 'hd') return saved; } catch {}
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900);
  const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 4;
  return mobile || lowMem ? 'lite' : 'hd';
}

function initTheme() {
  let theme = null;
  try { theme = localStorage.getItem('atlas-theme'); } catch {}
  if (!theme) theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  return theme;
}

async function main() {
  const theme = initTheme();
  const quality = pickQuality();
  const dataBase = `../data/${quality}/`;
  const [atlas, content, clinical] = await Promise.all([
    fetch(dataBase + 'atlas.json' + stamp).then(r => { if (!r.ok) throw new Error('atlas.json ' + r.status); return r.json(); }),
    fetch('../data/content/atlas-content.json' + stamp).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch('../data/content/clinical.json' + stamp).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);
  document.title = `3D Anatomy Explorer: ${atlas.totals.pieces.toLocaleString('en-US')} Structures in ${atlas.systems.length} Systems | Anatomy Nexus`;

  if (params.get('embed') === '1') { const nr = document.querySelector('meta[name="robots"]'); if (nr) nr.content = 'noindex,follow'; $('app').classList.add('is-embed'); const a = document.createElement('a'); a.className = 'embed-open'; a.target = '_top'; a.textContent = 'Open full atlas ↗'; a.href = location.href.replace(/([?&])embed=1&?/, '$1').replace(/\?$/, ''); $('app').appendChild(a); }
  const viewer = new AtlasViewer($('view'), atlas, { dataBase, theme });
  const ui = new AtlasUI(viewer, atlas, content, clinical);
  window.atlas = { viewer, ui, data: atlas };

  const stats = $('stats');
  const setStats = (extra) => { stats.textContent = `${atlas.totals.pieces.toLocaleString('en-US')} pieces · ${atlas.totals.structures.toLocaleString('en-US')} structures${extra ? ' · ' + extra : ''}`; stats.title = `${atlas.systems.length} systems · ${(atlas.totals.triangles / 1e6).toFixed(2)}M triangles · ${(atlas.totals.bytes / 1048576).toFixed(1)} MB of geometry`; };
  setStats('loading…');
  const app = $('app'); let firstShown = false;
  await viewer.load(({ fraction, system, loadedSystems, total }) => {
    $('loading-fill').style.width = `${Math.round(fraction * 100)}%`;
    $('loading').setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
    $('loading-sub').textContent = `Loading ${system.name.toLowerCase()}… ${loadedSystems} of ${total} systems ready`;
    setStats(`streaming ${Math.round(fraction * 100)}%`);
    if (!firstShown && loadedSystems >= 1) { firstShown = true; app.dataset.loading = 'false'; setTimeout(() => { app.dataset.ready = 'true'; }, 450); ui.ready(); }
  }).catch((err) => {
    console.error(err);
    $('loading-sub').textContent = 'Could not load the atlas geometry. Check that data/ is served alongside the site.';
  });
  setStats(quality === 'lite' ? 'lite quality' : '');
  if (!firstShown) { app.dataset.loading = 'false'; app.dataset.ready = 'true'; ui.ready(); }
  ui.toast(quality === 'lite' ? 'Loaded the lighter model for this device' : 'Atlas ready · click any structure', 2600);
}

main().catch(err => { console.error(err); $('loading-sub').textContent = 'Something went wrong: ' + err.message; });
