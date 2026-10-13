import { describe, it, expect } from "vitest";
import { CONGESTION, congestionLevel } from "./congestion.js";

describe("congestionLevel", () => {
  it("is unknown without data", () => {
    expect(congestionLevel(null)).toBe("unknown");
    expect(congestionLevel(undefined)).toBe("unknown");
    expect(congestionLevel({})).toBe("unknown");
  });

  it("uses queue length thresholds", () => {
    expect(congestionLevel({ max_queue_length: 9 })).toBe("smooth");
    expect(congestionLevel({ max_queue_length: 10 })).toBe("moderate");
    expect(congestionLevel({ max_queue_length: 24 })).toBe("moderate");
    expect(congestionLevel({ max_queue_length: 25 })).toBe("heavy");
  });

  it("uses occupancy thresholds", () => {
    expect(congestionLevel({ lane_occupancy: 0.39 })).toBe("smooth");
    expect(congestionLevel({ lane_occupancy: 0.4 })).toBe("moderate");
    expect(congestionLevel({ lane_occupancy: 0.69 })).toBe("moderate");
    expect(congestionLevel({ lane_occupancy: 0.7 })).toBe("heavy");
  });

  it("takes the worse of the two", () => {
    expect(congestionLevel({ max_queue_length: 2, lane_occupancy: 0.8 })).toBe(
      "heavy",
    );
    expect(congestionLevel({ max_queue_length: 12, lane_occupancy: 0.1 })).toBe(
      "moderate",
    );
  });

  it("reads occupancy above 1 as a percentage", () => {
    expect(congestionLevel({ lane_occupancy: 39 })).toBe("smooth");
    expect(congestionLevel({ lane_occupancy: 40 })).toBe("moderate");
    expect(congestionLevel({ lane_occupancy: 70 })).toBe("heavy");
  });

  it("ignores non-numeric values", () => {
    expect(
      congestionLevel({ max_queue_length: "30", lane_occupancy: NaN }),
    ).toBe("unknown");
    expect(
      congestionLevel({ max_queue_length: "30", lane_occupancy: 0.5 }),
    ).toBe("moderate");
  });
});

describe("CONGESTION", () => {
  it("has a label for every level", () => {
    for (const key of ["smooth", "moderate", "heavy", "unknown"]) {
      expect(CONGESTION[key].label).toEqual(expect.any(String));
    }
  });
});
