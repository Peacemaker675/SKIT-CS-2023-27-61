import { describe, it, expect } from "vitest";
import { TABS, tabsFor, defaultTabFor } from "./tabs.js";

const keys = (tabs) => tabs.map((tab) => tab.key);

describe("TABS", () => {
  it("points each tab at /dashboard/<key>", () => {
    for (const tab of TABS) {
      expect(tab.path).toBe(`/dashboard/${tab.key}`);
    }
  });
});

describe("tabsFor", () => {
  it("gives operators live and forecast", () => {
    expect(keys(tabsFor("operator"))).toEqual(["live", "forecast"]);
  });

  it("gives analysts analytics and forecast", () => {
    expect(keys(tabsFor("analyst"))).toEqual(["analytics", "forecast"]);
  });

  it("gives admins every tab", () => {
    expect(keys(tabsFor("admin"))).toEqual([
      "live",
      "analytics",
      "forecast",
      "system",
    ]);
  });

  it("returns nothing for an unknown role", () => {
    expect(tabsFor("guest")).toEqual([]);
  });
});

describe("defaultTabFor", () => {
  it("lands operators and admins on live", () => {
    expect(defaultTabFor("operator").key).toBe("live");
    expect(defaultTabFor("admin").key).toBe("live");
  });

  it("lands analysts on analytics", () => {
    expect(defaultTabFor("analyst").key).toBe("analytics");
  });

  it("returns null for missing or unknown roles", () => {
    for (const role of [undefined, null, "", "bogus", "toString"]) {
      expect(defaultTabFor(role)).toBeNull();
    }
  });
});
