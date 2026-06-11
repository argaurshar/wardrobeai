import { useState } from 'react';
import UnitsScreen from './screens/UnitsScreen.jsx';
import SizeScreen from './screens/SizeScreen.jsx';
import OptionsScreen from './screens/OptionsScreen.jsx';
import EditorScreen from './screens/EditorScreen.jsx';

const STEPS = [
  { id: 'units', label: 'Units' },
  { id: 'size', label: 'Size' },
  { id: 'options', label: 'Layout' },
  { id: 'editor', label: 'Editor' },
];

export default function App() {
  const [step, setStep] = useState('units');
  const [unit, setUnit] = useState('mm');
  const [dims, setDims] = useState(null); // always stored in mm
  const [chosenLayout, setChosenLayout] = useState(null);

  return (
    <div className="min-h-screen w-full app-bg">
      {step !== 'editor' && <Stepper current={step} onJump={setStep} />}
      {step === 'units' && (
        <UnitsScreen
          unit={unit}
          onChange={setUnit}
          onContinue={() => setStep('size')}
        />
      )}
      {step === 'size' && (
        <SizeScreen
          unit={unit}
          onBack={() => setStep('units')}
          onSubmit={(mmDims) => {
            setDims(mmDims);
            setStep('options');
          }}
        />
      )}
      {step === 'options' && dims && (
        <OptionsScreen
          dims={dims}
          onBack={() => setStep('size')}
          onConfirm={(layout) => {
            setChosenLayout(layout);
            setStep('editor');
          }}
        />
      )}
      {step === 'editor' && chosenLayout && (
        <EditorScreen
          initialLayout={chosenLayout}
          onBack={() => setStep('options')}
        />
      )}
    </div>
  );
}

// Progress indicator. Steps already visited can be clicked to jump back.
function Stepper({ current, onJump }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && (
              <span
                className={[
                  'block w-8 h-px transition-colors duration-300',
                  done || active ? 'bg-accent/60' : 'bg-stone-700',
                ].join(' ')}
              />
            )}
            <button
              type="button"
              disabled={!done}
              onClick={() => done && onJump(s.id)}
              className={[
                'flex items-center gap-1.5 text-[10px] uppercase tracking-architectural transition-colors duration-300',
                active
                  ? 'text-accent'
                  : done
                    ? 'text-stone-300 hover:text-accent cursor-pointer'
                    : 'text-stone-600 cursor-default',
              ].join(' ')}
            >
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full transition-all duration-300',
                  active
                    ? 'bg-accent scale-125 shadow-glow'
                    : done
                      ? 'bg-accent/70'
                      : 'bg-stone-700',
                ].join(' ')}
              />
              {s.label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
