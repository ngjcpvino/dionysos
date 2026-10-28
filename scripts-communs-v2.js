/* ============================================================
   © 2026 Dionysos — Tous droits réservés
   SCRIPTS-COMMUNS-V2.JS
   Ce qui sert partout : menu burger, filtres « seulement / sauf », panneaux de filtres,
   synonymes de cépages, codes-barres d'un vin, regroupement et cartes de vins
============================================================ */

// Synonymes de cépages (25 oct. 2026 ; PARTOUT dans l'app depuis le 28 oct.) — liste tenue ici, à compléter quand
// l'utilisateur en signale un. Nom commun (celui le plus présent en cave) : ses autres noms.
// Restent à part : Garnacha tintorera (= Alicante Bouschet), Grenache blanc, Grenache gris.
var SYNONYMES_CEPAGES_V2 = {
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
function cleCepageV2(nom) { return normaliserRechercheV2(nom).replace(/[-\s]+/g, ' ').trim(); }

// Nom commun d'un cépage (lui-même s'il n'a pas de synonyme)
var COMMUNS_CEPAGES_V2 = {};   // mémoire : clé → nom commun
function cepageCommunV2(nom) {
  var cle = cleCepageV2(nom);
  if (COMMUNS_CEPAGES_V2.hasOwnProperty(cle)) return COMMUNS_CEPAGES_V2[cle] || nom;
  var commun = '';
  Object.keys(SYNONYMES_CEPAGES_V2).some(function(c) {
    if (cleCepageV2(c) === cle || SYNONYMES_CEPAGES_V2[c].some(function(s) { return cleCepageV2(s) === cle; })) { commun = c; return true; }
    return false;
  });
  COMMUNS_CEPAGES_V2[cle] = commun;
  return commun || nom;
}

// ===== Synonymes partout (28 oct. 2026) : toute comparaison de cépages passe par ces fonctions =====
// Même cépage, synonymes compris (Cannonau = Garnacha = Grenache)
function memeCepageV2(a, b) {
  a = decodeHTML((a || '').toString()).trim(); b = decodeHTML((b || '').toString()).trim();
  if (!a || !b) return false;
  return cleCepageV2(cepageCommunV2(a)) === cleCepageV2(cepageCommunV2(b));
}
// Les cépages d'un texte (« Grenache 60 %, Syrah ») : les noms seuls
function cepagesDuTexteV2(texte) {
  return decodeHTML((texte || '').toString()).split(',').map(function(c) { return c.replace(/\s*\d+\s*%\s*$/, '').trim(); }).filter(Boolean);
}
// Une liste de cépages contient-elle ce cépage ? (synonymes compris)
function contientCepageV2(texte, cep) { return cepagesDuTexteV2(texte).some(function(c) { return memeCepageV2(c, cep); }); }
// Clé de regroupement d'un cépage : celle de son nom commun
function cleCommuneCepageV2(nom) { return cleCepageV2(cepageCommunV2(decodeHTML((nom || '').toString()).trim())); }
// Valeurs d'un menu Cépage : le nom commun une seule fois (« Grenache », jamais aussi « Cannonau »)
function menuCepagesV2(noms) {
  var vus = {}, out = [];
  noms.forEach(function(n) {
    n = decodeHTML((n || '').toString()).trim();
    if (!n) return;
    var commun = cepageCommunV2(n), k = cleCepageV2(commun);
    if (!vus[k]) { vus[k] = true; out.push(commun); }
  });
  return out.sort(function(a, b) { return a.localeCompare(b); });
}
// Affichage : chaque synonyme suivi de son nom commun — « Cannonau (Grenache) 85 %, Syrah »
function annoterCepagesV2(texte) {
  return decodeHTML((texte || '').toString()).split(',').map(function(c) {
    var m = c.trim().match(/^(.*?)(\s*\d+\s*%)?$/);
    var nom = (m[1] || '').trim(), pct = m[2] || '';
    if (!nom) return c.trim();
    var commun = cepageCommunV2(nom);
    return nom + (cleCepageV2(commun) !== cleCepageV2(nom) ? ' (' + commun + ')' : '') + pct;
  }).filter(Boolean).join(', ');
}

// Tous les codes-barres d'un vin (« Codes-barres » = la liste de la fiche ; repli : le premier)
function codesBarresDuVinV2(w) {
  return (w['Codes-barres'] || w['Code-barres'] || '').toString().split(',').map(function(c) { return c.trim(); }).filter(Boolean);
}
// Le code-barres de la fiche pour un code scanné (lui-même s'il l'est déjà, ou s'il est inconnu)
function codePrincipalV2(code) {
  var w = (ALL_DATA || []).filter(function(i) { return memeCodeV2(i['Code-barres'], code); })[0] ||
          (ALL_DATA || []).filter(function(i) { return codesBarresDuVinV2(i).some(function(c) { return memeCodeV2(c, code); }); })[0];
  return w && w['Code-barres'] ? w['Code-barres'].toString().trim() : code;
}

function wineResultDepuisMemoireV2(code) {
  var cb = (code || '').toString().trim();
  var items = (ALL_DATA || []).filter(function(i) {
    return memeCodeV2(i['Code-barres'], cb) || codesBarresDuVinV2(i).some(function(c) { return memeCodeV2(c, cb); });
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
  return [paysRegion, annoterCepagesV2(w.Cepage), w.Appellation || ''].filter(Boolean).join('<br>');
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

// ==================== MENU BURGER V2 ====================
function toggleMenuV2() {
  var ouvert = document.getElementById('burgerV2').classList.toggle('ouvert');
  document.getElementById('burgerV2-voile').classList.toggle('ouvert', ouvert);
  if (ouvert) {  // à l'ouverture, replier les accordéons (Accord selon… / Outils)
    var acc = document.getElementById('burgerV2-accord'); if (acc) acc.style.display = 'none';
    var out = document.getElementById('burgerV2-outils'); if (out) out.style.display = 'none';
    // pastille dorée sur OUTILS et sur « Sans cépage » tant qu'il reste des vins sans cépage
    var reste = vinsSansCepageV2().length > 0;
    ['burgerV2-pastille-outils', 'burgerV2-pastille-sanscepage'].forEach(function(id) {
      var pastille = document.getElementById(id);
      if (pastille) pastille.classList.toggle('visible', reste);
    });
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
// Après un choix, le menu reste ouvert UNE SECONDE — le temps du 2e tap (« sauf ») —, puis se referme seul ;
// chaque tap relance la seconde. Rouvrir le menu (basculer) annule la fermeture prévue.
var FERMETURES_MENUS_V2 = {};
function fermerMenuApresV2(id) {
  clearTimeout(FERMETURES_MENUS_V2[id]);
  FERMETURES_MENUS_V2[id] = setTimeout(function() {
    delete FERMETURES_MENUS_V2[id];
    var m = document.getElementById(id);
    if (m) m.classList.remove('ouvert');
  }, 1000);
}
function annulerFermetureMenuV2(id) { clearTimeout(FERMETURES_MENUS_V2[id]); delete FERMETURES_MENUS_V2[id]; }
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
           '<div class="item-liste" id="empV2-mode-menage" onclick="choisirModeEmpV2(\'menage\')">Tri Dionysos</div>' +
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

