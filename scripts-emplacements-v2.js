/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-EMPLACEMENTS-V2.JS
   Emplacements et Tri Dionysos
============================================================ */

// ==================== EMPLACEMENTS V2 ====================
var filtresEmpV2 = { meuble: '', rangee: '', espace: '', cepage: '', couleur: '', pays: '', appellation: '' };
// Mode d'affichage de la page (section « Afficher » du panneau) : le plan des
// meubles, ou l'une des six listes. La PORTÉE des listes vient du filtre Meuble.
var empV2Mode = 'plan';
var MODES_EMP_V2 = ['plan', 'doubles', 'cepdoubles', 'listemeuble', 'cepmanquants', 'appmanquante', 'fammanquante', 'menage'];

function ouvrirEmpV2() {
  document.getElementById('empV2Container').style.display = 'flex';
  remonterScrollV2('empV2Container');
  filtresEmpV2 = { meuble: '', rangee: '', espace: '', cepage: '', couleur: '', pays: '', appellation: '' };
  empV2Mode = 'plan';
  remplirFiltresEmpV2();
  rendreEmpV2();
}

// Rend ce que le mode courant demande.
function rendreEmpV2() {
  if (empV2Mode === 'plan') afficherEmpV2();
  else if (empV2Mode === 'menage') afficherMenageEmpV2(); // les filtres ne s'y appliquent pas : toute la cave
  else afficherListeEmpV2(empV2Mode);
}

function choisirModeEmpV2(mode) {
  empV2Mode = mode;
  remplirFiltresEmpV2();
  if (mode === 'menage') ouvrirMenageEmpV2(); else rendreEmpV2();
  fermerFiltresEmpV2();
}

function fermerEmpV2() {
  fermerFiltresEmpV2();
  document.getElementById('empV2Container').style.display = 'none';
}

function ouvrirFiltresEmpV2() { clicLoupeV2('empV2', reinitialiserFiltresEmpV2); }
function fermerFiltresEmpV2() {
  document.getElementById('empV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('empV2-filtres').classList.remove('ouvert');
}

// Bouteilles rangées (statut actif + emplacement complet)
function bouteillesRangeesEmpV2() {
  return (ALL_DATA || []).filter(function(i){
    var statut = i.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti') return false;
    return !!(i.Meuble && i.Rangee && i.Espace);
  });
}

// Bouteilles à ranger (actives, sans emplacement complet)
function bouteillesARangerEmpV2() {
  return (ALL_DATA || []).filter(function(i){
    var statut = i.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti' || statut === 'Suggestion') return false;
    return i.bottle && i.bottle > 0 && !(i.Meuble && i.Rangee && i.Espace);
  });
}

function remplirFiltresEmpV2() {
  var f = filtresEmpV2;
  var base = bouteillesRangeesEmpV2();

  var meubles = uniqueValeursAchat(base, 'Meuble');
  if (bouteillesARangerEmpV2().length) meubles.push('À ranger');
  var forRangee = f.meuble ? base.filter(function(i){ return String(i.Meuble) === String(f.meuble); }) : base;
  var rangees = uniqueValeursAchat(forRangee, 'Rangee');
  var forEspace = base.filter(function(i){
    return (!f.meuble || String(i.Meuble) === String(f.meuble)) && (!f.rangee || String(i.Rangee) === String(f.rangee));
  });
  var espaces = uniqueValeursAchat(forEspace, 'Espace');

  // Cépage / Couleur / Pays / Appellation : puisés dans ce que le mode courant peut montrer.
  // Appellation suit le Pays : un pays choisi → seulement ses appellations.
  var baseVin = baseFiltresVinEmpV2();
  var listes = { meuble: meubles, rangee: rangees, espace: espaces,
                 cepage: uniqueCepagesEmpV2(baseVin), couleur: uniqueValeursAchat(baseVin, 'Couleur'), pays: uniqueValeursAchat(baseVin, 'Pays'),
                 appellation: appellationsEmpV2(baseVin) };
  ['meuble','rangee','espace','cepage','couleur','pays','appellation'].forEach(function(cle){
    var cur = f[cle];
    var menu = document.getElementById('empV2-f-' + cle + '-menu');
    menu.innerHTML = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="choisirFiltreEmpV2(\'' + cle + '\', \'\')">Tous</div>' + listes[cle].map(function(v){
      return '<div class="item-liste' + classeChoixV2(String(v), String(cur)) + '" onclick="choisirFiltreEmpV2(\'' + cle + '\', \'' + String(v).replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('empV2-f-' + cle + '-display');
    if (disp) disp.textContent = libelleChoixV2(cur, ({meuble:'Meuble',rangee:'Rangée',espace:'Espace',cepage:'Cépage',couleur:'Couleur',pays:'Pays',appellation:'Appellation'})[cle]);
  });

  // Afficher : le mode courant est allumé ; les deux modes « dans un meuble »
  // n'apparaissent que si un meuble est choisi.
  MODES_EMP_V2.forEach(function(m){
    var el = document.getElementById('empV2-mode-' + m);
    if (el) el.classList.toggle('actif', empV2Mode === m);
  });
  var cepd = document.getElementById('empV2-mode-cepdoubles');
  if (cepd) cepd.style.display = f.meuble ? 'block' : 'none';
  var lstm = document.getElementById('empV2-mode-listemeuble');
  if (lstm) lstm.style.display = (f.meuble && f.meuble !== 'À ranger') ? 'block' : 'none';

  // Loupe : OR si un vrai filtre est actif (jamais pour le mode)
  var loupe = document.getElementById('empV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(f.meuble || f.rangee || f.espace || f.cepage || f.couleur || f.pays || f.appellation));
}

// Appellations du menu : celles du pays choisi seulement (cascade Pays → Appellation)
function appellationsEmpV2(baseVin) {
  var p = filtresEmpV2.pays;
  return uniqueValeursAchat(baseVin.filter(function(i){ return passeFiltreV2(p, i.Pays); }), 'Appellation');
}

// Les vins dans lesquels puiser les valeurs de Cépage / Couleur / Pays.
// Les listes « manquants » montrent des vins hors stock : elles puisent partout.
function baseFiltresVinEmpV2() {
  var f = filtresEmpV2;
  if (empV2Mode === 'cepmanquants' || empV2Mode === 'appmanquante' || empV2Mode === 'fammanquante') {
    return (ALL_DATA || []).filter(function(i){ return !estPropositionV2(i); });
  }
  if (f.meuble === 'À ranger') return bouteillesARangerEmpV2();
  return bouteillesRangeesEmpV2().filter(function(i){
    return (!f.meuble || String(i.Meuble) === String(f.meuble)) &&
      (!f.rangee || String(i.Rangee) === String(f.rangee)) &&
      (!f.espace || String(i.Espace) === String(f.espace));
  });
}

// Un menu de cépages : le cépage dominant de chaque vin, sans doublon.
function uniqueCepagesEmpV2(liste) {
  var vues = {};
  var out = [];
  liste.forEach(function(i){
    var c = cepageDominant(i);
    if (!c) return;
    c = cepageCommunV2(decodeHTML(c));
    var k = cleCepageV2(c);
    if (!vues[k]) { vues[k] = true; out.push(c); }
  });
  out.sort(function(a, b){ return a.localeCompare(b); });
  return out;
}

// Cépage · Couleur · Pays · Appellation, appliqués aux vins d'une liste.
function vinPasseFiltresEmpV2(w) {
  var f = filtresEmpV2;
  return passeFiltreV2(f.cepage, w.Cepage, contientCepageV2) &&
    passeFiltreV2(f.couleur, w.Couleur) &&
    passeFiltreV2(f.pays, w.Pays) &&
    passeFiltreV2(f.appellation, w.Appellation, memeTexteV2);
}
function groupesFiltresEmpV2(groupes) {
  return groupes.filter(function(g){ return vinPasseFiltresEmpV2(g.wine); });
}

function basculerFiltreEmpV2(cle) {
  var menu = document.getElementById('empV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['meuble','rangee','espace','cepage','couleur','pays','appellation'].forEach(function(k){
    var m = document.getElementById('empV2-f-' + k + '-menu');
    if (m) m.classList.remove('ouvert');
  });
  if (!ouvert) { menu.classList.add('ouvert'); annulerFermetureMenuV2(menu.id); }
}

function choisirFiltreEmpV2(cle, valeur) {
  // Meuble · Rangée · Espace décident de ce qui est dessiné : « seulement » (pas de « sauf »)
  filtresEmpV2[cle] = (cle === 'meuble' || cle === 'rangee' || cle === 'espace') ? valeur : cycleFiltreV2(filtresEmpV2[cle], valeur);
  fermerMenuApresV2('empV2-f-' + cle + '-menu');
  if (cle === 'meuble') { filtresEmpV2.rangee = ''; filtresEmpV2.espace = ''; }
  if (cle === 'rangee') { filtresEmpV2.espace = ''; }
  // Nouveau pays : une appellation qui n'y existe pas se vide (jamais une liste vide sans raison)
  if (cle === 'pays' && filtresEmpV2.appellation &&
      !appellationsEmpV2(baseFiltresVinEmpV2()).some(function(a){ return memeTexteV2(a, valeurChoixV2(filtresEmpV2.appellation)); })) {
    filtresEmpV2.appellation = '';
  }
  // Deux modes n'existent que dans un meuble : sans meuble, retour au plan.
  if (!filtresEmpV2.meuble && (empV2Mode === 'cepdoubles' || empV2Mode === 'listemeuble')) empV2Mode = 'plan';
  remplirFiltresEmpV2();
  rendreEmpV2();
}

function reinitialiserFiltresEmpV2() {
  filtresEmpV2 = { meuble: '', rangee: '', espace: '', cepage: '', couleur: '', pays: '', appellation: '' };
  empV2Mode = 'plan';
  ['meuble','rangee','espace','cepage','couleur','pays','appellation'].forEach(function(k) {
    var m = document.getElementById('empV2-f-' + k + '-menu');
    if (m) m.classList.remove('ouvert');
  });
  remplirFiltresEmpV2();
  rendreEmpV2();
  fermerFiltresEmpV2();
}

function empCarteVinV2(w, droite, versFiche) {
  var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
  var nom = decodeHTML(w.Nom || '—');
  var sous = sousVinV2(w);
  var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
  var onclick = cb ? ' onclick="' + (versFiche ? 'ouvrirFicheDepuisListeEmpV2' : 'deplacerDepuisEmpV2') + '(\'' + cb + '\')"' : '';
  return '<div class="carte ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
         '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
         '<div class="carte-droite">' + (droite || '') + '</div></div>';
}

// Vue par défaut : groupé meuble → rangée → cartes
function afficherEmpV2() {
  empV2Mode = 'plan';
  var f = filtresEmpV2;
  var modeARanger = (f.meuble === 'À ranger');
  var aRanger = bouteillesARangerEmpV2();
  var montrerARanger = aRanger.length && (modeARanger || (!f.meuble && !f.rangee && !f.espace));
  var base = modeARanger ? [] : bouteillesRangeesEmpV2().filter(function(i){
    return (!f.meuble || String(i.Meuble) === String(f.meuble)) &&
      (!f.rangee || String(i.Rangee) === String(f.rangee)) &&
      (!f.espace || String(i.Espace) === String(f.espace));
  });

  base.sort(function(a, b){
    if (String(a.Meuble) !== String(b.Meuble)) return String(a.Meuble).localeCompare(String(b.Meuble));
    if (parseInt(a.Rangee) !== parseInt(b.Rangee)) return parseInt(a.Rangee) - parseInt(b.Rangee);
    return parseInt(a.Espace) - parseInt(b.Espace);
  });

  var div = document.getElementById('empV2-cartes');
  var totalEmp = base.length + (montrerARanger ? aRanger.length : 0);
  document.getElementById('empV2-compte').textContent = totalEmp + ' bouteille' + (totalEmp > 1 ? 's' : '');
  if (totalEmp === 0) { div.innerHTML = '<div class="texte-secondaire">Aucune bouteille rangée</div>'; return; }

  // index des bouteilles présentes par meuble|rangee|espace
  var parPlace = {};
  base.forEach(function(w){
    parPlace[w.Meuble + '|' + w.Rangee + '|' + w.Espace] = w;
  });

  // Filtres de vin (Cépage, Couleur, Pays, Appellation) sur le plan : ce qui n'y répond pas s'estompe —
  // rangée ouverte : les autres bouteilles et les espaces vides ; rangée fermée : la rangée entière si rien n'y répond.
  var filtreVin = !!(f.cepage || f.couleur || f.pays || f.appellation);

  // meubles à dessiner : celui filtré, sinon les 3 de CONFIG (ordre alphabétique)
  var meubles = modeARanger ? [] : (f.meuble ? [f.meuble] : Object.keys(CONFIG.meubles || {}).sort(function(a,b){ return a.localeCompare(b); }));

  var html = '';
  meubles.forEach(function(meuble){
    var rangeesDef = (CONFIG.meubles && CONFIG.meubles[meuble]) ? CONFIG.meubles[meuble] : {};
    html += '<div class="emp-bloc"><div class="emp-meuble">' + meuble + '</div>';
    Object.keys(rangeesDef).sort(function(a,b){ return parseInt(a) - parseInt(b); }).forEach(function(rangee){
      if (f.rangee && String(rangee) !== String(f.rangee)) return;
      var espacesDef = rangeesDef[rangee] || [];
      var nb = espacesDef.length;
      var occ = 0;
      var repondent = 0;
      var ronds = [];
      espacesDef.forEach(function(esp){
        var w = parPlace[meuble + '|' + rangee + '|' + esp];
        if (w) occ++;
        var passe = !!w && vinPasseFiltresEmpV2(w);
        if (passe) repondent++;
        var estompe = (filtreVin && !passe) ? ' estompe' : '';
        var photo = (w && w['Photo URL']) ? w['Photo URL'] : '';
        var cb = (w && w['Code-barres']) ? w['Code-barres'].toString().trim().replace(/\s+/g, '') : '';
        var coul = w ? 'var(--' + couleurClasseV2(w.Couleur) + ')' : '';
        ronds.push('<div class="emp-espace"><div class="cercle' + estompe + '" data-photo="' + photo + '" data-cb="' + cb + '" data-row="' + (w ? w.row : '') + '" data-couleur="' + coul + '"></div><span class="emp-espace-num">' + esp + '</span></div>');
      });
      // 7 espaces = quinconce réel : bas 1-3-5-7, haut 2-4-6
      var lignes;
      if (nb === 7) {
        lignes = '<div class="ligne-ronds haut">' + [ronds[1], ronds[3], ronds[5]].join('') + '</div>' +
                 '<div class="ligne-ronds bas">' + [ronds[0], ronds[2], ronds[4], ronds[6]].join('') + '</div>';
      } else {
        lignes = '<div class="ligne-ronds">' + ronds.join('') + '</div>';
      }
      var compteClasse = occ < nb ? ' emp-compte-libre' : '';
      var rangeeEstompee = (filtreVin && !repondent) ? ' estompee' : '';
      html += '<div class="emp-rangee' + rangeeEstompee + '" data-meuble="' + meuble + '" data-rangee="' + rangee + '">' +
                '<span class="emp-rangee-nom">Rangée ' + rangee + '</span>' +
                '<div class="emp-ronds">' + lignes + '</div>' +
                '<span class="emp-compte' + compteClasse + '">' + occ + '/' + nb + '</span>' +
              '</div>';
    });
    html += '</div>';
  });
  if (montrerARanger) {
    var rondsAR = aRanger.map(function(w){
      var photo = w['Photo URL'] || '';
      var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
      var coul = 'var(--' + couleurClasseV2(w.Couleur) + ')';
      var estompe = (filtreVin && !vinPasseFiltresEmpV2(w)) ? ' estompe' : '';
      return '<div class="cercle' + estompe + '" data-photo="' + photo + '" data-cb="' + cb + '" data-row="' + w.row + '" data-couleur="' + coul + '"></div>';
    }).join('');
    html += '<div class="emp-bloc"><div class="emp-meuble">À ranger</div>' +
            '<div class="emp-rangee a-ranger">' +
              '<div class="emp-ronds"><div class="ligne-ronds">' + rondsAR + '</div></div>' +
              '<span class="emp-compte">' + aRanger.length + '</span>' +
            '</div></div>';
  }
  div.innerHTML = html;
  brancherTirerRangeesEmpV2();
}

// Tirer une rangée : gros ronds + photo ; une seule ouverte à la fois
function brancherTirerRangeesEmpV2() {
  var rangees = document.querySelectorAll('#empV2-cartes .emp-rangee');
  Array.prototype.forEach.call(rangees, function(el){
    el.addEventListener('click', function(){
      var dejaOuvert = el.classList.contains('ouvert');
      Array.prototype.forEach.call(rangees, function(r){
        r.classList.remove('ouvert');
        Array.prototype.forEach.call(r.querySelectorAll('.cercle'), function(c){ c.innerHTML = ''; c.style.borderColor = ''; });
      });
      if (!dejaOuvert) {
        el.classList.add('ouvert');
        Array.prototype.forEach.call(el.querySelectorAll('.cercle'), function(c){
          var p = c.getAttribute('data-photo');
          c.innerHTML = p ? '<img src="' + p + '" alt="">' : '';
          c.style.borderColor = c.getAttribute('data-couleur') || '';
          var cb = c.getAttribute('data-cb');
          if (cb) {
            var rowRond = c.getAttribute('data-row');
            c.addEventListener('click', function(ev){
              ev.stopPropagation();
              var liste = el.classList.contains('a-ranger') ? bouteillesARangerEmpV2() : parcoursMeubleEmpV2(el.getAttribute('data-meuble'));
              ouvrirApresTap(function(){ ouvrirPhotoEmpV2(cb, liste, rowRond); });
            });
          } else {
            c.addEventListener('click', function(ev){
              ev.stopPropagation();
              naviguerV2(startScanFromHomeV2);
            });
          }
        });
      }
    });
  });
}

// Parcours d'un meuble en ordre physique : rangée puis espace
function parcoursMeubleEmpV2(meuble) {
  return bouteillesRangeesEmpV2().filter(function(i){
    return String(i.Meuble) === String(meuble);
  }).sort(function(a, b){
    if (parseInt(a.Rangee) !== parseInt(b.Rangee)) return parseInt(a.Rangee) - parseInt(b.Rangee);
    return parseInt(a.Espace) - parseInt(b.Espace);
  });
}

// ==================== TRI ŒNOPHILE (ex-« Ménage de la cave ») — v3 du 26 oct. 2026 ====================
// Emplacements → Afficher → « Tri Dionysos ». L'app calcule et dicte LA TOURNÉE de l'utilisateur, en 7 arrêts —
// 1. au cellier (choisir, sors, déplace) · 2. au Pigeonnier (sors, déplace, place ce qui vient du cellier) ·
// 3. en bas, à la Réserve (sors, range ce qui est descendu) · 4. « À ranger » (sors, pose) ·
// 5. à la Réserve en remontant (range ce qui vient d'« À ranger ») · 6. au Pigeonnier (place) · 7. au cellier (place).
// But (utilisateur) : le plus de cépages possible par meuble, puis le plus d'appellations.
// Règles (utilisateur, 25-27 oct.) :
// - une seule règle pour le cellier, le Pigeonnier et la Réserve, dans cet ordre : les cépages absents des meubles
//   du dessus (et du meuble lui-même), puis les appellations absentes, puis le reste — le plus ancien d'abord
//   (dernière fois bu quand l'Historique le sait, sinon la date d'arrivée de la bouteille) ;
// - cellier : blancs rangées 1-3, rouges 4-6, C-7-1 = une vraie place pour un rouge ; le reste de la rangée 7 est une
//   tablette pour les formats embêtants : l'assistant n'y touche pas. Seules ses places libres se remplissent ; ses
//   doublons, c'est l'utilisateur qui choisit ceux qu'il cède (« tu en as 3, cèdes-en 2 ») ;
// - Pigeonnier et Réserve : tout est reclassé ; à égalité, une bouteille déjà en place garde sa place ; aucune place
//   vide tant qu'une bouteille qui convient attend plus bas. La Réserve ne classe pas les couleurs ;
// - « À ranger » (la « mini mini SAQ » de l'utilisateur) : le reste ;
// - un rouge chez les blancs (ou l'inverse) rejoint sa couleur dans son meuble, sinon il suit la cascade ;
// - couleur douteuse, cépage non nommé ou manquant = jamais déplacé (« À vérifier ») ; « pas celle-là » = elle reste ;
// - la boîte de transport : chaque bouteille sortie prend la première case libre (« case 1-1 »), libérée à la pose ;
// - les cases cochées restent gardées dans le téléphone ; un seul « Enregistrer » à la fin.
// Zones : meubles et rangées de l'onglet config — si l'aménagement change, corriger ici.
var ZONES_MENAGE_V2 = {
  Cellier: [
    { nom: 'blancs', rangees: ['1', '2', '3'], couleur: 'vin-blanc' },
    { nom: 'rouges', rangees: ['4', '5', '6'], couleur: 'vin-rouge' },
    { nom: 'place du rouge', rangees: ['7'], espaces: ['1'], couleur: 'vin-rouge' }
  ],
  Pigeonnier: [
    { nom: 'blancs', rangees: ['1', '2', '3'], couleur: 'vin-blanc' },
    { nom: 'rouges', rangees: ['4', '5', '6', '7', '8', '9'], couleur: 'vin-rouge' }
  ]
};
var NOMS_COULEURS_MENAGE_V2 = { 'vin-blanc': 'blancs', 'vin-rouge': 'rouges', 'vin-bulles': 'bulles' };

// La tablette : rangée 7 du cellier, sauf C-7-1
function tabletteMenageV2(p) { return !!p && memeTexteV2(p.meuble, 'Cellier') && String(p.rangee) === '7' && String(p.espace) !== '1'; }

// cedes[bouteille] = doublon cédé par l'utilisateur ; refus[bouteille] = « pas celle-là » (elle ne bouge pas) ;
// faits[ligne] = ligne cochée pendant la tournée. Gardés dans le téléphone jusqu'à l'enregistrement.
var MENAGE_V2 = { cedes: {}, refus: {}, faits: {} };
var CLE_STOCKAGE_MENAGE_V2 = 'dionysos-tri-7-arrets';   // nouvelle clé : les cases cochées de l'ancienne tournée ne valent plus

function garderMenageV2() {
  var M = MENAGE_V2;
  try { localStorage.setItem(CLE_STOCKAGE_MENAGE_V2, JSON.stringify({ cedes: M.cedes, refus: M.refus, faits: M.faits, quand: Date.now() })); } catch (e) {}
}
function reprendreMenageV2() {
  try {
    localStorage.removeItem('dionysos-tri');
    var s = JSON.parse(localStorage.getItem(CLE_STOCKAGE_MENAGE_V2) || 'null');
    if (s && s.quand && Date.now() - s.quand < 7 * 24 * 3600 * 1000) return { cedes: s.cedes || {}, refus: s.refus || {}, faits: s.faits || {} };
  } catch (e) {}
  return { cedes: {}, refus: {}, faits: {} };
}
function oublierMenageV2() { try { localStorage.removeItem(CLE_STOCKAGE_MENAGE_V2); } catch (e) {} }

// « Grenache (Cannonau) » : le nom commun, puis celui de la fiche s'il diffère
function libelleCepageMenageV2(b) {
  if (!b.cepNom) return '';
  return majusculeMenageV2(b.cepCommun) + (cleCepageV2(b.cepCommun) !== cleCepageV2(b.cepNom) ? ' (' + b.cepNom + ')' : '');
}
function majusculeMenageV2(t) { t = (t || '').toString(); return t.charAt(0).toUpperCase() + t.slice(1); }

function placeMenageV2(p) { return p ? p.meuble + '|' + p.rangee + '|' + p.espace : ''; }
function libellePlaceMenageV2(p) {
  if (!p || !p.meuble) return 'À ranger';
  return p.meuble.toString().substring(0, 1).toUpperCase() + '-' + p.rangee + '-' + p.espace;
}
// 'cellier' | 'pigeonnier' | 'reserve' | 'aranger' | 'autre'
function lieuMenageV2(p) {
  if (!p || !p.meuble) return 'aranger';
  return memeTexteV2(p.meuble, 'Cellier') ? 'cellier' : memeTexteV2(p.meuble, 'Pigeonnier') ? 'pigeonnier' : memeTexteV2(p.meuble, 'Réserve') ? 'reserve' : 'autre';
}

// Dernier passage à table de chaque vin (Historique, « jj-mm-aaaa ») → { quand, note } par code SAQ / code-barres
function derniersPassagesMenageV2() {
  var der = {};
  (ALL_HISTORIQUE || []).forEach(function(h) {
    var m = (h.date || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return;
    var quand = new Date(+m[3], +m[2] - 1, +m[1]).getTime();
    [h.codeSAQ, h.codebarre].forEach(function(c) {
      c = (c || '').toString().trim().replace(/^0+/, '');
      if (c && (!der[c] || der[c].quand < quand)) der[c] = { quand: quand, note: parseInt(h.bonAccord, 10) || 0 };
    });
  });
  return der;
}

// Zone d'une place (null = hors des zones : Réserve, tablette, Spiritueux…)
function zoneMenageV2(p) {
  if (!p || !p.meuble) return null;
  var meuble = memeTexteV2(p.meuble, 'Cellier') ? 'Cellier' : memeTexteV2(p.meuble, 'Pigeonnier') ? 'Pigeonnier' : null;
  if (!meuble) return null;
  return ZONES_MENAGE_V2[meuble].filter(function(z) {
    return z.rangees.indexOf(String(p.rangee)) !== -1 && (!z.espaces || z.espaces.indexOf(String(p.espace)) !== -1);
  })[0] || null;
}

// Les bouteilles PRÉSENTES de la cave (une bouteille achetée compte même si son « Racheter » est vide),
// avec lieu, couleur, cépage principal (nom commun), appellation, famille, dernier passage à table,
// ce qui la rend douteuse, et si elle est hors de sa zone de couleur.
function bouteillesMenageV2() {
  var der = derniersPassagesMenageV2();
  return (ALL_DATA || []).filter(function(i) {
    var statut = i.Statut || 'En stock';
    return i.bottle && i.bottle > 0 && statut !== 'Bu' && statut !== 'Sorti';
  }).map(function(i) {
    var place = (i.Meuble && i.Rangee && i.Espace) ? { meuble: i.Meuble.toString(), rangee: i.Rangee.toString(), espace: i.Espace.toString() } : null;
    var cepNom = decodeHTML(cepageDominant(i));
    var cepCommun = cepageCommunV2(cepNom);
    var codeSaq = (i['Code SAQ'] || '').toString().trim().replace(/^0+/, '');
    var codeCb = (i['Code-barres'] || '').toString().trim().replace(/^0+/, '');
    var b = {
      w: i, cle: i.row + '|' + i.bottle, vin: cleVinV2(i), lieu: lieuMenageV2(place), place: place, tablette: tabletteMenageV2(place),
      coul: couleurClasseV2(i.Couleur), cep: cleCepageV2(cepCommun), cepNom: cepNom, cepCommun: cepCommun,
      app: normaliserRechercheV2(decodeHTML(i.Appellation || '')), appNom: decodeHTML(i.Appellation || ''),
      fam: (i.Famille || '').toString().replace(/^'/, '').replace(/^0+/, ''),
      passe: der[codeSaq] || der[codeCb] || null, arrivee: Date.parse(i['Date d\'ajout'] || '') || 0, doute: '', horsZone: ''
    };
    // Douteux : jamais déplacé, listé « À vérifier »
    var texte = normaliserRechercheV2([i.Nom, i.Appellation, i.Cepage].join(' '));
    if (!/rouge|blanc|ros|bulle|mousseux|spiritueux/i.test(i.Couleur || '')) b.doute = 'Couleur manquante';
    else if (b.coul === 'vin-blanc' && /glera|prosecco|champagne|cremant|cava|mousseux|petillant|franciacorta/.test(texte)) b.doute = 'Des bulles notées « Blanc » ?';
    else if (/^autre/.test(b.cep)) b.doute = 'Cépage non nommé : inscris le vrai dans la fiche';
    else if (!b.cep && b.coul !== 'vin-spiritueux') b.doute = 'Cépage manquant : inscris-le dans la fiche';
    // Hors de sa zone : un rouge chez les blancs, ou l'inverse (les autres couleurs ne sont pas touchées)
    var z = zoneMenageV2(place);
    if (z && z.couleur !== b.coul && (b.coul === 'vin-blanc' || b.coul === 'vin-rouge')) {
      b.horsZone = (b.coul === 'vin-rouge' ? 'rouge' : 'blanc') + ' rangé chez les ' + z.nom;
    }
    return b;
  });
}

// « Le plus ancien d'abord » : la dernière fois bu quand l'Historique le sait (il est venu après le début de la
// consommation : « jamais bu » n'est pas fiable), sinon la date d'arrivée de la bouteille ; plus petit = « son tour »
function rangRotationMenageV2(b) { return b.passe ? b.passe.quand : (b.arrivee || 0); }

// Places d'un meuble (rangées données, ou toutes), dans l'ordre physique
function placesMenageV2(meuble, rangees) {
  var def = (CONFIG && CONFIG.meubles && CONFIG.meubles[meuble]) || {};
  var out = [];
  (rangees || Object.keys(def).sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); })).forEach(function(r) {
    (def[r] || []).slice().sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); }).forEach(function(e) {
      out.push({ meuble: meuble, rangee: String(r), espace: String(e) });
    });
  });
  return out;
}

// Les doublons du cellier au départ (même cépage principal de même couleur, ou même vin) : l'utilisateur en cède
// « taille − 1 ». La tablette et les vins douteux n'en font pas partie. (Au Pigeonnier et à la Réserve, la règle décide.)
function groupesDoublonsMenageV2(toutes) {
  var out = [];
  ['Cellier'].forEach(function(meuble) {
    var groupes = {};
    toutes.forEach(function(b) {
      if (b.lieu !== meuble.toLowerCase() || b.tablette || b.doute) return;
      var k = b.coul + '|' + (b.cep || 'vin:' + b.vin);
      (groupes[k] = groupes[k] || []).push(b);
    });
    Object.keys(groupes).filter(function(k) { return groupes[k].length > 1; }).forEach(function(k) {
      var g = groupes[k];
      out.push({ meuble: meuble, cle: meuble + '|' + k, titre: majusculeMenageV2(g[0].cepCommun) || nomMenageV2(g[0]), bouteilles: g, aCeder: g.length - 1, coul: g[0].coul });
    });
  });
  return out.sort(function(a, b) { return (b.bouteilles.length - a.bouteilles.length) || a.titre.localeCompare(b.titre); });
}

// Le plan : où finit chaque bouteille, d'après les choix de l'utilisateur
function calculerMenageV2() {
  var toutes = bouteillesMenageV2();
  var groupes = groupesDoublonsMenageV2(toutes);
  var r = simulerMenageV2(toutes, groupes);
  r.groupes = groupes;
  r.aVerifier = toutes.filter(function(b) { return b.doute; });
  return r;
}

function simulerMenageV2(toutes, groupes) {
  var M = MENAGE_V2;
  var TRANSIT = 'transit';
  var ou = {}, sort = {}, entre = {}, cede = {}, decide = {};
  toutes.forEach(function(b) { ou[b.cle] = b.place; });
  var lieu = function(p) { return p === TRANSIT ? 'transit' : lieuMenageV2(p); };
  var noms = { cellier: 'au cellier', pigeonnier: 'au Pigeonnier', reserve: 'à la Réserve' };
  // Figée : jamais déplacée (À vérifier, tablette, « pas celle-là », meuble hors tri, spiritueux) ; au cellier et au
  // Pigeonnier, une couleur qu'aucune zone n'accepte (rosé, bulles) garde aussi sa place
  var fige = function(b) {
    if (b.doute || b.tablette || M.refus[b.cle] || b.lieu === 'autre' || b.coul === 'vin-spiritueux') return true;
    return (b.lieu === 'cellier' || b.lieu === 'pigeonnier') && b.coul !== 'vin-blanc' && b.coul !== 'vin-rouge';
  };
  var poser = function(b, p) { ou[b.cle] = p; decide[b.cle] = true; };
  var occ = function() { var s = {}; toutes.forEach(function(b) { var p = ou[b.cle]; if (p && p !== TRANSIT) s[placeMenageV2(p)] = b; }); return s; };
  var placesZone = function(meuble, z) {
    return placesMenageV2(meuble, z.rangees).filter(function(p) { return !z.espaces || z.espaces.indexOf(p.espace) !== -1; });
  };
  // Ce que contiennent des meubles : cépages (avec leur compte) et appellations, par couleur ; la tablette ne compte pas
  var ajouterContenu = function(c, b) {
    if (b.cep) c.cep[b.coul + '|' + b.cep] = (c.cep[b.coul + '|' + b.cep] || 0) + 1;
    if (b.app) c.app[b.coul + '|' + b.app] = true;
  };
  var contenu = function(lieux) {
    var c = { cep: {}, app: {} };
    toutes.forEach(function(b) {
      var p = ou[b.cle];
      if (p && p !== TRANSIT && !tabletteMenageV2(p) && lieux.indexOf(lieu(p)) !== -1) ajouterContenu(c, b);
    });
    return c;
  };
  var palier = function(c, b) { return b.cep && !c.cep[b.coul + '|' + b.cep] ? 1 : b.app && !c.app[b.coul + '|' + b.app] ? 2 : 3; };
  var texteEntre = function(n, b, ici) {
    return n === 1 ? 'nouveau cépage ' + noms[ici] + ' : ' + libelleCepageMenageV2(b)
      : n === 2 ? 'nouvelle appellation ' + noms[ici] + ' : ' + b.appNom : 'une place libre ' + noms[ici];
  };
  var marches = { pigeonnier: 0, reserve: 1, transit: 2, aranger: 3 };
  // Le meilleur candidat pour une place de « ici » : le palier, puis le déjà-là (il garde sa place), puis le cépage
  // le moins présent, puis le plus ancien, puis le moins de marches
  var meilleur = function(cand, c, ici) {
    return cand.map(function(b) { return { b: b, n: palier(c, b) }; }).sort(function(x, y) {
      var lx = lieu(ou[x.b.cle]), ly = lieu(ou[y.b.cle]);
      return (x.n - y.n) || ((lx === ici ? 0 : 1) - (ly === ici ? 0 : 1)) ||
        ((c.cep[x.b.coul + '|' + x.b.cep] || 0) - (c.cep[y.b.coul + '|' + y.b.cep] || 0)) ||
        (rangRotationMenageV2(x.b) - rangRotationMenageV2(y.b)) || ((marches[lx] || 0) - (marches[ly] || 0));
    })[0] || null;
  };

  // 0. La tablette : C-7-1 est la place d'un rouge ; ce qui l'occupe d'autre glisse sur la tablette
  var c71 = toutes.filter(function(b) { return b.place && memeTexteV2(b.place.meuble, 'Cellier') && b.place.rangee === '7' && b.place.espace === '1'; })[0];
  if (c71 && c71.coul !== 'vin-rouge' && !M.refus[c71.cle]) {
    var o71 = occ();
    var t = placesMenageV2('Cellier', ['7']).filter(function(p) { return p.espace !== '1' && !o71[placeMenageV2(p)]; })[0];
    if (t) { poser(c71, t); entre[c71.cle] = 'C-7-1 se libère pour un rouge'; }
  }

  // 1. Cellier : les doublons cédés sortent ; un vin hors de sa couleur la rejoint s'il y a une place, sinon il sort ;
  // puis les places libres se remplissent
  groupes.forEach(function(g) {
    g.bouteilles.filter(function(b) { return M.cedes[b.cle] && !fige(b) && !decide[b.cle]; }).slice(0, g.aCeder).forEach(function(b) {
      ou[b.cle] = TRANSIT;
      cede[b.cle] = true;
      sort[b.cle] = 'doublon de ' + (libelleCepageMenageV2(b) || g.titre);
    });
  });
  toutes.forEach(function(b) {
    if (!b.horsZone || b.lieu !== 'cellier' || fige(b) || decide[b.cle] || cede[b.cle]) return;
    var o = occ();
    var libre = [];
    ZONES_MENAGE_V2.Cellier.forEach(function(z) {
      if (z.couleur === b.coul) libre = libre.concat(placesZone('Cellier', z).filter(function(p) { return !o[placeMenageV2(p)]; }));
    });
    if (libre.length) { poser(b, libre[0]); entre[b.cle] = b.horsZone; }
    else { ou[b.cle] = TRANSIT; sort[b.cle] = b.horsZone + ' : pas de place chez les ' + (b.coul === 'vin-rouge' ? 'rouges' : 'blancs'); }
  });
  var cCellier = contenu(['cellier']);
  ZONES_MENAGE_V2.Cellier.forEach(function(z) {
    var o = occ();
    placesZone('Cellier', z).filter(function(p) { return !o[placeMenageV2(p)]; }).forEach(function(p) {
      var cand = toutes.filter(function(b) {
        return b.coul === z.couleur && !fige(b) && !decide[b.cle] && !cede[b.cle] && lieu(ou[b.cle]) !== 'cellier';
      });
      var m = meilleur(cand, cCellier, 'cellier');
      if (!m) return;
      poser(m.b, p);
      entre[m.b.cle] = texteEntre(m.n, m.b, 'cellier');
      ajouterContenu(cCellier, m.b);
    });
  });

  // 2-3. Pigeonnier puis Réserve : tout est reclassé, zone par zone ; les déjà-là non retenus descendent
  function reclasser(meuble, ici, zones, dessus) {
    var c = contenu(dessus);
    var cDessus = contenu(dessus);
    toutes.forEach(function(b) { var p = ou[b.cle]; if (fige(b) && p && p !== TRANSIT && lieu(p) === ici && !tabletteMenageV2(p)) ajouterContenu(c, b); });
    zones.forEach(function(z) {
      var o = occ();
      var places = placesZone(meuble, z);
      var libres = places.filter(function(p) { var x = o[placeMenageV2(p)]; return !x || (!fige(x) && !decide[x.cle]); });
      var cand = toutes.filter(function(b) {
        return (!z.couleur || b.coul === z.couleur) && !fige(b) && !decide[b.cle] && [ici, 'reserve', 'aranger', 'transit'].indexOf(lieu(ou[b.cle])) !== -1;
      });
      var retenus = [];
      while (retenus.length < libres.length) {
        var m = meilleur(cand, c, ici);
        if (!m) break;
        cand.splice(cand.indexOf(m.b), 1);
        ajouterContenu(c, m.b);
        retenus.push(m);
      }
      // ceux qui sont déjà à une place de la zone la gardent ; les autres prennent les places libres, dans l'ordre
      var gardees = {};
      retenus.forEach(function(m) {
        var p = ou[m.b.cle];
        if (p && p !== TRANSIT && libres.some(function(l) { return placeMenageV2(l) === placeMenageV2(p); })) { gardees[placeMenageV2(p)] = true; decide[m.b.cle] = true; m.garde = true; }
      });
      var restantes = libres.filter(function(l) { return !gardees[placeMenageV2(l)]; });
      retenus.forEach(function(m) {
        if (m.garde) return;
        var dici = lieu(ou[m.b.cle]) === ici;
        poser(m.b, restantes.shift());
        entre[m.b.cle] = dici && m.b.horsZone ? m.b.horsZone : texteEntre(m.n, m.b, ici);
      });
      cand.forEach(function(b) {
        if (lieu(ou[b.cle]) !== ici) return;
        ou[b.cle] = TRANSIT;
        var cle = b.coul + '|' + b.cep;
        sort[b.cle] = b.horsZone ? b.horsZone + ' : pas de place chez les ' + (b.coul === 'vin-rouge' ? 'rouges' : 'blancs')
          : b.cep && cDessus.cep[cle] ? libelleCepageMenageV2(b) + ' est déjà ' + (contenu(['cellier']).cep[cle] ? noms.cellier : noms.pigeonnier)
          : b.cep && c.cep[cle] ? libelleCepageMenageV2(b) + ' est déjà ' + noms[ici] : 'plus de place ' + noms[ici];
      });
    });
  }
  reclasser('Pigeonnier', 'pigeonnier', ZONES_MENAGE_V2.Pigeonnier, ['cellier']);
  reclasser('Réserve', 'reserve', [{ nom: 'tout', rangees: null, couleur: null }], ['cellier', 'pigeonnier']);

  // 4. Le reste va à « À ranger »
  toutes.forEach(function(b) { if (ou[b.cle] === TRANSIT) ou[b.cle] = null; });

  var moves = toutes.filter(function(b) { return placeMenageV2(ou[b.cle]) !== placeMenageV2(b.place); }).map(function(b) {
    return { b: b, de: b.place, vers: ou[b.cle], sort: sort[b.cle] || '', entre: entre[b.cle] || '', parUtilisateur: !!cede[b.cle] };
  });
  return { moves: moves };
}

function ouvrirMenageEmpV2() {
  MENAGE_V2 = reprendreMenageV2();
  // la rotation a besoin de l'Historique : on le charge au besoin (sans lui, tous les vins comptent comme « jamais bu »)
  if (ALL_HISTORIQUE && ALL_HISTORIQUE.length) { afficherMenageEmpV2(true); return; }
  document.getElementById('empV2-cartes').innerHTML = '<div class="texte-secondaire">Un instant…</div>';
  appelBackend('getHistorique', {}, { spinner: ' ' }).then(function(data) {
    ALL_HISTORIQUE = data || [];
  }).catch(function() {}).then(function() { if (empV2Mode === 'menage') afficherMenageEmpV2(true); });
}

// « bu le 27 mars ★★★★ » quand l'Historique le sait, sinon « arrivée le 20 févr. »
function passeMenageV2(b) {
  var quand = b.passe ? b.passe.quand : b.arrivee;
  if (!quand) return '';
  var d = new Date(quand);
  var mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var txt = (b.passe ? 'bu le ' : 'arrivée le ') + d.getDate() + ' ' + mois[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  return txt + (b.passe && b.passe.note ? ' ' + new Array(b.passe.note + 1).join('★') : '');
}

function nomMenageV2(b) { return decodeHTML(b.w.Nom || '—'); }
function guillemetMenageV2(v) { return (v || '').toString().replace(/'/g, "\\'"); }

// Carte d'une bouteille : la photo (place gardée même sans photo), le texte, à droite la case et la destination.
// Toucher la carte = la fiche du vin.
function carteMenageV2(b, titre, sous, droite, voile) {
  var w = b.w;
  var cb = (w['Code-barres'] || '').toString().trim();
  var photo = '<div class="carte-photo">' + (w['Photo URL'] ? '<img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '') + '</div>';
  return '<div class="carte ' + b.coul + (voile ? ' carte-vide' : '') + '"' + (cb ? ' onclick="ouvrirFicheDepuisListeEmpV2(\'' + guillemetMenageV2(cb) + '\')"' : '') + '>' + photo +
    '<div class="carte-centre"><span class="carte-titre">' + titre + '</span><span class="carte-sous">' + sous + '</span></div>' +
    '<div class="carte-droite carte-droite-empilee">' + droite + '</div></div>';
}

function cocheMenageV2(onclick, actif) {
  return '<span class="coche-panier' + (actif ? ' actif' : '') + '" onclick="event.stopPropagation();' + onclick + '"></span>';
}

function pasCelleLaMenageV2Html(cle) {
  return '<span class="fs-12 color-primary" onclick="event.stopPropagation();pasCelleLaMenageV2(\'' + cle + '\')">pas celle-là</span>';
}

// La tournée : titre et rubriques de chaque arrêt, dans l'ordre où l'utilisateur les fait
var TITRES_ARRETS_MENAGE_V2 = { 1: '1 · Au cellier', 2: '2 · Au Pigeonnier', 3: '3 · En bas, à la Réserve', 4: '4 · À ranger', 5: '5 · À la Réserve, en remontant', 6: '6 · Au Pigeonnier', 7: '7 · Au cellier' };
var RUBRIQUES_ARRETS_MENAGE_V2 = { 1: ['Choisir', 'Sors', 'Déplace'], 2: ['Sors', 'Déplace', 'Place ce qui vient du cellier'], 3: ['Sors', 'Déplace', 'Range'], 4: ['Sors', 'Pose'], 5: ['Range'], 6: ['Place'], 7: ['Place'] };

// Les lignes de la tournée, arrêt par arrêt. Une bouteille qui change de meuble a deux lignes (je la prends,
// je la pose) ; une qui reste dans son meuble, une seule. « Enregistrer » ne compte que la ligne où elle est posée.
// Ce qui va du Pigeonnier au cellier attend devant le cellier ; tout le reste voyage dans la boîte.
function lignesMenageV2(plan) {
  var arrets = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {} };
  var ajouter = function(n, rubrique, l) { (arrets[n][rubrique] = arrets[n][rubrique] || []).push(l); };
  var arretPrise = { cellier: 1, pigeonnier: 2, reserve: 3, aranger: 4 };
  plan.moves.forEach(function(d) {
    var de = lieuMenageV2(d.de), vers = lieuMenageV2(d.vers), cle = d.b.cle;
    if (de === vers) { ajouter(arretPrise[de], 'Déplace', { id: 'd|' + cle, d: d, sorte: 'seule' }); return; }
    var devant = de === 'pigeonnier' && vers === 'cellier';
    ajouter(arretPrise[de], 'Sors', { id: 'p|' + cle, d: d, sorte: 'prise', devant: devant });
    if (vers === 'cellier') ajouter(7, 'Place', { id: 'd|' + cle, d: d, sorte: 'pose', devant: devant });
    else if (vers === 'pigeonnier') ajouter(de === 'cellier' ? 2 : 6, de === 'cellier' ? 'Place ce qui vient du cellier' : 'Place', { id: 'd|' + cle, d: d, sorte: 'pose' });
    else if (vers === 'reserve') ajouter(de === 'aranger' ? 5 : 3, 'Range', { id: 'd|' + cle, d: d, sorte: 'pose' });
    else ajouter(4, 'Pose', { id: 'd|' + cle, d: d, sorte: 'pose' });
  });
  // Dans un même meuble, une bouteille ne va dans une place qu'une fois celle-ci libérée
  [1, 2, 3].forEach(function(n) {
    var reste = arrets[n]['Déplace'] || [], ordre = [];
    while (reste.length) {
      var libre = reste.filter(function(l) { return !reste.some(function(m) { return m !== l && placeMenageV2(m.d.de) === placeMenageV2(l.d.vers); }); });
      if (!libre.length) libre = [reste[0]];
      ordre.push(libre[0]);
      reste = reste.filter(function(l) { return l !== libre[0]; });
    }
    if (ordre.length) arrets[n]['Déplace'] = ordre;
  });
  // La boîte (4 cases par rangée, 3 rangées par boîte) : une bouteille sortie prend la première case libre,
  // qui se libère quand elle est posée
  var cases = [], caseDe = {}, max = 0;
  [1, 2, 3, 4, 5, 6, 7].forEach(function(n) {
    RUBRIQUES_ARRETS_MENAGE_V2[n].forEach(function(r) {
      (arrets[n][r] || []).forEach(function(l) {
        var cle = l.d.b.cle;
        if (l.sorte === 'prise' && !l.devant) {
          var i = 0;
          while (cases[i]) i++;
          cases[i] = true;
          caseDe[cle] = i;
          max = Math.max(max, cases.filter(Boolean).length);
        }
        if (caseDe[cle] == null) return;
        l.boite = 'case ' + (Math.floor(caseDe[cle] / 4) + 1) + '-' + (caseDe[cle] % 4 + 1);
        if (l.sorte === 'pose') cases[caseDe[cle]] = false;
      });
    });
  });
  return { arrets: arrets, max: max };
}

// recalculer = true : le plan est recalculé (ouverture, un choix, un « pas celle-là ») ;
// sinon on redessine le même (une case cochée ne change rien au plan).
function afficherMenageEmpV2(recalculer) {
  var M = MENAGE_V2;
  if (recalculer || !M.plan) M.plan = calculerMenageV2();
  var plan = M.plan;
  var n = plan.moves.length;
  document.getElementById('empV2-compte').innerHTML = 'Tri Dionysos : ' + n + ' bouteille' + (n > 1 ? 's' : '') + ' à déplacer';
  var tournee = lignesMenageV2(plan);
  var html = '';
  if (tournee.max) {
    html += '<div class="titre-groupe">' + (tournee.max <= 12 ? 'Une boîte suffit' : 'Prends ' + Math.ceil(tournee.max / 12) + ' boîtes') +
      ' : au plus ' + tournee.max + ' bouteille' + (tournee.max > 1 ? 's' : '') + ' à la fois</div>';
  }
  [1, 2, 3, 4, 5, 6, 7].forEach(function(a) {
    html += '<div class="emp-bloc"><div class="emp-meuble">' + TITRES_ARRETS_MENAGE_V2[a] + '</div>';
    var vide = true;
    RUBRIQUES_ARRETS_MENAGE_V2[a].forEach(function(rubrique) {
      if (rubrique === 'Choisir') {
        if (!plan.groupes.length) return;
        vide = false;
        html += '<div class="titre-rubrique">Choisir</div>';
        plan.groupes.forEach(function(g) { html += choixMenageV2Html(g); });
        return;
      }
      var lignes = tournee.arrets[a][rubrique];
      if (!lignes || !lignes.length) return;
      vide = false;
      html += '<div class="titre-rubrique">' + rubrique + '</div>';
      lignes.forEach(function(l) { html += ligneMenageV2Html(l); });
    });
    if (vide) html += '<div class="texte-secondaire texte-gauche">Rien à faire ici</div>';
    html += '</div>';
  });
  if (plan.aVerifier.length) {
    html += '<div class="emp-bloc"><div class="emp-meuble">À vérifier</div><div class="texte-secondaire texte-gauche">L\'assistant ne les touche pas : corrige leur fiche (✎)</div>';
    plan.aVerifier.forEach(function(b) {
      html += carteMenageV2(b, nomMenageV2(b), b.doute + ' · ' + libellePlaceMenageV2(b.place), '', false);
    });
    html += '</div>';
  }
  var nRefus = Object.keys(M.refus).length;
  if (nRefus) html += '<div class="item-liste" onclick="remettreMenageV2()">Remettre les « pas celle-là » (' + nRefus + ')</div>';
  if (nRefus || Object.keys(M.cedes).length || Object.keys(M.faits).length) html += '<div class="item-liste" onclick="recommencerMenageV2()">Tout recommencer</div>';
  var faits = plan.moves.filter(function(d) { return M.faits['d|' + d.b.cle]; }).length;
  if (n) html += '<div class="roundel mt-20" onclick="enregistrerMenageV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Enregistrer (' + faits + ')</span></div>';
  document.getElementById('empV2-cartes').innerHTML = html;
}

// « Pinot grigio : tu en as 3 au cellier, cèdes-en 2 » — en titre au-dessus du groupe, pas collé au premier vin
function choixMenageV2Html(g) {
  var M = MENAGE_V2;
  var nCedes = g.bouteilles.filter(function(b) { return M.cedes[b.cle]; }).length;
  var html = '<div class="titre-groupe">' + g.titre + ' : tu en as ' + g.bouteilles.length + ' au cellier, cèdes-en ' + g.aCeder +
    (nCedes ? ' (' + nCedes + ' choisi' + (nCedes > 1 ? 's' : '') + ')' : '') + '</div>' +
    '<div class="histo-groupe ' + g.coul + '">';
  g.bouteilles.forEach(function(b) {
    var cede = !!M.cedes[b.cle];
    var autreNom = cleCepageV2(b.cepNom) !== cleCepageV2(b.cepCommun) ? b.cepNom : '';
    html += carteMenageV2(b, libellePlaceMenageV2(b.place) + ' · ' + nomMenageV2(b), [autreNom, passeMenageV2(b)].filter(Boolean).join(' · '),
      cocheMenageV2("cederMenageV2('" + b.cle + "', '" + guillemetMenageV2(g.cle) + "')", cede) + '<span class="fs-12">' + (cede ? 'cédé' : 'céder') + '</span>', false);
  });
  return html + '</div>';
}

// Une ligne de la tournée. Sortie : sa case dans la boîte (ou « devant le cellier ») et où elle va ;
// pose : « case 1-1 → P-4-1 » ; déplacement dans le même meuble : « C-2-4 → C-7-1 ».
function ligneMenageV2Html(l) {
  var M = MENAGE_V2;
  var d = l.d, b = d.b;
  var fait = !!M.faits[l.id];
  var coche = cocheMenageV2("cocherTourneeMenageV2('" + l.id + "')", fait);
  var pas = d.parUtilisateur ? '' : pasCelleLaMenageV2Html(b.cle);
  var dest = { cellier: 'cellier', pigeonnier: 'Pigeonnier', reserve: 'Réserve', aranger: 'À ranger' }[lieuMenageV2(d.vers)];
  if (l.sorte === 'prise') {
    var ou = l.devant ? '<span class="fs-12">→ devant le cellier</span>' : '<span class="fs-12 color-white">' + l.boite + '</span><span class="fs-12">→ ' + dest + '</span>';
    return carteMenageV2(b, libellePlaceMenageV2(d.de) + ' · ' + nomMenageV2(b), d.sort || d.entre, coche + ou + pas, fait);
  }
  if (l.sorte === 'pose') {
    var raison = d.entre || d.sort;
    return carteMenageV2(b, (l.devant ? 'devant le cellier' : l.boite) + ' → ' + libellePlaceMenageV2(d.vers) + ' · ' + nomMenageV2(b),
      'vient de ' + libellePlaceMenageV2(d.de) + (raison ? ' · ' + raison : ''), coche, fait);
  }
  return carteMenageV2(b, libellePlaceMenageV2(d.de) + ' → ' + libellePlaceMenageV2(d.vers) + ' · ' + nomMenageV2(b), d.entre || d.sort, coche + pas, fait);
}

function cederMenageV2(cle, groupe) {
  var M = MENAGE_V2;
  if (M.cedes[cle]) delete M.cedes[cle];
  else {
    var g = (M.plan ? M.plan.groupes : []).filter(function(x) { return x.cle === groupe; })[0];
    if (g && g.bouteilles.filter(function(b) { return M.cedes[b.cle]; }).length >= g.aCeder) { afficherMessage('Cèdes-en ' + g.aCeder + ' au plus'); return; }
    M.cedes[cle] = true;
  }
  garderMenageV2();
  afficherMenageEmpV2(true);
}

function pasCelleLaMenageV2(cle) {
  MENAGE_V2.refus[cle] = true;
  garderMenageV2();
  afficherMenageEmpV2(true);
}

function remettreMenageV2() {
  MENAGE_V2.refus = {};
  garderMenageV2();
  afficherMenageEmpV2(true);
}

function recommencerMenageV2() {
  MENAGE_V2 = { cedes: {}, refus: {}, faits: {} };
  oublierMenageV2();
  remonterScrollV2('empV2Container');
  afficherMenageEmpV2(true);
}

function cocherTourneeMenageV2(id) {
  MENAGE_V2.faits[id] = !MENAGE_V2.faits[id];
  garderMenageV2();
  afficherMenageEmpV2(false);
}

// N'enregistre que les bouteilles POSÉES (ligne « pose » ou ligne seule cochée) ; le reste n'est pas touché
function enregistrerMenageV2() {
  var M = MENAGE_V2;
  var dep = ((M.plan && M.plan.moves) || []).filter(function(d) { return M.faits['d|' + d.b.cle]; });
  if (!dep.length) { afficherMessage('Coche les bouteilles posées'); return; }
  var faits = 0;
  var suite = dep.reduce(function(p, d) {
    return p.then(function() {
      var appel = d.vers
        ? appelBackend('actionBouteille', { row: d.b.w.row, action: 'deplacer', bottle: d.b.w.bottle, meuble: d.vers.meuble, rangee: d.vers.rangee, espace: d.vers.espace }, { spinner: 'Tri' })
        : appelBackend('mettreBotteilleARanger', { row: d.b.w.row, bottle: d.b.w.bottle }, { spinner: 'Tri' });
      return appel.then(function() { faits++; });
    });
  }, Promise.resolve());
  suite.then(function() {
    return appelBackend('getInventoryData', {}, { spinner: 'Tri' });
  }).then(function(data) {
    if (data) ALL_DATA = data;
    MENAGE_V2 = { cedes: {}, refus: {}, faits: {} };
    oublierMenageV2();
    afficherMessage('✓ ' + faits + ' déplacement' + (faits > 1 ? 's' : '') + ' enregistré' + (faits > 1 ? 's' : ''));
    if (empV2Mode === 'menage') { remonterScrollV2('empV2Container'); afficherMenageEmpV2(true); }
  }).catch(function(e) {
    // une partie a pu s'écrire : on reprend l'inventaire pour ne pas mentir (les cases restent gardées)
    appelBackend('getInventoryData', {}, { spinner: '' }).then(function(data) { if (data) ALL_DATA = data; }).catch(function() {});
    retourAccueilV2('Tri : ' + faits + ' sur ' + dep.length + ' enregistré(s) — ' + (e && e.message ? e.message : 'erreur inconnue'));
  });
}

// Ordre d'affichage des meubles (l'inverse de la chaîne de remplissage) ; « À ranger » toujours en dernier.
var ORDRE_MEUBLES_V2 = ['Cellier', 'Pigeonnier', 'Réserve'];
function rangEmplacementV2(label) {
  if (label === 'À ranger') return 999;
  var init = label.charAt(0).toUpperCase();
  for (var i = 0; i < ORDRE_MEUBLES_V2.length; i++) {
    if (ORDRE_MEUBLES_V2[i].charAt(0).toUpperCase() === init) return i;
  }
  return 500;
}
function comparerEmplacementsV2(a, b) {
  var ra = rangEmplacementV2(a), rb = rangEmplacementV2(b);
  if (ra !== rb) return ra - rb;
  var pa = a.split('-'), pb = b.split('-');
  var d = (parseInt(pa[1], 10) || 0) - (parseInt(pb[1], 10) || 0);
  if (d !== 0) return d;
  return (parseInt(pa[2], 10) || 0) - (parseInt(pb[2], 10) || 0);
}

// Regroupe par code-barres : { wine, emplacements:[], count }
function grouperParCbEmpV2(liste) {
  var grouped = {};
  liste.forEach(function(w){
    var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var key = cb || ('SANS_' + w.Nom);
    if (!grouped[key]) grouped[key] = { wine: w, emplacements: [], count: 0 };
    grouped[key].count++;
    grouped[key].emplacements.push(w.Meuble.toString().substring(0,1).toUpperCase() + '-' + w.Rangee + '-' + w.Espace);
  });
  var arr = Object.values(grouped);
  arr.forEach(function(g){ g.emplacements.sort(comparerEmplacementsV2); });
  return arr;
}

// Chaîne à sens unique : un meuble ne se remplit que par les meubles en amont.
// Noms venant de l'onglet Config du Sheet — si un meuble est renommé, corriger ici.
var CHAINE_MEUBLES_V2 = ['Réserve', 'Pigeonnier', 'Cellier'];

function meublesAmontV2(meuble) {
  var pos = -1;
  CHAINE_MEUBLES_V2.forEach(function(m, i){ if (memeTexteV2(m, meuble)) pos = i; });
  if (pos <= 0) return [];
  return CHAINE_MEUBLES_V2.slice(0, pos);
}

function cepageDominant(w) {
  var c = (w.Cepage || '').toString().split(',')[0].trim();
  return c;
}

// Regroupe par Code SAQ (repli code-barres, puis nom) — fusionne un même vin mal codé
function grouperParSaqEmpV2(liste) {
  var grouped = {};
  liste.forEach(function(w){
    var key = cleVinV2(w);
    if (!grouped[key]) grouped[key] = { wine: w, emplacements: [], count: 0 };
    grouped[key].count++;
    if (w.Meuble && w.Rangee && w.Espace) {
      grouped[key].emplacements.push(w.Meuble.toString().substring(0,1).toUpperCase() + '-' + w.Rangee + '-' + w.Espace);
    } else {
      grouped[key].emplacements.push('À ranger');
    }
  });
  var arr = Object.values(grouped);
  arr.forEach(function(g){ g.emplacements.sort(comparerEmplacementsV2); });
  return arr;
}



function afficherListeEmpV2(type) {
  empV2Mode = type;
  var f = filtresEmpV2;
  var tousRanges = bouteillesRangeesEmpV2();
  var div = document.getElementById('empV2-cartes');
  var html = '';
  var titre = '';

  if (type === 'doubles') {
    // Même code-barres en 2+ bouteilles. Si meuble choisi → dans le meuble, sinon tous.
    var portee = f.meuble ? tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); }) : tousRanges;
    var groupes = groupesFiltresEmpV2(grouperParSaqEmpV2(portee)).filter(function(g){ return g.count >= 2; });
    titre = 'Vins en double';
    if (groupes.length === 0) { html = '<div class="texte-secondaire">Aucun vin en double</div>'; }
    else { html = groupes.map(function(g){ return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', ')); }).join(''); }

  } else if (type === 'listemeuble') {
    // Tout le meuble choisi, en sections par cépage dominant
    var dansMeubleL = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var parCepL = {};
    var nomCepL = {};
    groupesFiltresEmpV2(grouperParSaqEmpV2(dansMeubleL)).forEach(function(g){
      var cep = cepageDominant(g.wine) || 'Sans cépage';
      var k = cleCommuneCepageV2(cep);
      if (!parCepL[k]) { parCepL[k] = []; nomCepL[k] = cepageCommunV2(decodeHTML(cep)); }
      parCepL[k].push(g);
    });
    titre = 'Liste du meuble';
    var clesL = Object.keys(parCepL).sort(function(a, b){ return a.localeCompare(b); });
    if (clesL.length === 0) { html = '<div class="texte-secondaire">Aucun vin dans ce meuble</div>'; }
    else {
      html = clesL.map(function(k){
        var vins = parCepL[k].sort(function(a, b){
          return normaliserRechercheV2(decodeHTML(a.wine.Nom || '')).localeCompare(normaliserRechercheV2(decodeHTML(b.wine.Nom || '')));
        });
        return '<div class="emp-meuble">' + nomCepL[k] + '</div>' + vins.map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }

  } else if (type === 'cepdoubles') {
    // Cépage dominant présent sur 2+ vins DIFFÉRENTS du meuble choisi
    var dansMeuble = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var parCb = groupesFiltresEmpV2(grouperParSaqEmpV2(dansMeuble));
    var parCepage = {};
    var nomCepage = {};
    parCb.forEach(function(g){
      var cep = cepageDominant(g.wine);
      if (!cep) return;
      var k = cleCommuneCepageV2(cep);
      if (!parCepage[k]) { parCepage[k] = []; nomCepage[k] = cepageCommunV2(decodeHTML(cep)); }
      parCepage[k].push(g);
    });
    titre = 'Cépages doubles';
    var cles = Object.keys(parCepage).filter(function(c){ return parCepage[c].length >= 2; }).sort(function(a,b){ return a.localeCompare(b); });
    if (cles.length === 0) { html = '<div class="texte-secondaire">Aucun cépage en double</div>'; }
    else {
      html = cles.map(function(cep){
        return '<div class="emp-meuble">' + nomCepage[cep] + '</div>' + parCepage[cep].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }

  } else if (type === 'cepmanquants' && !f.meuble) {
    // Global : cépages de ma liste de vins absents du stock actif (pour prioriser les achats)
    titre = 'Cépages manquants';
    var actifsTous = (ALL_DATA || []).filter(function(i){ var s = i.Statut || 'En stock'; return i.bottle && i.bottle > 0 && s !== 'Bu' && s !== 'Sorti'; });
    var cepStock = {};
    actifsTous.forEach(function(w){ var c = cepageDominant(w); if (c) cepStock[cleCommuneCepageV2(c)] = true; });
    var parCepGlobal = {};
    var nomCepGlobal = {};
    groupesFiltresEmpV2(grouperVinsV2(ALL_DATA || [])).forEach(function(g){
      var cep = cepageDominant(g.wine);
      if (!cep) return;
      var k = cleCommuneCepageV2(cep);
      if (cepStock[k]) return;
      if (!parCepGlobal[k]) { parCepGlobal[k] = []; nomCepGlobal[k] = cepageCommunV2(decodeHTML(cep)); }
      parCepGlobal[k].push(g);
    });
    var clesG = Object.keys(parCepGlobal).sort(function(a,b){ return a.localeCompare(b); });
    if (clesG.length === 0) { html = '<div class="texte-secondaire">Aucun cépage manquant</div>'; }
    else {
      html = clesG.map(function(cep){
        return '<div class="emp-meuble">' + nomCepGlobal[cep] + '</div>' + parCepGlobal[cep].map(function(g){
          return empCarteVinV2(g.wine, '0 btl', true);
        }).join('');
      }).join('');
    }

  } else if (type === 'cepmanquants') {
    // Cépage présent dans d'AUTRES meubles, absent du meuble choisi
    var dansMeuble2 = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var amont = meublesAmontV2(f.meuble);
    var horsMeuble = tousRanges.filter(function(i){
      return amont.some(function(m){ return memeTexteV2(m, i.Meuble); });
    }).concat(bouteillesARangerEmpV2());
    var cepDansMeuble = {};
    dansMeuble2.forEach(function(w){ var c = cepageDominant(w); if (c) cepDansMeuble[cleCommuneCepageV2(c)] = true; });
    var parCepageHors = {};
    var nomCepageHors = {};
    groupesFiltresEmpV2(grouperParSaqEmpV2(horsMeuble)).forEach(function(g){
      var cep = cepageDominant(g.wine);
      if (!cep || cepDansMeuble[cleCommuneCepageV2(cep)]) return;
      var k = cleCommuneCepageV2(cep);
      if (!parCepageHors[k]) { parCepageHors[k] = []; nomCepageHors[k] = cepageCommunV2(decodeHTML(cep)); }
      parCepageHors[k].push(g);
    });
    titre = 'Cépages manquants';
    var cles2 = Object.keys(parCepageHors).sort(function(a,b){ return a.localeCompare(b); });
    if (cles2.length === 0) { html = '<div class="texte-secondaire">Aucun cépage manquant</div>'; }
    else {
      html = cles2.map(function(cep){
        return '<div class="emp-meuble">' + nomCepageHors[cep] + '</div>' + parCepageHors[cep].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }

  } else if (type === 'fammanquante' && !f.meuble) {
    // Global : familles de ma liste de vins absentes du stock actif
    titre = 'Familles manquantes';
    var actifsTousFam = (ALL_DATA || []).filter(function(i){ var s = i.Statut || 'En stock'; return i.bottle && i.bottle > 0 && s !== 'Bu' && s !== 'Sorti'; });
    var famStock = {};
    actifsTousFam.forEach(function(w){ var fa = (w.Famille || '').toString().trim(); if (fa) famStock[fa] = true; });
    var parFamGlobal = {};
    groupesFiltresEmpV2(grouperVinsV2(ALL_DATA || [])).forEach(function(g){
      var fam = (g.wine.Famille || '').toString().trim();
      if (!fam || famStock[fam]) return;
      if (!parFamGlobal[fam]) parFamGlobal[fam] = [];
      parFamGlobal[fam].push(g);
    });
    var clesFamG = Object.keys(parFamGlobal).sort(function(a,b){ return a.localeCompare(b); });
    if (clesFamG.length === 0) { html = '<div class="texte-secondaire">Aucune famille manquante</div>'; }
    else {
      html = clesFamG.map(function(fam){
        return '<div class="emp-meuble">' + fam + '</div>' + parFamGlobal[fam].map(function(g){
          return empCarteVinV2(g.wine, '0 btl', true);
        }).join('');
      }).join('');
    }

  } else if (type === 'fammanquante') {
    // Famille présente dans d'AUTRES meubles, absente du meuble choisi
    var dansMeubleFam = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var amontFam = meublesAmontV2(f.meuble);
    var horsMeubleFam = tousRanges.filter(function(i){
      return amontFam.some(function(m){ return memeTexteV2(m, i.Meuble); });
    }).concat(bouteillesARangerEmpV2());
    var famDansMeuble = {};
    dansMeubleFam.forEach(function(w){ var fa = (w.Famille || '').toString().trim(); if (fa) famDansMeuble[fa] = true; });
    var parFamHors = {};
    groupesFiltresEmpV2(grouperParSaqEmpV2(horsMeubleFam)).forEach(function(g){
      var fam = (g.wine.Famille || '').toString().trim();
      if (!fam || famDansMeuble[fam]) return;
      if (!parFamHors[fam]) parFamHors[fam] = [];
      parFamHors[fam].push(g);
    });
    titre = 'Familles manquantes';
    var clesFam2 = Object.keys(parFamHors).sort(function(a,b){ return a.localeCompare(b); });
    if (clesFam2.length === 0) { html = '<div class="texte-secondaire">Aucune famille manquante</div>'; }
    else {
      html = clesFam2.map(function(fam){
        return '<div class="emp-meuble">' + fam + '</div>' + parFamHors[fam].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }

  } else if (type === 'appmanquante' && !f.meuble) {
    // Global : appellations de ma liste de vins absentes du stock actif
    titre = 'Appellation manquante';
    var actifsTousApp = (ALL_DATA || []).filter(function(i){ var s = i.Statut || 'En stock'; return i.bottle && i.bottle > 0 && s !== 'Bu' && s !== 'Sorti'; });
    var appStock = {};
    actifsTousApp.forEach(function(w){ var a = (w.Appellation || '').toString().trim(); if (a) appStock[normaliserRechercheV2(a)] = true; });
    var parAppGlobal = {};
    var nomAppGlobal = {};
    groupesFiltresEmpV2(grouperVinsV2(ALL_DATA || [])).forEach(function(g){
      var app = (g.wine.Appellation || '').toString().trim();
      if (!app) return;
      var k = normaliserRechercheV2(app);
      if (appStock[k]) return;
      if (!parAppGlobal[k]) { parAppGlobal[k] = []; nomAppGlobal[k] = app; }
      parAppGlobal[k].push(g);
    });
    var clesAG = Object.keys(parAppGlobal).sort(function(a,b){ return a.localeCompare(b); });
    if (clesAG.length === 0) { html = '<div class="texte-secondaire">Aucune appellation manquante</div>'; }
    else {
      html = clesAG.map(function(app){
        return '<div class="emp-meuble">' + nomAppGlobal[app] + '</div>' + parAppGlobal[app].map(function(g){
          return empCarteVinV2(g.wine, '0 btl', true);
        }).join('');
      }).join('');
    }

  } else if (type === 'appmanquante') {
    // Appellation présente dans d'AUTRES meubles (en amont), absente du meuble choisi
    var dansMeuble3 = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var amontApp = meublesAmontV2(f.meuble);
    var horsMeubleApp = tousRanges.filter(function(i){
      return amontApp.some(function(m){ return memeTexteV2(m, i.Meuble); });
    }).concat(bouteillesARangerEmpV2());
    var appDansMeuble = {};
    dansMeuble3.forEach(function(w){ var a = (w.Appellation || '').toString().trim(); if (a) appDansMeuble[normaliserRechercheV2(a)] = true; });
    var parAppHors = {};
    var nomAppHors = {};
    groupesFiltresEmpV2(grouperParSaqEmpV2(horsMeubleApp)).forEach(function(g){
      var app = (g.wine.Appellation || '').toString().trim();
      if (!app || appDansMeuble[normaliserRechercheV2(app)]) return;
      var k = normaliserRechercheV2(app);
      if (!parAppHors[k]) { parAppHors[k] = []; nomAppHors[k] = app; }
      parAppHors[k].push(g);
    });
    titre = 'Appellation manquante';
    var clesA2 = Object.keys(parAppHors).sort(function(a,b){ return a.localeCompare(b); });
    if (clesA2.length === 0) { html = '<div class="texte-secondaire">Aucune appellation manquante</div>'; }
    else {
      html = clesA2.map(function(app){
        return '<div class="emp-meuble">' + nomAppHors[app] + '</div>' + parAppHors[app].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }
  }

  document.getElementById('empV2-compte').textContent = f.meuble ? (titre + ' · ' + f.meuble) : titre;
  div.innerHTML = html;
}

// Position dans la liste au moment d'ouvrir une fiche : le Tri Dionysos y revient en fermant la fiche
var SCROLL_EMP_V2 = 0;
function ouvrirFicheDepuisListeEmpV2(code) {
  var c = document.querySelector('#empV2Container .modal-v2-content');
  SCROLL_EMP_V2 = c ? c.scrollTop : 0;
  document.getElementById('empV2Container').style.display = 'none';
  ouvrirApresTap(function(){ ouvrirFicheV2(code, 'empliste'); });
}

function deplacerDepuisEmpV2(code) {
  var result = wineResultDepuisMemoireV2(code);
  if (!result) { afficherMessage('Vin introuvable'); return; }
  menuActionV2Context = { code: code, wineResult: result, retour: 'emplacements' };
  naviguerV2(ouvrirDeplacerV2);
}
