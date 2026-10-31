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
  var actives = items.filter(bouteilleEnCaveV2);
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
  var cepage = annoterCepagesV2(w.Cepage);
  if (cepage && w.Favori === 'Oui') cepage += ' <span class="etoile-favori actif">★</span>';   // vin pour cépage favori
  return [paysRegion, cepage, w.Appellation || ''].filter(Boolean).join('<br>');
}

// ==================== LA CARTE — une seule façon de la dessiner (28 oct. 2026, liste 2.0 chantier 4) ====================
// c = { classes : après « carte » (couleur du vin, histo-vin / histo-mets dans un groupe, carte-vide…) ; onclick : le JS du tap ;
//       photo : URL (placePhoto : la place gardée même sans photo) ; titre ; sous et droite : facultatifs (null : pas de ligne,
//       pas de case) ; droiteClasses : carte-droite-empilee… }
function carteV2(c) {
  var img = c.photo ? '<img src="' + c.photo + '" alt="" loading="lazy" onerror="' + (c.placePhoto ? 'this' : 'this.parentNode') + '.style.display=\'none\'">' : '';
  return '<div class="carte' + (c.classes ? ' ' + c.classes : '') + '"' + (c.onclick ? ' onclick="' + c.onclick + '"' : '') + '>' +
    (img || c.placePhoto ? '<div class="carte-photo">' + img + '</div>' : '') +
    '<div class="carte-centre"><span class="carte-titre">' + c.titre + '</span>' + (c.sous == null ? '' : '<span class="carte-sous">' + c.sous + '</span>') + '</div>' +
    (c.droite == null ? '' : '<div class="carte-droite' + (c.droiteClasses ? ' ' + c.droiteClasses : '') + '">' + c.droite + '</div>') + '</div>';
}

// Le tap qui ouvre la fiche d'un vin (le JS d'un onclick) ; avant : ce qui se fait d'abord (fermer la page : la fiche est dessous).
// Provenance 'comparable' (menu d'action, AU-DESSUS de la fiche) : naviguerV2 masque le menu, le ✕ de la fiche le rouvre.
function tapFicheV2(cb, provenance, avant) {
  if (!cb) return '';
  return (provenance === 'comparable' ? 'naviguerV2' : 'ouvrirApresTap') + '(function(){' + (avant || '') + 'ouvrirFicheV2(\'' + cb + '\', \'' + provenance + '\')})';
}

// La carte d'un vin groupé (grouperVinsV2) — la même partout : couleur, voilée à 0 bouteille, photo (un cercle rouge barré dessus
// si « Racheter » est à Non), nom, origine (sousVinV2), « X btl » et ses emplacements. onclick : le JS du tap ; classes : en plus, devant la couleur (histo-mets dans un groupe).
function carteGroupeVinV2(g, onclick, classes) {
  var w = g.wine;
  var emp = (g.emplacements && g.emplacements.length) ? '<br>' + g.emplacements.join('<br>') : '';
  return carteV2({ classes: (classes ? classes + ' ' : '') + couleurClasseV2(w.Couleur) + (g.count === 0 ? ' carte-vide' : '') +
    (w.Racheter === 'Non' ? ' ne-pas-racheter' : ''), onclick: onclick,
    photo: w['Photo URL'], placePhoto: true, titre: decodeHTML(w.Nom || '—'), sous: sousVinV2(w), droite: caseDroiteV2(w, g.count) + emp });
}

// Une carte de groupe (un vin en tête, ses plats / propositions dessous) : un plat de l'historique → le corriger
function carteMetHistoV2(m, nom, provenance) {
  var note = parseInt(m.bonAccord) || 0;
  var esc = function(v) { return (v || '').toString().replace(/'/g, "\\'"); };
  return carteV2({ classes: 'histo-mets' + ((note >= 1 && note <= 5) ? ' note-' + note : ''), titre: m.plat || '—', droite: m.date || '',
    onclick: 'ouvrirApresTap(function(){ouvrirHistoEditV2(' + m.row + ', \'' + esc(m.plat) + '\', ' + note + ', \'' + esc(nom) + '\', \'' + provenance + '\', \'' + (m.codeSAQ || '') + '\', \'' + (m.codebarre || '') + '\')})' });
}
// …une proposition d'un sommelier → la corriger (retour : la page où revenir)
function carteSuggestionV2(s, codeSAQ, nom, retour) {
  var esc = function(v) { return (v || '').toString().replace(/'/g, "\\'"); };
  return carteV2({ classes: 'histo-mets', titre: s.sommelier || '—', sous: s.note || '', droite: s.date || '',
    onclick: 'ouvrirApresTap(function(){ouvrirSuggestionV2(\'' + codeSAQ + '\', \'' + retour + '\', ' + s.row + ', \'' + esc(s.sommelier) + '\', \'' + esc(s.note) + '\', \'' + esc(nom) + '\')})' });
}
// …un plat de Curieux Bégin → sa recette sur le site de l'émission
function cartePlatCurieuxBeginV2(a, sous) {
  var url = 'https://cuisinez.telequebec.tv/recettes/' + a.recetteId + '/' + a.slug;
  return carteV2({ classes: 'histo-mets', onclick: 'window.open(\'' + url + '\', \'_blank\')', titre: decodeHTML(a.plat || ''), sous: sous,
    droite: a.saison ? 'Saison ' + a.saison + (a.episode ? '-' + a.episode : '') : '' });
}

// Une bouteille encore en cave : ni bue, ni sortie. (Le serveur rend un vin sans bouteille active en « Bu »,
// bouteille 0 ; le Statut « Suggestion » n'existe pas dans les données.)
function bouteilleEnCaveV2(i) { var s = i.Statut || 'En stock'; return s !== 'Bu' && s !== 'Sorti'; }
// Les bouteilles en cave ; ou = 'rangees' (meuble, rangée et espace) ou 'aranger' (le reste) ; sans ou : toutes
function bouteillesEnCaveV2(ou) {
  return (ALL_DATA || []).filter(function(i) {
    return bouteilleEnCaveV2(i) && (!ou || (ou === 'rangees') === !!(i.Meuble && i.Rangee && i.Espace));
  });
}
// Vrai si le vin a au moins une bouteille en cave — par son code-barres, ou par champ ('Code SAQ')
function vinEnCaveV2(code, champ) {
  return bouteillesEnCaveV2().some(function(i) { return memeCodeV2(i[champ || 'Code-barres'], code); });
}

function grouperVinsV2(data) {
  var grouped = {};
  data.forEach(function(item) {
    var cb = (item['Code-barres'] || '').toString().trim().replace(/\s+/g, '');
    var key = cleVinV2(item);
    if (!grouped[key]) grouped[key] = { wine: item, cb: cb, count: 0, emplacements: [] };
    if (bouteilleEnCaveV2(item)) {
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

// Un vin qui a une bouteille n'est jamais une proposition (même si sa case Racheter est restée vide)
function caseDroiteV2(w, count) {
  return (!count && w && estPropositionV2(w)) ? 'Proposition' : (count + ' btl');
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
  oublierAjoutSuggestionV2(); // partir par le menu abandonne un ajout de proposition par scan
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
  if (cible === 'profil') { cacherToutesPagesV2(); ouvrirProfilV2(); return; }
    if (cible === 'facture') { cacherToutesPagesV2(); ouvrirRecuV2(); return; }
  if (cible === 'importachats') { cacherToutesPagesV2(); ouvrirImportAchatsV2(); return; }
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
      ALL_ACHATS = null;
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
  }).catch(function(e) { afficherMessage('Curieux Bégin : ' + causeV2(e)); });
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
  }).catch(function(e) { afficherMessage('Accords SAQ : ' + causeV2(e)); });
}

// ==================== L'APPRÉCIATION EN VERRES (Boire, Corriger, Ajouter à l'historique) ====================
// Les 5 verres, allumés jusqu'à la note ; un verre touché appelle appel(note)
function dessinerVerresV2(id, note, appel) {
  document.getElementById(id).innerHTML = [1, 2, 3, 4, 5].map(function(i) {
    return '<span class="boire-verre' + (i <= (note || 0) ? ' allume' : '') + '" data-note="' + i + '" onclick="' + appel + '(' + i + ')">🍷</span>';
  }).join('');
}
function allumerVerresV2(id, note) {
  Array.prototype.forEach.call(document.querySelectorAll('#' + id + ' .boire-verre'), function(el) {
    el.classList.toggle('allume', parseInt(el.getAttribute('data-note')) <= note);
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

// ==================== PANNEAUX DE FILTRES — LE MOTEUR COMMUN (28 oct. 2026, liste 2.0 chantier 4) ====================
// Les 9 panneaux passent par les MÊMES gestes (fonctions ci-dessous) : ouvrir, fermer, basculer un menu, choisir une
// valeur, tout remettre à zéro, remplir un menu. Chaque panneau ne dit que ce qui lui est propre :
//   etat()        l'objet de ses filtres (filtresCaveV2…), modifié sur place ;
//   vide          ce même objet remis à zéro — l'ouverture de la page ET la remise à zéro s'en servent (mêmes clés, toujours) ;
//   rafraichir()  refaire ses menus et sa liste après un choix ;
//   sansSauf      les menus où retaper ne fait pas « sauf » ; vider : { cle: [menus vidés quand cle change] } (cascades) ;
//   apresChoix(cle), remiseAZero()  ce qu'un choix ou la remise à zéro font en plus ; champs : les recherches à vider.
// L'interrupteur « en haut » (✓/✗, id prefixe-cle) est une clé vraie/fausse de l'état : basculerInterrupteurV2.
// Un nouveau panneau = une entrée ici, rien d'autre (jamais de basculer/choisir/réinitialiser propres à une page).
var PANNEAUX_V2 = {
  cave: {
    prefixe: 'caveV2',
    etat: function() { return filtresCaveV2; }, vide: { couleur: '', cepage: '', pays: '', appellation: '', accords: '', pastille: '', acidite: '', dispo: false },
    rafraichir: function() { appliquerFiltresCaveV2(); }, champs: ['caveV2-f-nom'],
    remiseAZero: function() { majToggleHautV2('caveV2-dispo', false); },
    filtres: [['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation'], ['accords', 'Accord'], ['pastille', 'Pastille de goût'], ['acidite', 'Acidité']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="caveV2-f-nom" class="champ-saisie" placeholder="Rechercher par nom" oninput="appliquerFiltresCaveV2()">'
  },
  histo: {
    prefixe: 'histoV2',
    etat: function() { return filtresHistoV2; }, vide: { mets: '', vin: '', note: '', couleur: '', cepage: '', pays: '', appellation: '', accord: '', pastille: '', acidite: '', cave: false },
    rafraichir: function() { remplirFiltresHistoV2(); afficherHistoV2(); }, champs: ['histoV2-f-mets'],
    filtres: [['vin', 'Vin'], ['note', 'Appréciation'], ['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation'], ['accord', 'Accord'], ['pastille', 'Pastille de goût'], ['acidite', 'Acidité']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="histoV2-f-mets" class="champ-saisie" placeholder="Rechercher un mets" oninput="filtrerMetsHistoV2()">',
    apresReinit: '<div class="roundel" onclick="ouvrirHistoAjoutV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Ajouter</span></div>'
  },
  emp: {
    prefixe: 'empV2',
    etat: function() { return filtresEmpV2; }, vide: { meuble: '', rangee: '', espace: '', cepage: '', couleur: '', pays: '', appellation: '' },
    rafraichir: function() { remplirFiltresEmpV2(); rendreEmpV2(); },
    sansSauf: ['meuble', 'rangee', 'espace'], vider: { meuble: ['rangee', 'espace'], rangee: ['espace'] },
    apresChoix: function(cle) { apresChoixFiltreEmpV2(cle); }, remiseAZero: function() { empV2Mode = 'plan'; },
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
           '<div class="roundel" onclick="reinitialiserFiltresV2(\'empV2\')"><span class="roundel-anneau"></span><span class="roundel-barre">Réinitialiser</span></div>'
  },
  achat: {
    prefixe: 'achatV2',
    etat: function() { return filtresAchatV2; }, vide: { couleur: '', pays: '', cepage: '', appellation: '', pastille: '', succ: '', sommelier: '' },
    rafraichir: function() { remplirFiltresAchatV2(); appliquerFiltresAchatV2(); },
    sansSauf: ['succ'], vider: { couleur: ['pays', 'cepage', 'appellation', 'pastille'], pays: ['cepage', 'appellation', 'pastille'], cepage: ['appellation', 'pastille'], appellation: ['pastille'] },
    remiseAZero: function() { achatV2PromoSeul = false; },
    avant: '<div class="titre-3">Succursale</div>' +
           '<div class="champ-cliquable" id="achatV2-f-succ-display" onclick="basculerFiltreV2(\'achatV2\', \'succ\')">Succursale</div>' +
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
    prefixe: 'rechercheV2',
    etat: function() { return filtresRechercheV2; }, vide: { sommelier: '', couleur: '', cepage: '', pays: '', appellation: '', accords: '', pastille: '', cave: false },
    rafraichir: function() { remplirFiltresRechercheV2(); lancerRechercheV2(); },
    filtres: [['sommelier', 'Sommelier'], ['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation'], ['accords', 'Accord'], ['pastille', 'Pastille de goût']]
  },
  notes: {
    prefixe: 'notesV2',
    etat: function() { return filtresNotesV2; }, vide: { source: '', cave: false },
    rafraichir: function() { remplirFiltresNotesV2(); afficherNotesV2(); }, champs: ['notesV2-f-texte'],
    filtres: [['source', 'Qui l\'a dit']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="notesV2-f-texte" class="champ-saisie" placeholder="Chercher un aliment" oninput="afficherNotesV2()">',
    apresReinit: '<div class="roundel" onclick="ajouterDepuisNotesV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Ajouter</span></div>'
  },
  suggestions: {
    prefixe: 'suggestionsV2',
    etat: function() { return filtresSuggestionsV2; }, vide: { sommelier: '', couleur: '', cave: false },
    rafraichir: function() { remplirFiltresSuggestionsV2(); afficherSuggestionsV2(); }, champs: ['suggestionsV2-f-texte'],
    filtres: [['sommelier', 'Sommelier'], ['couleur', 'Couleur']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="suggestionsV2-f-texte" class="champ-saisie" placeholder="Chercher dans les notes" oninput="afficherSuggestionsV2()">',
    apresReinit: '<div class="roundel" onclick="ajouterDepuisSuggestionsV2()"><span class="roundel-anneau"></span><span class="roundel-barre">Ajouter</span></div>'
  },
  curieuxbegin: {
    prefixe: 'curieuxBeginV2',
    etat: function() { return filtresCurieuxBeginV2; }, vide: { saison: '', couleur: '', cepage: '', pays: '', appellation: '', cave: false, mode: 'mesvins' },
    rafraichir: function() { remplirFiltresCurieuxBeginV2(); chargerCurieuxBeginV2(); }, champs: ['curieuxBeginV2-f-texte'],
    apresChoix: function(cle) { apresChoixFiltreCurieuxBeginV2(cle); },
    avant: '<div class="titre-3">Afficher</div>' +
           '<div class="item-liste" id="curieuxBeginV2-mode-mesvins" onclick="choisirModeCurieuxBeginV2(\'mesvins\')">Mes vins</div>' +
           '<div class="item-liste" id="curieuxBeginV2-mode-horscave" onclick="choisirModeCurieuxBeginV2(\'horscave\')">Vins à découvrir</div>' +
           '<div class="panneau-separateur"></div>',
    filtres: [['saison', 'Saison'], ['couleur', 'Couleur'], ['cepage', 'Cépage'], ['pays', 'Pays'], ['appellation', 'Appellation']],
    apres: '<div class="panneau-separateur"></div>' +
           '<input type="text" id="curieuxBeginV2-f-texte" class="champ-saisie" placeholder="Chercher un plat ou un vin" oninput="chargerCurieuxBeginV2()">'
  },
  chartier: {
    prefixe: 'chartierV2',
    etat: function() { return filtresChartierV2; }, vide: { couleur: '', cepage: '', dispo: false },
    rafraichir: function() { remplirFiltresChartierV2(); majSelectionChartierV2(); calculerResultatsChartierV2(); },
    sansSauf: ['couleur', 'cepage'], remiseAZero: function() { chartierV2Aliment = ''; },
    avant: '<div class="titre-3">Aliment</div><div id="chartierV2-aliments" style="display:contents;"></div><div class="panneau-separateur"></div>',
    filtres: [['couleur', 'Couleur'], ['cepage', 'Cépage']]
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

function panneauV2(prefixe) {
  return PANNEAUX_V2[Object.keys(PANNEAUX_V2).filter(function(k) { return PANNEAUX_V2[k].prefixe === prefixe; })[0]];
}
function filtresVidesV2(prefixe) { return Object.assign({}, panneauV2(prefixe).vide); }
function ouvrirFiltresV2(prefixe) { clicLoupeV2(prefixe, function() { reinitialiserFiltresV2(prefixe); }); }
function fermerFiltresV2(prefixe) {
  ['-filtres-voile', '-filtres'].forEach(function(s) { var el = document.getElementById(prefixe + s); if (el) el.classList.remove('ouvert'); });
}
function fermerMenusFiltreV2(prefixe) {
  Array.prototype.forEach.call(document.querySelectorAll('#' + prefixe + '-filtres .menu-liste.ouvert'), function(m) { m.classList.remove('ouvert'); });
}
// Un menu à la fois : ouvrir l'un referme les autres ; le retaper le referme
function basculerFiltreV2(prefixe, cle) {
  var menu = document.getElementById(prefixe + '-f-' + cle + '-menu');
  var ouvert = menu.classList.contains('ouvert');
  fermerMenusFiltreV2(prefixe);
  if (!ouvert) { menu.classList.add('ouvert'); annulerFermetureMenuV2(menu.id); }
}
// L'interrupteur « en haut » d'une page (en cave, disponibles) : ✓ ↔ ✗, puis la liste
function basculerInterrupteurV2(prefixe, cle) {
  var p = panneauV2(prefixe), f = p.etat();
  f[cle] = !f[cle];
  majToggleHautV2(prefixe + '-' + cle, f[cle]);
  p.rafraichir();
}
function choisirFiltreV2(prefixe, cle, valeur) {
  var p = panneauV2(prefixe), f = p.etat();
  f[cle] = (p.sansSauf || []).indexOf(cle) !== -1 ? valeur : cycleFiltreV2(f[cle], valeur);
  fermerMenuApresV2(prefixe + '-f-' + cle + '-menu');
  ((p.vider || {})[cle] || []).forEach(function(k) { f[k] = ''; });
  if (p.apresChoix) p.apresChoix(cle);
  p.rafraichir();
}
// Les filtres et les recherches texte à zéro, sans rien redessiner
function viderFiltresV2(prefixe) {
  var p = panneauV2(prefixe), f = p.etat();
  Object.keys(f).forEach(function(k) { delete f[k]; });
  Object.assign(f, p.vide);
  (p.champs || []).forEach(function(id) { var champ = document.getElementById(id); if (champ) champ.value = ''; });
}
function reinitialiserFiltresV2(prefixe) {
  var p = panneauV2(prefixe);
  viderFiltresV2(prefixe);
  fermerMenusFiltreV2(prefixe);
  if (p.remiseAZero) p.remiseAZero();
  p.rafraichir();
  fermerFiltresV2(prefixe);
}
// Ouvrir une page à panneau : la page, remontée en haut, ses filtres à zéro, puis sa liste — tout de suite si ses
// données sont là (charger = null), sinon après charger() (une promesse). Échec → l'accueil, avec la vraie cause.
function ouvrirPageFiltreeV2(prefixe, charger, nom) {
  montrerPageV2(prefixe + 'Container');
  viderFiltresV2(prefixe);
  var p = panneauV2(prefixe);
  if (!charger) { p.rafraichir(); return; }
  charger().then(function() { p.rafraichir(); }).catch(function(err) {
    retourAccueilV2(nom + ' : ' + causeV2(err));
  });
}
// Les valeurs d'un champ, une fois chacune (sans tenir compte des majuscules ni des accents), triées
function valeursUniquesV2(liste, champ) {
  var vues = {};
  var out = [];
  liste.forEach(function(x) {
    var v = (x[champ] || '').toString().trim();
    var k = normaliserRechercheV2(v);
    if (v && !vues[k]) { vues[k] = true; out.push(v); }
  });
  return out.sort(function(a, b) { return a.localeCompare(b); });
}
// Les sommeliers connus (ceux des propositions)
function sommeliersConnusV2() { return valeursUniquesV2(ALL_SUGGESTIONS || [], 'sommelier'); }
// Les valeurs de chaque menu, EN CASCADE : un menu ne propose que ce qui reste après les choix des menus au-dessus.
// criteres : [[cle, valeurs(x) → liste, passe(x, choix) → vrai/faux, tri (facultatif)], …] dans l'ordre des menus.
function valeursEnCascadeV2(base, f, criteres) {
  var listes = {};
  criteres.forEach(function(c) {
    var vus = {};
    base.forEach(function(x) { c[1](x).forEach(function(v) { var k = normaliserRechercheV2(v); if (v && !vus[k]) vus[k] = v; }); });
    listes[c[0]] = Object.keys(vus).map(function(k) { return vus[k]; }).sort(c[3] || function(a, b) { return a.localeCompare(b); });
    base = base.filter(function(x) { return c[2](x, f[c[0]]); });
  });
  return listes;
}
// Critère d'un champ du vin, comparé par egal (égalité stricte par défaut) ; celui des accords (« Poulet, Fromage »)
function critereChampV2(cle, champ, egal) {
  return [cle, function(i) { return [i[champ]]; }, function(i, choix) { return passeFiltreV2(choix, i[champ], egal); }];
}
var CRITERE_ACCORDS_V2 = ['accords', function(i) { return (i.Accords || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean); },
  function(i, choix) { return passeFiltreV2(choix, i.Accords || '', contientChaineV2); }];
// Un menu de filtre : « Tous », puis chaque valeur (seulement / sauf) ; le menu fermé dit le choix. montrer(v) = son libellé.
function remplirMenuFiltreV2(prefixe, cle, valeurs, montrer) {
  var p = panneauV2(prefixe), cur = String(p.etat()[cle] || '');
  var defaut = (p.filtres.filter(function(x) { return x[0] === cle; })[0] || [cle, cle])[1];
  var appel = function(v) { return 'choisirFiltreV2(\'' + prefixe + '\', \'' + cle + '\', \'' + String(v).replace(/'/g, "\\'") + '\')'; };
  var menu = document.getElementById(prefixe + '-f-' + cle + '-menu');
  if (menu) menu.innerHTML = '<div class="item-liste' + (cur === '' ? ' actif' : '') + '" onclick="' + appel('') + '">Tous</div>' + valeurs.map(function(v) {
    return '<div class="item-liste' + classeChoixV2(String(v), cur) + '" onclick="' + appel(v) + '">' + (montrer ? montrer(v) : v) + '</div>';
  }).join('');
  var disp = document.getElementById(prefixe + '-f-' + cle + '-display');
  if (disp) disp.textContent = libelleChoixV2(cur, defaut, montrer);
}

function construirePanneauxV2() {
  Object.keys(PANNEAUX_V2).forEach(function(k) {
    var p = PANNEAUX_V2[k];
    var el = document.getElementById(p.prefixe + '-filtres');
    if (!el) return;
    var html = p.avant || '';
    html += '<div class="titre-3">Filtrer</div>';
    p.filtres.forEach(function(f) {
      html += '<div class="champ-cliquable" id="' + p.prefixe + '-f-' + f[0] + '-display" onclick="basculerFiltreV2(\'' + p.prefixe + '\', \'' + f[0] + '\')">' + f[1] + '</div>' +
              '<div id="' + p.prefixe + '-f-' + f[0] + '-menu" class="menu-liste"></div>';
    });
    html += p.apres || '';
    html += p.apresReinit || '';
    el.innerHTML = html;
  });
}
document.addEventListener('DOMContentLoaded', construirePanneauxV2);

// Les valeurs d'un champ multiple des recettes SAQ (typesPlats, ingredients…), chacune avec son compte ;
// triées par nom, ou (parCompte) les plus fréquentes d'abord
function comptesRecettesV2(recettes, champ, parCompte) {
  var comptes = {};
  recettes.forEach(function(r) {
    (r[champ] || []).forEach(function(v) { comptes[v] = (comptes[v] || 0) + 1; });
  });
  return Object.keys(comptes).sort(function(a, b) {
    if (parCompte && comptes[b] !== comptes[a]) return comptes[b] - comptes[a];
    return a.localeCompare(b);
  }).map(function(v) { return { valeur: v, compte: comptes[v] }; });
}

// Un accordéon à volets (Comparables, « Accords selon… ») : ids base+clé (le volet) et base+clé+'-titre' (son titre).
// Taper un titre ouvre son volet et referme les autres ; le retaper le referme.
function basculerVoletsV2(base, quel) {
  Array.prototype.forEach.call(document.querySelectorAll('[id^="' + base + '"][id$="-titre"]'), function(titre) {
    var volet = document.getElementById(titre.id.slice(0, -'-titre'.length));
    if (!volet) return;
    var ouvrir = volet.id === base + quel && volet.style.display === 'none';
    volet.style.display = ouvrir ? '' : 'none';
    titre.classList.toggle('actif', ouvrir);
  });
}

// « + Ajouter » d'un menu devient un champ (ids base-ajouter → base-champ) ; Entrée appelle confirmer()
function ouvrirChampAjoutV2(base, invite, confirmer) {
  var item = document.getElementById(base + '-ajouter');
  if (!item) return;
  item.outerHTML = '<input type="text" id="' + base + '-champ" class="champ-saisie" placeholder="' + invite + ' (Entrée pour confirmer)">';
  var champ = document.getElementById(base + '-champ');
  champ.onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); confirmer(); } };
  champ.focus();
}

