// View toggle: INTERIOR layout editor, FRONT closed face, ISOMETRIC projection,
// and 3D (real three.js render).
const VIEWS = [
  { id: 'interior', label: 'Interior' },
  { id: 'front', label: 'Front' },
  { id: 'isometric', label: 'Isometric' },
  { id: '3d', label: '3D' },
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
              'px-5 py-1.5 rounded-full text-xs uppercase tracking-architectural transition-all duration-200',
              active
                ? 'bg-accent text-surround animate-pop'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800',
            ].join(' ')}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
