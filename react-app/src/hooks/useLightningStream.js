import { useEffect, useMemo, useRef, useState } from 'react';
import { getAppConfig } from '../config.js';

const STRIKE_TTL_MS = 60 * 60 * 1000; // 60 минут

function generateRandomStrike() {
  const latitude = -85 + Math.random() * 170;
  const longitude = -180 + Math.random() * 360;
  const amplitudeKiloAmp = Math.round(5 + Math.random() * 95);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    latitude,
    longitude,
    amplitudeKiloAmp,
    timestampMs: Date.now()
  };
}

function playBeep(audioCtxRef) {
  try {
    const audioCtx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880; // A5
    gainNode.gain.value = 0.05;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      oscillator.disconnect();
      gainNode.disconnect();
    }, 80);
  } catch (_) {}
}

export function useLightningStream(options = {}) {
  const { demoModeDefault = true, soundEnabled = false } = options;
  const [{ demoMode }, setState] = useState({ demoMode: demoModeDefault });
  const [strikes, setStrikes] = useState([]);
  const [connected, setConnected] = useState(false);
  const audioCtxRef = useRef(null);
  const wsRef = useRef(null);

  const { lightningWsUrl } = useMemo(() => getAppConfig(), []);

  useEffect(() => {
    let intervalId;

    function addStrike(strike) {
      setStrikes((prev) => {
        const now = Date.now();
        const filtered = prev.filter((s) => now - s.timestampMs < STRIKE_TTL_MS);
        return [...filtered, strike].slice(-5000);
      });
      if (soundEnabled) {
        playBeep(audioCtxRef);
      }
    }

    if (!demoMode && lightningWsUrl) {
      try {
        const ws = new WebSocket(lightningWsUrl);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);
        ws.onmessage = (event) => {
          const data = typeof event.data === 'string' ? event.data : '';
          try {
            const parsed = JSON.parse(data);
            const latitude = parsed.lat ?? parsed.latitude;
            const longitude = parsed.lon ?? parsed.lng ?? parsed.longitude;
            const timestampMs = parsed.timeMs ?? parsed.timestampMs ?? Date.now();
            const amplitudeKiloAmp = parsed.amp ?? parsed.amplitude ?? null;
            if (typeof latitude === 'number' && typeof longitude === 'number') {
              addStrike({ id: `${timestampMs}-${Math.random().toString(36).slice(2,6)}`, latitude, longitude, amplitudeKiloAmp, timestampMs });
              return;
            }
          } catch (_) {}
          const parts = data.split(',').map((p) => p.trim());
          if (parts.length >= 2) {
            const latitude = parseFloat(parts[0]);
            const longitude = parseFloat(parts[1]);
            const timestampMs = parts[2] ? Number(parts[2]) : Date.now();
            const amplitudeKiloAmp = parts[3] ? Number(parts[3]) : null;
            if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
              addStrike({ id: `${timestampMs}-${Math.random().toString(36).slice(2,6)}`, latitude, longitude, amplitudeKiloAmp, timestampMs });
            }
          }
        };
      } catch (_) {
        setConnected(false);
      }
    } else {
      setConnected(true);
      intervalId = setInterval(() => {
        const batchSize = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < batchSize; i += 1) {
          addStrike(generateRandomStrike());
        }
      }, 1200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (_) {}
        wsRef.current = null;
      }
    };
  }, [demoMode, lightningWsUrl, soundEnabled]);

  const clearOld = () => setStrikes([]);
  const setDemoMode = (value) => setState({ demoMode: value });

  return { strikes, connected, demoMode, setDemoMode, clearOld };
}