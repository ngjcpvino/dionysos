# Retirer le hors-ligne de Dionysos

> Seulement si les essais en succursale ne sont pas concluants. Sorti de `mise-a-jour.md` (📴 Hors ligne) le 3 nov. 2026 : la marche à suivre ne sert qu'à ce moment-là.

Ne **JAMAIS** simplement supprimer `sw.js` (un service worker installé continuerait de tourner). Le code est le commit **`163f25f`** — ⚠️ depuis le découpage du 28 oct., son `git revert` ne s'applique plus tel quel (ce qu'il ajoutait à `scripts-scanner-v2.js` vit maintenant dans le socle et les pages) : retirer à la main ce qu'il ajoutait. Puis :
  1. remplacer `sw.js` par ce contenu exact :
     ```js
     // Retrait du hors-ligne : ce service worker efface ses copies, se désinscrit et recharge l'app depuis le site.
     self.addEventListener('install', function() { self.skipWaiting(); });
     self.addEventListener('activate', function(e) {
       e.waitUntil(caches.keys().then(function(cles) { return Promise.all(cles.map(function(k) { return caches.delete(k); })); })
         .then(function() { return self.registration.unregister(); })
         .then(function() { return self.clients.matchAll(); })
         .then(function(clients) { clients.forEach(function(c) { c.navigate(c.url); }); }));
     });
     ```
  2. dans `window.onload` du socle, à la place du `register` : `if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(function(rs) { rs.forEach(function(r) { r.unregister(); }); }).catch(function() {}); try { indexedDB.deleteDatabase('dionysos'); } catch (e) {}`
  3. publier, puis **chaque téléphone ouvre Dionysos une fois avec du réseau** ;
  4. quelques semaines plus tard : supprimer `sw.js` et la ligne de ménage du socle ;
  5. dernier recours sur un iPhone : supprimer l'icône Dionysos de l'écran d'accueil, puis la remettre (Safari → `index-v2.html` → Partager → « Sur l'écran d'accueil ») ; le mot de passe sera redemandé.
