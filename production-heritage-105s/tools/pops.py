#!/usr/bin/env python3
"""Détection des sauts d'image (« pops ») et des images isolées : différence moyenne entre images successives.
Usage : python3 tools/pops.py <film.mp4>"""
import subprocess, sys, numpy as np
f = sys.argv[1]; W, H = 192, 108
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
d = np.abs(np.diff(fr, axis=0)).mean((1, 2))
print('images :', len(fr), '| différence moyenne : %.3f | médiane : %.3f | max : %.2f à l\'image %d (%.2f s)' % (d.mean(), np.median(d), d.max(), d.argmax() + 1, (d.argmax() + 1) / 30))
sp = []
for i in range(3, len(d) - 3):
    nb = np.median(np.r_[d[i - 3:i], d[i + 1:i + 4]])
    if d[i] > 4.0 and d[i] > 3.5 * (nb + 0.3): sp.append((i + 1, d[i], nb))
print('sauts brusques (pic > 3,5 x voisinage) :', [(n, round(n / 30, 2), round(float(v), 1)) for n, v, _ in sp] or 'aucun')
flash = [i + 1 for i in range(1, len(fr) - 1) if np.abs(fr[i] - fr[i - 1]).mean() > 6 and np.abs(fr[i + 1] - fr[i]).mean() > 6 and np.abs(fr[i + 1] - fr[i - 1]).mean() < 1.5]
print('images isolées (flash d\'une image) :', flash or 'aucune')
still = np.where(d < 0.002)[0]
print('paires d\'images strictement identiques :', len(still))
