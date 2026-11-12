#!/usr/bin/env python3
"""Extraction des assets éditoriaux authentiques depuis le PDF source et les portraits fournis.
Usage : python3 tools/extract_assets.py <OUVRAGE_SOURCE_INTEGRAL.pdf> <dossier 02_REFERENCES_VISUELLES>
Aucune page n'est recomposée : chaque image est le rendu direct de la page PDF (index physique = folio imprimé).
"""
import sys, os, json
import pymupdf
from PIL import Image

pdf, refs = sys.argv[1], sys.argv[2]
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "film", "assets")
doc = pymupdf.open(pdf)

# page -> dpi. 300 dpi pour les gros plans de lecture, 200 pour les pages tenues, 130 pour les feuilles tournées.
HI = [1, 452, 29, 30, 35, 68, 142, 302]
MID = [2, 3, 4, 15, 16, 19, 20, 100, 168, 281, 33, 287, 417, 184, 337, 141, 221, 282, 351]
LOW = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18]
manifest = {}
for pages, dpi, q in ((HI, 300, 93), (MID, 200, 92), (LOW, 130, 90)):
    for n in pages:
        pix = doc[n - 1].get_pixmap(dpi=dpi, alpha=False)
        im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        name = f"pages/p{n:03d}.jpg"
        im.save(os.path.join(root, name), quality=q, subsampling=0 if dpi >= 200 else 2)
        manifest[n] = dict(file=name, dpi=dpi, w=im.width, h=im.height)

# portraits : recadrage seul (aucune retouche des traits). Le recadrage d'Appolos exclut le filigrane du photographe.
crops = {
    "silas": ("269163.jpg", (520, 40, 1140, 870)),
    "appolos": ("254419.jpg", (440, 95, 1150, 1042)),
}
for key, (fn, box) in crops.items():
    im = Image.open(os.path.join(refs, fn)).convert("RGB").crop(box)
    im.save(os.path.join(root, f"img/portrait_{key}.jpg"), quality=95, subsampling=0)
    manifest[f"portrait_{key}"] = dict(source=fn, crop=box, w=im.width, h=im.height)

json.dump(manifest, open(os.path.join(root, "manifest.json"), "w"), indent=1)
print(json.dumps(manifest)[:400])
