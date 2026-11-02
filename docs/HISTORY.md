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
| CAT | Auction-catalogue descriptions of other surviving Model 1805 pistols: James D. Julia, Fall 2007 lot 1538 (SN 61, dated 1806) <https://jamesdjulia.com/item/lot-1538-very-rare-harpers-ferry-model-1805-flintlock-pistol-33307/>; James D. Julia, Spring 2010 lot 2458 (SN 392, dated 1807) <https://jamesdjulia.com/item/lot-2458-us-model-1805-harpers-ferry-pistol-dated-1807-39561/>; Morphy, 17 Nov 2020 lot 1004 (SN 658, dated 1807) <https://auctions.morphyauctions.com/_A__U_S__MODEL_1805_HARPERS_FERRY_FLINTLOCK_PISTOL-LOT494621.aspx>; Poulin, 2022 (SN 53, dated 1806) <https://www.poulinauctions.com/2022/08/18/rare-m1805-harpers-ferry-flintlock-pistol-dated-1806-and-numbered-53/> and 2024 (pair SN 1659, dated 1808) <https://www.poulinauctions.com/2024/02/07/exceptionally-rare-pair-of-m1805-harpers-ferry-flintlock-pistols-dated-1808-numbered-1659/>; Bonhams Skinner, April 2025 lot 1050 <https://bonhams.com/auction/30902/lot/1050/a-harpers-ferry-us-model-1805-flintlock-pistol> | The arrangement of the lock markings ("HARPERS/FERRY/1807 in vertical arcs behind cock"; "spread-winged eagle with shield on its breast", "facing toward the cock", over "US", under the pan); the barrel proofs (a raised eagle head over "P" in a sunken oval, a raised "US" in a sunken oval, the serial number, on the left of the breech); an inspector's cartouche on the flat opposite the lock, behind the side plate, usually worn to traces; a "J" shaped flat side plate, a smooth one-piece guard, an oval butt cap with long tapered langets; a flared brass rammer head; the surface condition recorded on survivors (barrels a cleaned or spotted grey with scattered light pitting toward the breech and muzzle, locks grey toned to brown, frizzen and pan a medium brown patina, brass a "mellow" or "mustard" patina). Several pages were read through an automated fetch; one (Rock Island Auction) refused it and is not used. |
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
- Lock markings: spread-wing eagle with a shield on its breast, facing the cock, over "US" below the pan; HARPERS /
  FERRY / date in vertical arcs behind the cock (BON, CAT). The model strikes them into the plate's surface (sunk,
  with darker recesses) from original stroke lettering and an original eagle drawing: a rendering, not a facsimile.
  The date shown is 1807, the year of the BON example.
- Barrel proofs on the left of the breech: a raised eagle head over "P" in a sunken oval and a raised "US" in a
  sunken oval (CAT). Each pair carried its own serial number; rather than invent one, the model leaves it off.
- An inspector's cartouche on the stock's flat opposite the lock, behind the side plate (CAT). The inspectors'
  initials varied and are rarely legible; the model shows only a worn, illegible trace.
- Surface condition (CAT, BON): the materials follow the recorded patinas, restrained: grey iron with light pitting
  concentrated toward the breech and muzzle, a grey-brown lock plate, a medium-brown frizzen and pan, mellow brass.
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
- Exterior detail added in the materials and geometry pass, all period-typical but not stated by the sources: the
  flats of the lock panel (the left flat is recorded, the lock-side panel is inferred); the wood rising behind the
  fence to wrap the breech; the outline of the barrel tang and the guard's tangs (the guard's front tang rounded, the
  rear one narrowing to a small lobe and a point); the taper of the butt cap's ears; the gooseneck's flat sides and
  the lower jaw's rounded front; the frizzen's turned top; the teardrop finial on the frizzen spring; slotted screw
  heads with a low dome; the brass nose band's beaded edges and the entry pipe's mouth; the softened muzzle crown.
- The darkened wood around every inlet (lock plate, side plate, ears, barrel and ramrod channels, cap and band
  edges), hand-polish on the wrist and grip, and edges rubbed lighter: ordinary wear on a used walnut stock, kept
  restrained.

### Simplifications (deliberate)

- **No measurements of the original.** Model units are proportioned by eye from photographs of surviving pistols so
  the whole reads correctly. They are not the original's dimensions. No length, bore or other dimension is shown in
  the simulator or claimed here.
- Exterior only for the barrel: no bore, chamber or vent geometry beyond a dark spot at the touch-hole position and
  a short dark recess at the muzzle.
- The pan is always empty; there is no powder, priming, spark or ignition, and no sound beyond the lock's own
  mechanical clicks.
- Notch and sear shapes are illustrative. The console's angles are **model degrees**, and its spring readouts are
  **relative deflection, not force**. There are no performance figures of any kind.
- Screws are tokens: no threads, sizes or tolerances. The slot is turned to a settled angle per screw.
- The walnut grain, metal patina and markings are generated in the shader from the part's own coordinates. No
  photograph is used as a texture.
- The cock's fall during release is slowed so it can be followed; the timing is stylised.
- The side plate is drawn as a long flat leaf. One catalogue calls the original "J" shaped; that outline is not
  reproduced.
- The order of parts in each teardown is chosen for visual clarity. It is **not** a disassembly procedure.
- The mortise, screw holes and ramrod channel in the stock are not modelled as cavities. Parts that run through them
  are allowed to cross those surfaces in the collision inspection (see `PASSAGE` in `src/shared/live.js`).
