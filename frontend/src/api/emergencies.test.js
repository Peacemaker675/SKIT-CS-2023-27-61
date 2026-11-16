import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiError, emergenciesApi } from "./client.js";

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError("not JSON");
      return body;
    },
  });
}

// Flask's default 404 for a route that doesn't exist: an HTML page.
const routeMissing = () => mockFetch(404, undefined);

const BODY = {
  vehicle_type: "ambulance",
  start_id: "INT_001",
  end_id: "INT_007",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("emergenciesApi with the backend route missing (mock fallback)", () => {
  it("starts, lists and clears an emergency in the mock", async () => {
    vi.stubGlobal("fetch", routeMissing());

    const started = await emergenciesApi.start(BODY);
    expect(started).toMatchObject({
      vehicle_type: "ambulance",
      start_id: "INT_001",
      end_id: "INT_007",
      route: ["INT_001", "INT_004", "INT_006", "INT_007"],
      current_id: "INT_001",
      status: "active",
      cleared_at: null,
    });

    const active = await emergenciesApi.list();
    expect(active.map((e) => e.id)).toContain(started.id);

    const cleared = await emergenciesApi.clear(started.id);
    expect(cleared.status).toBe("cleared");

    const other = await emergenciesApi.start(BODY);
    const cancelled = await emergenciesApi.cancel(other.id);
    expect(cancelled.status).toBe("cancelled");
    expect((await emergenciesApi.list()).map((e) => e.id)).not.toContain(
      started.id,
    );
  });

  it("turns mock errors into ApiErrors with a code", async () => {
    vi.stubGlobal("fetch", routeMissing());
    const err = await emergenciesApi
      .start({ ...BODY, end_id: "INT_011" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe("NO_ROUTE");
  });

  it("does not log console errors when falling back", async () => {
    vi.stubGlobal("fetch", routeMissing());
    const errorSpy = vi.spyOn(console, "error");
    await emergenciesApi.list();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("emergenciesApi with the backend route present", () => {
  it("returns the server's emergency from POST /api/emergencies", async () => {
    const server = { id: "EMG_SERVER", status: "active" };
    const fetchMock = mockFetch(200, server);
    vi.stubGlobal("fetch", fetchMock);

    await expect(emergenciesApi.start(BODY)).resolves.toEqual(server);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/emergencies");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(BODY);
  });

  it("reads GET /api/emergencies/active", async () => {
    const fetchMock = mockFetch(200, []);
    vi.stubGlobal("fetch", fetchMock);
    await expect(emergenciesApi.list()).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/emergencies/active");
  });

  it("posts to /api/emergencies/<id>/clear", async () => {
    const fetchMock = mockFetch(200, { id: "EMG 1", status: "cleared" });
    vi.stubGlobal("fetch", fetchMock);
    await emergenciesApi.clear("EMG 1");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/emergencies/EMG%201/clear");
  });

  it("posts to /api/emergencies/<id>/cancel", async () => {
    const fetchMock = mockFetch(200, { id: "EMG_1", status: "cancelled" });
    vi.stubGlobal("fetch", fetchMock);
    await emergenciesApi.cancel("EMG_1");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/emergencies/EMG_1/cancel");
    expect(options.method).toBe("POST");
  });

  it("passes a real 404 with an error code through, without the mock", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { code: "EMERGENCY_NOT_FOUND" }));
    const err = await emergenciesApi.clear("EMG_X").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("EMERGENCY_NOT_FOUND");
  });

  it("passes other server errors through", async () => {
    vi.stubGlobal("fetch", mockFetch(403, { code: "FORBIDDEN" }));
    const err = await emergenciesApi.start(BODY).catch((e) => e);
    expect(err.status).toBe(403);
  });
});
