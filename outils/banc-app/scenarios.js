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
  ['recherche', ["ouvrirRechercheV2()", { saisir: ['#rechercheV2-champ', 'ch'] }, "lancerRechercheV2()", "basculerSectionRechercheV2(1)",
    { saisir: ['#rechercheV2-champ', 'syrah'] }, "lancerRechercheV2()", "fermerRechercheV2()"]],
  ['historique', ["burgerV2Click('historique')", "ouvrirFiltresV2('histoV2')", "basculerFiltreV2('histoV2', 'note')", "choisirFiltreV2('histoV2', 'note', '5 verres')",
    "reinitialiserFiltresV2('histoV2')", "fermerFiltresV2('histoV2')", "document.querySelector('#histoV2-cartes .histo-mets').click()", "choisirNoteHistoEditV2(4)",
    "sauverHistoEditV2()", "ouvrirHistoAjoutV2()", "fermerHistoAjoutV2()", "fermerHistoV2()"]],
  ['profil', ["burgerV2Click('profil')", "toucherPartProfilV2('pays', 0)", "fermerCaveV2()", "fermerProfilV2()"]],
  ['propositions', ["burgerV2Click('suggestions')", "ouvrirFiltresV2('suggestionsV2')", "fermerFiltresV2('suggestionsV2')", "document.querySelector('#suggestionsV2Container .histo-mets').click()",
    "fermerSuggestionEditV2()", "fermerSuggestionsV2()"]],
  ['liste d\'achat', ["burgerV2Click('racheter')", "choisirModeAchatV2('favoris')", "choisirModeAchatV2('suggestions')", "choisirModeAchatV2('nepasracheter')",
    "choisirModeAchatV2('achat')", "toggleAchatPromoSeulV2()", "toggleAchatPromoSeulV2()", "choisirModeAchatV2('decouvertes')", "fermerAchatV2()"]],
  ['emplacements', ["burgerV2Click('emplacements')"].concat(['doubles', 'cepmanquants', 'appmanquante', 'fammanquante', 'menage', 'plan'].map(m => "choisirModeEmpV2('" + m + "')"),
    ["ouvrirFiltresV2('empV2')", "basculerFiltreV2('empV2', 'meuble')", "choisirFiltreV2('empV2', 'meuble', 'Cellier')", "choisirModeEmpV2('cepdoubles')",
     "choisirModeEmpV2('listemeuble')", "reinitialiserFiltresV2('empV2')", "fermerEmpV2()"])],
  ['chartier, selon SAQ, Curieux Bégin, notes', ["burgerV2Click('accords')", "choisirAlimentChartierV2('Agneau')", "fermerChartierV2()",
    "burgerV2Click('selonsaq')", "fermerSelonSaqV2()", "burgerV2Click('curieuxbegin')", "choisirModeCurieuxBeginV2('horscave')", "fermerCurieuxBeginV2()",
    "burgerV2Click('notes')", "ouvrirNoteEditV2(2)", "fermerNoteEditV2()", "fermerNotesV2()"]],
  ['scan d\'un vin connu, boire', ["traiterResultatScanV2('" + UN + "')", "menuV2Click('boire')", "choisirBouteilleActionV2('boire', 1)",
    { saisir: ['#boireV2-plat', 'Agneau grillé'] }, "choisirNoteBoireV2(5)", "confirmerBoireV2()"]],
  ['scan, donner et déplacer', ["traiterResultatScanV2('" + CINQ + "')", "menuV2Click('donner')", "fermerActionBouteilleV2('donner')",
    "menuV2Click('deplacer')", "fermerDeplacerV2()", "fermerMenuActionV2()"]],
  ['scan, arrivée', ["traiterResultatScanV2('" + UN + "')", "menuV2Click('arrivee')", "basculerListePlacementV2('arriveeV2', 'meuble')",
    "choisirPlacementV2('arriveeV2', 'meuble', 'Réserve')", "fermerArriveeV2()"]],
  ['scan d\'un vin inconnu', ["traiterResultatScanV2('0036000291452')", "fermerVinInconnuV2()"]],
  ['importer des achats', ["burgerV2Click('importachats')", { saisir: ['#importAchatsV2-texte', HISTORIQUE_SAQ] }, "lireImportAchatsV2()", "importerAchatsV2()",
    "fermerImportAchatsV2()", "ouvrirFicheV2('" + UN + "', 'cave')"]],
  ['facture SAQ', ["burgerV2Click('facture')", { fichier: ['#recuV2-fichier', 'recu.png'] }, "confirmerRecuVinV2()", "passerRecuVinV2()"]]
];
