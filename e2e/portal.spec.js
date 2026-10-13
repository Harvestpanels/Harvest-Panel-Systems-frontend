import { test, expect } from "@playwright/test";

import { mockPortal, user } from "./portal-fixture.js";

test("portal tab titles are correct before the app loads", async ({ page }) => {
  await page.route(/\/assets\/portal-[^/]*\.js$/, route => route.abort());
  for (const [path, title] of [
    ["/portal", "Your documents"], ["/portal/profile", "Profile"],
    ["/portal/settings", "Settings"], ["/portal/admin", "Admin"],
    ["/portal/login", "Sign in"], ["/portal/signup", "Create an account"],
    ["/portal/forgot", "Reset password"], ["/portal/reset", "Choose a new password"],
    ["/portal/signout", "Signing out"],
  ]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(`${title} | Harvest Panel Systems`);
  }
});

for (const portalPath of ["/portal", "/portal/profile", "/portal/settings", "/portal/admin"]) {
  test(`refresh ${portalPath} has a borderless loader and correct navigation layers`, async ({ page, isMobile }, info) => {
    await mockPortal(page, { signedIn: true, admin: true });
    await page.goto(portalPath);
    await expect(page.locator(".hp-page-loader")).toHaveCount(0);
    await page.reload({ waitUntil: "domcontentloaded" });
    const loader = page.locator(".hp-page-loader");
    await expect(loader).toBeVisible();
    await expect(loader).toBeFocused();
    await expect(loader).toHaveCSS("outline-style", "none");
    expect(await loader.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top === 0 && rect.left === 0 && rect.bottom === innerHeight
        && element.contains(document.elementFromPoint(2, 2));
    })).toBe(true);
    await page.screenshot({ path: info.outputPath("refresh-loader.png") });
    await expect(loader).toHaveCount(0);
    await expect(page.locator("#hp-main")).toBeFocused();
    await expect(page.locator("#hp-main")).toHaveCSS("outline-style", "none");
    await expect(page.locator(".hp-nav__pill--fold")).toHaveCount(0);
    expect(await page.evaluate(() => {
      const nav = document.querySelector(".hp-nav");
      const chat = document.querySelector(".hp-chat");
      return Number(getComputedStyle(nav).zIndex) > Number(getComputedStyle(chat).zIndex);
    })).toBe(true);
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await expect(page.getByRole("button", { name: "Close menu", exact: true })).toHaveAttribute("aria-expanded", "true");
    } else {
      await page.getByRole("button", { name: `Account: ${user.email}`, exact: true }).click();
      await expect(page.locator(".hp-nav__menu-panel.is-open")).toBeVisible();
    }
    await page.screenshot({ path: info.outputPath("portal-after-refresh.png") });
  });
}

test("sign-in, account-scoped documents, audited download and existing portal design", async ({ page }, info) => {
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  const calls = await mockPortal(page);
  await page.goto("/portal/login");
  await expect(page.locator(".hp-page-loader")).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("example-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your documents" })).toBeVisible();
  await expect(page.locator(".hp-page-loader")).toHaveCount(0);
  await expect(page.getByText("Project quote.pdf", { exact: true })).toBeVisible();
  expect(calls.some((call) => call.path.endsWith("/documents") && call.search.includes("account_id=eq."))).toBe(true);
  await expect(page.locator(".hp-portal")).toHaveCSS("background-color", "rgb(27, 29, 31)");
  await expect(page.getByLabel("Search your documents")).toHaveCSS("font-size", "16px");
  await expect(page.locator(".hp-nav__pill--fold")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("documents.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "View Project quote.pdf", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/storage\/v1\/object\/sign/);
  await expect(popup.locator("body")).toContainText("Mock document");
  expect(calls.some((call) => call.path.endsWith("/rpc/record_document_access"))).toBe(true);
  expect(errors).toEqual([]);
});

test("admin upload completes and retains themed controls", async ({ page }, info) => {
  await mockPortal(page, { signedIn: true, admin: true });
  await page.goto("/portal/admin");
  await expect(page.locator(".hp-page-loader")).toHaveCount(0);
  await page.getByRole("button", { name: /^Example Company/ }).click();
  await page.getByLabel("Document title").fill("Specification");
  await page.getByLabel("File", { exact: true }).setInputFiles({ name: "spec.pdf", mimeType: "application/pdf", buffer: Buffer.from("mock document") });
  await page.getByRole("button", { name: "Upload and share" }).click();
  await expect(page.getByText("Uploaded and shared with Example Company.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload and share" })).toBeEnabled();
  await expect(page.getByLabel("Document title")).toHaveValue("");
  await expect(page.locator(".hp-nav__pill--fold")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("admin.png"), fullPage: true });
});

test("password recovery reports errors and permits a successful retry", async ({ page }) => {
  await mockPortal(page, { signedIn: true });
  // Only the password change is rejected; other calls fall through to the shared mock.
  const rejectUpdate = (route) => route.request().method() === "PUT"
    ? route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ msg: "Session expired", code: "session_not_found" }) })
    : route.fallback();
  await page.route("**/auth/v1/user", rejectUpdate);
  // The reset page only accepts a recovery session, which an emailed link marks with type=recovery.
  await page.goto("/portal/reset#type=recovery");
  await expect(page.locator(".hp-page-loader")).toHaveCount(0);
  await page.getByLabel("New password").fill("example-password");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("alert")).toContainText("fresh reset link");
  await expect(page.getByRole("button", { name: "Save password" })).toBeEnabled();
  await page.unroute("**/auth/v1/user", rejectUpdate);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Password updated. Taking you to your documents...")).toBeVisible();
  await expect(page).toHaveURL(/\/portal$/);
});
