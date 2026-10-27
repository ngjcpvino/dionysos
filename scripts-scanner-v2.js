/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-SCANNER-V2.JS
   Refonte du scan — V2 en parallèle de la V1
============================================================ */

let isScanningV2 = false;
let scanConfirmationsV2 = {};
const SCAN_THRESHOLD_V2 = 3;

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
  suggestionsV2Attente = false;
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

function fermerScannerV2() {
  stopScannerV2();
  if (suggestionsV2Attente) {
    suggestionsV2Attente = false;
    cacherToutesPagesV2();
    ouvrirApresTap(ouvrirSuggestionsV2);
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
  if (suggestionsV2Attente) {
    suggestionsV2Attente = false;
    cacherToutesPagesV2();
    ouvrirApresTap(ouvrirSuggestionsV2);
  }
}

function traiterResultatScanV2(code) {
  FICHE_V2_ORIGINE = null;
  // Vin connu : la mémoire répond tout de suite (le béton des succursales ne bloque plus le scan),
  // puis la réponse fraîche du serveur remplace la mémoire en douce si le réseau répond.
  var memoire = wineResultDepuisMemoireV2(code);
  if (memoire) {
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
    if (codeSAQ && suggestionsV2Attente) {
      document.getElementById('vinInconnuV2Container').style.display = 'none';
      creerVinSAQV2(code, codeSAQ);
      return;
    }
    afficherVinInconnuV2(code, codeSAQ || '');
  });
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
  if (suggestionsV2Attente) {
    suggestionsV2Attente = false;
    cacherToutesPagesV2();
    ouvrirApresTap(ouvrirSuggestionsV2);
  }
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
    var plats = platsCurieuxBeginV2(saq);
    if (plats.length) {
      cites += '<div class="citation"><span class="color-primary">Curieux Bégin</span>' + plats.map(function(a) {
        var url = 'https://cuisinez.telequebec.tv/recettes/' + a.recetteId + '/' + a.slug;
        var saison = a.saison ? ' — Saison ' + a.saison + (a.episode ? '-' + a.episode : '') : '';
        return '<span class="citation-texte" onclick="window.open(\'' + url + '\', \'_blank\')">' + decodeHTML(a.plat || '') + saison + '</span>';
      }).join('') + '</div>';
    }
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
  if (cep) lignes.push({ libelle: 'Cépage ' + cep, vins: groupes.filter(function(g) { return memeTexteV2(decodeHTML(cepageDominant(g.wine)), cep); }) });
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

// Recettes Curieux Bégin où ce vin a été proposé (par code SAQ), la saison la plus récente d'abord
function platsCurieuxBeginV2(codeSAQ) {
  return (ALL_CURIEUXBEGIN || []).filter(function(a) { return (a.codeSAQ || '').toString().trim() === codeSAQ; }).sort(function(a, b) {
    return (numeroCbV2(b.saison) - numeroCbV2(a.saison)) || (numeroCbV2(b.episode) - numeroCbV2(a.episode));
  });
}

// Curieux Bégin n'est chargé qu'à la demande : on le charge en fond, et on redessine seulement si ce vin y figure
var CB_SCAN_V2_EN_COURS = false;
function chargerCurieuxBeginScanV2() {
  if (CB_SCAN_V2_EN_COURS) return;
  CB_SCAN_V2_EN_COURS = true;
  appelBackend('getCurieuxBegin', {}, { spinner: '' }).then(function(data) {
    CB_SCAN_V2_EN_COURS = false;
    ALL_CURIEUXBEGIN = data || [];
    var s = SCAN_V2_COURANT;
    var div = s ? document.getElementById(s.prefixe + 'V2-scan') : null;
    var page = div ? div.closest('.modal-v2-fullscreen') : null;
    if (s && page && page.style.display !== 'none' && platsCurieuxBeginV2((s.codeSAQ || '').toString().trim()).length) rendreBlocsScanV2(s);
  }).catch(function() { CB_SCAN_V2_EN_COURS = false; });
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
  suggestionsV2Attente = false;
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

function codeSAQDepuisBarcodeV2(code) {
  var item = (ALL_DATA || []).filter(function(i) { return memeCodeV2(i['Code-barres'], code); })[0];
  return item ? (item['Code SAQ'] || '').toString().trim() : '';
}

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

function cacherToutesPagesV2() {
  ['scannerV2Container', 'saisieManuelleV2Container', 'vinInconnuV2Container', 'menuActionV2Overlay', 'arriveeV2Container', 'deplacerV2Container', 'boireV2Container', 'donnerV2Container', 'caveV2Container', 'aRangerV2Container', 'sansCepageV2Container', 'suggestionsV2Container', 'suggestionEditV2Overlay', 'histoV2Container', 'histoAjoutV2Overlay', 'histoEditV2Overlay', 'empV2Container', 'achatV2Container', 'rechercheV2Container', 'editFicheV2Overlay', 'ficheV2Overlay', 'photoV2Overlay', 'corrigerRecetteV2Overlay', 'recuV2Container', 'recuValidationV2Container', 'chartierV2Container', 'selonSaqV2Container', 'curieuxBeginV2Container', 'notesV2Container', 'noteEditV2Overlay'].forEach(function(id) {

    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  fermerMenuBurgerV2();
}

function retourAccueilV2(message) {
  var texte = message || 'Un problème est survenu, veuillez recommencer';
  logErreurV2(texte, 'retourAccueil');
  if (suggestionsV2Attente) {
    suggestionsV2Attente = false;
    cacherToutesPagesV2();
    afficherMessage(texte);
    ouvrirApresTap(ouvrirSuggestionsV2);
    return;
  }
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
function espacesOccupesArrivee(meuble, rangee) {
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
  var occ = espacesOccupesArrivee(meuble, rangee);
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

  var menuMeuble = document.getElementById('arriveeV2-meuble-menu');
  var meubles = (CONFIG && CONFIG.meubles) ? Object.keys(CONFIG.meubles) : [];
  meubles = meubles.filter(function(m) { return meubleALibre(m); });
  meubles.sort(function(a, b) { return a.localeCompare(b); });
  menuMeuble.innerHTML = meubles.map(function(m) {
    return ligneChoixPlacementV2(m, 'choisirMeubleArrivee(&quot;' + m + '&quot;)', arriveeV2Choix.meuble === m);
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
  majBarrePlacementV2('arriveeV2', 'meuble', meuble, 'Meuble');
  document.getElementById('arriveeV2-meuble-menu').classList.remove('ouvert');
  majBarrePlacementV2('arriveeV2', 'rangee', '', 'Rangée');
  majBarrePlacementV2('arriveeV2', 'espace', '', 'Espace');

  var rangees = (CONFIG.meubles[meuble]) ? Object.keys(CONFIG.meubles[meuble]) : [];
  rangees = rangees.filter(function(r) { return rangeeALibre(meuble, r); });
  rangees.sort(function(a, b) { return parseInt(a) - parseInt(b); });
  document.getElementById('arriveeV2-rangee-menu').innerHTML = rangees.map(function(r) {
    return ligneChoixPlacementV2(r, 'choisirRangeeArrivee(&quot;' + r + '&quot;)', String(arriveeV2Choix.rangee) === String(r));
  }).join('');
  document.getElementById('arriveeV2-espace-menu').innerHTML = '';
}

function choisirRangeeArrivee(rangee) {
  arriveeV2Choix.rangee = rangee;
  arriveeV2Choix.espace = '';
  majBarrePlacementV2('arriveeV2', 'rangee', rangee, 'Rangée');
  document.getElementById('arriveeV2-rangee-menu').classList.remove('ouvert');
  majBarrePlacementV2('arriveeV2', 'espace', '', 'Espace');

  var meuble = arriveeV2Choix.meuble;
  var espaces = (CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) ? CONFIG.meubles[meuble][rangee] : [];
  var occ = espacesOccupesArrivee(meuble, rangee);
  espaces = espaces.filter(function(e) { return occ.indexOf(String(e)) === -1; });
  espaces.sort(function(a, b) { return parseInt(a) - parseInt(b); });
  document.getElementById('arriveeV2-espace-menu').innerHTML = espaces.map(function(e) {
    return ligneChoixPlacementV2(e, 'choisirEspaceArrivee(&quot;' + e + '&quot;)', String(arriveeV2Choix.espace) === String(e));
  }).join('');
}

function choisirEspaceArrivee(espace) {
  arriveeV2Choix.espace = espace;
  majBarrePlacementV2('arriveeV2', 'espace', espace, 'Espace');
  document.getElementById('arriveeV2-espace-menu').classList.remove('ouvert');

  var c = arriveeV2Choix;
  appelBackend('checkLocationAvailable', { meuble: c.meuble, rangee: c.rangee, espace: c.espace }, { spinner: 'Vérification' }).then(function(result) {
    if (!result.available) {
      afficherMessage('Occupé par : ' + result.message);
      return appelBackend('getInventoryData', {}).then(function(data) {
        if (data) ALL_DATA = data;
        arriveeV2Choix.espace = '';
        majBarrePlacementV2('arriveeV2', 'espace', '', 'Espace');
        var occ = espacesOccupesArrivee(c.meuble, c.rangee);
        var espaces = (CONFIG.meubles[c.meuble] && CONFIG.meubles[c.meuble][c.rangee]) ? CONFIG.meubles[c.meuble][c.rangee] : [];
        espaces = espaces.filter(function(e) { return occ.indexOf(String(e)) === -1; });
        espaces.sort(function(a, b) { return parseInt(a) - parseInt(b); });
        var menu = document.getElementById('arriveeV2-espace-menu');
        menu.innerHTML = espaces.map(function(e) {
          return ligneChoixPlacementV2(e, 'choisirEspaceArrivee(&quot;' + e + '&quot;)', false);
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
    construireMeublesDeplacer();
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
  construireMeublesDeplacer();
}

function construireMeublesDeplacer() {
  var meubles = (CONFIG && CONFIG.meubles) ? Object.keys(CONFIG.meubles) : [];
  meubles = meubles.filter(function(m) { return meubleALibre(m); });
  meubles.sort(function(a, b) { return a.localeCompare(b); });
  document.getElementById('deplacerV2-meuble-menu').innerHTML = meubles.map(function(m) {
    return ligneChoixPlacementV2(m, 'choisirMeubleDeplacer(&quot;' + m + '&quot;)', deplacerV2Choix.meuble === m);
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
  document.getElementById('deplacerV2-aranger').style.display = 'none';
  majBarrePlacementV2('deplacerV2', 'meuble', meuble, 'Meuble');
  document.getElementById('deplacerV2-meuble-menu').classList.remove('ouvert');
  majBarrePlacementV2('deplacerV2', 'rangee', '', 'Rangée');
  majBarrePlacementV2('deplacerV2', 'espace', '', 'Espace');
  document.getElementById('deplacerV2-espace-menu').innerHTML = '';

  var rangees = (CONFIG.meubles[meuble]) ? Object.keys(CONFIG.meubles[meuble]) : [];
  rangees = rangees.filter(function(r) { return rangeeALibre(meuble, r); });
  rangees.sort(function(a, b) { return parseInt(a) - parseInt(b); });
  document.getElementById('deplacerV2-rangee-menu').innerHTML = rangees.map(function(r) {
    return ligneChoixPlacementV2(r, 'choisirRangeeDeplacer(&quot;' + r + '&quot;)', String(deplacerV2Choix.rangee) === String(r));
  }).join('');
}

function choisirRangeeDeplacer(rangee) {
  deplacerV2Choix.rangee = rangee;
  deplacerV2Choix.espace = '';
  majBarrePlacementV2('deplacerV2', 'rangee', rangee, 'Rangée');
  document.getElementById('deplacerV2-rangee-menu').classList.remove('ouvert');
  majBarrePlacementV2('deplacerV2', 'espace', '', 'Espace');

  var meuble = deplacerV2Choix.meuble;
  var espaces = (CONFIG.meubles[meuble] && CONFIG.meubles[meuble][rangee]) ? CONFIG.meubles[meuble][rangee] : [];
  var occ = espacesOccupesArrivee(meuble, rangee);
  espaces = espaces.filter(function(e) { return occ.indexOf(String(e)) === -1; });
  espaces.sort(function(a, b) { return parseInt(a) - parseInt(b); });
  document.getElementById('deplacerV2-espace-menu').innerHTML = espaces.map(function(e) {
    return ligneChoixPlacementV2(e, 'choisirEspaceDeplacer(&quot;' + e + '&quot;)', String(deplacerV2Choix.espace) === String(e));
  }).join('');
}

function choisirEspaceDeplacer(espace) {
  deplacerV2Choix.espace = espace;
  majBarrePlacementV2('deplacerV2', 'espace', espace, 'Espace');
  document.getElementById('deplacerV2-espace-menu').classList.remove('ouvert');

  var c = deplacerV2Choix;
  appelBackend('checkLocationAvailable', { meuble: c.meuble, rangee: c.rangee, espace: c.espace }, { spinner: 'Vérification' }).then(function(result) {
    if (!result.available) {
      afficherMessage('Occupé par : ' + result.message);
      return appelBackend('getInventoryData', {}).then(function(data) {
        if (data) ALL_DATA = data;
        c.espace = '';
        majBarrePlacementV2('deplacerV2', 'espace', '', 'Espace');
        var espaces = (CONFIG.meubles[c.meuble] && CONFIG.meubles[c.meuble][c.rangee]) ? CONFIG.meubles[c.meuble][c.rangee] : [];
        var occ = espacesOccupesArrivee(c.meuble, c.rangee);
        espaces = espaces.filter(function(e) { return occ.indexOf(String(e)) === -1; });
        espaces.sort(function(a, b) { return parseInt(a) - parseInt(b); });
        var menu = document.getElementById('deplacerV2-espace-menu');
        menu.innerHTML = espaces.map(function(e) {
          return ligneChoixPlacementV2(e, 'choisirEspaceDeplacer(&quot;' + e + '&quot;)', false);
        }).join('');
        menu.classList.add('ouvert');
      });
    }
  appelBackend('actionBouteille', { row: c.row, action: 'deplacer', bottle: c.bottle, meuble: c.meuble, rangee: c.rangee, espace: c.espace }, { spinner: 'Déplacement' }).then(function() {
      afficherMessage('Bouteille déplacée');
      return appelBackend('getInventoryData', {}, { spinner: 'Déplacement' }).then(function(data) {
        if (data) ALL_DATA = data;
        return appelBackend('checkWineExists', { codebarre: menuActionV2Context.code }, { spinner: 'Déplacement' }).then(function(result) {
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

// ==================== CAVE À VIN V2 ====================
function ouvrirCaveV2() {
  document.getElementById('caveV2Container').style.display = 'flex';
  remonterScrollV2('caveV2Container');
  var dispoBtn = document.getElementById('caveV2-dispo');
  if (dispoBtn) { dispoBtn.classList.toggle('actif', filtresCaveV2.dispo); dispoBtn.textContent = filtresCaveV2.dispo ? '✓' : '✗'; }
  remplirFiltresCaveV2();
  appliquerFiltresCaveV2();
}

function fermerCaveV2() {
  fermerFiltresCaveV2();
  document.getElementById('caveV2Container').style.display = 'none';
  reinitialiserFiltresCaveV2();
}

// ==================== À RANGER V2 ====================
function ouvrirARangerV2() {
  document.getElementById('aRangerV2Container').style.display = 'flex';
  remonterScrollV2('aRangerV2Container');
  afficherCartesARangerV2();
}

function fermerARangerV2() {
  document.getElementById('aRangerV2Container').style.display = 'none';
}

function afficherCartesARangerV2() {
  var aRanger = (ALL_DATA || []).filter(function(i) {
    var statut = i.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti' || statut === 'Suggestion') return false;
    return !(i.Meuble && i.Rangee && i.Espace);
  });
  var div = document.getElementById('aRangerV2-cartes');
  var groups = grouperVinsV2(aRanger);
  document.getElementById('aRangerV2-compte').textContent = groups.length + ' vin' + (groups.length > 1 ? 's' : '');
  if (groups.length === 0) { div.innerHTML = '<div class="texte-secondaire">Tout est bien rangé</div>'; return; }
  div.innerHTML = groups.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var sous = sousVinV2(w);
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="deplacerDepuisARangerV2(\'' + g.cb + '\')"' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
  }).join('');
}

function deplacerDepuisARangerV2(code) {
  var result = wineResultDepuisMemoireV2(code);
  if (!result) { afficherMessage('Vin introuvable'); return; }
  menuActionV2Context = { code: code, wineResult: result, retour: 'aranger' };
  naviguerV2(ouvrirDeplacerV2);
}

// ==================== SANS CÉPAGE V2 ====================
function ouvrirSansCepageV2() {
  document.getElementById('sansCepageV2Container').style.display = 'flex';
  remonterScrollV2('sansCepageV2Container');
  afficherCartesSansCepageV2();
}

function fermerSansCepageV2() {
  document.getElementById('sansCepageV2Container').style.display = 'none';
}

function afficherCartesSansCepageV2() {
    var sansCepage = (ALL_DATA || []).filter(function(i) {
    return !(i.Cepage || '').toString().trim() && i.Couleur !== 'Spiritueux';
  });

  var div = document.getElementById('sansCepageV2-cartes');
  var groups = grouperVinsV2(sansCepage);
  document.getElementById('sansCepageV2-compte').textContent = groups.length + ' vin' + (groups.length > 1 ? 's' : '');
  if (groups.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucun vin sans cépage</div>'; return; }
  div.innerHTML = groups.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var pays = w.Pays || '';
    var region = w.Region || '';
    var sous = (pays && region) ? (pays + ' • ' + region) : (pays || region);
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + g.cb + '\', \'sanscepage\')})"' : '';
    var vide = g.count === 0 ? ' carte-vide' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
  }).join('');
}

// ==================== SUGGESTIONS V2 ====================
var filtresSuggestionsV2 = { sommelier: '', couleur: '', cave: false };
var suggestionsV2Attente = false;

function ouvrirSuggestionsV2() {
  document.getElementById('suggestionsV2Container').style.display = 'flex';
  remonterScrollV2('suggestionsV2Container');
  filtresSuggestionsV2 = { sommelier: '', couleur: '', cave: false };
  var champTexte = document.getElementById('suggestionsV2-f-texte');
  if (champTexte) champTexte.value = '';
  remplirFiltresSuggestionsV2();
  afficherSuggestionsV2();
  chargerPromosMesV2();   // en fond : les prix promo remplacent les prix réguliers à l'arrivée
}

function fermerSuggestionsV2() {
  fermerFiltresSuggestionsV2();
  document.getElementById('suggestionsV2Container').style.display = 'none';
}

function ouvrirFiltresSuggestionsV2() { clicLoupeV2('suggestionsV2', reinitialiserFiltresSuggestionsV2); }
function fermerFiltresSuggestionsV2() {
  document.getElementById('suggestionsV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('suggestionsV2-filtres').classList.remove('ouvert');
}

function saqInfosV2() {
  var infos = {};
  (ALL_DATA || []).forEach(function(d) {
    var saq = (d['Code SAQ'] || '').toString().trim();
    if (saq && !infos[saq]) infos[saq] = d;
  });
  return infos;
}

function remplirFiltresSuggestionsV2() {
  var f = filtresSuggestionsV2;
  var vusSom = {};
  var sommeliers = [];
  (ALL_SUGGESTIONS || []).forEach(function(s) {
    var v = (s.sommelier || '').toString().trim();
    var k = normaliserRechercheV2(v);
    if (v && !vusSom[k]) { vusSom[k] = true; sommeliers.push(v); }
  });
  sommeliers.sort(function(a, b) { return a.localeCompare(b); });
  var menuSom = document.getElementById('suggestionsV2-f-sommelier-menu');
  if (menuSom) {
    menuSom.innerHTML = sommeliers.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(v, f.sommelier) + '" onclick="choisirFiltreSuggestionsV2(\'sommelier\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
  }
  var dispSom = document.getElementById('suggestionsV2-f-sommelier-display');
  if (dispSom) dispSom.textContent = libelleChoixV2(f.sommelier, 'Sommelier');

  var couleurs = uniqueValeursAchat(ALL_DATA || [], 'Couleur');
  var menuCoul = document.getElementById('suggestionsV2-f-couleur-menu');
  if (menuCoul) {
    menuCoul.innerHTML = couleurs.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(v, f.couleur) + '" onclick="choisirFiltreSuggestionsV2(\'couleur\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
  }
  var dispCoul = document.getElementById('suggestionsV2-f-couleur-display');
  if (dispCoul) dispCoul.textContent = libelleChoixV2(f.couleur, 'Couleur');

  var btnCave = document.getElementById('suggestionsV2-cave');
  if (btnCave) { btnCave.classList.toggle('actif', f.cave); btnCave.textContent = f.cave ? '✓' : '✗'; }
}

function basculerFiltreSuggestionsV2(cle) {
  var menu = document.getElementById('suggestionsV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['sommelier', 'couleur'].forEach(function(k) {
    document.getElementById('suggestionsV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreSuggestionsV2(cle, valeur) {
  filtresSuggestionsV2[cle] = cycleFiltreV2(filtresSuggestionsV2[cle], valeur);
  document.getElementById('suggestionsV2-f-' + cle + '-menu').classList.remove('ouvert');
  remplirFiltresSuggestionsV2();
  afficherSuggestionsV2();
}

function toggleCaveSuggestionsV2() {
  filtresSuggestionsV2.cave = !filtresSuggestionsV2.cave;
  remplirFiltresSuggestionsV2();
  afficherSuggestionsV2();
}

function reinitialiserFiltresSuggestionsV2() {
  filtresSuggestionsV2 = { sommelier: '', couleur: '', cave: false };
  var champ = document.getElementById('suggestionsV2-f-texte');
  if (champ) champ.value = '';
  ['sommelier', 'couleur'].forEach(function(k) {
    document.getElementById('suggestionsV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  remplirFiltresSuggestionsV2();
  afficherSuggestionsV2();
  fermerFiltresSuggestionsV2();
}

function bouteillesEnCaveParSAQV2(codeSAQ) {
  var saq = (codeSAQ || '').toString().trim();
  return (ALL_DATA || []).some(function(i) {
    var statut = i.Statut || 'En stock';
    return (i['Code SAQ'] || '').toString().trim() === saq && i.bottle && i.bottle > 0 && statut !== 'Bu' && statut !== 'Sorti';
  });
}

// Vrai si le vin (par code-barres) a au moins une bouteille active en cave
function vinEnCaveV2(codebarre) {
  var cb = (codebarre || '').toString().trim();
  return (ALL_DATA || []).some(function(i) {
    var statut = i.Statut || 'En stock';
    return memeCodeV2(i['Code-barres'], cb) && i.bottle && i.bottle > 0 && statut !== 'Bu' && statut !== 'Sorti';
  });
}

function afficherSuggestionsV2() {
  var f = filtresSuggestionsV2;
  var champTexte = document.getElementById('suggestionsV2-f-texte');
  var texte = normaliserRechercheV2(champTexte ? champTexte.value.trim() : '');
  var infos = saqInfosV2();

  var loupeS = document.getElementById('suggestionsV2-loupe');
  if (loupeS) loupeS.classList.toggle('actif', !!(f.sommelier || f.couleur || f.cave || texte));

  var base = (ALL_SUGGESTIONS || []).filter(function(s) {
    if (!passeFiltreV2(f.sommelier, s.sommelier)) return false;
    if (texte && normaliserRechercheV2(s.note).indexOf(texte) === -1) return false;
    var info = infos[s.codeSAQ] || {};
    if (!passeFiltreV2(f.couleur, info.Couleur)) return false;
    if (f.cave && !bouteillesEnCaveParSAQV2(s.codeSAQ)) return false;
    return true;
  });

  var grouped = {};
  base.forEach(function(s) {
    if (!grouped[s.codeSAQ]) grouped[s.codeSAQ] = { codeSAQ: s.codeSAQ, wine: infos[s.codeSAQ] || {}, items: [] };
    grouped[s.codeSAQ].items.push(s);
  });
  var groupes = Object.values(grouped);

  var div = document.getElementById('suggestionsV2-cartes');
  document.getElementById('suggestionsV2-compte').textContent = groupes.length + ' vin' + (groupes.length > 1 ? 's' : '');
  if (groupes.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucune proposition</div>'; return; }

  div.innerHTML = groupes.map(groupeSuggestionV2).join('');
}

// Un vin + ses propositions : même bloc sur la page Propositions et dans la recherche.
function groupeSuggestionV2(g) {
  var w = g.wine;
  var cb = (w['Code-barres'] || '').toString().trim();
  var nom = decodeHTML(w.Nom || '—');
  var sous = sousVinV2(w);
  var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
  var onclick = cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + cb + '\', \'suggestions\')})"' : '';
  // le prix SAQ, comme dans la Liste d'achat (promo : prix barré, prix promo, points bonis)
  var prix = blocPrixAchatV2(w);
  var carteVin = '<div class="carte histo-vin ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
    '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
    (prix ? '<div class="carte-droite carte-droite-empilee">' + prix + '</div>' : '') + '</div>';

  var cartesSugg = g.items.map(function(s) {
    var somEsc = (s.sommelier || '').replace(/'/g, "\\'");
    var noteEsc = (s.note || '').replace(/'/g, "\\'");
    var nomEsc = nom.replace(/'/g, "\\'");
    return '<div class="carte histo-mets" onclick="ouvrirApresTap(function(){ouvrirSuggestionEditV2(' + s.row + ', \'' + somEsc + '\', \'' + noteEsc + '\', \'' + nomEsc + '\', \'' + g.codeSAQ + '\', \'liste\')})">' +
      '<div class="carte-centre"><span class="carte-titre">' + (s.sommelier || '—') + '</span><span class="carte-sous">' + (s.note || '') + '</span></div>' +
      '<div class="carte-droite">' + (s.date || '') + '</div></div>';
  }).join('');

  return '<div class="histo-groupe ' + couleurClasseV2(w.Couleur) + '">' + carteVin + cartesSugg + '</div>';
}

// ---------- Overlay Ajout/Correction suggestion ----------
var suggestionEditV2 = { row: 0, codeSAQ: '', retour: null };

function ouvrirSuggestionAjoutV2(codeSAQ, retour) {
  suggestionEditV2 = { row: 0, codeSAQ: codeSAQ, retour: retour || null };
  var w = vinParCodeSAQV2(codeSAQ) || {};
  document.getElementById('suggestionEditV2-nom').textContent = decodeHTML(w.Nom || 'Vin');
  document.getElementById('suggestionEditV2-origine').textContent = [w.Pays, w.Region, w.Appellation].filter(Boolean).map(decodeHTML).join(' • ');
  document.getElementById('suggestionEditV2-note').value = '';
  remplirMenuSommelierSuggestionV2('', true);
  document.getElementById('suggestionEditV2Overlay').style.display = 'flex';
}

function ouvrirSuggestionEditV2(row, sommelier, note, nomVin, codeSAQ, retour) {
  suggestionEditV2 = { row: row, codeSAQ: codeSAQ, retour: retour || 'liste' };
  var w = vinParCodeSAQV2(codeSAQ) || {};
  document.getElementById('suggestionEditV2-nom').textContent = nomVin || decodeHTML(w.Nom || 'Vin');
  document.getElementById('suggestionEditV2-origine').textContent = [w.Pays, w.Region, w.Appellation].filter(Boolean).map(decodeHTML).join(' • ');
  document.getElementById('suggestionEditV2-note').value = note || '';
  remplirMenuSommelierSuggestionV2(sommelier, false);
  document.getElementById('suggestionEditV2Overlay').style.display = 'flex';
}

function remplirMenuSommelierSuggestionV2(actuel, modifiable) {
  var display = document.getElementById('suggestionEditV2-sommelier-display');
  var menu = document.getElementById('suggestionEditV2-sommelier-menu');
  display.textContent = actuel || '+ Ajouter';
  display.setAttribute('data-valeur', actuel || '');
  menu.classList.remove('ouvert');
  if (modifiable) {
    var sommeliers = (CONFIG && CONFIG.sommeliers) ? CONFIG.sommeliers : [];
    menu.innerHTML = sommeliers.map(function(s) {
      return '<div class="item-liste' + (s === actuel ? ' actif' : '') + '" onclick="choisirSommelierSuggestionV2(\'' + s.replace(/'/g, "\\'") + '\')">' + s + '</div>';
    }).join('') + '<div class="item-liste" id="suggestionEditV2-sommelier-ajouter" onclick="ouvrirAjoutSommelierV2()">+ Ajouter un sommelier</div>';
    display.classList.add('champ-cliquable');
    display.classList.remove('ligne-info');
    display.onclick = basculerMenuSommelierSuggestionV2;
  } else {
    menu.innerHTML = '';
    display.classList.remove('champ-cliquable');
    display.classList.add('ligne-info');
    display.onclick = null;
  }
}

function basculerMenuSommelierSuggestionV2() {
  document.getElementById('suggestionEditV2-sommelier-menu').classList.toggle('ouvert');
}

function choisirSommelierSuggestionV2(valeur) {
  document.getElementById('suggestionEditV2-sommelier-menu').classList.remove('ouvert');
  remplirMenuSommelierSuggestionV2(valeur);
}

function ouvrirAjoutSommelierV2() {
  var item = document.getElementById('suggestionEditV2-sommelier-ajouter');
  if (!item) return;
  item.outerHTML = '<input type="text" id="suggestionEditV2-sommelier-champ" class="champ-saisie" placeholder="Nouveau sommelier (Entrée pour confirmer)">';
  var champ = document.getElementById('suggestionEditV2-sommelier-champ');
  champ.onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); confirmerAjoutSommelierV2(); } };
  champ.focus();
}

function confirmerAjoutSommelierV2() {
  var champ = document.getElementById('suggestionEditV2-sommelier-champ');
  if (!champ) return;
  var valeur = champ.value.trim();
  if (!valeur) { afficherMessage('Entrez un sommelier'); return; }
  var existant = (CONFIG && CONFIG.sommeliers ? CONFIG.sommeliers : []).filter(function(s) { return memeTexteV2(s, valeur); })[0];
  if (existant) { choisirSommelierSuggestionV2(existant); return; }
  appelBackend('ajouterSommelierConfig', { sommelier: valeur }, { spinner: 'Sauvegarde' }).then(function() {
    CONFIG.sommeliers.push(valeur);
    CONFIG.sommeliers.sort(function(a, b) { return normaliserRechercheV2(a).localeCompare(normaliserRechercheV2(b)); });
    choisirSommelierSuggestionV2(valeur);
  }).catch(function() { afficherMessage('Erreur, réessayez'); });
}

function fermerSuggestionEditV2() {
  document.getElementById('suggestionEditV2Overlay').style.display = 'none';
}

function confirmerSuggestionEditV2() {
  var sommelier = document.getElementById('suggestionEditV2-sommelier-display').getAttribute('data-valeur') || '';
  var note = document.getElementById('suggestionEditV2-note').value.trim();
  if (!sommelier) { afficherMessage('Choisissez un sommelier'); return; }
  var e = suggestionEditV2;
  var appel = e.row ? appelBackend('corrigerSuggestion', { row: e.row, sommelier: sommelier, note: note }, { spinner: 'Sauvegarde' })
                     : appelBackend('ajouterSuggestion', { codeSAQ: e.codeSAQ, sommelier: sommelier, note: note }, { spinner: 'Sauvegarde' });
  appel.then(function() {
    return appelBackend('getSuggestions', {}, { spinner: 'Sauvegarde' });
  }).then(function(data) {
    ALL_SUGGESTIONS = data || [];
    document.getElementById('suggestionEditV2Overlay').style.display = 'none';
    if (e.retour === 'fiche') {
      chargerSuggestionsFicheV2(e.codeSAQ);
    } else if (e.retour === 'liste') {
      afficherSuggestionsV2();
      rafraichirRechercheSiOuverteV2();
    } else {
      var cb = barcodeDepuisSAQV2(e.codeSAQ);
      cacherToutesPagesV2();
      if (cb) ouvrirApresTap(function() { ouvrirFicheV2(cb, 'suggestions'); });
    }
  }).catch(function() { afficherMessage('Erreur, réessayez'); });
}

function ajouterDepuisSuggestionsV2() {
  suggestionsV2Attente = true;
  cacherToutesPagesV2();
  ouvrirApresTap(startScannerV2);
}

// ==================== LISTE D'ACHAT V2 (promotions intégrées) ====================
// Modes AFFICHER : favoris | achat | suggestions | decouvertes | nepasracheter
var filtresAchatV2 = { couleur: '', pays: '', cepage: '', appellation: '', pastille: '', succ: '', sommelier: '' };
var achatV2Mode = 'achat';
var achatV2PromoSeul = false; // interrupteur « Que les vins en promotion »
var libellesFiltreAchatV2 = { couleur: 'Couleur', pays: 'Pays', cepage: 'Cépage', appellation: 'Appellation', pastille: 'Pastille de goût', succ: 'Succursale' };
var succursalesAchatV2 = [];

// Promotions SAQ repliées dans la liste d'achat
var promosMesV2 = null;        // promos sur MES vins (par code SAQ)
var promosDecV2 = null;        // toutes les promos SAQ (Découvertes)
var promosDecEnCours = false;
var promoParCodeV2 = {};       // code SAQ -> { prixRegulier, prixFinal, rabais, pointsBonis }

function codesSAQCaveV2() {
  var vues = {};
  var codes = [];
  (ALL_DATA || []).forEach(function(i) {
    var c = (i['Code SAQ'] || '').toString().trim();
    if (c && !vues[c]) { vues[c] = true; codes.push(c); }
  });
  return codes;
}

function vinParCodeSAQV2(codeSAQ) {
  var c = (codeSAQ || '').toString().trim();
  return (ALL_DATA || []).filter(function(i) {
    return (i['Code SAQ'] || '').toString().trim() === c;
  })[0] || null;
}

function indexerPromosMesV2() {
  promoParCodeV2 = {};
  (promosMesV2 || []).forEach(function(p) {
    var c = (p.codeSAQ || '').toString().trim();
    if (c) promoParCodeV2[c] = p;
  });
}

function achatV2Ouvert() {
  var c = document.getElementById('achatV2Container');
  return c && c.style.display !== 'none';
}

function chargerPromosMesV2() {
  if (promosMesV2) { indexerPromosMesV2(); return; }
  appelBackend('getPromotionsSAQ', { codesSAQ: codesSAQCaveV2() }, { spinner: '', timeout: 120000 }).then(function(promos) {
    promosMesV2 = promos || [];
    indexerPromosMesV2();
    if (achatV2Ouvert() && achatV2Mode !== 'decouvertes') appliquerFiltresAchatV2();
    // les cartes des Propositions montrent aussi le prix (page et section de la Recherche)
    var sugg = document.getElementById('suggestionsV2Container');
    if (sugg && sugg.style.display !== 'none') afficherSuggestionsV2();
    rafraichirRechercheSiOuverteV2();
  }).catch(function() {});
}

function chargerDecouvertesV2() {
  if (promosDecV2 || promosDecEnCours) return;
  promosDecEnCours = true;
  appelBackend('getToutesPromotionsSAQ', { codesSAQ: codesSAQCaveV2() }, { spinner: '', timeout: 300000 }).then(function(promos) {
    promosDecV2 = promos || [];
    promosDecEnCours = false;
    if (achatV2Ouvert() && achatV2Mode === 'decouvertes') appliquerFiltresAchatV2();
  }).catch(function(e) {
    promosDecEnCours = false;
    // sinon le verre tournerait pour rien ; rechoisir la liste relance le chargement
    if (achatV2Ouvert() && achatV2Mode === 'decouvertes') {
      document.getElementById('achatV2-cartes').innerHTML = '<div class="texte-secondaire">Découvertes indisponibles' + (e && e.message ? ' : ' + e.message : '') + ' — rechoisis la liste pour réessayer</div>';
    }
  });
}

function promoDuVinV2(w) {
  if (w.__promo) return w.__promo;
  var c = (w['Code SAQ'] || '').toString().trim();
  return (c && promoParCodeV2[c]) ? promoParCodeV2[c] : null;
}

function ouvrirAchatV2() {
  document.getElementById('achatV2Container').style.display = 'flex';
  remonterScrollV2('achatV2Container');
  panierSessionAchatV2 = {};
  filtresAchatV2 = { couleur: '', pays: '', cepage: '', appellation: '', pastille: '', succ: '', sommelier: '' };
  achatV2Mode = 'achat';
  achatV2PromoSeul = false;
  if (!succursalesAchatV2.length) {
    appelBackend('getSuccursales', {}, { spinner: '' }).then(function(succ) {
      succursalesAchatV2 = succ || [];
      remplirFiltresAchatV2();
    }).catch(function() {});
  }
  chargerPromosMesV2();
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
}

function fermerAchatV2() {
  fermerFiltresAchatV2();
  document.getElementById('achatV2Container').style.display = 'none';
}

function baseAchatV2() {
  if (achatV2Mode === 'decouvertes') {
    return (promosDecV2 || []).map(function(p) {
      return {
        Nom: p.nom, 'Code SAQ': p.codeSAQ, Couleur: p.couleur || '', Pays: p.pays || '',
        Region: p.region || '', Cepage: p.cepage || '', Appellation: p.appellation || '', 'Pastille gout': p.pastille || '',
        'Photo URL': p.photo || '', 'Code-barres': '', __decouverte: true,
        __promo: { prixRegulier: p.prixRegulier, prixFinal: p.prixFinal, rabais: p.rabais, pointsBonis: p.pointsBonis || 0 }
      };
    });
  }
  var grouped = {};
  (ALL_DATA || []).forEach(function(item) {
    var key = cleVinV2(item);
    if (!grouped[key]) grouped[key] = { wine: item, count: 0 };
    var statut = item.Statut || 'En stock';
    if (statut !== 'Bu' && statut !== 'Sorti') grouped[key].count++;
  });
  var arr = Object.keys(grouped).map(function(k) { return grouped[k]; });
  var out;
  if (achatV2Mode === 'favoris') {
    out = arr.filter(function(g) { return (g.wine.Favori || '') === 'Oui'; });
  } else if (achatV2Mode === 'suggestions') {
    out = arr.filter(function(g) { return (g.wine.Racheter || '').toString().trim() === ''; });
  } else if (achatV2Mode === 'nepasracheter') {
    out = arr.filter(function(g) { return (g.wine.Racheter || '') === 'Non'; });
  } else {
    out = arr.filter(function(g) {
      var racheter = (g.wine.Racheter || '') === 'Oui';
      var panier = (g.wine.Panier || '') === 'Oui';
      return (racheter && g.count === 0) || panier;
    });
  }
  var vins = out.map(function(g) { g.wine.__count = g.count; return g.wine; });
  if (achatV2PromoSeul) vins = vins.filter(function(w) { return !!promoDuVinV2(w); });
  return vins;
}

function remplirFiltresAchatV2() {
  var f = filtresAchatV2;
  var modes = { favoris: 'achatV2-mode-favoris', achat: 'achatV2-mode-achat', suggestions: 'achatV2-mode-suggestions', decouvertes: 'achatV2-mode-decouvertes', nepasracheter: 'achatV2-mode-nepasracheter' };
  Object.keys(modes).forEach(function(m){
    var el = document.getElementById(modes[m]);
    if (el) el.classList.toggle('actif', achatV2Mode === m);
  });
  var tg = document.getElementById('achatV2-promo');
  if (tg) { tg.classList.toggle('actif', achatV2PromoSeul); tg.textContent = achatV2PromoSeul ? '✓' : '✗'; }

  var base = baseAchatV2();
  var forCouleur = base;
  var forPays = base.filter(function(i){ return passeFiltreV2(f.couleur, i.Couleur); });
  var forCepage = base.filter(function(i){
    return passeFiltreV2(f.couleur, i.Couleur) && passeFiltreV2(f.pays, i.Pays);
  });
  var forAppellation = forCepage.filter(function(i){
    return passeFiltreV2(f.cepage, i.Cepage, contientTexteV2);
  });
  var forPastille = forAppellation.filter(function(i){
    return passeFiltreV2(f.appellation, i.Appellation);
  });

  var listes = {
    couleur: uniqueValeursAchat(forCouleur, 'Couleur'),
    pays: uniqueValeursAchat(forPays, 'Pays'),
    cepage: uniqueValeursAchat(forCepage, 'Cepage'),
    appellation: uniqueValeursAchat(forAppellation, 'Appellation'),
    pastille: uniqueValeursAchat(forPastille, 'Pastille gout')
  };

  ['couleur','pays','cepage','appellation','pastille'].forEach(function(cle){
    var cur = f[cle];
    var menu = document.getElementById('achatV2-f-' + cle + '-menu');
    if (!menu) return;
    menu.innerHTML = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'' + cle + '\', \'\')">Tous</div>' + listes[cle].map(function(v){
      return '<div class="item-liste' + classeChoixV2(v, cur) + '" onclick="choisirFiltreAchatV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('achatV2-f-' + cle + '-display');
    if (disp) disp.textContent = libelleChoixV2(cur, libellesFiltreAchatV2[cle]);
  });

  var menuSucc = document.getElementById('achatV2-f-succ-menu');
  if (menuSucc) {
    var items = succursalesAchatV2.map(function(s){
      return '<div class="item-liste' + (s.numero === f.succ ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'succ\', \'' + s.numero + '\')">' + s.nom + '</div>';
    }).join('');
    items += '<div class="item-liste' + (f.succ === 'FAV' ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'succ\', \'FAV\')">Mes favorites</div>';
    items += '<div class="item-liste' + (f.succ === 'TOUTES' ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'succ\', \'TOUTES\')">Toutes les succursales</div>';
    items += '<div class="item-liste" onclick="gererFavoritesV2(\'achatV2\')">Gérer mes favorites</div>';
    menuSucc.innerHTML = items;
    var dispSucc = document.getElementById('achatV2-f-succ-display');
    if (dispSucc) {
      if (f.succ === 'FAV') dispSucc.textContent = 'Mes favorites';
      else if (f.succ === 'TOUTES') dispSucc.textContent = 'Toutes les succursales';
      else {
        var sel = succursalesAchatV2.filter(function(s){ return s.numero === f.succ; })[0];
        dispSucc.textContent = sel ? sel.nom : libellesFiltreAchatV2.succ;
      }
    }
  }

  var menuSom = document.getElementById('achatV2-f-sommelier-menu');
  if (menuSom) {
    var vusSom = {}, sommeliers = [];
    (ALL_SUGGESTIONS || []).forEach(function(s){
      var v = (s.sommelier || '').toString().trim();
      var k = normaliserRechercheV2(v);
      if (v && !vusSom[k]) { vusSom[k] = true; sommeliers.push(v); }
    });
    sommeliers.sort(function(a, b){ return a.localeCompare(b); });
    menuSom.innerHTML = '<div class="item-liste' + (f.sommelier === '' ? ' actif' : '') + '" onclick="choisirFiltreAchatV2(\'sommelier\', \'\')">Tous</div>' + sommeliers.map(function(v){
      return '<div class="item-liste' + classeChoixV2(v, f.sommelier) + '" onclick="choisirFiltreAchatV2(\'sommelier\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var dispSom = document.getElementById('achatV2-f-sommelier-display');
    if (dispSom) dispSom.textContent = libelleChoixV2(f.sommelier, 'Sommelier');
  }
}

function uniqueValeursAchat(liste, champ) {
  var vues = {};
  var out = [];
  liste.forEach(function(i){
    var v = (i[champ] || '').toString().trim();
    var cle = normaliserRechercheV2(v);
    if (v && !vues[cle]) { vues[cle] = true; out.push(v); }
  });
  out.sort(function(a, b){ return a.localeCompare(b); });
  return out;
}

function toggleAchatPromoSeulV2() {
  achatV2PromoSeul = !achatV2PromoSeul;
  if (achatV2PromoSeul && !promosMesV2) chargerPromosMesV2();
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
}

function basculerFiltreAchatV2(cle) {
  var menu = document.getElementById('achatV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['couleur','pays','cepage','appellation','pastille','succ','sommelier'].forEach(function(k){
    var m = document.getElementById('achatV2-f-' + k + '-menu');
    if (m) m.classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreAchatV2(cle, valeur) {
  // la succursale est un choix, pas un filtre : pas de « sauf »
  filtresAchatV2[cle] = cle === 'succ' ? valeur : cycleFiltreV2(filtresAchatV2[cle], valeur);
  var menu = document.getElementById('achatV2-f-' + cle + '-menu');
  if (menu) menu.classList.remove('ouvert');
  if (cle === 'couleur') { filtresAchatV2.pays = ''; filtresAchatV2.cepage = ''; filtresAchatV2.appellation = ''; filtresAchatV2.pastille = ''; }
  if (cle === 'pays') { filtresAchatV2.cepage = ''; filtresAchatV2.appellation = ''; filtresAchatV2.pastille = ''; }
  if (cle === 'cepage') { filtresAchatV2.appellation = ''; filtresAchatV2.pastille = ''; }
  if (cle === 'appellation') { filtresAchatV2.pastille = ''; }
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
}

function reinitialiserFiltresAchatV2() {
  filtresAchatV2 = { couleur: '', pays: '', cepage: '', appellation: '', pastille: '', succ: '', sommelier: '' };
  achatV2PromoSeul = false;
  ['couleur','pays','cepage','appellation','pastille','succ','sommelier'].forEach(function(k) {
    var m = document.getElementById('achatV2-f-' + k + '-menu');
    if (m) m.classList.remove('ouvert');
  });
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
  fermerFiltresAchatV2();
}

function ouvrirFiltresAchatV2() { clicLoupeV2('achatV2', reinitialiserFiltresAchatV2); }
function fermerFiltresAchatV2() {
  document.getElementById('achatV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('achatV2-filtres').classList.remove('ouvert');
}

function choisirModeAchatV2(mode) {
  achatV2Mode = mode;
  filtresAchatV2.couleur = ''; filtresAchatV2.pays = ''; filtresAchatV2.cepage = ''; filtresAchatV2.appellation = ''; filtresAchatV2.pastille = ''; filtresAchatV2.sommelier = '';
  if (mode === 'decouvertes' && !promosDecV2) chargerDecouvertesV2();
  remplirFiltresAchatV2();
  appliquerFiltresAchatV2();
  fermerFiltresAchatV2();
}

function majEntonnoirAchatV2() {
  var f = filtresAchatV2;
  var loupe = document.getElementById('achatV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(achatV2PromoSeul || f.couleur || f.pays || f.cepage || f.appellation || f.pastille || f.succ || f.sommelier));
}

function appliquerFiltresAchatV2() {
  if (achatV2Mode === 'decouvertes' && !promosDecV2) {
    chargerDecouvertesV2();
    remplirFiltresAchatV2();
    document.getElementById('achatV2-compte').textContent = '';
    document.getElementById('achatV2-cartes').innerHTML = '<div class="spinner-en-ligne">' + verreSpinnerHtmlV2() + '<div class="spinner-texte">Découvertes</div></div>';
    majEntonnoirAchatV2();
    return;
  }
  var f = filtresAchatV2;
  var base = baseAchatV2();
  var filtered = base.filter(function(i){
    return passeFiltreV2(f.couleur, i.Couleur) &&
      passeFiltreV2(f.pays, i.Pays) &&
      passeFiltreV2(f.cepage, i.Cepage, contientTexteV2) &&
      passeFiltreV2(f.appellation, i.Appellation) &&
      passeFiltreV2(f.pastille, i['Pastille gout'], contientTexteV2) &&
      (!f.sommelier || passeFiltreV2(f.sommelier, sommeliersDuVinV2((i['Code SAQ'] || '').toString().trim()), listeContientV2));
  });
  afficherCartesAchatV2(filtered);
  majEntonnoirAchatV2();
}

function cleCartePanierV2(w) {
  return ((w['Code-barres'] || w['Code SAQ'] || w.Nom || '') + '').toString().trim().replace(/\s+/g, '');
}

function sommeliersDuVinV2(codeSAQ) {
  var c = (codeSAQ || '').toString().trim();
  if (!c) return [];
  var vus = {}, out = [];
  (ALL_SUGGESTIONS || []).forEach(function(s) {
    if ((s.codeSAQ || '').toString().trim() !== c) return;
    var nom = (s.sommelier || '').toString().trim();
    var k = normaliserRechercheV2(nom);
    if (nom && !vus[k]) { vus[k] = true; out.push(nom); }
  });
  return out;
}

var imgBonisAchatV2 = { 250:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910660/250_hgv2se.png', 500:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910661/500_ko3y8t.png', 750:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910662/750_rscr3d.png', 800:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910663/800_cqr4co.png', 1000:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910664/1000_lunrjq.png', 1250:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910665/1250_yeot7a.png', 1500:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910666/1500_acyruz.png', 1750:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910667/1750_rv32nr.png', 2000:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910667/2000_c7mwzw.png', 2250:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910668/2250_fm1igm.png', 2500:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910669/2500_lygz2e.png', 2750:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910670/2750_lw24g6.png', 3000:'https://res.cloudinary.com/dym93w23h/image/upload/v1786910671/3000_xu2s3l.png' };

function boisPointsAchatV2(pts) {
  if (!pts) return '';
  return imgBonisAchatV2[pts] ? '<br><img class="achat-bonis" src="' + imgBonisAchatV2[pts] + '" alt="+' + pts + ' pts">' : '<br>+' + pts + ' pts';
}

function blocPrixAchatV2(w) {
  var promo = promoDuVinV2(w);
  if (promo) {
    var barre = (promo.rabais > 0.01 && promo.prixRegulier != null) ? '<span class="prix-barre">' + Number(promo.prixRegulier).toFixed(2) + ' $</span><br>' : '';
    var fin = (promo.prixFinal != null) ? Number(promo.prixFinal).toFixed(2) + ' $' : '';
    return '<div class="fs-12 color-white">' + barre + fin + boisPointsAchatV2(promo.pointsBonis) + '</div>';
  }
  var prix = (w.Prix !== '' && w.Prix != null && !isNaN(parseFloat(w.Prix))) ? parseFloat(w.Prix).toFixed(2) + ' $' : '';
  return prix ? '<div class="fs-12 color-white">' + prix + '</div>' : '';
}

// Cépages PRINCIPAUX déjà eus dans la cave (tout ALL_DATA, sauf les propositions — Racheter vide) — pour marquer les cépages nouveaux en Découvertes
function cepagesPrincipauxCaveV2() {
  var s = {};
  (ALL_DATA || []).forEach(function(w){
    if (estPropositionV2(w)) return;
    var c = normaliserRechercheV2(cepageDominant(w));
    if (c) s[c] = true;
  });
  return s;
}

function afficherCartesAchatV2(liste) {
  var parCepage = (achatV2Mode === 'decouvertes');
  liste.sort(function(a, b){
    if (parCepage) {
      var ca = normaliserRechercheV2(cepageDominant({ Cepage: a.Cepage }));
      var cbb = normaliserRechercheV2(cepageDominant({ Cepage: b.Cepage }));
      if (ca !== cbb) { if (!ca) return 1; if (!cbb) return -1; return ca.localeCompare(cbb); }
      return (a.Nom || '').localeCompare(b.Nom || '');
    }
    var pa = normaliserRechercheV2(a.Pays || 'zzz');
    var pb = normaliserRechercheV2(b.Pays || 'zzz');
    if (pa !== pb) return pa.localeCompare(pb);
    return (a.Nom || '').localeCompare(b.Nom || '');
  });
  var div = document.getElementById('achatV2-cartes');
  document.getElementById('achatV2-compte').innerHTML = libelleCompteAchatV2(liste.length);
  if (liste.length === 0) { div.innerHTML = '<div class="texte-secondaire">' + (parCepage ? 'Aucune promotion' : 'Aucune bouteille') + '</div>'; return; }
  var f = filtresAchatV2;
  var derniereSection = null;
  var cavePrincipaux = parCepage ? cepagesPrincipauxCaveV2() : null;
  div.innerHTML = liste.map(function(w){
    var entete = '';
    var sectionCle, sectionTexte;
    if (parCepage) {
      var cep = cepageDominant({ Cepage: w.Cepage });
      sectionCle = normaliserRechercheV2(cep);
      sectionTexte = cep || 'Sans cépage';
    } else {
      sectionCle = normaliserRechercheV2(w.Pays || '');
      sectionTexte = w.Pays || 'Sans pays';
    }
    if (sectionCle !== derniereSection) {
      derniereSection = sectionCle;
      var marque = (parCepage && cep && !cavePrincipaux[sectionCle]) ? ' <span class="cepage-nouveau">🍇</span>' : '';
      entete = '<div class="emp-meuble">' + sectionTexte + marque + '</div>';
    }
    var cle = cleCartePanierV2(w);
    var coche = !!panierSessionAchatV2[cle];
    var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var codeSAQ = (w['Code SAQ'] || '').toString().trim();
    var nom = decodeHTML(w.Nom || '—');
    var paysRegion = (w.Pays && w.Region) ? (w.Pays + ' • ' + w.Region) : (w.Pays || w.Region || '');
    var sousLignes = [paysRegion, w.Cepage || '', w.Appellation || ''];
    if (achatV2Mode === 'suggestions') {
      var soms = sommeliersDuVinV2(codeSAQ);
      if (soms.length) sousLignes.push('<span class="color-primary">' + soms.join(', ') + '</span>');
    }
    var sous = sousLignes.filter(Boolean).join('<br>');
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = '';
    if (f.succ === 'TOUTES' && codeSAQ) onclick = ' onclick="dispoProchesAchatV2(\'' + codeSAQ + '\')"';
    else if (w.__decouverte) onclick = codeSAQ ? ' onclick="window.open(\'https://www.saq.com/fr/' + codeSAQ + '\')"' : '';
    else if (cb) onclick = ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + cb + '\', \'achat\')})"';
    var cocheHtml = '<span class="coche-panier' + (coche ? ' actif' : '') + '" onclick="togglePanierSessionV2(\'' + cle.replace(/'/g, "\\'") + '\', event)"></span>';
    var prixHtml = blocPrixAchatV2(w);
    var btl = (achatV2Mode === 'favoris' && typeof w.__count === 'number') ? '<div class="fs-12">' + w.__count + ' btl</div>' : '';
    var dispo = (f.succ && f.succ !== 'TOUTES' && codeSAQ) ? '<div id="achatV2-dispo-' + codeSAQ + '">…</div>' : '';
    var proches = codeSAQ ? '<span id="achatV2-proches-' + codeSAQ + '"></span>' : '';
    var cellier = (w.Cellier === 'Oui') ? ' <span class="color-primary fs-11">Espace Cellier</span>' : '';
    return entete + '<div class="carte ' + couleurClasseV2(w.Couleur) + (coche ? ' carte-vide' : '') + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + cellier + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite carte-droite-empilee">' + cocheHtml + prixHtml + btl + dispo + proches + '</div></div>';
  }).join('');

  if (f.succ) chargerDispoAchatV2(liste);
}

var panierSessionAchatV2 = {};

function togglePanierSessionV2(cle, ev) {
  if (ev) ev.stopPropagation();
  var actif;
  if (panierSessionAchatV2[cle]) { delete panierSessionAchatV2[cle]; actif = false; }
  else { panierSessionAchatV2[cle] = true; actif = true; }
  if (ev && ev.target) {
    ev.target.classList.toggle('actif', actif);
    var carte = ev.target.closest('.carte');
    if (carte) carte.classList.toggle('carte-vide', actif);
  }
}

function libelleCompteAchatV2(n) {
  var txt;
  if (achatV2Mode === 'decouvertes') txt = n + ' vin' + (n > 1 ? 's' : '') + ' en promotion';
  else if (achatV2Mode === 'suggestions') txt = n + ' proposition' + (n > 1 ? 's' : '');
  else if (achatV2Mode === 'nepasracheter') txt = n + ' vin' + (n > 1 ? 's' : '') + ' à ne pas racheter';
  else if (achatV2Mode === 'favoris') txt = n + ' vin' + (n > 1 ? 's' : '');
  else txt = n + ' vin' + (n > 1 ? 's' : '');
  if (achatV2Mode !== 'decouvertes' && achatV2PromoSeul) txt += ' en promotion';
  var f = filtresAchatV2;
  var sel = succursalesAchatV2.filter(function(s){ return s.numero === f.succ; })[0];
  if (sel) {
    var nom = (sel.nom || '').trim();
    var m = nom.match(/^(.*?)\s+[—–-]\s+(.*)$/) || nom.match(/^([^,]+),\s*(.*)$/);
    var lignes = 'Succ. ' + (m ? m[1] : nom);
    if (m && m[2]) lignes += '<br>' + m[2];
    txt += '<br><span class="color-primary">' + lignes + '</span>';
  } else if (f.succ === 'FAV') txt += '<br><span class="color-primary">Mes favorites</span>';
  else if (f.succ === 'TOUTES') txt += '<br><span class="color-primary">Toutes les succursales</span>';
  return txt;
}

function majCompteAchatV2() {
  var cartes = document.querySelectorAll('#achatV2-cartes .carte');
  var n = 0;
  Array.prototype.forEach.call(cartes, function(c){ if (c.style.display !== 'none') n++; });
  document.getElementById('achatV2-compte').innerHTML = libelleCompteAchatV2(n);
  majEntetesAchatV2();
}

// Masque un en-tête de section (pays/cépage) qui n'a plus aucune carte visible sous lui
function majEntetesAchatV2() {
  var div = document.getElementById('achatV2-cartes');
  if (!div) return;
  var entete = null;
  var aVisible = false;
  Array.prototype.forEach.call(div.children, function(el){
    if (el.classList.contains('emp-meuble')) {
      if (entete) entete.style.display = aVisible ? '' : 'none';
      entete = el;
      aVisible = false;
    } else if (el.classList.contains('carte') && el.style.display !== 'none') {
      aVisible = true;
    }
  });
  if (entete) entete.style.display = aVisible ? '' : 'none';
}

function chargerDispoAchatV2(liste) {
  var f = filtresAchatV2;
  if (!f.succ || f.succ === 'TOUTES') return;
  if (f.succ === 'FAV') {
    var favoris = succursalesAchatV2.map(function(s){ return s.numero; });
    liste.forEach(function(w){
      var codeSAQ = (w['Code SAQ'] || '').toString().trim();
      if (!codeSAQ) return;
      function el(){ return document.getElementById('achatV2-dispo-' + codeSAQ); }
      appelBackend('getSuccursalesDisponibles', { codeSAQ: codeSAQ }, { spinner: '', timeout: 120000 }).then(function(succursales){
        var e = el(); if (!e) return;
        var dansFav = (succursales || []).filter(function(s){ return favoris.indexOf(s.numero) !== -1 && s.quantite > 0; });
        if (!dansFav.length) { e.innerHTML = '<span class="dispo-non">✗</span>'; return; }
        e.innerHTML = dansFav.map(function(s){ return '<span class="dispo-oui">' + s.nom + ' ' + s.quantite + '</span>'; }).join('<br>');
      }).catch(function(){ var e = el(); if (e) e.textContent = '—'; });
    });
    return;
  }
  // Succursale précise : l'inventaire d'abord (un seul appel, gardé pour le scan sans réseau) → la liste se réduit
  // aux vins disponibles → la quantité n'est demandée que pour ceux-là. Sans inventaire : une question par vin, comme avant.
  var succ = f.succ;
  var codes = liste.map(function(w){ return (w['Code SAQ'] || '').toString().trim(); }).filter(Boolean);
  inventaireSuccV2(succ).then(function(inv) {
    if (filtresAchatV2.succ !== succ) return;
    var dispo = {};
    inv.produits.forEach(function(p){ dispo[p.codeSAQ] = true; });
    codes.forEach(function(codeSAQ){
      if (dispo[codeSAQ]) { quantiteDispoAchatV2(codeSAQ, succ); return; }
      var e = document.getElementById('achatV2-dispo-' + codeSAQ);
      var carte = e ? e.closest('.carte') : null;
      if (carte) carte.style.display = 'none';
    });
    majCompteAchatV2();
  }).catch(function() {
    if (filtresAchatV2.succ !== succ) return;
    codes.forEach(function(codeSAQ){ quantiteDispoAchatV2(codeSAQ, succ); });
  });
}

// Quantité d'un vin dans la succursale (« X btl ») ; absent → la carte est masquée
function quantiteDispoAchatV2(codeSAQ, succ) {
  function el(){ return document.getElementById('achatV2-dispo-' + codeSAQ); }
  appelBackend('verifierDispoSAQ_GRAPHQL_V1', { codeSAQ: codeSAQ, succursale: succ }, { spinner: '' }).then(function(res){
    var e = el(); if (!e) return;
    if (res && res.disponible) {
      e.innerHTML = '<span class="dispo-oui">' + (res.quantite ? res.quantite + ' btl' : '✓') + '</span>';
    } else {
      var carte = e.closest('.carte');
      if (carte) carte.style.display = 'none';
      majCompteAchatV2();
    }
  }).catch(function(){ var e = el(); if (e) e.textContent = '—'; });
}

// ==================== INVENTAIRE DE LA SUCCURSALE ====================
// Tout ce que la succursale choisie dans la Liste d'achat a en stock (route getInventaireSuccursale, ~1500 produits).
// Chargé une fois par succursale (dans l'auto, avec du réseau), gardé en mémoire pour le scan entre les murs de béton,
// et en copie dans le téléphone (repris au redémarrage : < 24 h, ou toujours sans réseau). Vidé par le bouton « Données ».
var INVENTAIRE_SUCC_V2 = null;         // { succ, produits: [{ codeSAQ, nom, cups:[…], pays, appellation, cepage, aromes… }] }
var INVENTAIRE_SUCC_V2_ATTENTE = null; // { succ, promesse } pendant le chargement (évite les doubles appels)

function inventaireSuccV2(succ) {
  if (INVENTAIRE_SUCC_V2 && INVENTAIRE_SUCC_V2.succ === succ) return Promise.resolve(INVENTAIRE_SUCC_V2);
  if (INVENTAIRE_SUCC_V2_ATTENTE && INVENTAIRE_SUCC_V2_ATTENTE.succ === succ) return INVENTAIRE_SUCC_V2_ATTENTE.promesse;
  function page(n, cumul) {
    return appelBackend('getInventaireSuccursale', { succursale: succ, page: n }, { spinner: '', timeout: 330000 }).then(function(res) {
      // Exige une vraie réponse : un backend pas encore redéployé répond « Action inconnue » → on retombe sur l'ancien mode
      if (!res || res.success !== true || !Array.isArray(res.produits)) throw new Error((res && (res.message || res.error)) || 'Inventaire indisponible');
      cumul = cumul.concat(res.produits);
      if (!res.termine && res.pageSuivante) return page(res.pageSuivante, cumul);
      return cumul;
    });
  }
  var promesse = page(1, []).then(function(produits) {
    INVENTAIRE_SUCC_V2 = { succ: succ, produits: produits };
    garderCopieV2('inventaireSucc', INVENTAIRE_SUCC_V2); // pour rouvrir l'app sans réseau en succursale
    return INVENTAIRE_SUCC_V2;
  });
  INVENTAIRE_SUCC_V2_ATTENTE = { succ: succ, promesse: promesse };
  var fin = function() { if (INVENTAIRE_SUCC_V2_ATTENTE && INVENTAIRE_SUCC_V2_ATTENTE.promesse === promesse) INVENTAIRE_SUCC_V2_ATTENTE = null; };
  promesse.then(fin, fin);
  return promesse;
}

// Produit de l'inventaire qui porte ce code-barres (un code par millésime ; zéros de tête ignorés)
function produitInventaireParCodeV2(code) {
  if (!INVENTAIRE_SUCC_V2) return null;
  var produits = INVENTAIRE_SUCC_V2.produits;
  for (var i = 0; i < produits.length; i++) {
    if ((produits[i].cups || []).some(function(c){ return memeCodeV2(c, code); })) return produits[i];
  }
  return null;
}

function dispoProchesAchatV2(codeSAQ) {
  var el = document.getElementById('achatV2-proches-' + codeSAQ);
  if (!el) return;
  el.innerHTML = '<br>Recherche…';
  function chercher(lat, lng) {
    appelBackend('getSuccursalesDisponibles', { codeSAQ: codeSAQ, lat: lat, lng: lng }, { spinner: '', timeout: 120000 }).then(function(succursales){
      var dispo = (succursales || []).filter(function(s){ return s.quantite > 0; });
      if (!dispo.length) { el.innerHTML = '<br><span class="dispo-non">✗</span>'; return; }
      el.innerHTML = dispo.slice(0, 3).map(function(s){
        var adresseMaps = encodeURIComponent([s.adresse, s.ville, 'QC'].filter(Boolean).join(', '));
        return '<br><span class="dispo-oui" onclick="event.stopPropagation(); window.open(\'https://maps.apple.com/?daddr=' + adresseMaps + '\', \'_blank\')">' + s.nom + ' ' + s.quantite + '</span>';
      }).join('');
    }).catch(function(){ el.innerHTML = ''; });
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) { chercher(pos.coords.latitude, pos.coords.longitude); },
      function() { chercher(null, null); }
    );
  } else { chercher(null, null); }
}

// ==================== GESTION DES SUCCURSALES FAVORITES ====================
var toutesSuccursalesV2 = [];
var gererFavCibleV2 = '';

function gererFavoritesV2(cible) {
  gererFavCibleV2 = cible;
  if (toutesSuccursalesV2.length) { rendreGererFavoritesV2(); return; }
  appelBackend('getToutesSuccursales', {}, { spinner: ' ' }).then(function(liste) {
    toutesSuccursalesV2 = liste || [];
    rendreGererFavoritesV2();
  }).catch(function() { afficherMessage('Liste des succursales indisponible'); });
}

function rendreGererFavoritesV2() {
  var menu = document.getElementById(gererFavCibleV2 + '-f-succ-menu');
  if (!menu) return;
  var html = '<div class="item-liste actif" onclick="finirGererFavoritesV2()">Terminé</div>';
  html += succursalesAchatV2.map(function(s) {
    return '<div class="item-liste" onclick="retirerFavoriteV2(\'' + s.numero + '\')">' + s.nom + '<span class="fav-x">✗</span></div>';
  }).join('');
  html += '<input type="text" id="gererFavV2-filtre" class="champ-saisie" placeholder="Chercher une ville" oninput="filtrerGererFavoritesV2()">';
  html += '<div id="gererFavV2-liste"></div>';
  menu.innerHTML = html;
  menu.classList.add('ouvert');
  filtrerGererFavoritesV2();
}

function filtrerGererFavoritesV2() {
  var div = document.getElementById('gererFavV2-liste');
  if (!div) return;
  var champ = document.getElementById('gererFavV2-filtre');
  var terme = normaliserRechercheV2(champ ? champ.value.trim() : '');
  if (terme.length < 2) { div.innerHTML = '<div class="texte-secondaire"></div>'; return; }
  var favNums = succursalesAchatV2.map(function(s) { return s.numero; });
  div.innerHTML = toutesSuccursalesV2.filter(function(s) {
    if (favNums.indexOf(s.numero) !== -1) return false;
    return normaliserRechercheV2(s.ville + ' ' + s.adresse).indexOf(terme) !== -1;
 }).map(function(s) {
    var nom = (s.ville + ' — ' + s.adresse);
    return '<div class="item-liste" onclick="ajouterFavoriteV2(\'' + s.numero + '\', \'' + nom.replace(/'/g, "\\'") + '\')">+ ' + nom + '</div>';
  }).join('');
}

function ajouterFavoriteV2(numero, nom) {
  appelBackend('ajouterSuccursale', { nom: nom, numero: numero }, { spinner: 'Ajout' }).then(function() {
    succursalesAchatV2.push({ nom: nom, numero: numero });
    rendreGererFavoritesV2();
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function retirerFavoriteV2(numero) {
  appelBackend('supprimerSuccursale', { numero: numero }, { spinner: 'Retrait' }).then(function() {
    succursalesAchatV2 = succursalesAchatV2.filter(function(s) { return s.numero !== numero; });
    rendreGererFavoritesV2();
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function finirGererFavoritesV2() {
  remplirFiltresAchatV2();
  var menu = document.getElementById(gererFavCibleV2 + '-f-succ-menu');
  if (menu) menu.classList.add('ouvert');
}

// ==================== FACTURE SAQ V2 ====================
var RECU_V2_ITEMS = [];
var RECU_V2_INDEX = 0;

function ouvrirRecuV2() {
  document.getElementById('recuV2-fichier').value = '';
  document.getElementById('recuV2Container').style.display = 'flex';
}

function fermerRecuV2() {
  document.getElementById('recuV2Container').style.display = 'none';
  document.getElementById('recuValidationV2Container').style.display = 'none';
  RECU_V2_ITEMS = [];
  RECU_V2_INDEX = 0;
}

function traiterPhotoRecuV2(input) {
  var fichier = input.files && input.files[0];
  if (!fichier) return;
  var lecteur = new FileReader();
  lecteur.onload = function() {
    var base64 = lecteur.result.split(',')[1];
    appelBackend('extraireRecuSAQ', { image: base64 }, { spinner: 'Lecture de la facture', timeout: 60000 }).then(function(res) {
      if (!res || !res.success) {
        afficherMessage('Erreur OCR : ' + ((res && res.error) || 'inconnue'));
        fermerRecuV2();
        return;
      }
      if (!res.items || !res.items.length) {
        afficherMessage('Aucun code trouvé sur la facture');
        fermerRecuV2();
        return;
      }
      RECU_V2_ITEMS = res.items;
      RECU_V2_INDEX = 0;
      document.getElementById('recuV2Container').style.display = 'none';
      document.getElementById('recuValidationV2Container').style.display = 'flex';
      afficherProchainRecuVinV2();
    }).catch(function() {
      afficherMessage('Erreur de lecture de la facture');
      fermerRecuV2();
    });
  };
  lecteur.readAsDataURL(fichier);
}

function afficherProchainRecuVinV2() {
  if (RECU_V2_INDEX >= RECU_V2_ITEMS.length) {
    fermerRecuV2();
    afficherMessage('Facture traitée');
    return;
  }
  var item = RECU_V2_ITEMS[RECU_V2_INDEX];
  document.getElementById('recuValidationV2-compte').textContent = (RECU_V2_INDEX + 1) + ' / ' + RECU_V2_ITEMS.length;
  document.getElementById('recuValidationV2-codesaq').value = item.codeSAQ || '';
  document.getElementById('recuValidationV2-qte').value = (item.qte && item.qte > 0) ? item.qte : 1;
  document.getElementById('recuValidationV2-statut').textContent = '';

  var codeSAQ = (item.codeSAQ || '').toString().trim();
  document.getElementById('recuValidationV2-nom').value = codeSAQ ? 'Recherche...' : '';
  if (!codeSAQ) return;

  var connu = (ALL_DATA || []).filter(function(i) { return (i['Code SAQ'] || '').toString().trim() === codeSAQ; })[0];
  if (connu) {
    document.getElementById('recuValidationV2-nom').value = decodeHTML(connu.Nom || '');
    return;
  }

  appelBackend('testScrapingSAQ', { codeSAQ: codeSAQ }, { spinner: '' }).then(function(res) {
    var nom = (res && res.success && res.data) ? (res.data.nom || '') : '';
    document.getElementById('recuValidationV2-nom').value = nom ? decodeHTML(nom) : 'Vin introuvable, vérifiez le code';
  }).catch(function() {
    document.getElementById('recuValidationV2-nom').value = 'Vin introuvable, vérifiez le code';
  });
}

function passerRecuVinV2() {
  RECU_V2_INDEX++;
  afficherProchainRecuVinV2();
}

function confirmerRecuVinV2() {
  var codeSAQ = document.getElementById('recuValidationV2-codesaq').value.replace(/\D/g, '').trim();
  var statutEl = document.getElementById('recuValidationV2-statut');
  if (!codeSAQ) { statutEl.textContent = 'Entrez un code SAQ'; return; }

  var qte = parseInt((document.getElementById('recuValidationV2-qte').value || '1'), 10);
  if (!(qte >= 1 && qte <= 99)) qte = 1;
  var bouteilles = [];
  for (var b = 0; b < qte; b++) bouteilles.push({ meuble: '', rangee: '', espace: '' });

  testSAQAvecRetryV2(codeSAQ).then(function(scrap) {
    var codeCUP = scrap && scrap.success && scrap.data ? (scrap.data.codeCUP || '').replace(/\D/g, '').trim() : '';
    if (!codeCUP) {
      statutEl.textContent = 'Vin introuvable, corrigez le code';
      return;
    }
    return appelBackend('ajouterVinAvecBouteilles', { codebarre: codeCUP, codeSAQ: codeSAQ, note: '', bouteilles: JSON.stringify(bouteilles), nom: '' }, { spinner: 'Ajout' }).then(function(res) {
      if (!res || !res.success) {
        statutEl.textContent = (res && res.message) || 'Erreur d\'ajout';
        return;
      }
      return appelBackend('getInventoryData', {}, { spinner: 'Ajout' }).then(function(data) {
        if (data) ALL_DATA = data;
        RECU_V2_INDEX++;
        afficherProchainRecuVinV2();
      });
    });
  }).catch(function() {
    statutEl.textContent = 'Erreur, réessayez';
  });
}

// ==================== RECHERCHE V2 ====================
function ouvrirRechercheV2() {
  document.getElementById('rechercheV2Container').style.display = 'flex';
  remonterScrollV2('rechercheV2Container');
  var champ = document.getElementById('rechercheV2-champ');
  champ.value = '';
  filtresRechercheV2 = { sommelier: '', couleur: '', cepage: '', pays: '', appellation: '', accords: '', pastille: '', cave: false };
  remplirFiltresRechercheV2();
  document.getElementById('rechercheV2-compte').textContent = '';
  document.getElementById('rechercheV2-cartes').innerHTML = '<div class="texte-secondaire">Tape un mot : vin, producteur, arôme, aliment, sommelier, recette…</div>';
  RECHERCHE_V2_SECTION_OUVERTE = '';
  chargerSourcesRechercheV2();
}

function fermerRechercheV2() {
  fermerFiltresRechercheV2();
  document.getElementById('rechercheV2Container').style.display = 'none';
}

var filtresRechercheV2 = { sommelier: '', couleur: '', cepage: '', pays: '', appellation: '', accords: '', pastille: '', cave: false };
var libellesFiltreRechercheV2 = { sommelier: 'Sommelier', couleur: 'Couleur', cepage: 'Cépage', pays: 'Pays', appellation: 'Appellation', accords: 'Accords', pastille: 'Pastille de goût' };

function ouvrirFiltresRechercheV2() { clicLoupeV2('rechercheV2', reinitialiserFiltresRechercheV2); }
function fermerFiltresRechercheV2() {
  document.getElementById('rechercheV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('rechercheV2-filtres').classList.remove('ouvert');
}

function remplirFiltresRechercheV2() {
  var f = filtresRechercheV2;
  var caveBtn = document.getElementById('rechercheV2-cave');
  if (caveBtn) { caveBtn.classList.toggle('actif', f.cave); caveBtn.textContent = f.cave ? '✓' : '✗'; }
  var base = (ALL_DATA || []);

  var vusSom = {};
  var sommeliers = [];
  (ALL_SUGGESTIONS || []).forEach(function(s) {
    var v = (s.sommelier || '').toString().trim();
    var k = normaliserRechercheV2(v);
    if (v && !vusSom[k]) { vusSom[k] = true; sommeliers.push(v); }
  });
  sommeliers.sort(function(a, b) { return a.localeCompare(b); });
  var menuSom = document.getElementById('rechercheV2-f-sommelier-menu');
  if (menuSom) {
    menuSom.innerHTML = '<div class="item-liste' + (f.sommelier === '' ? ' actif' : '') + '" onclick="choisirFiltreRechercheV2(\'sommelier\', \'\')">Tous</div>' + sommeliers.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(v, f.sommelier) + '" onclick="choisirFiltreRechercheV2(\'sommelier\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
  }
  var dispSom = document.getElementById('rechercheV2-f-sommelier-display');
  if (dispSom) dispSom.textContent = libelleChoixV2(f.sommelier, 'Sommelier');

  var forCouleur = base;
  var forCepage = base.filter(function(i){ return passeFiltreV2(f.couleur, i.Couleur); });
  var forPays = forCepage.filter(function(i){ return passeFiltreV2(f.cepage, i.Cepage, contientTexteV2); });
  var forAppellation = forPays.filter(function(i){ return passeFiltreV2(f.pays, i.Pays); });
  var forAccords = forAppellation.filter(function(i){ return passeFiltreV2(f.appellation, i.Appellation); });
  var forPastille = forAccords.filter(function(i){ return passeFiltreV2(f.accords, i.Accords || '', contientChaineV2); });

  var sets = { couleur: {}, cepage: {}, pays: {}, appellation: {}, accords: {}, pastille: {} };
  function retenir(cle, v) { var k = normaliserRechercheV2(v); if (v && !sets[cle][k]) sets[cle][k] = v; }
  forCouleur.forEach(function(i){ retenir('couleur', i.Couleur); });
  forCepage.forEach(function(i){ (i.Cepage || '').split(',').map(function(x){return x.trim();}).filter(Boolean).forEach(function(x){ retenir('cepage', x); }); });
  forPays.forEach(function(i){ retenir('pays', i.Pays); });
  forAppellation.forEach(function(i){ retenir('appellation', i.Appellation); });
  forAccords.forEach(function(i){ (i.Accords || '').split(',').map(function(x){return x.trim();}).filter(Boolean).forEach(function(x){ retenir('accords', x); }); });
  forPastille.forEach(function(i){ retenir('pastille', i['Pastille gout']); });

  Object.keys(sets).forEach(function(cle) {
    var menu = document.getElementById('rechercheV2-f-' + cle + '-menu');
    if (!menu) return;
    var opts = Object.keys(sets[cle]).map(function(k){ return sets[cle][k]; }).sort(function(a,b){ return a.localeCompare(b); });
    var cur = filtresRechercheV2[cle];
    menu.innerHTML = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="choisirFiltreRechercheV2(\'' + cle + '\', \'\')">Tous</div>' + opts.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(v, cur) + '" onclick="choisirFiltreRechercheV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('rechercheV2-f-' + cle + '-display');
    if (disp) disp.textContent = libelleChoixV2(cur, libellesFiltreRechercheV2[cle]);
  });
}

function basculerFiltreRechercheV2(cle) {
  var menu = document.getElementById('rechercheV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['sommelier','couleur','cepage','pays','appellation','accords','pastille'].forEach(function(k) {
    document.getElementById('rechercheV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreRechercheV2(cle, valeur) {
  filtresRechercheV2[cle] = cycleFiltreV2(filtresRechercheV2[cle], valeur);
  document.getElementById('rechercheV2-f-' + cle + '-menu').classList.remove('ouvert');
  remplirFiltresRechercheV2();
  lancerRechercheV2();
}

function reinitialiserFiltresRechercheV2() {
  filtresRechercheV2 = { sommelier: '', couleur: '', cepage: '', pays: '', appellation: '', accords: '', pastille: '', cave: false };
  ['sommelier','couleur','cepage','pays','appellation','accords','pastille'].forEach(function(k) {
    document.getElementById('rechercheV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  remplirFiltresRechercheV2();
  lancerRechercheV2();
  fermerFiltresRechercheV2();
}

function normaliserRechercheV2(t) {
  return (t || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function memeTexteV2(a, b) {
  return normaliserRechercheV2(a) === normaliserRechercheV2(b);
}

function contientTexteV2(texte, morceau) {
  return normaliserRechercheV2(texte).indexOf(normaliserRechercheV2(morceau)) !== -1;
}

function toggleCaveRechercheV2() {
  filtresRechercheV2.cave = !filtresRechercheV2.cave;
  remplirFiltresRechercheV2();
  lancerRechercheV2();
}

// Carte d'un vin groupé (grouperVinsV2) : photo, nom, origine, « X btl » + emplacements, voilée à 0 bouteille → sa fiche.
// Même carte dans la recherche et dans Comparables (écran du scan).
// Provenance 'comparable' (menu d'action, AU-DESSUS de la fiche) : naviguerV2 masque le menu, le ✕ de la fiche le rouvre.
function carteGroupeVinV2(g, provenance) {
  var w = g.wine;
  var nom = decodeHTML(w.Nom || '—');
  var sous = sousVinV2(w);
  var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
  var ouvrir = provenance === 'comparable' ? 'naviguerV2' : 'ouvrirApresTap';
  var onclick = g.cb ? ' onclick="' + ouvrir + '(function(){ouvrirFicheV2(\'' + g.cb + '\', \'' + provenance + '\')})"' : '';
  var vide = g.count === 0 ? ' carte-vide' : '';
  var emp = (g.emplacements && g.emplacements.length) ? '<br>' + g.emplacements.join('<br>') : '';
  return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '>' + photo +
         '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
         '<div class="carte-droite">' + caseDroiteV2(w, g.count) + emp + '</div></div>';
}

// Limite d'affichage par section : au-delà, le mot est trop large pour être utile.
var MAX_SECTION_RECHERCHE_V2 = 50;
// Section d'accords dépliée (par son titre) : elle survit aux frappes suivantes.
var RECHERCHE_V2_SECTION_OUVERTE = '';

// Les listes d'accords ne sont chargées qu'à l'ouverture de leur page. La recherche
// les fouille toutes : elle va chercher celles qui manquent (une fois par session ;
// le bouton « Données » les revide).
function chargerSourcesRechercheV2() {
  var aFaire = [];
  if (!ALL_NOTES || !ALL_NOTES.length) aFaire.push({ action: 'getNotesAccord', poser: function(d) { ALL_NOTES = d || []; } });
  if (!ALL_ACCORDS) aFaire.push({ action: 'getChartier', poser: function(d) { ALL_ACCORDS = d || []; } });
  if (!ALL_RECETTES) aFaire.push({ action: 'getRecettes', poser: function(d) { ALL_RECETTES = d || []; } });
  if (!ALL_CURIEUXBEGIN) aFaire.push({ action: 'getCurieuxBegin', poser: function(d) { ALL_CURIEUXBEGIN = d || []; } });
  if (!aFaire.length) return;
  var chaine = Promise.resolve();
  aFaire.forEach(function(src) {
    chaine = chaine.then(function() {
      return appelBackend(src.action, {}, { spinner: ' ' }).then(function(d) { src.poser(d); });
    });
  });
  chaine.then(function() {
    if (document.getElementById('rechercheV2Container').style.display !== 'none') lancerRechercheV2();
  }).catch(function(err) {
    afficherMessage('Recherche : ' + ((err && err.message) ? err.message : err));
  });
}

// Ouvre Chartier déjà filtré sur un cépage (depuis un résultat de recherche).
function ouvrirChartierCepageV2(cep) {
  cacherToutesPagesV2();
  ouvrirChartierV2();
  filtresChartierV2.cepage = cep;
  remplirCepageMenuChartierV2();
  calculerResultatsChartierV2();
}

// La recherche fouille TOUT : vins, notes, propositions, Chartier, recettes SAQ,
// Curieux Bégin. Une section par source, dans l'ordre du menu « Accord selon… ».
// Les filtres du panneau (couleur, cépage, sommelier…) ne portent que sur les vins.
function lancerRechercheV2() {
  var terme = normaliserRechercheV2(document.getElementById('rechercheV2-champ').value.trim());
  var compte = document.getElementById('rechercheV2-compte');
  var div = document.getElementById('rechercheV2-cartes');
  var f = filtresRechercheV2;
  var loupe = document.getElementById('rechercheV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(f.sommelier || f.couleur || f.cepage || f.pays || f.appellation || f.accords || f.pastille || f.cave));
  if (terme.length < 2 && !f.sommelier) {
    compte.textContent = '';
    div.innerHTML = '<div class="texte-secondaire">Tape un mot : vin, producteur, arôme, aliment, sommelier, recette…</div>';
    return;
  }
  var saqSommelier = null;
  if (f.sommelier) {
    saqSommelier = {};
    (ALL_SUGGESTIONS || []).forEach(function(s) {
      if (s.sommelier === valeurChoixV2(f.sommelier)) saqSommelier[s.codeSAQ] = true;
    });
  }
  var champsExclus = { row: 1, bottle: 1, Statut: 1, Meuble: 1, Rangee: 1, Espace: 1, 'Date d\'ajout': 1, 'Date sortie': 1, Source: 1, 'Photo URL': 1 };
  var trouves = (ALL_DATA || []).filter(function(i) {
    return (!saqSommelier || passeFiltreV2(f.sommelier, !!saqSommelier[(i['Code SAQ'] || '').toString().trim()], function(propose) { return propose; })) &&
      passeFiltreV2(f.couleur, i.Couleur) &&
      passeFiltreV2(f.cepage, i.Cepage, contientTexteV2) &&
      passeFiltreV2(f.pays, i.Pays) &&
      passeFiltreV2(f.appellation, i.Appellation) &&
      passeFiltreV2(f.accords, i.Accords || '', contientChaineV2) &&
      passeFiltreV2(f.pastille, i['Pastille gout'], contientTexteV2) &&
      (terme.length < 2 || Object.keys(i).some(function(k) {
        if (champsExclus[k]) return false;
        return normaliserRechercheV2(i[k]).indexOf(terme) !== -1;
      }));
  });
  var groups = grouperVinsV2(trouves);
  if (f.cave) groups = groups.filter(function(g) { return g.count > 0; });

  var sections = [];
  if (groups.length) {
    sections.push({ titre: 'Vins', pliable: false, total: groups.length, montres: groups.length, html: groups.map(function(g) { return carteGroupeVinV2(g, 'recherche'); }).join('') });
  }

  if (terme.length >= 2) {
    var contient = function(parts) { return normaliserRechercheV2(parts.filter(Boolean).join(' ')).indexOf(terme) !== -1; };
    var infos = saqInfosV2();
    var tousVins = grouperVinsV2(ALL_DATA || []);

    // --- Mes notes : aliments, ce que ça appelle, qui l'a dit
    var notes = (ALL_NOTES || []).filter(function(n) { return contient([n.aliments, n.appelle, n.source, n.cepages, n.appellations]); });
    ajouterSectionRechercheV2(sections, 'Mes notes', notes, function(n) { return groupeNoteV2(n, tousVins, 'recherche'); });

    // --- Propositions : sommelier, note, nom du vin
    var props = (ALL_SUGGESTIONS || []).filter(function(sg) {
      var w = infos[sg.codeSAQ] || {};
      return contient([sg.sommelier, sg.note, decodeHTML(w.Nom || '')]);
    });
    var parSaq = {};
    props.forEach(function(sg) {
      if (!parSaq[sg.codeSAQ]) parSaq[sg.codeSAQ] = { codeSAQ: sg.codeSAQ, wine: infos[sg.codeSAQ] || {}, items: [] };
      parSaq[sg.codeSAQ].items.push(sg);
    });
    ajouterSectionRechercheV2(sections, 'Propositions', Object.keys(parSaq).map(function(k) { return parSaq[k]; }), groupeSuggestionV2);

    // --- Chartier : cépage, aliment, nuance, source
    var ch = (ALL_ACCORDS || []).filter(function(a) { return contient([a.cepage, a.aliment, a.nuance, a.source]); });
    ajouterSectionRechercheV2(sections, 'Chartier', ch, function(a) {
      var sousCh = [a.cepage, a.nuance, a.source].filter(Boolean).join(' · ');
      var cepEsc = (a.cepage || '').replace(/'/g, "\\'");
      var oc = a.cepage ? ' onclick="ouvrirApresTap(function(){ouvrirChartierCepageV2(\'' + cepEsc + '\')})"' : '';
      return '<div class="carte fiche-mets"' + oc + '><div class="carte-centre"><span class="carte-titre">' + (a.aliment || '—') + '</span><span class="carte-sous">' + sousCh + '</span></div></div>';
    });

    // --- Recettes SAQ : nom, types de plats, ingrédients
    var recs = (ALL_RECETTES || []).filter(function(r) {
      return contient([decodeHTML(r.nom || ''), (r.typesPlats || []).join(' '), (r.ingredients || []).join(' ')]);
    });
    ajouterSectionRechercheV2(sections, 'Recettes SAQ', recs, carteRecetteSaqV2);

    // --- Curieux Bégin : plat, vin, cépage
    var cbs = (ALL_CURIEUXBEGIN || []).filter(function(a) {
      var w = infos[(a.codeSAQ || '').toString().trim()];
      return contient([a.plat, a.vin, a.cepage, w ? (w.Nom || '') : '']);
    });
    var parCb = {};
    cbs.forEach(function(a) {
      var cs = (a.codeSAQ || '').toString().trim();
      if (!parCb[cs]) parCb[cs] = { codeSAQ: cs, wine: infos[cs] || null, ref: a, items: [] };
      parCb[cs].items.push(a);
    });
    ajouterSectionRechercheV2(sections, 'Curieux Bégin', Object.keys(parCb).map(function(k) { return parCb[k]; }), function(g) { return groupeCurieuxBeginV2(g, 'recherche'); });
  }

  var total = sections.reduce(function(n, sec) { return n + sec.total; }, 0);
  compte.textContent = total + ' résultat' + (total > 1 ? 's' : '');
  if (!sections.length) { div.innerHTML = '<div class="texte-secondaire">Aucun résultat</div>'; return; }
  var pliables = sections.filter(function(sec) { return sec.pliable; });
  // Rien d'ouvert par défaut, sauf s'il n'y a aucun vin : la première section s'ouvre alors.
  var titreOuvert = RECHERCHE_V2_SECTION_OUVERTE;
  if (!pliables.some(function(sec) { return sec.titre === titreOuvert; })) {
    titreOuvert = (sections.length && !sections[0].pliable) ? '' : (pliables.length ? pliables[0].titre : '');
  }
  div.innerHTML = sections.map(function(sec, i) {
    var reste = sec.total - sec.montres;
    var coupe = reste > 0 ? '<div class="texte-secondaire">' + reste + ' de plus — précise ton mot</div>' : '';
    if (!sec.pliable) return '<div class="emp-meuble">' + sec.titre + '</div>' + sec.html + coupe;
    var ouvert = (sec.titre === titreOuvert);
    return '<div class="emp-meuble emp-meuble-pliable' + (ouvert ? ' ouvert' : '') + '" onclick="basculerSectionRechercheV2(' + i + ')">' + sec.titre + '</div>' +
           '<div id="rechercheV2-section-' + i + '" class="menu-liste' + (ouvert ? ' ouvert' : '') + '" data-titre="' + sec.titre + '">' + sec.html + coupe + '</div>';
  }).join('');
  RECHERCHE_V2_SECTION_OUVERTE = titreOuvert;
}

// Une note ou une proposition corrigée depuis la recherche : remettre la liste à jour.
function rafraichirRechercheSiOuverteV2() {
  var c = document.getElementById('rechercheV2Container');
  if (c && c.style.display !== 'none') lancerRechercheV2();
}

// Ajoute une section de résultats, coupée à MAX_SECTION_RECHERCHE_V2 cartes.
// Tout ce qui vient d'« Accord selon… » est pliable : la page reste lisible.
function ajouterSectionRechercheV2(sections, titre, liste, rendu) {
  if (!liste.length) return;
  var montres = liste.slice(0, MAX_SECTION_RECHERCHE_V2);
  sections.push({ titre: titre, pliable: true, total: liste.length, montres: montres.length, html: montres.map(function(x) { return rendu(x); }).join('') });
}

// Une seule section d'accords ouverte à la fois ; elle le reste pendant qu'on tape.
function basculerSectionRechercheV2(i) {
  var cible = document.getElementById('rechercheV2-section-' + i);
  if (!cible) return;
  var etait = cible.classList.contains('ouvert');
  Array.prototype.forEach.call(document.querySelectorAll('#rechercheV2-cartes .menu-liste'), function(d) { d.classList.remove('ouvert'); });
  Array.prototype.forEach.call(document.querySelectorAll('#rechercheV2-cartes .emp-meuble-pliable'), function(t) { t.classList.remove('ouvert'); });
  if (etait) { RECHERCHE_V2_SECTION_OUVERTE = ''; return; }
  cible.classList.add('ouvert');
  if (cible.previousElementSibling) cible.previousElementSibling.classList.add('ouvert');
  RECHERCHE_V2_SECTION_OUVERTE = cible.getAttribute('data-titre') || '';
}

// ==================== MES NOTES D'ACCORD V2 ====================
// Une phrase entendue (« asperge et crabe m'amènent un chablis »), notée telle
// quelle : des aliments, ce que ça appelle, qui l'a dit. Aucun lien avec un vin
// précis — c'est ce qui la distingue des Propositions.
var filtresNotesV2 = { source: '', cave: false };
var noteEditV2 = { row: 0 };

function ouvrirNotesV2() {
  document.getElementById('notesV2Container').style.display = 'flex';
  remonterScrollV2('notesV2Container');
  filtresNotesV2 = { source: '', cave: false };
  var champ = document.getElementById('notesV2-f-texte');
  if (champ) champ.value = '';
  if (ALL_NOTES && ALL_NOTES.length) { remplirFiltresNotesV2(); afficherNotesV2(); return; }
  appelBackend('getNotesAccord', {}, { spinner: ' ' }).then(function(data) {
    ALL_NOTES = data || [];
    remplirFiltresNotesV2();
    afficherNotesV2();
  }).catch(function(err) { retourAccueilV2('Notes d\'accord : ' + err); });
}

function fermerNotesV2() {
  fermerFiltresNotesV2();
  document.getElementById('notesV2Container').style.display = 'none';
}

function ouvrirFiltresNotesV2() { clicLoupeV2('notesV2', reinitialiserFiltresNotesV2); }
function fermerFiltresNotesV2() {
  document.getElementById('notesV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('notesV2-filtres').classList.remove('ouvert');
}
function basculerFiltreNotesV2(cle) {
  var menu = document.getElementById('notesV2-f-' + cle + '-menu');
  menu.classList.toggle('ouvert');
}
function choisirFiltreNotesV2(cle, valeur) {
  filtresNotesV2[cle] = cycleFiltreV2(filtresNotesV2[cle], valeur);
  document.getElementById('notesV2-f-' + cle + '-menu').classList.remove('ouvert');
  remplirFiltresNotesV2();
  afficherNotesV2();
}
function toggleCaveNotesV2() {
  filtresNotesV2.cave = !filtresNotesV2.cave;
  remplirFiltresNotesV2();
  afficherNotesV2();
}

function reinitialiserFiltresNotesV2() {
  filtresNotesV2 = { source: '', cave: false };
  var champ = document.getElementById('notesV2-f-texte');
  if (champ) champ.value = '';
  document.getElementById('notesV2-f-source-menu').classList.remove('ouvert');
  remplirFiltresNotesV2();
  afficherNotesV2();
  fermerFiltresNotesV2();
}

function remplirFiltresNotesV2() {
  var cur = filtresNotesV2.source;
  var sources = uniqueValeursAchat(ALL_NOTES || [], 'source');
  var menu = document.getElementById('notesV2-f-source-menu');
  if (menu) {
    menu.innerHTML = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="choisirFiltreNotesV2(\'source\', \'\')">Tous</div>' + sources.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(String(v), cur) + '" onclick="choisirFiltreNotesV2(\'source\', \'' + String(v).replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
  }
  var disp = document.getElementById('notesV2-f-source-display');
  if (disp) disp.textContent = libelleChoixV2(cur, 'Qui l\'a dit');
  var btnCave = document.getElementById('notesV2-cave');
  if (btnCave) { btnCave.classList.toggle('actif', filtresNotesV2.cave); btnCave.textContent = filtresNotesV2.cave ? '✓' : '✗'; }
}

// Les vins que la note appelle. « Chablis » est une appellation, pas un cépage :
// on compare aux DEUX, et dans les deux sens (« un chablis bien frais » aussi).
// Note d'accord (28 oct. 2026) : ce que ça appelle = des cépages et des appellations, en listes (« ;; » dans le Sheet).
function listeNoteV2(texte) { return (texte || '').toString().split(';;').map(function(v) { return v.trim(); }).filter(Boolean); }

// Les vins que la note appelle : cépage PRINCIPAL parmi ses cépages (synonymes compris : « Grenache » trouve
// Cannonau et Garnacha), ou appellation parmi ses appellations. Une ancienne note (texte libre seulement) :
// le texte est comparé au Cépage ET à l'Appellation, dans les deux sens (« un chablis bien frais »).
function vinsDeLaNoteV2(n, groupes) {
  var ceps = listeNoteV2(n.cepages), apps = listeNoteV2(n.appellations);
  var q = (n.appelle || '').toString().trim();
  if (!ceps.length && !apps.length && !q) return [];
  var cles = {};
  ceps.forEach(function(c) { cles[cleCepageMenageV2(cepageCommunMenageV2(c))] = true; });
  return groupes.filter(function(g) {
    if (estPropositionV2(g.wine)) return false;
    if (filtresNotesV2.cave && !g.count) return false;
    if (!ceps.length && !apps.length) {
      return [g.wine.Cepage, g.wine.Appellation].some(function(v) {
        v = (v || '').toString().trim();
        if (!v) return false;
        return contientTexteV2(v, q) || contientTexteV2(q, v);
      });
    }
    var cep = decodeHTML(cepageDominant(g.wine));
    if (cep && cles[cleCepageMenageV2(cepageCommunMenageV2(cep))]) return true;
    return apps.some(function(a) { return memeTexteV2(decodeHTML(g.wine.Appellation || ''), a); });
  });
}

// Valeurs connues pour les pastilles d'une note : celles de mes vins (+ cépages de la config), et celles déjà notées
function valeursConnuesNoteV2(champ) {
  var vues = {}, out = [];
  var retenir = function(v) { v = decodeHTML((v || '').toString().trim()); var k = normaliserRechercheV2(v); if (v && !vues[k]) { vues[k] = true; out.push(v); } };
  (ALL_DATA || []).forEach(function(w) {
    if (champ === 'cepages') (w.Cepage || '').toString().split(',').forEach(retenir);
    else retenir(w.Appellation);
  });
  if (champ === 'cepages' && CONFIG && CONFIG.couleurs) Object.keys(CONFIG.couleurs).forEach(function(c) { (CONFIG.couleurs[c] || []).forEach(retenir); });
  (ALL_NOTES || []).forEach(function(n) { listeNoteV2(n[champ]).forEach(retenir); });
  return out.sort(function(a, b) { return a.localeCompare(b); });
}

function afficherNotesV2() {
  var champ = document.getElementById('notesV2-f-texte');
  var texte = normaliserRechercheV2(champ ? champ.value.trim() : '');
  var src = filtresNotesV2.source;
  var liste = (ALL_NOTES || []).filter(function(n) {
    return passeFiltreV2(src, String(n.source)) &&
      (!texte || normaliserRechercheV2([n.aliments, n.appelle, n.source, n.cepages, n.appellations].join(' ')).indexOf(texte) !== -1);
  });

  var loupe = document.getElementById('notesV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(src || texte || filtresNotesV2.cave));

  document.getElementById('notesV2-compte').textContent = liste.length + ' note' + (liste.length > 1 ? 's' : '');
  var div = document.getElementById('notesV2-cartes');
  if (!liste.length) { div.innerHTML = '<div class="texte-secondaire">Aucune note</div>'; return; }
  var groupes = grouperVinsV2(ALL_DATA || []);
  div.innerHTML = liste.map(function(n) { return groupeNoteV2(n, groupes); }).join('');
}

// Une note + les vins qu'elle appelle : même bloc sur la page Mes notes et dans la recherche (provenance 'recherche').
// La fiche est sous cette page dans le HTML : depuis la page, on la ferme avant d'ouvrir la fiche (le ✕ la rouvre).
function groupeNoteV2(n, groupes, provenance) {
  var sous = [n.aliments, n.source].filter(Boolean).join(' · ');
  var carteNote = '<div class="carte histo-vin">' +
           '<div class="carte-centre"><span class="carte-titre">' + (resumeNoteV2(n) || '—') + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + (n.date || '') +
           '<span class="corriger-crayon" onclick="event.stopPropagation();ouvrirApresTap(function(){ouvrirNoteEditV2(' + n.row + ')})">✎</span>' +
           '</div></div>';
  var vins = vinsDeLaNoteV2(n, groupes);
  var cartesVins = vins.map(function(g) {
    var w = g.wine;
    var cb = (w['Code-barres'] || '').toString().trim();
    var ouvrir = provenance === 'recherche' ? 'ouvrirFicheV2(\'' + cb + '\', \'recherche\')' : 'fermerNotesV2();ouvrirFicheV2(\'' + cb + '\', \'notes\')';
    var onclick = cb ? ' onclick="ouvrirApresTap(function(){' + ouvrir + '})"' : '';
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    return '<div class="carte histo-mets ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
      '<div class="carte-centre"><span class="carte-titre">' + decodeHTML(w.Nom || '—') + '</span><span class="carte-sous">' + sousVinV2(w) + '</span></div>' +
      '<div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
  }).join('');
  if (!cartesVins) cartesVins = '<div class="carte histo-mets"><div class="carte-centre"><span class="carte-sous">Aucun vin</span></div></div>';
  return '<div class="histo-groupe">' + carteNote + cartesVins + '</div>';
}

// Titre d'une note : ses cépages · ses appellations ; une ancienne note, son texte
function resumeNoteV2(n) {
  var t = [listeNoteV2(n.cepages).join(', '), listeNoteV2(n.appellations).join(', ')].filter(Boolean).join(' · ');
  return t || n.appelle || '';
}

function ajouterDepuisNotesV2() {
  fermerFiltresNotesV2();
  ouvrirApresTap(function() { ouvrirNoteEditV2(0); });
}

// row = 0 → nouvelle note ; sinon correction de la ligne du Sheet.
function ouvrirNoteEditV2(row) {
  var n = row ? (ALL_NOTES || []).filter(function(x) { return String(x.row) === String(row); })[0] : null;
  // une ancienne note (texte libre seulement) : son texte est rappelé pour le reprendre en cépages / appellations
  var ancien = n && !listeNoteV2(n.cepages).length && !listeNoteV2(n.appellations).length ? (n.appelle || '') : '';
  noteEditV2 = { row: row || 0, ancien: ancien };
  PASTILLES_V2.noteEditV2 = { valeurs: { cepages: listeNoteV2(n && n.cepages), appellations: listeNoteV2(n && n.appellations) }, connues: valeursConnuesNoteV2, champs: ['cepages', 'appellations'] };
  ['cepages', 'appellations'].forEach(function(champ) {
    var menu = document.getElementById('noteEditV2-' + champ + '-menu');
    menu.classList.remove('ouvert'); menu.innerHTML = '';
    rendrePastillesV2('noteEditV2', champ);
  });
  var elAncien = document.getElementById('noteEditV2-ancien');
  elAncien.textContent = ancien ? 'Avant : « ' + ancien + ' »' : '';
  elAncien.style.display = ancien ? 'block' : 'none';
  document.getElementById('noteEditV2-aliments').value = n ? (n.aliments || '') : '';
  document.getElementById('noteEditV2-source').value = n ? (n.source || '') : '';
  document.getElementById('noteEditV2-btn-supprimer').style.display = n ? 'flex' : 'none';
  document.getElementById('noteEditV2Overlay').style.display = 'flex';
  remonterScrollV2('noteEditV2Overlay');
}

function fermerNoteEditV2() {
  document.getElementById('noteEditV2Overlay').style.display = 'none';
}

function confirmerNoteEditV2() {
  var aliments = document.getElementById('noteEditV2-aliments').value.trim();
  var source = document.getElementById('noteEditV2-source').value.trim();
  var listes = PASTILLES_V2.noteEditV2.valeurs;
  if (!aliments) { afficherMessage('Il faut au moins un aliment'); return; }
  // « Appelle » garde le résumé (lisible dans le Sheet, et la note marche même avec un serveur pas redéployé) ;
  // une ancienne note qu'on ne reprend pas en listes garde son texte
  var appelle = resumeNoteV2({ cepages: listes.cepages.join(';;'), appellations: listes.appellations.join(';;') }) || noteEditV2.ancien;
  if (!appelle) { afficherMessage('Il manque ce que ça appelle : un cépage ou une appellation'); return; }
  var route = noteEditV2.row ? 'corrigerNoteAccord' : 'ajouterNoteAccord';
  var avecListes = listes.cepages.length || listes.appellations.length;
  var listesIgnorees = false;
  appelBackend(route, { row: noteEditV2.row, aliments: aliments, appelle: appelle, source: source, cepages: listes.cepages.join(';;'), appellations: listes.appellations.join(';;') }, { spinner: 'Sauvegarde' }).then(function(res) {
    if (res && res.success === false) throw new Error(res.message || 'refusée');
    // un serveur pas encore redéployé ignore les listes sans le dire : la note garde au moins le résumé
    listesIgnorees = avecListes && !(res && res.avecListes);
    ALL_NOTES = [];
    return appelBackend('getNotesAccord', {}, { spinner: 'Sauvegarde' });
  }).then(function(data) {
    ALL_NOTES = data || [];
    fermerNoteEditV2();
    remplirFiltresNotesV2();
    afficherNotesV2();
    rafraichirRechercheSiOuverteV2();
    afficherMessage(listesIgnorees ? 'Note enregistrée, en texte seulement : Code.gs à recoller' : 'Note enregistrée');
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

function supprimerNoteEditV2() {
  if (!noteEditV2.row) return;
  appelBackend('supprimerNoteAccord', { row: noteEditV2.row }, { spinner: 'Suppression' }).then(function() {
    ALL_NOTES = [];
    return appelBackend('getNotesAccord', {}, { spinner: 'Suppression' });
  }).then(function(data) {
    ALL_NOTES = data || [];
    fermerNoteEditV2();
    remplirFiltresNotesV2();
    afficherNotesV2();
    rafraichirRechercheSiOuverteV2();
    afficherMessage('Note supprimée');
  }).catch(function(err) { afficherMessage('Erreur: ' + err); });
}

// ==================== EMPLACEMENTS V2 ====================
var filtresEmpV2 = { meuble: '', rangee: '', espace: '', cepage: '', couleur: '', pays: '', appellation: '' };
// Mode d'affichage de la page (section « Afficher » du panneau) : le plan des
// meubles, ou l'une des six listes. La PORTÉE des listes vient du filtre Meuble.
var empV2Mode = 'plan';
var MODES_EMP_V2 = ['plan', 'doubles', 'cepdoubles', 'listemeuble', 'cepmanquants', 'appmanquante', 'fammanquante', 'menage'];

function ouvrirEmpV2() {
  document.getElementById('empV2Container').style.display = 'flex';
  remonterScrollV2('empV2Container');
  filtresEmpV2 = { meuble: '', rangee: '', espace: '', cepage: '', couleur: '', pays: '', appellation: '' };
  empV2Mode = 'plan';
  remplirFiltresEmpV2();
  rendreEmpV2();
}

// Rend ce que le mode courant demande.
function rendreEmpV2() {
  if (empV2Mode === 'plan') afficherEmpV2();
  else if (empV2Mode === 'menage') afficherMenageEmpV2(); // les filtres ne s'y appliquent pas : toute la cave
  else afficherListeEmpV2(empV2Mode);
}

function choisirModeEmpV2(mode) {
  empV2Mode = mode;
  remplirFiltresEmpV2();
  if (mode === 'menage') ouvrirMenageEmpV2(); else rendreEmpV2();
  fermerFiltresEmpV2();
}

function fermerEmpV2() {
  fermerFiltresEmpV2();
  document.getElementById('empV2Container').style.display = 'none';
}

function ouvrirFiltresEmpV2() { clicLoupeV2('empV2', reinitialiserFiltresEmpV2); }
function fermerFiltresEmpV2() {
  document.getElementById('empV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('empV2-filtres').classList.remove('ouvert');
}

// Bouteilles rangées (statut actif + emplacement complet)
function bouteillesRangeesEmpV2() {
  return (ALL_DATA || []).filter(function(i){
    var statut = i.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti') return false;
    return !!(i.Meuble && i.Rangee && i.Espace);
  });
}

// Bouteilles à ranger (actives, sans emplacement complet)
function bouteillesARangerEmpV2() {
  return (ALL_DATA || []).filter(function(i){
    var statut = i.Statut || 'En stock';
    if (statut === 'Bu' || statut === 'Sorti' || statut === 'Suggestion') return false;
    return i.bottle && i.bottle > 0 && !(i.Meuble && i.Rangee && i.Espace);
  });
}

function remplirFiltresEmpV2() {
  var f = filtresEmpV2;
  var base = bouteillesRangeesEmpV2();

  var meubles = uniqueValeursAchat(base, 'Meuble');
  if (bouteillesARangerEmpV2().length) meubles.push('À ranger');
  var forRangee = f.meuble ? base.filter(function(i){ return String(i.Meuble) === String(f.meuble); }) : base;
  var rangees = uniqueValeursAchat(forRangee, 'Rangee');
  var forEspace = base.filter(function(i){
    return (!f.meuble || String(i.Meuble) === String(f.meuble)) && (!f.rangee || String(i.Rangee) === String(f.rangee));
  });
  var espaces = uniqueValeursAchat(forEspace, 'Espace');

  // Cépage / Couleur / Pays / Appellation : puisés dans ce que le mode courant peut montrer.
  // Appellation suit le Pays : un pays choisi → seulement ses appellations.
  var baseVin = baseFiltresVinEmpV2();
  var listes = { meuble: meubles, rangee: rangees, espace: espaces,
                 cepage: uniqueCepagesEmpV2(baseVin), couleur: uniqueValeursAchat(baseVin, 'Couleur'), pays: uniqueValeursAchat(baseVin, 'Pays'),
                 appellation: appellationsEmpV2(baseVin) };
  ['meuble','rangee','espace','cepage','couleur','pays','appellation'].forEach(function(cle){
    var cur = f[cle];
    var menu = document.getElementById('empV2-f-' + cle + '-menu');
    menu.innerHTML = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="choisirFiltreEmpV2(\'' + cle + '\', \'\')">Tous</div>' + listes[cle].map(function(v){
      return '<div class="item-liste' + classeChoixV2(String(v), String(cur)) + '" onclick="choisirFiltreEmpV2(\'' + cle + '\', \'' + String(v).replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('empV2-f-' + cle + '-display');
    if (disp) disp.textContent = libelleChoixV2(cur, ({meuble:'Meuble',rangee:'Rangée',espace:'Espace',cepage:'Cépage',couleur:'Couleur',pays:'Pays',appellation:'Appellation'})[cle]);
  });

  // Afficher : le mode courant est allumé ; les deux modes « dans un meuble »
  // n'apparaissent que si un meuble est choisi.
  MODES_EMP_V2.forEach(function(m){
    var el = document.getElementById('empV2-mode-' + m);
    if (el) el.classList.toggle('actif', empV2Mode === m);
  });
  var cepd = document.getElementById('empV2-mode-cepdoubles');
  if (cepd) cepd.style.display = f.meuble ? 'block' : 'none';
  var lstm = document.getElementById('empV2-mode-listemeuble');
  if (lstm) lstm.style.display = (f.meuble && f.meuble !== 'À ranger') ? 'block' : 'none';

  // Loupe : OR si un vrai filtre est actif (jamais pour le mode)
  var loupe = document.getElementById('empV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(f.meuble || f.rangee || f.espace || f.cepage || f.couleur || f.pays || f.appellation));
}

// Appellations du menu : celles du pays choisi seulement (cascade Pays → Appellation)
function appellationsEmpV2(baseVin) {
  var p = filtresEmpV2.pays;
  return uniqueValeursAchat(baseVin.filter(function(i){ return passeFiltreV2(p, i.Pays); }), 'Appellation');
}

// Les vins dans lesquels puiser les valeurs de Cépage / Couleur / Pays.
// Les listes « manquants » montrent des vins hors stock : elles puisent partout.
function baseFiltresVinEmpV2() {
  var f = filtresEmpV2;
  if (empV2Mode === 'cepmanquants' || empV2Mode === 'appmanquante' || empV2Mode === 'fammanquante') {
    return (ALL_DATA || []).filter(function(i){ return !estPropositionV2(i); });
  }
  if (f.meuble === 'À ranger') return bouteillesARangerEmpV2();
  return bouteillesRangeesEmpV2().filter(function(i){
    return (!f.meuble || String(i.Meuble) === String(f.meuble)) &&
      (!f.rangee || String(i.Rangee) === String(f.rangee)) &&
      (!f.espace || String(i.Espace) === String(f.espace));
  });
}

// Un menu de cépages : le cépage dominant de chaque vin, sans doublon.
function uniqueCepagesEmpV2(liste) {
  var vues = {};
  var out = [];
  liste.forEach(function(i){
    var c = cepageDominant(i);
    if (!c) return;
    var k = normaliserRechercheV2(c);
    if (!vues[k]) { vues[k] = true; out.push(c); }
  });
  out.sort(function(a, b){ return a.localeCompare(b); });
  return out;
}

// Cépage · Couleur · Pays · Appellation, appliqués aux vins d'une liste.
function vinPasseFiltresEmpV2(w) {
  var f = filtresEmpV2;
  return passeFiltreV2(f.cepage, w.Cepage, contientTexteV2) &&
    passeFiltreV2(f.couleur, w.Couleur) &&
    passeFiltreV2(f.pays, w.Pays) &&
    passeFiltreV2(f.appellation, w.Appellation, memeTexteV2);
}
function groupesFiltresEmpV2(groupes) {
  return groupes.filter(function(g){ return vinPasseFiltresEmpV2(g.wine); });
}

function basculerFiltreEmpV2(cle) {
  var menu = document.getElementById('empV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['meuble','rangee','espace','cepage','couleur','pays','appellation'].forEach(function(k){
    var m = document.getElementById('empV2-f-' + k + '-menu');
    if (m) m.classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreEmpV2(cle, valeur) {
  // Meuble · Rangée · Espace décident de ce qui est dessiné : « seulement » (pas de « sauf »)
  filtresEmpV2[cle] = (cle === 'meuble' || cle === 'rangee' || cle === 'espace') ? valeur : cycleFiltreV2(filtresEmpV2[cle], valeur);
  document.getElementById('empV2-f-' + cle + '-menu').classList.remove('ouvert');
  if (cle === 'meuble') { filtresEmpV2.rangee = ''; filtresEmpV2.espace = ''; }
  if (cle === 'rangee') { filtresEmpV2.espace = ''; }
  // Nouveau pays : une appellation qui n'y existe pas se vide (jamais une liste vide sans raison)
  if (cle === 'pays' && filtresEmpV2.appellation &&
      !appellationsEmpV2(baseFiltresVinEmpV2()).some(function(a){ return memeTexteV2(a, valeurChoixV2(filtresEmpV2.appellation)); })) {
    filtresEmpV2.appellation = '';
  }
  // Deux modes n'existent que dans un meuble : sans meuble, retour au plan.
  if (!filtresEmpV2.meuble && (empV2Mode === 'cepdoubles' || empV2Mode === 'listemeuble')) empV2Mode = 'plan';
  remplirFiltresEmpV2();
  rendreEmpV2();
}

function reinitialiserFiltresEmpV2() {
  filtresEmpV2 = { meuble: '', rangee: '', espace: '', cepage: '', couleur: '', pays: '', appellation: '' };
  empV2Mode = 'plan';
  ['meuble','rangee','espace','cepage','couleur','pays','appellation'].forEach(function(k) {
    var m = document.getElementById('empV2-f-' + k + '-menu');
    if (m) m.classList.remove('ouvert');
  });
  remplirFiltresEmpV2();
  rendreEmpV2();
  fermerFiltresEmpV2();
}

function empCarteVinV2(w, droite, versFiche) {
  var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
  var nom = decodeHTML(w.Nom || '—');
  var sous = sousVinV2(w);
  var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
  var onclick = cb ? ' onclick="' + (versFiche ? 'ouvrirFicheDepuisListeEmpV2' : 'deplacerDepuisEmpV2') + '(\'' + cb + '\')"' : '';
  return '<div class="carte ' + couleurClasseV2(w.Couleur) + '"' + onclick + '>' + photo +
         '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
         '<div class="carte-droite">' + (droite || '') + '</div></div>';
}

// Vue par défaut : groupé meuble → rangée → cartes
function afficherEmpV2() {
  empV2Mode = 'plan';
  var f = filtresEmpV2;
  var modeARanger = (f.meuble === 'À ranger');
  var aRanger = bouteillesARangerEmpV2();
  var montrerARanger = aRanger.length && (modeARanger || (!f.meuble && !f.rangee && !f.espace));
  var base = modeARanger ? [] : bouteillesRangeesEmpV2().filter(function(i){
    return (!f.meuble || String(i.Meuble) === String(f.meuble)) &&
      (!f.rangee || String(i.Rangee) === String(f.rangee)) &&
      (!f.espace || String(i.Espace) === String(f.espace));
  });

  base.sort(function(a, b){
    if (String(a.Meuble) !== String(b.Meuble)) return String(a.Meuble).localeCompare(String(b.Meuble));
    if (parseInt(a.Rangee) !== parseInt(b.Rangee)) return parseInt(a.Rangee) - parseInt(b.Rangee);
    return parseInt(a.Espace) - parseInt(b.Espace);
  });

  var div = document.getElementById('empV2-cartes');
  var totalEmp = base.length + (montrerARanger ? aRanger.length : 0);
  document.getElementById('empV2-compte').textContent = totalEmp + ' bouteille' + (totalEmp > 1 ? 's' : '');
  if (totalEmp === 0) { div.innerHTML = '<div class="texte-secondaire">Aucune bouteille rangée</div>'; return; }

  // index des bouteilles présentes par meuble|rangee|espace
  var parPlace = {};
  base.forEach(function(w){
    parPlace[w.Meuble + '|' + w.Rangee + '|' + w.Espace] = w;
  });

  // Filtres de vin (Cépage, Couleur, Pays, Appellation) sur le plan : ce qui n'y répond pas s'estompe —
  // rangée ouverte : les autres bouteilles et les espaces vides ; rangée fermée : la rangée entière si rien n'y répond.
  var filtreVin = !!(f.cepage || f.couleur || f.pays || f.appellation);

  // meubles à dessiner : celui filtré, sinon les 3 de CONFIG (ordre alphabétique)
  var meubles = modeARanger ? [] : (f.meuble ? [f.meuble] : Object.keys(CONFIG.meubles || {}).sort(function(a,b){ return a.localeCompare(b); }));

  var html = '';
  meubles.forEach(function(meuble){
    var rangeesDef = (CONFIG.meubles && CONFIG.meubles[meuble]) ? CONFIG.meubles[meuble] : {};
    html += '<div class="emp-bloc"><div class="emp-meuble">' + meuble + '</div>';
    Object.keys(rangeesDef).sort(function(a,b){ return parseInt(a) - parseInt(b); }).forEach(function(rangee){
      if (f.rangee && String(rangee) !== String(f.rangee)) return;
      var espacesDef = rangeesDef[rangee] || [];
      var nb = espacesDef.length;
      var occ = 0;
      var repondent = 0;
      var ronds = [];
      espacesDef.forEach(function(esp){
        var w = parPlace[meuble + '|' + rangee + '|' + esp];
        if (w) occ++;
        var passe = !!w && vinPasseFiltresEmpV2(w);
        if (passe) repondent++;
        var estompe = (filtreVin && !passe) ? ' estompe' : '';
        var photo = (w && w['Photo URL']) ? w['Photo URL'] : '';
        var cb = (w && w['Code-barres']) ? w['Code-barres'].toString().trim().replace(/\s+/g, '') : '';
        var coul = w ? 'var(--' + couleurClasseV2(w.Couleur) + ')' : '';
        ronds.push('<div class="emp-espace"><div class="cercle' + estompe + '" data-photo="' + photo + '" data-cb="' + cb + '" data-row="' + (w ? w.row : '') + '" data-couleur="' + coul + '"></div><span class="emp-espace-num">' + esp + '</span></div>');
      });
      // 7 espaces = quinconce réel : bas 1-3-5-7, haut 2-4-6
      var lignes;
      if (nb === 7) {
        lignes = '<div class="ligne-ronds haut">' + [ronds[1], ronds[3], ronds[5]].join('') + '</div>' +
                 '<div class="ligne-ronds bas">' + [ronds[0], ronds[2], ronds[4], ronds[6]].join('') + '</div>';
      } else {
        lignes = '<div class="ligne-ronds">' + ronds.join('') + '</div>';
      }
      var compteClasse = occ < nb ? ' emp-compte-libre' : '';
      var rangeeEstompee = (filtreVin && !repondent) ? ' estompee' : '';
      html += '<div class="emp-rangee' + rangeeEstompee + '" data-meuble="' + meuble + '" data-rangee="' + rangee + '">' +
                '<span class="emp-rangee-nom">Rangée ' + rangee + '</span>' +
                '<div class="emp-ronds">' + lignes + '</div>' +
                '<span class="emp-compte' + compteClasse + '">' + occ + '/' + nb + '</span>' +
              '</div>';
    });
    html += '</div>';
  });
  if (montrerARanger) {
    var rondsAR = aRanger.map(function(w){
      var photo = w['Photo URL'] || '';
      var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
      var coul = 'var(--' + couleurClasseV2(w.Couleur) + ')';
      var estompe = (filtreVin && !vinPasseFiltresEmpV2(w)) ? ' estompe' : '';
      return '<div class="cercle' + estompe + '" data-photo="' + photo + '" data-cb="' + cb + '" data-row="' + w.row + '" data-couleur="' + coul + '"></div>';
    }).join('');
    html += '<div class="emp-bloc"><div class="emp-meuble">À ranger</div>' +
            '<div class="emp-rangee a-ranger">' +
              '<div class="emp-ronds"><div class="ligne-ronds">' + rondsAR + '</div></div>' +
              '<span class="emp-compte">' + aRanger.length + '</span>' +
            '</div></div>';
  }
  div.innerHTML = html;
  brancherTirerRangeesEmpV2();
}

// Tirer une rangée : gros ronds + photo ; une seule ouverte à la fois
function brancherTirerRangeesEmpV2() {
  var rangees = document.querySelectorAll('#empV2-cartes .emp-rangee');
  Array.prototype.forEach.call(rangees, function(el){
    el.addEventListener('click', function(){
      var dejaOuvert = el.classList.contains('ouvert');
      Array.prototype.forEach.call(rangees, function(r){
        r.classList.remove('ouvert');
        Array.prototype.forEach.call(r.querySelectorAll('.cercle'), function(c){ c.innerHTML = ''; c.style.borderColor = ''; });
      });
      if (!dejaOuvert) {
        el.classList.add('ouvert');
        Array.prototype.forEach.call(el.querySelectorAll('.cercle'), function(c){
          var p = c.getAttribute('data-photo');
          c.innerHTML = p ? '<img src="' + p + '" alt="">' : '';
          c.style.borderColor = c.getAttribute('data-couleur') || '';
          var cb = c.getAttribute('data-cb');
          if (cb) {
            var rowRond = c.getAttribute('data-row');
            c.addEventListener('click', function(ev){
              ev.stopPropagation();
              var liste = el.classList.contains('a-ranger') ? bouteillesARangerEmpV2() : parcoursMeubleEmpV2(el.getAttribute('data-meuble'));
              ouvrirApresTap(function(){ ouvrirPhotoEmpV2(cb, liste, rowRond); });
            });
          } else {
            c.addEventListener('click', function(ev){
              ev.stopPropagation();
              naviguerV2(startScanFromHomeV2);
            });
          }
        });
      }
    });
  });
}

// Parcours d'un meuble en ordre physique : rangée puis espace
function parcoursMeubleEmpV2(meuble) {
  return bouteillesRangeesEmpV2().filter(function(i){
    return String(i.Meuble) === String(meuble);
  }).sort(function(a, b){
    if (parseInt(a.Rangee) !== parseInt(b.Rangee)) return parseInt(a.Rangee) - parseInt(b.Rangee);
    return parseInt(a.Espace) - parseInt(b.Espace);
  });
}

// ==================== TRI ŒNOPHILE (ex-« Ménage de la cave ») — v3 du 26 oct. 2026 ====================
// Emplacements → Afficher → « Tri œnophile ». L'app calcule et dicte LA TOURNÉE de l'utilisateur, en 7 arrêts —
// 1. au cellier (choisir, sors, déplace) · 2. au Pigeonnier (sors, déplace, place ce qui vient du cellier) ·
// 3. en bas, à la Réserve (sors, range ce qui est descendu) · 4. « À ranger » (sors, pose) ·
// 5. à la Réserve en remontant (range ce qui vient d'« À ranger ») · 6. au Pigeonnier (place) · 7. au cellier (place).
// But (utilisateur) : le plus de cépages possible par meuble, puis le plus d'appellations.
// Règles (utilisateur, 25-27 oct.) :
// - une seule règle pour le cellier, le Pigeonnier et la Réserve, dans cet ordre : les cépages absents des meubles
//   du dessus (et du meuble lui-même), puis les appellations absentes, puis le reste — le plus ancien d'abord
//   (dernière fois bu quand l'Historique le sait, sinon la date d'arrivée de la bouteille) ;
// - cellier : blancs rangées 1-3, rouges 4-6, C-7-1 = une vraie place pour un rouge ; le reste de la rangée 7 est une
//   tablette pour les formats embêtants : l'assistant n'y touche pas. Seules ses places libres se remplissent ; ses
//   doublons, c'est l'utilisateur qui choisit ceux qu'il cède (« tu en as 3, cèdes-en 2 ») ;
// - Pigeonnier et Réserve : tout est reclassé ; à égalité, une bouteille déjà en place garde sa place ; aucune place
//   vide tant qu'une bouteille qui convient attend plus bas. La Réserve ne classe pas les couleurs ;
// - « À ranger » (la « mini mini SAQ » de l'utilisateur) : le reste ;
// - un rouge chez les blancs (ou l'inverse) rejoint sa couleur dans son meuble, sinon il suit la cascade ;
// - couleur douteuse, cépage non nommé ou manquant = jamais déplacé (« À vérifier ») ; « pas celle-là » = elle reste ;
// - la boîte de transport : chaque bouteille sortie prend la première case libre (« case 1-1 »), libérée à la pose ;
// - les cases cochées restent gardées dans le téléphone ; un seul « Enregistrer » à la fin.
// Zones : meubles et rangées de l'onglet config — si l'aménagement change, corriger ici.
var ZONES_MENAGE_V2 = {
  Cellier: [
    { nom: 'blancs', rangees: ['1', '2', '3'], couleur: 'vin-blanc' },
    { nom: 'rouges', rangees: ['4', '5', '6'], couleur: 'vin-rouge' },
    { nom: 'place du rouge', rangees: ['7'], espaces: ['1'], couleur: 'vin-rouge' }
  ],
  Pigeonnier: [
    { nom: 'blancs', rangees: ['1', '2', '3'], couleur: 'vin-blanc' },
    { nom: 'rouges', rangees: ['4', '5', '6', '7', '8', '9'], couleur: 'vin-rouge' }
  ]
};
var NOMS_COULEURS_MENAGE_V2 = { 'vin-blanc': 'blancs', 'vin-rouge': 'rouges', 'vin-bulles': 'bulles' };

// La tablette : rangée 7 du cellier, sauf C-7-1
function tabletteMenageV2(p) { return !!p && memeTexteV2(p.meuble, 'Cellier') && String(p.rangee) === '7' && String(p.espace) !== '1'; }

// cedes[bouteille] = doublon cédé par l'utilisateur ; refus[bouteille] = « pas celle-là » (elle ne bouge pas) ;
// faits[ligne] = ligne cochée pendant la tournée. Gardés dans le téléphone jusqu'à l'enregistrement.
var MENAGE_V2 = { cedes: {}, refus: {}, faits: {} };
var CLE_STOCKAGE_MENAGE_V2 = 'dionysos-tri-7-arrets';   // nouvelle clé : les cases cochées de l'ancienne tournée ne valent plus

function garderMenageV2() {
  var M = MENAGE_V2;
  try { localStorage.setItem(CLE_STOCKAGE_MENAGE_V2, JSON.stringify({ cedes: M.cedes, refus: M.refus, faits: M.faits, quand: Date.now() })); } catch (e) {}
}
function reprendreMenageV2() {
  try {
    localStorage.removeItem('dionysos-tri');
    var s = JSON.parse(localStorage.getItem(CLE_STOCKAGE_MENAGE_V2) || 'null');
    if (s && s.quand && Date.now() - s.quand < 7 * 24 * 3600 * 1000) return { cedes: s.cedes || {}, refus: s.refus || {}, faits: s.faits || {} };
  } catch (e) {}
  return { cedes: {}, refus: {}, faits: {} };
}
function oublierMenageV2() { try { localStorage.removeItem(CLE_STOCKAGE_MENAGE_V2); } catch (e) {} }

// Synonymes de cépages (25 oct. 2026) — pour le tri SEULEMENT ; liste tenue ici, à compléter quand
// l'utilisateur en signale un. Nom commun (celui le plus présent en cave) : ses autres noms.
// Restent à part : Garnacha tintorera (= Alicante Bouschet), Grenache blanc, Grenache gris.
var SYNONYMES_CEPAGES_MENAGE_V2 = {
  'Grenache': ['Garnacha', 'Grenache noir', 'Cannonau'],
  'Pinot grigio': ['Pinot gris'],
  'Monastrell': ['Mourvèdre'],
  'Syrah': ['Shiraz'],
  'Tempranillo': ['Tinta Roriz', 'Aragonez', 'Tinto Fino'],
  'Jaen': ['Mencía'],
  'Trebbiano': ['Ugni blanc'],
  'Macabeo': ['Viura'],
  'Vermentino': ['Rolle'],
  'Carignan': ['Cariñena', 'Mazuelo'],
  'Primitivo': ['Zinfandel'],
  'Cabernet-Sauvignon': ['Cabernet']   // « Cabernet » seul = Cabernet-Sauvignon, jamais Cabernet franc
};

// Clé de comparaison d'un cépage : sans majuscules, accents ni traits d'union
function cleCepageMenageV2(nom) { return normaliserRechercheV2(nom).replace(/[-\s]+/g, ' ').trim(); }

// Nom commun d'un cépage (lui-même s'il n'a pas de synonyme)
function cepageCommunMenageV2(nom) {
  var cle = cleCepageMenageV2(nom);
  var commun = nom;
  Object.keys(SYNONYMES_CEPAGES_MENAGE_V2).some(function(c) {
    if (cleCepageMenageV2(c) === cle || SYNONYMES_CEPAGES_MENAGE_V2[c].some(function(s) { return cleCepageMenageV2(s) === cle; })) { commun = c; return true; }
    return false;
  });
  return commun;
}

// « Grenache (Cannonau) » : le nom commun, puis celui de la fiche s'il diffère
function libelleCepageMenageV2(b) {
  if (!b.cepNom) return '';
  return majusculeMenageV2(b.cepCommun) + (cleCepageMenageV2(b.cepCommun) !== cleCepageMenageV2(b.cepNom) ? ' (' + b.cepNom + ')' : '');
}
function majusculeMenageV2(t) { t = (t || '').toString(); return t.charAt(0).toUpperCase() + t.slice(1); }

function placeMenageV2(p) { return p ? p.meuble + '|' + p.rangee + '|' + p.espace : ''; }
function libellePlaceMenageV2(p) {
  if (!p || !p.meuble) return 'À ranger';
  return p.meuble.toString().substring(0, 1).toUpperCase() + '-' + p.rangee + '-' + p.espace;
}
// 'cellier' | 'pigeonnier' | 'reserve' | 'aranger' | 'autre'
function lieuMenageV2(p) {
  if (!p || !p.meuble) return 'aranger';
  return memeTexteV2(p.meuble, 'Cellier') ? 'cellier' : memeTexteV2(p.meuble, 'Pigeonnier') ? 'pigeonnier' : memeTexteV2(p.meuble, 'Réserve') ? 'reserve' : 'autre';
}

// Dernier passage à table de chaque vin (Historique, « jj-mm-aaaa ») → { quand, note } par code SAQ / code-barres
function derniersPassagesMenageV2() {
  var der = {};
  (ALL_HISTORIQUE || []).forEach(function(h) {
    var m = (h.date || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return;
    var quand = new Date(+m[3], +m[2] - 1, +m[1]).getTime();
    [h.codeSAQ, h.codebarre].forEach(function(c) {
      c = (c || '').toString().trim().replace(/^0+/, '');
      if (c && (!der[c] || der[c].quand < quand)) der[c] = { quand: quand, note: parseInt(h.bonAccord, 10) || 0 };
    });
  });
  return der;
}

// Zone d'une place (null = hors des zones : Réserve, tablette, Spiritueux…)
function zoneMenageV2(p) {
  if (!p || !p.meuble) return null;
  var meuble = memeTexteV2(p.meuble, 'Cellier') ? 'Cellier' : memeTexteV2(p.meuble, 'Pigeonnier') ? 'Pigeonnier' : null;
  if (!meuble) return null;
  return ZONES_MENAGE_V2[meuble].filter(function(z) {
    return z.rangees.indexOf(String(p.rangee)) !== -1 && (!z.espaces || z.espaces.indexOf(String(p.espace)) !== -1);
  })[0] || null;
}

// Les bouteilles PRÉSENTES de la cave (une bouteille achetée compte même si son « Racheter » est vide),
// avec lieu, couleur, cépage principal (nom commun), appellation, famille, dernier passage à table,
// ce qui la rend douteuse, et si elle est hors de sa zone de couleur.
function bouteillesMenageV2() {
  var der = derniersPassagesMenageV2();
  return (ALL_DATA || []).filter(function(i) {
    var statut = i.Statut || 'En stock';
    return i.bottle && i.bottle > 0 && statut !== 'Bu' && statut !== 'Sorti';
  }).map(function(i) {
    var place = (i.Meuble && i.Rangee && i.Espace) ? { meuble: i.Meuble.toString(), rangee: i.Rangee.toString(), espace: i.Espace.toString() } : null;
    var cepNom = decodeHTML(cepageDominant(i));
    var cepCommun = cepageCommunMenageV2(cepNom);
    var codeSaq = (i['Code SAQ'] || '').toString().trim().replace(/^0+/, '');
    var codeCb = (i['Code-barres'] || '').toString().trim().replace(/^0+/, '');
    var b = {
      w: i, cle: i.row + '|' + i.bottle, vin: cleVinV2(i), lieu: lieuMenageV2(place), place: place, tablette: tabletteMenageV2(place),
      coul: couleurClasseV2(i.Couleur), cep: cleCepageMenageV2(cepCommun), cepNom: cepNom, cepCommun: cepCommun,
      app: normaliserRechercheV2(decodeHTML(i.Appellation || '')), appNom: decodeHTML(i.Appellation || ''),
      fam: (i.Famille || '').toString().replace(/^'/, '').replace(/^0+/, ''),
      passe: der[codeSaq] || der[codeCb] || null, arrivee: Date.parse(i['Date d\'ajout'] || '') || 0, doute: '', horsZone: ''
    };
    // Douteux : jamais déplacé, listé « À vérifier »
    var texte = normaliserRechercheV2([i.Nom, i.Appellation, i.Cepage].join(' '));
    if (!/rouge|blanc|ros|bulle|mousseux|spiritueux/i.test(i.Couleur || '')) b.doute = 'Couleur manquante';
    else if (b.coul === 'vin-blanc' && /glera|prosecco|champagne|cremant|cava|mousseux|petillant|franciacorta/.test(texte)) b.doute = 'Des bulles notées « Blanc » ?';
    else if (/^autre/.test(b.cep)) b.doute = 'Cépage non nommé : inscris le vrai dans la fiche';
    else if (!b.cep && b.coul !== 'vin-spiritueux') b.doute = 'Cépage manquant : inscris-le dans la fiche';
    // Hors de sa zone : un rouge chez les blancs, ou l'inverse (les autres couleurs ne sont pas touchées)
    var z = zoneMenageV2(place);
    if (z && z.couleur !== b.coul && (b.coul === 'vin-blanc' || b.coul === 'vin-rouge')) {
      b.horsZone = (b.coul === 'vin-rouge' ? 'rouge' : 'blanc') + ' rangé chez les ' + z.nom;
    }
    return b;
  });
}

// « Le plus ancien d'abord » : la dernière fois bu quand l'Historique le sait (il est venu après le début de la
// consommation : « jamais bu » n'est pas fiable), sinon la date d'arrivée de la bouteille ; plus petit = « son tour »
function rangRotationMenageV2(b) { return b.passe ? b.passe.quand : (b.arrivee || 0); }

// Places d'un meuble (rangées données, ou toutes), dans l'ordre physique
function placesMenageV2(meuble, rangees) {
  var def = (CONFIG && CONFIG.meubles && CONFIG.meubles[meuble]) || {};
  var out = [];
  (rangees || Object.keys(def).sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); })).forEach(function(r) {
    (def[r] || []).slice().sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); }).forEach(function(e) {
      out.push({ meuble: meuble, rangee: String(r), espace: String(e) });
    });
  });
  return out;
}

// Les doublons du cellier au départ (même cépage principal de même couleur, ou même vin) : l'utilisateur en cède
// « taille − 1 ». La tablette et les vins douteux n'en font pas partie. (Au Pigeonnier et à la Réserve, la règle décide.)
function groupesDoublonsMenageV2(toutes) {
  var out = [];
  ['Cellier'].forEach(function(meuble) {
    var groupes = {};
    toutes.forEach(function(b) {
      if (b.lieu !== meuble.toLowerCase() || b.tablette || b.doute) return;
      var k = b.coul + '|' + (b.cep || 'vin:' + b.vin);
      (groupes[k] = groupes[k] || []).push(b);
    });
    Object.keys(groupes).filter(function(k) { return groupes[k].length > 1; }).forEach(function(k) {
      var g = groupes[k];
      out.push({ meuble: meuble, cle: meuble + '|' + k, titre: majusculeMenageV2(g[0].cepCommun) || nomMenageV2(g[0]), bouteilles: g, aCeder: g.length - 1, coul: g[0].coul });
    });
  });
  return out.sort(function(a, b) { return (b.bouteilles.length - a.bouteilles.length) || a.titre.localeCompare(b.titre); });
}

// Le plan : où finit chaque bouteille, d'après les choix de l'utilisateur
function calculerMenageV2() {
  var toutes = bouteillesMenageV2();
  var groupes = groupesDoublonsMenageV2(toutes);
  var r = simulerMenageV2(toutes, groupes);
  r.groupes = groupes;
  r.aVerifier = toutes.filter(function(b) { return b.doute; });
  return r;
}

function simulerMenageV2(toutes, groupes) {
  var M = MENAGE_V2;
  var TRANSIT = 'transit';
  var ou = {}, sort = {}, entre = {}, cede = {}, decide = {};
  toutes.forEach(function(b) { ou[b.cle] = b.place; });
  var lieu = function(p) { return p === TRANSIT ? 'transit' : lieuMenageV2(p); };
  var noms = { cellier: 'au cellier', pigeonnier: 'au Pigeonnier', reserve: 'à la Réserve' };
  // Figée : jamais déplacée (À vérifier, tablette, « pas celle-là », meuble hors tri, spiritueux) ; au cellier et au
  // Pigeonnier, une couleur qu'aucune zone n'accepte (rosé, bulles) garde aussi sa place
  var fige = function(b) {
    if (b.doute || b.tablette || M.refus[b.cle] || b.lieu === 'autre' || b.coul === 'vin-spiritueux') return true;
    return (b.lieu === 'cellier' || b.lieu === 'pigeonnier') && b.coul !== 'vin-blanc' && b.coul !== 'vin-rouge';
  };
  var poser = function(b, p) { ou[b.cle] = p; decide[b.cle] = true; };
  var occ = function() { var s = {}; toutes.forEach(function(b) { var p = ou[b.cle]; if (p && p !== TRANSIT) s[placeMenageV2(p)] = b; }); return s; };
  var placesZone = function(meuble, z) {
    return placesMenageV2(meuble, z.rangees).filter(function(p) { return !z.espaces || z.espaces.indexOf(p.espace) !== -1; });
  };
  // Ce que contiennent des meubles : cépages (avec leur compte) et appellations, par couleur ; la tablette ne compte pas
  var ajouterContenu = function(c, b) {
    if (b.cep) c.cep[b.coul + '|' + b.cep] = (c.cep[b.coul + '|' + b.cep] || 0) + 1;
    if (b.app) c.app[b.coul + '|' + b.app] = true;
  };
  var contenu = function(lieux) {
    var c = { cep: {}, app: {} };
    toutes.forEach(function(b) {
      var p = ou[b.cle];
      if (p && p !== TRANSIT && !tabletteMenageV2(p) && lieux.indexOf(lieu(p)) !== -1) ajouterContenu(c, b);
    });
    return c;
  };
  var palier = function(c, b) { return b.cep && !c.cep[b.coul + '|' + b.cep] ? 1 : b.app && !c.app[b.coul + '|' + b.app] ? 2 : 3; };
  var texteEntre = function(n, b, ici) {
    return n === 1 ? 'nouveau cépage ' + noms[ici] + ' : ' + libelleCepageMenageV2(b)
      : n === 2 ? 'nouvelle appellation ' + noms[ici] + ' : ' + b.appNom : 'une place libre ' + noms[ici];
  };
  var marches = { pigeonnier: 0, reserve: 1, transit: 2, aranger: 3 };
  // Le meilleur candidat pour une place de « ici » : le palier, puis le déjà-là (il garde sa place), puis le cépage
  // le moins présent, puis le plus ancien, puis le moins de marches
  var meilleur = function(cand, c, ici) {
    return cand.map(function(b) { return { b: b, n: palier(c, b) }; }).sort(function(x, y) {
      var lx = lieu(ou[x.b.cle]), ly = lieu(ou[y.b.cle]);
      return (x.n - y.n) || ((lx === ici ? 0 : 1) - (ly === ici ? 0 : 1)) ||
        ((c.cep[x.b.coul + '|' + x.b.cep] || 0) - (c.cep[y.b.coul + '|' + y.b.cep] || 0)) ||
        (rangRotationMenageV2(x.b) - rangRotationMenageV2(y.b)) || ((marches[lx] || 0) - (marches[ly] || 0));
    })[0] || null;
  };

  // 0. La tablette : C-7-1 est la place d'un rouge ; ce qui l'occupe d'autre glisse sur la tablette
  var c71 = toutes.filter(function(b) { return b.place && memeTexteV2(b.place.meuble, 'Cellier') && b.place.rangee === '7' && b.place.espace === '1'; })[0];
  if (c71 && c71.coul !== 'vin-rouge' && !M.refus[c71.cle]) {
    var o71 = occ();
    var t = placesMenageV2('Cellier', ['7']).filter(function(p) { return p.espace !== '1' && !o71[placeMenageV2(p)]; })[0];
    if (t) { poser(c71, t); entre[c71.cle] = 'C-7-1 se libère pour un rouge'; }
  }

  // 1. Cellier : les doublons cédés sortent ; un vin hors de sa couleur la rejoint s'il y a une place, sinon il sort ;
  // puis les places libres se remplissent
  groupes.forEach(function(g) {
    g.bouteilles.filter(function(b) { return M.cedes[b.cle] && !fige(b) && !decide[b.cle]; }).slice(0, g.aCeder).forEach(function(b) {
      ou[b.cle] = TRANSIT;
      cede[b.cle] = true;
      sort[b.cle] = 'doublon de ' + (libelleCepageMenageV2(b) || g.titre);
    });
  });
  toutes.forEach(function(b) {
    if (!b.horsZone || b.lieu !== 'cellier' || fige(b) || decide[b.cle] || cede[b.cle]) return;
    var o = occ();
    var libre = [];
    ZONES_MENAGE_V2.Cellier.forEach(function(z) {
      if (z.couleur === b.coul) libre = libre.concat(placesZone('Cellier', z).filter(function(p) { return !o[placeMenageV2(p)]; }));
    });
    if (libre.length) { poser(b, libre[0]); entre[b.cle] = b.horsZone; }
    else { ou[b.cle] = TRANSIT; sort[b.cle] = b.horsZone + ' : pas de place chez les ' + (b.coul === 'vin-rouge' ? 'rouges' : 'blancs'); }
  });
  var cCellier = contenu(['cellier']);
  ZONES_MENAGE_V2.Cellier.forEach(function(z) {
    var o = occ();
    placesZone('Cellier', z).filter(function(p) { return !o[placeMenageV2(p)]; }).forEach(function(p) {
      var cand = toutes.filter(function(b) {
        return b.coul === z.couleur && !fige(b) && !decide[b.cle] && !cede[b.cle] && lieu(ou[b.cle]) !== 'cellier';
      });
      var m = meilleur(cand, cCellier, 'cellier');
      if (!m) return;
      poser(m.b, p);
      entre[m.b.cle] = texteEntre(m.n, m.b, 'cellier');
      ajouterContenu(cCellier, m.b);
    });
  });

  // 2-3. Pigeonnier puis Réserve : tout est reclassé, zone par zone ; les déjà-là non retenus descendent
  function reclasser(meuble, ici, zones, dessus) {
    var c = contenu(dessus);
    var cDessus = contenu(dessus);
    toutes.forEach(function(b) { var p = ou[b.cle]; if (fige(b) && p && p !== TRANSIT && lieu(p) === ici && !tabletteMenageV2(p)) ajouterContenu(c, b); });
    zones.forEach(function(z) {
      var o = occ();
      var places = placesZone(meuble, z);
      var libres = places.filter(function(p) { var x = o[placeMenageV2(p)]; return !x || (!fige(x) && !decide[x.cle]); });
      var cand = toutes.filter(function(b) {
        return (!z.couleur || b.coul === z.couleur) && !fige(b) && !decide[b.cle] && [ici, 'reserve', 'aranger', 'transit'].indexOf(lieu(ou[b.cle])) !== -1;
      });
      var retenus = [];
      while (retenus.length < libres.length) {
        var m = meilleur(cand, c, ici);
        if (!m) break;
        cand.splice(cand.indexOf(m.b), 1);
        ajouterContenu(c, m.b);
        retenus.push(m);
      }
      // ceux qui sont déjà à une place de la zone la gardent ; les autres prennent les places libres, dans l'ordre
      var gardees = {};
      retenus.forEach(function(m) {
        var p = ou[m.b.cle];
        if (p && p !== TRANSIT && libres.some(function(l) { return placeMenageV2(l) === placeMenageV2(p); })) { gardees[placeMenageV2(p)] = true; decide[m.b.cle] = true; m.garde = true; }
      });
      var restantes = libres.filter(function(l) { return !gardees[placeMenageV2(l)]; });
      retenus.forEach(function(m) {
        if (m.garde) return;
        var dici = lieu(ou[m.b.cle]) === ici;
        poser(m.b, restantes.shift());
        entre[m.b.cle] = dici && m.b.horsZone ? m.b.horsZone : texteEntre(m.n, m.b, ici);
      });
      cand.forEach(function(b) {
        if (lieu(ou[b.cle]) !== ici) return;
        ou[b.cle] = TRANSIT;
        var cle = b.coul + '|' + b.cep;
        sort[b.cle] = b.horsZone ? b.horsZone + ' : pas de place chez les ' + (b.coul === 'vin-rouge' ? 'rouges' : 'blancs')
          : b.cep && cDessus.cep[cle] ? libelleCepageMenageV2(b) + ' est déjà ' + (contenu(['cellier']).cep[cle] ? noms.cellier : noms.pigeonnier)
          : b.cep && c.cep[cle] ? libelleCepageMenageV2(b) + ' est déjà ' + noms[ici] : 'plus de place ' + noms[ici];
      });
    });
  }
  reclasser('Pigeonnier', 'pigeonnier', ZONES_MENAGE_V2.Pigeonnier, ['cellier']);
  reclasser('Réserve', 'reserve', [{ nom: 'tout', rangees: null, couleur: null }], ['cellier', 'pigeonnier']);

  // 4. Le reste va à « À ranger »
  toutes.forEach(function(b) { if (ou[b.cle] === TRANSIT) ou[b.cle] = null; });

  var moves = toutes.filter(function(b) { return placeMenageV2(ou[b.cle]) !== placeMenageV2(b.place); }).map(function(b) {
    return { b: b, de: b.place, vers: ou[b.cle], sort: sort[b.cle] || '', entre: entre[b.cle] || '', parUtilisateur: !!cede[b.cle] };
  });
  return { moves: moves };
}

function ouvrirMenageEmpV2() {
  MENAGE_V2 = reprendreMenageV2();
  // la rotation a besoin de l'Historique : on le charge au besoin (sans lui, tous les vins comptent comme « jamais bu »)
  if (ALL_HISTORIQUE && ALL_HISTORIQUE.length) { afficherMenageEmpV2(true); return; }
  document.getElementById('empV2-cartes').innerHTML = '<div class="texte-secondaire">Un instant…</div>';
  appelBackend('getHistorique', {}, { spinner: ' ' }).then(function(data) {
    ALL_HISTORIQUE = data || [];
  }).catch(function() {}).then(function() { if (empV2Mode === 'menage') afficherMenageEmpV2(true); });
}

// « bu le 27 mars ★★★★ » quand l'Historique le sait, sinon « arrivée le 20 févr. »
function passeMenageV2(b) {
  var quand = b.passe ? b.passe.quand : b.arrivee;
  if (!quand) return '';
  var d = new Date(quand);
  var mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var txt = (b.passe ? 'bu le ' : 'arrivée le ') + d.getDate() + ' ' + mois[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  return txt + (b.passe && b.passe.note ? ' ' + new Array(b.passe.note + 1).join('★') : '');
}

function nomMenageV2(b) { return decodeHTML(b.w.Nom || '—'); }
function guillemetMenageV2(v) { return (v || '').toString().replace(/'/g, "\\'"); }

// Carte d'une bouteille : la photo (place gardée même sans photo), le texte, à droite la case et la destination.
// Toucher la carte = la fiche du vin.
function carteMenageV2(b, titre, sous, droite, voile) {
  var w = b.w;
  var cb = (w['Code-barres'] || '').toString().trim();
  var photo = '<div class="carte-photo">' + (w['Photo URL'] ? '<img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '') + '</div>';
  return '<div class="carte ' + b.coul + (voile ? ' carte-vide' : '') + '"' + (cb ? ' onclick="ouvrirFicheDepuisListeEmpV2(\'' + guillemetMenageV2(cb) + '\')"' : '') + '>' + photo +
    '<div class="carte-centre"><span class="carte-titre">' + titre + '</span><span class="carte-sous">' + sous + '</span></div>' +
    '<div class="carte-droite carte-droite-empilee">' + droite + '</div></div>';
}

function cocheMenageV2(onclick, actif) {
  return '<span class="coche-panier' + (actif ? ' actif' : '') + '" onclick="event.stopPropagation();' + onclick + '"></span>';
}

function pasCelleLaMenageV2Html(cle) {
  return '<span class="fs-12 color-primary" onclick="event.stopPropagation();pasCelleLaMenageV2(\'' + cle + '\')">pas celle-là</span>';
}

// La tournée : titre et rubriques de chaque arrêt, dans l'ordre où l'utilisateur les fait
var TITRES_ARRETS_MENAGE_V2 = { 1: '1 · Au cellier', 2: '2 · Au Pigeonnier', 3: '3 · En bas, à la Réserve', 4: '4 · À ranger', 5: '5 · À la Réserve, en remontant', 6: '6 · Au Pigeonnier', 7: '7 · Au cellier' };
var RUBRIQUES_ARRETS_MENAGE_V2 = { 1: ['Choisir', 'Sors', 'Déplace'], 2: ['Sors', 'Déplace', 'Place ce qui vient du cellier'], 3: ['Sors', 'Déplace', 'Range'], 4: ['Sors', 'Pose'], 5: ['Range'], 6: ['Place'], 7: ['Place'] };

// Les lignes de la tournée, arrêt par arrêt. Une bouteille qui change de meuble a deux lignes (je la prends,
// je la pose) ; une qui reste dans son meuble, une seule. « Enregistrer » ne compte que la ligne où elle est posée.
// Ce qui va du Pigeonnier au cellier attend devant le cellier ; tout le reste voyage dans la boîte.
function lignesMenageV2(plan) {
  var arrets = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {} };
  var ajouter = function(n, rubrique, l) { (arrets[n][rubrique] = arrets[n][rubrique] || []).push(l); };
  var arretPrise = { cellier: 1, pigeonnier: 2, reserve: 3, aranger: 4 };
  plan.moves.forEach(function(d) {
    var de = lieuMenageV2(d.de), vers = lieuMenageV2(d.vers), cle = d.b.cle;
    if (de === vers) { ajouter(arretPrise[de], 'Déplace', { id: 'd|' + cle, d: d, sorte: 'seule' }); return; }
    var devant = de === 'pigeonnier' && vers === 'cellier';
    ajouter(arretPrise[de], 'Sors', { id: 'p|' + cle, d: d, sorte: 'prise', devant: devant });
    if (vers === 'cellier') ajouter(7, 'Place', { id: 'd|' + cle, d: d, sorte: 'pose', devant: devant });
    else if (vers === 'pigeonnier') ajouter(de === 'cellier' ? 2 : 6, de === 'cellier' ? 'Place ce qui vient du cellier' : 'Place', { id: 'd|' + cle, d: d, sorte: 'pose' });
    else if (vers === 'reserve') ajouter(de === 'aranger' ? 5 : 3, 'Range', { id: 'd|' + cle, d: d, sorte: 'pose' });
    else ajouter(4, 'Pose', { id: 'd|' + cle, d: d, sorte: 'pose' });
  });
  // Dans un même meuble, une bouteille ne va dans une place qu'une fois celle-ci libérée
  [1, 2, 3].forEach(function(n) {
    var reste = arrets[n]['Déplace'] || [], ordre = [];
    while (reste.length) {
      var libre = reste.filter(function(l) { return !reste.some(function(m) { return m !== l && placeMenageV2(m.d.de) === placeMenageV2(l.d.vers); }); });
      if (!libre.length) libre = [reste[0]];
      ordre.push(libre[0]);
      reste = reste.filter(function(l) { return l !== libre[0]; });
    }
    if (ordre.length) arrets[n]['Déplace'] = ordre;
  });
  // La boîte (4 cases par rangée, 3 rangées par boîte) : une bouteille sortie prend la première case libre,
  // qui se libère quand elle est posée
  var cases = [], caseDe = {}, max = 0;
  [1, 2, 3, 4, 5, 6, 7].forEach(function(n) {
    RUBRIQUES_ARRETS_MENAGE_V2[n].forEach(function(r) {
      (arrets[n][r] || []).forEach(function(l) {
        var cle = l.d.b.cle;
        if (l.sorte === 'prise' && !l.devant) {
          var i = 0;
          while (cases[i]) i++;
          cases[i] = true;
          caseDe[cle] = i;
          max = Math.max(max, cases.filter(Boolean).length);
        }
        if (caseDe[cle] == null) return;
        l.boite = 'case ' + (Math.floor(caseDe[cle] / 4) + 1) + '-' + (caseDe[cle] % 4 + 1);
        if (l.sorte === 'pose') cases[caseDe[cle]] = false;
      });
    });
  });
  return { arrets: arrets, max: max };
}

// recalculer = true : le plan est recalculé (ouverture, un choix, un « pas celle-là ») ;
// sinon on redessine le même (une case cochée ne change rien au plan).
function afficherMenageEmpV2(recalculer) {
  var M = MENAGE_V2;
  if (recalculer || !M.plan) M.plan = calculerMenageV2();
  var plan = M.plan;
  var n = plan.moves.length;
  document.getElementById('empV2-compte').innerHTML = 'Tri œnophile : ' + n + ' bouteille' + (n > 1 ? 's' : '') + ' à déplacer';
  var tournee = lignesMenageV2(plan);
  var html = '';
  if (tournee.max) {
    html += '<div class="titre-groupe">' + (tournee.max <= 12 ? 'Une boîte suffit' : 'Prends ' + Math.ceil(tournee.max / 12) + ' boîtes') +
      ' : au plus ' + tournee.max + ' bouteille' + (tournee.max > 1 ? 's' : '') + ' à la fois</div>';
  }
  [1, 2, 3, 4, 5, 6, 7].forEach(function(a) {
    html += '<div class="emp-bloc"><div class="emp-meuble">' + TITRES_ARRETS_MENAGE_V2[a] + '</div>';
    var vide = true;
    RUBRIQUES_ARRETS_MENAGE_V2[a].forEach(function(rubrique) {
      if (rubrique === 'Choisir') {
        if (!plan.groupes.length) return;
        vide = false;
        html += '<div class="titre-rubrique">Choisir</div>';
        plan.groupes.forEach(function(g) { html += choixMenageV2Html(g); });
        return;
      }
      var lignes = tournee.arrets[a][rubrique];
      if (!lignes || !lignes.length) return;
      vide = false;
      html += '<div class="titre-rubrique">' + rubrique + '</div>';
      lignes.forEach(function(l) { html += ligneMenageV2Html(l); });
    });
    if (vide) html += '<div class="texte-secondaire texte-gauche">Rien à faire ici</div>';
    html += '</div>';
  });
  if (plan.aVerifier.length) {
    html += '<div class="emp-bloc"><div class="emp-meuble">À vérifier</div><div class="texte-secondaire texte-gauche">L\'assistant ne les touche pas : corrige leur fiche (✎)</div>';
    plan.aVerifier.forEach(function(b) {
      html += carteMenageV2(b, nomMenageV2(b), b.doute + ' · ' + libellePlaceMenageV2(b.place), '', false);
    });
    html += '</div>';
  }
  var nRefus = Object.keys(M.refus).length;
  if (nRefus) html += '<div class="item-liste" onclick="remettreMenageV2()">Remettre les « pas celle-là » (' + nRefus + ')</div>';
  if (nRefus || Object.keys(M.cedes).length || Object.keys(M.faits).length) html += '<div class="item-liste" onclick="recommencerMenageV2()">Tout recommencer</div>';
  var faits = plan.moves.filter(function(d) { return M.faits['d|' + d.b.cle]; }).length;
  if (n) html += '<div class="roundel mt-20" onclick="enregistrerMenageV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Enregistrer (' + faits + ')</span></div>';
  document.getElementById('empV2-cartes').innerHTML = html;
}

// « Pinot grigio : tu en as 3 au cellier, cèdes-en 2 » — en titre au-dessus du groupe, pas collé au premier vin
function choixMenageV2Html(g) {
  var M = MENAGE_V2;
  var nCedes = g.bouteilles.filter(function(b) { return M.cedes[b.cle]; }).length;
  var html = '<div class="titre-groupe">' + g.titre + ' : tu en as ' + g.bouteilles.length + ' au cellier, cèdes-en ' + g.aCeder +
    (nCedes ? ' (' + nCedes + ' choisi' + (nCedes > 1 ? 's' : '') + ')' : '') + '</div>' +
    '<div class="histo-groupe ' + g.coul + '">';
  g.bouteilles.forEach(function(b) {
    var cede = !!M.cedes[b.cle];
    var autreNom = cleCepageMenageV2(b.cepNom) !== cleCepageMenageV2(b.cepCommun) ? b.cepNom : '';
    html += carteMenageV2(b, libellePlaceMenageV2(b.place) + ' · ' + nomMenageV2(b), [autreNom, passeMenageV2(b)].filter(Boolean).join(' · '),
      cocheMenageV2("cederMenageV2('" + b.cle + "', '" + guillemetMenageV2(g.cle) + "')", cede) + '<span class="fs-12">' + (cede ? 'cédé' : 'céder') + '</span>', false);
  });
  return html + '</div>';
}

// Une ligne de la tournée. Sortie : sa case dans la boîte (ou « devant le cellier ») et où elle va ;
// pose : « case 1-1 → P-4-1 » ; déplacement dans le même meuble : « C-2-4 → C-7-1 ».
function ligneMenageV2Html(l) {
  var M = MENAGE_V2;
  var d = l.d, b = d.b;
  var fait = !!M.faits[l.id];
  var coche = cocheMenageV2("cocherTourneeMenageV2('" + l.id + "')", fait);
  var pas = d.parUtilisateur ? '' : pasCelleLaMenageV2Html(b.cle);
  var dest = { cellier: 'cellier', pigeonnier: 'Pigeonnier', reserve: 'Réserve', aranger: 'À ranger' }[lieuMenageV2(d.vers)];
  if (l.sorte === 'prise') {
    var ou = l.devant ? '<span class="fs-12">→ devant le cellier</span>' : '<span class="fs-12 color-white">' + l.boite + '</span><span class="fs-12">→ ' + dest + '</span>';
    return carteMenageV2(b, libellePlaceMenageV2(d.de) + ' · ' + nomMenageV2(b), d.sort || d.entre, coche + ou + pas, fait);
  }
  if (l.sorte === 'pose') {
    var raison = d.entre || d.sort;
    return carteMenageV2(b, (l.devant ? 'devant le cellier' : l.boite) + ' → ' + libellePlaceMenageV2(d.vers) + ' · ' + nomMenageV2(b),
      'vient de ' + libellePlaceMenageV2(d.de) + (raison ? ' · ' + raison : ''), coche, fait);
  }
  return carteMenageV2(b, libellePlaceMenageV2(d.de) + ' → ' + libellePlaceMenageV2(d.vers) + ' · ' + nomMenageV2(b), d.entre || d.sort, coche + pas, fait);
}

function cederMenageV2(cle, groupe) {
  var M = MENAGE_V2;
  if (M.cedes[cle]) delete M.cedes[cle];
  else {
    var g = (M.plan ? M.plan.groupes : []).filter(function(x) { return x.cle === groupe; })[0];
    if (g && g.bouteilles.filter(function(b) { return M.cedes[b.cle]; }).length >= g.aCeder) { afficherMessage('Cèdes-en ' + g.aCeder + ' au plus'); return; }
    M.cedes[cle] = true;
  }
  garderMenageV2();
  afficherMenageEmpV2(true);
}

function pasCelleLaMenageV2(cle) {
  MENAGE_V2.refus[cle] = true;
  garderMenageV2();
  afficherMenageEmpV2(true);
}

function remettreMenageV2() {
  MENAGE_V2.refus = {};
  garderMenageV2();
  afficherMenageEmpV2(true);
}

function recommencerMenageV2() {
  MENAGE_V2 = { cedes: {}, refus: {}, faits: {} };
  oublierMenageV2();
  remonterScrollV2('empV2Container');
  afficherMenageEmpV2(true);
}

function cocherTourneeMenageV2(id) {
  MENAGE_V2.faits[id] = !MENAGE_V2.faits[id];
  garderMenageV2();
  afficherMenageEmpV2(false);
}

// N'enregistre que les bouteilles POSÉES (ligne « pose » ou ligne seule cochée) ; le reste n'est pas touché
function enregistrerMenageV2() {
  var M = MENAGE_V2;
  var dep = ((M.plan && M.plan.moves) || []).filter(function(d) { return M.faits['d|' + d.b.cle]; });
  if (!dep.length) { afficherMessage('Coche les bouteilles posées'); return; }
  var faits = 0;
  var suite = dep.reduce(function(p, d) {
    return p.then(function() {
      var appel = d.vers
        ? appelBackend('actionBouteille', { row: d.b.w.row, action: 'deplacer', bottle: d.b.w.bottle, meuble: d.vers.meuble, rangee: d.vers.rangee, espace: d.vers.espace }, { spinner: 'Tri' })
        : appelBackend('mettreBotteilleARanger', { row: d.b.w.row, bottle: d.b.w.bottle }, { spinner: 'Tri' });
      return appel.then(function() { faits++; });
    });
  }, Promise.resolve());
  suite.then(function() {
    return appelBackend('getInventoryData', {}, { spinner: 'Tri' });
  }).then(function(data) {
    if (data) ALL_DATA = data;
    MENAGE_V2 = { cedes: {}, refus: {}, faits: {} };
    oublierMenageV2();
    afficherMessage('✓ ' + faits + ' déplacement' + (faits > 1 ? 's' : '') + ' enregistré' + (faits > 1 ? 's' : ''));
    if (empV2Mode === 'menage') { remonterScrollV2('empV2Container'); afficherMenageEmpV2(true); }
  }).catch(function(e) {
    // une partie a pu s'écrire : on reprend l'inventaire pour ne pas mentir (les cases restent gardées)
    appelBackend('getInventoryData', {}, { spinner: '' }).then(function(data) { if (data) ALL_DATA = data; }).catch(function() {});
    retourAccueilV2('Tri : ' + faits + ' sur ' + dep.length + ' enregistré(s) — ' + (e && e.message ? e.message : 'erreur inconnue'));
  });
}

// Ordre d'affichage des meubles (l'inverse de la chaîne de remplissage) ; « À ranger » toujours en dernier.
var ORDRE_MEUBLES_V2 = ['Cellier', 'Pigeonnier', 'Réserve'];
function rangEmplacementV2(label) {
  if (label === 'À ranger') return 999;
  var init = label.charAt(0).toUpperCase();
  for (var i = 0; i < ORDRE_MEUBLES_V2.length; i++) {
    if (ORDRE_MEUBLES_V2[i].charAt(0).toUpperCase() === init) return i;
  }
  return 500;
}
function comparerEmplacementsV2(a, b) {
  var ra = rangEmplacementV2(a), rb = rangEmplacementV2(b);
  if (ra !== rb) return ra - rb;
  var pa = a.split('-'), pb = b.split('-');
  var d = (parseInt(pa[1], 10) || 0) - (parseInt(pb[1], 10) || 0);
  if (d !== 0) return d;
  return (parseInt(pa[2], 10) || 0) - (parseInt(pb[2], 10) || 0);
}

// Regroupe par code-barres : { wine, emplacements:[], count }
function grouperParCbEmpV2(liste) {
  var grouped = {};
  liste.forEach(function(w){
    var cb = (w['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var key = cb || ('SANS_' + w.Nom);
    if (!grouped[key]) grouped[key] = { wine: w, emplacements: [], count: 0 };
    grouped[key].count++;
    grouped[key].emplacements.push(w.Meuble.toString().substring(0,1).toUpperCase() + '-' + w.Rangee + '-' + w.Espace);
  });
  var arr = Object.values(grouped);
  arr.forEach(function(g){ g.emplacements.sort(comparerEmplacementsV2); });
  return arr;
}

// Chaîne à sens unique : un meuble ne se remplit que par les meubles en amont.
// Noms venant de l'onglet Config du Sheet — si un meuble est renommé, corriger ici.
var CHAINE_MEUBLES_V2 = ['Réserve', 'Pigeonnier', 'Cellier'];

function meublesAmontV2(meuble) {
  var pos = -1;
  CHAINE_MEUBLES_V2.forEach(function(m, i){ if (memeTexteV2(m, meuble)) pos = i; });
  if (pos <= 0) return [];
  return CHAINE_MEUBLES_V2.slice(0, pos);
}

function cepageDominant(w) {
  var c = (w.Cepage || '').toString().split(',')[0].trim();
  return c;
}

// Regroupe par Code SAQ (repli code-barres, puis nom) — fusionne un même vin mal codé
function grouperParSaqEmpV2(liste) {
  var grouped = {};
  liste.forEach(function(w){
    var key = cleVinV2(w);
    if (!grouped[key]) grouped[key] = { wine: w, emplacements: [], count: 0 };
    grouped[key].count++;
    if (w.Meuble && w.Rangee && w.Espace) {
      grouped[key].emplacements.push(w.Meuble.toString().substring(0,1).toUpperCase() + '-' + w.Rangee + '-' + w.Espace);
    } else {
      grouped[key].emplacements.push('À ranger');
    }
  });
  var arr = Object.values(grouped);
  arr.forEach(function(g){ g.emplacements.sort(comparerEmplacementsV2); });
  return arr;
}



function afficherListeEmpV2(type) {
  empV2Mode = type;
  var f = filtresEmpV2;
  var tousRanges = bouteillesRangeesEmpV2();
  var div = document.getElementById('empV2-cartes');
  var html = '';
  var titre = '';

  if (type === 'doubles') {
    // Même code-barres en 2+ bouteilles. Si meuble choisi → dans le meuble, sinon tous.
    var portee = f.meuble ? tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); }) : tousRanges;
    var groupes = groupesFiltresEmpV2(grouperParSaqEmpV2(portee)).filter(function(g){ return g.count >= 2; });
    titre = 'Vins en double';
    if (groupes.length === 0) { html = '<div class="texte-secondaire">Aucun vin en double</div>'; }
    else { html = groupes.map(function(g){ return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', ')); }).join(''); }

  } else if (type === 'listemeuble') {
    // Tout le meuble choisi, en sections par cépage dominant
    var dansMeubleL = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var parCepL = {};
    var nomCepL = {};
    groupesFiltresEmpV2(grouperParSaqEmpV2(dansMeubleL)).forEach(function(g){
      var cep = cepageDominant(g.wine) || 'Sans cépage';
      var k = normaliserRechercheV2(cep);
      if (!parCepL[k]) { parCepL[k] = []; nomCepL[k] = cep; }
      parCepL[k].push(g);
    });
    titre = 'Liste du meuble';
    var clesL = Object.keys(parCepL).sort(function(a, b){ return a.localeCompare(b); });
    if (clesL.length === 0) { html = '<div class="texte-secondaire">Aucun vin dans ce meuble</div>'; }
    else {
      html = clesL.map(function(k){
        var vins = parCepL[k].sort(function(a, b){
          return normaliserRechercheV2(decodeHTML(a.wine.Nom || '')).localeCompare(normaliserRechercheV2(decodeHTML(b.wine.Nom || '')));
        });
        return '<div class="emp-meuble">' + nomCepL[k] + '</div>' + vins.map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }

  } else if (type === 'cepdoubles') {
    // Cépage dominant présent sur 2+ vins DIFFÉRENTS du meuble choisi
    var dansMeuble = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var parCb = groupesFiltresEmpV2(grouperParSaqEmpV2(dansMeuble));
    var parCepage = {};
    var nomCepage = {};
    parCb.forEach(function(g){
      var cep = cepageDominant(g.wine);
      if (!cep) return;
      var k = normaliserRechercheV2(cep);
      if (!parCepage[k]) { parCepage[k] = []; nomCepage[k] = cep; }
      parCepage[k].push(g);
    });
    titre = 'Cépages doubles';
    var cles = Object.keys(parCepage).filter(function(c){ return parCepage[c].length >= 2; }).sort(function(a,b){ return a.localeCompare(b); });
    if (cles.length === 0) { html = '<div class="texte-secondaire">Aucun cépage en double</div>'; }
    else {
      html = cles.map(function(cep){
        return '<div class="emp-meuble">' + nomCepage[cep] + '</div>' + parCepage[cep].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }

  } else if (type === 'cepmanquants' && !f.meuble) {
    // Global : cépages de ma liste de vins absents du stock actif (pour prioriser les achats)
    titre = 'Cépages manquants';
    var actifsTous = (ALL_DATA || []).filter(function(i){ var s = i.Statut || 'En stock'; return i.bottle && i.bottle > 0 && s !== 'Bu' && s !== 'Sorti'; });
    var cepStock = {};
    actifsTous.forEach(function(w){ var c = cepageDominant(w); if (c) cepStock[normaliserRechercheV2(c)] = true; });
    var parCepGlobal = {};
    var nomCepGlobal = {};
    groupesFiltresEmpV2(grouperVinsV2(ALL_DATA || [])).forEach(function(g){
      var cep = cepageDominant(g.wine);
      if (!cep) return;
      var k = normaliserRechercheV2(cep);
      if (cepStock[k]) return;
      if (!parCepGlobal[k]) { parCepGlobal[k] = []; nomCepGlobal[k] = cep; }
      parCepGlobal[k].push(g);
    });
    var clesG = Object.keys(parCepGlobal).sort(function(a,b){ return a.localeCompare(b); });
    if (clesG.length === 0) { html = '<div class="texte-secondaire">Aucun cépage manquant</div>'; }
    else {
      html = clesG.map(function(cep){
        return '<div class="emp-meuble">' + nomCepGlobal[cep] + '</div>' + parCepGlobal[cep].map(function(g){
          return empCarteVinV2(g.wine, '0 btl', true);
        }).join('');
      }).join('');
    }

  } else if (type === 'cepmanquants') {
    // Cépage présent dans d'AUTRES meubles, absent du meuble choisi
    var dansMeuble2 = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var amont = meublesAmontV2(f.meuble);
    var horsMeuble = tousRanges.filter(function(i){
      return amont.some(function(m){ return memeTexteV2(m, i.Meuble); });
    }).concat(bouteillesARangerEmpV2());
    var cepDansMeuble = {};
    dansMeuble2.forEach(function(w){ var c = cepageDominant(w); if (c) cepDansMeuble[normaliserRechercheV2(c)] = true; });
    var parCepageHors = {};
    var nomCepageHors = {};
    groupesFiltresEmpV2(grouperParSaqEmpV2(horsMeuble)).forEach(function(g){
      var cep = cepageDominant(g.wine);
      if (!cep || cepDansMeuble[normaliserRechercheV2(cep)]) return;
      var k = normaliserRechercheV2(cep);
      if (!parCepageHors[k]) { parCepageHors[k] = []; nomCepageHors[k] = cep; }
      parCepageHors[k].push(g);
    });
    titre = 'Cépages manquants';
    var cles2 = Object.keys(parCepageHors).sort(function(a,b){ return a.localeCompare(b); });
    if (cles2.length === 0) { html = '<div class="texte-secondaire">Aucun cépage manquant</div>'; }
    else {
      html = cles2.map(function(cep){
        return '<div class="emp-meuble">' + nomCepageHors[cep] + '</div>' + parCepageHors[cep].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }

  } else if (type === 'fammanquante' && !f.meuble) {
    // Global : familles de ma liste de vins absentes du stock actif
    titre = 'Familles manquantes';
    var actifsTousFam = (ALL_DATA || []).filter(function(i){ var s = i.Statut || 'En stock'; return i.bottle && i.bottle > 0 && s !== 'Bu' && s !== 'Sorti'; });
    var famStock = {};
    actifsTousFam.forEach(function(w){ var fa = (w.Famille || '').toString().trim(); if (fa) famStock[fa] = true; });
    var parFamGlobal = {};
    groupesFiltresEmpV2(grouperVinsV2(ALL_DATA || [])).forEach(function(g){
      var fam = (g.wine.Famille || '').toString().trim();
      if (!fam || famStock[fam]) return;
      if (!parFamGlobal[fam]) parFamGlobal[fam] = [];
      parFamGlobal[fam].push(g);
    });
    var clesFamG = Object.keys(parFamGlobal).sort(function(a,b){ return a.localeCompare(b); });
    if (clesFamG.length === 0) { html = '<div class="texte-secondaire">Aucune famille manquante</div>'; }
    else {
      html = clesFamG.map(function(fam){
        return '<div class="emp-meuble">' + fam + '</div>' + parFamGlobal[fam].map(function(g){
          return empCarteVinV2(g.wine, '0 btl', true);
        }).join('');
      }).join('');
    }

  } else if (type === 'fammanquante') {
    // Famille présente dans d'AUTRES meubles, absente du meuble choisi
    var dansMeubleFam = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var amontFam = meublesAmontV2(f.meuble);
    var horsMeubleFam = tousRanges.filter(function(i){
      return amontFam.some(function(m){ return memeTexteV2(m, i.Meuble); });
    }).concat(bouteillesARangerEmpV2());
    var famDansMeuble = {};
    dansMeubleFam.forEach(function(w){ var fa = (w.Famille || '').toString().trim(); if (fa) famDansMeuble[fa] = true; });
    var parFamHors = {};
    groupesFiltresEmpV2(grouperParSaqEmpV2(horsMeubleFam)).forEach(function(g){
      var fam = (g.wine.Famille || '').toString().trim();
      if (!fam || famDansMeuble[fam]) return;
      if (!parFamHors[fam]) parFamHors[fam] = [];
      parFamHors[fam].push(g);
    });
    titre = 'Familles manquantes';
    var clesFam2 = Object.keys(parFamHors).sort(function(a,b){ return a.localeCompare(b); });
    if (clesFam2.length === 0) { html = '<div class="texte-secondaire">Aucune famille manquante</div>'; }
    else {
      html = clesFam2.map(function(fam){
        return '<div class="emp-meuble">' + fam + '</div>' + parFamHors[fam].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }

  } else if (type === 'appmanquante' && !f.meuble) {
    // Global : appellations de ma liste de vins absentes du stock actif
    titre = 'Appellation manquante';
    var actifsTousApp = (ALL_DATA || []).filter(function(i){ var s = i.Statut || 'En stock'; return i.bottle && i.bottle > 0 && s !== 'Bu' && s !== 'Sorti'; });
    var appStock = {};
    actifsTousApp.forEach(function(w){ var a = (w.Appellation || '').toString().trim(); if (a) appStock[normaliserRechercheV2(a)] = true; });
    var parAppGlobal = {};
    var nomAppGlobal = {};
    groupesFiltresEmpV2(grouperVinsV2(ALL_DATA || [])).forEach(function(g){
      var app = (g.wine.Appellation || '').toString().trim();
      if (!app) return;
      var k = normaliserRechercheV2(app);
      if (appStock[k]) return;
      if (!parAppGlobal[k]) { parAppGlobal[k] = []; nomAppGlobal[k] = app; }
      parAppGlobal[k].push(g);
    });
    var clesAG = Object.keys(parAppGlobal).sort(function(a,b){ return a.localeCompare(b); });
    if (clesAG.length === 0) { html = '<div class="texte-secondaire">Aucune appellation manquante</div>'; }
    else {
      html = clesAG.map(function(app){
        return '<div class="emp-meuble">' + nomAppGlobal[app] + '</div>' + parAppGlobal[app].map(function(g){
          return empCarteVinV2(g.wine, '0 btl', true);
        }).join('');
      }).join('');
    }

  } else if (type === 'appmanquante') {
    // Appellation présente dans d'AUTRES meubles (en amont), absente du meuble choisi
    var dansMeuble3 = tousRanges.filter(function(i){ return String(i.Meuble) === String(f.meuble); });
    var amontApp = meublesAmontV2(f.meuble);
    var horsMeubleApp = tousRanges.filter(function(i){
      return amontApp.some(function(m){ return memeTexteV2(m, i.Meuble); });
    }).concat(bouteillesARangerEmpV2());
    var appDansMeuble = {};
    dansMeuble3.forEach(function(w){ var a = (w.Appellation || '').toString().trim(); if (a) appDansMeuble[normaliserRechercheV2(a)] = true; });
    var parAppHors = {};
    var nomAppHors = {};
    groupesFiltresEmpV2(grouperParSaqEmpV2(horsMeubleApp)).forEach(function(g){
      var app = (g.wine.Appellation || '').toString().trim();
      if (!app || appDansMeuble[normaliserRechercheV2(app)]) return;
      var k = normaliserRechercheV2(app);
      if (!parAppHors[k]) { parAppHors[k] = []; nomAppHors[k] = app; }
      parAppHors[k].push(g);
    });
    titre = 'Appellation manquante';
    var clesA2 = Object.keys(parAppHors).sort(function(a,b){ return a.localeCompare(b); });
    if (clesA2.length === 0) { html = '<div class="texte-secondaire">Aucune appellation manquante</div>'; }
    else {
      html = clesA2.map(function(app){
        return '<div class="emp-meuble">' + nomAppHors[app] + '</div>' + parAppHors[app].map(function(g){
          return empCarteVinV2(g.wine, g.count + ' btl<br>' + g.emplacements.join(', '), true);
        }).join('');
      }).join('');
    }
  }

  document.getElementById('empV2-compte').textContent = f.meuble ? (titre + ' · ' + f.meuble) : titre;
  div.innerHTML = html;
}

function wineResultDepuisMemoireV2(code) {
  var cb = (code || '').toString().trim();
  var items = (ALL_DATA || []).filter(function(i) {
    return memeCodeV2(i['Code-barres'], cb);
  });
  if (!items.length) return null;
  var w = items[0];
  var actives = items.filter(function(i) {
    var statut = i.Statut || 'En stock';
    return i.bottle && i.bottle > 0 && statut !== 'Bu' && statut !== 'Sorti' && statut !== 'Suggestion';
  });
  return {
    exists: true,
    row: w.row,
    count: actives.length,
    wine: {
      nom: w.Nom || '',
      couleur: w.Couleur || '',
      cepage: w.Cepage || '',
      pays: w.Pays || '',
      aime: w.Racheter || 'Oui',
      accords: w.Accords || '',
      region: w.Region || '',
      appellation: w.Appellation || '',
      photoURL: w['Photo URL'] || '',
      codeSAQ: w['Code SAQ'] || ''
    },
    bottles: actives.map(function(i) {
      return { nom: w.Nom || '', row: i.row, bottle: i.bottle, meuble: i.Meuble || '', rangee: i.Rangee || '', espace: i.Espace || '', statut: i.Statut || 'En stock' };
    })
  };
}

// Position dans la liste au moment d'ouvrir une fiche : le Tri œnophile y revient en fermant la fiche
var SCROLL_EMP_V2 = 0;
function ouvrirFicheDepuisListeEmpV2(code) {
  var c = document.querySelector('#empV2Container .modal-v2-content');
  SCROLL_EMP_V2 = c ? c.scrollTop : 0;
  document.getElementById('empV2Container').style.display = 'none';
  ouvrirApresTap(function(){ ouvrirFicheV2(code, 'empliste'); });
}

function deplacerDepuisEmpV2(code) {
  var result = wineResultDepuisMemoireV2(code);
  if (!result) { afficherMessage('Vin introuvable'); return; }
  menuActionV2Context = { code: code, wineResult: result, retour: 'emplacements' };
  naviguerV2(ouvrirDeplacerV2);
}

// ==================== HISTORIQUE V2 ====================
// Filtres : ce qui est propre à la page (Vin, Appréciation), puis le vin, puis le goût — comme la Cave
var libellesFiltreHistoV2 = { vin: 'Vin', note: 'Appréciation', couleur: 'Couleur', cepage: 'Cépage', pays: 'Pays', appellation: 'Appellation', accord: 'Accord', pastille: 'Pastille de goût', acidite: 'Acidité' };
function filtresHistoVidesV2() {
  return { mets: '', vin: '', note: '', couleur: '', cepage: '', pays: '', appellation: '', accord: '', pastille: '', acidite: '', cave: false };
}
var filtresHistoV2 = filtresHistoVidesV2();
var histoEditV2 = { row: 0, note: 0 };

function ouvrirHistoV2() {
  document.getElementById('histoV2Container').style.display = 'flex';
  remonterScrollV2('histoV2Container');
  filtresHistoV2 = filtresHistoVidesV2();
  if (ALL_HISTORIQUE && ALL_HISTORIQUE.length) {
    remplirFiltresHistoV2();
    afficherHistoV2();
    return;
  }
  appelBackend('getHistorique', {}, { spinner: ' ' }).then(function(data) {
    ALL_HISTORIQUE = data || [];
    remplirFiltresHistoV2();
    afficherHistoV2();
  }).catch(function() { retourAccueilV2(); });
}

function fermerHistoV2() {
  fermerFiltresHistoV2();
  document.getElementById('histoV2Container').style.display = 'none';
}

function ouvrirFiltresHistoV2() { clicLoupeV2('histoV2', reinitialiserFiltresHistoV2); }
function fermerFiltresHistoV2() {
  document.getElementById('histoV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('histoV2-filtres').classList.remove('ouvert');
}

// Le vin d'une entrée de l'historique (fiche en mémoire, par code-barres puis code SAQ) — {} s'il n'y est plus
function indexVinsHistoV2() {
  var parCb = {}, parSaq = {};
  (ALL_DATA || []).forEach(function(d) {
    var cb = (d['Code-barres'] || '').toString().trim();
    var saq = (d['Code SAQ'] || '').toString().trim();
    if (cb && !parCb[cb]) parCb[cb] = d;
    if (saq && !parSaq[saq]) parSaq[saq] = d;
  });
  return function(h) { return parCb[(h.codebarre || '').toString().trim()] || parSaq[(h.codeSAQ || '').toString().trim()] || {}; };
}

// Les valeurs d'une entrée pour un filtre (une liste : un vin peut avoir plusieurs accords) ; appréciation « 0 » = aucune
function valeursFiltreHistoV2(cle, h, w) {
  switch (cle) {
    case 'vin': return [h.nom || ''];
    case 'note': return [String(parseInt(h.bonAccord, 10) || 0)];
    case 'couleur': return [w.Couleur || h.couleur || ''];
    case 'cepage': return [cepageDominant(w)];
    case 'pays': return [w.Pays || ''];
    case 'appellation': return [w.Appellation || ''];
    case 'accord': return (w.Accords || '').split(',').map(function(a) { return a.trim(); });
    case 'pastille': return [w['Pastille gout'] || ''];
    case 'acidite': return [w['Acidité'] || ''];
  }
  return [];
}
// Cépage = cépage principal, comme la Cave
function passeFiltreHistoV2(cle, h, w, choix) {
  if (cle === 'cepage') return passeFiltreV2(choix, cepageDominant(w), memeTexteV2);
  if (cle === 'pastille') return passeFiltreV2(choix, w['Pastille gout'], contientTexteV2);
  return passeFiltreV2(choix, valeursFiltreHistoV2(cle, h, w), listeContientV2);
}
function libelleNoteHistoV2(n) { n = parseInt(n, 10) || 0; return n ? n + ' verre' + (n > 1 ? 's' : '') : 'Sans appréciation'; }
function filtresHistoActifsV2() {
  var f = filtresHistoV2;
  return !!(f.mets || f.cave || Object.keys(libellesFiltreHistoV2).some(function(k) { return f[k]; }));
}

// En cascade, comme la Cave : un menu ne propose que ce qui reste après les choix faits au-dessus de lui ;
// les valeurs viennent des vins de l'historique
function remplirFiltresHistoV2() {
  var f = filtresHistoV2;
  var vinDe = indexVinsHistoV2();
  var base = ALL_HISTORIQUE || [];
  Object.keys(libellesFiltreHistoV2).forEach(function(cle) {
    var vus = {};
    base.forEach(function(h) {
      valeursFiltreHistoV2(cle, h, vinDe(h)).forEach(function(v) { var k = normaliserRechercheV2(v); if (v && !vus[k]) vus[k] = v; });
    });
    var opts = Object.keys(vus).map(function(k) { return vus[k]; });
    opts.sort(cle === 'note' ? function(a, b) { return b - a; } : function(a, b) { return a.localeCompare(b); });
    var libelle = function(v) { return cle === 'note' ? libelleNoteHistoV2(v) : v; };
    var cur = f[cle];
    var menu = document.getElementById('histoV2-f-' + cle + '-menu');
    menu.innerHTML = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="choisirFiltreHistoV2(\'' + cle + '\', \'\')">Tous</div>' + opts.map(function(v){
      return '<div class="item-liste' + classeChoixV2(v, cur) + '" onclick="choisirFiltreHistoV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + libelle(v) + '</div>';
    }).join('');
    var disp = document.getElementById('histoV2-f-' + cle + '-display');
    if (disp) disp.textContent = libelleChoixV2(cur, libellesFiltreHistoV2[cle], libelle);
    base = base.filter(function(h) { return passeFiltreHistoV2(cle, h, vinDe(h), cur); });
  });

  var champMets = document.getElementById('histoV2-f-mets');
  if (champMets) champMets.value = f.mets;

  var loupe = document.getElementById('histoV2-loupe');
  if (loupe) loupe.classList.toggle('actif', filtresHistoActifsV2());
  var caveBtn = document.getElementById('histoV2-cave');
  if (caveBtn) { caveBtn.classList.toggle('actif', f.cave); caveBtn.textContent = f.cave ? '✓' : '✗'; }
}

function filtrerMetsHistoV2() {
  var champ = document.getElementById('histoV2-f-mets');
  filtresHistoV2.mets = champ ? champ.value.trim() : '';
  var loupe = document.getElementById('histoV2-loupe');
  if (loupe) loupe.classList.toggle('actif', filtresHistoActifsV2());
  afficherHistoV2();
}

function basculerFiltreHistoV2(cle) {
  var menu = document.getElementById('histoV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  Object.keys(libellesFiltreHistoV2).forEach(function(k){
    document.getElementById('histoV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreHistoV2(cle, valeur) {
  filtresHistoV2[cle] = cycleFiltreV2(filtresHistoV2[cle], valeur);
  document.getElementById('histoV2-f-' + cle + '-menu').classList.remove('ouvert');
  remplirFiltresHistoV2();
  afficherHistoV2();
}

function reinitialiserFiltresHistoV2() {
  filtresHistoV2 = filtresHistoVidesV2();
  var champMets = document.getElementById('histoV2-f-mets');
  if (champMets) champMets.value = '';
  Object.keys(libellesFiltreHistoV2).forEach(function(k) {
    document.getElementById('histoV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  remplirFiltresHistoV2();
  afficherHistoV2();
  fermerFiltresHistoV2();
}

function toggleCaveHistoV2() {
  filtresHistoV2.cave = !filtresHistoV2.cave;
  remplirFiltresHistoV2();
  afficherHistoV2();
}

function afficherHistoV2() {
  var f = filtresHistoV2;
  var vinDe = indexVinsHistoV2();
  var cles = Object.keys(libellesFiltreHistoV2);

  var base = (ALL_HISTORIQUE || []).filter(function(h){
    if (f.mets && normaliserRechercheV2(h.plat || '').indexOf(normaliserRechercheV2(f.mets)) === -1) return false;
    var w = vinDe(h);
    if (!cles.every(function(k) { return passeFiltreHistoV2(k, h, w, f[k]); })) return false;
    if (f.cave && !vinEnCaveV2(h.codebarre)) return false;
    return true;
  });

  // Photo par code-barres (vient de ALL_DATA)
  var cbPhoto = {};
  (ALL_DATA || []).forEach(function(d){
    var cb = (d['Code-barres'] || '').toString().trim();
    if (cb && d['Photo URL']) cbPhoto[cb] = d['Photo URL'];
  });

  // Regrouper par vin (Code SAQ sinon code-barres) — même clé que partout
  var grouped = {};
  base.forEach(function(h){
    var cb = (h.codebarre || '').toString().trim();
    var key = cleVinV2({ 'Code SAQ': h.codeSAQ, 'Code-barres': h.codebarre });
    if (!grouped[key]) grouped[key] = { cb: cb, nom: h.nom, couleur: h.couleur, photo: cbPhoto[cb] || '', mets: [] };
    grouped[key].mets.push(h);
  });
  var groupes = Object.values(grouped);

  var div = document.getElementById('histoV2-cartes');
  document.getElementById('histoV2-compte').textContent = groupes.length + ' vin' + (groupes.length > 1 ? 's' : '');
  if (groupes.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucune entrée</div>'; return; }

  var cbInfos = {};
  (ALL_DATA || []).forEach(function(d){
    var cb = (d['Code-barres'] || '').toString().trim();
    if (cb) cbInfos[cb] = d;
  });

  div.innerHTML = groupes.map(function(g){
    var nom = decodeHTML(g.nom || '—');
    var info = cbInfos[g.cb] || {};
    var sous = sousVinV2(info);
    var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + g.cb + '\', \'histo\')})"' : '';
    var photo = g.photo ? '<div class="carte-photo"><img src="' + g.photo + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var carteVin = '<div class="carte histo-vin ' + couleurClasseV2(g.couleur) + '"' + onclick + '>' + photo +
      '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div></div>';

    var mets = g.mets.slice().sort(function(a, b){ return (parseInt(b.bonAccord) || 0) - (parseInt(a.bonAccord) || 0); });
    var cartesMets = mets.map(function(m){
      var note = parseInt(m.bonAccord) || 0;
      var classeNote = (note >= 1 && note <= 5) ? ' bordure-gauche-' + note : '';
      var platEsc = (m.plat || '').replace(/'/g, "\\'");
      return '<div class="carte histo-mets' + classeNote + '" onclick="ouvrirApresTap(function(){ouvrirHistoEditV2(' + m.row + ', \'' + platEsc + '\', ' + note + ', \'' + nom.replace(/'/g, "\\'") + '\', \'histo\', \'' + (m.codeSAQ || '') + '\', \'' + (m.codebarre || '') + '\')})">' +
        '<div class="carte-centre"><span class="carte-titre">' + (m.plat || '—') + '</span></div>' +
        '<div class="carte-droite">' + (m.date || '') + '</div></div>';
    }).join('');

    return '<div class="histo-groupe ' + couleurClasseV2(g.couleur) + '">' + carteVin + cartesMets + '</div>';
  }).join('');
}

// Date du jour « aaaa-mm-jj » (heure locale) — la valeur d'un champ date
function dateIsoV2(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
// « jj-mm-aaaa » de l'Historique → « aaaa-mm-jj »
function dateHistoIsoV2(jma) {
  var m = (jma || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
}

function ouvrirHistoEditV2(row, plat, note, nom, provenance, codeSAQ, codebarre) {
  var entree = (ALL_HISTORIQUE || []).filter(function(h) { return h.row === row; })[0];
  histoEditV2 = { row: row, note: note || 0, provenance: provenance || 'histo', date: dateHistoIsoV2(entree && entree.date) };
  var champDate = document.getElementById('histoEditV2-date');
  champDate.value = histoEditV2.date;
  champDate.max = dateIsoV2();
  document.getElementById('histoEditV2-vin').textContent = nom || '';
  var w = null;
  if ((provenance || 'histo') === 'fiche') {
    w = CURRENT_WINE_DATA;
  } else {
    var saq = (codeSAQ || '').toString().trim();
    var cb = (codebarre || '').toString().trim();
    w = (ALL_DATA || []).find(function(i) {
      if (saq) return (i['Code SAQ'] || '').toString().trim() === saq;
      if (cb) return memeCodeV2(i['Code-barres'], cb);
      return false;
    }) || null;
  }  
  var origineEl = document.getElementById('histoEditV2-origine');
  if (origineEl) origineEl.textContent = w ? [w.Pays, w.Region, w.Appellation].filter(Boolean).map(decodeHTML).join(' • ') : '';
  document.getElementById('histoEditV2-plat').value = plat || '';
  var v = document.getElementById('histoEditV2-verres');
  v.innerHTML = '';
  for (var i = 1; i <= 5; i++) {
    v.innerHTML += '<span class="boire-verre' + (i <= (note || 0) ? ' allume' : '') + '" data-note="' + i + '" onclick="choisirNoteHistoEditV2(' + i + ')">🍷</span>';
  }
  document.getElementById('histoEditV2Overlay').style.display = 'flex';
}

function choisirNoteHistoEditV2(note) {
  histoEditV2.note = note;
  Array.prototype.forEach.call(document.querySelectorAll('#histoEditV2-verres .boire-verre'), function(el){
    el.classList.toggle('allume', parseInt(el.getAttribute('data-note')) <= note);
  });
}

function sauverHistoEditV2() {
  var plat = document.getElementById('histoEditV2-plat').value.trim();
  var date = document.getElementById('histoEditV2-date').value;
  if (date && date > dateIsoV2()) { afficherMessage('Cette date est dans le futur'); return; }
  var nouvelleDate = date && date !== histoEditV2.date ? date : '';
  appelBackend('corrigerHistorique', { row: histoEditV2.row, plat: plat, note: histoEditV2.note || '', date: nouvelleDate }, { spinner: 'Sauvegarde' }).then(function(res){
    if (!res || !res.success) { afficherMessage('Erreur'); return; }
    // un serveur pas encore redéployé ignore la date sans le dire
    var dateIgnoree = nouvelleDate && !res.avecDate;
    return appelBackend('getHistorique', {}, { spinner: 'Sauvegarde' }).then(function(data){
      ALL_HISTORIQUE = data || [];
      document.getElementById('histoEditV2Overlay').style.display = 'none';
      if (histoEditV2.provenance === 'fiche') {
        chargerPlatsV2(CURRENT_WINE_CODEBARRE);
      } else {
        remplirFiltresHistoV2();
        afficherHistoV2();
      }
      afficherMessage(dateIgnoree ? 'Corrigé, sauf la date : Code.gs à recoller' : 'Corrigé');
    });
  }).catch(function(){ retourAccueilV2(); });
}

function supprimerHistoEditV2() {
  appelBackend('supprimerHistorique', { row: histoEditV2.row }, { spinner: 'Suppression' }).then(function(res){
    if (!res || !res.success) { afficherMessage('Erreur'); return; }
    return appelBackend('getHistorique', {}, { spinner: 'Suppression' }).then(function(data){
      ALL_HISTORIQUE = data || [];
      document.getElementById('histoEditV2Overlay').style.display = 'none';
      if (histoEditV2.provenance === 'fiche') {
        chargerPlatsV2(CURRENT_WINE_CODEBARRE);
      } else {
        remplirFiltresHistoV2();
        afficherHistoV2();
      }
      afficherMessage('Supprimé');
    });
  }).catch(function(){ retourAccueilV2(); });
}

function fermerHistoEditV2() {
  document.getElementById('histoEditV2Overlay').style.display = 'none';
}

// ===== Ajout manuel d'un accord au carnet (Historique) =====
var histoAjoutV2 = { codebarre: '', codeSAQ: '', nom: '', note: 0, provenance: 'histo' };

function ouvrirHistoAjoutDepuisFicheV2() {
  var cb = CURRENT_WINE_CODEBARRE;
  var w = (ALL_DATA || []).filter(function(d) { return memeCodeV2(d['Code-barres'], cb); })[0];
  if (!w) { afficherMessage('Vin introuvable'); return; }
  document.getElementById('histoAjoutV2-plat').value = '';
  choisirVinHistoAjoutV2(cb, (w['Code SAQ'] || '').toString().trim(), decodeHTML(w.Nom || ''));
  histoAjoutV2.provenance = 'fiche';
  document.getElementById('histoAjoutV2Overlay').style.display = 'flex';
}

function ouvrirHistoAjoutV2() {
  fermerFiltresHistoV2();
  histoAjoutV2 = { codebarre: '', codeSAQ: '', nom: '', note: 0, provenance: 'histo' };
  document.getElementById('histoAjoutV2-vin').textContent = 'Ajouter à l\'historique';
  document.getElementById('histoAjoutV2-action').textContent = 'Choisir un vin';
  document.getElementById('histoAjoutV2-recherche').value = '';
  document.getElementById('histoAjoutV2-recherche').style.display = 'block';
  document.getElementById('histoAjoutV2-resultats').innerHTML = '';
  document.getElementById('histoAjoutV2-resultats').classList.remove('ouvert');
  document.getElementById('histoAjoutV2-form').style.display = 'none';
  document.getElementById('histoAjoutV2-plat').value = '';
  document.getElementById('histoAjoutV2Overlay').style.display = 'flex';
}

function fermerHistoAjoutV2() {
  document.getElementById('histoAjoutV2Overlay').style.display = 'none';
}

function rechercherVinHistoAjoutV2() {
  var q = document.getElementById('histoAjoutV2-recherche').value.toLowerCase().trim();
  var menu = document.getElementById('histoAjoutV2-resultats');
  if (q.length < 2) { menu.innerHTML = ''; menu.classList.remove('ouvert'); return; }
  var vus = {};
  var vins = [];
  (ALL_DATA || []).forEach(function(d){
    var nom = decodeHTML(d.Nom || '');
    var cb = (d['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    if (!nom || !cb) return;
    var cle = cleVinV2(d);
    if (vus[cle]) return;
    if (nom.toLowerCase().indexOf(q) === -1) return;
    vus[cle] = true;
    vins.push({ nom: nom, cb: cb, saq: (d['Code SAQ'] || '').toString().trim() });
  });
  vins.sort(function(a, b){ return a.nom.localeCompare(b.nom); });
  menu.innerHTML = vins.slice(0, 20).map(function(v){
    return '<div class="item-liste" onclick="choisirVinHistoAjoutV2(\'' + v.cb + '\', \'' + v.saq + '\', \'' + v.nom.replace(/'/g, "\\'") + '\')">' + v.nom + '</div>';
  }).join('');
  menu.classList.add('ouvert');
}

function choisirVinHistoAjoutV2(cb, saq, nom) {
  histoAjoutV2.codebarre = cb;
  histoAjoutV2.codeSAQ = saq;
  histoAjoutV2.nom = nom;
  histoAjoutV2.note = 0;
  document.getElementById('histoAjoutV2-vin').textContent = nom;
  document.getElementById('histoAjoutV2-action').textContent = 'Ajouter un plat';
  document.getElementById('histoAjoutV2-recherche').style.display = 'none';
  document.getElementById('histoAjoutV2-resultats').innerHTML = '';
  document.getElementById('histoAjoutV2-resultats').classList.remove('ouvert');
  var champDate = document.getElementById('histoAjoutV2-date');
  champDate.value = dateIsoV2();
  champDate.max = dateIsoV2();

  var v = document.getElementById('histoAjoutV2-verres');
  v.innerHTML = '';
  for (var i = 1; i <= 5; i++) {
    v.innerHTML += '<span class="boire-verre" data-note="' + i + '" onclick="choisirNoteHistoAjoutV2(' + i + ')">🍷</span>';
  }
  var accordsActuels = [];
  var vin = (ALL_DATA || []).filter(function(d){ return (d['Code-barres'] || '').toString().trim().replace(/\s+/g, '') === cb; })[0];
  if (vin && vin.Accords) accordsActuels = vin.Accords.split(',').map(function(a){ return a.trim(); }).filter(Boolean);
  document.getElementById('histoAjoutV2-accords-menu').innerHTML = (CONFIG && CONFIG.accords ? CONFIG.accords : []).map(function(acc){
    var sel = accordsActuels.indexOf(acc) !== -1;
    return '<div class="item-liste' + (sel ? ' actif' : '') + '" onclick="toggleAccordHistoAjoutV2(this)" data-accord="' + acc + '">' + acc + '</div>';
  }).join('');
  majAccordsDisplayHistoAjoutV2();
  document.getElementById('histoAjoutV2-form').style.display = 'block';
}

function choisirNoteHistoAjoutV2(note) {
  histoAjoutV2.note = note;
  Array.prototype.forEach.call(document.querySelectorAll('#histoAjoutV2-verres .boire-verre'), function(el){
    el.classList.toggle('allume', parseInt(el.getAttribute('data-note')) <= note);
  });
}

function basculerMenuAccordsHistoAjoutV2() {
  document.getElementById('histoAjoutV2-accords-menu').classList.toggle('ouvert');
}

function toggleAccordHistoAjoutV2(el) {
  el.classList.toggle('actif');
  majAccordsDisplayHistoAjoutV2();
}

function majAccordsDisplayHistoAjoutV2() {
  var sel = Array.prototype.map.call(document.querySelectorAll('#histoAjoutV2-accords-menu .item-liste.actif'), function(el){ return el.getAttribute('data-accord'); });
  var disp = document.getElementById('histoAjoutV2-accords-display');
  if (disp) disp.textContent = sel.length ? sel.join(', ') : 'Accords';
}

function confirmerHistoAjoutV2() {
  if (!histoAjoutV2.codebarre) { afficherMessage('Choisissez un vin'); return; }
  // plat et appréciation facultatifs : un vin bu il y a longtemps n'a souvent que sa date
  var plat = document.getElementById('histoAjoutV2-plat').value.trim();
  var date = document.getElementById('histoAjoutV2-date').value || dateIsoV2();
  if (date > dateIsoV2()) { afficherMessage('Cette date est dans le futur'); return; }
  var dateIgnoree = false;
  var accords = Array.prototype.map.call(document.querySelectorAll('#histoAjoutV2-accords-menu .item-liste.actif'), function(el){ return el.getAttribute('data-accord'); });
  appelBackend('ajouterHistoriqueManuel', { codebarre: histoAjoutV2.codebarre, plat: plat, note: histoAjoutV2.note || '', date: date }, { spinner: 'Enregistrement' }).then(function(res){
    // un serveur pas encore redéployé écrit la date du jour sans le dire
    dateIgnoree = date !== dateIsoV2() && !(res && res.avecDate);
    if (accords.length) {
      return appelBackend('updateWineField', { codebarre: histoAjoutV2.codebarre, field: 'Accords', value: accords.join(', ') }, { spinner: 'Enregistrement' });
    }
  }).then(function(){
    return appelBackend('getInventoryData', {}, { spinner: 'Enregistrement' });
  }).then(function(data){
    if (data) ALL_DATA = data;
    return appelBackend('getHistorique', {}, { spinner: 'Enregistrement' });
  }).then(function(data){
    ALL_HISTORIQUE = data || [];
    document.getElementById('histoAjoutV2Overlay').style.display = 'none';
    if (histoAjoutV2.provenance === 'fiche') {
      chargerPlatsV2(CURRENT_WINE_CODEBARRE);
    } else {
      remplirFiltresHistoV2();
      afficherHistoV2();
    }
    afficherMessage(dateIgnoree ? 'Ajouté à la date du jour : Code.gs à recoller' : 'Ajouté au carnet');
  }).catch(function(){ retourAccueilV2(); });
}

// Clé d'un vin : Code SAQ, sinon code-barres, sinon rien (bouteille non regroupée)
function cleVinV2(item) {
  var saq = (item['Code SAQ'] || '').toString().trim();
  if (saq) return 'SAQ_' + saq;
  var cb = (item['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
  if (cb) return 'CB_' + cb;
  return 'SEUL_' + (item.row != null ? item.row : Math.random());
}

function couleurClasseV2(couleur) {
  couleur = (couleur || '').toLowerCase();
  if (couleur.indexOf('rouge') !== -1) return 'vin-rouge';
  if (couleur.indexOf('blanc') !== -1) return 'vin-blanc';
  if (couleur.indexOf('rose') !== -1 || couleur.indexOf('rosé') !== -1) return 'vin-rose';
  if (couleur.indexOf('bulle') !== -1 || couleur.indexOf('mousseux') !== -1) return 'vin-bulles';
  if (couleur.indexOf('spiritueux') !== -1) return 'vin-spiritueux';
  return 'vin-rouge';
}

// Sous-titre standard d'une carte vin : Pays • Région, Cépage, Appellation (lignes vides masquées).
function sousVinV2(w) {
  var pays = w.Pays || '', region = w.Region || '';
  var paysRegion = (pays && region) ? (pays + ' • ' + region) : (pays || region);
  return [paysRegion, w.Cepage || '', w.Appellation || ''].filter(Boolean).join('<br>');
}

function grouperVinsV2(data) {
  var grouped = {};
  data.forEach(function(item) {
    var cb = (item['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var key = cleVinV2(item);
    if (!grouped[key]) grouped[key] = { wine: item, cb: cb, count: 0, emplacements: [] };
    var statut = item.Statut || 'En stock';
    if (statut !== 'Bu' && statut !== 'Sorti' && statut !== 'Suggestion') {
      grouped[key].count++;
      if (item.Meuble && item.Rangee && item.Espace) {
        grouped[key].emplacements.push(item.Meuble.toString().substring(0, 1).toUpperCase() + '-' + item.Rangee + '-' + item.Espace);
      } else {
        grouped[key].emplacements.push('À ranger');
      }
    }
  });
  var arr = Object.values(grouped);
  arr.forEach(function(g){ g.emplacements.sort(comparerEmplacementsV2); });
  var ordre = { rouge: 1, blanc: 2, rose: 3, bulles: 4, spiritueux: 5 };
  return arr.sort(function(a, b) {
    var va = ordre[(a.wine.Couleur || '').toLowerCase()] || 99;
    var vb = ordre[(b.wine.Couleur || '').toLowerCase()] || 99;
    return va !== vb ? va - vb : (a.wine.Nom || '').localeCompare(b.wine.Nom || '');
  });
}

function caseDroiteV2(w, count) {
  return (w && !(w.Racheter || '').toString().trim()) ? 'Proposition' : (count + ' btl');
}

function afficherCartesCaveV2(data) {
  var div = document.getElementById('caveV2-cartes');
  var groups = grouperVinsV2(data);
  if (filtresCaveV2.dispo) groups = groups.filter(function(g){ return g.count > 0; });
  var totalBtl = groups.reduce(function(t, g){ return t + (g.count || 0); }, 0);
  document.getElementById('caveV2-compte').innerHTML = groups.length + ' vin' + (groups.length > 1 ? 's' : '') + '<br>' + totalBtl + ' bouteille' + (totalBtl > 1 ? 's' : '') + ' en stock';
  if (groups.length === 0) { div.innerHTML = '<div class="texte-secondaire">Aucun vin</div>'; return; }
  div.innerHTML = groups.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var pays = w.Pays || '';
    var region = w.Region || '';
    var paysRegion = (pays && region) ? (pays + ' • ' + region) : (pays || region);
    var cepage = w.Cepage || '';
    var cepageHtml = cepage ? (cepage + (w.Favori === 'Oui' ? ' <span class="etoile-favori actif">★</span>' : '')) : '';
    var sous = [paysRegion, cepageHtml, w.Appellation || ''].filter(Boolean).join('<br>');
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){ouvrirFicheV2(\'' + g.cb + '\', \'cave\')})"' : '';
    var vide = g.count === 0 ? ' carte-vide' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + caseDroiteV2(w, g.count) +
           (g.emplacements && g.emplacements.length ? '<br>' + g.emplacements.join('<br>') : '') +
           '</div></div>';
  }).join('');
}

function ouvrirFiltresCaveV2() { clicLoupeV2('caveV2', reinitialiserFiltresCaveV2); }
function fermerFiltresCaveV2() {
  document.getElementById('caveV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('caveV2-filtres').classList.remove('ouvert');
}

var filtresCaveV2 = { couleur: '', cepage: '', pays: '', appellation: '', accords: '', pastille: '', acidite: '', dispo: false };
var libellesFiltreCaveV2 = { couleur: 'Couleur', cepage: 'Cépage', pays: 'Pays', appellation: 'Appellation', accords: 'Accord', pastille: 'Pastille de goût', acidite: 'Acidité' };

function remplirFiltresCaveV2() {
  var f = filtresCaveV2;
  var base = (ALL_DATA || []);

  var forCouleur = base;
  var forCepage = base.filter(function(i){ return passeFiltreV2(f.couleur, i.Couleur); });
  var forPays = forCepage.filter(function(i){ return passeFiltreV2(f.cepage, cepageDominant(i), memeTexteV2); });
  var forAppellation = forPays.filter(function(i){ return passeFiltreV2(f.pays, i.Pays); });
  var forAccords = forAppellation.filter(function(i){ return passeFiltreV2(f.appellation, i.Appellation); });
  var forPastille = forAccords.filter(function(i){ return passeFiltreV2(f.accords, i.Accords || '', contientChaineV2); });
  var forAcidite = forPastille.filter(function(i){ return passeFiltreV2(f.pastille, i['Pastille gout'], contientTexteV2); });

  var sets = { couleur: {}, cepage: {}, pays: {}, appellation: {}, accords: {}, pastille: {}, acidite: {} };
  function retenir(cle, v) { var k = normaliserRechercheV2(v); if (v && !sets[cle][k]) sets[cle][k] = v; }
  forCouleur.forEach(function(i){ retenir('couleur', i.Couleur); });
  forCepage.forEach(function(i){ retenir('cepage', cepageDominant(i)); });
  forPays.forEach(function(i){ retenir('pays', i.Pays); });
  forAppellation.forEach(function(i){ retenir('appellation', i.Appellation); });
  forAccords.forEach(function(i){ (i.Accords || '').split(',').map(function(x){return x.trim();}).filter(Boolean).forEach(function(x){ retenir('accords', x); }); });
  forPastille.forEach(function(i){ retenir('pastille', i['Pastille gout']); });
  forAcidite.forEach(function(i){ retenir('acidite', i['Acidité']); });

  Object.keys(sets).forEach(function(cle) {
    var menu = document.getElementById('caveV2-f-' + cle + '-menu');
    if (!menu) return;
    var opts = Object.keys(sets[cle]).map(function(k){ return sets[cle][k]; }).sort(function(a,b){ return a.localeCompare(b); });
    var cur = filtresCaveV2[cle];
    menu.innerHTML = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="choisirFiltreCaveV2(\'' + cle + '\', \'\')">Tous</div>' + opts.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(v, cur) + '" onclick="choisirFiltreCaveV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
    var disp = document.getElementById('caveV2-f-' + cle + '-display');
    if (disp) disp.textContent = libelleChoixV2(cur, libellesFiltreCaveV2[cle]);
  });
}

function basculerFiltreCaveV2(cle) {
  var menu = document.getElementById('caveV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['couleur','cepage','pays','appellation','accords','pastille','acidite'].forEach(function(k) {
    document.getElementById('caveV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreCaveV2(cle, valeur) {
  filtresCaveV2[cle] = cycleFiltreV2(filtresCaveV2[cle], valeur);
  document.getElementById('caveV2-f-' + cle + '-menu').classList.remove('ouvert');
  appliquerFiltresCaveV2();
}

function toggleDispoCaveV2() {
  filtresCaveV2.dispo = !filtresCaveV2.dispo;
  var btn = document.getElementById('caveV2-dispo');
  if (btn) { btn.classList.toggle('actif', filtresCaveV2.dispo); btn.textContent = filtresCaveV2.dispo ? '✓' : '✗'; }
  appliquerFiltresCaveV2();
}

function appliquerFiltresCaveV2() {
  var c = filtresCaveV2.couleur;
  var cep = filtresCaveV2.cepage;
  var p = filtresCaveV2.pays;
  var app = filtresCaveV2.appellation;
  var a = filtresCaveV2.accords;
  var past = filtresCaveV2.pastille;
  var acid = filtresCaveV2.acidite;
  var dispo = filtresCaveV2.dispo;
  var nom = normaliserRechercheV2(document.getElementById('caveV2-f-nom').value.trim());
  var champsExclusCave = { row: 1, bottle: 1, Statut: 1, Meuble: 1, Rangee: 1, Espace: 1, 'Date d\'ajout': 1, 'Date sortie': 1, Source: 1, 'Photo URL': 1 };

  var filtered = (ALL_DATA || []).filter(function(i) {
    return passeFiltreV2(c, i.Couleur) &&
      passeFiltreV2(cep, cepageDominant(i), memeTexteV2) &&
      passeFiltreV2(p, i.Pays) &&
      passeFiltreV2(app, i.Appellation) &&
      passeFiltreV2(a, i.Accords || '', contientChaineV2) &&
      passeFiltreV2(past, i['Pastille gout'], contientTexteV2) &&
      passeFiltreV2(acid, i['Acidité'], contientTexteV2) &&
      (!nom || Object.keys(i).some(function(k) {
        if (champsExclusCave[k]) return false;
        return normaliserRechercheV2(i[k]).indexOf(nom) !== -1;
      }));
  });
  afficherCartesCaveV2(filtered);
  remplirFiltresCaveV2();
  var loupe = document.getElementById('caveV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(c || cep || p || app || a || past || acid || nom));
}

function reinitialiserFiltresCaveV2() {
  filtresCaveV2 = { couleur: '', cepage: '', pays: '', appellation: '', accords: '', pastille: '', acidite: '', dispo: false };
  var dispoBtn = document.getElementById('caveV2-dispo');
  if (dispoBtn) { dispoBtn.classList.remove('actif'); dispoBtn.textContent = '✗'; }
  document.getElementById('caveV2-f-nom').value = '';
  ['couleur','cepage','pays','appellation','accords','pastille','acidite'].forEach(function(k) {
    document.getElementById('caveV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  appliquerFiltresCaveV2();
  fermerFiltresCaveV2();
}

// ==================== ACCORDS METS-VINS V2 ====================
var ALL_ACCORDS = null;
// UN SEUL aliment de départ (18 sept. 2026) : croiser deux aliments vidait la liste
// (asperge + crabe = aucun cépage). Le deuxième aliment se lit maintenant dans
// « Va aussi avec », sous le cépage proposé.
var chartierV2Aliment = '';
var chartierV2CategorieOuverte = null;
var filtresChartierV2 = { couleur: '', cepage: '', dispo: false };


var CATEGORIES_CHARTIER_V2 = {
  fruits: ['Abricot','Ananas','Argousier','Avocat','Banane','Bleuet','Canneberge','Cassis','Cerise','Citron','Datte','Figue séchée et fraîche','Fraise','Framboise','Fruit de la passion','Kiwi','Lime','Litchi','Mangue','Melon cantaloup',"Melon d'eau",'Mûre','Orange','Pamplemousse','Papaye','Pêche','Pitaya','Poire','Pomme cuite','Pomme jaune','Pomme rouge','Pomme verte','Prune','Rhubarbe','Sureau (baie de)','Yuzu'],
  legumes: ['Ail','Artichaut','Asperge verte','Aubergine','Betterave rouge','Brocoli','Butternut (courge)','Carotte','Céleri','Champignon','Champignon « candy cap »','Chou','Concombre','Courgette','Daïkon','Endive','Épinard','Fenouil','Fève de soya germée','Kale (chou frisé)','Maïs','Oignon','Olive noire','Olive verte','Panais','Patate douce','Petit pois','Poireau','Poivron rouge rôti','Pomme de terre','Radis','Roquette','Tête de violon','Tomate','Topinambour'],
  epices: ['Ajowan','Aneth','Anis étoilé','Basilic','Camomille','Cannelle','Câpre','Cardamome','Carvi','Chipotle','Citronnelle','Clou de girofle','Comptonie voyageuse','Coriandre fraîche','Coriandre (graines de)','Cumin','Curcuma','Curry','Estragon','Genièvre (baie de)','Gingembre','Herbes de Provence','Hibiscus (fleurs séchées)','Houblon','Jasmin','Laurier','Lavande','Livèche','Mélisse','Menthe','Miso','Moutarde','Muscade','Myrique baumier','Nigelle','Origan','Osmanthus (fleur)',"Paprika/Pimenton/Piment d'Espelette",'Persil','Poivre de Guinée (maniguette)','Poivre du Sichuan','Poivre noir','Poivre rose','Quatre-épices','Raifort','Réglisse','Romarin','Rose (eau de)','Safran','Salsepareille (racinette/root beer)','Sapin et sapin baumier','Sauce soya','Sauge','Shiso','Thé des bois','Thé du Labrador','Thym','Tonka (fève)','Umeboshi','Vanille','Verveine','Vinaigre Balsamique','Wasabi'],
  fromages: ['Brunost (gjetost)','Comté','Fromage à croûte fleurie','Fromage à croûte lavée','Fromage à pâte persillée','Fromage à pâte pressée','Fromage de chèvre','Fromage en grains','Mozzarella'],
  viandes: ['Agneau','Bacon','Bœuf','Boudin noir','Canard','Chorizo','Dinde','Foie gras de canard','Jambon','Jambon ibérique/Prosciutto/San Daniele/de Parme/De Bayonne','Porc','Poulet Rôti','Veau','Viande fumée','Viande grillée'],
  poissons: ['Caviar','Crabe','Crevette','Huître','Langoustine/Homard/Écrevisse','Moule','Oursin','Pétoncle','Pieuvre et calmar','Poisson fumé','Poisson grillé','Sardine','Saumon et truite saumonée'],
  cereales: ['Amande','Arachide','Graines de citrouille rôties','Graines de pavot','Noisette','Noix de coco','Noix de Grenoble et noix du Brésil','Noix de pin (pignon)','Pacane','Pistache','Quinoa','Riz à grains longs blanc','Riz basmati et autres riz aromatiques','Riz brun','Riz sauvage','Sésame grillé'],
  autres: ['Café','Cannabis','Caramel','Chocolat blanc','Chocolat noir','Coca-Cola','Fourmi','Guimauve',"Huile d'olive",'Huitlacoche','Kimchi','Miel','Nori (algue)','Œuf',"Pain d'épices",'Parfum Chanel No 5','Parfum Poison de Dior','Pétrichor','Pissenlit (feuilles et fleurs)','Poutine','Sirop de bouleau jaune',"Sirop d'érable",'Truffe']
};
var LIBELLES_CATEGORIES_CHARTIER_V2 = { fruits:'Fruits', legumes:'Légumes', epices:'Épices, aromates et condiments', fromages:'Fromages', viandes:'Viandes et charcuteries', poissons:'Poissons et fruits de mer', cereales:'Céréales, noix et graines', autres:'Autres' };

function ouvrirChartierV2() {
  document.getElementById('chartierV2Container').style.display = 'flex';
  remonterScrollV2('chartierV2Container');
  chartierV2Aliment = '';
  chartierV2CategorieOuverte = null;
  filtresChartierV2 = { couleur: '', cepage: '', dispo: false };
  if (ALL_ACCORDS) {
    construirePanneauChartierV2();
    majSelectionChartierV2();
    calculerResultatsChartierV2();
    return;
  }
  appelBackend('getChartier', {}, { spinner: ' ' }).then(function(data) {
    ALL_ACCORDS = data || [];
    construirePanneauChartierV2();
    majSelectionChartierV2();
    calculerResultatsChartierV2();
  }).catch(function() { retourAccueilV2(); });
}

function fermerChartierV2() {
  fermerFiltresChartierV2();
  document.getElementById('chartierV2Container').style.display = 'none';
}

function ouvrirFiltresChartierV2() { clicLoupeV2('chartierV2', reinitialiserChartierV2); }
function fermerFiltresChartierV2() {
  document.getElementById('chartierV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('chartierV2-filtres').classList.remove('ouvert');
}

function alimentsDisponiblesChartierV2(cle) {
  var vus = {};
  (ALL_ACCORDS || []).forEach(function(a) { if (a.aliment) vus[normaliserRechercheV2(a.aliment)] = true; });
  return (CATEGORIES_CHARTIER_V2[cle] || []).filter(function(a) { return vus[normaliserRechercheV2(a)]; });
}

function construirePanneauChartierV2() {
  var html = '';
  majToggleHautV2('chartierV2-dispo', filtresChartierV2.dispo);
  // Ordre standard (25 oct. 2026) : ce qui est propre à la page (les aliments), puis le vin — Couleur · Cépage
  html += '<div class="titre-3">Filtrer</div>';
  Object.keys(LIBELLES_CATEGORIES_CHARTIER_V2).forEach(function(cle) {
    html += '<div class="champ-cliquable" onclick="basculerCategorieChartierV2(\'' + cle + '\')">' + LIBELLES_CATEGORIES_CHARTIER_V2[cle] + '</div>';
    html += '<div id="chartierV2-cat-' + cle + '" class="menu-liste"></div>';
  });
  html += '<div class="panneau-separateur"></div>';
  html += '<div class="champ-cliquable" id="chartierV2-f-couleur-display" onclick="basculerCouleurChartierV2()">Couleur</div>';
  html += '<div id="chartierV2-f-couleur-menu" class="menu-liste"></div>';
  html += '<div class="champ-cliquable" id="chartierV2-f-cepage-display" onclick="basculerCepageChartierV2()">Cépage</div>';
  html += '<div id="chartierV2-f-cepage-menu" class="menu-liste"></div>';
  document.getElementById('chartierV2-filtres').innerHTML = html;
  remplirCouleurMenuChartierV2();
  remplirCepageMenuChartierV2();
}

function uniqueCepagesChartierV2() {
  var vus = {};
  var out = [];
  (ALL_ACCORDS || []).forEach(function(a) {
    var k = normaliserRechercheV2(a.cepage);
    if (a.cepage && !vus[k]) { vus[k] = true; out.push(a.cepage); }
  });
  out.sort(function(a, b) { return a.localeCompare(b); });
  return out;
}

function remplirCepageMenuChartierV2() {
  var menu = document.getElementById('chartierV2-f-cepage-menu');
  if (!menu) return;
  var liste = uniqueCepagesChartierV2();
  menu.innerHTML = '<div class="item-liste' + (filtresChartierV2.cepage === '' ? ' actif' : '') + '" onclick="choisirCepageChartierV2(\'\')">Tous</div>' + liste.map(function(c) {
    return '<div class="item-liste' + (filtresChartierV2.cepage === c ? ' actif' : '') + '" onclick="choisirCepageChartierV2(\'' + c.replace(/'/g, "\\'") + '\')">' + c + '</div>';
  }).join('');
  var disp = document.getElementById('chartierV2-f-cepage-display');
  if (disp) disp.textContent = filtresChartierV2.cepage || 'Cépage';
}

function basculerCepageChartierV2() {
  document.getElementById('chartierV2-f-cepage-menu').classList.toggle('ouvert');
}

function choisirCepageChartierV2(val) {
  filtresChartierV2.cepage = (filtresChartierV2.cepage === val) ? '' : val;
  document.getElementById('chartierV2-f-cepage-menu').classList.remove('ouvert');
  remplirCepageMenuChartierV2();
  calculerResultatsChartierV2();
}

function toggleDispoChartierV2() {
  filtresChartierV2.dispo = !filtresChartierV2.dispo;
  var btn = document.getElementById('chartierV2-dispo');
  if (btn) { btn.classList.toggle('actif', filtresChartierV2.dispo); btn.textContent = filtresChartierV2.dispo ? '✓' : '✗'; }
  calculerResultatsChartierV2();
}


function basculerCategorieChartierV2(cle) {
  var etaitOuverte = chartierV2CategorieOuverte === cle;
  Object.keys(LIBELLES_CATEGORIES_CHARTIER_V2).forEach(function(k) {
    var d = document.getElementById('chartierV2-cat-' + k);
    d.classList.remove('ouvert');
    d.innerHTML = '';
  });
  if (etaitOuverte) { chartierV2CategorieOuverte = null; return; }
  chartierV2CategorieOuverte = cle;
  var div = document.getElementById('chartierV2-cat-' + cle);
  var aliments = alimentsDisponiblesChartierV2(cle);
  div.innerHTML = aliments.map(function(a) {
    var sel = memeTexteV2(a, chartierV2Aliment);
    return '<div class="item-liste' + (sel ? ' actif' : '') + '" data-aliment="' + a.replace(/"/g, '&quot;') + '" onclick="choisirAlimentChartierV2(this.getAttribute(\'data-aliment\'))">' + a + '</div>';
  }).join('');
  div.classList.add('ouvert');
}

// Un aliment choisi remplace le précédent : depuis le panneau ou depuis « Va aussi avec ».
function choisirAlimentChartierV2(aliment) {
  chartierV2Aliment = memeTexteV2(aliment, chartierV2Aliment) ? '' : aliment;
  filtresChartierV2.cepage = '';
  remplirCepageMenuChartierV2();
  if (chartierV2CategorieOuverte) {
    var ouverte = chartierV2CategorieOuverte;
    chartierV2CategorieOuverte = null;
    basculerCategorieChartierV2(ouverte); // re-marque l'aliment actif
  }
  majSelectionChartierV2();
  calculerResultatsChartierV2();
  fermerFiltresChartierV2();
  remonterScrollV2('chartierV2Container');
}

function majSelectionChartierV2() {
  var div = document.getElementById('chartierV2-selection');
  div.textContent = chartierV2Aliment ? chartierV2Aliment : 'Choisis un aliment dans l\'entonnoir';
}

function remplirCouleurMenuChartierV2() {
  var couleurs = [['vin-rouge','Rouge'],['vin-blanc','Blanc'],['vin-rose','Rosé'],['vin-bulles','Bulles'],['vin-spiritueux','Spiritueux']];
  var menu = document.getElementById('chartierV2-f-couleur-menu');
  menu.innerHTML = '<div class="item-liste' + (filtresChartierV2.couleur === '' ? ' actif' : '') + '" onclick="choisirCouleurChartierV2(\'\')">Tous</div>' + couleurs.map(function(c) {
    return '<div class="item-liste' + (filtresChartierV2.couleur === c[0] ? ' actif' : '') + '" onclick="choisirCouleurChartierV2(\'' + c[0] + '\')">' + c[1] + '</div>';
  }).join('');
  var disp = document.getElementById('chartierV2-f-couleur-display');
  if (disp) {
    var sel = couleurs.filter(function(c) { return c[0] === filtresChartierV2.couleur; })[0];
    disp.textContent = sel ? sel[1] : 'Couleur';
  }
}

function basculerCouleurChartierV2() {
  document.getElementById('chartierV2-f-couleur-menu').classList.toggle('ouvert');
}

function choisirCouleurChartierV2(val) {
  filtresChartierV2.couleur = (filtresChartierV2.couleur === val) ? '' : val;
  document.getElementById('chartierV2-f-couleur-menu').classList.remove('ouvert');
  remplirCouleurMenuChartierV2();
  calculerResultatsChartierV2();
}

function reinitialiserChartierV2() {
  chartierV2Aliment = '';
  filtresChartierV2 = { couleur: '', cepage: '', dispo: false };
  chartierV2CategorieOuverte = null;
  construirePanneauChartierV2();
  majSelectionChartierV2();
  calculerResultatsChartierV2();
  fermerFiltresChartierV2();
}


function couleurCepageChartierV2(cepage) {
  var item = (ALL_DATA || []).filter(function(i) { return contientTexteV2(cepageDominant(i), cepage); })[0];
  return item ? couleurClasseV2(item.Couleur) : null;
}

function vinsDisponiblesPourCepageV2(cepage) {
  return (ALL_DATA || []).filter(function(i) {
    if (!contientTexteV2(cepageDominant(i), cepage)) return false;
    var statut = i.Statut || 'En stock';
    return statut !== 'Bu' && statut !== 'Sorti' && statut !== 'Suggestion';
  }).length > 0;
}

function calculerResultatsChartierV2() {
  var div = document.getElementById('chartierV2-resultats');
  var loupe = document.getElementById('chartierV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(filtresChartierV2.dispo || filtresChartierV2.cepage || filtresChartierV2.couleur || chartierV2Aliment));

  if (filtresChartierV2.cepage) {
    var cep = filtresChartierV2.cepage;
    var aliments = (ALL_ACCORDS || []).filter(function(a) { return memeTexteV2(a.cepage, cep); });
    if (!aliments.length) { div.innerHTML = '<div class="texte-secondaire">Aucun aliment associé</div>'; return; }
    var vins = grouperVinsV2((ALL_DATA || []).filter(function(i) { return contientTexteV2(cepageDominant(i), cep); }));
    if (filtresChartierV2.dispo) vins = vins.filter(function(g) { return g.count > 0; });
    var cartesVins = vins.length ? vins.map(function(g) {
      var w = g.wine;
      var nom = decodeHTML(w.Nom || '—');
      var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){fermerChartierV2();ouvrirFicheV2(\'' + g.cb + '\', \'accords\')})"' : '';
      var vide = g.count === 0 ? ' carte-vide' : '';
      return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '><div class="carte-centre"><span class="carte-titre">' + nom + '</span></div><div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
    }).join('') : '<div class="texte-secondaire">Aucun vin de ce cépage en cave</div>';
    var listeAliments = aliments.map(function(a) {
      return '<div class="ligne-info">' + a.aliment + (a.nuance ? ' <span class="libelle">(' + a.nuance + ')</span>' : '') + '</div>';
    }).join('');
    div.innerHTML = '<div class="emp-meuble">' + cep + '</div>' + listeAliments + '<div class="panneau-separateur"></div>' + cartesVins;
    return;
  }

  var alim = chartierV2Aliment;
  // La consigne est déjà en haut (chartierV2-selection) : ne pas la répéter ici.
  if (!alim) { div.innerHTML = ''; return; }

  var liste = cepagesPourAlimentChartierV2(alim);
  if (filtresChartierV2.couleur) {
    liste = liste.filter(function(s) { return couleurCepageChartierV2(s.cepage) === filtresChartierV2.couleur; });
  }
  if (filtresChartierV2.dispo) {
    liste = liste.filter(function(s) { return vinsDisponiblesPourCepageV2(s.cepage); });
  }
  // Les cépages dont j'ai des bouteilles d'abord : c'est ce qu'on peut boire ce soir.
  liste.sort(function(a, b) {
    var da = vinsDisponiblesPourCepageV2(a.cepage) ? 0 : 1;
    var db = vinsDisponiblesPourCepageV2(b.cepage) ? 0 : 1;
    if (da !== db) return da - db;
    return a.cepage.localeCompare(b.cepage);
  });
  if (!liste.length) { div.innerHTML = '<div class="texte-secondaire">Aucun cépage pour cet aliment</div>'; return; }

  div.innerHTML = liste.map(function(s, i) {
    var entete = s.cepage + (s.nuance ? ' <span class="libelle">(' + s.nuance + ')</span>' : '');
    var vins = grouperVinsV2((ALL_DATA || []).filter(function(it) {
      return contientTexteV2(cepageDominant(it), s.cepage);
    }));
    // « En cave » : plus une seule carte de vin que je n'ai plus.
    if (filtresChartierV2.dispo) vins = vins.filter(function(g) { return g.count > 0; });
    var cartesVins = vins.length ? vins.map(function(g) {
      var w = g.wine;
      var nom = decodeHTML(w.Nom || '—');
      var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){fermerChartierV2();ouvrirFicheV2(\'' + g.cb + '\', \'accords\')})"' : '';
      var vide = g.count === 0 ? ' carte-vide' : '';
      return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '><div class="carte-centre"><span class="carte-titre">' + nom + '</span></div><div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
    }).join('') : '<div class="texte-secondaire">Aucun vin de ce cépage</div>';

    // Le lien cherché : ce que Chartier met d'autre sur ce cépage — de quoi bâtir le plat.
    var autres = autresAlimentsChartierV2(s.cepage, alim);
    var bloc = '';
    if (autres.length) {
      bloc = '<div class="item-liste accordeon-1" onclick="basculerAutresChartierV2(' + i + ')">Va aussi avec…</div>' +
             '<div id="chartierV2-autres-' + i + '" class="menu-liste">' + autres.map(function(a) {
               return '<div class="item-liste accordeon-2" onclick="choisirAlimentChartierV2(this.getAttribute(\'data-aliment\'))" data-aliment="' + a.replace(/"/g, '&quot;') + '">' + a + '</div>';
             }).join('') + '</div>';
    }
    return '<div class="emp-meuble">' + entete + '</div>' + cartesVins + bloc;
  }).join('');
}

// Les cépages que Chartier associe à un aliment, avec la nuance de la ligne.
function cepagesPourAlimentChartierV2(aliment) {
  var vus = {}, out = [];
  (ALL_ACCORDS || []).forEach(function(a) {
    if (!a.cepage || !memeTexteV2(a.aliment, aliment)) return;
    var k = normaliserRechercheV2(a.cepage);
    if (vus[k]) return;
    vus[k] = true;
    out.push({ cepage: a.cepage, nuance: a.nuance || '' });
  });
  return out;
}

// Les autres aliments du même cépage (l'aliment de départ exclu).
function autresAlimentsChartierV2(cepage, sauf) {
  var vus = {}, out = [];
  var cleSauf = normaliserRechercheV2(sauf);
  (ALL_ACCORDS || []).forEach(function(a) {
    if (!a.aliment || !memeTexteV2(a.cepage, cepage)) return;
    var k = normaliserRechercheV2(a.aliment);
    if (vus[k] || k === cleSauf) return;
    vus[k] = true;
    out.push(a.aliment);
  });
  out.sort(function(x, y) { return x.localeCompare(y); });
  return out;
}

// Un seul « Va aussi avec… » ouvert à la fois.
function basculerAutresChartierV2(i) {
  var cible = document.getElementById('chartierV2-autres-' + i);
  if (!cible) return;
  var etait = cible.classList.contains('ouvert');
  Array.prototype.forEach.call(document.querySelectorAll('#chartierV2-resultats .menu-liste'), function(d) { d.classList.remove('ouvert'); });
  if (!etait) cible.classList.add('ouvert');
}





// ==================== SELON SAQ — sens inverse : ingrédient → vins ====================
var selonSaqV2Selection = { ingredients: {}, plats: {} };
var selonSaqV2Ouverte = null;
var selonSaqV2Cave = false;
var selonSaqV2RecettesDe = null; // { champ, valeur } quand on affiche « les recettes » d'une valeur ; null = liste des vins

function ouvrirSelonSaqV2() {
  document.getElementById('selonSaqV2Container').style.display = 'flex';
  remonterScrollV2('selonSaqV2Container');
  selonSaqV2Selection = { ingredients: {}, plats: {} };
  selonSaqV2Ouverte = null;
  selonSaqV2Cave = false;
  selonSaqV2RecettesDe = null;
  if (ALL_RECETTES) { construirePanneauSelonSaqV2(); calculerSelonSaqV2(); return; }
  appelBackend('getRecettes', {}, { spinner: ' ' }).then(function(data) {
    ALL_RECETTES = data || [];
    construirePanneauSelonSaqV2();
    calculerSelonSaqV2();
  }).catch(function() { retourAccueilV2(); });
}

function fermerSelonSaqV2() {
  fermerFiltresSelonSaqV2();
  document.getElementById('selonSaqV2Container').style.display = 'none';
}

function ouvrirFiltresSelonSaqV2() { clicLoupeV2('selonSaqV2', reinitialiserSelonSaqV2); }
function fermerFiltresSelonSaqV2() {
  document.getElementById('selonSaqV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('selonSaqV2-filtres').classList.remove('ouvert');
}

// Seules les recettes des familles présentes en cave
function recettesUtilesSelonSaqV2() {
  var fams = {};
  (ALL_DATA || []).forEach(function(i) {
    var f = normFamilleV2(i.Famille);
    if (f) fams[f] = true;
  });
  return (ALL_RECETTES || []).filter(function(r) {
    return (r.familles || []).some(function(f) { return fams[normFamilleV2(f)]; });
  });
}

function valeursSelonSaqV2(champ) {
  var comptes = {};
  recettesUtilesSelonSaqV2().forEach(function(r) {
    (r[champ] || []).forEach(function(v) { comptes[v] = (comptes[v] || 0) + 1; });
  });
  return Object.keys(comptes).sort(function(a, b) { return a.localeCompare(b); }).map(function(v) {
    return { valeur: v, compte: comptes[v] };
  });
}

function construirePanneauSelonSaqV2() {
  var html = '';
  majToggleHautV2('selonSaqV2-cave', selonSaqV2Cave);
  html += '<div class="titre-3">Filtrer</div>';
  html += '<div class="champ-cliquable" onclick="basculerListeSelonSaqV2(\'ingredients\')">Ingrédients</div>';
  html += '<div id="selonSaqV2-liste-ingredients" class="menu-liste"></div>';
  html += '<div class="champ-cliquable" onclick="basculerListeSelonSaqV2(\'plats\')">Types de plats</div>';
  html += '<div id="selonSaqV2-liste-plats" class="menu-liste"></div>';
  document.getElementById('selonSaqV2-filtres').innerHTML = html;
}

function basculerListeSelonSaqV2(cle) {
  var etaitOuverte = selonSaqV2Ouverte === cle;
  ['ingredients', 'plats'].forEach(function(k) {
    var d = document.getElementById('selonSaqV2-liste-' + k);
    d.classList.remove('ouvert');
    d.innerHTML = '';
  });
  if (etaitOuverte) { selonSaqV2Ouverte = null; return; }
  selonSaqV2Ouverte = cle;
  var champ = (cle === 'ingredients') ? 'ingredients' : 'typesPlats';
  var div = document.getElementById('selonSaqV2-liste-' + cle);
  div.innerHTML = '<div class="item-liste' + (Object.keys(selonSaqV2Selection[cle]).length === 0 ? ' actif' : '') + '" onclick="tousSelonSaqV2(\'' + cle + '\')">Tous</div>' + valeursSelonSaqV2(champ).map(function(v) {
    var sel = selonSaqV2Selection[cle][v.valeur];
    var vEsc = v.valeur.replace(/"/g, '&quot;');
    return '<div class="item-liste' + (sel ? ' actif' : '') + '" data-valeur="' + vEsc + '" onclick="toggleSelonSaqV2(this, \'' + cle + '\')">' + v.valeur + '</div>' +
           (sel ? '<div class="item-liste accordeon-1" data-champ="' + champ + '" data-valeur="' + vEsc + '" onclick="voirRecettesSelonSaqV2(this)">les recettes</div>' : '');
  }).join('');
  div.classList.add('ouvert');
}

function tousSelonSaqV2(cle) {
  selonSaqV2RecettesDe = null;
  selonSaqV2Selection[cle] = {};
  selonSaqV2Ouverte = null;
  basculerListeSelonSaqV2(cle);
  calculerSelonSaqV2();
}

function toggleSelonSaqV2(el, cle) {
  selonSaqV2RecettesDe = null;
  var v = el.getAttribute('data-valeur');
  var champ = (cle === 'ingredients') ? 'ingredients' : 'typesPlats';
  if (selonSaqV2Selection[cle][v]) {
    delete selonSaqV2Selection[cle][v];
    el.classList.remove('actif');
    var suiv = el.nextElementSibling; // retirer la sous-ligne « les recettes » qui suit
    if (suiv && suiv.classList.contains('accordeon-1')) suiv.remove();
  } else {
    selonSaqV2Selection[cle][v] = true;
    el.classList.add('actif');
    var ligne = document.createElement('div'); // ajouter « les recettes » juste sous la valeur, au clic
    ligne.className = 'item-liste accordeon-1';
    ligne.setAttribute('data-champ', champ);
    ligne.setAttribute('data-valeur', v);
    ligne.setAttribute('onclick', 'voirRecettesSelonSaqV2(this)');
    ligne.textContent = 'les recettes';
    el.parentNode.insertBefore(ligne, el.nextSibling);
  }
  calculerSelonSaqV2();
}

function reinitialiserSelonSaqV2() {
  selonSaqV2Selection = { ingredients: {}, plats: {} };
  selonSaqV2Ouverte = null;
  selonSaqV2Cave = false;
  selonSaqV2RecettesDe = null;
  construirePanneauSelonSaqV2();
  calculerSelonSaqV2();
  fermerFiltresSelonSaqV2();
}

function toggleCaveSelonSaqV2() {
  selonSaqV2RecettesDe = null;
  selonSaqV2Cave = !selonSaqV2Cave;
  var btn = document.getElementById('selonSaqV2-cave');
  if (btn) { btn.classList.toggle('actif', selonSaqV2Cave); btn.textContent = selonSaqV2Cave ? '✓' : '✗'; }
  calculerSelonSaqV2();
}

// ingrédient → recettes qui le contiennent → familles → mes vins
// Une recette SAQ en lecture seule : même carte dans « les recettes » et dans la recherche.
function carteRecetteSaqV2(r) {
  var nomR = decodeHTML(r.nom || '—');
  var cls = (r.typesPlats || []).map(function(x) { return decodeHTML(x); }).join(' · ');
  var ing = (r.ingredients || []).map(function(x) { return decodeHTML(x); }).join(', ');
  var sous = [cls, ing].filter(Boolean).join('<br>');
  var sku = (r.sku || '').toString();
  var oc = sku ? ' onclick="window.open(\'https://www.saq.com/fr/' + sku + '\', \'_blank\')"' : '';
  return '<div class="carte fiche-mets"' + oc + '><div class="carte-centre"><span class="carte-titre">' + nomR + '</span><span class="carte-sous">' + sous + '</span></div></div>';
}

function calculerSelonSaqV2() {
  var div = document.getElementById('selonSaqV2-cartes');
  var compte = document.getElementById('selonSaqV2-compte');
  var ingr = Object.keys(selonSaqV2Selection.ingredients);
  var plats = Object.keys(selonSaqV2Selection.plats);
  var loupe = document.getElementById('selonSaqV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(ingr.length || plats.length || selonSaqV2Cave));

  // Volet « les recettes » d'une valeur (agneau, viande blanche…) : liste des recettes de cette valeur,
  // en lecture seule (correction seulement sur la fiche). Le filtre des vins reste actif ; « ← Retour aux vins » revient.
  if (selonSaqV2RecettesDe) {
    var champD = selonSaqV2RecettesDe.champ, valD = selonSaqV2RecettesDe.valeur;
    var recs = recettesUtilesSelonSaqV2().filter(function(r) { return (r[champD] || []).indexOf(valD) !== -1; })
      .sort(function(a, b) { return decodeHTML(a.nom || '').localeCompare(decodeHTML(b.nom || '')); });
    compte.innerHTML = recs.length + ' recette' + (recs.length > 1 ? 's' : '') + ' — ' + decodeHTML(valD);
    var entete = '<div class="item-liste" onclick="retourVinsSelonSaqV2()">← Retour aux vins</div>';
    if (!recs.length) { div.innerHTML = entete + '<div class="texte-secondaire">Aucune recette</div>'; return; }
    div.innerHTML = entete + recs.map(carteRecetteSaqV2).join('');
    return;
  }

  // Montre tout par défaut (tous les vins ayant un accord SAQ). Chaque ingrédient/plat choisi RÉDUIT :
  // on garde les familles présentes pour CHAQUE choix (intersection) → les vins bons pour TOUS les choix.
  var utiles = recettesUtilesSelonSaqV2();
  var familles = null; // familles retenues ; null tant qu'aucun choix
  function contraindreSelonSaqV2(champ, valeur) {
    var s = {};
    utiles.forEach(function(r) {
      if ((r[champ] || []).indexOf(valeur) !== -1) (r.familles || []).forEach(function(f) { s[normFamilleV2(f)] = true; });
    });
    if (familles === null) { familles = s; return; }
    Object.keys(familles).forEach(function(f) { if (!s[f]) delete familles[f]; });
  }
  ingr.forEach(function(v) { contraindreSelonSaqV2('ingredients', v); });
  plats.forEach(function(v) { contraindreSelonSaqV2('typesPlats', v); });
  if (familles === null) { // aucun choix : toutes les familles ayant un accord
    familles = {};
    utiles.forEach(function(r) { (r.familles || []).forEach(function(f) { familles[normFamilleV2(f)] = true; }); });
  }

  var vins = grouperVinsV2((ALL_DATA || []).filter(function(i) {
    var f = normFamilleV2(i.Famille);
    return f && familles[f];
  }));
  if (selonSaqV2Cave) vins = vins.filter(function(g) { return g.count > 0; });

  var choix = ingr.length || plats.length;
  var recettes = utiles.filter(function(r) {
    if (!(r.familles || []).some(function(f) { return familles[normFamilleV2(f)]; })) return false;
    if (!choix) return true;
    return (r.ingredients || []).some(function(v) { return ingr.indexOf(v) !== -1; }) ||
           (r.typesPlats || []).some(function(v) { return plats.indexOf(v) !== -1; });
  });

  compte.innerHTML = vins.length + ' vin' + (vins.length > 1 ? 's' : '') + '<br>' + recettes.length + ' recette' + (recettes.length > 1 ? 's' : '');
  if (!vins.length) { div.innerHTML = '<div class="texte-secondaire">Aucun vin de la cave pour ce choix</div>'; return; }

  div.innerHTML = vins.map(function(g) {
    var w = g.wine;
    var nom = decodeHTML(w.Nom || '—');
    var sous = sousVinV2(w);
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var onclick = g.cb ? ' onclick="ouvrirApresTap(function(){fermerSelonSaqV2();ouvrirFicheV2(\'' + g.cb + '\', \'selonsaq\')})"' : '';
    var vide = g.count === 0 ? ' carte-vide' : '';
    return '<div class="carte ' + couleurClasseV2(w.Couleur) + vide + '"' + onclick + '>' + photo +
           '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div>' +
           '<div class="carte-droite">' + caseDroiteV2(w, g.count) + '</div></div>';
  }).join('');
}

// Ouvre le volet « les recettes » d'une valeur (depuis la ligne sous une valeur sélectionnée)
function voirRecettesSelonSaqV2(el) {
  selonSaqV2RecettesDe = { champ: el.getAttribute('data-champ'), valeur: el.getAttribute('data-valeur') };
  fermerFiltresSelonSaqV2();
  calculerSelonSaqV2();
  remonterScrollV2('selonSaqV2Container');
}

function retourVinsSelonSaqV2() {
  selonSaqV2RecettesDe = null;
  calculerSelonSaqV2();
  remonterScrollV2('selonSaqV2Container');
}

// ==================== SELON CURIEUX BÉGIN V2 ====================
// Page façon « Suggestions » : une section par saison (la plus récente en haut), groupée par vin dedans
// (carte du vin → sa fiche), puis les recettes dessous (→ la recette).
var filtresCurieuxBeginV2 = { saison: '', couleur: '', cepage: '', pays: '', appellation: '', cave: false, mode: 'mesvins' };

function ouvrirCurieuxBeginV2() {
  document.getElementById('curieuxBeginV2Container').style.display = 'flex';
  remonterScrollV2('curieuxBeginV2Container');
  filtresCurieuxBeginV2 = { saison: '', couleur: '', cepage: '', pays: '', appellation: '', cave: false, mode: 'mesvins' };
  var champ = document.getElementById('curieuxBeginV2-f-texte');
  if (champ) champ.value = '';
  if (ALL_CURIEUXBEGIN) { remplirFiltresCurieuxBeginV2(); chargerCurieuxBeginV2(); return; }
  appelBackend('getCurieuxBegin', {}, { spinner: ' ' }).then(function(data) {
    ALL_CURIEUXBEGIN = data || [];
    remplirFiltresCurieuxBeginV2();
    chargerCurieuxBeginV2();
  }).catch(function() { retourAccueilV2(); });
}

function fermerCurieuxBeginV2() {
  fermerFiltresCurieuxBeginV2();
  document.getElementById('curieuxBeginV2Container').style.display = 'none';
}

function ouvrirFiltresCurieuxBeginV2() { clicLoupeV2('curieuxBeginV2', reinitialiserFiltresCurieuxBeginV2); }
function fermerFiltresCurieuxBeginV2() {
  document.getElementById('curieuxBeginV2-filtres-voile').classList.remove('ouvert');
  document.getElementById('curieuxBeginV2-filtres').classList.remove('ouvert');
}

function remplirFiltresCurieuxBeginV2() {
  var f = filtresCurieuxBeginV2;
  // Saisons du mode affiché seulement (sinon un choix donnerait une liste vide), la plus récente en haut
  var infos = saqInfosV2();
  var vuesSaison = {};
  var saisons = [];
  (ALL_CURIEUXBEGIN || []).forEach(function(a) {
    var s = (a.saison || '').toString().trim();
    if (s && !vuesSaison[s] && cbDansModeV2(a, infos)) { vuesSaison[s] = true; saisons.push(s); }
  });
  saisons.sort(function(a, b) { return numeroCbV2(b) - numeroCbV2(a); });
  if (f.saison && !vuesSaison[valeurChoixV2(f.saison)]) f.saison = '';
  var menuSaison = document.getElementById('curieuxBeginV2-f-saison-menu');
  if (menuSaison) {
    menuSaison.innerHTML = saisons.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(v, f.saison) + '" onclick="choisirFiltreCurieuxBeginV2(\'saison\', \'' + v.replace(/'/g, "\\'") + '\')">Saison ' + v + '</div>';
    }).join('');
  }
  var dispSaison = document.getElementById('curieuxBeginV2-f-saison-display');
  if (dispSaison) dispSaison.textContent = libelleChoixV2(f.saison, 'Saison', function(v) { return 'Saison ' + v; });

  // Cépage (principal) · Pays · Appellation : puisés dans le mode affiché ; Appellation suit le Pays
  var attrs = (ALL_CURIEUXBEGIN || []).filter(function(a) { return cbDansModeV2(a, infos); }).map(function(a) { return attributsVinCbV2(a, infos); });
  var listes = {
    cepage: valeursUniquesCbV2(attrs, 'cepage'),
    pays: valeursUniquesCbV2(attrs, 'pays'),
    appellation: valeursUniquesCbV2(attrs.filter(function(x) { return passeFiltreV2(f.pays, x.pays, memeTexteV2); }), 'appellation')
  };
  var libelles = { cepage: 'Cépage', pays: 'Pays', appellation: 'Appellation' };
  ['cepage', 'pays', 'appellation'].forEach(function(cle) {
    var menu = document.getElementById('curieuxBeginV2-f-' + cle + '-menu');
    if (menu) {
      menu.innerHTML = listes[cle].map(function(v) {
        return '<div class="item-liste' + classeChoixV2(v, f[cle]) + '" onclick="choisirFiltreCurieuxBeginV2(\'' + cle + '\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
      }).join('');
    }
    var disp = document.getElementById('curieuxBeginV2-f-' + cle + '-display');
    if (disp) disp.textContent = libelleChoixV2(f[cle], libelles[cle]);
  });

  var couleurs = uniqueValeursAchat(ALL_DATA || [], 'Couleur');
  var menuCoul = document.getElementById('curieuxBeginV2-f-couleur-menu');
  if (menuCoul) {
    menuCoul.innerHTML = couleurs.map(function(v) {
      return '<div class="item-liste' + classeChoixV2(v, f.couleur) + '" onclick="choisirFiltreCurieuxBeginV2(\'couleur\', \'' + v.replace(/'/g, "\\'") + '\')">' + v + '</div>';
    }).join('');
  }
  var dispCoul = document.getElementById('curieuxBeginV2-f-couleur-display');
  if (dispCoul) dispCoul.textContent = libelleChoixV2(f.couleur, 'Couleur');
  var btnCave = document.getElementById('curieuxBeginV2-cave');
  if (btnCave) { btnCave.classList.toggle('actif', f.cave); btnCave.textContent = f.cave ? '✓' : '✗'; }
  var elMes = document.getElementById('curieuxBeginV2-mode-mesvins');
  var elHors = document.getElementById('curieuxBeginV2-mode-horscave');
  if (elMes) elMes.classList.toggle('actif', f.mode !== 'horscave');
  if (elHors) elHors.classList.toggle('actif', f.mode === 'horscave');
}

function choisirModeCurieuxBeginV2(mode) {
  filtresCurieuxBeginV2.mode = mode;
  if (mode === 'horscave') filtresCurieuxBeginV2.cave = false; // « en cave » n'a pas de sens pour les vins à découvrir
  remplirFiltresCurieuxBeginV2();
  chargerCurieuxBeginV2();
}

function basculerFiltreCurieuxBeginV2(cle) {
  var menu = document.getElementById('curieuxBeginV2-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  ['saison', 'couleur', 'cepage', 'pays', 'appellation'].forEach(function(k) {
    document.getElementById('curieuxBeginV2-f-' + k + '-menu').classList.remove('ouvert');
  });
  if (!ouvert) menu.classList.add('ouvert');
}

function choisirFiltreCurieuxBeginV2(cle, valeur) {
  var f = filtresCurieuxBeginV2;
  f[cle] = cycleFiltreV2(f[cle], valeur);
  document.getElementById('curieuxBeginV2-f-' + cle + '-menu').classList.remove('ouvert');
  // Nouveau pays : une appellation qui n'y existe pas se vide (jamais une liste vide sans raison)
  if (cle === 'pays' && f.appellation) {
    var infos = saqInfosV2();
    var garde = (ALL_CURIEUXBEGIN || []).some(function(a) {
      if (!cbDansModeV2(a, infos)) return false;
      var x = attributsVinCbV2(a, infos);
      return passeFiltreV2(f.pays, x.pays, memeTexteV2) && memeTexteV2(x.appellation, valeurChoixV2(f.appellation));
    });
    if (!garde) f.appellation = '';
  }
  remplirFiltresCurieuxBeginV2();
  chargerCurieuxBeginV2();
}

function toggleCaveCurieuxBeginV2() {
  filtresCurieuxBeginV2.cave = !filtresCurieuxBeginV2.cave;
  remplirFiltresCurieuxBeginV2();
  chargerCurieuxBeginV2();
}

function reinitialiserFiltresCurieuxBeginV2() {
  filtresCurieuxBeginV2 = { saison: '', couleur: '', cepage: '', pays: '', appellation: '', cave: false, mode: 'mesvins' };
  var champ = document.getElementById('curieuxBeginV2-f-texte');
  if (champ) champ.value = '';
  ['saison', 'couleur', 'cepage', 'pays', 'appellation'].forEach(function(k) {
    var menu = document.getElementById('curieuxBeginV2-f-' + k + '-menu');
    if (menu) menu.classList.remove('ouvert');
  });
  remplirFiltresCurieuxBeginV2();
  chargerCurieuxBeginV2();
  fermerFiltresCurieuxBeginV2();
}

// Vrai si l'accord appartient au mode affiché : « Mes vins » = j'ai ce code SAQ ; « Vins à découvrir » = je ne l'ai pas.
function cbDansModeV2(a, infos) {
  var possede = !!infos[(a.codeSAQ || '').toString().trim()];
  return filtresCurieuxBeginV2.mode === 'horscave' ? !possede : possede;
}

// Couleur, cépage principal, pays et appellation d'un vin de Curieux Bégin : ceux de ma fiche si je l'ai,
// sinon ceux que l'enrichissement SAQ a gardés (couleur d'après le type ; pays et appellation depuis le 25 oct. 2026).
function attributsVinCbV2(a, infos) {
  var w = infos[(a.codeSAQ || '').toString().trim()];
  if (w) return { couleur: couleurClasseV2(w.Couleur), cepage: decodeHTML(cepageDominant(w)), pays: decodeHTML(w.Pays || ''), appellation: decodeHTML(w.Appellation || '') };
  return { couleur: couleurClasseV2(a.type), cepage: decodeHTML(cepageDominant({ Cepage: a.cepage || '' })), pays: decodeHTML(a.pays || ''), appellation: decodeHTML(a.appellation || '') };
}

// Valeurs d'un champ, sans doublon (accents et casse ignorés), triées
function valeursUniquesCbV2(attrs, champ) {
  var vues = {};
  var out = [];
  attrs.forEach(function(x) {
    var v = (x[champ] || '').toString().trim();
    var k = normaliserRechercheV2(v);
    if (v && !vues[k]) { vues[k] = true; out.push(v); }
  });
  return out.sort(function(a, b) { return a.localeCompare(b); });
}

// Numéro de saison ou d'épisode (texte ou nombre du Sheet) ; vide → -1, classé en dernier.
function numeroCbV2(v) {
  var n = parseInt(v, 10);
  return isNaN(n) ? -1 : n;
}

function chargerCurieuxBeginV2() {
  var div = document.getElementById('curieuxBeginV2-liste');
  var compte = document.getElementById('curieuxBeginV2-compte');
  if (!div) return;
  var f = filtresCurieuxBeginV2;
  var infos = saqInfosV2();
  var champ = document.getElementById('curieuxBeginV2-f-texte');
  var q = normaliserRechercheV2(champ ? champ.value.trim() : '');

  var base = (ALL_CURIEUXBEGIN || []).filter(function(a) {
    var cs = (a.codeSAQ || '').toString().trim();
    var w = infos[cs];
    var possede = !!w;
    // modes exclusifs : « Mes vins » = mes vins ; « Vins à découvrir » = les autres
    if (!cbDansModeV2(a, infos)) return false;
    if (possede && f.cave && !bouteillesEnCaveParSAQV2(cs)) return false;
    if (!passeFiltreV2(f.saison, (a.saison || '').toString().trim())) return false;
    var x = attributsVinCbV2(a, infos);
    if (!passeFiltreV2(f.couleur, x.couleur, function(classe, v) { return classe === couleurClasseV2(v); })) return false;
    if (!passeFiltreV2(f.cepage, x.cepage, memeTexteV2)) return false;
    if (!passeFiltreV2(f.pays, x.pays, memeTexteV2)) return false;
    if (!passeFiltreV2(f.appellation, x.appellation, memeTexteV2)) return false;
    if (q) {
      var nomRech = possede ? (w.Nom || '') : (a.vin || '');
      if (normaliserRechercheV2(a.plat).indexOf(q) === -1 && normaliserRechercheV2(nomRech).indexOf(q) === -1) return false;
    }
    return true;
  });

  // Une section par saison ; dedans, un bloc par vin avec les recettes de cette saison.
  var parSaison = {};
  var vins = {};
  base.forEach(function(a) {
    var s = (a.saison || '').toString().trim();
    var cs = (a.codeSAQ || '').toString().trim();
    vins[cs] = true;
    if (!parSaison[s]) parSaison[s] = {};
    if (!parSaison[s][cs]) parSaison[s][cs] = { codeSAQ: cs, wine: infos[cs] || null, ref: a, items: [] };
    parSaison[s][cs].items.push(a);
  });
  var nbVins = Object.keys(vins).length;

  var loupe = document.getElementById('curieuxBeginV2-loupe');
  if (loupe) loupe.classList.toggle('actif', !!(f.saison || f.couleur || f.cepage || f.pays || f.appellation || f.cave || q));

  compte.textContent = nbVins + ' vin' + (nbVins > 1 ? 's' : '');
  if (!nbVins) { div.innerHTML = '<div class="texte-secondaire">Aucun accord</div>'; return; }

  function nomGroupe(g) { return g.wine ? decodeHTML(g.wine.Nom || '') : decodeHTML(g.ref.vin || ''); }
  // Saison la plus récente en haut ; dans la saison, les épisodes les plus récents d'abord.
  var saisons = Object.keys(parSaison).sort(function(a, b) { return numeroCbV2(b) - numeroCbV2(a); });
  div.innerHTML = saisons.map(function(s) {
    var groupes = Object.keys(parSaison[s]).map(function(k) {
      var g = parSaison[s][k];
      g.items.sort(function(a, b) { return numeroCbV2(b.episode) - numeroCbV2(a.episode); });
      return g;
    });
    groupes.sort(function(a, b) {
      return (numeroCbV2(b.items[0].episode) - numeroCbV2(a.items[0].episode)) || nomGroupe(a).localeCompare(nomGroupe(b));
    });
    return '<div class="emp-meuble">' + (s ? 'Saison ' + s : 'Saison inconnue') + '</div>' +
      groupes.map(function(g) { return groupeCurieuxBeginV2(g); }).join('');
  }).join('');
}

// Un vin + ses recettes Curieux Bégin : même bloc sur la page et dans la recherche (provenance 'recherche').
// La fiche est sous cette page dans le HTML : depuis la page, on la ferme avant d'ouvrir la fiche (le ✕ la rouvre).
function groupeCurieuxBeginV2(g, provenance) {
  var carteVin, classeCoul;
  if (g.wine) {
    var w = g.wine;
    var cb = (w['Code-barres'] || '').toString().trim();
    classeCoul = couleurClasseV2(w.Couleur);
    var nom = decodeHTML(w.Nom || '—');
    var sous = sousVinV2(w);
    var photo = w['Photo URL'] ? '<div class="carte-photo"><img src="' + w['Photo URL'] + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    var ouvrir = provenance === 'recherche' ? 'ouvrirFicheV2(\'' + cb + '\', \'recherche\')' : 'fermerCurieuxBeginV2();ouvrirFicheV2(\'' + cb + '\', \'curieuxbegin\')';
    var onclick = cb ? ' onclick="ouvrirApresTap(function(){' + ouvrir + '})"' : '';
    carteVin = '<div class="carte histo-vin ' + classeCoul + '"' + onclick + '>' + photo +
      '<div class="carte-centre"><span class="carte-titre">' + nom + '</span><span class="carte-sous">' + sous + '</span></div></div>';
  } else {
    var a0 = g.ref;
    classeCoul = couleurClasseV2(a0.type);
    var nomV = decodeHTML(a0.vin || '—');
    var prixNum = parseFloat((a0.prix || '').toString().replace(',', '.'));
    var prix = isFinite(prixNum) ? (prixNum.toFixed(2).replace('.', ',') + ' $') : '';
    var ligne1 = [decodeHTML(a0.cepage || ''), prix].filter(Boolean).join(' • ');
    var sousV = [ligne1, 'Vin à découvrir à la SAQ'].filter(Boolean).join('<br>');
    var photoV = a0.photo ? '<div class="carte-photo"><img src="' + a0.photo + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '';
    carteVin = '<div class="carte histo-vin ' + classeCoul + '" onclick="window.open(\'https://www.saq.com/fr/' + g.codeSAQ + '\', \'_blank\')">' + photoV +
      '<div class="carte-centre"><span class="carte-titre">' + nomV + '</span><span class="carte-sous">' + sousV + '</span></div></div>';
  }

  var cartesPlats = g.items.map(function(a) {
    var url = 'https://cuisinez.telequebec.tv/recettes/' + a.recetteId + '/' + a.slug;
    var saison = a.saison ? 'Saison ' + a.saison + (a.episode ? '-' + a.episode : '') : '';
    return '<div class="carte histo-mets" onclick="window.open(\'' + url + '\', \'_blank\')">' +
      '<div class="carte-centre"><span class="carte-titre">' + decodeHTML(a.plat || '') + '</span></div>' +
      '<div class="carte-droite">' + saison + '</div></div>';
  }).join('');

  return '<div class="histo-groupe ' + classeCoul + '">' + carteVin + cartesPlats + '</div>';
}

// ==================== MENU BURGER V2 ====================
function toggleMenuV2() {
  var ouvert = document.getElementById('burgerV2').classList.toggle('ouvert');
  document.getElementById('burgerV2-voile').classList.toggle('ouvert', ouvert);
  if (ouvert) {  // à l'ouverture, replier les accordéons (Accord selon… / Outils)
    var acc = document.getElementById('burgerV2-accord'); if (acc) acc.style.display = 'none';
    var out = document.getElementById('burgerV2-outils'); if (out) out.style.display = 'none';
  }
}

function fermerMenuBurgerV2() {
  document.getElementById('burgerV2').classList.remove('ouvert');
  document.getElementById('burgerV2-voile').classList.remove('ouvert');
}

function basculerSousMenuV2(id) {
  var sm = document.getElementById(id);
  if (!sm) return;
  sm.style.display = (sm.style.display === 'block') ? 'none' : 'block';
}

function burgerV2Click(cible) {
  fermerMenuBurgerV2();
  if (cible === 'accueil') {
    cacherToutesPagesV2();
    menuActionV2Context = null;
    return;
  }
  if (cible === 'cave') { cacherToutesPagesV2(); ouvrirCaveV2(); return; }
  if (cible === 'aranger') { cacherToutesPagesV2(); ouvrirARangerV2(); return; }
  if (cible === 'sanscepage') { cacherToutesPagesV2(); ouvrirSansCepageV2(); return; }
  if (cible === 'suggestions') { cacherToutesPagesV2(); ouvrirSuggestionsV2(); return; }
  if (cible === 'racheter') { cacherToutesPagesV2(); ouvrirAchatV2(); return; }
  if (cible === 'emplacements') { cacherToutesPagesV2(); ouvrirEmpV2(); return; }
  if (cible === 'historique') { cacherToutesPagesV2(); ouvrirHistoV2(); return; }
    if (cible === 'facture') { cacherToutesPagesV2(); ouvrirRecuV2(); return; }
  if (cible === 'accords') { cacherToutesPagesV2(); ouvrirChartierV2(); return; }
  if (cible === 'selonsaq') { cacherToutesPagesV2(); ouvrirSelonSaqV2(); return; }
  if (cible === 'curieuxbegin') { cacherToutesPagesV2(); ouvrirCurieuxBeginV2(); return; }
  if (cible === 'notes') { cacherToutesPagesV2(); ouvrirNotesV2(); return; }

  
  if (cible === 'majaccordssaq') { majAccordsSaqBoucleV2(0); return; }
  if (cible === 'majcurieux') { majCurieuxBeginBoucleV2(0); return; }
  if (cible === 'refresh') {
    // Tout ce qu'un autre téléphone a pu écrire : inventaire, propositions, notes,
    // Chartier, recettes SAQ, Curieux Bégin. Les listes remises à vide se rechargent
    // à l'ouverture de leur page ; propositions et inventaire sont repris tout de suite.
    appelBackend('getInventoryData', {}, { spinner: 'Synchronisation' }).then(function(data) {
      ALL_DATA = data || [];
      return appelBackend('getSuggestions', {}, { spinner: 'Synchronisation' });
    }).then(function(sugg) {
      ALL_SUGGESTIONS = sugg || [];
      ALL_HISTORIQUE = [];
      ALL_NOTES = [];
      ALL_ACCORDS = null;
      ALL_RECETTES = null;
      ALL_CURIEUXBEGIN = null;
      INVENTAIRE_SUCC_V2 = null;
      effacerCopieV2('inventaireSucc');
      afficherMessage('✓ Synchronisé');
      mettreAJourAppV2(); // porte de sortie : la dernière version de l'app, pas une vieille copie
    }).catch(function() { afficherMessage('Erreur de synchronisation'); });
    return;
  }
  afficherMessage('À venir');
}

// Mise à jour Curieux Bégin — relance automatique tant que le backend n'a pas fini (garde-fou 5 min côté serveur).
// Affiche le VRAI message d'erreur (utile sans console) et s'arrête si l'action n'est pas déployée (res.error).
function majCurieuxBeginBoucleV2(ajoutsCumul) {
  appelBackend('majCurieuxBegin', {}, { spinner: 'Mise à jour Curieux Bégin', timeout: 330000 }).then(function(res) {
    if (!res || res.success === false || res.error) {
      afficherMessage('Curieux Bégin : ' + ((res && res.error) ? res.error : 'réponse inattendue'));
      return;
    }
    var ajouts = ajoutsCumul + (res.ajoutees || 0);
    if (!res.termine) { majCurieuxBeginBoucleV2(ajouts); return; }
    ALL_CURIEUXBEGIN = null;
    afficherMessage('✓ Curieux Bégin à jour (' + ajouts + ' ajout' + (ajouts > 1 ? 's' : '') + ')');
  }).catch(function(e) { afficherMessage('Curieux Bégin : ' + (e && e.message ? e.message : 'erreur inconnue')); });
}

// Mise à jour Accords SAQ — remplit les familles des vins (relance auto s'il en reste) puis les recettes,
// enfin resynchronise les données (les familles s'écrivent sur les vins). Affiche le vrai message d'erreur.
function majAccordsSaqBoucleV2(faitsCumul) {
  appelBackend('majAccordsSAQ', {}, { spinner: 'Mise à jour Accords SAQ', timeout: 330000 }).then(function(res) {
    if (!res || res.success === false || res.error) {
      afficherMessage('Accords SAQ : ' + ((res && res.error) ? res.error : 'réponse inattendue'));
      return;
    }
    var faits = faitsCumul + (res.faits || 0);
    if (!res.termine) { majAccordsSaqBoucleV2(faits); return; }
    ALL_RECETTES = null;
    appelBackend('getInventoryData', {}, { spinner: 'Mise à jour Accords SAQ' }).then(function(data) {
      ALL_DATA = data || [];
      ALL_HISTORIQUE = [];
      afficherMessage('✓ Accords SAQ à jour (' + (res.ajoutees || 0) + ' recette' + ((res.ajoutees > 1) ? 's' : '') + ')');
    }).catch(function() { afficherMessage('✓ Accords SAQ à jour'); });
  }).catch(function(e) { afficherMessage('Accords SAQ : ' + (e && e.message ? e.message : 'erreur inconnue')); });
}

function ajouterBouteilleArrivee(meuble, rangee, espace) {
  var code = menuActionV2Context ? menuActionV2Context.code : null;
  if (!code) { afficherMessage('Vin introuvable'); return; }
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

// ==================== FILTRES : « SEULEMENT » OU « SAUF » (27 oct. 2026) ====================
// Dans un menu de filtre, taper une valeur = « seulement elle » ; la retaper = « sauf elle » ; une 3e fois = « Tous ».
// « Sauf X » se garde dans la même variable que « X », précédé de SAUF_FILTRE_V2 : toute comparaison passe par
// passeFiltreV2, toute ligne de menu par classeChoixV2, tout menu fermé par libelleChoixV2.
var SAUF_FILTRE_V2 = '≠';
function cycleFiltreV2(actuel, valeur) {
  if (!valeur) return '';
  if (actuel === valeur) return SAUF_FILTRE_V2 + valeur;
  if (actuel === SAUF_FILTRE_V2 + valeur) return '';
  return valeur;
}
function estSaufV2(choix) { return typeof choix === 'string' && choix.charAt(0) === SAUF_FILTRE_V2; }
function valeurChoixV2(choix) { return estSaufV2(choix) ? choix.slice(1) : (choix || ''); }
// La valeur d'un élément passe-t-elle le choix ? comparer(valeur, choisie) — égalité stricte par défaut
function passeFiltreV2(choix, valeur, comparer) {
  if (!choix) return true;
  var v = valeurChoixV2(choix);
  var r = comparer ? !!comparer(valeur, v) : valeur === v;
  return estSaufV2(choix) ? !r : r;
}
// Le texte contient-il la valeur choisie, telle quelle ? (accords d'un vin : « Poulet, Fromage »)
function contientChaineV2(texte, v) { return (texte || '').toString().indexOf(v) !== -1; }
// Une liste (accords, sommeliers d'un vin…) contient-elle la valeur choisie ?
function listeContientV2(liste, v) { return (liste || []).indexOf(v) !== -1; }
// Ligne de menu : « actif » (seulement elle) ou « exclu » (sauf elle)
function classeChoixV2(v, choix) { return v === choix ? ' actif' : (estSaufV2(choix) && valeurChoixV2(choix) === v ? ' exclu' : ''); }
// Menu fermé : la valeur, « Sauf X », ou le libellé par défaut
function libelleChoixV2(choix, defaut, montrer) {
  if (!choix) return defaut;
  var v = montrer ? montrer(valeurChoixV2(choix)) : valeurChoixV2(choix);
  return estSaufV2(choix) ? 'Sauf ' + v : v;
}

// ==================== PANNEAUX DE FILTRES (générés) ====================
var PANNEAUX_V2 = {
  cave: {
    prefixe: 'caveV2', bascule: 'basculerFiltreCaveV2', reinit: 'reinitialiserFiltresCaveV2',
    filtres: [['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation'], ['accords', 'Accord'], ['pastille', 'Pastille de goût'], ['acidite', 'Acidité']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="caveV2-f-nom" class="champ-saisie" placeholder="Rechercher par nom" oninput="appliquerFiltresCaveV2()">'
  },
  histo: {
    prefixe: 'histoV2', bascule: 'basculerFiltreHistoV2', reinit: 'reinitialiserFiltresHistoV2',
    filtres: [['vin', 'Vin'], ['note', 'Appréciation'], ['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation'], ['accord', 'Accord'], ['pastille', 'Pastille de goût'], ['acidite', 'Acidité']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="histoV2-f-mets" class="champ-saisie" placeholder="Rechercher un mets" oninput="filtrerMetsHistoV2()">',
    apresReinit: '<div class="roundel" onclick="ouvrirHistoAjoutV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Ajouter</span></div>'
  },
  emp: {
    prefixe: 'empV2', bascule: 'basculerFiltreEmpV2', reinit: 'reinitialiserFiltresEmpV2',
    avant: '<div class="titre-3">Afficher</div>' +
           '<div class="item-liste" id="empV2-mode-plan" onclick="choisirModeEmpV2(\'plan\')">Plan des meubles</div>' +
           '<div class="item-liste" id="empV2-mode-doubles" onclick="choisirModeEmpV2(\'doubles\')">Vins en double</div>' +
           '<div class="item-liste" id="empV2-mode-cepdoubles" style="display:none;" onclick="choisirModeEmpV2(\'cepdoubles\')">Cépages doubles</div>' +
           '<div class="item-liste" id="empV2-mode-listemeuble" style="display:none;" onclick="choisirModeEmpV2(\'listemeuble\')">Liste du meuble</div>' +
           '<div class="item-liste" id="empV2-mode-cepmanquants" onclick="choisirModeEmpV2(\'cepmanquants\')">Cépages manquants</div>' +
           '<div class="item-liste" id="empV2-mode-appmanquante" onclick="choisirModeEmpV2(\'appmanquante\')">Appellation manquante</div>' +
           '<div class="item-liste" id="empV2-mode-fammanquante" onclick="choisirModeEmpV2(\'fammanquante\')">Familles manquantes</div>' +
           '<div class="item-liste" id="empV2-mode-menage" onclick="choisirModeEmpV2(\'menage\')">Tri œnophile</div>' +
           '<div class="panneau-separateur"></div>',
    filtres: [['meuble', 'Meuble'], ['rangee', 'Rangée'], ['espace', 'Espace'], ['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation']],
    apresReinit: '<div class="panneau-separateur"></div>' +
           '<div class="roundel" onclick="reinitialiserFiltresEmpV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Réinitialiser</span></div>'
  },
  achat: {
    prefixe: 'achatV2', bascule: 'basculerFiltreAchatV2', reinit: 'reinitialiserFiltresAchatV2',
    avant: '<div class="titre-3">Succursale</div>' +
           '<div class="champ-cliquable" id="achatV2-f-succ-display" onclick="basculerFiltreAchatV2(\'succ\')">Succursale</div>' +
           '<div id="achatV2-f-succ-menu" class="menu-liste"></div>' +
           '<div class="panneau-separateur"></div>' +
           '<div class="titre-3">Afficher</div>' +
           '<div class="item-liste" id="achatV2-mode-achat" onclick="choisirModeAchatV2(\'achat\')">Liste d\'achat</div>' +
           '<div class="item-liste" id="achatV2-mode-favoris" onclick="choisirModeAchatV2(\'favoris\')">Liste favoris</div>' +
           '<div class="item-liste" id="achatV2-mode-suggestions" onclick="choisirModeAchatV2(\'suggestions\')">Liste propositions</div>' +
           '<div class="item-liste" id="achatV2-mode-decouvertes" onclick="choisirModeAchatV2(\'decouvertes\')">Liste découvertes</div>' +
           '<div class="item-liste" id="achatV2-mode-nepasracheter" onclick="choisirModeAchatV2(\'nepasracheter\')">Liste ne pas racheter</div>' +
           '<div class="panneau-separateur"></div>',
    filtres: [['sommelier', 'Sommelier'], ['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation'], ['pastille', 'Pastille de goût']]
  },
  recherche: {
    prefixe: 'rechercheV2', bascule: 'basculerFiltreRechercheV2', reinit: 'reinitialiserFiltresRechercheV2',
    filtres: [['sommelier', 'Sommelier'], ['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation'], ['accords', 'Accord'], ['pastille', 'Pastille de goût']]
  },
  notes: {
    prefixe: 'notesV2', bascule: 'basculerFiltreNotesV2', reinit: 'reinitialiserFiltresNotesV2',
    filtres: [['source', 'Qui l\'a dit']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="notesV2-f-texte" class="champ-saisie" placeholder="Chercher un aliment" oninput="afficherNotesV2()">',
    apresReinit: '<div class="roundel" onclick="ajouterDepuisNotesV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Ajouter</span></div>'
  },
  suggestions: {
    prefixe: 'suggestionsV2', bascule: 'basculerFiltreSuggestionsV2', reinit: 'reinitialiserFiltresSuggestionsV2',
    filtres: [['sommelier', 'Sommelier'], ['couleur', 'Couleur']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="suggestionsV2-f-texte" class="champ-saisie" placeholder="Chercher dans les notes" oninput="afficherSuggestionsV2()">',
    apresReinit: '<div class="roundel" onclick="ajouterDepuisSuggestionsV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Ajouter</span></div>'
  },
  curieuxbegin: {
    prefixe: 'curieuxBeginV2', bascule: 'basculerFiltreCurieuxBeginV2', reinit: 'reinitialiserFiltresCurieuxBeginV2',
    avant: '<div class="titre-3">Afficher</div>' +
           '<div class="item-liste" id="curieuxBeginV2-mode-mesvins" onclick="choisirModeCurieuxBeginV2(\'mesvins\')">Mes vins</div>' +
           '<div class="item-liste" id="curieuxBeginV2-mode-horscave" onclick="choisirModeCurieuxBeginV2(\'horscave\')">Vins à découvrir</div>' +
           '<div class="panneau-separateur"></div>',
    filtres: [['saison', 'Saison'], ['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="curieuxBeginV2-f-texte" class="champ-saisie" placeholder="Chercher un plat ou un vin" oninput="chargerCurieuxBeginV2()">'
  }
};

// Clic sur la loupe d'un panneau :
//  - panneau OUVERT + filtres actifs (entonnoir doré) → réinitialise (le reinit referme le panneau) ;
//  - panneau FERMÉ → ouvre en gardant les choix (la loupe montre une flèche « rouvrir » si des filtres sont actifs).
// Synchronise l'état ✓/✗ d'un rond « en haut » (interrupteur sorti du panneau)
function majToggleHautV2(id, actif) {
  var el = document.getElementById(id);
  if (el) { el.classList.toggle('actif', !!actif); el.textContent = actif ? '✓' : '✗'; }
}

function clicLoupeV2(prefixe, reinitFn) {
  var loupe = document.getElementById(prefixe + '-loupe');
  var voile = document.getElementById(prefixe + '-filtres-voile');
  var panneau = document.getElementById(prefixe + '-filtres');
  if (panneau && panneau.classList.contains('ouvert')) {
    if (loupe && loupe.classList.contains('actif') && reinitFn) reinitFn();
    return;
  }
  if (voile) voile.classList.add('ouvert');
  if (panneau) panneau.classList.add('ouvert');
}

function construirePanneauxV2() {
  Object.keys(PANNEAUX_V2).forEach(function(k) {
    var p = PANNEAUX_V2[k];
    var el = document.getElementById(p.prefixe + '-filtres');
    if (!el) return;
    var html = p.avant || '';
    html += '<div class="titre-3">Filtrer</div>';
    p.filtres.forEach(function(f) {
      html += '<div class="champ-cliquable" id="' + p.prefixe + '-f-' + f[0] + '-display" onclick="' + p.bascule + '(\'' + f[0] + '\')">' + f[1] + '</div>' +
              '<div id="' + p.prefixe + '-f-' + f[0] + '-menu" class="menu-liste"></div>';
    });
    html += p.apres || '';
    html += p.apresReinit || '';
    el.innerHTML = html;
  });
}
document.addEventListener('DOMContentLoaded', construirePanneauxV2);

