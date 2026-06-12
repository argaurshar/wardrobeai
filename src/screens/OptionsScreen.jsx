import { useMemo, useState } from 'react';
import { generateThreeOptions } from '../engine/layoutEngine.js';
import { computeQuote, loadRateCard, formatINR } from '../editor/pricing.js';
import WardrobeSVG from '../components/WardrobeSVG.jsx';

const STRATEGY_ORDER = ['maxHanging', 'maxStorage', 'balanced'];

export default function OptionsScreen({ dims, onBack, onConfirm }) {
  const options = useMemo(() => generateThreeOptions(dims), [dims]);
  const [selected, setSelected] = useState(null);

  // Estimated price per option (designer's saved rate card) for comparison.
  const quotes = useMemo(() => {
    const card = loadRateCard();
    const out = {};
    for (const key of STRATEGY_ORDER) out[key] = computeQuote(options[key], card);
    return out;
  }, [options]);
  const cheapest = Math.min(...STRATEGY_ORDER.map((k) => quotes[k].total));

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
    <div className="min-h-screen px-10 pt-20 pb-12 animate-rise">
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
          className="px-5 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200"
        >
          Back
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1600px] mx-auto">
        {STRATEGY_ORDER.map((key, i) => (
          <OptionCard
            key={key}
            layout={options[key]}
            selected={selected === key}
            onSelect={() => pick(key)}
            delay={i * 90}
            total={quotes[key].total}
            deltaVsCheapest={quotes[key].total - cheapest}
          />
        ))}
      </div>

      <div className="flex justify-center mt-12">
        <button
          disabled={!selected}
          onClick={confirm}
          className="px-10 py-3 rounded-full bg-accent text-surround text-sm font-semibold tracking-wide hover:bg-accentHover hover:shadow-glow hover:scale-[1.03] active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
        >
          {selected ? `Continue with ${options[selected].label} →` : 'Pick a layout to continue'}
        </button>
      </div>
    </div>
  );
}

function OptionCard({ layout, selected, onSelect, delay = 0, total, deltaVsCheapest }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${delay}ms` }}
      className={[
        'group text-left transition-all duration-200 rounded-2xl p-1 animate-rise',
        selected
          ? 'ring-2 ring-accent shadow-glow -translate-y-1 bg-stone-900/60'
          : 'ring-1 ring-transparent hover:ring-stone-600 hover:-translate-y-1 hover:bg-stone-900/40',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between px-2 pt-3 pb-4">
        <p
          className={[
            'text-[11px] uppercase tracking-architectural transition-colors',
            selected ? 'text-accent' : 'text-inkFaint group-hover:text-stone-300',
          ].join(' ')}
        >
          {selected ? '● ' : ''}
          {layout.label}
        </p>
        <p className="text-right">
          <span className="text-stone-100 font-mono text-sm font-semibold tabular-nums">
            ~{formatINR(total)}
          </span>
          <span
            className={[
              'block text-[10px] font-mono tabular-nums',
              deltaVsCheapest === 0 ? 'text-emerald-400' : 'text-stone-500',
            ].join(' ')}
          >
            {deltaVsCheapest === 0
              ? 'lowest estimate'
              : `+${formatINR(deltaVsCheapest)} vs lowest`}
          </span>
        </p>
      </div>

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
