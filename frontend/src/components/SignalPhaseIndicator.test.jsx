// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import SignalPhaseIndicator from "./SignalPhaseIndicator.jsx";

const NOW = Date.parse("2026-10-29T10:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SignalPhaseIndicator", () => {
  it("says the phase is unknown without one", () => {
    render(<SignalPhaseIndicator phase={null} />);
    expect(screen.getByText("Phase unknown")).toBeTruthy();
  });

  it("counts down to phase_end", () => {
    const end = new Date(NOW + 15_000).toISOString();
    render(<SignalPhaseIndicator phase="N_GREEN" phaseEnd={end} />);
    expect(screen.getByText("N_GREEN")).toBeTruthy();
    expect(screen.getByText("00:15 left")).toBeTruthy();

    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("00:10 left")).toBeTruthy();
  });

  it("counts up without phase_end and restarts on a new phase", () => {
    const { rerender } = render(<SignalPhaseIndicator phase="N_GREEN" />);
    expect(screen.getByText("00:00 elapsed")).toBeTruthy();

    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByText("00:07 elapsed")).toBeTruthy();

    rerender(<SignalPhaseIndicator phase="E_GREEN" />);
    expect(screen.getByText("00:00 elapsed")).toBeTruthy();
  });
});
