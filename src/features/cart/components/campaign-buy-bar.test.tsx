import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { Cart, CartLine } from "../api/use-cart";
import { CampaignBuyBar } from "./campaign-buy-bar";
import { CartButton } from "./cart-button";

const { api, router, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), PUT: vi.fn() },
  router: { push: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast }));

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const cartLine = (listingId: string, quantity: number): CartLine => ({
  listingId,
  title: "Xôi gà",
  mode: "preorder",
  unit: "cái",
  unitPrice: 18000,
  combos: [],
  quantity,
  stockQuantity: null,
  thumbnailUrl: null,
  campaign: {
    id: "c1",
    title: "Đồ ăn sáng tuần 42",
    orderDeadline: "2099-10-09T10:00:00.000Z",
    deliveryDate: "2099-10-12",
  },
  lineTotal: 18000 * quantity,
  listTotal: 18000 * quantity,
  problem: null,
});

const cartOf = (lines: CartLine[]): Cart => ({
  groups:
    lines.length > 0
      ? [
          {
            seller: { id: "s1", name: "Chị Lan", handle: "lan", avatarUrl: null },
            lines,
          },
        ]
      : [],
  lineCount: lines.length,
});

function serve({
  cart = cartOf([]),
  after = cart,
  me = { id: "me" },
}: { cart?: Cart; after?: Cart; me?: object } = {}) {
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
  api.PUT.mockResolvedValue({ data: after, response: new Response() });
}

const LINES = [
  { listingId: A, quantity: "2" },
  { listingId: B, quantity: "1.5" },
];

function renderBar(
  props: Partial<React.ComponentProps<typeof CampaignBuyBar>> = {},
  locale?: "vi" | "en",
) {
  const onAdded = vi.fn();
  const view = renderWithIntl(
    <QueryProvider>
      <CartButton />
      <CampaignBuyBar
        sellerId="s1"
        lines={LINES}
        total={96000}
        valid
        onAdded={onAdded}
        {...props}
      />
    </QueryProvider>,
    { locale },
  );
  return { onAdded, ...view };
}

const addButton = () => screen.findByRole("button", { name: "Thêm vào giỏ" });

describe("CampaignBuyBar", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("says how many products are chosen and what they cost", async () => {
    serve();
    renderBar();

    const bar = await screen.findByRole("region", { name: "Các món đã chọn" });
    expect(bar).toHaveTextContent("2 món · 96.000 đ");
  });

  it("counts in English on an English page", async () => {
    serve();
    renderBar({ lines: [LINES[0]], total: 36000 }, "en");

    expect(
      await screen.findByRole("region", { name: "Chosen products" }),
    ).toHaveTextContent("1 item · 36,000 VND");
  });

  it("adds every line in one request, on top of what the cart holds", async () => {
    serve({
      cart: cartOf([cartLine(A, 3), cartLine(C, 1)]),
      after: cartOf([cartLine(A, 5), cartLine(C, 1), cartLine(B, 1.5)]),
    });
    const { onAdded } = renderBar();

    const add = await addButton();
    await waitFor(() => expect(add).toBeEnabled());
    await userEvent.click(add);

    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith("/cart/lines", {
        body: {
          lines: [
            { listingId: A, quantity: "5" },
            { listingId: B, quantity: "1.5" },
          ],
        },
      }),
    );
    expect(api.PUT).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã thêm vào giỏ"));
    expect(onAdded).toHaveBeenCalledTimes(1);
    // The answer is the new cart: the header count follows without a refetch.
    expect(
      await screen.findByRole("link", { name: "Giỏ hàng, 3 món" }),
    ).toBeInTheDocument();
  });

  it("adds fractions without floating-point noise", async () => {
    serve({ cart: cartOf([cartLine(B, 0.1)]) });
    renderBar({ lines: [{ listingId: B, quantity: "0.2" }] });

    const add = await addButton();
    await waitFor(() => expect(add).toBeEnabled());
    await userEvent.click(add);

    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith("/cart/lines", {
        body: { lines: [{ listingId: B, quantity: "0.3" }] },
      }),
    );
  });

  it("does not add before it knows what the cart holds", async () => {
    serve();
    api.GET.mockImplementation((path: string) =>
      path === "/users/me"
        ? Promise.resolve({ data: { id: "me" }, response: new Response() })
        : new Promise(() => undefined),
    );
    renderBar();

    expect(await addButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mua ngay" })).toBeEnabled();
  });

  it("buys now through the checkout link, leaving the cart alone", async () => {
    serve();
    renderBar();

    await userEvent.click(await screen.findByRole("button", { name: "Mua ngay" }));

    expect(router.push).toHaveBeenCalledWith(
      `/checkout?items=${A}%3A2%2C${B}%3A1.5`,
    );
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it("disables both buttons while nothing is chosen", async () => {
    serve();
    renderBar({ lines: [], total: 0 });

    expect(await addButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mua ngay" })).toBeDisabled();
    expect(screen.getByRole("region", { name: "Các món đã chọn" })).toHaveTextContent(
      "Chưa chọn món nào",
    );
  });

  it("disables both buttons while a quantity is not valid", async () => {
    serve();
    renderBar({ valid: false });

    const add = await addButton();
    await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/cart"));
    expect(add).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mua ngay" })).toBeDisabled();
  });

  it("explains a refusal in the person's words and keeps the selection", async () => {
    serve();
    api.PUT.mockResolvedValue({
      error: { code: "LISTING_NOT_OPEN", message: "Listing is not open" },
      response: new Response(null, { status: 409 }),
    });
    const { onAdded } = renderBar();

    const add = await addButton();
    await waitFor(() => expect(add).toBeEnabled());
    await userEvent.click(add);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Bài đăng này không còn nhận đơn."),
    );
    expect(onAdded).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("says when the cart is full", async () => {
    serve();
    api.PUT.mockResolvedValue({
      error: { code: "CART_FULL" },
      response: new Response(null, { status: 409 }),
    });
    renderBar();

    const add = await addButton();
    await waitFor(() => expect(add).toBeEnabled());
    await userEvent.click(add);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Giỏ hàng đã đầy (tối đa 50 món). Hãy đặt hoặc xóa bớt món trước.",
      ),
    );
  });

  it("shows nothing to the seller of the round", async () => {
    serve({ me: { id: "s1" } });
    renderBar();

    await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/users/me"));
    await screen.findByRole("link", { name: /Giỏ hàng/ });
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mua ngay" })).not.toBeInTheDocument();
  });
});
