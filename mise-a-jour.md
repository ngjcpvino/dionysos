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
- **`Favori` (18 sept. 2026)** : l'en-tête de cette colonne dans l'onglet `Vino` a bien été renommé **« Favori »** — `updateWineField` peut donc l'écrire directement, comme Racheter / Panier / Accords / Notes temporaires.

**Nommage**
- **« Suggestions » → « Propositions » à l'écran (11 sept. 2026)** : tout le texte VISIBLE dit « Proposition(s) » (titre de page, item de menu — l'ancien « Sommeliers » compris —, onglet « Liste propositions » de la Liste d'achat, compteurs, « Aucune proposition », statut « Proposition » des cartes, toast). **Le code, les données et le backend gardent « suggestion »** : ids/fonctions `*Suggestion*V2`, `ALL_SUGGESTIONS`, la valeur de Statut `'Suggestion'` (comparée partout), les routes `getSuggestions`/`ajouterSuggestion`/`corrigerSuggestion`, la route burger `'suggestions'`. Ne PAS renommer ces derniers. Le mot **sommelier** (la personne) reste tel quel : filtre « Sommelier », « Ajouter un sommelier », volet « Les sommeliers » de la fiche.

**Comparaisons**
- Texte utilisateur (cépages, accords, noms) → `normaliserRechercheV2` / `memeTexteV2` / `contientTexteV2`.
- Codes-barres ET codes SAQ au backend → `memeCodeBarre` / `listeContientCode` (zéros de tête). Le front compare via `memeCodeV2` (même corps, autre fichier : corriger l'un = corriger l'autre).

**Navigation**
- Toute nouvelle page : l'ajouter à `cacherToutesPagesV2()` ET appeler `remonterScrollV2` à son ouverture.
- Tout passage « masquer un overlay puis en ouvrir un autre » passe par `ouvrirApresTap(fn)` (anti double-clic).
- Overlay par-dessus un autre : z-index supérieur, l'ordre HTML ne suffit pas.
- `#secretV2Container` est HORS de `cacherToutesPagesV2()` — exception voulue, ne pas « corriger ».
- **Déplacer → « À ranger » (13 sept. 2026)** : le rond « À ranger » (`deplacerV2-aranger`) n'est montré que tant qu'AUCUN meuble n'est choisi — `choisirMeubleDeplacer` le masque, `deplacerARangerV2` refuse d'agir si un meuble est choisi. Raison : en choisissant l'espace, le doigt effleurait « À ranger » et perdait le rangement en cours.
- **Ordre d'affichage des emplacements (13 sept. 2026)** : `comparerEmplacementsV2` trie **Cellier → Pigeonnier → Réserve** (`ORDRE_MEUBLES_V2`), « À ranger » toujours en dernier — partout où plusieurs emplacements sont listés (cave, doubles, menu d'action…). C'est l'INVERSE de `CHAINE_MEUBLES_V2` (l'ordre de remplissage).
- **La remise à zéro d'une page doit lister EXACTEMENT les mêmes clés que sa fonction Réinitialiser.** C'est là que l'écart se cache, et il est invisible puisque le panneau est fermé (défaut trouvé deux fois le 3 septembre 2026).

**Erreurs**
- Tout nouveau `.catch()` passe un message parlant à `retourAccueilV2(message)`. La phrase passe-partout cache les vraies causes.
- Toast : ne jamais poser `display:none` en ligne sans le retirer à l'affichage suivant. Signature du bogue : « marche au premier essai, mort ensuite ».
- **Journal des erreurs (13 sept. 2026)** : chaque erreur (capteurs `window error` / `unhandledrejection` + `retourAccueilV2`) appelle `logErreurV2` (socle) → route backend `logErreur` → onglet **« Erreurs »** du Sheet (Date · Message · Page · Code), créé au besoin. Feu-et-oublie : jamais bloquant, jamais de boucle. **Pas de fichier GitHub** : le front est statique, il ne peut pas écrire dans le dépôt.

**CSS**
- Une valeur = un seul endroit (`:root`), nommée par sa valeur (`--ls-9`), jamais par son usage. Réutiliser `.roundel`, `.champ-saisie`, `.menu-liste`/`.item-liste`, `.controle`, `.titre-1`, `.titre-action`, `.icone-loupe` (icône 20px des loupes), `.ligne-ajout` (rangée « titre + rond `+` »), `.bloc-favori`, `.toast-img` avant de créer du neuf. **Jamais de style en dur dans le JS** (sauf `display:none` d'état initial). Un nouveau filtre = une entrée dans `PANNEAUX_V2`, jamais un conteneur/CSS à part (leçon du 11 sept. : le sommelier fait à part a dû être refait).
- **Accordéons** : indentation + espacement partagés via `.accordeon-1` (1er niveau) / `.accordeon-2` (2e niveau) + jeton `--espace-accordeon: 7px`. UN seul style réutilisé partout (menu burger, recettes SAQ, Chartier, Curieux Bégin). Un nouvel accordéon pose ces classes sur ses `.item-liste`, pas de nouveau CSS par cas (règle posée le 6 septembre 2026).
- Jamais `100vh` : toujours `height:100%` (iOS recadre le fond). Fond de page toujours OPAQUE.
- Loupe et ✕ d'une page-liste : `position:fixed` (`.gauche` reste `absolute`).
- Carte avec date à droite : `white-space:nowrap` (exception : items des panneaux, qui replient). Carte indentée pleine largeur : `width: calc(100% - indent)`.
- Nouvelle couleur de vin : 4 blocs CSS + `couleurClasseV2` + classement fiche (2 endroits) + tri de `grouperVinsV2`.
- **Modifier un panneau de filtres = modifier `PANNEAUX_V2`, jamais le HTML.** Exceptions : `construirePanneauChartierV2` et `construirePanneauSelonSaqV2` fabriquent le leur à la main (contrôles par catégories/ingrédients) — mais ils suivent **le même standard**.
- **Standard des panneaux de filtres (7 sept. 2026)**, dans cet ordre : (1) titre **« Afficher »** + onglets de mode (`.item-liste`) s'il y a lieu ; (2) titre **« Filtrer »** + les menus (`.champ-cliquable`) + la recherche texte ; (3) autres boutons (`apresReinit`). **Plus de bouton « Réinitialiser » dans les panneaux.**
- **Interrupteur « en haut » (11 sept. 2026)** : l'interrupteur oui/non d'un panneau (**En cave** partout, **En promo** sur la Liste d'achat) n'est plus une `.ligne-dispo` dans le panneau — c'est un **rond placé juste à droite de l'entonnoir** (en haut à gauche, `left: space-s + taille-tactile + space-s`), sur la même ligne, libellé (`.libelle-haut`) **à sa suite, à droite**. Pas centré sur l'écran — décision du 11 sept. après coup, le centre faisait « flottant » sur iPad (large). Classe partagée **`.filtre-toggle-haut`**, placée dans le conteneur **après** son `.panneau-gauche` ; **montré/caché en CSS pur** par `.panneau-gauche.ouvert ~ .filtre-toggle-haut` (aucun JS par cas). Le rond garde son id et sa fonction d'origine (`caveV2-dispo`/`toggleDispoCaveV2`, `achatV2-promo`/`toggleAchatPromoSeulV2`, etc.). Les deux panneaux fabriqués à la main (Chartier, Selon SAQ), reconstruits à chaque ouverture, resynchronisent leur rond via **`majToggleHautV2(id, actif)`**. Vaut pour les 8 panneaux : Cave · Historique · Recherche · Sommeliers · Curieux Bégin · Chartier · Selon SAQ · Liste d'achat. Libellés raccourcis (« Que les vins en cave » → « En cave ») pour ne pas toucher l'entonnoir.
- **Entonnoir** : une seule règle CSS `[id$="-loupe"]` (fixe, en haut à gauche) — pas d'énumération. Doré (`.actif`) dès qu'un vrai **filtre** est actif (PAS le mode) : chaque fonction de rendu fait `loupe.classList.toggle('actif', …)`. **Le clic sur la loupe est géré par `clicLoupeV2(prefixe, reinitFn)`** (7 sept. 2026) : panneau **ouvert** + doré → **réinitialise** (le reinit referme) ; panneau **fermé** → **ouvre en gardant les choix** (ne réinitialise plus). Quand des filtres sont actifs et le panneau **fermé**, l'entonnoir devient une **flèche → « rouvrir »** — règle CSS `:has()` sur le conteneur (`img` masquée + `::after`), il redevient entonnoir doré à l'ouverture. Chaque `ouvrirFiltresXxxV2` n'est qu'un relais d'une ligne vers `clicLoupeV2`.
- Les pages « à partir d'un aliment » (**Selon SAQ**) montrent **tout par défaut** puis filtrent, comme les autres.

**Méthode**
- Un changement présenté mais sans « ok » reçu N'EST PAS appliqué — ne jamais le marquer fait.
- Ce fichier dit **quoi** changer et **où**. Le texte d'un « Trouve ceci » se copie TOUJOURS du fichier de code, jamais d'ici ni de mémoire — sinon le Rechercher ne trouve rien.
- Passage introuvable dans le dépôt → le dire et demander de le coller. Jamais un bloc approximatif.

## 🎨 Design
« Un chat est un chat. » Tout le V2 est pleine page, même fond que la fiche vin ; chaque écran = `.modal-v2-fullscreen` + `.modal-v2-content`. Titres BLANCS, jamais en or.

**Gabarit des pages VIN** (menu d'action compris) : ✕ en haut à droite ; NOM en capitales (`.titre-1`) ; origine Pays • Région • Appellation dessous (`.texte-secondaire`) ; action en titre blanc plein (`.titre-action`). Boire/Donner/Arrivée/Déplacer passent par `rendreEnteteActionV2(prefixe)`.

**Carte universelle `.carte`** : 3 zones flex + bande couleur en bas. `.carte-photo` 60px, `.carte-centre`, `.carte-droite`. Bandes `.note-1..5` (plats) et `.vin-*` (vin). `.carte-vide` = voile 0 bouteille. Cartes mets : date EN HAUT à droite. **Sous-titre des cartes vin (13 sept. 2026)** : une seule fonction `sousVinV2(w)` → **Pays • Région / Cépage / Appellation** (lignes vides masquées), branchée partout (cave, Liste d'achat, à ranger, recherche, historique, emplacements, Selon SAQ, Curieux Bégin). Exceptions gardées à la main : la cave garde l'étoile sur le cépage, la Liste d'achat ajoute les sommeliers en dessous.

**5 couleurs** : rouge, blanc, rosé, bulles (doré champagne `#E8D08A`), spiritueux (bleu `#446ffc`). Tri : spiritueux en 5e.

**Z-index** : écrans à `9999` ; `#menuActionV2Overlay`, `#histoEditV2Overlay`, `#photoV2Overlay` à `10010` ; loupes fixes et `.btn-fermer` à `10002` ; spinner et toast à `99999`.

## 🛡️ Anti-gel
`appelBackend` : timeout 30 s par défaut, ajustable (`options.timeout` — Promotions : 120 s et 300 s) via `AbortController` → « Le serveur ne répond pas », spinner toujours retiré (`finally`). Le socle écoute `window error` et `unhandledrejection` : toute erreur JS devient un toast. Démarrage : le spinner couvre `getConfig` ET `getInventoryData`. `demarrerAppV2(essai)` **réessaie 3× (1,5 s d'écart)** sur erreur réseau (« Failed to fetch », timeout) avant d'afficher « Connexion au serveur impossible… » — **pas** de réessai sur « Mot de passe incorrect » (l'écran du mot de passe se rouvre déjà). Ajouté le 8 sept. 2026 après un « Failed to fetch » au démarrage (backend pourtant public et joignable — blip réseau).

## 🔐 Sécurité
Mot de passe d'app à chaque appel. Backend : `params.secret` comparé à la Script Property `APP_SECRET` dans `doPost` ; absent ou faux → `ACCES_REFUSE`, aucune donnée. Si `APP_SECRET` n'est pas posée, tout passe (garde-fou de mise en route). Front : `localStorage.vinoSecret`, ajouté automatiquement par `appelBackend` — ne jamais l'ajouter à la main. `ACCES_REFUSE` → efface la clé, toast, rouvre `#secretV2Container`. Changer le mot de passe = changer `APP_SECRET` + nouveau déploiement.

`appsscript.json` reste en `ANYONE_ANONYMOUS` (nécessaire au fetch anonyme). `API_URL` est dans le dépôt public : le mot de passe la rend inoffensive.

## 🔑 Backend — pièges
- `checkWineExists` renvoie des bouteilles SANS `row` (d'où le repli sur `wineResult.row`).
- **« Boire » idempotent (13 sept. 2026)** : `actionBouteille('boire')` vérifie d'abord le statut de la bouteille ; s'il est déjà vide (bouteille sortie), il **retourne sans réécrire l'historique** (`dejaFait:true`). Corrige le plat écrit en double quand un 1er essai réussit côté serveur mais que l'app affiche une erreur et qu'on reclique.
- **`supprimerHistorique(row)` (13 sept. 2026)** : `deleteRow` dans l'onglet Historique. Front : rond **Supprimer** sur `histoEditV2Overlay` (`supprimerHistoEditV2`) → efface **seulement l'entrée** (le plat noté), **ne remet PAS la bouteille en stock**.
- `addBottle` est appelée par l'Arrivée, `createVinoSheet` par `ajouterVinAvecBouteilles` — **ni l'une ni l'autre n'est morte**.
- Clés Script : `SPREADSHEET_ID`, `APP_SECRET`, `SAQ_API_KEY`, `SAQ_ENV_ID`.
- **Détection Spiritueux** (`lireFicheSAQ`) : la méta-description de la page SAQ commence par le type exact (« Vodka. Format… »). Type ne commençant pas par « Vin » → Couleur = Spiritueux, cépages vidés, type complet → Appellation. **Le fil d'Ariane n'est PAS fiable, ne pas y revenir.**
- `testScrapingSAQ` porte un nom de test alors que c'est le lecteur de fiches utilisé partout (cache 5 min).

## 🍇 Selon Chartier — pièges

Accords mets-vins par **cépage** (méthode Chartier), distincte des Accords SAQ (qui passent par le code de famille). Le lien est le **cépage**, pas la famille.

- Données dans l'onglet Sheet **Chartier** (anciennement « Accords », renommé le 5 septembre 2026) : colonnes Cépage · Aliment · Nuance · Source. Lu par `getChartier`, alimenté à la main par `ajouterChartier`.
- Front : tout est nommé `chartierV2…` (conteneur `chartierV2Container`, moteur `construirePanneauChartierV2` / `calculerResultatsChartierV2`, état `filtresChartierV2` / `chartierV2Selection`). Le mot-clé de navigation reste `'accords'` (`burgerV2Click('accords')`).
- Le panneau se fabrique à la main (catégories d'ingrédients dépliantes) — **exception** à `PANNEAUX_V2`.
- **UN SEUL aliment de départ (18 sept. 2026)** : croiser deux aliments vidait la liste (asperge + crabe = aucun cépage, jamais un 2/2). Un aliment choisi **remplace** le précédent (`chartierV2Aliment`, `choisirAlimentChartierV2`) ; le panneau se referme sur le choix. Plus de score « 3/5 ».
- **Résultat** : un bloc par cépage que Chartier associe à cet aliment — titre `cépage (nuance)`, les vins de ce cépage dessous (ceux dont j'ai des bouteilles **en premier**, `vinsDisponiblesPourCepageV2`), puis **« Va aussi avec… »** (repliable, un seul ouvert à la fois) qui liste les **autres aliments du même cépage** (`autresAlimentsChartierV2`). Taper un de ces aliments **repart de lui** — c'est le lien qui sert à bâtir le plat, et le remplaçant du croisement.
- Un cépage sans vin en cave reste affiché (« Aucun vin de ce cépage ») : c'est la réponse du livre, pas un vide.
- **« En cave » (19 sept. 2026)** : il ne coupait que les **cépages** sans bouteille — les cartes des vins bus/sortis restaient visibles dessous, donc le bouton avait l'air mort. Il filtre maintenant AUSSI les cartes (`g.count > 0`), dans les deux sens (aliment → cépages et cépage → aliments). Règle générale : un interrupteur « En cave » doit couper au niveau des **cartes**, pas seulement des sections.
- Filtres Cépage (sens inverse : cépage → ses aliments) et Couleur inchangés.
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
- **Bouton « Accords SAQ » dans l'app (fait 8 sept. 2026, `Code.gs` redéployé)** : `majAccordsSAQ()` (route `doPost`) enchaîne `majFamillesAccordsVins(200)` — relancé par le front tant que `restants>0` (`termine:false`) — puis `majRecettesSAQ()`, et renvoie `{ termine, faits, familles, ajoutees }`. Front : `majAccordsSaqBoucleV2` (Outils, avant « Curieux Bégin », même icône `.item-icone`) relance auto, puis resynchronise `ALL_DATA` (`getInventoryData`) et vide `ALL_RECETTES` (familles écrites sur les vins), et affiche « ✓ Accords SAQ à jour (X recettes) » ou la **vraie** erreur.
- **Page « Selon SAQ » — plusieurs choix = INTERSECTION (8 sept. 2026)** : dans `calculerSelonSaqV2`, sélectionner plusieurs ingrédients (ou types de plats) garde les familles présentes pour **CHAQUE** choix (intersection) → les vins bons pour **TOUS** les choix, pas l'union. Avant, c'était `some` (union) et la liste **grossissait** en ajoutant un ingrédient. Décision « A » (comme Chartier : « ceux qui vont avec tous les aliments »). Sans choix : montre tout (tous les vins ayant un accord).
- **Correcteur de recette SAQ (codé 8 sept. 2026 — front prêt, `Code.gs` à redéployer)** : sur la fiche, « Accords selon → SAQ », un **✎** (`.corriger-crayon`) à côté de chaque recette ouvre `#corrigerRecetteV2Overlay` (`ouvrirCorrigerRecetteV2(sku)`). On corrige **Nom**, **Types de plats**, **Ingrédients** — chips avec ✗ (`retirerCorrigerV2`), ajout depuis la liste connue (`valeursConnuesRecettesV2`) ou saisie d'un nouveau (`basculerAjoutCorrigerV2` / `ajouterCorrigerV2`). Enregistrer → `corrigerRecetteSAQ(sku, nom, typesPlats, ingredients)` (route `doPost` ; écrit Nom col 2, Types col 4, Ingrédients col 5, séparateur `;;` ; ne touche PAS aux familles ni aux colonnes dormantes), puis resynchronise `ALL_RECETTES` et rafraîchit la fiche. Vaut partout (fiche **et** Selon SAQ). Reste tant qu'on ne fait pas `reconstruireRecettes`. Le nom continue d'ouvrir saq.com. `corrigerRecetteV2Overlay` dans `cacherToutesPagesV2`, z-index 10010.
- **Selon SAQ — volet « les recettes » (8 sept. 2026)** : dans les menus Ingrédients / Types de plats, **plus de compte `(xx)`** ; une valeur **sélectionnée** affiche une sous-ligne **« les recettes »** (`voirRecettesSelonSaqV2(el)`, `.item-liste.accordeon-1`) → la zone principale liste les recettes de cette valeur (nom + types de plats + ingrédients, cartes `.carte fiche-mets`, → saq.com, **lecture seule, pas de ✎**), avec **« ← Retour aux vins »** (`retourVinsSelonSaqV2`). État `selonSaqV2RecettesDe` (`{champ, valeur}` ou `null`), remis à `null` par toute action de filtre (toggle/tous/cave), au reset et à l'ouverture ; le filtre des vins reste actif. La correction reste seulement sur la fiche.
- Titres de recettes SAQ : cliquables, ouvrent la fiche produit `saq.com/fr/{sku}`.

## 📺 Selon Curieux Bégin — pièges (ajouté 6 septembre 2026)

Accords vin des recettes de l'émission **Curieux Bégin** (site cuisinez.telequebec.tv). 3e mécanique d'accord, distincte de Chartier (cépage) et des Accords SAQ (famille) : le lien est le **code SAQ** du vin proposé dans la recette. Sommelière principale Michèle Bouffard (pas la seule, et **jamais nommée dans les données** → la fonctionnalité s'appelle « Curieux Bégin »).

- **Données** : onglet Sheet **CurieuxBegin** — Code SAQ · Vin · Type · Prix · Plat · Recette ID · Slug · Saison · Episode · Date diffusion · Date maj. Une ligne par vin proposé. Lu par `getCurieuxBegin`.
- **Synchro** (`majCurieuxBegin`) : va chercher sur cuisinez.telequebec.tv. **Incrémentale** — curseur `CB_LAST_DATE` en Script Property, ne retraite que les épisodes diffusés depuis. Dédoublonnage sur (Recette ID | Code SAQ), donc relançable sans risque. `UrlFetchApp.fetchAll` pour la vitesse ; garde-fou 5 min (renvoie `termine:false` → relancer). Premier remplissage : lancer depuis l'éditeur (96 épisodes → 106 accords au 6 sept.). `resetCurieuxBegin()` remet à zéro.
- **Site (Next.js), pièges** : le `BUILD_ID` change à chaque déploiement du site → relu dans le HTML d'accueil par `getBuildIdCuisinez_` (`"buildId":"..."`). Émission Curieux Bégin = **id 3**. Deux endpoints : `/_next/data/{BUILD_ID}/emissions/3/curieux-begin.json` (96 épisodes + ~356 recettes id+slug, avec `dateDiffusion`) et `/_next/data/{BUILD_ID}/recettes/{id}/{slug}.json` (→ `pageProps.data.boissons[]` : `nom`, `typeProduit`, `prix`, `urlSAQ`). Le code SAQ est extrait de `urlSAQ` (`saq.com/fr/{code}`, via `codeSAQDepuisUrl_`) — certaines urlSAQ ont un autre format et sont ignorées. Environ 1 recette sur 3 a un accord, concentré sur les saisons récentes (16-18). Le `id` d'épisode n'est PAS chronologique → curseur par **date**, jamais par id.
- **Enrichissement SAQ** : `enrichirCurieuxBegin` (appelée en fin de `majCurieuxBegin`, repliable) va chercher via `testScrapingSAQ` le **cépage, la photo et le prix à jour** de chaque vin (un seul appel par code SAQ, appliqué à toutes ses lignes) et les stocke dans les colonnes **Cépage/Photo** (+ Prix mis à jour). Ne (re)tente que les lignes sans cépage. Le prix vient du même appel que le cépage/photo (pas d'appel « prix seul »). 1er run observé : 84 enrichis, 4 sans données SAQ.
- **Front** : global `ALL_CURIEUXBEGIN` (chargé par `getCurieuxBegin`, comme `ALL_ACCORDS`/`ALL_RECETTES`).
  - Fiche : volet « Curieux Bégin » dans « Accords selon… » (`chargerCurieuxBeginFicheV2`, ajouté à `basculerAccordsSelonV2` sous la clé `'cb'`). **Ordre des volets (7 sept. 2026) : Les sommeliers · Curieux Bégin · Chartier · SAQ** (l'ordre vient du HTML de `ouvrirFicheV2` ; `basculerAccordsSelonV2` retrouve chaque volet par identifiant). Cartes `.carte fiche-mets` (comme les sommeliers) : plat en titre, « Curieux Bégin » dessous, « Saison X-Y » à droite, **cliquables** vers `cuisinez.telequebec.tv/recettes/{id}/{slug}`.
  - Page autonome `#curieuxBeginV2Container` (« Selon Curieux Bégin ») bâtie sur le **modèle de la page Suggestions** : groupée par vin (`.carte histo-vin` → la fiche, provenance `'curieuxbegin'` dans `fermerFicheV2`) avec les recettes dessous (`.carte histo-mets` → la recette). Panneau de filtres déclaratif `PANNEAUX_V2.curieuxbegin` : **sélecteur de mode** « Mes vins / Vins que je n'ai pas » (deux `.item-liste` exclusifs comme la Liste d'achat, `choisirModeCurieuxBeginV2`) + couleur + recherche + « en cave » + Réinitialiser ; état `filtresCurieuxBeginV2` (`mode`, `couleur`, `cave`). **Mes vins** = mes vins (match code SAQ via `saqInfosV2`, carte → fiche). **Vins que je n'ai pas** = les autres (carte → SAQ, bande couleur d'après `type`, nom + cépage + photo + prix venant de l'enrichissement). Route burger `'curieuxbegin'`, sous-item de « Accord selon… ». Ajoutée à `cacherToutesPagesV2`. Réutilise les classes existantes ; une seule règle CSS scoppée `#curieuxBeginV2-filtres .ligne-dispo { margin-top: 0 }` (le toggle « en cave » n'est plus le 1er élément).
- **Mise à jour depuis l'app (fait 7 sept. 2026)** : sous-menu **Outils → « Curieux Bégin »** appelle `majCurieuxBegin` via `majCurieuxBeginBoucleV2` (scripts-scanner-v2.js) — **relance automatique** tant que le backend renvoie `termine:false` (garde-fou serveur 5 min), timeout front 330 s, cumule les ajouts, puis vide `ALL_CURIEUXBEGIN` et affiche « ✓ Curieux Bégin à jour (X ajouts) ». Même icône que l'ancien « RAFRAÎCHIR », désormais partagée par la classe `.item-icone` ; « RAFRAÎCHIR » a été renommé **« Données »** et déplacé dans Outils, sous « Curieux Bégin ».
- **Suites possibles, non faites** : « bingo » à la création d'un vin. Recherche d'origine : `recherche-cuisinez.md`.

## 🛒 Liste d'achat — promotions intégrées (11 septembre 2026)

La page **« Promotions SAQ » a été supprimée** (item de menu, page `promoV2Container`, toutes les fonctions `*PromoV2`, entrée `PANNEAUX_V2.promo`). Tout est replié dans la **Liste d'achat** (`achatV2`) pour ne plus faire d'allers-retours en succursale.

- **Panneau de filtre** (ordre voulu, dans `PANNEAUX_V2.achat` → `avant` + `filtres`) : (1) interrupteur **« En promo »** (`achatV2-promo` / `toggleAchatPromoSeulV2`, même patron que « en cave » ; libellé court pour ne pas passer sous l'entonnoir) ; (2) titre **SUCCURSALE** + le menu succursale ; (3) titre **AFFICHER** + les 5 listes ; (4) titre **FILTRER** (ajouté d'office par `construirePanneauxV2`) + Couleurs · Pays · Cépage · **Appellation** (nouveau) · Pastille. Plus de roundel « Ne pas racheter ».
- **AFFICHER = 5 modes** (`achatV2Mode`), ordre à l'écran : `achat` (à racheter : Racheter=Oui & 0 en stock, ou Panier=Oui) · `favoris` (Favori = Oui, l'étoile ★) · `suggestions` (« Liste propositions », Racheter vide) · `decouvertes` (promos SAQ sur des vins que je n'ai pas) · `nepasracheter` (Racheter=Non). Base construite dans `baseAchatV2()`.
  - **Filtre « Sommelier »** (11 sept. 2026) : un **filtre normal comme les autres**, dans `PANNEAUX_V2.achat.filtres` (`['sommelier','Sommelier']`, section FILTRER, **toujours visible**) — même mécanique que Couleur/Pays, **aucun conteneur ni style à part** (première version « sous propositions » abandonnée : cas spécial interdit, cf. REFERENCE « jamais en vase clos »). Seule particularité : ses **valeurs viennent de `ALL_SUGGESTIONS`** (pas d'un champ du vin), donc son menu est peuplé à part dans `remplirFiltresAchatV2` (hors de la boucle des menus). État `filtresAchatV2.sommelier`, appliqué dans `appliquerFiltresAchatV2` pour **toutes** les listes via `sommeliersDuVinV2` (code SAQ). Compte dans l'entonnoir doré.
- **Interrupteur « en promotion »** (`achatV2PromoSeul`) : ne garde, dans la liste courante, que les vins ayant une promo (`promoDuVinV2`). Sans effet sur `decouvertes` (déjà toutes des promos).
- **Cartes** — zone de droite EN PILE (classe réutilisable `.carte-droite-empilee` : `flex-direction: column; align-items: flex-end`) : **rond à cocher panier** en haut (inchangé, `.coche-panier`, garde `carte-vide`), puis le **prix** (`.fs-12 .color-white`) — et si promo : prix barré · prix promo · image points bonis (`.achat-bonis`, `blocPrixAchatV2` / `boisPointsAchatV2`) —, puis la **dispo** si une succursale est choisie. Un vin que j'ai ouvre sa fiche (provenance `'achat'`) ; une Découverte ouvre saq.com ; le rond reste partout (clé `cleCartePanierV2`, repli Code SAQ/Nom).
  - **Liste favoris** : nombre en stock **« X btl »** (`.fs-12`, gris hérité de `.carte-droite`) sous le prix — `baseAchatV2` pose `__count` sur chaque vin des modes « mes vins ».
  - **Liste suggestions** : le(s) **nom(s) du sommelier** sous l'origine, **en or** (`.color-primary`) pour trancher sur le gris des infos du vin (`sommeliersDuVinV2` lit `ALL_SUGGESTIONS` par code SAQ ; plusieurs → joints par « , »).
  - **Styles réutilisables, plus de nominatif (12 sept. 2026)** : les libellés de la zone de droite n'ont plus de CSS collé à `#achatV2-cartes`. Couleur via `.color-primary` / `.color-white` (le gris = hérité de `.carte-droite`), taille via `.fs-11` / `.fs-12`, disposition empilée via `.carte-droite-empilee` — toutes réutilisables ailleurs. Idem : gros ronds = `.ligne-ronds.grande`, boutons J'aime = `.cercle-choix`, modales au-dessus = `.modal-v2-avant`. Cf. REFERENCE « jamais nominatif ».
- **Tri** : `decouvertes` par cépage (sections `emp-meuble`), les autres par pays.
- **Repère 🍇 (Découvertes, 11 sept. 2026)** : à côté du **nom du cépage** (titre de section), quand ce cépage n'a **jamais** été le **cépage principal** (premier, `cepageDominant`) d'un de mes vins — `cepagesPrincipauxCaveV2()` = tout `ALL_DATA` **sauf** les propositions (`Statut === 'Suggestion'`), aucun filtre de stock (bus/sortis comptent : « déjà eus »). Marqueur `<span class="cepage-nouveau">🍇</span>` (`--fs-16`).
- **Drapeau « Cellier » (11 sept. 2026)** : petit **« Cellier » doré** (`.color-primary .fs-11`) à côté du nom sur la carte, pour savoir où trouver le vin en succursale (gamme SAQ « Produit Cellier »). Donnée `Cellier` = « Oui »/vide. **Backend** : `lireFicheSAQ` lit le badge dans le HTML serveur (`alt="Gamme de produit : … Cellier"`, comme la pastille) ; **colonne ajoutée à la main en fin de `Vino`** = `CELLIER_COL = TOTAL_COLS + 2` (juste après `FAMILLE_COL`) ; `getInventoryData` renvoie `"Cellier"` (2 endroits) ; la création d'un vin l'écrit ; **`majCellier()`** (modèle `majBoisTousVins`, à lancer depuis l'éditeur) remplit toute la colonne. `Code.gs` **redéployé**. Vaut pour mes vins (pas les Découvertes). **Affichage « Espace Cellier » (13 sept. 2026)** : le libellé VISIBLE dit « Espace Cellier » (carte de la Liste d'achat + ligne dorée sur la fiche, sous « Code SAQ », `wine.Cellier === 'Oui'`). Donnée / champ / backend gardent **« Cellier »**.
- **Succursale** (`filtresAchatV2.succ`) : une **succursale précise** → quantité en stock, et **les vins qu'elle n'a pas sont MASQUÉS** (carte `display:none` + `majCompteAchatV2` recompte les visibles) — comportement voulu retrouvé (`verifierDispoSAQ_GRAPHQL_V1`) ; **« Mes favorites »** (`FAV`) → vérifie toutes les favorites d'un coup, **sans masquer** (`getSuccursalesDisponibles`) ; **« Toutes les succursales »** (`TOUTES`) → **sans masquer**, toucher une carte cherche les **3 succursales proches** en stock + **itinéraire Apple Plans** (`dispoProchesAchatV2`, `maps.apple.com`). « Gérer mes favorites » via `gererFavoritesV2('achatV2')` (seul appelant restant).
- **Chargement** : à l'ouverture, la liste s'affiche tout de suite (prix réguliers depuis la colonne `Prix`) ; `getPromotionsSAQ` (mes promos, 120 s) charge en arrière-plan puis re-rend ; `getToutesPromotionsSAQ` (Découvertes, 300 s) chargé à la 1re sélection du mode. Aucun spinner bloquant, aucun `retourAccueilV2` si ces appels échouent (la liste reste utilisable). **Découvertes enrichies (13 sept. 2026)** : `getToutesPromotionsSAQ` renvoie aussi **appellation, région, pastille de goût** (attributs du catalogue) et **photo** (champ `images` du catalogue, avec **repli automatique** sans photo si le schéma la refuse — jamais de casse ; deux `Logger.log` « Attributs/Images promo » pour diagnostic). `baseAchatV2` remplit ces champs pour les Découvertes → filtres Pastille/Appellation peuplés + photo affichée. `Code.gs` **redéployé**.
- **Nuance connue** : plus de vue unique « tous mes vins en promo » (l'ancien « Mes vins » de Promotions) — c'est le découpage voulu (5 listes + interrupteur). « Liste d'achat + interrupteur » = mes vins à racheter qui sont en solde. À rouvrir si une liste « tout mon inventaire » devient utile.

## 🕳️ Trous connus
- **`Code.gs` n'est pas dans le dépôt** : aucun historique, aucun retour arrière, sauf les versions internes d'Apps Script. Dépôt privé séparé envisagé, non tranché (dépôt public refusé le 3 septembre 2026).
- **Le flux « suggestion par scan »** repose sur un drapeau global `suggestionsV2Attente` posé et retiré à sept endroits. Fragile par conception.
- **Découpage des JS** (proposé, non tranché) : `scripts-scanner-v2.js` est un fourre-tout. Même exercice souhaité pour `Code.gs`.
- **CONFIG n'est rechargée qu'au démarrage** : un accord ou un sommelier ajouté n'apparaît sur l'autre téléphone qu'à la prochaine ouverture. RAFRAÎCHIR ne la recharge pas — accepté.

## ⏳ Spinner partout + plus d'accueil entre deux pages (18 septembre 2026)
- **`appelBackend` affiche le spinner par DÉFAUT** (`scripts-socle-v2.js`). Ne rien passer = spinner (texte vide). `{ spinner: 'Texte' }` = spinner avec texte. **`{ spinner: '' }` = AUCUN spinner** — réservé aux appels de fond qui remplissent une liste déjà affichée (dispos SAQ et promotions de la Liste d'achat, prix et plats de la fiche, notes du sommelier, `getRecettes`/`getChartier`/`getCurieuxBegin`) et au journal d'erreurs (`logErreurV2`, feu-et-oublie).
- ⚠️ **RÈGLE : tout nouvel appel de fond DOIT passer `{ spinner: '' }`.** Sans option, il bloque l'écran — c'est voulu.
- **Compteur `_SPINNER_COMPTEUR`** (+ `_SPINNER_MINUTERIE`) : le spinner reste affiché tant qu'un appel est en cours et ne disparaît qu'au tour suivant. Une suite d'appels enchaînés (Boire, Donner, Déplacer, Arrivée) ne laisse plus l'écran cliquable entre deux → fini le double-clic sur Confirmer / Enregistrer. Le texte du premier appel (« Santé ») est conservé pour toute la suite : un appel sans texte n'efface pas celui qui est affiché.
- **`naviguerV2(ouvrir)` (`scripts-socle-v2.js`)** : spinner → `cacherToutesPagesV2()` → ouverture via `ouvrirApresTap` (la règle anti double-clic tient toujours). **L'accueil n'apparaît plus entre deux pages.** Posé partout où on masquait une page avant d'en ouvrir une autre : `menuV2Click` (Visualiser, Arrivée, Déplacer, Boire, Donner), `ouvrirActionDepuisFicheV2`, `deplacerDepuisARangerV2`, `deplacerDepuisEmpV2`, rond LIBRE des Emplacements → scan.
- ⚠️ Les ouvertures qui se posent PAR-DESSUS une page (cartes → fiche, mets → éditeur, grande photo ronde) gardent `ouvrirApresTap` : rien n'est masqué dessous, donc aucun accueil à cacher.
- **Boire** : `BOIRE_V2_EN_COURS` bloque un deuxième Confirmer. `BOIRE_V2_ACCORDS_INITIAUX` + `accordsSelectionnesBoireV2()` → les accords s'écrivent dès que la sélection CHANGE, **y compris quand on les retire tous** (avant, `if (accords.length)` ignorait un retrait complet).
- **Reste à diagnostiquer** : dans Boire, la liste des accords ne se referme pas quand on retape sur « Accords ». Cause non trouvée, `basculerMenuAccordsBoireV2` a l'air correcte. À tester sur le téléphone avant de corriger.

## ⭐ Rond « Favori » sur la fiche (18 septembre 2026)
- La ligne de ronds de la fiche porte maintenant **trois** colonnes : « Racheter ? » · « Sur-inventaire ? » · **« Vin favori Cépage ? »** (`ficheV2-favori` / `toggleFavoriV2`, même mécanique que Sur-inventaire, écrit le champ `Favori` par `updateWineField`).
- C'est **le même champ** que « Vin pour cépage favori » du crayon (`editV2-favori`, route `saveWineEdits`) : les deux doivent toujours dire la même chose.
- Le rond allume/éteint aussi l'**étoile ★** de la ligne des cépages (`ficheV2-etoile-favori`) sans recharger la fiche. L'étoile reste ABSENTE quand le vin n'est pas favori — jamais une étoile grise.
- La classe `.deux-colonnes` a été renommée **`.colonnes-controle`** (elle en porte trois) — `flex: 1` par colonne, aucun CSS à ajouter pour une 4e.

## 📍 Emplacements — panneau au standard Afficher / Filtrer (18 septembre 2026)
- Le panneau suit maintenant le standard des autres pages : **Afficher** (`avant`) puis **Filtrer** (les menus). Les six **roundels** du bas ont disparu, remplacés par sept `.item-liste` exclusifs — même patron que les cinq listes de la Liste d'achat.
- **Afficher** : Plan des meubles (défaut) · Vins en double · Cépages doubles · Liste du meuble · Cépages manquants · Appellation manquante · Familles manquantes. État `empV2Mode` (+ `MODES_EMP_V2`), `choisirModeEmpV2` ferme le panneau ; `rendreEmpV2()` rend le mode courant (`afficherEmpV2` ou `afficherListeEmpV2`) — **toute action de filtre passe par lui**, jamais par `afficherEmpV2` directement. `empListeV2Type` (écrit mais jamais lu) a été supprimé.
- **La portée vient du filtre Meuble**, pas d'un mode : sans meuble les listes portent sur tout, avec un meuble elles portent sur ce meuble. **Cépages doubles** et **Liste du meuble** n'existent que dans un meuble — retirer le meuble ramène au plan (`choisirFiltreEmpV2`, `reinitialiserFiltresEmpV2`).
- **Filtrer** : Meuble · Rangée · Espace · **Cépage · Couleur · Pays** (les trois nouveaux). Ils s'appliquent aux vins affichés via `vinPasseFiltresEmpV2` / `groupesFiltresEmpV2`, posés sur **chaque appel de groupement qui alimente l'affichage** — jamais sur les calculs de « ce qui existe » (`cepDansMeuble`, `cepStock`, `famStock`, `appStock`), sinon les listes « manquants » mentiraient.
- ⚠️ Les filtres agissent **avant** la détection des doubles : « Cépages doubles + Rouge » = les cépages en double **parmi les rouges**, pas les doubles rouges d'une paire mixte. C'est voulu.
- Les valeurs des trois menus viennent de `baseFiltresVinEmpV2()` : les listes « manquants » puisent dans tout `ALL_DATA` (elles montrent des vins hors stock), les autres dans les bouteilles rangées de la portée courante. Cépages via `uniqueCepagesEmpV2` (cépage dominant, sans doublon).
- L'entonnoir est doré dès qu'un des **six** filtres est actif — jamais pour le mode, conformément au standard.
- **Exception au standard du 7 sept. (18 sept. 2026)** : le panneau des Emplacements garde un **roundel « Réinitialiser »** en bas (`apresReinit`), demandé explicitement. Il vide les six filtres, **ramène au plan des meubles** et referme le panneau — même fonction que le tap sur l'entonnoir doré. Les sept autres panneaux n'en ont toujours pas.

## 📝 Mes notes d'accord (18 septembre 2026)
Une phrase entendue, notée telle quelle : « asperge et crabe m'amènent un chablis ». **4e mécanique d'accord**, et la seule qui ne s'accroche à aucun vin — c'est ce qui la distingue des Propositions (un vin par code SAQ), de Chartier (cépage) et des Accords SAQ (famille). Raison d'être : Chartier demande de traduire « chablis » en cépage et son onglet est maigre ; la note, elle, se prend en trois champs.

- **Données** : onglet Sheet **`Notes`** — Date · Aliments · Appelle · Source. Créé au besoin par le backend.
- **Backend** (`Code.gs`) : `getNotesAccord` · `ajouterNoteAccord(aliments, appelle, source)` · `corrigerNoteAccord(row, …)` · `supprimerNoteAccord(row)`, plus leurs quatre `case` dans le `switch` de `doPost`.
- **Front** : global `ALL_NOTES` (socle), page `notesV2Container` + overlay `noteEditV2Overlay` (les deux dans `cacherToutesPagesV2`), route burger `'notes'` → item **« Mes notes »** dans ACCORD SELON…, sous Propositions.
- **Page bâtie sur le modèle de Curieux Bégin (18 sept. 2026)** : la note est la carte d'en-tête (`.carte histo-vin` — ce que ça appelle en titre, aliments · source dessous, date à droite), et **mes vins qui répondent à la note** sont les cartes indentées dessous (`.carte histo-mets` + `couleurClasseV2`, sous-titre `sousVinV2`, « X btl » par `caseDroiteV2`) → la fiche, provenance `'notes'` dans `fermerFicheV2`. Aucun vin → une carte « Aucun vin ». Le groupe `.histo-groupe` reste sans classe de couleur (l'en-tête est une note, pas un vin).
- **Correspondance note → vins** (`vinsDeLaNoteV2`) : le texte de « Ça appelle » est comparé au **Cépage ET à l'Appellation**, **dans les deux sens** (`contientTexteV2`) — « Chablis » est une appellation, pas un cépage, et « un chablis bien frais » doit trouver le même vin. Valeurs vides ignorées (sinon tout matche), propositions (`Statut === 'Suggestion'`) exclues.
- Le tap sur la note ne sert plus à la corriger : la correction/suppression passe par le **✎** (`.corriger-crayon`, comme les recettes SAQ) à droite de la note.
- Panneau au standard : filtre **Qui l'a dit** + recherche texte (aliments, appelle, source) + roundel **Ajouter**, plus l'interrupteur **« En cave »** (`notesV2-cave` / `toggleCaveNotesV2`, rond à droite de l'entonnoir) qui ne garde que les vins encore en stock — il filtre **les vins**, jamais les notes. L'entonnoir dore avec l'un des trois.
- Les notes sont rechargées après chaque écriture (`ALL_NOTES` vidé puis `getNotesAccord`) — règle des données fraîches.

## 🔎 Recherche de l'accueil — elle fouille TOUT (18 septembre 2026)
La loupe de l'accueil ne cherchait que dans les vins. Elle cherche maintenant dans les **six** sources, et les résultats sortent en **sections** (`.emp-meuble` en titre, sans compte — le total global reste en haut) : **Vins · Mes notes · Propositions · Chartier · Recettes SAQ · Curieux Bégin**.
- Les **filtres du panneau** (sommelier, couleur, cépage, pays, appellation, accords, pastille, en cave) ne portent **que sur la section Vins** — voulu : ce sont des attributs de vin.
- Les autres sections n'apparaissent qu'à partir de **2 lettres tapées** (le filtre Sommelier seul, sans mot, ne montre que des vins).
- **Cartes réutilisées, jamais réécrites** : `groupeNoteV2` (page Mes notes), `groupeSuggestionV2` (Propositions), `groupeCurieuxBeginV2` (Curieux Bégin), `carteRecetteSaqV2` (volet « les recettes » de Selon SAQ) ont été **extraits** de leur page pour servir aux deux endroits. Corriger la carte = la corriger partout, une seule fois.
- Chartier n'avait pas de carte : une par ligne trouvée (aliment en titre, cépage · nuance · source dessous) qui ouvre **Chartier déjà filtré sur ce cépage** (`ouvrirChartierCepageV2`).
- **Chaque section est coupée à 50 cartes** (`MAX_SECTION_RECHERCHE_V2`) ; une ligne « X de plus — précise ton mot » ferme la section.
- **Chargement** : Chartier, recettes SAQ, Curieux Bégin et les notes ne sont chargés qu'à l'ouverture de leur page. `chargerSourcesRechercheV2()` (appelée à l'ouverture de la recherche) va chercher **celles qui manquent**, une à la fois, puis relance l'affichage si la page est encore ouverte. Une seule attente par session.
- Une note ou une proposition corrigée depuis la recherche remet la liste à jour (`rafraichirRechercheSiOuverteV2`).

## 🔄 Bouton « Données » — il resynchronise TOUT (18 septembre 2026)
Il ne reprenait que l'inventaire (et vidait l'historique) : ce que l'autre téléphone venait d'écrire — une note, une proposition, un accord — restait invisible tant que l'app n'était pas fermée.
- Il reprend maintenant `getInventoryData` **et** `getSuggestions`, puis **vide** `ALL_HISTORIQUE`, `ALL_NOTES`, `ALL_ACCORDS`, `ALL_RECETTES`, `ALL_CURIEUXBEGIN` — chacune se recharge à l'ouverture de sa page (ou à la prochaine recherche).
- **Toujours pas rechargée : `CONFIG`** (voir Trous connus) — inchangé, accepté.
- ⚠️ **Règle** : toute nouvelle liste gardée en mémoire doit être ajoutée à ce bouton, sinon elle vieillit en silence sur l'autre téléphone.

## ⭕ Ronds à cocher sur le placement (20 septembre 2026)
Sur **Ajouter** et **Déplacer**, chaque roundel **Meuble · Rangée · Espace** porte le rond vide de la Liste d'achat (`.coche-panier`, nouvelle pose `.roundel-coche` en absolu à droite pour ne pas décaler l'anneau). Il se coche dès que la valeur est choisie.
- **Une seule fonction écrit les deux** : `majBarrePlacementV2(prefixe, champ, valeur, defaut)` — libellé ET rond. Ne jamais réécrire `…-barre.textContent` à la main, sinon le rond ment.
- Changer de meuble décoche Rangée et Espace ; un espace refusé (`checkLocationAvailable`) décoche Espace.
