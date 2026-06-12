// cutlist.js — production output: every panel with nominal cut sizes, sheet
// counts, and a hardware schedule with real quantities. Pure functions over
// the layout; consumed by CutListSheet.jsx. Sizes are NOMINAL (finished
// dimensions) — the workshop applies its own machine/edge-band allowances.

import { RULES } from '../engine/rules.js';

const P = RULES.panelThickness; // 18
const B = RULES.backPanelThickness; // 6
const SHEET_AREA = 2440 * 1220; // standard board, sq mm
const WASTE = 1.3; // 30% offcut allowance for simple area-based counting

// Drawer-box clearances (nominal, standard telescopic-channel practice)
const BOX_DEPTH_CLEAR = 100; // slide + back gap
const BOX_HEIGHT_CLEAR = 50;
const BOX_SIDE_CLEAR = 62; // 2×channel(13) + 2×box side(18)

export function buildCutList(layout) {
  const { dims, columns } = layout;
  const W = dims.width;
  const H = dims.height;
  const D = dims.depth;
  const loft = layout.loft?.enabled ? layout.loft : null;
  const bays = loft ? (loft.bays ?? columns.length) : 0;

  const panels = [];
  const add = (part, qty, length, width, thickness, note = '') => {
    if (qty > 0 && length > 0 && width > 0) {
      panels.push({
        part,
        qty,
        length: Math.round(length),
        width: Math.round(width),
        thickness,
        note,
      });
    }
  };

  // ---- carcass --------------------------------------------------------------
  add('Side panel', 2, H, D, P);
  add('Top / bottom panel', 2, W - 2 * P, D, P);
  add('Vertical divider', columns.length - 1, H - 2 * P, D, P);
  add('Back panel', 1, W, H, B, 'grooved into carcass');

  // ---- per-column items -----------------------------------------------------
  for (const col of columns) {
    const cw = col.width;
    for (const item of col.items) {
      if (item.type === 'shelf') {
        add('Shelf', 1, cw, D - B, P, `col ${col.index + 1}`);
      } else if (item.type === 'shoeRack') {
        const racks = Math.max(1, Math.round(item.height / RULES.shoeRackGap));
        add('Shoe rack shelf', racks, cw, D - B, P, `col ${col.index + 1}, angled`);
      } else if (item.type === 'drawer') {
        const h = item.height;
        add('Drawer front', 1, cw, h, P, `col ${col.index + 1}`);
        add('Drawer box side', 2, D - BOX_DEPTH_CLEAR, h - BOX_HEIGHT_CLEAR, P - 6, 'box ply 12 mm');
        add('Drawer box front/back', 2, cw - BOX_SIDE_CLEAR, h - BOX_HEIGHT_CLEAR, P - 6, 'box ply 12 mm');
        add('Drawer base', 1, cw - BOX_SIDE_CLEAR, D - BOX_DEPTH_CLEAR, B, '');
      }
      // hanging + pull-out accessories are hardware, not panels
    }
  }

  // ---- loft -----------------------------------------------------------------
  if (loft) {
    const LH = loft.height;
    add('Loft side panel', 2, LH, D, P);
    add('Loft top panel', 1, W - 2 * P, D, P);
    add('Loft divider', bays - 1, LH - P, D, P);
    if (loft.shelf) {
      const bayW = (W - 2 * P - (bays - 1) * P) / bays;
      add('Loft mid shelf', bays, bayW, D - B, P);
    }
    add('Loft back panel', 1, W, LH, B);
  }

  // ---- shutters ---------------------------------------------------------------
  if (layout.doors) {
    const n = layout.doors.panels.length;
    const panelW =
      layout.doors.type === 'sliding'
        ? (W + (n - 1) * RULES.slidingOverlap) / n
        : W / n;
    add(
      layout.doors.type === 'sliding' ? 'Sliding shutter' : 'Hinged shutter',
      n,
      panelW,
      H,
      P,
      'finished face',
    );
    if (loft) {
      add('Loft shutter', bays, (W - (bays - 1) * 3) / bays, loft.height, P, 'finished face');
    }
  }

  // ---- sheet counts (area-based with waste allowance) ------------------------
  const areaByThickness = {};
  for (const p of panels) {
    areaByThickness[p.thickness] =
      (areaByThickness[p.thickness] ?? 0) + p.qty * p.length * p.width;
  }
  const sheets = Object.keys(areaByThickness)
    .sort((a, b) => b - a)
    .map((t) => ({
      thickness: Number(t),
      sheets: Math.max(1, Math.ceil((areaByThickness[t] * WASTE) / SHEET_AREA)),
    }));

  return { panels, sheets, hardware: buildHardwareSchedule(layout) };
}

// ---- hardware schedule with quantities --------------------------------------

function hingesPerDoor(doorHeight) {
  if (doorHeight < 900) return 2;
  if (doorHeight < 1500) return 3;
  if (doorHeight < 2000) return 4;
  return 5;
}

export function buildHardwareSchedule(layout) {
  const { dims, columns } = layout;
  const loft = layout.loft?.enabled ? layout.loft : null;
  const hw = [];
  const add = (item, qty, note = '') => {
    if (qty > 0) hw.push({ item, qty, note });
  };

  // doors
  if (layout.doors?.type === 'hinged') {
    const n = layout.doors.panels.length;
    add('Hinges', n * hingesPerDoor(dims.height), `${hingesPerDoor(dims.height)} per door × ${n} doors`);
    if (loft) {
      const bays = loft.bays ?? columns.length;
      add('Loft hinges', bays * hingesPerDoor(loft.height), `${hingesPerDoor(loft.height)} per door × ${bays}`);
    }
  } else if (layout.doors?.type === 'sliding') {
    const n = layout.doors.panels.length;
    add('Sliding track set (top + bottom)', 1, `${dims.width} mm`);
    add('Roller set', n, 'per sliding panel');
  }

  // per-item hardware
  let drawers = 0;
  let hangings = 0;
  let shelves = 0;
  let litShelves = 0;
  const accessories = { trouserRack: 0, wireBasket: 0, valetRod: 0, tieRack: 0 };
  const railLengths = [];
  for (const col of columns) {
    for (const item of col.items) {
      if (item.type === 'drawer') drawers += 1;
      else if (item.type === 'hanging') {
        hangings += 1;
        railLengths.push(col.width);
      } else if (item.type === 'shelf') {
        shelves += 1;
        if (item.lit) litShelves += 1;
      } else if (item.type in accessories) accessories[item.type] += 1;
    }
  }

  const channelLen = Math.floor((dims.depth - BOX_DEPTH_CLEAR) / 50) * 50;
  add('Drawer channel pairs', drawers, `${channelLen} mm telescopic`);
  add('Hanging rails', hangings, railLengths.map((l) => `${l} mm`).join(', '));
  add('Rail flanges / brackets', hangings * 2, '2 per rail');
  add('Pull-out trouser rack', accessories.trouserRack);
  add('Pull-out wire basket (with channels)', accessories.wireBasket);
  add('Valet rod', accessories.valetRod);
  add('Tie & belt rack', accessories.tieRack);
  add('Shelf support pins', shelves * 4, '4 per shelf');
  add('LED strip + driver', litShelves, 'one per lit shelf');

  // handles: doors + drawers, unless a handle-less profile is chosen
  const handleType = layout.hardware?.handle ?? '';
  const doorCount = layout.doors?.panels.length ?? 0;
  if (/profile|handleless/i.test(handleType)) {
    add('G/J profile (running)', 1, `≈ ${Math.round((dims.width * (drawers > 0 ? 2 : 1)) / 100) / 10} m total`);
  } else {
    add('Handles', doorCount + drawers, `${doorCount} doors + ${drawers} drawers`);
  }

  // connectors: rough estimate — 4 minifix + 4 dowels per structural panel
  const structuralPanels = 2 + 2 + (columns.length - 1) + (loft ? 3 + ((loft.bays ?? columns.length) - 1) : 0);
  add('Minifix + dowel sets', structuralPanels * 4, '≈ 4 per structural panel');

  return hw;
}

// ---- CSV export --------------------------------------------------------------

export function cutListToCSV({ panels, hardware }) {
  const lines = ['Part,Qty,Length (mm),Width (mm),Thickness (mm),Note'];
  for (const p of panels) {
    lines.push(`"${p.part}",${p.qty},${p.length},${p.width},${p.thickness},"${p.note}"`);
  }
  lines.push('');
  lines.push('Hardware,Qty,Note');
  for (const h of hardware) {
    lines.push(`"${h.item}",${h.qty},"${h.note}"`);
  }
  return lines.join('\n');
}
