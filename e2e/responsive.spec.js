import { test, expect } from "@playwright/test";
import { mockPortal } from "./portal-fixture.js";

const sizes = [[320, 568], [390, 844], [667, 375], [768, 1024], [1024, 768], [1440, 900]];
const STATIC_PAGES = ["/", "/products", "/specs", "/blog", "/gallery", "/showroom", "/product-100mm-pir", "/trim", "/portal-paused"];
const PORTAL_PAGES = ["/portal", "/portal/profile", "/portal/settings", "/portal/admin"];

const fitsWidth = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// Stay offline: third-party hosts (Google Fonts, Pipedrive, analytics) can be slow or blocked and would stall the load event.
// Registered first, so the portal mock's own route (added later in a test) still answers its requests.
test.beforeEach(async ({ context }) => {
  await context.route(/^https?:\/\/(?!(127\.0\.0\.1|localhost)[:/])/, (route) => route.abort());
});

async function chatRoundTrip(page) {
  await page.getByRole("button", { name: "Open chat assistant" }).click();
  const chat = page.getByRole("dialog", { name: "Harvest Panel Systems assistant" });
  await expect(chat).toBeVisible();
  await expect.poll(() => chat.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
  })).toBe(true);
  await page.getByRole("textbox", { name: "Type your question" }).fill("What panels do you offer?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(chat).toContainText("What panels do you offer?");
  await page.getByRole("button", { name: "Close chat", exact: true }).click();
  await expect(chat).toHaveCount(0);
}

for (const [width, height] of sizes) {
  test(`static pages fit and chat works at ${width}x${height}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const path of STATIC_PAGES) {
      await page.goto(path, { waitUntil: "load" });
      await expect(page.locator("nav.nav, .nav").first()).toBeVisible();
      expect(await fitsWidth(page), path).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await fitsWidth(page), `${path} footer`).toBe(true);
    }
    await page.goto("/", { waitUntil: "load" });
    await chatRoundTrip(page);
    expect(errors).toEqual([]);
  });

  test(`portal pages and floating controls at ${width}x${height}`, async ({ page, browserName, isMobile }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await mockPortal(page, { signedIn: true, admin: true });
    for (const path of PORTAL_PAGES) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".hp-nav")).toHaveCount(1);
      await expect(page.locator(".hp-page-loader")).toHaveCount(0, { timeout: 15000 });
      expect(await fitsWidth(page), path).toBe(true);
      expect(await page.locator(".hp-panel").evaluateAll(elements => elements.every(el => {
        const rect = el.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth;
      })), `${path} panels fit`).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await fitsWidth(page), `${path} footer`).toBe(true);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width <= 1024) {
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      const panel = page.locator(".hp-nav__mobile");
      await expect(panel).toHaveClass(/is-open/);
      await expect.poll(() => panel.evaluate(el => el.getAnimations().filter(a => a.playState === "running").length)).toBe(0);
      await expect.poll(() => panel.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
      if (await panel.evaluate(el => el.scrollHeight > el.clientHeight + 2)) {
        if (browserName === "webkit" && isMobile) {
          expect(await panel.evaluate(el => el.dispatchEvent(new Event("touchmove", { bubbles: true, cancelable: true })))).toBe(true);
          await panel.evaluate(el => el.scrollBy(0, 400));
        } else {
          await panel.hover();
          await page.mouse.wheel(0, 400);
        }
        await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      }
      // Resizing an already-open menu must recalculate its available height.
      await page.setViewportSize({ width, height: 320 });
      await expect.poll(() => panel.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
      await page.getByRole("button", { name: "Close menu", exact: true }).click();
      await page.setViewportSize({ width, height });
    }
    await chatRoundTrip(page);
    expect(errors).toEqual([]);
  });
}

test("home page: 20x20 calculator preset and showroom picker work (portal link is off)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  // The customer portal is switched off for now; see "Customer portal" in the README to bring the link back.
  await expect(page.locator('a[href^="/portal"]')).toHaveCount(0);
  await page.locator("#calculator").scrollIntoViewIfNeeded();
  await page.locator('#c-presets [data-l="20"][data-w="20"]').click();
  await expect(page.locator("#o-total")).toHaveText("35");
  await page.goto("/showroom", { waitUntil: "load" });
  await expect(page.locator(".pick .pcard3").nth(1)).toBeVisible();
  await page.locator(".pick .pcard3").nth(1).click();
  await expect(page.locator(".pick .pcard3.on")).toHaveCount(1);
});

test("FAQ on the home page opens and closes", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const first = page.locator("#faq details").first();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await first.locator("summary").click();
  await expect(first).not.toHaveAttribute("open", "");
});

test("reduced motion avoids persistent CSS animation loops on the static home page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".nav").first()).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().filter(animation =>
    animation.effect.getTiming().iterations === Infinity && animation.playState === "running"
  ).length)).toBe(0);
});

test("mobile menu reaches every main page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await expect(menu).toBeVisible();
  await expect(page.locator("#site-menu a", { hasText: "Products" }).first()).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  for (const label of ["Products", "3D Showroom", "Specs", "Gallery", "Blog"]) {
    await expect(page.locator("#site-menu").getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await page.locator("#site-menu").getByRole("link", { name: "Products", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
});

test("no draft text or dead links on the public pages", async ({ page }) => {
  for (const path of ["/", "/products", "/gallery", "/blog", "/trim"]) {
    await page.goto(path, { waitUntil: "load" });
    expect(await page.locator('a[href="#"]').count(), path).toBe(0);
    expect(await page.locator('a[href^="/portal/"]').count(), `${path} portal link`).toBe(0);
    await expect(page.locator("body")).not.toContainText(/draft descriptions|lorem ipsum/i);
  }
});