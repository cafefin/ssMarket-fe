import { expect, test } from "@playwright/test";
import { postListing, signInAs, signInAsAdmin, unique } from "./support/people";

test("an admin adds a category that sellers can use, then hides it", async ({
  browser,
}) => {
  const admin = await signInAsAdmin(browser);
  const seller = await signInAs(browser, "ban");
  const name = unique("Sách");

  await admin.page.getByRole("button", { name: /^Tài khoản của/ }).click();
  await admin.page.getByRole("menuitem", { name: "Quản lý danh mục" }).click();
  await expect(admin.page).toHaveURL("/admin/categories");
  await admin.page.getByLabel("Tên danh mục").fill(name);
  await admin.page.getByLabel("Tên tiếng Anh", { exact: true }).first().fill("Books");
  await admin.page.getByRole("button", { name: "Thêm", exact: true }).click();
  const row = admin.page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();

  const options = async () => {
    await seller.page.goto("/sell/new");
    // A draft kept from the first visit skips the mode step.
    const mode = seller.page.getByRole("button", { name: /Hàng có sẵn/ });
    await expect(mode.or(seller.page.getByLabel("Loại hàng"))).toBeVisible();
    if (await mode.isVisible()) {
      await mode.click();
    }
    return seller.page.getByLabel("Loại hàng").locator("option", { hasText: name });
  };
  await expect(await options()).toHaveCount(1);

  await row.getByRole("button", { name: `Ẩn ${name}` }).click();
  await expect(row.getByRole("button", { name: `Hiện ${name}` })).toBeVisible();

  await expect(await options()).toHaveCount(0);
});

test("a buyer reaches the seller page from a listing", async ({ browser }) => {
  const seller = await signInAs(browser, "ban");
  const buyer = await signInAs(browser, "mua");
  const title = unique("Mật ong");

  // "hũ" is not one of the backend's listing units, so "hộp" stands in.
  const listingPath = await postListing(seller, {
    title,
    mode: "in_stock",
    items: [{ name: "Mật ong", unit: "hộp", price: "90.000", stock: "24" }],
  });

  await buyer.page.goto("/");
  const card = buyer.page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await expect(card).toContainText("còn 24 hộp");
  await card.click();
  await expect(buyer.page).toHaveURL(listingPath);

  await buyer.page.getByRole("link", { name: "Xem trang người bán" }).click();
  await expect(buyer.page).toHaveURL(/\/sellers\/[0-9a-f-]{36}$/);
  await expect(buyer.page.getByRole("heading", { level: 1, name: seller.name })).toBeVisible();
  await expect(buyer.page.getByRole("heading", { name: "Đang bán" })).toBeVisible();
  await expect(buyer.page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
});
