# WardrobeAI — Master Build Spec

Interior wardrobe layout and front-panel design tool. This is the complete spec,
Phase 1 and Phase 2, start to finish. Build strictly in order. Each piece must
work before the next begins.

The reference video shows: a size-config screen, a generated interior layout in
flat elevation, draggable components, live dimensions, a material estimate, and
a finish picker. Match that look closely.

\---

## CORE PRINCIPLES (read first, they govern everything)

* All internal math is in millimetres. Feet is a display toggle only.
* The layout engine is the brain. UI never invents geometry; it calls the engine.
* The three starting options are rule-based, not real AI. This is by design:
instant, free, offline, never produces unbuildable furniture.
* Build flat 2D first. The isometric view is a Phase 2 addition, never the base.
* Every column always fills floor to ceiling. No gaps, no overlaps, ever.
* Two editing modes: a detailed PREP mode (full power, for the furniture maker)
and later a simple CLIENT mode (few big choices, for use in front of a buyer).
Phase 1 builds prep mode. Client mode is Phase 3, out of scope here.

\---

## ALREADY BUILT AND TESTED (do not modify)

* `src/engine/rules.js` — all joinery constraints, in mm. Single source of truth.
* `src/engine/layoutEngine.js` — `generateThreeOptions({width,height,depth})`
returns three layouts (Max Hanging, Max Storage, Balanced). Each layout has
`columns\[]`; each column has `items\[]`; each item is
`{ type, height, y, width, depth, hangType? }`. y = 0 is the FLOOR.
Tested against narrow / wide / short / standard cavities.

\---

## COORDINATE CONVENTION (causes the most bugs — repeated on purpose)

Engine: y = 0 is the FLOOR, components stack upward.
SVG: y = 0 is the TOP. Flip every item: `svgY = totalHeight - item.y - item.height`.

\---

# PHASE 1 — INTERIOR TOOL

Flow: pick units → enter size → see 3 options → pick one → edit → finishes → lighting.

Full build sequence:
A → B → C → D → Layer 1 → Layer 2 → Layer 3 → E1 → E2.
Get each step solid before the next. Do NOT start Layer 3 until A and B work.

## A. Scaffold

* `npm create vite@latest . -- --template react`, add Tailwind.
* Keep the engine untouched at `src/engine/`.

## B. Units + Size screens

* Units screen: toggle mm / ft.
* Size screen: width / height / depth number inputs.
* If ft chosen, convert to mm before calling the engine. Engine only sees mm.
* Generate button → calls `generateThreeOptions`.

## C. Three-options screen

* Render the three layouts side by side as SVG elevations.
* Material estimate under each.
* Click a layout to select it → opens the editor with that layout as state.

## D. SVG renderer — `components/WardrobeSVG.jsx`

* Takes one layout, draws it. Apply the coordinate flip above.
* Columns = vertical bays. Components: shelf = thin bar; drawer = box + handle
line; hanging = rail line near top + faint clothes hint; shoe rack = angled lines.
* Vertical rotated mm height label down each item's left edge.
* Column width labels across the top with thin dimension lines and tick marks.
* Style: dark near-black surround; wardrobe on a warm cream inset panel with
rounded corners and soft shadow; muted light-oak fills; thin grey dimension
lines; faded uppercase letter-spaced header (e.g. `UPPER STORAGE (240 H)`).

## The editor — three layers

State model: hold the selected layout in React state. Every edit mutates a copy
and re-runs a `recomputeColumn()` helper so y-positions and the material estimate
stay correct. Keep an undo stack of past states.

### Layer 1 — click to edit (build first)

* Click any component → small floating popup (dark card, like the reference).
* Popup: TYPE dropdown (Shelf / Drawer / Hanging / Shoe Rack) and W / H mm fields.
* Changing type swaps the component in place, keeping its slot.
* Changing height re-stacks the column from the floor up. Shelf compartment =
gap + panel, same as the engine.
* Validate against rules.js: reject a drawer below minDrawerHeight, a shelf gap
below minShelfGap, etc. Show the limit, don't silently clamp.
* This layer alone is a usable, demoable tool.

### Layer 2 — add / delete (build second)

* Left "Components" panel with draggable cards: Shelf, Drawer, Hanging, Shoe Rack.
* Add a component to a column → insert, re-stack, recompute estimate.
* Delete a component → remove, redistribute its space to neighbours.
* Add Col / Remove Col → re-split total width across the new count (reuse engine
column logic). Equalize Cols → reset all columns to equal width.
* Every add/delete keeps each column filling full height.

### Layer 3 — drag and resize (build last, biggest chunk)

Break into sub-steps; confirm each before the next:

* 3a. Drag a component up/down within its column to reorder. On drop, re-stack.
* 3b. Drag the boundary between two components to resize both, respecting
min/max from rules.js.
* 3c. Drag a component from one column into another.
* 3d. Auto-rebalance: moving/resizing redistributes the column's free space so it
stays full. Reuse the engine's `absorbRemainder` behaviour.
* 3e. Drag column dividers left/right to change widths live.
* Undo across all drag ops (push on drop, not on every pixel).

Constraints that must hold through every Layer 3 op:

* No component below its rules.js minimum.
* No shelf wider than maxShelfWidth (warn if a column exceeds it).
* Every column always full, floor to ceiling, no gaps/overlaps.
* Material estimate updates live.

## E. Finishes and lighting (build after the editor works)

### E1. Internal finish picker

* Swatches: Light Oak, Dark Walnut, White Melamine, Graphite, Natural Birch.
* Selecting recolours component fills in the SVG. Visual only, no geometry change.
* Store chosen finish on layout state so it persists through edits.

### E2. Shelf lighting

* Toggle a light onto any OPEN shelf (not drawers, not hanging).
* Click a shelf → add/remove an LED strip.
* In SVG: soft glow line along the shelf front edge + light wash on the
compartment below. Visual layer only, NOT real photometric simulation.
* Track lit shelves in state so they survive re-stacking and finish changes.

\---

# PHASE 2 — FRONT PANELS / DOORS + ISOMETRIC

Start only when ALL of Phase 1 works. Phase 2 is about SHOWING the wardrobe
(its front and a 3D-angle view), built on top of the finished interior.

Build sequence: F → G → H → I → J.

## F. The closed-front view

* A toggle on the editor: INTERIOR view (Phase 1) vs FRONT view (doors closed).
* Front view draws the same wardrobe cavity as a flat front face, ready for doors.
* Reuses the wardrobe's overall width/height. The interior layout drives nothing
here except total size — doors are independent of internal columns.

## G. Door opening types (two, with different rules)

The user first picks how the wardrobe opens. The two types behave differently —
the spec must treat them separately or it describes something unbuildable.

### G1. Hinged (opening) doors

* Discrete doors, one per opening. Standard door widths (e.g. 400–600mm each);
the front face is divided into a whole number of equal hinged doors within that
range, same approach as the engine's column logic but for the face.
* Add / remove individual doors is clean and allowed: changing the door count
re-divides the face into equal doors.
* Show hinge side and a handle on each door.

### G2. Sliding doors

* Large overlapping panels that bypass each other. Typically 2 or 3 panels for the
whole face; each panel covers roughly half (2-panel) or a third-plus-overlap
(3-panel) of the width.
* Sliding panels overlap by a set amount (define in rules, e.g. 25mm overlap).
* Add/remove works at the PANEL-COUNT level (2 vs 3 panels), NOT arbitrary
single-panel removal, because sliding panels must cover the full opening.
* Show the track top and bottom and the bypass overlap.

## H. Panel styles

Once a door type is chosen, the user picks the panel style per door/panel:

* Solid / slab (flat finish, uses the same finish swatches as interior).
* Shaker (framed with a recessed centre).
* Glass (transparent/frosted; faintly reveals the interior behind).
* Mirror (reflective fill treatment).
* Fluted (vertical ribbed lines).
* Each style is a different SVG fill/treatment applied to a door or sliding panel.
* A style can be set per individual door (hinged) or per panel (sliding).

## I. Add / remove panels

* Hinged: add or remove a door; the face re-divides into equal doors and each
keeps or resets its style. Respect standard width limits.
* Sliding: switch between 2 and 3 panels; panels always cover the full opening
with the defined overlap. No leaving a gap.
* Live: every add/remove redraws the front face immediately.

## J. Isometric view

* A third view toggle: INTERIOR / FRONT / ISOMETRIC.
* Projects the wardrobe at a 3D angle (e.g. 30° isometric). Show the front face
and one side, with the interior visible if doors are open/glass, or the chosen
door style if closed.
* This is the heaviest single piece of Phase 2. Build it LAST. It depends on both
the interior layout and the door styles already being correct.
* Keep it a projected 2D drawing (isometric SVG), NOT a real 3D engine. Real 3D
(three.js etc.) is out of scope — it triples the work for little gain here.

Add to rules.js for Phase 2 (agree exact numbers when you get there):

* standard hinged door min/max width
* sliding panel count options (2, 3) and overlap amount
* door/panel thickness for drawing

\---

## OUT OF SCOPE (do not build in Phase 1 or 2)

* Simple client-facing mode (few big choices) → Phase 3.
* One-page PDF export the client signs off → Phase 3.
* Saving/loading projects / any backend → later.
* Real costing tied to live material prices → later (estimate is presentation-only now).
* Real AI generation of layouts (options are rule-based by design) → much later, if ever.
* Real 3D engine and real light physics → not planned; isometric and lighting are
both drawn approximations, on purpose.

\---

## WORKING METHOD (how to build this without it falling apart)

> Coding behaviour for this project is governed by [CLAUDE.md](CLAUDE.md). See it for the four Karpathy principles that Claude follows on every session.

* Build in the exact order above. Confirm each piece in the browser before moving on.
* Commit after every working piece, so you can always return to a stable version.
* When prompting Claude Code, point it at ONE section at a time, not the whole file.
* Never let the engine get rewritten to satisfy a UI shortcut. UI calls the engine.
* If a feature tempts you toward real 3D or real light physics, stop — both are
deliberately drawn approximations here.





Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.
* 
* \*\*Tradeoff:\*\* These guidelines bias toward caution over speed. For trivial tasks, use judgment.
* 
* \## 1. Think Before Coding
* 
* \*\*Don't assume. Don't hide confusion. Surface tradeoffs.\*\*
* 
* Before implementing:
* \- State your assumptions explicitly. If uncertain, ask.
* \- If multiple interpretations exist, present them - don't pick silently.
* \- If a simpler approach exists, say so. Push back when warranted.
* \- If something is unclear, stop. Name what's confusing. Ask.
* 
* \## 2. Simplicity First
* 
* \*\*Minimum code that solves the problem. Nothing speculative.\*\*
* 
* \- No features beyond what was asked.
* \- No abstractions for single-use code.
* \- No "flexibility" or "configurability" that wasn't requested.
* \- No error handling for impossible scenarios.
* \- If you write 200 lines and it could be 50, rewrite it.
* 
* Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.
* 
* \## 3. Surgical Changes
* 
* \*\*Touch only what you must. Clean up only your own mess.\*\*
* 
* When editing existing code:
* \- Don't "improve" adjacent code, comments, or formatting.
* \- Don't refactor things that aren't broken.
* \- Match existing style, even if you'd do it differently.
* \- If you notice unrelated dead code, mention it - don't delete it.
* 
* When your changes create orphans:
* \- Remove imports/variables/functions that YOUR changes made unused.
* \- Don't remove pre-existing dead code unless asked.
* 
* The test: Every changed line should trace directly to the user's request.
* 
* \## 4. Goal-Driven Execution
* 
* \*\*Define success criteria. Loop until verified.\*\*
* 
* Transform tasks into verifiable goals:
* \- "Add validation" → "Write tests for invalid inputs, then make them pass"
* \- "Fix the bug" → "Write a test that reproduces it, then make it pass"
* \- "Refactor X" → "Ensure tests pass before and after"
* 
* For multi-step tasks, state a brief plan:
* ```
* 1\. \[Step] → verify: \[check]
* 2\. \[Step] → verify: \[check]
* 3\. \[Step] → verify: \[check]
* ```
* 
* Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
* 
* \---
* 
* \*\*These guidelines are working if:\*\* fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

