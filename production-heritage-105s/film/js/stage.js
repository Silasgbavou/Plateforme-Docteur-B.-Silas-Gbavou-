// stage.js — moteur de rendu : WebGL (three.js), bloom, accumulation de flou de mouvement, décor « hall de lumière » et « nuit bleue ».
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { W, H, TOK, lerp, clamp, mulberry32, setMaxAniso, glowSprite, roundedFrame, canvasTex } from './core.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  const SC = +(new URLSearchParams(location.search).get('scale') || 1); const RW = Math.round(W * SC), RH = Math.round(H * SC);
  renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;        // fidélité colorimétrique des pages et de la couverture
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  setMaxAniso(Math.min(+(new URLSearchParams(location.search).get('aniso') || 4), renderer.capabilities.getMaxAnisotropy()));   // 4x suffit ; au-delà le rendu logiciel devient très lent

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeef5ff, 30, 120);
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 900);
  camera.filmGauge = 36;                               // capteur plein format 36 mm : focales exprimées en mm réels

  // --- Environnement de réflexion (studio neutre) ---
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.10;

  // --- Lumières ---
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd5e3f7, 1.3); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff6e6, 1.75); key.position.set(-6, 11, 9);
  key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012; key.shadow.radius = 5;
  const sc = key.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 40;
  scene.add(key); scene.add(key.target);
  const rim = new THREE.DirectionalLight(0xbfe0ff, 1.6); rim.position.set(5, 6, -10); scene.add(rim); scene.add(rim.target);
  const fill = new THREE.DirectionalLight(0xffe2b0, 0.35); fill.position.set(8, 3, 6); scene.add(fill);

  // --- Dôme de fond (dégradé jour <-> nuit, étoiles discrètes rappelant le ciel de couverture) ---
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { night: { value: 0 }, glow: { value: 1 }, glowDir: { value: new THREE.Vector3(0, 0.12, -1).normalize() }, dawn: { value: 0 }, starAmt: { value: 1 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      varying vec3 vDir; uniform float night, glow, dawn, starAmt; uniform vec3 glowDir;
      float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        // JOUR : blanc lumineux, bleu très clair en haut et en bas
        vec3 dTop = vec3(0.46,0.66,0.94), dHor = vec3(0.86,0.915,0.985), dBot = vec3(0.72,0.82,0.955);
        vec3 day = mix(dHor, dTop, smoothstep(0.0, 0.75, y)); day = mix(day, dBot, smoothstep(0.0, -0.6, y));
        float g = pow(max(dot(d, glowDir), 0.0), 6.0);
        day = mix(day, vec3(0.985,0.99,1.0), clamp(g*glow, 0.0, 1.0)); day += vec3(0.30,0.28,0.22) * pow(g, 5.0) * glow;
        // NUIT : bleu nuit de la couverture, bande dorée à l'horizon
        vec3 nTop = vec3(0.005,0.018,0.085), nMid = vec3(0.016,0.075,0.27), nLow = vec3(0.04,0.16,0.44);
        vec3 ngt = mix(nMid, nTop, smoothstep(0.05, 0.85, y)); ngt = mix(ngt, nLow, smoothstep(0.35, -0.25, y));
        ngt = mix(ngt, vec3(0.012,0.04,0.15), smoothstep(-0.2, -0.9, y));
        float band = exp(-pow((y+0.04)/0.11, 2.0)); float az = pow(max(dot(normalize(d.xz), normalize(glowDir.xz)), 0.0), 3.0);
        ngt += vec3(0.95,0.62,0.26) * band * az * (0.20 + 0.9*dawn);
        ngt += vec3(1.0,0.86,0.6) * pow(max(dot(d, glowDir),0.0), 24.0) * (0.10 + 1.6*dawn);
        // étoiles
        vec2 uv = vec2(atan(d.z, d.x), asin(clamp(y,-1.0,1.0))) * 46.0; vec2 id = floor(uv); vec2 f = fract(uv)-0.5;
        float h = hash(id); float s = step(0.965, h) * smoothstep(0.11, 0.0, length(f + (vec2(hash(id+3.1), hash(id+7.7))-0.5)*0.6));
        ngt += vec3(0.85,0.92,1.0) * s * (0.25 + 0.75*hash(id+1.7)) * smoothstep(-0.05, 0.35, y) * starAmt;
        vec3 col = mix(day, ngt, night);
        col = mix(col, vec3(1.0, 0.97, 0.90), clamp(dawn - 1.0, 0.0, 1.0));   // dawn > 1 : l'aube envahit tout (transition vers la lumière)
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  // Les couleurs du shader sont données en sRGB perceptuel : on les linéarise à l'entrée.
  domeMat.fragmentShader = domeMat.fragmentShader.replace('gl_FragColor = vec4(col, 1.0);', 'gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 1.0);').replace('#include <colorspace_fragment>', '');
  const dome = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 32), domeMat); dome.renderOrder = -100; dome.frustumCulled = false; scene.add(dome);

  // --- Sol brillant (jour) : voile semi-transparent au-dessus des clones miroir + plan récepteur d'ombres ---
  const floorTex = canvasTex(512, 512, (g) => {
    const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256);
    gr.addColorStop(0, 'rgba(246,250,255,0.74)'); gr.addColorStop(0.3, 'rgba(232,241,253,0.86)'); gr.addColorStop(1, 'rgba(203,221,246,0.97)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  }, { scale: 1, aniso: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.renderOrder = 2; scene.add(floor);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.20, color: 0x0b2e6d, depthWrite: false }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = 0.002; shadowFloor.receiveShadow = true; shadowFloor.renderOrder = 3; scene.add(shadowFloor);

  // --- Hall de lumière : portiques lumineux, filets d'or convergents, rubans bleus ---
  const hall = new THREE.Group(); scene.add(hall);
  const hallMats = [];
  const archMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, toneMapped: false }); hallMats.push(archMat);
  const archGeo = roundedFrame(11, 8.4, 0.9, 0.16, 0.16);
  const archEdgeMat = new THREE.MeshBasicMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0.85, toneMapped: false }); hallMats.push(archEdgeMat);
  const archEdgeGeo = roundedFrame(11.5, 8.9, 1.1, 0.05, 0.05);
  const ARCH_Z = [];
  for (let i = 0; i < 12; i++) {
    const z = -14 + i * 7.5; if (Math.abs(z) < 3) continue; ARCH_Z.push(z);
    for (const sgn of [1, -1]) {             // sgn -1 : clone miroir sous le sol (réflexion)
      const a = new THREE.Mesh(archGeo, archMat); a.position.set(0, sgn * 4.2, z); a.scale.y = sgn; a.userData.archZ = z; hall.add(a);
      const e = new THREE.Mesh(archEdgeGeo, archEdgeMat); e.position.set(0, sgn * 4.2, z - 0.2); e.scale.y = sgn; e.userData.archZ = z; hall.add(e);
    }
  }
  // filets d'or convergents (au sol et en hauteur)
  const goldMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(TOK.gold), transparent: true, opacity: 1, toneMapped: false }); hallMats.push(goldMat);
  const goldLines = [];
  const GL = [[-4.6, 0.012], [-2.3, 0.012], [2.3, 0.012], [4.6, 0.012], [-5.3, 8.2], [5.3, 8.2]];
  for (const [x, y] of GL) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 1), goldMat); m.position.set(x, y, 0); hall.add(m); goldLines.push(m);
  }
  // rubans bleus translucides le long des parois (grammaire de la référence « couloir »)
  const ribbonMats = [];
  function ribbon(side, y0, y1, colorA, colorB, op, phase) {
    const N = 80, geo = new THREE.BufferGeometry(); const pos = [], col = [], idx = [];
    const ca = new THREE.Color(colorA), cb = new THREE.Color(colorB);
    for (let i = 0; i <= N; i++) {
      const u = i / N; const z = 74 - u * 96;
      const x = side * (6.6 + 2.6 * Math.sin(u * Math.PI * 1.25 + phase) + 4.5 * Math.pow(1 - u, 2));
      const yb = y0 + 1.4 * Math.sin(u * Math.PI * 1.6 + phase * 1.7), yt = y1 + 1.9 * Math.cos(u * Math.PI * 1.3 + phase);
      pos.push(x, yb, z, x + side * 0.9, yt, z); const c = ca.clone().lerp(cb, u); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }); mat.userData.op = op; ribbonMats.push(mat);
    const m = new THREE.Mesh(geo, mat); hall.add(m); return m;
  }
  ribbon(-1, 0.4, 3.2, TOK.sky, '#ffffff', 0.34, 0.3); ribbon(-1, 3.6, 6.4, '#2a6fe0', '#dbeaff', 0.26, 1.4); ribbon(-1, 6.2, 8.6, '#9fd0ff', '#ffffff', 0.22, 2.4);
  ribbon(1, 0.5, 3.0, '#7cc3ff', '#ffffff', 0.30, 1.1); ribbon(1, 3.4, 6.6, TOK.blue, '#e6f1ff', 0.24, 2.0); ribbon(1, 6.4, 8.4, '#bfe0ff', '#ffffff', 0.20, 0.2);
  // source de lumière au bout du couloir
  const sun = glowSprite(46, 0xffffff, 1); sun.position.set(0, 4.4, -30); hall.add(sun);
  const sunWarm = glowSprite(22, 0xffe2a8, 0.9); sunWarm.position.set(0, 3.2, -28); hall.add(sunWarm);

  // --- Post-traitement maison (léger pour le rendu logiciel) : MSAA 4x -> accumulation (flou de mouvement) -> bloom 1/4 + 1/8 -> sortie ---
  const Q = new URLSearchParams(location.search); const MSAA = Q.has('msaa') ? +Q.get('msaa') : 4;
  const rtScene = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: MSAA });
  const acc = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, depthBuffer: false });
  const mk = (w, h) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
  const b4a = mk(RW / 4, RH / 4), b4b = mk(RW / 4, RH / 4), b8a = mk(RW / 8, RH / 8), b8b = mk(RW / 8, RH / 8);
  const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const fsq = (fragmentShader, uniforms, extra = {}) => new FullScreenQuad(new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader, depthTest: false, depthWrite: false, ...extra }));
  const addQ = fsq(`uniform sampler2D tex; uniform float wgt; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * wgt, 1.0); }`,
    { tex: { value: null }, wgt: { value: 1 } }, { transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
  // extraction des hautes lumières (> seuil) + réduction 4x (16 échantillons bilinéaires -> 4 lectures)
  const brightQ = fsq(`uniform sampler2D tex; uniform vec2 px; uniform float thr; varying vec2 vUv;
    vec3 b(vec2 o){ vec3 c = texture2D(tex, vUv + o*px).rgb; float l = max(c.r, max(c.g, c.b)); return c * smoothstep(thr, thr + 0.25, l); }
    void main(){ gl_FragColor = vec4((b(vec2(-1.0,-1.0)) + b(vec2(1.0,-1.0)) + b(vec2(-1.0,1.0)) + b(vec2(1.0,1.0))) * 0.25, 1.0); }`,
    { tex: { value: null }, px: { value: new THREE.Vector2(1 / RW, 1 / RH) }, thr: { value: 1.0 } });
  const blurQ = fsq(`uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tex, vUv).rgb * 0.227027; c += (texture2D(tex, vUv + dir*1.384615).rgb + texture2D(tex, vUv - dir*1.384615).rgb) * 0.316216; c += (texture2D(tex, vUv + dir*3.230769).rgb + texture2D(tex, vUv - dir*3.230769).rgb) * 0.070270; gl_FragColor = vec4(c, 1.0); }`,
    { tex: { value: null }, dir: { value: new THREE.Vector2() } });
  const copyQ = fsq(`uniform sampler2D tex; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb, 1.0); }`, { tex: { value: null } });
  const outMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, bl4: { value: b4a.texture }, bl8: { value: b8a.texture }, bloom: { value: 0.3 }, seed: { value: 0 }, vig: { value: 0.16 }, wash: { value: 0 }, washCol: { value: new THREE.Color(1, 1, 1) }, grain: { value: 0.012 } },
    depthTest: false, depthWrite: false, vertexShader: VS,
    fragmentShader: `
      uniform sampler2D tex, bl4, bl8; uniform float seed, vig, wash, grain, bloom; uniform vec3 washCol; varying vec2 vUv;
      float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        vec3 c = texture2D(tex, vUv).rgb;
        c += (texture2D(bl4, vUv).rgb * 0.55 + texture2D(bl8, vUv).rgb * 0.75) * bloom;
        vec2 q = vUv - 0.5; float v = smoothstep(0.35, 0.95, length(q * vec2(1.0, 0.82)));
        c *= 1.0 - vig * v;
        c = mix(c, washCol, wash);
        c = pow(max(c, 0.0), vec3(1.0/2.2));                       // linéaire -> sRGB
        c += (hash(gl_FragCoord.xy + seed * 17.13) - 0.5) * grain;   // grain/dither déterministe (anti-banding)
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  });
  const outQuad = new FullScreenQuad(outMat);
  const bloomCtl = { strength: 0.3, enabled: true };
  function pass(q, target) { renderer.setRenderTarget(target); q.render(renderer); }

  // Rend `samples` sous-images réparties sur l'obturateur (180°) puis moyenne. update(tt) met la scène à l'instant tt.
  function render(t, frameIdx, samples, update, shutter = 0.5) {
    const n = Math.max(1, samples | 0);
    let src;
    if (n === 1) { update(t); renderer.setRenderTarget(rtScene); renderer.render(scene, camera); src = rtScene.texture; }
    else {
      renderer.setRenderTarget(acc); renderer.setClearColor(0x000000, 1); renderer.clear();
      for (let i = 0; i < n; i++) {
        update(t + ((i + 0.5) / n - 0.5) * shutter / 30);
        renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
        addQ.material.uniforms.tex.value = rtScene.texture; addQ.material.uniforms.wgt.value = 1 / n;
        renderer.autoClear = false; pass(addQ, acc); renderer.autoClear = true;
      }
      update(t);                                               // l'habillage 2D (HUD) est calé sur l'instant central
      src = acc.texture;
    }
    if (bloomCtl.enabled && bloomCtl.strength > 0.001) {
      brightQ.material.uniforms.tex.value = src; pass(brightQ, b4a);
      const bu = blurQ.material.uniforms;
      bu.tex.value = b4a.texture; bu.dir.value.set(4 / RW, 0); pass(blurQ, b4b); bu.tex.value = b4b.texture; bu.dir.value.set(0, 4 / RH); pass(blurQ, b4a);
      copyQ.material.uniforms.tex.value = b4a.texture; pass(copyQ, b8a);
      for (let k = 0; k < 2; k++) { bu.tex.value = b8a.texture; bu.dir.value.set(8 / RW * (1 + k), 0); pass(blurQ, b8b); bu.tex.value = b8b.texture; bu.dir.value.set(0, 8 / RH * (1 + k)); pass(blurQ, b8a); }
      outMat.uniforms.bloom.value = bloomCtl.strength;
    } else outMat.uniforms.bloom.value = 0;
    outMat.uniforms.tex.value = src; outMat.uniforms.seed.value = frameIdx % 1024;
    renderer.setRenderTarget(null); outQuad.render(renderer);
  }

  // Ambiance : n = 0 jour (hall de lumière), n = 1 nuit bleue (lecture). hallVis : opacité du hall.
  const fogDay = new THREE.Color(0xeef5ff), fogNight = new THREE.Color(0x061a55), tmpC = new THREE.Color();
  function setMood({ night = 0, hallVis = 1, gold = 1, hideArch = null, glow = 1, dawn = 0, floorVis = 1, fogNear = 30, fogFar = 120, bloomStrength = 0.3, keyI = 1.75, rimI = 1.6, hemiI = 1.3, stars = 1 }) {
    domeMat.uniforms.night.value = night; domeMat.uniforms.glow.value = glow; domeMat.uniforms.dawn.value = dawn; domeMat.uniforms.starAmt.value = stars;
    tmpC.copy(fogDay).lerp(fogNight, night); scene.fog.color.copy(tmpC); scene.fog.near = fogNear; scene.fog.far = fogFar;
    hall.visible = hallVis > 0.002;
    for (const o of hall.children) if (o.userData.archZ != null) o.visible = !(hideArch && o.userData.archZ > hideArch[0] && o.userData.archZ < hideArch[1]);
    archMat.opacity = hallVis; archEdgeMat.opacity = 0.85 * hallVis; goldMat.opacity = hallVis * gold; for (const g of goldLines) g.visible = hallVis * gold > 0.003;
    for (const m of ribbonMats) m.opacity = m.userData.op * hallVis;
    sun.material.opacity = hallVis; sunWarm.material.opacity = 0.9 * hallVis;
    floor.visible = floorVis > 0.002; floor.material.opacity = floorVis; shadowFloor.material.opacity = 0.20 * floorVis; shadowFloor.visible = floorVis > 0.002;
    bloomCtl.strength = bloomStrength; key.intensity = keyI; rim.intensity = rimI; hemi.intensity = hemiI;
  }

  return { renderer, scene, camera, render, setMood, lights: { hemi, key, rim, fill }, hall, goldLines, sun, sunWarm, outMat, bloom: bloomCtl, dome, floor, shadowFloor };
}

// Caméra physique : position, point visé, focale (mm, capteur 36 mm), roulis (rad).
const _up = new THREE.Vector3();
export function setCamera(camera, { pos, look, focal = 40, roll = 0 }) {
  camera.position.set(pos[0], pos[1], pos[2]);
  _up.set(Math.sin(roll), Math.cos(roll), 0); camera.up.copy(_up);
  camera.lookAt(look[0], look[1], look[2]);
  camera.setFocalLength(focal);
}
