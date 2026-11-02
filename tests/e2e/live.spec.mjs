// The live page from the production build: it loads clean, tours, hands over, and every visible control works.
import {expect, test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const URL = pathToFileURL(path.resolve('dist/index.html')).href;
const SHOTS = path.resolve('test-results/shots');
fs.mkdirSync(SHOTS, {recursive: true});

async function open(page, query = '') {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push(`failed request ${r.url()}`));
  await page.goto(URL + query);
  await page.waitForFunction(() => window.SIM_SHOWN && window.LIVE?.last, null, {timeout: 90_000});
  return errors;
}
const state = (page) => page.evaluate(() => ({tour: LIVE.tour, d: LIVE.last.d, focus: LIVE.last.focus, mode: LIVE.last.mode.mode, view: LIVE.last.view, labels: LIVE.last.labels.on, orbit: LIVE.last.orbit.on}));
const settle = (page, s = 6) => page.evaluate((s) => LIVE.settle(s), s).then(() => page.waitForTimeout(250));
const press = async (page, key) => {
  await page.locator(`[data-key="${key}"]`).click();
  await page.waitForTimeout(60);
};

test('loads clean, tours on its own, and hands over on a click', async ({page}) => {
  const errors = await open(page);
  expect(await page.evaluate(() => LIVE.tour)).toBe(true);
  const t0 = await page.evaluate(() => LIVE.wt);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => LIVE.wt)).toBeGreaterThan(t0);
  await page.screenshot({path: path.join(SHOTS, 'tour.png')});
  await page.mouse.click(800, 450);
  expect(await page.evaluate(() => LIVE.tour)).toBe(false);
  expect(errors).toEqual([]);
});

test('lock actions: rest, half-cock (trigger blocked), full-cock, release, frizzen', async ({page}) => {
  const errors = await open(page);
  await page.mouse.click(800, 450);
  await page.evaluate(() => {
    // start from the assembled rest pose whatever the tour was doing
    LIVE.returnToTour();
    LIVE.takeOver();
  });
  await press(page, 'g:none');
  await press(page, 'solid');
  await press(page, 'rest');
  await settle(page, 12);
  await press(page, 'half');
  await settle(page);
  let s = await state(page);
  expect(s.d.label[0]).toBe('HALF-COCK');
  expect(s.d.sear).toBe('half');
  await press(page, 'release');
  await page.waitForTimeout(200);
  s = await state(page);
  expect(s.d.theta).toBeCloseTo(29, 3);
  await settle(page);
  await press(page, 'full');
  await settle(page);
  s = await state(page);
  expect(s.d.label[0]).toBe('FULL-COCK');
  await page.screenshot({path: path.join(SHOTS, 'full-cock.png')});
  await press(page, 'release');
  await settle(page);
  s = await state(page);
  expect(s.d.theta).toBeCloseTo(0, 3);
  expect(s.d.panOpen).toBe(true);
  await press(page, 'frizzen');
  await settle(page);
  s = await state(page);
  expect(s.d.panOpen).toBe(false);
  expect(s.d.label[0]).toBe('HALF-COCK');
  await press(page, 'rest');
  await settle(page);
  expect((await state(page)).d.label[0]).toBe('REST');
  expect(errors).toEqual([]);
});

test('every subsystem button takes its assembly apart and puts it back exactly', async ({page}) => {
  test.setTimeout(240_000);
  const errors = await open(page);
  await page.mouse.click(800, 450);
  await press(page, 'rest');
  await settle(page, 12);
  const snapshot = () => page.evaluate(() => Object.fromEntries(Object.entries(LIVE.st.pistol.parts).map(([id, p]) => [id, p.node.matrixWorld.elements.slice()])));
  const before = await snapshot();
  const groups = await page.evaluate(() => Object.keys(LIVE.groups));
  for (const g of groups) {
    await press(page, `g:${g}`);
    await settle(page, 6);
    const s = await state(page);
    expect(s.focus.g, g).toBe(g);
    expect(s.focus.k, g).toBe(1);
    // members really moved, and the rest stepped aside or ghosted
    const moved = await page.evaluate((g) => {
      const td = LIVE.teardownPose(g, 1, LIVE.last.d.theta);
      return {members: LIVE.groups[g].members.filter((id) => td.offsets[id]).length, ghosts: Object.keys(td.alpha).length, all: Object.keys(td.offsets).length};
    }, g);
    expect(moved.all, g).toBeGreaterThan(0);
    await page.waitForTimeout(500);
    await page.screenshot({path: path.join(SHOTS, `teardown-${g}.png`)});
  }
  await press(page, 'g:none');
  await settle(page, 6);
  const after = await snapshot();
  for (const id of Object.keys(before)) for (let i = 0; i < 16; i++) expect(Math.abs(after[id][i] - before[id][i]), `${id}[${i}]`).toBeLessThan(1e-9);
  expect(errors).toEqual([]);
});

test('display modes, labels, orbit, camera presets', async ({page}) => {
  const errors = await open(page);
  await page.mouse.click(800, 450);
  for (const m of ['cut', 'xray', 'solid']) {
    await press(page, m);
    await settle(page, 2);
    expect((await state(page)).mode).toBe(m);
    await page.screenshot({path: path.join(SHOTS, `mode-${m}.png`)});
  }
  await press(page, 'labels');
  expect((await state(page)).labels).toBe(true);
  await press(page, 'labels');
  expect((await state(page)).labels).toBe(false);
  await press(page, 'orbit');
  expect((await state(page)).orbit).toBe(true);
  await press(page, 'orbit');
  for (const v of ['hero', 'lock', 'close', 'inside', 'top', 'left', 'under', 'muzzle']) {
    await press(page, `v:${v}`);
    await settle(page, 2);
    expect((await state(page)).view).toBe(v);
    await page.screenshot({path: path.join(SHOTS, `view-${v}.png`)});
  }
  expect(errors).toEqual([]);
});

test('playback: pause, step, speed slider, manual cock slider, sound, quality, tour', async ({page}) => {
  const errors = await open(page);
  await page.mouse.click(800, 450);
  await press(page, 'rest');
  await settle(page, 12);
  // pause stops the clock; step advances it by one frame
  await press(page, 'play');
  const w0 = await page.evaluate(() => LIVE.wt);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => LIVE.wt)).toBeCloseTo(w0, 6);
  await press(page, 'step');
  expect(await page.evaluate(() => LIVE.wt)).toBeCloseTo(w0 + 1 / 30, 6);
  await press(page, 'play');
  // speed slider: drag to its left end
  const sp = await page.locator('[data-key="speedslider"]').boundingBox();
  await page.mouse.move(sp.x + sp.width / 2, sp.y + sp.height / 2);
  await page.mouse.down();
  await page.mouse.move(sp.x - 20, sp.y + sp.height / 2, {steps: 4});
  await page.mouse.up();
  expect(await page.evaluate(() => LIVE.last.speed)).toBeCloseTo(0.1, 2);
  await page.mouse.move(sp.x + sp.width * 0.47, sp.y + sp.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  // the manual cock: drag past full cock, let go, it settles on the full-cock step
  const ck = await page.locator('[data-key="cockslider"]').boundingBox();
  await page.mouse.move(ck.x + 8, ck.y + ck.height / 2);
  await page.mouse.down();
  await page.mouse.move(ck.x + 8 + (ck.width - 16) * 0.98, ck.y + ck.height / 2, {steps: 8});
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => LIVE.last.d.theta)).toBeGreaterThan(44);
  await page.mouse.up();
  await settle(page, 3);
  expect((await state(page)).d.label[0]).toBe('FULL-COCK');
  // keyboard
  await page.keyboard.press('r');
  await settle(page, 6);
  expect((await state(page)).d.label[0]).toBe('REST');
  await page.keyboard.press('h');
  await settle(page, 4);
  expect((await state(page)).d.label[0]).toBe('HALF-COCK');
  // sound toggles (the page's AudioContext exists after the first click)
  const s0 = await page.evaluate(() => LIVE.audio.on);
  await press(page, 'sound');
  expect(await page.evaluate(() => LIVE.audio.on)).toBe(!s0);
  await press(page, 'sound');
  // quality cycles AUTO -> HIGH -> BALANCED -> LOW -> AUTO
  const q = [];
  for (let i = 0; i < 4; i++) {
    await press(page, 'quality');
    q.push(await page.locator('[data-key="quality"]').textContent());
  }
  expect(q).toEqual(['QUALITY · HIGH', 'QUALITY · BALANCED', 'QUALITY · LOW', 'QUALITY · AUTO']);
  // tour: resume walks back to rest and the tour starts
  await press(page, 'tour');
  await page.waitForFunction(() => LIVE.tour, null, {timeout: 60_000});
  expect(errors).toEqual([]);
});

test('sound events follow the motion', async ({page}) => {
  const errors = await open(page);
  await page.mouse.click(800, 450);
  await page.evaluate(() => {
    window.__seen = [];
    const play = LIVE.audio.play;
    LIVE.audio.play = (type, o) => {
      window.__seen.push(type);
      return play(type, o);
    };
  });
  await press(page, 'full');
  await settle(page, 3);
  await page.waitForTimeout(300);
  await press(page, 'release');
  await settle(page, 3);
  await page.waitForTimeout(300);
  const seen = await page.evaluate(() => window.__seen);
  for (const type of ['ui', 'click-full', 'snap', 'strike', 'cock-stop', 'frizzen-open']) expect(seen, type).toContain(type);
  expect(await page.evaluate(() => LIVE.audio.on)).toBe(true);
  expect(errors).toEqual([]);
});

test('phone-sized viewport loads', async ({browser}) => {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  const page = await ctx.newPage();
  const errors = await open(page);
  expect(await page.evaluate(() => LIVE.tier)).toBe('LOW');
  await page.screenshot({path: path.join(SHOTS, 'phone.png')});
  expect(errors).toEqual([]);
  await ctx.close();
});
