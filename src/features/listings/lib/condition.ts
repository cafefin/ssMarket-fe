import type { components } from "@/shared/api/schema";

export type ListingCondition = components["schemas"]["ListingCondition"];

/** Best first; the percentages match CONDITION_PERCENT in the backend. */
export const CONDITIONS: readonly ListingCondition[] = [
  "new",
  "like_new",
  "excellent",
  "good",
  "fair",
  "worn",
];

export const CONDITION_PERCENT: Record<ListingCondition, number> = {
  new: 100,
  like_new: 99,
  excellent: 95,
  good: 90,
  fair: 80,
  worn: 70,
};

export function isCondition(value: unknown): value is ListingCondition {
  return CONDITIONS.includes(value as ListingCondition);
}
