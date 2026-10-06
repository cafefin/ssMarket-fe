import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { useCurrentUser } from "./use-current-user";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }));
vi.mock("@/shared/api/client", () => ({ api }));

describe("useCurrentUser", () => {
  beforeEach(() => {
    api.GET.mockReset();
  });

  it("loads the current user from /users/me", async () => {
    const user = {
      id: "1",
      email: "an@example.com",
      name: "An",
      avatarUrl: null,
      role: "user",
    };
    api.GET.mockResolvedValue({ data: user, response: new Response() });

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.data).toEqual(user));
    expect(api.GET).toHaveBeenCalledWith("/users/me");
  });

  it("reports an error when the request fails", async () => {
    api.GET.mockResolvedValue({
      data: undefined,
      response: new Response(null, { status: 500 }),
    });

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "Failed to load the current user (500)",
    );
  });
});
