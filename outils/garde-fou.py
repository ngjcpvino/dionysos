#!/usr/bin/env python3
"""Garde-fou de Dionysos — « L'existant gagne toujours sur le neuf » (REFERENCE.md), vérifié par une machine.

Compare le code actuel à la dernière version publiée (origin/main) et ARRÊTE si le neuf copie l'existant :
  1. une nouvelle classe CSS (toujours : on montre les 3 classes existantes les plus proches) ;
  2. une valeur en dur dans le CSS hors de :root (px, em, rem, vh, vw, #couleur, rgb…) ;
  3. un style en dur dans le HTML ou le JS (style="…", .style.x = …), sauf display ;
  4. une fonction nouvelle ou modifiée qui ressemble à une fonction existante (sosie) ;
  5. un bloc de code copié (5 lignes ou plus déjà écrites ailleurs).
Le serveur (dépôt privé dionysos-serveur, les fichiers .gs) : 4 et 5, plus ses portes uniques (le classeur par classeur_(),
le catalogue SAQ par appelAPISAQ) et le verrou (une action de l'app qui écrit dans le classeur est dans ACTIONS_QUI_ECRIVENT_).
Un cas vraiment différent s'inscrit, avec sa raison, dans outils/garde-fou-acceptes.txt (« clé | raison »).

  python3 outils/garde-fou.py            → vérifie ce qui n'est pas encore publié (code 1 s'il y a un sosie)
  python3 outils/garde-fou.py --tout     → inventaire de TOUS les sosies déjà présents (pour le ménage)
  python3 outils/garde-fou.py --base X   → compare à un autre commit
  python3 outils/garde-fou.py --serveur [dossier]  → le serveur (par défaut ../dionysos-serveur), avec --tout ou --base au besoin
  --hook : appelé par Claude Code avant chaque commande (.claude/settings.json) ; ne s'active que sur un « git push »
           (celui du dépôt du serveur vérifie le serveur).
"""
import difflib, json, os, re, subprocess, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACCEPTES = os.path.join(RACINE, 'outils', 'garde-fou-acceptes.txt')
SEUIL_FONCTION = 0.80     # ressemblance entre deux fonctions (0 à 1)
MIN_LIGNES_FONCTION = 6
TAILLE_BLOC = 5           # lignes « utiles » consécutives identiques = bloc copié


# ---------- lecture des fichiers (actuels ou d'un commit), de l'app ou du serveur (depot) ----------
def lire(chemin, base=None, depot=RACINE):
    if base is None:
        p = os.path.join(depot, chemin)
        return open(p, encoding='utf-8').read() if os.path.exists(p) else ''
    r = subprocess.run(['git', 'show', base + ':' + chemin], cwd=depot, capture_output=True, text=True, encoding='utf-8')
    return r.stdout if r.returncode == 0 else ''

def fichiers_js(base=None):
    """Les scripts réellement chargés par la page (liste de index-v2.html)."""
    html = lire('index-v2.html', base)
    return list(dict.fromkeys(re.findall(r"'(scripts-[a-z]+-v2\.js)'", html)))

def fichiers_gs(depot, base=None):
    """Les fichiers du serveur (Apps Script) : les .gs à la racine de son dépôt."""
    if base is None:
        noms = os.listdir(depot)
    else:
        r = subprocess.run(['git', 'ls-tree', '--name-only', base], cwd=depot, capture_output=True, text=True, encoding='utf-8')
        noms = r.stdout.split('\n') if r.returncode == 0 else []
    return sorted(n for n in noms if n.endswith('.gs'))


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

def fonction_a_la_ligne(fonctions, fichier, n):
    """Le nom de la fonction qui contient la ligne n d'un fichier ('?' hors fonction)."""
    return next((fn['nom'] for fn in fonctions if fn['fichier'] == fichier and fn['ligne'] <= n < fn['ligne'] + fn['nb']), '?')

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
    """L'app : son style, sa page et ses scripts."""
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
    # --- JS : fonctions sosies et blocs copiés ---
    constats += sosies_et_blocs(js_actuels, [] if tout else fichiers_js(base), lambda f, b=None: lire(f, b), base, tout)[0]
    return constats


def sosies_et_blocs(fichiers, fichiers_base, lire_f, base, tout, prefixe=''):
    """Fonctions sosies et blocs copiés dans des scripts — ceux de l'app ou ceux du serveur. lire_f(fichier, base=None).
    Rend (constats, fonctions actuelles)."""
    constats = []
    fn_now = [fn for f in fichiers for fn in fonctions_js(lire_f(f), f)]
    fn_base = {} if tout else {fn['nom']: fn['corps'] for f in fichiers_base for fn in fonctions_js(lire_f(f, base), f)}
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
                constats.append((prefixe + 'fonction %s~%s' % paire, 'Fonctions sosies (%d %%) : %s (%s:%d) ~ %s (%s:%d) → une seule fonction, avec un paramètre pour ce qui diffère' %
                                 (round(r * 100), fn['nom'], fn['fichier'], fn['ligne'], autre['nom'], autre['fichier'], autre['ligne'])))
    # --- JS : blocs copiés ---
    fenetres, utiles_par_fichier = {}, {}
    for f in fichiers:
        u = [(n, ligne_utile(l)) for n, l in enumerate(lire_f(f).split('\n'), 1)]
        u = [(n, l) for n, l in u if l]
        utiles_par_fichier[f] = u
        for k in range(len(u) - TAILLE_BLOC + 1):
            fenetres.setdefault(tuple(l for _, l in u[k:k + TAILLE_BLOC]), []).append((f, u[k][0], u[k + TAILLE_BLOC - 1][0]))
    signales = set()
    for f in fichiers:
        now = lire_f(f)
        ajout = None if tout else lignes_ajoutees(lire_f(f, base), now)
        u = utiles_par_fichier[f]
        for k in range(len(u) - TAILLE_BLOC + 1):
            cle = tuple(l for _, l in u[k:k + TAILLE_BLOC])
            ici = (f, u[k][0], u[k + TAILLE_BLOC - 1][0])
            ailleurs = [x for x in fenetres[cle] if x != ici]
            if not ailleurs: continue
            if ajout is not None and not all(n in ajout for n, _ in u[k:k + TAILLE_BLOC]): continue
            dans = fonction_a_la_ligne(fn_now, f, u[k][0])
            cle_c = prefixe + 'bloc %s' % dans
            if cle_c in signales: continue
            signales.add(cle_c)
            x = ailleurs[0]
            constats.append((cle_c, 'Bloc copié — %s:%d-%d (dans %s) = %s:%d-%d → le mettre dans une fonction commune' % (f, ici[1], ici[2], dans, x[0], x[1], x[2])))
    return constats, fn_now


# ---------- le serveur (dépôt privé dionysos-serveur) ----------
# Ses portes uniques (mise-a-jour.md, « Backend — pièges ») : ce motif n'a sa place que dans cette fonction.
PORTES_SERVEUR = [
    (re.compile(r'SpreadsheetApp\.(openById|getActiveSpreadsheet)\s*\('), 'classeur_', "le classeur ne s'ouvre que par classeur_() (onglet_(nom) pour un onglet)"),
    (re.compile(r'catalog-service\.adobe\.io'), 'appelAPISAQ', "le catalogue de la SAQ ne s'appelle que par appelAPISAQ"),
]
ECRITURE_GS = re.compile(r'\.(setValues?|setFormulas?|setNumberFormat|appendRow|insertRow\w*|deleteRows?|insertSheet|deleteSheet|clear\w*)\s*\(')

def actions_sans_verrou(fichiers, lire_f, base=None):
    """Les actions de l'app (executerAction_) qui écrivent dans le classeur, elles-mêmes ou par une fonction qu'elles appellent,
    sans être dans ACTIONS_QUI_ECRIVENT_ : { action: fonction }."""
    textes = [lire_f(f, base) for f in fichiers]
    corps = {}
    for f, t in zip(fichiers, textes):
        for fn in fonctions_js(t, f):
            c = re.sub(r'/\*.*?\*/', '', fn['corps'], flags=re.S)
            corps[fn['nom']] = '\n'.join(sans_commentaires(l) for l in c.split('\n'))
    appels = {n: (set(re.findall(r'(?<![\w$.])([\w$]+)\s*\(', c)) & set(corps)) - {n} for n, c in corps.items()}
    ecrit = {n for n, c in corps.items() if ECRITURE_GS.search(c)}
    while True:
        plus = {n for n in corps if n not in ecrit and appels[n] & ecrit}
        if not plus: break
        ecrit |= plus
    m = re.search(r'ACTIONS_QUI_ECRIVENT_\s*=\s*\[(.*?)\]', '\n'.join(textes), re.S)
    liste = set(re.findall(r"'([\w$]+)'", m.group(1))) if m else set()
    cases = re.findall(r"case\s+'([\w$]+)'\s*:\s*return\s+([\w$]+)\s*\(", corps.get('executerAction_', ''))
    return {a: f for a, f in cases if f in ecrit and a not in liste}

def verifier_serveur(depot, base, tout=False):
    lire_f = lambda f, b=None: lire(f, b, depot)
    fichiers = fichiers_gs(depot)
    fichiers_base = [] if tout else fichiers_gs(depot, base)
    constats, fn_now = sosies_et_blocs(fichiers, fichiers_base, lire_f, base, tout, 'serveur ')
    for f in fichiers:
        now = lire_f(f)
        ajout = None if tout else lignes_ajoutees(lire_f(f, base), now)
        for n, l in enumerate(now.split('\n'), 1):
            if ajout is not None and n not in ajout: continue
            for motif, seule, regle in PORTES_SERVEUR:
                dans = fonction_a_la_ligne(fn_now, f, n)
                if motif.search(sans_commentaires(l)) and dans != seule:
                    constats.append(('serveur porte %s dans %s' % (seule, dans), 'Porte unique contournée — %s:%d (dans %s) : %s' % (f, n, dans, regle)))
    sans = actions_sans_verrou(fichiers, lire_f)
    avant = {} if tout else actions_sans_verrou(fichiers_base, lire_f, base)
    for a in sorted(set(sans) - set(avant)):
        constats.append(('serveur verrou ' + a, "Action qui écrit sans verrou — « %s » (%s) écrit dans le classeur : l'ajouter à ACTIONS_QUI_ECRIVENT_" % (a, sans[a])))
    return constats

def depot_serveur(commande='', cwd=''):
    """Le dossier du dépôt du serveur : nommé dans la commande, ou celui où elle tourne, sinon à côté de l'app."""
    for c in re.findall(r'[^\s"\';&|]*dionysos-serveur', commande) + [cwd[:cwd.find('dionysos-serveur') + 16] if 'dionysos-serveur' in cwd else '']:
        p = os.path.abspath(os.path.join(cwd or RACINE, os.path.expanduser(c))) if c else ''
        if p and os.path.isdir(os.path.join(p, '.git')): return p
    p = os.path.join(os.path.dirname(RACINE), 'dionysos-serveur')
    return p if os.path.isdir(os.path.join(p, '.git')) else None


def main():
    for f in (sys.stdin, sys.stdout, sys.stderr): f.reconfigure(encoding='utf-8')   # Windows : sinon les accents et « → » plantent
    args = sys.argv[1:]
    serveur = None
    if '--serveur' in args:
        i = args.index('--serveur')
        dossier = args[i + 1] if i + 1 < len(args) and not args[i + 1].startswith('--') else ''
        serveur = depot_serveur(dossier, os.getcwd()) if dossier else depot_serveur()
        if not serveur:
            print('Garde-fou : dépôt du serveur introuvable' + (' (' + dossier + ')' if dossier else ' (../dionysos-serveur)'))
            return 1
    if '--hook' in args:
        try: entree = json.load(sys.stdin)
        except Exception: entree = {}
        commande = ((entree.get('tool_input') or {}).get('command') or '')
        if not re.search(r'\bgit\s+push\b', commande): return 0
        cwd = entree.get('cwd') or ''
        if 'dionysos-serveur' in commande + cwd:   # un « git push » du dépôt du serveur : c'est le serveur qu'on vérifie
            serveur = depot_serveur(commande, cwd)
            if not serveur:
                print('Garde-fou : dépôt du serveur introuvable, rien vérifié.', file=sys.stderr)
                return 0
    tout = '--tout' in args
    base = args[args.index('--base') + 1] if '--base' in args else 'origin/main'
    acceptes = charger_acceptes()
    constats = verifier_serveur(serveur, base, tout) if serveur else verifier(base, tout)
    qui = 'Garde-fou (serveur)' if serveur else 'Garde-fou'
    restants = [(k, t) for k, t in constats if k not in acceptes]
    sortie = sys.stderr if '--hook' in args else sys.stdout
    if not restants:
        print(qui + ' : rien à signaler.' + (' (%d cas acceptés)' % (len(constats) - len(restants)) if len(constats) != len(restants) else ''), file=sortie)
        return 0
    print(qui + ' : %d sosie(s) ou copie(s) — %s' % (len(restants), 'inventaire complet' if tout else 'publication BLOQUÉE'), file=sortie)
    for k, t in restants:
        print('  • ' + t + '\n    [clé : ' + k + ']', file=sortie)
    if not tout:
        print("Réutiliser l'existant. Si c'est vraiment différent : l'expliquer à l'utilisateur, puis inscrire « clé | raison » dans outils/garde-fou-acceptes.txt.", file=sortie)
    return 2 if '--hook' in args else 1


if __name__ == '__main__':
    sys.exit(main())
