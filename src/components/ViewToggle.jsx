// View toggle: INTERIOR (Phase 1 layout editor) vs FRONT (Phase 2 closed
// face). Isometric will land later as a third slot.
const VIEWS = [
  { id: 'interior', label: 'Interior' },
  { id: 'front', label: 'Front' },
  { id: 'isometric', label: 'Isometric' },
];

export default function ViewToggle({ value, onChange }) {
  return (
    <div
      role="tablist"
      className="inline-flex p-1 rounded-full bg-stone-900 border border-stone-800"
    >
      {VIEWS.map((v) => {
        const active = v.id === value;
        return (
          <button
            key={v.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v.id)}
            className={[
              'px-5 py-1.5 rounded-full text-xs uppercase tracking-architectural transition-colors',
              active ? 'bg-accent text-surround' : 'text-stone-400 hover:text-stone-200',
            ].join(' ')}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
