// ============================================================
// DIONYSOS — CONFIGURATION
// Toutes les constantes du projet centralisées ici
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbyYw3vVGtKPgAOxOHrxt9deUchZDiMv0SHFTU08CkgLBFIG_8-qasvVpuTsKxl3RkonGQ/exec';
const SPREADSHEET_ID = '1Y4OCwcb2XBTPDTl_KDUGHgEiXgwqqXHmWSw6XQVSe3g';
const API_KEY = 'AIzaSyBuennUE5SMN1YkV_38JObgGYj6_aAmTSc';
const CLIENT_ID = '363308093275-13fdbai89mli8bmf8i34ck9nqe5b1eb0.apps.googleusercontent.com';

// Fonction centrale pour appeler le backend Apps Script
async function appelBackend(action, data = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: action, data: data })
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.error || 'Erreur backend');
  return json.result;
}
