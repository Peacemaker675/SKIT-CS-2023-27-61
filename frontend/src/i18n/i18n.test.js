import { describe, it, expect } from "vitest";
import { LANGUAGES, translate } from "./i18n.js";

// Every key path ending in a string, e.g. "login.title".
function keys(node, prefix = "") {
  return Object.entries(node).flatMap(([k, v]) =>
    typeof v === "string" ? [prefix + k] : keys(v, `${prefix}${k}.`),
  );
}

describe("translate", () => {
  it("returns the text for the language", () => {
    expect(translate("en", "login.submit")).toBe("Sign in");
    expect(translate("hi", "login.submit")).toBe("साइन इन");
  });

  it("fills {placeholders}", () => {
    expect(translate("en", "login.failed", { status: 500 })).toBe(
      "Login failed (500). Please try again.",
    );
    expect(translate("hi", "diagram.label", { n: 4 })).toBe(
      "4 लेन वाला चौराहा",
    );
  });

  it("leaves unknown placeholders as they are", () => {
    expect(translate("en", "phase.left", {})).toBe("{time} left");
  });

  it("falls back to English, then to the key", () => {
    expect(translate("xx", "login.submit")).toBe("Sign in");
    expect(translate("hi", "no.such.key")).toBe("no.such.key");
  });
});

describe("language files", () => {
  it("have the same keys in English and Hindi", () => {
    expect(keys(LANGUAGES.hi).sort()).toEqual(keys(LANGUAGES.en).sort());
  });

  it("keep the same placeholders in both languages", () => {
    const vars = (text) => (text.match(/\{\w+\}/g) || []).sort();
    for (const key of keys(LANGUAGES.en)) {
      expect(vars(translate("hi", key)), key).toEqual(
        vars(translate("en", key)),
      );
    }
  });
});
