/* ============================================================
   SCRIPTS-SCANNER-V2.JS
   Refonte du scan — V2 en parallèle de la V1
============================================================ */

let isScanningV2 = false;
let scanConfirmationsV2 = {};
const SCAN_THRESHOLD_V2 = 3;

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
    if (!/^\d{8,13}$/.test(code)) return;
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
  const code = (prompt('Entrez le code-barres (minimum 8 chiffres) :') || '').replace(/\D/g, '').trim();
  if (!code || code.length < 8) {
    if (code) { afficherMessage('Code-barres invalide — minimum 8 chiffres'); }
    return;
  }
  stopScannerV2();
  traiterResultatScanV2(code);
}

function traiterResultatScanV2(code) {
  console.log('[V2] Code scanné:', code);
  appelBackend('checkWineExists', { codebarre: code }, { spinner: 'Vérification' }).then(function(result) {
    if (result.exists) {
      console.log('[V2] Vin EXISTE:', result);
      ouvrirMenuActionV2(code, result);
    } else {
      console.log('[V2] Vin N\'EXISTE PAS');
      alert('V2 — Vin N\'EXISTE PAS\nCode: ' + code);
    }
  }).catch(function(err) {
    console.error('[V2] Erreur:', err);
    afficherMessage('Erreur de vérification');
  });
}

let menuActionV2Context = null;

function ouvrirMenuActionV2(code, wineResult) {
  menuActionV2Context = { code: code, wineResult: wineResult };
  const nom = (wineResult && wineResult.wine && wineResult.wine.nom) ? wineResult.wine.nom : 'Vin inconnu';
  document.getElementById('menuActionV2-nom').textContent = nom;
  document.getElementById('menuActionV2-codebarre').textContent = code;
  document.getElementById('menuActionV2Overlay').style.display = 'flex';
}

function fermerMenuActionV2() {
  document.getElementById('menuActionV2Overlay').style.display = 'none';
  menuActionV2Context = null;
}

function menuV2Click(action) {
  console.log('[V2] Action choisie:', action, '— context:', menuActionV2Context);
  if (action === 'visualiser') {
    const code = menuActionV2Context ? menuActionV2Context.code : CURRENT_WINE_CODEBARRE;
    document.getElementById('menuActionV2Overlay').style.display = 'none';
    ouvrirFicheV2(code, 'menuScan');
    return;
  }
  alert('V2 — Action: ' + action + '\n(à coder à la prochaine étape)');
}

