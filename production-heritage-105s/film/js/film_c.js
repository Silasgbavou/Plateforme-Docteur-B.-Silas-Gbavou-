// film_c.js — Plans 07 et 08 (retour dans la lumière) : présentation des deux auteurs, signature et contacts authentiques.
import * as THREE from 'three';
import { E, kf, seg, lerp, clamp, canvasTex, TOK, roundedPlane, roundedFrame, shadowPlane, roundRect, wrapText, spring } from './core.js';
import { el, show, tf, block } from './hud.js';

// Contacts authentiques — PDF p.3 et p.452 (vérifiés chiffre par chiffre, voir docs/RAPPORT_QC.md)
export const AUTHORS = [
  { key: 'silas', name: 'Docteur B. Silas Gbavou', bio: 'Homme de Dieu, enseignant de la Parole, auteur, éditeur et scribe prophétique', fb: 'Docteur B. Silas Gbavou', wa: '+229 01 67 96 00 94', mail: 'silasgbavou@gmail.com' },
  { key: 'appolos', name: 'Pasteur M. Appolos Gbavou', bio: 'Auteur et écrivain d’ouvrages chrétiens pour l’édification du royaume de Dieu sur la terre', fb: 'Pasteur M. Appolos Gbavou', wa: '+229 01 96 79 96 70', mail: 'appolosgbavou@gmail.com' },
];

export function buildC(ctx) {
  const { stage, tex, book, mirror, book2, mirror2 } = ctx;
  const Z0 = 42;
  const world = new THREE.Group(); stage.scene.add(world);
  const PWd = 2.6, PHt = PWd * 830 / 620;

  // ---------- Portraits (photographies fournies, recadrage seul) ----------
  const portraits = AUTHORS.map((a, i) => {
    const g = new THREE.Group();
    const sh = shadowPlane(PWd * 1.5, PHt * 1.35, 0.4, 0x0b2e6d); sh.position.set(0.08, -0.22, -0.25);
    const mount = new THREE.Mesh(roundedPlane(PWd + 0.2, PHt + 0.2, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false })); mount.position.z = -0.02;
    const photo = new THREE.Mesh(roundedPlane(PWd, PHt, 0.09), new THREE.MeshBasicMaterial({ map: i === 0 ? tex.pSilas : tex.pAppolos, transparent: true, toneMapped: false }));
    const rimLine = new THREE.Mesh(roundedFrame(PWd + 0.2, PHt + 0.2, 0.16, 0.018, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(TOK.gold), transparent: true, toneMapped: false })); rimLine.position.z = -0.015;
    g.add(sh); g.add(mount); g.add(photo); g.add(rimLine); world.add(g);
    // plaque de nom en verre dépoli, en avant du portrait (parallaxe)
    const plateTex = canvasTex(1120, 360, (c, w, h) => {
      roundRect(c, 4, 4, w - 8, h - 8, 44); c.fillStyle = 'rgba(255,255,255,0.93)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(20,102,196,0.30)'; c.stroke();
      c.fillStyle = TOK.orange; c.fillRect(54, 52, 74, 5);
      c.textBaseline = 'top'; c.fillStyle = TOK.ink; c.font = '800 62px Inter'; c.fillText(a.name, 52, 76, w - 104);
      c.font = 'italic 500 35px Lora'; c.fillStyle = '#33466e'; wrapText(c, a.bio, 54, 166, w - 108, 48);
    }, { scale: 2 });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 3.7 * 360 / 1120), new THREE.MeshBasicMaterial({ map: plateTex, transparent: true, depthWrite: false, toneMapped: false }));
    const psh = shadowPlane(4.4, 1.9, 0.3, 0x0b2e6d); psh.position.set(0.05, -0.12, -0.05);
    const pg = new THREE.Group(); pg.add(psh); pg.add(plate); world.add(pg);
    const side = i === 0 ? -1 : 1;
    return { g, sh, mount, photo, rimLine, pg, plate, psh, side, x0: side * 2.5, y0: 2.58, yaw0: -side * 0.10, tIn: i === 0 ? 76.45 : 78.0 };
  });

  // ---------- Cartes de contact ----------
  const CWd = 4.42, CHt = 2.0, CX = 1.95, CY = [3.27, 1.07];
  const cardBg = canvasTex(1000, 450, (c, w, h) => {
    roundRect(c, 3, 3, w - 6, h - 6, 52); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.97)'); g.addColorStop(1, 'rgba(240,246,254,0.97)'); c.fillStyle = g; c.fill();
    c.lineWidth = 3; c.strokeStyle = 'rgba(20,102,196,0.26)'; c.stroke();
  }, { scale: 2 });
  const icon = (c, name, x, y, s) => {      // pictogramme de plateforme (tracé Simple Icons, CC0) dans une pastille
    const ic = tex.icons[name]; c.save(); c.translate(x, y);
    c.beginPath(); c.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); c.fillStyle = '#' + ic.hex; c.fill();
    const k = s * 0.56 / 24; c.translate(s * 0.22, s * 0.22); c.scale(k, k); c.fillStyle = '#ffffff'; c.fill(new Path2D(ic.path)); c.restore();
  };
  const rowTex = (name, label, value) => canvasTex(760, 96, (c, w, h) => {
    icon(c, name, 6, 12, 72);
    c.textBaseline = 'alphabetic'; c.font = '700 19px Inter'; c.fillStyle = '#5f7096'; c.fillText(label.split('').join('  '), 100, 34);
    c.font = '600 38px Inter'; c.fillStyle = TOK.ink; c.fillText(value, 100, 76, w - 104);
  }, { scale: 2 });
  const nameTex = (name) => canvasTex(760, 84, (c, w, h) => { c.textBaseline = 'alphabetic'; c.font = '800 50px Inter'; c.fillStyle = TOK.blue; c.fillText(name, 6, 58, w - 10); c.fillStyle = TOK.orange; c.fillRect(8, 74, 70, 4); }, { scale: 2 });
  const RW = 3.04;
  const contact = AUTHORS.map((a, i) => {
    const g = new THREE.Group(); g.position.set(CX, CY[i], Z0); world.add(g);
    const sh = shadowPlane(CWd * 1.25, CHt * 1.6, 0.36, 0x0b2e6d); sh.position.set(0.06, -0.14, -0.12);
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(CWd, CHt), new THREE.MeshBasicMaterial({ map: cardBg, transparent: true, depthWrite: false, toneMapped: false })); bg.position.z = -0.03;
    g.add(sh); g.add(bg);
    const mk = (t, hpx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(RW, RW * hpx / 760), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); g.add(m); return m; };
    const rows = [mk(nameTex(a.name), 84), mk(rowTex('facebook', 'FACEBOOK', a.fb), 96), mk(rowTex('whatsapp', 'WHATSAPP', a.wa), 96), mk(rowTex('gmail', 'E-MAIL', a.mail), 96)];
    const RY = [0.66, 0.23, -0.19, -0.61];
    const pill = new THREE.Mesh(roundedPlane(RW + 0.12, 0.40, 0.1), new THREE.MeshBasicMaterial({ color: 0xdcebff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); pill.position.z = -0.01; g.add(pill);
    rows.forEach((m, k) => { m.userData.y = RY[k]; m.userData.x = -CWd / 2 + 1.26 + RW / 2; });
    return { g, sh, bg, rows, pill };
  });
  // ordre de rendu : ces plans translucides doivent être dessinés après le sol brillant (lui-même translucide)
  world.traverse(o => { if (o.isMesh) o.renderOrder = 10; });
  for (const p of portraits) { p.plate.renderOrder = 14; p.psh.renderOrder = 13; }
  for (const c of contact) { c.rows.forEach(m => m.renderOrder = 12); c.pill.renderOrder = 11; }
  const AV = { s: 0.95 / PWd, x: CX - CWd / 2 + 0.22 + 0.5 };      // vignette-portrait dans la carte (élément partagé plan 07 -> 08)
  // moments de mise en avant des lignes (calés sur la voix : Facebook, WhatsApp, e-mail)
  const PULSE = [[94.2, 1], [95.5, 2], [96.8, 3]];
  ctx.cues.rowsIn = 89.1; ctx.cues.pulses = PULSE.map(p => p[0]);

  // ---------- HUD ----------
  const h7 = el(`left:0; top:60px; width:1920px; text-align:center;`, `<div style="font-weight:800;font-size:21px;letter-spacing:0.38em;color:${TOK.blue}">LES AUTEURS</div><div style="margin:14px auto 0;width:74px;height:4px;border-radius:2px;background:${TOK.orange}"></div>`);
  const h8 = el(`left:204px; top:112px; width:760px;`, `<div style="font-weight:800;font-size:19px;letter-spacing:0.30em;color:${TOK.blue}">CONTACTER LES AUTEURS</div>
    <div style="margin-top:16px;font-weight:800;font-size:50px;line-height:1.08;letter-spacing:-0.025em;color:${TOK.ink}">L’Héritage des saints<br><span style="color:${TOK.blue}">dans la lumière</span></div>
    <div style="margin-top:18px;width:84px;height:4px;border-radius:2px;background:${TOK.orange}"></div>`);

  function update(t) {
    const on = t >= 75.9; world.visible = on; if (!on) { show(h7, 0); show(h8, 0); book2.root.visible = false; mirror2.root.visible = false; return; }
    const morph = E.io5(seg(t, 86.7, 88.5));        // portraits -> vignettes des cartes de contact
    portraits.forEach((p, i) => {
      const u = t - p.tIn; const sp = spring(u, 1.25, 0.8); const op = E.o3(seg(u, 0, 0.5));
      const drift = Math.sin((t - 76) * 0.42 + i * 1.7) * 0.035;
      const x = lerp(lerp(p.x0 + p.side * 4.2, p.x0, sp), AV.x, morph), y = lerp(p.y0 + drift, CY[i], morph), z = lerp(lerp(Z0 - 5, Z0, sp), Z0 + 0.06, morph);
      p.g.position.set(x, y, z); p.g.rotation.set(0, lerp(lerp(p.yaw0 - p.side * 0.75, p.yaw0, sp), 0, morph), 0); p.g.scale.setScalar(lerp(1, AV.s, morph));
      p.photo.material.opacity = op; p.mount.material.opacity = op; p.rimLine.material.opacity = op; p.sh.material.opacity = 0.4 * op * (1 - morph);
      // plaque de nom : monte 0,45 s après le portrait, se retire au début du raccord
      const pu = E.o5(seg(u, 0.5, 1.25)), po = E.i2(seg(t, 86.5, 87.1));
      p.pg.visible = pu > 0.001 && po < 0.999; p.pg.position.set(p.x0 + p.side * (1 - sp) * 2.5, 0.84 - (1 - pu) * 0.5 - po * 0.3 + drift * 0.5, Z0 + 0.42); p.pg.rotation.y = p.yaw0 * 0.6;
      p.plate.material.opacity = pu * (1 - po); p.psh.material.opacity = 0.3 * pu * (1 - po);
    });
    contact.forEach((c, i) => {
      const cin = E.o5(seg(t, 87.2 + i * 0.14, 88.5 + i * 0.14)); c.g.visible = cin > 0.001;
      c.g.position.set(CX + (1 - cin) * 1.6, CY[i], Z0 - (1 - cin) * 1.5); c.bg.material.opacity = cin; c.sh.material.opacity = 0.36 * cin; c.g.scale.setScalar(lerp(0.94, 1, cin));
      let pillOp = 0, pillY = 0;
      c.rows.forEach((m, k) => {
        const t0 = 88.75 + i * 0.36 + k * 0.12; const e = E.o5(seg(t, t0, t0 + 0.6)); const pop = spring(t - t0, 2.4, 0.74);
        let s = lerp(0.9, 1, pop);
        for (const [pt, pk] of PULSE) if (pk === k) { const pu = seg(t, pt + i * 0.16, pt + i * 0.16 + 1.0); const bell = Math.sin(Math.PI * pu); s += 0.03 * bell; if (bell > pillOp) { pillOp = bell; pillY = m.userData.y; } }
        m.material.opacity = e; m.position.set(m.userData.x + (1 - e) * 0.35, m.userData.y, 0.02); m.scale.setScalar(s);
      });
      c.pill.material.opacity = 0.85 * pillOp; c.pill.position.set(-CWd / 2 + 1.26 + RW / 2 - 0.02, pillY, -0.01);
    });
    // livres : 1re de couverture (livre principal) et 4e de couverture (second exemplaire), avec réflexion au sol
    const bOn = t >= 87.4; book2.root.visible = bOn; mirror2.root.visible = bOn; book.root.visible = bOn; mirror.root.visible = bOn;
    if (bOn) {
      const s1 = spring(t - 87.7, 1.05, 0.82), s2 = spring(t - 88.05, 1.05, 0.82); const fl = Math.sin((t - 88) * 0.5) * 0.012;
      const p1 = { stand: 1, yaw: lerp(-1.0, 0.42, s1) + fl, x: lerp(-10.5, -3.14, s1), z: Z0 + 0.2 };
      const p2 = { stand: 1, yaw: Math.PI - lerp(-1.0, 0.42, s2) - fl, x: lerp(-9.6, -1.42, s2), z: Z0 - 0.25 };
      book.setOpen(0); book.setPose(p1); mirror.setPose(p1); book2.setPose(p2); mirror2.setPose(p2);
      stage.lights.key.target.position.set(-2, 0, Z0); stage.lights.key.position.set(-8, 11, Z0 + 9);
    }
    block(h7, t, 76.3, 86.6, { dy: -12, fin: 0.6, fout: 0.4 });
    block(h8, t, 88.9, 106, { dy: 16, fin: 0.7, fout: 0.4 });
  }

  function cam(t) {
    const k = [[76, [-0.55, 2.35, 56.2, -0.1, 2.05, Z0, 45]], [86.6, [0.55, 2.3, 54.9, 0.1, 2.02, Z0, 45], E.io2], [88.8, [0, 2.3, 55.3, 0, 2.0, Z0, 45], E.io3], [99.0, [0, 2.3, 55.0, 0, 2.0, Z0, 45], E.o3], [105, [0.04, 2.3, 54.93, 0, 2.0, Z0, 45], E.lin]];
    const v = kf(k, t); return { pos: [v[0], v[1], v[2]], look: [v[3], v[4], v[5]], focal: v[6] };
  }
  function mood(t) {
    const wash = 1 - E.o3(seg(t, 76.0, 76.8));
    return { night: 0, hallVis: 0.8, gold: 0.4, hideArch: [43, 60], glow: 1, floorVis: 1, fogNear: 30, fogFar: 135, bloomStrength: 0.32, wash, washCol: [1, 0.985, 0.95] };
  }
  function blur(t) { if ((t > 76.4 && t < 77.3) || (t > 78.0 && t < 78.9) || (t > 86.7 && t < 89.4)) return 2; return 1; }
  return { update, cam, mood, blur };
}
