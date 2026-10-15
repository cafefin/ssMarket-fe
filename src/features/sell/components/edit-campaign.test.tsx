import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignDetail } from "../api/use-my-campaigns";
import { EditCampaign } from "./edit-campaign";

const { campaignState, meState, location, mounts } = vi.hoisted(() => ({
  campaignState: { data: undefined as unknown, isPending: false, isError: false },
  meState: { data: undefined as unknown },
  location: { search: "" },
  mounts: { count: 0 },
}));
vi.mock("../api/use-my-campaigns", () => ({
  useMyCampaign: () => campaignState,
}));
vi.mock("@/shared/api/use-current-user", () => ({
  useCurrentUser: () => meState,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(location.search),
}));
vi.mock("./campaign-form", async () => {
  const { useState } = await import("react");
  return {
    CampaignForm: ({
      initialValues,
      campaign,
      onSaved,
    }: {
      initialValues: { title: string; items: { id: string; unitPrice: string }[] };
      campaign: { id: string };
      onSaved: () => void;
    }) => {
      // Counts mounts, so a test can tell a fresh form from a kept one.
      const [mount] = useState(() => (mounts.count += 1));
      return (
        <div>
          <p>
            form:{campaign.id}:{initialValues.title}:{initialValues.items[0].id}:
            {initialValues.items[0].unitPrice}:mount{mount}
          </p>
          <button type="button" onClick={onSaved}>
            saved
          </button>
        </div>
      );
    },
  };
});

const round = (overrides: Partial<CampaignDetail> = {}): CampaignDetail =>
  ({
    id: "c1",
    title: "Bánh bao tuần này",
    seller: { id: "me", name: "Tôi", handle: "toi", avatarUrl: null },
    category: { id: 2, slug: "thuc-pham-tuoi", name: "Thực phẩm tươi", nameEn: "Fresh food", isPerishable: true },
    orderDeadline: "2099-10-09T10:00:00.000Z",
    deliveryDate: "2099-10-12",
    description: "",
    status: "draft",
    isOpen: false,
    acceptsPrepaidQr: false,
    acceptsPayOnDelivery: true,
    items: [
      {
        id: "i1",
        title: "Bánh bao chay",
        description: "",
        unit: "cái",
        unitPrice: 15000,
        combos: [],
        images: [],
        selling: true,
        orderCount: 0,
        removable: true,
      },
    ],
    ...overrides,
  }) as CampaignDetail;

describe("EditCampaign", () => {
  beforeEach(() => {
    campaignState.data = round();
    campaignState.isPending = false;
    campaignState.isError = false;
    meState.data = { id: "me" };
    location.search = "";
    mounts.count = 0;
  });

  it("shows a loading state until the round and the viewer are known", () => {
    campaignState.isPending = true;
    campaignState.data = undefined;

    renderWithIntl(<EditCampaign id="c1" />);

    expect(screen.getByLabelText("Đang tải đợt đặt trước")).toBeInTheDocument();
  });

  it("loads the round into the form", () => {
    renderWithIntl(<EditCampaign id="c1" />);

    expect(
      screen.getByRole("heading", { name: "Sửa đợt đặt trước" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("form:c1:Bánh bao tuần này:i1:15.000:mount1"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Đây là bản sao/)).not.toBeInTheDocument();
  });

  it("writes prices the English way on an English page", () => {
    renderWithIntl(<EditCampaign id="c1" />, { locale: "en" });

    expect(screen.getByText(/:15,000:/)).toBeInTheDocument();
  });

  it("starts a fresh form from the saved round after a save", async () => {
    renderWithIntl(<EditCampaign id="c1" />);

    await userEvent.click(screen.getByRole("button", { name: "saved" }));

    expect(screen.getByText(/:mount2$/)).toBeInTheDocument();
  });

  it("shows a read-only notice instead of the form for a closed round", () => {
    campaignState.data = round({ status: "closed" });

    renderWithIntl(<EditCampaign id="c1" />);

    expect(
      screen.getByRole("heading", { name: "Đợt đã đóng nên không sửa được" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Về trang bán hàng" }),
    ).toHaveAttribute("href", "/sell");
  });

  it("asks to review the dates of a round that was just reopened", () => {
    location.search = "reopened=1";

    renderWithIntl(<EditCampaign id="c1" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Đây là bản sao của đợt trước. Kiểm tra hạn chốt, ngày giao và giá trước khi đăng.",
    );
    expect(screen.getByText(/^form:c1/)).toBeInTheDocument();
  });

  it.each([
    ["a round that cannot be loaded", () => {
      campaignState.isError = true;
      campaignState.data = undefined;
    }],
    ["a round that fails to load before the viewer is known", () => {
      campaignState.isError = true;
      campaignState.isPending = true;
      campaignState.data = undefined;
      meState.data = undefined;
    }],
    ["someone else's round", () => (meState.data = { id: "other" })],
  ])("says not found for %s", (_name, arrange) => {
    arrange();

    renderWithIntl(<EditCampaign id="c1" />);

    expect(
      screen.getByRole("heading", { name: "Không tìm thấy đợt đặt trước" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
  });
});
