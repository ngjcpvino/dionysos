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

  document.getElementById('ficheV2-nom').textContent = decodeHTML(wine.Nom || 'Vin sans nom');

  var origine = [];
  if (wine.Pays) origine.push(decodeHTML(wine.Pays));
  if (wine.Region) origine.push(decodeHTML(wine.Region));
  if (wine.Appellation) origine.push(decodeHTML(wine.Appellation));
  document.getElementById('ficheV2-origine').textContent = origine.join(' • ');

  var html = '';

  // === DÉGUSTATION ===
  html += '<div class="fiche-section">';
  html += '<h3 class="fiche-section-title">DÉGUSTATION</h3>';
  if (wine.Prix) html += '<div class="fiche-field"><span class="fiche-label">Prix:</span> ' + parseFloat(wine.Prix).toFixed(2) + ' $</div>';
  if (wine['Cépage']) html += '<div class="fiche-field"><span class="fiche-label">Cépages:</span> ' + decodeHTML(wine['Cépage']) + '</div>';
  if (wine['Pastille gout']) html += '<div class="fiche-field"><span class="fiche-label">Pastille:</span> ' + decodeHTML(wine['Pastille gout']) + '</div>';
  if (wine['Arômes']) html += '<div class="fiche-field"><span class="fiche-label">Arômes:</span> ' + decodeHTML(wine['Arômes']) + '</div>';

  html += '<div class="fiche-table">';
  var tableFields = [
    ['Acidité', wine['Acidité']], ['Sucrosité', wine['Sucrosité']], ['Corps', wine.Corps],
    ['Bouche', wine.Bouche], ['Sucre', wine.Sucre], ['Alcool', wine.Alcool], ['Température', wine.Temperature]
  ];
  tableFields.forEach(function(f) {
    if (f[1]) html += '<div class="fiche-table-cell"><span class="fiche-label">' + f[0] + ':</span> ' + decodeHTML(f[1].toString()) + '</div>';
  });
  html += '</div>';

  if (wine['Particularité']) html += '<div class="fiche-field"><span class="fiche-label">Particularité:</span> ' + decodeHTML(wine['Particularité']) + '</div>';
  if (wine.Designation) html += '<div class="fiche-field"><span class="fiche-label">Désignation:</span> ' + decodeHTML(wine.Designation) + '</div>';
  if (wine.Classification) html += '<div class="fiche-field"><span class="fiche-label">Classification:</span> ' + decodeHTML(wine.Classification) + '</div>';
  if (wine.Producteur) html += '<div class="fiche-field"><span class="fiche-label">Producteur:</span> ' + decodeHTML(wine.Producteur) + '</div>';
  if (wine.Description) html += '<div class="fiche-field"><span class="fiche-label">Description:</span> ' + decodeHTML(wine.Description) + '</div>';
  html += '</div>';

  // === NOTES ===
  html += '<div class="fiche-section">';
  html += '<h3 class="fiche-section-title">NOTES</h3>';
  if (wine.Accords) html += '<div class="fiche-field"><span class="fiche-label">Accords:</span> ' + decodeHTML(wine.Accords) + '</div>';
  if (wine.Racheter) html += '<div class="fiche-field"><span class="fiche-label">Aimé:</span> ' + decodeHTML(wine.Racheter) + '</div>';
  if (wine.Recettes) html += '<div class="fiche-field"><span class="fiche-label">Recettes:</span> ' + decodeHTML(wine.Recettes) + '</div>';
  if (wine['Notes temporaires']) html += '<div class="fiche-field"><span class="fiche-label">Notes:</span> ' + decodeHTML(wine['Notes temporaires']) + '</div>';
  if (wine.Divers) html += '<div class="fiche-field"><span class="fiche-label">Divers:</span> ' + decodeHTML(wine.Divers) + '</div>';
  html += '</div>';

  // === INVENTAIRE (lecture seule) ===
  var bottlesActives = bottles.filter(function(b) { return b.statut !== 'Bu' && b.statut !== 'Sorti'; });
  html += '<div class="fiche-section fiche-section-inventaire">';
  if (bottlesActives.length === 0) {
    html += '<p class="fiche-empty">Aucune bouteille en inventaire</p>';
  } else {
    bottlesActives.forEach(function(b) {
      var loc = (b.meuble && b.rangee && b.espace) ?
        decodeHTML(b.meuble) + ' - rangée ' + b.rangee + ' - espace ' + b.espace :
        'À ranger';
      html += '<div class="bottle-card"><div class="bottle-card-location">' + loc + '</div></div>';
    });
  }
  html += '</div>';

  document.getElementById('ficheV2-corps').innerHTML = html;
}

function fermerFicheV2() {
  document.getElementById('ficheV2Overlay').style.display = 'none';
  if (FICHE_V2_PROVENANCE === 'menuScan' && menuActionV2Context) {
    ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
  }
  FICHE_V2_PROVENANCE = null;
}