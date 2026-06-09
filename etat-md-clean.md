# 🍷 Dionysos — État du projet (consolidé)

> Les RÈGLES DE TRAVAIL sont dans `REFERENCE.md` (à lire en premier). Ce fichier-ci ne contient que l'état technique du projet.

## 📁 Architecture
- **Frontend** : GitHub Pages (dépôt `ngjcpvino/dionysos`)
- **Backend** : Google Apps Script — projet « Vino 3.0 » — `Code.gs` (un seul backend, partagé V1/V2)
- **Base** : Google Sheets (ID `1Y4OCwcb2XBTPDTl_KDUGHgEiXgwqqXHmWSw6XQVSe3g`)

## 🏗️ Stratégie V2 — deux sites parallèles (DÉCIDÉ)
On bâtit le V2 comme **un site complet et autonome, côte à côte avec le V1**.

**Site V1 (actuel, figé)** : `index.html`, `styles.css`, tous les `scripts-*.js`. On n'y touche plus.

**Site V2 (parallèle, en construction)** : `index-v2.html`, `styles-v2.css`, `scripts-socle-v2.js` + modules `-v2.js`. `index-v2.html` charge **uniquement** ses propres fichiers.

**Socle dupliqué (temporaire).** `scripts-socle-v2.js` recopie : `API_URL`, `appelBackend` + spinner, variables globales (`CONFIG`, `ALL_DATA`, `ALL_HISTORIQUE`, `CURRENT_WINE_*`, `FICHE_V2_PROVENANCE`, `FICHE_V2_ORIGINE`), `afficherMessage`, `decodeHTML`, `window.onload` propre. `styles-v2.css` recopie `:root` + le fond.

**Ménage final = renommage, pas de tri.** Quand V2 complet : supprimer tous les fichiers V1 d'un bloc, renommer `index-v2.html` → `index.html`, `styles-v2.css` → `styles.css`.

## 🎨 Système de design
**Règle d'or** : « un chat est un chat ». Une valeur = un seul endroit (`:root`), nommée en français lisible (par sa **valeur**, ex. `--ls-9`, pas par son usage), réutilisée partout. Avant de créer une classe, vérifier si elle existe. Jamais de style en dur dans le JS ni de valeur magique dans une règle. **Réutiliser au maximum l'existant** (`.roundel`, `.champ-saisie`, `.menu-liste`/`.item-liste`, `.controle`, `.btn-bascule`, `.titre-1`, `.modal-v2-*`) avant de créer du neuf.

**Principe V2 — cohérence visuelle (directeur).** Tout le V2 est **pleine page, même fond que la fiche vin**, page ou modale. Chaque écran V2 = conteneur dédié (`.modal-v2-fullscreen` + `.modal-v2-content`).

**Principe V2 — données fraîches (DÉCIDÉ, app à 2 utilisateurs) — PRIORITÉ ABSOLUE.** L'app est utilisée par **2 personnes sur 2 téléphones** : chacun a sa copie en mémoire chargée à un moment différent, donc les copies divergent. La **vérité partagée = le Sheet**.

**Règle directrice (ne jamais enfreindre) : toute action qui ÉCRIT dans le Sheet doit, juste après et AVANT de rendre la main, resynchroniser les mémoires partagées (`ALL_DATA` ← `getInventoryData` ; `menuActionV2Context.wineResult` ← `checkWineExists`).** Concerne Arrivée, Déplacer, création C1/C2, Boire, Donner, Déplacer depuis À ranger/Emplacements, correction Historique. Compromis accepté : un appel au Sheet par action (léger délai).

**Z-index des overlays empilés (RÈGLE).** Tous les écrans V2 partagent `z-index:9999`. Un overlay ouvert PAR-DESSUS un autre doit recevoir un z-index supérieur, sinon il passe dessous (l'ordre HTML ne suffit pas). Déjà fait : `#menuActionV2Overlay` et `#histoEditV2Overlay` = `10010` ; loupes fixes (`#caveV2-loupe`, `#achatV2-loupe`, `#empV2-loupe`, `#histoV2-loupe`) et `.btn-fermer` = `10002`.

**Ouverture d'overlay différée — anti « double-clic » (RÈGLE).** Quand un tap ferme un overlay et en ouvre un autre dans le même cycle, le même tap traverse jusqu'à un élément du nouvel overlay placé au même pixel (ex. menu → page Arrivée → roundel « À ranger » qui ajoutait tout seul). Helper `ouvrirApresTap(fn)` dans `scripts-socle-v2.js` (un `setTimeout(fn, 0)`). Tout passage « masquer un overlay puis en ouvrir un autre » doit ouvrir via `ouvrirApresTap`. Déjà appliqué : `menuV2Click` (5 boutons), `ouvrirActionDepuisFicheV2`, `deplacerDepuisARangerV2`, `deplacerDepuisEmpV2`, cartes Cave/Achat/Historique → `ouvrirFicheV2`, cartes mets (historique + fiche) → `ouvrirHistoEditV2`.

**Loupe/X collés au défilement (RÈGLE).** `.modal-v2-content` est le conteneur qui défile, donc loupe et X doivent être `position:fixed` (pas `absolute`) pour rester en place. `.gauche` reste `absolute` (sert à l'accueil + crayon fiche) ; seules les loupes des pages-listes sont fixées par leur id. `.btn-fermer` est `fixed`.

### `styles-v2.css` — contenu
Socle (`:root`, reset, fond, responsive) · `.toast` · `#topNavV2` + `.bouton-navigation` + `.gauche/.centre/.droite` · titres accueil · spinner · Modales V2 · génériques · `.vin-*` · `.photo` · `.carte-info`/`.carte`/`.note-1..5` · `.controle`, `.deux-colonnes`, `.champ-cliquable`, `.champ-saisie`, `.menu-liste`, `.item-liste` · `.roundel*` · `.emp-entete-meuble` (sticky) · `.histo-groupe`/`.histo-mets`/`.bordure-gauche-1..5` · `.fiche-mets` · scan V2 · utilitaires. **Aucun style V1.**

## 📂 Fichiers
**V1 (figé)** : index.html · styles.css · scripts-config.js · scripts-init.js · scripts-inventaire.js · scripts-fiche.js · scripts-scanner.js · scripts-listes.js
**V2 (en construction)** : index-v2.html · styles-v2.css · scripts-socle-v2.js · scripts-scanner-v2.js (scan + menu + saisie manuelle + vin inconnu + Arrivée + Déplacer + Boire + Donner + Cave + filtres + À ranger + Liste d'achat + Emplacements + Historique) · scripts-fiche-v2.js
**Backend** : Code.gs
**Sheets** : Vino · Historique · config/CONFIG · Vins scannés (non utilisé)

## 🎯 Scan V2 (`scripts-scanner-v2.js`)
**Flux** : `startScanFromHomeV2` → `startScannerV2` (Quagga sur `#interactiveV2`, seuil 3) → `traiterResultatScanV2(code)` → `checkWineExists`.
- **Vin existe** → `ouvrirMenuActionV2` : 6 cercles 👁 Visualiser · ➕ Arrivée · ⇄ Déplacer · 🍷 Boire · 🎁 Donner · ✕. Contexte `menuActionV2Context`.
- **Rescanner** / **Entrée manuelle** (`validerSaisieManuelleV2` ≥ 8 chiffres).

### Arbre des résultats d'un scan (RÉFÉRENCE)
- **A — Lecture** : caméra indispo → manuel ; rien lu → boutons visibles ; douteux → seuil 3 ; checksum GTIN ✅. Quagga conservé.
- **B — Vin existe** : stock > 0 → menu complet ; 0 bouteille → Déplacer/Boire/Donner grisés. ✅
- **C — Vin absent** ✅ : recherche SAQ auto. Trouvé → `creerVinSAQV2` → menu. Introuvable → « Vin inconnu » → `creerVinManuelV2` → menu.
- **D — Erreur** → message.

### ➕ Arrivée V2 — ✅ TERMINÉ
Cascade ne propose que le libre, vérif réelle avant ajout. Max 5 bloqué. Conforme données fraîches.

### ⇄ Déplacer V2 — ✅ TERMINÉ
`ouvrirDeplacerV2` → recharge `ALL_DATA`. 1 bouteille → direct ; plusieurs → liste. Vérif réelle. `fermerDeplacerV2` revient selon `menuActionV2Context.retour` ('aranger' → À ranger, 'emplacements' → Emplacements, sinon menu d'action).

## 🛡️ Anti-gel V2 (RÈGLE)
`appelBackend` cache toujours le spinner (`finally`). `retourAccueilV2()` masque tout, remet `menuActionV2Context=null`, message d'erreur. Branchée dans le `.catch` de tout écrivain.

## 📄 Fiche V2 (`scripts-fiche-v2.js`) — consultation + champs éditables
`ouvrirFicheV2(codebarre, provenance)` mémorise `FICHE_V2_PROVENANCE`. Panneau `#ficheV2Overlay`, bordure couleur du vin.
**Blocs** : Information · Description+Prix · Dégustation · Production · Notes (Accords ; Racheter ✓/✗ ; Sur-inventaire `Panier` ; Recettes/Notes/Divers) · Historique des plats (cartes `.fiche-mets` indentées 60px, cliquables → éditeur correction) · Inventaire (lecture seule) · Photo · roundel « OÙ LE TROUVER » · roundel « ACTION » · Prix auto.
**Retour fiche** (`fermerFicheV2`) : si `menuScan` + `FICHE_V2_ORIGINE` (arrivé par bouton ACTION) → revient à l'origine ('cave'/'achat'/'histo') ; sinon `menuScan` → menu d'action ; 'cave' → Cave ; 'achat' → Liste d'achat ; 'histo' → Historique.

## 🎬 Bouton ACTION dans la FICHE V2 — ✅ TERMINÉ
Roundel « ACTION » après « OÙ LE TROUVER ». `ouvrirActionDepuisFicheV2` : recharge `ALL_DATA`, `checkWineExists`, masque la fiche, mémorise `FICHE_V2_ORIGINE` = provenance d'origine, met `FICHE_V2_PROVENANCE='menuScan'`, ouvre `ouvrirMenuActionV2`. Le ✕ du menu (`fermerMenuActionV2`) : si `FICHE_V2_ORIGINE` défini → rouvre la fiche (provenance = origine) ; le ✕ de la fiche revient alors à la liste d'origine. `#menuActionV2Overlay` z-index 10010 (sinon sous la fiche).

## 🍷 Boire V2 / 🎁 Donner V2 — ✅ TERMINÉ
Conteneurs `#boireV2Container` / `#donnerV2Container`, verres 🍷. Boire : plat facultatif, verres grisés sans plat, ACCORDS champ + menu. Donner : sortie + confirmation. Conformes données fraîches.

## 🃏 Carte universelle `.carte` — ✅ TERMINÉ
3 zones flex + bande couleur en bas. `.carte-photo` 60px, `.carte-centre` (`.carte-titre`/`.carte-sous`), `.carte-droite` (`white-space:nowrap` pour ne pas tronquer la date). Bande bas : `.note-1..5` (plats), `.vin-*` (vin). `.carte-vide` = voile 0 bouteille.

## 🍇 Page CAVE À VIN V2 — ✅ TERMINÉ
`#caveV2Container`. Loupe `#caveV2-loupe` (OR si filtre actif). Filtres CASCADE (couleur → cépage → pays → appellation → accords) + recherche nom. Cartes → `ouvrirFicheV2(cb,'cave')`.

## 📦 Page À RANGER V2 — ✅ TERMINÉ
`#aRangerV2Container` (sans filtres). Bouteilles actives sans emplacement, groupées, tri couleur puis nom. Vide → « Tout est bien rangé! ». Clic carte → `deplacerDepuisARangerV2` (`retour='aranger'`). Retour Déplacer → liste rafraîchie.

## 🛒 Page LISTE D'ACHAT V2 — ✅ TERMINÉ
`#achatV2Container`. Contenu auto (`baseAchatV2`) : (`Racheter`=Oui ET 0 bouteille) OU (`Panier`=Oui). Filtres CASCADE Couleur → Pays → Cépage + sélecteur Succursale. Loupe `#achatV2-loupe`. Si succursale choisie, dispo + quantité par carte (`verifierDispoSAQ_GRAPHQL_V1`). Clic carte → `ouvrirFicheV2(cb,'achat')`.

## 📍 Page EMPLACEMENTS V2 — ✅ TERMINÉ
`#empV2Container`. Filtres CASCADE Meuble → Rangée → Espace. Boutons « Vins en double » (toujours), « Cépages doubles »/« Cépages manquants » (si meuble choisi). Loupe `#empV2-loupe` OR si filtre. Vue défaut : groupé MEUBLE (`.emp-entete-meuble` sticky) → RANGÉE (`.titre-3`) → cartes, emplacement à droite. 3 listes (`afficherListeEmpV2`). Clic carte → `deplacerDepuisEmpV2` (`retour='emplacements'`). Retour → page rafraîchie.

## 📜 Page HISTORIQUE V2 — ✅ TERMINÉ
`#histoV2Container`. Charge `ALL_DATA` (accords) + `ALL_HISTORIQUE`. Filtres Mets · Vin · Accord. Loupe `#histoV2-loupe`. Corps PAR VIN dans `.histo-groupe` (espace entre groupes) : carte vin = carte de cave complète (photo + nom + pays/cépage) cliquable → `ouvrirFicheV2(cb,'histo')` ; dessous, cartes `.histo-mets` (indentées 60px, barre couleur à GAUCHE `.bordure-gauche-1..5`, date à droite) cliquables → éditeur `#histoEditV2Overlay` (z-index 10010). Correction NOTE (verres 1-5) + TEXTE plat → `corrigerHistorique(row, plat, note)`, pas de suppression. `ouvrirHistoEditV2(row,plat,note,nom,provenance)` : provenance 'fiche' rafraîchit la fiche, sinon l'historique. `getHistorique` renvoie `row`.

## 🎁 Page PROMOTIONS SAQ — À DÉCIDER (NON BÂTIE)
Entrée burger `'promotions'` → toast « À venir ». Backend dispo : `getPromotionsSAQ` (tes vins), `getToutesPromotionsSAQ` (hors les tiens). **À décider** : tes vins, toutes les promos, ou les deux.

### Menu burger V2 — ✅ TERMINÉ
`#burgerV2` + voile. Actifs : ACCUEIL, CAVE, EMPLACEMENTS, HISTORIQUE, LISTE D'ACHAT, À RANGER, RAFRAÎCHIR. À venir : RECHERCHE, PROMOTIONS SAQ.

## 🏠 Accueil V2 — ✅ TERMINÉ
`#accueilV2-titre` padding `25vh`. `.bouton-navigation` 40×40 (scan/SAQ/burger), boutons symétriques (`.gauche`/`.droite` en `absolute`).

## ✏️ CRAYON — édition fiche V2 — ✅ TERMINÉ
Crayon `.cercle.gauche` (✎) → `ouvrirEditFicheV2`. `#editFicheV2Overlay`, 26 champs. `sauverEditFicheV2` → `saveWineEdits` (n'inclut pas Accords/Racheter/Panier, gérés en direct).

## 🐞 En suspens
- **Vue emplacements V1 instable** : un filtre renvoie parfois une bouteille de moins. D'où la vérif réelle finale à l'Arrivée.
- **Extraire la Cave** dans `scripts-cave-v2.js` — un jour.
- **Page Promotions SAQ** : contenu à décider.
- **Liste d'achat — dispo SAQ lente** : un appel `verifierDispoSAQ_GRAPHQL_V1` par carte quand une succursale est choisie.

## 📇 Champs d'un vin (référence)
Code-barres (CUP), Code SAQ, Nom, Prix, Couleur, Cépages, Pays, Région, Appellation, Désignation, Classification, Format, Alcool, Sucre, Particularité, Producteur, Agent promo, Millésime dégusté, Arômes, Acidité, Sucrosité, Corps, Bouche, Température, Description, Aimé (`Racheter`), Accords, Recettes, Notes temporaires, Divers, Pastille gout, Photo URL (col. index 33), Panier.

## 🔑 Backend — fonctions clés (référence)
- `getConfig` → CONFIG (`CONFIG.meubles[meuble][rangée]`, `CONFIG.accords`)
- `getInventoryData` → tout l'inventaire (→ `ALL_DATA`)
- `checkWineExists` { codebarre } → { exists, count, wine, bottles }
- `checkLocationAvailable` { meuble, rangee, espace } → { available, message }
- `addBottle`, `actionBouteille` { row, action, bottle, plat, bonAccord }
- `getHistorique` → { row, date, codebarre, nom, plat, bonAccord, couleur }
- `corrigerHistorique` { row, plat, note } → corrige une ligne d'Historique (col. 4 plat, col. 5 note)
- `ajouterVinAvecBouteilles`, `updateWineField`, `saveWineEdits`, `getSuccursalesDisponibles`, `getSuccursales`, `ajouterSuccursale`, `verifierDispoSAQ_GRAPHQL_V1`, `getPromotionsSAQ`, `getToutesPromotionsSAQ`, `chercherProduitSAQ_GRAPHQL_V1`, `verifierEtMettreAJourPrixSAQ`, `testScrapingSAQ`

## 🐛 Pièges à surveiller
- Libellés fiche V2 : « À racheter » = `Racheter` ; « Sur-inventaire » = `Panier`. Backend « Racheter » (front) vs « Aimé »/AIME (back).
- Overlay ouvert par-dessus un autre : lui donner un z-index supérieur (l'ordre HTML ne suffit pas).
- Loupe/X d'une page-liste : `position:fixed`, sinon ils défilent avec le contenu.
- Carte avec date à droite : `white-space:nowrap` sinon tronquée.
- Carte indentée pleine largeur : ajouter `width: calc(100% - indent)` sinon elle dépasse à droite.
- Casse CSS sensible : `.roundel` futur `.bouton-londres`.
- Toujours modifier dans `styles-v2.css` (V2), jamais `styles.css` (V1).