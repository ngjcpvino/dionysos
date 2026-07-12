# 🍷 Dionysos — État du projet (consolidé, à jour au 11 juillet 2026)

> Les RÈGLES DE TRAVAIL sont dans `REFERENCE.md` (à lire en premier). Ce fichier-ci ne contient que l'état technique du projet. Seuls deux `.md` existent : `REFERENCE.md` et celui-ci (+ les spécifications du dossier « a faire »).

## 📁 Architecture
- **Frontend** : GitHub Pages (dépôt `ngjcpvino/dionysos`)
- **Backend** : Google Apps Script — projet « Vino 3.0 » — `Code.gs` (un seul backend)
- **Base** : Google Sheets

## 🏗️ Stratégie V2 — ✅ TERMINÉE (ménage fait le 11 juillet 2026)
La stratégie « deux sites parallèles » est **terminée**. Le V1 est **supprimé** du dépôt (8 fichiers : `index.html`, `styles.css`, `scripts-config.js`, `scripts-init.js`, `scripts-inventaire.js`, `scripts-fiche.js`, `scripts-scanner.js`, `scripts-listes.js`). **Le V2 est LE site.**

**Décision de Chantal (11 juillet 2026) — PAS de renommage** : les fichiers V2 **gardent leurs noms** (`index-v2.html`, `styles-v2.css`, les `-v2.js`). Les deux téléphones pointent déjà sur `.../index-v2.html` et ça reste ainsi. Conséquence assumée : l'adresse de base du site (sans `index-v2.html`) affiche « page introuvable » — voulu (page moins facile à trouver). ⚠️ Ce n'est PAS une protection : la vraie protection = chantier `SECURITE-API.md` (prochain).

**Socle V2.** `scripts-socle-v2.js` contient : `API_URL`, `appelBackend` + spinner, variables globales (`CONFIG`, `ALL_DATA`, `ALL_HISTORIQUE`, `CURRENT_WINE_*`, `FICHE_V2_PROVENANCE`, `FICHE_V2_ORIGINE`), `afficherMessage`, `decodeHTML`, `ouvrirApresTap`, `remonterScrollV2`, capteur d'erreurs globales, `window.onload` propre. `styles-v2.css` contient `:root` + le fond.

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

**Insensibilité casse/accents (11 juin 2026, RÈGLE)** : `normaliserRechercheV2` + aides `memeTexteV2(a,b)` et `contientTexteV2(texte, morceau)`. Appliquée aux CÉPAGES partout : filtres Cave/Achat/Promo (listes dédupliquées via `uniqueValeursAchat` normalisé et `retenir()` de la Cave, comparaisons par `contientTexteV2`), regroupements Cépages doubles/manquants (clés normalisées, affichage de la première forme rencontrée). Toute nouvelle comparaison de texte utilisateur passe par ces aides.

## 🛡️ Anti-gel V2 (RÈGLE)
`appelBackend` : **timeout 30 s par défaut, ajustable par appel** (`options.timeout` — utilisé par Promotions : 120 s et 300 s) via `AbortController` → erreur « Le serveur ne répond pas », spinner toujours retiré (`finally`). `retourAccueilV2()` = `cacherToutesPagesV2()` + `menuActionV2Context=null` + message. Branchée dans le `.catch` de tout écrivain.

**Capteur d'erreurs globales (11 juin 2026).** Le socle écoute `window error` et `unhandledrejection` → toute erreur JS ou promesse échouée devient un toast « Erreur : … ». Outil de diagnostic : plus aucun gel silencieux.

**Toast réparé (11 juin 2026 — la cause des « gels »).** `afficherMessage` (socle V2) posait `display:none` en ligne après le premier toast et ne le retirait jamais — tous les messages suivants étaient invisibles : chaque refus (« Entrez un nom », « Code-barres invalide ») semblait un gel. Signature du bogue : « marche au premier essai, mort ensuite ». Corrigé : `t.style.display = ''` remis avant chaque affichage. Ne jamais réintroduire un `display:none` en ligne sans le retirer à l'affichage suivant. ⚠️ Le correctif avait été présenté puis JAMAIS appliqué pendant une demi-session (marqué fait à tort) — leçon : un changement sans « ok » n'existe pas.

## 🧭 Navigation V2 (RÈGLES, 9 juin 2026)
- **`cacherToutesPagesV2()`** (dans `scripts-scanner-v2.js`) cache TOUS les conteneurs/overlays V2 + ferme le burger, avec garde `if (el)`. Liste complète maintenue à jour à chaque nouvel écran (incl. `photoV2Overlay` depuis le 11 juin 2026).
- **Burger** : chaque cible fait `cacherToutesPagesV2()` puis ouvre sa page ; 'accueil' = tout cacher + contexte null ; RAFRAÎCHIR = resync `ALL_DATA` + vide `ALL_HISTORIQUE`.
- **Menu d'action (`menuV2Click`)** : chaque bouton fait `cacherToutesPagesV2()` avant d'ouvrir (sinon une liste restée ouverte dessous repassait par-dessus la page d'action). La garde « 0 bouteille » est vérifiée AVANT tout.
- **Œil grisé** : `#menuV2-visualiser` reçoit `.desactive` quand on arrive de la fiche (`FICHE_V2_ORIGINE` défini). `traiterResultatScanV2` remet `FICHE_V2_ORIGINE = null` (un scan neuf rallume l'œil).
- **Après confirmation Boire / Donner / Arrivée → retour à l'ACCUEIL** (décidé). Déplacer garde son retour (`'aranger'`/`'emplacements'`/menu) — utile pour ranger en série.
- **✕ des pages vin** : Boire/Donner/Arrivée rouvrent le menu d'action (seul chemin d'accès) ; Déplacer honore `menuActionV2Context.retour`.
- **Démarrage** : le spinner du `window.onload` couvre `getConfig` ET `getInventoryData` — l'app n'est utilisable qu'une fois la mémoire complète (plus jamais de Cave à 0).
- **Scroll en haut (11 juin 2026, RÈGLE)** : toute page rouverte revient EN HAUT. `remonterScrollV2(containerId)` (socle) remet `scrollTop = 0` du `.modal-v2-content` ; appelée dans chaque `ouvrir...V2` (Cave, À ranger, Achat, Emplacements, Historique, Promo, Recherche), dans `ouvrirFicheV2`, `ouvrirEditFicheV2`, et sur les réouvertures directes de `fermerFicheV2`. Toute NOUVELLE page doit l'appeler aussi.

**Z-index des overlays empilés (RÈGLE).** Tous les écrans V2 partagent `z-index:9999`. Un overlay ouvert PAR-DESSUS un autre reçoit un z-index supérieur : `#menuActionV2Overlay`, `#histoEditV2Overlay` et `#photoV2Overlay` = `10010` ; loupes fixes et `.btn-fermer` = `10002` ; spinner/toast = `99999`.

**Ouverture d'overlay différée — anti « double-clic » (RÈGLE).** Tout passage « masquer un overlay puis en ouvrir un autre » ouvre via `ouvrirApresTap(fn)` (`setTimeout 0`, dans `scripts-socle-v2.js`). Appliqué : `menuV2Click`, `ouvrirActionDepuisFicheV2`, `deplacerDepuisARangerV2/EmpV2`, cartes → fiche, cartes mets → éditeur, espace libre → scan.

**Loupe/X collés au défilement (RÈGLE).** `.modal-v2-content` défile, donc loupe et ✕ sont `position:fixed`. `.gauche` reste `absolute` (accueil + crayon fiche).

**Fond stable (RÈGLE iOS).** `.modal-v2-fullscreen` est en `width:100%; height:100%` — JAMAIS `100vh` : sur iPhone/iPad, `100vh` inclut la barre Safari repliée, l'image « cover » se recadre et le fond paraît se tasser entre l'accueil et les pages. Le fond de chaque page reste OPAQUE (rideau qui masque la page en dessous) — ne jamais le rendre transparent.

**Anti-cache iPhone (RÈGLE).** `index-v2.html` charge `styles-v2.css` et les 3 JS par `document.write` avec `?v=` + heure courante (`Math.floor(Date.now()/3600000)`) : les fichiers se rechargent seuls au plus tard une heure après une publication. ⚠️ Un test fait tout de suite après une publication peut rouler les ANCIENS fichiers.

## 📂 Fichiers (après le ménage du 11 juillet 2026)
**Site (unique)** : index-v2.html · styles-v2.css · scripts-socle-v2.js · scripts-scanner-v2.js (scan + menu + saisie manuelle + vin inconnu + Arrivée + Déplacer + Boire + Donner + Cave + filtres + À ranger + Liste d'achat + Emplacements + Historique + navigation) · scripts-fiche-v2.js
**V1 : SUPPRIMÉ du dépôt** (11 juillet 2026) : index.html · styles.css · scripts-config.js · scripts-init.js · scripts-inventaire.js · scripts-fiche.js · scripts-scanner.js · scripts-listes.js — n'existent plus.
**Adresse du site** : `.../index-v2.html` (les raccourcis des deux téléphones, inchangés). L'adresse de base sans nom de fichier donne « page introuvable » (assumé).
**Backend** : Code.gs (commentaire de structure corrigé ; ligne morte `addBottle` retirée — 9 juin 2026 ; `majPhotoSAQ` + photo dans `saveWineEdits` — 11 juin 2026). Les fonctions appelées seulement par le V1 restent (tri = chantier séparé, non demandé).
**Sheets** : Vino · Historique · config/CONFIG · Vins scannés (non utilisé)
**Docs** : REFERENCE.md (règles) · ce fichier (état) · dossier « a faire » (spécifications validées). Les anciens audits et fichiers de décisions sont fusionnés ici et supprimés.

## 🎯 Scan V2 (`scripts-scanner-v2.js`)
**Flux** : `startScanFromHomeV2` → `startScannerV2` (Quagga sur `#interactiveV2`, seuil 3) → `traiterResultatScanV2(code)` → `checkWineExists` (exception fraîche).
- **Vin existe** → `ouvrirMenuActionV2` (gabarit commun) : 6 cercles 👁 Visualiser · ➕ Arrivée · ⇄ Déplacer · 🍷 Boire · 🎁 Donner · ✕. Contexte `menuActionV2Context`.
- **Rescanner** / **Entrée manuelle** (`validerSaisieManuelleV2`).
- **`gtinValide` accepte 8, 12, 13 et 14 chiffres** (11 juin 2026 — la SAQ affiche des CUP à 14 chiffres ; un vrai code tapé à 14 était déclaré « invalide »).

### Arbre des résultats d'un scan (RÉFÉRENCE)
- **A — Lecture** : caméra indispo → manuel ; rien lu → boutons visibles ; douteux → seuil 3 ; checksum GTIN (8/12/13/14) ✅. Quagga conservé.
- **B — Vin existe** : stock > 0 → menu complet ; 0 bouteille → Déplacer/Boire/Donner grisés. ✅
- **C — Vin absent** ✅ (refait le 11 juin 2026) : recherche SAQ auto. Trouvé → `creerVinSAQV2` → menu. Introuvable → page « Vin inconnu » : champ code-barres (modifiable), champ **Code SAQ**, champ Nom, roundel **Voir SAQ** (`voirSAQVinInconnuV2` : saq.com avec le code-barres rallongé à 14 chiffres). **Confirmer (`creerVinManuelV2`) lit le code-barres TEL QUE CORRIGÉ (validé GTIN)** : Code SAQ rempli → `creerVinSAQV2` ; sinon relance `chercherProduitSAQ_GRAPHQL_V1` avec le code corrigé ; trouvé → création SAQ ; introuvable + nom rempli → `creerVinNomV2` (manuel) ; introuvable sans nom → message, la page reste ouverte. Cas couvert : CUP de la bouteille ≠ CUP en fiche SAQ (ex. 635335961957 vs 00635335596197). `ajouterVinAvecBouteilles` rattache le nouveau code-barres à la liste CUP du vin existant quand le code SAQ existe déjà (2 codes-barres par millésime).
- **D — Erreur** → message + `retourAccueilV2`.

### ➕ Arrivée V2 — ✅ TERMINÉ
S'ouvre depuis la mémoire. Cascade ne propose que le libre, vérif réelle (`checkLocationAvailable`) avant ajout. Max 5 : blocage cascade ET le front lit `res.success` — refus backend = message affiché, page Arrivée reste ouverte. Écrit puis resync `ALL_DATA` (2 appels), puis ACCUEIL.

### ⇄ Déplacer V2 — ✅ TERMINÉ
S'ouvre depuis la mémoire. 1 bouteille → direct ; plusieurs → liste (`row` de la bouteille, repli sur `wineResult.row` quand le contexte vient du scan). Vérif réelle. `fermerDeplacerV2` revient selon `menuActionV2Context.retour`.

## 📄 Fiche V2 (`scripts-fiche-v2.js`)
`ouvrirFicheV2(codebarre, provenance)` : bâtie depuis `ficheDepuisMemoireV2` (instantanée), secours backend. Plats depuis `ALL_HISTORIQUE` (paresseux). Panneau `#ficheV2Overlay`, bordure couleur du vin. La carte Température s'affiche SANS le « De » de tête (`replace(/^De\s+/i, '')`).
**Blocs** : Information · Description+Prix · Dégustation · Production · Notes (**Notes du sommelier** en premier — champ toujours visible, « Aucune » si vide, tap → textarea, sortie du champ = sauvegarde seulement si changé via `updateWineField('Notes temporaires')` + `majMemoireVinV2`, toast « Note sauvegardée » ; Accords avec item **« + Ajouter »** au bas du menu — voir Accords dynamiques ; Racheter ✓/✗ ; Sur-inventaire `Panier` ; Recettes/Divers — l'ancienne ligne « Notes » est retirée, remplacée par le champ) · Historique des plats (`.fiche-mets` indentées 60px, cliquables → éditeur correction ; **section `#ficheV2-plats-section` MASQUÉE quand aucun mets** — 11 juin 2026) · Inventaire (lecture seule) · Photo (**clic → modal `#photoV2Overlay` : bouteille en grand + ✕, plus de page SAQ** — 11 juin 2026) · roundel « ACTION » **puis** roundel « OÙ LE TROUVER » (ordre inversé le 11 juillet 2026 ; succursales cliquables → Plans/itinéraire `maps.apple.com/?daddr=` — 11 juin 2026) · Prix auto (`verifierPrixV2`, silencieux).
**Écritures directes** : Racheter/Panier/Accords → `updateWineField` puis `majMemoireVinV2` + `CURRENT_WINE_DATA`. Édition (**27 champs**, incl. **Photo URL** depuis le 11 juin 2026) → `saveWineEdits` puis `majMemoireVinV2` (clés `Designation`→`Désignation`, `Temperature`→`Température`) puis rouvre la fiche. `saveWineEdits` (backend) écrit tout champ ENVOYÉ, y compris vide — vider un champ dans l'édition le vide aussi dans le Sheet (la photo est gardée par `data.photo !== undefined` : un appel qui ne l'envoie pas ne l'efface pas).
**Photo SAQ (11 juin 2026)** : roundel « Photo SAQ » dans la page Modifier → `photoSAQDepuisEditV2` → backend `majPhotoSAQ(codebarre, codeSAQ)` : rescrape la SAQ pour CE vin et n'écrit QUE la colonne Photo URL ; le front met à jour le champ, `majMemoireVinV2` et `CURRENT_WINE_DATA`. Photo personnelle : coller une URL (ou un chemin `images/...` du dépôt) dans le champ Photo de Modifier.
**Retour fiche** (`fermerFicheV2`) : `menuScan` + `FICHE_V2_ORIGINE` → liste d'origine ; sinon `menuScan` → menu d'action ; 'cave'/'achat'/'histo'/'promo'/'recherche'/'emplacements' → leur page (avec `remonterScrollV2`).

## 🎬 Bouton ACTION dans la FICHE V2 — ✅ TERMINÉ
`ouvrirActionDepuisFicheV2` : contexte depuis `wineResultDepuisMemoireV2` (plus d'appels), masque la fiche, `FICHE_V2_ORIGINE` = provenance, `FICHE_V2_PROVENANCE='menuScan'`, ouvre le menu. ✕ du menu : si `FICHE_V2_ORIGINE` → rouvre la fiche.

## 🍷 Boire V2 / 🎁 Donner V2 — ✅ TERMINÉ
S'ouvrent depuis la mémoire. Boire : **champ Notes du sommelier pré-rempli** (au-dessus du mets — voir Notes du sommelier), plat facultatif (champ = **textarea qui replie**, 11 juin 2026), verres grisés sans plat, ACCORDS. Donner : confirmation. Confirmation = écrit + resync `ALL_DATA` + invalide `ALL_HISTORIQUE` (Boire) + ACCUEIL.

## 🃏 Carte universelle `.carte` — ✅ TERMINÉ
3 zones flex + bande couleur en bas. `.carte-photo` 60px, `.carte-centre`, `.carte-droite` (`white-space:nowrap`). Bande : `.note-1..5` (plats), `.vin-*` (vin). `.carte-vide` = voile 0 bouteille. **Cartes mets : la date est EN HAUT à droite** (`.histo-mets .carte-droite, .fiche-mets .carte-droite { align-items: flex-start; }` — 11 juin 2026).

## 🍇 Page CAVE À VIN V2 — ✅ TERMINÉ
`#caveV2Container`, mémoire. Loupe OR si filtre. Filtres CASCADE (couleur → cépage → pays → appellation → accords). **Le champ texte du panneau fouille TOUS les champs du vin** (comme la Recherche, mêmes champs exclus ; accents/casse ignorés — 11 juin 2026). **Compte : total des vins + total des bouteilles en stock dessous** (11 juin 2026). Cartes → `ouvrirFicheV2(cb,'cave')`.

## 📦 Page À RANGER V2 — ✅ TERMINÉ
`#aRangerV2Container`, mémoire, sans filtres. Bouteilles actives sans emplacement, tri couleur puis nom. Vide → « Tout est bien rangé! ». Clic → `deplacerDepuisARangerV2` (`retour='aranger'`).

## 🛒 Page LISTE D'ACHAT V2 — ✅ TERMINÉ (refonte 11 juin 2026)
`#achatV2Container`, mémoire (succursales chargées une fois puis cache). Contenu auto : (`Racheter`=Oui ET 0 bouteille) OU (`Panier`=Oui). Filtres CASCADE + Succursale — **TOUS remis à zéro à chaque ouverture, succursale comprise**, et `panierSessionAchatV2 = {}`.
**Apparence** : **SECTIONS PAR PAYS** (`.emp-meuble` en titre, pays en ordre alphabétique normalisé, « Sans pays » à la fin), vins en ordre alphabétique dessous. Cartes SANS prix : nom + origine.
**Coche panier (mode conseiller SAQ)** : rond `.coche-panier` à droite de chaque carte (`togglePanierSessionV2`, `stopPropagation`) → carte voilée (`.carte-vide`), ✓ doré. **Session seulement** (`panierSessionAchatV2`, clé `cleCartePanierV2` = code-barres/code SAQ/nom), oubliée à la réouverture. **La carte cochée reste à sa place** (pas de réordonnancement — décidé : ça faisait trop bouger l'écran).
**Succursale choisie** : dispo par carte (`X btl` vert / sinon) — **les vins NON disponibles sont CACHÉS** et le compte se **recalcule** (`majCompteAchatV2` compte les cartes visibles) au fil des réponses (11 juin 2026). Vins sans code SAQ : non vérifiables, restent visibles.
Clic carte → `ouvrirFicheV2(cb,'achat')`. Les noms de succursales replient dans le panneau (`.panneau-gauche .item-liste { white-space: normal }`).

## 📍 Page EMPLACEMENTS V2 — ✅ TERMINÉ (enrichie 11 juin 2026)
`#empV2Container`, mémoire. Filtres CASCADE Meuble → Rangée → Espace. Vue groupée MEUBLE → RANGÉE → ronds.
- **Séparateurs discrets** : ligne centrée (15 % de retrait de chaque côté, `--couleur-bordure-tres-claire`) entre le titre du meuble et les rangées (`.emp-meuble::after`) et entre les rangées (`.emp-rangee + .emp-rangee::before`) — ne touche jamais le cadre (pas de look Excel).
- **Quinconce des rangées à 7 espaces conforme au réel : BAS = espaces 1-3-5-7 (4 ronds), HAUT = 2-4-6 (3 ronds).**
- **Rangée tirée** : gros ronds + photo ; **bordure du rond à la COULEUR DU VIN** (`data-couleur="var(--vin-*)"` posé au rendu, appliqué/retiré à l'ouverture/fermeture) ; le décompte reste en haut à droite.
- **Rond occupé** → **grande photo ronde** (11 juillet 2026 — voir sa section) puis fiche du vin (provenance 'emplacements'). **Rond LIBRE → ouvre le SCAN** (11 juin 2026).
- **Bloc « À ranger »** en pseudo-meuble après les vrais meubles (11 juillet 2026 — voir sa section).
- **Boutons** : « Vins en double » (global ou par meuble) ; « Cépages doubles » (meuble choisi seulement) ; « **Cépages manquants** » — **TOUJOURS visible** : avec meuble = cépages présents ailleurs et absents du meuble ; **SANS meuble (11 juin 2026) = cépages de toute ma liste de vins ABSENTS du stock actif** (0 bouteille), avec les vins à racheter dessous — sert à prioriser la liste d'achat. Regroupements insensibles à la casse.
Clic carte (listes) → `deplacerDepuisEmpV2` (`retour='emplacements'`).

## 📜 Page HISTORIQUE V2 — ✅ TERMINÉ
`#histoV2Container`, mémoire (`ALL_HISTORIQUE` paresseux). Filtres Mets · Vin · Accord. Corps PAR VIN (`.histo-groupe`, bande couleur en haut de la carte vin) : carte vin → fiche ; cartes `.histo-mets` (barre couleur gauche, date en haut à droite) → éditeur `#histoEditV2Overlay`. **Page Corriger au gabarit commun** : ✕, nom (`.titre-1`), origine (`#histoEditV2-origine`), titre blanc « Corriger » ; champ plat = textarea qui replie. `ouvrirHistoEditV2(row, plat, note, nom, provenance, codeSAQ, codebarre)` : provenance 'fiche' = origine depuis `CURRENT_WINE_DATA` ; sinon retrouvée dans `ALL_DATA` par Code SAQ d'abord, code-barres sinon (jamais par le nom). Correction NOTE + plat → `corrigerHistorique` (resync). **Ajout manuel : le roundel « Ajouter » est dans le PANNEAU DE FILTRES** (11 juin 2026 — il était enterré sous les cartes en bas de page ; `ouvrirHistoAjoutV2` ferme le panneau) → `histoAjoutV2Overlay` : recherche par nom dans `ALL_DATA`, plat (textarea) + note + Accords → `ajouterHistoriqueManuel` (resync). `getHistorique` renvoie `row`, `codeSAQ`, `couleur`.

## 🎁 Page PROMOTIONS SAQ V2 — ✅ TERMINÉ
`#promoV2Container`, gabarit Liste d'achat. Ouverture = **Mes promos** (vins de la cave en rabais, via `getPromotionsSAQ` + codes SAQ de `ALL_DATA`, spinner, timeout 120 s) ; **Découvertes** (`getToutesPromotionsSAQ`, ≤ 30 $, hors mes vins) chargées EN ARRIÈRE-PLAN dès l'ouverture (silencieux, timeout 300 s) → bascule quasi instantanée. Mémoire de session (`promosMesV2`/`promosDecV2`).
**Panneau gauche** : Afficher (Mes promos / Découvertes, actif en or) · filtres couleur/pays/cépage (cépage insensible à la casse) · Succursale (favorites individuelles, puis « Mes favorites » = `FAV`, puis « Toutes les succursales » = `TOUTES`).
**Cartes** (tri rabais décroissant) : photo (mes vins), nom, origine ; à droite (enveloppé dans un `<div>` — la zone est flex, sinon tout s'étale sur une ligne) : prix barré (`.prix-barre`), prix promo, `+X pts` bonis, dispo.
**Dispo** : une succursale → `X btl`/✗ par carte ; `FAV` → chaque favorite avec stock et quantité (1 appel `getSuccursalesDisponibles` par carte, timeout 120 s) ; `TOUTES` → tap sur une carte = 3 succursales les plus proches avec stock (géolocalisation) — **chaque succursale affichée est cliquable → Plans/itinéraire (`maps.apple.com/?daddr=`, `event.stopPropagation()`)** (11 juin 2026).
**Clic carte** : Mes promos → fiche (provenance 'promo') ; Découvertes → page SAQ du vin ; mode `TOUTES` → dispo proches.

## 🔍 Page RECHERCHE V2 — ✅ TERMINÉ
`#rechercheV2Container`, gabarit À ranger + champ. **Accès : loupe de l'accueil** (plus dans le burger — 11 juillet 2026). UN champ qui fouille TOUS les champs de TOUS les vins (`ALL_DATA`) — agent, producteur, arômes, description, appellation… — accents et majuscules ignorés (`normaliserRechercheV2`), minimum 2 caractères. Champs exclus de la fouille : row, bottle, Statut, Meuble/Rangee/Espace, dates, Source, Photo URL. Résultats groupés par vin (`grouperVinsV2`), cartes standards (compte de bouteilles à droite, voile si 0) → fiche (provenance 'recherche').

### Menu burger V2 — ✅ TERMINÉ
`#burgerV2` + voile. ACCUEIL, CAVE, EMPLACEMENTS, HISTORIQUE, LISTE D'ACHAT, À RANGER, PROMOTIONS SAQ, RAFRAÎCHIR. (RECHERCHE retiré le 11 juillet 2026 — accessible par la loupe de l'accueil.)

## 🏠 Accueil V2 — ✅ TERMINÉ
`#accueilV2-titre` padding `25vh`. En-tête `#topNavV2` = **4 boutons répartis également** (flex `space-evenly`, 11 juillet 2026) : scan · SAQ · **loupe Recherche** · burger.

## ✏️ CRAYON — édition fiche V2 — ✅ TERMINÉ
Crayon (✎) → `ouvrirEditFicheV2`, 27 champs (incl. Photo) + roundel « Photo SAQ ». Sauvegarde conforme mémoire (voir Fiche V2).

## 🖼️ Modal PHOTO V2 — ✅ TERMINÉ (11 juin 2026 ; mode rond 11 juillet 2026)
`#photoV2Overlay` (`z-index:10010`, dans `cacherToutesPagesV2`) : `.photo-grande img` (max 90 % / 85 %, `object-fit:contain`) + ✕ (`fermerPhotoV2`). Ouvert par le clic sur la photo de la fiche (`ouvrirPhotoV2(url)`), la fiche reste ouverte dessous. **Deuxième mode « rond »** pour les Emplacements (classe `photo-ronde` — voir la section Grande photo ronde) : `#photoV2-nom` caché en mode fiche.

## 🗒️ NOTES DU SOMMELIER — ✅ TERMINÉ (11 juillet 2026, testé)
Le champ « Notes temporaires » du Sheet devient **« Notes du sommelier »** partout (aucun renommage de colonne).
- **Fiche V2** : premier élément de la section Notes, toujours visible (« Aucune » si vide), tap → textarea `champ-saisie`, quitter le champ = sauvegarde si changé (`editerNotesSommelierV2` / `sauverNotesSommelierV2` / `remettreNotesDisplayV2`, `scripts-fiche-v2.js`). Erreur serveur → le texte reste à l'écran.
- **Boire V2** : champ `#boireV2-notes` au-dessus du champ mets, **pré-rempli** avec la note du vin (`BOIRE_V2_NOTE_INITIALE`, lue de `ALL_DATA`). À la confirmation : écrit SEULEMENT si changé, avant la resync. Le ✕ n'écrit jamais.
- **Édition crayon** : libellé « Notes » → « Notes du sommelier » (même champ `notestemp`).
- **Backend** : `updateWineField` gère maintenant `Notes temporaires` (colonne NOTES_TEMP).

## 🥃 SPIRITUEUX + COULEURS — ✅ TERMINÉ (11 juillet 2026, testé)
- **5 couleurs** : `--vin-bulles` passe au doré champagne `#E8D08A` ; nouvelle `--vin-spiritueux` bleu vif `#446ffc` (+ dégradés spinner, animation `couleur-vin` à 5 pas de 20 %).
- **Classes `.vin-spiritueux`** partout : fiche (bordure gauche), cartes (bande bas), historique (bande haut). `couleurClasseV2` et le classement fiche reconnaissent « spiritueux » ; tri couleur : spiritueux = 5e. Les ronds d'emplacements suivent automatiquement (ils passent par `couleurClasseV2`).
- **Détection SAQ (`Code.gs`, dans `testScrapingSAQ`) — corrigée après test réel** : le fil d'Ariane s'est avéré non fiable ; la détection lit la **méta-description de la page** (og:description, repli meta name="description"), dont le texte commence par le type exact (« Vodka. Format… », « Vermouth blanc… », « Vin rouge… »). Type ne commençant pas par « Vin » → `Couleur = "Spiritueux"`, cépages vidés, **type complet → Appellation** (ex. « Vodka aromatisée (épice) »). Description introuvable → rien ne change (crayon). Couvre le scan ET la création (tout passe par `testScrapingSAQ`). Vérifié sur plusieurs fiches SAQ réelles.
- Produits hors vin déjà en cave : correction au crayon (Couleur = Spiritueux, Appellation = type). Fait pour le Kamouraska.
- ⚠️ RÈGLE : toute nouvelle couleur = ajouter la classe aux 4 blocs CSS (fiche, carte, histo-vin, variables+dégradé+keyframes), à `couleurClasseV2`, au classement de la fiche (2 endroits : classe + classList.remove de `afficherFicheV2` ET de `fermerFicheV2`) et au tri (`ordre` de `grouperVinsV2`).

## ➕ ACCORDS DYNAMIQUES — ✅ TERMINÉ (11 juillet 2026, testé)
Ajouter un accord (catégorie) depuis le menu Accords de la Fiche V2, sans ouvrir le Sheet.
- **Front (`scripts-fiche-v2.js`)** : item « + Ajouter » au bas de `#ficheV2-accords-menu` → champ texte (Entrée confirme). Vide → toast, champ reste. **Doublon** (`memeTexteV2`) → l'existant est coché (pas d'écriture config). Nouveau → `ajouterAccordConfig` backend, poussé dans `CONFIG.accords` (tri alphabétique normalisé), menu re-rendu, **coché via `cocherAccordV2`** (qui passe par `toggleAccordV2` = la sauvegarde existante des accords du vin). Erreur → texte conservé. Fermer le menu → champ redevient « + Ajouter ».
- **Backend (`Code.gs`)** : `ajouterAccordConfig(accord)` — trim, refuse vide, doublon insensible casse/accents (`normaliserAccord`), écrit dans la **première cellule vide de la colonne Accords** de config (parcourt la colonne, pas `getLastRow`). Branché au `doPost`.
- Autre téléphone : voit le nouvel accord au prochain démarrage (Rafraîchir ne recharge pas CONFIG — accepté).

## ⭕ EMPLACEMENTS — GRANDE PHOTO RONDE — ✅ TERMINÉ (11 juillet 2026, testé)
Rangée ouverte : tap sur un **rond occupé** → **grande photo dans un grand rond** (bordure à la couleur du vin), ✕ **au-dessus, à l'extérieur** ; tap sur la photo → fiche (provenance 'emplacements') ; ✕ ou tap sur le fond → ferme, emplacements **tels quels** (pas de re-rendu). Rond libre → scan (intact).
- **Réutilise `#photoV2Overlay`** avec un mode : classe `photo-ronde` + variables `PHOTO_V2_MODE`/`PHOTO_V2_CB`. Mode fiche 100 % intact (`ouvrirPhotoV2` remet tout à zéro, `onerror` compris).
- `ouvrirPhotoEmpV2(cb)` (`scripts-fiche-v2.js`) : lit le vin de `ALL_DATA` (aucun appel), pose photo/nom/bordure (`var(--vin-*)` via `couleurClasseV2`). **Sans photo ou lien brisé → nom du vin au centre** (`#photoV2-nom`, caché en mode fiche). `clicPhotoV2` (stopPropagation) / `clicFondPhotoV2` / `fermerPhotoV2` (retire classe + contexte).
- CSS : bloc `#photoV2Overlay.photo-ronde` (rond `min(80vw, 60vh)`, `object-fit:cover`, ✕ repositionné).
- Fermer la fiche → retour emplacements par `fermerFicheV2` ('emplacements' → `ouvrirEmpV2`), la photo ne se rouvre pas.

## 📦➡️📍 EMPLACEMENTS — BLOC « À RANGER » — ✅ TERMINÉ (11 juillet 2026, testé)
Les bouteilles sans emplacement apparaissent aux Emplacements comme un pseudo-meuble **« À ranger »** (arbre validé) :
- Bloc `emp-bloc` après les vrais meubles, **une ligne de ronds qui replie et se centre** (`.emp-rangee.a-ranger .ligne-ronds { flex-wrap: wrap; row-gap }`), un rond par bouteille, décompte simple (« 26 », pas de « /X »). Visible seulement s'il y a des bouteilles à ranger ET aucun filtre (ou le filtre « À ranger »).
- Se tire comme une rangée (gros ronds, photo, bordure couleur) ; rond → grande photo ronde → fiche. `bouteillesARangerEmpV2()` (jumelle de `bouteillesRangeesEmpV2`).
- **Filtre Meuble** : « À ranger » s'ajoute au bas de la liste (si non vide) — choisi, seul ce bloc s'affiche, Rangée/Espace vides ; un vrai meuble choisi le cache. Titre « À ranger » (casse identique au filtre — la comparaison est `f.meuble === 'À ranger'`).
- Le compte du haut inclut les à-ranger quand le bloc est visible.
- **Au passage** : `.emp-rangee.ouvert .ligne-ronds` replie aussi — une rangée tirée de 6+ gros ronds ne déborde plus de l'écran (bogue vu sur Spiritueux). Quinconce 7 intact.

## 0️⃣ CODES-BARRES — ZÉROS DE TÊTE — ✅ TERMINÉ (11 juillet 2026, testé)
**Bogue réel** : la SAQ affiche les CUP avec des zéros de tête ; un scan sans zéro créait une **2e ligne du même vin** (vu : recherche 3 btl / fiche 1 / doubles 2). Ligne doublon fusionnée à la main dans le Sheet (2 codes séparés d'une virgule en colonne A, apostrophe de tête conservée).
**Correctif (`Code.gs`)** : `memeCodeBarre(a, b)` (chiffres seulement, zéros de tête ignorés, vide ≠ vide) + `listeContientCode(listeCUP, code)`, branchées aux **10 comparaisons de codes-barres** : checkWineExists, addBottle, ajouterHistoriqueManuel, updateWineData, updateWineField, getWineBottles, ajouterCodeSAQ, ajouterVinAvecBouteilles (n'ajoute plus un « même code avec zéro » à la liste CUP), verifierEtMettreAJourPrixSAQ, majPhotoSAQ. Seule la COMPARAISON change — rien de ce qui est écrit. ⚠️ RÈGLE : toute nouvelle comparaison de code-barres au backend passe par `memeCodeBarre`/`listeContientCode`. (Le front compare encore strictement — acceptable car il compare la mémoire à elle-même ; le Sheet est gardé propre par le backend.)

## 🔍 ACCUEIL — LOUPE RECHERCHE — ✅ TERMINÉ (11 juillet 2026, testé)
La Recherche se lance par une **loupe dans l'en-tête de l'accueil** (même dessin SVG que les loupes de pages), placée entre le logo SAQ et le burger. `#topNavV2` = ligne flex `justify-content: space-evenly`, les 4 boutons ont perdu `gauche`/`centre`/`droite` (classes intactes pour leurs autres usagers). **RECHERCHE retiré du burger** (ligne HTML + branche `burgerV2Click` supprimées). La loupe appelle `ouvrirRechercheV2()` directement (l'en-tête n'est accessible que de l'accueil).

## ✅ MÉNAGE V1→V2 — FAIT le 11 juillet 2026
- **Supprimés du dépôt (par Chantal, d'un bloc)** : index.html · styles.css · scripts-config.js · scripts-init.js · scripts-inventaire.js · scripts-fiche.js · scripts-scanner.js · scripts-listes.js.
- **Renommage : NON** (décision Chantal, 11 juillet 2026). `index-v2.html`, `styles-v2.css` et les JS `-v2` gardent leurs noms — les raccourcis des deux téléphones pointent déjà sur `index-v2.html`. Aucune référence interne à corriger (le `document.write` et le `<link>` pointent déjà sur les bons noms).
- Conséquence assumée : l'adresse de base du site donne « page introuvable ». Ce n'est PAS une protection — la vraie protection = `SECURITE-API.md` (prochain chantier).
- `Code.gs` : rien changé (backend conservé intégralement ; le tri des fonctions ex-V1 reste un chantier séparé).

## 🔐 SÉCURITÉ — MOT DE PASSE D'APP — ✅ TERMINÉ (11 juillet 2026)
Chaque appel à l'API doit fournir le mot de passe d'app, sinon le serveur refuse.
- **Backend (`Code.gs`)** : vérification au point d'entrée unique `doPost` — le mot de passe reçu (`params.secret`) est comparé à la Script Property **`APP_SECRET`**. Absent ou faux → `{ success:false, error:'ACCES_REFUSE' }`, aucune donnée, aucun indice. **Si `APP_SECRET` n'est pas posée, tout passe** (garde-fou anti-blocage pendant une mise en route). Un seul contrôle couvre TOUTES les fonctions, lecture comprise.
- **Front (`scripts-socle-v2.js`)** : le mot de passe vit dans `localStorage` (clé **`vinoSecret`**), jamais dans le code ni le dépôt. `appelBackend` l'ajoute automatiquement à chaque appel (`secret` dans le body). Réponse `ACCES_REFUSE` → efface `vinoSecret`, toast « Mot de passe incorrect », rouvre l'écran de saisie (couvre aussi un changement de mot de passe côté serveur : les 2 téléphones le redemandent).
- **Écran de saisie (`index-v2.html`)** : `#secretV2Container` (gabarit `.modal-v2-fullscreen`, champ `#secretV2-champ` en `champ-saisie` type password, roundel CONFIRMER → `confirmerSecretV2`). Au démarrage : pas de `vinoSecret` → écran ; sinon `demarrerAppV2()` (l'ancien contenu du `window.onload`). ⚠️ **Volontairement ABSENT de `cacherToutesPagesV2()`** (exception à la règle) : on ne doit pas pouvoir le contourner par la navigation.
- **Déploiement** : `appsscript.json` inchangé (`ANYONE_ANONYMOUS` nécessaire au fetch anonyme). `API_URL` reste dans le dépôt : le mot de passe la rend inoffensive. GitHub garde l'historique des anciennes versions — accepté, pas de réécriture d'historique (décidé).
- **Mise en route faite** : front publié, `APP_SECRET` posée, backend redéployé, mot de passe entré sur les téléphones.

## ✅ RÉALISÉ le 11 juin 2026 — séance 1 (anciens points 1 à 10)
1. **Scroll** : retour EN HAUT à chaque ouverture (`remonterScrollV2`, voir Navigation).
2. **Champ mets** : textarea qui replie (`boireV2-plat`, `histoEditV2-plat`, `histoAjoutV2-plat` ; CSS `textarea.champ-saisie`).
3. **Fiche — section plats vide** : barre masquée (`#ficheV2-plats-section`).
4. **Photo fiche** : modal `#photoV2Overlay` au lieu de la page SAQ.
5. **Succursales** : tap → Plans/itinéraire (fiche « Où le trouver » + promos dispo proches).
6. **Cartes mets** : date en haut à droite.
7. **Photo** : champ Photo (URL, accepte `images/...`) dans Modifier + roundel « Photo SAQ » (`majPhotoSAQ` backend, n'écrit QUE la photo). Décidé : URL, jamais de téléversement.
8. **Toast invisible après le premier** : corrigé dans `afficherMessage` (socle) — appliqué pour vrai en séance 2.
9. **Emplacements — quinconce 7 espaces** : bas 1-3-5-7, haut 2-4-6.
10. **Vin inconnu — code SAQ manuel** : champ Code SAQ + Voir SAQ + Confirmer qui lit le code-barres corrigé et relance la recherche (voir Arbre du scan, branche C).

## ✅ RÉALISÉ le 11 juin 2026 — séance 2 (tests du soir, Notes.md)
1. **« Saisie manuelle = gel / code erroné »** : deux causes — le correctif du toast (point 8) n'avait JAMAIS été appliqué (chaque refus était invisible = faux gel) → appliqué ; `gtinValide` refusait les codes à 14 chiffres → accepte 14. + capteur d'erreurs globales (toast sur toute erreur JS). **À retester.**
2. **« Ajout d'un mets perdu »** : le roundel « Ajouter » était enterré au bas de la page Historique → déplacé dans le panneau de filtres. **À retester.**
3. **Emplacements — espace libre → scan.** ✅
4. **Emplacements — séparateurs discrets.** ✅
5. **Emplacements — bordure des ronds = couleur du vin (rangée ouverte).** ✅
6. **Cépages insensibles à la casse partout** (filtres Cave/Achat/Promo, listes, doubles/manquants). ✅
7. **Cave — champ texte qui fouille tous les champs.** ✅
8. **Liste d'achat — succursale → non-disponibles cachés + compte recalculé** (couvre aussi « le total se recalcule »). ✅
9. **Liste d'achat — sections par pays, vins alphabétiques.** ✅
10. **Liste d'achat — coche panier session** (mode conseiller SAQ ; testé : carte voilée seulement, PAS renvoyée en bas — décidé après essai). ✅
11. **Cave — total des bouteilles en stock sous le total des vins.** ✅
12. **Emplacements — Cépages manquants global** (cépages de ma liste absents du stock, pour prioriser les achats). ✅

## 📋 À RETESTER (après publication)
Rien en attente — tout testé et confirmé le 11 juillet 2026 (ménage, mot de passe, Notes du sommelier, Spiritueux, Accords dynamiques, Photo ronde, saisie manuelle, ajout d'un mets).

## 🐞 En suspens
- **Découpage des JS** (proposé, non tranché, pas tout de suite) : socle / navigation / scan / actions / pages / fiche — `scripts-scanner-v2.js` est un fourre-tout. **Même exercice voulu pour `Code.gs`** (lecture / écriture / SAQ / historique / utilitaires — incluant le tri des fonctions ex-V1 devenues orphelines).
- **Panneaux de filtres dupliqués dans le HTML** : le même bloc (Filtrer · Couleurs/Pays/Cépages · Succursale) est copié dans plusieurs pages (achat, promo, variantes Cave/Emp/Histo). À remplacer par UNE fonction JS qui génère le panneau (préfixe en paramètre) — à faire en même temps que le découpage. La duplication coûte en lecture et en tokens à chaque session.
- ~~Vue emplacements V1 instable~~ : disparue avec la suppression du V1 (11 juillet 2026). La vérif réelle finale à l'Arrivée (`checkLocationAvailable`) reste, elle est toujours utile à 2 téléphones.

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
- `saveWineEdits` écrit tout champ envoyé, y compris vide ; la photo est protégée par `!== undefined` (un appel qui ne l'envoie pas ne l'efface pas).
- `updateWineField` connaît Accords, Racheter, Panier et `Notes temporaires` (11 juillet 2026) — toujours pas un écrivain générique.
- Nouvelle couleur de vin : voir la RÈGLE de la section Spiritueux (4 blocs CSS + 4 endroits JS).
- Mode rond de la photo (`photo-ronde`) : ne jamais toucher au comportement fiche de `#photoV2Overlay` ; `ouvrirPhotoV2` remet tout à zéro (`onerror = null` compris).
- Toute comparaison de texte utilisateur (cépages, etc.) passe par `normaliserRechercheV2` / `memeTexteV2` / `contientTexteV2` ; toute comparaison de CODE-BARRES au backend passe par `memeCodeBarre` / `listeContientCode` (zéros de tête).
- Jamais `100vh` dans le V2 (iOS recadre le fond) : toujours `height:100%`.
- Overlay par-dessus un autre : z-index supérieur (l'ordre HTML ne suffit pas).
- Loupe/X d'une page-liste : `position:fixed`, sinon ils défilent avec le contenu.
- Carte avec date à droite : `white-space:nowrap` sinon tronquée (exception : items des panneaux de filtres, qui replient).
- Carte indentée pleine largeur : `width: calc(100% - indent)` sinon elle dépasse à droite.
- Toast : ne jamais poser `display:none` en ligne sans le retirer à l'affichage suivant.
- Un changement présenté mais sans « ok » reçu N'EST PAS appliqué — ne jamais le marquer fait.
- Casse CSS sensible : `.roundel` futur `.bouton-londres`.
- Le dépôt n'a plus qu'UN css (`styles-v2.css`) et UN html (`index-v2.html`) — le V1 n'existe plus (11 juillet 2026).
- Mot de passe d'app : `appelBackend` envoie `secret` automatiquement — ne JAMAIS l'ajouter à la main dans un appel. Changer le mot de passe = changer `APP_SECRET` + nouveau déploiement ; les téléphones le redemandent seuls.
- `#secretV2Container` est HORS de `cacherToutesPagesV2()` — exception voulue, ne pas « corriger ».
- Toute nouvelle fonction backend passe par le `switch` de `doPost` : elle est protégée automatiquement, rien à ajouter.