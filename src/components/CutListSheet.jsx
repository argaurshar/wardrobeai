import { buildCutList, cutListToCSV } from '../editor/cutlist.js';
import { triggerDownload } from '../editor/storage.js';

// Printable production sheet: panel cut list, board summary, and hardware
// schedule with quantities. CSV download for the factory; print via the same
// @media print rules as the spec sheet.
export default function CutListSheet({ layout, onClose }) {
  const cut = buildCutList(layout);
  const d = layout.dims;

  const downloadCSV = () => {
    const blob = new Blob([cutListToCSV(cut)], { type: 'text/csv' });
    triggerDownload(blob, `cutlist-${d.width}x${d.height}.csv`);
  };

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
          <h2 className="text-lg font-medium">Cut list & hardware</h2>
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="px-5 py-2 rounded-full border border-stone-300 text-stone-600 text-sm hover:border-stone-500 transition-colors"
            >
              Download CSV
            </button>
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
          <header className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500 mb-1">
              Production — cut list & hardware schedule
            </p>
            <h1 className="text-2xl font-semibold font-mono">
              {d.width} × {d.height} × {d.depth} mm
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Nominal finished sizes — apply your machine and edge-band
              allowances before cutting.
            </p>
          </header>

          <h3 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 border-b border-stone-200 pb-1.5 mb-2">
            Panels
          </h3>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-stone-400">
                <th className="text-left font-medium pb-1.5">Part</th>
                <th className="text-right font-medium pb-1.5">Qty</th>
                <th className="text-right font-medium pb-1.5">L (mm)</th>
                <th className="text-right font-medium pb-1.5">W (mm)</th>
                <th className="text-right font-medium pb-1.5">Thk</th>
                <th className="text-left font-medium pb-1.5 pl-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {cut.panels.map((p, i) => (
                <tr key={i} className="border-t border-stone-100">
                  <td className="py-1 pr-2 text-stone-700">{p.part}</td>
                  <td className="py-1 text-right font-mono">{p.qty}</td>
                  <td className="py-1 text-right font-mono">{p.length}</td>
                  <td className="py-1 text-right font-mono">{p.width}</td>
                  <td className="py-1 text-right font-mono">{p.thickness}</td>
                  <td className="py-1 pl-4 text-stone-500 text-xs">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 border-b border-stone-200 pb-1.5 mb-2">
            Boards (2440 × 1220, incl. 30% waste)
          </h3>
          <div className="flex gap-8 mb-6 text-sm">
            {cut.sheets.map((s) => (
              <div key={s.thickness}>
                <span className="font-mono font-semibold">{s.sheets}</span>
                <span className="text-stone-500"> × {s.thickness} mm board</span>
              </div>
            ))}
          </div>

          <h3 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 border-b border-stone-200 pb-1.5 mb-2">
            Hardware schedule
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-stone-400">
                <th className="text-left font-medium pb-1.5">Item</th>
                <th className="text-right font-medium pb-1.5">Qty</th>
                <th className="text-left font-medium pb-1.5 pl-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {cut.hardware.map((h, i) => (
                <tr key={i} className="border-t border-stone-100">
                  <td className="py-1 pr-2 text-stone-700">{h.item}</td>
                  <td className="py-1 text-right font-mono">{h.qty}</td>
                  <td className="py-1 pl-4 text-stone-500 text-xs">{h.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <footer className="mt-8 pt-4 border-t border-stone-200 text-[11px] text-stone-400">
            Generated by WardrobeAI — verify all sizes against site measurement
            before production.
          </footer>
        </div>
      </div>
    </div>
  );
}
