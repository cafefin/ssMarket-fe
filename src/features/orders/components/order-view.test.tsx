import { screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "../api/use-orders";
import { QueryProvider } from "@/shared/api/query-provider";
import { availableActions } from "./order-actions";
import { OrderView } from "./order-view";

const { api, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));

const order = (overrides: Partial<Order> = {}): Order => ({
  id: "o1",
  code: "SSM7K2Q9X",
  listing: { id: "l1", title: "Hoa quả tuần này", orderDeadline: null, deliveryDate: "2026-10-12" },
  listingCount: 1,
  buyer: { id: "b", name: "Anh Minh" },
  seller: { id: "s", name: "Chị Lan" },
  viewerRole: "buyer",
  isPreorder: true,
  paymentMethod: "prepaid_qr",
  paymentStatus: "unpaid",
  fulfillmentStatus: "pending",
  totalAmount: 122500,
  deliveryLocation: "Tầng 7",
  note: "Giao sau 14h",
  lines: [
    { listingId: "l1", title: "Cam sành", unit: "kg", unitPrice: 35000, quantity: 1.5, lineTotal: 52500, listTotal: 52500, combos: [] },
    { listingId: "l3", title: "Bưởi", unit: "kg", unitPrice: 70000, quantity: 1, lineTotal: 70000, listTotal: 70000, combos: [] },
  ],
  refundNeeded: false,
  cancelledBy: null,
  cancelReason: null,
  createdAt: "2026-10-06T03:00:00.000Z",
  qr: {
    payload: "00020101021238...6304ABCD",
    bankName: "Vietcombank",
    accountNumber: "0123456789",
    accountName: "NGUYEN THI LAN",
    amount: 122500,
    content: "SSM7K2Q9X",
  },
  ...overrides,
});

const ok = (data: unknown) => ({ data, response: new Response() });

function renderView(
  value: Order | { status: number },
  locale: "vi" | "en" = "vi",
) {
  api.GET.mockResolvedValue(
    "status" in value
      ? { error: { code: "X" }, response: new Response(null, { status: value.status }) }
      : ok(value),
  );
  renderWithIntl(
    <QueryProvider>
      <OrderView id="o1" />
    </QueryProvider>,
    { locale },
  );
}

const buttons = () => screen.getAllByRole("button").map((b) => b.textContent);

describe("availableActions", () => {
  it.each<[string, Partial<Order>, string[]]>([
    ["buyer, QR, unpaid", {}, ["report-payment", "cancel"]],
    ["buyer, pay on delivery, unpaid", { paymentMethod: "pay_on_delivery" }, ["cancel"]],
    ["buyer, reported", { paymentStatus: "reported" }, []],
    ["buyer, paid", { paymentStatus: "paid" }, []],
    ["buyer, delivered but unpaid", { paymentMethod: "pay_on_delivery", fulfillmentStatus: "delivered" }, []],
    ["seller, unpaid", { viewerRole: "seller" }, ["confirm-payment", "deliver", "cancel"]],
    [
      "seller, reported",
      { viewerRole: "seller", paymentStatus: "reported" },
      ["confirm-payment", "reject-payment", "deliver", "cancel"],
    ],
    ["seller, paid", { viewerRole: "seller", paymentStatus: "paid" }, ["deliver", "cancel"]],
    [
      "seller, delivered but unpaid",
      { viewerRole: "seller", fulfillmentStatus: "delivered" },
      ["confirm-payment"],
    ],
    [
      "seller, delivered and paid",
      { viewerRole: "seller", paymentStatus: "paid", fulfillmentStatus: "delivered" },
      [],
    ],
    ["buyer, cancelled", { fulfillmentStatus: "cancelled" }, []],
    ["seller, cancelled", { viewerRole: "seller", fulfillmentStatus: "cancelled" }, []],
  ])("%s", (_label, overrides, expected) => {
    expect(availableActions(order(overrides))).toEqual(expected);
  });
});

describe("OrderView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("shows the buyer the order, the QR code and what to do next", async () => {
    renderView(order());

    expect(await screen.findByRole("heading", { name: "Đơn SSM7K2Q9X" })).toBeInTheDocument();
    expect(screen.getByText("Chưa thanh toán")).toBeInTheDocument();
    expect(screen.getByText("Chờ giao")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Mã QR chuyển khoản cho đơn SSM7K2Q9X" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Quét mã QR để chuyển khoản/)).toBeInTheDocument();

    const cam = screen.getByRole("row", { name: /Cam sành/ });
    expect(within(cam).getByText(/1,5 kg × 35\.000 đ/)).toBeInTheDocument();
    expect(within(cam).getByText("52.500 đ")).toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Tổng tiền/ })).getByText("122.500 đ"),
    ).toBeInTheDocument();
    expect(screen.getByText("Chị Lan")).toBeInTheDocument();
    expect(screen.getByText("Tầng 7")).toBeInTheDocument();
    expect(screen.getByText("12/10/2026")).toBeInTheDocument();
    expect(screen.getByText("Giao sau 14h")).toBeInTheDocument();
  });

  it("shows the order in English", async () => {
    renderView(order(), "en");

    expect(
      await screen.findByRole("heading", { name: "Order SSM7K2Q9X" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
    expect(screen.getByText("To deliver")).toBeInTheDocument();
    expect(
      screen.getByText("Scan the QR code to pay, then press “I have paid”."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I have paid" })).toBeInTheDocument();
    const cam = screen.getByRole("row", { name: /Cam sành/ });
    expect(within(cam).getByText(/1\.5 kg × 35,000 VND/)).toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Total/ })).getByText("122,500 VND"),
    ).toBeInTheDocument();
  });

  it("links each product and shows the price before combos", async () => {
    renderView(
      order({
        listingCount: 2,
        isPreorder: false,
        lines: [
          {
            listingId: "l1",
            title: "Loa bluetooth",
            unit: "cái",
            unitPrice: 500000,
            quantity: 1,
            lineTotal: 500000,
            listTotal: 500000,
            combos: [],
          },
          {
            listingId: "l2",
            title: "Bút bi",
            unit: "cái",
            unitPrice: 10000,
            quantity: 100,
            lineTotal: 900000,
            listTotal: 1000000,
            combos: [{ quantity: "100", price: 900000 }],
          },
        ],
      }),
    );

    const pens = await screen.findByRole("row", { name: /Bút bi.*100 cái/ });
    expect(within(pens).getByText("900.000 đ")).toBeInTheDocument();
    expect(within(pens).getByText("Giá lẻ 1.000.000 đ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Loa bluetooth" })).toHaveAttribute(
      "href",
      "/listings/l1",
    );
  });

  it("copies the raw amount and the transfer content", async () => {
    renderView(order());

    await userEvent.click(
      await screen.findByRole("button", { name: "Sao chép số tiền" }),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("122500");
    expect(
      screen.getByRole("button", { name: "Sao chép số tiền" }),
    ).toHaveTextContent("Đã sao chép");

    await userEvent.click(screen.getByRole("button", { name: "Sao chép nội dung" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("SSM7K2Q9X");
  });

  it("lets the buyer report the transfer", async () => {
    api.POST.mockResolvedValue(ok(order({ paymentStatus: "reported" })));
    renderView(order());
    const button = await screen.findByRole("button", {
      name: "Tôi đã chuyển khoản",
    });
    // From now on the server reports the new state when the page refetches.
    api.GET.mockResolvedValue(ok(order({ paymentStatus: "reported" })));

    await userEvent.click(button);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Đã báo cho người bán"),
    );
    expect(api.POST).toHaveBeenCalledWith("/orders/{id}/report-payment", {
      params: { path: { id: "o1" } },
    });
    expect(await screen.findByText("Chờ xác nhận tiền")).toBeInTheDocument();
  });

  it("gives a waiting buyer no buttons, only an explanation", async () => {
    renderView(order({ paymentStatus: "reported" }));

    expect(
      await screen.findByText(/Người bán sẽ xác nhận khi thấy tiền về/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tôi đã chuyển khoản" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hủy đơn" })).not.toBeInTheDocument();
  });

  it("shows the seller who ordered and the confirmation actions, not the QR", async () => {
    renderView(order({ viewerRole: "seller", paymentStatus: "reported" }));

    expect(await screen.findByText("Anh Minh")).toBeInTheDocument();
    expect(screen.getByText(/Hãy kiểm tra sao kê theo mã đơn/)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Mã QR/ })).not.toBeInTheDocument();
    expect(buttons()).toEqual(["Đã nhận tiền", "Đã giao", "Chưa nhận được", "Hủy đơn"]);
  });

  it("confirms a payment in one click", async () => {
    api.POST.mockResolvedValue(ok(order({ viewerRole: "seller", paymentStatus: "paid" })));
    renderView(order({ viewerRole: "seller", paymentStatus: "reported" }));

    await userEvent.click(await screen.findByRole("button", { name: "Đã nhận tiền" }));

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith("/orders/{id}/confirm-payment", {
        params: { path: { id: "o1" } },
      }),
    );
  });

  it("asks before sending a reported payment back", async () => {
    api.POST.mockResolvedValue(ok(order({ viewerRole: "seller" })));
    renderView(order({ viewerRole: "seller", paymentStatus: "reported" }));

    await userEvent.click(await screen.findByRole("button", { name: "Chưa nhận được" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(api.POST).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Xác nhận" }));

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith("/orders/{id}/reject-payment", {
        params: { path: { id: "o1" } },
      }),
    );
  });

  it("requires a reason when the seller cancels", async () => {
    api.POST.mockResolvedValue(ok(order({ viewerRole: "seller", fulfillmentStatus: "cancelled" })));
    renderView(order({ viewerRole: "seller" }));

    await userEvent.click(await screen.findByRole("button", { name: "Hủy đơn" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Hủy đơn" }));

    expect(
      await within(dialog).findByText("Nhập lý do để người mua biết"),
    ).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText("Lý do hủy"), "Hết hàng");
    await userEvent.click(within(dialog).getByRole("button", { name: "Hủy đơn" }));

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith("/orders/{id}/cancel", {
        params: { path: { id: "o1" } },
        body: { reason: "Hết hàng" },
      }),
    );
  });

  it("lets the buyer cancel without a reason, after confirming", async () => {
    api.POST.mockResolvedValue(ok(order({ fulfillmentStatus: "cancelled" })));
    renderView(order());

    await userEvent.click(await screen.findByRole("button", { name: "Hủy đơn" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).queryByLabelText("Lý do hủy")).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Hủy đơn" }));

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith("/orders/{id}/cancel", {
        params: { path: { id: "o1" } },
        body: { reason: null },
      }),
    );
  });

  it("explains a cancelled order, its reason and the refund", async () => {
    renderView(
      order({
        fulfillmentStatus: "cancelled",
        paymentStatus: "paid",
        cancelledBy: "seller",
        cancelReason: "Không nhập được hàng",
        refundNeeded: true,
        qr: null,
      }),
    );

    expect(await screen.findByText("Đã hủy")).toBeInTheDocument();
    expect(screen.getByText("Cần hoàn tiền")).toBeInTheDocument();
    expect(screen.queryByText("Đã thanh toán")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Người bán đã hủy đơn này\. Lý do: Không nhập được hàng Người bán sẽ hoàn tiền cho bạn/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a translated message when the order changed under the viewer", async () => {
    api.POST.mockResolvedValue({
      error: { code: "INVALID_ORDER_STATE", message: "x" },
      response: new Response(null, { status: 409 }),
    });
    renderView(order());

    await userEvent.click(
      await screen.findByRole("button", { name: "Tôi đã chuyển khoản" }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Đơn hàng đã thay đổi trạng thái. Trang đã được cập nhật, hãy xem lại.",
      ),
    );
  });

  it("explains an order the viewer may not see", async () => {
    renderView({ status: 404 });

    expect(
      await screen.findByRole("heading", { name: "Không tìm thấy đơn hàng" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về đơn của tôi" })).toHaveAttribute(
      "href",
      "/orders",
    );
  });

  it("offers a retry when loading fails", async () => {
    renderView({ status: 500 });

    expect(
      await screen.findByRole("heading", { name: "Không tải được đơn hàng" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });
});
