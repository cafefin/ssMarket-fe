import { screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "../api/use-orders";
import { QueryProvider } from "@/shared/api/query-provider";
import { MyOrders } from "./my-orders";
import { SalesList } from "./sales-list";

const { api, router, location, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  router: { replace: vi.fn() },
  location: { search: "" },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/sell/orders",
  useSearchParams: () => new URLSearchParams(location.search),
}));

const order = (overrides: Partial<Order> = {}): Order => ({
  id: "o1",
  code: "SSM7K2Q9X",
  listing: { id: "l1", title: "Hoa quả tuần này", orderDeadline: null, deliveryDate: null },
  buyer: { id: "b", name: "Anh Minh" },
  seller: { id: "s", name: "Chị Lan" },
  viewerRole: "buyer",
  isPreorder: true,
  paymentMethod: "pay_on_delivery",
  paymentStatus: "unpaid",
  fulfillmentStatus: "pending",
  totalAmount: 122500,
  deliveryLocation: "Tầng 7",
  note: null,
  lines: [],
  refundNeeded: false,
  cancelledBy: null,
  cancelReason: null,
  createdAt: "2026-10-06T03:00:00.000Z",
  qr: null,
  ...overrides,
});

const ok = (data: unknown) => ({ data, response: new Response() });
const page = (items: Order[], nextCursor: string | null = null) =>
  ok({ items, nextCursor });

/** Answers each API path with the next queued response for it. */
function serve(responses: Record<string, unknown[]>) {
  const queues = Object.fromEntries(
    Object.entries(responses).map(([path, list]) => [path, [...list]]),
  );
  api.GET.mockImplementation((path: string) => {
    const queue = queues[path] ?? [];
    return Promise.resolve(queue.length > 1 ? queue.shift() : queue[0] ?? ok([]));
  });
}

const callsTo = (path: string) =>
  api.GET.mock.calls.filter(([called]) => called === path);

describe("MyOrders", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    location.search = "";
  });

  function renderList() {
    renderWithIntl(
      <QueryProvider>
        <MyOrders />
      </QueryProvider>,
    );
  }

  it("lists the buyer's orders with total, seller and status", async () => {
    serve({ "/orders": [page([order()])] });

    renderList();

    const row = await screen.findByRole("listitem", { name: "Đơn SSM7K2Q9X" });
    expect(within(row).getByRole("link", { name: "SSM7K2Q9X" })).toHaveAttribute(
      "href",
      "/orders/o1",
    );
    expect(row).toHaveTextContent("Hoa quả tuần này");
    expect(row).toHaveTextContent("Người bán: Chị Lan");
    expect(row).toHaveTextContent("122.500 đ");
    expect(within(row).getByText("Chưa thanh toán")).toBeInTheDocument();
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  });

  it("invites browsing when there are no orders", async () => {
    serve({ "/orders": [page([])] });

    renderList();

    expect(await screen.findByText("Bạn chưa đặt đơn nào.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem hàng đang bán" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("loads more with the cursor", async () => {
    serve({
      "/orders": [
        page([order()], "cursor-2"),
        page([order({ id: "o2", code: "SSMAAAAAA" })]),
      ],
    });

    renderList();
    await userEvent.click(await screen.findByRole("button", { name: "Xem thêm" }));

    expect(await screen.findByRole("listitem", { name: "Đơn SSMAAAAAA" })).toBeInTheDocument();
    expect(callsTo("/orders")[1][1]).toEqual({
      params: { query: { cursor: "cursor-2" } },
    });
  });

  it("offers a retry when loading fails", async () => {
    serve({
      "/orders": [
        { error: { code: "X" }, response: new Response(null, { status: 500 }) },
        page([order()]),
      ],
    });

    renderList();
    await userEvent.click(await screen.findByRole("button", { name: "Thử lại" }));

    expect(await screen.findByRole("listitem", { name: "Đơn SSM7K2Q9X" })).toBeInTheDocument();
  });
});

describe("SalesList", () => {
  const sale = (overrides: Partial<Order> = {}) =>
    order({ viewerRole: "seller", ...overrides });
  const listings = [{ id: "l1", title: "Hoa quả tuần này" }];

  beforeEach(() => {
    vi.resetAllMocks();
    location.search = "";
  });

  function renderList() {
    renderWithIntl(
      <QueryProvider>
        <SalesList />
      </QueryProvider>,
    );
  }

  it("shows who ordered, where to deliver and the everyday actions", async () => {
    serve({
      "/users/me/sales": [page([sale()])],
      "/users/me/listings": [ok(listings)],
    });

    renderList();

    const row = await screen.findByRole("listitem", { name: "Đơn SSM7K2Q9X" });
    expect(row).toHaveTextContent("Anh Minh · Tầng 7");
    expect(
      within(row)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Đã nhận tiền", "Đã giao"]);
  });

  it("acts on an order straight from the list", async () => {
    serve({
      "/users/me/sales": [page([sale()]), page([sale({ fulfillmentStatus: "delivered" })])],
      "/users/me/listings": [ok(listings)],
    });
    api.POST.mockResolvedValue(ok(sale({ fulfillmentStatus: "delivered" })));
    renderList();
    const row = await screen.findByRole("listitem", { name: "Đơn SSM7K2Q9X" });

    await userEvent.click(within(row).getByRole("button", { name: "Đã giao" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Đã đánh dấu đã giao"),
    );
    expect(api.POST).toHaveBeenCalledWith("/orders/{id}/deliver", {
      params: { path: { id: "o1" } },
    });
  });

  it("reads the filters from the URL", async () => {
    location.search = "listing=l1&payment=reported&delivery=pending";
    serve({
      "/users/me/sales": [page([])],
      "/users/me/listings": [ok(listings)],
    });

    renderList();

    expect(
      await screen.findByText("Chưa có đơn nào khớp bộ lọc này."),
    ).toBeInTheDocument();
    expect(callsTo("/users/me/sales")[0][1]).toEqual({
      params: {
        query: {
          listingId: "l1",
          paymentStatus: "reported",
          fulfillmentStatus: "pending",
          cursor: undefined,
        },
      },
    });
    expect(screen.getByLabelText("Thanh toán")).toHaveValue("reported");
    expect(screen.getByLabelText("Giao hàng")).toHaveValue("pending");
  });

  it("ignores filter values that are not valid", async () => {
    location.search = "payment=hacked";
    serve({ "/users/me/sales": [page([])], "/users/me/listings": [ok([])] });

    renderList();

    await waitFor(() => expect(callsTo("/users/me/sales")).toHaveLength(1));
    expect(callsTo("/users/me/sales")[0][1]).toMatchObject({
      params: { query: { paymentStatus: undefined } },
    });
  });

  it("writes a changed filter to the URL and clears it again", async () => {
    location.search = "delivery=pending";
    serve({
      "/users/me/sales": [page([])],
      "/users/me/listings": [ok(listings)],
    });
    renderList();

    await userEvent.selectOptions(screen.getByLabelText("Thanh toán"), "paid");
    expect(router.replace).toHaveBeenCalledWith(
      "/sell/orders?delivery=pending&payment=paid",
    );

    await userEvent.selectOptions(screen.getByLabelText("Giao hàng"), "");
    expect(router.replace).toHaveBeenLastCalledWith("/sell/orders");
  });

  it("offers the seller's listings as a filter", async () => {
    serve({
      "/users/me/sales": [page([])],
      "/users/me/listings": [ok(listings)],
    });

    renderList();

    expect(
      await within(screen.getByLabelText("Bài đăng")).findByRole("option", {
        name: "Hoa quả tuần này",
      }),
    ).toBeInTheDocument();
  });
});
