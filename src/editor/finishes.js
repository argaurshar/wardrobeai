// finishes.js — visual material presets for the interior.
// Each finish redefines how the wardrobe's component fills are coloured.
// Geometry never changes — engine rules are independent of finish.
//
// The library is organised into the finish CATEGORIES an Indian wardrobe
// manufacturer actually sells (laminate, acrylic, PU/lacquer, membrane, veneer).
// Each finish needs the same five render colours; `deriveColors` builds all
// five from a single base hex so adding a finish is a one-liner.

// ---- colour helpers --------------------------------------------------------
function hexToRgb(hex) {
  const x = hex.replace('#', '');
  return [
    parseInt(x.slice(0, 2), 16),
    parseInt(x.slice(2, 4), 16),
    parseInt(x.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(rgb[0]) + c(rgb[1]) + c(rgb[2]);
}

// Blend `hex` toward `target` by ratio t (0..1).
function mix(hex, target, t) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * t));
}

const BLACK = '#000000';
const WHITE = '#ffffff';

// Derive the five render colours from one base (the visible front colour).
export function deriveColors(base) {
  return {
    compartment: mix(base, WHITE, 0.12), // open compartment / cavity interior
    oak: base, // drawer / shutter fronts
    oakDeep: mix(base, BLACK, 0.18), // carcass + shelf panels
    oakStroke: mix(base, BLACK, 0.45), // outlines
    rail: mix(base, BLACK, 0.6), // hanging rod
  };
}

export const FINISH_CATEGORIES = [
  'Laminate',
  'Acrylic',
  'PU-Lacquer',
  'Membrane-PVC',
  'Veneer',
];

// The original five presets keep their hand-tuned colours (so existing designs
// look identical), now tagged with a category.
export const FINISHES = {
  lightOak: {
    label: 'Light Oak',
    swatch: '#d4b48a',
    category: 'Laminate',
    colors: {
      compartment: '#efe2c4',
      oak: '#d4b48a',
      oakDeep: '#b08e60',
      oakStroke: '#7a5b39',
      rail: '#5a4632',
    },
  },
  whiteMelamine: {
    label: 'White Melamine',
    swatch: '#ece6d8',
    category: 'Laminate',
    colors: {
      compartment: '#f5f1e8',
      oak: '#ece6d8',
      oakDeep: '#d6cdb8',
      oakStroke: '#a89e8c',
      rail: '#5a544a',
    },
  },
  graphite: {
    label: 'Graphite',
    swatch: '#3a3a3e',
    category: 'Laminate',
    colors: {
      compartment: '#36363a',
      oak: '#48484c',
      oakDeep: '#2c2c30',
      oakStroke: '#0f0f12',
      rail: '#0a0a0c',
    },
  },
  darkWalnut: {
    label: 'Dark Walnut',
    swatch: '#5a3a24',
    category: 'Veneer',
    colors: {
      compartment: '#4a3325',
      oak: '#6b4830',
      oakDeep: '#4a3220',
      oakStroke: '#2a1c10',
      rail: '#1a0f08',
    },
  },
  naturalBirch: {
    label: 'Natural Birch',
    swatch: '#d8c084',
    category: 'Veneer',
    colors: {
      compartment: '#f5ebcf',
      oak: '#e1cc94',
      oakDeep: '#bea466',
      oakStroke: '#86683a',
      rail: '#5a4630',
    },
  },
};

// Extended catalogue — [id, label, category, baseHex]. Colours derived.
const CATALOG = [
  // Laminate
  ['lamFrostyWhite', 'Frosty White', 'Laminate', '#eef1f1'],
  ['lamIvory', 'Ivory', 'Laminate', '#e9e0cb'],
  ['lamChampagneOak', 'Champagne Oak', 'Laminate', '#cdb38b'],
  ['lamClassicWalnut', 'Classic Walnut', 'Laminate', '#7a5536'],
  ['lamWenge', 'Wenge', 'Laminate', '#4b3a2e'],
  // Acrylic (high gloss)
  ['acrGlossWhite', 'High Gloss White', 'Acrylic', '#f2f3f4'],
  ['acrGlossIvory', 'High Gloss Ivory', 'Acrylic', '#ece1c8'],
  ['acrGlossRed', 'High Gloss Red', 'Acrylic', '#b12a25'],
  ['acrGlossCobalt', 'High Gloss Cobalt', 'Acrylic', '#28457e'],
  ['acrGlossCharcoal', 'High Gloss Charcoal', 'Acrylic', '#2f3033'],
  // PU / Lacquer (matte)
  ['puMatteWhite', 'Matte White', 'PU-Lacquer', '#e8e7e2'],
  ['puMatteSand', 'Matte Sand', 'PU-Lacquer', '#cbb89a'],
  ['puMatteOlive', 'Matte Olive', 'PU-Lacquer', '#6f7253'],
  ['puMatteCharcoal', 'Matte Charcoal', 'PU-Lacquer', '#34352f'],
  ['puBlush', 'Matte Blush', 'PU-Lacquer', '#d6b3a3'],
  // Membrane / PVC (foil)
  ['memIvory', 'Ivory Membrane', 'Membrane-PVC', '#e7ddca'],
  ['memOak', 'Oak Membrane', 'Membrane-PVC', '#c39a68'],
  ['memCashmere', 'Cashmere', 'Membrane-PVC', '#cabfa8'],
  ['memDustGrey', 'Dust Grey', 'Membrane-PVC', '#9a978e'],
  // Veneer (natural wood)
  ['venTeak', 'Teak Veneer', 'Veneer', '#b07a44'],
  ['venOak', 'Oak Veneer', 'Veneer', '#c2a06a'],
  ['venRosewood', 'Rosewood', 'Veneer', '#5a2f24'],
];

for (const [id, label, category, base] of CATALOG) {
  FINISHES[id] = { label, swatch: base, category, colors: deriveColors(base) };
}

// Order finishes grouped by category (originals first within each group).
export const FINISH_ORDER = FINISH_CATEGORIES.flatMap((cat) =>
  Object.keys(FINISHES).filter((id) => FINISHES[id].category === cat),
);

export const DEFAULT_FINISH = 'lightOak';

export function getFinishColors(id) {
  return (FINISHES[id] ?? FINISHES[DEFAULT_FINISH]).colors;
}
