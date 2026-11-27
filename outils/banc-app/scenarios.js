// Les gestes rejoués par le banc d'essai de l'app : chaque scénario part de l'app fraîchement ouverte (un faux classeur neuf).
// Une étape = du JS joué dans la page (les fonctions de l'app, comme un tap), ou { saisir: [sélecteur, texte] },
// { fichier: [sélecteur, chemin] }. Après chaque étape : une photo de l'écran, les appels au serveur, les erreurs.
// Les vins du faux classeur (dionysos-serveur/outils/banc/monde.js) : Château Un 0061872600004 (2 bouteilles), Blanc Deux
// 0778810000012 (à ranger, « ne pas racheter »), Plein Cinq 0099999999993 (5 bouteilles), Huit 0777777777774, Proposé Six (proposition)…
const UN = '0061872600004', DEUX = '0778810000012', CINQ = '0099999999993';
const HISTORIQUE_SAQ = ['1 octobre 2026', 'SAQ Laval', 'Château Un', 'Vin rouge | 750 ml | France', 'Nouveau Vin', 'Vin rosé | 750 ml | France',
  '15 septembre 2026', 'SAQ Joliette', 'Blanc Deux', 'Vin blanc | 750 ml | France', 'Whisky Sept', 'Whisky | 700 ml | Écosse'].join('\n');

module.exports = [
  ['accueil et menu', ["toggleMenuV2()", "toggleMenuV2()"]],
  ['cave et filtres', ["burgerV2Click('cave')", "ouvrirFiltresV2('caveV2')", "basculerFiltreV2('caveV2', 'couleur')", "choisirFiltreV2('caveV2', 'couleur', 'Rouge')",
    "choisirFiltreV2('caveV2', 'couleur', 'Rouge')", "choisirFiltreV2('caveV2', 'couleur', 'Rouge')", "basculerFiltreV2('caveV2', 'pays')",
    "choisirFiltreV2('caveV2', 'pays', 'France')", "fermerFiltresV2('caveV2')", "basculerInterrupteurV2('caveV2', 'dispo')", "fermerCaveV2()"]],
  ['à ranger et sans cépage', ["burgerV2Click('aranger')", "fermerARangerV2()", "burgerV2Click('sanscepage')", "fermerSansCepageV2()"]],
  ['fiche', ["burgerV2Click('cave')", "ouvrirFicheV2('" + UN + "', 'cave')", "basculerVoletsV2('ficheV2-selon-', 'som')", "basculerVoletsV2('ficheV2-selon-', 'cb')",
    "basculerVoletsV2('ficheV2-selon-', 'chartier')", "basculerVoletsV2('ficheV2-selon-', 'saq')", "toggleFavoriV2()", "ouvrirEditFicheV2()", "fermerEditFicheV2()",
    "fermerFicheV2()", "ouvrirFicheV2('" + DEUX + "', 'cave')", "fermerFicheV2()"]],
  // Les montants et les messages (27 nov. 2026, règles communes) : un prix tapé « 1.234,56 » est refusé (rien d'écrit), « 27,5 »
  // s'écrit 27,50 $ (avant : tronqué à 27) ; le rond du message se ferme quand on le touche (un vrai toucher au centre de
  // l'écran, le crayon ouvert : il n'y était pas sensible) ; un message d'erreur est gardé au journal des erreurs.
  ['prix et messages', ["burgerV2Click('cave')", "ouvrirFicheV2('" + UN + "', 'cave')", "ouvrirEditFicheV2()",
    { saisir: ['#editV2-prix', '1.234,56'] }, "sauverEditFicheV2()",
    "afficherMessage('Touchez-moi'); var t = document.getElementById('toast'), r = t.getBoundingClientRect(); document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).click(); if (t.classList.contains('show')) throw new Error('le message ne se ferme pas au toucher')",
    { saisir: ['#editV2-prix', '27,5'] }, "sauverEditFicheV2()", "signalerErreurV2(new Error('panne simulée'))", "fermerFicheV2()", "fermerCaveV2()"]],
  // Restauration des données (27 nov. 2026) : Outils, la liste déroulante des copies, une copie choisie, la confirmation (le ✕ y
  // revient), puis « Restaurer » touché deux fois (une seule restauration) ; l'app se recharge, la copie d'avant est dans la liste
  ['restauration des données', ["toggleMenuV2()", "basculerSousMenuV2('burgerV2-outils')", "burgerV2Click('restauration')", "basculerListeRestaurationV2()",
    "choisirCopieRestaurationV2(1)", "ouvrirConfirmationRestaurationV2()", "fermerConfirmationRestaurationV2()", "ouvrirConfirmationRestaurationV2()",
    "confirmerRestaurationV2(); confirmerRestaurationV2()", "burgerV2Click('restauration')", "basculerListeRestaurationV2()"]],
  // Le rechargement après une restauration (ou « Données ») arrive même si la mise à jour de la copie hors ligne reste prise
  // (27 nov. 2026, sur l'iPad : l'app restait sur les anciennes données) : la page se recharge et relit le serveur (à l'étape « 0 »)
  ['rechargement qui ne reste jamais pris', ["navigator.serviceWorker.getRegistration = function() { return new Promise(function() {}); }; mettreAJourAppV2()", "0"]],
  // Retirer une bouteille, supprimer un vin (21 nov. 2026) : dans le crayon de la fiche, toujours une confirmation. Château Un
  // (bu : pas de « Supprimer ce vin ») : une bouteille retirée, entrée en trop (l'achat du 1er sept. baisse) ; Proposé Six
  // (jamais bu ni donné) : supprimé depuis la Cave, retour à la Cave sans lui.
  ['retirer une bouteille, supprimer un vin', ["burgerV2Click('cave')", "ouvrirFicheV2('" + UN + "', 'cave')", "ouvrirEditFicheV2()",
    "document.querySelector('#editFicheV2-bouteilles .item-liste').click()", "basculerEnTropRetraitV2()", "fermerRetraitV2()",
    "document.querySelector('#editFicheV2-bouteilles .item-liste').click()", "basculerEnTropRetraitV2()", "confirmerRetraitV2()",
    "fermerEditFicheV2()", "fermerFicheV2()", "basculerInterrupteurV2('caveV2', 'dispo')", "ouvrirFicheV2('0555555555555', 'cave')", "ouvrirEditFicheV2()",
    "ouvrirRetraitV2()", "confirmerRetraitV2()"]],
  // Donner (21 nov. 2026) : la bouteille sort et l'Historique l'inscrit « Donné » ; le filtre « Bu ou donné », puis la fiche
  ['donner, puis l\'historique', ["traiterResultatScanV2('" + CINQ + "')", "menuV2Click('donner')", "choisirBouteilleActionV2('donner', 1)", "confirmerDonnerV2()",
    "burgerV2Click('historique')", "ouvrirFiltresV2('histoV2')", "basculerFiltreV2('histoV2', 'sortie')", "choisirFiltreV2('histoV2', 'sortie', 'Donné')",
    "fermerFiltresV2('histoV2')", "ouvrirFicheV2('" + CINQ + "', 'histo')"]],
  ['recherche', ["ouvrirRechercheV2()", { saisir: ['#rechercheV2-champ', 'ch'] }, "lancerRechercheV2()", "basculerSectionRechercheV2(1)",
    { saisir: ['#rechercheV2-champ', 'syrah'] }, "lancerRechercheV2()", "fermerRechercheV2()"]],
  ['historique', ["burgerV2Click('historique')", "ouvrirFiltresV2('histoV2')", "basculerFiltreV2('histoV2', 'note')", "choisirFiltreV2('histoV2', 'note', '5 verres')",
    "reinitialiserFiltresV2('histoV2')", "fermerFiltresV2('histoV2')", "document.querySelector('#histoV2-cartes .histo-mets').click()", "choisirNoteHistoEditV2(4)",
    "sauverHistoEditV2()", "document.querySelector('#histoV2-cartes .histo-mets').click()", "annulerHistoEditV2()",
    "ouvrirHistoAjoutV2()", "fermerHistoAjoutV2()", "fermerHistoV2()"]],
  ['profil', ["burgerV2Click('profil')", "toucherPartProfilV2('pays', 0)", "fermerCaveV2()", "fermerProfilV2()"]],
  ['propositions', ["burgerV2Click('suggestions')", "ouvrirFiltresV2('suggestionsV2')", "fermerFiltresV2('suggestionsV2')", "document.querySelector('#suggestionsV2Container .histo-mets').click()",
    "fermerSuggestionEditV2()", "fermerSuggestionsV2()"]],
  ['liste d\'achat', ["burgerV2Click('racheter')", "choisirModeAchatV2('favoris')", "choisirModeAchatV2('suggestions')", "choisirModeAchatV2('nepasracheter')",
    "choisirModeAchatV2('achat')", "toggleAchatPromoSeulV2()", "toggleAchatPromoSeulV2()", "choisirModeAchatV2('decouvertes')", "fermerAchatV2()"]],
  ['emplacements', ["burgerV2Click('emplacements')"].concat(['fammanquante', 'menage', 'plan'].map(m => "choisirModeEmpV2('" + m + "')"),
    ["ouvrirFiltresV2('empV2')", "basculerFiltreV2('empV2', 'meuble')", "choisirFiltreV2('empV2', 'meuble', 'Cellier')", "choisirModeEmpV2('fammanquante')",
     "choisirModeEmpV2('listemeuble')", "reinitialiserFiltresV2('empV2')", "fermerEmpV2()"])],
  // Deux aliments et le meuble (6 nov. 2026) : le faux classeur n'a que Syrah-Agneau et Chardonnay-Crabe — on en pose d'autres, en mémoire seulement
  ['chartier, selon SAQ, Curieux Bégin, notes', ["burgerV2Click('accords')", "choisirAlimentChartierV2('Agneau')",
    "ALL_ACCORDS.push({ cepage: 'Syrah', aliment: 'Romarin', nuance: 'du Rhône' }, { cepage: 'Grenache', aliment: 'Romarin', nuance: '' }, { cepage: 'Grenache', aliment: 'Ail', nuance: '' }); choisirAlimentChartierV2('Romarin')",
    "basculerAutresChartierV2(1)", "choisirAlimentChartierV2('Ail', 'Romarin')", "ouvrirFiltresV2('chartierV2')", "basculerFiltreV2('chartierV2', 'meuble')",
    "choisirFiltreV2('chartierV2', 'meuble', 'Cellier')", "choisirAlimentChartierV2('Romarin')", "reinitialiserFiltresV2('chartierV2')", "fermerChartierV2()",
    "burgerV2Click('selonsaq')", "fermerSelonSaqV2()", "burgerV2Click('curieuxbegin')", "choisirModeCurieuxBeginV2('horscave')", "fermerCurieuxBeginV2()",
    "burgerV2Click('notes')", "ouvrirNoteEditV2(2)", "fermerNoteEditV2()", "fermerNotesV2()"]],
  ['scan d\'un vin connu, boire', ["traiterResultatScanV2('" + UN + "')", "menuV2Click('boire')", "choisirBouteilleActionV2('boire', 1)",
    { saisir: ['#boireV2-plat', 'Agneau grillé'] }, "choisirNoteBoireV2(5)", "confirmerBoireV2()"]],
  // Le remplaçant (3 nov. 2026) : le faux classeur n'a pas de rouge au cellier ni au Pigeonnier rouge — on en pose un, en mémoire seulement
  ['remplaçant après Boire', ["ALL_DATA.push({ row: 90, bottle: 1, 'Code-barres': '0900000000002', Nom: 'Malbec du Pigeonnier', Couleur: 'Rouge', Cepage: 'Malbec', Appellation: 'Cahors', Meuble: 'Pigeonnier', Rangee: '5', Espace: '2', Statut: 'En stock', Racheter: 'Oui' }); proposerRemplacantV2({ meuble: 'Cellier', rangee: '4', espace: '2' })",
    "document.querySelector('#remplacantV2-carte .carte').click()", "fermerFicheV2()", "fermerRemplacantV2()"]],
  ['scan, donner et déplacer', ["traiterResultatScanV2('" + CINQ + "')", "menuV2Click('donner')", "fermerActionBouteilleV2('donner')",
    "menuV2Click('deplacer')", "fermerDeplacerV2()", "fermerMenuActionV2()"]],
  ['scan, arrivée', ["traiterResultatScanV2('" + UN + "')", "menuV2Click('arrivee')", "basculerListePlacementV2('arriveeV2', 'meuble')",
    "choisirPlacementV2('arriveeV2', 'meuble', 'Réserve')", "fermerArriveeV2()"]],
  ['scan d\'un vin inconnu', ["traiterResultatScanV2('0036000291452')", "fermerVinInconnuV2()"]],
  ['Tri : doublons puis tournée', ["burgerV2Click('emplacements')", "choisirModeEmpV2('menage')", "document.querySelector('#empV2-cartes .coche-panier') && document.querySelector('#empV2-cartes .coche-panier').click()",
    "document.querySelector('#empV2-cartes .roundel').click()"].concat(new Array(8).fill("document.querySelector('#empV2-cartes .roundel') && document.querySelector('#empV2-cartes .roundel').click()"))],
  ['hors tri : arrivée et déplacer', ["traiterResultatScanV2('" + UN + "')", "menuV2Click('arrivee')", "arriveeARangerV2(true)", "burgerV2Click('aranger')", "fermerARangerV2()",
    "traiterResultatScanV2('" + CINQ + "')", "menuV2Click('deplacer')", "document.querySelector('#deplacerV2-bouteille-menu .item-liste').click()", "deplacerARangerV2(true)"]],
  ['importer des achats', ["burgerV2Click('importachats')", { saisir: ['#importAchatsV2-texte', HISTORIQUE_SAQ] }, "lireImportAchatsV2()", "importerAchatsV2()",
    "fermerImportAchatsV2()", "ouvrirFicheV2('" + UN + "', 'cave')"]],
  ['facture SAQ', ["burgerV2Click('facture')", { fichier: ['#recuV2-fichier', 'recu.png'] }, "confirmerRecuVinV2()", "passerRecuVinV2()", "fermerRecuV2()"]],
  // Le Mode d'emploi (5 nov. 2026) : chaque étape de chaque visite (12 « › » par visite : au-delà de sa dernière étape, elle est finie
  // et « › » ne fait plus rien), puis une question, et la sortie au milieu d'une visite. Rien ne doit partir au serveur en écriture.
  ['mode d\'emploi et visites', ["burgerV2Click('modeemploi')", "basculerVoletsV2('modeEmploiV2-', 'visites')"].concat(
    [0, 1, 2, 3, 4, 5, 6].reduce((l, v) => l.concat(["lancerVisiteV2(" + v + ", 0)"], new Array(12).fill("avancerVisiteV2(1)")), []),
    ["basculerVoletsV2('modeEmploiV2-', 'questions')", "document.querySelectorAll('#modeEmploiV2-questions .item-liste')[3].click()",
     "avancerVisiteV2(-1)", "quitterVisiteV2()", "fermerModeEmploiV2()"])],
  // Hors ligne (12 nov. 2026) : le cadre de l'accueil, la bande du bas sur une page et sur le menu, puis le retour du réseau ;
  // ensuite (15 nov. 2026) un seul raté — le réseau revient avant le 2e essai, 5 s plus tard : pas de bande ; puis la vraie perte
  // du réseau en cours de route (le téléphone l'annonce, le 2e essai rate : la bande) et son retour (resynchronisation tout de suite)
  ['hors ligne', ["afficherHorsLigneV2(Date.now() - 600000)", "burgerV2Click('cave')", "cacherToutesPagesV2(); toggleMenuV2()",
    "toggleMenuV2(); document.getElementById('accueilV2-horsligne').style.display = 'none'; burgerV2Click('cave')",
    "cacherToutesPagesV2(); window.fetchVrai = window.fetch; window.fetch = function() { return Promise.reject(new TypeError('Load failed')); }; verifierReseauV2()",
    "window.fetch = window.fetchVrai", "burgerV2Click('cave')",
    "cacherToutesPagesV2(); window.fetch = function() { return Promise.reject(new TypeError('Load failed')); }; window.dispatchEvent(new Event('offline'))",
    "burgerV2Click('cave')", "window.fetch = window.fetchVrai; window.dispatchEvent(new Event('online'))"]]
];
