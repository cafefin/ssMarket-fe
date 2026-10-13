import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { CampaignDetail } from "../api/use-campaigns";
import { campaignDetail, campaignItem } from "./campaign-fixtures";
import { CampaignPage } from "./campaign-page";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }));
vi.mock("@/shared/api/client", () => ({ api }));

const ok = (data: unknown) => ({ data, response: new Response() });
const failed = (status: number) => ({
  error: { code: status === 404 ? "NOT_FOUND" : "X" },
  response: new Response(null, { status }),
});

const ROUND = campaignDetail("c1", {
  title: "Đồ ăn sáng tuần 42",
  description: "Giao tại sảnh tầng 1.\nNhận trước 9 giờ.",
  seller: { id: "u1", name: "Chị Lan", handle: "lan", avatarUrl: null },
  acceptsPrepaidQr: true,
  acceptsPayOnDelivery: true,
  items: [
    campaignItem("a", {
      title: "Xôi gà",
      unit: "cái",
      unitPrice: 18000,
      combos: [{ quantity: "10", price: 160000 }],
    }),
    campaignItem("b", { title: "Cam sành", unit: "kg", unitPrice: 35000 }),
  ],
});

function serve({
  campaign = ROUND,
  me = { id: "me" },
  orderId = null,
}: {
  campaign?: CampaignDetail | Promise<never> | ReturnType<typeof failed>;
  me?: object;
  orderId?: string | null;
} = {}) {
  api.GET.mockImplementation((path: string) => {
    if (path === "/users/me") {
      return Promise.resolve(ok(me));
    }
    if (path === "/campaigns/{campaignId}/my-order") {
      return Promise.resolve(ok({ orderId }));
    }
    if (campaign instanceof Promise) {
      return campaign;
    }
    return Promise.resolve("response" in campaign ? campaign : ok(campaign));
  });
}

type Context = Parameters<
  NonNullable<React.ComponentProps<typeof CampaignPage>["renderBuy"]>
>[0];

function renderPage() {
  const seen: Context[] = [];
  renderWithIntl(
    <QueryProvider>
      <CampaignPage
        id="c1"
        renderBuy={(context) => {
          seen.push(context);
          return (
            <button type="button" onClick={context.clear}>
              buy bar
            </button>
          );
        }}
      />
    </QueryProvider>,
  );
  return { last: () => seen.at(-1), seen };
}

describe("CampaignPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the round's terms above its products", async () => {
    serve();
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Đồ ăn sáng tuần 42" }),
    ).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith("/campaigns/{id}", {
      params: { path: { id: "c1" } },
    });
    expect(screen.getByRole("link", { name: "Chị Lan" })).toHaveAttribute(
      "href",
      "/sellers/u1",
    );
    const terms = screen.getByRole("group", { name: "Điều kiện của đợt" });
    expect(within(terms).getByText("Chốt đơn")).toBeInTheDocument();
    expect(within(terms).getByText(/^\d{2}:\d{2} .+, 10\/10$/)).toBeInTheDocument();
    expect(within(terms).getByText(/^Còn \d+ ngày$/)).toBeInTheDocument();
    expect(within(terms).getByText("Ngày giao")).toBeInTheDocument();
    expect(within(terms).getByText("12/10/2099")).toBeInTheDocument();
    // The group is a wrapper: the list inside keeps its terms and definitions.
    expect(within(terms).getAllByRole("term")).toHaveLength(2);
    expect(within(terms).getAllByRole("definition").length).toBeGreaterThan(1);
    expect(terms.querySelector("dl")).not.toHaveAttribute("role");
    expect(
      screen.getByText("Chuyển khoản trước qua mã QR · Trả tiền khi nhận hàng"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Giao tại sảnh tầng 1\./)).toHaveClass(
      "whitespace-pre-line",
    );

    expect(screen.getByRole("textbox", { name: "Số lượng Xôi gà" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Số lượng Cam sành" })).toBeInTheDocument();
    expect(screen.queryByText("Đã chốt")).not.toBeInTheDocument();
  });

  it("names only the payment methods the seller takes", async () => {
    serve({ campaign: { ...ROUND, acceptsPrepaidQr: false, description: "" } });
    renderPage();

    expect(await screen.findByText("Trả tiền khi nhận hàng")).toBeInTheDocument();
    expect(screen.queryByText("Mô tả")).not.toBeInTheDocument();
  });

  it("hands the chosen lines, the total and whether they are valid to the buy bar", async () => {
    serve();
    const { last } = renderPage();

    await screen.findByRole("button", { name: "buy bar" });
    expect(last()).toMatchObject({
      campaign: { id: "c1" },
      lines: [],
      total: 0,
      valid: true,
    });
    expect(api.GET).toHaveBeenCalledWith("/campaigns/{campaignId}/my-order", {
      params: { path: { campaignId: "c1" } },
    });

    await userEvent.type(screen.getByRole("textbox", { name: "Số lượng Xôi gà" }), "10");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Số lượng Cam sành" }),
      "1,5",
    );
    expect(last()).toMatchObject({
      lines: [
        { listingId: "a", quantity: "10" },
        { listingId: "b", quantity: "1.5" },
      ],
      total: 212500,
      valid: true,
    });

    await userEvent.type(screen.getByRole("textbox", { name: "Số lượng Xôi gà" }), ",5");
    expect(last()).toMatchObject({
      lines: [{ listingId: "b", quantity: "1.5" }],
      total: 52500,
      valid: false,
    });
  });

  it("empties the selection when the buy bar asks", async () => {
    serve();
    const { last } = renderPage();

    // Quantities wait, disabled, until we know there is no order yet.
    expect(
      await screen.findByRole("textbox", { name: "Số lượng Xôi gà" }),
    ).toBeDisabled();
    await screen.findByRole("button", { name: "buy bar" });
    await userEvent.type(screen.getByRole("textbox", { name: "Số lượng Xôi gà" }), "3");
    expect(last()?.lines).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "buy bar" }));
    expect(last()?.lines).toEqual([]);
    expect(screen.getByRole("textbox", { name: "Số lượng Xôi gà" })).toHaveValue("");
  });

  it("keeps the buy bar clear of the phone tab bar", async () => {
    serve();
    renderPage();

    const bar = (await screen.findByRole("button", { name: "buy bar" })).parentElement;
    expect(bar).toHaveClass("sticky", "bottom-20", "md:bottom-4", "z-10");
  });

  it("points a buyer who already ordered to the order instead of the buy bar", async () => {
    serve({ orderId: "o7" });
    const { seen } = renderPage();

    expect(await screen.findByText("Bạn đã đặt đợt này")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sửa đơn" })).toHaveAttribute(
      "href",
      "/orders/o7?edit=1",
    );
    expect(screen.getByText("Xôi gà")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "buy bar" })).not.toBeInTheDocument();
    expect(seen).toEqual([]);
  });

  it("still lets people buy when their order could not be looked up", async () => {
    serve();
    api.GET.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/users/me"
          ? ok({ id: "me" })
          : path === "/campaigns/{id}"
            ? ok(ROUND)
            : failed(500),
      ),
    );
    renderPage();

    expect(await screen.findByRole("button", { name: "buy bar" })).toBeInTheDocument();
  });

  it("shows a round that no longer takes orders without quantities", async () => {
    serve({ campaign: { ...ROUND, isOpen: false, status: "closed" } });
    const { seen } = renderPage();

    expect(await screen.findByText("Đã chốt")).toBeInTheDocument();
    expect(screen.getByText("Xôi gà")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Còn /)).not.toBeInTheDocument();
    await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/users/me"));
    expect(seen).toEqual([]);
    expect(api.GET).not.toHaveBeenCalledWith(
      "/campaigns/{campaignId}/my-order",
      expect.anything(),
    );
  });

  it("gives the seller the way to edit and to the summary instead of buying", async () => {
    serve({
      me: { id: "u1" },
      campaign: {
        ...ROUND,
        items: [...ROUND.items, campaignItem("c", { title: "Chè", selling: false })],
      },
    });
    const { seen } = renderPage();

    expect(await screen.findByRole("link", { name: "Sửa đợt" })).toHaveAttribute(
      "href",
      "/campaigns/c1/edit",
    );
    expect(screen.getByRole("link", { name: "Tổng hợp" })).toHaveAttribute(
      "href",
      "/sell/campaigns/c1",
    );
    expect(screen.getByText("Chè").closest("li")).toHaveTextContent("Ngừng bán");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(seen).toEqual([]);
    expect(api.GET).not.toHaveBeenCalledWith(
      "/campaigns/{campaignId}/my-order",
      expect.anything(),
    );
  });

  it("tells the seller a draft is theirs alone, with no summary yet", async () => {
    serve({
      me: { id: "u1" },
      campaign: { ...ROUND, status: "draft", isOpen: false, publishedAt: null },
    });
    renderPage();

    expect(
      await screen.findByText("Đợt đang là bản nháp. Chỉ bạn nhìn thấy nó."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sửa đợt" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tổng hợp" })).not.toBeInTheDocument();
    expect(screen.queryByText("Đã chốt")).not.toBeInTheDocument();
  });

  it("offers the seller no edit link once the round is closed", async () => {
    serve({
      me: { id: "u1" },
      campaign: { ...ROUND, status: "closed", isOpen: false },
    });
    renderPage();

    expect(await screen.findByRole("link", { name: "Tổng hợp" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sửa đợt" })).not.toBeInTheDocument();
    expect(screen.getByText("Đã chốt")).toBeInTheDocument();
  });

  it("says so when a round has no products", async () => {
    serve({ campaign: { ...ROUND, items: [] } });
    renderPage();
    expect(await screen.findByText("Đợt này chưa có món nào.")).toBeInTheDocument();
  });

  it("shows a skeleton while loading", () => {
    serve({ campaign: new Promise<never>(() => undefined) });
    renderPage();
    expect(screen.getByLabelText("Đang tải đợt đặt trước")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("explains a round that does not exist", async () => {
    serve({ campaign: failed(404) });
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Không tìm thấy đợt đặt trước" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("offers to try again when loading fails", async () => {
    serve({ campaign: failed(500) });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tải được đợt đặt trước.",
    );
    serve();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(
      await screen.findByRole("heading", { name: "Đồ ăn sáng tuần 42" }),
    ).toBeInTheDocument();
  });
});
