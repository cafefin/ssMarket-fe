const quantityFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 3,
});

/**
 * Format a quantity value using Vietnamese number format.
 * Decimal quantities like 2.5 are formatted as "2,5" with comma as decimal separator.
 */
export function formatQuantity(value: number): string {
  return quantityFormatter.format(value);
}
