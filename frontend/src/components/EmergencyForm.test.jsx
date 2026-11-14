// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import EmergencyForm from "./EmergencyForm.jsx";
import intersections from "../mocks/intersections.json";

const auth = { user: { role: "operator" } };
vi.mock("../auth/AuthContext.jsx", () => ({
  ROLES: { ADMIN: "admin", OPERATOR: "operator", ANALYST: "analyst" },
  useAuth: () => auth,
}));

function setup(onStart = vi.fn().mockResolvedValue({})) {
  const onClose = vi.fn();
  render(
    <EmergencyForm
      intersections={intersections}
      onStart={onStart}
      onClose={onClose}
    />,
  );
  return { onStart, onClose };
}

function choose(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValid() {
  choose("Vehicle type", "ambulance");
  choose("From", "INT_001");
  choose("To", "INT_007");
}

beforeEach(() => {
  auth.user = { role: "operator" };
});

afterEach(cleanup);

describe("EmergencyForm", () => {
  it("is a labelled modal dialog with the first field focused", () => {
    setup();
    const dialog = screen.getByRole("dialog", {
      name: "Start emergency corridor",
    });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Vehicle type"));
  });

  it("renders nothing for an analyst", () => {
    auth.user = { role: "analyst" };
    setup();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows required errors only after submitting", () => {
    setup();
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
    fireEvent.click(screen.getByText("Start corridor"));
    expect(screen.getAllByText("This field is required.")).toHaveLength(3);
    expect(screen.queryByRole("dialog", { name: /\?$/ })).toBeNull();
  });

  it("shows a no-route error as soon as both ends are chosen", () => {
    setup();
    choose("From", "INT_001");
    choose("To", "INT_011");
    expect(
      screen.getByText("No route connects these intersections."),
    ).toBeTruthy();
  });

  it("previews the route in order", () => {
    setup();
    choose("From", "INT_002");
    choose("To", "INT_008");
    const stops = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(stops).toEqual([
      "Placeholder Intersection 2",
      "Placeholder Intersection 5",
      "Placeholder Intersection 8",
    ]);
    expect(screen.getByText(/3 intersections · about .* km/)).toBeTruthy();
  });

  it("asks for confirmation, then starts and closes", async () => {
    const { onStart, onClose } = setup();
    fillValid();
    fireEvent.click(screen.getByText("Start corridor"));

    const confirm = screen.getByRole("dialog", {
      name: "Start emergency corridor?",
    });
    expect(confirm.textContent).toContain(
      "Start Ambulance corridor from Placeholder Intersection 1 to Placeholder Intersection 7?",
    );
    expect(document.activeElement).toBe(screen.getByText("Yes, start"));

    await act(async () => fireEvent.click(screen.getByText("Yes, start")));
    expect(onStart).toHaveBeenCalledWith({
      vehicle_type: "ambulance",
      start_id: "INT_001",
      end_id: "INT_007",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the API error and stays open if starting fails", async () => {
    const onStart = vi.fn().mockRejectedValue(new Error("NO_ROUTE"));
    const { onClose } = setup(onStart);
    fillValid();
    fireEvent.click(screen.getByText("Start corridor"));
    await act(async () => fireEvent.click(screen.getByText("Yes, start")));
    expect(
      screen.getByText("Could not start the emergency: NO_ROUTE"),
    ).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Esc closes only the confirm dialog, then the form", () => {
    const { onClose } = setup();
    fillValid();
    fireEvent.click(screen.getByText("Start corridor"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Yes, start")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps Tab inside the form", () => {
    setup();
    const last = screen.getByText("Start corridor");
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByLabelText("Vehicle type"));
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
