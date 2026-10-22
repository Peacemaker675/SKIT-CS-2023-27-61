import { describe, expect, it } from "vitest";
import { formatMetric, laneLabel } from "./laneMetrics.js";

describe("laneLabel", () => {
  it("names the flat payload lane", () => {
    expect(laneLabel("all")).toBe("All lanes");
  });

  it("keeps real lane ids", () => {
    expect(laneLabel("north_1")).toBe("north_1");
  });
});

describe("formatMetric", () => {
  it("shows a dash for missing values", () => {
    expect(formatMetric(null)).toBe("—");
    expect(formatMetric(undefined)).toBe("—");
  });

  it("formats numbers", () => {
    expect(formatMetric(12)).toBe("12");
    expect(formatMetric(3.456)).toBe("3.5");
    expect(formatMetric(0)).toBe("0");
  });
});
