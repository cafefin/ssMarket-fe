import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { ChatDelivery } from "../api/use-chat-channel";
import { ChatDeliveryLog } from "./chat-delivery-log";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }));
vi.mock("@/shared/api/client", () => ({ api }));

function row(over: Partial<ChatDelivery>): ChatDelivery {
  return {
    id: "d1",
    createdAt: "2026-10-20T10:00:00.000Z",
    eventType: "campaign.opened",
    sellerName: "Lan",
    outcome: "sent",
    message: "Tin gửi",
    error: null,
    digest: null,
    ...over,
  };
}

function setup(pages: { items: ChatDelivery[]; nextCursor: string | null }[]) {
  let i = 0;
  api.GET.mockImplementation(async () => ({ data: pages[i++] }));
  renderWithIntl(
    <QueryProvider>
      <ChatDeliveryLog />
    </QueryProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("ChatDeliveryLog", () => {
  it("lists deliveries with their outcome text", async () => {
    setup([
      {
        items: [
          row({ id: "1", outcome: "sent", message: "Tin gửi" }),
          row({ id: "2", outcome: "rate_limited_global", message: "Tin giữ", digest: "pending" }),
          row({ id: "3", outcome: "rate_limited_seller", message: "Tin giữ 2", digest: "included" }),
          row({ id: "4", outcome: "failed", message: null, error: "HTTP 500" }),
          row({ id: "5", outcome: "test", sellerName: null, eventType: "listing.published" }),
          row({ id: "6", outcome: "digest", sellerName: null, eventType: "chat.digest" }),
        ],
        nextCursor: null,
      },
    ]);
    const table = await screen.findByRole("table", { name: "Nhật ký gửi tin" });
    for (const h of ["Thời gian", "Loại", "Người bán", "Kết quả", "Nội dung"]) {
      expect(within(table).getByRole("columnheader", { name: h })).toBeVisible();
    }
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Đã gửi")).toBeVisible();
    expect(within(rows[0]).getByText("Đợt đặt trước mới mở")).toBeVisible();
    expect(within(rows[0]).getByText("Lan")).toBeVisible();
    expect(within(rows[1]).getByText("Vượt giới hạn giờ")).toBeVisible();
    expect(within(rows[1]).getByText("đang chờ bảng tin")).toBeVisible();
    expect(within(rows[2]).getByText("Giãn cách người bán")).toBeVisible();
    expect(within(rows[2]).getByText("đã vào bảng tin")).toBeVisible();
    expect(within(rows[3]).getByText("Lỗi")).toBeVisible();
    expect(within(rows[3]).getByText("HTTP 500")).toBeVisible();
    expect(within(rows[4]).getByText("Gửi thử")).toBeVisible();
    expect(within(rows[5]).getByText("Bảng tin")).toBeVisible();
    expect(within(rows[5]).getByText("Bảng tin tổng hợp mỗi giờ")).toBeVisible();
  });

  it("loads the next page on 'Xem thêm'", async () => {
    setup([
      { items: [row({ id: "1", message: "Trang một" })], nextCursor: "c1" },
      { items: [row({ id: "2", message: "Trang hai" })], nextCursor: null },
    ]);
    const user = userEvent.setup();
    expect(await screen.findByText("Trang một")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Xem thêm" }));
    expect(await screen.findByText("Trang hai")).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Xem thêm" })).toBeNull(),
    );
  });

  it("says so when there is nothing", async () => {
    setup([{ items: [], nextCursor: null }]);
    expect(await screen.findByText("Chưa có tin nào.")).toBeVisible();
  });
});
