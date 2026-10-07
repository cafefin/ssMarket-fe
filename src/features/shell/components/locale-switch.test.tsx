import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { Locale } from "@/shared/i18n/config";
import { LocaleSwitch } from "./locale-switch";

const { api, router, cookie, toast } = vi.hoisted(() => ({
  api: { PATCH: vi.fn() },
  router: { refresh: vi.fn() },
  cookie: { write: vi.fn() },
  toast: { error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/shared/i18n/locale-cookie", () => ({
  writeLocaleCookie: cookie.write,
}));
vi.mock("sonner", () => ({ toast }));

function renderSwitch(locale: Locale = "vi") {
  renderWithIntl(
    <QueryProvider>
      <LocaleSwitch />
    </QueryProvider>,
    { locale },
  );
}

describe("LocaleSwitch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("marks the current language as pressed and names each in its own language", () => {
    renderSwitch("vi");

    const group = screen.getByRole("group", { name: "Ngôn ngữ" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tiếng Việt" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const english = screen.getByRole("button", { name: "English" });
    expect(english).toHaveAttribute("aria-pressed", "false");
    expect(english).toHaveTextContent("EN");
    expect(english).toHaveAttribute("lang", "en");
  });

  it("saves the language, writes the cookie and re-renders the page", async () => {
    api.PATCH.mockResolvedValue({
      data: { id: "u1", locale: "en" },
      response: new Response(),
    });
    renderSwitch("vi");

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(api.PATCH).toHaveBeenCalledWith("/users/me", {
      body: { locale: "en" },
    });
    expect(cookie.write).toHaveBeenCalledWith("en");
  });

  it("does nothing when the current language is chosen again", async () => {
    renderSwitch("en");

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    expect(api.PATCH).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
  });

  it("keeps the language and explains when saving fails", async () => {
    api.PATCH.mockResolvedValue({
      data: undefined,
      error: { code: "TOO_MANY_REQUESTS" },
      response: new Response(null, { status: 429 }),
    });
    renderSwitch("vi");

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
      ),
    );
    expect(cookie.write).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
