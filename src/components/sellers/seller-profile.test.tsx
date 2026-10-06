import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/query-provider";
import { SellerProfile } from "./seller-profile";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ api }));

const summary = (id: string, title: string) => ({
  id,
  title,
  mode: "in_stock",
  category: { id: 2, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics" },
  seller: { id: "u1", name: "Lê Thu Hà", avatarUrl: null },
  thumbnailUrl: null,
  stockQuantity: 3,
  minUnitPrice: 35000,
  minPriceUnit: "cái",
  orderDeadline: null,
  deliveryDate: null,
  publishedAt: "2026-10-05T03:00:00.000Z",
  orderCount: 0,
});

type Page = { items: ReturnType<typeof summary>[]; nextCursor: string | null };

function serve(
  opts: {
    user?: object | "missing" | "broken";
    pages?: Page[];
    listingsFail?: boolean;
  } = {},
) {
  const user = opts.user ?? {
    id: "u1",
    name: "Lê Thu Hà",
    avatarUrl: null,
    deliveryLocation: "Tầng 7",
  };
  const pages = opts.pages ?? [
    { items: [summary("l1", "Loa"), summary("l2", "Sạc")], nextCursor: null },
  ];
  let call = 0;
  api.GET.mockImplementation((path: string) => {
    if (path === "/users/{id}") {
      if (user === "broken") {
        return Promise.resolve({
          data: undefined,
          error: { code: "INTERNAL" },
          response: new Response(null, { status: 500 }),
        });
      }
      return Promise.resolve(
        user === "missing"
          ? {
              data: undefined,
              error: { code: "NOT_FOUND" },
              response: new Response(null, { status: 404 }),
            }
          : { data: user, response: new Response() },
      );
    }
    if (opts.listingsFail && call++ === 0) {
      return Promise.resolve({
        data: undefined,
        error: { code: "INTERNAL" },
        response: new Response(null, { status: 500 }),
      });
    }
    const page = pages[Math.min(call++, pages.length - 1)];
    return Promise.resolve({ data: page, response: new Response() });
  });
}

function renderProfile() {
  render(
    <QueryProvider>
      <SellerProfile sellerId="u1" />
    </QueryProvider>,
  );
}

describe("SellerProfile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the seller and links to each open listing", async () => {
    serve();
    renderProfile();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Lê Thu Hà" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Giao tại Tầng 7")).toBeInTheDocument();
    const hrefs = (await screen.findAllByRole("link")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual(["/listings/l1", "/listings/l2"]);
    expect(api.GET).toHaveBeenCalledWith("/listings", {
      params: { query: { seller: "u1", cursor: undefined } },
    });
  });

  it("omits the delivery location when the seller has none", async () => {
    serve({ user: { id: "u1", name: "Lê Thu Hà", avatarUrl: null } });
    renderProfile();

    await screen.findByRole("heading", { level: 1, name: "Lê Thu Hà" });
    expect(screen.queryByText(/Giao tại/)).not.toBeInTheDocument();
  });

  it("says so when the seller has nothing for sale", async () => {
    serve({ pages: [{ items: [], nextCursor: null }] });
    renderProfile();

    expect(
      await screen.findByText("Người bán này chưa có món nào đang bán."),
    ).toBeInTheDocument();
  });

  it("shows a not-found block when the seller does not exist", async () => {
    serve({ user: "missing" });
    renderProfile();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tìm thấy người bán này.",
    );
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("does not claim the seller is missing when the request failed", async () => {
    serve({ user: "broken" });
    renderProfile();

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("Không tìm thấy người bán này.");
    expect(alert).toHaveTextContent("Đã có lỗi xảy ra. Vui lòng thử lại.");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });

  it("offers a retry when the listings fail to load", async () => {
    serve({ listingsFail: true });
    renderProfile();

    expect(
      await screen.findByText("Không tải được danh sách bài đăng."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    const grid = await screen.findByRole("region", { name: "Đang bán" });
    expect(await within(grid).findAllByRole("link")).toHaveLength(2);
  });

  it("loads the next page on demand", async () => {
    serve({
      pages: [
        { items: [summary("l1", "Loa")], nextCursor: "c2" },
        { items: [summary("l2", "Sạc")], nextCursor: null },
      ],
    });
    renderProfile();

    await userEvent.click(
      await screen.findByRole("button", { name: "Xem thêm" }),
    );

    expect(await screen.findAllByRole("link")).toHaveLength(2);
    expect(api.GET).toHaveBeenLastCalledWith("/listings", {
      params: { query: { seller: "u1", cursor: "c2" } },
    });
  });
});
