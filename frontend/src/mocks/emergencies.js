// In-memory stand-in for the proposed emergency endpoints
// (shared/schemas/emergency.schema.json), used by emergenciesApi while the
// backend doesn't serve them. Emergencies live only until the page reloads.
//
// Errors are thrown as Error objects with { status, code } so api/client.js
// can turn them into ApiErrors like a real 400 / 404 response.

import intersections from "./intersections.json";
import { buildGraph } from "../lib/graph.js";
import { shortestPath } from "../lib/routing.js";
import { VEHICLE_TYPES } from "../lib/vehicles.js";

function fail(status, code) {
  return Object.assign(new Error(code), { status, code });
}

// A fresh store over `list` of intersections. `now` is injectable for tests.
export function createEmergencyStore(list, { now = () => new Date() } = {}) {
  const { graph } = buildGraph(list);
  const emergencies = [];
  let nextNumber = 1;

  function find(id) {
    const emergency = emergencies.find((e) => e.id === id);
    if (!emergency) throw fail(404, "EMERGENCY_NOT_FOUND");
    return emergency;
  }

  function finish(id, status) {
    const emergency = find(id);
    if (emergency.status !== "active") throw fail(409, "EMERGENCY_NOT_ACTIVE");
    emergency.status = status;
    emergency.current_id = null;
    emergency.cleared_at = now().toISOString();
    return { ...emergency, route: [...emergency.route] };
  }

  return {
    // POST /api/emergencies with { vehicle_type, start_id, end_id }.
    start(body) {
      const { vehicle_type, start_id, end_id } = body || {};
      if (!VEHICLE_TYPES.includes(vehicle_type) || !start_id || !end_id) {
        throw fail(400, "INVALID_EMERGENCY");
      }
      if (!graph.has(start_id) || !graph.has(end_id)) {
        throw fail(400, "UNKNOWN_INTERSECTION");
      }
      if (start_id === end_id) throw fail(400, "SAME_START_END");
      const route = shortestPath(graph, start_id, end_id);
      if (!route) throw fail(400, "NO_ROUTE");

      const emergency = {
        id: `EMG_${String(nextNumber++).padStart(3, "0")}`,
        vehicle_type,
        start_id,
        end_id,
        route,
        current_id: start_id,
        status: "active",
        started_at: now().toISOString(),
        cleared_at: null,
      };
      emergencies.push(emergency);
      return { ...emergency, route: [...route] };
    },

    // GET /api/emergencies/active, oldest first.
    list() {
      return emergencies
        .filter((e) => e.status === "active")
        .map((e) => ({ ...e, route: [...e.route] }));
    },

    // POST /api/emergencies/<id>/clear: the vehicle has passed end_id.
    clear(id) {
      return finish(id, "cleared");
    },

    // The operator stopped the corridor early.
    cancel(id) {
      return finish(id, "cancelled");
    },
  };
}

// Shared store used by the app.
export const mockEmergencies = createEmergencyStore(intersections);
