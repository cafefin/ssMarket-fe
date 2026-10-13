import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { buyRound, openPlacedOrder, postRound, signInAs, unique } from "./support/people";

test("a seller runs a whole pre-order round from the summary table and reopens it", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const minh = await signInAs(browser, "minh");
  const lan = await signInAs(browser, "lan");
  const title = `Hoa qua tuan ${unique("dot")}`;
  const fruit = `Cam ${unique("sanh")}`;

  const roundPath = await postRound(seller, {
    title,
    items: [{ title: fruit, price: "35.000" }],
  });
  const roundId = roundPath.split("/").pop() as string;

  // Two colleagues order, to different floors.
  await buyRound(minh, roundPath, { [fruit]: "2" }, { location: "Tầng 7" });
  await openPlacedOrder(minh);
  await buyRound(lan, roundPath, { [fruit]: "1" }, { location: "Tầng 3" });
  await openPlacedOrder(lan);

  // The person changes their mind before the deadline: more oranges.
  await minh.page.goto(roundPath);
  await minh.page.getByRole("link", { name: "Sửa đơn" }).click();
  await minh.page.getByRole("textbox", { name: `Số lượng ${fruit}` }).fill("3");
  await expect(minh.page.getByRole("status", { name: "Tổng tiền mới" })).toHaveText(
    "105.000 đ",
  );
  await minh.page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(minh.page.getByRole("row", { name: /Tổng tiền/ })).toContainText(
    "105.000 đ",
  );

  // Only the seller sees the summary.
  await lan.page.goto(`/sell/campaigns/${roundId}`);
  await expect(lan.page.getByRole("heading", { name: "Không tìm thấy đợt" })).toBeVisible();

  // The seller's summary: one row each, totals that add up.
  await seller.page.goto(`/sell/campaigns/${roundId}`);
  await expect(seller.page.getByRole("heading", { name: title })).toBeVisible();
  const figures = seller.page.locator("dl").first();
  await expect(figures).toContainText("140.000 đ");
  const minhRow = seller.page.getByRole("row", { name: new RegExp(minh.name) });
  const lanRow = seller.page.getByRole("row", { name: new RegExp(lan.name) });
  await expect(minhRow).toContainText("Tầng 7");
  await expect(minhRow).toContainText("105.000 đ");
  await expect(lanRow).toContainText("35.000 đ");
  await expect(seller.page.getByRole("row", { name: /Tổng 2 đơn/ })).toContainText(
    "140.000 đ",
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
  expect(csv).toContain(`${fruit} (cái)`);
  expect(csv).toContain(`${minh.name},`);
  expect(csv).toContain("Tầng 7,3,105000");
  expect(csv).toContain("Tổng,2 đơn,,,4,140000");

  // Close the round, then start next week's from it.
  await seller.page.goto("/sell");
  const openRow = seller.page.getByRole("listitem", { name: title });
  await openRow.getByRole("button", { name: "Đóng đợt" }).click();
  await seller.page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Đóng đợt" })
    .click();
  await expect(openRow).toHaveCount(0);

  await seller.page.goto("/sell?tab=closed");
  await seller.page
    .getByRole("listitem", { name: title })
    .getByRole("button", { name: "Mở lại đợt" })
    .click();
  await expect(seller.page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}\/edit\?reopened=1$/);
  expect(seller.page.url()).not.toContain(roundId);
  await expect(seller.page.getByText(/Kiểm tra hạn chốt, ngày giao và giá/)).toBeVisible();
  await expect(seller.page.getByLabel("Tên đợt")).toHaveValue(title);
  await expect(seller.page.getByLabel("Giá món 1 (đ)")).toHaveValue("35.000");

  // The copy is a draft: publish it as next week's round.
  await seller.page.getByRole("button", { name: "Đăng đợt" }).click();
  await expect(seller.page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/);
  expect(seller.page.url()).not.toContain(roundId);
  await expect(seller.page.getByRole("heading", { name: title })).toBeVisible();

  // The finished round still has its two orders.
  await seller.page.goto(`/sell/campaigns/${roundId}`);
  await expect(seller.page.getByRole("row", { name: /Tổng 2 đơn/ })).toBeVisible();
});
