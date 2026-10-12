import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const ROUND = {
  id: "c1",
  title: "Hoa quả tuần này",
  orderDeadline: FUTURE,
  deliveryDate: "2099-01-03",
};

const CAM = { listingId: "l1", title: "Cam ngọt", unit: "kg", unitPrice: 35000, quantity: 1.5, lineTotal: 52500, listTotal: 52500, combos: [] };
const XOAI = {
  listingId: "l2",
  title: "Xoài cát",
  unit: "hộp",
  unitPrice: 40000,
  quantity: 2,
  lineTotal: 80000,
  listTotal: 80000,
  combos: [{ quantity: "3", price: 100000 }],
};

const order = (overrides: Partial<Order> = {}): Order => ({
  id: "o1",
  code: "SSM7K2Q9X",
  listing: { id: "l1", title: "Cam ngọt" },
  campaign: ROUND,
  listingCount: 1,
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
  lines: [CAM],
  refundNeeded: false,
  cancelledBy: null,
  cancelReason: null,
  createdAt: "2026-10-06T03:00:00.000Z",
  qr: null,
  ...overrides,
});

const ok = (data: unknown) => ({ data, response: new Response() });

function renderOrder(value: Order = order()) {
  api.GET.mockImplementation((path: string) =>
    Promise.resolve(ok(path === "/orders/{id}" ? value : {})),
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
        order({ campaign: { ...ROUND, orderDeadline: PAST } }),
        now,
      ),
    ).toBe("pastDeadline");
  });

  it("has no deadline to wait for without a round", () => {
    expect(editBlockedReason(order({ campaign: null }), now)).toBeNull();
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
    // The ordered price, whatever the listing costs now.
    expect(cam).toHaveAccessibleName(/35\.000 đ\/kg/);
    expect(screen.getByRole("status", { name: "Tổng tiền mới" })).toHaveTextContent(
      "52.500 đ",
    );
    expect(screen.getByLabelText("Giao đến")).toHaveValue("Tầng 7");
  });

  it("saves the changed quantity, then closes", async () => {
    renderOrder();
    await openEditor();
    const cam = await screen.findByRole("textbox", { name: /^Cam ngọt/ });

    await userEvent.clear(cam);
    await userEvent.type(cam, "2");
    expect(screen.getByRole("status", { name: "Tổng tiền mới" })).toHaveTextContent(
      "70.000 đ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã cập nhật đơn"));
    expect(api.PATCH).toHaveBeenCalledWith("/orders/{id}", {
      params: { path: { id: "o1" } },
      body: {
        lines: [{ listingId: "l1", quantity: "2" }],
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
      await screen.findByText("Nhập số lượng. Muốn bỏ hẳn, hãy hủy đơn."),
    ).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  describe("with two products", () => {
    const two = () => order({ listingCount: 2, lines: [CAM, XOAI], totalAmount: 132500 });
    const fields = async () => ({
      cam: await screen.findByRole("textbox", { name: /^Cam ngọt/ }),
      xoai: screen.getByRole("textbox", { name: /^Xoài cát/ }),
    });
    const total = () => screen.getByRole("status", { name: "Tổng tiền mới" });

    it("has one quantity per product and adds the lines up, combos included", async () => {
      renderOrder(two());
      await openEditor();
      const { cam, xoai } = await fields();

      expect(cam).toHaveValue("1,5");
      expect(xoai).toHaveValue("2");
      expect(xoai).toHaveAccessibleName(/40\.000 đ\/hộp/);
      expect(total()).toHaveTextContent("132.500 đ");

      await userEvent.clear(xoai);
      await userEvent.type(xoai, "4");
      // 1,5 kg x 35.000 + one combo of 3 (100.000) + 1 x 40.000.
      expect(total()).toHaveTextContent("192.500 đ");
    });

    it("sends every product as a line", async () => {
      renderOrder(two());
      await openEditor();
      const { cam, xoai } = await fields();

      await userEvent.clear(cam);
      await userEvent.type(cam, "2,5");
      await userEvent.clear(xoai);
      await userEvent.type(xoai, "3");
      await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

      await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(1));
      expect(api.PATCH).toHaveBeenCalledWith("/orders/{id}", {
        params: { path: { id: "o1" } },
        body: {
          lines: [
            { listingId: "l1", quantity: "2.5" },
            { listingId: "l2", quantity: "3" },
          ],
          paymentMethod: "pay_on_delivery",
          deliveryLocation: "Tầng 7",
          note: null,
        },
      });
    });

    it.each(["0", ""])("leaves out a product set to %j", async (text) => {
      renderOrder(two());
      await openEditor();
      const { cam } = await fields();

      await userEvent.clear(cam);
      if (text) {
        await userEvent.type(cam, text);
      }
      expect(total()).toHaveTextContent("80.000 đ");
      await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

      await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(1));
      expect(api.PATCH.mock.calls[0][1].body.lines).toEqual([
        { listingId: "l2", quantity: "2" },
      ]);
    });

    it("keeps at least one product", async () => {
      renderOrder(two());
      await openEditor();
      const { cam, xoai } = await fields();

      await userEvent.clear(cam);
      await userEvent.clear(xoai);
      await userEvent.type(xoai, "0");
      await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

      expect(
        await screen.findByText("Nhập số lượng. Muốn bỏ hẳn, hãy hủy đơn."),
      ).toBeInTheDocument();
      expect(api.PATCH).not.toHaveBeenCalled();
    });

    it("points at the product whose quantity is wrong and saves nothing", async () => {
      renderOrder(two());
      await openEditor();
      const { xoai } = await fields();

      await userEvent.clear(xoai);
      await userEvent.type(xoai, "1,5");
      await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/số nguyên/i);
      expect(xoai).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("textbox", { name: /^Cam ngọt/ })).toHaveAttribute(
        "aria-invalid",
        "false",
      );
      expect(total()).toHaveTextContent("0 đ");
      expect(api.PATCH).not.toHaveBeenCalled();
    });
  });

  it.each<[string, Partial<Order>, unknown[]]>([
    ["the round of a pre-order", {}, ["campaign", "c1"]],
    ["the listing of an order without a round", { campaign: null }, ["listing", "l1"]],
  ])("refreshes %s after saving", async (_label, overrides, queryKey) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const value = order(overrides);
    api.GET.mockResolvedValue(ok(value));
    api.PATCH.mockResolvedValue(ok(value));
    renderWithIntl(
      <QueryClientProvider client={client}>
        <OrderView id="o1" />
      </QueryClientProvider>,
    );
    await openEditor();

    await userEvent.click(await screen.findByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey }));
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toContainEqual(["orders"]);
    expect(keys.filter((key) => key?.[0] === "campaign" || key?.[0] === "listing")).toEqual([
      queryKey,
    ]);
  });

  it("validates quantities like the order form", async () => {
    renderOrder();
    await openEditor();

    const cam = await screen.findByRole("textbox", { name: /^Cam ngọt/ });
    await userEvent.clear(cam);
    await userEvent.type(cam, "1,25");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/0,1/);
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
