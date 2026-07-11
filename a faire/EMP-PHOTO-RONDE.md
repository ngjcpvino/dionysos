# EMPLACEMENTS — GRANDE PHOTO RONDE — Spécification complète (validée par Chantal, 10 juillet 2026)

## But
Dans Emplacements V2, rangée ouverte : le tap sur un **rond occupé** n'ouvre plus la fiche directement. Il ouvre d'abord la **photo complète du vin dans un GRAND ROND**, avec un **✕ à l'EXTÉRIEUR du rond** (au-dessus, comme un indice). Le tap **sur la grande photo** ouvre la fiche.

Arbre des cas **entièrement validé par Chantal** — ne rien re-demander, coder tel quel.

---

## Contexte technique (vérifié dans les vrais fichiers)

- **Emplacements V2** : `scripts-scanner-v2.js` — `afficherEmpV2()` rend les meubles/rangées ; la rangée tirée montre de gros ronds avec photo miniature (`object-fit`), bordure à la couleur du vin (`data-couleur="var(--vin-*)"`). **Rond occupé → fiche (provenance 'emplacements')** ; **rond LIBRE → scan** (ne pas toucher). Le codeur doit repérer le `onclick` du rond occupé dans le rendu de la rangée ouverte (c'est LÀ le point d'accroche).
- **Modale photo existante** : `#photoV2Overlay` (`index-v2.html`) — `.photo-grande img` rectangulaire, ✕ `.btn-fermer`, `z-index:10010`, dans `cacherToutesPagesV2`. Fonctions `ouvrirPhotoV2(url)` / `fermerPhotoV2()` (`scripts-fiche-v2.js`). **Elle sert à la fiche — NE PAS la détourner** : son ✕/comportement doivent rester intacts pour la fiche.
- **Fiche** : `ouvrirFicheV2(cb, 'emplacements')` ; `fermerFicheV2` avec provenance 'emplacements' → `ouvrirEmpV2()` (déjà en place).
- **Règles de navigation à respecter** : ouvrir un overlay après en avoir masqué un autre via `ouvrirApresTap(fn)` (anti double-tap) ; tout nouvel overlay ajouté à `cacherToutesPagesV2()` ; z-index des overlays empilés = `10010`.
- **Couleur du vin** : classes `.vin-rouge/.vin-blanc/.vin-rose/.vin-bulles` et variables `--vin-*` existent.

---

## Décision d'architecture (règle 1.5 — réutiliser, décision à valider par un trouve-et-remplace comme d'habitude)
**Réutiliser `#photoV2Overlay`** en lui ajoutant un **mode « rond »** plutôt que créer un deuxième overlay :
- Une classe (ex. `photo-ronde`) posée sur l'overlay quand il est ouvert depuis Emplacements, retirée à la fermeture.
- En mode rond : l'image est dans un grand cercle (`border-radius:50%`, `overflow:hidden`, `object-fit:cover`, taille ~`min(80vw, 60vh)` carrée), **bordure à la couleur du vin** (cohérent avec les ronds d'emplacements — réutiliser le même mécanisme `--vin-*`).
- Le ✕ : réutiliser le `.btn-fermer` existant — en mode rond, il est **au-dessus du rond, à l'extérieur** (positionnement via la classe `photo-ronde`, sans toucher au mode fiche).
- Deux variables JS de contexte (ex. `PHOTO_V2_MODE`, `PHOTO_V2_CB`) pour savoir : mode rond ou fiche, et quel vin ouvrir au tap.

Si le codeur juge après analyse qu'un mini-overlay séparé est PLUS simple ET plus court, il peut le proposer à Chantal — mais l'option par défaut est la réutilisation.

---

## Spécification — comportements validés

### Branche 1 — Ouverture
- **1.1** Tap sur un **rond occupé** (rangée ouverte) → grande photo dans un grand rond + ✕ **à l'extérieur du rond** (au-dessus). Ouverture via `ouvrirApresTap` (règle anti double-tap). Les emplacements restent dessous (l'overlay les recouvre, `z-index:10010`).
- **1.2** Tap **sur la grande photo/le rond** → la fiche s'ouvre : fermer l'overlay photo (retirer le mode rond) puis `ouvrirApresTap(function(){ ouvrirFicheV2(cb, 'emplacements'); })`.
- **1.3** Tap sur le **✕** → l'overlay se ferme, retour aux emplacements **tels quels** (rangée toujours ouverte, position de défilement inchangée — donc NE PAS re-rendre la page, ne pas appeler `ouvrirEmpV2`, juste masquer l'overlay).

### Branche 2 — Cas particuliers
- **2.1** Vin **sans photo** → le grand rond s'ouvre quand même, avec le **nom du vin au centre** (texte, style sobre existant) ; le tap mène à la fiche pareil.
- **2.2** Photo au **lien brisé** (`onerror` de l'img) → basculer sur l'affichage 2.1 (masquer l'img, montrer le nom). Prévoir un élément nom déjà dans l'overlay (caché en mode fiche).
- **2.3** Tap **à côté du rond** (sur le fond sombre de l'overlay) → ferme, comme le ✕. Attention : `event.stopPropagation()` sur le rond/photo pour que le tap sur la photo ne ferme pas.

### Branche 3 — Retour de la fiche
- **3.1** Fermer la fiche ouverte depuis la grande photo → retour **directement aux emplacements** (la grande photo ne se rouvre PAS). Déjà le comportement de `fermerFicheV2` avec provenance 'emplacements' (`ouvrirEmpV2()`) — **rien à coder**, juste vérifier.

### Ce qui ne change PAS
- Rond **libre** → scan (intact).
- Vue rangées fermées, quinconce, décomptes, bordures couleur : intacts.
- Mode photo de la **fiche** (`ouvrirPhotoV2` actuel) : intact — le mode rond ne s'applique que depuis Emplacements.

---

## Détails HTML/CSS/JS attendus
- **HTML** (`index-v2.html`) : dans `#photoV2Overlay`, ajouter un conteneur/élément pour le nom (caché par défaut). Ne renommer AUCUN `id`.
- **CSS** (`styles-v2.css`) : règles sous `.photo-ronde` (rond, bordure couleur via les classes `.vin-*` ou `data-couleur` comme les ronds d'emplacements, ✕ repositionné au-dessus/extérieur). Réutiliser variables existantes (`--space-*`, `--vin-*`, `--couleur-bordure-or`).
- **JS** : nouvelle fonction (ex. `ouvrirPhotoEmpV2(cb)`) qui lit le vin depuis `ALL_DATA` (mémoire — AUCUN appel backend), pose photo/nom/couleur/contexte, ouvre l'overlay en mode rond. `fermerPhotoV2` : retirer la classe et le contexte du mode rond (sans casser le mode fiche). Changer le `onclick` du rond occupé dans `afficherEmpV2` pour appeler la nouvelle fonction au lieu de la fiche.

---

## Règles de méthode (METHODE.md)
1. **Trouve-et-remplace uniquement, UN à la fois**, texte exact (indentation comprise), attendre le « ok » de Chantal entre chaque.
2. **Preuve de vérification** (Vérifié / Impacts) avant chaque proposition.
3. **Ne jamais renommer les `id`**. Réutiliser l'existant, réduire le code.
4. Réponses **courtes**, zéro jargon, **une question à la fois**.
5. **Publication** : HTML + CSS + JS → **republier le site** (pas de `Code.gs`). Si les trouve-et-remplace s'enchaînent, prévenir Chantal de **ne pas tester avant la fin** (le rond appellerait une fonction pas encore là).

## Ordre de construction suggéré
1. HTML : élément nom dans `#photoV2Overlay`.
2. CSS : mode `photo-ronde` (rond, bordure couleur, ✕ extérieur au-dessus).
3. JS : `ouvrirPhotoEmpV2` + adaptation de `fermerPhotoV2` + fermeture au tap sur le fond.
4. JS : brancher le rond occupé d'Emplacements sur la nouvelle fonction.
5. Republier, puis tester : vin avec photo, vin sans photo, lien brisé, ✕, tap sur le fond, tap photo → fiche → fermer la fiche → retour emplacements, rond libre → scan toujours intact, photo de la FICHE toujours rectangulaire.
