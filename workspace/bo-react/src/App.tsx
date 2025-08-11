import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, ScaleControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import axios from 'axios'
import { fetchRecentStrikesFromHttp } from './blitzortung/httpProvider'

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

async function requestStrikesRpc(): Promise<RpcResponse | null> {
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

  const [source, setSource] = useState<'http' | 'rpc'>('http')
  const [region, setRegion] = useState<number>(2)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const mapCenter = useMemo(() => ({ lat: 51.1657, lng: 10.4515 }), [])

  useEffect(() => {
    let cancelled = false

    async function fetchOnce() {
      setLoading(true)
      setError(null)

      // 1) HTTP provider if chosen and creds provided
      if (source === 'http' && username && password) {
        const httpStrikes = await fetchRecentStrikesFromHttp(region, 10, username, password)
        if (httpStrikes.length > 0) {
          if (!cancelled) setStrikes(httpStrikes)
          setLoading(false)
          return
        }
      }

      // 2) JSON-RPC provider
      const response = await requestStrikesRpc()
      if (response && (response.s?.length || 0) > 0) {
        const referenceTime = response.t ? Date.parse(response.t) : Date.now()
        const raw = response.s || []
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
        return
      }

      // 3) Fallback demo
      const demo = await loadFallback()
      if (demo && demo.s) {
        const referenceTime = demo.t ? Date.parse(demo.t) : Date.now()
        const raw = demo.s || []
        const mapped: Strike[] = raw.map(([deltaSec, lon, lat, lateralError, amplitude]) => ({
          timestamp: referenceTime - deltaSec * 1000,
          longitude: lon,
          latitude: lat,
          lateralError,
          altitude: 0,
          amplitude,
        }))
        if (!cancelled) setStrikes(mapped)
      } else {
        if (!cancelled) setError('Нет данных от сервисов')
      }
      setLoading(false)
    }

    fetchOnce()
    const id = setInterval(fetchOnce, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [source, region, username, password])

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <div style={{ position: 'absolute', zIndex: 1000, top: 10, left: 10, background: '#ffffffcc', padding: 8, borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Source:
            <select value={source} onChange={(e) => setSource(e.target.value as any)} style={{ marginLeft: 6 }}>
              <option value="http">HTTP (auth)</option>
              <option value="rpc">JSON-RPC</option>
            </select>
          </label>
          <label>
            Region:
            <input type="number" value={region} onChange={(e) => setRegion(parseInt(e.target.value || '0', 10))} style={{ width: 64, marginLeft: 6 }} />
          </label>
          {source === 'http' && (
            <>
              <label>
                Username:
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} style={{ marginLeft: 6 }} />
              </label>
              <label>
                Password:
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginLeft: 6 }} />
              </label>
            </>
          )}
        </div>
      </div>

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
        <div style={{ position: 'absolute', top: 60, left: 10, background: '#fff', padding: '6px 10px', borderRadius: 6 }}>
          Загрузка...
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', top: 60, right: 10, background: '#fee', color: '#900', padding: '6px 10px', borderRadius: 6 }}>
          {error}
        </div>
      )}
    </div>
  )
}

export default App
