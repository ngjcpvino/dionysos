/* ============================================================
   SCRIPTS-SOCLE-V2.JS
   Fondation du site V2 autonome :
   - constantes + appelBackend + spinner
   - variables globales partagées
   - afficherMessage / afficherConfirmation
   - initialisation (window.onload) propre au V2
============================================================ */

// ==================== CONSTANTES ====================
const API_URL = 'https://script.google.com/macros/s/AKfycbxRh6eOQDUy3hXoNNKF6n6gUxhppKB452UqZuPB1mZAC_rzb1jZ5LbPsBuZDH521uq1eA/exec';

// ==================== VARIABLES GLOBALES ====================
let CONFIG = null;
let ALL_DATA = [];
let ALL_HISTORIQUE = [];
let CURRENT_WINE_CODEBARRE = null;
let CURRENT_WINE_DATA = null;
let CURRENT_WINE_BOTTLES = [];
let FICHE_V2_PROVENANCE = null;

// Évite le « double-clic » : le même tap qui traverse un overlay fermé
// jusqu'à un élément du nouvel overlay ouvert au même pixel.
function ouvrirApresTap(fn) {
  setTimeout(fn, 0);
}

function remonterScrollV2(containerId) {
  var c = document.querySelector('#' + containerId + ' .modal-v2-content');
  if (c) c.scrollTop = 0;
}
let FICHE_V2_ORIGINE = null;

// ==================== INITIALISATION ====================
window.onload = function() {
  if (!localStorage.getItem('vinoSecret')) {
    ouvrirSecretV2();
    return;
  }
  demarrerAppV2();
};

function demarrerAppV2() {
  appelBackend('getConfig', {}, { spinner: ' ' }).then(function(cfg) {
    CONFIG = cfg;
    return appelBackend('getInventoryData', {}, { spinner: ' ' });
  }).then(function(data) {
    ALL_DATA = data || [];
  }).catch(function(err) {
    afficherMessage('Erreur de chargement : ' + err);
  });
}

// ==================== MOT DE PASSE D'APP ====================
function ouvrirSecretV2() {
  var c = document.getElementById('secretV2Container');
  if (c) c.style.display = 'flex';
}

function confirmerSecretV2() {
  var champ = document.getElementById('secretV2-champ');
  var valeur = champ.value.trim();
  if (valeur === '') { afficherMessage('Entrez le mot de passe'); return; }
  localStorage.setItem('vinoSecret', valeur);
  champ.value = '';
  document.getElementById('secretV2Container').style.display = 'none';
  demarrerAppV2();
}

// ==================== BACKEND ====================
async function appelBackend(action, data = {}, options = {}) {
  if (options.spinner) _afficherSpinner(options.spinner);
  const controleur = new AbortController();
  const minuterie = setTimeout(function() { controleur.abort(); }, options.timeout || 30000);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: action, data: data, secret: localStorage.getItem('vinoSecret') || '' }),
      signal: controleur.signal
    });
    const json = await response.json();
    if (!json.success) {
      if (json.error === 'ACCES_REFUSE') {
        localStorage.removeItem('vinoSecret');
        ouvrirSecretV2();
        throw new Error('Mot de passe incorrect');
      }
      throw new Error(json.error || 'Erreur backend');
    }
    return json.result;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Le serveur ne répond pas');
    throw e;
  } finally {
    clearTimeout(minuterie);
    if (options.spinner) _cacherSpinner();
  }
}

function _afficherSpinner(texte) {
  let overlay = document.getElementById('spinner-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'spinner-overlay';
    overlay.innerHTML = '<div class="spinner-verre-wrap"><div class="spinner-verre"></div><div class="spinner-pied"></div><div class="spinner-base"></div></div><div class="spinner-texte" id="spinner-texte"></div>';
    document.body.appendChild(overlay);
  }
  document.getElementById('spinner-texte').textContent = texte;
  overlay.style.display = 'flex';
}

function _cacherSpinner() {
  const overlay = document.getElementById('spinner-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ==================== ERREURS GLOBALES ====================
window.addEventListener('error', function(e) {
  afficherMessage('Erreur : ' + (e.message || 'inconnue'));
});
window.addEventListener('unhandledrejection', function(e) {
  var raison = e.reason && e.reason.message ? e.reason.message : e.reason;
  afficherMessage('Erreur : ' + (raison || 'inconnue'));
});

// ==================== MESSAGES ====================
function afficherMessage(m) {
  let t = document.getElementById('toast') || document.createElement('div');
  t.id = 'toast';
  t.className = 'toast';
  document.body.appendChild(t);
  t.style.display = '';
  t.textContent = m;
  t.classList.add('show');
  setTimeout(function() {
    t.classList.remove('show');
    setTimeout(function() { t.style.display = 'none'; }, 400);
  }, 3000);
}

function afficherMessageImage(src) {
  let t = document.getElementById('toast') || document.createElement('div');
  t.id = 'toast';
  t.className = 'toast';
  document.body.appendChild(t);
  t.style.display = '';
  t.innerHTML = '<img src="' + src + '" alt="" style="width:70%;height:70%;object-fit:contain;">';
  t.classList.add('show');
  setTimeout(function() {
    t.classList.remove('show');
    setTimeout(function() { t.style.display = 'none'; }, 400);
  }, 3000);
}

// ==================== UTILITAIRES ====================
function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}


 

function memeCodeV2(a, b) {
  var na = (a || '').toString().replace(/\D/g, '').replace(/^0+/, '');
  var nb = (b || '').toString().replace(/\D/g, '').replace(/^0+/, '');
  return na !== '' && na === nb;
}