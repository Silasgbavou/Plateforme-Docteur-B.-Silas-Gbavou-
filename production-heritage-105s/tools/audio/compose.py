#!/usr/bin/env python3
"""Musique originale et sound design du film « L'Héritage des saints dans la lumière » (105 s).

Tout est synthétisé par ce script (numpy/scipy) : aucune boucle, aucun échantillon tiers, aucune œuvre imitée.
Sorties (48 kHz / 24 bits, stéréo) dans out/audio/ :
  STEM_MUSIQUE.wav, STEM_SFX.wav, MIX_ME.wav (musique + effets, sans voix), MIX_ME_DUCKE.wav (pré-atténué sous la voix), cues.json

Structure : 37 mesures à 4/4, tempo adaptatif 80–90 BPM (rubato par séquence) pour que chaque séquence
contienne un nombre entier de mesures : transitions exactes à 0, 8, 19, 31, 45, 61, 76, 88 et 105 s.
Tonalité : ré majeur (lumineux, solennel), couleur si mineur pour les séquences « nuit » (04 et 06), cadence finale résolutive.
Usage : python3 tools/audio/compose.py
"""
import json, os
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.ndimage import minimum_filter1d, uniform_filter1d
import soundfile as sf

SR = 48000
DUR = 105.0
N = int(DUR * SR)
TAIL = 8 * SR
rng = np.random.default_rng(20261112)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'out', 'audio')
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- grille temporelle
SECTIONS = [  # (début s, nb mesures, durée de mesure s)
    (0, 3, 8 / 3), (8, 4, 11 / 4), (19, 4, 3.0), (31, 5, 2.8), (45, 6, 16 / 6), (61, 5, 3.0), (76, 4, 3.0),
]
BAR_T, BAR_L = [], []
for t0, n, L in SECTIONS:
    for k in range(n):
        BAR_T.append(t0 + k * L); BAR_L.append(L)
# séquence 08 : 4 mesures de 2,667 s, 1 mesure ralentie de 3,0 s, accord final tenu 3,33 s
for k in range(4): BAR_T.append(88 + k * 8 / 3); BAR_L.append(8 / 3)
BAR_T.append(88 + 32 / 3); BAR_L.append(3.0)
BAR_T.append(88 + 32 / 3 + 3.0); BAR_L.append(105 - (88 + 32 / 3 + 3.0))
assert len(BAR_T) == 37


def bt(bar, beat=0.0):
    """instant (s) du temps `beat` (0..4) de la mesure `bar`"""
    return BAR_T[bar] + beat / 4 * BAR_L[bar]


def hz(m): return 440.0 * 2 ** ((m - 69) / 12)


def bus(): return np.zeros((N + TAIL, 2))


B = {k: bus() for k in ('pad', 'str', 'pno', 'bass', 'perc', 'spark', 'sfx', 'sfxwet')}


def place(b, sig, t0, pan=0.0, gain=1.0):
    i = int(round(t0 * SR));
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), N + TAIL - i)
    if n <= 0: return
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    if sig.ndim == 1:
        B[b][i:i + n, 0] += sig[:n] * l * gain; B[b][i:i + n, 1] += sig[:n] * r * gain
    else:
        B[b][i:i + n] += sig[:n] * gain


# ---------------------------------------------------------------- instruments
def pad(notes, t0, dur, amp, bright=1.0, att=1.4, rel=2.4, b='pad'):
    n = int((dur + rel) * SR); t = np.arange(n) / SR
    env = np.clip(t / att, 0, 1) ** 1.6 * np.where(t < dur, 1.0, np.exp(-(t - dur) / (rel / 3.2)))
    out = np.zeros((n, 2))
    for m in notes:
        f = hz(m)
        for det, pan in ((-7, -0.7), (0, 0.0), (6, 0.7)):
            fr = f * 2 ** (det / 1200); ph = rng.uniform(0, 2 * np.pi, 8)
            s = np.zeros(n)
            for h in range(1, 7):
                if fr * h > 7000: break
                lfo = 1.0 if h < 3 else 0.55 + 0.45 * np.sin(2 * np.pi * (0.07 + 0.013 * h) * t + ph[h])
                s += np.sin(2 * np.pi * fr * h * t + ph[h]) * lfo / h ** (2.3 / bright)
            l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
            out[:, 0] += s * l; out[:, 1] += s * r
    place(b, out * env[:, None], t0, gain=amp / (3 * max(1, len(notes)) ** 0.6))


def strings(m, t0, dur, amp, att=0.45, rel=0.9, bright=1.0, pan=0.0):
    n = int((dur + rel) * SR); t = np.arange(n) / SR; f = hz(m)
    env = np.clip(t / att, 0, 1) ** 1.3 * np.where(t < dur, 1.0, np.exp(-(t - dur) / (rel / 3)))
    env *= 1 + 0.06 * np.sin(2 * np.pi * 0.31 * t + rng.uniform(0, 6))
    out = np.zeros((n, 2))
    for k, det in enumerate((-9, -4, 0, 5, 10)):
        vib = 1 + 0.0032 * np.sin(2 * np.pi * (5.1 + 0.3 * k) * t + rng.uniform(0, 6)) * np.clip((t - 0.25) / 0.5, 0, 1)
        phase = 2 * np.pi * np.cumsum(f * 2 ** (det / 1200) * vib) / SR
        s = np.zeros(n)
        for h in range(1, 11):
            if f * h > 8000: break
            s += np.sin(h * phase + rng.uniform(0, 6)) / h ** (1.45 / bright)
        p = pan + (k - 2) * 0.22; l = np.cos((np.clip(p, -1, 1) + 1) * np.pi / 4); r = np.sin((np.clip(p, -1, 1) + 1) * np.pi / 4)
        out[:, 0] += s * l; out[:, 1] += s * r
    place('str', out * env[:, None], t0, gain=amp / 5)


def piano(m, t0, dur, vel=0.6, pan=None):
    f = hz(m); n = int(min(dur + 3.0, 7.0) * SR); t = np.arange(n) / SR
    s = np.zeros(n); Bi = 0.00035
    for det in (0.0, 0.7):
        fr = f * 2 ** (det / 1200)
        for k in range(1, 20):
            fk = fr * k * np.sqrt(1 + Bi * k * k)
            if fk > 5200: break
            a = k ** -1.55 * np.exp(-k / (3.5 + 9 * vel))
            dec = (0.75 + 0.42 * k) * (f / 261.6) ** 0.45
            s += a * np.sin(2 * np.pi * fk * t + rng.uniform(0, 0.3)) * (0.75 * np.exp(-dec * t) + 0.25 * np.exp(-dec * 0.28 * t))
    s *= 1 - np.exp(-t / 0.0045)
    ham = rng.standard_normal(int(0.03 * SR)) * np.exp(-np.arange(int(0.03 * SR)) / (0.006 * SR))
    ham = sosfilt(butter(2, [200, 1800], 'bandpass', fs=SR, output='sos'), ham)
    s[:len(ham)] += ham * 0.25 * vel
    s *= np.where(t < dur, 1.0, np.exp(-(t - dur) * 5.5))
    if pan is None: pan = np.clip((m - 66) / 30, -0.5, 0.5)
    place('pno', s, t0, pan=pan, gain=0.5 * vel)


def bass(m, t0, dur, amp):
    n = int((dur + 0.8) * SR); t = np.arange(n) / SR; f = hz(m)
    env = np.clip(t / 0.12, 0, 1) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.25))
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    place('bass', s * env, t0, gain=amp)


def pluck(m, t0, amp, pan=0.0, dec=5.0, b='spark'):
    n = int(1.6 * SR); t = np.arange(n) / SR; f = hz(m)
    s = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-6 * t) + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-9 * t)) * np.exp(-dec * t) * (1 - np.exp(-t / 0.003))
    place(b, s, t0, pan=pan, gain=amp)


def drum(t0, amp, f0=78, f1=42, dec=0.42):
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.05); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / dec) * (1 - np.exp(-t / 0.002))
    th = sosfilt(butter(2, 900, 'lowpass', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-t / 0.03) * 0.3
    place('perc', s + th, t0, gain=amp)


def noise_band(n, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n))


def shaker(t0, amp, pan=0.0):
    n = int(0.09 * SR); t = np.arange(n) / SR
    s = noise_band(n, 5200, 11000) * np.exp(-t / 0.02) * (1 - np.exp(-t / 0.002))
    place('perc', s, t0, pan=pan, gain=amp)


def swell(t1, dur, amp, lo=1800, hi=9000, b='perc'):
    """souffle/cymbale en crescendo aboutissant à t1"""
    n = int((dur + 1.6) * SR); t = np.arange(n) / SR
    env = np.where(t < dur, (t / dur) ** 2.6, np.exp(-(t - dur) / 0.45))
    l = noise_band(n, lo, hi) * env; r = noise_band(n, lo, hi) * env
    place(b, np.stack([l, r], 1), t1 - dur, gain=amp)


# ---------------------------------------------------------------- harmonie
D = [50, 57, 62, 66, 69]; Dsus2 = [50, 57, 62, 64, 69]; Dadd9 = [50, 57, 62, 64, 66, 69]
AC = [49, 57, 61, 64, 69]; Bm7 = [47, 54, 59, 62, 66, 69]; Bm9 = [47, 54, 61, 62, 66]
G = [43, 55, 59, 62, 67]; Gmaj7 = [43, 55, 59, 62, 66]; Gadd9 = [43, 55, 59, 62, 69]
As4 = [45, 52, 57, 62, 64]; A = [45, 52, 57, 61, 64]; Em7 = [40, 52, 55, 59, 62, 66]; Em9 = [40, 52, 55, 62, 66]
DF = [42, 54, 57, 62, 66, 69]; Fm7 = [42, 54, 57, 61, 64]; GD = [38, 50, 55, 59, 62, 67]
# (mesure) -> liste de (temps de départ, longueur en temps, accord, basse)
HARM = {
    0: [(0, 4, Dsus2, None)], 1: [(0, 4, Bm7, None)], 2: [(0, 2, Gmaj7, 31), (2, 2, As4, 33)],
    3: [(0, 4, D, 26)], 4: [(0, 4, AC, 37)], 5: [(0, 4, Bm7, 35)], 6: [(0, 2, G, 31), (2, 2, As4, 33)],
    7: [(0, 4, Gadd9, 31)], 8: [(0, 4, DF, 30)], 9: [(0, 4, Em7, 28)], 10: [(0, 2, As4, 33), (2, 2, A, 33)],
    11: [(0, 4, Bm9, 35)], 12: [(0, 4, Gmaj7, 31)], 13: [(0, 4, DF, 30)], 14: [(0, 4, Em9, 28)], 15: [(0, 4, As4, 33)],
    16: [(0, 4, D, 26)], 17: [(0, 4, Bm7, 35)], 18: [(0, 4, G, 31)], 19: [(0, 4, A, 33)], 20: [(0, 2, Fm7, 30), (2, 2, Bm7, 35)], 21: [(0, 2, G, 31), (2, 2, A, 33)],
    22: [(0, 4, Bm7, 35)], 23: [(0, 4, Gmaj7, 31)], 24: [(0, 4, Em7, 28)], 25: [(0, 4, DF, 30)], 26: [(0, 2, As4, 33), (2, 2, A, 33)],
    27: [(0, 4, D, 26)], 28: [(0, 4, GD, 26)], 29: [(0, 4, Bm7, 35)], 30: [(0, 4, A, 33)],
    31: [(0, 4, G, 31)], 32: [(0, 4, A, 33)], 33: [(0, 2, Bm7, 35), (2, 2, AC, 37)], 34: [(0, 2, G, 31), (2, 2, As4, 33)], 35: [(0, 4, Dadd9, 26)], 36: [(0, 4, D, 26)],
}
# dynamique par mesure : (nappe, cordes, basse)
DYN = {}
for b in range(37):
    if b < 3: DYN[b] = (0.46 + 0.06 * b, 0.0 if b < 2 else 0.14, 0.0 if b < 2 else 0.16)
    elif b < 7: DYN[b] = (0.50, 0.30, 0.34)
    elif b < 11: DYN[b] = (0.44, 0.18, 0.26)
    elif b < 16: DYN[b] = (0.46, 0.10, 0.24)
    elif b < 22: DYN[b] = (0.44, 0.24 + 0.035 * (b - 16), 0.30 + 0.02 * (b - 16))
    elif b < 27: DYN[b] = (0.50, 0.20 + 0.05 * (b - 22), 0.28)
    elif b < 31: DYN[b] = (0.46, 0.36, 0.30)
    else: DYN[b] = (0.52, 0.42 if b < 35 else 0.36, 0.36)

for b, segs in HARM.items():
    pd, sd, bd = DYN[b]
    for (s0, ln, ch, bs) in segs:
        t0 = bt(b, s0); dur = ln / 4 * BAR_L[b]
        last = b == 36
        pad(ch[1:], t0, dur + (2.2 if last else 0.25), pd, bright=1.25 if b in range(16, 22) or b >= 27 else 1.0, att=1.6 if b < 3 else 0.9, rel=3.2 if last else 2.2)
        if sd > 0:
            for i, m in enumerate(ch[1:4]):
                strings(m + (12 if b >= 27 and i == 2 else 0), t0, dur + (1.6 if last else 0.1), sd * (0.9 if i else 1.0), att=0.7 if b < 7 else 0.5, rel=2.8 if last else 1.0, pan=(-0.4, 0.0, 0.4)[i], bright=0.95)
        if bs is not None and bd > 0:
            bass(bs + 12 if bs < 30 else bs, t0, dur + (1.6 if last else 0.0), bd)

# ---------------------------------------------------------------- thème (piano feutré), réponses et variations
THEME = [  # (mesure relative, temps, durée en temps, note MIDI)
    (0, 0, 1.5, 66), (0, 1.5, 0.5, 69), (0, 2, 2, 74),
    (1, 0, 1.5, 76), (1, 1.5, 0.5, 73), (1, 2, 2, 69),
    (2, 0, 1.5, 74), (2, 1.5, 0.5, 78), (2, 2, 1, 76), (2, 3, 1, 74),
    (3, 0, 2, 71), (3, 2, 2, 69),
]


def play_theme(b0, vel, octave=0, instr='pno', notes=THEME):
    for (rb, beat, ln, m) in notes:
        t0 = bt(b0 + rb, beat); dur = ln / 4 * BAR_L[b0 + rb]
        if instr == 'pno':
            piano(m + octave, t0 + rng.uniform(-0.006, 0.006), dur, vel * (1.0 if beat == 0 else 0.86))
        else:
            strings(m + octave, t0, dur * 0.98, vel, att=0.28, rel=0.7, bright=1.1)


# séquence 02 — exposition du thème (révélation de la couverture)
play_theme(3, 0.62)
for b in range(3, 7):  # main gauche : quintes ouvertes
    for (s0, ln, ch, bs) in HARM[b]:
        piano(ch[0] + 12 if ch[0] < 45 else ch[0], bt(b, s0), ln / 4 * BAR_L[b], 0.36); piano(ch[1], bt(b, s0) + 0.02, ln / 4 * BAR_L[b], 0.3)
# séquence 03 — arpèges calmes (ouverture du livre)
for b in range(7, 11):
    for (s0, ln, ch, bs) in HARM[b]:
        tones = [ch[1], ch[2], ch[3], ch[2] + 12, ch[3], ch[2], ch[4] if len(ch) > 4 else ch[3], ch[2]]
        n8 = int(ln * 2)
        for i in range(n8):
            piano(tones[i % 8], bt(b, s0 + i * 0.5), 0.9, 0.30 + 0.06 * (i % 4 == 0))
ANS = [(0, 0, 2, 71), (0, 2, 2, 74), (1, 0, 3, 69), (1, 3, 1, 66), (2, 0, 2, 67), (2, 2, 2, 71), (3, 0, 4, 69)]
play_theme(7, 0.46, 12, notes=ANS)
# séquence 04 — contemplation : pulsations légères et notes hautes espacées
for b in range(11, 16):
    ch = HARM[b][0][2]
    for i in range(8):
        pluck(ch[1 + (i * 2) % 3] + 12, bt(b, i * 0.5), 0.045 if i % 2 else 0.065, pan=-0.5 + (i % 4) * 0.33, dec=7.5)
for (b, beat, m) in [(11, 0, 78), (11, 2.5, 83), (12, 1, 81), (12, 3, 78), (13, 0.5, 81), (13, 2.5, 74), (14, 1, 79), (14, 3, 78), (15, 0, 76), (15, 2, 81)]:
    piano(m, bt(b, beat), 1.6, 0.34)
# séquence 05 — quatre parties : ostinato de cordes, tics soyeux, thème repris
play_theme(16, 0.56)
for b in range(16, 22):
    for (s0, ln, ch, bs) in HARM[b]:
        for i in range(int(ln * 2)):
            tt = bt(b, s0 + i * 0.5)
            strings(ch[2 + (i % 2)] + 12, tt, 0.16, 0.12 + 0.012 * (b - 16), att=0.03, rel=0.22, bright=1.2, pan=0.3 if i % 2 else -0.3)
for (rb, beat, ln, m) in [(0, 0, 2, 73), (0, 2, 1, 76), (0, 3, 1, 78), (1, 0, 2, 79), (1, 2, 2, 76)]:
    piano(m, bt(20 + rb, beat), ln / 4 * BAR_L[20], 0.52)
# séquence 06 — immersion : ligne de cordes ascendante, arpèges hauts, montée vers l'aube
for (b, m) in [(22, 78), (23, 79), (24, 83), (25, 81), (26, 85)]:
    strings(m, bt(b, 0), BAR_L[b] * (0.98 if b < 26 else 1.0), 0.16 + 0.05 * (b - 22), att=0.9, rel=1.2, bright=1.05)
for b in range(22, 27):
    ch = HARM[b][0][2]
    for i in range(8):
        pluck(ch[1 + i % 3] + 24 if i % 2 == 0 else ch[2 + i % 2] + 12, bt(b, i * 0.5), 0.055, pan=np.sin(i * 1.3) * 0.6, dec=5.5)
# séquence 07 — les auteurs : thème aux cordes, piano discret
play_theme(27, 0.30, 0, instr='str', notes=[(0, 0, 1.5, 66), (0, 1.5, 0.5, 69), (0, 2, 2, 74), (1, 0, 1.5, 74), (1, 1.5, 0.5, 71), (1, 2, 2, 67), (2, 0, 1.5, 74), (2, 1.5, 0.5, 78), (2, 2, 1, 76), (2, 3, 1, 74), (3, 0, 2, 73), (3, 2, 2, 69)])
for b in range(27, 31):
    ch = HARM[b][0][2]
    for i, beat in enumerate((0, 1, 2, 3)):
        piano(ch[1 + i % 3] + 12, bt(b, beat), 1.0, 0.30)
# séquence 08 — signature : énoncé final et résolution
FINAL = [(0, 0, 1.5, 71), (0, 1.5, 0.5, 74), (0, 2, 2, 79), (1, 0, 1.5, 81), (1, 1.5, 0.5, 76), (1, 2, 2, 73), (2, 0, 1, 74), (2, 1, 1, 78), (2, 2, 1, 76), (2, 3, 1, 81), (3, 0, 2, 83), (3, 2, 2, 81), (4, 0, 3, 78), (4, 3, 1, 76), (5, 0, 4, 74)]
play_theme(31, 0.64, notes=FINAL)
play_theme(31, 0.20, 0, instr='str', notes=FINAL[:12])
for b in range(31, 36):
    for (s0, ln, ch, bs) in HARM[b]:
        piano(ch[0] + 12 if ch[0] < 45 else ch[0], bt(b, s0), ln / 4 * BAR_L[b], 0.40); piano(ch[1], bt(b, s0) + 0.015, ln / 4 * BAR_L[b], 0.32)
for i, m in enumerate((38, 50, 57, 62, 66, 69, 74, 86)):   # accord final arpégé
    piano(m, bt(36, 0) + i * 0.07, 3.3, 0.5 - 0.02 * i)

# percussions cinématiques légères, souffles de transition et scintillements
swell(8.0, 2.6, 0.085); swell(31.0, 1.2, 0.05); swell(45.0, 1.4, 0.05); swell(61.0, 1.2, 0.045); swell(76.0, 2.8, 0.10, lo=2500, hi=11000); swell(88.0, 1.4, 0.05)
for (t, m) in [(8.0, 86), (8.12, 93), (8.25, 98), (76.0, 86), (76.14, 90), (76.28, 93), (76.42, 98), (bt(36, 0), 98), (bt(36, 0) + 0.2, 102)]:
    pluck(m, t, 0.07, pan=rng.uniform(-0.6, 0.6), dec=2.6)
# air lumineux du prologue
n = int(9.5 * SR); t = np.arange(n) / SR
air = np.stack([noise_band(n, 3000, 9000), noise_band(n, 3000, 9000)], 1) * (np.clip(t / 3, 0, 1) * np.clip((9.5 - t) / 2.5, 0, 1))[:, None] * (0.6 + 0.4 * np.sin(2 * np.pi * 0.21 * t))[:, None]
place('pad', air, 0.0, gain=0.012)

# ---------------------------------------------------------------- sound design (calé sur les images clés du film)
CUES = {
    'cover_reveal': 8.0, 'light_sweep': 12.2, 'lay_down': 19.2, 'cover_open': 21.2, 'cover_land': 22.85,
    'page_turns': [23.75] + [round(25.0 + i * 0.14, 2) for i in range(6)] + [28.3, 28.56],
    'push_page': 30.2, 'night_in': 31.0,
    'panel_moves': [32.75, 36.9, 40.7, 44.3], 'highlights': [34.65, 38.45, 42.05],
    'cards_in': [round(46.7 + i * 0.12, 2) for i in range(4)], 'part_focus': [47.6, 53.4],
    'push_ring': 60.0, 'ring_spins': [66.2, 70.1], 'ring_stops': [64.05, 67.95, 71.1], 'dawn': 73.5, 'light_in': 76.0,
    'portraits': [76.45, 78.0], 'morph': 86.7, 'books_land': [88.55, 88.9],
    'rows': [round(88.75 + i * 0.36 + k * 0.12, 2) for i in range(2) for k in range(4)], 'pulses': [93.75, 94.35, 96.0],
}


def whoosh(t0, dur, amp, lo=300, hi=3200, pan0=-0.5, pan1=0.5, b='sfx'):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    env = np.sin(np.pi * u) ** 1.8
    x = rng.standard_normal(n); out = np.zeros(n)
    # balayage du filtre par tranches
    K = 24; edges = np.linspace(0, n, K + 1).astype(int)
    for k in range(K):
        c = lo * (hi / lo) ** (np.sin(np.pi * (k + 0.5) / K) ** 1.2)
        seg = sosfilt(butter(2, [c * 0.6, min(c * 1.7, SR / 2 - 100)], 'bandpass', fs=SR, output='sos'), x[max(0, edges[k] - 2000):edges[k + 1]])
        out[edges[k]:edges[k + 1]] = seg[-(edges[k + 1] - edges[k]):]
    out *= env; pan = pan0 + (pan1 - pan0) * u
    st = np.stack([out * np.cos((pan + 1) * np.pi / 4), out * np.sin((pan + 1) * np.pi / 4)], 1)
    place(b, st, t0, gain=amp); place('sfxwet', st, t0, gain=amp * 0.5)


def page_flip(t0, amp, pan=0.0, dur=0.42):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    env = (u ** 0.6) * np.exp(-3.2 * u) * 4.0 + 0.9 * np.exp(-((u - 0.86) / 0.05) ** 2)      # frottement puis claquement doux du papier
    s = noise_band(n, 1800, 9500) * env * (1 + 0.5 * np.sin(2 * np.pi * 38 * t))
    s += noise_band(n, 250, 900) * np.exp(-((u - 0.88) / 0.07) ** 2) * 0.8
    place('sfx', s, t0, pan=pan, gain=amp); place('sfxwet', s, t0, pan=pan, gain=amp * 0.25)


def thud(t0, amp, f0=95, f1=48, pan=0.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.03); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13) + noise_band(n, 300, 1500) * np.exp(-t / 0.02) * 0.4
    place('sfx', s, t0, pan=pan, gain=amp); place('sfxwet', s, t0, pan=pan, gain=amp * 0.3)


def ting(t0, amp, m=93, pan=0.0):
    n = int(1.8 * SR); t = np.arange(n) / SR; f = hz(m)
    s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-5 * t) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-9 * t)) * np.exp(-3.4 * t) * (1 - np.exp(-t / 0.002))
    place('sfx', s, t0, pan=pan, gain=amp); place('sfxwet', s, t0, pan=pan, gain=amp * 0.9)


def tick(t0, amp, pan=0.0, f=2300):
    n = int(0.08 * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + noise_band(n, 3000, 9000) * np.exp(-t / 0.004) * 0.5) * (1 - np.exp(-t / 0.0008))
    place('sfx', s, t0, pan=pan, gain=amp); place('sfxwet', s, t0, pan=pan, gain=amp * 0.4)


thud(8.0, 0.30, 70, 38); whoosh(7.2, 1.6, 0.05, 500, 5000, 0, 0); ting(8.02, 0.035, 86)
whoosh(12.1, 1.5, 0.028, 1500, 7000, -0.6, 0.6)                                  # balayage lumineux
whoosh(19.2, 1.9, 0.07, 200, 1800, 0.4, -0.2); thud(20.95, 0.22, 80, 45)          # le livre se couche
whoosh(21.2, 1.7, 0.05, 250, 2200, 0.3, -0.5); thud(22.88, 0.16, 110, 60, -0.4)   # la couverture s'ouvre et se pose
for i, tp in enumerate(CUES['page_turns']):
    riffle = 1 <= i <= 6
    page_flip(tp + 0.12, 0.085 if riffle else 0.12, pan=-0.15 + 0.06 * (i % 3), dur=0.36 if riffle else 0.5)
whoosh(30.15, 1.1, 0.075, 300, 4200, -0.3, 0.2); ting(31.0, 0.03, 90)
for i, tp in enumerate(CUES['panel_moves']): whoosh(tp, 1.35, 0.05, 250, 2600, (-0.1, -0.6, 0.0, 0.6)[i], (-0.6, 0.0, 0.6, 0)[i])
for i, tp in enumerate(CUES['highlights']): ting(tp, 0.05, (93, 95, 98)[i], (-0.4, 0.0, 0.4)[i]); tick(tp - 0.03, 0.03)
for tp in (33.2, 33.5, 33.8, 34.1, 37.45, 37.75, 38.05, 41.15, 41.45, 41.75): tick(tp, 0.012, f=1500)     # molette de défilement
for i, tp in enumerate(CUES['cards_in']): tick(tp + 0.45, 0.05, (-0.5, 0.5, -0.5, 0.5)[i], 1900 + 150 * i); whoosh(tp, 0.7, 0.025, 500, 3000, 0, 0)
for i, tp in enumerate(CUES['part_focus']): whoosh(tp, 0.95, 0.04, 300, 2800, 0, (-0.5, 0.5, -0.5, 0.5)[i]); ting(tp + 0.85, 0.04, (86, 88, 90, 93)[i], (-0.4, 0.4, -0.4, 0.4)[i])
whoosh(60.0, 2.6, 0.07, 200, 3600, 0, 0)                                         # traversée vers le carrousel
for tp in CUES['ring_spins']: whoosh(tp, 1.6 if tp < 70 else 0.95, 0.055, 300, 3000, 0.6, -0.6)
for i, tp in enumerate(CUES['ring_stops']): ting(tp, 0.045, (95, 98, 100)[i]); tick(tp - 0.04, 0.03)
whoosh(73.4, 2.7, 0.085, 400, 7000, -0.5, 0.5); ting(76.0, 0.05, 98); ting(76.1, 0.04, 102, 0.4)
for i, tp in enumerate(CUES['portraits']): whoosh(tp, 0.95, 0.04, 300, 2600, (-0.7, 0.7)[i], (-0.2, 0.2)[i]); ting(tp + 0.75, 0.035, (90, 93)[i], (-0.4, 0.4)[i])
whoosh(86.7, 1.8, 0.05, 300, 3200, 0, 0.5)
for i, tp in enumerate(CUES['books_land']): thud(tp, 0.14, 90, 50, (-0.5, -0.3)[i])
whoosh(87.7, 1.3, 0.04, 200, 2000, -0.8, -0.4)
for i, tp in enumerate(CUES['rows']): tick(tp + 0.05, 0.035, 0.45, 2000 + 120 * (i % 4))
for i, tp in enumerate(CUES['pulses']): tick(tp + 0.2, 0.04, 0.45, (2100, 2350, 2600)[i]); ting(tp + 0.2, 0.022, (90, 93, 95)[i], 0.45)

# ---------------------------------------------------------------- RYTHMIQUE MODERNE : batterie, basse synthé, arpèges, pompage (style publicitaire)
B['drum'] = bus(); B['hat'] = bus(); B['synb'] = bus(); B['arp'] = bus(); B['fx'] = bus()
KICKS = []


def kick(t0, amp=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = 46 + 130 * np.exp(-t / 0.028); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    s += noise_band(n, 1500, 6000) * np.exp(-t / 0.004) * 0.35                      # attaque (clic)
    place('drum', np.tanh(s * 1.6) * 0.8, t0, gain=amp); KICKS.append((t0, amp))


def snare(t0, amp=1.0):
    n = int(0.4 * SR); t = np.arange(n) / SR
    body = (np.sin(2 * np.pi * 185 * t) + 0.6 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t / 0.05)
    s = body * 0.5 + noise_band(n, 1200, 9000) * np.exp(-t / 0.085) * 0.9
    place('drum', s * (1 - np.exp(-t / 0.0008)), t0, gain=amp * 0.55); place('fx', s, t0, gain=amp * 0.12)


def clap(t0, amp=1.0):
    n = int(0.35 * SR); t = np.arange(n) / SR; env = np.zeros(n)
    for d in (0.0, 0.011, 0.022): env += np.where(t >= d, np.exp(-(t - d) / 0.012), 0) * 0.6
    env += np.where(t >= 0.03, np.exp(-(t - 0.03) / 0.09), 0)
    s = noise_band(n, 900, 3800) * env
    place('drum', s, t0, pan=0.08, gain=amp * 0.42); place('fx', s, t0, gain=amp * 0.16)


def hat(t0, amp=1.0, open_=False, pan=0.25):
    d = 0.16 if open_ else 0.028; n = int((d * 5) * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n); s = sosfilt(butter(3, 7500, 'highpass', fs=SR, output='sos'), x) * np.exp(-t / d) * (1 - np.exp(-t / 0.0006))
    place('hat', s, t0, pan=pan, gain=amp * 0.16)


def tom(t0, m, amp=1.0, pan=0.0):
    n = int(0.5 * SR); t = np.arange(n) / SR; f = hz(m) * (1 + 0.5 * np.exp(-t / 0.03))
    place('drum', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14), t0, pan=pan, gain=amp * 0.5)


def crash(t0, amp=1.0):
    n = int(2.6 * SR); t = np.arange(n) / SR
    l = sosfilt(butter(2, 4500, 'highpass', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-t / 0.7)
    r = sosfilt(butter(2, 4500, 'highpass', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-t / 0.7)
    place('hat', np.stack([l, r], 1), t0, gain=amp * 0.10)


def riser(t1, dur, amp=1.0):
    """montée : bruit filtré ascendant + note glissante, aboutit à t1"""
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    x = rng.standard_normal(n); out = np.zeros(n); K = 32; e = np.linspace(0, n, K + 1).astype(int)
    for k in range(K):
        c = 500 * (9000 / 500) ** ((k + 0.5) / K)
        sg = sosfilt(butter(2, [c * 0.7, min(c * 1.5, SR / 2 - 200)], 'bandpass', fs=SR, output='sos'), x[max(0, e[k] - 1500):e[k + 1]]); out[e[k]:e[k + 1]] = sg[-(e[k + 1] - e[k]):]
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (u * 2)) / SR) * 0.25
    place('fx', (out + tone) * u ** 2.2, t1 - dur, gain=amp * 0.16)


def impact(t0, amp=1.0):
    n = int(2.2 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.6) + noise_band(n, 200, 2500) * np.exp(-t / 0.12) * 0.5
    place('drum', np.tanh(s * 1.4), t0, gain=amp * 0.7); place('fx', s, t0, gain=amp * 0.25)


def synbass(m, t0, dur, amp=1.0):
    n = int((dur + 0.08) * SR); t = np.arange(n) / SR; f = hz(m)
    saw = sum(np.sin(2 * np.pi * f * h * t) / h * np.exp(-t * (1.5 + 2.2 * h)) for h in range(1, 9))
    s = (np.sin(2 * np.pi * f * t) * 0.9 + saw * 0.7) * np.clip(t / 0.004, 0, 1) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.02))
    place('synb', np.tanh(s * 1.3), t0, gain=amp * 0.42)


def arp(m, t0, amp=1.0, pan=0.0):
    n = int(0.5 * SR); t = np.arange(n) / SR; f = hz(m)
    s = sum(np.sin(2 * np.pi * f * h * t) / h ** 1.2 * np.exp(-t * (7 + 3 * h)) for h in range(1, 7)) * (1 - np.exp(-t / 0.002))
    place('arp', s, t0, pan=pan, gain=amp * 0.10)


def groove(b, K=(0, 7, 10), S=(), C=(4, 12), hats=2, hv=1.0, kv=1.0, oh=(), ghost=False):
    """une mesure de 16 pas : K = grosse caisse, S = caisse claire, C = clap, hats = pas entre charlestons"""
    L = BAR_L[b] / 16
    for st in K: kick(bt(b) + st * L, kv * (1.0 if st % 4 == 0 else 0.82))
    for st in S: snare(bt(b) + st * L)
    for st in C: clap(bt(b) + st * L)
    for st in range(0, 16, hats):
        sw = 0.012 if (st % 4 == 2 and hats == 1) else 0.0
        hat(bt(b) + st * L + sw, hv * (1.0 if st % 4 == 0 else 0.62 if st % 2 == 0 else 0.4), pan=0.3 if st % 4 else 0.18)
    for st in oh: hat(bt(b) + st * L, hv * 0.9, open_=True, pan=-0.2)
    if ghost: [hat(bt(b) + st * L, hv * 0.22, pan=-0.3) for st in (3, 11, 15)]


def fill(b, kind='tom'):
    """relance sur la seconde moitié de la mesure b"""
    L = BAR_L[b] / 16
    if kind == 'tom':
        for i, (st, m) in enumerate(((10, 50), (11, 50), (12, 47), (13, 45), (14, 43), (15, 43))): tom(bt(b) + st * L, m, 0.7 + 0.06 * i, pan=-0.4 + 0.16 * i)
    else:
        for i in range(16): snare(bt(b) + (8 + i * 0.5) * L, 0.25 + 0.05 * i)


def bassline(b, pat=(0, 3, 6, 8, 11, 14), amp=1.0):
    for (s0, ln, ch, bs) in HARM[b]:
        if bs is None: continue
        L = BAR_L[b] / 16; a, e = int(s0 * 4), int((s0 + ln) * 4)
        for st in pat:
            if a <= st < e: synbass(bs + (12 if bs < 30 else 0), bt(b) + st * L, L * 1.6, amp * (1.0 if st % 4 == 0 else 0.8))


def arps(b, amp=1.0, octave=12):
    for (s0, ln, ch, bs) in HARM[b]:
        L = BAR_L[b] / 16; tones = [ch[1], ch[2], ch[3], ch[2] + 12, ch[3], ch[1] + 12, ch[2], ch[3]]
        for i in range(int(ln * 4)):
            st = int(s0 * 4) + i; arp(tones[st % 8] + octave, bt(b) + st * L, amp * (1.0 if st % 4 == 0 else 0.7), pan=0.55 if st % 2 else -0.55)


# 01 prologue : pas de batterie, montée vers la révélation
riser(8.0, 3.2, 1.0)
# 02 révélation : impact, groove pop-cinématique
impact(8.0, 1.0); crash(8.0)
for b in range(3, 7): groove(b, K=(0, 7, 10), C=(4, 12), hats=2, ghost=True); bassline(b); arps(b, 0.8)
fill(6, 'tom')
# 03 ouverture du livre : même pulsation, plus légère (rim/clap doux), on laisse la place au papier
crash(19.0, 0.6)
for b in range(7, 11): groove(b, K=(0, 10), C=(4, 12), hats=2, hv=0.8, kv=0.9); bassline(b, (0, 6, 8, 14), 0.85); arps(b, 0.55)
fill(10, 'tom'); riser(31.0, 1.4, 0.7)
# 04 lecture : mi-tempo aéré (grosse caisse + clap au 3e temps), charleston discret
impact(31.0, 0.6)
for b in range(11, 16): groove(b, K=(0, 6), C=(8,), hats=2, hv=0.6, kv=0.85); bassline(b, (0, 6, 8), 0.8); arps(b, 0.45)
fill(15, 'snare'); riser(45.0, 2.0, 0.9)
# 05 quatre parties : plein régime, quatre temps marqués, charleston en doubles croches
impact(45.0, 0.9); crash(45.0)
for b in range(16, 22): groove(b, K=(0, 4, 8, 12) if b >= 18 else (0, 7, 8, 10), C=(4, 12), hats=1, hv=0.9, oh=(14,) if b % 2 else ()); bassline(b, (0, 2, 4, 6, 8, 10, 12, 14) if b >= 18 else (0, 3, 6, 8, 11, 14)); arps(b, 0.9)
fill(21, 'snare'); riser(61.0, 2.2, 1.0)
# 06 immersion : demi-tempo ample, toms, grande montée vers la lumière
impact(61.0, 0.9); crash(61.0, 0.8)
for b in range(22, 27): groove(b, K=(0, 6, 10), S=(8,), C=(), hats=1, hv=0.75); bassline(b, (0, 6, 10), 0.9); arps(b, 0.7, 24)
fill(25, 'tom'); fill(26, 'snare'); riser(76.0, 3.2, 1.25)
# 07 auteurs : groove chaleureux, charleston ouvert
impact(76.0, 1.0); crash(76.0)
for b in range(27, 31): groove(b, K=(0, 7, 10), C=(4, 12), hats=2, oh=(6, 14), ghost=True); bassline(b); arps(b, 0.75)
fill(30, 'tom'); riser(88.0, 1.6, 0.9)
# 08 signature : plein régime puis sortie nette sur l'accord final
impact(88.0, 1.0); crash(88.0)
for b in range(31, 35): groove(b, K=(0, 4, 8, 12) if b >= 33 else (0, 7, 10), C=(4, 12), hats=1, hv=0.9, oh=(14,)); bassline(b, (0, 2, 4, 6, 8, 10, 12, 14) if b >= 33 else (0, 3, 6, 8, 11, 14)); arps(b, 0.9)
fill(34, 'tom')
kick(bt(35, 0)); crash(bt(35, 0), 0.9); kick(bt(35, 2), 0.8); clap(bt(35, 2)); impact(bt(36, 0), 1.0); crash(bt(36, 0), 1.0)

# pompage (sidechain) : nappes, cordes, basse et arpèges respirent sur la grosse caisse
pump = np.ones(N + TAIL)
for (tk, a) in KICKS:
    i = int(tk * SR); n = int(0.32 * SR); tt = np.arange(n) / SR
    pump[i:i + n] = np.minimum(pump[i:i + n], 1 - 0.5 * a * np.exp(-tt / 0.11))
for k in ('pad', 'str', 'synb', 'arp'): B[k] *= pump[:, None]

# ---------------------------------------------------------------- sons d'interface renforcés (défilement, boutons, sélections)
def ui_click(t0, amp, f=1450, pan=0.0):
    n = int(0.05 * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + noise_band(n, 2500, 8000) * np.exp(-t / 0.0025) * 0.7) * (1 - np.exp(-t / 0.0004))
    place('sfx', s, t0, pan=pan, gain=amp); place('sfxwet', s, t0, pan=pan, gain=amp * 0.25)


def ui_pop(t0, amp, f0=520, f1=980, pan=0.0):
    n = int(0.16 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * np.clip(t / 0.05, 0, 1)) / SR) * np.exp(-t / 0.035) * (1 - np.exp(-t / 0.001))
    place('sfx', s, t0, pan=pan, gain=amp); place('sfxwet', s, t0, pan=pan, gain=amp * 0.5)


# molette de défilement : crans dont la cadence suit la vitesse (accélération, croisière, ralenti), puis butée douce
for (a, b_, pan) in ((33.0, 34.6, -0.4), (37.3, 38.4, 0.0), (41.0, 42.0, 0.4)):
    nt = int(round((b_ - a) * 11))
    for i in range(nt):
        u = (i + 0.5) / nt; x = np.arcsin(2 * u - 1) / np.pi + 0.5         # inverse d'une progression douce : crans serrés au milieu
        ui_click(a + x * (b_ - a), 0.055 + 0.03 * np.sin(np.pi * x), 1250 + 500 * np.sin(np.pi * x), pan)
    thud(b_ + 0.02, 0.07, 140, 90, pan)
for i, tp in enumerate(CUES['highlights']): ui_pop(tp, 0.10, 560, 1050, (-0.4, 0.0, 0.4)[i])
for i, tp in enumerate(CUES['part_focus']): ui_click(tp + 0.02, 0.09, 1700, (-0.4, 0.4, -0.4, 0.4)[i]); ui_pop(tp + 0.85, 0.09, 480 + 60 * i, 900 + 110 * i, (-0.4, 0.4, -0.4, 0.4)[i])
for i, tp in enumerate(CUES['ring_stops']): ui_pop(tp, 0.10, 600, 1150 + 80 * i)
for tp in (22.2, 24.6, 26.5, 29.2): ui_pop(tp, 0.07, 500, 880, -0.6)                                   # étiquettes de page
for i, tp in enumerate(CUES['rows']): ui_click(tp + 0.05, 0.07, 1500 + 110 * (i % 4), 0.45)
for i, tp in enumerate(CUES['pulses']):                                                                # boutons Facebook, WhatsApp, e-mail (deux cartes)
    for j in (0, 1): ui_click(tp + 0.18 + j * 0.16, 0.11, 1900, 0.45); ui_pop(tp + 0.2 + j * 0.16, 0.12, 620 + 90 * i, 1180 + 140 * i, 0.45)

# ---------------------------------------------------------------- réverbération, mixage, niveaux
def make_ir(rt=3.4, bright=5200):
    n = int(rt * SR); t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], 1) * np.exp(-t / (rt / 6.2))[:, None]
    ir = sosfilt(butter(2, bright, 'lowpass', fs=SR, output='sos'), ir, axis=0)
    ir = sosfilt(butter(1, 180, 'highpass', fs=SR, output='sos'), ir, axis=0)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0)).mean()


IR = make_ir()


def rev(x, amt):
    y = np.stack([fftconvolve(x[:, 0], IR[:, 0])[:len(x)], fftconvolve(x[:, 1], IR[:, 1])[:len(x)]], 1)
    return y * amt


music = (B['pad'] * 0.62 + rev(B['pad'], 0.16) + B['str'] * 0.62 + rev(B['str'], 0.26) + B['pno'] * 0.95 + rev(B['pno'], 0.22)
         + B['bass'] * 0.30 + B['perc'] * 0.35 + rev(B['perc'], 0.10) + B['spark'] * 0.8 + rev(B['spark'], 0.4)
         + B['drum'] * 1.0 + rev(B['drum'], 0.035) + B['hat'] * 1.0 + rev(B['hat'], 0.05) + B['synb'] * 1.0 + B['arp'] * 1.0 + rev(B['arp'], 0.30) + B['fx'] * 1.0 + rev(B['fx'], 0.35))
# égalisation de bus : étagère haute (+5 dB au-dessus de 2,5 kHz) pour l'air et la clarté, médiums-graves légèrement dégagés
music = music + 0.8 * sosfilt(butter(1, 2500, 'highpass', fs=SR, output='sos'), music, axis=0) - 0.18 * sosfilt(butter(2, [180, 420], 'bandpass', fs=SR, output='sos'), music, axis=0)
sfx = (B['sfx'] + rev(B['sfxwet'], 0.42)) * 3.6
# passe-haut doux, fondu final, limitation douce
hp = butter(2, 28, 'highpass', fs=SR, output='sos')
music = sosfilt(hp, music, axis=0)[:N]; sfx = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), sfx, axis=0)[:N]
fade = np.ones(N); nf = int(1.6 * SR); fade[-nf:] = np.cos(np.linspace(0, np.pi / 2, nf)) ** 2
music *= fade[:, None]; sfx *= fade[:, None]
fin = int(0.02 * SR); music[:fin] *= np.linspace(0, 1, fin)[:, None]


def lufs_gain(x, target=-16.0):
    """gain pour viser un niveau intégré approximatif (pondération K simplifiée : passe-haut + énergie par blocs de 400 ms, porte relative -10 LU)"""
    k = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), x, axis=0)
    k = sosfilt(butter(1, 1500, 'highpass', fs=SR, output='sos'), k, axis=0) * 0.58 + k      # étagère haute approx. +4 dB
    blk = int(0.4 * SR); hop = blk // 4
    e = np.array([np.mean(k[i:i + blk] ** 2, 0).sum() for i in range(0, len(k) - blk, hop)])
    l = -0.691 + 10 * np.log10(e + 1e-12); g1 = l > -70; m1 = -0.691 + 10 * np.log10(e[g1].mean()); g2 = l > m1 - 10
    integ = -0.691 + 10 * np.log10(e[g2].mean())
    return 10 ** ((target - integ) / 20), integ


mix = music + sfx
g, integ = lufs_gain(mix, -13.2)       # vise ≈ -14 LUFS mesurés (ffmpeg ebur128) pour la version sans voix
music *= g; sfx *= g; mix = music + sfx
peak = np.abs(mix).max()


def limit(x, ceil=0.72):
    """limiteur transparent à anticipation (5 ms) : plafond -1,9 dBFS"""
    env = np.abs(x).max(1); gr = np.minimum(1.0, ceil / np.maximum(env, 1e-9))
    gr = minimum_filter1d(gr, 480); gr = uniform_filter1d(gr, 480); gr = uniform_filter1d(gr, 240)
    return np.clip(x * gr[:, None], -ceil * 1.04, ceil * 1.04)        # sécurité : aucune crête au-delà du plafond


mix_l = limit(mix)
print(f'niveau intégré avant gain ≈ {integ:.1f} LUFS, gain {20 * np.log10(g):.1f} dB, crête mix {20 * np.log10(peak):.1f} dBFS')

# version pré-atténuée sous la voix (sidechain simulé d'après les fenêtres de VOIX_OFF_FINALE.md) : -8 dB, attaque 0,25 s, relâchement 0,6 s
VO = [(0.8, 8.2), (9.2, 17.4), (19.8, 23.2), (25.0, 30.0), (32.0, 36.0), (37.6, 43.8), (45.5, 47.3), (48.2, 50.5), (50.9, 53.5), (53.9, 56.9), (57.2, 59.9), (61.8, 65.8), (67.4, 72.8), (76.8, 81.0), (81.8, 86.6), (88.8, 92.2), (94.0, 98.0), (98.8, 102.2)]
duck = np.ones(N); t = np.arange(N) / SR
for a, b in VO:
    duck = np.minimum(duck, 1 - (1 - 10 ** (-8 / 20)) * np.clip((t - (a - 0.25)) / 0.25, 0, 1) * np.clip(((b + 0.6) - t) / 0.6, 0, 1))
mix_d = limit((music * duck[:, None]) + sfx * (0.6 + 0.4 * duck[:, None]))

for name, x in (('STEM_SFX', sfx),):      # v3 : la musique vient de music_v3.py, le mixage final de mix_final.py
    sf.write(os.path.join(OUT, name + '.wav'), np.clip(x, -1, 1), SR, subtype='PCM_24')
json.dump({'sr': SR, 'bars': [round(x, 4) for x in BAR_T], 'bar_len': [round(x, 4) for x in BAR_L], 'cues': CUES, 'vo_windows': VO, 'duck_db': -8}, open(os.path.join(OUT, 'cues.json'), 'w'), indent=1)
print('ok', OUT)
