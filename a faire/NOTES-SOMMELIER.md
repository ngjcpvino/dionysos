# NOTES DU SOMMELIER — Spécification complète (validée par Chantal, 10 juillet 2026)

## But
Le champ « Notes » (colonne Sheet **Notes temporaires**) devient **« Notes du sommelier »**, toujours visible et modifiable directement :
1. dans la **Fiche V2** (section Notes) ;
2. dans la page **Boire V2**.

Arbre des cas **entièrement validé par Chantal** — ne rien re-demander, coder tel quel.

---

## Contexte technique (vérifié dans les vrais fichiers)

- **Champ** : `Notes temporaires` — colonne `AE` du Sheet (`REF_COLS.NOTES_TEMP = 30` dans `Code.gs`).
- **Fiche V2** : `scripts-fiche-v2.js`, fonction `afficherFicheV2(result)`. Le bloc Notes est bâti ainsi (ordre actuel) : Accords → Racheter/Sur-inventaire (`deux-colonnes`) → `ligne('Recettes', wine.Recettes)` → `ligne('Notes', wine['Notes temporaires'])` → `ligne('Divers', wine.Divers)`. La fonction `ligne(libelle, valeur)` retourne `''` si la valeur est vide — c'est pourquoi le champ disparaît aujourd'hui.
- **Écriture directe existante à réutiliser** : même mécanique que Racheter/Panier/Accords → backend `updateWineField(codebarre, champ, valeur)` puis `majMemoireVinV2(cb, champs)` puis mise à jour de `CURRENT_WINE_DATA`. (Voir `setAimeV2` / `togglePanierV2` / la sauvegarde des accords dans `scripts-fiche-v2.js` comme modèles.)
- **Textarea qui replie** : le style existe déjà — CSS `textarea.champ-saisie` (utilisé par `boireV2-plat`, `histoEditV2-plat`, `histoAjoutV2-plat`). **Réutiliser cette classe, ne rien créer de neuf.**
- **Boire V2** : page existante avec champ mets `boireV2-plat` (textarea qui replie), verres grisés sans plat, accords. Confirmation = écrit + resync `ALL_DATA` + invalide `ALL_HISTORIQUE` + retour ACCUEIL.
- **Mémoire** : lecture = `ALL_DATA` seulement ; écriture = Sheet puis `majMemoireVinV2` (règle du projet). `ficheDepuisMemoireV2` fournit déjà `'Notes temporaires'`.
- **Édition crayon (27 champs)** : contient déjà `['Notes', 'notestemp', 'Notes temporaires']` dans `EDIT_FICHE_V2_CHAMPS` — **changer le libellé affiché en « Notes du sommelier »** (le champ Sheet ne change PAS de nom).
- **Anti-gel** : tout appel backend passe par `appelBackend` (timeout 30 s, spinner retiré en `finally`, erreurs → toast).

---

## Spécification — FICHE V2

### Position et libellé
- Le champ « Notes du sommelier » devient le **PREMIER élément de la section Notes**, AVANT Accords.
- Ordre final de la section : **Notes du sommelier → Accords → Racheter/Sur-inventaire → Recettes → Divers**.
- `Recettes` et `Divers` restent via `ligne()` (masqués si vides) — inchangés.

### Comportement (branches 1 et 2 validées)
- **1.1** Notes vide → le champ apparaît quand même, vide, cliquable pour écrire. (Ne PAS passer par `ligne()` — bâtir un bloc dédié toujours rendu.)
- **1.2** Notes rempli → texte affiché, cliquable pour modifier.
- **1.3** Tout effacé puis sauvegardé → le champ se vide aussi dans le Sheet (envoyer la valeur vide à `updateWineField`).
- **1.4** Clic sans changement → **aucune écriture** (comparer valeur avant/après ; si identiques, ne rien envoyer).
- **2.1** Tap sur le champ → devient un **textarea `champ-saisie` qui replie** (même patron que le champ mets).
- **2.2** Perte de focus (`blur`) → **sauvegarde automatique** si la valeur a changé + **toast de confirmation** (via `afficherMessage`).
- **2.3** Serveur ne répond pas → message d'erreur (toast, mécanique `appelBackend` existante) et **le texte tapé RESTE à l'écran** pour réessayer (ne pas restaurer l'ancienne valeur).
- **2.4** Fermeture de la fiche pendant l'écriture → couvert par 2.2 : le `blur` se produit avant/à la fermeture, la sauvegarde part à ce moment.

### Écriture (fiche)
`updateWineField(codebarre, 'Notes temporaires', valeur)` → succès → `majMemoireVinV2(cb, { 'Notes temporaires': valeur })` + `CURRENT_WINE_DATA['Notes temporaires'] = valeur` + toast. Échec → toast d'erreur, texte conservé à l'écran.

---

## Spécification — BOIRE V2

### Position et libellé (validé)
- Champ **« Notes du sommelier »** : textarea qui replie (`champ-saisie`), **AU-DESSUS du champ mets** (`boireV2-plat`).
- **Pré-rempli** avec la note existante du vin (depuis la mémoire — le contexte Boire vient déjà de `ALL_DATA`).

### Comportement (branche 3 validée)
- **3.2** Modifié puis « Boire » confirmé → la note est écrite dans le vin **en même temps** que le reste (dans le flux de confirmation existant).
- **3.3** Pas touché → **aucune écriture de note** (comparer à la valeur initiale ; identique = ne pas envoyer).
- **3.4** Annulation (✕) → rien n'est écrit, même si du texte a été tapé.
- **4.3** Champ vidé puis confirmé → la note se vide aussi dans le Sheet.

### Écriture (Boire)
Dans la confirmation de Boire : si la note a changé → `updateWineField(codebarre, 'Notes temporaires', valeur)` (avant ou après l'écriture Boire, mais AVANT le resync `ALL_DATA` pour que la mémoire revienne juste). Le resync existant (branche 4.2) ramène la note fraîche partout — rien d'autre à faire côté mémoire.

---

## Cas limites (branche 4, validée)
- **4.1** Deux téléphones : dernier qui écrit gagne — comportement identique aux autres champs, **assumé, rien à coder**.
- **4.2** Après Boire → resync `ALL_DATA` déjà en place — vérifier seulement que la note écrite arrive avant le resync.
- **4.3** Voir ci-dessus.

---

## Libellés — récapitulatif
| Endroit | Libellé |
|---|---|
| Fiche V2, section Notes (1er élément) | **Notes du sommelier** |
| Boire V2 (au-dessus du champ mets) | **Notes du sommelier** |
| Édition crayon (`EDIT_FICHE_V2_CHAMPS`) | **Notes du sommelier** (remplace « Notes ») |
| Sheet / backend | `Notes temporaires` — **NE PAS RENOMMER** |

---

## Règles de méthode à respecter pendant le codage (METHODE.md)
1. **Trouve-et-remplace uniquement, UN à la fois**, texte exact (indentation comprise), attendre le « ok » de Chantal entre chaque.
2. **Réutiliser l'existant** : `champ-saisie`, `updateWineField`, `majMemoireVinV2`, `afficherMessage`, `appelBackend`, patron du champ mets. **Aucun nouveau style, aucune nouvelle mécanique backend.**
3. **Ne jamais renommer les `id`** existants.
4. **Preuve de vérification** (Vérifié / Impacts) avant chaque proposition.
5. Réponses **courtes**, zéro jargon, **une question à la fois**, jamais de listes à choix.
6. `updateWineField` existe déjà au backend — si en le vérifiant il ne gère pas `Notes temporaires`, l'ajuster (colonne `NOTES_TEMP = 30`) plutôt que créer une fonction.
7. **Publication** : HTML/JS modifiés → republier le site ; si `Code.gs` touché → nouveau déploiement Apps Script. Prévenir Chantal de ne pas tester avant la fin de la séquence si des étapes se suivent.

## Ordre de construction suggéré
1. Fiche V2 : bloc « Notes du sommelier » en tête de section, toujours visible, tap → textarea, blur → sauvegarde.
2. Édition crayon : libellé « Notes du sommelier ».
3. Boire V2 : champ au-dessus du mets, pré-rempli, écrit à la confirmation si changé.
4. Rappeler à Chantal de republier le site, puis tester : fiche vide/remplie, effacement, Boire avec et sans modification, annulation.
