import { useEffect } from 'react';
import { PANEL_STYLES, PANEL_STYLE_LABELS, getStyleSrc } from '../editor/doors.js';
import { getFinishColors } from '../editor/finishes.js';

export default function DoorStylePopup({ panelIdx, currentStyle, finish, onPick, onCancel }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const colors = getFinishColors(finish);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center px-4 bg-black/65 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-stone-900 border border-stone-800 rounded-xl p-7 w-[480px] max-w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-inkFaint text-[11px] uppercase tracking-architectural mb-1">
          Door style
        </p>
        <p className="text-stone-500 text-xs mb-6">
          Panel {panelIdx + 1} · click a swatch to apply
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {PANEL_STYLES.map((style) => {
            const active = style === currentStyle;
            return (
              <button
                key={style}
                type="button"
                onClick={() => onPick(style)}
                className={[
                  'flex flex-col items-center p-2 rounded-md border transition-colors',
                  active
                    ? 'bg-stone-800 border-cream/60'
                    : 'bg-stone-900 border-stone-800 hover:bg-stone-800 hover:border-stone-600',
                ].join(' ')}
              >
                <StylePreview style={style} colors={colors} />
                <span
                  className={[
                    'mt-2 text-xs',
                    active ? 'text-stone-100' : 'text-stone-300',
                  ].join(' ')}
                >
                  {PANEL_STYLE_LABELS[style]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StylePreview({ style, colors }) {
  const W = 64;
  const H = 96;
  switch (style) {
    case 'slab':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect x={2} y={2} width={W - 4} height={H - 4}
                fill={colors.oak} stroke={colors.oakStroke} strokeWidth={1.5} />
        </svg>
      );
    case 'shaker':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect x={2} y={2} width={W - 4} height={H - 4}
                fill={colors.oak} stroke={colors.oakStroke} strokeWidth={1.5} />
          <rect x={10} y={10} width={W - 20} height={H - 20}
                fill={colors.oakDeep} opacity={0.78}
                stroke={colors.oakStroke} strokeWidth={1} />
        </svg>
      );
    case 'glass':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect x={2} y={2} width={W - 4} height={H - 4}
                fill="#dde7ee" opacity={0.72}
                stroke="#9eb2c1" strokeWidth={1.5} />
          <line x1={10} y1={12} x2={28} y2={42}
                stroke="#ffffff" strokeWidth={6} strokeLinecap="round" opacity={0.55} />
        </svg>
      );
    case 'mirror':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id={`prev-mirror`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e9edf2" />
              <stop offset="55%" stopColor="#c6cad0" />
              <stop offset="100%" stopColor="#9aa0a8" />
            </linearGradient>
          </defs>
          <rect x={2} y={2} width={W - 4} height={H - 4}
                fill="url(#prev-mirror)" stroke="#5a626c" strokeWidth={1.5} />
          <line x1={W * 0.3} y1={2} x2={W * 0.75} y2={H - 2}
                stroke="#ffffff" strokeWidth={10} opacity={0.18} strokeLinecap="round" />
        </svg>
      );
    case 'fluted': {
      const lines = [];
      for (let lx = 10; lx < W - 4; lx += 8) {
        lines.push(
          <line key={lx} x1={lx} y1={6} x2={lx} y2={H - 6}
                stroke={colors.oakStroke} strokeWidth={0.8} opacity={0.55} />,
        );
      }
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect x={2} y={2} width={W - 4} height={H - 4}
                fill={colors.oak} stroke={colors.oakStroke} strokeWidth={1.5} />
          {lines}
        </svg>
      );
    }
    default: {
      const src = getStyleSrc(style);
      if (src) {
        return (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <image
              href={src}
              x={0}
              y={0}
              width={W}
              height={H}
              preserveAspectRatio="none"
            />
            <rect
              x={1}
              y={1}
              width={W - 2}
              height={H - 2}
              fill="none"
              stroke={colors.oakStroke}
              strokeWidth={1}
            />
          </svg>
        );
      }
      return null;
    }
  }
}
