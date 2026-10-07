/**
 * app.js — bootstrap for the Anatomy Nexus 3D explorer.
 */
import { AtlasViewer } from './viewer.js?v=1.9.0';
import { AtlasUI } from './ui.js?v=1.9.0';
import { VERSION } from '../site/version.js?v=1.9.0';
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

/** A failure the reader can act on: plain words, a retry where it can help, and the anatomy text as a way forward.
 *  The raw error stays in the console for diagnosis and is never shown as the explanation. */
function showFailure(kind, err) {
  if (err) console.error(`[explorer] ${kind}:`, err);
  const MSG = {
    webgl: ['3D graphics are not available in this browser right now', 'The explorer needs WebGL, which this browser or device has switched off or cannot start (common in private windows, remote desktops and some older devices). Every structure is also described in text.'],
    'context-lost': ['The 3D view was interrupted', 'The browser released the graphics context, which can happen when the device is low on memory or switches graphics mode. Reload to continue; the anatomy text is unaffected.'],
    data: ['The atlas data could not be loaded', 'The structure list did not download. Check the connection and try again; the anatomy articles work without it.'],
    geometry: ['The 3D model could not be downloaded', 'The geometry files did not arrive completely. Try again on a steadier connection or with the lighter model; the anatomy articles describe every structure in text.'],
    unknown: ['The explorer could not start', 'Something unexpected stopped the explorer from starting. Reloading usually fixes it; the anatomy articles are available meanwhile.'],
  };
  const [title, text] = MSG[kind] || MSG.unknown;
  const box = $('loading'); const sub = $('loading-sub'); if (!box || !sub) return;
  const app = $('app'); app.dataset.loading = 'true'; app.dataset.ready = 'false'; app.dataset.failed = kind;
  box.removeAttribute('aria-valuenow'); box.setAttribute('role', 'alert');
  sub.innerHTML = `<b>${title}.</b> ${text}`;
  let act = $('loading-actions'); if (!act) { act = document.createElement('div'); act.id = 'loading-actions'; act.className = 'loading-actions'; sub.after(act); }
  const lite = params.get('quality') !== 'lite' && kind === 'geometry' ? `<a class="btn" href="${location.pathname}?quality=lite${location.hash}">Try the lighter model</a>` : '';
  act.innerHTML = `<button class="btn btn-primary" type="button" id="loading-retry">Try again</button>${lite}<a class="btn" href="../anatomy/">Read the anatomy articles</a>`;
  $('loading-retry').addEventListener('click', () => location.reload());
}
function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

async function main() {
  const theme = initTheme();
  if (!webglAvailable()) { showFailure('webgl'); return; }
  const quality = pickQuality();
  const dataBase = `../data/${quality}/`;
  const [atlas, content, clinical] = await Promise.all([
    fetch(dataBase + 'atlas.json' + stamp).then(r => { if (!r.ok) throw Object.assign(new Error('atlas.json ' + r.status), { kind: 'data' }); return r.json(); }).catch(e => { throw Object.assign(e, { kind: e.kind || 'data' }); }),
    fetch('../data/content/atlas-content.json' + stamp).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch('../data/content/clinical.json' + stamp).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);
  document.title = `3D Anatomy Explorer: ${atlas.totals.pieces.toLocaleString('en-US')} Pieces in ${atlas.systems.length} Systems | Anatomy Nexus`;

  if (params.get('embed') === '1') { const nr = document.querySelector('meta[name="robots"]'); if (nr) nr.content = 'noindex,follow'; $('app').classList.add('is-embed'); const a = document.createElement('a'); a.className = 'embed-open'; a.target = '_top'; a.textContent = 'Open full atlas ↗'; a.href = location.href.replace(/([?&])embed=1&?/, '$1').replace(/\?$/, ''); $('app').appendChild(a); }
  let viewer;
  try { viewer = new AtlasViewer($('view'), atlas, { dataBase, theme }); }
  catch (e) { throw Object.assign(e, { kind: 'webgl' }); }
  // graphics-context loss: say so and offer a reload instead of leaving a frozen or blank canvas
  $('view').addEventListener('webglcontextlost', (e) => { e.preventDefault(); showFailure('context-lost'); }, false);
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
    // a failed download is reported as one: the overlay stays, nothing claims the atlas is ready
    if (!firstShown) { showFailure('geometry', err); return 'failed'; }
    console.error(err); ui.toast('Part of the atlas could not be downloaded; some systems are missing. Reload to try again.', 6000); return 'partial';
  }).then((outcome) => {
    if (outcome === 'failed') return;
    setStats(quality === 'lite' ? 'lite quality' : '');
    if (!firstShown) { app.dataset.loading = 'false'; app.dataset.ready = 'true'; ui.ready(); }
    if (outcome !== 'partial') ui.toast(quality === 'lite' ? 'Loaded the lighter model for this device' : 'Atlas ready · click any structure', 2600);
  });
}

main().catch(err => showFailure(err?.kind || (/WebGL/i.test(err?.message || '') ? 'webgl' : 'unknown'), err));
