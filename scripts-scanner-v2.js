/* ============================================================
   SCRIPTS-SCANNER-V2.JS
   Refonte du scan — V2 en parallèle de la V1
============================================================ */

let isScanningV2 = false;
let scanConfirmationsV2 = {};
const SCAN_THRESHOLD_V2 = 3;

// Valide le chiffre de contrôle GTIN (EAN-8, UPC-A, EAN-13). Calcul local.
function gtinValide(code) {
  if (!/^\d+$/.test(code)) return false;
  if ([8, 12, 13].indexOf(code.length) === -1) return false;
  var contrôle = parseInt(code.charAt(code.length - 1), 10);
  var somme = 0;
  var poids = 3;
  for (var i = code.length - 2; i >= 0; i--) {
    somme += parseInt(code.charAt(i), 10) * poids;
    poids = (poids === 3) ? 1 : 3;
  }
  var attendu = (10 - (somme % 10)) % 10;
  return attendu === contrôle;
}

function startScanFromHomeV2() {
  startScannerV2();
}
 
function startScannerV2() {
  const container = document.getElementById('scannerV2Container');
  container.style.display = 'flex';
  isScanningV2 = true;
  scanConfirmationsV2 = {};

  Quagga.init({
    numOfWorkers: 0,
    inputStream: {
      name: "Live",
      target: document.getElementById('interactiveV2'),
      type: "LiveStream",
      constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
    },
    locator: { patchSize: "medium", halfSample: true },
    decoder: { readers: ["ean_reader", "code_128_reader", "upc_reader"] }
  }, function(err) {
    if (err) {
      const feedback = document.getElementById('scanV2-feedback');
      if (feedback) { feedback.textContent = 'Caméra indisponible — utilisez l\'entrée manuelle'; }
      return;
    }
    Quagga.start();
  });
  
  Quagga.offDetected();
  Quagga.onDetected(function(result) {
    if (!isScanningV2) return;
    const code = result.codeResult.code;
    if (!code) return;
    if (!gtinValide(code)) return;
    if (!scanConfirmationsV2[code]) scanConfirmationsV2[code] = 0;
    scanConfirmationsV2[code]++;
    const feedback = document.getElementById('scanV2-feedback');
    if (feedback) {
      feedback.textContent = 'Code détecté : ' + code + ' (' + scanConfirmationsV2[code] + '/' + SCAN_THRESHOLD_V2 + ')';
    }
    if (scanConfirmationsV2[code] >= SCAN_THRESHOLD_V2) {
      stopScannerV2();
      traiterResultatScanV2(code);
    }
  });
}

function stopScannerV2() {
  isScanningV2 = false;
  if (typeof Quagga !== 'undefined' && Quagga.stop) {
    try { Quagga.stop(); } catch (e) {}
  }
  document.getElementById('scannerV2Container').style.display = 'none';
  const feedback = document.getElementById('scanV2-feedback');
  if (feedback) {
    feedback.textContent = 'Alignez le code-barres dans le cadre';
  }
}

function rescannerV2() {
  scanConfirmationsV2 = {};
  const feedback = document.getElementById('scanV2-feedback');
  if (feedback) { feedback.textContent = 'Alignez le code-barres dans le cadre'; }
  if (!isScanningV2) { startScannerV2(); }
}

function entreeManuelleV2() {
  stopScannerV2();
  var champ = document.getElementById('saisieManuelleV2-champ');
  if (champ) champ.value = '';
  document.getElementById('saisieManuelleV2Container').style.display = 'flex';
  if (champ) champ.focus();
}

function validerSaisieManuelleV2() {
  var champ = document.getElementById('saisieManuelleV2-champ');
  var code = (champ ? champ.value : '').replace(/\D/g, '').trim();
  if (!gtinValide(code)) {
    afficherMessage('Code-barres invalide');
    return;
  }
  document.getElementById('saisieManuelleV2Container').style.display = 'none';
  traiterResultatScanV2(code);
}

function fermerSaisieManuelleV2() {
  document.getElementById('saisieManuelleV2Container').style.display = 'none';
}

function traiterResultatScanV2(code) {
  appelBackend('checkWineExists', { codebarre: code }, { spinner: 'Vérification' }).then(function(result) {
    if (result.exists) {
      ouvrirMenuActionV2(code, result);
    } else {
      ouvrirVinInconnuV2(code);
    }
  }).catch(function() {
    retourAccueilV2();
  });
}

var vinInconnuV2Code = null;

function ouvrirVinInconnuV2(code) {
  vinInconnuV2Code = code;
  appelBackend('chercherProduitSAQ_GRAPHQL_V1', { codebarre: code }, { spinner: 'Un instant svp' }).then(function(codeSAQ) {
    if (codeSAQ) {
      creerVinSAQV2(code, codeSAQ);
    } else {
      document.getElementById('vinInconnuV2-codebarre-champ').value = code;
      document.getElementById('vinInconnuV2-nom').value = '';
      document.getElementById('vinInconnuV2Container').style.display = 'flex';
    }
  }).catch(function() {
    document.getElementById('vinInconnuV2-codebarre-champ').value = code;
    document.getElementById('vinInconnuV2-nom').value = '';
    document.getElementById('vinInconnuV2Container').style.display = 'flex';
  });
}

function fermerVinInconnuV2() {
  document.getElementById('vinInconnuV2Container').style.display = 'none';
}

function creerVinSAQV2(code, codeSAQ) {
  appelBackend('ajouterVinAvecBouteilles', { codebarre: code, codeSAQ: codeSAQ, note: '', bouteilles: '[]', nom: '' }, { spinner: 'Un instant svp' }).then(function(res) {
    if (res && res.success) {
      enchainerMenuApresCreationV2(code);
    } else {
      retourAccueilV2();
    }
  }).catch(function() {
    retourAccueilV2();
  });
}

function enchainerMenuApresCreationV2(code) {
  appelBackend('checkWineExists', { codebarre: code }, { spinner: '' }).then(function(result) {
    document.getElementById('vinInconnuV2Container').style.display = 'none';
    ouvrirMenuActionV2(code, result);
  }).catch(function() {
    retourAccueilV2();
  });
}

function creerVinManuelV2() {
  var code = vinInconnuV2Code;
  var nom = (document.getElementById('vinInconnuV2-nom').value || '').trim();
  if (!nom) {
    afficherMessage('Entrez un nom');
    return;
  }
  appelBackend('ajouterVinAvecBouteilles', { codebarre: code, codeSAQ: '', note: '', bouteilles: '[]', nom: nom }, { spinner: 'Un instant svp' }).then(function(res) {
    if (res && res.success) {
      enchainerMenuApresCreationV2(code);
    } else {
      retourAccueilV2();
    }
  }).catch(function() {
    retourAccueilV2();
  });
}

let menuActionV2Context = null;

function ouvrirMenuActionV2(code, wineResult) {
  menuActionV2Context = { code: code, wineResult: wineResult };
  const nom = (wineResult && wineResult.wine && wineResult.wine.nom) ? wineResult.wine.nom : 'Vin inconnu';
  document.getElementById('menuActionV2-nom').textContent = decodeHTML(nom);
  document.getElementById('menuActionV2-codebarre').textContent = code;

  var nbActives = (wineResult && typeof wineResult.count === 'number') ? wineResult.count : 0;
  ['menuV2-deplacer', 'menuV2-boire', 'menuV2-donner'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('desactive', nbActives === 0);
  });

  document.getElementById('menuActionV2Overlay').style.display = 'flex';
}

function fermerMenuActionV2() {
  document.getElementById('menuActionV2Overlay').style.display = 'none';
  if (FICHE_V2_ORIGINE && menuActionV2Context) {
    var code = menuActionV2Context.code;
    var origine = FICHE_V2_ORIGINE;
    ouvrirFicheV2(code, origine);
    return;
  }
  menuActionV2Context = null;
}

function retourAccueilV2() {
  ['scannerV2Container', 'saisieManuelleV2Container', 'vinInconnuV2Container', 'menuActionV2Overlay', 'arriveeV2Container', 'deplacerV2Container', 'boireV2Container', 'donnerV2Container', 'caveV2Container', 'editFicheV2Overlay', 'ficheV2Overlay'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  menuActionV2Context = null;
  afficherMessage('Un problème est survenu, veuillez recommencer');
}

function menuV2Click(action) {
  if (action === 'visualiser') {
    const code = menuActionV2Context ? menuActionV2Context.code : CURRENT_WINE_CODEBARRE;
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    setTimeout(function() { ouvrirFicheV2(code, 'menuScan'); }, 0);
    return;
  }
  if (action === 'arrivee') {
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    setTimeout(ouvrirArriveeV2, 0);
    return;
  }
  if (action === 'deplacer') {
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    setTimeout(ouvrirDeplacerV2, 0);
    return;
  }
  var nbActives = (menuActionV2Context && menuActionV2Context.wineResult && typeof menuActionV2Context.wineResult.count === 'number') ? menuActionV2Context.wineResult.count : 0;
  if (nbActives === 0 && (action === 'deplacer' || action === 'boire' || action === 'donner')) {
    afficherMessage('Aucune bouteille en stock');
    return;
  }
  if (action === 'boire') {
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    setTimeout(ouvrirBoireV2, 0);
    return;
  }
  if (action === 'donner') {
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    setTimeout(ouvrirDonnerV2, 0);
    return;
  }
}

var arriveeV2Choix = { meuble: '', rangee: '', espace: '' };

// Espaces occupés d'une rangée donnée (inventaire en mémoire, statut actif)
function espacesOccupesArrivee(meuble, rangee) {
  var occupes = [];
  (ALL_DATA || []).forEach(function(item) {
    var statut = item.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti') return;
    if (String(item.Meuble) === String(meuble) && String(item.Rangee) === String(rangee) && item.Espace) {
      occupes.push(String(item.Espace));
    }
  });
  return occupes;
}

// Une rangée a-t-elle au moins une place libre ?
function rangeeALibre(meuble, rangee) {
  var tous = (CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) ? CONFIG.meubles[meuble][rangee] : [];
  var occ = espacesOccupesArrivee(meuble, rangee);
  return tous.some(function(e) { return occ.indexOf(String(e)) === -1; });
}

// Un meuble a-t-il au moins une place libre ?
function meubleALibre(meuble) {
  var rangees = CONFIG.meubles[meuble] ? Object.keys(CONFIG.meubles[meuble]) : [];
  return rangees.some(function(r) { return rangeeALibre(meuble, r); });
}

function ouvrirArriveeV2() {
  if (!menuActionV2Context) return;
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    if (data) ALL_DATA = data;
    construireArriveeV2();
  }).catch(function() {
    construireArriveeV2();
  });
}

function construireArriveeV2() {
  if (!menuActionV2Context) return;
  arriveeV2Choix = { meuble: '', rangee: '', espace: '' };

  var nom = (menuActionV2Context.wineResult && menuActionV2Context.wineResult.wine && menuActionV2Context.wineResult.wine.nom) ? menuActionV2Context.wineResult.wine.nom : 'Vin';
  document.getElementById('arriveeV2-nom').textContent = decodeHTML(nom);
  document.getElementById('arriveeV2-codebarre').textContent = menuActionV2Context.code;

  var nbActives = (menuActionV2Context.wineResult && typeof menuActionV2Context.wineResult.count === 'number') ? menuActionV2Context.wineResult.count : 0;
  if (nbActives >= 5) {
    afficherMessage('Maximum atteint (5 bouteilles)');
    document.getElementById('arriveeV2Container').style.display = 'none';
    if (menuActionV2Context) ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
    return;
  }

  document.getElementById('arriveeV2-meuble-barre').textContent = 'Meuble';
  document.getElementById('arriveeV2-rangee-barre').textContent = 'Rangée';
  document.getElementById('arriveeV2-espace-barre').textContent = 'Espace';

  var menuMeuble = document.getElementById('arriveeV2-meuble-menu');
  var meubles = (CONFIG && CONFIG.meubles) ? Object.keys(CONFIG.meubles) : [];
  meubles = meubles.filter(function(m) { return meubleALibre(m); });
  meubles.sort(function(a, b) { return a.localeCompare(b); });
  menuMeuble.innerHTML = meubles.map(function(m) {
    return '<div class="item-liste" onclick="choisirMeubleArrivee(\'' + m + '\')">' + m + '</div>';
  }).join('');
  menuMeuble.classList.remove('ouvert');
  document.getElementById('arriveeV2-rangee-menu').innerHTML = '';
  document.getElementById('arriveeV2-rangee-menu').classList.remove('ouvert');
  document.getElementById('arriveeV2-espace-menu').innerHTML = '';
  document.getElementById('arriveeV2-espace-menu').classList.remove('ouvert');

  document.getElementById('arriveeV2Container').style.display = 'flex';
}

function fermerArriveeV2() {
  document.getElementById('arriveeV2Container').style.display = 'none';
  if (menuActionV2Context) {
    ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
  }
}

function basculerListeArrivee(type) {
  ['meuble', 'rangee', 'espace'].forEach(function(t) {
    var menu = document.getElementById('arriveeV2-' + t + '-menu');
    if (t === type) {
      menu.classList.toggle('ouvert');
    } else {
      menu.classList.remove('ouvert');
    }
  });
}

function choisirMeubleArrivee(meuble) {
  arriveeV2Choix.meuble = meuble;
  arriveeV2Choix.rangee = '';
  arriveeV2Choix.espace = '';
  document.getElementById('arriveeV2-meuble-barre').textContent = meuble;
  document.getElementById('arriveeV2-meuble-menu').classList.remove('ouvert');
  document.getElementById('arriveeV2-rangee-barre').textContent = 'Rangée';
  document.getElementById('arriveeV2-espace-barre').textContent = 'Espace';

  var rangees = (CONFIG.meubles[meuble]) ? Object.keys(CONFIG.meubles[meuble]) : [];
  rangees = rangees.filter(function(r) { return rangeeALibre(meuble, r); });
  rangees.sort(function(a, b) { return parseInt(a) - parseInt(b); });
  document.getElementById('arriveeV2-rangee-menu').innerHTML = rangees.map(function(r) {
    return '<div class="item-liste" onclick="choisirRangeeArrivee(\'' + r + '\')">' + r + '</div>';
  }).join('');
  document.getElementById('arriveeV2-espace-menu').innerHTML = '';
}

function choisirRangeeArrivee(rangee) {
  arriveeV2Choix.rangee = rangee;
  arriveeV2Choix.espace = '';
  document.getElementById('arriveeV2-rangee-barre').textContent = rangee;
  document.getElementById('arriveeV2-rangee-menu').classList.remove('ouvert');
  document.getElementById('arriveeV2-espace-barre').textContent = 'Espace';

  var meuble = arriveeV2Choix.meuble;
  var espaces = (CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) ? CONFIG.meubles[meuble][rangee] : [];
  var occ = espacesOccupesArrivee(meuble, rangee);
  espaces = espaces.filter(function(e) { return occ.indexOf(String(e)) === -1; });
  espaces.sort(function(a, b) { return parseInt(a) - parseInt(b); });
  document.getElementById('arriveeV2-espace-menu').innerHTML = espaces.map(function(e) {
    return '<div class="item-liste" onclick="choisirEspaceArrivee(\'' + e + '\')">' + e + '</div>';
  }).join('');
}

function choisirEspaceArrivee(espace) {
  arriveeV2Choix.espace = espace;
  document.getElementById('arriveeV2-espace-barre').textContent = espace;
  document.getElementById('arriveeV2-espace-menu').classList.remove('ouvert');

  var c = arriveeV2Choix;
  appelBackend('checkLocationAvailable', { meuble: c.meuble, rangee: c.rangee, espace: c.espace }, { spinner: 'Vérification' }).then(function(result) {
    if (!result.available) {
      afficherMessage('Occupé par : ' + result.message);
      return appelBackend('getInventoryData', {}).then(function(data) {
        if (data) ALL_DATA = data;
        arriveeV2Choix.espace = '';
        document.getElementById('arriveeV2-espace-barre').textContent = 'Espace';
        var occ = espacesOccupesArrivee(c.meuble, c.rangee);
        var espaces = (CONFIG.meubles[c.meuble] && CONFIG.meubles[c.meuble][c.rangee]) ? CONFIG.meubles[c.meuble][c.rangee] : [];
        espaces = espaces.filter(function(e) { return occ.indexOf(String(e)) === -1; });
        espaces.sort(function(a, b) { return parseInt(a) - parseInt(b); });
        var menu = document.getElementById('arriveeV2-espace-menu');
        menu.innerHTML = espaces.map(function(e) {
          return '<div class="item-liste" onclick="choisirEspaceArrivee(\'' + e + '\')">' + e + '</div>';
        }).join('');
        menu.classList.add('ouvert');
      });
    }
    ajouterBouteilleArrivee(c.meuble, c.rangee, c.espace);
  }).catch(function(err) {
    afficherMessage('Erreur : ' + err);
  });
}

function arriveeARangerV2() {
  ajouterBouteilleArrivee('', '', '');
}

// ==================== DÉPLACER V2 ====================
var deplacerV2Choix = { row: 0, bottle: 0, meuble: '', rangee: '', espace: '' };

function ouvrirDeplacerV2() {
  if (!menuActionV2Context) return;
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    if (data) ALL_DATA = data;
    construireDeplacerV2();
  }).catch(function() {
    construireDeplacerV2();
  });
}

function construireDeplacerV2() {
  if (!menuActionV2Context) return;
  deplacerV2Choix = { row: 0, bottle: 0, meuble: '', rangee: '', espace: '' };

  var nom = (menuActionV2Context.wineResult && menuActionV2Context.wineResult.wine && menuActionV2Context.wineResult.wine.nom) ? menuActionV2Context.wineResult.wine.nom : 'Vin';
  document.getElementById('deplacerV2-nom').textContent = decodeHTML(nom);
  document.getElementById('deplacerV2-codebarre').textContent = menuActionV2Context.code;

  document.getElementById('deplacerV2-meuble-barre').textContent = 'Meuble';
  document.getElementById('deplacerV2-rangee-barre').textContent = 'Rangée';
  document.getElementById('deplacerV2-espace-barre').textContent = 'Espace';
  document.getElementById('deplacerV2-meuble-menu').innerHTML = '';
  document.getElementById('deplacerV2-rangee-menu').innerHTML = '';
  document.getElementById('deplacerV2-espace-menu').innerHTML = '';

  var bottles = (menuActionV2Context.wineResult && menuActionV2Context.wineResult.bottles) ? menuActionV2Context.wineResult.bottles : [];

  if (bottles.length === 1) {
    deplacerV2Choix.row = bottles[0].row;
    deplacerV2Choix.bottle = bottles[0].bottle;
    document.getElementById('deplacerV2-choix-bouteille').style.display = 'none';
    document.getElementById('deplacerV2-destination').style.display = 'block';
    construireMeublesDeplacer();
  } else {
    var menu = document.getElementById('deplacerV2-bouteille-menu');
    menu.innerHTML = bottles.map(function(b) {
      var emp = (b.meuble && b.rangee && b.espace) ? (b.meuble + '-' + b.rangee + '-' + b.espace) : 'À ranger';
      return '<div class="item-liste" onclick="choisirBouteilleDeplacer(' + b.row + ',' + b.bottle + ')">' + emp + '</div>';
    }).join('');
    document.getElementById('deplacerV2-choix-bouteille').style.display = 'block';
    document.getElementById('deplacerV2-destination').style.display = 'none';
  }

  document.getElementById('deplacerV2Container').style.display = 'flex';
}

function choisirBouteilleDeplacer(row, bottle) {
  deplacerV2Choix.row = row;
  deplacerV2Choix.bottle = bottle;
  document.getElementById('deplacerV2-choix-bouteille').style.display = 'none';
  document.getElementById('deplacerV2-destination').style.display = 'block';
  construireMeublesDeplacer();
}

function construireMeublesDeplacer() {
  var meubles = (CONFIG && CONFIG.meubles) ? Object.keys(CONFIG.meubles) : [];
  meubles = meubles.filter(function(m) { return meubleALibre(m); });
  meubles.sort(function(a, b) { return a.localeCompare(b); });
  document.getElementById('deplacerV2-meuble-menu').innerHTML = meubles.map(function(m) {
    return '<div class="item-liste" onclick="choisirMeubleDeplacer(\'' + m + '\')">' + m + '</div>';
  }).join('');
}

function basculerListeDeplacer(type) {
  ['meuble', 'rangee', 'espace'].forEach(function(t) {
    var menu = document.getElementById('deplacerV2-' + t + '-menu');
    if (t === type) { menu.classList.toggle('ouvert'); }
    else { menu.classList.remove('ouvert'); }
  });
}

function choisirMeubleDeplacer(meuble) {
  deplacerV2Choix.meuble = meuble;
  deplacerV2Choix.rangee = '';
  deplacerV2Choix.espace = '';
  document.getElementById('deplacerV2-meuble-barre').textContent = meuble;
  document.getElementById('deplacerV2-meuble-menu').classList.remove('ouvert');
  document.getElementById('deplacerV2-rangee-barre').textContent = 'Rangée';
  document.getElementById('deplacerV2-espace-barre').textContent = 'Espace';
  document.getElementById('deplacerV2-espace-menu').innerHTML = '';

  var rangees = (CONFIG.meubles[meuble]) ? Object.keys(CONFIG.meubles[meuble]) : [];
  rangees = rangees.filter(function(r) { return rangeeALibre(meuble, r); });
  rangees.sort(function(a, b) { return parseInt(a) - parseInt(b); });
  document.getElementById('deplacerV2-rangee-menu').innerHTML = rangees.map(function(r) {
    return '<div class="item-liste" onclick="choisirRangeeDeplacer(\'' + r + '\')">' + r + '</div>';
  }).join('');
}

function choisirRangeeDeplacer(rangee) {
  deplacerV2Choix.rangee = rangee;
  deplacerV2Choix.espace = '';
  document.getElementById('deplacerV2-rangee-barre').textContent = rangee;
  document.getElementById('deplacerV2-rangee-menu').classList.remove('ouvert');
  document.getElementById('deplacerV2-espace-barre').textContent = 'Espace';

  var meuble = deplacerV2Choix.meuble;
  var espaces = (CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) ? CONFIG.meubles[meuble][rangee] : [];
  var occ = espacesOccupesArrivee(meuble, rangee);
  espaces = espaces.filter(function(e) { return occ.indexOf(String(e)) === -1; });
  espaces.sort(function(a, b) { return parseInt(a) - parseInt(b); });
  document.getElementById('deplacerV2-espace-menu').innerHTML = espaces.map(function(e) {
    return '<div class="item-liste" onclick="choisirEspaceDeplacer(\'' + e + '\')">' + e + '</div>';
  }).join('');
}

function choisirEspaceDeplacer(espace) {
  deplacerV2Choix.espace = espace;
  document.getElementById('deplacerV2-espace-barre').textContent = espace;
  document.getElementById('deplacerV2-espace-menu').classList.remove('ouvert');

  var c = deplacerV2Choix;
  appelBackend('checkLocationAvailable', { meuble: c.meuble, rangee: c.rangee, espace: c.espace }, { spinner: 'Vérification' }).then(function(result) {
    if (!result.available) {
      afficherMessage('Occupé par : ' + result.message);
      return appelBackend('getInventoryData', {}).then(function(data) {
        if (data) ALL_DATA = data;
        c.espace = '';
        document.getElementById('deplacerV2-espace-barre').textContent = 'Espace';
        var espaces = (CONFIG.meubles[c.meuble] && CONFIG.meubles[c.meuble][c.rangee]) ? CONFIG.meubles[c.meuble][c.rangee] : [];
        var occ = espacesOccupesArrivee(c.meuble, c.rangee);
        espaces = espaces.filter(function(e) { return occ.indexOf(String(e)) === -1; });
        espaces.sort(function(a, b) { return parseInt(a) - parseInt(b); });
        var menu = document.getElementById('deplacerV2-espace-menu');
        menu.innerHTML = espaces.map(function(e) {
          return '<div class="item-liste" onclick="choisirEspaceDeplacer(\'' + e + '\')">' + e + '</div>';
        }).join('');
        menu.classList.add('ouvert');
      });
    }
  appelBackend('actionBouteille', { row: c.row, action: 'deplacer', bottle: c.bottle, meuble: c.meuble, rangee: c.rangee, espace: c.espace }, { spinner: 'Déplacement' }).then(function() {
      afficherMessage('Bouteille déplacée');
      return appelBackend('getInventoryData', {}).then(function(data) {
        if (data) ALL_DATA = data;
        return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code }).then(function(result) {
          if (result) menuActionV2Context.wineResult = result;
          fermerDeplacerV2();
        });
      });
    }).catch(function() {
      retourAccueilV2();
    });
  }).catch(function() {
    retourAccueilV2();
  });
}

function fermerDeplacerV2() {
  document.getElementById('deplacerV2Container').style.display = 'none';
  if (menuActionV2Context && menuActionV2Context.retour === 'aranger') {
    menuActionV2Context = null;
    ouvrirARangerV2();
    return;
  }
  if (menuActionV2Context && menuActionV2Context.retour === 'emplacements') {
    menuActionV2Context = null;
    ouvrirEmpV2();
    return;
  }
  if (menuActionV2Context) {
    ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
  }
}

// ==================== BOIRE / DONNER V2 (commun) ====================
var actionV2Choix = { row: 0, bottle: 0, note: 0 };

function bottlesActivesV2() {
  var r = menuActionV2Context && menuActionV2Context.wineResult;
  var bottles = (r && r.bottles) ? r.bottles : [];
  return bottles.filter(function(b) { return b.statut !== 'Bu' && b.statut !== 'Sorti'; });
}

function empBouteilleV2(b) {
  return (b.meuble && b.rangee && b.espace) ? (b.meuble + '-' + b.rangee + '-' + b.espace) : 'À ranger';
}

function rendreEnteteActionV2(prefixe) {
  var r = menuActionV2Context.wineResult;
  var nom = (r && r.wine && r.wine.nom) ? r.wine.nom : 'Vin';
  document.getElementById(prefixe + 'V2-nom').textContent = decodeHTML(nom);
  document.getElementById(prefixe + 'V2-codebarre').textContent = menuActionV2Context.code;
}

// ---------- BOIRE ----------
function ouvrirBoireV2() {
  if (!menuActionV2Context) return;
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    if (data) ALL_DATA = data;
    return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code });
  }).then(function(result) {
    if (result) menuActionV2Context.wineResult = result;
    construireBoireV2();
  }).catch(function() { retourAccueilV2(); });
}

function construireBoireV2() {
  actionV2Choix = { row: menuActionV2Context.wineResult.row, bottle: 0, note: 0 };
  rendreEnteteActionV2('boire');
  document.getElementById('boireV2-plat').value = '';
  document.getElementById('boireV2-accords-menu').classList.remove('ouvert');

  var actives = bottlesActivesV2();
  if (actives.length === 1) {
    actionV2Choix.bottle = actives[0].bottle;
    document.getElementById('boireV2-choix-bouteille').style.display = 'none';
    document.getElementById('boireV2-form').style.display = 'block';
    construireFormBoireV2();
  } else {
    document.getElementById('boireV2-bouteille-menu').innerHTML = actives.map(function(b) {
      return '<div class="item-liste" onclick="choisirBouteilleBoireV2(' + b.bottle + ')">' + empBouteilleV2(b) + '</div>';
    }).join('');
    document.getElementById('boireV2-choix-bouteille').style.display = 'block';
    document.getElementById('boireV2-form').style.display = 'none';
  }
  document.getElementById('boireV2Container').style.display = 'flex';
}

function choisirBouteilleBoireV2(bottle) {
  actionV2Choix.bottle = bottle;
  document.getElementById('boireV2-choix-bouteille').style.display = 'none';
  document.getElementById('boireV2-form').style.display = 'block';
  construireFormBoireV2();
}

function construireFormBoireV2() {
  var v = document.getElementById('boireV2-verres');
  v.classList.add('desactive');
  v.innerHTML = '';
  for (var i = 1; i <= 5; i++) {
    v.innerHTML += '<span class="boire-verre" data-note="' + i + '" onclick="choisirNoteBoireV2(' + i + ')">🍷</span>';
  }
  var accordsActuels = (menuActionV2Context.wineResult.wine.accords || '').split(',').map(function(a) { return a.trim(); }).filter(Boolean);
  document.getElementById('boireV2-accords-menu').innerHTML = (CONFIG && CONFIG.accords ? CONFIG.accords : []).map(function(acc) {
    var sel = accordsActuels.indexOf(acc) !== -1;
    return '<div class="item-liste' + (sel ? ' actif' : '') + '" onclick="toggleAccordBoireV2(this)" data-accord="' + acc + '">' + acc + '</div>';
  }).join('');
  majAccordsDisplayBoireV2();
}

function toggleAccordBoireV2(el) {
  el.classList.toggle('actif');
  majAccordsDisplayBoireV2();
}

function majAccordsDisplayBoireV2() {
  var sel = Array.prototype.map.call(document.querySelectorAll('#boireV2-accords-menu .item-liste.actif'), function(el) { return el.getAttribute('data-accord'); });
  var disp = document.getElementById('boireV2-accords-display');
  if (disp) disp.textContent = sel.length ? sel.join(', ') : 'Accords';
}

function boireV2PlatChange() {
  var plat = document.getElementById('boireV2-plat').value.trim();
  document.getElementById('boireV2-verres').classList.toggle('desactive', plat === '');
}

function choisirNoteBoireV2(note) {
  if (document.getElementById('boireV2-plat').value.trim() === '') return;
  actionV2Choix.note = note;
  Array.prototype.forEach.call(document.querySelectorAll('#boireV2-verres .boire-verre'), function(el) {
    el.classList.toggle('allume', parseInt(el.getAttribute('data-note')) <= note);
  });
}

function basculerMenuAccordsBoireV2() {
  document.getElementById('boireV2-accords-menu').classList.toggle('ouvert');
}

function confirmerBoireV2() {
  var plat = document.getElementById('boireV2-plat').value.trim();
  if (plat !== '' && actionV2Choix.note === 0) { afficherMessage('Choisissez une appréciation'); return; }
  var accords = Array.prototype.map.call(document.querySelectorAll('#boireV2-accords-menu .item-liste.actif'), function(el) { return el.getAttribute('data-accord'); });
  appelBackend('actionBouteille', { row: actionV2Choix.row, action: 'boire', bottle: actionV2Choix.bottle, plat: plat, bonAccord: actionV2Choix.note }, { spinner: 'Santé !' }).then(function() {
    if (accords.length) {
      return appelBackend('updateWineField', { codebarre: menuActionV2Context.code, field: 'Accords', value: accords.join(', ') });
    }
  }).then(function() {
    return appelBackend('getInventoryData', {});
  }).then(function(data) {
    if (data) ALL_DATA = data;
    return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code });
  }).then(function(result) {
    if (result) menuActionV2Context.wineResult = result;
    document.getElementById('boireV2Container').style.display = 'none';
    menuActionV2Context = null;
    afficherMessage('Santé !');
  }).catch(function() { retourAccueilV2(); });
}

function fermerBoireV2() {
  document.getElementById('boireV2Container').style.display = 'none';
  var actives = bottlesActivesV2();
  if (actives.length > 1 && document.getElementById('boireV2-form').style.display === 'block') {
    document.getElementById('boireV2-form').style.display = 'none';
    document.getElementById('boireV2-choix-bouteille').style.display = 'block';
    document.getElementById('boireV2Container').style.display = 'flex';
    return;
  }
  if (menuActionV2Context) ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
}

// ---------- DONNER ----------
function ouvrirDonnerV2() {
  if (!menuActionV2Context) return;
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    if (data) ALL_DATA = data;
    return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code });
  }).then(function(result) {
    if (result) menuActionV2Context.wineResult = result;
    construireDonnerV2();
  }).catch(function() { retourAccueilV2(); });
}

function construireDonnerV2() {
  actionV2Choix = { row: menuActionV2Context.wineResult.row, bottle: 0, note: 0 };
  rendreEnteteActionV2('donner');

  var actives = bottlesActivesV2();
  if (actives.length === 1) {
    actionV2Choix.bottle = actives[0].bottle;
    document.getElementById('donnerV2-choix-bouteille').style.display = 'none';
    document.getElementById('donnerV2-form').style.display = 'block';
  } else {
    document.getElementById('donnerV2-bouteille-menu').innerHTML = actives.map(function(b) {
      return '<div class="item-liste" onclick="choisirBouteilleDonnerV2(' + b.bottle + ')">' + empBouteilleV2(b) + '</div>';
    }).join('');
    document.getElementById('donnerV2-choix-bouteille').style.display = 'block';
    document.getElementById('donnerV2-form').style.display = 'none';
  }
  document.getElementById('donnerV2Container').style.display = 'flex';
}

function choisirBouteilleDonnerV2(bottle) {
  actionV2Choix.bottle = bottle;
  document.getElementById('donnerV2-choix-bouteille').style.display = 'none';
  document.getElementById('donnerV2-form').style.display = 'block';
}

function confirmerDonnerV2() {
  appelBackend('actionBouteille', { row: actionV2Choix.row, action: 'donner', bottle: actionV2Choix.bottle }, { spinner: 'Don' }).then(function() {
    return appelBackend('getInventoryData', {});
  }).then(function(data) {
    if (data) ALL_DATA = data;
    return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code });
  }).then(function(result) {
    if (result) menuActionV2Context.wineResult = result;
    document.getElementById('donnerV2Container').style.display = 'none';
    menuActionV2Context = null;
    afficherMessage('Bouteille donnée');
  }).catch(function() { retourAccueilV2(); });
}

function fermerDonnerV2() {
  document.getElementById('donnerV2Container').style.display = 'none';
  var actives = bottlesActivesV2();
  if (actives.length > 1 && document.getElementById('donnerV2-form').style.display === 'block') {
    document.getElementById('donnerV2-form').style.display = 'none';
    document.getElementById('donnerV2-choix-bouteille').style.display = 'block';
    document.getElementById('donnerV2Container').style.display = 'flex';
    return;
  }
  if (menuActionV2Context) ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
}

// ==================== CAVE À VIN V2 ====================
function ouvrirCaveV2() {
  document.getElementById('caveV2Container').style.display = 'flex';
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    ALL_DATA = data || [];
    remplirFiltresCaveV2();
    afficherCartesCaveV2(ALL_DATA);
  }).catch(function() { retourAccueilV2(); });
}

function fermerCaveV2() {
  fermerFiltresCaveV2();
  document.getElementById('caveV2Container').style.display = 'none';
}

// ==================== À RANGER V2 ====================
function ouvrirARangerV2() {
  document.getElementById('aRangerV2Container').style.display = 'flex';
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    ALL_DATA = data || [];
    afficherCartesARangerV2();
  }).catch(function() { retourAccueilV2(); });
}

function fermerARangerV2() {
  document.getElementById('aRangerV2Container').style.display = 'none';
}

function afficherCartesARangerV2() {
  var aRanger = (ALL_DATA || []).filter(function(i) {
    var statut = i.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti') return false;
    return !(i.Meuble && i.Rangee && i.Espace);
  });
  var div = document.getElementById('aRangerV2-cartes');
  var groups = grouperVinsV2(aRanger);
  document.getElementById('aRangerV2-compte').textContent = groups.length + ' vin' + (groups.length > 1 ? 's' : '');
  if (groups.length === 0) { div.innerHTML = '<div class="texte-secondaire">Tout est bien rangé!</div>'; return; }
  div.innerHTML = groups.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var pays = w.Pays || '';
    var region = w.Region || '';
    var paysRegion = (pays && region) ? (pays + ' • ' + region) : (pays || region);
    var cepage = w.Cepage || '';
    var sous = [paysRegion, cepage].filter(Boolean).join('<br>');
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="deplacerDepuisARangerV2(\'' + g.cb + '\')"' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + g.count + ' btl</div></div>';
  }).join('');
}

function deplacerDepuisARangerV2(code) {
  appelBackend('checkWineExists', { codebarre: code }, { spinner: ' ' }).then(function(result) {
    if (!result || !result.exists) { afficherMessage('Vin introuvable'); return; }
    document.getElementById('aRangerV2Container').style.display = 'none';
    menuActionV2Context = { code: code, wineResult: result, retour: 'aranger' };
    ouvrirApresTap(ouvrirDeplacerV2);
  }).catch(function() { retourAccueilV2(); });
}

// ==================== LISTE D'ACHAT V2 ====================
var filtresAchatV2 = { couleur: '', pays: '', cepage: '', succ: '' };
var libellesFiltreAchatV2 = { couleur: 'Couleurs', pays: 'Pays', cepage: 'Cépages', succ: 'Succursale' };
var succursalesAchatV2 = [];

function ouvrirAchatV2() {
  document.getElementById('achatV2Container').style.display = 'flex';
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    ALL_DATA = data || [];
    return appelBackend('getSuccursales', {});
  }).then(function(succ) {
    succursalesAchatV2 = succ || [];
    remplirFiltresAchatV2();
    appliquerFiltresAchatV2();
  }).catch(function() { retourAccueilV2(); });
}

function fermerAchatV2() {
  fermerFiltresAchatV2();
  document.getElementById('achatV2Container').style.display = 'none';
}

function baseAchatV2() {
  var grouped = {};
  (ALL_DATA || []).forEach(function(item) {
    var cb = (item['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var key = cleVinV2(item);
    if (!grouped[key]) grouped[key] = { wine: item, cb: cb, count: 0 };
    var statut = item.Statut || 'En stock';
    if (statut !== 'Bu' && statut !== 'Sorti') grouped[key].count++;
  });
  return Object.values(grouped).filter(function(g) {
    var racheter = (g.wine.Racheter || '') === 'Oui';
    var panier = (g.wine.Panier || '') === 'Oui';
    return (racheter && g.count === 0) || panier;
  }).map(function(g) { return g.wine; });
}

function remplirFiltresAchatV2() {
  var f = filtresAchatV2;
  var base = baseAchatV2();
  var forCouleur = base;
  var forPays = f.couleur ? base.filter(function(i){ return i.Couleur === f.couleur; }) : base;
  var forCepage = base.filter(function(i){
    return (!f.couleur || i.Couleur === f.couleur) && (!f.pays || i.Pays === f.pays);
  });

  var listes = {
    couleur: uniqueValeursAchat(forCouleur, 'Couleur'),
    pays: uniqueValeursAchat(forPays, 'Pays'),
    cepage: uniqueValeursAchat(forCepage, 'Cepage')
  };

  ['couleur','pays','cepage'].forEach(function(cle){
    var cur = f[cle];
    var menu = document.getElementById('achatV2-f-' + cle + '-menu');
    menu.innerHTML = listes[cle].map(function(v){
      return '<div class="item-liste' + (v === cur ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('achatV2-f-' + cle + '-display');
    if (disp) disp.textContent = cur === '' ? libellesFiltreAchatV2[cle] : cur;
  });

  var menuSucc = document.getElementById('achatV2-f-succ-menu');
  menuSucc.innerHTML = succursalesAchatV2.map(function(s){
    return '<div class="item-liste' + (s.numero === f.succ ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'succ\', \'' + s.numero + '\')">' + s.nom + '</div>';
  }).join('');
  var dispSucc = document.getElementById('achatV2-f-succ-display');
  if (dispSucc) {
    var sel = succursalesAchatV2.filter(function(s){ return s.numero === f.succ; })[0];
    dispSucc.textContent = sel ? sel.nom : libellesFiltreAchatV2.succ;
  }
}

function uniqueValeursAchat(liste, champ) {
  var vues = {};
  var out = [];
  liste.forEach(function(i){
    var v = (i[champ] || '').toString().trim();
    if (v && !vues[v]) { vues[v] = true; out.push(v); }
  });
  out.sort(function(a, b){ return a.localeCompare(b); });
  return out;
}

function basculerFiltreAchatV2(cle) {
  var menu = document.getElementById('achatV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['couleur','pays','cepage','succ'].forEach(function(k){
    document.getElementById('achatV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreAchatV2(cle, valeur) {
  filtresAchatV2[cle] = valeur;
  document.getElementById('achatV2-f-' + cle + '-menu').classList.remove('ouvert');
  if (cle === 'couleur') { filtresAchatV2.pays = ''; filtresAchatV2.cepage = ''; }
  if (cle === 'pays') { filtresAchatV2.cepage = ''; }
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
}

function reinitialiserFiltresAchatV2() {
  filtresAchatV2 = { couleur: '', pays: '', cepage: '', succ: '' };
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
  fermerFiltresAchatV2();
}

function ouvrirFiltresAchatV2() {
  document.getElementById('achatV2-filtres-voile').classList.add('ouvert');
  document.getElementById('achatV2-filtres').classList.add('ouvert');
}
function fermerFiltresAchatV2() {
  document.getElementById('achatV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('achatV2-filtres').classList.remove('ouvert');
}

function appliquerFiltresAchatV2() {
  var f = filtresAchatV2;
  var filtered = baseAchatV2().filter(function(i){
    return (!f.couleur || i.Couleur === f.couleur) &&
      (!f.pays || i.Pays === f.pays) &&
      (!f.cepage || (i.Cepage && i.Cepage.indexOf(f.cepage) !== -1));
  });
  afficherCartesAchatV2(filtered);
  var loupe = document.getElementById('achatV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(f.couleur || f.pays || f.cepage || f.succ));
}

function afficherCartesAchatV2(liste) {
  var ordre = { rouge: 1, blanc: 2, rose: 3, bulles: 4 };
  liste.sort(function(a, b){
    var va = ordre[(a.Couleur || '').toLowerCase()] || 99;
    var vb = ordre[(b.Couleur || '').toLowerCase()] || 99;
    return va !== vb ? va - vb : (a.Nom || '').localeCompare(b.Nom || '');
  });
  var div = document.getElementById('achatV2-cartes');
  document.getElementById('achatV2-compte').textContent = liste.length + ' vin' + (liste.length > 1 ? 's' : '');
  if (liste.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucun vin à acheter</div>'; return; }
  div.innerHTML = liste.map(function(w){
    var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var nom = decodeHTML(w.Nom || '—');
    var pays = w.Pays || '';
    var region = w.Region || '';
    var paysRegion = (pays && region) ? (pays + ' • ' + region) : (pays || region);
    var cepage = w.Cepage || '';
    var sous = [paysRegion, cepage].filter(Boolean).join('<br>');
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + cb + '\', \'achat\')})"' : '';
    var dispoId = w['Code SAQ'] ? ' id="achatV2-dispo-' + w['Code SAQ'] + '"' : '';
    var dispo = (filtresAchatV2.succ && w['Code SAQ']) ? '<br><span class="texte-secondaire"' + dispoId + '>…</span>' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + (w.Prix ? w.Prix + ' $' : '') + dispo + '</div></div>';
  }).join('');

  if (filtresAchatV2.succ) chargerDispoAchatV2(liste);
}

function chargerDispoAchatV2(liste) {
  var succ = filtresAchatV2.succ;
  liste.forEach(function(w){
    var codeSAQ = w['Code SAQ'];
    if (!codeSAQ) return;
    appelBackend('verifierDispoSAQ_GRAPHQL_V1', { codeSAQ: codeSAQ, succursale: succ }, { spinner: '' }).then(function(res){
      var el = document.getElementById('achatV2-dispo-' + codeSAQ);
      if (!el) return;
      if (res && res.disponible) {
        el.textContent = (res.quantite != null ? res.quantite + ' en stock' : 'Disponible');
      } else {
        el.textContent = 'Non dispo';
      }
    }).catch(function(){
      var el = document.getElementById('achatV2-dispo-' + codeSAQ);
      if (el) el.textContent = '—';
    });
  });
}

// ==================== EMPLACEMENTS V2 ====================
var filtresEmpV2 = { meuble: '', rangee: '', espace: '' };

function ouvrirEmpV2() {
  document.getElementById('empV2Container').style.display = 'flex';
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    ALL_DATA = data || [];
    filtresEmpV2 = { meuble: '', rangee: '', espace: '' };
    remplirFiltresEmpV2();
    afficherEmpV2();
  }).catch(function() { retourAccueilV2(); });
}

function fermerEmpV2() {
  fermerFiltresEmpV2();
  document.getElementById('empV2Container').style.display = 'none';
}

function ouvrirFiltresEmpV2() {
  document.getElementById('empV2-filtres-voile').classList.add('ouvert');
  document.getElementById('empV2-filtres').classList.add('ouvert');
}
function fermerFiltresEmpV2() {
  document.getElementById('empV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('empV2-filtres').classList.remove('ouvert');
}

// Bouteilles rangées (statut actif + emplacement complet)
function bouteillesRangeesEmpV2() {
  return (ALL_DATA || []).filter(function(i){
    var statut = i.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti') return false;
    return !!(i.Meuble && i.Rangee && i.Espace);
  });
}

function remplirFiltresEmpV2() {
  var f = filtresEmpV2;
  var base = bouteillesRangeesEmpV2();

  var meubles = uniqueValeursAchat(base, 'Meuble');
  var forRangee = f.meuble ? base.filter(function(i){ return String(i.Meuble) === String(f.meuble); }) : base;
  var rangees = uniqueValeursAchat(forRangee, 'Rangee');
  var forEspace = base.filter(function(i){
    return (!f.meuble || String(i.Meuble) === String(f.meuble)) && (!f.rangee || String(i.Rangee) === String(f.rangee));
  });
  var espaces = uniqueValeursAchat(forEspace, 'Espace');

  var listes = { meuble: meubles, rangee: rangees, espace: espaces };
  ['meuble','rangee','espace'].forEach(function(cle){
    var cur = f[cle];
    var menu = document.getElementById('empV2-f-' + cle + '-menu');
    menu.innerHTML = listes[cle].map(function(v){
      return '<div class="item-liste' + (String(v) === String(cur) ? ' actif' : '') + '" onclick="choisirFiltreEmpV2(\'' + cle + '\', \'' + String(v).replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('empV2-f-' + cle + '-display');
    if (disp) disp.textContent = cur === '' ? ({meuble:'Meuble',rangee:'Rangée',espace:'Espace'})[cle] : cur;
  });

  // Boutons cépages : visibles seulement si un meuble est choisi
  document.getElementById('empV2-btn-cepdoubles').style.display = f.meuble ? 'flex' : 'none';
  document.getElementById('empV2-btn-cepmanquants').style.display = f.meuble ? 'flex' : 'none';

  // Loupe : OR si un filtre actif
  var loupe = document.getElementById('empV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(f.meuble || f.rangee || f.espace));
}

function basculerFiltreEmpV2(cle) {
  var menu = document.getElementById('empV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['meuble','rangee','espace'].forEach(function(k){
    document.getElementById('empV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreEmpV2(cle, valeur) {
  filtresEmpV2[cle] = valeur;
  document.getElementById('empV2-f-' + cle + '-menu').classList.remove('ouvert');
  if (cle === 'meuble') { filtresEmpV2.rangee = ''; filtresEmpV2.espace = ''; }
  if (cle === 'rangee') { filtresEmpV2.espace = ''; }
  remplirFiltresEmpV2();
  afficherEmpV2();
}

function reinitialiserFiltresEmpV2() {
  filtresEmpV2 = { meuble: '', rangee: '', espace: '' };
  remplirFiltresEmpV2();
  afficherEmpV2();
  fermerFiltresEmpV2();
}

function empCarteVinV2(w, droite) {
  var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
  var nom = decodeHTML(w.Nom || '—');
  var pays = w.Pays || '';
  var region = w.Region || '';
  var paysRegion = (pays && region) ? (pays + ' • ' + region) : (pays || region);
  var cepage = w.Cepage || '';
  var sous = [paysRegion, cepage].filter(Boolean).join('<br>');
  var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
  var onclick = cb ? ' onclick="deplacerDepuisEmpV2(\'' + cb + '\')"' : '';
  return '<div class="carte ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
         '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
         '<div class="carte-droite">' + (droite || '') + '</div></div>';
}

// Vue par défaut : groupé meuble → rangée → cartes
function afficherEmpV2() {
  var f = filtresEmpV2;
  var base = bouteillesRangeesEmpV2().filter(function(i){
    return (!f.meuble || String(i.Meuble) === String(f.meuble)) &&
      (!f.rangee || String(i.Rangee) === String(f.rangee)) &&
      (!f.espace || String(i.Espace) === String(f.espace));
  });

  base.sort(function(a, b){
    if (String(a.Meuble) !== String(b.Meuble)) return String(a.Meuble).localeCompare(String(b.Meuble));
    if (parseInt(a.Rangee) !== parseInt(b.Rangee)) return parseInt(a.Rangee) - parseInt(b.Rangee);
    return parseInt(a.Espace) - parseInt(b.Espace);
  });

  var div = document.getElementById('empV2-cartes');
  document.getElementById('empV2-compte').textContent = base.length + ' bouteille' + (base.length > 1 ? 's' : '');
  if (base.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucune bouteille rangée</div>'; return; }

  // index des bouteilles présentes par meuble|rangee|espace
  var parPlace = {};
  base.forEach(function(w){
    parPlace[w.Meuble + '|' + w.Rangee + '|' + w.Espace] = w;
  });

  // meubles à dessiner : celui filtré, sinon les 3 de CONFIG (ordre alphabétique)
  var meubles = f.meuble ? [f.meuble] : Object.keys(CONFIG.meubles || {}).sort(function(a,b){ return a.localeCompare(b); });

  var html = '';
  meubles.forEach(function(meuble){
    var rangeesDef = (CONFIG.meubles && CONFIG.meubles[meuble]) ? CONFIG.meubles[meuble] : {};
    html += '<div class="emp-bloc"><div class="emp-meuble">' + meuble + '</div>';
    Object.keys(rangeesDef).sort(function(a,b){ return parseInt(a) - parseInt(b); }).forEach(function(rangee){
      if (f.rangee && String(rangee) !== String(f.rangee)) return;
      var espacesDef = rangeesDef[rangee] || [];
      var nb = espacesDef.length;
      var occ = 0;
      var ronds = [];
      espacesDef.forEach(function(esp){
        var w = parPlace[meuble + '|' + rangee + '|' + esp];
        if (w) occ++;
        var photo = (w && w['Photo URL']) ? w['Photo URL'] : '';
        var cb = (w && w['Code-barres']) ? w['Code-barres'].toString().trim().replace(/\s+/g, '') : '';
        ronds.push('<div class="cercle" data-photo="' + photo + '" data-cb="' + cb + '"></div>');
      });
      // 7 espaces = quinconce 4 bas + 3 haut ; sinon une seule ligne
      var lignes;
      if (nb === 7) {
        lignes = '<div class="ligne-ronds haut">' + ronds.slice(4,7).join('') + '</div>' +
                 '<div class="ligne-ronds bas">' + ronds.slice(0,4).join('') + '</div>';
      } else {
        lignes = '<div class="ligne-ronds">' + ronds.join('') + '</div>';
      }
      html += '<div class="emp-rangee" data-meuble="' + meuble + '" data-rangee="' + rangee + '">' +
                '<span class="emp-rangee-nom">Rangée ' + rangee + '</span>' +
                '<div class="emp-ronds">' + lignes + '</div>' +
                '<span class="emp-compte">' + occ + '/' + nb + '</span>' +
              '</div>';
    });
    html += '</div>';
  });
  div.innerHTML = html;
  brancherTirerRangeesEmpV2();
}

// Tirer une rangée : gros ronds + photo ; une seule ouverte à la fois
function brancherTirerRangeesEmpV2() {
  var rangees = document.querySelectorAll('#empV2-cartes .emp-rangee');
  Array.prototype.forEach.call(rangees, function(el){
    el.addEventListener('click', function(){
      var dejaOuvert = el.classList.contains('ouvert');
      Array.prototype.forEach.call(rangees, function(r){
        r.classList.remove('ouvert');
        Array.prototype.forEach.call(r.querySelectorAll('.cercle'), function(c){ c.innerHTML = ''; });
      });
      if (!dejaOuvert) {
        el.classList.add('ouvert');
        Array.prototype.forEach.call(el.querySelectorAll('.cercle'), function(c){
          var p = c.getAttribute('data-photo');
          c.innerHTML = p ? '<img src="' + p + '" alt="">' : '';
          var cb = c.getAttribute('data-cb');
          if (cb) {
            c.addEventListener('click', function(ev){
              ev.stopPropagation();
              document.getElementById('empV2Container').style.display = 'none';
              ouvrirApresTap(function(){ ouvrirFicheV2(cb, 'emplacements'); });
            });
          }
        });
      }
    });
  });
}

// Regroupe par code-barres : { wine, emplacements:[], count }
function grouperParCbEmpV2(liste) {
  var grouped = {};
  liste.forEach(function(w){
    var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var key = cb || ('SANS_' + w.Nom);
    if (!grouped[key]) grouped[key] = { wine: w, emplacements: [], count: 0 };
    grouped[key].count++;
    grouped[key].emplacements.push(w.Meuble.toString().substring(0,1).toUpperCase() + '-' + w.Rangee + '-' + w.Espace);
  });
  return Object.values(grouped);
}

function cepageDominant(w) {
  var c = (w.Cepage || '').toString().split(',')[0].trim();
  return c;
}

// Regroupe par Code SAQ (repli code-barres, puis nom) — fusionne un même vin mal codé
function grouperParSaqEmpV2(liste) {
  var grouped = {};
  liste.forEach(function(w){
    var key = cleVinV2(w);
    if (!grouped[key]) grouped[key] = { wine: w, emplacements: [], count: 0 };
    grouped[key].count++;
    grouped[key].emplacements.push(w.Meuble.toString().substring(0,1).toUpperCase() + '-' + w.Rangee + '-' + w.Espace);
  });
  return Object.values(grouped);
}

function afficherListeEmpV2(type) {
  fermerFiltresEmpV2();
  var f = filtresEmpV2;
  var tousRanges = bouteillesRangeesEmpV2();
  var div = document.getElementById('empV2-cartes');
  var html = '';
  var titre = '';

  if (type === 'doubles') {
    // Même code-barres en 2+ bouteilles. Si meuble choisi → dans le meuble, sinon tous.
    var portee = f.meuble ? tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); }) : tousRanges;
    var groupes = grouperParSaqEmpV2(portee).filter(function(g){ return g.count >= 2; });
    titre = 'Vins en double';
    if (groupes.length === 0) { html = '<div class="texte-secondaire">Aucun vin en double</div>'; }
    else { html = groupes.map(function(g){ return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', ')); }).join(''); }

  } else if (type === 'cepdoubles') {
    // Cépage dominant présent sur 2+ vins DIFFÉRENTS du meuble choisi
    var dansMeuble = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var parCb = grouperParSaqEmpV2(dansMeuble);
    var parCepage = {};
    parCb.forEach(function(g){
      var cep = cepageDominant(g.wine);
      if (!cep) return;
      if (!parCepage[cep]) parCepage[cep] = [];
      parCepage[cep].push(g);
    });
    titre = 'Cépages doubles';
    var cles = Object.keys(parCepage).filter(function(c){ return parCepage[c].length >= 2; }).sort(function(a,b){ return a.localeCompare(b); });
    if (cles.length === 0) { html = '<div class="texte-secondaire">Aucun cépage en double</div>'; }
    else {
      html = cles.map(function(cep){
        return '<div class="emp-meuble">' + cep + '</div>' + parCepage[cep].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '));
        }).join('');
      }).join('');
    }

  } else if (type === 'cepmanquants') {
    // Cépage présent dans d'AUTRES meubles, absent du meuble choisi
    var dansMeuble2 = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var horsMeuble = tousRanges.filter(function(i){ return String(i.Meuble) !== String(f.meuble); });
    var cepDansMeuble = {};
    dansMeuble2.forEach(function(w){ var c = cepageDominant(w); if (c) cepDansMeuble[c] = true; });
    var parCepageHors = {};
    grouperParSaqEmpV2(horsMeuble).forEach(function(g){
      var cep = cepageDominant(g.wine);
      if (!cep || cepDansMeuble[cep]) return;
      if (!parCepageHors[cep]) parCepageHors[cep] = [];
      parCepageHors[cep].push(g);
    });
    titre = 'Cépages manquants';
    var cles2 = Object.keys(parCepageHors).sort(function(a,b){ return a.localeCompare(b); });
    if (cles2.length === 0) { html = '<div class="texte-secondaire">Aucun cépage manquant</div>'; }
    else {
      html = cles2.map(function(cep){
        return '<div class="emp-meuble">' + cep + '</div>' + parCepageHors[cep].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '));
        }).join('');
      }).join('');
    }
  }

  document.getElementById('empV2-compte').textContent = titre;
  div.innerHTML = html;
}

function deplacerDepuisEmpV2(code) {
  appelBackend('checkWineExists', { codebarre: code }, { spinner: ' ' }).then(function(result) {
    if (!result || !result.exists) { afficherMessage('Vin introuvable'); return; }
    document.getElementById('empV2Container').style.display = 'none';
    menuActionV2Context = { code: code, wineResult: result, retour: 'emplacements' };
    ouvrirApresTap(ouvrirDeplacerV2);
  }).catch(function() { retourAccueilV2(); });
}

// ==================== HISTORIQUE V2 ====================
var filtresHistoV2 = { mets: '', vin: '', accord: '' };
var histoEditV2 = { row: 0, note: 0 };

function ouvrirHistoV2() {
  document.getElementById('histoV2Container').style.display = 'flex';
  appelBackend('getInventoryData', {}, { spinner: ' ' }).then(function(data) {
    ALL_DATA = data || [];
    return appelBackend('getHistorique', {});
  }).then(function(data) {
    ALL_HISTORIQUE = data || [];
    filtresHistoV2 = { mets: '', vin: '', accord: '' };
    remplirFiltresHistoV2();
    afficherHistoV2();
  }).catch(function() { retourAccueilV2(); });
}

function fermerHistoV2() {
  fermerFiltresHistoV2();
  document.getElementById('histoV2Container').style.display = 'none';
}

function ouvrirFiltresHistoV2() {
  document.getElementById('histoV2-filtres-voile').classList.add('ouvert');
  document.getElementById('histoV2-filtres').classList.add('ouvert');
}
function fermerFiltresHistoV2() {
  document.getElementById('histoV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('histoV2-filtres').classList.remove('ouvert');
}

function remplirFiltresHistoV2() {
  var f = filtresHistoV2;
  var base = ALL_HISTORIQUE || [];

  var mets = uniqueHistoV2(base, 'plat');
  var vins = uniqueHistoV2(base, 'nom');
  var accords = [];
  // Accord = catégorie : on prend les accords des vins concernés via ALL_DATA
  var cbAccords = {};
  (ALL_DATA || []).forEach(function(d){
    var cb = (d['Code-barres'] || '').toString().trim();
    if (cb && d.Accords) cbAccords[cb] = d.Accords;
  });
  var vusAcc = {};
  base.forEach(function(h){
    var acc = cbAccords[(h.codebarre || '').toString().trim()];
    if (!acc) return;
    acc.split(',').map(function(a){ return a.trim(); }).filter(Boolean).forEach(function(a){
      if (!vusAcc[a]) { vusAcc[a] = true; accords.push(a); }
    });
  });
  accords.sort(function(a, b){ return a.localeCompare(b); });

  var listes = { mets: mets, vin: vins, accord: accords };
  ['mets','vin','accord'].forEach(function(cle){
    var cur = f[cle];
    var menu = document.getElementById('histoV2-f-' + cle + '-menu');
    menu.innerHTML = listes[cle].map(function(v){
      return '<div class="item-liste' + (v === cur ? ' actif' : '') + '" onclick="choisirFiltreHistoV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('histoV2-f-' + cle + '-display');
    if (disp) disp.textContent = cur === '' ? ({mets:'Mets',vin:'Vin',accord:'Accord'})[cle] : cur;
  });

  var loupe = document.getElementById('histoV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(f.mets || f.vin || f.accord));
}

function uniqueHistoV2(liste, champ) {
  var vus = {};
  var out = [];
  liste.forEach(function(h){
    var v = (h[champ] || '').toString().trim();
    if (v && !vus[v]) { vus[v] = true; out.push(v); }
  });
  out.sort(function(a, b){ return a.localeCompare(b); });
  return out;
}

function basculerFiltreHistoV2(cle) {
  var menu = document.getElementById('histoV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['mets','vin','accord'].forEach(function(k){
    document.getElementById('histoV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreHistoV2(cle, valeur) {
  filtresHistoV2[cle] = valeur;
  document.getElementById('histoV2-f-' + cle + '-menu').classList.remove('ouvert');
  remplirFiltresHistoV2();
  afficherHistoV2();
}

function reinitialiserFiltresHistoV2() {
  filtresHistoV2 = { mets: '', vin: '', accord: '' };
  remplirFiltresHistoV2();
  afficherHistoV2();
  fermerFiltresHistoV2();
}

function afficherHistoV2() {
  var f = filtresHistoV2;
  var cbAccords = {};
  (ALL_DATA || []).forEach(function(d){
    var cb = (d['Code-barres'] || '').toString().trim();
    if (cb && d.Accords) cbAccords[cb] = d.Accords;
  });

  var base = (ALL_HISTORIQUE || []).filter(function(h){
    if (f.mets && (h.plat || '') !== f.mets) return false;
    if (f.vin && (h.nom || '') !== f.vin) return false;
    if (f.accord) {
      var acc = cbAccords[(h.codebarre || '').toString().trim()] || '';
      if (acc.indexOf(f.accord) === -1) return false;
    }
    return true;
  });

  // Photo par code-barres (vient de ALL_DATA)
  var cbPhoto = {};
  (ALL_DATA || []).forEach(function(d){
    var cb = (d['Code-barres'] || '').toString().trim();
    if (cb && d['Photo URL']) cbPhoto[cb] = d['Photo URL'];
  });

  // Regrouper par vin (Code SAQ sinon code-barres) — même clé que partout
  var grouped = {};
  base.forEach(function(h){
    var cb = (h.codebarre || '').toString().trim();
    var key = cleVinV2({ 'Code SAQ': h.codeSAQ, 'Code-barres': h.codebarre });
    if (!grouped[key]) grouped[key] = { cb: cb, nom: h.nom, couleur: h.couleur, photo: cbPhoto[cb] || '', mets: [] };
    grouped[key].mets.push(h);
  });
  var groupes = Object.values(grouped);

  var div = document.getElementById('histoV2-cartes');
  document.getElementById('histoV2-compte').textContent = groupes.length + ' vin' + (groupes.length > 1 ? 's' : '');
  if (groupes.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucune entrée</div>'; return; }

  var cbInfos = {};
  (ALL_DATA || []).forEach(function(d){
    var cb = (d['Code-barres'] || '').toString().trim();
    if (cb) cbInfos[cb] = d;
  });

  div.innerHTML = groupes.map(function(g){
    var nom = decodeHTML(g.nom || '—');
    var info = cbInfos[g.cb] || {};
    var pays = info.Pays || '';
    var region = info.Region || '';
    var paysRegion = (pays && region) ? (pays + ' • ' + region) : (pays || region);
    var cepage = info.Cepage || '';
    var sous = [paysRegion, cepage].filter(Boolean).join('<br>');
    var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + g.cb + '\', \'histo\')})"' : '';
    var photo = g.photo ? '<div class="carte-photo"><img src="' + g.photo + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var carteVin = '<div class="carte histo-vin ' + couleurClasseV2(g.couleur) + '"' + onclick + '>' + photo +
      '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div></div>';

    var mets = g.mets.slice().sort(function(a, b){ return (parseInt(b.bonAccord) || 0) - (parseInt(a.bonAccord) || 0); });
    var cartesMets = mets.map(function(m){
      var note = parseInt(m.bonAccord) || 0;
      var classeNote = (note >= 1 && note <= 5) ? ' bordure-gauche-' + note : '';
      var platEsc = (m.plat || '').replace(/'/g, "\\'");
      return '<div class="carte histo-mets' + classeNote + '" onclick="ouvrirApresTap(function(){ouvrirHistoEditV2(' + m.row + ', \'' + platEsc + '\', ' + note + ', \'' + nom.replace(/'/g, "\\'") + '\')})">' +
        '<div class="carte-centre"><span class="carte-titre">' + (m.plat || '—') + '</span></div>' +
        '<div class="carte-droite">' + (m.date || '') + '</div></div>';
    }).join('');

    return '<div class="histo-groupe">' + carteVin + cartesMets + '</div>';
  }).join('');
}

function ouvrirHistoEditV2(row, plat, note, nom, provenance) {
  histoEditV2 = { row: row, note: note || 0, provenance: provenance || 'histo' };
  document.getElementById('histoEditV2-vin').textContent = nom || '';
  document.getElementById('histoEditV2-plat').value = plat || '';
  var v = document.getElementById('histoEditV2-verres');
  v.innerHTML = '';
  for (var i = 1; i <= 5; i++) {
    v.innerHTML += '<span class="boire-verre' + (i <= (note || 0) ? ' allume' : '') + '" data-note="' + i + '" onclick="choisirNoteHistoEditV2(' + i + ')">🍷</span>';
  }
  document.getElementById('histoEditV2Overlay').style.display = 'flex';
}

function choisirNoteHistoEditV2(note) {
  histoEditV2.note = note;
  Array.prototype.forEach.call(document.querySelectorAll('#histoEditV2-verres .boire-verre'), function(el){
    el.classList.toggle('allume', parseInt(el.getAttribute('data-note')) <= note);
  });
}

function sauverHistoEditV2() {
  var plat = document.getElementById('histoEditV2-plat').value.trim();
  appelBackend('corrigerHistorique', { row: histoEditV2.row, plat: plat, note: histoEditV2.note }, { spinner: 'Sauvegarde' }).then(function(res){
    if (!res || !res.success) { afficherMessage('Erreur'); return; }
    return appelBackend('getHistorique', {}).then(function(data){
      ALL_HISTORIQUE = data || [];
      document.getElementById('histoEditV2Overlay').style.display = 'none';
      if (histoEditV2.provenance === 'fiche') {
        chargerPlatsV2(CURRENT_WINE_CODEBARRE);
      } else {
        remplirFiltresHistoV2();
        afficherHistoV2();
      }
      afficherMessage('Corrigé');
    });
  }).catch(function(){ retourAccueilV2(); });
}

function fermerHistoEditV2() {
  document.getElementById('histoEditV2Overlay').style.display = 'none';
}

// Clé d'un vin : Code SAQ, sinon code-barres, sinon rien (bouteille non regroupée)
function cleVinV2(item) {
  var saq = (item['Code SAQ'] || '').toString().trim();
  if (saq) return 'SAQ_' + saq;
  var cb = (item['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
  if (cb) return 'CB_' + cb;
  return 'SEUL_' + (item.row != null ? item.row : Math.random());
}

function couleurClasseV2(couleur) {
  couleur = (couleur || '').toLowerCase();
  if (couleur.indexOf('rouge') !== -1) return 'vin-rouge';
  if (couleur.indexOf('blanc') !== -1) return 'vin-blanc';
  if (couleur.indexOf('rose') !== -1 || couleur.indexOf('rosé') !== -1) return 'vin-rose';
  if (couleur.indexOf('bulle') !== -1 || couleur.indexOf('mousseux') !== -1) return 'vin-bulles';
  return 'vin-rouge';
}

function grouperVinsV2(data) {
  var grouped = {};
  data.forEach(function(item) {
    var cb = (item['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var key = cleVinV2(item);
    if (!grouped[key]) grouped[key] = { wine: item, cb: cb, count: 0, emplacements: [] };
    var statut = item.Statut || 'En stock';
    if (statut !== 'Bu' && statut !== 'Sorti') {
      grouped[key].count++;
      if (item.Meuble && item.Rangee && item.Espace) {
        grouped[key].emplacements.push(item.Meuble.toString().substring(0, 1).toUpperCase() + '-' + item.Rangee + '-' + item.Espace);
      } else {
        grouped[key].emplacements.push('À ranger');
      }
    }
  });
  var ordre = { rouge: 1, blanc: 2, rose: 3, bulles: 4 };
  return Object.values(grouped).sort(function(a, b) {
    var va = ordre[(a.wine.Couleur || '').toLowerCase()] || 99;
    var vb = ordre[(b.wine.Couleur || '').toLowerCase()] || 99;
    return va !== vb ? va - vb : (a.wine.Nom || '').localeCompare(b.wine.Nom || '');
  });
}

function afficherCartesCaveV2(data) {
  var div = document.getElementById('caveV2-cartes');
  var groups = grouperVinsV2(data);
  document.getElementById('caveV2-compte').textContent = groups.length + ' vin' + (groups.length > 1 ? 's' : '');
  if (groups.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucun vin</div>'; return; }
  div.innerHTML = groups.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var pays = w.Pays || '';
    var region = w.Region || '';
    var paysRegion = (pays && region) ? (pays + ' • ' + region) : (pays || region);
    var cepage = w.Cepage || '';
    var sous = [paysRegion, cepage].filter(Boolean).join('<br>');
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + g.cb + '\', \'cave\')})"' : '';
    var vide = g.count === 0 ? ' carte-vide' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + g.count + ' btl' +
           (g.emplacements && g.emplacements.length ? '<br>' + g.emplacements.join('<br>') : '') +
           '</div></div>';
  }).join('');
}

function ouvrirFiltresCaveV2() {
  document.getElementById('caveV2-filtres-voile').classList.add('ouvert');
  document.getElementById('caveV2-filtres').classList.add('ouvert');
}
function fermerFiltresCaveV2() {
  document.getElementById('caveV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('caveV2-filtres').classList.remove('ouvert');
}

var filtresCaveV2 = { couleur: '', cepage: '', pays: '', appellation: '', accords: '' };
var libellesFiltreCaveV2 = { couleur: 'Couleurs', cepage: 'Cépages', pays: 'Pays', appellation: 'Appellations', accords: 'Accords' };

function remplirFiltresCaveV2() {
  var f = filtresCaveV2;
  var base = (ALL_DATA || []);

  var forCouleur = base;
  var forCepage = f.couleur ? base.filter(function(i){ return i.Couleur === f.couleur; }) : base;
  var forPays = forCepage.filter(function(i){ return !f.cepage || (i.Cepage && i.Cepage.indexOf(f.cepage) !== -1); });
  var forAppellation = forPays.filter(function(i){ return !f.pays || i.Pays === f.pays; });
  var forAccords = forAppellation.filter(function(i){ return !f.appellation || i.Appellation === f.appellation; });

  var sets = { couleur: {}, cepage: {}, pays: {}, appellation: {}, accords: {} };
  forCouleur.forEach(function(i){ if (i.Couleur) sets.couleur[i.Couleur] = true; });
  forCepage.forEach(function(i){ (i.Cepage || '').split(',').map(function(x){return x.trim();}).filter(Boolean).forEach(function(x){ sets.cepage[x] = true; }); });
  forPays.forEach(function(i){ if (i.Pays) sets.pays[i.Pays] = true; });
  forAppellation.forEach(function(i){ if (i.Appellation) sets.appellation[i.Appellation] = true; });
  forAccords.forEach(function(i){ (i.Accords || '').split(',').map(function(x){return x.trim();}).filter(Boolean).forEach(function(x){ sets.accords[x] = true; }); });

  Object.keys(sets).forEach(function(cle) {
    var menu = document.getElementById('caveV2-f-' + cle + '-menu');
    if (!menu) return;
    var opts = Object.keys(sets[cle]).sort();
    var cur = filtresCaveV2[cle];
    menu.innerHTML = opts.map(function(v) {
      return '<div class="item-liste' + (v === cur ? ' actif' : '') + '" onclick="choisirFiltreCaveV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('caveV2-f-' + cle + '-display');
    if (disp) disp.textContent = cur === '' ? libellesFiltreCaveV2[cle] : cur;
  });
}

function basculerFiltreCaveV2(cle) {
  var menu = document.getElementById('caveV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['couleur','cepage','pays','appellation','accords'].forEach(function(k) {
    document.getElementById('caveV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreCaveV2(cle, valeur) {
  filtresCaveV2[cle] = valeur;
  document.getElementById('caveV2-f-' + cle + '-menu').classList.remove('ouvert');
  appliquerFiltresCaveV2();
}

function appliquerFiltresCaveV2() {
  var c = filtresCaveV2.couleur;
  var cep = filtresCaveV2.cepage;
  var p = filtresCaveV2.pays;
  var app = filtresCaveV2.appellation;
  var a = filtresCaveV2.accords;
  var nom = document.getElementById('caveV2-f-nom').value.toLowerCase().trim();

  var filtered = (ALL_DATA || []).filter(function(i) {
    return (!c || i.Couleur === c) &&
      (!cep || (i.Cepage && i.Cepage.indexOf(cep) !== -1)) &&
      (!p || i.Pays === p) &&
      (!app || i.Appellation === app) &&
      (!a || (i.Accords && i.Accords.indexOf(a) !== -1)) &&
      (!nom || (i.Nom || '').toLowerCase().indexOf(nom) !== -1);
  });
  afficherCartesCaveV2(filtered);
  remplirFiltresCaveV2();
  var loupe = document.getElementById('caveV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(c || cep || p || app || a || nom));
}

function reinitialiserFiltresCaveV2() {
  filtresCaveV2 = { couleur: '', cepage: '', pays: '', appellation: '', accords: '' };
  document.getElementById('caveV2-f-nom').value = '';
  appliquerFiltresCaveV2();
  fermerFiltresCaveV2();
}

// ==================== MENU BURGER V2 ====================
function toggleMenuV2() {
  var ouvert = document.getElementById('burgerV2').classList.toggle('ouvert');
  document.getElementById('burgerV2-voile').classList.toggle('ouvert', ouvert);
}

function fermerMenuBurgerV2() {
  document.getElementById('burgerV2').classList.remove('ouvert');
  document.getElementById('burgerV2-voile').classList.remove('ouvert');
}

function burgerV2Click(cible) {
  fermerMenuBurgerV2();
  if (cible === 'accueil') {
    ['caveV2Container'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    return;
  }
  if (cible === 'cave') { ouvrirCaveV2(); return; }
  if (cible === 'aranger') { ouvrirARangerV2(); return; }
  if (cible === 'racheter') { ouvrirAchatV2(); return; }
  if (cible === 'emplacements') { ouvrirEmpV2(); return; }
  if (cible === 'historique') { ouvrirHistoV2(); return; }
  if (cible === 'refresh') {
    appelBackend('getInventoryData', {}, { spinner: 'Synchronisation' }).then(function(data) {
      ALL_DATA = data || [];
      afficherMessage('✓ Synchronisé');
    }).catch(function() { afficherMessage('Erreur de synchronisation'); });
    return;
  }
  afficherMessage('À venir');
}

function ajouterBouteilleArrivee(meuble, rangee, espace) {
  var code = menuActionV2Context ? menuActionV2Context.code : null;
  if (!code) { afficherMessage('Vin introuvable'); return; }
  appelBackend('addBottle', { codebarre: code, meuble: meuble, rangee: rangee, espace: espace }, { spinner: 'Mise en cave' }).then(function() {
    afficherMessage('Bouteille ajoutée !');
    document.getElementById('arriveeV2Container').style.display = 'none';
    return appelBackend('getInventoryData', {});
  }).then(function(data) {
    if (data) ALL_DATA = data;
    return appelBackend('checkWineExists', { codebarre: code });
  }).then(function(result) {
    if (result && menuActionV2Context) menuActionV2Context.wineResult = result;
  }).catch(function() {
    retourAccueilV2();
  });
}

