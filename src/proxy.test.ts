// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

function requestFor(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

describe("proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("API forwarding", () => {
    it("forwards /api/* to the backend without the /api prefix, keeping the query", () => {
      const response = proxy(requestFor("/api/users/me?fields=name"));

      expect(response.headers.get("x-middleware-rewrite")).toBe(
        "http://localhost:4000/users/me?fields=name",
      );
    });

    it("uses API_URL when it is set", () => {
      vi.stubEnv("API_URL", "http://api.internal:8080");

      const response = proxy(requestFor("/api/auth/google"));

      expect(response.headers.get("x-middleware-rewrite")).toBe(
        "http://api.internal:8080/auth/google",
      );
    });

    it("forwards API calls even without a session, so sign-in can start", () => {
      const response = proxy(requestFor("/api/auth/google"));

      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("route protection", () => {
    it("redirects to /login when there is no session cookie", () => {
      const response = proxy(requestFor("/"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/login",
      );
    });

    it.each(["access_token=a", "refresh_token=r"])(
      "lets the request through with %s",
      (cookie) => {
        const response = proxy(requestFor("/", cookie));

        expect(response.headers.get("x-middleware-next")).toBe("1");
      },
    );

    it("always allows the login page", () => {
      const response = proxy(requestFor("/login?error=login_failed"));

      expect(response.headers.get("x-middleware-next")).toBe("1");
    });
  });
});
