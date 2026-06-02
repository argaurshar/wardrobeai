import { HARDWARE_FIELDS, HARDWARE_OPTIONS, defaultHardware } from '../editor/hardware.js';

// Sidebar panel for fittings/hardware. Pure metadata feeding the spec sheet.
export default function HardwarePicker({ value, onChange }) {
  const hw = value ?? defaultHardware();
  return (
    <section className="mt-8">
      <p className="text-inkFaint text-[11px] uppercase tracking-architectural mb-3 px-1">
        Hardware &amp; fittings
      </p>
      <div className="space-y-3">
        {HARDWARE_FIELDS.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="text-[10px] uppercase tracking-architectural text-stone-500 mb-1.5 block px-1">
              {label}
            </span>
            <select
              value={hw[key]}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-md px-3 py-2 text-stone-200 text-sm focus:outline-none focus:border-accent/70 transition-colors"
            >
              {HARDWARE_OPTIONS[key].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}
