import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
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

const item = (id: string, title: string, unit: string, unitPrice: number, extra = {}) => ({
  id,
  title,
  description: "",
  unit,
  unitPrice,
  combos: [],
  images: [],
  selling: true,
  orderCount: 0,
  removable: false,
  ...extra,
});

/**
 * The round as a buyer gets it today: Cam costs more than when it was
 * ordered, and a product the seller stopped selling is not in it at all
 * (the backend's CampaignDetailDto.from keeps only open products for anyone
 * but the seller).
 */
const campaignDetail = (items: unknown[]) => ({
  ...ROUND,
  description: "",
  status: "open",
  isOpen: true,
  items,
});
const ITEMS = [
  item("l1", "Cam ngọt", "kg", 38000),
  item("l2", "Xoài cát", "hộp", 40000, { combos: [{ quantity: "3", price: 100000 }] }),
  item("l3", "Bưởi da xanh", "quả", 70000),
];
/** Ordered while it was on sale; the seller stopped selling it since. */
const OI = {
  listingId: "l4",
  title: "Ổi",
  unit: "kg",
  unitPrice: 20000,
  quantity: 2,
  lineTotal: 35000,
  listTotal: 40000,
  combos: [{ quantity: "2", price: 35000 }],
};

function renderOrder(value: Order = order(), items: unknown[] = ITEMS) {
  api.GET.mockImplementation((path: string) =>
    Promise.resolve(
      ok(
        path === "/orders/{id}"
          ? value
          : path === "/campaigns/{id}"
            ? campaignDetail(items)
            : {},
      ),
    ),
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

  it("shows nothing about editing without a round, whose products it needs", () => {
    expect(editBlockedReason(order({ campaign: null }), now)).toBe("hidden");
  });
});

const TWO = () => order({ listingCount: 2, lines: [CAM, XOAI], totalAmount: 132500 });
const field = (title: string) =>
  screen.findByRole("textbox", { name: `Số lượng ${title}` });
const total = () => screen.getByRole("status", { name: "Tổng tiền mới" });
const save = () => userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
const row = (title: string) =>
  within(screen.getByRole("form", { name: "Sửa đơn" })).getByText(title).closest("li")!;

describe("editing an order", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.PATCH.mockResolvedValue(ok(order({ totalAmount: 130000 })));
  });

  it("lists every product of the round with the ordered quantities and 0 for the rest", async () => {
    renderOrder(TWO());
    await openEditor();

    expect(await field("Cam ngọt")).toHaveValue("1,5");
    expect(await field("Xoài cát")).toHaveValue("2");
    expect(await field("Bưởi da xanh")).toHaveValue("");
    expect(total()).toHaveTextContent("132.500 đ");
    expect(screen.getByLabelText("Giao đến")).toHaveValue("Tầng 7");
  });

  it("shows the ordered price of an ordered product and the current one of the others", async () => {
    renderOrder();
    await openEditor();
    await field("Cam ngọt");

    // Ordered at 35.000; the round says 38.000 now.
    expect(row("Cam ngọt")).toHaveTextContent("35.000 đ/kg");
    expect(row("Cam ngọt")).not.toHaveTextContent("38.000");
    expect(row("Bưởi da xanh")).toHaveTextContent("70.000 đ/quả");
  });

  it("follows the selection in the new total, combos included", async () => {
    renderOrder(TWO());
    await openEditor();
    const xoai = await field("Xoài cát");

    await userEvent.clear(xoai);
    await userEvent.type(xoai, "4");
    // 1,5 kg x 35.000 + one combo of 3 (100.000) + 1 x 40.000.
    expect(total()).toHaveTextContent("192.500 đ");

    await userEvent.type(await field("Bưởi da xanh"), "1");
    expect(total()).toHaveTextContent("262.500 đ");
  });

  it("adds a product to the order and sends the chosen products only", async () => {
    renderOrder();
    await openEditor();
    await userEvent.type(await field("Bưởi da xanh"), "2");
    await save();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã cập nhật đơn"));
    expect(api.PATCH).toHaveBeenCalledWith("/orders/{id}", {
      params: { path: { id: "o1" } },
      body: {
        lines: [
          { listingId: "l1", quantity: "1.5" },
          { listingId: "l3", quantity: "2" },
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

  it("sends the place and the note as edited", async () => {
    renderOrder();
    await openEditor();
    await field("Cam ngọt");
    await userEvent.clear(screen.getByLabelText("Giao đến"));
    await userEvent.type(screen.getByLabelText("Giao đến"), "Tầng 9");
    await userEvent.type(screen.getByLabelText(/^Ghi chú/), "Sau 14h");
    await save();

    await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(1));
    expect(api.PATCH.mock.calls[0][1].body).toMatchObject({
      deliveryLocation: "Tầng 9",
      note: "Sau 14h",
    });
  });

  it.each(["0", ""])("leaves out a product set to %j", async (text) => {
    renderOrder(TWO());
    await openEditor();
    const cam = await field("Cam ngọt");

    await userEvent.clear(cam);
    if (text) {
      await userEvent.type(cam, text);
    }
    expect(total()).toHaveTextContent("80.000 đ");
    await save();

    await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(1));
    expect(api.PATCH.mock.calls[0][1].body.lines).toEqual([
      { listingId: "l2", quantity: "2" },
    ]);
  });

  it("keeps at least one product", async () => {
    renderOrder(TWO());
    await openEditor();
    await userEvent.clear(await field("Cam ngọt"));
    await userEvent.clear(await field("Xoài cát"));
    await userEvent.type(await field("Xoài cát"), "0");
    await save();

    expect(await screen.findByText("Chọn ít nhất một món")).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it("points at the product whose quantity is wrong and saves nothing", async () => {
    renderOrder(TWO());
    await openEditor();
    const xoai = await field("Xoài cát");

    await userEvent.clear(xoai);
    await userEvent.type(xoai, "1,5");
    await save();

    expect(await screen.findByRole("alert")).toHaveTextContent(/số nguyên/i);
    expect(total()).toHaveTextContent("0 đ");
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  describe("a product the seller stopped selling", () => {
    const WITH_STOPPED = () =>
      order({ listingCount: 2, lines: [OI, CAM], totalAmount: 87500 });

    it("is still listed, after the round's products, with its ordered price and quantity", async () => {
      renderOrder(WITH_STOPPED());
      await openEditor();

      expect(await field("Ổi")).toHaveValue("2");
      expect(row("Ổi")).toHaveTextContent("20.000 đ/kg");
      expect(row("Ổi")).toHaveTextContent("Ngừng bán");
      expect(row("Ổi")).toHaveTextContent("2 kg: 35.000 đ");
      expect(total()).toHaveTextContent("87.500 đ");
      const titles = within(screen.getByRole("form", { name: "Sửa đơn" }))
        .getAllByRole("listitem")
        .map((li) => li.querySelector("p")?.textContent);
      expect(titles).toEqual(["Cam ngọt", "Xoài cát", "Bưởi da xanh", "Ổi"]);
    });

    it("stays in the order when another product changes", async () => {
      renderOrder(WITH_STOPPED());
      await openEditor();
      await userEvent.type(await field("Bưởi da xanh"), "1");
      await save();

      await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(1));
      expect(api.PATCH.mock.calls[0][1].body.lines).toEqual([
        { listingId: "l1", quantity: "1.5" },
        { listingId: "l3", quantity: "1" },
        { listingId: "l4", quantity: "2" },
      ]);
    });

    it("cannot be raised above what was ordered", async () => {
      renderOrder(WITH_STOPPED());
      await openEditor();
      const oi = await field("Ổi");

      expect(
        within(row("Ổi")).getByRole("button", { name: "Tăng số lượng" }),
      ).toBeDisabled();
      await userEvent.clear(oi);
      await userEvent.type(oi, "3");
      await save();

      expect(await screen.findByRole("alert")).toHaveTextContent("Tối đa 2 kg");
      expect(api.PATCH).not.toHaveBeenCalled();
    });

    it("may be lowered", async () => {
      renderOrder(WITH_STOPPED());
      await openEditor();
      const oi = await field("Ổi");

      await userEvent.clear(oi);
      await userEvent.type(oi, "1");
      await save();

      await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(1));
      expect(api.PATCH.mock.calls[0][1].body.lines).toEqual([
        { listingId: "l1", quantity: "1.5" },
        { listingId: "l4", quantity: "1" },
      ]);
    });

    it("lets an order that holds nothing else save a new note", async () => {
      renderOrder(order({ lines: [OI], totalAmount: 35000 }));
      await openEditor();
      await field("Ổi");
      await userEvent.type(screen.getByLabelText(/^Ghi chú/), "Sau 14h");
      await save();

      await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(1));
      expect(screen.queryByText("Chọn ít nhất một món")).not.toBeInTheDocument();
      expect(api.PATCH.mock.calls[0][1].body).toMatchObject({
        lines: [{ listingId: "l4", quantity: "2" }],
        note: "Sau 14h",
      });
    });

    it("is not offered to someone who did not order it", async () => {
      renderOrder();
      await openEditor();
      await field("Cam ngọt");

      expect(screen.queryByText("Ổi")).not.toBeInTheDocument();
    });
  });

  it("blocks saving without a delivery place", async () => {
    renderOrder();
    await openEditor();
    await field("Cam ngọt");

    await userEvent.clear(screen.getByLabelText("Giao đến"));
    await save();

    expect(await screen.findByRole("alert")).toHaveTextContent("Nhập nơi nhận hàng");
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it("refreshes the round after saving", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const value = order();
    api.GET.mockImplementation((path: string) =>
      Promise.resolve(ok(path === "/orders/{id}" ? value : campaignDetail(ITEMS))),
    );
    api.PATCH.mockResolvedValue(ok(value));
    renderWithIntl(
      <QueryClientProvider client={client}>
        <OrderView id="o1" />
      </QueryClientProvider>,
    );
    await openEditor();
    await field("Cam ngọt");

    await save();

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["campaign", "c1"] }),
    );
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toContainEqual(["orders"]);
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
    await field("Cam ngọt");

    await save();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Đơn này không còn sửa được. Trang đã được cập nhật, hãy xem lại.",
      ),
    );
  });

  it("says so when the round cannot be loaded", async () => {
    api.GET.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/orders/{id}"
          ? ok(order())
          : { error: { code: "X" }, response: new Response(null, { status: 500 }) },
      ),
    );
    renderWithIntl(
      <QueryProvider>
        <OrderView id="o1" />
      </QueryProvider>,
    );
    await openEditor();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tải được đợt đặt trước để sửa đơn",
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
