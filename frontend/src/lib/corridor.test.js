import { describe, it, expect } from "vitest";
import {
  CORRIDOR_COLORS,
  corridorStatus,
  corridorsByIntersection,
  emergencyColor,
} from "./corridor.js";
import { CONGESTION } from "./congestion.js";

const ROUTE = ["A", "B", "C", "D", "E"];
const at = (current_id, route = ROUTE) => ({ route, current_id });
const statuses = (emergency) => corridorStatus(emergency).map((s) => s.status);

describe("corridorStatus", () => {
  it("keeps the route order and ids", () => {
    expect(corridorStatus(at("A")).map((s) => s.id)).toEqual(ROUTE);
  });

  it("at the first intersection: it and the next are green", () => {
    expect(statuses(at("A"))).toEqual([
      "green",
      "green",
      "pending",
      "pending",
      "pending",
    ]);
  });

  it("in the middle: earlier ones are passed", () => {
    expect(statuses(at("C"))).toEqual([
      "passed",
      "passed",
      "green",
      "green",
      "pending",
    ]);
  });

  it("at the last intersection: only it is green", () => {
    expect(statuses(at("E"))).toEqual([
      "passed",
      "passed",
      "passed",
      "passed",
      "green",
    ]);
  });

  it("treats an unknown or missing current id as not started", () => {
    expect(statuses(at("Z"))).toEqual(Array(5).fill("pending"));
    expect(statuses(at(null))).toEqual(Array(5).fill("pending"));
  });

  it("returns [] for an empty or missing route", () => {
    expect(corridorStatus(at("A", []))).toEqual([]);
    expect(corridorStatus({ current_id: "A" })).toEqual([]);
    expect(corridorStatus(null)).toEqual([]);
  });

  it("handles a two-intersection route", () => {
    expect(statuses(at("A", ["A", "B"]))).toEqual(["green", "green"]);
    expect(statuses(at("B", ["A", "B"]))).toEqual(["passed", "green"]);
  });
});

describe("emergencyColor", () => {
  it("is stable for the same id", () => {
    expect(emergencyColor("EMG_002")).toBe(emergencyColor("EMG_002"));
    expect(emergencyColor("server-abc")).toBe(emergencyColor("server-abc"));
  });

  it("gives consecutive numbered emergencies different colours", () => {
    const colours = ["EMG_001", "EMG_002", "EMG_003", "EMG_004"].map(
      emergencyColor,
    );
    expect(new Set(colours).size).toBe(4);
    expect(colours[0]).toBe(CORRIDOR_COLORS[0]);
  });

  it("wraps around the palette", () => {
    expect(emergencyColor("EMG_005")).toBe(emergencyColor("EMG_001"));
  });

  it("always returns a palette colour", () => {
    for (const id of ["EMG_000", "x", "", null, undefined, 42, "EMG_1000"]) {
      expect(CORRIDOR_COLORS).toContain(emergencyColor(id));
    }
  });

  it("never uses a congestion colour", () => {
    for (const { color } of Object.values(CONGESTION)) {
      expect(CORRIDOR_COLORS).not.toContain(color);
    }
  });
});

describe("corridorsByIntersection", () => {
  it("lists every emergency passing through each intersection", () => {
    const one = { id: "E1", route: ["A", "B", "C"] };
    const two = { id: "E2", route: ["C", "D"] };
    const map = corridorsByIntersection([one, two]);
    expect(map.get("A")).toEqual([one]);
    expect(map.get("C")).toEqual([one, two]);
    expect(map.get("D")).toEqual([two]);
    expect(map.has("Z")).toBe(false);
  });

  it("copes with bad input", () => {
    expect(corridorsByIntersection(null).size).toBe(0);
    expect(corridorsByIntersection([null, { id: "x" }]).size).toBe(0);
  });
});
