// spec.js — builds the specification / BOM sheet for a layout.
// Pure data, no pricing. Used by SpecSheet.jsx.

import { FINISHES, DEFAULT_FINISH } from './finishes.js';
import { TYPE_LABELS } from './columnOps.js';
import { PANEL_STYLE_LABELS } from './doors.js';
import { HARDWARE_FIELDS, defaultHardware } from './hardware.js';
import { estimateMaterial } from '../engine/layoutEngine.js';

export function buildSpec(layout) {
  const { dims, columns } = layout;
  const loft = layout.loft && layout.loft.enabled ? layout.loft : null;
  const finish = FINISHES[layout.finish] ?? FINISHES[DEFAULT_FINISH];
  const material = estimateMaterial(columns, dims, loft);

  const counts = material.counts;
  // stable order (shelf, drawer, ... then accessories) from TYPE_LABELS keys
  const componentLines = Object.keys(TYPE_LABELS)
    .filter((t) => counts[t])
    .map((t) => ({ label: TYPE_LABELS[t], count: counts[t] }));

  const doors = layout.doors;
  const doorStyles = doors
    ? doors.panels.map((p) => PANEL_STYLE_LABELS[p.style] ?? p.style)
    : [];

  const hw = layout.hardware ?? defaultHardware();
  const hardwareLines = HARDWARE_FIELDS.map((f) => ({ label: f.label, value: hw[f.key] }));

  // Loft sits on the wardrobe's top panel (its floor), so it adds exactly
  // loft.height to the overall height — matching the rendered views.
  const loftBlock = loft ? loft.height : 0;

  return {
    dims: {
      width: dims.width,
      height: dims.height,
      depth: dims.depth,
      overallHeight: dims.height + loftBlock,
      hasLoft: !!loft,
    },
    finish: { label: finish.label, category: finish.category },
    doors: doors
      ? { type: doors.type, count: doors.panels.length, styles: doorStyles }
      : null,
    components: componentLines,
    loft: loft
      ? { height: loft.height, bays: loft.bays ?? columns.length, shelf: !!loft.shelf }
      : null,
    hardware: hardwareLines,
    material: {
      structureSheets: material.structureSheets,
      backingSheets: material.backingSheets,
      totalAreaSqFt: material.totalAreaSqFt,
    },
    columns: columns.map((c) => ({
      index: c.index,
      width: c.width,
      items: c.items.length,
    })),
  };
}
