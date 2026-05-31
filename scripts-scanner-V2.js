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

  Quagga.offDetected();
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
  alert('V2 — Action: ' + action + '\n(à coder à la prochaine étape)');
}

// Injection CSS pour les modales V2
(function() {
  const style = document.createElement('style');
  style.textContent =
    '.modal-v2-fullscreen {' +
      'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;' +
      'display:flex;align-items:center;justify-content:center;' +
      'background:linear-gradient(rgba(0,0,0,0.40), rgba(0,0,0,0.40)), url("https://images.unsplash.com/photo-1738544475560-0683270451bd?q=80&w=1470&auto=format&fit=crop") center center / cover no-repeat;' +
    '}' +
    '.modal-v2-content {' +
      'width:100%;height:100%;padding:40px 20px;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'box-sizing:border-box;' +
    '}' +
    '.modal-v2-title {' +
      'color:#e6a100;font-size:18px;text-transform:uppercase;letter-spacing:2px;' +
      'margin:0 0 30px 0;font-weight:300;' +
    '}' +
    '.modal-v2-winename {' +
      'color:#fff;font-size:20px;text-align:center;margin-bottom:8px;' +
    '}' +
    '.modal-v2-codebarre {' +
      'color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:40px;letter-spacing:1px;' +
    '}' +
    '.menu-v2-grid {' +
      'display:grid;grid-template-columns:repeat(3, 90px);grid-gap:20px;' +
    '}' +
    '.menu-v2-circle {' +
      'width:90px;height:90px;border-radius:50%;' +
      'border:1px solid #e6a100;background:rgba(0,0,0,0.50);' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-size:32px;cursor:pointer;user-select:none;' +
      '-webkit-tap-highlight-color:transparent;' +
    '}' +
    '.menu-v2-circle:active {' +
      'background:rgba(230,161,0,0.20);' +
    '}';
  document.head.appendChild(style);
})();