import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Order, useEditOrder, useOrderAction } from "./use-orders";

const { api } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));

const ROUND = {
  id: "c1",
  title: "Hoa quả tuần này",
  orderDeadline: "2099-01-01T10:00:00.000Z",
  deliveryDate: "2099-01-03",
};
const order = (overrides: Partial<Order> = {}) =>
  ({
    id: "o1",
    listing: { id: "l1", title: "Cam ngọt" },
    campaign: ROUND,
    ...overrides,
  }) as Order;

const ok = (data: unknown) => ({ data, response: new Response() });
const refused = {
  error: { code: "INVALID_ORDER_STATE", message: "x" },
  response: new Response(null, { status: 409 }),
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const keys = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { client, wrapper, keys };
}

const ROUND_KEYS = [["campaign-summary", "c1"], ["my-campaigns"]];

describe("useOrderAction", () => {
  beforeEach(() => vi.resetAllMocks());

  it("refreshes the order, the lists, the round's summary and the seller's rounds", async () => {
    api.POST.mockResolvedValue(ok(order()));
    const { wrapper, keys } = setup();
    const { result } = renderHook(() => useOrderAction(), { wrapper });

    await result.current.mutateAsync({ id: "o1", action: "confirm-payment" });

    expect(keys()).toEqual(
      expect.arrayContaining([
        ["order", "o1"],
        ["orders"],
        ["sales"],
        ["listings"],
        ...ROUND_KEYS,
      ]),
    );
  });

  it("leaves the rounds alone for an order outside a round", async () => {
    api.POST.mockResolvedValue(ok(order({ campaign: null })));
    const { wrapper, keys } = setup();
    const { result } = renderHook(() => useOrderAction(), { wrapper });

    await result.current.mutateAsync({ id: "o1", action: "cancel", reason: "x" });

    expect(keys()).toContainEqual(["sales"]);
    expect(keys()).not.toContainEqual(["my-campaigns"]);
    expect(keys().some((key) => key?.[0] === "campaign-summary")).toBe(false);
  });

  it("refreshes the round of the order it holds when the action is refused", async () => {
    api.POST.mockResolvedValue(refused);
    const { client, wrapper, keys } = setup();
    client.setQueryData(["order", "o1"], order());
    const { result } = renderHook(() => useOrderAction(), { wrapper });

    await expect(
      result.current.mutateAsync({ id: "o1", action: "deliver" }),
    ).rejects.toMatchObject({ code: "INVALID_ORDER_STATE" });

    expect(keys()).toEqual(
      expect.arrayContaining([["order", "o1"], ...ROUND_KEYS]),
    );
  });
});

describe("useEditOrder", () => {
  beforeEach(() => vi.resetAllMocks());

  it("refreshes the lists, the round, its summary and the seller's rounds", async () => {
    api.PATCH.mockResolvedValue(ok(order()));
    const { client, wrapper, keys } = setup();
    const { result } = renderHook(() => useEditOrder(), { wrapper });

    await result.current.mutateAsync({
      id: "o1",
      body: {
        lines: [{ listingId: "l1", quantity: "1" }],
        paymentMethod: "pay_on_delivery",
        deliveryLocation: "Tầng 7",
        note: null,
      },
    });

    expect(client.getQueryData(["order", "o1"])).toMatchObject({ id: "o1" });
    expect(keys()).toEqual(
      expect.arrayContaining([
        ["orders"],
        ["listings"],
        ["campaign", "c1"],
        ...ROUND_KEYS,
      ]),
    );
    // An order with a round has no product page of its own to refresh.
    expect(keys().some((key) => key?.[0] === "listing")).toBe(false);
  });
});
