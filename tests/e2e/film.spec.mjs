// The film page: frames are a pure function of time (deterministic capture). The 3D frame is read back from WebGL and
// compared pixel by pixel (a GPU may differ by a single level on a stray pixel; nothing more is allowed), and the
// console's text must match exactly.
import {expect, test} from '@playwright/test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const URL = pathToFileURL(path.resolve('dist/film.html')).href;

test('film frames are deterministic: the same t gives the same picture', async ({page}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => {
    window.__CAPTURE = true;
  });
  await page.goto(URL);
  await page.waitForFunction(() => window.SIM && window.SIM.ready, null, {timeout: 90_000});
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    window.__grab = (t) => {
      window.SIM.render(t);
      const gl = document.getElementById('gl');
      const c = document.createElement('canvas');
      c.width = gl.width;
      c.height = gl.height;
      const g = c.getContext('2d');
      g.drawImage(gl, 0, 0);
      return {px: g.getImageData(0, 0, c.width, c.height).data, text: document.querySelector('.ui').innerText};
    };
    window.__frames = {};
    window.__diff = (a, b) => {
      const A = window.__frames[a].px;
      const B = window.__frames[b].px;
      let n = 0;
      let max = 0;
      for (let i = 0; i < A.length; i++) {
        const d = Math.abs(A[i] - B[i]);
        if (d) n++;
        if (d > max) max = d;
      }
      return {n, max, sameText: window.__frames[a].text === window.__frames[b].text};
    };
  });
  const grab = (key, t) => page.evaluate(([k, t]) => void (window.__frames[k] = window.__grab(t)), [key, t]);
  await grab('a', 12.3);
  await grab('b', 47.1);
  await grab('c', 12.3);
  await grab('d', 5.95);
  await grab('e', 80);
  await grab('f', 5.95);
  for (const [x, y] of [['a', 'c'], ['d', 'f']]) {
    const r = await page.evaluate(([x, y]) => window.__diff(x, y), [x, y]);
    expect(r.sameText, `${x} vs ${y}: console text`).toBe(true);
    expect(r.max, `${x} vs ${y}: max channel difference`).toBeLessThanOrEqual(1);
    expect(r.n, `${x} vs ${y}: differing channels`).toBeLessThan(64);
  }
  const ab = await page.evaluate(() => window.__diff('a', 'b'));
  expect(ab.n).toBeGreaterThan(10000);
  expect(await page.evaluate(() => window.SIM.duration)).toBe(89);
  expect(errors).toEqual([]);
});
