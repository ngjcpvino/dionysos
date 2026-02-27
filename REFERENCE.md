# DIONYSOS — Cahier de charges
*Dernière mise à jour : 27 février 2026*

---

## 1. ARCHITECTURE DU PROJET

### Ancienne architecture (Apps Script)
| Fichier | Rôle |
|---|---|
| Code.gs | Backend — toutes les fonctions serveur |
| Index.html | Structure HTML |
| Styles.html | CSS |
| scripts-clean.html | JavaScript frontend |
| REFERENCE.html | Règles du projet |

### Nouvelle architecture (GitHub Pages) — EN COURS
| Fichier | Rôle |
|---|---|
| index.html | Structure HTML (GitHub Pages) |
| styles.css | CSS centralisé — aucun style inline |
| scripts-config.js | Constantes et fonction appelBackend() |
| scripts.js | JavaScript frontend |
| Code.gs | Backend API (Apps Script — inchangé) |

### Configuration
| Paramètre | Valeur |
|---|---|
| URL GitHub Pages | https://ngjcpvino.github.io/dionysos/ |
| URL Apps Script | https://script.google.com/macros/s/AKfycbyYw3vVGtKPgAOxOHrxt9deUchZDiMv0SHFTU08CkgLBFIG_8-qasvVpuTsKxl3RkonGQ/exec |
| Spreadsheet ID | 1Y4OCwcb2XBTPDTl_KDUGHgEiXgwqqXHmWSw6XQVSe3g |
| Clé API lecture | AIzaSyBuennUE5SMN1YkV_38JObgGYj6_aAmTSc |
| Client ID OAuth2 | 363308093275-13fdbai89mli8bmf8i34ck9nqe5b1eb0.apps.googleusercontent.com |
| Compte Google Cloud | ngjcpvino@gmail.com |
| Repo GitHub | github.com/ngjcpvino/dionysos |

---

## 2. RÈGLES ABSOLUES

- Zéro style en dur — tout passe par des classes CSS dans `styles.css`
- Zéro style inline dans le HTML ou le JS
- Toujours vérifier si une classe CSS existe avant d'en créer une nouvelle
- Une seule fonction pour générer les cartes de vin : `genererCardVin(item, options)`
- Ne jamais créer une deuxième fonction qui fait la même chose qu'une existante
- Procéder une étape à la fois et attendre un OK avant de passer à la suivante
- Toujours vérifier l'impact d'un changement sur toutes les pages

---

## 3. GOOGLE SHEETS — BASE DE DONNÉES

| Onglet | Contenu |
|---|---|
| Vino | Catalogue des vins (col A=code-barres, col B=code SAQ, etc.) |
| Bouteilles | Inventaire des bouteilles (emplacement, meuble, rangée, espace, état) |
| Historique | Historique des accords mets-vin |
| CONFIG | Succursales préférées (col I-J) et toutes les succursales SAQ (col K-N) |

---

## 4. VARIABLES CSS IMPORTANTES

| Variable | Valeur |
|---|---|
| `--gold` | #c9813c |
| `--gold-hover` | #C98D4F |
| `--bg-card` | rgba(0,0,0,0.50) |
| `--bg-overlay` | rgba(0,0,0,0.85) |
| `--bg-panel` | rgba(20,20,20,0.95) |
| `--error` | #f44336 |
| `--success` | #4caf50 |
| `--warning` | #ffc107 |
| `--white-50` | rgba(255,255,255,0.6) |
| `--white-70` | rgba(255,255,255,0.9) |

---

## 5. PAGES DE L'APPLICATION

| ID de vue | Description |
|---|---|
| view-accueil | Titre DIONYSOS, compteur bouteilles, cépages, appellations, saisie manuelle |
| view-liste | Cave à vin — liste filtrée de tous les vins |
| ficheVinOverlay | Fiche détaillée d'un vin (overlay) |
| view-emplacements | Vue par meuble avec doublons et cépages manquants |
| view-historique | Historique des vins bus avec accords mets-vin |
| view-racheter | Liste d'achat avec vérification dispo SAQ |
| view-recherche | Recherche avancée — 10 filtres |
| view-aranger | Bouteilles sans emplacement assigné |
| view-promotions | Promotions SAQ — mes vins + autres vins |

---

## 6. FONCTIONS BACKEND — Code.gs

Toutes accessibles via `doPost()` avec `appelBackend(action, data)`.

| Fonction | Rôle |
|---|---|
| `getInventoryData()` | Retourne toutes les bouteilles de la cave |
| `getWineBottles(codebarre)` | Retourne les infos d'un vin + ses bouteilles |
| `addBottle(formData)` | Ajoute une bouteille |
| `actionBouteille(row, action, detail)` | Boire ou déplacer une bouteille |
| `saveWineEdits(data)` | Sauvegarde les modifications d'une fiche vin |
| `updateWineField(codebarre, field, value)` | Met à jour un champ spécifique |
| `supprimerBouteille(row, bottle)` | Supprime une bouteille |
| `mettreBotteilleARanger(row, bottle)` | Met une bouteille en statut À ranger |
| `ajouterVinAvecBouteilles(...)` | Ajoute un nouveau vin avec scraping SAQ |
| `checkWineExists(code)` | Vérifie si un vin existe par code-barres |
| `verifierDispoSAQ_GRAPHQL_V1(codeSAQ, succursale)` | Vérifie dispo via GraphQL Adobe |
| `getPromotionsSAQ(listeCodesSAQ)` | Retourne les promos SAQ pour mes vins |
| `getToutesPromotionsSAQ(mesCodesSAQ)` | Retourne toutes les promos SAQ |
| `getSuccursalesDisponibles(codeSAQ, lat, lng)` | Succursales où un vin est dispo |
| `getSuccursales()` | Retourne les succursales préférées |
| `getToutesSuccursales()` | Retourne les 401 succursales SAQ |
| `ajouterSuccursale(nom, numero)` | Ajoute une succursale aux préférées |
| `getCodeBarresFromCodeSAQ(codeSAQ)` | Retourne le code-barres pour un code SAQ |
| `getHistorique()` | Retourne l'historique des vins bus |
| `getConfig()` | Retourne la configuration (meubles, pays, cépages) |
| `verifierEtMettreAJourPrixSAQ(cb, codeSAQ)` | Vérifie et met à jour le prix SAQ |

---

## 7. API UTILISÉES

### GraphQL Adobe/SAQ
- URL : `https://catalog-service.adobe.io/graphql`
- Clé API : `7a7d7422bd784f2481a047e03a73feaf`
- Usage : Recherche produits, vérification dispo, promotions

### Store Locator SAQ
- URL : `https://www.saq.com/fr/store/locator/ajaxlist/context/product/id/{idInterne}`
- Usage : Succursales disponibles pour un vin, liste complète

### Scraping SAQ
- URL : `https://www.saq.com/fr/{codeSAQ}`
- Usage : Récupérer toutes les infos d'un vin

---

## 8. PROBLÈMES CONNUS

### Scanner caméra — RÉSOLU par migration GitHub Pages
- Cause : Chrome bloquait l'accès caméra dans les iframes Google Apps Script
- Solution : GitHub Pages = HTTPS natif = accès caméra autorisé

### Styles en dur — EN COURS DE NETTOYAGE
- Le HTML et JS d'Apps Script contenaient des styles inline accumulés
- La migration GitHub Pages est l'occasion de tout centraliser dans `styles.css`
- Règle : une classe de base pour les éléments similaires, modificateur pour les différences

---

## 9. ÉTAT DE LA MIGRATION — 27 FÉVRIER 2026

### Complété ✅
- Repo GitHub créé : github.com/ngjcpvino/dionysos
- GitHub Pages activé : https://ngjcpvino.github.io/dionysos/
- Google Cloud configuré : URL GitHub ajoutée aux origines OAuth2
- `doPost()` ajouté dans Code.gs — backend testé et fonctionnel
- Fichiers de base créés : index.html, styles.css, scripts-config.js, scripts.js
- Structure HTML de base (header, nav, main) en place et visible

### Prochaines étapes 🔜
- Transférer et nettoyer `styles.css` depuis Styles.html
- Transférer et nettoyer `scripts.js` depuis scripts-clean.html
- Ajouter les vues une par une (accueil en premier)
- Tester le scanner caméra sur GitHub Pages
- Implémenter OAuth2 pour l'écriture

---

## 10. CHARTE DES COULEURS — ACCORDS METS-VIN

| Note | Couleur |
|---|---|
| 1 — Très insatisfaisant | #FF4B2B |
| 2 — Insatisfaisant | #FF9000 |
| 3 — Neutre / Moyen | #FFD200 |
| 4 — Satisfaisant | #8BC34A |
| 5 — Très satisfaisant | #2ECC71 |

---

## 11. MENU DE L'APPLICATION
- ACCUEIL
- CAVE À VIN
- EMPLACEMENTS
- HISTORIQUE
- LISTE D'ACHAT
- RECHERCHE
- À RANGER
- PROMOTIONS SAQ
- OUVRIR SAQ
- 🔄 RAFRAÎCHIR

---

## 12. UTILISATEURS
- 2 utilisateurs
- Accès internet quasi permanent
- Utilisation principalement sur iPhone/iPad
