import { z } from "zod";
import { isCondition } from "@/features/listings";
import type { components } from "@/shared/api/schema";
import type { Translator } from "@/shared/i18n/translator";
import { checkProduct, parsePrice, parseQuantity } from "./product-rules";
import { DEFAULT_UNIT } from "./units";

export { MAX_COMBOS, parsePrice, parseQuantity } from "./product-rules";
export { LISTING_UNITS } from "./units";

export type ListingInputBody = components["schemas"]["ListingInputDto"];

export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const baseSchema = z.object({
  title: z.string(),
  categoryId: z.string(),
  description: z.string(),
  acceptsPrepaidQr: z.boolean(),
  acceptsPayOnDelivery: z.boolean(),
  /** A ListingCondition, or "" when none is chosen or none applies. */
  condition: z.string(),
  unit: z.string(),
  /** Text so people can type "35.000"; separators are ignored. */
  unitPrice: z.string(),
  stockQuantity: z.string(),
  /** "N units for a set price"; text like the unit price. */
  combos: z.array(z.object({ quantity: z.string(), price: z.string() })),
});

export type ListingFormValues = z.infer<typeof baseSchema>;

export const emptyListing = (): ListingFormValues => ({
  title: "",
  categoryId: "",
  description: "",
  acceptsPrepaidQr: false,
  acceptsPayOnDelivery: true,
  condition: "",
  unit: DEFAULT_UNIT,
  unitPrice: "",
  stockQuantity: "",
  combos: [],
});

/**
 * Fills fields that a draft saved by an older version of the form lacks, so
 * a draft kept in sessionStorage across a release still opens.
 */
export function withListingDefaults(
  values: Partial<ListingFormValues> & Record<string, unknown>,
): ListingFormValues {
  const empty = emptyListing();
  const known = Object.fromEntries(
    Object.keys(empty).flatMap((key) =>
      values[key] === undefined ? [] : [[key, values[key]]],
    ),
  );
  return { ...empty, ...known };
}

/**
 * The form rules of a product in stock (pre-orders are created as a round).
 * They mirror `validateListingInput` in the backend; the backend remains the
 * authority. `t` gives the messages in the language of the page.
 */
export function listingSchema(
  t: Translator<"sell.validation">,
  /** Whether a category holds food, which has no condition. */
  isPerishable: (categoryId: string) => boolean = () => false,
) {
  return baseSchema.superRefine((value, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: "custom", path, message });

    const title = value.title.trim();
    if (title.length < 5 || title.length > 120) {
      issue(["title"], t("title"));
    }
    if (value.categoryId === "") {
      issue(["categoryId"], t("category"));
    }
    if (value.description.length > 5000) {
      issue(["description"], t("description"));
    }
    if (!value.acceptsPrepaidQr && !value.acceptsPayOnDelivery) {
      issue(["acceptsPayOnDelivery"], t("payment"));
    }
    if (
      needsCondition(value.categoryId, isPerishable) &&
      !isCondition(value.condition)
    ) {
      issue(["condition"], t("condition"));
    }

    checkProduct(value, issue, t);

    const stock = parseQuantity(value.stockQuantity);
    if (stock === null || Number(stock) <= 0) {
      issue(["stockQuantity"], t("stockPositive"));
    } else if (value.unit !== "kg" && !Number.isInteger(Number(stock))) {
      issue(["stockQuantity"], t("stockWhole"));
    }
  });
}

/** Goods outside food have a condition; food does not. */
export function needsCondition(
  categoryId: string,
  isPerishable: (categoryId: string) => boolean,
): boolean {
  return categoryId !== "" && !isPerishable(categoryId);
}

/** Valid form values -> the request body of a product in stock. */
export function toListingBody(
  values: ListingFormValues,
  isPerishable: (categoryId: string) => boolean = () => false,
): ListingInputBody {
  return {
    mode: "in_stock",
    title: values.title.trim(),
    categoryId: Number(values.categoryId),
    description: values.description,
    acceptsPrepaidQr: values.acceptsPrepaidQr,
    acceptsPayOnDelivery: values.acceptsPayOnDelivery,
    condition:
      needsCondition(values.categoryId, isPerishable) &&
      isCondition(values.condition)
        ? values.condition
        : null,
    // Validated against LISTING_UNITS by listingSchema.
    unit: values.unit as ListingInputBody["unit"],
    unitPrice: parsePrice(values.unitPrice),
    stockQuantity: parseQuantity(values.stockQuantity),
    combos: values.combos.map((combo) => ({
      quantity: parseQuantity(combo.quantity) as string,
      price: parsePrice(combo.price),
    })),
  };
}

/**
 * Why a chosen file cannot be attached, as the error code the backend would
 * answer with (translated through `errors.codes`), or null when it can.
 */
export function imageProblem(file: {
  type: string;
  size: number;
}): "INVALID_IMAGE" | "PAYLOAD_TOO_LARGE" | null {
  if (!IMAGE_TYPES.includes(file.type)) {
    return "INVALID_IMAGE";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "PAYLOAD_TOO_LARGE";
  }
  return null;
}
