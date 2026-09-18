/* ============================================================
   © 2026 Dionysos — Tous droits réservés
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
let ALL_SUGGESTIONS = [];
let ALL_NOTES = [];
let CURRENT_WINE_CODEBARRE = null;
let CURRENT_WINE_DATA = null;
let CURRENT_WINE_BOTTLES = [];
let FICHE_V2_PROVENANCE = null;

// Évite le « double-clic » : le même tap qui traverse un overlay fermé
// jusqu'à un élément du nouvel overlay ouvert au même pixel.
function ouvrirApresTap(fn) {
  setTimeout(fn, 0);
}

// Change d'écran sous le spinner : l'accueil n'apparaît jamais entre deux
// pages, et le tap ne traverse pas jusqu'au nouvel écran.
function naviguerV2(ouvrir) {
  _afficherSpinner(' ');
  cacherToutesPagesV2();
  ouvrirApresTap(function() {
    try { ouvrir(); } finally { _cacherSpinner(); }
  });
}

function ouvrirSAQV2(codeSAQ) {
  var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS) {
    window.location.href = codeSAQ ? 'saq://products/' + codeSAQ : 'saq://';
  } else {
    window.open(codeSAQ ? 'https://www.saq.com/fr/' + codeSAQ : 'https://www.saq.com', '_blank');
  }
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

function demarrerAppV2(essai) {
  essai = essai || 1;
  appelBackend('getConfig', {}, { spinner: ' ' }).then(function(cfg) {
    CONFIG = cfg;
    return appelBackend('getInventoryData', {}, { spinner: ' ' });
  }).then(function(data) {
    ALL_DATA = data || [];
    return appelBackend('getSuggestions', {}, { spinner: ' ' });
  }).then(function(sugg) {
    ALL_SUGGESTIONS = sugg || [];
  }).catch(function(err) {
    var msg = (err && err.message) ? err.message : String(err);
    // Mot de passe : appelBackend a déjà rouvert l'écran du mot de passe → ne pas réessayer.
    if (msg === 'Mot de passe incorrect') return;
    // Réseau/serveur momentané (« Failed to fetch », « Le serveur ne répond pas ») : réessayer avant d'abandonner.
    if (essai < 3) { setTimeout(function() { demarrerAppV2(essai + 1); }, 1500); return; }
    afficherMessage('Connexion au serveur impossible (' + msg + '). Vérifiez le réseau, puis rechargez.');
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
  var texteSpinner = (options.spinner === undefined) ? ' ' : options.spinner;
  if (texteSpinner) _afficherSpinner(texteSpinner);
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
    if (texteSpinner) _cacherSpinner();
  }
}

// Le spinner reste affiché tant qu'un appel est en cours (compteur) et ne
// disparaît qu'au tour suivant : une suite d'appels enchaînés ne laisse
// jamais l'écran cliquable entre deux.
var _SPINNER_COMPTEUR = 0;
var _SPINNER_MINUTERIE = null;

function _afficherSpinner(texte) {
  _SPINNER_COMPTEUR++;
  clearTimeout(_SPINNER_MINUTERIE);
  let overlay = document.getElementById('spinner-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'spinner-overlay';
    overlay.innerHTML = '<div class="spinner-verre-wrap"><div class="spinner-verre"></div><div class="spinner-pied"></div><div class="spinner-base"></div></div><div class="spinner-texte" id="spinner-texte"></div>';
    document.body.appendChild(overlay);
  }
  if (overlay.style.display !== 'flex' || (texte || '').trim() !== '') {
    document.getElementById('spinner-texte').textContent = texte;
  }
  overlay.style.display = 'flex';
}

function _cacherSpinner() {
  _SPINNER_COMPTEUR--;
  if (_SPINNER_COMPTEUR > 0) return;
  _SPINNER_COMPTEUR = 0;
  clearTimeout(_SPINNER_MINUTERIE);
  _SPINNER_MINUTERIE = setTimeout(function() {
    if (_SPINNER_COMPTEUR > 0) return;
    const overlay = document.getElementById('spinner-overlay');
    if (overlay) overlay.style.display = 'none';
  }, 0);
}

// ==================== ERREURS GLOBALES ====================
// Journalise une erreur dans l'onglet « Erreurs » du Sheet — feu-et-oublie, ne bloque ni ne relance jamais.
function logErreurV2(message, page, code) {
  try {
    appelBackend('logErreur', {
      message: (message == null ? 'inconnue' : message).toString(),
      page: (page || '').toString(),
      code: (code || (typeof CURRENT_WINE_CODEBARRE !== 'undefined' ? CURRENT_WINE_CODEBARRE : '') || '').toString()
    }, { spinner: '' }).catch(function(){});
  } catch (e) {}
}

window.addEventListener('error', function(e) {
  afficherMessage('Erreur : ' + (e.message || 'inconnue'));
  logErreurV2(e.message, (e.filename || '') + (e.lineno ? ':' + e.lineno : ''));
});
window.addEventListener('unhandledrejection', function(e) {
  var raison = e.reason && e.reason.message ? e.reason.message : e.reason;
  afficherMessage('Erreur : ' + (raison || 'inconnue'));
  logErreurV2(raison, 'promesse');
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
  t.innerHTML = '<img src="' + src + '" alt="" class="toast-img">';
  t.classList.add('show');
  var fermer = function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    document.removeEventListener('touchstart', fermer, true);
    document.removeEventListener('click', fermer, true);
    t.classList.remove('show');
    setTimeout(function() { t.style.display = 'none'; }, 400);
  };
  setTimeout(function() {
    document.addEventListener('touchstart', fermer, { capture: true, passive: false });
    document.addEventListener('click', fermer, true);
  }, 0);
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