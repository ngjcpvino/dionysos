const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
const VINO_SHEET = "Vino";
const CONFIG_SHEET = "config"; 

/* ============================================================
   STRUCTURE DE L'ONGLET VINO
   
   RÉFÉRENCE (colonnes A à AF = index 0 à 31) :
   0  A  Code CUP (clé principale)
   1  B  Code SAQ
   2  C  Nom
   3  D  Prix
   4  E  Couleur
   5  F  Cépages
   6  G  Pays
   7  H  Région
   8  I  Appellation
   9  J  Désignation
   10 K  Classification
   11 L  Format
   12 M  Alcool
   13 N  Sucre
   14 O  Particularité
   15 P  Producteur
   16 Q  Agent promo
   17 R  Millésime dégusté
   18 S  Arômes
   19 T  Acidité
   20 U  Sucrosité
   21 V  Corps
   22 W  Bouche
   23 X  Température
   24 Y  Description
   25 Z  Date ajout ref
   26 AA Modifié?
   27 AB Aimé (anciennement "Racheter" - défaut OUI)
   28 AC Accords
   29 AD Recettes
   30 AE Notes temporaires
   31 AF Divers
   
 BOUTEILLES (5 × 7 colonnes = 35, colonnes AJ à BR = index 34 à 68) :
   Chaque bouteille : Meuble, Rangée, Espace, Statut, Date ajout, Date sortie, Ancien emplacement
   
   B1 : index 32-38  (AG-AM)
   B2 : index 39-45  (AN-AT)
   B3 : index 46-52  (AU-BA)
   B4 : index 53-59  (BB-BH)
   B5 : index 60-66  (BI-BO)
=============================================================== */

const REF_COLS = {
  CODE_CUP: 0,
  CODE_SAQ: 1,
  NOM: 2,
  PRIX: 3,
  COULEUR: 4,
  CEPAGES: 5,
  PAYS: 6,
  REGION: 7,
  APPELLATION: 8,
  DESIGNATION: 9,
  CLASSIFICATION: 10,
  FORMAT: 11,
  ALCOOL: 12,
  SUCRE: 13,
  PARTICULARITE: 14,
  PRODUCTEUR: 15,
  AGENT_PROMO: 16,
  MILLESIME: 17,
  AROMES: 18,
  ACIDITE: 19,
  SUCROSITE: 20,
  CORPS: 21,
  BOUCHE: 22,
  TEMPERATURE: 23,
  DESCRIPTION: 24,
  DATE_AJOUT_REF: 25,
  MODIFIE: 26,
  AIME: 27,
  ACCORDS: 28,
  RECETTES: 29,
  NOTES_TEMP: 30,
  DIVERS: 31,
  PASTILLE_GOUT: 32,
  PHOTO_URL: 33,
  PANIER: 34
};

const BOTTLE_START = 35;
const FIELDS_PER_BOTTLE = 7;
const MAX_BOTTLES = 5;
const TOTAL_COLS = BOTTLE_START + (FIELDS_PER_BOTTLE * MAX_BOTTLES); // 69

const B_MEUBLE = 0;
const B_RANGEE = 1;
const B_ESPACE = 2;
const B_STATUT = 3;
const B_DATE_AJOUT = 4;
const B_DATE_SORTIE = 5;

function bottleColIndex(bottleNum, fieldOffset) {
  return BOTTLE_START + ((bottleNum - 1) * FIELDS_PER_BOTTLE) + fieldOffset;
}

function bottleCol(bottleNum, fieldOffset) {
  return bottleColIndex(bottleNum, fieldOffset) + 1;
}

/* ============================================================
   INTERFACE WEB
=============================================================== */

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Vino')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ============================================================
   CRÉATION / CONFIGURATION DE L'ONGLET VINO
=============================================================== */

function createVinoSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(VINO_SHEET);
    
    if (!sheet) {
      sheet = ss.insertSheet(VINO_SHEET);
      Logger.log("Onglet " + VINO_SHEET + " créé");
    }
    
    const headers = [
      "Code CUP", "Code SAQ", "Nom", "Prix", "Couleur", "Cépages", "Pays", "Région",
      "Appellation", "Désignation", "Classification", "Format", "Alcool", "Sucre",
      "Particularité", "Producteur", "Agent promo", "Millésime dégusté", "Arômes",
      "Acidité", "Sucrosité", "Corps", "Bouche", "Température", "Description",
      "Date ajout ref", "Modifié?", "Aimé", "Accords", "Recettes", "Notes temporaires", "Divers"
    ];
    
    for (let b = 1; b <= MAX_BOTTLES; b++) {
      headers.push(
        "B" + b + " Meuble", "B" + b + " Rangée", "B" + b + " Espace",
        "B" + b + " Statut", "B" + b + " Date ajout", "B" + b + " Date sortie",
        "B" + b + " Ancien emplacement"
      );
    }
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    const refHeaderRange = sheet.getRange(1, 1, 1, BOTTLE_START);
    refHeaderRange.setBackground("#4a86e8");
    refHeaderRange.setFontColor("#ffffff");
    refHeaderRange.setFontWeight("bold");
    refHeaderRange.setHorizontalAlignment("center");
    
    const bottleHeaderRange = sheet.getRange(1, BOTTLE_START + 1, 1, FIELDS_PER_BOTTLE * MAX_BOTTLES);
    bottleHeaderRange.setBackground("#6aa84f");
    bottleHeaderRange.setFontColor("#ffffff");
    bottleHeaderRange.setFontWeight("bold");
    bottleHeaderRange.setHorizontalAlignment("center");
    
    sheet.setFrozenRows(1);
    
    Logger.log("Onglet " + VINO_SHEET + " configuré avec " + headers.length + " colonnes");
    return { success: true, message: "Onglet créé et configuré" };
    
  } catch (e) {
    Logger.log("Erreur création " + VINO_SHEET + ": " + e.message);
    return { success: false, error: e.message };
  }
}

/* ============================================================
   CRÉATION ONGLET HISTORIQUE
=============================================================== */

function createHistoriqueSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Historique");
    
    if (!sheet) {
      sheet = ss.insertSheet("Historique");
      Logger.log("Onglet Historique créé");
    }
    
    const headers = [
      "Date", "Code-barres", "Nom du vin", "Plat", "Bon accord ?", "Numéro bouteille", "Row Vino"
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#E6A100");
    headerRange.setFontColor("#000000");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 300);
    sheet.setColumnWidth(4, 300);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 80);
    sheet.setColumnWidth(7, 80);
    
    sheet.setFrozenRows(1);
    
    Logger.log("Onglet Historique configuré");
    return { success: true, message: "Onglet Historique créé" };
    
  } catch (e) {
    Logger.log("Erreur création Historique: " + e.message);
    return { success: false, error: e.message };
  }
}

/* ============================================================
   LECTURE DES DONNÉES
=============================================================== */

function getInventoryData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    
    if (!sheet) return [];
    
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return [];
    
    const data = [];
    const winesWithZeroBottles = {};
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const codeCUPraw = row[REF_COLS.CODE_CUP] ? row[REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
      const codeCUP = codeCUPraw.split(',')[0].trim();
      const nom = row[REF_COLS.NOM] ? row[REF_COLS.NOM].toString() : "Sans nom";
      
      if (!codeCUP && !nom) continue;
      
      let hasActiveBottles = false;
      
      for (let b = 1; b <= MAX_BOTTLES; b++) {
        const statut = row[bottleColIndex(b, B_STATUT)] ? row[bottleColIndex(b, B_STATUT)].toString() : "";
        
        if (!statut) continue;
        
        if (statut !== "Bu" && statut !== "Sorti") {
          hasActiveBottles = true;
        }
        
        data.push({
          "row": i + 1,
          "bottle": b,
          "Code-barres": codeCUP,
          "Nom": nom,
          "Couleur": row[REF_COLS.COULEUR] ? row[REF_COLS.COULEUR].toString() : "",
          "Cepage": row[REF_COLS.CEPAGES] ? row[REF_COLS.CEPAGES].toString() : "",
          "Pays": row[REF_COLS.PAYS] ? row[REF_COLS.PAYS].toString() : "",
          "Meuble": row[bottleColIndex(b, B_MEUBLE)] ? row[bottleColIndex(b, B_MEUBLE)].toString() : "",
          "Rangee": row[bottleColIndex(b, B_RANGEE)] ? row[bottleColIndex(b, B_RANGEE)].toString() : "",
          "Espace": row[bottleColIndex(b, B_ESPACE)] ? row[bottleColIndex(b, B_ESPACE)].toString() : "",
          "Racheter": row[REF_COLS.AIME] ? row[REF_COLS.AIME].toString() : "Oui",
          "Accords": row[REF_COLS.ACCORDS] ? row[REF_COLS.ACCORDS].toString() : "",
          "Statut": statut,
          "Date d'ajout": row[bottleColIndex(b, B_DATE_AJOUT)] ? row[bottleColIndex(b, B_DATE_AJOUT)].toString() : "",
          "Source": "App VINO",
          "Date sortie": row[bottleColIndex(b, B_DATE_SORTIE)] ? row[bottleColIndex(b, B_DATE_SORTIE)].toString() : "",
          "Region": row[REF_COLS.REGION] ? row[REF_COLS.REGION].toString() : "",
          "Appellation": row[REF_COLS.APPELLATION] ? row[REF_COLS.APPELLATION].toString() : "",
          "Code SAQ": row[REF_COLS.CODE_SAQ] ? row[REF_COLS.CODE_SAQ].toString() : "",
          "Classification": row[REF_COLS.CLASSIFICATION] ? row[REF_COLS.CLASSIFICATION].toString() : "",
          "Particularité": row[REF_COLS.PARTICULARITE] ? row[REF_COLS.PARTICULARITE].toString() : "",
          "Producteur": row[REF_COLS.PRODUCTEUR] ? row[REF_COLS.PRODUCTEUR].toString() : "",
          "Agent promo": row[REF_COLS.AGENT_PROMO] ? row[REF_COLS.AGENT_PROMO].toString() : "",
          "Arômes": row[REF_COLS.AROMES] ? row[REF_COLS.AROMES].toString() : "",
          "Acidité": row[REF_COLS.ACIDITE] ? row[REF_COLS.ACIDITE].toString() : "",
          "Sucrosité": row[REF_COLS.SUCROSITE] ? row[REF_COLS.SUCROSITE].toString() : "",
          "Corps": row[REF_COLS.CORPS] ? row[REF_COLS.CORPS].toString() : "",
          "Bouche": row[REF_COLS.BOUCHE] ? row[REF_COLS.BOUCHE].toString() : "",
          "Divers": row[REF_COLS.DIVERS] ? row[REF_COLS.DIVERS].toString() : "",
          "Pastille gout": row[REF_COLS.PASTILLE_GOUT] || "",
          "Photo URL": row[REF_COLS.PHOTO_URL] || "",
          "Panier": row[REF_COLS.PANIER] ? row[REF_COLS.PANIER].toString() : ""
        });
      }
      
      if (!hasActiveBottles && codeCUP) {
        winesWithZeroBottles[codeCUP] = {
          "row": i + 1,
          "bottle": 0,
          "Code-barres": codeCUP,
          "Nom": nom,
          "Couleur": row[REF_COLS.COULEUR] ? row[REF_COLS.COULEUR].toString() : "",
          "Cepage": row[REF_COLS.CEPAGES] ? row[REF_COLS.CEPAGES].toString() : "",
          "Pays": row[REF_COLS.PAYS] ? row[REF_COLS.PAYS].toString() : "",
          "Meuble": "",
          "Rangee": "",
          "Espace": "",
          "Racheter": row[REF_COLS.AIME] ? row[REF_COLS.AIME].toString() : "Oui",
          "Accords": row[REF_COLS.ACCORDS] ? row[REF_COLS.ACCORDS].toString() : "",
          "Statut": "Bu",
          "Date d'ajout": "",
          "Source": "App VINO",
          "Date sortie": "",
          "Region": row[REF_COLS.REGION] ? row[REF_COLS.REGION].toString() : "",
          "Appellation": row[REF_COLS.APPELLATION] ? row[REF_COLS.APPELLATION].toString() : "",
          "Code SAQ": row[REF_COLS.CODE_SAQ] ? row[REF_COLS.CODE_SAQ].toString() : "",
          "Classification": row[REF_COLS.CLASSIFICATION] ? row[REF_COLS.CLASSIFICATION].toString() : "",
          "Particularité": row[REF_COLS.PARTICULARITE] ? row[REF_COLS.PARTICULARITE].toString() : "",
          "Producteur": row[REF_COLS.PRODUCTEUR] ? row[REF_COLS.PRODUCTEUR].toString() : "",
          "Agent promo": row[REF_COLS.AGENT_PROMO] ? row[REF_COLS.AGENT_PROMO].toString() : "",
          "Arômes": row[REF_COLS.AROMES] ? row[REF_COLS.AROMES].toString() : "",
          "Acidité": row[REF_COLS.ACIDITE] ? row[REF_COLS.ACIDITE].toString() : "",
          "Sucrosité": row[REF_COLS.SUCROSITE] ? row[REF_COLS.SUCROSITE].toString() : "",
          "Corps": row[REF_COLS.CORPS] ? row[REF_COLS.CORPS].toString() : "",
          "Bouche": row[REF_COLS.BOUCHE] ? row[REF_COLS.BOUCHE].toString() : "",
          "Divers": row[REF_COLS.DIVERS] ? row[REF_COLS.DIVERS].toString() : "",
          "Pastille gout": row[REF_COLS.PASTILLE_GOUT] || "",
          "Photo URL": row[REF_COLS.PHOTO_URL] || ""
        };
      }
    }
    
    Object.values(winesWithZeroBottles).forEach(function(wine) {
      data.push(wine);
    });
    
    return data;
  } catch (e) {
    Logger.log("Erreur getInventoryData: " + e.message);
    return [];
  }
}

/* ============================================================
   CONFIG & RECHERCHE
=============================================================== */

function getConfig() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG_SHEET);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    
    let config = { couleurs: {}, pays: {}, meubles: {}, accords: [] };
    const idxC = headers.indexOf('Couleur');
    const idxCep = headers.indexOf('Cépage');
    const idxP = headers.indexOf('Pays');
    const idxR = headers.indexOf('Région');
    const idxM = headers.indexOf('Meuble');
    const idxRan = headers.indexOf('Rangée');
    const idxE = headers.indexOf('Espace');
    const idxAcc = headers.indexOf('Accords');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (idxAcc > -1 && row[idxAcc] && !config.accords.includes(row[idxAcc])) config.accords.push(row[idxAcc]);
      if (idxC > -1 && row[idxC]) {
        if (!config.couleurs[row[idxC]]) config.couleurs[row[idxC]] = [];
        if (idxCep > -1 && row[idxCep] && !config.couleurs[row[idxC]].includes(row[idxCep])) config.couleurs[row[idxC]].push(row[idxCep]);
      }
      if (idxP > -1 && row[idxP]) {
        if (!config.pays[row[idxP]]) config.pays[row[idxP]] = [];
        if (idxR > -1 && row[idxR] && !config.pays[row[idxP]].includes(row[idxR])) config.pays[row[idxP]].push(row[idxR]);
      }
      if (idxM > -1 && row[idxM]) {
        if (!config.meubles[row[idxM]]) config.meubles[row[idxM]] = {};
        if (idxRan > -1 && row[idxRan]) {
          if (!config.meubles[row[idxM]][row[idxRan]]) config.meubles[row[idxM]][row[idxRan]] = [];
          if (idxE > -1 && row[idxE] && !config.meubles[row[idxM]][row[idxRan]].includes(row[idxE])) config.meubles[row[idxM]][row[idxRan]].push(row[idxE]);
        }
      }
    }
    return config;
  } catch(e) { return { couleurs: {}, pays: {}, meubles: {}, accords: [] }; }
}

function checkWineExists(codebarre) {
  try {
    if (!codebarre || codebarre.trim() === "") return { exists: false, message: "" };
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    
    if (!sheet) return { exists: false, message: "" };
    
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      const rowCUP = values[i][REF_COLS.CODE_CUP] ? values[i][REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
      const listeCUP = rowCUP.split(',').map(function(c) { return c.trim(); });
      
      if (listeCUP.indexOf(codebarre.trim()) !== -1) {
        const bouteilles = [];
        const wineInfo = {
          nom: values[i][REF_COLS.NOM] || "",
          couleur: values[i][REF_COLS.COULEUR] || "",
          cepage: values[i][REF_COLS.CEPAGES] || "",
          pays: values[i][REF_COLS.PAYS] || "",
          aime: values[i][REF_COLS.AIME] || "Oui",
          accords: values[i][REF_COLS.ACCORDS] || "",
          region: values[i][REF_COLS.REGION] || ""
        };
        
        for (let b = 1; b <= MAX_BOTTLES; b++) {
          const statut = values[i][bottleColIndex(b, B_STATUT)] ? values[i][bottleColIndex(b, B_STATUT)].toString() : "";
          if (!statut) continue;
          
          if (statut !== "Bu" && statut !== "Sorti") {
            bouteilles.push({
              nom: wineInfo.nom,
              bottle: b,
              meuble: values[i][bottleColIndex(b, B_MEUBLE)] ? values[i][bottleColIndex(b, B_MEUBLE)].toString() : "",
              rangee: values[i][bottleColIndex(b, B_RANGEE)] ? values[i][bottleColIndex(b, B_RANGEE)].toString() : "",
              espace: values[i][bottleColIndex(b, B_ESPACE)] ? values[i][bottleColIndex(b, B_ESPACE)].toString() : "",
              statut: statut
            });
          }
        }
        
        return {
          exists: true,
          row: i + 1,
          count: bouteilles.length,
          wine: wineInfo,
          bottles: bouteilles,
          message: bouteilles.length > 0 ? "Ce vin existe déjà." : "Ce vin existe (toutes les bouteilles ont été bues)."
        };
      }
    }
    
    return { exists: false, message: "" };
  } catch(e) {
    Logger.log("Erreur checkWineExists: " + e.message);
    return { exists: false, message: "Erreur" };
  }
}

function checkLocationAvailable(meuble, rangee, espace) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    
    if (!sheet) return { available: true, message: "Libre" };
    
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      for (let b = 1; b <= MAX_BOTTLES; b++) {
        const statut = values[i][bottleColIndex(b, B_STATUT)] ? values[i][bottleColIndex(b, B_STATUT)].toString() : "";
        if (!statut || statut === "Bu" || statut === "Sorti") continue;
        
        const bMeuble = values[i][bottleColIndex(b, B_MEUBLE)] ? values[i][bottleColIndex(b, B_MEUBLE)].toString() : "";
        const bRangee = values[i][bottleColIndex(b, B_RANGEE)] ? values[i][bottleColIndex(b, B_RANGEE)].toString() : "";
        const bEspace = values[i][bottleColIndex(b, B_ESPACE)] ? values[i][bottleColIndex(b, B_ESPACE)].toString() : "";
        
        if (bMeuble == meuble && bRangee == rangee && bEspace == espace) {
          return { available: false, message: `Occupé par : ${values[i][REF_COLS.NOM]}` };
        }
      }
    }
    
    return { available: true, message: "Libre" };
  } catch(e) { return { available: false }; }
}

/* ============================================================
   ÉCRITURE ET LOGISTIQUE
=============================================================== */

function findFreeBottleSlot(row) {
  for (let b = 1; b <= MAX_BOTTLES; b++) {
    const statut = row[bottleColIndex(b, B_STATUT)] ? row[bottleColIndex(b, B_STATUT)].toString() : "";
    if (!statut) return b;
  }
  return -1;
}

function addBottle(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(VINO_SHEET);
    
    if (!sheet) {
      createVinoSheet();
      sheet = ss.getSheetByName(VINO_SHEET);
    }
    
    const codeCUP = formData.codebarre ? formData.codebarre.toString().trim() : "";
    const statut = (formData.meuble && formData.rangee && formData.espace) ? "En stock" : "A ranger";
    
    if (codeCUP) {
      const values = sheet.getDataRange().getValues();
      
      for (let i = 1; i < values.length; i++) {
        const rowCUP = values[i][REF_COLS.CODE_CUP] ? values[i][REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
        const listeCUP = rowCUP.split(',').map(function(c) { return c.trim(); });
        
        if (listeCUP.indexOf(codeCUP) !== -1) {
          const slot = findFreeBottleSlot(values[i]);
          
          if (slot === -1) {
            return { success: false, message: "Maximum de 5 bouteilles atteint pour ce vin" };
          }
          
          const sheetRow = i + 1;
          sheet.getRange(sheetRow, bottleCol(slot, B_MEUBLE)).setValue(formData.meuble || "");
          sheet.getRange(sheetRow, bottleCol(slot, B_RANGEE)).setValue(formData.rangee || "");
          sheet.getRange(sheetRow, bottleCol(slot, B_ESPACE)).setValue(formData.espace || "");
          sheet.getRange(sheetRow, bottleCol(slot, B_STATUT)).setValue(statut);
          sheet.getRange(sheetRow, bottleCol(slot, B_DATE_AJOUT)).setValue(new Date());
          
          if (formData.nom) sheet.getRange(sheetRow, REF_COLS.NOM + 1).setValue(formData.nom);
          if (formData.couleur) sheet.getRange(sheetRow, REF_COLS.COULEUR + 1).setValue(formData.couleur);
          if (formData.cepage) sheet.getRange(sheetRow, REF_COLS.CEPAGES + 1).setValue(formData.cepage);
          if (formData.pays) sheet.getRange(sheetRow, REF_COLS.PAYS + 1).setValue(formData.pays);
          if (formData.region) sheet.getRange(sheetRow, REF_COLS.REGION + 1).setValue(formData.region);
          if (formData.racheter) sheet.getRange(sheetRow, REF_COLS.AIME + 1).setValue(formData.racheter);
          if (formData.accords) sheet.getRange(sheetRow, REF_COLS.ACCORDS + 1).setValue(formData.accords);
          
        sheet.getRange(sheetRow, REF_COLS.PANIER + 1).setValue("");

          return { success: true, message: "Bouteille ajoutée (slot " + slot + ")" };
        }
      }
    }
    
    const newRow = new Array(TOTAL_COLS).fill("");
    newRow[REF_COLS.CODE_CUP] = "'" + codeCUP;
    newRow[REF_COLS.NOM] = formData.nom || "";
    newRow[REF_COLS.COULEUR] = formData.couleur || "";
    newRow[REF_COLS.CEPAGES] = formData.cepage || "";
    newRow[REF_COLS.PAYS] = formData.pays || "";
    newRow[REF_COLS.REGION] = formData.region || "";
    newRow[REF_COLS.DATE_AJOUT_REF] = new Date();
    newRow[REF_COLS.MODIFIE] = "Non";
    newRow[REF_COLS.AIME] = formData.racheter || "Oui";
    newRow[REF_COLS.ACCORDS] = formData.accords || "";
    newRow[bottleColIndex(1, B_MEUBLE)] = formData.meuble || "";
    newRow[bottleColIndex(1, B_RANGEE)] = formData.rangee || "";
    newRow[bottleColIndex(1, B_ESPACE)] = formData.espace || "";
    newRow[bottleColIndex(1, B_STATUT)] = statut;
    newRow[bottleColIndex(1, B_DATE_AJOUT)] = new Date();
    
    sheet.appendRow(newRow);
    
    return { success: true, message: "Nouveau vin ajouté" };
    newRow[REF_COLS.PANIER] = "";
  } catch(e) {
    Logger.log("Erreur addBottle: " + e.message);
    return { success: false, message: e.message };
  }
}


function actionBouteille(row, action, detail = {}) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    const bottle = detail.bottle || 1;
    
    if (action === "boire") {
      const codebarre = sheet.getRange(row, REF_COLS.CODE_CUP + 1).getValue().toString();
      const nom = sheet.getRange(row, REF_COLS.NOM + 1).getValue();
      enregistrerHistorique(codebarre, nom, detail.plat || '', detail.bonAccord || 'Oui', bottle, row);
      
      sheet.getRange(row, bottleCol(bottle, B_MEUBLE)).clearContent();
      sheet.getRange(row, bottleCol(bottle, B_RANGEE)).clearContent();
      sheet.getRange(row, bottleCol(bottle, B_ESPACE)).clearContent();
      sheet.getRange(row, bottleCol(bottle, B_STATUT)).clearContent();
      sheet.getRange(row, bottleCol(bottle, B_DATE_AJOUT)).clearContent();
      sheet.getRange(row, bottleCol(bottle, B_DATE_SORTIE)).clearContent();
      
    } else if (action === "deplacer") {
      sheet.getRange(row, bottleCol(bottle, B_MEUBLE)).setValue(detail.meuble);
      sheet.getRange(row, bottleCol(bottle, B_RANGEE)).setValue(detail.rangee);
      sheet.getRange(row, bottleCol(bottle, B_ESPACE)).setValue(detail.espace);
      sheet.getRange(row, bottleCol(bottle, B_STATUT)).setValue("En stock");
    }
    
    return { success: true };
  } catch (e) {
    Logger.log("Erreur actionBouteille: " + e.message);
    return { success: false };
  }
}

function enregistrerHistorique(codebarre, nomVin, plat, bonAccord, numBouteille, rowVino) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const histSheet = ss.getSheetByName("Historique");
    
    if (!histSheet) {
      Logger.log("Sheet Historique introuvable");
      return;
    }
    
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    
    histSheet.appendRow([
      dateStr,
      "'" + codebarre,
      nomVin,
      plat,
      bonAccord,
      numBouteille,
      rowVino
    ]);
    
    Logger.log("Historique enregistré: " + nomVin);
  } catch (e) {
    Logger.log("Erreur enregistrerHistorique: " + e.message);
  }
}

function getHistorique() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const histSheet = ss.getSheetByName("Historique");
    const vinoSheet = ss.getSheetByName(VINO_SHEET);
    
    if (!histSheet) return [];
    
    const values = histSheet.getDataRange().getValues();
    if (values.length < 2) return [];
    
    const vinoData = vinoSheet ? vinoSheet.getDataRange().getValues() : [];
    
    const data = [];
    for (let i = values.length - 1; i >= 1; i--) {
      const codebarre = values[i][1] ? values[i][1].toString().replace(/'/g, '').trim() : '';
      
      let couleur = '';
      if (codebarre && vinoData.length > 0) {
        for (let v = 1; v < vinoData.length; v++) {
          const vinoCB = vinoData[v][REF_COLS.CODE_CUP] ? vinoData[v][REF_COLS.CODE_CUP].toString().replace(/'/g, '').trim() : '';
          if (vinoCB === codebarre) {
            couleur = vinoData[v][REF_COLS.COULEUR] || '';
            break;
          }
        }
      }
      
      data.push({
        date: values[i][0] ? Utilities.formatDate(new Date(values[i][0]), Session.getScriptTimeZone(), "dd-MM-yyyy") : '',
        codebarre: codebarre,
        nom: values[i][2] ? values[i][2].toString() : '',
        plat: values[i][3] ? values[i][3].toString() : '',
        bonAccord: values[i][4] ? values[i][4].toString() : '',
        couleur: couleur
      });
    }
    
    return data;
  } catch (e) {
    Logger.log("Erreur getHistorique: " + e.message);
    return [];
  }
}

function updateWineData(updatedData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    const data = sheet.getDataRange().getValues();
    const cupTarget = updatedData.codebarre.toString().trim();
    
    for (let i = 1; i < data.length; i++) {
      let currentCUP = data[i][REF_COLS.CODE_CUP] ? data[i][REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
      const listeCUP = currentCUP.split(',').map(function(c) { return c.trim(); });
      
      if (listeCUP.indexOf(cupTarget) !== -1) {
        const sheetRow = i + 1;
        sheet.getRange(sheetRow, REF_COLS.CODE_SAQ + 1).setValue(updatedData.codesaq || "");
        sheet.getRange(sheetRow, REF_COLS.AIME + 1).setValue(updatedData.racheter || "Oui");
        sheet.getRange(sheetRow, REF_COLS.ACCORDS + 1).setValue(updatedData.accords || "");
        sheet.getRange(sheetRow, REF_COLS.MODIFIE + 1).setValue("Oui");
        return { success: true, count: 1 };
      }
    }
    
    return { success: true, count: 0 };
  } catch (e) {
    Logger.log("Erreur dans updateWineData: " + e.message);
    return { success: false, error: e.message };
  }
}

function updateWineField(codebarre, field, value) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      const rowCUP = values[i][REF_COLS.CODE_CUP] ? values[i][REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
      const listeCUP = rowCUP.split(',').map(function(c) { return c.trim(); });
      if (listeCUP.indexOf(codebarre.toString().trim()) !== -1) {
        if (field === 'Accords') {
          sheet.getRange(i + 1, REF_COLS.ACCORDS + 1).setValue(value);
     } else if (field === 'Racheter') {
  sheet.getRange(i + 1, REF_COLS.AIME + 1).setValue(value);
} else if (field === 'Panier') {
  sheet.getRange(i + 1, REF_COLS.PANIER + 1).setValue(value);
}
        return { success: true };
      }
    }
    return { success: false };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function mettreBotteilleARanger(row, bottle) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    const b = bottle || 1;
    
    sheet.getRange(row, bottleCol(b, B_MEUBLE)).setValue("");
    sheet.getRange(row, bottleCol(b, B_RANGEE)).setValue("");
    sheet.getRange(row, bottleCol(b, B_ESPACE)).setValue("");
    sheet.getRange(row, bottleCol(b, B_STATUT)).setValue("A ranger");
    
    return { success: true };
  } catch (e) {
    Logger.log("Erreur mettreBotteilleARanger: " + e.message);
    return { success: false, error: e.message };
  }
}

function getWineBottles(codebarre) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    const values = sheet.getDataRange().getValues();
    const target = codebarre.toString().trim();
    
    for (let i = 1; i < values.length; i++) {
      // CORRECTION : ajout de .replace(/^'/, '') pour enlever l'apostrophe de protection des zéros
      const rowCUP = values[i][REF_COLS.CODE_CUP] ? values[i][REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
      const listeCUP = rowCUP.split(',').map(function(c) { return c.trim(); });
      
      if (listeCUP.indexOf(target) !== -1) {
        const wineInfo = {
          "Code-barres": rowCUP,
          "Code SAQ": values[i][REF_COLS.CODE_SAQ] || "",
          "Nom": values[i][REF_COLS.NOM] || "",
          "Prix": values[i][REF_COLS.PRIX] || "",
          "Couleur": values[i][REF_COLS.COULEUR] || "",
          "Cépage": values[i][REF_COLS.CEPAGES] || "",
          "Pays": values[i][REF_COLS.PAYS] || "",
          "Region": values[i][REF_COLS.REGION] || "",
          "Appellation": values[i][REF_COLS.APPELLATION] || "",
          "Désignation": values[i][REF_COLS.DESIGNATION] || "",
          "Classification": values[i][REF_COLS.CLASSIFICATION] || "",
          "Format": values[i][REF_COLS.FORMAT] || "",
          "Alcool": values[i][REF_COLS.ALCOOL] || "",
          "Sucre": values[i][REF_COLS.SUCRE] || "",
          "Particularité": values[i][REF_COLS.PARTICULARITE] || "",
          "Producteur": values[i][REF_COLS.PRODUCTEUR] || "",
          "Agent promo": values[i][REF_COLS.AGENT_PROMO] || "",
          "Millésime dégusté": values[i][REF_COLS.MILLESIME] || "",
          "Arômes": values[i][REF_COLS.AROMES] || "",
          "Acidité": values[i][REF_COLS.ACIDITE] || "",
          "Sucrosité": values[i][REF_COLS.SUCROSITE] || "",
          "Corps": values[i][REF_COLS.CORPS] || "",
          "Bouche": values[i][REF_COLS.BOUCHE] || "",
          "Température": values[i][REF_COLS.TEMPERATURE] || "",
          "Description": values[i][REF_COLS.DESCRIPTION] || "",
          "Racheter": values[i][REF_COLS.AIME] || "Oui",
          "Accords": values[i][REF_COLS.ACCORDS] || "",
          "Recettes": values[i][REF_COLS.RECETTES] || "",
          "Notes temporaires": values[i][REF_COLS.NOTES_TEMP] || "",
          "Divers": values[i][REF_COLS.DIVERS] || "",
          "Pastille gout": values[i][REF_COLS.PASTILLE_GOUT] || "",
          "Photo URL": values[i][REF_COLS.PHOTO_URL] || "",
          "Panier": values[i][REF_COLS.PANIER] || ""
        };
        
        const bottles = [];
        for (let b = 1; b <= MAX_BOTTLES; b++) {
          const statut = values[i][bottleColIndex(b, B_STATUT)] ? values[i][bottleColIndex(b, B_STATUT)].toString() : "";
          if (!statut) continue;
          bottles.push({
            row: i + 1,
            bottle: b,
            meuble: values[i][bottleColIndex(b, B_MEUBLE)] ? values[i][bottleColIndex(b, B_MEUBLE)].toString() : "",
            rangee: values[i][bottleColIndex(b, B_RANGEE)] ? values[i][bottleColIndex(b, B_RANGEE)].toString() : "",
            espace: values[i][bottleColIndex(b, B_ESPACE)] ? values[i][bottleColIndex(b, B_ESPACE)].toString() : "",
            statut: statut
          });
        }
        
        return { wine: wineInfo, bottles: bottles };
      }
    }
    
    return null;
  } catch(e) {
    Logger.log("Erreur getWineBottles: " + e.message);
    return null;
  }
}

/* ============================================================
   SCRAPING SAQ
=============================================================== */

function findCodeSAQFromBarcode(barcode) {
  try {
    barcode = barcode.toString().trim();
    
    let searchUrl = "https://www.saq.com/fr/catalogsearch/result/?q=" + barcode;
    let result = tryFindCodeSAQ(searchUrl);
    if (result.success) return result;
    
    if (barcode.length < 14) {
      let normalizedBarcode = barcode;
      while (normalizedBarcode.length < 14) {
        normalizedBarcode = "0" + normalizedBarcode;
      }
      searchUrl = "https://www.saq.com/fr/catalogsearch/result/?q=" + normalizedBarcode;
      result = tryFindCodeSAQ(searchUrl);
      if (result.success) return result;
    }
    
    return { success: false, error: "Aucun produit trouvé avec ce code-barres" };
    
  } catch (e) {
    Logger.log("Erreur recherche: " + e.message);
    return { success: false, error: e.message };
  }
}

function tryFindCodeSAQ(searchUrl) {
  try {
    const response = UrlFetchApp.fetch(searchUrl, { muteHttpExceptions: true, followRedirects: true });
    const htmlContent = response.getContentText();
    
    if (response.getResponseCode() !== 200) return { success: false };
    
    const patterns = [
      /\/catalog\/product\/\d\/\d\/(\d{7,8})-/i,
      /href="\/fr\/(\d{7,8})"/i,
      /href="https:\/\/www\.saq\.com\/fr\/(\d{7,8})"/i,
      /\/produits\/(\d{7,8})/i,
      /Code SAQ[:\s]+(\d{7,8})/i
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = htmlContent.match(patterns[i]);
      if (match && match[1]) return { success: true, codeSAQ: match[1] };
    }
    
    return { success: false };
  } catch (e) { return { success: false }; }
}

function testScrapingSAQ(codeSAQ) {
  try {
    const url = `https://www.saq.com/fr/${codeSAQ}`;
    
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    const htmlContent = response.getContentText();
    const statusCode = response.getResponseCode();
    
    if (statusCode !== 200) return { success: false, error: "Code HTTP: " + statusCode };
    
    const result = { codeSAQ: codeSAQ, url: url };
    
    result.nom = extractFromMeta(htmlContent, 'og:title');
    result.prix = extractFromMeta(htmlContent, 'product:price:amount');
    result.pays = extractDetailInfo(htmlContent, 'Pays');
    result.region = extractDetailInfo(htmlContent, 'Région');
    result.appellation = extractDetailInfo(htmlContent, "Appellation d&#039;origine");
    result.designation = extractDetailInfo(htmlContent, 'Désignation réglementée');
    result.classification = extractDetailInfo(htmlContent, 'Classification');
    result.cepages = extractDetailInfo(htmlContent, 'Cépages');
    if (!result.cepages) result.cepages = extractDetailInfo(htmlContent, 'Cépage');
    if (result.cepages) result.cepages = cleanCepages(result.cepages);
    result.alcool = extractDetailInfo(htmlContent, "Degré d&#039;alcool");
    result.sucre = extractDetailInfo(htmlContent, 'Taux de sucre');
    result.couleur = extractDetailInfo(htmlContent, 'Couleur');
    result.particularite = extractDetailInfo(htmlContent, 'Particularité');
    result.format = extractDetailInfo(htmlContent, 'Format');
    result.producteur = extractDetailInfo(htmlContent, 'Producteur');
    result.agentPromotionnel = extractDetailInfo(htmlContent, 'Agent promotionnel');
    result.codeCUP = extractDetailInfo(htmlContent, 'Code CUP');
    result.millesimeDeguste = extractTastingInfo(htmlContent, 'Millésime dégusté');
    result.aromes = extractTastingInfo(htmlContent, 'Arômes');
    result.acidite = extractTastingInfo(htmlContent, 'Acidité');
    result.sucrosite = extractTastingInfo(htmlContent, 'Sucrosité');
    result.corps = extractTastingInfo(htmlContent, 'Corps');
    result.bouche = extractTastingInfo(htmlContent, 'Bouche');
    result.temperature = extractTastingInfo(htmlContent, 'Température de service');
    result.description = extractDescription(htmlContent);

    const pastilleMatch = htmlContent.match(/alt="Pastille de goût : ([^"]+)"/i);
    result.pastilleGout = pastilleMatch ? pastilleMatch[1] : "";

    const photoMatch = htmlContent.match(/https:\/\/www\.saq\.com\/media\/catalog\/product\/[^"?]+\.png/i);
    result.photoURL = photoMatch ? photoMatch[0] : "";
    
    return { success: true, data: result };
    
  } catch (e) {
    Logger.log("Erreur scraping: " + e.message);
    return { success: false, error: e.message };
  }
}

function saveScrapedDataToVino(dataSAQ) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(VINO_SHEET);
    
    if (!sheet) {
      createVinoSheet();
      sheet = ss.getSheetByName(VINO_SHEET);
    }
    
    const values = sheet.getDataRange().getValues();
    let existingRow = -1;
    
    for (let i = 1; i < values.length; i++) {
      const rowSAQ = values[i][REF_COLS.CODE_SAQ] ? values[i][REF_COLS.CODE_SAQ].toString().trim() : "";
      if (rowSAQ === dataSAQ.codeSAQ.toString()) { existingRow = i + 1; break; }
    }
    
    if (existingRow === -1 && dataSAQ.codeCUP) {
      for (let i = 1; i < values.length; i++) {
        const rowCUP = values[i][REF_COLS.CODE_CUP] ? values[i][REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
        if (rowCUP === dataSAQ.codeCUP.toString().trim()) { existingRow = i + 1; break; }
      }
    }
    
    if (existingRow > 0) {
      const r = existingRow;
      if (dataSAQ.codeCUP) sheet.getRange(r, REF_COLS.CODE_CUP + 1).setValue(dataSAQ.codeCUP);
      sheet.getRange(r, REF_COLS.CODE_SAQ + 1).setValue(dataSAQ.codeSAQ);
      if (dataSAQ.nom) sheet.getRange(r, REF_COLS.NOM + 1).setValue(dataSAQ.nom);
      if (dataSAQ.prix) sheet.getRange(r, REF_COLS.PRIX + 1).setValue(parseFloat(dataSAQ.prix));
      if (dataSAQ.couleur) sheet.getRange(r, REF_COLS.COULEUR + 1).setValue(dataSAQ.couleur);
      if (dataSAQ.cepages) sheet.getRange(r, REF_COLS.CEPAGES + 1).setValue(dataSAQ.cepages);
      if (dataSAQ.pays) sheet.getRange(r, REF_COLS.PAYS + 1).setValue(dataSAQ.pays);
      if (dataSAQ.region) sheet.getRange(r, REF_COLS.REGION + 1).setValue(dataSAQ.region);
      if (dataSAQ.appellation) sheet.getRange(r, REF_COLS.APPELLATION + 1).setValue(dataSAQ.appellation);
      if (dataSAQ.designation) sheet.getRange(r, REF_COLS.DESIGNATION + 1).setValue(dataSAQ.designation);
      if (dataSAQ.classification) sheet.getRange(r, REF_COLS.CLASSIFICATION + 1).setValue(dataSAQ.classification);
      if (dataSAQ.format) sheet.getRange(r, REF_COLS.FORMAT + 1).setValue(dataSAQ.format);
      if (dataSAQ.alcool) sheet.getRange(r, REF_COLS.ALCOOL + 1).setValue(dataSAQ.alcool);
      if (dataSAQ.sucre) sheet.getRange(r, REF_COLS.SUCRE + 1).setValue(dataSAQ.sucre);
      if (dataSAQ.particularite) sheet.getRange(r, REF_COLS.PARTICULARITE + 1).setValue(dataSAQ.particularite);
      if (dataSAQ.producteur) sheet.getRange(r, REF_COLS.PRODUCTEUR + 1).setValue(dataSAQ.producteur);
      if (dataSAQ.agentPromotionnel) sheet.getRange(r, REF_COLS.AGENT_PROMO + 1).setValue(dataSAQ.agentPromotionnel);
      if (dataSAQ.millesimeDeguste) sheet.getRange(r, REF_COLS.MILLESIME + 1).setValue(dataSAQ.millesimeDeguste);
      if (dataSAQ.aromes) sheet.getRange(r, REF_COLS.AROMES + 1).setValue(dataSAQ.aromes);
      if (dataSAQ.acidite) sheet.getRange(r, REF_COLS.ACIDITE + 1).setValue(dataSAQ.acidite);
      if (dataSAQ.sucrosite) sheet.getRange(r, REF_COLS.SUCROSITE + 1).setValue(dataSAQ.sucrosite);
      if (dataSAQ.corps) sheet.getRange(r, REF_COLS.CORPS + 1).setValue(dataSAQ.corps);
      if (dataSAQ.bouche) sheet.getRange(r, REF_COLS.BOUCHE + 1).setValue(dataSAQ.bouche);
      if (dataSAQ.temperature) sheet.getRange(r, REF_COLS.TEMPERATURE + 1).setValue(dataSAQ.temperature);
      if (dataSAQ.description) sheet.getRange(r, REF_COLS.DESCRIPTION + 1).setValue(dataSAQ.description);
      sheet.getRange(r, REF_COLS.DATE_AJOUT_REF + 1).setValue(new Date());
      sheet.getRange(r, REF_COLS.MODIFIE + 1).setValue("Non");
      sheet.getRange(r, REF_COLS.PASTILLE_GOUT + 1).setValue(dataSAQ.pastilleGout || "");
      sheet.getRange(r, REF_COLS.PHOTO_URL + 1).setValue(dataSAQ.photoURL || "");
      
      return { success: true, action: "updated", row: existingRow };
      
    } else {
      const newRow = new Array(TOTAL_COLS).fill("");
      newRow[REF_COLS.CODE_CUP] = dataSAQ.codeCUP || "";
      newRow[REF_COLS.CODE_SAQ] = dataSAQ.codeSAQ || "";
      newRow[REF_COLS.NOM] = dataSAQ.nom || "";
      newRow[REF_COLS.PRIX] = dataSAQ.prix || "";
      newRow[REF_COLS.COULEUR] = dataSAQ.couleur || "";
      newRow[REF_COLS.CEPAGES] = dataSAQ.cepages || "";
      newRow[REF_COLS.PAYS] = dataSAQ.pays || "";
      newRow[REF_COLS.REGION] = dataSAQ.region || "";
      newRow[REF_COLS.APPELLATION] = dataSAQ.appellation || "";
      newRow[REF_COLS.DESIGNATION] = dataSAQ.designation || "";
      newRow[REF_COLS.CLASSIFICATION] = dataSAQ.classification || "";
      newRow[REF_COLS.FORMAT] = dataSAQ.format || "";
      newRow[REF_COLS.ALCOOL] = dataSAQ.alcool || "";
      newRow[REF_COLS.SUCRE] = dataSAQ.sucre || "";
      newRow[REF_COLS.PARTICULARITE] = dataSAQ.particularite || "";
      newRow[REF_COLS.PRODUCTEUR] = dataSAQ.producteur || "";
      newRow[REF_COLS.AGENT_PROMO] = dataSAQ.agentPromotionnel || "";
      newRow[REF_COLS.MILLESIME] = dataSAQ.millesimeDeguste || "";
      newRow[REF_COLS.AROMES] = dataSAQ.aromes || "";
      newRow[REF_COLS.ACIDITE] = dataSAQ.acidite || "";
      newRow[REF_COLS.SUCROSITE] = dataSAQ.sucrosite || "";
      newRow[REF_COLS.CORPS] = dataSAQ.corps || "";
      newRow[REF_COLS.BOUCHE] = dataSAQ.bouche || "";
      newRow[REF_COLS.TEMPERATURE] = dataSAQ.temperature || "";
      newRow[REF_COLS.DESCRIPTION] = dataSAQ.description || "";
      newRow[REF_COLS.DATE_AJOUT_REF] = new Date();
      newRow[REF_COLS.MODIFIE] = "Non";
      newRow[REF_COLS.AIME] = "Oui";
      newRow[REF_COLS.PASTILLE_GOUT] = dataSAQ.pastilleGout || "";
      newRow[REF_COLS.PHOTO_URL] = dataSAQ.photoURL || "";
      
      sheet.appendRow(newRow);
      return { success: true, action: "added", row: sheet.getLastRow() };
    }
    
  } catch (e) {
    Logger.log("Erreur saveScrapedDataToVino: " + e.message);
    return { success: false, error: e.message };
  }
}

/* ============================================================
   FICHE VIN COMPLÈTE
=============================================================== */

function getReferenceVinByCode(codeSAQ) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    
    if (!sheet) throw new Error("Feuille " + VINO_SHEET + " introuvable");
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const codeSAQString = codeSAQ ? codeSAQ.toString().trim() : "";
    const codeSAQNumber = parseInt(codeSAQ);
    
    for (let i = 1; i < data.length; i++) {
      const cellValue = data[i][REF_COLS.CODE_SAQ];
      const cellString = cellValue ? cellValue.toString().trim() : "";
      
      if (cellString === codeSAQString || cellValue === codeSAQNumber) {
        const result = {};
        for (let col = 0; col < BOTTLE_START; col++) {
          const header = headers[col] || ("Col" + col);
          const value = data[i][col];
          if (value instanceof Date) result[header] = value.toISOString();
          else if (value === null || value === undefined) result[header] = "";
          else result[header] = value.toString();
        }
        return result;
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log("ERREUR: " + error.message);
    throw error;
  }
}

function ajouterCodeSAQ(codebarre, codeSAQ) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    
    if (!sheet) throw new Error("Feuille " + VINO_SHEET + " introuvable");
    
    const data = sheet.getDataRange().getValues();
    let targetRow = -1;
    
  for (let i = 1; i < data.length; i++) {
      const rowCUP = data[i][REF_COLS.CODE_CUP] ? data[i][REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
      const listeCUP = rowCUP.split(',').map(function(c) { return c.trim(); });
      if (listeCUP.indexOf(codebarre.toString().trim()) !== -1) { targetRow = i + 1; break; }
    }
    
    if (targetRow === -1) throw new Error("Aucun vin trouvé avec ce Code CUP");
    
    sheet.getRange(targetRow, REF_COLS.CODE_SAQ + 1).setValue(codeSAQ);
    const scrapResult = testScrapingSAQ(codeSAQ);
    if (scrapResult.success) Logger.log("Scraping réussi, données enrichies");
    
    return { success: true, updated: 1 };
    
  } catch (error) {
    Logger.log("Erreur ajouterCodeSAQ: " + error.message);
    throw error;
  }
}

/* ============================================================
   VINS SCANNÉS
=============================================================== */

function saveScannedWine(codebarre, note, codeSAQ, quantite, meuble, rangee, espace) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Vins scannés");
  
  if (!sheet) {
    sheet = ss.insertSheet("Vins scannés");
    sheet.getRange(1, 1, 1, 8).setValues([["Code-barres", "Note", "Code SAQ", "Quantité", "Date scan", "Meuble", "Rangée", "Espace"]]);
    const headerRange = sheet.getRange(1, 1, 1, 8);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#E6A100");
    headerRange.setFontColor("#000000");
    headerRange.setHorizontalAlignment("center");
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 300);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 80);
    sheet.setColumnWidth(5, 150);
    sheet.setColumnWidth(6, 100);
    sheet.setColumnWidth(7, 80);
    sheet.setColumnWidth(8, 80);
  }
  
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow(["'" + codebarre, note || "", codeSAQ || "", quantite || "1", dateStr, meuble || "", rangee || "", espace || ""]);
  
  return { success: true };
}

function getScannedWinesIncomplete() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Vins scannés");
    
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const wines = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      wines.push({
        row: i + 1,
        codebarre: String(row[0] || "").replace(/^'/, ''),
        note: String(row[1] || ""),
        codesaq: String(row[2] || ""),
        dateScan: row[4] ? Utilities.formatDate(new Date(row[4]), Session.getScriptTimeZone(), "dd MMM yyyy HH:mm") : "",
        quantite: row[3] || 1
      });
    }
    
    return wines;
    
  } catch (e) {
    return [];
  }
}

function completeScannedWine(row, codeSAQ) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const scannedSheet = ss.getSheetByName("Vins scannés");
    
    if (!scannedSheet) throw new Error("Sheet Vins scannés introuvable");
    
    const scannedData = scannedSheet.getRange(row, 1, 1, 5).getValues()[0];
    const codebarre = scannedData[0].toString().replace(/^'/, '');
    const note = scannedData[1];
    const quantite = parseInt(scannedData[3]) || 1;
    
    const bouteilles = [];
    for (let i = 0; i < quantite; i++) {
      bouteilles.push({ meuble: "", rangee: "", espace: "" });
    }
    
    const result = ajouterVinAvecBouteilles(codebarre, codeSAQ, note, bouteilles);
    
    if (!result.success) throw new Error(result.message || "Erreur lors de l'ajout du vin");
    
    scannedSheet.deleteRow(row);
    return { success: true };
  } catch (e) {
    Logger.log("Erreur completeScannedWine: " + e.message);
    throw e;
  }
}

function ajouterVinAvecBouteilles(codebarre, codesaq, note, bouteilles, nomManuel) {
  try {
    Logger.log("PARAMS: " + codebarre + " | " + codesaq + " | " + note + " | " + bouteilles + " | " + nomManuel);
    bouteilles = JSON.parse(bouteilles);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(VINO_SHEET);

    if (!sheet) {
      createVinoSheet();
      sheet = ss.getSheetByName(VINO_SHEET);
    }

    let saqData = {};
    if (codesaq) {
      const saqResult = testScrapingSAQ(codesaq);
      if (saqResult.success) {
        saqData = saqResult.data;
      }
    }

    if (codesaq) {
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        const rowSAQ = values[i][REF_COLS.CODE_SAQ] ? values[i][REF_COLS.CODE_SAQ].toString().trim() : "";
        if (rowSAQ && rowSAQ === codesaq.toString().trim()) {
          const sheetRow = i + 1;
          const slot = findFreeBottleSlot(values[i]);
          if (slot === -1) {
            return { success: false, message: "Maximum de 5 bouteilles atteint pour ce vin" };
          }
          const b0 = (bouteilles && bouteilles[0]) ? bouteilles[0] : { meuble: "", rangee: "", espace: "" };
          const statutExist = (b0.meuble && b0.rangee && b0.espace) ? "En stock" : "A ranger";
          sheet.getRange(sheetRow, bottleCol(slot, B_MEUBLE)).setValue(b0.meuble || "");
          sheet.getRange(sheetRow, bottleCol(slot, B_RANGEE)).setValue(b0.rangee || "");
          sheet.getRange(sheetRow, bottleCol(slot, B_ESPACE)).setValue(b0.espace || "");
          sheet.getRange(sheetRow, bottleCol(slot, B_STATUT)).setValue(statutExist);
          sheet.getRange(sheetRow, bottleCol(slot, B_DATE_AJOUT)).setValue(new Date());

          const cupActuel = values[i][REF_COLS.CODE_CUP] ? values[i][REF_COLS.CODE_CUP].toString().replace(/^'/, '') : "";
          const listeCUP = cupActuel.split(',').map(function(c) { return c.trim(); }).filter(function(c) { return c; });
          if (codebarre && listeCUP.indexOf(codebarre.toString().trim()) === -1) {
            listeCUP.push(codebarre.toString().trim());
            sheet.getRange(sheetRow, REF_COLS.CODE_CUP + 1).setValue("'" + listeCUP.join(','));
          }
          return { success: true, message: "Bouteille ajoutee au vin existant" };
        }
      }
    }

    const newRow = new Array(TOTAL_COLS).fill("");

    newRow[REF_COLS.CODE_CUP] = "'" + codebarre;
    newRow[REF_COLS.CODE_SAQ] = codesaq || "";
    newRow[REF_COLS.NOM] = saqData.nom || nomManuel || "";
    newRow[REF_COLS.PRIX] = saqData.prix || "";
    newRow[REF_COLS.COULEUR] = saqData.couleur || "";
    newRow[REF_COLS.CEPAGES] = saqData.cepages || "";
    newRow[REF_COLS.PAYS] = saqData.pays || "";
    newRow[REF_COLS.REGION] = saqData.region || "";
    newRow[REF_COLS.APPELLATION] = saqData.appellation || "";
    newRow[REF_COLS.DESIGNATION] = saqData.designation || "";
    newRow[REF_COLS.CLASSIFICATION] = saqData.classification || "";
    newRow[REF_COLS.FORMAT] = saqData.format || "";
    newRow[REF_COLS.ALCOOL] = saqData.alcool || "";
    newRow[REF_COLS.SUCRE] = saqData.sucre || "";
    newRow[REF_COLS.PARTICULARITE] = saqData.particularite || "";
    newRow[REF_COLS.PRODUCTEUR] = saqData.producteur || "";
    newRow[REF_COLS.AGENT_PROMO] = saqData.agentPromotionnel || "";
    newRow[REF_COLS.MILLESIME] = saqData.millesimeDeguste || "";
    newRow[REF_COLS.AROMES] = saqData.aromes || "";
    newRow[REF_COLS.ACIDITE] = saqData.acidite || "";
    newRow[REF_COLS.SUCROSITE] = saqData.sucrosite || "";
    newRow[REF_COLS.CORPS] = saqData.corps || "";
    newRow[REF_COLS.BOUCHE] = saqData.bouche || "";
    newRow[REF_COLS.TEMPERATURE] = saqData.temperature || "";
    newRow[REF_COLS.DESCRIPTION] = saqData.description || "";
    newRow[REF_COLS.PASTILLE_GOUT] = saqData.pastilleGout || "";
    newRow[REF_COLS.PHOTO_URL] = saqData.photoURL || "";
    newRow[REF_COLS.DATE_AJOUT_REF] = new Date();
    newRow[REF_COLS.MODIFIE] = "Non";
    newRow[REF_COLS.AIME] = "Oui";
    newRow[REF_COLS.NOTES_TEMP] = note || "";

    for (let i = 0; i < bouteilles.length && i < MAX_BOTTLES; i++) {
      const b = bouteilles[i];
      const bottleNum = i + 1;
      const statut = (b.meuble && b.rangee && b.espace) ? "En stock" : "A ranger";
      newRow[bottleColIndex(bottleNum, B_MEUBLE)] = b.meuble || "";
      newRow[bottleColIndex(bottleNum, B_RANGEE)] = b.rangee || "";
      newRow[bottleColIndex(bottleNum, B_ESPACE)] = b.espace || "";
      newRow[bottleColIndex(bottleNum, B_STATUT)] = statut;
      newRow[bottleColIndex(bottleNum, B_DATE_AJOUT)] = new Date();
    }

    sheet.appendRow(newRow);

    return { success: true, message: "Vin et bouteilles ajoutes" };
  } catch(e) {
    Logger.log("Erreur ajouterVinAvecBouteilles: " + e.message);
    return { success: false, message: e.message };
  }
}









/* ============================================================
   DISPONIBILITÉ SAQ (VERSION ACTIVE)
=============================================================== */

function getSuccursales() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName("CONFIG");
    if (!configSheet) return [];
    const values = configSheet.getDataRange().getValues();
    const succursales = [];
    for (let i = 1; i < values.length; i++) {
      const nom = values[i][8] ? values[i][8].toString().trim() : "";
      const numero = values[i][9] ? values[i][9].toString().trim() : "";
      if (nom && numero) succursales.push({ nom: nom, numero: numero });
    }
    return succursales;
  } catch (e) {
    Logger.log("Erreur getSuccursales: " + e.message);
    return [];
  }
}

function getToutesSuccursales() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName("CONFIG");
    if (!configSheet) return [];
    const values = configSheet.getDataRange().getValues();
    const succursales = [];
    for (let i = 1; i < values.length; i++) {
      const ville = values[i][10] ? values[i][10].toString().trim() : "";
      const numero = values[i][11] ? values[i][11].toString().trim() : "";
      const adresse = values[i][12] ? values[i][12].toString().trim() : "";
      const codePostal = values[i][13] ? values[i][13].toString().trim() : "";
      if (ville && numero) succursales.push({ ville: ville, numero: numero, adresse: adresse, codePostal: codePostal });
    }
    return succursales.sort(function(a, b) { return a.ville.localeCompare(b.ville); });
  } catch (e) {
    Logger.log("Erreur getToutesSuccursales: " + e.message);
    return [];
  }
}



function ajouterSuccursale(nom, numero) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("CONFIG");
    if (!sheet) return { success: false };
    const values = sheet.getDataRange().getValues();
    let ligneVide = -1;
    for (let i = 1; i < values.length; i++) {
      if (!values[i][8] && !values[i][9]) { ligneVide = i + 1; break; }
    }
    if (ligneVide === -1) ligneVide = values.length + 1;
    sheet.getRange(ligneVide, 9).setValue(nom);
    sheet.getRange(ligneVide, 10).setValue(numero);
    return { success: true };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function verifierDisponibiliteSAQ(codeSAQ, numeroSuccursale) {
  try {
    if (!codeSAQ || !numeroSuccursale) return { disponible: false, message: "Code SAQ ou succursale manquant" };
    
    const url = `https://www.saq.com/fr/produits?q=${codeSAQ}&store_products=${numeroSuccursale}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    const htmlContent = response.getContentText();
    
    if (response.getResponseCode() !== 200) return { disponible: false, message: "Erreur HTTP " + response.getResponseCode() };
    
    if (htmlContent.includes("Votre recherche n'a renvoyé aucun résultat")) {
      return { disponible: false, message: "Non disponible" };
    } else if (htmlContent.includes("résultat")) {
      return { disponible: true, message: "En succursale" };
    } else if (htmlContent.includes("Épuisé")) {
      return { disponible: false, message: "Épuisé" };
    } else {
      return { disponible: false, message: "Statut inconnu" };
    }
    
  } catch (e) {
    Logger.log("Erreur verifierDisponibiliteSAQ: " + e.message);
    return { disponible: false, message: "Erreur: " + e.message };
  }
}

/* ============================================================
   FONCTIONS UTILITAIRES HTML
=============================================================== */

function extractFromMeta(html, property) {
  try {
    const regex = new RegExp('<meta\\s+property="' + property + '"\\s+content="([^"]*)"', 'i');
    const match = html.match(regex);
    return (match && match[1]) ? cleanHTML(match[1]) : "";
  } catch (e) { return ""; }
}

function extractDetailInfo(html, label) {
  try {
    const escapedLabel = label.replace(/'/g, "\\'");
    const regex = new RegExp('<span[^>]*>\\s*' + escapedLabel + '\\s*</span>\\s*<strong[^>]*>([\\s\\S]*?)</strong>', 'i');
    const match = html.match(regex);
    return (match && match[1]) ? cleanHTML(match[1]) : "";
  } catch (e) { return ""; }
}

function extractTastingInfo(html, label) {
  try {
    const escapedLabel = label.replace(/'/g, "\\'");
    const regex = new RegExp('<span[^>]*>' + escapedLabel + '</span>\\s*<strong[^>]*>([^<]*)</strong>', 'i');
    const match = html.match(regex);
    return (match && match[1]) ? cleanHTML(match[1]) : "";
  } catch (e) { return ""; }
}

function extractDescription(html) {
  try {
    const regex = /<div class="wrapper-content-info">\s*([\s\S]*?)\s*<\/div>/i;
    const match = html.match(regex);
    return (match && match[1]) ? cleanHTML(match[1]) : "";
  } catch (e) { return ""; }
}

function cleanCepages(text) {
  return text.replace(/\s*\d+\s*%/g, '').replace(/,\s+/g, ', ').trim();
}

function cleanHTML(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x20;/g, ' ')
    .replace(/&#xF4;/g, 'ô')
    .replace(/&#xE9;/g, 'é')
    .replace(/&#xE8;/g, 'è')
    .replace(/&#xEA;/g, 'ê')
    .replace(/&#x27;/g, "'")
    .replace(/&#x3A;/g, ':')
    .replace(/&#xE0;/g, 'à')
    .replace(/&#xFB;/g, 'û')
    .replace(/&#x3C;/g, '<')
    .replace(/&#x3E;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function saveWineEdits(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    const values = sheet.getDataRange().getValues();
    const target = data.codebarre.toString().trim();

    for (let i = 1; i < values.length; i++) {
      const rowCUP = values[i][REF_COLS.CODE_CUP] ? values[i][REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
      const listeCUP = rowCUP.split(',').map(function(c) { return c.trim(); });
      if (listeCUP.indexOf(target) !== -1) {
        const r = i + 1;
        if (data.nom) sheet.getRange(r, REF_COLS.NOM + 1).setValue(data.nom);
        if (data.codesaq !== undefined) sheet.getRange(r, REF_COLS.CODE_SAQ + 1).setValue(data.codesaq);
        if (data.couleur) sheet.getRange(r, REF_COLS.COULEUR + 1).setValue(data.couleur);
        if (data.pastille) sheet.getRange(r, REF_COLS.PASTILLE_GOUT + 1).setValue(data.pastille);
        if (data.aromes) sheet.getRange(r, REF_COLS.AROMES + 1).setValue(data.aromes);
        if (data.particularite) sheet.getRange(r, REF_COLS.PARTICULARITE + 1).setValue(data.particularite);
        if (data.designation) sheet.getRange(r, REF_COLS.DESIGNATION + 1).setValue(data.designation);
        if (data.classification) sheet.getRange(r, REF_COLS.CLASSIFICATION + 1).setValue(data.classification);
        if (data.producteur) sheet.getRange(r, REF_COLS.PRODUCTEUR + 1).setValue(data.producteur);
        if (data.agent) sheet.getRange(r, REF_COLS.AGENT_PROMO + 1).setValue(data.agent);
       if (data.prix) sheet.getRange(r, REF_COLS.PRIX + 1).setValue(parseFloat(data.prix));
        if (data.pays) sheet.getRange(r, REF_COLS.PAYS + 1).setValue(data.pays);
        if (data.region) sheet.getRange(r, REF_COLS.REGION + 1).setValue(data.region);
        if (data.appellation) sheet.getRange(r, REF_COLS.APPELLATION + 1).setValue(data.appellation);
        if (data.cepage) sheet.getRange(r, REF_COLS.CEPAGES + 1).setValue(data.cepage);
        if (data.acidite) sheet.getRange(r, REF_COLS.ACIDITE + 1).setValue(data.acidite);
        if (data.sucrosite) sheet.getRange(r, REF_COLS.SUCROSITE + 1).setValue(data.sucrosite);
        if (data.corps) sheet.getRange(r, REF_COLS.CORPS + 1).setValue(data.corps);
        if (data.bouche) sheet.getRange(r, REF_COLS.BOUCHE + 1).setValue(data.bouche);
        if (data.sucre) sheet.getRange(r, REF_COLS.SUCRE + 1).setValue(data.sucre);
        if (data.alcool) sheet.getRange(r, REF_COLS.ALCOOL + 1).setValue(data.alcool);
        if (data.temperature) sheet.getRange(r, REF_COLS.TEMPERATURE + 1).setValue(data.temperature);
        if (data.description) sheet.getRange(r, REF_COLS.DESCRIPTION + 1).setValue(data.description);
        sheet.getRange(r, REF_COLS.AIME + 1).setValue(data.aime || 'Oui');
       sheet.getRange(r, REF_COLS.RECETTES + 1).setValue(data.recettes || '');
        sheet.getRange(r, REF_COLS.NOTES_TEMP + 1).setValue(data.notestemp || '');
        sheet.getRange(r, REF_COLS.DIVERS + 1).setValue(data.divers || '');
        sheet.getRange(r, REF_COLS.MODIFIE + 1).setValue('Oui');
        return { success: true };
      }
    }
    return { success: false, message: 'Vin non trouvé' };
  } catch(e) {
    Logger.log("Erreur saveWineEdits: " + e.message);
    return { success: false, message: e.message };
  }
}

function saveFiche() {
  const cb = CURRENT_WINE_CODEBARRE;
  if (!cb) return;

  const aimeOui = document.getElementById('edit-aime-oui');
  const aime = aimeOui && aimeOui.getAttribute('data-selected') === 'true' ? 'Oui' : 'Non';

  const updatedData = {
    codebarre: cb,
    nom: document.getElementById('edit-nom').value,
    codesaq: document.getElementById('edit-codesaq').value,
    couleur: document.getElementById('edit-couleur').value,
    prix: document.getElementById('edit-prix').value,
    pays: document.getElementById('edit-pays').value,
    region: document.getElementById('edit-region').value,
    appellation: document.getElementById('edit-appellation').value,
    cepage: document.getElementById('edit-cepage').value,
    acidite: document.getElementById('edit-acidite').value,
    sucrosite: document.getElementById('edit-sucrosite').value,
    corps: document.getElementById('edit-corps').value,
    bouche: document.getElementById('edit-bouche').value,
    sucre: document.getElementById('edit-sucre').value,
    alcool: document.getElementById('edit-alcool').value,
    temperature: document.getElementById('edit-temperature').value,
    pastille: document.getElementById('edit-pastille').value,
    aromes: document.getElementById('edit-aromes').value,
    particularite: document.getElementById('edit-particularite').value,
    designation: document.getElementById('edit-designation').value,
    classification: document.getElementById('edit-classification').value,
    description: document.getElementById('edit-description').value,
    producteur: document.getElementById('edit-producteur').value,
    agent: document.getElementById('edit-agent').value,
    aime: aime,
    recettes: document.getElementById('edit-recettes').value,
    notestemp: document.getElementById('edit-notes-temp').value,
    divers: document.getElementById('edit-divers').value
  };

  google.script.run
    .withSuccessHandler(function() {
      afficherMessage('Modifications sauvegardées !');
      fermerEditFiche();
      ouvrirFicheVin(cb);
    })
    .withFailureHandler(function(err) {
      afficherMessage('Erreur: ' + err);
    })
    .saveWineEdits(updatedData);
}

function supprimerBouteille(row, bottle) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    const b = bottle || 1;

    sheet.getRange(row, bottleCol(b, B_MEUBLE)).clearContent();
    sheet.getRange(row, bottleCol(b, B_RANGEE)).clearContent();
    sheet.getRange(row, bottleCol(b, B_ESPACE)).clearContent();
    sheet.getRange(row, bottleCol(b, B_STATUT)).clearContent();
    sheet.getRange(row, bottleCol(b, B_DATE_AJOUT)).clearContent();
    sheet.getRange(row, bottleCol(b, B_DATE_SORTIE)).clearContent();

    return { success: true };
  } catch(e) {
    Logger.log("Erreur supprimerBouteille: " + e.message);
    return { success: false, message: e.message };
  }
}

function getRenderUrl() {
  return 'https://recherchesaq.onrender.com/verifier-batch';
}

/* ============================================================
   EN ATTENTE — VÉRIFICATION DISPO SAQ EN SUCCURSALE
   Ces fonctions n'ont jamais fonctionné de façon fiable.
   Conservées ici pour référence future.
=============================================================== */

/*

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🍷 SAQ')
    .addItem('Test Disponibilité', 'ouvrirTestDispo')
    .addItem('Vérifier disponibilité', 'ouvrirVerificateur')
    .addSeparator()
    .addItem('1️⃣ Copier pour vérification', 'copierPourVerif')
    .addItem('2️⃣ Coller les résultats', 'collerResultats')
    .addToUi();
}

function ouvrirTestDispo() {
  const html = HtmlService.createHtmlOutputFromFile('TestDispo').setWidth(600).setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Test Disponibilité SAQ');
}

function ouvrirVerificateur() {
  const html = HtmlService.createHtmlOutputFromFile('VerifSAQ').setWidth(600).setHeight(400);
  return html;
}

function copierPourVerif() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dispo');
  if (!sheet) { SpreadsheetApp.getUi().alert('⚠️ Onglet "Dispo" introuvable'); return; }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { SpreadsheetApp.getUi().alert('⚠️ Aucune donnée à copier'); return; }
  const data = sheet.getRange('A2:B' + lastRow).getValues();
  const texte = data.filter(row => row[0] && row[1]).map(row => row[0].toString().trim() + ',' + row[1].toString().trim()).join('|');
  if (!texte) { SpreadsheetApp.getUi().alert('⚠️ Aucune donnée valide trouvée'); return; }
  const html = HtmlService.createHtmlOutput(`<style>body{font-family:Arial;padding:20px;}textarea{width:100%;height:200px;}button{padding:10px 20px;background:#4285f4;color:white;border:none;cursor:pointer;margin-top:10px;}</style><h3>📋 Données à copier</h3><textarea id="data" readonly>${texte}</textarea><button onclick="document.getElementById('data').select();document.execCommand('copy');document.getElementById('msg').innerHTML='✅ Copié!'">Copier</button><p id="msg"></p>`).setWidth(500).setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, '🍷 Copier pour vérification SAQ');
}

function collerResultats() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Coller les résultats', 'Colle les résultats ici (format: ✅|❌|✅):', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const resultats = response.getResponseText().split('|');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dispo');
  if (!sheet) { ui.alert('⚠️ Onglet "Dispo" introuvable'); return; }
  for (let i = 0; i < resultats.length; i++) { sheet.getRange(i + 2, 3).setValue(resultats[i].trim()); }
  ui.alert('✅ Résultats collés en colonne C!');
}

function chercherProduitSuccursale() {
  const codeProduit = '12135092';
  const codeSuccursale = '33505';
  const url = `https://www.saq.com/fr/produits?q=${codeProduit}&store_products=${codeSuccursale}`;
  const response = UrlFetchApp.fetch(url, {'headers': {'User-Agent': 'Mozilla/5.0'}});
  const html = response.getContentText();
  const trouve = html.includes(codeProduit);
  Logger.log('Produit ' + codeProduit + ' trouvé à succursale ' + codeSuccursale + ': ' + trouve);
  return trouve;
}

function verifierDispoSAQ(codeProduit, codeSuccursale) {
  try {
    const urlProduit = 'https://www.saq.com/fr/' + codeProduit;
    const response = UrlFetchApp.fetch(urlProduit, {'headers': {'User-Agent': 'Mozilla/5.0'}, 'muteHttpExceptions': true});
    const html = response.getContentText();
    const match = html.match(/product\/id\/(\d+)/);
    if (!match) return {success: false, message: '❌ Produit non trouvé'};
    const idInterne = match[1];
    let loaded = 0;
    let trouve = false;
    while (!trouve) {
      const url = 'https://www.saq.com/fr/store/locator/ajaxlist/context/product/id/' + idInterne + '?loaded=' + loaded + '&fastly_geolocate=1&latitude=45.96&longitude=-73.21&_=' + Date.now();
      const responseAPI = UrlFetchApp.fetch(url, {'headers': {'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest', 'Referer': urlProduit}, 'muteHttpExceptions': true});
      const data = JSON.parse(responseAPI.getContentText());
      for (var i = 0; i < data.list.length; i++) { if (data.list[i].identifier === codeSuccursale) { trouve = true; break; } }
      if (trouve || data.is_last_page) break;
      loaded += 10;
      Utilities.sleep(300);
    }
    return {success: trouve};
  } catch(e) { return {success: false, message: '❌ Erreur: ' + e.toString()}; }
}

function VERIF_SAQ(codeProduit, codeSuccursale) {
  if (!codeProduit || !codeSuccursale) return '⚠️ Codes manquants';
  codeProduit = codeProduit.toString().trim();
  codeSuccursale = codeSuccursale.toString().trim();
  try {
    const urlProduit = 'https://www.saq.com/fr/' + codeProduit;
    const responseProduit = UrlFetchApp.fetch(urlProduit, {'headers': {'User-Agent': 'Mozilla/5.0'}, 'muteHttpExceptions': true});
    const htmlProduit = responseProduit.getContentText();
    const match = htmlProduit.match(/"productId":"(\d+)"/);
    if (!match) return '❌ Produit introuvable';
    const idInterne = match[1];
    let loaded = 0;
    let maxPages = 15;
    let pageCount = 0;
    while (pageCount < maxPages) {
      const urlAPI = 'https://www.saq.com/fr/store/locator/ajaxlist/context/product/id/' + idInterne + '?loaded=' + loaded + '&fastly_geolocate=1&latitude=45.96&longitude=-73.21&_=' + Date.now();
      const responseAPI = UrlFetchApp.fetch(urlAPI, {'headers': {'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest', 'Referer': urlProduit}, 'muteHttpExceptions': true});
      if (responseAPI.getResponseCode() !== 200) return '❌ Erreur API';
      const data = JSON.parse(responseAPI.getContentText());
      for (var i = 0; i < data.list.length; i++) { if (data.list[i].identifier === codeSuccursale) return '✅'; }
      if (data.is_last_page) return '❌';
      loaded += 10;
      pageCount++;
      Utilities.sleep(1000);
    }
    return '❌';
  } catch(e) { return '⚠️ Erreur: ' + e.message; }
}

function updatePastilleEtPhotoExistants() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    if (!sheet) return;
    const values = sheet.getDataRange().getValues();
    let compteur = 0;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const codeSAQ = row[REF_COLS.CODE_SAQ] ? row[REF_COLS.CODE_SAQ].toString().trim() : "";
      const pastilleActuelle = row[REF_COLS.PASTILLE_GOUT] ? row[REF_COLS.PASTILLE_GOUT].toString().trim() : "";
      const photoActuelle = row[REF_COLS.PHOTO_URL] ? row[REF_COLS.PHOTO_URL].toString().trim() : "";
      if (!codeSAQ) continue;
      if (pastilleActuelle && photoActuelle) continue;
      const saqResult = testScrapingSAQ(codeSAQ);
      if (saqResult.success) {
        const saqData = saqResult.data;
        if (!pastilleActuelle && saqData.pastilleGout) sheet.getRange(i + 1, REF_COLS.PASTILLE_GOUT + 1).setValue(saqData.pastilleGout);
        if (!photoActuelle && saqData.photoURL) sheet.getRange(i + 1, REF_COLS.PHOTO_URL + 1).setValue(saqData.photoURL);
        compteur++;
        Utilities.sleep(500);
      }
    }
    Logger.log("TERMINÉ - " + compteur + " vins mis à jour");
  } catch (e) { Logger.log("Erreur updatePastilleEtPhotoExistants: " + e.message); }
}

function testVerifDispo() {
  const result = verifierDisponibiliteSAQ("14199495", "23037");
  Logger.log(JSON.stringify(result));
}

function TESTER_DISPO() {
  const result = verifierDispoSAQ('12135092', '23053');
  Logger.log('Résultat: ' + JSON.stringify(result));
  return result;
}

*/





// ============================================
// GRAPHQL SAQ - TEST FINAL 19 FÉV 2026
// ============================================

function chercherProduitSAQ_GRAPHQL_V1(codeBarres) {
  const url = 'https://catalog-service.adobe.io/graphql';
  
  const query = {
    query: `
      query productSearch($phrase: String!, $pageSize: Int, $currentPage: Int) {
        productSearch(phrase: $phrase, page_size: $pageSize, current_page: $currentPage) {
          items {
            product {
              sku
              name
            }
          }
        }
      }
    `,
    variables: {
      phrase: codeBarres.toString().padStart(14, '0'),
      pageSize: 1,
      currentPage: 1
    }
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': PropertiesService.getScriptProperties().getProperty('SAQ_API_KEY'),
  'magento-environment-id': PropertiesService.getScriptProperties().getProperty('SAQ_ENV_ID'),
      'magento-store-view-code': 'fr',
      'magento-website-code': 'base',
      'magento-store-code': 'main_website_store'
    },
    payload: JSON.stringify(query),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const texte = response.getContentText();
    
    Logger.log('Status: ' + response.getResponseCode());
    Logger.log('Réponse (500 chars): ' + texte.substring(0, 500));
    
    const data = JSON.parse(texte);
    
    if (data.data?.productSearch?.items?.length > 0) {
      const sku = data.data.productSearch.items[0].product.sku;
      // Vérifier que le produit trouvé correspond bien au code-barres scanné (via Code CUP)
      const verif = testScrapingSAQ(sku);
      if (verif.success && verif.data && verif.data.codeCUP) {
        const cupTrouve = verif.data.codeCUP.toString().replace(/\D/g, '').replace(/^0+/, '');
        const cupCherche = codeBarres.toString().replace(/\D/g, '').replace(/^0+/, '');
        if (cupCherche && cupTrouve && cupTrouve !== cupCherche) {
          return null;
        }
      }
      return sku;
    }
    
    return null;
  } catch(e) {
    Logger.log('Erreur: ' + e.toString());
    return null;
  }
}


function TEST_GRAPHQL_FINAL() {
  Logger.log('=== TEST GRAPHQL SAQ - 19 FÉV 2026 ===');
  const result = chercherProduitSAQ_GRAPHQL_V1('08423110755530');
  Logger.log('Code-barres: 08423110755530');
  Logger.log('SKU retourné: ' + result);
  Logger.log('=== FIN TEST ===');
  return result;
}

// ============================================
// FIN GRAPHQL SAQ - TEST FINAL 19 FÉV 2026
// ============================================


// ============================================
// VÉRIFICATION DISPO - GRAPHQL - 19 FÉV 2026
// ============================================


function TEST_DISPO_GRAPHQL() {
  Logger.log('=== TEST DISPO GRAPHQL - 19 FÉV 2026 ===');
  
  // Test 1: Produit qu'on sait dispo
  const test1 = verifierDispoSAQ_GRAPHQL_V1('12135092', '23359');
  Logger.log('Test 1 - 12135092 @ 23359: ' + (test1 ? '✅ DISPO' : '❌ PAS DISPO'));
  
  // Test 2: Produit pas dispo
  const test2 = verifierDispoSAQ_GRAPHQL_V1('12135092', '23053');
  Logger.log('Test 2 - 12135092 @ 23053: ' + (test2 ? '✅ DISPO' : '❌ PAS DISPO'));
  
  Logger.log('=== FIN TEST ===');
}

// ============================================
// FIN VÉRIFICATION DISPO - 19 FÉV 2026
// ============================================




function TEST_DISPO_UNE_SUCCURSALE() {
  const codeSAQ = '12135092';      // un vin que tu sais disponible
  const succursale = '23359';       // ta succursale
  const result = verifierDispoSAQ_GRAPHQL_V1(codeSAQ, succursale);
  Logger.log('Résultat: ' + (result ? '✅ DISPO' : '❌ PAS DISPO'));
}


// ============================================
// LISTE SUCCURSALES DISPONIBLES - 20 FÉV 2026
// ============================================

function getSuccursalesDisponibles(codeSAQ, latitude, longitude) {
  try {
    const urlProduit = `https://www.saq.com/fr/${codeSAQ}`;
    const response = UrlFetchApp.fetch(urlProduit, {
      'headers': {'User-Agent': 'Mozilla/5.0'},
      'muteHttpExceptions': true
    });
    
    const html = response.getContentText();
    const match = html.match(/"productId":"(\d+)"/);
    
    if (!match) {
      Logger.log('Produit non trouvé');
      return [];
    }
    
    const idInterne = match[1];
    const succursales = [];
    let loaded = 0;
    let continuer = true;
    
    // Utiliser les coordonnées fournies ou Lanoraie par défaut
    const lat = latitude || 45.9697;
    const lng = longitude || -73.2219;
    
    while (continuer) {
      const urlAPI = `https://www.saq.com/fr/store/locator/ajaxlist/context/product/id/${idInterne}?loaded=${loaded}&fastly_geolocate=1&latitude=${lat}&longitude=${lng}&_=${Date.now()}`;
      
      const responseAPI = UrlFetchApp.fetch(urlAPI, {
        'headers': {
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': urlProduit
        },
        'muteHttpExceptions': true
      });
      
      const data = JSON.parse(responseAPI.getContentText());
      
      data.list.forEach(function(store) {
        succursales.push({
          numero: store.identifier,
          nom: store.name,
          distance: store.distance,
          adresse: store.address1,
          ville: store.city,
          quantite: store.qty || 0
        });
      });
      
      if (data.is_last_page) {
        continuer = false;
      }
      
      loaded += 10;
      Utilities.sleep(300);
    }
    
    Logger.log(`Total: ${succursales.length} succursales`);
    return succursales;
    
  } catch(e) {
    Logger.log('Erreur: ' + e.toString());
    return [];
  }
}

function TEST_AVEC_COORDONNEES() {
  Logger.log('=== TEST AVEC COORDONNÉES BERTHIERVILLE ===');
  // Coordonnées de Berthierville
  const result = getSuccursalesDisponibles('12135092', 46.0808, -73.1827);
  
  for (let i = 0; i < Math.min(5, result.length); i++) {
    const s = result[i];
    Logger.log(`${s.nom} - ${s.distance} - ${s.quantite} btl - ${s.ville}`);
  }
  
  Logger.log(`Total: ${result.length} succursales`);
  Logger.log('=== FIN TEST ===');
}
// ============================================
// FIN LISTE SUCCURSALES - 20 FÉV 2026
// ============================================

function verifierDispoSAQ_GRAPHQL_V1(codeSAQ, codeSuccursale) {
  const url = 'https://catalog-service.adobe.io/graphql';
  
  const query = {
    query: `
      query productSearch($phrase: String!, $filter: [SearchClauseInput!]) {
        productSearch(phrase: $phrase, page_size: 1, filter: $filter) {
          total_count
          items {
            product {
              sku
              name
            }
          }
        }
      }
    `,
    variables: {
      phrase: codeSAQ.toString(),
      filter: [
        { attribute: "store_availability_list", eq: codeSuccursale.toString() }
      ]
    }
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': PropertiesService.getScriptProperties().getProperty('SAQ_API_KEY'),
  'magento-environment-id': PropertiesService.getScriptProperties().getProperty('SAQ_ENV_ID'),
      'magento-store-view-code': 'fr',
      'magento-website-code': 'base',
      'magento-store-code': 'main_website_store'
    },
    payload: JSON.stringify(query),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.data?.productSearch?.total_count > 0) {
      // Produit disponible, maintenant récupérer la quantité via l'autre API
      const urlProduit = `https://www.saq.com/fr/${codeSAQ}`;
      const responseProduit = UrlFetchApp.fetch(urlProduit, {
        'headers': {'User-Agent': 'Mozilla/5.0'},
        'muteHttpExceptions': true
      });
      
      const html = responseProduit.getContentText();
      const match = html.match(/"productId":"(\d+)"/);
      
      if (!match) {
        return { disponible: true, quantite: null };
      }
      
      const idInterne = match[1];
      
      // Chercher dans les succursales
      const urlAPI = `https://www.saq.com/fr/store/locator/ajaxlist/context/product/id/${idInterne}?loaded=0&fastly_geolocate=1&latitude=46.0808&longitude=-73.1827&_=${Date.now()}`;
      
      const responseAPI = UrlFetchApp.fetch(urlAPI, {
        'headers': {
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': urlProduit
        },
        'muteHttpExceptions': true
      });
      
      const apiData = JSON.parse(responseAPI.getContentText());
      
      // Trouver la succursale
      for (let i = 0; i < apiData.list.length; i++) {
        if (apiData.list[i].identifier === codeSuccursale.toString()) {
          return { 
            disponible: true, 
            quantite: apiData.list[i].qty || 0 
          };
        }
      }
      
      // Si on arrive ici, GraphQL dit dispo mais on trouve pas la quantité
      return { disponible: true, quantite: null };
    }
    
    return { disponible: false, quantite: 0 };
    
  } catch(e) {
    Logger.log('Erreur: ' + e.toString());
    return { disponible: false, quantite: 0 };
  }
}

function TEST_DISPO_AVEC_QTY() {
  Logger.log('=== TEST DISPO AVEC QUANTITÉ ===');
  
  const test1 = verifierDispoSAQ_GRAPHQL_V1('12135092', '23196');
  Logger.log('Test 1 - 12135092 @ Sorel (23196): ' + JSON.stringify(test1));
  
  const test2 = verifierDispoSAQ_GRAPHQL_V1('12135092', '23053');
  Logger.log('Test 2 - 12135092 @ Berthierville (23053): ' + JSON.stringify(test2));
  
  Logger.log('=== FIN TEST ===');
}


// ============================================
// PROMOTIONS SAQ - 21 FÉV 2026
// ============================================

// ============================================
// TOUTES LES PROMOTIONS SAQ - 21 FÉV 2026
// ============================================

function getToutesPromotionsSAQ(mesCodesSAQ) {
  const url = 'https://catalog-service.adobe.io/graphql';
  
  const query = {
    query: `
      query productSearch($phrase: String!, $pageSize: Int, $filter: [SearchClauseInput!]) {
        productSearch(phrase: $phrase, page_size: $pageSize, filter: $filter) {
          total_count
          items {
            product {
              sku
              name
              price_range {
                minimum_price {
                  regular_price {
                    value
                    currency
                  }
                  final_price {
                    value
                    currency
                  }
                  discount {
                    percent_off
                    amount_off
                  }
                }
              }
            }
            productView {
              attributes {
                name
                value
              }
            }
          }
        }
      }
    `,
    variables: {
      phrase: "",
      pageSize: 200,
      filter: [
        { attribute: "categoryPath", eq: "promotions/vin" },
       { attribute: "availability_front", in: ["En succursale"] },
        { attribute: "visibility", in: ["Catalog", "Catalog, Search"] }
      ]
    }
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': PropertiesService.getScriptProperties().getProperty('SAQ_API_KEY'),
  'magento-environment-id': PropertiesService.getScriptProperties().getProperty('SAQ_ENV_ID'),
      'magento-store-view-code': 'fr',
      'magento-website-code': 'base',
      'magento-store-code': 'main_website_store'
    },
    payload: JSON.stringify(query),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (!data.data?.productSearch?.items) {
      return [];
    }
    
    const tousLesPromos = data.data.productSearch.items;
    const autresPromos = [];
    
    // Créer Set de MES codes pour exclusion
    const mesCodes = new Set((mesCodesSAQ || []).map(function(code) {
      return code.toString().trim().replace(/^'/, '');
    }));
    
    tousLesPromos.forEach(function(item) {
      const sku = item.product.sku.toString();
      
      // Si ce n'est PAS un de mes vins
      if (!mesCodes.has(sku)) {
        const priceData = item.product.price_range.minimum_price;
        const prixReg = priceData.regular_price.value;
        const prixFinal = priceData.final_price.value;
        const rabais = prixReg - prixFinal;
        
        // Extraire couleur et pays des attributs
        let couleur = '';
        let pays = '';
      let cepage = '';
        if (item.productView?.attributes) {
          item.productView.attributes.forEach(function(attr) {
            if (attr.name === 'couleur') couleur = attr.value;
            if (attr.name === 'pays') pays = attr.value;
            if (attr.name === 'cepage') cepage = attr.value;
          });
        }
        
       if (prixFinal <= 30) {
          let pointsBonis = 0;
          try {
            const promoUrl = `https://www.saq.com/fr/inspire/product/promotions/sku/${sku}/`;
            const promoResponse = UrlFetchApp.fetch(promoUrl, {
              'headers': {'User-Agent': 'Mozilla/5.0'},
              'muteHttpExceptions': true
            });
            if (promoResponse.getResponseCode() === 200) {
              let promoData = JSON.parse(promoResponse.getContentText());
              if (typeof promoData === 'string') promoData = JSON.parse(promoData);
              if (Array.isArray(promoData)) {
                promoData.forEach(function(promo) {
                  if (promo.type === 'BONUS_POINTS') pointsBonis = promo.value || 0;
                });
              }
            }
          } catch(e) {}
          autresPromos.push({
            codeSAQ: sku,
            nom: item.product.name,
            prixRegulier: prixReg,
            prixFinal: prixFinal,
            rabais: rabais,
            couleur: couleur,
           pays: pays,
            cepage: cepage,
            pointsBonis: pointsBonis
          });
          Utilities.sleep(200);
        }
      }
    });



    Logger.log(`Trouvé ${autresPromos.length} autres vins en promotion`);
    return autresPromos;
    
  } catch(e) {
    Logger.log('Erreur: ' + e.toString());
    return [];
  }
}

function TEST_TOUTES_PROMOS() {
  Logger.log('=== TEST TOUTES LES PROMOS ===');
  
  // Mes codes (à exclure)
  const mesCodes = ['14954139', '10270881'];
  
  const promos = getToutesPromotionsSAQ(mesCodes);
  
  Logger.log(`Total autres vins en promo: ${promos.length}`);
  Logger.log('---');
  Logger.log('Premiers 5:');
  
  for (let i = 0; i < Math.min(5, promos.length); i++) {
    const p = promos[i];
    Logger.log(`${p.nom} (${p.codeSAQ})`);
    Logger.log(`  ${p.prixRegulier}$ → ${p.prixFinal}$ (rabais ${p.rabais}$)`);
    Logger.log(`  ${p.couleur} - ${p.pays}`);
    Logger.log('---');
  }
  
  Logger.log('=== FIN TEST ===');
}

// ============================================
// FIN TOUTES LES PROMOTIONS - 21 FÉV 2026
// ============================================


function getPromotionsSAQ(listeCodesSAQ) {
  const url = 'https://catalog-service.adobe.io/graphql';
  
  const query = {
    query: `
      query productSearch($phrase: String!, $pageSize: Int, $filter: [SearchClauseInput!]) {
        productSearch(phrase: $phrase, page_size: $pageSize, filter: $filter) {
          total_count
          items {
            product {
              sku
              name
              price_range {
                minimum_price {
                  regular_price {
                    value
                    currency
                  }
                  final_price {
                    value
                    currency
                  }
                  discount {
                    percent_off
                    amount_off
                  }
                }
              }
            }
          }
        }
      }
    `,
    variables: {
      phrase: "",
      pageSize: 100,
      filter: [
        { attribute: "categoryPath", eq: "promotions/vin" },
        { attribute: "availability_front", in: ["En succursale", "En ligne"] },
        { attribute: "visibility", in: ["Catalog", "Catalog, Search"] }
      ]
    }
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': PropertiesService.getScriptProperties().getProperty('SAQ_API_KEY'),
  'magento-environment-id': PropertiesService.getScriptProperties().getProperty('SAQ_ENV_ID'),
      'magento-store-view-code': 'fr',
      'magento-website-code': 'base',
      'magento-store-code': 'main_website_store'
    },
    payload: JSON.stringify(query),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (!data.data?.productSearch?.items) {
      return [];
    }
    
    const tousLesPromos = data.data.productSearch.items;
    const mesPromos = [];
    
    const mesCodes = new Set(listeCodesSAQ.map(function(code) {
      return code.toString().trim().replace(/^'/, '');
    }));
    
    tousLesPromos.forEach(function(item) {
      const sku = item.product.sku.toString();
      
      if (mesCodes.has(sku)) {
        const priceData = item.product.price_range.minimum_price;
        const prixReg = priceData.regular_price.value;
        const prixFinal = priceData.final_price.value;
        const rabais = prixReg - prixFinal;
        
        let pointsBonis = 0;
        try {
          const promoUrl = `https://www.saq.com/fr/inspire/product/promotions/sku/${sku}/`;
          const promoResponse = UrlFetchApp.fetch(promoUrl, { 
            'headers': {'User-Agent': 'Mozilla/5.0'},
            'muteHttpExceptions': true 
          });
          
          if (promoResponse.getResponseCode() === 200) {
            const promoText = promoResponse.getContentText();
            let promoData = JSON.parse(promoText);
            
            // Si c'est encore un string, parser une 2e fois
            if (typeof promoData === 'string') {
              promoData = JSON.parse(promoData);
            }
            
            if (Array.isArray(promoData)) {
              promoData.forEach(function(promo) {
                if (promo.type === 'BONUS_POINTS') {
                  pointsBonis = promo.value || 0;
                }
              });
            }
          }
        } catch(e) {
          // Ignorer erreurs points bonis
        }
        
        mesPromos.push({
          codeSAQ: sku,
          nom: item.product.name,
          prixRegulier: prixReg,
          prixFinal: prixFinal,
          rabais: rabais,
          pointsBonis: pointsBonis
        });
        
        Utilities.sleep(200);
      }
    });
    
    Logger.log(`Trouvé ${mesPromos.length} de vos vins en promotion`);
    return mesPromos;
    
  } catch(e) {
    Logger.log('Erreur: ' + e.toString());
    return [];
  }
}

function TEST_PROMOTIONS_SIMPLE() {
  Logger.log('=== TEST PROMO SIMPLE ===');
  
  const mesCodes = ['14954139'];
  const promos = getPromotionsSAQ(mesCodes);
  
  if (promos.length > 0) {
    const p = promos[0];
    Logger.log(`${p.nom} (${p.codeSAQ})`);
    Logger.log(`Prix: ${p.prixRegulier}$ → ${p.prixFinal}$ (rabais ${p.rabais}$)`);
    Logger.log(`Points bonis: ${p.pointsBonis}`);
  } else {
    Logger.log('Aucune promo trouvée');
  }
  
  Logger.log('=== FIN TEST ===');
}
// ============================================
// FIN PROMOTIONS SAQ - 21 FÉV 2026
// ============================================


// ============================================
// VÉRIFICATION PRIX SAQ - 21 FÉV 2026
// ============================================

function verifierEtMettreAJourPrixSAQ(codebarre, codeSAQ) {
  try {
   // 1. Récupérer le prix via la page produit (URL directe = bon produit garanti)
    const scrap = testScrapingSAQ(codeSAQ);
    if (!scrap.success || !scrap.data || !scrap.data.prix) {
      return { updated: false, message: 'Prix SAQ introuvable' };
    }
    const prixSAQ = parseFloat(scrap.data.prix);
    if (isNaN(prixSAQ) || prixSAQ <= 0) {
      return { updated: false, message: 'Prix SAQ invalide' };
    }
    
    // 2. Lire prix actuel dans Sheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(VINO_SHEET);
    const values = sheet.getDataRange().getValues();
    
    const codebarreClean = codebarre.toString().trim().replace(/^'/, '');
    
    for (let i = 1; i < values.length; i++) {
      const rowCUP = values[i][REF_COLS.CODE_CUP] ? values[i][REF_COLS.CODE_CUP].toString().trim().replace(/^'/, '') : "";
      const listeCUP = rowCUP.split(',').map(function(c) { return c.trim(); });
      
      if (listeCUP.indexOf(codebarreClean) !== -1) {
        const prixVino = parseFloat(values[i][REF_COLS.PRIX]) || 0;
        
        // 3. Comparer
        if (Math.abs(prixSAQ - prixVino) > 0.01) {
          // Prix différent - Mettre à jour
        sheet.getRange(i + 1, REF_COLS.PRIX + 1).setValue(parseFloat(prixSAQ));
          
          return {
            updated: true,
            ancienPrix: prixVino,
            nouveauPrix: prixSAQ,
            message: `Prix modifié de ${prixVino.toFixed(2)}$ à ${prixSAQ.toFixed(2)}$`
          };
        } else {
          // Prix identique - Ne rien faire
          return { updated: false };
        }
      }
    }
    
    return { updated: false, message: 'Vin non trouvé dans Vino' };
    
  } catch(e) {
    Logger.log('Erreur vérification prix: ' + e.toString());
    return { updated: false, message: 'Erreur: ' + e.toString() };
  }
}

function TEST_VERIF_PRIX() {
  Logger.log('=== TEST VÉRIFICATION PRIX ===');
  
  // Remplace par un vrai code-barres de ton Sheet
  const result = verifierEtMettreAJourPrixSAQ('3765551980160', '14954139');
  
  Logger.log('Résultat: ' + JSON.stringify(result));
  
  Logger.log('=== FIN TEST ===');
}

// ============================================
// FIN VÉRIFICATION PRIX - 21 FÉV 2026
// ============================================


function sauvegarderSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nom = 'Dionysos_Backup_' + Utilities.formatDate(new Date(), 'America/Toronto', 'yyyy-MM-dd');
  const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  const token = ScriptApp.getOAuthToken();
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const blob = response.getBlob().setName(nom + '.xlsx');
  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    'Dionysos — Backup ' + Utilities.formatDate(new Date(), 'America/Toronto', 'yyyy-MM-dd'),
    'Backup quotidien de ta cave à vin en pièce jointe.',
    { attachments: [blob] }
  );
  Logger.log('Backup envoyé : ' + nom);
}

function creerDeclencheurSauvegarde() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sauvegarderSheet') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('sauvegarderSheet')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  Logger.log('Déclencheur créé!');
}
function getCodeBarresFromCodeSAQ(codeSAQ) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Vino');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().trim() === codeSAQ.toString().trim()) {
      return data[i][0].toString().trim();
    }
  }
  return null;
}

function importerToutesSuccursalesSAQ() {
  try {
    const toutes = {};
    let loaded = 0;
    let continuer = true;

    while (continuer) {
      const url = `https://www.saq.com/fr/store/locator/ajaxlist?loaded=${loaded}&_=${Date.now()}`;
      const response = UrlFetchApp.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest'
        },
        muteHttpExceptions: true
      });

      const data = JSON.parse(response.getContentText());
      
      data.list.forEach(function(store) {
        if (!toutes[store.identifier]) {
          toutes[store.identifier] = {
            ville: store.city || '',
            numero: store.identifier || '',
            adresse: store.address1 || '',
            codePostal: store.zip || ''
          };
        }
      });

      continuer = !data.is_last_page;
      loaded += 10;
      Utilities.sleep(200);
    }

    // Écrire dans Config colonnes K-N
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const config = ss.getSheetByName('CONFIG');
    const liste = Object.values(toutes).sort(function(a, b) {
      return a.ville.localeCompare(b.ville);
    });

    const lastRow = config.getLastRow();
    if (lastRow > 1) {
      config.getRange(2, 11, lastRow - 1, 4).clearContent();
    }

    const rows = liste.map(function(s) {
      return [s.ville, s.numero, s.adresse, s.codePostal];
    });

    if (rows.length > 0) {
      config.getRange(2, 11, rows.length, 4).setValues(rows);
    }

    Logger.log('Total succursales importées: ' + liste.length);
    return liste.length;

  } catch(e) {
    Logger.log('Erreur: ' + e.toString());
    return 0;
  }
}


function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const data = params.data || {};

    let result;

    switch(action) {
      case 'getInventoryData':     result = getInventoryData(); break;
      case 'getConfig':            result = getConfig(); break;
      case 'getWineBottles':       result = getWineBottles(data.codebarre); break;
      case 'checkWineExists':      result = checkWineExists(data.codebarre); break;
      case 'checkLocationAvailable': result = checkLocationAvailable(data.meuble, data.rangee, data.espace); break;
      case 'addBottle':            result = addBottle(data); break;
      case 'actionBouteille':      result = actionBouteille(data.row, data.action, data); break;
      case 'saveWineEdits':        result = saveWineEdits(data); break;
      case 'updateWineField':      result = updateWineField(data.codebarre, data.field, data.value); break;
      case 'supprimerBouteille':   result = supprimerBouteille(data.row, data.bottle); break;
      case 'mettreBotteilleARanger': result = mettreBotteilleARanger(data.row, data.bottle); break;
      case 'getHistorique':        result = getHistorique(); break;
      case 'getSuccursales':       result = getSuccursales(); break;
      case 'getToutesSuccursales': result = getToutesSuccursales(); break;
      case 'ajouterSuccursale':    result = ajouterSuccursale(data.nom, data.numero); break;
      case 'getSuccursalesDisponibles': result = getSuccursalesDisponibles(data.codeSAQ, data.lat, data.lng); break;
      case 'verifierDispoSAQ_GRAPHQL_V1': result = verifierDispoSAQ_GRAPHQL_V1(data.codeSAQ, data.succursale); break;
      case 'getPromotionsSAQ':     result = getPromotionsSAQ(data.codesSAQ); break;
      case 'getToutesPromotionsSAQ': result = getToutesPromotionsSAQ(data.codesSAQ); break;
      case 'getCodeBarresFromCodeSAQ': result = getCodeBarresFromCodeSAQ(data.codeSAQ); break;
      case 'ajouterVinAvecBouteilles': result = ajouterVinAvecBouteilles(data.codebarre, data.codeSAQ, data.note, data.bouteilles, data.nom); break;
      case 'chercherProduitSAQ_GRAPHQL_V1': result = chercherProduitSAQ_GRAPHQL_V1(data.codebarre); break;
      case 'verifierEtMettreAJourPrixSAQ': result = verifierEtMettreAJourPrixSAQ(data.codebarre, data.codeSAQ); break;
      case 'getScannedWinesIncomplete': result = getScannedWinesIncomplete(); break;
      case 'completeScannedWine':  result = completeScannedWine(data.row, data.codesaq); break;
      default: result = { error: 'Action inconnue: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, result: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(e) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: e.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}







