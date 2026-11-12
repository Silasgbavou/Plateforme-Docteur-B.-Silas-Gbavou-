#!/usr/bin/env python3
"""Mixage final : voix off fournie (enregistrement ElevenLabs « Andy », non modifié dans son contenu) + musique v3 + bruitages.
- La voix est découpée à ses pauses naturelles en 9 paragraphes et chaque paragraphe est posé sur la séquence qui l'illustre.
- Traitement voix : passe-haut, nettoyage des bas-médiums, présence, désesseur, compression douce.
- Ducking dynamique de la musique piloté par l'enveloppe de la voix (anticipation, maintien entre les mots, relâchement lent),
  plus un creux dynamique 0,9–4,5 kHz dans la musique pendant la parole.
- Master : -14 LUFS intégrés, crête ≤ -1,5 dBFS.
Usage : python3 tools/audio/mix_final.py <voix.mp3|wav>"""
import sys, os, json, subprocess, re
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
from scipy.ndimage import maximum_filter1d, uniform_filter1d, minimum_filter1d

SR = 48000; N = int(105.0 * SR)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'); OUT = os.path.join(ROOT, 'out', 'audio')
src = sys.argv[1]
tmp = os.path.join(OUT, '_voix_48k.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ar', str(SR), '-ac', '1', '-c:a', 'pcm_f32le', tmp], check=True)
vo, _ = sf.read(tmp); os.remove(tmp)

# ---------------------------------------------------------------- découpage (pauses mesurées) et placement
# (début de parole, fin de parole) dans l'enregistrement, puis instant de pose dans le film
PARAS = [
    ('P1', 0.00, 7.99, 9.00, "L’Héritage des saints dans la lumière est un ouvrage doctrinal et prophétique du Docteur Bienvenue Silas Gbavou et du Pasteur Mawoutonam Appolos Gbavou."),
    ('P2', 8.47, 16.97, 20.00, "À travers quinze chapitres répartis en quatre grandes parties, les auteurs nous conduisent dans une étude approfondie des Écritures et des richesses de notre héritage en Jésus-Christ."),
    ('P3', 18.11, 27.04, 32.30, "De la nouvelle naissance à la maturité des fils de Dieu, cet ouvrage explore notre identité spirituelle, les droits des héritiers et le pouvoir accordé aux fils de la lumière."),
    ('P4', 27.47, 33.75, 47.00, "Il nous introduit ensuite dans le ministère des anges, leurs fonctions, leurs hiérarchies et leur participation au mouvement prophétique."),
    ('P5', 34.18, 42.16, 53.70, "L’enseignement se poursuit avec les réalités du royaume prophétique, les dimensions de la révélation, les échelles d’ascension, les alliances et les autels."),
    ('P6', 42.69, 52.00, 62.40, "Enrichi de schémas explicatifs, de tableaux et d’illustrations, ce livre développe des enseignements bibliques profonds, dans un langage de connaissance, de révélation et de doctrine."),
    ('P7', 53.07, 60.26, 72.75, "Plus de 450 pages d’enseignement pour approfondir votre connaissance de Dieu et mieux comprendre les richesses de votre héritage en Christ."),
    ('P8', 60.64, 65.86, 80.70, "L’Héritage des saints dans la lumière, du Docteur Silas Gbavou et du Pasteur Appolos Gbavou."),
    ('P9', 66.29, 73.33, 90.00, "Pour obtenir votre exemplaire, contactez les auteurs sur Facebook, WhatsApp ou par e-mail."),
]
# début de parole exact (premier dépassement de -40 dBFS après le point de coupe)
def onset(a, b):
    s = vo[int(a * SR):int(b * SR)]; e = 20 * np.log10(uniform_filter1d(np.abs(s), int(0.005 * SR)) + 1e-9)
    i = np.argmax(e > -40); return a + i / SR
# rires de l'enregistrement (dans les pauses) : réintégrés avec la phrase qu'ils précèdent, à leur distance d'origine
LAUGH = {'P3': 17.30, 'P7': 52.33}
voice = np.zeros(N); placed = []
for (k, a, b, tgt, txt) in PARAS:
    o = onset(max(0, a - 0.2), b)
    s0, s1 = LAUGH.get(k, max(0, o - 0.06)), min(len(vo) / SR, b + 0.25)
    seg = vo[int(s0 * SR):int(s1 * SR)].copy(); fi, fo = int(0.04 * SR), int(0.12 * SR)
    seg[:fi] *= np.linspace(0, 1, fi); seg[-fo:] *= np.linspace(1, 0, fo) ** 2
    if k in LAUGH:                                                  # rire légèrement remonté (+3 dB) pour rester audible sous la musique
        nl = int((o - 0.33 - s0) * SR); g = np.ones(len(seg)); g[:nl] = 10 ** (3 / 20); g = np.convolve(g, np.ones(480) / 480, 'same'); seg *= g
    i = int((tgt - (o - s0)) * SR); voice[i:i + len(seg)] += seg[:N - i]
    placed.append(dict(id=k, debut=round(tgt, 2), fin=round(tgt + (b - o), 2), texte=txt))

# ---------------------------------------------------------------- traitement de la voix
def f(x, kind, fr, o=2): return sosfilt(butter(o, fr, kind, fs=SR, output='sos'), x, axis=0)
v = f(voice, 'highpass', 75, 3)
v = v - 0.18 * f(v, 'bandpass', [180, 380])                       # -1,7 dB de bas-médiums (voix plus nette)
v = v + 0.30 * f(v, 'highpass', 3200)                             # présence / intelligibilité
sib = f(v, 'bandpass', [5500, 9500]); se = uniform_filter1d(np.abs(sib), int(0.004 * SR)); ve = uniform_filter1d(np.abs(v), int(0.01 * SR)) + 1e-6
red = np.clip((se / ve - 0.35) * 1.6, 0, 0.55); v = v - sib * red     # désesseur
def compress(x, thr_db, ratio, att, rel, win=0.01):
    e = 20 * np.log10(maximum_filter1d(uniform_filter1d(np.abs(x), int(win * SR)), int(0.004 * SR)) + 1e-9)
    gr = -np.maximum(0, e - thr_db) * (1 - 1 / ratio)
    gr = minimum_filter1d(gr, int(att * SR)); gr = uniform_filter1d(gr, int(rel * SR))
    return x * 10 ** (gr / 20)
pk = np.percentile(np.abs(v[np.abs(v) > 1e-4]), 99.5); v = v / pk * 0.5
v = compress(v, -14, 2.6, 0.01, 0.12)
# limiteur de crêtes de la voix (plosives, transitoires) : évite les dépassements après encodage AAC
cap = np.percentile(np.abs(v[np.abs(v) > 1e-4]), 99.9) * 1.05
g = np.minimum(1.0, cap / np.maximum(np.abs(v), 1e-9)); g = minimum_filter1d(g, int(0.003 * SR)); g = uniform_filter1d(g, int(0.003 * SR)); v = v * g

# ---------------------------------------------------------------- musique, bruitages, ducking
mus, _ = sf.read(os.path.join(OUT, 'STEM_MUSIQUE.wav')); sfx, _ = sf.read(os.path.join(OUT, 'STEM_SFX.wav'))
mus = mus[:N]; sfx = sfx[:N]
env = 20 * np.log10(uniform_filter1d(np.abs(v), int(0.03 * SR)) + 1e-9)
act = (env > env.max() - 38).astype(float)
act = maximum_filter1d(act, int(0.45 * SR))                       # maintien entre les mots (pas de pompage)
act = np.roll(act, -int(0.18 * SR))                                # anticipation de 180 ms
def smooth(x, att, rel):                                           # montée rapide, retour lent
    up = uniform_filter1d(maximum_filter1d(x, int(att * SR)), int(att * SR)); return np.maximum(up, uniform_filter1d(x, int(rel * SR)))
d = np.clip(smooth(act, 0.08, 0.9), 0, 1)
DUCK_DB, MID_DB = -11.0, -4.0
gm = 10 ** (DUCK_DB * d / 20); gmid = 10 ** (MID_DB * d / 20)
mid = f(mus, 'bandpass', [900, 4500])
mus_d = mus * gm[:, None] + mid * (gm * (gmid - 1))[:, None]
sfx_d = sfx * (10 ** (-4.0 * d / 20))[:, None]

# ---------------------------------------------------------------- niveaux, master
def lufs(x):
    p = subprocess.run(['ffmpeg', '-v', 'info', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True)
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', p.stderr.decode())[-1])
V2 = np.stack([v, v], 1)
gv = 10 ** ((-16.0 - lufs(V2)) / 20); V2 *= gv                     # voix à -16 LUFS
gmu = 10 ** ((-17.5 - lufs(mus)) / 20)                              # musique pleine à -17,5 LUFS (hors voix)
gsx = 10 ** ((-29.0 - lufs(sfx)) / 20)
mix = V2 + mus_d * gmu + sfx_d * gsx
me = mus * gmu + sfx * gsx                                          # version sans voix (musique non atténuée)
def limit(x, ceil):
    e = np.abs(x).max(1); g = np.minimum(1.0, ceil / np.maximum(e, 1e-9))
    g = minimum_filter1d(g, int(0.006 * SR)); g = uniform_filter1d(g, int(0.006 * SR)); g = uniform_filter1d(g, int(0.003 * SR))
    return np.clip(x * g[:, None], -ceil, ceil)
def master(x, target=-14.0):
    for _ in range(3):
        x = limit(x * 10 ** ((target - lufs(x)) / 20), 0.70)
    return x
mix = master(mix); me = master(me)
for name, x in (('MIX_FINAL_VOIX', mix), ('MIX_ME', me), ('STEM_VOIX', V2 * 10 ** ((lufs(mix) - lufs(mix)) / 20)), ('STEM_MUSIQUE_DUCKEE', mus_d * gmu)):
    sf.write(os.path.join(OUT, name + '.wav'), np.clip(x, -1, 1), SR, subtype='PCM_24')
json.dump(dict(paragraphes=placed, ducking_db=DUCK_DB, creux_medium_db=MID_DB), open(os.path.join(OUT, 'placement_voix.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(placed, ensure_ascii=False)[:600]); print('LUFS mix', lufs(mix), 'M&E', lufs(me))
