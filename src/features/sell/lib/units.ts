// The units a seller can choose. They are data, not interface text: the
// backend stores them on items and order lines and checks them against its own
// list, so they are shown as written in both languages. This is the one file
// outside the message files allowed to contain Vietnamese
// (see src/shared/i18n/no-hardcoded-vietnamese.test.ts).
export const LISTING_UNITS = [
  "cái",
  "kg",
  "hộp",
  "túi",
  "chai",
  "bó",
  "combo",
] as const;

/** The unit a new item starts with. */
export const DEFAULT_UNIT = LISTING_UNITS[0];
