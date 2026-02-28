/* ============================================================
   SCRIPTS-CONFIG.JS
   Constantes et fonction appelBackend
============================================================ */

const API_URL = 'https://script.google.com/macros/s/AKfycbxRh6eOQDUy3hXoNNKF6n6gUxhppKB452UqZuPB1mZAC_rzb1jZ5LbPsBuZDH521uq1eA/exec';

async function appelBackend(action, data = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: action, data: data })
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.error || 'Erreur backend');
  return json.result;
}
