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
let ALL_ACHATS = null;   // l'onglet Achats (« Acheté N fois » de la fiche) ; null = à relire
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

// ==================== APRÈS UNE ÉCRITURE : LES DONNÉES FRAÎCHES (28 oct. 2026, liste 2.0 chantier 4) ====================
// Règle : toute écriture au Sheet resynchronise la mémoire AVANT de rendre la main. L'inventaire frais dans ALL_DATA…
function rechargerInventaireV2(spinner) {
  return appelBackend('getInventoryData', {}, { spinner: spinner }).then(function(data) { if (data) ALL_DATA = data; return data; });
}
// …et, pour le vin du menu d'action, ses bouteilles fraîches
function rechargerVinEnCoursV2(spinner) {
  return rechargerInventaireV2(spinner).then(function() {
    return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code }, { spinner: spinner });
  }).then(function(result) { if (result) menuActionV2Context.wineResult = result; return result; });
}
// La cause d'un échec, en clair
function causeV2(err) { return err && err.message ? err.message : (err ? String(err) : 'erreur inconnue'); }
// Une écriture qui échoue : le toast le dit, avec la cause. Usage : .catch(signalerErreurV2)
function signalerErreurV2(err) { afficherMessage('Erreur : ' + causeV2(err)); }
// Un appel de fond qui échoue ne dérange pas l'écran (la page reste utilisable), mais laisse sa trace dans le journal
// des erreurs (onglet « Erreurs ») : jamais une panne avalée en silence. Usage : .catch(journaliserV2('Promotions'))
function journaliserV2(quoi) { return function(err) { logErreurV2(quoi + ' : ' + causeV2(err), 'fond'); }; }

// Une page s'ouvre pareil partout : affichée, remontée en haut…
function montrerPageV2(id) {
  document.getElementById(id).style.display = 'flex';
  remonterScrollV2(id);
}
// …et se ferme pareil : son panneau de filtres (si elle en a un), puis la page
function cacherPageV2(id) {
  fermerFiltresV2(id.replace(/(Container|Overlay)$/, ''));
  rangerPageV2(document.getElementById(id));
}
// Une page qui se cache retient sa place (où on était rendu dans la liste)…
var PLACE_PAGES_V2 = {};
function rangerPageV2(page) {
  var c = page.querySelector('.modal-v2-content');
  if (c && page.style.display !== 'none') PLACE_PAGES_V2[page.id] = c.scrollTop;
  page.style.display = 'none';
}
// …et on y revient à cette place, pas en haut, en fermant la fiche (redessiner : la remettre à jour au passage)
function revenirPageV2(id, redessiner) {
  var page = document.getElementById(id);
  var c = page.querySelector('.modal-v2-content');
  var place = page.style.display !== 'none' ? c.scrollTop : (PLACE_PAGES_V2[id] || 0);
  page.style.display = 'flex';
  if (redessiner) redessiner();
  c.scrollTop = place;
}

function remonterScrollV2(containerId) {
  var c = document.querySelector('#' + containerId + ' .modal-v2-content');
  if (c) c.scrollTop = 0;
}
let FICHE_V2_ORIGINE = null;

// ==================== INITIALISATION ====================
window.onload = function() {
  // Copie de l'app dans le téléphone (sw.js) : elle s'ouvre même sans réseau
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function() {});
  if (!localStorage.getItem('vinoSecret')) {
    ouvrirSecretV2();
    return;
  }
  demarrerAppV2();
};

function demarrerAppV2(essai) {
  essai = essai || 1;
  // Avec une copie gardée dans le téléphone, on n'attend pas un réseau qui traîne : 8 s, puis la copie.
  lireCopieV2('inventaire').then(function(copie) {
    var opt = { spinner: ' ', timeout: copie ? 8000 : 30000 };
    appelBackend('getConfig', {}, opt).then(function(cfg) {
      CONFIG = cfg;
      return appelBackend('getInventoryData', {}, opt);
    }).then(function(data) {
      ALL_DATA = data || [];
      return appelBackend('getSuggestions', {}, opt);
    }).then(function(sugg) {
      ALL_SUGGESTIONS = sugg || [];
      restaurerInventaireSuccV2(false);
    }).catch(function(err) {
      var msg = causeV2(err);
      // Mot de passe : appelBackend a déjà rouvert l'écran du mot de passe → ne pas réessayer.
      if (msg === 'Mot de passe incorrect') return;
      // Pas de réseau : démarrer sur la copie gardée dans le téléphone
      if (copie) { demarrerSurCopieV2(); return; }
      // Réseau/serveur momentané (« Failed to fetch », « Le serveur ne répond pas ») : réessayer avant d'abandonner.
      if (essai < 3) { setTimeout(function() { demarrerAppV2(essai + 1); }, 1500); return; }
      afficherMessage('Connexion au serveur impossible (' + msg + '). Vérifiez le réseau, puis rechargez.');
    });
  });
}

// ==================== COPIE HORS LIGNE (24 oct. 2026) ====================
// Chaque réponse utile du serveur est gardée dans le téléphone (IndexedDB, quelques Mo) : sans réseau,
// l'app démarre sur cette copie, l'accueil affiche « Hors ligne — données de 14 h 05 », et elle se
// resynchronise seule dès que le réseau revient. Les écritures (Boire, Arrivée…) restent impossibles sans réseau.
var COPIES_V2 = { getConfig: 'config', getInventoryData: 'inventaire', getSuggestions: 'suggestions', getCurieuxBegin: 'curieuxbegin' };
var COPIE_V2_BD = null;
var RESYNC_V2 = null;

function baseCopieV2() {
  if (!COPIE_V2_BD) {
    COPIE_V2_BD = new Promise(function(ok, ko) {
      if (!window.indexedDB) { ko(new Error('IndexedDB absent')); return; }
      var req = indexedDB.open('dionysos', 1);
      req.onupgradeneeded = function() { req.result.createObjectStore('copie'); };
      req.onsuccess = function() { ok(req.result); };
      req.onerror = function() { ko(req.error); };
    });
  }
  return COPIE_V2_BD;
}

// Feu-et-oublie : une copie qui échoue ne gêne jamais l'app
function garderCopieV2(cle, valeur) {
  baseCopieV2().then(function(bd) {
    bd.transaction('copie', 'readwrite').objectStore('copie').put({ valeur: valeur, date: Date.now() }, cle);
  }).catch(function() {});
}

// → { valeur, date } ou null (jamais d'erreur)
function lireCopieV2(cle) {
  return baseCopieV2().then(function(bd) {
    return new Promise(function(ok) {
      var r = bd.transaction('copie', 'readonly').objectStore('copie').get(cle);
      r.onsuccess = function() { ok(r.result || null); };
      r.onerror = function() { ok(null); };
    });
  }).catch(function() { return null; });
}

function effacerCopieV2(cle) {
  baseCopieV2().then(function(bd) {
    bd.transaction('copie', 'readwrite').objectStore('copie').delete(cle);
  }).catch(function() {});
}

// Inventaire de la dernière succursale : repris au démarrage s'il a moins de 24 h (toujours, sans réseau)
function restaurerInventaireSuccV2(horsLigne) {
  return lireCopieV2('inventaireSucc').then(function(c) {
    if (!c || INVENTAIRE_SUCC_V2) return;
    if (horsLigne || Date.now() - c.date < 86400000) INVENTAIRE_SUCC_V2 = c.valeur;
  });
}

function demarrerSurCopieV2() {
  return Promise.all(['config', 'inventaire', 'suggestions', 'curieuxbegin'].map(lireCopieV2)).then(function(c) {
    if (!c[0] || !c[1]) { afficherMessage('Connexion au serveur impossible. Vérifiez le réseau, puis rechargez.'); return; }
    CONFIG = c[0].valeur;
    ALL_DATA = c[1].valeur || [];
    ALL_SUGGESTIONS = c[2] ? (c[2].valeur || []) : [];
    if (c[3] && !ALL_CURIEUXBEGIN) ALL_CURIEUXBEGIN = c[3].valeur || [];
    restaurerInventaireSuccV2(true);
    afficherHorsLigneV2(c[1].date);
    resynchroniserV2();
  });
}

// « Hors ligne — données de 14 h 05 » sous le logo (avec le jour si la copie n'est pas d'aujourd'hui)
function afficherHorsLigneV2(date) {
  var el = document.getElementById('accueilV2-horsligne');
  if (!el) return;
  var d = new Date(date);
  var mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var jour = (d.toDateString() === new Date().toDateString()) ? '' : ' le ' + d.getDate() + ' ' + mois[d.getMonth()];
  el.textContent = 'Hors ligne — données de ' + d.getHours() + ' h ' + ('0' + d.getMinutes()).slice(-2) + jour;
  el.style.display = '';
}

// Démarrée sur la copie : toutes les 20 s, on retente le serveur ; au retour du réseau, données fraîches et le signe s'efface
function resynchroniserV2() {
  clearTimeout(RESYNC_V2);
  RESYNC_V2 = setTimeout(function() {
    var opt = { spinner: '' };
    appelBackend('getConfig', {}, opt).then(function(cfg) {
      return appelBackend('getInventoryData', {}, opt).then(function(data) {
        return appelBackend('getSuggestions', {}, opt).then(function(sugg) {
          CONFIG = cfg;
          ALL_DATA = data || [];
          ALL_SUGGESTIONS = sugg || [];
          var el = document.getElementById('accueilV2-horsligne');
          if (el) el.style.display = 'none';
        });
      });
    }).catch(function(e) {
      if (e && e.message === 'Mot de passe incorrect') return;
      resynchroniserV2();
    });
  }, 20000);
}

// Porte de sortie (bouton « Données », avec réseau seulement) : oublie la copie de l'app et la recharge
// depuis le site — au cas où elle resterait coincée sur une vieille version.
function mettreAJourAppV2() {
  var fin = function() { setTimeout(function() { location.reload(); }, 1200); };
  if (!('caches' in window)) { fin(); return; }
  var maj = ('serviceWorker' in navigator) ? navigator.serviceWorker.getRegistration().then(function(r) { return r && r.update(); }).catch(function() {}) : Promise.resolve();
  maj.then(function() { return caches.keys(); }).then(function(cles) {
    return Promise.all(cles.filter(function(k) { return k.indexOf('dionysos-app') === 0; }).map(function(k) { return caches.delete(k); }));
  }).catch(function() {}).then(fin);
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
    if (COPIES_V2[action]) garderCopieV2(COPIES_V2[action], json.result); // copie hors ligne
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

// Le verre qui se remplit — celui du spinner, aussi posé dans une liste qui charge en fond (Découvertes)
function verreSpinnerHtmlV2() {
  return '<div class="spinner-verre-wrap"><div class="spinner-verre"></div><svg class="spinner-trace" viewBox="54 34 74 114"><path d="M59.5 38.5 L121.5 38.5 C122.5 52 123 64 121.5 78 C119.5 94 108 105.5 90.5 105.5 C73 105.5 61.5 94 59.5 78 C58 64 58.5 52 59.5 38.5 Z"/><path d="M90.5 105.5 V144 M69.5 144 H111.5"/></svg></div>';
}

function _afficherSpinner(texte) {
  _SPINNER_COMPTEUR++;
  clearTimeout(_SPINNER_MINUTERIE);
  let overlay = document.getElementById('spinner-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'spinner-overlay';
    overlay.innerHTML = verreSpinnerHtmlV2() + '<div class="spinner-texte" id="spinner-texte"></div>';
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
// Le toast : un seul, réutilisé — montré avec son contenu, puis caché en fondu
function montrerToastV2(html) {
  let t = document.getElementById('toast') || document.createElement('div');
  t.id = 'toast';
  t.className = 'toast';
  document.body.appendChild(t);
  t.style.display = '';
  t.innerHTML = html;
  t.classList.add('show');
  return t;
}
function cacherToastV2(t) {
  t.classList.remove('show');
  setTimeout(function() { t.style.display = 'none'; }, 400);
}

function afficherMessage(m) {
  var t = montrerToastV2('');
  t.textContent = m;
  setTimeout(function() { cacherToastV2(t); }, 3000);
}

// Une image (« Ne pas racheter ») : reste jusqu'au prochain toucher
function afficherMessageImage(src) {
  var t = montrerToastV2('<img src="' + src + '" alt="" class="toast-img">');
  var fermer = function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    document.removeEventListener('touchstart', fermer, true);
    document.removeEventListener('click', fermer, true);
    cacherToastV2(t);
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