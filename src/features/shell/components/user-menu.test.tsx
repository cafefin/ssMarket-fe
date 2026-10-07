import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/shared/api/client";
import { QueryProvider } from "@/shared/api/query-provider";
import { UserMenu } from "./user-menu";

const { router } = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api: { POST: vi.fn() } }));
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
  render(
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
});
