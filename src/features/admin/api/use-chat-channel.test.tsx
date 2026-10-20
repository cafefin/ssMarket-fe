import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHAT_CHANNEL_QUERY_KEY,
  CHAT_DELIVERIES_QUERY_KEY,
  useChatChannel,
  useChatDeliveries,
  useChatPreview,
  useSendChatTest,
  useUpdateChatSettings,
  useUpdateChatTemplate,
} from "./use-chat-channel";

const { api } = vi.hoisted(() => ({
  api: { GET: vi.fn(), PUT: vi.fn(), POST: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("chat channel hooks", () => {
  it("reads the channel", async () => {
    api.GET.mockResolvedValue({ data: { enabled: true } });
    const { result } = renderHook(() => useChatChannel(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.GET).toHaveBeenCalledWith("/admin/chat-channel");
  });

  it("is idle when disabled", () => {
    renderHook(() => useChatChannel(false), { wrapper });
    expect(api.GET).not.toHaveBeenCalled();
  });

  it("throws an ApiError on failure", async () => {
    api.GET.mockResolvedValue({
      error: { code: "FORBIDDEN" },
      response: { status: 403 },
    });
    const { result } = renderHook(() => useChatChannel(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("saves settings and invalidates the channel", async () => {
    api.PUT.mockResolvedValue({ data: { enabled: false } });
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateChatSettings(), { wrapper });
    const body = { enabled: false, maxPerHour: null, sellerCooldownMinutes: 0 };
    await act(() => result.current.mutateAsync(body));
    expect(api.PUT).toHaveBeenCalledWith("/admin/chat-channel", { body });
    expect(spy).toHaveBeenCalledWith({ queryKey: CHAT_CHANNEL_QUERY_KEY });
  });

  it("saves a template and invalidates the channel", async () => {
    api.PUT.mockResolvedValue({ data: { eventType: "listing.published" } });
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateChatTemplate(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        eventType: "listing.published",
        enabled: true,
        template: "Hi",
      }),
    );
    expect(api.PUT).toHaveBeenCalledWith(
      "/admin/chat-channel/templates/{eventType}",
      {
        params: { path: { eventType: "listing.published" } },
        body: { enabled: true, template: "Hi" },
      },
    );
    expect(spy).toHaveBeenCalledWith({ queryKey: CHAT_CHANNEL_QUERY_KEY });
  });

  it("previews with a keyed query and returns the message", async () => {
    api.POST.mockResolvedValue({ data: { message: "Hi Lan" } });
    const { result } = renderHook(
      () => useChatPreview("listing.published", "Hi", true),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBe("Hi Lan"));
    expect(api.POST).toHaveBeenCalledWith(
      "/admin/chat-channel/templates/{eventType}/preview",
      {
        params: { path: { eventType: "listing.published" } },
        body: { template: "Hi" },
      },
    );
    expect(
      client.getQueryData([
        ...CHAT_CHANNEL_QUERY_KEY,
        "preview",
        "listing.published",
        "Hi",
      ]),
    ).toBe("Hi Lan");
  });

  it("does not preview when disabled", () => {
    renderHook(() => useChatPreview("listing.published", "Hi", false), {
      wrapper,
    });
    expect(api.POST).not.toHaveBeenCalled();
  });

  it("sends a test and invalidates the deliveries", async () => {
    api.POST.mockResolvedValue({ data: { message: "sent text" } });
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSendChatTest(), { wrapper });
    let text = "";
    await act(async () => {
      text = await result.current.mutateAsync({
        eventType: "chat.digest",
        template: "T",
      });
    });
    expect(text).toBe("sent text");
    expect(api.POST).toHaveBeenCalledWith(
      "/admin/chat-channel/templates/{eventType}/test",
      {
        params: { path: { eventType: "chat.digest" } },
        body: { template: "T" },
      },
    );
    expect(spy).toHaveBeenCalledWith({ queryKey: CHAT_DELIVERIES_QUERY_KEY });
  });

  it("pages the deliveries by cursor", async () => {
    api.GET.mockResolvedValueOnce({ data: { items: [], nextCursor: "c1" } });
    api.GET.mockResolvedValueOnce({ data: { items: [], nextCursor: null } });
    const { result } = renderHook(() => useChatDeliveries(), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(api.GET).toHaveBeenCalledWith("/admin/chat-channel/deliveries", {
      params: { query: { cursor: undefined } },
    });
    await act(() => result.current.fetchNextPage());
    expect(api.GET).toHaveBeenLastCalledWith("/admin/chat-channel/deliveries", {
      params: { query: { cursor: "c1" } },
    });
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });
});
