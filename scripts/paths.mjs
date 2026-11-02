// Paths and browser flags. Adapted from the teardown kit (whaleyxbt/claude-motion, MIT).
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = path.join(ROOT, 'dist');
export const OUT = path.resolve(process.env.TEARDOWN_OUT || path.join(ROOT, 'out'));
export const FFMPEG = process.env.FFMPEG || 'ffmpeg';
export const FFPROBE = process.env.FFPROBE || 'ffprobe';
export const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
// Real GPU WebGL locally; on CI (no GPU) Chromium falls back to SwiftShader.
export const CHROMIUM_ARGS = process.env.CI
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars']
  : [...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []), '--force_high_performance_gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-webgl', '--hide-scrollbars'];
