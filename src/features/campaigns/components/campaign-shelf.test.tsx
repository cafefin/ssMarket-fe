import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { QueryProvider } from "@/shared/api/query-provider";
import { CampaignShelf } from "./campaign-shelf";
import { campaignSummary } from "./campaign-fixtures";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }));
vi.mock("@/shared/api/client", () => ({ api }));

function serve(ids: string[]) {
  api.GET.mockResolvedValue({
    data: {
      items: ids.map((id) => campaignSummary(id, { title: `Đợt ${id}` })),
      nextCursor: null,
    },
    response: new Response(),
  });
}

function renderShelf() {
  renderWithIntl(
    <QueryProvider>
      <CampaignShelf />
    </QueryProvider>,
  );
}

const shelf = () =>
  screen.findByRole("region", { name: "Đợt đặt trước sắp chốt" });

describe("CampaignShelf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // jsdom does not implement element scrolling.
    Element.prototype.scrollBy = vi.fn();
  });

  it("lists the rounds the server returns, in its order", async () => {
    serve(["b", "a", "c"]);
    renderShelf();

    const region = await shelf();
    const hrefs = within(region)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href) => href?.startsWith("/campaigns/"));
    expect(hrefs).toEqual(["/campaigns/b", "/campaigns/a", "/campaigns/c"]);
    expect(api.GET).toHaveBeenCalledWith("/campaigns", {
      params: { query: { limit: 10 } },
    });
  });

  it("links to all rounds", async () => {
    serve(["a"]);
    renderShelf();
    expect(
      within(await shelf()).getByRole("link", { name: "Xem tất cả" }),
    ).toHaveAttribute("href", "/?mode=campaign");
  });

  it("renders nothing when there is no round", async () => {
    serve([]);
    renderShelf();

    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("disables both arrows when every card fits", async () => {
    serve(["a"]);
    renderShelf();
    const region = await shelf();
    const previous = within(region).getByRole("button", {
      name: "Xem các đợt trước",
    });
    const next = within(region).getByRole("button", {
      name: "Xem các đợt tiếp theo",
    });

    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(next);
    expect(within(region).getByRole("list").scrollBy).not.toHaveBeenCalled();
  });

  describe("when the row overflows", () => {
    afterEach(() => {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth");
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    });

    it("slides with the arrows and disables the one at the edge", async () => {
      Object.defineProperties(HTMLElement.prototype, {
        scrollWidth: { get: () => 800, configurable: true },
        clientWidth: { get: () => 500, configurable: true },
      });
      serve(["a"]);
      renderShelf();
      const region = await shelf();
      const previous = within(region).getByRole("button", {
        name: "Xem các đợt trước",
      });
      const next = within(region).getByRole("button", {
        name: "Xem các đợt tiếp theo",
      });
      const row = within(region).getByRole("list");

      expect(previous).toHaveAttribute("aria-disabled", "true");
      expect(next).not.toHaveAttribute("aria-disabled", "true");
      await userEvent.click(next);
      expect(row.scrollBy).toHaveBeenCalledWith({ left: 400 });

      Object.defineProperty(row, "scrollLeft", {
        value: 300,
        configurable: true,
      });
      fireEvent.scroll(row);

      expect(next).toHaveAttribute("aria-disabled", "true");
      expect(previous).not.toHaveAttribute("aria-disabled", "true");
      await userEvent.click(previous);
      expect(row.scrollBy).toHaveBeenLastCalledWith({ left: -400 });
    });
  });
});
