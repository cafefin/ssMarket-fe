import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { ChatChannelAdmin } from "./chat-channel-admin";

const { api, router } = vi.hoisted(() => ({
  api: { GET: vi.fn(), PUT: vi.fn(), POST: vi.fn() },
  router: { replace: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const tpl = (eventType: string, variables: string[]) => ({
  eventType,
  enabled: true,
  template: "x",
  variables,
  defaultTemplate: "x",
  updatedAt: "2026-10-20T00:00:00.000Z",
});
const channel = {
  enabled: true,
  hasWebhook: true,
  webhookHint: "WXYZ",
  maxPerHour: 10,
  sellerCooldownMinutes: 5,
  updatedAt: "2026-10-20T00:00:00.000Z",
  templates: [
    tpl("campaign.opened", ["title"]),
    tpl("campaign.reopened", ["title"]),
    tpl("listing.published", ["title"]),
    tpl("chat.digest", ["count", "items"]),
  ],
};

function setup(role: "admin" | "user", channelResult: unknown = { data: channel }) {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/users/me") return { data: { id: "u1", name: "An", role } };
    if (path === "/admin/chat-channel") return channelResult;
    return { data: { items: [], nextCursor: null } };
  });
  renderWithIntl(
    <QueryProvider>
      <ChatChannelAdmin />
    </QueryProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("ChatChannelAdmin", () => {
  it("sends a non-admin home and shows nothing", async () => {
    setup("user");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(api.GET).not.toHaveBeenCalledWith(
      "/admin/chat-channel",
      expect.anything(),
    );
  });

  it("shows settings, four template cards with the digest last, and the log", async () => {
    setup("admin");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Kênh Google Chat" }),
    ).toBeVisible();
    expect(await screen.findByRole("heading", { level: 2, name: "Cài đặt" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Mẫu tin" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Nhật ký gửi tin" })).toBeVisible();
    const titles = (await screen.findAllByRole("heading", { level: 3 })).map(
      (h) => h.textContent,
    );
    expect(titles).toEqual([
      "Đợt đặt trước mới mở",
      "Đợt đặt trước mở lại",
      "Món có sẵn mới đăng",
      "Bảng tin tổng hợp mỗi giờ",
    ]);
  });

  it("offers a retry when the channel cannot be loaded", async () => {
    setup("admin", { error: { code: "X" }, response: { status: 500 } });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tải được cài đặt kênh.",
    );
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeVisible();
  });
});
