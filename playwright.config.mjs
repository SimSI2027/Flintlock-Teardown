// Playwright: the live page and the film, opened from the production build in dist/ (npm run build first).
import {defineConfig} from '@playwright/test';
import {CHROMIUM_ARGS} from './scripts/paths.mjs';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: {timeout: 20_000},
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  outputDir: 'test-results',
  use: {
    viewport: {width: 1600, height: 900},
    launchOptions: {args: CHROMIUM_ARGS},
    trace: 'retain-on-failure',
  },
});
