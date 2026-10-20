import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
  useMarkAllRead,
  useMarkRead,
  useNotificationList,
  useUnreadCount,
} from "./use-notifications";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn(), POST: vi.fn() } }));
vi.mock("@/shared/api/client", () => ({ api }));

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper, invalidate };
}

const noContent = { response: new Response(null, { status: 204 }) };

describe("notification hooks", () => {
  beforeEach(() => vi.resetAllMocks());

  it("reads the unread count and polls it", async () => {
    api.GET.mockResolvedValue({ data: { count: 3 }, response: new Response() });
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(3));
    expect(api.GET).toHaveBeenCalledWith("/notifications/unread-count");
    const options = client.getQueryCache().find({ queryKey: UNREAD_COUNT_QUERY_KEY })?.options as
      | { refetchInterval?: number; refetchOnWindowFocus?: boolean }
      | undefined;
    expect(options?.refetchInterval).toBe(60_000);
    expect(options?.refetchOnWindowFocus).toBe(true);
  });

  it("does not fetch the list while disabled", () => {
    const { wrapper } = setup();
    renderHook(() => useNotificationList(false), { wrapper });
    expect(api.GET).not.toHaveBeenCalled();
  });

  it("fetches the first page, then the next with the cursor", async () => {
    api.GET.mockResolvedValueOnce({
      data: { items: [{ id: "n1" }], nextCursor: "c1" },
      response: new Response(),
    }).mockResolvedValueOnce({
      data: { items: [{ id: "n2" }], nextCursor: null },
      response: new Response(),
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => useNotificationList(true), { wrapper });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    expect(api.GET).toHaveBeenLastCalledWith("/notifications", {
      params: { query: { cursor: undefined } },
    });
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(api.GET).toHaveBeenLastCalledWith("/notifications", {
      params: { query: { cursor: "c1" } },
    });
    expect(result.current.hasNextPage).toBe(false);
  });

  it("marks one read and refreshes the notifications", async () => {
    api.POST.mockResolvedValue(noContent);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useMarkRead(), { wrapper });

    await result.current.mutateAsync("n1");

    expect(api.POST).toHaveBeenCalledWith("/notifications/{id}/read", {
      params: { path: { id: "n1" } },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTIFICATIONS_QUERY_KEY });
  });

  it("marks all read and refreshes the notifications", async () => {
    api.POST.mockResolvedValue(noContent);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useMarkAllRead(), { wrapper });

    await result.current.mutateAsync();

    expect(api.POST).toHaveBeenCalledWith("/notifications/read-all");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTIFICATIONS_QUERY_KEY });
  });

  it("throws an ApiError when marking read fails", async () => {
    api.POST.mockResolvedValue({
      error: { code: "NOT_FOUND", message: "x" },
      response: new Response(null, { status: 404 }),
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => useMarkRead(), { wrapper });
    await expect(result.current.mutateAsync("n1")).rejects.toMatchObject({ status: 404 });
  });
});
