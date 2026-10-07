import { describe, expect, it } from "vitest";
import {
  listingsHref,
  NO_FILTERS,
  parseListingFilters,
  toSearchParams,
} from "./filters";

describe("listing filters", () => {
  it("reads all filters from the query string", () => {
    expect(
      parseListingFilters(
        new URLSearchParams("q=hoa+quả&category=thuc-pham-tuoi&mode=preorder"),
      ),
    ).toEqual({
      ...NO_FILTERS,
      q: "hoa quả",
      category: "thuc-pham-tuoi",
      mode: "preorder",
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
      new URLSearchParams("mode=in_stock&q=loa&category=dien-tu&x=1"),
    );

    expect(toSearchParams(filters).toString()).toBe(
      "q=loa&category=dien-tu&mode=in_stock",
    );
  });

  it("builds the home link", () => {
    expect(listingsHref(NO_FILTERS)).toBe("/");
    expect(listingsHref({ ...NO_FILTERS, q: "loa", mode: "in_stock" })).toBe(
      "/?q=loa&mode=in_stock",
    );
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
