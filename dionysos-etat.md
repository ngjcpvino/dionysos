# 🍷 Dionysos — État du projet (consolidé)

*À jour au 4 juin 2026*

---

## 📁 Architecture

**Frontend** : GitHub Pages (dépôt `ngjcpvino/dionysos` — `index.html`, `styles.css`, `scripts-*.js`, `images/`)
**Backend** : Google Apps Script — projet « Vino 3.0 » — fichier principal `Code.gs`
**Base de données** : Google Sheets (ID `1Y4OCwcb2XBTPDTl_KDUGHgEiXgwqqXHmWSw6XQVSe3g`)

URL de l'API (dans `scripts-config.js`) :
`https://script.google.com/macros/s/AKfycbxRh6eOQDUy3hXoNNKF6n6gUxhppKB452UqZuPB1mZAC_rzb1jZ5LbPsBuZDH521uq1eA/exec`

**Fichiers JS chargés (ordre dans index.html)** : config · init · inventaire · fiche · scanner · scanner-V2 · **fiche-V2** · listes

---

## 🎨 SYSTÈME DE DESIGN — en cours

**Règle d'or** : « un chat est un chat ». Une valeur définie à **un seul endroit** (`:root`), nommée en **français lisible**, réutilisée partout. **Avant de créer une classe, vérifier si elle existe déjà et la réutiliser.** Jamais de style en dur dans le JS, jamais de classe collée à un seul écran : tout style neuf doit être **générique et réutilisable**.

### ✅ Bordures — FAIT
Variables `:root` : largeurs (`--largeur-bordure-fine/moyenne/epaisse`), couleurs (`--couleur-bordure-or/claire/tres-claire/subtile/pale`), couleurs de vin (`--vin-rouge/blanc/rose/bulles`).
- Toutes les largeurs et couleurs de bordure variabilisées (passes globales Notepad++).
- Doré unifié en une seule teinte pleine partout (fini les opacités/rgba en dur).
- Couleurs de vin centralisées : classes `.vin-rouge/.vin-blanc/.vin-rose/.vin-bulles` (couleur + 2px), réutilisées par carte, fiche, promo. JS aligné (`genererCardVin`, fiche, `filtrerAutresPromos`).
- Bordure des plats (historique) : largeur variabilisée dans le JS, couleur dynamique conservée.

### ✅ Fond + voile — FAIT
- `--image-fond` : l'image Unsplash, définie une seule fois.
- `--voile-standard` : `rgba(0,0,0,0.40)`, appliqué partout (body, vues, modales V2). Grand écran ≥1280px aussi aligné (à revoir « plus tard » si voile blanc voulu).

### ✅ Spinner verre de vin — FAIT
- CSS sorti du JS vers `styles.css`, doré unifié, largeur de bordure variabilisée.
- Remplissage : cycle des 4 couleurs de vin en **dégradé**, une couleur par remplissage (variables `--degrade-vin-*`, animation `couleur-vin` 20s).
- JS (`scripts-config.js`) ne fait plus que créer le HTML + poser le texte.
- Étape 3 (à venir) : couleur du verre selon le vin de l'action quand connu.

### ✅ Modales V2 — classes génériques FAIT
- CSS des modales V2 sorti du JS (`scripts-scanner-V2.js`) vers `styles.css`, branché sur les variables (voile, image, doré, bordure, `--gold-20` pour le `:active`).
- Classes **génériques réutilisables** créées : `.modal-v2-fullscreen` (plein écran « nouvelle page », image + voile, scroll masqué), `.modal-v2-content`, `.modale-haut`, `.modale-fermer`, `.modale-titre`, `.modale-sous-titre`, `.modale-corps`. À réutiliser pour toutes les actions V2.

### ⏳ À convertir ensuite (mêmes principes)
- Couleurs de fond (`rgba(0,0,0,...)`, `rgba(255,255,255,...)` en dur ; dorés de fond `#c9813c` vs `rgba(230,161,0,...)` / `#e6a100` à unifier).
- Espacements / paddings en dur → variables.
- Boutons (patterns répétés).
- Sortir les styles inline restants du JS (scripts-fiche.js = le pire, puis listes, scanner).
- **À la toute fin** : supprimer variables doré inutiles (`--gold-20/30/...`) et classes `.inutile-*` une fois plus aucun usage.

---

## 🎯 SCAN V2 — état d'avancement

### Fait
- Bouton scan V2, scanner Quagga V2 (`startScannerV2`, `traiterResultatScanV2`).
- Menu d'action après scan (`#menuActionV2Overlay`, `ouvrirMenuActionV2`) : 6 cercles — 👁 Visualiser · ➕ Arrivée · ↔ Déplacer · 🍷 Boire · 🎁 Donner · ✕ Fermer.
- Contexte du vin gardé dans `menuActionV2Context` (code + données).
- **Fiche V2 (Visualiser) — en cours, ~consultation de base fonctionnelle** :
  - Nouveau fichier `scripts-fiche-V2.js` (copie allégée de la V1, V1 jamais touchée).
  - Coquille HTML `#ficheV2Overlay` (réutilise `.modal-v2-fullscreen` + classes génériques de modale).
  - `ouvrirFicheV2(codebarre, provenance)` mémorise la provenance dans `FICHE_V2_PROVENANCE` (variable globale ajoutée dans scripts-init.js).
  - `afficherFicheV2` : affiche nom + origine (pays • région • appellation) + inventaire en liste (nombre d'unités + emplacements), **lecture seule**, en réutilisant `.wine-count` et `.wine-emplacement` (aucun style neuf).
  - `fermerFicheV2` (✕) : logique de retour selon provenance — si `'menuScan'` → rouvre le menu d'action du même vin ; sinon → revient où on était.
  - Cercle 👁 branché : ouvre la fiche V2 avec provenance `'menuScan'`, en gardant le contexte.

### Logique de navigation décidée
- Le menu de scan porte **toutes les actions**. La fiche V2 est **consultation pure** (aucune action qui touche au stock — pas de boire/déplacer/ajouter dedans, contrairement à la V1).
- Seule action future permise depuis la fiche V2 : **Modifier la fiche** (édition des infos du vin, pas du stock) — à coder.
- Le ✕ revient **d'où on vient** (menu scan ou autre chemin).

### Reste à faire (fiche V2)
- Décider/ajouter le reste du corps en consultation (cépage, goût, prix, accords, aimé…) — allégé.
- Ajuster le centrage des emplacements si besoin (`.wine-emplacement` aligne à droite par défaut).
- Action « Modifier la fiche ».

### Reste à faire (autres actions V2 — chacune = nouvelle modale V2 refaite, pas la V1)
- ➕ Arrivée SAQ · ↔ Déplacer · 🍷 Boire · 🎁 Donner.
- Flux « vin n'existe pas » : popup amélioré avec code-barres visible.
- **Backend** : cas `"donner"` dans `actionBouteille()` (statut « Donné », vider Meuble/Rangée/Espace, remplir Date sortie).

### Méthode V2
Développer en parallèle, sans rien casser. Fichiers/fonctions suffixe **V2**. Backend entre séparateurs commentés `V2 - À CONSERVER`. Au switch : renommer fichiers, supprimer V1, retirer suffixes. Ne jamais toucher au code V1.

---

## ✅ Optimisations déjà faites (avant juin)

- **Cache backend** : `changeView('liste')`, `chargerListeARanger`, `chargerEmplacements`, `chargerListeRacheter`.
- **Suppression des flous** : `.wine-card` et `.view-section::before`.
- **Listes rapides** (`innerHTML +=` → `join('')`) sur toutes les vues.
- **Fiche vin** : appel auto au prix SAQ retiré (gain 3-5×), prix cliquable à la demande.
- **Fonctionnel** : tri alphabétique cépages/appellations, comptage par cépage principal, cohérence cépage principal dans Emplacements.
- **Emplacements** : séparateurs de rangée (ligne dorée + « RANGÉE X »).
- **Bugs corrigés** : `>>` dans `confirm-dialog-button-primary`, `<h3>` et bouton SUPPRIMER cassés dans `toggleEditMode`, bouton GO bloqué (`checkEmplacementDispo`).
- **Protection démarrage CONFIG** : séquentiel, spinner continu, mode dégradé.
- **Spinner + anti double-clic V1** : `appelBackend({ spinner })`, overlay bloquant, 20 actions migrées.

---

## 🎭 Refonte des modales — Immersion totale
Toutes les modales en style plein écran « nouvelle page » (image + voile standard), scroll masqué. Base déjà posée avec les classes génériques de modale V2 — à appliquer aux anciennes modales.

### Historique — à faire
- Filtre Accord (dropdown, cascade avec recherche par plat).
- Plat cliquable → modal d'édition (endpoint `modifierEntreeHistorique`).
- Ajout manuel de dégustation passée (modal plat + note + date, pour tout vin).

---

## 🐛 Bugs et code mort restants

**Code mort à nettoyer** : ligne morte dans `addBottle` · `saveFiche()` dupliquée dans Code.gs · 7 fonctions inutilisées dans Code.gs (`findCodeSAQFromBarcode`, `tryFindCodeSAQ`, `testScrapingSAQ`, `saveScrapedDataToVino`, `getReferenceVinByCode`, `ajouterCodeSAQ`, `saveScannedWine`) · `view-completer` (index.html) · `styles - Copie.css` · `marquerBouteilleBue`.

**Risque mineur** : nommage « Racheter » (frontend) vs « Aimé »/`AIME` (backend).

---

## 🍾 GROS CHANTIER VISUEL — Photo de bouteille sur toutes les cartes
La photo existe déjà (`Photo URL`, colonne AH). L'intégrer dans toutes les cartes (`genererCardVin`). À résoudre : taille, placeholder, lazy-load.

---

## 🚧 Autres optimisations possibles (plus tard)
1. Lazy-load Quagga (~150 KB).
2. Réduire l'image de fond Unsplash (~200-400 KB).
3. Cache succursales et promotions.
4. Géolocalisation en cache (5-10 min).
5. Fusion des fichiers JS.
6. Optimisation des filtres (`remplirFiltres`).
7. Spinner pour `verifierDispoSAQ_GRAPHQL_V1` en lot.

---

## 📋 Préférences utilisateur (à TOUJOURS respecter)
- Toujours chercher dans les connaissances du projet et le dépôt avant de dire qu'un fichier manque ou de poser une question.
- Ne jamais coder sans autorisation.
- Changements UNIQUEMENT par trouve-et-remplace, un à la fois, attendre un OK entre chaque. « OK » = déjà appliqué.
- Artefact seulement quand demandé, jamais pour les trouve/remplace.
- **Avant de créer un style/une classe, vérifier qu'il n'existe pas déjà et le réutiliser. Pas de nouveau style pour rien. Tout style neuf doit être générique et réutilisable.**
- Pas de solution sans analyse complète (résumée en 1-2 phrases).
- Travailler en parallèle, ne rien casser.
- Variables et noms en français lisible.
- Pas de réflexion à voix haute, pas de redondance, ne pas faire répéter l'utilisateur.
- Ne pas faire regarder/chercher le code à l'utilisateur — Claude trouve les noms de fonctions lui-même.
- Notepad++ comme éditeur, copier-coller (pas de lecture de code).
- Détester les choix multiples. Réponses courtes et directes.

---

## 📂 Fichiers du projet

**Frontend** : `index.html` (structure, 9 vues) · `styles.css` (design + variables) · `scripts-config.js` (backend + spinner) · `scripts-init.js` (globals, navigation, menu) · `scripts-inventaire.js` (données, filtres, `genererCardVin`) · `scripts-fiche.js` (fiche V1) · `scripts-scanner.js` (scan V1) · `scripts-scanner-V2.js` (scan V2 + menu action) · `scripts-fiche-V2.js` (fiche V2 consultation) · `scripts-listes.js` (vues secondaires, emplacements, promos)

**Backend (Apps Script)** : `Code.gs` · anciennes versions inutilisées (`Index.html`, `scripts-clean.html`, `Styles.html`, `Références.html`, `memoire.html`)

**Google Sheets** : `Vino` (1 ligne = 1 vin, jusqu'à 5 bouteilles) · `Historique` · `config`/`CONFIG` · `Vins scannés` (non utilisé)

---

*Document consolidé. Remplace les versions précédentes.*
