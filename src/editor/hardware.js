// hardware.js — fittings & hardware specification.
// Pure metadata: it never changes geometry, it only feeds the spec/BOM sheet
// and tells the manufacturer which fittings to quote. Stored on layout.hardware.

export const HARDWARE_FIELDS = [
  { key: 'hinge', label: 'Hinges' },
  { key: 'drawerChannel', label: 'Drawer channels' },
  { key: 'handle', label: 'Handles' },
  { key: 'brand', label: 'Hardware brand' },
];

export const HARDWARE_OPTIONS = {
  hinge: ['Soft-close', 'Standard'],
  drawerChannel: ['Telescopic soft-close', 'Telescopic', 'Standard'],
  handle: ['Profile / handleless', 'Knob', 'Bar / D-handle', 'Edge G-profile'],
  brand: ['Hettich', 'Hafele', 'Ebco', 'Godrej', 'Generic'],
};

export function defaultHardware() {
  return {
    hinge: 'Soft-close',
    drawerChannel: 'Telescopic soft-close',
    handle: 'Profile / handleless',
    brand: 'Hettich',
  };
}
