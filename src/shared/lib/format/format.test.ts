import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, toDateTimeLocal } from "./datetime";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it.each([
    [35000, "35.000 đ"],
    [0, "0 đ"],
    [1250000, "1.250.000 đ"],
    [999, "999 đ"],
  ])("%d -> %s", (amount, expected) => {
    expect(formatMoney(amount, "vi")).toBe(expected);
  });

  it.each([
    [35000, "35,000 VND"],
    [1250000, "1,250,000 VND"],
  ])("%d -> %s in English", (amount, expected) => {
    expect(formatMoney(amount, "en")).toBe(expected);
  });
});

describe("date helpers", () => {
  const instant = "2026-10-10T10:00:00.000Z";

  it("formats an instant in the requested time zone", () => {
    expect(formatDateTime(instant, "Asia/Ho_Chi_Minh")).toBe("17:00 10/10/2026");
    expect(formatDateTime(instant, "UTC")).toBe("10:00 10/10/2026");
  });

  it("rolls the date over when the zone is ahead", () => {
    expect(formatDateTime("2026-10-10T18:30:00.000Z", "Asia/Ho_Chi_Minh")).toBe(
      "01:30 11/10/2026",
    );
  });

  it("formats a calendar date without shifting it", () => {
    expect(formatDate("2026-10-12")).toBe("12/10/2026");
    expect(formatDate("2026-01-05T00:00:00.000Z")).toBe("05/01/2026");
  });

  it("builds a datetime-local input value", () => {
    expect(toDateTimeLocal(instant, "Asia/Ho_Chi_Minh")).toBe("2026-10-10T17:00");
  });
});
