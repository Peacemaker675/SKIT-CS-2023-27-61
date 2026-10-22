import { describe, it, expect } from "vitest";
import { buildGraph, getIntersection } from "./graph.js";
import mockIntersections from "../mocks/intersections.json";

function neighbours(graph, id) {
  return [...graph.get(id)].sort();
}

describe("buildGraph", () => {
  it("keeps symmetric links as they are", () => {
    const { graph, warnings } = buildGraph([
      { id: "A", neighbors: ["B"] },
      { id: "B", neighbors: ["A"] },
    ]);
    expect(neighbours(graph, "A")).toEqual(["B"]);
    expect(neighbours(graph, "B")).toEqual(["A"]);
    expect(warnings).toEqual([]);
  });

  it("adds the reverse of a one-sided link", () => {
    const { graph } = buildGraph([
      { id: "A", neighbors: ["B", "C"] },
      { id: "B", neighbors: [] },
      { id: "C" },
    ]);
    expect(neighbours(graph, "B")).toEqual(["A"]);
    expect(neighbours(graph, "C")).toEqual(["A"]);
  });

  it("ignores unknown neighbour ids and reports them", () => {
    const { graph, warnings } = buildGraph([
      { id: "A", neighbors: ["B", "Z"] },
      { id: "B", neighbors: ["A"] },
    ]);
    expect(neighbours(graph, "A")).toEqual(["B"]);
    expect(graph.has("Z")).toBe(false);
    expect(warnings).toEqual(["A lists unknown neighbour Z"]);
  });

  it("gives an isolated intersection an empty neighbour set", () => {
    const { graph } = buildGraph([
      { id: "A", neighbors: ["B"] },
      { id: "B", neighbors: ["A"] },
      { id: "C", neighbors: [] },
    ]);
    expect(graph.get("C").size).toBe(0);
  });

  it("returns an empty graph for an empty list or bad input", () => {
    for (const input of [[], null, undefined, "x", {}]) {
      const { graph, warnings } = buildGraph(input);
      expect(graph.size).toBe(0);
      expect(warnings).toEqual([]);
    }
  });

  it("skips entries without a valid id and ignores self links", () => {
    const { graph } = buildGraph([
      null,
      { id: "" },
      { neighbors: ["A"] },
      { id: "A", neighbors: ["A"] },
    ]);
    expect([...graph.keys()]).toEqual(["A"]);
    expect(graph.get("A").size).toBe(0);
  });

  it("builds a clean graph from the mock intersections", () => {
    const { graph, warnings } = buildGraph(mockIntersections);
    expect(warnings).toEqual([]);
    expect(graph.size).toBe(mockIntersections.length);
    for (const [id, set] of graph) {
      for (const other of set) expect(graph.get(other).has(id)).toBe(true);
    }
    expect(graph.get("INT_011").size).toBe(0);
  });
});

describe("getIntersection", () => {
  const list = [{ id: "A", name: "First" }, { id: "B" }];

  it("finds an intersection by id", () => {
    expect(getIntersection(list, "A")).toEqual({ id: "A", name: "First" });
  });

  it("returns null for an unknown id or bad list", () => {
    expect(getIntersection(list, "Z")).toBeNull();
    expect(getIntersection(null, "A")).toBeNull();
  });
});
