/* ============================================================
   SCRIPTS-INIT.JS
   Variables globales, initialisation, navigation, menu
============================================================ */

// ==================== VARIABLES GLOBALES ====================
let CONFIG = null;
let ALL_DATA = [];
let CURRENT_WINE_CODEBARRE = null;
let FILTRE_CEPAGE_EN_ATTENTE = null;
let RESULTATS_RECHERCHE_EN_ATTENTE = null;
let FILTRE_APPELLATION_EN_ATTENTE = null;
let CURRENT_WINE_DATA = null;
let CURRENT_WINE_BOTTLES = [];

// ==================== INITIALISATION ====================

window.onload = function() {
  appelBackend('getConfig').then(initConfig).catch(function(err) { afficherMessage('Erreur: ' + err); });
  chargerInventaire();
};

function initConfig(cfg) {
  CONFIG = cfg;
}

// ==================== NAVIGATION ====================

function changeView(viewName) {
  document.querySelectorAll('.view-section').forEach(function(v) { v.classList.remove('active'); });
  document.getElementById('view-' + viewName).classList.add('active');
  closeMenu();

  if (window.history.state?.view !== viewName) {
    window.history.pushState({ view: viewName }, '', '#' + viewName);
  }

  const titleNav = document.getElementById('page-title-nav');
  const titresVues = {
    'accueil': '',
    'liste': 'CAVE À VIN',
    'racheter': 'LISTE D\'ACHAT',
    'aranger': 'À RANGER',
    'completer': 'À COMPLÉTER',
    'emplacements': 'EMPLACEMENTS',
    'recherche': 'RECHERCHE',
    'historique': 'HISTORIQUE'
  };
  titleNav.textContent = titresVues[viewName] || '';

  if (viewName === 'liste') {
    chargerInventaire();
    if (!FILTRE_CEPAGE_EN_ATTENTE && !RESULTATS_RECHERCHE_EN_ATTENTE) {
      reinitialiserFiltres();
    }
  }
  if (viewName === 'racheter') chargerListeRacheter();
  if (viewName === 'aranger') chargerListeARanger();
  if (viewName === 'completer') chargerListeACompleter();
  if (viewName === 'emplacements') chargerEmplacements();
  if (viewName === 'recherche') chargerPageRecherche();
  if (viewName === 'historique') chargerHistorique();
  if (viewName === 'promotions') chargerPromotions();
}

window.addEventListener('popstate', function(event) {
  if (event.state && event.state.view) {
    const viewName = event.state.view;
    document.querySelectorAll('.view-section').forEach(function(v) { v.classList.remove('active'); });
    document.getElementById('view-' + viewName).classList.add('active');
    if (viewName === 'liste') chargerInventaire();
    if (viewName === 'historique') chargerHistorique();
    if (viewName === 'emplacements') chargerEmplacements();
  }
});

window.history.replaceState({ view: 'accueil' }, '', '#accueil');

function toggleMenu() {
  document.getElementById("burger").classList.toggle("open");
  document.getElementById("sideMenu").classList.toggle("open");
}

function closeMenu() {
  document.getElementById("sideMenu").classList.remove("open");
  document.getElementById("burger").classList.remove("open");
}

function refreshApp() {
  afficherMessage('Synchronisation...');
  chargerInventaire();

  const activeView = document.querySelector('.view-section.active');
  if (activeView) {
    const viewId = activeView.id.replace('view-', '');
    if (viewId === 'racheter') chargerListeRacheter();
    if (viewId === 'aranger') chargerListeARanger();
    if (viewId === 'completer') chargerListeACompleter();
    if (viewId === 'emplacements') chargerEmplacements();
    if (viewId === 'historique') chargerHistorique();
  }

  setTimeout(function() { afficherMessage('✓ Synchronisé'); }, 500);
}
