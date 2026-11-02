#!/usr/bin/env node
// Exterior close-ups and render statistics from the production build, with fixed cameras so a before and an after
// set line up shot for shot. The console is hidden; the pistol is posed assembled at rest, solid.
//   node scripts/closeups.mjs --out out/closeups/after [--size 1600x900] [--dpr 1] [--quality high] [--headed] [--dist dir]
//   node scripts/closeups.mjs --compare out/closeups/before out/closeups/after --out out/closeups/compare
// Writes one PNG per shot, views-*.png (the full live page at every camera preset) and stats.json (triangles, draw
// calls, geometries, textures, GPU frame time per quality tier).
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CHROMIUM_ARGS, DIST, ROOT} from './paths.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const has = (k) => args.includes(`--${k}`);
const D = Math.PI / 180;

// [name, target x, y, z, azimuth deg, elevation deg, distance]; az 0 looks at the lock side, 180 at the side plate
export const SHOTS = [
  ['hero', null],
  ['right-full', 0.36, -0.28, 0, 0, 4, 9.6],
  ['left-full', 0.36, -0.28, 0, 180, 4, 9.6],
  ['lock-plate', -0.28, -0.06, 0.13, 4, 6, 3.0],
  ['cock-frizzen', -0.04, 0.07, 0.15, 28, 12, 2.0],
  ['pan', 0.12, 0.03, 0.14, 38, 30, 1.25],
  ['barrel-breech', 0.04, 0.05, 0, -135, 28, 1.8],
  ['trigger-guard', -0.62, -0.42, 0, 12, -14, 2.5],
  ['butt-cap', -1.46, -0.72, 0, 32, -6, 2.3],
  ['stock-wrist', -0.92, -0.24, 0, 14, 14, 2.6],
  ['ramrod-pipes', 1.6, -0.12, 0, 12, -14, 3.4],
  ['muzzle', 2.36, -0.04, 0, 62, 10, 1.5],
  ['marks-tail', -0.6, -0.088, 0.13, 0, 0, 0.62],
  ['marks-eagle', 0.06, -0.06, 0.13, 0, 0, 0.55],
  ['marks-barrel', 0.09, 0.075, -0.07, -128, 36, 0.62],
];
const VIEWS = ['hero', 'lock', 'close', 'inside', 'top', 'left', 'under', 'muzzle', 'pan', 'trigger', 'butt', 'breech', 'ramrod'];

async function capture() {
  const out = path.resolve(opt('out', 'out/closeups/now'));
  fs.mkdirSync(out, {recursive: true});
  const [w, h] = opt('size', '1600x900').split('x').map(Number);
  const dpr = +opt('dpr', '1');
  const quality = opt('quality', 'high');
  // --gpu swiftshader: a CPU renderer, a stand-in for a weak integrated GPU when comparing frame cost
  const soft = opt('gpu', '') === 'swiftshader';
  const b = await chromium.launch({headless: !has('headed'), args: soft ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'] : CHROMIUM_ARGS});
  const ctx = await b.newContext({viewport: {width: w, height: h}, deviceScaleFactor: dpr});
  const p = await ctx.newPage();
  const problems = [];
  p.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  p.on('pageerror', (e) => problems.push(`page: ${e.message}`));
  p.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
  await p.goto(pathToFileURL(path.join(path.resolve(opt('dist', DIST)), 'index.html')).href + `?quality=${quality}&sound=off`);
  await p.waitForFunction(() => window.SIM_SHOWN && window.LIVE?.last, null, {timeout: 90_000});
  const gpu = await p.evaluate(() => {
    const gl = LIVE.st.renderer.getContext();
    const x = gl.getExtension('WEBGL_debug_renderer_info');
    return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  // assembled, at rest, solid, hero
  await p.mouse.click(w / 2, h / 2);
  await p.evaluate(() => {
    LIVE.takeOver();
    LIVE.returnToTour();
    LIVE.takeOver();
  });
  for (const k of ['g:none', 'solid', 'rest', 'v:hero']) await p.locator(`[data-key="${k}"]`).click();
  await p.evaluate(() => LIVE.settle(14));
  await p.waitForTimeout(600);
  // the full live page at every camera preset
  if (!has('no-views') && !has('perf-only'))
    for (const v of VIEWS) {
      if (!(await p.locator(`[data-key="v:${v}"]`).count())) continue;
      await p.locator(`[data-key="v:${v}"]`).click();
      await p.evaluate(() => LIVE.settle(3));
      await p.mouse.move(5, 5);
      await p.waitForTimeout(450);
      await p.screenshot({path: path.join(out, `view-${v}.png`)});
    }
  await p.locator('[data-key="v:hero"]').click();
  await p.evaluate(() => LIVE.settle(3));
  await p.waitForTimeout(400);
  // close-ups: the console hidden, the stage drawn from a fixed camera
  await p.evaluate(() => {
    LIVE.hold = true;
    document.querySelector('.ui').style.display = 'none';
  });
  const stats = {gpu, size: `${w}x${h}@${dpr}`, quality, shots: {}};
  for (const [name, ...c] of has('perf-only') ? SHOTS.slice(0, 1) : SHOTS) {
    const r = await p.evaluate(
      ({c, D}) => {
        const s = LIVE.state();
        const cam = c[0] === null ? {...LIVE.last.cam, az: LIVE.last.cam.az * D, el: LIVE.last.cam.el * D} : {tx: c[0], ty: c[1], tz: c[2], az: c[3] * D, el: c[4] * D, d: c[5]};
        const info = LIVE.st.renderer.info;
        info.autoReset = false;
        info.reset();
        LIVE.st.frame({d: s.d, offsets: {}, alpha: {}, xray: 0, cut: 0, hot: new Set(), cam});
        const r = {calls: info.render.calls, triangles: info.render.triangles};
        info.autoReset = true;
        return r;
      },
      {c, D},
    );
    stats.shots[name] = r;
    if (has('perf-only')) continue;
    await p.waitForTimeout(120);
    await p.screenshot({path: path.join(out, `${name}.png`)});
  }
  // scene totals and GPU frame time per tier at the hero camera (each frame waits for the GPU with a 1-pixel read)
  stats.scene = await p.evaluate(() => {
    let tri = 0;
    let meshes = 0;
    const geos = new Set();
    LIVE.st.pistol.root.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      geos.add(o.geometry);
      const g = o.geometry;
      tri += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    });
    let bytes = 0;
    for (const g of geos) for (const a of Object.values(g.attributes)) bytes += a.array.byteLength;
    for (const g of geos) if (g.index) bytes += g.index.array.byteLength;
    const info = LIVE.st.renderer.info;
    return {meshes, triangles: Math.round(tri), uniqueGeometries: geos.size, geometryMB: +(bytes / 1048576).toFixed(2), gpuGeometries: info.memory.geometries, gpuTextures: info.memory.textures, programs: info.programs?.length};
  });
  stats.frameMs = {};
  for (const tier of ['high', 'balanced', 'low']) {
    // cycle the quality button until it reads the tier
    for (let i = 0; i < 5; i++) {
      const t = (await p.locator('[data-key="quality"]').textContent()).split(' · ')[1];
      if (t === tier.toUpperCase()) break;
      await p.evaluate(() => document.querySelector('[data-key="quality"]').click());
    }
    // GPU time per frame from WebGL timer queries (falls back to wall time with a 1-pixel read when unavailable)
    for (const [label, shot] of [['hero', null], ['close', SHOTS.find((x) => x[0] === 'cock-frizzen')]])
    stats.frameMs[`${tier}-${label}`] = await p.evaluate(async ([D, N, c0]) => {
      const s = LIVE.state();
      const c = c0 ? {tx: c0[1], ty: c0[2], tz: c0[3], az: c0[4], el: c0[5], d: c0[6]} : LIVE.last.cam;
      const cam = {...c, az: c.az * D, el: c.el * D};
      const gl = LIVE.st.renderer.getContext();
      const go = () => LIVE.st.frame({d: s.d, offsets: {}, alpha: {}, xray: 0, cut: 0, hot: new Set(), cam});
      const px = new Uint8Array(4);
      for (let i = 0; i < 12; i++) go();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      const med = (a) => (a.sort((x, y) => x - y), +a[Math.floor(a.length / 2)].toFixed(3));
      const size = `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`;
      if (!ext) {
        const ts = [];
        for (let i = 0; i < N; i++) {
          const t0 = performance.now();
          go();
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          ts.push(performance.now() - t0);
        }
        return {wallMs: med(ts), size};
      }
      const qs = [];
      for (let i = 0; i < N; i++) {
        const q = gl.createQuery();
        gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
        go();
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        qs.push(q);
        await new Promise((r) => requestAnimationFrame(r));
      }
      const res = [];
      for (const q of qs) {
        let n = 0;
        while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) && n++ < 400) await new Promise((r) => setTimeout(r, 5));
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) res.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(q);
      }
      return {gpuMs: res.length ? med(res) : null, size};
    }, [D, soft ? 4 : 40, shot]);
  }
  stats.jsHeapMB = await p.evaluate(() => (performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null));
  stats.problems = problems;
  fs.writeFileSync(path.join(out, 'stats.json'), JSON.stringify(stats, null, 1));
  console.log(JSON.stringify({out: path.relative(ROOT, out), gpu, scene: stats.scene, frameMs: stats.frameMs, problems}, null, 1));
  await b.close();
}

// side-by-side sheets: before | after for every shot, with a caption strip
async function compare() {
  const i = args.indexOf('--compare');
  const [A, B] = [path.resolve(args[i + 1]), path.resolve(args[i + 2])];
  const out = path.resolve(opt('out', 'out/closeups/compare'));
  fs.mkdirSync(out, {recursive: true});
  const b = await chromium.launch({args: CHROMIUM_ARGS});
  const p = await b.newPage({viewport: {width: 1600, height: 500}});
  const names = [...SHOTS.map((s) => s[0]), ...VIEWS.map((v) => `view-${v}`)].filter((n) => fs.existsSync(path.join(A, `${n}.png`)) && fs.existsSync(path.join(B, `${n}.png`)));
  const uri = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
  for (const n of names) {
    await p.setContent(`<body style="margin:0;background:#26221d;font:600 15px/1 'Segoe UI',sans-serif;color:#efe8dc">
      <div style="display:flex;gap:6px;padding:6px">${[['BEFORE', A], ['AFTER', B]].map(([t, d]) => `<div style="flex:1"><div style="padding:6px 2px 8px;letter-spacing:2px">${t} · ${n.toUpperCase()}</div><img src="${uri(path.join(d, `${n}.png`))}" style="width:100%;display:block"></div>`).join('')}</div></body>`);
    await p.waitForFunction(() => [...document.images].every((im) => im.complete));
    const hgt = await p.evaluate(() => document.body.scrollHeight);
    await p.setViewportSize({width: 1600, height: hgt});
    await p.screenshot({path: path.join(out, `${n}.png`), fullPage: true});
    await p.setViewportSize({width: 1600, height: 500});
  }
  await b.close();
  console.log(`${names.length} comparisons → ${path.relative(ROOT, out)}`);
}

if (has('compare')) await compare();
else await capture();
