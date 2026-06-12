# 🍷 Dionysos — État du projet (consolidé, à jour au 11 juin 2026)

> Les RÈGLES DE TRAVAIL sont dans `REFERENCE.md` (à lire en premier). Ce fichier-ci ne contient que l'état technique du projet. Seuls deux `.md` existent : `REFERENCE.md` et celui-ci.

## 📁 Architecture
- **Frontend** : GitHub Pages (dépôt `ngjcpvino/dionysos`)
- **Backend** : Google Apps Script — projet « Vino 3.0 » — `Code.gs` (un seul backend, partagé V1/V2)
- **Base** : Google Sheets (ID `1Y4OCwcb2XBTPDTl_KDUGHgEiXgwqqXHmWSw6XQVSe3g`)

## 🏗️ Stratégie V2 — deux sites parallèles (DÉCIDÉ)
On bâtit le V2 comme **un site complet et autonome, côte à côte avec le V1**.

**Site V1 (actuel, figé)** : `index.html`, `styles.css`, tous les `scripts-*.js` V1. On n'y touche plus. **Nettoyé** : plus aucune trace de V2 dans `index.html` ; les fichiers `scripts-*-V2.js` (V majuscule) n'existent plus dans le dépôt.

**Site V2 (parallèle, en construction)** : `index-v2.html`, `styles-v2.css`, `scripts-socle-v2.js` + modules `-v2.js`. `index-v2.html` charge **uniquement** ses propres fichiers.

**Socle dupliqué (temporaire).** `scripts-socle-v2.js` recopie : `API_URL`, `appelBackend` + spinner, variables globales (`CONFIG`, `ALL_DATA`, `ALL_HISTORIQUE`, `CURRENT_WINE_*`, `FICHE_V2_PROVENANCE`, `FICHE_V2_ORIGINE`), `afficherMessage`, `decodeHTML`, `ouvrirApresTap`, `remonterScrollV2`, `window.onload` propre. `styles-v2.css` recopie `:root` + le fond.

**Ménage final = renommage, pas de tri.** Quand V2 complet : supprimer tous les fichiers V1 d'un bloc, renommer `index-v2.html` → `index.html`, `styles-v2.css` → `styles.css`.

## 🎨 Système de design
**Règle d'or** : « un chat est un chat ». Une valeur = un seul endroit (`:root`), nommée en français lisible (par sa **valeur**, ex. `--ls-9`, pas par son usage), réutilisée partout. Avant de créer une classe, vérifier si elle existe. Jamais de style en dur dans le JS ni de valeur magique dans une règle. **Réutiliser au maximum l'existant** (`.roundel`, `.champ-saisie`, `.menu-liste`/`.item-liste`, `.controle`, `.titre-1`, `.titre-action`) avant de créer du neuf.

**Principe V2 — cohérence visuelle (directeur).** Tout le V2 est **pleine page, même fond que la fiche vin**, page ou modale. Chaque écran V2 = conteneur dédié (`.modal-v2-fullscreen` + `.modal-v2-content`). **Titres BLANCS, jamais en or.**

**Gabarit commun des pages VIN (DÉCIDÉ, appliqué partout y compris menu d'action).** ✕ en haut à droite ; NOM du vin en capitales (`#...-nom` en `.titre-1`) ; origine Pays • Région • Appellation dessous (`#...-origine` en `.texte-secondaire`) ; action en titre BLANC PLEIN (`.titre-action` : Ajouter/Déplacer/Boire/Donner/Corriger/Choisir un vin). Boire/Donner/Arrivée/Déplacer passent par `rendreEnteteActionV2(prefixe)`. Le MENU D'ACTION suit le même gabarit (nom + origine, plus de « Faites un choix » ni de code-barres). Classes mortes supprimées : `.modal-v2-title`, `.modal-v2-winename`, `.modal-v2-codebarre`, `.menu-v2-grid`.

## 🧠 Données — LECTURE MÉMOIRE / ÉCRITURE FRAÎCHE (DÉCIDÉ 9 juin 2026, remplace l'ancienne règle)
App à **2 utilisateurs sur 2 téléphones** ; la vérité partagée = le Sheet. ~100 vins : la consultation doit être instantanée.

- **CONSULTATION = mémoire seulement.** Toutes les pages (Cave, À ranger, Emplacements, Historique, Liste d'achat, fiche, pages vin, menu d'action) s'affichent depuis `ALL_DATA`/`ALL_HISTORIQUE`, AUCUN appel au Sheet pour lire.
- **ÉCRITURE = Sheet, puis resynchroniser AVANT de rendre la main.** Soit `getInventoryData` → `ALL_DATA` (Arrivée, Boire, Donner, Déplacer), soit mise à jour locale via `majMemoireVinV2` (Racheter, Panier, Accords, édition fiche, photo).
- **Exceptions fraîches conservées (décidées)** : `checkWineExists` au moment du SCAN (sécurité 2 utilisateurs) ; `checkLocationAvailable` au choix d'un espace (Arrivée/Déplacer, resync si occupé) ; bouton RAFRAÎCHIR du burger (`getInventoryData` + vide `ALL_HISTORIQUE`).
- **`ALL_HISTORIQUE` en chargement paresseux** : chargé une fois à la première ouverture (Historique ou plats de la fiche), puis mémoire. Invalidé (`= []`) après Boire et par Rafraîchir → rechargé frais à la prochaine ouverture. Correction et ajout manuel resynchronisent directement.
- **`getInventoryData` (backend) renvoie TOUS les champs du vin** (incl. Prix, Désignation, Format, Alcool, Sucre, Millésime, Température, Description, Recettes, Notes temporaires, Panier — ajoutés le 9 juin 2026 dans les DEUX blocs, vins actifs et 0 bouteille) pour que la fiche se bâtisse en mémoire.

**Utilitaires mémoire (`scripts-fiche-v2.js` / `scripts-scanner-v2.js`)** :
- `ficheDepuisMemoireV2(cb)` → `{wine, bottles}` pour la fiche (secours `getWineBottles` si absent de la mémoire). Fournit aussi les clés `Designation`/`Temperature`/`Cepage` (sans accent) que la fiche et l'édition consomment.
- `wineResultDepuisMemoireV2(cb)` → équivalent `checkWineExists` depuis `ALL_DATA` (avec `row` dans chaque bouteille). Utilisé par Déplacer depuis listes et le bouton ACTION de la fiche.
- `majMemoireVinV2(cb, champs)` → met à jour les items `ALL_DATA` d'un vin après une écriture directe.

## 🛡️ Anti-gel V2 (RÈGLE)
`appelBackend` : **timeout 30 s par défaut, ajustable par appel** (`options.timeout` — utilisé par Promotions : 120 s et 300 s) via `AbortController` → erreur « Le serveur ne répond pas », spinner toujours retiré (`finally`). `retourAccueilV2()` = `cacherToutesPagesV2()` + `menuActionV2Context=null` + message. Branchée dans le `.catch` de tout écrivain.

**Toast réparé (11 juin 2026).** `afficherMessage` (socle V2) posait `display:none` en ligne après le premier toast et ne le retirait jamais — tous les messages suivants étaient invisibles. Corrigé : `t.style.display = ''` remis avant chaque affichage. Ne jamais réintroduire un `display:none` en ligne sans le retirer à l'affichage suivant.

## 🧭 Navigation V2 (RÈGLES, 9 juin 2026)
- **`cacherToutesPagesV2()`** (dans `scripts-scanner-v2.js`) cache TOUS les conteneurs/overlays V2 + ferme le burger. Liste complète maintenue à jour à chaque nouvel écran (incl. `photoV2Overlay` depuis le 11 juin 2026).
- **Burger** : chaque cible fait `cacherToutesPagesV2()` puis ouvre sa page ; 'accueil' = tout cacher + contexte null ; RAFRAÎCHIR = resync `ALL_DATA` + vide `ALL_HISTORIQUE`.
- **Menu d'action (`menuV2Click`)** : chaque bouton fait `cacherToutesPagesV2()` avant d'ouvrir (sinon une liste restée ouverte dessous repassait par-dessus la page d'action). La garde « 0 bouteille » est vérifiée AVANT tout.
- **Œil grisé** : `#menuV2-visualiser` reçoit `.desactive` quand on arrive de la fiche (`FICHE_V2_ORIGINE` défini). `traiterResultatScanV2` remet `FICHE_V2_ORIGINE = null` (un scan neuf rallume l'œil).
- **Après confirmation Boire / Donner / Arrivée → retour à l'ACCUEIL** (décidé). Déplacer garde son retour (`'aranger'`/`'emplacements'`/menu) — utile pour ranger en série.
- **✕ des pages vin** : Boire/Donner/Arrivée rouvrent le menu d'action (seul chemin d'accès) ; Déplacer honore `menuActionV2Context.retour`.
- **Démarrage** : le spinner du `window.onload` couvre `getConfig` ET `getInventoryData` — l'app n'est utilisable qu'une fois la mémoire complète (plus jamais de Cave à 0).
- **Scroll en haut (11 juin 2026, RÈGLE)** : toute page rouverte revient EN HAUT. `remonterScrollV2(containerId)` (socle) remet `scrollTop = 0` du `.modal-v2-content` ; appelée dans chaque `ouvrir...V2` (Cave, À ranger, Achat, Emplacements, Historique, Promo, Recherche), dans `ouvrirFicheV2`, `ouvrirEditFicheV2`, et sur les réouvertures directes de `fermerFicheV2`. Toute NOUVELLE page doit l'appeler aussi.

**Z-index des overlays empilés (RÈGLE).** Tous les écrans V2 partagent `z-index:9999`. Un overlay ouvert PAR-DESSUS un autre reçoit un z-index supérieur : `#menuActionV2Overlay`, `#histoEditV2Overlay` et `#photoV2Overlay` = `10010` ; loupes fixes et `.btn-fermer` = `10002` ; spinner/toast = `99999`.

**Ouverture d'overlay différée — anti « double-clic » (RÈGLE).** Tout passage « masquer un overlay puis en ouvrir un autre » ouvre via `ouvrirApresTap(fn)` (`setTimeout 0`, dans `scripts-socle-v2.js`). Appliqué : `menuV2Click`, `ouvrirActionDepuisFicheV2`, `deplacerDepuisARangerV2/EmpV2`, cartes → fiche, cartes mets → éditeur.

**Loupe/X collés au défilement (RÈGLE).** `.modal-v2-content` défile, donc loupe et ✕ sont `position:fixed`. `.gauche` reste `absolute` (accueil + crayon fiche).

**Fond stable (RÈGLE iOS).** `.modal-v2-fullscreen` est en `width:100%; height:100%` — JAMAIS `100vh` : sur iPhone/iPad, `100vh` inclut la barre Safari repliée, l'image « cover » se recadre et le fond paraît se tasser entre l'accueil et les pages. Le fond de chaque page reste OPAQUE (rideau qui masque la page en dessous) — ne jamais le rendre transparent.

**Anti-cache iPhone (RÈGLE).** `index-v2.html` charge `styles-v2.css` et les 3 JS par `document.write` avec `?v=` + heure courante (`Math.floor(Date.now()/3600000)`) : les fichiers se rechargent seuls au plus tard une heure après une publication, sans rien modifier à la main.

## 📂 Fichiers
**V1 (figé, pur V1)** : index.html · styles.css · scripts-config.js · scripts-init.js · scripts-inventaire.js · scripts-fiche.js · scripts-scanner.js · scripts-listes.js
**V2 (en construction)** : index-v2.html · styles-v2.css · scripts-socle-v2.js · scripts-scanner-v2.js (scan + menu + saisie manuelle + vin inconnu + Arrivée + Déplacer + Boire + Donner + Cave + filtres + À ranger + Liste d'achat + Emplacements + Historique + navigation) · scripts-fiche-v2.js
**Backend** : Code.gs (commentaire de structure corrigé ; ligne morte `addBottle` retirée — 9 juin 2026 ; `majPhotoSAQ` + photo dans `saveWineEdits` — 11 juin 2026)
**Sheets** : Vino · Historique · config/CONFIG · Vins scannés (non utilisé)
**Docs** : REFERENCE.md (règles) · ce fichier (état). Les anciens audits et fichiers de décisions sont fusionnés ici et supprimés.

## 🎯 Scan V2 (`scripts-scanner-v2.js`)
**Flux** : `startScanFromHomeV2` → `startScannerV2` (Quagga sur `#interactiveV2`, seuil 3) → `traiterResultatScanV2(code)` → `checkWineExists` (exception fraîche).
- **Vin existe** → `ouvrirMenuActionV2` (gabarit commun) : 6 cercles 👁 Visualiser · ➕ Arrivée · ⇄ Déplacer · 🍷 Boire · 🎁 Donner · ✕. Contexte `menuActionV2Context`.
- **Rescanner** / **Entrée manuelle** (`validerSaisieManuelleV2` ≥ 8 chiffres).

### Arbre des résultats d'un scan (RÉFÉRENCE)
- **A — Lecture** : caméra indispo → manuel ; rien lu → boutons visibles ; douteux → seuil 3 ; checksum GTIN ✅. Quagga conservé.
- **B — Vin existe** : stock > 0 → menu complet ; 0 bouteille → Déplacer/Boire/Donner grisés. ✅
- **C — Vin absent** ✅ (refait le 11 juin 2026) : recherche SAQ auto. Trouvé → `creerVinSAQV2` → menu. Introuvable → page « Vin inconnu » : champ code-barres (modifiable), champ **Code SAQ**, champ Nom, roundel **Voir SAQ** (`voirSAQVinInconnuV2` : saq.com avec le code-barres rallongé à 14 chiffres). **Confirmer (`creerVinManuelV2`) lit le code-barres TEL QUE CORRIGÉ (validé GTIN)** : Code SAQ rempli → `creerVinSAQV2` ; sinon relance `chercherProduitSAQ_GRAPHQL_V1` avec le code corrigé ; trouvé → création SAQ ; introuvable + nom rempli → `creerVinNomV2` (manuel) ; introuvable sans nom → message, la page reste ouverte. Cas couvert : CUP de la bouteille ≠ CUP en fiche SAQ (ex. 635335961957 vs 00635335596197). `ajouterVinAvecBouteilles` rattache le nouveau code-barres à la liste CUP du vin existant quand le code SAQ existe déjà (2 codes-barres par millésime).
- **D — Erreur** → message + `retourAccueilV2`.

### ➕ Arrivée V2 — ✅ TERMINÉ
S'ouvre depuis la mémoire. Cascade ne propose que le libre, vérif réelle (`checkLocationAvailable`) avant ajout. Max 5 : blocage cascade ET le front lit `res.success` — refus backend = message affiché, page Arrivée reste ouverte. Écrit puis resync `ALL_DATA` (2 appels), puis ACCUEIL.

### ⇄ Déplacer V2 — ✅ TERMINÉ
S'ouvre depuis la mémoire. 1 bouteille → direct ; plusieurs → liste (`row` de la bouteille, repli sur `wineResult.row` quand le contexte vient du scan). Vérif réelle. `fermerDeplacerV2` revient selon `menuActionV2Context.retour`.

## 📄 Fiche V2 (`scripts-fiche-v2.js`)
`ouvrirFicheV2(codebarre, provenance)` : bâtie depuis `ficheDepuisMemoireV2` (instantanée), secours backend. Plats depuis `ALL_HISTORIQUE` (paresseux). Panneau `#ficheV2Overlay`, bordure couleur du vin. La carte Température s'affiche SANS le « De » de tête (`replace(/^De\s+/i, '')`).
**Blocs** : Information · Description+Prix · Dégustation · Production · Notes (Accords ; Racheter ✓/✗ ; Sur-inventaire `Panier` ; Recettes/Notes/Divers) · Historique des plats (`.fiche-mets` indentées 60px, cliquables → éditeur correction ; **section `#ficheV2-plats-section` MASQUÉE quand aucun mets** — 11 juin 2026) · Inventaire (lecture seule) · Photo (**clic → modal `#photoV2Overlay` : bouteille en grand + ✕, plus de page SAQ** — 11 juin 2026) · roundel « OÙ LE TROUVER » (**succursales cliquables → Plans/itinéraire `maps.apple.com/?daddr=`** — 11 juin 2026) · roundel « ACTION » · Prix auto (`verifierPrixV2`, silencieux).
**Écritures directes** : Racheter/Panier/Accords → `updateWineField` puis `majMemoireVinV2` + `CURRENT_WINE_DATA`. Édition (**27 champs**, incl. **Photo URL** depuis le 11 juin 2026) → `saveWineEdits` puis `majMemoireVinV2` (clés `Designation`→`Désignation`, `Temperature`→`Température`) puis rouvre la fiche. `saveWineEdits` (backend) écrit tout champ ENVOYÉ, y compris vide — vider un champ dans l'édition le vide aussi dans le Sheet (la photo est gardée par `data.photo !== undefined` : le V1, qui ne l'envoie pas, ne l'efface pas).
**Photo SAQ (11 juin 2026)** : roundel « Photo SAQ » dans la page Modifier → `photoSAQDepuisEditV2` → backend `majPhotoSAQ(codebarre, codeSAQ)` : rescrape la SAQ pour CE vin et n'écrit QUE la colonne Photo URL ; le front met à jour le champ, `majMemoireVinV2` et `CURRENT_WINE_DATA`. Photo personnelle : coller une URL (ou un chemin `images/...` du dépôt) dans le champ Photo de Modifier.
**Retour fiche** (`fermerFicheV2`) : `menuScan` + `FICHE_V2_ORIGINE` → liste d'origine ; sinon `menuScan` → menu d'action ; 'cave'/'achat'/'histo'/'promo'/'recherche'/'emplacements' → leur page (avec `remonterScrollV2`).

## 🎬 Bouton ACTION dans la FICHE V2 — ✅ TERMINÉ
`ouvrirActionDepuisFicheV2` : contexte depuis `wineResultDepuisMemoireV2` (plus d'appels), masque la fiche, `FICHE_V2_ORIGINE` = provenance, `FICHE_V2_PROVENANCE='menuScan'`, ouvre le menu. ✕ du menu : si `FICHE_V2_ORIGINE` → rouvre la fiche.

## 🍷 Boire V2 / 🎁 Donner V2 — ✅ TERMINÉ
S'ouvrent depuis la mémoire. Boire : plat facultatif (champ = **textarea qui replie**, 11 juin 2026), verres grisés sans plat, ACCORDS. Donner : confirmation. Confirmation = écrit + resync `ALL_DATA` + invalide `ALL_HISTORIQUE` (Boire) + ACCUEIL.

## 🃏 Carte universelle `.carte` — ✅ TERMINÉ
3 zones flex + bande couleur en bas. `.carte-photo` 60px, `.carte-centre`, `.carte-droite` (`white-space:nowrap`). Bande : `.note-1..5` (plats), `.vin-*` (vin). `.carte-vide` = voile 0 bouteille. **Cartes mets : la date est EN HAUT à droite** (`.histo-mets .carte-droite, .fiche-mets .carte-droite { align-items: flex-start; }` — 11 juin 2026).

## 🍇 Page CAVE À VIN V2 — ✅ TERMINÉ
`#caveV2Container`, mémoire. Loupe OR si filtre. Filtres CASCADE (couleur → cépage → pays → appellation → accords) + recherche nom. Cartes → `ouvrirFicheV2(cb,'cave')`.

## 📦 Page À RANGER V2 — ✅ TERMINÉ
`#aRangerV2Container`, mémoire, sans filtres. Bouteilles actives sans emplacement, tri couleur puis nom. Vide → « Tout est bien rangé! ». Clic → `deplacerDepuisARangerV2` (`retour='aranger'`).

## 🛒 Page LISTE D'ACHAT V2 — ✅ TERMINÉ
`#achatV2Container`, mémoire (succursales chargées une fois puis cache). Contenu auto : (`Racheter`=Oui ET 0 bouteille) OU (`Panier`=Oui). Filtres CASCADE + Succursale — **TOUS remis à zéro à chaque ouverture, succursale comprise**. Cartes SANS prix : nom + origine, dispo seule à droite en petit (`X btl` vert `.dispo-oui` / `✗` rouge `.dispo-non`) quand une succursale est choisie. Clic → `ouvrirFicheV2(cb,'achat')`. Les noms de succursales replient dans le panneau (`.panneau-gauche .item-liste { white-space: normal }`).

## 📍 Page EMPLACEMENTS V2 — ✅ TERMINÉ
`#empV2Container`, mémoire. Filtres CASCADE Meuble → Rangée → Espace. Boutons « Vins en double », « Cépages doubles »/« manquants » (si meuble). Vue groupée MEUBLE → RANGÉE → cartes. Rangée tirée : le décompte reste en haut à droite (`.emp-rangee.ouvert` en `position:relative`, `.emp-compte` en `absolute` haut-droite). **Quinconce des rangées à 7 espaces conforme au réel (11 juin 2026) : BAS = espaces 1-3-5-7 (4 ronds), HAUT = 2-4-6 (3 ronds).** Clic → `deplacerDepuisEmpV2` (`retour='emplacements'`).

## 📜 Page HISTORIQUE V2 — ✅ TERMINÉ
`#histoV2Container`, mémoire (`ALL_HISTORIQUE` paresseux). Filtres Mets · Vin · Accord. Corps PAR VIN (`.histo-groupe`, bande couleur en haut de la carte vin) : carte vin → fiche ; cartes `.histo-mets` (barre couleur gauche, date en haut à droite) → éditeur `#histoEditV2Overlay`. **Page Corriger au gabarit commun** : ✕, nom (`.titre-1`), origine (`#histoEditV2-origine`), titre blanc « Corriger » ; champ plat = textarea qui replie. `ouvrirHistoEditV2(row, plat, note, nom, provenance, codeSAQ, codebarre)` : provenance 'fiche' = origine depuis `CURRENT_WINE_DATA` ; sinon retrouvée dans `ALL_DATA` par Code SAQ d'abord, code-barres sinon (jamais par le nom). Correction NOTE + plat → `corrigerHistorique` (resync). Ajout manuel (roundel « Ajouter ») → `histoAjoutV2Overlay` : recherche par nom dans `ALL_DATA`, plat (textarea) + note + Accords → `ajouterHistoriqueManuel` (resync). `getHistorique` renvoie `row`, `codeSAQ`, `couleur`.

## 🎁 Page PROMOTIONS SAQ V2 — ✅ TERMINÉ
`#promoV2Container`, gabarit Liste d'achat. Ouverture = **Mes promos** (vins de la cave en rabais, via `getPromotionsSAQ` + codes SAQ de `ALL_DATA`, spinner, timeout 120 s) ; **Découvertes** (`getToutesPromotionsSAQ`, ≤ 30 $, hors mes vins) chargées EN ARRIÈRE-PLAN dès l'ouverture (silencieux, timeout 300 s) → bascule quasi instantanée. Mémoire de session (`promosMesV2`/`promosDecV2`).
**Panneau gauche** : Afficher (Mes promos / Découvertes, actif en or) · filtres couleur/pays/cépage · Succursale (favorites individuelles, puis « Mes favorites » = `FAV`, puis « Toutes les succursales » = `TOUTES`).
**Cartes** (tri rabais décroissant) : photo (mes vins), nom, origine ; à droite (enveloppé dans un `<div>` — la zone est flex, sinon tout s'étale sur une ligne) : prix barré (`.prix-barre`), prix promo, `+X pts` bonis, dispo.
**Dispo** : une succursale → `X btl`/✗ par carte ; `FAV` → chaque favorite avec stock et quantité (1 appel `getSuccursalesDisponibles` par carte, timeout 120 s) ; `TOUTES` → tap sur une carte = 3 succursales les plus proches avec stock (géolocalisation) — **chaque succursale affichée est cliquable → Plans/itinéraire (`maps.apple.com/?daddr=`, `event.stopPropagation()`)** (11 juin 2026).
**Clic carte** : Mes promos → fiche (provenance 'promo') ; Découvertes → page SAQ du vin ; mode `TOUTES` → dispo proches.

## 🔍 Page RECHERCHE V2 — ✅ TERMINÉ
`#rechercheV2Container`, gabarit À ranger + champ. UN champ qui fouille TOUS les champs de TOUS les vins (`ALL_DATA`) — agent, producteur, arômes, description, appellation… — accents et majuscules ignorés (`normaliserRechercheV2`), minimum 2 caractères. Champs exclus de la fouille : row, bottle, Statut, Meuble/Rangee/Espace, dates, Source, Photo URL. Résultats groupés par vin (`grouperVinsV2`), cartes standards (compte de bouteilles à droite, voile si 0) → fiche (provenance 'recherche').

### Menu burger V2 — ✅ TERMINÉ (complet, plus aucun « À venir »)
`#burgerV2` + voile. ACCUEIL, CAVE, EMPLACEMENTS, HISTORIQUE, LISTE D'ACHAT, RECHERCHE, À RANGER, PROMOTIONS SAQ, RAFRAÎCHIR.

## 🏠 Accueil V2 — ✅ TERMINÉ
`#accueilV2-titre` padding `25vh`. `.bouton-navigation` 40×40 (scan/SAQ/burger), `.gauche`/`.droite` en `absolute`.

## ✏️ CRAYON — édition fiche V2 — ✅ TERMINÉ
Crayon (✎) → `ouvrirEditFicheV2`, 27 champs (incl. Photo) + roundel « Photo SAQ ». Sauvegarde conforme mémoire (voir Fiche V2).

## 🖼️ Modal PHOTO V2 — ✅ TERMINÉ (11 juin 2026)
`#photoV2Overlay` (`z-index:10010`, dans `cacherToutesPagesV2`) : `.photo-grande img` (max 90 % / 85 %, `object-fit:contain`) + ✕ (`fermerPhotoV2`). Ouvert par le clic sur la photo de la fiche (`ouvrirPhotoV2(url)`), la fiche reste ouverte dessous.

## ✅ RÉALISÉ le 11 juin 2026 (anciens points 1 à 10, tous faits)
1. **Scroll** : retour EN HAUT à chaque ouverture (`remonterScrollV2`, voir Navigation).
2. **Champ mets** : textarea qui replie (`boireV2-plat`, `histoEditV2-plat`, `histoAjoutV2-plat` ; CSS `textarea.champ-saisie`).
3. **Fiche — section plats vide** : barre masquée (`#ficheV2-plats-section`).
4. **Photo fiche** : modal `#photoV2Overlay` au lieu de la page SAQ.
5. **Succursales** : tap → Plans/itinéraire (fiche « Où le trouver » + promos dispo proches).
6. **Cartes mets** : date en haut à droite.
7. **Photo** : champ Photo (URL, accepte `images/...`) dans Modifier + roundel « Photo SAQ » (`majPhotoSAQ` backend, n'écrit QUE la photo). Décidé : URL, jamais de téléversement.
8. **Toast invisible après le premier** : corrigé dans `afficherMessage` (socle).
9. **Emplacements — quinconce 7 espaces** : bas 1-3-5-7, haut 2-4-6.
10. **Vin inconnu — code SAQ manuel** : champ Code SAQ + Voir SAQ + Confirmer qui lit le code-barres corrigé et relance la recherche (voir Arbre du scan, branche C).

## 📋 PROCHAINE SESSION — tests du 11 juin 2026 (soir)
**Bogues**
1. **Saisie manuelle au scan = gel (« mort »)** — et gel aussi si un test a déjà été fait avant ; un vrai code entré est déclaré « code erroné ». À analyser en priorité.
2. **« J'ai perdu l'ajout d'un mets »** — le roundel/chemin d'ajout manuel d'un mets (Historique) ne fonctionne plus ou a disparu. À analyser.

**Demandes**
3. **Emplacements** : tap sur un espace LIBRE → ouvre le scan.
4. **Emplacements** : séparateur discret entre les rangées et entre le titre et les rangées — pas une ligne qui touche au cadre (pas un look Excel).
5. **Emplacements** : rangée ouverte → la bordure du cercle prend la couleur du vin.
6. **Cépages insensibles à la casse PARTOUT** : recherche, filtres et toutes les fonctions.
7. **Cave** : ajouter un filtre RECHERCHE TEXTE (pas un choix).
8. **Liste d'achat** : succursale choisie → cacher les vins non disponibles.
9. **Liste d'achat** : apparence — voir le pays, tri alphabétique.
10. **Liste d'achat — mode conseiller SAQ** : marquer un produit « rendu dans le panier » sans le scanner (le conseiller a l'iPhone en main). Méthode à trancher.
11. **Liste d'achat** : le total se recalcule selon la succursale choisie.
12. **Cave** : sous le total des vins, afficher le total des bouteilles en stock.
13. **Emplacements** : « Cépages manquants » disponible pour TOUS les emplacements (pas seulement quand un meuble est choisi).

## 🐞 En suspens
- **Vue emplacements V1 instable** : un filtre renvoie parfois une bouteille de moins. D'où la vérif réelle finale à l'Arrivée.
- **Découpage des JS** (proposé, non tranché, pas tout de suite) : socle / navigation / scan / actions / pages / fiche — `scripts-scanner-v2.js` est un fourre-tout. **Même exercice voulu pour `Code.gs`** (lecture / écriture / SAQ / historique / utilitaires).
- **Panneaux de filtres dupliqués dans le HTML** : le même bloc (Filtrer · Couleurs/Pays/Cépages · Succursale) est copié dans plusieurs pages (achat, promo, variantes Cave/Emp/Histo). À remplacer par UNE fonction JS qui génère le panneau (préfixe en paramètre) — à faire en même temps que le découpage. La duplication coûte en lecture et en tokens à chaque session.

## 📇 Champs d'un vin (référence)
Code-barres (CUP), Code SAQ, Nom, Prix, Couleur, Cépages, Pays, Région, Appellation, Désignation, Classification, Format, Alcool, Sucre, Particularité, Producteur, Agent promo, Millésime dégusté, Arômes, Acidité, Sucrosité, Corps, Bouche, Température, Description, Aimé (`Racheter`), Accords, Recettes, Notes temporaires, Divers, Pastille gout (32), Photo URL (33), Panier (34). Bouteilles : index 35-69 (5 × 7).

## 🔑 Backend — fonctions clés (référence)
- `getConfig` → CONFIG (`CONFIG.meubles[meuble][rangée]`, `CONFIG.accords`)
- `getInventoryData` → tout l'inventaire, TOUS les champs (→ `ALL_DATA`)
- `checkWineExists` { codebarre } → { exists, row, count, wine, bottles } (bouteilles SANS `row` — d'où le repli `wineResult.row`)
- `checkLocationAvailable` { meuble, rangee, espace } → { available, message }
- `addBottle`, `actionBouteille` { row, action, bottle, plat, bonAccord }
- `getHistorique` → { row, date, codebarre, nom, plat, bonAccord, codeSAQ, couleur }
- `corrigerHistorique` { row, plat, note } · `ajouterHistoriqueManuel` { codebarre, plat, note }
- `getWineBottles` (secours fiche), `ajouterVinAvecBouteilles`, `updateWineField`, `saveWineEdits` (incl. `photo`), `majPhotoSAQ` { codebarre, codeSAQ } (n'écrit QUE Photo URL), `getSuccursalesDisponibles`, `getSuccursales`, `getToutesSuccursales`, `ajouterSuccursale`, `supprimerSuccursale`, `verifierDispoSAQ_GRAPHQL_V1`, `getPromotionsSAQ`, `getToutesPromotionsSAQ`, `chercherProduitSAQ_GRAPHQL_V1`, `verifierEtMettreAJourPrixSAQ`, `testScrapingSAQ`

## 🐛 Pièges à surveiller
- Libellés fiche V2 : « À racheter » = `Racheter` ; « Sur-inventaire » = `Panier`. Backend « Racheter » (front) vs « Aimé »/AIME (back).
- Clés sans accent consommées par la fiche/édition : `Designation`, `Temperature`, `Cepage` — fournies par `ficheDepuisMemoireV2`, PAS par `getWineBottles`.
- Toute nouvelle page V2 : l'ajouter à la liste de `cacherToutesPagesV2()` ET appeler `remonterScrollV2` à son ouverture.
- Toute nouvelle écriture : resynchroniser (`getInventoryData` ou `majMemoireVinV2`), et invalider `ALL_HISTORIQUE` si elle touche l'historique.
- `saveWineEdits` écrit tout champ envoyé, y compris vide ; la photo est protégée par `!== undefined` (le V1 ne l'envoie pas).
- `updateWineField` ne connaît que Accords, Racheter, Panier — pas un écrivain générique.
- Jamais `100vh` dans le V2 (iOS recadre le fond) : toujours `height:100%`.
- Overlay par-dessus un autre : z-index supérieur (l'ordre HTML ne suffit pas).
- Loupe/X d'une page-liste : `position:fixed`, sinon ils défilent avec le contenu.
- Carte avec date à droite : `white-space:nowrap` sinon tronquée (exception : items des panneaux de filtres, qui replient).
- Carte indentée pleine largeur : `width: calc(100% - indent)` sinon elle dépasse à droite.
- Toast : ne jamais poser `display:none` en ligne sans le retirer à l'affichage suivant.
- Casse CSS sensible : `.roundel` futur `.bouton-londres`.
- Toujours modifier dans `styles-v2.css` (V2), jamais `styles.css` (V1).
