import type { Cell } from "./parse-item-rows";

export const MAX_XLSX_BYTES = 1024 * 1024;

/** Why a chosen file cannot be imported, or null. */
export function xlsxProblem(file: {
  name: string;
  size: number;
}): "notXlsx" | "tooLarge" | null {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return "notXlsx";
  }
  return file.size > MAX_XLSX_BYTES ? "tooLarge" : null;
}

/**
 * The rows of the first sheet. Rejects when the file cannot be read. The
 * library is loaded only now, so it is not part of the page until a seller
 * imports a file. The "universal" entry point runs on the main thread, which
 * is fine under the 1 MB limit and works in tests as well as in browsers.
 */
export async function readXlsx(file: File): Promise<Cell[][]> {
  const { readSheet } = await import("read-excel-file/universal");
  return (await readSheet(file)) as Cell[][];
}
