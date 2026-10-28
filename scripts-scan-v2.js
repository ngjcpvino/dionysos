/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-SCAN-V2.JS
   Le scan, l'écran du scan, le vin inconnu, le menu d'action, Arrivée, Déplacer, Boire, Donner
============================================================ */

// ==================== LECTEUR DE CODES-BARRES (28 oct. 2026, liste 2.0 chantier 2) ====================
// zxing (zxing-wasm, fichiers rangés dans lecteur/) lit l'image de la caméra — seulement ce que montre le cadre.
// L'image est d'abord préparée (contraste étiré, puis lissée dans le sens des barres, de plus en plus fort d'une image à
// l'autre) : c'est ce qui lit le flou, le bougé et la pénombre (essais du 28 oct. : 60 images sur 60, contre 44 sans).
// Un code n'est accepté qu'après SCAN_THRESHOLD_V2 lectures identiques DE SUITE et un chiffre de contrôle valide.
// Lampe : le rond n'apparaît que si la caméra la permet. Secours : si zxing ne démarre pas, l'ancien lecteur (Quagga).
let isScanningV2 = false;
let scanSuiteV2 = { code: '', n: 0 };
const SCAN_THRESHOLD_V2 = 2;
const OPTIONS_SCAN_V2 = { formats: ['EAN-13', 'EAN-8', 'UPC-A', 'Code128'], tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, maxNumberOfSymbols: 1 };
const LISSAGES_SCAN_V2 = [0, 8, 16, 32];   // une image sur quatre de chaque : sans lissage, puis de plus en plus fort
// Le .wasm vient du site (et de la copie hors ligne), jamais d'un CDN. Objet unique : zxing ne se recharge pas à chaque scan.
const ZXING_V2 = { locateFile: function(f, prefixe) { return /\.wasm$/.test(f) ? 'lecteur/zxing_reader-3.1.6.wasm' : prefixe + f; } };
const CAMERA_INDISPONIBLE_V2 = 'Caméra indisponible — utilisez l\'entrée manuelle';
const LARGEUR_MAX_SCAN_V2 = 1280;   // au-delà, l'image est réduite avant la lecture (vitesse)
var SESSION_SCAN_V2 = 0;            // une ouverture du scanner ; un appel en retard d'une session fermée ne fait rien
var FLUX_SCAN_V2 = null;
var PASSE_SCAN_V2 = 0;
var MINUTERIE_SCAN_V2 = null;
var LAMPE_SCAN_V2 = false;

// Valide le chiffre de contrôle GTIN (EAN-8, UPC-A, EAN-13). Calcul local.
function gtinValide(code) {
  if (!/^\d+$/.test(code)) return false;
  if ([8, 12, 13, 14].indexOf(code.length) === -1) return false;
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
  oublierAjoutSuggestionV2();
  startScannerV2();
}

function startScannerV2() {
  const container = document.getElementById('scannerV2Container');
  container.style.display = 'flex';
  isScanningV2 = true;
  scanSuiteV2 = { code: '', n: 0 };
  LAMPE_SCAN_V2 = false;
  majLampeScanV2(false);
  demarrerLecteurV2(++SESSION_SCAN_V2);
}

function texteScanV2(texte) {
  const feedback = document.getElementById('scanV2-feedback');
  if (feedback) feedback.textContent = texte;
}

function demarrerLecteurV2(session) {
  var api = window.ZXingWASM;
  if (!api || !navigator.mediaDevices) { demarrerQuaggaV2(); return; }
  var module = api.prepareZXingModule({ overrides: ZXING_V2, fireImmediately: true });
  navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } }).then(function(flux) {
    if (session !== SESSION_SCAN_V2 || !isScanningV2) { couperFluxV2(flux); return; }
    FLUX_SCAN_V2 = flux;
    var zone = document.getElementById('interactiveV2');
    zone.innerHTML = '<video playsinline muted autoplay></video>';
    var video = zone.querySelector('video');
    video.srcObject = flux;
    video.play().catch(function() {});
    reglerCameraScanV2(flux);
    return module.then(function() {
      if (session !== SESSION_SCAN_V2 || !isScanningV2) return;
      boucleScanV2(session);
    }).catch(function(e) {
      // zxing ne démarre pas : l'ancien lecteur prend la relève (il ouvre sa propre caméra)
      if (session !== SESSION_SCAN_V2 || !isScanningV2) return;
      logErreurV2('Lecteur zxing indisponible, secours Quagga : ' + (e && e.message ? e.message : e), 'scan');
      couperFluxV2(FLUX_SCAN_V2);
      FLUX_SCAN_V2 = null;
      demarrerQuaggaV2();
    });
  }, function() {
    if (session === SESSION_SCAN_V2) texteScanV2(CAMERA_INDISPONIBLE_V2);
  });
}

// Mise au point en continu et rond « Lampe », si la caméra les permet
function reglerCameraScanV2(flux) {
  var piste = flux.getVideoTracks()[0];
  var possible = (piste && piste.getCapabilities) ? piste.getCapabilities() : {};
  if ((possible.focusMode || []).indexOf('continuous') !== -1) piste.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(function() {});
  majLampeScanV2(!!possible.torch);
}

function majLampeScanV2(visible) {
  var rond = document.getElementById('scanV2-lampe');
  if (!rond) return;
  rond.style.display = visible ? '' : 'none';
  rond.querySelector('.roundel-barre').textContent = LAMPE_SCAN_V2 ? 'Éteindre' : 'Lampe';
}

function basculerLampeScanV2() {
  var piste = FLUX_SCAN_V2 && FLUX_SCAN_V2.getVideoTracks()[0];
  if (!piste) return;
  var allumer = !LAMPE_SCAN_V2;
  piste.applyConstraints({ advanced: [{ torch: allumer }] }).then(function() {
    LAMPE_SCAN_V2 = allumer;
    majLampeScanV2(true);
  }).catch(function() { afficherMessage('Lampe indisponible sur cet appareil'); });
}

// La partie de l'image que montre le cadre (la vidéo le remplit en « cover »), réduite au besoin
function zoneVisibleScanV2(video) {
  var cadre = document.getElementById('interactiveV2');
  var vl = video.videoWidth, vh = video.videoHeight;
  var echelle = Math.max(cadre.clientWidth / vl, cadre.clientHeight / vh) || 1;
  var l = Math.min(vl, Math.round(cadre.clientWidth / echelle)), h = Math.min(vh, Math.round(cadre.clientHeight / echelle));
  var reduction = Math.min(1, LARGEUR_MAX_SCAN_V2 / l);
  return { x: Math.round((vl - l) / 2), y: Math.round((vh - h) / 2), l: l, h: h, lt: Math.round(l * reduction), ht: Math.round(h * reduction) };
}

function boucleScanV2(session) {
  if (session !== SESSION_SCAN_V2 || !isScanningV2) return;
  var video = document.querySelector('#interactiveV2 video');
  if (!video || video.readyState < 2 || !video.videoWidth) { MINUTERIE_SCAN_V2 = setTimeout(function() { boucleScanV2(session); }, 100); return; }
  var z = zoneVisibleScanV2(video);
  var toile = document.createElement('canvas');
  toile.width = z.lt;
  toile.height = z.ht;
  var ctx = toile.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, z.x, z.y, z.l, z.h, 0, 0, z.lt, z.ht);
  var image = etirerContrasteScanV2(ctx.getImageData(0, 0, z.lt, z.ht));
  var lissage = LISSAGES_SCAN_V2[PASSE_SCAN_V2++ % LISSAGES_SCAN_V2.length];
  if (lissage) image = etirerContrasteScanV2(lisserBarresScanV2(image, lissage));
  window.ZXingWASM.readBarcodes(image, OPTIONS_SCAN_V2).then(function(codes) {
    (codes || []).some(function(c) { return lectureScanV2(c.text); });
  }).catch(function() {}).then(function() {
    if (session === SESSION_SCAN_V2 && isScanningV2) MINUTERIE_SCAN_V2 = setTimeout(function() { boucleScanV2(session); }, 60);
  });
}

// Gris, puis contraste étiré entre le 2e et le 98e centile (pénombre, contraste faible, flou) — modifie l'image reçue
function etirerContrasteScanV2(image) {
  var d = image.data, n = d.length / 4, hist = new Uint32Array(256), i, v;
  for (i = 0; i < n; i++) { v = (d[4 * i] * 77 + d[4 * i + 1] * 150 + d[4 * i + 2] * 29) >> 8; d[4 * i] = v; hist[v]++; }
  var bas = 0, haut = 255, cumul = 0;
  for (v = 0; v < 256; v++) { cumul += hist[v]; if (cumul >= n * 0.02) { bas = v; break; } }
  for (cumul = 0, v = 255; v >= 0; v--) { cumul += hist[v]; if (cumul >= n * 0.02) { haut = v; break; } }
  var k = 255 / Math.max(1, haut - bas);
  for (i = 0; i < n; i++) { v = (d[4 * i] - bas) * k; d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = v; d[4 * i + 3] = 255; }
  return image;
}

// Moyenne VERTICALE sur 2r+1 lignes : les barres sont verticales, le bruit de la pénombre s'efface sans les brouiller
function lisserBarresScanV2(image, r) {
  var l = image.width, h = image.height, d = image.data, sortie = new ImageData(l, h), s = sortie.data;
  for (var x = 0; x < l; x++) {
    var somme = 0, y;
    for (y = -r; y <= r; y++) somme += d[4 * (Math.min(h - 1, Math.max(0, y)) * l + x)];
    for (y = 0; y < h; y++) {
      var i = 4 * (y * l + x);
      s[i] = s[i + 1] = s[i + 2] = somme / (2 * r + 1);
      s[i + 3] = 255;
      somme += d[4 * (Math.min(h - 1, y + r + 1) * l + x)] - d[4 * (Math.max(0, y - r) * l + x)];
    }
  }
  return sortie;
}

// Une lecture (des deux lecteurs) : → true si le code est accepté
function lectureScanV2(code) {
  if (!isScanningV2 || !code || !gtinValide(code)) return false;
  scanSuiteV2 = (scanSuiteV2.code === code) ? { code: code, n: scanSuiteV2.n + 1 } : { code: code, n: 1 };
  texteScanV2('Code détecté : ' + code + ' (' + scanSuiteV2.n + '/' + SCAN_THRESHOLD_V2 + ')');
  if (scanSuiteV2.n < SCAN_THRESHOLD_V2) return false;
  stopScannerV2();
  traiterResultatScanV2(code);
  return true;
}

// L'ancien lecteur, gardé en secours jusqu'après les essais en succursale
function demarrerQuaggaV2() {
  if (typeof Quagga === 'undefined') { texteScanV2(CAMERA_INDISPONIBLE_V2); return; }
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
    if (err) { texteScanV2(CAMERA_INDISPONIBLE_V2); return; }
    if (isScanningV2) Quagga.start();
  });
  Quagga.offDetected();
  Quagga.onDetected(function(result) { lectureScanV2(result && result.codeResult ? result.codeResult.code : ''); });
}

function couperFluxV2(flux) {
  if (flux) flux.getTracks().forEach(function(p) { p.stop(); });
}

function stopScannerV2() {
  isScanningV2 = false;
  SESSION_SCAN_V2++;
  clearTimeout(MINUTERIE_SCAN_V2);
  couperFluxV2(FLUX_SCAN_V2);   // éteint aussi la lampe
  FLUX_SCAN_V2 = null;
  LAMPE_SCAN_V2 = false;
  majLampeScanV2(false);
  if (typeof Quagga !== 'undefined' && Quagga.stop) {
    try { Quagga.stop(); } catch (e) {}
  }
  document.getElementById('interactiveV2').innerHTML = '';
  document.getElementById('scannerV2Container').style.display = 'none';
  texteScanV2('Alignez le code-barres dans le cadre');
}

function fermerScannerV2() {
  stopScannerV2();
  abandonnerAjoutSuggestionV2();
}

function rescannerV2() {
  scanSuiteV2 = { code: '', n: 0 };
  texteScanV2('Alignez le code-barres dans le cadre');
  if (!isScanningV2) { startScannerV2(); }
}

function entreeManuelleV2() {
  stopScannerV2();
  var champ = document.getElementById('saisieManuelleV2-champ');
  if (champ) champ.value = '';
  var champSaq = document.getElementById('saisieManuelleV2-codesaq');
  if (champSaq) champSaq.value = '';
  document.getElementById('saisieManuelleV2Container').style.display = 'flex';
  if (champ) champ.focus();
}

// Code SAQ tapé : ré-essai automatique si le 1er appel échoue (démarrage à froid / latence SAQ)
function testSAQAvecRetryV2(codeSAQ) {
  function essai() { return appelBackend('testScrapingSAQ', { codeSAQ: codeSAQ }, { spinner: 'Un instant svp' }); }
  function valide(res) { return res && res.success && res.data && (res.data.codeCUP || '').replace(/\D/g, '').trim(); }
  return essai().then(function(res) {
    return valide(res) ? res : essai();
  }).catch(function() {
    return essai();
  });
}

function validerSaisieManuelleV2() {
  var champ = document.getElementById('saisieManuelleV2-champ');
  var code = (champ ? champ.value : '').replace(/\D/g, '').trim();
  if (code) {
    if (!gtinValide(code)) {
      afficherMessage('Code-barres invalide');
      return;
    }
    document.getElementById('saisieManuelleV2Container').style.display = 'none';
    traiterResultatScanV2(code);
    return;
  }

  var champSaq = document.getElementById('saisieManuelleV2-codesaq');
  var codeSAQ = (champSaq ? champSaq.value : '').replace(/\D/g, '').trim();
  if (!codeSAQ) {
    afficherMessage('Entrez un code-barres ou un code SAQ');
    return;
  }
  testSAQAvecRetryV2(codeSAQ).then(function(res) {
    var cup = res && res.success && res.data ? (res.data.codeCUP || '').replace(/\D/g, '').trim() : '';
    if (!cup) {
      afficherMessage('Code-barres introuvable pour ce code SAQ');
      return;
    }
    document.getElementById('saisieManuelleV2Container').style.display = 'none';
    FICHE_V2_ORIGINE = null;
    appelBackend('checkWineExists', { codebarre: cup }, { spinner: 'Vérification' }).then(function(result) {
      if (result.exists) {
        if (suggestionsV2Attente) {
          terminerAjoutSuggestionV2(cup, result);
          return;
        }
        ouvrirMenuActionV2(cup, result);
      } else if (suggestionsV2Attente) {
        creerVinSAQV2(cup, codeSAQ);
      } else {
        afficherVinInconnuV2(cup, codeSAQ);
      }
    }).catch(function() {
      retourAccueilV2();
    });
  }).catch(function() {
    afficherMessage('Erreur, réessayez');
  });
}

function fermerSaisieManuelleV2() {
  document.getElementById('saisieManuelleV2Container').style.display = 'none';
  abandonnerAjoutSuggestionV2();
}

function traiterResultatScanV2(code) {
  FICHE_V2_ORIGINE = null;
  // Vin connu : la mémoire répond tout de suite (le béton des succursales ne bloque plus le scan),
  // puis la réponse fraîche du serveur remplace la mémoire en douce si le réseau répond.
  var memoire = wineResultDepuisMemoireV2(code);
  if (memoire) {
    code = codePrincipalV2(code); // un code secondaire (autre millésime) : la suite parle du code de la fiche
    if (suggestionsV2Attente) {
      terminerAjoutSuggestionV2(code, memoire);
      return;
    }
    ouvrirMenuActionV2(code, memoire);
    if (memoire.wine.aime === 'Non') afficherMessageImage('images/ne-pas-racheter.svg');
    majMenuDepuisReseauV2(code, memoire);
    return;
  }
  // Pas dans ma cave, mais dans l'inventaire de la succursale (chargé avec la Liste d'achat) : réponse sans réseau
  var produit = suggestionsV2Attente ? null : produitInventaireParCodeV2(code);
  // … et c'est un de mes vins sous un autre code-barres (même code SAQ) : mon vin, pas « Vin inconnu »
  if (produit && vinParCodeSAQV2(produit.codeSAQ) && ouvrirMonVinAutreCodeV2(code, vinParCodeSAQV2(produit.codeSAQ))) return;
  if (produit) {
    afficherVinInconnuV2(code, produit.codeSAQ, produit);
    verifierVinScanneEnFondV2(code);
    return;
  }
  chercherVinScanneV2(code, false).catch(function() { vinInconnuSansReseauV2(code); });
}

// Page remplie depuis l'inventaire : si le serveur répond que ce code-barres est en fait un de mes vins
// (code secondaire, absent de la mémoire), on passe au menu d'action.
function verifierVinScanneEnFondV2(code) {
  appelBackend('checkWineExists', { codebarre: code }, { spinner: '' }).then(function(result) {
    if (!result || !result.exists || !vinInconnuAttendV2(code)) return;
    document.getElementById('vinInconnuV2Container').style.display = 'none';
    ouvrirMenuActionV2(code, result);
  }).catch(function() {});
}

// Menu ouvert depuis la mémoire : si le serveur répond, on prend sa réponse ; on ne redessine que si les bouteilles ont changé.
function majMenuDepuisReseauV2(code, memoire) {
  appelBackend('checkWineExists', { codebarre: code }, { spinner: '' }).then(function(result) {
    var menu = document.getElementById('menuActionV2Overlay');
    if (!result || !result.exists || !menuActionV2Context || menuActionV2Context.code !== code) return;
    var resume = function(r) { return (r.bottles || []).map(function(b) { return b.meuble + '-' + b.rangee + '-' + b.espace + '-' + b.statut; }).sort().join('|'); };
    if (menu && menu.style.display !== 'none' && resume(result) !== resume(memoire)) {
      ouvrirMenuActionV2(code, result);
    } else {
      menuActionV2Context.wineResult = result;
    }
  }).catch(function() {});
}

// Vin absent de la mémoire : on demande au serveur. fond = réessai sans sablier pendant que la page 😠 attend.
// Rejette sur une panne de réseau (l'appelant décide : page 😠 ou nouvel essai).
function chercherVinScanneV2(code, fond) {
  return appelBackend('checkWineExists', { codebarre: code }, { spinner: fond ? '' : 'Vérification', timeout: 15000 }).then(function(result) {
    if (fond && !vinInconnuAttendV2(code)) return;
    if (result && result.exists) {
      document.getElementById('vinInconnuV2Container').style.display = 'none';
      if (suggestionsV2Attente) {
        terminerAjoutSuggestionV2(code, result);
        return;
      }
      ouvrirMenuActionV2(code, result);
      if (result.wine && result.wine.aime === 'Non') afficherMessageImage('images/ne-pas-racheter.svg');
      return;
    }
    return ouvrirVinInconnuV2(code, fond);
  });
}

var vinInconnuV2Code = null;
var vinInconnuV2Saq = null;      // fiche SAQ du vin inconnu affiché (nom, origine) — sert d'en-tête à l'Arrivée du « + »
var VIN_INCONNU_V2_ESSAI = null; // minuterie du réessai sans réseau

// Remplit l'en-tête de la page « Vin inconnu » avec ce que dit la SAQ (nom + origine), puis le bloc du scan
// et la Dégustation en bas. produit (facultatif) = l'inventaire de la succursale : rien à demander au réseau.
function remplirEnteteVinInconnuV2(codeSAQ, produit) {
  var titre = document.getElementById('vinInconnuV2-titre');
  var sous = document.getElementById('vinInconnuV2-soustitre');
  var nomInput = document.getElementById('vinInconnuV2-nom');
  var bloc = document.getElementById('vinInconnuV2-scan');
  var degustation = document.getElementById('vinInconnuV2-degustation');
  if (!titre || !sous) return;
  if (bloc) bloc.innerHTML = ''; // jamais le bloc du vin scanné avant
  if (degustation) degustation.innerHTML = '';
  vinInconnuV2Saq = null;
  SCAN_V2_COURANT = null;
  if (!codeSAQ) {
    titre.textContent = 'Vin inconnu';
    sous.textContent = "Ce vin n'est pas dans ta cave";
    if (nomInput) nomInput.style.display = '';
    return;
  }
  if (nomInput) nomInput.style.display = 'none';
  if (produit) {
    appliquerFicheSaqVinInconnuV2(codeSAQ, {
      nom: produit.nom, pays: produit.pays, region: produit.region, appellation: produit.appellation, cepages: produit.cepage,
      aromes: produit.aromes, acidite: produit.acidite, sucrosite: produit.sucrosite, corps: produit.corps, bouche: produit.bouche,
      sucre: produit.sucre, alcool: produit.alcool, temperature: produit.temperature, bois: produit.bois
    });
    return;
  }
  appelBackend('testScrapingSAQ', { codeSAQ: codeSAQ }, { spinner: '' }).then(function(res) {
    // Réponse d'un scan précédent arrivée en retard : on ne la mélange pas au vin affiché
    if ((document.getElementById('vinInconnuV2-codesaq').value || '').replace(/\D/g, '').trim() !== codeSAQ.toString().trim()) return;
    if (res && res.success && res.data) appliquerFicheSaqVinInconnuV2(codeSAQ, res.data);
  }).catch(function() {});
}

// d = fiche SAQ (noms de lireFicheSAQ — l'inventaire de la succursale porte les mêmes) : en-tête, bloc du scan, Dégustation
function appliquerFicheSaqVinInconnuV2(codeSAQ, d) {
  vinInconnuV2Saq = { codeSAQ: codeSAQ.toString().trim(), nom: d.nom || '', pays: d.pays || '', region: d.region || '', appellation: d.appellation || '' };
  document.getElementById('vinInconnuV2-titre').textContent = decodeHTML((d.nom || 'Vin inconnu').toString());
  var org = [d.pays, d.region, d.appellation, d.cepages].filter(Boolean).map(function(x) { return decodeHTML(x.toString()); }).join(' · ');
  document.getElementById('vinInconnuV2-soustitre').textContent = org || "Ce vin n'est pas dans ta cave";
  rendreBlocsScanV2({ prefixe: 'vinInconnu', cb: vinInconnuV2Code, codeSAQ: codeSAQ, appellation: d.appellation, cepage: cepageDominant({ Cepage: d.cepages || '' }), provenance: 'vininconnu' });
  var portrait = { 'Arômes': d.aromes, 'Acidité': d.acidite, 'Sucrosité': d.sucrosite, Corps: d.corps, Bouche: d.bouche, Sucre: d.sucre, Alcool: d.alcool, Temperature: d.temperature, Bois: d.bois };
  var degustation = document.getElementById('vinInconnuV2-degustation');
  var aDuPortrait = Object.keys(portrait).some(function(k) { return !!portrait[k]; });
  if (degustation) degustation.innerHTML = aDuPortrait ? sectionDegustationV2(portrait) : '';
}

// Ouvre (ou remplit) la page « Vin inconnu » pour ce code-barres et ce code SAQ (vide si la SAQ ne le connaît pas).
// produit (facultatif) : l'inventaire de la succursale, qui remplit la page sans réseau.
function afficherVinInconnuV2(code, codeSAQ, produit) {
  var page = document.getElementById('vinInconnuV2Container');
  var dejaOuverte = page.style.display !== 'none' && vinInconnuV2Code === code;
  vinInconnuV2Code = code;
  document.getElementById('vinInconnuV2-codebarre-champ').value = code;
  document.getElementById('vinInconnuV2-codesaq').value = codeSAQ || '';
  if (!dejaOuverte) document.getElementById('vinInconnuV2-nom').value = ''; // garde un nom tapé pendant l'attente
  remplirEnteteVinInconnuV2(codeSAQ || '', produit);
  page.style.display = 'flex';
}

// Rejette sur une panne de réseau (voir chercherVinScanneV2).
function ouvrirVinInconnuV2(code, fond) {
  vinInconnuV2Code = code;
  return appelBackend('chercherProduitSAQ_GRAPHQL_V1', { codebarre: code }, { spinner: fond ? '' : 'Un instant svp', timeout: 15000 }).then(function(codeSAQ) {
    if (fond && !vinInconnuAttendV2(code)) return;
    clearTimeout(VIN_INCONNU_V2_ESSAI);
    // la SAQ dit que c'est un de mes vins (même code SAQ) sous un autre code-barres : mon vin, jamais un 2e vin créé
    var mien = codeSAQ ? vinParCodeSAQV2(codeSAQ) : null;
    if (mien && ouvrirMonVinAutreCodeV2(code, mien)) return;
    if (codeSAQ && suggestionsV2Attente) {
      document.getElementById('vinInconnuV2Container').style.display = 'none';
      creerVinSAQV2(code, codeSAQ);
      return;
    }
    afficherVinInconnuV2(code, codeSAQ || '');
  });
}

// Le code-barres scanné n'est pas sur ma fiche, mais la SAQ (ou l'inventaire de la succursale) dit que c'est le même
// vin (même code SAQ) qu'un des miens (28 oct. 2026) : on ouvre MON vin — ou on y ajoute la proposition — et on retient
// ce code-barres sur sa fiche, pour qu'il soit reconnu tout de suite la prochaine fois, même sans réseau.
function ouvrirMonVinAutreCodeV2(code, w) {
  var principal = (w['Code-barres'] || '').toString().trim();
  var result = principal ? wineResultDepuisMemoireV2(principal) : null;
  if (!result) return false;
  document.getElementById('vinInconnuV2Container').style.display = 'none';
  if (suggestionsV2Attente) {
    terminerAjoutSuggestionV2(principal, result);
  } else {
    ouvrirMenuActionV2(principal, result);
    if (result.wine.aime === 'Non') afficherMessageImage('images/ne-pas-racheter.svg');
    else afficherMessage('Même vin, autre code-barres');
  }
  retenirCodeBarreV2(principal, code);
  return true;
}

// Feu-et-oublie : un serveur pas redéployé répond « Action inconnue » et rien ne change (le vin s'ouvre quand même)
function retenirCodeBarreV2(principal, code) {
  appelBackend('ajouterCodeBarre', { codebarre: principal, nouveau: code }, { spinner: '' }).then(function(res) {
    if (!res || !res.success) return;
    // la mémoire l'apprend aussi : reconnu au prochain scan, même sans réseau
    (ALL_DATA || []).forEach(function(i) {
      if (!memeCodeV2(i['Code-barres'], principal)) return;
      var liste = codesBarresDuVinV2(i);
      if (!liste.some(function(c) { return memeCodeV2(c, code); })) i['Codes-barres'] = liste.concat([code]).join(',');
    });
  }).catch(function() {});
}

// Ni en mémoire ni de réseau : la page s'ouvre quand même, fâchée, et réessaie seule tant qu'elle reste ouverte.
function vinInconnuSansReseauV2(code) {
  afficherVinInconnuV2(code, '');
  document.getElementById('vinInconnuV2-titre').textContent = '😠';
  document.getElementById('vinInconnuV2-soustitre').textContent = 'Pas de réseau — je réessaie…';
  reessayerVinInconnuV2(code);
}

function reessayerVinInconnuV2(code) {
  clearTimeout(VIN_INCONNU_V2_ESSAI);
  VIN_INCONNU_V2_ESSAI = setTimeout(function() {
    if (!vinInconnuAttendV2(code)) return;
    chercherVinScanneV2(code, true).catch(function(e) {
      if (e && e.message === 'Mot de passe incorrect') return; // l'écran du mot de passe est rouvert : on arrête
      reessayerVinInconnuV2(code);
    });
  }, 5000);
}

// Vrai tant que la page « Vin inconnu » est ouverte sur ce code-barres
function vinInconnuAttendV2(code) {
  var page = document.getElementById('vinInconnuV2Container');
  return vinInconnuV2Code === code && !!page && page.style.display !== 'none';
}

function fermerVinInconnuV2() {
  clearTimeout(VIN_INCONNU_V2_ESSAI);
  document.getElementById('vinInconnuV2Container').style.display = 'none';
  abandonnerAjoutSuggestionV2();
}

// ==================== ÉCRAN DU SCAN : sommeliers · Curieux Bégin · Comparables ====================
// Sous l'origine du menu d'action (vin connu) et de la page « Vin inconnu » : même rendu aux deux endroits.
// scan = { prefixe, cb, codeSAQ, appellation, cepage, provenance } — conteneur `prefixe + 'V2-scan'`.
// Le vin scanné ne compte jamais dans Comparables ; les propositions non plus (jamais achetées).
var SCAN_V2_COURANT = null;

function rendreBlocsScanV2(scan) {
  var div = document.getElementById(scan.prefixe + 'V2-scan');
  if (!div) return;
  SCAN_V2_COURANT = scan;
  var saq = (scan.codeSAQ || '').toString().trim();
  var html = '';

  // Sommeliers (lecture seule), puis Curieux Bégin : le plat et la saison → la recette
  var cites = '';
  if (saq) {
    (ALL_SUGGESTIONS || []).filter(function(s) { return (s.codeSAQ || '').toString().trim() === saq; }).forEach(function(s) {
      cites += '<div class="citation"><span class="color-primary">' + (s.sommelier || '—') + '</span>' +
        (s.note ? '<span class="citation-texte">« ' + s.note + ' »</span>' : '') + '</div>';
    });
    cites += citationCurieuxBeginV2(saq);
  }
  if (cites) html += '<div class="citations">' + cites + '</div>';

  // Comparables : même appellation, même cépage PRINCIPAL (comme le filtre de la cave) — « vins-bouteilles »
  var app = decodeHTML((scan.appellation || '').toString()).trim();
  var cep = decodeHTML((scan.cepage || '').toString()).replace(/\d+\s*%/g, '').trim();
  var groupes = grouperVinsV2((ALL_DATA || []).filter(function(w) {
    if (estPropositionV2(w)) return false;
    if (saq && (w['Code SAQ'] || '').toString().trim() === saq) return false;
    return !(scan.cb && memeCodeV2(w['Code-barres'], scan.cb));
  }));
  var lignes = [];
  if (app) lignes.push({ libelle: 'Appellation ' + app, vins: groupes.filter(function(g) { return memeTexteV2(decodeHTML((g.wine.Appellation || '').toString()), app); }) });
  if (cep) lignes.push({ libelle: 'Cépage ' + annoterCepagesV2(cep), vins: groupes.filter(function(g) { return memeCepageV2(cepageDominant(g.wine), cep); }) });
  if (lignes.length) {
    var p = scan.prefixe;
    html += '<div class="section"><h3 class="titre-2">Comparables</h3><div class="menu-liste ouvert">';
    lignes.forEach(function(l, i) {
      var btl = l.vins.reduce(function(t, g) { return t + (g.count || 0); }, 0);
      var libelle = l.libelle + ' — ' + l.vins.length + '-' + btl;
      if (!l.vins.length) { html += '<div class="item-liste multiligne">' + libelle + '</div>'; return; }
      // ceux qui ont des bouteilles d'abord, puis (voilés) ceux déjà eus
      var tries = l.vins.filter(function(g) { return g.count > 0; }).concat(l.vins.filter(function(g) { return !g.count; }));
      html += '<div class="item-liste multiligne" id="' + p + 'V2-comp-' + i + '-titre" onclick="basculerComparablesV2(\'' + p + '\', ' + i + ')">' + libelle + '</div>';
      html += '<div id="' + p + 'V2-comp-' + i + '" style="display:none;">' + tries.map(function(g) { return carteGroupeVinV2(g, scan.provenance); }).join('') + '</div>';
    });
    html += '</div></div>';
  }
  div.innerHTML = html;
  if (saq && ALL_CURIEUXBEGIN === null) chargerCurieuxBeginScanV2();
}

// Une seule liste de Comparables ouverte à la fois
function basculerComparablesV2(prefixe, quel) {
  [0, 1].forEach(function(k) {
    var volet = document.getElementById(prefixe + 'V2-comp-' + k);
    var titre = document.getElementById(prefixe + 'V2-comp-' + k + '-titre');
    if (!volet) return;
    var ouvrir = (k === quel) && volet.style.display === 'none';
    volet.style.display = ouvrir ? '' : 'none';
    if (titre) titre.classList.toggle('actif', ouvrir);
  });
}

// Le bloc « Curieux Bégin » d'un vin : le plat et la saison → la recette. Écran du scan, et « Bingo ! » de la Facture SAQ.
function citationCurieuxBeginV2(saq, titre) {
  var plats = platsCurieuxBeginV2(saq);
  if (!plats.length) return '';
  return '<div class="citation"><span class="color-primary">' + (titre || 'Curieux Bégin') + '</span>' + plats.map(function(a) {
    var url = 'https://cuisinez.telequebec.tv/recettes/' + a.recetteId + '/' + a.slug;
    var saison = a.saison ? ' — Saison ' + a.saison + (a.episode ? '-' + a.episode : '') : '';
    return '<span class="citation-texte" onclick="window.open(\'' + url + '\', \'_blank\')">' + decodeHTML(a.plat || '') + saison + '</span>';
  }).join('') + '</div>';
}

// Recettes Curieux Bégin où ce vin a été proposé (par code SAQ), la saison la plus récente d'abord
function platsCurieuxBeginV2(codeSAQ) {
  return (ALL_CURIEUXBEGIN || []).filter(function(a) { return (a.codeSAQ || '').toString().trim() === codeSAQ; }).sort(function(a, b) {
    return (numeroCbV2(b.saison) - numeroCbV2(a.saison)) || (numeroCbV2(b.episode) - numeroCbV2(a.episode));
  });
}

// Curieux Bégin n'est chargé qu'à la demande : on le charge en fond, et on redessine seulement si ce vin y figure
var CB_SCAN_V2_EN_COURS = false;
var CB_SCAN_V2_APRES = [];   // à faire une fois chargé (ex. le bingo de la Facture SAQ)
function chargerCurieuxBeginScanV2(apres) {
  if (apres) CB_SCAN_V2_APRES.push(apres);
  if (CB_SCAN_V2_EN_COURS) return;
  CB_SCAN_V2_EN_COURS = true;
  appelBackend('getCurieuxBegin', {}, { spinner: '' }).then(function(data) {
    CB_SCAN_V2_EN_COURS = false;
    ALL_CURIEUXBEGIN = data || [];
    var apresChargement = CB_SCAN_V2_APRES; CB_SCAN_V2_APRES = [];
    apresChargement.forEach(function(f) { f(); });
    var s = SCAN_V2_COURANT;
    var div = s ? document.getElementById(s.prefixe + 'V2-scan') : null;
    var page = div ? div.closest('.modal-v2-fullscreen') : null;
    if (s && page && page.style.display !== 'none' && platsCurieuxBeginV2((s.codeSAQ || '').toString().trim()).length) rendreBlocsScanV2(s);
  }).catch(function() { CB_SCAN_V2_EN_COURS = false; CB_SCAN_V2_APRES = []; });
}

// Une proposition (💡) n'a jamais été achetée : son « Racheter » est vide (le Statut 'Suggestion' n'existe pas dans les données)
function estPropositionV2(w) {
  return !((w && w.Racheter) || '').toString().trim();
}

function creerVinSAQV2(code, codeSAQ, mode) {
  appelBackend('ajouterVinAvecBouteilles', { codebarre: code, codeSAQ: codeSAQ, note: '', bouteilles: '[]', nom: '' }, { spinner: 'Un instant svp' }).then(function(res) {
    if (res && res.success) {
      enchainerMenuApresCreationV2(code, mode);
    } else {
      retourAccueilV2((res && res.message) ? res.message : 'Création refusée par le serveur');
    }
  }).catch(function(e) {
    retourAccueilV2('Création impossible : ' + (e && e.message ? e.message : 'erreur inconnue'));
  });
}

function enchainerMenuApresCreationV2(code, mode) {
  appelBackend('checkWineExists', { codebarre: code }, { spinner: 'Un instant svp' }).then(function(result) {
    return appelBackend('getInventoryData', {}, { spinner: 'Un instant svp' }).then(function(data) {
      if (data) ALL_DATA = data;
      return result;
    }).catch(function() { return result; });
  }).then(function(result) {
    document.getElementById('vinInconnuV2Container').style.display = 'none';
    if (!result || !result.exists) {
      retourAccueilV2('Le vin ne s\'est pas inscrit dans le Sheet — rien n\'a été créé');
      return;
    }
    if (mode === 'achat') {
      menuActionV2Context = { code: code, wineResult: result };
      cacherToutesPagesV2();
      ouvrirApresTap(ouvrirArriveeV2);
      return;
    }
    // mode « suggestion » : vin non acheté → ouvrir la fiche + le choix du sommelier et sa note
    appelBackend('updateWineField', { codebarre: code, field: 'Racheter', value: '' }, { spinner: '' }).then(function() {
      majMemoireVinV2(code, { 'Racheter': '' });
      terminerAjoutSuggestionV2(code, result);
    }).catch(function() {
      terminerAjoutSuggestionV2(code, result);
    });
  }).catch(function(e) {
    retourAccueilV2('Vérification impossible : ' + (e && e.message ? e.message : 'erreur inconnue'));
  });
}

function terminerAjoutSuggestionV2(code, wineResult) {
  oublierAjoutSuggestionV2();
  var codeSAQ = (wineResult && wineResult.wine && wineResult.wine.codeSAQ) ? wineResult.wine.codeSAQ.toString().trim() : '';
  cacherToutesPagesV2();
  ouvrirApresTap(function() {
    ouvrirFicheV2(code, 'suggestions');
    if (codeSAQ) {
      ouvrirSuggestionAjoutV2(codeSAQ, 'fiche');
    } else {
      afficherMessage('Aucun code SAQ : proposition non ajoutée');
    }
  });
}

// Fermé en cours de route (scanner, saisie manuelle, vin inconnu, erreur) : retour aux Propositions, avec le message.
// Vrai si un ajout était en cours (l'appelant s'arrête là).
function abandonnerAjoutSuggestionV2(message) {
  if (!suggestionsV2Attente) return false;
  oublierAjoutSuggestionV2();
  cacherToutesPagesV2();
  if (message) afficherMessage(message);
  ouvrirApresTap(ouvrirSuggestionsV2);
  return true;
}

// Le parcours a pris une autre route (scan de l'accueil, menu, bouteille mise en cave) : ce n'est plus une proposition
function oublierAjoutSuggestionV2() {
  suggestionsV2Attente = false;
}

function voirSAQVinInconnuV2() {
  var code = (document.getElementById('vinInconnuV2-codebarre-champ').value || '').replace(/\D/g, '').trim() || vinInconnuV2Code || '';
  if (!code) { afficherMessage('Code-barres manquant'); return; }
  window.open('https://www.saq.com/fr/catalogsearch/result/?q=' + code.padStart(14, '0'), '_blank');
}

function creerVinManuelV2(mode) {
  var code = (document.getElementById('vinInconnuV2-codebarre-champ').value || '').replace(/\D/g, '').trim();
  if (!gtinValide(code)) {
    afficherMessage('Code-barres invalide');
    return;
  }
  vinInconnuV2Code = code;
  var codeSAQ = (document.getElementById('vinInconnuV2-codesaq').value || '').replace(/\D/g, '').trim();
  var nom = (document.getElementById('vinInconnuV2-nom').value || '').trim();

  // « + » (achat) : l'Arrivée s'ouvre sans rien créer ; « 💡 » (proposition) : le vin s'inscrit tout de suite, sans bouteille
  function suite(saq) {
    if (mode === 'achat') { arriveeVinNeufV2(code, saq, saq ? '' : nom); return; }
    document.getElementById('vinInconnuV2Container').style.display = 'none';
    if (saq) creerVinSAQV2(code, saq, mode); else creerVinNomV2(code, nom, mode);
  }

  if (codeSAQ) { suite(codeSAQ); return; }

  appelBackend('chercherProduitSAQ_GRAPHQL_V1', { codebarre: code }, { spinner: 'Un instant svp' }).then(function(codeTrouve) {
    if (codeTrouve) { suite(codeTrouve); return; }
    if (nom) { suite(''); return; }
    afficherMessage('Toujours introuvable — entrez un code SAQ ou un nom');
  }).catch(function() {
    if (nom) { suite(''); return; }
    afficherMessage('Toujours introuvable — entrez un code SAQ ou un nom');
  });
}

// « + » d'un vin inconnu : l'Arrivée s'ouvre sans rien créer. Le vin ne s'inscrit qu'à la confirmation
// de l'emplacement (ajouterBouteilleArrivee) ; annuler ramène à la page du vin inconnu (fermerArriveeV2).
function arriveeVinNeufV2(code, codeSAQ, nom) {
  var d = (vinInconnuV2Saq && codeSAQ && vinInconnuV2Saq.codeSAQ === codeSAQ.toString().trim()) ? vinInconnuV2Saq : {};
  menuActionV2Context = {
    code: code,
    wineResult: { exists: false, count: 0, bottles: [], wine: { nom: d.nom || nom || 'Nouveau vin', pays: d.pays || '', region: d.region || '', appellation: d.appellation || '' } },
    nouveau: { codeSAQ: codeSAQ || '', nom: nom || '' }
  };
  naviguerV2(ouvrirArriveeV2);
}

function creerVinNomV2(code, nom, mode) {
  document.getElementById('vinInconnuV2Container').style.display = 'none';
  appelBackend('ajouterVinAvecBouteilles', { codebarre: code, codeSAQ: '', note: '', bouteilles: '[]', nom: nom }, { spinner: 'Un instant svp' }).then(function(res) {
    if (res && res.success) {
      enchainerMenuApresCreationV2(code, mode);
    } else {
      retourAccueilV2((res && res.message) ? res.message : 'Création refusée par le serveur');
    }
  }).catch(function(e) {
    retourAccueilV2('Création impossible : ' + (e && e.message ? e.message : 'erreur inconnue'));
  });
}

let menuActionV2Context = null;

function barcodeDepuisSAQV2(codeSAQ) {
  var saq = (codeSAQ || '').toString().trim();
  var item = (ALL_DATA || []).filter(function(i) { return (i['Code SAQ'] || '').toString().trim() === saq; })[0];
  return item ? (item['Code-barres'] || '').toString().trim() : '';
}

function ouvrirMenuActionV2(code, wineResult) {
  menuActionV2Context = { code: code, wineResult: wineResult };
  const w = (wineResult && wineResult.wine) ? wineResult.wine : {};
  document.getElementById('menuActionV2-nom').textContent = decodeHTML(w.nom || 'Vin inconnu');
  
  var origineEl = document.getElementById('menuActionV2-origine');
  if (origineEl) origineEl.textContent = [w.pays, w.region, w.appellation].filter(Boolean).map(decodeHTML).join(' • ');

  // Sommeliers · Curieux Bégin · Comparables (repli sur la mémoire pour ce que le serveur ne renvoie pas)
  var mem = (ALL_DATA || []).filter(function(i) { return memeCodeV2(i['Code-barres'], code); })[0] || {};
  rendreBlocsScanV2({ prefixe: 'menuAction', cb: code, codeSAQ: w.codeSAQ || mem['Code SAQ'] || '', appellation: w.appellation || mem.Appellation || '',
    cepage: cepageDominant({ Cepage: w.cepage || mem.Cepage || '' }), provenance: 'comparable' });

  var photoEl = document.getElementById('menuActionV2-photo');
  if (photoEl) {
    if (w.photoURL) {
      photoEl.innerHTML = '<img src="' + w.photoURL + '" alt="" onerror="this.parentNode.style.display=\'none\'">';
      photoEl.style.display = 'flex';
    } else {
      photoEl.innerHTML = '';
      photoEl.style.display = 'none';
    }
  }

  var bottlesMenu = (wineResult && wineResult.bottles) ? wineResult.bottles : [];
  var activesMenu = bottlesMenu.filter(function(b) { return b.statut !== 'Bu' && b.statut !== 'Sorti'; });
  var empEl = document.getElementById('menuActionV2-emplacements');
  if (empEl) {
    empEl.textContent = activesMenu.map(function(b) {
      return (b.meuble && b.rangee && b.espace) ? (b.meuble + '-' + b.rangee + '-' + b.espace) : 'À ranger';
    }).sort(comparerEmplacementsV2).join(' · ');
  }

  var nbActives = (wineResult && typeof wineResult.count === 'number') ? wineResult.count : 0;
  ['menuV2-deplacer', 'menuV2-boire', 'menuV2-donner'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('desactive', nbActives === 0);
  });
  var oeil = document.getElementById('menuV2-visualiser');
  if (oeil) oeil.classList.toggle('desactive', !!FICHE_V2_ORIGINE);

  document.getElementById('menuActionV2Overlay').style.display = 'flex';
}

function partagerVinV2() {
  var r = menuActionV2Context && menuActionV2Context.wineResult;
  var nom = (r && r.wine && r.wine.nom) ? decodeHTML(r.wine.nom) : '';
  var code = menuActionV2Context ? (menuActionV2Context.code || '').toString().trim() : '';
  var item = (ALL_DATA || []).filter(function(i){ return memeCodeV2(i['Code-barres'], code); })[0];
  var codeSAQ = item ? (item['Code SAQ'] || '').toString().trim() : '';
  var texte = nom + (codeSAQ ? ' saq://products/' + codeSAQ : '');
  window.location.href = 'sms:&body=' + encodeURIComponent(texte);
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

// Toutes les pages (.modal-v2-fullscreen), lues dans la page — sauf l'écran du mot de passe (voulu). Une page
// nouvelle est donc cachée d'office : plus de liste à tenir à la main.
function cacherToutesPagesV2() {
  Array.prototype.forEach.call(document.querySelectorAll('.modal-v2-fullscreen:not(#secretV2Container)'), function(el) {
    el.style.display = 'none';
  });
  fermerMenuBurgerV2();
}

function retourAccueilV2(message) {
  var texte = message || 'Un problème est survenu, veuillez recommencer';
  logErreurV2(texte, 'retourAccueil');
  if (abandonnerAjoutSuggestionV2(texte)) return;
  cacherToutesPagesV2();
  menuActionV2Context = null;
  afficherMessage(texte);
}

function menuV2Click(action) {
  var nbActives = (menuActionV2Context && menuActionV2Context.wineResult && typeof menuActionV2Context.wineResult.count === 'number') ? menuActionV2Context.wineResult.count : 0;
  if (nbActives === 0 && (action === 'deplacer' || action === 'boire' || action === 'donner')) {
    afficherMessage('Aucune bouteille en stock');
    return;
  }
  if (action === 'visualiser') {
    const code = menuActionV2Context ? menuActionV2Context.code : CURRENT_WINE_CODEBARRE;
    naviguerV2(function() { ouvrirFicheV2(code, 'menuScan'); });
    return;
  }
  if (action === 'arrivee') { naviguerV2(ouvrirArriveeV2); return; }
  if (action === 'deplacer') { naviguerV2(ouvrirDeplacerV2); return; }
  if (action === 'boire') { naviguerV2(ouvrirBoireV2); return; }
  if (action === 'donner') { naviguerV2(ouvrirDonnerV2); return; }
}

var arriveeV2Choix = { meuble: '', rangee: '', espace: '' };

// Espaces occupés d'une rangée donnée (inventaire en mémoire, statut actif)
function espacesOccupesV2(meuble, rangee) {
  var occupes = [];
  (ALL_DATA || []).forEach(function(item) {
    var statut = item.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti' || statut === 'Suggestion') return;
    if (String(item.Meuble) === String(meuble) && String(item.Rangee) === String(rangee) && item.Espace) {
      occupes.push(String(item.Espace));
    }
  });
  return occupes;
}

// Une rangée a-t-elle au moins une place libre ?
function rangeeALibre(meuble, rangee) {
  var tous = (CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) ? CONFIG.meubles[meuble][rangee] : [];
  var occ = espacesOccupesV2(meuble, rangee);
  return tous.some(function(e) { return occ.indexOf(String(e)) === -1; });
}

// Un meuble a-t-il au moins une place libre ?
function meubleALibre(meuble) {
  var rangees = CONFIG.meubles[meuble] ? Object.keys(CONFIG.meubles[meuble]) : [];
  return rangees.some(function(r) { return rangeeALibre(meuble, r); });
}

// Le libellé d'un roundel de placement et son rond de coche vont toujours ensemble :
// le texte montre la valeur choisie (ou le nom du champ), le rond n'est coché que si
// une valeur est prise. Vaut pour Ajouter et pour Déplacer.
// Une ligne de choix d'un écran de placement : le libellé + le rond vide de la Liste
// d'achat, coché sur la valeur déjà prise. Montre qu'il FAUT choisir.
function ligneChoixPlacementV2(valeur, appel, choisi) {
  return '<div class="item-liste choix-placement' + (choisi ? ' actif' : '') + '" onclick="' + appel + '">' +
         '<span>' + valeur + '</span>' +
         '<span class="coche-panier' + (choisi ? ' actif' : '') + '"></span></div>';
}

function majBarrePlacementV2(prefixe, champ, valeur, defaut) {
  var barre = document.getElementById(prefixe + '-' + champ + '-barre');
  if (barre) barre.textContent = valeur || defaut;
  var coche = document.getElementById(prefixe + '-' + champ + '-coche');
  if (coche) coche.classList.toggle('actif', !!valeur);
}

// ==================== LE CHOIX D'UN EMPLACEMENT (28 oct. 2026, liste 2.0 chantier 4) ====================
// Un seul sélecteur Meuble → Rangée → Espace pour l'Arrivée et le Déplacer (prefixe 'arriveeV2' / 'deplacerV2') :
// seules les places libres sont proposées ; l'espace choisi est revérifié au serveur (l'autre téléphone a pu le
// prendre) — pris : l'inventaire frais et la liste des espaces rouverte ; libre : l'écran pose la bouteille.
var PLACEMENTS_V2 = {
  arriveeV2: { choix: function() { return arriveeV2Choix; }, poser: function(c) { ajouterBouteilleArrivee(c.meuble, c.rangee, c.espace); } },
  deplacerV2: { choix: function() { return deplacerV2Choix; }, poser: function(c) { deplacerBouteilleV2(c); } }
};
var LIBELLES_PLACEMENT_V2 = { meuble: 'Meuble', rangee: 'Rangée', espace: 'Espace' };

function meublesLibresV2() {
  return ((CONFIG && CONFIG.meubles) ? Object.keys(CONFIG.meubles) : []).filter(meubleALibre).sort(function(a, b) { return a.localeCompare(b); });
}
function rangeesLibresV2(meuble) {
  return (CONFIG.meubles[meuble] ? Object.keys(CONFIG.meubles[meuble]) : []).filter(function(r) { return rangeeALibre(meuble, r); })
    .sort(function(a, b) { return parseInt(a) - parseInt(b); });
}
function espacesLibresV2(meuble, rangee) {
  var occ = espacesOccupesV2(meuble, rangee);
  return ((CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) ? CONFIG.meubles[meuble][rangee] : [])
    .filter(function(e) { return occ.indexOf(String(e)) === -1; }).sort(function(a, b) { return parseInt(a) - parseInt(b); });
}
// Une liste de choix (meubles, rangées ou espaces), la valeur prise cochée
function menuPlacementV2(prefixe, champ, valeurs) {
  var pris = PLACEMENTS_V2[prefixe].choix()[champ];
  document.getElementById(prefixe + '-' + champ + '-menu').innerHTML = valeurs.map(function(v) {
    return ligneChoixPlacementV2(v, 'choisirPlacementV2(&quot;' + prefixe + '&quot;, &quot;' + champ + '&quot;, &quot;' + v + '&quot;)', String(pris) === String(v));
  }).join('');
}
// Le rond d'une liste l'ouvre (et referme les deux autres) ; le retaper la referme
function basculerListePlacementV2(prefixe, champ) {
  Object.keys(LIBELLES_PLACEMENT_V2).forEach(function(t) {
    document.getElementById(prefixe + '-' + t + '-menu').classList.toggle('ouvert', t === champ && !document.getElementById(prefixe + '-' + t + '-menu').classList.contains('ouvert'));
  });
}
function choisirPlacementV2(prefixe, champ, valeur) {
  var c = PLACEMENTS_V2[prefixe].choix();
  c[champ] = valeur;
  majBarrePlacementV2(prefixe, champ, valeur, LIBELLES_PLACEMENT_V2[champ]);
  document.getElementById(prefixe + '-' + champ + '-menu').classList.remove('ouvert');
  if (champ === 'espace') { verifierEtPoserPlacementV2(prefixe); return; }
  c.espace = '';
  majBarrePlacementV2(prefixe, 'espace', '', 'Espace');
  if (champ === 'rangee') { menuPlacementV2(prefixe, 'espace', espacesLibresV2(c.meuble, valeur)); return; }
  c.rangee = '';
  majBarrePlacementV2(prefixe, 'rangee', '', 'Rangée');
  var aRanger = document.getElementById(prefixe + '-aranger');   // Déplacer : « À ranger » tant qu'aucun meuble n'est choisi
  if (aRanger) aRanger.style.display = 'none';
  menuPlacementV2(prefixe, 'rangee', rangeesLibresV2(valeur));
  document.getElementById(prefixe + '-espace-menu').innerHTML = '';
}
function verifierEtPoserPlacementV2(prefixe) {
  var c = PLACEMENTS_V2[prefixe].choix();
  appelBackend('checkLocationAvailable', { meuble: c.meuble, rangee: c.rangee, espace: c.espace }, { spinner: 'Vérification' }).then(function(result) {
    if (result.available) { PLACEMENTS_V2[prefixe].poser(c); return; }
    afficherMessage('Occupé par : ' + result.message);
    return appelBackend('getInventoryData', {}).then(function(data) {
      if (data) ALL_DATA = data;
      c.espace = '';
      majBarrePlacementV2(prefixe, 'espace', '', 'Espace');
      menuPlacementV2(prefixe, 'espace', espacesLibresV2(c.meuble, c.rangee));
      document.getElementById(prefixe + '-espace-menu').classList.add('ouvert');
    });
  }).catch(function(err) {
    afficherMessage('Vérification de l\'espace impossible : ' + (err && err.message ? err.message : err));
  });
}

function ouvrirArriveeV2() {
  if (!menuActionV2Context) return;
  construireArriveeV2();
}

function construireArriveeV2() {
  if (!menuActionV2Context) return;
  arriveeV2Choix = { meuble: '', rangee: '', espace: '' };

  rendreEnteteActionV2('arrivee');

  var nbActives = (menuActionV2Context.wineResult && typeof menuActionV2Context.wineResult.count === 'number') ? menuActionV2Context.wineResult.count : 0;
  if (nbActives >= 5) {
    afficherMessage('Maximum atteint (5 bouteilles)');
    document.getElementById('arriveeV2Container').style.display = 'none';
    if (menuActionV2Context) ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
    return;
  }

  majBarrePlacementV2('arriveeV2', 'meuble', '', 'Meuble');
  majBarrePlacementV2('arriveeV2', 'rangee', '', 'Rangée');
  majBarrePlacementV2('arriveeV2', 'espace', '', 'Espace');

  menuPlacementV2('arriveeV2', 'meuble', meublesLibresV2());
  document.getElementById('arriveeV2-meuble-menu').classList.remove('ouvert');
  document.getElementById('arriveeV2-rangee-menu').innerHTML = '';
  document.getElementById('arriveeV2-rangee-menu').classList.remove('ouvert');
  document.getElementById('arriveeV2-espace-menu').innerHTML = '';
  document.getElementById('arriveeV2-espace-menu').classList.remove('ouvert');

  document.getElementById('arriveeV2Container').style.display = 'flex';
}

function fermerArriveeV2() {
  document.getElementById('arriveeV2Container').style.display = 'none';
  if (menuActionV2Context && menuActionV2Context.nouveau) {
    // « + » annulé : rien n'a été écrit, retour au vin inconnu (qui reprend ses réessais s'il attendait le réseau)
    menuActionV2Context = null;
    document.getElementById('vinInconnuV2Container').style.display = 'flex';
    if (document.getElementById('vinInconnuV2-titre').textContent === '😠' && vinInconnuV2Code) reessayerVinInconnuV2(vinInconnuV2Code);
    return;
  }
  if (menuActionV2Context) {
    ouvrirMenuActionV2(menuActionV2Context.code, menuActionV2Context.wineResult);
  }
}

function arriveeARangerV2() {
  ajouterBouteilleArrivee('', '', '');
}



// ==================== DÉPLACER V2 ====================
var deplacerV2Choix = { row: 0, bottle: 0, meuble: '', rangee: '', espace: '' };

function ouvrirDeplacerV2() {
  if (!menuActionV2Context) return;
  construireDeplacerV2();
}

function construireDeplacerV2() {
  if (!menuActionV2Context) return;
  deplacerV2Choix = { row: 0, bottle: 0, meuble: '', rangee: '', espace: '' };

  rendreEnteteActionV2('deplacer');

  majBarrePlacementV2('deplacerV2', 'meuble', '', 'Meuble');
  majBarrePlacementV2('deplacerV2', 'rangee', '', 'Rangée');
  majBarrePlacementV2('deplacerV2', 'espace', '', 'Espace');
  document.getElementById('deplacerV2-meuble-menu').innerHTML = '';
  document.getElementById('deplacerV2-rangee-menu').innerHTML = '';
  document.getElementById('deplacerV2-espace-menu').innerHTML = '';
  document.getElementById('deplacerV2-aranger').style.display = '';

  var bottles = (menuActionV2Context.wineResult && menuActionV2Context.wineResult.bottles) ? menuActionV2Context.wineResult.bottles : [];

  var rowVin = menuActionV2Context.wineResult.row;
  if (bottles.length === 1) {
    deplacerV2Choix.row = bottles[0].row || rowVin;
    deplacerV2Choix.bottle = bottles[0].bottle;
    document.getElementById('deplacerV2-choix-bouteille').style.display = 'none';
    document.getElementById('deplacerV2-destination').style.display = 'block';
    menuPlacementV2('deplacerV2', 'meuble', meublesLibresV2());
  } else {
    var menu = document.getElementById('deplacerV2-bouteille-menu');
    menu.innerHTML = bottles.map(function(b) {
      var emp = (b.meuble && b.rangee && b.espace) ? (b.meuble + '-' + b.rangee + '-' + b.espace) : 'À ranger';
      return '<div class="item-liste" onclick="choisirBouteilleDeplacer(' + (b.row || rowVin) + ',' + b.bottle + ')">' + emp + '</div>';
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
  menuPlacementV2('deplacerV2', 'meuble', meublesLibresV2());
}

// Déplacer : la pose (après la vérification de l'espace), puis l'inventaire et la bouteille frais
function deplacerBouteilleV2(c) {
  appelBackend('actionBouteille', { row: c.row, action: 'deplacer', bottle: c.bottle, meuble: c.meuble, rangee: c.rangee, espace: c.espace }, { spinner: 'Déplacement' }).then(function() {
    afficherMessage('Bouteille déplacée');
    return appelBackend('getInventoryData', {}, { spinner: 'Déplacement' }).then(function(data) {
      if (data) ALL_DATA = data;
      return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code }, { spinner: 'Déplacement' }).then(function(result) {
        if (result) menuActionV2Context.wineResult = result;
        fermerDeplacerV2();
      });
    });
  }).catch(function(err) {
    retourAccueilV2('Déplacement : ' + (err && err.message ? err.message : err));
  });
}

function deplacerARangerV2() {
  var c = deplacerV2Choix;
  if (c.meuble) return;
  appelBackend('mettreBotteilleARanger', { row: c.row, bottle: c.bottle }, { spinner: 'Mise à ranger' }).then(function() {
    afficherMessage('Bouteille mise à ranger');
    return appelBackend('getInventoryData', {}, { spinner: 'Mise à ranger' }).then(function(data) {
      if (data) ALL_DATA = data;
      return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code }, { spinner: 'Mise à ranger' }).then(function(result) {
        if (result) menuActionV2Context.wineResult = result;
        fermerDeplacerV2();
      });
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
  var w = (r && r.wine) ? r.wine : {};
  var nom = w.nom || 'Vin';
  document.getElementById(prefixe + 'V2-nom').textContent = decodeHTML(nom);
  var origine = [w.pays, w.region, w.appellation].filter(Boolean).map(decodeHTML).join(' • ');
  var el = document.getElementById(prefixe + 'V2-origine');
  if (el) el.textContent = origine;
}

// ---------- BOIRE ----------
var BOIRE_V2_NOTE_INITIALE = '';
var BOIRE_V2_ACCORDS_INITIAUX = '';
var BOIRE_V2_EN_COURS = false;

function ouvrirBoireV2() {
  if (!menuActionV2Context) return;
  construireBoireV2();
}

function construireBoireV2() {
  actionV2Choix = { row: menuActionV2Context.wineResult.row, bottle: 0, note: 0 };
  rendreEnteteActionV2('boire');
  document.getElementById('boireV2-plat').value = '';
  var codeBoire = (menuActionV2Context.code || '').toString().trim();
var itemBoire = (ALL_DATA || []).filter(function(i) { return memeCodeV2(i['Code-barres'], codeBoire); })[0];
  BOIRE_V2_NOTE_INITIALE = itemBoire ? decodeHTML((itemBoire['Notes temporaires'] || '').toString()) : '';
  document.getElementById('boireV2-notes').value = BOIRE_V2_NOTE_INITIALE;
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
  BOIRE_V2_ACCORDS_INITIAUX = accordsSelectionnesBoireV2().join(', ');
  majAccordsDisplayBoireV2();
}

function accordsSelectionnesBoireV2() {
  return Array.prototype.map.call(document.querySelectorAll('#boireV2-accords-menu .item-liste.actif'), function(el) { return el.getAttribute('data-accord'); });
}

function toggleAccordBoireV2(el) {
  el.classList.toggle('actif');
  majAccordsDisplayBoireV2();
}

function majAccordsDisplayBoireV2() {
  var sel = accordsSelectionnesBoireV2();
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
  if (BOIRE_V2_EN_COURS) return;
  var plat = document.getElementById('boireV2-plat').value.trim();
  if (plat !== '' && actionV2Choix.note === 0) { afficherMessage('Choisissez une appréciation'); return; }
  var accords = accordsSelectionnesBoireV2();
  BOIRE_V2_EN_COURS = true;
  appelBackend('actionBouteille', { row: actionV2Choix.row, action: 'boire', bottle: actionV2Choix.bottle, plat: plat, bonAccord: actionV2Choix.note }, { spinner: 'Santé' }).then(function() {
    if (accords.join(', ') !== BOIRE_V2_ACCORDS_INITIAUX) {
      return appelBackend('updateWineField', { codebarre: menuActionV2Context.code, field: 'Accords', value: accords.join(', ') }, { spinner: 'Santé' });
    }
  }).then(function() {
    var noteBoire = document.getElementById('boireV2-notes').value.trim();
    if (noteBoire !== BOIRE_V2_NOTE_INITIALE.trim()) {
      return appelBackend('updateWineField', { codebarre: menuActionV2Context.code, field: 'Notes temporaires', value: noteBoire });
    }
  }).then(function() {
    return appelBackend('getInventoryData', {}, { spinner: 'Santé' });
  }).then(function(data) {
    if (data) ALL_DATA = data;
    return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code }, { spinner: 'Santé' });
  }).then(function(result) {
    if (result) menuActionV2Context.wineResult = result;
    ALL_HISTORIQUE = [];
    cacherToutesPagesV2();
    menuActionV2Context = null;
    afficherMessage('Santé');
  }).catch(function() { retourAccueilV2(); }).then(function() { BOIRE_V2_EN_COURS = false; });
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
  construireDonnerV2();
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
    return appelBackend('getInventoryData', {}, { spinner: 'Don' });
  }).then(function(data) {
    if (data) ALL_DATA = data;
    return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code }, { spinner: 'Don' });
  }).then(function(result) {
    if (result) menuActionV2Context.wineResult = result;
    cacherToutesPagesV2();
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

function ajouterBouteilleArrivee(meuble, rangee, espace) {
  var code = menuActionV2Context ? menuActionV2Context.code : null;
  if (!code) { afficherMessage('Vin introuvable'); return; }
  oublierAjoutSuggestionV2(); // une bouteille entre en cave : c'est un achat (le « + » d'un vin inconnu), plus une proposition
  // Vin neuf (« + » du vin inconnu) : c'est ici, et seulement ici, qu'il s'inscrit — avec sa bouteille
  var neuf = menuActionV2Context.nouveau;
  var appel = neuf
    ? appelBackend('ajouterVinAvecBouteilles', { codebarre: code, codeSAQ: neuf.codeSAQ, note: '', bouteilles: JSON.stringify([{ meuble: meuble, rangee: rangee, espace: espace }]), nom: neuf.nom }, { spinner: 'Mise en cave' })
    : appelBackend('addBottle', { codebarre: code, meuble: meuble, rangee: rangee, espace: espace }, { spinner: 'Mise en cave' });
  appel.then(function(res) {
    if (res && res.success === false) {
      afficherMessage(res.message || 'Ajout refusé');
      return null;
    }
    return appelBackend('getInventoryData', {}, { spinner: 'Mise en cave' });
  }).then(function(data) {
    if (data === null) return;
    if (data) ALL_DATA = data;
    cacherToutesPagesV2();
    menuActionV2Context = null;
    afficherMessage('Bouteille ajoutée');
  }).catch(function() {
    retourAccueilV2();
  });
}
