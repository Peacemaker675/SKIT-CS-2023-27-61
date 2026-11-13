import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ApiError,
  OverrideUnavailable,
  intersectionsApi,
  overrideApi,
} from "./client.js";

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("overrideApi.send", () => {
  it("posts the action and returns ok", async () => {
    const fetchMock = mockFetch(200, {});
    vi.stubGlobal("fetch", fetchMock);
    await expect(overrideApi.send("A 1", "ALL_RED")).resolves.toEqual({
      ok: true,
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/intersections/A%201/override");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ action: "ALL_RED" });
  });

  it("maps 404 to OverrideUnavailable", async () => {
    vi.stubGlobal("fetch", mockFetch(404, {}));
    await expect(overrideApi.send("A", "ALL_RED")).rejects.toBeInstanceOf(
      OverrideUnavailable,
    );
  });

  it("throws ApiError for other failures", async () => {
    vi.stubGlobal("fetch", mockFetch(500, {}));
    await expect(overrideApi.send("A", "ALL_RED")).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("intersectionsApi.latest", () => {
  it("returns {} on 404 without console errors", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { error: "not found" }));
    const errorSpy = vi.spyOn(console, "error");
    await expect(intersectionsApi.latest(["a", "b"])).resolves.toEqual({});
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns the server payload keyed by id", async () => {
    const fetchMock = mockFetch(200, { a: { max_queue_length: 3 } });
    vi.stubGlobal("fetch", fetchMock);
    await expect(intersectionsApi.latest(["a"])).resolves.toEqual({
      a: { max_queue_length: 3 },
    });
    expect(fetchMock.mock.calls[0][0]).toContain("/intersections/latest?ids=a");
  });
});
