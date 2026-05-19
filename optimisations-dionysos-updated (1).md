# 🍷 Dionysos — État du projet

*Document mis à jour le 19 mai 2026*

---

## 📁 Architecture

**Frontend** : GitHub Pages (dépôt avec `index.html`, `styles.css`, `scripts-*.js`, `images/`)
**Backend** : Google Apps Script — projet "Vino 3.0" — fichier principal `Code.gs`
**Base de données** : Google Sheets (ID `1Y4OCwcb2XBTPDTl_KDUGHgEiXgwqqXHmWSw6XQVSe3g`)

URL de l'API dans `scripts-config.js` :
```
https://script.google.com/macros/s/AKfycbxRh6eOQDUy3hXoNNKF6n6gUxhppKB452UqZuPB1mZAC_rzb1jZ5LbPsBuZDH521uq1eA/exec
```

---

## ✅ Optimisations déjà faites

### Vitesse — Cache backend
Évite de redemander les données à Google à chaque changement de vue.
- ✅ `changeView('liste')` — Cave à vin
- ✅ `chargerListeARanger()` — À ranger
- ✅ `chargerEmplacements()` — Emplacements
- ✅ `chargerListeRacheter()` — Liste d'achat

### Vitesse — Suppression des flous
- ✅ `.wine-card` — `backdrop-filter` retiré
- ✅ `.view-section::before` — flou retiré, voile noir 0.30 à la place

### Vitesse — Construction rapide des listes
Remplacement de `innerHTML +=` par `array.join('')` :
- ✅ `afficherCartes()` — Cave à vin
- ✅ `afficherListeARanger()` — À ranger
- ✅ `afficherListeRacheter()` — Liste d'achat
- ✅ `afficherHistorique()` — Historique
- ✅ `afficherEmplacements()` — Emplacements (liste filtrée)
- ✅ `afficherPromotions()` — Promotions principales
- ✅ `filtrerAutresPromos()` — Autres promotions
- ✅ Liste cépages (accueil)
- ✅ Liste appellations (accueil)
- ✅ `afficherListeACompleter()` — À compléter (même si fonction non utilisée)

### Vitesse — Fiche vin (19 mai 2026)
- ✅ **Suppression de l'appel auto à `verifierEtMettreAJourPrixSAQ`** dans `afficherFiche()` (gain 3-5×)
- ✅ **Prix cliquable** dans `fiche-prix-header` — vérification SAQ à la demande via clic

### Améliorations fonctionnelles
- ✅ Tri **alphabétique** des cépages et appellations sur l'accueil
- ✅ Comptage par **cépage principal** (premier de la liste séparée par virgules)
- ✅ **Cohérence cépage principal** dans Emplacements (cépages manquants utilisaient tous les cépages, maintenant le principal seulement) — 19 mai 2026

### Emplacements — Séparateurs de rangée (19 mai 2026)
- ✅ Ligne horizontale dorée avec label **"RANGÉE X"** à droite, insérée avant chaque nouveau groupe de bouteilles d'une même rangée
- ✅ Détection automatique du changement de meuble+rangée dans la boucle d'affichage

### Bugs corrigés (19 mai 2026)
- ✅ **`>>` en trop dans `confirm-dialog-button-primary`** (scripts-fiche.js, `afficherConfirmation`)
- ✅ **Balise `<h3>` cassée dans `toggleEditMode`** — manquait `>` après `style="margin-top:20px;"`
- ✅ **Bouton SUPPRIMER cassé dans `toggleEditMode`** — manquait `>` après `font-size:12px;"`
- ✅ **Bouton GO bloqué quand emplacement occupé** (scripts-scanner.js, `checkEmplacementDispo`) — réactivation ajoutée dans la branche "Libre"

### Protection démarrage CONFIG (19 mai 2026) ✅
- ✅ `getConfig` chargé **avant** `chargerInventaire` (séquentiel au lieu de parallèle)
- ✅ Spinner affiché en continu pendant le chargement de CONFIG → impossible de cliquer
- ✅ Si `getConfig` échoue, l'inventaire est quand même chargé (mode dégradé)
- ✅ Plus de risque de crash sur `CONFIG.meubles[...]` ou `CONFIG.accords` au démarrage

### Spinner thématique + anti double-clic (19 mai 2026)
**Système complet déployé en V1.**

**Architecture :**
- ✅ `appelBackend()` modifié pour accepter un 3e paramètre optionnel `{ spinner: 'texte' }`
- ✅ Overlay plein écran avec verre de vin animé (rempli/vidé en boucle, 3.5s)
- ✅ Texte contextuel doré qui change selon l'action
- ✅ **Anti double-clic automatique** : l'overlay bloque tous les clics pendant l'appel
- ✅ Injection CSS et HTML en JS au premier usage (pas de modif `styles.css` ni `index.html`)
- ✅ Helpers `_afficherSpinner(texte)` et `_cacherSpinner()` dans `scripts-config.js`

**20 actions migrées :**

*scripts-fiche.js :*
- ✅ Ouverture fiche vin (`getWineBottles`) — "Décantation..."
- ✅ Lookup code SAQ → code-barres (`getCodeBarresFromCodeSAQ`) — "Décantation..."
- ✅ Boire bouteille (`actionBouteille` action boire) — "Service en cours..."
- ✅ Déplacer bouteille (`actionBouteille` action deplacer) — "Déplacement..."
- ✅ Mettre à ranger (`mettreBotteilleARanger`) — "Mise à ranger..."
- ✅ Ajouter bouteille (`addBottle`) — "Mise en cave..."
- ✅ Supprimer bouteille (`supprimerBouteille`) — "Suppression..."
- ✅ Sauvegarder fiche (`saveWineEdits`) — "Sauvegarde..."
- ✅ Toggle Aimé (`updateWineField` Racheter) — "Sauvegarde..."
- ✅ Toggle Panier (`updateWineField` Panier) — "Sauvegarde..."
- ✅ Toggle Accords (`updateWineField` Accords) — "Sauvegarde..."
- ✅ Recherche succursales avec GPS (`getSuccursalesDisponibles`) — "Recherche succursales..."
- ✅ Recherche succursales sans GPS (`getSuccursalesDisponibles`) — "Recherche succursales..."
- ✅ Vérification prix SAQ (`verifierEtMettreAJourPrixSAQ`) — "Vérification prix SAQ..."

*scripts-scanner.js :*
- ✅ Recherche produit SAQ (`chercherProduitSAQ_GRAPHQL_V1`) — "Recherche SAQ..."
- ✅ Ajouter vin avec SAQ trouvé (`ajouterVinAvecBouteilles`) — "Enregistrement..."
- ✅ Ajouter vin sans SAQ (`ajouterVinAvecBouteilles`) — "Enregistrement..."

*scripts-listes.js :*
- ✅ Ajouter succursale (`ajouterSuccursale`) — "Ajout succursale..."
- ✅ Chargement inventaire pour vues secondaires (`getInventoryData` ×3) — "Décantation..."

*scripts-inventaire.js :*
- ✅ Chargement inventaire Cave à vin (`getInventoryData`) — "Décantation..."
- ✅ Chargement historique (`getHistorique`) — "Décantation..."

**Restent à migrer si besoin (valeur décroissante) :**
- `checkWineExists` (lookup rapide après scan) — déjà couvert en aval par `ouvrirFicheVin`
- `verifierDispoSAQ_GRAPHQL_V1` en lot dans liste d'achat — cas complexe (appels parallèles)
- `completeScannedWine` — fonction marquée comme code mort
- `marquerBouteilleBue` — fonction dead code (non appelée)

---

## 🎭 Refonte des modales — Immersion totale

**Vision** : les modales doivent donner l'impression d'une **nouvelle page**, pas d'une fenêtre flottante.

**Caractéristiques** :
- **100% largeur, 100% hauteur** (optimisé iPhone, 95% de l'usage)
- **Fond identique** à celui du site (même image + voile noir 0.30)
- Aucune transition visuelle perceptible entre l'app et le modal
- Pas de marge en haut, pas de max-width
- Bouton fermer (✕) bien visible

**Modales concernées (à refaire dans ce style)** :
- Fiche vin (actuellement avec margin top + max-width)
- Modal Déplacer (nouveau, partagé entre scan et "À ranger")
- Modal Boire (nouveau, depuis le scan)
- Modal Donner (nouveau, depuis le scan)
- Modal Arrivée SAQ (nouveau, depuis le scan)
- Modal Menu d'action scan (4 boutons)
- Popup "Édition fiche"
- Popup "Compléter vin scanné" (si conservé)
- Confirm overlay
- Modal édition plat dans historique (nouveau)
- Modal ajout dégustation passée (nouveau)

**À faire** :
- [ ] Créer une **classe CSS commune** pour ce nouveau style de modale plein écran
- [ ] Adapter `.fichevin-overlay` / `.fichevin-window` et `.overlay-popup` / `.popup-window`
- [ ] S'assurer que le contenu reste scrollable à l'intérieur
- [ ] Vérifier que la fermeture (swipe / bouton) fonctionne bien sur iPhone

---

## 🗂️ Vue "À ranger" — Modal Déplacer direct

Actuellement : clic sur une carte → ouverture de la fiche du vin → clic sur "Déplacer" → modal d'emplacement.

**Changement** : clic sur une carte → ouverture **directe** du modal Déplacer (sans passer par la fiche).

**Le modal utilisé sera le MÊME que celui créé pour le nouveau flux de scan** (cohérence d'interface) :
- Affiche les emplacements actuels des autres bouteilles du même vin (si plusieurs)
- Dropdowns Meuble / Rangée / Espace
- Vérification Libre/Occupé (bug déjà corrigé ✅)
- Boutons Confirmer / Annuler

**À faire** :
- [ ] Une fois le modal du scan créé (chantier scan), modifier `afficherListeARanger()` pour appeler directement le modal au clic, au lieu d'ouvrir la fiche
- [ ] S'assurer que le modal est réutilisable depuis plusieurs contextes (scan, à ranger, fiche)

---

## 🛒 Liste d'achat — Améliorations (terminé 19 mai 2026) ✅

### ✅ Nouveaux filtres
3 filtres ajoutés pour la liste d'achat (avec cascade) :
- **Couleur** (dropdown)
- **Pays** (dropdown) — restreint selon la couleur
- **Cépage** (dropdown) — restreint selon la couleur + pays
- Bouton ✕ pour réinitialiser

### ✅ Refonte dropdown succursale
- `+ Ajouter une succursale` intégré comme **dernière option** du dropdown
- Au clic → ouvre le formulaire d'ajout existant
- Bouton externe `#btn-ajouter-succursale` supprimé
- Bouton ANNULER du formulaire corrigé (ferme le form + reset le dropdown)
- Fonctions modifiées : `chargerListeRacheter`, `lancerVerificationGraphQL`, `sauvegarderSuccursale`
- Nouvelles fonctions : `remplirFiltresRacheter`, `appliquerFiltresRacheter`, `reinitialiserFiltresRacheter`

---

## 📜 Historique — Améliorations (V2)

À traiter pendant les gros chantiers V2 (refonte modales / uniformisation design).

### Filtre Accord
- Filtre **Accord** (dropdown) placé **avant** la barre de recherche par plat
- Valeurs du dropdown : liste des accords venant de la sheet `config` (colonne "Accords")
- Comportement en cascade :
  - Rien sélectionné dans Accord → recherche par plat sur tout l'historique (comportement actuel)
  - Un accord sélectionné → recherche par plat **uniquement parmi les vins ayant cet accord** dans leur champ Accords (multi-valeurs)

### Bordure plats trop fine
Actuellement `border-left: 1px solid` dans `genererCardVin` (option `mets`) — à peine visible.
- Passer à **2px** (même largeur que la bordure des cartes de vin `.wine-card`)

### Plat cliquable → modal d'édition
Au clic sur un plat dans l'historique → ouvrir un modal modifiable.
- Modal avec champs : plat, note d'accord (verres 🍷)
- Champs supplémentaires à définir plus tard (préparer la structure)
- **Pas de suppression** pour l'instant
- Sauvegarder via nouveau endpoint backend (ex: `modifierEntreeHistorique`)

### Ajout manuel d'historique (pour les vins du passé)
**Cas d'usage** : entrer dans l'app des dégustations notées dans un carnet papier avant l'app.

- Bouton **"Ajouter une dégustation passée"** dans la **fiche du vin**, section historique
- Disponible pour **n'importe quel vin** de la cave (peu importe si bouteilles en stock ou non)
- Modal de saisie : plat, note d'accord, **date** (pour entrer une date passée), peut-être un champ "Note libre"
- Le même modal réutilisé pour ajout que pour édition (à voir)
- Backend : nouvel endpoint ou réutiliser `enregistrerHistorique` avec date personnalisable

---

## 🐛 Bugs et bizarreries restants

### 🟡 Code mort à nettoyer (un jour)
1. **`addBottle` dans Code.gs** : ligne `newRow[REF_COLS.PANIER] = "";` après le `return` — jamais exécutée.
2. **`saveFiche()` dupliquée dans Code.gs** : code frontend collé par erreur dans le backend (utilise `document.getElementById` et `google.script.run` qui n'existent pas côté GAS).
3. **Fonctions inutilisées dans Code.gs** : `findCodeSAQFromBarcode`, `tryFindCodeSAQ`, `testScrapingSAQ`, `saveScrapedDataToVino`, `getReferenceVinByCode`, `ajouterCodeSAQ`, `saveScannedWine` — aucune n'est dans le `doPost`. Restes d'anciennes versions.
4. **`view-completer` dans index.html** : code mort (fonction "À compléter" plus utilisée).
5. **`styles - Copie.css` dans le dépôt GitHub** : sauvegarde inutilisée.
6. **`marquerBouteilleBue` dans scripts-fiche.js** : fonction non appelée.

### 🟢 Risques mineurs
7. **Champ "Racheter" vs "Aimé"** : nommage incohérent entre backend (`AIME`) et frontend (`Racheter`). Confus mais fonctionne.

---

## 🎯 GROS CHANTIER À VENIR — Refonte du scan

### Décision prise
Le scan actuel porte à confusion. On va refaire **en parallèle** (sans toucher à l'existant) :
- Ajouter un **nouveau bouton scan** dans le HTML (l'ancien reste intact)
- Nouvelles fonctions avec leurs **propres noms**
- Nouveaux popups avec leurs **propres IDs HTML**
- Côté backend, **ajouter** sans réécrire
- Quand le nouveau scan sera 100% confiant → on supprimera l'ancien

### Spécifications du nouveau flux

**Au scan d'un code-barres :**

**Si vin EXISTE** → Popup avec :
- Nom du vin + code-barres scanné visibles
- 5 boutons : **Visualiser la fiche** / **Arrivée SAQ** / **Déplacer** / **Boire** / **Donner**
- Bouton Annuler

**Si vin N'EXISTE PAS** → Va direct au flux "Arrivée SAQ" avec :
- Code-barres scanné bien visible en haut (scan parfois peu fiable, faut vérifier)
- Recherche SAQ automatique
- Choix d'emplacement

### Les 5 flux d'action

**1. Visualiser la fiche**
- Ouvre simplement la fiche vin existante (comportement actuel de l'ouverture de fiche)
- Permet de consulter notes, accords, dégustation, emplacements, etc. sans action

**2. Arrivée SAQ (vin existant)**
- Modal emplacement (dropdowns Meuble / Rangée / Espace)
- Affiche les emplacements actuels des autres bouteilles du même vin (pour guider le choix)
- Vérification Libre/Occupé (bug déjà corrigé ✅)
- Ajoute une nouvelle bouteille

**3. Déplacer**
- Liste les bouteilles avec leurs emplacements actuels
- Choisir laquelle déplacer
- Dropdowns du nouvel emplacement
- Confirmer

**4. Boire**
- Liste les bouteilles avec leurs emplacements
- Choisir laquelle on boit (toujours afficher, même si 1 seule bouteille — plus pro)
- Champs : Plat, Verres 🍷 (1-5), Accords, Aimé (Oui/Non)
- "Santé !"

**5. Donner**
- Liste les bouteilles avec leurs emplacements
- Choisir laquelle on donne (toujours afficher, même si 1 seule)
- Confirmer
- Nouveau statut **"Donné"** (à ajouter)
- Emplacement vidé (Meuble/Rangée/Espace effacés)
- Date de sortie enregistrée
- **Fiche du vin conservée** (jamais supprimée, même si 0 bouteille)
- Pas d'historique (contrairement à "Boire")

### Travail à faire pour la refonte

**Backend (`Code.gs`)** :
- [ ] Ajouter le cas `"donner"` dans `actionBouteille()`
  - Statut "Donné"
  - Vider Meuble/Rangée/Espace
  - Remplir Date sortie

**Frontend** :
- [ ] Ajouter un **nouveau bouton scan** dans `index.html` (header), à côté de l'ancien
- [ ] Créer une nouvelle fonction `startScanV2()` dans un nouveau fichier ou dans `scripts-scanner.js` (à décider)
- [ ] Créer le popup "Menu d'action" (4 boutons) avec son propre ID HTML
- [ ] Créer les 5 modales d'action :
  - Visualiser la fiche (réutilise la fiche existante)
  - Arrivée SAQ (vin existant)
  - Déplacer
  - Boire
  - Donner
- [ ] Pour le flux "vin n'existe pas" : popup amélioré avec code-barres bien visible

---

## 🔄 Méthode de travail pour la V2

**Principe** : développer la V2 **en parallèle** dans les mêmes fichiers, sans rien casser. Switch facile au moment voulu.

### Frontend
- Créer les nouveaux fichiers avec suffixe **V2** :
  - `indexV2.html`
  - `scripts-fiche-V2.js`
  - `scripts-scanner-V2.js`
  - etc.
- Toutes les nouvelles fonctions ont le suffixe **V2** (ex: `ouvrirFicheVinV2()`, `startScannerV2()`)
- Ajouter un **nouveau bouton dans le HTML** pour tester la V2 sans toucher à la V1

### Backend (`Code.gs`)
Écrire les nouvelles fonctions entourées de **gros séparateurs commentés** :

```javascript
// ============================================
// ====== V2 - À CONSERVER APRÈS SWITCH ========
// ============================================

function nouvelleFonctionV2() { ... }
function autreFonctionV2() { ... }

// ============================================
// === FIN V2 - SUPPRIMER TOUT EN HAUT APRÈS ==
// ============================================
```

### Au moment du switch
1. Renommer `index.html` → `indexOLD.html`
2. Renommer `indexV2.html` → `index.html`
3. Supprimer les fichiers V1 inutilisés
4. Retirer les suffixes V2 des nouveaux fichiers
5. Dans `Code.gs` : supprimer tout ce qui est **avant** le séparateur "V2 - À CONSERVER"
6. Retirer les suffixes V2 des fonctions backend

### Avantages
- Tout dans le même dépôt (pas de duplication)
- Switch facile (renommer fichiers + supprimer V1)
- Test en parallèle possible via le nouveau bouton

### Préférences à respecter pendant le développement V2
- **Aucun Claude futur ne doit toucher au code V1 existant**
- Tout nouveau code = nouveau fichier ou nouvelle fonction avec suffixe V2
- Tout dans le backend = entre les séparateurs commentés

---

## 🍾 GROS CHANTIER VISUEL — Photo de bouteille sur toutes les cartes

**Motivation** : reconnaître les vins par leur étiquette est instantané pour un visuel. C'est même comme ça que la SAQ vend.

**Constat** : la photo existe déjà dans les données (champ `Photo URL` scrapé de la SAQ, colonne AH).

**Vision** : intégrer la photo de la bouteille **dans toutes les cartes de vin du site**, pas seulement dans la fiche détaillée.

**Vues concernées** (toutes celles qui utilisent `genererCardVin`) :
- Cave à vin
- À ranger
- Liste d'achat
- Emplacements
- Historique
- Sections "vins en double", "cépages manquants" dans Emplacements
- Résultats de recherche avancée

**Défis à résoudre** :
- Comment intégrer une photo sans alourdir le scroll ?
- Quelle taille (assez grande pour reconnaître, assez petite pour rester compact) ?
- Que faire si la photo n'existe pas (vins ajoutés manuellement) ? → placeholder ? icône ?
- Charger les photos en lazy-load pour ne pas ralentir l'affichage initial ?

**À faire** (réflexion à venir) :
- [ ] Définir le nouveau layout des cartes (photo à gauche / droite / fond ?)
- [ ] Définir la taille standard de la photo
- [ ] Prévoir un placeholder pour les vins sans photo
- [ ] Implémenter du lazy-loading pour les images
- [ ] Modifier `genererCardVin` pour inclure la photo
- [ ] Mettre à jour le CSS pour tous les types de cartes
- [ ] Tester la performance sur iPhone avec beaucoup de cartes

**Lien avec** : chantier "Uniformisation du design" (les cartes seront repensées en cohérence avec le nouveau look basé sur À ranger / Historique).

---

## 🎨 GROS CHANTIER À FAIRE — Uniformisation du design

**Problème identifié** : boutons, lignes, bordures, paddings, font-size **incohérents** d'une vue à l'autre. Cause : styles inline partout dans le HTML et les fichiers JS au lieu de classes CSS partagées.

### Vision : prendre "À ranger" et "Historique" comme base
Ces deux vues ont un visuel qui plaît. **Tout le site doit ressembler à ça** : cohérent, harmonieux, semi-transparent (on voit l'image de fond), sans alternance entre zones très sombres et zones pâles.

### Étape préalable (à faire avant de réécrire le CSS)
Faire l'**inventaire des niveaux visuels** vue par vue pour comprendre la hiérarchie souhaitée.

Exemple dans Historique on a 2 niveaux :
- **Niveau 1** : la carte du vin (fond `rgba(0,0,0,0.50)`)
- **Niveau 2** : les plats à l'intérieur de la carte (fond `rgba(255,255,255,0.05)`, plus léger)

Vues à analyser :
- [ ] Accueil
- [ ] Cave à vin
- [ ] Liste d'achat
- [ ] Promotions
- [ ] À ranger ← référence
- [ ] Emplacements
- [ ] Recherche avancée
- [ ] Historique ← référence
- [ ] Fiche vin
- [ ] Toutes les modales

Pour chaque vue, noter :
- Combien de niveaux visuels
- Quel fond pour chaque niveau
- Quelles bordures
- Quels boutons

### Où sont les styles inline (à nettoyer)
- `index.html` : nombreux `style="..."` éparpillés
- `scripts-fiche.js` : **le pire** — toute la fiche vin, mode édition, modales déplacer/boire, boutons aimé/panier
- `scripts-listes.js` : sections vins en double, cépages manquants, doublons, popup succursales
- `scripts-scanner.js` : popup nom du vin, champs emplacements

### À faire
- [ ] Inventaire complet des niveaux visuels (étape préalable)
- [ ] Créer des classes CSS pour les patterns répétés :
  - Boutons d'action de formulaire (`flex:1;height:36px;font-size:12px;padding:0 10px;`)
  - Blocs d'action dans la fiche (déplacer, boire, donner)
  - Boutons toggle (aimé, panier)
  - Cartes de sous-listes (cépages manquants, doublons, etc.)
- [ ] Définir les niveaux visuels standards (Niveau 1, Niveau 2, etc.) avec leurs fonds/bordures
- [ ] Remplacer les styles inline par ces classes
- [ ] Vérifier la cohérence visuelle de toutes les vues
- [ ] Harmoniser le fond des modales avec celui du site (lien avec le chantier "Refonte des modales")

**Pas urgent pour la performance**, mais essentiel pour la maintenabilité et la cohérence visuelle.

---

## 🚧 Autres optimisations possibles (plus tard)

### 1. Chargement à la demande du scanner Quagga
**Problème** : Quagga (~150 KB) chargé au démarrage même sans scanner.
**Solution** : charger Quagga uniquement au clic sur scan.
**Gain estimé** : -150 KB au démarrage.

### 2. Réduction de l'image de fond Unsplash
**Problème** : ~200-400 KB téléchargée à chaque ouverture.
**Solutions** : réduire la taille, héberger localement, ou compresser.
**Gain estimé** : -200 KB au démarrage.

### 3. Cache des succursales et promotions
**Problème** : `getSuccursales`, `getToutesSuccursales`, `getPromotionsSAQ` rappelés à chaque visite.
**Solution** : appliquer le même cache que pour `ALL_DATA`.

### 4. Géolocalisation en cache
**Problème** : position GPS redemandée à chaque clic.
**Solution** : mémoriser pendant 5-10 minutes.

### 5. Fusion des fichiers JS
**Problème** : 6 fichiers = 6 requêtes HTTP au démarrage.
**Solution** : fusionner en 1 ou 2 fichiers.
**Note** : impact modéré avec HTTP/2.

### 6. Optimisation des filtres
**Problème** : `remplirFiltres()` reconstruit tous les `<option>` à chaque clic.
**Solution** : ne reconstruire que ce qui change.

### 7. Spinner pour appels parallèles `verifierDispoSAQ_GRAPHQL_V1`
**Problème** : la vérification dispo en lot dans la liste d'achat n'a pas de spinner.
**Solution** : cas complexe avec appels parallèles, gérer un compteur global.

---

## 📋 Préférences utilisateur (à TOUJOURS respecter)

- **Ne jamais coder sans autorisation**
- **Les changements se font UNIQUEMENT par trouve-et-remplace, un à la fois**
- **Attendre un OK avant de continuer**
- **Pas de proposition de solution sans analyse complète**
- **Travailler en parallèle, ne pas casser le travail existant** (ajouter à côté, ne pas réécrire)
- **Ne pas être redondant** dans les réponses (pas répéter les instructions à chaque trouve-et-remplace)
- **Ne pas regarder le code** — l'utilisateur fait du copier-coller, pas de lecture
- **Notepad++** est l'éditeur utilisé
- Détester les choix de réponse multiple
- Préfère des réponses **courtes et directes** (Claude jase trop)

---

## 📂 Fichiers du projet

### Frontend (GitHub Pages)
| Fichier | Rôle |
|---|---|
| `index.html` | Structure HTML, 9 vues |
| `styles.css` | Design sombre/doré |
| `scripts-config.js` | URL backend + `appelBackend()` + système spinner |
| `scripts-init.js` | Variables globales, navigation, menu |
| `scripts-inventaire.js` | Données, filtres, cartes, stats accueil |
| `scripts-fiche.js` | Fiche vin détaillée + mode édition |
| `scripts-scanner.js` | Scan Quagga + popup nouveau vin |
| `scripts-listes.js` | Vues secondaires + emplacements + promos |

### Backend (Google Apps Script)
- `Code.gs` — toutes les fonctions backend
- `Index.html`, `scripts-clean.html`, `Styles.html`, `Références.html`, `memoire.html` — **anciennes versions inutilisées**

### Google Sheets — onglets
- `Vino` — données des vins (1 ligne = 1 vin, jusqu'à 5 bouteilles par vin)
- `Historique` — vins bus avec plat + accord
- `config` (ou `CONFIG`) — couleurs, cépages, pays, meubles, accords, succursales
- `Vins scannés` — vins scannés sans code SAQ (fonction non utilisée)

---

*Document à mettre à jour au fur et à mesure de l'avancement.*
