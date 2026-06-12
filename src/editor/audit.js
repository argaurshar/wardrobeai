// audit.js — automated design review. Flags the ergonomic and practical
// issues an experienced wardrobe designer checks by eye: reach heights,
// drawer visibility, hanger depth, dead space, access. Pure function over
// the layout; consumed by AuditPanel.jsx.
//
// Item geometry: item.y = bottom of the compartment measured from the floor
// (restackColumn starts at panelThickness), item.y + item.height = top.

import { RULES } from '../engine/rules.js';

const COMFORT_REACH = 2000; // max comfortable rod/shelf reach, mm
const DRAWER_VISION = 1200; // above this a drawer's contents aren't visible
const HANGER_MIN_DEPTH = 530; // standard hanger needs this clear depth
const DEEP_WARDROBE = 700;
const TALL_OPEN_GAP = 650; // an open compartment taller than this wastes space
const LADDER_HEIGHT = 2700;
const SLIDING_MIN_WIDTH = 1200;

export function auditLayout(layout) {
  const { dims, columns } = layout;
  const findings = [];
  const warn = (title, detail, colIdx) =>
    findings.push({ level: 'warn', title, detail, colIdx });
  const info = (title, detail, colIdx) =>
    findings.push({ level: 'info', title, detail, colIdx });

  let hasHanging = false;
  let drawers = 0;
  let comfortableDrawers = 0;

  for (const col of columns) {
    // Recompute stacking defensively in case y is missing on older saves.
    let y = RULES.panelThickness;
    for (const item of col.items) {
      const bottom = item.y ?? y;
      const top = bottom + item.height;
      y = top;

      if (item.type === 'hanging') {
        hasHanging = true;
        const rail = top - RULES.railDropFromTop;
        if (rail > COMFORT_REACH) {
          warn(
            `Hanging rod at ${Math.round(rail)} mm`,
            `Col ${col.index + 1}: above the ${COMFORT_REACH} mm comfortable reach — needs a stool or a pull-down rod.`,
            col.index,
          );
        }
      }

      if (item.type === 'drawer') {
        drawers += 1;
        if (top > DRAWER_VISION) {
          warn(
            `Drawer top at ${Math.round(top)} mm`,
            `Col ${col.index + 1}: contents can't be seen above ${DRAWER_VISION} mm — swap with a shelf or move lower.`,
            col.index,
          );
        } else {
          comfortableDrawers += 1;
        }
      }

      if (item.type === 'shelf' && item.height > TALL_OPEN_GAP) {
        info(
          `${Math.round(item.height)} mm open compartment`,
          `Col ${col.index + 1}: taller than ${TALL_OPEN_GAP} mm — an extra shelf here adds storage at no real cost.`,
          col.index,
        );
      }
    }
  }

  if (hasHanging && dims.depth < HANGER_MIN_DEPTH) {
    warn(
      `Depth ${dims.depth} mm is shallow for hanging`,
      `Standard hangers need ≥ ${HANGER_MIN_DEPTH} mm clear depth — garments will press against the shutters.`,
    );
  }

  if (dims.depth > DEEP_WARDROBE) {
    info(
      `Depth ${dims.depth} mm is unusually deep`,
      'Items at the back become hard to reach — consider pull-out fittings.',
    );
  }

  if (!hasHanging) {
    info(
      'No hanging space',
      'A wardrobe without any hanging rail is unusual — confirm the client only needs folded storage.',
    );
  }

  if (drawers > 0 && comfortableDrawers === 0) {
    info(
      'All drawers above the comfortable band',
      `Every drawer tops out above ${DRAWER_VISION} mm — at least one drawer between 400–${DRAWER_VISION} mm is best practice.`,
    );
  }

  if (layout.doors?.type === 'sliding' && dims.width < SLIDING_MIN_WIDTH) {
    warn(
      `Sliding shutters on a ${dims.width} mm wardrobe`,
      `Below ${SLIDING_MIN_WIDTH} mm the open section is too narrow to use comfortably — hinged doors suit this width better.`,
    );
  }

  if (layout.loft?.enabled) {
    const top = dims.height + layout.loft.height;
    if (top > LADDER_HEIGHT) {
      info(
        `Loft top at ${top} mm`,
        'Needs a ladder to access — keep only seasonal storage there.',
      );
    }
  }

  return findings;
}
