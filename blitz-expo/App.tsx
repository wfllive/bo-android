import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, View, StyleSheet, Text } from 'react-native'
import MapView, { Marker, Circle } from 'expo-maps'
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

const DEFAULT_REGION = {
  latitude: 51.0,
  longitude: 10.0,
  latitudeDelta: 20,
  longitudeDelta: 20,
}

const SERVICE_URL = (Constants.expoConfig?.extra as any)?.blitz?.serviceUrl || 'http://bo-service.tryb.de/'

function buildJsonRpcRequest(method: string, params: any[]): string {
  return JSON.stringify({ id: 0, method, params })
}

async function callJsonRpc<T = any>(url: string, method: string, params: any[] = []): Promise<T> {
  const body = buildJsonRpcRequest(method, params)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const text = await response.text()
  const json = text.startsWith('[') ? JSON.parse(text)[0] : JSON.parse(text)
  return json as T
}

function parseStrikes(referenceTimeIso: string, strikesArray: any[]): Strike[] {
  // TimeFormat.parseTime("yyyyMMdd'T'HH:mm:ss") equivalent
  const referenceMs = dayjs(referenceTimeIso, "YYYYMMDD'T'HH:mm:ss").valueOf()
  return strikesArray.map((arr, idx) => {
    const secondsAgo = arr[0] as number
    const longitude = arr[1] as number
    const latitude = arr[2] as number
    const lateralError = arr[3] as number
    const amplitude = arr[4] as number
    const timestamp = referenceMs - secondsAgo * 1000
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
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined')
  const [initialRegion, setInitialRegion] = useState(DEFAULT_REGION)
  const [strikes, setStrikes] = useState<Strike[]>([])
  const nextIdRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (!mounted) return
        setLocationPermission(status)
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({})
          if (!mounted) return
          setInitialRegion((prev) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }))
        }
      } catch (e: any) {
        setError(String(e?.message || e))
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const fetchInitial = useCallback(async () => {
    // get_strikes with intervalDuration and nextId=0
    const intervalMinutes = 15
    const payload: any = await callJsonRpc<any>(SERVICE_URL, 'get_strikes', [intervalMinutes, 0])
    const t = payload.t as string
    const s = payload.s as any[]
    const parsed = parseStrikes(t, s)
    setStrikes(parsed)
    if (typeof payload.next === 'number') {
      nextIdRef.current = payload.next
    }
  }, [])

  const fetchIncremental = useCallback(async () => {
    if (!nextIdRef.current) return
    const intervalMinutes = 15
    const payload: any = await callJsonRpc<any>(SERVICE_URL, 'get_strikes', [intervalMinutes, nextIdRef.current])
    const t = payload.t as string
    const s = payload.s as any[]
    const parsed = parseStrikes(t, s)
    if (parsed.length) {
      setStrikes((prev) => {
        // keep only last 60 minutes
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        const merged = [...prev.filter(p => p.timestamp >= oneHourAgo), ...parsed]
        return merged
      })
    }
    if (typeof payload.next === 'number') {
      nextIdRef.current = payload.next
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await fetchInitial()
      } catch (e: any) {
        setError(String(e?.message || e))
      }
    })()
    const id = setInterval(() => {
      fetchIncremental().catch((e) => setError(String(e?.message || e)))
    }, 5000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [fetchInitial, fetchIncremental])

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {strikes.map((strike) => (
          <Marker key={strike.id} coordinate={{ latitude: strike.latitude, longitude: strike.longitude }}>
            <View style={styles.markerContainer}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        ))}
        {strikes.map((strike) => (
          <Circle key={`c-${strike.id}`} center={{ latitude: strike.latitude, longitude: strike.longitude }} radius={Math.max(1000, strike.lateralError * 1000)} strokeColor="rgba(255,0,0,0.6)" fillColor="rgba(255,0,0,0.15)" />
        ))}
      </MapView>
      {error ? (
        <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerContainer: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,0,0,0.9)'
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    alignSelf: 'center',
    marginTop: 4,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  errorText: { color: '#fff', textAlign: 'center' },
})
