import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  addBankProfile,
  buyRound,
  fillRoundTerms,
  openPlacedOrder,
  postRound,
  signInAs,
  tinyPng,
  unique,
} from "./support/people";

const CHAY = "Bánh bao chay";
const THIT = "Bánh bao nhân thịt";
const SUA = "Sữa đậu nành";

test("a pre-order round, from the Excel import to the seller's summary and a reopened copy", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const minh = await signInAs(browser, "minh");
  const lan = await signInAs(browser, "lan");
  await addBankProfile(seller);
  const roundTitle = `Banh bao tuan ${unique("dot")}`;

  // 1. The seller opens a round and imports its products from the template.
  const s = seller.page;
  await s.goto("/sell/new");
  await s.getByRole("button", { name: /Mở đợt đặt trước/ }).click();
  await fillRoundTerms(s, roundTitle);
  await s.getByLabel(/Chuyển khoản trước qua mã QR/).check();
  await s
    .getByLabel("Chọn file Excel (.xlsx)")
    .setInputFiles(path.join(process.cwd(), "public/templates/campaign-items.xlsx"));
  await expect(s.getByRole("status").filter({ hasText: "Đã thêm 3 món" })).toBeVisible();
  await expect(s.getByLabel("Tên món 1", { exact: true })).toHaveValue(CHAY);
  await expect(s.getByLabel("Tên món 2", { exact: true })).toHaveValue(THIT);
  await expect(s.getByLabel("Tên món 3", { exact: true })).toHaveValue(SUA);
  await expect(s.getByLabel("Giá món 1 (đ)")).toHaveValue("15000");
  await expect(s.getByLabel("Giá món 2 (đ)")).toHaveValue("18000");
  await expect(s.getByLabel("Giá món 3 (đ)")).toHaveValue("12000");

  await s.getByRole("button", { name: "Mở rộng món 1" }).click();
  await s
    .getByRole("listitem", { name: "Món 1" })
    .getByLabel("Thêm ảnh", { exact: true })
    .setInputFiles({ name: "anh.png", mimeType: "image/png", buffer: tinyPng });
  await s.getByRole("button", { name: "Đăng đợt" }).click();
  await expect(s).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/);
  await expect(s.getByRole("heading", { name: roundTitle })).toBeVisible();
  const roundPath = new URL(s.url()).pathname;
  const roundId = roundPath.split("/").pop() as string;

  // 2. A buyer finds the round on the shelf, in the tabs and by search.
  const m = minh.page;
  await m.goto("/");
  await expect(
    m
      .getByRole("region", { name: "Đợt đặt trước sắp chốt" })
      .getByRole("link", { name: new RegExp(roundTitle) }),
  ).toContainText("3 món");
  await m.getByRole("button", { name: "Đợt đặt trước" }).click();
  await expect(m).toHaveURL(/mode=campaign/);
  await expect(m.getByRole("link", { name: new RegExp(roundTitle) })).toHaveCount(1);
  await m.getByRole("link", { name: "Món", exact: true }).click();
  await expect(m).toHaveURL(/view=items/);
  for (const product of [CHAY, THIT, SUA]) {
    await expect(m.getByRole("link", { name: new RegExp(product) })).toBeVisible();
  }
  // Searching for a product (without accents) under "Đợt" keeps the round.
  await m.getByRole("link", { name: "Đợt", exact: true }).click();
  await m.getByRole("searchbox").fill("thit");
  await m.getByRole("searchbox").press("Enter");
  await expect(m).toHaveURL(/q=thit/);
  await expect(m.getByRole("link", { name: new RegExp(roundTitle) })).toHaveCount(1);

  // 3. From the round page: two products, then straight to the QR checkout.
  await m.goto(roundPath);
  await m.getByRole("textbox", { name: `Số lượng ${CHAY}` }).fill("2");
  await m.getByRole("textbox", { name: `Số lượng ${THIT}` }).fill("1");
  const bar = m.getByRole("region", { name: "Các món đã chọn" });
  await expect(bar).toContainText("2 món");
  await expect(bar).toContainText("48.000 đ");
  await bar.getByRole("button", { name: "Mua ngay" }).click();
  await expect(m).toHaveURL(/\/checkout\?items=/);
  await m.getByRole("radio", { name: "Chuyển khoản trước qua mã QR" }).check();
  await m.getByLabel("Giao đến").fill("Tầng 7");
  await m.getByRole("button", { name: "Đặt 1 đơn" }).click();
  const orderUrl = await openPlacedOrder(minh);
  const lines = m.getByRole("table");
  await expect(lines).toContainText(CHAY);
  await expect(lines).toContainText(THIT);
  await expect(m.getByRole("img", { name: /Mã QR chuyển khoản cho đơn/ })).toHaveCount(1);
  await expect(m.getByText("48.000 đ").first()).toBeVisible();

  // 4. Back on the round page the order is edited: the third product is added.
  await m.goto(roundPath);
  await expect(m.getByText("Bạn đã đặt đợt này")).toBeVisible();
  await m.getByRole("link", { name: "Sửa đơn" }).click();
  await expect(m).toHaveURL(/\/orders\/[0-9a-f-]{36}\?edit=1$/);
  await m.getByRole("textbox", { name: `Số lượng ${SUA}` }).fill("1");
  await expect(m.getByRole("status", { name: "Tổng tiền mới" })).toHaveText("60.000 đ");
  await m.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(m.getByRole("row", { name: /Tổng tiền/ })).toContainText("60.000 đ");
  await expect(m.getByRole("table")).toContainText(CHAY);
  await expect(m.getByRole("table")).toContainText(THIT);
  await expect(m.getByRole("table")).toContainText(SUA);
  expect(m.url().split("?")[0]).toBe(orderUrl.split("?")[0]);

  // 5. A second buyer puts two products in the cart with one click.
  const l = lan.page;
  await l.goto(roundPath);
  await l.getByRole("textbox", { name: `Số lượng ${CHAY}` }).fill("1");
  await l.getByRole("textbox", { name: `Số lượng ${SUA}` }).fill("1");
  await l.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(l.getByText("Đã thêm vào giỏ")).toBeVisible();
  await l.getByRole("link", { name: "Giỏ hàng, 2 món" }).click();
  await expect(l).toHaveURL("/cart");
  const group = l.getByRole("group", { name: roundTitle });
  await expect(group).toContainText(CHAY);
  await expect(group).toContainText(SUA);
  await l.getByRole("button", { name: "Mua hàng (2)" }).click();
  await expect(l).toHaveURL(/\/checkout\?items=/);
  await l.getByRole("radio", { name: "Trả tiền khi nhận hàng" }).check();
  await l.getByLabel("Giao đến").fill("Tầng 3");
  await l.getByRole("button", { name: "Đặt 1 đơn" }).click();
  await openPlacedOrder(lan);

  // 6. The seller's summary: a row each, a column per product, totals that add up.
  await s.goto(`/sell/campaigns/${roundId}`);
  await expect(s.getByRole("heading", { name: roundTitle })).toBeVisible();
  const minhRow = s.getByRole("row", { name: new RegExp(minh.name) });
  const lanRow = s.getByRole("row", { name: new RegExp(lan.name) });
  for (const product of [CHAY, THIT, SUA]) {
    await expect(s.getByRole("columnheader", { name: new RegExp(product) })).toBeVisible();
  }
  await expect(minhRow).toContainText("Tầng 7");
  await expect(minhRow).toContainText("60.000 đ");
  await expect(lanRow).toContainText("Tầng 3");
  await expect(lanRow).toContainText("27.000 đ");
  const totals = s.getByRole("row", { name: /Tổng 2 đơn/ });
  await expect(totals).toContainText("87.000 đ");
  await expect(s.locator("dl").first()).toContainText("87.000 đ");

  await s.getByRole("checkbox", { name: "Chọn tất cả đơn đang hiện" }).check();
  await s.getByRole("button", { name: "Xác nhận đã nhận tiền" }).click();
  await expect(minhRow.getByText("Đã thanh toán")).toBeVisible();
  await expect(lanRow.getByText("Đã thanh toán")).toBeVisible();

  const [download] = await Promise.all([
    s.waitForEvent("download"),
    s.getByRole("link", { name: "Xuất CSV" }).click(),
  ]);
  const csv = await readFile(await download.path(), "utf8");
  const header = csv.replace(/^﻿/, "").split(/\r?\n/)[0];
  for (const product of [CHAY, THIT, SUA]) {
    expect(header).toContain(product);
  }

  // 7. Close the round, then reopen it as a new draft with the same products.
  await s.goto("/sell");
  const row = s.getByRole("listitem", { name: roundTitle });
  await row.getByRole("button", { name: "Đóng đợt" }).click();
  await s.getByRole("alertdialog").getByRole("button", { name: "Đóng đợt" }).click();
  await expect(row).toHaveCount(0);

  await s.goto("/sell?tab=closed");
  await s
    .getByRole("listitem", { name: roundTitle })
    .getByRole("button", { name: "Mở lại đợt" })
    .click();
  await expect(s).toHaveURL(/\/campaigns\/[0-9a-f-]{36}\/edit/);
  expect(s.url()).not.toContain(roundId);
  await expect(s.getByLabel("Tên đợt")).toHaveValue(roundTitle);
  await expect(s.getByLabel("Tên món 1", { exact: true })).toHaveValue(CHAY);
  await expect(s.getByLabel("Tên món 2", { exact: true })).toHaveValue(THIT);
  await expect(s.getByLabel("Tên món 3", { exact: true })).toHaveValue(SUA);
});

test("a product the seller stops selling stays in the order a buyer edits afterwards", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const buyer = await signInAs(browser, "minh");
  const kept = `Banh chung ${unique("mon")}`;
  const stopped = `Banh tet ${unique("mon")}`;
  const roundPath = await postRound(seller, {
    title: `Banh Tet ${unique("dot")}`,
    items: [
      { title: kept, price: "50000" },
      { title: stopped, price: "60000" },
    ],
  });

  // The buyer orders both products: 1 x 50.000 + 2 x 60.000.
  await buyRound(buyer, roundPath, { [kept]: "1", [stopped]: "2" });
  const orderUrl = await openPlacedOrder(buyer);
  const b = buyer.page;
  await expect(b.getByRole("row", { name: /Tổng tiền/ })).toContainText("170.000 đ");

  // The seller stops selling the second product, which now has an order.
  const s = seller.page;
  await s.goto(`${roundPath}/edit`);
  await s
    .getByRole("listitem", { name: "Món 2" })
    .getByRole("switch", { name: "Ngừng bán" })
    .check();
  await s.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(s).toHaveURL(new RegExp(`${roundPath}$`));

  // Other people no longer see it on the round page.
  await b.goto(roundPath);
  await expect(b.getByText("Bạn đã đặt đợt này")).toBeVisible();
  await expect(b.getByText(stopped)).toHaveCount(0);

  // The editor still lists it, marked, at the quantity ordered and no higher.
  await b.getByRole("link", { name: "Sửa đơn" }).click();
  await expect(b).toHaveURL(/\/orders\/[0-9a-f-]{36}\?edit=1$/);
  const editor = b.getByRole("form", { name: "Sửa đơn" });
  const stoppedRow = editor.getByRole("listitem").filter({ hasText: stopped });
  await expect(stoppedRow).toContainText("Ngừng bán");
  await expect(
    editor.getByRole("textbox", { name: `Số lượng ${stopped}` }),
  ).toHaveValue("2");
  await expect(stoppedRow.getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();

  // Changing another line and saving keeps the stopped product's line.
  await editor.getByRole("textbox", { name: `Số lượng ${kept}` }).fill("3");
  await expect(editor.getByRole("status", { name: "Tổng tiền mới" })).toHaveText("270.000 đ");
  await editor.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(b.getByText("Đã cập nhật đơn")).toBeVisible();
  await expect(b.getByRole("row", { name: /Tổng tiền/ })).toContainText("270.000 đ");
  const stoppedLine = b.getByRole("row", { name: new RegExp(stopped) });
  // Still 2 of it: 2 x 60.000.
  await expect(stoppedLine).toContainText("× 60.000 đ");
  await expect(stoppedLine).toContainText("120.000 đ");
  expect(b.url().split("?")[0]).toBe(orderUrl);
});
