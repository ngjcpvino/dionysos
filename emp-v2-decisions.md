# 📍 Page EMPLACEMENTS V2 — décisions FIGÉES (NE PAS REDÉCIDER, NE PAS REDISCUTER)

> Représentation GRAPHIQUE stylisée d'un cellier. Pas une photo, pas une liste de cartes.
> iPhone d'abord. Tout est tranché ci-dessous. Au prochain travail : on CODE, on ne rediscute pas.

## Squelette existant (à GARDER tel quel)
- Conteneur `#empV2Container`, corps `#empV2-cartes`, compte `#empV2-compte`.
- Filtres en cascade Meuble → Rangée → Espace (déjà codés : `remplirFiltresEmpV2`, `choisirFiltreEmpV2`).
- Loupe, X, panneau filtres, boutons Vins en double / Cépages : INCHANGÉS.
- SEUL le rendu du corps (`afficherEmpV2`) change.

## Données réelles (fixes)
- 3 meubles : Cellier, Pigeonnier, Réserve. Source = `CONFIG.meubles[meuble][rangee]`.
- Espaces par rangée : Cellier = 5, 7, 4 (rangées 1-2-3). Pigeonnier = toutes à 4. Réserve = 5.
- Aucun meuble choisi au filtre → on voit les 3 meubles l'un sous l'autre.

## Métaphore
- Bouteilles couchées = on voit les CULS = des RONDS.
- Le ROND = la classe existante `.cercle` (anneau or + fond sombre, exactement comme le bouton ✕). RIEN d'autre.
- Le meuble = ses rangées empilées verticalement.

## Rangée FERMÉE (état de départ)
- Que des ronds. AUCUNE photo, AUCUN numéro, AUCUNE couleur.
- Petits ronds, une SEULE ligne. PAS de quinconce visible.
- En-tête meuble = titre discret (`.titre-2`). PAS de sticky (jugé laid).
- Titre rangée = `.titre-3`. Compte occupés/total à droite (ex. 3/5).

## Rangée TIRÉE (une seule à la fois)
- Tirer une rangée referme les autres. Re-tirer la referme.
- Ronds plus GROS, avec la PHOTO du vin recadrée dans le rond.
- Rangée de 7 = quinconce 4 bas + 3 haut. Les 3 du haut sont CENTRÉS SUR LES CREUX du bas (pas à l'extérieur, pas empilés au centre). Ne PAS chevaucher les ronds du bas.
- 4 ou 5 espaces = une seule ligne. Largeur max = 5 ronds, jamais plus large à l'écran.

## Classe de ligne de ronds (DÉCIDÉE)
- UNE seule classe générique `.ligne-ronds` : ligne flex centrée, écart régulier, s'adapte au nombre de ronds (4, 5 ou 6).
- Réutilisée à DEUX endroits : le meuble graphique ET le menu d'action après scan.
- Le menu après scan (6 ronds) = 2 lignes de 3 ronds (deux `.ligne-ronds` empilées). La grille fixe `.menu-v2-grid` est RETIRÉE et remplacée par `.ligne-ronds`.
- Le quinconce et l'agrandissement du rond tiré ne concernent QUE les Emplacements.
- Interdiction : aucune classe `.emp-*` inventée. On réutilise `.cercle`, `.titre-2`, `.titre-3`, `.contenu`, `.ligne-ronds`.

## Repli sans photo (rangée tirée)
- À TRANCHER au moment du code (non figé). Par défaut : rond `.cercle` vide.

## Action au tap d'un rond plein
- À TRANCHER au moment du code (fiche ou déplacer). Non figé.

## Ordre d'exécution prévu (quand on reprend, on CODE direct)
1. CSS `styles-v2.css` : créer `.ligne-ronds`, retirer `.menu-v2-grid`.
2. HTML `index-v2.html` : menu scan → 2 × `.ligne-ronds` (3+3).
3. JS `scripts-scanner-v2.js` : réécrire le rendu de `afficherEmpV2` (meuble graphique, ronds, quinconce 7, tirer/refermer).

## Règle de travail rappel
- Une seule paire Trouve/Remplace par message, OK entre chaque. Trouve copié EXACT du fichier.
- On ne re-décide RIEN de ce document. On exécute.
