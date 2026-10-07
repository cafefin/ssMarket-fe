import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingSummary } from "@/features/listings";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { Cart, CartLine } from "../api/use-cart";
import { AddToCartButton } from "./add-to-cart-button";
import { CardCartActions } from "./card-cart-actions";
import { CartButton } from "./cart-button";
import { CartPage } from "./cart-page";

const { api, router, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
  router: { push: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast }));

const ITEM = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  itemId: ITEM,
  listingId: "l1",
  listingTitle: "Bút bi Thiên Long",
  mode: "in_stock",
  itemCount: 1,
  itemName: "Bút bi Thiên Long",
  unit: "cái",
  unitPrice: 10000,
  combos: [{ quantity: "100", price: 900000 }],
  quantity: 90,
  stockQuantity: 500,
  thumbnailUrl: null,
  orderDeadline: null,
  lineTotal: 900000,
  listTotal: 900000,
  problem: null,
  ...overrides,
});

const cartOf = (lines: CartLine[]): Cart => ({
  groups: [
    {
      seller: { id: "s1", name: "Chị Lan", avatarUrl: null },
      lines,
    },
  ],
  lineCount: lines.length,
});

const summary = (overrides: Partial<ListingSummary> = {}): ListingSummary => ({
  id: "l1",
  title: "Bút bi Thiên Long",
  mode: "in_stock",
  category: { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics", isPerishable: false },
  seller: { id: "s1", name: "Chị Lan", avatarUrl: null },
  thumbnailUrl: null,
  minUnitPrice: 10000,
  minPriceUnit: "cái",
  orderCount: 0,
  stockQuantity: 500,
  itemCount: 1,
  singleItemId: ITEM,
  hasCombos: false,
  condition: "new",
  conditionPercent: 100,
  orderDeadline: null,
  deliveryDate: null,
  publishedAt: "2026-10-05T03:00:00.000Z",
  ...overrides,
});

function serve({ cart = cartOf([]), me = { id: "me" } }: { cart?: Cart; me?: object } = {}) {
  api.GET.mockImplementation((path: string) =>
    Promise.resolve({
      data:
        path === "/users/me"
          ? me
          : path === "/cart/count"
            ? { count: cart.lineCount }
            : cart,
      response: new Response(),
    }),
  );
  api.PUT.mockImplementation(() =>
    Promise.resolve({ data: cart, response: new Response() }),
  );
  api.DELETE.mockResolvedValue({ data: cartOf([]), response: new Response() });
}

const wrap = (ui: React.ReactElement) =>
  renderWithIntl(<QueryProvider>{ui}</QueryProvider>);

describe("CardCartActions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("adds the chosen quantity to what is already in the cart", async () => {
    serve({ cart: cartOf([line({ quantity: 3 })]) });
    wrap(<CardCartActions listing={summary()} />);

    const add = await screen.findByRole("button", { name: "Thêm vào giỏ" });
    await userEvent.click(screen.getByRole("button", { name: "Tăng số lượng" }));
    await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/cart"));
    await userEvent.click(add);

    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith("/cart/lines/{itemId}", {
        params: { path: { itemId: ITEM } },
        body: { quantity: "5" },
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Đã thêm vào giỏ");
  });

  it("buys now through the checkout link", async () => {
    serve();
    wrap(<CardCartActions listing={summary()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Mua ngay" }));

    expect(router.push).toHaveBeenCalledWith(`/checkout?items=${ITEM}%3A1`);
  });

  it("links to the listing to choose among several options", async () => {
    serve();
    wrap(<CardCartActions listing={summary({ itemCount: 3, singleItemId: null })} />);

    expect(await screen.findByRole("link", { name: "Chọn phân loại" })).toHaveAttribute(
      "href",
      "/listings/l1",
    );
  });

  it("shows nothing to the seller and disables a sold-out product", async () => {
    serve({ me: { id: "s1" } });
    const { container } = wrap(<CardCartActions listing={summary()} />);
    await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/users/me"));
    expect(container).toBeEmptyDOMElement();
  });

  it("disables a sold-out product and explains a refusal", async () => {
    serve();
    wrap(<CardCartActions listing={summary({ stockQuantity: 0 })} />);
    expect(await screen.findByRole("button", { name: "Mua ngay" })).toBeDisabled();
  });
});

describe("CartButton", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("links to the cart and says how many options it holds", async () => {
    serve({ cart: cartOf([line(), line({ itemId: OTHER })]) });
    wrap(<CartButton />);

    const link = await screen.findByRole("link", { name: "Giỏ hàng, 2 món" });
    expect(link).toHaveAttribute("href", "/cart");
  });
});

describe("AddToCartButton", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("adds each typed line and reports a refusal", async () => {
    serve();
    wrap(<AddToCartButton lines={[{ itemId: ITEM, quantity: "2" }]} />);
    await userEvent.click(await screen.findByRole("button", { name: "Thêm vào giỏ" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    api.PUT.mockResolvedValue({
      error: { code: "OWN_LISTING" },
      response: new Response(null, { status: 422 }),
    });
    await userEvent.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Bạn không thể đặt hàng bài đăng của chính mình.",
      ),
    );
  });

  it("is disabled without quantities", () => {
    serve();
    wrap(<AddToCartButton lines={[]} />);
    expect(screen.getByRole("button", { name: "Thêm vào giỏ" })).toBeDisabled();
  });
});

describe("CartPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("groups by seller, prices with combos and checks out what is selected", async () => {
    serve({
      cart: cartOf([
        line(),
        line({
          itemId: OTHER,
          listingId: "l2",
          listingTitle: "Loa bluetooth",
          itemName: "Loa bluetooth",
          unitPrice: 500000,
          combos: [],
          quantity: 1,
          lineTotal: 500000,
          listTotal: 500000,
        }),
      ]),
    });
    wrap(<CartPage />);

    const seller = await screen.findByRole("region", { name: "Chị Lan" });
    expect(within(seller).getByText("Mua thêm 10 cái để được combo 100 cái giá 900.000 đ")).toBeInTheDocument();
    expect(screen.getByText("Tổng 2 món đã chọn")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Chọn Loa bluetooth" }));
    expect(screen.getByText("Tổng 1 món đã chọn")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Mua hàng (1)" }));
    expect(router.push).toHaveBeenCalledWith(
      `/checkout?items=${ITEM}%3A90&from=cart`,
    );
  });

  it("changes a quantity and removes a line", async () => {
    serve({ cart: cartOf([line({ combos: [] })]) });
    wrap(<CartPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Tăng số lượng" }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith("/cart/lines/{itemId}", {
        params: { path: { itemId: ITEM } },
        body: { quantity: "91" },
      }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Xóa Bút bi Thiên Long khỏi giỏ" }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã xóa khỏi giỏ"));
  });

  it("explains lines that cannot be bought and leaves them out", async () => {
    serve({
      cart: cartOf([
        line({ problem: "OUT_OF_STOCK", stockQuantity: 2 }),
        line({ itemId: OTHER, problem: "LISTING_NOT_OPEN", listingTitle: "Hoa quả" }),
      ]),
    });
    wrap(<CartPage />);

    expect(await screen.findByText("Chỉ còn 2 cái")).toBeInTheDocument();
    expect(screen.getByText("Bài đăng đã đóng hoặc hết hạn chốt đơn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mua hàng (0)" })).toBeDisabled();
  });

  it("invites browsing when empty and retries a failed load", async () => {
    serve();
    wrap(<CartPage />);
    expect(await screen.findByText("Giỏ hàng đang trống.")).toBeInTheDocument();

    api.GET.mockResolvedValue({
      error: { code: "X" },
      response: new Response(null, { status: 500 }),
    });
    wrap(<CartPage />);
    expect(await screen.findByText("Không tải được giỏ hàng.")).toBeInTheDocument();
  });
});
