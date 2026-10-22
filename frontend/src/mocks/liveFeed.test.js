import { describe, expect, it } from "vitest";
import { buildMockState, MOCK_LANES } from "./liveFeed.js";
import { congestionLevel } from "../lib/congestion.js";
import { normalizeState } from "../lib/normalizeState.js";

describe("buildMockState", () => {
  it("produces a payload normalizeState can read", () => {
    const state = normalizeState(buildMockState(3, 0, 0));
    expect(state.lanes.map((lane) => lane.id)).toEqual(MOCK_LANES);
    expect(state.phase).toBe("N_GREEN");
    expect(state.timestamp).toBe(new Date(0).toISOString());
  });

  it("sets phase_end to the next phase boundary", () => {
    const state = buildMockState(0, 0, 12_000);
    expect(state.phase_end).toBe(new Date(20_000).toISOString());
    expect(state.current_phase).toBe("E_GREEN");
  });

  it("sweeps through every congestion level", () => {
    const seen = new Set();
    for (let tick = 0; tick < 20; tick += 1) {
      seen.add(congestionLevel(buildMockState(tick, 0, 0)));
    }
    expect([...seen].sort()).toEqual(["heavy", "moderate", "smooth"]);
  });
});
