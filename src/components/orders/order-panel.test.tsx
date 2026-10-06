import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { type ListingDetail, LISTINGS_QUERY_KEY, useListing } from "@/lib/api/use-listings";
import { QueryProvider } from "@/lib/query/query-provider";
import { OrderPanel } from "./order-panel";

const { api, router, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  router: { push: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const listing = (overrides: Partial<ListingDetail> = {}): ListingDetail => ({
  id: "l1",
  title: "Loa và phụ kiện",
  description: "",
  mode: "in_stock",
  status: "open",
  isOpen: true,
  category: { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics" },
  seller: { id: "seller", name: "Chị Lan", avatarUrl: null },
  acceptsPrepaidQr: true,
  acceptsPayOnDelivery: true,
  orderDeadline: null,
  deliveryDate: null,
  publishedAt: "2026-10-05T03:00:00.000Z",
  orderCount: 0,
  reopenedFromId: null,
  items: [
    { id: "loa", name: "Loa", unit: "cái", unitPrice: 500000, stockQuantity: 3 },
    { id: "cam", name: "Cam", unit: "kg", unitPrice: 35000, stockQuantity: 10 },
    { id: "day", name: "Dây sạc", unit: "cái", unitPrice: 20000, stockQuantity: 0 },
  ],
  images: [],
  ...overrides,
});

const fail = (status: number, code: string, details?: object) => ({
  error: { code, message: "backend text", details },
  response: new Response(null, { status }),
});

/** Stands in for the listing page, which owns the listing query. */
function Host({ value }: { value: ListingDetail }) {
  useListing(value.id);
  // Stands in for a browse list that is cached under ["listings"].
  useQuery({
    queryKey: [...LISTINGS_QUERY_KEY, "probe"],
    queryFn: () => api.GET("/listings"),
  });
  return <OrderPanel listing={value} />;
}

async function renderPanel(
  value: ListingDetail = listing(),
  me: object = { id: "me", deliveryLocation: "Tầng 7" },
) {
  api.GET.mockImplementation((path: string) =>
    Promise.resolve({
      data: path === "/users/me" ? me : value,
      response: new Response(),
    }),
  );
  render(
    <QueryProvider>
      <Host value={value} />
    </QueryProvider>,
  );
  await waitFor(() => expect(api.GET).toHaveBeenCalled());
}

const quantity = (name: RegExp) => screen.getByRole("textbox", { name });
const total = () => screen.getByRole("status", { name: "Tổng tiền" });
const submit = () =>
  userEvent.click(screen.getByRole("button", { name: "Đặt hàng" }));

describe("OrderPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.POST.mockResolvedValue({
      data: { id: "order-1", listing: { id: "l1" } },
      response: new Response(),
    });
  });

  it("shows each item with its price and what is left", async () => {
    await renderPanel();

    expect(quantity(/^Loa/)).toHaveAccessibleName(/500\.000 đ\/cái · Còn 3/);
    expect(quantity(/^Cam/)).toHaveAccessibleName(/35\.000 đ\/kg · Còn 10/);
    expect(quantity(/^Dây sạc/)).toHaveAccessibleName(/Hết hàng/);
    expect(quantity(/^Dây sạc/)).toBeDisabled();
  });

  it("adds up the total as quantities are typed, accepting a comma for kg", async () => {
    await renderPanel();
    expect(total()).toHaveTextContent("0 đ");
    // The same typeface as prices on cards and in the item table.
    expect(total()).toHaveClass("font-heading");

    await userEvent.type(quantity(/^Loa/), "2");
    await userEvent.type(quantity(/^Cam/), "1,5");

    expect(total()).toHaveTextContent("1.052.500 đ");
  });

  it("places the order with the typed lines and one idempotency key", async () => {
    await renderPanel();
    await userEvent.type(quantity(/^Loa/), "2");
    await userEvent.type(quantity(/^Cam/), "1,5");
    await userEvent.click(screen.getByRole("radio", { name: "Trả tiền khi nhận hàng" }));
    await userEvent.type(screen.getByLabelText(/Ghi chú/), "Giao sau 14h");

    await submit();

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/orders/order-1"));
    const [path, options] = api.POST.mock.calls[0] as [
      string,
      { body: object; params: { header: Record<string, string> } },
    ];
    expect(path).toBe("/orders");
    expect(options.body).toEqual({
      listingId: "l1",
      lines: [
        { itemId: "loa", quantity: "2" },
        { itemId: "cam", quantity: "1.5" },
      ],
      paymentMethod: "pay_on_delivery",
      deliveryLocation: "Tầng 7",
      note: "Giao sau 14h",
    });
    expect(options.params.header["Idempotency-Key"]).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  it("reuses the same idempotency key when the request is sent again", async () => {
    api.POST.mockResolvedValueOnce(fail(500, "INTERNAL_SERVER_ERROR"));
    await renderPanel();
    await userEvent.type(quantity(/^Loa/), "1");

    await submit();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await submit();

    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(2));
    const keys = api.POST.mock.calls.map(
      ([, options]) =>
        (options as { params: { header: Record<string, string> } }).params.header[
          "Idempotency-Key"
        ],
    );
    expect(keys[0]).toBe(keys[1]);
  });

  it("defaults to QR when both methods are accepted, and shows a single method as text", async () => {
    await renderPanel();
    expect(
      screen.getByRole("radio", { name: "Chuyển khoản trước qua mã QR" }),
    ).toBeChecked();
  });

  it("does not ask for a payment method when only one is accepted", async () => {
    await renderPanel(listing({ acceptsPrepaidQr: false }));

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText("Trả tiền khi nhận hàng")).toBeInTheDocument();
  });

  it("refuses to order more than is in stock", async () => {
    await renderPanel();
    await userEvent.type(quantity(/^Loa/), "4");

    await submit();

    expect(await screen.findByText("Loa: Chỉ còn 3 cái")).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it("explains quantity rules per unit", async () => {
    await renderPanel();
    await userEvent.type(quantity(/^Loa/), "1,5");
    await userEvent.type(quantity(/^Cam/), "0,25");

    await submit();

    expect(await screen.findByText("Loa: Nhập số nguyên từ 1")).toBeInTheDocument();
    expect(screen.getByText("Cam: Kg đặt theo bước 0,1, từ 0,1")).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it("asks for at least one item and a delivery location", async () => {
    await renderPanel(listing(), { id: "me", deliveryLocation: null });

    await submit();

    expect(
      await screen.findByText("Nhập số lượng cho ít nhất một mặt hàng"),
    ).toBeInTheDocument();
    expect(screen.getByText("Nhập nơi nhận hàng")).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it("pre-fills the delivery location from the profile and lets it be changed", async () => {
    await renderPanel();
    const location = screen.getByLabelText("Giao đến");
    await waitFor(() => expect(location).toHaveValue("Tầng 7"));

    await userEvent.clear(location);
    await userEvent.type(location, "Tầng 9");
    await userEvent.type(quantity(/^Loa/), "1");
    await submit();

    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(
      (api.POST.mock.calls[0][1] as { body: { deliveryLocation: string } }).body
        .deliveryLocation,
    ).toBe("Tầng 9");
  });

  it("lists what ran out when someone else bought first, keeping the form", async () => {
    api.POST.mockResolvedValue(
      fail(409, "OUT_OF_STOCK", {
        items: [{ itemId: "loa", name: "Loa", available: 1 }],
      }),
    );
    await renderPanel();
    await userEvent.type(quantity(/^Loa/), "2");
    const listingFetches = () =>
      api.GET.mock.calls.filter(([path]) => path === "/listings/{id}").length;
    const before = listingFetches();

    const listsFetches = () =>
      api.GET.mock.calls.filter(([path]) => path === "/listings").length;
    const listsBefore = listsFetches();

    await submit();

    const alert = await screen.findByText("Không còn đủ hàng:");
    expect(within(alert.parentElement as HTMLElement).getByText("Loa: còn 1")).toBeInTheDocument();
    expect(quantity(/^Loa/)).toHaveValue("2");
    expect(router.push).not.toHaveBeenCalled();
    // The listing is fetched again so the stock on the page is current.
    await waitFor(() => expect(listingFetches()).toBeGreaterThan(before));
    // Listing cards show stock too, so cached lists are fetched again.
    await waitFor(() => expect(listsFetches()).toBeGreaterThan(listsBefore));
  });

  it("points to the existing order on a pre-order already placed", async () => {
    api.POST.mockResolvedValue(fail(409, "ALREADY_ORDERED", { orderId: "o-9" }));
    await renderPanel();
    await userEvent.type(quantity(/^Loa/), "1");

    await submit();

    expect(await screen.findByText("Bạn đã đặt bài này")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem đơn của bạn" })).toHaveAttribute(
      "href",
      "/orders/o-9",
    );
  });

  it("shows a translated message for other failures", async () => {
    api.POST.mockResolvedValue(fail(409, "LISTING_NOT_OPEN"));
    await renderPanel();
    await userEvent.type(quantity(/^Loa/), "1");

    await submit();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Bài đăng này không còn nhận đơn."),
    );
  });
});
