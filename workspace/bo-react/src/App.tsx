import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, ScaleControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import axios from 'axios'

interface Strike {
  timestamp: number
  longitude: number
  latitude: number
  lateralError: number
  altitude: number
  amplitude: number
}

interface RpcResponse {
  t?: string
  s?: [number, number, number, number, number][]
  next?: number
  h?: number[]
}

async function requestStrikes(): Promise<RpcResponse | null> {
  try {
    const payload = { params: [10, -1] }
    const { data } = await axios.post<RpcResponse>(
      '/rpc',
      { id: 0, method: 'get_strikes', params: payload.params },
      { headers: { 'Content-Type': 'text/json' } }
    )
    return (Array.isArray(data) ? (data as any)[0] : data) || null
  } catch {
    return null
  }
}

async function loadFallback(): Promise<RpcResponse | null> {
  try {
    const { data } = await axios.get<RpcResponse>('/demo-strikes.json')
    return data
  } catch {
    return null
  }
}

function App() {
  const [strikes, setStrikes] = useState<Strike[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapCenter = useMemo(() => ({ lat: 51.1657, lng: 10.4515 }), [])

  useEffect(() => {
    let cancelled = false

    async function fetchOnce() {
      setLoading(true)
      setError(null)
      const response = await requestStrikes()
      let resp = response
      if (!resp || (!resp.s && !resp.t)) {
        // empty or failed -> fallback to demo
        resp = await loadFallback()
        if (!resp) {
          if (!cancelled) setError('Нет данных от сервиса и нет локального демо')
          setLoading(false)
          return
        }
      }
      const referenceTime = resp.t ? Date.parse(resp.t) : Date.now()
      const raw = resp.s || []
      const mapped: Strike[] = raw.map(([deltaSec, lon, lat, lateralError, amplitude]) => ({
        timestamp: referenceTime - deltaSec * 1000,
        longitude: lon,
        latitude: lat,
        lateralError,
        altitude: 0,
        amplitude,
      }))
      if (!cancelled) setStrikes(mapped)
      setLoading(false)
    }

    fetchOnce()
    const id = setInterval(fetchOnce, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={5} style={{ height: '100%', width: '100%' }} preferCanvas>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <ScaleControl position='bottomleft' />
        {strikes.map((s, idx) => (
          <CircleMarker
            key={`${s.timestamp}-${idx}`}
            center={[s.latitude, s.longitude]}
            radius={Math.max(2, Math.min(8, 2 + Math.abs(s.amplitude) / 20))}
            pathOptions={{ color: '#ff3333', fillColor: '#ff3333', fillOpacity: 0.6, weight: 1 }}
          >
            <Tooltip direction='top' offset={[0, -4]} opacity={1} permanent={false}>
              <div>
                <div><strong>Amplitude:</strong> {s.amplitude.toFixed(1)}</div>
                <div><strong>Time:</strong> {new Date(s.timestamp).toLocaleString()}</div>
                <div><strong>Error:</strong> {s.lateralError.toFixed(1)} km</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      {loading && (
        <div style={{ position: 'absolute', top: 10, left: 10, background: '#fff', padding: '6px 10px', borderRadius: 6 }}>
          Загрузка молний...
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', top: 10, right: 10, background: '#fee', color: '#900', padding: '6px 10px', borderRadius: 6 }}>
          {error}
        </div>
      )}
    </div>
  )
}

export default App
