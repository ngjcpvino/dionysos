/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-HISTORIQUE-V2.JS
   Historique et ajout d'un bu antérieur
============================================================ */

// ==================== HISTORIQUE V2 ====================
// Filtres : ce qui est propre à la page (Vin, Appréciation), puis le vin, puis le goût — comme la Cave
var libellesFiltreHistoV2 = { vin: 'Vin', note: 'Appréciation', couleur: 'Couleur', cepage: 'Cépage', pays: 'Pays', appellation: 'Appellation', accord: 'Accord', pastille: 'Pastille de goût', acidite: 'Acidité' };
var filtresHistoV2 = filtresVidesV2('histoV2');
var histoEditV2 = { row: 0, note: 0 };

function ouvrirHistoV2() {
  ouvrirPageFiltreeV2('histoV2', (ALL_HISTORIQUE && ALL_HISTORIQUE.length) ? null : function() {
    return appelBackend('getHistorique', {}, { spinner: ' ' }).then(function(data) { ALL_HISTORIQUE = data || []; });
  }, 'Historique');
}

function fermerHistoV2() {
  cacherPageV2('histoV2Container');
}

// Le vin d'une entrée de l'historique (fiche en mémoire, par code-barres puis code SAQ) — {} s'il n'y est plus
function indexVinsHistoV2() {
  var parCb = {}, parSaq = {};
  (ALL_DATA || []).forEach(function(d) {
    var cb = (d['Code-barres'] || '').toString().trim();
    var saq = (d['Code SAQ'] || '').toString().trim();
    if (cb && !parCb[cb]) parCb[cb] = d;
    if (saq && !parSaq[saq]) parSaq[saq] = d;
  });
  return function(h) { return parCb[(h.codebarre || '').toString().trim()] || parSaq[(h.codeSAQ || '').toString().trim()] || {}; };
}

// Les valeurs d'une entrée pour un filtre (une liste : un vin peut avoir plusieurs accords) ; appréciation « 0 » = aucune
function valeursFiltreHistoV2(cle, h, w) {
  switch (cle) {
    case 'vin': return [h.nom || ''];
    case 'note': return [String(parseInt(h.bonAccord, 10) || 0)];
    case 'couleur': return [w.Couleur || h.couleur || ''];
    case 'cepage': return [cepageDominant(w) ? cepageCommunV2(decodeHTML(cepageDominant(w))) : ''];
    case 'pays': return [w.Pays || ''];
    case 'appellation': return [w.Appellation || ''];
    case 'accord': return (w.Accords || '').split(',').map(function(a) { return a.trim(); });
    case 'pastille': return [w['Pastille gout'] || ''];
    case 'acidite': return [w['Acidité'] || ''];
  }
  return [];
}
// Cépage = cépage principal, comme la Cave
function passeFiltreHistoV2(cle, h, w, choix) {
  if (cle === 'cepage') return passeFiltreV2(choix, cepageDominant(w), memeCepageV2);
  if (cle === 'pastille') return passeFiltreV2(choix, w['Pastille gout'], contientTexteV2);
  return passeFiltreV2(choix, valeursFiltreHistoV2(cle, h, w), listeContientV2);
}
function libelleNoteHistoV2(n) { n = parseInt(n, 10) || 0; return n ? n + ' verre' + (n > 1 ? 's' : '') : 'Sans appréciation'; }
function filtresHistoActifsV2() {
  var f = filtresHistoV2;
  return !!(f.mets || f.cave || Object.keys(libellesFiltreHistoV2).some(function(k) { return f[k]; }));
}

// En cascade, comme la Cave : un menu ne propose que ce qui reste après les choix faits au-dessus de lui ;
// les valeurs viennent des vins de l'historique
function remplirFiltresHistoV2() {
  var f = filtresHistoV2;
  var vinDe = indexVinsHistoV2();
  var listes = valeursEnCascadeV2(ALL_HISTORIQUE || [], f, Object.keys(libellesFiltreHistoV2).map(function(cle) {
    return [cle, function(h) { return valeursFiltreHistoV2(cle, h, vinDe(h)); }, function(h, choix) { return passeFiltreHistoV2(cle, h, vinDe(h), choix); },
            cle === 'note' ? function(a, b) { return b - a; } : null];
  }));
  Object.keys(listes).forEach(function(cle) { remplirMenuFiltreV2('histoV2', cle, listes[cle], cle === 'note' ? libelleNoteHistoV2 : null); });

  var champMets = document.getElementById('histoV2-f-mets');
  if (champMets) champMets.value = f.mets;

  var loupe = document.getElementById('histoV2-loupe');
  if (loupe) loupe.classList.toggle('actif', filtresHistoActifsV2());
  majToggleHautV2('histoV2-cave', f.cave);
}

function filtrerMetsHistoV2() {
  var champ = document.getElementById('histoV2-f-mets');
  filtresHistoV2.mets = champ ? champ.value.trim() : '';
  var loupe = document.getElementById('histoV2-loupe');
  if (loupe) loupe.classList.toggle('actif', filtresHistoActifsV2());
  afficherHistoV2();
}

function afficherHistoV2() {
  var f = filtresHistoV2;
  var vinDe = indexVinsHistoV2();
  var cles = Object.keys(libellesFiltreHistoV2);

  var base = (ALL_HISTORIQUE || []).filter(function(h){
    if (f.mets && normaliserRechercheV2(h.plat || '').indexOf(normaliserRechercheV2(f.mets)) === -1) return false;
    var w = vinDe(h);
    if (!cles.every(function(k) { return passeFiltreHistoV2(k, h, w, f[k]); })) return false;
    if (f.cave && !vinEnCaveV2(h.codebarre)) return false;
    return true;
  });

  // Photo par code-barres (vient de ALL_DATA)
  var cbPhoto = {};
  (ALL_DATA || []).forEach(function(d){
    var cb = (d['Code-barres'] || '').toString().trim();
    if (cb && d['Photo URL']) cbPhoto[cb] = d['Photo URL'];
  });

  // Regrouper par vin (Code SAQ sinon code-barres) — même clé que partout
  var grouped = {};
  base.forEach(function(h){
    var cb = (h.codebarre || '').toString().trim();
    var key = cleVinV2({ 'Code SAQ': h.codeSAQ, 'Code-barres': h.codebarre });
    if (!grouped[key]) grouped[key] = { cb: cb, nom: h.nom, couleur: h.couleur, photo: cbPhoto[cb] || '', mets: [] };
    grouped[key].mets.push(h);
  });
  // le vin bu le plus récemment en haut, ses plats du plus récent au plus ancien (31 oct. 2026, l'utilisateur)
  var groupes = Object.values(grouped);
  groupes.forEach(function(g) { g.dernier = dateHistoIsoV2(derniereDateHistoV2(g.mets.map(function(m) { return m.date; }))); });
  groupes.sort(function(a, b) { return b.dernier < a.dernier ? -1 : b.dernier > a.dernier ? 1 : 0; });

  var div = document.getElementById('histoV2-cartes');
  document.getElementById('histoV2-compte').textContent = groupes.length + ' vin' + (groupes.length > 1 ? 's' : '');
  if (groupes.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucune entrée</div>'; return; }

  var cbInfos = {};
  (ALL_DATA || []).forEach(function(d){
    var cb = (d['Code-barres'] || '').toString().trim();
    if (cb) cbInfos[cb] = d;
  });

  div.innerHTML = groupes.map(function(g){
    var nom = decodeHTML(g.nom || '—');
    var carteVin = carteV2({ classes: 'histo-vin ' + couleurClasseV2(g.couleur), onclick: tapFicheV2(g.cb, 'histo'), photo: g.photo, titre: nom, sous: sousVinV2(cbInfos[g.cb] || {}) });
    var mets = g.mets.slice().sort(platPlusRecentV2);
    var cartesMets = mets.map(function(m){ return carteMetHistoV2(m, nom, 'histo'); }).join('');

    return '<div class="histo-groupe ' + couleurClasseV2(g.couleur) + '">' + carteVin + cartesMets + '</div>';
  }).join('');
}

// Date du jour « aaaa-mm-jj » (heure locale) — la valeur d'un champ date
function dateIsoV2(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
// « jj-mm-aaaa » de l'Historique → « aaaa-mm-jj »
function dateHistoIsoV2(jma) {
  var m = (jma || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
}
// Deux entrées de l'Historique, la plus récente d'abord (même jour : l'ordre reçu, la dernière inscrite en tête)
function platPlusRecentV2(a, b) {
  var da = dateHistoIsoV2(a.date), db = dateHistoIsoV2(b.date);
  return db < da ? -1 : db > da ? 1 : 0;
}
// La plus récente de dates « jj-mm-aaaa » ('' si aucune)
function derniereDateHistoV2(dates) {
  return dates.slice().sort(function(a, b) { return dateHistoIsoV2(b) < dateHistoIsoV2(a) ? -1 : 1; })[0] || '';
}

function ouvrirHistoEditV2(row, plat, note, nom, provenance, codeSAQ, codebarre) {
  var entree = (ALL_HISTORIQUE || []).filter(function(h) { return h.row === row; })[0];
  histoEditV2 = { row: row, note: note || 0, provenance: provenance || 'histo', date: dateHistoIsoV2(entree && entree.date) };
  var champDate = document.getElementById('histoEditV2-date');
  champDate.value = histoEditV2.date;
  champDate.max = dateIsoV2();
  document.getElementById('histoEditV2-vin').textContent = nom || '';
  var w = null;
  if ((provenance || 'histo') === 'fiche') {
    w = CURRENT_WINE_DATA;
  } else {
    var saq = (codeSAQ || '').toString().trim();
    var cb = (codebarre || '').toString().trim();
    w = (ALL_DATA || []).find(function(i) {
      if (saq) return (i['Code SAQ'] || '').toString().trim() === saq;
      if (cb) return memeCodeV2(i['Code-barres'], cb);
      return false;
    }) || null;
  }  
  var origineEl = document.getElementById('histoEditV2-origine');
  if (origineEl) origineEl.textContent = w ? [w.Pays, w.Region, w.Appellation].filter(Boolean).map(decodeHTML).join(' • ') : '';
  document.getElementById('histoEditV2-plat').value = plat || '';
  dessinerVerresV2('histoEditV2-verres', note, 'choisirNoteHistoEditV2');
  document.getElementById('histoEditV2Overlay').style.display = 'flex';
}

function choisirNoteHistoEditV2(note) {
  histoEditV2.note = note;
  allumerVerresV2('histoEditV2-verres', note);
}

function sauverHistoEditV2() {
  var plat = document.getElementById('histoEditV2-plat').value.trim();
  var date = document.getElementById('histoEditV2-date').value;
  if (date && date > dateIsoV2()) { afficherMessage('Cette date est dans le futur'); return; }
  var nouvelleDate = date && date !== histoEditV2.date ? date : '';
  appelBackend('corrigerHistorique', { row: histoEditV2.row, plat: plat, note: histoEditV2.note || '', date: nouvelleDate }, { spinner: 'Sauvegarde' }).then(function(res){
    if (!res || !res.success) { afficherMessage('Erreur'); return; }
    // un serveur pas encore redéployé ignore la date sans le dire
    var dateIgnoree = nouvelleDate && !res.avecDate;
    return rechargerHistoriqueV2('histoEditV2Overlay', histoEditV2.provenance, 'Sauvegarde', dateIgnoree ? 'Corrigé, sauf la date : Code.gs à recoller' : 'Corrigé');
  }).catch(function(err) { retourAccueilV2('Correction : ' + causeV2(err)); });
}

function supprimerHistoEditV2() {
  appelBackend('supprimerHistorique', { row: histoEditV2.row }, { spinner: 'Suppression' }).then(function(res){
    if (!res || !res.success) { afficherMessage('Erreur'); return; }
    return rechargerHistoriqueV2('histoEditV2Overlay', histoEditV2.provenance, 'Suppression', 'Supprimé');
  }).catch(function(err) { retourAccueilV2('Suppression : ' + causeV2(err)); });
}

// Après une écriture dans l'historique : relu, l'éditeur (overlay) fermé, puis la fiche (provenance 'fiche')
// ou l'Historique redessinés, et le message
function rechargerHistoriqueV2(overlay, provenance, spinner, message) {
  return appelBackend('getHistorique', {}, { spinner: spinner }).then(function(data) {
    ALL_HISTORIQUE = data || [];
    document.getElementById(overlay).style.display = 'none';
    if (provenance === 'fiche') {
      chargerPlatsV2(CURRENT_WINE_CODEBARRE);
    } else {
      remplirFiltresHistoV2();
      afficherHistoV2();
    }
    afficherMessage(message);
  });
}

function fermerHistoEditV2() {
  document.getElementById('histoEditV2Overlay').style.display = 'none';
}

// ===== Ajout manuel d'un accord au carnet (Historique) =====
var histoAjoutV2 = { codebarre: '', codeSAQ: '', nom: '', note: 0, provenance: 'histo' };

function ouvrirHistoAjoutDepuisFicheV2() {
  var cb = CURRENT_WINE_CODEBARRE;
  var w = (ALL_DATA || []).filter(function(d) { return memeCodeV2(d['Code-barres'], cb); })[0];
  if (!w) { afficherMessage('Vin introuvable'); return; }
  document.getElementById('histoAjoutV2-plat').value = '';
  choisirVinHistoAjoutV2(cb, (w['Code SAQ'] || '').toString().trim(), decodeHTML(w.Nom || ''));
  histoAjoutV2.provenance = 'fiche';
  document.getElementById('histoAjoutV2Overlay').style.display = 'flex';
}

function ouvrirHistoAjoutV2() {
  fermerFiltresV2('histoV2');
  histoAjoutV2 = { codebarre: '', codeSAQ: '', nom: '', note: 0, provenance: 'histo' };
  document.getElementById('histoAjoutV2-vin').textContent = 'Ajouter à l\'historique';
  document.getElementById('histoAjoutV2-action').textContent = 'Choisir un vin';
  document.getElementById('histoAjoutV2-recherche').value = '';
  document.getElementById('histoAjoutV2-recherche').style.display = 'block';
  document.getElementById('histoAjoutV2-resultats').innerHTML = '';
  document.getElementById('histoAjoutV2-resultats').classList.remove('ouvert');
  document.getElementById('histoAjoutV2-form').style.display = 'none';
  document.getElementById('histoAjoutV2-plat').value = '';
  document.getElementById('histoAjoutV2Overlay').style.display = 'flex';
}

function fermerHistoAjoutV2() {
  document.getElementById('histoAjoutV2Overlay').style.display = 'none';
}

function rechercherVinHistoAjoutV2() {
  var q = document.getElementById('histoAjoutV2-recherche').value.toLowerCase().trim();
  var menu = document.getElementById('histoAjoutV2-resultats');
  if (q.length < 2) { menu.innerHTML = ''; menu.classList.remove('ouvert'); return; }
  var vus = {};
  var vins = [];
  (ALL_DATA || []).forEach(function(d){
    var nom = decodeHTML(d.Nom || '');
    var cb = (d['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    if (!nom || !cb) return;
    var cle = cleVinV2(d);
    if (vus[cle]) return;
    if (nom.toLowerCase().indexOf(q) === -1) return;
    vus[cle] = true;
    vins.push({ nom: nom, cb: cb, saq: (d['Code SAQ'] || '').toString().trim() });
  });
  vins.sort(function(a, b){ return a.nom.localeCompare(b.nom); });
  menu.innerHTML = vins.slice(0, 20).map(function(v){
    return '<div class="item-liste" onclick="choisirVinHistoAjoutV2(\'' + v.cb + '\', \'' + v.saq + '\', \'' + v.nom.replace(/'/g, "\\'") + '\')">' + v.nom + '</div>';
  }).join('');
  menu.classList.add('ouvert');
}

function choisirVinHistoAjoutV2(cb, saq, nom) {
  histoAjoutV2.codebarre = cb;
  histoAjoutV2.codeSAQ = saq;
  histoAjoutV2.nom = nom;
  histoAjoutV2.note = 0;
  document.getElementById('histoAjoutV2-vin').textContent = nom;
  document.getElementById('histoAjoutV2-action').textContent = 'Ajouter un plat';
  document.getElementById('histoAjoutV2-recherche').style.display = 'none';
  document.getElementById('histoAjoutV2-resultats').innerHTML = '';
  document.getElementById('histoAjoutV2-resultats').classList.remove('ouvert');
  var champDate = document.getElementById('histoAjoutV2-date');
  champDate.value = dateIsoV2();
  champDate.max = dateIsoV2();

  dessinerVerresV2('histoAjoutV2-verres', 0, 'choisirNoteHistoAjoutV2');
  var accordsActuels = [];
  var vin = (ALL_DATA || []).filter(function(d){ return (d['Code-barres'] || '').toString().trim().replace(/\s+/g, '') === cb; })[0];
  if (vin && vin.Accords) accordsActuels = vin.Accords.split(',').map(function(a){ return a.trim(); }).filter(Boolean);
  document.getElementById('histoAjoutV2-accords-menu').innerHTML = (CONFIG && CONFIG.accords ? CONFIG.accords : []).map(function(acc){
    var sel = accordsActuels.indexOf(acc) !== -1;
    return '<div class="item-liste' + (sel ? ' actif' : '') + '" onclick="toggleAccordHistoAjoutV2(this)" data-accord="' + acc + '">' + acc + '</div>';
  }).join('');
  majAccordsDisplayHistoAjoutV2();
  document.getElementById('histoAjoutV2-form').style.display = 'block';
}

function choisirNoteHistoAjoutV2(note) {
  histoAjoutV2.note = note;
  allumerVerresV2('histoAjoutV2-verres', note);
}

function basculerMenuAccordsHistoAjoutV2() {
  document.getElementById('histoAjoutV2-accords-menu').classList.toggle('ouvert');
}

function toggleAccordHistoAjoutV2(el) {
  el.classList.toggle('actif');
  majAccordsDisplayHistoAjoutV2();
}

function majAccordsDisplayHistoAjoutV2() {
  var sel = Array.prototype.map.call(document.querySelectorAll('#histoAjoutV2-accords-menu .item-liste.actif'), function(el){ return el.getAttribute('data-accord'); });
  var disp = document.getElementById('histoAjoutV2-accords-display');
  if (disp) disp.textContent = sel.length ? sel.join(', ') : 'Accords';
}

function confirmerHistoAjoutV2() {
  if (!histoAjoutV2.codebarre) { afficherMessage('Choisissez un vin'); return; }
  // plat et appréciation facultatifs : un vin bu il y a longtemps n'a souvent que sa date
  var plat = document.getElementById('histoAjoutV2-plat').value.trim();
  var date = document.getElementById('histoAjoutV2-date').value || dateIsoV2();
  if (date > dateIsoV2()) { afficherMessage('Cette date est dans le futur'); return; }
  var dateIgnoree = false;
  var accords = Array.prototype.map.call(document.querySelectorAll('#histoAjoutV2-accords-menu .item-liste.actif'), function(el){ return el.getAttribute('data-accord'); });
  appelBackend('ajouterHistoriqueManuel', { codebarre: histoAjoutV2.codebarre, plat: plat, note: histoAjoutV2.note || '', date: date }, { spinner: 'Enregistrement' }).then(function(res){
    // un serveur pas encore redéployé écrit la date du jour sans le dire
    dateIgnoree = date !== dateIsoV2() && !(res && res.avecDate);
    if (accords.length) {
      return appelBackend('updateWineField', { codebarre: histoAjoutV2.codebarre, field: 'Accords', value: accords.join(', ') }, { spinner: 'Enregistrement' });
    }
  }).then(function(){
    return rechargerInventaireV2('Enregistrement');
  }).then(function(){
    return rechargerHistoriqueV2('histoAjoutV2Overlay', histoAjoutV2.provenance, 'Enregistrement', dateIgnoree ? 'Ajouté à la date du jour : Code.gs à recoller' : 'Ajouté au carnet');
  }).catch(function(err) { retourAccueilV2('Ajout à l\'historique : ' + causeV2(err)); });
}

// ===================== PROFIL =====================
// Ce que disent les achats (30 oct. 2026, l'utilisateur : « selon les achats » — tout ce qui est acheté se boit dans les
// 6 mois, et l'historique d'achat SAQ remonte avant l'app ; un vin acheté un jour = une part). Se lit d'un coup : pas de
// phrase, pas de liste.
var PAYS_TARTE_V2 = 7;   // au-delà, les plus petits pays vont dans « Autres »

// Les quatre tartes : la valeur du vin qu'elles comptent, et le filtre de la Cave qu'ouvre une part (30 oct. 2026)
var TARTES_PROFIL_V2 = {
  pays: { id: 'profilV2-pays', valeur: function(w) { return w.Pays; }, inconnu: 'Pays inconnu', quoi: 'pays', filtre: 'pays' },
  // le rouge et le blanc seulement, le rouge centré à 9 h, le blanc à 3 h (5 nov. 2026, l'utilisateur : « notre œil voit
  // que rouge est à gauche pour le reste ») ; cote : la moitié où se centre une part
  couleurs: { id: 'profilV2-couleurs', valeur: function(w, h) {
      var c = w.Couleur || h.couleur, k = couleurConnueV2(c) ? couleurClasseV2(c) : '';
      return k === 'vin-rouge' ? 'Rouge' : k === 'vin-blanc' ? 'Blanc' : '';
    }, inconnu: '', quoi: 'couleurs', classe: function(nom) { return classeCouleurTarteV2(nom); }, filtre: 'couleur',
    cote: function(nom) { return nom === 'Rouge' ? 'gauche' : 'droite'; } },
  // coupée en deux (3 nov. 2026, l'utilisateur) : les rouges à gauche, les blancs à droite, chaque moitié sur 100 % ;
  // toutes les pastilles montrées (pas d'« Autres ») ; pas de « Rouge » / « Blanc » sous les noms (5 nov. : le côté le dit)
  pastilles: { id: 'profilV2-pastilles', valeur: function(w) { return w['Pastille gout']; }, inconnu: '', quoi: 'pastilles',
    classe: function(nom) { return classePastilleV2(nom); }, filtre: 'pastille', moities: ['Rouge', 'Blanc'], max: 20 },
  // la 4e (5 nov. 2026, l'utilisateur) : le cépage principal (nom commun : Garnacha compte avec Grenache), coupée en deux
  // comme les pastilles ; 12 cépages par moitié puis « Autres » (5 nov. : 7 laissaient « Autres » à 34 %) ; un cépage
  // non nommé (« Autres cépages ») ne compte pas
  cepages: { id: 'profilV2-cepages', valeur: function(w) {
      var c = decodeHTML(cepageDominant(w)).trim();
      return c && !/^autre/.test(cleCepageV2(c)) ? cepageCommunV2(c) : '';
    }, cle: cleCepageV2, inconnu: '', quoi: 'cépages', filtre: 'cepage', moities: ['Rouge', 'Blanc'], max: 12 }
};
var ZOOM_PROFIL_V2 = {};    // tarte → les valeurs d'un « Autres » ouvert (absente : toutes)
var PARTS_PROFIL_V2 = {};   // tarte → ses parts dessinées (ce que touche le doigt)

function ouvrirProfilV2() {
  ZOOM_PROFIL_V2 = {};
  montrerPageV2('profilV2Container');
  achatsV2(' ').then(rendreProfilV2).catch(function(err) { retourAccueilV2('Profil : ' + causeServeurV2(err)); });
}

function fermerProfilV2() {
  cacherPageV2('profilV2Container');
}

// Les entrées (achats, ou bus : { codebarre, codeSAQ }) regroupées par une valeur de leur vin (t.valeur(vin, entrée)),
// de la plus grande part à la plus petite ; PAYS_TARTE_V2 parts, puis « Autres (N quoi) » (ses valeurs dans membres).
// Sans valeur : la part t.inconnu, ou rien si elle est vide (les pastilles : la tarte ne parle que de goût). t.classe(nom),
// facultative : la couleur d'une part (sa classe CSS) ; '' = sa nuance d'or. t.cote(nom), facultative : la moitié où
// se centre la part (« gauche » / « droite »). seulement : les valeurs gardées.
// Une même valeur écrite autrement (« Pinot noir », « Pinot Noir », « pinot noir » — 5 nov. 2026) compte UNE fois, sous
// l'écriture la plus fréquente : t.cle(valeur), sinon sans majuscules ni accents.
function partsParV2(liste, t, seulement) {
  var vinDe = indexVinsHistoV2();
  var cleDe = t.cle || function(v) { return normaliserRechercheV2(v).trim(); };
  var garder = seulement ? seulement.map(cleDe) : null;
  var compte = {}, ecritures = {}, inconnu = t.inconnu;
  (liste || []).forEach(function(h) {
    var w = vinDe(h), v = decodeHTML(t.valeur(w, h) || '').trim() || inconnu;
    if (!v) return;
    var k = cleDe(v);
    if (garder && garder.indexOf(k) === -1) return;
    compte[k] = (compte[k] || 0) + 1;
    ecritures[k] = ecritures[k] || {};
    ecritures[k][v] = (ecritures[k][v] || 0) + 1;
  });
  var parts = Object.keys(compte).map(function(k) {
    var e = ecritures[k];
    return { nom: Object.keys(e).sort(function(a, b) { return e[b] - e[a] || a.localeCompare(b); })[0], n: compte[k] };
  }).sort(function(a, b) { return b.n - a.n || a.nom.localeCompare(b.nom); });
  var reste = parts.splice(t.max || PAYS_TARTE_V2);
  if (reste.length === 1) parts.push(reste[0]);
  else if (reste.length) parts.push({ nom: 'Autres (' + reste.length + ' ' + t.quoi + ')', n: reste.reduce(function(s, p) { return s + p.n; }, 0),
    membres: reste.map(function(p) { return p.nom; }) });
  if (t.classe) parts.forEach(function(p) { p.classe = t.classe(p.nom); });
  if (t.cote) parts.forEach(function(p) { p.moitie = t.cote(p.nom); });
  return parts;
}

// Une tarte coupée en deux (t.moities : la couleur de gauche, celle de droite) : les parts de chaque moitié, sur 100 % de sa
// couleur (p.total) ; les vins d'une autre couleur ne comptent pas. p.couleur : la couleur telle qu'écrite (le filtre de la Cave).
// zoom ({ membres, couleur } : un « Autres » ouvert) : ses valeurs seulement, de sa couleur, dans SA moitié, sur 100 %
// (5 nov. 2026, l'utilisateur : une tarte entière mettait des rouges à droite).
function partsMoitiesV2(liste, t, zoom) {
  var vinDe = indexVinsHistoV2(), out = [];
  t.moities.forEach(function(couleur, k) {
    if (zoom && couleurClasseV2(zoom.couleur) !== couleurClasseV2(couleur)) return;
    var siens = (liste || []).filter(function(h) {
      var c = vinDe(h).Couleur || h.couleur;
      return couleurConnueV2(c) && couleurClasseV2(c) === couleurClasseV2(couleur);
    });
    var parts = partsParV2(siens, t, zoom ? zoom.membres : null), total = parts.reduce(function(n, p) { return n + p.n; }, 0);
    parts.forEach(function(p) { p.moitie = k ? 'droite' : 'gauche'; p.total = total; p.couleur = couleur; });
    out = out.concat(parts);
  });
  return out;
}

// Les couleurs : chaque part prend la couleur de son vin (.vin-*, comme la bande des cartes)
function classeCouleurTarteV2(nom) { return nom === 'Couleur inconnue' || nom.indexOf('Autres') === 0 ? '' : couleurClasseV2(nom); }

// Les pastilles : chaque part prend la couleur de sa pastille à la SAQ (30 oct. 2026, l'utilisateur) ; une pastille que
// la SAQ ne colore pas (« Corsé et fumé ») et « Autres » gardent leur nuance d'or
// Les pastilles de goût de la SAQ, sous leur nom (la liste du crayon de la fiche ; une couleur chacune, .pastille-*)
var PASTILLES_SAQ_V2 = ['Délicat et léger', 'Fruité et vif', 'Aromatique et rond', 'Fruité et doux', 'Fruité et extra-doux', 'Fruité et léger', 'Fruité et généreux', 'Aromatique et souple', 'Aromatique et charnu'];
function clePastilleV2(nom) { return normaliserRechercheV2(nom).trim().replace(/\s+et\s+/, '-').replace(/\s+/g, '-'); }
function classePastilleV2(nom) {
  var k = clePastilleV2(nom);
  return PASTILLES_SAQ_V2.some(function(p) { return clePastilleV2(p) === k; }) ? 'pastille-' + k : '';
}

// L'ordre des parts sur le cercle, dans le sens des aiguilles : la 1re (la plus grande) centrée en haut, les parts du côté
// droit (les plus grandes près du haut), la 2e (qui tombe ainsi en bas), puis celles du côté gauche. Chaque part va du côté
// le moins chargé : les deux côtés pèsent à peu près pareil (l'utilisateur, 28 oct. 2026).
function ordreTarteV2(parts) {
  var droite = [], gauche = [], sd = 0, sg = 0;
  parts.slice(2).forEach(function(p) {
    if (sd <= sg) { droite.push(p); sd += p.n; } else { gauche.push(p); sg += p.n; }
  });
  return parts.slice(0, 1).concat(droite, parts.slice(1, 2), gauche.reverse());
}

// La tarte (SVG) : les parts placées par ordreTarteV2, mais écrites dans l'ordre du rang (leur nuance d'or suit ce rang : CSS).
// La 1re et la 2e ont leur nom et leur % au-dessus et au-dessous de la tarte ; les autres, à côté de leur part, reliés à elle
// par un trait fin. D'un même côté, les écritures s'écartent pour ne pas se chevaucher.
// t : la tarte (TARTES_PROFIL_V2), pour le toucher d'une part (toucherPartProfilV2).
// Coupée en deux (parts de partsMoitiesV2) : chaque moitié sur 100 % de sa couleur, la plus grande part en haut, et toutes
// les écritures à côté de leur part (à gauche pour la moitié gauche, à droite pour l'autre).
function tarteV2(parts, t) {
  var total = parts.reduce(function(s, p) { return s + p.n; }, 0);
  var cx = 230, r = 90, ecart = 34, f = function(v) { return v.toFixed(1); };
  var pt = function(a, rayon) { return [cx + rayon * Math.cos(a), rayon * Math.sin(a)]; };
  var place = [], moities = parts.some(function(p) { return p.moitie; });
  var poser = function(liste, angle, tour) {
    liste.forEach(function(p) {
      var fin = angle + tour * p.n / (p.total || total);
      place[parts.indexOf(p)] = [angle, fin];
      angle = fin;
    });
  };
  var gauche = parts.filter(function(p) { return p.moitie === 'gauche'; }), droite = parts.filter(function(p) { return p.moitie === 'droite'; });
  if (moities && parts.every(function(p) { return p.total; })) {   // chaque moitié sur 100 % de sa couleur
    poser(gauche.reverse(), Math.PI / 2, Math.PI);   // du bas vers le haut
    poser(droite, -Math.PI / 2, Math.PI);           // du haut vers le bas
  } else if (moities) {   // une seule tarte (les Couleurs) : la gauche centrée à 9 h, la droite à 3 h
    var sg = gauche.reduce(function(n, p) { return n + p.n; }, 0) / total;
    poser(gauche, Math.PI - Math.PI * sg, 2 * Math.PI);
    poser(droite, Math.PI + Math.PI * sg, 2 * Math.PI);
  } else poser(ordreTarteV2(parts), -Math.PI / 2 - Math.PI * parts[0].n / total, 2 * Math.PI);
  // coupée en deux : les parts de chaque moitié dans leur groupe, leur nuance d'or suit leur rang DANS la moitié (CSS)
  var formes = '', ecritures = '', cotes = { droite: [], gauche: [] }, haut = -r - 10, bas = r + 10, groupes = { gauche: '', droite: '' };
  parts.forEach(function(p, i) {
    var debut = place[i][0], fin = place[i][1], m = (debut + fin) / 2, pct = Math.round(p.n / (p.total || total) * 100);
    var a = pt(debut, r), b = pt(fin, r), arc = fin - debut;
    var classe = (p.classe ? ' class="' + p.classe + '"' : '') + ' onclick="toucherPartProfilV2(\'' + t + '\', ' + i + ')"';
    var forme = arc >= 2 * Math.PI - 1e-9 ? '<circle' + classe + ' cx="' + cx + '" cy="0" r="' + r + '"/>'
      : '<path' + classe + ' d="M' + cx + ' 0 L' + f(a[0]) + ' ' + f(a[1]) + ' A' + r + ' ' + r + ' 0 ' + (arc > Math.PI ? 1 : 0) + ' 1 ' + f(b[0]) + ' ' + f(b[1]) + 'Z"/>';
    if (p.moitie) groupes[p.moitie] += forme; else formes += forme;
    // sous le nom : le %
    var toucher = ' onclick="toucherPartProfilV2(\'' + t + '\', ' + i + ')"';
    var lignes = function(x) { return '<tspan x="' + x + '" dy="16">' + pct + ' %</tspan>'; };
    if (i < 2 && !moities) {   // le nom, puis le reste dessous : juste au-dessus de la tarte (la 1re), juste au-dessous (la 2e)
      var x = f(pt(m, r)[0]), enBas = i === 1;
      ecritures += '<text x="' + x + '" y="' + (enBas ? r + 22 : -r - 28) + '" text-anchor="middle"' + toucher + '>' + p.nom + lignes(x) + '</text>';
      if (enBas) bas = Math.max(bas, r + 44); else haut = Math.min(haut, -r - 46);
      return;
    }
    cotes[Math.cos(m) >= 0 ? 'droite' : 'gauche'].push({ nom: p.nom, lignes: lignes, toucher: toucher, bord: pt(m, r), y: pt(m, r + 20)[1] });
  });
  Object.keys(cotes).forEach(function(cote) {
    var x = cote === 'droite' ? cx + r + 30 : cx - r - 30;
    cotes[cote].sort(function(e1, e2) { return e1.y - e2.y; }).forEach(function(e, i, l) {
      if (i && e.y < l[i - 1].y + ecart) e.y = l[i - 1].y + ecart;
      ecritures += '<line x1="' + f(e.bord[0]) + '" y1="' + f(e.bord[1]) + '" x2="' + (cote === 'droite' ? x - 6 : x + 6) + '" y2="' + f(e.y) + '"/>' +
        '<text x="' + x + '" y="' + f(e.y - 3) + '"' + (cote === 'droite' ? '' : ' text-anchor="end"') + e.toucher + '>' + e.nom + e.lignes(x) + '</text>';
      haut = Math.min(haut, e.y - 20); bas = Math.max(bas, e.y + 20);
    });
  });
  if (moities) formes = '<g>' + groupes.gauche + '</g><g>' + groupes.droite + '</g>';
  // un « Autres » ouvert n'a que sa moitié : l'autre, vide, porte le rond du retour à la tarte entière (5 nov. 2026,
  // l'utilisateur) — le rond de l'app, avec une petite tarte rouge et blanc dedans
  if (moities && ZOOM_PROFIL_V2[t] && (!groupes.gauche || !groupes.droite)) {
    var rx = groupes.gauche ? cx + r / 2 : cx - r / 2;
    formes += '<g onclick="toutProfilV2(\'' + t + '\')"><circle class="retour-tarte" cx="' + rx + '" cy="0" r="22"/>' +
      '<path class="vin-rouge" d="M' + rx + ' -10 A10 10 0 0 0 ' + rx + ' 10Z"/><path class="vin-blanc" d="M' + rx + ' -10 A10 10 0 0 1 ' + rx + ' 10Z"/></g>';
  }
  return '<svg viewBox="0 ' + f(haut) + ' ' + (2 * cx) + ' ' + f(bas - haut) + '">' + formes + ecritures + '</svg>';
}

function rendreProfilV2() {
  var achats = ALL_ACHATS || [];
  Object.keys(TARTES_PROFIL_V2).forEach(function(t) {
    var d = TARTES_PROFIL_V2[t];
    var parts = PARTS_PROFIL_V2[t] = (d.moities ? partsMoitiesV2 : partsParV2)(achats, d, ZOOM_PROFIL_V2[t]);
    var el = document.getElementById(TARTES_PROFIL_V2[t].id);
    // un « Autres » ouvert : le rond « Tout » remet la tarte entière
    el.innerHTML = parts.length ? tarteV2(parts, t) + (ZOOM_PROFIL_V2[t] && !d.moities ? '<div class="roundel" onclick="toutProfilV2(\'' + t + '\')">' +
      '<span class="roundel-anneau"></span><span class="roundel-barre">Tout</span></div>' : '') : '';
    el.style.display = parts.length ? '' : 'none';   // une tarte vide n'est pas montrée (ni la ligne qui la sépare)
  });
  if (!achats.length) {
    var pays = document.getElementById('profilV2-pays');
    pays.innerHTML = '<div class="texte-secondaire">Aucun achat : Outils → Importer des achats</div>';
    pays.style.display = '';
  }
  Array.prototype.forEach.call(document.querySelectorAll('#profilV2Container svg'), cadrerTarteV2);
}

// Toucher une part (30 oct. 2026, l'utilisateur) : « Autres » s'ouvre en sa propre tarte ; une autre part ouvre la Cave
// filtrée sur ce qu'elle représente — tous les vins, voilés compris (le Profil compte les achats) ; le ✕ de la Cave ramène ici
function toucherPartProfilV2(t, i) {
  var p = (PARTS_PROFIL_V2[t] || [])[i], d = TARTES_PROFIL_V2[t];
  if (!p) return;
  if (p.membres) { ZOOM_PROFIL_V2[t] = d.moities ? { membres: p.membres, couleur: p.couleur } : p.membres; rendreProfilV2(); return; }
  if (p.nom === d.inconnu) return;
  naviguerV2(function() {
    viderFiltresV2('caveV2');
    filtresCaveV2[d.filtre] = p.nom;
    if (p.couleur) filtresCaveV2.couleur = p.couleur;   // une moitié : sa couleur aussi
    ouvrirCaveV2();
    CAVE_DEPUIS_PROFIL_V2 = true;
  });
}

function toutProfilV2(t) {
  delete ZOOM_PROFIL_V2[t];
  rendreProfilV2();
}

// Une écriture de côté qui dépasse (un long nom : « Aromatique et charnu ») : la tarte s'élargit des deux côtés, toujours centrée
function cadrerTarteV2(svg) {
  var b = svg.getBBox(), v = svg.viewBox.baseVal;
  var d = Math.max(0, v.x - b.x, (b.x + b.width) - (v.x + v.width));
  if (d) svg.setAttribute('viewBox', (v.x - d - 4) + ' ' + v.y + ' ' + (v.width + 2 * d + 8) + ' ' + v.height);
}
