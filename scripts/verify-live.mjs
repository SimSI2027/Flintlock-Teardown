#!/usr/bin/env node
// Checks the public GitHub Pages demo: loads clean (no console errors, no failed requests), serves the latest commit,
// tours, hands over, and takes a subsystem apart.   node scripts/verify-live.mjs [url] [expected-commit]
import {chromium} from '@playwright/test';
import {CHROMIUM_ARGS} from './paths.mjs';

const url = process.argv[2] || 'https://simsi2027.github.io/Flintlock-Teardown/';
const want = process.argv[3];
const b = await chromium.launch({args: CHROMIUM_ARGS});
const p = await b.newPage({viewport: {width: 1600, height: 900}});
const problems = [];
p.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
p.on('pageerror', (e) => problems.push(`page: ${e.message}`));
p.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
p.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));
await p.goto(url, {waitUntil: 'load'});
await p.waitForFunction(() => window.SIM_SHOWN && window.LIVE?.last, null, {timeout: 90_000});
const commit = await p.getAttribute('meta[name="commit"]', 'content');
const tour = await p.evaluate(() => LIVE.tour);
await p.waitForTimeout(1500);
await p.mouse.click(800, 450);
await p.click('[data-key="g:internals"]');
await p.evaluate(() => LIVE.settle(5));
await p.waitForTimeout(800);
const s = await p.evaluate(() => ({focus: LIVE.state().focus.g, k: LIVE.state().focus.k, tour: LIVE.tour}));
await p.screenshot({path: 'out/live-pages.png'});
for (const f of ['film.html', 'poster.jpg', 'version.json']) {
  const r = await p.request.get(new URL(f, url).href);
  if (!r.ok()) problems.push(`HTTP ${r.status()}: ${f}`);
}
await b.close();
console.log(JSON.stringify({url, commit, tourOnLoad: tour, afterClick: s, problems}, null, 1));
if (problems.length || !tour || s.focus !== 'internals' || s.k !== 1 || (want && !want.startsWith(commit))) process.exit(1);
