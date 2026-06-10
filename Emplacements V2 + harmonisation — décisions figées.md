# 📍 EMPLACEMENTS V2 + HARMONISATION PAGES VIN — FAIT (NE PAS REDÉCIDER)

> Tout ci-dessous est CODÉ et validé. On ne rediscute rien : on exécute si correction.

## Page EMPLACEMENTS — affichage graphique (cellier en ronds)

- Représentation graphique : bouteilles couchées = culs = RONDS. Le rond = la classe existante `.cercle` (anneau or, fond sombre, comme le ✕). Pas de photo/numéro/couleur sur un rond fermé.
- Données : `CONFIG.meubles[meuble][rangee]` = TABLEAU d’espaces (pas un nombre). `nb = espacesDef.length`.
- Meubles affichés : le filtré, sinon les 3, en ORDRE ALPHABÉTIQUE (Cellier, Pigeonnier, Réserve).
- Chaque meuble dans son bloc `.emp-bloc` (léger cadre + air) pour sentir le passage d’un meuble à l’autre. Titre meuble `.emp-meuble` (BLANC, jamais or).
- Rangée FERMÉE = une seule ligne : « Rangée X » (`.emp-rangee-nom`) + les ronds + compte occupés/total (`.emp-compte`), alignés par le HAUT des ronds. Rangée de 7 fermée montre 4 ronds (pas de quinconce).
- Rangée TIRÉE (clic) = gros ronds avec PHOTO du vin dedans (`object-position: center 60%` pour viser l’étiquette). Rangée de 7 = quinconce 4 bas + 3 haut, les 3 du haut centrés dans les creux (même gap que le bas), sans chevaucher.
- Une seule rangée tirée à la fois (tirer referme les autres ; re-tirer referme).
- Clic d’un rond plein (rangée ouverte) → ouvre la fiche du vin (`data-cb`), provenance ‘emplacements’. Retour de la fiche → revient aux Emplacements (`fermerFicheV2` gère ‘emplacements’).
- Listes cépages : titres de cépages en `.emp-meuble` (blanc). Titre du corps = action + meuble (« Cépages doubles · Cellier »).

## Classe générique de ronds en ligne

- `.ligne-ronds` : flex centré, écart régulier, s’adapte au nombre. Remplace `.menu-v2-grid`.
- Réutilisée au MENU APRÈS SCAN = 2 lignes de 3 ronds.
- Taille 90px réservée au menu scan (`.menu-v2-grid .ligne-ronds .cercle`, `#menuActionV2Overlay .ligne-ronds .cercle`) pour ne pas écraser les ronds d’Emplacements.

## Regroupement d’un vin — CLÉ UNIQUE `cleVinV2(item)`

- Règle : Code SAQ, sinon code-barres, sinon rien (bouteille non regroupée).
- Utilisée partout : `grouperVinsV2` (Cave + À ranger), `baseAchatV2` (Liste d’achat), `grouperParSaqEmpV2` (Emplacements), `afficherHistoV2` (Historique).
- Raison : un même vin mal codé (ex. zéro devant le CUP) était dupliqué. Le Code SAQ fusionne.
- HISTORIQUE aligné à la source (pas de patch) : colonne « Code SAQ » (H, index 7) dans la feuille Historique. `enregistrerHistorique` l’écrit, `actionBouteille` (boire) le passe, `getHistorique` le renvoie (`codeSAQ`).

## En-tête commun des pages VIN (gabarit unique = comme la fiche)

- Pages concernées : Boire, Donner, Arrivée, Déplacer, Corriger (et Fiche, déjà ainsi).
- Gabarit : ✕ en haut à droite ; NOM du vin en CAPITALES en haut (`#...-nom` en `.titre-1`) ; origine Pays • Région • Appellation dessous (`#...-origine` en `.texte-secondaire`) ; action en titre BLANC (`.titre-2` centré : Boire/Donner/Ajouter/Déplacer/Corriger). Jamais de titre en or.
- Boire/Donner/Arrivée/Déplacer passent tous par `rendreEnteteActionV2(prefixe)` (remplit nom + origine). `checkWineExists` renvoie maintenant `appellation` pour que l’origine soit identique à la fiche.
- Corriger : nom du vin déjà fourni par `ouvrirHistoEditV2` (pas d’origine, l’historique ne l’a pas).

## Ajout manuel au carnet (page Historique)

- Roundel « Ajouter » en bas d’Historique → écran `histoAjoutV2Overlay`.
- Recherche d’un vin par NOM (dans `ALL_DATA`, dédupliqué par `cleVinV2`), puis plat + note (verres 1-5) + Accords (catégories `CONFIG.accords`).
- Enregistre via backend `ajouterHistoriqueManuel(codebarre, plat, note)` (retrouve nom/SAQ/row, écrit la ligne). Les Accords sont ajoutés au VIN via `updateWineField` (champ Accords), comme Boire.
- `ajouterHistoriqueManuel` exposée dans `doPost`.

## Page Historique — mise en page

- `.histo-mets` : `width:auto` (corrige le débordement horizontal causé par la date à droite + margin-left 60px).
- Bande de couleur du vin EN HAUT de la carte vin (`.histo-vin` border-top coloré) = sert de séparateur entre groupes. Uniquement l’historique.

## Fond fixe entre pages

- `.modal-v2-fullscreen` en `width:100%` (plus `100vw`) : évite le décalage du fond vers la gauche quand la barre de défilement apparaît sur une page longue.

## Règle de travail

- Une seule paire Trouve/Remplace par message, OK entre chaque (OK = déjà appliqué). Trouve copié EXACT. Aucune classe `.emp-*` inventée sans accord ; réutiliser l’existant.