// book.js — vrai maillage du livre relié : plats avec épaisseur, dos articulé (charnière double), bloc de pages, feuilles animées avec courbure.
// Repère local « livre couché » : X = largeur (dos à x=0, gouttière à x=+w), Y = épaisseur (4e de couverture en bas), Z = hauteur (tête de page vers -Z).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, TOK, clamp, lerp, E, gammaMap } from './core.js';

export const BOOK = { w: 2.1, h: 2.97, T: 0.30, tb: 0.03, over: 0.035 };

function boxUV(geo, faceIndex, fn) {
  // BoxGeometry/RoundedBoxGeometry : groupes 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z ; fn(position) -> [u,v]
  const g = geo.groups[faceIndex]; const idx = geo.index; const pos = geo.attributes.position, uv = geo.attributes.uv; const seen = new Set();
  for (let i = g.start; i < g.start + g.count; i++) { const vi = idx ? idx.getX(i) : i; if (seen.has(vi)) continue; seen.add(vi); const [u, v] = fn(pos.getX(vi), pos.getY(vi), pos.getZ(vi)); uv.setXY(vi, u, v); }
  uv.needsUpdate = true;
}

function spineTexture() {
  // Le PDF ne contient pas de dos : dos sobre créé à partir des couleurs de la couverture, portant le titre exact.
  return canvasTex(1188, 120, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#04133f'); gr.addColorStop(0.5, '#0b2e6d'); gr.addColorStop(1, '#04133f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = TOK.gold; g.fillRect(40, 16, 2, h - 32); g.fillRect(w - 42, 16, 2, h - 32);
    g.font = '700 46px Cinzel'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = '#ffffff';
    g.fillText('L’HÉRITAGE DES SAINTS DANS LA LUMIÈRE', w / 2, h / 2 + 3);
  }, { scale: 2 });
}
function edgeTexture() {
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#f3efe6'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = (y / 2) % 3 === 0 ? 'rgba(120,105,80,0.20)' : 'rgba(150,135,110,0.09)'; g.fillRect(0, y, w, 1); }
  }, { scale: 1, aniso: 1 });
}

/**
 * tex : { cover, back, pages: {n: texture} } ; leaves : [[recto, verso], ...] dans l'ordre du PDF ; blockTop : page visible sous la dernière feuille.
 */
export function createBook(tex, { leaves = [], blockTop = null, shadows = true } = {}) {
  const { w, h, T, tb, over } = BOOK;
  const root = new THREE.Group();           // pose monde (couché/debout, position)
  const body = new THREE.Group(); root.add(body);
  const bw = w + over, bh = h + 2 * over;
  const coverColor = 0x08204f;
  const mEdge = new THREE.MeshStandardMaterial({ color: coverColor, roughness: 0.5, metalness: 0.0 });
  const mCover = new THREE.MeshStandardMaterial({ map: tex.cover, roughness: 0.34, metalness: 0.0, envMapIntensity: 0.9 });
  const mBack = new THREE.MeshStandardMaterial({ map: tex.back, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.6 });
  const mEnd = new THREE.MeshLambertMaterial({ color: 0xf6f3ec });
  const mSpine = new THREE.MeshStandardMaterial({ map: spineTexture(), roughness: 0.4, envMapIntensity: 0.8 });
  const eTex = edgeTexture(); eTex.wrapS = eTex.wrapT = THREE.RepeatWrapping;
  const mBlockSide = new THREE.MeshLambertMaterial({ map: eTex });

  // 4e de couverture (plat inférieur)
  const gBack = new RoundedBoxGeometry(bw, tb, bh, 3, 0.012);
  boxUV(gBack, 3, (x, y, z) => [clamp(1 - (x + bw / 2) / bw), clamp(0.5 - z / bh)]);   // face -y : dos à droite pour l'observateur
  const backBoard = new THREE.Mesh(gBack, [mEdge, mEdge, mEnd, mBack, mEdge, mEdge]);
  backBoard.position.set(bw / 2, tb / 2, 0); body.add(backBoard);

  // Dos (fixe, vertical quand le livre est couché)
  const sh = T - tb;
  const gSpine = new RoundedBoxGeometry(tb, sh, bh, 3, 0.012);
  boxUV(gSpine, 1, (x, y, z) => [0.5 + z / bh, (y + sh / 2) / sh]);   // face -x : titre lu de la tête vers le pied
  const spine = new THREE.Mesh(gSpine, [mEnd, mSpine, mEdge, mEdge, mEdge, mEdge]);
  spine.position.set(-tb / 2, sh / 2, 0); body.add(spine);

  // 1re de couverture : charnière sur l'arête supérieure du dos (niveau de la face intérieure du plat)
  const coverPivot = new THREE.Group(); coverPivot.position.set(-tb, sh, 0); body.add(coverPivot);
  const fw = bw + tb;
  const gFront = new RoundedBoxGeometry(fw, tb, bh, 3, 0.012);
  boxUV(gFront, 2, (x, y, z) => [clamp((x + fw / 2 - tb) / bw), clamp(0.5 - z / bh)]);
  const frontBoard = new THREE.Mesh(gFront, [mEdge, mEdge, mCover, mEnd, mEdge, mEdge]);
  frontBoard.position.set(fw / 2, tb / 2, 0); coverPivot.add(frontBoard);
  // angle d'ouverture complet : le plat retombe jusqu'à toucher la table (pente douce, comme un vrai livre ouvert à ses premières pages)
  const delta = Math.asin((sh - tb) / fw);
  const OPEN = Math.PI + delta;

  // Bloc de pages
  const pw = w - 0.045, ph = h - 0.02;
  const nL = leaves.length, eps = 0.0016;
  const blockH = T - 2 * tb - 0.006 - nL * eps;
  const mBlockTop = blockTop ? gammaMap(new THREE.MeshLambertMaterial({ map: tex.pages[blockTop] })) : mEnd;
  const gBlock = new THREE.BoxGeometry(pw, blockH, ph);
  boxUV(gBlock, 2, (x, y, z) => [(x + pw / 2) / pw, 0.5 - z / ph]);
  boxUV(gBlock, 0, (x, y, z) => [0.5 + z / ph * 6, (y + blockH / 2) / blockH]);
  boxUV(gBlock, 4, (x, y, z) => [(x + pw / 2) / pw * 5, (y + blockH / 2) / blockH]);
  boxUV(gBlock, 5, (x, y, z) => [(x + pw / 2) / pw * 5, (y + blockH / 2) / blockH]);
  const block = new THREE.Mesh(gBlock, [mBlockSide, mBlockSide, mBlockTop, mEnd, mBlockSide, mBlockSide]);
  block.position.set(pw / 2 + 0.004, tb + blockH / 2, 0); body.add(block);
  const yTop = tb + blockH;                              // dessus du bloc

  // Feuilles : ruban courbe intégré dans le plan (x,y), 28 segments
  const NS = 28; const leafObjs = [];
  const yHingeL = sh + 0.012;                         // charnière des feuilles tournées : juste au-dessus du plat ouvert
  leaves.forEach(([recto, verso], k) => {
    const geo = new THREE.BufferGeometry(); const pos = new Float32Array((NS + 1) * 2 * 3); const uvF = new Float32Array((NS + 1) * 2 * 2), uvB = new Float32Array((NS + 1) * 2 * 2); const idx = [];
    for (let i = 0; i <= NS; i++) { const u = i / NS; uvF.set([u, 1, u, 0], i * 4); uvB.set([1 - u, 1, 1 - u, 0], i * 4); if (i < NS) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uvF, 2)); geo.setIndex(idx);
    const geoB = new THREE.BufferGeometry(); geoB.setAttribute('position', geo.attributes.position); geoB.setAttribute('uv', new THREE.BufferAttribute(uvB, 2)); geoB.setIndex(idx);
    const mF = gammaMap(new THREE.MeshLambertMaterial({ map: tex.pages[recto], side: THREE.FrontSide, shadowSide: THREE.DoubleSide }));
    const mB = gammaMap(new THREE.MeshLambertMaterial({ map: tex.pages[verso], side: THREE.BackSide, shadowSide: THREE.DoubleSide }));
    const front = new THREE.Mesh(geo, mF), backM = new THREE.Mesh(geoB, mB);
    front.castShadow = backM.castShadow = shadows; front.receiveShadow = backM.receiveShadow = shadows;
    body.add(front); body.add(backM);
    const yR = yTop + (nL - 1 - k) * eps + 0.0008, yL = yHingeL + k * eps;
    leafObjs.push({ geo, geoB, front, backM, yR, yL, p: -1 });
  });
  function setLeaf(k, p) {
    const L = leafObjs[k]; if (!L) return; p = clamp(p); if (L.p === p) return; L.p = p;
    const pos = L.geo.attributes.position.array; const ds = pw / NS;
    const e = E.io3(p); const base = Math.PI * e; const bell = Math.sin(Math.PI * p);
    const slope = delta * E.io3(clamp((p - 0.4) / 0.6));
    let x = 0.004, y = lerp(L.yR, L.yL, E.io3(p)) + 0.04 * bell;   // la charnière monte du bloc vers le plat ouvert
    for (let i = 0; i <= NS; i++) {
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = -ph / 2; pos[i * 6 + 3] = x; pos[i * 6 + 4] = y; pos[i * 6 + 5] = ph / 2;
      const s = (i + 0.5) * ds; const u = s / pw;
      // la pointe de la feuille retarde (inertie du papier), la base mène ; drapé vers le plat à l'arrivée
      const ang = base - 0.95 * bell * Math.pow(u, 1.6) + 0.35 * bell * (1 - u) * (1 - u) + slope;
      x += Math.cos(ang) * ds; y += Math.sin(ang) * ds;
    }
    L.geo.attributes.position.needsUpdate = true; L.geo.computeVertexNormals(); L.geoB.attributes.normal = L.geo.attributes.normal;
    L.geo.computeBoundingSphere(); L.geoB.boundingSphere = L.geo.boundingSphere;
  }
  leafObjs.forEach((_, k) => setLeaf(k, 0));

  // Ouverture de la couverture : u = 0 fermé -> 1 ouvert (plat rabattu à gauche, reposant sur la table)
  function setOpen(u) { u = clamp(u); coverPivot.rotation.z = OPEN * u; const vis = u > 0.0005; for (const L of leafObjs) { L.front.visible = vis; L.backM.visible = vis; } }
  setOpen(0);

  if (shadows) for (const m of [backBoard, spine, frontBoard, block]) { m.castShadow = true; m.receiveShadow = true; }

  // Pose : stand = 0 couché (dos côté -X, tête vers -Z) ; stand = 1 debout face à +Z, centré en x.
  function setPose({ stand = 1, yaw = 0, x = 0, y = 0, z = 0, lift = 0, tiltZ = 0 }) {
    const a = stand * Math.PI / 2;
    body.rotation.set(a, 0, 0);
    // debout : le pied du livre (local z=+bh/2) touche le sol ; couché : le plat inférieur repose au sol
    body.position.set(-w / 2, lerp(0, bh / 2, Math.sin(a)) + lift, lerp(0, -T / 2, stand));
    root.position.set(x, y, z); root.rotation.set(0, yaw, tiltZ);
  }
  setPose({});
  return { root, body, setOpen, setLeaf, setPose, mats: { mCover, mBack, mBlockTop }, leafCount: nL, frontBoard, backBoard, yTop, pw, ph };
}
