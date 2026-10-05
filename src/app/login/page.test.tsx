import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

async function renderLogin(params: { error?: string } = {}) {
  render(await LoginPage({ searchParams: Promise.resolve(params) }));
}

describe("LoginPage", () => {
  it("links the sign-in button to the Google OAuth start endpoint", async () => {
    await renderLogin();

    expect(
      screen.getByRole("link", { name: "Đăng nhập với Google" }),
    ).toHaveAttribute("href", "/api/auth/google");
  });

  it("shows no alert by default", async () => {
    await renderLogin();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains that only company email is accepted", async () => {
    await renderLogin({ error: "domain_not_allowed" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Chỉ email công ty mới đăng nhập được.",
    );
  });

  it("shows a generic message for a failed sign-in", async () => {
    await renderLogin({ error: "login_failed" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Đăng nhập không thành công. Vui lòng thử lại.",
    );
  });

  it("falls back to the generic message for an unknown error code", async () => {
    await renderLogin({ error: "<script>alert(1)</script>" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Đăng nhập không thành công. Vui lòng thử lại.",
    );
  });
});
