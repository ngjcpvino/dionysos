# 🍷 Dionysos — Règles et invariants (4 septembre 2026)

> Ce fichier ne décrit PAS les pages : le code fait foi. Il ne contient que ce qui ne se lit pas dans le code — décisions prises, pièges connus, façons de faire imposées.
> Les règles de travail (méthode de correction, format des échanges) sont dans `REFERENCE.md`.

## 📁 Architecture
- **Frontend** : GitHub Pages, dépôt public `ngjcpvino/dionysos`
- **Backend** : Google Apps Script, projet « Vino 3.0 », `Code.gs` — **hors dépôt** (voir Trous connus)
- **Base** : Google Sheets « Vino 3.0 » — onglets Vino · Historique · config/CONFIG · Suggestions · Accords · Recettes
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
- Jamais `100vh` : toujours `height:100%` (iOS recadre le fond). Fond de page toujours OPAQUE.
- Loupe et ✕ d'une page-liste : `position:fixed` (`.gauche` reste `absolute`).
- Carte avec date à droite : `white-space:nowrap` (exception : items des panneaux, qui replient). Carte indentée pleine largeur : `width: calc(100% - indent)`.
- Nouvelle couleur de vin : 4 blocs CSS + `couleurClasseV2` + classement fiche (2 endroits) + tri de `grouperVinsV2`.
- **Modifier un panneau de filtres = modifier `PANNEAUX_V2`, jamais le HTML.** Exception connue : `construirePanneauAccordsV2` fabrique le sien à la main (catégories dépliantes).

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

## 🍽️ Accords SAQ — pièges
Mécanique distincte de Chartier : le lien vin → recettes est un **code de famille** de l'API SAQ, pas le cépage. Un vin porte UNE famille (colonne 71), une recette en porte plusieurs — c'est la charnière.

- Le code de famille s'écrit avec une **apostrophe de tête** (`'023`) pour garder le zéro.
- Des **fromages du Québec** sortent en `catalog_type: 3` comme les recettes (Raclette de Compton, Valbert…) — d'où la colonne Type de l'onglet.
- Le classement SAQ est parfois bancal (« Hachis parmentier » en Volaille) : **les ingrédients principaux sont plus fiables que les types de plats.**
- Un appel API par famille suffit, aucune pagination. Pas de photo de recette dans l'API, contrairement au site.
- `robots.txt` interdit `/recettes` sur saq.com — les fiches produits, elles, sont permises.
- Alimentation à la main depuis l'éditeur : `majFamillesAccordsVins()` (autant de passages que nécessaire) puis `majRecettesSAQ()`, qui ne réécrit jamais une ligne existante.
- Décidé : titres de recettes en texte seul, **pas de liens cliquables**.

## 🕳️ Trous connus
- **`Code.gs` n'est pas dans le dépôt** : aucun historique, aucun retour arrière, sauf les versions internes d'Apps Script. Dépôt privé séparé envisagé, non tranché (dépôt public refusé le 3 septembre 2026).
- **Le flux « suggestion par scan »** repose sur un drapeau global `suggestionsV2Attente` posé et retiré à sept endroits. Fragile par conception.
- **Découpage des JS** (proposé, non tranché) : `scripts-scanner-v2.js` est un fourre-tout. Même exercice souhaité pour `Code.gs`.
- **CONFIG n'est rechargée qu'au démarrage** : un accord ou un sommelier ajouté n'apparaît sur l'autre téléphone qu'à la prochaine ouverture. RAFRAÎCHIR ne la recharge pas — accepté.
