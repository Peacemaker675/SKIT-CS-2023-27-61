import { describe, it, expect } from "vitest";
import { normalizeState } from "./normalizeState.js";

const EMPTY = {
  lanes: [],
  phase: null,
  timestamp: null,
  totals: { count: null, queue: null, wait: null },
};

const FLAT = {
  intersection_id: "INT-01",
  vehicle_count: 42,
  max_queue_length: 18,
  avg_speed: 23.5,
  lane_occupancy: 0.55,
  signal_state: "NS_GREEN",
  weather_condition: "clear",
  has_special_event: false,
};

const SRS = {
  timestamp: "2025-10-12T10:05:28Z",
  vehicle_counts: { lane_1: 12, lane_2: 8, lane_3: 15 },
  queue_lengths: { lane_1: 60, lane_2: 40, lane_3: 75 },
  avg_wait_times: { lane_1: 45, lane_2: 30, lane_3: 60 },
  current_phase: "lane_1_green",
};

describe("normalizeState", () => {
  it("maps the flat backend payload to a single 'all' lane", () => {
    expect(normalizeState(FLAT)).toEqual({
      lanes: [{ id: "all", count: 42, queue: 18, wait: null }],
      phase: "NS_GREEN",
      timestamp: null,
      totals: { count: 42, queue: 18, wait: null },
    });
  });

  it("maps the SRS per-lane payload", () => {
    const state = normalizeState(SRS);
    expect(state.lanes).toEqual([
      { id: "lane_1", count: 12, queue: 60, wait: 45 },
      { id: "lane_2", count: 8, queue: 40, wait: 30 },
      { id: "lane_3", count: 15, queue: 75, wait: 60 },
    ]);
    expect(state.phase).toBe("lane_1_green");
    expect(state.timestamp).toBe("2025-10-12T10:05:28Z");
  });

  it("computes totals as sum, max and average", () => {
    expect(normalizeState(SRS).totals).toEqual({
      count: 35,
      queue: 75,
      wait: 45,
    });
  });

  it("sets missing per-lane metrics to null", () => {
    const state = normalizeState({
      vehicle_counts: { lane_1: 5 },
      queue_lengths: { lane_2: 10 },
    });
    expect(state.lanes).toEqual([
      { id: "lane_1", count: 5, queue: null, wait: null },
      { id: "lane_2", count: null, queue: 10, wait: null },
    ]);
    expect(state.totals).toEqual({ count: 5, queue: 10, wait: null });
  });

  it("unions lane ids in first-appearance order", () => {
    const state = normalizeState({
      vehicle_counts: { b: 1, a: 2 },
      queue_lengths: { c: 3, a: 4 },
      avg_wait_times: { d: 5, b: 6 },
    });
    expect(state.lanes.map((lane) => lane.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("detects per-lane when only one per-lane object is present", () => {
    const state = normalizeState({ avg_wait_times: { north: 20, south: 40 } });
    expect(state.lanes.map((lane) => lane.id)).toEqual(["north", "south"]);
    expect(state.totals.wait).toBe(30);
  });

  it("turns non-numeric values into null", () => {
    const state = normalizeState({
      vehicle_counts: { lane_1: true, lane_2: null, lane_3: { n: 1 } },
    });
    expect(state.lanes.map((lane) => lane.count)).toEqual([null, null, null]);
    expect(state.totals.count).toBeNull();
  });

  it("turns NaN and Infinity into null", () => {
    const state = normalizeState({
      vehicle_counts: { lane_1: NaN, lane_2: Infinity, lane_3: 4 },
    });
    expect(state.lanes.map((lane) => lane.count)).toEqual([null, null, 4]);
    expect(normalizeState({ vehicle_count: NaN }).lanes[0].count).toBeNull();
  });

  it("does not coerce numeric strings", () => {
    const state = normalizeState({ vehicle_counts: { lane_1: "12" } });
    expect(state.lanes[0].count).toBeNull();
    expect(normalizeState({ max_queue_length: "7" }).lanes[0].queue).toBeNull();
  });

  it("returns the empty state for null, undefined, arrays and primitives", () => {
    expect(normalizeState(null)).toEqual(EMPTY);
    expect(normalizeState(undefined)).toEqual(EMPTY);
    expect(normalizeState([SRS])).toEqual(EMPTY);
    expect(normalizeState("state")).toEqual(EMPTY);
  });

  it("falls back to signal_state when current_phase is missing", () => {
    expect(normalizeState({ ...SRS, current_phase: undefined }).phase).toBe(
      null,
    );
    expect(
      normalizeState({ vehicle_counts: { a: 1 }, signal_state: "EW_GREEN" })
        .phase,
    ).toBe("EW_GREEN");
    expect(normalizeState({ current_phase: 3, signal_state: 5 }).phase).toBe(
      null,
    );
  });

  it("ignores a non-string timestamp", () => {
    expect(normalizeState({ ...SRS, timestamp: 1728727528 }).timestamp).toBe(
      null,
    );
  });

  it("does not mutate the input", () => {
    const input = structuredClone(SRS);
    normalizeState(input);
    expect(input).toEqual(SRS);
  });
});
