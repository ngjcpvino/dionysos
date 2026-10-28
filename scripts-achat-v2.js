/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-ACHAT-V2.JS
   Liste d'achat, Propositions, inventaire de la succursale, succursales favorites, Facture SAQ
============================================================ */

// ==================== SUGGESTIONS V2 ====================
var filtresSuggestionsV2 = { sommelier: '', couleur: '', cave: false };
var suggestionsV2Attente = false;

function ouvrirSuggestionsV2() {
  document.getElementById('suggestionsV2Container').style.display = 'flex';
  remonterScrollV2('suggestionsV2Container');
  filtresSuggestionsV2 = { sommelier: '', couleur: '', cave: false };
  var champTexte = document.getElementById('suggestionsV2-f-texte');
  if (champTexte) champTexte.value = '';
  remplirFiltresSuggestionsV2();
  afficherSuggestionsV2();
  chargerPromosMesV2();   // en fond : les prix promo remplacent les prix réguliers à l'arrivée
}

function fermerSuggestionsV2() {
  fermerFiltresSuggestionsV2();
  document.getElementById('suggestionsV2Container').style.display = 'none';
}

function ouvrirFiltresSuggestionsV2() { clicLoupeV2('suggestionsV2', reinitialiserFiltresSuggestionsV2); }
function fermerFiltresSuggestionsV2() {
  document.getElementById('suggestionsV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('suggestionsV2-filtres').classList.remove('ouvert');
}

function saqInfosV2() {
  var infos = {};
  (ALL_DATA || []).forEach(function(d) {
    var saq = (d['Code SAQ'] || '').toString().trim();
    if (saq && !infos[saq]) infos[saq] = d;
  });
  return infos;
}

function remplirFiltresSuggestionsV2() {
  var f = filtresSuggestionsV2;
  var vusSom = {};
  var sommeliers = [];
  (ALL_SUGGESTIONS || []).forEach(function(s) {
    var v = (s.sommelier || '').toString().trim();
    var k = normaliserRechercheV2(v);
    if (v && !vusSom[k]) { vusSom[k] = true; sommeliers.push(v); }
  });
  sommeliers.sort(function(a, b) { return a.localeCompare(b); });
  var menuSom = document.getElementById('suggestionsV2-f-sommelier-menu');
  if (menuSom) {
    menuSom.innerHTML = sommeliers.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(v, f.sommelier) + '" onclick="choisirFiltreSuggestionsV2(\'sommelier\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
  }
  var dispSom = document.getElementById('suggestionsV2-f-sommelier-display');
  if (dispSom) dispSom.textContent = libelleChoixV2(f.sommelier, 'Sommelier');

  var couleurs = uniqueValeursAchat(ALL_DATA || [], 'Couleur');
  var menuCoul = document.getElementById('suggestionsV2-f-couleur-menu');
  if (menuCoul) {
    menuCoul.innerHTML = couleurs.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(v, f.couleur) + '" onclick="choisirFiltreSuggestionsV2(\'couleur\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
  }
  var dispCoul = document.getElementById('suggestionsV2-f-couleur-display');
  if (dispCoul) dispCoul.textContent = libelleChoixV2(f.couleur, 'Couleur');

  var btnCave = document.getElementById('suggestionsV2-cave');
  if (btnCave) { btnCave.classList.toggle('actif', f.cave); btnCave.textContent = f.cave ? '✓' : '✗'; }
}

function basculerFiltreSuggestionsV2(cle) {
  var menu = document.getElementById('suggestionsV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['sommelier', 'couleur'].forEach(function(k) {
    document.getElementById('suggestionsV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) { menu.classList.add('ouvert'); annulerFermetureMenuV2(menu.id); }
}

function choisirFiltreSuggestionsV2(cle, valeur) {
  filtresSuggestionsV2[cle] = cycleFiltreV2(filtresSuggestionsV2[cle], valeur);
  fermerMenuApresV2('suggestionsV2-f-' + cle + '-menu');
  remplirFiltresSuggestionsV2();
  afficherSuggestionsV2();
}

function toggleCaveSuggestionsV2() {
  filtresSuggestionsV2.cave = !filtresSuggestionsV2.cave;
  remplirFiltresSuggestionsV2();
  afficherSuggestionsV2();
}

function reinitialiserFiltresSuggestionsV2() {
  filtresSuggestionsV2 = { sommelier: '', couleur: '', cave: false };
  var champ = document.getElementById('suggestionsV2-f-texte');
  if (champ) champ.value = '';
  ['sommelier', 'couleur'].forEach(function(k) {
    document.getElementById('suggestionsV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  remplirFiltresSuggestionsV2();
  afficherSuggestionsV2();
  fermerFiltresSuggestionsV2();
}

function bouteillesEnCaveParSAQV2(codeSAQ) {
  var saq = (codeSAQ || '').toString().trim();
  return (ALL_DATA || []).some(function(i) {
    var statut = i.Statut || 'En stock';
    return (i['Code SAQ'] || '').toString().trim() === saq && i.bottle && i.bottle > 0 && statut !== 'Bu' && statut !== 'Sorti';
  });
}

// Vrai si le vin (par code-barres) a au moins une bouteille active en cave
function vinEnCaveV2(codebarre) {
  var cb = (codebarre || '').toString().trim();
  return (ALL_DATA || []).some(function(i) {
    var statut = i.Statut || 'En stock';
    return memeCodeV2(i['Code-barres'], cb) && i.bottle && i.bottle > 0 && statut !== 'Bu' && statut !== 'Sorti';
  });
}

function afficherSuggestionsV2() {
  var f = filtresSuggestionsV2;
  var champTexte = document.getElementById('suggestionsV2-f-texte');
  var texte = normaliserRechercheV2(champTexte ? champTexte.value.trim() : '');
  var infos = saqInfosV2();

  var loupeS = document.getElementById('suggestionsV2-loupe');
  if (loupeS) loupeS.classList.toggle('actif', !!(f.sommelier || f.couleur || f.cave || texte));

  var base = (ALL_SUGGESTIONS || []).filter(function(s) {
    if (!passeFiltreV2(f.sommelier, s.sommelier)) return false;
    if (texte && normaliserRechercheV2(s.note).indexOf(texte) === -1) return false;
    var info = infos[s.codeSAQ] || {};
    if (!passeFiltreV2(f.couleur, info.Couleur)) return false;
    if (f.cave && !bouteillesEnCaveParSAQV2(s.codeSAQ)) return false;
    return true;
  });

  var grouped = {};
  base.forEach(function(s) {
    if (!grouped[s.codeSAQ]) grouped[s.codeSAQ] = { codeSAQ: s.codeSAQ, wine: infos[s.codeSAQ] || {}, items: [] };
    grouped[s.codeSAQ].items.push(s);
  });
  var groupes = Object.values(grouped);

  var div = document.getElementById('suggestionsV2-cartes');
  document.getElementById('suggestionsV2-compte').textContent = groupes.length + ' vin' + (groupes.length > 1 ? 's' : '');
  if (groupes.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucune proposition</div>'; return; }

  div.innerHTML = groupes.map(groupeSuggestionV2).join('');
}

// Un vin + ses propositions : même bloc sur la page Propositions et dans la recherche.
function groupeSuggestionV2(g) {
  var w = g.wine;
  var cb = (w['Code-barres'] || '').toString().trim();
  var nom = decodeHTML(w.Nom || '—');
  var sous = sousVinV2(w);
  var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
  var onclick = cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + cb + '\', \'suggestions\')})"' : '';
  // le prix SAQ, comme dans la Liste d'achat (promo : prix barré, prix promo, points bonis)
  var prix = blocPrixAchatV2(w);
  var carteVin = '<div class="carte histo-vin ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
    '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
    (prix ? '<div class="carte-droite carte-droite-empilee">' + prix + '</div>' : '') + '</div>';

  var cartesSugg = g.items.map(function(s) {
    var somEsc = (s.sommelier || '').replace(/'/g, "\\'");
    var noteEsc = (s.note || '').replace(/'/g, "\\'");
    var nomEsc = nom.replace(/'/g, "\\'");
    return '<div class="carte histo-mets" onclick="ouvrirApresTap(function(){ouvrirSuggestionEditV2(' + s.row + ', \'' + somEsc + '\', \'' + noteEsc + '\', \'' + nomEsc + '\', \'' + g.codeSAQ + '\', \'liste\')})">' +
      '<div class="carte-centre"><span class="carte-titre">' + (s.sommelier || '—') + '</span><span class="carte-sous">' + (s.note || '') + '</span></div>' +
      '<div class="carte-droite">' + (s.date || '') + '</div></div>';
  }).join('');

  return '<div class="histo-groupe ' + couleurClasseV2(w.Couleur) + '">' + carteVin + cartesSugg + '</div>';
}

// ---------- Overlay Ajout/Correction suggestion ----------
var suggestionEditV2 = { row: 0, codeSAQ: '', retour: null };

function ouvrirSuggestionAjoutV2(codeSAQ, retour) {
  suggestionEditV2 = { row: 0, codeSAQ: codeSAQ, retour: retour || null };
  var w = vinParCodeSAQV2(codeSAQ) || {};
  document.getElementById('suggestionEditV2-nom').textContent = decodeHTML(w.Nom || 'Vin');
  document.getElementById('suggestionEditV2-origine').textContent = [w.Pays, w.Region, w.Appellation].filter(Boolean).map(decodeHTML).join(' • ');
  document.getElementById('suggestionEditV2-note').value = '';
  remplirMenuSommelierSuggestionV2('', true);
  document.getElementById('suggestionEditV2Overlay').style.display = 'flex';
}

function ouvrirSuggestionEditV2(row, sommelier, note, nomVin, codeSAQ, retour) {
  suggestionEditV2 = { row: row, codeSAQ: codeSAQ, retour: retour || 'liste' };
  var w = vinParCodeSAQV2(codeSAQ) || {};
  document.getElementById('suggestionEditV2-nom').textContent = nomVin || decodeHTML(w.Nom || 'Vin');
  document.getElementById('suggestionEditV2-origine').textContent = [w.Pays, w.Region, w.Appellation].filter(Boolean).map(decodeHTML).join(' • ');
  document.getElementById('suggestionEditV2-note').value = note || '';
  remplirMenuSommelierSuggestionV2(sommelier, false);
  document.getElementById('suggestionEditV2Overlay').style.display = 'flex';
}

function remplirMenuSommelierSuggestionV2(actuel, modifiable) {
  var display = document.getElementById('suggestionEditV2-sommelier-display');
  var menu = document.getElementById('suggestionEditV2-sommelier-menu');
  display.textContent = actuel || '+ Ajouter';
  display.setAttribute('data-valeur', actuel || '');
  menu.classList.remove('ouvert');
  if (modifiable) {
    var sommeliers = (CONFIG && CONFIG.sommeliers) ? CONFIG.sommeliers : [];
    menu.innerHTML = sommeliers.map(function(s) {
      return '<div class="item-liste' + (s === actuel ? ' actif' : '') + '" onclick="choisirSommelierSuggestionV2(\'' + s.replace(/'/g, "\\'") + '\')">' + s + '</div>';
    }).join('') + '<div class="item-liste" id="suggestionEditV2-sommelier-ajouter" onclick="ouvrirAjoutSommelierV2()">+ Ajouter un sommelier</div>';
    display.classList.add('champ-cliquable');
    display.classList.remove('ligne-info');
    display.onclick = basculerMenuSommelierSuggestionV2;
  } else {
    menu.innerHTML = '';
    display.classList.remove('champ-cliquable');
    display.classList.add('ligne-info');
    display.onclick = null;
  }
}

function basculerMenuSommelierSuggestionV2() {
  document.getElementById('suggestionEditV2-sommelier-menu').classList.toggle('ouvert');
}

function choisirSommelierSuggestionV2(valeur) {
  document.getElementById('suggestionEditV2-sommelier-menu').classList.remove('ouvert');
  remplirMenuSommelierSuggestionV2(valeur);
}

function ouvrirAjoutSommelierV2() {
  var item = document.getElementById('suggestionEditV2-sommelier-ajouter');
  if (!item) return;
  item.outerHTML = '<input type="text" id="suggestionEditV2-sommelier-champ" class="champ-saisie" placeholder="Nouveau sommelier (Entrée pour confirmer)">';
  var champ = document.getElementById('suggestionEditV2-sommelier-champ');
  champ.onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); confirmerAjoutSommelierV2(); } };
  champ.focus();
}

function confirmerAjoutSommelierV2() {
  var champ = document.getElementById('suggestionEditV2-sommelier-champ');
  if (!champ) return;
  var valeur = champ.value.trim();
  if (!valeur) { afficherMessage('Entrez un sommelier'); return; }
  var existant = (CONFIG && CONFIG.sommeliers ? CONFIG.sommeliers : []).filter(function(s) { return memeTexteV2(s, valeur); })[0];
  if (existant) { choisirSommelierSuggestionV2(existant); return; }
  appelBackend('ajouterSommelierConfig', { sommelier: valeur }, { spinner: 'Sauvegarde' }).then(function() {
    CONFIG.sommeliers.push(valeur);
    CONFIG.sommeliers.sort(function(a, b) { return normaliserRechercheV2(a).localeCompare(normaliserRechercheV2(b)); });
    choisirSommelierSuggestionV2(valeur);
  }).catch(function() { afficherMessage('Erreur, réessayez'); });
}

function fermerSuggestionEditV2() {
  document.getElementById('suggestionEditV2Overlay').style.display = 'none';
}

function confirmerSuggestionEditV2() {
  var sommelier = document.getElementById('suggestionEditV2-sommelier-display').getAttribute('data-valeur') || '';
  var note = document.getElementById('suggestionEditV2-note').value.trim();
  if (!sommelier) { afficherMessage('Choisissez un sommelier'); return; }
  var e = suggestionEditV2;
  var appel = e.row ? appelBackend('corrigerSuggestion', { row: e.row, sommelier: sommelier, note: note }, { spinner: 'Sauvegarde' })
                     : appelBackend('ajouterSuggestion', { codeSAQ: e.codeSAQ, sommelier: sommelier, note: note }, { spinner: 'Sauvegarde' });
  appel.then(function() {
    return appelBackend('getSuggestions', {}, { spinner: 'Sauvegarde' });
  }).then(function(data) {
    ALL_SUGGESTIONS = data || [];
    document.getElementById('suggestionEditV2Overlay').style.display = 'none';
    if (e.retour === 'fiche') {
      chargerSuggestionsFicheV2(e.codeSAQ);
    } else if (e.retour === 'liste') {
      afficherSuggestionsV2();
      rafraichirRechercheSiOuverteV2();
    } else {
      var cb = barcodeDepuisSAQV2(e.codeSAQ);
      cacherToutesPagesV2();
      if (cb) ouvrirApresTap(function() { ouvrirFicheV2(cb, 'suggestions'); });
    }
  }).catch(function() { afficherMessage('Erreur, réessayez'); });
}

function ajouterDepuisSuggestionsV2() {
  suggestionsV2Attente = true;
  cacherToutesPagesV2();
  ouvrirApresTap(startScannerV2);
}

// ==================== LISTE D'ACHAT V2 (promotions intégrées) ====================
// Modes AFFICHER : favoris | achat | suggestions | decouvertes | nepasracheter
var filtresAchatV2 = { couleur: '', pays: '', cepage: '', appellation: '', pastille: '', succ: '', sommelier: '' };
var achatV2Mode = 'achat';
var achatV2PromoSeul = false; // interrupteur « Que les vins en promotion »
var libellesFiltreAchatV2 = { couleur: 'Couleur', pays: 'Pays', cepage: 'Cépage', appellation: 'Appellation', pastille: 'Pastille de goût', succ: 'Succursale' };
var succursalesAchatV2 = [];

// Promotions SAQ repliées dans la liste d'achat
var promosMesV2 = null;        // promos sur MES vins (par code SAQ)
var promosDecV2 = null;        // toutes les promos SAQ (Découvertes)
var promosDecEnCours = false;
var promosDecDebut = 0;        // début du chargement des Découvertes (le compteur « 0:45 »)
var COMPTEUR_DEC_V2 = null;
var promoParCodeV2 = {};       // code SAQ -> { prixRegulier, prixFinal, rabais, pointsBonis }

function codesSAQCaveV2() {
  var vues = {};
  var codes = [];
  (ALL_DATA || []).forEach(function(i) {
    var c = (i['Code SAQ'] || '').toString().trim();
    if (c && !vues[c]) { vues[c] = true; codes.push(c); }
  });
  return codes;
}

function vinParCodeSAQV2(codeSAQ) {
  var c = (codeSAQ || '').toString().trim();
  return (ALL_DATA || []).filter(function(i) {
    return (i['Code SAQ'] || '').toString().trim() === c;
  })[0] || null;
}

function indexerPromosMesV2() {
  promoParCodeV2 = {};
  (promosMesV2 || []).forEach(function(p) {
    var c = (p.codeSAQ || '').toString().trim();
    if (c) promoParCodeV2[c] = p;
  });
}

function achatV2Ouvert() {
  var c = document.getElementById('achatV2Container');
  return c && c.style.display !== 'none';
}

function chargerPromosMesV2() {
  if (promosMesV2) { indexerPromosMesV2(); return; }
  appelBackend('getPromotionsSAQ', { codesSAQ: codesSAQCaveV2() }, { spinner: '', timeout: 120000 }).then(function(promos) {
    promosMesV2 = promos || [];
    indexerPromosMesV2();
    if (achatV2Ouvert() && achatV2Mode !== 'decouvertes') appliquerFiltresAchatV2();
    // les cartes des Propositions montrent aussi le prix (page et section de la Recherche)
    var sugg = document.getElementById('suggestionsV2Container');
    if (sugg && sugg.style.display !== 'none') afficherSuggestionsV2();
    rafraichirRechercheSiOuverteV2();
  }).catch(function() {});
}

function chargerDecouvertesV2() {
  if (promosDecV2 || promosDecEnCours) return;
  promosDecEnCours = true;
  promosDecDebut = Date.now();
  appelBackend('getToutesPromotionsSAQ', { codesSAQ: codesSAQCaveV2() }, { spinner: '', timeout: 300000 }).then(function(promos) {
    promosDecV2 = promos || [];
    promosDecEnCours = false;
    if (achatV2Ouvert() && achatV2Mode === 'decouvertes') appliquerFiltresAchatV2();
  }).catch(function(e) {
    promosDecEnCours = false;
    // sinon le verre tournerait pour rien ; rechoisir la liste relance le chargement
    if (achatV2Ouvert() && achatV2Mode === 'decouvertes') {
      document.getElementById('achatV2-cartes').innerHTML = '<div class="texte-secondaire">Découvertes indisponibles' + (e && e.message ? ' : ' + e.message : '') + ' — rechoisis la liste pour réessayer</div>';
    }
  });
}

// « 0:45 » depuis le début du chargement des Découvertes
function dureeDecouvertesV2() {
  var s = promosDecEnCours ? Math.floor((Date.now() - promosDecDebut) / 1000) : 0;
  return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
}

function promoDuVinV2(w) {
  if (w.__promo) return w.__promo;
  var c = (w['Code SAQ'] || '').toString().trim();
  return (c && promoParCodeV2[c]) ? promoParCodeV2[c] : null;
}

function ouvrirAchatV2() {
  document.getElementById('achatV2Container').style.display = 'flex';
  remonterScrollV2('achatV2Container');
  panierSessionAchatV2 = {};
  filtresAchatV2 = { couleur: '', pays: '', cepage: '', appellation: '', pastille: '', succ: '', sommelier: '' };
  achatV2Mode = 'achat';
  achatV2PromoSeul = false;
  if (!succursalesAchatV2.length) {
    appelBackend('getSuccursales', {}, { spinner: '' }).then(function(succ) {
      succursalesAchatV2 = succ || [];
      remplirFiltresAchatV2();
    }).catch(function() {});
  }
  chargerPromosMesV2();
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
}

function fermerAchatV2() {
  fermerFiltresAchatV2();
  document.getElementById('achatV2Container').style.display = 'none';
}

function baseAchatV2() {
  if (achatV2Mode === 'decouvertes') {
    return (promosDecV2 || []).map(function(p) {
      return {
        Nom: p.nom, 'Code SAQ': p.codeSAQ, Couleur: p.couleur || '', Pays: p.pays || '',
        Region: p.region || '', Cepage: p.cepage || '', Appellation: p.appellation || '', 'Pastille gout': p.pastille || '',
        'Photo URL': p.photo || '', 'Code-barres': '', __decouverte: true,
        __promo: { prixRegulier: p.prixRegulier, prixFinal: p.prixFinal, rabais: p.rabais, pointsBonis: p.pointsBonis || 0 }
      };
    });
  }
  var grouped = {};
  (ALL_DATA || []).forEach(function(item) {
    var key = cleVinV2(item);
    if (!grouped[key]) grouped[key] = { wine: item, count: 0 };
    var statut = item.Statut || 'En stock';
    if (statut !== 'Bu' && statut !== 'Sorti') grouped[key].count++;
  });
  var arr = Object.keys(grouped).map(function(k) { return grouped[k]; });
  var out;
  if (achatV2Mode === 'favoris') {
    out = arr.filter(function(g) { return (g.wine.Favori || '') === 'Oui'; });
  } else if (achatV2Mode === 'suggestions') {
    out = arr.filter(function(g) { return (g.wine.Racheter || '').toString().trim() === ''; });
  } else if (achatV2Mode === 'nepasracheter') {
    out = arr.filter(function(g) { return (g.wine.Racheter || '') === 'Non'; });
  } else {
    out = arr.filter(function(g) {
      var racheter = (g.wine.Racheter || '') === 'Oui';
      var panier = (g.wine.Panier || '') === 'Oui';
      return (racheter && g.count === 0) || panier;
    });
  }
  var vins = out.map(function(g) { g.wine.__count = g.count; return g.wine; });
  if (achatV2PromoSeul) vins = vins.filter(function(w) { return !!promoDuVinV2(w); });
  return vins;
}

function remplirFiltresAchatV2() {
  var f = filtresAchatV2;
  var modes = { favoris: 'achatV2-mode-favoris', achat: 'achatV2-mode-achat', suggestions: 'achatV2-mode-suggestions', decouvertes: 'achatV2-mode-decouvertes', nepasracheter: 'achatV2-mode-nepasracheter' };
  Object.keys(modes).forEach(function(m){
    var el = document.getElementById(modes[m]);
    if (el) el.classList.toggle('actif', achatV2Mode === m);
  });
  var tg = document.getElementById('achatV2-promo');
  if (tg) { tg.classList.toggle('actif', achatV2PromoSeul); tg.textContent = achatV2PromoSeul ? '✓' : '✗'; }

  var base = baseAchatV2();
  var forCouleur = base;
  var forPays = base.filter(function(i){ return passeFiltreV2(f.couleur, i.Couleur); });
  var forCepage = base.filter(function(i){
    return passeFiltreV2(f.couleur, i.Couleur) && passeFiltreV2(f.pays, i.Pays);
  });
  var forAppellation = forCepage.filter(function(i){
    return passeFiltreV2(f.cepage, i.Cepage, contientCepageV2);
  });
  var forPastille = forAppellation.filter(function(i){
    return passeFiltreV2(f.appellation, i.Appellation);
  });

  var listes = {
    couleur: uniqueValeursAchat(forCouleur, 'Couleur'),
    pays: uniqueValeursAchat(forPays, 'Pays'),
    cepage: menuCepagesV2([].concat.apply([], forCepage.map(function(i){ return cepagesDuTexteV2(i.Cepage); }))),
    appellation: uniqueValeursAchat(forAppellation, 'Appellation'),
    pastille: uniqueValeursAchat(forPastille, 'Pastille gout')
  };

  ['couleur','pays','cepage','appellation','pastille'].forEach(function(cle){
    var cur = f[cle];
    var menu = document.getElementById('achatV2-f-' + cle + '-menu');
    if (!menu) return;
    menu.innerHTML = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'' + cle + '\', \'\')">Tous</div>' + listes[cle].map(function(v){
      return '<div class="item-liste' + classeChoixV2(v, cur) + '" onclick="choisirFiltreAchatV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('achatV2-f-' + cle + '-display');
    if (disp) disp.textContent = libelleChoixV2(cur, libellesFiltreAchatV2[cle]);
  });

  var menuSucc = document.getElementById('achatV2-f-succ-menu');
  if (menuSucc) {
    var items = succursalesAchatV2.map(function(s){
      return '<div class="item-liste' + (s.numero === f.succ ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'succ\', \'' + s.numero + '\')">' + s.nom + '</div>';
    }).join('');
    items += '<div class="item-liste' + (f.succ === 'FAV' ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'succ\', \'FAV\')">Mes favorites</div>';
    items += '<div class="item-liste' + (f.succ === 'TOUTES' ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'succ\', \'TOUTES\')">Toutes les succursales</div>';
    items += '<div class="item-liste" onclick="gererFavoritesV2(\'achatV2\')">Gérer mes favorites</div>';
    menuSucc.innerHTML = items;
    var dispSucc = document.getElementById('achatV2-f-succ-display');
    if (dispSucc) {
      if (f.succ === 'FAV') dispSucc.textContent = 'Mes favorites';
      else if (f.succ === 'TOUTES') dispSucc.textContent = 'Toutes les succursales';
      else {
        var sel = succursalesAchatV2.filter(function(s){ return s.numero === f.succ; })[0];
        dispSucc.textContent = sel ? sel.nom : libellesFiltreAchatV2.succ;
      }
    }
  }

  var menuSom = document.getElementById('achatV2-f-sommelier-menu');
  if (menuSom) {
    var vusSom = {}, sommeliers = [];
    (ALL_SUGGESTIONS || []).forEach(function(s){
      var v = (s.sommelier || '').toString().trim();
      var k = normaliserRechercheV2(v);
      if (v && !vusSom[k]) { vusSom[k] = true; sommeliers.push(v); }
    });
    sommeliers.sort(function(a, b){ return a.localeCompare(b); });
    menuSom.innerHTML = '<div class="item-liste' + (f.sommelier === '' ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'sommelier\', \'\')">Tous</div>' + sommeliers.map(function(v){
      return '<div class="item-liste' + classeChoixV2(v, f.sommelier) + '" onclick="choisirFiltreAchatV2(\'sommelier\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var dispSom = document.getElementById('achatV2-f-sommelier-display');
    if (dispSom) dispSom.textContent = libelleChoixV2(f.sommelier, 'Sommelier');
  }
}

function uniqueValeursAchat(liste, champ) {
  var vues = {};
  var out = [];
  liste.forEach(function(i){
    var v = (i[champ] || '').toString().trim();
    var cle = normaliserRechercheV2(v);
    if (v && !vues[cle]) { vues[cle] = true; out.push(v); }
  });
  out.sort(function(a, b){ return a.localeCompare(b); });
  return out;
}

function toggleAchatPromoSeulV2() {
  achatV2PromoSeul = !achatV2PromoSeul;
  if (achatV2PromoSeul && !promosMesV2) chargerPromosMesV2();
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
}

function basculerFiltreAchatV2(cle) {
  var menu = document.getElementById('achatV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['couleur','pays','cepage','appellation','pastille','succ','sommelier'].forEach(function(k){
    var m = document.getElementById('achatV2-f-' + k + '-menu');
    if (m) m.classList.remove('ouvert');
  });
  if (!ouvert) { menu.classList.add('ouvert'); annulerFermetureMenuV2(menu.id); }
}

function choisirFiltreAchatV2(cle, valeur) {
  // la succursale est un choix, pas un filtre : pas de « sauf »
  filtresAchatV2[cle] = cle === 'succ' ? valeur : cycleFiltreV2(filtresAchatV2[cle], valeur);
  fermerMenuApresV2('achatV2-f-' + cle + '-menu');
  if (cle === 'couleur') { filtresAchatV2.pays = ''; filtresAchatV2.cepage = ''; filtresAchatV2.appellation = ''; filtresAchatV2.pastille = ''; }
  if (cle === 'pays') { filtresAchatV2.cepage = ''; filtresAchatV2.appellation = ''; filtresAchatV2.pastille = ''; }
  if (cle === 'cepage') { filtresAchatV2.appellation = ''; filtresAchatV2.pastille = ''; }
  if (cle === 'appellation') { filtresAchatV2.pastille = ''; }
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
}

function reinitialiserFiltresAchatV2() {
  filtresAchatV2 = { couleur: '', pays: '', cepage: '', appellation: '', pastille: '', succ: '', sommelier: '' };
  achatV2PromoSeul = false;
  ['couleur','pays','cepage','appellation','pastille','succ','sommelier'].forEach(function(k) {
    var m = document.getElementById('achatV2-f-' + k + '-menu');
    if (m) m.classList.remove('ouvert');
  });
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
  fermerFiltresAchatV2();
}

function ouvrirFiltresAchatV2() { clicLoupeV2('achatV2', reinitialiserFiltresAchatV2); }
function fermerFiltresAchatV2() {
  document.getElementById('achatV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('achatV2-filtres').classList.remove('ouvert');
}

function choisirModeAchatV2(mode) {
  achatV2Mode = mode;
  filtresAchatV2.couleur = ''; filtresAchatV2.pays = ''; filtresAchatV2.cepage = ''; filtresAchatV2.appellation = ''; filtresAchatV2.pastille = ''; filtresAchatV2.sommelier = '';
  if (mode === 'decouvertes' && !promosDecV2) chargerDecouvertesV2();
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
  fermerFiltresAchatV2();
}

function majEntonnoirAchatV2() {
  var f = filtresAchatV2;
  var loupe = document.getElementById('achatV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(achatV2PromoSeul || f.couleur || f.pays || f.cepage || f.appellation || f.pastille || f.succ || f.sommelier));
}

function appliquerFiltresAchatV2() {
  if (achatV2Mode === 'decouvertes' && !promosDecV2) {
    chargerDecouvertesV2();
    remplirFiltresAchatV2();
    document.getElementById('achatV2-compte').textContent = '';
    document.getElementById('achatV2-cartes').innerHTML = '<div class="spinner-en-ligne">' + verreSpinnerHtmlV2() +
      '<div class="spinner-texte">Découvertes · <span id="achatV2-compteur">' + dureeDecouvertesV2() + '</span></div>' +
      '<div class="texte-secondaire sans-majuscules">Patience… la SAQ envoie toutes ses promotions. Ça peut prendre une minute ou deux.</div></div>';
    if (!COMPTEUR_DEC_V2) COMPTEUR_DEC_V2 = setInterval(function() {
      var el = document.getElementById('achatV2-compteur');
      if (!el || !promosDecEnCours) { clearInterval(COMPTEUR_DEC_V2); COMPTEUR_DEC_V2 = null; return; }
      el.textContent = dureeDecouvertesV2();
    }, 1000);
    majEntonnoirAchatV2();
    return;
  }
  var f = filtresAchatV2;
  var base = baseAchatV2();
  var filtered = base.filter(function(i){
    return passeFiltreV2(f.couleur, i.Couleur) &&
      passeFiltreV2(f.pays, i.Pays) &&
      passeFiltreV2(f.cepage, i.Cepage, contientCepageV2) &&
      passeFiltreV2(f.appellation, i.Appellation) &&
      passeFiltreV2(f.pastille, i['Pastille gout'], contientTexteV2) &&
      (!f.sommelier || passeFiltreV2(f.sommelier, sommeliersDuVinV2((i['Code SAQ'] || '').toString().trim()), listeContientV2));
  });
  afficherCartesAchatV2(filtered);
  majEntonnoirAchatV2();
}

function cleCartePanierV2(w) {
  return ((w['Code-barres'] || w['Code SAQ'] || w.Nom || '') + '').toString().trim().replace(/\s+/g, '');
}

function sommeliersDuVinV2(codeSAQ) {
  var c = (codeSAQ || '').toString().trim();
  if (!c) return [];
  var vus = {}, out = [];
  (ALL_SUGGESTIONS || []).forEach(function(s) {
    if ((s.codeSAQ || '').toString().trim() !== c) return;
    var nom = (s.sommelier || '').toString().trim();
    var k = normaliserRechercheV2(nom);
    if (nom && !vus[k]) { vus[k] = true; out.push(nom); }
  });
  return out;
}

var imgBonisAchatV2 = { 250:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910660/250_hgv2se.png', 500:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910661/500_ko3y8t.png', 750:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910662/750_rscr3d.png', 800:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910663/800_cqr4co.png', 1000:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910664/1000_lunrjq.png', 1250:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910665/1250_yeot7a.png', 1500:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910666/1500_acyruz.png', 1750:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910667/1750_rv32nr.png', 2000:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910667/2000_c7mwzw.png', 2250:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910668/2250_fm1igm.png', 2500:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910669/2500_lygz2e.png', 2750:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910670/2750_lw24g6.png', 3000:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910671/3000_xu2s3l.png' };

function boisPointsAchatV2(pts) {
  if (!pts) return '';
  return imgBonisAchatV2[pts] ? '<br><img class="achat-bonis" src="' + imgBonisAchatV2[pts] + '" alt="+' + pts + ' pts">' : '<br>+' + pts + ' pts';
}

function blocPrixAchatV2(w) {
  var promo = promoDuVinV2(w);
  if (promo) {
    var barre = (promo.rabais > 0.01 && promo.prixRegulier != null) ? '<span class="prix-barre">' + Number(promo.prixRegulier).toFixed(2) + ' $</span><br>' : '';
    var fin = (promo.prixFinal != null) ? Number(promo.prixFinal).toFixed(2) + ' $' : '';
    return '<div class="fs-12 color-white">' + barre + fin + boisPointsAchatV2(promo.pointsBonis) + '</div>';
  }
  var prix = (w.Prix !== '' && w.Prix != null && !isNaN(parseFloat(w.Prix))) ? parseFloat(w.Prix).toFixed(2) + ' $' : '';
  return prix ? '<div class="fs-12 color-white">' + prix + '</div>' : '';
}

// Cépages PRINCIPAUX déjà eus dans la cave (tout ALL_DATA, sauf les propositions — Racheter vide) — pour marquer les cépages nouveaux en Découvertes
function cepagesPrincipauxCaveV2() {
  var s = {};
  (ALL_DATA || []).forEach(function(w){
    if (estPropositionV2(w)) return;
    var c = cleCommuneCepageV2(cepageDominant(w));
    if (c) s[c] = true;
  });
  return s;
}

function afficherCartesAchatV2(liste) {
  var parCepage = (achatV2Mode === 'decouvertes');
  liste.sort(function(a, b){
    if (parCepage) {
      var ca = cleCommuneCepageV2(cepagesDuTexteV2(a.Cepage)[0]);
      var cbb = cleCommuneCepageV2(cepagesDuTexteV2(b.Cepage)[0]);
      if (ca !== cbb) { if (!ca) return 1; if (!cbb) return -1; return ca.localeCompare(cbb); }
      return (a.Nom || '').localeCompare(b.Nom || '');
    }
    var pa = normaliserRechercheV2(a.Pays || 'zzz');
    var pb = normaliserRechercheV2(b.Pays || 'zzz');
    if (pa !== pb) return pa.localeCompare(pb);
    return (a.Nom || '').localeCompare(b.Nom || '');
  });
  var div = document.getElementById('achatV2-cartes');
  document.getElementById('achatV2-compte').innerHTML = libelleCompteAchatV2(liste.length);
  if (liste.length === 0) { div.innerHTML = '<div class="texte-secondaire">' + (parCepage ? 'Aucune promotion' : 'Aucune bouteille') + '</div>'; return; }
  var f = filtresAchatV2;
  var derniereSection = null;
  var cavePrincipaux = parCepage ? cepagesPrincipauxCaveV2() : null;
  div.innerHTML = liste.map(function(w){
    var entete = '';
    var sectionCle, sectionTexte;
    if (parCepage) {
      var cep = cepagesDuTexteV2(w.Cepage)[0] || '';
      sectionCle = cleCommuneCepageV2(cep);
      sectionTexte = cep ? cepageCommunV2(cep) : 'Sans cépage';
    } else {
      sectionCle = normaliserRechercheV2(w.Pays || '');
      sectionTexte = w.Pays || 'Sans pays';
    }
    if (sectionCle !== derniereSection) {
      derniereSection = sectionCle;
      var marque = (parCepage && cep && !cavePrincipaux[sectionCle]) ? ' <span class="cepage-nouveau">🍇</span>' : '';
      entete = '<div class="emp-meuble">' + sectionTexte + marque + '</div>';
    }
    var cle = cleCartePanierV2(w);
    var coche = !!panierSessionAchatV2[cle];
    var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var codeSAQ = (w['Code SAQ'] || '').toString().trim();
    var nom = decodeHTML(w.Nom || '—');
    var paysRegion = (w.Pays && w.Region) ? (w.Pays + ' • ' + w.Region) : (w.Pays || w.Region || '');
    var sousLignes = [paysRegion, annoterCepagesV2(w.Cepage), w.Appellation || ''];
    if (achatV2Mode === 'suggestions') {
      var soms = sommeliersDuVinV2(codeSAQ);
      if (soms.length) sousLignes.push('<span class="color-primary">' + soms.join(', ') + '</span>');
    }
    var sous = sousLignes.filter(Boolean).join('<br>');
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = '';
    if (f.succ === 'TOUTES' && codeSAQ) onclick = ' onclick="dispoProchesAchatV2(\'' + codeSAQ + '\')"';
    else if (w.__decouverte) onclick = codeSAQ ? ' onclick="window.open(\'https://www.saq.com/fr/' + codeSAQ + '\')"' : '';
    else if (cb) onclick = ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + cb + '\', \'achat\')})"';
    var cocheHtml = '<span class="coche-panier' + (coche ? ' actif' : '') + '" onclick="togglePanierSessionV2(\'' + cle.replace(/'/g, "\\'") + '\', event)"></span>';
    var prixHtml = blocPrixAchatV2(w);
    var btl = (achatV2Mode === 'favoris' && typeof w.__count === 'number') ? '<div class="fs-12">' + w.__count + ' btl</div>' : '';
    var dispo = (f.succ && f.succ !== 'TOUTES' && codeSAQ) ? '<div id="achatV2-dispo-' + codeSAQ + '">…</div>' : '';
    var proches = codeSAQ ? '<span id="achatV2-proches-' + codeSAQ + '"></span>' : '';
    var cellier = (w.Cellier === 'Oui') ? ' <span class="color-primary fs-11">Espace Cellier</span>' : '';
    return entete + '<div class="carte ' + couleurClasseV2(w.Couleur) + (coche ? ' carte-vide' : '') + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + cellier + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite carte-droite-empilee">' + cocheHtml + prixHtml + btl + dispo + proches + '</div></div>';
  }).join('');

  if (f.succ) chargerDispoAchatV2(liste);
}

var panierSessionAchatV2 = {};

function togglePanierSessionV2(cle, ev) {
  if (ev) ev.stopPropagation();
  var actif;
  if (panierSessionAchatV2[cle]) { delete panierSessionAchatV2[cle]; actif = false; }
  else { panierSessionAchatV2[cle] = true; actif = true; }
  if (ev && ev.target) {
    ev.target.classList.toggle('actif', actif);
    var carte = ev.target.closest('.carte');
    if (carte) carte.classList.toggle('carte-vide', actif);
  }
}

function libelleCompteAchatV2(n) {
  var txt;
  if (achatV2Mode === 'decouvertes') txt = n + ' vin' + (n > 1 ? 's' : '') + ' en promotion';
  else if (achatV2Mode === 'suggestions') txt = n + ' proposition' + (n > 1 ? 's' : '');
  else if (achatV2Mode === 'nepasracheter') txt = n + ' vin' + (n > 1 ? 's' : '') + ' à ne pas racheter';
  else if (achatV2Mode === 'favoris') txt = n + ' vin' + (n > 1 ? 's' : '');
  else txt = n + ' vin' + (n > 1 ? 's' : '');
  if (achatV2Mode !== 'decouvertes' && achatV2PromoSeul) txt += ' en promotion';
  var f = filtresAchatV2;
  var sel = succursalesAchatV2.filter(function(s){ return s.numero === f.succ; })[0];
  if (sel) {
    var nom = (sel.nom || '').trim();
    var m = nom.match(/^(.*?)\s+[—–-]\s+(.*)$/) || nom.match(/^([^,]+),\s*(.*)$/);
    var lignes = 'Succ. ' + (m ? m[1] : nom);
    if (m && m[2]) lignes += '<br>' + m[2];
    txt += '<br><span class="color-primary">' + lignes + '</span>';
  } else if (f.succ === 'FAV') txt += '<br><span class="color-primary">Mes favorites</span>';
  else if (f.succ === 'TOUTES') txt += '<br><span class="color-primary">Toutes les succursales</span>';
  return txt;
}

function majCompteAchatV2() {
  var cartes = document.querySelectorAll('#achatV2-cartes .carte');
  var n = 0;
  Array.prototype.forEach.call(cartes, function(c){ if (c.style.display !== 'none') n++; });
  document.getElementById('achatV2-compte').innerHTML = libelleCompteAchatV2(n);
  majEntetesAchatV2();
}

// Masque un en-tête de section (pays/cépage) qui n'a plus aucune carte visible sous lui
function majEntetesAchatV2() {
  var div = document.getElementById('achatV2-cartes');
  if (!div) return;
  var entete = null;
  var aVisible = false;
  Array.prototype.forEach.call(div.children, function(el){
    if (el.classList.contains('emp-meuble')) {
      if (entete) entete.style.display = aVisible ? '' : 'none';
      entete = el;
      aVisible = false;
    } else if (el.classList.contains('carte') && el.style.display !== 'none') {
      aVisible = true;
    }
  });
  if (entete) entete.style.display = aVisible ? '' : 'none';
}

function chargerDispoAchatV2(liste) {
  var f = filtresAchatV2;
  if (!f.succ || f.succ === 'TOUTES') return;
  if (f.succ === 'FAV') {
    var favoris = succursalesAchatV2.map(function(s){ return s.numero; });
    liste.forEach(function(w){
      var codeSAQ = (w['Code SAQ'] || '').toString().trim();
      if (!codeSAQ) return;
      function el(){ return document.getElementById('achatV2-dispo-' + codeSAQ); }
      appelBackend('getSuccursalesDisponibles', { codeSAQ: codeSAQ }, { spinner: '', timeout: 120000 }).then(function(succursales){
        var e = el(); if (!e) return;
        var dansFav = (succursales || []).filter(function(s){ return favoris.indexOf(s.numero) !== -1 && s.quantite > 0; });
        if (!dansFav.length) { e.innerHTML = '<span class="dispo-non">✗</span>'; return; }
        e.innerHTML = dansFav.map(function(s){ return '<span class="dispo-oui">' + s.nom + ' ' + s.quantite + '</span>'; }).join('<br>');
      }).catch(function(){ var e = el(); if (e) e.textContent = '—'; });
    });
    return;
  }
  // Succursale précise : l'inventaire d'abord (un seul appel, gardé pour le scan sans réseau) → la liste se réduit
  // aux vins disponibles → la quantité n'est demandée que pour ceux-là. Sans inventaire : une question par vin, comme avant.
  var succ = f.succ;
  var codes = liste.map(function(w){ return (w['Code SAQ'] || '').toString().trim(); }).filter(Boolean);
  inventaireSuccV2(succ).then(function(inv) {
    if (filtresAchatV2.succ !== succ) return;
    var dispo = {};
    inv.produits.forEach(function(p){ dispo[p.codeSAQ] = true; });
    codes.forEach(function(codeSAQ){
      if (dispo[codeSAQ]) { quantiteDispoAchatV2(codeSAQ, succ); return; }
      var e = document.getElementById('achatV2-dispo-' + codeSAQ);
      var carte = e ? e.closest('.carte') : null;
      if (carte) carte.style.display = 'none';
    });
    majCompteAchatV2();
  }).catch(function() {
    if (filtresAchatV2.succ !== succ) return;
    codes.forEach(function(codeSAQ){ quantiteDispoAchatV2(codeSAQ, succ); });
  });
}

// Quantité d'un vin dans la succursale (« X btl ») ; absent → la carte est masquée
function quantiteDispoAchatV2(codeSAQ, succ) {
  function el(){ return document.getElementById('achatV2-dispo-' + codeSAQ); }
  appelBackend('verifierDispoSAQ_GRAPHQL_V1', { codeSAQ: codeSAQ, succursale: succ }, { spinner: '' }).then(function(res){
    var e = el(); if (!e) return;
    if (res && res.disponible) {
      e.innerHTML = '<span class="dispo-oui">' + (res.quantite ? res.quantite + ' btl' : '✓') + '</span>';
    } else {
      var carte = e.closest('.carte');
      if (carte) carte.style.display = 'none';
      majCompteAchatV2();
    }
  }).catch(function(){ var e = el(); if (e) e.textContent = '—'; });
}

// ==================== INVENTAIRE DE LA SUCCURSALE ====================
// Tout ce que la succursale choisie dans la Liste d'achat a en stock (route getInventaireSuccursale, ~1500 produits).
// Chargé une fois par succursale (dans l'auto, avec du réseau), gardé en mémoire pour le scan entre les murs de béton,
// et en copie dans le téléphone (repris au redémarrage : < 24 h, ou toujours sans réseau). Vidé par le bouton « Données ».
var INVENTAIRE_SUCC_V2 = null;         // { succ, produits: [{ codeSAQ, nom, cups:[…], pays, appellation, cepage, aromes… }] }
var INVENTAIRE_SUCC_V2_ATTENTE = null; // { succ, promesse } pendant le chargement (évite les doubles appels)

function inventaireSuccV2(succ) {
  if (INVENTAIRE_SUCC_V2 && INVENTAIRE_SUCC_V2.succ === succ) return Promise.resolve(INVENTAIRE_SUCC_V2);
  if (INVENTAIRE_SUCC_V2_ATTENTE && INVENTAIRE_SUCC_V2_ATTENTE.succ === succ) return INVENTAIRE_SUCC_V2_ATTENTE.promesse;
  function page(n, cumul) {
    return appelBackend('getInventaireSuccursale', { succursale: succ, page: n }, { spinner: '', timeout: 330000 }).then(function(res) {
      // Exige une vraie réponse : un backend pas encore redéployé répond « Action inconnue » → on retombe sur l'ancien mode
      if (!res || res.success !== true || !Array.isArray(res.produits)) throw new Error((res && (res.message || res.error)) || 'Inventaire indisponible');
      cumul = cumul.concat(res.produits);
      if (!res.termine && res.pageSuivante) return page(res.pageSuivante, cumul);
      return cumul;
    });
  }
  var promesse = page(1, []).then(function(produits) {
    INVENTAIRE_SUCC_V2 = { succ: succ, produits: produits };
    garderCopieV2('inventaireSucc', INVENTAIRE_SUCC_V2); // pour rouvrir l'app sans réseau en succursale
    return INVENTAIRE_SUCC_V2;
  });
  INVENTAIRE_SUCC_V2_ATTENTE = { succ: succ, promesse: promesse };
  var fin = function() { if (INVENTAIRE_SUCC_V2_ATTENTE && INVENTAIRE_SUCC_V2_ATTENTE.promesse === promesse) INVENTAIRE_SUCC_V2_ATTENTE = null; };
  promesse.then(fin, fin);
  return promesse;
}

// Produit de l'inventaire qui porte ce code-barres (un code par millésime ; zéros de tête ignorés)
function produitInventaireParCodeV2(code) {
  if (!INVENTAIRE_SUCC_V2) return null;
  var produits = INVENTAIRE_SUCC_V2.produits;
  for (var i = 0; i < produits.length; i++) {
    if ((produits[i].cups || []).some(function(c){ return memeCodeV2(c, code); })) return produits[i];
  }
  return null;
}

function dispoProchesAchatV2(codeSAQ) {
  var el = document.getElementById('achatV2-proches-' + codeSAQ);
  if (!el) return;
  el.innerHTML = '<br>Recherche…';
  function chercher(lat, lng) {
    appelBackend('getSuccursalesDisponibles', { codeSAQ: codeSAQ, lat: lat, lng: lng }, { spinner: '', timeout: 120000 }).then(function(succursales){
      var dispo = (succursales || []).filter(function(s){ return s.quantite > 0; });
      if (!dispo.length) { el.innerHTML = '<br><span class="dispo-non">✗</span>'; return; }
      el.innerHTML = dispo.slice(0, 3).map(function(s){
        var adresseMaps = encodeURIComponent([s.adresse, s.ville, 'QC'].filter(Boolean).join(', '));
        return '<br><span class="dispo-oui" onclick="event.stopPropagation(); window.open(\'https://maps.apple.com/?daddr=' + adresseMaps + '\', \'_blank\')">' + s.nom + ' ' + s.quantite + '</span>';
      }).join('');
    }).catch(function(){ el.innerHTML = ''; });
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) { chercher(pos.coords.latitude, pos.coords.longitude); },
      function() { chercher(null, null); }
    );
  } else { chercher(null, null); }
}

// ==================== GESTION DES SUCCURSALES FAVORITES ====================
var toutesSuccursalesV2 = [];
var gererFavCibleV2 = '';

function gererFavoritesV2(cible) {
  gererFavCibleV2 = cible;
  if (toutesSuccursalesV2.length) { rendreGererFavoritesV2(); return; }
  appelBackend('getToutesSuccursales', {}, { spinner: ' ' }).then(function(liste) {
    toutesSuccursalesV2 = liste || [];
    rendreGererFavoritesV2();
  }).catch(function() { afficherMessage('Liste des succursales indisponible'); });
}

function rendreGererFavoritesV2() {
  var menu = document.getElementById(gererFavCibleV2 + '-f-succ-menu');
  if (!menu) return;
  var html = '<div class="item-liste actif" onclick="finirGererFavoritesV2()">Terminé</div>';
  html += succursalesAchatV2.map(function(s) {
    return '<div class="item-liste" onclick="retirerFavoriteV2(\'' + s.numero + '\')">' + s.nom + '<span class="fav-x">✗</span></div>';
  }).join('');
  html += '<input type="text" id="gererFavV2-filtre" class="champ-saisie" placeholder="Chercher une ville" oninput="filtrerGererFavoritesV2()">';
  html += '<div id="gererFavV2-liste"></div>';
  menu.innerHTML = html;
  menu.classList.add('ouvert');
  filtrerGererFavoritesV2();
}

function filtrerGererFavoritesV2() {
  var div = document.getElementById('gererFavV2-liste');
  if (!div) return;
  var champ = document.getElementById('gererFavV2-filtre');
  var terme = normaliserRechercheV2(champ ? champ.value.trim() : '');
  if (terme.length < 2) { div.innerHTML = '<div class="texte-secondaire"></div>'; return; }
  var favNums = succursalesAchatV2.map(function(s) { return s.numero; });
  div.innerHTML = toutesSuccursalesV2.filter(function(s) {
    if (favNums.indexOf(s.numero) !== -1) return false;
    return normaliserRechercheV2(s.ville + ' ' + s.adresse).indexOf(terme) !== -1;
 }).map(function(s) {
    var nom = (s.ville + ' — ' + s.adresse);
    return '<div class="item-liste" onclick="ajouterFavoriteV2(\'' + s.numero + '\', \'' + nom.replace(/'/g, "\\'") + '\')">+ ' + nom + '</div>';
  }).join('');
}

function ajouterFavoriteV2(numero, nom) {
  appelBackend('ajouterSuccursale', { nom: nom, numero: numero }, { spinner: 'Ajout' }).then(function() {
    succursalesAchatV2.push({ nom: nom, numero: numero });
    rendreGererFavoritesV2();
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function retirerFavoriteV2(numero) {
  appelBackend('supprimerSuccursale', { numero: numero }, { spinner: 'Retrait' }).then(function() {
    succursalesAchatV2 = succursalesAchatV2.filter(function(s) { return s.numero !== numero; });
    rendreGererFavoritesV2();
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function finirGererFavoritesV2() {
  remplirFiltresAchatV2();
  var menu = document.getElementById(gererFavCibleV2 + '-f-succ-menu');
  if (menu) menu.classList.add('ouvert');
}

// ==================== FACTURE SAQ V2 ====================
var RECU_V2_ITEMS = [];
var RECU_V2_INDEX = 0;
var RECU_V2_BINGOS = 0;   // vins de la facture proposés dans Curieux Bégin (« Facture traitée — 2 bingos »)

function ouvrirRecuV2() {
  document.getElementById('recuV2-fichier').value = '';
  document.getElementById('recuV2Container').style.display = 'flex';
  RECU_V2_BINGOS = 0;
  if (!ALL_CURIEUXBEGIN || !ALL_CURIEUXBEGIN.length) chargerCurieuxBeginScanV2(majBingoRecuV2);
}

// Bingo ! le vin à valider a été proposé dans Curieux Bégin : le plat et la saison → la recette
function majBingoRecuV2() {
  var div = document.getElementById('recuValidationV2-bingo');
  if (!div) return;
  var saq = (document.getElementById('recuValidationV2-codesaq').value || '').replace(/\D/g, '').trim();
  div.innerHTML = saq ? citationCurieuxBeginV2(saq, 'Bingo ! Curieux Bégin') : '';
}

function fermerRecuV2() {
  document.getElementById('recuV2Container').style.display = 'none';
  document.getElementById('recuValidationV2Container').style.display = 'none';
  RECU_V2_ITEMS = [];
  RECU_V2_INDEX = 0;
  RECU_V2_BINGOS = 0;
}

function traiterPhotoRecuV2(input) {
  var fichier = input.files && input.files[0];
  if (!fichier) return;
  var lecteur = new FileReader();
  lecteur.onload = function() {
    var base64 = lecteur.result.split(',')[1];
    appelBackend('extraireRecuSAQ', { image: base64 }, { spinner: 'Lecture de la facture', timeout: 60000 }).then(function(res) {
      if (!res || !res.success) {
        afficherMessage('Erreur OCR : ' + ((res && res.error) || 'inconnue'));
        fermerRecuV2();
        return;
      }
      if (!res.items || !res.items.length) {
        afficherMessage('Aucun code trouvé sur la facture');
        fermerRecuV2();
        return;
      }
      RECU_V2_ITEMS = res.items;
      RECU_V2_INDEX = 0;
      document.getElementById('recuV2Container').style.display = 'none';
      document.getElementById('recuValidationV2Container').style.display = 'flex';
      afficherProchainRecuVinV2();
    }).catch(function() {
      afficherMessage('Erreur de lecture de la facture');
      fermerRecuV2();
    });
  };
  lecteur.readAsDataURL(fichier);
}

function afficherProchainRecuVinV2() {
  if (RECU_V2_INDEX >= RECU_V2_ITEMS.length) {
    var bingos = RECU_V2_BINGOS;
    fermerRecuV2();
    afficherMessage(bingos ? 'Facture traitée — ' + bingos + ' bingo' + (bingos > 1 ? 's' : '') : 'Facture traitée');
    return;
  }
  var item = RECU_V2_ITEMS[RECU_V2_INDEX];
  document.getElementById('recuValidationV2-compte').textContent = (RECU_V2_INDEX + 1) + ' / ' + RECU_V2_ITEMS.length;
  document.getElementById('recuValidationV2-codesaq').value = item.codeSAQ || '';
  document.getElementById('recuValidationV2-qte').value = (item.qte && item.qte > 0) ? item.qte : 1;
  document.getElementById('recuValidationV2-statut').textContent = '';
  majBingoRecuV2();

  var codeSAQ = (item.codeSAQ || '').toString().trim();
  document.getElementById('recuValidationV2-nom').value = codeSAQ ? 'Recherche...' : '';
  if (!codeSAQ) return;

  var connu = (ALL_DATA || []).filter(function(i) { return (i['Code SAQ'] || '').toString().trim() === codeSAQ; })[0];
  if (connu) {
    document.getElementById('recuValidationV2-nom').value = decodeHTML(connu.Nom || '');
    return;
  }

  appelBackend('testScrapingSAQ', { codeSAQ: codeSAQ }, { spinner: '' }).then(function(res) {
    var nom = (res && res.success && res.data) ? (res.data.nom || '') : '';
    document.getElementById('recuValidationV2-nom').value = nom ? decodeHTML(nom) : 'Vin introuvable, vérifiez le code';
  }).catch(function() {
    document.getElementById('recuValidationV2-nom').value = 'Vin introuvable, vérifiez le code';
  });
}

function passerRecuVinV2() {
  RECU_V2_INDEX++;
  afficherProchainRecuVinV2();
}

function confirmerRecuVinV2() {
  var codeSAQ = document.getElementById('recuValidationV2-codesaq').value.replace(/\D/g, '').trim();
  var statutEl = document.getElementById('recuValidationV2-statut');
  if (!codeSAQ) { statutEl.textContent = 'Entrez un code SAQ'; return; }

  var qte = parseInt((document.getElementById('recuValidationV2-qte').value || '1'), 10);
  if (!(qte >= 1 && qte <= 99)) qte = 1;
  var bouteilles = [];
  for (var b = 0; b < qte; b++) bouteilles.push({ meuble: '', rangee: '', espace: '' });

  testSAQAvecRetryV2(codeSAQ).then(function(scrap) {
    var codeCUP = scrap && scrap.success && scrap.data ? (scrap.data.codeCUP || '').replace(/\D/g, '').trim() : '';
    if (!codeCUP) {
      statutEl.textContent = 'Vin introuvable, corrigez le code';
      return;
    }
    return appelBackend('ajouterVinAvecBouteilles', { codebarre: codeCUP, codeSAQ: codeSAQ, note: '', bouteilles: JSON.stringify(bouteilles), nom: '' }, { spinner: 'Ajout' }).then(function(res) {
      if (!res || !res.success) {
        statutEl.textContent = (res && res.message) || 'Erreur d\'ajout';
        return;
      }
      return appelBackend('getInventoryData', {}, { spinner: 'Ajout' }).then(function(data) {
        if (data) ALL_DATA = data;
        if (platsCurieuxBeginV2(codeSAQ).length) RECU_V2_BINGOS++;
        RECU_V2_INDEX++;
        afficherProchainRecuVinV2();
      });
    });
  }).catch(function() {
    statutEl.textContent = 'Erreur, réessayez';
  });
}
