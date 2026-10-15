import { describe, expect, it } from "vitest";
import {
  apiMode,
  isDefault,
  listingsHref,
  NO_FILTERS,
  parseListingFilters,
  toSearchParams,
} from "./filters";

describe("listing filters", () => {
  it("reads all filters from the query string", () => {
    expect(
      parseListingFilters(
        new URLSearchParams("q=hoa+quả&category=thuc-pham-tuoi&mode=campaign"),
      ),
    ).toEqual({
      ...NO_FILTERS,
      q: "hoa quả",
      category: "thuc-pham-tuoi",
      mode: "campaign",
    });
  });

  it("drops empty and unknown values", () => {
    expect(
      parseListingFilters(new URLSearchParams("q=+++&category=&mode=auction")),
    ).toEqual(NO_FILTERS);
    expect(parseListingFilters(new URLSearchParams(""))).toEqual(NO_FILTERS);
  });

  it("writes a canonical query string regardless of input order", () => {
    const filters = parseListingFilters(
      new URLSearchParams("view=items&mode=campaign&q=loa&category=dien-tu&x=1"),
    );

    expect(toSearchParams(filters).toString()).toBe(
      "q=loa&category=dien-tu&mode=campaign&view=items",
    );
  });

  it("shows goods in stock unless asked otherwise", () => {
    expect(NO_FILTERS.mode).toBe("in_stock");
    expect(parseListingFilters(new URLSearchParams("mode=in_stock")).mode).toBe(
      "in_stock",
    );
    expect(isDefault(NO_FILTERS)).toBe(true);
    expect(isDefault({ ...NO_FILTERS, mode: "campaign" })).toBe(false);
  });

  it.each(["mode=preorder", "mode=all", "view=items", "mode=in_stock&view=items"])(
    "falls back to the defaults for %s",
    (search) => {
      expect(parseListingFilters(new URLSearchParams(search))).toEqual(NO_FILTERS);
    },
  );

  it("shows pre-order rounds as rounds unless items are asked for", () => {
    expect(NO_FILTERS.view).toBe("campaigns");
    expect(
      parseListingFilters(new URLSearchParams("mode=campaign&view=grid")),
    ).toMatchObject({ mode: "campaign", view: "campaigns" });

    const items = parseListingFilters(
      new URLSearchParams("mode=campaign&view=items"),
    );
    expect(items).toMatchObject({ mode: "campaign", view: "items" });
    expect(toSearchParams(items).toString()).toBe("mode=campaign&view=items");
  });

  it("writes the view only for the items of pre-order rounds", () => {
    expect(listingsHref({ ...NO_FILTERS, view: "items" })).toBe("/");
    expect(listingsHref({ ...NO_FILTERS, mode: "campaign" })).toBe(
      "/?mode=campaign",
    );
  });

  it("builds the home link, leaving the default mode out", () => {
    expect(listingsHref(NO_FILTERS)).toBe("/");
    expect(listingsHref({ ...NO_FILTERS, q: "loa", mode: "campaign" })).toBe(
      "/?q=loa&mode=campaign",
    );
  });

  it("asks the API for pre-order products when rounds are chosen", () => {
    expect(apiMode(NO_FILTERS)).toBe("in_stock");
    expect(apiMode({ ...NO_FILTERS, mode: "campaign" })).toBe("preorder");
  });

  it("reads and writes price and condition filters", () => {
    const filters = parseListingFilters(
      new URLSearchParams("minCondition=good&maxPrice=200000&minPrice=50000"),
    );
    expect(filters).toMatchObject({
      minPrice: 50000,
      maxPrice: 200000,
      minCondition: "good",
    });
    expect(toSearchParams(filters).toString()).toBe(
      "minPrice=50000&maxPrice=200000&minCondition=good",
    );
  });

  it("has no condition filter for pre-order rounds", () => {
    expect(
      parseListingFilters(
        new URLSearchParams("mode=campaign&minCondition=good"),
      ).minCondition,
    ).toBeNull();
    expect(
      toSearchParams({
        ...NO_FILTERS,
        mode: "campaign",
        minPrice: 50000,
        minCondition: "good",
      }).toString(),
    ).toBe("mode=campaign&minPrice=50000");
  });

  it("drops a price range that ends before it starts and unknown levels", () => {
    expect(
      parseListingFilters(
        new URLSearchParams("minPrice=9&maxPrice=1&minCondition=shiny"),
      ),
    ).toEqual(NO_FILTERS);
    expect(
      parseListingFilters(new URLSearchParams("minPrice=-5&maxPrice=abc")),
    ).toEqual(NO_FILTERS);
  });
});
