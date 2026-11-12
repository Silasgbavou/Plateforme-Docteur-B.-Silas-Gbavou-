#!/usr/bin/env python3
"""Contrôle automatique : chaque nom, contact, titre et citation affiché dans le film existe à l'identique dans le PDF.
Usage : python3 tools/verify_texts.py <OUVRAGE_SOURCE_INTEGRAL.pdf>   (code de sortie 1 en cas d'écart)"""
import sys, re, os, unicodedata
import pymupdf
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
norm = lambda s: re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', s).replace('­', '').replace('‐', '-').replace('’', "'"))
doc = pymupdf.open(sys.argv[1])
page = lambda n: norm(doc[n - 1].get_text())
js = {f: norm(open(os.path.join(root, 'film', 'js', f)).read()) for f in ('film_a.js', 'film_b.js', 'film_c.js')}
bad = 0
def check(label, text, pages, files):
    global bad
    okp = all(norm(text).lower() in page(p).lower() for p in pages); okf = all(norm(text) in js[f] for f in files)
    print(('OK   ' if okp and okf else 'ECART'), label, '| PDF p.', pages, okp, '| film', okf); bad += not (okp and okf)
for c in ['Docteur B. Silas Gbavou', 'Pasteur M. Appolos Gbavou', '+229 01 67 96 00 94', '+229 01 96 79 96 70', 'silasgbavou@gmail.com', 'appolosgbavou@gmail.com']:
    check('contact ' + c, c, [3, 452], ['film_c.js'])
check('notice Silas', 'Homme de Dieu, enseignant de la Parole, auteur, éditeur et scribe prophétique', [452], ['film_c.js'])
check('notice Appolos', "uteur et écrivain d'ouvrages chrétiens pour l'édification du royaume de Dieu sur la terre", [452], ['film_c.js'])
check('mention', 'ENSEIGNEMENT · DOCTRINE · INITIATION PROPHÉTIQUE', [452], ['film_a.js'])
check('présentation', "n ouvrage spirituel, doctrinal et d'initiation prophétique, développé en quinze chapitres", [452], ['film_a.js'])
check('verset (1)', 'Rendez grâces au Père, qui vous a rendus capables', [16, 19, 452], ['film_a.js'])
check('verset (2)', "d'avoir part à l'héritage des saints dans la lumière", [16, 19, 452], ['film_a.js'])
toc = [(l, norm(t), p) for l, t, p in doc.get_toc()]
n = 0
for l, t, p in toc:
    m = re.match(r'CHAPITRE (\d+) — (.*)', t)
    if m: s = f'{m.group(1)} · {m.group(2)}'; ok = s in js['film_b.js']; n += ok; bad += not ok; print('OK   ' if ok else 'ECART', 'chapitre', s)
    m = re.match(r'PARTIE (\d) — (.*)', t)
    if m: ok = m.group(2) in js['film_b.js']; n += ok; bad += not ok; print('OK   ' if ok else 'ECART', 'partie', t)
for cap, p in [('Les deux dimensions du ciel ouvertes par la croix', 30), ("La capacité d'avoir part à l'héritage des saints", 35), ("Le désert, chemin vers l'héritage", 68), ('Pour voir, pourvoir, pouvoir', 142), ('Le royaume prophétique parmi les cieux', 302)]:
    check('légende', cap, [p], ['film_b.js'])
ok = '« Que la lumière soit ! »' in js['film_b.js'] and any('Que la lumière soit' in t and p == 287 for l, t, p in toc); bad += not ok
print('OK   ' if ok else 'ECART', 'légende illustration 11 (signet PDF p. 287)')
print(f'\n{n}/19 titres de parties et chapitres conformes ; écarts : {bad}')
sys.exit(1 if bad else 0)
