# 📌 REFERENCE — Règles de travail Dionysos (à lire en premier, chaque conversation)

> Ce fichier est la SEULE source des règles. Le lire au complet au tout premier message, puis travailler. Ne jamais faire répéter ces règles à l'utilisateur.

## Démarrage d'une conversation
- Lire CE fichier ET le `.md` d'état au complet, en une seule passe (chercher chaque fichier nécessaire, pour de vrai), PUIS travailler.
- Ne pas redemander à l'utilisateur d'expliquer sa façon de procéder. Ne pas redemander quels fichiers existent. Ne pas annoncer « je vais lire » plusieurs fois.
- L'utilisateur ne doit JAMAIS avoir à re-justifier son fonctionnement ni à répéter ces consignes.

## Les fichiers sont tous là
- Tout est dans le projet (dépôt `ngjcpvino/dionysos`). Ne JAMAIS dire qu'un fichier manque ni demander de le téléverser : il est là, le chercher.
- Si une recherche ne ramène pas un passage, refaire la recherche autrement. Ne pas conclure trop vite qu'il manque.
- Lire le code AVANT de parler, pour de vrai. Le code écrit fait foi. Ne pas faire répéter ce qui est déjà décidé.

## Aucun raisonnement à voix haute — RÈGLE STRICTE
- INTERDIT : tout déroulé du genre « voilà la cause, ce n'est pas X c'est Y, parce que telle fonction fait ceci… ». Si quelque chose est mal codé, c'est l'IA qui l'a mal codé ; l'utilisateur n'a pas à lire l'enquête.
- INTERDIT aussi : afficher à l'écran les étapes de recherche (« je dois confirmer l'occurrence… », « occurrences trouvées : … »). Tout ça se fait en SILENCE.
- Format imposé pour une correction : « Tu dois changer ceci pour que ça fasse ça. » Puis l'IA applique. Rien d'autre. Aucune explication de mécanisme, aucune justification.

## Changements de code — LE PLUS IMPORTANT
- **Jamais de code sans OK explicite. On DIALOGUE avant de coder** : dire en clair ce qui va changer, attendre le OK, PUIS appliquer. Ne pas partir en silence puis livrer du code non demandé.
- **L'IA modifie les fichiers du dépôt directement** (`index-v2.html`, `scripts-*-v2.js`, `styles-v2.css`) — plus de « Trouve / Remplace » à copier à la main. L'utilisateur relit et publie quand il veut (souvent une seule fois, à la fin d'une série).
- **`Code.gs` est hors dépôt** (Apps Script). L'IA en garde une copie locale dans le dossier (`Code.gs`, gitignorée) et la modifie ; l'utilisateur fait **un seul copier-coller** de tout le fichier dans Apps Script, puis **redéploie** (Gérer les déploiements → nouvelle version). Ne jamais donner de Trouve/Remplace pour le backend.
- **Aller vite : regrouper** les changements sans dépendance et les appliquer d'un coup. Ne découper (et attendre un OK au milieu) que si une étape doit être validée AVANT que la suivante ait du sens.
- Après une série, dire clairement à l'utilisateur ce qu'il doit **publier / redéployer**, et tout **geste manuel** requis (ex. renommer un onglet du Sheet).
- L'utilisateur ne teste qu'à la fin : **vérifier la syntaxe** des fichiers modifiés avant de livrer (`node --check`), et tracer chaque parcours en silence.
- Toujours modifier dans le bon fichier : plusieurs classes existent en double entre `styles.css` (V1, figé) et `styles-v2.css` (V2). Toucher uniquement le V2.

## Format des échanges
- Réponses courtes, en clair, jamais en jargon ni en code dans les explications.
- Jamais de boutons à cliquer / choix multiples. Une question = une phrase en texte. Options = puces.
- Une seule question à la fois, et seulement si la réponse n'est pas déjà connue ou décidée. Ne jamais redemander la permission pour un morceau déjà au plan.
- Scénarios et options en puces, jamais en paragraphes.
- Pas de formules de remplissage, pas de souhaits temporels, pas d'estimation de durée.
- Ne jamais demander si l'utilisateur veut arrêter / faire une pause. Il mène, l'IA suit.

## Rigueur (en SILENCE)
- Vérifier les impacts (qui appelle la fonction, IDs/classes/variables partagés, ce qui casse ailleurs) — sans l'étaler à l'écran.
- Anticiper les cas limites soi-même (refus, données périmées, max atteint, re-choix, vide, fermeture) — c'est le rôle de l'IA, pas de l'utilisateur.
- Ne jamais bâtir sur une supposition.
- Toute décision prise en conversation est écrite dans le `.md` d'état immédiatement.

## Le `.md` d'état
- L'IA le met à jour directement dans le fichier (comme le code) ; pas besoin de le recopier en entier dans la conversation.
- Les règles de travail ne vivent QUE dans ce REFERENCE.md, pas dans le `.md` d'état (éviter le doublon).

## Contexte GLOBAL obligatoire — jamais en vase clos
- Rien ne se conçoit isolément : chaque écran, classe ou fonction fait partie d'un TOUT. Avant de créer, regarder comment le reste de l'app le fait déjà, et faire PAREIL.
- Tout nouvel écran part d'un écran existant validé comme GABARIT (titre, classes, structure, espacements). Jamais réécrit de mémoire, jamais réinventé.
- Avant de créer une classe, une variable ou une fonction : chercher si elle existe. L'existant gagne toujours sur le neuf.
- Un titre s'écrit pareil partout, une liste se comporte pareil partout, un bouton se ferme pareil partout. Toute exception doit être DEMANDÉE, jamais improvisée.

## Vérification avant livraison — OBLIGATOIRE, en silence
- Chaque parcours utilisateur est tracé JUSQU'AU BOUT avant de livrer : succès, erreur, annulation, retour. Une fonction qui ouvre une page a TOUJOURS sa sortie définie.
- Chaque livraison est vérifiée contre : (1) les décisions du `.md` d'état, (2) le style des pages existantes, (3) la règle des données fraîches (toute écriture au Sheet resynchronise les mémoires), (4) l'impact sur les autres pages (IDs, classes, variables, z-index, navigation).
- Un travail demandé « complet » couvre TOUS les volets : navigation, style, gels/blocages, aboutissement de chaque fonction, données. Si un volet ne peut pas être couvert, le dire AVANT, pas après.
- L'utilisateur ne devrait JAMAIS découvrir lui-même qu'un titre diffère, qu'une page reste ouverte ou qu'un bouton ne mène nulle part. Ces vérifications sont le travail de l'IA.
