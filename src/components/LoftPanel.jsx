import { RULES } from '../engine/rules.js';
import { clampLoftHeight } from '../editor/loft.js';

// Sidebar control for the overhead loft. Toggle + height + optional mid shelf.
// Bays follow the column count (read-only). Changes are pushed by the parent.
export default function LoftPanel({ loft, columns, onChange }) {
  const enabled = !!(loft && loft.enabled);
  const height = loft?.height ?? RULES.loftDefaultHeight;
  const bays = loft?.bays ?? columns.length;

  return (
    <section className="mt-8">
      <p className="text-inkFaint text-[11px] uppercase tracking-architectural mb-3 px-1">
        Overhead loft
      </p>

      <button
        type="button"
        onClick={() => onChange({ enabled: !enabled })}
        className={[
          'w-full mb-3 px-3 py-2.5 rounded-md border flex items-center justify-between transition-colors',
          enabled
            ? 'bg-accent/10 border-accent/50 text-stone-100'
            : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-600',
        ].join(' ')}
      >
        <span className="flex items-center gap-3">
          <span
            className={[
              'w-2.5 h-2.5 rounded-full',
              enabled ? 'bg-accent' : 'bg-stone-700',
            ].join(' ')}
            aria-hidden
          />
          <span className="text-[11px] uppercase tracking-architectural">Loft unit</span>
        </span>
        <span className="text-xs">{enabled ? 'on' : 'off'}</span>
      </button>

      {enabled && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-architectural text-stone-500 mb-1.5 block px-1">
              Loft height
            </span>
            <div className="relative">
              <input
                type="number"
                key={height}
                defaultValue={height}
                min={RULES.loftMinHeight}
                max={RULES.loftMaxHeight}
                step={10}
                onBlur={(e) => onChange({ height: clampLoftHeight(e.target.value) })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-full bg-stone-950 border border-stone-800 rounded-md px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-accent/70 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 text-xs">
                mm
              </span>
            </div>
            <span className="text-stone-600 text-[10px] px-1">
              {RULES.loftMinHeight}–{RULES.loftMaxHeight} mm
            </span>
          </label>

          <button
            type="button"
            onClick={() => onChange({ shelf: !loft.shelf })}
            className={[
              'w-full px-3 py-2 rounded-md border flex items-center justify-between transition-colors text-sm',
              loft.shelf
                ? 'bg-stone-800 border-stone-600 text-stone-100'
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-600',
            ].join(' ')}
          >
            <span>Mid shelf</span>
            <span className="text-xs">{loft.shelf ? 'on' : 'off'}</span>
          </button>

          <div className="flex items-center justify-between px-1 text-[11px]">
            <span className="text-stone-500 uppercase tracking-architectural">Bays</span>
            <span className="text-stone-300 font-mono">
              = {bays} column{bays === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
