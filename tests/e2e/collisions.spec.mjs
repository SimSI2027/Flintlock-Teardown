// Collision inspection: the lock through its tour motion, and every subsystem teardown from assembled to apart.
// Surfaces are sampled into a voxel grid (src/shared/inspect.js). A pair may only touch where it touched when
// assembled, and once apart must not meet again; parts carried rigidly together and parts running along holes,
// slots or the mortise (not modelled as cavities) are exempt (src/shared/live.js, PASSAGE).
import {expect, test} from '@playwright/test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const URL = pathToFileURL(path.resolve('dist/index.html')).href + '?quality=low';
const CI = !!process.env.CI;
const GROUPS = ['lock', 'cock', 'frizzen', 'internals', 'springs', 'trigger', 'barrel', 'stock', 'furniture', 'ramrod', 'screws', 'all'];
// the lock's working contacts, allowed as it moves
const WORKING = ['flint|frizzen', 'sear|tumbler', 'sear|trigger', 'mainspring|swivel', 'sear|searspring', 'frizspring|frizzen', 'mainspring|tumbler'];

test.describe.configure({timeout: CI ? 600_000 : 180_000});
let page;
test.beforeAll(async ({browser}) => {
  page = await browser.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => window.SIM_SHOWN && window.LIVE, null, {timeout: 90_000});
  await page.evaluate(() => {
    LIVE.takeOver();
    LIVE.hold = true;
  });
});
test.afterAll(() => page.close());

test('the lock moves without collisions through the tour\'s lock sequence', async () => {
  const r = await page.evaluate((CI) => LIVE.mechSweep({from: 0, to: 20, step: CI ? 0.1 : 0.05}), CI);
  const extra = Object.keys(r.extra).filter((pk) => !WORKING.includes(pk));
  expect(extra, JSON.stringify(r.extra)).toEqual([]);
});

for (const g of GROUPS)
  test(`teardown "${g}" separates without collisions, at rest and at full cock`, async () => {
    for (const theta of [20.9, 44]) {
      const r = await page.evaluate(({g, theta, CI}) => LIVE.sweep(g, {theta, steps: CI ? 16 : 24}), {g, theta, CI});
      expect(r.violations, `${g} @ ${theta}: ${JSON.stringify(r.violations.slice(0, 8))}`).toEqual([]);
    }
  });
