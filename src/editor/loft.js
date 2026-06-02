// loft.js — overhead loft unit state. Lives on layout.loft (undoable).
// Additive model: the loft is a band ABOVE the main cavity; the engine and
// columnOps keep treating dims.height as the main cavity, untouched.

import { RULES } from '../engine/rules.js';

export function defaultLoft() {
  return {
    enabled: true,
    height: RULES.loftDefaultHeight,
    shelf: false,
    // bays are NOT stored — always derived from the current column count via
    // `loft.bays ?? columns.length`, so adding/removing columns never desyncs.
  };
}

export function clampLoftHeight(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return RULES.loftDefaultHeight;
  return Math.max(RULES.loftMinHeight, Math.min(RULES.loftMaxHeight, Math.round(n)));
}
