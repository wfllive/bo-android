export type JsonRpcResponse = { data: any }

const DEFAULT_SERVICE_URL = (typeof window === 'undefined' ? process.env.SERVICE_URL : '/rpc') || '/rpc'

async function rpcCall<T = JsonRpcResponse>(method: string, ...params: any[]): Promise<T> {
  const res = await fetch(DEFAULT_SERVICE_URL, { credentials: 'same-origin',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 0, method, params })
  })
  if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`)
  const text = await res.text()
  if (!text) throw new Error('Empty response')
  let parsed
  try {
    parsed = text.startsWith('[') ? JSON.parse(text)[0] : JSON.parse(text)
  } catch (e) {
    console.error('rpc raw response:', text)
    throw e
  }
  if (parsed.fault) throw new Error(parsed.faultString || 'RPC fault')
  return { data: parsed } as T
}

export async function getStrikesGrid(params: {
  intervalDuration: number
  gridSize: number
  intervalOffset: number
  region: number
  countThreshold: number
  localReference?: { x: number; y: number }
  dataArea?: number
}) {
  const { intervalDuration, gridSize, intervalOffset, region, countThreshold, localReference, dataArea } = params
  if (region === 0) {
    const r = await rpcCall('get_global_strikes_grid', intervalDuration, gridSize, intervalOffset, countThreshold)
    r.data.y1 = 0.0
    r.data.x0 = 0.0
    return r
  } else if (region === -1) {
    return rpcCall('get_local_strikes_grid', localReference!.x, localReference!.y, gridSize, intervalDuration, intervalOffset, countThreshold, dataArea)
  } else {
    return rpcCall('get_strikes_grid', intervalDuration, gridSize, intervalOffset, region, countThreshold)
  }
}

export async function getStrikes(params: { intervalDuration: number; intervalOffset: number; nextId?: number }) {
  const { intervalDuration, intervalOffset, nextId } = params
  return rpcCall('get_strikes', intervalDuration, intervalOffset < 0 ? intervalOffset : (nextId || 0))
}