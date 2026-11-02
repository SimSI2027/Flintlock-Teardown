// Unit tests for the deterministic core: the lock's state model, the channels, the teardown choreography and the tour.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFocus, createWorld, FOCUS_IN, FOCUS_OUT} from '../../src/shared/channels.js';
import {createLock, derive, faceSide, flintAt, G, phiContact, REST0, THETA_CONTACT} from '../../src/shared/lock.js';
import {ALL_PARTS, buildTeardown, evalTeardown, GROUP_ORDER} from '../../src/shared/teardown.js';
import {DURATION, SCRIPT, timeline, tourWorld} from '../../src/shared/tour.js';

const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

test('rest: the cock lies on the closed frizzen, below half-cock', () => {
  assert.ok(THETA_CONTACT > 5 && THETA_CONTACT < G.HALF - 4, `contact at ${THETA_CONTACT}`);
  const d = derive(REST0);
  assert.ok(near(d.phi, 0, 1e-4));
  assert.equal(d.sear, 'riding');
  const lock = createLock();
  assert.equal(lock.stateAt(0).label[0], 'REST');
});

test('half-cock: the sear drops into the half-cock notch with a click', () => {
  const lock = createLock();
  lock.request(0, 'half');
  const end = lock.endAt();
  const d = lock.stateAt(end + 0.1);
  assert.ok(near(d.theta, G.HALF));
  assert.equal(d.sear, 'half');
  assert.equal(d.label[0], 'HALF-COCK');
  assert.ok(lock.events().some((e) => e.type === 'click-half'));
});

test('half-cock holds: the trigger is blocked and the cock does not move', () => {
  const lock = createLock();
  lock.request(0, 'half');
  const t0 = lock.endAt();
  lock.request(t0, 'release');
  for (let t = t0; t < lock.endAt(); t += 0.01) {
    const d = lock.stateAt(t);
    assert.ok(near(d.theta, G.HALF), `theta ${d.theta} at ${t}`);
    assert.ok(d.psi < G.RIDE, 'sear stays in the notch');
  }
  assert.ok(lock.events().some((e) => e.type === 'blocked'));
});

test('release from full cock: sear clears, flint meets the face, frizzen opens, cock stops; in that order', () => {
  const lock = createLock();
  lock.request(0, 'full');
  lock.request(0, 'release');
  const ev = lock.events();
  const at = (type) => ev.find((e) => e.type === type)?.t;
  for (const type of ['click-half', 'click-full', 'snap', 'strike', 'cock-stop', 'frizzen-open']) assert.ok(at(type) !== undefined, `missing ${type}`);
  assert.ok(at('click-half') < at('click-full'));
  assert.ok(at('snap') < at('strike'));
  assert.ok(at('strike') < at('cock-stop'));
  const d = lock.stateAt(lock.endAt() + 0.1);
  assert.ok(near(d.theta, 0, 1e-3));
  assert.ok(near(d.phi, G.FRIZ_OPEN, 1e-3));
  assert.equal(d.panOpen, true);
  assert.equal(d.k, 0);
});

test('the flint never passes through the frizzen face', () => {
  const lock = createLock();
  lock.request(0, 'full');
  lock.request(0, 'release');
  lock.request(0, 'frizzen');
  lock.request(0, 'rest');
  for (let t = 0; t < lock.endAt(); t += 0.002) {
    const d = lock.stateAt(t);
    const f = faceSide(flintAt(d.theta), d.phi);
    if (f.t >= 0 && f.t <= 1) assert.ok(f.s >= -1e-4, `flint ${f.s.toFixed(5)} inside the face at t=${t.toFixed(3)}`);
  }
});

test('phiContact is monotonic: a lower cock never lets the frizzen close further', () => {
  let prev = 0;
  for (let th = G.MAX; th >= 0; th -= 0.25) {
    const p = phiContact(th);
    assert.ok(p <= prev + 1e-6);
    prev = p;
  }
});

test('lowering to rest holds the trigger so the sear clears both notches', () => {
  const lock = createLock();
  lock.request(0, 'full');
  const t0 = lock.endAt();
  lock.request(t0, 'rest');
  let saw = false;
  for (let t = t0; t < lock.endAt(); t += 0.01) {
    const d = lock.stateAt(t);
    if (d.phase === 'lowering') {
      saw = true;
      assert.ok(d.psi >= G.RIDE, 'sear held clear while lowering');
    }
  }
  assert.ok(saw);
  assert.equal(lock.stateAt(lock.endAt() + 0.1).label[0], 'REST');
});

test('manual drag and let go settles in the notch below', () => {
  for (const [v, want] of [[G.FULL + 2, G.FULL], [(G.HALF + G.FULL) / 2, G.HALF], [G.HALF - 3, THETA_CONTACT]]) {
    const lock = createLock();
    lock.request(0, 'drag', v);
    lock.request(0.2, 'letgo');
    assert.ok(near(lock.stateAt(lock.endAt() + 0.1).theta, want, 1e-6), `drag ${v} -> ${lock.stateAt(lock.endAt() + 0.1).theta}`);
  }
});

test('determinism: the same requests give the same state at every time', () => {
  const a = tourWorld();
  const b = tourWorld();
  for (let t = 0; t < DURATION; t += 0.37) {
    const x = a.at(t);
    const y = b.at(t);
    assert.deepEqual(x.d, y.d);
    assert.deepEqual(x.focus, y.focus);
    assert.deepEqual(x.cam, y.cam);
  }
});

test('the tour loops: it ends exactly where it starts', () => {
  const w = tourWorld();
  const s0 = w.at(0);
  const s1 = w.at(DURATION - 0.01);
  for (const k of ['theta', 'phi', 'psi', 'k']) assert.ok(near(s0.d[k], s1.d[k], 1e-6), k);
  assert.equal(s1.focus.g, null);
  assert.equal(s1.mode.mode, 'solid');
  assert.equal(s1.view, 'hero');
  assert.equal(s1.d.busy, false);
  assert.ok(SCRIPT.every((e) => e.t < DURATION));
});

test('focus channel: a group comes apart, then goes back to exactly k = 0', () => {
  const f = createFocus();
  f.request(0, 'cock');
  f.request(1, 'frizzen');
  assert.ok(near(f.at(FOCUS_IN).k, 1));
  assert.equal(f.at(FOCUS_IN + FOCUS_OUT).k, 0);
  assert.equal(f.at(FOCUS_IN + FOCUS_OUT + FOCUS_IN + 0.01).g, 'frizzen');
  f.request(9, 'none');
  assert.equal(f.at(30).k, 0);
  assert.equal(f.at(30).g, null);
});

test('every subsystem button takes its parts apart, and k = 0 is the assembled pistol', () => {
  const T = buildTeardown(null);
  for (const g of [...GROUP_ORDER, 'all']) {
    const z = evalTeardown(T, g, 0, 20);
    assert.deepEqual(z.offsets, {}, `${g} at k=0`);
    const one = evalTeardown(T, g, 1, 20);
    const moved = T[g].members.filter((id) => one.offsets[id] && Math.hypot(...one.offsets[id]) > 0.05);
    if (g === 'stock') {
      // the stock is the base: everything else comes off it
      assert.ok(ALL_PARTS.filter((id) => id !== 'stock').every((id) => one.offsets[id]), 'stock: something stayed on it');
      continue;
    }
    assert.ok(moved.length >= 1, `${g}: no member moved`);
    const separated = new Set(moved.map((id) => one.offsets[id].map((v) => v.toFixed(3)).join(',')));
    // a teardown, not just a lift: at least two distinct motions unless the group is a single part
    if (T[g].members.length > 1) assert.ok(separated.size >= 2 || g === 'lock', `${g}: members did not come apart`);
    // the rest steps aside or ghosts
    if (T[g].ghost) assert.ok(Object.keys(one.alpha).length > 0, `${g}: nothing ghosted`);
    for (const id of Object.keys(one.offsets)) assert.ok(ALL_PARTS.includes(id), `${g}: unknown part ${id}`);
  }
});

test('the sound timeline is derived from the same motion', () => {
  const tl = timeline();
  const w = tourWorld();
  assert.equal(tl.lock.length, w.lock.events().filter((e) => e.t < DURATION).length);
  assert.ok(tl.lock.some((e) => e.type === 'strike'));
  assert.ok(tl.focus.length >= 20);
  assert.equal(tl.presses.length, SCRIPT.length);
});

test('a visitor taking over mid-tour reproduces the tour state exactly', () => {
  const tour = tourWorld();
  for (const c of [3.3, 15.2, 36.9, 58.4]) {
    const w = createWorld();
    for (const e of SCRIPT) if (e.t <= c) w.request(e.t, e.ch, e.v);
    const strip = (o, ...keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
    assert.deepEqual(strip(w.at(c).d, 'busy'), strip(tour.at(c).d, 'busy'));
    assert.deepEqual(strip(w.at(c).focus, 'target'), strip(tour.at(c).focus, 'target'));
    assert.deepEqual(w.at(c).cam, tour.at(c).cam);
  }
});
