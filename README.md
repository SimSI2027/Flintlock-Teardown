# Model 1805 Flintlock Teardown

**Live demo: <https://simsi2027.github.io/Flintlock-Teardown/>**
**Repository: <https://github.com/SimSI2027/Flintlock-Teardown>**

An interactive 3D teardown simulator of the **U.S. Model 1805 flintlock pistol** made at the national armory at
Harpers Ferry (1806–1808). One page shows the lock's resting, half-cock and full-cock states and how the trigger,
sear, tumbler, cock, frizzen and pan cover move together. Every subsystem has a button that takes it apart while the
rest of the pistol steps aside. Left alone, the page tours itself.

![The simulator: lock state, schematic and readouts on the left, controls on the right](media/poster.jpg)

**Tour video** (1920×1080, 60 fps, H.264, with sound):
[`flintlock-teardown.mp4` on the latest release](https://github.com/SimSI2027/Flintlock-Teardown/releases/latest).
The contact sheet of its beats is in [`media/contact-sheet.jpg`](media/contact-sheet.jpg).

**Exterior detail pass:** before and after, shot for shot from the same cameras, in
[`media/exterior-before-after.jpg`](media/exterior-before-after.jpg).

> **A historical visual study only.** The model is code-generated and permanently non-functional. Its proportions
> are simplified and are not the original's dimensions. It contains no manufacturing drawings, measurements,
> tolerances, material specifications, loading, firing or ammunition information, performance figures, or
> guidance for building, restoring, converting or operating a firearm. The teardown order is chosen for visual
> clarity and is not a disassembly procedure.

## What it shows

- **One authoritative state model** (`src/shared/lock.js`). The cock angle, frizzen angle and trigger travel are
  commanded by a deterministic planner. Every pose, every readout, the schematic and every sound event is derived
  from that one state. The sear's position comes from the tumbler's notch profile; the frizzen yields only where the
  flint actually meets its face.
- **Lock states:** rest (cock down on the closed frizzen), half-cock (sear in the hooked notch, so the trigger is
  blocked) and full-cock (sear on the step). Releasing from full-cock shows the sear clearing, the cock falling, the
  flint meeting the frizzen face and the frizzen thrown open to uncover the pan. The release is slowed so it can be
  followed.
- **Subsystem teardowns**, one button each: Lock, Cock & flint, Frizzen & pan, Tumbler & sear, Springs, Trigger &
  guard, Barrel, Stock, Brass furniture, Ramrod, Screws & pins. There are also Assembled and Exploded buttons.
  Fasteners come out before the parts they hold. Every teardown reassembles to exactly the same pose.
- **Display modes:** solid, cutaway (a window through the stock and lock plate), x-ray (glass stock, plate and side
  plate), callout labels and orbit.
- **Camera presets:** hero, lock, close, inside, top, left, under, muzzle, and exterior close-ups of the pan,
  trigger and guard, butt cap and grip, breech and tang, and the rammer hardware. Drag to orbit, wheel to zoom.
- **Exterior detail:** an aged walnut stock whose grain runs along the stock (rings, fine grain, pores, figure,
  darker wood at every inlet, a hand-polished wrist and grip), iron and steel with a restrained patina and light
  pitting, mellow brass, real slotted screw heads, and the lock and barrel markings struck into the metal. All of it
  is generated in code and in the shader; no photograph is used as a texture.
- **Live console:** lock state, a schematic drawn from the model state, readouts in model degrees and relative
  deflection, and source notes tagged **V** (verified), **E** (estimate) and **S** (simplified).
- **Auto tour** with an on-screen pointer. Any click, drag, wheel or key hands control to you with the exact state
  on screen; after 25 s of quiet the pistol walks itself back to rest and the tour resumes.
- **Mechanical sound** synthesised in the browser and fired by the model's own events (notch clicks, stops, the
  flint on the frizzen, the frizzen's stops, teardown moves).
- **Manual controls:** pause, step, speed (0.1×–2×), and a slider that moves the cock by hand. Let go and it settles
  in the notch below.
- **Performance modes:** Auto (steps down while frames are slow), High, Balanced and Low for integrated graphics.
  Add `?quality=low` to start in the lightest mode. Low keeps the wood grain and metal patina but drops the finest
  surface detail (pores, pitting, scratches, bump). The exterior pass took the model from 38k to 58k triangles while
  cutting draw calls per frame from 515 to 415 (shared screw geometry, fewer meshes); measured with WebGL timer queries
  at a 2× display, High is unchanged (about 4.6 ms, dominated by ambient occlusion and 8× MSAA), and full-screen
  close-ups cost about a quarter more on Balanced and a third more on Low (well under a millisecond on the
  development GPU).

### Keyboard

| Key | Action | Key | Action |
|---|---|---|---|
| R / H / F | rest / half-cock / full-cock | T | trigger |
| Z | frizzen open/close | S / C / X | solid / cutaway / x-ray |
| E / A | exploded / assembled | L / O | labels / orbit |
| 1–9, 0 | camera presets (9 pan, 0 breech) | Space / . | pause / step |
| M | sound | | |

## Historical configuration

| | |
|---|---|
| Design | U.S. Model 1805 flintlock pistol, Harpers Ferry Armory, made 1806–1808, issued in identically numbered pairs |
| Verified features | walnut half-stock, key fastened; round barrel; iron rib with iron rammer pipe; flat lock plate with pointed tail; integral pan and fence; lock marked with a spread-wing eagle with shield over "US" below the pan and HARPERS / FERRY / date in vertical arcs behind the cock; breech proofs (eagle head over "P", "US", in sunken ovals); a worn inspector's cartouche behind the side plate; brass butt cap with long ears, trigger guard with pointed finial, flat side plate, nose band, entry pipe; wood rammer with flared brass tip and iron ferrule; the recorded patinas (grey iron, grey-brown lock, brown frizzen and pan, mellow brass) |
| Estimated | the cock's gooseneck profile, frizzen and spring shapes, all internal lock parts' shapes and positions, the screws and pins, the tang and guard-tang outlines, the ears' taper, the lock-side panel flats |
| Simplified | all proportions (no measurements claimed); exterior-only barrel; empty pan, no ignition; stylised timing; markings are original renderings, not facsimiles; no serial number |

Sources: Smithsonian NMAH, the NRA National Firearms Museum, a Bonhams Skinner (2025) catalogue description of an
1807-dated example, and further auction-catalogue descriptions of surviving pistols (James D. Julia, Morphy, Poulin). The full source list and the verified, estimated and simplified breakdown are in
**[docs/HISTORY.md](docs/HISTORY.md)**.

## Build, test, record

Node.js 20+ is required; the video also needs `ffmpeg` and Python 3.

```sh
npm ci
npx playwright install chromium
npm run build              # dist/index.html (live) and dist/film.html (film), self-contained
npm run test:unit          # state model, channels, teardown, tour (node --test)
npx playwright test        # live page, every control, teardowns, collisions, deterministic film frames
```

Deterministic film (1920×1080, 60 fps, H.264, synchronised sound):

```sh
npm run build && npm run timeline
node scripts/capture.mjs film --size 1600x900 --dpr 1.2 --fps 60 --out out/film-silent.mp4
python tools/run_sfx.py score/score.py                     # out/score.wav, from src/film/timeline.json
ffmpeg -y -i out/film-silent.mp4 -i out/score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/flintlock-teardown.mp4
node scripts/sheet.mjs --video out/flintlock-teardown.mp4 --every 6 --cols 4   # read back what the encoder wrote
```

`npm run video` runs all of the above in one go (`scripts/video.mjs`), plus a contact sheet of the tour's beats
(`out/contact-sheet.png`, beats read from the timeline). A copy of the sheet is in `media/contact-sheet.jpg`.

Exterior close-ups, before-and-after sheets and render statistics (triangles, draw calls, GPU frame time per quality
tier, from WebGL timer queries):

```sh
node scripts/closeups.mjs --out out/closeups/after                    # fixed cameras, console hidden, + stats.json
node scripts/closeups.mjs --out out/closeups/before --dist <older dist>
node scripts/closeups.mjs --compare out/closeups/before out/closeups/after --out out/closeups/compare
node scripts/closeups.mjs --perf-only --dpr 2 --out out/closeups/perf   # GPU ms per tier at a 2x display
```

## How it is built

| File | Job |
|---|---|
| `src/shared/lock.js` | The state model: 2D lock geometry in model units, contacts, notch profile, the planner, events. No three.js. |
| `src/shared/channels.js` | Deterministic channels for the teardown, display mode, camera and toggles; `createWorld()` combines them. |
| `src/shared/teardown.js` | Members and ordered moves for every subsystem button. |
| `src/shared/pistol.js`, `geo.js` | Every part generated from code: lofted stock with panel flats, lathed barrel, swept and extruded parts, straps that lie on the stock (ears, tangs), shared slotted-screw geometry. |
| `src/shared/materials.js` | Procedural walnut (grain along the stock, pores, figure, inlet darkening, wear), metal patina (mottling, pitting, scratches, rubbed edges), the struck markings; one shader program per family. |
| `src/shared/stage.js` | Studio lighting, shadows, GTAO, and the solid, ghost, x-ray, cutaway and accent looks. |
| `src/shared/console.js`, `frame.js` | The 1600×900 console, schematic, readouts, callouts; one frame from one state. |
| `src/shared/tour.js`, `film.js` | The tour script; the film as a pure function of time. |
| `src/shared/live.js`, `audio.js` | The live page, takeover, quality tiers, WebAudio sound. |
| `src/shared/inspect.js` | Surface-voxel collision inspection used by the tests. |
| `scripts/closeups.mjs` | Fixed-camera exterior close-ups, before/after sheets and render statistics. |
| `score/score.py`, `tools/sfx` | The film's score on the timeline the model writes. |

The runtime, capture script and sound engine are adapted from the *teardown* kit, built on
[whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion) (MIT); see `tools/KIT-LICENSE.txt`. three.js
(MIT), Inter, JetBrains Mono and EB Garamond (SIL OFL) are bundled into the page.

## Licence

MIT for the code in this repository. The historical sources are cited, not reproduced.
