import { expect, test } from "@playwright/test";
import { buyRound, openPlacedOrder, postRound, signInAs, unique } from "./support/people";

test("a pre-order round allows one order per person, which can be cancelled and redone", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const buyer = await signInAs(browser, "mua");
  const title = `Cam ngot tuan nay ${unique("cam")}`;
  const fruit = `Cam sanh ${unique("loai")}`;

  const roundPath = await postRound(seller, {
    title,
    items: [{ title: fruit, price: "35.000" }],
  });
  await expect(seller.page.getByText("Chốt đơn")).toBeVisible();

  await buyRound(buyer, roundPath, { [fruit]: "2" }, { location: "Tầng 9" });
  const orderUrl = await openPlacedOrder(buyer);
  await expect(buyer.page.getByText("70.000 đ").first()).toBeVisible();
  await expect(
    buyer.page.getByText("Bạn trả tiền cho người bán khi nhận hàng."),
  ).toBeVisible();

  // The round page no longer offers to buy: it points to the order.
  await buyer.page.goto(roundPath);
  await expect(buyer.page.getByText(/Bạn đã đặt đợt này/)).toBeVisible();
  await expect(buyer.page.getByRole("button", { name: "Mua ngay" })).toHaveCount(0);
  await buyer.page.getByRole("link", { name: "Sửa đơn" }).click();
  await expect(buyer.page).toHaveURL(`${orderUrl}?edit=1`);

  // Cancel it, after confirming.
  await buyer.page.getByRole("button", { name: "Thôi" }).click();
  await buyer.page.getByRole("button", { name: "Hủy đơn" }).click();
  const dialog = buyer.page.getByRole("alertdialog");
  await expect(dialog).toContainText("Hủy đơn SSM");
  await dialog.getByRole("button", { name: "Hủy đơn" }).click();
  await expect(buyer.page.getByText("Đã hủy", { exact: true })).toBeVisible();
  await expect(buyer.page.getByText("Người mua đã hủy đơn này.")).toBeVisible();

  // Now a new order goes through, and both show in "Đơn của tôi".
  await buyRound(buyer, roundPath, { [fruit]: "3" }, { location: "Tầng 9" });
  const second = await openPlacedOrder(buyer);
  expect(second).not.toBe(orderUrl);
  await expect(buyer.page.getByText("105.000 đ").first()).toBeVisible();

  await buyer.page.goto("/orders");
  await expect(buyer.page.getByRole("listitem").filter({ hasText: title })).toHaveCount(2);
});
