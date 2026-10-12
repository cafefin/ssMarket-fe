import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { QueryProvider } from "@/shared/api/query-provider";
import { CampaignGrid } from "./campaign-grid";
import { campaignSummary } from "./campaign-fixtures";

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }));
vi.mock("@/shared/api/client", () => ({ api }));

import type { CampaignFilters } from "../api/use-campaigns";

const NONE: CampaignFilters = { q: "", category: null, minPrice: null, maxPrice: null };
const ok = (data: unknown) => ({ data, response: new Response() });
const page = (ids: string[], nextCursor: string | null = null) => ({
  items: ids.map((id) => campaignSummary(id, { title: `Đợt ${id}` })),
  nextCursor,
});

function renderGrid(filters: Partial<CampaignFilters> = {}) {
  renderWithIntl(
    <QueryProvider>
      <CampaignGrid filters={{ ...NONE, ...filters }} />
    </QueryProvider>,
  );
}

describe("CampaignGrid", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows skeletons while loading, then the rounds", async () => {
    api.GET.mockResolvedValue(ok(page(["a", "b"])));
    renderGrid();

    expect(screen.getByLabelText("Đang tải các đợt")).toBeInTheDocument();
    expect(await screen.findByText("Đợt a")).toBeInTheDocument();
    expect(screen.getByText("Đợt b")).toBeInTheDocument();
    expect(screen.queryByLabelText("Đang tải các đợt")).not.toBeInTheDocument();
  });

  it("loads the next page with the cursor", async () => {
    api.GET.mockResolvedValueOnce(ok(page(["a"], "cur1")));
    api.GET.mockResolvedValueOnce(ok(page(["b"])));
    renderGrid();

    await userEvent.click(
      await screen.findByRole("button", { name: "Xem thêm" }),
    );

    expect(await screen.findByText("Đợt b")).toBeInTheDocument();
    expect(screen.getByText("Đợt a")).toBeInTheDocument();
    expect(api.GET).toHaveBeenLastCalledWith("/campaigns", {
      params: { query: expect.objectContaining({ cursor: "cur1" }) },
    });
  });

  it("passes the filters to the API", async () => {
    api.GET.mockResolvedValue(ok(page([])));
    renderGrid({ q: "cam", category: "thuc-pham-tuoi", minPrice: 1000, maxPrice: 9000 });

    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(api.GET).toHaveBeenCalledWith("/campaigns", {
      params: {
        query: {
          q: "cam",
          category: "thuc-pham-tuoi",
          minPrice: 1000,
          maxPrice: 9000,
          cursor: undefined,
        },
      },
    });
  });

  it("offers to clear the filters when they leave nothing", async () => {
    api.GET.mockResolvedValue(ok(page([])));
    renderGrid({ category: "dien-tu" });

    expect(
      await screen.findByRole("heading", { name: "Chưa có đợt nào khớp bộ lọc" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xóa bộ lọc" })).toHaveAttribute(
      "href",
      "/?mode=campaign",
    );
  });

  it("clears the search too", async () => {
    api.GET.mockResolvedValue(ok(page([])));
    renderGrid({ q: "cam" });

    expect(await screen.findByRole("link", { name: "Xóa bộ lọc" })).toHaveAttribute(
      "href",
      "/?mode=campaign",
    );
  });

  it("has a plain empty state without filters", async () => {
    api.GET.mockResolvedValue(ok(page([])));
    renderGrid();

    expect(
      await screen.findByRole("heading", { name: "Chưa có đợt đặt trước nào" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Xóa bộ lọc" }),
    ).not.toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    api.GET.mockResolvedValueOnce({
      error: { code: "INTERNAL_SERVER_ERROR" },
      response: new Response(null, { status: 500 }),
    });
    api.GET.mockResolvedValueOnce(ok(page(["a"])));
    renderGrid();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tải được các đợt đặt trước.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Đợt a")).toBeInTheDocument();
  });
});
