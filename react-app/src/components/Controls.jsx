import { useEffect, useRef, useState } from 'react';

export default function Controls({ connected, demoMode, onChangeDemoMode, onClear }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [coords, setCoords] = useState(null);
  const locateAbortRef = useRef(null);

  useEffect(() => () => {
    if (locateAbortRef.current) locateAbortRef.current.abort();
  }, []);

  function doLocate() {
    const controller = new AbortController();
    locateAbortRef.current = controller;
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy });
    }, () => {}, { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 });
  }

  return (
    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: 'white', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div><strong>Статус:</strong> {connected ? 'Подключено' : 'Отключено'}</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={demoMode} onChange={(e) => onChangeDemoMode(e.target.checked)} /> Демо-режим
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} /> Звук удара
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClear}>Очистить</button>
        <button onClick={doLocate}>Геолокация</button>
      </div>
      {coords ? (
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          Ваши координаты: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)} (±{Math.round(coords.accuracy)}м)
        </div>
      ) : null}
      <div style={{ fontSize: 12, opacity: 0.9 }}>
        Для подключения к реальному потоку установите window.APP_CONFIG.lightningWsUrl в `public/config.js`.
      </div>
    </div>
  );
}