// core.js — outils déterministes : easings, ressorts, images clés, PRNG, textures, texte sur canvas.
// Aucune horloge, aucun état entre deux images : tout est fonction du temps t (secondes).
import * as THREE from 'three';

export const FPS = 30;
export const DURATION = 105;
export const W = 1920, H = 1080;

// ---------- Design tokens (prélevés sur la couverture p.1 et la maquette intérieure du PDF) ----------
export const TOK = {
  night: '#061a55',      // ciel nocturne de la couverture
  nightDeep: '#030c2c',
  royal: '#0b2e6d',      // bandeau auteurs de la couverture
  blue: '#1466c4',       // bleu des titres de la 4e de couverture
  sky: '#45b2fe',        // bleu lumineux du ciel de couverture
  ink: '#16264a',        // encre des titres intérieurs
  gold: '#e9b44c',       // or de la porte
  goldDeep: '#b5842a',
  orange: '#e07b1a',     // filets orange de la maquette intérieure
  paper: '#ffffff',
  mist: '#eaf2fd',
};

// ---------- Maths ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invlerp = (a, b, x) => clamp((x - a) / (b - a));
export const seg = (t, a, b) => clamp((t - a) / (b - a));   // progression 0..1 de t dans [a,b]
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Easings (extrémités exactes 0/1)
export const E = {
  lin: x => x,
  io3: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,      // cubique in-out
  io5: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2,        // quintique in-out
  o3: x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3),
  o5: x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 5),
  i3: x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * x,
  i2: x => x <= 0 ? 0 : x >= 1 ? 1 : x * x,
  io2: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
  expo: x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  // dépassement très discret (overshoot contrôlé ~4 %)
  back: x => { if (x <= 0) return 0; if (x >= 1) return 1; const c1 = 1.05, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  // anticipation légère puis arrivée douce
  antic: x => { if (x <= 0) return 0; if (x >= 1) return 1; const a = 0.06; const y = x < 0.18 ? -a * Math.sin(Math.PI * x / 0.18) * (1 - x / 0.18 * 0.2) : 0; return y + E.io3(x); },
};

// Réponse indicielle d'un ressort amorti (forme fermée). f = fréquence (Hz), z = amortissement (>= 0.72 pour rester sobre).
export function spring(t, f = 2.2, z = 0.8) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f;
  if (z >= 1) { return 1 - Math.exp(-w * t) * (1 + w * t); }
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}

// Images clés : keys = [[t, v, ease?], ...] ; v nombre ou tableau. L'ease est celui du segment qui ARRIVE sur la clé.
export function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ez] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const u = (ez || E.io3)((t - t0) / (t1 - t0));
      if (Array.isArray(v0)) return v0.map((a, k) => lerp(a, v1[k], u));
      return lerp(v0, v1, u);
    }
  }
  return last[1];
}

// PRNG déterministe
export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ---------- Textures ----------
const loader = new THREE.TextureLoader();
export let MAX_ANISO = 4;
export function setMaxAniso(v) { MAX_ANISO = v; }
export function loadTex(url, { srgb = true, aniso = null } = {}) {
  return new Promise((res, rej) => loader.load(url, tex => {
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso == null ? MAX_ANISO : aniso;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    res(tex);
  }, undefined, e => rej(new Error('texture ' + url))));
}
// Pages de texte : filtrage en espace gamma (comme un lecteur PDF) + léger biais de netteté -> texte réduit plus dense et plus lisible.
// La texture est chargée sans décodage sRGB (NoColorSpace) ; le shader linéarise après filtrage.
export function loadPage(url) { return loadTex(url, { srgb: false }); }
export function gammaMap(mat, bias = -0.5) {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
      `#ifdef USE_MAP\n vec4 sampledDiffuseColor = texture2D( map, vMapUv, ${bias.toFixed(2)} ); sampledDiffuseColor.rgb = pow( sampledDiffuseColor.rgb, vec3( 2.2 ) ); diffuseColor *= sampledDiffuseColor;\n#endif`);
  };
  mat.customProgramCacheKey = () => 'gammaMap' + bias;
  return mat;
}
export const pageUrl = n => `assets/pages/p${String(n).padStart(3, '0')}.jpg`;

export function canvasTex(w, h, draw, { scale = 2, aniso = null } = {}) {
  const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d'); g.scale(scale, scale); draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = aniso == null ? MAX_ANISO : aniso;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// Texte multi-lignes avec césure sur les espaces ; retourne la hauteur consommée.
export function wrapText(g, text, x, y, maxW, lh, { draw = true, align = 'left' } = {}) {
  const words = text.split(' '); let line = ''; let yy = y; const lines = [];
  for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line);
  if (draw) for (const l of lines) { const lw = g.measureText(l).width; g.fillText(l, align === 'center' ? x + (maxW - lw) / 2 : align === 'right' ? x + maxW - lw : x, yy); yy += lh; }
  return lines.length * lh;
}

// Forme THREE arrondie (pour dalles, cartes, cadres)
export function roundedShape(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// Plan arrondi avec UV 0..1 sur toute la surface
export function roundedPlane(w, h, r, segs = 6) {
  const geo = new THREE.ShapeGeometry(roundedShape(w, h, r), segs);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return geo;
}
// Cadre (anneau) arrondi extrudé
export function roundedFrame(w, h, r, t, depth = 0.02) {
  const outer = roundedShape(w, h, r); const inner = roundedShape(w - 2 * t, h - 2 * t, Math.max(0.001, r - t));
  outer.holes.push(new THREE.Path(inner.getPoints(8).reverse()));
  return new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 8 });
}

// Ombre douce (sprite plan) : dégradé radial rectangulaire
let _shadowTex = null;
export function softShadowTex() {
  if (_shadowTex) return _shadowTex;
  _shadowTex = canvasTex(256, 256, (g) => {
    const im = g.createImageData(512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const dx = Math.max(0, Math.abs(x - 256) - 120) / 136, dy = Math.max(0, Math.abs(y - 256) - 120) / 136;
      const d = Math.min(1, Math.hypot(dx, dy)); const a = Math.pow(1 - d, 2.2);
      const i = (y * 512 + x) * 4; im.data[i] = 0; im.data[i + 1] = 0; im.data[i + 2] = 0; im.data[i + 3] = Math.round(255 * a);
    }
    g.putImageData(im, 0, 0);
  }, { scale: 2, aniso: 1 });
  _shadowTex.colorSpace = THREE.NoColorSpace;
  return _shadowTex;
}
export function shadowPlane(w, h, opacity = 0.35, color = 0x061a55) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: softShadowTex(), color, transparent: true, opacity, depthWrite: false, toneMapped: false }));
  m.renderOrder = -1; return m;
}

// Halo radial additif
let _glowTex = null;
export function glowTex() {
  if (_glowTex) return _glowTex;
  _glowTex = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.72)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }, { scale: 1, aniso: 1 });
  return _glowTex;
}
export function glowSprite(size, color = 0xffffff, opacity = 1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
  return m;
}
