import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { ClosingSoonShelf } from "./closing-soon-shelf";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }));
vi.mock("@/shared/api/client", () => ({ api }));

const preorder = (id: string, title: string, orderDeadline: string | null) => ({
  id,
  title,
  mode: "preorder",
  category: { id: 2, slug: "thuc-pham-tuoi", name: "Thực phẩm tươi", nameEn: "Fresh food", isPerishable: true },
  seller: { id: "u1", name: "An", avatarUrl: null },
  thumbnailUrl: null,
  stockQuantity: null,
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
  renderWithIntl(
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
      preorder("1", "Bánh mì", "2026-10-07T10:00:00.000Z"),
      preorder("2", "Cam sành", "2026-10-09T10:00:00.000Z"),
      preorder("3", "Bưởi", "2026-10-13T10:00:00.000Z"),
    ]);

    renderShelf();

    const links = within(await shelf()).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/listings/1",
      "/listings/2",
      "/listings/3",
    ]);
    expect(api.GET).toHaveBeenCalledWith("/listings", {
      params: { query: { sort: "deadline", limit: 10 } },
    });
  });

  it("keeps the server's order", async () => {
    serve([
      preorder("b", "Sau", "2026-10-13T10:00:00.000Z"),
      preorder("a", "Trước", "2026-10-07T10:00:00.000Z"),
    ]);
    renderShelf();
    const links = within(await shelf()).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/listings/b",
      "/listings/a",
    ]);
  });

  it("renders nothing when there is no pre-order", async () => {
    serve([]);

    renderShelf();

    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("disables both arrows when every card fits", async () => {
    serve([preorder("1", "Bánh mì", "2026-10-07T10:00:00.000Z")]);
    renderShelf();
    const region = await shelf();
    const previous = within(region).getByRole("button", {
      name: "Xem các món trước",
    });
    const next = within(region).getByRole("button", {
      name: "Xem các món tiếp theo",
    });

    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(next);
    expect(within(region).getByRole("list").scrollBy).not.toHaveBeenCalled();
  });

  describe("when the row overflows", () => {
    afterEach(() => {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth");
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    });

    it("slides with the arrows and disables the one at the edge", async () => {
      Object.defineProperties(HTMLElement.prototype, {
        scrollWidth: { get: () => 800, configurable: true },
        clientWidth: { get: () => 500, configurable: true },
      });
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

      expect(previous).toHaveAttribute("aria-disabled", "true");
      expect(next).not.toHaveAttribute("aria-disabled", "true");
      await userEvent.click(next);
      expect(row.scrollBy).toHaveBeenCalledWith({ left: 400 });

      // The row has been scrolled to its end.
      Object.defineProperty(row, "scrollLeft", {
        value: 300,
        configurable: true,
      });
      fireEvent.scroll(row);

      expect(next).toHaveAttribute("aria-disabled", "true");
      expect(previous).not.toHaveAttribute("aria-disabled", "true");
      await userEvent.click(previous);
      expect(row.scrollBy).toHaveBeenLastCalledWith({ left: -400 });
    });
  });
});
