import { expect, test } from "@playwright/test";
import { addBankProfile, postListing, signInAs, unique } from "./support/people";

test("a buyer finds a listing, pays by QR and the seller completes the order", async ({
  browser,
}) => {
  const seller = await signInAs(browser, "ban");
  const buyer = await signInAs(browser, "mua");
  await addBankProfile(seller);
  // Diacritics in the title, so the unaccented search below proves something.
  const word = unique("loa");
  const title = `Loa bluetooth cũ ${word}`;

  const listingPath = await postListing(seller, {
    title,
    mode: "in_stock",
    acceptQr: true,
    photo: true,
    items: [
      { name: "Loa JBL", unit: "cái", price: "500.000", stock: "3" },
      { name: "Cam sành", unit: "kg", price: "35.000", stock: "10" },
    ],
  });

  // The buyer searches without diacritics and opens the listing.
  await buyer.page.goto("/");
  const search = buyer.page.getByRole("searchbox", { name: "Tìm kiếm bài đăng" });
  await search.fill(`loa bluetooth cu ${word}`);
  await search.press("Enter");
  const card = buyer.page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toHaveAttribute("src", /_thumb\.webp$/);
  await card.click();
  await expect(buyer.page).toHaveURL(listingPath);

  // Two speakers and 1.5 kg of oranges: 2 × 500,000 + 1.5 × 35,000.
  await buyer.page.getByRole("textbox", { name: /^Loa JBL/ }).fill("2");
  await buyer.page.getByRole("textbox", { name: /^Cam sành/ }).fill("1,5");
  await expect(buyer.page.getByRole("status", { name: "Tổng tiền" })).toHaveText(
    "1.052.500 đ",
  );
  await buyer.page.getByLabel("Giao đến").fill("Tầng 7");
  await buyer.page.getByRole("button", { name: "Đặt hàng" }).click();

  // The order page shows the QR code with the same amount and the order code.
  await expect(buyer.page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  const heading = buyer.page.getByRole("heading", { name: /^Đơn SSM/ });
  await expect(heading).toBeVisible();
  const code = ((await heading.textContent()) ?? "").replace("Đơn", "").trim();
  expect(code).toMatch(/^SSM[2-9A-HJ-NP-Z]{6}$/);
  await expect(
    buyer.page.getByRole("img", { name: `Mã QR chuyển khoản cho đơn ${code}` }),
  ).toBeVisible();
  const transfer = buyer.page.getByRole("region", { name: "Thông tin chuyển khoản" });
  await expect(transfer).toContainText("Vietcombank");
  await expect(transfer).toContainText("0123456789");
  await expect(transfer).toContainText("1.052.500 đ");
  await expect(transfer).toContainText(code);

  await buyer.page.getByRole("button", { name: "Tôi đã chuyển khoản" }).click();
  await expect(buyer.page.getByText("Chờ xác nhận tiền")).toBeVisible();

  // The seller sees the order, confirms the money and delivers.
  await seller.page.goto("/sell/orders");
  const row = seller.page.getByRole("listitem", { name: `Đơn ${code}` });
  await expect(row).toContainText(buyer.name);
  await expect(row).toContainText("Tầng 7");
  await row.getByRole("button", { name: "Đã nhận tiền" }).click();
  await expect(row.getByText("Đã thanh toán")).toBeVisible();
  await row.getByRole("button", { name: "Đã giao" }).click();
  await expect(row.getByText("Đã giao", { exact: true }).first()).toBeVisible();

  // Both sides see the final state, and the stock went down.
  await buyer.page.reload();
  await expect(buyer.page.getByText("Đã thanh toán")).toBeVisible();
  await expect(buyer.page.getByText("Đơn hàng đã hoàn tất.")).toBeVisible();
  await expect(buyer.page.getByRole("img", { name: /Mã QR/ })).toHaveCount(0);

  await buyer.page.goto(listingPath);
  await expect(buyer.page.getByRole("row", { name: /Loa JBL/ })).toContainText("1 cái");
  await expect(buyer.page.getByRole("row", { name: /Cam sành/ })).toContainText(
    "8,5 kg",
  );
});
