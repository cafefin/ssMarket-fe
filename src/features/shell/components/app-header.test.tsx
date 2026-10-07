import { screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { AppHeader } from "./app-header";

const { api, router, location } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  router: { push: vi.fn(), replace: vi.fn() },
  location: { pathname: "/", search: "" },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => location.pathname,
  useSearchParams: () => new URLSearchParams(location.search),
}));

const user = {
  id: "1",
  email: "an@example.com",
  name: "Nguyen Van A",
  avatarUrl: null,
  role: "user",
};

function renderHeader() {
  renderWithIntl(
    <QueryProvider>
      <AppHeader />
    </QueryProvider>,
  );
}

const searchBox = () => screen.getByRole("searchbox", { name: "Tìm kiếm bài đăng" });
const openMenu = async () =>
  userEvent.click(
    await screen.findByRole("button", { name: "Tài khoản của Nguyen Van A" }),
  );

describe("AppHeader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    location.pathname = "/";
    location.search = "";
    api.GET.mockResolvedValue({ data: user, response: new Response() });
    api.POST.mockResolvedValue({
      response: new Response(null, { status: 204 }),
    });
  });

  it("links the wordmark home and offers the sell action", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "ssMarket" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Đăng bán" })).toHaveAttribute(
      "href",
      "/sell/new",
    );
  });

  it("shows the sell link from md up and the wordmark from lg up", () => {
    renderHeader();

    const sell = screen.getByRole("link", { name: "Đăng bán" });
    expect(sell).toHaveClass("max-md:hidden");
    expect(sell).not.toHaveClass("hidden");
    expect(screen.getByRole("img", { name: "ssMarket" })).toHaveClass(
      "lg:inline",
    );
  });

  it("shows the main navigation and marks the current section", () => {
    location.pathname = "/orders/123";

    renderHeader();

    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(within(nav).getByRole("link", { name: "Trang chủ" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(nav).getByRole("link", { name: "Đơn mua" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Bán hàng" }),
    ).not.toHaveAttribute("aria-current");
  });

  describe("search", () => {
    it("shows the query from the URL", () => {
      location.search = "q=hoa+quả";

      renderHeader();

      expect(searchBox()).toHaveValue("hoa quả");
    });

    it("goes to the home page with the trimmed query", async () => {
      location.pathname = "/sell";
      renderHeader();

      await userEvent.type(searchBox(), "  loa cũ {Enter}");

      expect(router.push).toHaveBeenCalledWith("/?q=loa+c%C5%A9");
    });

    it("keeps the other filters when searching on the home page", async () => {
      location.search = "category=dien-tu&mode=in_stock";
      renderHeader();

      await userEvent.type(searchBox(), "loa{Enter}");

      expect(router.push).toHaveBeenCalledWith(
        "/?category=dien-tu&mode=in_stock&q=loa",
      );
    });

    it("clears the query when the box is emptied", async () => {
      location.search = "q=loa&mode=preorder";
      renderHeader();

      await userEvent.clear(searchBox());
      await userEvent.type(searchBox(), "{Enter}");

      expect(router.push).toHaveBeenCalledWith("/?mode=preorder");
    });
  });

  describe("user menu", () => {
    it("is hidden until the user is loaded", () => {
      api.GET.mockReturnValue(new Promise(() => undefined));

      renderHeader();

      expect(
        screen.queryByRole("button", { name: /Tài khoản/ }),
      ).not.toBeInTheDocument();
    });

    it("shows who is signed in and where they can go", async () => {
      renderHeader();

      await openMenu();

      expect(await screen.findByText("an@example.com")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("menuitem", { name: "Hồ sơ" }));
      expect(router.push).toHaveBeenCalledWith("/profile");
    });

    it("links to the seller's listings", async () => {
      renderHeader();

      await openMenu();
      await userEvent.click(
        await screen.findByRole("menuitem", { name: "Bài đăng của tôi" }),
      );

      expect(router.push).toHaveBeenCalledWith("/sell");
    });

    it("signs out through the API and returns to the login page", async () => {
      renderHeader();

      await openMenu();
      await userEvent.click(
        await screen.findByRole("menuitem", { name: "Đăng xuất" }),
      );

      expect(api.POST).toHaveBeenCalledWith("/auth/logout");
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    });
  });
});
