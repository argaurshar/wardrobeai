import { useEffect, useRef, useState } from 'react';
import WardrobeSVG from '../components/WardrobeSVG.jsx';
import ComponentEditPopup from '../components/ComponentEditPopup.jsx';
import ColumnToolbar from '../components/ColumnToolbar.jsx';
import ComponentPalette from '../components/ComponentPalette.jsx';
import FinishPicker from '../components/FinishPicker.jsx';
import HardwarePicker from '../components/HardwarePicker.jsx';
import LoftPanel from '../components/LoftPanel.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import FrontView from '../components/FrontView.jsx';
import DoorTypePicker from '../components/DoorTypePicker.jsx';
import DoorStylePopup from '../components/DoorStylePopup.jsx';
import PanelToolbar from '../components/PanelToolbar.jsx';
import IsometricView from '../components/IsometricView.jsx';
import SpecSheet from '../components/SpecSheet.jsx';
import useLayoutHistory from '../editor/useLayoutHistory.js';
import { DEFAULT_FINISH } from '../editor/finishes.js';
import { defaultHardware } from '../editor/hardware.js';
import { defaultLoft } from '../editor/loft.js';
import {
  defaultDoors,
  setDoorType,
  setPanelStyle,
  setSlidingCount,
} from '../editor/doors.js';
import {
  applyItemEditRebalanced,
  addItemToColumn,
  addItemRebalanced,
  removeItemFromColumn,
  addColumnResplit,
  removeColumnResplit,
  equalizeColumns,
  canAddColumn,
  buildItem,
  defaultHeightFor,
  setColumnItems,
  moveItemAcrossColumns,
  canMoveAcross,
  tradeColumnWidth,
  TYPE_LABELS,
} from '../editor/columnOps.js';

const DRAG_THRESHOLD_PX = 6;

export default function EditorScreen({ initialLayout, onBack }) {
  const history = useLayoutHistory({
    ...initialLayout,
    finish: initialLayout.finish ?? DEFAULT_FINISH,
    doors: initialLayout.doors ?? defaultDoors(initialLayout.columns),
    hardware: initialLayout.hardware ?? defaultHardware(),
  });
  const layout = history.present;

  const [view, setView] = useState('interior');
  const [showSpec, setShowSpec] = useState(false);
  const [doorStylePopup, setDoorStylePopup] = useState(null); // { panelIdx } | null

  const handleFinishChange = (id) => {
    history.push((prev) => (prev.finish === id ? prev : { ...prev, finish: id }));
  };

  const handleHardwareChange = (key, val) => {
    history.push((prev) => ({
      ...prev,
      hardware: { ...(prev.hardware ?? defaultHardware()), [key]: val },
    }));
  };

  const handleLoftChange = (patch) => {
    history.push((prev) => ({
      ...prev,
      loft: { ...(prev.loft ?? defaultLoft(prev)), ...patch },
    }));
  };

  const handleDoorTypeChange = (newType) => {
    history.push((prev) => {
      if (prev.doors?.type === newType) return prev;
      return { ...prev, doors: setDoorType(prev.doors, newType, prev.columns) };
    });
    setDoorStylePopup(null);
  };

  const handlePanelClick = (panelIdx) => setDoorStylePopup({ panelIdx });

  const handleStylePick = (style) => {
    if (!doorStylePopup) return;
    const idx = doorStylePopup.panelIdx;
    history.push((prev) => ({ ...prev, doors: setPanelStyle(prev.doors, idx, style) }));
    setDoorStylePopup(null);
  };

  const handleSetSlidingCount = (n) => {
    history.push((prev) => ({ ...prev, doors: setSlidingCount(prev.doors, n) }));
    setDoorStylePopup(null);
  };

  // popup: null | { mode: 'edit', colIdx, itemIdx } | { mode: 'add', colIdx, insertIdx }
  const [popup, setPopup] = useState(null);

  // Palette drag is owned at the screen level — the card lives outside the SVG.
  const [paletteDrag, setPaletteDrag] = useState(null);
  // { type, x, y, started (passed threshold), target: { ci, insertIdx, allowed } | null }
  const paletteRef = useRef(null);
  paletteRef.current = paletteDrag;
  const svgRef = useRef(null);

  const selCol = popup ? layout.columns[popup.colIdx] : null;
  const selItem =
    popup?.mode === 'edit' ? selCol.items[popup.itemIdx] : null;

  // --- popup save / delete handlers ---------------------------------------

  const handleSave = (patch) => {
    if (popup.mode === 'edit') {
      history.push((prev) => {
        const next = applyItemEditRebalanced(prev, popup.colIdx, popup.itemIdx, {
          type: patch.type,
          height: patch.height,
          columnWidth: patch.columnWidth,
          lit: patch.lit,
        });
        return next ?? prev;
      });
    } else {
      history.push((prev) => {
        const col = prev.columns[popup.colIdx];
        const newItem = buildItem({
          type: patch.type,
          height: patch.height,
          width: col.width,
          depth: prev.dims.depth,
        });
        return addItemToColumn(prev, popup.colIdx, popup.insertIdx, newItem);
      });
    }
    setPopup(null);
  };

  const handleDelete = () => {
    history.push((prev) =>
      removeItemFromColumn(prev, popup.colIdx, popup.itemIdx),
    );
    setPopup(null);
  };

  // --- column toolbar handlers (now use resplit + equalize) ----------------

  const handleAddColumn = () => {
    history.push((prev) => addColumnResplit(prev));
    setPopup(null);
  };

  const handleDeleteColumn = (colIdx) => {
    history.push((prev) => removeColumnResplit(prev, colIdx));
    setPopup(null);
  };

  const handleEqualize = () => {
    history.push((prev) => equalizeColumns(prev));
    setPopup(null);
  };

  // --- palette drag flow ---------------------------------------------------

  const onPaletteCardDown = (type, e) => {
    e.preventDefault();
    setPaletteDrag({
      type,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      target: null,
    });
  };

  useEffect(() => {
    if (!paletteDrag) return;

    const onMove = (e) => {
      const cur = paletteRef.current;
      if (!cur) return;
      const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
      const started = cur.started || dist > DRAG_THRESHOLD_PX;
      const target = started
        ? svgRef.current?.hitTest(e.clientX, e.clientY) ?? null
        : null;
      // Check whether the target column can actually accept this item.
      let withAllowed = target;
      if (target) {
        // Probe: would addItemRebalanced succeed with a default-height item?
        const probeItem = {
          type: cur.type,
          height: defaultHeightFor(cur.type),
          width: layout.columns[target.ci].width,
          depth: layout.dims.depth,
        };
        const innerH = layout.dims.height - 36;
        const colSum = layout.columns[target.ci].items.reduce(
          (s, it) => s + it.height,
          0,
        );
        const allowed = colSum + probeItem.height <= innerH + 0.5 || canShrinkColumn(
          layout.columns[target.ci].items,
          colSum + probeItem.height - innerH,
        );
        withAllowed = { ...target, allowed };
      }
      setPaletteDrag((d) =>
        d ? { ...d, x: e.clientX, y: e.clientY, started, target: withAllowed } : d,
      );
    };

    const onUp = (e) => {
      const cur = paletteRef.current;
      if (!cur) return;
      const target = cur.started
        ? svgRef.current?.hitTest(e.clientX, e.clientY)
        : null;
      if (target) {
        history.push((prev) => {
          const col = prev.columns[target.ci];
          const newItem = buildItem({
            type: cur.type,
            height: defaultHeightFor(cur.type),
            width: col.width,
            depth: prev.dims.depth,
          });
          return addItemRebalanced(prev, target.ci, target.insertIdx, newItem) ?? prev;
        });
      }
      setPaletteDrag(null);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') setPaletteDrag(null);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
    };
    // Only re-bind when the palette drag transitions null <-> non-null.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteDrag !== null]);

  const selectedHL =
    popup?.mode === 'edit'
      ? { colIdx: popup.colIdx, itemIdx: popup.itemIdx }
      : null;

  return (
    <div className="h-screen flex flex-col items-center px-10 py-4 overflow-hidden animate-rise">
      <header className="w-full max-w-[1500px] flex items-center justify-between mb-4 shrink-0">
        <div>
          <p className="text-accent text-[11px] uppercase tracking-architectural mb-2">
            Editor — {layout.label}
          </p>
          <h1 className="text-stone-100 text-2xl font-normal tracking-tight font-mono">
            {layout.dims.width} × {layout.dims.height} × {layout.dims.depth} mm
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={history.undo}
            disabled={!history.canUndo}
            className="px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl/⌘ Z)"
          >
            ↶ Undo
          </button>
          <button
            onClick={history.redo}
            disabled={!history.canRedo}
            className="px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl/⌘ ⇧ Z)"
          >
            ↷ Redo
          </button>
          <button
            onClick={() => setShowSpec(true)}
            className="ml-2 px-5 py-2 rounded-full bg-accent text-surround text-sm font-semibold hover:bg-accentHover hover:shadow-glow hover:scale-[1.03] active:scale-95 transition-all duration-200"
          >
            Spec sheet
          </button>
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200"
          >
            Back to options
          </button>
        </div>
      </header>

      <div className="w-full max-w-[1500px] flex gap-8 flex-1 min-h-0">
        <aside className="w-56 shrink-0 overflow-y-auto">
          {view === 'interior' ? (
            <ComponentPalette
              onCardDown={onPaletteCardDown}
              activeType={paletteDrag?.type}
            />
          ) : (
            <DoorTypePicker
              value={layout.doors?.type}
              onChange={handleDoorTypeChange}
            />
          )}
          <LoftPanel
            loft={layout.loft}
            columns={layout.columns}
            onChange={handleLoftChange}
          />
          <FinishPicker value={layout.finish} onChange={handleFinishChange} />
          <HardwarePicker value={layout.hardware} onChange={handleHardwareChange} />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex justify-center mb-3 shrink-0">
            <ViewToggle value={view} onChange={setView} />
          </div>

          <div className="bg-cream rounded-2xl shadow-inset p-4 flex-1 min-h-0 flex items-center justify-center">
            {view === 'interior' && (
              <WardrobeSVG
                ref={svgRef}
                layout={layout}
                selected={selectedHL}
                onItemClick={(colIdx, itemIdx) =>
                  setPopup({ mode: 'edit', colIdx, itemIdx })
                }
                onDragBegin={history.beginDrag}
                onDragEnd={history.commitDrag}
                onItemsChange={(colIdx, items) =>
                  history.update((prev) => setColumnItems(prev, colIdx, items))
                }
                onWidthsChange={(dividerIdx, dx) =>
                  history.update((prev) => tradeColumnWidth(prev, dividerIdx, dx))
                }
                onMove={(srcCi, srcIi, dstCi, insertIdx) =>
                  history.push((prev) =>
                    moveItemAcrossColumns(prev, srcCi, srcIi, dstCi, insertIdx),
                  )
                }
                canMoveTo={(srcCi, srcIi, dstCi) =>
                  canMoveAcross(layout, srcCi, srcIi, dstCi)
                }
                externalDropTarget={paletteDrag?.target ?? null}
              />
            )}
            {view === 'front' && (
              <FrontView
                layout={layout}
                onPanelClick={handlePanelClick}
                selectedPanelIdx={doorStylePopup?.panelIdx}
              />
            )}
            {view === 'isometric' && <IsometricView layout={layout} />}
          </div>

          <div className="shrink-0 mt-3">
            {view === 'interior' && (
              <ColumnToolbar
                columns={layout.columns}
                onAddColumn={handleAddColumn}
                onDeleteColumn={handleDeleteColumn}
                onEqualize={handleEqualize}
                canAddCol={canAddColumn(layout)}
              />
            )}
            {(view === 'front' || view === 'isometric') && (
              <PanelToolbar
                doors={layout.doors}
                layout={layout}
                onSetSlidingCount={handleSetSlidingCount}
                onPanelClick={handlePanelClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Drag ghost: a small chip that follows the cursor while a palette
          card is being dragged. */}
      {paletteDrag && paletteDrag.started && (
        <div
          className="pointer-events-none fixed z-50 px-3 py-2 rounded-md bg-stone-900 border border-stone-700 text-stone-200 text-xs shadow-xl"
          style={{
            left: paletteDrag.x + 14,
            top: paletteDrag.y + 14,
          }}
        >
          {TYPE_LABELS[paletteDrag.type]}
        </div>
      )}

      {showSpec && (
        <SpecSheet layout={layout} onClose={() => setShowSpec(false)} />
      )}

      {doorStylePopup && layout.doors?.panels[doorStylePopup.panelIdx] && (
        <DoorStylePopup
          panelIdx={doorStylePopup.panelIdx}
          currentStyle={layout.doors.panels[doorStylePopup.panelIdx].style}
          finish={layout.finish}
          onPick={handleStylePick}
          onCancel={() => setDoorStylePopup(null)}
        />
      )}

      {popup && (
        <ComponentEditPopup
          key={`${popup.mode}-${popup.colIdx}-${popup.itemIdx ?? popup.insertIdx}`}
          mode={popup.mode}
          item={selItem}
          itemIdx={popup.mode === 'edit' ? popup.itemIdx : undefined}
          insertIdx={popup.mode === 'add' ? popup.insertIdx : undefined}
          column={selCol}
          totalHeight={layout.dims.height}
          onCancel={() => setPopup(null)}
          onSave={handleSave}
          onDelete={popup.mode === 'edit' ? handleDelete : undefined}
          onRequestAdd={
            popup.mode === 'edit'
              ? (insertIdx) =>
                  setPopup({ mode: 'add', colIdx: popup.colIdx, insertIdx })
              : undefined
          }
        />
      )}
    </div>
  );
}

// True if a column's shelves can yield `deficit` mm (down to minShelfGap).
function canShrinkColumn(items, deficit) {
  if (deficit <= 0.5) return true;
  const minShelf = 318; // minShelfGap + panel — kept inline to avoid extra import
  const available = items.reduce(
    (s, it) => (it.type === 'shelf' ? s + Math.max(0, it.height - minShelf) : s),
    0,
  );
  return available + 0.5 >= deficit;
}
