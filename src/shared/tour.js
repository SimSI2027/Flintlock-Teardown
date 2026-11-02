// The cinematic tour: the operator's requests in seconds. The film renders it frame by frame, the live page plays it
// as the auto tour (with a cursor pressing the same buttons) and scripts/timeline.mjs turns the resulting motion into
// the sound timeline. No three.js here, so Node can run it.
import {createWorld} from './channels.js';

// each entry presses one control; `at` is where the tour's pointer goes (a console button key)
export const SCRIPT = [
  {t: 1.0, ch: 'lock', v: 'half', at: 'half'},
  {t: 1.3, ch: 'view', v: 'close', at: 'v:close'},
  {t: 3.4, ch: 'lock', v: 'full', at: 'full'},
  {t: 4.6, ch: 'labels', v: true, at: 'labels'},
  {t: 5.4, ch: 'lock', v: 'release', at: 'release'},
  {t: 7.8, ch: 'labels', v: false, at: 'labels'},
  {t: 8.2, ch: 'mode', v: 'xray', at: 'xray'},
  {t: 8.5, ch: 'view', v: 'lock', at: 'v:lock'},
  {t: 9.6, ch: 'lock', v: 'half', at: 'half'},
  {t: 11.6, ch: 'lock', v: 'release', at: 'release'},
  {t: 13.2, ch: 'lock', v: 'full', at: 'full'},
  {t: 14.6, ch: 'lock', v: 'release', at: 'release'},
  {t: 16.4, ch: 'mode', v: 'cut', at: 'cut'},
  {t: 17.0, ch: 'lock', v: 'frizzen', at: 'frizzen'},
  {t: 19.8, ch: 'mode', v: 'solid', at: 'solid'},
  {t: 20.2, ch: 'focus', v: 'lock', at: 'g:lock'},
  {t: 24.4, ch: 'focus', v: 'cock', at: 'g:cock'},
  {t: 29.4, ch: 'focus', v: 'frizzen', at: 'g:frizzen'},
  {t: 34.4, ch: 'focus', v: 'internals', at: 'g:internals'},
  {t: 38.6, ch: 'lock', v: 'full', at: 'full'},
  {t: 40.4, ch: 'lock', v: 'release', at: 'release'},
  {t: 42.0, ch: 'focus', v: 'springs', at: 'g:springs'},
  {t: 46.6, ch: 'focus', v: 'trigger', at: 'g:trigger'},
  {t: 51.2, ch: 'focus', v: 'barrel', at: 'g:barrel'},
  {t: 55.8, ch: 'focus', v: 'furniture', at: 'g:furniture'},
  {t: 60.4, ch: 'focus', v: 'ramrod', at: 'g:ramrod'},
  {t: 64.6, ch: 'focus', v: 'screws', at: 'g:screws'},
  {t: 69.0, ch: 'focus', v: 'stock', at: 'g:stock'},
  {t: 73.6, ch: 'focus', v: 'all', at: 'g:all'},
  {t: 75.0, ch: 'orbit', v: true, at: 'orbit'},
  {t: 80.4, ch: 'orbit', v: false, at: 'orbit'},
  {t: 80.8, ch: 'focus', v: 'none', at: 'g:none'},
  {t: 83.0, ch: 'lock', v: 'reset', at: 'rest'},
];
export const DURATION = 89;

/** the tour's world: every channel with the script's requests applied */
export function tourWorld() {
  const w = createWorld();
  for (const e of SCRIPT) w.request(e.t, e.ch, e.v);
  return w;
}

// the operator's button presses (key, time) for the pointer and the UI clicks in the score
export const PRESSES = SCRIPT.map((e) => ({t: e.t, key: e.at}));

/** the sound timeline: every mechanical event, every teardown move, every press, in seconds */
export function timeline() {
  const w = tourWorld();
  const lock = w.lock.events().filter((e) => e.t < DURATION).map((e) => ({t: +e.t.toFixed(4), type: e.type}));
  const focus = w.focus.phases.filter((p) => p.t0 < DURATION).map((p) => ({t: +p.t0.toFixed(4), end: +p.t1.toFixed(4), group: p.g, dir: p.to > p.from ? 'apart' : 'together'}));
  const modes = w.mode.events.filter((e) => e.t > 0).map((e) => ({t: e.t, mode: e.m}));
  return {duration: DURATION, fps: 60, presses: PRESSES.map((p) => p.t), lock, focus, modes};
}
