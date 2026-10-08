import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { buyNow, openPlacedOrder, postListing, signInAs, unique } from "./support/people";

test("a seller switches to English, keeps it on reload and on another device, and gets an English CSV", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const buyer = await signInAs(browser, "mua");
  const title = `Hoa qua ${unique("en")}`;

  const listingPath = await postListing(seller, {
    title,
    mode: "preorder",
    unit: "kg",
    price: "35.000",
  });
  const listingId = listingPath.split("/").pop() as string;

  await buyNow(buyer, listingPath, "2");
  await openPlacedOrder(buyer);

  // Switch from the header.
  const { page } = seller;
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await page
    .getByRole("group", { name: "Ngôn ngữ" })
    .getByRole("button", { name: "English" })
    .click();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Purchases" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Selling mode" }).getByRole("button", {
      name: "In stock",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByText("Category", { exact: true }).click();
  await expect(page.getByRole("link", { name: "Fresh food" })).toBeVisible();
  // A pre-order shows in the closing-soon carousel as well as in the list.
  const card = page
    .getByRole("region", { name: "Closing soon" })
    .getByRole("link", { name: new RegExp(title) });
  await expect(card).toContainText("35,000 VND");
  await expect(card).toContainText("1 person ordered");

  // The choice survives a reload: the server renders from the cookie.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Everything for sale" }),
  ).toBeVisible();

  // The summary and its CSV follow the language.
  await page.goto(`/sell/listings/${listingId}`);
  await expect(page.getByText("Order summary")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export CSV" }).click(),
  ]);
  const csv = await readFile(await download.path(), "utf8");
  expect(csv).toContain(
    "Order code,Buyer,Email,Deliver to,Quantity (kg),Total",
  );

  // Another device for the same person starts without the cookie and adopts
  // the language saved on the account.
  const otherDevice = await browser.newContext();
  const other = await otherDevice.newPage();
  await other.goto(`/api/auth/dev-login?as=${seller.name}`);
  await expect(other).toHaveURL("/");
  await expect(other.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    other.getByRole("heading", { name: "Everything for sale" }),
  ).toBeVisible();

  // The buyer never chose, so they still see Vietnamese.
  await buyer.page.goto("/");
  await expect(buyer.page.locator("html")).toHaveAttribute("lang", "vi");
});
