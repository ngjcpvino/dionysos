# 🍷 Liste 2.0 — consolider Dionysos

> Dressée le 28 oct. 2026, à la demande de l'utilisateur : « passer à travers tout le site, toutes les fonctions, le style, pour consolider ».
> Quand l'utilisateur demande **« ta liste 2.0 »**, c'est ce fichier. On la reprend **un chantier à la fois**, dans l'ordre proposé (l'utilisateur peut le changer).
> Chiffres mesurés sur le code du 28 oct. (`python3 outils/garde-fou.py --tout` et analyse complète de l'app et de `Code.gs`).

## La photo d'aujourd'hui

| | Taille | Ce qui se répète ou traîne |
|---|---|---|
| **App** (10 fichiers `scripts-*-v2.js`) | 7 776 lignes · 493 fonctions · 108 variables globales | 48 paires de fonctions jumelles, 18 blocs copiés, 2 fonctions mortes |
| **Style** (`styles-v2.css`) | 1 229 lignes · 153 classes · 94 réglages communs (`:root`) | 9 styles de titres, 2 systèmes de bandes de couleur, 10 classes jamais utilisées, 26 réglages jamais utilisés, 87 valeurs écrites en dur |
| **Page** (`index-v2.html`) | 730 lignes · 31 écrans | 3 styles écrits directement dans la page (+ 5 dans le code) |
| **Serveur** (`Code.gs`, dépôt privé) | 3 131 lignes · 92 fonctions · 49 actions | 17 paires de fonctions jumelles, 58 blocs copiés, le classeur rouvert 47 fois, aucun verrou entre les deux téléphones |
| **Notes** (`mise-a-jour.md`) | 118 Ko, lus en entier à chaque séance | des « à faire » périmés mêlés aux règles |

**Méthode pour chaque chantier** (leçons du 28 oct.) : une famille à la fois · comparaison automatique avant / après (les écrans doivent rester identiques, sauf ce que l'utilisateur a choisi) · le garde-fou doit répondre « rien à signaler » · rien de visible ne change sans un choix fait sur image · décision notée dans `mise-a-jour.md`.

---

## Chantier 0 — Le grand ménage sans risque *(petit, une séance)*
Rien ne change à l'écran. On enlève ce qui ne sert plus, pour que la suite parte d'un terrain propre.

- [ ] **Supprimer `scripts-scanner-v2.js`** (le filet du découpage) — à partir du **4 nov.**
- [x] **Fichiers égarés à la racine** — fait le 28 oct. : `emi.json` et `rec.json` **supprimés** (dans `archives/`, ils restaient publiés ; l'historique du dépôt les garde) ; `a-coder.md` → `archives/a-coder-souhaits-5-sept-2026.md`.
- [x] **Code mort de l'app** — fait le 28 oct. : `codeSAQDepuisBarcodeV2` (scan) et `grouperParCbEmpV2` (emplacements) supprimées.
- [x] **Style mort** — fait le 28 oct. (+ `--white-70`, qui ne servait plus qu'à `--couleur-bordure-pale`) : classes jamais utilisées `centre`, `color-error`, `color-muted`, `emp-entete-meuble`, `lien-titre`, `ligne-dispo`, `mb-20`, `mt-10`, `mt-40`, `text-uppercase` ; 26 réglages `:root` jamais utilisés (`--gold-hover`, `--gold-40/50/60`, 7 `--largeur-bordure-*`, `--couleur-bordure-claire/subtile/pale`, `--bg-overlay`, `--bg-panel(-light)`, `--green`, `--orange`, `--info`, `--warning`, `--shadow-sm/md/lg`, `--fw-light`, `--fw-normal`).
- [ ] **Serveur, code mort ou à confirmer** — ⏳ pas fait le 28 oct. : l'accès au dépôt privé `dionysos-serveur` a été refusé dans la séance (permission à donner par l'utilisateur) : `debugAttributsPromoSAQ` (« DIAGNOSTIC TEMPORAIRE ») ; actions jamais appelées par l'app : `getCodeBarresFromCodeSAQ`, `supprimerBouteille`, `ajouterChartier` (à confirmer : sert-elle depuis l'éditeur ?).
- [x] **`mise-a-jour.md` en deux** — fait le 28 oct. : l'état (50 Ko au lieu de 118) + le journal intégral `archives/journal-jusqu-au-28-oct-2026.md`. Détail du plan : (1) **l'état** — règles, pièges, décisions en vigueur, court ; (2) **le journal** — l'historique daté, dans `archives/`. Retirer les « à faire » périmés (ex. « recoller `Code.gs` (version avec le portrait) », fait depuis). Chaque séance lira 3 fois moins, sans contradictions.

**Vérifié (28 oct.)** : 37 écrans ouverts avant / après avec un faux serveur — balises, classes, textes, positions, tailles et style calculé identiques (3 916 éléments), aucune erreur ; garde-fou « rien à signaler » ; inventaire `--tout` 167 → 165.

## Chantier 1 — Le serveur se met à jour sans copier-coller *(décision de l'utilisateur, puis petit)*
**Pourquoi** : aujourd'hui, chaque modification du serveur = l'utilisateur recopie 3 131 lignes dans Apps Script et redéploie à la main (et on a déjà vu un collage de la mauvaise copie). Vérifié le 28 oct. : le conteneur de Claude **joint l'API d'Apps Script** (`script.googleapis.com`).
**Ce qu'on ferait** : l'API Apps Script (`projects.updateContent` → `versions.create` → `deployments.update`) pousse le code et redéploie la **même** adresse que `API_URL`. Claude le fait lui-même, vérifie, et l'utilisateur ne touche plus à rien.
**Ce qu'il faut de l'utilisateur, une fois** : activer « API Google Apps Script » dans ses réglages Apps Script, et donner un accès (jeton Google rangé dans les **secrets de l'environnement**, jamais dans le dépôt). ⚠️ À dire franchement : ce jeton permet de modifier ses projets Apps Script — c'est son choix. Sans ce chantier, le chantier 5 reste possible, mais le collage à la main se multiplie (un fichier par partie).
**Vérification** : un aller-retour (lire le projet, pousser une copie identique, comparer), puis une vraie mise à jour suivie d'un appel à l'app.

## Chantier 2 — Le scanner *(moyen ; à tester en succursale et au cellier)*
**Constat** : la lecture repose sur **QuaggaJS 0.12.1** — version de **2017** d'une bibliothèque **abandonnée** (le projet ne bouge plus depuis ; une relève existe, `quagga2`). Signes de fragilité dans notre code : il faut **3 lectures identiques** pour accepter un code (`SCAN_THRESHOLD_V2`, parade aux mauvaises lectures) ; tout le décodage tourne sur le fil principal (`numOfWorkers: 0`) ; la bibliothèque est réinitialisée à chaque ouverture ; elle vient d'un CDN (gardée hors ligne par `sw.js`, `EXTERNES`) ; pas de lampe de poche.
**Ce qu'on ferait** : passer à **`barcode-detector`** (lecteur moderne **zxing-cpp**, compilé en WebAssembly, entretenu) — il utilise le lecteur **natif** du navigateur quand il existe (`BarcodeDetector`, présent dans Chrome ; **pas dans Safari sur iPhone/iPad, à ma connaissance**) et son propre moteur sinon. Fichiers **hébergés dans le dépôt** (plus de CDN), gardés hors ligne par `sw.js`. Formats EAN-13, EAN-8, UPC-A (+ Code 128 comme aujourd'hui). Une ou deux lectures + `gtinValide` suffisent. **Lampe** (torche) si l'appareil le permet — utile au cellier. Même écran : viseur, « Rescanner », « Entrée manuelle ».
**Tout le reste du scan ne bouge pas** : `traiterResultatScanV2` reçoit un code comme avant (mémoire, inventaire de la succursale, autre code-barres, propositions…).
**Vérification** : test automatique avec une **fausse caméra** (Chromium lit une vidéo de code-barres : on mesure le temps de lecture avant / après), puis l'essai de l'utilisateur au cellier et en succursale (béton, faible lumière).
**Quand** : je recommande **après** les essais de la 1.0 en fin de semaine (tournée du Tri, hors ligne en succursale), pour ne pas changer ce qu'on s'apprête à tester — sauf si l'utilisateur préfère tester le nouveau scanner en même temps.

## Chantier 3 — Le style, uniformisé en images *(moyen ; chaque famille = un choix sur image)*
Chaque famille : Claude montre toutes les variantes **côte à côte, telles qu'à l'écran** ; l'utilisateur choisit les modèles ; on remplace partout ; on supprime le reste.
- [ ] **Titres — 9 styles** : `titre-1`, `titre-2`, `titre-3`, `titre-action`, `carte-titre`, `emp-meuble`, `titre-rubrique`, `titre-groupe` (+ `emp-entete-meuble`, mort). `titre-action` = `titre-2` à 79 %. → 3 ou 4 modèles. ⚠️ Règle du Design : « Titres BLANCS, jamais en or » — or `titre-2`, `titre-3` et `titre-rubrique` sont en or (choix fait sur image le 26 oct. pour le Tri) : à trancher en même temps.
- [ ] **Bandes de couleur de l'appréciation — 2 systèmes** : `.note-1…5` (fiche) et `.bordure-gauche-1…5` (Historique) → un seul.
- [ ] **Cartes et blocs** : `.carte`, `.histo-groupe`, `.histo-vin`, `.histo-mets`, `.fiche-mets`, `.emp-bloc`, `.bloc-form`, `.carte-info` → la carte universelle et ses variantes.
- [ ] **Boutons et ronds** : `.roundel`, `.cercle`, `.cercle-choix`, `.coche-panier`, `.btn-fermer`, `.bouton-navigation`, `.controle` / `.colonne-controle(s)` / `.colonne-ronds` / `.ligne-ronds`.
- [ ] **Sosies CSS** relevés par le garde-fou : `.emp-ronds` = `.colonne-centree` (100 %) ; `.item-liste.choix-placement` = `.corriger-ligne` (100 %) ; `.panneau-gauche` ≈ `.panneau-droite`.
- [ ] **Réglages `:root` nommés par leur valeur** (règle du dépôt, rarement suivie : `--space-s`, `--ls-tight`, `--fs-burger`… sont nommés par usage) et **87 valeurs en dur** (surtout des tailles en px : icônes, photos, largeurs max.) → des réglages communs.
- [ ] **Styles écrits en dur** : `index-v2.html` l. 466, 473, 713 ; dans le code : `.style.borderColor` (emplacements ×2, fiche ×2), `.style.visibility` (emplacements) → des classes.
- [ ] **Espacements** : 41 combinaisons de marges différentes → une échelle.

## Chantier 4 — Le code de l'app, une seule façon de faire *(gros ; plusieurs séances, rien de visible)*
- [ ] **Un seul moteur de filtres** — le plus gros gain. Aujourd'hui, **8 pages** ont chacune leurs 7 fonctions (`remplirFiltres…`, `basculerFiltre…`, `choisirFiltre…`, `appliquerFiltres…`/afficher, `reinitialiserFiltres…`, `ouvrirFiltres…`, `fermerFiltres…`) : ≈ **58 fonctions** presque pareilles (81 à 95 %), là où naissent les écarts (règle « la remise à zéro doit lister les mêmes clés que Réinitialiser »). → 7 fonctions communes, pilotées par `PANNEAUX_V2` (déjà là pour fabriquer les panneaux) : l'état, les libellés, d'où viennent les valeurs, les cascades (Pays → Appellation), les exceptions (Meuble/Rangée/Espace sans « sauf », Succursale). Chartier et Selon SAQ gardent leur panneau fait main, mais branché sur le même moteur.
- [ ] **Les écrans** : 31 écrans ; `cacherToutesPagesV2` tient une **liste écrite à la main** de 30 identifiants (règle « toute nouvelle page : l'ajouter… » — on l'oublie forcément un jour) → la liste se lit dans la page (`.modal-v2-fullscreen`, sauf `#secretV2Container`). Une ouverture / fermeture commune (`ouvrir…`/`fermer…` : 50 + 41 fonctions ; 202 `style.display`).
- [ ] **Le choix d'un emplacement** : Arrivée et Déplacer ont chacun leur copie (`basculerListe…` 98 %, `choisirRangee…` 96 %, `choisirMeuble…` 86 %, `choisirEspace…`) → un seul sélecteur.
- [ ] **Boire / Donner** (`fermer…` 96 %) et le choix de la bouteille (`choisirBouteilleBoireV2` ≈ `choisirBouteilleDeplacer`).
- [ ] **L'appréciation (★)** : 3 copies (`choisirNoteBoireV2`, `…HistoEditV2`, `…HistoAjoutV2`) → une.
- [ ] **Les cartes de vin** : une seule fonction de carte (celle de la Recherche et des Comparables existe déjà) pour la Cave, À ranger, Sans cépage (81 %), l'Historique, Curieux Bégin, les notes.
- [ ] **Resynchroniser après une écriture** : `getInventoryData` est rappelée à **16 endroits**, chacun à sa façon → une fonction `resynchroniserV2()`.
- [ ] **Petites paires** : `creerVinSAQV2` ≈ `creerVinNomV2` (91 %), `ouvrirSuggestionAjoutV2` ≈ `…EditV2`, `ouvrirAjoutAccordV2` ≈ `ouvrirAjoutSommelierV2`, `ajouterFavoriteV2` ≈ `retirerFavoriteV2`, `toggleFavoriV2` / `togglePanierV2`, `uniqueValeursAchat` ≈ `valeursUniquesCbV2`, `bouteillesEnCaveParSAQV2` ≈ `vinEnCaveV2`, `bouteillesRangeesEmpV2` ≈ `bouteillesARangerEmpV2`, `afficherMessage` / `afficherMessageImage`, etc. (liste complète : `garde-fou.py --tout`).
- [ ] **Messages d'erreur** : 14 `retourAccueilV2()` **sans message** (règle : toujours un message parlant) et 20 erreurs avalées en silence (`catch(function(){})`) à passer en revue — certaines sont voulues (appels de fond), d'autres cachent des pannes.
- [ ] *(Plus tard, si utile)* **108 variables globales** → l'état de chaque page dans un seul objet.

## Chantier 5 — Le serveur : découper et consolider *(moyen ; idéalement après le chantier 1)*
- [ ] **Découper `Code.gs`** en fichiers dans le même projet Apps Script (ils partagent tout, comme les scripts de l'app) : réglages · routes (`doPost`) · vins et bouteilles · historique · propositions et notes · lecture SAQ (fiches, catalogue, succursales, promos) · Accords SAQ · Curieux Bégin · outils de l'éditeur (`maj…`, `reconstruire…`, tests). ⚠️ Les réglages (`SPREADSHEET_ID`, `REF_COLS`…) dans le **premier** fichier. Le dépôt privé `dionysos-serveur` suit le même découpage.
- [ ] **Le classeur ouvert une seule fois** : `SpreadsheetApp.openById` × **47** → une fonction qui le garde en main (plus rapide).
- [ ] **Une seule requête au catalogue SAQ** : l'en-tête, la clé et l'appel sont copiés dans **6 fonctions** (`appelAPISAQ`, `chercherProduitSAQ_GRAPHQL_V1`, `getPromotionsSAQ`, `getToutesPromotionsSAQ`, `verifierDispoSAQ_GRAPHQL_V1`, `getInventaireSuccursale`).
- [ ] **`getInventoryData`** se répète à l'intérieur d'elle-même (26 blocs) → une table « colonne → champ » tirée de `REF_COLS`.
- [ ] **Écritures groupées** : beaucoup de `setValue` cellule par cellule (ex. Boire vide 6 cellules une à une) → une écriture par ligne : chaque action plus rapide.
- [ ] **Un verrou** (`LockService`) sur les actions qui écrivent : aujourd'hui **aucun** — deux téléphones qui écrivent en même temps (ex. deux bouteilles ajoutées au même vin) peuvent se marcher dessus.
- [ ] **Sosies du serveur** : `ajouterAccordConfig` ≈ `ajouterSommelierConfig` (96 %), `majBoisTousVins` ≈ `majCellier` (93 %), `extractDetailInfo` ≈ `extractTastingInfo` (93 %), `ongletCurieuxBegin` ≈ `ongletNotes` ≈ `ongletRecettes`, `getSuggestions` ≈ `getChartier` ≈ `getNotesAccord`, `getSuccursales` ≈ `getToutesSuccursales`, `ajouterSuccursale` ≈ `supprimerSuccursale`, les `supprimer…` / `corriger…`.
- [ ] **Noms trompeurs** : `testScrapingSAQ` (le lecteur de fiches utilisé partout), `mettreBotteilleARanger` (faute), `…_GRAPHQL_V1`. À renommer **des deux côtés en même temps** (app + serveur) — seulement avec le chantier 1, sinon risque de décalage.
- [ ] 73 `Logger.log` à trier (garder le diagnostic utile).

## Chantier 6 — Le garde-fou couvre tout *(petit)*
- [ ] L'étendre au **serveur** (`dionysos-serveur`) : aujourd'hui il ne vérifie que l'app.
- [ ] Après chaque chantier, l'inventaire (`--tout`) doit **baisser** ; ce qui reste volontairement est inscrit dans `outils/garde-fou-acceptes.txt` avec sa raison.

---

## Ce que je ne propose PAS (et pourquoi)
- **Réécrire l'app dans un « framework »** (React, Vue…) ou ajouter une étape de fabrication : tout casserait d'un coup, pour un gain que la consolidation donne déjà. Les scripts simples + GitHub Pages restent la bonne base.
- **Renommer les fichiers `-v2`** : décidé non (11 juil.).
- **Retirer les `onclick` du HTML** (269) : ils sont lisibles et marchent ; aucun gain pour toi.

## L'ordre que je recommande
1. **Chantier 0** (ménage sans risque) — tout de suite.
2. **Les essais de la 1.0** en fin de semaine (tournée du Tri, hors ligne en succursale) — avec l'app actuelle.
3. **Chantier 1** (si l'utilisateur dit oui) → **Chantier 5** (serveur), qui en profite.
4. **Chantier 2** (scanner), testé au cellier et en succursale.
5. **Chantier 3** (style, en images) et **Chantier 4** (code), en alternance : une famille de style, une famille de code.
6. **Chantier 6** au fil de l'eau.

## Décisions à prendre par l'utilisateur (une à la fois, au bon moment)
- Chantier 1 : activer l'API Apps Script et donner l'accès, oui ou non ?
- Chantier 2 : nouveau scanner avant ou après les essais de fin de semaine ?
- Chantier 3 : les modèles de chaque famille (sur image) ; titres en or ou blancs ?
- Chantier 5 : le découpage des fichiers du serveur (la liste ci-dessus, ou autrement ?).
