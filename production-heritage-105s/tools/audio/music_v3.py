#!/usr/bin/env python3
"""Musique v3 — publicité éditoriale haut de gamme, instrumentale, 105 s.
Arrangement écrit note par note (MIDI), joué par des instruments échantillonnés (banque FluidR3 GM, licence MIT, rendu FluidSynth),
puis mixé et masterisé ici (compression, sidechain, réverbération, limiteur).
Ré majeur, accords étendus (maj9, m9, m11, 13sus4, 6/9), ~90 BPM, transitions exactes à 8, 19, 31, 45, 61, 76, 88 s, accord final à 101,33 s.
Usage : python3 tools/audio/music_v3.py   -> out/audio/STEM_MUSIQUE.wav (+ stems par instrument dans out/audio/music_v3/)"""
import os, subprocess, json
import numpy as np, soundfile as sf, mido
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000; DUR = 105.0; N = int(DUR * SR)
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'out', 'audio'); STEMS = os.path.join(OUT, 'music_v3'); os.makedirs(STEMS, exist_ok=True)
rng = np.random.default_rng(31)

# ------------------------------------------------------------------ grille (mesures, temps)
SECTIONS = [  # début, fin, mesures (nombre de temps par mesure), accords (un par mesure, « A|B » = deux par mesure), style
    (0.0, 8.0, [4, 4, 4], ['Dmaj9', 'Bm9', 'Gmaj9|A13sus'], 'intro'),
    (8.0, 19.0, [4, 4, 4, 4], ['Dmaj9', 'A/C#', 'Bm9', 'Gmaj9|A13sus'], 'grooveA'),
    (19.0, 31.0, [4, 4, 4, 4, 2], ['Gmaj9', 'Dmaj9/F#', 'Em9', 'A13sus', 'A7sus'], 'grooveA'),
    (31.0, 45.0, [4, 4, 4, 4, 5], ['Bm9', 'Gmaj9', 'Dmaj9/F#', 'Em9', 'A13sus'], 'half'),
    (45.0, 61.0, [4, 4, 4, 4, 4, 4], ['Dmaj9', 'Bm9', 'Gmaj9', 'A13sus', 'Em9|F#m7', 'Gmaj9|A13sus'], 'grooveB'),
    (61.0, 76.0, [4, 4, 4, 4, 4, 2], ['Bm9', 'Gmaj9', 'Em9', 'Dmaj9/F#', 'Gmaj9', 'A13sus'], 'break'),
    (76.0, 88.0, [4, 4, 4, 4, 2], ['Dmaj9', 'Gmaj9', 'Bm9', 'Gmaj9|A13sus', 'A7sus'], 'grooveB'),
    (88.0, 101.3333, [4, 4, 4, 4, 4], ['Am11', 'Am11', 'Em11|G13', 'Cmaj9|Fmaj9', 'Dm9|G13sus'], 'outro'),   # réharmonisé sur la mélodie chantée de « Pour obtenir votre exemplaire » (la mineur)
]
FINAL_T = 101.3333
VOICING = {  # basse, main droite (voicings sans fondamentale, couleur « haut de gamme »)
    'Dmaj9': (38, [54, 57, 61, 64]), 'Dmaj9/F#': (42, [57, 61, 64, 66]), 'Bm9': (35, [50, 54, 57, 61]), 'Gmaj9': (31, [54, 57, 59, 62]),
    'A13sus': (33, [55, 59, 62, 66]), 'A/C#': (37, [52, 57, 59, 64]), 'Em9': (40, [54, 55, 59, 62]), 'F#m7': (42, [52, 57, 61, 64]),
    'A7sus': (33, [55, 57, 62, 64]), 'D69': (26, [54, 59, 64, 66, 69, 76]),
    'Am11': (33, [55, 59, 60, 64]), 'Em11': (40, [54, 57, 59, 62]), 'Fmaj9': (41, [52, 55, 57, 60]), 'G13': (43, [53, 57, 59, 64]), 'Cmaj9': (36, [52, 55, 59, 62]),
    'Dm9': (38, [53, 57, 60, 64]), 'G13sus': (31, [53, 57, 60, 64]), 'C69': (36, [52, 57, 62, 64, 67, 76]),
}
BARS = []  # (t0, nbeats, beat_len, [(beat_start, beat_len, chord)], style, section_index, bar_index_in_section, last_in_section)
for si, (a, b, meters, chords, style) in enumerate(SECTIONS):
    bl = (b - a) / sum(meters); t = a
    for bi, (m, c) in enumerate(zip(meters, chords)):
        parts = c.split('|'); seglen = m / len(parts)
        BARS.append(dict(t=t, n=m, bl=bl, ch=[(k * seglen, seglen, p) for k, p in enumerate(parts)], style=style, si=si, bi=bi, last=bi == len(meters) - 1))
        t += m * bl

EV = {k: [] for k in ('piano', 'rhodes', 'pad', 'strings', 'bass', 'drums', 'bells')}


def note(stem, t, d, n, v):
    j = 0 if stem == 'drums' and n in (36, 49) else rng.normal(0, 0.004)
    v = int(np.clip(v + rng.normal(0, 5), 1, 127))
    EV[stem].append((max(0.0, t + j), max(0.03, d), int(n), v))


def at(bar, beat): return bar['t'] + beat * bar['bl']


# ------------------------------------------------------------------ écriture
THEME = [(0, 1.5, 78), (1.5, 0.5, 81), (2, 2, 86), (4, 1.5, 88), (5.5, 0.5, 85), (6, 2, 81), (8, 1.5, 86), (9.5, 0.5, 90), (10, 1, 88), (11, 1, 86), (12, 4, 83)]
for B in BARS:
    st, bl = B['style'], B['bl']
    for (cb, cl, cn) in B['ch']:
        bass, rh = VOICING[cn]; t0 = at(B, cb); d = cl * bl
        # nappe chaude (tout le film) et cordes (montées)
        for n in rh: note('pad', t0, d + 0.05, n, 52 if st in ('intro', 'break', 'half') else 44)
        if st in ('grooveB', 'outro') or (st == 'break' and B['bi'] >= 2):
            for n in rh[1:] + [rh[-1] + 12]: note('strings', t0, d, n, 50 if st == 'break' else 58)
        # piano
        if st == 'intro':
            arp = rh + [rh[1] + 12, rh[2] + 12]
            for i in range(int(cl * 2)): note('piano', t0 + i * bl / 2, bl * 1.6, arp[i % len(arp)] + 12, 58 + 6 * (i % 4 == 0))
            note('piano', t0, d, bass + 24, 50)
        elif st == 'half':
            note('rhodes', t0, d * 0.98, rh[0], 60); [note('rhodes', t0 + 0.012 * k, d * 0.98, n, 58) for k, n in enumerate(rh[1:])]
            for i, bt_ in enumerate((1.5, 3.0)):
                if bt_ < cl: note('piano', t0 + bt_ * bl, bl * 0.9, rh[-1] + 12 + (2 if i else 0), 46)
        elif st == 'break' and B['bi'] < 2:
            note('rhodes', t0, d, rh[0], 58); [note('rhodes', t0 + 0.015 * k, d, n, 55) for k, n in enumerate(rh[1:])]
            for i in range(int(cl * 2)): note('piano', t0 + i * bl / 2, bl * 0.8, (rh + [rh[1] + 12])[i % 5] + 12, 44)
        else:  # comping syncopé (temps 1, « et » de 2, 4)
            for (pb, pl, vv) in ((0, 1.25, 66), (1.5, 0.9, 58), (3.0, 0.9, 60)):
                if pb < cl:
                    for k, n in enumerate(rh): note('piano', t0 + pb * bl + 0.006 * k, min(pl, cl - pb) * bl, n, vv - 2 * k)
        # basse
        if st == 'intro':
            if B['bi'] == 2: note('bass', t0, d, bass, 70)
        elif st == 'half' or (st == 'break' and B['bi'] < 2):
            note('bass', t0, min(2, cl) * bl * 0.95, bass, 86)
            if cl > 2.5: note('bass', t0 + 2.5 * bl, (cl - 2.5) * bl * 0.9, bass + (7 if cn != 'Bm9' else 12), 78)
        else:
            pat = [(0, 1.2, 0, 98), (1.5, 0.45, 0, 84), (2.5, 0.45, 12, 80), (3.0, 0.6, 0, 90), (3.5, 0.4, 7, 76)] if st in ('grooveB', 'outro') else [(0, 1.3, 0, 96), (1.5, 0.45, 0, 82), (3.0, 0.8, 0, 88), (3.5, 0.4, 7, 74)]
            for (pb, pl, iv, vv) in pat:
                if pb < cl: note('bass', t0 + pb * bl, pl * bl, bass + iv, vv)
# thème au piano : introduction (sans voix) et conclusion (après la voix)
for (b0, vel, octv, shift) in ((0, 64, -12, 0), (BARS.index(next(x for x in BARS if x['si'] == 7)) + 3, 72, -14, 1.5)):   # conclusion : thème en do majeur, après le dernier mot
    B0 = BARS[b0]; bl = B0['bl']
    for (bb, ln, n) in THEME:
        if b0 == 0 and bb >= 12: continue
        tt = B0['t'] + (bb + shift) * bl
        if tt < FINAL_T - 0.05: note('piano', tt, ln * bl, n + octv, vel)
# accord final 6/9
bass, rh = VOICING['C69']
for k, n in enumerate(rh): note('piano', FINAL_T + 0.035 * k, 3.6, n, 72 - 2 * k)
for n in rh[:4]: note('pad', FINAL_T, 3.6, n, 56); note('strings', FINAL_T, 3.4, n + 12, 56)
note('bass', FINAL_T, 3.4, 36, 92); note('bells', FINAL_T + 0.02, 3.4, 84, 50); note('bells', FINAL_T + 0.2, 3.2, 88, 44)

# ------------------------------------------------------------------ batterie (GM canal 10)
K, SN, CL, SS, HH, OH, CR, TB, SH, T1, T2, T3, RD = 36, 38, 39, 37, 42, 46, 49, 54, 82, 50, 47, 45, 51
def drumbar(B):
    st, bl, n = B['style'], B['bl'], B['n']; s16 = bl / 4; T = lambda s: B['t'] + s * s16
    steps = n * 4; last = B['last']
    if st == 'intro': return
    fill_from = steps if not last else (steps - 4 if n >= 4 else 0)
    if st in ('grooveA', 'grooveB', 'outro') or (st == 'break' and B['bi'] >= 2):
        kicks = [0, 7, 8, 10] if st in ('grooveB', 'outro') else [0, 7, 10]
        if st == 'break' and B['bi'] == 2: kicks = [0, 8]
        for bar4 in range(0, steps, 16):
            for s in kicks:
                if bar4 + s < fill_from: note('drums', T(bar4 + s), 0.1, K, 110 if s == 0 else 92)
            for s in (4, 12):
                if bar4 + s < fill_from and not (st == 'break' and B['bi'] == 2):
                    note('drums', T(bar4 + s), 0.1, SN, 96); note('drums', T(bar4 + s) + 0.004, 0.1, CL, 84)
            for s in range(0, 16, 1 if st in ('grooveB', 'outro') else 2):
                if bar4 + s < fill_from:
                    if st in ('grooveB', 'outro') and s in (6, 14): note('drums', T(bar4 + s), 0.2, OH, 70)
                    else: note('drums', T(bar4 + s), 0.05, HH, (84 if s % 4 == 0 else 64 if s % 2 == 0 else 46))
            if st in ('grooveB', 'outro'):
                for s in (4, 12): note('drums', T(bar4 + s), 0.1, TB, 52)
            for s in range(0, 16, 2): note('drums', T(bar4 + s + 1), 0.05, SH, 40)
    elif st == 'half' or st == 'break':
        for bar4 in range(0, steps, 16):
            if st == 'half':
                for s in (0, 10):
                    if bar4 + s < fill_from: note('drums', T(bar4 + s), 0.1, K, 100 if s == 0 else 84)
                if bar4 + 8 < fill_from: note('drums', T(bar4 + 8), 0.1, SS, 88)
            for s in range(0, 16, 2):
                if bar4 + s < fill_from: note('drums', T(bar4 + s), 0.05, HH, 52 if s % 4 == 0 else 38)
            for s in range(1, 16, 2): note('drums', T(bar4 + s), 0.05, SH, 34)
    # relances en fin de section
    if last and st != 'outro':
        nf = steps - fill_from
        if st in ('half', 'break') or nf == 8:
            for i in range(nf): note('drums', T(fill_from + i), 0.06, SN, int(40 + 70 * (i / max(1, nf - 1)) ** 1.4))
        else:
            for i, tom in enumerate([T1, T1, T2, T2][:nf]): note('drums', T(fill_from + i), 0.12, tom, 86 + 6 * i)
            note('drums', T(steps - 1), 0.1, K, 100)
    if st == 'outro' and B['bi'] == len(SECTIONS[7][2]) - 1:
        for i, tom in enumerate([T1, T2, T2, T3]): note('drums', T(12 + i), 0.12, tom, 90 + 5 * i)
for B in BARS: drumbar(B)
for tc in (8.0, 19.0, 45.0, 76.0, 88.0, FINAL_T): note('drums', tc, 2.0, CR, 104 if tc != 19.0 else 80)
note('drums', FINAL_T, 0.1, K, 120)

# ------------------------------------------------------------------ rendu FluidSynth (un fichier par instrument)
TUNE_CENTS = 42   # justesse mesurée de la voix sur sa phrase chantée (+42 cents par rapport au la 440 Hz)
PROG = {'piano': 0, 'rhodes': 4, 'pad': 89, 'strings': 49, 'bass': 33, 'drums': None, 'bells': 11}


def write_mid(stem, path):
    mid = mido.MidiFile(ticks_per_beat=480); tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=500000)); ch = 9 if stem == 'drums' else 0
    if PROG[stem] is not None: tr.append(mido.Message('program_change', program=PROG[stem], channel=ch, time=0))
    if stem != 'drums': tr.append(mido.Message('pitchwheel', pitch=int(round(TUNE_CENTS / 200 * 8192)), channel=ch, time=0))   # accord fin sur la voix
    tr.append(mido.Message('control_change', control=91, value=0, channel=ch, time=0)); tr.append(mido.Message('control_change', control=93, value=0, channel=ch, time=0))
    if stem == 'piano': tr.append(mido.Message('control_change', control=64, value=0, channel=ch, time=0))
    msgs = []
    for (t, d, n, v) in EV[stem]: msgs += [(t, 1, mido.Message('note_on', note=n, velocity=v, channel=ch)), (t + d, 0, mido.Message('note_off', note=n, velocity=0, channel=ch))]
    msgs.sort(key=lambda m: (m[0], m[1])); last = 0
    for (t, _, m) in msgs:
        tk = int(round(t * 960)); m.time = max(0, tk - last); last = max(last, tk); tr.append(m)
    mid.save(path)


audio = {}
for stem in EV:
    if not EV[stem]: continue
    mp = os.path.join(STEMS, stem + '.mid'); wp = os.path.join(STEMS, stem + '_raw.wav'); write_mid(stem, mp)
    subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.6', '-r', str(SR), '-R', '0', '-C', '0', '-O', 'float', '-T', 'wav', '-F', wp, SF2, mp], check=True, capture_output=True)
    x, sr = sf.read(wp); assert sr == SR
    if x.ndim == 1: x = np.stack([x, x], 1)
    y = np.zeros((N + 4 * SR, 2)); y[:min(len(x), len(y))] = x[:len(y)]; audio[stem] = y

# ------------------------------------------------------------------ mixage
L = N + 4 * SR
def hp(x, f, o=2): return sosfilt(butter(o, f, 'highpass', fs=SR, output='sos'), x, axis=0)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lowpass', fs=SR, output='sos'), x, axis=0)
def bp(x, a, b): return sosfilt(butter(2, [a, b], 'bandpass', fs=SR, output='sos'), x, axis=0)
def env_follow(x, att=0.005, rel=0.12):
    e = np.abs(x).max(1); out = np.zeros_like(e); a, r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); v = 0.0
    # version vectorisée par blocs de 64 échantillons (suffisant pour un compresseur de bus)
    blk = 64; eb = e[:len(e) // blk * blk].reshape(-1, blk).max(1); ob = np.zeros_like(eb); ab, rb = a ** blk, r ** blk
    for i, s in enumerate(eb): v = ab * v + (1 - ab) * s if s > v else rb * v + (1 - rb) * s; ob[i] = v
    out[:len(ob) * blk] = np.repeat(ob, blk); out[len(ob) * blk:] = ob[-1] if len(ob) else 0; return out
def comp(x, thr_db, ratio, att=0.005, rel=0.12, makeup_db=0.0):
    e = env_follow(x, att, rel); ed = 20 * np.log10(e + 1e-9); over = np.maximum(0, ed - thr_db); gr = -over * (1 - 1 / ratio)
    return x * (10 ** ((gr + makeup_db) / 20))[:, None]
def make_ir(rt, bright, pre=0.018, seed=7):
    r = np.random.default_rng(seed); n = int(rt * SR); t = np.arange(n) / SR
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], 1) * np.exp(-t / (rt / 6.9))[:, None]
    ir = lp(hp(ir, 220), bright); ir = np.vstack([np.zeros((int(pre * SR), 2)), ir]); return ir / np.sqrt((ir ** 2).sum(0)).mean()
IR_HALL = make_ir(2.6, 6500); IR_ROOM = make_ir(0.9, 8000, 0.008, 9)
def rev(x, ir, amt): return np.stack([fftconvolve(x[:, 0], ir[:, 0])[:len(x)], fftconvolve(x[:, 1], ir[:, 1])[:len(x)]], 1) * amt
def width(x, w):
    m = (x[:, 0] + x[:, 1]) / 2; s = (x[:, 0] - x[:, 1]) / 2 * w; return np.stack([m + s, m - s], 1)
def pan(x, p):
    m = x.mean(1); return np.stack([m * np.cos((p + 1) * np.pi / 4), m * np.sin((p + 1) * np.pi / 4)], 1) * 1.41

# sidechain : enveloppe des grosses caisses
kick_t = sorted(t for (t, d, n, v) in EV['drums'] if n == K)
side = np.ones(L)
for tk in kick_t:
    i = int(tk * SR); n = int(0.28 * SR); tt = np.arange(n) / SR
    side[i:i + n] = np.minimum(side[i:i + n], 1 - 0.9 * np.exp(-tt / 0.09) * np.clip(tt / 0.004, 0, 1))
def duck(x, depth_db): g = 10 ** (-depth_db / 20); return x * (g + (1 - g) * side)[:, None]

# couche « sub » moderne sous chaque grosse caisse (sinus 52 Hz descendant)
sub = np.zeros((L, 2))
for tk in kick_t:
    n = int(0.42 * SR); tt = np.arange(n) / SR; f = 46 + 40 * np.exp(-tt / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.14) * (1 - np.exp(-tt / 0.002)); i = int(tk * SR)
    sub[i:i + n] += s[:min(n, L - i), None] * 0.12

dr = hp(audio['drums'], 35); dr = dr + 0.6 * comp(dr, -30, 6, 0.002, 0.08, 10)          # compression parallèle
dr = dr + 0.35 * bp(dr, 6000, 14000) + sub; dr = dr + rev(dr, IR_ROOM, 0.10)
ba = lp(hp(audio['bass'], 32), 3200); ba = comp(ba, -24, 4, 0.004, 0.10, 6); ba = duck(ba, 5)
pn = hp(audio['piano'], 90); pn = comp(pn, -22, 2.5, 0.006, 0.15, 4); pn = width(pn, 1.3); pn = duck(pn, 1.5) + rev(pn, IR_HALL, 0.32)
rh_ = hp(audio['rhodes'], 110); rh_ = width(rh_, 1.5); rh_ = rh_ * (1 + 0.18 * np.sin(2 * np.pi * 4.6 * np.arange(L) / SR))[:, None] + rev(rh_, IR_HALL, 0.35)
pd = hp(audio['pad'], 160); pd = width(pd, 1.8); pd = duck(pd, 6) + rev(pd, IR_HALL, 0.25)
sg = hp(audio['strings'], 180); sg = width(sg, 1.6); sg = duck(sg, 4) + rev(sg, IR_HALL, 0.45)
be = hp(audio.get('bells', np.zeros((L, 2))), 400) + rev(audio.get('bells', np.zeros((L, 2))), IR_HALL, 0.6)

# effets de transition synthétiques (montées, impacts, cymbale inversée)
fx = np.zeros((L, 2))
def place(sig, t0, g=1.0):
    i = int(t0 * SR); n = min(len(sig), L - i)
    if i >= 0 and n > 0: fx[i:i + n] += (sig[:n] if sig.ndim == 2 else np.stack([sig[:n], sig[:n]], 1)) * g
def riser(t1, dur, g):
    n = int(dur * SR); u = np.arange(n) / n; x = rng.standard_normal((n, 2)); out = np.zeros((n, 2)); Kb = 28; e = np.linspace(0, n, Kb + 1).astype(int)
    for k in range(Kb):
        c = 400 * (10000 / 400) ** ((k + 0.5) / Kb); a0 = max(0, e[k] - 1200)
        out[e[k]:e[k + 1]] = bp(x[a0:e[k + 1]], c * 0.75, min(c * 1.4, SR / 2 - 100))[-(e[k + 1] - e[k]):]
    place(out * (u ** 2.4)[:, None], t1 - dur, g)
def revcym(t1, dur, g):
    n = int(dur * SR); u = np.arange(n) / n; x = hp(rng.standard_normal((n, 2)), 5000); place(x * (u ** 3)[:, None], t1 - dur, g)
def impact(t0, g):
    n = int(2.4 * SR); tt = np.arange(n) / SR; f = 48 + 70 * np.exp(-tt / 0.05)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.7); s = np.tanh(s * 1.5) + lp(rng.standard_normal(n), 900) * np.exp(-tt / 0.08) * 0.4
    place(s, t0, g); place(rev(np.stack([s, s], 1), IR_HALL, 0.4)[:n], t0, g * 0.5)
riser(8.0, 3.4, 0.05); revcym(8.0, 1.6, 0.06); impact(8.0, 0.55)
revcym(19.0, 1.2, 0.04); riser(31.0, 1.5, 0.03); revcym(45.0, 1.8, 0.06); riser(45.0, 2.2, 0.04); impact(45.0, 0.35)
riser(76.0, 3.4, 0.06); revcym(76.0, 1.8, 0.07); impact(76.0, 0.5); revcym(88.0, 1.4, 0.05); impact(88.0, 0.4); impact(FINAL_T, 0.35)

mix = hp(dr, 40) * 0.95 + hp(ba, 38) * 0.80 + pn * 1.25 + rh_ * 0.75 + pd * 0.42 + sg * 0.20 + be * 0.3 + hp(fx, 45) * 0.7
mix = hp(mix, 32, 3) - 0.25 * bp(mix, 45, 90) + 0.35 * bp(mix, 1800, 6000)           # sous-graves maîtrisés, présence
mix = mix + 0.25 * hp(mix, 9000)                                                      # air
mix = comp(mix, -14, 2.0, 0.01, 0.2, 2)                                               # colle de bus
mix = mix[:N]
f_in = int(0.03 * SR); mix[:f_in] *= np.linspace(0, 1, f_in)[:, None]
fo = int(1.4 * SR); mix[-fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None]
pk = np.abs(mix).max(); mix *= 0.89 / pk
sf.write(os.path.join(OUT, 'STEM_MUSIQUE.wav'), mix, SR, subtype='PCM_24')
for k, v in (('batterie', dr), ('basse', ba), ('piano', pn), ('rhodes', rh_), ('nappes', pd), ('cordes', sg), ('effets_transition', fx)):
    sf.write(os.path.join(STEMS, f'{k}.wav'), np.clip(v[:N] * 0.89 / pk, -1, 1), SR, subtype='PCM_24')
for f in os.listdir(STEMS):
    if f.endswith('_raw.wav'): os.remove(os.path.join(STEMS, f))
json.dump({'bars': [round(b['t'], 4) for b in BARS], 'final': FINAL_T, 'kicks': len(kick_t)}, open(os.path.join(STEMS, 'grille.json'), 'w'))
print('ok', len(BARS), 'mesures', {k: len(v) for k, v in EV.items()})
