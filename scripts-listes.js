/* ============================================================
   SCRIPTS-LISTES.JS
   Listes racheter, à ranger, à compléter, emplacements, promotions
============================================================ */

// ==================== LISTE D'ACHAT ====================

function chargerListeRacheter() {
  const div = document.getElementById("racheter-list");
  if (!div) return;
  div.innerHTML = "<p class='text-center p-15 color-muted'>Chargement...</p>";

  google.script.run
    .withSuccessHandler(function(data) {
      ALL_DATA = data || [];
      google.script.run
        .withSuccessHandler(function(succursales) {
          const select = document.getElementById('select-succursale');
          if (select) {
            select.innerHTML = '<option value="">Choisir une succursale...</option>';
            succursales.forEach(function(s) {
              select.innerHTML += '<option value="' + s.numero + '">' + s.nom + '</option>';
            });
          }
        })
        .getSuccursales();
      chargerToutesSuccursales();
      afficherListeRacheter(ALL_DATA);
    })
    .getInventoryData();
}

function sauvegarderSuccursale() {
  const nom = document.getElementById('new-succursale-nom').value.trim();
  const numero = document.getElementById('new-succursale-numero').value.trim();
  if (!nom || !numero) { afficherMessage('Nom et numéro requis'); return; }
  google.script.run
    .withSuccessHandler(function() {
      afficherMessage('Succursale ajoutée !');
      document.getElementById('form-succursale').style.display = 'none';
      document.getElementById('btn-ajouter-succursale').style.display = 'block';
      document.getElementById('new-succursale-nom').value = '';
      document.getElementById('new-succursale-numero').value = '';
      chargerListeRacheter();
    })
    .withFailureHandler(function(err) { afficherMessage('Erreur: ' + err); })
    .ajouterSuccursale(nom, numero);
}

function chargerToutesSuccursales() {
  google.script.run
    .withSuccessHandler(function(succursales) {
      const select = document.getElementById('select-toutes-succursales');
      if (!select) return;
      select.innerHTML = '<option value="">Choisir une succursale...</option>';
      succursales.forEach(function(s) {
        select.innerHTML += '<option value="' + s.numero + '" data-nom="' + s.ville + ' - ' + s.adresse + '">' + s.ville + ' — ' + s.adresse + '</option>';
      });
    })
    .getToutesSuccursales();
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

    google.script.run
      .withSuccessHandler(function(dispo) {
        const badge = card.querySelector('.dispo-badge');
        if (badge) {
          badge.textContent = dispo.disponible ? (dispo.quantite ? dispo.quantite + ' btl' : '✓') : '✗';
          badge.className = dispo.disponible ? 'dispo-badge dispo-badge-oui' : 'dispo-badge dispo-badge-non';
        }
        compteur++;
        status.textContent = 'Vérification... : ' + compteur + '/' + total;
        if (compteur === total) status.textContent = '✓ Vérification terminée !';
      })
      .withFailureHandler(function() { compteur++; })
      .verifierDispoSAQ_GRAPHQL_V1(codeSAQ, succursale);
  });

  if (total === 0) { afficherMessage('Aucun vin avec code SAQ'); }
}

// ==================== LISTE À RANGER ====================

function chargerListeARanger() {
  const div = document.getElementById("aranger-list");
  if (!div) return;
  div.innerHTML = "<p class='text-center p-15 color-muted'>Chargement...</p>";
  google.script.run
    .withSuccessHandler(function(data) {
      ALL_DATA = data || [];
      afficherListeARanger(ALL_DATA);
    })
    .getInventoryData();
}

// ==================== LISTE À COMPLÉTER ====================

function chargerListeACompleter() {
  google.script.run
    .withSuccessHandler(function(wines) { afficherListeACompleter(wines); })
    .withFailureHandler(function(err) { afficherMessage('Erreur de chargement'); })
    .getScannedWinesIncomplete();
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
  google.script.run
    .withSuccessHandler(function(data) {
      ALL_DATA = data || [];
      remplirFiltresEmplacements();
      afficherEmplacements(ALL_DATA);
    })
    .getInventoryData();
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
      rSel.innerHTML += '<option value="' + r + '">RANGÉE - ' + r + '</option>';
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
      eSel.innerHTML += '<option value="' + e + '">ESPACE - ' + e + '</option>';
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
      html += '<div onclick="basculerVinsMultiples()" class="collapsible-header">';
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

    if (manquants.length > 0) {
      let html = '<div class="bloc-niveau-1 mb-20">';
      html += '<div onclick="basculerCepagesManquants()" class="collapsible-header">';
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
      html += '</div></div>';
      div.innerHTML += html;
    }

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

    if (doublons.length > 0) {
      let html = '<div class="bloc-niveau-1 mb-20">';
      html += '<div onclick="basculerDoublonsCepages()" class="collapsible-header">';
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
      html += '</div></div>';
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

  google.script.run
    .withSuccessHandler(function(succursales) {
      const select = document.getElementById('select-succursale-promo');
      if (select) {
        select.innerHTML = '<option value="">Choisir une succursale...</option>';
        succursales.forEach(function(s) {
          select.innerHTML += '<option value="' + s.numero + '">' + s.nom + '</option>';
        });
      }
    })
    .getSuccursales();

  const codesSAQ = [];
  ALL_DATA.forEach(function(item) {
    const codeSAQ = item['Code SAQ'];
    if (codeSAQ && !codesSAQ.includes(codeSAQ.toString())) {
      codesSAQ.push(codeSAQ.toString());
    }
  });

  google.script.run
    .withSuccessHandler(function(promos) {
      afficherPromotions(promos || []);
      google.script.run
        .withSuccessHandler(function(autresPromos) { afficherAutresPromotions(autresPromos || []); })
        .getToutesPromotionsSAQ(codesSAQ);
    })
    .getPromotionsSAQ(codesSAQ);
}

function afficherPromotions(promos) {
  const div = document.getElementById('promotions-list');
  if (!div) return;

  div.innerHTML = '<p style="font-size:12px;color:var(--white-50);text-align:center;margin-bottom:15px;">' + promos.length + ' vin' + (promos.length > 1 ? 's' : '') + ' en promotion cette semaine</p>';
  div.innerHTML += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 15px;">';

  promos.forEach(function(promo) {
    const codeSAQ = promo.codeSAQ;
    let prixHTML = '';
    if (promo.rabais > 0) {
      prixHTML = '<span style="text-decoration:line-through;color:var(--white-50);font-size:11px;">' + promo.prixRegulier.toFixed(2) + '$</span> ';
      prixHTML += '<span style="color:var(--gold);font-size:13px;font-weight:600;">' + promo.prixFinal.toFixed(2) + '$</span>';
    } else {
      prixHTML = '<span style="color:var(--white);font-size:13px;">' + promo.prixFinal.toFixed(2) + '$</span>';
    }
    if (promo.pointsBonis > 0) {
      prixHTML += ' <span style="color:var(--gold);font-size:11px;">' + promo.pointsBonis + ' pts</span>';
    }

    div.innerHTML +=
      '<div style="background:var(--bg-card);padding:10px;">' +
        '<div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;line-height:1.3;cursor:pointer;" onclick="event.stopPropagation();ouvrirFicheVinParCodeSAQ(\'' + codeSAQ + '\')">' + promo.nom + '</div>' +
        '<div style="margin-bottom:6px;">' + prixHTML + '</div>' +
        '<div id="dispo-promo-' + codeSAQ + '" style="font-size:11px;color:var(--white-50);margin-bottom:6px;">📍 Choisir une succursale...</div>' +
        '<button onclick="event.stopPropagation();voirSuccursalesPromo(\'' + codeSAQ + '\')" style="background:transparent;border:1px solid rgba(201,129,60,0.3);color:var(--white-50);padding:4px 8px;font-size:10px;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;width:100%;">Toutes les succursales</button>' +
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

  google.script.run
    .withSuccessHandler(function(result) {
      if (!divDispo) return;
      if (result.disponible) {
        const nomSuccursale = succursales.options[succursales.selectedIndex].text;
        divDispo.innerHTML = '📍 ' + (result.quantite ? result.quantite + ' bouteilles disponibles à ' + nomSuccursale : 'Disponible à ' + nomSuccursale);
        divDispo.style.color = '#4caf50';
      } else {
        divDispo.innerHTML = '📍 Non disponible à ' + succursales.options[succursales.selectedIndex].text;
        divDispo.style.color = '#f44336';
      }
    })
    .verifierDispoSAQ_GRAPHQL_V1(codeSAQ, codeSuccursale);
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

  navigator.geolocation.getCurrentPosition(
    function(position) {
      google.script.run
        .withSuccessHandler(function(succursales) {
          if (!succursales || succursales.length === 0) { div.innerHTML = '📍 Aucune succursale disponible'; return; }
          let html = '';
          succursales.slice(0, 5).forEach(function(s) {
            html += '<div style="padding:3px 0;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.05);">';
            html += '<span style="color:var(--white-70);">' + s.nom + '</span>';
            html += ' <span style="color:var(--gold);">' + s.quantite + ' btl</span>';
            html += '</div>';
          });
          div.innerHTML = html;
        })
        .getSuccursalesDisponibles(codeSAQ, position.coords.latitude, position.coords.longitude);
    },
    function() {
      google.script.run
        .withSuccessHandler(function(succursales) {
          if (!succursales || succursales.length === 0) { div.innerHTML = '📍 Aucune succursale disponible'; return; }
          let html = '';
          succursales.slice(0, 5).forEach(function(s) {
            html += '<div style="padding:3px 0;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.05);">';
            html += '<span style="color:var(--white-70);">' + s.nom + '</span>';
            html += ' <span style="color:var(--gold);">' + s.quantite + ' btl</span>';
            html += '</div>';
          });
          div.innerHTML = html;
        })
        .getSuccursalesDisponibles(codeSAQ);
    }
  );
}

function afficherAutresPromotions(promos) {
  const div = document.getElementById('promotions-list');
  if (!div || promos.length === 0) return;

  let html = '<div style="margin-top:20px;background:rgba(0,0,0,0.4);padding:15px;">';
  html += '<div onclick="basculerAutresPromos()" class="collapsible-header">DÉCOUVRIR D\'AUTRES VINS EN PROMOTION (' + promos.length + ')<span id="autres-promos-arrow">▼</span></div>';
  html += '<div id="autres-promos-details" style="display:none;margin-top:10px;">';
  html += '<div style="display:flex;gap:10px;margin-bottom:15px;">';
  html += '<select id="filtre-couleur-promo" onchange="filtrerAutresPromos()" class="filter-select" style="flex:1;border:1px solid rgba(201,129,60,0.3);">';
  html += '<option value="">Toutes couleurs</option><option value="Rouge">Rouge</option><option value="Blanc">Blanc</option><option value="Rosé">Rosé</option>';
  html += '</select>';
  html += '<select id="filtre-prix-promo" onchange="filtrerAutresPromos()" class="filter-select" style="flex:1;border:1px solid rgba(201,129,60,0.3);">';
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
      '<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);cursor:pointer;" onclick="window.open(\'https://www.saq.com/fr/' + promo.codeSAQ + '\', \'_blank\')">' +
        '<div style="font-size:13px;font-weight:600;text-transform:uppercase;margin-bottom:5px;">' + promo.nom + '</div>' +
        '<div>' +
          '<span style="text-decoration:line-through;color:var(--white-50);font-size:12px;">' + promo.prixRegulier.toFixed(2) + '$</span> ' +
          '<span style="color:var(--gold);font-size:14px;font-weight:600;">' + promo.prixFinal.toFixed(2) + '$</span> ' +
          '<span style="color:#4caf50;font-size:11px;">(-' + promo.rabais.toFixed(2) + '$)</span>' +
          (promo.couleur ? ' <span style="color:var(--white-50);font-size:11px;">• ' + promo.couleur + '</span>' : '') +
        '</div>' +
      '</div>';
  });

  if (filtered.length === 0) {
    liste.innerHTML = '<p style="color:var(--white-50);font-size:13px;text-align:center;padding:15px;">Aucun résultat</p>';
  }
}
