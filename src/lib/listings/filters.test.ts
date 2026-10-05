import { describe, expect, it } from "vitest";
import {
  listingsHref,
  parseListingFilters,
  toSearchParams,
} from "./filters";

describe("listing filters", () => {
  it("reads all filters from the query string", () => {
    expect(
      parseListingFilters(
        new URLSearchParams("q=hoa+quả&category=thuc-pham-tuoi&mode=preorder"),
      ),
    ).toEqual({ q: "hoa quả", category: "thuc-pham-tuoi", mode: "preorder" });
  });

  it("drops empty and unknown values", () => {
    expect(
      parseListingFilters(new URLSearchParams("q=+++&category=&mode=auction")),
    ).toEqual({ q: "", category: null, mode: null });
    expect(parseListingFilters(new URLSearchParams(""))).toEqual({
      q: "",
      category: null,
      mode: null,
    });
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
    expect(listingsHref({ q: "", category: null, mode: null })).toBe("/");
    expect(listingsHref({ q: "loa", category: null, mode: "in_stock" })).toBe(
      "/?q=loa&mode=in_stock",
    );
  });
});
