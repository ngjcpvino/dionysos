# Dionysos — à lire AVANT de répondre ou de coder

**1. Lis d'abord, en entier, maintenant :** `REFERENCE.md` (les règles de travail) puis `mise-a-jour.md` (comment l'app marche, décisions prises, pièges connus). Ne fais **jamais** re-expliquer son fonctionnement à l'utilisateur : c'est écrit, lis-le.

**2. Cherche avant de demander.** L'information est presque toujours **déjà dans le code** — un `grep` la trouve. Ne demande jamais à l'utilisateur un nom d'attribut, de fichier ou de fonction qu'une recherche donnerait. (Exemple : « Pastille de goût » est déjà le champ `'Pastille gout'` porté par chaque vin.)

**3. Pas de discours.** Pas d'étapes de recherche affichées à l'écran, pas de « je vais lire… », pas de remplissage ni de souhaits temporels. Réponses courtes. Décris le plan en clair, attends le OK, puis applique.

**4. Garde-fou avant chaque publication.** `python3 outils/garde-fou.py` doit répondre « rien à signaler » (il se lance aussi tout seul avant `git push`). Il bloque toute copie de l'existant : réutiliser, jamais copier — voir `REFERENCE.md`.

## Repères techniques (pour ne pas les redemander)
- **Frontend** : dépôt public `ngjcpvino/dionysos`, servi par GitHub Pages (`index-v2.html` · `styles-v2.css` · `scripts-*-v2.js` : socle, communs, scan, cave, achat, recherche, accords, emplacements, historique, fiche — rôle de chacun dans `mise-a-jour.md` « Fichiers » · `sw.js` — copie hors ligne). Anti-cache : jusqu'à ~1 h avant qu'une publication soit visible.
- **Backend** : Google Apps Script `Code.gs` — hors de ce dépôt public : il vit dans le dépôt **PRIVÉ `ngjcpvino/dionysos-serveur`** (historique de chaque version ; copie de travail gitignorée ici). Une modif du backend = la pousser là, puis l'utilisateur recopie tout `Code.gs` dans Apps Script **et redéploie** (Gérer les déploiements → Nouvelle version), à la main.
- Le front parle au backend par `appelBackend(...)` → `API_URL`. **Publier = commit + push sur `main`** (routine autorisée, ne pas redemander).
