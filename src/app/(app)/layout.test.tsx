import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./layout";

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <header>header stub</header>,
}));

vi.mock("@/components/layout/mobile-tab-bar", () => ({
  MobileTabBar: () => <nav>tab bar stub</nav>,
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

  it("renders the phone tab bar after the content and leaves room for it", () => {
    render(
      <AppLayout>
        <p>page content</p>
      </AppLayout>,
    );

    expect(screen.getByText("tab bar stub")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("pb-24", "md:pb-0");
  });
});
