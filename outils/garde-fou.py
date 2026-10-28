#!/usr/bin/env python3
"""Garde-fou de Dionysos — « L'existant gagne toujours sur le neuf » (REFERENCE.md), vérifié par une machine.

Compare le code actuel à la dernière version publiée (origin/main) et ARRÊTE si le neuf copie l'existant :
  1. une nouvelle classe CSS (toujours : on montre les 3 classes existantes les plus proches) ;
  2. une valeur en dur dans le CSS hors de :root (px, em, rem, vh, vw, #couleur, rgb…) ;
  3. un style en dur dans le HTML ou le JS (style="…", .style.x = …), sauf display ;
  4. une fonction nouvelle ou modifiée qui ressemble à une fonction existante (sosie) ;
  5. un bloc de code copié (5 lignes ou plus déjà écrites ailleurs).
Un cas vraiment différent s'inscrit, avec sa raison, dans outils/garde-fou-acceptes.txt (« clé | raison »).

  python3 outils/garde-fou.py            → vérifie ce qui n'est pas encore publié (code 1 s'il y a un sosie)
  python3 outils/garde-fou.py --tout     → inventaire de TOUS les sosies déjà présents (pour le ménage)
  python3 outils/garde-fou.py --base X   → compare à un autre commit
  --hook : appelé par Claude Code avant chaque commande (.claude/settings.json) ; ne s'active que sur un « git push ».
"""
import difflib, json, os, re, subprocess, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACCEPTES = os.path.join(RACINE, 'outils', 'garde-fou-acceptes.txt')
SEUIL_FONCTION = 0.80     # ressemblance entre deux fonctions (0 à 1)
MIN_LIGNES_FONCTION = 6
TAILLE_BLOC = 5           # lignes « utiles » consécutives identiques = bloc copié


# ---------- lecture des fichiers (actuels ou d'un commit) ----------
def lire(chemin, base=None):
    if base is None:
        p = os.path.join(RACINE, chemin)
        return open(p, encoding='utf-8').read() if os.path.exists(p) else ''
    r = subprocess.run(['git', 'show', base + ':' + chemin], cwd=RACINE, capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else ''

def fichiers_js(base=None):
    """Les scripts réellement chargés par la page (liste de index-v2.html)."""
    html = lire('index-v2.html', base)
    return list(dict.fromkeys(re.findall(r"'(scripts-[a-z]+-v2\.js)'", html)))


# ---------- CSS ----------
def regles_css(texte):
    texte = re.sub(r'/\*.*?\*/', '', texte, flags=re.S)
    regles = []
    for m in re.finditer(r'([^{}@]+)\{([^{}]*)\}', texte):
        sel = ' '.join(m.group(1).split())
        decl = {}
        for d in m.group(2).split(';'):
            if ':' in d:
                k, v = d.split(':', 1)
                decl[k.strip()] = ' '.join(v.split())
        regles.append((sel, decl, texte.count('\n', 0, m.start()) + 1))
    return regles

def classes_de(sel):
    return set(re.findall(r'\.([A-Za-z][\w-]*)', sel))

def proximite(a, b):
    """Ressemblance de deux déclarations : même propriété et même valeur = 1, même propriété = 0,5."""
    cles = set(a) | set(b)
    if not cles: return 0
    return sum(1 if (k in a and k in b and a[k] == b[k]) else 0.5 if (k in a and k in b) else 0 for k in cles) / len(cles)

VALEUR_EN_DUR = re.compile(r'(?<![\w-])(\d*\.?\d+)(px|em|rem|vh|vw)\b|#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(')

def valeurs_en_dur(decl):
    out = []
    for k, v in decl.items():
        if k.startswith('--'): continue
        sans_var = re.sub(r'var\([^)]*\)', '', v)
        for m in VALEUR_EN_DUR.finditer(sans_var):
            if m.group(1) is not None and float(m.group(1)) == 0: continue
            out.append(k + ': ' + v)
            break
    return out


# ---------- JS ----------
def fonctions_js(texte, fichier):
    """Fonctions de premier niveau (le style du dépôt : « function x() { » … « } » en colonne 0)."""
    lignes = texte.split('\n')
    out, i = [], 0
    while i < len(lignes):
        m = re.match(r'(?:async\s+)?function\s+([\w$]+)\s*\(', lignes[i])
        if m:
            j = i   # une fonction d'une ligne se ferme sur sa ligne ; sinon, sur le prochain « } » en colonne 0
            if not (lignes[i].count('{') and lignes[i].count('{') == lignes[i].count('}')):
                j = i + 1
                while j < len(lignes) and not lignes[j].startswith('}'): j += 1
            corps = '\n'.join(lignes[i:j + 1])
            out.append({'nom': m.group(1), 'fichier': fichier, 'ligne': i + 1, 'corps': corps, 'nb': j - i + 1})
            i = j + 1
        else:
            i += 1
    return out

def sans_commentaires(ligne):
    return re.sub(r'(?<![:\'"\\/])//.*$', '', ligne)

def jetons(corps):
    corps = re.sub(r'/\*.*?\*/', '', corps, flags=re.S)
    corps = '\n'.join(sans_commentaires(l) for l in corps.split('\n'))
    return re.findall(r'[\w$]+|[^\s\w$]', corps)

def ressemblance(a, b):
    if min(len(a), len(b)) / max(len(a), len(b), 1) < 0.6: return 0
    s = difflib.SequenceMatcher(None, a, b, autojunk=False)
    if s.real_quick_ratio() < SEUIL_FONCTION or s.quick_ratio() < SEUIL_FONCTION: return 0
    return s.ratio()

def ligne_utile(l):
    l = ' '.join(sans_commentaires(l).split())
    if len(l) < 12 or re.fullmatch(r'[\s{}()\[\];,.]*', l): return None
    if l.startswith(('/*', '*', '//')): return None
    return l


# ---------- lignes ajoutées depuis la base ----------
def lignes_ajoutees(avant, apres):
    a, b = avant.split('\n'), apres.split('\n')
    out = set()
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op in ('replace', 'insert'): out.update(range(j1 + 1, j2 + 1))
    return out


def charger_acceptes():
    acc = {}
    if os.path.exists(ACCEPTES):
        for l in open(ACCEPTES, encoding='utf-8'):
            l = l.strip()
            if l and not l.startswith('#') and '|' in l:
                k, r = l.split('|', 1)
                acc[k.strip()] = r.strip()
    return acc


def verifier(base, tout=False):
    constats = []   # (clé, texte)
    js_actuels = fichiers_js()
    # --- CSS ---
    css_now, css_base = lire('styles-v2.css'), ('' if tout else lire('styles-v2.css', base))
    r_now, r_base = regles_css(css_now), regles_css(css_base)
    classes_base = set().union(*[classes_de(s) for s, _, _ in r_base]) if r_base else set()
    vues_base = {(s, json.dumps(d, sort_keys=True)) for s, d, _ in r_base}
    if not tout:
        for c in sorted(set().union(*[classes_de(s) for s, _, _ in r_now]) - classes_base):
            decl = {}
            for s, d, _ in r_now:
                if c in classes_de(s): decl.update(d)
            proches = sorted(((proximite(decl, d), s) for s, d, _ in r_base if d), reverse=True)[:3]   # seulement ce qui existait déjà
            constats.append(('classe .' + c, 'Nouvelle classe CSS .' + c + ' — les plus proches qui existent : ' +
                             ', '.join('%s (%d %%)' % (s, round(p * 100)) for p, s in proches)))
    for s, d, ligne in r_now:
        if s.startswith(':root') or (not tout and (s, json.dumps(d, sort_keys=True)) in vues_base): continue
        for v in valeurs_en_dur(d):
            constats.append(('valeur ' + s + ' ' + v.split(':')[0], 'Valeur en dur hors de :root — styles-v2.css:%d %s { %s } → un jeton :root nommé par sa valeur' % (ligne, s, v)))
    if tout:
        for i in range(len(r_now)):
            for j in range(i + 1, len(r_now)):
                (s1, d1, l1), (s2, d2, l2) = r_now[i], r_now[j]
                if len(d1) >= 3 and len(d2) >= 3 and s1 != s2 and proximite(d1, d2) >= 0.75:
                    constats.append(('css ' + s1 + '~' + s2, 'CSS presque pareil (%d %%) : %s (l.%d) ~ %s (l.%d)' % (round(proximite(d1, d2) * 100), s1, l1, s2, l2)))
    # --- styles en dur dans le HTML et le JS ---
    for f in ['index-v2.html'] + js_actuels:
        now = lire(f)
        ajout = set(range(1, now.count('\n') + 2)) if tout else lignes_ajoutees(lire(f, base), now)
        for n, l in enumerate(now.split('\n'), 1):
            if n not in ajout: continue
            for m in re.finditer(r'style=\\?["\']([^"\'\\]*)', l):
                props = [p.split(':')[0].strip() for p in m.group(1).split(';') if p.strip()]
                if any(p != 'display' for p in props):
                    constats.append(('style %s:%d' % (f, n), 'Style en dur — %s:%d %s → une classe (existante si possible)' % (f, n, m.group(0)[:80])))
            for m in re.finditer(r'\.style\.(\w+)\s*=(?!=)', l):
                if m.group(1) != 'display':
                    constats.append(('style %s:%d' % (f, n), 'Style en dur dans le JS — %s:%d .style.%s → une classe' % (f, n, m.group(1))))
    # --- JS : fonctions sosies ---
    fn_now = [fn for f in js_actuels for fn in fonctions_js(lire(f), f)]
    fn_base = {} if tout else {fn['nom']: fn['corps'] for f in fichiers_js(base) for fn in fonctions_js(lire(f, base), f)}
    for fn in fn_now: fn['jetons'] = jetons(fn['corps'])
    a_verifier = [fn for fn in fn_now if fn['nb'] >= MIN_LIGNES_FONCTION and (tout or fn_base.get(fn['nom']) != fn['corps'])]
    vus = set()
    for fn in a_verifier:
        for autre in fn_now:
            if autre is fn or autre['nb'] < MIN_LIGNES_FONCTION: continue
            paire = tuple(sorted((fn['nom'], autre['nom'])))
            if paire in vus: continue
            r = ressemblance(fn['jetons'], autre['jetons'])
            if r >= SEUIL_FONCTION:
                vus.add(paire)
                constats.append(('fonction %s~%s' % paire, 'Fonctions sosies (%d %%) : %s (%s:%d) ~ %s (%s:%d) → une seule fonction, avec un paramètre pour ce qui diffère' %
                                 (round(r * 100), fn['nom'], fn['fichier'], fn['ligne'], autre['nom'], autre['fichier'], autre['ligne'])))
    # --- JS : blocs copiés ---
    fenetres, utiles_par_fichier = {}, {}
    for f in js_actuels:
        u = [(n, ligne_utile(l)) for n, l in enumerate(lire(f).split('\n'), 1)]
        u = [(n, l) for n, l in u if l]
        utiles_par_fichier[f] = u
        for k in range(len(u) - TAILLE_BLOC + 1):
            fenetres.setdefault(tuple(l for _, l in u[k:k + TAILLE_BLOC]), []).append((f, u[k][0], u[k + TAILLE_BLOC - 1][0]))
    signales = set()
    for f in js_actuels:
        now = lire(f)
        ajout = None if tout else lignes_ajoutees(lire(f, base), now)
        u = utiles_par_fichier[f]
        for k in range(len(u) - TAILLE_BLOC + 1):
            cle = tuple(l for _, l in u[k:k + TAILLE_BLOC])
            ici = (f, u[k][0], u[k + TAILLE_BLOC - 1][0])
            ailleurs = [x for x in fenetres[cle] if x != ici]
            if not ailleurs: continue
            if ajout is not None and not all(n in ajout for n, _ in u[k:k + TAILLE_BLOC]): continue
            dans = next((fn['nom'] for fn in fn_now if fn['fichier'] == f and fn['ligne'] <= u[k][0] < fn['ligne'] + fn['nb']), '?')
            cle_c = 'bloc %s' % dans
            if cle_c in signales: continue
            signales.add(cle_c)
            x = ailleurs[0]
            constats.append((cle_c, 'Bloc copié — %s:%d-%d (dans %s) = %s:%d-%d → le mettre dans une fonction commune' % (f, ici[1], ici[2], dans, x[0], x[1], x[2])))
    return constats


def main():
    args = sys.argv[1:]
    if '--hook' in args:
        try: entree = json.load(sys.stdin)
        except Exception: entree = {}
        commande = ((entree.get('tool_input') or {}).get('command') or '')
        if not re.search(r'\bgit\s+push\b', commande): return 0
        if 'dionysos-serveur' in commande + (entree.get('cwd') or ''): return 0   # le dépôt du serveur n'est pas concerné
    tout = '--tout' in args
    base = args[args.index('--base') + 1] if '--base' in args else 'origin/main'
    acceptes = charger_acceptes()
    constats = verifier(base, tout)
    restants = [(k, t) for k, t in constats if k not in acceptes]
    sortie = sys.stderr if '--hook' in args else sys.stdout
    if not restants:
        print('Garde-fou : rien à signaler.' + (' (%d cas acceptés)' % (len(constats) - len(restants)) if len(constats) != len(restants) else ''), file=sortie)
        return 0
    print('Garde-fou : %d sosie(s) ou copie(s) — %s' % (len(restants), 'inventaire complet' if tout else 'publication BLOQUÉE'), file=sortie)
    for k, t in restants:
        print('  • ' + t + '\n    [clé : ' + k + ']', file=sortie)
    if not tout:
        print("Réutiliser l'existant. Si c'est vraiment différent : l'expliquer à l'utilisateur, puis inscrire « clé | raison » dans outils/garde-fou-acceptes.txt.", file=sortie)
    return 2 if '--hook' in args else 1


if __name__ == '__main__':
    sys.exit(main())
