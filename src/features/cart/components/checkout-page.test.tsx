import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { CheckoutPreview } from "../api/use-cart";
import { CheckoutPage } from "./checkout-page";

const { api, location, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  location: { search: "" },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(location.search),
}));

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const preview: CheckoutPreview = {
  orders: [
    {
      key: "seller:s1",
      seller: { id: "s1", name: "Chị Lan", handle: "lan", avatarUrl: null },
      isPreorder: false,
      orderDeadline: null,
      deliveryDate: null,
      lines: [
        {
          listingId: A,
          title: "Bút bi",
          unit: "cái",
          unitPrice: 10000,
          quantity: 100,
          combos: [{ quantity: "100", price: 900000 }],
          lineTotal: 900000,
          listTotal: 1000000,
        },
      ],
      totalAmount: 900000,
      listTotal: 1000000,
      paymentMethods: ["prepaid_qr", "pay_on_delivery"],
    },
    {
      key: "listing:l2",
      seller: { id: "s2", name: "Anh Minh", handle: "minh", avatarUrl: null },
      isPreorder: true,
      orderDeadline: "2026-10-09T10:00:00.000Z",
      deliveryDate: "2026-10-12",
      lines: [
        {
          listingId: B,
          title: "Cam sành",
          unit: "kg",
          unitPrice: 35000,
          quantity: 1.5,
          combos: [],
          lineTotal: 52500,
          listTotal: 52500,
        },
      ],
      totalAmount: 52500,
      listTotal: 52500,
      paymentMethods: ["pay_on_delivery"],
    },
  ],
};

const placedOrder = (id: string, qr: boolean) => ({
  id,
  code: `SSM${id}`,
  seller: { id: "s", name: id === "1" ? "Chị Lan" : "Anh Minh" },
  totalAmount: id === "1" ? 900000 : 52500,
  qr: qr
    ? {
        payload: "000201",
        bankName: "VCB",
        accountNumber: "01",
        accountName: "LAN",
        amount: 900000,
        content: "SSM1",
      }
    : null,
});

function serve(me: object = { id: "me", deliveryLocation: "Tầng 7" }) {
  api.GET.mockResolvedValue({ data: me, response: new Response() });
  api.POST.mockImplementation((path: string) =>
    Promise.resolve(
      path === "/checkout/preview"
        ? { data: preview, response: new Response() }
        : {
            data: { orders: [placedOrder("1", true), placedOrder("2", false)] },
            response: new Response(),
          },
    ),
  );
}

const render = () =>
  renderWithIntl(
    <QueryProvider>
      <CheckoutPage />
    </QueryProvider>,
  );

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    location.search = `items=${A}:100,${B}:1.5&from=cart`;
  });

  it("shows one block per order the server will create", async () => {
    serve();
    render();

    const lan = await screen.findByRole("region", { name: "Đơn của Chị Lan" });
    expect(within(lan).getAllByText("900.000 đ").length).toBeGreaterThan(0);
    expect(within(lan).getByText("1.000.000 đ")).toHaveClass("line-through");
    const minh = screen.getByRole("region", { name: "Đơn của Anh Minh" });
    expect(within(minh).getByText(/Đặt trước · chốt/)).toBeInTheDocument();
    expect(within(minh).getByRole("radio")).toBeChecked();
    expect(within(lan).getByLabelText("Giao đến")).toHaveValue("Tầng 7");
    expect(screen.getByRole("status", { name: "Tổng cộng 2 đơn" })).toHaveTextContent(
      "952.500 đ",
    );
  });

  it("places every order at once with one key, then shows each QR", async () => {
    serve();
    render();

    const lan = await screen.findByRole("region", { name: "Đơn của Chị Lan" });
    await userEvent.click(within(lan).getByRole("radio", { name: "Trả tiền khi nhận hàng" }));
    await userEvent.click(within(lan).getByRole("radio", { name: "Chuyển khoản trước qua mã QR" }));
    await userEvent.type(within(lan).getByLabelText(/Ghi chú/), "Giao trưa");
    await userEvent.click(screen.getByRole("button", { name: "Đặt 2 đơn" }));

    expect(await screen.findByRole("heading", { name: "Đã tạo 2 đơn" })).toBeInTheDocument();
    const [, call] = api.POST.mock.calls.find(([path]) => path === "/checkout")!;
    expect(call.body).toEqual({
      lines: [
        { listingId: A, quantity: "100" },
        { listingId: B, quantity: "1.5" },
      ],
      fromCart: true,
      orders: [
        {
          key: "seller:s1",
          paymentMethod: "prepaid_qr",
          deliveryLocation: "Tầng 7",
          note: "Giao trưa",
        },
        {
          key: "listing:l2",
          paymentMethod: "pay_on_delivery",
          deliveryLocation: "Tầng 7",
          note: null,
        },
      ],
    });
    expect(call.params.header["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByRole("img", { name: "Mã QR chuyển khoản cho đơn SSM1" })).toBeInTheDocument();
    expect(screen.getByText("Trả 52.500 đ khi nhận hàng")).toBeInTheDocument();
  });

  it("asks for a delivery location before placing", async () => {
    serve({ id: "me", deliveryLocation: null });
    render();

    await userEvent.click(await screen.findByRole("button", { name: "Đặt 2 đơn" }));

    expect(screen.getAllByText("Nhập nơi nhận hàng")).toHaveLength(2);
    expect(api.POST).not.toHaveBeenCalledWith("/checkout", expect.anything());
  });

  it("lists what ran short and creates nothing", async () => {
    serve();
    api.POST.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/checkout/preview"
          ? { data: preview, response: new Response() }
          : {
              error: {
                code: "OUT_OF_STOCK",
                details: { items: [{ listingId: A, title: "Bút bi", available: 40 }] },
              },
              response: new Response(null, { status: 409 }),
            },
      ),
    );
    render();

    await userEvent.click(await screen.findByRole("button", { name: "Đặt 2 đơn" }));

    expect(await screen.findByText("Bút bi: còn 40")).toBeInTheDocument();
  });

  it("points to the existing order of a pre-order round", async () => {
    serve();
    api.POST.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/checkout/preview"
          ? { data: preview, response: new Response() }
          : {
              error: { code: "ALREADY_ORDERED", details: { orderId: "o9" } },
              response: new Response(null, { status: 409 }),
            },
      ),
    );
    render();

    await userEvent.click(await screen.findByRole("button", { name: "Đặt 2 đơn" }));

    expect(await screen.findByText(/Bạn đã đặt đợt này/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem đơn của bạn" })).toHaveAttribute(
      "href",
      "/orders/o9",
    );
  });

  it("reviews again when the orders changed", async () => {
    serve();
    api.POST.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/checkout/preview"
          ? { data: preview, response: new Response() }
          : {
              error: { code: "CHECKOUT_CHANGED" },
              response: new Response(null, { status: 409 }),
            },
      ),
    );
    render();

    await userEvent.click(await screen.findByRole("button", { name: "Đặt 2 đơn" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Người bán vừa thay đổi bài đăng. Hãy xem lại đơn rồi đặt lại.",
      ),
    );
  });

  it("explains an empty link and a preview that fails", async () => {
    location.search = "";
    serve();
    const { unmount } = render();
    expect(screen.getByText("Chưa có món nào để đặt.")).toBeInTheDocument();
    unmount();

    location.search = `items=${A}:1`;
    api.POST.mockResolvedValue({
      error: { code: "LISTING_NOT_OPEN" },
      response: new Response(null, { status: 409 }),
    });
    render();
    expect(
      await screen.findByText("Bài đăng này không còn nhận đơn."),
    ).toBeInTheDocument();
  });
});
