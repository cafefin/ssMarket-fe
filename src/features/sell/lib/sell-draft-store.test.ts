import { beforeEach, describe, expect, it } from "vitest";
import { emptyListing } from "./listing-schema";
import { useSellDraftStore } from "./sell-draft-store";

const store = () => useSellDraftStore.getState();

describe("sell draft store", () => {
  beforeEach(() => {
    store().reset();
    sessionStorage.clear();
  });

  it("starts empty", () => {
    expect(store()).toMatchObject({ mode: null, values: null });
  });

  it("remembers the mode and the typed values", () => {
    store().setMode("preorder");
    store().setValues({ ...emptyListing(), title: "Hoa quả tuần 41" });

    expect(store().mode).toBe("preorder");
    expect(store().values?.title).toBe("Hoa quả tuần 41");
  });

  it("keeps shared fields and clears mode-specific ones when the mode changes", () => {
    store().setMode("in_stock");
    store().setValues({
      ...emptyListing(),
      title: "Cam sành",
      orderDeadline: "2026-10-09T17:00",
      deliveryDate: "2026-10-12",
      items: [{ name: "Cam", unit: "kg", unitPrice: "35000", stockQuantity: "10" }],
    });

    store().setMode("preorder");

    expect(store().values).toMatchObject({
      title: "Cam sành",
      orderDeadline: "",
      deliveryDate: "",
      items: [{ name: "Cam", unit: "kg", unitPrice: "35000", stockQuantity: "" }],
    });
  });

  it("does not touch the values when the same mode is chosen again", () => {
    store().setMode("in_stock");
    const values = {
      ...emptyListing(),
      items: [{ name: "Loa", unit: "cái", unitPrice: "5000", stockQuantity: "2" }],
    };
    store().setValues(values);

    store().setMode("in_stock");

    expect(store().values).toEqual(values);
  });

  it("is written to sessionStorage and cleared by reset", () => {
    store().setMode("in_stock");
    store().setValues({ ...emptyListing(), title: "Loa cũ" });

    expect(sessionStorage.getItem("ssmarket-sell-draft")).toContain("Loa cũ");

    store().reset();

    expect(store()).toMatchObject({ mode: null, values: null });
    expect(sessionStorage.getItem("ssmarket-sell-draft")).not.toContain("Loa cũ");
  });
});
