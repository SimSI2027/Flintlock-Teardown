#!/usr/bin/env node
// Assembles the static site for GitHub Pages in site/: the live page as index.html, the film page, the poster and a
// version file. All links are relative, so it works under /Flintlock-Teardown/.
import fs from 'node:fs';
import path from 'node:path';
import {DIST, ROOT} from './paths.mjs';

const SITE = path.join(ROOT, 'site');
fs.rmSync(SITE, {recursive: true, force: true});
fs.mkdirSync(SITE, {recursive: true});
for (const f of ['index.html', 'film.html']) fs.copyFileSync(path.join(DIST, f), path.join(SITE, f));
for (const f of ['poster.jpg', 'contact-sheet.jpg']) {
  const src = path.join(ROOT, 'media', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(SITE, f));
}
const sha = process.env.GITHUB_SHA || 'local';
fs.writeFileSync(path.join(SITE, 'version.json'), JSON.stringify({commit: sha, built: new Date().toISOString()}, null, 1));
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');
fs.writeFileSync(path.join(SITE, '404.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./"><title>Model 1805 Flintlock Teardown</title><a href="./">Model 1805 Flintlock Teardown</a>');
console.log(`site/: ${fs.readdirSync(SITE).join(', ')}`);
