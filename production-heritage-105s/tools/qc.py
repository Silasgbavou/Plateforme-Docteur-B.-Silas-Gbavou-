#!/usr/bin/env python3
"""Contrôle qualité mesuré d'un MP4 livré. Usage : python3 tools/qc.py out/HERITAGE_105s_SANS_VOIX.mp4"""
import subprocess, sys, json, re
f = sys.argv[1]
def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)
p = json.loads(run(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', f]).stdout)
v = [s for s in p['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in p['streams'] if s['codec_type'] == 'audio']
print('fichier        :', f, f"({int(p['format']['size']) / 1e6:.1f} Mo)")
print('vidéo          :', v['codec_name'], v.get('profile'), f"{v['width']}x{v['height']}", 'pix', v['pix_fmt'], 'SAR', v.get('sample_aspect_ratio'), 'DAR', v.get('display_aspect_ratio'))
print('cadence        :', v['r_frame_rate'], '| images lues :', v.get('nb_read_frames'), '| durée vidéo :', v.get('duration'), 's | durée conteneur :', p['format']['duration'])
print('couleur        :', v.get('color_range'), v.get('color_space'), v.get('color_primaries'), v.get('color_transfer'))
if a:
    a = a[0]; print('audio          :', a['codec_name'], a['sample_rate'], 'Hz', a['channels'], 'canaux', a.get('bit_rate'), 'bit/s', 'durée', a.get('duration'))
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    summ = e[e.rfind('Summary:'):]
    print('sonie          :', ' | '.join(re.sub(r'\s+', ' ', l.strip()) for l in summ.splitlines() if re.search(r'I:|LRA:|Peak:', l)))
    s = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'silencedetect=noise=-50dB:d=0.5', '-f', 'null', '-']).stderr
    print('silences >0,5s :', re.findall(r'silence_(?:start|end): [\d.]+', s) or 'aucun')
else: print('audio          : aucune piste')
b = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-vf', 'blackdetect=d=0.1:pix_th=0.08', '-an', '-f', 'null', '-']).stderr
print('images noires  :', re.findall(r'black_start:[\d.]+ black_end:[\d.]+', b) or 'aucune')
fr = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-vf', 'freezedetect=n=0.0008:d=0.5', '-an', '-f', 'null', '-']).stderr
print('images figées  :', re.findall(r'freeze_(?:start|end): [\d.]+', fr) or 'aucune (>0,5 s)')
