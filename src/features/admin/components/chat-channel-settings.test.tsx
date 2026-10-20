import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import {
  CHAT_CHANNEL_QUERY_KEY,
  type ChatChannel,
  useChatChannel,
} from "../api/use-chat-channel";
import { ChatChannelSettings } from "./chat-channel-settings";

const { api, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), PUT: vi.fn(), POST: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));

const channel: ChatChannel = {
  enabled: true,
  hasWebhook: true,
  webhookHint: "WXYZ",
  maxPerHour: 10,
  sellerCooldownMinutes: 5,
  updatedAt: "2026-10-20T00:00:00.000Z",
  templates: [],
};

const WEBHOOK = "https://chat.googleapis.com/v1/spaces/AAA/messages?key=k";

function setup(overrides: Partial<ChatChannel> = {}, locale: "vi" | "en" = "vi") {
  api.PUT.mockResolvedValue({ data: { ...channel, ...overrides } });
  renderWithIntl(
    <QueryProvider>
      <ChatChannelSettings channel={{ ...channel, ...overrides }} />
    </QueryProvider>,
    { locale },
  );
  return userEvent.setup();
}

beforeEach(() => vi.clearAllMocks());

describe("ChatChannelSettings", () => {
  it("shows the switch and the stored webhook hint, never a URL", () => {
    setup();
    expect(
      screen.getByRole("switch", { name: "Bật kênh Google Chat" }),
    ).toBeChecked();
    expect(
      screen.getByText("Đã có webhook, kết thúc bằng …WXYZ"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Thay webhook" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Xóa webhook" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Webhook Google Chat")).toBeNull();
  });

  it("says there is no webhook and offers the input at once", () => {
    setup({ hasWebhook: false, webhookHint: null, enabled: false });
    expect(screen.getByText("Chưa có webhook.")).toBeInTheDocument();
    expect(screen.getByLabelText("Webhook Google Chat")).toBeInTheDocument();
  });

  it("replaces the webhook", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Thay webhook" }));
    await user.type(screen.getByLabelText("Webhook Google Chat"), WEBHOOK);
    await user.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith("/admin/chat-channel", {
      body: {
        enabled: true,
        maxPerHour: 10,
        sellerCooldownMinutes: 5,
        webhookUrl: WEBHOOK,
      },
    });
    expect(toast.success).toHaveBeenCalledWith("Đã lưu cài đặt");
  });

  it("keeps the old webhook after choosing to replace", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Thay webhook" }));
    await user.click(screen.getByRole("button", { name: "Giữ webhook cũ" }));
    expect(screen.queryByLabelText("Webhook Google Chat")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect("webhookUrl" in api.PUT.mock.calls[0][1].body).toBe(false);
  });

  it("removes the webhook", async () => {
    const user = setup();
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Xóa webhook" }));
    await user.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT.mock.calls[0][1].body).toMatchObject({
      enabled: false,
      webhookUrl: null,
    });
  });

  it("sends no limit when unlimited", async () => {
    const user = setup();
    const number = screen.getByLabelText("Số tin tối đa mỗi giờ");
    await user.click(screen.getByRole("checkbox", { name: "Không giới hạn" }));
    expect(number).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT.mock.calls[0][1].body.maxPerHour).toBeNull();
  });

  it("shows the digest hint under the limits", () => {
    setup();
    expect(
      screen.getByText(
        "Tin vượt giới hạn sẽ được gửi gộp trong bảng tin đầu giờ sau.",
      ),
    ).toBeInTheDocument();
  });

  it("shows field errors and sends nothing for invalid values", async () => {
    const user = setup();
    const number = screen.getByLabelText("Số tin tối đa mỗi giờ");
    await user.clear(number);
    await user.type(number, "61");
    const cooldown = screen.getByLabelText("Giãn cách cho mỗi người bán (phút)");
    await user.clear(cooldown);
    await user.type(cooldown, "-1");
    await user.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    expect(
      await screen.findByText(
        "Nhập số nguyên từ 1 đến 60, hoặc chọn Không giới hạn.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nhập số nguyên từ 0 đến 1440."),
    ).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it("clears the hourly limit error when unlimited is chosen", async () => {
    const user = setup();
    const number = screen.getByLabelText("Số tin tối đa mỗi giờ");
    await user.clear(number);
    await user.type(number, "61");
    await user.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    const message = "Nhập số nguyên từ 1 đến 60, hoặc chọn Không giới hạn.";
    expect(await screen.findByText(message)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Không giới hạn" }));
    await waitFor(() => expect(screen.queryByText(message)).toBeNull());
  });

  it("shows the saved webhook state at once, before any refetch", async () => {
    api.GET.mockImplementation(() => new Promise(() => {}));
    function Probe() {
      const { data } = useChatChannel();
      return data ? (
        <ChatChannelSettings channel={data} />
      ) : null;
    }
    const gate = new QueryClient();
    gate.setQueryData(CHAT_CHANNEL_QUERY_KEY, channel);
    api.PUT.mockResolvedValue({
      data: { ...channel, hasWebhook: false, webhookHint: null },
    });
    renderWithIntl(
      <QueryClientProvider client={gate}>
        <Probe />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Xóa webhook" }));
    await user.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(gate.getQueryData(CHAT_CHANNEL_QUERY_KEY)).toMatchObject({
      hasWebhook: false,
    });
    expect(await screen.findByLabelText("Webhook Google Chat")).toBeInTheDocument();
    expect(screen.queryByText(/Đã có webhook/)).toBeNull();
  });

  it("refuses a webhook with the wrong prefix", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Thay webhook" }));
    await user.type(
      screen.getByLabelText("Webhook Google Chat"),
      "https://example.com",
    );
    await user.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    expect(
      await screen.findByText(
        "Webhook phải bắt đầu bằng https://chat.googleapis.com/v1/spaces/.",
      ),
    ).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it("shows the user message for a 422, not the problems", async () => {
    api.PUT.mockResolvedValue({
      error: {
        code: "INVALID_CHAT_SETTINGS",
        details: { problems: ["maxPerHour must be <= 60"] },
      },
      response: { status: 422 },
    });
    const user = userEvent.setup();
    renderWithIntl(
      <QueryProvider>
        <ChatChannelSettings channel={channel} />
      </QueryProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Cài đặt chưa hợp lệ. Kiểm tra lại các ô đã nhập.",
      ),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("speaks English", () => {
    setup({}, "en");
    expect(
      screen.getByRole("switch", { name: "Turn on the Google Chat channel" }),
    ).toBeInTheDocument();
  });
});
