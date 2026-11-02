// The U.S. Model 1805 pistol, built from code in model units (the pistol is about 4 units long; proportions are
// simplified and are not the original's dimensions). Every part is its own node so a teardown can move it; parts
// that turn (cock, tumbler, sear, trigger, frizzen, spring leaves) are posed from the lock's derived state.
// Exterior features follow the catalogued descriptions of surviving pistols (docs/HISTORY.md); where a source is
// silent the shape is a restrained, period-typical estimate and is listed as such there.
import * as THREE from 'three';
import {bezier, catmull, circle, extrude, latheX, loft, merge, rod, sectionAt, shell, sweep} from './geo.js';
import {G, RIDE_R, tumblerEdge} from './lock.js';
import {makeMaterials} from './materials.js';

const V3 = THREE.Vector3;
const A = G.arbor;
const rel = (p) => [A[0] + p[0], A[1] + p[1]];
const relAll = (pts) => pts.map(rel);
const smooth = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// ------------------------------------------------------------ the stock's stations, forend tip to butt
// n: section roundness (higher is boxier), f: how far the sides are pressed into flats (the lock and side-plate
// panels). Behind the fence the wood rises to wrap the breech, so the tang continues the barrel's top line.
export const STOCK = [
  {p: [1.262, -0.074], top: 0.074, bot: 0.092, hw: 0.098, n: 2.3},
  {p: [1.0, -0.08], top: 0.08, bot: 0.09, hw: 0.11, n: 2.4},
  {p: [0.55, -0.082], top: 0.082, bot: 0.09, hw: 0.115, n: 2.5},
  {p: [0.2, -0.09], top: 0.1, bot: 0.122, hw: 0.121, n: 3.2, f: 0.05},
  {p: [0.06, -0.091], top: 0.122, bot: 0.145, hw: 0.124, n: 3.6, f: 0.1},
  {p: [-0.06, -0.092], top: 0.174, bot: 0.158, hw: 0.125, n: 3.8, f: 0.12},
  {p: [-0.3, -0.092], top: 0.166, bot: 0.163, hw: 0.126, n: 3.9, f: 0.13},
  {p: [-0.62, -0.095], top: 0.15, bot: 0.156, hw: 0.125, n: 3.9, f: 0.13},
  {p: [-0.86, -0.115], top: 0.13, bot: 0.132, hw: 0.118, n: 3.4, f: 0.07},
  {p: [-1.05, -0.2], top: 0.107, bot: 0.109, hw: 0.09, n: 2.6},
  {p: [-1.22, -0.33], top: 0.11, bot: 0.113, hw: 0.092, n: 2.5},
  {p: [-1.38, -0.5], top: 0.133, bot: 0.133, hw: 0.106, n: 2.5},
  {p: [-1.49, -0.66], top: 0.153, bot: 0.149, hw: 0.126, n: 2.6},
  {p: [-1.55, -0.77], top: 0.16, bot: 0.154, hw: 0.133, n: 2.7},
  {p: [-1.575, -0.83], top: 0.144, bot: 0.134, hw: 0.122, n: 2.6},
  {p: [-1.585, -0.858], top: 0.1, bot: 0.09, hw: 0.084, n: 2.4},
];
export const ROD_Y = -0.155;
const Z0 = 0.112; // lock plate inner face
const Z1 = 0.132; // lock plate outer face

// the flat lock plate with its pointed tail: smoothed lower and upper edges meeting at the tail, a rounded front
const PLATE_OUTLINE = (() => {
  const bottom = catmull([[0.302, -0.118], [0.27, -0.143], [0.1, -0.153], [-0.12, -0.165], [-0.3, -0.18], [-0.52, -0.172], [-0.7, -0.132], [-0.885, -0.068]], 6);
  const top = catmull([[-0.885, -0.068], [-0.7, -0.034], [-0.5, -0.004], [-0.3, 0.014], [-0.1, 0.026], [0.02, 0.033], [0.2, 0.031], [0.29, 0.02], [0.314, 0.0]], 6);
  return [...bottom, ...top.slice(1), [0.321, -0.03], [0.318, -0.075], [0.311, -0.104]];
})();
// the flat brass side plate (left side, opposite the lock)
const SIDE_OUTLINE = (() => {
  const S = [[0.03, -0.065], [0.005, -0.1], [-0.12, -0.13], [-0.5, -0.132], [-0.78, -0.11], [-0.85, -0.078], [-0.78, -0.048], [-0.5, -0.05], [-0.22, -0.01], [-0.09, -0.024]];
  return catmull([...S, S[0]], 6).slice(0, -1);
})();
const SIDE_Z = [-0.1305, -0.1235];

// ------------------------------------------------------------ screws: one cached geometry per size
// A period slotted head: a low dome over a short rim, cut through by a real slot (two half heads, the slot walls and
// a dark slot floor), with its shank. Placed by a mesh transform, so repeated sizes share their geometry.
const screwCache = new Map();
function screwGeo(r, h, sr, shank) {
  const key = [r, h, sr, shank].join('|');
  if (screwCache.has(key)) return screwCache.get(key);
  const w = Math.max(0.0012, r * 0.13); // half the slot width
  const prof = [[0.0001, -0.25 * h], [0.93 * r, -0.25 * h], [r, -0.1 * h], [r, 0.2 * h], [0.95 * r, 0.36 * h], [0.83 * r, 0.58 * h], [0.62 * r, 0.8 * h], [0.33 * r, 0.95 * h], [0.0001, h]];
  const half = (phi0, sgn) => {
    const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 10, phi0, Math.PI);
    g.scale((r - w) / r, 1, 1);
    g.translate(sgn * w, 0, 0);
    const sh = new THREE.Shape();
    const pts = [...prof.map(([x, y]) => [-x, y]).reverse(), ...prof.map(([x, y]) => [x, y])];
    pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    const wall = new THREE.ShapeGeometry(sh);
    wall.rotateY((-sgn * Math.PI) / 2);
    wall.translate(sgn * w, 0, 0);
    return [g, wall];
  };
  const sh = new THREE.CylinderGeometry(sr, sr, shank, 10, 1, true);
  sh.translate(0, -0.25 * h - shank / 2, 0);
  const metal = merge([...half(0, 1), ...half(Math.PI, -1), sh]);
  const fl = 0.55 * h;
  const floor = new THREE.BoxGeometry(2 * w, fl + 0.25 * h, 2 * r * 0.985);
  floor.translate(0, (fl - 0.25 * h) / 2, 0);
  const out = {metal, floor};
  screwCache.set(key, out);
  return out;
}

// ------------------------------------------------------------ the pistol
export function buildPistol() {
  const root = new THREE.Group();
  const parts = {};
  const order = [];
  // the stock first: the materials need its arcs and outlines for the wood's inlets
  const st = loft(STOCK, {seg: 72, k: 9});
  const frames = st.frames;
  const frameAtX = (x) => frames.reduce((b, f) => (Math.abs(f.p[0] - x) < Math.abs(b.p[0] - x) ? f : b), frames[0]);
  const bottomAt = (f, off = 0) => [f.p[0] - f.up[0] * (f.bot + off), f.p[1] - f.up[1] * (f.bot + off)];
  const topAt = (f, off = 0) => [f.p[0] + f.up[0] * (f.top + off), f.p[1] + f.up[1] * (f.top + off)];
  const surf = (f, ang, grow) => sectionAt(f, ang, grow).slice(0, 3);
  const capStart = frames.findIndex((f) => f.p[1] < -0.655);
  // the half-angle that spans a half-width w either side of the top (or bottom) of a section
  const angW = (f, w) => Math.asin(Math.min(1, Math.pow(Math.min(1, Math.max(0, w) / f.hw), f.n / 2)));
  // the angles on a side (sgn +1 lock side, -1 left) between section offsets u0 (below) and u1 (above)
  const angU = (f, u0, u1, sgn) => {
    const a = (u, h) => Math.acos(Math.sign(u) * Math.min(1, Math.pow(Math.abs(u) / h, f.n / 2)));
    const lo = a(u1, f.top);
    const hi = Math.PI - a(-u0, f.bot);
    return sgn > 0 ? [lo, hi] : [2 * Math.PI - hi, 2 * Math.PI - lo];
  };
  // a strap lying on the stock: rows of [frame, a0, a1, outer grow], all with the same inner grow
  const strap = (rows, gIn = -0.002, C = 9) => {
    const outer = [];
    const inner = [];
    for (const [f, a0, a1, gOut] of rows) {
      const o = [];
      const n = [];
      for (let k = 0; k < C; k++) {
        const a = a0 + ((a1 - a0) * k) / (C - 1);
        o.push(surf(f, a, gOut));
        n.push(surf(f, a, gIn));
      }
      outer.push(o);
      inner.push(n);
    }
    const border = [...outer.map((r) => r[0]), ...outer[outer.length - 1].slice(1), ...outer.map((r) => r[C - 1]).reverse().slice(1), ...outer[0].slice(1, -1).reverse()];
    return {geo: shell(outer, inner), border: border.map(([x, y]) => [x, y])};
  };

  // butt-cap ears: long tapering straps up both flats of the grip from the cap
  const ears = [-1, 1].map((sgn) => {
    const rows = [];
    const sel = frames.map((f, i) => [f, i]).filter(([f, i]) => i <= capStart + 2 && f.p[1] < -0.36);
    sel.forEach(([f], j) => {
      const t = 1 - j / (sel.length - 1); // 1 at the top (tip), 0 at the cap
      const hu = 0.0035 + 0.046 * Math.pow(1 - t, 0.9);
      const [a0, a1] = angU(f, -hu, hu, sgn);
      rows.push([f, a0, a1, 0.0045 - 0.0028 * t]);
    });
    return strap(rows);
  });
  const arcAtX = (x) => frameAtX(x).arc;
  const cartouche = {x: -0.975, y: -0.158, w: 0.11, h: 0.072, a: 0.42};
  const M = makeMaterials({
    Z1,
    ROD_Y,
    arcs: {cap: frames[capStart].arc, band: arcAtX(1.205), pol: [arcAtX(-0.7), frames[capStart].arc]},
    shapes: {right: [PLATE_OUTLINE, ears[1].border], left: [SIDE_OUTLINE, ears[0].border], both: [], cartouche},
  });

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
    m.castShadow = cat !== 'hole';
    m.receiveShadow = true;
    (parent || p.node).add(m);
    p.meshes.push(m);
    return m;
  };
  const Y = new V3(0, 1, 0);
  const addScrew = (p, at, dir, o = {}) => {
    const {r = 0.014, head = 0.006, shank = 0.06, sr = 0.0065, cat = 'dark'} = o;
    const g = screwGeo(r, head, sr, shank);
    const q = new THREE.Quaternion().setFromUnitVectors(Y, new V3(...dir).normalize());
    // the slot turned to a settled, unaligned angle (from the screw's position, so every load is identical)
    const spin = new THREE.Quaternion().setFromAxisAngle(Y, ((at[0] * 97.3 + at[1] * 61.7 + at[2] * 13.1) % 1) * Math.PI);
    q.multiply(spin);
    for (const [geo, c] of [[g.metal, cat], [g.floor, 'hole']]) {
      const m = add(p, geo, c);
      m.position.set(at[0], at[1], at[2]);
      m.quaternion.copy(q);
    }
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
  add(stockP, st.geo, 'walnut');

  // ============================================================ barrel and breech
  const barrelP = part('barrel', 'Round barrel with rib');
  const BR = (x) => 0.106 - 0.0072 * Math.max(0, x);
  {
    // round, tapering gently to a plain muzzle with a softened crown; a short dark bore (no bore is modelled)
    const prof = [[0.0, 0.0], [0.0, 0.1035], [0.003, 0.106]];
    for (let x = 0.15; x < 2.43; x += 0.15) prof.push([x, BR(x)]);
    prof.push([2.436, BR(2.436)], [2.445, BR(2.445) - 0.0022], [2.4495, BR(2.45) - 0.0075], [2.45, 0.067], [2.4465, 0.0625]);
    add(barrelP, latheX(prof, 64), 'barrel');
    add(barrelP, latheX([[2.4465, 0.0625], [2.33, 0.0625], [2.33, 0.0]], 40), 'hole');
  }
  // the iron rib under the barrel beyond the forend: a rounded bar with tapered ends, and its loop for the key
  {
    const path = [];
    for (let i = 0; i <= 24; i++) {
      const x = 1.232 + (2.282 - 1.232) * (i / 24);
      path.push([x, -BR(x) - 0.012]);
    }
    add(barrelP, sweep(path, {th: (t) => 0.016 * (0.55 + 0.45 * Math.min(1, t / 0.04, (1 - t) / 0.06)), hw: (t) => 0.0145 * (0.75 + 0.25 * Math.min(1, t / 0.04, (1 - t) / 0.06)), n: 3, seg: 16}), 'barrel');
  }
  add(barrelP, extrude([[0.775, -0.136], [0.845, -0.136], [0.845, -0.09], [0.775, -0.09]], -0.014, 0.014, {bevel: 0.003}), 'barrel');
  // the small brass front sight: a low rounded blade
  add(barrelP, extrude(catmull([[2.27, 0.082], [2.274, 0.095], [2.288, 0.108], [2.305, 0.112], [2.322, 0.104], [2.332, 0.09], [2.334, 0.082]], 4), -0.0035, 0.0035, {bevel: 0.0012, bevelSegments: 3}), 'brass');
  // the touch hole, a dark spot on the right flank beside the pan
  {
    const m = add(barrelP, new THREE.CircleGeometry(0.008, 16), 'hole');
    m.position.set(0.075, 0.028, 0.1035);
    m.rotation.x = -0.27;
  }
  const pipeP = part('rampipe', 'Iron rammer pipe (on the rib)');
  {
    const outer = latheX([[1.975, 0.0245], [1.975, 0.031], [1.979, 0.0335], [1.988, 0.0335], [1.993, 0.031], [2.067, 0.031], [2.072, 0.0335], [2.081, 0.0335], [2.085, 0.031], [2.085, 0.0245]], 32);
    outer.translate(0, ROD_Y, 0);
    add(pipeP, outer, 'iron');
    add(pipeP, extrude([[2.0, ROD_Y + 0.022], [2.06, ROD_Y + 0.022], [2.056, -0.112], [2.004, -0.112]], -0.011, 0.011, {bevel: 0.002, bevelSegments: 3}), 'iron');
  }
  const breechP = part('breech', 'Breech plug and tang');
  {
    // the plug closes the barrel flush with its rear end: only a fine joint line shows
    add(breechP, latheX([[-0.034, 0.0], [-0.034, 0.099], [-0.029, 0.1035], [-0.0006, 0.1035], [-0.0006, 0.0]], 48), 'barrel');
    // the tang: a strap along the top of the wrist, rising at its front to meet the plug, ending in a rounded point
    const rows = [];
    const sel = frames.filter((f) => f.p[0] <= -0.02 && f.p[0] >= -0.47);
    sel.forEach((f, j) => {
      const t = j / (sel.length - 1); // 0 at the breech, 1 at the tail
      const w = (0.033 - 0.013 * t) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.82) / 0.18), 2)));
      const a = angW(f, Math.max(0.0015, w));
      rows.push([f, -a, a, 0.004 + 0.0045 * smooth(-0.12, -0.025, f.p[0])]);
    });
    add(breechP, strap(rows, -0.002, 9).geo, 'iron');
  }
  const tangScrewP = part('tangscrew', 'Tang screw', {kind: 'screw'});
  {
    const f = frameAtX(-0.33);
    const at = topAt(f, 0.0035);
    addScrew(tangScrewP, [at[0], at[1], 0], [f.up[0], f.up[1], 0], {r: 0.0155, head: 0.006, shank: 0.2, sr: 0.006, cat: 'iron'});
  }
  const keyP = part('key', 'Barrel key (wedge)');
  add(keyP, extrude([[0.795, -0.127], [0.825, -0.127], [0.825, -0.111], [0.795, -0.111]], -0.118, 0.124, {bevel: 0.002}), 'iron');
  add(keyP, extrude([[0.786, -0.13], [0.834, -0.13], [0.836, -0.119], [0.834, -0.108], [0.786, -0.108], [0.784, -0.119]], 0.116, 0.127, {bevel: 0.0025, bevelSegments: 3}), 'iron');
  const escP = part('escutcheons', 'Key escutcheons');
  for (const s of [-1, 1]) {
    const e = extrude(circle([0.81, -0.119], 0.021, 32).map(([x, y]) => [x + (x - 0.81) * 0.55, y]), 0, 0.0042, {bevel: 0.0016, bevelSegments: 3});
    if (s < 0) e.translate(0, 0, -0.111);
    else e.translate(0, 0, 0.1068);
    add(escP, e, 'brass');
  }

  // ============================================================ ramrod
  const rodP = part('ramrod', 'Wooden rammer, brass tip, iron ferrule');
  {
    const wood = latheX([[-0.24, 0.0], [-0.24, 0.0185], [2.305, 0.0185], [2.305, 0.0]], 20);
    wood.translate(0, ROD_Y, 0);
    // grain coordinates for the wood shader: along the rod, across it
    const p = wood.getAttribute('position');
    const wd = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) wd.set([p.getX(i), p.getY(i) - ROD_Y, p.getZ(i), 0], i * 4);
    wood.setAttribute('wd', new THREE.BufferAttribute(wd, 4));
    add(rodP, wood, 'rodwood');
    // the brass rammer head, flared, its face slightly cupped
    const tip = latheX([[2.298, 0.0], [2.298, 0.0192], [2.33, 0.0204], [2.36, 0.0228], [2.383, 0.0262], [2.393, 0.0268], [2.3985, 0.0245], [2.3995, 0.012], [2.396, 0.0]], 28);
    tip.translate(0, ROD_Y, 0);
    add(rodP, tip, 'brass');
    const fer = latheX([[-0.287, 0.0], [-0.287, 0.0145], [-0.283, 0.0185], [-0.276, 0.0196], [-0.236, 0.0196], [-0.232, 0.0186], [-0.232, 0.0]], 24);
    fer.translate(0, ROD_Y, 0);
    add(rodP, fer, 'iron');
  }

  // ============================================================ brass furniture
  const capP = part('buttcap', 'Brass butt cap with long ears');
  {
    const last = STOCK.slice(-4);
    const cap = loft(last, {seg: 64, k: 6, grow: 0.0068, open0: true});
    add(capP, cap.geo, 'brass');
    // its open end, inside the wood when assembled: the dark hollow of the cap when it comes off
    {
      const f = cap.frames[0];
      const ring = Array.from({length: 64}, (_, j) => sectionAt(f, (j / 64) * Math.PI * 2, -0.0015));
      const pos = [f.p[0], f.p[1], 0, ...ring.flatMap((p) => p.slice(0, 3))];
      const idx = [];
      for (let j = 0; j < 64; j++) idx.push(0, 1 + j, 1 + ((j + 1) % 64));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      add(capP, g, 'hole');
    }
    for (const e of ears) add(capP, e.geo, 'brass');
  }
  const capScrewP = part('capscrew', 'Butt cap screw', {kind: 'screw'});
  {
    const f = frames[frames.length - 6];
    const at = topAt(f, 0.0062);
    addScrew(capScrewP, [at[0], at[1], 0], [f.up[0], f.up[1], 0], {r: 0.0145, head: 0.0055, shank: 0.12, cat: 'brass'});
  }
  const sideP = part('sideplate', 'Flat brass side plate', {housing: true});
  add(sideP, extrude(SIDE_OUTLINE, SIDE_Z[0], SIDE_Z[1], {bevel: 0.0026, bevelSegments: 3}), 'side');
  const bandP = part('noseband', 'Brass nose band');
  {
    const a = {...STOCK[0]};
    const b = {p: [1.205, -0.0755], top: 0.075, bot: 0.091, hw: 0.102, n: 2.3};
    add(bandP, loft([a, b], {seg: 56, k: 2, grow: 0.0062}).geo, 'brass');
    // a narrow bead at each edge
    const at = (x) => {
      const k = (x - b.p[0]) / (a.p[0] - b.p[0]);
      const mix = (u, v) => u + (v - u) * k;
      return {p: [x, mix(b.p[1], a.p[1])], top: mix(b.top, a.top), bot: mix(b.bot, a.bot), hw: mix(b.hw, a.hw), n: 2.3};
    };
    for (const [x0, x1] of [[1.262, 1.2555], [1.2115, 1.205]]) add(bandP, loft([at(x0), at(x1)], {seg: 56, k: 2, grow: 0.0078}).geo, 'brass');
  }
  const entryP = part('entrypipe', 'Brass entry pipe');
  {
    const g = latheX([[1.17, 0.0215], [1.17, 0.0262], [1.175, 0.029], [1.184, 0.0285], [1.19, 0.027], [1.248, 0.0282], [1.258, 0.0322], [1.27, 0.0335], [1.274, 0.031], [1.274, 0.0215]], 32);
    g.translate(0, ROD_Y, 0);
    add(entryP, g, 'brass');
  }

  // ============================================================ trigger and guard
  const guardP = part('guard', 'Brass trigger guard, pointed finial');
  const GUARD = {};
  {
    // the front tang along the forend's underside, its end rounded
    const fr = frames.filter((f) => f.p[0] <= 0.135 && f.p[0] >= -0.315);
    const rows = fr.map((f, j) => {
      const t = 1 - j / (fr.length - 1); // 0 at the bow, 1 at the front tip
      const w = 0.0165 * Math.sqrt(Math.max(0.0, 1 - Math.pow(Math.max(0, (t - 0.8) / 0.2), 2)));
      const a = angW(f, Math.max(0.0012, w));
      return [f, Math.PI - a, Math.PI + a, 0.0045];
    });
    add(guardP, strap(rows).geo, 'brass');
    // the rear tang down the front of the grip, narrowing to a waist, a small lobe and a pointed finial
    const rr = frames.filter((f) => f.p[0] <= -0.775 && f.p[0] >= -1.29);
    const rrows = rr.map((f, j) => {
      const t = j / (rr.length - 1);
      const base = 0.0178 - 0.0078 * smooth(0, 0.62, t);
      const lobe = 0.0062 * Math.exp(-Math.pow((t - 0.8) / 0.075, 2));
      const w = (base + lobe) * Math.pow(Math.min(1, Math.max(0, (1 - t) / 0.13)), 0.75);
      const a = angW(f, Math.max(0.0008, w));
      return [f, Math.PI - a, Math.PI + a, 0.0045 - 0.001 * t];
    });
    add(guardP, strap(rrows).geo, 'brass');
    // the bow: an oval section, swelling where it springs from the tangs
    const r0 = bottomAt(frameAtX(-0.3), -0.002);
    const r1 = bottomAt(rr[0], -0.002);
    const bow = bezier(r0, [r0[0] - 0.01, -0.53], [r1[0] + 0.02, -0.56], r1, 40);
    const ends = (t) => Math.pow(Math.max(0, 1 - t / 0.14), 2) + Math.pow(Math.max(0, 1 - (1 - t) / 0.14), 2);
    add(guardP, sweep(bow, {th: (t) => 0.0112 + 0.003 * ends(t), hw: (t) => 0.0128 + 0.0055 * ends(t), n: 2.5, seg: 20}), 'brass');
    GUARD.front = bottomAt(frameAtX(0.02), 0.0042);
    GUARD.frontN = frameAtX(0.02).up;
    const fr2 = frames.filter((f) => f.p[0] <= -1.05)[0];
    GUARD.rear = bottomAt(fr2, 0.0038);
    GUARD.rearN = fr2.up;
  }
  const gsP = part('guardscrews', 'Guard screws', {kind: 'screw'});
  addScrew(gsP, [GUARD.front[0], GUARD.front[1], 0], [-GUARD.frontN[0], -GUARD.frontN[1], 0], {r: 0.0105, head: 0.0045, shank: 0.055, sr: 0.005, cat: 'brass'});
  addScrew(gsP, [GUARD.rear[0], GUARD.rear[1], 0], [-GUARD.rearN[0], -GUARD.rearN[1], 0], {r: 0.0105, head: 0.0045, shank: 0.07, sr: 0.005, cat: 'brass'});

  const trigP = part('trigger', 'Trigger', {pivot: G.trig, spin: 'omega'});
  {
    // a flat blade, deep at the top, curving back to a rounded tip
    const blade = bezier(G.trig, [G.trig[0] + 0.01, -0.3], [G.trig[0] + 0.0, -0.38], [-0.519, -0.42], 30);
    add(trigP, sweep(blade, {th: (t) => 0.0158 - 0.0072 * t + 0.0018 * Math.pow(t, 6), hw: (t) => 0.0078 - 0.0012 * t, n: 3.6, seg: 18}), 'iron');
    const barEnd = [G.arm0[0], G.arm0[1] - 0.004 - 0.0065];
    add(trigP, sweep([G.trig, [(G.trig[0] + barEnd[0]) / 2, (G.trig[1] + barEnd[1]) / 2], barEnd], {th: 0.0065, hw: 0.0095, n: 4}), 'iron');
    add(trigP, rod([G.trig[0], G.trig[1], -0.013], [G.trig[0], G.trig[1], 0.013], 0.014, 20), 'iron');
  }
  const pinP = part('trigpin', 'Trigger pin', {kind: 'screw'});
  add(pinP, rod([G.trig[0], G.trig[1], -0.108], [G.trig[0], G.trig[1], 0.108], 0.0055, 12), 'dark');

  // ============================================================ the lock: plate, pan, fence
  const plateP = part('plate', 'Flat lock plate, integral pan and fence', {housing: true, lock: true});
  add(plateP, extrude(PLATE_OUTLINE, Z0, Z1, {bevel: 0.005, bevelSegments: 3}), 'plate');
  // the integral pan: a rounded trough on the plate's top edge, against the barrel; its fence behind it
  {
    const sh = [[0.108, 0.04], [0.108, 0.009], [0.113, 0.001], [0.124, -0.0055], [0.148, -0.0085], [0.167, -0.0055], [0.179, 0.003], [0.186, 0.017], [0.188, 0.04]];
    const g = extrude(sh, 0.016, 0.17, {bevel: 0.0028, bevelSegments: 3});
    // built in (z, y) with depth along x: turn the axes so the extrusion runs along x
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    add(plateP, g, 'pan');
    const cav = new THREE.PlaneGeometry(0.136, 0.064);
    cav.rotateX(-Math.PI / 2);
    cav.translate(0.093, 0.0402, 0.1465);
    add(plateP, cav, 'hole');
    add(plateP, extrude([[0.0, 0.026], [0.014, 0.026], [0.014, 0.048], [0.011, 0.055], [0.006, 0.058], [0.0, 0.058]], 0.108, 0.176, {bevel: 0.0022, bevelSegments: 3}), 'pan');
    // the bolster the frizzen pivots on
    add(plateP, extrude(circle(G.friz, 0.02, 32), Z1 - 0.002, 0.14, {bevel: 0.002}), 'plate');
  }

  // ============================================================ cock, jaws, flint
  const cockP = part('cock', 'Gooseneck cock', {pivot: A, spin: 'theta', lock: true});
  {
    // the body round the tumbler square: a flat forging with a full bevel
    const ctl = [[-0.078, 0.004], [-0.07, -0.03], [-0.04, -0.054], [0.0, -0.061], [0.04, -0.056], [0.068, -0.032], [0.08, 0.0], [0.07, 0.032], [0.044, 0.054], [0.008, 0.061], [-0.03, 0.05], [-0.06, 0.034], [-0.078, 0.004]];
    add(cockP, extrude(relAll(catmull(ctl, 6).slice(0, -1)), 0.134, 0.168, {bevel: 0.006, bevelSegments: 3, curveSegments: 4}), 'cock');
    // the swan neck: flat-sided, thick where it leaves the body, slimmest at the turn, filling out into the jaw
    const neck = bezier(rel([0.035, 0.04]), rel([0.0, 0.165]), rel([0.17, 0.232]), rel([0.214, 0.106]), 34);
    add(cockP, sweep(neck, {th: (t) => 0.0135 + 0.007 * Math.pow(1 - t, 3) + 0.0035 * Math.pow(t, 4), hw: 0.0148, zc: 0.151, n: 4.4, seg: 22}), 'cock');
    // the lower jaw, its front rounded (kept short of the fence at the forward stop)
    add(cockP, extrude(relAll([[0.198, 0.084], [0.263, 0.084], [0.269, 0.09], [0.271, 0.104], [0.267, 0.114], [0.26, 0.118], [0.198, 0.118]]), 0.138, 0.184, {bevel: 0.004, bevelSegments: 3}), 'cock');
  }
  const topjawP = part('topjaw', 'Top jaw', {pivot: A, spin: 'theta', lock: true});
  add(topjawP, extrude(relAll([[0.205, 0.166], [0.266, 0.166], [0.273, 0.172], [0.271, 0.185], [0.26, 0.192], [0.222, 0.194], [0.205, 0.186]]), 0.138, 0.184, {bevel: 0.004, bevelSegments: 3}), 'cock');
  const jawScrewP = part('jawscrew', 'Jaw screw', {pivot: A, spin: 'theta', kind: 'screw', lock: true});
  {
    const at = rel([0.243, 0.1955]);
    addScrew(jawScrewP, [at[0], at[1], 0.161], [0, 1, 0], {r: 0.017, head: 0.012, shank: 0.12, sr: 0.0075, cat: 'cock'});
  }
  const flintP = part('flint', 'Flint wrapped in leather', {pivot: A, spin: 'theta', lock: true});
  add(flintP, extrude(relAll([[0.262, 0.12], [0.31, 0.1215], [0.338, 0.125], [0.38, 0.136], [0.34, 0.156], [0.3, 0.161], [0.262, 0.162]]), 0.139, 0.183, {bevel: 0.004}), 'flint');
  add(flintP, extrude(relAll([[0.212, 0.1175], [0.278, 0.1175], [0.279, 0.1215], [0.212, 0.1215]]), 0.137, 0.185, {bevel: 0.001}), 'leather');
  add(flintP, extrude(relAll([[0.212, 0.1612], [0.278, 0.1612], [0.279, 0.1652], [0.212, 0.1652]]), 0.137, 0.185, {bevel: 0.001}), 'leather');
  const cockScrewP = part('cockscrew', 'Cock (tumbler) screw', {pivot: A, spin: 'theta', kind: 'screw', lock: true});
  addScrew(cockScrewP, [A[0], A[1], 0.168], [0, 0, 1], {r: 0.022, head: 0.009, shank: 0.06, sr: 0.008, cat: 'cock'});

  // ============================================================ frizzen, its screw and spring
  const frizP = part('frizzen', 'Frizzen (steel and pan cover)', {pivot: G.friz, spin: 'phi', lock: true});
  {
    const F = G.friz;
    const bv = {bevel: 0.003, bevelSegments: 3};
    add(frizP, extrude(circle(F, 0.021, 32), 0.141, 0.19, bv), 'frizzen');
    // the pan cover and its arm from the pivot, the cover's front rounded
    add(frizP, extrude([[0.016, 0.0405], [0.186, 0.0405], [0.196, 0.0445], [0.2, 0.0505], [0.195, 0.0555], [0.016, 0.0555]], 0.108, 0.188, bv), 'frizzen');
    // the heel from the pivot up to the cover stays outboard, clear of the stock when the frizzen opens
    add(frizP, extrude([[F[0] + 0.02, F[1] + 0.004], [F[0] + 0.022, 0.032], [0.2, 0.0545], [0.176, 0.0405], [F[0] - 0.014, F[1] + 0.012]], 0.141, 0.188, bv), 'frizzen');
    // the face: a thin plate standing on the cover, struck on its rear side
    const fa = G.faceA;
    const fb = G.faceB;
    const d = [fb[0] - fa[0], fb[1] - fa[1]];
    const L = Math.hypot(d[0], d[1]);
    const nx = d[1] / L;
    const ny = -d[0] / L;
    // striking side exactly on the model's face line; the front swells, thick at the foot and thinner at the top
    const front = [];
    for (let i = 0; i <= 14; i++) {
      const t = 1 - i / 14;
      const T = 0.036 - 0.016 * t + 0.008 * Math.sin(Math.PI * t);
      front.push([fa[0] + d[0] * t + nx * T, fa[1] + d[1] * t + ny * T]);
    }
    const facePts = [[fa[0], fa[1] - 0.004], [fb[0], fb[1]], ...front, [fa[0] + nx * 0.036, fa[1] + ny * 0.036 - 0.004]];
    add(frizP, extrude(facePts, 0.112, 0.186, bv), 'frizzen');
    // the top turned slightly forward into a rounded lip
    add(frizP, extrude([[fb[0] - 0.004, fb[1] - 0.006], [fb[0] + 0.014, fb[1] - 0.001], [fb[0] + 0.022, fb[1] + 0.004], [fb[0] + 0.021, fb[1] + 0.0095], [fb[0] + 0.012, fb[1] + 0.0105], [fb[0] - 0.006, fb[1] + 0.002]], 0.114, 0.184, {bevel: 0.0022, bevelSegments: 3}), 'frizzen');
    // the toe the spring bears on
    const toe = [F[0] + G.toe[0], F[1] + G.toe[1]];
    add(frizP, extrude([[F[0] - 0.012, F[1] - 0.004], [F[0] + 0.012, F[1] - 0.016], [toe[0] + 0.006, toe[1] + 0.004], [toe[0], toe[1] - 0.004], [toe[0] - 0.012, toe[1] + 0.004], [F[0] - 0.006, F[1] - 0.016]], 0.141, 0.166, {bevel: 0.002}), 'frizzen');
  }
  const frizScrewP = part('frizscrew', 'Frizzen screw', {kind: 'screw', lock: true});
  addScrew(frizScrewP, [G.friz[0], G.friz[1], 0.19], [0, 0, 1], {r: 0.013, head: 0.006, shank: 0.08, sr: 0.006, cat: 'dark'});

  const leaf = (len, th, hw) => {
    // a spring leaf along -x from its hinge, tapering
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push([-len * (i / 16), 0]);
    return sweep(pts, {th: (t) => th * (1 - 0.35 * t), hw, n: 5, seg: 14});
  };
  const fsP = part('frizspring', 'Frizzen spring', {lock: true, kind: 'spring'});
  const FS = {};
  {
    const b = G.fsBend;
    const lowY = b[1] - 0.024;
    // fixed lower leaf and the bend; the lower leaf ends in a small teardrop finial toward the cock
    add(fsP, sweep([[b[0] + 0.004, lowY], [0.22, lowY + 0.002], [0.155, lowY + 0.004]], {th: 0.0055, hw: 0.012, zc: 0.149, n: 5, seg: 14}), 'spring');
    add(fsP, extrude(catmull([[0.162, lowY - 0.0005], [0.152, lowY - 0.0055], [0.142, lowY - 0.0035], [0.134, lowY + 0.004], [0.142, lowY + 0.0105], [0.152, lowY + 0.0125], [0.162, lowY + 0.0085], [0.162, lowY - 0.0005]], 4).slice(0, -1), 0.1385, 0.1595, {bevel: 0.002, bevelSegments: 3}), 'spring');
    const bend = [];
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI / 2 + (i / 14) * Math.PI;
      bend.push([b[0] + 0.004 + 0.012 * Math.cos(a), (b[1] + lowY) / 2 + 0.012 * Math.sin(a)]);
    }
    add(fsP, sweep(bend, {th: 0.006, hw: 0.012, zc: 0.149, n: 5, seg: 14}), 'spring');
    FS.free = hinge(fsP, b);
    add(fsP, leaf(G.fsLen, 0.0055, 0.012), 'spring', FS.free).position.z = 0.149;
  }
  const fsScrewP = part('fsscrew', 'Frizzen spring screw', {kind: 'screw', lock: true});
  addScrew(fsScrewP, [0.19, G.fsBend[1] - 0.022, 0.163], [0, 0, 1], {r: 0.011, head: 0.005, shank: 0.05, sr: 0.005, cat: 'dark'});

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
    for (let i = 0; i <= 16; i++) pts.push([i / 16, 0]);
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

  // side nails: through the stock from the left, heads on the brass side plate, into the lock plate
  const nailsP = part('sidenails', 'Side nails (lock screws)', {kind: 'screw'});
  for (const at of [[-0.16, -0.03], [-0.76, -0.075]]) addScrew(nailsP, [at[0], at[1], SIDE_Z[0]], [0, 0, -1], {r: 0.0165, head: 0.0072, shank: 0.25, sr: 0.0065, cat: 'dark'});

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
