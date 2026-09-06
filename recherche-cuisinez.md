# Notes — Intégration Cuisinez (Télé-Québec)

> Recherche exploratoire, aucune décision d'architecture prise, aucun code écrit.
> Objectif : évaluer si/comment intégrer cuisinez.telequebec.tv comme source d'info, sur le modèle de l'intégration SAQ existante (voir `archives/seance-accords-saq.md`).

---

## Endpoint trouvé

```
GET https://cuisinez.telequebec.tv/_next/data/{BUILD_ID}/recettes/{ID}/{SLUG}.json?id={ID}&slug={SLUG}
```

- Testé avec `id=8092`, `slug=brochettes-de-homard`.
- `{BUILD_ID}` observé : `6MjPqIaRong0v7-DFxfla` — **change à chaque déploiement du site**. Pas encore résolu comment le récupérer dynamiquement (probablement dans le HTML source d'une page, ou dans `_next/static/.../_buildManifest.js`).

**Méthode pour obtenir le JSON d'une recette** : DevTools → onglet Réseau → filtre Fetch/XHR → recharger la page → chercher la requête `{slug}.json` → onglet Réponse → copier.

### Autres endpoints repérés, non explorés
- `https://api.pc-cms.tele.quebec/graphql` (POST) — GraphQL séparé, vu pour les menus (`operationName: "WebMenu"`). Pourrait servir à autre chose, non testé.
- Endpoints REST `filtres` et `categories` (appelés par `useFilters.ts` / `useCategories.ts`) — pour peupler filtres/catégories de recherche. Non testés.
- `https://cuisinez.telequebec.tv/manifest.json` — manifeste PWA, sans intérêt.

**Aucun endpoint de liste/recherche confirmé.** On sait lire UNE recette si on connaît déjà `id` + `slug`, mais pas comment en découvrir plusieurs (par ingrédient, catégorie, ou en lot).

---

## Structure JSON complète d'une recette (`pageProps.data`)

Basé sur 1 recette lue en entier (`brochettes-de-homard`, id 8092) + les versions allégées de 3 `recommended`.

### Identité
- `id`, `titre`, `titreHtml`, `titreAccroche` (null), `slug`, `type` (toujours "recette")
- `datePublication`
- `descriptionCourte` (null), `accroche` (null)

### Portions et temps
- `rendement` : nombre de portions (ex. 4)
- `dureeTotal` : minutes (ex. 50)
- `typeDuree` : au moins 3 valeurs vues — "rapide", "moyenne", "longue"
- `temps[]` : liste avec `id`, `typeTemps` ("Préparation", "Cuisson" vus), `duree` (nombre), `dureeIso8601` (format ISO 8601, ex. "PT40M"), `type` ("temps")

### Évaluation
- `evaluations.total`, `evaluations.moyenne`

### Catégorisation
- `categories[]` : `id`, `nom`, `ordre`, `slug`, `images` (null), `type` (toujours "categorie")
  - **Une seule liste plate mélangeant plusieurs natures de tags** : émission ("Curieux Bégin"), type de plat ("Plats principaux"), ingrédient dominant ("Fruits de mer", "Pâtes"), restriction alimentaire ("Sans noix", "Sans œufs", "Sans lactose"), regroupement large ("Ingrédients", "Émissions", "Choix alimentaires"). Aucun sous-typage interne pour les distinguer autrement que par le nom.
- `rubriques[]` : `id`, `texte` (HTML), `typeRubrique` ("Note", "Saviez-vous ?" vus), `type` ("rubrique")
- `particularites[]` : **vide dans tous les exemples vus** — structure interne inconnue

### Source / provenance (confirmé complet)
```
source: { id, nom, url, estAffichable, estEmission,
  emission: { id, nom, slug, images[], type, position },
  type: "source" }
```

### Médias
- `media.videoId`, `media.referenceId`, `media.legacyId` — toujours null/quasi-vides dans les exemples, lien vidéo réel non éclairci
- `images[]` : `id`, `typeGabarit` (formats vus : `format16x9`, `format1x1`, `format2x3`, `carouselDesktop`, `logo`), `path`, `width`, `height`, `description`, `declinaisons[]` (variantes de taille : `file`, `width`, `height`, `upscale`)

### Ingrédients — confirmé, texte libre uniquement
```
sectionIngredients: [
  { id, titre: "Pour la recette principale",
    listeItems: [
      { id, texteHtml, texteSansHtml, type: "ingredient" }
    ],
    type: "sectionIngredients" }
]
```
**Pas de séparation structurée quantité/unité/nom.** Tout est une chaîne libre (ex. "2 homards femelles (env. 900 g – 2 lb chacun)"). Aucun parsing automatique fiable sans traitement de texte maison.

### Instructions — même patron
```
sectionInstructions: [
  { id, titre, listeItems: [
      { id, texteHtml, texteSansHtml, type: "etape" }
    ],
    type: "sectionInstructions" }
]
```
Texte complet par étape, pas de lien structuré vers les ingrédients utilisés.

### Boissons — la pièce clé pour un lien vers la cave
```
boissons: [
  { id, nom,            // ex. "Ken Forrester Reserve Stellenbosch 2024" — nom de PRODUIT précis
    description,         // vide dans l'exemple
    typeProduit,         // ex. "vin blanc"
    provenance,           // ex. "Afrique du Sud"
    prix,
    urlSAQ,               // ex. "https://www.saq.com/fr/11093126" — CODE SAQ dans l'URL
    urlProducteur,        // null dans l'exemple
    datePublication,
    images[],
    type: "boisson" }
]
```
- **`urlSAQ` contient le code SAQ directement**, extractible par parsing de l'URL — pont exploitable vers la cave, comparable à `famille_accords` côté SAQ.
- Une seule entrée vue sur la recette testée. Inconnu : peut-il y en avoir plusieurs (vin + bière) ? Certaines recettes n'en ont-elles aucune ?

### `recommended[]` (recettes similaires, version allégée)
Contient les mêmes clés principales SAUF : `sectionIngredients`, `sectionInstructions`, `rubriques`, `valeursNutritives`, `particularites`, `boissons`, `auteurs`, `filtreItems`, `titreAccroche`.

---

## Ce qui reste inconnu / à vérifier

1. **`particularites[]`** — jamais vu rempli, structure inconnue.
2. **`valeursNutritives`** — toujours `null` dans les exemples, structure inconnue si rempli.
3. **Nombre de `boissons` possibles par recette** — un seul exemple observé.
4. **`urlSAQ` est-il toujours présent** sur `boissons`, ou seulement si le produit est vendu à la SAQ ?
5. **Aucun endpoint de liste/recherche testé** — bloque tout flux "ingrédient → recettes → vins" ou "catégorie → recettes". Sans ça, seul un lookup recette-par-recette (id+slug connus d'avance) est possible.
6. **BUILD_ID dynamique** — pas de méthode confirmée pour le récupérer sans le coder en dur.
7. **CGU du site** — usage interne/personnel à valider (pas vérifié dans cette recherche).

---

## Points d'architecture à trancher (aucun tranché)

1. **Mode d'appel** : à la volée par requête (comme `testScrapingSAQ`, cache 5 min) vs. synchronisation périodique écrivant dans un onglet Sheet (comme `Recettes`/`majRecettesSAQ`).
2. **Résolution du BUILD_ID** : une fois et mis en cache, vs. refetch à chaque appel.
3. **Portée du projet** : juste lookup par id/slug connu, ou navigation par catégorie/émission/ingrédient (ce qui implique d'explorer `filtres`/`categories`/GraphQL).
4. **CGU** — à valider avant tout usage au-delà de l'exploration.

**Prochaine étape suggérée** (non commencée) : déterminer s'il existe un moyen de lister/rechercher des recettes (point 5 ci-dessus), sinon toute la mécanique "découverte" reste bloquée à un lookup unitaire.
