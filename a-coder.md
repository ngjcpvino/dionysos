# 🔧 À coder — 14 items

> Séance du 5 septembre 2026. **Rien n'est fait** : aucun bloc trouve/remplace envoyé ni appliqué.
> Règles de travail : `REFERENCE.md`. État technique : `mise-a-jour.md`.

## Ordre de codage imposé

**1 · 2 · 3 · 4 · 11 · 8 · 12 · 14 · 13 · 5 · 6 · 7 · 9 · 10**

- Le **renommage (1)** passe avant tout : 2, 3 et 10 touchent les mêmes noms.
- Le **filtre Couleur (11)** passe avant le **« Tous » (8)**, sinon il faut repasser lui ajouter sa ligne.
- **12 et 14** (colonne Racheter) passent avant **5 et 6**, qui s'appuient sur la colonne vide.
- **13** (scan) crée des suggestions ; à faire avant 5 et 6 pour avoir de quoi tester.

---

## 1. Renommage « Accords » → « Chartier »
`index-v2.html` · `scripts-scanner-v2.js` · `scripts-fiche-v2.js` · `Code.gs` · Sheet

- Tout ce qui est lié à Chartier prend le nom Chartier : conteneur, panneau, fonctions, variables, backend, onglet Sheet.
- Le **champ Accords de la fiche** et sa colonne config gardent leur nom : ils ne sont pas liés à Chartier.

## 2. Conteneur SELON CHARTIER manquant
`index-v2.html`

- `ouvrirAccordsV2` plante sur `#accordsV2Container` : « null is not an object » au clic dans le menu.
- Le moteur est complet dans `scripts-scanner-v2.js` ; seul le bloc HTML de la page a sauté.
- Bloc à remettre sur le gabarit de `#selonSaqV2Container` : loupe `#accordsV2-loupe`, titre, `#accordsV2-selection`, `#accordsV2-resultats`, voile `#accordsV2-filtres-voile`, panneau `#accordsV2-filtres`.
- ✕ → `fermerAccordsV2()`, loupe → `ouvrirFiltresAccordsV2()`, voile → `fermerFiltresAccordsV2()`.

## 3. Sous-menu « Accord selon… » au burger
`index-v2.html` · `scripts-scanner-v2.js`

- Un seul item : **Accord selon…** Au clic, il déplie **Sommeliers** · **SAQ** · **Chartier**.
- Les trois lignes actuelles (SUGGESTIONS, SELON CHARTIER, SELON SAQ) disparaissent du menu principal.
- Cibles inchangées : Sommeliers → `suggestions`, SAQ → `selonsaq`, Chartier → `accords`.

## 4. Sous-menu « Outils » au burger
`index-v2.html` · `scripts-scanner-v2.js`

- Un item **OUTILS** qui déplie : **À ranger** · **Sans cépage** · **Facture SAQ** · **Promotions SAQ**.
- Ces quatre lignes disparaissent du menu principal. Cibles inchangées.
- Même mécanique de dépliage que l'item 3.

## 11. Filtre Couleur dans l'Historique
`scripts-scanner-v2.js`

- Menu déroulant, même patron que Suggestions, liste bâtie par `uniqueValeursAchat(ALL_DATA, 'Couleur')`.
- La couleur d'une entrée d'historique se retrouve par code-barres dans `ALL_DATA` (même mécanique que la table `cbAccords` pour l'Accord).
- Ajouté à `filtresHistoV2`, cumulable avec Mets · Vin · Accord ; loupe en or quand rempli ; remis à zéro par `reinitialiserFiltresHistoV2`.
- Ordre du panneau : champ Mets (bloc `avant`), puis Vin · Accord · **Couleur**.
- Panneau bâti par `PANNEAUX_V2.histo`, jamais dans le HTML.

## 8. Choix « Tous » en tête de chaque menu de filtre
`scripts-scanner-v2.js`

- Dans tous les menus déroulants de filtre (Cave, Recherche, Liste d'achat, Emplacements, Historique, Promotions, Chartier, Selon SAQ), une première ligne **Tous** qui remet **ce filtre-là seul** à zéro.
- Marquée active quand aucune valeur n'est choisie.
- Réinitialiser reste là pour vider tout le panneau d'un coup.

---

# 🍷 La colonne Racheter — trois états

**Ce qui est décidé, et qui gouverne les items 12, 13, 14, 5 et 6 :**

- **Vide** = jamais acheté. C'est une **suggestion**, une note prise dans l'app au lieu d'un bout de papier.
- **Oui** = acheté, à reprendre. Posé à la création d'un vin acheté, ou automatiquement à la première arrivée d'une bouteille.
- **Non** = acheté, plus jamais. Posé par moi seul, avec le ✗.

Un vin suggéré puis acheté passe à Oui, mais **reste pour toujours dans l'onglet Suggestions** : les deux mécaniques sont indépendantes. La page Suggestions est bâtie sur l'onglet Suggestions du Sheet, pas sur cette colonne.

## 12. Ne plus inventer « oui » quand la colonne est vide
`Code.gs` · `scripts-fiche-v2.js`

Sept endroits touchent la colonne. Trois écrivent, quatre lisent.

**Le destructeur, à régler en premier** — `saveWineEdits` écrit `data.aime || 'Oui'` à **chaque** sauvegarde de fiche. Modifier n'importe quel champ d'une suggestion l'estampe « Oui » et la fait sortir des suggestions pour toujours. Décidé : **la sauvegarde de fiche n'écrit plus jamais cette colonne**. Elle ne change que par les deux cercles ✓ / ✗.

**Les menteurs d'affichage** — repli `|| 'Oui'` à retirer, aucun cercle actif quand la colonne est vide, le bloc « Racheter ? » reste affiché :
- `checkWineExists` (ligne ~319 de `Code.gs`)
- `getWineBottles` (ligne ~710 de `Code.gs`)
- page Modifier de `scripts-fiche-v2.js` (`var aime = wine.Racheter || 'Oui'`)

**À laisser tel quel** — `getInventoryData` garde déjà le vide (lignes 159 et 207). Les deux cercles écrivent correctement. La Liste d'achat ne prend que les « Oui » à zéro bouteille, la liste Ne pas racheter que les « Non » : un vin à colonne vide n'entre dans ni l'une ni l'autre.

## 14. Passage automatique à « oui » à l'arrivée d'une bouteille
`Code.gs`

- Quand une bouteille arrive sur un vin dont la colonne Racheter est **vide**, elle passe à **Oui**.
- Le vin cesse d'être une note : il est entré dans la cave.
- Rien ne change si la colonne vaut déjà Oui ou Non.

## 13. Scan d'un vin absent : ne plus créer la fiche d'office
`scripts-scanner-v2.js` · `Code.gs`

**Aujourd'hui** : un vin inconnu est cherché à la SAQ et la fiche est créée sans rien demander. Mauvais — je scanne peut-être en succursale juste pour voir si je l'ai déjà.

**Deux cas seulement**, puisque suggestions et cave sont la même table :
- **La fiche existe** (vin bu, en stock, ou suggestion sans bouteille) → menu d'action, comme aujourd'hui. Une suggestion y arrive avec Déplacer, Boire et Donner grisés, ce qui est correct : seuls Visualiser et Arrivée servent.
- **La fiche n'existe pas** → la page montre ce que la SAQ dit et propose de **placer le vin en suggestion**. **Rien n'est écrit tant que je n'ai pas choisi.** Je ferme sans sauver → aucune trace nulle part, ni cave ni suggestions.

**Vaut pour les trois portes d'entrée** : caméra, code-barres tapé, code SAQ tapé.

**Lien avec l'item 12** : un vin créé en suggestion naît avec la colonne Racheter **vide**, pas « Oui ». Un vin créé par une arrivée naît à « Oui », comme aujourd'hui.

## 5. Vins-notes : « Suggestion » au lieu de « 0 btl »
`scripts-scanner-v2.js`

- Dans toutes les listes à cartes (Cave, Recherche, Chartier, Selon SAQ, Suggestions, Emplacements), un vin à colonne Racheter **vide** affiche **Suggestion** dans la case de droite au lieu de `0 btl`.
- Le voile de carte vide reste tel quel.

## 6. Bascule « Liste suggestions » dans Liste d'achat
`scripts-scanner-v2.js`

- En tête du panneau de filtres : **Liste d'achat** et **Liste suggestions**, **exclusives**, une seule active à la fois, Liste d'achat par défaut.
- Liste suggestions = les vins dont la colonne Racheter est vide.
- Les filtres du dessous (couleur, pays, succursale, etc.) s'appliquent aux deux modes.
- Les « à ne pas racheter » restent comme aujourd'hui, hors filtres.

## 7. Intervertir deux roundels dans Liste d'achat
`scripts-scanner-v2.js`

- Dans le panneau de filtres, **Ne pas racheter** et **Réinitialiser** échangent leur place.

## 9. Retirer « Selon » dans la section ACCORDS SELON… de la fiche
`scripts-fiche-v2.js`

- Les trois lignes deviennent **Les sommeliers** · **SAQ** · **Chartier**.
- Le titre de section reste **ACCORDS SELON…**

## 10. % des cépages sur la fiche
`scripts-fiche-v2.js` · `Code.gs`

- La fiche SAQ donne les cépages avec leurs pourcentages ; `cleanCepages` les retire avant l'écriture au Sheet. **Rien ne change au Sheet** : la colonne Cépages reste nettoyée, filtres et menus intacts.
- La ligne « Cépages : » de la section Information reçoit un `id`.
- `verifierEtMettreAJourPrixSAQ` retourne aussi les cépages bruts avec %, tirés du HTML **déjà téléchargé** — aucun appel SAQ de plus (la fiche est en cache 5 minutes).
- `verifierPrixV2` réécrit la ligne à l'arrivée de la réponse, **étoile Favori conservée**.
- Sans code SAQ, hors ligne, ou % absents de la fiche SAQ → la ligne ne bouge pas.

---

## 🔭 Noté, pas tranché

- La colonne s'appelle `AIME` dans le code et « Racheter » partout ailleurs. Renommage à faire un jour, même famille que l'item 1.
