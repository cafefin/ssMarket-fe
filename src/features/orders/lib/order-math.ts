// These rules mirror src/modules/orders/order-math.ts in the backend and are
// tested with the same table, so the total shown here equals the total the
// server computes. The server's number is the one that counts.

export {
  lineTotal,
  lineTotalWithCombos,
  MAX_ORDER_QUANTITY,
  nextCombo,
  normalizeQuantity,
  quantityProblem,
} from "@/features/listings";
export type { QuantityProblem } from "@/features/listings";
