/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-RECHERCHE-V2.JS
   Recherche de l'accueil
============================================================ */

// ==================== RECHERCHE V2 ====================
function ouvrirRechercheV2() {
  montrerPageV2('rechercheV2Container');
  var champ = document.getElementById('rechercheV2-champ');
  champ.value = '';
  filtresRechercheV2 = filtresVidesV2('rechercheV2');
  remplirFiltresRechercheV2();
  document.getElementById('rechercheV2-compte').textContent = '';
  document.getElementById('rechercheV2-cartes').innerHTML = '<div class="texte-secondaire">Tape un mot : vin, producteur, arôme, aliment, sommelier, recette…</div>';
  RECHERCHE_V2_SECTION_OUVERTE = '';
  chargerSourcesRechercheV2();
}

function fermerRechercheV2() {
  cacherPageV2('rechercheV2Container');
}

var filtresRechercheV2 = filtresVidesV2('rechercheV2');

function remplirFiltresRechercheV2() {
  var f = filtresRechercheV2;
  majToggleHautV2('rechercheV2-cave', f.cave);
  remplirMenuFiltreV2('rechercheV2', 'sommelier', sommeliersConnusV2());
  var listes = valeursEnCascadeV2(ALL_DATA || [], f, [
    critereChampV2('couleur', 'Couleur'),
    ['cepage', function(i) { return cepagesDuTexteV2(i.Cepage).map(function(x) { return cepageCommunV2(x); }); },
               function(i, choix) { return passeFiltreV2(choix, i.Cepage, contientCepageV2); }],
    critereChampV2('pays', 'Pays'), critereChampV2('appellation', 'Appellation'), CRITERE_ACCORDS_V2,
    critereChampV2('pastille', 'Pastille gout', contientTexteV2)
  ]);
  Object.keys(listes).forEach(function(cle) { remplirMenuFiltreV2('rechercheV2', cle, listes[cle]); });
}

function normaliserRechercheV2(t) {
  return (t || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function memeTexteV2(a, b) {
  return normaliserRechercheV2(a) === normaliserRechercheV2(b);
}

function contientTexteV2(texte, morceau) {
  return normaliserRechercheV2(texte).indexOf(normaliserRechercheV2(morceau)) !== -1;
}

// Carte d'un vin groupé (grouperVinsV2) : photo, nom, origine, « X btl » + emplacements, voilée à 0 bouteille → sa fiche.
// Même carte dans la recherche et dans Comparables (écran du scan).
// Provenance 'comparable' (menu d'action, AU-DESSUS de la fiche) : naviguerV2 masque le menu, le ✕ de la fiche le rouvre.
function carteGroupeVinV2(g, provenance) {
  var w = g.wine;
  var nom = decodeHTML(w.Nom || '—');
  var sous = sousVinV2(w);
  var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
  var ouvrir = provenance === 'comparable' ? 'naviguerV2' : 'ouvrirApresTap';
  var onclick = g.cb ? ' onclick="' + ouvrir + '(function(){ouvrirFicheV2(\'' + g.cb + '\', \'' + provenance + '\')})"' : '';
  var vide = g.count === 0 ? ' carte-vide' : '';
  var emp = (g.emplacements && g.emplacements.length) ? '<br>' + g.emplacements.join('<br>') : '';
  return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '>' + photo +
         '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
         '<div class="carte-droite">' + caseDroiteV2(w, g.count) + emp + '</div></div>';
}

// Limite d'affichage par section : au-delà, le mot est trop large pour être utile.
var MAX_SECTION_RECHERCHE_V2 = 50;
// Section d'accords dépliée (par son titre) : elle survit aux frappes suivantes.
var RECHERCHE_V2_SECTION_OUVERTE = '';

// Les listes d'accords ne sont chargées qu'à l'ouverture de leur page. La recherche
// les fouille toutes : elle va chercher celles qui manquent (une fois par session ;
// le bouton « Données » les revide).
function chargerSourcesRechercheV2() {
  var aFaire = [];
  if (!ALL_NOTES || !ALL_NOTES.length) aFaire.push({ action: 'getNotesAccord', poser: function(d) { ALL_NOTES = d || []; } });
  if (!ALL_ACCORDS) aFaire.push({ action: 'getChartier', poser: function(d) { ALL_ACCORDS = d || []; } });
  if (!ALL_RECETTES) aFaire.push({ action: 'getRecettes', poser: function(d) { ALL_RECETTES = d || []; } });
  if (!ALL_CURIEUXBEGIN) aFaire.push({ action: 'getCurieuxBegin', poser: function(d) { ALL_CURIEUXBEGIN = d || []; } });
  if (!aFaire.length) return;
  var chaine = Promise.resolve();
  aFaire.forEach(function(src) {
    chaine = chaine.then(function() {
      return appelBackend(src.action, {}, { spinner: ' ' }).then(function(d) { src.poser(d); });
    });
  });
  chaine.then(function() {
    if (document.getElementById('rechercheV2Container').style.display !== 'none') lancerRechercheV2();
  }).catch(function(err) {
    afficherMessage('Recherche : ' + ((err && err.message) ? err.message : err));
  });
}

// Ouvre Chartier déjà filtré sur un cépage (depuis un résultat de recherche).
function ouvrirChartierCepageV2(cep) {
  cacherToutesPagesV2();
  ouvrirChartierV2();
  choisirFiltreV2('chartierV2', 'cepage', cep);
}

// La recherche fouille TOUT : vins, notes, propositions, Chartier, recettes SAQ,
// Curieux Bégin. Une section par source, dans l'ordre du menu « Accord selon… ».
// Les filtres du panneau (couleur, cépage, sommelier…) ne portent que sur les vins.
function lancerRechercheV2() {
  var terme = normaliserRechercheV2(document.getElementById('rechercheV2-champ').value.trim());
  var compte = document.getElementById('rechercheV2-compte');
  var div = document.getElementById('rechercheV2-cartes');
  var f = filtresRechercheV2;
  var loupe = document.getElementById('rechercheV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(f.sommelier || f.couleur || f.cepage || f.pays || f.appellation || f.accords || f.pastille || f.cave));
  if (terme.length < 2 && !f.sommelier) {
    compte.textContent = '';
    div.innerHTML = '<div class="texte-secondaire">Tape un mot : vin, producteur, arôme, aliment, sommelier, recette…</div>';
    return;
  }
  var saqSommelier = null;
  if (f.sommelier) {
    saqSommelier = {};
    (ALL_SUGGESTIONS || []).forEach(function(s) {
      if (s.sommelier === valeurChoixV2(f.sommelier)) saqSommelier[s.codeSAQ] = true;
    });
  }
  var champsExclus = { row: 1, bottle: 1, Statut: 1, Meuble: 1, Rangee: 1, Espace: 1, 'Date d\'ajout': 1, 'Date sortie': 1, Source: 1, 'Photo URL': 1 };
  var trouves = (ALL_DATA || []).filter(function(i) {
    return (!saqSommelier || passeFiltreV2(f.sommelier, !!saqSommelier[(i['Code SAQ'] || '').toString().trim()], function(propose) { return propose; })) &&
      passeFiltreV2(f.couleur, i.Couleur) &&
      passeFiltreV2(f.cepage, i.Cepage, contientCepageV2) &&
      passeFiltreV2(f.pays, i.Pays) &&
      passeFiltreV2(f.appellation, i.Appellation) &&
      passeFiltreV2(f.accords, i.Accords || '', contientChaineV2) &&
      passeFiltreV2(f.pastille, i['Pastille gout'], contientTexteV2) &&
      (terme.length < 2 || Object.keys(i).some(function(k) {
        if (champsExclus[k]) return false;
        return normaliserRechercheV2(i[k]).indexOf(terme) !== -1;
      }));
  });
  var groups = grouperVinsV2(trouves);
  if (f.cave) groups = groups.filter(function(g) { return g.count > 0; });

  var sections = [];
  if (groups.length) {
    sections.push({ titre: 'Vins', pliable: false, total: groups.length, montres: groups.length, html: groups.map(function(g) { return carteGroupeVinV2(g, 'recherche'); }).join('') });
  }

  if (terme.length >= 2) {
    var contient = function(parts) { return normaliserRechercheV2(parts.filter(Boolean).join(' ')).indexOf(terme) !== -1; };
    var infos = saqInfosV2();
    var tousVins = grouperVinsV2(ALL_DATA || []);

    // --- Nos notes : aliments, ce que ça appelle, qui l'a dit
    var notes = (ALL_NOTES || []).filter(function(n) { return contient([n.aliments, n.appelle, n.source, n.cepages, n.appellations]); });
    ajouterSectionRechercheV2(sections, 'Nos notes', notes, function(n) { return groupeNoteV2(n, tousVins, 'recherche'); });

    // --- Propositions : sommelier, note, nom du vin
    var props = (ALL_SUGGESTIONS || []).filter(function(sg) {
      var w = infos[sg.codeSAQ] || {};
      return contient([sg.sommelier, sg.note, decodeHTML(w.Nom || '')]);
    });
    var parSaq = {};
    props.forEach(function(sg) {
      if (!parSaq[sg.codeSAQ]) parSaq[sg.codeSAQ] = { codeSAQ: sg.codeSAQ, wine: infos[sg.codeSAQ] || {}, items: [] };
      parSaq[sg.codeSAQ].items.push(sg);
    });
    ajouterSectionRechercheV2(sections, 'Propositions', Object.keys(parSaq).map(function(k) { return parSaq[k]; }), groupeSuggestionV2);

    // --- Chartier : cépage, aliment, nuance, source
    var ch = (ALL_ACCORDS || []).filter(function(a) { return contient([a.cepage, a.aliment, a.nuance, a.source]); });
    ajouterSectionRechercheV2(sections, 'Chartier', ch, function(a) {
      var sousCh = [a.cepage, a.nuance, a.source].filter(Boolean).join(' · ');
      var cepEsc = (a.cepage || '').replace(/'/g, "\\'");
      var oc = a.cepage ? ' onclick="ouvrirApresTap(function(){ouvrirChartierCepageV2(\'' + cepEsc + '\')})"' : '';
      return '<div class="carte histo-mets"' + oc + '><div class="carte-centre"><span class="carte-titre">' + (a.aliment || '—') + '</span><span class="carte-sous">' + sousCh + '</span></div></div>';
    });

    // --- Recettes SAQ : nom, types de plats, ingrédients
    var recs = (ALL_RECETTES || []).filter(function(r) {
      return contient([decodeHTML(r.nom || ''), (r.typesPlats || []).join(' '), (r.ingredients || []).join(' ')]);
    });
    ajouterSectionRechercheV2(sections, 'Recettes SAQ', recs, carteRecetteSaqV2);

    // --- Curieux Bégin : plat, vin, cépage
    var cbs = (ALL_CURIEUXBEGIN || []).filter(function(a) {
      var w = infos[(a.codeSAQ || '').toString().trim()];
      return contient([a.plat, a.vin, a.cepage, w ? (w.Nom || '') : '']);
    });
    var parCb = {};
    cbs.forEach(function(a) {
      var cs = (a.codeSAQ || '').toString().trim();
      if (!parCb[cs]) parCb[cs] = { codeSAQ: cs, wine: infos[cs] || null, ref: a, items: [] };
      parCb[cs].items.push(a);
    });
    ajouterSectionRechercheV2(sections, 'Curieux Bégin', Object.keys(parCb).map(function(k) { return parCb[k]; }), function(g) { return groupeCurieuxBeginV2(g, 'recherche'); });
  }

  var total = sections.reduce(function(n, sec) { return n + sec.total; }, 0);
  compte.textContent = total + ' résultat' + (total > 1 ? 's' : '');
  if (!sections.length) { div.innerHTML = '<div class="texte-secondaire">Aucun résultat</div>'; return; }
  var pliables = sections.filter(function(sec) { return sec.pliable; });
  // Rien d'ouvert par défaut, sauf s'il n'y a aucun vin : la première section s'ouvre alors.
  var titreOuvert = RECHERCHE_V2_SECTION_OUVERTE;
  if (!pliables.some(function(sec) { return sec.titre === titreOuvert; })) {
    titreOuvert = (sections.length && !sections[0].pliable) ? '' : (pliables.length ? pliables[0].titre : '');
  }
  div.innerHTML = sections.map(function(sec, i) {
    var reste = sec.total - sec.montres;
    var coupe = reste > 0 ? '<div class="texte-secondaire">' + reste + ' de plus — précise ton mot</div>' : '';
    if (!sec.pliable) return '<div class="titre-2">' + sec.titre + '</div>' + sec.html + coupe;
    var ouvert = (sec.titre === titreOuvert);
    return '<div class="titre-2 emp-meuble-pliable' + (ouvert ? ' ouvert' : '') + '" onclick="basculerSectionRechercheV2(' + i + ')">' + sec.titre + '</div>' +
           '<div id="rechercheV2-section-' + i + '" class="menu-liste' + (ouvert ? ' ouvert' : '') + '" data-titre="' + sec.titre + '">' + sec.html + coupe + '</div>';
  }).join('');
  RECHERCHE_V2_SECTION_OUVERTE = titreOuvert;
}

// Une note ou une proposition corrigée depuis la recherche : remettre la liste à jour.
function rafraichirRechercheSiOuverteV2() {
  var c = document.getElementById('rechercheV2Container');
  if (c && c.style.display !== 'none') lancerRechercheV2();
}

// Ajoute une section de résultats, coupée à MAX_SECTION_RECHERCHE_V2 cartes.
// Tout ce qui vient d'« Accord selon… » est pliable : la page reste lisible.
function ajouterSectionRechercheV2(sections, titre, liste, rendu) {
  if (!liste.length) return;
  var montres = liste.slice(0, MAX_SECTION_RECHERCHE_V2);
  sections.push({ titre: titre, pliable: true, total: liste.length, montres: montres.length, html: montres.map(function(x) { return rendu(x); }).join('') });
}

// Une seule section d'accords ouverte à la fois ; elle le reste pendant qu'on tape.
function basculerSectionRechercheV2(i) {
  var cible = document.getElementById('rechercheV2-section-' + i);
  if (!cible) return;
  var etait = cible.classList.contains('ouvert');
  Array.prototype.forEach.call(document.querySelectorAll('#rechercheV2-cartes .menu-liste'), function(d) { d.classList.remove('ouvert'); });
  Array.prototype.forEach.call(document.querySelectorAll('#rechercheV2-cartes .emp-meuble-pliable'), function(t) { t.classList.remove('ouvert'); });
  if (etait) { RECHERCHE_V2_SECTION_OUVERTE = ''; return; }
  cible.classList.add('ouvert');
  if (cible.previousElementSibling) cible.previousElementSibling.classList.add('ouvert');
  RECHERCHE_V2_SECTION_OUVERTE = cible.getAttribute('data-titre') || '';
}
