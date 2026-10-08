import { expect, test } from "@playwright/test";
import { buyNow, openPlacedOrder, postListing, signInAs, unique } from "./support/people";

test("the last unit goes to whoever orders first", async ({ browser }) => {
  const seller = await signInAs(browser, "ban");
  const first = await signInAs(browser, "nhanh");
  const second = await signInAs(browser, "cham");
  const title = `Ban phim co ${unique("phim")}`;

  const listingPath = await postListing(seller, {
    title,
    mode: "in_stock",
    unit: "cái",
    price: "800.000",
    stock: "1",
  });

  // More than the stock cannot even be chosen.
  await second.page.goto(listingPath);
  const quantity = second.page.getByRole("textbox", { name: "Số lượng" });
  await expect(second.page.getByText("Còn 1 cái")).toBeVisible();
  await expect(second.page.getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();
  await quantity.fill("2");
  await expect(second.page.getByText("Chỉ còn 1 cái")).toBeVisible();
  await expect(second.page.getByRole("button", { name: "Mua ngay" })).toBeDisabled();

  // The second buyer opens the checkout for the last one, and waits.
  await quantity.fill("1");
  await second.page.getByRole("button", { name: "Mua ngay" }).click();
  await expect(second.page).toHaveURL(/\/checkout\?items=/);

  // Meanwhile the first buyer takes it.
  await buyNow(first, listingPath, "1");
  await openPlacedOrder(first);

  // The second buyer is told it is gone, and no order is created.
  await second.page.getByLabel("Giao đến").fill("Tầng 3");
  await second.page.getByRole("button", { name: "Đặt 1 đơn" }).click();
  const alert = second.page.getByRole("alert").filter({ hasText: "Không còn đủ hàng" });
  await expect(alert).toContainText(`${title}: còn 0`);

  // The product now shows as sold out, also in the list "Có sẵn" leaves it out.
  await second.page.goto(listingPath);
  await expect(second.page.getByRole("button", { name: "Hết hàng" })).toBeDisabled();
  await second.page.goto(`/?q=${encodeURIComponent(title)}`);
  await expect(second.page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
  await second.page.getByRole("button", { name: "Tất cả" }).click();
  await expect(second.page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
});
