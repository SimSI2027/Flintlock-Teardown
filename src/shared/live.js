// The live page. Left alone it plays the tour (the film's script) with the operator's pointer; any click, drag, wheel
// or key hands control to the visitor with the exact state on screen (the visitor's world replays the tour's requests
// up to that moment), and 25 s of quiet walks the pistol back to rest and resumes the tour. Every control is a
// button; the lock, the teardown, the display and the camera all run on the same deterministic channels as the film.
import {createAudio} from './audio.js';
import {createWorld} from './channels.js';
import {createConsole, LOCK_OPS, MODES, VIEWS} from './console.js';
import {makeCursor} from './film.js';
import {EVENT_TEXT, lastEvent, makeFramer} from './frame.js';
import {overlaps, voxelize} from './inspect.js';
import {G} from './lock.js';
import {createStage} from './stage.js';
import {GROUP_ORDER, buildTeardown, evalTeardown, ALL_PARTS} from './teardown.js';
import {DURATION, PRESSES, SCRIPT, tourWorld} from './tour.js';
import {warmComposer, warmUp} from '../kit/warm.js';

const W = 1600;
const H = 900;
const IDLE = 25;
const SPEED = [0.1, 2];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const CSS = `
html,body{background:#ebe6dc;overflow:hidden}
#app{position:absolute!important;inset:auto!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#gl{touch-action:none;cursor:grab}
#gl.drag{cursor:grabbing}
.turn{position:fixed;left:0;right:0;bottom:14px;text-align:center;font:600 12px/1.4 'JetBrains Mono',monospace;letter-spacing:1px;color:#8a8073;text-transform:uppercase;display:none}
@media (orientation:portrait) and (max-width:820px){.turn{display:block}}
#fail{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#ebe6dc;font:500 15px/1.6 Inter,sans-serif;color:#26221d;text-align:center;padding:24px}
`;
// pairs where one part runs through a hole, slot, channel or mortise in the other (not modelled as cavities)
const PASSAGE = new Set(
  [
    ...['cock', 'topjaw', 'jawscrew', 'flint', 'cockscrew', 'frizzen', 'frizscrew', 'frizspring', 'fsscrew', 'tumbler', 'swivel', 'bridle', 'bridlescrew', 'sear', 'searscrew', 'searspring', 'ssscrew', 'mainspring', 'msscrew', 'plate', 'trigger', 'trigpin', 'sidenails', 'tangscrew', 'guardscrews', 'capscrew', 'key', 'ramrod', 'entrypipe'].map((p) => ['stock', p]),
    ['barrel', 'key'], ['sideplate', 'sidenails'], ['breech', 'tangscrew'], ['guard', 'guardscrews'], ['buttcap', 'capscrew'], ['plate', 'sidenails'], ['plate', 'searscrew'], ['plate', 'tumbler'], ['cock', 'tumbler'],
    ['topjaw', 'jawscrew'], ['cock', 'jawscrew'], ['cock', 'cockscrew'], ['tumbler', 'cockscrew'], ['frizzen', 'frizscrew'], ['plate', 'frizscrew'], ['frizspring', 'fsscrew'], ['plate', 'fsscrew'],
    ['bridle', 'bridlescrew'], ['plate', 'bridlescrew'], ['sear', 'searscrew'], ['bridle', 'searscrew'], ['searspring', 'ssscrew'], ['plate', 'ssscrew'], ['mainspring', 'msscrew'], ['plate', 'msscrew'],
    ['ramrod', 'rampipe'], ['ramrod', 'entrypipe'], ['ramrod', 'noseband'], ['trigger', 'trigpin'], ['escutcheons', 'key'],
  ].map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)),
);
// detail: the materials' fine surface work (pores, pitting, scratches, bump); LOW keeps the grain and patina only
const TIERS = [
  {name: 'HIGH', samples: 8, ao: true, shadow: 4096, pr: 2, detail: true},
  {name: 'BALANCED', samples: 4, ao: false, shadow: 2048, pr: 1.5, detail: true},
  {name: 'LOW', samples: 0, ao: false, shadow: 1024, pr: 1, detail: false},
];

export function runLive() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const app = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  canvas.setAttribute('aria-label', 'Interactive 3D model of the Model 1805 pistol: drag to orbit, wheel to zoom');
  app.appendChild(canvas);
  let st;
  try {
    st = createStage({canvas, pr: 1});
  } catch (e) {
    const f = document.createElement('div');
    f.id = 'fail';
    f.style.display = 'flex';
    f.textContent = 'This simulator needs WebGL, which is not available in this browser.';
    document.body.appendChild(f);
    throw e;
  }
  const ui = createConsole(app, {live: true});
  const draw = makeFramer(st, ui);
  const tourCursor = makeCursor(ui, PRESSES);
  const audio = createAudio();
  const q = new URLSearchParams(location.search);
  const note = document.createElement('div');
  note.className = 'turn';
  note.textContent = 'Turn your phone sideways for the full console';
  document.body.appendChild(note);

  // ------------------------------------------------------------ quality: auto tiers, or the visitor's choice
  const light = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  const forced = {high: 0, balanced: 1, low: 2}[q.get('quality')];
  let tier = forced ?? (light ? 2 : 0);
  let qMode = forced !== undefined ? TIERS[forced].name : 'AUTO';
  let scale = 1;
  const fit = () => {
    scale = Math.min(innerWidth / W, innerHeight / H);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${(innerHeight - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.6, TIERS[tier].pr));
  };
  const applyTier = () => {
    const {pr, name, ...rest} = TIERS[tier];
    st.setQuality(rest);
    fit();
  };
  applyTier();
  addEventListener('resize', fit);
  const toStage = (cx, cy) => {
    const r = app.getBoundingClientRect();
    return [(cx - r.left) / scale, (cy - r.top) / scale];
  };

  // ------------------------------------------------------------ the two worlds
  const tour = tourWorld();
  let world = null; // the visitor's, created at takeover
  let T = 0; // real seconds since start
  let wt = 0; // the visitor world's clock (advances with SPEED, stops on pause)
  let speed = 1;
  let paused = false;
  const AP = {on: true, t0: 0, returning: false};
  let lastInput = -99;
  const off = {az: 0, el: 0, k: 1};
  const cam = {};
  let ring = {t: -9, x: 0, y: 0};
  const pulse = (key) => {
    const s = ui.spots[key];
    if (s) ring = {t: T, x: s[0], y: s[1]};
    audio.play('ui');
  };
  const cyc = () => (T - AP.t0) % DURATION;
  const takeOver = () => {
    lastInput = T;
    if (!audioAsked) {
      audioAsked = true;
      if (q.get('sound') !== 'off') audio.enable(true);
    }
    if (!AP.on && !AP.returning) return;
    if (AP.on) {
      // the visitor's world: the tour's requests up to now, at their own times; the clock continues from here
      const c = cyc();
      world = createWorld();
      for (const e of SCRIPT) if (e.t <= c) world.request(e.t, e.ch, e.v);
      wt = c;
      heard = c;
    }
    AP.on = false;
    AP.returning = false;
    paused = false;
    speed = 1;
  };
  let audioAsked = false;
  const startTour = () => {
    AP.on = true;
    AP.returning = false;
    AP.t0 = T;
    paused = false;
    speed = 1;
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  // back to rest, assembled, solid, hero; then the tour starts from its first frame with nothing jumping
  const returnToTour = () => {
    if (!world) return startTour();
    AP.returning = true;
    paused = false;
    speed = 1;
    world.request(wt, 'labels', false);
    world.request(wt, 'orbit', false);
    world.request(wt, 'mode', 'solid');
    world.request(wt, 'focus', 'none');
    world.request(wt, 'lock', 'reset');
    world.request(wt, 'view', 'hero');
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  const req = (ch, v) => {
    takeOver();
    world.request(wt, ch, v);
  };

  // ------------------------------------------------------------ controls
  const on = (key, fn) =>
    ui.btn[key]?.addEventListener('click', (e) => {
      e.stopPropagation();
      takeOver();
      pulse(key);
      fn();
    });
  for (const op of LOCK_OPS) on(op, () => world.request(wt, 'lock', op));
  for (const g of ['none', 'all', ...GROUP_ORDER])
    on(`g:${g}`, () => {
      Object.assign(off, {az: 0, el: 0, k: 1});
      world.request(wt, 'focus', g);
    });
  for (const m of MODES) on(m, () => world.request(wt, 'mode', m));
  on('labels', () => world.request(wt, 'labels'));
  on('orbit', () => world.request(wt, 'orbit'));
  for (const v of VIEWS)
    on(`v:${v}`, () => {
      Object.assign(off, {az: 0, el: 0, k: 1});
      world.request(wt, 'view', v);
    });
  on('play', () => (paused = !paused));
  on('step', () => {
    paused = true;
    wt += 1 / 30;
  });
  on('sound', () => audio.enable(!audio.on));
  on('quality', () => {
    const order = ['AUTO', 'HIGH', 'BALANCED', 'LOW'];
    qMode = order[(order.indexOf(qMode) + 1) % order.length];
    tier = qMode === 'AUTO' ? 0 : order.indexOf(qMode) - 1;
    perf.age = 0;
    perf.slow = 0;
    applyTier();
  });
  ui.btn.tour.addEventListener('click', (e) => {
    e.stopPropagation();
    lastInput = T;
    pulse('tour');
    if (AP.on) takeOver();
    else returnToTour();
  });
  ui.tourChip.addEventListener('click', (e) => {
    e.stopPropagation();
    lastInput = T;
    if (AP.on) takeOver();
    else returnToTour();
  });
  addEventListener(
    'pointerdown',
    (e) => {
      if (e.target.closest?.('[data-key="tourchip"],[data-key="tour"]')) return;
      takeOver();
    },
    {capture: true},
  );
  // sliders: the cock (manual) and the speed
  const slider = (hit, R, apply, end) => {
    hit.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      takeOver();
      hit.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const [x] = toStage(ev.clientX, ev.clientY);
        apply(clamp((x - R.x) / R.w, 0, 1));
        lastInput = T;
      };
      const up = () => {
        hit.removeEventListener('pointermove', move);
        hit.removeEventListener('pointerup', up);
        hit.removeEventListener('pointercancel', up);
        end?.();
      };
      hit.addEventListener('pointermove', move);
      hit.addEventListener('pointerup', up);
      hit.addEventListener('pointercancel', up);
      move(e);
    });
  };
  slider(ui.ckHit, ui.CK, (k) => world.request(wt, 'lock', {op: 'drag', value: k * G.MAX}), () => world.request(wt, 'lock', 'letgo'));
  slider(ui.spHit, ui.SP, (k) => (speed = SPEED[0] + k * (SPEED[1] - SPEED[0])));
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target && e.target.classList?.contains('bt') && (e.key === 'Enter' || e.key === ' ')) return;
    const k = e.key.toLowerCase();
    const map = {r: 'rest', h: 'half', f: 'full', t: 'release', z: 'frizzen', s: 'solid', c: 'cut', x: 'xray', l: 'labels', o: 'orbit', e: 'g:all', a: 'g:none', m: 'sound', ' ': 'play', '.': 'step'};
    const v = {1: 'hero', 2: 'lock', 3: 'close', 4: 'inside', 5: 'top', 6: 'left', 7: 'under', 8: 'muzzle'}[k];
    const key = v ? `v:${v}` : map[k];
    if (!key || !ui.btn[key]) return;
    e.preventDefault();
    ui.btn[key].click();
  });
  // orbit and zoom on the canvas
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = {x: e.clientX, y: e.clientY};
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    off.az -= ((e.clientX - drag.x) / scale) * 0.3;
    off.el = clamp(off.el + ((e.clientY - drag.y) / scale) * 0.2, -40, 60);
    drag = {x: e.clientX, y: e.clientY};
    lastInput = T;
  });
  const endDrag = () => {
    drag = null;
    canvas.classList.remove('drag');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeOver();
      off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.35, 2.6);
    },
    {passive: false},
  );

  // ------------------------------------------------------------ sound from the motion
  const playEvents = (w, a, b) => {
    if (b <= a) return;
    for (const e of w.lock.events()) if (e.t >= a && e.t < b) audio.play(e.type, {pan: 0.15});
    for (const p of w.focus.phases) if (p.t0 >= a && p.t0 < b) audio.play(p.to > p.from ? 'apart' : 'together');
  };

  // ------------------------------------------------------------ the frame
  const perf = {n: 0, sum: 0, slow: 0, age: 0, fps: 60};
  let last = performance.now();
  let prevCyc = 0;
  let heard = 0;
  const frame = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    T += dt;
    // auto quality: step down a tier while frames are slow (no further than LOW)
    perf.age += dt;
    perf.sum += dt;
    perf.n++;
    if (perf.sum >= 0.5) {
      perf.fps = perf.n / perf.sum;
      if (qMode === 'AUTO' && tier < TIERS.length - 1 && perf.age > 1.2) {
        perf.slow = perf.fps < 45 ? perf.slow + 1 : 0;
        if (perf.slow >= 2) {
          tier++;
          applyTier();
          perf.slow = 0;
          perf.age = 0;
        }
      }
      perf.sum = 0;
      perf.n = 0;
    }
    let s;
    let cursor;
    if (AP.on) {
      const c = cyc();
      if (c < prevCyc) prevCyc = 0;
      if (audio.on) playEvents(tour, prevCyc, c);
      prevCyc = c;
      s = tour.at(c);
      cursor = tourCursor(c);
      s.event = lastEvent(tour, c);
    } else {
      if (!paused) wt += dt * speed;
      // everything the lock did since the last frame sounds, also after a step or a jump
      if (heard > wt) heard = wt;
      if (heard < wt - 15) heard = wt - 15;
      if (audio.on) playEvents(world, heard, wt);
      heard = wt;
      if (!AP.returning && T - lastInput > IDLE) returnToTour();
      s = world.at(wt);
      if (AP.returning) {
        const done = !s.d.busy && !s.focus.moving && !s.focus.g && s.mode.cut === 0 && s.mode.xray === 0 && s.view === 'hero' && s.viewSince > 1.6;
        if (done) startTour();
      }
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y};
      s.event = lastEvent(world, wt);
    }
    // the visitor's orbit and zoom on top of the channel's camera, eased
    const tgt = {...s.cam, az: s.cam.az + off.az, el: clamp(s.cam.el + off.el, -60, 85), d: s.cam.d * off.k};
    if (!cam.d) Object.assign(cam, tgt);
    const k = 1 - Math.exp(-dt / 0.09);
    cam.az += wrap(tgt.az - cam.az) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd']) cam[key] += (tgt[key] - cam[key]) * k;
    s.cam = {...cam};
    s.cursor = cursor;
    s.paused = AP.on ? false : paused;
    s.speed = AP.on ? 1 : speed;
    s.speedK = (s.speed - SPEED[0]) / (SPEED[1] - SPEED[0]);
    s.sound = audio.on;
    s.quality = qMode;
    s.tour = AP.on;
    s.perf = `${Math.round(perf.fps)} FPS · ${TIERS[tier].name}${AP.returning ? ' · RETURNING TO TOUR' : ''}`;
    s.foot = `BUILD ${typeof __COMMIT__ !== 'undefined' ? __COMMIT__ : 'dev'}`;
    if (!LIVE.hold) draw(s);
    LIVE.last = s;
    if (!window.SIM_SHOWN) {
      window.SIM_SHOWN = true;
      dispatchEvent(new Event('simframe'));
    }
    requestAnimationFrame(frame);
  };

  // ------------------------------------------------------------ test and inspection hooks
  const TD = buildTeardown(st.pistol);
  const LIVE = {
    st,
    get world() {
      return AP.on ? tour : world;
    },
    get wt() {
      return AP.on ? cyc() : wt;
    },
    get tour() {
      return AP.on;
    },
    get tier() {
      return TIERS[tier].name;
    },
    get T() {
      return T;
    },
    audio,
    /** the state right now, straight from the model (not waiting for the next frame) */
    state() {
      return AP.on ? tour.at(cyc()) : world.at(wt);
    },
    /** pose the model for the current state now, without drawing (tests read matrices from it) */
    poseNow() {
      const s = LIVE.state();
      st.pistol.pose(s.d, evalTeardown(TD, s.focus.g, s.focus.k, s.d.theta).offsets);
      st.pistol.root.updateMatrixWorld(true);
    },
    /** tests: stop drawing while the CPU inspects */
    hold: false,
    takeOver,
    startTour,
    returnToTour,
    /** jump the visitor's clock forward (tests): every channel settles */
    settle(sec = 6) {
      takeOver();
      wt += sec;
    },
    /** surface-voxel collision pairs for a lock state and a teardown pose, without drawing */
    inspect({theta, phi = 0, k = 0, group = null, cell = 0.006} = {}) {
      const d = world ? world.at(wt).d : tour.at(cyc()).d;
      const dd = theta === undefined ? d : {...d, theta, phi};
      const td = evalTeardown(TD, group, k, dd.theta);
      st.pistol.pose(dd, td.offsets);
      const vox = voxelize(st.pistol, cell);
      return overlaps(vox, 2);
    },
    /**
     * Sweep a teardown from assembled to apart: a pair may only touch where it touched when assembled, and once apart
     * never again. Returns {violations: [...], final: pairs still touching at k = 1}.
     */
    sweep(group, {theta = 20.9, steps = 30, cell = 0.006} = {}) {
      const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
      // two parts carried by the same offset cannot meet anew (a touch there is grid quantisation); and parts that
      // pass along a hole, slot, channel or the lock mortise (not modelled as cavities) may cross the host's surface
      const same = (o, a, b) => {
        const x = o[a] || [0, 0, 0];
        const y = o[b] || [0, 0, 0];
        return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) < 1e-9;
      };
      // a pair touching when assembled may not dig in further either: its shared surface may not grow much
      const counts = {};
      const raw = (k) => {
        const pairs = LIVE.inspect({theta, k, group, cell}).filter(([a, b]) => !PASSAGE.has(key(a, b)));
        for (const [a, b, c] of pairs) counts[key(a, b)] = c;
        return new Set(pairs.map(([a, b]) => key(a, b)));
      };
      const base = raw(0);
      const baseCount = {...counts};
      const left = new Set();
      const violations = [];
      let now = base;
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        const o = evalTeardown(TD, group, k, theta).offsets;
        const rigid = (pk) => same(o, ...pk.split('|'));
        now = raw(k);
        for (const pk of base) if (!now.has(pk) && !rigid(pk)) left.add(pk);
        for (const pk of now) if (!rigid(pk) && (!base.has(pk) || left.has(pk) || counts[pk] > baseCount[pk] * 2 + 12)) violations.push({k: +k.toFixed(3), pair: pk, again: base.has(pk), cells: counts[pk], base: baseCount[pk] || 0});
      }
      return {violations, final: [...now].filter((pk) => !base.has(pk) || true)};
    },
    /** the lock through the tour's lock motion, assembled: contacts other than the assembled ones are collisions */
    mechSweep({from = 0, to = 20, step = 0.05, cell = 0.006} = {}) {
      const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
      const lockAt = (t) => tour.lock.stateAt(t);
      const pose = (d) => {
        st.pistol.pose(d, {});
        return new Set(overlaps(voxelize(st.pistol, cell), 2).map(([a, b]) => key(a, b)));
      };
      const base = pose(lockAt(0));
      const found = {};
      for (let t = from; t <= to; t += step) for (const pk of pose(lockAt(t))) if (!base.has(pk)) (found[pk] ||= []).push(+t.toFixed(2));
      return {base: [...base], extra: found};
    },
    teardownPose(group, k, theta = 20) {
      return evalTeardown(TD, group, k, theta);
    },
    parts: ALL_PARTS,
    groups: TD,
    EVENT_TEXT,
  };
  window.LIVE = LIVE;
  // every shader compiles at once before the first frame (kit/warm.js), then the loop starts
  Promise.all([warmComposer(st.renderer, st.composer, st.scene, st.camera), warmUp(st.renderer, st.camera, [{scene: st.warmScene(), target: st.composer.renderTarget1}])])
    .catch(() => {})
    .then(() => requestAnimationFrame(frame));
}
