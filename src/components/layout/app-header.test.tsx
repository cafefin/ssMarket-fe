import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/query-provider";
import { AppHeader } from "./app-header";

const { api, replace } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  replace: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const user = {
  id: "1",
  email: "an@example.com",
  name: "Nguyen Van A",
  avatarUrl: null,
  role: "user",
};

function renderHeader() {
  render(
    <QueryProvider>
      <AppHeader />
    </QueryProvider>,
  );
}

describe("AppHeader", () => {
  beforeEach(() => {
    api.GET.mockReset().mockResolvedValue({
      data: user,
      response: new Response(),
    });
    api.POST.mockReset().mockResolvedValue({
      response: new Response(null, { status: 204 }),
    });
    replace.mockReset();
  });

  it("shows the product name and the signed-in user", async () => {
    renderHeader();

    expect(screen.getByLabelText("ssMarket")).toBeInTheDocument();
    expect(await screen.findByText("Nguyen Van A")).toBeInTheDocument();
    expect(screen.getByText("NA")).toBeInTheDocument();
  });

  it("signs out through the API and returns to the login page", async () => {
    renderHeader();
    await screen.findByText("Nguyen Van A");

    await userEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));

    expect(api.POST).toHaveBeenCalledWith("/auth/logout");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("still offers sign-out while the user is loading", () => {
    api.GET.mockReturnValue(new Promise(() => undefined));

    renderHeader();

    expect(
      screen.getByRole("button", { name: "Đăng xuất" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nguyen Van A")).not.toBeInTheDocument();
  });
});
