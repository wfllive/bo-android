import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { OSMView } from 'expo-osm-sdk';
import * as Location from 'expo-location';
import dayjs from 'dayjs';
import Constants from 'expo-constants';

const DEFAULT_COORD = { lat: 51.0, lon: 10.0 };
const SERVICE_URL = (Constants.expoConfig?.extra?.blitz?.serviceUrl) || 'http://bo-service.tryb.de/';

function buildJsonRpcRequest(method, params) {
  return JSON.stringify({ id: 0, method, params });
}

async function callJsonRpc(url, method, params = []) {
  const body = buildJsonRpcRequest(method, params);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/json',
      'Accept': '*/*',
      'User-Agent': 'bo-android-expo'
    },
    body,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const rawText = await response.text();
  const text = (rawText || '').trim();
  if (!text) throw new Error('Empty JSON-RPC response');
  const parsed = JSON.parse(text);
  const json = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!json || typeof json !== 'object') throw new Error('Invalid JSON-RPC payload');
  return json;
}

function parseStrikes(referenceTimeIso, strikesArray) {
  const referenceMs = dayjs(referenceTimeIso, "YYYYMMDD'T'HH:mm:ss").valueOf();
  if (!Number.isFinite(referenceMs)) return [];
  if (!Array.isArray(strikesArray)) return [];
  return strikesArray.map((arr, idx) => {
    const secondsAgo = arr?.[0];
    const longitude = arr?.[1];
    const latitude = arr?.[2];
    const lateralError = arr?.[3];
    const amplitude = arr?.[4];
    const timestamp = referenceMs - (Number.isFinite(secondsAgo) ? secondsAgo : 0) * 1000;
    return {
      id: `${timestamp}-${longitude}-${latitude}-${idx}`,
      timestamp,
      longitude,
      latitude,
      lateralError,
      amplitude,
    };
  });
}

export default function App() {
  const [center, setCenter] = useState(DEFAULT_COORD);
  const [error, setError] = useState(null);
  const [strikes, setStrikes] = useState([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          if (!mounted) return;
          setCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        }
      } catch (e) { setError(String(e?.message || e)); }
    })();
    return () => { mounted = false; };
  }, []);

  const fetchInitial = useCallback(async () => {
    const intervalMinutes = 15;
    const payload = await callJsonRpc(SERVICE_URL, 'get_strikes', [intervalMinutes, 0]);
    const t = payload?.t;
    const s = payload?.s;
    const parsed = parseStrikes(t, s);
    setStrikes(parsed);
    if (typeof payload?.next === 'number') nextIdRef.current = payload.next;
  }, []);

  const fetchIncremental = useCallback(async () => {
    if (!nextIdRef.current) return;
    const intervalMinutes = 15;
    const payload = await callJsonRpc(SERVICE_URL, 'get_strikes', [intervalMinutes, nextIdRef.current]);
    const t = payload?.t;
    const s = payload?.s;
    const parsed = parseStrikes(t, s);
    if (parsed.length) {
      setStrikes((prev) => {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        return [...prev.filter(p => p.timestamp >= oneHourAgo), ...parsed];
      });
    }
    if (typeof payload?.next === 'number') nextIdRef.current = payload.next;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await fetchInitial(); } catch (e) { setError(String(e?.message || e)); }
    })();
    const id = setInterval(() => { fetchIncremental().catch(e => setError(String(e?.message || e))); }, 7000);
    return () => { mounted = false; clearInterval(id); };
  }, [fetchInitial, fetchIncremental]);

  const markers = strikes.map((s) => ({
    id: s.id,
    coordinate: { latitude: s.latitude, longitude: s.longitude },
    icon: { color: '#ff0000', size: 12 },
    title: `Amp ${Number(s.amplitude).toFixed(1)} kA`,
    description: new Date(s.timestamp).toLocaleTimeString(),
  }));

  const circles = strikes.slice(-200).map((s, idx) => ({
    id: `c-${s.id}-${idx}`,
    center: { latitude: s.latitude, longitude: s.longitude },
    radius: Math.max(1000, Number(s.lateralError) * 1000),
    fillColor: 'rgba(255,0,0,0.15)',
    strokeColor: 'rgba(255,0,0,0.6)',
    strokeWidth: 1,
  }));

  return (
    <View style={styles.container}>
      <OSMView
        style={styles.map}
        initialCenter={{ latitude: center.lat, longitude: center.lon }}
        initialZoom={4}
        markers={markers}
        circles={circles}
        clustering={{ enabled: true }}
      />
      {error ? (<View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  errorBanner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', padding: 8,
  },
  errorText: { color: '#fff', textAlign: 'center' },
});
