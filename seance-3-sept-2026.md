# Séance du 3 septembre 2026 — notes

## 📌 File des changements à appliquer (aucun n'est fait)

Tous décidés, aucun bloc trouve/remplace encore envoyé ni appliqué.

1. **SELON CHARTIER dans le menu burger** — `index-v2.html`
   Le moteur complet existe (`CATEGORIES_ACCORDS_V2`, `ouvrirAccordsV2`, `getAccords`, onglet Accords) et `burgerV2Click('accords')` est déjà branché. Seule la ligne du menu a disparu du HTML. Libellé exact : **SELON CHARTIER**.

2. **Détection iPad pour le logo SAQ** — `scripts-socle-v2.js`
   `ouvrirSAQV2` teste `/iPad|iPhone|iPod/` dans le `navigator.userAgent`. Safari sur iPad se déclare « Macintosh » depuis iPadOS 13 → l'iPad tombe dans la branche ordinateur et ouvre saq.com au lieu de l'app. Correctif : ajouter `navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1`.

3. **Historique — champ mets qui filtre les résultats** — `scripts-scanner-v2.js`
   Le champ « Rechercher un mets » ne fait que cacher des items de la liste (`filtrerMenuMetsV2`), et il faut ensuite choisir un plat entier. La liste est trop longue. Il devient un vrai filtre : ce qu'on tape cherche dans le texte des mets et filtre les cartes directement, cumulable avec Vin et Accord, loupe allumée quand il est rempli.

4. **Liste du meuble par cépage** — `scripts-scanner-v2.js`
   Nouveau roundel « Liste du meuble » dans le panneau Emplacements, visible seulement quand un meuble est choisi (comme « Cépages doubles »). Nouveau type dans `afficherListeEmpV2`. **Sections par cépage dominant** (ordre alphabétique, casse ignorée), vins alphabétiques dessous, chaque carte avec `X btl` + emplacements. Clic → fiche, retour à la liste.

5. **Infos sous la photo ronde** — `scripts-fiche-v2.js` + `styles-v2.css`
   Sous le cercle, toujours visible : **nom**, **origine** (pays · région · appellation), **cépage**. Le nom au centre du cercle reste le secours quand la photo manque. Tap sur la photo = fiche (inchangé).

6. **Glissement gauche/droite sur la photo ronde** — `scripts-scanner-v2.js` + `scripts-fiche-v2.js`
   Parcours = toutes les bouteilles du **meuble** du rond touché, en ordre physique (rangée puis espace) ; depuis le bloc « À ranger », ce sont les à-ranger. Gauche = suivante, droite = précédente. **Bute aux deux bouts, pas de boucle.** La photo ronde n'a qu'un `PHOTO_V2_CB` : il lui faut une liste + un index, construite au tap. Seuil pour distinguer tap et glissement (le tap ouvre la fiche). La rangée ouverte derrière ne bouge pas.

7. **Recettes SAQ** — `Code.gs` + `scripts-fiche-v2.js`
   ⚠️ Spec figée avant la découverte de l'API — **à revoir** (voir plus bas).

8. **Ménage** : retirer `testFamilleAccordsSAQ` de `Code.gs` quand la fouille sera finie.

---

## 🔍 Découverte majeure — l'API SAQ contient les recettes

L'API Adobe Commerce déjà utilisée (`catalog-service.adobe.io/graphql`, clé dans les propriétés du script) sert **aussi les recettes**, pas seulement les produits.

### Sur un VIN (`catalog_type: 1`)
- **`famille_accords`** = code de famille, **valeur unique** (ex. `"027"` pour l'Apothic Red)
- `recette_vedette` : **vide** — les recettes ne sont pas portées par le produit
- 91 attributs en tout ; le filtre `{ attribute: 'famille_accords', eq: '027' }` renvoie **42 vins**

### Sur une RECETTE (`catalog_type: 3`)
Le `sku` est le nom de l'URL (ex. `lapin-pruneaux`, `crevettes-ail-risotto-pesto`).

| Attribut | Contenu |
|---|---|
| `recipe_main_ingredient` | **Ingrédients principaux déjà normalisés** par la SAQ — ex. `["Crevette","Riz","Fromage à pâte ferme","Légumes"]`, `["Lapin","Fruits"]` |
| `recipe_ingredients_text` | Liste complète des ingrédients, en HTML |
| `recipe_preparation_text` | Préparation, en HTML |
| `recipe_cooking_method` | Mijoté, Poêlé… |
| `recipe_cooking_time` | ex. `75 min` |
| `recipe_number_portions` | ex. `4` |
| `famille_accords` | **PLUSIEURS valeurs** — ex. lapin aux pruneaux = `["027","032","036","037","039"]` |

Recherche « crevette » → **115 recettes**.

### Le chemin qui s'ouvre
**Ingrédient → recettes qui le contiennent → familles de ces recettes → mes vins qui portent ces familles.**

`recipe_main_ingredient` est un vocabulaire normalisé, donc pas besoin de décortiquer des titres de recettes.

### ⏳ À trancher (demain)
Le point de départ dans l'app :
- **l'ingrédient** — je tape « crevette », l'app me sort mes vins ; ou
- **le vin** — j'ouvre une fiche et je vois quels ingrédients lui vont

---

## 🚧 Ce qui est abandonné, et pourquoi

- **Gratter les pages de recettes de saq.com** : le `robots.txt` de la SAQ interdit `/recettes` (les fiches produits, elles, sont permises — le scraping actuel est dans les clous). L'API rend la question sans objet.
- **Réutiliser la colonne Recettes du Sheet** : elle est devenue `REF_COLS.FAVORI` (index 29), la coche « Favori » de la page Modifier. Toute nouvelle donnée = nouvelle colonne en fin, comme `Bois` (colonne 70).
- **Lire les listes d'ingrédients complètes pour en tirer des mots-clés** : inutile, `recipe_main_ingredient` fait déjà le travail.
- **Liens cliquables vers les recettes** : non voulu, on veut juste voir les titres.

---

## 📎 Spec « Recettes SAQ » telle que figée avant la découverte

Conservée pour mémoire — l'API change probablement la donne.

- Nouvelle colonne `Recettes SAQ` en fin de Sheet Vino : les 3 titres du bloc « Accords suggérés » de la fiche produit, séparés par `;;`, sans URL
- `lireFicheSAQ` : extraction des titres ; bloc absent → colonne vide
- Remplie à la création du vin ; roundel « Recettes SAQ » dans Modifier (jumeau de « Photo SAQ »), backend `majRecettesSAQ` qui n'écrit que cette colonne
- Rattrapage : fonction lancée depuis l'éditeur Apps Script, saute les vins déjà remplis et ceux **sans code SAQ**, s'arrête avant la limite de 6 minutes, à relancer jusqu'à épuisement
- Fiche : titres en texte seul, section **après « Suggérer »**, masquée si vide

---

## 🗒️ Autre point relevé

La page **Selon Chartier** n'a **aucune section dans `mise-a-jour.md`**, alors que tout son code est au dépôt. Section à rédiger (reporté).
