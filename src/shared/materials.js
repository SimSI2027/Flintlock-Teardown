// Procedural materials for the pistol: aged walnut with its grain running along the stock, iron and steel with a
// restrained patina, mellow brass, and the struck markings recorded on surviving Model 1805 pistols, all computed in
// the shader from the part's own coordinates (nothing is downloaded, no photograph is used as a texture). Every metal
// shares one shader program and every wood another; each material only sets its own uniforms, so the program count
// stays low and the look of a material is a handful of numbers.
import * as THREE from 'three';

// one switch for the fine detail (pores, pitting, scratches, bump): the LOW quality tier turns it off
export const DETAIL = {value: 1};

const NOISE = /* glsl */ `
uniform float uDetail;
float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// a height field h (model units) tilts the shading normal: screen-space derivatives, so no tangents are needed
vec3 bumpN(vec3 n, float h){
  vec3 dpx = dFdx(-vViewPosition); vec3 dpy = dFdy(-vViewPosition);
  vec3 r1 = cross(dpy, n); vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec2 dh = vec2(dFdx(h), dFdy(h));
  vec3 g = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * n - g);
}
`;

const VERT_HEAD = /* glsl */ `varying vec3 vObj;\nvarying vec3 vObjN;\n`;
const VERT_BODY = /* glsl */ `#include <begin_vertex>\nvObj = position;\nvObjN = normal;`;

// ------------------------------------------------------------ metals
const METAL_FRAG_HEAD = /* glsl */ `
varying vec3 vObj; varying vec3 vObjN;
uniform vec3 uTone; uniform vec4 uMot; uniform vec4 uPit; uniform vec4 uZone; uniform vec4 uScr;
uniform float uEdge; uniform float uRv; uniform float uBack;
uniform vec4 uMark; uniform vec4 uMarkA; uniform vec4 uMarkUV; uniform sampler2D uMarks;
${NOISE}`;

const METAL_COLOR = /* glsl */ `#include <color_fragment>
vec3 P = vObj;
vec3 Nn = normalize(vObjN);
// patina: low-frequency spots and a slower drift of tone
float m1 = vn(P * uMot.x + uMot.w);
float m2 = vn(P * uMot.x * 3.1 + uMot.w + 4.7);
float mott = smoothstep(0.22, 0.82, m1 * 0.7 + m2 * 0.3);
float pit = 0.0;
float scr = 0.0;
if (uDetail > 0.5) {
  // light pitting, denser toward the breech and the muzzle where uZone says so
  float zone = uPit.x + uPit.z * ((1.0 - smoothstep(uZone.x, uZone.y, P.x)) + smoothstep(uZone.z, uZone.w, P.x));
  vec3 pq = P * uPit.y;
  float pfw = fwidth(pq.x) + fwidth(pq.y) + fwidth(pq.z);
  pit = zone * smoothstep(0.86, 0.96, vn(pq)) * (1.0 - smoothstep(0.6, 1.4, pfw));
  // fine polishing scratches along one direction
  vec3 sd = normalize(uScr.yzw);
  vec3 s1 = normalize(cross(sd, abs(sd.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 s2 = cross(sd, s1);
  vec3 sq = vec3(dot(P, sd) * 5.0, dot(P, s1) * 620.0, dot(P, s2) * 620.0);
  float sfw = fwidth(sq.y) + fwidth(sq.z);
  scr = uScr.x * smoothstep(0.7, 0.96, vn(sq)) * (1.0 - smoothstep(0.7, 1.6, sfw));
}
// rubbed edges: the bevels of flat parts (their normals lean between the face and the side wall)
float edge = uEdge * (1.0 - abs(abs(Nn.z) * 2.0 - 1.0)) * (0.55 + 0.45 * vn(P * 36.0 + 2.0));
// struck markings: a planar patch (lock plate) or a band around the barrel's axis
float mk = 0.0;
if (uMark.x > 0.5) {
  vec2 q;
  float on;
  if (uMark.x < 1.5) {
    q = P.xy;
    on = step(abs(P.z - uMark.y), 0.0012) * step(0.5, Nn.z * uMark.z);
  } else {
    q = vec2(P.x, atan(P.y, -P.z));
    on = step(uMark.y, length(P.yz)) * step(P.z, 0.0);
  }
  vec2 uvm = (q - uMarkA.xy) * uMarkA.zw;
  on *= step(0.0, uvm.x) * step(uvm.x, 1.0) * step(0.0, uvm.y) * step(uvm.y, 1.0);
  mk = on * texture(uMarks, mix(uMarkUV.xy, uMarkUV.zw, uvm)).r;
}
diffuseColor.rgb *= mix(vec3(1.0), uTone, mott * uMot.y);
diffuseColor.rgb *= 1.0 - 0.6 * pit;
diffuseColor.rgb *= 1.0 + 0.3 * edge;
diffuseColor.rgb *= 1.0 - 0.38 * mk;
if (!gl_FrontFacing) diffuseColor.rgb *= uBack;
float mRough = (mott - 0.5) * uRv + 0.3 * pit + 0.1 * scr - 0.16 * edge + 0.25 * mk;
float mH = -pit * 0.00012 - scr * 0.00002 - mk * 0.0008;`;

// ------------------------------------------------------------ wood
const WOOD_VERT_HEAD = /* glsl */ `${VERT_HEAD}attribute vec4 wd;\nvarying vec4 vWd;\n`;
const WOOD_VERT_BODY = /* glsl */ `${VERT_BODY}\nvWd = wd;`;
const WOOD_FRAG_HEAD = /* glsl */ `
varying vec3 vObj; varying vec3 vObjN; varying vec4 vWd;
uniform vec3 uWa; uniform vec3 uWb; uniform vec3 uWp;
uniform float uRing; uniform vec4 uPith; uniform vec4 uWood; uniform vec4 uStock; uniform vec4 uPol;
uniform float uBack; uniform vec4 uMaskA; uniform sampler2D uMask;
${NOISE}`;

const WOOD_COLOR = (rodY) => /* glsl */ `#include <color_fragment>
vec4 W = vWd;
float s = W.x;
vec2 ab = W.yz;
vec3 P = vObj;
vec3 Nn = normalize(vObjN);
// growth rings: the pith runs off to one side and drifts along the stock, so a flat cuts the rings into long
// stripes and the occasional arch; the earlywood is lighter, the latewood a narrow dark band
vec2 pith = uPith.xy + uPith.zw * s;
float warp = vn(vec3(s * 1.1, ab * 4.0) + 11.0);
float warp2 = vn(vec3(s * 0.35, ab * 1.3) + 5.0);
float R = length(ab - pith) * uRing * (0.8 + 0.45 * warp2) + warp * 2.2 + s * 0.22;
float fr = fract(R);
float late = smoothstep(0.5, 0.78, fr) * (1.0 - smoothstep(0.8, 1.0, fr)) * (0.55 + 0.45 * vn(vec3(s * 3.0, ab * 9.0)));
late = mix(late, 0.24, smoothstep(0.1, 0.3, fwidth(R)));
float mot = vn(vec3(s * 0.9, ab * 1.6) + 3.0) * 0.65 + vn(vec3(s * 2.6, ab * 5.0) + 8.0) * 0.35;
float fine = 0.0;
float pore = 0.0;
if (uDetail > 0.5) {
  vec3 gq = vec3(s * 7.0, ab * 210.0);
  float gfw = fwidth(gq.y) + fwidth(gq.z);
  fine = (vn(gq) - 0.5) * (1.0 - smoothstep(0.7, 1.6, gfw));
  vec3 pq = vec3(s * 70.0, ab * 520.0);
  float pfw = fwidth(pq.x) + fwidth(pq.y) + fwidth(pq.z);
  pore = uWood.y * smoothstep(0.83, 0.95, vn(pq)) * (1.0 - smoothstep(1.2, 2.6, pfw));
}
float eg = step(1.5, W.w);
float corner = clamp(W.w, 0.0, 1.0) * (1.0 - eg);
vec3 col = mix(uWa, uWb, late * 0.6);
col *= 1.0 + fine * uWood.x;
col *= mix(1.0 - uWood.z, 1.0 + uWood.z, mot);
col = mix(col, uWp, pore * 0.7);
col *= 1.0 - 0.3 * eg;
// darker wood where metal is let in: the inlet seams and their oil-darkened margins (lock plate on the right flat,
// side plate on the left, the butt-cap ears), the barrel and ramrod channels, the cap and nose-band edges
float sideW = smoothstep(0.25, 0.6, abs(Nn.z));
vec4 mm = texture(uMask, (P.xy - uMaskA.xy) * uMaskA.zw);
float right = step(0.0, P.z);
float inl = mix(mm.g, mm.r, right) * sideW * uStock.x;
float cart = mm.b * (1.0 - right) * sideW * uStock.x;
float bR = 0.106 - 0.0072 * max(P.x, 0.0);
float nb = step(-0.04, P.x) * step(P.x, 1.27) * step(-0.03, P.y) * (1.0 - smoothstep(0.0, 0.014, length(P.yz) - bR));
float nr = step(-0.25, P.x) * step(P.x, 1.27) * (1.0 - smoothstep(0.0, 0.01, length(vec2(P.y - (${rodY}), P.z)) - 0.0185));
float ringS = (1.0 - smoothstep(0.0, 0.012, abs(s - uStock.y))) + (1.0 - smoothstep(0.0, 0.009, abs(s - uStock.z)));
float dark = clamp(inl + 0.55 * nb + 0.45 * nr + 0.5 * ringS, 0.0, 1.0) * uStock.x;
col *= 1.0 - 0.45 * dark;
// hand-polished wrist and grip, and edges rubbed lighter through the finish
float pol = uStock.x * smoothstep(uPol.x, uPol.x + 0.25, s) * (1.0 - smoothstep(uPol.y - 0.2, uPol.y, s));
col *= 1.0 - 0.06 * pol;
float wear = corner * (0.45 + 0.55 * vn(P * 28.0));
col *= 1.0 + 0.18 * wear;
col *= 1.0 - 0.16 * cart;
diffuseColor.rgb *= col;
if (!gl_FrontFacing) diffuseColor.rgb *= uBack;
float mRough = 0.07 * (mot - 0.5) - 0.05 * late + 0.22 * pore - uPol.z * pol - 0.1 * wear + 0.1 * dark - 0.08 * cart;
float mH = -pore * 0.00012 - late * 0.00004 + fine * 0.00003 - cart * 0.0004;`;

const ROUGH = /* glsl */ `#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + mRough, 0.06, 1.0);`;
const NORMAL = /* glsl */ `#include <normal_fragment_maps>\nif (uDetail > 0.5) normal = bumpN(normal, mH);`;

function patch(m, key, vHead, vBody, fHead, fColor, uniforms) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = vHead + sh.vertexShader.replace('#include <begin_vertex>', vBody);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
${fHead}`).replace('#include <color_fragment>', fColor).replace('#include <roughnessmap_fragment>', ROUGH).replace('#include <normal_fragment_maps>', NORMAL);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

const col = (hex) => new THREE.Color(hex);
const v4 = (a, b, c, d) => new THREE.Vector4(a, b, c, d);

/**
 * A metal. o: tone (patina colour multiplier), mot [scale, amount, -, seed], pit [base, freq, zone extra],
 * zone [breech end x0, x1, muzzle start x0, x1], scr [amount, dir], edge, rv (roughness swing), back (back faces),
 * mark {mode, a, b, A, UV}.
 */
function metal(params, o, marks) {
  const m = new THREE.MeshStandardMaterial(params);
  const mk = o.mark || {mode: 0, a: 0, b: 0, A: [0, 0, 1, 1], UV: [0, 0, 1, 1]};
  return patch(m, 'metal-v2', VERT_HEAD, VERT_BODY, METAL_FRAG_HEAD, METAL_COLOR, {
    uDetail: DETAIL,
    uTone: {value: col(o.tone || '#ffffff')},
    uMot: {value: v4(...(o.mot || [6, 0.3, 0, 1.7]))},
    uPit: {value: v4(...(o.pit || [0.15, 420, 0, 0]))},
    uZone: {value: v4(...(o.zone || [-9, -8, 9, 10]))},
    uScr: {value: v4(...(o.scr || [0.3, 1, 0, 0]))},
    uEdge: {value: o.edge ?? 0.5},
    uRv: {value: o.rv ?? 0.12},
    uBack: {value: o.back ?? 1},
    uMark: {value: v4(mk.mode, mk.a, mk.b, 0)},
    uMarkA: {value: v4(...mk.A)},
    uMarkUV: {value: v4(...mk.UV)},
    uMarks: {value: marks},
  });
}

function wood(o, mask, physical = true) {
  const p = {color: '#ffffff', roughness: o.rough ?? 0.6, metalness: 0, envMapIntensity: o.env ?? 0.55};
  const m = physical ? new THREE.MeshPhysicalMaterial({...p, clearcoat: o.clearcoat ?? 0.14, clearcoatRoughness: 0.55}) : new THREE.MeshStandardMaterial(p);
  return patch(m, physical ? 'wood-v2p' : 'wood-v2', WOOD_VERT_HEAD, WOOD_VERT_BODY, WOOD_FRAG_HEAD, WOOD_COLOR(o.rodY), {
    uDetail: DETAIL,
    uWa: {value: col(o.a)},
    uWb: {value: col(o.b)},
    uWp: {value: col(o.p)},
    uRing: {value: o.ring},
    uPith: {value: v4(...o.pith)},
    uWood: {value: v4(...o.wood)},
    uStock: {value: v4(...(o.stock || [0, -9, -9, 0]))},
    uPol: {value: v4(...(o.pol || [-9, -9, 0, 0]))},
    uBack: {value: o.back ?? 1},
    uMaskA: {value: v4(...(o.maskA || [0, 0, 1, 1]))},
    uMask: {value: mask},
  });
}

// ------------------------------------------------------------ the markings, drawn as strokes (no fonts involved)
// A small stroked serif capital alphabet in a unit box (x 0..0.72, y 0..1, y up): enough for HARPERS FERRY 1807 and
// US. Struck letters on period locks are plain capitals; these are original strokes, not a traced typeface.
const GLYPH = {
  H: [[[0, 0], [0, 1]], [[0.62, 0], [0.62, 1]], [[0, 0.5], [0.62, 0.5]]],
  A: [[[0, 0], [0.33, 1], [0.66, 0]], [[0.13, 0.36], [0.53, 0.36]]],
  R: [[[0, 0], [0, 1], [0.42, 1], [0.56, 0.93], [0.6, 0.78], [0.56, 0.62], [0.42, 0.54], [0, 0.54]], [[0.3, 0.54], [0.62, 0]]],
  P: [[[0, 0], [0, 1], [0.42, 1], [0.56, 0.93], [0.6, 0.76], [0.56, 0.6], [0.42, 0.52], [0, 0.52]]],
  E: [[[0.58, 1], [0, 1], [0, 0], [0.6, 0]], [[0, 0.52], [0.44, 0.52]]],
  S: [[[0.58, 0.88], [0.46, 0.99], [0.24, 1], [0.08, 0.92], [0.04, 0.76], [0.14, 0.6], [0.46, 0.44], [0.58, 0.3], [0.55, 0.1], [0.38, 0], [0.16, 0.01], [0.02, 0.12]]],
  F: [[[0.58, 1], [0, 1], [0, 0]], [[0, 0.52], [0.42, 0.52]]],
  Y: [[[0, 1], [0.32, 0.5], [0.64, 1]], [[0.32, 0.5], [0.32, 0]]],
  U: [[[0, 1], [0, 0.28], [0.08, 0.07], [0.3, 0], [0.52, 0.07], [0.6, 0.28], [0.6, 1]]],
  1: [[[0.12, 0.8], [0.3, 1], [0.3, 0]], [[0.08, 0], [0.52, 0]]],
  8: [[[0.3, 0.54], [0.08, 0.66], [0.06, 0.86], [0.18, 0.98], [0.42, 0.98], [0.54, 0.86], [0.52, 0.66], [0.3, 0.54], [0.06, 0.4], [0.02, 0.18], [0.16, 0.02], [0.44, 0.02], [0.58, 0.18], [0.54, 0.4], [0.3, 0.54]]],
  0: [[[0.3, 1], [0.1, 0.9], [0.02, 0.62], [0.02, 0.38], [0.1, 0.1], [0.3, 0], [0.5, 0.1], [0.58, 0.38], [0.58, 0.62], [0.5, 0.9], [0.3, 1]]],
  7: [[[0.02, 1], [0.6, 1], [0.24, 0]]],
};
const ADV = {H: 0.86, A: 0.84, R: 0.8, P: 0.76, E: 0.76, S: 0.76, F: 0.72, Y: 0.8, U: 0.8, 1: 0.62, 8: 0.74, 0: 0.74, 7: 0.7};

/** draw `text` along a path: at(t) -> [x, y, angle] in canvas px, t = distance along the text in letter heights */
function strokeText(g, text, at, hpx, weight = 0.13) {
  let t = 0;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = hpx * weight;
  for (const ch of text) {
    const gl = GLYPH[ch];
    if (gl) {
      for (const stroke of gl) {
        g.beginPath();
        stroke.forEach(([gx, gy], i) => {
          const [x, y, a] = at(t + gx);
          // letter-local: along the baseline by gx, up by gy (canvas y runs down)
          const px = x + Math.sin(a) * gy * hpx;
          const py = y - Math.cos(a) * gy * hpx;
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        });
        g.stroke();
      }
      // serifs: short cross-strokes at the stroke ends that touch the baseline or the cap line
      for (const stroke of gl)
        for (const [gx, gy] of [stroke[0], stroke[stroke.length - 1]])
          if (gy < 0.02 || gy > 0.98) {
            const [x, y, a] = at(t + gx);
            const px = x + Math.sin(a) * gy * hpx;
            const py = y - Math.cos(a) * gy * hpx;
            const dx = Math.cos(a) * hpx * 0.1;
            const dy = Math.sin(a) * hpx * 0.1;
            g.beginPath();
            g.moveTo(px - dx, py - dy);
            g.lineTo(px + dx, py + dy);
            g.lineWidth = hpx * weight * 0.7;
            g.stroke();
            g.lineWidth = hpx * weight;
          }
    }
    t += ADV[ch] ?? 0.6;
  }
  return t;
}
const textLen = (text) => [...text].reduce((s, ch) => s + (ADV[ch] ?? 0.6), 0) - 0.14;

/**
 * The marks atlas (R = depth of the strike). Regions, in model units:
 *   plate  - the lock plate's outer face: HARPERS / FERRY / 1807 in vertical arcs behind the cock, and a spread-wing
 *            eagle with a shield on its breast, facing the cock, over "US", below the pan  [BON, JDJ, Morphy]
 *   barrel - the left flank of the breech: a raised eagle head over "P" in a sunken oval behind a raised "US" in a
 *            sunken oval [JDJ, Morphy, Poulin, BON]. The pair's serial number is deliberately left off.
 */
export const MARKS = {
  W: 2048,
  H: 1024,
  plate: {x0: -0.74, y0: -0.175, w: 0.92, h: 0.2, px: [0, 0, 2048, 445]},
  barrel: {x0: 0.2, a0: 0.25, w: 0.2, h: 1.05, px: [0, 445, 1024, 1024]},
};
function marksTexture() {
  const {W, H} = MARKS;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  // ---- plate region: x -> px, y -> py
  {
    const R = MARKS.plate;
    const [X0, Y0, X1, Y1] = R.px;
    const sx = (X1 - X0) / R.w;
    const sy = (Y1 - Y0) / R.h;
    const X = (x) => X0 + (x - R.x0) * sx;
    const Y = (y) => Y1 - (y - R.y0) * sy;
    // three vertical arcs behind the cock, reading upward, bowed gently toward the tail
    const hl = 0.0135; // letter height, model units
    const cols = [['HARPERS', -0.625, -0.088], ['FERRY', -0.6, -0.088], ['1807', -0.575, -0.088]];
    for (const [w, cx, cy] of cols) {
      const L = textLen(w) * hl;
      const rad = 0.24; // arc radius, model units; centre ahead of the column so it bows toward the tail
      const at = (t) => {
        const d = t * hl - L / 2; // distance along the column from its middle, upward
        const a = d / rad;
        const x = cx - rad * (1 - Math.cos(a));
        const y = cy + rad * Math.sin(a);
        // reading upward: the baseline direction is +y, so letters stand facing the tail (-x)
        const ang = -Math.PI / 2 - a;
        return [X(x), Y(y), ang];
      };
      strokeText(g, w, at, hl * sx, 0.14);
    }
    // the eagle: spread wings, shield on the breast, head turned toward the cock (-x), over "US"
    const ex = 0.06;
    const ey = -0.047;
    const k = 0.0011; // model units per eagle unit
    const E = (u, v) => [X(ex + u * k), Y(ey + v * k)];
    const path = (pts, close = false, fill = false) => {
      g.beginPath();
      pts.forEach(([u, v], i) => {
        const [x, y] = E(u, v);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      if (close) g.closePath();
      fill ? g.fill() : g.stroke();
    };
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // struck from a die: the silhouette sunk to half depth, the feathering and the shield cut deeper
    const half = '#8c8c8c';
    const wing = (sg) => [[sg * 3.5, 5], [sg * 9, 11], [sg * 17, 17.5], [sg * 26, 21.5], [sg * 24, 16], [sg * 27, 13.5], [sg * 22, 11], [sg * 25, 7.5], [sg * 19, 6.5], [sg * 21, 2.5], [sg * 14, 2.5], [sg * 15, -0.5], [sg * 8.5, 0], [sg * 3.5, -2.5]];
    const body = [[-4, 6], [-5.2, 0], [-4.2, -8], [-2, -12.5], [2, -12.5], [4.2, -8], [5.2, 0], [4, 6]];
    const tail = [[-2, -12], [-7.5, -20], [-3, -18.6], [0, -22.5], [3, -18.6], [7.5, -20], [2, -12]];
    const head = [[-2.2, 6], [-3, 10], [-6, 12.8], [-9.6, 12.2], [-11.8, 10.4], [-9.2, 10], [-6.6, 9.4], [-4.2, 7.4], [2.2, 6]];
    g.fillStyle = half;
    for (const shape of [wing(-1), wing(1), body, tail, head]) path(shape, true, true);
    g.strokeStyle = '#fff';
    g.lineWidth = 0.0011 * sx * 0.75;
    for (const sg of [-1, 1]) {
      for (let i = 0; i < 4; i++) path([[sg * (6 + i * 3.6), 3.5 + i * 2.6], [sg * (12 + i * 4.2), 7 + i * 3.4]]);
      path([[sg * 5, 7.2], [sg * 12, 12.4], [sg * 20, 18]]);
    }
    for (const u of [-3.5, 0, 3.5]) path([[u, -13.5], [u * 1.6, -19.5]]);
    path([[-7.4, 11.4], [-7.6, 11.6]]);
    // the shield on the breast: its border and pales
    g.lineWidth = 0.0011 * sx * 0.85;
    path([[-3.4, 3], [3.4, 3], [3.4, -3], [0, -7.5], [-3.4, -3], [-3.4, 3]], true);
    for (const u of [-1.7, 0, 1.7]) path([[u, 1.6], [u, -4.6]]);
    // US below
    const hu = 0.017;
    const L = textLen('US') * hu;
    strokeText(g, 'US', (t) => [X(ex - L / 2 + t * hu), Y(ey - 0.05), 0], hu * sx, 0.15);
  }
  // ---- barrel region: x (mirrored, read from the left side) -> px, angle up the flank -> py
  {
    const R = MARKS.barrel;
    const [X0, Y0, X1, Y1] = R.px;
    const sx = (X1 - X0) / R.w; // px per model unit along the barrel
    const sa = (Y1 - Y0) / R.h; // px per radian
    const rad = 0.1; // barrel radius here: model units per radian round the flank
    const X = (x) => X0 + (R.x0 - x) * sx;
    const Y = (a) => Y1 - (a - R.a0) * sa;
    const oval = (cx, ca, w, h) => {
      g.beginPath();
      g.ellipse(X(cx), Y(ca), (w / 2) * sx, (h / 2 / rad) * sa, 0, 0, Math.PI * 2);
      g.fill();
    };
    const ca = 0.78; // radians up the left flank: above the stock line
    // sunken ovals (full depth), raised devices inside (shallow)
    g.fillStyle = '#fff';
    oval(0.06, ca, 0.05, 0.032);
    oval(0.118, ca, 0.044, 0.026);
    g.fillStyle = '#3a3a3a';
    g.strokeStyle = '#3a3a3a';
    // eagle head (beak toward the breech, +x mirrored) over P
    const eh = (dx, dy) => [X(0.06 + dx), Y(ca + dy / rad)];
    g.beginPath();
    [[0.006, 0.006], [0.0, 0.009], [-0.007, 0.007], [-0.009, 0.002], [-0.004, 0.0], [0.004, 0.002], [0.008, 0.004]].forEach(([u, v], i) => {
      const [x, y] = eh(u, v);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.closePath();
    g.fill();
    // letters advance in canvas space (left to right as seen from the left side)
    const word = (w, cx, h) => {
      const L = textLen(w) * h * sx;
      strokeText(g, w, (t) => [X(cx) - L / 2 + t * h * sx, Y(ca - (h * 0.5) / rad), 0], h * sx, 0.2);
    };
    // the P sits under the head: shift its baseline down
    {
      const h = 0.0105;
      const L = textLen('P') * h * sx;
      strokeText(g, 'P', (t) => [X(0.06) - L / 2 + t * h * sx, Y(ca - 0.0125 / rad), 0], h * sx, 0.2);
    }
    word('US', 0.118, 0.011);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/**
 * The inlet mask, projected along z onto the stock's flats (R right, G left, B the inspector's cartouche on the
 * left): a thin dark seam exactly on each metal outline and a soft oil-darkened margin around it.
 * shapes: {right: [outline...], left: [outline...], both: [...], cartouche: {x, y, w, h, a}}
 */
export const MASK = {x0: -1.72, y0: -1.0, w: 3.08, h: 1.24, W: 2048, H: 832};
function maskTexture(shapes) {
  const {W, H} = MASK;
  const layer = (outlines, extra) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    const X = (x) => ((x - MASK.x0) / MASK.w) * W;
    const Y = (y) => H - ((y - MASK.y0) / MASK.h) * H;
    g.lineJoin = 'round';
    for (const o of outlines) {
      const trace = () => {
        g.beginPath();
        o.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
        g.closePath();
      };
      // soft margin: widening strokes of low weight, then the seam itself
      for (let i = 9; i >= 1; i--) {
        g.strokeStyle = `rgba(255,255,255,${0.05})`;
        g.lineWidth = i * 2.6;
        trace();
        g.stroke();
      }
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 1.7;
      trace();
      g.stroke();
    }
    extra?.(g, X, Y);
    return g.getImageData(0, 0, W, H).data;
  };
  const r = layer([...shapes.right, ...shapes.both]);
  const gch = layer([...shapes.left, ...shapes.both]);
  const b = layer([], (g, X, Y) => {
    // the inspector's cartouche on the left flat behind the side plate: worn to a trace (an oval rim, broken, and an
    // indistinct impression inside); the inspectors' initials varied and are not legible on most survivors
    const k = shapes.cartouche;
    g.save();
    g.translate(X(k.x), Y(k.y));
    g.rotate(-k.a);
    const sx = W / MASK.w;
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = 0.0022 * sx;
    for (const [a0, a1] of [[0.2, 1.7], [2.0, 3.0], [3.3, 4.6], [4.9, 6.0]]) {
      g.beginPath();
      g.ellipse(0, 0, (k.w / 2) * sx, (k.h / 2) * sx, 0, a0, a1);
      g.stroke();
    }
    // an indistinct impression where the initials were
    const u = k.w / 0.11;
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath();
    g.ellipse(-0.016 * u * sx, 0, 0.012 * u * sx, 0.016 * u * sx, 0, 0, Math.PI * 2);
    g.ellipse(0.017 * u * sx, 0.002 * u * sx, 0.011 * u * sx, 0.015 * u * sx, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  });
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = r[i * 4];
    data[i * 4 + 1] = gch[i * 4];
    data[i * 4 + 2] = b[i * 4];
    data[i * 4 + 3] = 255;
  }
  // canvas rows run top-down; flip so v = 0 is the bottom (y0)
  const flip = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) flip.set(data.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  const t = new THREE.DataTexture(flip, W, H, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/**
 * Every material the pistol uses, keyed by category. info: {Z1 (lock plate outer face), ROD_Y, mask shapes,
 * stock arcs {cap, band, pol: [s0, s1]}}.
 */
export function makeMaterials(info) {
  const marks = marksTexture();
  const mask = maskTexture(info.shapes);
  const mUV = (r) => [r.px[0] / MARKS.W, 1 - r.px[3] / MARKS.H, r.px[2] / MARKS.W, 1 - r.px[1] / MARKS.H];
  const P = MARKS.plate;
  const B = MARKS.barrel;
  const walnutTone = {a: '#5f4634', b: '#3c2b1f', p: '#2a1d14'};
  const M = {
    // aged walnut, oil finish: brown rather than orange, rings and pores, satin sheen
    walnut: wood({...walnutTone, ring: 34, pith: [-0.48, 0.21, 0.035, -0.02], wood: [0.24, 0.85, 0.15, 0], stock: [1, info.arcs.cap, info.arcs.band, 0], pol: [...info.arcs.pol, 0.16, 0], back: 0.42, rodY: info.ROD_Y, maskA: [MASK.x0, MASK.y0, 1 / MASK.w, 1 / MASK.h], rough: 0.6, clearcoat: 0.14}, mask),
    // the rammer: straighter, paler wood (hickory is recorded on one surviving rammer)
    rodwood: wood({a: '#7a634b', b: '#5d4936', p: '#3a2b1e', ring: 70, pith: [0.12, 0.05, 0, 0], wood: [0.25, 0.6, 0.05, 1], rodY: info.ROD_Y, rough: 0.55}, mask, false),
    // the barrel: a cleaned grey iron with a spotted patina, light pitting toward the breech and the muzzle, fine
    // lengthwise polishing scratches; the left flank of the breech carries its proof marks
    barrel: metal({color: '#858380', roughness: 0.5, metalness: 0.84, envMapIntensity: 0.44}, {tone: '#7a7164', mot: [17, 0.2, 0, 3.1], pit: [0.1, 380, 0.5], zone: [0.06, 0.3, 2.15, 2.42], scr: [0.55, 1, 0, 0], edge: 0, rv: 0.16, mark: {mode: 2, a: 0.09, b: 0, A: [B.x0, B.a0, -1 / B.w, 1 / B.h], UV: mUV(B)}}, marks),
    // other iron: breech plug and tang, key, trigger, ferrule, rib pipe
    iron: metal({color: '#807d78', roughness: 0.54, metalness: 0.84, envMapIntensity: 0.42}, {tone: '#746a5d', mot: [12, 0.32, 0, 5.3], pit: [0.18, 420, 0], scr: [0.35, 1, 0, 0], edge: 0.4, rv: 0.14}, marks),
    // the lock plate: grey toned toward brown, faint mottling of old case colour, the struck marks on its outer face
    plate: metal({color: '#95918a', roughness: 0.48, metalness: 0.9, envMapIntensity: 0.6}, {tone: '#6c665e', mot: [10, 0.36, 0, 8.2], pit: [0.1, 450, 0], scr: [0.4, 1, 0.15, 0], edge: 0.7, rv: 0.16, back: 0.5, mark: {mode: 1, a: info.Z1, b: 1, A: [P.x0, P.y0, 1 / P.w, 1 / P.h], UV: mUV(P)}}, marks),
    // the integral pan and fence, and the frizzen: a medium brown patina
    pan: metal({color: '#7f786e', roughness: 0.5, metalness: 0.9, envMapIntensity: 0.55}, {tone: '#5f4e3e', mot: [13, 0.45, 0, 2.4], pit: [0.2, 460, 0], scr: [0.25, 1, 0, 0], edge: 0.6, rv: 0.14}, marks),
    frizzen: metal({color: '#7c7468', roughness: 0.46, metalness: 0.92, envMapIntensity: 0.58}, {tone: '#5a4838', mot: [13, 0.5, 0, 6.6], pit: [0.18, 460, 0], scr: [0.3, 0, 1, 0], edge: 0.8, rv: 0.14}, marks),
    // the cock and its jaws: darker forged steel, edges rubbed bright
    cock: metal({color: '#85837f', roughness: 0.42, metalness: 0.92, envMapIntensity: 0.62}, {tone: '#5f5952', mot: [12, 0.5, 0, 9.9], pit: [0.12, 480, 0], scr: [0.3, 0, 1, 0], edge: 0.9, rv: 0.12}, marks),
    // springs: tempered, a shade darker and browner
    spring: metal({color: '#7e7568', roughness: 0.4, metalness: 0.9, envMapIntensity: 0.62}, {tone: '#5e5040', mot: [16, 0.45, 0, 1.1], pit: [0.05, 500, 0], scr: [0.3, 1, 0, 0], edge: 0.3, rv: 0.1}, marks),
    // screws, pins and the lock's internal parts: dark steel
    dark: metal({color: '#6c6a67', roughness: 0.46, metalness: 0.9, envMapIntensity: 0.6}, {tone: '#5a524a', mot: [14, 0.4, 0, 4.4], pit: [0.08, 520, 0], scr: [0.25, 1, 0, 0], edge: 0.5, rv: 0.1}, marks),
    // brass: a mellow mustard patina, darker tarnish in patches, never bright yellow
    brass: metal({color: '#a3875a', roughness: 0.42, metalness: 0.95, envMapIntensity: 0.68}, {tone: '#6c5c41', mot: [8, 0.42, 0, 7.7], pit: [0.06, 400, 0], scr: [0.3, 0, 1, 0], edge: 0.35, rv: 0.14}, marks),
    side: metal({color: '#a3875a', roughness: 0.44, metalness: 0.95, envMapIntensity: 0.68}, {tone: '#6c5c41', mot: [8, 0.42, 0, 1.9], pit: [0.06, 400, 0], scr: [0.35, 1, 0, 0], edge: 0.7, rv: 0.14, back: 0.5}, marks),
    flint: new THREE.MeshPhysicalMaterial({color: '#3f3a34', roughness: 0.3, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3}),
    leather: new THREE.MeshStandardMaterial({color: '#4e3523', roughness: 0.88, metalness: 0}),
    hole: new THREE.MeshStandardMaterial({color: '#171513', roughness: 0.85, metalness: 0.2}),
  };
  return M;
}
