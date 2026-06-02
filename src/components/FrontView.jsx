import { getFinishColors } from '../editor/finishes.js';
import { computePanelGeometry } from '../editor/doors.js';
import { RULES } from '../engine/rules.js';
import DoorPanel from './DoorPanel.jsx';

const INK = {
  dim: '#8d8273',
  text: '#5b4f3b',
};

// FrontView — the wardrobe as a flat front face with doors closed.
// Geometry comes entirely from layout.dims + layout.doors. The interior
// columns are intentionally invisible here (per SPEC F).
export default function FrontView({ layout, onPanelClick, selectedPanelIdx }) {
  const { dims, doors, columns } = layout;
  const W = dims.width;
  const H = dims.height;
  const colors = getFinishColors(layout.finish);

  // Overhead loft — visual band above the main face (derived, not in doors.panels).
  const loft = layout.loft;
  const loftOn = !!(loft && loft.enabled);
  const loftBlock = loftOn ? loft.height : 0;
  const loftBays = loftOn ? loft.bays ?? columns.length : 0;

  // Same padding system as the interior view so the cream panel looks
  // consistent across the view toggle.
  const padLeft = 200;
  const padRight = 130;
  const padTop = 240;
  const padBottom = 150;
  const vbW = padLeft + W + padRight;
  const vbH = padTop + loftBlock + H + padBottom;

  const panels = doors ? computePanelGeometry(doors, layout) : [];
  const interactive = typeof onPanelClick === 'function';

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={vbW}
      height={vbH}
      preserveAspectRatio="xMidYMid meet"
      className="block max-w-full max-h-full w-auto h-auto select-none"
      role="img"
    >
      {loftOn && (
        <g transform={`translate(${padLeft} ${padTop})`}>
          <DoorWidthDims panels={panels} />
          <rect x={0} y={0} width={W} height={loft.height} fill={colors.oakStroke} />
          {Array.from({ length: loftBays }).map((_, i) => {
            const dw = W / loftBays;
            const dx = i * dw;
            const style =
              doors?.panels[i]?.style ?? doors?.panels[0]?.style ?? 'slab';
            return (
              <g key={`loftdoor-${i}`}>
                <DoorPanel
                  x={dx}
                  y={0}
                  width={dw}
                  height={loft.height}
                  style={style}
                  colors={colors}
                />
                <rect
                  x={dx + dw / 2 - 4}
                  y={loft.height - 70}
                  width={8}
                  height={50}
                  rx={3}
                  ry={3}
                  fill={colors.oakStroke}
                  opacity={0.85}
                  pointerEvents="none"
                />
              </g>
            );
          })}
          <rect
            x={0}
            y={0}
            width={W}
            height={loft.height}
            fill="none"
            stroke={colors.oakStroke}
            strokeWidth={2}
          />
        </g>
      )}

      <g transform={`translate(${padLeft} ${padTop + loftBlock})`}>
        {/* Carcass body sits behind the doors — only thin slivers visible. */}
        <rect x={0} y={0} width={W} height={H} fill={colors.oakStroke} />

        {/* Doors */}
        {doors?.type === 'hinged' &&
          panels.map((p, i) => (
            <HingedDoor
              key={i}
              x={p.x}
              y={0}
              width={p.width}
              height={H}
              hingeSide={p.hingeSide}
              style={doors.panels[i].style}
              colors={colors}
              selected={selectedPanelIdx === i}
              onClick={interactive ? () => onPanelClick(i) : undefined}
            />
          ))}

        {doors?.type === 'sliding' && (
          <SlidingDoors
            panels={panels}
            styles={doors.panels.map((p) => p.style)}
            totalH={H}
            colors={colors}
            selectedPanelIdx={selectedPanelIdx}
            onPanelClick={interactive ? onPanelClick : undefined}
          />
        )}

        {/* Outer outline last so it sits on top of the doors' edges. */}
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="none"
          stroke={colors.oakStroke}
          strokeWidth={2}
        />

        {/* Dimension labels — door widths across the top (loft draws its own). */}
        {!loftOn && <DoorWidthDims panels={panels} />}
      </g>
    </svg>
  );
}

function HingedDoor({ x, y, width, height, hingeSide, style, colors, selected, onClick }) {
  const handleX = hingeSide === 'left' ? x + width - 28 : x + 18;
  const hingeX = hingeSide === 'left' ? x + 6 : x + width - 6;

  return (
    <g
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <DoorPanel
        x={x}
        y={y}
        width={width}
        height={height}
        style={style}
        colors={colors}
      />
      {/* Click overlay for reliable hit-testing across all styles */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        pointerEvents={onClick ? 'all' : 'none'}
      />
      {/* Hinge marks — only meaningful on hinged doors */}
      <line
        x1={hingeX}
        y1={y + height * 0.18}
        x2={hingeX}
        y2={y + height * 0.18 + 80}
        stroke={colors.oakStroke}
        strokeWidth={2}
        opacity={0.55}
        pointerEvents="none"
      />
      <line
        x1={hingeX}
        y1={y + height * 0.82 - 80}
        x2={hingeX}
        y2={y + height * 0.82}
        stroke={colors.oakStroke}
        strokeWidth={2}
        opacity={0.55}
        pointerEvents="none"
      />
      {/* Handle on the opening side */}
      <rect
        x={handleX - 4}
        y={y + height / 2 - 70}
        width={8}
        height={140}
        rx={3}
        ry={3}
        fill={colors.oakStroke}
        opacity={0.85}
        pointerEvents="none"
      />
      {selected && (
        <rect
          x={x + 2}
          y={y + 2}
          width={width - 4}
          height={height - 4}
          fill="none"
          stroke="#1f1814"
          strokeWidth={4}
          strokeDasharray="14 8"
          pointerEvents="none"
        />
      )}
    </g>
  );
}

function SlidingDoors({ panels, styles, totalH, colors, selectedPanelIdx, onPanelClick }) {
  const trackH = 24;
  const totalReach = panels.reduce((m, p) => Math.max(m, p.x + p.width), 0);
  return (
    <g>
      {/* Track plates */}
      <rect x={0} y={0} width={totalReach} height={trackH}
            fill={colors.oakStroke} opacity={0.65} />
      <rect x={0} y={totalH - trackH} width={totalReach} height={trackH}
            fill={colors.oakStroke} opacity={0.65} />
      {panels.map((p, i) => (
        <g
          key={i}
          onClick={onPanelClick ? () => onPanelClick(i) : undefined}
          style={onPanelClick ? { cursor: 'pointer' } : undefined}
        >
          <DoorPanel
            x={p.x}
            y={trackH}
            width={p.width}
            height={totalH - 2 * trackH}
            style={styles[i]}
            colors={colors}
          />
          <rect
            x={p.x}
            y={trackH}
            width={p.width}
            height={totalH - 2 * trackH}
            fill="transparent"
            pointerEvents={onPanelClick ? 'all' : 'none'}
          />
          {/* Handle near outer-most edge */}
          <rect
            x={i === 0 ? p.x + p.width - 26 : p.x + 18}
            y={trackH + (totalH - 2 * trackH) / 2 - 70}
            width={8}
            height={140}
            rx={3}
            ry={3}
            fill={colors.oakStroke}
            opacity={0.85}
            pointerEvents="none"
          />
          {selectedPanelIdx === i && (
            <rect
              x={p.x + 2}
              y={trackH + 2}
              width={p.width - 4}
              height={totalH - 2 * trackH - 4}
              fill="none"
              stroke="#1f1814"
              strokeWidth={4}
              strokeDasharray="14 8"
              pointerEvents="none"
            />
          )}
        </g>
      ))}
      {/* Overlap shadow line at each bypass joint */}
      {panels.slice(0, -1).map((p, i) => (
        <line
          key={`ov-${i}`}
          x1={panels[i + 1].x}
          y1={trackH}
          x2={panels[i + 1].x}
          y2={totalH - trackH}
          stroke={colors.oakStroke}
          strokeWidth={1}
          opacity={0.35}
          pointerEvents="none"
        />
      ))}
    </g>
  );
}

function DoorWidthDims({ panels }) {
  const y = -100;
  return (
    <g>
      {panels.map((p, i) => {
        const x1 = p.x;
        const x2 = p.x + p.width;
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
              {Math.round(p.width)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
