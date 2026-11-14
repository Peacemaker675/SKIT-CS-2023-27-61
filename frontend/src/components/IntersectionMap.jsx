import { useEffect } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CONGESTION, congestionLevel } from "../lib/congestion.js";
import { vehicleLetter } from "../lib/vehicles.js";
import {
  CORRIDOR_COLORS,
  corridorsByIntersection,
  emergencyColor,
} from "../lib/corridor.js";
import { useT } from "../i18n/i18n.js";
import { formatStartTime } from "./EmergencyPanel.jsx";

function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

// Icons are cached so live-data re-renders don't rebuild the marker DOM
// (which would flicker an open tooltip).
const icons = new Map();

function vehicleIcon(type, label, color, selected) {
  const key = `${type}|${label}|${color}|${selected}`;
  if (!icons.has(key)) {
    icons.set(key, makeVehicleIcon(type, label, color, selected));
  }
  return icons.get(key);
}

function makeVehicleIcon(type, label, color, selected) {
  return L.divIcon({
    className: `vehicle-marker vehicle-${type}${selected ? " selected" : ""}`,
    html: `<span role="img" aria-label="${escapeHtml(
      label,
    )}" style="background:${color}">${vehicleLetter(type)}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    tooltipAnchor: [0, -16],
  });
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

// Zooms to the selected emergency's route when the selection changes.
function FitToRoute({ points }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 16);
    else map.fitBounds(points, { padding: [60, 60], maxZoom: 16 });
    // Re-run only when the route itself changes, not on every render.
  }, [map, key]);
  return null;
}

// SRS Tab 1, Component 1: every managed intersection as a clickable icon,
// coloured by its current congestion level. Active emergencies are drawn on
// top, each in its own colour: a dashed line along the route, a ring around
// each corridor intersection (one ring per corridor where they share one)
// and a marker for the vehicle. Selecting an emergency zooms to its route
// and dims the others.
export default function IntersectionMap({
  intersections,
  liveData,
  selectedId,
  onSelect,
  emergencies = [],
  selectedEmergencyId = null,
  onSelectEmergency = () => {},
}) {
  const { lang, t } = useT();
  const byId = new Map(intersections.map((i) => [i.id, i]));
  const hasPoint = (i) => i && Number.isFinite(i.lat) && Number.isFinite(i.lng);
  const nameOf = (id) => byId.get(id)?.name || id;
  const corridors = corridorsByIntersection(emergencies);
  const pointsOf = (e) =>
    (e.route || [])
      .map((id) => byId.get(id))
      .filter(hasPoint)
      .map((i) => [i.lat, i.lng]);
  const selectedEmergency =
    emergencies.find((e) => e.id === selectedEmergencyId) || null;
  // The selected corridor stands out; with nothing selected all are equal.
  const dimmed = (e) =>
    Boolean(selectedEmergency) && e.id !== selectedEmergencyId;

  return (
    <div className="map-wrap">
      <MapContainer className="map" center={[26.9124, 75.7873]} zoom={13}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToIntersections intersections={intersections} />
        {selectedEmergency && (
          <FitToRoute points={pointsOf(selectedEmergency)} />
        )}

        {/* Below the congestion markers (overlay pane is z-index 400), so
            routes and rings never cover a marker's colour or its clicks. */}
        <Pane name="emergency-corridor" style={{ zIndex: 390 }}>
          {emergencies.map((e) => {
            const points = pointsOf(e);
            if (points.length < 2) return null;
            const selected = e.id === selectedEmergencyId;
            const opacity = dimmed(e) ? 0.35 : 1;
            return [
              // White casing under the dashed line keeps it visible on both
              // the light and the inverted dark-mode tiles.
              <Polyline
                key={`casing-${e.id}`}
                positions={points}
                interactive={false}
                pathOptions={{
                  color: "#ffffff",
                  weight: selected ? 12 : 10,
                  opacity: 0.8 * opacity,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />,
              <Polyline
                key={`route-${e.id}`}
                positions={points}
                interactive={false}
                pathOptions={{
                  color: emergencyColor(e.id),
                  weight: selected ? 8 : 6,
                  opacity,
                  dashArray: "12 10",
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />,
            ];
          })}
          {intersections
            .filter((i) => corridors.has(i.id) && hasPoint(i))
            .flatMap((i) =>
              corridors.get(i.id).map((e, k) => (
                <CircleMarker
                  key={`ring-${i.id}-${e.id}`}
                  center={[i.lat, i.lng]}
                  radius={(i.id === selectedId ? 14 : 10) + 6 + k * 5}
                  interactive={false}
                  pathOptions={{
                    color: emergencyColor(e.id),
                    weight: e.id === selectedEmergencyId ? 5 : 3,
                    opacity: dimmed(e) ? 0.35 : 1,
                    fill: false,
                  }}
                />
              )),
            )}
        </Pane>

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
                {corridors.has(i.id) &&
                  ` · ${t("emergency.legend")}: ${corridors
                    .get(i.id)
                    .map((e) => e.id)
                    .join(", ")}`}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Vehicles use the marker pane, which is above every circle. */}
        {emergencies.map((e) => {
          const at = byId.get(e.current_id || e.start_id);
          if (!hasPoint(at)) return null;
          const vehicle = t(`emergency.vehicles.${e.vehicle_type}`);
          const label = t("emergency.vehicleLabel", { vehicle, id: e.id });
          const selected = e.id === selectedEmergencyId;
          return (
            <Marker
              key={`vehicle-${e.id}`}
              position={[at.lat, at.lng]}
              icon={vehicleIcon(
                e.vehicle_type,
                label,
                emergencyColor(e.id),
                selected,
              )}
              title={label}
              opacity={dimmed(e) ? 0.6 : 1}
              zIndexOffset={selected ? 2000 : 1000}
              eventHandlers={{
                click: () => onSelectEmergency(selected ? null : e.id),
              }}
            >
              <Tooltip>
                <strong>{vehicle}</strong> · {e.id}
                <br />
                {nameOf(e.start_id)} → {nameOf(e.end_id)}
                <br />
                {t("emergency.startedAt", {
                  time: formatStartTime(e.started_at, lang),
                })}
              </Tooltip>
            </Marker>
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
        <li>
          <span
            className="legend-line"
            style={{ borderColor: CORRIDOR_COLORS[0] }}
            aria-hidden="true"
          />
          {t("emergency.legend")}
        </li>
      </ul>
    </div>
  );
}
