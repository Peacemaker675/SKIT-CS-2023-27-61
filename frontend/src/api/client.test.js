import { describe, it, expect, vi, afterEach } from "vitest";
import { intersectionsApi } from "./client.js";

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
