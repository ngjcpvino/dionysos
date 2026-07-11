# SÉCURITÉ — MOT DE PASSE D'APP — Spécification complète (validée par Chantal, 10 juillet 2026)

## But
Aujourd'hui, le déploiement Apps Script est ouvert à tous (`appsscript.json` : `"access": "ANYONE_ANONYMOUS"`) et l'adresse de l'API est visible dans le dépôt GitHub **public**. N'importe qui peut donc lire ET modifier le Sheet via l'API. On ajoute un **mot de passe d'app** : chaque appel doit le fournir, sinon le serveur refuse.

Arbre des cas **entièrement validé par Chantal** — ne rien re-demander, coder tel quel.

⚠️ **À faire APRÈS le ménage V1→V2** (voir `MENAGE-V1.md`) : la sécurité ne se code qu'une fois sur les fichiers finaux, pas en double V1/V2.

---

## Contexte technique (vérifié dans les vrais fichiers)

- **Déploiement** : `appsscript.json` → `"executeAs": "USER_DEPLOYING"`, `"access": "ANYONE_ANONYMOUS"`. **On NE CHANGE PAS ces réglages** : le front (GitHub Pages) appelle l'API par fetch anonyme, c'est nécessaire. La protection = le mot de passe applicatif.
- **Front** : `scripts-socle-v2.js` contient `API_URL` et `appelBackend(fonction, params, options)` — **TOUT** passe par `appelBackend` (timeout, spinner, erreurs). C'est LE point unique côté front.
- **Backend** : `Code.gs` — trouver le point d'entrée qui reçoit les appels du front (doGet/doPost qui aiguille vers les fonctions comme `getInventoryData`, `updateWineField`, etc.). C'est LE point unique côté serveur. Les Script Properties sont déjà utilisées (`SPREADSHEET_ID` y est) — même mécanisme pour le mot de passe.
- **2 utilisateurs, 2 téléphones** (iPhone/iPad, app via Safari/écran d'accueil).
- Le **Sheet lui-même** reste privé aux comptes Google des deux utilisateurs — rien à changer là.

---

## Spécification — BACKEND (`Code.gs`)

1. **Stocker le mot de passe** dans les Script Properties (clé suggérée : `APP_SECRET`). Fournir une petite fonction utilitaire à exécuter UNE fois depuis l'éditeur Apps Script pour le poser (ou expliquer à Chantal comment le poser à la main dans Paramètres du projet → Propriétés du script). **Le mot de passe n'apparaît JAMAIS dans le code.**
2. **Vérification au point d'entrée unique** : dès réception d'un appel, comparer le mot de passe reçu (paramètre, ex. `secret`) à `APP_SECRET`.
   - Absent ou faux → répondre `{ success:false, error:'ACCES_REFUSE' }` et **rien d'autre** (aucune donnée, aucun indice). Cas 3.4 validé.
   - Bon → traiter normalement.
3. La vérification couvre **TOUTES** les fonctions (lecture comprise) — un seul contrôle au point d'entrée, PAS une vérification par fonction (règle 1.5 : réduire le code).
4. **V1 (ancien site)** : sera bloqué aussi — **validé et voulu** (le V1 disparaît au ménage de toute façon).

## Spécification — FRONT (`scripts-socle-v2.js`)

1. **Stockage local** : le mot de passe vit dans `localStorage` du téléphone (clé suggérée : `vinoSecret`). Jamais dans le code, jamais dans le dépôt.
2. **Demande au premier lancement** (cas 1.1) : si `localStorage` n'a pas le mot de passe, l'app le demande UNE fois (petit écran sobre dans le style V2 : champ + roundel Confirmer — réutiliser `champ-saisie`/`.roundel`), le range, puis continue le démarrage normal (`getConfig` + `getInventoryData`).
3. **Chaque appel** : `appelBackend` ajoute automatiquement le mot de passe aux paramètres — UN seul endroit à modifier, aucune des dizaines de fonctions appelantes ne change.
4. **Mauvais mot de passe** (cas 3.1) : si le serveur répond `ACCES_REFUSE`, effacer le mot de passe local, afficher « Mot de passe incorrect » et redemander. Couvre aussi le changement de mot de passe côté serveur (cas 3.3) : les 2 téléphones le redemandent au prochain appel.
5. **Mot de passe effacé du téléphone** (ménage navigateur, cas 3.2) : couvert par le point 2 — l'app le redemande, une fois.

## Nettoyage du dépôt public (branche 2 validée)

1. **Retirer l'ID du Sheet** du `.md` d'état du dépôt (il y est écrit en clair). Le remplacer par « (dans les Script Properties) ».
2. `API_URL` **reste** dans le code (nécessaire au site) — c'est le mot de passe qui la rend inoffensive.
3. Vérifier qu'aucun autre secret ne traîne dans le dépôt (clés, IDs sensibles, mots de passe) — balayage rapide des fichiers.
4. **Dire à Chantal** : GitHub garde l'historique — ce qui est retiré reste lisible dans les anciennes versions. C'est accepté : la vraie protection est le mot de passe. (Ne PAS proposer de réécrire l'historique — hors périmètre.)

---

## Choix du mot de passe
Chantal choisit le mot de passe elle-même (le codeur ne l'invente pas et ne l'écrit nulle part). Lui rappeler : le poser dans les Script Properties, puis le taper une fois sur chaque téléphone.

## Publication et mise en route (ordre CRITIQUE — éviter de se bloquer soi-même)
1. Coder le front (demande + envoi du mot de passe) ET le backend (vérification), MAIS…
2. **Publier le front D'ABORD** (le backend accepte encore tout) → les téléphones commencent à envoyer le mot de passe.
3. Poser `APP_SECRET` dans les Script Properties.
4. **Publier le backend ensuite** (nouveau déploiement Apps Script) → la vérification s'active.
5. Tester : appel normal (OK), navigation privée sans mot de passe (refus + redemande), mauvais mot de passe (message + redemande).
⚠️ Prévenir Chantal de **ne pas tester entre les publications** et que le V1 cessera de fonctionner à l'étape 4 (voulu).

## Règles de méthode
Le codeur suit `REFERENCE.md` du dépôt (règles de travail : UNE paire Trouve/Remplace par message, OK entre chaque, aucun raisonnement à voix haute, etc.). Réutiliser l'existant, ne renommer aucun `id`, mettre à jour le `.md` d'état à la fin.
