# 🍷 Dionysos — Règles et invariants (4 septembre 2026)

> Ce fichier ne décrit PAS les pages : le code fait foi. Il ne contient que ce qui ne se lit pas dans le code — décisions prises, pièges connus, façons de faire imposées.
> Les règles de travail (méthode de correction, format des échanges) sont dans `REFERENCE.md`.

## 📁 Architecture
- **Frontend** : GitHub Pages, dépôt public `ngjcpvino/dionysos`
- **Backend** : Google Apps Script, projet « Vino 3.0 », `Code.gs` — **hors dépôt** (voir Trous connus)
- **Base** : Google Sheets « Vino 3.0 » — onglets Vino · Historique · config/CONFIG · Suggestions · Chartier · Recettes · CurieuxBegin
- **Adresse** : `.../index-v2.html`. L'adresse de base donne « page introuvable » — assumé, et ce n'est PAS une protection.

## 📂 Fichiers
`index-v2.html` · `styles-v2.css` · `scripts-socle-v2.js` · `scripts-scanner-v2.js` · `scripts-fiche-v2.js` · `Code.gs` (Apps Script)

- **`scripts-socle-v2.js`** : `API_URL`, `appelBackend` + spinner, globales, utilitaires communs, capteur d'erreurs, écran mot de passe, démarrage.
- **`scripts-scanner-v2.js`** : fourre-tout — scan, menu d'action, toutes les pages-listes, navigation, panneaux de filtres.
- **`scripts-fiche-v2.js`** : fiche, édition, photo, plats, suggestions de la fiche, utilitaires mémoire.
- Le V1 (8 fichiers) a été supprimé du dépôt le 11 juillet 2026. Décision : **pas de renommage** des fichiers `-v2`.

## ⚠️ RÈGLES

**Déploiement**
- **Publier ≠ déployer.** Le front se met à jour seul (anti-cache `?v=` + heure courante, donc au plus tard 1 h après une publication — un test fait immédiatement après peut rouler les ANCIENS fichiers). `Code.gs` NON : après toute modification, Déployer → Gérer les déploiements → ✏️ → Version : **Nouvelle version** → Déployer.
- Un test qui passe dans l'éditeur pendant que l'app échoue = déploiement périmé, rien d'autre.
- Toute nouvelle fonction backend passe par le `switch` de `doPost` : elle est protégée par le mot de passe automatiquement.

**Données**
- **Consultation = mémoire seulement.** Aucune lecture du Sheet pour afficher une page.
- **Écriture = Sheet, puis resynchroniser AVANT de rendre la main** (`getInventoryData` → `ALL_DATA`, ou `majMemoireVinV2` pour une écriture ciblée). Invalider `ALL_HISTORIQUE` si l'écriture touche l'historique.
- **Exceptions fraîches** (voulues) : `checkWineExists` au scan ; `checkLocationAvailable` au choix d'un espace ; bouton RAFRAÎCHIR.
- **Nouvelle donnée = nouvelle colonne EN FIN de `Vino`**, jamais un recyclage : `Bois` (70), `Famille accords` (71). L'ancienne colonne « Recettes » est devenue `REF_COLS.FAVORI` — ne jamais la réutiliser pour autre chose.

**Comparaisons**
- Texte utilisateur (cépages, accords, noms) → `normaliserRechercheV2` / `memeTexteV2` / `contientTexteV2`.
- Codes-barres ET codes SAQ au backend → `memeCodeBarre` / `listeContientCode` (zéros de tête). Le front compare via `memeCodeV2` (même corps, autre fichier : corriger l'un = corriger l'autre).

**Navigation**
- Toute nouvelle page : l'ajouter à `cacherToutesPagesV2()` ET appeler `remonterScrollV2` à son ouverture.
- Tout passage « masquer un overlay puis en ouvrir un autre » passe par `ouvrirApresTap(fn)` (anti double-clic).
- Overlay par-dessus un autre : z-index supérieur, l'ordre HTML ne suffit pas.
- `#secretV2Container` est HORS de `cacherToutesPagesV2()` — exception voulue, ne pas « corriger ».
- **La remise à zéro d'une page doit lister EXACTEMENT les mêmes clés que sa fonction Réinitialiser.** C'est là que l'écart se cache, et il est invisible puisque le panneau est fermé (défaut trouvé deux fois le 3 septembre 2026).

**Erreurs**
- Tout nouveau `.catch()` passe un message parlant à `retourAccueilV2(message)`. La phrase passe-partout cache les vraies causes.
- Toast : ne jamais poser `display:none` en ligne sans le retirer à l'affichage suivant. Signature du bogue : « marche au premier essai, mort ensuite ».

**CSS**
- Une valeur = un seul endroit (`:root`), nommée par sa valeur (`--ls-9`), jamais par son usage. Réutiliser `.roundel`, `.champ-saisie`, `.menu-liste`/`.item-liste`, `.controle`, `.titre-1`, `.titre-action` avant de créer du neuf. Jamais de style en dur dans le JS.
- **Accordéons** : indentation + espacement partagés via `.accordeon-1` (1er niveau) / `.accordeon-2` (2e niveau) + jeton `--espace-accordeon: 7px`. UN seul style réutilisé partout (menu burger, recettes SAQ, Chartier, Curieux Bégin). Un nouvel accordéon pose ces classes sur ses `.item-liste`, pas de nouveau CSS par cas (règle posée le 6 septembre 2026).
- Jamais `100vh` : toujours `height:100%` (iOS recadre le fond). Fond de page toujours OPAQUE.
- Loupe et ✕ d'une page-liste : `position:fixed` (`.gauche` reste `absolute`).
- Carte avec date à droite : `white-space:nowrap` (exception : items des panneaux, qui replient). Carte indentée pleine largeur : `width: calc(100% - indent)`.
- Nouvelle couleur de vin : 4 blocs CSS + `couleurClasseV2` + classement fiche (2 endroits) + tri de `grouperVinsV2`.
- **Modifier un panneau de filtres = modifier `PANNEAUX_V2`, jamais le HTML.** Exception connue : `construirePanneauChartierV2` fabrique le sien à la main (catégories dépliantes).

**Méthode**
- Un changement présenté mais sans « ok » reçu N'EST PAS appliqué — ne jamais le marquer fait.
- Ce fichier dit **quoi** changer et **où**. Le texte d'un « Trouve ceci » se copie TOUJOURS du fichier de code, jamais d'ici ni de mémoire — sinon le Rechercher ne trouve rien.
- Passage introuvable dans le dépôt → le dire et demander de le coller. Jamais un bloc approximatif.

## 🎨 Design
« Un chat est un chat. » Tout le V2 est pleine page, même fond que la fiche vin ; chaque écran = `.modal-v2-fullscreen` + `.modal-v2-content`. Titres BLANCS, jamais en or.

**Gabarit des pages VIN** (menu d'action compris) : ✕ en haut à droite ; NOM en capitales (`.titre-1`) ; origine Pays • Région • Appellation dessous (`.texte-secondaire`) ; action en titre blanc plein (`.titre-action`). Boire/Donner/Arrivée/Déplacer passent par `rendreEnteteActionV2(prefixe)`.

**Carte universelle `.carte`** : 3 zones flex + bande couleur en bas. `.carte-photo` 60px, `.carte-centre`, `.carte-droite`. Bandes `.note-1..5` (plats) et `.vin-*` (vin). `.carte-vide` = voile 0 bouteille. Cartes mets : date EN HAUT à droite.

**5 couleurs** : rouge, blanc, rosé, bulles (doré champagne `#E8D08A`), spiritueux (bleu `#446ffc`). Tri : spiritueux en 5e.

**Z-index** : écrans à `9999` ; `#menuActionV2Overlay`, `#histoEditV2Overlay`, `#photoV2Overlay` à `10010` ; loupes fixes et `.btn-fermer` à `10002` ; spinner et toast à `99999`.

## 🛡️ Anti-gel
`appelBackend` : timeout 30 s par défaut, ajustable (`options.timeout` — Promotions : 120 s et 300 s) via `AbortController` → « Le serveur ne répond pas », spinner toujours retiré (`finally`). Le socle écoute `window error` et `unhandledrejection` : toute erreur JS devient un toast. Démarrage : le spinner couvre `getConfig` ET `getInventoryData`.

## 🔐 Sécurité
Mot de passe d'app à chaque appel. Backend : `params.secret` comparé à la Script Property `APP_SECRET` dans `doPost` ; absent ou faux → `ACCES_REFUSE`, aucune donnée. Si `APP_SECRET` n'est pas posée, tout passe (garde-fou de mise en route). Front : `localStorage.vinoSecret`, ajouté automatiquement par `appelBackend` — ne jamais l'ajouter à la main. `ACCES_REFUSE` → efface la clé, toast, rouvre `#secretV2Container`. Changer le mot de passe = changer `APP_SECRET` + nouveau déploiement.

`appsscript.json` reste en `ANYONE_ANONYMOUS` (nécessaire au fetch anonyme). `API_URL` est dans le dépôt public : le mot de passe la rend inoffensive.

## 🔑 Backend — pièges
- `checkWineExists` renvoie des bouteilles SANS `row` (d'où le repli sur `wineResult.row`).
- `addBottle` est appelée par l'Arrivée, `createVinoSheet` par `ajouterVinAvecBouteilles` — **ni l'une ni l'autre n'est morte**.
- Clés Script : `SPREADSHEET_ID`, `APP_SECRET`, `SAQ_API_KEY`, `SAQ_ENV_ID`.
- **Détection Spiritueux** (`lireFicheSAQ`) : la méta-description de la page SAQ commence par le type exact (« Vodka. Format… »). Type ne commençant pas par « Vin » → Couleur = Spiritueux, cépages vidés, type complet → Appellation. **Le fil d'Ariane n'est PAS fiable, ne pas y revenir.**
- `testScrapingSAQ` porte un nom de test alors que c'est le lecteur de fiches utilisé partout (cache 5 min).

## 🍇 Selon Chartier — pièges

Accords mets-vins par **cépage** (méthode Chartier), distincte des Accords SAQ (qui passent par le code de famille). Le lien est le **cépage**, pas la famille.

- Données dans l'onglet Sheet **Chartier** (anciennement « Accords », renommé le 5 septembre 2026) : colonnes Cépage · Aliment · Nuance · Source. Lu par `getChartier`, alimenté à la main par `ajouterChartier`.
- Front : tout est nommé `chartierV2…` (conteneur `chartierV2Container`, moteur `construirePanneauChartierV2` / `calculerResultatsChartierV2`, état `filtresChartierV2` / `chartierV2Selection`). Le mot-clé de navigation reste `'accords'` (`burgerV2Click('accords')`).
- Le panneau se fabrique à la main (catégories d'ingrédients dépliantes) — **exception** à `PANNEAUX_V2`.
- Sélection multiple d'ingrédients → cépages qui matchent → mes vins de ces cépages. Filtres Cépage et Couleur en plus.
- **À ne pas confondre** : le champ **Accords** de la fiche (colonne 28, `REF_COLS.ACCORDS`) et la colonne **Accords** de config gardent ce nom — ils ne sont PAS liés à Chartier.

## 🍽️ Accords SAQ — pièges
Mécanique distincte de Chartier : le lien vin → recettes est un **code de famille** de l'API SAQ, pas le cépage. Un vin porte UNE famille (colonne 71), une recette en porte plusieurs — c'est la charnière.

- Le code de famille s'écrit avec une **apostrophe de tête** (`'023`) pour garder le zéro.
- **Piège des familles uniques (6 sept. 2026)** : quand une recette n'a QU'UNE famille, `majRecettesSAQ` écrit `"009"` et Sheets la convertit en **nombre 9** (zéros perdus) → plus d'association avec le vin (« 009 »). Deux parades : (1) l'écriture préfixe désormais la famille d'une apostrophe (`"'" + r.familles`) ; (2) surtout, la comparaison passe des deux côtés par **`normFamilleV2`** (ignore les zéros de tête), donc ça marche même avec les « 9 » déjà écrits. `normFamilleV2` est utilisée dans `recettesDeLaFamilleV2` (fiche) et `recettesUtilesSelonSaqV2` (page Selon SAQ).
- Des **fromages du Québec** sortent en `catalog_type: 3` comme les recettes (Raclette de Compton, Valbert…) — d'où la colonne Type de l'onglet.
- Le classement SAQ est parfois bancal (« Hachis parmentier » en Volaille) : **les ingrédients principaux sont plus fiables que les types de plats.**
- Un appel API par famille suffit, aucune pagination. Pas de photo de recette dans l'API, contrairement au site.
- `robots.txt` interdit `/recettes` sur saq.com — les fiches produits, elles, sont permises.
- Alimentation à la main depuis l'éditeur : `majFamillesAccordsVins()` (autant de passages que nécessaire) puis `majRecettesSAQ()`, qui ne réécrit jamais une ligne existante. `reconstruireRecettes()` vide et rebâtit tout l'onglet (utile pour corriger les vieilles familles « 9 » → « 009 »).
- Titres de recettes SAQ : cliquables, ouvrent la fiche produit `saq.com/fr/{sku}`.

## 📺 Selon Curieux Bégin — pièges (ajouté 6 septembre 2026)

Accords vin des recettes de l'émission **Curieux Bégin** (site cuisinez.telequebec.tv). 3e mécanique d'accord, distincte de Chartier (cépage) et des Accords SAQ (famille) : le lien est le **code SAQ** du vin proposé dans la recette. Sommelière principale Michèle Bouffard (pas la seule, et **jamais nommée dans les données** → la fonctionnalité s'appelle « Curieux Bégin »).

- **Données** : onglet Sheet **CurieuxBegin** — Code SAQ · Vin · Type · Prix · Plat · Recette ID · Slug · Saison · Episode · Date diffusion · Date maj. Une ligne par vin proposé. Lu par `getCurieuxBegin`.
- **Synchro** (`majCurieuxBegin`) : va chercher sur cuisinez.telequebec.tv. **Incrémentale** — curseur `CB_LAST_DATE` en Script Property, ne retraite que les épisodes diffusés depuis. Dédoublonnage sur (Recette ID | Code SAQ), donc relançable sans risque. `UrlFetchApp.fetchAll` pour la vitesse ; garde-fou 5 min (renvoie `termine:false` → relancer). Premier remplissage : lancer depuis l'éditeur (96 épisodes → 106 accords au 6 sept.). `resetCurieuxBegin()` remet à zéro.
- **Site (Next.js), pièges** : le `BUILD_ID` change à chaque déploiement du site → relu dans le HTML d'accueil par `getBuildIdCuisinez_` (`"buildId":"..."`). Émission Curieux Bégin = **id 3**. Deux endpoints : `/_next/data/{BUILD_ID}/emissions/3/curieux-begin.json` (96 épisodes + ~356 recettes id+slug, avec `dateDiffusion`) et `/_next/data/{BUILD_ID}/recettes/{id}/{slug}.json` (→ `pageProps.data.boissons[]` : `nom`, `typeProduit`, `prix`, `urlSAQ`). Le code SAQ est extrait de `urlSAQ` (`saq.com/fr/{code}`, via `codeSAQDepuisUrl_`) — certaines urlSAQ ont un autre format et sont ignorées. Environ 1 recette sur 3 a un accord, concentré sur les saisons récentes (16-18). Le `id` d'épisode n'est PAS chronologique → curseur par **date**, jamais par id.
- **Front** : global `ALL_CURIEUXBEGIN` (chargé par `getCurieuxBegin`, comme `ALL_ACCORDS`/`ALL_RECETTES`).
  - Fiche : 4e volet « Curieux Bégin » dans « Accords selon… » (`chargerCurieuxBeginFicheV2`, ajouté à `basculerAccordsSelonV2` sous la clé `'cb'`). Cartes `.carte fiche-mets` (comme les sommeliers) : plat en titre, « Curieux Bégin » dessous, « Saison X-Y » à droite, **cliquables** vers `cuisinez.telequebec.tv/recettes/{id}/{slug}`.
  - Page autonome `#curieuxBeginV2Container` (« Selon Curieux Bégin ») bâtie sur le **modèle de la page Suggestions** : groupée par vin (`.carte histo-vin` → la fiche, provenance `'curieuxbegin'` dans `fermerFicheV2`) avec les recettes dessous (`.carte histo-mets` → la recette). Panneau de filtres déclaratif `PANNEAUX_V2.curieuxbegin` (couleur + recherche texte + « en cave » + Réinitialiser), état `filtresCurieuxBeginV2`. **N'affiche que les vins que j'ai** (match code SAQ via `saqInfosV2`). Route burger `'curieuxbegin'`, sous-item de « Accord selon… ». Ajoutée à `cacherToutesPagesV2`. Réutilise les classes existantes — aucun CSS neuf.
- **Suites possibles, non faites** : bouton « Mettre à jour Curieux Bégin » dans l'app (via doPost `majCurieuxBegin`) au lieu de l'éditeur ; « bingo » à la création d'un vin. Recherche d'origine : `recherche-cuisinez.md`.

## 🕳️ Trous connus
- **`Code.gs` n'est pas dans le dépôt** : aucun historique, aucun retour arrière, sauf les versions internes d'Apps Script. Dépôt privé séparé envisagé, non tranché (dépôt public refusé le 3 septembre 2026).
- **Le flux « suggestion par scan »** repose sur un drapeau global `suggestionsV2Attente` posé et retiré à sept endroits. Fragile par conception.
- **Découpage des JS** (proposé, non tranché) : `scripts-scanner-v2.js` est un fourre-tout. Même exercice souhaité pour `Code.gs`.
- **CONFIG n'est rechargée qu'au démarrage** : un accord ou un sommelier ajouté n'apparaît sur l'autre téléphone qu'à la prochaine ouverture. RAFRAÎCHIR ne la recharge pas — accepté.
