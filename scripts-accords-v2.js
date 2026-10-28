/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-ACCORDS-V2.JS
   Accord selon… : Nos notes, Chartier, SAQ, Curieux Bégin
============================================================ */

// ==================== NOS NOTES D'ACCORD V2 ====================
// Une phrase entendue (« asperge et crabe m'amènent un chablis »), notée telle
// quelle : des aliments, ce que ça appelle, qui l'a dit. Aucun lien avec un vin
// précis — c'est ce qui la distingue des Propositions.
var filtresNotesV2 = filtresVidesV2('notesV2');
var noteEditV2 = { row: 0 };

function ouvrirNotesV2() {
  ouvrirPageFiltreeV2('notesV2', (ALL_NOTES && ALL_NOTES.length) ? null : function() {
    return appelBackend('getNotesAccord', {}, { spinner: ' ' }).then(function(data) { ALL_NOTES = data || []; });
  }, 'Notes d\'accord');
}

function fermerNotesV2() {
  cacherPageV2('notesV2Container');
}

function remplirFiltresNotesV2() {
  var cur = filtresNotesV2.source;
  var sources = valeursUniquesV2(ALL_NOTES || [], 'source');
  remplirMenuFiltreV2('notesV2', 'source', sources);
  majToggleHautV2('notesV2-cave', filtresNotesV2.cave);
}

// Les vins que la note appelle. « Chablis » est une appellation, pas un cépage :
// on compare aux DEUX, et dans les deux sens (« un chablis bien frais » aussi).
// Note d'accord (28 oct. 2026) : ce que ça appelle = des cépages et des appellations, en listes (« ;; » dans le Sheet).
function listeNoteV2(texte) { return (texte || '').toString().split(';;').map(function(v) { return v.trim(); }).filter(Boolean); }

// Les vins que la note appelle : cépage PRINCIPAL parmi ses cépages (synonymes compris : « Grenache » trouve
// Cannonau et Garnacha), ou appellation parmi ses appellations. Une ancienne note (texte libre seulement) :
// le texte est comparé au Cépage ET à l'Appellation, dans les deux sens (« un chablis bien frais »).
function vinsDeLaNoteV2(n, groupes) {
  var ceps = listeNoteV2(n.cepages), apps = listeNoteV2(n.appellations);
  var q = (n.appelle || '').toString().trim();
  if (!ceps.length && !apps.length && !q) return [];
  var cles = {};
  ceps.forEach(function(c) { cles[cleCepageV2(cepageCommunV2(c))] = true; });
  return groupes.filter(function(g) {
    if (estPropositionV2(g.wine)) return false;
    if (filtresNotesV2.cave && !g.count) return false;
    if (!ceps.length && !apps.length) {
      return [g.wine.Cepage, g.wine.Appellation].some(function(v) {
        v = (v || '').toString().trim();
        if (!v) return false;
        return contientTexteV2(v, q) || contientTexteV2(q, v);
      });
    }
    var cep = decodeHTML(cepageDominant(g.wine));
    if (cep && cles[cleCepageV2(cepageCommunV2(cep))]) return true;
    return apps.some(function(a) { return memeTexteV2(decodeHTML(g.wine.Appellation || ''), a); });
  });
}

// Valeurs connues pour les pastilles d'une note : celles de mes vins (+ cépages de la config), et celles déjà notées
function valeursConnuesNoteV2(champ) {
  var vues = {}, out = [];
  var retenir = function(v) { v = decodeHTML((v || '').toString().trim()); var k = normaliserRechercheV2(v); if (v && !vues[k]) { vues[k] = true; out.push(v); } };
  (ALL_DATA || []).forEach(function(w) {
    if (champ === 'cepages') (w.Cepage || '').toString().split(',').forEach(retenir);
    else retenir(w.Appellation);
  });
  if (champ === 'cepages' && CONFIG && CONFIG.couleurs) Object.keys(CONFIG.couleurs).forEach(function(c) { (CONFIG.couleurs[c] || []).forEach(retenir); });
  (ALL_NOTES || []).forEach(function(n) { listeNoteV2(n[champ]).forEach(retenir); });
  return out.sort(function(a, b) { return a.localeCompare(b); });
}

function afficherNotesV2() {
  var champ = document.getElementById('notesV2-f-texte');
  var texte = normaliserRechercheV2(champ ? champ.value.trim() : '');
  var src = filtresNotesV2.source;
  var liste = (ALL_NOTES || []).filter(function(n) {
    return passeFiltreV2(src, String(n.source)) &&
      (!texte || normaliserRechercheV2([n.aliments, n.appelle, n.source, n.cepages, n.appellations].join(' ')).indexOf(texte) !== -1);
  });

  var loupe = document.getElementById('notesV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(src || texte || filtresNotesV2.cave));

  document.getElementById('notesV2-compte').textContent = liste.length + ' note' + (liste.length > 1 ? 's' : '');
  var div = document.getElementById('notesV2-cartes');
  if (!liste.length) { div.innerHTML = '<div class="texte-secondaire">Aucune note</div>'; return; }
  var groupes = grouperVinsV2(ALL_DATA || []);
  div.innerHTML = liste.map(function(n) { return groupeNoteV2(n, groupes); }).join('');
}

// Une note + les vins qu'elle appelle : même bloc sur la page Nos notes et dans la recherche (provenance 'recherche').
// La fiche est sous cette page dans le HTML : depuis la page, on la ferme avant d'ouvrir la fiche (le ✕ la rouvre).
function groupeNoteV2(n, groupes, provenance) {
  var sous = [n.aliments, n.source].filter(Boolean).join(' · ');
  // toucher la note = la corriger (comme l'Historique et les Propositions)
  var carteNote = '<div class="carte histo-vin" onclick="ouvrirApresTap(function(){ouvrirNoteEditV2(' + n.row + ')})">' +
           '<div class="carte-centre"><span class="carte-titre">' + (resumeNoteV2(n) || '—') + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + (n.date || '') + '</div></div>';
  var vins = vinsDeLaNoteV2(n, groupes);
  var cartesVins = vins.map(function(g) {
    var w = g.wine;
    var cb = (w['Code-barres'] || '').toString().trim();
    var ouvrir = provenance === 'recherche' ? 'ouvrirFicheV2(\'' + cb + '\', \'recherche\')' : 'fermerNotesV2();ouvrirFicheV2(\'' + cb + '\', \'notes\')';
    var onclick = cb ? ' onclick="ouvrirApresTap(function(){' + ouvrir + '})"' : '';
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    return '<div class="carte histo-mets ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
      '<div class="carte-centre"><span class="carte-titre">' + decodeHTML(w.Nom || '—') + '</span><span class="carte-sous">' + sousVinV2(w) + '</span></div>' +
      '<div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
  }).join('');
  if (!cartesVins) cartesVins = '<div class="carte histo-mets"><div class="carte-centre"><span class="carte-sous">Aucun vin</span></div></div>';
  return '<div class="histo-groupe">' + carteNote + cartesVins + '</div>';
}

// Titre d'une note : ses cépages · ses appellations ; une ancienne note, son texte
function resumeNoteV2(n) {
  var t = [listeNoteV2(n.cepages).join(', '), listeNoteV2(n.appellations).join(', ')].filter(Boolean).join(' · ');
  return t || n.appelle || '';
}

function ajouterDepuisNotesV2() {
  fermerFiltresV2('notesV2');
  ouvrirApresTap(function() { ouvrirNoteEditV2(0); });
}

// row = 0 → nouvelle note ; sinon correction de la ligne du Sheet.
function ouvrirNoteEditV2(row) {
  var n = row ? (ALL_NOTES || []).filter(function(x) { return String(x.row) === String(row); })[0] : null;
  // une ancienne note (texte libre seulement) : son texte est rappelé pour le reprendre en cépages / appellations
  var ancien = n && !listeNoteV2(n.cepages).length && !listeNoteV2(n.appellations).length ? (n.appelle || '') : '';
  noteEditV2 = { row: row || 0, ancien: ancien };
  PASTILLES_V2.noteEditV2 = { valeurs: { cepages: listeNoteV2(n && n.cepages), appellations: listeNoteV2(n && n.appellations) }, connues: valeursConnuesNoteV2, champs: ['cepages', 'appellations'] };
  ['cepages', 'appellations'].forEach(function(champ) {
    var menu = document.getElementById('noteEditV2-' + champ + '-menu');
    menu.classList.remove('ouvert'); menu.innerHTML = '';
    rendrePastillesV2('noteEditV2', champ);
  });
  var elAncien = document.getElementById('noteEditV2-ancien');
  elAncien.textContent = ancien ? 'Avant : « ' + ancien + ' »' : '';
  elAncien.style.display = ancien ? 'block' : 'none';
  document.getElementById('noteEditV2-aliments').value = n ? (n.aliments || '') : '';
  document.getElementById('noteEditV2-source').value = n ? (n.source || '') : '';
  document.getElementById('noteEditV2-btn-supprimer').style.display = n ? 'flex' : 'none';
  montrerPageV2('noteEditV2Overlay');
}

function fermerNoteEditV2() {
  document.getElementById('noteEditV2Overlay').style.display = 'none';
}

function confirmerNoteEditV2() {
  var aliments = document.getElementById('noteEditV2-aliments').value.trim();
  var source = document.getElementById('noteEditV2-source').value.trim();
  var listes = PASTILLES_V2.noteEditV2.valeurs;
  if (!aliments) { afficherMessage('Il faut au moins un aliment'); return; }
  // « Appelle » garde le résumé (lisible dans le Sheet, et la note marche même avec un serveur pas redéployé) ;
  // une ancienne note qu'on ne reprend pas en listes garde son texte
  var appelle = resumeNoteV2({ cepages: listes.cepages.join(';;'), appellations: listes.appellations.join(';;') }) || noteEditV2.ancien;
  if (!appelle) { afficherMessage('Il manque ce que ça appelle : un cépage ou une appellation'); return; }
  var route = noteEditV2.row ? 'corrigerNoteAccord' : 'ajouterNoteAccord';
  var avecListes = listes.cepages.length || listes.appellations.length;
  appelBackend(route, { row: noteEditV2.row, aliments: aliments, appelle: appelle, source: source, cepages: listes.cepages.join(';;'), appellations: listes.appellations.join(';;') }, { spinner: 'Sauvegarde' }).then(function(res) {
    if (res && res.success === false) throw new Error(res.message || 'refusée');
    // un serveur pas encore redéployé ignore les listes sans le dire : la note garde au moins le résumé
    var listesIgnorees = avecListes && !(res && res.avecListes);
    return rechargerNotesV2('Sauvegarde', listesIgnorees ? 'Note enregistrée, en texte seulement : Code.gs à recoller' : 'Note enregistrée');
  }).catch(signalerErreurV2);
}

function supprimerNoteEditV2() {
  if (!noteEditV2.row) return;
  appelBackend('supprimerNoteAccord', { row: noteEditV2.row }, { spinner: 'Suppression' }).then(function() {
    return rechargerNotesV2('Suppression', 'Note supprimée');
  }).catch(signalerErreurV2);
}

// Après une écriture dans Nos notes : les notes relues, l'éditeur fermé, la page et la Recherche redessinées, puis le message
function rechargerNotesV2(spinner, message) {
  ALL_NOTES = [];
  return appelBackend('getNotesAccord', {}, { spinner: spinner }).then(function(data) {
    ALL_NOTES = data || [];
    fermerNoteEditV2();
    remplirFiltresNotesV2();
    afficherNotesV2();
    rafraichirRechercheSiOuverteV2();
    afficherMessage(message);
  });
}

// ==================== ACCORDS METS-VINS V2 ====================
var ALL_ACCORDS = null;
// UN SEUL aliment de départ (18 sept. 2026) : croiser deux aliments vidait la liste
// (asperge + crabe = aucun cépage). Le deuxième aliment se lit maintenant dans
// « Va aussi avec », sous le cépage proposé.
var chartierV2Aliment = '';
var filtresChartierV2 = filtresVidesV2('chartierV2');
var COULEURS_CHARTIER_V2 = { 'vin-rouge': 'Rouge', 'vin-blanc': 'Blanc', 'vin-rose': 'Rosé', 'vin-bulles': 'Bulles', 'vin-spiritueux': 'Spiritueux' };


var CATEGORIES_CHARTIER_V2 = {
  fruits: ['Abricot','Ananas','Argousier','Avocat','Banane','Bleuet','Canneberge','Cassis','Cerise','Citron','Datte','Figue séchée et fraîche','Fraise','Framboise','Fruit de la passion','Kiwi','Lime','Litchi','Mangue','Melon cantaloup',"Melon d'eau",'Mûre','Orange','Pamplemousse','Papaye','Pêche','Pitaya','Poire','Pomme cuite','Pomme jaune','Pomme rouge','Pomme verte','Prune','Rhubarbe','Sureau (baie de)','Yuzu'],
  legumes: ['Ail','Artichaut','Asperge verte','Aubergine','Betterave rouge','Brocoli','Butternut (courge)','Carotte','Céleri','Champignon','Champignon « candy cap »','Chou','Concombre','Courgette','Daïkon','Endive','Épinard','Fenouil','Fève de soya germée','Kale (chou frisé)','Maïs','Oignon','Olive noire','Olive verte','Panais','Patate douce','Petit pois','Poireau','Poivron rouge rôti','Pomme de terre','Radis','Roquette','Tête de violon','Tomate','Topinambour'],
  epices: ['Ajowan','Aneth','Anis étoilé','Basilic','Camomille','Cannelle','Câpre','Cardamome','Carvi','Chipotle','Citronnelle','Clou de girofle','Comptonie voyageuse','Coriandre fraîche','Coriandre (graines de)','Cumin','Curcuma','Curry','Estragon','Genièvre (baie de)','Gingembre','Herbes de Provence','Hibiscus (fleurs séchées)','Houblon','Jasmin','Laurier','Lavande','Livèche','Mélisse','Menthe','Miso','Moutarde','Muscade','Myrique baumier','Nigelle','Origan','Osmanthus (fleur)',"Paprika/Pimenton/Piment d'Espelette",'Persil','Poivre de Guinée (maniguette)','Poivre du Sichuan','Poivre noir','Poivre rose','Quatre-épices','Raifort','Réglisse','Romarin','Rose (eau de)','Safran','Salsepareille (racinette/root beer)','Sapin et sapin baumier','Sauce soya','Sauge','Shiso','Thé des bois','Thé du Labrador','Thym','Tonka (fève)','Umeboshi','Vanille','Verveine','Vinaigre Balsamique','Wasabi'],
  fromages: ['Brunost (gjetost)','Comté','Fromage à croûte fleurie','Fromage à croûte lavée','Fromage à pâte persillée','Fromage à pâte pressée','Fromage de chèvre','Fromage en grains','Mozzarella'],
  viandes: ['Agneau','Bacon','Bœuf','Boudin noir','Canard','Chorizo','Dinde','Foie gras de canard','Jambon','Jambon ibérique/Prosciutto/San Daniele/de Parme/De Bayonne','Porc','Poulet Rôti','Veau','Viande fumée','Viande grillée'],
  poissons: ['Caviar','Crabe','Crevette','Huître','Langoustine/Homard/Écrevisse','Moule','Oursin','Pétoncle','Pieuvre et calmar','Poisson fumé','Poisson grillé','Sardine','Saumon et truite saumonée'],
  cereales: ['Amande','Arachide','Graines de citrouille rôties','Graines de pavot','Noisette','Noix de coco','Noix de Grenoble et noix du Brésil','Noix de pin (pignon)','Pacane','Pistache','Quinoa','Riz à grains longs blanc','Riz basmati et autres riz aromatiques','Riz brun','Riz sauvage','Sésame grillé'],
  autres: ['Café','Cannabis','Caramel','Chocolat blanc','Chocolat noir','Coca-Cola','Fourmi','Guimauve',"Huile d'olive",'Huitlacoche','Kimchi','Miel','Nori (algue)','Œuf',"Pain d'épices",'Parfum Chanel No 5','Parfum Poison de Dior','Pétrichor','Pissenlit (feuilles et fleurs)','Poutine','Sirop de bouleau jaune',"Sirop d'érable",'Truffe']
};
var LIBELLES_CATEGORIES_CHARTIER_V2 = { fruits:'Fruits', legumes:'Légumes', epices:'Épices, aromates et condiments', fromages:'Fromages', viandes:'Viandes et charcuteries', poissons:'Poissons et fruits de mer', cereales:'Céréales, noix et graines', autres:'Autres' };

function ouvrirChartierV2() {
  chartierV2Aliment = '';
  ouvrirPageFiltreeV2('chartierV2', ALL_ACCORDS ? null : function() {
    return appelBackend('getChartier', {}, { spinner: ' ' }).then(function(data) { ALL_ACCORDS = data || []; });
  }, 'Chartier');
}

function fermerChartierV2() {
  cacherPageV2('chartierV2Container');
}

function alimentsDisponiblesChartierV2(cle) {
  var vus = {};
  (ALL_ACCORDS || []).forEach(function(a) { if (a.aliment) vus[normaliserRechercheV2(a.aliment)] = true; });
  return (CATEGORIES_CHARTIER_V2[cle] || []).filter(function(a) { return vus[normaliserRechercheV2(a)]; });
}

// Le panneau (moteur commun, PANNEAUX_V2.chartier) : ce qui est propre à la page — un menu par catégorie d'aliments,
// l'aliment choisi en surbrillance —, puis le vin : Couleur · Cépage
function remplirFiltresChartierV2() {
  document.getElementById('chartierV2-aliments').innerHTML = Object.keys(LIBELLES_CATEGORIES_CHARTIER_V2).map(function(cle) {
    return '<div class="champ-cliquable" onclick="basculerFiltreV2(\'chartierV2\', \'' + cle + '\')">' + LIBELLES_CATEGORIES_CHARTIER_V2[cle] + '</div>' +
      '<div id="chartierV2-f-' + cle + '-menu" class="menu-liste">' + alimentsDisponiblesChartierV2(cle).map(function(a) {
        return '<div class="item-liste' + (memeTexteV2(a, chartierV2Aliment) ? ' actif' : '') + '" data-aliment="' + a.replace(/"/g, '&quot;') + '" onclick="choisirAlimentChartierV2(this.getAttribute(\'data-aliment\'))">' + a + '</div>';
      }).join('') + '</div>';
  }).join('');
  remplirMenuFiltreV2('chartierV2', 'couleur', Object.keys(COULEURS_CHARTIER_V2), function(c) { return COULEURS_CHARTIER_V2[c]; });
  remplirMenuFiltreV2('chartierV2', 'cepage', uniqueCepagesChartierV2());
  majToggleHautV2('chartierV2-dispo', filtresChartierV2.dispo);
}

function uniqueCepagesChartierV2() {
  var vus = {};
  var out = [];
  (ALL_ACCORDS || []).forEach(function(a) {
    var k = normaliserRechercheV2(a.cepage);
    if (a.cepage && !vus[k]) { vus[k] = true; out.push(a.cepage); }
  });
  out.sort(function(a, b) { return a.localeCompare(b); });
  return out;
}

// Un aliment choisi remplace le précédent : depuis le panneau ou depuis « Va aussi avec ».
function choisirAlimentChartierV2(aliment) {
  chartierV2Aliment = memeTexteV2(aliment, chartierV2Aliment) ? '' : aliment;
  filtresChartierV2.cepage = '';
  panneauV2('chartierV2').rafraichir();
  fermerFiltresV2('chartierV2');
  remonterScrollV2('chartierV2Container');
}

function majSelectionChartierV2() {
  var div = document.getElementById('chartierV2-selection');
  div.textContent = chartierV2Aliment ? chartierV2Aliment : 'Choisis un aliment dans l\'entonnoir';
}



// Le cépage d'un vin répond-il à un cépage du livre ? Synonymes compris (Cannonau → Grenache), ou le nom qui le contient
function cepageRepondChartierV2(cepVin, cepLivre) { return memeCepageV2(cepVin, cepLivre) || contientTexteV2(cepVin, cepLivre); }

function couleurCepageChartierV2(cepage) {
  var item = (ALL_DATA || []).filter(function(i) { return cepageRepondChartierV2(cepageDominant(i), cepage); })[0];
  return item ? couleurClasseV2(item.Couleur) : null;
}

function vinsDisponiblesPourCepageV2(cepage) {
  return bouteillesEnCaveV2().some(function(i) { return cepageRepondChartierV2(cepageDominant(i), cepage); });
}

function calculerResultatsChartierV2() {
  var div = document.getElementById('chartierV2-resultats');
  var loupe = document.getElementById('chartierV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(filtresChartierV2.dispo || filtresChartierV2.cepage || filtresChartierV2.couleur || chartierV2Aliment));

  if (filtresChartierV2.cepage) {
    var cep = filtresChartierV2.cepage;
    var aliments = (ALL_ACCORDS || []).filter(function(a) { return memeCepageV2(a.cepage, cep); });
    if (!aliments.length) { div.innerHTML = '<div class="texte-secondaire">Aucun aliment associé</div>'; return; }
    var vins = grouperVinsV2((ALL_DATA || []).filter(function(i) { return cepageRepondChartierV2(cepageDominant(i), cep); }));
    if (filtresChartierV2.dispo) vins = vins.filter(function(g) { return g.count > 0; });
    var cartesVins = vins.length ? vins.map(function(g) {
      var w = g.wine;
      var nom = decodeHTML(w.Nom || '—');
      var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){fermerChartierV2();ouvrirFicheV2(\'' + g.cb + '\', \'accords\')})"' : '';
      var vide = g.count === 0 ? ' carte-vide' : '';
      return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '><div class="carte-centre"><span class="carte-titre">' + nom + '</span></div><div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
    }).join('') : '<div class="texte-secondaire">Aucun vin de ce cépage en cave</div>';
    var listeAliments = aliments.map(function(a) {
      return '<div class="ligne-info">' + a.aliment + (a.nuance ? ' <span class="libelle">(' + a.nuance + ')</span>' : '') + '</div>';
    }).join('');
    div.innerHTML = '<div class="titre-2">' + cep + '</div>' + listeAliments + '<div class="panneau-separateur"></div>' + cartesVins;
    return;
  }

  var alim = chartierV2Aliment;
  // La consigne est déjà en haut (chartierV2-selection) : ne pas la répéter ici.
  if (!alim) { div.innerHTML = ''; return; }

  var liste = cepagesPourAlimentChartierV2(alim);
  if (filtresChartierV2.couleur) {
    liste = liste.filter(function(s) { return couleurCepageChartierV2(s.cepage) === filtresChartierV2.couleur; });
  }
  if (filtresChartierV2.dispo) {
    liste = liste.filter(function(s) { return vinsDisponiblesPourCepageV2(s.cepage); });
  }
  // Les cépages dont j'ai des bouteilles d'abord : c'est ce qu'on peut boire ce soir.
  liste.sort(function(a, b) {
    var da = vinsDisponiblesPourCepageV2(a.cepage) ? 0 : 1;
    var db = vinsDisponiblesPourCepageV2(b.cepage) ? 0 : 1;
    if (da !== db) return da - db;
    return a.cepage.localeCompare(b.cepage);
  });
  if (!liste.length) { div.innerHTML = '<div class="texte-secondaire">Aucun cépage pour cet aliment</div>'; return; }

  div.innerHTML = liste.map(function(s, i) {
    var entete = s.cepage + (s.nuance ? ' <span class="libelle">(' + s.nuance + ')</span>' : '');
    var vins = grouperVinsV2((ALL_DATA || []).filter(function(it) {
      return cepageRepondChartierV2(cepageDominant(it), s.cepage);
    }));
    // « En cave » : plus une seule carte de vin que je n'ai plus.
    if (filtresChartierV2.dispo) vins = vins.filter(function(g) { return g.count > 0; });
    var cartesVins = vins.length ? vins.map(function(g) {
      var w = g.wine;
      var nom = decodeHTML(w.Nom || '—');
      var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){fermerChartierV2();ouvrirFicheV2(\'' + g.cb + '\', \'accords\')})"' : '';
      var vide = g.count === 0 ? ' carte-vide' : '';
      return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '><div class="carte-centre"><span class="carte-titre">' + nom + '</span></div><div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
    }).join('') : '<div class="texte-secondaire">Aucun vin de ce cépage</div>';

    // Le lien cherché : ce que Chartier met d'autre sur ce cépage — de quoi bâtir le plat.
    var autres = autresAlimentsChartierV2(s.cepage, alim);
    var bloc = '';
    if (autres.length) {
      bloc = '<div class="item-liste accordeon-1" onclick="basculerAutresChartierV2(' + i + ')">Va aussi avec…</div>' +
             '<div id="chartierV2-autres-' + i + '" class="menu-liste">' + autres.map(function(a) {
               return '<div class="item-liste accordeon-2" onclick="choisirAlimentChartierV2(this.getAttribute(\'data-aliment\'))" data-aliment="' + a.replace(/"/g, '&quot;') + '">' + a + '</div>';
             }).join('') + '</div>';
    }
    return '<div class="titre-2">' + entete + '</div>' + cartesVins + bloc;
  }).join('');
}

// Les cépages que Chartier associe à un aliment, avec la nuance de la ligne.
function cepagesPourAlimentChartierV2(aliment) {
  var vus = {}, out = [];
  (ALL_ACCORDS || []).forEach(function(a) {
    if (!a.cepage || !memeTexteV2(a.aliment, aliment)) return;
    var k = normaliserRechercheV2(a.cepage);
    if (vus[k]) return;
    vus[k] = true;
    out.push({ cepage: a.cepage, nuance: a.nuance || '' });
  });
  return out;
}

// Les autres aliments du même cépage (l'aliment de départ exclu).
function autresAlimentsChartierV2(cepage, sauf) {
  var vus = {}, out = [];
  var cleSauf = normaliserRechercheV2(sauf);
  (ALL_ACCORDS || []).forEach(function(a) {
    if (!a.aliment || !memeCepageV2(a.cepage, cepage)) return;
    var k = normaliserRechercheV2(a.aliment);
    if (vus[k] || k === cleSauf) return;
    vus[k] = true;
    out.push(a.aliment);
  });
  out.sort(function(x, y) { return x.localeCompare(y); });
  return out;
}

// Un seul « Va aussi avec… » ouvert à la fois.
function basculerAutresChartierV2(i) {
  var cible = document.getElementById('chartierV2-autres-' + i);
  if (!cible) return;
  var etait = cible.classList.contains('ouvert');
  Array.prototype.forEach.call(document.querySelectorAll('#chartierV2-resultats .menu-liste'), function(d) { d.classList.remove('ouvert'); });
  if (!etait) cible.classList.add('ouvert');
}





// ==================== SELON SAQ — sens inverse : ingrédient → vins ====================
var selonSaqV2Selection = { ingredients: {}, plats: {} };
var selonSaqV2Ouverte = null;
var selonSaqV2Cave = false;
var selonSaqV2RecettesDe = null; // { champ, valeur } quand on affiche « les recettes » d'une valeur ; null = liste des vins

function ouvrirSelonSaqV2() {
  montrerPageV2('selonSaqV2Container');
  selonSaqV2Selection = { ingredients: {}, plats: {} };
  selonSaqV2Ouverte = null;
  selonSaqV2Cave = false;
  selonSaqV2RecettesDe = null;
  if (ALL_RECETTES) { construirePanneauSelonSaqV2(); calculerSelonSaqV2(); return; }
  appelBackend('getRecettes', {}, { spinner: ' ' }).then(function(data) {
    ALL_RECETTES = data || [];
    construirePanneauSelonSaqV2();
    calculerSelonSaqV2();
  }).catch(function(err) { retourAccueilV2('Recettes SAQ : ' + causeV2(err)); });
}

function fermerSelonSaqV2() {
  cacherPageV2('selonSaqV2Container');
}

function ouvrirFiltresSelonSaqV2() { clicLoupeV2('selonSaqV2', reinitialiserSelonSaqV2); }
// Seules les recettes des familles présentes en cave
function recettesUtilesSelonSaqV2() {
  var fams = {};
  (ALL_DATA || []).forEach(function(i) {
    var f = normFamilleV2(i.Famille);
    if (f) fams[f] = true;
  });
  return (ALL_RECETTES || []).filter(function(r) {
    return (r.familles || []).some(function(f) { return fams[normFamilleV2(f)]; });
  });
}

function construirePanneauSelonSaqV2() {
  var html = '';
  majToggleHautV2('selonSaqV2-cave', selonSaqV2Cave);
  html += '<div class="titre-3">Filtrer</div>';
  html += '<div class="champ-cliquable" onclick="basculerListeSelonSaqV2(\'ingredients\')">Ingrédients</div>';
  html += '<div id="selonSaqV2-liste-ingredients" class="menu-liste"></div>';
  html += '<div class="champ-cliquable" onclick="basculerListeSelonSaqV2(\'plats\')">Types de plats</div>';
  html += '<div id="selonSaqV2-liste-plats" class="menu-liste"></div>';
  document.getElementById('selonSaqV2-filtres').innerHTML = html;
}

function basculerListeSelonSaqV2(cle) {
  var etaitOuverte = selonSaqV2Ouverte === cle;
  ['ingredients', 'plats'].forEach(function(k) {
    var d = document.getElementById('selonSaqV2-liste-' + k);
    d.classList.remove('ouvert');
    d.innerHTML = '';
  });
  if (etaitOuverte) { selonSaqV2Ouverte = null; return; }
  selonSaqV2Ouverte = cle;
  var champ = (cle === 'ingredients') ? 'ingredients' : 'typesPlats';
  var div = document.getElementById('selonSaqV2-liste-' + cle);
  div.innerHTML = '<div class="item-liste' + (Object.keys(selonSaqV2Selection[cle]).length === 0 ? ' actif' : '') + '" onclick="tousSelonSaqV2(\'' + cle + '\')">Tous</div>' + comptesRecettesV2(recettesUtilesSelonSaqV2(), champ).map(function(v) {
    var sel = selonSaqV2Selection[cle][v.valeur];
    var vEsc = v.valeur.replace(/"/g, '&quot;');
    return '<div class="item-liste' + (sel ? ' actif' : '') + '" data-valeur="' + vEsc + '" onclick="toggleSelonSaqV2(this, \'' + cle + '\')">' + v.valeur + '</div>' +
           (sel ? '<div class="item-liste accordeon-1" data-champ="' + champ + '" data-valeur="' + vEsc + '" onclick="voirRecettesSelonSaqV2(this)">les recettes</div>' : '');
  }).join('');
  div.classList.add('ouvert');
}

function tousSelonSaqV2(cle) {
  selonSaqV2RecettesDe = null;
  selonSaqV2Selection[cle] = {};
  selonSaqV2Ouverte = null;
  basculerListeSelonSaqV2(cle);
  calculerSelonSaqV2();
}

function toggleSelonSaqV2(el, cle) {
  selonSaqV2RecettesDe = null;
  var v = el.getAttribute('data-valeur');
  var champ = (cle === 'ingredients') ? 'ingredients' : 'typesPlats';
  if (selonSaqV2Selection[cle][v]) {
    delete selonSaqV2Selection[cle][v];
    el.classList.remove('actif');
    var suiv = el.nextElementSibling; // retirer la sous-ligne « les recettes » qui suit
    if (suiv && suiv.classList.contains('accordeon-1')) suiv.remove();
  } else {
    selonSaqV2Selection[cle][v] = true;
    el.classList.add('actif');
    var ligne = document.createElement('div'); // ajouter « les recettes » juste sous la valeur, au clic
    ligne.className = 'item-liste accordeon-1';
    ligne.setAttribute('data-champ', champ);
    ligne.setAttribute('data-valeur', v);
    ligne.setAttribute('onclick', 'voirRecettesSelonSaqV2(this)');
    ligne.textContent = 'les recettes';
    el.parentNode.insertBefore(ligne, el.nextSibling);
  }
  calculerSelonSaqV2();
}

function reinitialiserSelonSaqV2() {
  selonSaqV2Selection = { ingredients: {}, plats: {} };
  selonSaqV2Ouverte = null;
  selonSaqV2Cave = false;
  selonSaqV2RecettesDe = null;
  construirePanneauSelonSaqV2();
  calculerSelonSaqV2();
  fermerFiltresV2('selonSaqV2');
}

function toggleCaveSelonSaqV2() {
  selonSaqV2RecettesDe = null;
  selonSaqV2Cave = !selonSaqV2Cave;
  majToggleHautV2('selonSaqV2-cave', selonSaqV2Cave);
  calculerSelonSaqV2();
}

// ingrédient → recettes qui le contiennent → familles → mes vins
// Une recette SAQ en lecture seule : même carte dans « les recettes » et dans la recherche.
function carteRecetteSaqV2(r) {
  var nomR = decodeHTML(r.nom || '—');
  var cls = (r.typesPlats || []).map(function(x) { return decodeHTML(x); }).join(' · ');
  var ing = (r.ingredients || []).map(function(x) { return decodeHTML(x); }).join(', ');
  var sous = [cls, ing].filter(Boolean).join('<br>');
  var sku = (r.sku || '').toString();
  var oc = sku ? ' onclick="window.open(\'https://www.saq.com/fr/' + sku + '\', \'_blank\')"' : '';
  return '<div class="carte histo-mets"' + oc + '><div class="carte-centre"><span class="carte-titre">' + nomR + '</span><span class="carte-sous">' + sous + '</span></div></div>';
}

function calculerSelonSaqV2() {
  var div = document.getElementById('selonSaqV2-cartes');
  var compte = document.getElementById('selonSaqV2-compte');
  var ingr = Object.keys(selonSaqV2Selection.ingredients);
  var plats = Object.keys(selonSaqV2Selection.plats);
  var loupe = document.getElementById('selonSaqV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(ingr.length || plats.length || selonSaqV2Cave));

  // Volet « les recettes » d'une valeur (agneau, viande blanche…) : liste des recettes de cette valeur,
  // en lecture seule (correction seulement sur la fiche). Le filtre des vins reste actif ; « ← Retour aux vins » revient.
  if (selonSaqV2RecettesDe) {
    var champD = selonSaqV2RecettesDe.champ, valD = selonSaqV2RecettesDe.valeur;
    var recs = recettesUtilesSelonSaqV2().filter(function(r) { return (r[champD] || []).indexOf(valD) !== -1; })
      .sort(function(a, b) { return decodeHTML(a.nom || '').localeCompare(decodeHTML(b.nom || '')); });
    compte.innerHTML = recs.length + ' recette' + (recs.length > 1 ? 's' : '') + ' — ' + decodeHTML(valD);
    var entete = '<div class="item-liste" onclick="retourVinsSelonSaqV2()">← Retour aux vins</div>';
    if (!recs.length) { div.innerHTML = entete + '<div class="texte-secondaire">Aucune recette</div>'; return; }
    div.innerHTML = entete + recs.map(carteRecetteSaqV2).join('');
    return;
  }

  // Montre tout par défaut (tous les vins ayant un accord SAQ). Chaque ingrédient/plat choisi RÉDUIT :
  // on garde les familles présentes pour CHAQUE choix (intersection) → les vins bons pour TOUS les choix.
  var utiles = recettesUtilesSelonSaqV2();
  var familles = null; // familles retenues ; null tant qu'aucun choix
  function contraindreSelonSaqV2(champ, valeur) {
    var s = {};
    utiles.forEach(function(r) {
      if ((r[champ] || []).indexOf(valeur) !== -1) (r.familles || []).forEach(function(f) { s[normFamilleV2(f)] = true; });
    });
    if (familles === null) { familles = s; return; }
    Object.keys(familles).forEach(function(f) { if (!s[f]) delete familles[f]; });
  }
  ingr.forEach(function(v) { contraindreSelonSaqV2('ingredients', v); });
  plats.forEach(function(v) { contraindreSelonSaqV2('typesPlats', v); });
  if (familles === null) { // aucun choix : toutes les familles ayant un accord
    familles = {};
    utiles.forEach(function(r) { (r.familles || []).forEach(function(f) { familles[normFamilleV2(f)] = true; }); });
  }

  var vins = grouperVinsV2((ALL_DATA || []).filter(function(i) {
    var f = normFamilleV2(i.Famille);
    return f && familles[f];
  }));
  if (selonSaqV2Cave) vins = vins.filter(function(g) { return g.count > 0; });

  var choix = ingr.length || plats.length;
  var recettes = utiles.filter(function(r) {
    if (!(r.familles || []).some(function(f) { return familles[normFamilleV2(f)]; })) return false;
    if (!choix) return true;
    return (r.ingredients || []).some(function(v) { return ingr.indexOf(v) !== -1; }) ||
           (r.typesPlats || []).some(function(v) { return plats.indexOf(v) !== -1; });
  });

  compte.innerHTML = vins.length + ' vin' + (vins.length > 1 ? 's' : '') + '<br>' + recettes.length + ' recette' + (recettes.length > 1 ? 's' : '');
  if (!vins.length) { div.innerHTML = '<div class="texte-secondaire">Aucun vin de la cave pour ce choix</div>'; return; }

  div.innerHTML = vins.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var sous = sousVinV2(w);
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){fermerSelonSaqV2();ouvrirFicheV2(\'' + g.cb + '\', \'selonsaq\')})"' : '';
    var vide = g.count === 0 ? ' carte-vide' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
  }).join('');
}

// Ouvre le volet « les recettes » d'une valeur (depuis la ligne sous une valeur sélectionnée)
function voirRecettesSelonSaqV2(el) {
  selonSaqV2RecettesDe = { champ: el.getAttribute('data-champ'), valeur: el.getAttribute('data-valeur') };
  fermerFiltresV2('selonSaqV2');
  calculerSelonSaqV2();
  remonterScrollV2('selonSaqV2Container');
}

function retourVinsSelonSaqV2() {
  selonSaqV2RecettesDe = null;
  calculerSelonSaqV2();
  remonterScrollV2('selonSaqV2Container');
}

// ==================== SELON CURIEUX BÉGIN V2 ====================
// Page façon « Suggestions » : une section par saison (la plus récente en haut), groupée par vin dedans
// (carte du vin → sa fiche), puis les recettes dessous (→ la recette).
var filtresCurieuxBeginV2 = filtresVidesV2('curieuxBeginV2');

function ouvrirCurieuxBeginV2() {
  ouvrirPageFiltreeV2('curieuxBeginV2', ALL_CURIEUXBEGIN ? null : function() {
    return appelBackend('getCurieuxBegin', {}, { spinner: ' ' }).then(function(data) { ALL_CURIEUXBEGIN = data || []; });
  }, 'Curieux Bégin');
}

function fermerCurieuxBeginV2() {
  cacherPageV2('curieuxBeginV2Container');
}

// Après un choix dans le panneau (moteur commun : choisirFiltreV2) — nouveau pays : une appellation qui n'y
// existe pas se vide (jamais une liste vide sans raison)
function apresChoixFiltreCurieuxBeginV2(cle) {
  var f = filtresCurieuxBeginV2;
  if (cle !== 'pays' || !f.appellation) return;
  var infos = saqInfosV2();
  var garde = (ALL_CURIEUXBEGIN || []).some(function(a) {
    if (!cbDansModeV2(a, infos)) return false;
    var x = attributsVinCbV2(a, infos);
    return passeFiltreV2(f.pays, x.pays, memeTexteV2) && memeTexteV2(x.appellation, valeurChoixV2(f.appellation));
  });
  if (!garde) f.appellation = '';
}

function remplirFiltresCurieuxBeginV2() {
  var f = filtresCurieuxBeginV2;
  // Saisons du mode affiché seulement (sinon un choix donnerait une liste vide), la plus récente en haut
  var infos = saqInfosV2();
  var vuesSaison = {};
  var saisons = [];
  (ALL_CURIEUXBEGIN || []).forEach(function(a) {
    var s = (a.saison || '').toString().trim();
    if (s && !vuesSaison[s] && cbDansModeV2(a, infos)) { vuesSaison[s] = true; saisons.push(s); }
  });
  saisons.sort(function(a, b) { return numeroCbV2(b) - numeroCbV2(a); });
  if (f.saison && !vuesSaison[valeurChoixV2(f.saison)]) f.saison = '';
  remplirMenuFiltreV2('curieuxBeginV2', 'saison', saisons, function(v) { return 'Saison ' + v; });

  // Cépage (principal) · Pays · Appellation : puisés dans le mode affiché ; Appellation suit le Pays
  var attrs = (ALL_CURIEUXBEGIN || []).filter(function(a) { return cbDansModeV2(a, infos); }).map(function(a) { return attributsVinCbV2(a, infos); });
  var listes = {
    cepage: menuCepagesV2(attrs.map(function(x) { return x.cepage; })),
    pays: valeursUniquesV2(attrs, 'pays'),
    appellation: valeursUniquesV2(attrs.filter(function(x) { return passeFiltreV2(f.pays, x.pays, memeTexteV2); }), 'appellation')
  };
  Object.keys(listes).forEach(function(cle) { remplirMenuFiltreV2('curieuxBeginV2', cle, listes[cle]); });
  remplirMenuFiltreV2('curieuxBeginV2', 'couleur', valeursUniquesV2(ALL_DATA || [], 'Couleur'));
  majToggleHautV2('curieuxBeginV2-cave', f.cave);
  var elMes = document.getElementById('curieuxBeginV2-mode-mesvins');
  var elHors = document.getElementById('curieuxBeginV2-mode-horscave');
  if (elMes) elMes.classList.toggle('actif', f.mode !== 'horscave');
  if (elHors) elHors.classList.toggle('actif', f.mode === 'horscave');
}

function choisirModeCurieuxBeginV2(mode) {
  filtresCurieuxBeginV2.mode = mode;
  if (mode === 'horscave') filtresCurieuxBeginV2.cave = false; // « en cave » n'a pas de sens pour les vins à découvrir
  remplirFiltresCurieuxBeginV2();
  chargerCurieuxBeginV2();
}

// Vrai si l'accord appartient au mode affiché : « Mes vins » = j'ai ce code SAQ ; « Vins à découvrir » = je ne l'ai pas.
function cbDansModeV2(a, infos) {
  var possede = !!infos[(a.codeSAQ || '').toString().trim()];
  return filtresCurieuxBeginV2.mode === 'horscave' ? !possede : possede;
}

// Couleur, cépage principal, pays et appellation d'un vin de Curieux Bégin : ceux de ma fiche si je l'ai,
// sinon ceux que l'enrichissement SAQ a gardés (couleur d'après le type ; pays et appellation depuis le 25 oct. 2026).
function attributsVinCbV2(a, infos) {
  var w = infos[(a.codeSAQ || '').toString().trim()];
  if (w) return { couleur: couleurClasseV2(w.Couleur), cepage: decodeHTML(cepageDominant(w)), pays: decodeHTML(w.Pays || ''), appellation: decodeHTML(w.Appellation || '') };
  return { couleur: couleurClasseV2(a.type), cepage: cepagesDuTexteV2(a.cepage)[0] || '', pays: decodeHTML(a.pays || ''), appellation: decodeHTML(a.appellation || '') };
}

// Valeurs d'un champ, sans doublon (accents et casse ignorés), triées
// Numéro de saison ou d'épisode (texte ou nombre du Sheet) ; vide → -1, classé en dernier.
function numeroCbV2(v) {
  var n = parseInt(v, 10);
  return isNaN(n) ? -1 : n;
}

function chargerCurieuxBeginV2() {
  var div = document.getElementById('curieuxBeginV2-liste');
  var compte = document.getElementById('curieuxBeginV2-compte');
  if (!div) return;
  var f = filtresCurieuxBeginV2;
  var infos = saqInfosV2();
  var champ = document.getElementById('curieuxBeginV2-f-texte');
  var q = normaliserRechercheV2(champ ? champ.value.trim() : '');

  var base = (ALL_CURIEUXBEGIN || []).filter(function(a) {
    var cs = (a.codeSAQ || '').toString().trim();
    var w = infos[cs];
    var possede = !!w;
    // modes exclusifs : « Mes vins » = mes vins ; « Vins à découvrir » = les autres
    if (!cbDansModeV2(a, infos)) return false;
    if (possede && f.cave && !vinEnCaveV2(cs, 'Code SAQ')) return false;
    if (!passeFiltreV2(f.saison, (a.saison || '').toString().trim())) return false;
    var x = attributsVinCbV2(a, infos);
    if (!passeFiltreV2(f.couleur, x.couleur, function(classe, v) { return classe === couleurClasseV2(v); })) return false;
    if (!passeFiltreV2(f.cepage, x.cepage, memeCepageV2)) return false;
    if (!passeFiltreV2(f.pays, x.pays, memeTexteV2)) return false;
    if (!passeFiltreV2(f.appellation, x.appellation, memeTexteV2)) return false;
    if (q) {
      var nomRech = possede ? (w.Nom || '') : (a.vin || '');
      if (normaliserRechercheV2(a.plat).indexOf(q) === -1 && normaliserRechercheV2(nomRech).indexOf(q) === -1) return false;
    }
    return true;
  });

  // Une section par saison ; dedans, un bloc par vin avec les recettes de cette saison.
  var parSaison = {};
  var vins = {};
  base.forEach(function(a) {
    var s = (a.saison || '').toString().trim();
    var cs = (a.codeSAQ || '').toString().trim();
    vins[cs] = true;
    if (!parSaison[s]) parSaison[s] = {};
    if (!parSaison[s][cs]) parSaison[s][cs] = { codeSAQ: cs, wine: infos[cs] || null, ref: a, items: [] };
    parSaison[s][cs].items.push(a);
  });
  var nbVins = Object.keys(vins).length;

  var loupe = document.getElementById('curieuxBeginV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(f.saison || f.couleur || f.cepage || f.pays || f.appellation || f.cave || q));

  compte.textContent = nbVins + ' vin' + (nbVins > 1 ? 's' : '');
  if (!nbVins) { div.innerHTML = '<div class="texte-secondaire">Aucun accord</div>'; return; }

  function nomGroupe(g) { return g.wine ? decodeHTML(g.wine.Nom || '') : decodeHTML(g.ref.vin || ''); }
  // Saison la plus récente en haut ; dans la saison, les épisodes les plus récents d'abord.
  var saisons = Object.keys(parSaison).sort(function(a, b) { return numeroCbV2(b) - numeroCbV2(a); });
  div.innerHTML = saisons.map(function(s) {
    var groupes = Object.keys(parSaison[s]).map(function(k) {
      var g = parSaison[s][k];
      g.items.sort(function(a, b) { return numeroCbV2(b.episode) - numeroCbV2(a.episode); });
      return g;
    });
    groupes.sort(function(a, b) {
      return (numeroCbV2(b.items[0].episode) - numeroCbV2(a.items[0].episode)) || nomGroupe(a).localeCompare(nomGroupe(b));
    });
    return '<div class="titre-2">' + (s ? 'Saison ' + s : 'Saison inconnue') + '</div>' +
      groupes.map(function(g) { return groupeCurieuxBeginV2(g); }).join('');
  }).join('');
}

// Un vin + ses recettes Curieux Bégin : même bloc sur la page et dans la recherche (provenance 'recherche').
// La fiche est sous cette page dans le HTML : depuis la page, on la ferme avant d'ouvrir la fiche (le ✕ la rouvre).
function groupeCurieuxBeginV2(g, provenance) {
  var carteVin, classeCoul;
  if (g.wine) {
    var w = g.wine;
    var cb = (w['Code-barres'] || '').toString().trim();
    classeCoul = couleurClasseV2(w.Couleur);
    var nom = decodeHTML(w.Nom || '—');
    var sous = sousVinV2(w);
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var ouvrir = provenance === 'recherche' ? 'ouvrirFicheV2(\'' + cb + '\', \'recherche\')' : 'fermerCurieuxBeginV2();ouvrirFicheV2(\'' + cb + '\', \'curieuxbegin\')';
    var onclick = cb ? ' onclick="ouvrirApresTap(function(){' + ouvrir + '})"' : '';
    carteVin = '<div class="carte histo-vin ' + classeCoul + '"' + onclick + '>' + photo +
      '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div></div>';
  } else {
    var a0 = g.ref;
    classeCoul = couleurClasseV2(a0.type);
    var nomV = decodeHTML(a0.vin || '—');
    var prixNum = parseFloat((a0.prix || '').toString().replace(',', '.'));
    var prix = isFinite(prixNum) ? (prixNum.toFixed(2).replace('.', ',') + ' $') : '';
    var ligne1 = [decodeHTML(a0.cepage || ''), prix].filter(Boolean).join(' • ');
    var sousV = [ligne1, 'Vin à découvrir à la SAQ'].filter(Boolean).join('<br>');
    var photoV = a0.photo ? '<div class="carte-photo"><img src="' + a0.photo + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    carteVin = '<div class="carte histo-vin ' + classeCoul + '" onclick="window.open(\'https://www.saq.com/fr/' + g.codeSAQ + '\', \'_blank\')">' + photoV +
      '<div class="carte-centre"><span class="carte-titre">' + nomV + '</span><span class="carte-sous">' + sousV + '</span></div></div>';
  }

  var cartesPlats = g.items.map(function(a) {
    var url = 'https://cuisinez.telequebec.tv/recettes/' + a.recetteId + '/' + a.slug;
    var saison = a.saison ? 'Saison ' + a.saison + (a.episode ? '-' + a.episode : '') : '';
    return '<div class="carte histo-mets" onclick="window.open(\'' + url + '\', \'_blank\')">' +
      '<div class="carte-centre"><span class="carte-titre">' + decodeHTML(a.plat || '') + '</span></div>' +
      '<div class="carte-droite">' + saison + '</div></div>';
  }).join('');

  return '<div class="histo-groupe ' + classeCoul + '">' + carteVin + cartesPlats + '</div>';
}
