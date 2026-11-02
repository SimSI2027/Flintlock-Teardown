# Historical configuration, sources and simplifications

This simulator depicts **one** coherent early-1800s pistol: the **U.S. Model 1805 flintlock pistol made at the
national armory at Harpers Ferry, Virginia** (production 1806–1808). It is a *visual study*. The model is
code-generated, non-functional, deliberately simplified, and is **not** a measured drawing or a fabrication
reference. It gives no loading, firing, restoration, conversion or construction guidance.

## Why this pistol

The Model 1805 was the first pistol produced at a U.S. national armory. It is a single, well-catalogued design, and
several museum and auction-catalogue descriptions of surviving examples agree on its visible features. That lets the
model separate what is documented from what is estimated.

## Sources consulted

| Key | Source | What it supports |
|---|---|---|
| SI | Smithsonian National Museum of American History, *U.S. Model 1805 Pistol* (Bitter Collection), object record nmah_438593: <https://www.si.edu/object/us-model-1805-pistol%3Anmah_438593> | Made at Harpers Ferry; key-fastened half stock; brass furniture; a round barrel with rib and ramrod ferrule. *The museum page refused automated access (HTTP 403); these details come from the record's indexed summary, not a direct read.* |
| NRA | NRA National Firearms Museum, *US Harpers Ferry Model 1805 Flintlock Pistol* (case 32, The War of 1812): <https://www.nramuseum.org/the-museum/the-galleries/the-prospering-new-republic/case-32-the-war-of-1812/us-harpers-ferry-model-1805-flintlock-pistol.aspx> | Manufactured at Harpers Ferry 1806–1808; issued in identically numbered pairs; brass mountings; wooden and steel ramrods both encountered; metal finished bright; lockplate with integrally forged flashpan and fence. |
| BON | Bonhams Skinner, lot 1049, 1–10 April 2025, *A Harpers Ferry U.S. Model 1805 flintlock pistol, 1807*: <https://www.bonhams.com/auction/30902/lot/1049/a-harpers-ferry-us-model-1805-flintlock-pistol> | Round barrel; flat lock plate with pointed tail marked HARPERS / FERRY / 1807; spread-wing eagle over "US" below the pan; walnut stock; butt cap with long ears; trigger guard with pointed finial; flat side plate; brass nose band; brass entry pipe; iron rib with iron rammer pipe; wood rammer with brass tip and iron ferrule. |
| WP | Wikipedia, *Harper's Ferry flintlock pistol*: <https://en.wikipedia.org/wiki/Harper%27s_Ferry_flintlock_pistol> | Context only: production in pairs with shared serial numbers; the Model 1805–1808 dates. Not used for any feature the museum sources do not also state. |
| ARC | *Animated Flintlock Mechanism*, arc.id.au: <https://arc.id.au/Flintlock.html> (a general explanation based on a c.1760 lock, **not** a Model 1805) | The general, qualitative relationship of the parts: the sear engaging a half-cock notch and a full-cock step on the tumbler, the trigger lifting the sear, the frizzen and its spring. |

Production totals differ between sources (Wikipedia states 4,200 built; the NRA museum states "fewer than 4,200";
auction catalogues cite about 4,096). The simulator does not present any production figure as fact.

## Verified, estimated and simplified

The console marks every note **V** (verified by a cited source), **E** (estimate: period-typical, but not stated by
the sources) or **S** (deliberate simplification). The same split in full:

### Verified (stated by at least one cited description of the Model 1805)

- Made at the U.S. Armory, Harpers Ferry, 1806–1808; issued in identically numbered pairs (NRA).
- Walnut half-stock (BON), fastened to the barrel by a key (SI).
- Round barrel; iron rib under the barrel with an iron rammer pipe (BON).
- Flat lock plate with a pointed tail; pan and fence forged integral with the plate (NRA, BON).
- Lock markings: spread-wing eagle over "US" below the pan; HARPERS / FERRY / date at the tail (BON). The engraving
  in the model is a simplified rendering, not a facsimile.
- Brass furniture: butt cap with long ears, trigger guard with a pointed finial, flat side plate, nose band, entry
  pipe (BON; "brass mountings", NRA).
- Ramrod of wood with a brass tip and iron ferrule on the catalogued example; steel ramrods are also encountered
  (BON, NRA).

### Estimates (plausible for the period and drawn that way, but not stated by the sources)

- The profile of the cock (shown as a gooseneck), its jaws, jaw screw and the leather around the flint.
- The frizzen's shape, its screw, and the external frizzen spring.
- The internal layout: tumbler, bridle, sear, sear spring, mainspring and swivel. Their *roles* follow the general
  flintlock literature (ARC); their *shapes and positions* in the model are invented for legibility.
- The breech plug and tang screw, side nails, trigger pin, guard screws, butt-cap screw, and key escutcheons (shown
  in brass).
- The front sight (a small brass blade).

### Simplifications (deliberate)

- **No measurements of the original.** Model units are proportioned by eye from photographs of surviving pistols so
  the whole reads correctly. They are not the original's dimensions. No length, bore or other dimension is shown in
  the simulator or claimed here.
- Exterior only for the barrel: no bore, chamber or vent geometry beyond a dark spot at the touch-hole position and
  a dark disc at the muzzle.
- The pan is always empty; there is no powder, priming, spark or ignition, and no sound beyond the lock's own
  mechanical clicks.
- Notch and sear shapes are illustrative. The console's angles are **model degrees**, and its spring readouts are
  **relative deflection, not force**. There are no performance figures of any kind.
- Screws are tokens: no threads, sizes or tolerances.
- The cock's fall during release is slowed so it can be followed; the timing is stylised.
- The order of parts in each teardown is chosen for visual clarity. It is **not** a disassembly procedure.
- The mortise, screw holes and ramrod channel in the stock are not modelled as cavities. Parts that run through them
  are allowed to cross those surfaces in the collision inspection (see `PASSAGE` in `src/shared/live.js`).
