// Logic behind the start-emergency form, kept out of the component so it can
// be unit tested: who may start emergencies, field validation, the route
// preview and the request body (shared/schemas/emergency.schema.json).

import { ROLES } from "../auth/AuthContext.jsx";
import { VEHICLE_TYPES } from "./vehicles.js";
import { routeDistanceKm, shortestPath } from "./routing.js";

export { VEHICLE_TYPES };

// Roles that can see and start emergencies (same as the Live tab).
export const EMERGENCY_ROLES = [ROLES.OPERATOR, ROLES.ADMIN];

export function canManageEmergencies(role) {
  return EMERGENCY_ROLES.includes(role);
}

// Errors for the form values, as { field: code }. Empty object = valid.
// Codes map to i18n keys emergency.errors.<code>.
//   start/end/type: "required"
//   end:            "same" (start == end), "noRoute" (not connected)
export function validate({ start, end, type, graph }) {
  const errors = {};
  if (!start) errors.start = "required";
  if (!end) errors.end = "required";
  if (!type) errors.type = "required";
  else if (!VEHICLE_TYPES.includes(type)) errors.type = "required";
  if (start && end) {
    if (start === end) errors.end = "same";
    else if (!shortestPath(graph, start, end)) errors.end = "noRoute";
  }
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

// Route shown in the form before starting: ordered { id, name } stops and
// the distance in km (null if unknown). Null when there is no valid route.
export function routePreview(intersections, graph, start, end) {
  if (!start || !end || start === end) return null;
  const route = shortestPath(graph, start, end);
  if (!route) return null;
  const byId = new Map(intersections.map((i) => [i.id, i]));
  return {
    stops: route.map((id) => ({ id, name: byId.get(id)?.name || id })),
    distanceKm: routeDistanceKm(intersections, route),
  };
}

// Body for POST /api/emergencies (emergency.schema.json#/$defs/startRequest).
export function startRequest({ start, end, type }) {
  return { vehicle_type: type, start_id: start, end_id: end };
}
