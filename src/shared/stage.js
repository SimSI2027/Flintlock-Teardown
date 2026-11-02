// The studio: a pale museum-plinth backdrop, a warm key with soft shadows, a cool fill, a restrained rim from
// behind, an image-based soft-box room (with a warm card for the brass), optional GTAO.
// frame(view) poses the pistol from the lock state and the teardown offsets, applies the display look of every mesh
// (solid, ghost, x-ray, cutaway, the accent on the working part) and draws one frame.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {DETAIL} from './materials.js';
import {buildPistol} from './pistol.js';

const V3 = THREE.Vector3;
export const COL = {bg: '#ebe6dc', ground: '#e6dfd2', shadow: '#5a4a38', accent: '#c4471c'};
export const GROUND_Y = -1.32;

export function createStage({canvas, pr = 1}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  scene.fog = new THREE.Fog(COL.bg, 12, 30);
  const camera = new THREE.PerspectiveCamera(24, 16 / 9, 0.05, 80);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 8}));
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 4, 4);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.7;
  gtao.updateGtaoMaterial({radius: 0.05, distanceExponent: 1.4, thickness: 0.4, scale: 1.0, samples: 12, distanceFallOff: 1.0, screenSpaceRadius: false});
  gtao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12});
  composer.addPass(gtao);
  composer.addPass(new OutputPass());

  // image-based light: a soft-box room
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#d9d2c6');
    const box = (w, h, pos, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 0.98, 0.95).multiplyScalar(k), side: THREE.DoubleSide}));
      m.position.copy(pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(14, 10, new V3(0, 14, 3), 1.45);
    box(4, 12, new V3(-13, 4, 6), 2.3);
    box(4, 12, new V3(13, 3, -5), 1.5);
    box(18, 2.5, new V3(0, 1.5, 14), 1.1);
    box(10, 2, new V3(0, 2, -14), 0.9);
    // a warm card off to the front right: brass picks up a warm reflection from it
    {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 0.86, 0.66).multiplyScalar(0.75), side: THREE.DoubleSide}));
      m.position.set(9, 5, 9);
      m.lookAt(0, 0, 0);
      env.add(m);
    }
    const g = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({color: '#bdb2a0', side: THREE.DoubleSide}));
    g.rotation.x = -Math.PI / 2;
    g.position.y = -3;
    env.add(g);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.03).texture;
    scene.environmentIntensity = 0.85;
    pm.dispose();
  }
  // the key: warm, high and to the front right, raking across the lock plate so struck marks and bevels read
  const SUN = new V3(0.34, 0.8, 0.5).normalize();
  const sun = new THREE.DirectionalLight('#fff1df', 2.55);
  sun.castShadow = true;
  const EXT = 3.2;
  Object.assign(sun.shadow.camera, {left: -EXT, right: EXT, top: EXT, bottom: -EXT, near: 0.5, far: 24});
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.radius = 9;
  sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.004;
  sun.position.copy(SUN).multiplyScalar(10);
  scene.add(sun, sun.target);
  // a soft cool fill from the left front and a restrained rim from behind, no shadows
  const fill = new THREE.DirectionalLight('#e4ebf5', 0.42);
  fill.position.set(-7, 2.5, 6.5);
  const rim = new THREE.DirectionalLight('#fff4e6', 0.85);
  rim.position.set(-2.5, 5.5, -8);
  const hemi = new THREE.HemisphereLight('#fffaf2', '#cfc2ab', 0.4);
  scene.add(fill, rim, hemi);

  // the plinth: a pale floor that fades into the backdrop, and a shadow catcher on it
  const groundMat = new THREE.ShaderMaterial({
    uniforms: {uG: {value: new THREE.Color(COL.ground)}, uBg: {value: new THREE.Color(COL.bg)}},
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uG; uniform vec3 uBg; varying vec3 vW; void main(){ float d = length(vW.xz * vec2(0.55, 1.0)); gl_FragColor = vec4(mix(uG, uBg, smoothstep(2.0, 7.5, d)), 1.0); }`,
    toneMapped: false,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  scene.add(ground);
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({color: COL.shadow, opacity: 0.26, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8}));
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = GROUND_Y + 0.001;
  shade.receiveShadow = true;
  scene.add(shade);

  const pistol = buildPistol();
  scene.add(pistol.root);

  // ------------------------------------------------------------ display looks
  // cutaway: a box window into the right side of the stock, the lock plate and the side plate (clipIntersection)
  const CUT = {x0: -0.87, x1: 0.33, y0: -0.31, y1: 0.07};
  const cutPlanes = [new THREE.Plane(new V3(0, 0, -1), 0.4), new THREE.Plane(new V3(-1, 0, 0), CUT.x0), new THREE.Plane(new V3(1, 0, 0), -CUT.x1), new THREE.Plane(new V3(0, -1, 0), CUT.y0), new THREE.Plane(new V3(0, 1, 0), -CUT.y1)];
  const CUTCATS = new Set(['walnut', 'plate', 'pan', 'side']);
  const variants = {};
  const variant = (cat, kind) => {
    const key = `${cat}|${kind}`;
    if (variants[key]) return variants[key];
    const base = pistol.M[cat];
    const m = base.clone();
    if (base.onBeforeCompile) {
      m.onBeforeCompile = base.onBeforeCompile;
      m.customProgramCacheKey = () => base.customProgramCacheKey() + kind;
    }
    if (kind === 'ghost' || kind === 'xray') {
      m.transparent = true;
      m.depthWrite = false;
    }
    if (kind === 'xray') m.side = THREE.DoubleSide;
    if (kind === 'hot') {
      // the working part: its metal warms toward the accent, without glowing
      if (m.color) m.color = m.color.clone().lerp(new THREE.Color('#d9845a'), 0.26);
      m.emissive = new THREE.Color(COL.accent);
      m.emissiveIntensity = 0.05;
    }
    variants[key] = m;
    return m;
  };
  // every look a mesh can take is a material made up front, so shaders warm before the first frame
  for (const cat of Object.keys(pistol.M)) for (const k of ['ghost', 'xray', 'hot']) variant(cat, k);
  const allMats = () => [...Object.values(pistol.M), ...Object.values(variants)];
  let cutOn = null;
  const setCut = (k) => {
    const on = k > 0.001;
    cutPlanes[0].constant = 0.42 - (0.42 + 0.025) * k;
    if (on === cutOn) return;
    cutOn = on;
    for (const m of allMats()) {
      const cat = Object.keys(pistol.M).find((c) => pistol.M[c] === m) || Object.keys(variants).find((kk) => variants[kk] === m)?.split('|')[0];
      if (!CUTCATS.has(cat)) continue;
      m.clippingPlanes = on ? cutPlanes : null;
      m.clipIntersection = true;
      if (!m.transparent) m.side = on ? THREE.DoubleSide : THREE.FrontSide;
      m.needsUpdate = true;
    }
    gtao.normalMaterial.clippingPlanes = null;
  };
  const meshes = [];
  pistol.root.traverse((o) => o.isMesh && meshes.push(o));

  /**
   * v: {d (derived lock state), offsets, alpha, xray 0..1, cut 0..1, hot: Set of part ids, cam: {tx,ty,tz,az,el,d,sx,sy}}
   */
  const frame = (v) => {
    pistol.pose(v.d, v.offsets || {});
    setCut(v.cut || 0);
    const xray = v.xray || 0;
    const xa = 1 - 0.83 * xray;
    for (const k of Object.keys(variants)) {
      const [, kind] = k.split('|');
      if (kind === 'xray') variants[k].opacity = xa;
    }
    let ghostA = 1;
    for (const id in v.alpha || {}) ghostA = Math.min(ghostA, v.alpha[id]);
    for (const k of Object.keys(variants)) if (k.endsWith('|ghost')) variants[k].opacity = Math.min(ghostA, xray > 0 ? xa : 1);
    for (const m of meshes) {
      const id = m.userData.part;
      const p = pistol.parts[id];
      const a = v.alpha?.[id] ?? 1;
      const cat = m.userData.cat;
      let mat;
      if (a < 0.999) mat = variant(cat, 'ghost');
      else if (xray > 0.001 && p.housing) mat = variant(cat, 'xray');
      else if (v.hot && v.hot.has(id) && cat !== 'hole') mat = variant(cat, 'hot');
      else mat = pistol.M[cat];
      if (m.material !== mat) m.material = mat;
      m.castShadow = cat !== 'hole' && a > 0.5 && !(xray > 0.5 && p.housing);
      m.renderOrder = mat.transparent ? 2 : 0;
    }
    const c = v.cam;
    camera.position.set(c.tx + c.d * Math.cos(c.el) * Math.sin(c.az), c.ty + c.d * Math.sin(c.el), c.tz + c.d * Math.cos(c.el) * Math.cos(c.az));
    camera.lookAt(c.tx, c.ty, c.tz);
    camera.setViewOffset(size.w, size.h, -(c.sx ?? 0), -(c.sy ?? 0), size.w, size.h);
    camera.updateMatrixWorld();
    composer.render();
  };

  const size = {w: 1600, h: 900};
  const resize = (w, h, p) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(p);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(p);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize(1600, 900, pr);
  const pv = new V3();
  const project = (x, y, z) => {
    pv.set(x, y, z).project(camera);
    if (pv.z > 1) return null;
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };
  const setQuality = ({samples, ao, shadow, detail}) => {
    if (detail !== undefined) DETAIL.value = detail ? 1 : 0;
    if (samples !== undefined)
      for (const t of [composer.renderTarget1, composer.renderTarget2]) {
        t.samples = samples;
        t.dispose();
      }
    if (ao !== undefined) gtao.enabled = ao;
    if (shadow !== undefined) {
      sun.shadow.mapSize.set(shadow, shadow);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
  };
  // the materials every look uses, so kit/warm.js can compile them all at once
  const warmScene = () => {
    const s = new THREE.Scene();
    s.environment = scene.environment;
    s.add(sun.clone(), fill.clone(), rim.clone(), hemi.clone());
    const g = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (const m of allMats()) s.add(new THREE.Mesh(g, m));
    return s;
  };
  return {renderer, scene, camera, composer, gtao, sun, pistol, frame, resize, project, size, setQuality, meshes, variants, cutPlanes, warmScene};
}
