import { describe, expect, it } from "vitest";
import { timeLeft } from "./time-left";

const NOW = Date.parse("2026-10-09T10:00:00.000Z");

describe("timeLeft", () => {
  it("counts whole days, then hours, then minutes", () => {
    expect(timeLeft("2026-10-12T09:00:00.000Z", NOW)).toEqual({
      unit: "days",
      count: 2,
    });
    expect(timeLeft("2026-10-10T09:59:00.000Z", NOW)).toEqual({
      unit: "hours",
      count: 23,
    });
    expect(timeLeft("2026-10-09T10:45:30.000Z", NOW)).toEqual({
      unit: "minutes",
      count: 45,
    });
  });

  it("never says zero minutes while time remains", () => {
    expect(timeLeft("2026-10-09T10:00:20.000Z", NOW)).toEqual({
      unit: "minutes",
      count: 1,
    });
  });

  it("is null once the time has passed", () => {
    expect(timeLeft("2026-10-09T10:00:00.000Z", NOW)).toBeNull();
    expect(timeLeft("2026-10-01T10:00:00.000Z", NOW)).toBeNull();
  });
});
