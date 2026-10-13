import { screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CampaignSummaryRow,
  CampaignSummaryTable as Summary,
} from "../api/use-orders";
import { QueryProvider } from "@/shared/api/query-provider";
import { CampaignSummary } from "./campaign-summary";

const { api, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));

const row = (overrides: Partial<CampaignSummaryRow>): CampaignSummaryRow => ({
  orderId: "o1",
  code: "SSMAAAAA2",
  buyer: { name: "Minh", email: "minh@example.com" },
  deliveryLocation: "Tầng 7",
  quantities: [1.5, 0],
  totalAmount: 52500,
  paymentMethod: "pay_on_delivery",
  paymentStatus: "unpaid",
  fulfillmentStatus: "pending",
  note: null,
  createdAt: "2026-10-06T03:00:00.000Z",
  ...overrides,
});

const summary = (rows: CampaignSummaryRow[]): Summary => ({
  campaign: {
    id: "c1",
    title: "Hoa quả tuần 41",
    orderDeadline: "2099-10-09T10:00:00.000Z",
    deliveryDate: "2099-10-12",
  },
  items: [
    { listingId: "l1", title: "Cam ngọt", unit: "kg" },
    { listingId: "l2", title: "Xoài cát", unit: "hộp" },
  ],
  rows,
  itemTotals: [5.5, 3],
  totals: {
    orderCount: rows.length,
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
    quantities: [2, 1],
    totalAmount: 110000,
    paymentStatus: "paid",
    note: "Giao sau 14h",
  }),
  row({
    orderId: "o3",
    code: "SSMCCCCC2",
    buyer: { name: "An", email: "an@example.com" },
    deliveryLocation: "Tầng 7",
    quantities: [2, 2],
    totalAmount: 80000,
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
      <CampaignSummary campaignId="c1" />
    </QueryProvider>,
    { locale },
  );
}

const bodyRows = () =>
  within(screen.getAllByRole("rowgroup")[1])
    .getAllByRole("row")
    .filter((r) => within(r).queryByRole("checkbox") !== null);
const buyersShown = () =>
  bodyRows().map((r) => within(r).getByRole("rowheader").textContent);

describe("CampaignSummary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.POST.mockResolvedValue(ok({ results: [] }));
  });

  it("names the round with its deadline and delivery date", async () => {
    renderSummary();

    expect(
      await screen.findByRole("heading", { name: "Hoa quả tuần 41" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Chốt đơn/)).toBeInTheDocument();
    expect(screen.getByText(/Giao ngày 12\/10\/2099/)).toBeInTheDocument();
  });

  it("shows the four figures from the server", async () => {
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });

    const figures = screen.getAllByRole("definition").map((d) => d.textContent);
    expect(figures).toEqual(["3", "242.500 đ", "70.000 đ", "172.500 đ"]);
  });

  it("has a column per product, headed with its unit", async () => {
    renderSummary();

    expect(
      await screen.findByRole("columnheader", { name: "Cam ngọt (kg)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Xoài cát (hộp)" })).toBeInTheDocument();
  });

  it("shows the quantities per order, an empty cell for 0, and the status", async () => {
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });

    const minh = screen.getByRole("row", { name: /Minh/ });
    const cells = within(minh).getAllByRole("cell");
    // checkbox, place, Cam, Xoài, total, status
    expect(cells[1]).toHaveTextContent("Tầng 7");
    expect(cells[2]).toHaveTextContent("1,5");
    expect(cells[3]).toBeEmptyDOMElement();
    expect(within(minh).getByRole("link", { name: "SSMAAAAA2" })).toHaveAttribute(
      "href",
      "/orders/o1",
    );
    expect(minh).toHaveTextContent("52.500 đ");
    expect(within(minh).getByText("Chưa thanh toán")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Lan/ })).toHaveTextContent("Giao sau 14h");
  });

  it("ends with the total of each product and of the orders", async () => {
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });

    const totals = screen.getByRole("row", { name: /Tổng 3 đơn/ });
    const cells = within(totals).getAllByRole("cell");
    expect(cells.map((c) => c.textContent)).toEqual(["", "5,5", "3", "242.500 đ", ""]);
  });

  it("shows the table in English", async () => {
    renderSummary(summary(three()), "en");

    expect(await screen.findByRole("link", { name: "Export CSV" })).toBeInTheDocument();
    expect(screen.getByText("Total of 3 orders")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cam ngọt (kg)" })).toBeInTheDocument();
  });

  it("scrolls sideways inside its own container, with the buyer column fixed", async () => {
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });

    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
    expect(screen.getByRole("rowheader", { name: /Minh/ })).toHaveClass(
      "sticky",
      "left-0",
      "bg-background",
    );
  });

  it("offers the CSV download", async () => {
    renderSummary();

    const link = await screen.findByRole("link", { name: "Xuất CSV" });
    expect(link).toHaveAttribute("href", "/api/campaigns/c1/summary.csv");
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
      screen.getByRole("row", { name: /Tầng 7 · 2 đơn · 132\.500 đ/ }),
    ).toBeInTheDocument();
    expect(buyersShown()).toEqual(["LanSSMBBBBB2", "MinhSSMAAAAA2", "AnSSMCCCCC2"]);
  });

  it("marks a whole group as delivered through the round's bulk route", async () => {
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
    expect(api.POST).toHaveBeenCalledWith("/campaigns/{campaignId}/orders/bulk", {
      params: { path: { campaignId: "c1" } },
      body: { action: "deliver", orderIds: ["o1"] },
    });
  });

  it("selects every visible order, confirms payment and reports which failed", async () => {
    api.POST.mockResolvedValue(
      ok({
        results: [
          { orderId: "o1", ok: true, code: null },
          { orderId: "o2", ok: false, code: "INVALID_ORDER_STATE" },
          { orderId: "o3", ok: false, code: "NOT_IN_CAMPAIGN" },
        ],
      }),
    );
    renderSummary();
    await screen.findByRole("row", { name: /Minh/ });

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Chọn tất cả đơn đang hiện" }),
    );
    expect(screen.getByText("Đã chọn 3 đơn")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận đã nhận tiền" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã cập nhật 1 đơn"));
    expect(api.POST).toHaveBeenCalledWith("/campaigns/{campaignId}/orders/bulk", {
      params: { path: { campaignId: "c1" } },
      body: { action: "confirm_payment", orderIds: ["o1", "o2", "o3"] },
    });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("SSMBBBBB2: đã ở trạng thái này hoặc đã hủy");
    expect(alert).toHaveTextContent("SSMCCCCC2: không thuộc đợt này");
    expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
  });

  it("says so when nobody has ordered yet", async () => {
    renderSummary(summary([]));

    expect(
      await screen.findByText("Chưa có ai đặt hàng ở đợt này."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it.each([403, 404])("shows 'not found' for a %i", async (status) => {
    renderSummary({ status });

    expect(
      await screen.findByRole("heading", { name: "Không tìm thấy đợt" }),
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
