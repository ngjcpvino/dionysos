/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-CAVE-V2.JS
   Cave à vin (cartes et filtres), À ranger, Sans cépage
============================================================ */

// ==================== CAVE À VIN V2 ====================
// La Cave ouverte par une part du Profil : son ✕ y ramène (toucherPartProfilV2)
var CAVE_DEPUIS_PROFIL_V2 = false;

function ouvrirCaveV2() {
  CAVE_DEPUIS_PROFIL_V2 = false;
  montrerPageV2('caveV2Container');
  majToggleHautV2('caveV2-dispo', filtresCaveV2.dispo);
  remplirFiltresCaveV2();
  appliquerFiltresCaveV2();
}

function fermerCaveV2() {
  cacherPageV2('caveV2Container');
  reinitialiserFiltresV2('caveV2');
  if (CAVE_DEPUIS_PROFIL_V2) { CAVE_DEPUIS_PROFIL_V2 = false; revenirPageV2('profilV2Container'); }
}

// ==================== À RANGER V2 ====================
function ouvrirARangerV2() {
  montrerPageV2('aRangerV2Container');
  afficherCartesARangerV2();
}

function fermerARangerV2() {
  document.getElementById('aRangerV2Container').style.display = 'none';
}

// Une page-liste de vins (Cave, À ranger, Sans cépage) : le compte (« N vins », puis la ligne suite), les cartes, ou siVide.
// tap(g) : le JS du tap d'une carte.
function afficherCartesVinsV2(prefixe, groups, siVide, tap, suite) {
  document.getElementById(prefixe + '-compte').innerHTML = groups.length + ' vin' + (groups.length > 1 ? 's' : '') + (suite ? '<br>' + suite : '');
  document.getElementById(prefixe + '-cartes').innerHTML = groups.length ?
    groups.map(function(g) { return carteGroupeVinV2(g, tap(g)); }).join('') : '<div class="texte-secondaire">' + siVide + '</div>';
}

function afficherCartesARangerV2() {
  afficherCartesVinsV2('aRangerV2', grouperVinsV2(bouteillesEnCaveV2('aranger')), 'Tout est bien rangé', function(g) {
    return g.cb ? 'deplacerDepuisListeV2(\'' + g.cb + '\', \'aranger\')' : '';
  });
}

// ==================== SANS CÉPAGE V2 ====================
function ouvrirSansCepageV2() {
  montrerPageV2('sansCepageV2Container');
  afficherCartesSansCepageV2();
}

function fermerSansCepageV2() {
  document.getElementById('sansCepageV2Container').style.display = 'none';
}

// Vins sans cépage (hors spiritueux) — la liste « Sans cépage » et la pastille d'OUTILS
function vinsSansCepageV2() {
  return (ALL_DATA || []).filter(function(i) {
    return !(i.Cepage || '').toString().trim() && i.Couleur !== 'Spiritueux';
  });
}

function afficherCartesSansCepageV2() {
  afficherCartesVinsV2('sansCepageV2', grouperVinsV2(vinsSansCepageV2()), 'Aucun vin sans cépage', function(g) { return tapFicheV2(g.cb, 'sanscepage'); });
}

function afficherCartesCaveV2(data) {
  var groups = grouperVinsV2(data);
  if (filtresCaveV2.dispo) groups = groups.filter(function(g){ return g.count > 0; });
  var totalBtl = groups.reduce(function(t, g){ return t + (g.count || 0); }, 0);
  afficherCartesVinsV2('caveV2', groups, 'Aucun vin', function(g) { return tapFicheV2(g.cb, 'cave'); }, totalBtl + ' bouteille' + (totalBtl > 1 ? 's' : '') + ' en stock');
}

var filtresCaveV2 = filtresVidesV2('caveV2');

// Les vins de la Cave : tout le classeur, sauf les propositions sans bouteille (elles sont dans Propositions et la Liste d'achat)
function vinsCaveV2() {
  return (ALL_DATA || []).filter(function(i) { return !(estPropositionV2(i) && !bouteilleEnCaveV2(i)); });
}

function remplirFiltresCaveV2() {
  var listes = valeursEnCascadeV2(vinsCaveV2(), filtresCaveV2, [
    critereChampV2('couleur', 'Couleur'),
    ['cepage', function(i) { var c = cepageDominant(i); return c ? [cepageCommunV2(decodeHTML(c))] : []; },
               function(i, choix) { return passeFiltreV2(choix, cepageDominant(i), memeCepageV2); }],
    critereChampV2('pays', 'Pays'), critereChampV2('appellation', 'Appellation'), CRITERE_ACCORDS_V2,
    critereChampV2('pastille', 'Pastille gout', contientTexteV2), critereChampV2('acidite', 'Acidité')
  ]);
  Object.keys(listes).forEach(function(cle) { remplirMenuFiltreV2('caveV2', cle, listes[cle]); });
}

function appliquerFiltresCaveV2() {
  var c = filtresCaveV2.couleur;
  var cep = filtresCaveV2.cepage;
  var p = filtresCaveV2.pays;
  var app = filtresCaveV2.appellation;
  var a = filtresCaveV2.accords;
  var past = filtresCaveV2.pastille;
  var acid = filtresCaveV2.acidite;
  var dispo = filtresCaveV2.dispo;
  var nom = normaliserRechercheV2(document.getElementById('caveV2-f-nom').value.trim());
  var champsExclusCave = { row: 1, bottle: 1, Statut: 1, Meuble: 1, Rangee: 1, Espace: 1, 'Date d\'ajout': 1, 'Date sortie': 1, Source: 1, 'Photo URL': 1 };

  var filtered = vinsCaveV2().filter(function(i) {
    return passeFiltreV2(c, i.Couleur) &&
      passeFiltreV2(cep, cepageDominant(i), memeCepageV2) &&
      passeFiltreV2(p, i.Pays) &&
      passeFiltreV2(app, i.Appellation) &&
      passeFiltreV2(a, i.Accords || '', contientChaineV2) &&
      passeFiltreV2(past, i['Pastille gout'], contientTexteV2) &&
      passeFiltreV2(acid, i['Acidité'], contientTexteV2) &&
      (!nom || Object.keys(i).some(function(k) {
        if (champsExclusCave[k]) return false;
        return normaliserRechercheV2(i[k]).indexOf(nom) !== -1;
      }));
  });
  afficherCartesCaveV2(filtered);
  remplirFiltresCaveV2();
  var loupe = document.getElementById('caveV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(c || cep || p || app || a || past || acid || nom));
}

