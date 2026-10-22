import { describe, it, expect } from "vitest";
import {
  formatDuration,
  secondsRemaining,
  secondsElapsed,
} from "./phaseTimer.js";

describe("formatDuration", () => {
  it("formats mm:ss", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(5)).toBe("00:05");
    expect(formatDuration(65.9)).toBe("01:05");
    expect(formatDuration(3600)).toBe("60:00");
  });

  it("clamps negatives and rejects bad input", () => {
    expect(formatDuration(-3)).toBe("00:00");
    expect(formatDuration(null)).toBe(null);
    expect(formatDuration(NaN)).toBe(null);
  });
});

describe("secondsRemaining", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");

  it("counts down to phase_end", () => {
    expect(secondsRemaining("2026-01-01T00:00:30Z", now)).toBe(30);
    expect(secondsRemaining("2026-01-01T00:00:00.400Z", now)).toBe(1);
  });

  it("clamps at zero once passed", () => {
    expect(secondsRemaining("2025-12-31T23:59:00Z", now)).toBe(0);
  });

  it("is null without a usable value", () => {
    expect(secondsRemaining(undefined, now)).toBe(null);
    expect(secondsRemaining("not a date", now)).toBe(null);
  });
});

describe("secondsElapsed", () => {
  it("counts up from a timestamp", () => {
    expect(secondsElapsed(1000, 13_500)).toBe(12);
    expect(secondsElapsed(5000, 1000)).toBe(0);
    expect(secondsElapsed(null, 1000)).toBe(null);
  });
});
