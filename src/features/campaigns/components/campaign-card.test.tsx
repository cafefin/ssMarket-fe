import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { CampaignCard } from "./campaign-card";
import { campaignSummary } from "./campaign-fixtures";

describe("CampaignCard", () => {
  it("shows the round with its terms, as one link", () => {
    renderWithIntl(
      <CampaignCard
        campaign={campaignSummary("c1", { title: "Hoa quả tuần 41" })}
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/campaigns/c1");
    expect(
      screen.getByRole("heading", { name: "Hoa quả tuần 41" }),
    ).toBeInTheDocument();
    expect(screen.getByText("@an")).toBeInTheDocument();
    expect(screen.getByText(/18 món/)).toBeInTheDocument();
    expect(screen.getByText(/từ/)).toHaveTextContent(/15\.000/);
    expect(screen.getByText(/^Chốt /)).toBeInTheDocument();
    expect(screen.getByText("Giao 12/10/2099")).toBeInTheDocument();
  });

  it("shows up to four thumbnails with empty alt text", () => {
    const { container } = renderWithIntl(
      <CampaignCard
        campaign={campaignSummary("c1", {
          thumbnails: ["/a.webp", "/b.webp", "/c.webp", "/d.webp"],
        })}
      />,
    );

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(4);
    images.forEach((image) => {
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("loading", "lazy");
    });
    expect(screen.queryByTestId("image-placeholder")).not.toBeInTheDocument();
  });

  it("renders only the first four of more thumbnails", () => {
    const { container } = renderWithIntl(
      <CampaignCard
        campaign={campaignSummary("c1", {
          thumbnails: ["/a.webp", "/b.webp", "/c.webp", "/d.webp", "/e.webp"],
        })}
      />,
    );

    const sources = Array.from(container.querySelectorAll("img")).map((image) =>
      image.getAttribute("src"),
    );
    expect(sources).toEqual(["/a.webp", "/b.webp", "/c.webp", "/d.webp"]);
  });

  it("marks a round that closes today with the strong strip", () => {
    renderWithIntl(
      <CampaignCard
        campaign={campaignSummary("c1", {
          orderDeadline: new Date(Date.now() + 60_000).toISOString(),
        })}
      />,
    );
    const strip = screen.getByText(/^Chốt /);
    expect(strip).toHaveClass("bg-deadline", "text-foreground");
    expect(strip).not.toHaveClass("bg-deadline-soft");
  });

  it("uses the soft strip for a round that closes later", () => {
    renderWithIntl(<CampaignCard campaign={campaignSummary("c1")} />);
    const strip = screen.getByText(/^Chốt /);
    expect(strip).toHaveClass("bg-deadline-soft", "text-deadline-deep");
  });

  it("shows a placeholder when no product has a photo", () => {
    renderWithIntl(<CampaignCard campaign={campaignSummary("c1")} />);
    expect(screen.getByTestId("image-placeholder")).toBeInTheDocument();
  });

  it("speaks English", () => {
    renderWithIntl(<CampaignCard campaign={campaignSummary("c1")} />, {
      locale: "en",
    });
    expect(screen.getByText(/18 items/)).toBeInTheDocument();
    expect(screen.getByText(/from/)).toBeInTheDocument();
    expect(screen.getByText(/^Closes /)).toBeInTheDocument();
    expect(screen.getByText(/^Delivery /)).toBeInTheDocument();
  });
});
