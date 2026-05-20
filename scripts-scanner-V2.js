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
  const container = document.getElementById('scannerContainer');
  container.style.display = 'flex';
  isScanningV2 = true;
  scanConfirmationsV2 = {};

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
      stopScannerV2();
      return;
    }
    Quagga.start();
  });

  Quagga.onDetected(function(result) {
    if (!isScanningV2) return;
    const code = result.codeResult.code;
    if (!code) return;
    if (!/^\d{8,13}$/.test(code)) return;
    if (!scanConfirmationsV2[code]) scanConfirmationsV2[code] = 0;
    scanConfirmationsV2[code]++;
    const feedback = document.querySelector('.scanner-help');
    if (feedback) {
      feedback.textContent = 'Code détecté: ' + code + ' (' + scanConfirmationsV2[code] + '/' + SCAN_THRESHOLD_V2 + ')';
      feedback.style.color = '#ffc107';
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
  document.getElementById('scannerContainer').style.display = 'none';
  const feedback = document.querySelector('.scanner-help');
  if (feedback) {
    feedback.textContent = 'Alignez le code-barres avec la ligne';
    feedback.style.color = 'white';
  }
}

function traiterResultatScanV2(code) {
  console.log('[V2] Code scanné:', code);
  appelBackend('checkWineExists', { codebarre: code }, { spinner: 'Vérification...' }).then(function(result) {
    if (result.exists) {
      console.log('[V2] Vin EXISTE:', result);
      alert('V2 — Vin EXISTE\nCode: ' + code + '\nNom: ' + (result.wine ? result.wine.nom : '?') + '\nBouteilles actives: ' + result.count);
    } else {
      console.log('[V2] Vin N\'EXISTE PAS');
      alert('V2 — Vin N\'EXISTE PAS\nCode: ' + code);
    }
  }).catch(function(err) {
    console.error('[V2] Erreur:', err);
    afficherMessage('Erreur de vérification');
  });
}