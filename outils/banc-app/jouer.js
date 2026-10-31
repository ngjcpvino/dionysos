// Joue les scénarios (scenarios.js) sur une copie de l'app, contre le VRAI serveur (les .gs de dionysos-serveur) qui tourne
// dans le faux Apps Script de son banc d'essai (faux classeur, fausse SAQ). Heure figée, hasard figé : deux versions
// identiques donnent la même trace. Écrit la trace : pour chaque étape, l'écran visible, les appels au serveur, les erreurs.
//   node outils/banc-app/jouer.js <dossier de l'app> <sortie.json>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const [dossierApp, sortie] = process.argv.slice(2);
const serveur = process.env.DIONYSOS_SERVEUR || path.resolve(__dirname, '..', '..', '..', 'dionysos-serveur');
if (!fs.existsSync(path.join(serveur, 'outils', 'banc', 'gas.js'))) {
  console.error('Banc de l\'app : le dépôt du serveur est introuvable (' + serveur + ') — variable DIONYSOS_SERVEUR pour le désigner.');
  process.exit(1);
}
const { creerMonde, FIXE } = require(path.join(serveur, 'outils', 'banc', 'gas.js'));
const { fixture, reseau } = require(path.join(serveur, 'outils', 'banc', 'monde.js'));
const ordre = (noms) => noms.filter(n => n.endsWith('.gs')).sort((a, b) => (a !== 'Code.gs') - (b !== 'Code.gs') || (a < b ? -1 : a > b ? 1 : 0));
const codeServeur = ordre(fs.readdirSync(serveur)).map(n => fs.readFileSync(path.join(serveur, n), 'utf8')).join('\n');
const scenarios = require('./scenarios.js');

const ORIGINE = 'https://dionysos.test/';
const API = /^https:\/\/script\.google\.com\/macros\//;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.PNG': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.ico': 'image/x-icon', '.json': 'application/json' };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };
const dormir = (ms) => new Promise(r => setTimeout(r, ms));

// Le faux classeur du serveur, plus quelques achats (le Profil, « Acheté N fois »)
function classeur() {
  const f = fixture();
  const D = (s) => new Date(s);
  f.Achats = [['Date', 'Code SAQ', 'Code CUP', 'Nom', 'Succursale', 'Quantité', 'Source'],
    [D('2026-09-01T16:00:00Z'), "'10001", "'0061872600004", 'Château Un', 'SAQ Laval', '', 'Import'],
    [D('2026-10-01T16:00:00Z'), "'10001", "'0061872600004", 'Château Un', 'SAQ Laval', 2, 'Arrivée'],
    [D('2026-08-15T16:00:00Z'), "'10002", "'0778810000012", 'Blanc Deux', 'SAQ Joliette', '', 'Import'],
    [D('2026-07-01T16:00:00Z'), "'10008", '', 'Huit', 'SAQ Laval', '', 'Import']];
  return f;
}

// La photo de l'écran : chaque élément visible (balise, id, classes, son texte, sa boîte, quelques styles calculés)
function photo() {
  const out = [];
  const marche = (el, prof) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    const r = el.getBoundingClientRect();
    const classes = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).join('.');
    const texte = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    const valeur = 'value' in el && typeof el.value === 'string' && el.tagName !== 'BUTTON' && el.tagName !== 'LI' ? ' =' + el.value.slice(0, 80) : '';
    out.push(prof + ' ' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (classes ? '.' + classes : '') + ' «' + texte + '»' + valeur +
      ' [' + [r.x, r.y, r.width, r.height].map(Math.round).join(',') + '] ' + [s.color, s.backgroundColor, s.fontSize, s.fontWeight, s.opacity,
      s.borderBottomColor, s.borderLeftColor, s.fill].join(' '));
    for (const c of el.children) marche(c, prof + 1);
  };
  marche(document.body, 0);
  return out;
}

(async () => {
  const navigateur = await chromium.launch();
  const trace = [];
  for (const [nom, etapes] of scenarios) {
    const monde = creerMonde(classeur(), reseau);
    vm.runInContext(codeServeur, monde.contexte, { filename: 'serveur.gs' });
    const contexte = await navigateur.newContext({ viewport: { width: 820, height: 1180 }, serviceWorkers: 'block' });
    await contexte.addInitScript(() => {
      localStorage.setItem('vinoSecret', 'secret');
      // pas d'animation : un panneau qui glisse serait photographié à mi-chemin
      document.addEventListener('DOMContentLoaded', () => {
        const st = document.createElement('style');
        st.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }';
        document.head.appendChild(st);
      });
      let s = 42; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
      window.__enVol = 0;
      const f = window.fetch;
      window.fetch = function() { window.__enVol++; return f.apply(this, arguments).finally(() => { window.__enVol--; }); };
    });
    const page = await contexte.newPage();
    await page.clock.install({ time: FIXE });
    let appels = [], erreurs = [];
    page.on('pageerror', e => erreurs.push('page : ' + String(e.message).split('\n')[0]));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push('console : ' + m.text().split('\n')[0]); });
    await page.route('**/*', async (route) => {
      const req = route.request(), url = req.url();
      if (API.test(url)) {
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        const corps = req.postData() || '';
        let p = {}; try { p = JSON.parse(corps); } catch (e) {}
        appels.push(JSON.stringify({ action: p.action, data: p.data === undefined ? null : p.data }));
        let texte;
        try { texte = monde.contexte.doPost({ postData: { contents: corps } }).texte; }
        catch (e) { texte = JSON.stringify({ success: false, error: String(e.message) }); }
        return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: texte });
      }
      if (url.startsWith(ORIGINE)) {
        const rel = decodeURIComponent(url.slice(ORIGINE.length).split('?')[0].split('#')[0]) || 'index-v2.html';
        const p = path.join(dossierApp, rel);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) return route.fulfill({ status: 200, contentType: TYPES[path.extname(p)] || 'application/octet-stream', body: fs.readFileSync(p) });
        return route.fulfill({ status: 404, body: '' });
      }
      if (url.includes('fond_')) return route.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(path.join(dossierApp, 'images', 'fond.jpg')) });
      if (req.resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
      if (req.resourceType() === 'script') return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
      return route.abort();
    });
    // Laisser l'app finir : le réseau d'abord (temps réel), puis le temps de l'app (horloge figée, avancée par pas)
    const vol = () => page.evaluate(() => window.__enVol || 0).catch(() => 0);
    const auRepos = async () => { for (let t = 0; t < 1000; t++) { if (await vol() === 0) { await dormir(15); if (await vol() === 0) return; } await dormir(10); } };
    const calmer = async () => { for (let i = 0; i < 8; i++) { await auRepos(); await page.clock.runFor(500); } await auRepos(); };
    await page.goto(ORIGINE + 'index-v2.html');
    await calmer();
    const etapesTrace = [{ etape: '(ouverture)', erreur: null, appels: appels.splice(0), erreurs: erreurs.splice(0), ecran: await page.evaluate(photo) }];
    for (const e of etapes) {
      let erreur = null;
      try {
        if (typeof e === 'string') await page.evaluate((code) => { (0, eval)(code); }, e);
        else if (e.saisir) await page.evaluate(([s, t]) => { const el = document.querySelector(s); el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); }, e.saisir);
        else if (e.fichier) await page.setInputFiles(e.fichier[0], path.join(__dirname, e.fichier[1]));
      } catch (x) { erreur = String(x.message).split('\n')[0].replace(/^page\.\w+: /, ''); }
      await calmer();
      etapesTrace.push({ etape: typeof e === 'string' ? e : JSON.stringify(e).slice(0, 80), erreur, appels: appels.splice(0), erreurs: erreurs.splice(0), ecran: await page.evaluate(photo) });
    }
    trace.push({ nom, etapes: etapesTrace });
    await contexte.close();
  }
  await navigateur.close();
  fs.writeFileSync(sortie, JSON.stringify(trace));
  console.log(trace.length + ' scénarios, ' + trace.reduce((n, s) => n + s.etapes.length, 0) + ' étapes');
})().catch(e => { console.error(e); process.exit(1); });
