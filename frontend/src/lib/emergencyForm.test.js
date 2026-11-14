import { describe, it, expect } from "vitest";
import {
  EMERGENCY_ROLES,
  VEHICLE_TYPES,
  canManageEmergencies,
  hasErrors,
  routePreview,
  startRequest,
  validate,
} from "./emergencyForm.js";
import { buildGraph } from "./graph.js";
import intersections from "../mocks/intersections.json";
import schema from "../../../shared/schemas/emergency.schema.json";

const { graph } = buildGraph(intersections);
const VALID = { start: "INT_001", end: "INT_007", type: "ambulance", graph };

describe("canManageEmergencies", () => {
  it("allows operators and admins only", () => {
    expect(canManageEmergencies("operator")).toBe(true);
    expect(canManageEmergencies("admin")).toBe(true);
    expect(canManageEmergencies("analyst")).toBe(false);
    expect(canManageEmergencies(undefined)).toBe(false);
    expect(canManageEmergencies("OPERATOR")).toBe(false);
  });

  it("keeps the role list in one constant", () => {
    expect(EMERGENCY_ROLES).toEqual(["operator", "admin"]);
  });
});

describe("validate", () => {
  it("accepts a complete form with a route", () => {
    expect(validate(VALID)).toEqual({});
    expect(hasErrors(validate(VALID))).toBe(false);
  });

  it("requires every field", () => {
    expect(validate({ graph })).toEqual({
      start: "required",
      end: "required",
      type: "required",
    });
    expect(validate({ ...VALID, start: "" })).toEqual({ start: "required" });
    expect(validate({ ...VALID, end: "" })).toEqual({ end: "required" });
    expect(validate({ ...VALID, type: "" })).toEqual({ type: "required" });
  });

  it("rejects an unknown vehicle type", () => {
    expect(validate({ ...VALID, type: "taxi" })).toEqual({ type: "required" });
  });

  it("rejects the same start and end", () => {
    expect(validate({ ...VALID, end: "INT_001" })).toEqual({ end: "same" });
  });

  it("rejects intersections with no route between them", () => {
    expect(validate({ ...VALID, end: "INT_011" })).toEqual({ end: "noRoute" });
  });

  it("accepts every vehicle type", () => {
    for (const type of VEHICLE_TYPES) {
      expect(validate({ ...VALID, type })).toEqual({});
    }
  });
});

describe("routePreview", () => {
  it("lists the stops in order with names and a distance", () => {
    const preview = routePreview(intersections, graph, "INT_002", "INT_008");
    expect(preview.stops).toEqual([
      { id: "INT_002", name: "Placeholder Intersection 2" },
      { id: "INT_005", name: "Placeholder Intersection 5" },
      { id: "INT_008", name: "Placeholder Intersection 8" },
    ]);
    expect(preview.distanceKm).toBeGreaterThan(0.5);
    expect(preview.distanceKm).toBeLessThan(3);
  });

  it("is null without a valid route", () => {
    expect(routePreview(intersections, graph, "", "INT_008")).toBeNull();
    expect(routePreview(intersections, graph, "INT_002", "INT_002")).toBeNull();
    expect(routePreview(intersections, graph, "INT_001", "INT_011")).toBeNull();
  });

  it("falls back to the id and hides distance without names or coordinates", () => {
    const list = [{ id: "A", neighbors: ["B"] }, { id: "B" }];
    const preview = routePreview(list, buildGraph(list).graph, "A", "B");
    expect(preview.stops).toEqual([
      { id: "A", name: "A" },
      { id: "B", name: "B" },
    ]);
    expect(preview.distanceKm).toBeNull();
  });
});

describe("startRequest", () => {
  it("builds the POST /api/emergencies body", () => {
    expect(startRequest(VALID)).toEqual({
      vehicle_type: "ambulance",
      start_id: "INT_001",
      end_id: "INT_007",
    });
  });

  it("matches the startRequest fields in emergency.schema.json", () => {
    const def = schema.$defs.startRequest;
    const body = startRequest(VALID);
    expect(Object.keys(body).sort()).toEqual([...def.required].sort());
    expect(Object.keys(body).sort()).toEqual(
      Object.keys(def.properties).sort(),
    );
    expect(schema.$defs.vehicleType.enum).toEqual(VEHICLE_TYPES);
  });
});
