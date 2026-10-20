import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

const NOW = new Date("2026-10-15T10:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("says just now under a minute, with the text passed in", () => {
    expect(formatRelativeTime(ago(30 * SECOND), "vi", "vừa xong", NOW)).toBe(
      "vừa xong",
    );
    expect(formatRelativeTime(ago(30 * SECOND), "en", "just now", NOW)).toBe(
      "just now",
    );
  });

  it("counts minutes", () => {
    expect(formatRelativeTime(ago(5 * MINUTE), "vi", "vừa xong", NOW)).toBe(
      "5 phút trước",
    );
    expect(formatRelativeTime(ago(5 * MINUTE), "en", "just now", NOW)).toBe(
      "5 minutes ago",
    );
  });

  it("counts hours", () => {
    expect(formatRelativeTime(ago(3 * HOUR), "vi", "vừa xong", NOW)).toBe(
      "3 giờ trước",
    );
    expect(formatRelativeTime(ago(3 * HOUR), "en", "just now", NOW)).toBe(
      "3 hours ago",
    );
  });

  it("counts days", () => {
    expect(formatRelativeTime(ago(2 * DAY), "vi", "vừa xong", NOW)).toBe(
      "2 ngày trước",
    );
    expect(formatRelativeTime(ago(2 * DAY), "en", "just now", NOW)).toBe(
      "2 days ago",
    );
  });

  it("shows a date after 7 days", () => {
    const iso = "2026-10-07T10:00:00Z";
    expect(formatRelativeTime(iso, "vi", "vừa xong", NOW)).toBe("07/10/2026");
    expect(formatRelativeTime(iso, "en", "just now", NOW)).toBe("07/10/2026");
  });
});
