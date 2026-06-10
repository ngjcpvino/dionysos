# ⚠️ MANQUEMENTS DES CLAUDE PRÉCÉDENTS — constat (conversation du 9 juin 2026)

> Document de mémoire : ce qui a été mal fait, pour ne JAMAIS le refaire. À lire avec `REFERENCE.md`.

## 1. Audits « complets » qui ne le sont pas

- Un audit annoncé complet couvrait 2 volets (navigation/z-index + style) et OUBLIAIT : les gels de l’app et les fonctions qui n’aboutissent pas.
- L’utilisateur a dû relancer 4 fois « regarde ça aussi » pour obtenir ce qu’il avait demandé dès le départ.
- Règle tirée : « complet » = TOUS les volets (navigation, style, gels, aboutissement des fonctions, données). Si un volet ne peut être couvert, le dire AVANT.

## 2. Diagnostic mal priorisé

- Le mélange V1/V2 dans `index.html` a été présenté comme « la cause de presque tout », alors que `index-v2.html` est étanche (charge uniquement ses 3 fichiers) et que la V1 ne sert plus depuis un mois.
- C’est de la dette à nettoyer, pas la cause des bogues vécus. Les vraies causes : pas de « cacher toutes les pages », z-index plat, boutons fixed fantômes, retours incohérents.

## 3. Travail en vase clos — la plaie principale

- Chaque page bâtie isolément, sans repartir du gabarit des pages existantes : titres pas écrits pareil, pages qui ne se ressemblent pas, recommencements constants malgré des règles claires.
- Aucun écran nouveau ne devait être réinventé : copier un écran validé, point.

## 4. Règle des données fraîches DÉFORMÉE → app lente

- Décidé : ÉCRITURE → Sheet → resynchroniser la mémoire → terminé. CONSULTATION = mémoire seulement (une centaine de vins, tout devrait être instantané).
- Codé : rechargement du Sheet à chaque OUVERTURE de page (Emplacements refait `getInventoryData`, la fiche refait `getWineBottles` + `getHistorique`), en plus des resyncs après écriture.
- Conséquence : 1 à 3 secondes par appel Apps Script, spinners partout, un spinner à 4 couleurs inventé comme PANSEMENT pour masquer une attente qui ne devrait pas exister.

## 5. Navigation sans architecture

- Aucune fonction « cacher toutes les pages » : chaque `ouvrir...V2` affiche sa page sans fermer les autres → superpositions par le burger.
- Toutes les pages au même z-index 9999, menu d’action à 10010 en contradiction.
- ✕ et loupes en `position:fixed` z-index 10002 : boutons fantômes cliquables par-dessus la page visible.
- `retourAccueilV2` (chemin d’erreur) à liste fixe incomplète : Historique/Emplacements/Achat/À ranger restent ouvertes après erreur.
- Retours incohérents : Déplacer gère la provenance (À ranger/Emplacements), Arrivée/Boire/Donner non.
- `appelBackend` sans timeout : si Apps Script ne répond pas, spinner (z 99999) bloque l’écran sans issue. Piste principale des gels.

## 6. Fouillis des fichiers JS

- `scripts-scanner-v2.js` devenu fourre-tout : scan + menu d’action + saisie manuelle + vin inconnu + Arrivée + Déplacer + Boire + Donner + Cave + Emplacements + Historique + Achat + À ranger + burger. Tout sauf la fiche.
- Couplage croisé : `fermerFicheV2` (fichier fiche) manipule les conteneurs de pages du fichier scanner.
- Doublon de casse : `scripts-scanner-V2.js` (chargé par le V1) vs `scripts-scanner-v2.js` — deux fichiers distincts sur GitHub Pages, versions qui peuvent diverger.
- Fuite V2 dans V1 : `index.html` contient des blocs HTML V2 et charge 2 scripts V2.

## 7. Style — ligne directrice non respectée

- Classes mortes laissées en CSS : `.modal-v2-winename`, `.modal-v2-codebarre`, `.modal-v2-title`, `.menu-v2-grid`, `.menu-v2-circle`.
- Titre OR encore présent (menu d’action) malgré la règle « titres blancs, jamais or ». `.titre-2` (or) détournée en titre d’action via styles inline répétés ~5 fois.
- Migration à moitié faite : certaines pages au nouveau gabarit, d’autres à l’ancien.
- Classes en double entre `styles.css` (V1) et `styles-v2.css`, dont `.btn-fermer` qui DIFFÈRE entre les deux.

## 8. REFERENCE.md jamais respecté

- Le fichier existe, est à jour, dit tout — et a été ignoré : raisonnement déroulé à voix haute, fichiers redemandés alors qu’ils sont dans le dépôt, règles que l’utilisateur a dû répéter, recopiage de fichiers exigé inutilement.
- Codé sans vérifier l’existant, livré sans tracer les parcours, jamais vérifié l’uniformité avant de livrer.

## ✅ Décisions prises dans cette conversation

- Ajout à `REFERENCE.md` rédigé (sections « Contexte GLOBAL obligatoire » et « Vérification avant livraison ») — EN ATTENTE d’application par l’utilisateur.
- Principe confirmé : lecture = mémoire (`ALL_DATA`), Sheet = écritures + bouton Rafraîchir seulement.
- Découpage JS proposé (à trancher) : socle / navigation / scan / actions / pages / fiche.
- Audits à faire quand le dépôt sera synchronisé : gels (appels sans timeout, spinner bloquant) + fonctions sans aboutissement + recensement de chaque appel au Sheet qui devrait être une lecture mémoire.
- À vérifier au passage : Boire/Donner — le `.md` d’état dit à la fois « à coder selon la règle » et « ✅ conformes » ; trancher en lisant le code.