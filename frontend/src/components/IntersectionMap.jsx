import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CONGESTION, congestionLevel } from "../lib/congestion.js";
import CongestionMark from "./CongestionMark.jsx";

// One icon per level, reused between updates so a marker keeps its element
// (and keyboard focus) while the live data changes.
const icons = new Map();

function markerIcon(level, selected) {
  const key = `${level}-${selected}`;
  if (!icons.has(key)) {
    const { color, symbol } = CONGESTION[level];
    const size = selected ? 32 : 24;
    const cls = selected ? "map-marker selected" : "map-marker";
    icons.set(
      key,
      L.divIcon({
        className: "map-marker-icon",
        html: `<span class="${cls}" style="background:${color}">${symbol}</span>`,
        iconSize: [size, size],
      }),
    );
  }
  return icons.get(key);
}

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
// showing its current congestion level by colour and symbol.
export default function IntersectionMap({
  intersections,
  liveData,
  selectedId,
  onSelect,
}) {
  return (
    <div className="map-wrap">
      <MapContainer className="map" center={[26.9124, 75.7873]} zoom={13}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToIntersections intersections={intersections} />
        {intersections.map((i) => {
          const level = congestionLevel(liveData[i.id]);
          const name = `${i.name || i.id} · ${CONGESTION[level].label}`;
          return (
            <Marker
              key={i.id}
              position={[i.lat, i.lng]}
              icon={markerIcon(level, i.id === selectedId)}
              eventHandlers={{ click: () => onSelect(i.id) }}
            >
              <Tooltip>{name}</Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
      <ul className="legend">
        {Object.entries(CONGESTION).map(([key, { label }]) => (
          <li key={key}>
            <CongestionMark level={key} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
