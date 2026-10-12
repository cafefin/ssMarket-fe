import { type ItemFormValues, emptyItem } from "./campaign-schema";

export type Cell = string | number | boolean | Date | null | undefined;

export interface ParsedItems {
  items: ItemFormValues[];
  /** Rows whose unit was not recognised (the default unit was used). */
  unknownUnits: number;
  /** Data rows that did not fit under `room`. */
  dropped: number;
}

const text = (cell: Cell): string => (cell == null ? "" : String(cell).trim());

/**
 * Rows of the first sheet -> products. Skips the header row and empty rows;
 * columns A-D are title, price, unit, description. A cell that does not make
 * sense (a price that is not a number) is kept as written, so the form shows
 * the error at that cell.
 */
export function parseItemRows(
  rows: Cell[][],
  options: {
    defaultUnit: string;
    room: number;
    /** Stored unit -> the other names it goes by, in any language. */
    unitLabels: Record<string, string[]>;
  },
): ParsedItems {
  const byName = new Map<string, string>();
  for (const [unit, labels] of Object.entries(options.unitLabels)) {
    for (const name of [unit, ...labels]) {
      byName.set(name.trim().toLowerCase(), unit);
    }
  }

  const items: ItemFormValues[] = [];
  let unknownUnits = 0;
  let dropped = 0;

  for (const row of rows.slice(1)) {
    const [title, price, unit, description] = row;
    if ([title, price, unit, description].every((cell) => text(cell) === "")) {
      continue;
    }
    if (items.length >= options.room) {
      dropped += 1;
      continue;
    }

    const unitName = text(unit).toLowerCase();
    const known = byName.get(unitName);
    if (unitName !== "" && known === undefined) {
      unknownUnits += 1;
    }

    items.push({
      ...emptyItem(known ?? options.defaultUnit),
      title: text(title),
      description: text(description),
      unitPrice:
        typeof price === "number" && Number.isFinite(price)
          ? String(Math.round(price))
          : text(price),
    });
  }

  return { items, unknownUnits, dropped };
}
