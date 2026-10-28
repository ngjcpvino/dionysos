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
  var groupes = Object.values(grouped);

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
    var mets = g.mets.slice().sort(function(a, b){ return (parseInt(b.bonAccord) || 0) - (parseInt(a.bonAccord) || 0); });
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
