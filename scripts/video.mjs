#!/usr/bin/env node
// The whole video, repeatably: build, timeline, frame-by-frame capture (1920x1080, 60 fps, H.264), the score from the
// same timeline, the mux, a contact sheet of the tour's beats and a sheet read back from the encoded file.
//   node scripts/video.mjs            (or: npm run video)
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {FFMPEG, OUT, PYTHON, ROOT} from './paths.mjs';

const run = (cmd, args) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, {stdio: 'inherit', cwd: ROOT});
};
fs.mkdirSync(OUT, {recursive: true});
const silent = path.join(OUT, 'film-silent.mp4');
const wav = path.join(OUT, 'score.wav');
const final = path.join(OUT, 'flintlock-teardown.mp4');
run('node', ['scripts/build.mjs', 'film']);
run('node', ['scripts/timeline.mjs']);
run('node', ['scripts/capture.mjs', 'film', '--size', '1600x900', '--dpr', '1.2', '--fps', '60', '--crf', '18', '--out', silent]);
run(PYTHON, ['tools/run_sfx.py', 'score/score.py', '--out', wav]);
run(FFMPEG, ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', final]);
const BEATS = '0.5,6,10,18.5,23,28,33,37.5,45,49.5,54,58.5,63,67.5,72,77';
run('node', ['scripts/capture.mjs', 'film', '--size', '1600x900', '--dpr', '1', '--stills', BEATS, '--cols', '4', '--out', path.join(OUT, 'contact-sheet.png')]);
run('node', ['scripts/sheet.mjs', '--video', final, ...BEATS.split(','), '--cols', '4', '--rows', '4', '--name', 'encoded']);
console.log(`\n→ ${final}`);
