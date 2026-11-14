// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import EmergencyPanel from "./EmergencyPanel.jsx";
import intersections from "../mocks/intersections.json";

const AMBULANCE = {
  id: "EMG_001",
  vehicle_type: "ambulance",
  start_id: "INT_001",
  end_id: "INT_007",
  route: ["INT_001", "INT_004", "INT_006", "INT_007"],
  current_id: "INT_004",
  status: "active",
  started_at: "2026-11-15T09:30:00Z",
  cleared_at: null,
};
const FIRE = {
  ...AMBULANCE,
  id: "EMG_002",
  vehicle_type: "fire",
  start_id: "INT_002",
  end_id: "INT_008",
  route: ["INT_002", "INT_005", "INT_008"],
  current_id: "INT_002",
};

function setup(props = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onClear: vi.fn().mockResolvedValue({}),
    onCancel: vi.fn().mockResolvedValue({}),
  };
  render(
    <EmergencyPanel
      emergencies={[AMBULANCE, FIRE]}
      intersections={intersections}
      error={null}
      loading={false}
      selectedId={null}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

afterEach(cleanup);

describe("EmergencyPanel", () => {
  it("shows the empty state", () => {
    setup({ emergencies: [] });
    expect(screen.getByText("No active emergencies")).toBeTruthy();
  });

  it("shows the load error", () => {
    setup({ error: "HTTP 500" });
    expect(
      screen.getByText("Could not load emergencies: HTTP 500"),
    ).toBeTruthy();
  });

  it("lists each corridor's intersections with written statuses", () => {
    setup();
    const steps = within(
      screen.getByRole("list", { name: "Corridor for EMG_001" }),
    )
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(steps).toEqual([
      "INT_001Passed",
      "INT_004Green",
      "INT_006Green",
      "INT_007Waiting",
    ]);
  });

  it("selects an emergency, and deselects it on a second click", () => {
    const { onSelect } = setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Show Ambulance EMG_001 on the map" }),
    );
    expect(onSelect).toHaveBeenCalledWith("EMG_001");

    cleanup();
    const again = setup({ selectedId: "EMG_001" });
    const row = screen.getByRole("button", {
      name: "Show Ambulance EMG_001 on the map",
    });
    expect(row.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(row);
    expect(again.onSelect).toHaveBeenCalledWith(null);
  });

  it("clears an emergency only after confirming", async () => {
    const { onClear } = setup({ selectedId: "EMG_001" });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Clear Ambulance EMG_001 (vehicle arrived)",
      }),
    );
    expect(
      screen.getByRole("dialog", { name: "Clear emergency?" }),
    ).toBeTruthy();
    expect(onClear).not.toHaveBeenCalled();

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Yes, clear" })),
    );
    expect(onClear).toHaveBeenCalledWith("EMG_001");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does nothing when the confirmation is dismissed", () => {
    const { onCancel, onClear } = setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel Fire engine EMG_002" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Cancel emergency?" });
    expect(dialog.textContent).toContain("Placeholder Intersection 8");
    fireEvent.click(screen.getByRole("button", { name: "Keep running" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });

  it("cancels after confirming", async () => {
    const { onCancel } = setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel Fire engine EMG_002" }),
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Yes, cancel it" })),
    );
    expect(onCancel).toHaveBeenCalledWith("EMG_002");
  });

  it("shows an error if ending the emergency fails", async () => {
    setup({ onClear: vi.fn().mockRejectedValue(new Error("HTTP 500")) });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Clear Ambulance EMG_001 (vehicle arrived)",
      }),
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Yes, clear" })),
    );
    expect(screen.getByText("Could not update EMG_001: HTTP 500")).toBeTruthy();
  });
});
