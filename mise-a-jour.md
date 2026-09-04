# 🍷 Dionysos — État du projet (à jour au 4 septembre 2026)

> Les RÈGLES DE TRAVAIL sont dans `REFERENCE.md` (à lire en premier). Ce fichier ne contient que l'état technique. Deux `.md` seulement : `REFERENCE.md` et celui-ci (+ le dossier « a faire »).

## 📁 Architecture
- **Frontend** : GitHub Pages, dépôt public `ngjcpvino/dionysos`
- **Backend** : Google Apps Script, projet « Vino 3.0 », `Code.gs` — **hors dépôt** (voir Trous connus)
- **Base** : Google Sheets « Vino 3.0 » — onglets Vino · Historique · config/CONFIG · Suggestions · Accords · **Recettes**
- **Adresse** : `.../index-v2.html`. L'adresse de base donne « page introuvable » — assumé, et ce n'est PAS une protection.

## 📂 Fichiers
`index-v2.html` · `styles-v2.css` · `scripts-socle-v2.js` · `scripts-scanner-v2.js` · `scripts-fiche-v2.js` · `Code.gs` (Apps Script)

- **`scripts-socle-v2.js`** : `API_URL`, `appelBackend` + spinner, globales (`CONFIG`, `ALL_DATA`, `ALL_HISTORIQUE`, `ALL_SUGGESTIONS`, `CURRENT_WINE_*`, `FICHE_V2_PROVENANCE`, `FICHE_V2_ORIGINE`), `afficherMessage`, `afficherMessageImage`, `decodeHTML`, `memeCodeV2`, `ouvrirApresTap`, `remonterScrollV2`, `ouvrirSAQV2`, capteur d'erreurs globales, écran mot de passe, démarrage.
- **`scripts-scanner-v2.js`** : fourre-tout — scan, menu d'action, saisie manuelle, vin inconnu, Arrivée, Déplacer, Boire, Donner, Cave, À ranger, Sans cépage, Suggestions, Liste d'achat, Emplacements, Historique, Promotions, Recherche, facture, Selon Chartier, Selon SAQ, navigation, panneaux de filtres.
- **`scripts-fiche-v2.js`** : fiche, édition, photo, plats, suggestions de la fiche, accords SAQ de la fiche, utilitaires mémoire.
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
- **Nouvelle donnée = nouvelle colonne EN FIN de `Vino`**, jamais un recyclage : `Bois` (70), `Famille accords` (71, colonne BT). L'ancienne colonne « Recettes » est devenue `REF_COLS.FAVORI` — ne jamais la réutiliser pour autre chose.

**Comparaisons**
- Texte utilisateur (cépages, accords, noms) → `normaliserRechercheV2` / `memeTexteV2` / `contientTexteV2`.
- Codes-barres ET codes SAQ au backend → `memeCodeBarre` / `listeContientCode` (zéros de tête). Le front compare via `memeCodeV2` (même corps, autre fichier : corriger l'un = corriger l'autre).

**Navigation**
- Toute nouvelle page : l'ajouter à `cacherToutesPagesV2()` ET appeler `remonterScrollV2` à son ouverture.
- Tout passage « masquer un overlay puis en ouvrir un autre » passe par `ouvrirApresTap(fn)` (anti double-clic).
- Overlay par-dessus un autre : z-index supérieur, l'ordre HTML ne suffit pas.
- `#secretV2Container` est HORS de `cacherToutesPagesV2()` — exception voulue, ne pas « corriger ».

**Erreurs**
- Tout nouveau `.catch()` passe un message parlant à `retourAccueilV2(message)`. La phrase passe-partout cache les vraies causes.
- Toast : ne jamais poser `display:none` en ligne sans le retirer à l'affichage suivant. Signature du bogue : « marche au premier essai, mort ensuite ».

**CSS**
- Une valeur = un seul endroit (`:root`), nommée par sa valeur (`--ls-9`), jamais par son usage. Réutiliser `.roundel`, `.champ-saisie`, `.menu-liste`/`.item-liste`, `.controle`, `.titre-1`, `.titre-action` avant de créer du neuf. Jamais de style en dur dans le JS.
- Jamais `100vh` : toujours `height:100%` (iOS recadre le fond). Fond de page toujours OPAQUE.
- Loupe et ✕ d'une page-liste : `position:fixed` (`.gauche` reste `absolute`).
- Carte avec date à droite : `white-space:nowrap` (exception : items des panneaux, qui replient). Carte indentée pleine largeur : `width: calc(100% - indent)`.
- Nouvelle couleur de vin : 4 blocs CSS + `couleurClasseV2` + classement fiche (2 endroits) + tri de `grouperVinsV2`.
- Modifier un panneau de filtres = modifier `PANNEAUX_V2`, jamais le HTML.

**Méthode**
- Un changement présenté mais sans « ok » reçu N'EST PAS appliqué — ne jamais le marquer fait.

## 🎨 Design
« Un chat est un chat. » Tout le V2 est pleine page, même fond que la fiche vin ; chaque écran = `.modal-v2-fullscreen` + `.modal-v2-content`. Titres BLANCS, jamais en or.

**Gabarit des pages VIN** (menu d'action compris) : ✕ en haut à droite ; NOM en capitales (`.titre-1`) ; origine Pays • Région • Appellation dessous (`.texte-secondaire`) ; action en titre blanc plein (`.titre-action`). Boire/Donner/Arrivée/Déplacer passent par `rendreEnteteActionV2(prefixe)`.

**Carte universelle `.carte`** : 3 zones flex + bande couleur en bas. `.carte-photo` 60px, `.carte-centre`, `.carte-droite`. Bandes `.note-1..5` (plats) et `.vin-*` (vin). `.carte-vide` = voile 0 bouteille. Cartes mets : date EN HAUT à droite.

**5 couleurs** : rouge, blanc, rosé, bulles (doré champagne `#E8D08A`), spiritueux (bleu `#446ffc`). Tri : spiritueux en 5e.

**Z-index** : écrans à `9999` ; `#menuActionV2Overlay`, `#histoEditV2Overlay`, `#photoV2Overlay` à `10010` ; loupes fixes et `.btn-fermer` à `10002` ; spinner et toast à `99999`.

## 🧠 Mémoire
App à 2 utilisateurs sur 2 téléphones, ~100 vins ; la vérité partagée est le Sheet.

- `getInventoryData` renvoie TOUS les champs (vins actifs et vins à 0 bouteille) pour que la fiche se bâtisse en mémoire — **`Famille` comprise** (colonne `Famille accords`, apostrophe de tête retirée à la lecture).
- `ALL_HISTORIQUE` en chargement paresseux : chargé à la première ouverture, invalidé après Boire et par RAFRAÎCHIR.
- `ALL_RECETTES` (déclaré dans `scripts-fiche-v2.js`) : chargé une fois par `getRecettes`, à la première fiche qui en a besoin ou à l'ouverture de Selon SAQ, puis mémoire. Jamais invalidé — l'onglet Recettes ne bouge que par une fonction lancée à la main.
- `ficheDepuisMemoireV2(cb)` → `{wine, bottles}` (secours `getWineBottles`). Fournit les clés sans accent `Designation`/`Temperature`/`Cepage`, et `Famille`.
- `wineResultDepuisMemoireV2(cb)` → équivalent `checkWineExists` depuis `ALL_DATA`, avec `row` dans chaque bouteille.
- `majMemoireVinV2(cb, champs)` → met à jour les items d'un vin après une écriture ciblée.

## 🛡️ Anti-gel
`appelBackend` : timeout 30 s par défaut, ajustable (`options.timeout` — Promotions : 120 s et 300 s) via `AbortController` → « Le serveur ne répond pas », spinner toujours retiré (`finally`). Le socle écoute `window error` et `unhandledrejection` : toute erreur JS devient un toast. Démarrage : le spinner couvre `getConfig` ET `getInventoryData`.

## 🧭 Navigation
- **Burger** (`burgerV2Click`) : ACCUEIL · CAVE · À RANGER · SANS CÉPAGE · SUGGESTIONS · **SELON CHARTIER** (cible `accords`) · **SELON SAQ** (cible `selonsaq`) · LISTE D'ACHAT (cible `racheter`) · EMPLACEMENTS · HISTORIQUE · PROMOTIONS SAQ · FACTURE · RAFRAÎCHIR. Chaque cible fait `cacherToutesPagesV2()` puis ouvre sa page ; ACCUEIL cache tout et vide `menuActionV2Context` ; RAFRAÎCHIR resynchronise `ALL_DATA` et vide `ALL_HISTORIQUE`. Une cible inconnue répond « À venir ». ⚠️ La ligne SELON CHARTIER avait disparu du HTML alors que tout son moteur était en place — remise le 4 septembre 2026.
- **Accueil** : `#topNavV2`, 4 boutons en `space-evenly` — scan · SAQ · loupe Recherche · burger. `ouvrirSAQV2` ouvre l'**app SAQ sur iPhone ET iPad**, saq.com ailleurs : depuis iPadOS 13, Safari sur iPad s'annonce « Macintosh » dans le `userAgent`, d'où le second test `navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1` (4 septembre 2026).
- **Menu d'action** : chaque bouton cache tout avant d'ouvrir ; la garde « 0 bouteille » est vérifiée avant tout. Œil grisé quand on arrive de la fiche (`FICHE_V2_ORIGINE`) ; un scan neuf le rallume.
- **Après Boire / Donner / Arrivée → ACCUEIL.** Déplacer honore `menuActionV2Context.retour` (utile pour ranger en série).
- **✕ des pages vin** : Boire/Donner/Arrivée rouvrent le menu d'action.

## 🎯 Scan
`startScanFromHomeV2` (éteint `suggestionsV2Attente`) → `startScannerV2` (Quagga sur `#interactiveV2`, seuil 3, lecteurs ean/code_128/upc) → `traiterResultatScanV2(code)` → `checkWineExists`.

`gtinValide` accepte 8, 12, 13 et 14 chiffres (la SAQ affiche des CUP à 14).

**Arbre des résultats**
- **A — Lecture** : caméra indisponible → entrée manuelle ; code douteux → seuil 3 ; checksum GTIN.
- **B — Vin existe** → `ouvrirMenuActionV2` : 👁 Visualiser · ➕ Arrivée · ⇄ Déplacer · 🍷 Boire · 🎁 Donner · ✕. Stock 0 → les trois du milieu grisés. `Racheter=Non` → image « ne pas racheter ».
- **C — Vin absent** → recherche SAQ auto (`chercherProduitSAQ_GRAPHQL_V1`). Trouvé → `creerVinSAQV2`. Introuvable → page « Vin inconnu » : code-barres modifiable, Code SAQ, Nom, roundel « Voir SAQ ». Confirmer (`creerVinManuelV2`) lit le code-barres TEL QUE CORRIGÉ : Code SAQ rempli → création SAQ ; sinon nouvelle recherche ; introuvable + nom → `creerVinNomV2` ; introuvable sans nom → message, la page reste ouverte.
  Cas couvert : CUP de la bouteille ≠ CUP de la fiche SAQ. `ajouterVinAvecBouteilles` rattache alors le nouveau code-barres à la liste CUP du vin existant (2 codes-barres par millésime).
- **D — Erreur** → message précis + `retourAccueilV2`.

**Entrée manuelle** : deux champs (Code-barres, Code SAQ), un bouton VALIDER. Code-barres → flux normal. Sinon Code SAQ → `testScrapingSAQ` récupère le CUP, puis flux normal. Ni l'un ni l'autre → message.

**Après création** (`enchainerMenuApresCreationV2`) : `checkWineExists`, puis resync `ALL_DATA`, puis menu. Si le vin n'est pas retrouvé → message d'erreur, PAS de menu vide. La **famille d'accords SAQ** est lue au passage (`getFamilleAccordsSAQ`) et écrite en colonne 71 — un appel API de plus à la création, rien au scan d'un vin connu.

## 📄 Fiche
`ouvrirFicheV2(codebarre, provenance)`, bâtie depuis `ficheDepuisMemoireV2`. Bordure à la couleur du vin. Température affichée sans le « De » de tête.

**Blocs** : Information · Description + Prix · Dégustation · Production · Notes · Historique des plats (section masquée si vide) · Suggérer · **Accords SAQ** · Inventaire (lecture seule) · Photo (clic → `#photoV2Overlay`) · roundel ACTION puis roundel OÙ LE TROUVER · vérification silencieuse du prix (`verifierPrixV2`).

**Notes du sommelier** (colonne « Notes temporaires ») : premier élément de la section Notes, toujours visible, tap → textarea, sortie du champ = sauvegarde si changé. Aussi pré-rempli dans Boire (`BOIRE_V2_NOTE_INITIALE`) — écrit seulement si changé, jamais par le ✕.

**Section Accords SAQ** (4 septembre 2026, `#ficheV2-recettes-section`, masquée par défaut) : bâtie par `chargerRecettesFicheV2(wine.Famille)` juste après « Suggérer ». Prend les recettes de la famille du vin (`recettesDeLaFamilleV2`) et affiche **types de plats** puis **ingrédients avec leur compte** (`comptesRecettesV2`, ordre décroissant), puis les **titres des recettes en texte seul** — pas de liens, décidé. Sans famille ou sans recette, la section reste invisible.

**Écritures directes** : Racheter / Panier / Accords → `updateWineField` + `majMemoireVinV2`. Édition crayon (27 champs, Photo URL comprise) → `saveWineEdits` + `majMemoireVinV2` puis réouverture. `saveWineEdits` écrit tout champ ENVOYÉ, y compris vide — vider un champ le vide dans le Sheet ; la photo est protégée par `!== undefined`.

**Photo SAQ** : roundel dans la page Modifier → `majPhotoSAQ` (n'écrit QUE la colonne Photo URL). Photo personnelle : coller une URL ou un chemin `images/...`.

**Bouton ACTION** : `ouvrirActionDepuisFicheV2` prend le contexte en mémoire, pose `FICHE_V2_ORIGINE`, ouvre le menu ; le ✕ du menu rouvre la fiche.

**Retour** (`fermerFicheV2`) : `menuScan` + origine → liste d'origine ; sinon menu d'action ; 'cave'/'achat'/'histo'/'promo'/'recherche'/'emplacements'/'empliste'/'aranger'/'sanscepage'/'suggestions'/'accords'/'selonsaq' → leur page.

## 📑 Pages

**Cave** — mémoire, filtres cascade (couleur → cépage → pays → appellation → accords), champ texte qui fouille tous les champs, total des vins + total des bouteilles dessous.

**À ranger** — bouteilles actives sans emplacement, tri couleur puis nom. Vide → « Tout est bien rangé! ». Clic → Déplacer (`retour='aranger'`).

**Sans cépage** — vins dont le champ Cépage est vide, gabarit Cave. Clic → fiche (provenance 'sanscepage').

**Liste d'achat** — contenu auto : (`Racheter`=Oui ET 0 bouteille) OU (`Panier`=Oui). Sections par PAYS, vins alphabétiques, cartes sans prix. Filtres et coches remis à zéro à chaque ouverture. Coche panier de session (mode conseiller SAQ) : carte voilée, reste à sa place. Succursale choisie → dispo par carte, non-disponibles CACHÉS, compte recalculé ; vins sans code SAQ restent visibles.

**Emplacements** — filtres cascade Meuble → Rangée → Espace, vue MEUBLE → RANGÉE → ronds.
- Séparateurs discrets (15 % de retrait), jamais de look Excel.
- Quinconce des rangées à 7 : BAS = 1-3-5-7, HAUT = 2-4-6.
- Rangée tirée : gros ronds, photo, bordure à la couleur du vin ; la ligne replie (pas de débordement).
- Rond occupé → grande photo ronde → fiche. Rond libre → SCAN.
- Bloc pseudo-meuble **« À ranger »** après les vrais meubles, une ligne de ronds qui replie, décompte simple. Visible s'il y a des bouteilles à ranger et aucun filtre (ou le filtre « À ranger »). Le compte du haut les inclut alors.
- Boutons : Vins en double · Cépages doubles (meuble choisi) · **Liste du meuble** (meuble choisi, sauf « À ranger ») · **Cépages manquants** — avec meuble : présents ailleurs, absents ici ; sans meuble : cépages de ma liste absents du stock actif, avec les vins à racheter dessous.
- **Liste du meuble** (4 septembre 2026, type `listemeuble` d'`afficherListeEmpV2`) : tout le contenu du meuble choisi en **sections par cépage dominant** (`cepageDominant` ; ordre alphabétique, casse et accents ignorés ; les vins sans cépage forment une section « Sans cépage »), vins alphabétiques sous chaque section, carte `X btl` + emplacements. Clic → fiche (provenance 'empliste'), retour à la liste par `empListeV2Type`.
- **Glissement sur la grande photo ronde** (4 septembre 2026) : chaque rond porte `data-row` ; au tap, le front bâtit la liste du parcours et l'index, puis les passe à `ouvrirPhotoEmpV2(cb, liste, row)`. Parcours = toutes les bouteilles du **meuble** touché en ordre physique (`parcoursMeubleEmpV2` : rangée puis espace) ; depuis le bloc « À ranger », ce sont les à-ranger. **Glisser vers la gauche = suivante, vers la droite = précédente ; ça bute aux deux bouts, pas de boucle.** Seuil de 50 px horizontaux (et dx > dy) pour distinguer du tap, qui ouvre toujours la fiche ; `PHOTO_V2_GLISSE` empêche le clic de suivre le glissement. La rangée ouverte derrière ne bouge pas.

**Historique** — `ALL_HISTORIQUE` paresseux, filtres **Mets (champ texte)** · Vin · Accord. Corps par vin : carte vin → fiche, cartes mets → éditeur Corriger (gabarit commun, plat en textarea). Origine retrouvée par Code SAQ d'abord, code-barres ensuite, jamais par le nom. **Le roundel « Ajouter » est dans le panneau de filtres**, pas sous les cartes.
- **Mets = vrai filtre texte** (4 septembre 2026) : le champ `#histoV2-f-mets` est en tête du panneau (bloc `avant` de `PANNEAUX_V2.histo`), plus dans un menu déroulant. Ce qu'on tape cherche dans le texte des mets (`normaliserRechercheV2`) et filtre les cartes directement, cumulable avec Vin et Accord ; loupe en or dès qu'il est rempli. `filtrerMetsHistoV2()` écrit dans `filtresHistoV2.mets` et redessine SANS reconstruire le panneau (sinon le champ perd le focus à chaque frappe). L'ancienne liste des plats entiers et `filtrerMenuMetsV2` sont retirées — la liste était devenue trop longue pour être utile.

**Suggestions** — notes de sommeliers, **indexées par Code SAQ** (jamais par code-barres : un vin sans code SAQ ne peut pas en recevoir). `ALL_SUGGESTIONS`, onglet Sheet « Suggestions ».
- Affichage au **gabarit de l'Historique** (`histo-groupe`) : carte vin (→ fiche, provenance 'suggestions') puis une carte par suggestion dessous (sommelier en titre, note en sous-titre, date à droite → `ouvrirSuggestionEditV2(..., 'liste')`).
- Filtres : Sommelier · Couleur · « en cave » (bascule ✓/✗, `bouteillesEnCaveParSAQV2`) · champ texte libre. **Tous remis à zéro à chaque ouverture.** La liste des sommeliers est bâtie depuis `ALL_SUGGESTIONS`, dédupliquée par `normaliserRechercheV2`.
- **Ajout** : depuis la section Suggérer de la fiche, ou par scan (`ajouterDepuisSuggestionsV2` → `suggestionsV2Attente = true` → scanner). Un vin absent est créé au passage, puis `terminerAjoutSuggestionV2` ouvre la fiche et l'écran de suggestion.
- **Écran ajout/correction** (`#suggestionEditV2Overlay`) : nom + origine du vin (repli « Vin » si le vin n'est pas encore en mémoire — d'où la resync obligatoire après création), sommelier, note. À l'AJOUT le sommelier est un menu (avec « + Ajouter un sommelier » → `ajouterSommelierConfig`) ; à la CORRECTION il est **figé** en ligne d'information.
- Sauvegarde → `ajouterSuggestion(codeSAQ, sommelier, note)` ou `corrigerSuggestion(row, ...)`, puis resync `ALL_SUGGESTIONS`. Retour selon l'origine : 'fiche' → recharge la section de la fiche ; 'liste' → réaffiche la page ; sinon → fiche du vin retrouvée par `barcodeDepuisSAQV2`.

**Promotions SAQ** — ouverture sur **Mes promos** (`getPromotionsSAQ`, timeout 120 s) ; **Découvertes** (`getToutesPromotionsSAQ`, ≤ 30 $, hors mes vins) chargées en arrière-plan dès l'ouverture (timeout 300 s). Mémoire de session. Cartes triées par rabais décroissant : prix barré, prix promo, points bonis, dispo. Succursale unique → `X btl` par carte ; `FAV` → chaque favorite ; `TOUTES` → tap = 3 succursales proches avec stock, chacune cliquable vers Plans.

**Recherche** — accès par la loupe de l'accueil (retirée du burger le 11 juillet 2026). Deux outils qui se combinent :
- Un **champ** qui fouille tous les champs de tous les vins (`lancerRechercheV2` à chaque frappe, accents et casse ignorés). Exclus : row, bottle, Statut, Meuble/Rangee/Espace, dates, Source, Photo URL. Champ vide → invitation « Tape un mot : agent, producteur, arôme, appellation… ».
- Un **panneau de 7 filtres** : Sommelier · Couleurs · Cépages · Pays · Appellations · Accords · Pastille de goût. Le filtre **Sommelier** est bâti depuis `ALL_SUGGESTIONS` — il retrouve les vins notés par un sommelier donné. Loupe en OR dès qu'un filtre est actif.
- Résultats groupés par vin (`grouperVinsV2`), compte de bouteilles à droite, voile si 0 → fiche (provenance 'recherche').
- ⚠️ `ouvrirRechercheV2` remet 6 filtres à zéro mais PAS `sommelier` (absent de l'objet de réinitialisation) : il reste actif d'une ouverture à l'autre, panneau fermé, sans que rien ne l'indique.

**Facture SAQ** — entre les achats d'une facture papier sans scanner chaque bouteille. Ouverte par le burger (`ouvrirRecuV2`).
- Écran 1 : roundel « Prendre une photo » (`input type=file capture=environment`). L'image part en base64 vers `extraireRecuSAQ`, spinner « Lecture de la facture », **timeout 60 s**.
- **Backend** : l'image devient un Google Doc temporaire avec OCR français (`Drive.Files.create`, `ocr:true`), le texte est lu, le fichier est mis à la corbeille aussitôt. Les lignes retenues sont celles entre « article » et « total » ; toute ligne de **5 chiffres ou plus** est prise pour un code SAQ, et la ligne au-dessus pour son nom.
- Écran 2 (`recuValidationV2Container`) : validation **un vin à la fois**, compte « X / N ». Le nom se remplit seul — depuis `ALL_DATA` si le vin est connu, sinon par `testScrapingSAQ`, sinon « Vin introuvable, vérifiez le code ». Le code SAQ reste modifiable (l'OCR se trompe).
- **OK** → `testScrapingSAQ` pour obtenir le CUP, puis `ajouterVinAvecBouteilles` avec **une bouteille sans emplacement** (elle atterrit dans « À ranger »), resync `ALL_DATA`, vin suivant. **Passer** → vin suivant sans rien écrire. Fin de liste → « Facture traitée ».
- Les erreurs s'affichent dans `#recuValidationV2-statut`, pas en toast : la page reste ouverte, on corrige le code et on repique.

**SELON CHARTIER** (`ouvrirAccordsV2`, `#accordsV2Container`) — page qui répond à « j'ai tel ingrédient, quel vin ouvrir ? », par **cépage**. À ne pas confondre avec les **catégories d'accords** d'un vin (champ Accords de la fiche), ni avec **Selon SAQ**.
- **Source** : onglet Sheet « Accords » (Cépage · Aliment · Nuance · Source), lu une fois par `getAccords` → `ALL_ACCORDS`, puis mémoire. Alimenté par `ajouterAccord`, qui refuse un couple déjà présent (`normaliserAccord`).
- **Panneau** : bascule « Que les disponibles » · filtre Cépage · **8 catégories d'ingrédients** (Fruits, Légumes, Épices/aromates/condiments, Fromages, Viandes et charcuteries, Poissons et fruits de mer, Céréales/noix/graines, Autres) · filtre Couleurs · Réinitialiser. Les listes d'ingrédients sont des tableaux **en dur dans le JS** (`CATEGORIES_ACCORDS_V2`), mais seuls les aliments réellement présents dans l'onglet Accords sont proposés (`alimentsDisponiblesAccordsV2`). Une seule catégorie ouverte à la fois.
- **Sélection multiple d'ingrédients** (`accordsV2Selection`, clés normalisées) affichée en clair au-dessus des résultats ; chaque tap recalcule. Résultats : cépages classés par nombre d'ingrédients satisfaits (`X/N`), avec les vins de la cave sous chacun → fiche (provenance 'accords', qui ferme la page).
- **Filtre Cépage seul** : bascule en sens inverse — la page liste les aliments associés à ce cépage, avec les vins correspondants.
- `ouvrirAccordsV2` remet les trois filtres (`couleur`, `cepage`, `dispo`), comme `reinitialiserAccordsV2` — il n'en remettait qu'un jusqu'au 3 septembre 2026.
- ⚠️ `construirePanneauAccordsV2` fabrique son panneau à la main, **hors de `PANNEAUX_V2`** — exception à la règle des panneaux générés (les catégories dépliantes ne rentrent pas dans le gabarit).

**SELON SAQ** (`ouvrirSelonSaqV2`, `#selonSaqV2Container`, 4 septembre 2026) — le **sens inverse** des accords SAQ : ingrédient → recettes qui le contiennent → familles de ces recettes → **mes vins qui portent ces familles**. Voir la section « Accords SAQ » pour la mécanique et les données.
- **Panneau** bâti à la main (`construirePanneauSelonSaqV2`, hors `PANNEAUX_V2`, comme Chartier) : **Ingrédients** · **Types de plats** · Réinitialiser. Une seule liste ouverte à la fois ; chaque valeur est suivie de son nombre de recettes.
- **Seules les recettes des familles présentes en cave** sont offertes (`recettesUtilesSelonSaqV2`) : jamais un ingrédient qui ne mènerait à rien.
- **Sélection multiple** : OU à l'intérieur d'une liste, ET entre les deux listes. Compte en tête : nombre de vins et nombre de recettes retenues. Loupe en or dès qu'une case est cochée.
- Cartes de vins groupées (`grouperVinsV2`, voile si 0 bouteille) → fiche (provenance 'selonsaq', qui ferme la page ; le retour recalcule la page).

**Photo** — `#photoV2Overlay`, deux modes : « fiche » (grande photo + ✕, la fiche reste dessous) et « rond » (Emplacements : photo dans un grand rond, bordure couleur, ✕ à 2 h à l'extérieur, nom du vin au centre si pas de photo). `ouvrirPhotoV2` remet tout à zéro, `onerror` compris.
- **En-tête du mode rond** (4 septembre 2026, `#photoV2-entete`) : au-dessus du cercle, **toujours visible** — nom, origine (pays · région · appellation), cépage. Posé en `position:absolute` en haut de l'overlay : le cercle et le ✕ ne bougent pas d'un pixel. Le nom au centre du cercle reste le secours quand la photo manque ou casse. Caché en mode fiche.

**Panneaux de filtres** — les 5 panneaux (Cave, Historique, Emplacements, Achat, Promo) sont des coquilles vides remplies au chargement par `construirePanneauxV2()` depuis la table `PANNEAUX_V2`. Selon Chartier et Selon SAQ font exception : panneaux bâtis à la main.

## 🍽️ ACCORDS SAQ — familles et recettes (4 septembre 2026)
Mécanique **complètement distincte de Chartier**, tirée de l'API SAQ. Le lien entre un vin et des recettes n'est pas le cépage mais un **code de famille d'accords**.

**Ce que l'API donne**
- Sur un **VIN** (`catalog_type: 1`) : `famille_accords` = **une seule valeur** (ex. `"023"`). L'attribut `recette_vedette` est vide — un produit ne porte pas ses recettes.
- Sur une **RECETTE** (`catalog_type: 3`, 21 attributs) : `famille_accords` est **multiple** — c'est la charnière. Le `sku` est le nom d'URL. Utiles : `recipe_type_dishes` (le libellé vert du site), `recipe_main_ingredient` (**vocabulaire normalisé** : Bœuf, Lapin, Crevette…), `recipe_type_cuisine`, `recipe_cooking_method`, `recipe_occasion`, `recipe_preparation_time`, `recipe_cooking_time`, `recipe_number_portions`.
- **Un appel par famille suffit** : filtre `famille_accords` + `catalog_type: 3`, tout sort d'un coup (88 recettes pour la famille 023), aucune pagination à gérer.
- **Pas de photo de recette dans l'API**, contrairement au site.
- ⚠️ Des **fromages du Québec** portent le même `catalog_type: 3` (Raclette de Compton, Valbert…) — d'où la colonne Type de l'onglet Recettes.
- ⚠️ Le classement SAQ est parfois bancal (« Lapin aux pruneaux » en Viandes blanches, « Hachis parmentier » en Volaille) : **les ingrédients principaux sont plus fiables que les types de plats.**

**Sheet**
- `Vino`, colonne **71 (BT) « Famille accords »** — code unique, écrit avec une apostrophe de tête pour garder le zéro (`'023`).
- Onglet **`Recettes`**, une ligne par recette : Sku · Nom · Familles · Types de plats · Ingrédients · Cuisine · Cuisson · Occasion · Préparation · Temps cuisson · Portions · Type · Date maj. Les champs multiples sont joints par `;;`.

**Backend (`Code.gs`)**
- `appelAPISAQ(query)` — appel GraphQL unique avec les en-têtes SAQ ; `attributSAQ(item, nom)` — lit un attribut de `productView`.
- `getFamilleAccordsSAQ(codeSAQ)` — la famille d'un vin. Appelée à la création d'un vin (`ajouterVinAvecBouteilles`).
- `majFamillesAccordsVins(limite)` — **rattrapage**, à lancer à la main : remplit les familles manquantes des vins qui ont un code SAQ, 200 par passage par défaut, le journal dit combien restent.
- `famillesDeMaCave()` — familles distinctes du Sheet.
- `getRecettesFamilleSAQ(famille)` — les recettes d'une famille, mises en forme.
- `majRecettesSAQ()` — **alimentation**, à lancer à la main : crée l'onglet au besoin, parcourt les familles de la cave, ajoute les recettes **dédoublonnées sur le Sku** (une recette appartient à plusieurs familles). Ne réécrit jamais une ligne existante.
- `getRecettes()` — lecture de l'onglet pour le front (`ALL_RECETTES`), exposée dans `doPost`.

**Ordre de mise en route** : ajouter la colonne BT1 → `majFamillesAccordsVins()` (autant de fois que nécessaire) → `majRecettesSAQ()` → nouveau déploiement.

**Écarté, et pourquoi** : gratter `/recettes` sur saq.com (interdit par le `robots.txt` ; les fiches produits, elles, sont permises) · réutiliser l'ancienne colonne Recettes (devenue Favori) · trois titres de recettes par vin · extraire des mots-clés des titres (`recipe_main_ingredient` est déjà normalisé) · un onglet `Familles` à comptes figés (ne couvre pas le sens inverse) · des liens cliquables vers les recettes (non voulu).

**Catégories d'accords d'un vin** (à ne pas confondre) — menu Accords de la fiche, item « + Ajouter » : champ texte, Entrée confirme. Doublon (`memeTexteV2`) → l'existant est coché, aucune écriture. Nouveau → `ajouterAccordConfig` (écrit dans la première cellule vide de la colonne Accords de config, pas `getLastRow`), poussé dans `CONFIG.accords`, menu re-rendu, coché via `cocherAccordV2`. L'autre téléphone le voit au prochain démarrage — RAFRAÎCHIR ne recharge pas CONFIG (accepté).

## 🔐 Sécurité
Mot de passe d'app à chaque appel. Backend : `params.secret` comparé à la Script Property `APP_SECRET` dans `doPost` ; absent ou faux → `ACCES_REFUSE`, aucune donnée. Si `APP_SECRET` n'est pas posée, tout passe (garde-fou de mise en route). Front : `localStorage.vinoSecret`, ajouté automatiquement par `appelBackend` — ne jamais l'ajouter à la main. `ACCES_REFUSE` → efface la clé, toast, rouvre `#secretV2Container`. Changer le mot de passe = changer `APP_SECRET` + nouveau déploiement.

`appsscript.json` reste en `ANYONE_ANONYMOUS` (nécessaire au fetch anonyme). `API_URL` est dans le dépôt public : le mot de passe la rend inoffensive.

## 🔑 Backend — actions exposées par `doPost`
**Lecture** : `getConfig` · `getInventoryData` · `getWineBottles` · `checkWineExists` · `checkLocationAvailable` · `getHistorique` · `getSuggestions` · `getAccords` · **`getRecettes`** · `getSuccursales` · `getToutesSuccursales` · `getSuccursalesDisponibles` · `getCodeBarresFromCodeSAQ`

**Écriture** : `addBottle` · `actionBouteille` · `ajouterVinAvecBouteilles` · `saveWineEdits` · `updateWineField` (Accords, Racheter, Panier, Notes temporaires — pas un écrivain générique) · `supprimerBouteille` · `mettreBotteilleARanger` · `corrigerHistorique` · `ajouterHistoriqueManuel` · `ajouterSuggestion` · `corrigerSuggestion` · `ajouterAccord` · `ajouterAccordConfig` · `ajouterSommelierConfig` · `ajouterSuccursale` · `supprimerSuccursale` · `majPhotoSAQ`

**SAQ** : `testScrapingSAQ` (cache 5 min autour de `lireFicheSAQ`) · `chercherProduitSAQ_GRAPHQL_V1` · `verifierDispoSAQ_GRAPHQL_V1` · `getPromotionsSAQ` · `getToutesPromotionsSAQ` · `verifierEtMettreAJourPrixSAQ` · `extraireRecuSAQ`

**Hors `doPost`, lancées à la main dans l'éditeur** : `majFamillesAccordsVins` · `majRecettesSAQ` · `majBoisTousVins` · `creerOngletAccords` · `createVinoSheet` · `importerToutesSuccursalesSAQ` · `sauvegarderSheet`.

**Notes** : `checkWineExists` renvoie des bouteilles SANS `row` (d'où le repli sur `wineResult.row`). `addBottle` est appelée par l'Arrivée et `createVinoSheet` par `ajouterVinAvecBouteilles` — **ni l'une ni l'autre n'est morte**. Clés Script : `SPREADSHEET_ID`, `APP_SECRET`, `SAQ_API_KEY`, `SAQ_ENV_ID`.

**Détection Spiritueux** (`lireFicheSAQ`) : la méta-description de la page SAQ commence par le type exact (« Vodka. Format… »). Type ne commençant pas par « Vin » → Couleur = Spiritueux, cépages vidés, type complet → Appellation. Le fil d'Ariane n'est PAS fiable, ne pas y revenir.

## 📇 Champs d'un vin
Code-barres (CUP) · Code SAQ · Nom · Prix · Couleur · Cépages · Pays · Région · Appellation · Désignation · Classification · Format · Alcool · Sucre · Particularité · Producteur · Agent promo · Millésime dégusté · Arômes · Acidité · Sucrosité · Corps · Bouche · Température · Description · Aimé (`Racheter` côté front) · Accords · Recettes (= `FAVORI`, la coche Favori) · Notes temporaires (= Notes du sommelier) · Divers · Pastille goût (32) · Photo URL (33) · Panier (= Sur-inventaire, 34) · **Bois (70)** · **Famille accords (71, colonne BT)**. Bouteilles : index 35-69 (5 × 7).

## 🕳️ Trous connus
- **`Code.gs` n'est pas dans le dépôt** : aucun historique, aucun retour arrière, sauf les versions internes d'Apps Script. Dépôt privé séparé envisagé, non tranché (dépôt public refusé le 3 septembre 2026).
- **Filtres qui survivent à une réouverture** : défaut trouvé deux fois le 3 septembre 2026 — `ouvrirRechercheV2` oubliait `sommelier`, `ouvrirAccordsV2` oubliait `cepage` et `dispo`. Les deux sont corrigés. ⚠️ RÈGLE : la remise à zéro d'une page doit lister EXACTEMENT les mêmes clés que sa fonction Réinitialiser — c'est là que l'écart se cache, et il est invisible puisque le panneau est fermé.
- **Les recettes ne se rafraîchissent pas toutes seules** : `majFamillesAccordsVins` et `majRecettesSAQ` se lancent à la main. Un vin créé après coup a bien sa famille, mais ses recettes n'arrivent qu'au prochain passage. `ALL_RECETTES` n'est jamais invalidé en session.
- **Le flux « suggestion par scan » date du 1er septembre 2026** et repose sur un drapeau global `suggestionsV2Attente` posé et retiré à sept endroits. Fragile par conception.
- **Découpage des JS** (proposé, non tranché) : `scripts-scanner-v2.js` est un fourre-tout. Même exercice souhaité pour `Code.gs` (lecture / écriture / SAQ / historique / utilitaires).
- **`testScrapingSAQ` porte un nom de test** alors que c'est le lecteur de fiches utilisé partout.

## 📅 Journal
- **9 juin 2026** — Règle mémoire/écriture adoptée. `getInventoryData` renvoie tous les champs. Règles de navigation (`cacherToutesPagesV2`, retour accueil).
- **11 juin 2026** — Scroll en haut, textarea qui replie, modal photo, succursales vers Plans, champ Photo + Photo SAQ, quinconce 7, code SAQ manuel au vin inconnu. Le soir : toast réparé (la cause des faux gels), `gtinValide` accepte 14 chiffres, capteur d'erreurs globales, cépages insensibles à la casse, refonte Liste d'achat, cépages manquants global.
- **11 juillet 2026** — Ménage V1 (8 fichiers supprimés), mot de passe d'app, Notes du sommelier, Spiritueux + 5e couleur, accords dynamiques, grande photo ronde, bloc « À ranger » aux Emplacements, zéros de tête (`memeCodeBarre`), loupe de l'accueil, panneaux générés.
- **13 août 2026** — Entrée manuelle par Code SAQ. Menu « Sans cépage ».
- **1er septembre 2026** — Flux « ajouter une suggestion en scannant » (`terminerAjoutSuggestionV2`, `fermerScannerV2`, branches `suggestionsV2Attente`).
- **2 septembre 2026** — Six commits sur la même ligne : un `alert` de débogage allumé et éteint trois fois dans la lecture de facture. Résultat net : un message propre au lieu d'une alerte brute.
- **3 septembre 2026** — Bouton SAQ de l'accueil (`ouvrirSAQV2`). **Panne du scan** : tout vin neuf tombait sur un menu « Vin inconnu » sans rien écrire ; cause = déploiement figé sur une vieille version, aucun code en faute. Corrections : resync mémoire après création, refus d'ouvrir un menu vide, vrais messages d'erreur transmis, `suggestionsV2Attente` éteint au scan depuis l'accueil, comparaison du Code SAQ par `memeCodeBarre`, cache de 5 min sur la lecture SAQ, `User-Agent` ajouté, code mort de l'onglet « Vins scannés » retiré. Puis vérification des sections de doc jamais écrites à partir du code : trois erreurs trouvées, deux défauts de filtres découverts au passage. Fouille de l'API SAQ : découverte de `famille_accords` et du `catalog_type: 3`, spécification des accords SAQ figée.
- **4 septembre 2026** — Séance en sept chantiers, tous codés d'un trait : ① ligne **SELON CHARTIER** remise au burger (le moteur était intact, seule la ligne manquait) ; ② **détection iPad** pour le bouton SAQ (`MacIntel` + `maxTouchPoints`) ; ③ **Historique — le champ Mets devient un vrai filtre texte**, cumulable, la liste des plats entiers disparaît ; ④ **Liste du meuble** par cépage dominant aux Emplacements ; ⑤ **en-tête au-dessus de la grande photo ronde** (nom, origine, cépage) ; ⑥ **glissement gauche/droite** sur la photo ronde, parcours du meuble en ordre physique, butée aux deux bouts ; ⑦ **Accords SAQ** de bout en bout — colonne `Famille accords`, onglet `Recettes`, six fonctions backend, section dans la fiche, page **SELON SAQ** pour le sens inverse. Ménage : `testFamilleAccordsSAQ` retirée. Documentation : la section Selon Chartier, jamais écrite jusque-là, et toute la séance.
