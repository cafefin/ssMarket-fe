import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthFetch } from "./auth-fetch";

const ME = "http://localhost:3000/api/users/me";

const urlOf = (input: RequestInfo | URL): string =>
  input instanceof Request ? input.url : String(input);
const isRefresh = (input: RequestInfo | URL): boolean =>
  urlOf(input).endsWith("/api/auth/refresh");

/** A backend whose session is valid only after a refresh call. */
function fakeBackend() {
  let sessionValid = false;
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      if (isRefresh(input)) {
        sessionValid = true;
        return new Response(null, { status: 204 });
      }
      return new Response("{}", { status: sessionValid ? 200 : 401 });
    },
  );
  return {
    fetchMock,
    expire: () => {
      sessionValid = false;
    },
    refreshCalls: () =>
      fetchMock.mock.calls.filter(([input]) => isRefresh(input)).length,
  };
}

describe("createAuthFetch", () => {
  const onAuthFailure = vi.fn();

  beforeEach(() => {
    onAuthFailure.mockReset();
  });

  it("returns a successful response without refreshing", async () => {
    const baseFetch = vi.fn(async () => new Response("{}", { status: 200 }));
    const authFetch = createAuthFetch(baseFetch, onAuthFailure);

    const response = await authFetch(ME);

    expect(response.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it("refreshes the session once after a 401 and retries the request", async () => {
    const backend = fakeBackend();
    const authFetch = createAuthFetch(backend.fetchMock, onAuthFailure);

    const response = await authFetch(ME);

    expect(response.status).toBe(200);
    expect(backend.refreshCalls()).toBe(1);
    expect(backend.fetchMock).toHaveBeenCalledWith("/api/auth/refresh", {
      method: "POST",
    });
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("retries with the original method and body", async () => {
    let refreshed = false;
    const seen: string[] = [];
    const baseFetch = vi.fn(async (input: RequestInfo | URL) => {
      if (isRefresh(input)) {
        refreshed = true;
        return new Response(null, { status: 204 });
      }
      const request = input as Request;
      seen.push(`${request.method} ${await request.text()}`);
      return new Response("{}", { status: refreshed ? 200 : 401 });
    });
    const authFetch = createAuthFetch(baseFetch, onAuthFailure);

    await authFetch("http://localhost:3000/api/items", {
      method: "POST",
      body: '{"title":"Keyboard"}',
    });

    expect(seen).toEqual([
      'POST {"title":"Keyboard"}',
      'POST {"title":"Keyboard"}',
    ]);
  });

  it("reports auth failure and returns the 401 when the refresh is rejected", async () => {
    const baseFetch = vi.fn(async () => new Response("{}", { status: 401 }));
    const authFetch = createAuthFetch(baseFetch, onAuthFailure);

    const response = await authFetch(ME);

    expect(response.status).toBe(401);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it("treats a network error during refresh as an auth failure", async () => {
    const baseFetch = vi.fn(async (input: RequestInfo | URL) => {
      if (isRefresh(input)) {
        throw new TypeError("network down");
      }
      return new Response("{}", { status: 401 });
    });
    const authFetch = createAuthFetch(baseFetch, onAuthFailure);

    const response = await authFetch(ME);

    expect(response.status).toBe(401);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it("shares one refresh between requests that fail at the same time", async () => {
    const backend = fakeBackend();
    const authFetch = createAuthFetch(backend.fetchMock, onAuthFailure);

    const responses = await Promise.all([authFetch(ME), authFetch(ME)]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(backend.refreshCalls()).toBe(1);
  });

  it("can refresh again after an earlier refresh finished", async () => {
    const backend = fakeBackend();
    const authFetch = createAuthFetch(backend.fetchMock, onAuthFailure);

    await authFetch(ME);
    backend.expire();
    const response = await authFetch(ME);

    expect(response.status).toBe(200);
    expect(backend.refreshCalls()).toBe(2);
  });
});
