// The U.S. Model 1805 pistol, built from code in model units (the pistol is about 4 units long; proportions are
// simplified and are not the original's dimensions). Every part is its own node so a teardown can move it; parts
// that turn (cock, tumbler, sear, trigger, frizzen, spring leaves) are posed from the lock's derived state.
import * as THREE from 'three';
import {bezier, catmull, circle, extrude, latheX, loft, merge, rod, screw, sweep} from './geo.js';
import {G, RIDE_R, tumblerEdge} from './lock.js';

const V3 = THREE.Vector3;
const A = G.arbor;
const rel = (p) => [A[0] + p[0], A[1] + p[1]];
const relAll = (pts) => pts.map(rel);
const shiftPts = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

// ------------------------------------------------------------ the stock's stations, forend tip to butt
export const STOCK = [
  {p: [1.262, -0.074], top: 0.074, bot: 0.092, hw: 0.098, n: 2.3},
  {p: [1.0, -0.08], top: 0.08, bot: 0.09, hw: 0.112, n: 2.4},
  {p: [0.55, -0.082], top: 0.082, bot: 0.09, hw: 0.116, n: 2.5},
  {p: [0.2, -0.09], top: 0.1, bot: 0.122, hw: 0.121, n: 3.4},
  {p: [-0.02, -0.092], top: 0.142, bot: 0.155, hw: 0.125, n: 4.4},
  {p: [-0.3, -0.092], top: 0.158, bot: 0.163, hw: 0.126, n: 4.6},
  {p: [-0.62, -0.095], top: 0.152, bot: 0.156, hw: 0.125, n: 4.6},
  {p: [-0.86, -0.115], top: 0.132, bot: 0.134, hw: 0.12, n: 4.0},
  {p: [-1.05, -0.2], top: 0.113, bot: 0.114, hw: 0.095, n: 2.6},
  {p: [-1.22, -0.33], top: 0.115, bot: 0.118, hw: 0.096, n: 2.5},
  {p: [-1.38, -0.5], top: 0.135, bot: 0.135, hw: 0.108, n: 2.5},
  {p: [-1.49, -0.66], top: 0.152, bot: 0.148, hw: 0.124, n: 2.6},
  {p: [-1.55, -0.77], top: 0.158, bot: 0.152, hw: 0.13, n: 2.7},
  {p: [-1.575, -0.83], top: 0.142, bot: 0.132, hw: 0.12, n: 2.6},
  {p: [-1.585, -0.858], top: 0.1, bot: 0.09, hw: 0.084, n: 2.4},
];
export const ROD_Y = -0.155;

// ------------------------------------------------------------ materials
function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#6e4224';
  g.fillRect(0, 0, 1024, 256);
  // long grain along u (the stock's length), seeded so every load is identical
  let s = 1234567;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < 260; i++) {
    const y = r() * 256;
    const w = 0.6 + r() * 2.4;
    const dark = r() < 0.55;
    g.strokeStyle = dark ? `rgba(45,22,10,${0.08 + r() * 0.18})` : `rgba(160,104,58,${0.05 + r() * 0.12})`;
    g.lineWidth = w;
    g.beginPath();
    const a = r() * 6;
    const f = 0.004 + r() * 0.01;
    for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x * f + a) * (4 + r() * 2));
    g.stroke();
  }
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = `rgba(30,14,6,${0.12 + r() * 0.2})`;
    g.fillRect(r() * 1024, r() * 256, 2 + r() * 5, 0.8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// the lock-plate markings recorded on surviving pistols (eagle over "US" below the pan, "HARPERS / FERRY / date" at the
// tail), engraved lightly as a decal; the lettering here is a simplified rendering, not a facsimile
function markingsTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 1024, 256);
  g.fillStyle = 'rgba(40,38,36,0.85)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // the plate spans x -0.9..0.32 -> 0..1024, y -0.2..0.04 -> 256..0
  const X = (x) => ((x + 0.9) / 1.22) * 1024;
  const Y = (y) => ((0.04 - y) / 0.24) * 256;
  g.font = '600 15px Georgia, serif';
  ['HARPERS', 'FERRY', '1807'].forEach((w, i) => g.fillText(w, X(-0.69), Y(-0.045 - i * 0.022)));
  // a small spread-wing eagle over US, in front of the cock, below the pan
  const ex = X(0.075);
  const ey = Y(-0.045);
  g.strokeStyle = 'rgba(40,38,36,0.8)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(ex - 22, ey - 2);
  g.quadraticCurveTo(ex - 12, ey - 14, ex - 3, ey - 4);
  g.quadraticCurveTo(ex, ey - 12, ex + 3, ey - 4);
  g.quadraticCurveTo(ex + 12, ey - 14, ex + 22, ey - 2);
  g.moveTo(ex, ey - 9);
  g.lineTo(ex, ey + 6);
  g.moveTo(ex - 5, ey + 7);
  g.lineTo(ex + 5, ey + 7);
  g.stroke();
  g.font = '700 13px Georgia, serif';
  g.fillText('US', ex, ey + 19);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// darken back faces: a cut through a hollow shell shows its inside as the cut face
const backDark = (m, k = 0.42) => {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n if(!gl_FrontFacing){ diffuseColor.rgb *= ${k.toFixed(2)}; }`);
  };
  m.customProgramCacheKey = () => `backdark${k}`;
  return m;
};

export function makeMaterials() {
  const wood = woodTexture();
  const base = {
    walnut: backDark(new THREE.MeshPhysicalMaterial({map: wood, roughness: 0.52, metalness: 0, clearcoat: 0.32, clearcoatRoughness: 0.45, envMapIntensity: 0.7})),
    iron: new THREE.MeshStandardMaterial({color: '#b3b6b9', roughness: 0.42, metalness: 1, envMapIntensity: 0.75}),
    plate: backDark(new THREE.MeshStandardMaterial({color: '#aeb1b4', roughness: 0.45, metalness: 1, envMapIntensity: 0.7}), 0.5),
    barrel: new THREE.MeshStandardMaterial({color: '#b0b3b6', roughness: 0.46, metalness: 1, envMapIntensity: 0.6}),
    dark: new THREE.MeshStandardMaterial({color: '#7f8388', roughness: 0.5, metalness: 1, envMapIntensity: 0.6}),
    spring: new THREE.MeshStandardMaterial({color: '#a49c8c', roughness: 0.4, metalness: 1, envMapIntensity: 0.75}),
    brass: new THREE.MeshStandardMaterial({color: '#c49a4a', roughness: 0.36, metalness: 1, envMapIntensity: 0.8}),
    side: backDark(new THREE.MeshStandardMaterial({color: '#c49a4a', roughness: 0.38, metalness: 1, envMapIntensity: 0.8}), 0.5),
    flint: new THREE.MeshPhysicalMaterial({color: '#4a443c', roughness: 0.28, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.2}),
    leather: new THREE.MeshStandardMaterial({color: '#5d3c25', roughness: 0.85, metalness: 0}),
    hole: new THREE.MeshStandardMaterial({color: '#1d1b19', roughness: 0.8, metalness: 0.2}),
    marks: new THREE.MeshStandardMaterial({map: markingsTexture(), transparent: true, roughness: 0.6, metalness: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}),
  };
  return base;
}

// ------------------------------------------------------------ the pistol
export function buildPistol() {
  const M = makeMaterials();
  const root = new THREE.Group();
  const parts = {};
  const order = [];
  const part = (id, name, opts = {}) => {
    const node = new THREE.Group();
    node.name = id;
    root.add(node);
    const p = {id, name, node, meshes: [], pivot: opts.pivot || null, spin: opts.spin || null, kind: opts.kind || 'part', housing: !!opts.housing, lock: !!opts.lock};
    parts[id] = p;
    order.push(id);
    return p;
  };
  const add = (p, geo, cat, parent) => {
    const m = new THREE.Mesh(geo, M[cat]);
    m.userData.cat = cat;
    m.userData.part = p.id;
    m.castShadow = cat !== 'marks';
    m.receiveShadow = true;
    (parent || p.node).add(m);
    p.meshes.push(m);
    return m;
  };
  const addScrew = (p, at, dir, o = {}) => {
    const s = screw(at, dir, o);
    for (const g of s.geos) add(p, g, o.cat || 'dark');
    add(p, s.slot, 'hole');
  };
  // a sub-node turning about a point in the lock plane (spring leaves)
  const hinge = (p, at) => {
    const h = new THREE.Group();
    h.position.set(at[0], at[1], 0);
    p.node.add(h);
    return h;
  };

  // ============================================================ stock
  const stockP = part('stock', 'Walnut half-stock', {housing: true});
  const st = loft(STOCK, {seg: 56, k: 7});
  add(stockP, st.geo, 'walnut');
  const frames = st.frames;
  // a point on the stock's surface: frame nearest x (or arc), at section angle j/seg
  const frameAtX = (x) => frames.reduce((b, f) => (Math.abs(f.p[0] - x) < Math.abs(b.p[0] - x) ? f : b), frames[0]);
  const bottomAt = (f, off = 0) => [f.p[0] - f.up[0] * (f.bot + off), f.p[1] - f.up[1] * (f.bot + off)];
  const topAt = (f, off = 0) => [f.p[0] + f.up[0] * (f.top + off), f.p[1] + f.up[1] * (f.top + off)];

  // ============================================================ barrel and breech
  const barrelP = part('barrel', 'Round barrel with rib');
  const BR = (x) => 0.106 - 0.0072 * Math.max(0, x);
  const prof = [[0.0, 0.0], [0.0, 0.106], [0.3, BR(0.3)], [1.2, BR(1.2)], [2.36, BR(2.36)], [2.375, 0.093], [2.445, 0.093], [2.45, 0.09], [2.45, 0.05]];
  add(barrelP, latheX(prof, 48), 'barrel');
  // the muzzle opening, shown dark (exterior only: no bore is modelled)
  const muzzle = new THREE.CircleGeometry(0.05, 32);
  muzzle.rotateY(Math.PI / 2);
  muzzle.translate(2.4505, 0, 0);
  add(barrelP, muzzle, 'hole');
  // the iron rib under the barrel beyond the forend, its loop for the barrel key, a small brass front sight
  add(barrelP, extrude([[1.23, -0.122], [2.28, -0.122], [2.28, -0.08], [1.23, -0.08]], -0.016, 0.016, {bevel: 0.003}), 'barrel');
  add(barrelP, extrude([[0.775, -0.136], [0.845, -0.136], [0.845, -0.09], [0.775, -0.09]], -0.014, 0.014, {bevel: 0.003}), 'barrel');
  add(barrelP, extrude([[2.27, 0.08], [2.33, 0.08], [2.325, 0.112], [2.29, 0.114]], -0.004, 0.004, {bevel: 0.0015}), 'brass');
  // the touch hole, a dark spot on the right flank beside the pan
  const vent = new THREE.CircleGeometry(0.008, 16);
  vent.translate(0, 0, 0);
  vent.rotateX(0);
  {
    const m = add(barrelP, vent, 'hole');
    m.position.set(0.075, 0.028, 0.1035);
    m.rotation.x = -0.27;
  }
  const pipeP = part('rampipe', 'Iron rammer pipe (on the rib)');
  {
    const outer = latheX([[1.98, 0.025], [1.98, 0.031], [2.08, 0.031], [2.08, 0.025]], 28);
    outer.translate(0, ROD_Y, 0);
    add(pipeP, outer, 'barrel');
    add(pipeP, extrude([[2.0, ROD_Y + 0.02], [2.06, ROD_Y + 0.02], [2.06, -0.12], [2.0, -0.12]], -0.012, 0.012, {bevel: 0.002}), 'barrel');
  }
  const breechP = part('breech', 'Breech plug and tang');
  {
    const plug = latheX([[-0.03, 0.0], [-0.03, 0.098], [0.0, 0.098], [0.0, 0.0]], 36);
    add(breechP, plug, 'iron');
    const tp = [];
    for (let x = -0.02; x >= -0.46; x -= 0.04) tp.push(topAt(frameAtX(x), 0.004));
    add(breechP, sweep(tp, {th: 0.005, hw: (t) => 0.034 - 0.018 * t, n: 4, seg: 16}), 'iron');
  }
  const tangScrewP = part('tangscrew', 'Tang screw', {kind: 'screw'});
  {
    const f = frameAtX(-0.33);
    const at = topAt(f, 0.009);
    addScrew(tangScrewP, [at[0], at[1], 0], [f.up[0], f.up[1], 0], {r: 0.016, shank: 0.2});
  }
  const keyP = part('key', 'Barrel key (wedge)');
  add(keyP, extrude([[0.795, -0.127], [0.825, -0.127], [0.825, -0.111], [0.795, -0.111]], -0.118, 0.124, {bevel: 0.002}), 'iron');
  add(keyP, extrude([[0.788, -0.13], [0.832, -0.13], [0.832, -0.108], [0.788, -0.108]], 0.116, 0.126, {bevel: 0.002}), 'iron');
  const escP = part('escutcheons', 'Key escutcheons');
  for (const s of [-1, 1]) {
    const e = extrude(circle([0.81, -0.119], 0.02, 24).map(([x, y]) => [x + (x - 0.81) * 0.6, y]), 0, 0.004, {bevel: 0.0012});
    if (s < 0) e.translate(0, 0, -0.1105);
    else e.translate(0, 0, 0.1065);
    add(escP, e, 'brass');
  }

  // ============================================================ ramrod
  const rodP = part('ramrod', 'Wooden rammer, brass tip, iron ferrule');
  {
    const wood = latheX([[-0.24, 0.0], [-0.24, 0.0185], [2.31, 0.0185], [2.31, 0.0]], 20);
    wood.translate(0, ROD_Y, 0);
    add(rodP, wood, 'walnut');
    const tip = latheX([[2.305, 0.0], [2.305, 0.02], [2.33, 0.0235], [2.385, 0.0235], [2.395, 0.018], [2.397, 0.0]], 24);
    tip.translate(0, ROD_Y, 0);
    add(rodP, tip, 'brass');
    const fer = latheX([[-0.285, 0.0], [-0.285, 0.016], [-0.275, 0.0195], [-0.235, 0.0195], [-0.235, 0.0]], 20);
    fer.translate(0, ROD_Y, 0);
    add(rodP, fer, 'iron');
  }

  // ============================================================ brass furniture
  const capP = part('buttcap', 'Brass butt cap with long ears');
  {
    const last = STOCK.slice(-4);
    const cap = loft(last, {seg: 48, k: 5, grow: 0.007});
    add(capP, cap.geo, 'brass');
    // the long ears run up both flats of the grip
    const ear = [];
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      if (f.p[1] < -0.36 && f.p[1] > -0.79) ear.push(f);
    }
    const path = ear.map((f) => [f.p[0] + f.up[0] * 0.01, f.p[1] + f.up[1] * 0.01]).reverse();
    const hws = ear.map((f) => f.hw).reverse();
    for (const s of [-1, 1]) {
      const zc = (t) => s * (hws[Math.min(hws.length - 1, Math.round(t * (hws.length - 1)))] + 0.0035);
      add(capP, sweep(path, {th: (t) => 0.012 + 0.058 * Math.pow(1 - t, 1.4), hw: 0.0028, zc, n: 5, seg: 16}), 'brass');
    }
  }
  const capScrewP = part('capscrew', 'Butt cap screw', {kind: 'screw'});
  {
    const f = frames[frames.length - 6];
    const at = topAt(f, 0.012);
    addScrew(capScrewP, [at[0], at[1], 0], [f.up[0], f.up[1], 0], {r: 0.015, shank: 0.12, cat: 'brass'});
  }
  const sideP = part('sideplate', 'Flat brass side plate', {housing: true});
  const SIDE = [[0.03, -0.065], [0.005, -0.1], [-0.12, -0.13], [-0.5, -0.132], [-0.78, -0.11], [-0.85, -0.078], [-0.78, -0.048], [-0.5, -0.05], [-0.22, -0.01], [-0.09, -0.024]];
  add(sideP, extrude(catmull([...SIDE, SIDE[0]], 5).slice(0, -1), -0.1345, -0.1255, {bevel: 0.0022}), 'side');
  const bandP = part('noseband', 'Brass nose band');
  {
    const a = {...STOCK[0]};
    const b = {p: [1.205, -0.0755], top: 0.075, bot: 0.091, hw: 0.102, n: 2.3};
    const band = loft([a, b], {seg: 48, k: 2, grow: 0.0065});
    add(bandP, band.geo, 'brass');
  }
  const entryP = part('entrypipe', 'Brass entry pipe');
  {
    const g = latheX([[1.17, 0.022], [1.17, 0.027], [1.255, 0.029], [1.27, 0.034], [1.272, 0.022]], 28);
    g.translate(0, ROD_Y, 0);
    add(entryP, g, 'brass');
  }

  // ============================================================ trigger and guard
  const guardP = part('guard', 'Brass trigger guard, pointed finial');
  const GUARD = {};
  {
    const front = [];
    for (let x = 0.13; x >= -0.3; x -= 0.03) front.push(bottomAt(frameAtX(x), 0.004));
    add(guardP, sweep(front, {th: 0.0055, hw: (t) => 0.004 + 0.021 * Math.min(1, t / 0.35), n: 4}), 'brass');
    const r0 = bottomAt(frameAtX(-0.3), 0.004);
    const tangPts = [];
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      if (f.p[0] <= -0.79 && f.p[0] >= -1.28) tangPts.push(bottomAt(f, 0.004));
    }
    const r1 = tangPts[0];
    const bow = bezier(r0, [r0[0] - 0.01, -0.53], [r1[0] + 0.02, -0.56], r1, 28);
    add(guardP, sweep(bow, {th: 0.011, hw: 0.016, n: 3}), 'brass');
    add(guardP, sweep(tangPts, {th: 0.0055, hw: (t) => 0.025 - 0.02 * Math.pow(t, 1.3), n: 4}), 'brass');
    GUARD.front = bottomAt(frameAtX(0.02), 0.012);
    GUARD.frontN = frameAtX(0.02).up;
    const fr = frames.filter((f) => f.p[0] <= -1.05)[0];
    GUARD.rear = bottomAt(fr, 0.012);
    GUARD.rearN = fr.up;
  }
  const gsP = part('guardscrews', 'Guard screws', {kind: 'screw'});
  addScrew(gsP, [GUARD.front[0], GUARD.front[1], 0], [-GUARD.frontN[0], -GUARD.frontN[1], 0], {r: 0.011, shank: 0.07, cat: 'brass'});
  addScrew(gsP, [GUARD.rear[0], GUARD.rear[1], 0], [-GUARD.rearN[0], -GUARD.rearN[1], 0], {r: 0.011, shank: 0.07, cat: 'brass'});

  const trigP = part('trigger', 'Trigger', {pivot: G.trig, spin: 'omega'});
  {
    const blade = bezier(G.trig, [G.trig[0] + 0.008, -0.3], [G.trig[0] - 0.005, -0.37], [-0.517, -0.418], 24);
    add(trigP, sweep(blade, {th: (t) => 0.011 - 0.003 * t, hw: 0.011, n: 3}), 'iron');
    const barEnd = [G.arm0[0], G.arm0[1] - 0.004 - 0.0065];
    add(trigP, sweep([G.trig, [(G.trig[0] + barEnd[0]) / 2, (G.trig[1] + barEnd[1]) / 2], barEnd], {th: 0.0065, hw: 0.0095, n: 4}), 'iron');
    add(trigP, rod([G.trig[0], G.trig[1], -0.013], [G.trig[0], G.trig[1], 0.013], 0.014, 20), 'iron');
  }
  const pinP = part('trigpin', 'Trigger pin', {kind: 'screw'});
  add(pinP, rod([G.trig[0], G.trig[1], -0.108], [G.trig[0], G.trig[1], 0.108], 0.0055, 12), 'dark');

  // ============================================================ the lock: plate, pan, fence
  const Z0 = 0.112; // plate inner face
  const Z1 = 0.132; // plate outer face
  const plateP = part('plate', 'Flat lock plate, integral pan and fence', {housing: true, lock: true});
  const PLATE = [[0.315, -0.03], [0.305, -0.112], [0.272, -0.142], [0.1, -0.152], [-0.3, -0.18], [-0.52, -0.172], [-0.7, -0.132], [-0.885, -0.068], [-0.7, -0.033], [-0.5, -0.004], [-0.3, 0.014], [-0.1, 0.026], [0.02, 0.033], [0.2, 0.031], [0.315, 0.004]];
  add(plateP, extrude(PLATE, Z0, Z1, {bevel: 0.004}), 'plate');
  // the integral pan: a trough on the plate's top edge, against the barrel
  {
    const sh = [[0.108, 0.04], [0.108, 0.012], [0.12, 0.002], [0.172, 0.002], [0.185, 0.014], [0.185, 0.04]];
    const g = extrude(sh.map(([z, y]) => [z, y]), 0.016, 0.17, {bevel: 0.0025});
    // built in (z, y) with depth along x: turn the axes so the extrusion runs along x
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    add(plateP, g, 'plate');
    const cav = new THREE.PlaneGeometry(0.138, 0.06);
    cav.rotateX(-Math.PI / 2);
    cav.translate(0.093, 0.0402, 0.1465);
    add(plateP, cav, 'hole');
    // the fence behind the pan
    const fence = extrude([[0.0, 0.028], [0.014, 0.028], [0.014, 0.05], [0.009, 0.058], [0.0, 0.058]], 0.108, 0.176, {bevel: 0.002});
    add(plateP, fence, 'plate');
    // the bolster the frizzen pivots on
    add(plateP, extrude(circle(G.friz, 0.02, 28), Z1 - 0.002, 0.14, {bevel: 0.002}), 'plate');
  }
  {
    const mk = new THREE.PlaneGeometry(1.22, 0.24);
    mk.translate(-0.29, -0.08, Z1 + 0.0004);
    add(plateP, mk, 'marks');
  }

  // ============================================================ cock, jaws, flint
  const cockP = part('cock', 'Gooseneck cock', {pivot: A, spin: 'theta', lock: true});
  {
    // the body: a rounded breast with a short tail, smoothed through its control points
    const ctl = [[-0.075, 0.012], [-0.058, -0.03], [-0.02, -0.056], [0.03, -0.055], [0.066, -0.03], [0.078, 0.004], [0.064, 0.036], [0.036, 0.056], [-0.004, 0.058], [-0.04, 0.042], [-0.075, 0.012]];
    const body = relAll(catmull(ctl, 6).slice(0, -1));
    add(cockP, extrude(body, 0.134, 0.166, {bevel: 0.006, curveSegments: 4}), 'iron');
    const neck = bezier(rel([0.03, 0.044]), rel([0.0, 0.165]), rel([0.17, 0.225]), rel([0.222, 0.112]), 30);
    add(cockP, sweep(neck, {th: (t) => 0.019 - 0.005 * t, hw: 0.0145, zc: 0.152, n: 3.2, seg: 18}), 'iron');
    add(cockP, extrude(relAll([[0.208, 0.085], [0.27, 0.086], [0.272, 0.118], [0.208, 0.118]]), 0.138, 0.184, {bevel: 0.004}), 'iron');
  }
  const topjawP = part('topjaw', 'Top jaw', {pivot: A, spin: 'theta', lock: true});
  add(topjawP, extrude(relAll([[0.208, 0.166], [0.274, 0.166], [0.272, 0.19], [0.22, 0.193], [0.205, 0.184]]), 0.138, 0.184, {bevel: 0.004}), 'iron');
  const jawScrewP = part('jawscrew', 'Jaw screw', {pivot: A, spin: 'theta', kind: 'screw', lock: true});
  {
    const at = rel([0.243, 0.205]);
    addScrew(jawScrewP, [at[0], at[1], 0.161], [0, 1, 0], {r: 0.017, head: 0.012, shank: 0.12, sr: 0.0075});
  }
  const flintP = part('flint', 'Flint wrapped in leather', {pivot: A, spin: 'theta', lock: true});
  add(flintP, extrude(relAll([[0.262, 0.12], [0.335, 0.124], [0.38, 0.136], [0.335, 0.158], [0.262, 0.162]]), 0.139, 0.183, {bevel: 0.004}), 'flint');
  add(flintP, extrude(relAll([[0.214, 0.1175], [0.276, 0.1175], [0.276, 0.1215], [0.214, 0.1215]]), 0.137, 0.185, {bevel: 0.001}), 'leather');
  add(flintP, extrude(relAll([[0.214, 0.1612], [0.276, 0.1612], [0.276, 0.1652], [0.214, 0.1652]]), 0.137, 0.185, {bevel: 0.001}), 'leather');
  const cockScrewP = part('cockscrew', 'Cock (tumbler) screw', {pivot: A, spin: 'theta', kind: 'screw', lock: true});
  addScrew(cockScrewP, [A[0], A[1], 0.166], [0, 0, 1], {r: 0.022, head: 0.009, shank: 0.06, sr: 0.008});

  // ============================================================ frizzen, its screw and spring
  const frizP = part('frizzen', 'Frizzen (steel and pan cover)', {pivot: G.friz, spin: 'phi', lock: true});
  {
    const F = G.friz;
    add(frizP, extrude(circle(F, 0.021, 28), 0.141, 0.19, {bevel: 0.003}), 'iron');
    // pan cover and its arm from the pivot
    add(frizP, extrude([[0.016, 0.0405], [0.188, 0.0405], [0.2, 0.0545], [0.016, 0.0545]], 0.108, 0.188, {bevel: 0.003}), 'iron');
    // the heel from the pivot up to the cover stays outboard, clear of the stock when the frizzen opens
    add(frizP, extrude([[F[0] + 0.02, F[1] + 0.004], [F[0] + 0.022, 0.032], [0.2, 0.0545], [0.176, 0.0405], [F[0] - 0.014, F[1] + 0.012]], 0.141, 0.188, {bevel: 0.003}), 'iron');
    // the face: a thin plate standing on the cover, struck on its rear side
    const fa = G.faceA;
    const fb = G.faceB;
    const d = [fb[0] - fa[0], fb[1] - fa[1]];
    const L = Math.hypot(d[0], d[1]);
    const nx = d[1] / L;
    const ny = -d[0] / L;
    // striking side exactly on the model's face line; the front swells, thick at the foot and thinner at the top
    const front = [];
    for (let i = 0; i <= 12; i++) {
      const t = 1 - i / 12;
      const T = 0.036 - 0.016 * t + 0.008 * Math.sin(Math.PI * t);
      front.push([fa[0] + d[0] * t + nx * T, fa[1] + d[1] * t + ny * T]);
    }
    const facePts = [[fa[0], fa[1] - 0.004], [fb[0], fb[1]], ...front, [fa[0] + nx * 0.036, fa[1] + ny * 0.036 - 0.004]];
    add(frizP, extrude(facePts, 0.112, 0.186, {bevel: 0.003}), 'iron');
    // a slight top lip
    add(frizP, extrude([[fb[0] - 0.004, fb[1] - 0.006], [fb[0] + 0.022, fb[1] + 0.002], [fb[0] + 0.02, fb[1] + 0.009], [fb[0] - 0.006, fb[1] + 0.001]], 0.114, 0.184, {bevel: 0.002}), 'iron');
    // the toe the spring bears on
    const toe = [F[0] + G.toe[0], F[1] + G.toe[1]];
    add(frizP, extrude([[F[0] - 0.012, F[1] - 0.004], [F[0] + 0.012, F[1] - 0.016], [toe[0] + 0.006, toe[1] + 0.004], [toe[0], toe[1] - 0.004], [toe[0] - 0.012, toe[1] + 0.004], [F[0] - 0.006, F[1] - 0.016]], 0.141, 0.166, {bevel: 0.002}), 'iron');
  }
  const frizScrewP = part('frizscrew', 'Frizzen screw', {kind: 'screw', lock: true});
  addScrew(frizScrewP, [G.friz[0], G.friz[1], 0.19], [0, 0, 1], {r: 0.013, head: 0.006, shank: 0.08, sr: 0.006});

  const leaf = (len, th, hw) => {
    // a spring leaf along -x from its hinge, tapering
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push([-len * (i / 16), 0]);
    return sweep(pts, {th: (t) => th * (1 - 0.35 * t), hw, n: 4, seg: 12});
  };
  const fsP = part('frizspring', 'Frizzen spring', {lock: true, kind: 'spring'});
  const FS = {};
  {
    const b = G.fsBend;
    const lowY = b[1] - 0.024;
    // fixed lower leaf and the bend
    add(fsP, sweep([[b[0] + 0.004, lowY], [0.22, lowY + 0.002], [0.155, lowY + 0.004]], {th: 0.0055, hw: 0.012, zc: 0.149, n: 4}), 'spring');
    const bend = [];
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI;
      bend.push([b[0] + 0.004 + 0.012 * Math.cos(a), (b[1] + lowY) / 2 + 0.012 * Math.sin(a)]);
    }
    add(fsP, sweep(bend, {th: 0.0055, hw: 0.012, zc: 0.149, n: 4}), 'spring');
    FS.free = hinge(fsP, b);
    add(fsP, leaf(G.fsLen, 0.0055, 0.012), 'spring', FS.free).position.z = 0.149;
  }
  const fsScrewP = part('fsscrew', 'Frizzen spring screw', {kind: 'screw', lock: true});
  addScrew(fsScrewP, [0.19, G.fsBend[1] - 0.022, 0.163], [0, 0, 1], {r: 0.011, head: 0.005, shank: 0.05, sr: 0.005});

  // ============================================================ inside the lock
  const tumP = part('tumbler', 'Tumbler (half- and full-cock notches)', {pivot: A, spin: 'theta', lock: true});
  {
    const edge = tumblerEdge();
    const pts = edge.map(([a, r]) => [A[0] + r * Math.cos(a), A[1] + r * Math.sin(a)]);
    const a0 = edge[edge.length - 1][0];
    const a1 = edge[0][0] - Math.PI * 2;
    const R = RIDE_R + 0.0005;
    for (let i = 1; i < 60; i++) {
      const a = a0 + ((a1 - a0) * i) / 60;
      pts.push([A[0] + R * Math.cos(a), A[1] + R * Math.sin(a)]);
    }
    add(tumP, extrude(pts, 0.072, 0.108, {bevel: 0.002, curveSegments: 4}), 'dark');
    add(tumP, rod([A[0], A[1], 0.06], [A[0], A[1], 0.165], 0.017, 20), 'dark');
  }
  const swivP = part('swivel', 'Swivel', {pivot: A, spin: 'theta', lock: true});
  {
    const s = [A[0] + G.swivel[0], A[1] + G.swivel[1]];
    add(swivP, rod([s[0], s[1], 0.068], [s[0], s[1], 0.108], 0.0075, 14), 'iron');
    add(swivP, extrude(circle(s, 0.012, 18), 0.066, 0.072, {bevel: 0.001}), 'iron');
  }
  const bridleP = part('bridle', 'Bridle', {lock: true});
  {
    const lobes = [[A, 0.033], [G.sear, 0.022], [[-0.185, 0.0], 0.016]];
    const cloud = lobes.flatMap(([c, r]) => circle(c, r, 24));
    // convex hull of the lobes
    const hull = (P) => {
      const p = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [];
      for (const q of p) {
        while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
        lo.push(q);
      }
      const up = [];
      for (const q of p.reverse()) {
        while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
        up.push(q);
      }
      return lo.slice(0, -1).concat(up.slice(0, -1));
    };
    add(bridleP, extrude(hull(cloud), 0.04, 0.05, {bevel: 0.0018}), 'iron');
    // its post to the plate at the front lobe
    add(bridleP, rod([-0.185, 0.0, 0.05], [-0.185, 0.0, Z0], 0.009, 14), 'iron');
  }
  const bridleScrewP = part('bridlescrew', 'Bridle screw', {kind: 'screw', lock: true});
  addScrew(bridleScrewP, [-0.185, 0.0, 0.04], [0, 0, -1], {r: 0.011, head: 0.005, shank: 0.07, sr: 0.005});
  const searP = part('sear', 'Sear', {pivot: G.sear, spin: 'psi', lock: true});
  {
    const S = G.sear;
    const nose = G.nose0;
    const sh = [nose, [nose[0] - 0.016, nose[1] - 0.012], [S[0] + 0.02, S[1] - 0.018], [S[0] - 0.02, S[1] - 0.018], [G.tail0[0] - 0.013, G.tail0[1] - 0.02], [G.tail0[0] - 0.015, G.tail0[1]], [G.tail0[0] + 0.015, G.tail0[1]], [S[0] - 0.02, S[1] + 0.014], [S[0] + 0.02, S[1] + 0.012], [nose[0] - 0.016, nose[1] + 0.006]];
    add(searP, extrude(sh, 0.076, 0.104, {bevel: 0.0018}), 'dark');
    add(searP, extrude([[G.arm0[0] - 0.012, G.arm0[1]], [G.arm0[0] + 0.012, G.arm0[1]], [G.arm0[0] + 0.012, G.tail0[1] - 0.002], [G.arm0[0] - 0.012, G.tail0[1] - 0.002]], -0.022, 0.08, {bevel: 0.002}), 'dark');
  }
  const searScrewP = part('searscrew', 'Sear screw', {kind: 'screw', lock: true});
  addScrew(searScrewP, [G.sear[0], G.sear[1], Z1], [0, 0, 1], {r: 0.012, head: 0.005, shank: 0.075, sr: 0.0055});
  const ssP = part('searspring', 'Sear spring', {lock: true, kind: 'spring'});
  const SS = {};
  {
    const b = G.ssBend;
    const upY = b[1] + 0.021;
    add(ssP, sweep([[b[0] - 0.004, upY], [-0.62, upY + 0.004], [-0.575, upY + 0.008]], {th: 0.0045, hw: 0.011, zc: 0.092, n: 4}), 'spring');
    const bend = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI / 2 + (i / 12) * Math.PI;
      bend.push([b[0] - 0.004 + 0.0105 * Math.cos(a), (b[1] + upY) / 2 + 0.0105 * Math.sin(a)]);
    }
    add(ssP, sweep(bend, {th: 0.0045, hw: 0.011, zc: 0.092, n: 4}), 'spring');
    SS.free = hinge(ssP, b);
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push([(i / 16), 0]);
    SS.leaf = add(ssP, sweep(pts, {th: (t) => 0.0045 * (1 - 0.3 * t), hw: 0.011, n: 4, seg: 12}), 'spring', SS.free);
    SS.leaf.position.set(0, 0.0045, 0.092);
  }
  const ssScrewP = part('ssscrew', 'Sear spring screw', {kind: 'screw', lock: true});
  addScrew(ssScrewP, [-0.655, G.ssBend[1] + 0.023, 0.08], [0, 0, -1], {r: 0.01, head: 0.005, shank: 0.04, sr: 0.0045});
  const msP = part('mainspring', 'Mainspring', {lock: true, kind: 'spring'});
  const MS = {};
  {
    const b = G.msBend;
    const upY = b[1] + 0.028;
    add(msP, sweep([[b[0] + 0.006, upY], [-0.01, upY + 0.016], [-0.06, upY + 0.032]], {th: (t) => 0.0065 - 0.002 * t, hw: 0.013, zc: 0.092, n: 4}), 'spring');
    const bend = [];
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI / 2 + (i / 14) * Math.PI;
      bend.push([b[0] + 0.006 + 0.014 * Math.cos(a), (b[1] + upY) / 2 + 0.014 * Math.sin(a)]);
    }
    add(msP, sweep(bend, {th: 0.0065, hw: 0.013, zc: 0.092, n: 4}), 'spring');
    // the tang that hooks into the plate
    add(msP, extrude([[b[0] + 0.012, b[1] + 0.02], [b[0] + 0.026, b[1] + 0.02], [b[0] + 0.026, b[1] + 0.008], [b[0] + 0.012, b[1] + 0.008]], 0.08, Z0, {bevel: 0.0015}), 'spring');
    MS.free = hinge(msP, b);
    const pts = [];
    for (let i = 0; i <= 18; i++) pts.push([i / 18, 0]);
    MS.leaf = add(msP, sweep(pts, {th: (t) => 0.0065 - 0.0025 * t, hw: 0.013, n: 4, seg: 12}), 'spring', MS.free);
    MS.leaf.position.set(0, -0.0065, 0.092);
    // the claw that takes the swivel
    MS.claw = new THREE.Group();
    MS.free.add(MS.claw);
    add(msP, rod([0, 0, 0.074], [0, 0, 0.108], 0.0095, 14), 'spring', MS.claw);
  }
  const msScrewP = part('msscrew', 'Mainspring screw', {kind: 'screw', lock: true});
  addScrew(msScrewP, [0.022, G.msBend[1] + 0.032, 0.0855], [0, 0, -1], {r: 0.011, head: 0.005, shank: 0.04, sr: 0.0045});

  // side nails: through the stock from the left into the lock plate
  const nailsP = part('sidenails', 'Side nails (lock screws)', {kind: 'screw'});
  for (const at of [[-0.16, -0.03], [-0.76, -0.075]]) addScrew(nailsP, [at[0], at[1], -0.1345], [0, 0, -1], {r: 0.017, head: 0.008, shank: 0.25, sr: 0.0065, cat: 'dark'});

  // ------------------------------------------------------------ posing
  const tmp = new V3();
  /** lock pose from the derived state d; offsets[id] = THREE.Vector3 world offset (teardown) */
  function pose(d, offsets = {}) {
    const ang = {theta: d.theta, phi: d.phi, psi: -d.psi, omega: d.omega};
    for (const id of order) {
      const p = parts[id];
      const n = p.node;
      if (p.pivot && p.spin) {
        const a = ang[p.spin] * (Math.PI / 180);
        const c = Math.cos(a);
        const s = Math.sin(a);
        const [cx, cy] = p.pivot;
        n.rotation.set(0, 0, a);
        n.position.set(cx - (c * cx - s * cy), cy - (s * cx + c * cy), 0);
      } else {
        n.rotation.set(0, 0, 0);
        n.position.set(0, 0, 0);
      }
      const o = offsets[id];
      if (o) n.position.add(tmp.set(o[0], o[1], o[2]));
    }
    // spring leaves
    FS.free.rotation.z = d.fsAngle * (Math.PI / 180) - Math.PI;
    MS.free.rotation.z = d.msAngle * (Math.PI / 180);
    MS.leaf.scale.x = d.msLen;
    MS.claw.position.set(d.msLen, 0, 0);
    SS.free.rotation.z = d.ssAngle * (Math.PI / 180);
    SS.leaf.scale.x = d.ssLen;
  }
  pose({theta: 20, phi: 0, psi: 6, omega: 0, fsAngle: 200, msAngle: 170, msLen: 0.27, ssAngle: 0, ssLen: 0.16});
  return {root, parts, order, M, pose, frames, STOCK};
}
