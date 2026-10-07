import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./user-avatar";

describe("UserAvatar", () => {
  it("shows initials and is hidden from assistive tech by default", () => {
    const { container } = renderWithIntl(<UserAvatar name="Lê Thu Hà" avatarUrl={null} />);
    expect(screen.getByText("LH")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("is exposed when not decorative", () => {
    const { container } = renderWithIntl(
      <UserAvatar name="Lê Thu Hà" avatarUrl={null} decorative={false} />,
    );
    expect(container.firstElementChild).not.toHaveAttribute("aria-hidden");
  });

  it("tints the fallback in the brand tone, or leaves it plain", () => {
    const { rerender } = renderWithIntl(<UserAvatar name="Lê Thu Hà" avatarUrl={null} />);
    expect(screen.getByText("LH")).toHaveClass(
      "bg-primary-soft",
      "font-semibold",
      "text-primary-deep",
    );
    rerender(<UserAvatar name="Lê Thu Hà" avatarUrl={null} tone="plain" />);
    const fallback = screen.getByText("LH");
    expect(fallback).not.toHaveClass("bg-primary-soft");
    expect(fallback).not.toHaveClass("font-semibold");
    expect(fallback).not.toHaveClass("text-primary-deep");
  });

  it("supports the xs and lg sizes", () => {
    const { container, rerender } = renderWithIntl(
      <UserAvatar name="Lê Thu Hà" avatarUrl={null} size="xs" />,
    );
    expect(container.firstElementChild).toHaveClass("size-7");
    expect(screen.getByText("LH")).toHaveClass("text-[11px]");
    rerender(<UserAvatar name="Lê Thu Hà" avatarUrl={null} size="lg" />);
    expect(container.firstElementChild).toHaveAttribute("data-size", "lg");
  });
});
