import { describe, it, expect } from "vitest";
import { formatAge, lastUpdatedInfo, toMillis } from "./lastUpdated.js";

describe("toMillis", () => {
  it("handles empty and invalid input", () => {
    expect(toMillis(null)).toBe(null);
    expect(toMillis(undefined)).toBe(null);
    expect(toMillis("not a date")).toBe(null);
  });

  it("accepts ms numbers and ISO strings", () => {
    expect(toMillis(1000)).toBe(1000);
    expect(toMillis("1970-01-01T00:00:01Z")).toBe(1000);
  });
});

describe("formatAge", () => {
  it("formats seconds and minutes", () => {
    expect(formatAge(0)).toBe("0s");
    expect(formatAge(59_999)).toBe("59s");
    expect(formatAge(60_000)).toBe("1m");
    expect(formatAge(185_000)).toBe("3m");
    expect(formatAge(-5000)).toBe("0s");
  });
});

describe("lastUpdatedInfo", () => {
  const now = 1_000_000;

  it("reports no updates for null", () => {
    expect(lastUpdatedInfo(null, now)).toEqual({
      label: "No updates yet",
      stale: false,
    });
  });

  it("is fresh up to 30s and stale after", () => {
    expect(lastUpdatedInfo(now - 30_000, now)).toEqual({
      label: "Last updated 30s ago",
      stale: false,
    });
    expect(lastUpdatedInfo(now - 31_000, now).stale).toBe(true);
  });

  it("works with ISO strings", () => {
    const iso = new Date(now - 120_000).toISOString();
    expect(lastUpdatedInfo(iso, now).label).toBe("Last updated 2m ago");
  });
});
