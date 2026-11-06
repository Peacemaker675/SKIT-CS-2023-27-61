// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AlertFeed from "./AlertFeed.jsx";

const intersections = [
  { id: "A", name: "Alpha" },
  { id: "B", name: "Beta" },
];
const heavy = { max_queue_length: 40 };
const smooth = { max_queue_length: 1 };

// Both intersections turn heavy, then A drops back.
function renderTwoAlerts() {
  const view = render(
    <AlertFeed
      intersections={intersections}
      liveData={{ A: smooth, B: smooth }}
    />,
  );
  const update = (liveData) =>
    view.rerender(
      <AlertFeed intersections={intersections} liveData={liveData} />,
    );
  update({ A: { ...heavy }, B: { ...heavy } });
  return update;
}

afterEach(cleanup);

describe("AlertFeed", () => {
  it("doesn't repeat an alert that fires again within 60s", () => {
    const update = renderTwoAlerts();
    update({ A: { ...smooth }, B: { ...heavy } });
    update({ A: { ...heavy }, B: { ...heavy } });
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("dismisses one alert", () => {
    renderTwoAlerts();
    fireEvent.click(screen.getAllByLabelText("Dismiss alert")[0]);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("keeps a dismissed alert away while its repeat is inside 60s", () => {
    const update = renderTwoAlerts();
    fireEvent.click(screen.getAllByLabelText("Dismiss alert")[0]);
    fireEvent.click(screen.getByLabelText("Dismiss alert"));
    update({ A: { ...smooth }, B: { ...smooth } });
    update({ A: { ...heavy }, B: { ...heavy } });
    expect(screen.getByText("No alerts yet.")).toBeTruthy();
  });

  it("clears all alerts and hides the button", () => {
    renderTwoAlerts();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText("No alerts yet.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });
});
