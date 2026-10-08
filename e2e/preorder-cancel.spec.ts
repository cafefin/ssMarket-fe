import { expect, test } from "@playwright/test";
import { buyNow, openPlacedOrder, postListing, signInAs, unique } from "./support/people";

test("a pre-order allows one order per person, which can be cancelled and redone", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const buyer = await signInAs(browser, "mua");
  const title = `Cam ngot tuan nay ${unique("cam")}`;

  const listingPath = await postListing(seller, {
    title,
    mode: "preorder",
    unit: "kg",
    price: "35.000",
  });
  await expect(seller.page.getByText("Chốt đơn")).toBeVisible();

  await buyNow(buyer, listingPath, "2", { location: "Tầng 9" });
  const orderUrl = await openPlacedOrder(buyer);
  await expect(buyer.page.getByText("70.000 đ").first()).toBeVisible();
  await expect(
    buyer.page.getByText("Bạn trả tiền cho người bán khi nhận hàng."),
  ).toBeVisible();

  // A second order on the same round is refused and points to the first.
  await buyNow(buyer, listingPath, "1", { location: "Tầng 9" });
  await expect(buyer.page.getByText(/Bạn đã đặt đợt này/)).toBeVisible();
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
  await buyNow(buyer, listingPath, "3", { location: "Tầng 9" });
  const second = await openPlacedOrder(buyer);
  expect(second).not.toBe(orderUrl);
  await expect(buyer.page.getByText("105.000 đ").first()).toBeVisible();

  await buyer.page.goto("/orders");
  await expect(buyer.page.getByRole("listitem").filter({ hasText: title })).toHaveCount(2);
});
