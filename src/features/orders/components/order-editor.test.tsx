import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "../api/use-orders";
import { QueryProvider } from "@/shared/api/query-provider";
import { editBlockedReason } from "./order-editor";
import { OrderView } from "./order-view";

const { api, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));

const FUTURE = "2099-01-01T10:00:00.000Z";
const PAST = "2020-01-01T10:00:00.000Z";

const order = (overrides: Partial<Order> = {}): Order => ({
  id: "o1",
  code: "SSM7K2Q9X",
  listing: { id: "l1", title: "Hoa quả tuần này", orderDeadline: FUTURE, deliveryDate: "2099-01-03" },
  buyer: { id: "b", name: "Anh Minh" },
  seller: { id: "s", name: "Chị Lan" },
  viewerRole: "buyer",
  isPreorder: true,
  paymentMethod: "pay_on_delivery",
  paymentStatus: "unpaid",
  fulfillmentStatus: "pending",
  totalAmount: 52500,
  deliveryLocation: "Tầng 7",
  note: null,
  lines: [
    { itemId: "cam", itemName: "Cam ngọt", unit: "kg", unitPrice: 35000, quantity: 1.5, lineTotal: 52500 },
  ],
  refundNeeded: false,
  cancelledBy: null,
  cancelReason: null,
  createdAt: "2026-10-06T03:00:00.000Z",
  qr: null,
  ...overrides,
});

// The seller has since raised the price of Cam ngọt and added Bưởi.
const listing = {
  id: "l1",
  items: [
    { id: "cam", name: "Cam ngọt", unit: "kg", unitPrice: 40000, stockQuantity: null },
    { id: "buoi", name: "Bưởi", unit: "cái", unitPrice: 60000, stockQuantity: null },
  ],
};

const ok = (data: unknown) => ({ data, response: new Response() });

function renderOrder(value: Order = order()) {
  api.GET.mockImplementation((path: string) =>
    Promise.resolve(ok(path === "/orders/{id}" ? value : listing)),
  );
  renderWithIntl(
    <QueryProvider>
      <OrderView id="o1" />
    </QueryProvider>,
  );
}

const openEditor = async () =>
  userEvent.click(await screen.findByRole("button", { name: "Sửa đơn" }));

describe("editBlockedReason", () => {
  const now = new Date("2026-10-06T00:00:00Z");

  it("allows the buyer of an unpaid, pending pre-order before its deadline", () => {
    expect(editBlockedReason(order(), now)).toBeNull();
  });

  it.each<[string, Partial<Order>]>([
    ["the seller", { viewerRole: "seller" }],
    ["an in-stock order", { isPreorder: false }],
    ["a delivered order", { fulfillmentStatus: "delivered" }],
    ["a cancelled order", { fulfillmentStatus: "cancelled" }],
  ])("shows nothing about editing to %s", (_label, overrides) => {
    expect(editBlockedReason(order(overrides), now)).toBe("hidden");
  });

  it("explains why a reported or late order cannot be edited", () => {
    expect(editBlockedReason(order({ paymentStatus: "reported" }), now)).toBe(
      "reported",
    );
    expect(
      editBlockedReason(
        order({ listing: { ...order().listing, orderDeadline: PAST } }),
        now,
      ),
    ).toBe("pastDeadline");
  });
});

describe("editing an order", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.PATCH.mockResolvedValue(ok(order({ totalAmount: 130000 })));
  });

  it("starts from the current order, at the prices it was placed at", async () => {
    renderOrder();
    await openEditor();

    const cam = await screen.findByRole("textbox", { name: /^Cam ngọt/ });
    expect(cam).toHaveValue("1,5");
    // The ordered price, not the listing's new 40.000 đ.
    expect(cam).toHaveAccessibleName(/35\.000 đ\/kg/);
    expect(screen.getByRole("textbox", { name: /^Bưởi/ })).toHaveAccessibleName(
      /60\.000 đ\/cái/,
    );
    expect(screen.getByRole("status", { name: "Tổng tiền mới" })).toHaveTextContent(
      "52.500 đ",
    );
    expect(screen.getByLabelText("Giao đến")).toHaveValue("Tầng 7");
  });

  it("saves changed quantities and an added item, then closes", async () => {
    renderOrder();
    await openEditor();
    const cam = await screen.findByRole("textbox", { name: /^Cam ngọt/ });

    await userEvent.clear(cam);
    await userEvent.type(cam, "2");
    await userEvent.type(screen.getByRole("textbox", { name: /^Bưởi/ }), "1");
    expect(screen.getByRole("status", { name: "Tổng tiền mới" })).toHaveTextContent(
      "130.000 đ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã cập nhật đơn"));
    expect(api.PATCH).toHaveBeenCalledWith("/orders/{id}", {
      params: { path: { id: "o1" } },
      body: {
        lines: [
          { itemId: "cam", quantity: "2" },
          { itemId: "buoi", quantity: "1" },
        ],
        paymentMethod: "pay_on_delivery",
        deliveryLocation: "Tầng 7",
        note: null,
      },
    });
    await waitFor(() =>
      expect(screen.queryByRole("form", { name: "Sửa đơn" })).not.toBeInTheDocument(),
    );
  });

  it("does not allow emptying the order; that is what cancelling is for", async () => {
    renderOrder();
    await openEditor();

    await userEvent.clear(await screen.findByRole("textbox", { name: /^Cam ngọt/ }));
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(
      await screen.findByText("Đơn cần ít nhất một mặt hàng. Muốn bỏ hết, hãy hủy đơn."),
    ).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it("validates quantities like the order form", async () => {
    renderOrder();
    await openEditor();

    await userEvent.type(screen.getByRole("textbox", { name: /^Bưởi/ }), "1,5");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(await screen.findByText("Bưởi: Nhập số nguyên từ 1")).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it("can be abandoned without saving", async () => {
    renderOrder();
    await openEditor();

    await userEvent.click(await screen.findByRole("button", { name: "Thôi" }));

    expect(screen.queryByRole("form", { name: "Sửa đơn" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sửa đơn" })).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it("shows a translated message when the server refuses", async () => {
    api.PATCH.mockResolvedValue({
      error: { code: "ORDER_NOT_EDITABLE", message: "x" },
      response: new Response(null, { status: 409 }),
    });
    renderOrder();
    await openEditor();

    await userEvent.click(await screen.findByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Đơn này không còn sửa được. Trang đã được cập nhật, hãy xem lại.",
      ),
    );
  });

  it("explains instead of offering to edit once payment was reported", async () => {
    renderOrder(order({ paymentMethod: "prepaid_qr", paymentStatus: "reported" }));

    expect(
      await screen.findByText(
        "Đơn đã báo chuyển khoản, hãy liên hệ người bán để thay đổi.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa đơn" })).not.toBeInTheDocument();
  });

  it("offers nothing about editing on an in-stock order", async () => {
    renderOrder(order({ isPreorder: false }));

    await screen.findByRole("heading", { name: "Đơn SSM7K2Q9X" });
    expect(screen.queryByRole("button", { name: "Sửa đơn" })).not.toBeInTheDocument();
    expect(screen.queryByText(/hạn chốt đơn/)).not.toBeInTheDocument();
  });
});
