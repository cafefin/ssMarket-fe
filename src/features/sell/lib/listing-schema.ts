import { z } from "zod";
import type { components } from "@/shared/api/schema";
import type { Translator } from "@/shared/i18n/translator";
import { DEFAULT_UNIT, LISTING_UNITS } from "./units";

export { LISTING_UNITS } from "./units";

export type ListingMode = components["schemas"]["ListingMode"];
export type ListingInputBody = components["schemas"]["ListingInputDto"];

export const MAX_ITEMS = 20;
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const itemSchema = z.object({
  /** Set for an item that already exists on the listing being edited. */
  id: z.string().optional(),
  name: z.string(),
  unit: z.string(),
  /** Text so people can type "35.000"; separators are ignored. */
  unitPrice: z.string(),
  stockQuantity: z.string(),
});

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
  items: z.array(itemSchema),
});

export type ListingFormValues = z.infer<typeof baseSchema>;
export type ListingItemValues = z.infer<typeof itemSchema>;

export const emptyItem = (): ListingItemValues => ({
  name: "",
  unit: DEFAULT_UNIT,
  unitPrice: "",
  stockQuantity: "",
});

export const emptyListing = (): ListingFormValues => ({
  title: "",
  categoryId: "",
  description: "",
  acceptsPrepaidQr: false,
  acceptsPayOnDelivery: true,
  orderDeadline: "",
  deliveryDate: "",
  items: [emptyItem()],
});

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
    if (value.items.length < 1 || value.items.length > MAX_ITEMS) {
      issue(["items"], t("itemCount", { max: MAX_ITEMS }));
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

    value.items.forEach((item, index) => {
      const name = item.name.trim();
      if (name.length < 1 || name.length > 120) {
        issue(["items", index, "name"], t("itemName"));
      }
      if (!(LISTING_UNITS as readonly string[]).includes(item.unit)) {
        issue(["items", index, "unit"], t("unit"));
      }
      const price = parsePrice(item.unitPrice);
      if (Number.isNaN(price) || price < 1_000 || price > 1_000_000_000) {
        issue(["items", index, "unitPrice"], t("unitPrice"));
      }
      if (mode === "in_stock") {
        const stock = parseQuantity(item.stockQuantity);
        if (stock === null || Number(stock) <= 0) {
          issue(["items", index, "stockQuantity"], t("stockPositive"));
        } else if (item.unit !== "kg" && !Number.isInteger(Number(stock))) {
          issue(["items", index, "stockQuantity"], t("stockWhole"));
        }
      }
    });
  });
}

/** Valid form values -> the request body. Fields of the other mode are dropped. */
export function toListingBody(
  mode: ListingMode,
  values: ListingFormValues,
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
    items: values.items.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      name: item.name.trim(),
      // Validated against LISTING_UNITS by listingSchema.
      unit: item.unit as ListingInputBody["items"][number]["unit"],
      unitPrice: parsePrice(item.unitPrice),
      stockQuantity: preorder ? null : parseQuantity(item.stockQuantity),
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
