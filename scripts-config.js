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
    const style = document.createElement('style');
    style.textContent = `
      #spinner-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75);
        display: flex; align-items: center; justify-content: center;
        flex-direction: column; gap: 20px;
        z-index: 99999;
      }
      .spinner-verre-wrap { display: flex; flex-direction: column; align-items: center; }
      .spinner-verre {
        width: 60px; height: 75px;
        border: 2px solid #e6a100; border-top: none;
        border-radius: 0 0 30px 30px;
        position: relative; overflow: hidden;
        background: rgba(255,255,255,0.05);
      }
      .spinner-verre::before {
        content: ''; position: absolute;
        bottom: 0; left: 0; right: 0;
        background: linear-gradient(to top, #4a0e1a, #8b1a2b);
        animation: remplir-verre 5s ease-in-out infinite;
      }
      .spinner-pied { width: 2px; height: 18px; background: #e6a100; }
      .spinner-base { width: 42px; height: 2px; background: #e6a100; }
      .spinner-texte {
        color: #e6a100; font-size: 13px;
        letter-spacing: 2px; text-transform: uppercase;
        font-weight: 300;
      }
      @keyframes remplir-verre {
        0% { height: 0%; }
        40% { height: 100%; }
        55% { height: 100%; }
        100% { height: 0%; }
      }
    `;
    document.head.appendChild(style);
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
