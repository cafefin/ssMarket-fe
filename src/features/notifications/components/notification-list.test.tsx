import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { NotificationList } from "./notification-list";

const { api, router } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  router: { push: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const placed = {
  id: "n1",
  type: "order.placed",
  params: { orderId: "o1", orderCode: "SSM2ABCDE", buyerName: "An", title: "Bánh" },
  readAt: null,
  createdAt: ago(5 * 60_000),
};
const delivered = {
  id: "n2",
  type: "order.delivered",
  params: { orderId: "o1", orderCode: "SSM2ABCDE", sellerName: "Bình" },
  readAt: ago(60_000),
  createdAt: ago(2 * 3600_000),
};

function page(items: unknown[], nextCursor: string | null = null) {
  return { data: { items, nextCursor }, response: new Response() };
}

function setup(onNavigate = vi.fn()) {
  renderWithIntl(
    <QueryProvider>
      <NotificationList onNavigate={onNavigate} />
    </QueryProvider>,
  );
  return { onNavigate, user: userEvent.setup() };
}

describe("NotificationList", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.POST.mockResolvedValue({ response: new Response(null, { status: 204 }) });
  });

  it("reads each row, marks unread ones for screen readers, shows the time", async () => {
    api.GET.mockResolvedValue(page([placed, delivered]));
    setup();
    const unread = await screen.findByRole("button", {
      name: /An đặt đơn SSM2ABCDE \(Bánh\)/,
    });
    const read = screen.getByRole("button", {
      name: /Bình đã giao đơn SSM2ABCDE/,
    });
    expect(unread).toHaveTextContent("Chưa đọc");
    expect(read).not.toHaveTextContent("Chưa đọc");
    expect(unread).toHaveTextContent("5 phút trước");
  });

  it("shows the new total of an edited order as money", async () => {
    api.GET.mockResolvedValue(
      page([
        {
          ...placed,
          type: "order.edited",
          params: { ...placed.params, total: 120000 },
        },
      ]),
    );
    setup();
    expect(await screen.findByText(/120\.000 đ/)).toBeInTheDocument();
  });

  it("marks an unread row read, opens the order and closes the panel", async () => {
    api.GET.mockResolvedValue(page([placed, delivered]));
    const { user, onNavigate } = setup();
    await user.click(await screen.findByRole("button", { name: /An đặt đơn/ }));
    expect(api.POST).toHaveBeenCalledWith("/notifications/{id}/read", {
      params: { path: { id: "n1" } },
    });
    expect(router.push).toHaveBeenCalledWith("/orders/o1");
    expect(onNavigate).toHaveBeenCalled();
  });

  it("does not post for a row that is already read", async () => {
    api.GET.mockResolvedValue(page([placed, delivered]));
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: /Bình đã giao/ }));
    expect(api.POST).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/orders/o1");
  });

  it("shows an unknown type generically, without a link, and marks it read", async () => {
    api.GET.mockResolvedValue(
      page([{ ...placed, id: "n9", type: "something.new", params: {} }]),
    );
    const { user, onNavigate } = setup();
    await user.click(
      await screen.findByRole("button", { name: /Bạn có thông báo mới/ }),
    );
    expect(api.POST).toHaveBeenCalledWith("/notifications/{id}/read", {
      params: { path: { id: "n9" } },
    });
    expect(router.push).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("marks everything read, and hides the button when nothing is unread", async () => {
    api.GET.mockResolvedValue(page([placed, delivered]));
    const { user } = setup();
    await user.click(
      await screen.findByRole("button", { name: "Đánh dấu đã đọc tất cả" }),
    );
    expect(api.POST).toHaveBeenCalledWith("/notifications/read-all");
  });

  it("has no mark-all button when everything is read", async () => {
    api.GET.mockResolvedValue(page([delivered]));
    setup();
    await screen.findByRole("button", { name: /Bình đã giao/ });
    expect(
      screen.queryByRole("button", { name: "Đánh dấu đã đọc tất cả" }),
    ).not.toBeInTheDocument();
  });

  it("loads the next page on 'Xem thêm'", async () => {
    api.GET.mockResolvedValueOnce(page([placed], "c1")).mockResolvedValueOnce(
      page([delivered]),
    );
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Xem thêm" }));
    expect(
      await screen.findByRole("button", { name: /Bình đã giao/ }),
    ).toBeInTheDocument();
    expect(api.GET).toHaveBeenLastCalledWith("/notifications", {
      params: { query: { cursor: "c1" } },
    });
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Xem thêm" })).not.toBeInTheDocument(),
    );
  });

  it("says when there is nothing", async () => {
    api.GET.mockResolvedValue(page([]));
    setup();
    expect(await screen.findByText("Chưa có thông báo nào.")).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    api.GET.mockResolvedValueOnce({
      error: { code: "X" },
      response: new Response(null, { status: 500 }),
    }).mockResolvedValueOnce(page([]));
    const { user } = setup();
    expect(await screen.findByText("Không tải được thông báo.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Chưa có thông báo nào.")).toBeInTheDocument();
  });
});
