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
Socle (`:root`, reset, fond, responsive) · `.toast` · `#topNavV2` + `.bouton-navigation` + `.gauche/.centre/.droite` · titres accueil · spinner · Modales V2 · génériques (`.btn-fermer`, `.titre-1/2/3`, `.texte-secondaire`, `.contenu`, `.section`…) · `.vin-*` · `.photo` · `.carte-info`/`.carte`/`.note-1..5` · `.controle`, `.deux-colonnes`, `.champ-cliquable`, `.champ-saisie`, `.menu-liste`, `.item-liste` · `.roundel*` · scan V2 · utilitaires. **Aucun style V1.**

## 📂 Fichiers
**V1 (figé)** : index.html · styles.css · scripts-config.js · scripts-init.js · scripts-inventaire.js · scripts-fiche.js · scripts-scanner.js · scripts-listes.js
**V2 (en construction)** : index-v2.html · styles-v2.css · scripts-socle-v2.js · scripts-scanner-v2.js (scan + menu + saisie manuelle + vin inconnu + Arrivée + Déplacer + Boire + Donner + Cave + filtres) · scripts-fiche-v2.js
**Backend** : Code.gs
**Sheets** : Vino · Historique · config/CONFIG · Vins scannés (non utilisé)

## 🎯 Scan V2 (`scripts-scanner-v2.js`)
**Flux** : `startScanFromHomeV2` → `startScannerV2` (Quagga sur `#interactiveV2`, seuil 3, feedback `#scanV2-feedback`) → `traiterResultatScanV2(code)` → `checkWineExists`.
- **Vin existe** → `ouvrirMenuActionV2` : 6 cercles 👁 Visualiser · ➕ Arrivée · ⇄ Déplacer · 🍷 Boire · 🎁 Donner · ✕. Contexte `menuActionV2Context`.
- **Rescanner** / **Entrée manuelle** (`validerSaisieManuelleV2` ≥ 8 chiffres).

### Arbre des résultats d'un scan (RÉFÉRENCE)
- **A — Lecture** : A1 caméra indispo → entrée manuelle ; A2 rien lu → boutons toujours visibles ; A3 non-produit → ignorer ; A4 douteux → seuil 3 ; A5 sans code → manuel. **Checksum GTIN** ✅ (`gtinValide` ×3/×1, longueurs 8/12/13). Entrée manuelle sans checksum (volontaire). Torche écartée, Quagga conservé.
- **B — Vin existe** : B1 stock > 0 → menu complet ; B2 0 bouteille → Déplacer/Boire/Donner grisés (`.desactive`), seules Visualiser + Arrivée actives. ✅ FAIT.
- **C — Vin absent** ✅ : recherche SAQ auto. C1 trouvé → `creerVinSAQV2` → menu. C2 introuvable → page « Vin inconnu » (code-barres + nom) → `creerVinManuelV2` → menu.
- **D — Erreur** → message, réessayer.

### ➕ Arrivée V2 — ✅ TERMINÉ
Page plein écran, nom + code-barres, 4 roundels : Meuble · Rangée · Espace · À ranger. Cascade ne propose que le libre (`espacesOccupesArrivee`, `rangeeALibre`, `meubleALibre`), triée. Vérif réelle (`checkLocationAvailable`) avant ajout ; refus → message + rechargement + cascade rafraîchie. Max 5 bloqué à l'ouverture. À ranger toujours possible. Conforme données fraîches.

### ⇄ Déplacer V2 — ✅ TERMINÉ
Page `#deplacerV2Container`. `ouvrirDeplacerV2` → recharge `ALL_DATA` → `construireDeplacerV2`. 1 bouteille → direct ; plusieurs → liste (`choisirBouteilleDeplacer`). Destination = cascade Arrivée (helpers partagés), sans « À ranger ». Vérif réelle, occupé → message + rechargement. Conforme données fraîches. var `deplacerV2Choix`.

## 🛡️ Anti-gel V2 (RÈGLE)
1. **Spinner** : `appelBackend` le cache toujours via `finally` (jamais bloqué).
2. **`retourAccueilV2()`** masque tous les conteneurs V2, remet `menuActionV2Context = null`, affiche « Un problème est survenu, veuillez recommencer ». Branchée dans le `.catch` de tout écrivain. **Tout nouvel écrivain doit suivre la même règle.**

## 📄 Fiche V2 (`scripts-fiche-v2.js`) — consultation + champs éditables
`ouvrirFicheV2(codebarre, provenance)` mémorise `FICHE_V2_PROVENANCE`. Panneau `#ficheV2Overlay`, bordure couleur du vin (`.vin-*`).
**Blocs** : Information (Cépages, Pastille, Classification, Désignation, Particularité) · Description+Prix (bloc séparé, sans libellé, sous Information) · Dégustation (Arômes + 7 cartes) · Production · Notes (Accords → `Accords` ; Racheter ✓/✗ → `Racheter` et Sur-inventaire → `Panier`, en DEUX COLONNES `.deux-colonnes`/`.colonne-controle`/`.colonne-ronds` ; Recettes/Notes/Divers) · Historique des plats (bloc séparé sans titre, trié 5→1, vide=invisible) · Inventaire (lecture seule) · Photo cliquable · « Où trouver ce vin » (`.roundel`, géoloc) · Prix auto.
Note `.roundel` : `flex:none` pour que la boîte garde ses 80px (l'anneau ne déborde plus, pas de chevauchement quand une liste rapproche les roundels).
Dépend du socle : `decodeHTML`, `appelBackend`, `afficherMessage`, `CONFIG`, `ALL_HISTORIQUE`, `CURRENT_WINE_*`.

## 🍷 Boire V2 — ✅ TERMINÉ
## 🎁 Donner V2 — ✅ TERMINÉ
Conteneurs `#boireV2Container` / `#donnerV2Container` (HTML), verres 🍷 (CSS `.boire-verres`/`.boire-verre`/`.allume`/`.desactive`), JS commun dans `scripts-scanner-v2.js`. Conformes données fraîches. Boire : plat facultatif, verres grisés tant que pas de plat, obligatoires si plat ; ACCORDS = champ cliquable + menu déroulant (comme la fiche) qui part des accords du vin, enregistrés au Confirmer. Donner : sortie simple, écran de confirmation.

## 🃏 Carte universelle `.carte` — ✅ TERMINÉ
`.carte` = 3 zones flex + bande couleur en bas. `.carte` (conteneur cliquable), `.carte-photo` (vignette 60px, photo cadrée par la hauteur), `.carte-centre` (`.carte-titre` + `.carte-sous`), `.carte-droite` (infos secondaires). Bande bas `border-bottom` 3px : `.carte.note-1..5` (plats) et `.carte.vin-rouge/blanc/rose/bulles` (vin). `.carte.carte-vide` = voile 0 bouteille. Fond transparent.

## 🍇 Page CAVE À VIN V2 — ✅ TERMINÉ
Conteneur `#caveV2Container`. Loupe `.cercle.gauche` / titre / `.btn-fermer`. Panneau filtres `.panneau-gauche` glissant + voile `.panneau-voile` (transparent mais cliquable pour fermer). Filtres en CASCADE (couleur → cépage → pays → appellation → accords) via champs cliquables + menus `.item-liste`. Cartes `.carte` (clic → `ouvrirFicheV2(cb,'cave')`), voile sur carte si 0 bouteille. `fermerFicheV2` revient à la cave si provenance `'cave'`.

## 🏠 Accueil V2 — ✅ TERMINÉ
`#accueilV2-titre` padding haut `25vh`. `.bouton-navigation` 40×40 (scan/SAQ/burger même gabarit).

### Menu burger V2 — ✅ TERMINÉ (structure + branchements)
Panneau `#burgerV2` `.panneau-droite` + voile `#burgerV2-voile`. 9 entrées `.item-liste`. `toggleMenuV2` + `fermerMenuBurgerV2` + `burgerV2Click(cible)`. Actifs : ACCUEIL, CAVE À VIN (`ouvrirCaveV2`), RAFRAÎCHIR. Les autres pages → toast « À venir » tant que pas bâties.

## 🎯 DÉCISIONS look V2 unifié — ✅ TOUTES EXÉCUTÉES (NE PAS REDÉCIDER)

### Règle d'or
- Une liste est une liste : largeur, fond, espacement, comportement IDENTIQUES partout.
- Un espace est un espace : l'écart entre items est le même sur tous les écrans.
- Aucune valeur en dur : toujours les variables CSS (ex. 14px = var(--fs-base)).

1. **Largeur des listes** : toute `.menu-liste` = 80 % de largeur, centrée (`width:80%; margin:0 auto`).
2. **Espace entre items — une seule source** : l'écart vient UNIQUEMENT du `margin-bottom` de `.item-liste`. `gap` flex des panneaux neutralisé (`.panneau-droite .item-liste { margin-bottom:0 }`, panneaux en `gap:var(--space-s)`).
3. **Panneaux sans fond** : `.panneau-gauche` et `.panneau-droite` fond transparent, seul `backdrop-filter:blur` conservé. Voile `.panneau-voile` transparent mais cliquable.
4. **Champs éditables = style liste** : `.champ-cliquable` ET `.champ-saisie` au style `.item-liste` (fond `--white-05` + fine bordure). Texte `var(--fs-base)`. `.champ-saisie` aligné à gauche, hauteur adaptable (plus de 50px fixe).
5. **Voile 0 bouteille — sur la CARTE** : `.fiche-vide` retiré (JS + CSS). À la place, `.carte.carte-vide` (opacity 0.45) quand `g.count === 0` dans `afficherCartesCaveV2`.
6. **Filtres cave — cascade** : `remplirFiltresCaveV2` ne propose, pour chaque filtre, que les valeurs des vins passant déjà les autres filtres. ✅ FAIT.
7. **Photo de carte — cadrage hauteur** : `.carte-photo img` hauteur 60px, largeur auto, `object-fit:contain`.
8. **Bouton ENREGISTRER (Modifier)** : espace sous le dernier champ via `#editFicheV2-corps { padding-bottom }` (ID seul, rien ne bouge ailleurs). Roundel inchangé.
9. **Boire — ACCORDS = champ** : roundel remplacé par champ cliquable + menu déroulant (`toggleAccordBoireV2`, `majAccordsDisplayBoireV2`). ✅ FAIT.
10. **Filtre cave — pas de premier item libellé** : la liste ne montre QUE les vraies valeurs, aucun « Tous ». Réinitialisation via le bouton Réinitialiser. ✅ FAIT.

---

## 📍 Page EMPLACEMENTS V2 — À BÂTIR (plan décidé, NE PAS REDÉCIDER)
Base = page Cave V2, titre « Emplacements », look légèrement retouché.
- **Panneau filtres (gauche)** : 3 filtres en cascade Meuble → Rangée → Espace. Bouton « Vins en double » TOUJOURS visible. Boutons « Cépages doubles » et « Cépages manquants » visibles SEULEMENT si un meuble est sélectionné. Toucher un de ces 3 boutons FERME le panneau et affiche la liste. La loupe suit `.cercle`/`.actif` : sombre si aucun filtre, OR si filtre/bouton actif.
- **Corps par défaut** : bouteilles groupées MEUBLE → RANGÉE → cartes. En-tête de meuble DISCRET et COLLANT (sticky), change au meuble suivant, pas de gros titre. Séparateur « RANGÉE X » conservé. Carte = style Cave, emplacement (C-3-2) à droite.
- **3 listes** : « Vins en double » = même code-barres en 2+ bouteilles (tous meubles si aucun meuble ; sinon dans le meuble). « Cépages doubles » = cépage dominant sur 2+ vins du meuble. « Cépages manquants » = cépage présent dans d'AUTRES meubles, absent du meuble choisi. Calcul pour TOUS les meubles (pas seulement Cellier/Pigeonnier comme V1). Présentation = cartes `.carte` style succursales (nom blanc dominant, emplacements/nombre discrets). AMÉLIORATION vs V1 : chaque vin UNE SEULE FOIS, emplacements REGROUPÉS (ex. « C-3-2, C-4-1, P-2-5 »), sur les 3 listes. Listes de cépages groupées par cépage, tête de groupe = titre doré discret (`.titre-3`).
- **Interactions cartes** : toute la surface cliquable → ouvre DÉPLACER normal (choix de bouteille si plusieurs). Retour Déplacer → liste RAFRAÎCHIE.
- **Fermeture** : loupe rouvre les filtres, X quitte la page.

## 📜 Page HISTORIQUE V2 — À BÂTIR (plan décidé, NE PAS REDÉCIDER)
But premier : aide à la décision repas — bons accords pour un type de mets, écarter les mauvais. Stats secondaires. V1 jugée faible : on repense.
- **Panneau filtres (gauche)** : 3 portes d'entrée — Mets (plat précis) · Vin · Accord (catégorie, ex. « de l'asiatique »).
- **Corps** : regroupé PAR VIN. Tête de chaque vin = vraie CARTE DE VIN style succursales (nom blanc dominant), CLIQUABLE → FICHE du vin. PAS de titre doré (jugé peu lisible et trop présent). Sous le vin : ses cartes de mets comme dans la fiche (plat + date, bande couleur selon note, triées 5→1).
- **Correction d'entrée (manque criant V1)** : carte de mets CLIQUABLE → éditeur pour corriger la NOTE (1-5 coupes) ET le TEXTE du plat, sauvegardé dans l'Historique. PAS de suppression. À VÉRIFIER avant de coder : backend d'ÉCRITURE/correction d'une ligne d'historique (V1 a `getHistorique` en lecture seule ; identifier la ligne + fonction de mise à jour).
- **À valider visuellement** : distinction nette zone « carte de vin » (→ fiche) vs « cartes de mets » (→ éditeur).

## 🛒 Page LISTE D'ACHAT V2 — À BÂTIR (plan décidé, NE PAS REDÉCIDER)
Même logique qu'en V1 (`afficherListeRacheter`), look V2. Base = Cave V2.
- **Contenu (auto)** : un vin apparaît si (`Racheter`=Oui ET 0 bouteille en stock) OU (`Panier`=Oui). Groupé par code-barres, tri couleur puis nom.
- **Panneau filtres (gauche)** : Couleur · Pays · Cépage en cascade + sélecteur de SUCCURSALE (avec ajout possible, `getSuccursales`/`ajouterSuccursale`).
- **Corps** : cartes de vin V2. Si une succursale est choisie, chaque carte affiche la dispo + quantité à cette succursale (`getSuccursalesDisponibles` ou `verifierDispoSAQ_GRAPHQL_V1`). Carte cliquable → FICHE du vin.

## 📦 Page À RANGER V2 — À BÂTIR (plan décidé, NE PAS REDÉCIDER)
Même logique qu'en V1 (`afficherListeARanger`), look V2. Base = Cave V2, SANS filtres.
- **Contenu** : bouteilles actives (statut ≠ Bu/Sorti) SANS emplacement. Groupées par code-barres, tri couleur puis nom. Si vide : « Tout est bien rangé! ».
- **Look & interaction** : cartes de vin V2. Carte cliquable → DÉPLACER (assigner une place ; c'est un déplacement, pas un ajout). Retour → liste rafraîchie.

## 🎬 Bouton ACTION dans la FICHE V2 — À BÂTIR (décidé, NE PAS REDÉCIDER)
Dans la fiche vin, APRÈS le roundel « OÙ LE TROUVER », ajouter un roundel « ACTION » qui ouvre le MENU D'ACTION du vin courant (Visualiser/Arrivée/Déplacer/Boire/Donner) — PAS le scanner caméra. Technique : appeler `checkWineExists` sur le code-barres courant pour bâtir `menuActionV2Context` AVANT d'ouvrir `ouvrirMenuActionV2`.

---

## 🩹 Corrections d'apparence — ✅ TOUTES FAITES
1. Spinner : voile `--voile-standard`. ✅
2. `.roundel-anneau` : `aspect-ratio: 1/1` (cercle parfait). ✅
3. `.roundel-barre` : largeur auto `max-content`, dépasse l'anneau (look métro). ✅
4. `.menu-liste` : 80 % centrée. ✅
5. Icône `+` (Arrivée) : `+` blanc. ✅
6. Icône Déplacer : ⇄. ✅
7. `.btn-fermer` : rond (bordure or, fond sombre, `--taille-tactile`). ✅
8. Boutons fiche non sélectionnés : gris. ✅
9. Titre page Arrivée : « Ajouter ». ✅
10. Nom décodé (`decodeHTML`) dans menu d'action + Arrivée + Déplacer. ✅

## ✏️ CRAYON — édition fiche V2 — ✅ TERMINÉ
Crayon `.cercle.gauche` (✎) → `ouvrirEditFicheV2`. Overlay `#editFicheV2Overlay`, corps `#editFicheV2-corps` rempli depuis `EDIT_FICHE_V2_CHAMPS` (26 champs `.champ-saisie`). `sauverEditFicheV2` → `saveWineEdits`. Note : `saveWineEdits` n'inclut pas Accords/Racheter/Panier (gérés en direct ailleurs).

## 🐞 En suspens
- **Vue emplacements V1 instable** : un même filtre renvoie parfois une bouteille de moins (cache backend ou formules volatiles du Sheet). Impacte la cascade Arrivée, d'où la vérif réelle finale.
- **Extraire la Cave** dans `scripts-cave-v2.js` (sortir le fourre-tout de `scripts-scanner-v2.js`) — à faire un jour.

## 📇 Champs d'un vin (référence)
Code-barres (CUP), Code SAQ, Nom, Prix, Couleur, Cépages, Pays, Région, Appellation, Désignation, Classification, Format, Alcool, Sucre, Particularité, Producteur, Agent promo, Millésime dégusté, Arômes, Acidité, Sucrosité, Corps, Bouche, Température, Description, Aimé (`Racheter`), Accords, Recettes, Notes temporaires, Divers, Pastille gout, Photo URL (col. index 33), Panier.

## 🔑 Backend — fonctions clés (référence)
- `getConfig` → CONFIG (dont `CONFIG.meubles[meuble][rangée]`, `CONFIG.accords`)
- `getInventoryData` → tout l'inventaire (→ `ALL_DATA`)
- `checkWineExists` { codebarre } → { exists, count, wine, bottles }
- `checkLocationAvailable` { meuble, rangee, espace } → { available, message }
- `addBottle` { codebarre, meuble, rangee, espace } (vides = à ranger ; max 5)
- `actionBouteille` { row, action, bottle, plat, bonAccord } (boire/donner/deplacer…)
- `ajouterVinAvecBouteilles`, `updateWineField`, `saveWineEdits`, `getSuccursalesDisponibles`, `getSuccursales`, `ajouterSuccursale`, `verifierDispoSAQ_GRAPHQL_V1`, `getHistorique`, `chercherProduitSAQ_GRAPHQL_V1`, `verifierEtMettreAJourPrixSAQ`, `testScrapingSAQ`

## 🐛 Pièges à surveiller
- Libellés fiche V2 : « À racheter » = `Racheter` ; « Sur-inventaire » = `Panier`. Incohérence backend « Racheter » (front) vs « Aimé »/AIME (back).
- Casse CSS sensible : `.roundel` futur `.bouton-londres` tout minuscule.
- Transvasement V1→V2 : guetter les `... is not defined`. Porté au socle : `decodeHTML`. `afficherConfirmation` non repris (dépend de classes V1) — refaire en V2 si besoin.
- Astuce Notepad++ : les blocs « Trouve ceci » multi-lignes se cherchent par un repère court et unique ; toujours modifier dans `styles-v2.css` (V2), jamais `styles.css` (V1).
