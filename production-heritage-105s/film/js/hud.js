// hud.js — habillage 2D (titres, légendes, étiquettes de pages) : DOM positionné en pixels 1920×1080, entièrement piloté par seek(t).
import { clamp, E, seg, lerp } from './core.js';

const hud = () => document.getElementById('hud');

export function el(css, html = '', parent = null) {
  const d = document.createElement('div'); d.className = 'abs'; d.style.cssText = css; d.innerHTML = html; (parent || hud()).appendChild(d); return d;
}
// Découpe le texte d'un élément en mots masqués (montée masquée mot à mot)
export function splitWords(node) {
  const words = [];
  const walk = (n) => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
          const m = document.createElement('span'); m.className = 'mask'; const w = document.createElement('span'); w.className = 'w'; w.textContent = tok; m.appendChild(w); frag.appendChild(m); words.push(w);
        });
        n.replaceChild(frag, c);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    }
  };
  walk(node); return words;
}
export function show(node, o) { node.style.opacity = o; node.style.visibility = o <= 0.001 ? 'hidden' : 'inherit'; }
export function tf(node, { x = 0, y = 0, s = 1, r = 0 } = {}) { node.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(${s.toFixed(4)}) rotate(${r.toFixed(3)}deg)`; }

// Montée masquée mot à mot : entrée à t0 (stagger), sortie à t1 (fondu + légère montée du bloc)
export function riseWords(words, t, t0, { stagger = 0.055, dur = 0.7 } = {}) {
  for (let i = 0; i < words.length; i++) {
    const u = E.o5(seg(t, t0 + i * stagger, t0 + i * stagger + dur));
    words[i].style.transform = `translateY(${((1 - u) * 112).toFixed(2)}%) rotate(${((1 - u) * 3).toFixed(2)}deg)`;
  }
}
// Enveloppe d'opacité entrée/sortie
export function env(t, a, b, fin = 0.4, fout = 0.4) { return Math.min(E.o3(seg(t, a, a + fin)), 1 - E.i2(seg(t, b - fout, b))); }

// Bloc standard : apparition en fondu-glissé, sortie en fondu. Retourne l'opacité appliquée.
export function block(node, t, a, b, { dy = 18, fin = 0.5, fout = 0.4, dx = 0 } = {}) {
  const i = E.o5(seg(t, a, a + fin)), o = E.i2(seg(t, b - fout, b));
  const op = Math.min(i, 1 - o); show(node, op); tf(node, { y: (1 - i) * dy - o * dy * 0.5, x: (1 - i) * dx });
  return op;
}
