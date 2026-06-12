import { useState } from 'react';
import { auditLayout } from '../editor/audit.js';

// Automated design review in the sidebar: the ergonomic checks a senior
// designer does by eye, recomputed live on every edit.
export default function AuditPanel({ layout }) {
  const [open, setOpen] = useState(false);
  const findings = auditLayout(layout);
  const warns = findings.filter((f) => f.level === 'warn').length;

  return (
    <section className="mt-8">
      <p className="text-inkFaint text-[11px] uppercase tracking-architectural mb-3 px-1">
        Design audit
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-3 rounded-md bg-stone-900 border border-stone-800 hover:border-stone-600 transition-all duration-150"
      >
        <div className="flex items-center justify-between">
          {findings.length === 0 ? (
            <span className="text-emerald-400 text-sm">✓ No issues found</span>
          ) : (
            <span className="text-sm">
              {warns > 0 ? (
                <span className="text-amber-400">⚠ {warns} warning{warns === 1 ? '' : 's'}</span>
              ) : (
                <span className="text-stone-300">ℹ {findings.length} note{findings.length === 1 ? '' : 's'}</span>
              )}
              {warns > 0 && findings.length > warns && (
                <span className="text-stone-500"> · {findings.length - warns} note{findings.length - warns === 1 ? '' : 's'}</span>
              )}
            </span>
          )}
          {findings.length > 0 && (
            <span className="text-stone-500 text-[10px]">{open ? '▴' : '▾'}</span>
          )}
        </div>
      </button>

      {open && findings.length > 0 && (
        <ul className="mt-2 space-y-2">
          {findings.map((f, i) => (
            <li
              key={i}
              className={[
                'p-2.5 rounded-md border text-[11px] leading-snug',
                f.level === 'warn'
                  ? 'bg-amber-950/40 border-amber-900/50'
                  : 'bg-stone-900 border-stone-800',
              ].join(' ')}
            >
              <div className={f.level === 'warn' ? 'text-amber-300' : 'text-stone-300'}>
                {f.level === 'warn' ? '⚠ ' : 'ℹ '}
                {f.title}
              </div>
              <div className="text-stone-500 mt-0.5">{f.detail}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
