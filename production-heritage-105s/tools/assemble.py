#!/usr/bin/env python3
"""Assemblage final : image de base + plages re-rendues (flou lisse) -> un seul flux vidéo de 3150 images, puis multiplexage audio.
Usage : python3 tools/assemble.py <base.mp4> <dossier des run_AAAA_BBBB.mp4> <sortie_image.mp4> [crf=17]"""
import sys, os, re, subprocess
base, rdir, out = sys.argv[1:4]; crf = sys.argv[4] if len(sys.argv) > 4 else '17'
runs = sorted((int(m.group(1)), int(m.group(2)), os.path.join(rdir, f)) for f in os.listdir(rdir) if (m := re.fullmatch(r'run_(\d+)_(\d+)\.mp4', f)))
inputs = ['-i', base]; parts = []; fc = []; pos = 0; k = 0
def seg(a, b):
    global k
    fc.append(f'[0:v]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS[s{k}]'); parts.append(f'[s{k}]'); k += 1
for i, (a, b, f) in enumerate(runs):
    if a > pos: seg(pos, a)
    inputs += ['-i', f]; fc.append(f'[{i + 1}:v]setpts=PTS-STARTPTS[r{i}]'); parts.append(f'[r{i}]'); pos = b
if pos < 3150: seg(pos, 3150)
fc.append(''.join(parts) + f'concat=n={len(parts)}:v=1:a=0,format=yuv420p[v]')
cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', '[v]', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-g', '60', '-bf', '2',
       '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out]
print(len(runs), 'plages remplacées,', len(parts), 'segments'); subprocess.run(cmd, check=True)
