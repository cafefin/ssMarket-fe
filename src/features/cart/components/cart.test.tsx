import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { Cart, CartLine } from "../api/use-cart";
import { type BuyableProduct, BuyControls } from "./buy-controls";
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
  listingId: ITEM,
  title: "Bút bi Thiên Long",
  mode: "in_stock",
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
      seller: { id: "s1", name: "Chị Lan", handle: "lan", avatarUrl: null },
      lines,
    },
  ],
  lineCount: lines.length,
});

const product = (overrides: Partial<BuyableProduct> = {}): BuyableProduct => ({
  id: ITEM,
  unit: "cái",
  stockQuantity: 500,
  seller: { id: "s1" },
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

describe("BuyControls", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("puts the quantity on its own row and the two buttons under it", async () => {
    serve();
    wrap(<BuyControls product={product()} />);

    const quantity = await screen.findByRole("textbox", { name: "Số lượng" });
    const buy = screen.getByRole("button", { name: "Mua ngay" });
    expect(quantity.closest("div.flex-col")).toContainElement(buy);
    expect(buy.parentElement).toContainElement(
      screen.getByRole("button", { name: "Thêm vào giỏ" }),
    );
    expect(buy.parentElement).not.toContainElement(quantity);
  });

  it("adds the chosen quantity to what is already in the cart", async () => {
    serve({ cart: cartOf([line({ quantity: 3 })]) });
    wrap(<BuyControls product={product()} />);

    const add = await screen.findByRole("button", { name: "Thêm vào giỏ" });
    await userEvent.click(screen.getByRole("button", { name: "Tăng số lượng" }));
    await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/cart"));
    await userEvent.click(add);

    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith("/cart/lines/{listingId}", {
        params: { path: { listingId: ITEM } },
        body: { quantity: "5" },
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Đã thêm vào giỏ");
  });

  it("never offers more than is left once the cart's share is taken out", async () => {
    serve({ cart: cartOf([line({ quantity: 1 })]) });
    wrap(<BuyControls product={product({ stockQuantity: 2 })} />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Tăng số lượng" })).toBeDisabled(),
    );
    const quantity = screen.getByRole("textbox", { name: "Số lượng" });
    await userEvent.clear(quantity);
    await userEvent.type(quantity, "2");
    expect(screen.getByRole("status")).toHaveTextContent("Chỉ còn 1 cái");
    expect(screen.getByRole("button", { name: "Thêm vào giỏ" })).toBeDisabled();
    // Buying now skips the cart, so the whole stock is available.
    expect(screen.getByRole("button", { name: "Mua ngay" })).toBeEnabled();
  });

  it("cannot add the last piece twice", async () => {
    serve({ cart: cartOf([line({ quantity: 1 })]) });
    wrap(<BuyControls product={product({ stockQuantity: 1 })} />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Đã có 1 cái trong giỏ · Xem giỏ",
    );
    expect(screen.getByRole("button", { name: "Thêm vào giỏ" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Xem giỏ" })).toHaveAttribute("href", "/cart");
  });

  it("buys now through the checkout link", async () => {
    serve();
    wrap(<BuyControls product={product()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Mua ngay" }));

    expect(router.push).toHaveBeenCalledWith(`/checkout?items=${ITEM}%3A1`);
  });

  it("has a roomy layout with a labelled cart button on the product page", async () => {
    serve();
    wrap(<BuyControls product={product()} size="page" />);

    const add = await screen.findByRole("button", { name: "Thêm vào giỏ" });
    expect(add).toHaveTextContent("Thêm vào giỏ");
  });

  it("shows nothing to the seller", async () => {
    serve({ me: { id: "s1" } });
    const { container } = wrap(<BuyControls product={product()} />);
    await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/users/me"));
    expect(container).toBeEmptyDOMElement();
  });

  it("says a sold-out product is sold out", async () => {
    serve();
    wrap(<BuyControls product={product({ stockQuantity: 0 })} />);
    expect(await screen.findByRole("button", { name: "Hết hàng" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Mua ngay" })).not.toBeInTheDocument();
  });

  it("explains a refusal from the server", async () => {
    serve();
    api.PUT.mockResolvedValue({
      error: { code: "OUT_OF_STOCK" },
      response: new Response(null, { status: 409 }),
    });
    wrap(<BuyControls product={product()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Thêm vào giỏ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

describe("CartButton", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("links to the cart and says how many options it holds", async () => {
    serve({ cart: cartOf([line(), line({ listingId: OTHER })]) });
    wrap(<CartButton />);

    const link = await screen.findByRole("link", { name: "Giỏ hàng, 2 món" });
    expect(link).toHaveAttribute("href", "/cart");
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
          listingId: OTHER,
          title: "Loa bluetooth",
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
      expect(api.PUT).toHaveBeenCalledWith("/cart/lines/{listingId}", {
        params: { path: { listingId: ITEM } },
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
        line({ listingId: OTHER, problem: "LISTING_NOT_OPEN", title: "Hoa quả" }),
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
