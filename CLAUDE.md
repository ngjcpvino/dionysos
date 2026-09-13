# Dionysos — à lire AVANT de répondre ou de coder

**1. Lis d'abord, en entier, maintenant :** `REFERENCE.md` (les règles de travail) puis `mise-a-jour.md` (comment l'app marche, décisions prises, pièges connus). Ne fais **jamais** re-expliquer son fonctionnement à l'utilisateur : c'est écrit, lis-le.

**2. Cherche avant de demander.** L'information est presque toujours **déjà dans le code** — un `grep` la trouve. Ne demande jamais à l'utilisateur un nom d'attribut, de fichier ou de fonction qu'une recherche donnerait. (Exemple : « Pastille de goût » est déjà le champ `'Pastille gout'` porté par chaque vin.)

**3. Pas de discours.** Pas d'étapes de recherche affichées à l'écran, pas de « je vais lire… », pas de remplissage ni de souhaits temporels. Réponses courtes. Décris le plan en clair, attends le OK, puis applique.

## Repères techniques (pour ne pas les redemander)
- **Frontend** : dépôt public `ngjcpvino/dionysos`, servi par GitHub Pages (`index-v2.html` · `styles-v2.css` · `scripts-socle-v2.js` · `scripts-scanner-v2.js` · `scripts-fiche-v2.js`). Anti-cache : jusqu'à ~1 h avant qu'une publication soit visible.
- **Backend** : Google Apps Script `Code.gs` — **HORS dépôt** (copie locale dans le dossier). Une modif du backend = recopier tout `Code.gs` dans Apps Script **et redéployer** (Gérer les déploiements → Nouvelle version), à la main.
- Le front parle au backend par `appelBackend(...)` → `API_URL`. **Publier = commit + push sur `main`** (routine autorisée, ne pas redemander).
