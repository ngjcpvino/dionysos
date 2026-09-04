# Notes — 3 et 4 septembre 2026

## 📌 File des changements à appliquer (aucun n'est fait)

Tous décidés, aucun bloc trouve/remplace envoyé ni appliqué.

1. **SELON CHARTIER dans le menu burger** — `index-v2.html`
   Le moteur complet existe (`CATEGORIES_ACCORDS_V2`, `ouvrirAccordsV2`, `getAccords`, onglet Accords) et `burgerV2Click('accords')` est déjà branché. Seule la ligne du menu a disparu du HTML. Libellé exact : **SELON CHARTIER**.

2. **Détection iPad pour le logo SAQ** — `scripts-socle-v2.js`
   `ouvrirSAQV2` teste `/iPad|iPhone|iPod/` dans le `navigator.userAgent`. Safari sur iPad se déclare « Macintosh » depuis iPadOS 13 → l'iPad tombe dans la branche ordinateur et ouvre saq.com au lieu de l'app. Correctif : ajouter `navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1`.

3. **Historique — champ mets qui filtre les résultats** — `scripts-scanner-v2.js`
   Le champ « Rechercher un mets » ne fait que cacher des items de la liste (`filtrerMenuMetsV2`), et il faut ensuite choisir un plat entier. La liste est trop longue. Il devient un vrai filtre : ce qu'on tape cherche dans le texte des mets et filtre les cartes directement, cumulable avec Vin et Accord, loupe allumée quand il est rempli.

4. **Liste du meuble par cépage** — `scripts-scanner-v2.js`
   Nouveau roundel « Liste du meuble » dans le panneau Emplacements, visible seulement quand un meuble est choisi (comme « Cépages doubles »). Nouveau type dans `afficherListeEmpV2`. **Sections par cépage dominant** (ordre alphabétique, casse ignorée), vins alphabétiques dessous, chaque carte avec `X btl` + emplacements. Clic → fiche, retour à la liste.

5. **Infos AU-DESSUS de la photo ronde** — `scripts-fiche-v2.js` + `styles-v2.css`
   En-tête au-dessus du cercle, comme partout dans l'app, toujours visible : **nom**, **origine** (pays · région · appellation), **cépage**. Le nom au centre du cercle reste le secours quand la photo manque. Tap sur la photo = fiche (inchangé).

6. **Glissement gauche/droite sur la photo ronde** — `scripts-scanner-v2.js` + `scripts-fiche-v2.js`
   Parcours = toutes les bouteilles du **meuble** du rond touché, en ordre physique (rangée puis espace) ; depuis le bloc « À ranger », ce sont les à-ranger. Gauche = suivante, droite = précédente. **Bute aux deux bouts, pas de boucle.** La photo ronde n'a qu'un `PHOTO_V2_CB` : il lui faut une liste + un index, construite au tap. Seuil pour distinguer tap et glissement (le tap ouvre la fiche). La rangée ouverte derrière ne bouge pas.

7. **Accords SAQ** — `Code.gs` + `scripts-fiche-v2.js` + Sheet — voir la spéc complète plus bas.

8. **Ménage** : retirer `testFamilleAccordsSAQ` de `Code.gs` quand la fouille sera finie.

9. **Reporté** : rédiger la section **Selon Chartier** dans `mise-a-jour.md` — tout son code est au dépôt mais le doc n'en parle nulle part.

---

## ✅ Spéc « Accords SAQ » — figée

### Sheet Vino
- Une seule colonne nouvelle, en fin : **`Famille accords`** — code unique (ex. `023`), lu directement dans l'API au scraping.
- Rien d'autre par vin : les recettes appartiennent à la famille, pas au vin.

### Nouvel onglet `Recettes` (une ligne par recette)
| Colonne | Contenu |
|---|---|
| Sku | clé, ex. `lapin-pruneaux` |
| Nom | titre de la recette |
| Familles | multiple, `;;` |
| Types de plats | multiple, `;;` |
| Ingrédients | multiple, `;;` |
| Cuisine | Française, Italienne… |
| Cuisson | Mijoté, Grillé… |
| Occasion | souvent vide |
| Préparation | ex. `10 min` |
| Temps cuisson | ex. `75 min` |
| Portions | ex. `4` |
| Type | recette ou fromage |
| Date maj | |

### Alimentation
- Un appel API **par famille** : filtre `famille_accords` + `catalog_type: 3`. Les 88 recettes de la famille 023 sont sorties **en un seul appel** — pas de pagination à gérer.
- Dédoublonnage sur le Sku (une recette appartient à plusieurs familles).
- **Seulement les familles présentes dans ma cave** : première passe sur les familles distinctes de mes vins, puis ajout automatique quand un vin arrive avec une famille inconnue.
- Rattrapage : fonction Apps Script qui remplit d'abord les codes de famille manquants sur les vins, puis lit les familles nouvelles.

### Affichage
- **Fiche du vin** : types de plats et ingrédients avec leur compte, titres des recettes en texte seul, section **après « Suggérer »**.
- **Sens inverse** : ingrédient → recettes qui le contiennent → familles de ces recettes → mes vins qui portent ces familles.
- L'onglet Accords (Chartier) et la page Selon Chartier restent intacts à côté — deux mécaniques distinctes.

---

## 🔍 L'API SAQ — ce qu'on a découvert

Endpoint déjà utilisé pour les promos et les dispos : `catalog-service.adobe.io/graphql`, clé dans les propriétés du script.

### Sur un VIN (`catalog_type: 1`, 91 attributs)
- **`famille_accords`** = code de famille, **valeur unique** (ex. `"027"` Apothic Red, `"023"` Altamente Jumilla)
- `recette_vedette` : vide — le produit ne porte pas ses recettes
- Le filtre `{ attribute: 'famille_accords', eq: '027' }` renvoie 42 vins

### Sur une RECETTE (`catalog_type: 3`, 21 attributs — c'est tout)
Le `sku` est le nom d'URL.

**Utile :**
| Attribut | Contenu |
|---|---|
| `recipe_type_dishes` | le libellé vert du site : Viandes rouges, Volaille… parfois multiple |
| `recipe_main_ingredient` | vocabulaire **normalisé** : Bœuf, Lapin, Crevette, Fruits… parfois multiple |
| `famille_accords` | **multiple** sur la recette (lapin = `["027","032","036","037","039"]`) — c'est la charnière avec le vin |
| `recipe_type_cuisine` | Française, Internationale, Terroir québécois… |
| `recipe_cooking_method` | Mijoté, Poêlé, Grillé, Au four… |
| `recipe_occasion` | existe, souvent vide |
| `recipe_preparation_time` / `recipe_cooking_time` / `recipe_number_portions` | |
| `recipe_ingredients_text` / `recipe_preparation_text` | listes complètes, en HTML |

**Inutile :** `availability_front`, `catalog_type`, `display_*`, `is_salable`, `latest_offers`, `product_weight`, `web_exclusive_price`, `sanitized_name`, `placeholder` (image générique).

**Pas de photo de recette dans l'API**, contrairement au site.

### Exemple réel — Altamente Jumilla (13632365), famille 023, 88 recettes
- Types de plats : Sandwiches et pâtés (24), Viandes blanches (20), Volaille (20), Viandes rouges (14), Charcuteries et abats (13), Fromages (11), Soupes et salades (9), Pâtes et pizzas (8), Entrées (5), Poissons et fruits de mer (3), Gibiers (3)
- Ingrédients (34 en tout) : Légumes (26), Porc (19), Poulet (14), Fromage à pâte ferme (13), Bœuf (12), Pain (10), Veau (6), Saucisses (6), Agneau (5)…
- Cuisines : Internationale (17), Terroir québécois (17), Française (11), Nord-américaine (9), Italienne (9), Latino-américaine (8)…
- Cuissons : Au four (26), Grillé (26), Mijoté (13), Sans cuisson (11)…

### Pièges relevés
- Des **fromages du Québec** portent le même `catalog_type: 3` (Raclette de Compton, Valbert, Gouda L'Ancêtre…) — d'où la colonne Type.
- Le classement SAQ est parfois bancal : « Lapin aux pruneaux » et « Rillettes de lapin » en Viandes blanches, « Hachis parmentier » en Volaille. **Les ingrédients principaux sont plus fiables que les types de plats.**

---

## 🚧 Abandonné, et pourquoi

- **Gratter les pages de recettes de saq.com** : le `robots.txt` interdit `/recettes`. Les fiches produits, elles, sont permises — le scraping actuel est dans les clous. L'API rend la question sans objet.
- **Réutiliser la colonne Recettes du Sheet** : devenue `REF_COLS.FAVORI` (index 29), la coche « Favori » de la page Modifier. Toute nouvelle donnée = nouvelle colonne en fin, comme `Bois` (colonne 70).
- **Colonne de 3 titres par vin** : remplacée par la famille + l'onglet Recettes.
- **Extraire des mots-clés des titres de recettes** : inutile, `recipe_main_ingredient` est déjà normalisé.
- **Onglet `Familles` avec comptes figés** : ne couvre que le sens vin → plats, pas les croisements ni le sens inverse.
- **Liens cliquables vers les recettes** : non voulu.
