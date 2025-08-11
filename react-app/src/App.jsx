import { useMemo } from 'react';
import MapView from './components/MapView.jsx';
import Controls from './components/Controls.jsx';
import { useLightningStream } from './hooks/useLightningStream.js';

export default function App() {
  const { strikes, connected, demoMode, setDemoMode, clearOld } = useLightningStream({ demoModeDefault: true });
  const title = useMemo(() => (demoMode ? 'Lightning Monitor (Demo)' : 'Lightning Monitor'), [demoMode]);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif', height: '100dvh', width: '100vw' }}>
      <div style={{ position: 'absolute', zIndex: 500, top: 12, left: 12, background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 8, padding: '6px 10px' }}>{title}</div>
      <MapView strikes={strikes} />
      <Controls connected={connected} demoMode={demoMode} onChangeDemoMode={setDemoMode} onClear={clearOld} />
    </div>
  );
}