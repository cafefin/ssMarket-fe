import { describe, expect, it } from "vitest";
import { campaignItem } from "../components/campaign-fixtures";
import {
  type PickerItem,
  selectedLines,
  selectionProblem,
  selectionProblems,
  selectionTotal,
  toPickerItem,
} from "./selection";

const item = (id: string, overrides: Partial<PickerItem> = {}): PickerItem => ({
  id,
  title: `Item ${id}`,
  description: "",
  unit: "cái",
  unitPrice: 18000,
  combos: [],
  thumbnailUrl: null,
  selling: true,
  max: null,
  ...overrides,
});

const ITEMS = [
  item("a", { combos: [{ quantity: "10", price: 160000 }] }),
  item("b", { unit: "kg", unitPrice: 35000 }),
  item("c", { unitPrice: 5000 }),
];

describe("selectedLines", () => {
  it("keeps the order of the items and drops what is not chosen", () => {
    expect(
      selectedLines(ITEMS, { c: "3", a: "2", b: "", x: "5" }),
    ).toEqual([
      { listingId: "a", quantity: "2" },
      { listingId: "c", quantity: "3" },
    ]);
    expect(selectedLines(ITEMS, { a: "0", b: " ", c: "0,0" })).toEqual([]);
    expect(selectedLines(ITEMS, {})).toEqual([]);
  });

  it("writes quantities the way the API takes them", () => {
    expect(selectedLines(ITEMS, { a: " 03 ", b: "2,5" })).toEqual([
      { listingId: "a", quantity: "3" },
      { listingId: "b", quantity: "2.5" },
    ]);
    expect(selectedLines(ITEMS, { b: "0.50" })).toEqual([
      { listingId: "b", quantity: "0.5" },
    ]);
  });

  it("leaves out a quantity that cannot be ordered", () => {
    expect(selectedLines(ITEMS, { a: "abc", b: "1", c: "1.5" })).toEqual([
      { listingId: "b", quantity: "1" },
    ]);
  });
});

describe("selectionTotal", () => {
  it("applies combos per item and adds the items up", () => {
    expect(selectionTotal(ITEMS, { a: "10" })).toBe(160000);
    // 11 = one combo and one single piece; 1.5 kg at 35,000.
    expect(selectionTotal(ITEMS, { a: "11", b: "1,5", c: "2" })).toBe(
      160000 + 18000 + 52500 + 10000,
    );
    expect(selectionTotal(ITEMS, {})).toBe(0);
  });

  it("never mixes the combos of two items", () => {
    const items = [
      item("a", { combos: [{ quantity: "10", price: 160000 }] }),
      item("c"),
    ];
    expect(selectionTotal(items, { a: "5", c: "5" })).toBe(180000);
  });
});

describe("selectionProblems", () => {
  it("reports quantities that are not valid for the unit", () => {
    expect(
      selectionProblems(ITEMS, { a: "1.5", b: "1.5", c: "2" }),
    ).toEqual(["a"]);
    expect(selectionProblems(ITEMS, { a: "-1", c: "hai" })).toEqual(["a", "c"]);
    expect(selectionProblems(ITEMS, { b: "0.25" })).toEqual(["b"]);
    expect(selectionProblems(ITEMS, { a: "10000" })).toEqual(["a"]);
  });

  it("reports a quantity above the most that may be chosen", () => {
    const items = [item("a", { max: 2 }), item("b", { max: 0, selling: false })];
    expect(selectionProblems(items, { a: "2", b: "0" })).toEqual([]);
    expect(selectionProblems(items, { a: "3", b: "1" })).toEqual(["a", "b"]);
  });

  it("has nothing to say about what is not chosen", () => {
    expect(selectionProblems(ITEMS, { a: "", b: "0", c: " " })).toEqual([]);
  });

  it("names the reason for one item", () => {
    expect(selectionProblem(ITEMS[0], { a: "1.5" })).toBe("wholeNumber");
    expect(selectionProblem(ITEMS[1], { b: "0.25" })).toBe("kgStep");
    expect(selectionProblem(ITEMS[0], { a: "x" })).toBe("invalid");
    expect(selectionProblem(ITEMS[0], { a: "10000" })).toBe("tooMany");
    expect(selectionProblem(item("a", { max: 2 }), { a: "3" })).toBe("aboveMax");
    expect(selectionProblem(ITEMS[0], { a: "2" })).toBeNull();
    expect(selectionProblem(ITEMS[0], {})).toBeNull();
  });
});

describe("toPickerItem", () => {
  it("takes the first image's thumbnail", () => {
    expect(
      toPickerItem(
        campaignItem("a", {
          title: "Cam sành",
          description: "Ngọt",
          unit: "kg",
          unitPrice: 35000,
          combos: [{ quantity: "5", price: 150000 }],
          images: [
            { id: "i1", url: "/1.webp", thumbnailUrl: "/1-thumb.webp" },
            { id: "i2", url: "/2.webp", thumbnailUrl: "/2-thumb.webp" },
          ],
        }),
      ),
    ).toEqual({
      id: "a",
      title: "Cam sành",
      description: "Ngọt",
      unit: "kg",
      unitPrice: 35000,
      combos: [{ quantity: "5", price: 150000 }],
      thumbnailUrl: "/1-thumb.webp",
      selling: true,
      max: null,
    });
  });

  it("has no thumbnail without photos and no room for a stopped product", () => {
    expect(toPickerItem(campaignItem("a", { selling: false }))).toMatchObject({
      thumbnailUrl: null,
      selling: false,
      max: 0,
    });
  });
});
