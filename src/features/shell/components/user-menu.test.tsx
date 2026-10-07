import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/shared/api/client";
import { QueryProvider } from "@/shared/api/query-provider";
import { UserMenu } from "./user-menu";

const { router, api, cookie } = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
  api: { POST: vi.fn(), PATCH: vi.fn() },
  cookie: { write: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("@/shared/i18n/locale-cookie", () => ({
  writeLocaleCookie: cookie.write,
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const person = (role: "user" | "admin"): CurrentUser =>
  ({
    id: "u1",
    name: "An",
    email: "an@example.com",
    avatarUrl: null,
    role,
  }) as CurrentUser;

async function open(role: "user" | "admin") {
  const user = userEvent.setup();
  renderWithIntl(
    <QueryProvider>
      <UserMenu user={person(role)} />
    </QueryProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Tài khoản của An" }));
  return user;
}

describe("UserMenu", () => {
  it("offers category management to admins", async () => {
    const user = await open("admin");
    await user.click(
      await screen.findByRole("menuitem", { name: "Quản lý danh mục" }),
    );
    expect(router.push).toHaveBeenCalledWith("/admin/categories");
  });

  it("hides category management from other people", async () => {
    await open("user");
    expect(await screen.findByRole("menuitem", { name: "Hồ sơ" })).toBeVisible();
    expect(
      screen.queryByRole("menuitem", { name: "Quản lý danh mục" }),
    ).toBeNull();
  });

  it("switches to the other language, named in that language", async () => {
    api.PATCH.mockResolvedValue({
      data: { id: "u1", locale: "en" },
      response: new Response(),
    });
    const user = await open("user");

    await user.click(await screen.findByRole("menuitem", { name: "English" }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(api.PATCH).toHaveBeenCalledWith("/users/me", {
      body: { locale: "en" },
    });
    expect(cookie.write).toHaveBeenCalledWith("en");
  });
});
