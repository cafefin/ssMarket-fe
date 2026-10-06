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
  const form = admin.page.locator('form[aria-label="Thêm danh mục"]');
  await form.getByLabel("Tên danh mục").fill(name);
  await form.getByLabel("Tên tiếng Anh").fill("Books");
  await form.getByRole("button", { name: "Thêm", exact: true }).click();
  const row = admin.page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();

  const select = seller.page.getByLabel("Loại hàng");
  // /sell/new starts at the mode step, or opens the form directly when a
  // draft was kept, so handle whichever shows up.
  const openForm = async () => {
    await seller.page.goto("/sell/new");
    const mode = seller.page.getByRole("button", { name: /Hàng có sẵn/ });
    await expect(mode.or(select)).toBeVisible();
    if (await mode.isVisible()) {
      await mode.click();
    }
    await expect(select).toBeVisible();
    // Wait for the categories to load: the select starts empty, so a
    // missing category proves nothing until a seeded one is there.
    await expect(
      select.locator("option", { hasText: "Điện tử" }),
    ).toBeAttached();
    return select.locator("option", { hasText: name });
  };
  await expect(await openForm()).toHaveCount(1);

  await row.getByRole("button", { name: `Ẩn ${name}` }).click();
  await expect(row.getByRole("button", { name: `Hiện ${name}` })).toBeVisible();

  await expect(await openForm()).toHaveCount(0);
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
  await expect(
    buyer.page.getByRole("heading", { level: 1, name: seller.name }),
  ).toBeVisible();
  await expect(
    buyer.page.getByRole("heading", { name: "Đang bán" }),
  ).toBeVisible();
  await expect(
    buyer.page
      .getByRole("region", { name: "Đang bán" })
      .getByRole("link", { name: new RegExp(title) }),
  ).toBeVisible();
});
