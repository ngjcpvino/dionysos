/* ============================================================
   SCRIPTS-LISTES.JS
   Listes racheter, à ranger, à compléter, emplacements, promotions
============================================================ */

// ==================== LISTE D'ACHAT ====================

function chargerListeRacheter() {
  const div = document.getElementById("racheter-list");
  if (!div) return;
  div.innerHTML = "<p class='text-center p-15 color-muted'>Chargement...</p>";

  appelBackend('getInventoryData').then(function(data) {
    ALL_DATA = data || [];
    appelBackend('getSuccursales').then(function(succursales) {
      const select = document.getElementById('select-succursale');
      if (select) {
        select.innerHTML = '<option value="">Choisir une succursale</option>';
        succursales.forEach(function(s) {
          select.innerHTML += '<option value="' + s.numero + '">' + s.nom + '</option>';
        });
      }
    }).catch(function(err) { afficherMessage('Erreur: ' + err); });
    chargerToutesSuccursales();
    afficherListeRacheter(ALL_DATA);
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function sauvegarderSuccursale() {
  const nom = document.getElementById('new-succursale-nom').value.trim();
  const numero = document.getElementById('new-succursale-numero').value.trim();
  if (!nom || !numero) { afficherMessage('Nom et numéro requis'); return; }
  appelBackend('ajouterSuccursale', { nom: nom, numero: numero }).then(function() {
    afficherMessage('Succursale ajoutée !');
    document.getElementById('form-succursale').style.display = 'none';
    document.getElementById('btn-ajouter-succursale').style.display = 'block';
    document.getElementById('new-succursale-nom').value = '';
    document.getElementById('new-succursale-numero').value = '';
    chargerListeRacheter();
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function chargerToutesSuccursales() {
  appelBackend('getToutesSuccursales').then(function(succursales) {
    const select = document.getElementById('select-toutes-succursales');
    if (!select) return;
    select.innerHTML = '<option value="">Succursales disponibles</option>';
    succursales.forEach(function(s) {
      select.innerHTML += '<option value="' + s.numero + '" data-nom="' + s.ville + ' - ' + s.adresse + '">' + s.ville + ' — ' + s.adresse + '</option>';
    });
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function remplirSuccursaleSelectionnee() {
  const select = document.getElementById('select-toutes-succursales');
  const option = select.options[select.selectedIndex];
  if (!option.value) return;
  document.getElementById('new-succursale-nom').value = option.getAttribute('data-nom');
  document.getElementById('new-succursale-numero').value = option.value;
}

function lancerVerificationGraphQL() {
  const succursale = document.getElementById('select-succursale').value;
  if (!succursale) { afficherMessage('Choisissez une succursale'); return; }

  const div = document.getElementById('racheter-list');
  const status = document.getElementById('dispo-status');
  const cards = div.querySelectorAll('.wine-card');

  status.style.display = 'block';
  status.textContent = 'Vérification en cours...';

  let total = 0;
  let compteur = 0;

  cards.forEach(function(card) {
    const codeSAQ = card.getAttribute('data-codesaq');
    if (!codeSAQ) return;
    total++;

    appelBackend('verifierDispoSAQ_GRAPHQL_V1', { codeSAQ: codeSAQ, succursale: succursale }).then(function(dispo) {
      const badge = card.querySelector('.dispo-badge');
      if (badge) {
        badge.textContent = dispo.disponible ? (dispo.quantite ? dispo.quantite + ' btl' : '✓') : '✗';
        badge.className = dispo.disponible ? 'dispo-badge dispo-badge-oui' : 'dispo-badge dispo-badge-non';
      }
      compteur++;
      status.textContent = 'Vérification... : ' + compteur + '/' + total;
      if (compteur === total) status.textContent = '✓ Vérification terminée !';
    }).catch(function() { compteur++; });
  });

  if (total === 0) { afficherMessage('Aucun vin avec code SAQ'); }
}

// ==================== LISTE À RANGER ====================

function chargerListeARanger() {
  const div = document.getElementById("aranger-list");
  if (!div) return;
  div.innerHTML = "<p class='text-center p-15 color-muted'>Chargement...</p>";
  appelBackend('getInventoryData').then(function(data) {
    ALL_DATA = data || [];
    afficherListeARanger(ALL_DATA);
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

// ==================== LISTE À COMPLÉTER ====================

function chargerListeACompleter() {
  appelBackend('getScannedWinesIncomplete').then(function(wines) {
    afficherListeACompleter(wines);
  }).catch(function(err) { afficherMessage('Erreur de chargement'); });
}

function afficherListeACompleter(data) {
  const div = document.getElementById("completer-list");
  if (!div) return;

  if (data.length === 0) {
    div.innerHTML = "<p class='text-center p-15 color-muted'>Aucun vin à compléter</p>";
    return;
  }

  div.innerHTML = "";
  data.forEach(function(item) {
    const cb = item.codebarre || '';
    const note = item.note || '';
    const dateScan = item.dateScan || '';
    div.innerHTML += '<div class="wine-card" style="border:none;" onclick="openCompleteScannedWine(' + item.row + ', \'' + cb.replace(/'/g, "\\'") + '\', \'' + note.replace(/'/g, "\\'") + '\')"><div class="wine-card-left"><div class="wine-name">Code-barres: ' + cb + '</div><div class="wine-sub" style="font-size:12px;margin-top:5px;">' + dateScan + '</div></div></div>';
  });
}

// ==================== EMPLACEMENTS ====================

function chargerEmplacements() {
  const div = document.getElementById("emplacements-table");
  if (!div) return;
  div.innerHTML = "<p class='text-center p-15 color-muted'>Chargement...</p>";
  appelBackend('getInventoryData').then(function(data) {
    ALL_DATA = data || [];
    remplirFiltresEmplacements();
    afficherEmplacements(ALL_DATA);
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function remplirFiltresEmplacements() {
  const meubles = new Set();
  ALL_DATA.forEach(function(item) { if (item.Meuble) meubles.add(item.Meuble); });

  const mSel = document.getElementById('filter-meuble-emp');
  mSel.innerHTML = '<option value="">MEUBLES</option>';
  Array.from(meubles).sort().forEach(function(m) {
    mSel.innerHTML += '<option value="' + m + '">' + m.toUpperCase() + '</option>';
  });

  document.getElementById('filter-rangee-emp').innerHTML = '<option value="">RANGÉES</option>';
  document.getElementById('filter-espace-emp').innerHTML = '<option value="">ESPACES</option>';
}

function appliquerFiltresEmplacements() {
  const rSel = document.getElementById('filter-rangee-emp');
  const eSel = document.getElementById('filter-espace-emp');
  const meuble = document.getElementById('filter-meuble-emp').value;
  const rangee = rSel.value;
  const espace = eSel.value;

  if (meuble) {
    const rangees = new Set();
    ALL_DATA.forEach(function(item) {
      const statut = item.Statut || "En stock";
      const isActive = statut !== "Bu" && statut !== "Sorti";
      if (isActive && item.Meuble === meuble && item.Rangee && item.Espace) rangees.add(item.Rangee);
    });

    rSel.innerHTML = '<option value="">RANGÉES</option>';
    Array.from(rangees).sort(function(a, b) { return parseInt(a) - parseInt(b); }).forEach(function(r) {
      rSel.innerHTML += '<option value="' + r + '">RANGÉE ' + r + '</option>';
    });
    if (rangee && rangees.has(rangee)) rSel.value = rangee;
    eSel.innerHTML = '<option value="">ESPACES</option>';
  } else {
    rSel.innerHTML = '<option value="">RANGÉES</option>';
    eSel.innerHTML = '<option value="">ESPACES</option>';
  }

  if (meuble && rangee) {
    const espaces = new Set();
    ALL_DATA.forEach(function(item) {
      const statut = item.Statut || "En stock";
      const isActive = statut !== "Bu" && statut !== "Sorti";
      if (isActive && item.Meuble === meuble && item.Rangee === rangee && item.Espace) espaces.add(item.Espace);
    });

    eSel.innerHTML = '<option value="">ESPACES</option>';
    Array.from(espaces).sort(function(a, b) { return parseInt(a) - parseInt(b); }).forEach(function(e) {
      eSel.innerHTML += '<option value="' + e + '">ESPACE ' + e + '</option>';
    });
    if (espace && espaces.has(espace)) eSel.value = espace;
  }

  afficherEmplacements(ALL_DATA);
}

function reinitialiserFiltresEmplacements() {
  document.getElementById('filter-meuble-emp').value = "";
  document.getElementById('filter-rangee-emp').value = "";
  document.getElementById('filter-espace-emp').value = "";
  afficherEmplacements(ALL_DATA);
}
function afficherEmplacements(data) {
  const div = document.getElementById("emplacements-table");
  if (!div) return;

  const meuble = document.getElementById('filter-meuble-emp').value;
  const rangee = document.getElementById('filter-rangee-emp').value;
  const espace = document.getElementById('filter-espace-emp').value;

  div.innerHTML = "";

  // Vins en double (sans filtre)
  if (!meuble && !rangee && !espace) {
    const grouped = {};
    data.forEach(function(item) {
      const statut = item.Statut || "En stock";
      if (statut === "Bu" || statut === "Sorti") return;
      const cb = (item["Code-barres"] || "").toString().trim();
      if (!grouped[cb]) grouped[cb] = { wine: item, count: 0, emplacements: [] };
      grouped[cb].count++;
      if (item.Meuble && item.Rangee && item.Espace) {
        grouped[cb].emplacements.push(item.Meuble.substring(0, 1).toUpperCase() + '-' + item.Rangee + '-' + item.Espace);
      } else {
        grouped[cb].emplacements.push('À ranger');
      }
    });

    const multiples = Object.values(grouped).filter(function(g) { return g.count >= 2; });
    multiples.sort(function(a, b) { return b.count - a.count; });

    if (multiples.length > 0) {
      let html = '<div class="bloc-niveau-1 mb-20">';
      html += '<div onclick="basculerVinsMultiples()" class="accueil-section-item">';
      html += '<span>' + multiples.length + ' vin' + (multiples.length > 1 ? 's' : '') + ' en double ou plus</span>';
      html += '<span id="multiples-arrow">▼</span></div>';
      html += '<div id="vins-multiples-details" class="collapsible-content" style="display:none;">';
      multiples.forEach(function(g) {
        const cb = (g.wine["Code-barres"] || "").toString().trim();
        html += '<div style="padding:10px 15px;border-bottom:1px solid rgba(255,255,255,0.08);cursor:pointer;" onclick="ouvrirFicheVin(\'' + cb + '\')">';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">';
        html += '<span class="fs-13 fw-300">' + g.wine.Nom + '</span>';
        html += '<span class="color-muted fs-11">' + g.count + ' bouteille' + (g.count > 1 ? 's' : '') + '</span>';
        html += '</div>';
        html += '<div class="fs-11 color-muted">' + g.emplacements.join(' • ') + '</div>';
        html += '</div>';
      });
      html += '</div></div>';
      div.innerHTML += html;
    }
  }

  const filtered = data.filter(function(item) {
    const statut = item.Statut || "En stock";
    const isActive = statut !== "Bu" && statut !== "Sorti";
    const hasLocation = item.Meuble && item.Rangee && item.Espace;
    return isActive && hasLocation &&
      (!meuble || item.Meuble === meuble) &&
      (!rangee || item.Rangee.toString() === rangee) &&
      (!espace || item.Espace.toString() === espace);
  });

  if (filtered.length === 0 && !div.innerHTML) {
    div.innerHTML += "<p class='text-center p-15 color-muted'>Aucun emplacement trouvé</p>";
    return;
  }

  // Cépages manquants au Cellier/Pigeonnier
  if (meuble === 'Cellier' || meuble === 'Pigeonnier') {
    const cepagesCellier = new Set();
    const cepagesAutres = {};

    data.forEach(function(item) {
      const statut = item.Statut || "En stock";
      if (statut === "Bu" || statut === "Sorti" || !item.Meuble) return;
      const cepagesStr = item.Cepage || '';
      if (!cepagesStr) return;
      const cepagesList = cepagesStr.split(',').map(function(c) { return c.trim(); }).filter(Boolean);
      cepagesList.forEach(function(cepage) {
        if (item.Meuble === meuble) {
          cepagesCellier.add(cepage);
        } else {
          if (!cepagesAutres[cepage]) cepagesAutres[cepage] = [];
          cepagesAutres[cepage].push({ nom: item.Nom, codebarre: item["Code-barres"] });
        }
      });
    });

    const manquants = Object.keys(cepagesAutres).filter(function(c) { return !cepagesCellier.has(c); });

    // Doublons cépages au Cellier
    const cepagesCellierGroupe = {};
    filtered.forEach(function(item) {
      const cepagesStr = item.Cepage || '';
      if (!cepagesStr) return;
      const cepageDominant = cepagesStr.split(',')[0].trim();
      if (!cepagesCellierGroupe[cepageDominant]) cepagesCellierGroupe[cepageDominant] = [];
      cepagesCellierGroupe[cepageDominant].push(item);
    });

    const doublons = Object.entries(cepagesCellierGroupe).filter(function(entry) { return entry[1].length >= 2; })
      .sort(function(a, b) { return b[1].length - a[1].length; });

    if (manquants.length > 0 || doublons.length > 0) {
      let html = '<div class="bloc-niveau-1 mb-20">';

      if (manquants.length > 0) {
        html += '<div onclick="basculerCepagesManquants()" class="accueil-section-item">';
        html += '<span>' + manquants.length + ' cépage' + (manquants.length > 1 ? 's' : '') + ' manquant' + (manquants.length > 1 ? 's' : '') + ' au ' + meuble + '</span>';
        html += '<span id="cepages-arrow">▼</span></div>';
        html += '<div id="cepages-manquants-details" class="collapsible-content" style="display:none;">';
        manquants.sort().forEach(function(cepage) {
          const vins = cepagesAutres[cepage];
          html += '<div style="padding:10px 15px;border-bottom:1px solid rgba(255,255,255,0.08);">';
          html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">';
          html += '<span class="fs-13 fw-300">' + cepage + '</span>';
          html += '<span class="color-muted fs-11">' + vins.length + ' bouteille' + (vins.length > 1 ? 's' : '') + '</span>';
          html += '</div>';
          vins.forEach(function(vin) {
            html += '<div onclick="ouvrirFicheVin(\'' + vin.codebarre + '\')" class="fs-12 color-muted" style="padding:2px 0 2px 10px;cursor:pointer;">• ' + vin.nom + '</div>';
          });
          html += '</div>';
        });
        html += '</div>';
      }

      if (doublons.length > 0) {
        if (manquants.length > 0) html += '<div class="accueil-separator"></div>';
        html += '<div onclick="basculerDoublonsCepages()" class="accueil-section-item">';
        html += '<span>' + doublons.length + ' cépage' + (doublons.length > 1 ? 's' : '') + ' en double au ' + meuble + '</span>';
        html += '<span id="doublons-arrow">▼</span></div>';
        html += '<div id="doublons-cepages-details" class="collapsible-content" style="display:none;">';
        doublons.forEach(function(entry) {
          const cepage = entry[0];
          const vins = entry[1];
          html += '<div style="padding:10px 15px;border-bottom:1px solid rgba(255,255,255,0.08);">';
          html += '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">';
          html += '<span class="fs-13 fw-300">' + cepage + '</span>';
          html += '<span class="color-muted fs-11">' + vins.length + ' bouteilles</span>';
          html += '</div>';
          vins.forEach(function(vin) {
            const cb = (vin["Code-barres"] || "").toString().trim();
            const emp = vin.Meuble.substring(0, 1).toUpperCase() + '-' + vin.Rangee + '-' + vin.Espace;
            html += '<div onclick="ouvrirFicheVin(\'' + cb + '\')" class="fs-12 color-muted" style="padding:2px 0 2px 10px;cursor:pointer;">• ' + vin.Nom + ' <span class="color-muted">(' + emp + ')</span></div>';
          });
          html += '</div>';
        });
        html += '</div>';
      }

      html += '</div>';
      div.innerHTML += html;
    }
  }

  filtered.sort(function(a, b) {
    const ordreMeubles = { "Cellier": 1, "Réserve": 2, "Reserve": 2, "Caveau": 3 };
    const valA = ordreMeubles[a.Meuble] || 99;
    const valB = ordreMeubles[b.Meuble] || 99;
    if (valA !== valB) return valA - valB;
    if (parseInt(a.Rangee) !== parseInt(b.Rangee)) return parseInt(a.Rangee) - parseInt(b.Rangee);
    return (parseInt(a.Espace) || 0) - (parseInt(b.Espace) || 0);
  });

  filtered.forEach(function(item) {
    const emp = item.Meuble.substring(0, 1).toUpperCase() + '-' + item.Rangee + '-' + item.Espace;
    div.innerHTML += genererCardVin(item, { emplacements: [emp] });
  });
}

function basculerCepagesManquants() {
  const details = document.getElementById('cepages-manquants-details');
  const arrow = document.getElementById('cepages-arrow');
  details.style.display = details.style.display === 'none' ? 'block' : 'none';
  if (arrow) arrow.textContent = details.style.display === 'none' ? '▼' : '▲';
}

function basculerVinsMultiples() {
  const details = document.getElementById('vins-multiples-details');
  const arrow = document.getElementById('multiples-arrow');
  details.style.display = details.style.display === 'none' ? 'block' : 'none';
  if (arrow) arrow.textContent = details.style.display === 'none' ? '▼' : '▲';
}

function basculerDoublonsCepages() {
  const details = document.getElementById('doublons-cepages-details');
  const arrow = document.getElementById('doublons-arrow');
  details.style.display = details.style.display === 'none' ? 'block' : 'none';
  if (arrow) arrow.textContent = details.style.display === 'none' ? '▼' : '▲';
}

// ==================== PROMOTIONS ====================

function chargerPromotions() {
  const div = document.getElementById('promotions-list');
  if (!div) return;
  div.innerHTML = "<p class='text-center p-15 color-muted'>Chargement des promotions...</p>";

  appelBackend('getSuccursales').then(function(succursales) {
    const select = document.getElementById('select-succursale-promo');
    if (select) {
      select.innerHTML = '<option value="">Choisir une succursale</option>';
      succursales.forEach(function(s) {
        select.innerHTML += '<option value="' + s.numero + '">' + s.nom + '</option>';
      });
    }
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });

  const codesSAQ = [];
  ALL_DATA.forEach(function(item) {
    const codeSAQ = item['Code SAQ'];
    if (codeSAQ && !codesSAQ.includes(codeSAQ.toString())) {
      codesSAQ.push(codeSAQ.toString());
    }
  });

  appelBackend('getPromotionsSAQ', { codesSAQ: codesSAQ }).then(function(promos) {
    afficherPromotions(promos || []);
    appelBackend('getToutesPromotionsSAQ', { codesSAQ: codesSAQ }).then(function(autresPromos) {
      afficherAutresPromotions(autresPromos || []);
    }).catch(function(err) { afficherMessage('Erreur: ' + err); });
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function afficherPromotions(promos) {
  const div = document.getElementById('promotions-list');
  if (!div) return;
  div.innerHTML = '<p class="promo-vide">' + promos.length + ' vin' + (promos.length > 1 ? 's' : '') + ' en promotion cette semaine</p>';
  div.innerHTML += '<div class="promo-grid">';
  promos.forEach(function(promo) {
    const codeSAQ = promo.codeSAQ;
    let prixHTML = '';
    if (promo.rabais > 0) {
      prixHTML = '<span class="promo-prix-regulier">' + promo.prixRegulier.toFixed(2) + '$</span> ';
      prixHTML += '<span class="promo-prix-final">' + promo.prixFinal.toFixed(2) + '$</span>';
    } else {
      prixHTML = '<span class="promo-prix-final">' + promo.prixFinal.toFixed(2) + '$</span>';
    }
    if (promo.pointsBonis > 0) {
      prixHTML += ' <span class="promo-card-pts">' + promo.pointsBonis + ' pts</span>';
    }
    div.innerHTML +=
      '<div class="promo-card">' +
        '<div class="promo-card-nom" onclick="event.stopPropagation();ouvrirFicheVinParCodeSAQ(\'' + codeSAQ + '\')">' + promo.nom + '</div>' +
        '<div class="promo-card-prix">' + prixHTML + '</div>' +
        '<div id="dispo-promo-' + codeSAQ + '" class="promo-dispo">📍 Choisir une succursale</div>' +
        '<button onclick="event.stopPropagation();voirSuccursalesPromo(\'' + codeSAQ + '\')" class="promo-btn-succursales">Toutes les succursales</button>' +
      '</div>';
    chargerDispoPromo(codeSAQ);
  });
  div.innerHTML += '</div>';
}

function chargerDispoPromo(codeSAQ) {
  const succursales = document.getElementById('select-succursale-promo');
  const codeSuccursale = succursales ? succursales.value : '';
  const divDispo = document.getElementById('dispo-promo-' + codeSAQ);
  if (!codeSuccursale || !divDispo) { if (divDispo) divDispo.innerHTML = ''; return; }

  appelBackend('verifierDispoSAQ_GRAPHQL_V1', { codeSAQ: codeSAQ, succursale: codeSuccursale }).then(function(result) {
    if (!divDispo) return;
    if (result.disponible) {
      const nomSuccursale = succursales.options[succursales.selectedIndex].text;
      divDispo.innerHTML = '📍 ' + (result.quantite ? result.quantite + ' bouteilles disponibles à ' + nomSuccursale : 'Disponible à ' + nomSuccursale);
      divDispo.classList.remove('promo-dispo-non');
      divDispo.classList.add('promo-dispo-ok');
    } else {
      divDispo.innerHTML = '📍 Non disponible à ' + succursales.options[succursales.selectedIndex].text;
      divDispo.classList.remove('promo-dispo-ok');
      divDispo.classList.add('promo-dispo-non');
    }
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}









function rafraichirDispoPromos() {
  const cards = document.querySelectorAll('[id^="dispo-promo-"]');
  cards.forEach(function(div) {
    const codeSAQ = div.id.replace('dispo-promo-', '');
    chargerDispoPromo(codeSAQ);
  });
}

function voirSuccursalesPromo(codeSAQ) {
  const div = document.getElementById('dispo-promo-' + codeSAQ);
  if (!div) return;
  div.innerHTML = '📍 Recherche en cours...';

  function afficherSuccursales(succursales) {
    if (!succursales || succursales.length === 0) { div.innerHTML = '📍 Aucune succursale disponible'; return; }
    let html = '';
    succursales.slice(0, 5).forEach(function(s) {
      html += '<div class="promo-succursale-item">' +
        '<span class="color-muted">' + s.nom + '</span>' +
        ' <span class="color-primary">' + s.quantite + ' btl</span>' +
        '</div>';
    });
    div.innerHTML = html;
  }

  navigator.geolocation.getCurrentPosition(
    function(position) {
      appelBackend('getSuccursalesDisponibles', { codeSAQ: codeSAQ, lat: position.coords.latitude, lng: position.coords.longitude })
        .then(afficherSuccursales)
        .catch(function() { div.innerHTML = '📍 Erreur'; });
    },
    function() {
      appelBackend('getSuccursalesDisponibles', { codeSAQ: codeSAQ })
        .then(afficherSuccursales)
        .catch(function() { div.innerHTML = '📍 Erreur'; });
    }
  );
}



function afficherAutresPromotions(promos) {
  const div = document.getElementById('promotions-list');
  if (!div || promos.length === 0) return;
  let html = '<div class="bloc-niveau-1 mt-20">';
  html += '<div onclick="basculerAutresPromos()" class="accueil-section-item">';
  html += '<span>DÉCOUVRIR D\'AUTRES VINS EN PROMOTION (' + promos.length + ')</span>';
  html += '<span id="autres-promos-arrow">▼</span></div>';
  html += '<div id="autres-promos-details" class="collapsible-content" style="display:none;">';
  html += '<div class="promo-filtres">';
  html += '<select id="filtre-couleur-promo" onchange="filtrerAutresPromos()" class="filter-select filter-select-bordered">';
  html += '<option value="">Toutes couleurs</option><option value="Rouge">Rouge</option><option value="Blanc">Blanc</option><option value="Rosé">Rosé</option>';
  html += '</select>';
  html += '<select id="filtre-prix-promo" onchange="filtrerAutresPromos()" class="filter-select filter-select-bordered">';
  html += '<option value="">Tous prix</option><option value="15">Moins de 15$</option><option value="25">15$ à 25$</option><option value="99">25$+</option>';
  html += '</select>';
  html += '</div>';
  html += '<div id="autres-promos-liste"></div>';
  html += '</div></div>';
  div.innerHTML += html;
  window.AUTRES_PROMOS = promos;
  filtrerAutresPromos();
}


function basculerAutresPromos() {
  const details = document.getElementById('autres-promos-details');
  const arrow = document.getElementById('autres-promos-arrow');
  details.style.display = details.style.display === 'none' ? 'block' : 'none';
  if (arrow) arrow.textContent = details.style.display === 'none' ? '▼' : '▲';
}

function filtrerAutresPromos() {
  const couleur = document.getElementById('filtre-couleur-promo').value;
  const prix = document.getElementById('filtre-prix-promo').value;
  const liste = document.getElementById('autres-promos-liste');
  if (!liste) return;
  let filtered = window.AUTRES_PROMOS || [];
  if (couleur) filtered = filtered.filter(function(p) { return p.couleur === couleur; });
  if (prix === '15') filtered = filtered.filter(function(p) { return p.prixFinal < 15; });
  if (prix === '25') filtered = filtered.filter(function(p) { return p.prixFinal >= 15 && p.prixFinal <= 25; });
  if (prix === '99') filtered = filtered.filter(function(p) { return p.prixFinal > 25; });
  liste.innerHTML = '';
  filtered.forEach(function(promo) {
    liste.innerHTML +=
      '<div class="promo-item" onclick="window.open(\'https://www.saq.com/fr/' + promo.codeSAQ + '\', \'_blank\')">' +
        '<div class="promo-nom">' + promo.nom + '</div>' +
        '<div>' +
          '<span class="promo-prix-regulier">' + promo.prixRegulier.toFixed(2) + '$</span> ' +
          '<span class="promo-prix-final">' + promo.prixFinal.toFixed(2) + '$</span> ' +
          '<span class="promo-rabais">(-' + promo.rabais.toFixed(2) + '$)</span>' +
          (promo.couleur ? '<span class="promo-couleur"> • ' + promo.couleur + '</span>' : '') +
        '</div>' +
      '</div>';
  });
  if (filtered.length === 0) {
    liste.innerHTML = '<p class="promo-vide">Aucun résultat</p>';
  }
}
