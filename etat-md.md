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
- **B — Vin existe** : B1 stock > 0 → menu complet ; B2 0 bouteille → seules Visualiser + Arrivée utiles. *(B1/B2 pas encore distingués)*
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

## 🍷 Boire V2 — PLANIFIÉ (à coder)
Conteneur unique `#boireV2Container`, titre **« Boire »**, nom + code-barres. Le corps se reconstruit (liste bouteilles → formulaire), comme Déplacer.
- **Choix bouteille** : plusieurs bouteilles actives → liste (emplacement ou « À ranger ») ; **une seule → sauté**, direct au formulaire.
- **Formulaire** (réutiliser styles existants) :
  - **Plat** : `.champ-saisie`, saisie libre, **facultatif**.
  - **Appréciation** : **5 verres 🍷** identiques au V1 (opacité 0.3 éteint / 1 allumé, clic allume de 1 à la note). **Désactivés (grisés, non cliquables) tant qu'aucun plat n'est saisi** ; deviennent **obligatoires si un plat est saisi**. Aucun plat → verres restent vides. Pas de valeur par défaut (≠ V1 qui mettait 3). Pas de re-grisage dynamique si on efface le plat après coup.
  - **Accords** : liste déroulante (`.menu-liste`/`.item-liste`), **part des accords actuels du vin** et **ajoute**. **Ne s'enregistre qu'au Confirmer** (pas à chaque clic, ≠ fiche).
  - **Confirmer** : `.roundel`.
- **Confirmer** → `actionBouteille { row, action:'boire', bottle, plat, bonAccord }` (+ `updateWineField` Accords si accords cochés) → données fraîches (`ALL_DATA` + `checkWineExists`) → toast **« Santé ! »** → **retour accueil**.
- **✕** : formulaire → liste (si plusieurs) ou menu (si une seule) ; liste → menu. (Retour accueil seulement après Confirmer.)
- **Anti-gel** : `.catch` → `retourAccueilV2()`. Ajouter `#boireV2Container` à la liste masquée par `retourAccueilV2()`.
- Branché dans `menuV2Click('boire')`.

## 🎁 Donner V2 — PLANIFIÉ (à coder)
Donner = **simple sortie d'inventaire**, aucun détail à saisir. (N'existait pas en V1 ; backend `actionBouteille` accepte « donner ».)
- Conteneur unique, titre **« Donner »**, nom + code-barres.
- **Choix bouteille** : plusieurs → liste (emplacement / « À ranger ») ; une seule → direct.
- **Écran de confirmation** : bouteille choisie affichée + bouton **Confirmer** (`.roundel`). Pas de plat, pas de verres, pas d'accords.
- **Confirmer** → `actionBouteille { row, action:'donner', bottle }` → données fraîches → toast **« Bouteille donnée »** → **retour accueil**.
- **✕** : formulaire → liste (si plusieurs) ou menu (si une seule) ; liste → menu.
- **Anti-gel** : `.catch` → `retourAccueilV2()`. Ajouter le conteneur Donner à la liste masquée.
- Branché dans `menuV2Click('donner')`.

### Plan de codage Boire + Donner (4 blocs, code commun mutualisé)
- **Bloc A — HTML** : les deux conteneurs (`#boireV2Container` + `#donnerV2Container`) dans `index-v2.html`.
- **Bloc B — CSS** : les 5 verres 🍷 + style d'appoint dans `styles-v2.css` (rien si l'existant suffit).
- **Bloc C — JS** : tout Boire + Donner avec helpers partagés (choix bouteille, écran confirm, données fraîches, retour accueil, anti-gel) dans `scripts-scanner-v2.js`.
- **Bloc D — branchements** : `menuV2Click('boire')` + `('donner')` et ajout des deux conteneurs dans `retourAccueilV2()`.

## 🔤 Renommage `.accord-item` → `.item-liste` — ✅ TERMINÉ
CSS (`styles-v2.css` : `.item-liste` + `.item-liste.actif`, items légèrement espacés) et JS (`scripts-fiche-v2.js` accords + sélecteur ; `scripts-scanner-v2.js` Arrivée meuble/rangée/espace + Déplacer meuble/rangée/espace + liste bouteilles) tous renommés. Aucun `accord-item` ne reste dans les fichiers V2.

## 🃏 Carte universelle `.carte` — ✅ TERMINÉ
`.carte-large` renommée **`.carte`**, restructurée en 3 zones flex + bande couleur en bas. Classes : `.carte` (conteneur cliquable, `cursor:pointer`), `.carte-photo` (vignette 60px, affichée seulement si photo), `.carte-centre` (`.carte-titre` + `.carte-sous`), `.carte-droite` (infos secondaires). Bande bas via `border-bottom` 3px : `.carte.note-1..5` (plats) et `.carte.vin-rouge/blanc/rose/bulles` (vin). Aucune bande = transparent.

JS adapté : `chargerPlatsV2` (plats → centre = nom du plat, droite = date, bande = note) et `trouverCeVinV2`/succursales (centre = nom + adresse/ville, droite = quantité + distance, pas de bande) dans `scripts-fiche-v2.js`. Plus aucun `carte-large` dans les fichiers V2.

Reste à venir : la carte **vin** (photo gauche + nom/pays·région/cépage + nb bouteilles + bande couleur) sera générée par la page CAVE À VIN V2, avec ces mêmes classes. Toutes les cartes seront cliquables (clic → fiche V2) une fois cette page codée.

## 🍇 Page CAVE À VIN V2 — PLANIFIÉ (à coder)
Page plein écran V2 (`.modal-v2-fullscreen`), inventaire complet. Réf. V1 : `chargerInventaire` / `afficherCartes` / `genererCardVin` ; vins **groupés par code-barres**. Cliquable → fiche V2.

**Carte de vin V2 (DÉCIDÉ) :**
- Photo en vignette à GAUCHE. Sans photo : cadre vide légèrement teinté, même gabarit.
- À droite : nom · pays•région · cépage · nombre de bouteilles.
- Bordure couleur du vin (`.vin-*`).
- Clic → `ouvrirFicheV2(codebarre, provenance)`.

**Apparence (DÉCIDÉ) :**
- Barre du haut épurée, 3 éléments : gauche = rond loupe (ouvre filtres) · centre = titre « Les vins de Bacchus » · droite = rond ✕ (ferme). Les deux ronds même style (`.btn-bascule` + `.gauche`/`.droite`).
- Panneau filtres (ouvert par la loupe) : 5 critères (couleur, cépage, pays, appellation, accords — interdépendants comme V1), ligne de séparation, champ recherche par nom, reset.
- Format d'ouverture : comme le menu burger (280px, fond sombre translucide, items espacés) mais **glisse de la GAUCHE**. Symétrique du burger.
- Liste de cartes `.carte` en dessous.

**Reste à décider :** tri (V1 = couleur puis nom). Données fraîches à l'ouverture.

## 🏠 Accueil V2 — ajustements PLANIFIÉS (à coder)
Accueil minimal : header (`#topNavV2`) avec 3 boutons `.bouton-navigation` (scan `gauche` / SAQ `centre` / burger ☰ `droite`) + `#accueilV2-titre` (DIONYSOS) + `#accueilV2-soustitre` (VIA VINOSTO).
- **Descendre « DIONYSOS »** : augmenter le `padding`/`margin` haut de `#accueilV2-titre`.
- **3 boutons header même hauteur** : harmoniser scan + SAQ + burger (le SAQ paraît trop gros). `.bouton-navigation` 50×50 ; images 45×45 ; burger ☰ texte 40px. Levier : hauteur commune aux trois.

### Menu burger V2 — PLANIFIÉ (à coder, pages une à une)
`toggleMenuV2` pas encore codé. **Mêmes 9 entrées qu'en V1, ouverture à DROITE.** Chaque entrée = page plein écran V2 (`.modal-v2-fullscreen`), bâtie une à une. Ordre V1 :
1. ACCUEIL · 2. CAVE À VIN (`chargerInventaire`) · 3. EMPLACEMENTS (`chargerEmplacements`) · 4. HISTORIQUE (`chargerHistorique`) · 5. LISTE D'ACHAT (`chargerListeRacheter`) · 6. RECHERCHE (`chargerPageRecherche`) · 7. À RANGER (`chargerListeARanger`) · 8. PROMOTIONS SAQ (`chargerPromotions`) · 9. 🔄 RAFRAÎCHIR (`refreshApp`).

Styles V1 (panneau latéral) à NE PAS réutiliser — refaire en V2.
**Apparence (DÉCIDÉ) :** panneau 280px, ouverture à droite, fond légèrement sombre translucide, chaque item = rectangle `.item-liste` légèrement espacés.

## 🩹 Corrections d'apparence EN ATTENTE
1. **Spinner** : voile translucide (pas opaque) sur l'écran réellement affiché. ✅ FAIT (voile passé à `--voile-standard`).
2. **`.roundel-anneau`** : cercle parfait, jamais ovale.
3. **`.roundel-barre`** : centrée H et V dans l'anneau ; largeur fixe calée sur « Pigeonnier » (la barre dépasse un peu l'anneau de chaque côté) ; tous les items même largeur, même les chiffres à 1 caractère.
4. **`.menu-liste`** : largeur fixe (= « Pigeonnier »), centrée sous le roundel ; fond sombre + lignes séparatrices ; s'ouvre SOUS le roundel, jamais par-dessus l'anneau.
5. **Menu d'action — icône `+` (Arrivée)** : blanc, pas gris.
6. **Menu d'action — icône Déplacer** : ⇄ en blanc. ✅ FAIT (C3).
7. **`.btn-fermer` (les ✕)** : style de `.btn-bascule` (rond, bordure or, fond sombre), rapproché du bord.
8. **Fiche vin — `.btn-bascule` non sélectionnés** : ✓ / ✗ en gris sur fond noir (état actif inchangé).
9. **Page Arrivée — titre** : « Faites un choix » → « Ajouter » (uniquement la page Arrivée, pas le titre du menu d'action).
10. **Menu d'action — nom non décodé** : appliquer `decodeHTML` au nom dans `ouvrirMenuActionV2` (et vérifier Arrivée / Déplacer / Boire / Donner).

## ⚠️ À FAIRE (file)
- **Bugs** : A1 `creerVinManuelV2` ✅ FAIT · A2 spinner ✅ FAIT · A3 nom non décodé menu d'action (= correction 10).
- **Renommage `.accord-item` → `.item-liste`** : ✅ FAIT.
- **Carte universelle `.carte`** : ✅ FAIT.
- **Classe `.cercle` générique** : ✅ FAIT. Une seule classe `.cercle` (rond, bordure or, fond sombre, centré, `--taille-tactile` par défaut) + `.cercle.actif` (fond or) + `.cercle.desactive` (grisé, non cliquable) dans `styles-v2.css`. Remplace `.btn-bascule` (supprimée ; 3 boutons fiche Racheter/✗/Panier passés à `.cercle`) et `.menu-v2-circle` (supprimée ; 6 cercles du menu d'action passés à `.cercle`, taille 90px via `.menu-v2-grid .cercle`). Accolade manquante de `.roundel` corrigée au passage. Icône Déplacer passée à ⇄ (correction d'apparence #6 faite). L'anneau du `.roundel` n'a PAS été fusionné (structure anneau+barre distincte conservée).
- **Corrections d'apparence** restantes (2 à 9).
- **Boire + Donner** (4 blocs).
- **Menu action scan** : distinguer B1/B2 (griser Déplacer/Boire/Donner si 0 bouteille).
- **CRAYON — modifier les infos** (fiche). Backend prêt (`saveWineEdits`, `updateWineField`). Page d'édition plein écran V2, champs `.champ-saisie`.
- **Menu burger V2** + **Page CAVE À VIN V2**.
- **Accueil V2** : descendre DIONYSOS, 3 boutons même hauteur.

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
