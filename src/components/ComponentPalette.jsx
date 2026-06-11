import { defaultHeightFor, TYPE_LABELS } from '../editor/columnOps.js';

const CORE = ['shelf', 'drawer', 'hanging', 'shoeRack'];
const ACCESSORIES = ['trouserRack', 'wireBasket', 'valetRod', 'tieRack'];
const SUBS = {
  shelf: 'open compartment',
  drawer: '200 mm box',
  hanging: '1000 mm rail',
  shoeRack: 'angled rack',
  trouserRack: 'pull-out rack',
  wireBasket: 'mesh basket',
  valetRod: 'pull-out rod',
  tieRack: 'tie & belt',
};

// Draggable cards. Pointerdown on a card lifts the drag state to the parent
// (EditorScreen) — the parent owns the document-level move / up listeners.
export default function ComponentPalette({ onCardDown, activeType }) {
  return (
    <section>
      <p className="text-inkFaint text-[11px] uppercase tracking-architectural mb-4 px-1">
        Components
      </p>
      <p className="text-stone-600 text-[10px] mb-4 px-1 leading-relaxed">
        Drag a card into a column to place it. The other items in that column
        will rebalance to fit.
      </p>
      <ul className="space-y-2">
        {CORE.map((type) => (
          <PaletteCard
            key={type}
            type={type}
            activeType={activeType}
            onCardDown={onCardDown}
          />
        ))}
      </ul>

      <p className="text-inkFaint text-[11px] uppercase tracking-architectural mt-6 mb-3 px-1">
        Accessories
      </p>
      <ul className="space-y-2">
        {ACCESSORIES.map((type) => (
          <PaletteCard
            key={type}
            type={type}
            activeType={activeType}
            onCardDown={onCardDown}
          />
        ))}
      </ul>
    </section>
  );
}

function PaletteCard({ type, activeType, onCardDown }) {
  return (
    <li>
      <button
        type="button"
        onPointerDown={(e) => onCardDown(type, e)}
        className={[
          'w-full text-left p-3 rounded-md bg-stone-900 border transition-all duration-150 select-none',
          'hover:bg-stone-800 hover:border-stone-600 hover:translate-x-1',
          activeType === type
            ? 'border-accent/60 ring-1 ring-accent/40 cursor-grabbing'
            : 'border-stone-800 cursor-grab',
        ].join(' ')}
        style={{ touchAction: 'none' }}
        draggable={false}
      >
        <div className="flex items-center gap-3">
          <PreviewSwatch type={type} />
          <div className="flex-1 min-w-0">
            <div className="text-stone-200 text-sm font-medium leading-tight">
              {TYPE_LABELS[type]}
            </div>
            <div className="text-stone-500 text-[11px] leading-tight">
              {SUBS[type]} · {defaultHeightFor(type)} mm
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

// Tiny architectural-style swatch matching how the type renders in the SVG.
function PreviewSwatch({ type }) {
  const W = 36;
  const H = 36;
  switch (type) {
    case 'shelf':
      return (
        <svg width={W} height={H} viewBox="0 0 36 36" className="shrink-0">
          <rect x={2} y={2} width={32} height={32} fill="#efe2c4" stroke="#7a5b39" strokeWidth={1} />
          <rect x={2} y={10} width={32} height={3} fill="#b08e60" />
        </svg>
      );
    case 'drawer':
      return (
        <svg width={W} height={H} viewBox="0 0 36 36" className="shrink-0">
          <rect x={4} y={4} width={28} height={28} fill="#d4b48a" stroke="#7a5b39" strokeWidth={1.5} />
          <line x1={14} y1={11} x2={22} y2={11} stroke="#7a5b39" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      );
    case 'hanging':
      return (
        <svg width={W} height={H} viewBox="0 0 36 36" className="shrink-0">
          <rect x={2} y={2} width={32} height={32} fill="#efe2c4" stroke="#7a5b39" strokeWidth={1} />
          <line x1={6} y1={10} x2={30} y2={10} stroke="#5a4632" strokeWidth={2} strokeLinecap="round" />
          <line x1={11} y1={12} x2={11} y2={28} stroke="#5a4632" strokeWidth={1} opacity={0.4} />
          <line x1={18} y1={12} x2={18} y2={28} stroke="#5a4632" strokeWidth={1} opacity={0.4} />
          <line x1={25} y1={12} x2={25} y2={28} stroke="#5a4632" strokeWidth={1} opacity={0.4} />
        </svg>
      );
    case 'shoeRack':
      return (
        <svg width={W} height={H} viewBox="0 0 36 36" className="shrink-0">
          <rect x={2} y={2} width={32} height={32} fill="#efe2c4" stroke="#7a5b39" strokeWidth={1} />
          <line x1={5} y1={14} x2={30} y2={8} stroke="#7a5b39" strokeWidth={1.5} />
          <line x1={5} y1={22} x2={30} y2={16} stroke="#7a5b39" strokeWidth={1.5} />
          <line x1={5} y1={30} x2={30} y2={24} stroke="#7a5b39" strokeWidth={1.5} />
        </svg>
      );
    case 'trouserRack':
      return (
        <svg width={W} height={H} viewBox="0 0 36 36" className="shrink-0">
          <rect x={2} y={2} width={32} height={32} fill="#efe2c4" stroke="#7a5b39" strokeWidth={1} />
          {[10, 16, 22, 28].map((y) => (
            <line key={y} x1={6} y1={y} x2={30} y2={y} stroke="#5a4632" strokeWidth={1.5} strokeLinecap="round" />
          ))}
          <line x1={30} y1={8} x2={30} y2={30} stroke="#7a5b39" strokeWidth={1.5} />
        </svg>
      );
    case 'wireBasket':
      return (
        <svg width={W} height={H} viewBox="0 0 36 36" className="shrink-0">
          <rect x={4} y={6} width={28} height={24} fill="#efe2c4" stroke="#7a5b39" strokeWidth={1.5} />
          {[11, 18, 25].map((x) => (
            <line key={x} x1={x} y1={7} x2={x} y2={29} stroke="#7a5b39" strokeWidth={1} opacity={0.5} />
          ))}
          {[14, 22].map((y) => (
            <line key={y} x1={5} y1={y} x2={31} y2={y} stroke="#7a5b39" strokeWidth={1} opacity={0.5} />
          ))}
        </svg>
      );
    case 'valetRod':
      return (
        <svg width={W} height={H} viewBox="0 0 36 36" className="shrink-0">
          <rect x={2} y={2} width={32} height={32} fill="#efe2c4" stroke="#7a5b39" strokeWidth={1} />
          <line x1={6} y1={14} x2={28} y2={14} stroke="#5a4632" strokeWidth={2.5} strokeLinecap="round" />
          <path d="M28 14 q5 0 5 6" fill="none" stroke="#5a4632" strokeWidth={1.5} />
        </svg>
      );
    case 'tieRack':
      return (
        <svg width={W} height={H} viewBox="0 0 36 36" className="shrink-0">
          <rect x={2} y={2} width={32} height={32} fill="#efe2c4" stroke="#7a5b39" strokeWidth={1} />
          <line x1={6} y1={9} x2={6} y2={29} stroke="#7a5b39" strokeWidth={1.5} />
          {[12, 18, 24].map((y) => (
            <line key={y} x1={6} y1={y} x2={28} y2={y} stroke="#5a4632" strokeWidth={1.5} strokeLinecap="round" />
          ))}
        </svg>
      );
    default:
      return null;
  }
}
