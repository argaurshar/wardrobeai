import { RULES } from '../engine/rules.js';
import { PANEL_STYLE_LABELS, computePanelGeometry } from '../editor/doors.js';

export default function PanelToolbar({
  doors,
  layout,
  onSetSlidingCount,
  onPanelClick,
}) {
  if (!doors) return null;
  if (doors.type === 'hinged') {
    return <HingedToolbar doors={doors} layout={layout} onPanelClick={onPanelClick} />;
  }
  return (
    <SlidingToolbar
      doors={doors}
      layout={layout}
      onSetSlidingCount={onSetSlidingCount}
      onPanelClick={onPanelClick}
    />
  );
}

function HingedToolbar({ doors, layout, onPanelClick }) {
  const geom = computePanelGeometry(doors, layout);
  return (
    <div className="mt-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-inkFaint text-[11px] uppercase tracking-architectural">
          Hinged doors ({doors.panels.length})
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {doors.panels.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-md pl-4 pr-4 py-2"
          >
            <button
              onClick={() => onPanelClick?.(i)}
              className="text-stone-500 text-[10px] uppercase tracking-architectural hover:text-stone-300 transition-colors"
              title="Change style"
            >
              Door {i + 1}
            </button>
            <span className="text-stone-200 font-mono text-sm tabular-nums">
              {Math.round(geom[i].width)}
              <span className="text-stone-600 text-xs ml-1">mm</span>
            </span>
            <span className="text-stone-700 text-xs">·</span>
            <span className="text-stone-500 text-xs">
              {PANEL_STYLE_LABELS[p.style]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-stone-600 text-[10px] mt-3 px-1">
        Hinged doors follow the interior columns — one door per column,
        meeting at the centre of each divider. Add or remove columns in the
        Interior view to change door count.
      </p>
    </div>
  );
}

function SlidingToolbar({ doors, layout, onSetSlidingCount, onPanelClick }) {
  const geom = computePanelGeometry(doors, layout);
  return (
    <div className="mt-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-inkFaint text-[11px] uppercase tracking-architectural">
          Sliding panels ({doors.panels.length})
        </p>
        <div role="tablist" className="inline-flex p-1 rounded-full bg-stone-900 border border-stone-800">
          {RULES.slidingPanelCounts.map((n) => {
            const active = n === doors.panels.length;
            return (
              <button
                key={n}
                role="tab"
                aria-selected={active}
                onClick={() => onSetSlidingCount(n)}
                className={[
                  'px-4 py-1 rounded-full text-xs uppercase tracking-architectural transition-colors',
                  active ? 'bg-accent text-surround' : 'text-stone-400 hover:text-stone-200',
                ].join(' ')}
              >
                {n} panels
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {doors.panels.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-md pl-4 pr-3 py-2"
          >
            <button
              onClick={() => onPanelClick?.(i)}
              className="text-stone-500 text-[10px] uppercase tracking-architectural hover:text-stone-300 transition-colors"
              title="Change style"
            >
              Panel {i + 1}
            </button>
            <span className="text-stone-200 font-mono text-sm tabular-nums">
              {Math.round(geom[i].width)}
              <span className="text-stone-600 text-xs ml-1">mm</span>
            </span>
            <span className="text-stone-700 text-xs">·</span>
            <span className="text-stone-500 text-xs">
              {PANEL_STYLE_LABELS[p.style]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-stone-600 text-[10px] mt-3 px-1">
        Sliding panels are independent of the interior layout. They overlap
        by {RULES.slidingOverlap} mm so they cover the full opening with no
        gap.
      </p>
    </div>
  );
}
