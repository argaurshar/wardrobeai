// rules.js
// The single source of truth for all joinery constraints.
// Every number here is in millimetres. Change a value here and the whole
// layout engine respects it. This is where your workshop's reality lives.

export const RULES = {
  // Structure
  panelThickness: 18,      // carcass + shelves
  backPanelThickness: 6,

  // Hanging
  shortHang: 1000,         // shirts, jackets - clear vertical space needed
  longHang: 1400,          // coats, dresses
  railDropFromTop: 50,     // rod sits this far below top of its compartment

  // Shelves
  minShelfGap: 300,        // folded clothes need at least this
  comfortShelfGap: 350,    // the "nice" default
  maxShelfWidth: 900,      // beyond this a shelf sags -> engine splits column

  // Drawers
  minDrawerHeight: 150,
  stdDrawerHeight: 200,
  maxDrawerHeight: 300,
  minDrawersInStack: 3,
  maxDrawersInStack: 5,

  // Columns (vertical bays)
  minColumnWidth: 450,
  maxColumnWidth: 900,

  // Shoe rack
  shoeRackGap: 200,

  // Loft / overhead unit (mm)
  loftDefaultHeight: 500,
  loftMinHeight: 300,
  loftMaxHeight: 750,

  // Accessories / pull-out fittings (default + min compartment heights, mm)
  trouserRackHeight: 120,
  trouserRackMinHeight: 80,
  wireBasketHeight: 180,
  wireBasketMinHeight: 120,
  valetRodHeight: 80,
  valetRodMinHeight: 60,
  tieRackHeight: 100,
  tieRackMinHeight: 70,

  // Doors (Phase 2 — front view, panel styles, isometric)
  doorMinWidth: 400,            // narrow hinged door looks stub-like below this
  doorMaxWidth: 600,            // wider hinged doors warp + need stronger hinges
  slidingPanelCounts: [2, 3],   // permitted sliding-panel counts
  slidingOverlap: 25,           // bypass overlap between adjacent sliding panels
  doorThickness: 22,            // for drawing depth in the isometric view
};

// Component types the engine knows how to place.
export const COMPONENT_TYPES = {
  SHELF: 'shelf',
  DRAWER: 'drawer',
  HANGING: 'hanging',
  SHOE_RACK: 'shoeRack',
  // Accessories / pull-out fittings
  TROUSER_RACK: 'trouserRack',
  WIRE_BASKET: 'wireBasket',
  VALET_ROD: 'valetRod',
  TIE_RACK: 'tieRack',
  EMPTY: 'empty',
};
