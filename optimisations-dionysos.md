# 🍷 Dionysos — État du projet

*Document mis à jour le 18 mai 2026*

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

## ✅ Optimisations déjà faites (vitesse)

### Problème #1 — Cache backend
Évite de redemander les données à Google à chaque changement de vue.
- ✅ `changeView('liste')` — Cave à vin
- ✅ `chargerListeARanger()` — À ranger
- ✅ `chargerEmplacements()` — Emplacements
- ✅ `chargerListeRacheter()` — Liste d'achat

### Problème #2 — Suppression des flous
- ✅ `.wine-card` — `backdrop-filter` retiré
- ✅ `.view-section::before` — flou retiré, voile noir 0.30 à la place

### Problème #3 — Construction rapide des listes
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

### Bonus — Améliorations fonctionnelles
- ✅ Tri **alphabétique** des cépages et appellations sur l'accueil
- ✅ Comptage par **cépage principal** (premier de la liste séparée par virgules)

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
- Vérification Libre/Occupé (avec correction du bug)
- Boutons Confirmer / Annuler

**À faire** :
- [ ] Une fois le modal du scan créé (chantier scan), modifier `afficherListeARanger()` pour appeler directement le modal au clic, au lieu d'ouvrir la fiche
- [ ] S'assurer que le modal est réutilisable depuis plusieurs contextes (scan, à ranger, fiche)

---

## 📍 Emplacements — Séparateurs de rangée

Pour faciliter le repérage visuel rapide entre les rangées d'un meuble :

**Ajout** : ligne séparatrice horizontale avec le label **"Rangée X"** au bout de la ligne, placée avant chaque groupe de bouteilles d'une même rangée.

Visuel attendu :
```
━━━━━━━━━━━━━━━━━━━━━━━ Rangée 1
[carte vin]
[carte vin]
━━━━━━━━━━━━━━━━━━━━━━━ Rangée 2
[carte vin]
```

**À faire** :
- [ ] Dans `afficherEmplacements()` (scripts-listes.js), détecter le changement de rangée dans la boucle de tri
- [ ] Insérer un séparateur HTML avant chaque nouveau groupe
- [ ] Créer une classe CSS `.emplacement-separateur-rangee` dans styles.css (ligne + texte aligné à droite)

---

## 📍 Emplacements — Cohérence cépage principal

**Problème détecté** : logiques incohérentes dans `afficherEmplacements()` :
- **Cépages manquants au Cellier/Pigeonnier** → utilise **tous les cépages** d'un vin (split par virgules)
- **Cépages en double au Cellier/Pigeonnier** → utilise le **cépage principal** seulement

**Solution** : uniformiser sur le **cépage principal** uniquement (cohérent avec l'accueil déjà modifié).

**À faire** :
- [ ] Dans `afficherEmplacements()` (scripts-listes.js), modifier la section "cépages manquants" pour utiliser uniquement le premier cépage (au lieu de la boucle `cepagesList.forEach`)
- [ ] Vérifier que le comptage reste correct après le changement

---

## 🛒 Liste d'achat — Améliorations

### Nouveaux filtres
Ajouter 3 filtres pour la liste d'achat (actuellement aucun filtre) :
- **Pays** (dropdown)
- **Couleur** (dropdown : Rouge / Blanc / Rosé / Bulles)
- **Cépage** (dropdown)

**Emplacement** : en-dessous du bloc succursale, juste avant la liste de vins.

### Refonte du dropdown succursale
Actuellement il y a un bouton séparé "+ AJOUTER UNE SUCCURSALE" sous le dropdown.

**Changement** :
- Intégrer **"+ Ajouter une succursale"** comme **dernière option** du dropdown des succursales
- Au clic sur cette option → ouvrir le formulaire d'ajout existant (dropdown "Succursales disponibles" + champs nom/numéro + boutons AJOUTER/ANNULER)
- Supprimer le bouton externe `#btn-ajouter-succursale`

**À faire** :
- [ ] Modifier `index.html` (vue `view-racheter`) pour retirer le bouton externe et ajouter les filtres
- [ ] Modifier `chargerListeRacheter()` pour remplir les nouveaux filtres
- [ ] Ajouter `appliquerFiltresRacheter()` similaire à `appliquerFiltres()` de la cave
- [ ] Modifier le dropdown succursale pour ajouter l'option "+ Ajouter une succursale" à la fin
- [ ] Modifier la logique d'ouverture du formulaire d'ajout

---

## 📜 Historique — Filtre Accord (nouveau)

**Ajout** :
- Filtre **Accord** (dropdown) placé **avant** la barre de recherche par plat
- Valeurs du dropdown : liste des accords venant de la sheet `config` (colonne "Accords")

**Comportement en cascade** :
- Rien sélectionné dans Accord → recherche par plat sur tout l'historique (comportement actuel)
- Un accord sélectionné → recherche par plat **uniquement parmi les vins ayant cet accord** dans leur champ Accords (multi-valeurs)

**À faire** :
- [ ] Ajouter le dropdown dans `index.html` (section `view-historique`)
- [ ] Récupérer la liste des accords depuis `CONFIG.accords` (déjà chargé au démarrage)
- [ ] Modifier la logique de filtrage (`filtrerHistoriqueParPlat`) pour combiner Accord + Plat
- [ ] Lier le filtre Accord au reset (bouton ✕)

---

## 📜 Historique — Bordure plats + édition + ajout manuel

### Bordure de couleur des plats trop fine
Actuellement `border-left: 1px solid` dans `genererCardVin` (option `mets`) — à peine visible.
- [ ] Passer à **2px** (même largeur que la bordure des cartes de vin `.wine-card`)

### Plat cliquable → modal d'édition
Au clic sur un plat dans l'historique → ouvrir un modal modifiable.
- [ ] Modal avec champs : plat, note d'accord (verres 🍷)
- [ ] Champs supplémentaires à définir plus tard (préparer la structure)
- [ ] **Pas de suppression** pour l'instant
- [ ] Sauvegarder via nouveau endpoint backend (ex: `modifierEntreeHistorique`)

### Ajout manuel d'historique (pour les vins du passé)
**Cas d'usage** : entrer dans l'app des dégustations notées dans un carnet papier avant l'app.

- [ ] Bouton **"Ajouter une dégustation passée"** dans la **fiche du vin**, section historique
- [ ] Disponible pour **n'importe quel vin** de la cave (peu importe si bouteilles en stock ou non)
- [ ] Modal de saisie : plat, note d'accord, **date** (pour entrer une date passée), peut-être un champ "Note libre"
- [ ] Le même modal réutilisé pour ajout que pour édition (à voir)
- [ ] Backend : nouvel endpoint ou réutiliser `enregistrerHistorique` avec date personnalisable

---

## 🛡️ Protection double-clic + spinner thématique

**Problème** : sur iPhone (et ailleurs), quand on clique sur un bouton qui appelle le backend, il n'y a pas toujours de feedback visuel. On reclique, et on déclenche deux fois la même action → risque de doublons dans le Sheet.

### Anti double-clic
Désactiver les boutons pendant un appel backend en cours. Existe déjà à certains endroits (`btn.disabled = true`) mais c'est partiel et incohérent.

### Spinner thématique vin
**Choix retenu** : **verre qui se remplit** (vin rouge qui monte progressivement) **+ texte contextuel** qui change selon l'action :
- "Mise en cave..." → ajout de bouteille
- "Service en cours..." → boire
- "Déplacement..." → déplacer
- "Don en cours..." → donner
- "Décantation..." → chargement général
- "Synchronisation..." → refresh
- "Sauvegarde..." → édition de fiche
- Etc.

### À faire
- [ ] Créer une fonction centralisée style `lancerActionAvecSpinner(boutonId, texteSpinner, actionBackend)` qui :
  1. Désactive le bouton cliqué
  2. Affiche le spinner global avec le bon texte
  3. Appelle le backend
  4. Cache le spinner + réactive le bouton à la fin
  5. Gère les erreurs (toast + réactivation)
- [ ] Créer l'animation CSS du verre qui se remplit (overlay flottant ou en place du bouton)
- [ ] Appliquer partout où il y a un `appelBackend()` qui modifie des données :
  - Ajouter / Déplacer / Boire / Donner / Supprimer bouteille
  - Sauvegarder fiche
  - Toggle aimé / panier / accords
  - Ajouter succursale
- [ ] Optionnellement aussi pour les chargements (dispo SAQ, succursales, promotions, refresh)
- [ ] Remplacer les `btn.disabled = true; btn.textContent = '...'` existants par cette nouvelle fonction

---

## ⚡ Fiche vin trop lente à ouvrir

**Problème** : 1.5 à 5 secondes pour ouvrir une fiche.

**Cause** : 2 appels backend à chaque ouverture :
1. `getWineBottles` (nécessaire, 500ms-2s)
2. `verifierEtMettreAJourPrixSAQ` (lourd, 1-3s) — fait à CHAQUE ouverture, appelle l'API GraphQL d'Adobe + lit/écrit dans Google Sheets

**Solution choisie** :
- [ ] **Supprimer** l'appel automatique à `verifierEtMettreAJourPrixSAQ` dans `afficherFiche()` (scripts-fiche.js)
- [ ] **Rendre le prix cliquable** dans `fiche-prix-header`
- [ ] **Au clic sur le prix** → appeler `verifierEtMettreAJourPrixSAQ` à la demande + toast avec le résultat
- [ ] Le clic sur le **nom du vin** ouvre déjà la SAQ ✅ (rien à faire)

**Gain attendu** : fiche s'ouvre 3-5× plus vite.

---

## 🐛 Bugs et bizarreries trouvés (à corriger)

### 🔴 Bugs visibles
1. **`confirm-dialog-button-primary` a un `>` en trop**
   Dans `scripts-fiche.js` → `afficherConfirmation()` : `">>"` au lieu de `">"`.
   Le bouton affiche un `>` en trop avant son texte.

2. **Balises HTML cassées dans `toggleEditMode`** (scripts-fiche.js)
   `<h3 class="fiche-section-title" style="margin-top:20px;"SUPPRIMER UNE BOUTEILLE</h3>` — il manque le `>` fermant. Pareil pour le bouton SUPPRIMER juste après. S'affiche tout croche en mode édition.

3. **Bouton GO bloqué quand emplacement occupé**
   Dans `checkEmplacementDispo()` (scripts-scanner.js), si un emplacement est occupé, le bouton GO est désactivé mais **jamais réactivé** quand on choisit un autre emplacement libre. À corriger dans le nouveau flux de scan.

### 🟡 Code mort à nettoyer (un jour)
4. **`addBottle` dans Code.gs** : ligne `newRow[REF_COLS.PANIER] = "";` après le `return` — jamais exécutée.
5. **`saveFiche()` dupliquée dans Code.gs** : code frontend collé par erreur dans le backend (utilise `document.getElementById` et `google.script.run` qui n'existent pas côté GAS).
6. **Fonctions inutilisées dans Code.gs** : `findCodeSAQFromBarcode`, `tryFindCodeSAQ`, `testScrapingSAQ`, `saveScrapedDataToVino`, `getReferenceVinByCode`, `ajouterCodeSAQ`, `saveScannedWine` — aucune n'est dans le `doPost`. Restes d'anciennes versions.
7. **`view-completer` dans index.html** : code mort (fonction "À compléter" plus utilisée).
8. **`styles - Copie.css` dans le dépôt GitHub** : sauvegarde inutilisée.

### 🟢 Risques mineurs
9. **Pas de protection si CONFIG n'a pas chargé** : si on clique très vite au démarrage, certaines fonctions (`updateRangees`, etc.) peuvent planter.
10. **Champ "Racheter" vs "Aimé"** : nommage incohérent entre backend (`AIME`) et frontend (`Racheter`). Confus mais fonctionne.

---

## 🎯 GROS CHANTIER EN COURS — Refonte du scan

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
- 4 boutons : **Arrivée SAQ** / **Déplacer** / **Boire** / **Donner**
- Bouton Annuler

**Si vin N'EXISTE PAS** → Va direct au flux "Arrivée SAQ" avec :
- Code-barres scanné bien visible en haut (scan parfois peu fiable, faut vérifier)
- Recherche SAQ automatique
- Choix d'emplacement

### Les 4 flux d'action

**1. Arrivée SAQ (vin existant)**
- Modal emplacement (dropdowns Meuble / Rangée / Espace)
- Affiche les emplacements actuels des autres bouteilles du même vin (pour guider le choix)
- Vérification Libre/Occupé (avec correction du bug #3)
- Ajoute une nouvelle bouteille

**2. Déplacer**
- Liste les bouteilles avec leurs emplacements actuels
- Choisir laquelle déplacer
- Dropdowns du nouvel emplacement
- Confirmer

**3. Boire**
- Liste les bouteilles avec leurs emplacements
- Choisir laquelle on boit (toujours afficher, même si 1 seule bouteille — plus pro)
- Champs : Plat, Verres 🍷 (1-5), Accords, Aimé (Oui/Non)
- "Santé !"

**4. Donner**
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
- [ ] Créer les 4 modales d'action :
  - Arrivée SAQ (vin existant)
  - Déplacer
  - Boire
  - Donner
- [ ] Pour le flux "vin n'existe pas" : popup amélioré avec code-barres bien visible
- [ ] Corriger le bug du bouton GO bloqué (#3)

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

---

## 📋 Préférences utilisateur (à TOUJOURS respecter)

- **Ne jamais coder sans autorisation**
- **Les changements se font UNIQUEMENT par trouve-et-remplace, un à la fois**
- **Attendre un OK avant de continuer**
- **Pas de proposition de solution sans analyse complète**
- **Travailler en parallèle, ne pas casser le travail existant** (ajouter à côté, ne pas réécrire)
- Détester les choix de réponse multiple
- Préfère des réponses **courtes et directes** (Claude jase trop)

---

## 📂 Fichiers du projet

### Frontend (GitHub Pages)
| Fichier | Rôle |
|---|---|
| `index.html` | Structure HTML, 9 vues |
| `styles.css` | Design sombre/doré |
| `scripts-config.js` | URL backend + `appelBackend()` |
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
