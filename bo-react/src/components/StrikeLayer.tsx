import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, LayerGroup, useMap } from 'react-leaflet'
import { getStrikes } from '../services/rpc'
import type { Strike } from '../models/types'

function colorByAge(referenceTime: number, ts: number) {
  const ageSec = Math.max(0, Math.floor((referenceTime - ts) / 1000))
  // emulate 6 color buckets like Android scheme
  const palette = ['#00ffff', '#00ff00', '#ffff00', '#ffa500', '#ff4500', '#ff0000']
  const idx = Math.min(palette.length - 1, Math.floor(ageSec / 60))
  return palette[idx]
}

export function StrikeLayer() {
  const map = useMap()
  const [strikes, setStrikes] = useState<Strike[]>([])
  const [referenceTime, setReferenceTime] = useState<number>(Date.now())
  const nextIdRef = useRef<number>(0)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      try {
        const res = await getStrikes({ intervalDuration: 60, intervalOffset: -1, nextId: nextIdRef.current })
        const data = (res as any).data
        // t format example: 20250101'T'12:34:56
        const t: string = data.t
        const ref = (t && t.includes("T")) ? Date.parse(t.replace("'", 'Z')) : Date.now()
        setReferenceTime(ref)
        const s = (data.s as any[]).map((arr: any[]) => ({
          timestamp: ref - 1000 * arr[0],
          longitude: arr[1],
          latitude: arr[2],
          lateralError: arr[3],
          altitude: 0,
          amplitude: arr[4],
        })) as Strike[]
        setStrikes(prev => (nextIdRef.current === 0 ? s : [...prev, ...s]).slice(-5000))
        if (typeof data.next === 'number') nextIdRef.current = data.next
      } catch (e) {
        console.error('get_strikes failed', e)
      }
      if (!cancelled) setTimeout(tick, 2000)
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [])

  const markers = useMemo(() => strikes.map((s, i) => (
    <CircleMarker key={i}
      center={[s.latitude, s.longitude]}
      radius={3}
      pathOptions={{ color: colorByAge(referenceTime, s.timestamp), weight: 1, opacity: 0.9 }}
    />
  )), [strikes, referenceTime])

  return <LayerGroup>{markers}</LayerGroup>
}