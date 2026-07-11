# SPIRITUEUX + COULEURS — Spécification complète (validée par Chantal, 10 juillet 2026)

## But
1. Les produits SAQ **hors vin** (spiritueux, bière, cidre…) scannés sont acceptés dans la cave, classés sous une **5e couleur « Spiritueux »**, avec leur **type** (Vodka, Gin, Whisky…) visible dans l'en-tête de la fiche.
2. Changement de teinte : **Bulles = `#E8D08A`** (doré champagne, remplace le turquoise) et **Spiritueux = `#446ffc`** (bleu vif).

Arbre des cas **entièrement validé par Chantal** — ne rien re-demander, coder tel quel.

---

## Contexte technique (vérifié dans les vrais fichiers)

- **Couleurs de vin** : variables `:root` dans `styles-v2.css` — `--vin-rouge: #8B0000`, `--vin-blanc: #f7f6da`, `--vin-rose: #FFC0CB`, `--vin-bulles: #00ced1` + dégradés `--degrade-vin-*` (spinner). Classes `.vin-rouge/.vin-blanc/.vin-rose/.vin-bulles` (bordures cartes/fiche). **Une valeur = un seul endroit** (règle du projet) : changer la variable change tout.
- **Classement couleur (front)** : plusieurs endroits mappent `wine.Couleur` → classe : `couleurClasseV2(...)` (`scripts-scanner-v2.js`), `afficherFicheV2` (`scripts-fiche-v2.js`), etc. Le repli par défaut est `'vin-rouge'`. **Chercher TOUTES les occurrences du motif** `couleur.includes('rouge') ? ... : 'vin-rouge'` dans les fichiers V2 pour les étendre (le codeur fait la recherche réelle, pas de mémoire).
- **Spinner** : `@keyframes couleur-vin` alterne les 4 dégradés (`styles-v2.css`).
- **En-tête fiche V2** : `afficherFicheV2` construit `origine = [Pays, Region, Appellation].join(' • ')` → **le type dans Appellation apparaît dans l'en-tête SANS CODE** (décision de Chantal — c'est la simplification retenue).
- **Création SAQ** : `creerVinSAQV2` (front) → backend scrape la page SAQ (fonctions `testScrapingSAQ` / `chercherProduitSAQ_GRAPHQL_V1` / `extractFromMeta` dans `Code.gs`). C'est LÀ qu'on détecte la catégorie.
- **Filtres CASCADE Cave** : la couleur vient des valeurs présentes dans `ALL_DATA` → « Spiritueux » apparaîtra tout seul dans le filtre dès qu'un produit l'a.
- ⚠️ Les mêmes variables existent dans `styles.css` (V1). Si le **ménage V1** (`MENAGE-V1.md`) est déjà fait, il n'y a qu'un CSS. Sinon, ne toucher QUE le V2.

---

## Spécification — COULEURS (branche 4 validée)

1. `styles-v2.css` `:root` :
   - `--vin-bulles: #E8D08A` (remplace `#00ced1`).
   - Nouvelle `--vin-spiritueux: #446ffc`.
   - `--degrade-vin-bulles` : refaire le dégradé avec une version foncée cohérente de `#E8D08A` (ex. vers `#b89f5e` en bas — au jugé, même logique que les autres dégradés).
   - Nouveau `--degrade-vin-spiritueux` (ex. `linear-gradient(to top, #1f3db0, #446ffc)` — même logique).
2. Nouvelle classe `.vin-spiritueux` partout où les 4 classes `.vin-*` existent ensemble (bordure carte, bordure fiche, bande `.carte`, ronds emplacements — recherche réelle des blocs).
3. **Spinner** : ajouter le dégradé spiritueux au `@keyframes couleur-vin` (5 étapes au lieu de 4 — recalculer les pourcentages).
4. **Mapping couleur → classe** : dans CHAQUE fonction de mapping V2, ajouter `couleur.includes('spiritueux') → 'vin-spiritueux'` AVANT le repli `'vin-rouge'`. Ne pas oublier les `classList.remove(...)` qui listent les classes (fiche) : y ajouter `vin-spiritueux`.

## Spécification — DÉTECTION ET CRÉATION (branche 3 validée)

1. **Backend** (`Code.gs`, dans le scraping SAQ) : détecter la **catégorie** du produit depuis la page SAQ (la SAQ expose la catégorie/le fil d'Ariane — ex. « Spiritueux / Vodka », « Bière », « Cidre »). Le codeur repère le champ le plus fiable dans le HTML/GraphQL déjà scrapé.
2. **Si la catégorie n'est PAS un vin** :
   - `Couleur` = **« Spiritueux »** (valeur unique pour tout le hors-vin — bière et cidre compris, cas 3.3 validé).
   - `Appellation` = **le type précis** (« Vodka », « Gin », « Whisky », « Bière », « Cidre »…) → il s'affichera automatiquement dans l'en-tête de la fiche après Pays • Région (décision validée : Appellation SEULEMENT, PAS Cépages — Cépages reste vide).
   - Les champs vin non pertinents (cépage, sucrosité…) restent **vides** si la SAQ ne les donne pas (cas 1.3) — aucun blocage.
3. **Type introuvable** (cas 3.2) : `Couleur` = « Spiritueux » quand même, `Appellation` vide — corrigeable au crayon (l'édition couvre déjà ces champs).
4. **Pour un VIN : RIEN ne change** (en-tête, couleurs, création — identiques).

## Cas déjà existant (branche 5 validée)
Le Kamouraska (vodka) déjà créé : **correction à la main au crayon** (Couleur = Spiritueux, Appellation = Vodka). Aucune moulinette à coder. Le dire à Chantal à la fin.

---

## Ce qui suit tout seul (vérifier, pas coder)
- Filtre couleur de la Cave : « Spiritueux » apparaît dès qu'un produit l'a (valeurs tirées de `ALL_DATA`).
- Boire / Donner / Déplacer / Historique / Liste d'achat : une bouteille est une bouteille — rien à changer.
- Tri « couleur » des listes (À ranger, etc.) : les tris `{ rouge:1, blanc:2, rose:3, bulles:4 }` renvoient 99 pour l'inconnu → Spiritueux ira à la fin. Acceptable tel quel; si un tri V2 utilise ce motif, ajouter `spiritueux: 5` par propreté.

## Règles de méthode
Le codeur suit `REFERENCE.md` du dépôt (UNE paire Trouve/Remplace par message, OK entre chaque, silence sur le raisonnement). Réutiliser l'existant, une valeur = un seul endroit, ne toucher que le V2, mettre à jour le `.md` d'état à la fin.

## Ordre de construction suggéré
1. CSS : variables + dégradés + classes `.vin-spiritueux` + spinner.
2. JS : mappings couleur → classe (toutes les occurrences V2).
3. Backend : détection catégorie + écriture Couleur/Appellation à la création.
4. Publication : CSS/JS → republier le site ; `Code.gs` → nouveau déploiement Apps Script. Prévenir Chantal de ne pas tester entre les deux.
5. Tests : scanner un spiritueux (fiche bleue, type dans l'en-tête), une bière, vérifier les Bulles dorées partout (cartes, fiche, ronds, spinner), le filtre couleur Cave, et corriger le Kamouraska au crayon.
