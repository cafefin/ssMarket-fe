const formatter = new Intl.NumberFormat("vi-VN");

/** 35000 -> "35.000 đ". Amounts are integer VND; never abbreviate to "35k". */
export function formatMoney(amount: number): string {
  return `${formatter.format(amount)} đ`;
}
