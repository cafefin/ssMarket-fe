import { screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SalesSummary as Summary, SummaryRow } from "../api/use-orders";
import { QueryProvider } from "@/shared/api/query-provider";
import { SalesSummary } from "./sales-summary";

const { api, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));

const row = (overrides: Partial<SummaryRow>): SummaryRow => ({
  orderId: "o1",
  code: "SSMAAAAA2",
  buyer: { name: "Minh", email: "minh@example.com" },
  deliveryLocation: "Tầng 7",
  quantity: 1.5,
  totalAmount: 52500,
  paymentMethod: "pay_on_delivery",
  paymentStatus: "unpaid",
  fulfillmentStatus: "pending",
  note: null,
  createdAt: "2026-10-06T03:00:00.000Z",
  ...overrides,
});

const summary = (rows: SummaryRow[]): Summary => ({
  listing: {
    id: "l1",
    title: "Hoa quả tuần 41",
    unit: "kg",
    orderDeadline: "2026-10-09T10:00:00.000Z",
    deliveryDate: "2026-10-12",
  },
  rows,
  totals: {
    orderCount: rows.length,
    quantity: 5.5,
    totalAmount: 242500,
    paidAmount: 70000,
    outstandingAmount: 172500,
  },
});

const three = () => [
  row({}),
  row({
    orderId: "o2",
    code: "SSMBBBBB2",
    buyer: { name: "Lan", email: "lan@example.com" },
    deliveryLocation: "Tầng 3",
    quantity: 2,
    totalAmount: 70000,
    paymentStatus: "paid",
    note: "Giao sau 14h",
  }),
  row({
    orderId: "o3",
    code: "SSMCCCCC2",
    buyer: { name: "An", email: "an@example.com" },
    deliveryLocation: "Tầng 7",
    quantity: 2,
    totalAmount: 120000,
    paymentStatus: "reported",
    fulfillmentStatus: "delivered",
  }),
];

const ok = (data: unknown) => ({ data, response: new Response() });

function renderSummary(
  value: Summary | { status: number } = summary(three()),
  locale: "vi" | "en" = "vi",
) {
  api.GET.mockResolvedValue(
    "status" in value
      ? { error: { code: "X" }, response: new Response(null, { status: value.status }) }
      : ok(value),
  );
  renderWithIntl(
    <QueryProvider>
      <SalesSummary listingId="l1" />
    </QueryProvider>,
    { locale },
  );
}

const bodyRows = () =>
  within(screen.getAllByRole("rowgroup")[1])
    .getAllByRole("row")
    // Order rows are the ones with a selection checkbox; group headings have none.
    .filter((r) => within(r).queryByRole("checkbox") !== null);
const buyersShown = () =>
  bodyRows().map((r) => within(r).getByRole("rowheader").textContent);

describe("SalesSummary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.POST.mockResolvedValue(ok({ results: [] }));
  });

  it("shows the round, the four figures and a row per order", async () => {
    renderSummary();

    expect(
      await screen.findByRole("heading", { name: "Hoa quả tuần 41" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Chốt đơn .* · Giao ngày 12\/10\/2026/)).toBeInTheDocument();
    const figures = screen.getAllByRole("definition").map((d) => d.textContent);
    expect(figures).toEqual(["3", "242.500 đ", "70.000 đ", "172.500 đ"]);

    const minh = screen.getByRole("row", { name: /Minh/ });
    expect(within(minh).getByRole("link", { name: "SSMAAAAA2" })).toHaveAttribute(
      "href",
      "/orders/o1",
    );
    expect(minh).toHaveTextContent("Tầng 7");
    expect(minh).toHaveTextContent("1,5");
    expect(minh).toHaveTextContent("52.500 đ");
    expect(within(minh).getByText("Chưa thanh toán")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Lan/ })).toHaveTextContent("Giao sau 14h");
  });

  it("shows the figures and the table in English", async () => {
    renderSummary(summary(three()), "en");

    expect(
      await screen.findByRole("heading", { name: "Hoa quả tuần 41" }),
    ).toBeInTheDocument();
    const figures = screen.getAllByRole("definition").map((d) => d.textContent);
    expect(figures).toEqual(["3", "242,500 VND", "70,000 VND", "172,500 VND"]);
    expect(screen.getByText("Collected")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export CSV" })).toBeInTheDocument();
    expect(screen.getByText("Total of 3 orders")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Minh/ })).toHaveTextContent("1.5");
  });

  it("has a quantity column with the unit, and totals from the server", async () => {
    renderSummary();

    expect(
      await screen.findByRole("columnheader", { name: "Số lượng (kg)" }),
    ).toBeInTheDocument();
    const totals = screen.getByRole("row", { name: /Tổng 3 đơn/ });
    expect(totals).toHaveTextContent("5,5");
    expect(totals).toHaveTextContent("242.500 đ");
  });

  it("offers the CSV download", async () => {
    renderSummary();

    const link = await screen.findByRole("link", { name: "Xuất CSV" });
    expect(link).toHaveAttribute("href", "/api/listings/l1/summary.csv");
    expect(link).toHaveAttribute("download");
  });

  it("sorts by buyer and by delivery location", async () => {
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });
    expect(buyersShown()).toEqual(["MinhSSMAAAAA2", "LanSSMBBBBB2", "AnSSMCCCCC2"]);

    await userEvent.selectOptions(screen.getByLabelText("Sắp xếp"), "buyer");
    expect(buyersShown()).toEqual(["AnSSMCCCCC2", "LanSSMBBBBB2", "MinhSSMAAAAA2"]);

    await userEvent.selectOptions(screen.getByLabelText("Sắp xếp"), "location");
    expect(buyersShown()[0]).toBe("LanSSMBBBBB2");
  });

  it("filters to the orders that still need attention", async () => {
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });

    await userEvent.click(screen.getByRole("button", { name: "Chưa trả" }));
    expect(buyersShown()).toEqual(["MinhSSMAAAAA2"]);
    expect(screen.getByRole("button", { name: "Chưa trả" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Chờ xác nhận" }));
    expect(buyersShown()).toEqual(["AnSSMCCCCC2"]);

    await userEvent.click(screen.getByRole("button", { name: "Chưa giao" }));
    expect(buyersShown()).toEqual(["MinhSSMAAAAA2", "LanSSMBBBBB2"]);
  });

  it("groups by delivery location with a subtotal per group", async () => {
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });

    await userEvent.click(screen.getByRole("checkbox", { name: "Gom theo nơi giao" }));

    expect(
      screen.getByRole("row", { name: /Tầng 3 · 1 đơn · 70\.000 đ/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /Tầng 7 · 2 đơn · 172\.500 đ/ }),
    ).toBeInTheDocument();
    expect(buyersShown()).toEqual(["LanSSMBBBBB2", "MinhSSMAAAAA2", "AnSSMCCCCC2"]);
    expect(screen.getByLabelText("Sắp xếp")).toBeDisabled();
  });

  it("marks a whole group as delivered, skipping orders already delivered", async () => {
    api.POST.mockResolvedValue(
      ok({ results: [{ orderId: "o1", ok: true, code: null }] }),
    );
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });
    await userEvent.click(screen.getByRole("checkbox", { name: "Gom theo nơi giao" }));

    await userEvent.click(
      screen.getByRole("button", { name: "Đánh dấu đã giao cả nhóm Tầng 7" }),
    );

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã cập nhật 1 đơn"));
    expect(api.POST).toHaveBeenCalledWith("/listings/{listingId}/orders/bulk", {
      params: { path: { listingId: "l1" } },
      body: { action: "deliver", orderIds: ["o1"] },
    });
  });

  it("confirms payment for the selected orders and reports the ones that failed", async () => {
    api.POST.mockResolvedValue(
      ok({
        results: [
          { orderId: "o1", ok: true, code: null },
          { orderId: "o2", ok: false, code: "INVALID_ORDER_STATE" },
        ],
      }),
    );
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });

    await userEvent.click(screen.getByRole("checkbox", { name: "Chọn đơn SSMAAAAA2" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Chọn đơn SSMBBBBB2" }));
    expect(screen.getByText("Đã chọn 2 đơn")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận đã nhận tiền" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã cập nhật 1 đơn"));
    expect(api.POST).toHaveBeenCalledWith("/listings/{listingId}/orders/bulk", {
      params: { path: { listingId: "l1" } },
      body: { action: "confirm_payment", orderIds: ["o1", "o2"] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "SSMBBBBB2: đã ở trạng thái này hoặc đã hủy",
    );
    expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
  });

  it("selects every visible order at once, respecting the filter", async () => {
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });
    await userEvent.click(screen.getByRole("button", { name: "Chưa giao" }));

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Chọn tất cả đơn đang hiện" }),
    );
    expect(screen.getByText("Đã chọn 2 đơn")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Đánh dấu đã giao" }));

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        "/listings/{listingId}/orders/bulk",
        expect.objectContaining({
          body: { action: "deliver", orderIds: ["o1", "o2"] },
        }),
      ),
    );
  });

  it("says so when nobody has ordered yet", async () => {
    renderSummary(summary([]));

    expect(
      await screen.findByText("Chưa có ai đặt hàng ở bài này."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("hides the page from people who are not the seller", async () => {
    renderSummary({ status: 403 });

    expect(
      await screen.findByRole("heading", { name: "Không tìm thấy bài đăng" }),
    ).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    renderSummary({ status: 500 });

    expect(
      await screen.findByRole("heading", { name: "Không tải được bảng tổng hợp" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });
});
