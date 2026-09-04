/* ============================================================
   SCRIPTS-FICHE-V2.JS
   Fiche vin V2 — consultation seule, plein écran
============================================================ */

function ouvrirFicheV2(codebarre, provenance) {
  FICHE_V2_PROVENANCE = provenance || null;
  CURRENT_WINE_CODEBARRE = codebarre;
  document.getElementById('ficheV2Overlay').style.display = 'flex';
  remonterScrollV2('ficheV2Overlay');
  document.getElementById('ficheV2-nom').textContent = 'Chargement...';
  document.getElementById('ficheV2-origine').innerHTML = '';
  document.getElementById('ficheV2-corps').innerHTML = '';

  var resultMemoire = ficheDepuisMemoireV2(codebarre);
  if (resultMemoire) {
    afficherFicheV2(resultMemoire);
    return;
  }
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

function ficheDepuisMemoireV2(codebarre) {
  var cb = (codebarre || '').toString().trim();
  var items = (ALL_DATA || []).filter(function(i) {
    return memeCodeV2(i['Code-barres'], cb);
  });
  if (!items.length) return null;
  var w = items[0];
  var wine = {
    'Code-barres': w['Code-barres'],
    'Code SAQ': w['Code SAQ'] || '',
    'Nom': w.Nom || '',
    'Prix': w.Prix || '',
    'Couleur': w.Couleur || '',
    'Cépage': w.Cepage || '',
    'Cepage': w.Cepage || '',
    'Pays': w.Pays || '',
    'Region': w.Region || '',
    'Appellation': w.Appellation || '',
    'Désignation': w['Désignation'] || '',
    'Designation': w['Désignation'] || '',
    'Classification': w.Classification || '',
    'Format': w.Format || '',
    'Alcool': w.Alcool || '',
    'Sucre': w.Sucre || '',
    'Particularité': w['Particularité'] || '',
    'Producteur': w.Producteur || '',
    'Agent promo': w['Agent promo'] || '',
    'Millésime dégusté': w['Millésime dégusté'] || '',
    'Arômes': w['Arômes'] || '',
    'Acidité': w['Acidité'] || '',
    'Sucrosité': w['Sucrosité'] || '',
    'Corps': w.Corps || '',
    'Bouche': w.Bouche || '',
    'Température': w['Température'] || '',
    'Temperature': w['Température'] || '',
    'Bois': w['Bois'] || '',
    'Description': w.Description || '',
    'Racheter': w.Racheter || 'Oui',
    'Accords': w.Accords || '',
    'Favori': w.Favori || '',
    'Notes temporaires': w['Notes temporaires'] || '',
    'Divers': w.Divers || '',
    'Pastille gout': w['Pastille gout'] || '',
    'Photo URL': w['Photo URL'] || '',
    'Panier': w.Panier || '',
    'Famille': w.Famille || ''
  };
  var bottles = items.filter(function(i) { return i.bottle && i.bottle > 0; }).map(function(i) {
    return { row: i.row, bottle: i.bottle, meuble: i.Meuble || '', rangee: i.Rangee || '', espace: i.Espace || '', statut: i.Statut || '' };
  });
  return { wine: wine, bottles: bottles };
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
                      couleur.includes('bulle') || couleur.includes('mousseux') ? 'vin-bulles' :
                      couleur.includes('spiritueux') ? 'vin-spiritueux' : 'vin-rouge';
  var panneauV2 = document.querySelector('#ficheV2Overlay .modal-v2-content');
  if (panneauV2) {
    panneauV2.classList.remove('vin-rouge', 'vin-blanc', 'vin-rose', 'vin-bulles', 'vin-spiritueux');
    panneauV2.classList.add(classeCouleur);
  }

  var nomEl = document.getElementById('ficheV2-nom');
  nomEl.textContent = decodeHTML(wine.Nom || 'Vin sans nom');
  var saqEl = document.getElementById('ficheV2-saq');
  if (wine['Code SAQ']) {
    saqEl.style.display = '';
    saqEl.onclick = function() { window.location.href = 'saq://products/' + wine['Code SAQ']; };
  } else {
    saqEl.style.display = 'none';
    saqEl.onclick = null;
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
 
  var favoriEtoile = wine.Favori === 'Oui' ? '<span class="etoile-favori actif">★</span>' : '';
  html += wine['Cépage'] ? '<div class="ligne-info"><span class="libelle">Cépages : </span>' + decodeHTML(wine['Cépage'].toString()) + (favoriEtoile ? ' ' + favoriEtoile : '') + '</div>' : '';
  html += ligne('Appellation', wine.Appellation);
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
	 html += ligne('Code-barres', wine['Code-barres']);
  html += ligne('Code SAQ', wine['Code SAQ']);
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
  cartes += carte('Servir', (wine.Temperature || '').toString().replace(/^De\s+/i, ''));
  cartes += carte('Bois', wine.Bois);
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

  // === NOTES : APPRÉCIATION ===
  html += '<div class="section">';
  html += '<h3 class="titre-2">Appréciation</h3>';
  html += '<div class="controle"><span class="libelle">Notes du sommelier</span>' +
          '<div id="ficheV2-notes-display" class="champ-cliquable" onclick="editerNotesSommelierV2()">' + (wine['Notes temporaires'] ? decodeHTML(wine['Notes temporaires'].toString()) : 'Aucune') + '</div></div>';
  var accordsActuels = (wine.Accords || '').split(',').map(function(a) { return a.trim(); }).filter(Boolean);
  var itemsAccords = (CONFIG && CONFIG.accords ? CONFIG.accords : []).map(function(acc) {
    var sel = accordsActuels.indexOf(acc) !== -1;
    return '<div class="item-liste' + (sel ? ' actif' : '') + '" onclick="toggleAccordV2(this)" data-accord="' + acc + '">' + acc + '</div>';
  }).join('');
  html += '<div class="controle"><span class="libelle">Accords</span>' +
          '<div id="ficheV2-accords-display" class="champ-cliquable" onclick="basculerMenuAccordsV2()">' + (accordsActuels.length ? accordsActuels.join(', ') : 'Aucun') + '</div></div>';
  itemsAccords += '<div class="item-liste" id="ficheV2-accord-ajouter" onclick="ouvrirAjoutAccordV2()">+ Ajouter</div>';
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

  html += ligne('Divers', wine.Divers);
  html += '</div>';

  // === NOTES : HISTORIQUE ===
  html += '<div class="section" id="ficheV2-plats-section" style="display:none;">';
  html += '<div style="display:flex;align-items:center;justify-content:flex-start;gap:var(--space-s);margin-bottom:var(--space-s);"><h3 class="titre-2" style="margin:0;">Historique</h3><div class="cercle" onclick="ouvrirHistoAjoutDepuisFicheV2()">+</div></div>';
  html += '<div id="ficheV2-plats"></div>';
  html += '</div>';

  // === NOTES : SUGGÉRER ===
  html += '<div class="section">';
  html += '<div style="display:flex;align-items:center;justify-content:flex-start;gap:var(--space-s);margin-bottom:var(--space-s);"><h3 class="titre-2" style="margin:0;">Suggérer</h3><div class="cercle" onclick="ouvrirSuggestionAjoutV2(\'' + (wine['Code SAQ'] || '').toString().trim() + '\', \'fiche\')">+</div></div>';
  html += '<div id="ficheV2-suggestions"></div>';
  html += '</div>';

  // === ACCORDS SAQ ===
  html += '<div class="section" id="ficheV2-recettes-section" style="display:none;">';
  html += '<h3 class="titre-2">Accords SAQ</h3>';
  html += '<div id="ficheV2-recettes"></div>';
  html += '</div>';

// === INVENTAIRE (lecture seule) ===
  var bottlesActives = bottles.filter(function(b) { return b.statut !== 'Bu' && b.statut !== 'Sorti' && b.statut !== 'Suggestion'; });
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
    html += '<div class="photo"><img src="' + wine['Photo URL'] + '" alt="" loading="lazy" onclick="ouvrirPhotoV2(\'' + wine['Photo URL'] + '\')" onerror="this.style.display=\'none\'"></div>';
  }

  html += '<div class="roundel" onclick="ouvrirActionDepuisFicheV2()"><span class="roundel-anneau"></span><span class="roundel-barre">ACTION</span></div>';

  if (wine['Code SAQ']) {
    html += '<div class="roundel" onclick="trouverCeVinV2()"><span class="roundel-anneau"></span><span class="roundel-barre">OÙ LE TROUVER</span></div>';
    html += '<div id="ficheV2-succursales"></div>';
  }


  document.getElementById('ficheV2-corps').innerHTML = html;
  chargerPlatsV2(CURRENT_WINE_CODEBARRE);
  chargerSuggestionsFicheV2(wine['Code SAQ']);
  chargerRecettesFicheV2(wine.Famille);
  verifierPrixV2(CURRENT_WINE_CODEBARRE, wine['Code SAQ']);
}

var ALL_RECETTES = null;

function recettesDeLaFamilleV2(famille) {
  var fam = (famille || '').toString().trim();
  if (!fam) return [];
  return (ALL_RECETTES || []).filter(function(r) {
    return r.familles && r.familles.indexOf(fam) !== -1;
  });
}

// Comptes décroissants d'un champ multiple sur une liste de recettes
function comptesRecettesV2(recettes, champ) {
  var comptes = {};
  recettes.forEach(function(r) {
    (r[champ] || []).forEach(function(v) { comptes[v] = (comptes[v] || 0) + 1; });
  });
  return Object.keys(comptes).sort(function(a, b) {
    if (comptes[b] !== comptes[a]) return comptes[b] - comptes[a];
    return a.localeCompare(b);
  }).map(function(v) { return { valeur: v, compte: comptes[v] }; });
}

function chargerRecettesFicheV2(famille) {
  var fam = (famille || '').toString().trim();
  var section = document.getElementById('ficheV2-recettes-section');
  if (!section || !fam) return;

  function rendre() {
    var recettes = recettesDeLaFamilleV2(fam);
    if (!recettes.length) return;
    function bloc(titre, liste) {
      if (!liste.length) return '';
      return '<div class="ligne-info"><span class="libelle">' + titre + ' : </span>' +
             liste.map(function(x) { return decodeHTML(x.valeur) + ' (' + x.compte + ')'; }).join(' · ') + '</div>';
    }
    var html = '';
    html += bloc('Types de plats', comptesRecettesV2(recettes, 'typesPlats'));
    html += bloc('Ingrédients', comptesRecettesV2(recettes, 'ingredients'));
    var titres = recettes.map(function(r) { return decodeHTML(r.nom || ''); }).filter(Boolean).sort(function(a, b) { return a.localeCompare(b); });
    html += '<div class="texte">' + titres.join(' · ') + '</div>';
    document.getElementById('ficheV2-recettes').innerHTML = html;
    section.style.display = '';
  }

  if (ALL_RECETTES) { rendre(); return; }
  appelBackend('getRecettes', {}, { spinner: '' }).then(function(data) {
    ALL_RECETTES = data || [];
    rendre();
  }).catch(function() {});
}

function chargerSuggestionsFicheV2(codeSAQ) {
  var conteneur = document.getElementById('ficheV2-suggestions');
  if (!conteneur) return;
  var saq = (codeSAQ || '').toString().trim();
  var items = (ALL_SUGGESTIONS || []).filter(function(s) { return s.codeSAQ === saq; });
  if (!items.length) { conteneur.innerHTML = '<div class="texte-secondaire">Aucune suggestion</div>'; return; }
  var nomEsc = decodeHTML((CURRENT_WINE_DATA && CURRENT_WINE_DATA.Nom) || '').replace(/'/g, "\\'");
  conteneur.innerHTML = items.map(function(s) {
    var somEsc = (s.sommelier || '').replace(/'/g, "\\'");
    var noteEsc = (s.note || '').replace(/'/g, "\\'");
    return '<div class="carte fiche-mets" onclick="ouvrirApresTap(function(){ouvrirSuggestionEditV2(' + s.row + ', \'' + somEsc + '\', \'' + noteEsc + '\', \'' + nomEsc + '\', \'' + saq + '\', \'fiche\')})"><div class="carte-centre"><span class="carte-titre">' + (s.sommelier || '—') + '</span><span class="carte-sous">' + (s.note || '') + '</span></div><div class="carte-droite">' + (s.date || '') + '</div></div>';
  }).join('');
}

function ouvrirActionDepuisFicheV2() {
  var code = CURRENT_WINE_CODEBARRE;
  if (!code) return;
  var result = wineResultDepuisMemoireV2(code);
  if (!result) { afficherMessage('Vin introuvable'); return; }
  document.getElementById('ficheV2Overlay').style.display = 'none';
  FICHE_V2_ORIGINE = FICHE_V2_PROVENANCE;
  FICHE_V2_PROVENANCE = 'menuScan';
  setTimeout(function() { ouvrirMenuActionV2(code, result); }, 0);
}

function basculerMenuAccordsV2() {
  var menu = document.getElementById('ficheV2-accords-menu');
  if (!menu) return;
  var ouvert = menu.classList.toggle('ouvert');
  if (!ouvert) remettreAjoutAccordV2();
}

function ouvrirAjoutAccordV2() {
  var item = document.getElementById('ficheV2-accord-ajouter');
  if (!item) return;
  item.outerHTML = '<input type="text" id="ficheV2-accord-champ" class="champ-saisie" placeholder="Nouvel accord (Entrée pour confirmer)">';
  var champ = document.getElementById('ficheV2-accord-champ');
  champ.onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); confirmerAjoutAccordV2(); } };
  champ.focus();
}

function remettreAjoutAccordV2() {
  var champ = document.getElementById('ficheV2-accord-champ');
  if (!champ) return;
  champ.outerHTML = '<div class="item-liste" id="ficheV2-accord-ajouter" onclick="ouvrirAjoutAccordV2()">+ Ajouter</div>';
}

function cocherAccordV2(accord) {
  var menu = document.getElementById('ficheV2-accords-menu');
  var item = Array.prototype.filter.call(menu.querySelectorAll('.item-liste'), function(el) { return el.getAttribute('data-accord') === accord; })[0];
  if (item && !item.classList.contains('actif')) toggleAccordV2(item);
}

function confirmerAjoutAccordV2() {
  var champ = document.getElementById('ficheV2-accord-champ');
  if (!champ) return;
  var valeur = champ.value.trim();
  if (!valeur) { afficherMessage('Entrez un accord'); return; }
  var existant = (CONFIG && CONFIG.accords ? CONFIG.accords : []).filter(function(a) { return memeTexteV2(a, valeur); })[0];
  if (existant) {
    remettreAjoutAccordV2();
    cocherAccordV2(existant);
    return;
  }
  appelBackend('ajouterAccordConfig', { accord: valeur }, { spinner: 'Sauvegarde' }).then(function() {
    CONFIG.accords.push(valeur);
    CONFIG.accords.sort(function(a, b) { return normaliserRechercheV2(a).localeCompare(normaliserRechercheV2(b)); });
    var menu = document.getElementById('ficheV2-accords-menu');
    var selectionnes = Array.prototype.map.call(menu.querySelectorAll('.item-liste.actif'), function(el) { return el.getAttribute('data-accord'); });
    menu.innerHTML = CONFIG.accords.map(function(acc) {
      var sel = selectionnes.indexOf(acc) !== -1;
      return '<div class="item-liste' + (sel ? ' actif' : '') + '" onclick="toggleAccordV2(this)" data-accord="' + acc + '">' + acc + '</div>';
    }).join('') + '<div class="item-liste" id="ficheV2-accord-ajouter" onclick="ouvrirAjoutAccordV2()">+ Ajouter</div>';
    cocherAccordV2(valeur);
  }).catch(function() {
    afficherMessage('Erreur, réessayez');
  });
}

function toggleAccordV2(element) {
  element.classList.toggle('actif');
  var menu = document.getElementById('ficheV2-accords-menu');
  var selectionnes = Array.prototype.map.call(menu.querySelectorAll('.item-liste.actif'), function(el) { return el.getAttribute('data-accord'); });
  var display = document.getElementById('ficheV2-accords-display');
  if (display) display.textContent = selectionnes.length ? selectionnes.join(', ') : 'Aucun';
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Accords', value: selectionnes.join(', ') }, { spinner: 'Sauvegarde' }).then(function() {
    majMemoireVinV2(CURRENT_WINE_CODEBARRE, { 'Accords': selectionnes.join(', ') });
    if (CURRENT_WINE_DATA) CURRENT_WINE_DATA.Accords = selectionnes.join(', ');
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function majMemoireVinV2(codebarre, champs) {
  var cb = (codebarre || '').toString().trim();
  (ALL_DATA || []).forEach(function(i) {
    if (memeCodeV2(i['Code-barres'], cb)) {
      Object.keys(champs).forEach(function(k) { i[k] = champs[k]; });
    }
  });
}
 
function setAimeV2(value) {
  var oui = document.getElementById('ficheV2-aime-oui');
  var non = document.getElementById('ficheV2-aime-non');
  if (oui) oui.classList.toggle('actif', value === 'Oui');
  if (non) non.classList.toggle('actif', value === 'Non');
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Racheter', value: value }, { spinner: 'Sauvegarde' }).then(function() {
    majMemoireVinV2(CURRENT_WINE_CODEBARRE, { 'Racheter': value });
    if (CURRENT_WINE_DATA) CURRENT_WINE_DATA.Racheter = value;
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function togglePanierV2() {
  var btn = document.getElementById('ficheV2-panier');
  if (!btn) return;
  var actif = btn.classList.contains('actif');
  var newValue = actif ? '' : 'Oui';
  btn.classList.toggle('actif', !actif);
  btn.textContent = newValue === 'Oui' ? '✓' : '';
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Panier', value: newValue }, { spinner: 'Sauvegarde' }).then(function() {
    majMemoireVinV2(CURRENT_WINE_CODEBARRE, { 'Panier': newValue });
    if (CURRENT_WINE_DATA) CURRENT_WINE_DATA.Panier = newValue;
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
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
    var sectionPlats = document.getElementById('ficheV2-plats-section');
    if (mets.length === 0) { conteneur.innerHTML = ''; if (sectionPlats) sectionPlats.style.display = 'none'; return; }
    if (sectionPlats) sectionPlats.style.display = '';
    mets.sort(function(a, b) {
      return (parseInt(b.bonAccord) || 0) - (parseInt(a.bonAccord) || 0);
    });
    var cartes = mets.map(function(m) {
      var note = parseInt(m.bonAccord) || 0;
      var classeNote = (note >= 1 && note <= 5) ? ' note-' + note : '';
      var platEsc = (m.plat || '').replace(/'/g, "\\'");
      var nomEsc = decodeHTML((CURRENT_WINE_DATA && CURRENT_WINE_DATA.Nom) || '').replace(/'/g, "\\'");
      return '<div class="carte fiche-mets' + classeNote + '" onclick="ouvrirApresTap(function(){ouvrirHistoEditV2(' + m.row + ', \'' + platEsc + '\', ' + note + ', \'' + nomEsc + '\', \'fiche\')})"><div class="carte-centre"><span class="carte-titre">' + (m.plat || '—') + '</span></div><div class="carte-droite">' + (m.date || '') + '</div></div>';
    }).join('');
    conteneur.innerHTML = cartes;
  }

  if (ALL_HISTORIQUE && ALL_HISTORIQUE.length) {
    rendrePlats(ALL_HISTORIQUE);
    return;
  }
  appelBackend('getHistorique', {}, { spinner: '' }).then(function(data) {
    ALL_HISTORIQUE = data || [];
    rendrePlats(ALL_HISTORIQUE);
  }).catch(function() {});
}

var PHOTO_V2_MODE = 'fiche';
var PHOTO_V2_CB = null;

function ouvrirPhotoV2(url) {
  PHOTO_V2_MODE = 'fiche';
  var overlay = document.getElementById('photoV2Overlay');
  overlay.classList.remove('photo-ronde');
  var img = document.getElementById('photoV2-img');
  img.onerror = null;
  img.style.display = '';
  img.src = url;
  document.getElementById('photoV2-nom').style.display = 'none';
  var enteteFiche = document.getElementById('photoV2-entete');
  if (enteteFiche) enteteFiche.style.display = 'none';
  var pg = document.querySelector('#photoV2Overlay .photo-grande');
  if (pg) pg.style.borderColor = '';
  overlay.style.display = 'flex';
}

var PHOTO_V2_LISTE = null;
var PHOTO_V2_INDEX = -1;
var PHOTO_V2_TX = 0, PHOTO_V2_TY = 0, PHOTO_V2_GLISSE = false;

function ouvrirPhotoEmpV2(cb, liste, row) {
  var cible = (cb || '').toString().trim();
  var w = (ALL_DATA || []).filter(function(i) { return memeCodeV2(i['Code-barres'], cible); })[0];
  if (!w) return;
  PHOTO_V2_MODE = 'rond';
  PHOTO_V2_CB = cible;
  PHOTO_V2_LISTE = liste || null;
  PHOTO_V2_INDEX = -1;
  if (PHOTO_V2_LISTE) {
    PHOTO_V2_LISTE.forEach(function(b, i){ if (String(b.row) === String(row)) PHOTO_V2_INDEX = i; });
  }
  var overlay = document.getElementById('photoV2Overlay');
  overlay.classList.add('photo-ronde');
  var img = document.getElementById('photoV2-img');
  var nom = document.getElementById('photoV2-nom');
  nom.textContent = decodeHTML((w.Nom || '—').toString());
  var entete = document.getElementById('photoV2-entete');
  if (entete) {
    var origine = [w.Pays, w.Region, w.Appellation].filter(Boolean).join(' · ');
    entete.innerHTML = '<div class="photo-entete-nom">' + decodeHTML((w.Nom || '—').toString()) + '</div>' +
                       (origine ? '<div class="photo-entete-ligne">' + decodeHTML(origine.toString()) + '</div>' : '') +
                       (w.Cepage ? '<div class="photo-entete-ligne">' + decodeHTML(w.Cepage.toString()) + '</div>' : '');
    entete.style.display = '';
  }
  var photo = w['Photo URL'] || '';
  if (photo) {
    img.style.display = '';
    nom.style.display = 'none';
    img.onerror = function() { img.style.display = 'none'; nom.style.display = ''; };
    img.src = photo;
  } else {
    img.onerror = null;
    img.removeAttribute('src');
    img.style.display = 'none';
    nom.style.display = '';
  }
  var pg = document.querySelector('#photoV2Overlay .photo-grande');
  if (pg) pg.style.borderColor = 'var(--' + couleurClasseV2(w.Couleur) + ')';
  overlay.style.display = 'flex';
}

function clicPhotoV2(event) {
  if (PHOTO_V2_MODE !== 'rond') return;
  event.stopPropagation();
  if (PHOTO_V2_GLISSE) { PHOTO_V2_GLISSE = false; return; }
  var cb = PHOTO_V2_CB;
  fermerPhotoV2();
  ouvrirApresTap(function() { ouvrirFicheV2(cb, 'emplacements'); });
}

// Glissement : gauche = suivante, droite = précédente, bute aux deux bouts
function glisserPhotoV2(sens) {
  if (PHOTO_V2_MODE !== 'rond' || !PHOTO_V2_LISTE || PHOTO_V2_INDEX < 0) return;
  var i = PHOTO_V2_INDEX + sens;
  if (i < 0 || i >= PHOTO_V2_LISTE.length) return;
  var b = PHOTO_V2_LISTE[i];
  ouvrirPhotoEmpV2((b['Code-barres'] || '').toString().trim(), PHOTO_V2_LISTE, b.row);
}

function brancherGlissementPhotoV2() {
  var zone = document.querySelector('#photoV2Overlay .photo-grande');
  if (!zone) return;
  zone.addEventListener('touchstart', function(ev){
    PHOTO_V2_GLISSE = false;
    if (!ev.touches || !ev.touches.length) return;
    PHOTO_V2_TX = ev.touches[0].clientX;
    PHOTO_V2_TY = ev.touches[0].clientY;
  }, { passive: true });
  zone.addEventListener('touchend', function(ev){
    if (PHOTO_V2_MODE !== 'rond') return;
    var t = ev.changedTouches && ev.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - PHOTO_V2_TX;
    var dy = t.clientY - PHOTO_V2_TY;
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
    PHOTO_V2_GLISSE = true;
    ev.preventDefault();
    ev.stopPropagation();
    glisserPhotoV2(dx < 0 ? 1 : -1);
  });
}
document.addEventListener('DOMContentLoaded', brancherGlissementPhotoV2);

function clicFondPhotoV2() {
  if (PHOTO_V2_MODE !== 'rond') return;
  fermerPhotoV2();
}

function fermerPhotoV2() {
  var overlay = document.getElementById('photoV2Overlay');
  overlay.style.display = 'none';
  overlay.classList.remove('photo-ronde');
  PHOTO_V2_MODE = 'fiche';
  PHOTO_V2_CB = null;
}

function fermerFicheV2() {
  document.getElementById('ficheV2Overlay').style.display = 'none';
  var panneauV2 = document.querySelector('#ficheV2Overlay .modal-v2-content');
  if (panneauV2) panneauV2.classList.remove('vin-rouge', 'vin-blanc', 'vin-rose', 'vin-bulles', 'vin-spiritueux');
  if (FICHE_V2_PROVENANCE === 'menuScan' && FICHE_V2_ORIGINE) {
    var origine = FICHE_V2_ORIGINE;
    FICHE_V2_ORIGINE = null;
    FICHE_V2_PROVENANCE = null;
    if (origine === 'cave') { document.getElementById('caveV2Container').style.display = 'flex'; remonterScrollV2('caveV2Container'); appliquerFiltresCaveV2(); return; }
    if (origine === 'achat') { ouvrirAchatV2(); return; }
    if (origine === 'histo') { ouvrirHistoV2(); return; }
    return;
  }
  if (FICHE_V2_PROVENANCE === 'menuScan' && menuActionV2Context) {
    ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
  } else if (FICHE_V2_PROVENANCE === 'cave') {
    document.getElementById('caveV2Container').style.display = 'flex';
    remonterScrollV2('caveV2Container');
  } else if (FICHE_V2_PROVENANCE === 'achat') {
    document.getElementById('achatV2Container').style.display = 'flex';
    remonterScrollV2('achatV2Container');
    if (achatV2ModeNepr) afficherNePasRacheterV2();
    else appliquerFiltresAchatV2();
  } else if (FICHE_V2_PROVENANCE === 'histo') {
    ouvrirHistoV2();
  } else if (FICHE_V2_PROVENANCE === 'promo') {
    document.getElementById('promoV2Container').style.display = 'flex';
    remonterScrollV2('promoV2Container');
  } else if (FICHE_V2_PROVENANCE === 'recherche') {
    document.getElementById('rechercheV2Container').style.display = 'flex';
    remonterScrollV2('rechercheV2Container');
  } else if (FICHE_V2_PROVENANCE === 'empliste') {
    document.getElementById('empV2Container').style.display = 'flex';
    remonterScrollV2('empV2Container');
    if (empListeV2Type) afficherListeEmpV2(empListeV2Type);
  } else if (FICHE_V2_PROVENANCE === 'emplacements') {
    ouvrirEmpV2();
  } else if (FICHE_V2_PROVENANCE === 'sanscepage') {
    document.getElementById('sansCepageV2Container').style.display = 'flex';
    remonterScrollV2('sansCepageV2Container');
    } else if (FICHE_V2_PROVENANCE === 'suggestions') {
    document.getElementById('suggestionsV2Container').style.display = 'flex';
    remonterScrollV2('suggestionsV2Container');
    afficherSuggestionsV2();
  } else if (FICHE_V2_PROVENANCE === 'accords') {
    document.getElementById('accordsV2Container').style.display = 'flex';
    remonterScrollV2('accordsV2Container');
  } else if (FICHE_V2_PROVENANCE === 'selonsaq') {
    document.getElementById('selonSaqV2Container').style.display = 'flex';
    remonterScrollV2('selonSaqV2Container');
    calculerSelonSaqV2();
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
        var adresseMaps = encodeURIComponent([s.adresse, s.ville, 'QC'].filter(Boolean).join(', '));
        return '<div class="carte" onclick="window.open(\'https://maps.apple.com/?daddr=' + adresseMaps + '\', \'_blank\')"><div class="carte-centre"><span class="carte-titre">' + s.nom + '</span><span class="carte-sous">' + sousInfo + '</span></div><div class="carte-droite">' + droite + '</div></div>';
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

// ==================== NOTES DU SOMMELIER ====================
function editerNotesSommelierV2() {
  var disp = document.getElementById('ficheV2-notes-display');
  if (!disp) return;
  var valeur = (CURRENT_WINE_DATA && CURRENT_WINE_DATA['Notes temporaires']) ? decodeHTML(CURRENT_WINE_DATA['Notes temporaires'].toString()) : '';
  disp.outerHTML = '<textarea id="ficheV2-notes-champ" class="champ-saisie"></textarea>';
  var champ = document.getElementById('ficheV2-notes-champ');
  champ.value = valeur;
  champ.onblur = sauverNotesSommelierV2;
  champ.focus();
}

function remettreNotesDisplayV2() {
  var champ = document.getElementById('ficheV2-notes-champ');
  if (!champ) return;
  var valeur = (CURRENT_WINE_DATA && CURRENT_WINE_DATA['Notes temporaires']) ? decodeHTML(CURRENT_WINE_DATA['Notes temporaires'].toString()) : '';
  champ.outerHTML = '<div id="ficheV2-notes-display" class="champ-cliquable" onclick="editerNotesSommelierV2()">' + (valeur || 'Aucune') + '</div>';
}

function sauverNotesSommelierV2() {
  var champ = document.getElementById('ficheV2-notes-champ');
  if (!champ) return;
  var valeur = champ.value.trim();
  var avant = ((CURRENT_WINE_DATA && CURRENT_WINE_DATA['Notes temporaires']) ? decodeHTML(CURRENT_WINE_DATA['Notes temporaires'].toString()) : '').trim();
  if (valeur === avant) { remettreNotesDisplayV2(); return; }
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Notes temporaires', value: valeur }, { spinner: '' }).then(function() {
    majMemoireVinV2(CURRENT_WINE_CODEBARRE, { 'Notes temporaires': valeur });
    if (CURRENT_WINE_DATA) CURRENT_WINE_DATA['Notes temporaires'] = valeur;
    remettreNotesDisplayV2();
    afficherMessage('Note sauvegardée');
  }).catch(function() {
    afficherMessage('Erreur de sauvegarde');
  });
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
  ['Servir', 'temperature', 'Temperature'],
  ['Pastille', 'pastille', 'Pastille gout'],
  ['Bois', 'bois', 'Bois'],
  ['Description', 'description', 'Description'],

  ['Notes du sommelier', 'notestemp', 'Notes temporaires'],
  ['Divers', 'divers', 'Divers'],
  ['Photo', 'photo', 'Photo URL']
];

function ouvrirEditFicheV2() {
  var wine = CURRENT_WINE_DATA;
  if (!wine) return;
  var html = EDIT_FICHE_V2_CHAMPS.map(function(c) {
    var valeur = decodeHTML((wine[c[2]] || '').toString()).replace(/"/g, '&quot;');
    return '<div class="titre-3">' + c[0] + '</div><input type="text" id="editV2-' + c[1] + '" class="champ-saisie" value="' + valeur + '">';
  }).join('');
  html += '<div class="titre-3">Vin pour cépage favori</div>' +
          '<div style="margin:var(--space-s) 0 var(--space-m);"><div class="cercle' + (wine.Favori === 'Oui' ? ' actif' : '') + '" id="editV2-favori" onclick="this.classList.toggle(\'actif\');this.textContent=this.classList.contains(\'actif\')?\'✓\':\'\';">' + (wine.Favori === 'Oui' ? '✓' : '') + '</div></div>';
  html += '<div class="roundel" onclick="photoSAQDepuisEditV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Photo SAQ</span></div>';
  document.getElementById('editFicheV2-corps').innerHTML = html;
  document.getElementById('editFicheV2Overlay').style.display = 'flex';
  remonterScrollV2('editFicheV2Overlay');
}

function fermerEditFicheV2() {
  document.getElementById('editFicheV2Overlay').style.display = 'none';
}

function photoSAQDepuisEditV2() {
  var champSaq = document.getElementById('editV2-codesaq');
  var codeSAQ = (champSaq && champSaq.value.trim()) || (CURRENT_WINE_DATA && CURRENT_WINE_DATA['Code SAQ']) || '';
  if (!codeSAQ) { afficherMessage('Aucun code SAQ'); return; }
  appelBackend('majPhotoSAQ', { codebarre: CURRENT_WINE_CODEBARRE, codeSAQ: codeSAQ }, { spinner: 'Photo SAQ' }).then(function(res) {
    if (res && res.success) {
      var champPhoto = document.getElementById('editV2-photo');
      if (champPhoto) champPhoto.value = res.photoURL;
      majMemoireVinV2(CURRENT_WINE_CODEBARRE, { 'Photo URL': res.photoURL });
      if (CURRENT_WINE_DATA) CURRENT_WINE_DATA['Photo URL'] = res.photoURL;
      afficherMessage('Photo mise à jour');
    } else {
      afficherMessage((res && res.message) || 'Photo introuvable');
    }
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function sauverEditFicheV2() {
  var favoriEl = document.getElementById('editV2-favori');
  var favoriVal = (favoriEl && favoriEl.classList.contains('actif')) ? 'Oui' : '';
  var data = { codebarre: CURRENT_WINE_CODEBARRE, aime: (CURRENT_WINE_DATA && CURRENT_WINE_DATA.Racheter) || 'Oui', favori: favoriVal };
  var champsMemoire = { 'Favori': favoriVal };
  EDIT_FICHE_V2_CHAMPS.forEach(function(c) {
    var el = document.getElementById('editV2-' + c[1]);
    var valeur = el ? el.value : '';
    data[c[1]] = valeur;
    var cle = c[2];
    if (cle === 'Designation') cle = 'Désignation';
    if (cle === 'Temperature') cle = 'Température';
    champsMemoire[cle] = valeur;
  });
  appelBackend('saveWineEdits', data, { spinner: 'Sauvegarde' }).then(function() {
    majMemoireVinV2(CURRENT_WINE_CODEBARRE, champsMemoire);
    document.getElementById('editFicheV2Overlay').style.display = 'none';
    afficherMessage('Modifications enregistrées');
    ouvrirFicheV2(CURRENT_WINE_CODEBARRE, FICHE_V2_PROVENANCE);
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}
