import { expect, test } from "@playwright/test";
import { postListing, signInAs, unique } from "./support/people";

test("the last unit goes to whoever orders first", async ({ browser }) => {
  const seller = await signInAs(browser, "ban");
  const first = await signInAs(browser, "nhanh");
  const second = await signInAs(browser, "cham");
  const title = `Ban phim co ${unique("phim")}`;

  const listingPath = await postListing(seller, {
    title,
    mode: "in_stock",
    items: [{ name: "Bàn phím", unit: "cái", price: "800.000", stock: "1" }],
  });

  // Both buyers have the page open while one unit is left.
  await first.page.goto(listingPath);
  await second.page.goto(listingPath);
  const quantity = second.page.getByRole("textbox", { name: /^Bàn phím/ });
  await expect(quantity).toHaveAccessibleName(/Còn 1/);

  // More than the stock is refused before anything is sent.
  await quantity.fill("2");
  await second.page.getByLabel("Giao đến").fill("Tầng 3");
  await second.page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(second.page.getByText("Bàn phím: Chỉ còn 1 cái")).toBeVisible();

  // The first buyer takes the last one.
  await first.page.getByRole("textbox", { name: /^Bàn phím/ }).fill("1");
  await first.page.getByLabel("Giao đến").fill("Tầng 5");
  await first.page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(first.page).toHaveURL(/\/orders\//);

  // The second buyer, still looking at a stale page, is told it is gone.
  await quantity.fill("1");
  await second.page.getByRole("button", { name: "Đặt hàng" }).click();
  const alert = second.page.getByRole("alert").filter({ hasText: "Không còn đủ hàng" });
  await expect(alert).toContainText("Bàn phím: còn 0");
  await expect(second.page).toHaveURL(listingPath);

  // The refreshed listing now shows it as sold out.
  await expect(second.page.getByRole("textbox", { name: /^Bàn phím/ })).toBeDisabled();
});
