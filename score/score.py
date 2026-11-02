"""Score for the Model 1805 teardown film: a quiet modal pad the whole way, and a mechanical accent on every event the
lock model reports (notch clicks, the cock's stops, the trigger, the flint meeting the frizzen, the frizzen's stops),
a soft air under every teardown move and a small click on every button the operator presses. There is no report and
no ignition sound: the lock's sounds stop at the frizzen.

    python tools/run_sfx.py score/score.py

Every time comes from src/film/timeline.json (written by scripts/timeline.mjs from the same model as the picture).
"""

import math
import os
import random

from sfx.dsp import bp, biquad, reverb
from sfx.synth import SR, click, pad, whoosh

TIMELINE = "../src/film/timeline.json"
OUT = os.path.join(os.environ.get("TEARDOWN_OUT", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out")), "score.wav")
TARGET_LUFS = -16.0
SEED = 1805


def hz(semi_from_a4):
    return 440.0 * 2 ** (semi_from_a4 / 12)


# D dorian, slow: Dm9, Cmaj7/E, Fmaj7, Am7(sus) - every 8 s
CHORDS = [
    [hz(-31), hz(-24), hz(-19), hz(-17), hz(-12)],
    [hz(-29), hz(-22), hz(-17), hz(-14), hz(-10)],
    [hz(-28), hz(-21), hz(-16), hz(-12), hz(-9)],
    [hz(-36), hz(-24), hz(-17), hz(-14), hz(-10)],
]


def metal(dur, freqs, decay, ring, noise=0.5, body=0.0, body_f=200.0, seed=1):
    """A struck-metal click: a noise burst through resonators, plus an optional low body."""
    rnd = random.Random(seed)
    n = int(dur * SR)
    res = []
    for fc in freqs:
        w = 2 * math.pi * fc / SR
        r = math.exp(-1 / (ring * SR))
        res.append([2 * r * math.cos(w), -r * r, 0.0, 0.0])
    out = []
    for i in range(n):
        t = i / SR
        ex = (rnd.random() - 0.5) * math.exp(-t / decay)
        y = ex * noise
        for q in res:
            v = ex * 0.08 + q[0] * q[2] + q[1] * q[3]
            q[3] = q[2]
            q[2] = v
            y += v
        if body:
            y += body * math.sin(2 * math.pi * body_f * t) * math.exp(-t / 0.03)
        out.append(y)
    m = max(1e-9, max(abs(v) for v in out))
    return [v / m for v in out]


def scrape(dur, seed=11):
    rnd = random.Random(seed)
    n = int(dur * SR)
    x = [rnd.uniform(-1, 1) * math.sin(math.pi * i / n) for i in range(n)]
    return biquad(x, bp(5200, 1.2))


SOUND = {
    "click-half": (lambda: metal(0.12, (2900, 4700, 6900), 0.004, 0.02, 0.5, 0.35, 420, 3), 0.5),
    "click-full": (lambda: metal(0.14, (2500, 4300, 6200), 0.005, 0.025, 0.5, 0.45, 380, 4), 0.56),
    "settle": (lambda: metal(0.06, (3600, 5800), 0.002, 0.012, 0.4, 0, 0, 5), 0.18),
    "stop": (lambda: metal(0.09, (1800, 3100), 0.003, 0.015, 0.3, 0.5, 240, 6), 0.3),
    "trigger": (lambda: metal(0.07, (4200, 6600), 0.002, 0.01, 0.5, 0, 0, 7), 0.28),
    "blocked": (lambda: metal(0.08, (2200, 3800), 0.003, 0.01, 0.35, 0.4, 300, 8), 0.38),
    "snap": (lambda: metal(0.06, (5200, 7800), 0.0015, 0.008, 0.6, 0, 0, 9), 0.3),
    "strike": (lambda: [a * 0.8 + b * 0.9 for a, b in zip(metal(0.3, (3300, 5600, 8200), 0.006, 0.06, 0.5, 0.3, 520, 10), scrape(0.09) + [0.0] * int(0.3 * SR))], 0.62),
    "cock-stop": (lambda: metal(0.16, (1400, 2600, 4100), 0.004, 0.03, 0.35, 0.6, 170, 12), 0.55),
    "frizzen-open": (lambda: metal(0.18, (1900, 3400, 5300), 0.004, 0.035, 0.35, 0.4, 260, 13), 0.46),
    "frizzen-close": (lambda: metal(0.14, (2400, 4100), 0.003, 0.025, 0.4, 0.45, 300, 14), 0.46),
    "touch": (lambda: metal(0.05, (3900,), 0.002, 0.008, 0.25, 0, 0, 15), 0.22),
}


def score(mix, tl):
    dur = tl["duration"]
    chords = [(t, CHORDS[(i % len(CHORDS))]) for i, t in enumerate(range(0, int(dur) + 8, 8))]

    def vol(t):
        # in for 2 s, out over the last 3 s
        return 0.6 * min(1.0, t / 2.0) * min(1.0, max(0.0, (dur - t) / 3.0))

    left, right = pad(dur, chords, volume=vol, detune=0.5, tremolo=0.11, xfade=1.6)
    mix.put_stereo(0, left, right, 0.05)
    cache = {}
    for e in tl["lock"]:
        kind = e["type"]
        if kind not in SOUND:
            continue
        if kind not in cache:
            fn, g = SOUND[kind]
            x = fn()
            cache[kind] = (x, g)
        x, g = cache[kind]
        mix.put(e["t"], x, g, pan=0.12)
    for f in tl["focus"]:
        d = max(0.5, min(1.6, f["end"] - f["t"]))
        if f["dir"] == "apart":
            mix.put(f["t"], whoosh(d, 300, 1400, peak=0.45), 0.05, pan=-0.1)
        else:
            mix.put(f["t"], whoosh(d * 0.8, 1300, 320, peak=0.55), 0.04, pan=0.1)
    for t in tl["presses"]:
        mix.put(t, click(2600, 0.03), 0.05)
