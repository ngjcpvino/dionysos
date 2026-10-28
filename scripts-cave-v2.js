/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-CAVE-V2.JS
   Cave à vin (cartes et filtres), À ranger, Sans cépage
============================================================ */

// ==================== CAVE À VIN V2 ====================
function ouvrirCaveV2() {
  montrerPageV2('caveV2Container');
  majToggleHautV2('caveV2-dispo', filtresCaveV2.dispo);
  remplirFiltresCaveV2();
  appliquerFiltresCaveV2();
}

function fermerCaveV2() {
  cacherPageV2('caveV2Container');
  reinitialiserFiltresV2('caveV2');
}

// ==================== À RANGER V2 ====================
function ouvrirARangerV2() {
  montrerPageV2('aRangerV2Container');
  afficherCartesARangerV2();
}

function fermerARangerV2() {
  document.getElementById('aRangerV2Container').style.display = 'none';
}

function afficherCartesARangerV2() {
  var aRanger = (ALL_DATA || []).filter(function(i) {
    var statut = i.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti' || statut === 'Suggestion') return false;
    return !(i.Meuble && i.Rangee && i.Espace);
  });
  var div = document.getElementById('aRangerV2-cartes');
  var groups = grouperVinsV2(aRanger);
  document.getElementById('aRangerV2-compte').textContent = groups.length + ' vin' + (groups.length > 1 ? 's' : '');
  if (groups.length === 0) { div.innerHTML = '<div class="texte-secondaire">Tout est bien rangé</div>'; return; }
  div.innerHTML = groups.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var sous = sousVinV2(w);
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="deplacerDepuisARangerV2(\'' + g.cb + '\')"' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
  }).join('');
}

function deplacerDepuisARangerV2(code) {
  var result = wineResultDepuisMemoireV2(code);
  if (!result) { afficherMessage('Vin introuvable'); return; }
  menuActionV2Context = { code: code, wineResult: result, retour: 'aranger' };
  naviguerV2(ouvrirDeplacerV2);
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
  var sansCepage = vinsSansCepageV2();

  var div = document.getElementById('sansCepageV2-cartes');
  var groups = grouperVinsV2(sansCepage);
  document.getElementById('sansCepageV2-compte').textContent = groups.length + ' vin' + (groups.length > 1 ? 's' : '');
  if (groups.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucun vin sans cépage</div>'; return; }
  div.innerHTML = groups.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var pays = w.Pays || '';
    var region = w.Region || '';
    var sous = (pays && region) ? (pays + ' • ' + region) : (pays || region);
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + g.cb + '\', \'sanscepage\')})"' : '';
    var vide = g.count === 0 ? ' carte-vide' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
  }).join('');
}

function afficherCartesCaveV2(data) {
  var div = document.getElementById('caveV2-cartes');
  var groups = grouperVinsV2(data);
  if (filtresCaveV2.dispo) groups = groups.filter(function(g){ return g.count > 0; });
  var totalBtl = groups.reduce(function(t, g){ return t + (g.count || 0); }, 0);
  document.getElementById('caveV2-compte').innerHTML = groups.length + ' vin' + (groups.length > 1 ? 's' : '') + '<br>' + totalBtl + ' bouteille' + (totalBtl > 1 ? 's' : '') + ' en stock';
  if (groups.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucun vin</div>'; return; }
  div.innerHTML = groups.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var pays = w.Pays || '';
    var region = w.Region || '';
    var paysRegion = (pays && region) ? (pays + ' • ' + region) : (pays || region);
    var cepage = annoterCepagesV2(w.Cepage);
    var cepageHtml = cepage ? (cepage + (w.Favori === 'Oui' ? ' <span class="etoile-favori actif">★</span>' : '')) : '';
    var sous = [paysRegion, cepageHtml, w.Appellation || ''].filter(Boolean).join('<br>');
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + g.cb + '\', \'cave\')})"' : '';
    var vide = g.count === 0 ? ' carte-vide' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + caseDroiteV2(w, g.count) +
           (g.emplacements && g.emplacements.length ? '<br>' + g.emplacements.join('<br>') : '') +
           '</div></div>';
  }).join('');
}

var filtresCaveV2 = filtresVidesV2('caveV2');

function remplirFiltresCaveV2() {
  var listes = valeursEnCascadeV2(ALL_DATA || [], filtresCaveV2, [
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

  var filtered = (ALL_DATA || []).filter(function(i) {
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

