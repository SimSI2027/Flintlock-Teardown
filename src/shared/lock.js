// The lock's one authoritative state model. No three.js in here: plain 2D geometry in the plane of the lock plate
// (x toward the muzzle, y up, seen from the lock side) and a deterministic planner that turns visitor or tour requests
// into motion segments. Every pose, every console value, the schematic and every sound event come from stateAt(t).
//
// The numbers below are MODEL UNITS for a simplified visual study. They are proportioned by eye against museum
// photographs of the U.S. Model 1805 pistol and are not measurements of the original; they are deliberately not
// fabrication-ready. Timing is stylised (the release runs in slow motion so it can be read).

export const D2R = Math.PI / 180;

export const G = {
  arbor: [-0.28, -0.056], // tumbler arbor = cock axis
  friz: [0.205, -0.012], // frizzen pivot (frizzen screw)
  sear: [-0.45, -0.104], // sear pivot (sear screw)
  trig: [-0.47, -0.215], // trigger pivot pin
  HALF: 29, // cock angle where the sear sits in the half-cock notch (degrees from the forward stop)
  RAMP: 7, // the notch's rear ramp the sear climbs out of when cocking further
  FULL: 44, // full-cock step
  MAX: 47, // the cock's rear stop
  FRIZ_OPEN: -66, // frizzen open stop (negative = tipped forward)
  RIDE: 6, // sear rotation (deg, nose down) while the nose rides the tumbler's round
  HOLD_F: 2.4, // sear rotation sitting on the full-cock step
  PSI_MAX: 9, // sear rotation with the trigger fully back
  flint0: [0.1, 0.08], // the flint's edge at the forward stop
  faceA: [0.093, 0.05], // frizzen face, bottom (where it meets the pan cover), closed
  faceB: [0.008, 0.25], // frizzen face, top, closed
  nose0: [-0.343, -0.098], // sear nose tip at psi = 0
  tail0: [-0.535, -0.087], // sear tail top (sear spring bears here)
  arm0: [-0.535, -0.107], // sear arm underside (trigger bar bears here)
  swivel: [0.062, -0.036], // swivel pin, relative to the arbor at theta = 0
  msBend: [0.05, -0.14], // mainspring bend (lower, free leaf)
  fsBend: [0.292, -0.09], // frizzen spring bend (upper, free leaf)
  fsLen: 0.095,
  toe: [0.03, -0.038], // frizzen toe tip relative to the pivot, closed
  ssBend: [-0.7, -0.082], // sear spring bend (lower, free leaf)
};

// ------------------------------------------------------------ small 2D helpers
export const rot = (p, c, deg) => {
  const a = deg * D2R;
  const s = Math.sin(a);
  const k = Math.cos(a);
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  return [c[0] + x * k - y * s, c[1] + x * s + y * k];
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (a) => Math.hypot(a[0], a[1]);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smoother = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const easeInOut = (x) => {
  // cubic-bezier(0.65, 0, 0.35, 1)-like, state to state
  const u = clamp(x, 0, 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};

// ------------------------------------------------------------ geometry of the contacts
export const flintAt = (theta) => rot(G.flint0, G.arbor, theta);
export const faceAt = (phi) => [rot(G.faceA, G.friz, phi), rot(G.faceB, G.friz, phi)];
/** signed side of point p against the frizzen face at phi: s > 0 behind (the flint's side), t along the face 0..1 */
export function faceSide(p, phi) {
  const [A, B] = faceAt(phi);
  const d = sub(B, A);
  const L = len(d);
  const q = sub(p, A);
  return {s: (d[0] * q[1] - d[1] * q[0]) / L, t: (q[0] * d[0] + q[1] * d[1]) / (L * L)};
}
/** the most-closed frizzen angle the flint at theta allows (0 when the flint does not reach the closed face) */
export function phiContact(theta) {
  const F = flintAt(theta);
  const at0 = faceSide(F, 0);
  if (at0.s >= 0 || at0.t < 0 || at0.t > 1.05) return 0;
  let lo = G.FRIZ_OPEN;
  let hi = 0;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    const f = faceSide(F, m);
    if (f.s >= 0 || f.t < 0) lo = m;
    else hi = m;
  }
  return lo;
}
/** the cock angle where the flint first touches the closed frizzen face, coming down */
export const THETA_CONTACT = (() => {
  let lo = 0;
  let hi = G.FULL;
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (phiContact(m) < -1e-6) lo = m;
    else hi = m;
  }
  return hi;
})();
/** rest: the cock lowered onto the closed frizzen, or onto its forward stop when the frizzen is open */
export const restTheta = (phi) => (phi > -1 ? THETA_CONTACT : 0);

// sear rotation the tumbler's edge imposes at cock angle theta (deg, + = nose down/out)
export function psiSurface(theta) {
  if (theta < G.HALF) return G.RIDE;
  if (theta < G.HALF + G.RAMP) return G.RIDE * ((theta - G.HALF) / G.RAMP);
  if (theta < G.FULL) return G.RIDE;
  return G.HOLD_F;
}
export const inHalfNotch = (theta) => theta >= G.HALF - 1e-6 && theta < G.HALF + G.RAMP * 0.35;
export const noseAt = (psi) => rot(G.nose0, G.sear, -psi);
export const tailAt = (psi) => rot(G.tail0, G.sear, -psi);
export const armAt = (psi) => rot(G.arm0, G.sear, -psi);

// the tumbler's edge where the sear meets it, built from the same rule: for each cock angle the edge sits where the
// nose is. Returned in tumbler-local polar form [angle, radius] around the arbor, theta = 0 frame.
export function tumblerEdge() {
  const out = [];
  const push = (theta, psi) => {
    const n = noseAt(psi);
    const d = sub(n, G.arbor);
    out.push([Math.atan2(d[1], d[0]) - theta * D2R, len(d)]);
  };
  for (let th = -6; th <= G.MAX + 4; th += 0.25) {
    // vertical walls at the notch faces: both sides of each jump
    if (Math.abs(th - G.HALF) < 1e-9) push(th - 1e-4, G.RIDE);
    if (Math.abs(th - G.FULL) < 1e-9) push(th - 1e-4, G.RIDE);
    push(th, psiSurface(th));
  }
  return out;
}
export const RIDE_R = len(sub(noseAt(G.RIDE), G.arbor));

// ------------------------------------------------------------ derived pose of every part from the commanded state
/** the trigger angle (deg, negative = pulled) that puts its bar against the sear arm at sear rotation psi */
const BAR0 = [G.arm0[0], G.arm0[1] - 0.004];
export const barAt = (omega) => rot(BAR0, G.trig, omega);
const omegaFor = (psi) => {
  const y = armAt(psi)[1] - 0.004;
  let lo = -30;
  let hi = 0;
  for (let i = 0; i < 36; i++) {
    const m = (lo + hi) / 2;
    if (barAt(m)[1] > y) lo = m;
    else hi = m;
  }
  return hi;
};
const OMEGA = Array.from({length: 101}, (_, i) => omegaFor((i / 100) * G.PSI_MAX));
const omegaOf = (psi) => {
  const u = clamp(psi / G.PSI_MAX, 0, 1) * 100;
  const i = Math.min(99, Math.floor(u));
  return OMEGA[i] + (OMEGA[i + 1] - OMEGA[i]) * (u - i);
};

const msBendFixed = G.msBend;
const fsToeAt = (phi) => rot([G.friz[0] + G.toe[0], G.friz[1] + G.toe[1]], G.friz, phi);

/**
 * Everything the 3D model, the console, the schematic and the sound read. c = commanded {theta, phiCmd, k}.
 */
export function derive(c) {
  const theta = c.theta;
  const pc = phiContact(theta);
  const phi = Math.min(c.phiCmd, pc);
  const surf = psiSurface(theta);
  let psiTrig = c.k * G.PSI_MAX;
  // the hooked half-cock notch holds the sear unless it was already held clear (lowering, release)
  const blocked = !c.thru && inHalfNotch(theta) && psiTrig > surf + 0.8;
  if (!c.thru && inHalfNotch(theta)) psiTrig = Math.min(psiTrig, surf + 0.8);
  const psi = Math.max(surf, psiTrig);
  const omega = omegaOf(psiTrig);
  const flint = flintAt(theta);
  const contact = pc < -1e-6 && c.phiCmd >= pc - 1e-6;
  const swivel = rot([G.arbor[0] + G.swivel[0], G.arbor[1] + G.swivel[1]], G.arbor, theta);
  const ms = sub(swivel, msBendFixed);
  const msAngle = Math.atan2(ms[1], ms[0]) / D2R;
  const msLen = len(ms);
  // frizzen spring: the free leaf's tip follows the toe's lowest point
  const toe = fsToeAt(phi);
  const fsAngle = Math.atan2(toe[1] - 0.0075 - G.fsBend[1], toe[0] - G.fsBend[0]) / D2R;
  // sear spring: the free leaf's tip on the sear tail
  const tail = tailAt(psi);
  const ss = sub(tail, G.ssBend);
  const sear = inHalfNotch(theta) ? 'half' : theta >= G.FULL - 1e-6 ? 'full' : 'riding';
  return {
    theta,
    phi,
    phiCmd: c.phiCmd,
    k: c.k,
    psi,
    psiTrig,
    omega,
    blocked,
    flint,
    contact,
    sear,
    swivel,
    msAngle,
    msLen,
    fsAngle,
    ssAngle: Math.atan2(ss[1], ss[0]) / D2R,
    ssLen: len(ss),
    panOpen: phi < -14,
    // relative deflections 0..1 for the console: model quantities, not forces
    mainspring: clamp(theta / G.MAX, 0, 1),
    frizSpring: clamp(Math.sin((phi / G.FRIZ_OPEN) * Math.PI) * 0.85 + 0.15 * (phi / G.FRIZ_OPEN), 0, 1),
    searSpring: clamp(psi / G.PSI_MAX, 0, 1),
  };
}

// ------------------------------------------------------------ the planner
export const REST0 = {theta: THETA_CONTACT, phiCmd: 0, k: 0};

// a segment animates the commanded state from s0 over dur seconds. ev(u) -> commanded state. phase names the motion.
const seg = (s0, dur, phase, fn) => ({s0, dur, phase, fn, s1: fn(1)});
const lerp = (a, b, k) => a + (b - a) * k;
const cockTo = (s0, theta, dur, opts = {}) =>
  seg(s0, dur, opts.phase || 'cocking', (u) => {
    const e = opts.ease ? opts.ease(u) : easeInOut(u);
    return {...s0, theta: lerp(s0.theta, theta, e), k: opts.k !== undefined ? opts.k : s0.k, thru: !!opts.thru};
  });
const triggerTo = (s0, k, dur, phase = 'trigger') => seg(s0, dur, phase, (u) => ({...s0, k: lerp(s0.k, k, smoother(u))}));
const frizzenTo = (s0, phi, dur, phase) =>
  seg(s0, dur, phase, (u) => {
    // opening: quick start, slow settle; closing: snaps shut over the spring's centre
    const e = phi < s0.phiCmd ? 1 - Math.pow(1 - clamp(u, 0, 1), 3) : Math.pow(clamp(u, 0, 1), 2.2);
    return {...s0, phiCmd: lerp(s0.phiCmd, phi, e)};
  });
const hold = (s0, dur, phase = 'hold') => seg(s0, dur, phase, () => ({...s0}));

// the release: tabulated once per start state with a fixed step, so it is the same every time
function fallSeg(s0) {
  const DT = 1 / 1200;
  const T = [];
  let th = s0.theta;
  let w = 0;
  let phiC = s0.phiCmd;
  let wf = 0;
  let touched = false;
  let left = false;
  let bounce = 0;
  const A = 1050; // deg/s^2, stylised: the fall reads at about a third of a second
  for (let i = 0; i < 1200 * 0.62; i++) {
    const pc = phiContact(th);
    const inContact = pc < phiC - 1e-6 || (touched && !left && pc < -1e-6 && pc <= phiC + 1e-6);
    if (pc < -1e-6 && pc < phiC) {
      // the flint drives the face forward: the frizzen takes the contact angle and the cock slows a little
      const dphi = pc - phiC;
      wf = Math.min(wf, dphi / DT);
      phiC = pc;
      touched = true;
      w += -A * 0.55 * DT;
    } else {
      w += -A * DT;
      if (touched && !left) left = true;
    }
    if (left) {
      // the frizzen flies on to its open stop, the spring catching it past the centre
      wf = Math.min(wf, -420) * 0.9985;
      phiC += wf * DT;
      if (phiC <= G.FRIZ_OPEN) {
        phiC = G.FRIZ_OPEN;
        wf = 0;
      }
    }
    th += w * DT;
    if (th <= 0) {
      th = 0;
      if (bounce === 0) {
        w = 30;
        bounce = 1;
      } else w = 0;
    }
    void inContact;
    T.push([th, phiC]);
  }
  const n = T.length;
  return seg(s0, n * DT, 'release', (u) => {
    const x = clamp(u, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(x));
    const f = x - i;
    return {...s0, theta: lerp(T[i][0], T[i + 1][0], f), phiCmd: lerp(T[i][1], T[i + 1][1], f), k: 1, thru: u < 1};
  });
}

/** the motion segments that carry the lock from state s to the requested op (deterministic) */
export function plan(s, op, value) {
  const out = [];
  let cur = s;
  const push = (sg) => {
    out.push(sg);
    cur = sg.s1;
  };
  const isFull = () => cur.theta >= G.FULL - 0.05;
  const isHalf = () => Math.abs(cur.theta - G.HALF) < 0.05;
  const frizClosed = () => cur.phiCmd > -1;
  const lowerTo = (target) => {
    // thumb on the cock, trigger held, ease it down
    if (!isFull() && cur.theta >= G.HALF - 0.05) {
      push(cockTo(cur, G.MAX, 0.55));
      push(cockTo(cur, G.FULL, 0.2, {phase: 'settle'}));
    }
    push(triggerTo(cur, 0.85, 0.25));
    push(cockTo(cur, target, 1.15, {phase: 'lowering', k: 0.85, thru: true}));
    push(triggerTo(cur, 0, 0.25));
  };
  switch (op) {
    case 'half':
      if (isHalf()) break;
      if (cur.theta < G.HALF) {
        push(cockTo(cur, G.HALF + 3.2, 0.75));
        push(cockTo(cur, G.HALF, 0.22, {phase: 'settle', ease: (u) => u * u}));
      } else {
        push(triggerTo(cur, 0.85, 0.25));
        push(cockTo(cur, G.HALF + 4, 0.9, {phase: 'lowering', k: 0.85, thru: true}));
        push(triggerTo(cur, 0, 0.2));
        push(cockTo(cur, G.HALF, 0.22, {phase: 'settle', ease: (u) => u * u}));
      }
      break;
    case 'full':
      if (isFull()) break;
      push(cockTo(cur, G.MAX, cur.theta < G.HALF - 0.05 ? 1.2 : 0.75));
      push(cockTo(cur, G.FULL, 0.2, {phase: 'settle', ease: (u) => u * u}));
      break;
    case 'release':
      if (isFull()) {
        push(triggerTo(cur, 1, 0.16));
        push(fallSeg(cur));
        push(triggerTo(cur, 0, 0.3, 'trigger-return'));
      } else {
        // at half-cock the hooked notch holds the sear: the trigger stops short. At rest it only takes up slack.
        push(triggerTo(cur, 1, 0.22, isHalf() ? 'blocked' : 'trigger'));
        push(hold(cur, 0.25, isHalf() ? 'blocked' : 'trigger'));
        push(triggerTo(cur, 0, 0.25, 'trigger-return'));
      }
      break;
    case 'rest':
      if (Math.abs(cur.theta - restTheta(cur.phiCmd)) < 0.05) break;
      lowerTo(restTheta(cur.phiCmd));
      break;
    case 'frizzen':
      if (frizClosed()) push(frizzenTo(cur, G.FRIZ_OPEN, 0.42, 'frizzen-open'));
      else {
        if (cur.theta < THETA_CONTACT + 1) {
          push(cockTo(cur, G.HALF + 3.2, 0.85));
          push(cockTo(cur, G.HALF, 0.22, {phase: 'settle', ease: (u) => u * u}));
        }
        push(frizzenTo(cur, 0, 0.36, 'frizzen-close'));
      }
      break;
    case 'drag': {
      // the manual slider: a thumb on the cock; lowering holds the trigger back so the sear clears both notches
      const lo = restTheta(cur.phiCmd);
      const v = clamp(value, lo, G.MAX);
      const down = v < cur.theta - 1e-6;
      push(seg(cur, 0.08, 'manual', (u) => ({...cur, theta: lerp(cur.theta, v, smoother(u)), k: down && cur.theta >= G.HALF - 0.05 ? 0.78 : cur.k * (1 - u), thru: down})));
      break;
    }
    case 'letgo': {
      // let go of the cock: the mainspring takes it back to the notch below it
      push(triggerTo(cur, 0, 0.12, 'manual'));
      const th = cur.theta;
      if (th >= G.FULL - 0.05) push(cockTo(cur, G.FULL, 0.12, {phase: 'settle', ease: (u) => u * u}));
      else if (th >= G.HALF) push(cockTo(cur, G.HALF, 0.1 + 0.02 * (th - G.HALF), {phase: 'settle', ease: (u) => u * u}));
      else if (th > restTheta(cur.phiCmd) + 0.05) push(cockTo(cur, restTheta(cur.phiCmd), 0.12 + 0.012 * th, {phase: 'settle', ease: (u) => u * u}));
      break;
    }
    case 'reset':
      if (cur.k > 0) push(triggerTo(cur, 0, 0.15));
      if (cur.theta >= G.HALF - 0.05 && Math.abs(cur.theta - restTheta(cur.phiCmd)) > 0.05) lowerTo(restTheta(cur.phiCmd));
      if (!frizClosed()) {
        if (cur.theta < THETA_CONTACT + 1) {
          push(cockTo(cur, G.HALF + 3.2, 0.85));
          push(cockTo(cur, G.HALF, 0.22, {phase: 'settle', ease: (u) => u * u}));
        }
        push(frizzenTo(cur, 0, 0.36, 'frizzen-close'));
        lowerTo(THETA_CONTACT);
      }
      break;
    default:
      throw new Error(`unknown op ${op}`);
  }
  return out;
}

/**
 * A timeline of requests -> state at any time. Requests made while the lock is moving wait their turn (except the
 * manual slider, which drops anything queued behind the running segment). Same requests, same times: same motion.
 */
export function createLock(s0 = REST0) {
  const segs = []; // {t0, t1, ...seg}
  const reqs = [];
  let tail = {t: 0, s: s0};
  const endAt = () => (segs.length ? segs[segs.length - 1].t1 : 0);
  function request(t, op, value) {
    reqs.push({t, op, value});
    evCache = null;
    if (op === 'drag' || op === 'letgo') {
      // the hand takes the cock now: drop what has not started and cut the running segment at t
      while (segs.length && segs[segs.length - 1].t0 > t) segs.pop();
      const last = segs[segs.length - 1];
      if (last && last.t1 > t) {
        const f = (t - last.t0) / last.dur;
        const orig = last.fn;
        const cut = {...last, dur: t - last.t0, t1: t, fn: (u) => orig(u * f), s1: orig(f)};
        if (cut.dur <= 1e-9) segs.pop();
        else segs[segs.length - 1] = cut;
      }
      tail = segs.length ? {t: Math.max(t, segs[segs.length - 1].t1), s: segs[segs.length - 1].s1} : {t, s: s0};
    }
    let t0 = Math.max(t, tail.t);
    const list = plan(tail.s, op, value);
    for (const sg of list) {
      segs.push({...sg, t0, t1: t0 + sg.dur});
      t0 += sg.dur;
    }
    if (list.length) tail = {t: t0, s: list[list.length - 1].s1};
    return list.length;
  }
  function find(t) {
    let lo = 0;
    let hi = segs.length - 1;
    let best = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (segs[m].t0 <= t) {
        best = m;
        lo = m + 1;
      } else hi = m - 1;
    }
    return best;
  }
  function commandAt(t) {
    const i = find(t);
    if (i < 0) return {c: s0, phase: 'idle'};
    const sg = segs[i];
    if (t >= sg.t1) return {c: sg.s1, phase: 'idle'};
    return {c: sg.fn((t - sg.t0) / sg.dur), phase: sg.phase};
  }
  function stateAt(t) {
    const {c, phase} = commandAt(t);
    const d = derive(c);
    d.phase = phase;
    d.busy = t < endAt();
    d.label = labelOf(d);
    return d;
  }
  /** the mechanical events in [a, b): every sound and every console flash reads these */
  function eventsBetween(a, b) {
    return events().filter((e) => e.t >= a && e.t < b);
  }
  let evCache = null;
  let evCount = -1;
  function events() {
    if (evCache && evCount === segs.length) return evCache;
    evCache = detectEvents(segs);
    evCount = segs.length;
    return evCache;
  }
  return {request, stateAt, commandAt, events, eventsBetween, endAt, get segs() {
    return segs;
  }, get reqs() {
    return reqs;
  }, busyAt: (t) => t < endAt()};
}

export function labelOf(d) {
  if (d.phase === 'release') return ['RELEASE', 'COCK FALLING · FRIZZEN THROWN OPEN', 'live'];
  if (d.phase === 'lowering') return ['LOWERING', 'TRIGGER HELD · COCK EASED DOWN', 'live'];
  if (d.phase === 'blocked') return ['HALF-COCK', 'TRIGGER BLOCKED BY THE HALF-COCK NOTCH', 'warn'];
  if (d.phase === 'frizzen-open') return ['FRIZZEN', 'OPENING · PAN UNCOVERED', 'live'];
  if (d.phase === 'frizzen-close') return ['FRIZZEN', 'CLOSING OVER THE PAN', 'live'];
  if (d.phase === 'cocking' || d.phase === 'settle' || d.phase === 'manual') {
    if (d.sear === 'half') return ['HALF-COCK', 'SEAR DROPPING INTO THE HALF-COCK NOTCH', 'live'];
    if (d.sear === 'full') return ['FULL-COCK', 'SEAR ON THE FULL-COCK STEP', 'live'];
    return ['COCKING', 'SEAR RIDING THE TUMBLER', 'live'];
  }
  if (d.sear === 'full') return ['FULL-COCK', 'SEAR ON THE FULL-COCK STEP', 'ok'];
  if (d.sear === 'half') return ['HALF-COCK', 'SEAR IN THE HALF-COCK NOTCH', 'ok'];
  if (d.theta <= THETA_CONTACT + 0.05 && d.phi > -1) return ['REST', 'COCK DOWN ON THE CLOSED FRIZZEN', 'ok'];
  if (d.theta < 0.05) return ['DOWN', 'COCK ON ITS STOP · FRIZZEN OPEN', 'ok'];
  return ['COCK FORWARD', 'SEAR RIDING THE TUMBLER', 'ok'];
}

// events from the motion itself, sampled at 2 ms: notch clicks, stops, the strike, the frizzen's two stops
function detectEvents(segs) {
  const ev = [];
  const DT = 0.002;
  for (const sg of segs) {
    let prev = derive(sg.fn(0));
    let prevC = sg.fn(0);
    const n = Math.max(2, Math.ceil(sg.dur / DT));
    if (sg.phase === 'trigger' || sg.phase === 'blocked') ev.push({t: sg.t0, type: 'trigger'});
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const t = sg.t0 + u * sg.dur;
      const c = sg.fn(u);
      const d = derive(c);
      if (prevC.theta < G.HALF && c.theta >= G.HALF) ev.push({t, type: 'click-half'});
      if (prevC.theta < G.FULL && c.theta >= G.FULL) ev.push({t, type: 'click-full'});
      if (prevC.theta < G.MAX - 0.02 && c.theta >= G.MAX - 0.02) ev.push({t, type: 'stop'});
      if (sg.phase === 'settle' && i === n) ev.push({t, type: 'settle'});
      if (!prev.contact && d.contact && sg.phase === 'release') ev.push({t, type: 'strike'});
      if (!prev.contact && d.contact && sg.phase !== 'release') ev.push({t, type: 'touch'});
      if (prev.phi > G.FRIZ_OPEN + 0.01 && d.phi <= G.FRIZ_OPEN + 0.01) ev.push({t, type: 'frizzen-open'});
      if (prev.phi < -0.01 && d.phi >= -0.01) ev.push({t, type: 'frizzen-close'});
      if (sg.phase === 'release' && prevC.theta > 0.001 && c.theta <= 0.001) ev.push({t, type: 'cock-stop'});
      if (sg.phase === 'release' && i === 1) ev.push({t: sg.t0, type: 'snap'});
      if (sg.phase === 'blocked' && prev.blocked !== d.blocked && d.blocked) ev.push({t, type: 'blocked'});
      prev = d;
      prevC = c;
    }
  }
  return ev.sort((a, b) => a.t - b.t);
}
