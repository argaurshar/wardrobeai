export default function UnitsScreen({ unit, onChange, onContinue, onResume }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 animate-rise">
      <p className="text-accent text-[11px] uppercase tracking-architectural mb-10">
        Step 01 — Units
      </p>
      <h1 className="text-stone-100 text-3xl font-medium mb-3 tracking-tight">
        Which units do you work in?
      </h1>
      <p className="text-stone-500 text-sm mb-12 max-w-md text-center">
        Everything is stored internally in millimetres. You can change units
        later without losing your design.
      </p>

      <div
        role="tablist"
        className="inline-flex p-1 rounded-full bg-stone-900 border border-stone-800"
      >
        <ToggleButton
          selected={unit === 'mm'}
          onClick={() => onChange('mm')}
          label="Millimetres"
          sub="mm"
        />
        <ToggleButton
          selected={unit === 'ft'}
          onClick={() => onChange('ft')}
          label="Feet"
          sub="ft"
        />
      </div>

      <button
        onClick={onContinue}
        className="mt-12 px-10 py-3 rounded-full bg-accent text-surround text-sm font-semibold tracking-wide hover:bg-accentHover hover:shadow-glow hover:scale-[1.03] active:scale-95 transition-all duration-200"
      >
        Continue
      </button>

      {onResume && (
        <button
          onClick={onResume}
          className="mt-5 px-6 py-2 rounded-full border border-stone-700 text-stone-400 text-xs hover:border-accent/60 hover:text-accent transition-colors"
        >
          ↩ Resume last design
        </button>
      )}
    </div>
  );
}

function ToggleButton({ selected, onClick, label, sub }) {
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={[
        'px-8 py-3 rounded-full text-sm transition-all duration-200',
        selected
          ? 'bg-accent text-surround animate-pop'
          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800',
      ].join(' ')}
    >
      <span className="font-medium">{label}</span>
      <span className="opacity-50 ml-2 text-xs">{sub}</span>
    </button>
  );
}
