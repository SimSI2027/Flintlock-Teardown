// What the console says about each subsystem. Every line carries its status:
//   V  verified: stated by a cited museum or auction-catalogue description of the Model 1805
//   E  estimate: a period-typical detail the sources do not state; drawn as a plausible guess
//   S  simplified: deliberately schematic in this model (and kept non-fabrication-ready)
// Sources: see docs/HISTORY.md. [SI] Smithsonian NMAH U.S. Model 1805 pistol record; [NRA] NRA National Firearms
// Museum, case 32; [BON] Bonhams Skinner lot 1049 (2025), a Harpers Ferry Model 1805 dated 1807; [WP] Wikipedia.

export const SRC = {
  SI: 'Smithsonian NMAH, U.S. Model 1805 pistol (Bitter Collection)',
  NRA: 'NRA National Firearms Museum, US Harpers Ferry Model 1805 (case 32)',
  BON: 'Bonhams Skinner, lot 1049, 1–10 April 2025: Harpers Ferry U.S. Model 1805, 1807',
  WP: 'Wikipedia, Harper’s Ferry flintlock pistol',
};

export const OVERVIEW = {
  title: 'U.S. MODEL 1805',
  lines: [
    ['V', 'Made at the U.S. Armory, Harpers Ferry, 1806–1808', 'NRA'],
    ['V', 'Issued in pairs; both pistols of a pair share a serial number', 'NRA'],
    ['V', 'Walnut half-stock, key fastened; brass mountings', 'SI'],
    ['S', 'Proportions simplified: a visual study, not a measured drawing', ''],
  ],
};

export const NOTES = {
  none: OVERVIEW,
  lock: {
    title: 'LOCK ASSEMBLY',
    lines: [
      ['V', 'Flat lock plate, pointed tail, marked HARPERS / FERRY / date', 'BON'],
      ['V', 'Spread-wing eagle over “US” below the pan', 'BON'],
      ['E', 'Held by two side nails through a brass side plate', ''],
      ['S', 'Internal layout schematic: tumbler, sear and springs shown in their roles only', ''],
    ],
  },
  cock: {
    title: 'COCK & FLINT',
    lines: [
      ['E', 'Gooseneck cock profile (not stated by the cited sources)', ''],
      ['E', 'Flint clamped in leather between lower jaw and top jaw', ''],
      ['S', 'Cock turns on the tumbler arbor; one model angle drives both', ''],
    ],
  },
  frizzen: {
    title: 'FRIZZEN & PAN',
    lines: [
      ['V', 'Pan and fence forged integral with the lock plate', 'NRA'],
      ['E', 'Frizzen face and pan cover in one piece, on a frizzen screw', ''],
      ['E', 'External frizzen spring holds it open or closed', ''],
      ['S', 'Pan shown empty; no ignition is modelled', ''],
    ],
  },
  internals: {
    title: 'TUMBLER & SEAR',
    lines: [
      ['E', 'Tumbler with a deep half-cock notch and a full-cock step', ''],
      ['E', 'Sear nose pressed onto the tumbler by the sear spring', ''],
      ['E', 'Bridle carries the tumbler arbor and sear screw', ''],
      ['S', 'Notch shapes are illustrative and not to any pattern', ''],
    ],
  },
  springs: {
    title: 'SPRINGS',
    lines: [
      ['E', 'V-springs: mainspring, sear spring, frizzen spring', ''],
      ['S', 'Readouts show relative deflection only, not force', ''],
    ],
  },
  trigger: {
    title: 'TRIGGER & GUARD',
    lines: [
      ['V', 'Brass trigger guard with pointed finial', 'BON'],
      ['E', 'Trigger pivots on a pin; its bar lifts the sear arm', ''],
      ['S', 'Trigger travel shown in model degrees', ''],
    ],
  },
  barrel: {
    title: 'BARREL & BREECH',
    lines: [
      ['V', 'Round barrel; iron rib with iron rammer pipe', 'BON'],
      ['V', 'Barrel fastened to the half-stock by a key', 'SI'],
      ['E', 'Breech plug with a tang and tang screw', ''],
      ['S', 'Exterior only: no bore, chamber or vent detail', ''],
    ],
  },
  stock: {
    title: 'STOCK',
    lines: [
      ['V', 'Walnut half-stock', 'BON'],
      ['S', 'Stock shape lofted by eye from photographs', ''],
    ],
  },
  furniture: {
    title: 'BRASS FURNITURE',
    lines: [
      ['V', 'Butt cap with long ears; flat side plate', 'BON'],
      ['V', 'Brass nose band and brass entry pipe', 'BON'],
      ['E', 'Key escutcheons shown in brass', ''],
    ],
  },
  ramrod: {
    title: 'RAMROD',
    lines: [
      ['V', 'Wood rammer, brass tip, iron ferrule (this example)', 'BON'],
      ['V', 'Both wooden and steel ramrods are encountered', 'NRA'],
      ['S', 'Shown as an exterior form only', ''],
    ],
  },
  screws: {
    title: 'SCREWS & PINS',
    lines: [
      ['E', 'Side nails, tang screw, lock screws, trigger pin', ''],
      ['S', 'Screws are visual tokens: no threads or sizes', ''],
    ],
  },
  all: {
    title: 'EXPLODED VIEW',
    lines: [
      ['S', 'Every part apart; reassembles to the exact same pose', ''],
      ['S', 'Order of removal shown for clarity, not as instructions', ''],
    ],
  },
};

// short names for the labels (callouts) on the 3D parts
export const LABEL = {
  stock: ['WALNUT HALF-STOCK', 'V'],
  barrel: ['ROUND BARREL', 'V'],
  rampipe: ['IRON RAMMER PIPE', 'V'],
  breech: ['BREECH PLUG & TANG', 'E'],
  tangscrew: ['TANG SCREW', 'E'],
  key: ['BARREL KEY', 'V'],
  escutcheons: ['KEY ESCUTCHEONS', 'E'],
  ramrod: ['RAMMER, BRASS TIP', 'V'],
  buttcap: ['BUTT CAP, LONG EARS', 'V'],
  capscrew: ['BUTT CAP SCREW', 'E'],
  sideplate: ['FLAT SIDE PLATE', 'V'],
  noseband: ['BRASS NOSE BAND', 'V'],
  entrypipe: ['BRASS ENTRY PIPE', 'V'],
  guard: ['TRIGGER GUARD', 'V'],
  guardscrews: ['GUARD SCREWS', 'E'],
  trigger: ['TRIGGER', 'E'],
  trigpin: ['TRIGGER PIN', 'E'],
  sidenails: ['SIDE NAILS', 'E'],
  plate: ['LOCK PLATE · PAN · FENCE', 'V'],
  cock: ['COCK', 'E'],
  topjaw: ['TOP JAW', 'E'],
  jawscrew: ['JAW SCREW', 'E'],
  flint: ['FLINT IN LEATHER', 'E'],
  cockscrew: ['COCK SCREW', 'E'],
  frizzen: ['FRIZZEN / PAN COVER', 'E'],
  frizscrew: ['FRIZZEN SCREW', 'E'],
  frizspring: ['FRIZZEN SPRING', 'E'],
  fsscrew: ['SPRING SCREW', 'E'],
  tumbler: ['TUMBLER', 'E'],
  swivel: ['SWIVEL', 'E'],
  bridle: ['BRIDLE', 'E'],
  bridlescrew: ['BRIDLE SCREW', 'E'],
  sear: ['SEAR', 'E'],
  searscrew: ['SEAR SCREW', 'E'],
  searspring: ['SEAR SPRING', 'E'],
  ssscrew: ['SEAR SPRING SCREW', 'E'],
  mainspring: ['MAINSPRING', 'E'],
  msscrew: ['MAINSPRING SCREW', 'E'],
};
