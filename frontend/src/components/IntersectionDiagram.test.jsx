// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import IntersectionDiagram, {
  greenLaneIds,
  lanesBySide,
} from "./IntersectionDiagram.jsx";

afterEach(cleanup);

const lanes = (ids) => ids.map((id) => ({ id, queue: null }));
const ids = (sides) =>
  Object.fromEntries(
    Object.entries(sides).map(([side, list]) => [side, list.map((l) => l.id)]),
  );

describe("lanesBySide", () => {
  it("puts side-named lanes on their side", () => {
    expect(ids(lanesBySide(lanes(["N", "east", "S_2", "west"])))).toEqual({
      N: ["N"],
      E: ["east"],
      S: ["S_2"],
      W: ["west"],
    });
  });

  it("deals other ids round the sides in order", () => {
    expect(ids(lanesBySide(lanes(["lane_1", "lane_2", "Exit"])))).toEqual({
      N: ["lane_1"],
      E: ["lane_2"],
      S: ["Exit"],
      W: [],
    });
  });
});

describe("greenLaneIds", () => {
  const nesw = lanes(["N", "E", "S", "W"]);

  it("matches the lane named in the phase", () => {
    expect([...greenLaneIds(nesw, "E_GREEN")]).toEqual(["E"]);
    expect([...greenLaneIds(lanes(["lane_1"]), "lane_1_green")]).toEqual([
      "lane_1",
    ]);
  });

  it("lights every lane in a side group", () => {
    expect([...greenLaneIds(nesw, "NS_GREEN")].sort()).toEqual(["N", "S"]);
  });

  it("is empty for unknown or missing phases", () => {
    expect(greenLaneIds(nesw, "all_red").size).toBe(0);
    expect(greenLaneIds(nesw, null).size).toBe(0);
  });
});

describe("IntersectionDiagram", () => {
  it("draws one labelled lane per lane", () => {
    render(<IntersectionDiagram lanes={lanes(["N", "E", "S", "W"])} />);
    expect(
      screen.getByRole("img", { name: "Intersection with 4 lanes" }),
    ).toBeTruthy();
    for (const id of ["N", "E", "S", "W"]) {
      expect(screen.getByText(id, { selector: "text" })).toBeTruthy();
    }
  });

  it("marks green lanes in their tooltip", () => {
    const { container } = render(
      <IntersectionDiagram lanes={lanes(["N", "E"])} phase="N_GREEN" />,
    );
    const titles = [...container.querySelectorAll("title")].map(
      (t) => t.textContent,
    );
    expect(titles).toEqual(["N (green)", "E"]);
  });

  it("draws queue bars only for lanes with a queue", () => {
    const { container } = render(
      <IntersectionDiagram
        lanes={[
          { id: "N", queue: 20 },
          { id: "E", queue: 0 },
          { id: "S", queue: null },
          { id: "W", queue: 5 },
        ]}
      />,
    );
    expect(container.querySelectorAll(".queue-bar")).toHaveLength(2);
  });

  it("shows a message for the flat payload", () => {
    render(<IntersectionDiagram lanes={[{ id: "all", queue: 4 }]} />);
    expect(
      screen.getByText("No per-lane data for a diagram yet."),
    ).toBeTruthy();
  });
});
