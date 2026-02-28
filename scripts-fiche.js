/* ============================================================
   SCRIPTS-FICHE.JS
   Fiche vin détaillée, mode édition, gestion des bouteilles
============================================================ */

// ==================== OUVERTURE FICHE ====================

function ouvrirFicheVin(codebarre) {
  CURRENT_WINE_CODEBARRE = codebarre;
  document.getElementById('ficheVinOverlay').style.display = 'block';
  document.getElementById('fiche-nom').textContent = 'Chargement...';
  document.getElementById('fiche-content').innerHTML = 'Récupération des données...';

  appelBackend('getWineBottles', { codebarre: codebarre }).then(function(result) {
    if (!result) {
      fermerFiche();
      afficherMessage('Vin introuvable ou données pas encore disponibles');
      return;
    }
    afficherFiche(result);
  }).catch(function(err) {
    fermerFiche();
    afficherMessage('Erreur: ' + err);
  });
}

function ouvrirFicheVinParCodeSAQ(codeSAQ) {
  appelBackend('getCodeBarresFromCodeSAQ', { codeSAQ: codeSAQ }).then(function(codebarre) {
    if (codebarre) {
      ouvrirFicheVin(codebarre);
    } else {
      afficherMessage('Vin introuvable dans la cave');
    }
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

// ==================== AFFICHAGE FICHE ====================

function afficherFiche(result) {
  const wine = result.wine;
  const bottles = result.bottles || [];
  CURRENT_WINE_DATA = wine;
  CURRENT_WINE_BOTTLES = bottles;

  setTimeout(function() {
    const prixHeader = document.getElementById('fiche-prix-header');
    if (prixHeader && wine.Prix) prixHeader.textContent = parseFloat(wine.Prix).toFixed(2) + ' $';
  }, 50);

  if (wine['Code SAQ'] && wine['Code-barres']) {
    appelBackend('verifierEtMettreAJourPrixSAQ', { codebarre: wine['Code-barres'], codeSAQ: wine['Code SAQ'] }).then(function(prixResult) {
      if (prixResult && prixResult.updated) {
        afficherMessage('Prix mis à jour : ' + prixResult.ancienPrix.toFixed(2) + '$ → ' + prixResult.nouveauPrix.toFixed(2) + '$');
        const prixElements = document.querySelectorAll('.fiche-prix');
        prixElements.forEach(function(el) {
          el.textContent = prixResult.nouveauPrix.toFixed(2) + ' $';
        });
      }
    }).catch(function(err) {});
  }

  const overlay = document.getElementById('ficheVinOverlay');
  const windowInner = document.getElementById('fichevin-window-inner');
  const nomElement = document.getElementById('fiche-nom');
  const origineElement = document.getElementById('fiche-origine');
  const contentElement = document.getElementById('fiche-content');

  if (wine['Code SAQ']) {
    nomElement.innerHTML = '<a href="https://www.saq.com/fr/' + wine['Code SAQ'] + '" target="_blank" class="fv-title-link">' + decodeHTML(wine.Nom || 'Vin sans nom') + '</a>';
  } else {
    nomElement.textContent = decodeHTML(wine.Nom || 'Vin sans nom');
  }

  windowInner.classList.remove('rouge', 'blanc', 'rose', 'bulles');
  const couleur = (wine.Couleur || '').toLowerCase();
  if (couleur.includes('rouge')) windowInner.classList.add('rouge');
  else if (couleur.includes('blanc')) windowInner.classList.add('blanc');
  else if (couleur.includes('rosé') || couleur.includes('rose')) windowInner.classList.add('rose');
  else if (couleur.includes('bulle') || couleur.includes('mousseux')) windowInner.classList.add('bulles');

  let origineHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-end;">';
  origineHTML += '<div class="fiche-origine-texts">';
  if (wine.Pays) origineHTML += '<div><span class="fiche-label">Pays : </span>' + decodeHTML(wine.Pays) + '</div>';
  if (wine.Region) origineHTML += '<div><span class="fiche-label">Région : </span>' + decodeHTML(wine.Region) + '</div>';
  if (wine.Appellation) origineHTML += '<div><span class="fiche-label">Appellation : </span>' + decodeHTML(wine.Appellation) + '</div>';
  origineHTML += '</div>';
  origineElement.innerHTML = origineHTML;

  let html = '';

  // === BLOC DÉGUSTATION ===
  html += '<div class="fiche-section">';
  html += '<h3 class="fiche-section-title">DÉGUSTATION</h3>';
  html += '<div style="display:flex;gap:20px;margin-bottom:20px;">';
  html += '<div style="flex:1;">';
  if (wine['Cépage']) html += '<div class="fiche-field"><span class="fiche-label">Cépages:</span> ' + decodeHTML(wine['Cépage']) + '</div>';
  if (wine["Pastille gout"]) html += '<div class="fiche-field"><span class="fiche-label">Pastille:</span> ' + decodeHTML(wine["Pastille gout"]) + '</div>';
  if (wine['Arômes']) html += '<div class="fiche-field"><span class="fiche-label">Arômes:</span> ' + decodeHTML(wine['Arômes']) + '</div>';
  html += '</div>';
  html += '<div style="flex:0 0 90px;display:flex;align-items:flex-start;justify-content:center;">';
  html += '<div id="fiche-photo-inline" style="padding:4px;border-bottom:2px solid rgba(201,129,60,0.7);background-color:rgba(201,129,60,0.4);"></div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="fiche-table">';
  const tableFields = [
    ['Acidité', wine['Acidité']], ['Sucrosité', wine['Sucrosité']], ['Corps', wine.Corps],
    ['Bouche', wine.Bouche], ['Sucre', wine.Sucre], ['Alcool', wine.Alcool], ['Temp.', wine['Température']]
  ];
  tableFields.forEach(function(field) {
    if (field[1]) {
      html += '<div class="fiche-table-cell"><div class="fiche-table-label">' + field[0] + '</div><div class="fiche-table-value" style="font-size:11px;word-break:break-word;white-space:normal;line-height:1.3;">' + decodeHTML(field[1]) + '</div></div>';
    }
  });
  html += '</div>';

  if (wine['Particularité']) html += '<div class="fiche-field"><span class="fiche-label">Particularité:</span> ' + decodeHTML(wine['Particularité']) + '</div>';
  if (wine['Désignation']) html += '<div class="fiche-field"><span class="fiche-label">Désignation:</span> ' + decodeHTML(wine['Désignation']) + '</div>';
  if (wine.Classification) html += '<div class="fiche-field"><span class="fiche-label">Classification:</span> ' + decodeHTML(wine.Classification) + '</div>';
  if (wine.Description) html += '<div class="fiche-field"><span class="fiche-label">Description:</span> ' + decodeHTML(wine.Description) + '</div>';
  html += '</div>';

  // === BLOC NOTES ===
  html += '<div class="fiche-section">';
  html += '<h3 class="fiche-section-title">NOTES</h3>';
  html += '<div class="fiche-field" style="position:relative;"><span class="fiche-label">Accords:</span><div id="accords-display" onclick="toggleAccordsMenu()" style="cursor:pointer;padding:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(230,161,0,0.3);min-height:35px;margin-top:5px;"></div><div id="accords-menu" style="display:none;position:absolute;left:0;right:0;top:100%;background:#1a1a1a;border:1px solid var(--gold);padding:10px;z-index:15000;max-height:250px;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;"><style>#accords-menu::-webkit-scrollbar{display:none;}</style></div></div>';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px;">';
  html += '<div class="fiche-field" style="display:flex;align-items:center;gap:10px;"><span class="fiche-label">Aimé:</span><div id="aime-oui" onclick="setAime(\'Oui\')" style="cursor:pointer;width:50px;height:50px;border:1px solid rgba(230,161,0,0.3);background:transparent;display:flex;align-items:center;justify-content:center;font-size:22px;transition:all 0.2s;">✓</div><div id="aime-non" onclick="setAime(\'Non\')" style="cursor:pointer;width:50px;height:50px;border:1px solid rgba(230,161,0,0.3);background:transparent;display:flex;align-items:center;justify-content:center;font-size:22px;transition:all 0.2s;">✗</div></div>';
  html += '<div class="fiche-field" style="display:flex;align-items:center;gap:10px;"><span class="fiche-label">Panier:</span><div id="panier-toggle" onclick="togglePanier()" style="cursor:pointer;width:50px;height:50px;border:1px solid rgba(230,161,0,0.3);background:transparent;display:flex;align-items:center;justify-content:center;font-size:22px;transition:all 0.2s;">🛒</div></div>';
  html += '</div>';
  html += '</div>';

  if (wine.Recettes) html += '<div class="fiche-field"><span class="fiche-label">Recettes:</span> ' + decodeHTML(wine.Recettes) + '</div>';
  if (wine['Notes temporaires']) html += '<div class="fiche-field"><span class="fiche-label">Notes:</span> ' + decodeHTML(wine['Notes temporaires']) + '</div>';
  if (wine.Divers) html += '<div class="fiche-field"><span class="fiche-label">Divers:</span> ' + decodeHTML(wine.Divers) + '</div>';

  // === BLOC INVENTAIRE ===
  const bottlesActives = bottles.filter(function(b) { return b.statut !== 'Bu' && b.statut !== 'Sorti'; });

  html += '<div class="fiche-section fiche-section-inventaire" style="padding-top:20px;margin-bottom:30px;">';

  if (bottlesActives.length === 0) {
    html += '<p class="fiche-empty">Aucune bouteille en inventaire</p>';
  } else {
    bottlesActives.forEach(function(b) {
    const loc = b.meuble && b.rangee && b.espace ?
        b.meuble + ' - rangée ' + b.rangee + ' - espace ' + b.espace :
        '<span class="bottle-to-arrange">À ranger</span>';

      html += '<div class="bottle-card">';
      html += '<div class="bottle-card-location">' + loc + '</div>';
      html += '<div class="bottle-card-actions">';
      html += '<button onclick="deplacerBouteille(' + b.row + ',' + b.bottle + ')" class="btn-bottle-action btn-bottle-move">Déplacer</button>';
      html += '<button onclick="showDrinkForm(' + b.row + ',' + b.bottle + ')" class="btn-bottle-action btn-bottle-drink">Boire</button>';
      html += '</div></div>';

      // Formulaire déplacer
      html += '<div id="move-form-' + b.bottle + '" style="display:none;margin-top:10px;margin-bottom:10px;padding:20px;box-sizing:border-box;background:rgba(230,161,0,0.1);border:1px solid rgba(201,129,60,0.3);">';
      html += '<div style="margin-bottom:15px;"><label style="display:block;margin-bottom:8px;color:var(--gold);font-size:14px;">NOUVEL EMPLACEMENT</label>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">';
      html += '<select id="move-meuble-' + b.bottle + '" onchange="updateRangeesMove(' + b.bottle + ')" style="height:36px;font-size:12px;"><option value="">Meuble</option></select>';
      html += '<select id="move-rangee-' + b.bottle + '" onchange="updateEspacesMove(' + b.bottle + ')" style="height:36px;font-size:12px;"><option value="">Rangée</option></select>';
      html += '<select id="move-espace-' + b.bottle + '" onchange="checkEmplacementMove(' + b.bottle + ')" style="height:36px;font-size:12px;"><option value="">Espace</option></select>';
      html += '</div></div>';
      html += '<div id="move-status-' + b.bottle + '" style="margin-bottom:15px;font-size:13px;"></div>';
      html += '<div style="display:flex;gap:15px;">';
      html += '<button onclick="confirmMove(' + b.row + ',' + b.bottle + ')" class="btn-primary" style="flex:1;height:36px;font-size:12px;padding:0 10px;">CONFIRMER</button>';
      html += '<button onclick="mettreARanger(' + b.row + ',' + b.bottle + ')" class="btn-secondary" style="flex:1;height:36px;font-size:12px;padding:0 10px;">À RANGER</button>';
      html += '<button onclick="cancelMove(' + b.bottle + ')" class="btn-secondary" style="flex:1;height:36px;font-size:12px;padding:0 10px;">ANNULER</button>';
      html += '</div></div>';

      // Formulaire boire
      html += '<div id="drink-form-' + b.bottle + '" style="display:none;margin-top:10px;margin-bottom:10px;padding:20px;box-sizing:border-box;background:rgba(230,161,0,0.1);border:1px solid rgba(201,129,60,0.3);">';
      html += '<div style="margin-bottom:15px;"><label style="display:block;margin-bottom:8px;color:var(--gold);font-size:14px;">AVEC QUEL PLAT ?</label><textarea id="drink-plat-' + b.bottle + '" placeholder="Ex: Saumon grillé..." style="width:100%;box-sizing:border-box;min-height:80px;padding:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(230,161,0,0.3);color:#fff;resize:vertical;"></textarea></div>';
      html += '<div style="margin-bottom:20px;"><label style="display:block;margin-bottom:10px;color:var(--gold);font-size:14px;">ACCORD METS-VIN</label>';
      html += '<div style="display:flex;gap:10px;justify-content:center;">';
      for (var v = 1; v <= 5; v++) {
        html += '<div id="accord-verre-' + b.bottle + '-' + v + '" onclick="selectAccordVerre(' + b.bottle + ',' + v + ')" style="cursor:pointer;font-size:28px;opacity:0.3;transition:all 0.2s;">🍷</div>';
      }
      html += '</div></div>';
      html += '<div style="display:flex;gap:15px;"><button onclick="confirmDrink(' + b.row + ',' + b.bottle + ')" class="btn-primary" style="flex:1;height:36px;font-size:12px;padding:0 10px;">SANTÉ</button><button onclick="cancelDrink(' + b.bottle + ')" class="btn-secondary" style="flex:1;height:36px;font-size:12px;padding:0 10px;">ANNULER</button></div>';
      html += '</div>';
    });
  }

  // Formulaire ajout bouteille
  html += '<div id="add-bottle-form" style="display:none;margin-top:20px;padding:20px;box-sizing:border-box;background:rgba(230,161,0,0.1);border:1px solid rgba(201,129,60,0.3);">';
  html += '<h4 style="color:var(--gold);margin:0 0 15px 0;font-size:14px;">AJOUTER UNE BOUTEILLE</h4>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:15px;">';
  html += '<select id="add-meuble" onchange="updateRangeesAdd()" style="height:36px;font-size:12px;"><option value="">Meuble</option></select>';
  html += '<select id="add-rangee" onchange="updateEspacesAdd()" style="height:36px;font-size:12px;"><option value="">Rangée</option></select>';
  html += '<select id="add-espace" onchange="checkEmplacementAdd()" style="height:36px;font-size:12px;"><option value="">Espace</option></select>';
  html += '</div>';
  html += '<div id="add-emplacement-status" style="margin-bottom:15px;font-size:13px;"></div>';
  html += '<div style="display:flex;gap:10px;"><button onclick="confirmerAjoutBouteille()" class="btn-primary" style="flex:1;height:36px;font-size:12px;padding:0 10px;">AJOUTER</button><button onclick="annulerAjoutBouteille()" class="btn-secondary" style="flex:1;height:36px;font-size:12px;padding:0 10px;">ANNULER</button></div>';
  html += '</div>';
  html += '<button id="btn-show-add-form" onclick="afficherFormulaireAjout()" class="btn-add-bottle" style="width:100%;box-sizing:border-box;margin-top:15px;">+ AJOUTER UNE BOUTEILLE</button>';
  html += '</div>';

  // === BLOC PRODUCTION ===
  html += '<div class="fiche-section">';
  html += '<h3 class="fiche-section-title">PRODUCTION</h3>';
  if (wine.Producteur) html += '<div class="fiche-field"><span class="fiche-label">Producteur:</span> ' + decodeHTML(wine.Producteur) + '</div>';
  if (wine['Agent promo']) html += '<div class="fiche-field"><span class="fiche-label">Agent promo:</span> ' + decodeHTML(wine['Agent promo']) + '</div>';
  if (wine['Code SAQ']) {
    html += '<button onclick="chercherSuccursales()" class="btn-add-bottle" style="width:100%;margin-top:15px;">OÙ TROUVER CE VIN ?</button>';
    html += '<div id="succursales-result" style="margin-top:15px;"></div>';
  }
  html += '</div>';

  contentElement.innerHTML = html;

  // Photo
  setTimeout(function() {
    const photoElementInline = document.getElementById('fiche-photo-inline');
    if (photoElementInline && wine["Photo URL"]) {
      photoElementInline.innerHTML = '<img src="' + wine["Photo URL"] + '" style="max-height:80px;width:auto;cursor:pointer;" onclick="window.open(\'' + wine["Photo URL"] + '\', \'_blank\')" onerror="this.style.display=\'none\'">';
    }
  }, 50);

  // Remplir meubles ajout
  const mSelect = document.getElementById('add-meuble');
  if (mSelect && CONFIG && CONFIG.meubles) {
    Object.keys(CONFIG.meubles).forEach(function(m) {
      mSelect.innerHTML += '<option value="' + m + '">' + m + '</option>';
    });
  }

  // Accords + aimé + panier
  setTimeout(function() {
    if (CONFIG && CONFIG.accords) {
      const currentAccords = (wine.Accords || '').split(',').map(function(a) { return a.trim(); }).filter(Boolean);
      const menu = document.getElementById('accords-menu');
      CONFIG.accords.forEach(function(accord) {
        const isSelected = currentAccords.includes(accord);
        const bgColor = isSelected ? 'rgba(230,161,0,0.2)' : 'transparent';
        menu.innerHTML += '<div onclick="toggleAccord(this)" data-accord="' + accord + '" style="padding:8px;margin:2px 0;cursor:pointer;background:' + bgColor + ';border:1px solid rgba(230,161,0,0.3);" data-selected="' + isSelected + '">' + accord + '</div>';
      });
      mettreAJourAffichageAccords();
    }
    const aimeValue = wine.Racheter || 'Oui';
    setAime(aimeValue);
    const panierValue = wine.Panier || '';
    const panierBtn = document.getElementById('panier-toggle');
    if (panierBtn) {
      panierBtn.style.background = panierValue === 'Oui' ? 'rgba(230,161,0,0.3)' : 'transparent';
      panierBtn.style.borderColor = panierValue === 'Oui' ? 'var(--gold)' : 'rgba(230,161,0,0.3)';
    }
  }, 150);

  overlay.style.display = 'block';
  setTimeout(function() {
    overlay.classList.add('active');
    windowInner.classList.add('active');
  }, 10);
}

// ==================== ACCORDS / AIMÉ / PANIER ====================

function toggleAccordsMenu() {
  const menu = document.getElementById('accords-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function toggleAccord(element) {
  const isSelected = element.getAttribute('data-selected') === 'true';
  element.setAttribute('data-selected', !isSelected);
  element.style.background = !isSelected ? 'rgba(230,161,0,0.2)' : 'transparent';
  mettreAJourAffichageAccords();
}

function mettreAJourAffichageAccords() {
  const menu = document.getElementById('accords-menu');
  const items = menu.querySelectorAll('[data-selected="true"]');
  const selected = Array.from(items).map(function(item) { return item.textContent; });
  const display = document.getElementById('accords-display');
  display.textContent = selected.length > 0 ? selected.join(', ') : 'Aucun accord sélectionné';
  const accordsStr = selected.join(', ');
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Accords', value: accordsStr }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

document.addEventListener('click', function(e) {
  const menu = document.getElementById('accords-menu');
  const display = document.getElementById('accords-display');
  if (menu && display && !menu.contains(e.target) && !display.contains(e.target)) {
    menu.style.display = 'none';
  }
});

function setAime(value) {
  const ouiBtn = document.getElementById('aime-oui');
  const nonBtn = document.getElementById('aime-non');
  if (value === 'Oui') {
    ouiBtn.style.background = 'rgba(230,161,0,0.3)';
    ouiBtn.style.borderColor = 'var(--gold)';
    nonBtn.style.background = 'transparent';
    nonBtn.style.borderColor = 'rgba(230,161,0,0.3)';
  } else {
    nonBtn.style.background = 'rgba(230,161,0,0.3)';
    nonBtn.style.borderColor = 'var(--gold)';
    ouiBtn.style.background = 'transparent';
    ouiBtn.style.borderColor = 'rgba(230,161,0,0.3)';
  }
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Racheter', value: value }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function togglePanier() {
  const panierBtn = document.getElementById('panier-toggle');
  const isActive = panierBtn.style.background !== 'transparent' && panierBtn.style.background !== '';
  const newValue = isActive ? '' : 'Oui';
  panierBtn.style.background = newValue === 'Oui' ? 'rgba(230,161,0,0.3)' : 'transparent';
  panierBtn.style.borderColor = newValue === 'Oui' ? 'var(--gold)' : 'rgba(230,161,0,0.3)';
  appelBackend('updateWineField', { codebarre: CURRENT_WINE_CODEBARRE, field: 'Panier', value: newValue }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

// ==================== ÉDITION FICHE ====================

function toggleEditMode() {
  const wine = CURRENT_WINE_DATA;
  if (!wine) return;

  document.getElementById('btn-save-fiche').style.display = 'inline-flex';
  document.getElementById('btn-edit-fiche').style.display = 'none';

  let html = '<div class="popup-window">';
  html += '<div class="popup-header"><h2 class="popup-title">MODIFIER</h2><button onclick="fermerEditFiche()" class="btn-close-form">✕</button></div>';
  html += '<div class="popup-content">';

  html += '<h3 class="fiche-section-title">IDENTIFICATION</h3>';
  const champsIdentification = [
    ['Nom', 'edit-nom', wine['Nom'] || ''],
    ['Code-barres', 'edit-codebarre', wine['Code-barres'] || ''],
    ['Code SAQ', 'edit-codesaq', wine['Code SAQ'] || ''],
    ['Couleur', 'edit-couleur', wine['Couleur'] || ''],
    ['Prix', 'edit-prix', wine['Prix'] ? parseFloat(wine['Prix']).toFixed(2) : ''],
    ['Pays', 'edit-pays', wine['Pays'] || ''],
    ['Région', 'edit-region', wine['Region'] || ''],
    ['Appellation', 'edit-appellation', wine['Appellation'] || ''],
    ['Cépages', 'edit-cepage', wine['Cépage'] || ''],
  ];
  champsIdentification.forEach(function(champ) {
    html += '<div class="field-container"><label>' + champ[0].toUpperCase() + '</label>';
    html += '<input type="text" id="' + champ[1] + '" value="' + (champ[2] + '').replace(/"/g, '&quot;') + '">';
    html += '</div>';
  });

  html += '<h3 class="fiche-section-title" style="margin-top:20px;">DÉGUSTATION</h3>';
  const champsDegustation = [
    ['Acidité', 'edit-acidite', wine['Acidité'] || ''],
    ['Sucrosité', 'edit-sucrosite', wine['Sucrosité'] || ''],
    ['Corps', 'edit-corps', wine['Corps'] || ''],
    ['Bouche', 'edit-bouche', wine['Bouche'] || ''],
    ['Sucre', 'edit-sucre', wine['Sucre'] || ''],
    ['Alcool', 'edit-alcool', wine['Alcool'] || ''],
    ['Température', 'edit-temperature', wine['Température'] || ''],
    ['Pastille goût', 'edit-pastille', wine['Pastille gout'] || ''],
    ['Arômes', 'edit-aromes', wine['Arômes'] || ''],
    ['Particularité', 'edit-particularite', wine['Particularité'] || ''],
    ['Désignation', 'edit-designation', wine['Désignation'] || ''],
    ['Classification', 'edit-classification', wine['Classification'] || ''],
  ];
  champsDegustation.forEach(function(champ) {
    html += '<div class="field-container"><label>' + champ[0].toUpperCase() + '</label>';
    html += '<input type="text" id="' + champ[1] + '" value="' + (champ[2] + '').replace(/"/g, '&quot;') + '">';
    html += '</div>';
  });

  html += '<div class="field-container"><label>DESCRIPTION</label>';
  html += '<textarea id="edit-description" rows="3">' + (wine['Description'] || '') + '</textarea>';
  html += '</div>';

  html += '<h3 class="fiche-section-title" style="margin-top:20px;">PRODUCTION</h3>';
  [['Producteur', 'edit-producteur', wine['Producteur'] || ''], ['Agent promo', 'edit-agent', wine['Agent promo'] || '']].forEach(function(champ) {
    html += '<div class="field-container"><label>' + champ[0].toUpperCase() + '</label>';
    html += '<input type="text" id="' + champ[1] + '" value="' + (champ[2] + '').replace(/"/g, '&quot;') + '">';
    html += '</div>';
  });

  html += '<h3 class="fiche-section-title" style="margin-top:20px;">PERSONNEL</h3>';
  const aime = wine['Racheter'] || 'Oui';
  html += '<div class="field-container"><label>AIMÉ</label>';
  html += '<div style="display:flex;gap:10px;margin-top:8px;">';
  html += '<div id="edit-aime-oui" onclick="selectEditAime(\'Oui\')" style="width:50px;height:50px;border:1px solid rgba(230,161,0,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;background:' + (aime === 'Oui' ? 'rgba(76,175,80,0.3)' : 'transparent') + ';">✓</div>';
  html += '<div id="edit-aime-non" onclick="selectEditAime(\'Non\')" style="width:50px;height:50px;border:1px solid rgba(230,161,0,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;background:' + (aime === 'Non' ? 'rgba(244,67,54,0.3)' : 'transparent') + ';">✗</div>';
  html += '</div></div>';
  html += '<div class="field-container"><label>RECETTES</label><textarea id="edit-recettes" rows="2">' + (wine['Recettes'] || '') + '</textarea></div>';
  html += '<div class="field-container"><label>NOTES TEMPORAIRES</label><textarea id="edit-notes-temp" rows="2">' + (wine['Notes temporaires'] || '') + '</textarea></div>';
  html += '<div class="field-container"><label>DIVERS</label><textarea id="edit-divers" rows="2">' + (wine['Divers'] || '') + '</textarea></div>';

  const bottlesActives = (CURRENT_WINE_BOTTLES || []).filter(function(b) { return b.statut !== 'Bu' && b.statut !== 'Sorti'; });
  if (bottlesActives.length > 0) {
    html += '<h3 class="fiche-section-title" style="margin-top:20px;">SUPPRIMER UNE BOUTEILLE</h3>';
    bottlesActives.forEach(function(b) {
      const loc = b.meuble && b.rangee && b.espace ? b.meuble + ' - rangée ' + b.rangee + ' - espace ' + b.espace : 'À ranger';  html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">';
      html += '<span style="font-size:13px;font-weight:300;">' + loc + '</span>';
      html += '<button onclick="confirmerSuppressionBouteille(' + b.row + ',' + b.bottle + ')" style="background:rgba(244,67,54,0.2);border:1px solid #f44336;color:#f44336;padding:6px 12px;cursor:pointer;font-size:12px;">SUPPRIMER</button>';
      html += '</div>';
    });
  }

  html += '<div style="display:flex;gap:10px;margin-top:25px;">';
  html += '<button onclick="saveFiche()" class="btn-primary" style="flex:1;height:36px;font-size:12px;padding:0 10px;">CONFIRMER</button>';
  html += '<button onclick="fermerEditFiche()" class="btn-secondary" style="flex:1;height:36px;font-size:12px;padding:0 10px;">ANNULER</button>';
  html += '</div>';
  html += '</div></div>';

  const editPopup = document.getElementById('edit-fiche-popup');
  editPopup.innerHTML = html;
  editPopup.style.display = 'flex';
  setTimeout(function() { editPopup.classList.add('active'); }, 10);
}

function selectEditAime(valeur) {
  document.getElementById('edit-aime-oui').style.background = valeur === 'Oui' ? 'rgba(76,175,80,0.3)' : 'transparent';
  document.getElementById('edit-aime-non').style.background = valeur === 'Non' ? 'rgba(244,67,54,0.3)' : 'transparent';
  document.getElementById('edit-aime-oui').setAttribute('data-selected', valeur === 'Oui' ? 'true' : 'false');
  document.getElementById('edit-aime-non').setAttribute('data-selected', valeur === 'Non' ? 'true' : 'false');
}

function fermerEditFiche() {
  const editPopup = document.getElementById('edit-fiche-popup');
  editPopup.classList.remove('active');
  setTimeout(function() { editPopup.style.display = 'none'; }, 300);
  document.getElementById('btn-save-fiche').style.display = 'none';
  document.getElementById('btn-edit-fiche').style.display = 'inline-flex';
}

function saveFiche() {
  const cb = CURRENT_WINE_CODEBARRE;
  if (!cb) return;

  const aimeOui = document.getElementById('edit-aime-oui');
  const aime = aimeOui && aimeOui.getAttribute('data-selected') === 'true' ? 'Oui' : 'Non';

  const updatedData = {
    codebarre: cb,
    nom: document.getElementById('edit-nom').value,
    codesaq: document.getElementById('edit-codesaq').value,
    couleur: document.getElementById('edit-couleur').value,
    prix: document.getElementById('edit-prix').value,
    pays: document.getElementById('edit-pays').value,
    region: document.getElementById('edit-region').value,
    appellation: document.getElementById('edit-appellation').value,
    cepage: document.getElementById('edit-cepage').value,
    acidite: document.getElementById('edit-acidite').value,
    sucrosite: document.getElementById('edit-sucrosite').value,
    corps: document.getElementById('edit-corps').value,
    bouche: document.getElementById('edit-bouche').value,
    sucre: document.getElementById('edit-sucre').value,
    alcool: document.getElementById('edit-alcool').value,
    temperature: document.getElementById('edit-temperature').value,
    pastille: document.getElementById('edit-pastille').value,
    aromes: document.getElementById('edit-aromes').value,
    particularite: document.getElementById('edit-particularite').value,
    designation: document.getElementById('edit-designation').value,
    classification: document.getElementById('edit-classification').value,
    description: document.getElementById('edit-description').value,
    producteur: document.getElementById('edit-producteur').value,
    agent: document.getElementById('edit-agent').value,
    aime: aime,
    recettes: document.getElementById('edit-recettes').value,
    notestemp: document.getElementById('edit-notes-temp').value,
    divers: document.getElementById('edit-divers').value
  };

  appelBackend('saveWineEdits', updatedData).then(function() {
    afficherMessage('Modifications sauvegardées !');
    fermerEditFiche();
    ouvrirFicheVin(cb);
  }).catch(function(err) {
    afficherMessage('Erreur: ' + err);
  });
}

function confirmerSuppressionBouteille(row, bottle) {
  afficherConfirmation(
    'Supprimer la bouteille',
    'Supprimer cette bouteille ? Cette action est irréversible.',
    function() {
      appelBackend('supprimerBouteille', { row: row, bottle: bottle }).then(function() {
        afficherMessage('Bouteille supprimée');
        fermerEditFiche();
        ouvrirFicheVin(CURRENT_WINE_CODEBARRE);
        chargerInventaire();
      }).catch(function(err) { afficherMessage('Erreur: ' + err); });
    }
  );
}

// ==================== GESTION BOUTEILLES ====================

function afficherFormulaireAjout() {
  document.getElementById('add-bottle-form').style.display = 'block';
  document.getElementById('btn-show-add-form').style.display = 'none';
}

function annulerAjoutBouteille() {
  document.getElementById('add-bottle-form').style.display = 'none';
  document.getElementById('btn-show-add-form').style.display = 'block';
  document.getElementById('add-meuble').value = '';
  document.getElementById('add-rangee').innerHTML = '<option value="">Rangée (optionnel)</option>';
  document.getElementById('add-espace').innerHTML = '<option value="">Espace (optionnel)</option>';
}

function updateRangeesAdd() {
  const meuble = document.getElementById('add-meuble').value;
  const rSelect = document.getElementById('add-rangee');
  const eSelect = document.getElementById('add-espace');
  rSelect.innerHTML = '<option value="">Rangée (optionnel)</option>';
  eSelect.innerHTML = '<option value="">Espace (optionnel)</option>';
  if (meuble && CONFIG.meubles[meuble]) {
    Object.keys(CONFIG.meubles[meuble]).forEach(function(r) {
      rSelect.innerHTML += '<option value="' + r + '">' + r + '</option>';
    });
  }
}

function updateEspacesAdd() {
  const meuble = document.getElementById('add-meuble').value;
  const rangee = document.getElementById('add-rangee').value;
  const eSelect = document.getElementById('add-espace');
  eSelect.innerHTML = '<option value="">Espace (optionnel)</option>';
  if (meuble && rangee && CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) {
    CONFIG.meubles[meuble][rangee].forEach(function(e) {
      eSelect.innerHTML += '<option value="' + e + '">' + e + '</option>';
    });
  }
}

function checkEmplacementAdd() {
  const meuble = document.getElementById('add-meuble').value;
  const rangee = document.getElementById('add-rangee').value;
  const espace = document.getElementById('add-espace').value;
  const statusDiv = document.getElementById('add-emplacement-status');
  if (!meuble || !rangee || !espace) { statusDiv.innerHTML = ''; statusDiv.setAttribute('data-available', 'true'); return; }
  statusDiv.innerHTML = 'Vérification...';
  appelBackend('checkLocationAvailable', { meuble: meuble, rangee: rangee, espace: espace }).then(function(result) {
    if (result.available) {
      statusDiv.innerHTML = '<span style="color:#4caf50;">✓ Libre</span>';
      statusDiv.setAttribute('data-available', 'true');
    } else {
      statusDiv.innerHTML = '<span style="color:#f44336;">✗ Occupé par : ' + result.message + '</span>';
      statusDiv.setAttribute('data-available', 'false');
    }
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function confirmerAjoutBouteille() {
  const meuble = document.getElementById('add-meuble').value;
  const rangee = document.getElementById('add-rangee').value;
  const espace = document.getElementById('add-espace').value;
  const statusDiv = document.getElementById('add-emplacement-status');
  if (statusDiv && statusDiv.getAttribute('data-available') === 'false') { afficherMessage('Emplacement occupé'); return; }
  appelBackend('addBottle', { codebarre: CURRENT_WINE_CODEBARRE, meuble: meuble, rangee: rangee, espace: espace }).then(function() {
    afficherMessage('Bouteille ajoutée !');
    annulerAjoutBouteille();
    ouvrirFicheVin(CURRENT_WINE_CODEBARRE);
    chargerInventaire();
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function deplacerBouteille(row, bottle) {
  document.querySelectorAll('[id^="move-form-"]').forEach(function(form) { form.style.display = 'none'; });
  const form = document.getElementById('move-form-' + bottle);
  if (form) {
    form.style.display = 'block';
    const mSelect = document.getElementById('move-meuble-' + bottle);
    mSelect.innerHTML = '<option value="">MEUBLE</option>';
    Object.keys(CONFIG.meubles || {}).forEach(function(m) {
      mSelect.innerHTML += '<option value="' + m + '">' + m + '</option>';
    });
    document.getElementById('move-rangee-' + bottle).innerHTML = '<option value="">RANGÉE</option>';
    document.getElementById('move-espace-' + bottle).innerHTML = '<option value="">ESPACE</option>';
    document.getElementById('move-status-' + bottle).innerHTML = '';
  }
}

function showDrinkForm(row, bottle) {
  document.querySelectorAll('[id^="drink-form-"]').forEach(function(form) { form.style.display = 'none'; });
  document.getElementById('drink-form-' + bottle).style.display = 'block';
}

function cancelMove(bottle) {
  document.getElementById('move-form-' + bottle).style.display = 'none';
}

function cancelDrink(bottle) {
  document.getElementById('drink-form-' + bottle).style.display = 'none';
  document.getElementById('drink-plat-' + bottle).value = '';
}

let SELECTED_ACCORD = {};

function selectAccordVerre(bottle, note) {
  SELECTED_ACCORD[bottle] = note;
  for (var v = 1; v <= 5; v++) {
    const verre = document.getElementById('accord-verre-' + bottle + '-' + v);
    if (verre) verre.style.opacity = v <= note ? '1' : '0.3';
  }
}

function confirmDrink(row, bottle) {
  const plat = document.getElementById('drink-plat-' + bottle).value;
  const bonAccord = SELECTED_ACCORD[bottle] || '3';
  appelBackend('actionBouteille', { row: row, action: 'boire', bottle: bottle, plat: plat, bonAccord: bonAccord }).then(function() {
    cancelDrink(bottle);
    delete SELECTED_ACCORD[bottle];
    ouvrirFicheVin(CURRENT_WINE_CODEBARRE);
    chargerInventaire();
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function updateRangeesMove(bottle) {
  const meuble = document.getElementById('move-meuble-' + bottle).value;
  const rSelect = document.getElementById('move-rangee-' + bottle);
  const eSelect = document.getElementById('move-espace-' + bottle);
  rSelect.innerHTML = '<option value="">Rangee</option>';
  eSelect.innerHTML = '<option value="">Espace</option>';
  document.getElementById('move-status-' + bottle).innerHTML = '';
  if (meuble && CONFIG.meubles[meuble]) {
    Object.keys(CONFIG.meubles[meuble]).forEach(function(r) {
      rSelect.innerHTML += '<option value="' + r + '">' + r + '</option>';
    });
  }
}

function updateEspacesMove(bottle) {
  const meuble = document.getElementById('move-meuble-' + bottle).value;
  const rangee = document.getElementById('move-rangee-' + bottle).value;
  const eSelect = document.getElementById('move-espace-' + bottle);
  eSelect.innerHTML = '<option value="">Espace</option>';
  document.getElementById('move-status-' + bottle).innerHTML = '';
  if (meuble && rangee && CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) {
    CONFIG.meubles[meuble][rangee].forEach(function(e) {
      eSelect.innerHTML += '<option value="' + e + '">' + e + '</option>';
    });
  }
}

function checkEmplacementMove(bottle) {
  const meuble = document.getElementById('move-meuble-' + bottle).value;
  const rangee = document.getElementById('move-rangee-' + bottle).value;
  const espace = document.getElementById('move-espace-' + bottle).value;
  const statusDiv = document.getElementById('move-status-' + bottle);
  if (!meuble || !rangee || !espace) { statusDiv.innerHTML = ''; return; }
  statusDiv.innerHTML = 'Vérification...';
  appelBackend('checkLocationAvailable', { meuble: meuble, rangee: rangee, espace: espace }).then(function(result) {
    if (result.available) {
      statusDiv.innerHTML = '<span style="color:#4caf50;">✓ Libre</span>';
      statusDiv.setAttribute('data-available', 'true');
    } else {
      statusDiv.innerHTML = '<span style="color:#f44336;">✗ Occupé par : ' + result.message + '</span>';
      statusDiv.setAttribute('data-available', 'false');
    }
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function confirmMove(row, bottle) {
  const meuble = document.getElementById('move-meuble-' + bottle).value;
  const rangee = document.getElementById('move-rangee-' + bottle).value;
  const espace = document.getElementById('move-espace-' + bottle).value;
  if (!meuble || !rangee || !espace) { afficherMessage('Veuillez remplir tous les champs'); return; }
  appelBackend('actionBouteille', { row: row, action: 'deplacer', bottle: bottle, meuble: meuble, rangee: rangee, espace: espace }).then(function() {
    afficherMessage('Bouteille déplacée');
    cancelMove(bottle);
    ouvrirFicheVin(CURRENT_WINE_CODEBARRE);
    chargerInventaire();
    chargerListeARanger();
  }).catch(function(err) { afficherMessage('Erreur lors du déplacement'); });
}

function mettreARanger(row, bottle) {
  afficherConfirmation(
    'Mettre à ranger',
    'Retirer cet emplacement pour cette bouteille ?',
    function() {
      appelBackend('mettreBotteilleARanger', { row: row, bottle: bottle }).then(function() {
        afficherMessage('Bouteille mise à ranger');
        cancelMove(bottle);
        ouvrirFicheVin(CURRENT_WINE_CODEBARRE);
        chargerInventaire();
      }).catch(function(err) { afficherMessage('Erreur: ' + err); });
    }
  );
}

function fermerFiche() {
  const overlay = document.getElementById('ficheVinOverlay');
  const windowInner = document.getElementById('fichevin-window-inner');
  overlay.classList.remove('active');
  windowInner.classList.remove('active');
  setTimeout(function() { overlay.style.display = 'none'; }, 300);
}

// ==================== SUCCURSALES ====================

function chercherSuccursales() {
  const codeSAQ = CURRENT_WINE_DATA['Code SAQ'];
  const div = document.getElementById('succursales-result');
  div.innerHTML = '<p style="color:var(--white-70);font-size:13px;">Localisation en cours...</p>';

  navigator.geolocation.getCurrentPosition(
    function(position) {
      div.innerHTML = '<p style="color:var(--white-70);font-size:13px;">Recherche en cours... ~30 secondes</p>';
      appelBackend('getSuccursalesDisponibles', { codeSAQ: codeSAQ, lat: position.coords.latitude, lng: position.coords.longitude }).then(afficherResultatsSuccursales).catch(function(err) { div.innerHTML = '<p style="color:var(--error);">Erreur: ' + err + '</p>'; });
    },
    function() {
      div.innerHTML = '<p style="color:var(--white-70);font-size:13px;">GPS non disponible, recherche depuis Lanoraie...</p>';
      appelBackend('getSuccursalesDisponibles', { codeSAQ: codeSAQ }).then(afficherResultatsSuccursales).catch(function(err) { div.innerHTML = '<p style="color:var(--error);">Erreur: ' + err + '</p>'; });
    }
  );
}

function afficherResultatsSuccursales(succursales) {
  const div = document.getElementById('succursales-result');
  if (!succursales || succursales.length === 0) {
    div.innerHTML = '<p style="color:var(--error);font-size:13px;">Aucune succursale disponible</p>';
    return;
  }
  let html = '<h3 style="color:var(--gold);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:15px;">' + succursales.length + ' SUCCURSALES DISPONIBLES</h3>';
  succursales.forEach(function(s) {
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.adresse + ', ' + s.ville + ', QC');
    html += '<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<span style="font-size:13px;font-weight:300;">' + s.nom + '</span>';
    html += '<span style="color:var(--gold);font-size:12px;">' + s.distance + ' — ' + s.quantite + ' btl</span>';
    html += '</div>';
    html += '<div onclick="window.open(\'' + mapsUrl + '\', \'_blank\')" style="font-size:11px;color:var(--white-50);cursor:pointer;margin-top:3px;">' + s.adresse + ', ' + s.ville + '</div>';
    html += '</div>';
  });
  div.innerHTML = html;
}

// ==================== UTILITAIRES ====================

function afficherMessage(m) {
  let t = document.getElementById('toast') || document.createElement('div');
  t.id = 'toast';
  t.className = 'toast';
  document.body.appendChild(t);
  t.textContent = m;
  t.classList.add('show');
  setTimeout(function() {
    t.classList.remove('show');
    setTimeout(function() { t.style.display = 'none'; }, 400);
  }, 3000);
}

function afficherConfirmation(title, message, onConfirm, onCancel) {
  let overlay = document.getElementById('confirmOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirmOverlay';
    overlay.className = 'confirm-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = '<div class="confirm-dialog"><button onclick="document.getElementById(\'confirmOverlay\').style.display=\'none\'" class="confirm-dialog-close">✕</button><h3 class="color-primary mb-20 fs-14 text-uppercase">' + title + '</h3><p class="color-white mb-20 fs-14">' + message + '</p><div class="confirm-dialog-buttons"><button id="confirmBtn" class="confirm-dialog-button confirm-dialog-button-primary">OUI, SANTÉ !</button><button id="cancelBtn" class="confirm-dialog-button confirm-dialog-button-secondary">ANNULER</button></div></div>';
  overlay.style.display = 'flex';
  document.getElementById('confirmBtn').onclick = function() { overlay.style.display = 'none'; if (onConfirm) onConfirm(); };
  document.getElementById('cancelBtn').onclick = function() { overlay.style.display = 'none'; if (onCancel) onCancel(); };
  overlay.onclick = function(e) { if (e.target === overlay) { overlay.style.display = 'none'; if (onCancel) onCancel(); } };
}

function marquerBouteilleBue(row, bottle) {
  afficherConfirmation(
    'Marquer comme bue',
    'Confirmer que cette bouteille a été bue ?',
    function() {
      appelBackend('actionBouteille', { row: row, action: 'boire', bottle: bottle }).then(function() {
        afficherMessage('Santé !');
        fermerFiche();
        chargerInventaire();
      }).catch(function(err) { afficherMessage('Erreur: ' + err); });
    }
  );
}
