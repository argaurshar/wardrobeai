import { getStyleSrc } from '../editor/doors.js';

// DoorPanel — renders a single closed door / sliding panel in one of the
// 5 built-in styles OR a custom image-based design from CUSTOM_DESIGNS.
// Slab / Shaker / Fluted use the finish colour; Glass and Mirror are their
// own materials (finish ignored). Custom designs are image fills and also
// ignore the finish.

const GLASS = {
  tint: '#dde7ee',
  edge: '#9eb2c1',
};

const MIRROR = {
  base: '#c6cad0',
  hi: '#e9edf2',
  lo: '#9aa0a8',
  edge: '#5a626c',
};

const GAP = 3; // small inset between adjacent panels so they read as separate

// Styles whose face is the finish material and can carry a wood grain.
const GRAINED_STYLES = ['slab', 'shaker', 'fluted'];

export default function DoorPanel({ x, y, width, height, style, colors }) {
  const dx = x + GAP / 2;
  const dy = y + GAP / 2;
  const dw = width - GAP;
  const dh = height - GAP;
  const grained = GRAINED_STYLES.includes(style) && colors.grain;
  return (
    <g>
      <PanelFill x={dx} y={dy} width={dw} height={dh} style={style} colors={colors} />
      {grained && (
        <GrainOverlay x={dx} y={dy} width={dw} height={dh} stroke={colors.oakStroke} />
      )}
    </g>
  );
}

// Subtle vertical wood grain: gently waving strokes at low opacity, clipped
// to the panel. Deterministic (no Math.random) so renders are stable.
function GrainOverlay({ x, y, width, height, stroke }) {
  const clipId = `grain-clip-${Math.round(x)}-${Math.round(y)}`;
  const paths = [];
  const spacing = 26;
  for (let i = 0, gx = x + spacing * 0.6; gx < x + width - 4; i += 1, gx += spacing) {
    // pseudo-random but deterministic wobble per line
    const seed = ((i * 73) % 17) / 17;
    const amp = 3 + seed * 6;
    const w = 0.8 + seed * 1.2;
    const op = 0.06 + seed * 0.08;
    const midY = y + height / 2 + (seed - 0.5) * height * 0.2;
    paths.push(
      <path
        key={i}
        d={`M ${gx} ${y} C ${gx + amp} ${y + height * 0.25}, ${gx - amp} ${midY}, ${gx + amp * 0.5} ${y + height * 0.75} S ${gx} ${y + height}, ${gx} ${y + height}`}
        fill="none"
        stroke={stroke}
        strokeWidth={w}
        opacity={op}
      />,
    );
  }
  return (
    <g>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={width} height={height} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>{paths}</g>
    </g>
  );
}

function PanelFill({ x, y, width, height, style, colors }) {
  switch (style) {
    case 'slab':
      return (
        <g>
          <rect x={x} y={y} width={width} height={height}
                fill={colors.oak} stroke={colors.oakStroke} strokeWidth={2} />
          <rect x={x + 14} y={y + 14} width={width - 28} height={height - 28}
                fill="none" stroke={colors.oakStroke} strokeOpacity={0.18} strokeWidth={1} />
        </g>
      );

    case 'shaker': {
      const fr = Math.max(60, Math.min(width, height) * 0.085); // frame width
      return (
        <g>
          {/* Outer frame */}
          <rect x={x} y={y} width={width} height={height}
                fill={colors.oak} stroke={colors.oakStroke} strokeWidth={2} />
          {/* Recessed inner panel — slightly darker to hint at depth */}
          <rect x={x + fr} y={y + fr} width={width - 2 * fr} height={height - 2 * fr}
                fill={colors.oakDeep} opacity={0.78} stroke={colors.oakStroke}
                strokeWidth={1.5} />
          {/* Inner highlight on top edge of the recess to add lift */}
          <line x1={x + fr} y1={y + fr}
                x2={x + width - fr} y2={y + fr}
                stroke="#ffffff" strokeWidth={1} opacity={0.18} />
        </g>
      );
    }

    case 'glass':
      return (
        <g>
          {/* Pane: a cool light tint at low opacity, edged in cooler grey. */}
          <rect x={x} y={y} width={width} height={height}
                fill={GLASS.tint} opacity={0.72}
                stroke={GLASS.edge} strokeWidth={2} />
          {/* Inner frame to suggest a glazing bead */}
          <rect x={x + 18} y={y + 18} width={width - 36} height={height - 36}
                fill="none" stroke={GLASS.edge} strokeWidth={1} opacity={0.45} />
          {/* Diagonal reflection streaks for a frosted-glass feel */}
          <g opacity={0.32} clipPath={`inset(0 0 0 0)`}>
            <line x1={x + width * 0.1} y1={y + height * 0.05}
                  x2={x + width * 0.45} y2={y + height * 0.45}
                  stroke="#ffffff" strokeWidth={26} strokeLinecap="round" opacity={0.55} />
            <line x1={x + width * 0.55} y1={y + height * 0.35}
                  x2={x + width * 0.85} y2={y + height * 0.7}
                  stroke="#ffffff" strokeWidth={14} strokeLinecap="round" opacity={0.4} />
          </g>
        </g>
      );

    case 'mirror': {
      const gradId = `mirror-grad-${Math.round(x)}-${Math.round(y)}`;
      return (
        <g>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={MIRROR.hi} />
              <stop offset="55%" stopColor={MIRROR.base} />
              <stop offset="100%" stopColor={MIRROR.lo} />
            </linearGradient>
          </defs>
          <rect x={x} y={y} width={width} height={height}
                fill={`url(#${gradId})`} stroke={MIRROR.edge} strokeWidth={2} />
          {/* Reflection streak — diagonal lighter band */}
          <line x1={x + width * 0.25} y1={y}
                x2={x + width * 0.75} y2={y + height}
                stroke="#ffffff" strokeWidth={40} opacity={0.18} strokeLinecap="round" />
        </g>
      );
    }

    case 'fluted': {
      // Vertical ribbed lines across the door face. Spacing scales with width
      // so narrow doors don't get crowded.
      const spacing = 48;
      const lines = [];
      for (let lx = x + spacing; lx < x + width - 4; lx += spacing) {
        lines.push(
          <line key={lx} x1={lx} y1={y + 6} x2={lx} y2={y + height - 6}
                stroke={colors.oakStroke} strokeWidth={1.2} opacity={0.55} />,
        );
      }
      return (
        <g>
          <rect x={x} y={y} width={width} height={height}
                fill={colors.oak} stroke={colors.oakStroke} strokeWidth={2} />
          {lines}
        </g>
      );
    }

    default: {
      // Custom image-based design from CUSTOM_DESIGNS in doors.js
      const src = getStyleSrc(style);
      if (src) {
        return (
          <g>
            <image
              href={src}
              x={x}
              y={y}
              width={width}
              height={height}
              preserveAspectRatio="none"
            />
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill="none"
              stroke={colors.oakStroke}
              strokeWidth={2}
            />
          </g>
        );
      }
      // Unknown style — fall back to a plain oak slab.
      return (
        <rect x={x} y={y} width={width} height={height}
              fill={colors.oak} stroke={colors.oakStroke} strokeWidth={2} />
      );
    }
  }
}
