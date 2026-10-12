import { describe, expect, it } from "vitest";
import { type Cell, parseItemRows } from "./parse-item-rows";

const HEADER: Cell[] = ["Tên (Name)", "Giá (Price)", "Đơn vị (Unit)", "Mô tả (Description)"];
const unitLabels = {
  chai: ["chai", "bottle", "bottles"],
  "cái": ["cái", "piece", "pieces"],
};
const options = { defaultUnit: "cái", room: 50, unitLabels };
const parse = (rows: Cell[][], override: Partial<typeof options> = {}) =>
  parseItemRows([HEADER, ...rows], { ...options, ...override });

describe("parseItemRows", () => {
  it("turns each row under the header into a new, selling product without combos", () => {
    const { items } = parse([
      ["Bánh bao chay", 15000, null, "Nấm"],
      ["Chè", 20000, "chai", null],
    ]);

    expect(items).toEqual([
      {
        id: "",
        title: "Bánh bao chay",
        description: "Nấm",
        unit: "cái",
        unitPrice: "15000",
        combos: [],
        selling: true,
      },
      {
        id: "",
        title: "Chè",
        description: "",
        unit: "chai",
        unitPrice: "20000",
        combos: [],
        selling: true,
      },
    ]);
  });

  it("writes a numeric price as text, keeps a typed price and any other text as it is", () => {
    const { items } = parse([
      ["A1", 15000, null, null],
      ["A2", "15.000", null, null],
      ["A3", null, null, null],
      ["A4", "abc", null, null],
      ["A5", 15000.4, null, null],
    ]);

    expect(items.map((item) => item.unitPrice)).toEqual([
      "15000",
      "15.000",
      "",
      "abc",
      "15000",
    ]);
  });

  it("uses the default unit when the unit is empty", () => {
    const { items, unknownUnits } = parse(
      [["Chè", 20000, "  ", null]],
      { defaultUnit: "chai" },
    );

    expect(items[0].unit).toBe("chai");
    expect(unknownUnits).toBe(0);
  });

  it("recognises a unit or its label in any language, ignoring case and spaces", () => {
    const { items, unknownUnits } = parse([
      ["A", 1000, " Chai ", null],
      ["B", 1000, "bottle", null],
      ["C", 1000, "PIECES", null],
    ]);

    expect(items.map((item) => item.unit)).toEqual(["chai", "chai", "cái"]);
    expect(unknownUnits).toBe(0);
  });

  it("takes the default unit for an unknown one and counts it", () => {
    const { items, unknownUnits } = parse([
      ["A", 1000, "thùng", null],
      ["B", 1000, "xyz", null],
      ["C", 1000, "chai", null],
    ]);

    expect(items.map((item) => item.unit)).toEqual(["cái", "cái", "chai"]);
    expect(unknownUnits).toBe(2);
  });

  it("turns a numeric title into text and trims the text cells", () => {
    const { items } = parse([[2024, 5000, null, "  mô tả  "]]);

    expect(items[0].title).toBe("2024");
    expect(items[0].description).toBe("mô tả");
  });

  it("skips rows whose four cells are empty", () => {
    const { items } = parse([
      [null, null, null, null],
      ["A", 1000, null, null],
      ["  ", undefined, "", null],
      [],
      [null, 1000, null, null],
    ]);

    expect(items.map((item) => item.title)).toEqual(["A", ""]);
  });

  it("gives no items for a sheet with only a header, or none", () => {
    expect(parse([]).items).toEqual([]);
    expect(parseItemRows([], options)).toEqual({
      items: [],
      unknownUnits: 0,
      dropped: 0,
    });
  });

  it("keeps what fits and counts the rows beyond the room", () => {
    const { items, dropped } = parse(
      [
        ["A", 1000, null, null],
        ["B", 1000, null, null],
        ["C", 1000, null, null],
      ],
      { room: 1 },
    );

    expect(items.map((item) => item.title)).toEqual(["A"]);
    expect(dropped).toBe(2);
  });

  it("does not count a dropped row's unit", () => {
    const { unknownUnits } = parse(
      [
        ["A", 1000, null, null],
        ["B", 1000, "xyz", null],
      ],
      { room: 1 },
    );

    expect(unknownUnits).toBe(0);
  });

  it("ignores cells beyond column D", () => {
    const { items } = parse([["A", 1000, "chai", "d", "extra", 7]]);

    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("d");
  });
});
