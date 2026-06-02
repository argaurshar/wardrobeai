import { useMemo, useState } from 'react';
import { generateThreeOptions } from '../engine/layoutEngine.js';
import WardrobeSVG from '../components/WardrobeSVG.jsx';

const STRATEGY_ORDER = ['maxHanging', 'maxStorage', 'balanced'];

export default function OptionsScreen({ dims, onBack, onConfirm }) {
  const options = useMemo(() => generateThreeOptions(dims), [dims]);
  const [selected, setSelected] = useState(null);

  const pick = (key) => {
    setSelected(key);
    // eslint-disable-next-line no-console
    console.log('Selected layout:', key, options[key]);
  };

  const confirm = () => {
    if (!selected || !onConfirm) return;
    onConfirm(options[selected]);
  };

  return (
    <div className="min-h-screen px-10 py-12">
      <header className="flex items-center justify-between mb-10 max-w-[1600px] mx-auto">
        <div>
          <p className="text-accent text-[11px] uppercase tracking-architectural mb-2">
            Step 03 — Pick a starting layout
          </p>
          <h1 className="text-stone-100 text-2xl font-medium tracking-tight">
            Three options for{' '}
            <span className="font-mono text-stone-300">
              {dims.width} × {dims.height} × {dims.depth} mm
            </span>
          </h1>
        </div>
        <button
          onClick={onBack}
          className="px-5 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 transition-colors"
        >
          Back
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1600px] mx-auto">
        {STRATEGY_ORDER.map((key) => (
          <OptionCard
            key={key}
            layout={options[key]}
            selected={selected === key}
            onSelect={() => pick(key)}
          />
        ))}
      </div>

      <div className="flex justify-center mt-12">
        <button
          disabled={!selected}
          onClick={confirm}
          className="px-10 py-3 rounded-full bg-accent text-surround text-sm font-semibold tracking-wide hover:bg-accentHover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {selected ? `Continue with ${options[selected].label} →` : 'Pick a layout to continue'}
        </button>
      </div>
    </div>
  );
}

function OptionCard({ layout, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group text-left transition-all rounded-2xl p-1',
        selected ? 'ring-2 ring-accent' : 'ring-1 ring-transparent hover:ring-stone-700',
      ].join(' ')}
    >
      <p className="text-inkFaint text-[11px] uppercase tracking-architectural px-2 pt-3 pb-4">
        {layout.label}
      </p>

      <div className="bg-cream rounded-xl shadow-inset p-6">
        <WardrobeSVG layout={layout} />
      </div>

      <MaterialBlock m={layout.materialEstimate} columnCount={layout.columnCount} />
    </button>
  );
}

function MaterialBlock({ m, columnCount }) {
  const rows = [
    ['Columns', columnCount],
    ['Shelves', m.shelves],
    ['Drawers', m.drawers],
    ['Hanging rails', m.hanging],
    ['Carcass sheets', m.structureSheets],
    ['Backing sheets', m.backingSheets],
    ['Front area', `${m.totalAreaSqFt} sq ft`],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 px-3 pt-5 pb-3 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between border-b border-stone-800/60 py-1.5">
          <dt className="text-stone-500 text-xs uppercase tracking-wider">{k}</dt>
          <dd className="text-stone-200 font-mono tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
