// The teardown choreography: for every subsystem button, which parts are members, and an ordered list of moves.
// A move carries parts along a polyline path within a window of the teardown progress k (0 assembled, 1 apart), so
// fasteners come out before the part they hold, the lock lifts out of its mortise before anything slides past it,
// and k = 0 is exactly the assembled pistol. Members stay solid; everything else fades to a ghost and steps aside.

export const LOCK = ['plate', 'cock', 'topjaw', 'jawscrew', 'flint', 'cockscrew', 'frizzen', 'frizscrew', 'frizspring', 'fsscrew', 'tumbler', 'swivel', 'bridle', 'bridlescrew', 'sear', 'searscrew', 'searspring', 'ssscrew', 'mainspring', 'msscrew'];
export const ALL_PARTS = ['stock', 'barrel', 'rampipe', 'breech', 'tangscrew', 'key', 'escutcheons', 'ramrod', 'buttcap', 'capscrew', 'sideplate', 'noseband', 'entrypipe', 'guard', 'guardscrews', 'trigger', 'trigpin', 'sidenails', ...LOCK];
const COCKSET = ['cock', 'topjaw', 'jawscrew', 'flint', 'cockscrew'];
const SCREWS = ['tangscrew', 'capscrew', 'guardscrews', 'trigpin', 'cockscrew', 'jawscrew', 'frizscrew', 'fsscrew', 'bridlescrew', 'searscrew', 'ssscrew', 'msscrew', 'sidenails'];
const BARRELSET = ['barrel', 'rampipe', 'breech'];
const without = (a, b) => a.filter((x) => !b.includes(x));

// the stock's butt and wrist directions, filled from the built pistol (buildTeardown)
const DIR = {butt: [-0.36, -0.93, 0], cap: [-0.9, 0.4, 0], gfront: [0, -1, 0], grear: [0.7, -0.7, 0]};
const mul = (v, k) => [v[0] * k, v[1] * k, v[2] * k];

// the opening of every lock teardown: side nails out, the lock lifted out of its mortise
const LIFT = [
  {parts: ['sidenails'], path: [[0, 0, -0.5]], at: [0, 0.2]},
  {parts: LOCK, path: [[0, 0, 0.32]], at: [0.15, 0.42]},
];

function groups() {
  return {
    lock: {
      label: 'LOCK ASSEMBLY',
      members: [...LOCK, 'sidenails'],
      moves: [
        {parts: ['sidenails'], path: [[0, 0, -0.55]], at: [0, 0.32]},
        {parts: LOCK, path: [[0, 0, 0.55]], at: [0.3, 0.72]},
        {parts: 'rest', path: [[0, -0.05, -0.2]], at: [0.6, 0.95]},
      ],
      ghost: [0.5, 0.85],
    },
    cock: {
      label: 'COCK & FLINT',
      members: COCKSET,
      moves: [
        ...LIFT,
        {parts: 'rest', with: ['sidenails'], path: [[0, -0.12, -0.55]], at: [0.4, 0.66]},
        {parts: ['cockscrew'], path: [[0, 0, 0.3]], at: [0.55, 0.7]},
        {parts: COCKSET, path: [[0, 0, 0.24]], at: [0.64, 0.8]},
        {parts: ['jawscrew'], frame: 'cock', path: [[0, 0.32, 0]], at: [0.76, 0.88]},
        {parts: ['topjaw'], frame: 'cock', path: [[0, 0.1, 0]], at: [0.82, 0.94]},
        {parts: ['flint'], frame: 'cock', path: [[0.13, 0, 0]], at: [0.86, 1]},
      ],
      ghost: [0.35, 0.7],
    },
    frizzen: {
      label: 'FRIZZEN & PAN',
      members: ['frizzen', 'frizscrew', 'frizspring', 'fsscrew', 'plate'],
      moves: [
        ...LIFT,
        {parts: 'rest', with: ['sidenails'], path: [[0, -0.12, -0.55]], at: [0.4, 0.66]},
        {parts: ['frizscrew'], path: [[0, 0, 0.3]], at: [0.56, 0.7]},
        {parts: ['fsscrew'], path: [[0, 0, 0.22]], at: [0.6, 0.74]},
        {parts: ['frizzen'], path: [[0, 0, 0.2]], at: [0.7, 0.86]},
        {parts: ['frizspring'], path: [[0, 0, 0.12], [0, -0.07, 0]], at: [0.78, 1]},
      ],
      ghost: [0.35, 0.7],
    },
    internals: {
      label: 'TUMBLER & SEAR',
      members: ['tumbler', 'swivel', 'bridle', 'bridlescrew', 'sear', 'searscrew', 'searspring', 'ssscrew', 'mainspring', 'msscrew', 'plate'],
      moves: [
        ...LIFT,
        {parts: 'rest', with: ['sidenails'], path: [[0, 1.05, 0]], at: [0.4, 0.66]},
        {parts: ['bridlescrew'], path: [[0, 0, -0.42]], at: [0.6, 0.72]},
        {parts: ['searscrew'], path: [[0, 0, 0.26]], at: [0.6, 0.72]},
        {parts: ['ssscrew', 'msscrew'], path: [[0, 0, -0.36]], at: [0.62, 0.74]},
        {parts: ['bridle'], path: [[0, 0, -0.28]], at: [0.7, 0.84]},
        {parts: ['sear', 'tumbler', 'swivel'], path: [[0, 0, -0.17]], at: [0.8, 0.95]},
        {parts: ['searspring'], path: [[0, 0, -0.11]], at: [0.82, 0.96]},
        {parts: ['mainspring'], path: [[0, 0, -0.07]], at: [0.85, 1]},
      ],
      ghost: [0.35, 0.7],
    },
    springs: {
      label: 'SPRINGS',
      members: ['mainspring', 'searspring', 'frizspring'],
      moves: [
        ...LIFT,
        {parts: 'rest', with: ['sidenails'], path: [[0, -0.12, -0.55]], at: [0.4, 0.62]},
        {parts: ['msscrew', 'ssscrew'], path: [[0, 0, -0.16]], at: [0.5, 0.6]},
        {parts: ['fsscrew'], path: [[0, 0, 0.2]], at: [0.5, 0.6]},
        {parts: ['mainspring', 'searspring'], path: [[0, 0, -0.25], [0, 0.56, 0], [0, 0, 0.56]], at: [0.58, 1]},
        {parts: ['frizspring'], path: [[0, 0, 0.3], [0, 0.56, 0]], at: [0.6, 0.95]},
      ],
      ghost: [0.35, 0.7],
    },
    trigger: {
      label: 'TRIGGER & GUARD',
      members: ['trigger', 'trigpin', 'guard', 'guardscrews'],
      moves: [
        {parts: ['trigpin'], path: [[0, 0, 0.32]], at: [0, 0.25]},
        {parts: ['guardscrews'], path: [[0, -0.2, 0]], at: [0.08, 0.3]},
        {parts: ['guard'], path: [[0, -0.42, 0]], at: [0.3, 0.58]},
        {parts: ['trigger'], path: [[0, -0.3, 0]], at: [0.52, 0.8]},
        {parts: 'rest', path: [[0, 0.42, 0]], at: [0.62, 0.95]},
      ],
      ghost: [0.55, 0.9],
    },
    barrel: {
      label: 'BARREL & BREECH',
      members: [...BARRELSET, 'tangscrew', 'key'],
      moves: [
        {parts: ['ramrod'], path: [[1.3, 0, 0], [0, -0.3, 0]], at: [0, 0.32]},
        {parts: ['tangscrew'], path: [[0, 0.32, 0]], at: [0, 0.2]},
        {parts: ['key'], path: [[0, 0, 0.46]], at: [0.1, 0.32]},
        {parts: BARRELSET, path: [[0, 0.45, 0]], at: [0.34, 0.6]},
        {parts: ['tangscrew'], path: [[0, 0.45, 0]], at: [0.34, 0.6]},
        {parts: ['breech'], path: [[-0.34, 0, 0]], at: [0.62, 0.84]},
        {parts: 'rest', path: [[0, -0.32, 0]], at: [0.6, 0.9]},
      ],
      ghost: [0.4, 0.8],
    },
    stock: {
      label: 'STOCK',
      members: ['stock'],
      moves: null, // the full exploded sequence for everything else (filled below)
      ghost: [0.6, 0.95],
    },
    furniture: {
      label: 'BRASS FURNITURE',
      members: ['buttcap', 'capscrew', 'sideplate', 'noseband', 'entrypipe', 'guard', 'guardscrews', 'escutcheons'],
      moves: [
        {parts: ['sidenails'], path: [[0, 0, -0.55]], at: [0, 0.2]},
        {parts: ['ramrod'], path: [[1.3, 0, 0]], at: [0, 0.25]},
        {parts: ['key'], path: [[0, 0, 0.45]], at: [0, 0.2]},
        {parts: ['tangscrew'], path: [[0, 0.3, 0]], at: [0, 0.15]},
        {parts: [...BARRELSET, 'tangscrew'], path: [[0, 0.5, 0]], at: [0.18, 0.4]},
        {parts: ['capscrew'], path: [mul(DIR.cap, 0.18)], at: [0.3, 0.45]},
        {parts: ['guardscrews'], path: [[0, -0.2, 0]], at: [0.3, 0.45]},
        {parts: ['sideplate'], path: [[0, 0, -0.3]], at: [0.3, 0.55]},
        {parts: ['escutcheons'], path: [[0, -0.24, 0]], at: [0.32, 0.52]},
        {parts: ['buttcap'], path: [mul(DIR.butt, 0.3)], at: [0.45, 0.7]},
        {parts: ['guard'], path: [[0, -0.4, 0]], at: [0.45, 0.7]},
        {parts: ['noseband'], path: [[0.36, 0, 0]], at: [0.5, 0.75]},
        {parts: ['entrypipe'], path: [[0.26, 0, 0]], at: [0.6, 0.85]},
      ],
      ghost: [0.55, 0.9],
    },
    ramrod: {
      label: 'RAMROD',
      members: ['ramrod'],
      moves: [
        {parts: ['ramrod'], path: [[1.3, 0, 0], [0, -0.22, 0]], at: [0, 0.7]},
        {parts: 'rest', path: [[0, 0.12, 0]], at: [0.55, 0.9]},
      ],
      ghost: [0.4, 0.8],
    },
    screws: {
      label: 'SCREWS & PINS',
      members: SCREWS,
      moves: [
        {parts: ['sidenails'], path: [[0, 0, -0.42]], at: [0, 0.22]},
        {parts: without(LOCK, []), path: [[0, 0, 0.32]], at: [0.18, 0.42]},
        {parts: ['tangscrew'], path: [[0, 0.3, 0]], at: [0.42, 0.65]},
        {parts: ['capscrew'], path: [mul(DIR.cap, 0.2)], at: [0.42, 0.65]},
        {parts: ['guardscrews'], path: [[0, -0.22, 0]], at: [0.45, 0.68]},
        {parts: ['trigpin'], path: [[0, 0, 0.3]], at: [0.45, 0.7]},
        {parts: ['cockscrew', 'frizscrew', 'fsscrew', 'searscrew'], path: [[0, 0, 0.22]], at: [0.5, 0.78]},
        {parts: ['jawscrew'], frame: 'cock', path: [[0, 0.2, 0]], at: [0.55, 0.82]},
        {parts: ['bridlescrew', 'ssscrew', 'msscrew'], path: [[0, 0, -0.19]], at: [0.6, 0.88]},
      ],
      ghost: [0.4, 0.75],
    },
    all: {
      label: 'EXPLODED',
      members: ALL_PARTS,
      moves: null,
      ghost: null,
    },
  };
}

// the full exploded view: everything apart, in an order that never drags a part through another
function allMoves() {
  return [
    {parts: ['sidenails'], path: [[0, 0, -0.55]], at: [0, 0.2]},
    {parts: ['ramrod'], path: [[1.3, 0, 0], [0, -0.42, 0]], at: [0, 0.32]},
    {parts: ['tangscrew'], path: [[0, 0.32, 0]], at: [0, 0.16]},
    {parts: ['key'], path: [[0, 0, 0.48]], at: [0.04, 0.2]},
    {parts: ['trigpin'], path: [[0, 0, 0.3]], at: [0.04, 0.2]},
    {parts: ['capscrew'], path: [mul(DIR.cap, 0.2)], at: [0.04, 0.2]},
    {parts: ['guardscrews'], path: [[0, -0.2, 0]], at: [0.06, 0.24]},
    {parts: LOCK, path: [[0, 0, 0.6]], at: [0.18, 0.46]},
    {parts: [...BARRELSET, 'tangscrew'], path: [[0, 0.62, 0]], at: [0.3, 0.55]},
    {parts: ['breech'], path: [[-0.36, 0, 0]], at: [0.58, 0.76]},
    {parts: ['guard'], path: [[0, -0.5, 0]], at: [0.28, 0.52]},
    {parts: ['trigger'], path: [[0, -0.3, 0]], at: [0.45, 0.68]},
    {parts: ['sideplate'], path: [[0, 0, -0.38]], at: [0.28, 0.52]},
    {parts: ['escutcheons'], path: [[0, -0.24, 0]], at: [0.3, 0.5]},
    {parts: ['buttcap'], path: [mul(DIR.butt, 0.32)], at: [0.35, 0.6]},
    {parts: ['noseband'], path: [[0.4, 0, 0]], at: [0.58, 0.8]},
    {parts: ['entrypipe'], path: [[0.28, 0, 0]], at: [0.64, 0.86]},
    // inside the lifted lock
    {parts: ['cockscrew'], path: [[0, 0, 0.26]], at: [0.48, 0.6]},
    {parts: ['frizscrew'], path: [[0, 0, 0.3]], at: [0.48, 0.6]},
    {parts: ['fsscrew'], path: [[0, 0, 0.24]], at: [0.5, 0.62]},
    {parts: ['searscrew'], path: [[0, 0, 0.28]], at: [0.5, 0.62]},
    {parts: ['bridlescrew'], path: [[0, 0, -0.42]], at: [0.5, 0.64]},
    {parts: ['ssscrew', 'msscrew'], path: [[0, 0, -0.38]], at: [0.52, 0.66]},
    {parts: COCKSET, path: [[0, 0, 0.24]], at: [0.6, 0.76]},
    {parts: ['frizzen'], path: [[0, 0, 0.2], [0.22, 0, 0]], at: [0.6, 0.82]},
    {parts: ['frizspring'], path: [[0, 0, 0.13], [0, -0.06, 0]], at: [0.64, 0.82]},
    {parts: ['bridle'], path: [[0, 0, -0.28]], at: [0.64, 0.8]},
    {parts: ['sear', 'tumbler', 'swivel'], path: [[0, 0, -0.17]], at: [0.76, 0.92]},
    {parts: ['searspring'], path: [[0, 0, -0.11]], at: [0.78, 0.94]},
    {parts: ['mainspring'], path: [[0, 0, -0.07]], at: [0.8, 0.96]},
    {parts: ['jawscrew'], frame: 'cock', path: [[0, 0.32, 0]], at: [0.76, 0.88]},
    {parts: ['topjaw'], frame: 'cock', path: [[0, 0.1, 0]], at: [0.82, 0.94]},
    {parts: ['flint'], frame: 'cock', path: [[0.13, 0, 0]], at: [0.86, 1]},
  ];
}

export const GROUP_ORDER = ['lock', 'cock', 'frizzen', 'internals', 'springs', 'trigger', 'barrel', 'stock', 'furniture', 'ramrod', 'screws'];

export function buildTeardown(pistol) {
  // directions from the built stock
  if (pistol) {
    const f = pistol.frames;
    const e = f[f.length - 1];
    DIR.butt = [e.t[0], e.t[1], 0];
    const c = f[f.length - 6];
    DIR.cap = [c.up[0], c.up[1], 0];
  }
  const G = groups();
  G.stock.moves = allMoves();
  G.all.moves = allMoves();
  for (const k of Object.keys(G)) G[k].id = k;
  return G;
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
// entrances: cubic-bezier(0.16, 1, 0.3, 1)-like out, state to state in-out
const easeInOut = (x) => {
  const u = clamp01(x);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};
const along = (path, p) => {
  // position at fraction p along a polyline of offsets (by length)
  const segs = path.map((v) => Math.hypot(v[0], v[1], v[2]));
  const total = segs.reduce((a, b) => a + b, 0) || 1;
  let d = p * total;
  const out = [0, 0, 0];
  for (let i = 0; i < path.length; i++) {
    const f = Math.min(1, d / (segs[i] || 1));
    out[0] += path[i][0] * f;
    out[1] += path[i][1] * f;
    out[2] += path[i][2] * f;
    d -= segs[i];
    if (d <= 0) break;
  }
  return out;
};

/**
 * Offsets and ghosting for subsystem g at progress k. theta (deg) turns cock-frame moves with the cock.
 * Returns {offsets: {id: [x,y,z]}, alpha: {id: 0..1}} (alpha 1 solid, < 1 ghosted).
 */
export function evalTeardown(G, g, k, theta = 0) {
  const offsets = {};
  const alpha = {};
  if (!g || !G[g] || k <= 0) return {offsets, alpha};
  const grp = G[g];
  const members = new Set(grp.members);
  const rest = ALL_PARTS.filter((p) => !members.has(p));
  const a = (theta * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  for (const mv of grp.moves) {
    // 'rest': every non-member the group does not choreograph itself steps aside
    const ids = mv.parts === 'rest' ? [...rest.filter((p) => !grp.moves.some((m) => m.parts !== 'rest' && m.parts.includes(p))), ...(mv.with || [])] : mv.parts;
    const p = easeInOut((k - mv.at[0]) / (mv.at[1] - mv.at[0]));
    if (p <= 0) continue;
    let v = along(mv.path, p);
    if (mv.frame === 'cock') v = [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
    for (const id of ids) {
      const o = offsets[id] || (offsets[id] = [0, 0, 0]);
      o[0] += v[0];
      o[1] += v[1];
      o[2] += v[2];
    }
  }
  if (grp.ghost) {
    const gk = easeInOut((k - grp.ghost[0]) / (grp.ghost[1] - grp.ghost[0]));
    for (const id of rest) alpha[id] = 1 - 0.86 * gk;
  }
  return {offsets, alpha};
}
