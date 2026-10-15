import {
  type Combo,
  lineTotalWithCombos,
  normalizeQuantity,
  type QuantityProblem,
  quantityProblem,
  toThousandths,
} from "@/features/listings";
import type { CampaignItem } from "../api/use-campaigns";

/** A product a quantity can be chosen for: in a round, or in an order. */
export interface PickerItem {
  id: string;
  title: string;
  description: string;
  unit: string;
  unitPrice: number;
  combos: Combo[];
  thumbnailUrl: string | null;
  /** False for a product no longer on sale. */
  selling: boolean;
  /** The most that may be chosen; null means no limit. */
  max: number | null;
}

/** listing id -> quantity as typed ("" or "0" means not chosen). */
export type Selection = Record<string, string>;

export interface SelectedLine {
  listingId: string;
  quantity: string;
}

/** Why a chosen quantity cannot be ordered; the component finds the words. */
export type SelectionProblem = QuantityProblem | "aboveMax";

/** What was typed for an item, tidied; null when the item is not chosen. */
function typed(item: PickerItem, selection: Selection): string | null {
  const quantity = normalizeQuantity(selection[item.id] ?? "");
  return quantity === "" || toThousandths(quantity) === 0 ? null : quantity;
}

/** Why the quantity chosen for an item cannot be ordered, or null. */
export function selectionProblem(
  item: PickerItem,
  selection: Selection,
): SelectionProblem | null {
  const quantity = typed(item, selection);
  if (quantity === null) {
    return null;
  }
  const problem = quantityProblem(quantity, item.unit);
  if (problem) {
    return problem;
  }
  return item.max !== null && Number(quantity) > item.max ? "aboveMax" : null;
}

/** The chosen lines, in the order of `items`, with normalised quantities. */
export function selectedLines(
  items: PickerItem[],
  selection: Selection,
): SelectedLine[] {
  return items.flatMap((item) => {
    const quantity = typed(item, selection);
    if (quantity === null || selectionProblem(item, selection)) {
      return [];
    }
    // "03" and "2.50" are quantities; the API gets them as "3" and "2.5".
    return [{ listingId: item.id, quantity: String(Number(quantity)) }];
  });
}

/** Integer VND with combos applied. */
export function selectionTotal(items: PickerItem[], selection: Selection): number {
  const quantities = new Map(
    selectedLines(items, selection).map((line) => [line.listingId, line.quantity]),
  );
  return items.reduce((sum, item) => {
    const quantity = quantities.get(item.id);
    return quantity === undefined
      ? sum
      : sum + lineTotalWithCombos(item.unitPrice, item.combos, quantity);
  }, 0);
}

/** Listing ids whose quantity is not valid for its unit or exceeds `max`. */
export function selectionProblems(
  items: PickerItem[],
  selection: Selection,
): string[] {
  return items
    .filter((item) => selectionProblem(item, selection) !== null)
    .map((item) => item.id);
}

/** A round's product as the picker shows it. Pre-orders have no stock limit. */
export function toPickerItem(item: CampaignItem): PickerItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    unit: item.unit,
    unitPrice: item.unitPrice,
    combos: item.combos,
    thumbnailUrl: item.images[0]?.thumbnailUrl ?? null,
    selling: item.selling,
    // A product that is no longer on sale cannot be chosen.
    max: item.selling ? null : 0,
  };
}
