import { describe, expect, it } from "vitest";
import { closesToday, formatDeadline } from "./deadline";

const ZONE = "Asia/Ho_Chi_Minh";
// 17:00 on Friday 9 October 2026 in Vietnam.
const deadline = "2026-10-09T10:00:00.000Z";

describe("formatDeadline", () => {
  it("names the weekday and the date when the deadline is on another day", () => {
    const tuesday = new Date("2026-10-06T03:00:00.000Z");

    expect(formatDeadline(deadline, tuesday, ZONE)).toBe("17:00 thứ Sáu, 9/10");
  });

  it("says today when the deadline is later the same day", () => {
    const fridayMorning = new Date("2026-10-09T01:00:00.000Z");

    expect(formatDeadline(deadline, fridayMorning, ZONE)).toBe("17:00 hôm nay");
  });

  it("decides the day in the given time zone, not in UTC", () => {
    // 01:30 on Saturday in Vietnam, still Friday in UTC.
    const lateNight = "2026-10-09T18:30:00.000Z";
    const fridayEvening = new Date("2026-10-09T10:00:00.000Z");

    expect(formatDeadline(lateNight, fridayEvening, ZONE)).toBe(
      "01:30 thứ Bảy, 10/10",
    );
  });

  it("writes Sunday the Vietnamese way", () => {
    const tuesday = new Date("2026-10-06T03:00:00.000Z");

    expect(formatDeadline("2026-10-11T03:00:00.000Z", tuesday, ZONE)).toBe(
      "10:00 Chủ nhật, 11/10",
    );
  });
});

describe("closesToday", () => {
  it("is true only on the deadline's calendar day", () => {
    expect(closesToday(deadline, new Date("2026-10-09T01:00:00.000Z"), ZONE)).toBe(true);
    expect(closesToday(deadline, new Date("2026-10-08T16:00:00.000Z"), ZONE)).toBe(false);
  });
});
