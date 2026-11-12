// Rendu image par image -> MP4 (H.264) via ffmpeg. Usage : node tools/render.mjs <out.mp4> [--from=0] [--to=3150] [--step=1] [--scale=1] [--samples=auto|N] [--crf=14] [--size=1920x1080]
// Chaque image est calculée par window.renderFrame(n) (déterministe), capturée en PNG et envoyée à ffmpeg (image2pipe).
import { spawn } from 'child_process';
import { openFilm } from './probe.mjs';
const args = Object.fromEntries(process.argv.slice(3).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const out = process.argv[2]; const from = +(args.from ?? 0), to = +(args.to ?? 3150), step = +(args.step ?? 1), scale = args.scale ?? '1', crf = args.crf ?? '14', size = args.size ?? '1920x1080';
const samples = args.samples && args.samples !== 'auto' ? +args.samples : null;
const { browser, page, server } = await openFilm('index.html' + (scale !== '1' ? `?scale=${scale}` : ''));
const fps = 30 / step;
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  '-vf', `scale=${size.replace('x', ':')}:flags=lanczos:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p`, '-c:v', 'libx264', '-preset', args.preset ?? 'medium', '-crf', crf, '-g', '30', '-bf', '2',
  '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now(); let n = 0;
for (let f = from; f < to; f += step) {
  await page.evaluate(([f, s]) => window.renderFrame(f, s), [f, samples]);
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  n++; if (n % 50 === 0) console.log(`${out.split('/').pop()} image ${f} (${n}/${Math.ceil((to - from) / step)}) ${((Date.now() - t0) / n).toFixed(0)} ms/image`);
}
ff.stdin.end(); await new Promise(r => ff.on('close', r));
await browser.close(); server.close();
console.log(`TERMINE ${out} : ${n} images en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
