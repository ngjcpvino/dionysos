// Vérifier une modification de l'app AVANT de la publier (le pendant du banc d'essai du serveur) : joue les mêmes gestes
// (scenarios.js) sur la version de référence (par défaut origin/main) et sur les fichiers tels qu'ils sont, contre le même
// faux serveur, puis compare, étape par étape, l'écran (éléments visibles, textes, boîtes, styles), les appels au serveur et les erreurs.
//   node outils/banc-app/verifier.js            → compare à origin/main
//   node outils/banc-app/verifier.js HEAD~1     → compare à un autre commit
// « IDENTIQUE » = rien ne change à l'écran ni au serveur ; sinon chaque différence est listée (à relire : seules les voulues).
const { execSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const racine = path.resolve(__dirname, '..', '..');
const base = process.argv[2] || 'origin/main';
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-app-'));
const avant = path.join(dossier, 'avant'), apres = path.join(dossier, 'apres');
fs.mkdirSync(avant); fs.mkdirSync(apres);
execSync('git archive ' + base + ' | tar -x -C ' + JSON.stringify(avant), { cwd: racine, shell: '/bin/bash' });
const copier = (de, vers) => {
  if (fs.statSync(de).isDirectory()) { fs.mkdirSync(vers, { recursive: true }); fs.readdirSync(de).forEach(n => copier(path.join(de, n), path.join(vers, n))); }
  else fs.copyFileSync(de, vers);
};
fs.readdirSync(racine).filter(n => /^(index-v2\.html|styles-v2\.css|scripts-.*-v2\.js|sw\.js|images|lecteur)$/.test(n)).forEach(n => copier(path.join(racine, n), path.join(apres, n)));
const jouer = (app, sortie) => execSync('node ' + JSON.stringify(path.join(__dirname, 'jouer.js')) + ' ' + JSON.stringify(app) + ' ' + JSON.stringify(sortie), { stdio: 'inherit' });
jouer(avant, path.join(dossier, 'avant.json'));
jouer(apres, path.join(dossier, 'apres.json'));
const A = JSON.parse(fs.readFileSync(path.join(dossier, 'avant.json'))), B = JSON.parse(fs.readFileSync(path.join(dossier, 'apres.json')));

const compte = (l) => l.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
const seulement = (a, b) => { const mb = compte(b); return a.filter(x => { const n = mb.get(x) || 0; if (n) { mb.set(x, n - 1); return false; } return true; }); };
const court = (l) => l.replace(/ \[[^\]]*\] .*$/, (m) => m.length > 90 ? m.slice(0, 90) + '…' : m);
let ecarts = 0;
const erreursApres = new Set();
B.forEach((sb, i) => {
  const sa = A[i] || { etapes: [] };
  sb.etapes.forEach((eb, j) => {
    const ea = sa.etapes[j] || { ecran: [], appels: [], erreurs: [], erreur: null };
    eb.erreurs.concat(eb.erreur ? ['étape : ' + eb.erreur] : []).forEach(x => erreursApres.add(sb.nom + ' › ' + eb.etape + ' — ' + x));
    const moins = seulement(ea.ecran, eb.ecran), plus = seulement(eb.ecran, ea.ecran);
    const lignes = [];
    if (moins.length || plus.length) lignes.push('    écran : −' + moins.length + ' +' + plus.length,
      ...moins.slice(0, 4).map(x => '      − ' + court(x)), ...plus.slice(0, 4).map(x => '      + ' + court(x)));
    if (JSON.stringify(ea.appels) !== JSON.stringify(eb.appels)) lignes.push('    serveur : ' + JSON.stringify(ea.appels).slice(0, 200) + '\n           → ' + JSON.stringify(eb.appels).slice(0, 200));
    if (JSON.stringify(ea.erreurs) !== JSON.stringify(eb.erreurs) || ea.erreur !== eb.erreur) lignes.push('    erreurs : ' + JSON.stringify(ea.erreurs.concat(ea.erreur || [])) + ' → ' + JSON.stringify(eb.erreurs.concat(eb.erreur || [])));
    if (lignes.length) { ecarts++; console.log('≠ ' + sb.nom + ' › ' + eb.etape + '\n' + lignes.join('\n')); }
  });
});
const n = B.reduce((k, s) => k + s.etapes.length, 0);
console.log(ecarts ? ecarts + ' étape(s) sur ' + n + ' diffèrent — relire : seules les différences voulues doivent rester.' : 'IDENTIQUE (écran, appels au serveur, erreurs) — ' + n + ' étapes');
if (erreursApres.size) console.log('Erreurs dans la version testée (' + erreursApres.size + ') :\n' + [...erreursApres].slice(0, 20).map(x => '  • ' + x).join('\n'));
process.exit(ecarts ? 1 : 0);
