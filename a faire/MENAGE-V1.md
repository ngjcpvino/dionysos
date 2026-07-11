# MÉNAGE V1 → V2 — Spécification complète (validée par Chantal, 10 juillet 2026)

## But
Le V2 est maintenant le site voulu. On supprime le V1 et le V2 devient LE site — exactement le plan déjà écrit dans le `.md` d'état : « **Ménage final = renommage, pas de tri.** Quand V2 complet : supprimer tous les fichiers V1 d'un bloc, renommer `index-v2.html` → `index.html`, `styles-v2.css` → `styles.css`. »

Décision **validée par Chantal** — ne rien re-demander.

⚠️ **À faire AVANT la sécurité** (voir `SECURITE-API.md`) : on sécurise les fichiers finaux, pas les deux versions.

---

## Contexte (vérifié dans le `.md` d'état et le dépôt `ngjcpvino/dionysos`)

- **V1 (figé)** : `index.html`, `styles.css`, tous les `scripts-*.js` SANS suffixe `-v2` (`scripts-fiche.js`, `scripts-inventaire.js`, `scripts-listes.js`, etc. — lister depuis le dépôt, ne pas se fier à la mémoire).
- **V2** : `index-v2.html`, `styles-v2.css`, `scripts-socle-v2.js`, `scripts-scanner-v2.js`, `scripts-fiche-v2.js` (+ tout autre `-v2.js` présent).
- **`index-v2.html` charge ses JS par `document.write`** avec anti-cache `?v=` (heure courante) — les NOMS de fichiers y sont en clair : `['scripts-socle-v2.js', 'scripts-scanner-v2.js', 'scripts-fiche-v2.js']`.
- **Backend commun** : `Code.gs` sert V1 et V2 — il reste tel quel (les fonctions appelées seulement par le V1 peuvent rester ; leur tri est un chantier séparé, non demandé).
- **GitHub Pages** sert le dépôt : `index.html` est la page d'accueil — c'est pour ça que le renommage suffit à faire du V2 le site officiel.
- Le `.md` d'état note aussi : le V1 est déjà « nettoyé » (aucune trace de V2 dedans) — la suppression est donc sans risque croisé.

---

## Étapes (dans cet ordre)

### 1. Inventaire réel
Lister les fichiers du dépôt et classer : V1 à supprimer / V2 à renommer / communs à garder (`Code.gs`, `appsscript.json`, images, `.md`). Montrer la liste à Chantal pour un OK AVANT toute suppression (c'est le seul point de validation nécessaire — le reste est déjà décidé).

### 2. Suppression du V1 (d'un bloc)
Supprimer : `index.html` (V1), `styles.css` (V1), tous les `scripts-*.js` V1 (sans `-v2`). Rien d'autre.

### 3. Renommages
- `index-v2.html` → `index.html`
- `styles-v2.css` → `styles.css`
- **Décision à faire trancher par Chantal en une question** : renommer aussi les JS (`scripts-socle-v2.js` → `scripts-socle.js`, etc.) ou garder les noms `-v2`. Recommandation : **garder les noms `-v2` des JS** (zéro risque, aucun contenu à modifier sauf les deux points ci-dessous) — mais c'est elle qui tranche.

### 4. Références internes à corriger (selon le choix de l'étape 3)
Dans le nouveau `index.html` (ex `index-v2.html`) :
- La ligne `<link ... styles-v2.css ...>` (ou équivalent `document.write` CSS) → `styles.css`.
- Le tableau du `document.write` des JS → noms finaux choisis.
Vérifier aussi qu'aucun JS V2 ne référence `index-v2.html` ou `styles-v2.css` par son nom (recherche dans les fichiers, pas de mémoire).

### 5. Vérifications finales
- Aucune référence restante aux fichiers supprimés (recherche globale : `scripts-fiche.js`, `styles.css` version V1 déjà remplacée, etc.).
- `Code.gs` : RIEN à changer (backend commun conservé intégralement).
- L'anti-cache `?v=` continue de fonctionner tel quel.

### 6. `.md` d'état
Mettre à jour : stratégie « deux sites parallèles » → terminée ; nouveaux noms de fichiers partout ; sortir le `.md` d'état EN ENTIER (règle du projet).

### 7. Publication et test
Republier le site (GitHub Pages). Tester le parcours complet : accueil, scan, fiche, cave, emplacements, boire, historique, liste d'achat, promos, recherche. ⚠️ L'ancienne adresse du V2 (`.../index-v2.html`) meurt — dire à Chantal de refaire son raccourci d'écran d'accueil si celui-ci pointait sur `index-v2.html`.

---

## Ce qui est HORS périmètre (ne pas faire)
- Trier/supprimer les fonctions V1 dans `Code.gs` (chantier séparé, non demandé).
- Le découpage des JS en modules (noté « en suspens » au `.md` d'état — pas maintenant).
- La déduplication des panneaux de filtres (idem).

## Règles de méthode
Le codeur suit `REFERENCE.md` du dépôt. Les suppressions/renommages sont des opérations de dépôt (pas des Trouve/Remplace) : les présenter clairement, un OK avant d'agir ; les corrections de références internes, elles, suivent la règle Trouve/Remplace habituelle.
