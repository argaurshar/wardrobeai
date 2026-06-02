import { FINISHES, FINISH_ORDER, FINISH_CATEGORIES } from '../editor/finishes.js';

export default function FinishPicker({ value, onChange }) {
  const active = FINISHES[value];
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-3 px-1">
        <p className="text-inkFaint text-[11px] uppercase tracking-architectural">
          Finish
        </p>
        {active && (
          <span className="text-stone-400 text-[10px] truncate ml-2">{active.label}</span>
        )}
      </div>

      {FINISH_CATEGORIES.map((cat) => {
        const ids = FINISH_ORDER.filter((id) => FINISHES[id].category === cat);
        if (ids.length === 0) return null;
        return (
          <div key={cat} className="mb-3">
            <p className="text-stone-600 text-[10px] uppercase tracking-architectural mb-1.5 px-1">
              {cat}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ids.map((id) => {
                const f = FINISHES[id];
                const isActive = id === value;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChange(id)}
                    title={f.label}
                    className={[
                      'flex items-center gap-2 p-1.5 rounded-md border text-left transition-colors',
                      isActive
                        ? 'border-accent/70 bg-stone-800'
                        : 'border-stone-800 bg-stone-900 hover:border-stone-600',
                    ].join(' ')}
                  >
                    <span
                      className="w-5 h-5 rounded border border-stone-700 shrink-0"
                      style={{ background: f.swatch }}
                      aria-hidden
                    />
                    <span
                      className={[
                        'text-[10px] leading-tight truncate',
                        isActive ? 'text-stone-100' : 'text-stone-400',
                      ].join(' ')}
                    >
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
