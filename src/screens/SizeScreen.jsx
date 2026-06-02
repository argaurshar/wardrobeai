import { useState } from 'react';

const FT_TO_MM = 304.8;

const DEFAULTS = {
  mm: { width: 1800, height: 2400, depth: 600 },
  ft: { width: 6, height: 8, depth: 2 },
};

function toMM(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return unit === 'ft' ? Math.round(n * FT_TO_MM) : Math.round(n);
}

export default function SizeScreen({ unit, onBack, onSubmit }) {
  const [vals, setVals] = useState(DEFAULTS[unit]);

  const mm = {
    width: toMM(vals.width, unit),
    height: toMM(vals.height, unit),
    depth: toMM(vals.depth, unit),
  };
  const ok = mm.width > 0 && mm.height > 0 && mm.depth > 0;

  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8">
      <p className="text-accent text-[11px] uppercase tracking-architectural mb-10">
        Step 02 — Cavity size
      </p>
      <h1 className="text-stone-100 text-3xl font-medium mb-3 tracking-tight">
        Internal opening dimensions
      </h1>
      <p className="text-stone-500 text-sm mb-12 max-w-md text-center">
        The clear inside dimensions of the cavity the wardrobe will sit in.
        Entered in <span className="text-stone-300">{unit}</span>.
      </p>

      <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
        <DimInput label="Width" unit={unit} value={vals.width} onChange={set('width')} />
        <DimInput label="Height" unit={unit} value={vals.height} onChange={set('height')} />
        <DimInput label="Depth" unit={unit} value={vals.depth} onChange={set('depth')} />
      </div>

      <p className="text-inkFaint text-xs mt-6 font-mono tracking-wide">
        {unit === 'ft'
          ? `→ ${mm.width} × ${mm.height} × ${mm.depth} mm`
          : `${mm.width} × ${mm.height} × ${mm.depth} mm`}
      </p>

      <div className="mt-12 flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 transition-colors"
        >
          Back
        </button>
        <button
          disabled={!ok}
          onClick={() => onSubmit(mm)}
          className="px-10 py-3 rounded-full bg-accent text-surround text-sm font-semibold tracking-wide hover:bg-accentHover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Generate options
        </button>
      </div>
    </div>
  );
}

function DimInput({ label, unit, value, onChange }) {
  return (
    <label className="flex flex-col">
      <span className="text-[10px] uppercase tracking-architectural text-inkFaint mb-2">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={unit === 'ft' ? '0.1' : '10'}
          min="0"
          value={value}
          onChange={onChange}
          className="w-full bg-stone-900 border border-stone-800 rounded-md px-4 py-3 text-stone-100 text-2xl font-medium focus:outline-none focus:border-accent/70 transition-colors"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 text-sm">
          {unit}
        </span>
      </div>
    </label>
  );
}
