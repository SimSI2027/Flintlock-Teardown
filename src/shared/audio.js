// Mechanical sound for the live page: every sound is synthesised once at start (seeded noise, so it is the same each
// load) and played on the lock's own events, the teardown moves and the console's clicks. Nothing is narrated and
// continuous motion stays silent; there is no report, no ignition sound: the lock's sounds stop at the frizzen.
const SR = 44100;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296 - 0.5;
  };
}

// a struck-metal click: a noise burst through a resonator bank plus a short ring
function metal(dur, {f = [3200, 5100, 7400], decay = 0.012, ring = 0.03, noise = 0.6, body = 0, bodyF = 180, seed = 1}) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  const r = rng(seed);
  // two-pole resonators driven by the burst
  const res = f.map((fc) => {
    const w = (2 * Math.PI * fc) / SR;
    const R = Math.exp(-1 / (ring * SR));
    return {a1: 2 * R * Math.cos(w), a2: -R * R, y1: 0, y2: 0};
  });
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const ex = r() * Math.exp(-t / decay);
    let y = ex * noise;
    for (const q of res) {
      const v = ex * 0.08 + q.a1 * q.y1 + q.a2 * q.y2;
      q.y2 = q.y1;
      q.y1 = v;
      y += v;
    }
    if (body) y += body * Math.sin(2 * Math.PI * bodyF * t) * Math.exp(-t / 0.03);
    out[i] = y;
  }
  let m = 0;
  for (const v of out) m = Math.max(m, Math.abs(v));
  for (let i = 0; i < n; i++) out[i] /= m || 1;
  return out;
}
// a dry scrape: band noise sliding down
function scrape(dur, seed) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  const r = rng(seed);
  let lp = 0;
  let hp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const x = r();
    lp += (x - lp) * 0.55;
    hp = lp - hp * 0.2;
    out[i] = hp * Math.sin((Math.PI * t) / dur) * (0.7 + 0.3 * Math.sin(t * 900));
  }
  return out;
}
// moving air for a teardown: soft filtered noise with a swell
function air(dur, seed, bright = 0.08) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  const r = rng(seed);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    lp += (r() - lp) * bright;
    out[i] = lp * 3 * Math.pow(Math.sin((Math.PI * t) / dur), 2);
  }
  return out;
}

export const SOUNDS = {
  'click-half': () => metal(0.12, {f: [2900, 4700, 6900], decay: 0.004, ring: 0.02, noise: 0.5, body: 0.35, bodyF: 420, seed: 3}),
  'click-full': () => metal(0.14, {f: [2500, 4300, 6200], decay: 0.005, ring: 0.025, noise: 0.5, body: 0.45, bodyF: 380, seed: 4}),
  settle: () => metal(0.06, {f: [3600, 5800], decay: 0.002, ring: 0.012, noise: 0.4, seed: 5}),
  stop: () => metal(0.09, {f: [1800, 3100], decay: 0.003, ring: 0.015, noise: 0.3, body: 0.5, bodyF: 240, seed: 6}),
  trigger: () => metal(0.07, {f: [4200, 6600], decay: 0.002, ring: 0.01, noise: 0.5, seed: 7}),
  blocked: () => metal(0.08, {f: [2200, 3800], decay: 0.003, ring: 0.01, noise: 0.35, body: 0.4, bodyF: 300, seed: 8}),
  snap: () => metal(0.06, {f: [5200, 7800], decay: 0.0015, ring: 0.008, noise: 0.6, seed: 9}),
  strike: () => {
    const a = metal(0.3, {f: [3300, 5600, 8200], decay: 0.006, ring: 0.06, noise: 0.5, body: 0.3, bodyF: 520, seed: 10});
    const b = scrape(0.09, 11);
    for (let i = 0; i < b.length; i++) a[i] = a[i] * 0.8 + b[i] * 0.9;
    return a;
  },
  'cock-stop': () => metal(0.16, {f: [1400, 2600, 4100], decay: 0.004, ring: 0.03, noise: 0.35, body: 0.6, bodyF: 170, seed: 12}),
  'frizzen-open': () => metal(0.18, {f: [1900, 3400, 5300], decay: 0.004, ring: 0.035, noise: 0.35, body: 0.4, bodyF: 260, seed: 13}),
  'frizzen-close': () => metal(0.14, {f: [2400, 4100], decay: 0.003, ring: 0.025, noise: 0.4, body: 0.45, bodyF: 300, seed: 14}),
  touch: () => metal(0.05, {f: [3900], decay: 0.002, ring: 0.008, noise: 0.25, seed: 15}),
  apart: () => air(0.9, 16, 0.06),
  together: () => air(0.7, 17, 0.05),
  ui: () => metal(0.035, {f: [2600], decay: 0.0012, ring: 0.004, noise: 0.5, seed: 18}),
};
export const GAIN = {'click-half': 0.55, 'click-full': 0.62, settle: 0.2, stop: 0.32, trigger: 0.3, blocked: 0.4, snap: 0.32, strike: 0.7, 'cock-stop': 0.6, 'frizzen-open': 0.5, 'frizzen-close': 0.5, touch: 0.25, apart: 0.16, together: 0.13, ui: 0.16};

export function createAudio() {
  let ctx = null;
  let master = null;
  const buf = {};
  let on = false;
  const ensure = () => {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC({sampleRate: SR});
    master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    master.connect(comp).connect(ctx.destination);
    for (const k in SOUNDS) {
      const data = SOUNDS[k]();
      const b = ctx.createBuffer(1, data.length, SR);
      b.copyToChannel(data, 0);
      buf[k] = b;
    }
    return true;
  };
  return {
    get on() {
      return on;
    },
    get state() {
      return ctx ? ctx.state : 'none';
    },
    /** call from a user gesture */
    enable(v = true) {
      if (v && !ensure()) return false;
      on = v;
      if (ctx && v && ctx.state !== 'running') ctx.resume();
      return on;
    },
    play(type, {when = 0, gain = 1, pan = 0} = {}) {
      if (!on || !ctx || !buf[type]) return false;
      const s = ctx.createBufferSource();
      s.buffer = buf[type];
      const g = ctx.createGain();
      g.gain.value = (GAIN[type] ?? 0.3) * gain;
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) p.pan.value = pan;
      s.connect(g);
      (p ? g.connect(p) : g).connect(master);
      s.start(ctx.currentTime + Math.max(0, when));
      return true;
    },
  };
}
