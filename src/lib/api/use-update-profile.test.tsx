import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user";
import { publicUserQueryKey } from "./use-public-user";
import { useUpdateProfile } from "./use-update-profile";

const { api } = vi.hoisted(() => ({ api: { PATCH: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ api }));

describe("useUpdateProfile", () => {
  beforeEach(() => {
    api.PATCH.mockReset();
  });

  it("stores the new profile and refreshes the public copy of it", async () => {
    const user = { id: "u1", name: "An", role: "user" };
    api.PATCH.mockResolvedValue({ data: user, response: new Response() });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    await act(() => result.current.mutateAsync({ deliveryLocation: "Tầng 7" }));

    await waitFor(() =>
      expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual(user),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: publicUserQueryKey("u1"),
    });
  });

  it("throws the API error when the update fails", async () => {
    api.PATCH.mockResolvedValue({
      data: undefined,
      error: { code: "FORBIDDEN" },
      response: new Response(null, { status: 403 }),
    });
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await expect(
      act(() => result.current.mutateAsync({ deliveryLocation: "Tầng 7" })),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});
