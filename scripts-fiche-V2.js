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
  CURRENT_WINE_DATA = wine;
  CURRENT_WINE_BOTTLES = result.bottles || [];

  document.getElementById('ficheV2-nom').textContent = decodeHTML(wine.Nom || 'Vin sans nom');

  var origine = [];
  if (wine.Pays) origine.push(decodeHTML(wine.Pays));
  if (wine.Region) origine.push(decodeHTML(wine.Region));
  if (wine.Appellation) origine.push(decodeHTML(wine.Appellation));
  document.getElementById('ficheV2-origine').textContent = origine.join(' • ');

  var bottlesActives = CURRENT_WINE_BOTTLES.filter(function(b) {
    return b.statut !== 'Bu' && b.statut !== 'Sorti';
  });

  var emplacements = [];
  bottlesActives.forEach(function(b) {
    if (b.meuble && b.rangee && b.espace) {
      emplacements.push(b.meuble.substring(0, 1).toUpperCase() + '-' + b.rangee + '-' + b.espace);
    } else {
      emplacements.push('À ranger');
    }
  });

  var corps = '';
  corps += '<div class="wine-count">' + bottlesActives.length + ' UNITÉ' + (bottlesActives.length > 1 ? 'S' : '') + '</div>';
  emplacements.forEach(function(e) {
    corps += '<div class="wine-emplacement">' + e + '</div>';
  });

  document.getElementById('ficheV2-corps').innerHTML = corps;
}

function fermerFicheV2() {
  document.getElementById('ficheV2Overlay').style.display = 'none';
  if (FICHE_V2_PROVENANCE === 'menuScan' && menuActionV2Context) {
    ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
  }
  FICHE_V2_PROVENANCE = null;
}