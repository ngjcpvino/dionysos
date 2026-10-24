/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SW.JS — copie de l'app dans le téléphone (ouverture sans réseau)
   Réseau d'abord : avec du réseau, rien ne change (et la copie se refait au passage) ;
   sans réseau, ou s'il traîne entre les murs de béton, la copie gardée répond.
   Ne touche jamais au backend (POST vers Apps Script) ni aux photos des bouteilles (SAQ).
============================================================ */

var CACHE_APP = 'dionysos-app-v1';
var DELAI_RESEAU = 4000; // au-delà, la copie répond

// Gardés dès l'installation : l'app elle-même et ce qu'elle affiche sans réseau
var FICHIERS = [
  'index-v2.html', 'styles-v2.css', 'scripts-socle-v2.js', 'scripts-scanner-v2.js', 'scripts-fiche-v2.js',
  'images/scan.png', 'images/saq1.PNG', 'images/partager-spinner-3.svg', 'images/ne-pas-racheter.svg',
  'images/icone-ipad.png', 'images/vin.ico'
];
// Hors du site, mais nécessaires sans réseau : le lecteur de codes-barres et l'image de fond
var EXTERNES = [
  'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js',
  'https://res.cloudinary.com/dym93w23h/image/upload/v1780614859/fond_k08qtb.jpg'
];

// L'anti-cache ?v= change chaque heure : une seule copie par fichier, sans le ?v=
function cleCache(url) { return url.split('?')[0]; }

function aGarder(url) {
  var u = new URL(url);
  if (u.origin === self.location.origin) return u.pathname.slice(-6) !== '/sw.js';
  return EXTERNES.indexOf(u.origin + u.pathname) !== -1;
}

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_APP).then(function(cache) {
    return Promise.all(FICHIERS.concat(EXTERNES).map(function(url) {
      var req = new Request(url, EXTERNES.indexOf(url) !== -1 ? { mode: 'no-cors' } : {});
      return fetch(req).then(function(rep) {
        if (rep && (rep.ok || rep.type === 'opaque')) return cache.put(cleCache(req.url), rep);
      }).catch(function() {});
    }));
  }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(cles) {
    return Promise.all(cles.filter(function(k) { return k.indexOf('dionysos-app') === 0 && k !== CACHE_APP; })
      .map(function(k) { return caches.delete(k); }));
  }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET' || !aGarder(req.url)) return;
  e.respondWith(reseauPuisCopie(req));
});

function reseauPuisCopie(req) {
  var cle = cleCache(req.url);
  var reseau = fetch(req).then(function(rep) {
    if (rep && (rep.ok || rep.type === 'opaque')) {
      var copie = rep.clone();
      caches.open(CACHE_APP).then(function(cache) { cache.put(cle, copie); });
    }
    return rep;
  });
  var delai = new Promise(function(ok) { setTimeout(ok, DELAI_RESEAU); });
  return Promise.race([reseau.catch(function() { return null; }), delai.then(function() { return null; })]).then(function(rep) {
    if (rep) return rep;
    // Pas de réponse à temps : la copie ; sans copie, on attend quand même le réseau
    return caches.match(cle).then(function(copie) { return copie || reseau; });
  });
}
