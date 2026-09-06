# 📋 Les dix — file des changements à appliquer

> Séance du 4 septembre 2026. **Aucun n'est fait** : rien n'a été codé, aucun bloc trouve/remplace envoyé.
> Ordre de codage imposé : le renommage (1) passe avant tout, sinon 2, 3 et 10 sont à refaire.

---

## 1. Renommage « Accords » → « Chartier »
`index-v2.html` · `scripts-scanner-v2.js` · `scripts-fiche-v2.js` · `Code.gs` · Sheet

- Tout ce qui est lié à Chartier prend le nom Chartier : conteneur, panneau, fonctions, variables, backend, onglet Sheet.
- Le **champ Accords de la fiche** et sa colonne config gardent leur nom : ils ne sont pas liés à Chartier.
- **À faire en premier** — les items 2, 3 et 10 touchent les mêmes noms.

---

## 2. Conteneur SELON CHARTIER manquant
`index-v2.html`

- `ouvrirAccordsV2` plante sur `#accordsV2Container` : erreur « null is not an object » au clic dans le menu.
- Le moteur est complet dans `scripts-scanner-v2.js` ; seul le bloc HTML de la page a sauté, comme la ligne du menu (remise le 4 septembre).
- Bloc à remettre sur le gabarit de `#selonSaqV2Container` : loupe `#accordsV2-loupe`, titre, `#accordsV2-selection`, `#accordsV2-resultats`, voile `#accordsV2-filtres-voile`, panneau `#accordsV2-filtres`.
- ✕ → `fermerAccordsV2()`, loupe → `ouvrirFiltresAccordsV2()`, voile → `fermerFiltresAccordsV2()`.

---

## 3. Sous-menu « Accord selon… » au burger
`index-v2.html` · `scripts-scanner-v2.js`

- Un seul item au menu : **Accord selon…** Au clic, il déplie trois lignes : **Sommeliers** · **SAQ** · **Chartier**.
- Les trois lignes actuelles (SUGGESTIONS, SELON CHARTIER, SELON SAQ) disparaissent du menu principal.
- Cibles inchangées : Sommeliers → `suggestions`, SAQ → `selonsaq`, Chartier → `accords`.

---

## 4. Sous-menu « Outils » au burger
`index-v2.html` · `scripts-scanner-v2.js`

- Un item **OUTILS** qui déplie : **À ranger** · **Sans cépage** · **Facture SAQ** · **Promotions SAQ**.
- Ces quatre lignes disparaissent du menu principal. Cibles inchangées.
- Même mécanique de dépliage que l'item 3 — celle écrite pour 3 sert ici.

---

## 5. Vins-notes : « Suggestion » au lieu de « 0 btl »
`scripts-scanner-v2.js`

- Un vin dont la colonne **Racheter est vide** est une note, un cahier de suggestions — pas un vin à racheter.
- Dans toutes les listes à cartes (Cave, Recherche, Chartier, Selon SAQ, Suggestions, Emplacements), la case de droite affiche **Suggestion** au lieu de `0 btl`.
- Le voile de carte vide reste tel quel.

---

## 6. Bascule « Liste suggestions » dans Liste d'achat
`scripts-scanner-v2.js`

- En tête du panneau de filtres : **Liste d'achat** et **Liste suggestions**, **exclusives**, une seule active à la fois, Liste d'achat par défaut.
- Liste suggestions = les vins dont la colonne Racheter est vide.
- Les filtres du dessous (couleur, pays, succursale, etc.) s'appliquent aux deux modes.
- Les « à ne pas racheter » restent comme aujourd'hui, hors filtres.

---

## 7. Intervertir deux roundels dans Liste d'achat
`scripts-scanner-v2.js`

- Dans le panneau de filtres, **Ne pas racheter** et **Réinitialiser** échangent leur place.

---

## 8. Choix « Tous » en tête de chaque menu de filtre
`scripts-scanner-v2.js`

- Dans tous les menus déroulants de filtre (Cave, Recherche, Liste d'achat, Emplacements, Historique, Promotions, Chartier, Selon SAQ), une première ligne **Tous** qui remet **ce filtre-là seul** à zéro.
- Marquée active quand aucune valeur n'est choisie.
- Réinitialiser reste là pour vider tout le panneau d'un coup.

---

## 9. Retirer « Selon » dans la section ACCORDS SELON… de la fiche
`scripts-fiche-v2.js`

- Les trois lignes deviennent **Les sommeliers** · **SAQ** · **Chartier**.
- Le titre de section reste **ACCORDS SELON…**

---

## 10. % des cépages sur la fiche
`scripts-fiche-v2.js` · `Code.gs`

- La fiche SAQ donne les cépages avec leurs pourcentages ; `cleanCepages` les retire avant l'écriture au Sheet. **Rien ne change au Sheet** : la colonne Cépages reste nettoyée, filtres et menus intacts.
- La ligne « Cépages : » de la section Information reçoit un `id`.
- `verifierEtMettreAJourPrixSAQ` retourne aussi les cépages bruts avec %, tirés du HTML **déjà téléchargé** — aucun appel SAQ de plus (la fiche est en cache 5 minutes).
- `verifierPrixV2` réécrit la ligne à l'arrivée de la réponse, **étoile Favori conservée**.
- Sans code SAQ, hors ligne, ou % absents de la fiche SAQ → la ligne ne bouge pas.
