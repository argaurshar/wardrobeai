import { DOOR_TYPES } from '../editor/doors.js';

const LABELS = {
  hinged: 'Hinged',
  sliding: 'Sliding',
};

const SUBS = {
  hinged: 'Discrete doors, equal width',
  sliding: '2 or 3 overlapping panels',
};

export default function DoorTypePicker({ value, onChange }) {
  return (
    <section className="mt-8">
      <p className="text-inkFaint text-[11px] uppercase tracking-architectural mb-3 px-1">
        Door type
      </p>
      <ul className="space-y-1.5">
        {DOOR_TYPES.map((id) => {
          const active = id === value;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                className={[
                  'w-full text-left p-3 rounded-md border transition-colors',
                  active
                    ? 'bg-stone-800 border-cream/60'
                    : 'bg-stone-900 border-stone-800 hover:bg-stone-800 hover:border-stone-600',
                ].join(' ')}
              >
                <div
                  className={[
                    'text-sm font-medium leading-tight',
                    active ? 'text-stone-100' : 'text-stone-300',
                  ].join(' ')}
                >
                  {LABELS[id]}
                </div>
                <div className="text-stone-500 text-[11px] leading-tight mt-0.5">
                  {SUBS[id]}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
