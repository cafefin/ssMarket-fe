import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "./page";

const { state } = vi.hoisted(() => ({
  state: { data: undefined as unknown, isError: false },
}));
vi.mock("@/shared/api/use-current-user", () => ({
  useCurrentUser: () => state,
}));
vi.mock("@/components/profile/profile-form", () => ({
  ProfileForm: ({ user }: { user: { name: string } }) => (
    <p>form for {user.name}</p>
  ),
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    state.data = undefined;
    state.isError = false;
  });

  it("shows a loading placeholder until the user is known", () => {
    const { container } = render(<ProfilePage />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText(/form for/)).not.toBeInTheDocument();
  });

  it("shows the form with the user's identity once loaded", () => {
    state.data = { name: "An", email: "an@example.com" };

    render(<ProfilePage />);

    expect(screen.getByRole("heading", { name: "Hồ sơ" })).toBeInTheDocument();
    expect(screen.getByText("An · an@example.com")).toBeInTheDocument();
    expect(screen.getByText("form for An")).toBeInTheDocument();
  });

  it("shows an error when the profile cannot be loaded", () => {
    state.isError = true;

    render(<ProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Không tải được hồ sơ. Vui lòng tải lại trang.",
    );
  });
});
