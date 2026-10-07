import { screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { ListingBrowser } from "./listing-browser";

const { api, location } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  location: { search: "" },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(location.search),
}));
vi.mock("./closing-soon-shelf", () => ({
  ClosingSoonShelf: () => <div data-testid="closing-soon-shelf" />,
}));

const categories = [
  { id: 2, slug: "thuc-pham-tuoi", name: "Thực phẩm tươi", nameEn: "Fresh food", isPerishable: true },
  { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics", isPerishable: false },
];

const summary = (id: string, title: string) => ({
  id,
  title,
  mode: "in_stock",
  category: categories[1],
  seller: { id: "u1", name: "An", avatarUrl: null },
  thumbnailUrl: null,
  minUnitPrice: 100000,
  minPriceUnit: "cái",
  orderDeadline: null,
  deliveryDate: null,
  publishedAt: "2026-10-05T03:00:00.000Z",
  orderCount: 0,
});

type Page = { items: ReturnType<typeof summary>[]; nextCursor: string | null };
const ok = (data: unknown) => ({ data, response: new Response() });

/** Routes api.GET by path; `/listings` responses are served in order. */
function serve(listingPages: Array<Page | "error">) {
  const queue = [...listingPages];
  api.GET.mockImplementation((path: string) => {
    if (path === "/categories") {
      return Promise.resolve(ok(categories));
    }
    const next = queue.shift();
    if (next === undefined || next === "error") {
      return Promise.resolve({
        error: { code: "INTERNAL_SERVER_ERROR" },
        response: new Response(null, { status: 500 }),
      });
    }
    return Promise.resolve(ok(next));
  });
}

const listingCalls = () =>
  api.GET.mock.calls.filter(([path]) => path === "/listings");

function renderBrowser(locale: "vi" | "en" = "vi") {
  renderWithIntl(
    <QueryProvider>
      <ListingBrowser />
    </QueryProvider>,
    { locale },
  );
}

describe("ListingBrowser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    location.search = "";
  });

  it("shows a loading state, then the listings", async () => {
    serve([{ items: [summary("1", "Loa cũ"), summary("2", "Bàn phím")], nextCursor: null }]);

    renderBrowser();

    expect(screen.getByLabelText("Đang tải bài đăng")).toBeInTheDocument();
    expect(await screen.findByText("Loa cũ")).toBeInTheDocument();
    expect(screen.getByText("Bàn phím")).toBeInTheDocument();
    expect(screen.queryByLabelText("Đang tải bài đăng")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xem thêm" })).not.toBeInTheDocument();
  });

  it("opens with the closing-soon shelf and a heading for the full list", async () => {
    serve([{ items: [summary("1", "Loa cũ")], nextCursor: null }]);

    renderBrowser();

    expect(screen.getByTestId("closing-soon-shelf")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tất cả món đang bán" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Loa cũ")).toBeInTheDocument();
  });

  it.each(["q=loa", "category=dien-tu", "mode=in_stock"])(
    "hides the shelf when the list is narrowed by %s",
    async (search) => {
      location.search = search;
      serve([{ items: [summary("1", "Loa cũ")], nextCursor: null }]);

      renderBrowser();

      expect(await screen.findByText("Loa cũ")).toBeInTheDocument();
      expect(screen.queryByTestId("closing-soon-shelf")).not.toBeInTheDocument();
    },
  );

  it("shows headings, filters and category names in English", async () => {
    serve([{ items: [summary("1", "Loa cũ")], nextCursor: null }]);

    renderBrowser("en");

    expect(
      screen.getByRole("heading", { name: "Everything for sale" }),
    ).toBeInTheDocument();
    const modes = screen.getByRole("group", { name: "Selling mode" });
    expect(within(modes).getByRole("button", { name: "Pre-order" })).toBeInTheDocument();
    const kinds = screen.getByRole("group", { name: "Category" });
    expect(
      await within(kinds).findByRole("button", { name: "Electronics" }),
    ).toBeInTheDocument();
    expect(within(kinds).queryByText("Điện tử")).not.toBeInTheDocument();
  });

  it("offers price and condition filters as links", async () => {
    location.search = "minPrice=50000&maxPrice=200000";
    serve([{ items: [summary("1", "Loa cũ")], nextCursor: null }]);

    renderBrowser();

    expect(await screen.findByText("Loa cũ")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Dưới 50.000 đ" }),
    ).toHaveAttribute("href", "/?maxPrice=50000");
    expect(
      screen.getByRole("link", { name: "50.000 đ – 200.000 đ" }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      screen.getByRole("link", { name: "Từ 90% (Tốt)" }),
    ).toHaveAttribute(
      "href",
      "/?minPrice=50000&maxPrice=200000&minCondition=good",
    );
    expect(listingCalls()[0][1]).toMatchObject({
      params: { query: { minPrice: 50000, maxPrice: 200000 } },
    });
  });

  it("sends the filters from the URL to the API", async () => {
    location.search = "q=hoa+qua&category=thuc-pham-tuoi&mode=preorder";
    serve([{ items: [], nextCursor: null }]);

    renderBrowser();

    await waitFor(() => expect(listingCalls()).toHaveLength(1));
    expect(listingCalls()[0][1]).toEqual({
      params: {
        query: {
          q: "hoa qua",
          category: "thuc-pham-tuoi",
          mode: "preorder",
          cursor: undefined,
        },
      },
    });
  });

  it("invites the first listing when the marketplace is empty", async () => {
    serve([{ items: [], nextCursor: null }]);

    renderBrowser();

    expect(
      await screen.findByRole("heading", { name: "Chưa có sản phẩm nào" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Đăng bán món đầu tiên" }),
    ).toHaveAttribute("href", "/sell/new");
  });

  it("names the query when a search finds nothing", async () => {
    location.search = "q=máy+bay";
    serve([{ items: [], nextCursor: null }]);

    renderBrowser();

    expect(
      await screen.findByRole("heading", {
        name: "Không tìm thấy kết quả cho “máy bay”",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xóa bộ lọc" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("explains an empty result caused by filters alone", async () => {
    location.search = "mode=preorder";
    serve([{ items: [], nextCursor: null }]);

    renderBrowser();

    expect(
      await screen.findByRole("heading", {
        name: "Không có bài đăng nào khớp bộ lọc",
      }),
    ).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    serve(["error", { items: [summary("1", "Loa cũ")], nextCursor: null }]);

    renderBrowser();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tải được danh sách bài đăng.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByText("Loa cũ")).toBeInTheDocument();
  });

  it("loads the next page with the cursor and appends it", async () => {
    serve([
      { items: [summary("1", "Loa cũ")], nextCursor: "cursor-2" },
      { items: [summary("2", "Bàn phím")], nextCursor: null },
    ]);

    renderBrowser();
    await userEvent.click(await screen.findByRole("button", { name: "Xem thêm" }));

    expect(await screen.findByText("Bàn phím")).toBeInTheDocument();
    expect(screen.getByText("Loa cũ")).toBeInTheDocument();
    expect(listingCalls()[1][1]).toMatchObject({
      params: { query: { cursor: "cursor-2" } },
    });
    expect(screen.queryByRole("button", { name: "Xem thêm" })).not.toBeInTheDocument();
  });

  describe("filter chips", () => {
    it("link to the URL with that filter added, keeping the others", async () => {
      location.search = "q=loa";
      serve([{ items: [], nextCursor: null }]);

      renderBrowser();

      const categoryGroup = await screen.findByRole("group", { name: "Loại hàng" });
      expect(
        await within(categoryGroup).findByRole("button", { name: "Điện tử" }),
      ).toHaveAttribute("href", "/?q=loa&category=dien-tu");
      expect(screen.getByRole("button", { name: "Đặt trước" })).toHaveAttribute(
        "href",
        "/?q=loa&mode=preorder",
      );
    });

    it("mark the active filter and link to the URL without it", async () => {
      location.search = "category=dien-tu&mode=in_stock";
      serve([{ items: [], nextCursor: null }]);

      renderBrowser();

      const active = await screen.findByRole("button", { name: "Điện tử" });
      expect(active).toHaveAttribute("aria-pressed", "true");
      expect(active).toHaveAttribute("href", "/?mode=in_stock");
      expect(
        screen.getByRole("button", { name: "Thực phẩm tươi" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: "Có sẵn" })).toHaveAttribute(
        "href",
        "/?category=dien-tu",
      );
    });

    it("offer an 'all' choice that is active when nothing is filtered", async () => {
      serve([{ items: [], nextCursor: null }]);

      renderBrowser();

      const all = await screen.findByRole("button", { name: "Tất cả" });
      expect(all).toHaveAttribute("aria-pressed", "true");
      expect(all).toHaveAttribute("href", "/");
      expect(
        screen.getByRole("button", { name: "Mọi loại hàng" }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("let the 'all' choices clear one filter and keep the other", async () => {
      location.search = "category=dien-tu&mode=in_stock";
      serve([{ items: [], nextCursor: null }]);

      renderBrowser();

      const all = await screen.findByRole("button", { name: "Tất cả" });
      expect(all).toHaveAttribute("aria-pressed", "false");
      expect(all).toHaveAttribute("href", "/?category=dien-tu");
      expect(
        screen.getByRole("button", { name: "Mọi loại hàng" }),
      ).toHaveAttribute("href", "/?mode=in_stock");
    });

    it("stay under the header while the list scrolls", async () => {
      serve([{ items: [], nextCursor: null }]);

      renderBrowser();

      const group = await screen.findByRole("group", { name: "Hình thức bán" });
      expect(group.closest(".sticky")).toHaveClass("top-16");
    });
  });
});
