import { useState } from 'react';
import { computeQuote, formatINR } from '../editor/pricing.js';

// Live price ticker in the editor sidebar. Recomputes from the current layout
// on every render; expandable line-item breakdown; opens the rate card editor.
export default function QuotePanel({ layout, rateCard, onEditRates }) {
  const [open, setOpen] = useState(false);
  const quote = computeQuote(layout, rateCard);

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-3 px-1">
        <p className="text-inkFaint text-[11px] uppercase tracking-architectural">
          Estimate
        </p>
        <button
          type="button"
          onClick={onEditRates}
          className="text-accent text-[10px] uppercase tracking-wider hover:text-accentHover transition-colors"
        >
          Edit rates
        </button>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-3 rounded-md bg-stone-900 border border-stone-800 hover:border-stone-600 transition-all duration-150"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-stone-100 text-xl font-semibold font-mono tabular-nums">
            {formatINR(quote.total)}
          </span>
          <span className="text-stone-500 text-[10px]">{open ? '▴ hide' : '▾ details'}</span>
        </div>
        <div className="text-stone-500 text-[11px] mt-0.5">
          {quote.areaSqFt} sq ft · incl. {quote.gstPct}% GST
        </div>
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-md bg-stone-900 border border-stone-800 space-y-1.5">
          {quote.lines.map((l, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="text-stone-400 leading-tight">
                {l.label}
                {l.qty ? <span className="text-stone-600"> {l.qty}</span> : null}
              </span>
              <span className="text-stone-200 font-mono tabular-nums shrink-0">
                {formatINR(l.amount)}
              </span>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-2 text-[11px] pt-1.5 border-t border-stone-800">
            <span className="text-stone-400">Subtotal</span>
            <span className="text-stone-200 font-mono tabular-nums">
              {formatINR(quote.subtotal)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="text-stone-400">GST {quote.gstPct}%</span>
            <span className="text-stone-200 font-mono tabular-nums">{formatINR(quote.gst)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 text-xs pt-1.5 border-t border-stone-800">
            <span className="text-stone-200 font-medium">Total</span>
            <span className="text-accent font-mono tabular-nums font-semibold">
              {formatINR(quote.total)}
            </span>
          </div>
          <p className="text-stone-600 text-[10px] pt-1 leading-snug">
            Indicative estimate from your rate card — final quote subject to site
            measurement.
          </p>
        </div>
      )}
    </section>
  );
}
