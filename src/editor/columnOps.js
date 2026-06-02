// columnOps.js — pure helpers for editing a column without touching the engine.
// The engine never sees these edits; we just take the layout it produced and
// patch it. After any change we restack y-positions from the floor up, which
// is the same convention the engine itself uses.

import { RULES, COMPONENT_TYPES } from '../engine/rules.js';
import { syncHingedDoorsToColumns } from './doors.js';

const {
  SHELF,
  DRAWER,
  HANGING,
  SHOE_RACK,
  TROUSER_RACK,
  WIRE_BASKET,
  VALET_ROD,
  TIE_RACK,
} = COMPONENT_TYPES;

// ---------- restack / item helpers ----------------------------------------

export function restackColumn(items) {
  let y = RULES.panelThickness; // floor offset = bottom carcass panel
  return items.map((it) => {
    const node = { ...it, y };
    y += it.height;
    return node;
  });
}

export function minHeightFor(type) {
  switch (type) {
    case SHELF:
      return RULES.minShelfGap + RULES.panelThickness;
    case DRAWER:
      return RULES.minDrawerHeight;
    case HANGING:
      return RULES.shortHang;
    case SHOE_RACK:
      return RULES.shoeRackGap * 2;
    case TROUSER_RACK:
      return RULES.trouserRackMinHeight;
    case WIRE_BASKET:
      return RULES.wireBasketMinHeight;
    case VALET_ROD:
      return RULES.valetRodMinHeight;
    case TIE_RACK:
      return RULES.tieRackMinHeight;
    default:
      return 1;
  }
}

export function defaultHeightFor(type) {
  switch (type) {
    case SHELF:
      return RULES.comfortShelfGap + RULES.panelThickness;
    case DRAWER:
      return RULES.stdDrawerHeight;
    case HANGING:
      return RULES.shortHang;
    case SHOE_RACK:
      return RULES.shoeRackGap * 3;
    case TROUSER_RACK:
      return RULES.trouserRackHeight;
    case WIRE_BASKET:
      return RULES.wireBasketHeight;
    case VALET_ROD:
      return RULES.valetRodHeight;
    case TIE_RACK:
      return RULES.tieRackHeight;
    default:
      return 300;
  }
}

export function buildItem({ type, height, width, depth }) {
  const node = { type, height: Number(height), width, depth, y: 0 };
  if (type === HANGING) {
    node.hangType = node.height >= RULES.longHang ? 'long' : 'short';
  }
  return node;
}

export function applyItemEdit(items, idx, { type, height, lit }) {
  return items.map((it, i) => {
    if (i !== idx) return it;
    const next = { ...it, type, height: Number(height) };
    if (type === HANGING) {
      next.hangType = next.height >= RULES.longHang ? 'long' : 'short';
    } else {
      delete next.hangType;
    }
    // Lighting only applies to shelf items. Drop it on any other type.
    if (type === SHELF) {
      if (lit !== undefined) next.lit = !!lit;
    } else {
      delete next.lit;
    }
    return next;
  });
}

export function insertItem(items, idx, newItem) {
  const next = [...items];
  next.splice(idx, 0, newItem);
  return next;
}

export function removeItem(items, idx) {
  return items.filter((_, i) => i !== idx);
}

export function setColumnWidth(items, newWidth) {
  return items.map((it) => ({ ...it, width: newWidth }));
}

// ---------- layout-level helpers -------------------------------------------

// Recompute layout.dims.width from current columns so the wardrobe outline
// always equals the carcass panels + the sum of column widths.
function recomputeWidth(columns) {
  const PANEL = RULES.panelThickness;
  const sum = columns.reduce((s, c) => s + c.width, 0);
  return sum + (columns.length + 1) * PANEL;
}

function withRecomputedDims(layout, columns) {
  const reindexed = columns.map((c, i) => ({ ...c, index: i }));
  const next = {
    ...layout,
    columns: reindexed,
    columnCount: reindexed.length,
    dims: { ...layout.dims, width: recomputeWidth(reindexed) },
  };
  // Hinged doors follow the interior columns one-for-one. Sync after any
  // column op so adding / removing a column also adds / removes its door
  // (styles preserved at surviving indices).
  if (next.doors) {
    next.doors = syncHingedDoorsToColumns(next.doors, reindexed);
  }
  return next;
}

// Replace one column's contents with edited items, restacking + recomputing
// totals at the layout level.
export function applyColumnEdit(layout, colIdx, { items, columnWidth }) {
  const columns = layout.columns.map((col, ci) => {
    if (ci !== colIdx) return col;
    let nextItems = items;
    const nextWidth = columnWidth || col.width;
    if (nextWidth !== col.width) {
      nextItems = setColumnWidth(nextItems, nextWidth);
    }
    nextItems = restackColumn(nextItems);
    return { ...col, items: nextItems, width: nextWidth };
  });
  return withRecomputedDims(layout, columns);
}

// Insert `newItem` into a column at `insertIdx` (0 = bottom of column,
// length = top). Restacks after.
export function addItemToColumn(layout, colIdx, insertIdx, newItem) {
  const columns = layout.columns.map((col, ci) => {
    if (ci !== colIdx) return col;
    const items = restackColumn(insertItem(col.items, insertIdx, newItem));
    return { ...col, items };
  });
  return withRecomputedDims(layout, columns);
}

export function removeItemFromColumn(layout, colIdx, itemIdx) {
  const innerH = layout.dims.height - 2 * RULES.panelThickness;
  const columns = layout.columns.map((col, ci) => {
    if (ci !== colIdx) return col;
    const trimmed = removeItem(col.items, itemIdx);
    const absorbed = absorbRemainder(trimmed, innerH);
    return { ...col, items: restackColumn(absorbed) };
  });
  return withRecomputedDims(layout, columns);
}

// Distribute the slack (innerH - sum) into the remaining items. Mirrors the
// engine's behaviour: prefer growing shelves (since their extra height is
// usable storage), fall back to growing the topmost item if there are no
// shelves left. If overflowing, leave it — caller should have prevented this.
export function absorbRemainder(items, innerH) {
  if (items.length === 0) return items;
  const stack = items.reduce((s, it) => s + Number(it.height), 0);
  const slack = innerH - stack;
  if (slack <= 0.5 && slack >= -0.5) return items;
  if (slack < 0) return items;

  const shelves = items.filter((it) => it.type === SHELF);
  const next = items.map((it) => ({ ...it }));
  if (shelves.length > 0) {
    const each = slack / shelves.length;
    next.forEach((it) => {
      if (it.type === SHELF) it.height += each;
    });
  } else {
    next[next.length - 1].height += slack;
  }
  return next;
}

// Move an item from one index to another within the same column. `toIdx` is
// the post-removal target index in the new array.
export function reorderItems(items, fromIdx, toIdx) {
  if (fromIdx === toIdx) return items;
  const next = [...items];
  const [item] = next.splice(fromIdx, 1);
  const insert = toIdx > fromIdx ? toIdx - 1 : toIdx;
  next.splice(insert, 0, item);
  return next;
}

// Replace one column's items entirely. Used by resize / reorder which produce
// a complete new items array. Restacks after.
export function setColumnItems(layout, colIdx, items) {
  const columns = layout.columns.map((col, ci) => {
    if (ci !== colIdx) return col;
    return { ...col, items: restackColumn(items) };
  });
  return withRecomputedDims(layout, columns);
}

// Build a sensible default column to drop into the wardrobe — same shape as
// the engine's Balanced fill, just inlined so we don't have to call the engine.
function defaultColumnItems(innerH, colWidth, depth) {
  const items = [];
  let remaining = innerH;
  const compartment = RULES.comfortShelfGap + RULES.panelThickness;

  if (remaining > compartment + RULES.shortHang) {
    items.push(buildItem({ type: SHELF, height: compartment, width: colWidth, depth }));
    remaining -= compartment;
  }
  if (remaining >= RULES.shortHang) {
    items.push(buildItem({ type: HANGING, height: RULES.shortHang, width: colWidth, depth }));
    remaining -= RULES.shortHang;
  }
  const drawerCount = Math.min(3, Math.floor(remaining / RULES.stdDrawerHeight));
  for (let i = 0; i < drawerCount; i++) {
    items.push(buildItem({ type: DRAWER, height: RULES.stdDrawerHeight, width: colWidth, depth }));
  }
  remaining -= drawerCount * RULES.stdDrawerHeight;
  if (remaining > 0) {
    const shelf = items.find((it) => it.type === SHELF);
    if (shelf) shelf.height += remaining;
    else items.push(buildItem({ type: SHELF, height: remaining, width: colWidth, depth }));
  }
  return items;
}

export function addColumn(layout, { width, atIndex } = {}) {
  const PANEL = RULES.panelThickness;
  const newWidth = clamp(width ?? 600, RULES.minColumnWidth, RULES.maxColumnWidth);
  const innerH = layout.dims.height - 2 * PANEL;
  const newCol = {
    index: 0, // reassigned by withRecomputedDims
    width: newWidth,
    items: restackColumn(defaultColumnItems(innerH, newWidth, layout.dims.depth)),
  };
  const idx = atIndex ?? layout.columns.length;
  const columns = [...layout.columns];
  columns.splice(idx, 0, newCol);
  return withRecomputedDims(layout, columns);
}

export function removeColumnFromLayout(layout, colIdx) {
  if (layout.columns.length <= 1) return layout; // never delete the last column
  const columns = layout.columns.filter((_, i) => i !== colIdx);
  return withRecomputedDims(layout, columns);
}

// ---------- Layer 2 retro: palette add + column resplit --------------------

// Insert a new item into a column, making room by shrinking shelves if the
// column doesn't have free space. Returns null if even at minShelfGap the
// item still won't fit.
export function addItemRebalanced(layout, colIdx, insertIdx, newItem) {
  const innerH = layout.dims.height - 2 * RULES.panelThickness;
  const col = layout.columns[colIdx];
  const currentSum = col.items.reduce((s, it) => s + it.height, 0);
  const projected = currentSum + Number(newItem.height);
  let baseItems;
  if (projected <= innerH + 0.5) {
    // Has room. Insert and absorb the remaining slack into shelves.
    baseItems = absorbRemainder(
      insertItem(col.items, insertIdx, newItem),
      innerH,
    );
  } else {
    const shrunk = shrinkShelvesToFit(col.items, projected - innerH);
    if (!shrunk) return null;
    baseItems = insertItem(shrunk, insertIdx, newItem);
  }
  return setColumnItems(layout, colIdx, baseItems);
}

// Split `totalUsable` mm across `count` columns. Returns an integer array
// that sums to totalUsable exactly — base width floor, then +1 mm to the
// first few columns to absorb the remainder. This preserves wardrobe width
// to the millimetre, even when usable/count doesn't divide evenly.
function evenColumnWidths(totalUsable, count) {
  if (count <= 0) return [];
  const base = Math.floor(totalUsable / count);
  const remainder = totalUsable - base * count;
  const widths = new Array(count).fill(base);
  for (let i = 0; i < remainder; i++) widths[i] += 1;
  return widths;
}

// True when the wardrobe could fit one more column inside its current total
// width without any column going below minColumnWidth.
export function canAddColumn(layout) {
  const PANEL = RULES.panelThickness;
  const target = layout.columns.length + 1;
  const usable = layout.dims.width - (target + 1) * PANEL;
  if (usable <= 0) return false;
  return Math.floor(usable / target) >= RULES.minColumnWidth;
}

// Add a column at `atIndex` (default = end), re-splitting the existing total
// width evenly across the new count. Existing items in remaining columns are
// kept; their `width` is updated to the new column width. New column is
// filled with the balanced default. Returns layout unchanged if a fit would
// breach minColumnWidth.
export function addColumnResplit(layout, atIndex) {
  const PANEL = RULES.panelThickness;
  const target = layout.columns.length + 1;
  const usable = layout.dims.width - (target + 1) * PANEL;
  if (usable <= 0) return layout;
  const widths = evenColumnWidths(usable, target);
  if (widths.some((w) => w < RULES.minColumnWidth)) return layout;
  const at = atIndex ?? layout.columns.length;
  const innerH = layout.dims.height - 2 * PANEL;

  // Existing columns keep their items but get new widths. New column at `at`.
  const next = [];
  let oldI = 0;
  for (let i = 0; i < target; i++) {
    const w = widths[i];
    if (i === at) {
      next.push({
        index: i,
        width: w,
        items: restackColumn(defaultColumnItems(innerH, w, layout.dims.depth)),
      });
    } else {
      const old = layout.columns[oldI++];
      next.push({
        ...old,
        index: i,
        width: w,
        items: old.items.map((it) => ({ ...it, width: w })),
      });
    }
  }
  return withRecomputedDims(layout, next);
}

// Remove a column and re-split the wardrobe's total width evenly across the
// remaining columns. The deleted column's items are dropped (not migrated).
// Returns layout unchanged if there's only one column.
export function removeColumnResplit(layout, colIdx) {
  if (layout.columns.length <= 1) return layout;
  const PANEL = RULES.panelThickness;
  const target = layout.columns.length - 1;
  const usable = layout.dims.width - (target + 1) * PANEL;
  const widths = evenColumnWidths(usable, target);
  // We deliberately allow widths > maxColumnWidth here — removing a column
  // from a wide wardrobe will produce oversize columns. The user can fix that
  // with the divider drag or Equalize. (Engine WARNS via maxShelfWidth; not
  // an error condition for column splits in our model.)
  const remaining = layout.columns.filter((_, i) => i !== colIdx);
  const next = remaining.map((col, i) => ({
    ...col,
    index: i,
    width: widths[i],
    items: col.items.map((it) => ({ ...it, width: widths[i] })),
  }));
  return withRecomputedDims(layout, next);
}

// Set all columns to (effectively) equal width, preserving total wardrobe
// width. Differences of 1 mm spread across the first few columns to absorb
// the remainder.
export function equalizeColumns(layout) {
  const PANEL = RULES.panelThickness;
  const count = layout.columns.length;
  if (count === 0) return layout;
  const usable = layout.dims.width - (count + 1) * PANEL;
  const widths = evenColumnWidths(usable, count);
  const next = layout.columns.map((col, i) => ({
    ...col,
    width: widths[i],
    items: col.items.map((it) => ({ ...it, width: widths[i] })),
  }));
  return withRecomputedDims(layout, next);
}

// ---------- Layer 1 retro: edit with auto-rebalance ------------------------

// Apply a height/type edit to one item, then rebalance the rest of the column
// so it stays exactly full to the inner height. Returns the new layout, or
// null if the edit can't be satisfied (overflow that shelves can't absorb).
//
// Edits the type/height first (via applyItemEdit) so hangType etc. are kept
// consistent. Then:
//   diff > 0  → shrink other shelves (largest first) to make room
//   diff < 0  → grow shelves to absorb slack (or topmost item if no shelves)
//   diff = 0  → nothing extra needed
export function applyItemEditRebalanced(layout, colIdx, itemIdx, { type, height, columnWidth, lit }) {
  const col = layout.columns[colIdx];
  const innerH = layout.dims.height - 2 * RULES.panelThickness;
  const patched = applyItemEdit(col.items, itemIdx, { type, height, lit });
  const diff = patched.reduce((s, it) => s + it.height, 0) - innerH;

  let next = patched;
  if (diff > 0.5) {
    // Need to take `diff` away from items OTHER than the edited one. Only
    // shelves are eligible to shrink.
    const others = patched.map((it, i) => (i === itemIdx ? null : it));
    const shrunk = shrinkOthersShelves(others, diff);
    if (!shrunk) return null;
    next = shrunk.map((it, i) => (i === itemIdx ? patched[itemIdx] : it));
  } else if (diff < -0.5) {
    // Slack to redistribute. absorbRemainder works on the whole list — make
    // sure it grows OTHER items, not the one the user just edited.
    next = absorbRemainderOthers(patched, itemIdx, innerH);
  }

  const nextWidth = columnWidth || col.width;
  const widthAdjusted =
    nextWidth !== col.width ? setColumnWidth(next, nextWidth) : next;
  return applyColumnEdit(layout, colIdx, {
    items: widthAdjusted,
    columnWidth: nextWidth,
  });
}

// Like shrinkShelvesToFit, but skip nulls in the input so the edited item is
// untouched. Returns the same shape (with the edited item slot still null);
// the caller stitches it back in.
function shrinkOthersShelves(itemsWithNullForEdited, deficit) {
  const minShelf = minHeightFor(SHELF);
  const indexed = itemsWithNullForEdited
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it && it.type === SHELF);
  const available = indexed.reduce(
    (s, { it }) => s + Math.max(0, it.height - minShelf),
    0,
  );
  if (available + 0.5 < deficit) return null;
  indexed.sort((a, b) => b.it.height - a.it.height);
  const next = itemsWithNullForEdited.map((it) => (it ? { ...it } : null));
  let remaining = deficit;
  for (const { i } of indexed) {
    if (remaining <= 0.5) break;
    const slack = Math.max(0, next[i].height - minShelf);
    const take = Math.min(slack, remaining);
    next[i].height -= take;
    remaining -= take;
  }
  return next;
}

// Like absorbRemainder but spreads slack across items OTHER than `skipIdx`.
// Prefers shelves; falls back to growing the topmost other item.
function absorbRemainderOthers(items, skipIdx, innerH) {
  const stack = items.reduce((s, it) => s + it.height, 0);
  const slack = innerH - stack;
  if (slack <= 0.5) return items;
  const shelves = items
    .map((it, i) => ({ it, i }))
    .filter(({ it, i }) => i !== skipIdx && it.type === SHELF);
  const next = items.map((it) => ({ ...it }));
  if (shelves.length > 0) {
    const each = slack / shelves.length;
    shelves.forEach(({ i }) => {
      next[i].height += each;
    });
  } else {
    const topmost = next.length - 1 === skipIdx ? next.length - 2 : next.length - 1;
    if (topmost >= 0) next[topmost].height += slack;
  }
  return next;
}

// How tall can items[idx] go and still leave room for the others (after
// shrinking shelves to their minimum)? Used by the popup for the "max" hint.
export function maxHeightWithRebalance(items, idx, innerH) {
  const minShelf = minHeightFor(SHELF);
  let othersMin = 0;
  items.forEach((it, i) => {
    if (i === idx) return;
    othersMin += it.type === SHELF ? minShelf : it.height;
  });
  return Math.max(0, Math.round(innerH - othersMin));
}

// How much can shelves OTHER than items[idx] shrink (used to phrase the
// rebalance preview line). Positive number = mm of shrinkability available.
export function shrinkableSlack(items, skipIdx) {
  const minShelf = minHeightFor(SHELF);
  return items.reduce((s, it, i) => {
    if (i === skipIdx || it.type !== SHELF) return s;
    return s + Math.max(0, it.height - minShelf);
  }, 0);
}

// ---------- Layer 3c: cross-column move ------------------------------------

// Shrink shelves in a column by `deficit` total millimetres, taking the most
// space from the largest shelves first and never going below minShelfGap.
// Returns null if shelves can't supply the deficit.
export function shrinkShelvesToFit(items, deficit) {
  if (deficit <= 0.5) return items;
  const minShelf = minHeightFor(SHELF);
  const shelves = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.type === SHELF);
  const available = shelves.reduce(
    (s, { it }) => s + Math.max(0, it.height - minShelf),
    0,
  );
  if (available + 0.5 < deficit) return null;

  shelves.sort((a, b) => b.it.height - a.it.height); // largest first
  const next = items.map((it) => ({ ...it }));
  let remaining = deficit;
  for (const { i } of shelves) {
    if (remaining <= 0.5) break;
    const slack = Math.max(0, next[i].height - minShelf);
    const take = Math.min(slack, remaining);
    next[i].height -= take;
    remaining -= take;
  }
  return next;
}

// Move an item from (srcCi, srcIi) into (dstCi, insertIdx). Source column
// absorbs the freed space into its shelves. Target column makes room for the
// incoming item by shrinking its shelves if needed. Returns layout unchanged
// if the target can't accept the item.
export function moveItemAcrossColumns(layout, srcCi, srcIi, dstCi, insertIdx) {
  if (srcCi === dstCi) {
    // Same-column reorder uses different math (no width swap, no rebalance).
    const reordered = reorderItems(layout.columns[srcCi].items, srcIi, insertIdx);
    return setColumnItems(layout, srcCi, reordered);
  }
  const innerH = layout.dims.height - 2 * RULES.panelThickness;
  const src = layout.columns[srcCi];
  const dst = layout.columns[dstCi];
  const moving = { ...src.items[srcIi], width: dst.width };

  // Source: remove moving item, absorb the slack into shelves (or topmost).
  const srcRemaining = removeItem(src.items, srcIi);
  const srcAbsorbed = restackColumn(absorbRemainder(srcRemaining, innerH));

  // Destination: see if there's room. If not, try to make room from shelves.
  const dstStack = dst.items.reduce((s, it) => s + it.height, 0);
  const projected = dstStack + moving.height;
  let dstItems;
  if (projected <= innerH + 0.5) {
    // Has room. Insert + absorb any slack into shelves.
    dstItems = restackColumn(
      absorbRemainder(insertItem(dst.items, insertIdx, moving), innerH),
    );
  } else {
    const shrunk = shrinkShelvesToFit(dst.items, projected - innerH);
    if (!shrunk) return layout; // can't make room — abort the move
    dstItems = restackColumn(insertItem(shrunk, insertIdx, moving));
  }

  const columns = layout.columns.map((col, ci) => {
    if (ci === srcCi) return { ...col, items: srcAbsorbed };
    if (ci === dstCi) return { ...col, items: dstItems };
    return col;
  });
  return withRecomputedDims(layout, columns);
}

// Check whether moveItemAcrossColumns would succeed (for live UI feedback).
export function canMoveAcross(layout, srcCi, srcIi, dstCi) {
  if (srcCi === dstCi) return true;
  const innerH = layout.dims.height - 2 * RULES.panelThickness;
  const src = layout.columns[srcCi];
  const dst = layout.columns[dstCi];
  const moving = src.items[srcIi];
  const dstStack = dst.items.reduce((s, it) => s + it.height, 0);
  const need = dstStack + moving.height;
  if (need <= innerH + 0.5) return true;
  return shrinkShelvesToFit(dst.items, need - innerH) !== null;
}

// ---------- Layer 3e: column-width trade -----------------------------------

// Drag the divider between columns (dividerIdx) and (dividerIdx+1) by `dx`
// mm. Total wardrobe width stays constant. dx is clamped so neither column
// breaches min/max width.
export function tradeColumnWidth(layout, dividerIdx, requestedDx) {
  const left = layout.columns[dividerIdx];
  const right = layout.columns[dividerIdx + 1];
  if (!left || !right) return layout;
  const min = RULES.minColumnWidth;
  const max = RULES.maxColumnWidth;
  // Range of dx that keeps both columns inside [min, max].
  const dxMin = Math.max(min - left.width, right.width - max);
  const dxMax = Math.min(max - left.width, right.width - min);
  const dx = Math.max(dxMin, Math.min(dxMax, requestedDx));
  if (dx === 0) return layout;
  const newLeft = left.width + dx;
  const newRight = right.width - dx;
  const columns = layout.columns.map((col, ci) => {
    if (ci === dividerIdx) {
      return {
        ...col,
        width: newLeft,
        items: col.items.map((it) => ({ ...it, width: newLeft })),
      };
    }
    if (ci === dividerIdx + 1) {
      return {
        ...col,
        width: newRight,
        items: col.items.map((it) => ({ ...it, width: newRight })),
      };
    }
    return col;
  });
  return withRecomputedDims(layout, columns);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// ---------- shared constants -----------------------------------------------

export function fitsInnerHeight(items, totalHeight) {
  const innerH = totalHeight - 2 * RULES.panelThickness;
  const stack = items.reduce((s, it) => s + Number(it.height), 0);
  return stack <= innerH + 0.5;
}

export const TYPE_LABELS = {
  [SHELF]: 'Shelf',
  [DRAWER]: 'Drawer',
  [HANGING]: 'Hanging rail',
  [SHOE_RACK]: 'Shoe rack',
  [TROUSER_RACK]: 'Trouser pull-out',
  [WIRE_BASKET]: 'Wire basket',
  [VALET_ROD]: 'Valet rod',
  [TIE_RACK]: 'Tie / belt rack',
};

export const EDITABLE_TYPES = [
  SHELF,
  DRAWER,
  HANGING,
  SHOE_RACK,
  TROUSER_RACK,
  WIRE_BASKET,
  VALET_ROD,
  TIE_RACK,
];
