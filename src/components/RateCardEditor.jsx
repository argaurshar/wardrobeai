import { useEffect, useState } from 'react';
import {
  DEFAULT_RATE_CARD,
  ADD_ON_LABELS,
  PANEL_PREMIUM_LABELS,
} from '../editor/pricing.js';
import { FINISH_CATEGORIES } from '../editor/finishes.js';
import { HARDWARE_OPTIONS } from '../editor/hardware.js';

// Modal for editing the designer's rate card. Works on a local draft;
// Save hands the draft back to EditorScreen (which persists it).
export default function RateCardEditor({ rateCard, onSave, onCancel }) {
  const [draft, setDraft] = useState(rateCard);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const setNum = (path, key) => (e) => {
    const v = Number(e.target.value);
    setDraft((d) => ({
      ...d,
      [path]: { ...d[path], [key]: Number.isFinite(v) ? v : 0 },
    }));
  };
  const setTop = (key) => (e) => {
    const v = Number(e.target.value);
    setDraft((d) => ({ ...d, [key]: Number.isFinite(v) ? v : 0 }));
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-auto bg-black/70 backdrop-blur-sm p-6 flex items-start justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-stone-900 border border-stone-700 rounded-xl w-[560px] max-w-full my-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h2 className="text-stone-100 text-base font-medium">Rate card</h2>
          <p className="text-stone-500 text-[11px]">₹ rates, saved on this device</p>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[65vh] overflow-y-auto">
          <Group title="Finish rates (₹ / sq ft of front area)">
            {FINISH_CATEGORIES.map((cat) => (
              <Field
                key={cat}
                label={cat}
                value={draft.finishRates[cat] ?? 0}
                onChange={setNum('finishRates', cat)}
              />
            ))}
          </Group>

          <Group title="Premiums">
            <Field
              label="Sliding shutters (%)"
              value={draft.slidingPremiumPct}
              onChange={setTop('slidingPremiumPct')}
            />
            {Object.keys(PANEL_PREMIUM_LABELS).map((k) => (
              <Field
                key={k}
                label={`${PANEL_PREMIUM_LABELS[k]} (₹/panel)`}
                value={draft.panelPremiums[k] ?? 0}
                onChange={setNum('panelPremiums', k)}
              />
            ))}
          </Group>

          <Group title="Add-ons (₹ per unit)">
            {Object.keys(ADD_ON_LABELS).map((k) => (
              <Field
                key={k}
                label={ADD_ON_LABELS[k]}
                value={draft.addOns[k] ?? 0}
                onChange={setNum('addOns', k)}
              />
            ))}
          </Group>

          <Group title="Hardware brand multiplier (× works subtotal)">
            {HARDWARE_OPTIONS.brand.map((b) => (
              <Field
                key={b}
                label={b}
                value={draft.brandMultipliers[b] ?? 1}
                step="0.01"
                onChange={setNum('brandMultipliers', b)}
              />
            ))}
          </Group>

          <Group title="Tax & quotation header">
            <Field label="GST (%)" value={draft.gstPct} onChange={setTop('gstPct')} />
            <TextField
              label="Designer / firm name"
              value={draft.designer.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, designer: { ...d.designer, name: e.target.value } }))
              }
            />
            <TextField
              label="Phone"
              value={draft.designer.phone}
              onChange={(e) =>
                setDraft((d) => ({ ...d, designer: { ...d.designer, phone: e.target.value } }))
              }
            />
            <label className="block">
              <span className="text-stone-500 text-[11px]">Terms (printed on quotation)</span>
              <textarea
                value={draft.terms}
                onChange={(e) => setDraft((d) => ({ ...d, terms: e.target.value }))}
                rows={2}
                className="mt-1 w-full bg-stone-800 border border-stone-700 rounded-md px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-accent/70 transition-colors"
              />
            </label>
          </Group>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_RATE_CARD)}
            className="text-stone-500 text-xs hover:text-stone-300 transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="px-6 py-2 rounded-full bg-accent text-surround text-sm font-semibold hover:bg-accentHover hover:shadow-glow active:scale-95 transition-all duration-200"
            >
              Save rates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section>
      <h3 className="text-inkFaint text-[10px] uppercase tracking-architectural mb-2">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, step = '50' }) {
  return (
    <label className="block">
      <span className="text-stone-500 text-[11px] leading-tight block truncate" title={label}>
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={onChange}
        className="mt-1 w-full bg-stone-800 border border-stone-700 rounded-md px-3 py-1.5 text-stone-100 text-sm font-mono focus:outline-none focus:border-accent/70 transition-colors"
      />
    </label>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-stone-500 text-[11px]">{label}</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="mt-1 w-full bg-stone-800 border border-stone-700 rounded-md px-3 py-1.5 text-stone-100 text-sm focus:outline-none focus:border-accent/70 transition-colors"
      />
    </label>
  );
}
