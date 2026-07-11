# ACCORDS DYNAMIQUES — Spécification complète (validée par Chantal, 10 juillet 2026)

## But
Pouvoir **ajouter un nouvel accord** (catégorie) directement depuis l'app, sans ouvrir le Sheet. L'ajout se fait depuis le **menu Accords de la Fiche V2**.

Arbre des cas **entièrement validé par Chantal** — ne rien re-demander, coder tel quel.

---

## Contexte technique (vérifié dans les vrais fichiers)

- **Source des accords** : onglet **config** du Sheet (`CONFIG_SHEET = "config"`), colonne d'en-tête **« Accords »**. Lue par `getConfig()` (`Code.gs`) au démarrage : chaque valeur non vide et non déjà vue est poussée dans `config.accords`. Le front garde ça dans `CONFIG.accords`.
- **Menu Accords Fiche V2** (`scripts-fiche-v2.js`, dans `afficherFicheV2`) : `CONFIG.accords.map(...)` → items `.item-liste` avec `onclick="toggleAccordV2(this)"` et `data-accord`, dans `#ficheV2-accords-menu` (classe `menu-liste`), affichage dans `#ficheV2-accords-display` (`.champ-cliquable`, `basculerMenuAccordsV2()`).
- **Sauvegarde des accords d'un vin** : `updateWineField(codebarre, 'Accords', valeur)` puis `majMemoireVinV2` + `CURRENT_WINE_DATA` (mécanique existante à réutiliser telle quelle).
- **Autres consommateurs de `CONFIG.accords`** : filtres CASCADE de la page Cave (et fiche V1 `scripts-fiche.js` — ne pas y toucher, V1 profitera du nouvel accord au prochain chargement puisqu'il lit le même `CONFIG`).
- **Insensibilité casse/accents (règle du projet)** : utiliser `memeTexteV2(a,b)` / `normaliserRechercheV2` pour la détection de doublon.
- **Anti-gel** : tout appel backend passe par `appelBackend` (timeout 30 s, spinner en `finally`, erreurs → toast `afficherMessage`).
- **Styles à réutiliser** : `.item-liste`, `champ-saisie`, `.roundel` (ou le patron de bouton du projet) — **aucun nouveau style** sauf nécessité minime.

---

## Spécification — FRONT (Fiche V2)

### Branche 1 — Où ajouter (validée)
- **1.1** Un item **« + Ajouter »** au bas du menu Accords (`#ficheV2-accords-menu`), après tous les accords.
- **1.2** Tap sur « + Ajouter » → un **petit champ texte** (`champ-saisie`) apparaît à sa place, avec confirmation (touche Entrée ET/OU petit bouton ✓ — au choix du codeur, rester sobre).
- **1.3** Confirmation → le nouvel accord est écrit dans l'onglet config du Sheet (backend), **ajouté au menu** et **coché pour ce vin** (déclenche la sauvegarde des accords du vin via la mécanique existante).

### Branche 2 — Validation de la saisie (validée)
- **2.1** Champ vide confirmé → toast « Entrez un accord » (ou similaire), **rien n'est ajouté**, le champ reste ouvert.
- **2.2** Doublon (comparaison **insensible casse/accents** via `memeTexteV2`) → **pas d'écriture au Sheet** : l'accord existant est simplement **coché** pour ce vin (et la sauvegarde des accords du vin part normalement). Toast informatif facultatif.
- **2.3** Espaces début/fin → `trim()` avant toute comparaison et écriture.
- **2.4** Annulation (tap ailleurs / fermeture du menu / ✕) → rien n'est écrit, le champ redevient « + Ajouter ».

### Branche 3 — Après l'ajout (validée)
- **3.1** Le nouvel accord apparaît **immédiatement** : poussé dans `CONFIG.accords` (mémoire du front) → visible dans le menu de la fiche ET dans les filtres Cave sans recharger.
- **3.2** Serveur ne répond pas → toast d'erreur, **le texte tapé reste** dans le champ pour réessayer, **rien n'est coché**, `CONFIG.accords` n'est PAS modifié.
- **3.3** Autre téléphone : verra le nouvel accord à son prochain démarrage ou via Rafraîchir — **comportement normal, rien à coder** (vérifier seulement que Rafraîchir recharge bien `CONFIG` ; si Rafraîchir ne recharge que `ALL_DATA`, l'accord arrivera au prochain démarrage — acceptable, ne pas alourdir).

### Branche 4 — Détails (validée)
- **4.1** Le nouvel accord s'insère **en ordre alphabétique** dans le menu (insérer au bon endroit dans `CONFIG.accords` avant de re-rendre le menu). Comparaison alphabétique normalisée (accents ignorés) pour rester cohérent avec l'ordre du prochain chargement.
- **4.2** **Supprimer/renommer un accord : HORS PÉRIMÈTRE** — se fait à la main dans le Sheet, comme aujourd'hui. Ne rien coder pour ça.

---

## Spécification — BACKEND (`Code.gs`)

Nouvelle fonction (nom suggéré : `ajouterAccordConfig(accord)`) :
1. `trim()` la valeur ; vide → `{ success:false, error:'Accord vide' }`.
2. Ouvrir l'onglet `CONFIG_SHEET`, trouver la colonne d'en-tête **« Accords »** (même mécanique que `getConfig` : `headers.indexOf('Accords')`).
3. **Vérifier le doublon côté serveur aussi** (insensible casse/accents — normaliser les deux côtés) : si présent → `{ success:true, deja:true }` (le front cochera sans dupliquer).
4. Sinon écrire la valeur dans la **première cellule vide de la colonne Accords** (attention : ne PAS se fier à `getLastRow()` global, d'autres colonnes de config peuvent être plus longues — parcourir la colonne Accords elle-même).
5. Retourner `{ success:true }`.

Le front n'appelle PAS `getConfig` après — il met à jour `CONFIG.accords` localement (3.1). Le Sheet reste la vérité pour les prochains chargements.

---

## Ordre des opérations au confirmé (front)
1. Nettoyer (`trim`).
2. Vide → toast, stop (2.1).
3. Doublon local (`memeTexteV2` contre `CONFIG.accords`) → cocher l'existant, sauvegarder les accords du vin, refermer le champ, stop (2.2).
4. `appelBackend('ajouterAccordConfig', ...)`.
5. Échec → toast, texte conservé, stop (3.2).
6. Succès → insérer dans `CONFIG.accords` (ordre alphabétique), re-rendre le menu avec le nouvel accord **coché**, sauvegarder les accords du vin (`updateWineField` + `majMemoireVinV2` + `CURRENT_WINE_DATA`), toast de confirmation.

---

## Règles de méthode à respecter pendant le codage (METHODE.md)
1. **Trouve-et-remplace uniquement, UN à la fois**, texte exact (indentation comprise), attendre le « ok » de Chantal entre chaque.
2. **Réutiliser l'existant** : `.item-liste`, `champ-saisie`, `updateWineField`, `majMemoireVinV2`, `appelBackend`, `afficherMessage`, `memeTexteV2`. Réduire le code, pas le gonfler.
3. **Ne jamais renommer les `id`** existants.
4. **Preuve de vérification** (Vérifié / Impacts) avant chaque proposition.
5. Réponses **courtes**, zéro jargon, **une question à la fois**, jamais de listes à choix.
6. **Publication** : `Code.gs` touché → **nouveau déploiement Apps Script** ET republier le site (JS modifié). Prévenir Chantal de ne pas tester avant que le back ET le front soient publiés (le bouton appellerait une fonction inexistante).

## Ordre de construction suggéré
1. Backend `ajouterAccordConfig` dans `Code.gs`.
2. Front : item « + Ajouter » + champ + logique (ordre des opérations ci-dessus).
3. Rappeler à Chantal : déploiement Apps Script + republier le site, puis tester : ajout normal, doublon (avec majuscules différentes), champ vide, annulation, nouvel accord visible dans les filtres Cave.
