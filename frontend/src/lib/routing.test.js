import { describe, it, expect } from "vitest";
import { buildGraph } from "./graph.js";
import { haversineKm, routeDistanceKm, shortestPath } from "./routing.js";
import mockIntersections from "../mocks/intersections.json";

function graphOf(list) {
  return buildGraph(list).graph;
}

// A - B - C - D in a line, plus E on its own.
const LINE = graphOf([
  { id: "A", neighbors: ["B"] },
  { id: "B", neighbors: ["C"] },
  { id: "C", neighbors: ["D"] },
  { id: "D" },
  { id: "E" },
]);

describe("shortestPath", () => {
  it("returns just the start when start and end are the same", () => {
    expect(shortestPath(LINE, "B", "B")).toEqual(["B"]);
  });

  it("follows the only route along a line", () => {
    expect(shortestPath(LINE, "A", "D")).toEqual(["A", "B", "C", "D"]);
    expect(shortestPath(LINE, "D", "A")).toEqual(["D", "C", "B", "A"]);
  });

  it("returns null when there is no path", () => {
    expect(shortestPath(LINE, "A", "E")).toBeNull();
  });

  it("returns null for unknown ids", () => {
    expect(shortestPath(LINE, "A", "Z")).toBeNull();
    expect(shortestPath(LINE, "Z", "A")).toBeNull();
    expect(shortestPath(LINE, "Z", "Z")).toBeNull();
  });

  it("returns null between two separate parts of a graph", () => {
    const graph = graphOf([
      { id: "A", neighbors: ["B"] },
      { id: "B" },
      { id: "C", neighbors: ["D"] },
      { id: "D" },
    ]);
    expect(shortestPath(graph, "A", "D")).toBeNull();
  });

  it("returns null when the graph is not a Map", () => {
    expect(shortestPath(null, "A", "B")).toBeNull();
    expect(shortestPath({}, "A", "B")).toBeNull();
  });

  it("picks the shorter of two routes", () => {
    // A-B-C-D-E and a shortcut A-X-E.
    const graph = graphOf([
      { id: "A", neighbors: ["B", "X"] },
      { id: "B", neighbors: ["C"] },
      { id: "C", neighbors: ["D"] },
      { id: "D", neighbors: ["E"] },
      { id: "X", neighbors: ["E"] },
      { id: "E" },
    ]);
    expect(shortestPath(graph, "A", "E")).toEqual(["A", "X", "E"]);
  });

  it("breaks ties by sorted id, whatever the input order", () => {
    // A-B-D and A-C-D are equally short; B sorts first.
    const graph = graphOf([
      { id: "A", neighbors: ["C", "B"] },
      { id: "C", neighbors: ["D"] },
      { id: "B", neighbors: ["D"] },
      { id: "D" },
    ]);
    expect(shortestPath(graph, "A", "D")).toEqual(["A", "B", "D"]);
  });

  it("does not loop forever on a cycle", () => {
    // A-B-C-A triangle with D hanging off C, and an isolated E.
    const graph = graphOf([
      { id: "A", neighbors: ["B", "C"] },
      { id: "B", neighbors: ["C"] },
      { id: "C", neighbors: ["D"] },
      { id: "D" },
      { id: "E" },
    ]);
    expect(shortestPath(graph, "B", "D")).toEqual(["B", "C", "D"]);
    expect(shortestPath(graph, "A", "E")).toBeNull();
  });

  it("finds routes on the mock intersections", () => {
    const graph = graphOf(mockIntersections);
    expect(shortestPath(graph, "INT_001", "INT_007")).toEqual([
      "INT_001",
      "INT_004",
      "INT_006",
      "INT_007",
    ]);
    expect(shortestPath(graph, "INT_002", "INT_008")).toEqual([
      "INT_002",
      "INT_005",
      "INT_008",
    ]);
    expect(shortestPath(graph, "INT_001", "INT_011")).toBeNull();
  });
});

// Reference values from the haversine formula with R = 6371 km
// (same as online great-circle distance calculators).
const JAIPUR = { lat: 26.9124, lng: 75.7873 };
const DELHI = { lat: 28.6139, lng: 77.209 };

describe("haversineKm", () => {
  it("is 0 for the same point", () => {
    expect(haversineKm(JAIPUR, JAIPUR)).toBe(0);
  });

  it("matches the known Jaipur to Delhi distance", () => {
    expect(haversineKm(JAIPUR, DELHI)).toBeCloseTo(235.29, 1);
  });

  it("is the same in both directions", () => {
    expect(haversineKm(DELHI, JAIPUR)).toBeCloseTo(haversineKm(JAIPUR, DELHI));
  });

  it("is about 111.2 km for one degree of latitude", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(
      111.19,
      1,
    );
  });

  it("returns null when a point has no coordinates", () => {
    expect(haversineKm(JAIPUR, null)).toBeNull();
    expect(haversineKm({ lat: 26.9 }, DELHI)).toBeNull();
    expect(haversineKm({ lat: "26.9", lng: "75.7" }, DELHI)).toBeNull();
    expect(haversineKm({ lat: NaN, lng: 75 }, DELHI)).toBeNull();
  });
});

describe("routeDistanceKm", () => {
  const list = [
    { id: "J", ...JAIPUR },
    { id: "D", ...DELHI },
    { id: "N", name: "No coordinates" },
  ];

  it("sums the legs of a route", () => {
    expect(routeDistanceKm(list, ["J", "D", "J"])).toBeCloseTo(470.58, 1);
  });

  it("is 0 for a single-intersection route", () => {
    expect(routeDistanceKm(list, ["J"])).toBe(0);
  });

  it("returns null if any intersection lacks coordinates", () => {
    expect(routeDistanceKm(list, ["J", "N"])).toBeNull();
    expect(routeDistanceKm(list, ["N"])).toBeNull();
  });

  it("returns null for unknown ids or bad input", () => {
    expect(routeDistanceKm(list, ["J", "Z"])).toBeNull();
    expect(routeDistanceKm(list, null)).toBeNull();
    expect(routeDistanceKm(null, ["J"])).toBeNull();
  });

  it("gives a short positive distance on the mock map", () => {
    const km = routeDistanceKm(mockIntersections, [
      "INT_001",
      "INT_004",
      "INT_006",
      "INT_007",
    ]);
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(5);
  });
});
