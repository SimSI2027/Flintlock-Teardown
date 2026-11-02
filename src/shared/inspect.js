// Collision inspection: every part's surface is sampled once (points in each mesh's own frame), then for any pose the
// points go to world space and into a voxel grid; two parts collide when they share cells. Used by the Playwright tests
// (LIVE.inspect) to check the lock through its whole motion and every teardown through its whole path: a pair may
// only touch where it touched when assembled, and once two parts come apart they must not meet again.
const SKIP = new Set(['marks', 'hole']);
const cache = new WeakMap();

function samples(mesh, cell) {
  const hit = cache.get(mesh);
  if (hit && hit.cell === cell) return hit.pts;
  const g = mesh.geometry;
  const pos = g.getAttribute('position');
  const idx = g.index;
  const n = idx ? idx.count : pos.count;
  const out = [];
  const inv = 1 / cell;
  const v = (i) => [pos.getX(i), pos.getY(i), pos.getZ(i)];
  for (let t = 0; t + 2 < n; t += 3) {
    const A = v(idx ? idx.getX(t) : t);
    const B = v(idx ? idx.getX(t + 1) : t + 1);
    const C = v(idx ? idx.getX(t + 2) : t + 2);
    const L = Math.max(Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]), Math.hypot(C[0] - B[0], C[1] - B[1], C[2] - B[2]));
    const k = Math.max(1, Math.ceil(L * inv * 1.5));
    for (let i = 0; i <= k; i++)
      for (let j = 0; j <= k - i; j++) {
        const u = i / k;
        const w = j / k;
        const s = 1 - u - w;
        out.push(A[0] * s + B[0] * u + C[0] * w, A[1] * s + B[1] * u + C[1] * w, A[2] * s + B[2] * u + C[2] * w);
      }
  }
  const pts = new Float32Array(out);
  cache.set(mesh, {cell, pts});
  return pts;
}

const OFF = 4096;
const S = 8192;
/** voxel sets per part id at the pistol's current pose */
export function voxelize(pistol, cell = 0.006, only = null) {
  const out = {};
  const inv = 1 / cell;
  pistol.root.updateMatrixWorld(true);
  for (const id in pistol.parts) {
    if (only && !only.includes(id)) continue;
    const set = new Set();
    for (const m of pistol.parts[id].meshes) {
      if (SKIP.has(m.userData.cat)) continue;
      const P = samples(m, cell);
      const e = m.matrixWorld.elements;
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i];
        const y = P[i + 1];
        const z = P[i + 2];
        const ix = Math.floor((e[0] * x + e[4] * y + e[8] * z + e[12]) * inv) + OFF;
        const iy = Math.floor((e[1] * x + e[5] * y + e[9] * z + e[13]) * inv) + OFF;
        const iz = Math.floor((e[2] * x + e[6] * y + e[10] * z + e[14]) * inv) + OFF;
        set.add((ix * S + iy) * S + iz);
      }
    }
    out[id] = set;
  }
  return out;
}

/** pairs of parts sharing at least `min` surface cells: [[a, b, count], ...] */
export function overlaps(vox, min = 2) {
  const ids = Object.keys(vox);
  const owner = new Map();
  const count = new Map();
  for (const id of ids)
    for (const key of vox[id]) {
      const o = owner.get(key);
      if (o === undefined) owner.set(key, [id]);
      else {
        for (const other of o) {
          const pk = other < id ? `${other}|${id}` : `${id}|${other}`;
          count.set(pk, (count.get(pk) || 0) + 1);
        }
        o.push(id);
      }
    }
  return [...count.entries()].filter(([, c]) => c >= min).map(([k, c]) => [...k.split('|'), c]);
}
