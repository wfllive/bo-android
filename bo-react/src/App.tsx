import React from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { StrikeLayer } from './components/StrikeLayer'

export default function App() {
  return (
    <div className="map-container">
      <MapContainer center={[20, 0]} zoom={3} style={{ height: '100%', width: '100%' }} preferCanvas>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <StrikeLayer />
      </MapContainer>
    </div>
  )
}