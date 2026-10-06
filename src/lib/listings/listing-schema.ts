import { z } from "zod";
import type { components } from "@/lib/api/schema";

export type ListingMode = components["schemas"]["ListingMode"];
export type ListingInputBody = components["schemas"]["ListingInputDto"];

export const LISTING_UNITS = [
  "cái",
  "kg",
  "hộp",
  "túi",
  "chai",
  "bó",
  "combo",
] as const;

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
  unit: "cái",
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
 * backend; the backend remains the authority.
 */
export function listingSchema(mode: ListingMode) {
  return baseSchema.superRefine((value, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: "custom", path, message });

    const title = value.title.trim();
    if (title.length < 5 || title.length > 120) {
      issue(["title"], "Tiêu đề gồm 5–120 ký tự");
    }
    if (value.categoryId === "") {
      issue(["categoryId"], "Chọn loại hàng");
    }
    if (value.description.length > 5000) {
      issue(["description"], "Mô tả tối đa 5000 ký tự");
    }
    if (!value.acceptsPrepaidQr && !value.acceptsPayOnDelivery) {
      issue(["acceptsPayOnDelivery"], "Chọn ít nhất một hình thức thanh toán");
    }
    if (value.items.length < 1 || value.items.length > MAX_ITEMS) {
      issue(["items"], `Bài đăng cần 1–${MAX_ITEMS} mặt hàng`);
    }

    if (mode === "preorder") {
      const deadline = new Date(value.orderDeadline);
      if (value.orderDeadline === "" || Number.isNaN(deadline.getTime())) {
        issue(["orderDeadline"], "Chọn hạn chốt đơn");
      } else if (deadline.getTime() <= Date.now()) {
        issue(["orderDeadline"], "Hạn chốt đơn phải ở tương lai");
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value.deliveryDate)) {
        issue(["deliveryDate"], "Chọn ngày giao");
      } else if (
        value.orderDeadline !== "" &&
        value.deliveryDate < value.orderDeadline.slice(0, 10)
      ) {
        issue(["deliveryDate"], "Ngày giao không được trước hạn chốt đơn");
      }
    }

    value.items.forEach((item, index) => {
      const name = item.name.trim();
      if (name.length < 1 || name.length > 120) {
        issue(["items", index, "name"], "Tên mặt hàng gồm 1–120 ký tự");
      }
      if (!(LISTING_UNITS as readonly string[]).includes(item.unit)) {
        issue(["items", index, "unit"], "Chọn đơn vị");
      }
      const price = parsePrice(item.unitPrice);
      if (Number.isNaN(price) || price < 1_000 || price > 1_000_000_000) {
        issue(
          ["items", index, "unitPrice"],
          "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
        );
      }
      if (mode === "in_stock") {
        const stock = parseQuantity(item.stockQuantity);
        if (stock === null || Number(stock) <= 0) {
          issue(
            ["items", index, "stockQuantity"],
            "Nhập số lượng lớn hơn 0",
          );
        } else if (item.unit !== "kg" && !Number.isInteger(Number(stock))) {
          issue(
            ["items", index, "stockQuantity"],
            "Chỉ đơn vị kg được nhập số lẻ",
          );
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

/** Why a chosen file cannot be attached, or null when it can. */
export function imageProblem(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.includes(file.type)) {
    return "Ảnh phải là file JPEG, PNG hoặc WebP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Ảnh lớn hơn 5 MB.";
  }
  return null;
}
