// pricing.js — quotation engine over a designer-editable rate card.
// Follows the Indian modular-wardrobe convention: front area (sq ft) × a
// finish-dependent completed-work rate, plus per-unit add-ons for internals
// that aren't part of the base carcass (drawers, racks, baskets, lighting),
// premiums for sliding mechanisms and special door panels, a hardware-brand
// adjustment, and GST. Pure data in, line items out — no UI here.
//
// All rates are indicative defaults; the designer edits and persists their
// own card (localStorage), so city/vendor variation is their call.

import { FINISHES, DEFAULT_FINISH, FINISH_CATEGORIES } from './finishes.js';
import { defaultHardware } from './hardware.js';

const SQMM_PER_SQFT = 92903;

export const DEFAULT_RATE_CARD = {
  // ₹ per sq ft of front area (shutters + carcass + shelves + hanging included)
  finishRates: {
    Laminate: 1400,
    Acrylic: 2100,
    'PU-Lacquer': 2600,
    'Membrane-PVC': 1500,
    Veneer: 2400,
  },
  // % premium on the base when the wardrobe uses sliding shutters
  slidingPremiumPct: 20,
  // ₹ per unit for internals not covered by the base rate
  addOns: {
    drawer: 2200,
    shoeRack: 1500,
    trouserRack: 3200,
    wireBasket: 2200,
    valetRod: 900,
    tieRack: 1100,
    litShelf: 1400,
  },
  // ₹ per door panel for special fronts (slab/shaker/custom photo = base)
  panelPremiums: {
    glass: 1800,
    mirror: 2200,
    fluted: 1500,
  },
  // multiplier on the works subtotal for the chosen hardware brand
  brandMultipliers: {
    Hettich: 1.08,
    Hafele: 1.08,
    Ebco: 1.0,
    Godrej: 1.0,
    Generic: 0.95,
  },
  gstPct: 18,
  designer: { name: '', phone: '' },
  terms: 'Quote valid 15 days · 50% advance to confirm · Final quote subject to site measurement.',
};

export const ADD_ON_LABELS = {
  drawer: 'Drawer (incl. channels)',
  shoeRack: 'Shoe rack',
  trouserRack: 'Pull-out trouser rack',
  wireBasket: 'Wire basket',
  valetRod: 'Valet rod',
  tieRack: 'Tie & belt rack',
  litShelf: 'Shelf LED light',
};

export const PANEL_PREMIUM_LABELS = {
  glass: 'Glass shutter premium',
  mirror: 'Mirror shutter premium',
  fluted: 'Fluted shutter premium',
};

// ---- persistence -----------------------------------------------------------

const STORAGE_KEY = 'wardrobeai.rateCard';

// Merge saved values over defaults so new rate fields never break old cards.
export function loadRateCard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RATE_CARD;
    const saved = JSON.parse(raw);
    return {
      ...DEFAULT_RATE_CARD,
      ...saved,
      finishRates: { ...DEFAULT_RATE_CARD.finishRates, ...saved.finishRates },
      addOns: { ...DEFAULT_RATE_CARD.addOns, ...saved.addOns },
      panelPremiums: { ...DEFAULT_RATE_CARD.panelPremiums, ...saved.panelPremiums },
      brandMultipliers: { ...DEFAULT_RATE_CARD.brandMultipliers, ...saved.brandMultipliers },
      designer: { ...DEFAULT_RATE_CARD.designer, ...saved.designer },
    };
  } catch {
    return DEFAULT_RATE_CARD;
  }
}

export function saveRateCard(card) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(card));
  } catch {
    // storage unavailable (private mode) — quote still works, just not saved
  }
}

// ---- quote -----------------------------------------------------------------

export function computeQuote(layout, card) {
  const { dims, columns } = layout;
  const finish = FINISHES[layout.finish] ?? FINISHES[DEFAULT_FINISH];
  const category = FINISH_CATEGORIES.includes(finish.category)
    ? finish.category
    : 'Laminate';
  const rate = card.finishRates[category] ?? 0;

  const loft = layout.loft && layout.loft.enabled ? layout.loft : null;
  const frontHeight = dims.height + (loft ? loft.height : 0);
  const areaSqFt = Math.round((dims.width * frontHeight) / SQMM_PER_SQFT * 10) / 10;

  const lines = [];
  const base = areaSqFt * rate;
  lines.push({
    label: `${category} wardrobe — shutters, carcass & shelves${loft ? ' (incl. loft)' : ''}`,
    qty: `${areaSqFt} sq ft`,
    rate,
    amount: base,
  });

  if (layout.doors?.type === 'sliding' && card.slidingPremiumPct > 0) {
    lines.push({
      label: `Sliding mechanism premium (${card.slidingPremiumPct}%)`,
      qty: '',
      rate: null,
      amount: (base * card.slidingPremiumPct) / 100,
    });
  }

  // Per-unit add-ons counted from the interior layout.
  const counts = {};
  let litShelves = 0;
  for (const col of columns) {
    for (const item of col.items) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
      if (item.type === 'shelf' && item.lit) litShelves += 1;
    }
  }
  for (const key of Object.keys(card.addOns)) {
    const n = key === 'litShelf' ? litShelves : counts[key] ?? 0;
    if (n > 0 && card.addOns[key] > 0) {
      lines.push({
        label: ADD_ON_LABELS[key] ?? key,
        qty: `× ${n}`,
        rate: card.addOns[key],
        amount: n * card.addOns[key],
      });
    }
  }

  // Special shutter fronts.
  if (layout.doors) {
    const styleCounts = {};
    for (const p of layout.doors.panels) {
      styleCounts[p.style] = (styleCounts[p.style] ?? 0) + 1;
    }
    for (const style of Object.keys(card.panelPremiums)) {
      const n = styleCounts[style] ?? 0;
      if (n > 0 && card.panelPremiums[style] > 0) {
        lines.push({
          label: PANEL_PREMIUM_LABELS[style] ?? style,
          qty: `× ${n}`,
          rate: card.panelPremiums[style],
          amount: n * card.panelPremiums[style],
        });
      }
    }
  }

  let works = lines.reduce((s, l) => s + l.amount, 0);

  const brand = (layout.hardware ?? defaultHardware()).brand;
  const mult = card.brandMultipliers[brand] ?? 1;
  if (mult !== 1) {
    const adj = works * (mult - 1);
    lines.push({
      label: `${brand} hardware ${mult > 1 ? 'premium' : 'saving'} (${mult > 1 ? '+' : ''}${Math.round((mult - 1) * 100)}%)`,
      qty: '',
      rate: null,
      amount: adj,
    });
    works += adj;
  }

  const subtotal = Math.round(works);
  const gst = Math.round((subtotal * (card.gstPct ?? 0)) / 100);

  return {
    lines: lines.map((l) => ({ ...l, amount: Math.round(l.amount) })),
    areaSqFt,
    subtotal,
    gstPct: card.gstPct ?? 0,
    gst,
    total: subtotal + gst,
  };
}

export function formatINR(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
