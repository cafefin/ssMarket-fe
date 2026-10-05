import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./layout";

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <header>header stub</header>,
}));

describe("AppLayout", () => {
  it("renders the header above the page content", () => {
    render(
      <AppLayout>
        <p>page content</p>
      </AppLayout>,
    );

    expect(screen.getByText("header stub")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("page content");
  });
});
