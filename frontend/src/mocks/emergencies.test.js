import { describe, it, expect } from "vitest";
import { createEmergencyStore } from "./emergencies.js";
import intersections from "./intersections.json";
import schema from "../../../shared/schemas/emergency.schema.json";

const NOW = new Date("2026-10-27T09:30:00Z");
const fresh = () => createEmergencyStore(intersections, { now: () => NOW });
const BODY = { vehicle_type: "fire", start_id: "INT_002", end_id: "INT_008" };

function codeOf(fn) {
  try {
    fn();
  } catch (err) {
    return err.code;
  }
  return null;
}

describe("createEmergencyStore", () => {
  it("starts an emergency shaped like emergency.schema.json", () => {
    const e = fresh().start(BODY);
    expect(Object.keys(e).sort()).toEqual([...schema.required].sort());
    expect(e).toEqual({
      id: "EMG_001",
      vehicle_type: "fire",
      start_id: "INT_002",
      end_id: "INT_008",
      route: ["INT_002", "INT_005", "INT_008"],
      current_id: "INT_002",
      status: "active",
      started_at: "2026-10-27T09:30:00.000Z",
      cleared_at: null,
    });
  });

  it("numbers emergencies EMG_001, EMG_002, ...", () => {
    const store = fresh();
    expect(store.start(BODY).id).toBe("EMG_001");
    expect(store.start(BODY).id).toBe("EMG_002");
  });

  it("lists only active emergencies", () => {
    const store = fresh();
    const a = store.start(BODY);
    const b = store.start(BODY);
    store.clear(a.id);
    expect(store.list().map((e) => e.id)).toEqual([b.id]);
  });

  it("clears and cancels with a timestamp", () => {
    const store = fresh();
    const cleared = store.clear(store.start(BODY).id);
    expect(cleared).toMatchObject({
      status: "cleared",
      current_id: null,
      cleared_at: "2026-10-27T09:30:00.000Z",
    });
    expect(store.cancel(store.start(BODY).id).status).toBe("cancelled");
  });

  it("rejects bad start requests with a code", () => {
    const store = fresh();
    expect(codeOf(() => store.start(null))).toBe("INVALID_EMERGENCY");
    expect(codeOf(() => store.start({ ...BODY, vehicle_type: "taxi" }))).toBe(
      "INVALID_EMERGENCY",
    );
    expect(codeOf(() => store.start({ ...BODY, end_id: "INT_999" }))).toBe(
      "UNKNOWN_INTERSECTION",
    );
    expect(codeOf(() => store.start({ ...BODY, end_id: "INT_002" }))).toBe(
      "SAME_START_END",
    );
    expect(codeOf(() => store.start({ ...BODY, end_id: "INT_011" }))).toBe(
      "NO_ROUTE",
    );
    expect(store.list()).toEqual([]);
  });

  it("rejects clearing unknown or finished emergencies", () => {
    const store = fresh();
    expect(codeOf(() => store.clear("EMG_404"))).toBe("EMERGENCY_NOT_FOUND");
    const { id } = store.start(BODY);
    store.clear(id);
    expect(codeOf(() => store.clear(id))).toBe("EMERGENCY_NOT_ACTIVE");
  });

  it("returns copies, so callers can't change the store", () => {
    const store = fresh();
    const e = store.start(BODY);
    e.status = "cleared";
    e.route.push("INT_999");
    expect(store.list()[0].status).toBe("active");
    expect(store.list()[0].route).toEqual(["INT_002", "INT_005", "INT_008"]);
  });
});
