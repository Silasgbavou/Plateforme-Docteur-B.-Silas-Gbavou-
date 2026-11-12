// main.js — chef d'orchestre : chargement, timeline 105 s (8 plans), seek(t) déterministe, rendu image par image, aperçu interactif.
import * as THREE from 'three';
import { createStage, setCamera } from './stage.js';
import { createBook } from './book.js';
import { loadTex, loadPage, pageUrl, FPS, DURATION, clamp } from './core.js';
import { buildA } from './film_a.js';
import { buildB } from './film_b.js';
import { buildC } from './film_c.js';

const stage = createStage(document.getElementById('gl'));
await Promise.all(['700 46px Cinzel', '500 20px Inter', '700 20px Inter', '800 20px Inter', '500 20px Lora', 'italic 500 20px Lora'].map(f => document.fonts.load(f)));
await document.fonts.ready;

// ---- Textures : rendus directs des pages du PDF (voir tools/extract_assets.py) ----
const PAGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 29, 30, 35, 68, 100, 168, 281, 33, 141, 142, 184, 221, 282, 287, 302, 351, 417];
const pages = {};
const [cover, back, pSilas, pAppolos, icons] = await Promise.all([
  loadTex(pageUrl(1)), loadTex(pageUrl(452)), loadTex('assets/img/portrait_silas.jpg'), loadTex('assets/img/portrait_appolos.jpg'), fetch('assets/icons.json').then(r => r.json()),
  ...PAGES.map(async n => { pages[n] = await loadPage(pageUrl(n)); }),
]);
const tex = { cover, back, pages, pSilas, pAppolos, icons };

// ---- Livre principal (feuilles p.2 à p.19 dans l'ordre du PDF), clone miroir (réflexion au sol), second exemplaire (4e de couverture) ----
const leaves = []; for (let n = 2; n <= 18; n += 2) leaves.push([n, n + 1]);
const book = createBook(tex, { leaves, blockTop: 20 }); stage.scene.add(book.root);
const mirrorG = new THREE.Group(); mirrorG.scale.y = -1; stage.scene.add(mirrorG);
const mirror = createBook(tex, { shadows: false }); mirrorG.add(mirror.root);
const book2 = createBook(tex, { shadows: true }); stage.scene.add(book2.root);
const mirror2 = createBook(tex, { shadows: false }); mirrorG.add(mirror2.root);
book2.root.visible = false; mirror2.root.visible = false;

const ctx = { stage, tex, book, mirror, book2, mirror2, cues: {} };
const A = buildA(ctx), B = buildB(ctx), C = buildC(ctx);
const parts = [A, B, C];
const partAt = t => t < 31 ? A : t < 76 ? B : C;

// Table des plans (base : 04_STORYBOARD/PLAN_PAR_PLAN.csv)
export const SHOTS = [
  [0, 8, '01 Prologue lumineux'], [8, 19, '02 Révélation couverture'], [19, 31, '03 Ouverture physique'], [31, 45, '04 Lecture pédagogique'],
  [45, 61, '05 Architecture doctrinale'], [61, 76, '06 Immersion dans les pages'], [76, 88, '07 Présentation des auteurs'], [88, 105, '08 Signature et contacts'],
];

const washC = new THREE.Color();
function seek(t) {
  t = clamp(t, 0, DURATION);
  for (const p of parts) p.update(t);
  const P = partAt(t);
  setCamera(stage.camera, P.cam(t));
  const m = P.mood(t);
  stage.setMood(m);
  stage.outMat.uniforms.wash.value = m.wash || 0;
  const wc = m.washCol || [1, 1, 1]; stage.outMat.uniforms.washCol.value.setRGB(wc[0], wc[1], wc[2]);
  stage.outMat.uniforms.vig.value = m.vig == null ? 0.14 : m.vig;
}
window.seek = seek;
window.blurSamples = t => partAt(t).blur(t);
// Rendu d'une image : frame entier ; samples = null -> flou de mouvement adaptatif défini par plan
window.renderFrame = (frame, samples = null) => {
  const t = frame / FPS; const n = samples == null ? window.blurSamples(t) : samples;
  stage.render(t, frame, n, seek);
};
window.FILM = { fps: FPS, duration: DURATION, frames: FPS * DURATION, shots: SHOTS, cues: ctx.cues };
window.stage = stage;

// ---- Aperçu interactif : Espace = lecture/pause, ←/→ = image précédente/suivante (Maj = 1 s), R = retour au début, ?t= pour ouvrir à un instant ----
const info = document.getElementById('preview');
let frame = Math.round((parseFloat(new URLSearchParams(location.search).get('t')) || 0) * FPS), playing = false, t0 = 0, f0 = 0;
function draw() { window.renderFrame(frame, 1); const t = frame / FPS; const s = SHOTS.find(s => t >= s[0] && t < s[1]) || SHOTS[7]; info.textContent = `${t.toFixed(2)} s · image ${frame} · ${s[2]}`; }
function loop(now) { if (!playing) return; frame = Math.min(FPS * DURATION - 1, f0 + Math.floor((now - t0) / 1000 * FPS)); draw(); if (frame >= FPS * DURATION - 1) playing = false; else requestAnimationFrame(loop); }
addEventListener('keydown', e => {
  if (e.code === 'Space') { playing = !playing; if (playing) { t0 = performance.now(); f0 = frame; requestAnimationFrame(loop); } e.preventDefault(); }
  else if (e.code === 'ArrowRight') { playing = false; frame = Math.min(FPS * DURATION - 1, frame + (e.shiftKey ? FPS : 1)); draw(); }
  else if (e.code === 'ArrowLeft') { playing = false; frame = Math.max(0, frame - (e.shiftKey ? FPS : 1)); draw(); }
  else if (e.code === 'KeyR') { playing = false; frame = 0; draw(); }
});
draw();
window.ready = true;
