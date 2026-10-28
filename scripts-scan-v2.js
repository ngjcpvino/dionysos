/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-SCAN-V2.JS
   Le scan, l'écran du scan, le vin inconnu, le menu d'action, Arrivée, Déplacer, Boire, Donner
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
  oublierAjoutSuggestionV2();
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
  abandonnerAjoutSuggestionV2();
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
