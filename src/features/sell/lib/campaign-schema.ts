import { z, type ZodType } from "zod";
import type { components } from "@/shared/api/schema";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import type { Translator } from "@/shared/i18n/translator";
import { toDateTimeLocal } from "@/shared/lib/format/datetime";
import type { CampaignDetail } from "../api/use-my-campaigns";
import { checkProduct, parsePrice, parseQuantity } from "./product-rules";
import { DEFAULT_UNIT } from "./units";

export type CampaignInputBody = components["schemas"]["CampaignInputDto"];
type ItemInputBody = components["schemas"]["CampaignItemInputDto"];

export const MAX_ITEMS = 50;

export interface ItemFormValues {
  /** Server id; "" for a product not saved yet. */
  id: string;
  title: string;
  description: string;
  unit: string;
  /** Text so people can type "15.000"; separators are ignored. */
  unitPrice: string;
  /** "N units for a set price"; text like the unit price. */
  combos: { quantity: string; price: string }[];
  /** False when the seller stopped selling the product without removing it. */
  selling: boolean;
}

export interface CampaignFormValues {
  title: string;
  categoryId: string;
  description: string;
  /** datetime-local value */
  orderDeadline: string;
  /** YYYY-MM-DD */
  deliveryDate: string;
  acceptsPrepaidQr: boolean;
  acceptsPayOnDelivery: boolean;
  /** Unit given to new and imported products; not sent to the server. */
  defaultUnit: string;
  items: ItemFormValues[];
}

const baseSchema = z.object({
  title: z.string(),
  categoryId: z.string(),
  description: z.string(),
  orderDeadline: z.string(),
  deliveryDate: z.string(),
  acceptsPrepaidQr: z.boolean(),
  acceptsPayOnDelivery: z.boolean(),
  defaultUnit: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      unit: z.string(),
      unitPrice: z.string(),
      combos: z.array(z.object({ quantity: z.string(), price: z.string() })),
      selling: z.boolean(),
    }),
  ),
});

export const emptyItem = (unit: string): ItemFormValues => ({
  id: "",
  title: "",
  description: "",
  unit,
  unitPrice: "",
  combos: [],
  selling: true,
});

/** A new round: nothing filled in, and one empty product to start with. */
export const emptyCampaign = (): CampaignFormValues => ({
  title: "",
  categoryId: "",
  description: "",
  orderDeadline: "",
  deliveryDate: "",
  acceptsPrepaidQr: false,
  acceptsPayOnDelivery: true,
  defaultUnit: DEFAULT_UNIT,
  items: [emptyItem(DEFAULT_UNIT)],
});

/**
 * The form rules of a pre-order round and its products. They mirror the
 * backend's validation of a round; the backend remains the authority. `t`
 * gives the messages in the language of the page.
 */
export function campaignSchema(
  t: Translator<"sell.validation">,
): ZodType<CampaignFormValues, CampaignFormValues> {
  return baseSchema.superRefine((value, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: "custom", path, message });

    const title = value.title.trim();
    if (title.length < 5 || title.length > 120) {
      issue(["title"], t("campaignTitle"));
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

    const deadline = new Date(value.orderDeadline);
    const hasDeadline =
      value.orderDeadline !== "" && !Number.isNaN(deadline.getTime());
    if (!hasDeadline) {
      issue(["orderDeadline"], t("deadlineRequired"));
    } else if (deadline.getTime() <= Date.now()) {
      issue(["orderDeadline"], t("deadlineFuture"));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.deliveryDate)) {
      issue(["deliveryDate"], t("deliveryRequired"));
    } else if (hasDeadline && value.deliveryDate < value.orderDeadline.slice(0, 10)) {
      issue(["deliveryDate"], t("deliveryBeforeDeadline"));
    }

    if (value.items.length === 0) {
      issue(["items"], t("itemsRequired"));
    } else if (value.items.length > MAX_ITEMS) {
      issue(["items"], t("itemsTooMany", { max: MAX_ITEMS }));
    }
    value.items.forEach((item, index) => {
      // Food often has a short name ("Xoi", "Che"), so two characters are enough.
      const itemTitle = item.title.trim();
      if (itemTitle.length < 2 || itemTitle.length > 120) {
        issue(["items", index, "title"], t("itemTitle"));
      }
      if (item.description.length > 5000) {
        issue(["items", index, "description"], t("description"));
      }
      checkProduct(
        item,
        (path, message) => issue(["items", index, ...path], message),
        t,
      );
    });
  });
}

/** Valid form values -> the request body of a round. */
export function toCampaignBody(values: CampaignFormValues): CampaignInputBody {
  return {
    title: values.title.trim(),
    categoryId: Number(values.categoryId),
    description: values.description,
    orderDeadline: new Date(values.orderDeadline).toISOString(),
    deliveryDate: values.deliveryDate,
    acceptsPrepaidQr: values.acceptsPrepaidQr,
    acceptsPayOnDelivery: values.acceptsPayOnDelivery,
    items: values.items.map((item) => ({
      // Without an id the server adds the product; with one it updates it.
      ...(item.id ? { id: item.id } : {}),
      title: item.title.trim(),
      description: item.description,
      // Validated against LISTING_UNITS by campaignSchema.
      unit: item.unit as ItemInputBody["unit"],
      unitPrice: parsePrice(item.unitPrice),
      combos: item.combos.map((combo) => ({
        quantity: parseQuantity(combo.quantity) as string,
        price: parsePrice(combo.price),
      })),
      selling: item.selling,
    })),
  };
}

const PRICE_FORMATTERS: Record<Locale, Intl.NumberFormat> = {
  vi: new Intl.NumberFormat("vi-VN"),
  en: new Intl.NumberFormat("en-US"),
};

/** A saved round as form values; prices are written the way `locale` groups digits. */
export function fromCampaign(
  detail: CampaignDetail,
  locale: Locale = DEFAULT_LOCALE,
): CampaignFormValues {
  const price = PRICE_FORMATTERS[locale];
  return {
    title: detail.title,
    categoryId: String(detail.category.id),
    description: detail.description,
    orderDeadline: toDateTimeLocal(detail.orderDeadline),
    deliveryDate: detail.deliveryDate,
    acceptsPrepaidQr: detail.acceptsPrepaidQr,
    acceptsPayOnDelivery: detail.acceptsPayOnDelivery,
    defaultUnit: detail.items[0]?.unit ?? DEFAULT_UNIT,
    items: detail.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      unit: item.unit,
      unitPrice: price.format(item.unitPrice),
      combos: item.combos.map((combo) => ({
        quantity: combo.quantity,
        price: price.format(combo.price),
      })),
      selling: item.selling,
    })),
  };
}
