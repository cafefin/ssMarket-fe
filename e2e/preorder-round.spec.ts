import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { postListing, signInAs, unique } from "./support/people";

test("a seller runs a whole pre-order round from the summary table and reopens it", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const minh = await signInAs(browser, "minh");
  const lan = await signInAs(browser, "lan");
  const title = `Hoa qua tuan ${unique("dot")}`;

  const listingPath = await postListing(seller, {
    title,
    mode: "preorder",
    items: [
      { name: "Cam ngọt", unit: "kg", price: "35.000" },
      { name: "Cam vắt", unit: "kg", price: "25.000" },
      { name: "Bưởi", unit: "cái", price: "60.000" },
    ],
  });
  const listingId = listingPath.split("/").pop() as string;

  // Two colleagues order, to different floors.
  await minh.page.goto(listingPath);
  await minh.page.getByRole("textbox", { name: /^Cam ngọt/ }).fill("2");
  await minh.page.getByLabel("Giao đến").fill("Tầng 7");
  await minh.page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(minh.page).toHaveURL(/\/orders\//);

  await lan.page.goto(listingPath);
  await lan.page.getByRole("textbox", { name: /^Bưởi/ }).fill("1");
  await lan.page.getByLabel("Giao đến").fill("Tầng 3");
  await lan.page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(lan.page).toHaveURL(/\/orders\//);

  // Minh changes his mind before the deadline: more oranges, plus juice oranges.
  await minh.page.getByRole("button", { name: "Sửa đơn" }).click();
  await minh.page.getByRole("textbox", { name: /^Cam ngọt/ }).fill("3");
  await minh.page.getByRole("textbox", { name: /^Cam vắt/ }).fill("1");
  await expect(minh.page.getByRole("status", { name: "Tổng tiền mới" })).toHaveText(
    "130.000 đ",
  );
  await minh.page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(minh.page.getByRole("row", { name: /Tổng tiền/ })).toContainText(
    "130.000 đ",
  );

  // Everyone can see how busy the round is, but not who ordered.
  await lan.page.goto(listingPath);
  await expect(lan.page.getByText("2 người đã đặt")).toBeVisible();
  await lan.page.goto(`/sell/listings/${listingId}`);
  await expect(
    lan.page.getByRole("heading", { name: "Không tìm thấy bài đăng" }),
  ).toBeVisible();

  // The seller's summary: one row each, totals that add up.
  await seller.page.goto(`/sell/listings/${listingId}`);
  await expect(seller.page.getByRole("heading", { name: title })).toBeVisible();
  const figures = seller.page.locator("dl").first();
  await expect(figures).toContainText("190.000 đ");
  const minhRow = seller.page.getByRole("row", { name: new RegExp(minh.name) });
  const lanRow = seller.page.getByRole("row", { name: new RegExp(lan.name) });
  await expect(minhRow).toContainText("Tầng 7");
  await expect(minhRow).toContainText("130.000 đ");
  await expect(lanRow).toContainText("60.000 đ");
  await expect(seller.page.getByRole("row", { name: /Tổng 2 đơn/ })).toContainText(
    "190.000 đ",
  );

  // Money arrived for both: confirm them in one go.
  await seller.page
    .getByRole("checkbox", { name: "Chọn tất cả đơn đang hiện" })
    .check();
  await seller.page.getByRole("button", { name: "Xác nhận đã nhận tiền" }).click();
  await expect(minhRow.getByText("Đã thanh toán")).toBeVisible();
  await expect(lanRow.getByText("Đã thanh toán")).toBeVisible();

  // Deliver floor by floor.
  await seller.page.getByRole("checkbox", { name: "Gom theo nơi giao" }).check();
  await seller.page
    .getByRole("button", { name: "Đánh dấu đã giao cả nhóm Tầng 3" })
    .click();
  await expect(lanRow.getByText("Đã giao")).toBeVisible();
  await expect(minhRow.getByText("Chờ giao")).toBeVisible();

  // The spreadsheet export has the same people and numbers.
  const [download] = await Promise.all([
    seller.page.waitForEvent("download"),
    seller.page.getByRole("link", { name: "Xuất CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^ssmarket-hoa-qua-tuan-.*\.csv$/);
  const csv = await readFile(await download.path(), "utf8");
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain("Cam ngọt (kg),Cam vắt (kg),Bưởi (cái),Tổng tiền");
  expect(csv).toContain(`${minh.name},`);
  expect(csv).toContain("Tầng 7,3,1,,130000");
  expect(csv).toContain("Tổng,2 đơn,,,3,1,1,190000");

  // Close the round, then start next week's from it.
  await seller.page.goto("/sell");
  const openRow = seller.page.getByRole("listitem", { name: title });
  await openRow.getByRole("button", { name: "Đóng bài" }).click();
  await seller.page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Đóng bài" })
    .click();
  await expect(openRow).toHaveCount(0);

  await seller.page.goto("/sell?tab=closed");
  await seller.page
    .getByRole("listitem", { name: title })
    .getByRole("button", { name: "Mở lại" })
    .click();
  await expect(seller.page).toHaveURL(/\/listings\/[0-9a-f-]{36}\/edit\?reopened=1$/);
  expect(seller.page.url()).not.toContain(listingId);
  await expect(seller.page.getByText(/Kiểm tra hạn chốt, ngày giao và giá/)).toBeVisible();
  await expect(seller.page.getByLabel("Tiêu đề")).toHaveValue(title);
  await expect(
    seller.page
      .getByRole("group", { name: "Phân loại 3" })
      .getByLabel(/^Tên phân loại/),
  ).toHaveValue("Bưởi");

  await seller.page.getByRole("button", { name: "Đăng bán" }).click();
  await expect(seller.page).toHaveURL(/\/listings\/[0-9a-f-]{36}$/);
  expect(seller.page.url()).not.toContain(listingId);
  await expect(seller.page.getByRole("heading", { name: title })).toBeVisible();

  // The finished round still has its two orders.
  await seller.page.goto(`/sell/listings/${listingId}`);
  await expect(seller.page.getByRole("row", { name: /Tổng 2 đơn/ })).toBeVisible();
});
