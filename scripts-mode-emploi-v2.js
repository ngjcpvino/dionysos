/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-MODE-EMPLOI-V2.JS
   Le Mode d'emploi (menu, 5 nov. 2026, l'utilisateur) : la présentation (le laïus « comme sur l'App Store »),
   les visites guidées, les questions (« Je veux… » → la visite part de l'étape qui y répond).
   Une visite montre les VRAIS écrans de l'app, avec les vrais vins : ce dont on parle s'allume en or (.visite-cible),
   une bulle l'explique. Rien ne s'enregistre pendant une visite : un voile (.visite) couvre l'app, seule la bulle
   répond au doigt ; la caméra ne s'allume jamais.
============================================================ */

// ==================== LA PRÉSENTATION ====================
var PRESENTATION_V2 = {
  titre: "Ta cave, ton goût, ta SAQ",
  accroche: [
    "Tu es dans une allée de la SAQ, une bouteille à la main : « Est-ce que j'en ai déjà ? » Scanne-la. Dionysos te répond avant que tu aies fini de te poser la question.",
    "Ta cave n'a jamais été aussi bien entourée."
  ],
  blocs: [
    ["📷 À la SAQ, tout se voit d'un coup d'œil", "Scanne une bouteille. Tu sais si tu l'as déjà, combien tu en as et où elle dort. Tu vois aussi ce que les sommeliers en ont dit, si Curieux Bégin l'a proposée et quels autres vins de la même appellation tu as. Il fait sombre ? La lampe s'allume. Pas de réseau entre les murs de béton ? Dionysos a déjà la succursale en mémoire."],
    ["🛒 Une liste d'achat qui fait ses devoirs", "Elle a cinq listes : à racheter, favoris, propositions, découvertes en promo, et à ne jamais racheter. Elle montre les prix, les promos, les points bonis et ce qui est disponible dans ta succursale. Elle te donne même le chemin dans Plans vers celle qui a le vin."],
    ["🧾 Prends ta facture en photo, et c'est rentré", "Dionysos lit la facture et tu valides chaque vin. Si l'un d'eux est passé chez Curieux Bégin, il crie « Bingo ! » et te montre la recette."],
    ["🧹 Le Tri Dionysos : ton cellier, optimisé", "Le but : le plus de cépages possible par meuble, puis le plus d'appellations. Dionysos calcule la tournée, étape par étape, et te dit dans quelle case de la boîte va chaque bouteille. Toi, tu les portes. À la fin : « Les emplacements sont maximisés. » Satisfaction garantie."],
    ["🍽️ « Qu'est-ce que je sers avec ça ? » Quatre réponses", "Selon Chartier, par cépage. Selon la SAQ, par ingrédient et par recette. Selon Curieux Bégin, saison par saison. Selon Nos notes, ces phrases qu'on entend une fois puis qu'on oublie (« asperge et crabe appellent un chablis »). Avec Dionysos, tu ne les oublies plus."],
    ["🥂 Chaque bouteille a une mémoire", "Avec quel plat tu l'as bue, combien de verres elle méritait, combien de fois tu l'as achetée. Une place se libère au cellier ? Dionysos te propose déjà le vin du Pigeonnier à monter."],
    ["📊 Ton profil en tartes dorées", "Tes pays, tes couleurs, tes pastilles de goût et tes cépages. Touche une part et la cave s'ouvre sur ses vins."],
    ["🔒 Ta cave t'appartient", "Pas d'abonnement, pas de pub. Tes vins vivent dans ton propre classeur Google, protégé par ton mot de passe."],
    ["Nouveautés, version 1.0", "Un nouveau lecteur de codes-barres qui lit même dans la pénombre (60 étiquettes sur 60 aux essais).<br>Une lampe pour les celliers sombres.<br>Le Tri en une seule tournée.<br>Le scan marche hors ligne en succursale."],
    ["Confidentialité de l'app", "Aucune donnée collectée."]
  ],
  avis: "★★★★★<br>« Enfin quelqu'un qui range mon cellier mieux que moi. »<br>— D., dieu du vin"
};

// ==================== LES ÉCRANS D'UNE VISITE ====================
// Chaque écran s'ouvre par les fonctions de l'app, comme un tap — jamais la caméra, jamais une écriture.
// Le vin montré (fiche, menu d'action) : vinDeLaVisiteV2, toujours le même.
var ECRANS_VISITE_V2 = {
  accueil: function() {},
  menu: function() { toggleMenuV2(); },
  menuOutils: function() { toggleMenuV2(); basculerSousMenuV2('burgerV2-outils'); },
  action: function() { ecranVinVisiteV2(function(code) { ouvrirMenuActionV2(code, wineResultDepuisMemoireV2(code)); }); },
  fiche: function() { ecranVinVisiteV2(function(code) { ouvrirFicheV2(code, null); }); },
  cave: ouvrirCaveV2,
  caveFiltres: function() { ouvrirCaveV2(); ouvrirFiltresV2('caveV2'); },
  achat: ouvrirAchatV2,
  achatFiltres: function() { ouvrirAchatV2(); ouvrirFiltresV2('achatV2'); },
  emp: ouvrirEmpV2,
  empFiltres: function() { ouvrirEmpV2(); ouvrirFiltresV2('empV2'); },
  facture: ouvrirRecuV2,
  aranger: ouvrirARangerV2,
  histo: ouvrirHistoV2,
  histoFiltres: function() { ouvrirHistoV2(); ouvrirFiltresV2('histoV2'); },
  profil: ouvrirProfilV2,
  chartierFiltres: function() { ouvrirChartierV2(); ouvrirFiltresV2('chartierV2'); },
  selonsaq: ouvrirSelonSaqV2,
  curieuxbegin: ouvrirCurieuxBeginV2,
  notesFiltres: function() { ouvrirNotesV2(); ouvrirFiltresV2('notesV2'); },
  suggestionsFiltres: function() { ouvrirSuggestionsV2(); ouvrirFiltresV2('suggestionsV2'); },
  recherche: ouvrirRechercheV2,
  importachats: ouvrirImportAchatsV2
};

// ==================== LES VISITES ====================
// Une étape : son écran (ECRANS_VISITE_V2), ce qu'elle allume (un sélecteur), son texte, et la question à laquelle
// elle répond (facultative) — la liste « Questions » en est faite. Une étape de plus = une ligne ici.
var VISITES_V2 = [
  { titre: "À la SAQ", etapes: [
    { ecran: 'accueil', cible: "#topNavV2 [onclick*='startScanFromHomeV2']", question: "Je veux savoir si j'ai déjà ce vin",
      texte: "Le scanner. Vise le code-barres d'une bouteille : Dionysos te dit si tu l'as déjà, combien et où elle est. Il fait sombre ? Une lampe apparaît sous le ✕. Le code ne passe pas ? « Entrée manuelle »." },
    { ecran: 'accueil', cible: "#topNavV2 [onclick*='startScanFromHomeV2']", question: "Je veux garder un vin que je n'ai pas, pour plus tard",
      texte: "Un vin que tu n'as pas : tu vois son portrait de dégustation de la SAQ. « + » l'ajoute à ta cave (tu choisis sa place), « 💡 » le garde comme proposition. Ça marche même sans réseau dans la succursale." },
    { ecran: 'action', cible: "#menuActionV2-scan", question: "Je veux voir ce que les sommeliers ont dit d'un vin",
      texte: "Un vin que tu as : son écran. Ce que les sommeliers en ont dit, si Curieux Bégin l'a proposé, et tes vins de la même appellation ou du même cépage — touche une ligne pour les voir." },
    { ecran: 'action', cible: "#menuActionV2Overlay .btn-partager", question: "Je veux envoyer un vin par texto",
      texte: "Partager : le vin part par texto, avec son lien vers la SAQ." },
    { ecran: 'achat', cible: "#achatV2-loupe", question: "Je veux savoir quoi racheter",
      texte: "La Liste d'achat : ce qu'il faut racheter, avec le prix, les promos et les points bonis. L'entonnoir ouvre ses réglages." },
    { ecran: 'achatFiltres', cible: "#achatV2-mode-achat",
      texte: "Cinq listes : à racheter, favoris, propositions des sommeliers, découvertes et à ne pas racheter." },
    { ecran: 'achatFiltres', cible: "#achatV2-mode-decouvertes", question: "Je veux une promo sur un vin que je n'ai jamais eu",
      texte: "Les découvertes : les vins en promo à la SAQ que tu n'as jamais eus. 🍇 marque un cépage nouveau pour toi. La liste prend quelques minutes à venir : patience." },
    { ecran: 'achatFiltres', cible: "#achatV2-f-succ-display", question: "Je veux savoir ce que ma succursale a en stock",
      texte: "Ta succursale : la liste ne garde que les vins qu'elle a, avec les quantités. « Mes favorites » regarde toutes tes succursales préférées d'un coup." },
    { ecran: 'achatFiltres', cible: "#achatV2-promo", question: "Je veux voir seulement les promos",
      texte: "En promo : seulement les vins en promotion." },
    { ecran: 'achat', cible: "#achatV2-cartes .coche-panier", question: "Je veux cocher ce que je mets dans mon panier",
      texte: "Le rond à droite d'un vin : ton panier du jour. Coche ce que tu prends en passant dans l'allée. Toucher le vin ouvre sa fiche." }
  ] },
  { titre: "De retour à la maison", etapes: [
    { ecran: 'action', cible: "#menuActionV2Overlay [onclick*='arrivee']", question: "Je veux ajouter des bouteilles à ma cave",
      texte: "Les bouteilles arrivent : scanne-les, puis « + ». Choisis le meuble, la rangée et l'espace : Dionysos ne propose que les places permises à la couleur du vin. Ou « À ranger », ou « Hors tri » pour une bouteille d'occasion spéciale." },
    { ecran: 'facture', cible: "#recuV2Container .roundel", question: "Je veux entrer ma facture de la SAQ",
      texte: "La facture SAQ : prends-la en photo. Dionysos lit les vins, tu valides chacun, et ils entrent dans « À ranger ». « Bingo ! » si Curieux Bégin a proposé le vin." },
    { ecran: 'aranger', cible: "#aRangerV2-compte", question: "Je veux voir les bouteilles qui attendent leur place",
      texte: "À ranger : les bouteilles qui attendent leur place. Celles « hors tri » y restent : le Tri n'y touche jamais." }
  ] },
  { titre: "Dans la cave", etapes: [
    { ecran: 'cave', cible: "#caveV2-cartes .carte", question: "Je veux voir tous mes vins",
      texte: "La Cave : tous tes vins. Un vin voilé n'a plus de bouteille ; un cercle rouge barré : à ne pas racheter. Touche un vin pour ouvrir sa fiche." },
    { ecran: 'cave', cible: "#caveV2-loupe",
      texte: "L'entonnoir ouvre les filtres. Il devient doré quand un filtre est actif ; panneau fermé, il se change en flèche pour le rouvrir." },
    { ecran: 'caveFiltres', cible: "#caveV2-f-couleur-display", question: "Je veux tous mes vins, sauf une couleur ou un pays",
      texte: "Dans un menu : un toucher, seulement cette valeur ; deux, tout sauf elle (barrée en rouge) ; trois, tous." },
    { ecran: 'caveFiltres', cible: "#caveV2-dispo", question: "Je veux voir seulement les vins qu'il me reste",
      texte: "En cave : seulement les vins qui ont encore des bouteilles." },
    { ecran: 'emp', cible: "#empV2-cartes .emp-bloc", question: "Je veux voir ce qu'il y a dans un meuble",
      texte: "Les Emplacements : le plan de tes meubles. Touche une rangée pour voir ses bouteilles en photo." },
    { ecran: 'empFiltres', cible: "#empV2-mode-menage", question: "Je veux ranger mon cellier",
      texte: "Le Tri Dionysos : le plus de cépages possible par meuble, puis le plus d'appellations. Dionysos calcule la tournée, un écran à la fois ; tu déplaces les bouteilles, puis tu confirmes l'écran." },
    { ecran: 'empFiltres', cible: "#empV2-mode-fammanquante",
      texte: "Familles manquantes : les familles d'accords de la SAQ qui n'ont plus de bouteille en cave, ou qui manquent dans un meuble." },
    { ecran: 'action', cible: "#menuV2-deplacer", question: "Je veux changer une bouteille de place",
      texte: "Déplacer (⇄) : une bouteille change de place — une place permise à sa couleur, « À ranger » ou « Hors tri »." }
  ] },
  { titre: "Ouvrir une bouteille", etapes: [
    { ecran: 'action', cible: "#menuV2-boire", question: "Je veux noter une bouteille que je bois",
      texte: "Boire (🍷) : scanne la bouteille, puis 🍷. Note le plat, l'appréciation en verres (de 1 à 5), les accords et tes notes." },
    { ecran: 'action', cible: "#menuV2-donner", question: "Je veux donner une bouteille",
      texte: "Donner (🎁) : une bouteille offerte sort de la cave." },
    { ecran: 'action', cible: "#menuActionV2-emplacements", question: "Je veux remplir une place libérée au cellier",
      texte: "Une place se libère au cellier ? Après « Boire » ou « Donner », Dionysos propose un vin du Pigeonnier pour la remplir. « Confirmer » quand tu l'as monté, ou « Plus tard »." },
    { ecran: 'histo', cible: "#histoV2-cartes .histo-groupe", question: "Je veux retrouver ce que j'ai bu",
      texte: "L'Historique : tout ce qui a été bu, le plus récent en haut. Chaque vin une fois, ses plats dessous. Touche un plat pour le corriger." },
    { ecran: 'histoFiltres', cible: "#histoV2-f-mets", question: "Je veux retrouver le vin bu avec un plat",
      texte: "Rechercher un mets : retrouve le vin bu avec un plat." },
    { ecran: 'histoFiltres', cible: "#histoV2-filtres .roundel", question: "Je veux ajouter un vin bu avant l'app",
      texte: "« Ajouter » : un vin bu avant l'app, avec sa date. Le plat et l'appréciation sont facultatifs." },
    { ecran: 'profil', cible: "#profilV2-pays", question: "Je veux voir mes goûts d'un coup d'œil",
      texte: "Le Profil : tes achats en tartes — pays, couleurs, pastilles de goût, cépages. Touche une part : la Cave s'ouvre sur ses vins." }
  ] },
  { titre: "Qu'est-ce que je sers avec…", etapes: [
    { ecran: 'chartierFiltres', cible: "#chartierV2-aliments .champ-cliquable", question: "Je veux un vin pour un aliment",
      texte: "Selon Chartier : choisis un aliment. Dionysos montre les cépages qui l'accompagnent, puis tes vins de ces cépages." },
    { ecran: 'selonsaq', cible: "#selonSaqV2-loupe", question: "Je veux un vin qui va avec plusieurs ingrédients",
      texte: "Selon la SAQ : choisis des ingrédients ou des plats, et tes vins qui vont avec apparaissent. Sous chaque choix, « les recettes » de la SAQ." },
    { ecran: 'curieuxbegin', cible: "#curieuxBeginV2-loupe", question: "Je veux les vins de Curieux Bégin",
      texte: "Curieux Bégin : les vins proposés à l'émission, saison par saison, avec leurs recettes. « Mes vins » ou « Vins à découvrir »." },
    { ecran: 'notesFiltres', cible: "#notesV2-filtres .roundel", question: "Je veux garder un accord entendu quelque part",
      texte: "Nos notes : une phrase entendue, comme « asperge et crabe appellent un chablis ». Tu dis ce qu'elle appelle — cépages, appellations — et Dionysos montre tes vins qui y répondent." },
    { ecran: 'suggestionsFiltres', cible: "#suggestionsV2-filtres .roundel", question: "Je veux noter le conseil d'un sommelier",
      texte: "Propositions : les vins que les sommeliers t'ont conseillés. « Ajouter » en garde un nouveau, avec ce qu'il en a dit." },
    { ecran: 'recherche', cible: "#rechercheV2-champ", question: "Je veux chercher un mot partout",
      texte: "La loupe de l'accueil cherche partout d'un coup : tes vins, Nos notes, les propositions, Chartier, les recettes de la SAQ et Curieux Bégin." }
  ] },
  { titre: "La fiche d'un vin", etapes: [
    { ecran: 'fiche', cible: "#ficheV2-nom", question: "Je veux tout savoir d'un vin",
      texte: "La fiche d'un vin : tout ce qu'on sait de lui — information, dégustation, production, et où sont ses bouteilles." },
    { ecran: 'fiche', cible: "#ficheV2Overlay .cercle.gauche", question: "Je veux corriger une fiche",
      texte: "Le crayon corrige la fiche. La couleur, la pastille, le pays, l'appellation… se choisissent dans des listes ; les cépages se cochent. Il va aussi chercher la photo de la SAQ." },
    { ecran: 'fiche', cible: "#ficheV2-notes-display", question: "Je veux écrire une note de dégustation",
      texte: "Notes du sommelier : ta note de dégustation à toi. Touche la case pour l'écrire." },
    { ecran: 'fiche', cible: "#ficheV2-accords-display", question: "Je veux noter avec quels plats un vin se marie",
      texte: "Accords : avec quoi ce vin se marie. C'est ce que cherche le filtre « Accord » de la Cave." },
    { ecran: 'fiche', cible: "#ficheV2-aime-oui", question: "Je veux ne plus racheter un vin",
      texte: "Racheter ? ✓ : il revient sur la Liste d'achat quand il n'en reste plus. ✗ : à ne pas racheter (le cercle rouge barré)." },
    { ecran: 'fiche', cible: "#ficheV2-panier", question: "Je veux qu'un vin reste sur ma liste d'achat",
      texte: "Sur-inventaire ? : il reste sur la Liste d'achat même s'il t'en reste." },
    { ecran: 'fiche', cible: "#ficheV2-favori", question: "Je veux marquer mon vin préféré d'un cépage",
      texte: "Vin favori Cépage ? : ton préféré pour ce cépage. Une ★ s'allume à côté de ses cépages." },
    { ecran: 'fiche', cible: "#ficheV2-plats-section .ligne-ajout .cercle", question: "Je veux savoir combien de fois j'ai acheté ou bu un vin",
      texte: "Historique : acheté combien de fois, bu combien de fois, avec quels plats. « + » ajoute un vin bu." },
    { ecran: 'fiche', cible: "#ficheV2-selon-som-titre",
      texte: "Accords selon… : ce qu'en disent les sommeliers, Curieux Bégin, Chartier et la SAQ. Touche une ligne pour la déplier." },
    { ecran: 'fiche', cible: "#ficheV2Overlay .roundel[onclick*='ouvrirActionDepuisFicheV2']",
      texte: "Action : boire, donner, déplacer ou ajouter une bouteille, depuis la fiche." },
    { ecran: 'fiche', cible: "#ficheV2Overlay .roundel[onclick*='trouverCeVinV2']", question: "Je veux savoir quelle succursale a ce vin",
      texte: "Où le trouver : les succursales qui en ont, et le chemin dans Plans." }
  ] },
  { titre: "L'entretien", etapes: [
    { ecran: 'menuOutils', cible: "#burgerV2 [onclick*='sanscepage']", question: "Je veux compléter les vins sans cépage",
      texte: "Sans cépage : les vins à compléter. Un point doré le rappelle, ici et à côté d'Outils, tant qu'il en reste." },
    { ecran: 'importachats', cible: "#importAchatsV2-texte", question: "Je veux retrouver tout ce que j'ai acheté à la SAQ",
      texte: "Importer des achats : copie ton historique d'achat sur saq.com et colle-le ici. Les vins qui manquent entrent dans Dionysos, chaque achat est compté. Tes bouteilles ne bougent pas." },
    { ecran: 'menuOutils', cible: "#burgerV2 [onclick*='majaccordssaq']", question: "Je veux les nouvelles recettes et émissions",
      texte: "Accords SAQ et Curieux Bégin : vont chercher les nouvelles recettes et les nouvelles émissions. Ça prend quelques minutes : laisse l'app ouverte." },
    { ecran: 'menuOutils', cible: "#burgerV2 [onclick*='refresh']", question: "Je veux voir ce que l'autre téléphone a ajouté",
      texte: "Données : reprend tout ce que l'autre téléphone a écrit. C'est aussi la porte de sortie si l'app semble coincée." },
    { ecran: 'accueil', cible: "#accueilV2-titre", question: "Je veux savoir si l'app marche sans réseau",
      texte: "Sans réseau, Dionysos s'ouvre quand même avec sa dernière copie (l'accueil dit de quelle heure). Tu consultes tout ; rien ne s'enregistre avant le retour du réseau." },
    { ecran: 'menu', cible: "#burgerV2 [onclick*='modeemploi']",
      texte: "Le Mode d'emploi t'attend toujours ici, au bas du menu." }
  ] }
];

// ==================== LA PAGE ====================
// La typographie française : une espace insécable devant « : ; ? ! » et dans les guillemets — rien ne commence une ligne seul
function insecablesV2(t) { return t.replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0'); }

function ouvrirModeEmploiV2() {
  document.getElementById('modeEmploiV2-corps').innerHTML = rendreModeEmploiV2();
  montrerPageV2('modeEmploiV2Container');
}

function fermerModeEmploiV2() {
  cacherPageV2('modeEmploiV2Container');
}

// Trois volets, un seul ouvert à la fois (basculerVoletsV2, comme « Accords selon… » de la fiche) ; la Présentation d'abord
function rendreModeEmploiV2() {
  var p = PRESENTATION_V2;
  var volet = function(cle, titre, ouvert, html) {
    return '<div class="item-liste' + (ouvert ? ' actif' : '') + '" id="modeEmploiV2-' + cle + '-titre" onclick="basculerVoletsV2(\'modeEmploiV2-\', \'' + cle + '\')">' + titre + '</div>' +
      '<div id="modeEmploiV2-' + cle + '"' + (ouvert ? '' : ' style="display:none;"') + '>' + html + '</div>';
  };
  var presentation = '<h3 class="titre-2">' + p.titre + '</h3>' +
    p.accroche.map(function(t) { return '<div class="texte">' + t + '</div>'; }).join('') +
    p.blocs.map(function(b) { return '<div class="titre-3">' + b[0] + '</div><div class="texte">' + b[1] + '</div>'; }).join('') +
    '<div class="texte text-center">' + p.avis + '</div>';
  var visites = '<div class="texte">Dionysos te montre ses vrais écrans, avec tes vins. Rien ne s\'enregistre pendant une visite.</div>' +
    VISITES_V2.map(function(v, n) {
      return '<div class="item-liste accordeon-1" onclick="lancerVisiteV2(' + n + ', 0)">' + v.titre + '</div>';
    }).join('');
  var questions = '<div class="texte">Touche une question : la visite part de là.</div>' +
    VISITES_V2.map(function(v, n) {
      var q = v.etapes.map(function(e, i) {
        return e.question ? '<div class="item-liste accordeon-1 multiligne" onclick="lancerVisiteV2(' + n + ', ' + i + ')">' + e.question + '</div>' : '';
      }).join('');
      return q ? '<div class="titre-3">' + v.titre + '</div>' + q : '';
    }).join('');
  return insecablesV2(volet('presentation', 'Présentation', true, presentation) +
    volet('visites', 'Visites guidées', false, visites) +
    volet('questions', 'Questions', false, questions));
}

// ==================== LA VISITE ====================
var VISITE_V2 = null;   // la visite en cours : { v (rang dans VISITES_V2), i (l'étape), ecran (ouvert), tour (étape montrée) }

// Le vin que la visite montre : un des tiens, en cave (avec photo, cépage et code SAQ si possible) ; toujours le même
function vinDeLaVisiteV2() {
  var enCave = bouteillesEnCaveV2();
  var w = enCave.filter(function(i) { return i['Photo URL'] && i.Cepage && i['Code SAQ']; })[0] || enCave[0] || (ALL_DATA || [])[0];
  return w ? w['Code-barres'] : '';
}
// Un écran qui montre un vin : sans aucun vin (une cave neuve), la bulle parle sur l'accueil
function ecranVinVisiteV2(ouvrir) {
  var code = vinDeLaVisiteV2();
  if (code) ouvrir(code);
}

function lancerVisiteV2(v, i) {
  VISITE_V2 = { v: v, i: i, ecran: null, tour: 0 };
  cacherPageV2('modeEmploiV2Container');
  document.getElementById('visiteV2').style.display = 'flex';
  montrerEtapeVisiteV2();
}

// ‹ et › : l'étape d'avant, celle d'après ; après la dernière (✓), retour au Mode d'emploi
function avancerVisiteV2(pas) {
  if (!VISITE_V2) return;
  var i = VISITE_V2.i + pas;
  if (i >= VISITES_V2[VISITE_V2.v].etapes.length) { quitterVisiteV2(); return; }
  VISITE_V2.i = Math.max(0, i);
  montrerEtapeVisiteV2();
}

function quitterVisiteV2() {
  if (!VISITE_V2) return;
  eteindreCibleVisiteV2();
  rangerEcranVisiteV2();
  VISITE_V2 = null;
  document.getElementById('visiteV2').style.display = 'none';
  revenirPageV2('modeEmploiV2Container');   // là où on était rendu, le volet ouvert gardé
}

function montrerEtapeVisiteV2() {
  var v = VISITES_V2[VISITE_V2.v], e = v.etapes[VISITE_V2.i], tour = ++VISITE_V2.tour;
  eteindreCibleVisiteV2();
  if (e.ecran !== VISITE_V2.ecran) {   // un autre écran : on repart de l'accueil, puis on l'ouvre
    rangerEcranVisiteV2();
    VISITE_V2.ecran = e.ecran;
    ECRANS_VISITE_V2[e.ecran]();
  }
  document.getElementById('visiteV2-titre').textContent = v.titre + ' · ' + (VISITE_V2.i + 1) + ' / ' + v.etapes.length;
  document.getElementById('visiteV2-texte').textContent = insecablesV2(e.texte);
  document.getElementById('visiteV2-avant').classList.toggle('desactive', VISITE_V2.i === 0);
  document.getElementById('visiteV2-apres').textContent = VISITE_V2.i === v.etapes.length - 1 ? '✓' : '›';
  document.getElementById('visiteV2').classList.remove('haut');
  allumerCibleVisiteV2(e.cible, tour, 40);
}

// Ce que l'étape montre peut arriver après son écran (une liste qui se charge) : guetté 4 s au plus, puis amené au
// milieu de l'écran et allumé ; la bulle passe en haut quand il est en bas. Pas trouvé : la bulle parle seule.
function allumerCibleVisiteV2(selecteur, tour, essais) {
  if (!VISITE_V2 || VISITE_V2.tour !== tour) return;   // la visite a changé d'étape, ou est finie
  var el = document.querySelector(selecteur), r = el && el.getBoundingClientRect();
  if (!r || !r.width || !r.height) {
    if (essais > 0) setTimeout(function() { allumerCibleVisiteV2(selecteur, tour, essais - 1); }, 100);
    return;
  }
  el.scrollIntoView({ block: 'center' });
  el.classList.add('visite-cible');
  r = el.getBoundingClientRect();
  document.getElementById('visiteV2').classList.toggle('haut', (r.top + r.bottom) / 2 > window.innerHeight * 0.55);
}

function eteindreCibleVisiteV2() {
  Array.prototype.forEach.call(document.querySelectorAll('.visite-cible'), function(el) { el.classList.remove('visite-cible'); });
}

// Entre deux écrans, l'app revient à l'accueil : panneaux de filtres refermés, pages et menu cachés, aucun vin en cours
function rangerEcranVisiteV2() {
  Array.prototype.forEach.call(document.querySelectorAll('.panneau-gauche.ouvert'), function(p) { fermerFiltresV2(p.id.replace(/-filtres$/, '')); });
  cacherToutesPagesV2();
  menuActionV2Context = null;
}
