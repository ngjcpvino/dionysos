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

**Socle dupliqué (temporaire).** `scripts-socle-v2.js` recopie : `API_URL`, `appelBackend` + spinner, variables globales (`CONFIG`, `ALL_DATA`, `ALL_HISTORIQUE`, `CURRENT_WINE_*`, `FICHE_V2_PROVENANCE`), `afficherMessage`, `decodeHTML`, `window.onload` propre. `styles-v2.css` recopie `:root` + le fond.

**Ménage final = renommage, pas de tri.** Quand V2 complet : supprimer tous les fichiers V1 d'un bloc, renommer `index-v2.html` → `index.html`, `styles-v2.css` → `styles.css`.

## 🎨 Système de design
**Règle d'or** : « un chat est un chat ». Une valeur = un seul endroit (`:root`), nommée en français lisible (par sa **valeur**, ex. `--ls-9`, pas par son usage), réutilisée partout. Avant de créer une classe, vérifier si elle existe. Jamais de style en dur dans le JS ni de valeur magique dans une règle. **Réutiliser au maximum l'existant** (`.roundel`, `.champ-saisie`, `.menu-liste`/`.item-liste`, `.controle`, `.btn-bascule`, `.titre-1`, `.modal-v2-*`) avant de créer du neuf.

**Principe V2 — cohérence visuelle (directeur).** Tout le V2 est **pleine page, même fond que la fiche vin**, page ou modale. Chaque écran V2 = conteneur dédié (`.modal-v2-fullscreen` + `.modal-v2-content`).

**Principe V2 — données fraîches (DÉCIDÉ, app à 2 utilisateurs) — PRIORITÉ ABSOLUE.** L'app est utilisée par **2 personnes sur 2 téléphones** : chacun a sa copie en mémoire chargée à un moment différent, donc les copies divergent. La **vérité partagée = le Sheet**.

**Règle directrice (ne jamais enfreindre) : toute action qui ÉCRIT dans le Sheet doit, juste après et AVANT de rendre la main, resynchroniser les deux mémoires partagées :**
1. **`ALL_DATA`** ← `getInventoryData` (sert à la cascade d'emplacements).
2. **`menuActionV2Context.wineResult`** ← `checkWineExists` (sert au menu d'action : `count`, `bottles`).

Concerne tout écrivain présent et futur : Arrivée, Déplacer, création C1/C2 (conformes), **Boire et Donner (à coder selon la même règle)**, et toute action sur un champ. Compromis accepté : un appel au Sheet par action (léger délai) ; pas de temps réel continu.

**Classes de position génériques** : `.gauche` / `.centre` / `.droite` collent un élément au bord gauche/centre/droite de son parent (en `position:relative`). Réutilisables partout.

**Bouton standard V2** : `.roundel` (anneau or + barre noire `.roundel-barre`), style **logo métro de Londres**. À renommer un jour `.bouton-londres` (tout minuscule) en un seul passage : CSS + JS fiche + HTML.

### `styles-v2.css` — contenu
Socle (`:root`, reset, fond, responsive) · `.toast` · `#topNavV2` + `.bouton-navigation` + `.gauche/.centre/.droite` · titres accueil · spinner · Modales V2 · génériques (`.btn-fermer`, `.titre-1/2/3`, `.texte-secondaire`, `.contenu`, `.section`…) · `.vin-*` · `.photo` · `.carte-info`/`.carte-large`/`.note-1..5` · `.controle`, `.btn-bascule`, `.champ-cliquable`, `.champ-saisie`, `.menu-liste`, `.item-liste` · `.roundel*` · scan V2 · utilitaires. **Aucun style V1.**

## 📂 Fichiers
**V1 (figé)** : index.html · styles.css · scripts-config.js · scripts-init.js · scripts-inventaire.js · scripts-fiche.js · scripts-scanner.js · scripts-listes.js
**V2 (en construction)** : index-v2.html · styles-v2.css · scripts-socle-v2.js · scripts-scanner-v2.js (scan + menu + saisie manuelle + vin inconnu + Arrivée + Déplacer ; Boire/Donner à venir) · scripts-fiche-v2.js
**Backend** : Code.gs
**Sheets** : Vino · Historique · config/CONFIG · Vins scannés (non utilisé)

## 🎯 Scan V2 (`scripts-scanner-v2.js`)
**Flux** : `startScanFromHomeV2` → `startScannerV2` (Quagga sur `#interactiveV2`, seuil 3, feedback `#scanV2-feedback`) → `traiterResultatScanV2(code)` → `checkWineExists`.
- **Vin existe** → `ouvrirMenuActionV2` : 6 cercles 👁 Visualiser · ➕ Arrivée · ⇄ Déplacer · 🍷 Boire · 🎁 Donner · ✕. Contexte `menuActionV2Context`. Branchés : Visualiser, Arrivée, Déplacer. **Boire et Donner : à brancher.**
- **Rescanner** / **Entrée manuelle** (`validerSaisieManuelleV2` ≥ 8 chiffres).

### Arbre des résultats d'un scan (RÉFÉRENCE)
- **A — Lecture** : A1 caméra indispo → entrée manuelle ; A2 rien lu → boutons toujours visibles ; A3 non-produit → ignorer ; A4 douteux → seuil 3 ; A5 sans code → manuel. **Checksum GTIN** ✅ (`gtinValide` ×3/×1, longueurs 8/12/13). Entrée manuelle sans checksum (volontaire). Torche écartée, Quagga conservé.
- **B — Vin existe** : B1 stock > 0 → menu complet ; B2 0 bouteille → Déplacer/Boire/Donner grisés (`.desactive`), seules Visualiser + Arrivée actives. ✅ FAIT (`ouvrirMenuActionV2` applique `.desactive` aux 3 ids si `count === 0`, `count` = bouteilles actives de `checkWineExists`).
- **C — Vin absent** ✅ : recherche SAQ auto. C1 trouvé → `creerVinSAQV2` → menu. C2 introuvable → page « Vin inconnu » (code-barres + nom) → `creerVinManuelV2` → menu.
- **D — Erreur** → message, réessayer.

### ➕ Arrivée V2 — ✅ TERMINÉ
Page plein écran, nom + code-barres, 4 roundels : Meuble · Rangée · Espace · À ranger. Cascade ne propose que le libre (`espacesOccupesArrivee`, `rangeeALibre`, `meubleALibre`), triée. Vérif réelle (`checkLocationAvailable`) avant ajout ; refus → message + rechargement + cascade rafraîchie. Max 5 bloqué à l'ouverture. À ranger toujours possible. Conforme données fraîches.

### ⇄ Déplacer V2 — ✅ TERMINÉ
Page `#deplacerV2Container`. `ouvrirDeplacerV2` → recharge `ALL_DATA` → `construireDeplacerV2`. 1 bouteille → direct ; plusieurs → liste (`choisirBouteilleDeplacer`). Destination = cascade Arrivée (helpers partagés), sans « À ranger ». Vérif réelle, occupé → message + rechargement. Conforme données fraîches : après déplacement, recharge `ALL_DATA` + `checkWineExists`, `fermerDeplacerV2` rouvre le menu. var `deplacerV2Choix`.

## 🛡️ Anti-gel V2 (RÈGLE)
1. **Spinner** : `appelBackend` le cache toujours via `finally` (jamais bloqué).
2. **`retourAccueilV2()`** masque tous les conteneurs V2, remet `menuActionV2Context = null`, affiche « Un problème est survenu, veuillez recommencer ». Branchée dans le `.catch` de tout écrivain. **Tout nouvel écrivain doit suivre la même règle.**

## 📄 Fiche V2 (`scripts-fiche-v2.js`) — consultation + champs éditables
`ouvrirFicheV2(codebarre, provenance)` mémorise `FICHE_V2_PROVENANCE`. Panneau `#ficheV2Overlay`, bordure couleur du vin (`.vin-*`).
**Blocs** : Information · Dégustation (Arômes + 7 cartes) · Production · Notes (Accords → `Accords` ; À racheter ✓/✗ → `Racheter` ; Sur-inventaire 🛒 → `Panier` ; Historique des plats trié 5→1 ; Recettes/Notes/Divers) · Inventaire (lecture seule) · Photo cliquable · « Où trouver ce vin » (`.roundel`, géoloc) · Prix auto.
Dépend du socle : `decodeHTML`, `appelBackend`, `afficherMessage`, `CONFIG`, `ALL_HISTORIQUE`, `CURRENT_WINE_*`.

## 🍷 Boire V2 — ✅ TERMINÉ
## 🎁 Donner V2 — ✅ TERMINÉ
Conteneurs `#boireV2Container` / `#donnerV2Container` (HTML), verres 🍷 (CSS `.boire-verres`/`.boire-verre`/`.allume`/`.desactive`), JS commun dans `scripts-scanner-v2.js` (`actionV2Choix`, `bottlesActivesV2`, `empBouteilleV2`, ouvrir/construire/confirmer/fermer pour Boire et Donner). Branchés dans `menuV2Click('boire'/'donner')` + ajoutés à `retourAccueilV2`. Conformes données fraîches (`getInventoryData` + `checkWineExists` après écriture). Boire : plat facultatif, verres grisés tant que pas de plat, obligatoires si plat ; accords partent des accords du vin, enregistrés au Confirmer. Donner : sortie simple, écran de confirmation.

## 🔤 Renommage `.accord-item` → `.item-liste` — ✅ TERMINÉ
CSS (`styles-v2.css` : `.item-liste` + `.item-liste.actif`, items légèrement espacés) et JS (`scripts-fiche-v2.js` accords + sélecteur ; `scripts-scanner-v2.js` Arrivée meuble/rangée/espace + Déplacer meuble/rangée/espace + liste bouteilles) tous renommés. Aucun `accord-item` ne reste dans les fichiers V2.

## 🃏 Carte universelle `.carte` — ✅ TERMINÉ
`.carte-large` renommée **`.carte`**, restructurée en 3 zones flex + bande couleur en bas. Classes : `.carte` (conteneur cliquable, `cursor:pointer`), `.carte-photo` (vignette 60px, affichée seulement si photo), `.carte-centre` (`.carte-titre` + `.carte-sous`), `.carte-droite` (infos secondaires). Bande bas via `border-bottom` 3px : `.carte.note-1..5` (plats) et `.carte.vin-rouge/blanc/rose/bulles` (vin). Aucune bande = transparent.

JS adapté : `chargerPlatsV2` (plats → centre = nom du plat, droite = date, bande = note) et `trouverCeVinV2`/succursales (centre = nom + adresse/ville, droite = quantité + distance, pas de bande) dans `scripts-fiche-v2.js`. Plus aucun `carte-large` dans les fichiers V2.

Reste à venir : la carte **vin** (photo gauche + nom/pays·région/cépage + nb bouteilles + bande couleur) sera générée par la page CAVE À VIN V2, avec ces mêmes classes. Toutes les cartes seront cliquables (clic → fiche V2) une fois cette page codée.

## 🍇 Page CAVE À VIN V2 — ✅ TERMINÉ (sauf branchement burger)
Conteneur `#caveV2Container` (HTML) : barre épurée loupe `.cercle.gauche` / titre « Les vins de Bacchus » / `.btn-fermer` droite, `#caveV2-compte`, `#caveV2-cartes`. Panneau filtres `.panneau-gauche` glissant de gauche + voile `.panneau-voile` (CSS ajouté). JS dans `scripts-scanner-v2.js` : `ouvrirCaveV2`/`fermerCaveV2`, `grouperVinsV2` (par code-barres, tri couleur puis nom), `afficherCartesCaveV2` (cartes `.carte` : photo gauche si dispo, centre nom + pays•région + cépage, droite nb btl, bande bas couleur, clic → `ouvrirFicheV2(cb, 'cave')`), filtres interdépendants `remplirFiltresCaveV2`/`appliquerFiltresCaveV2`/`reinitialiserFiltresCaveV2`, `ouvrirFiltresCaveV2`/`fermerFiltresCaveV2`. Ajouté à `retourAccueilV2`.
**RESTE** : brancher `ouvrirCaveV2()` depuis le futur menu burger (entrée CAVE À VIN). Et `fermerFicheV2` devra revenir à la cave si `FICHE_V2_PROVENANCE === 'cave'`.

## 🏠 Accueil V2 — ✅ TERMINÉ
`#accueilV2-titre` : padding haut `25vh` (DIONYSOS descendu). `.bouton-navigation` : 40×40 (scan/SAQ/burger même gabarit), images 40×40 `object-fit:contain`, burger ☰ `line-height:1` → les 3 boutons du header à la même hauteur.

### Menu burger V2 — ✅ TERMINÉ (structure + branchements actifs)
Panneau `#burgerV2` `.panneau-droite` (glisse de droite) + voile `#burgerV2-voile`. 9 entrées `.item-liste` dans l'ordre V1. `toggleMenuV2` (branché sur le ☰ du header) + `fermerMenuBurgerV2` + `burgerV2Click(cible)` dans `scripts-scanner-v2.js`. Actifs : ACCUEIL (ferme les conteneurs), CAVE À VIN (`ouvrirCaveV2`), RAFRAÎCHIR (recharge `ALL_DATA`). Les 6 autres (Emplacements, Historique, Liste d'achat, Recherche, À ranger, Promotions) → toast « À venir » tant que leur page V2 n'est pas bâtie. Retour fiche→cave géré dans `fermerFicheV2` (provenance `'cave'`).

## 🩹 Corrections d'apparence — ✅ TOUTES FAITES
1. Spinner : voile `--voile-standard`. ✅
2. `.roundel-anneau` : `aspect-ratio: 1/1` (cercle parfait). ✅
3. `.roundel-barre` : `width: 110px` fixe, padding horizontal 0 (largeur « Pigeonnier », même pour tous). ✅
4. `.menu-liste` : `width: 110px` (alignée roundel). ✅
5. Icône `+` (Arrivée) : emoji `➕` remplacé par `+` blanc. ✅
6. Icône Déplacer : ⇄ (fait en C3). ✅
7. `.btn-fermer` : rond (bordure or, fond sombre, `--taille-tactile`), rapproché du bord (`--space-s`). ✅
8. Boutons fiche non sélectionnés : `#ficheV2-aime-oui/non:not(.actif)` en gris. ✅
9. Titre page Arrivée : « Ajouter ». ✅
10. Nom décodé (`decodeHTML`) dans menu d'action + Arrivée + Déplacer. ✅

## ✏️ CRAYON — édition fiche V2 — ✅ TERMINÉ
Crayon `.cercle.gauche` (✎) dans l'entête de la fiche V2 → `ouvrirEditFicheV2`. Overlay `#editFicheV2Overlay` (HTML) avec corps `#editFicheV2-corps` rempli dynamiquement depuis `EDIT_FICHE_V2_CHAMPS` (26 champs texte `.champ-saisie`, pré-remplis depuis `CURRENT_WINE_DATA`, libellé via `.titre-3`). `sauverEditFicheV2` → `saveWineEdits` (data + `codebarre` + `aime` conservé) → données fraîches via réouverture `ouvrirFicheV2`. `fermerEditFicheV2` ferme l'overlay. Ajouté à `retourAccueilV2`. JS dans `scripts-fiche-v2.js`. Note : `saveWineEdits` n'inclut pas Accords/Racheter/Panier (gérés en direct ailleurs dans la fiche).
- **Bugs** : A1 `creerVinManuelV2` ✅ FAIT · A2 spinner ✅ FAIT · A3 nom non décodé menu d'action (= correction 10).
- **Renommage `.accord-item` → `.item-liste`** : ✅ FAIT.
- **Carte universelle `.carte`** : ✅ FAIT.
- **Classe `.cercle` générique** : ✅ FAIT. Une seule classe `.cercle` (rond, bordure or, fond sombre, centré, `--taille-tactile` par défaut) + `.cercle.actif` (fond or) + `.cercle.desactive` (grisé, non cliquable) dans `styles-v2.css`. Remplace `.btn-bascule` (supprimée ; 3 boutons fiche Racheter/✗/Panier passés à `.cercle`) et `.menu-v2-circle` (supprimée ; 6 cercles du menu d'action passés à `.cercle`, taille 90px via `.menu-v2-grid .cercle`). Accolade manquante de `.roundel` corrigée au passage. Icône Déplacer passée à ⇄ (correction d'apparence #6 faite). L'anneau du `.roundel` n'a PAS été fusionné (structure anneau+barre distincte conservée).
- **Corrections d'apparence** restantes (2 à 9).
- **Boire + Donner** : ✅ FAIT.
- **Menu action scan B1/B2** : ✅ FAIT (grisage déjà en place).
- **CRAYON (édition fiche)** : ✅ FAIT.
- **Menu burger V2** : ✅ FAIT (CAVE À VIN branchée, retour fiche→cave géré). Reste à bâtir les 6 pages V2 manquantes (Emplacements, Historique, Liste d'achat, Recherche, À ranger, Promotions) — actuellement « À venir ».
- **Page CAVE À VIN V2** : ✅ FAIT.
- **Accueil V2** : ✅ FAIT.

## 🐞 En suspens
- **Vue emplacements V1 instable** : un même filtre renvoie parfois une bouteille de moins (cache backend ou formules volatiles du Sheet). Impacte la cascade Arrivée, d'où la vérif réelle finale.

## 📇 Champs d'un vin (référence)
Code-barres (CUP), Code SAQ, Nom, Prix, Couleur, Cépages, Pays, Région, Appellation, Désignation, Classification, Format, Alcool, Sucre, Particularité, Producteur, Agent promo, Millésime dégusté, Arômes, Acidité, Sucrosité, Corps, Bouche, Température, Description, Aimé (`Racheter`), Accords, Recettes, Notes temporaires, Divers, Pastille gout, Photo URL (col. index 33), Panier.

## 🔑 Backend — fonctions clés (référence)
- `getConfig` → CONFIG (dont `CONFIG.meubles[meuble][rangée]`, `CONFIG.accords`)
- `getInventoryData` → tout l'inventaire (→ `ALL_DATA`)
- `checkWineExists` { codebarre } → { exists, count, wine, bottles }
- `checkLocationAvailable` { meuble, rangee, espace } → { available, message }
- `addBottle` { codebarre, meuble, rangee, espace } (vides = à ranger ; max 5)
- `actionBouteille` { row, action, bottle, plat, bonAccord } (boire/donner/deplacer…)
- `ajouterVinAvecBouteilles`, `updateWineField`, `saveWineEdits`, `getSuccursalesDisponibles`, `chercherProduitSAQ_GRAPHQL_V1`, `verifierEtMettreAJourPrixSAQ`, `testScrapingSAQ`

## 🐛 Pièges à surveiller
- Libellés fiche V2 : « À racheter » = `Racheter` ; « Sur-inventaire » = `Panier`. Incohérence backend « Racheter » (front) vs « Aimé »/AIME (back).
- Casse CSS sensible : `.roundel` futur `.bouton-londres` tout minuscule.
- Transvasement V1→V2 : guetter les `... is not defined`. Porté au socle : `decodeHTML`. `afficherConfirmation` non repris (dépend de classes V1) — refaire en V2 si besoin.
- Astuce Notepad++ : les blocs « Trouve ceci » multi-lignes se cherchent par un repère court et unique ; toujours modifier dans `styles-v2.css` (V2), jamais `styles.css` (V1).
