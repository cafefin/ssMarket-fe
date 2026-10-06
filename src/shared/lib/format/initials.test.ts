import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it.each([
    ["Nguyen Van A", "NA"],
    ["  an   nguyen  ", "AN"],
    ["Truong", "T"],
    ["", "?"],
  ])("initials(%j) is %j", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
