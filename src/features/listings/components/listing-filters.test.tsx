import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { type ListingFilters as Filters, NO_FILTERS } from "../lib/filters";
import { ListingFilters } from "./listing-filters";

const categories = [
  { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics", isPerishable: false },
];

function renderFilters(
  filters: Partial<Filters> = {},
  options: { locale?: "vi" | "en"; busy?: boolean } = {},
) {
  renderWithIntl(
    <ListingFilters
      filters={{ ...NO_FILTERS, ...filters }}
      categories={categories}
      busy={options.busy}
    />,
    { locale: options.locale },
  );
}

describe("ListingFilters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("changes the URL in place on a plain click, without a navigation", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    renderFilters();

    const rounds = screen.getByRole("button", { name: "Đợt đặt trước" });
    expect(rounds).toHaveAttribute("href", "/?mode=campaign");
    await userEvent.click(rounds);

    expect(pushState).toHaveBeenCalledWith(null, "", "/?mode=campaign");
  });

  it("leaves a modified click to the browser, so a new tab still works", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    renderFilters();

    const rounds = screen.getByRole("button", { name: "Đợt đặt trước" });
    // jsdom does not navigate; preventing the default keeps it quiet.
    rounds.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(rounds, { ctrlKey: true });

    expect(pushState).not.toHaveBeenCalled();
  });

  it("names price ranges briefly, on the chip and in the menu", () => {
    renderFilters({ minPrice: 200_000, maxPrice: 1_000_000 });

    expect(screen.getByText("200k – 1tr", { selector: "summary" })).toBeInTheDocument();
    for (const name of ["Dưới 50k", "50k – 200k", "200k – 1tr", "Từ 1tr"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("names price ranges briefly in English too", () => {
    renderFilters({ minPrice: 200_000, maxPrice: 1_000_000 }, { locale: "en" });

    expect(screen.getByText("200K – 1M", { selector: "summary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Under 50K" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "From 1M" })).toBeInTheDocument();
  });

  it.each<[string, Partial<Filters>]>([
    ["nothing is chosen", {}],
    ["only the mode is changed", { mode: "campaign" }],
    ["only a search is made", { q: "loa" }],
  ])("does not offer to clear filters when %s", (_, filters) => {
    renderFilters(filters);

    expect(screen.queryByRole("link", { name: "Xóa bộ lọc" })).not.toBeInTheDocument();
  });

  it.each<[string, Partial<Filters>]>([
    ["a category", { category: "dien-tu" }],
    ["a price range", { minPrice: null, maxPrice: 50_000 }],
    ["a condition", { minCondition: "good" }],
  ])("offers to clear filters once %s is chosen", (_, filters) => {
    renderFilters(filters);

    expect(screen.getByRole("link", { name: "Xóa bộ lọc" })).toHaveAttribute("href", "/");
  });

  it("clears category, price and condition but keeps the search and the mode", () => {
    renderFilters({
      q: "loa",
      mode: "campaign",
      view: "items",
      category: "dien-tu",
      minPrice: 50_000,
      maxPrice: 200_000,
    });

    expect(screen.getByRole("link", { name: "Xóa bộ lọc" })).toHaveAttribute(
      "href",
      "/?q=loa&mode=campaign&view=items",
    );
  });

  it("offers two selling modes, with the chosen one pressed", () => {
    renderFilters({ mode: "campaign" });

    const buttons = within(
      screen.getByRole("group", { name: "Hình thức bán" }),
    ).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Có sẵn",
      "Đợt đặt trước",
    ]);
    expect(buttons[0]).toHaveAttribute("href", "/");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("switches the round tab between rounds and products", () => {
    renderFilters({ mode: "campaign", q: "loa" });

    const group = screen.getByRole("group", { name: "Xem" });
    const [rounds, items] = within(group).getAllByRole("link");
    expect(rounds).toHaveTextContent("Đợt");
    expect(rounds).toHaveAttribute("href", "/?q=loa&mode=campaign");
    expect(rounds).toHaveAttribute("aria-current", "true");
    expect(items).toHaveTextContent("Món");
    expect(items).toHaveAttribute("href", "/?q=loa&mode=campaign&view=items");
    expect(items).not.toHaveAttribute("aria-current");
  });

  it("marks the product view as current", () => {
    renderFilters({ mode: "campaign", view: "items" });
    const [rounds, items] = within(
      screen.getByRole("group", { name: "Xem" }),
    ).getAllByRole("link");
    expect(items).toHaveAttribute("aria-current", "true");
    expect(rounds).not.toHaveAttribute("aria-current");
  });

  it("has no such switch on the in-stock tab", () => {
    renderFilters();
    expect(screen.queryByRole("group", { name: "Xem" })).not.toBeInTheDocument();
  });

  it("filters by condition for goods in stock only", () => {
    renderFilters();
    expect(screen.getByText("Độ mới", { selector: "summary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Từ 90% (Tốt)" })).toBeInTheDocument();
  });

  it("hides the condition menu for pre-order rounds", () => {
    renderFilters({ mode: "campaign" });

    expect(screen.queryByText("Độ mới", { selector: "summary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Từ 90% (Tốt)" })).not.toBeInTheDocument();
    expect(screen.getByText("Giá", { selector: "summary" })).toBeInTheDocument();
  });

  it("shows a progress bar only while new results load", () => {
    renderFilters({}, { busy: true });
    expect(screen.getByRole("progressbar", { name: "Đang lọc" })).toBeInTheDocument();
  });

  it("has no progress bar otherwise", () => {
    renderFilters();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
