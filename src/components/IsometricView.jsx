import { getFinishColors } from '../editor/finishes.js';
import { computePanelGeometry } from '../editor/doors.js';
import DoorPanel from './DoorPanel.jsx';

// Cabinet projection: front face stays flat, depth offsets up-and-right at
// 30° and is foreshortened by 0.5. Reads well for furniture and means every
// door, handle, hinge, panel style etc. can be drawn on the front face
// using the same coords as FrontView — no extra projection math per item.

const ANGLE_DEG = 30;
const DEPTH_SCALE = 0.5;
const ANGLE = (ANGLE_DEG * Math.PI) / 180;
const COS_A = Math.cos(ANGLE);
const SIN_A = Math.sin(ANGLE);

const INK = {
  dim: '#8d8273',
  text: '#5b4f3b',
};

export default function IsometricView({ layout }) {
  const { dims, doors } = layout;
  const W = dims.width;
  const H = dims.height;
  const D = dims.depth;
  const colors = getFinishColors(layout.finish);

  // Overhead loft — a second projected box stacked on top of the main body.
  const loft = layout.loft;
  const loftOn = !!(loft && loft.enabled);
  const loftBlock = loftOn ? loft.height : 0;
  const loftBays = loftOn ? loft.bays ?? layout.columns.length : 0;

  // Depth → 2D offset. dx is positive (back goes right), dy is negative
  // (back goes UP in SVG coords).
  const dx = D * DEPTH_SCALE * COS_A;
  const dy = -D * DEPTH_SCALE * SIN_A;

  // Padding accounts for the projection extending the drawing up + right.
  const padLeft = 200;
  const padRight = Math.max(140, dx + 40);
  const padTop = Math.max(240, -dy + 80);
  const padBottom = 150;
  const vbW = padLeft + W + dx + padRight - padLeft + padLeft; // = padLeft + (W + dx) + padRight
  const vbH = padTop + loftBlock + H + padBottom;

  const panels = doors ? computePanelGeometry(doors, layout) : [];

  // Tiny shading bump for the top/right faces so they read as separate
  // surfaces rather than blending with the front. Both keep the finish tone.
  const topShade = mixWithBlack(colors.oakDeep, 0.08);
  const sideShade = mixWithBlack(colors.oak, 0.18);

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
          {/* loft top face — the unit's true top surface */}
          <polygon
            points={`0,0 ${W},0 ${W + dx},${dy} ${dx},${dy}`}
            fill={topShade}
            stroke={colors.oakStroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* loft right side */}
          <polygon
            points={`${W},0 ${W + dx},${dy} ${W + dx},${loft.height + dy} ${W},${loft.height}`}
            fill={sideShade}
            stroke={colors.oakStroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <line x1={W} y1={0} x2={W} y2={loft.height} stroke={colors.oakStroke} strokeWidth={2} />
          {/* loft front carcass + doors */}
          <rect x={0} y={0} width={W} height={loft.height} fill={colors.oakStroke} />
          {Array.from({ length: loftBays }).map((_, i) => {
            const dw = W / loftBays;
            const dxi = i * dw;
            const style =
              doors?.panels[i]?.style ?? doors?.panels[0]?.style ?? 'slab';
            return (
              <g key={`ld-${i}`}>
                <DoorPanel x={dxi} y={0} width={dw} height={loft.height} style={style} colors={colors} />
                <rect x={dxi + dw / 2 - 4} y={loft.height - 70} width={8} height={50} rx={3} ry={3} fill={colors.oakStroke} opacity={0.85} />
              </g>
            );
          })}
          <rect x={0} y={0} width={W} height={loft.height} fill="none" stroke={colors.oakStroke} strokeWidth={2} />
          <DoorWidthDims panels={panels} />
          <DepthDim W={W} dx={dx} dy={dy} depth={D} />
        </g>
      )}

      <g transform={`translate(${padLeft} ${padTop + loftBlock})`}>
        {/* Top face — slightly darker so it reads as a separate plane */}
        {!loftOn && (
          <polygon
            points={`0,0 ${W},0 ${W + dx},${dy} ${dx},${dy}`}
            fill={topShade}
            stroke={colors.oakStroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Right side face */}
        <polygon
          points={`${W},0 ${W + dx},${dy} ${W + dx},${H + dy} ${W},${H}`}
          fill={sideShade}
          stroke={colors.oakStroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Side-edge highlight where the front meets the right face */}
        <line
          x1={W}
          y1={0}
          x2={W}
          y2={H}
          stroke={colors.oakStroke}
          strokeWidth={2}
        />

        {/* Front face: dark carcass behind doors so any thin slivers read dark */}
        <rect x={0} y={0} width={W} height={H} fill={colors.oakStroke} />

        {/* Doors */}
        {doors?.type === 'hinged' &&
          panels.map((p, i) => (
            <HingedDoorIso
              key={i}
              x={p.x}
              y={0}
              width={p.width}
              height={H}
              hingeSide={p.hingeSide}
              style={doors.panels[i].style}
              colors={colors}
            />
          ))}
        {doors?.type === 'sliding' && (
          <SlidingDoorsIso
            panels={panels}
            styles={doors.panels.map((p) => p.style)}
            totalH={H}
            colors={colors}
          />
        )}

        {/* Outer outline on the front face */}
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="none"
          stroke={colors.oakStroke}
          strokeWidth={2}
        />

        {/* Door-width dim labels above the front face (loft draws its own) */}
        {!loftOn && <DoorWidthDims panels={panels} />}

        {/* Depth dim label above the right side face (loft draws its own) */}
        {!loftOn && <DepthDim W={W} dx={dx} dy={dy} depth={D} />}
      </g>
    </svg>
  );
}

function HingedDoorIso({ x, y, width, height, hingeSide, style, colors }) {
  const handleX = hingeSide === 'left' ? x + width - 28 : x + 18;
  const hingeX = hingeSide === 'left' ? x + 6 : x + width - 6;
  return (
    <g>
      <DoorPanel x={x} y={y} width={width} height={height} style={style} colors={colors} />
      <line
        x1={hingeX}
        y1={y + height * 0.18}
        x2={hingeX}
        y2={y + height * 0.18 + 80}
        stroke={colors.oakStroke}
        strokeWidth={2}
        opacity={0.55}
      />
      <line
        x1={hingeX}
        y1={y + height * 0.82 - 80}
        x2={hingeX}
        y2={y + height * 0.82}
        stroke={colors.oakStroke}
        strokeWidth={2}
        opacity={0.55}
      />
      <rect
        x={handleX - 4}
        y={y + height / 2 - 70}
        width={8}
        height={140}
        rx={3}
        ry={3}
        fill={colors.oakStroke}
        opacity={0.85}
      />
    </g>
  );
}

function SlidingDoorsIso({ panels, styles, totalH, colors }) {
  const trackH = 24;
  const totalReach = panels.reduce((m, p) => Math.max(m, p.x + p.width), 0);
  return (
    <g>
      <rect x={0} y={0} width={totalReach} height={trackH}
            fill={colors.oakStroke} opacity={0.65} />
      <rect x={0} y={totalH - trackH} width={totalReach} height={trackH}
            fill={colors.oakStroke} opacity={0.65} />
      {panels.map((p, i) => (
        <g key={i}>
          <DoorPanel
            x={p.x}
            y={trackH}
            width={p.width}
            height={totalH - 2 * trackH}
            style={styles[i]}
            colors={colors}
          />
          <rect
            x={i === 0 ? p.x + p.width - 26 : p.x + 18}
            y={trackH + (totalH - 2 * trackH) / 2 - 70}
            width={8}
            height={140}
            rx={3}
            ry={3}
            fill={colors.oakStroke}
            opacity={0.85}
          />
        </g>
      ))}
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

function DepthDim({ W, dx, dy, depth }) {
  // A dim line running along the projected top edge of the right side, with
  // tick marks perpendicular to the slope and a depth label above.
  const ax = W;
  const ay = 0;
  const bx = W + dx;
  const by = dy;
  const tickLen = 14;
  // Perpendicular unit vector (rotated 90° from the line direction)
  const len = Math.hypot(dx, dy);
  const ux = -dy / len; // unit perpendicular (pointing up-and-right)
  const uy = dx / len;
  // Slide the dim line outward so it doesn't sit on top of the wardrobe
  const offset = 60;
  const Ax = ax + ux * offset;
  const Ay = ay + uy * offset;
  const Bx = bx + ux * offset;
  const By = by + uy * offset;
  return (
    <g>
      <line x1={Ax} y1={Ay} x2={Bx} y2={By} stroke={INK.dim} strokeWidth={2} />
      <line
        x1={Ax - ux * tickLen}
        y1={Ay - uy * tickLen}
        x2={Ax + ux * tickLen}
        y2={Ay + uy * tickLen}
        stroke={INK.dim}
        strokeWidth={2}
      />
      <line
        x1={Bx - ux * tickLen}
        y1={By - uy * tickLen}
        x2={Bx + ux * tickLen}
        y2={By + uy * tickLen}
        stroke={INK.dim}
        strokeWidth={2}
      />
      <text
        x={(Ax + Bx) / 2 + ux * 22}
        y={(Ay + By) / 2 + uy * 22}
        fontSize={42}
        fill={INK.text}
        fontFamily="Space Mono, ui-monospace, monospace"
        textAnchor="middle"
        letterSpacing="3"
      >
        {depth}
      </text>
    </g>
  );
}

// Slightly darken a hex colour. Used to differentiate the top + side faces
// from the front face without leaving the finish palette entirely.
function mixWithBlack(hex, amount) {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
