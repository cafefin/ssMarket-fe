import { describe, expect, it } from "vitest";
import { insertVariable, unknownVariables } from "./chat-template";

describe("unknownVariables", () => {
  it("lists names not allowed, once each, in order", () => {
    expect(unknownVariables("{{a}} {{b}} {{a}} {{ c }}", ["a"])).toEqual(["b"]);
    expect(unknownVariables("{{x}} {{b}} {{x}} {{a}}", ["a"])).toEqual([
      "x",
      "b",
    ]);
  });

  it("returns nothing when all are allowed or none are used", () => {
    expect(unknownVariables("hello", ["a"])).toEqual([]);
    expect(unknownVariables("{{a}}", ["a"])).toEqual([]);
  });
});

describe("insertVariable", () => {
  it("inserts at the caret", () => {
    expect(insertVariable("Hi !", 3, 3, "sellerName")).toEqual({
      text: "Hi {{sellerName}}!",
      caret: 17,
    });
  });

  it("replaces a selection", () => {
    expect(insertVariable("Hi world", 3, 8, "x")).toEqual({
      text: "Hi {{x}}",
      caret: 8,
    });
  });
});
