// Liste les plages d'images en mouvement (flou > 1 sous-image). Usage : node tools/blur_runs.mjs
import { openFilm } from './probe.mjs';
const { browser, page, server } = await openFilm('index.html?scale=0.25');
const s = await page.evaluate(() => Array.from({ length: 3150 }, (_, f) => window.blurSamples(f / 30)));
const runs = []; let a = -1;
for (let f = 0; f <= 3150; f++) { const on = f < 3150 && s[f] > 1; if (on && a < 0) a = f; if (!on && a >= 0) { runs.push([a, f]); a = -1; } }
console.log(JSON.stringify(runs)); console.error('images floutées :', runs.reduce((n, r) => n + r[1] - r[0], 0), 'en', runs.length, 'plages');
await browser.close(); server.close();
