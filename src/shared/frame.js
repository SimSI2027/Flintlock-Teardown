// One frame from one world state: the teardown offsets, the display look, the working part's accent, the callouts
// and the console. The film and the live page both draw through here, so they cannot disagree.
import * as THREE from 'three';
import {GROUP_LABEL, VIEW_LABEL} from './console.js';
import {LABEL} from './notes.js';
import {buildTeardown, evalTeardown} from './teardown.js';

export const EVENT_TEXT = {
  'click-half': 'CLICK · SEAR INTO THE HALF-COCK NOTCH',
  'click-full': 'CLICK · SEAR ON THE FULL-COCK STEP',
  stop: 'COCK AT ITS REAR STOP',
  settle: 'SEAR SETTLES IN ITS NOTCH',
  trigger: 'TRIGGER BAR LIFTS THE SEAR ARM',
  blocked: 'TRIGGER BLOCKED AT HALF-COCK',
  snap: 'SEAR CLEARS · COCK RELEASED',
  strike: 'FLINT MEETS THE FRIZZEN FACE',
  'cock-stop': 'COCK ON ITS FORWARD STOP',
  'frizzen-open': 'FRIZZEN OPEN · PAN UNCOVERED',
  'frizzen-close': 'FRIZZEN CLOSED OVER THE PAN',
  touch: 'FLINT RESTS ON THE FRIZZEN',
};

const GROUP_LABELS = {
  lock: ['plate', 'cock', 'frizzen', 'frizspring', 'tumbler', 'sear', 'mainspring', 'sidenails'],
  internals: ['tumbler', 'sear', 'searspring', 'mainspring', 'bridle', 'swivel', 'bridlescrew', 'plate'],
  screws: ['sidenails', 'tangscrew', 'capscrew', 'guardscrews', 'trigpin', 'cockscrew', 'jawscrew', 'frizscrew', 'searscrew', 'bridlescrew'],
};
const SOLID_LABELS = ['cock', 'flint', 'frizzen', 'plate', 'frizspring', 'trigger', 'guard', 'barrel', 'ramrod', 'buttcap', 'noseband', 'key'];
const INNER_LABELS = ['cock', 'frizzen', 'tumbler', 'sear', 'mainspring', 'searspring', 'bridle', 'trigger', 'frizspring', 'plate'];

export function makeFramer(st, ui) {
  const T = buildTeardown(st.pistol);
  const P = st.pistol.parts;
  // a label anchor for every part: the centre of its geometry in its own node
  const anchor = {};
  const box = new THREE.Box3();
  for (const id in P) {
    box.makeEmpty();
    for (const m of P[id].meshes) {
      if (m.userData.cat === 'marks' || m.userData.cat === 'hole') continue;
      m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox.clone();
      // the mesh's own placement (shared screw geometry is placed by a transform)
      m.updateMatrix();
      b.applyMatrix4(m.matrix);
      box.union(b);
    }
    anchor[id] = box.getCenter(new THREE.Vector3());
  }
  // hand-placed anchors where the box centre misses the part
  anchor.plate.set(-0.55, -0.1, 0.132);
  anchor.stock.set(-1.2, -0.3, 0.1);
  anchor.barrel.set(1.6, 0.09, 0.03);
  anchor.ramrod.set(1.7, -0.155, 0.02);
  anchor.guard.set(-0.55, -0.53, 0.0);
  anchor.cock.set(-0.27, 0.07, 0.15);
  anchor.trigger.set(-0.48, -0.36, 0.01);
  const wp = new THREE.Vector3();
  const callouts = (ids, o) => {
    if (o < 0.02) return [];
    const pts = [];
    for (const id of ids) {
      const p = P[id];
      if (!p || !LABEL[id]) continue;
      p.node.updateMatrixWorld();
      wp.copy(anchor[id]).applyMatrix4(p.node.matrixWorld);
      const at = st.project(wp.x, wp.y, wp.z);
      if (!at || at[0] < 345 || at[0] > 1255 || at[1] < 150 || at[1] > 770) continue;
      pts.push({id, at});
    }
    const L = pts.filter((x) => x.at[0] < 800).sort((a, b) => a.at[1] - b.at[1]);
    const R = pts.filter((x) => x.at[0] >= 800).sort((a, b) => a.at[1] - b.at[1]);
    const out = [];
    const stack = (col, side) => {
      let y = 158;
      for (const c of col) {
        y = Math.max(y, Math.min(752, c.at[1] - 8));
        const [name, tag] = LABEL[c.id];
        const w = name.length * 6.4 + 34;
        out.push({name, tag, at: c.at, label: [side < 0 ? 344 : 1258 - w, y], w, o});
        y += 22;
      }
    };
    stack(L, -1);
    stack(R, 1);
    return out;
  };

  /**
   * s: world.at(t) plus {cam (final), cursor, paused, speed, speedK, sound, quality, tour, event, perf, foot}
   */
  return (s) => {
    const d = s.d;
    const f = s.focus;
    const td = evalTeardown(T, f.g, f.k, d.theta);
    const solid = s.mode.xray < 0.5 && s.mode.cut < 0.5;
    const hot = new Set();
    const ph = d.phase;
    if (ph === 'release') ['cock', 'flint', 'frizzen'].forEach((x) => hot.add(x));
    else if (ph === 'cocking' || ph === 'settle' || ph === 'manual') (solid && !f.g ? ['cock'] : ['tumbler', 'sear']).forEach((x) => hot.add(x));
    else if (ph === 'trigger' || ph === 'blocked') ['trigger', 'sear'].forEach((x) => hot.add(x));
    else if (ph === 'lowering') ['cock', 'trigger'].forEach((x) => hot.add(x));
    else if (ph.startsWith('frizzen')) hot.add('frizzen');
    st.frame({d, offsets: td.offsets, alpha: td.alpha, xray: s.mode.xray, cut: s.mode.cut, hot, cam: {...s.cam, az: (s.cam.az * Math.PI) / 180, el: (s.cam.el * Math.PI) / 180}});
    // labels: on with LABELS, and always for a subsystem that is apart
    let ids = solid ? SOLID_LABELS : INNER_LABELS;
    let o = s.labels.k;
    if (f.g && f.g !== 'all') {
      ids = GROUP_LABELS[f.g] || T[f.g].members;
      o = Math.max(o, Math.max(0, (f.k - 0.75) / 0.25));
    }
    if (f.g === 'all') o = 0;
    const g = f.target || f.g;
    let viewTag = `VIEW · ${VIEW_LABEL[s.view] || (s.view.startsWith('g:') ? 'SUBSYSTEM' : s.view)}`;
    if (f.g) viewTag = `${f.g === 'all' ? 'EXPLODED VIEW' : `SUBSYSTEM · ${GROUP_LABEL[f.g]}`} · ${f.moving ? (f.dir > 0 ? 'COMING APART' : 'REASSEMBLING') : 'APART'}`;
    else if (f.moving === false && s.mode.mode !== 'solid') viewTag += ` · ${s.mode.mode === 'cut' ? 'CUTAWAY' : 'X-RAY'}`;
    ui.update({
      d,
      focus: g,
      mode: s.mode.mode,
      labelsOn: s.labels.on,
      orbit: s.orbit.on,
      view: s.view,
      viewTag,
      callouts: callouts(ids, o),
      cursor: s.cursor,
      paused: s.paused,
      speed: s.speed,
      speedK: s.speedK,
      sound: s.sound,
      quality: s.quality,
      tour: s.tour,
      blink: s.blink,
      event: s.event,
      perf: s.perf,
      foot: s.foot,
    });
    return {td};
  };
}

/** the last thing that happened by time t, as console text */
export function lastEvent(world, t) {
  let best = null;
  for (const e of world.lock.events()) if (e.t <= t && (!best || e.t >= best.t)) best = {t: e.t, text: EVENT_TEXT[e.type]};
  for (const p of world.focus.phases)
    if (p.t0 <= t && (!best || p.t0 >= best.t)) best = {t: p.t0, text: p.to > p.from ? `TEARDOWN · ${(GROUP_LABEL[p.g] || 'EXPLODED').toUpperCase()}` : `REASSEMBLING · ${(GROUP_LABEL[p.g] || 'ALL PARTS').toUpperCase()}`};
  return best && t - best.t < 8 ? best.text : '';
}
