import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CONGESTION, congestionLevel } from "../lib/congestion.js";

// Zooms the map so every intersection is visible.
function FitToIntersections({ intersections }) {
  const map = useMap();
  useEffect(() => {
    if (!intersections.length) return;
    map.fitBounds(
      intersections.map((i) => [i.lat, i.lng]),
      { padding: [40, 40], maxZoom: 16 },
    );
  }, [map, intersections]);
  return null;
}

// SRS Tab 1, Component 1: every managed intersection as a clickable icon,
// coloured by its current congestion level.
export default function IntersectionMap({
  intersections,
  liveData,
  selectedId,
  onSelect,
}) {
  return (
    <div>
      <MapContainer className="map" center={[26.9124, 75.7873]} zoom={13}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToIntersections intersections={intersections} />
        {intersections.map((i) => {
          const { color, label } =
            CONGESTION[congestionLevel(liveData[i.id])];
          const selected = i.id === selectedId;
          return (
            <CircleMarker
              key={i.id}
              center={[i.lat, i.lng]}
              radius={selected ? 14 : 10}
              pathOptions={{
                color: selected ? "#1c2430" : "#ffffff",
                weight: selected ? 3 : 2,
                fillColor: color,
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => onSelect(i.id) }}
            >
              <Tooltip>
                {i.name || i.id} · {label}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <ul className="legend">
        {Object.entries(CONGESTION).map(([key, { label, color }]) => (
          <li key={key}>
            <span className="dot" style={{ background: color }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
