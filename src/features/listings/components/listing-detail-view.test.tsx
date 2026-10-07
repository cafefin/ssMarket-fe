import type { ComponentProps } from "react";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingDetail } from "../api/use-listings";
import { QueryProvider } from "@/shared/api/query-provider";
import { ListingDetailView } from "./listing-detail-view";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }));
vi.mock("@/shared/api/client", () => ({ api }));

const SELLER = { id: "seller-1", name: "Chị Lan", avatarUrl: null };

const listing = (overrides: Partial<ListingDetail> = {}): ListingDetail => ({
  id: "l1",
  title: "Loa bluetooth cũ",
  description: "Còn mới 90%\nFull hộp",
  mode: "in_stock",
  status: "open",
  isOpen: true,
  category: { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics", isPerishable: false },
  seller: SELLER,
  acceptsPrepaidQr: true,
  acceptsPayOnDelivery: true,
  orderDeadline: null,
  deliveryDate: null,
  publishedAt: "2026-10-05T03:00:00.000Z",
  orderCount: 0,
  reopenedFromId: null,
  condition: null,
  conditionPercent: null,
  items: [
    { id: "i1", name: "Loa JBL Go 3", unit: "cái", unitPrice: 500000, stockQuantity: 2, combos: [] },
    { id: "i2", name: "Dây sạc", unit: "cái", unitPrice: 20000, stockQuantity: 0, combos: [] },
  ],
  images: [],
  ...overrides,
});

function serve(detail: ListingDetail | { status: number }, viewerId = "buyer-1") {
  api.GET.mockImplementation((path: string) => {
    if (path === "/users/me") {
      return Promise.resolve({
        data: { id: viewerId, name: "Người xem" },
        response: new Response(),
      });
    }
    if ("status" in detail && typeof detail.status === "number") {
      return Promise.resolve({
        error: { code: "X" },
        response: new Response(null, { status: detail.status }),
      });
    }
    return Promise.resolve({ data: detail, response: new Response() });
  });
}

function renderView(
  props: Partial<ComponentProps<typeof ListingDetailView>> = {},
  locale: "vi" | "en" = "vi",
) {
  renderWithIntl(
    <QueryProvider>
      <ListingDetailView id="l1" {...props} />
    </QueryProvider>,
    { locale },
  );
}

describe("ListingDetailView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("links to the seller's page", async () => {
    serve(listing());

    renderView();

    expect(
      await screen.findByRole("link", { name: "Xem trang người bán" }),
    ).toHaveAttribute("href", "/sellers/seller-1");
  });

  it("shows a loading state first", () => {
    api.GET.mockReturnValue(new Promise(() => undefined));

    renderView();

    expect(screen.getByLabelText("Đang tải bài đăng")).toBeInTheDocument();
  });

  it("shows an in-stock listing with prices, stock and payment methods", async () => {
    serve(listing());

    renderView();

    expect(
      await screen.findByRole("heading", { name: "Loa bluetooth cũ" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Có sẵn")).toBeInTheDocument();
    expect(screen.getByText("Điện tử")).toBeInTheDocument();
    expect(screen.getByText("Chị Lan")).toBeInTheDocument();

    const loa = screen.getByRole("row", { name: /Loa JBL Go 3/ });
    expect(within(loa).getByText("500.000 đ/cái")).toHaveClass("font-heading");
    expect(within(loa).getByText("2 cái")).toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Dây sạc/ })).getByText("Hết hàng"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Chuyển khoản trước qua mã QR · Trả tiền khi nhận hàng"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Còn mới 90%/)).toHaveClass("whitespace-pre-line");
    expect(screen.getByTestId("image-placeholder")).toBeInTheDocument();
    expect(screen.queryByText("Chốt đơn")).not.toBeInTheDocument();
  });

  it("shows the condition and each option's combos", async () => {
    serve(
      listing({
        condition: "good",
        conditionPercent: 90,
        items: [
          {
            id: "i1",
            name: "Bút bi",
            unit: "cái",
            unitPrice: 10000,
            stockQuantity: 500,
            combos: [{ quantity: "100", price: 900000 }],
          },
        ],
      }),
    );

    renderView();

    expect(await screen.findByText("Tốt 90%")).toBeInTheDocument();
    expect(screen.getByText("100 cái: 900.000 đ")).toBeInTheDocument();
  });

  it("shows the listing in English, with the English category name", async () => {
    serve(listing());

    renderView({}, "en");

    expect(
      await screen.findByRole("heading", { name: "Loa bluetooth cũ" }),
    ).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    const loa = screen.getByRole("row", { name: /Loa JBL Go 3/ });
    expect(within(loa).getByText("500,000 VND/cái")).toBeInTheDocument();
    expect(
      screen.getByText("Bank transfer in advance by QR code · Pay on delivery"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View seller page" })).toBeInTheDocument();
  });

  it("shows a pre-order with its deadline and delivery date and no stock column", async () => {
    serve(
      listing({
        mode: "preorder",
        acceptsPrepaidQr: false,
        orderDeadline: "2026-10-09T10:00:00.000Z",
        deliveryDate: "2026-10-12",
        items: [
          { id: "i1", name: "Cam sành", unit: "kg", unitPrice: 35000, stockQuantity: null, combos: [] },
        ],
      }),
    );

    renderView();

    expect(await screen.findByText("Đặt trước")).toBeInTheDocument();
    expect(screen.getByText("Chốt đơn")).toBeInTheDocument();
    expect(screen.getByText("12/10/2026")).toBeInTheDocument();
    expect(screen.getByText("35.000 đ/kg")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Còn lại" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Trả tiền khi nhận hàng")).toBeInTheDocument();
  });

  it("puts the closing time of a pre-order on an orange band", async () => {
    serve(
      listing({
        mode: "preorder",
        orderDeadline: "2026-10-09T10:00:00.000Z",
        deliveryDate: "2026-10-12",
      }),
    );

    renderView();

    const label = await screen.findByText("Chốt đơn");
    expect(label.closest("dl")).toHaveClass("bg-deadline-soft");
    expect(label.closest("dl")).toHaveClass("grid-cols-1");
    // Weekday and date, or "hôm nay" if the suite runs on that day.
    expect(label.nextElementSibling).toHaveTextContent(
      /^\d{2}:\d{2} (hôm nay|.+, \d{1,2}\/10)$/,
    );
    expect(label.nextElementSibling).toHaveClass("text-deadline-deep");
  });

  it("shows how many people have ordered a pre-order", async () => {
    serve(
      listing({
        mode: "preorder",
        orderDeadline: "2026-10-09T10:00:00.000Z",
        deliveryDate: "2026-10-12",
        orderCount: 12,
      }),
    );

    renderView();

    const count = await screen.findByText("12 người đã đặt");
    // Spanning two columns below 560px would force a second column into the
    // single-column band.
    expect(count.closest("div")).toHaveClass("min-[560px]:col-span-2");
    expect(count.closest("div")).not.toHaveClass("col-span-2");
  });

  it("lets the viewer switch between photos", async () => {
    serve(
      listing({
        images: [
          { id: "a", url: "/api/media/a.webp", thumbnailUrl: "/api/media/a_thumb.webp" },
          { id: "b", url: "/api/media/b.webp", thumbnailUrl: "/api/media/b_thumb.webp" },
        ],
      }),
    );

    renderView();

    const main = await screen.findByAltText("Ảnh 1 của Loa bluetooth cũ");
    expect(main).toHaveAttribute("src", "/api/media/a.webp");

    await userEvent.click(screen.getByRole("button", { name: "Xem ảnh 2" }));

    expect(screen.getByAltText("Ảnh 2 của Loa bluetooth cũ")).toHaveAttribute(
      "src",
      "/api/media/b.webp",
    );
    expect(screen.getByRole("button", { name: "Xem ảnh 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("offers ordering, not editing, to other people", async () => {
    serve(listing());

    renderView({
      renderOrderPanel: (l) => <div data-testid="order-panel">{l.id}</div>,
    });

    expect(await screen.findByTestId("order-panel")).toHaveTextContent("l1");
    expect(
      screen.queryByRole("link", { name: "Sửa bài đăng" }),
    ).not.toBeInTheDocument();
  });

  it("asks for the order panel only for a signed-in buyer of an open listing", async () => {
    serve(listing());
    const renderOrderPanel = vi.fn(() => <div data-testid="order-panel" />);

    renderView({ renderOrderPanel });

    expect(await screen.findByTestId("order-panel")).toBeInTheDocument();
    expect(renderOrderPanel).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(String) }),
    );
  });

  it.each([
    ["the seller", { isOpen: true }, SELLER.id],
    ["a closed listing", { isOpen: false, status: "closed" as const }, "buyer-1"],
  ])("never asks for the order panel for %s", async (_name, overrides, viewer) => {
    serve(listing(overrides), viewer);
    const renderOrderPanel = vi.fn(() => <div data-testid="order-panel" />);

    renderView({ renderOrderPanel });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByTestId("order-panel")).not.toBeInTheDocument();
    expect(renderOrderPanel).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: "draft", isOpen: false } as const, "Bài đăng đang là bản nháp. Chỉ bạn nhìn thấy nó."],
    [
      { status: "open", isOpen: false } as const,
      "Đã quá hạn chốt đơn. Người khác không còn nhìn thấy bài đăng này.",
    ],
  ])("tells the seller about %j and offers editing", async (state, note) => {
    serve(listing(state), SELLER.id);

    renderView();

    expect(await screen.findByText(note)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sửa bài đăng" })).toHaveAttribute(
      "href",
      "/listings/l1/edit",
    );
  });

  it("tells the seller a closed listing is hidden and cannot be edited", async () => {
    serve(listing({ status: "closed", isOpen: false }), SELLER.id);

    renderView();

    expect(
      await screen.findByText("Bài đăng đã đóng. Chỉ bạn nhìn thấy nó."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sửa bài đăng" }),
    ).not.toBeInTheDocument();
  });

  it("shows no note to the seller of a normal open listing", async () => {
    serve(listing(), SELLER.id);

    renderView({
      renderOrderPanel: (l) => <div data-testid="order-panel">{l.id}</div>,
    });

    await screen.findByRole("link", { name: "Sửa bài đăng" });
    expect(
      screen.getByRole("link", { name: "Bảng tổng hợp đơn hàng" }),
    ).toHaveAttribute("href", "/sell/listings/l1");
    expect(screen.queryByTestId("order-panel")).not.toBeInTheDocument();
    expect(screen.queryByText(/Chỉ bạn nhìn thấy/)).not.toBeInTheDocument();
  });

  it("explains a listing that cannot be seen", async () => {
    serve({ status: 404 });

    renderView();

    expect(
      await screen.findByRole("heading", { name: "Không tìm thấy bài đăng" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("offers a retry for other failures", async () => {
    serve({ status: 500 });

    renderView();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tải được bài đăng.",
    );
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });
});
