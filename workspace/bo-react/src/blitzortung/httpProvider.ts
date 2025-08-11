import axios from 'axios'

export interface HttpStrike {
  timestamp: number
  longitude: number
  latitude: number
  altitude: number
  amplitude: number
  lateralError: number
}

function formatPathForMinute(region: number, date: Date): string {
  // Android uses pattern yyyy/MM/dd/kk/mm with kk=1..24. We'll map hours 0..23 to 1..24 for kk.
  const yyyy = date.getUTCFullYear()
  const MM = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const hour0_23 = date.getUTCHours()
  const kk = String((hour0_23 + 1)).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  return `/bo/Data/Protected/Strikes_${region}/${yyyy}/${MM}/${dd}/${kk}/${mm}.log`
}

function parseTimestamp(dateField: string, timeField: string): number {
  // fields[0] like 2025-08-11, fields[1] like 15:32:10.123456
  const base = (dateField.replace(/-/g, '') + 'T' + timeField).slice(0, 19 + 1 + 3) // yyyyMMddTHH:mm:ss.SSS
  const yyyy = base.slice(0, 4)
  const MM = base.slice(4, 6)
  const dd = base.slice(6, 8)
  const HH = base.slice(9, 11)
  const mm = base.slice(12, 14)
  const ss = base.slice(15, 17)
  const SSS = base.slice(18, 21)
  const iso = `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}.${SSS}Z`
  return Date.parse(iso)
}

function parseStrikeLine(line: string): HttpStrike | null {
  // Split by spaces into fields
  const fields = line.trim().split(/\s+/)
  if (fields.length < 3) return null
  const timestamp = parseTimestamp(fields[0], fields[1])

  let longitude = 0
  let latitude = 0
  let altitude = 0
  let amplitude = 0
  let lateralError = 0

  for (let i = 2; i < fields.length; i++) {
    const part = fields[i]
    const [key, rest] = part.split(/;/, 2)
    if (!rest) continue
    const values = rest.split(/;/)
    switch (key) {
      case 'pos': {
        if (values.length >= 3) {
          latitude = parseFloat(values[0])
          longitude = parseFloat(values[1])
          altitude = parseInt(values[2], 10) || 0
        }
        break
      }
      case 'str': {
        amplitude = parseFloat(values[0]) || 0
        break
      }
      case 'dev': {
        lateralError = parseInt(values[0], 10) || 0
        break
      }
      default:
        break
    }
  }

  return {
    timestamp,
    longitude,
    latitude,
    altitude,
    amplitude,
    lateralError,
  }
}

export async function fetchRecentStrikesFromHttp(region: number, minutesBack: number, username: string, password: string) {
  const end = new Date()
  const urls: string[] = []
  for (let i = 0; i < minutesBack; i++) {
    const d = new Date(end.getTime() - i * 60_000)
    urls.push(formatPathForMinute(region, d))
  }
  const auth = 'Basic ' + btoa(`${username}:${password}`)
  const headers = { Authorization: auth }
  const results = await Promise.allSettled(urls.map((u) => axios.get(u, { headers, responseType: 'text', validateStatus: () => true })))
  const strikes: HttpStrike[] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && typeof r.value.data === 'string') {
      const text: string = r.value.data as any
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        if (!line) continue
        const s = parseStrikeLine(line)
        if (s) strikes.push(s)
      }
    }
  }
  // Keep only unique by timestamp+coords and sort by time desc
  const key = (s: HttpStrike) => `${s.timestamp}|${s.longitude}|${s.latitude}`
  const map = new Map<string, HttpStrike>()
  for (const s of strikes) map.set(key(s), s)
  const unique = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp)
  return unique
}