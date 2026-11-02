// Deterministic channels beside the lock: the subsystem teardown (focus), the display mode, the camera view and two
// toggles. Each takes timed requests and answers "what is it at time t" as a pure function of the request list, so
// the film, the live page and the sound timeline agree, and the live page can take over mid-tour by replaying the
// tour's requests.
import {createLock} from './lock.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoother = (x) => {
  const u = clamp01(x);
  return u * u * u * (u * (u * 6 - 15) + 10);
};

export const FOCUS_IN = 2.1; // seconds to take a subsystem apart
export const FOCUS_OUT = 1.6; // seconds to put it back

/** subsystem teardown: one group apart at a time; switching puts the old one back first, then takes the new one out */
export function createFocus() {
  const ph = [];
  let tail = {t: 0, g: null};
  return {
    request(t, g) {
      g = g === 'none' ? null : g;
      if (g === tail.g) return 0;
      let t0 = Math.max(t, tail.t);
      if (tail.g) {
        ph.push({g: tail.g, t0, t1: t0 + FOCUS_OUT, from: 1, to: 0});
        t0 += FOCUS_OUT;
      }
      if (g) {
        ph.push({g, t0, t1: t0 + FOCUS_IN, from: 0, to: 1});
        t0 += FOCUS_IN;
      }
      tail = {t: t0, g};
      return 1;
    },
    at(t) {
      let cur = null;
      for (const p of ph) if (p.t0 <= t) cur = p;
      if (!cur) return {g: null, k: 0, moving: false, target: tail.g};
      const u = clamp01((t - cur.t0) / (cur.t1 - cur.t0));
      const k = cur.from + (cur.to - cur.from) * u;
      return {g: k > 0 ? cur.g : null, k, moving: u < 1, dir: cur.to > cur.from ? 1 : -1, t0: cur.t0, t1: cur.t1, target: tail.g, group: cur.g};
    },
    phases: ph,
    get target() {
      return tail.g;
    },
    endAt: () => tail.t,
  };
}

/** display mode: solid, cutaway or x-ray, eased */
export function createMode(dur = 0.7) {
  const ev = [{t: -99, m: 'solid'}];
  return {
    request(t, m) {
      if (ev[ev.length - 1].m === m) return 0;
      ev.push({t: Math.max(t, ev[ev.length - 1].t), m});
      return 1;
    },
    at(t) {
      let i = 0;
      while (i < ev.length - 1 && ev[i + 1].t <= t) i++;
      const cur = ev[i];
      const prev = ev[i - 1];
      const k = smoother((t - cur.t) / dur);
      const lvl = (m, e) => (e && e.m === m ? 1 : 0);
      const v = (m) => lvl(m, prev) * (1 - k) + lvl(m, cur) * k;
      return {mode: cur.m, xray: v('xray'), cut: v('cut'), since: t - cur.t};
    },
    events: ev,
  };
}

/** a toggle with an eased 0..1 */
export function createToggle(dur = 0.5, on0 = false) {
  const ev = [{t: -99, on: on0}];
  return {
    request(t, on) {
      const last = ev[ev.length - 1];
      if (on === undefined) on = !last.on;
      if (last.on === on) return 0;
      ev.push({t: Math.max(t, last.t), on});
      return 1;
    },
    at(t) {
      let i = 0;
      while (i < ev.length - 1 && ev[i + 1].t <= t) i++;
      const k = smoother((t - ev[i].t) / dur);
      return {on: ev[i].on, k: ev[i].on ? (i ? k : 1) : 1 - (i ? k : 1), since: t - ev[i].t};
    },
    events: ev,
  };
}

// ------------------------------------------------------------ camera views (degrees, model units); u = seconds on
export const VIEW_FN = {
  hero: (u) => ({tx: 0.52, ty: -0.2, tz: 0, az: 22 + 0.9 * u, el: 11, d: 9.9}),
  lock: (u) => ({tx: -0.24, ty: -0.03, tz: 0.12, az: 4 + 0.5 * u, el: 7, d: 4.3}),
  close: (u) => ({tx: -0.08, ty: 0.05, tz: 0.14, az: 22 + 0.8 * u, el: 11, d: 3.05}),
  inside: (u) => ({tx: -0.26, ty: -0.06, tz: 0, az: 196 + 0.5 * u, el: 10, d: 4.3}),
  top: (u) => ({tx: 0.38, ty: -0.1, tz: 0, az: 12 + 0.6 * u, el: 68, d: 10.6}),
  left: (u) => ({tx: 0.38, ty: -0.18, tz: 0, az: 206 + 0.8 * u, el: 12, d: 10.4}),
  under: (u) => ({tx: -0.42, ty: -0.32, tz: 0, az: 28 + 0.6 * u, el: -30, d: 5.6}),
  muzzle: (u) => ({tx: 0.7, ty: -0.1, tz: 0, az: 64 + 0.6 * u, el: 12, d: 8.2}),
  // exterior close-ups: the pan and frizzen, trigger and guard, butt cap and grip, breech and tang, rammer hardware
  pan: (u) => ({tx: 0.1, ty: 0.03, tz: 0.13, az: 32 + 0.5 * u, el: 27, d: 2.0}),
  trigger: (u) => ({tx: -0.6, ty: -0.38, tz: 0.02, az: 16 + 0.5 * u, el: -8, d: 3.3}),
  butt: (u) => ({tx: -1.12, ty: -0.5, tz: 0, az: 30 + 0.5 * u, el: 6, d: 3.7}),
  breech: (u) => ({tx: 0.02, ty: 0.05, tz: 0, az: -128 + 0.5 * u, el: 30, d: 2.2}),
  ramrod: (u) => ({tx: 1.75, ty: -0.12, tz: 0.02, az: 16 + 0.5 * u, el: -10, d: 4.4}),
  // the camera each subsystem teardown asks for
  'g:lock': (u) => ({tx: -0.28, ty: -0.08, tz: 0.3, az: 36 + 0.8 * u, el: 18, d: 6.4}),
  'g:cock': (u) => ({tx: -0.18, ty: 0.1, tz: 0.62, az: 28 + 0.8 * u, el: 14, d: 3.3}),
  'g:frizzen': (u) => ({tx: 0.14, ty: 0.02, tz: 0.6, az: 34 + 0.8 * u, el: 15, d: 3.0}),
  'g:internals': (u) => ({tx: -0.3, ty: -0.07, tz: 0.22, az: 188 + 0.5 * u, el: 14, d: 2.75}),
  'g:springs': (u) => ({tx: -0.2, ty: 0.4, tz: 0.66, az: 16 + 0.6 * u, el: 12, d: 2.75}),
  'g:trigger': (u) => ({tx: -0.46, ty: -0.5, tz: 0.05, az: 30 + 0.8 * u, el: 8, d: 4.6}),
  'g:barrel': (u) => ({tx: 0.75, ty: 0.25, tz: 0.15, az: 30 + 0.6 * u, el: 18, d: 9.4}),
  'g:stock': (u) => ({tx: 0.3, ty: -0.12, tz: 0.2, az: 33 + 0.6 * u, el: 18, d: 12.4}),
  'g:furniture': (u) => ({tx: -0.1, ty: -0.28, tz: 0, az: 30 + 0.6 * u, el: 12, d: 9.6}),
  'g:ramrod': (u) => ({tx: 1.15, ty: -0.25, tz: 0, az: 26 + 0.6 * u, el: 12, d: 10}),
  'g:screws': (u) => ({tx: -0.36, ty: -0.08, tz: 0.18, az: 32 + 0.6 * u, el: 16, d: 5.2}),
  'g:all': (u) => ({tx: 0.3, ty: -0.12, tz: 0.2, az: 32 + 0.6 * u, el: 20, d: 11.2}),
};
const blend = (a, b, k) => {
  const o = {};
  for (const key in b) o[key] = key === 'az' ? a.az + (((((b.az - a.az) % 360) + 540) % 360) - 180) * k : a[key] + (b[key] - a[key]) * k;
  // pull back a little through a big swing so the camera never cuts through the model
  const swing = Math.min(1, Math.abs(((((b.az - a.az) % 360) + 540) % 360) - 180) / 120);
  o.d += Math.max(0, Math.max(a.d, b.d) * (0.15 + 0.25 * swing)) * Math.sin(Math.PI * k);
  return o;
};
export const VIEW_BLEND = 1.5;
export function createViews(v0 = 'hero') {
  const ev = [{t: 0, v: v0}];
  return {
    request(t, v) {
      if (!VIEW_FN[v]) throw new Error(`unknown view ${v}`);
      if (ev[ev.length - 1].v === v) return 0;
      ev.push({t, v});
      return 1;
    },
    // spin(a, b): degrees of orbit turned between a and b; each view carries the orbit turned since it began, so
    // switching views or stopping the orbit never jumps
    at(t, spin = () => 0) {
      let i = 0;
      while (i < ev.length - 1 && ev[i + 1].t <= t) i++;
      const camOf = (j) => {
        const c = VIEW_FN[ev[j].v](t - ev[j].t);
        c.az += spin(ev[j].t, t);
        return c;
      };
      const cur = camOf(i);
      let o = cur;
      if (i > 0) {
        const k = smoother((t - ev[i].t) / VIEW_BLEND);
        if (k < 1) o = blend(camOf(i - 1), cur, k);
      }
      return {cam: o, view: ev[i].v, since: t - ev[i].t};
    },
    events: ev,
  };
}

/** every channel together; request(t, channel, value) routes, at(t) answers for all of them */
export function createWorld() {
  const w = {
    lock: createLock(),
    focus: createFocus(),
    mode: createMode(),
    views: createViews(),
    labels: createToggle(0.5),
    orbit: createToggle(0.8),
    log: [],
  };
  w.request = (t, ch, v) => {
    w.log.push({t, ch, v});
    if (ch === 'lock') return w.lock.request(t, v.op || v, v.value);
    if (ch === 'focus') {
      const n = w.focus.request(t, v);
      // the subsystem's own camera, from when its teardown starts
      if (n) {
        const p = w.focus.phases[w.focus.phases.length - 1];
        w.views.request(v === 'none' || !v ? p.t0 : Math.max(t, p.t0 - 0.2), v === 'none' || !v ? 'hero' : `g:${v}`);
      }
      return n;
    }
    if (ch === 'mode') return w.mode.request(t, v);
    if (ch === 'view') return w.views.request(t, v);
    if (ch === 'labels') return w.labels.request(t, v);
    if (ch === 'orbit') return w.orbit.request(t, v);
    throw new Error(`unknown channel ${ch}`);
  };
  // orbit: 10 degrees a second while on, eased in and out over 0.8 s (closed form, so any t is exact)
  const RATE = 10;
  const ramp = 0.8;
  const onInt = (t0, t) => {
    // integral of the eased rate over [t0, t] for a switch-on at t0: ease over the first `ramp` seconds
    const x = Math.max(0, t - t0);
    if (x >= ramp) return RATE * (x - ramp / 2);
    return (RATE * x * x) / (2 * ramp);
  };
  w.spin = (a, b) => {
    const ev = w.orbit.events;
    let s = 0;
    for (let i = 0; i < ev.length; i++) {
      if (!ev[i].on) continue;
      const on = ev[i].t;
      const off = i + 1 < ev.length ? ev[i + 1].t : Infinity;
      // turned within [a, b] = F(min(b,off)) - F(max(a,on)) with F the integral from `on` (off: coast down)
      const F = (x) => (x <= off ? onInt(on, x) : onInt(on, off) + RATE * Math.min(ramp, x - off) - (RATE * Math.min(ramp, x - off) ** 2) / (2 * ramp));
      const lo = Math.max(a, on);
      if (b > lo) s += F(b) - F(lo);
    }
    return s;
  };
  w.at = (t) => {
    const d = w.lock.stateAt(t);
    const f = w.focus.at(t);
    const m = w.mode.at(t);
    const v = w.views.at(t, w.spin);
    const lb = w.labels.at(t);
    const ob = w.orbit.at(t);
    const cam = {...v.cam};
    return {t, d, focus: f, mode: m, view: v.view, viewSince: v.since, cam, labels: lb, orbit: ob};
  };
  return w;
}
