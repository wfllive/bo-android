export type Strike = {
  timestamp: number
  longitude: number
  latitude: number
  lateralError: number
  altitude: number
  amplitude: number
}

export type GridParameters = {
  longitudeStart: number
  latitudeStart: number
  longitudeDelta: number
  latitudeDelta: number
  longitudeBins: number
  latitudeBins: number
  size: number
}

export type ResultEvent = {
  strikes?: Strike[]
  gridParameters?: GridParameters
  referenceTime?: number
  updated?: number
  histogram?: number[]
}