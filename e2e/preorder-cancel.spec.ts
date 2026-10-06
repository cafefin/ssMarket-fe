import { expect, test } from "@playwright/test";
import { postListing, signInAs, unique } from "./support/people";

test("a pre-order allows one order per person, which can be cancelled and redone", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const buyer = await signInAs(browser, "mua");
  const title = `Hoa qua tuan nay ${unique("hoaqua")}`;

  const listingPath = await postListing(seller, {
    title,
    mode: "preorder",
    items: [
      { name: "Cam ngọt", unit: "kg", price: "35.000" },
      { name: "Cam vắt", unit: "kg", price: "25.000" },
    ],
  });
  await expect(seller.page.getByText("Chốt đơn")).toBeVisible();

  const order = async (quantity: string) => {
    await buyer.page.goto(listingPath);
    await buyer.page.getByRole("textbox", { name: /^Cam ngọt/ }).fill(quantity);
    await buyer.page.getByLabel("Giao đến").fill("Tầng 9");
    await buyer.page.getByRole("button", { name: "Đặt hàng" }).click();
  };

  await order("2");
  await expect(buyer.page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  const orderUrl = buyer.page.url();
  await expect(buyer.page.getByText("70.000 đ").first()).toBeVisible();
  await expect(
    buyer.page.getByText("Bạn trả tiền cho người bán khi nhận hàng."),
  ).toBeVisible();

  // A second order on the same round is refused and points to the first.
  await order("1");
  await expect(buyer.page.getByText("Bạn đã đặt bài này")).toBeVisible();
  await buyer.page.getByRole("link", { name: "Xem đơn của bạn" }).click();
  await expect(buyer.page).toHaveURL(orderUrl);

  // Cancel it, after confirming.
  await buyer.page.getByRole("button", { name: "Hủy đơn" }).click();
  const dialog = buyer.page.getByRole("alertdialog");
  await expect(dialog).toContainText("Hủy đơn SSM");
  await dialog.getByRole("button", { name: "Hủy đơn" }).click();
  await expect(buyer.page.getByText("Đã hủy", { exact: true })).toBeVisible();
  await expect(buyer.page.getByText("Người mua đã hủy đơn này.")).toBeVisible();

  // Now a new order goes through, and both show in "Đơn của tôi".
  await order("3");
  await expect(buyer.page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  expect(buyer.page.url()).not.toBe(orderUrl);
  await expect(buyer.page.getByText("105.000 đ").first()).toBeVisible();

  await buyer.page.goto("/orders");
  await expect(buyer.page.getByRole("listitem").filter({ hasText: title })).toHaveCount(2);
});
