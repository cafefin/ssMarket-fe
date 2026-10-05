import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  it("reads as one word for assistive technology", () => {
    render(<Wordmark />);

    expect(screen.getByLabelText("ssMarket")).toBeInTheDocument();
  });

  it("colours the two halves with the brand blue and the readable green", () => {
    render(<Wordmark />);

    expect(screen.getByText("ss")).toHaveClass("text-primary");
    expect(screen.getByText("Market")).toHaveClass("text-positive-deep");
  });

  it("accepts extra classes for sizing", () => {
    render(<Wordmark className="text-3xl" />);

    expect(screen.getByLabelText("ssMarket")).toHaveClass("text-3xl");
  });
});
