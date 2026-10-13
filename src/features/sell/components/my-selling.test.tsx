import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { MySelling } from "./my-selling";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn(), POST: vi.fn() } }));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

function renderPage(locale?: "vi" | "en") {
  renderWithIntl(
    <QueryProvider>
      <MySelling />
    </QueryProvider>,
    { locale },
  );
}

const headings = () =>
  screen
    .getAllByRole("heading")
    .map((heading) => `${heading.tagName} ${heading.textContent}`);

describe("MySelling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.GET.mockResolvedValue({ data: [], response: new Response() });
  });

  it("titles the page first, then a section for rounds and one for listings", () => {
    renderPage();

    expect(headings()).toEqual([
      "H1 Bán hàng",
      "H2 Đợt đặt trước của tôi",
      "H2 Bài đăng của tôi",
    ]);
  });

  it("offers to sell something new next to the title", () => {
    renderPage();

    // The first one: an empty list of listings offers the same link again.
    const [link] = screen.getAllByRole("link", { name: "Đăng bán" });
    expect(link).toHaveAttribute("href", "/sell/new");
    expect(link.parentElement).toContainElement(
      screen.getByRole("heading", { level: 1 }),
    );
  });

  it("is titled in English on an English page", () => {
    renderPage("en");

    expect(headings()).toEqual([
      "H1 Selling",
      "H2 My pre-order rounds",
      "H2 My listings",
    ]);
  });
});
