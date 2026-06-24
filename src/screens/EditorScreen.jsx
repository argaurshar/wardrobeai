import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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
import QuotePanel from '../components/QuotePanel.jsx';
import RateCardEditor from '../components/RateCardEditor.jsx';
import ProjectsPanel from '../components/ProjectsPanel.jsx';
import CutListSheet from '../components/CutListSheet.jsx';
import AuditPanel from '../components/AuditPanel.jsx';
// three.js is heavy — only load it when the 3D tab is opened.
const ThreeView = lazy(() => import('../components/ThreeView.jsx'));
import useLayoutHistory from '../editor/useLayoutHistory.js';
import { loadRateCard, saveRateCard } from '../editor/pricing.js';
import { saveCurrent, buildShareUrl, triggerDownload } from '../editor/storage.js';
import { exportSvgToPng } from '../editor/exportPng.js';
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
  const [rateCard, setRateCard] = useState(loadRateCard);
  const [showRates, setShowRates] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showCutList, setShowCutList] = useState(false);
  const [shareMsg, setShareMsg] = useState(null);
  const canvasRef = useRef(null);

  // --- canvas zoom & pan ----------------------------------------------------
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [view]);

  const zoomBy = (f) =>
    setZoom((z) => Math.min(3, Math.max(1, Math.round(z * f * 100) / 100)));

  // ctrl/cmd + wheel zoom — needs a non-passive listener for preventDefault
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Pan: alt-drag or middle-drag anywhere; plain drag on the cream background
  // when zoomed in. Captured before the SVG's own drag handlers.
  const onCanvasPointerDown = (e) => {
    if (view === '3d') return; // OrbitControls owns interaction in 3D
    const onBackground =
      e.target === e.currentTarget || e.target.dataset?.canvasBg === '1';
    if (!(e.altKey || e.button === 1 || (onBackground && zoom > 1))) return;
    e.preventDefault();
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY, base: pan };
    const move = (ev) =>
      setPan({
        x: start.base.x + ev.clientX - start.x,
        y: start.base.y + ev.clientY - start.y,
      });
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  // Auto-save: the design you were last working on survives a refresh.
  useEffect(() => {
    saveCurrent(layout);
  }, [layout]);

  const handleLoadLayout = (loaded) => {
    history.push(() => ({
      ...loaded,
      finish: loaded.finish ?? DEFAULT_FINISH,
      doors: loaded.doors ?? defaultDoors(loaded.columns),
      hardware: loaded.hardware ?? defaultHardware(),
    }));
  };

  const handleShare = async () => {
    try {
      const url = await buildShareUrl(layout);
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copied ✓');
    } catch {
      setShareMsg('Could not copy link');
    }
    setTimeout(() => setShareMsg(null), 2500);
  };

  const handlePng = async () => {
    const filename = `wardrobe-${view}-${layout.dims.width}x${layout.dims.height}.png`;
    // 3D view renders to a WebGL <canvas>; the others to <svg>.
    const canvas3d = canvasRef.current?.querySelector('canvas');
    if (canvas3d) {
      canvas3d.toBlob((blob) => blob && triggerDownload(blob, filename));
      return;
    }
    const svg = canvasRef.current?.querySelector('svg');
    if (!svg) return;
    try {
      await exportSvgToPng(svg, filename);
    } catch {
      setShareMsg('PNG export failed');
      setTimeout(() => setShareMsg(null), 2500);
    }
  };

  const handleRatesSave = (card) => {
    setRateCard(card);
    saveRateCard(card);
    setShowRates(false);
  };

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
    <div className="min-h-screen lg:h-screen flex flex-col items-center px-3 sm:px-6 lg:px-10 py-4 overflow-y-auto lg:overflow-hidden animate-rise">
      <header className="w-full max-w-[1500px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 shrink-0">
        <div>
          <p className="text-accent text-[11px] uppercase tracking-architectural mb-2">
            Editor — {layout.label}
          </p>
          <h1 className="text-stone-100 text-xl sm:text-2xl font-normal tracking-tight font-mono">
            {layout.dims.width} × {layout.dims.height} × {layout.dims.depth} mm
          </h1>
        </div>
        <div className="flex items-center flex-wrap gap-2 sm:justify-end">
          <button
            onClick={history.undo}
            disabled={!history.canUndo}
            className="px-3 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl/⌘ Z)"
          >
            ↶
          </button>
          <button
            onClick={history.redo}
            disabled={!history.canRedo}
            className="px-3 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl/⌘ ⇧ Z)"
          >
            ↷
          </button>
          <button
            onClick={() => setShowProjects(true)}
            className="px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200"
            title="Save, load, export or import designs"
          >
            Projects
          </button>
          <button
            onClick={handlePng}
            className="px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200"
            title="Download the current view as an image"
          >
            PNG
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200"
            title="Copy a link that opens this exact design"
          >
            {shareMsg ?? 'Share'}
          </button>
          <button
            onClick={() => setShowCutList(true)}
            className="px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200"
            title="Panel cut list and hardware quantities for production"
          >
            Cut list
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

      <div className="w-full max-w-[1500px] flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-h-0">
        <aside className="w-full lg:w-56 shrink-0 order-2 lg:order-1 lg:overflow-y-auto">
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
          <QuotePanel
            layout={layout}
            rateCard={rateCard}
            onEditRates={() => setShowRates(true)}
          />
          <AuditPanel layout={layout} />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col min-h-[60vh] lg:min-h-0 order-1 lg:order-2">
          <div className="flex justify-center mb-3 shrink-0 overflow-x-auto">
            <ViewToggle value={view} onChange={setView} />
          </div>

          <div
            ref={canvasRef}
            onPointerDownCapture={onCanvasPointerDown}
            className="bg-cream rounded-2xl shadow-inset flex-1 min-h-0 relative overflow-hidden"
          >
            {view !== '3d' && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                <ZoomButton label="−" title="Zoom out" onClick={() => zoomBy(1 / 1.25)} />
                <span className="px-2 py-1 rounded-md bg-stone-900/80 text-stone-300 text-[11px] font-mono tabular-nums select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <ZoomButton label="+" title="Zoom in (Ctrl + scroll)" onClick={() => zoomBy(1.25)} />
                {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
                  <ZoomButton
                    label="⤢"
                    title="Reset zoom & pan"
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                  />
                )}
              </div>
            )}
            <div
              data-canvas-bg="1"
              className={
                view === '3d'
                  ? 'w-full h-full'
                  : 'w-full h-full p-4 flex items-center justify-center'
              }
              style={
                view === '3d'
                  ? undefined
                  : {
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      cursor: zoom > 1 ? 'grab' : undefined,
                    }
              }
            >
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
              {view === '3d' && (
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-stone-500 text-sm">
                      Loading 3D…
                    </div>
                  }
                >
                  <ThreeView layout={layout} />
                </Suspense>
              )}
            </div>
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
        <SpecSheet layout={layout} rateCard={rateCard} onClose={() => setShowSpec(false)} />
      )}

      {showRates && (
        <RateCardEditor
          rateCard={rateCard}
          onSave={handleRatesSave}
          onCancel={() => setShowRates(false)}
        />
      )}

      {showCutList && (
        <CutListSheet layout={layout} onClose={() => setShowCutList(false)} />
      )}

      {showProjects && (
        <ProjectsPanel
          layout={layout}
          onLoadLayout={handleLoadLayout}
          onClose={() => setShowProjects(false)}
        />
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

function ZoomButton({ label, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-7 h-7 rounded-md bg-stone-900/80 text-stone-200 text-sm leading-none hover:bg-stone-800 active:scale-95 transition-all duration-150"
    >
      {label}
    </button>
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
