import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { minHeightFor } from '../editor/columnOps.js';
import { getFinishColors } from '../editor/finishes.js';

const PANEL = 18; // carcass / shelf thickness in mm — must match engine RULES.panelThickness

// Colours that don't depend on finish — dimension labels, drop indicator,
// selection ink. These stay constant so the architectural-drawing context
// reads the same on every wardrobe.
const INK = {
  dim: '#8d8273',
  text: '#5b4f3b',
  textFaint: '#9a8a6f',
  drop: '#1f1814',
  dropBad: '#b04a3a',
};

const DRAG_THRESHOLD_PX = 6;

// Engine y is measured from the floor; SVG y from the top.
// Inside the translated <g>, cavity coords run 0..W horizontally and 0..H
// vertically with y=0 at the cavity ceiling.
const flipY = (engineY, itemHeight, totalH) => totalH - engineY - itemHeight;

const WardrobeSVG = forwardRef(function WardrobeSVG({
  layout,
  onItemClick,
  selected,
  onItemsChange, // (colIdx, items) — fired live during boundary resize
  onWidthsChange, // (dividerIdx, dx) — fired live during column-divider drag
  onMove, // (srcCi, srcIi, dstCi, insertIdx) — fired on reorder/cross-col drop
  onDragBegin, // () — continuous drag started (resize or divider)
  onDragEnd, // () — continuous drag ended; commit to history
  canMoveTo, // (srcCi, srcIi, dstCi) => boolean — used to colour the drop indicator
  externalDropTarget, // { ci, insertIdx, allowed } — from palette drag in parent
}, ref) {
  const interactive = typeof onItemClick === 'function';
  const canResize = typeof onItemsChange === 'function';
  const canReorder = typeof onMove === 'function';
  const canDragDivider = typeof onWidthsChange === 'function';

  const { dims, columns } = layout;
  const W = dims.width;
  const H = dims.height;

  // Overhead loft (additive band drawn above the main cavity). The main
  // cavity engine/columnOps are untouched — the loft only shifts the drawing.
  const loft = layout.loft;
  const loftOn = !!(loft && loft.enabled);
  const loftBlock = loftOn ? loft.height : 0;

  // Finish-aware palette. Resize handles inherit the wardrobe's outline tone
  // so they read against the chosen finish.
  const finishColors = getFinishColors(layout.finish);
  const C = {
    ...finishColors,
    ...INK,
    resize: finishColors.oakStroke,
  };

  // Padding (in mm coord space) for the dimension labels around the drawing.
  const padLeft = 200;
  const padRight = 130;
  const padTop = 240;
  const padBottom = 150;
  const vbW = padLeft + W + padRight;
  const vbH = padTop + loftBlock + H + padBottom;

  // Per-column left edge in cavity coords. Walks the columns so widths can vary.
  const colStartX = (i) => {
    let x = PANEL;
    for (let k = 0; k < i; k++) x += columns[k].width + PANEL;
    return x;
  };

  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  dragRef.current = drag;

  // Converts a clientX/Y pixel pair to cavity-local coords in mm.
  const cavityFromClient = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = new DOMPoint(clientX, clientY);
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x - padLeft, y: local.y - padTop - loftBlock };
  };

  // Cavity-x → column index (returns -1 if cursor is over carcass or a divider).
  const colIdxFromCavityX = (cavX) => {
    let x = PANEL;
    for (let i = 0; i < columns.length; i++) {
      if (cavX >= x && cavX < x + columns[i].width) return i;
      x += columns[i].width + PANEL;
    }
    return -1;
  };

  // Imperative API used by the parent to hit-test a client-space cursor.
  // Returns null if the cursor isn't over a valid drop slot in a column.
  useImperativeHandle(
    ref,
    () => ({
      hitTest(clientX, clientY) {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          return null;
        }
        const cav = cavityFromClient(clientX, clientY);
        const ci = colIdxFromCavityX(cav.x);
        if (ci < 0) return null;
        const insertIdx = computeInsertIdx(columns[ci].items, cav.y, H);
        return { ci, insertIdx };
      },
    }),
    // Recompute when layout shape changes so the hit test sees current columns.
    [columns, H],
  );

  useEffect(() => {
    if (!drag) return;

    const onMoveEv = (e) => {
      const d = dragRef.current;
      if (!d) return;

      if (d.kind === 'resize') {
        const cav = cavityFromClient(e.clientX, e.clientY);
        let dy = cav.y - d.startCavY;
        const lower = { ...d.initialItems[d.betweenIdx] };
        const upper = { ...d.initialItems[d.betweenIdx + 1] };
        const minL = minHeightFor(lower.type);
        const minU = minHeightFor(upper.type);
        const maxDownDy = lower.height - minL;
        const maxUpDy = upper.height - minU;
        if (dy > maxDownDy) dy = maxDownDy;
        if (dy < -maxUpDy) dy = -maxUpDy;
        lower.height = Math.round(lower.height - dy);
        upper.height = Math.round(upper.height + dy);
        const items = d.initialItems.map((it, i) => {
          if (i === d.betweenIdx) return lower;
          if (i === d.betweenIdx + 1) return upper;
          return it;
        });
        onItemsChange?.(d.ci, items);
      } else if (d.kind === 'divider') {
        const cav = cavityFromClient(e.clientX, e.clientY);
        const dx = Math.round(cav.x - d.startCavX);
        onWidthsChange?.(d.dividerIdx, dx);
      } else if (d.kind === 'item') {
        const dist = Math.hypot(
          e.clientX - d.startClientX,
          e.clientY - d.startClientY,
        );
        if (dist <= DRAG_THRESHOLD_PX && !d.didMove) return;
        const cav = cavityFromClient(e.clientX, e.clientY);
        const dstCi = colIdxFromCavityX(cav.x);
        const dstItems = dstCi >= 0 ? columns[dstCi].items : [];
        const insertIdx = dstCi >= 0 ? computeInsertIdx(dstItems, cav.y, H) : -1;
        const allowed =
          dstCi >= 0 &&
          (!canMoveTo || canMoveTo(d.ci, d.ii, dstCi));
        setDrag((prev) =>
          prev
            ? {
                ...prev,
                didMove: true,
                currentDstCi: dstCi,
                currentInsertIdx: insertIdx,
                currentAllowed: allowed,
              }
            : prev,
        );
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === 'resize' || d.kind === 'divider') {
        onDragEnd?.();
      } else if (d.kind === 'item') {
        if (d.didMove) {
          const sameSlot =
            d.currentDstCi === d.ci &&
            (d.currentInsertIdx === d.ii || d.currentInsertIdx === d.ii + 1);
          if (
            d.currentDstCi !== undefined &&
            d.currentDstCi >= 0 &&
            d.currentAllowed &&
            !sameSlot
          ) {
            onMove?.(d.ci, d.ii, d.currentDstCi, d.currentInsertIdx);
          }
        } else {
          onItemClick?.(d.ci, d.ii);
        }
      }
      setDrag(null);
    };

    document.addEventListener('pointermove', onMoveEv);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMoveEv);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const beginItemDrag = (e, ci, ii) => {
    if (!interactive) return;
    e.preventDefault();
    setDrag({
      kind: 'item',
      ci,
      ii,
      startClientX: e.clientX,
      startClientY: e.clientY,
      didMove: false,
    });
  };

  const beginResize = (e, ci, betweenIdx) => {
    if (!canResize) return;
    e.preventDefault();
    e.stopPropagation();
    onDragBegin?.();
    setDrag({
      kind: 'resize',
      ci,
      betweenIdx,
      startCavY: cavityFromClient(e.clientX, e.clientY).y,
      initialItems: columns[ci].items.map((it) => ({ ...it })),
    });
  };

  const beginDividerDrag = (e, dividerIdx) => {
    if (!canDragDivider) return;
    e.preventDefault();
    e.stopPropagation();
    onDragBegin?.();
    setDrag({
      kind: 'divider',
      dividerIdx,
      startCavX: cavityFromClient(e.clientX, e.clientY).x,
    });
  };

  const isSelected = (ci, ii) =>
    selected && selected.colIdx === ci && selected.itemIdx === ii;
  const isDraggingItem = (ci, ii) =>
    drag &&
    drag.kind === 'item' &&
    drag.didMove &&
    drag.ci === ci &&
    drag.ii === ii;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={vbW}
      height={vbH}
      preserveAspectRatio="xMidYMid meet"
      className="block max-w-full max-h-full w-auto h-auto select-none"
      role="img"
      style={{ touchAction: drag ? 'none' : undefined }}
    >
      {/* Shared gradient for shelf-light wash. objectBoundingBox = scales to
          whatever rect references it, so one def covers every lit shelf. */}
      <defs>
        <linearGradient id="shelf-light-wash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff4d6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff4d6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {loftOn && (
        <g transform={`translate(${padLeft} ${padTop})`}>
          {/* column-width dims sit above the loft when a loft is present */}
          <ColumnWidthDims columns={columns} colStartX={colStartX} />
          {/* loft top panel + jambs */}
          <rect x={0} y={0} width={W} height={PANEL} fill={C.oakDeep} />
          <rect x={0} y={0} width={PANEL} height={loft.height} fill={C.oakDeep} />
          <rect x={W - PANEL} y={0} width={PANEL} height={loft.height} fill={C.oakDeep} />
          {/* loft cavity (its floor is the wardrobe's top panel, drawn by the main group) */}
          <rect
            x={PANEL}
            y={PANEL}
            width={W - 2 * PANEL}
            height={Math.max(0, loft.height - PANEL)}
            fill={C.compartment}
          />
          {/* loft bay dividers — aligned to the interior columns */}
          {columns.slice(1).map((_, i) => (
            <rect
              key={`loftdiv-${i}`}
              x={colStartX(i + 1) - PANEL}
              y={0}
              width={PANEL}
              height={loft.height}
              fill={C.oakDeep}
            />
          ))}
          {/* optional mid shelf */}
          {loft.shelf && (
            <rect
              x={PANEL}
              y={loft.height / 2 - PANEL / 2}
              width={W - 2 * PANEL}
              height={PANEL}
              fill={C.oakDeep}
            />
          )}
          {/* loft outline */}
          <rect
            x={0}
            y={0}
            width={W}
            height={loft.height}
            fill="none"
            stroke={C.oakStroke}
            strokeWidth={2}
          />
          <text
            x={W / 2}
            y={loft.shelf ? loft.height * 0.28 : loft.height / 2}
            fontSize={40}
            fill={C.textFaint}
            fontFamily="Space Mono, ui-monospace, monospace"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="4"
            pointerEvents="none"
          >
            LOFT {Math.round(loft.height)}
          </text>
        </g>
      )}

      <g transform={`translate(${padLeft} ${padTop + loftBlock})`}>
        {/* inner cavity fill */}
        <rect
          x={PANEL}
          y={PANEL}
          width={W - 2 * PANEL}
          height={H - 2 * PANEL}
          fill={C.compartment}
        />

        {/* outer carcass */}
        <rect x={0} y={0} width={W} height={PANEL} fill={C.oakDeep} />
        <rect x={0} y={H - PANEL} width={W} height={PANEL} fill={C.oakDeep} />
        <rect x={0} y={0} width={PANEL} height={H} fill={C.oakDeep} />
        <rect x={W - PANEL} y={0} width={PANEL} height={H} fill={C.oakDeep} />

        {/* inner column dividers */}
        {columns.slice(1).map((_, i) => (
          <rect
            key={`div-${i}`}
            x={colStartX(i + 1) - PANEL}
            y={0}
            width={PANEL}
            height={H}
            fill={C.oakDeep}
          />
        ))}

        {/* components, per column */}
        {columns.map((col, ci) =>
          col.items.map((it, ii) => {
            const cx = colStartX(ci);
            const sy = flipY(it.y, it.height, H);
            const sel = isSelected(ci, ii);
            const dragging = isDraggingItem(ci, ii);
            return (
              <g
                key={`it-${ci}-${ii}`}
                onPointerDown={(e) => beginItemDrag(e, ci, ii)}
                style={{
                  cursor: interactive ? (canReorder ? 'grab' : 'pointer') : 'default',
                  opacity: dragging ? 0.45 : 1,
                }}
              >
                <ItemShape
                  item={it}
                  x={cx}
                  y={sy}
                  width={col.width}
                  height={it.height}
                  colors={finishColors}
                />
                {interactive && (
                  <rect
                    x={cx}
                    y={sy}
                    width={col.width}
                    height={it.height}
                    fill="transparent"
                    pointerEvents="all"
                  />
                )}
                {sel && (
                  <rect
                    x={cx + 2}
                    y={sy + 2}
                    width={col.width - 4}
                    height={it.height - 4}
                    fill="none"
                    stroke={C.drop}
                    strokeWidth={4}
                    strokeDasharray="14 8"
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          }),
        )}

        {/* resize handles between adjacent items */}
        {canResize &&
          columns.map((col, ci) =>
            col.items.slice(0, -1).map((it, ii) => {
              const boundaryY = flipY(it.y, it.height, H);
              const cx = colStartX(ci);
              const hotHeight = 18;
              return (
                <g
                  key={`rs-${ci}-${ii}`}
                  onPointerDown={(e) => beginResize(e, ci, ii)}
                  style={{ cursor: 'ns-resize' }}
                >
                  <rect
                    x={cx}
                    y={boundaryY - hotHeight / 2}
                    width={col.width}
                    height={hotHeight}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  <line
                    x1={cx + col.width * 0.35}
                    y1={boundaryY}
                    x2={cx + col.width * 0.65}
                    y2={boundaryY}
                    stroke={C.resize}
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.55}
                    pointerEvents="none"
                  />
                </g>
              );
            }),
          )}

        {/* column divider drag handles */}
        {canDragDivider &&
          columns.slice(1).map((_, i) => {
            const dividerX = colStartX(i + 1) - PANEL;
            const hotWidth = 30;
            return (
              <g
                key={`cdv-${i}`}
                onPointerDown={(e) => beginDividerDrag(e, i)}
                style={{ cursor: 'ew-resize' }}
              >
                <rect
                  x={dividerX + PANEL / 2 - hotWidth / 2}
                  y={0}
                  width={hotWidth}
                  height={H}
                  fill="transparent"
                  pointerEvents="all"
                />
                <line
                  x1={dividerX + PANEL / 2}
                  y1={H * 0.45}
                  x2={dividerX + PANEL / 2}
                  y2={H * 0.55}
                  stroke="#f6efdc"
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.55}
                  pointerEvents="none"
                />
              </g>
            );
          })}

        {/* outer carcass outline on top */}
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="none"
          stroke={C.oakStroke}
          strokeWidth={2}
        />

        {/* drop indicator while reordering */}
        {drag &&
          drag.kind === 'item' &&
          drag.didMove &&
          drag.currentDstCi !== undefined &&
          drag.currentDstCi >= 0 && (
            <DropIndicator
              items={columns[drag.currentDstCi].items}
              insertIdx={drag.currentInsertIdx}
              colStartX={colStartX(drag.currentDstCi)}
              colWidth={columns[drag.currentDstCi].width}
              totalH={H}
              allowed={drag.currentAllowed}
            />
          )}

        {/* drop indicator from external (palette) drag */}
        {externalDropTarget &&
          externalDropTarget.ci !== undefined &&
          externalDropTarget.ci >= 0 && (
            <DropIndicator
              items={columns[externalDropTarget.ci].items}
              insertIdx={externalDropTarget.insertIdx}
              colStartX={colStartX(externalDropTarget.ci)}
              colWidth={columns[externalDropTarget.ci].width}
              totalH={H}
              allowed={externalDropTarget.allowed !== false}
            />
          )}

        {/* column-width dimensions above the wardrobe (loft draws its own) */}
        {!loftOn && <ColumnWidthDims columns={columns} colStartX={colStartX} />}

        {/* per-item height labels */}
        {columns.map((col, ci) =>
          col.items.map((it, ii) => {
            const cx = colStartX(ci);
            const sy = flipY(it.y, it.height, H);
            const lx = cx + 26;
            const ly = sy + it.height / 2;
            return (
              <text
                key={`hl-${ci}-${ii}`}
                x={lx}
                y={ly}
                fontSize={42}
                fill={C.textFaint}
                fontFamily="Space Mono, ui-monospace, monospace"
                transform={`rotate(-90 ${lx} ${ly})`}
                textAnchor="middle"
                dominantBaseline="middle"
                letterSpacing="2"
                pointerEvents="none"
              >
                {Math.round(it.height)}
              </text>
            );
          }),
        )}
      </g>
    </svg>
  );
});

export default WardrobeSVG;

// Insert index using cavity-space cursor y. Index 0 = bottom of column,
// items.length = top.
function computeInsertIdx(items, cursorCavY, totalH) {
  if (items.length === 0) return 0;
  const bands = items.map((it, i) => ({
    i,
    top: totalH - it.y - it.height,
    bottom: totalH - it.y,
  }));
  const topmost = bands[bands.length - 1];
  if (cursorCavY < topmost.top) return items.length;
  const bottommost = bands[0];
  if (cursorCavY > bottommost.bottom) return 0;
  const inside = bands.find((b) => cursorCavY >= b.top && cursorCavY < b.bottom);
  if (!inside) return 0;
  const mid = (inside.top + inside.bottom) / 2;
  return cursorCavY < mid ? inside.i + 1 : inside.i;
}

function ColumnWidthDims({ columns, colStartX }) {
  const y = -100;
  return (
    <g>
      {columns.map((col, i) => {
        const x1 = colStartX(i);
        const x2 = x1 + col.width;
        const cx = (x1 + x2) / 2;
        return (
          <g key={`dim-${i}`}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke={INK.dim} strokeWidth={2} />
            <line x1={x1} y1={y - 14} x2={x1} y2={y + 14} stroke={INK.dim} strokeWidth={2} />
            <line x1={x2} y1={y - 14} x2={x2} y2={y + 14} stroke={INK.dim} strokeWidth={2} />
            <text
              x={cx}
              y={y - 28}
              fontSize={52}
              fill={INK.text}
              fontFamily="Space Mono, ui-monospace, monospace"
              textAnchor="middle"
              letterSpacing="3"
            >
              {col.width}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function DropIndicator({ items, insertIdx, colStartX, colWidth, totalH, allowed }) {
  if (insertIdx === undefined || insertIdx < 0) return null;
  let y;
  if (insertIdx <= 0) {
    y = totalH - PANEL;
  } else if (insertIdx >= items.length) {
    if (items.length === 0) {
      y = PANEL;
    } else {
      const top = items[items.length - 1];
      y = totalH - top.y - top.height;
    }
  } else {
    const upper = items[insertIdx];
    y = totalH - upper.y;
  }
  const outline = allowed ? '#0a0907' : INK.dropBad;
  const inner = allowed ? '#f1e7d2' : '#f4ddd0';
  return (
    <g pointerEvents="none">
      <line
        x1={colStartX - 4}
        y1={y}
        x2={colStartX + colWidth + 4}
        y2={y}
        stroke={outline}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1={colStartX - 4}
        y1={y}
        x2={colStartX + colWidth + 4}
        y2={y}
        stroke={inner}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
}

function ItemShape({ item, x, y, width, height, colors }) {
  switch (item.type) {
    case 'shelf': {
      // The shelf bar sits at the top of the item; the compartment runs below
      // it until the next item / bottom panel. When lit, an LED strip glow
      // line sits just under the bar and a warm wash fades down the
      // compartment.
      const washHeight = Math.min(420, height - PANEL);
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={PANEL}
            fill={colors.oakDeep}
            stroke={colors.oakStroke}
            strokeWidth={1}
          />
          {item.lit && washHeight > 0 && (
            <g pointerEvents="none">
              <rect
                x={x}
                y={y + PANEL}
                width={width}
                height={washHeight}
                fill="url(#shelf-light-wash)"
              />
              <line
                x1={x + 6}
                y1={y + PANEL + 2}
                x2={x + width - 6}
                y2={y + PANEL + 2}
                stroke="#fff4d6"
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.95}
              />
            </g>
          )}
        </g>
      );
    }

    case 'drawer': {
      const handleY = y + Math.min(40, height * 0.25);
      return (
        <g>
          <rect
            x={x + 3}
            y={y + 3}
            width={width - 6}
            height={height - 6}
            fill={colors.oak}
            stroke={colors.oakStroke}
            strokeWidth={2}
          />
          <line
            x1={x + width * 0.35}
            y1={handleY}
            x2={x + width * 0.65}
            y2={handleY}
            stroke={colors.oakStroke}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
      );
    }

    case 'hanging': {
      const railY = y + 40;
      const railX1 = x + 24;
      const railX2 = x + width - 24;
      const hangerCount = 4;
      const hangerHeight = Math.min(height - 80, 720);
      return (
        <g>
          <line
            x1={railX1}
            y1={railY}
            x2={railX2}
            y2={railY}
            stroke={colors.rail}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={railX1} cy={railY} r={5} fill={colors.rail} />
          <circle cx={railX2} cy={railY} r={5} fill={colors.rail} />
          {Array.from({ length: hangerCount }).map((_, i) => {
            const hx =
              railX1 + ((railX2 - railX1) * (i + 0.5)) / hangerCount;
            return (
              <line
                key={i}
                x1={hx}
                y1={railY + 6}
                x2={hx}
                y2={railY + hangerHeight}
                stroke={colors.rail}
                strokeWidth={1.5}
                opacity={0.32}
              />
            );
          })}
        </g>
      );
    }

    case 'shoeRack': {
      const rows = Math.max(2, Math.floor(height / 220));
      return (
        <g>
          {Array.from({ length: rows }).map((_, i) => {
            const slotH = height / rows;
            const ty = y + slotH * (i + 0.5);
            return (
              <line
                key={i}
                x1={x + 8}
                y1={ty + 18}
                x2={x + width - 8}
                y2={ty - 18}
                stroke={colors.oakStroke}
                strokeWidth={2}
              />
            );
          })}
        </g>
      );
    }

    case 'trouserRack': {
      const rods = 4;
      return (
        <g>
          <rect
            x={x + 6}
            y={y + 4}
            width={width - 12}
            height={height - 8}
            fill="none"
            stroke={colors.oakStroke}
            strokeWidth={2}
          />
          {Array.from({ length: rods }).map((_, i) => {
            const ry = y + 4 + ((height - 8) * (i + 0.5)) / rods;
            return (
              <line
                key={i}
                x1={x + 12}
                y1={ry}
                x2={x + width - 12}
                y2={ry}
                stroke={colors.rail}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      );
    }

    case 'wireBasket': {
      const verticals = 8;
      const horizontals = 3;
      return (
        <g>
          <rect
            x={x + 6}
            y={y + 6}
            width={width - 12}
            height={height - 12}
            fill="none"
            stroke={colors.oakStroke}
            strokeWidth={2.5}
          />
          {Array.from({ length: verticals }).map((_, i) => {
            const mx = x + 6 + ((width - 12) * (i + 1)) / (verticals + 1);
            return (
              <line
                key={`v${i}`}
                x1={mx}
                y1={y + 9}
                x2={mx}
                y2={y + height - 9}
                stroke={colors.oakStroke}
                strokeWidth={1}
                opacity={0.4}
              />
            );
          })}
          {Array.from({ length: horizontals }).map((_, i) => {
            const my = y + 6 + ((height - 12) * (i + 1)) / (horizontals + 1);
            return (
              <line
                key={`h${i}`}
                x1={x + 9}
                y1={my}
                x2={x + width - 9}
                y2={my}
                stroke={colors.oakStroke}
                strokeWidth={1}
                opacity={0.4}
              />
            );
          })}
        </g>
      );
    }

    case 'valetRod': {
      const ry = y + height / 2;
      return (
        <g>
          <circle cx={x + 18} cy={ry} r={4} fill={colors.rail} />
          <line
            x1={x + 18}
            y1={ry}
            x2={x + width - 36}
            y2={ry}
            stroke={colors.rail}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d={`M ${x + width - 36} ${ry} q 20 0 20 20`}
            fill="none"
            stroke={colors.rail}
            strokeWidth={3}
          />
        </g>
      );
    }

    case 'tieRack': {
      const px = x + 26;
      const pegs = 5;
      const pegLen = Math.min(width - 52, 140);
      return (
        <g>
          <line
            x1={px}
            y1={y + 10}
            x2={px}
            y2={y + height - 10}
            stroke={colors.oakStroke}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {Array.from({ length: pegs }).map((_, i) => {
            const py = y + 10 + ((height - 20) * (i + 0.5)) / pegs;
            return (
              <line
                key={i}
                x1={px}
                y1={py}
                x2={px + pegLen}
                y2={py}
                stroke={colors.rail}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      );
    }

    default:
      return null;
  }
}
