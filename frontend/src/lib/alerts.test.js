import { describe, it, expect } from "vitest";
import { isManual, staleAlerts, transitionAlerts } from "./alerts.js";

const NOW = Date.parse("2026-11-04T10:00:00Z");
const smooth = { max_queue_length: 2, lane_occupancy: 0.1 };
const heavy = { max_queue_length: 40, lane_occupancy: 0.9 };
const types = (alerts) => alerts.map((a) => a.type);

describe("transitionAlerts", () => {
  it("fires when congestion turns heavy, not while it stays heavy", () => {
    expect(types(transitionAlerts("A", smooth, heavy, NOW))).toEqual(["heavy"]);
    expect(transitionAlerts("A", heavy, heavy, NOW)).toEqual([]);
  });

  it("fires for the first heavy update with no previous state", () => {
    expect(types(transitionAlerts("A", undefined, heavy, NOW))).toEqual([
      "heavy",
    ]);
  });

  it("fires when a special event starts", () => {
    const next = { ...smooth, has_special_event: true };
    expect(types(transitionAlerts("A", smooth, next, NOW))).toEqual(["event"]);
    expect(transitionAlerts("A", next, next, NOW)).toEqual([]);
  });

  it("fires when the signal goes manual", () => {
    const next = { ...smooth, control_mode: "manual" };
    expect(types(transitionAlerts("A", smooth, next, NOW))).toEqual(["manual"]);
  });

  it("keeps the intersection id and time", () => {
    const [a] = transitionAlerts("INT_7", smooth, heavy, NOW);
    expect(a).toMatchObject({ intersectionId: "INT_7", time: NOW });
  });

  it("returns nothing without new data", () => {
    expect(transitionAlerts("A", heavy, null, NOW)).toEqual([]);
  });
});

describe("isManual", () => {
  it("reads control_mode or a manual phase name", () => {
    expect(isManual({ control_mode: "manual" })).toBe(true);
    expect(isManual({ current_phase: "MANUAL_OVERRIDE" })).toBe(true);
    expect(isManual({ signal_state: "N_GREEN" })).toBe(false);
    expect(isManual(null)).toBe(false);
  });
});

describe("staleAlerts", () => {
  const at = (ms) => ({ timestamp: new Date(NOW - ms).toISOString() });

  it("alerts once per intersection that went stale", () => {
    const live = { A: at(31_000), B: at(5_000) };
    const first = staleAlerts(live, new Set(), NOW);
    expect(first.alerts.map((a) => a.intersectionId)).toEqual(["A"]);
    expect([...first.staleIds]).toEqual(["A"]);

    const again = staleAlerts(live, first.staleIds, NOW);
    expect(again.alerts).toEqual([]);
  });

  it("alerts again after recovering and going stale again", () => {
    const recovered = staleAlerts({ A: at(1_000) }, new Set(["A"]), NOW);
    expect(recovered.staleIds.size).toBe(0);
    const stale = staleAlerts({ A: at(40_000) }, recovered.staleIds, NOW);
    expect(stale.alerts).toHaveLength(1);
  });

  it("ignores data without a timestamp", () => {
    expect(staleAlerts({ A: {} }, new Set(), NOW).alerts).toEqual([]);
  });
});
