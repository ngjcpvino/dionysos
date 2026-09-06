# 🔧 À coder — souhaits et corrections

> Liste montée le 5 septembre 2026, codée le 6 septembre.
> Règles de travail : `REFERENCE.md`. État technique : `mise-a-jour.md`.

## ✅ État (6 septembre — mis à jour en fin de séance)
**Items 1 à 10 codés**, plus raffinés/testés en direct :
- **6 (Vin inconnu)** : rectangles centrés, champ « Nom » caché quand la SAQ trouve le vin, boutons décollés ; le 💡 ouvre le choix du sommelier puis la fiche.
- **7 (Facture SAQ)** : testé pour de vrai (vin neuf OK). 2 bugs trouvés et réglés — (a) 1er vin sauté → détection du code robuste + caissette ignorée ; (b) quantité → champ Quantité pré-rempli depuis la facture + ajout de N bouteilles (et un vin **déjà en cave** reçoit enfin N bouteilles, plus une seule).
- **8 / 9a / 2** : ok. Le style d'accordéon est maintenant **partagé** (`.accordeon-1/2`, jeton `--espace-accordeon`).

**Bug SAQ corrigé (6 sept.)** — famille unique écrite « 9 » au lieu de « 009 » par Sheets → plus d'accords SAQ. Réglé : normalisation `normFamilleV2` (marche avec les données déjà là) + écriture en texte + `reconstruireRecettes()`. Détails : `mise-a-jour.md`.

**NOUVEAU — « Selon Curieux Bégin »** : accords vin de l'émission reliés à la cave par **code SAQ**. Les 3 morceaux codés (moteur `Code.gs` → onglet CurieuxBegin, 106 accords ; volet fiche ; page autonome). Détails : `mise-a-jour.md` (section 📺). Recherche d'origine : `recherche-cuisinez.md`.

- **9b** (page Chartier autonome, sens plat → vin) : toujours conçu, PAS codé.
- **`Code.gs`** : modifié cette séance (facture + famille + Curieux Bégin) — bien **redéployer**.

---

## 1. % des cépages — n'efface plus les autres (assemblages)
`scripts-fiche-v2.js` · `Code.gs`

- Le % des cépages (item 10 de la séance précédente) marche quand il y a **un seul cépage**. Pour un **assemblage**, dès que le % du **dominant** arrive, il **efface les autres cépages au complet** — il ne reste que le dominant.
- **Attendu : chaque cépage affiche son propre %** (ex. « Merlot 60 %, Cabernet Sauvignon 40 % ») — tous les cépages gardés, chacun avec son pourcentage.
- À vérifier demain : ce que `cepagesBruts` (SAQ) renvoie pour un assemblage (donne-t-il le % de chaque cépage ?), et pourquoi actuellement seul le dominant reste.

---

## 2. Menu burger — espacement et indentation des sous-menus
`styles-v2.css` (+ classe dans `index-v2.html` au besoin)

- Les items du menu sont **trop collés** les uns sur les autres — leur donner un peu d'air (espacement vertical entre les `.item-liste`).
- Les **sous-menus** doivent être **légèrement indentés** pour montrer qu'ils sont des sous-éléments :
  - sous **Accord selon…** : Sommeliers · SAQ · Chartier
  - sous **Outils** : À ranger · Sans cépage · Facture SAQ · Promotions SAQ
- Respecter la règle CSS : valeur dans `:root`, réutiliser l'existant, rien en dur dans le JS.

---

## 3. Photo ronde (glissement) — afficher l'emplacement
`scripts-fiche-v2.js` (+ `index-v2.html` / `styles-v2.css` au besoin)

- En glissant d'un vin à l'autre dans un meuble (vue photo ronde plein écran), on **perd le fil** de l'endroit où on est rendu.
- Ajouter l'**emplacement** de la bouteille courante (ex. `C-1-1` = meuble · rangée · espace), **mis à jour à chaque glissement** (via `glisserPhotoV2` / `PHOTO_V2_LISTE[PHOTO_V2_INDEX]`).
- **Placement décidé : en bas de l'écran, centré et discret** (style de la ligne d'origine). Pas en haut — le titre + origine y sont déjà, et c'est la zone qui a posé problème.

---

## 4. Code SAQ tapé (vin absent) — erreur au 1er essai, marche au 2e
`scripts-scanner-v2.js` · `Code.gs`

- En tapant un **code SAQ** pour un vin **pas dans la cave**, on reçoit **souvent un message d'erreur au premier essai** ; en recliquant, ça fonctionne.
- Indice « marche au 2e coup » → le 1er appel échoue (timeout ? démarrage à froid d'Apps Script ? latence SAQ ?), le 2e passe (fiche en cache 5 min / backend réchauffé).
- À faire demain : trouver le point d'échec du 1er appel (`validerSaisieManuelleV2` → `testScrapingSAQ` → `lireFicheSAQ`) et le fiabiliser — ré-essai automatique et/ou timeout plus long sur cette entrée ; ne montrer l'erreur que si le 2e essai échoue aussi.

---

## 5. Retour à l'accueil — page mal placée, boutons du haut tronqués
`scripts-scanner-v2.js` · `styles-v2.css` · `index-v2.html`

- En revenant à l'écran d'accueil, il arrive que la page soit **mal positionnée** : la barre du haut (scan · logo · recherche · menu) est **tronquée** (coupée en haut).
- Intermittent. À creuser au retour à l'accueil (`retourAccueilV2` / `cacherToutesPagesV2` / `burgerV2Click('accueil')`) : remise à zéro du scroll (`remonterScrollV2`) et marge du haut (safe-area iOS ; `height:100%`, jamais `100vh`).

---

## 6. Page « Vin inconnu » — même look que le menu d'action
`index-v2.html` · `styles-v2.css` · `scripts-scanner-v2.js`

- La page d'un vin absent doit ressembler **sensiblement au menu d'action** (mêmes gabarits) :
  - **En-tête identique** : NOM du vin en capitales, puis origine **Pays · Région · Appellation · Cépage**, à partir de l'info trouvée à la SAQ — comme `rendreEnteteActionV2`.
  - **Les 2 ronds + et 💡 : même grosseur que les ronds du menu d'action** (réutiliser exactement les mêmes classes/structure `.ligne-ronds` + `.cercle` ; ils sont plus petits actuellement).
- Garder les champs code-barres / code SAQ / nom pour la saisie manuelle (vin non trouvé sur SAQ), mais dans une mise en page soignée et cohérente.

---

## 7. Facture SAQ — vérifier l'ajout d'un vin NOUVEAU (pas déjà en cave)
`scripts-scanner-v2.js` · `Code.gs`

- Jusqu'ici, la lecture de facture n'a été essayée qu'avec des vins **déjà dans la cave** (fiche existante). Le cas d'un vin **nouveau** n'a jamais été testé.
- À vérifier demain : qu'un vin nouveau (pas de fiche) s'ajoute correctement depuis la facture — création de la fiche avec les données SAQ (nom, photo, famille…), bouteille(s), et **Racheter = Oui** (c'est un achat).
- Suivre le flux facture/reçu (`extraireRecuSAQ` → validation → `ajouterVinAvecBouteilles`) et corriger si le cas « nouveau » cloche.

---

## 8. Fiche — bouton « + » (ajout sommelier) au bas de la liste
`scripts-fiche-v2.js`

- Dans « Accords selon… → Les sommeliers », le **+** (ajouter une suggestion) s'affiche **en premier**, au-dessus des sommeliers déjà inscrits — ça fait bizarre.
- Le mettre **en bas**, sous le dernier sommelier.
- Concrètement : déplacer le bloc du **+** pour qu'il soit rendu **après** `#ficheV2-suggestions`, pas avant.

---

## 9. Selon Chartier — rendre la page conviviale (gros morceau)
`scripts-scanner-v2.js` · `styles-v2.css`

- Chartier est une **mine d'information** pour trouver un accord, mais la page **n'est pas conviviale** à utiliser.
- **On repart de zéro côté présentation** : oublier l'interface actuelle, concevoir à partir des **données disponibles**.
- Données Chartier (onglet Sheet Chartier) : chaque ligne = **Cépage · Aliment · Nuance · Source**. La cave relie par le **cépage** (chaque vin a ses cépages).
- Donc deux sens possibles : **plat/aliment → cépages → tes vins**, ou **vin/cépage → aliments qui vont avec** (avec la nuance et la source).
- **Les deux sens sont voulus**, mais on **commence par la fiche vin** (sens vin → aliments).

### 9a. Fiche vin — bloc « Accords selon… → Chartier » (remplace « En développement »)
`scripts-fiche-v2.js`

- Afficher les **aliments qui vont avec le(s) cépage(s) du vin**, en **rubriques repliables** façon SAQ (Fruits · Légumes · Épices · Fromages · Viandes · Poissons · Céréales · Autres), avec la **nuance** sur chaque aliment. Rien si aucune donnée.
- **Un seul cépage** → ses aliments.
- **Assemblage (plusieurs cépages)** → les aliments **communs à tous** les cépages (intersection calculée par l'app) — ça raccourcit la liste et donne l'accord le plus solide.
- **Aucun aliment commun** → basculer sur le **cépage dominant** (le plus haut %, cf. item 1).
- **Toujours visible** sur quoi la liste est basée : nom du cépage, « communs à… », ou « cépage dominant : X ».

### 9b. Page « Selon Chartier » (autonome) + sens plat → vin
- À revoir plus tard, une fois 9a en place.
- **Côté usage, c'est une expérience à part entière** (on part de ce qu'on mange) — à concevoir pour elle-même, PAS un simple miroir de 9a. Seule la tuyauterie (liens cépage ↔ aliments) se réutilise.
- Problème actuel : on choisit un ingrédient → ça sort **tous les cépages** ; on en ajoute un → la **liste s'allonge** et un score indique combien d'ingrédients collent au cépage. **Pas convivial.**
- Piste à creuser : partir des **ingrédients qu'on a** et sortir directement **tes vins** classés par correspondance (les plus proches en premier), au lieu d'une longue liste de cépages qui grossit.

**Design retenu (6 sept) — le mécanisme d'inspiration :**
- Cliquer un aliment (ex. **porc**) → cépages suggérés.
- Ajouter un aliment → la liste de cépages **rétrécit** (ceux qui vont avec **tous** les aliments choisis).
- **Inspiration** : pour ces cépages, proposer **d'autres aliments** qui vont aussi avec (ex. **pomme**) → donne des idées pour bâtir le plat (une sauce à la pomme, etc.).
- Afficher **les cépages ET tes vins** (sélectionnables).
- Pour chaque cépage, montrer **quels aliments choisis vont avec lui** — pas juste un compte « 3/5 ». Là, on voit le score mais pas quel aliment va avec quel cépage.
- Reprendre le **filtre « en cave »** (comme ailleurs, ex. Suggestions / dispo) : pouvoir n'afficher que les cépages/vins réellement **en cave**.

---

## 10. Filtre « en cave » un peu partout
`scripts-scanner-v2.js`

- Le filtre **« en cave »** (n'afficher que ce que j'ai réellement) devrait se retrouver sur **plusieurs pages**, pas juste une.
- Même mécanisme réutilisé partout. À préciser : sur quelles pages exactement (Chartier, Selon SAQ, Recherche…).
