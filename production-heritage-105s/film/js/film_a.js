// film_a.js — Plans 01 à 03 : prologue lumineux, révélation de la couverture, ouverture physique du livre.
import * as THREE from 'three';
import { E, kf, seg, lerp, clamp, canvasTex, TOK, spring } from './core.js';
import { BOOK } from './book.js';
import { el, splitWords, riseWords, show, tf, block, env } from './hud.js';

export function buildA(ctx) {
  const { stage, book, mirror } = ctx;

  // ---------- Balayage lumineux sur la couverture (une seule fois, plan 02) ----------
  const sweepTex = canvasTex(512, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0.30, 'rgba(255,255,255,0)'); gr.addColorStop(0.47, 'rgba(255,255,255,0.20)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.53, 'rgba(255,255,255,0.20)'); gr.addColorStop(0.70, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { scale: 1, aniso: 1 });
  sweepTex.wrapS = sweepTex.wrapT = THREE.ClampToEdgeWrapping; sweepTex.rotation = -0.35; sweepTex.center.set(0.5, 0.5);
  const sweepGeo = new THREE.PlaneGeometry(BOOK.w, BOOK.h); sweepGeo.rotateX(-Math.PI / 2);
  const sweep = new THREE.Mesh(sweepGeo, new THREE.MeshBasicMaterial({ map: sweepTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sweep.position.set((BOOK.w + BOOK.over + BOOK.tb) / 2 - BOOK.tb - BOOK.over / 2, BOOK.tb / 2 + 0.003, 0); ctx.book.frontBoard.add(sweep);

  // ---------- HUD plan 01 : épigraphe du livre (Colossiens 1:12, texte du PDF p.16/19/452) ----------
  const verse = el(`left:330px; top:168px; width:1260px; text-align:center; font-family:'Lora',serif; font-style:italic; font-weight:500; font-size:47px; line-height:1.36; color:${TOK.ink}; letter-spacing:-0.005em;`,
    `« Rendez grâces au Père, qui vous a rendus capables<br>d’avoir part à l’héritage des saints dans la lumière. »`);
  const verseWords = splitWords(verse);
  const verseRef = el(`left:330px; top:334px; width:1260px; text-align:center; font-weight:600; font-size:19px; letter-spacing:0.34em; color:${TOK.goldDeep};`, `COLOSSIENS 1:12`);
  const verseRule = el(`left:920px; top:314px; width:80px; height:2px; background:${TOK.orange}; transform-origin:center;`);

  // ---------- HUD plan 02 : identité du livre (libellés de la 4e de couverture, PDF p.452) ----------
  const idGlass = el(`left:872px; top:214px; width:900px; height:604px; border-radius:40px; background:linear-gradient(180deg, rgba(255,255,255,0.80), rgba(244,249,255,0.70)); border:1.5px solid rgba(255,255,255,0.95); box-shadow:0 30px 70px rgba(11,46,109,0.13), inset 0 0 0 1px rgba(20,102,196,0.10);`);
  const idWrap = el(`left:930px; top:268px; width:820px;`);
  const idKicker = el(`left:0; top:0; width:820px; font-weight:700; font-size:17px; letter-spacing:0.22em; color:${TOK.blue};`, `ENSEIGNEMENT · DOCTRINE · INITIATION PROPHÉTIQUE`, idWrap);
  const idT1 = el(`left:0; top:44px; width:820px; font-weight:800; font-size:78px; line-height:1.04; letter-spacing:-0.025em; color:${TOK.ink};`, `L’Héritage des saints`, idWrap);
  const idT2 = el(`left:0; top:128px; width:820px; font-weight:800; font-size:78px; line-height:1.04; letter-spacing:-0.025em; color:${TOK.blue};`, `dans la lumière`, idWrap);
  const idW1 = splitWords(idT1), idW2 = splitWords(idT2);
  const idRule = el(`left:2px; top:240px; width:96px; height:4px; border-radius:2px; background:${TOK.orange}; transform-origin:left center;`, '', idWrap);
  const idDesc = el(`left:0; top:270px; width:760px; font-family:'Lora',serif; font-style:italic; font-size:29px; line-height:1.42; color:#2b3d66;`, `Un ouvrage spirituel, doctrinal et d’initiation prophétique, développé en quinze chapitres.`, idWrap);
  const idA1 = el(`left:0; top:388px; width:820px; font-weight:700; font-size:35px; letter-spacing:-0.01em; color:${TOK.ink};`, `Docteur B. Silas Gbavou`, idWrap);
  const idA2 = el(`left:0; top:438px; width:820px; font-weight:700; font-size:35px; letter-spacing:-0.01em; color:${TOK.ink};`, `Pasteur M. Appolos Gbavou`, idWrap);

  // ---------- HUD plan 03 : étiquette de page (index PDF réel) ----------
  const TAGS = [
    [22.2, 23.9, 'PAGE 2', 'Page de titre'],
    [24.6, 25.4, 'PAGES 3 – 4', 'Mentions · Sommaire'],
    [26.5, 28.5, 'PAGES 15 – 16', 'Index · Avant-propos'],
    [29.2, 30.5, 'PAGES 19 – 20', 'Partie 1 · Chapitre 1'],
  ];
  const tags = TAGS.map(([a, b, k, v]) => {
    const n = el(`left:96px; top:918px; height:66px; padding:0 30px 0 26px; display:flex; align-items:center; gap:18px; background:rgba(255,255,255,0.86); border:1.5px solid rgba(20,102,196,0.28); border-radius:33px; box-shadow:0 10px 30px rgba(11,46,109,0.14);`,
      `<span style="font-weight:800;font-size:20px;letter-spacing:0.16em;color:${TOK.blue};white-space:nowrap">${k}</span><span style="width:1.5px;height:26px;background:${TOK.orange}"></span><span style="font-weight:600;font-size:25px;color:${TOK.ink};white-space:nowrap">${v}</span>`);
    return { n, a, b };
  });

  // ---------- Temps forts ----------
  const LEAF = [];                       // [début, durée] de chaque feuille (ordre exact du PDF)
  LEAF.push([23.75, 1.05]);              // p.2/3
  for (let i = 0; i < 6; i++) LEAF.push([25.0 + i * 0.14, 0.86]);   // feuilletage p.4/5 … p.14/15 (stagger 140 ms)
  LEAF.push([28.3, 0.95]); LEAF.push([28.56, 0.95]);                // p.16/17, p.18/19
  ctx.cues.pageTurns = LEAF.map(([a]) => a + 0.25);
  ctx.cues.coverOpen = 21.2;

  function update(t) {
    const on = t < 31.05;
    book.root.visible = on || t >= 86.5; mirror.root.visible = (t < 20.9) || t >= 86.5;
    if (on) {
      // pose du livre
      const stand = 1 - E.io3(seg(t, 19.1, 21.0));
      const yaw = t < 8 ? kf([[0, -0.95], [5, -0.80, E.lin], [8, -0.436, E.io2]], t) : t < 19.1 ? kf([[8, -0.436], [13.3, 0.215, E.back], [19.1, 0.15, E.io2]], t) : kf([[19.1, 0.15], [21.2, 0, E.io3]], t);
      const x = kf([[19.1, 0], [21.1, 1.05, E.io3]], t), z = kf([[19.1, 0], [21.1, 0.15, E.io3]], t);
      const lift = 0.0;
      const pose = { stand, yaw, x, z, lift };
      book.setPose(pose); mirror.setPose(pose);
      // ouverture de la couverture (anticipation légère)
      const open = E.antic(seg(t, 21.2, 23.0));
      book.setOpen(open);
      for (let k = 0; k < LEAF.length; k++) book.setLeaf(k, seg(t, LEAF[k][0], LEAF[k][0] + LEAF[k][1]));
      // balayage lumineux
      const sw = seg(t, 12.1, 13.7); sweep.material.opacity = Math.sin(Math.PI * sw) * 0.9; sweepTex.offset.x = lerp(0.75, -0.75, E.io2(sw)); sweep.visible = sw > 0 && sw < 1;
      // filets d'or : tracé vers le point de fuite
      const L = 96 * E.io3(seg(t, 0.3, 5.6));
      for (const m of stage.goldLines) { m.scale.z = Math.max(0.001, L); m.position.z = 72 - L / 2; }
      ctx.goldFade = 1 - 0.7 * E.io2(seg(t, 11.5, 13.5)) - 0.3 * E.io2(seg(t, 19.2, 20.6));
      stage.sun.scale.setScalar(1 + 0.04 * Math.sin(t * 0.9)); stage.sunWarm.scale.setScalar(1 + 0.06 * Math.sin(t * 0.7 + 1));
      stage.lights.key.target.position.set(x * 0.4, 0, z); stage.lights.key.position.set(x * 0.4 - 6, 11, z + 9);
    }

    // ----- HUD 01
    const vOut = E.i2(seg(t, 6.5, 7.2));
    show(verse, t < 7.25 ? 1 - vOut : 0); riseWords(verseWords, t, 1.0, { stagger: 0.07, dur: 0.8 }); tf(verse, { y: -vOut * 16 });
    show(verseRef, Math.min(E.o3(seg(t, 2.7, 3.4)), 1 - vOut)); tf(verseRef, { y: (1 - E.o5(seg(t, 2.7, 3.5))) * 12 - vOut * 16 });
    show(verseRule, t < 7.25 ? 1 - vOut : 0); verseRule.style.transform = `scaleX(${E.o5(seg(t, 2.4, 3.2)).toFixed(4)}) translateY(${(-vOut * 16).toFixed(2)}px)`;

    // ----- HUD 02
    const a0 = 14.0, b0 = 18.7; const out = E.i2(seg(t, b0 - 0.45, b0));
    show(idWrap, t > a0 - 0.05 && t < b0 ? 1 - out : 0); tf(idWrap, { y: -out * 14 });
    const gi = E.o5(seg(t, a0 - 0.25, a0 + 0.55)); show(idGlass, t < b0 ? gi * (1 - out) : 0); tf(idGlass, { y: (1 - gi) * 26 - out * 14, s: lerp(0.97, 1, gi) });
    show(idKicker, E.o3(seg(t, a0, a0 + 0.5))); tf(idKicker, { y: (1 - E.o5(seg(t, a0, a0 + 0.6))) * 14 });
    riseWords(idW1, t, a0 + 0.18, { stagger: 0.08, dur: 0.75 }); riseWords(idW2, t, a0 + 0.42, { stagger: 0.08, dur: 0.75 });
    idRule.style.transform = `scaleX(${E.o5(seg(t, a0 + 0.8, a0 + 1.5)).toFixed(4)})`;
    show(idDesc, E.o3(seg(t, a0 + 1.0, a0 + 1.6))); tf(idDesc, { y: (1 - E.o5(seg(t, a0 + 1.0, a0 + 1.7))) * 16 });
    show(idA1, E.o3(seg(t, a0 + 1.5, a0 + 2.0))); tf(idA1, { y: (1 - E.o5(seg(t, a0 + 1.5, a0 + 2.2))) * 16 });
    show(idA2, E.o3(seg(t, a0 + 1.66, a0 + 2.16))); tf(idA2, { y: (1 - E.o5(seg(t, a0 + 1.66, a0 + 2.36))) * 16 });

    // ----- HUD 03
    for (const g of tags) block(g.n, t, g.a, g.b, { dy: 16, fin: 0.45, fout: 0.3 });
  }

  // ---------- Caméra (focales en mm, capteur 36 mm) ----------
  function cam(t) {
    if (t < 8) {
      const u = E.io2(seg(t, 0, 8.6));           // dolly-in continu, la décélération finale déborde sur le plan 02
      return { pos: [0.0, lerp(3.5, 2.55, u), lerp(64, 14.2, u)], look: [0, lerp(2.6, 1.85, u), 0], focal: lerp(30, 40, u) };
    }
    if (t < 19.1) {
      const k = [[8, [0, 2.6, 15.2, 0, 1.9, 0, 40]], [11.8, [0.25, 2.1, 9.7, 0.3, 1.62, 0, 50], E.o3], [14.3, [1.95, 2.0, 9.4, 1.78, 1.6, 0, 50], E.io3], [19.1, [2.45, 2.2, 8.95, 1.82, 1.55, 0, 50], E.io2]];
      // raccord de vitesse avec le plan 01
      const u0 = E.io2(8 / 8.6); k[0][1] = [0, lerp(3.5, 2.55, u0), lerp(64, 14.2, u0), 0, lerp(2.6, 1.85, u0), 0, lerp(30, 40, u0)];
      const v = kf(k, t); return { pos: [v[0], v[1], v[2]], look: [v[3], v[4], v[5]], focal: v[6] };
    }
    const k = [[19.1, [2.45, 2.2, 8.95, 1.82, 1.55, 0, 50]], [21.6, [0.62, 7.3, 5.5, 0.0, 0.15, 0.2, 45], E.io3], [26.6, [-0.2, 6.1, 4.75, -0.05, 0.15, 0.12, 45], E.io2], [28.4, [-0.5, 5.9, 4.7, -0.05, 0.15, 0.1, 45], E.io2], [29.6, [-1.0, 6.3, 5.2, -0.3, 0.15, 0.1, 47], E.io2], [31.0, [-1.02, 0.78, -0.62, -1.02, 0.16, -0.86, 47], E.i3]];
    const v = kf(k, t); return { pos: [v[0], v[1], v[2]], look: [v[3], v[4], v[5]], focal: v[6] };
  }
  function mood(t) {
    const wash = E.i2(seg(t, 30.5, 31.0));
    return { night: 0, hallVis: 1, gold: ctx.goldFade == null ? 1 : ctx.goldFade, glow: 1, floorVis: 1, fogNear: lerp(34, 26, seg(t, 0, 8)), fogFar: 125, bloomStrength: 0.34, wash, washCol: [1, 1, 1] };
  }
  // sous-échantillons de flou de mouvement (hors plages de lecture)
  function blur(t) { if (t > 25.0 && t < 26.5) return 3; if (t > 30.2) return 3; if ((t > 19.2 && t < 21.4) || (t > 23.8 && t < 24.7) || (t > 28.3 && t < 29.4)) return 2; return 1; }
  return { update, cam, mood, blur };
}
