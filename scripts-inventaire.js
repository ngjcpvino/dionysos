/* ============================================================
   SCRIPTS-INVENTAIRE.JS
   Chargement inventaire, stats accueil, cépages/appellations,
   filtres, carte universelle, listes principale/ranger/racheter/historique
============================================================ */

// ==================== CHARGEMENT ====================

function chargerInventaire() {
  const div = document.getElementById("inventory-cards");
  if (!div) return;
  div.innerHTML = "<p class='text-center p-15 color-muted'>SYNCHRONISATION...</p>";
  appelBackend('getInventoryData').then(inventaireCharge).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function inventaireCharge(data) {
  ALL_DATA = data || [];
  afficherCartes(ALL_DATA);
  remplirFiltres(ALL_DATA);
  mettreAJourStatsAccueil();
  chargerPageRecherche();

  if (FILTRE_CEPAGE_EN_ATTENTE) {
    document.getElementById('filter-cepage').value = FILTRE_CEPAGE_EN_ATTENTE;
    FILTRE_CEPAGE_EN_ATTENTE = null;
    appliquerFiltres();
    return;
  }

  if (FILTRE_APPELLATION_EN_ATTENTE) {
    document.getElementById('filter-appellation').value = FILTRE_APPELLATION_EN_ATTENTE;
    FILTRE_APPELLATION_EN_ATTENTE = null;
    appliquerFiltres();
    return;
  }

  if (RESULTATS_RECHERCHE_EN_ATTENTE) {
    afficherCartes(RESULTATS_RECHERCHE_EN_ATTENTE);
    RESULTATS_RECHERCHE_EN_ATTENTE = null;
  }
}

// ==================== STATS ACCUEIL ====================
function mettreAJourStatsAccueil() {
  if (!ALL_DATA) return;
  const actives = ALL_DATA.filter(function(item) {
    const statut = item.Statut || "En stock";
    return statut !== "Bu" && statut !== "Sorti";
  });
  document.getElementById('total-bouteilles').textContent = actives.length + ' bouteille' + (actives.length > 1 ? 's' : '') + ' en inventaire';
  const cepageCounts = {};
  actives.forEach(function(item) {
    const cepages = item.Cepage || '';
    if (cepages) {
      const liste = cepages.split(',').map(function(c) { return c.trim(); }).filter(Boolean);
      liste.forEach(function(cepage) {
        cepageCounts[cepage] = (cepageCounts[cepage] || 0) + 1;
      });
    }
  });
  const totalCepages = Object.keys(cepageCounts).length;
  document.getElementById('cepages-count-text').textContent = totalCepages + ' cépage' + (totalCepages > 1 ? 's' : '');
  const sorted = Object.entries(cepageCounts).sort(function(a, b) { return b[1] - a[1]; });
  const divCep = document.getElementById('liste-cepages');
  divCep.innerHTML = '';
  divCep.style.display = 'none';
  sorted.forEach(function(entry) {
    const cepage = entry[0];
    const count = entry[1];
    divCep.innerHTML += '<div onclick="filtrerParCepage(\'' + cepage.replace(/'/g, "\\'") + '\')" class="card-cepage-item"><span>' + cepage + '</span><span class="card-cepage-count">' + count + ' bouteille' + (count > 1 ? 's' : '') + '</span></div>';
  });
  const appellationCounts = {};
  actives.forEach(function(item) {
    const appellation = item.Appellation || '';
    if (appellation) {
      appellationCounts[appellation] = (appellationCounts[appellation] || 0) + 1;
    }
  });
  const totalAppellations = Object.keys(appellationCounts).length;
  document.getElementById('appellations-count-text').textContent = totalAppellations + ' appellation' + (totalAppellations > 1 ? 's' : '');
  const sortedAppellations = Object.entries(appellationCounts).sort(function(a, b) { return b[1] - a[1]; });
  const divApp = document.getElementById('liste-appellations');
  divApp.innerHTML = '';
  divApp.style.display = 'none';
  sortedAppellations.forEach(function(entry) {
    const appellation = entry[0];
    const count = entry[1];
    divApp.innerHTML += '<div onclick="filtrerParAppellation(\'' + appellation.replace(/'/g, "\\'") + '\')" class="card-cepage-item"><span>' + appellation + '</span><span class="card-cepage-count">' + count + ' bouteille' + (count > 1 ? 's' : '') + '</span></div>';
  });
}
function toggleCepagesAccueil() {
  const liste = document.getElementById('liste-cepages');
  const arrow = document.getElementById('cepages-accueil-arrow');
  const listeApp = document.getElementById('liste-appellations');
  const arrowApp = document.getElementById('appellations-accueil-arrow');
  listeApp.style.display = 'none';
  if (arrowApp) arrowApp.textContent = '▼';
  if (liste.style.display === 'none' || liste.style.display === '') {
    liste.style.display = 'block';
    if (arrow) arrow.textContent = '▲';
  } else {
    liste.style.display = 'none';
    if (arrow) arrow.textContent = '▼';
  }
}
function toggleAppellationsAccueil() {
  const liste = document.getElementById('liste-appellations');
  const arrow = document.getElementById('appellations-accueil-arrow');
  const listeCep = document.getElementById('liste-cepages');
  const arrowCep = document.getElementById('cepages-accueil-arrow');
  listeCep.style.display = 'none';
  if (arrowCep) arrowCep.textContent = '▼';
  if (liste.style.display === 'none' || liste.style.display === '') {
    liste.style.display = 'block';
    if (arrow) arrow.textContent = '▲';
  } else {
    liste.style.display = 'none';
    if (arrow) arrow.textContent = '▼';
  }
}
function filtrerParAppellation(appellation) {
  FILTRE_APPELLATION_EN_ATTENTE = appellation;
  changeView('liste');
  closeMenu();
}
function filtrerParCepage(cepage) {
  FILTRE_CEPAGE_EN_ATTENTE = cepage;
  changeView('liste');
  closeMenu();
}
// ==================== RECHERCHE AVANCÉE ====================

function chargerPageRecherche() {
  if (!ALL_DATA || ALL_DATA.length === 0) return;

  const fields = [
    { id: 'search-classification', key: 'Classification' },
    { id: 'search-particularite', key: 'Particularité' },
    { id: 'search-producteur', key: 'Producteur' },
    { id: 'search-agent', key: 'Agent promo' },
    { id: 'search-aromes', key: 'Arômes' },
    { id: 'search-acidite', key: 'Acidité' },
    { id: 'search-sucrosite', key: 'Sucrosité' },
    { id: 'search-corps', key: 'Corps' },
    { id: 'search-bouche', key: 'Bouche' },
    { id: 'search-divers', key: 'Divers' }
  ];

  fields.forEach(function(field) {
    const values = new Set();
    ALL_DATA.forEach(function(item) {
      const val = item[field.key];
      if (val && val.toString().trim() !== '') values.add(val.toString().trim());
    });
    const select = document.getElementById(field.id);
    if (select) {
      select.innerHTML = '<option value="">-- Tous --</option>';
      Array.from(values).sort().forEach(function(v) {
        select.innerHTML += '<option value="' + v.replace(/"/g, '&quot;') + '">' + v + '</option>';
      });
    }
  });
}

function executeSearch() {
  const filters = {
    classification: document.getElementById('search-classification').value,
    particularite: document.getElementById('search-particularite').value,
    producteur: document.getElementById('search-producteur').value,
    agent: document.getElementById('search-agent').value,
    aromes: document.getElementById('search-aromes').value,
    acidite: document.getElementById('search-acidite').value,
    sucrosite: document.getElementById('search-sucrosite').value,
    corps: document.getElementById('search-corps').value,
    bouche: document.getElementById('search-bouche').value,
    divers: document.getElementById('search-divers').value
  };

  const filtered = ALL_DATA.filter(function(item) {
    return (!filters.classification || item.Classification === filters.classification) &&
           (!filters.particularite || item['Particularité'] === filters.particularite) &&
           (!filters.producteur || item.Producteur === filters.producteur) &&
           (!filters.agent || item['Agent promo'] === filters.agent) &&
           (!filters.aromes || item['Arômes'] === filters.aromes) &&
           (!filters.acidite || item['Acidité'] === filters.acidite) &&
           (!filters.sucrosite || item['Sucrosité'] === filters.sucrosite) &&
           (!filters.corps || item.Corps === filters.corps) &&
           (!filters.bouche || item.Bouche === filters.bouche) &&
           (!filters.divers || item.Divers === filters.divers);
  });

  RESULTATS_RECHERCHE_EN_ATTENTE = filtered;
  changeView('liste');
}

function resetSearch() {
  ['search-classification','search-particularite','search-producteur','search-agent',
   'search-aromes','search-acidite','search-sucrosite','search-corps','search-bouche','search-divers']
  .forEach(function(id) { document.getElementById(id).value = ''; });
}

// ==================== FILTRES ====================

function remplirFiltres(data) {
  const cSel = document.getElementById("filter-couleur");
  const cepSel = document.getElementById("filter-cepage");
  const pSel = document.getElementById("filter-pays");
  const appSel = document.getElementById("filter-appellation");
  const aSel = document.getElementById("filter-accords");
  if (!cSel) return;

  const currentCouleur = cSel.value;
  const currentCepage = cepSel.value;
  const currentPays = pSel.value;
  const currentAppellation = appSel.value;
  const currentAccords = aSel.value;

  const forCouleur = data;
  const forCepage = currentCouleur ? data.filter(function(i) { return i.Couleur === currentCouleur; }) : data;
  const forPays = forCepage.filter(function(i) { return !currentCepage || (i.Cepage && i.Cepage.includes(currentCepage)); });
  const forAppellation = forPays.filter(function(i) { return !currentPays || i.Pays === currentPays; });
  const forAccords = forAppellation.filter(function(i) { return !currentAppellation || i.Appellation === currentAppellation; });

  const sets = { c: new Set(), cep: new Set(), p: new Set(), app: new Set(), a: new Set() };
  forCouleur.forEach(function(i) { if (i.Couleur) sets.c.add(i.Couleur); });
  forCepage.forEach(function(i) { if (i.Cepage) i.Cepage.split(',').forEach(function(c) { sets.cep.add(c.trim()); }); });
  forPays.forEach(function(i) { if (i.Pays) sets.p.add(i.Pays); });
  forAppellation.forEach(function(i) { if (i.Appellation) sets.app.add(i.Appellation); });
  forAccords.forEach(function(i) { if (i.Accords) i.Accords.split(',').forEach(function(a) { sets.a.add(a.trim()); }); });

  const fill = function(el, set, label, currentValue) {
    el.innerHTML = '<option value="">' + label + '</option>';
    Array.from(set).sort().forEach(function(v) {
      el.innerHTML += '<option value="' + v + '" ' + (v === currentValue ? 'selected' : '') + '>' + v.toUpperCase() + '</option>';
    });
  };

  fill(cSel, sets.c, "COULEURS", currentCouleur);
  fill(cepSel, sets.cep, "CÉPAGES", currentCepage);
  fill(pSel, sets.p, "PAYS", currentPays);
  fill(appSel, sets.app, "APPELLATIONS", currentAppellation);
  fill(aSel, sets.a, "ACCORDS", currentAccords);
}

function appliquerFiltres() {
  const c = document.getElementById("filter-couleur").value;
  const cep = document.getElementById("filter-cepage").value;
  const p = document.getElementById("filter-pays").value;
  const app = document.getElementById("filter-appellation").value;
  const a = document.getElementById("filter-accords").value;

  const filtered = ALL_DATA.filter(function(i) {
    return (!c || i.Couleur === c) &&
      (!cep || (i.Cepage && i.Cepage.includes(cep))) &&
      (!p || i.Pays === p) &&
      (!app || i.Appellation === app) &&
      (!a || (i.Accords && i.Accords.includes(a)));
  });

  afficherCartes(filtered);
  remplirFiltres(ALL_DATA);
}

function rechercherParNom() {
  const searchTerm = document.getElementById('filter-nom').value.toLowerCase().trim();
  if (!searchTerm) { appliquerFiltres(); return; }
  const filtered = ALL_DATA.filter(function(item) {
    return (item.Nom || '').toLowerCase().includes(searchTerm);
  });
  afficherCartes(filtered);
}

function reinitialiserFiltres() {
  document.getElementById('filter-couleur').value = '';
  document.getElementById('filter-cepage').value = '';
  document.getElementById('filter-pays').value = '';
  document.getElementById('filter-appellation').value = '';
  document.getElementById('filter-accords').value = '';
  document.getElementById('filter-nom').value = '';
  afficherCartes(ALL_DATA);
  remplirFiltres(ALL_DATA);
}

// ==================== CARTE UNIVERSELLE ====================

function genererCardVin(item, options) {
  options = options || {};

  const cb = (item["Code-barres"] || "").toString().trim().replace(/\s+/g, '');
  const nom = item.Nom || '— Vin sans nom —';
  const pays = item.Pays || '';
  const region = item.Region || '';
  const paysRegion = pays && region ? pays + ' • ' + region : (pays || region);
  const cepage = item.Cepage || '';

  const couleur = (item.Couleur || '').toLowerCase();
  const cClass = couleur.includes('rouge') ? 'rouge' :
                 couleur.includes('blanc') ? 'blanc' :
                 couleur.includes('rose') || couleur.includes('rosé') ? 'rose' :
                 couleur.includes('bulle') || couleur.includes('mousseux') ? 'bulles' : 'rouge';

  const clickable = options.clickable !== false && cb;
  const onclick = clickable ? 'onclick="ouvrirFicheVin(\'' + cb + '\')"' : '';

  let gauche = '<div class="wine-card-left">';
  gauche += '<div class="wine-name">' + nom + (options.avertissement ? ' ⚠️' : '') + '</div>';
  if (paysRegion) gauche += '<div class="wine-sub">' + paysRegion + '</div>';
  if (cepage) gauche += '<div class="wine-cepage">' + cepage + '</div>';

  if (options.mets && options.mets.length > 0) {
    gauche += '<div class="historique-mets">';
    const accordColors = { 1: '#FF4B2B', 2: '#FF9000', 3: '#FFD200', 4: '#8BC34A', 5: '#2ECC71' };
    options.mets.forEach(function(met) {
      const borderColor = accordColors[met.note] || 'rgba(255,255,255,0.2)';
      gauche += '<div class="historique-met-item" style="border-left:3px solid ' + borderColor + ';">';
      gauche += '<span>' + (met.plat || '—') + '</span>';
      gauche += '<span class="historique-met-date">' + met.date + '</span>';
      gauche += '</div>';
    });
    gauche += '</div>';
  }
  gauche += '</div>';

  let droite = '<div class="wine-card-right">';
  if (options.avertissement) {
    droite += '<div class="wine-count color-error">SANS CODE-BARRES</div>';
  } else {
    if (options.count !== undefined) {
      droite += '<div class="wine-count">' + options.count + ' UNITÉ' + (options.count > 1 ? 'S' : '') + '</div>';
    }
    if (options.emplacements && options.emplacements.length > 0) {
      options.emplacements.forEach(function(e) {
        if (e === 'A ranger') {
          droite += '<div class="wine-emplacement-ranger">A ranger</div>';
        } else {
          droite += '<div class="wine-emplacement">' + e + '</div>';
        }
      });
    }
    if (options.badge !== undefined) {
      const badgeClass = options.badgeVert ? 'dispo-badge dispo-badge-oui' : 'dispo-badge dispo-badge-non';
      droite += '<div class="' + badgeClass + '">' + options.badge + '</div>';
    }
  }
  droite += '</div>';

  const avoirDroite = options.count !== undefined || (options.emplacements && options.emplacements.length > 0) || options.badge !== undefined || options.avertissement;
  const opacityStyle = (options.count === 0) ? 'opacity:0.6;' : '';
  return '<div class="wine-card ' + cClass + '" ' + onclick + ' data-codesaq="' + (item['Code SAQ'] || '') + '" style="' + opacityStyle + '">' + gauche + (avoirDroite ? droite : '') + '</div>';
}

// ==================== LISTE PRINCIPALE ====================

function afficherCartes(data) {
  const div = document.getElementById("inventory-cards");
  if (!div) return;
  div.innerHTML = "";

  const grouped = {};
  data.forEach(function(item) {
    const cb = (item["Code-barres"] || "").toString().trim().replace(/\s+/g, '');
    const key = cb !== "" ? cb : "SANS_CB_" + item.Nom + "_" + item.row;
    if (!grouped[key]) {
      grouped[key] = { wine: item, count: 0, hasCodeBarre: cb !== "", emplacements: [] };
    }
    const statut = item.Statut || "En stock";
    if (statut !== "Bu" && statut !== "Sorti") {
      grouped[key].count++;
      const meuble = item.Meuble && item.Meuble.toString().trim() !== "" && item.Meuble.toString().trim() !== "undefined" ? item.Meuble.toString().trim() : "";
      const rangee = item.Rangee && item.Rangee.toString().trim() !== "" && item.Rangee.toString().trim() !== "undefined" ? item.Rangee.toString().trim() : "";
      const espace = item.Espace && item.Espace.toString().trim() !== "" && item.Espace.toString().trim() !== "undefined" ? item.Espace.toString().trim() : "";
      const emplacement = (meuble !== "" && rangee !== "" && espace !== "") ?
        meuble.substring(0, 1).toUpperCase() + '-' + rangee + '-' + espace : 'A ranger';
      grouped[key].emplacements.push(emplacement);
    }
  });

  const sorted = Object.values(grouped).sort(function(a, b) {
    const ordre = { "rouge": 1, "blanc": 2, "rose": 3, "bulles": 4 };
    const valA = ordre[(a.wine.Couleur || "").toLowerCase()] || 99;
    const valB = ordre[(b.wine.Couleur || "").toLowerCase()] || 99;
    return valA !== valB ? valA - valB : a.wine.Nom.localeCompare(b.wine.Nom);
  });

  if (sorted.length === 0) {
    div.innerHTML = "<p class='text-center p-15 color-muted'>Aucun vin en inventaire</p>";
    return;
  }

  sorted.forEach(function(group) {
    if (!group.hasCodeBarre) {
      div.innerHTML += genererCardVin(group.wine, { avertissement: true, clickable: false });
    } else {
      div.innerHTML += genererCardVin(group.wine, { count: group.count, emplacements: group.emplacements });
    }
  });
}

// ==================== LISTE À RANGER ====================

function afficherListeARanger(data) {
  const div = document.getElementById("aranger-list");
  if (!div) return;

  const aRanger = data.filter(function(item) {
    const statut = item.Statut || "En stock";
    return statut !== "Bu" && statut !== "Sorti" && (!item.Meuble || !item.Rangee || !item.Espace);
  });

  if (aRanger.length === 0) {
    div.innerHTML = "<p class='text-center p-15 color-muted'>Tout est bien rangé!</p>";
    return;
  }

  const grouped = {};
  aRanger.forEach(function(item) {
    const cb = (item["Code-barres"] || "").toString().trim();
    if (!grouped[cb]) grouped[cb] = { wine: item, count: 0 };
    grouped[cb].count++;
  });

  const sorted = Object.values(grouped).sort(function(a, b) {
    const ordre = { "rouge": 1, "blanc": 2, "rose": 3, "bulles": 4 };
    const valA = ordre[(a.wine.Couleur || "").toLowerCase()] || 99;
    const valB = ordre[(b.wine.Couleur || "").toLowerCase()] || 99;
    return valA !== valB ? valA - valB : (a.wine.Nom || '').localeCompare(b.wine.Nom || '');
  });

  div.innerHTML = "";
  sorted.forEach(function(group) {
    div.innerHTML += genererCardVin(group.wine, { count: group.count });
  });
}

// ==================== LISTE D'ACHAT ====================

function afficherListeRacheter(data) {
  const div = document.getElementById("racheter-list");
  if (!div) return;

  const grouped = {};
  data.forEach(function(item) {
    const cb = (item["Code-barres"] || "").toString().trim();
    const statut = item.Statut || "En stock";
    const isActive = statut !== "Bu" && statut !== "Sorti";
    if (!grouped[cb]) grouped[cb] = { wine: item, count: 0 };
    if (isActive) grouped[cb].count++;
  });

  const aRacheter = Object.values(grouped).filter(function(g) {
    return (g.wine.Racheter === "Oui" && g.count === 0) || g.wine.Panier === "Oui";
  });

  if (aRacheter.length === 0) {
    div.innerHTML = "<p class='text-center p-15 color-muted'>Aucun vin à racheter</p>";
    return;
  }

  const sorted = aRacheter.sort(function(a, b) {
    const ordre = { "rouge": 1, "blanc": 2, "rose": 3, "bulles": 4 };
    const valA = ordre[(a.wine.Couleur || "").toLowerCase()] || 99;
    const valB = ordre[(b.wine.Couleur || "").toLowerCase()] || 99;
    return valA !== valB ? valA - valB : a.wine.Nom.localeCompare(b.wine.Nom);
  });

  div.innerHTML = "";
  sorted.forEach(function(group) {
    div.innerHTML += genererCardVin(group.wine, { badge: '...', count: group.count > 0 ? group.count : undefined });
  });
}

// ==================== HISTORIQUE ====================

let ALL_HISTORIQUE = [];

function chargerHistorique() {
  appelBackend('getHistorique').then(function(data) {
    ALL_HISTORIQUE = data || [];
    afficherHistorique(ALL_HISTORIQUE);
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function filtrerHistoriqueParPlat() {
  const search = document.getElementById('search-plat').value.toLowerCase();
  if (!search) { afficherHistorique(ALL_HISTORIQUE); return; }
  const filtered = ALL_HISTORIQUE.filter(function(item) {
    return (item.plat || '').toLowerCase().includes(search);
  });
  afficherHistorique(filtered);
}

function reinitialiserRechercheHistorique() {
  document.getElementById('search-plat').value = '';
  afficherHistorique(ALL_HISTORIQUE);
}

function afficherHistorique(data) {
  const div = document.getElementById("historique-list");
  if (!div) return;

  if (!data || data.length === 0) {
    div.innerHTML = "<p class='text-center p-15 color-muted'>Aucun résultat</p>";
    return;
  }

  const grouped = {};
  data.forEach(function(item) {
    const cb = item.codebarre || '';
    if (!grouped[cb]) {
      grouped[cb] = { nom: item.nom, couleur: item.couleur, codebarre: cb, mets: [] };
    }
    grouped[cb].mets.push({ plat: item.plat || '', date: item.date || '', note: parseInt(item.bonAccord) || 0 });
  });

  div.innerHTML = "";
  Object.values(grouped).forEach(function(vin) {
    const fakeItem = { Nom: vin.nom, Couleur: vin.couleur, 'Code-barres': vin.codebarre };
    div.innerHTML += genererCardVin(fakeItem, { mets: vin.mets });
  });
}
