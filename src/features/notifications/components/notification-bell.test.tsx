import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { NotificationBell } from "./notification-bell";

const { api, router } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  router: { push: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function mockCount(count: number) {
  api.GET.mockImplementation(async (path: string) =>
    path === "/notifications/unread-count"
      ? { data: { count }, response: new Response() }
      : { data: { items: [], nextCursor: null }, response: new Response() },
  );
}

function setup(count: number, locale?: "en") {
  mockCount(count);
  renderWithIntl(
    <QueryProvider>
      <NotificationBell />
    </QueryProvider>,
    locale ? { locale } : undefined,
  );
}

describe("NotificationBell", () => {
  beforeEach(() => vi.resetAllMocks());

  it("is a plain button with no badge when nothing is unread", async () => {
    setup(0);
    expect(
      await screen.findByRole("button", { name: "Thông báo" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the unread count in the name and the badge", async () => {
    setup(3);
    expect(
      await screen.findByRole("button", { name: "Thông báo, 3 chưa đọc" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("caps the badge at 99+", async () => {
    setup(150);
    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("speaks English", async () => {
    setup(3, "en");
    expect(
      await screen.findByRole("button", { name: "Notifications, 3 unread" }),
    ).toBeInTheDocument();
  });

  it("loads the list only once opened", async () => {
    const user = userEvent.setup();
    setup(3);
    await user.click(
      await screen.findByRole("button", { name: "Thông báo, 3 chưa đọc" }),
    );
    expect(await screen.findByRole("dialog", { name: "Thông báo" })).toBeInTheDocument();
    expect(
      await screen.findByText("Chưa có thông báo nào."),
    ).toBeInTheDocument();
    const paths = api.GET.mock.calls.map((c) => c[0]);
    expect(paths).toContain("/notifications");
  });

  it("does not call the list before opening", async () => {
    setup(3);
    await screen.findByRole("button", { name: "Thông báo, 3 chưa đọc" });
    expect(api.GET.mock.calls.map((c) => c[0])).toEqual([
      "/notifications/unread-count",
    ]);
  });
});
