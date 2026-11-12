// film_b.js — Plans 04 à 06 (ambiance « nuit bleue » de la couverture) : lecture pédagogique, architecture doctrinale, carrousel des pages réelles.
import * as THREE from 'three';
import { E, kf, seg, lerp, clamp, canvasTex, TOK, roundedPlane, roundedFrame, glowSprite, shadowPlane, roundRect, wrapText, spring } from './core.js';
import { el, show, tf, block, splitWords, riseWords } from './hud.js';

const PAGE_AR = 841.92 / 594.96;        // hauteur / largeur d'une page A4 du PDF

// Fenêtre de lecture : défilement vertical masqué de une ou deux pages réelles (aucun texte recomposé).
function readerMaterial(texA, texB, view) {
  return new THREE.ShaderMaterial({
    uniforms: { texA: { value: texA }, texB: { value: texB || texA }, scroll: { value: 0 }, view: { value: view }, two: { value: texB ? 1 : 0 }, dim: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D texA, texB; uniform float scroll, view, two, dim; varying vec2 vUv;
      void main(){
        float gap = 0.022;
        float y = scroll + (1.0 - vUv.y) * view;                 // position verticale en « pages » depuis le haut de la page A
        vec3 a = texture2D(texA, vec2(vUv.x, 1.0 - y), -0.4).rgb;
        float y2 = y - 1.0 - gap;
        vec3 b = texture2D(texB, vec2(vUv.x, 1.0 - y2), -0.4).rgb;
        vec3 sep = vec3(0.80, 0.86, 0.95);
        vec3 c = y <= 1.0 ? a : (y2 < 0.0 || two < 0.5 ? sep : b);
        if (y < 0.0 || (two > 0.5 && y2 > 1.0) || (two < 0.5 && y > 1.0)) c = sep;
        c = pow(c, vec3(2.2));                                    // filtrage en espace gamma puis linéarisation (texte dense)
        float edge = smoothstep(0.0, 0.035, vUv.y) * smoothstep(0.0, 0.035, 1.0 - vUv.y);   // ombre intérieure haut/bas de la fenêtre
        c *= mix(0.86, 1.0, edge) * dim;
        gl_FragColor = vec4(c, 1.0);
      }`,
    toneMapped: false,
  });
}

export function buildB(ctx) {
  const { stage, tex } = ctx; const P = tex.pages;
  const world = new THREE.Group(); stage.scene.add(world);

  // =====================================================================================
  // PLAN 04 — trois panneaux de verre, pages 29→30, 35 et 68
  // =====================================================================================
  const WW = 5.0, WH = 4.0, VIEW = (WH / WW) / PAGE_AR;      // fraction de hauteur de page visible dans la fenêtre
  const glassMat = () => new THREE.MeshBasicMaterial({ color: 0x9cc4ff, transparent: true, opacity: 0.13, depthWrite: false, toneMapped: false });
  const lineMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.35, 1.6), transparent: true, opacity: 0.9, toneMapped: false });
  const goldMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.05, 0.38), transparent: true, opacity: 1, toneMapped: false, depthTest: false });

  function headerTex(chip, title) {
    return canvasTex(1000, 104, (g, w, h) => {
      g.font = '800 30px Inter'; const cw = g.measureText(chip).width + 44;
      roundRect(g, 2, 26, cw, 54, 27); g.fillStyle = 'rgba(233,180,76,0.95)'; g.fill();
      g.fillStyle = '#061a55'; g.textBaseline = 'middle'; g.fillText(chip, 24, 54);
      g.font = '600 32px Inter'; g.fillStyle = '#ffffff'; g.fillText(title, cw + 26, 54, w - cw - 40);
    }, { scale: 2 });
  }
  function makeReader({ texA, texB, chip, title, hi }) {
    const g = new THREE.Group();
    const GW = WW + 0.56, GH = WH + 1.32;
    const glow = glowSprite(13, 0x2a6fe0, 0.22); glow.position.z = -0.4; g.add(glow);
    const glass = new THREE.Mesh(roundedPlane(GW, GH, 0.3), glassMat()); glass.position.set(0, 0, -0.05); glass.renderOrder = 1; g.add(glass);
    const frame = new THREE.Mesh(roundedFrame(GW, GH, 0.3, 0.024, 0.012), lineMat()); frame.position.z = -0.05; frame.renderOrder = 2; g.add(frame);
    const mat = readerMaterial(texA, texB, VIEW);
    const win = new THREE.Mesh(roundedPlane(WW, WH, 0.1), mat); win.position.set(0, -0.3, 0); win.renderOrder = 3; g.add(win);
    const head = new THREE.Mesh(new THREE.PlaneGeometry(WW, WW * 104 / 1000), new THREE.MeshBasicMaterial({ map: headerTex(chip, title), transparent: true, depthWrite: false, toneMapped: false }));
    head.position.set(0, WH / 2 - 0.3 + 0.38, 0.01); head.renderOrder = 4; g.add(head);
    // surlignage externe (cadre doré + coins), jamais incrusté dans la page
    const hg = new THREE.Group(); hg.renderOrder = 6; g.add(hg);
    const hw = (hi.box[2] - hi.box[0]) * WW, hh = (hi.box[3] - hi.box[1]) / VIEW * WH;
    const hframe = new THREE.Mesh(roundedFrame(hw, hh, 0.09, 0.028, 0.004), goldMat()); hframe.renderOrder = 6; hg.add(hframe);
    const hglow = new THREE.Mesh(roundedFrame(hw + 0.1, hh + 0.1, 0.13, 0.085, 0.002), new THREE.MeshBasicMaterial({ color: 0xe9b44c, transparent: true, opacity: 0.22, depthTest: false, toneMapped: false })); hglow.renderOrder = 5; hg.add(hglow);
    const hcx = ((hi.box[0] + hi.box[2]) / 2 - 0.5) * WW;
    const yOf = (yPage, scroll) => -0.3 + (0.5 - (hi.page + yPage - scroll) / VIEW) * WH;   // hi.page = 0 (page A) ou 1 + interpage (page B)
    return { g, mat, win, hg, hframe, hglow, glass, frame, head, glow, hi, hcx, hh, hcy: (scroll) => yOf((hi.box[1] + hi.box[3]) / 2, scroll) };
  }
  const R = [
    makeReader({ texA: P[29], texB: P[30], chip: 'p. 29 – 30', title: 'Chapitre 1 · L’Évangile de la croix', hi: { page: 1.022, box: [0.075, 0.176, 0.925, 0.532] } }),
    makeReader({ texA: P[35], texB: null, chip: 'p. 35', title: 'Chapitre 1 · Section 5', hi: { page: 0, box: [0.075, 0.336, 0.925, 0.498] } }),
    makeReader({ texA: P[68], texB: null, chip: 'p. 68', title: 'Chapitre 2 · Tableau 1', hi: { page: 0, box: [0.075, 0.084, 0.925, 0.350] } }),
  ];
  const RPOS = [[-6.1, 0.2, 0.0, 0.24], [0, 0.2, -0.9, 0], [6.1, 0.2, 0.0, -0.24]];   // x, y, z, lacet
  R.forEach((r, i) => { world.add(r.g); });
  // défilements : [t0, t1, de, vers] (vitesse variable, arrêt sur l'élément authentique)
  const SCROLL = [[33.0, 34.6, 0.50, 1.072], [37.3, 38.4, 0.47, 0.113], [41.0, 42.0, 0.40, -0.03]];
  const HOLD = [[34.6, 36.9], [38.4, 40.7], [42.0, 44.15]];
  ctx.cues.readStops = HOLD.map(h => h[0]);

  // point de vue face à un panneau : (dx, dy) dans le plan du panneau, d = distance
  function facing(i, dx, dy, d) {
    const [x, y, z, yaw] = RPOS[i]; const c = Math.cos(yaw), s = Math.sin(yaw);
    return { pos: [x + dx * c + d * s, y + dy, z - dx * s + d * c], look: [x + dx * c, y + dy, z - dx * s] };
  }
  const camPose = (o, focal) => [...o.pos, ...o.look, focal];

  // légendes (libellés exacts du PDF)
  const capCss = `left:0; top:948px; width:1920px; display:flex; justify-content:center;`;
  const cap = (k, v) => `<div style="display:flex;align-items:center;gap:18px;height:64px;padding:0 32px 0 12px;border-radius:32px;background:rgba(4,16,58,0.78);border:1.5px solid rgba(233,180,76,0.55);box-shadow:0 12px 34px rgba(0,0,0,0.35)"><span style="height:42px;padding:0 18px;border-radius:21px;background:${TOK.gold};color:#061a55;font-weight:800;font-size:19px;letter-spacing:0.12em;display:flex;align-items:center;white-space:nowrap">${k}</span><span style="font-weight:600;font-size:25px;color:#fff;white-space:nowrap">${v}</span></div>`;
  const caps4 = [
    [el(capCss, cap('FIGURE 1 · PAGE 30', 'Les deux dimensions du ciel ouvertes par la croix')), 34.7, 36.8],
    [el(capCss, cap('SECTION 5 · PAGE 35', 'La capacité d’avoir part à l’héritage des saints')), 38.5, 40.6],
    [el(capCss, cap('TABLEAU 1 · PAGE 68', 'Le désert, chemin vers l’héritage')), 42.1, 44.0],
  ];

  // =====================================================================================
  // PLAN 05 — quatre parties (titres, chapitres et épigraphes relevés aux pages 19, 100, 168, 281 et au sommaire p.4-13)
  // =====================================================================================
  const PARTS = [
    { n: 1, title: 'L’héritage des saints dans la lumière', ref: 'COLOSSIENS 1:12', page: 19, ch: ['1 · L’héritage des saints et l’Évangile de la croix', '2 · Lumières d’en haut, lumières d’en bas et le nom nouveau', '3 · Le droit légal des fils dans le royaume de la lumière'] },
    { n: 2, title: 'Le pouvoir des fils de la lumière', ref: 'JEAN 1:12', page: 100, ch: ['4 · Le pouvoir spirituel, héritage des fils de Dieu', '5 · Les suprêmes pouvoirs des fils dans l’univers de la lumière', '6 · Le discernement du royaume et les sens de l’esprit'] },
    { n: 3, title: 'Le ministère des anges dans le mouvement prophétique', ref: 'HÉBREUX 1:14', page: 168, ch: ['7 · Le ministère des anges dans le mouvement prophétique', '8 · Les chérubins, les séraphins et la crainte de Dieu', '9 · L’atmosphère prophétique et les manifestations angéliques', '10 · La hiérarchie angélique descendante et ascendante'] },
    { n: 4, title: 'Le royaume prophétique et les échelles d’ascension', ref: 'AMOS 3:7', page: 281, ch: ['11 · La voix de Dieu, la lumière et les eaux', '12 · Le royaume prophétique, un ciel parmi les cieux', '13 · L’univers de la transfiguration prophétique', '14 · Le monde de la nuit et les sentinelles de nuit', '15 · Alliances, autels et échelles d’ascension'] },
  ];
  const CW = 7.4, CH = 4.0, CPX = 1480, CPY = 800;
  function cardTex(p) {
    const right = p.n % 2 === 0;       // numéro extérieur : à gauche pour 1 et 3, à droite pour 2 et 4
    return canvasTex(CPX, CPY, (g, w, h) => {
      roundRect(g, 0, 0, w, h, 78); const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#eef4fd'); g.fillStyle = bg; g.fill();
      // équerre bleue d'angle (grammaire de la référence « quatre modules »)
      g.save(); roundRect(g, 0, 0, w, h, 78); g.clip();
      g.lineWidth = 26; const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1466c4'); gr.addColorStop(1, '#45b2fe'); g.strokeStyle = gr;
      const top = p.n <= 2; const x0 = right ? w - 13 : 13, y0 = top ? 13 : h - 13;
      g.beginPath(); g.moveTo(right ? w - 330 : 330, y0); g.lineTo(right ? w - 91 : 91, y0); g.arcTo(x0, y0, x0, top ? 91 : h - 91, 78); g.lineTo(x0, top ? 300 : h - 300); g.stroke();
      g.restore();
      // grand numéro en filet
      g.font = '800 560px Inter'; g.textBaseline = 'alphabetic'; g.lineWidth = 5; g.strokeStyle = 'rgba(20,102,196,0.42)'; g.textAlign = 'center';
      g.lineWidth = 11; g.strokeText(String(p.n), right ? w - 205 : 205, 610); g.fillStyle = '#f6f9fe'; g.fillText(String(p.n), right ? w - 205 : 205, 610);   // filet extérieur seul
      const tx = right ? 96 : 400, tw = w - 400 - 96;
      g.textAlign = 'left'; g.textBaseline = 'top';
      g.font = '800 30px Inter'; g.fillStyle = TOK.orange; g.fillText('P A R T I E   ' + p.n, tx, 84);
      g.fillStyle = TOK.orange; g.fillRect(tx, 134, 84, 5);
      g.font = '800 62px Inter'; g.fillStyle = TOK.ink; const th = wrapText(g, p.title, tx, 166, tw, 72);
      let y = 166 + th + 30;
      g.font = '500 31px Inter'; g.fillStyle = '#35486f';
      for (const c of p.ch) { g.fillStyle = '#35486f'; wrapText(g, c, tx, y, tw, 40); y += 47; }
      g.font = '700 25px Inter'; g.fillStyle = TOK.blue; g.fillText(`ÉPIGRAPHE · ${p.ref}`.split('').join(' '), tx, h - 84);
      g.textAlign = 'right'; g.fillStyle = '#7b8bab'; g.font = '600 25px Inter'; g.fillText(`page ${p.page}`, tx + tw, h - 84);
    }, { scale: 1.5 });
  }
  const cards = PARTS.map((p, i) => {
    const g = new THREE.Group();
    const face = new THREE.Mesh(roundedPlane(CW, CH, CW * 78 / CPX), new THREE.MeshBasicMaterial({ map: cardTex(p), transparent: true, toneMapped: false }));
    const sh = shadowPlane(CW * 1.12, CH * 1.22, 0.5, 0x000a2e); sh.position.set(0.06, -0.2, -0.3);
    const edge = new THREE.Mesh(roundedFrame(CW + 0.05, CH + 0.05, CW * 78 / CPX + 0.02, 0.03, 0.01), lineMat()); edge.position.z = -0.02;
    g.add(sh); g.add(face); g.add(edge); world.add(g);
    const cx = (i % 2 === 0 ? -1 : 1) * 3.95, cy = 0.3 + (i < 2 ? 1 : -1) * 2.2;
    return { g, face, sh, edge, cx, cy };
  });
  const FOCUS = [null, null, [47.6, 53.4], [53.4, 59.9]];   // calé sur la voix off : parties 3 (anges) et 4 (royaume prophétique) ; parties 1 et 2 portées par le plan 04     // durées proportionnelles à la longueur des titres dits par la voix     // un temps par partie (calé sur la voix)
  ctx.cues.partFocus = FOCUS.filter(Boolean).map(f => f[0]);
  const head5 = el(`left:0; top:468px; width:1920px; text-align:center; font-weight:800; font-size:86px; letter-spacing:-0.03em; color:#fff;`, `Quatre parties. <span style="color:${TOK.gold}">Quinze chapitres.</span>`);
  const head5w = splitWords(head5);

  // =====================================================================================
  // PLAN 06 — carrousel 3D de dix pages réelles (ordre croissant du PDF)
  // =====================================================================================
  const RING = [33, 141, 142, 184, 221, 282, 287, 302, 351, 417];
  const ZC = -30, RR = 7.2, PW = 3.6, PH = PW * PAGE_AR, STEP = Math.PI * 2 / RING.length;
  const ring = new THREE.Group(); world.add(ring);
  const backMat = new THREE.MeshBasicMaterial({ color: 0x2456b8, transparent: true, opacity: 0.55, side: THREE.BackSide, toneMapped: false });
  const ringItems = RING.map((n, i) => {
    const g = new THREE.Group();
    const m = new THREE.ShaderMaterial({
      uniforms: { map: { value: P[n] }, dim: { value: 1 } }, toneMapped: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform float dim; varying vec2 vUv; void main(){ vec3 c = pow(texture2D(map, vUv, -0.4).rgb, vec3(2.2)) * dim; gl_FragColor = vec4(c, 1.0); }`,
    });
    const page = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), m);
    const plate = new THREE.Mesh(roundedPlane(PW + 0.36, PH + 0.36, 0.2), glassMat()); plate.position.z = -0.04; plate.material.opacity = 0.2; plate.material.side = THREE.DoubleSide;
    const edge = new THREE.Mesh(roundedFrame(PW + 0.36, PH + 0.36, 0.2, 0.022, 0.01), lineMat()); edge.position.z = -0.04;
    const bk = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), backMat); bk.position.z = -0.01;
    g.add(plate); g.add(bk); g.add(page); g.add(edge); ring.add(g);
    return { g, m, n };
  });
  const iOf = n => RING.indexOf(n);
  // surlignages externes du carrousel
  const HI6 = [
    { n: 142, box: [0.08, 0.437, 0.92, 0.668], a: 64.0, b: 66.2, cap: ['FIGURE 6 · PAGE 142', 'Pour voir, pourvoir, pouvoir'] },
    { n: 287, box: [0.08, 0.160, 0.92, 0.593], a: 67.9, b: 70.1, cap: ['ILLUSTRATION 11 · PAGE 287', '« Que la lumière soit ! »'] },
    { n: 302, box: [0.08, 0.086, 0.92, 0.437], a: 71.1, b: 73.3, cap: ['FIGURE 12 · PAGE 302', 'Le royaume prophétique parmi les cieux'] },
  ];
  HI6.forEach(h => {
    const w = (h.box[2] - h.box[0]) * PW, hh = (h.box[3] - h.box[1]) * PH;
    h.frame = new THREE.Mesh(roundedFrame(w, hh, 0.07, 0.024, 0.004), goldMat()); h.frame.renderOrder = 6;
    h.cy = (0.5 - (h.box[1] + h.box[3]) / 2) * PH; h.frame.position.set(((h.box[0] + h.box[2]) / 2 - 0.5) * PW, h.cy, 0.02);
    ringItems[iOf(h.n)].g.add(h.frame);
    h.el = el(`left:1262px; top:418px; width:520px; padding:30px 34px 34px; border-radius:30px; background:rgba(4,16,58,0.82); border:1.5px solid rgba(233,180,76,0.55); box-shadow:0 18px 44px rgba(0,0,0,0.38);`,
      `<div style="display:inline-flex;height:42px;padding:0 18px;border-radius:21px;background:${TOK.gold};color:#061a55;font-weight:800;font-size:18px;letter-spacing:0.12em;align-items:center;white-space:nowrap">${h.cap[0]}</div><div style="margin-top:20px;font-weight:700;font-size:38px;line-height:1.18;letter-spacing:-0.015em;color:#fff">${h.cap[1]}</div><div style="margin-top:18px;width:70px;height:4px;border-radius:2px;background:${TOK.orange}"></div>`);
  });
  ctx.cues.ringStops = HI6.map(h => h.a);
  const deg = d => d * Math.PI / 180;
  const PHI = [[61.0, deg(64)], [63.5, -2 * STEP, E.o5], [66.2, -2 * STEP, E.lin], [67.8, -6 * STEP, E.io5], [70.1, -6 * STEP, E.lin], [71.0, -7 * STEP, E.io3], [73.3, -7 * STEP, E.lin], [76.0, -7 * STEP - deg(520), E.i3]];

  // =====================================================================================
  function update(t) {
    const on = t >= 30.9 && t < 76.1; world.visible = on; if (!on) { for (const c of caps4) show(c[0], 0); for (const h of HI6) show(h.el, 0); show(head5, 0); return; }

    // ----- Plan 04
    const on4 = t < 45.6;
    R.forEach((r, i) => {
      r.g.visible = on4; if (!on4) return;
      const [x, y, z, yaw] = RPOS[i];
      const tin = i === 1 ? 1 : E.o5(seg(t, 31.35 + (i === 0 ? 0 : 0.15), 32.75 + (i === 0 ? 0 : 0.15)));
      const tout = E.i3(seg(t, 44.25 + i * 0.07, 45.25 + i * 0.07));
      const side = i === 0 ? -1 : i === 2 ? 1 : 0;
      r.g.position.set(x + side * (1 - tin) * 9 + side * tout * 13, y + (side === 0 ? tout * 9 : 0) - (1 - tin) * 0.6, z - (1 - tin) * 7 - tout * 4);
      r.g.rotation.set(0, yaw + side * (1 - tin) * 0.9 + side * tout * 0.8, 0);
      const op = tin * (1 - tout);
      r.glass.material.opacity = 0.13 * op; r.frame.material.opacity = 0.9 * op; r.head.material.opacity = op; r.glow.material.opacity = 0.22 * op; r.mat.uniforms.dim.value = lerp(0.25, 1, op);
      const [s0, s1, a, b] = SCROLL[i]; const sc = lerp(a, b, E.io3(seg(t, s0, s1))); r.mat.uniforms.scroll.value = sc;
      // surlignage : tracé à l'arrêt, retrait avant le départ
      const hin = E.o5(seg(t, HOLD[i][0] + 0.05, HOLD[i][0] + 0.6)), hout = E.i2(seg(t, HOLD[i][1] - 0.35, HOLD[i][1]));
      const hop = hin * (1 - hout); r.hg.visible = hop > 0.002; r.hg.position.set(r.hcx, r.hcy(sc), 0.03); r.hg.scale.setScalar(lerp(1.05, 1, hin)); r.hframe.material.opacity = hop; r.hglow.material.opacity = 0.22 * hop;
    });
    for (const [n, a, b] of caps4) block(n, t, a, b, { dy: 14, fin: 0.45, fout: 0.3 });

    // ----- Plan 05
    const on5 = t > 45.0 && t < 61.6;
    let fi = -1, fa = 0;        // carte en vedette et intensité
    FOCUS.forEach((f, i) => { if (!f) return; const [a, b] = f; const u = Math.min(E.io3(seg(t, a, a + 0.8)), 1 - E.io3(seg(t, b - 0.1, b + 0.7))); if (u > fa) { fa = u; fi = i; } });
    cards.forEach((c, i) => {
      c.g.visible = on5; if (!on5) return;
      const tin = seg(t, 46.7 + i * 0.12, 47.7 + i * 0.12); const e = E.o5(tin); const sp = spring((t - 46.7 - i * 0.12), 1.6, 0.8);
      const tout = E.i3(seg(t, 59.95 + i * 0.04, 61.0 + i * 0.04));
      const f = i === fi ? fa : 0; const others = fi >= 0 && i !== fi ? fa : 0;
      const dirx = c.cx > 0 ? 1 : -1, diry = c.cy > 0.3 ? 1 : -1;
      c.g.position.set(c.cx + dirx * tout * 7.5, c.cy + diry * tout * 4.2, lerp(-16, 0, sp) + f * 0.85 + tout * 3.5);
      c.g.rotation.set((1 - e) * -0.7 * diry + diry * tout * 0.25, (1 - e) * 0.5 * dirx - dirx * tout * 0.5, 0);
      c.g.scale.setScalar(1 + f * 0.035);
      const op = E.o3(seg(tin, 0, 0.55)) * (1 - tout);
      c.face.material.opacity = op; c.face.material.color.setScalar(lerp(1, 0.5, others)); c.edge.material.opacity = 0.9 * op * lerp(1, 0.3, others); c.sh.material.opacity = 0.55 * op;
    });
    const h5o = E.i2(seg(t, 46.55, 47.0)); show(head5, t > 45.3 && t < 47.05 ? 1 - h5o : 0); riseWords(head5w, t, 45.4, { stagger: 0.08, dur: 0.7 }); tf(head5, { y: -h5o * 20, s: 1 + 0.02 * seg(t, 45.2, 47) });

    // ----- Plan 06
    const phi = kf(PHI, t);
    const ringOp = lerp(0, 0.28, E.io2(seg(t, 47.4, 48.4))) + 0.72 * E.io2(seg(t, 59.6, 61.4)); ring.visible = ringOp > 0.003;
    ringItems.forEach((it, i) => {
      const a = i * STEP + phi;
      it.g.position.set(RR * Math.sin(a), 0.3, ZC + RR * Math.cos(a)); it.g.rotation.y = a;
      const front = Math.max(0, Math.cos(a));
      it.m.uniforms.dim.value = lerp(0.30, 1, Math.pow(front, 2.2)) * ringOp;
    });
    for (const h of HI6) {
      const hin = E.o5(seg(t, h.a + 0.05, h.a + 0.6)), hout = E.i2(seg(t, h.b - 0.35, h.b)); const hop = hin * (1 - hout);
      h.frame.visible = hop > 0.002; h.frame.material.opacity = hop; h.frame.scale.setScalar(lerp(1.05, 1, hin));
      block(h.el, t, h.a + 0.1, h.b - 0.05, { dy: 0, dx: 26, fin: 0.5, fout: 0.3 });
    }
  }

  // ---------- Caméra ----------
  const OV4 = [0, 0.5, 20.8, 0, 0.15, 0, 40];
  const stopPose = (i, d) => camPose(facing(i, 0, i === 2 ? -0.8 : -0.85, d), 50);   // le bas de la fenêtre reste visible : la légende ne couvre pas le texte
  const startB = camPose(facing(1, -2.28, 0.4, 1.0), 50);
  const K4 = [[31.0, startB], [32.75, OV4, E.io3], [34.2, stopPose(0, 10.0), E.io5], [36.9, stopPose(0, 9.6), E.lin], [38.2, stopPose(1, 10.0), E.io5], [40.7, stopPose(1, 9.6), E.lin], [42.0, stopPose(2, 10.0), E.io5], [44.15, stopPose(2, 9.6), E.lin], [45.6, [0, 0.4, 20.5, 0, 0.3, 0, 40], E.io3]];
  const OV5 = [0, 0.3, 19.3, 0, 0.3, 0, 40];
  const fPose = (i) => { const c = cards[i]; return [c.cx * 0.9, c.cy * 0.92 + 0.02, 12.3, c.cx, c.cy, 0, 40]; };
  const K5 = [[45.6, [0, 0.4, 20.5, 0, 0.3, 0, 40]], [47.6, OV5, E.o3], [47.9, OV5, E.lin]];
  FOCUS.forEach((f, i) => { if (!f) return; const [a, b] = f; const p = fPose(i); K5.push([a + 0.9, p, E.io5]); const q = p.slice(); q[2] -= 0.45; K5.push([b, q, E.lin]); });
  const F4END = K5[K5.length - 1][1].slice(); K5.push([60.0, F4END, E.lin]);
  const zf = ZC + RR;      // z de la page en vedette
  const ringStop = (h, d) => [1.05, 0.3 + h.cy * 0.95, zf + d, 0.9, 0.3 + h.cy * 0.95, zf, 50];   // page à gauche, légende à droite
  const wide6 = [0, 0.5, zf + 12.6, 0, 0.3, zf, 45];
  const K6 = [[60.0, F4END], [62.7, wide6, E.io3], [64.0, ringStop(HI6[0], 9.7), E.io3], [66.2, ringStop(HI6[0], 9.35), E.lin], [67.0, [0, 0.5, zf + 11.6, 0, 0.3, zf, 47], E.io3], [67.9, ringStop(HI6[1], 9.7), E.io3], [70.1, ringStop(HI6[1], 9.35), E.lin],
    [70.55, [0, 0.6, zf + 9.6, 0, 0.5, zf, 49], E.io2], [71.05, ringStop(HI6[2], 9.7), E.io2], [73.3, ringStop(HI6[2], 9.35), E.lin], [76.0, [0, 1.2, zf + 15.5, 0, 0.6, zf, 40], E.io3]];
  function cam(t) { const v = kf(t < 45.6 ? K4 : t < 60.0 ? K5 : K6, t); return { pos: [v[0], v[1], v[2]], look: [v[3], v[4], v[5]], focal: v[6] }; }
  function mood(t) {
    const washIn = 1 - E.o3(seg(t, 31.0, 31.6));
    const dawn = 2.3 * E.io2(seg(t, 73.5, 75.9));
    const washOut = E.i2(seg(t, 75.3, 76.0));
    return { night: 1, hallVis: 0, floorVis: 0, fogNear: 34, fogFar: 150, bloomStrength: 0.42, keyI: 1.2, hemiI: 0.9, dawn, wash: Math.max(washIn, washOut), washCol: washOut > 0 ? [1, 0.985, 0.95] : [1, 1, 1], vig: 0.26, stars: 1 };
  }
  function blur(t) {
    if (t < 32.7 || (t > 44.3 && t < 47.2) || (t > 60.0 && t < 63.6) || (t > 66.2 && t < 67.9) || t > 73.4) return 3;
    for (const [a, b] of HOLD) if (t >= a - 0.1 && t <= b + 0.02) return 1;
    for (const h of HI6) if (t >= h.a - 0.1 && t <= h.b + 0.02) return 1;
    if (t > 47.6 && t < 60.0) { for (const f of FOCUS) if (f && t > f[0] + 0.95 && t < f[1] + 0.02) return 1; return 2; }
    if (t >= 63.6 && t <= 64.0) return 2;
    return 2;
  }
  return { update, cam, mood, blur };
}
