import { z } from "zod";
import { isCondition, lineTotal, toThousandths } from "@/features/listings";
import type { components } from "@/shared/api/schema";
import type { Translator } from "@/shared/i18n/translator";
import { DEFAULT_UNIT, LISTING_UNITS } from "./units";

export { LISTING_UNITS } from "./units";

export type ListingMode = components["schemas"]["ListingMode"];
export type ListingInputBody = components["schemas"]["ListingInputDto"];

export const MAX_COMBOS = 3;
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const baseSchema = z.object({
  title: z.string(),
  categoryId: z.string(),
  description: z.string(),
  acceptsPrepaidQr: z.boolean(),
  acceptsPayOnDelivery: z.boolean(),
  /** Value of <input type="datetime-local">, in the browser's time zone. */
  orderDeadline: z.string(),
  /** Value of <input type="date">: YYYY-MM-DD. */
  deliveryDate: z.string(),
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
  orderDeadline: "",
  deliveryDate: "",
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

/** "35.000" / "35,000" / " 35000 " -> 35000; anything else -> NaN. */
export function parsePrice(text: string): number {
  const digits = text.trim().replace(/[.,\s]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

/** Accepts "2,5" as well as "2.5". Returns a canonical decimal string or null. */
export function parseQuantity(text: string): string | null {
  const normalized = text.trim().replace(",", ".");
  return /^\d{1,7}(\.\d{1,3})?$/.test(normalized) ? normalized : null;
}

/**
 * The form rules for one mode. They mirror `validateListingInput` in the
 * backend; the backend remains the authority. `t` gives the messages in the
 * language of the page.
 */
export function listingSchema(
  mode: ListingMode,
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
      needsCondition(mode, value.categoryId, isPerishable) &&
      !isCondition(value.condition)
    ) {
      issue(["condition"], t("condition"));
    }
    if (mode === "preorder") {
      const deadline = new Date(value.orderDeadline);
      if (value.orderDeadline === "" || Number.isNaN(deadline.getTime())) {
        issue(["orderDeadline"], t("deadlineRequired"));
      } else if (deadline.getTime() <= Date.now()) {
        issue(["orderDeadline"], t("deadlineFuture"));
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value.deliveryDate)) {
        issue(["deliveryDate"], t("deliveryRequired"));
      } else if (
        value.orderDeadline !== "" &&
        value.deliveryDate < value.orderDeadline.slice(0, 10)
      ) {
        issue(["deliveryDate"], t("deliveryBeforeDeadline"));
      }
    }

    if (!(LISTING_UNITS as readonly string[]).includes(value.unit)) {
      issue(["unit"], t("unit"));
    }
    const price = parsePrice(value.unitPrice);
    if (Number.isNaN(price) || price < 1_000 || price > 1_000_000_000) {
      issue(["unitPrice"], t("unitPrice"));
    }
    if (value.combos.length > MAX_COMBOS) {
      issue(["combos"], t("comboCount", { max: MAX_COMBOS }));
    }
    const step = value.unit === "kg" ? 100 : 1000;
    const sizes = new Set<number>();
    value.combos.forEach((combo, index) => {
      const path = ["combos", index];
      const quantity = parseQuantity(combo.quantity);
      const size = quantity === null ? null : toThousandths(quantity);
      if (size === null || size <= step || size % step !== 0) {
        issue([...path, "quantity"], t("comboQuantity"));
        return;
      }
      if (sizes.has(size)) {
        issue([...path, "quantity"], t("comboDuplicate"));
      }
      sizes.add(size);
      const comboPrice = parsePrice(combo.price);
      if (
        Number.isNaN(comboPrice) ||
        comboPrice < 1_000 ||
        comboPrice > 1_000_000_000 ||
        (!Number.isNaN(price) && comboPrice >= lineTotal(price, quantity as string))
      ) {
        issue([...path, "price"], t("comboPrice"));
      }
    });
    if (mode === "in_stock") {
      const stock = parseQuantity(value.stockQuantity);
      if (stock === null || Number(stock) <= 0) {
        issue(["stockQuantity"], t("stockPositive"));
      } else if (value.unit !== "kg" && !Number.isInteger(Number(stock))) {
        issue(["stockQuantity"], t("stockWhole"));
      }
    }
  });
}

/** In-stock goods outside food have a condition; nothing else does. */
export function needsCondition(
  mode: ListingMode,
  categoryId: string,
  isPerishable: (categoryId: string) => boolean,
): boolean {
  return mode === "in_stock" && categoryId !== "" && !isPerishable(categoryId);
}

/** Valid form values -> the request body. Fields of the other mode are dropped. */
export function toListingBody(
  mode: ListingMode,
  values: ListingFormValues,
  isPerishable: (categoryId: string) => boolean = () => false,
): ListingInputBody {
  const preorder = mode === "preorder";
  return {
    mode,
    title: values.title.trim(),
    categoryId: Number(values.categoryId),
    description: values.description,
    acceptsPrepaidQr: values.acceptsPrepaidQr,
    acceptsPayOnDelivery: values.acceptsPayOnDelivery,
    orderDeadline: preorder
      ? new Date(values.orderDeadline).toISOString()
      : null,
    deliveryDate: preorder ? values.deliveryDate : null,
    condition:
      needsCondition(mode, values.categoryId, isPerishable) &&
      isCondition(values.condition)
        ? values.condition
        : null,
    // Validated against LISTING_UNITS by listingSchema.
    unit: values.unit as ListingInputBody["unit"],
    unitPrice: parsePrice(values.unitPrice),
    stockQuantity: preorder ? null : parseQuantity(values.stockQuantity),
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
