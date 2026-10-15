import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingDetail } from "@/features/listings";
import { EditListing, toFormValues } from "./edit-listing";

const { listingState, meState } = vi.hoisted(() => ({
  listingState: { data: undefined as unknown, isPending: false, isError: false },
  meState: { data: undefined as unknown },
}));
vi.mock("@/features/listings/api/use-listings", () => ({ useListing: () => listingState }));
vi.mock("@/shared/api/use-current-user", () => ({ useCurrentUser: () => meState }));
vi.mock("./listing-form", () => ({
  ListingForm: ({ initialValues }: { initialValues: { title: string } }) => (
    <p>form:{initialValues.title}</p>
  ),
}));

const listing = (overrides: Partial<ListingDetail> = {}): ListingDetail => ({
  id: "l1",
  title: "Cam sành",
  description: "Giao tận tầng",
  mode: "in_stock",
  status: "draft",
  isOpen: false,
  category: { id: 2, slug: "thuc-pham-tuoi", name: "Thực phẩm tươi", nameEn: "Fresh food", isPerishable: true },
  seller: { id: "me", name: "Tôi", handle: "toi", avatarUrl: null },
  acceptsPrepaidQr: true,
  acceptsPayOnDelivery: false,
  campaign: null,
  publishedAt: null,
  orderCount: 0,
  condition: null,
  conditionPercent: null,
  unit: "kg",
  unitPrice: 35000,
  stockQuantity: 20,
  combos: [{ quantity: "5", price: 160000 }],
  images: [],
  ...overrides,
});

describe("EditListing", () => {
  beforeEach(() => {
    listingState.data = listing();
    listingState.isPending = false;
    listingState.isError = false;
    meState.data = { id: "me" };
  });

  it("shows a loading state until the listing and the viewer are known", () => {
    listingState.isPending = true;
    listingState.data = undefined;

    renderWithIntl(<EditListing id="l1" />);

    expect(screen.getByLabelText("Đang tải bài đăng")).toBeInTheDocument();
  });

  it("shows the form pre-filled for the seller", () => {
    renderWithIntl(<EditListing id="l1" />);

    expect(screen.getByRole("heading", { name: "Sửa bài đăng" })).toBeInTheDocument();
    expect(screen.getByText("form:Cam sành")).toBeInTheDocument();
  });

  it.each([
    ["someone else's listing", () => (meState.data = { id: "other" })],
    ["a listing that cannot be loaded", () => {
      listingState.isError = true;
      listingState.data = undefined;
    }],
    ["a product of a pre-order round, which is edited through its round", () => {
      listingState.data = listing({
        mode: "preorder",
        stockQuantity: null,
        campaign: {
          id: "c1",
          title: "Hoa quả tuần 41",
          orderDeadline: "2026-10-09T10:00:00.000Z",
          deliveryDate: "2026-10-12",
        },
      });
    }],
  ])("hides the form for %s", (_label, arrange) => {
    arrange();

    renderWithIntl(<EditListing id="l1" />);

    expect(
      screen.getByRole("heading", { name: "Không tìm thấy bài đăng" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
  });

  it("explains that a closed listing cannot be edited", () => {
    listingState.data = listing({ status: "closed" });

    renderWithIntl(<EditListing id="l1" />);

    expect(
      screen.getByRole("heading", { name: "Bài đăng đã đóng nên không sửa được" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về bài đăng của tôi" })).toHaveAttribute(
      "href",
      "/sell",
    );
  });
});

describe("toFormValues", () => {
  it("turns a listing into form values, without pre-order fields", () => {
    const values = toFormValues(listing(), "vi");

    expect(values).toEqual({
      title: "Cam sành",
      categoryId: "2",
      description: "Giao tận tầng",
      acceptsPrepaidQr: true,
      acceptsPayOnDelivery: false,
      condition: "",
      unit: "kg",
      unitPrice: "35.000",
      stockQuantity: "20",
      combos: [{ quantity: "5", price: "160.000" }],
    });
  });

  it("groups price digits the English way in English", () => {
    expect(toFormValues(listing(), "en").unitPrice).toBe("35,000");
  });

  it("keeps a fractional stock and the condition", () => {
    expect(
      toFormValues(
        listing({ unitPrice: 1250000, stockQuantity: 2.5, condition: "good" }),
        "vi",
      ),
    ).toMatchObject({
      unitPrice: "1.250.000",
      stockQuantity: "2.5",
      condition: "good",
    });
  });
});
