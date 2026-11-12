// Passe de finition : re-rend uniquement les plages en mouvement avec un flou de mouvement lisse (N sous-images, obturateur 180°).
// Usage : node tools/render_runs.mjs <dossier> <k> <n> [sous-images=6]   (processus k parmi n, répartition équilibrée)
import { spawn } from 'child_process';
import { openFilm } from './probe.mjs';
const RUNS = [[577,642],[715,741],[751,795],[850,882],[907,1035],[1108,1149],[1222,1257],[1326,1466],[1519,1547],[1609,1637],[1708,1736],[1798,1917],[1987,2037],[2104,2130],[2200,2280],[2293,2319],[2341,2367],[2602,2682]];
const [dir, k, n, S] = [process.argv[2], +process.argv[3], +process.argv[4], +(process.argv[5] || 6)];
const load = Array(n).fill(0), mine = [];
for (const r of [...RUNS].sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))) { const i = load.indexOf(Math.min(...load)); load[i] += r[1] - r[0]; if (i === k) mine.push(r); }
const { browser, page, server } = await openFilm('index.html');
for (const [a, b] of mine) {
  const out = `${dir}/run_${String(a).padStart(4, '0')}_${String(b).padStart(4, '0')}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '12',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', out + '.tmp.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    await page.evaluate(([f, S]) => window.renderFrame(f, window.blurSamples(f / 30) > 1 ? S : 1), [f, S]);
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  (await import('fs')).renameSync(out + '.tmp.mp4', out);
  console.log(`FAIT ${a}-${b} (${b - a} images, ${((Date.now() - t0) / (b - a)).toFixed(0)} ms/image)`);
}
await browser.close(); server.close(); console.log('TERMINE processus', k);
