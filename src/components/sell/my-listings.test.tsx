import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingDetail } from "@/lib/api/use-listings";
import { QueryProvider } from "@/lib/query/query-provider";
import { MyListings } from "./my-listings";

const { api, toast, location, router } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  location: { search: "" },
  router: { push: vi.fn() },
}));
vi.mock("@/lib/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(location.search),
}));

const listing = (overrides: Partial<ListingDetail> = {}): ListingDetail => ({
  id: "l1",
  title: "Loa bluetooth cũ",
  description: "",
  mode: "in_stock",
  status: "open",
  isOpen: true,
  category: { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics" },
  seller: { id: "me", name: "Tôi", avatarUrl: null },
  acceptsPrepaidQr: false,
  acceptsPayOnDelivery: true,
  orderDeadline: null,
  deliveryDate: null,
  publishedAt: "2026-10-05T03:00:00.000Z",
  orderCount: 0,
  reopenedFromId: null,
  items: [
    { id: "i1", name: "Loa", unit: "cái", unitPrice: 500000, stockQuantity: 1 },
    { id: "i2", name: "Dây sạc", unit: "cái", unitPrice: 20000, stockQuantity: 3 },
  ],
  images: [],
  ...overrides,
});

const ok = (data: unknown) => ({ data, response: new Response() });

function renderPage() {
  render(
    <QueryProvider>
      <MyListings />
    </QueryProvider>,
  );
}

const row = (title: string) => screen.findByRole("listitem", { name: title });

describe("MyListings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    location.search = "";
    api.GET.mockResolvedValue(ok([listing()]));
    api.POST.mockResolvedValue(ok(listing()));
  });

  it("opens on the open tab and asks the API for that status", async () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Đang mở" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await row("Loa bluetooth cũ");
    expect(api.GET).toHaveBeenCalledWith("/users/me/listings", {
      params: { query: { status: "open" } },
    });
  });

  it("follows the tab in the URL and ignores an unknown one", async () => {
    location.search = "tab=draft";
    api.GET.mockResolvedValue(ok([]));

    renderPage();

    expect(screen.getByRole("link", { name: "Nháp" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Đã đóng" })).toHaveAttribute(
      "href",
      "/sell?tab=closed",
    );
    expect(await screen.findByText("Bạn không có bản nháp nào.")).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith("/users/me/listings", {
      params: { query: { status: "draft" } },
    });
  });

  it("summarises an open listing and offers view, edit and close", async () => {
    renderPage();

    const item = await row("Loa bluetooth cũ");
    expect(item).toHaveTextContent("2 mặt hàng · từ 20.000 đ/cái · Đăng lúc");
    expect(within(item).getByText("Có sẵn")).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Xem" })).toHaveAttribute(
      "href",
      "/listings/l1",
    );
    expect(within(item).getByRole("link", { name: "Sửa" })).toHaveAttribute(
      "href",
      "/listings/l1/edit",
    );
    expect(within(item).getByRole("button", { name: "Đóng bài" })).toBeInTheDocument();
    expect(
      within(item).queryByRole("button", { name: "Đăng bán" }),
    ).not.toBeInTheDocument();
  });

  it("flags an open pre-order whose deadline has passed", async () => {
    api.GET.mockResolvedValue(
      ok([
        listing({
          mode: "preorder",
          isOpen: false,
          orderDeadline: "2026-10-01T10:00:00.000Z",
        }),
      ]),
    );

    renderPage();

    const item = await row("Loa bluetooth cũ");
    expect(item).toHaveTextContent("Chốt đơn");
    expect(item).toHaveTextContent(
      "Đã quá hạn chốt. Người mua không còn nhìn thấy bài này.",
    );
  });

  it("publishes a draft from the list", async () => {
    location.search = "tab=draft";
    api.GET.mockResolvedValue(
      ok([listing({ status: "draft", isOpen: false, publishedAt: null })]),
    );
    renderPage();
    const item = await row("Loa bluetooth cũ");

    await userEvent.click(within(item).getByRole("button", { name: "Đăng bán" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã đăng bán"));
    expect(api.POST).toHaveBeenCalledWith("/listings/{id}/publish", {
      params: { path: { id: "l1" } },
    });
  });

  it("offers only viewing for a closed listing", async () => {
    location.search = "tab=closed";
    api.GET.mockResolvedValue(ok([listing({ status: "closed", isOpen: false })]));

    renderPage();

    const item = await row("Loa bluetooth cũ");
    expect(within(item).getByRole("link", { name: "Xem" })).toBeInTheDocument();
    expect(within(item).queryByRole("link", { name: "Sửa" })).not.toBeInTheDocument();
    expect(within(item).queryByRole("button")).not.toBeInTheDocument();
  });

  it("reopens a finished pre-order round and goes to the new draft", async () => {
    location.search = "tab=closed";
    api.GET.mockResolvedValue(
      ok([listing({ mode: "preorder", status: "closed", isOpen: false })]),
    );
    api.POST.mockResolvedValue(ok(listing({ id: "l2", status: "draft" })));
    renderPage();
    const item = await row("Loa bluetooth cũ");

    await userEvent.click(within(item).getByRole("button", { name: "Mở lại" }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/listings/l2/edit?reopened=1"),
    );
    expect(api.POST).toHaveBeenCalledWith("/listings/{id}/reopen", {
      params: { path: { id: "l1" } },
    });
  });

  it("offers reopening for an expired pre-order that was never closed", async () => {
    api.GET.mockResolvedValue(
      ok([
        listing({
          mode: "preorder",
          isOpen: false,
          orderDeadline: "2026-10-01T10:00:00.000Z",
        }),
      ]),
    );
    renderPage();

    const item = await row("Loa bluetooth cũ");
    expect(within(item).getByRole("button", { name: "Mở lại" })).toBeInTheDocument();
  });

  it("links each published listing to its order summary", async () => {
    renderPage();

    const item = await row("Loa bluetooth cũ");
    expect(within(item).getByRole("link", { name: "Tổng hợp" })).toHaveAttribute(
      "href",
      "/sell/listings/l1",
    );
  });

  it("closes a listing only after confirmation", async () => {
    renderPage();
    const item = await row("Loa bluetooth cũ");

    await userEvent.click(within(item).getByRole("button", { name: "Đóng bài" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Đóng bài đăng?");
    expect(dialog).toHaveTextContent("“Loa bluetooth cũ”");
    expect(api.POST).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Đóng bài" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Đã đóng bài đăng"),
    );
    expect(api.POST).toHaveBeenCalledWith("/listings/{id}/close", {
      params: { path: { id: "l1" } },
    });
  });

  it("does nothing when the confirmation is declined", async () => {
    renderPage();
    const item = await row("Loa bluetooth cũ");

    await userEvent.click(within(item).getByRole("button", { name: "Đóng bài" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Không",
      }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(api.POST).not.toHaveBeenCalled();
  });

  it("shows a translated message when an action fails", async () => {
    location.search = "tab=draft";
    api.GET.mockResolvedValue(ok([listing({ status: "draft", isOpen: false })]));
    api.POST.mockResolvedValue({
      error: { code: "BANK_PROFILE_REQUIRED", message: "Add bank" },
      response: new Response(null, { status: 422 }),
    });
    renderPage();
    const item = await row("Loa bluetooth cũ");

    await userEvent.click(within(item).getByRole("button", { name: "Đăng bán" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Bạn cần thêm thông tin ngân hàng trước khi nhận thanh toán qua QR.",
      ),
    );
  });

  it("offers a retry when the list cannot be loaded", async () => {
    api.GET.mockResolvedValueOnce({
      error: { code: "INTERNAL_SERVER_ERROR" },
      response: new Response(null, { status: 500 }),
    });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tải được bài đăng của bạn.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await row("Loa bluetooth cũ")).toBeInTheDocument();
  });
});
