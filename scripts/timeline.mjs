#!/usr/bin/env node
// Writes src/film/timeline.json from the tour: every lock event (notch clicks, stops, the strike, the frizzen), every
// teardown move and every button press, in seconds. The score reads it, so the sound cannot drift from the picture.
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './paths.mjs';
import {timeline} from '../src/shared/tour.js';

const tl = timeline();
const out = path.join(ROOT, 'src/film/timeline.json');
fs.writeFileSync(out, JSON.stringify(tl, null, 1));
console.log(`${path.relative(ROOT, out)}: ${tl.lock.length} lock events, ${tl.focus.length} teardown moves, ${tl.presses.length} presses, ${tl.duration} s`);
