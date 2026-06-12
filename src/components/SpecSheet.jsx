import { buildSpec } from '../editor/spec.js';
import { computeQuote, loadRateCard, formatINR } from '../editor/pricing.js';
import FrontView from './FrontView.jsx';

// Printable specification sheet + quotation (from the designer's rate card).
// Print uses the @media print rules in index.css (window.print → Save as PDF).
export default function SpecSheet({ layout, rateCard, onClose }) {
  const spec = buildSpec(layout);
  const d = spec.dims;
  const card = rateCard ?? loadRateCard();
  const quote = computeQuote(layout, card);
  return (
    <div
      className="fixed inset-0 z-40 overflow-auto bg-black/70 backdrop-blur-sm p-6 flex items-start justify-center"
      onClick={onClose}
    >
      <div
        className="spec-print bg-white text-stone-900 rounded-xl w-[820px] max-w-full my-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="no-print flex items-center justify-between px-8 py-4 border-b border-stone-200">
          <h2 className="text-lg font-medium">Specification sheet</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-5 py-2 rounded-full bg-accent text-white text-sm font-semibold hover:bg-accentHover transition-colors"
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-stone-300 text-stone-600 text-sm hover:border-stone-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-10 py-8">
          <header className="mb-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500 mb-1">
                Wardrobe specification & quotation
              </p>
              <h1 className="text-2xl font-semibold font-mono">
                {d.width} × {d.height} × {d.depth} mm
              </h1>
            </div>
            {(card.designer.name || card.designer.phone) && (
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{card.designer.name}</p>
                <p className="text-xs text-stone-500">{card.designer.phone}</p>
              </div>
            )}
          </header>
          {d.hasLoft && (
            <p className="text-sm text-stone-500 -mt-4 mb-6">
              Overall height incl. loft: {d.overallHeight} mm
            </p>
          )}

          <div
            className="flex items-center justify-center border border-stone-200 rounded-lg mb-8 bg-stone-50"
            style={{ height: 320 }}
          >
            <FrontView layout={layout} />
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6">
            <Section title="Finish">
              <Line k={spec.finish.label} v={spec.finish.category} />
            </Section>

            {spec.doors && (
              <Section title="Doors">
                <Line k="Type" v={cap(spec.doors.type)} />
                <Line k="Panels" v={spec.doors.count} />
                <Line k="Styles" v={uniqueJoin(spec.doors.styles)} />
              </Section>
            )}

            <Section title="Components & accessories">
              {spec.components.map((c) => (
                <Line key={c.label} k={c.label} v={`× ${c.count}`} />
              ))}
            </Section>

            <Section title="Hardware & fittings">
              {spec.hardware.map((h) => (
                <Line key={h.label} k={h.label} v={h.value} />
              ))}
            </Section>

            {spec.loft && (
              <Section title="Overhead loft">
                <Line k="Height" v={`${spec.loft.height} mm`} />
                <Line k="Bays" v={spec.loft.bays} />
                <Line k="Mid shelf" v={spec.loft.shelf ? 'Yes' : 'No'} />
              </Section>
            )}

            <Section title="Material (sheets)">
              <Line k="Carcass sheets" v={spec.material.structureSheets} />
              <Line k="Backing sheets" v={spec.material.backingSheets} />
              <Line k="Front area" v={`${spec.material.totalAreaSqFt} sq ft`} />
            </Section>

            <Section title="Columns">
              {spec.columns.map((c) => (
                <Line
                  key={c.index}
                  k={`Col ${c.index + 1}`}
                  v={`${c.width} mm · ${c.items} item${c.items === 1 ? '' : 's'}`}
                />
              ))}
            </Section>
          </div>

          <section className="mt-8">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 border-b border-stone-200 pb-1.5 mb-3">
              Quotation
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-stone-400">
                  <th className="text-left font-medium pb-1.5">Item</th>
                  <th className="text-right font-medium pb-1.5">Qty</th>
                  <th className="text-right font-medium pb-1.5">Rate</th>
                  <th className="text-right font-medium pb-1.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((l, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="py-1.5 pr-2 text-stone-700">{l.label}</td>
                    <td className="py-1.5 text-right font-mono text-stone-600 whitespace-nowrap">
                      {l.qty}
                    </td>
                    <td className="py-1.5 text-right font-mono text-stone-600 whitespace-nowrap">
                      {l.rate != null ? formatINR(l.rate) : '—'}
                    </td>
                    <td className="py-1.5 text-right font-mono text-stone-900 whitespace-nowrap">
                      {formatINR(l.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-stone-300">
                  <td colSpan={3} className="py-1.5 text-right text-stone-600">
                    Subtotal
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatINR(quote.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 text-right text-stone-600">
                    GST {quote.gstPct}%
                  </td>
                  <td className="py-1 text-right font-mono">{formatINR(quote.gst)}</td>
                </tr>
                <tr className="border-t-2 border-stone-900">
                  <td colSpan={3} className="py-2 text-right font-semibold">
                    Total
                  </td>
                  <td className="py-2 text-right font-mono font-bold text-base">
                    {formatINR(quote.total)}
                  </td>
                </tr>
              </tbody>
            </table>
            {card.terms && (
              <p className="mt-3 text-[11px] text-stone-500">{card.terms}</p>
            )}
          </section>

          <footer className="mt-8 pt-4 border-t border-stone-200 text-[11px] text-stone-400">
            Estimate — final quote subject to site measurement. Generated by WardrobeAI.
          </footer>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 border-b border-stone-200 pb-1.5 mb-2">
        {title}
      </h3>
      <dl className="space-y-1">{children}</dl>
    </section>
  );
}

function Line({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-stone-600">{k}</dt>
      <dd className="font-mono text-stone-900 text-right">{v}</dd>
    </div>
  );
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function uniqueJoin(arr) {
  return [...new Set(arr)].join(', ');
}
