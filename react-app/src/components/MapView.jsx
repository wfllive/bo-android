import { MapContainer, TileLayer, CircleMarker, LayersControl, ScaleControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';

function getAgeMs(strike) {
  return Date.now() - strike.timestampMs;
}

function ageToColor(ageMs) {
  const t = Math.min(1, Math.max(0, ageMs / (60 * 60 * 1000)));
  const r = Math.round(255 * (1 - t));
  const g = Math.round(200 * (1 - t));
  const b = Math.round(50 + 150 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function ageToOpacity(ageMs) {
  const t = Math.min(1, Math.max(0, ageMs / (60 * 60 * 1000)));
  return 0.9 * (1 - t) + 0.1;
}

export default function MapView({ strikes, initialCenter = [20, 0], initialZoom = 2 }) {
  const layers = useMemo(() => (
    [
      {
        name: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors'
      },
      {
        name: 'Carto Light',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; CartoDB'
      }
    ]
  ), []);

  return (
    <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: '100%', width: '100%' }}>
      <LayersControl position="topleft">
        {layers.map((l) => (
          <LayersControl.BaseLayer key={l.name} name={l.name} checked={l.name === 'OpenStreetMap'}>
            <TileLayer url={l.url} attribution={l.attribution} />
          </LayersControl.BaseLayer>
        ))}
      </LayersControl>
      <ScaleControl position="bottomleft" />

      {strikes.map((s) => {
        const ageMs = getAgeMs(s);
        const color = ageToColor(ageMs);
        const opacity = ageToOpacity(ageMs);
        const radius = Math.max(2, Math.min(10, (s.amplitudeKiloAmp || 30) / 10));
        return (
          <CircleMarker
            key={s.id}
            center={[s.latitude, s.longitude]}
            pathOptions={{ color, fillColor: color, fillOpacity: opacity, opacity }}
            radius={radius}
          />
        );
      })}
    </MapContainer>
  );
}