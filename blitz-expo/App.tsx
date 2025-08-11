import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { OSMView, type OSMViewRef, type MarkerConfig, type CircleConfig } from 'expo-osm-sdk'
import * as Location from 'expo-location'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import Constants from 'expo-constants'

dayjs.extend(utc)
dayjs.extend(customParseFormat)

type Strike = {
  id: string
  timestamp: number
  longitude: number
  latitude: number
  lateralError: number
  amplitude: number
}

type GridParams = {
  x0: number
  y1: number
  xd: number
  yd: number
  xc: number
  yc: number
}

// Center view on the world
const DEFAULT_COORD = { lat: 20.0, lon: 0.0 }

const RAW_SERVICE_URL = (Constants.expoConfig?.extra as any)?.blitz?.serviceUrl || 'http://bo-service.tryb.de/'
const SERVICE_URL = RAW_SERVICE_URL.endsWith('/') ? RAW_SERVICE_URL : RAW_SERVICE_URL + '/'

function buildJsonRpcRequest(method: string, params: any[]): string {
  return JSON.stringify({ id: 0, method, params })
}

async function callJsonRpc<T = any>(url: string, method: string, params: any[] = []): Promise<T> {
  const body = buildJsonRpcRequest(method, params)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/json',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip',
      'User-Agent': 'bo-android'
    },
    body,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const rawText = await response.text()
  const text = (rawText || '').trim()
  if (!text) throw new Error('Empty JSON-RPC response')
  try {
    const parsed = JSON.parse(text)
    const json = Array.isArray(parsed) ? parsed[0] : parsed
    if (!json || typeof json !== 'object') throw new Error('Invalid JSON-RPC payload')
    return json as T
  } catch (e: any) {
    throw new Error(`JSON parse failed: ${e?.message || e}`)
  }
}

function parseGridToStrikes(referenceTimeIso: string, gridParams: GridParams, r: any[]): Strike[] {
  const referenceMs = dayjs.utc(referenceTimeIso, "YYYYMMDD'T'HH:mm:ss", true).valueOf()
  if (!Number.isFinite(referenceMs)) return []
  if (!Array.isArray(r)) return []
  const { x0, y1, xd, yd } = gridParams
  return r.map((row, idx) => {
    const xi = row?.[0] as number
    const yi = row?.[1] as number
    const multiplicity = row?.[2] as number
    const dt = row?.[3] as number
    const longitude = x0 + (xi + 0.5) * xd
    const latitude = y1 + (yi + 0.5) * yd
    const timestamp = referenceMs + (Number.isFinite(dt) ? dt : 0) * 1000
    return {
      id: `g-${timestamp}-${longitude}-${latitude}-${idx}`,
      timestamp,
      longitude,
      latitude,
      lateralError: 0,
      amplitude: multiplicity || 1,
    }
  })
}

export default function App() {
  const [center] = useState(DEFAULT_COORD)
  const [error, setError] = useState<string | null>(null)
  const [strikes, setStrikes] = useState<Strike[]>([])
  const [lastUpdate, setLastUpdate] = useState<string>('—')
  const mapRef = useRef<OSMViewRef>(null)

  const fetchGlobalGrid = useCallback(async (intervalMinutes: number, gridSize: number) => {
    const payload: any = await callJsonRpc<any>(SERVICE_URL, 'get_global_strikes_grid', [intervalMinutes, gridSize, 0, 0])
    const t = payload?.t as string
    const gridParams: GridParams = { x0: payload?.x0, y1: payload?.y1, xd: payload?.xd, yd: payload?.yd, xc: payload?.xc, yc: payload?.yc }
    const r = payload?.r as any[]
    return parseGridToStrikes(t, gridParams, r)
  }, [])

  const fetchInitial = useCallback(async () => {
    try {
      // 240 minutes to ensure historical coverage worldwide
      const parsed = await fetchGlobalGrid(240, 4)
      setStrikes(parsed)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (e: any) {
      setError(String(e?.message || e))
    }
  }, [fetchGlobalGrid])

  const fetchRefresh = useCallback(async () => {
    try {
      const parsed = await fetchGlobalGrid(60, 4)
      setStrikes(parsed)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (e: any) {
      setError(String(e?.message || e))
    }
  }, [fetchGlobalGrid])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try { await fetchInitial() } catch (e: any) { setError(String(e?.message || e)) }
    })()
    const id = setInterval(() => { fetchRefresh().catch(e => setError(String(e?.message || e))) }, 60000)
    return () => { mounted = false; clearInterval(id) }
  }, [fetchInitial, fetchRefresh])

  const markers: MarkerConfig[] = strikes.map((s, idx) => ({
    id: s.id,
    coordinate: { latitude: s.latitude, longitude: s.longitude },
    icon: { color: '#ff0000', size: 9 },
    title: `${new Date(s.timestamp).toLocaleTimeString()}`,
    description: `Count ${s.amplitude}`,
    zIndex: 1,
  }))

  // Optional: small circles scaled by multiplicity
  const circles: CircleConfig[] = strikes.map((s, idx) => ({
    id: `c-${s.id}`,
    center: { latitude: s.latitude, longitude: s.longitude },
    radius: 20000 + Math.min(5, Math.max(1, s.amplitude)) * 5000,
    fillColor: 'rgba(255,0,0,0.08)',
    strokeColor: 'rgba(255,0,0,0.35)',
    strokeWidth: 1,
    zIndex: 0,
  }))

  return (
    <View style={styles.container}>
      <OSMView
        ref={mapRef}
        style={styles.map}
        initialCenter={{ latitude: center.lat, longitude: center.lon }}
        initialZoom={2}
        markers={markers}
        circles={circles}
        clustering={{ enabled: true }}
        onMapReady={() => {}}
      />
      <View style={styles.hud}>
        <Text style={styles.hudText}>strikes: {strikes.length} • updated: {lastUpdate} (global)</Text>
      </View>
      {error ? (<View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  hud: {
    position: 'absolute', top: 8, left: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  hudText: { color: '#fff', fontSize: 12, textAlign: 'center' },
  errorBanner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', padding: 8,
  },
  errorText: { color: '#fff', textAlign: 'center' },
})
