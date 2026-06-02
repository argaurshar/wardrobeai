// layoutEngine.js
// The brain. Takes a cavity (width x height x depth in mm) and a strategy,
// returns a structured layout of columns and the components stacked in each.
//
// Coordinate convention: y = 0 is the FLOOR. Components stack upward.
// Each component has { type, height } and the column knows its own width.
// Positions (y offsets) are computed at the end so editing stays simple.

import { RULES, COMPONENT_TYPES } from './rules.js';

const { SHELF, DRAWER, HANGING, SHOE_RACK } = COMPONENT_TYPES;

// --- Step 1: split total width into a whole number of columns -------------
// We want each column between minColumnWidth and maxColumnWidth.
function computeColumns(totalWidth) {
  const { minColumnWidth, maxColumnWidth, panelThickness } = RULES;

  // Try column counts from few to many, pick the first that lands every
  // column inside the allowed range. Account for the side panels between bays.
  for (let count = 1; count <= 12; count++) {
    const dividers = (count + 1) * panelThickness; // outer walls + inner dividers
    const usable = totalWidth - dividers;
    if (usable <= 0) continue;
    const colWidth = usable / count;
    if (colWidth >= minColumnWidth && colWidth <= maxColumnWidth) {
      return { count, colWidth: Math.round(colWidth) };
    }
  }
  // Fallback: clamp to nearest sensible count if nothing fit cleanly.
  const approx = Math.max(1, Math.round(totalWidth / 600));
  const usable = totalWidth - (approx + 1) * panelThickness;
  return { count: approx, colWidth: Math.round(Math.max(usable / approx, minColumnWidth)) };
}

// --- helpers to fill a single column to a target inner height -------------
// innerHeight is the clear vertical space inside one column (after top/bottom panels).

function fillMaxHanging(innerHeight) {
  const items = [];
  let remaining = innerHeight;

  // Top shelf compartment for storage above the rail
  const compartment = RULES.comfortShelfGap + RULES.panelThickness;
  if (remaining > compartment + RULES.longHang) {
    items.push({ type: SHELF, height: compartment });
    remaining -= compartment;
  }
  // Long hang takes the bulk
  if (remaining >= RULES.longHang) {
    items.push({ type: HANGING, height: RULES.longHang, hangType: 'long' });
    remaining -= RULES.longHang;
  } else if (remaining >= RULES.shortHang) {
    items.push({ type: HANGING, height: RULES.shortHang, hangType: 'short' });
    remaining -= RULES.shortHang;
  }
  // Anything left at the bottom becomes a couple of drawers
  remaining = addDrawersToFill(items, remaining);
  remaining = innerHeight - sumHeights(items);
  return absorbRemainder(items, remaining);
}

function fillMaxStorage(innerHeight) {
  const items = [];
  // Drawer base: a stack of 4 at the bottom
  addDrawersToFill(items, RULES.stdDrawerHeight * 4, 4);
  let remaining = innerHeight - sumHeights(items);

  // Fill the rest with shelf compartments. A shelf compartment = the open
  // gap a user stores into, capped by its shelf panel on top.
  const compartment = RULES.comfortShelfGap + RULES.panelThickness;
  while (remaining >= compartment) {
    items.push({ type: SHELF, height: compartment });
    remaining -= compartment;
  }
  return absorbRemainder(items, remaining);
}

function fillBalanced(innerHeight) {
  const items = [];
  let remaining = innerHeight;

  // Top: one shelf compartment
  const compartment = RULES.comfortShelfGap + RULES.panelThickness;
  if (remaining > compartment) {
    items.push({ type: SHELF, height: compartment });
    remaining -= compartment;
  }
  // Middle: short hang
  if (remaining >= RULES.shortHang) {
    items.push({ type: HANGING, height: RULES.shortHang, hangType: 'short' });
    remaining -= RULES.shortHang;
  }
  // Bottom: a drawer stack
  addDrawersToFill(items, Math.min(remaining, RULES.stdDrawerHeight * 3), 3);
  remaining = innerHeight - sumHeights(items);
  return absorbRemainder(items, remaining);
}

// Add drawers to consume up to `space`, capped at `maxCount` if given.
function addDrawersToFill(items, space, maxCount = RULES.maxDrawersInStack) {
  let count = Math.floor(space / RULES.stdDrawerHeight);
  count = Math.max(0, Math.min(count, maxCount));
  for (let i = 0; i < count; i++) {
    items.push({ type: DRAWER, height: RULES.stdDrawerHeight });
  }
  return space - count * RULES.stdDrawerHeight;
}

function sumHeights(items) {
  return items.reduce((s, it) => s + it.height, 0);
}

// Distribute leftover vertical space so nothing floats. Prefer spreading it
// across shelf compartments (taller, more usable shelves) over a single dump.
function absorbRemainder(items, remaining) {
  if (remaining <= 0 || !items.length) return items;
  const shelves = items.filter((it) => it.type === SHELF);
  if (shelves.length) {
    const each = remaining / shelves.length;
    shelves.forEach((s) => (s.height += each));
  } else {
    const hang = items.find((it) => it.type === HANGING);
    if (hang) hang.height += remaining;
    else items[items.length - 1].height += remaining;
  }
  return items;
}

// --- Step 2: assemble a full layout for one strategy ----------------------
function buildLayout(strategy, dims) {
  const { width, height, depth } = dims;
  const { count, colWidth } = computeColumns(width);
  const innerHeight = height - 2 * RULES.panelThickness; // top + bottom panel

  const fillers = {
    maxHanging: fillMaxHanging,
    maxStorage: fillMaxStorage,
    balanced: fillBalanced,
  };
  const fill = fillers[strategy];

  const columns = [];
  for (let c = 0; c < count; c++) {
    const items = fill(innerHeight);
    // compute y offsets from the floor up
    let y = RULES.panelThickness;
    const placed = items.map((it) => {
      const node = { ...it, y, width: colWidth, depth };
      y += it.height;
      return node;
    });
    columns.push({ index: c, width: colWidth, items: placed });
  }

  return {
    strategy,
    dims,
    columnCount: count,
    columnWidth: colWidth,
    columns,
    materialEstimate: estimateMaterial(columns, dims),
  };
}

// --- rough material estimate (presentation only — no pricing) -------------
// Counts every component type (so accessories appear too) while keeping the
// original keys the Options cards depend on. Pass `loft` to fold an overhead
// unit into the carcass sheet count.
export function estimateMaterial(columns, dims, loft) {
  const counts = {};
  columns.forEach((col) =>
    col.items.forEach((it) => {
      counts[it.type] = (counts[it.type] || 0) + 1;
    }),
  );
  const sheetArea = 2440 * 1220; // standard sheet mm^2
  let carcassArea = columns.length * dims.height * dims.depth * 2;
  if (loft && loft.enabled) {
    // loft side panels + its floor/top divider, rough.
    carcassArea += dims.width * loft.height * 2 + dims.width * dims.depth;
  }
  const structureSheets = Math.ceil(carcassArea / sheetArea);
  const totalAreaSqFt = ((dims.width * dims.height) / 92903).toFixed(1); // mm^2 -> sq ft
  return {
    shelves: counts[SHELF] || 0,
    drawers: counts[DRAWER] || 0,
    hanging: counts[HANGING] || 0,
    structureSheets,
    backingSheets: Math.max(1, Math.ceil(structureSheets / 3)),
    totalAreaSqFt,
    counts,
  };
}

// --- public API -----------------------------------------------------------
export function generateThreeOptions(dims) {
  return {
    maxHanging: { ...buildLayout('maxHanging', dims), label: 'Max Hanging' },
    maxStorage: { ...buildLayout('maxStorage', dims), label: 'Max Storage' },
    balanced: { ...buildLayout('balanced', dims), label: 'Balanced' },
  };
}

export { computeColumns };
