import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("shows the empty state", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Chưa có sản phẩm nào" }),
    ).toBeInTheDocument();
  });
});
