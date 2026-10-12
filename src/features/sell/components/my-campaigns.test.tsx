import { screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import type { CampaignMine } from "../api/use-my-campaigns";
import { MyCampaigns } from "./my-campaigns";

const { api, toast, router, location } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  router: { push: vi.fn() },
  location: { search: "" },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(location.search),
}));

const round = (overrides: Partial<CampaignMine> = {}): CampaignMine => ({
  id: "c1",
  title: "Bánh bao tuần này",
  status: "open",
  isOpen: true,
  orderDeadline: "2099-10-10T05:00:00.000Z",
  deliveryDate: "2099-10-12",
  itemCount: 18,
  orderCount: 4,
  createdAt: "2099-10-01T03:00:00.000Z",
  ...overrides,
});

const rounds = [
  round(),
  round({ id: "c2", title: "Chè cuối tuần", status: "draft", isOpen: false, itemCount: 1, orderCount: 0 }),
  round({ id: "c3", title: "Hoa quả tuần 40", status: "closed", isOpen: false }),
  // Still open in the database, but the deadline has passed.
  round({ id: "c4", title: "Xôi sáng thứ hai", isOpen: false, orderDeadline: "2020-10-10T05:00:00.000Z" }),
];

const ok = (data: unknown) => ({ data, response: new Response() });
const fail = (status: number, code: string) => ({
  error: { code, message: "backend text" },
  response: new Response(null, { status }),
});

function renderList() {
  renderWithIntl(
    <QueryProvider>
      <MyCampaigns />
    </QueryProvider>,
  );
}

const row = (title: string) => screen.findByRole("listitem", { name: title });
const tab = (name: string) => screen.getByRole("tab", { name });

describe("MyCampaigns", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    location.search = "";
    api.GET.mockResolvedValue(ok(rounds));
    api.POST.mockResolvedValue(ok(round()));
    api.DELETE.mockResolvedValue({ response: new Response(null, { status: 204 }) });
  });

  it("lists the rounds taking orders, with products, deadline and orders", async () => {
    renderList();

    expect(
      screen.getByRole("heading", { name: "Đợt đặt trước của tôi" }),
    ).toBeInTheDocument();
    expect(tab("Đang mở")).toHaveAttribute("aria-selected", "true");
    const item = await row("Bánh bao tuần này");
    expect(item).toHaveTextContent(/18 món · Chốt \d{2}:00 \d{2}\/10\/2099 · 4 đơn/);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(api.GET).toHaveBeenCalledWith("/campaigns/mine");
  });

  it("offers view, summary, edit and close for an open round", async () => {
    renderList();

    const item = await row("Bánh bao tuần này");
    expect(within(item).getByRole("link", { name: "Xem" })).toHaveAttribute(
      "href",
      "/campaigns/c1",
    );
    expect(within(item).getByRole("link", { name: "Tổng hợp" })).toHaveAttribute(
      "href",
      "/sell/campaigns/c1",
    );
    expect(within(item).getByRole("link", { name: "Sửa" })).toHaveAttribute(
      "href",
      "/campaigns/c1/edit",
    );
    expect(within(item).getByRole("button", { name: "Đóng đợt" })).toBeInTheDocument();
    expect(
      within(item).queryByRole("button", { name: "Mở lại đợt" }),
    ).not.toBeInTheDocument();
  });

  it("shows drafts under their tab with edit, publish and delete", async () => {
    renderList();
    await row("Bánh bao tuần này");

    await userEvent.click(tab("Nháp"));

    const item = await row("Chè cuối tuần");
    expect(tab("Nháp")).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(item).toHaveTextContent(/1 món · Chốt .* · 0 đơn/);
    expect(within(item).getByRole("link", { name: "Sửa" })).toHaveAttribute(
      "href",
      "/campaigns/c2/edit",
    );
    expect(within(item).getByRole("button", { name: "Đăng" })).toBeInTheDocument();
    expect(within(item).getByRole("button", { name: "Xóa nháp" })).toBeInTheDocument();
    expect(within(item).queryByRole("link", { name: "Tổng hợp" })).not.toBeInTheDocument();
    expect(within(item).queryByRole("link", { name: "Xem" })).not.toBeInTheDocument();
  });

  it("shows closed rounds and open rounds past their deadline under closed", async () => {
    location.search = "tab=closed";
    renderList();

    const closed = await row("Hoa quả tuần 40");
    const expired = await row("Xôi sáng thứ hai");
    expect(tab("Đã đóng")).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    expect(within(closed).getByRole("link", { name: "Tổng hợp" })).toBeInTheDocument();
    expect(within(closed).getByRole("button", { name: "Mở lại đợt" })).toBeInTheDocument();
    expect(within(closed).queryByRole("link", { name: "Sửa" })).not.toBeInTheDocument();
    expect(within(closed).queryByRole("button", { name: "Đóng đợt" })).not.toBeInTheDocument();
    expect(closed).not.toHaveTextContent("Đã hết hạn");

    // An expired round can still get a later deadline, be closed or be copied.
    expect(expired).toHaveTextContent("Đã hết hạn");
    expect(within(expired).getByRole("link", { name: "Sửa" })).toBeInTheDocument();
    expect(within(expired).getByRole("button", { name: "Đóng đợt" })).toBeInTheDocument();
    expect(within(expired).getByRole("button", { name: "Mở lại đợt" })).toBeInTheDocument();
  });

  it("follows the tab in the URL and ignores an unknown one", async () => {
    location.search = "tab=draft";
    renderList();
    expect(await row("Chè cuối tuần")).toBeInTheDocument();
  });

  it("opens on the open tab for an unknown tab in the URL", async () => {
    location.search = "tab=archive";
    renderList();
    expect(await row("Bánh bao tuần này")).toBeInTheDocument();
  });

  it("says when a tab has no rounds", async () => {
    api.GET.mockResolvedValue(ok([]));
    renderList();

    expect(
      await screen.findByText("Bạn chưa có đợt đặt trước nào đang mở."),
    ).toBeInTheDocument();
    await userEvent.click(tab("Nháp"));
    expect(screen.getByText("Bạn không có đợt nháp nào.")).toBeInTheDocument();
    await userEvent.click(tab("Đã đóng"));
    expect(screen.getByText("Bạn chưa có đợt nào đã đóng.")).toBeInTheDocument();
  });

  it("closes a round only after confirmation", async () => {
    renderList();
    const item = await row("Bánh bao tuần này");

    await userEvent.click(within(item).getByRole("button", { name: "Đóng đợt" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Đóng đợt đặt trước?");
    expect(dialog).toHaveTextContent("“Bánh bao tuần này”");
    expect(api.POST).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Đóng đợt" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã đóng đợt"));
    expect(api.POST).toHaveBeenCalledWith("/campaigns/{id}/close", {
      params: { path: { id: "c1" } },
    });
  });

  it("does nothing when closing is declined", async () => {
    renderList();
    const item = await row("Bánh bao tuần này");

    await userEvent.click(within(item).getByRole("button", { name: "Đóng đợt" }));
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

  it("reopens a finished round as a new draft and opens it for review", async () => {
    location.search = "tab=closed";
    api.POST.mockResolvedValue(ok(round({ id: "c9", status: "draft", isOpen: false })));
    renderList();
    const item = await row("Hoa quả tuần 40");

    await userEvent.click(within(item).getByRole("button", { name: "Mở lại đợt" }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/campaigns/c9/edit?reopened=1"),
    );
    expect(api.POST).toHaveBeenCalledWith("/campaigns/{id}/reopen", {
      params: { path: { id: "c3" } },
    });
  });

  it("deletes a draft only after confirmation", async () => {
    location.search = "tab=draft";
    renderList();
    const item = await row("Chè cuối tuần");

    await userEvent.click(within(item).getByRole("button", { name: "Xóa nháp" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Xóa đợt nháp?");
    expect(dialog).toHaveTextContent("“Chè cuối tuần”");
    expect(api.DELETE).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Xóa nháp" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã xóa đợt nháp"));
    expect(api.DELETE).toHaveBeenCalledWith("/campaigns/{id}", {
      params: { path: { id: "c2" } },
    });
  });

  it("publishes a draft from the list", async () => {
    location.search = "tab=draft";
    renderList();
    const item = await row("Chè cuối tuần");

    await userEvent.click(within(item).getByRole("button", { name: "Đăng" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã đăng đợt"));
    expect(api.POST).toHaveBeenCalledWith("/campaigns/{id}/publish", {
      params: { path: { id: "c2" } },
    });
  });

  it.each([
    ["publishing", "Đăng", "tab=draft", "Chè cuối tuần"],
    ["reopening", "Mở lại đợt", "tab=closed", "Hoa quả tuần 40"],
  ])("shows a translated message when %s fails", async (_name, button, search, title) => {
    location.search = search;
    api.POST.mockResolvedValue(fail(422, "BANK_PROFILE_REQUIRED"));
    renderList();
    const item = await row(title);

    await userEvent.click(within(item).getByRole("button", { name: button }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Bạn cần thêm thông tin ngân hàng trước khi nhận thanh toán qua QR.",
      ),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows a translated message when deleting fails", async () => {
    location.search = "tab=draft";
    api.DELETE.mockResolvedValue(fail(409, "INVALID_LISTING_STATE"));
    renderList();
    const item = await row("Chè cuối tuần");

    await userEvent.click(within(item).getByRole("button", { name: "Xóa nháp" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Xóa nháp",
      }),
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("offers a retry when the rounds cannot be loaded", async () => {
    api.GET.mockResolvedValueOnce(fail(500, "INTERNAL"));
    renderList();

    expect(
      await screen.findByText("Không tải được các đợt đặt trước của bạn."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await row("Bánh bao tuần này")).toBeInTheDocument();
  });

  it("speaks English", async () => {
    renderWithIntl(
      <QueryProvider>
        <MyCampaigns />
      </QueryProvider>,
      { locale: "en" },
    );

    const item = await row("Bánh bao tuần này");
    expect(
      screen.getByRole("heading", { name: "My pre-order rounds" }),
    ).toBeInTheDocument();
    expect(item).toHaveTextContent(/18 products · Closes .* · 4 orders/);
    expect(within(item).getByRole("button", { name: "Close round" })).toBeInTheDocument();
  });
});
