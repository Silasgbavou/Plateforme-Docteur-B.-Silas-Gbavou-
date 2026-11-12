// Sonde : capture des images fixes à des instants donnés. Usage : node tools/probe.mjs <page.html> <outdir> [--mode=N] t1 t2 ...
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'film');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };
export function serve() { return new Promise(res => { const s = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }); s.listen(0, () => res(s)); }); }
export async function openFilm(pageName = 'index.html') {
  const server = await serve(); const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 300)); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${port}/${pageName}`);
  await page.waitForFunction('window.ready === true', null, { timeout: 180000 });
  await page.evaluate(() => document.body.classList.add('render'));
  return { browser, page, server };
}
if (process.argv[1].endsWith('probe.mjs')) {
  const [pageName, outdir, ...rest] = process.argv.slice(2); fs.mkdirSync(outdir, { recursive: true });
  const { browser, page, server } = await openFilm(pageName);
  let samples = 1;
  for (const a of rest) {
    if (a.startsWith('--set=')) { await page.evaluate(a.slice(6)); continue; }
    if (a.startsWith('--samples=')) { samples = +a.slice(10); continue; }
    const t = parseFloat(a); const t0 = Date.now();
    await page.evaluate(([f, s]) => window.renderFrame(f, s), [Math.round(t * 30), samples]);
    const t1 = Date.now();
    await page.screenshot({ path: path.join(outdir, `t${t.toFixed(2).padStart(6, '0')}.png`), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    console.log(`t=${t} render ${t1 - t0} ms, shot ${Date.now() - t1} ms`);
  }
  await browser.close(); server.close();
}
