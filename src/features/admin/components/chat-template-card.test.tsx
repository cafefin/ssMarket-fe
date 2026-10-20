import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { ChatTemplate } from "../api/use-chat-channel";
import { ChatTemplateCard } from "./chat-template-card";

const { api, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), PUT: vi.fn(), POST: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));

const opened: ChatTemplate = {
  eventType: "campaign.opened",
  enabled: true,
  template: "Mở: {{sellerName}}",
  variables: ["sellerName", "title", "url"],
  defaultTemplate: "DEFAULT {{title}}",
  updatedAt: "2026-10-20T00:00:00.000Z",
};
const digest: ChatTemplate = {
  eventType: "chat.digest",
  enabled: false,
  template: "{{count}} tin: {{items}}",
  variables: ["count", "items"],
  defaultTemplate: "{{count}}",
  updatedAt: "2026-10-20T00:00:00.000Z",
};

function setup(template: ChatTemplate = opened) {
  api.POST.mockImplementation(async (path: string) =>
    path.endsWith("/preview")
      ? { data: { message: "PREVIEW TEXT" } }
      : { data: { message: "[Thử] x" } },
  );
  api.PUT.mockResolvedValue({ data: template });
  renderWithIntl(
    <QueryProvider>
      <ChatTemplateCard template={template} />
    </QueryProvider>,
  );
}

const box = () => screen.getByRole("textbox", { name: "Mẫu tin" });
const previewCalls = () =>
  api.POST.mock.calls.filter(([p]) => String(p).endsWith("/preview"));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("ChatTemplateCard", () => {
  it("shows the title, the switch and one button per variable", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "Đợt đặt trước mới mở" }),
    ).toBeVisible();
    expect(screen.getByRole("switch", { name: "Gửi loại tin này" })).toBeChecked();
    for (const name of ["sellerName", "title", "url"]) {
      expect(
        screen.getByRole("button", { name: `{{${name}}}` }),
      ).toBeVisible();
    }
  });

  it("inserts a variable at the caret", async () => {
    setup();
    const user = userEvent.setup();
    const textarea = box() as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(4, 4);
    await user.click(screen.getByRole("button", { name: "{{title}}" }));
    expect(textarea.value).toBe("Mở: {{title}}{{sellerName}}");
  });

  it("flags unknown variables, disables the buttons and skips the preview", async () => {
    setup();
    fireEvent.change(box(), { target: { value: "x {{price}}" } });
    expect(
      screen.getByText("Biến không dùng được cho loại tin này: price"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Lưu mẫu" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Gửi thử" })).toBeDisabled();
    await new Promise((r) => setTimeout(r, 600));
    expect(
      previewCalls().filter(([, o]) => o.body.template.includes("price")),
    ).toHaveLength(0);
  });

  it("previews a valid template after the debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup();
    fireEvent.change(box(), { target: { value: "Mới {{title}}" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(
      previewCalls().filter(([, o]) => o.body.template === "Mới {{title}}"),
    ).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    const region = await screen.findByRole("region", { name: "Xem trước" });
    await waitFor(() => expect(region).toHaveTextContent("PREVIEW TEXT"));
    expect(
      previewCalls().some(([, o]) => o.body.template === "Mới {{title}}"),
    ).toBe(true);
  });

  it("restores the default without saving", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Khôi phục mặc định" }));
    expect(box()).toHaveValue("DEFAULT {{title}}");
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it("saves enabled and template", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Gửi loại tin này" }));
    fireEvent.change(box(), { target: { value: "Mới {{title}}" } });
    await user.click(screen.getByRole("button", { name: "Lưu mẫu" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã lưu mẫu"));
    expect(api.PUT).toHaveBeenCalledWith(
      "/admin/chat-channel/templates/{eventType}",
      expect.objectContaining({
        body: { enabled: false, template: "Mới {{title}}" },
      }),
    );
  });

  it("shows the user message for a 422 on save", async () => {
    setup();
    api.PUT.mockResolvedValue({
      error: { code: "INVALID_CHAT_TEMPLATE" },
      response: { status: 422 },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Lưu mẫu" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Mẫu tin chưa hợp lệ"),
      ),
    );
  });

  it("sends a test with the current text", async () => {
    setup();
    const user = userEvent.setup();
    fireEvent.change(box(), { target: { value: "Thử {{title}}" } });
    await user.click(screen.getByRole("button", { name: "Gửi thử" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Đã gửi tin thử vào space"),
    );
    expect(api.POST).toHaveBeenCalledWith(
      "/admin/chat-channel/templates/{eventType}/test",
      expect.objectContaining({ body: { template: "Thử {{title}}" } }),
    );
  });

  it("shows the message when no webhook is set", async () => {
    setup();
    api.POST.mockImplementation(async (path: string) =>
      path.endsWith("/test")
        ? {
            error: { code: "CHAT_WEBHOOK_NOT_SET" },
            response: { status: 409 },
          }
        : { data: { message: "p" } },
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gửi thử" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Chưa có webhook"),
      ),
    );
  });

  it("counts characters and rejects more than 1000", () => {
    setup();
    fireEvent.change(box(), { target: { value: "a".repeat(123) } });
    expect(screen.getByText("123/1000")).toBeVisible();
    fireEvent.change(box(), { target: { value: "a".repeat(1001) } });
    expect(screen.getByText("Tối đa 1000 ký tự.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Lưu mẫu" })).toBeDisabled();
  });

  it("renders the digest card", () => {
    setup(digest);
    expect(
      screen.getByRole("heading", { name: "Bảng tin tổng hợp mỗi giờ" }),
    ).toBeVisible();
    expect(screen.getByRole("switch", { name: "Gửi bảng tin" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "{{count}}" })).toBeVisible();
    expect(screen.getByRole("button", { name: "{{items}}" })).toBeVisible();
  });
});
