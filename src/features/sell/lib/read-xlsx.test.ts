import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readSheet } from "read-excel-file/node";
import { describe, expect, it } from "vitest";
import { type Cell, parseItemRows } from "./parse-item-rows";
import { MAX_XLSX_BYTES, readXlsx, xlsxProblem } from "./read-xlsx";

describe("xlsxProblem", () => {
  it("accepts a small .xlsx file, whatever the case of the extension", () => {
    expect(xlsxProblem({ name: "A.XLSX", size: 2048 })).toBeNull();
    expect(xlsxProblem({ name: "mon.xlsx", size: MAX_XLSX_BYTES })).toBeNull();
  });

  it("refuses other file types", () => {
    expect(xlsxProblem({ name: "a.csv", size: 10 })).toBe("notXlsx");
    expect(xlsxProblem({ name: "a.xls", size: 10 })).toBe("notXlsx");
  });

  it("refuses a file over 1 MB", () => {
    expect(xlsxProblem({ name: "a.xlsx", size: 2 * 1024 * 1024 })).toBe("tooLarge");
  });

  it("names the type before the size", () => {
    expect(xlsxProblem({ name: "a.csv", size: 2 * 1024 * 1024 })).toBe("notXlsx");
  });
});

describe("the template", () => {
  const path = join(process.cwd(), "public/templates/campaign-items.xlsx");

  it("parses into its three example products", async () => {
    const rows = (await readSheet(path)) as Cell[][];

    const { items, unknownUnits, dropped } = parseItemRows(rows, {
      defaultUnit: "cái",
      room: 50,
      unitLabels: { chai: ["chai"] },
    });

    expect(rows[0]).toEqual([
      "Tên (Name)",
      "Giá (Price)",
      "Đơn vị (Unit)",
      "Mô tả (Description)",
    ]);
    expect(
      items.map(({ title, unitPrice, unit, description }) => ({
        title,
        unitPrice,
        unit,
        description,
      })),
    ).toEqual([
      { title: "Bánh bao chay", unitPrice: "15000", unit: "cái", description: "Nấm, đậu hũ" },
      { title: "Bánh bao nhân thịt", unitPrice: "18000", unit: "cái", description: "" },
      { title: "Sữa đậu nành", unitPrice: "12000", unit: "chai", description: "330 ml" },
    ]);
    expect(unknownUnits).toBe(0);
    expect(dropped).toBe(0);
  });

  it("is read by readXlsx from a File", async () => {
    const bytes = readFileSync(path);
    const file = new File([bytes], "campaign-items.xlsx");

    const rows = await readXlsx(file);

    expect(rows).toHaveLength(4);
    expect(rows[1][0]).toBe("Bánh bao chay");
  });

  it("rejects a file that is not a spreadsheet", async () => {
    await expect(
      readXlsx(new File(["not,a,sheet"], "a.xlsx")),
    ).rejects.toThrow();
  });
});
