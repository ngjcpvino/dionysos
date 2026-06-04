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

  // === DÉGUSTATION ===
  html += '<div class="section">';
  html += '<h3 class="titre-2">Dégustation</h3>';

  html += ligne('Cépages', wine['Cépage']);
  html += ligne('Pastille', wine['Pastille gout']);
  html += ligne('Arômes', wine['Arômes']);

  function carte(libelle, valeur) {
    if (!valeur) return '';
    return '<div class="carte-info"><span class="libelle">' + libelle + '</span><span class="valeur">' + decodeHTML(valeur.toString()) + '</span></div>';
  }
  var cartes = '';
  cartes += carte('Acidité', wine['Acidité']);
  cartes += carte('Sucrosité', wine['Sucrosité']);
  cartes += carte('Corps', wine.Corps);
  cartes += carte('Bouche', wine.Bouche);
  cartes += carte('Sucre', wine.Sucre);
  cartes += carte('Alcool', wine.Alcool);
  cartes += carte('Température', wine.Temperature);
  if (cartes) html += '<div class="grille-cartes">' + cartes + '</div>';

  html += ligne('Particularité', wine['Particularité']);
  html += ligne('Désignation', wine.Designation);
  html += ligne('Classification', wine.Classification);
  if (wine.Description) html += '<div class="texte">' + decodeHTML(wine.Description) + '</div>';
    if (wine.Prix) html += '<div class="ligne-info"><span class="libelle">Prix : </span>' + parseFloat(wine.Prix).toFixed(2) + ' $</div>';
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
  html += ligne('Accords', wine.Accords);
  html += ligne('Aimé', wine.Racheter);
  html += ligne('Recettes', wine.Recettes);
  html += ligne('Notes', wine['Notes temporaires']);
  html += ligne('Divers', wine.Divers);
  html += '</div>';

  // === INVENTAIRE (lecture seule) ===
  var bottlesActives = bottles.filter(function(b) { return b.statut !== 'Bu' && b.statut !== 'Sorti'; });
  html += '<div class="section">';
  html += '<h3 class="titre-2">Inventaire</h3>';
  if (bottlesActives.length === 0) {
    html += '<div class="texte-secondaire">Aucune bouteille en inventaire</div>';
  } else {
    bottlesActives.forEach(function(b) {
      var loc = (b.meuble && b.rangee && b.espace) ?
        b.meuble.substring(0, 1).toUpperCase() + '-' + b.rangee + '-' + b.espace :
        'À ranger';
      html += '<div class="ligne-info">' + loc + '</div>';
    });
  }
 html += '</div>';

  if (wine['Code SAQ']) {
    html += '<button class="btn-primary btn-pleine-largeur" onclick="trouverCeVinV2()">OÙ TROUVER CE VIN</button>';
  }

  document.getElementById('ficheV2-corps').innerHTML = html;
}

function fermerFicheV2() {
  document.getElementById('ficheV2Overlay').style.display = 'none';
  if (FICHE_V2_PROVENANCE === 'menuScan' && menuActionV2Context) {
    ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
  }
  FICHE_V2_PROVENANCE = null;
}

function trouverCeVinV2() {
  afficherMessage('En rénovation');
}