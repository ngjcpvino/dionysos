# TRI DES LISTES DE BOUTEILLES — Spécification complète (validée par Chantal, 10 juillet 2026)

## But
Quand un vin a plusieurs bouteilles, la liste « Quelle bouteille ? » (Déplacer, Boire, Donner) doit être **triée : meuble (alphabétique) → rangée (numérique) → espace (numérique), « À ranger » à la fin** — exactement comme l'inventaire de la fiche V2.

Décision **validée par Chantal** — ne rien re-demander, coder tel quel.

---

## Constat (vérifié dans les vrais fichiers — `scripts-scanner-v2.js`)

Trois listes affichent les bouteilles SANS tri (ordre brut du Sheet, bouteilles 1 à 5) :

1. **Déplacer** — `construireDeplacerV2()` : `bottles.map(function(b) { ... choisirBouteilleDeplacer ... })` → `#deplacerV2-bouteille-menu`.
2. **Boire** — `construireBoireV2()` : `actives.map(function(b) { ... choisirBouteilleBoireV2 ... })` → `#boireV2-bouteille-menu`.
3. **Donner** — `construireDonnerV2()` : `actives.map(function(b) { ... choisirBouteilleDonnerV2 ... })` → `#donnerV2-bouteille-menu`.

Les trois utilisent déjà `empBouteilleV2(b)` ou l'équivalent inline pour le libellé (`meuble-rangee-espace` ou « À ranger »).

**Le modèle de tri existe déjà** dans `afficherFicheV2` (`scripts-fiche-v2.js`), bloc Inventaire :
```
emplacements.sort(function(a, b) {
  if (a.range !== b.range) return a.range ? -1 : 1;      // rangées d'abord, À ranger à la fin
  if (a.meuble !== b.meuble) return a.meuble.localeCompare(b.meuble);
  if (a.rangee !== b.rangee) return a.rangee - b.rangee;  // numérique (parseInt fait au map)
  return a.espace - b.espace;                              // numérique
});
```

---

## Spécification

### Règle de tri (validée)
1. Bouteilles **rangées d'abord**, « À ranger » **à la fin** (cohérent avec la fiche).
2. Meuble : alphabétique (`localeCompare`).
3. Rangée : **numérique** (`parseInt`, repli 0).
4. Espace : **numérique** (`parseInt`, repli 0).

### Réutilisation (règle 1.5 — réduire le code)
Créer **UNE fonction utilitaire partagée** dans `scripts-scanner-v2.js` (à côté de `bottlesActivesV2` / `empBouteilleV2`), nom suggéré `trierBouteillesV2(bottles)` :
- Retourne une **copie triée** (ne pas muter le tableau du contexte `menuActionV2Context.wineResult.bottles`).
- Comparateur identique au modèle de la fiche (rangée/espace via `parseInt(...) || 0` ; « rangée » = `meuble && rangee && espace` tous non vides).
- L'appliquer aux trois listes : dans `construireDeplacerV2`, `construireBoireV2`, `construireDonnerV2`, trier juste avant le `.map(...)`.

**Facultatif mais souhaitable (au jugé du codeur, avec l'accord de Chantal au moment du trouve-et-remplace)** : remplacer aussi le comparateur inline de la fiche par un appel à `trierBouteillesV2` — MAIS attention, la fiche trie des objets `{range, texte, meuble, rangee, espace}` déjà transformés, pas des bouteilles brutes. Si l'unification complique, laisser la fiche telle quelle : l'objectif est de réduire le code, pas de créer une gymnastique.

### Aucune autre logique ne change
- Le `onclick` de chaque item garde le même `row`/`bottle` — le tri ne change QUE l'ordre d'affichage.
- Le cas « 1 seule bouteille » (pas de liste) reste intact.
- Aucun `id` renommé, aucun changement backend, aucun changement CSS.

---

## Règles de méthode (METHODE.md)
1. **Trouve-et-remplace uniquement, UN à la fois**, texte exact (indentation comprise), attendre le « ok » de Chantal entre chaque.
2. **Preuve de vérification** (Vérifié / Impacts) avant chaque proposition.
3. Réponses **courtes**, zéro jargon, **une question à la fois**.
4. **Publication** : seulement du JS → **republier le site** (pas de déploiement Apps Script).

## Ordre de construction suggéré
1. Ajouter `trierBouteillesV2` (utilitaire).
2. Brancher dans Déplacer, puis Boire, puis Donner (3 trouve-et-remplace, un « ok » entre chaque).
3. Rappeler à Chantal de republier le site, puis tester avec un vin à 3+ bouteilles dans des meubles différents et une « À ranger » : l'ordre doit être meuble → rangée → espace, « À ranger » en dernier, dans les trois pages.
