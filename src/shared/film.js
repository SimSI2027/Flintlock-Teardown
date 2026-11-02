// The film: the tour rendered as a pure function of time for frame-by-frame capture (scripts/capture.mjs).
import {runSim} from '../kit/runtime.js';
import {createConsole} from './console.js';
import {lastEvent, makeFramer} from './frame.js';
import {createStage} from './stage.js';
import {DURATION, PRESSES, tourWorld} from './tour.js';

export const DEFAULTS = {duration: DURATION, fps: 60, theme: 'light', hud: {enabled: false, title: 'Model 1805', subtitle: 'teardown'}, director: {enabled: false}, watermark: ''};
const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ss = (a, b, t) => smoother((t - a) / (b - a));

// the operator's pointer: glides to each button just before its press, rests near the model between presses
const REST = [[860, 470], [760, 430], [930, 520], [820, 390]];
export function makeCursor(ui, presses = PRESSES) {
  const EV = presses.filter((e) => e.t > 0 && ui.spots[e.key]).map((e) => ({t: e.t, spot: ui.spots[e.key]}));
  const WP = [[0, 900, 600]];
  EV.forEach((e, i) => {
    WP.push([e.t - 0.18, ...e.spot], [e.t + 0.22, ...e.spot]);
    const next = EV[i + 1];
    if (!next || next.t - e.t > 1.9) WP.push([e.t + 1.3, ...REST[i % REST.length]]);
  });
  WP.sort((a, b) => a[0] - b[0]);
  return (t) => {
    let i = 0;
    while (i < WP.length - 2 && t > WP[i + 1][0]) i++;
    const [t0, x0, y0] = WP[i];
    const [t1, x1, y1] = WP[i + 1];
    const k = ss(t0, t1, t);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const bow = Math.sin(Math.PI * k) * Math.min(26, len * 0.07);
    let press = false;
    let ring = 0;
    let rx = 0;
    let ry = 0;
    for (const e of EV) {
      if (t >= e.t - 0.07 && t < e.t + 0.09) press = true;
      if (t >= e.t && t < e.t + 0.55) {
        ring = 1 - (t - e.t) / 0.55;
        [rx, ry] = e.spot;
      }
    }
    return {x: x0 + (x1 - x0) * k + (len ? (-(y1 - y0) / len) * bow : 0), y: y0 + (y1 - y0) * k + (len ? ((x1 - x0) / len) * bow : 0), press, ring, ringX: rx, ringY: ry};
  };
}

export function run() {
  runSim(DEFAULTS, async ({canvas, capture}) => {
    const pr = capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2);
    const st = createStage({canvas, pr});
    const app = document.getElementById('app');
    // the 1600 x 900 console scales with the window
    app.style.cssText += ';position:absolute;inset:auto;left:0;top:0;width:1600px;height:900px;transform-origin:0 0';
    const ui = createConsole(app);
    const cursorAt = makeCursor(ui);
    const draw = makeFramer(st, ui);
    const world = tourWorld();
    const fit = () => {
      const k = Math.min(innerWidth / 1600, innerHeight / 900);
      app.style.transform = `translate(${(innerWidth - 1600 * k) / 2}px, ${(innerHeight - 900 * k) / 2}px) scale(${k})`;
      st.resize(1600, 900, pr * k);
    };
    fit();
    window.FILM = {st, world};
    return {
      resize: fit,
      render(t) {
        const s = world.at(t);
        draw({...s, cursor: cursorAt(t), paused: false, speed: 1, speedK: (1 - 0.1) / 1.9, sound: true, quality: 'FILM', tour: true, blink: Math.floor(t / 0.6) % 2 === 0, event: lastEvent(world, t), perf: '', foot: 'CINEMATIC TOUR · RENDERED FRAME BY FRAME'});
        return {};
      },
    };
  });
}
