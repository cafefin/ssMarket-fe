// These rules mirror src/modules/orders/order-math.ts in the backend and are
// tested with the same table, so the total shown here equals the total the
// server computes. The server's number is the one that counts.

const DECIMAL = /^\d{1,7}(\.\d{1,3})?$/;
const MAX_QUANTITY = 9999;

/** What a person typed ("1,5", " 2 ") as a canonical decimal string ("1.5"). */
export function normalizeQuantity(text: string): string {
  return text.trim().replace(",", ".");
}

function toThousandths(quantity: string): number | null {
  if (!DECIMAL.test(quantity)) {
    return null;
  }
  const [whole, fraction = ""] = quantity.split(".");
  return Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
}

/** Why a quantity cannot be ordered, in Vietnamese, or null when it can. */
export function quantityProblem(quantity: string, unit: string): string | null {
  const thousandths = toThousandths(quantity);
  if (thousandths === null) {
    return "Nhập một số hợp lệ";
  }
  if (thousandths > MAX_QUANTITY * 1000) {
    return `Tối đa ${MAX_QUANTITY}`;
  }
  if (unit === "kg") {
    return thousandths >= 100 && thousandths % 100 === 0
      ? null
      : "Kg đặt theo bước 0,1, từ 0,1";
  }
  return thousandths >= 1000 && thousandths % 1000 === 0
    ? null
    : "Nhập số nguyên từ 1";
}

/** unit price × quantity, rounded half up to a whole đồng. */
export function lineTotal(unitPrice: number, quantity: string): number {
  const thousandths = toThousandths(quantity);
  if (thousandths === null) {
    return 0;
  }
  return Math.floor((unitPrice * thousandths + 500) / 1000);
}

const quantityFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 3,
});

/** 1.5 -> "1,5"; 2 -> "2". */
export function formatQuantity(quantity: number): string {
  return quantityFormatter.format(quantity);
}
