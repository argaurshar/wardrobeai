// doors.js — Phase 2 helpers for the front view.
//
// Door state lives on `layout.doors` (so it's undoable and survives finish
// changes). Two opening types behave differently:
//
//   hinged: N discrete doors, each ~equal width, total = wardrobe width.
//           Count auto-derives from doorMinWidth / doorMaxWidth on first
//           build; the user can add / remove afterwards.
//   sliding: 2 or 3 large overlapping panels that bypass each other. Each
//            panel covers ((W + (count-1)*overlap) / count) so adjacent
//            panels overlap by `slidingOverlap` and together cover W.

import { RULES } from '../engine/rules.js';

export const DOOR_TYPES = ['hinged', 'sliding'];

const BUILTIN_STYLE_LABELS = {
  slab: 'Slab',
  shaker: 'Shaker',
  glass: 'Glass',
  mirror: 'Mirror',
  fluted: 'Fluted',
};

// Custom door designs. Drop image files into public/door-designs/ and add
// an entry below. id must be unique; label appears in the picker; file is
// the name of the image inside public/door-designs/.
//
// `src` is built with Vite's BASE_URL so paths resolve both in local dev
// (base "/") and on GitHub Pages (base "/wardrobeai/"). Never hard-code a
// leading-slash absolute path here — it would 404 on Pages' subpath.
//
// Example:
//   { id: 'custom-oak-grain', label: 'Oak Grain', file: 'oak-grain.jpg' }
const BASE = import.meta.env.BASE_URL; // "/" in dev, "/wardrobeai/" on Pages

const CUSTOM_DESIGN_FILES = [
  { id: 'custom-light-oak', label: 'Light Oak', file: 'lightoak.jpg' },
  { id: 'custom-dark-oak', label: 'Dark Oak', file: 'dark oak.jpg' },
  { id: 'custom-walnut', label: 'Walnut', file: 'walnut.jpg' },
];

export const CUSTOM_DESIGNS = CUSTOM_DESIGN_FILES.map((d) => ({
  id: d.id,
  label: d.label,
  // encodeURIComponent handles spaces (e.g. "dark oak.jpg"); BASE already
  // ends with a slash so we don't add one.
  src: `${BASE}door-designs/${encodeURIComponent(d.file)}`,
}));

export const PANEL_STYLES = [
  ...Object.keys(BUILTIN_STYLE_LABELS),
  ...CUSTOM_DESIGNS.map((d) => d.id),
];

export const PANEL_STYLE_LABELS = {
  ...BUILTIN_STYLE_LABELS,
  ...Object.fromEntries(CUSTOM_DESIGNS.map((d) => [d.id, d.label])),
};

// Returns the image src for a custom design style, or null if the style is
// one of the built-in geometric styles. Used by DoorPanel and the popup
// thumbnail to know when to render an <image> versus the SVG primitives.
export function getStyleSrc(id) {
  return CUSTOM_DESIGNS.find((d) => d.id === id)?.src ?? null;
}

// How many equal hinged doors should fill `width` mm? Returns the smallest
// integer count where each door's width ≤ doorMaxWidth. For very small
// wardrobes (width < doorMinWidth) we return 1 anyway — one short door is
// better than zero doors.
export function computeHingedDoorCount(width) {
  for (let count = 1; count <= 12; count++) {
    if (width / count <= RULES.doorMaxWidth) return count;
  }
  return Math.ceil(width / RULES.doorMaxWidth);
}

// True if the requested hinged door count would keep each door inside the
// [doorMinWidth, doorMaxWidth] range for this wardrobe width.
export function isHingedCountAllowed(width, count) {
  if (count < 1) return false;
  const each = width / count;
  return each >= RULES.doorMinWidth && each <= RULES.doorMaxWidth;
}

// Hinged doors follow the interior column partitions one-for-one: each
// door covers one column, doors meet at the centre of every inner divider.
// Style for each door is stored in panels[i]; geometry comes from columns.
export function defaultHingedDoors(columns) {
  const count = columns?.length ?? 1;
  return {
    type: 'hinged',
    panels: Array.from({ length: count }, () => ({ style: 'slab' })),
  };
}

export function defaultSlidingDoors() {
  return {
    type: 'sliding',
    panels: Array.from({ length: 2 }, () => ({ style: 'slab' })),
  };
}

export function defaultDoors(columns) {
  return defaultHingedDoors(columns);
}

// Keep hinged panels[].length in sync with the column count. Preserves
// style at each surviving index; new panels default to slab.
export function syncHingedDoorsToColumns(doors, columns) {
  if (!doors || doors.type !== 'hinged') return doors;
  const target = columns.length;
  if (doors.panels.length === target) return doors;
  const panels = [];
  for (let i = 0; i < target; i++) {
    panels.push(doors.panels[i] ?? { style: 'slab' });
  }
  return { ...doors, panels };
}

// Replace the panel array for a hinged setup with a new count, preserving
// styles where possible (re-uses panels[0..min] then resets the rest to
// slab).
export function setHingedCount(doors, newCount) {
  if (doors.type !== 'hinged') return doors;
  const next = [];
  for (let i = 0; i < newCount; i++) {
    next.push(doors.panels[i] ?? { style: 'slab' });
  }
  return { ...doors, panels: next };
}

// Switch between 2 and 3 sliding panels. Re-builds panel array, preserving
// styles where possible.
export function setSlidingCount(doors, newCount) {
  if (doors.type !== 'sliding') return doors;
  if (!RULES.slidingPanelCounts.includes(newCount)) return doors;
  const next = [];
  for (let i = 0; i < newCount; i++) {
    next.push(doors.panels[i] ?? { style: 'slab' });
  }
  return { ...doors, panels: next };
}

export function setDoorType(doors, newType, columns) {
  if (doors?.type === newType) return doors;
  if (newType === 'hinged') return defaultHingedDoors(columns);
  if (newType === 'sliding') return defaultSlidingDoors();
  return doors;
}

// Add one hinged door. New door defaults to slab. Caller should gate on
// canAddHingedDoor to keep widths in range.
export function addHingedDoor(doors) {
  if (doors.type !== 'hinged') return doors;
  return { ...doors, panels: [...doors.panels, { style: 'slab' }] };
}

// Remove the door at `idx`. Remaining doors keep their styles and the face
// re-divides equally (computePanelGeometry handles the geometry).
export function removeHingedDoor(doors, idx) {
  if (doors.type !== 'hinged') return doors;
  if (doors.panels.length <= 1) return doors;
  return { ...doors, panels: doors.panels.filter((_, i) => i !== idx) };
}

export function canAddHingedDoor(doors, wardrobeWidth) {
  if (doors.type !== 'hinged') return false;
  // After adding, each door would be wardrobeWidth / (count+1). It must be
  // ≥ doorMinWidth to be a sensible add.
  const nextCount = doors.panels.length + 1;
  return wardrobeWidth / nextCount >= RULES.doorMinWidth;
}

export function canRemoveHingedDoor(doors, wardrobeWidth) {
  if (doors.type !== 'hinged') return false;
  // After removal, each door = wardrobeWidth / (count-1). Must be ≤ doorMaxWidth.
  if (doors.panels.length <= 1) return false;
  const nextCount = doors.panels.length - 1;
  return wardrobeWidth / nextCount <= RULES.doorMaxWidth;
}

export function setPanelStyle(doors, panelIdx, style) {
  if (!PANEL_STYLES.includes(style)) return doors;
  const panels = doors.panels.map((p, i) =>
    i === panelIdx ? { ...p, style } : p,
  );
  return { ...doors, panels };
}

// Compute each panel's geometry (x, width in mm) for a closed wardrobe.
//
// Hinged: aligns to the interior partitions — door boundaries sit at the
// centre of every inner divider, with the two outer doors flush against
// the carcass walls. Each door covers exactly one column.
//
// Sliding: independent of the interior layout. Panels overlap by
// `slidingOverlap` so n panels together fully cover the wardrobe width.
export function computePanelGeometry(doors, layout) {
  if (doors.type === 'hinged') {
    return hingedGeomFromColumns(layout.columns);
  }
  if (doors.type === 'sliding') {
    const width = layout.dims.width;
    const n = doors.panels.length;
    const ov = RULES.slidingOverlap;
    const panelW = (width + (n - 1) * ov) / n;
    return doors.panels.map((_, i) => ({
      x: i * (panelW - ov),
      width: panelW,
    }));
  }
  return [];
}

function hingedGeomFromColumns(columns) {
  const PANEL = RULES.panelThickness;
  // Build the cumulative x at the centre of every inner divider, plus the
  // two outer edges, then read off each door's [start, end].
  const boundaries = [0];
  let cum = PANEL; // after outer-left wall, at the start of col 0
  for (let i = 0; i < columns.length; i++) {
    cum += columns[i].width;
    if (i < columns.length - 1) {
      boundaries.push(cum + PANEL / 2); // centre of the next inner divider
      cum += PANEL;
    }
  }
  const totalW = cum + PANEL; // include the outer-right wall
  boundaries.push(totalW);
  const result = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    result.push({
      x: boundaries[i],
      width: boundaries[i + 1] - boundaries[i],
      // Alternate hinge sides so adjacent door handles don't collide.
      hingeSide: i % 2 === 0 ? 'left' : 'right',
    });
  }
  return result;
}
