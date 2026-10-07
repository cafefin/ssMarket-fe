import { type Browser, type BrowserContext, type Page, expect } from "@playwright/test";

export interface Person {
  name: string;
  context: BrowserContext;
  page: Page;
}

const runId = Date.now().toString(36);
let counter = 0;

/** A value that no other test or earlier run has used. */
export function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${runId}-${counter}`;
}

/**
 * Opens a separate browser session signed in as a new made-up person, using
 * the backend's development sign-in.
 */
export async function signInAs(browser: Browser, role: string): Promise<Person> {
  const name = unique(role);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/api/auth/dev-login?as=${name}`);
  await expect(page).toHaveURL("/");
  return { name, context, page };
}

/** Gives a seller the bank details that QR payments require. */
export async function addBankProfile(person: Person): Promise<void> {
  const response = await person.page.request.patch("/api/users/me", {
    data: {
      bankBin: "970436",
      bankAccountNumber: "0123456789",
      bankAccountName: "Nguyen Thi Ban",
    },
  });
  expect(response.ok()).toBe(true);
}

/** A valid 1×1 PNG, enough for the upload path. */
export const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export interface NewListing {
  title: string;
  mode: "in_stock" | "preorder";
  items: { name: string; unit: string; price: string; stock?: string }[];
  acceptQr?: boolean;
  photo?: boolean;
}

/** Posts a listing through the "Đăng bán" form and returns its URL path. */
export async function postListing(seller: Person, listing: NewListing): Promise<string> {
  const { page } = seller;
  await page.goto("/sell/new");
  await page
    .getByRole("button", {
      name: listing.mode === "in_stock" ? /Hàng có sẵn/ : /Đặt trước/,
    })
    .click();

  await page.getByLabel("Tiêu đề").fill(listing.title);
  await page
    .getByLabel("Loại hàng")
    .selectOption({ label: listing.mode === "in_stock" ? "Điện tử" : "Thực phẩm tươi" });

  if (listing.mode === "preorder") {
    const deadline = new Date(Date.now() + 3 * 86_400_000);
    const delivery = new Date(Date.now() + 5 * 86_400_000);
    const day = (date: Date) => date.toISOString().slice(0, 10);
    await page.getByLabel("Hạn chốt đơn").fill(`${day(deadline)}T17:00`);
    await page.getByLabel("Ngày giao").fill(day(delivery));
  }

  for (const [index, item] of listing.items.entries()) {
    if (index > 0) {
      await page.getByRole("button", { name: "Thêm mặt hàng" }).click();
    }
    const row = page.getByRole("group", { name: `Mặt hàng ${index + 1}` });
    await row.getByLabel("Tên").fill(item.name);
    await row.getByLabel("Đơn vị").selectOption(item.unit);
    await row.getByLabel("Đơn giá (đ)").fill(item.price);
    if (item.stock) {
      await row.getByLabel("Số lượng có").fill(item.stock);
    }
  }

  if (listing.acceptQr) {
    await page.getByLabel(/Chuyển khoản trước qua mã QR/).check();
  }
  if (listing.photo) {
    await page
      .getByLabel("Thêm ảnh")
      .setInputFiles({ name: "anh.png", mimeType: "image/png", buffer: tinyPng });
  }

  await page.getByRole("button", { name: "Đăng bán" }).click();
  await expect(page).toHaveURL(/\/listings\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: listing.title })).toBeVisible();
  return new URL(page.url()).pathname;
}

/**
 * Signs in as the suite's one admin. The name is fixed (not unique) because
 * ADMIN_EMAILS in start-backend.sh names it.
 */
export async function signInAsAdmin(browser: Browser): Promise<Person> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/api/auth/dev-login?as=e2e-admin");
  await expect(page).toHaveURL("/");
  return { name: "e2e-admin", context, page };
}
