/* ============================================================
   SCRIPTS-CONFIG.JS
   Constantes et fonction appelBackend
   
============================================================ */

const API_URL = 'https://script.google.com/macros/s/AKfycbxRh6eOQDUy3hXoNNKF6n6gUxhppKB452UqZuPB1mZAC_rzb1jZ5LbPsBuZDH521uq1eA/exec';

async function appelBackend(action, data = {}, options = {}) {
  if (options.spinner) _afficherSpinner(options.spinner);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: action, data: data })
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'Erreur backend');
    return json.result;
  } finally {
    if (options.spinner) _cacherSpinner();
  }
}

function _afficherSpinner(texte) {
  let overlay = document.getElementById('spinner-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'spinner-overlay';
    overlay.innerHTML = '<div class="spinner-verre-wrap"><div class="spinner-verre"></div><div class="spinner-pied"></div><div class="spinner-base"></div></div><div class="spinner-texte" id="spinner-texte"></div>';
    document.body.appendChild(overlay);
  }
  document.getElementById('spinner-texte').textContent = texte;
  overlay.style.display = 'flex';
}

function _cacherSpinner() {
  const overlay = document.getElementById('spinner-overlay');
  if (overlay) overlay.style.display = 'none';
}
