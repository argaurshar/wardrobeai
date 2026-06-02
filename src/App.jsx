import { useState } from 'react';
import UnitsScreen from './screens/UnitsScreen.jsx';
import SizeScreen from './screens/SizeScreen.jsx';
import OptionsScreen from './screens/OptionsScreen.jsx';
import EditorScreen from './screens/EditorScreen.jsx';

export default function App() {
  const [step, setStep] = useState('units');
  const [unit, setUnit] = useState('mm');
  const [dims, setDims] = useState(null); // always stored in mm
  const [chosenLayout, setChosenLayout] = useState(null);

  return (
    <div className="min-h-screen w-full bg-surround">
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
