// The console, laid out at 1600 x 900 and scaled to the window: title block, lock state with a schematic drawn from
// the lock model, live readouts, subsystem notes with their source status, every control as a button, playback,
// callouts with leaders, and the tour's pointer. update(s) redraws every live element from one frame's state.
import {D2R, G, faceAt, flintAt, rot, tumblerEdge, noseAt, tailAt, armAt, barAt} from './lock.js';
import {NOTES, SRC} from './notes.js';
import {GROUP_ORDER} from './teardown.js';

export const C = {ink: '#26221d', mute: '#8a8073', faint: '#d6cdbf', line: '#e2dacd', panel: 'rgba(250,247,241,.94)', acc: '#c4471c', ok: '#3f7d55', warn: '#b07a12', glass: '#4f7f9c'};
export const LOCK_OPS = ['rest', 'half', 'full', 'release', 'frizzen'];
export const LOCK_LABEL = {rest: 'REST', half: 'HALF-COCK', full: 'FULL-COCK', release: 'TRIGGER', frizzen: 'FRIZZEN'};
export const GROUP_LABEL = {lock: 'LOCK', cock: 'COCK & FLINT', frizzen: 'FRIZZEN & PAN', internals: 'TUMBLER & SEAR', springs: 'SPRINGS', trigger: 'TRIGGER & GUARD', barrel: 'BARREL', stock: 'STOCK', furniture: 'BRASS FURNITURE', ramrod: 'RAMROD', screws: 'SCREWS & PINS'};
export const MODES = ['solid', 'cut', 'xray'];
export const MODE_LABEL = {solid: 'SOLID', cut: 'CUTAWAY', xray: 'X-RAY'};
export const VIEWS = ['hero', 'lock', 'close', 'inside', 'top', 'left', 'under', 'muzzle', 'pan', 'trigger', 'butt', 'breech', 'ramrod'];
export const VIEW_LABEL = {hero: 'HERO', lock: 'LOCK', close: 'CLOSE', inside: 'INSIDE', top: 'TOP', left: 'LEFT', under: 'UNDER', muzzle: 'MUZZLE', pan: 'PAN', trigger: 'TRIGGER', butt: 'BUTT', breech: 'BREECH', ramrod: 'RAMROD'};

const CSS = `
#app{font-family:Inter,system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.ui{position:absolute;inset:0;pointer-events:none}
.mo{font-family:'JetBrains Mono',ui-monospace,monospace}
.sf{font-family:'EB Garamond',Georgia,serif}
.cp{position:absolute;background:${C.panel};border:1px solid ${C.line};border-radius:6px;box-shadow:0 2px 12px rgba(90,70,40,.07)}
.ph{position:absolute;display:flex;align-items:center;gap:9px;font:700 10.5px 'JetBrains Mono',monospace;letter-spacing:1.8px}
.ph i{display:block;width:3px;height:13px;background:${C.acc}}
.pn{position:absolute;font:500 9.5px 'JetBrains Mono',monospace;color:${C.mute};letter-spacing:1px}
.sm{font:500 9px 'JetBrains Mono',monospace;letter-spacing:1.5px;color:${C.mute};text-transform:uppercase;white-space:nowrap}
.bt{position:absolute;height:23px;padding:0 8px;display:flex;align-items:center;justify-content:center;border:1px solid ${C.faint};border-radius:4px;background:#fffdf9;font:700 9.2px 'JetBrains Mono',monospace;letter-spacing:1.1px;color:${C.ink};white-space:nowrap;pointer-events:auto;cursor:pointer;user-select:none;transition:filter .12s}
.bt:hover{filter:brightness(.95)}
.bt:focus-visible{outline:2px solid ${C.acc};outline-offset:2px}
.call{position:absolute;white-space:nowrap}
.call b{display:flex;align-items:center;gap:6px;font:700 9.6px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:${C.ink};background:rgba(250,247,241,.82);padding:1px 4px;border-radius:2px}
.call b i{display:block;width:6px;height:6px;background:${C.acc}}
.call b em{font-style:normal;font-weight:500;color:${C.mute};font-size:8.5px}
.cur{position:absolute;left:0;top:0;z-index:50;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3));pointer-events:none}
.ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:1.5px solid ${C.acc};opacity:0;z-index:49;pointer-events:none}
.nl{display:flex;gap:7px;align-items:flex-start;margin:0 0 5px 0;font:500 10.2px/1.34 Inter,sans-serif;color:#3d3730}
.tag{flex:none;width:15px;height:15px;border-radius:3px;font:700 8.6px/15px 'JetBrains Mono',monospace;text-align:center;color:#fff;margin-top:1px}
.tag.V{background:${C.ok}}.tag.E{background:${C.warn}}.tag.S{background:#8f877b}
.src{font:500 8.3px 'JetBrains Mono',monospace;color:${C.mute};letter-spacing:.6px}
.rng{position:absolute;pointer-events:auto;cursor:ew-resize;touch-action:none}
@keyframes blink{50%{opacity:.15}}
`;
const el = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h.trim();
  return d.firstElementChild;
};

// ------------------------------------------------------------ the schematic: the lock seen from inside the plate
const SX = (x) => 8 + (x + 0.92) * 192;
const SY = (y) => 8 + (0.33 - y) * 192;
const P = (p) => `${SX(p[0]).toFixed(1)},${SY(p[1]).toFixed(1)}`;
const path = (pts, close = false) => `M${pts.map(P).join('L')}${close ? 'Z' : ''}`;
const TUMBLER = (() => {
  const edge = tumblerEdge();
  const pts = edge.map(([a, r]) => [r * Math.cos(a), r * Math.sin(a)]);
  const a0 = edge[edge.length - 1][0];
  const a1 = edge[0][0] - Math.PI * 2;
  const R = Math.hypot(...pts[pts.length - 1]);
  for (let i = 1; i < 40; i++) {
    const a = a0 + ((a1 - a0) * i) / 40;
    pts.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  return pts;
})();
const PLATE = [[0.315, -0.03], [0.305, -0.112], [0.272, -0.142], [0.1, -0.152], [-0.3, -0.18], [-0.52, -0.172], [-0.7, -0.132], [-0.885, -0.068], [-0.7, -0.033], [-0.5, -0.004], [-0.3, 0.014], [-0.1, 0.026], [0.02, 0.033], [0.2, 0.031], [0.315, 0.004]];
function schematic(d) {
  const A = G.arbor;
  const th = d.theta;
  let h = `<path d="${path(PLATE, true)}" fill="#f4efe6" stroke="${C.faint}" stroke-width="1"/>`;
  // pan
  h += `<path d="${path([[0.016, 0.04], [0.016, 0.004], [0.17, 0.004], [0.17, 0.04]])}" fill="none" stroke="${C.mute}" stroke-width="1.2"/>`;
  // frizzen: face and cover
  const [fa, fb] = faceAt(d.phi);
  const cov = [rot([0.016, 0.048], G.friz, d.phi), rot([0.2, 0.048], G.friz, d.phi), rot([G.friz[0] + 0.02, G.friz[1]], G.friz, d.phi)];
  h += `<path d="${path([fb, fa, cov[0]])}M${P(fa)}L${P(cov[1])}L${P(cov[2])}" fill="none" stroke="${d.phase === 'release' || d.phase.startsWith('frizzen') ? C.acc : C.ink}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  h += `<circle cx="${SX(G.friz[0])}" cy="${SY(G.friz[1])}" r="2.6" fill="${C.ink}"/>`;
  // cock: arbor to the jaws, the flint
  const fl = flintAt(th);
  const neck = [rot([A[0] + 0.03, A[1] + 0.044], A, th), rot([A[0] + 0.02, A[1] + 0.17], A, th), rot([A[0] + 0.16, A[1] + 0.2], A, th), rot([A[0] + 0.24, A[1] + 0.14], A, th)];
  h += `<path d="${path(neck)}" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
  h += `<path d="${path([rot([A[0] + 0.24, A[1] + 0.14], A, th), fl])}" stroke="#555" stroke-width="3.6" stroke-linecap="round"/>`;
  // tumbler, swivel, mainspring
  const tum = TUMBLER.map(([x, y]) => rot([A[0] + x, A[1] + y], A, th));
  const hotT = d.phase === 'cocking' || d.phase === 'settle' || d.phase === 'release' || d.phase === 'lowering' || d.phase === 'manual';
  h += `<path d="${path(tum, true)}" fill="${hotT ? 'rgba(196,71,28,.14)' : '#e9e2d6'}" stroke="${C.ink}" stroke-width="1.3"/>`;
  h += `<circle cx="${SX(A[0])}" cy="${SY(A[1])}" r="3" fill="${C.ink}"/>`;
  const sw = d.swivel;
  const msB = G.msBend;
  h += `<path d="${path([[msB[0] + 0.006, msB[1] + 0.028], [-0.06, msB[1] + 0.06]])}M${P([msB[0] + 0.006, msB[1]])}L${P(sw)}" fill="none" stroke="${C.glass}" stroke-width="2" stroke-linecap="round"/>`;
  h += `<path d="M${P([msB[0] + 0.006, msB[1] + 0.028])}A5 5 0 0 1 ${P([msB[0] + 0.006, msB[1]])}" fill="none" stroke="${C.glass}" stroke-width="2"/>`;
  h += `<circle cx="${SX(sw[0])}" cy="${SY(sw[1])}" r="2.4" fill="${C.glass}"/>`;
  // sear: nose, pivot, tail; sear spring
  const S = G.sear;
  const nose = noseAt(d.psi);
  const tail = tailAt(d.psi);
  const arm = armAt(d.psi);
  const hotS = d.sear !== 'riding' || d.psiTrig > 0.5;
  h += `<path d="${path([nose, S, tail])}" fill="none" stroke="${hotS ? C.acc : C.ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  h += `<circle cx="${SX(S[0])}" cy="${SY(S[1])}" r="2.6" fill="${C.ink}"/>`;
  h += `<circle cx="${SX(nose[0])}" cy="${SY(nose[1])}" r="3.4" fill="${C.acc}"/>`;
  const ssB = G.ssBend;
  h += `<path d="${path([[-0.575, ssB[1] + 0.029], [ssB[0] - 0.004, ssB[1] + 0.021]])}M${P([ssB[0] - 0.004, ssB[1]])}L${P(tail)}" fill="none" stroke="${C.glass}" stroke-width="1.6" stroke-linecap="round"/>`;
  // trigger: blade and bar
  const T = G.trig;
  const blade = [T, rot([T[0] + 0.006, -0.32], T, d.omega), rot([-0.517, -0.418], T, d.omega)];
  const bar = barAt(d.omega);
  h += `<path d="${path(blade)}M${P(T)}L${P(bar)}" fill="none" stroke="${d.psiTrig > 0.3 ? C.acc : C.ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  h += `<circle cx="${SX(T[0])}" cy="${SY(T[1])}" r="2.4" fill="${C.ink}"/>`;
  h += `<rect x="${SX(arm[0]) - 3}" y="${SY(arm[1]) - 3}" width="6" height="6" fill="${C.ink}" opacity=".6"/>`;
  // flint contact
  if (d.contact) h += `<circle cx="${SX(fl[0])}" cy="${SY(fl[1])}" r="6" fill="none" stroke="${C.acc}" stroke-width="1.6"/>`;
  // labels
  const lab = (x, y, t, a = 'start') => `<text x="${x}" y="${y}" font-size="7.6" letter-spacing=".8" fill="${C.mute}" font-family="JetBrains Mono" text-anchor="${a}">${t}</text>`;
  h += lab(SX(-0.33), SY(-0.2), 'TUMBLER', 'middle') + lab(SX(-0.6), SY(-0.165), 'SEAR', 'middle') + lab(SX(-0.07), SY(-0.2), 'MAINSPRING', 'middle') + lab(SX(0.24), SY(0.29), 'FRIZZEN', 'middle') + lab(SX(-0.4), SY(-0.43), 'TRIGGER', 'middle') + lab(SX(-0.8), SY(0.0), 'SEAR SPRING', 'middle');
  return h;
}

export function createConsole(app, {live = false} = {}) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ui = el(`<div class="ui"></div>`);
  app.appendChild(ui);
  const add = (h) => {
    const n = el(h);
    ui.appendChild(n);
    return n;
  };
  const panel = (x, y, w, h, title, n) => {
    add(`<div class="cp" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`);
    add(`<div class="ph" style="left:${x + 14}px;top:${y + 13}px"><i></i>${title}</div>`);
    add(`<div class="pn" style="right:${1600 - x - w + 14}px;top:${y + 15}px">${n}</div>`);
  };
  const btn = {};
  const mkBtn = (key, label, x, y, w, extra = '') => {
    btn[key] = add(`<div class="bt" role="button" tabindex="0" data-key="${key}" aria-label="${label}" style="left:${x}px;top:${y}px;width:${w}px;${extra}">${label}</div>`);
    btn[key].addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        btn[key].dispatchEvent(new MouseEvent('click', {bubbles: true}));
      }
    });
    return btn[key];
  };
  const row = (keys, labels, x0, y, wmax, gap = 5, h = 29) => {
    let x = x0;
    let yy = y;
    for (const k of keys) {
      const w = Math.round(labels[k].length * 6.6 + 18);
      if (x + w > x0 + wmax) {
        x = x0;
        yy += h;
      }
      mkBtn(k, labels[k], x, yy, w);
      x += w + gap;
    }
  };

  // ------------------------------------------------------------ title block
  add(`<div style="position:absolute;left:0;top:0;width:118px;height:92px;background:${C.acc}"></div>`);
  add(`<div class="mo" style="position:absolute;left:0;top:22px;width:118px;text-align:center;color:#fff;font-size:10px;letter-spacing:3px;font-weight:600">U.S.</div>`);
  add(`<div class="sf" style="position:absolute;left:0;top:34px;width:118px;text-align:center;color:#fff;font-size:36px;line-height:1">1805</div>`);
  add(`<div class="sm" style="position:absolute;left:140px;top:18px;letter-spacing:2.4px">HARPERS FERRY ARMORY · c. 1806–1808</div>`);
  add(`<div class="sf" style="position:absolute;left:139px;top:30px;font-size:35px;line-height:1.05;letter-spacing:-.2px">Model 1805 Flintlock Pistol <span style="color:${C.acc}">/</span> <i style="color:#6d6357">a teardown</i></div>`);
  add(`<div class="mo" style="position:absolute;left:140px;top:72px;font-size:10.6px;letter-spacing:2.2px;color:#6d6357">LOCK MECHANISM · SUBSYSTEMS · HISTORICAL VISUAL STUDY</div>`);
  add(`<div style="position:absolute;right:24px;top:20px;text-align:right"><div class="sm" style="letter-spacing:2.2px;color:${C.acc};font-weight:700">VISUAL SIMULATOR · NON-FUNCTIONAL MODEL</div><div class="sm" style="margin-top:6px;letter-spacing:1.6px">SIMPLIFIED PROPORTIONS · NOT A FABRICATION REFERENCE</div><div class="sm" style="margin-top:6px;letter-spacing:1.6px">NO LOADING, FIRING OR CONSTRUCTION GUIDANCE</div></div>`);

  // ------------------------------------------------------------ 01 lock state + schematic
  panel(24, 112, 290, 300, 'LOCK STATE', '01');
  const chip = add(`<div style="position:absolute;left:38px;top:150px;width:12px;height:26px;border-radius:2px"></div>`);
  const stTitle = add(`<div style="position:absolute;left:60px;top:147px;font-size:17px;font-weight:650;letter-spacing:.2px"></div>`);
  const stSub = add(`<div class="sm" style="position:absolute;left:61px;top:169px;letter-spacing:1.1px;font-size:8.6px"></div>`);
  add(`<div style="position:absolute;left:38px;top:186px;width:262px;height:1px;background:${C.line}"></div>`);
  add(`<div class="sm" style="position:absolute;left:38px;top:194px;font-size:8px">SCHEMATIC · THROUGH THE PLATE · FROM THE MODEL STATE</div>`);
  const sch = add(`<svg style="position:absolute;left:38px;top:206px" width="262" height="200" viewBox="0 0 262 200"></svg>`);

  // ------------------------------------------------------------ 02 readouts
  panel(24, 424, 290, 214, 'READOUTS', '02');
  const RD = ['COCK / TUMBLER', 'SEAR', 'TRIGGER', 'MAINSPRING', 'FRIZZEN', 'PAN COVER', 'FLINT'];
  const rd = RD.map((n, i) => {
    const y = 460 + i * 24;
    add(`<div class="sm" style="position:absolute;left:38px;top:${y}px">${n}</div>`);
    add(`<div style="position:absolute;left:150px;top:${y + 4}px;width:70px;height:4px;background:#ece5d9;border-radius:2px"></div>`);
    const f = add(`<div style="position:absolute;left:150px;top:${y + 4}px;height:4px;background:${C.acc};border-radius:2px"></div>`);
    const v = add(`<div class="mo" style="position:absolute;right:${1600 - 300}px;top:${y - 2}px;font-size:10.4px;font-weight:600;text-align:right"></div>`);
    return {f, v};
  });
  add(`<div class="sm" style="position:absolute;left:38px;top:628px;font-size:7.6px;letter-spacing:1px;color:#a89f92">MODEL DEGREES · RELATIVE · NOT MEASUREMENTS</div>`);

  // ------------------------------------------------------------ 03 notes for the subsystem in view
  panel(24, 650, 290, 222, 'SOURCE NOTES', '03');
  const noteT = add(`<div class="mo" style="position:absolute;left:38px;top:684px;font-size:11px;font-weight:700;letter-spacing:1.6px"></div>`);
  const noteB = add(`<div style="position:absolute;left:38px;top:704px;width:264px"></div>`);
  add(`<div style="position:absolute;left:38px;top:836px;display:flex;gap:8px;align-items:center" class="sm"><span class="tag V">V</span>VERIFIED<span class="tag E">E</span>ESTIMATE<span class="tag S">S</span>SIMPLIFIED</div>`);
  add(`<div class="sm" style="position:absolute;left:38px;top:856px;font-size:7.4px;letter-spacing:.8px">[SI] NMAH · [NRA] NRA MUSEUM · [BON] [CAT] AUCTIONS</div>`);

  // ------------------------------------------------------------ 04 lock actions
  panel(1286, 112, 290, 150, 'LOCK ACTIONS', '04');
  row(LOCK_OPS, LOCK_LABEL, 1300, 148, 264, 5, 29);
  add(`<div class="sm" style="position:absolute;left:1300px;top:214px">COCK · MANUAL</div>`);
  const CK = {x: 1400, w: 158, y: 219};
  add(`<div style="position:absolute;left:${CK.x}px;top:${CK.y}px;width:${CK.w}px;height:3px;background:#ece5d9;border-radius:2px"></div>`);
  const ckFill = add(`<div style="position:absolute;left:${CK.x}px;top:${CK.y}px;height:3px;background:${C.acc};border-radius:2px"></div>`);
  const ckKnob = add(`<div style="position:absolute;top:${CK.y - 6}px;width:15px;height:15px;margin-left:-7.5px;border-radius:50%;background:#fff;border:2px solid ${C.acc};box-sizing:border-box"></div>`);
  const ckMarks = add(`<svg style="position:absolute;left:${CK.x}px;top:${CK.y + 8}px" width="${CK.w}" height="22"></svg>`);
  {
    const X = (th) => ((th - 0) / G.MAX) * CK.w;
    ckMarks.innerHTML = [['H', G.HALF], ['F', G.FULL]].map(([n, th]) => `<line x1="${X(th)}" x2="${X(th)}" y1="0" y2="5" stroke="${C.mute}"/><text x="${X(th)}" y="15" font-size="7.5" text-anchor="middle" fill="${C.mute}" font-family="JetBrains Mono">${n}</text>`).join('');
  }
  const ckHit = add(`<div class="rng" data-key="cockslider" aria-label="Cock angle (manual)" style="left:${CK.x - 8}px;top:${CK.y - 11}px;width:${CK.w + 16}px;height:24px"></div>`);
  add(`<div class="sm" style="position:absolute;left:1300px;top:232px;font-size:7.6px;color:#a89f92">DRAG THE COCK · LET GO TO SETTLE</div>`);

  // ------------------------------------------------------------ 05 subsystems
  panel(1286, 274, 290, 236, 'SUBSYSTEMS · TEARDOWN', '05');
  // subsystem keys carry a g: prefix and camera keys a v: prefix (LOCK and FRIZZEN appear twice)
  const GL = Object.fromEntries(Object.entries({...GROUP_LABEL, none: 'ASSEMBLED', all: 'EXPLODED'}).map(([k, v]) => [`g:${k}`, v]));
  row(['none', 'all', ...GROUP_ORDER].map((k) => `g:${k}`), GL, 1300, 310, 264, 5, 29);

  // ------------------------------------------------------------ 06 display
  panel(1286, 522, 290, 106, 'DISPLAY', '06');
  row([...MODES, 'labels', 'orbit'], {...MODE_LABEL, labels: 'LABELS', orbit: 'ORBIT'}, 1300, 558, 264, 5, 29);

  // ------------------------------------------------------------ 07 camera
  panel(1286, 640, 290, 141, 'CAMERA', '07');
  row(VIEWS.map((k) => `v:${k}`), Object.fromEntries(VIEWS.map((k) => [`v:${k}`, VIEW_LABEL[k]])), 1300, 676, 264, 5, 29);

  // ------------------------------------------------------------ 08 playback (bottom)
  panel(330, 792, 940, 80, 'PLAYBACK', '08');
  mkBtn('play', '❚❚', 346, 822, 38, `height:38px;border-radius:50%;border:none;background:${C.acc};color:#fff;font-size:12px`);
  mkBtn('tour', 'AUTO TOUR', 396, 830, 92);
  add(`<div class="sm" style="position:absolute;left:504px;top:836px">SPEED</div>`);
  const SP = {x: 552, w: 110, y: 840};
  add(`<div style="position:absolute;left:${SP.x}px;top:${SP.y}px;width:${SP.w}px;height:3px;background:#ece5d9;border-radius:2px"></div>`);
  const spFill = add(`<div style="position:absolute;left:${SP.x}px;top:${SP.y}px;height:3px;background:${C.acc};border-radius:2px"></div>`);
  const spKnob = add(`<div style="position:absolute;top:${SP.y - 6}px;width:15px;height:15px;margin-left:-7.5px;border-radius:50%;background:#fff;border:2px solid ${C.acc};box-sizing:border-box"></div>`);
  const spVal = add(`<div class="mo" style="position:absolute;left:672px;top:834px;font-size:10px;font-weight:700;width:36px"></div>`);
  const spHit = add(`<div class="rng" data-key="speedslider" aria-label="Animation speed" style="left:${SP.x - 8}px;top:${SP.y - 11}px;width:${SP.w + 16}px;height:24px"></div>`);
  mkBtn('step', 'STEP ▸', 716, 830, 62);
  mkBtn('sound', 'SOUND OFF', 786, 830, 84);
  mkBtn('quality', 'QUALITY · AUTO', 878, 830, 118);
  add(`<div class="sm" style="position:absolute;left:1010px;top:822px">LAST EVENT</div>`);
  const evText = add(`<div class="mo" style="position:absolute;left:1010px;top:838px;width:250px;font-size:9.6px;font-weight:700;letter-spacing:1px;color:${C.acc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>`);
  const fps = add(`<div class="sm" style="position:absolute;left:1010px;top:856px;font-size:7.6px"></div>`);

  // ------------------------------------------------------------ footer
  add(`<div class="sm" style="position:absolute;left:330px;top:880px;font-size:8px;letter-spacing:1.6px">SOURCES · SMITHSONIAN NMAH · NRA NATIONAL FIREARMS MUSEUM · BONHAMS SKINNER LOT 1049 · SEE REPOSITORY DOCS</div>`);
  const foot = add(`<div class="sm" style="position:absolute;right:28px;top:880px;font-size:8px;letter-spacing:1.6px"></div>`);
  const tourChip = add(`<div class="mo" style="position:absolute;left:800px;top:104px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:22px;padding:0 11px;border:1px solid ${C.line};border-radius:4px;background:rgba(250,247,241,.94);font-size:9px;font-weight:700;letter-spacing:1.3px;white-space:nowrap;pointer-events:auto;cursor:pointer" role="button" tabindex="0" data-key="tourchip"></div>`);
  const viewTag = add(`<div class="sm" style="position:absolute;left:800px;top:134px;transform:translateX(-50%);font-size:8.6px;letter-spacing:2px"></div>`);

  // ------------------------------------------------------------ callouts and pointer
  const callSvg = add(`<svg style="position:absolute;inset:0;overflow:visible" width="1600" height="900"></svg>`);
  const callG = add(`<div style="position:absolute;inset:0"></div>`);
  const ring = add(`<div class="ring"></div>`);
  const cur = add(`<div class="cur"><svg width="22" height="22" viewBox="0 0 34 34"><path d="M4 3 L30 13.5 L17.5 17.5 L13.5 30 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></div>`);

  const centre = (n) => [parseFloat(n.style.left) + parseFloat(n.style.width) / 2, parseFloat(n.style.top) + 11.5];
  const spots = Object.fromEntries(Object.entries(btn).map(([k, n]) => [k, centre(n)]));
  spots.cockslider = [CK.x + CK.w * 0.5, CK.y + 1];
  const pointer = (c) => {
    cur.style.display = !c || c.x < 0 ? 'none' : 'block';
    if (!c) return;
    cur.style.transform = `translate(${(c.x - 3).toFixed(2)}px, ${(c.y - 2).toFixed(2)}px) scale(${c.press ? 0.88 : 1})`;
    ring.style.left = `${c.ringX}px`;
    ring.style.top = `${c.ringY}px`;
    ring.style.opacity = String((c.ring || 0) * 0.85);
    ring.style.transform = `scale(${(0.35 + 0.9 * (1 - (c.ring || 0))).toFixed(3)})`;
  };
  const onBtn = (k, on, kind = 'acc') => {
    const b = btn[k];
    if (!b) return;
    const bg = on ? (kind === 'ink' ? C.ink : C.acc) : '#fffdf9';
    if (b.dataset.on !== `${on}${kind}`) {
      b.dataset.on = `${on}${kind}`;
      b.style.background = bg;
      b.style.color = on ? '#fff' : C.ink;
      b.style.borderColor = on ? bg : C.faint;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  };
  let lastNote = '';
  let lastSch = '';
  return {
    root: ui,
    btn,
    spots,
    CK,
    SP,
    ckHit,
    spHit,
    tourChip,
    pointer,
    update(s) {
      const d = s.d;
      const [title, sub, kind] = d.label;
      chip.style.background = kind === 'ok' ? C.ok : kind === 'warn' ? C.warn : C.acc;
      if (stTitle.textContent !== title) stTitle.textContent = title;
      if (stSub.textContent !== sub) stSub.textContent = sub;
      const shtml = schematic(d);
      if (shtml !== lastSch) {
        sch.innerHTML = shtml;
        lastSch = shtml;
      }
      // readouts, all from the same derived state
      const vals = [
        [d.theta / G.MAX, `${d.theta.toFixed(1)}°`],
        [d.psi / G.PSI_MAX, d.sear === 'half' ? 'HALF NOTCH' : d.sear === 'full' ? 'FULL STEP' : d.psiTrig > d.psi - 0.01 && d.psiTrig > 0.5 ? 'LIFTED' : 'RIDING'],
        [d.k, d.blocked ? 'BLOCKED' : `${Math.round(d.k * 100)}%`],
        [d.mainspring, `${Math.round(d.mainspring * 100)}%`],
        [d.phi / G.FRIZ_OPEN, `${(-d.phi).toFixed(1)}°`],
        [d.panOpen ? 1 : 0, d.panOpen ? 'OPEN' : 'CLOSED'],
        [d.contact ? 1 : 0, d.contact ? 'ON THE FACE' : 'CLEAR'],
      ];
      rd.forEach((r, i) => {
        r.f.style.width = `${(Math.min(1, Math.max(0, vals[i][0])) * 70).toFixed(1)}px`;
        if (r.v.textContent !== vals[i][1]) r.v.textContent = vals[i][1];
      });
      // notes
      const nk = s.focus || 'none';
      if (nk !== lastNote) {
        lastNote = nk;
        const N = NOTES[nk] || NOTES.none;
        noteT.textContent = N.title;
        noteB.innerHTML = N.lines.map(([t, txt, src]) => `<div class="nl"><span class="tag ${t}">${t}</span><span>${txt}${src ? ` <span class="src" title="${SRC[src]}">[${src}]</span>` : ''}</span></div>`).join('');
      }
      // buttons
      for (const k of ['none', 'all', ...GROUP_ORDER]) onBtn(`g:${k}`, (s.focus || 'none') === k);
      for (const k of MODES) onBtn(k, s.mode === k, 'ink');
      onBtn('labels', s.labelsOn, 'ink');
      onBtn('orbit', s.orbit, 'ink');
      for (const k of VIEWS) onBtn(`v:${k}`, s.view === k, 'ink');
      for (const k of LOCK_OPS) {
        const on = (k === 'rest' && d.label[0] === 'REST') || (k === 'half' && d.sear === 'half' && d.phase === 'idle') || (k === 'full' && d.sear === 'full' && d.phase === 'idle') || (k === 'release' && d.psiTrig > 0.3) || (k === 'frizzen' && d.panOpen);
        onBtn(k, on);
      }
      onBtn('sound', !!s.sound, 'ink');
      if (btn.sound.textContent !== (s.sound ? 'SOUND ON' : 'SOUND OFF')) btn.sound.textContent = s.sound ? 'SOUND ON' : 'SOUND OFF';
      const q = `QUALITY · ${s.quality || 'AUTO'}`;
      if (btn.quality.textContent !== q) btn.quality.textContent = q;
      const pl = s.paused ? '▶' : '❚❚';
      if (btn.play.textContent !== pl) btn.play.textContent = pl;
      onBtn('tour', !!s.tour, 'ink');
      // the manual cock slider follows the cock
      const kx = Math.max(0, Math.min(1, d.theta / G.MAX)) * CK.w;
      ckFill.style.width = `${kx.toFixed(1)}px`;
      ckKnob.style.left = `${(CK.x + kx).toFixed(1)}px`;
      const sk = s.speedK ?? 0.5;
      spFill.style.width = `${(sk * SP.w).toFixed(1)}px`;
      spKnob.style.left = `${(SP.x + sk * SP.w).toFixed(1)}px`;
      const sv = `${(s.speed ?? 1).toFixed(2)}×`;
      if (spVal.textContent !== sv) spVal.textContent = sv;
      if (evText.textContent !== (s.event || '—')) evText.textContent = s.event || '—';
      if (fps.textContent !== (s.perf || '')) fps.textContent = s.perf || '';
      if (foot.textContent !== (s.foot || '')) foot.textContent = s.foot || '';
      // the live page blinks with CSS; the film blinks from its own clock so every frame is a function of t
      const blink = live ? 'animation:blink 1.2s steps(2) infinite' : `opacity:${s.blink ? 1 : 0.15}`;
      const tc = s.tour ? `<i style="display:block;width:6px;height:6px;border-radius:50%;background:#c4471c;${blink}"></i>AUTO TOUR · CLICK ANYWHERE TO TAKE OVER` : live ? '▶ RESUME AUTO TOUR' : '';
      if (tourChip.dataset.v !== tc) {
        tourChip.dataset.v = tc;
        tourChip.innerHTML = tc;
        tourChip.style.display = tc ? 'flex' : 'none';
      }
      const vt = s.viewTag || '';
      if (viewTag.textContent !== vt) viewTag.textContent = vt;
      // callouts: square, name, status tag; a thin leader to the part
      let lh = '';
      let ch = '';
      for (const c of s.callouts || []) {
        const [ax, ay] = c.at;
        const [lx, ly] = c.label;
        const right = lx > ax;
        const ex = right ? lx - 4 : lx + c.w + 4;
        lh += `<polyline points="${ax.toFixed(1)},${ay.toFixed(1)} ${ex.toFixed(1)},${(ly + 8).toFixed(1)}" fill="none" stroke="${C.acc}" stroke-width=".9" opacity="${c.o.toFixed(2)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.6" fill="${C.acc}" opacity="${c.o.toFixed(2)}"/>`;
        ch += `<div class="call" style="left:${lx.toFixed(1)}px;top:${ly.toFixed(1)}px;opacity:${c.o.toFixed(2)}"><b><i></i>${c.name}<em>${c.tag}</em></b></div>`;
      }
      if (callSvg.dataset.v !== lh) {
        callSvg.dataset.v = lh;
        callSvg.innerHTML = lh;
      }
      if (callG.dataset.v !== ch) {
        callG.dataset.v = ch;
        callG.innerHTML = ch;
      }
      pointer(s.cursor);
    },
  };
}
