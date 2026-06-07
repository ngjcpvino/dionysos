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
    ouvrirFicheV2(code, 'menuScan');
    return;
  }
  if (action === 'arrivee') {
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    ouvrirArriveeV2();
    return;
  }
  if (action === 'deplacer') {
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    ouvrirDeplacerV2();
    return;
  }
  var nbActives = (menuActionV2Context && menuActionV2Context.wineResult && typeof menuActionV2Context.wineResult.count === 'number') ? menuActionV2Context.wineResult.count : 0;
  if (nbActives === 0 && (action === 'deplacer' || action === 'boire' || action === 'donner')) {
    afficherMessage('Aucune bouteille en stock');
    return;
  }
  if (action === 'boire') {
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    ouvrirBoireV2();
    return;
  }
  if (action === 'donner') {
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    ouvrirDonnerV2();
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
    return '<div class="item-liste' + (sel ? ' actif' : '') + '" onclick="this.classList.toggle(\'actif\')" data-accord="' + acc + '">' + acc + '</div>';
  }).join('');
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
    var key = cb !== '' ? cb : 'SANS_CB_' + item.Nom;
    if (!grouped[key]) grouped[key] = { wine: item, cb: cb, count: 0 };
    var statut = item.Statut || 'En stock';
    if (statut !== 'Bu' && statut !== 'Sorti') grouped[key].count++;
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
    var onclick = g.cb ? ' onclick="ouvrirFicheV2(\'' + g.cb + '\', \'cave\')"' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + g.count + ' btl</div></div>';
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
  var sets = { couleur: {}, cepage: {}, pays: {}, appellation: {}, accords: {} };
  (ALL_DATA || []).forEach(function(i) {
    if (i.Couleur) sets.couleur[i.Couleur] = true;
    if (i.Pays) sets.pays[i.Pays] = true;
    if (i.Appellation) sets.appellation[i.Appellation] = true;
    (i.Cepage || '').split(',').map(function(x){return x.trim();}).filter(Boolean).forEach(function(x){ sets.cepage[x] = true; });
    (i.Accords || '').split(',').map(function(x){return x.trim();}).filter(Boolean).forEach(function(x){ sets.accords[x] = true; });
  });

  Object.keys(sets).forEach(function(cle) {
    var menu = document.getElementById('caveV2-f-' + cle + '-menu');
    var opts = Object.keys(sets[cle]).sort();
    var cur = filtresCaveV2[cle];
    var html = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="choisirFiltreCaveV2(\'' + cle + '\', \'\')">' + libellesFiltreCaveV2[cle] + '</div>';
    html += opts.map(function(v) {
      return '<div class="item-liste' + (v === cur ? ' actif' : '') + '" onclick="choisirFiltreCaveV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    menu.innerHTML = html;
    document.getElementById('caveV2-f-' + cle + '-display').textContent = cur === '' ? libellesFiltreCaveV2[cle] : cur;
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
}

function reinitialiserFiltresCaveV2() {
  filtresCaveV2 = { couleur: '', cepage: '', pays: '', appellation: '', accords: '' };
  document.getElementById('caveV2-f-nom').value = '';
  remplirFiltresCaveV2();
  afficherCartesCaveV2(ALL_DATA);
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

