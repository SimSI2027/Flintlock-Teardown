// Geometry helpers: every part of the pistol is generated here from code (no downloaded models). Profiles are 2D
// outlines in the lock plane (x toward the muzzle, y up); z is across the pistol, + toward the lock side.
import * as THREE from 'three';

const V3 = THREE.Vector3;

/** cubic Bezier through 4 control points, n samples */
export function bezier(p0, p1, p2, p3, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = (1 - t) ** 3;
    const b = 3 * (1 - t) ** 2 * t;
    const c = 3 * (1 - t) * t * t;
    const d = t ** 3;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

/** Catmull-Rom through points (2D or with extra scalar columns), k samples per span */
export function catmull(pts, k = 8) {
  const out = [];
  const n = pts.length;
  const at = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(p1.map((_, c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push([...pts[n - 1]]);
  return out;
}

const sgnPow = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
const val = (f, t) => (typeof f === 'function' ? f(t) : f);

/**
 * Sweep a rounded-rectangle (superellipse) section along a 2D path in the x-y plane.
 * th: half thickness in the plane (along the path normal), hw: half width along z, zc: section centre in z.
 * Each may be a number or a function of t (0..1 along the path).
 */
export function sweep(path, {th = 0.01, hw = 0.01, zc = 0, n = 3, seg = 16, caps = true} = {}) {
  const pos = [];
  const uv = [];
  const idx = [];
  const m = path.length;
  const L = [0];
  for (let i = 1; i < m; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = L[m - 1] || 1;
  const rings = [];
  for (let i = 0; i < m; i++) {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(m - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty;
    const ny = tx;
    const t = L[i] / total;
    const T = val(th, t);
    const W = val(hw, t);
    const Z = val(zc, t);
    const ring = [];
    for (let j = 0; j < seg; j++) {
      const ang = (j / seg) * Math.PI * 2;
      const u = sgnPow(Math.cos(ang), 2 / n) * T;
      const w = sgnPow(Math.sin(ang), 2 / n) * W;
      ring.push(pos.length / 3);
      pos.push(path[i][0] + nx * u, path[i][1] + ny * u, Z + w);
      uv.push(t * total * 4, j / seg);
    }
    rings.push(ring);
  }
  for (let i = 0; i < m - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = rings[i][j];
      const b = rings[i][(j + 1) % seg];
      const c = rings[i + 1][j];
      const d = rings[i + 1][(j + 1) % seg];
      idx.push(a, c, b, b, c, d);
    }
  if (caps)
    for (const [ri, flip] of [[0, true], [m - 1, false]]) {
      const ring = rings[ri];
      let cx = 0;
      let cy = 0;
      let cz = 0;
      const base = pos.length / 3;
      for (const k of ring) {
        cx += pos[k * 3];
        cy += pos[k * 3 + 1];
        cz += pos[k * 3 + 2];
      }
      pos.push(cx / seg, cy / seg, cz / seg);
      uv.push(0, 0);
      for (const k of ring) {
        pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
        uv.push(0, 0);
      }
      for (let j = 0; j < seg; j++) {
        const a = base + 1 + j;
        const b = base + 1 + ((j + 1) % seg);
        if (flip) idx.push(base, b, a);
        else idx.push(base, a, b);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** extrude a 2D outline (x-y) between z0 and z1 with a small bevel, so edges catch the light */
export function extrude(pts, z0, z1, {bevel = 0.003, holes = [], curveSegments = 10} = {}) {
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  sh.closePath();
  for (const h of holes) {
    const p = new THREE.Path();
    if (h.r) p.absarc(h.c[0], h.c[1], h.r, 0, Math.PI * 2, true);
    else h.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    sh.holes.push(p);
  }
  const b = Math.min(bevel, (z1 - z0) * 0.3);
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: Math.max(1e-4, z1 - z0 - 2 * b),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b * 0.9,
    bevelOffset: -b * 0.9,
    bevelSegments: 2,
    curveSegments,
  });
  g.translate(0, 0, z0 + b);
  return g;
}

/** a disc outline (for extrude) */
export const circle = (c, r, n = 28) => Array.from({length: n}, (_, i) => [c[0] + r * Math.cos((i / n) * Math.PI * 2), c[1] + r * Math.sin((i / n) * Math.PI * 2)]);

/** lathe a profile [[x along axis, r], ...] about the x axis */
export function latheX(profile, seg = 40) {
  const g = new THREE.LatheGeometry(profile.map(([x, r]) => new THREE.Vector2(Math.max(1e-4, r), x)), seg);
  // lathe runs about y: turn y onto x
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** a cylinder along a given axis between two points */
export function rod(a, b, r, seg = 18, r2 = r) {
  const A = new V3(...a);
  const B = new V3(...b);
  const d = B.clone().sub(A);
  const g = new THREE.CylinderGeometry(r2, r, d.length(), seg);
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize());
  g.applyQuaternion(q);
  const m = A.clone().add(B).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

/** a slotted screw head (dome) with its shank, along axis from `at` outward in direction dir */
export function screw(at, dir, {r = 0.014, head = 0.006, shank = 0.06, sr = 0.0065} = {}) {
  const D = new V3(...dir).normalize();
  const geos = [];
  const dome = new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, head / r, 1);
  const rim = new THREE.CylinderGeometry(r, r, head * 0.35, 20);
  rim.translate(0, -head * 0.17, 0);
  const sh = new THREE.CylinderGeometry(sr, sr, shank, 12);
  sh.translate(0, -shank / 2 - head * 0.3, 0);
  // the slot as a dark box is added by the caller with its own material
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), D);
  for (const g of [dome, rim, sh]) {
    g.applyQuaternion(q);
    g.translate(at[0], at[1], at[2]);
    geos.push(g);
  }
  const slot = new THREE.BoxGeometry(r * 2.05, head * 0.9, r * 0.28);
  slot.translate(0, head * 0.62, 0);
  slot.applyQuaternion(q);
  slot.translate(at[0], at[1], at[2]);
  return {geos, slot};
}

/**
 * Loft the stock: stations {p:[x,y], top, bot, hw, n} along a spine. Sections are perpendicular to the spine;
 * `top` along the spine's up-normal, `bot` the other way, `hw` across. Returns geometry plus a sampler for the surface.
 */
export function loft(stations, {seg = 48, k = 6, scale = 1, grow = 0} = {}) {
  const cols = stations.map((s) => [s.p[0], s.p[1], s.top, s.bot, s.hw, s.n ?? 2.4]);
  const S = catmull(cols, k);
  const pos = [];
  const uv = [];
  const idx = [];
  const m = S.length;
  let arc = 0;
  const frames = [];
  for (let i = 0; i < m; i++) {
    const a = S[Math.max(0, i - 1)];
    const b = S[Math.min(m - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    if (i) arc += Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]);
    frames.push({p: [S[i][0], S[i][1]], t: [tx, ty], up: [ty, -tx], top: S[i][2] * scale + grow, bot: S[i][3] * scale + grow, hw: S[i][4] * scale + grow, n: S[i][5], arc});
  }
  const ringAt = (f, j) => {
    const ang = (j / seg) * Math.PI * 2;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const u = sgnPow(c, 2 / f.n) * (c >= 0 ? f.top : f.bot);
    const w = sgnPow(s, 2 / f.n) * f.hw;
    return [f.p[0] + f.up[0] * u, f.p[1] + f.up[1] * u, w];
  };
  for (let i = 0; i < m; i++)
    for (let j = 0; j < seg; j++) {
      pos.push(...ringAt(frames[i], j));
      uv.push(frames[i].arc * 1.2, j / seg);
    }
  for (let i = 0; i < m - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j;
      const b = i * seg + ((j + 1) % seg);
      const c = (i + 1) * seg + j;
      const d = (i + 1) * seg + ((j + 1) % seg);
      idx.push(a, c, b, b, c, d);
    }
  // end caps
  for (const [ri, flip] of [[0, false], [m - 1, true]]) {
    const f = frames[ri];
    const base = pos.length / 3;
    pos.push(f.p[0], f.p[1], 0);
    uv.push(0, 0);
    for (let j = 0; j < seg; j++) {
      pos.push(...ringAt(f, j));
      uv.push(0, 0);
    }
    for (let j = 0; j < seg; j++) {
      const a = base + 1 + j;
      const b = base + 1 + ((j + 1) % seg);
      if (flip) idx.push(base, b, a);
      else idx.push(base, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return {geo: g, frames, ringAt};
}

/** merge geometries (all with the same attributes) into one */
export function merge(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = ['position', 'normal', 'uv'];
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    if (!parts.every((p) => p.getAttribute(n))) continue;
    const size = parts[0].getAttribute(n).itemSize;
    const total = parts.reduce((s, p) => s + p.getAttribute(n).count * size, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const p of parts) {
      arr.set(p.getAttribute(n).array, o);
      o += p.getAttribute(n).array.length;
    }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  if (!out.getAttribute('normal')) out.computeVertexNormals();
  return out;
}
