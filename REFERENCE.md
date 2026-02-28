# DIONYSOS — Cahier de charges
*Dernière mise à jour : 28 février 2026 — migration terminée*


## QUI EST L'UTILISATEUR

Claude Idéateur, développeur francophone autodidacte, travaille depuis chez lui.
Il est infatigable — "abandonner n'est pas dans mon vocabulaire".
Il préfère les réponses courtes et solutions directes, sans explications inutiles.
Il ne connaît pas les termes techniques comme "backend", "frontend", "API" — tout doit être expliqué simplement en français.
Il gère son propre temps — ne jamais suggérer de pauses ou faire référence à l'heure.
Il est curieux et veut toujours ameliorer ce projet
---

## 1. ARCHITECTURE DU PROJET

### Ancienne architecture (Apps Script) — ABANDONNÉE
| Fichier | Rôle |
|---|---|
| Code.gs | Backend — toutes les fonctions serveur |
| Index.html | Structure HTML |
| Styles.html | CSS |
| scripts-clean.html | JavaScript frontend |
| REFERENCE.html | Règles du projet |

### Nouvelle architecture (GitHub Pages) — COMPLÈTE ET FONCTIONNELLE
| Fichier | Rôle |
|---|---|
| index.html | Structure HTML |
| styles.css | CSS centralisé — aucun style inline |
| scripts-config.js | Constantes + fonction appelBackend() |
| scripts-init.js | Variables globales, navigation, menu |
| scripts-inventaire.js | Inventaire, filtres, stats accueil, historique |
| scripts-fiche.js | Fiche vin, édition, bouteilles, succursales, utils |
| scripts-scanner.js | Scanner Quagga, saisie manuelle, popup nouveau vin |
| scripts-listes.js | Racheter, emplacements, promotions, à compléter |
| Code.gs | Backend API (Apps Script — inchangé) |

### Ordre de chargement dans index.html
scripts-config.js → scripts-init.js → scripts-inventaire.js → scripts-fiche.js → scripts-scanner.js → scripts-listes.js

### Configuration
| Paramètre | Valeur |
|---|---|
| URL GitHub Pages | https://ngjcpvino.github.io/dionysos/ |
| URL Apps Script |https://script.google.com/macros/s/AKfycbxRh6eOQDUy3hXoNNKF6n6gUxhppKB452UqZuPB1mZAC_rzb1jZ5LbPsBuZDH521uq1eA/exec |
| Spreadsheet ID | 1Y4OCwcb2XBTPDTl_KDUGHgEiXgwqqXHmWSw6XQVSe3g |
| Clé API lecture | AIzaSyBuennUE5SMN1YkV_38JObgGYj6_aAmTSc |
| Client ID OAuth2 | 363308093275-13fdbai89mli8bmf8i34ck9nqe5b1eb0.apps.googleusercontent.com |
| Compte Google Cloud | ngjcpvino@gmail.com |
| Repo GitHub | github.com/ngjcpvino/dionysos |

---

## 2. RÈGLES ABSOLUES DU PROJET

- Zéro style en dur — tout passe par des classes CSS dans styles.css
- Zéro style inline dans le HTML ou le JS
- Toujours vérifier si une classe CSS existe avant d'en créer une nouvelle
- Une seule fonction pour générer les cartes de vin : genererCardVin(item, options)
- Ne jamais créer une deuxième fonction qui fait la même chose qu'une existante
- Procéder une étape à la fois et attendre un OK avant de passer à la suivante
- Toujours vérifier l'impact d'un changement sur toutes les pages
- Avant tout travail de code, lire ce fichier REFERENCE et s'y conformer

---

## 3. PONT ENTRE GITHUB PAGES ET APPS SCRIPT

Tous les appels au backend passent par appelBackend(action, data) définie dans scripts-config.js.
⚠️ La migration est TERMINÉE — tous les google.script.run ont été remplacés dans les 5 fichiers.

SYNTAXE À UTILISER pour tout nouvel appel :

  // Lecture simple
  appelBackend('getInventoryData').then(fn).catch(function(err) { afficherMessage('Erreur: ' + err); });

  // Avec paramètres
  appelBackend('getWineBottles', { codebarre: codebarre }).then(fn).catch(function(err) { afficherMessage('Erreur: ' + err); });

  // Écriture sans retour
  appelBackend('updateWineField', { codebarre: cb, field: 'Accords', value: val }).catch(function(err) { afficherMessage('Erreur: ' + err); });

  // Écriture avec confirmation
  appelBackend('saveWineEdits', data).then(function() { afficherMessage('OK'); }).catch(function(err) { afficherMessage('Erreur: ' + err); });

POINTS IMPORTANTS :
- index.html : balise base target top retirée (elle bloquait le chargement des JS)
- doPost() dans Code.gs corrigé — les noms de paramètres correspondent exactement au frontend
- Après chaque modification de Code.gs : Déployer → Gérer les déploiements → Nouvelle version
- Images/icônes : créer un dossier /images/ sur GitHub, accès via src="images/fichier.png"

---

## 4. GOOGLE SHEETS — BASE DE DONNÉES

| Onglet | Contenu |
|---|---|
| Vino | Catalogue des vins (col A=code-barres, col B=code SAQ, etc.) |
| Bouteilles | Inventaire des bouteilles (emplacement, meuble, rangée, espace, état) |
| Historique | Historique des accords mets-vin |
| CONFIG | Succursales préférées (col I-J) et toutes les succursales SAQ (col K-N) |

---

## 5. VARIABLES CSS IMPORTANTES

| Variable | Valeur |
|---|---|
| --gold | #c9813c |
| --gold-hover | #C98D4F |
| --bg-card | rgba(0,0,0,0.50) |
| --bg-overlay | rgba(0,0,0,0.85) |
| --bg-panel | rgba(20,20,20,0.95) |
| --error | #f44336 |
| --success | #4caf50 |
| --warning | #ffc107 |
| --white-50 | rgba(255,255,255,0.6) |
| --white-70 | rgba(255,255,255,0.9) |

---

## 6. PAGES DE L'APPLICATION

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

## 7. FONCTIONS BACKEND — Code.gs

Toutes accessibles via doPost() avec appelBackend(action, data).

| Fonction | Rôle |
|---|---|
| getInventoryData() | Retourne toutes les bouteilles de la cave |
| getWineBottles(codebarre) | Retourne les infos d'un vin + ses bouteilles |
| addBottle(formData) | Ajoute une bouteille |
| actionBouteille(row, action, detail) | Boire ou déplacer une bouteille |
| saveWineEdits(data) | Sauvegarde les modifications d'une fiche vin |
| updateWineField(codebarre, field, value) | Met à jour un champ spécifique |
| supprimerBouteille(row, bottle) | Supprime une bouteille |
| mettreBotteilleARanger(row, bottle) | Met une bouteille en statut À ranger |
| ajouterVinAvecBouteilles(...) | Ajoute un nouveau vin avec scraping SAQ |
| checkWineExists(code) | Vérifie si un vin existe par code-barres |
| verifierDispoSAQ_GRAPHQL_V1(codeSAQ, succursale) | Vérifie dispo via GraphQL Adobe |
| getPromotionsSAQ(listeCodesSAQ) | Retourne les promos SAQ pour mes vins |
| getToutesPromotionsSAQ(mesCodesSAQ) | Retourne toutes les promos SAQ |
| getSuccursalesDisponibles(codeSAQ, lat, lng) | Succursales où un vin est dispo |
| getSuccursales() | Retourne les succursales préférées |
| getToutesSuccursales() | Retourne les 401 succursales SAQ |
| ajouterSuccursale(nom, numero) | Ajoute une succursale aux préférées |
| getCodeBarresFromCodeSAQ(codeSAQ) | Retourne le code-barres pour un code SAQ |
| getHistorique() | Retourne l'historique des vins bus |
| getConfig() | Retourne la configuration (meubles, pays, cépages) |
| verifierEtMettreAJourPrixSAQ(cb, codeSAQ) | Vérifie et met à jour le prix SAQ |
| getScannedWinesIncomplete() | Retourne les vins scannés sans code SAQ |
| completeScannedWine(row, codeSAQ) | Complète un vin scanné avec son code SAQ |

---

## 8. API UTILISÉES

### GraphQL Adobe/SAQ
- URL : https://catalog-service.adobe.io/graphql
- Clé API : 7a7d7422bd784f2481a047e03a73feaf
- Usage : Recherche produits, vérification dispo, promotions

### Store Locator SAQ
- URL : https://www.saq.com/fr/store/locator/ajaxlist/context/product/id/{idInterne}
- Usage : Succursales disponibles pour un vin, liste complète

### Scraping SAQ
- URL : https://www.saq.com/fr/{codeSAQ}
- Usage : Récupérer toutes les infos d'un vin

---

## 9. ÉTAT DE LA MIGRATION — 28 FÉVRIER 2026

### MIGRATION COMPLÈTE ET FONCTIONNELLE ✅

- Repo GitHub créé : github.com/ngjcpvino/dionysos
- GitHub Pages activé : https://ngjcpvino.github.io/dionysos/
- Google Cloud configuré : URL GitHub ajoutée aux origines OAuth2
- doPost() dans Code.gs — backend testé et fonctionnel
- styles.css uploadé (1200+ lignes, 24 sections)
- index.html : balise base target top retirée
- scripts-config.js créé avec appelBackend() et URL du serveur
- Tous les google.script.run remplacés dans les 5 fichiers JS
- Navigation, inventaire, fiche vin, scanner, listes, promotions SAQ — tout fonctionne

### Aucune étape en attente

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
- RAFRAÎCHIR

---

## 12. UTILISATEURS
- 2 utilisateurs
- Accès internet quasi permanent
- Utilisation principalement sur iPhone/iPad
