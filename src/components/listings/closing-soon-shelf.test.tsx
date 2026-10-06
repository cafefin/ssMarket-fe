import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/query-provider";
import { ClosingSoonShelf } from "./closing-soon-shelf";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ api }));

const preorder = (id: string, title: string, orderDeadline: string | null) => ({
  id,
  title,
  mode: "preorder",
  category: { id: 2, slug: "thuc-pham-tuoi", name: "Thực phẩm tươi" },
  seller: { id: "u1", name: "An", avatarUrl: null },
  thumbnailUrl: null,
  minUnitPrice: 35000,
  minPriceUnit: "kg",
  orderDeadline,
  deliveryDate: "2026-10-20",
  publishedAt: "2026-10-05T03:00:00.000Z",
  orderCount: 0,
});

function serve(items: ReturnType<typeof preorder>[]) {
  api.GET.mockResolvedValue({
    data: { items, nextCursor: null },
    response: new Response(),
  });
}

function renderShelf() {
  render(
    <QueryProvider>
      <ClosingSoonShelf />
    </QueryProvider>,
  );
}

const shelf = () => screen.findByRole("region", { name: "Sắp chốt đơn" });

describe("ClosingSoonShelf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // jsdom does not implement element scrolling.
    Element.prototype.scrollBy = vi.fn();
  });

  it("asks for open pre-orders and lists them soonest first", async () => {
    serve([
      preorder("3", "Bưởi", "2026-10-13T10:00:00.000Z"),
      preorder("1", "Bánh mì", "2026-10-07T10:00:00.000Z"),
      preorder("2", "Cam sành", "2026-10-09T10:00:00.000Z"),
    ]);

    renderShelf();

    const links = within(await shelf()).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/listings/1",
      "/listings/2",
      "/listings/3",
    ]);
    expect(api.GET).toHaveBeenCalledWith("/listings", {
      params: {
        query: {
          q: undefined,
          category: undefined,
          mode: "preorder",
          cursor: undefined,
        },
      },
    });
  });

  it("leaves out pre-orders without a closing time", async () => {
    serve([
      preorder("1", "Bánh mì", "2026-10-07T10:00:00.000Z"),
      preorder("2", "Không hạn", null),
    ]);

    renderShelf();

    expect(within(await shelf()).getAllByRole("link")).toHaveLength(1);
  });

  it("renders nothing when there is no pre-order", async () => {
    serve([]);

    renderShelf();

    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("slides with the arrow buttons and disables the one at the edge", async () => {
    serve([preorder("1", "Bánh mì", "2026-10-07T10:00:00.000Z")]);
    renderShelf();
    const region = await shelf();
    const previous = within(region).getByRole("button", {
      name: "Xem các món trước",
    });
    const next = within(region).getByRole("button", {
      name: "Xem các món tiếp theo",
    });
    const row = within(region).getByRole("list");

    expect(previous).toBeDisabled();
    await userEvent.click(next);
    expect(row.scrollBy).toHaveBeenCalledWith({ left: 266 });

    // The row has been scrolled to its end.
    Object.defineProperties(row, {
      scrollLeft: { value: 300, configurable: true },
      clientWidth: { value: 500, configurable: true },
      scrollWidth: { value: 800, configurable: true },
    });
    fireEvent.scroll(row);

    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();
    await userEvent.click(previous);
    expect(row.scrollBy).toHaveBeenLastCalledWith({ left: -400 });
  });
});
