/* ============================================================
   SCRIPTS-FICHE-V2.JS
   Fiche vin V2 — consultation seule, plein écran
============================================================ */

function ouvrirFicheV2(codebarre, provenance) {
  FICHE_V2_PROVENANCE = provenance || null;
  CURRENT_WINE_CODEBARRE = codebarre;
  document.getElementById('ficheV2Overlay').style.display = 'flex';
  document.getElementById('ficheV2-nom').textContent = 'Chargement...';
  document.getElementById('ficheV2-origine').innerHTML = '';
  document.getElementById('ficheV2-corps').innerHTML = '';

  appelBackend('getWineBottles', { codebarre: codebarre }, { spinner: '...' }).then(function(result) {
    if (!result) {
      fermerFicheV2();
      afficherMessage('Vin introuvable');
      return;
    }
    afficherFicheV2(result);
  }).catch(function(err) {
    fermerFicheV2();
    afficherMessage('Erreur: ' + err);
  });
}
 
function afficherFicheV2(result) {
  var wine = result.wine;
  var bottles = result.bottles || [];
  CURRENT_WINE_DATA = wine;
  CURRENT_WINE_BOTTLES = bottles;

  var couleur = (wine.Couleur || '').toLowerCase();
  var classeCouleur = couleur.includes('rouge') ? 'vin-rouge' :
                      couleur.includes('blanc') ? 'vin-blanc' :
                      couleur.includes('rose') || couleur.includes('rosé') ? 'vin-rose' :
                      couleur.includes('bulle') || couleur.includes('mousseux') ? 'vin-bulles' : 'vin-rouge';
  var panneauV2 = document.querySelector('#ficheV2Overlay .modal-v2-content');
  if (panneauV2) {
    panneauV2.classList.remove('vin-rouge', 'vin-blanc', 'vin-rose', 'vin-bulles');
    panneauV2.classList.add(classeCouleur);
  }

  var nomEl = document.getElementById('ficheV2-nom');
  if (wine['Code SAQ']) {
    nomEl.innerHTML = '<a href="https://www.saq.com/fr/' + wine['Code SAQ'] + '" target="_blank" class="lien-titre">' + decodeHTML(wine.Nom || 'Vin sans nom') + '</a>';
  } else {
    nomEl.textContent = decodeHTML(wine.Nom || 'Vin sans nom');
  }

  var origine = [];
  if (wine.Pays) origine.push(decodeHTML(wine.Pays));
  if (wine.Region) origine.push(decodeHTML(wine.Region));
  if (wine.Appellation) origine.push(decodeHTML(wine.Appellation));
  document.getElementById('ficheV2-origine').textContent = origine.join(' • ');

  function ligne(libelle, valeur) {
    if (!valeur) return '';
    return '<div class="ligne-info"><span class="libelle">' + libelle + ' : </span>' + decodeHTML(valeur.toString()) + '</div>';
  }

  var html = '';

  function carte(libelle, valeur) {
    if (!valeur) return '';
    return '<div class="carte-info"><span class="libelle">' + libelle + '</span><span class="valeur">' + decodeHTML(valeur.toString()) + '</span></div>';
  }

  // === INFORMATION ===
  html += '<div class="section">';
  html += '<h3 class="titre-2">Information</h3>';
 
  html += ligne('Cépages', wine['Cépage']);
  html += ligne('Pastille', wine['Pastille gout']);
  html += ligne('Classification', wine.Classification);
  html += ligne('Désignation', wine.Designation);
  html += ligne('Particularité', wine['Particularité']);
  html += '</div>';

  // === DESCRIPTION + PRIX (sans libellé) ===
  if (wine.Description || wine.Prix) {
    html += '<div class="section">';
    if (wine.Description) html += '<div class="texte">' + decodeHTML(wine.Description) + '</div>';
    if (wine.Prix) html += '<div class="ligne-info"><span id="ficheV2-prix">' + parseFloat(wine.Prix).toFixed(2) + '</span> $</div>';
    html += '</div>';
  }

  // === DÉGUSTATION ===
  html += '<div class="section">';
  html += '<h3 class="titre-2">Dégustation</h3>';
  html += ligne('Arômes', wine['Arômes']);
  var cartes = '';
  cartes += carte('Acidité', wine['Acidité']);
  cartes += carte('Sucrosité', wine['Sucrosité']);
  cartes += carte('Corps', wine.Corps);
  cartes += carte('Bouche', wine.Bouche);
  cartes += carte('Sucre', wine.Sucre);
  cartes += carte('Alcool', wine.Alcool);
  cartes += carte('Température', wine.Temperature);
  if (cartes) html += '<div class="grille-cartes">' + cartes + '</div>';
  html += '</div>';

  // === PRODUCTION ===
  if (wine.Producteur || wine['Agent promo']) {
    html += '<div class="section">';
    html += '<h3 class="titre-2">Production</h3>';
    html += ligne('Producteur', wine.Producteur);
    html += ligne('Agent', wine['Agent promo']);
    html += '</div>';
  }

  // === NOTES ===
  html += '<div class="section">';
  html += '<h3 class="titre-2">Notes</h3>';
  var accordsActuels = (wine.Accords || '').split(',').map(function(a) { return a.trim(); }).filter(Boolean);
  var itemsAccords = (CONFIG && CONFIG.accords ? CONFIG.accords : []).map(function(acc) {
    var sel = accordsActuels.indexOf(acc) !== -1;
    return '<div class="item-liste' + (sel ? ' actif' : '') + '" onclick="toggleAccordV2(this)" data-accord="' + acc + '">' + acc + '</div>';
  }).join('');
  html += '<div class="controle"><span class="libelle">Accords</span>' +
          '<div id="ficheV2-accords-display" class="champ-cliquable" onclick="basculerMenuAccordsV2()">' + (accordsActuels.length ? accordsActuels.join(', ') : 'Aucun') + '</div></div>';
  html += '<div id="ficheV2-accords-menu" class="menu-liste">' + itemsAccords + '</div>';

  var aime = wine.Racheter || 'Oui';
  html += '<div class="deux-colonnes">' +
            '<div class="colonne-controle">' +
              '<span class="libelle">Racheter ?</span>' +
              '<div class="colonne-ronds">' +
                '<div id="ficheV2-aime-oui" class="cercle' + (aime === 'Oui' ? ' actif' : '') + '" onclick="setAimeV2(\'Oui\')">✓</div>' +
                '<div id="ficheV2-aime-non" class="cercle' + (aime === 'Non' ? ' actif' : '') + '" onclick="setAimeV2(\'Non\')">✗</div>' +
              '</div>' +
            '</div>' +
            '<div class="colonne-controle">' +
              '<span class="libelle">Sur-inventaire ?</span>' +
              '<div class="colonne-ronds">' +
                '<div id="ficheV2-panier" class="cercle' + (wine.Panier === 'Oui' ? ' actif' : '') + '" onclick="togglePanierV2()">' + (wine.Panier === 'Oui' ? '✓' : '') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>';

  html += ligne('Recettes', wine.Recettes);
  html += ligne('Notes', wine['Notes temporaires']);
  html += ligne('Divers', wine.Divers);
  html += '</div>';

  // === HISTORIQUE DES PLATS (bloc séparé, sans titre) ===
  html += '<div class="section"><div id="ficheV2-plats"></div></div>';

// === INVENTAIRE (lecture seule) ===
  var bottlesActives = bottles.filter(function(b) { return b.statut !== 'Bu' && b.statut !== 'Sorti'; });
  html += '<div class="section">';
  html += '<h3 class="titre-2">Inventaire</h3>';
  if (bottlesActives.length === 0) {
    html += '<div class="texte-secondaire">Aucune bouteille en inventaire</div>';
  } else {
    var emplacements = bottlesActives.map(function(b) {
      var range = !!(b.meuble && b.rangee && b.espace);
      return {
        range: range,
        texte: range ? b.meuble + '-' + b.rangee + '-' + b.espace : 'À ranger',
        meuble: b.meuble || '',
        rangee: parseInt(b.rangee) || 0,
        espace: parseInt(b.espace) || 0
      };
    });
    emplacements.sort(function(a, b) {
      if (a.range !== b.range) return a.range ? -1 : 1;
      if (a.meuble !== b.meuble) return a.meuble.localeCompare(b.meuble);
      if (a.rangee !== b.rangee) return a.rangee - b.rangee;
      return a.espace - b.espace;
    });
    html += '<div class="ligne-info">' + emplacements.map(function(e) { return e.texte; }).join(' · ') + '</div>';
  }
  html += '</div>';

  if (wine['Photo URL']) {
    html += '<div class="photo"><img src="' + wine['Photo URL'] + '" alt="" loading="lazy" onclick="window.open(\'' + wine['Photo URL'] + '\', \'_blank\')" onerror="this.style.display=\'none\'"></div>';
  }

  if (wine['Code SAQ']) {
    html += '<div class="roundel" onclick="trouverCeVinV2()"><span class="roundel-anneau"></span><span class="roundel-barre">OÙ LE TROUVER</span></div>';
    html += '<div id="ficheV2-succursales"></div>';
  }

  html += '<div class="roundel" onclick="ouvrirActionDepuisFicheV2()"><span class="roundel-anneau"></span><span class="roundel-barre">ACTION</span></div>';

  document.getElementById('ficheV2-corps').innerHTML = html;
  chargerPlatsV2(CURRENT_WINE_CODEBARRE);
  verifierPrixV2(CURRENT_WINE_CODEBARRE, wine['Code SAQ']);
}

function ouvrirActionDepuisFicheV2() {
  var code = CURRENT_WINE_CODEBARRE;
  if (!code) return;
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    if (data) ALL_DATA = data;
    return appelBackend('checkWineExists', { codebarre: code });
  }).then(function(result) {
    if (!result || !result.exists) { afficherMessage('Vin introuvable'); return; }
    document.getElementById('ficheV2Overlay').style.display = 'none';
    FICHE_V2_PROVENANCE = 'menuScan';
    ouvrirMenuActionV2(code, result);
  }).catch(function() { retourAccueilV2(); });
}

function basculerMenuAccordsV2() {
  var menu = document.getElementById('ficheV2-accords-menu');
  if (menu) menu.classList.toggle('ouvert');
}

function toggleAccordV2(element) {
  element.classList.toggle('actif');
  var menu = document.getElementById('ficheV2-accords-menu');
  var selectionnes = Array.prototype.map.call(menu.querySelectorAll('.item-liste.actif'), function(el) { return el.getAttribute('data-accord'); });
  var display = document.getElementById('ficheV2-accords-display');
  if (display) display.textContent = selectionnes.length ? selectionnes.join(', ') : 'Aucun';
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Accords', value: selectionnes.join(', ') }, { spinner: 'Sauvegarde' }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function setAimeV2(value) {
  var oui = document.getElementById('ficheV2-aime-oui');
  var non = document.getElementById('ficheV2-aime-non');
  if (oui) oui.classList.toggle('actif', value === 'Oui');
  if (non) non.classList.toggle('actif', value === 'Non');
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Racheter', value: value }, { spinner: 'Sauvegarde' }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function togglePanierV2() {
  var btn = document.getElementById('ficheV2-panier');
  if (!btn) return;
  var actif = btn.classList.contains('actif');
  var newValue = actif ? '' : 'Oui';
  btn.classList.toggle('actif', !actif);
  btn.textContent = newValue === 'Oui' ? '✓' : '';
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Panier', value: newValue }, { spinner: 'Sauvegarde' }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function verifierPrixV2(codebarre, codeSAQ) {
  if (!codebarre || !codeSAQ) return;
  appelBackend('verifierEtMettreAJourPrixSAQ', { codebarre: codebarre, codeSAQ: codeSAQ }, { spinner: '' }).then(function(res) {
    if (res && res.updated) {
      var el = document.getElementById('ficheV2-prix');
      if (el) el.textContent = res.nouveauPrix.toFixed(2);
    }
  }).catch(function() {});
}

function chargerPlatsV2(codebarre) {
  var conteneur = document.getElementById('ficheV2-plats');
  if (!conteneur) return;

  function rendrePlats(historique) {
    var cb = (codebarre || '').toString().trim();
    var mets = (historique || []).filter(function(h) {
      return (h.codebarre || '').toString().trim() === cb;
    });
    if (mets.length === 0) { conteneur.innerHTML = ''; return; }
    mets.sort(function(a, b) {
      return (parseInt(b.bonAccord) || 0) - (parseInt(a.bonAccord) || 0);
    });
    var cartes = mets.map(function(m) {
      var note = parseInt(m.bonAccord) || 0;
      var classeNote = (note >= 1 && note <= 5) ? ' note-' + note : '';
      return '<div class="carte' + classeNote + '"><div class="carte-centre"><span class="carte-titre">' + (m.plat || '—') + '</span></div><div class="carte-droite">' + (m.date || '') + '</div></div>';
    }).join('');
    conteneur.innerHTML = cartes;
  }

  appelBackend('getHistorique', {}, { spinner: '' }).then(function(data) {
    ALL_HISTORIQUE = data || [];
    rendrePlats(ALL_HISTORIQUE);
  }).catch(function() {});
}

function fermerFicheV2() {
  document.getElementById('ficheV2Overlay').style.display = 'none';
  var panneauV2 = document.querySelector('#ficheV2Overlay .modal-v2-content');
  if (panneauV2) panneauV2.classList.remove('vin-rouge', 'vin-blanc', 'vin-rose', 'vin-bulles');
  if (FICHE_V2_PROVENANCE === 'menuScan' && menuActionV2Context) {
    ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
  } else if (FICHE_V2_PROVENANCE === 'cave') {
    document.getElementById('caveV2Container').style.display = 'flex';
  } else if (FICHE_V2_PROVENANCE === 'achat') {
    document.getElementById('achatV2Container').style.display = 'flex';
  } else if (FICHE_V2_PROVENANCE === 'histo') {
    ouvrirHistoV2();
  }
  FICHE_V2_PROVENANCE = null;
}

function trouverCeVinV2() {
  var codeSAQ = CURRENT_WINE_DATA ? CURRENT_WINE_DATA['Code SAQ'] : '';
  var div = document.getElementById('ficheV2-succursales');
  if (!codeSAQ || !div) return;
  div.innerHTML = '<div class="texte-secondaire">Localisation en cours…</div>';

  function chercher(lat, lng) {
    appelBackend('getSuccursalesDisponibles', { codeSAQ: codeSAQ, lat: lat, lng: lng }, { spinner: 'Recherche succursales' }).then(function(succursales) {
      var dispo = (succursales || []).filter(function(s) { return s.quantite > 0; });
      if (dispo.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucune succursale avec stock</div>'; return; }
      div.innerHTML = dispo.slice(0, 10).map(function(s) {
        var sousInfo = [s.adresse, s.ville].filter(Boolean).join(', ');
        var droite = [s.quantite + ' btl', s.distance].filter(Boolean).join('<br>');
        return '<div class="carte"><div class="carte-centre"><span class="carte-titre">' + s.nom + '</span><span class="carte-sous">' + sousInfo + '</span></div><div class="carte-droite">' + droite + '</div></div>';
      }).join('');
    }).catch(function(err) { div.innerHTML = '<div class="texte-secondaire">Erreur : ' + err + '</div>'; });
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) { chercher(pos.coords.latitude, pos.coords.longitude); },
      function() { chercher(null, null); }
    );
  } else {
    chercher(null, null);
  }
}

// ==================== ÉDITION FICHE V2 ====================
var EDIT_FICHE_V2_CHAMPS = [
  ['Nom', 'nom', 'Nom'],
  ['Code SAQ', 'codesaq', 'Code SAQ'],
  ['Couleur', 'couleur', 'Couleur'],
  ['Prix', 'prix', 'Prix'],
  ['Pays', 'pays', 'Pays'],
  ['Région', 'region', 'Region'],
  ['Appellation', 'appellation', 'Appellation'],
  ['Cépages', 'cepage', 'Cepage'],
  ['Désignation', 'designation', 'Designation'],
  ['Classification', 'classification', 'Classification'],
  ['Particularité', 'particularite', 'Particularité'],
  ['Producteur', 'producteur', 'Producteur'],
  ['Agent promo', 'agent', 'Agent promo'],
  ['Arômes', 'aromes', 'Arômes'],
  ['Acidité', 'acidite', 'Acidité'],
  ['Sucrosité', 'sucrosite', 'Sucrosité'],
  ['Corps', 'corps', 'Corps'],
  ['Bouche', 'bouche', 'Bouche'],
  ['Sucre', 'sucre', 'Sucre'],
  ['Alcool', 'alcool', 'Alcool'],
  ['Température', 'temperature', 'Temperature'],
  ['Pastille', 'pastille', 'Pastille gout'],
  ['Description', 'description', 'Description'],
  ['Recettes', 'recettes', 'Recettes'],
  ['Notes', 'notestemp', 'Notes temporaires'],
  ['Divers', 'divers', 'Divers']
];

function ouvrirEditFicheV2() {
  var wine = CURRENT_WINE_DATA;
  if (!wine) return;
  var html = EDIT_FICHE_V2_CHAMPS.map(function(c) {
    var valeur = decodeHTML((wine[c[2]] || '').toString()).replace(/"/g, '&quot;');
    return '<div class="titre-3">' + c[0] + '</div><input type="text" id="editV2-' + c[1] + '" class="champ-saisie" value="' + valeur + '">';
  }).join('');
  document.getElementById('editFicheV2-corps').innerHTML = html;
  document.getElementById('editFicheV2Overlay').style.display = 'flex';
}

function fermerEditFicheV2() {
  document.getElementById('editFicheV2Overlay').style.display = 'none';
}

function sauverEditFicheV2() {
  var data = { codebarre: CURRENT_WINE_CODEBARRE, aime: (CURRENT_WINE_DATA && CURRENT_WINE_DATA.Racheter) || 'Oui' };
  EDIT_FICHE_V2_CHAMPS.forEach(function(c) {
    var el = document.getElementById('editV2-' + c[1]);
    data[c[1]] = el ? el.value : '';
  });
  appelBackend('saveWineEdits', data, { spinner: 'Sauvegarde' }).then(function() {
    document.getElementById('editFicheV2Overlay').style.display = 'none';
    afficherMessage('Modifications enregistrées');
    ouvrirFicheV2(CURRENT_WINE_CODEBARRE, FICHE_V2_PROVENANCE);
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}
