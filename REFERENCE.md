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
- Format imposé pour une correction : « Tu dois changer ceci pour que ça fasse ça. » Puis le Trouve/Remplace. Rien d'autre. Aucune explication de mécanisme, aucune justification.

## Changements de code — LE PLUS IMPORTANT
- Jamais de code sans OK explicite.
- **UN SEUL bloc Trouve/Remplace à la fois.** Jamais plusieurs blocs d'un coup, même s'ils vont ensemble. L'utilisateur doit pouvoir dire OK (fait) ou non entre chaque bloc.
- Après chaque bloc, ATTENDRE le **OK** avant le suivant. « OK » = c'est **FAIT** (déjà appliqué chez lui), pas « vas-y ». On enchaîne, l'utilisateur publie une fois à la fin.
- Le **Trouve ceci** est copié EXACTEMENT depuis le fichier (jamais reconstruit de mémoire), pour que le Rechercher de Notepad++ le trouve à tous les coups. Si le passage exact n'est pas retrouvé, le dire et demander de le coller — ne JAMAIS inventer un bloc approximatif.
- À l'intérieur d'un même bloc, couvrir TOUT ce qui change au même endroit (ne pas redécouper en micro-bouts ligne par ligne sans raison).
- **Regrouper dans UN SEUL bloc plusieurs remplacements du même fichier, proches, sans dépendance entre eux** (ex. 3 lignes à modifier dans la même fonction). Ne découper en blocs séparés que si un OK doit confirmer une étape AVANT que la suivante ait du sens. Inutile = aller-retour stupide à éviter.
- Un bloc = un OK. Mais « un bloc » peut contenir plusieurs paires Trouve/Remplace du même fichier données ensemble.
- Format : **Trouve ceci** / **Remplace par ceci** (deux blocs dans la conversation, pas d'artefact pour le code). Toujours indiquer le **nom du FICHIER** (pas la fonction).
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
- Quand on le met à jour, le sortir en ENTIER (prêt à copier), jamais en fragments — sauf une section précise demandée.
- Les règles de travail ne vivent QUE dans ce REFERENCE.md, pas dans le `.md` d'état (éviter le doublon).
