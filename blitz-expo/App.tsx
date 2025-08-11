import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { OSMView, type OSMViewRef, Marker as OSMMarker } from 'expo-osm-sdk'
import * as Location from 'expo-location'
import dayjs from 'dayjs'
import Constants from 'expo-constants'

type Strike = {
  id: string
  timestamp: number
  longitude: number
  latitude: number
  lateralError: number
  amplitude: number
}

const DEFAULT_COORD = { lat: 51.0, lon: 10.0 }
const SERVICE_URL = (Constants.expoConfig?.extra as any)?.blitz?.serviceUrl || 'http://bo-service.tryb.de/'

function buildJsonRpcRequest(method: string, params: any[]): string {
  return JSON.stringify({ id: 0, method, params })
}

async function callJsonRpc<T = any>(url: string, method: string, params: any[] = []): Promise<T> {
  const body = buildJsonRpcRequest(method, params)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

function parseStrikes(referenceTimeIso: string, strikesArray: any[]): Strike[] {
  const referenceMs = dayjs(referenceTimeIso, "YYYYMMDD'T'HH:mm:ss").valueOf()
  if (!Number.isFinite(referenceMs)) return []
  if (!Array.isArray(strikesArray)) return []
  return strikesArray.map((arr, idx) => {
    const secondsAgo = arr?.[0] as number
    const longitude = arr?.[1] as number
    const latitude = arr?.[2] as number
    const lateralError = arr?.[3] as number
    const amplitude = arr?.[4] as number
    const timestamp = referenceMs - (Number.isFinite(secondsAgo) ? secondsAgo : 0) * 1000
    return {
      id: `${timestamp}-${longitude}-${latitude}-${idx}`,
      timestamp,
      longitude,
      latitude,
      lateralError,
      amplitude,
    }
  })
}

export default function App() {
  const [center, setCenter] = useState(DEFAULT_COORD)
  const [error, setError] = useState<string | null>(null)
  const [strikes, setStrikes] = useState<Strike[]>([])
  const nextIdRef = useRef<number>(0)
  const mapRef = useRef<OSMViewRef>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({})
          if (!mounted) return
          setCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        }
      } catch (e: any) { setError(String(e?.message || e)) }
    })()
    return () => { mounted = false }
  }, [])

  const fetchInitial = useCallback(async () => {
    const intervalMinutes = 15
    const payload: any = await callJsonRpc<any>(SERVICE_URL, 'get_strikes', [intervalMinutes, 0])
    const t = payload?.t as string
    const s = payload?.s as any[]
    const parsed = parseStrikes(t, s)
    setStrikes(parsed)
    if (typeof payload?.next === 'number') nextIdRef.current = payload.next
  }, [])

  const fetchIncremental = useCallback(async () => {
    if (!nextIdRef.current) return
    const intervalMinutes = 15
    const payload: any = await callJsonRpc<any>(SERVICE_URL, 'get_strikes', [intervalMinutes, nextIdRef.current])
    const t = payload?.t as string
    const s = payload?.s as any[]
    const parsed = parseStrikes(t, s)
    if (parsed.length) {
      setStrikes((prev) => {
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        return [...prev.filter(p => p.timestamp >= oneHourAgo), ...parsed]
      })
    }
    if (typeof payload?.next === 'number') nextIdRef.current = payload.next
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try { await fetchInitial() } catch (e: any) { setError(String(e?.message || e)) }
    })()
    const id = setInterval(() => { fetchIncremental().catch(e => setError(String(e?.message || e))) }, 7000)
    return () => { mounted = false; clearInterval(id) }
  }, [fetchInitial, fetchIncremental])

  return (
    <View style={styles.container}>
      <OSMView
        ref={mapRef}
        style={styles.map}
        initialCenter={{ latitude: center.lat, longitude: center.lon }}
        initialZoom={4}
        onMapReady={() => {}}
      >
        {strikes.map((s) => (
          <OSMMarker
            key={s.id}
            id={s.id}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            color="#ff0000"
          />
        ))}
      </OSMView>
      {error ? (<View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  errorBanner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', padding: 8,
  },
  errorText: { color: '#fff', textAlign: 'center' },
})
