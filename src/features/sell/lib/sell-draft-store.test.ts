import { beforeEach, describe, expect, it } from "vitest";
import { emptyCampaign } from "./campaign-schema";
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
    store().setMode("campaign");
    store().setValues({ ...emptyListing(), title: "Loa cũ" });

    expect(store().mode).toBe("campaign");
    expect(store().values?.title).toBe("Loa cũ");
  });

  it("keeps the typed values when the mode changes", () => {
    store().setMode("in_stock");
    const values = { ...emptyListing(), unitPrice: "5000", stockQuantity: "2" };
    store().setValues(values);

    store().setMode("campaign");
    store().setMode(null);

    expect(store().mode).toBeNull();
    expect(store().values).toEqual(values);
  });

  it("is written to sessionStorage under a new name and cleared by reset", () => {
    store().setMode("in_stock");
    store().setValues({ ...emptyListing(), title: "Loa cũ" });

    expect(sessionStorage.getItem("ssmarket-sell-draft-2")).toContain("Loa cũ");
    // A draft of the old form, with pre-order fields, is never read again.
    expect(sessionStorage.getItem("ssmarket-sell-draft")).toBeNull();

    store().reset();

    expect(store()).toMatchObject({ mode: null, values: null });
    expect(sessionStorage.getItem("ssmarket-sell-draft-2")).not.toContain("Loa cũ");
  });

  it("keeps a round's draft apart from a listing's", () => {
    store().setValues({ ...emptyListing(), title: "Loa cũ" });
    store().setCampaignValues({ ...emptyCampaign(), title: "Hoa quả tuần 41" });

    expect(store().values?.title).toBe("Loa cũ");
    expect(store().campaignValues?.title).toBe("Hoa quả tuần 41");
    expect(sessionStorage.getItem("ssmarket-sell-draft-2")).toContain(
      "Hoa quả tuần 41",
    );

    store().reset();

    expect(store()).toMatchObject({ mode: null, values: null, campaignValues: null });
  });
});
