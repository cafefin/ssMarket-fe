import type {
  CampaignDetail,
  CampaignItem,
  CampaignSummary,
} from "../api/use-campaigns";

/** A round as the API lists it, for tests. */
export function campaignSummary(
  id: string,
  overrides: Partial<CampaignSummary> = {},
): CampaignSummary {
  return {
    id,
    title: "Fruit week 41",
    seller: { id: "u1", name: "An", handle: "an", avatarUrl: null },
    category: {
      id: 2,
      slug: "thuc-pham-tuoi",
      name: "Fresh food",
      nameEn: "Fresh food",
      isPerishable: true,
    },
    orderDeadline: "2099-10-10T10:00:00.000Z",
    deliveryDate: "2099-10-12",
    itemCount: 18,
    minPrice: 15000,
    thumbnails: [],
    ...overrides,
  };
}

/** A product of a round as the API returns it, for tests. */
export function campaignItem(
  id: string,
  overrides: Partial<CampaignItem> = {},
): CampaignItem {
  return {
    id,
    title: `Item ${id}`,
    description: "",
    unit: "chai",
    unitPrice: 18000,
    combos: [],
    images: [],
    selling: true,
    orderCount: 0,
    removable: false,
    ...overrides,
  };
}

/** A round with its products as the API returns it, for tests. */
export function campaignDetail(
  id: string,
  overrides: Partial<CampaignDetail> = {},
): CampaignDetail {
  return {
    ...campaignSummary(id),
    description: "",
    status: "open",
    isOpen: true,
    acceptsPrepaidQr: true,
    acceptsPayOnDelivery: true,
    publishedAt: "2099-10-01T00:00:00.000Z",
    reopenedFromId: null,
    items: [],
    ...overrides,
  };
}
