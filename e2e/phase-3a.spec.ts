import { expect, test } from "@playwright/test";
import { buyNow, postListing, signInAs, signInAsAdmin, unique } from "./support/people";

test("the seller is notified of a new order and opens it from the bell", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const buyer = await signInAs(browser, "mua");
  const title = `Quạt mini ${unique("quat")}`;
  const listingPath = await postListing(seller, {
    title,
    unit: "cái",
    price: "120.000",
    stock: "2",
  });

  await buyNow(buyer, listingPath, "1");
  await expect(buyer.page.getByRole("heading", { name: "Đã tạo 1 đơn" })).toBeVisible();

  // The worker turns the event into a notification a moment later.
  await seller.page.goto("/");
  const bell = seller.page.getByRole("button", { name: /^Thông báo/ });
  await expect
    .poll(
      async () => {
        await seller.page.reload();
        return bell.getAttribute("aria-label");
      },
      { timeout: 15_000, intervals: [500, 1000, 1000] },
    )
    .toBe("Thông báo, 1 chưa đọc");

  await bell.click();
  const entry = seller.page.getByRole("button", {
    name: new RegExp(`Dev ${buyer.name} đặt đơn SSM\\S+ \\(${title}\\)`),
  });
  await expect(entry).toBeVisible();
  await entry.click();

  await expect(seller.page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  await expect(seller.page.getByRole("heading", { name: /^Đơn SSM/ })).toBeVisible();
  await expect(seller.page.getByRole("button", { name: "Thông báo", exact: true })).toBeVisible();
});

test("an admin edits a template and sees the preview", async ({ browser }) => {
  const admin = await signInAsAdmin(browser);
  const { page } = admin;

  await page.getByRole("button", { name: /^Tài khoản của/ }).click();
  await page.getByRole("menuitem", { name: "Kênh Google Chat" }).click();
  await expect(page).toHaveURL("/admin/chat-channel");

  const card = page.getByRole("article", { name: "Đợt đặt trước mới mở" });
  const field = card.getByLabel("Mẫu tin", { exact: true });
  await field.fill("Mở đợt {{campaignTitle}}");
  await expect(card.getByRole("region", { name: "Xem trước" })).toHaveText(
    "Mở đợt Bánh trung thu Kinh Đô",
  );

  await field.fill("Mở đợt {{price}}");
  await expect(card.getByText("Biến không dùng được cho loại tin này: price")).toBeVisible();
  await expect(card.getByRole("button", { name: "Lưu mẫu" })).toBeDisabled();

  await field.fill("Mở đợt {{campaignTitle}}");
  await card.getByRole("button", { name: "Lưu mẫu" }).click();
  await expect(page.getByText("Đã lưu mẫu")).toBeVisible();

  // Back to the default, so the template is not left edited.
  await card.getByRole("button", { name: "Khôi phục mặc định" }).click();
  await card.getByRole("button", { name: "Lưu mẫu" }).click();
  await expect(page.getByText("Đã lưu mẫu")).toBeVisible();
});
