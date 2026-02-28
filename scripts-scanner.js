/* ============================================================
   SCRIPTS-SCANNER.JS
   Scanner Quagga, saisie manuelle, popup nouveau vin
============================================================ */

let isScanning = false;
let scanConfirmations = {};
const SCAN_THRESHOLD = 3;

function startScanFromHome() {
  startScanner();
}

function startScanner() {
  const container = document.getElementById('scannerContainer');
  container.style.display = 'flex';
  isScanning = true;
  scanConfirmations = {};

  Quagga.init({
    numOfWorkers: 0,
    inputStream: {
      name: "Live",
      target: document.getElementById('interactive'),
      type: "LiveStream",
      constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
    },
    locator: { patchSize: "medium", halfSample: true },
    decoder: { readers: ["ean_reader", "code_128_reader", "upc_reader"] }
  }, function(err) {
    if (err) {
      afficherMessage('Erreur caméra. Vérifiez les autorisations.');
      stopScanner();
      return;
    }
    Quagga.start();
  });

  Quagga.onDetected(function(result) {
    if (!isScanning) return;
    const code = result.codeResult.code;
    if (!code) return;
    if (!/^\d{8,13}$/.test(code)) return;

    if (!scanConfirmations[code]) scanConfirmations[code] = 0;
    scanConfirmations[code]++;

    const feedback = document.querySelector('.scanner-help');
    if (feedback) {
      feedback.textContent = 'Code détecté: ' + code + ' (' + scanConfirmations[code] + '/' + SCAN_THRESHOLD + ')';
      feedback.style.color = '#ffc107';
    }

    if (scanConfirmations[code] >= SCAN_THRESHOLD) {
      stopScanner();
      traiterResultatScan(code);
    }
  });
}

function stopScanner() {
  isScanning = false;
  if (typeof Quagga !== 'undefined' && Quagga.stop) {
    try { Quagga.stop(); } catch (e) {}
  }
  document.getElementById('scannerContainer').style.display = 'none';
  const feedback = document.querySelector('.scanner-help');
  if (feedback) {
    feedback.textContent = 'Alignez le code-barres avec la ligne';
    feedback.style.color = 'white';
  }
}

function soumettreCodeBarreManuel() {
  const input = document.getElementById('manual-barcode-input');
  const code = input.value.replace(/\D/g, '').trim();
  if (!code || code.length < 8) {
    afficherMessage('Code-barres invalide — minimum 8 chiffres');
    return;
  }
  input.value = '';
  traiterResultatScan(code);
}

function traiterResultatScan(code) {
  appelBackend('checkWineExists', { codebarre: code }).then(function(result) {
    if (result.exists) {
      afficherMessage('Vin trouvé !');
      ouvrirFicheVin(code);
    } else {
      showNewWinePopup(code);
    }
  }).catch(function(err) { afficherMessage('Erreur de vérification'); });
}

// ==================== POPUP NOUVEAU VIN ====================

function showNewWinePopup(codebarre) {
  codebarre = codebarre || '';
  document.getElementById('newwine-codebarre').value = codebarre;
  document.getElementById('newwine-note').value = '';
  document.getElementById('newwine-quantite').value = '1';

  updateEmplacementsFields(1);

  const overlay = document.getElementById('newWineOverlay');
  overlay.style.display = 'flex';
  setTimeout(function() { overlay.classList.add('active'); }, 10);

  if (!codebarre) {
    setTimeout(function() { document.getElementById('newwine-codebarre').focus(); }, 350);
  }
}

function adjustQuantity(delta) {
  const input = document.getElementById('newwine-quantite');
  let qty = parseInt(input.value) || 1;
  qty += delta;
  if (qty < 1) qty = 1;
  if (qty > 10) qty = 10;
  input.value = qty;
  updateEmplacementsFields(qty);
}

function updateEmplacementsFields(quantity) {
  const container = document.getElementById('emplacements-container');
  container.innerHTML = '';

  for (let i = 1; i <= quantity; i++) {
    container.innerHTML += '<div class="field-container" style="border-top:1px solid rgba(230,161,0,0.3);padding-top:15px;margin-top:15px;">' +
      '<label>BOUTEILLE ' + i + ' - EMPLACEMENT (OPTIONNEL)</label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
      '<select id="newwine-meuble-' + i + '" onchange="updateRangees(' + i + ')" style="height:45px"><option value="">M</option></select>' +
      '<select id="newwine-rangee-' + i + '" onchange="updateEspaces(' + i + ')" style="height:45px"><option value="">R</option></select>' +
      '<select id="newwine-espace-' + i + '" onchange="checkEmplacementDispo(' + i + ')" style="height:45px"><option value="">E</option></select>' +
      '</div>' +
      '<div id="emplacement-status-' + i + '" style="margin-top:5px;font-size:13px;"></div>' +
      '</div>';
  }

  for (let i = 1; i <= quantity; i++) {
    const mSelect = document.getElementById('newwine-meuble-' + i);
    Object.keys(CONFIG.meubles || {}).forEach(function(m) {
      mSelect.innerHTML += '<option value="' + m + '">' + m + '</option>';
    });
  }
}

function updateRangees(bottleNum) {
  const meuble = document.getElementById('newwine-meuble-' + bottleNum).value;
  const rSelect = document.getElementById('newwine-rangee-' + bottleNum);
  const eSelect = document.getElementById('newwine-espace-' + bottleNum);
  rSelect.innerHTML = '<option value="">Rangee</option>';
  eSelect.innerHTML = '<option value="">Espace</option>';
  if (meuble && CONFIG.meubles[meuble]) {
    Object.keys(CONFIG.meubles[meuble]).forEach(function(r) {
      rSelect.innerHTML += '<option value="' + r + '">' + r + '</option>';
    });
  }
  document.getElementById('emplacement-status-' + bottleNum).innerHTML = '';
}

function updateEspaces(bottleNum) {
  const meuble = document.getElementById('newwine-meuble-' + bottleNum).value;
  const rangee = document.getElementById('newwine-rangee-' + bottleNum).value;
  const eSelect = document.getElementById('newwine-espace-' + bottleNum);
  eSelect.innerHTML = '<option value="">Espace</option>';
  if (meuble && rangee && CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) {
    CONFIG.meubles[meuble][rangee].forEach(function(e) {
      eSelect.innerHTML += '<option value="' + e + '">' + e + '</option>';
    });
  }
  document.getElementById('emplacement-status-' + bottleNum).innerHTML = '';
}

function checkEmplacementDispo(bottleNum) {
  const meuble = document.getElementById('newwine-meuble-' + bottleNum).value;
  const rangee = document.getElementById('newwine-rangee-' + bottleNum).value;
  const espace = document.getElementById('newwine-espace-' + bottleNum).value;
  const statusDiv = document.getElementById('emplacement-status-' + bottleNum);
  if (!meuble || !rangee || !espace) { statusDiv.innerHTML = ''; return; }
  statusDiv.innerHTML = 'Vérification...';
  appelBackend('checkLocationAvailable', { meuble: meuble, rangee: rangee, espace: espace }).then(function(result) {
    if (result.available) {
      statusDiv.innerHTML = '<span style="color:#4caf50;">✓ Libre</span>';
      statusDiv.setAttribute('data-available', 'true');
    } else {
      statusDiv.innerHTML = '<span style="color:#f44336;">✗ Occupé par : ' + result.message + '</span>';
      statusDiv.setAttribute('data-available', 'false');
      document.getElementById('btn-save-newwine').disabled = true;
    }
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function saveNewWineImproved() {
  const codebarre = document.getElementById('newwine-codebarre').value.trim();
  const quantite = parseInt(document.getElementById('newwine-quantite').value);

  if (!codebarre) { afficherMessage('Code-barres requis'); return; }
  if (!/^\d{8,13}$/.test(codebarre)) { afficherMessage('Code-barres invalide (8 à 13 chiffres)'); return; }

  for (let i = 1; i <= quantite; i++) {
    const statusDiv = document.getElementById('emplacement-status-' + i);
    if (statusDiv && statusDiv.getAttribute('data-available') === 'false') {
      afficherMessage('Emplacement bouteille ' + i + ' occupé');
      return;
    }
  }

  const bouteilles = [];
  for (let i = 1; i <= quantite; i++) {
    bouteilles.push({
      meuble: document.getElementById('newwine-meuble-' + i).value,
      rangee: document.getElementById('newwine-rangee-' + i).value,
      espace: document.getElementById('newwine-espace-' + i).value
    });
  }

  window.bouteillesJSON = JSON.stringify(bouteilles);

  const btn = document.getElementById('btn-save-newwine');
  btn.disabled = true;
  btn.textContent = 'RECHERCHE SAQ...';

  appelBackend('chercherProduitSAQ_GRAPHQL_V1', { codebarre: codebarre }).then(function(codeSAQTrouve) {
    if (!codeSAQTrouve) {
      btn.disabled = false;
      btn.textContent = 'GO';

      let overlay = document.getElementById('confirmOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'confirmOverlay';
        overlay.className = 'confirm-overlay';
        document.body.appendChild(overlay);
      }

      overlay.innerHTML =
        '<div class="confirm-dialog">' +
          '<button onclick="document.getElementById(\'confirmOverlay\').style.display=\'none\'" class="confirm-dialog-close">✕</button>' +
          '<h3 class="color-primary mb-20 fs-14 text-uppercase">Vin non trouvé à la SAQ</h3>' +
          '<p class="color-white mb-20 fs-14">Voulez-vous l\'ajouter quand même ?</p>' +
          '<div class="confirm-dialog-buttons">' +
            '<button id="confirmBtn" class="confirm-dialog-button confirm-dialog-button-primary">OUI</button>' +
            '<button id="cancelBtn" class="confirm-dialog-button confirm-dialog-button-secondary">ANNULER</button>' +
          '</div>' +
        '</div>';

      overlay.style.display = 'flex';

      document.getElementById('cancelBtn').onclick = function() { overlay.style.display = 'none'; };
      document.getElementById('confirmBtn').onclick = function() {
        overlay.innerHTML =
          '<div class="confirm-dialog">' +
            '<h3 class="color-primary mb-20 fs-14 text-uppercase">Nom du vin</h3>' +
            '<div class="field-container" style="margin-bottom:20px;">' +
              '<label>NOM DU VIN</label>' +
              '<input type="text" id="confirm-nom-vin" placeholder="Ex: Château Margaux 2018" style="width:100%;padding:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(230,161,0,0.3);color:#fff;">' +
            '</div>' +
            '<div class="confirm-dialog-buttons">' +
              '<button id="confirmNomBtn" class="confirm-dialog-button confirm-dialog-button-primary">CONFIRMER</button>' +
              '<button id="cancelNomBtn" class="confirm-dialog-button confirm-dialog-button-secondary">ANNULER</button>' +
            '</div>' +
          '</div>';

        document.getElementById('cancelNomBtn').onclick = function() { overlay.style.display = 'none'; };
        document.getElementById('confirmNomBtn').onclick = function() {
          const nomSaisi = document.getElementById('confirm-nom-vin').value.trim();
          if (!nomSaisi) { afficherMessage('Entrez un nom pour continuer'); return; }
          overlay.style.display = 'none';
          btn.disabled = true;
          btn.textContent = 'ENREGISTREMENT...';
          appelBackend('ajouterVinAvecBouteilles', { codebarre: codebarre, codeSAQ: '', note: '', bouteilles: window.bouteillesJSON, nom: nomSaisi }).then(function() {
            afficherMessage('Vin ajouté !');
            closeNewWinePopup();
            chargerInventaire();
            ouvrirFicheVin(codebarre);
            btn.disabled = false;
            btn.textContent = 'GO';
          }).catch(function(err) {
            afficherMessage('Erreur: ' + err);
            btn.disabled = false;
            btn.textContent = 'GO';
          });
        };
      };
      return;
    }

    btn.textContent = 'ENREGISTREMENT...';
    appelBackend('ajouterVinAvecBouteilles', { codebarre: codebarre, codeSAQ: codeSAQTrouve, note: '', bouteilles: window.bouteillesJSON, nom: '' }).then(function() {
      afficherMessage('Vin ajouté avec données SAQ !');
      closeNewWinePopup();
      chargerInventaire();
      ouvrirFicheVin(codebarre);
      btn.disabled = false;
      btn.textContent = 'GO';
    }).catch(function(err) {
      afficherMessage('Erreur: ' + err);
      btn.disabled = false;
      btn.textContent = 'GO';
    });
  }).catch(function(err) {
    afficherMessage('Erreur recherche SAQ: ' + err);
    btn.disabled = false;
    btn.textContent = 'GO';
  });
}

function closeNewWinePopup() {
  const overlay = document.getElementById('newWineOverlay');
  overlay.classList.remove('active');
  setTimeout(function() { overlay.style.display = 'none'; }, 300);
}

function startScanFromPopup() {
  closeNewWinePopup();
  setTimeout(function() { startScanner(); }, 350);
}

function ouvrirPageSAQFromPopup() {
  const codebarre = document.getElementById('newwine-codebarre').value.trim();
  if (!codebarre) { afficherMessage('Code-barres manquant'); return; }
  let normalizedBarcode = codebarre;
  while (normalizedBarcode.length < 14) { normalizedBarcode = "0" + normalizedBarcode; }
  window.open("https://www.saq.com/fr/catalogsearch/result/?q=" + normalizedBarcode, '_blank');
}

// ==================== POPUP COMPLÉTER VIN SCANNÉ ====================

function openCompleteScannedWine(row, codebarre, note) {
  document.getElementById('complete-row').value = row;
  document.getElementById('complete-codebarre').value = codebarre;
  document.getElementById('complete-codebarre-display').value = codebarre;
  document.getElementById('complete-note-display').value = note || '';
  document.getElementById('complete-codesaq').value = '';
  const overlay = document.getElementById('completeScannedOverlay');
  overlay.style.display = 'flex';
  setTimeout(function() { overlay.classList.add('active'); }, 10);
}

function closeCompleteScannedPopup() {
  const overlay = document.getElementById('completeScannedOverlay');
  overlay.classList.remove('active');
  setTimeout(function() { overlay.style.display = 'none'; }, 300);
}

function ouvrirPageSAQFromComplete() {
  const codebarre = document.getElementById('complete-codebarre').value;
  if (!codebarre) { afficherMessage('Code-barres manquant'); return; }
  let normalizedBarcode = codebarre.trim();
  while (normalizedBarcode.length < 14) { normalizedBarcode = "0" + normalizedBarcode; }
  window.open("https://www.saq.com/fr/catalogsearch/result/?q=" + normalizedBarcode, '_blank');
}

function saveCompleteScanned() {
  const row = parseInt(document.getElementById('complete-row').value);
  const codesaq = document.getElementById('complete-codesaq').value.trim();
  if (!codesaq) { afficherMessage('Entrez un code SAQ'); return; }

  const btn = document.querySelector('#completeScannedOverlay button[onclick="saveCompleteScanned()"]');
  btn.disabled = true;
  btn.textContent = 'ENREGISTREMENT...';

  appelBackend('completeScannedWine', { row: row, codesaq: codesaq }).then(function() {
    afficherMessage('Vin ajouté à la cave !');
    closeCompleteScannedPopup();
    changeView('completer');
    chargerListeACompleter();
    btn.disabled = false;
    btn.textContent = 'GO';
  }).catch(function(err) {
    afficherMessage('Erreur');
    btn.disabled = false;
    btn.textContent = 'GO';
  });
}
