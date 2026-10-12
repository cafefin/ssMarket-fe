import type { CampaignSummary } from "../api/use-campaigns";

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
