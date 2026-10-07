import { expect, test } from "@playwright/test";
import { addBankProfile, postListing, signInAs, unique } from "./support/people";

test("a buyer fills a cart from two sellers on the list page and checks out once", async ({
  browser,
}) => {
  const pens = await signInAs(browser, "ban-but");
  const mice = await signInAs(browser, "ban-chuot");
  const buyer = await signInAs(browser, "mua");
  await addBankProfile(pens);
  const penTitle = unique("Bút bi");
  const mouseTitle = unique("Chuột");

  await postListing(pens, {
    title: penTitle,
    mode: "in_stock",
    condition: "new",
    acceptQr: true,
    items: [
      {
        name: "Bút bi",
        unit: "cái",
        price: "10.000",
        stock: "500",
        combos: [{ quantity: "100", price: "900.000" }],
      },
    ],
  });
  await postListing(mice, {
    title: mouseTitle,
    mode: "in_stock",
    condition: "good",
    items: [{ name: "Chuột", unit: "cái", price: "200.000", stock: "2" }],
  });

  // Straight from the list: no need to open either product.
  const { page } = buyer;
  await page.goto(`/?q=${encodeURIComponent(penTitle)}`);
  const penCard = page.getByRole("listitem").filter({ hasText: penTitle });
  await expect(penCard).toContainText("Mới 100%");
  await expect(penCard).toContainText("Có combo");
  await penCard.getByRole("textbox", { name: "Số lượng" }).fill("100");
  await penCard.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByText("Đã thêm vào giỏ")).toBeVisible();

  await page.goto(`/?q=${encodeURIComponent(mouseTitle)}`);
  const mouseCard = page.getByRole("listitem").filter({ hasText: mouseTitle });
  await mouseCard.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByRole("link", { name: "Giỏ hàng, 2 món" })).toBeVisible();

  // The cart: grouped by seller, the combo already applied.
  await page.getByRole("link", { name: "Giỏ hàng, 2 món" }).click();
  await expect(page).toHaveURL("/cart");
  await expect(page.getByRole("region", { name: pens.name })).toContainText(
    "900.000 đ",
  );
  await expect(page.getByText("Tổng 2 món đã chọn")).toBeVisible();
  await page.getByRole("button", { name: "Mua hàng (2)" }).click();

  // One order per seller, each with its own payment method.
  await expect(page).toHaveURL(/\/checkout\?items=/);
  const penOrder = page.getByRole("region", { name: `Đơn của Dev ${pens.name}` });
  await penOrder.getByRole("radio", { name: "Chuyển khoản trước qua mã QR" }).check();
  await penOrder.getByLabel("Giao đến").fill("Tầng 7");
  await page
    .getByRole("region", { name: `Đơn của Dev ${mice.name}` })
    .getByLabel("Giao đến")
    .fill("Tầng 7");
  await page.getByRole("button", { name: "Đặt 2 đơn" }).click();

  await expect(page.getByRole("heading", { name: "Đã tạo 2 đơn" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Mã QR chuyển khoản cho đơn/ })).toHaveCount(1);
  await expect(page.getByText("Trả 200.000 đ khi nhận hàng")).toBeVisible();

  // The cart is empty again, and each seller received their order.
  await page.goto("/cart");
  await expect(page.getByText("Giỏ hàng đang trống.")).toBeVisible();
  await pens.page.goto("/sell/orders");
  const received = pens.page.getByRole("listitem").filter({ hasText: penTitle });
  await expect(received).toContainText("900.000 đ");
});

test("a buyer narrows the list by price and condition", async ({ browser }) => {
  const seller = await signInAs(browser, "ban");
  const buyer = await signInAs(browser, "mua");
  const word = unique("Bàn phím");
  await postListing(seller, {
    title: `${word} cũ`,
    mode: "in_stock",
    condition: "fair",
    items: [{ name: "Bàn phím", unit: "cái", price: "150.000", stock: "1" }],
  });
  await postListing(seller, {
    title: `${word} như mới`,
    mode: "in_stock",
    condition: "like_new",
    items: [{ name: "Bàn phím", unit: "cái", price: "1.500.000", stock: "1" }],
  });

  const { page } = buyer;
  await page.goto(`/?q=${encodeURIComponent(word)}`);
  await page.getByText("Độ mới", { exact: true }).click();
  await page.getByRole("link", { name: "Từ 95% (Rất tốt)" }).click();
  await expect(page.getByRole("link", { name: new RegExp(`${word} như mới`) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`${word} cũ`) })).toHaveCount(0);

  await page.goto(`/?q=${encodeURIComponent(word)}`);
  await page.getByText("Giá", { exact: true }).click();
  await page.getByRole("link", { name: "200.000 đ – 1.000.000 đ" }).click();
  await expect(
    page.getByRole("heading", { name: `Không tìm thấy kết quả cho “${word}”` }),
  ).toBeVisible();
});
