#!/usr/bin/env node
// Bundles each entry (src/live, src/film) into one self-contained HTML page in dist/: three.js, fonts and CSS inlined,
// relative links only, so the pages work from file://, from a static host and under /Flintlock-Teardown/ on GitHub Pages.
// Adapted from the teardown kit's sims/build.mjs (whaleyxbt/claude-motion, MIT).
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import {DIST, ROOT} from './paths.mjs';

fs.mkdirSync(DIST, {recursive: true});
const NM = path.join(ROOT, 'node_modules');
const b64 = (f) => fs.readFileSync(path.join(NM, f)).toString('base64');
const face = (fam, w, file, style = 'normal') => `@font-face{font-family:'${fam}';font-weight:${w};font-style:${style};font-display:block;src:url(data:font/woff2;base64,${b64(file)}) format('woff2');}`;
const FONTS = [
  ...[400, 600, 700].map((w) => face('JetBrains Mono', w, `@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${w}-normal.woff2`)),
  face('Inter', '100 900', '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
  face('EB Garamond', 500, '@fontsource/eb-garamond/files/eb-garamond-latin-500-normal.woff2'),
  face('EB Garamond', 500, '@fontsource/eb-garamond/files/eb-garamond-latin-500-italic.woff2', 'italic'),
].join('\n');
const KIT_CSS = fs.readFileSync(path.join(ROOT, 'src/kit/style.css'), 'utf8');
const META = {
  live: {file: 'index.html', title: 'Model 1805 Flintlock Teardown', desc: 'Interactive 3D teardown of a U.S. Model 1805 (Harpers Ferry) flintlock pistol: lock states, cutaway, x-ray and exploded subsystems. A historical visual study; non-functional.'},
  film: {file: 'film.html', title: 'Model 1805 Flintlock Teardown (film)', desc: 'Deterministic cinematic tour of the Model 1805 flintlock teardown, rendered frame by frame.'},
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(META);
const commit = process.env.GITHUB_SHA || (() => {
  try {
    return fs.readFileSync(path.join(ROOT, '.git', fs.readFileSync(path.join(ROOT, '.git/HEAD'), 'utf8').trim().replace('ref: ', '')), 'utf8').trim();
  } catch {
    return 'dev';
  }
})();
for (const name of names) {
  const t0 = Date.now();
  const res = await esbuild.build({
    entryPoints: [path.join(ROOT, 'src', name, 'main.js')],
    bundle: true,
    format: 'esm',
    minify: !process.env.SIMS_DEBUG,
    write: false,
    target: 'es2022',
    legalComments: 'none',
    define: {__COMMIT__: JSON.stringify(commit.slice(0, 7))},
    logLevel: 'warning',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/g, '<\/script');
  const m = META[name];
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${m.title}</title>
<meta name="description" content="${m.desc}">
<meta property="og:title" content="${m.title}">
<meta property="og:description" content="${m.desc}">
<meta property="og:image" content="https://simsi2027.github.io/Flintlock-Teardown/poster.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="commit" content="${commit.slice(0, 7)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23c4471c'/%3E%3Cpath d='M7 20h14l4-6h-6l-2 3H7z' fill='%23fff'/%3E%3C/svg%3E">
<style>
${FONTS}
${KIT_CSS}
</style>
</head>
<body>
<div id="app"></div>
<noscript>This simulator needs JavaScript and WebGL.</noscript>
<script type="module">
${js}
</script>
</body>
</html>
`;
  const out = path.join(DIST, m.file);
  fs.writeFileSync(out, html);
  console.log(`${path.relative(ROOT, out)}  ${(html.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
}
