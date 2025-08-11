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

function App() {
  const [strikes, setStrikes] = useState<Strike[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapCenter = useMemo(() => ({ lat: 51.1657, lng: 10.4515 }), []) // Germany center

  useEffect(() => {
    let cancelled = false

    async function fetchStrikes() {
      try {
        setLoading(true)
        setError(null)
        // Android app calls get_strikes(intervalDuration, nextId or negative offset). Start with last 10 minutes.
        const payload = { params: [10, -1] }
        const { data } = await axios.post<RpcResponse>('/rpc/get_strikes', payload)

        // If array-wrapped, unwrap first element
        const response: RpcResponse = Array.isArray(data) ? (data as any)[0] : data
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
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load strikes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStrikes()
    const id = setInterval(fetchStrikes, 15000)
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
          Loading strikes...
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
