# 🐛 AUDIT NAVIGATION & Z-INDEX V2 (analyse action par action — rien corrigé)

## ⛔ BUG Nº0 — V1 ET V2 NE SONT PAS SÉPARÉS (cause de presque tout)

Confirmé par les balises `<script>` de `index.html` (V1) :

```
scripts-config.js, scripts-init.js, scripts-inventaire.js, scripts-fiche.js,
scripts-scanner.js, scripts-scanner-V2.js, scripts-fiche-V2.js, scripts-listes.js
```

- `index.html` (V1) CHARGE du V2 : `scripts-scanner-V2.js` + `scripts-fiche-V2.js`.
- MAIS ne charge PAS `scripts-socle-v2.js` → dans V1, le code V2 tourne sans son socle (utilise `appelBackend`, `CONFIG`, `ALL_DATA` de V1). Marche par accident, casse dès divergence.
- `index.html` contient AUSSI du HTML V2 : `menuActionV2Overlay`, `ficheV2Overlay`, `scannerV2Container`, menu d’action en `.menu-v2-circle`.
- **CASSE DES NOMS DE FICHIERS** : V1 charge `scripts-scanner-V2.js` (V MAJUSCULE) ; `index-v2.html` charge `scripts-scanner-v2.js` (v minuscule). Sur GitHub Pages (sensible à la casse) = potentiellement DEUX fichiers différents ou un 404. Risque de deux copies désynchronisées.
- `doGet` sert `Index` (templated) — PAS vu lequel des deux HTML est publié. À confirmer.

### Conséquences directes

- Si les deux jeux de variables `let` (V1 `scripts-init.js` + V2 `scripts-socle-v2.js`) chargent ensemble → `SyntaxError` fatale (CONFIG, ALL_DATA, CURRENT_WINE_*, FICHE_V2_PROVENANCE déclarés 2×) + deux `window.onload` qui s’écrasent. (Aujourd’hui évité UNIQUEMENT parce que `index.html` ne charge pas `scripts-socle-v2.js` — équilibre fragile.)
- `menuActionV2Overlay` en double (id identique dans les 2 HTML).

### Correctif Nº0 (priorité absolue, avant tout le reste)

- Décider quel HTML est l’app publiée.
- Si V1 reste en service : RETIRER de `index.html` toute trace de V2 (les 2 `<script>` V2 + les blocs HTML V2). V1 redevient pur V1.
- V2 (`index-v2.html`) ne charge QUE : socle-v2, scanner-v2, fiche-v2 (déjà le cas). Uniformiser la casse des noms de fichiers (tout minuscule).

-----

## CAUSE RACINE Nº1 (dans V2)

Aucune fonction ne fait « cacher TOUTES les pages, puis montrer celle-ci ». Chaque `ouvrir...V2` se contente de mettre SA page en `display:flex`, et chaque `fermer...V2` cache la sienne au cas par cas. Quand on saute d’une page à l’autre (surtout par le burger), l’ancienne reste affichée DESSOUS. Comme toutes les pages sont au même z-index 9999, ça se superpose. → C’est l’origine du « problème de z-index » ressenti.

## SÉPARATION V1 / V2 (rappel cadre)

V1 (`index.html`) et V2 (`index-v2.html`) doivent vivre SÉPARÉMENT. V1 reste l’app en service tant que V2 n’est pas finie. Donc : tout élément V2 doit être confiné à `index-v2.html`. Le bloc `menuActionV2Overlay` présent dans `index.html` est une fuite de V2 dans V1 → à retirer de V1.

## BUGS DE NAVIGATION (confirmés par lecture)

### A. Le burger n’ouvre pas une page propre

`burgerV2Click` → `ouvrirCaveV2` / `ouvrirEmpV2` / `ouvrirHistoV2` / `ouvrirAchatV2` / `ouvrirARangerV2`. AUCUNE ne cache les autres avant de s’afficher. Ouvrir une 2e page laisse la 1re dessous.

### B. `burgerV2Click('accueil')` ne cache que la Cave

`['caveV2Container'].forEach(display=none)` seulement. Depuis Historique/Emplacements/Achat/À ranger, « Accueil » les laisse ouvertes.

### C. Burger incomplet

‘recherche’, ‘promotions’ → « À venir ». ‘accueil’ incomplet (B).

### D. Retours incohérents après une page vin

- `fermerDeplacerV2` : gère retour ‘aranger’ (→ À ranger) et ‘emplacements’ (→ Emplacements), sinon rouvre le menu d’action. ✅
- `fermerArriveeV2`, `fermerBoireV2`, `fermerDonnerV2` : rouvrent TOUJOURS le menu d’action, même si on venait d’À ranger / Emplacements. ⚠️ incohérent avec Déplacer.

### E. `deplacerDepuis...` appellent `ouvrirDeplacerV2()` direct

`deplacerDepuisEmpV2` et `deplacerDepuisARangerV2` cachent leur page puis `ouvrirDeplacerV2()` (l’ancien `ouvrirApresTap` a disparu dans la version actuelle). À vérifier : pas de double affichage / timing.

### F. `retourAccueilV2` (chemin d’ERREUR) incomplet

Cache une liste FIXE : scannerV2, saisieManuelleV2, vinInconnuV2, menuActionV2, arriveeV2, deplacerV2, boireV2, donnerV2, caveV2, editFicheV2, ficheV2.
MANQUENT : histoV2Container, empV2Container, achatV2Container, aRangerV2Container, histoEditV2Overlay, histoAjoutV2Overlay. → après erreur sur ces pages, elles restent ouvertes.

## BUGS Z-INDEX / CSS

### G. Toutes les `.modal-v2-fullscreen` au même z-index 9999

Pas de hiérarchie. Avec A/B, superposition au hasard de l’ordre HTML.

### H. Contradiction CSS sur le menu d’action

`.modal-v2-fullscreen { z-index:9999 }` mais `#menuActionV2Overlay { z-index:10010 }`. Le menu d’action passe donc au-dessus de tout, même quand il devrait être fermé/derrière.

### I. Boutons `position: fixed` au-dessus de tout

`.btn-fermer` (✕) z-index 10002 ; loupes `#caveV2-loupe,#achatV2-loupe,#empV2-loupe,#histoV2-loupe` z-index 10002. Étant `fixed` sur le viewport, ils ne disparaissent pas avec une page mal cachée → ✕/loupe d’une page « fantôme » cliquables par-dessus la page visible.

### J. Doublon d’`id` `menuActionV2Overlay` (V1+V2)

Si jamais les deux DOM coexistent, `getElementById` prend le premier. (Lié à la séparation V1/V2 — point cadre.)

## PLAN DE CORRECTION (1 changement / OK, dans l’ordre)

1. Retirer `menuActionV2Overlay` de `index.html` (nettoyer V1 de V2).
1. Créer `cacherToutesPagesV2()` (cache TOUS les conteneurs/overlays V2) et l’appeler au début de CHAQUE `ouvrir...V2` + au début de `burgerV2Click` (sauf refresh).
1. Compléter `retourAccueilV2` avec la liste complète (réutiliser `cacherToutesPagesV2`).
1. Hiérarchie z-index par niveaux : fond 9000 ; fiche 9300 ; pages vin 9400 ; menu action 9500 ; overlays histoEdit/histoAjout 9600 ; scan/saisie/inconnu 9700. Retirer la contradiction H.
1. Boutons ✕/loupe : les rendre enfants réellement masqués avec leur page (ou `absolute` dans `.modal-v2-content`) pour qu’ils ne flottent plus.
1. Uniformiser les retours D (Arrivée/Boire/Donner gèrent aussi ‘aranger’/‘emplacements’ comme Déplacer).
1. Compléter le burger C (accueil cache tout ; recherche/promotions à définir).

## À TRANCHER AVANT DE CODER (ne pas décider seul)

- Le burger pendant une page vin/fiche ouverte : tout fermer d’abord ? (recommandé oui)
- ‘accueil’ du burger = revenir à l’écran DIONYSOS (cacher tout) ? (recommandé oui)

-----

# 🎨 AUDIT VISUEL — classes en double, non-uniformité, ligne directrice

## Ligne directrice (rappel) : titres BLANCS, jamais en or. Même gabarit partout.

## K. Classes mortes (créées puis abandonnées, encore en CSS)

- `.modal-v2-winename` / `.modal-v2-codebarre` : retirées des pages vin (remplacées par `.titre-1` + `.texte-secondaire`), MAIS encore utilisées par `histoEditV2-vin` et le menu d’action → migration à moitié faite, incohérent.
- `.modal-v2-title` (titre OR) : utilisé UNIQUEMENT par le menu d’action (« Faites un choix »). Dernier titre or qui traîne, contre la ligne directrice.
- `.menu-v2-grid` : remplacée par `.ligne-ronds`, règle CSS encore présente (morte).
- `.menu-v2-circle` : dans `styles.css` (V1) ET CSS V2, utilisée nulle part.

## L. Ligne directrice non respectée

- MENU D’ACTION = seule page restée à l’ancien style : titre OR (`.modal-v2-title`), nom en `.modal-v2-winename`, code-barres affiché. Pas le gabarit commun (nom en capitales + action en blanc).
- `.titre-2` est défini en OR. Or on s’en sert comme « titre d’action » (Boire/Donner/Ajouter/Déplacer/Corriger) via un `style="text-align:center"` inline → ces titres s’affichent en OR, pas en blanc. ⚠️ contredit ce qu’on voulait (action en titre blanc).
- Titres d’action posés en `style` inline (`text-align:center`) répété ~5 fois au lieu d’une classe.

## M. Doublons V1 / V2 (mêmes classes définies 2 fois)

- `.modale-haut`, `.btn-fermer`, `.titre-1`, `.titre-2`, `.titre-3`, `.texte-secondaire`, `.contenu`, `.ligne-info`, `.menu-v2-circle` : définis dans `styles.css` (V1) ET `styles-v2.css` (V2).
- `.btn-fermer` DIFFÈRE entre les deux : V2 = fixed + rond + bordure or ; V1 = absolute + plat + sans fond. Selon l’ordre de chargement, l’un écrase l’autre. (Lié au cadre : V1/V2 doivent être séparés.)

## N. Cause de fond du « rien n’est uniforme »

Pas de classe unique « titre d’action de page ». On a mélangé `.modal-v2-title` (or) + `.titre-1` (blanc) + `.titre-2` (or) + inline. → aspect disparate.

## PLAN CORRECTION VISUELLE (1 changement / OK)

1. Créer UNE classe de titre d’action (ex. `.titre-action`, blanche, centrée, majuscules) et l’utiliser pour Boire/Donner/Ajouter/Déplacer/Corriger (retirer les `style` inline + ne plus détourner `.titre-2`).
1. Migrer le MENU D’ACTION au gabarit commun (nom en `.titre-1`, plus de `.modal-v2-title` ni code-barres) — ou trancher de le garder à part si voulu.
1. Migrer `histoEditV2-vin` hors de `.modal-v2-winename` (vers `.titre-1`, déjà fait pour le HTML — vérifier).
1. Supprimer les classes mortes : `.modal-v2-winename`, `.modal-v2-codebarre`, `.modal-v2-title`, `.menu-v2-grid`, `.menu-v2-circle` (une fois plus utilisées).
1. Trancher les doublons V1/V2 : V2 ne doit dépendre que de `styles-v2.css`. Vérifier que `index-v2.html` ne charge PAS `styles.css`.

## À TRANCHER (visuel)

- Le menu d’action garde-t-il « Faites un choix » comme titre, ou passe-t-il au nom du vin en capitales comme les autres ?
- Couleur exacte du titre d’action : blanc plein (`--white`) ou gris (`--white-60`) ?